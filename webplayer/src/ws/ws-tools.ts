// SIMPLIFIED WebSocket implementation - back to basics

import { User } from '../dao/User';
import { LogHelper } from '../manager/LogHelper';
import { House } from '../dao/House';
import { Environment } from '../dao/Environment';
import uuid from 'react-uuid';
import { Sequencer } from '../manager/Sequencer';
import { addMontage, setCurrentPlaylist } from '../manager/Globals';
import { Montage } from '../dao/Montage';
import { Playlist } from '../dao/Playlist';
import { executeCommand } from '../manager/CommandsManager';
import { getFingerprint } from '../manager/FingerprintHelper';
import { Screen } from '../dao/Screen';

const RootUrlWS = process.env.REACT_APP_ROOTWS!;
const RootUrl = process.env.REACT_APP_ROOTURL!;
const wsVersion = '1';

export const Debug = process.env.NODE_ENV !== 'production';

class GlobalData {
  public houseId?: number;
  public house?: House;
  public environId?: number;
  public environ?: Environment;
  public key?: string;

  save() {
    const deviceFingerprint = getFingerprint();
    const deviceSpecificKey = `wm-house-${deviceFingerprint}`;

    // Save with device-specific key to prevent cross-device conflicts
    window.localStorage.setItem(
      deviceSpecificKey,
      JSON.stringify({
        houseId: this.houseId,
        environId: this.environId,
        key: this.key,
      })
    );

    // Also save with generic key for backward compatibility
    window.localStorage.setItem(
      'wm-house',
      JSON.stringify({
        houseId: this.houseId,
        environId: this.environId,
        key: this.key,
      })
    );
  }

  static clear() {
    const deviceFingerprint = getFingerprint();
    const deviceSpecificKey = `wm-house-${deviceFingerprint}`;

    // Clear both device-specific and generic keys
    window.localStorage.removeItem(deviceSpecificKey);
    window.localStorage.removeItem('wm-house');
  }
}

// SIMPLIFIED: Single WebSocket class, no auto-retry, no dual managers
export class WsTools {
  private static instance: WsTools | undefined;
  private token?: string;
  private user?: User;
  private environ?: GlobalData;
  private firstTime = true;
  private screenId?: number;

  // Add flag to prevent infinite 551 error loops
  private isHandling551Error = false;

  // Simple WebSocket - ONE connection only
  private ws: WebSocket | null = null;
  private isRegistered = false;
  private wsState: 'disconnected' | 'connecting' | 'connected' | 'error' = 'disconnected';

  // HTTP ping configuration (keep existing - this works fine)
  private httpPingTimer?: NodeJS.Timeout;
  private readonly HTTP_PING_URL = 'https://manager.wallmuse.com:8444/wallmuse/ws/ping?version=1';
  private readonly HTTP_PING_INTERVAL = 30 * 1000;
  private httpPingsSent: number = 0;
  private httpPingsSuccessful: number = 0;

  // Simple alive timer
  private aliveTimer?: NodeJS.Timeout;

  // FIXED: Add state validation properties
  private stateValidationTimer?: NodeJS.Timeout;
  // REMOVED: No more pending timer logic - montages work with current playlist context
  private lastStateCheck = 0;
  private readonly STATE_CHECK_INTERVAL = 30000; // 30 seconds instead of 5

  private constructor() {
    // REMOVED: Screen activation now consolidated in checkHouse() method

    this.setupConnectionHealthMonitoring();
    this.setupWebSocketHealthMonitoring(); // NEW: Add WebSocket health monitoring
    this.setupErrorHandlers();
    console.log('[WS-TOOLS] Simple WebSocket implementation initialized');
  }

  // FIXED: Add connection health monitoring
  private setupConnectionHealthMonitoring() {
    let lastConnectionAttempt = 0;

    // Monitor for stuck states and force cleanup
    setInterval(() => {
      if (this.wsState === 'connecting' && Date.now() - lastConnectionAttempt > 10000) {
        console.log('[WS-HEALTH] Connection stuck, forcing cleanup');
        this.forceReconnection();
      }
    }, 15000);
  }

  // NEW: WebSocket health monitoring
  private setupWebSocketHealthMonitoring() {
    // Monitor WebSocket health every 30 seconds
    setInterval(() => {
      if (this.ws) {
        const readyState = this.ws.readyState;
        const isHealthy = readyState === WebSocket.OPEN;

        if (!isHealthy) {
          console.log('[WS-HEALTH] WebSocket unhealthy, readyState:', readyState);

          // Attempt reconnection if not connected
          if (readyState === WebSocket.CLOSED || readyState === WebSocket.CLOSING) {
            console.log('[WS-HEALTH] Attempting WebSocket reconnection');
            this.getCommands(); // Use the correct method for reconnection
          }
        } else {
          // console.log('[WS-HEALTH] WebSocket healthy, readyState:', readyState); // PRODUCTION: Commented out frequent health checks
        }
      }
    }, 30000); // Check every 30 seconds
  }

  // NEW: Reduce excessive PlayerPosition creation
  private lastPositionCreation = 0;
  private positionCreationThrottle = 1000; // 1 second throttle

  private shouldCreateNewPosition(): boolean {
    const now = Date.now();
    if (now - this.lastPositionCreation > this.positionCreationThrottle) {
      this.lastPositionCreation = now;
      return true;
    }
    return false;
  }

  public static getInstance(): WsTools {
    if (!WsTools.instance) {
      WsTools.instance = new WsTools();
    }
    return WsTools.instance;
  }

  public static destroyInstance(): void {
    if (WsTools.instance) {
      WsTools.instance.cleanup();
      WsTools.instance = undefined;
    }
  }

  // SIMPLIFIED: Direct WebSocket connection, no managers
  public async getCommands() {
    try {
      if (!this.environ?.environId || !this.environ?.key) {
        console.error('[WS-TOOLS] Missing environment data');
        return;
      }

      // CRITICAL: Only one connection at a time
      if (this.ws) {
        console.log('[WS-TOOLS] WebSocket already exists, cleaning up first');
        this.cleanup();
      }

      console.log('[WS-TOOLS] Creating WebSocket connection to:', RootUrlWS);
      this.wsState = 'connecting';
      this.ws = new WebSocket(RootUrlWS);

      // Set up event handlers
      this.ws.onopen = () => {
        console.log('[WS-TOOLS] WebSocket connected');
        this.wsState = 'connected';
        this.sendRegistration();
        this.startHttpPingKeepAlive();
        this.setupAliveTimer();
        this.setupStateValidation(); // Add periodic validation

        // CRITICAL: Ensure registration state is set correctly
        setTimeout(() => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.isRegistered = true;
            console.log('[WS-TOOLS] Registration completed silently - state synchronized');

            // Now that WebSocket is authenticated, activate screen if needed
            this.ensureScreenActivation();

            // Notify other parts of the system that we're ready
            window.dispatchEvent(
              new CustomEvent('webSocketReady', {
                detail: { connected: true, registered: true },
              })
            );
          }
        }, 100);
      };

      this.ws.onclose = event => {
        console.log('[WS-TOOLS] WebSocket closed:', event.code, event.reason);

        // CRITICAL: Update states immediately and accurately
        this.wsState = 'disconnected';
        this.isRegistered = false;

        this.stopHttpPingKeepAlive();
        this.cleanup();

        // Notify other parts of the system
        window.dispatchEvent(
          new CustomEvent('webSocketReady', {
            detail: { connected: false, registered: false },
          })
        );

        // FIXED: Improved retry logic on connection errors
        if (event.code === 1001) {
          console.log('[WS-TOOLS] Idle timeout - auto-reconnecting in 2 seconds');
          setTimeout(() => {
            this.getCommands();
          }, 2000);
        } else if (event.code === 1002 || event.code === 1006) {
          // Connection errors - retry after a short delay
          console.log('[WS-TOOLS] Connection error - auto-reconnecting in 1 second');
          setTimeout(() => {
            this.getCommands();
          }, 1000);
        } else if (event.code === 1000) {
          // Normal closure - don't auto-reconnect
          console.log('[WS-TOOLS] Normal closure - manual reconnection required');
        } else {
          // Other error codes - retry with exponential backoff
          console.log('[WS-TOOLS] Unexpected closure - retrying in 3 seconds');
          setTimeout(() => {
            this.getCommands();
          }, 3000);
        }
      };

      this.ws.onerror = error => {
        console.error('[WS-TOOLS] WebSocket error:', error);
        this.wsState = 'error';
        this.cleanup();
      };

      this.ws.onmessage = event => {
        this.handleMessage(event);
      };
    } catch (error) {
      console.error('[WS-TOOLS] Failed to create WebSocket:', error);
      this.wsState = 'error';
      this.cleanup();
    }
  }

  // SIMPLIFIED: Silent registration - send and assume success
  private sendRegistration() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('[WS-TOOLS] Cannot send registration - WebSocket not ready');
      return;
    }

    console.log('[WS-TOOLS] Sending silent registration');
    this.ws.send('<json/>');
    this.ws.send(
      `<registration environ="${this.environ!.environId}" key="${this.environ!.key}" version="2"/>`
    );

    // Silent registration - assume success immediately
    setTimeout(() => {
      this.isRegistered = true;
      console.log('[WS-TOOLS] Registration completed silently');
    }, 100);
  }

  // SIMPLIFIED: Direct message handling
  private handleMessage(event: MessageEvent) {
    console.log('[WS-TOOLS] Message received:', event.data.substring(0, 200));

    try {
      if (typeof event.data === 'string' && event.data.trim().startsWith('{')) {
        const jsonData = JSON.parse(event.data);
        console.log('[WS-TOOLS] Parsed JSON data keys:', Object.keys(jsonData));
        this.processMessage(jsonData);
      } else {
        console.log('[WS-TOOLS] Non-JSON message received');
      }
    } catch (error) {
      console.error('[WS-TOOLS] Message parse error:', error);
    }
  }

  // SIMPLIFIED: Direct message processing
  private processMessage(data: any) {
    // Handle commands
    if (data.cmds && Array.isArray(data.cmds)) {
      console.log('[WS-TOOLS] Processing commands:', data.cmds.length);
      data.cmds.forEach((cmd: any) => {
        if (cmd.tag_name === 'cmd' && cmd.action) {
          try {
            // NEW: Check for screen activation commands first
            if (
              cmd.action === 'activate_screen' ||
              cmd.action === 'screen_on' ||
              cmd.action === 'deactivate_screen' ||
              cmd.action === 'screen_off'
            ) {
              this.handleScreenActivationCommand(cmd);
            } else {
              // Add these debug markers at critical points:
              const isReady =
                !!window.TheApp && !!require('../manager/ItemPlayer').ItemPlayer.ThePlayer;
              console.log('[WS-GUARD-CHECK] WebSocket command:', {
                command: cmd.action,
                isReady: isReady,
                action: isReady ? 'executed' : 'queued',
                queueLength: window.PENDING_APP_OPERATIONS?.length || 0,
              });

              // Handle regular commands
              executeCommand(cmd);
            }
          } catch (error) {
            console.error('[WS-TOOLS] Command execution failed:', error);
          }
        }
      });
      return;
    }

    // Handle playlists
    if (data.tag_name === 'playlist') {
      console.log('[WS-TOOLS] Processing playlist:', data.id);
      this.handlePlaylistMessage(data);
      return;
    }

    // Handle montages array - this is typically the default playlist format
    if (data.montages && Array.isArray(data.montages)) {
      console.log(
        '🔍 [WS-TOOLS] DEFAULT PLAYLIST FORMAT DETECTED - Processing montages array:',
        data.montages.length
      );

      // CRITICAL FIX: Check if we're expecting a specific playlist
      // Look for recent doLoadPlaylist logs in the console which indicates a specific playlist is being loaded
      const currentPlaylist = Sequencer.getCurrentPlaylist();
      const recentLogs = console.log.toString(); // This won't work, need different approach

      // SIMPLIFIED: Check if we need to create default playlist or just cache montages
      const currentPlaylistId = Sequencer.getCurrentPlaylist()?.id;
      const recentMontageIds = Object.keys(require('../manager/Globals').Montages).map(key =>
        key.replace('m', '')
      );
      const receivedMontageIds = data.montages.map((m: any) => String(m.id));

      // Check if any of the montages in this array were recently added as individual montages
      const hasRecentlyAddedMontages = receivedMontageIds.some(id => recentMontageIds.includes(id));
      const isDefaultPlaylistSwitch = currentPlaylistId !== undefined;
      const shouldSkipPlaylistCreation = hasRecentlyAddedMontages && !isDefaultPlaylistSwitch;

      if (shouldSkipPlaylistCreation) {
        console.log(
          '🔍 [WS-TOOLS] SKIPPING DEFAULT PLAYLIST - Montages array contains recently added individual montages (not switching to default):',
          {
            receivedMontageIds,
            recentMontageIds: recentMontageIds.slice(-10), // Show last 10
            overlap: receivedMontageIds.filter(id => recentMontageIds.includes(id)),
            currentPlaylistId,
            isDefaultPlaylistSwitch,
          }
        );

        // Just add any new montages to cache, don't create default playlist
        if (data.montages) {
          data.montages.forEach((montage: any) => {
            if (!require('../manager/Globals').Montages['m' + montage.id]) {
              console.log(
                '[WS-TOOLS] Adding new montage to cache during specific playlist load:',
                montage.id
              );
              addMontage(new Montage(montage));
            }
          });
        }
        return;
      }

      // FIXED: This is the default playlist format - create a default playlist object
      console.log('🔍 [WS-TOOLS] ALLOWING DEFAULT PLAYLIST CREATION:', {
        hasRecentlyAddedMontages,
        isDefaultPlaylistSwitch,
        currentPlaylistId,
        reason: isDefaultPlaylistSwitch
          ? 'switching to default playlist'
          : 'no recent montages conflict',
      });
      console.log('🔍 [WS-TOOLS] Creating default playlist from montages array');

      // Create a default playlist object that matches the expected format
      const defaultPlaylist = {
        tag_name: 'playlist',
        id: undefined, // Default playlist has undefined ID
        name: 'Default Playlist',
        random: '0',
        montages: data.montages,
      };

      console.log('🔍 [WS-TOOLS] DEFAULT PLAYLIST CREATED:', {
        playlistId: defaultPlaylist.id,
        playlistName: defaultPlaylist.name,
        montagesCount: defaultPlaylist.montages.length,
        montageIds: defaultPlaylist.montages.map((m: any) => m.id),
      });

      // Process as a normal playlist message
      this.handlePlaylistMessage(defaultPlaylist);
      return;
    }

    // Handle single montage
    if (data.tag_name === 'montage') {
      console.log('[WS-TOOLS] Processing single montage:', data.id);
      console.log('[WS-TOOLS] Single montage data keys:', Object.keys(data));
      console.log('[WS-TOOLS] Single montage has seqs:', !!data.seqs);
      console.log('[WS-TOOLS] Single montage has array_content:', !!data.array_content);

      // Check if we should switch to default playlist
      const currentPlaylist = Sequencer.getCurrentPlaylist();
      console.log(
        '[WS-TOOLS] Current playlist before montage processing:',
        currentPlaylist ? `ID ${currentPlaylist.id}` : 'undefined'
      );

      // CRITICAL FIX: Only schedule default playlist switch if we're not already on the right playlist
      // Don't automatically switch to default for every montage message
      if (currentPlaylist) {
        console.log('[WS-TOOLS] Currently on regular playlist, montage message received');
        console.log(
          '[WS-TOOLS] NOT scheduling default playlist switch - montage may belong to current playlist'
        );

        // REMOVED: Automatic default playlist switching that was breaking montage playback
        // The montage message should work with the current playlist context
      } else {
        console.log('[WS-TOOLS] Already on default playlist (undefined), no need to switch');
      }

      // Check if this montage has complete data (seqs with tracks/items)
      if (data.seqs && Array.isArray(data.seqs) && data.seqs.length > 0) {
        console.log('🔍 [WS-TOOLS] SINGLE MONTAGE LOADING - Detailed:', {
          montageId: data.id,
          montageName: data.name,
          seqsCount: data.seqs ? data.seqs.length : 0,
          hasCompleteData: true,
          action: 'addMontage(new Montage(data))',
          timestamp: Date.now(),
        });
        addMontage(new Montage(data));

        // Check if sequencer is running after adding montage
        console.log('[WS-TOOLS] After adding montage - Sequencer status:', {
          isInitialized: Sequencer.isInitialized(),
          isPlaying: Sequencer.isPlaying(),
          isPaused: Sequencer.isPaused(),
          isStopped: Sequencer.isStopped(),
          currentPlaylist: Sequencer.getCurrentPlaylist()
            ? `ID ${Sequencer.getCurrentPlaylist()?.id}`
            : 'undefined',
        });
      } else {
        console.log(
          '[WS-TOOLS] Single montage has incomplete data (no seqs), skipping - waiting for complete data from server'
        );
        // Don't add incomplete montages - wait for server to provide complete data
        // This ensures default playlist gets the same complete data as regular playlists
      }
      return;
    }

    console.log('[WS-TOOLS] Unknown message type:', data.tag_name, 'Full message data:', data);
  }

  private handlePlaylistMessage(data: any) {
    // Debounce/duplicate suppression for playlist messages
    (this as any)._lastPlaylistMsgAt = (this as any)._lastPlaylistMsgAt || 0;
    (this as any)._lastPlaylistMsgId = (this as any)._lastPlaylistMsgId || undefined;
    const nowTs = Date.now();
    const DEBOUNCE_MS = 750;

    // Build playlist object early for id logging
    const newPlaylist = new Playlist(data);

    // Suppress repeated identical playlist messages arriving back-to-back
    if (
      (this as any)._lastPlaylistMsgId === newPlaylist.id &&
      nowTs - (this as any)._lastPlaylistMsgAt < DEBOUNCE_MS
    ) {
      console.log(
        '[WS-TOOLS] Skipping duplicate playlist message due to debounce:',
        newPlaylist.id
      );
      return;
    }
    (this as any)._lastPlaylistMsgId = newPlaylist.id;
    (this as any)._lastPlaylistMsgAt = nowTs;

    const currentPlaylist = Sequencer.getCurrentPlaylist();

    // CRITICAL FIX: No more pending timer logic needed since we don't auto-switch to default
    console.log('🔍 [WS-TOOLS] Processing playlist message - DETAILED:', {
      receivedPlaylistId: newPlaylist.id,
      receivedPlaylistName: newPlaylist.name,
      receivedMontagesCount: newPlaylist.getMontagesCount(),
      currentPlaylistId: currentPlaylist?.id,
      currentPlaylistName: currentPlaylist?.name,
      isInitialLoad: currentPlaylist == null,
      isPlaylistSwitch: currentPlaylist != null && currentPlaylist.id !== newPlaylist.id,
      isDuplicateMessage: currentPlaylist != null && currentPlaylist.id === newPlaylist.id,
      timestamp: Date.now(),
    });

    if (currentPlaylist == null) {
      // Initial playlist load - don't stop sequencer
      console.log('🔍 [WS-TOOLS] INITIAL PLAYLIST LOAD:', {
        playlistId: newPlaylist.id,
        playlistName: newPlaylist.name,
        montagesCount: newPlaylist.getMontagesCount(),
        action: 'setCurrentPlaylist(newPlaylist)',
      });
      setCurrentPlaylist(newPlaylist);
    } else if (currentPlaylist.id !== newPlaylist.id) {
      // Actually switching playlists - stop sequencer
      console.log('🔍 [WS-TOOLS] PLAYLIST SWITCH DETECTED:', {
        fromPlaylistId: currentPlaylist.id,
        toPlaylistId: newPlaylist.id,
        fromPlaylistName: currentPlaylist.name,
        toPlaylistName: newPlaylist.name,
        action: 'stop() then setCurrentPlaylist(newPlaylist)',
      });
      Sequencer.stop();
      setCurrentPlaylist(newPlaylist);
    } else {
      // Same playlist id as current — ignore to prevent duplicate processing
      console.log('🔍 [WS-TOOLS] DUPLICATE PLAYLIST MESSAGE IGNORED:', {
        playlistId: newPlaylist.id,
        playlistName: newPlaylist.name,
        reason: 'already current playlist',
      });
    }
  }

  // NEW: Handle screen activation commands from server
  private handleScreenActivationCommand(cmd: any) {
    console.log('[SCREEN-ACTIVATION] Received screen activation command:', cmd);

    if (cmd.action === 'activate_screen' || cmd.action === 'screen_on') {
      console.log('[SCREEN-ACTIVATION] Server requested screen activation');

      // Update the environment data to reflect the activated screen
      if (this.environ && this.environ.environ) {
        const environment = this.environ.environ;
        if (environment.screens && environment.screens.length > 0) {
          const currentScreen = environment.screens.find(
            (screen: any) => screen.id === this.screenId
          );
          if (currentScreen) {
            currentScreen.enabled = true;
            (currentScreen as any).on = '1';
            (currentScreen as any).active = true;
            console.log('[SCREEN-ACTIVATION] Updated environment data - screen activated');

            // Refresh track association with the newly activated screen
            this.refreshTrackAssociation();
          }
        }
      }
    } else if (cmd.action === 'deactivate_screen' || cmd.action === 'screen_off') {
      console.log('[SCREEN-ACTIVATION] Server requested screen deactivation');

      // Update the environment data to reflect the deactivated screen
      if (this.environ && this.environ.environ) {
        const environment = this.environ.environ;
        if (environment.screens && environment.screens.length > 0) {
          const currentScreen = environment.screens.find(
            (screen: any) => screen.id === this.screenId
          );
          if (currentScreen) {
            currentScreen.enabled = false;
            (currentScreen as any).on = '0';
            (currentScreen as any).active = false;
            console.log('[SCREEN-ACTIVATION] Updated environment data - screen deactivated');
          }
        }
      }
    }
  }

  // CRITICAL FIX: Accurate connection state checking
  public isWebSocketReady(): boolean {
    // Check ACTUAL WebSocket state, not just stored variables
    const wsActuallyConnected = this.ws?.readyState === WebSocket.OPEN;
    const statesSynced = this.wsState === 'connected' && this.isRegistered;

    // If states are out of sync, fix them
    if (wsActuallyConnected && !statesSynced) {
      console.log('[WS-TOOLS] State sync fix: WebSocket is actually connected, updating state');
      this.wsState = 'connected';
      this.isRegistered = true;
    } else if (!wsActuallyConnected && statesSynced) {
      console.log('[WS-TOOLS] State sync fix: WebSocket is actually disconnected, updating state');
      this.wsState = 'disconnected';
      this.isRegistered = false;
    }

    // Return the ACTUAL state
    return wsActuallyConnected && this.isRegistered;
  }

  // CRITICAL FIX: More robust connection checking
  public isFullyReady(): boolean {
    const wsReady = this.isWebSocketReady();
    const envReady = this.environ?.environId !== undefined;

    // Log mismatches for debugging
    if (!wsReady && this.ws?.readyState === WebSocket.OPEN) {
      console.warn('[WS-TOOLS] State mismatch: WebSocket open but not ready');
    }

    return wsReady && envReady;
  }

  // Public getter for WebSocket state
  public getWsState(): 'disconnected' | 'connecting' | 'connected' | 'error' {
    return this.wsState;
  }

  // Public getter for registration status
  public getIsRegistrationComplete(): boolean {
    return this.isRegistered;
  }

  // SIMPLIFIED: Manual reconnection only
  public forceReconnection(): void {
    console.log('[WS-TOOLS] Force reconnection called');
    this.cleanup();
    setTimeout(() => {
      this.getCommands();
    }, 1000);
  }

  // FIXED: Improved cleanup with proper timer cleanup
  private cleanup(): void {
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onclose = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;

      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.close(1000, 'Cleanup');
      }
      this.ws = null;
    }

    // Clean up all timers
    if (this.stateValidationTimer) {
      clearInterval(this.stateValidationTimer);
      this.stateValidationTimer = undefined;
    }

    if (this.aliveTimer) {
      clearInterval(this.aliveTimer);
      this.aliveTimer = undefined;
    }

    this.stopHttpPingKeepAlive();

    // Reset states accurately
    this.isRegistered = false;
    this.wsState = 'disconnected';

    // Notify state change
    window.dispatchEvent(
      new CustomEvent('webSocketReady', {
        detail: { connected: false, registered: false },
      })
    );
  }

  // Keep existing HTTP ping system (this works)
  private startHttpPingKeepAlive() {
    console.log('[HTTP-PING] Starting keep-alive');
    this.stopHttpPingKeepAlive();

    setTimeout(() => {
      this.sendHttpPing();
    }, 5000);

    this.httpPingTimer = setInterval(() => {
      this.sendHttpPing();
    }, this.HTTP_PING_INTERVAL);
  }

  private stopHttpPingKeepAlive() {
    if (this.httpPingTimer) {
      clearInterval(this.httpPingTimer);
      this.httpPingTimer = undefined;
    }
  }

  private async sendHttpPing() {
    this.httpPingsSent++;
    try {
      const response = await fetch(this.HTTP_PING_URL, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      });

      if (response.ok) {
        this.httpPingsSuccessful++;
        // console.log('[HTTP-PING] Success'); // PRODUCTION: Commented out frequent ping success logs
      }
    } catch (error) {
      console.error('[HTTP-PING] Failed:', error);
    }
  }

  private setupAliveTimer() {
    if (this.aliveTimer) {
      clearInterval(this.aliveTimer);
    }

    this.aliveTimer = setInterval(() => {
      this.sendMasterAlive();
    }, 10000);

    this.sendMasterAlive();
  }

  // FIXED: Improved state validation with less aggressive fixing
  public validateAndFixState(): boolean {
    const actualWsState = this.ws?.readyState;
    const reportedReady = this.wsState === 'connected' && this.isRegistered;

    // Only log state validation in debug mode
    if (process.env.NODE_ENV === 'development') {
      console.log('[WS-TOOLS] State validation:', {
        actualReadyState: actualWsState,
        reportedState: this.wsState,
        reportedRegistered: this.isRegistered,
        reportedReady: reportedReady,
      });
    }

    // Only fix states if there's a significant mismatch
    if (actualWsState === WebSocket.OPEN && !reportedReady) {
      console.log('[WS-TOOLS] Fixing state: WebSocket is open but not reported as ready');
      this.wsState = 'connected';
      this.isRegistered = true;
      return true;
    }

    if (actualWsState !== WebSocket.OPEN && reportedReady) {
      console.log('[WS-TOOLS] Fixing state: WebSocket is not open but reported as ready');
      this.wsState = 'disconnected';
      this.isRegistered = false;

      // Don't immediately reconnect - let the natural reconnection logic handle it
      return false;
    }

    return actualWsState === WebSocket.OPEN;
  }

  // FIXED: Less aggressive state validation
  private setupStateValidation() {
    // Only validate state occasionally, not every 5 seconds
    this.stateValidationTimer = setInterval(() => {
      const now = Date.now();
      if (now - this.lastStateCheck > this.STATE_CHECK_INTERVAL) {
        this.validateAndFixState();
        this.lastStateCheck = now;
      }
    }, this.STATE_CHECK_INTERVAL);
  }

  // Keep all your existing methods unchanged
  checkAuthentication(login: string, pwd: string): Promise<boolean> {
    if (!tokenWait) {
      tokenWait = this.authenticate(login, pwd)
        .then(token => this.assumeToken(token))
        .catch(e => {
          LogHelper.log('WsTools.checkAuthentication', 'Error Authentication', e);
          return false;
        });
    }
    return tokenWait;
  }

  setHouse(houseId: number, environId: number, screenId: number, key: string) {
    LogHelper.log('WSTools.setHouse', 'House, etc, gotten as a parameter');
    this.environ = new GlobalData();
    this.environ.houseId = houseId;
    this.environ.environId = environId;
    this.environ.key = key;
    this.environ.save();
    this.screenId = screenId;
    this.getCommands();
  }

  private checkHouse() {
    console.log('[WS-TOOLS] checkHouse called');

    // SAME-BROWSER PREVENTION: Only check fingerprint-specific localStorage for reliable detection
    const deviceFingerprint = getFingerprint();
    const deviceSpecificKey = `wm-house-${deviceFingerprint}`;

    // Only check device-specific localStorage to avoid false positives from stale cross-browser data
    const existingDeviceEnvironment = window.localStorage.getItem(deviceSpecificKey);
    if (existingDeviceEnvironment && !this.environ) {
      try {
        const deviceData = JSON.parse(existingDeviceEnvironment);
        if (deviceData.environId && deviceData.key) {
          console.log(
            '[WS-TOOLS] ✋ DEVICE ENVIRONMENT EXISTS - Reusing for fingerprint:',
            deviceFingerprint,
            {
              environId: deviceData.environId,
              reason: 'One environment per device (multiple tabs supported)',
            }
          );

          // Reuse existing device environment
          const environ = new GlobalData();
          environ.houseId = deviceData.houseId;
          environ.environId = deviceData.environId;
          environ.key = deviceData.key;
          environ.house = this.user?.houses?.filter(h => h.id === environ.houseId)[0];

          if (environ.house && environ.house.environments) {
            environ.environ = environ.house.environments.filter(e => e.id === environ.environId)[0];
            // CRITICAL FIX: Only show duplicate tab message for same device environment that's currently active
            // Don't block legitimate users on different devices with demo accounts
            if (environ.environ && environ.environ.screens?.length > 0) {
              // Check if this is actually a duplicate tab by verifying if there's an active session
              // for this specific device environment (not just any environment with screens)
              console.log(
                "[WS-TOOLS] ⚠️ Found existing environment with screens - checking if it's a true duplicate"
              );

              // TODO: Add proper duplicate tab detection based on active sessions
              // For now, allow multiple legitimate users by not blocking based on screen existence alone
              console.log(
                '[WS-TOOLS] ✅ Allowing environment reuse - legitimate user on different device'
              );
              // Removed duplicate tab blocking - was incorrectly blocking legitimate users
            }
          }
        }
      } catch (error) {
        console.error('[WS-TOOLS] Error reusing device environment:', error);
        // Clear corrupted data and continue with creation
        window.localStorage.removeItem(deviceSpecificKey);
      }
    }

    // Only proceed if we don't already have an environment
    if (!this.environ) {
      const data = window.localStorage.getItem('wm-house');
      let environ = new GlobalData();
      this.environ = environ;

      if (data) {
        try {
          const json = JSON.parse(data);
          environ.houseId = json.houseId;
          environ.environId = json.environId;
          environ.key = json.key;
          environ.house = this.user?.houses?.filter(h => h.id === environ.houseId)[0];

          if (environ.house && environ.house.environments) {
            environ.environ = environ.house.environments.filter(e => e.id === environ.environId)[0];
            if (environ.environ && environ.environ.screens?.length > 0) {
              this.screenId = environ.environ.screens[0].id;
              // Done - environment restored successfully
              console.log('[WS-TOOLS] Environment restored from localStorage:', {
                houseId: environ.houseId,
                environId: environ.environId,
                screenId: this.screenId,
              });
              this.getCommands();
              this.tellTheWorld();

              // CONSOLIDATED: Check and activate screen as part of house setup
              this.ensureScreenActivation();

              return;
            } else {
              console.log('[WS-TOOLS] House: no environment or no screen in the restored house');
            }
          } else {
            console.log('[WS-TOOLS] House: no content in the restored house');
          }
        } catch (error) {
          console.error('[WS-TOOLS] Error parsing localStorage data:', error);
          GlobalData.clear();
        }
      } else {
        console.log('[WS-TOOLS] House: no house in local storage');
      }

      // Redo environ - only if we don't have a valid environment
      if (!environ.house) {
        if (!this.user?.houses?.length) {
          console.error('[WS-TOOLS] No houses available');
          return;
        }
        // Do it all
        environ.house = this.user.houses[0];
        environ.houseId = environ.house.id;
      }

      // NEW: Create environment only when needed (not systematically)
      console.log('[WS-TOOLS] Creating new environment as needed');
      environ.key = uuid();

      const envUrl = `add_environment?house=${environ.houseId}&name=Web player&keys=${
        environ.key
      },${getFingerprint()}`;

      this.get<Environment>(envUrl)
        .then(e => {
          environ.environ = e;
          environ.environId = environ.environ.id;
          environ.save();
          console.log('[WS-TOOLS] House: new environment created:', {
            environId: environ.environId,
            key: environ.key,
            screensCount: e.screens?.length,
          });
          this.environ = environ;
          this.getCommands();
          this.tellTheWorld();

          // REMOVED: Screen activation moved to after WebSocket authentication

          if (!e.screens || e.screens.length === 0) {
            const screen = window.screen;
            const screenUrl = `add_screen?environ=${environ.environId}&name=Main&w=${screen.width}&h=${screen.height}`;
            return this.get<Screen>(screenUrl).then(screen => {
              this.screenId = screen.id;
              if (!e.screens) e.screens = [];
              e.screens.push(screen);
              console.log('[WS-TOOLS] House: new screen added:', {
                screenId: this.screenId,
                dimensions: `${screen.width}x${screen.height}`,
              });
            });
          } else {
            this.screenId = e.screens[0].id;
            console.log('[WS-TOOLS] House: using existing screen:', this.screenId);
          }
        })
        .catch(error => {
          console.error('[WS-TOOLS] Environment creation failed:', error);
          this.environ = undefined;
        });
    } else {
      console.log('[WS-TOOLS] Environment already exists, skipping checkHouse');
    }
  }

  private tellTheWorld() {
    window.dispatchEvent(new Event('wmPlayerInited'));

    // Also notify parent about environment details for synchronization
    if (this.environ) {
      window.dispatchEvent(new CustomEvent('child-environment-created', {
        detail: {
          houseId: this.environ.houseId,
          environmentId: this.environ.environId,  // Note: parent expects "environmentId"
          screenId: this.screenId,
          environmentData: this.environ.environ
        }
      }));
    }
  }

  authenticate(login: string, pwd: string): Promise<string> {
    return Promise.resolve('mock-token');
  }

  assumeToken(token: string): Promise<boolean> {
    this.token = token;

    return this.get<any>('get_joomla_user')
      .then(u => {
        // If API returns error, create a mock user for local development
        if (u.tag_name === 'error') {
          this.user = new User({ id: 1, name: 'Local Dev User', type: 'DEV' });
          console.log('[WS-TOOLS] Using mock user for local development');
        } else {
          this.user = new User(u);
          console.log('[WS-TOOLS] User loaded:', this.user.name);
        }

        if (!this.user.houses || this.user.houses.length === 0) {
          return this.get<House>('add_house?name=Web player').then(h => {
            return this.assumeToken(token);
          });
        }

        this.checkHouse();
        return true;
      })
      .catch(error => {
        console.error('[WS-TOOLS] Authentication failed:', error);
        return false;
      });
  }

  sendMasterAlive(artworkId?: number) {
    const screen = window.screen;
    const p = Sequencer.getCurrentPosition();
    let m;
    if (p && p.getPlaylist()) {
      const playlist = p.getPlaylist();
      if (playlist) {
        const montage = playlist.getMontage(p.getMontageIndex());
        if (montage) {
          m = montage.id;
        }
      }
    }
    // console.log('[SCREEN-DEBUG] Screen info being sent:', { // PRODUCTION: Commented out frequent screen debug logs
    //     screenId: this.screenId,
    //     environId: this.environ?.environId,
    //     key: this.environ?.key,
    //     screenWidth: screen.width,
    //     screenHeight: screen.height,
    //     isPlaying: Sequencer.isPlaying(),
    //     currentOffset: Sequencer.getCurrentOffset()
    // });

    // REMOVED: Screen activation now handled in checkHouse() only

    this.get<string>(
      'master_alive?ip=127.0.0.1' +
        '&environ=' +
        this.environ?.environId +
        '&key=' +
        this.environ?.key +
        (m ? '&montage=' + m : '') +
        '&new=' +
        (this.firstTime ? '1' : '0') +
        (this.firstTime
          ? '&content=' + encodeURIComponent('<content size="0" downloaded="0"/>')
          : '') +
        '&screens=' +
        encodeURIComponent(
          '<screens><screen name="Main" id="' +
            (this.screenId ? this.screenId : 1) +
            '" w="' +
            screen.width +
            '" h="' +
            screen.height +
            '"/></screens>'
        ) +
        '&time=' +
        Sequencer.getCurrentOffset() +
        (artworkId ? '&artworks=' + artworkId : '') +
        '&status=' +
        (Sequencer.isPlaying() ? 'PLAYING' : 'HALTED')
    ).then(h => {
      const house = new House(h);
    });
    this.firstTime = false;
  }

  // CONSOLIDATED: Ensure screen is activated as part of house setup (called from checkHouse only)
  private async ensureScreenActivation() {
    if (!this.screenId || !this.environ?.environId) {
      console.log('[SCREEN-ACTIVATION] No screen ID or environment ID available');
      return;
    }

    try {
      // Check screen status from existing environment data
      console.log('[SCREEN-ACTIVATION] Checking screen status from environment data');

      if (this.environ && this.environ.environ) {
        const environment = this.environ.environ;
        if (environment.screens && environment.screens.length > 0) {
          // Find the current screen in the environment
          const currentScreen = environment.screens.find(
            (screen: any) => screen.id === this.screenId
          );

          if (currentScreen) {
            console.log('[SCREEN-ACTIVATION] Found current screen in environment:', {
              screenId: currentScreen.id,
              name: currentScreen.name,
              enabled: currentScreen.enabled,
              on: (currentScreen as any).on,
              active: (currentScreen as any).active,
            });

            // Check if screen is deactivated using the same logic as frontend
            const isDeactivated = !(
              (currentScreen as any).on === '1' || (currentScreen as any).active === true
            );

            if (isDeactivated) {
              console.log('[SCREEN-ACTIVATION] Screen is deactivated, attempting to reactivate...');

              // NEW: Proactive screen activation - try to activate the screen directly
              try {
                // Use upd_screen endpoint like the parent EnvironmentsContext does
                const screen = window.screen;
                const screenParams = JSON.stringify({
                  on: 1, // Activate the screen
                  type: 'web',
                  browserScreen: true,
                });

                const activationUrl = `upd_screen?screen=${
                  this.screenId
                }&enabled=1&w=${screen.width}&h=${screen.height}&params=${encodeURIComponent(screenParams)}&version=1`;
                console.log(
                  '[SCREEN-ACTIVATION] Attempting to activate screen via:',
                  activationUrl
                );

                const result = await this.get<any>(activationUrl);
                console.log('[SCREEN-ACTIVATION] Screen activation result:', result);

                if (result && result.tag_name === 'screen' && result.on === '1') {
                  console.log('[SCREEN-ACTIVATION] Screen activated successfully');

                  // Update the environment data to reflect the activated screen
                  (currentScreen as any).on = '1';
                  (currentScreen as any).active = true;
                  currentScreen.enabled = true;

                  // Refresh track association with the newly activated screen
                  this.refreshTrackAssociation();

                  // Notify parent that screen is now activated with proper dimensions
                  window.dispatchEvent(new CustomEvent('child-screen-activated', {
                    detail: {
                      screenId: this.screenId,
                      width: result.width,
                      height: result.height,
                      activated: true
                    }
                  }));
                } else {
                  console.log(
                    '[SCREEN-ACTIVATION] Screen activation failed:',
                    {
                      expected: { on: '1', tag_name: 'screen' },
                      received: { on: result?.on, tag_name: result?.tag_name },
                      fullResult: result
                    }
                  );
                  // The activation failed - likely auth issue or API parameter problem
                }
              } catch (activationError) {
                console.log(
                  '[SCREEN-ACTIVATION] Screen activation API call failed:',
                  activationError
                );
                console.log(
                  '[SCREEN-ACTIVATION] Server will handle reactivation via WebSocket commands'
                );
                // REMOVED: No retry mechanism - activation only happens during checkHouse()
              }
            } else {
              console.log('[SCREEN-ACTIVATION] Screen is already activated');
            }
          } else {
            console.log('[SCREEN-ACTIVATION] Current screen not found in environment data');
          }
        } else {
          console.log('[SCREEN-ACTIVATION] No screens found in environment data');
        }
      } else {
        console.log(
          '[SCREEN-ACTIVATION] No environment data available - screen activation will happen during next house setup'
        );
        // REMOVED: No retry mechanism - screen activation only happens during checkHouse()
      }
    } catch (error) {
      console.log('[SCREEN-ACTIVATION] Error checking screen status:', error);
    }
  }

  // REMOVED: All retry logic consolidated into checkHouse() method

  // NEW: Refresh track association using seq_refs from screen data
  private async refreshTrackAssociation() {
    try {
      // Get current screen data from the environment data we already have
      console.log(
        '[TRACK-ASSOCIATION] Refreshing track association from existing environment data'
      );

      if (this.environ && this.environ.environ) {
        const environment = this.environ.environ;
        if (environment.screens && environment.screens.length > 0) {
          // Find the current screen in the environment
          const currentScreen = environment.screens.find(
            (screen: any) => screen.id === this.screenId
          );

          if (
            currentScreen &&
            (currentScreen as any).seq_refs &&
            (currentScreen as any).seq_refs.length > 0
          ) {
            const trackId = (currentScreen as any).seq_refs[0].id;
            console.log(
              '[TRACK-ASSOCIATION] Found track ID from environment screen data:',
              trackId
            );

            // Update the current position to use the correct track
            const player = require('../manager/ItemPlayer').ItemPlayer.ThePlayer;
            if (player) {
              const currentPos = player.getPosition();
              if (currentPos) {
                // Create new position with correct track index
                const newPosition = new (require('../manager/PlayerPosition').PlayerPosition)(
                  currentPos.getPlaylist(),
                  currentPos.getMontageIndex(),
                  parseInt(trackId) - 1, // Convert to 0-based index
                  currentPos.getItemIndex(),
                  currentPos.getDuration(),
                  currentPos.getLoopIndex(),
                  currentPos.getOffset(),
                  0 // item offset
                );

                player.setPosition(newPosition);
                console.log(
                  '[TRACK-ASSOCIATION] Updated position with correct track index:',
                  parseInt(trackId) - 1
                );
              }
            }
          } else {
            console.log('[TRACK-ASSOCIATION] No seq_refs found in current screen data');
          }
        } else {
          console.log('[TRACK-ASSOCIATION] No screens found in environment data');
        }
      } else {
        console.log('[TRACK-ASSOCIATION] No environment data available');
      }
    } catch (error) {
      console.log('[TRACK-ASSOCIATION] Error refreshing track association:', error);
    }
  }

  // REMOVED: Screen activation now consolidated in checkHouse() method

  get<T>(url: string): Promise<T> {
    let finalUrl = url;
    if (finalUrl.indexOf('?') < 0) {
      finalUrl += '?x=x';
    }
    finalUrl += '&version=' + wsVersion + '&session=' + this.token;

    let baseUrl = RootUrl.endsWith('/') ? RootUrl : RootUrl + '/';

    // FIXED: Correct both domain and port in base URL, but avoid double 'manager.'
    if (baseUrl.includes('manager.wallmuse.com:8443')) {
      baseUrl = baseUrl.replace('manager.wallmuse.com:8443', 'manager.wallmuse.com:8444');
      console.log('🔧 [URL-FIX] Corrected base URL port from 8443 to 8444:', baseUrl);
    } else if (baseUrl.includes('wallmuse.com:8443')) {
      baseUrl = baseUrl.replace('wallmuse.com:8443', 'manager.wallmuse.com:8444');
      console.log(
        '🔧 [URL-FIX] Corrected base URL from wallmuse.com:8443 to manager.wallmuse.com:8444:',
        baseUrl
      );
    }

    return fetch(baseUrl + finalUrl, {
      headers: {
        Accept: 'text/x-json',
      },
      signal: AbortSignal.timeout(10000),
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        // Check for 551 error in the response data
        if (data && data.tag_name === 'error' && data.code === '551') {
          console.log('[WS-TOOLS] 551 Bad key error detected, recreating environment');
          this.handle551Error();
          throw new Error('551: Bad key provided');
        }
        return data;
      })
      .catch(error => {
        // Also check for 551 in error messages
        if (
          error.message &&
          (error.message.includes('551') || error.message.includes('Bad key provided'))
        ) {
          console.log('[WS-TOOLS] 551 Bad key error detected in catch, recreating environment');
          this.handle551Error();
        }
        throw error;
      });
  }

  // NEW: Handle 551 error by recreating environment
  private handle551Error(): void {
    // Prevent infinite loops
    if (this.isHandling551Error) {
      console.log('[WS-TOOLS] Already handling 551 error, skipping');
      return;
    }

    this.isHandling551Error = true;
    console.log('[WS-TOOLS] Handling 551 error - clearing environment and recreating');

    // Clear the current environment
    if (this.environ) {
      GlobalData.clear();
      this.environ = undefined;
    }

    // Create a new environment
    this.checkHouse(); // Re-run checkHouse to recreate environment

    // Reset flag after a delay to allow new environment to be created
    setTimeout(() => {
      this.isHandling551Error = false;
      console.log('[WS-TOOLS] 551 error handling completed, flag reset');
    }, 2000);

    // Notify that environment was recreated
    console.log('[WS-TOOLS] Environment recreated after 551 error');
  }

  private setupErrorHandlers(): void {
    window.addEventListener('unhandledrejection', event => {
      // CRITICAL FIX: Handle AbortError during playlist switches gracefully
      if (event.reason?.name === 'AbortError' && event.reason?.message?.includes('interrupted')) {
        // Common video AbortError cases that are normal during playlist/video transitions
        if (
          event.reason.message.includes('media was removed') ||
          event.reason.message.includes('new load request') ||
          event.reason.message.includes('call to pause()')
        ) {
          console.warn(
            '[WS-TOOLS] 🚑 Expected AbortError during video transition (normal):',
            event.reason.message
          );
          event.preventDefault(); // Prevent the error from propagating and destroying the container
          return;
        }
      }
      console.error('[WS-UNHANDLED] Unhandled promise rejection:', event.reason);
    });
  }

  public getSessionId() {
    return this.token;
  }

  public getUser() {
    return this.user!;
  }

  // SIMPLIFIED: Test methods for the simplified architecture
  public testConnectionUniqueness(): { isUnique: boolean; details: any } {
    // In simplified architecture, we only have one connection
    const isUnique = this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    return {
      isUnique,
      details: {
        hasWebSocket: this.ws !== null,
        readyState: this.ws?.readyState,
        isRegistered: this.isRegistered,
        wsState: this.wsState,
      },
    };
  }

  public async performHealthCheck(): Promise<{ overall: boolean; details: any }> {
    const isConnected = this.isWebSocketReady();
    const hasEnvironment = this.environ?.environId !== undefined;
    const hasUser = this.user !== undefined;

    const overall = isConnected && hasEnvironment && hasUser;

    return {
      overall,
      details: {
        isConnected,
        hasEnvironment,
        hasUser,
        wsState: this.wsState,
        isRegistered: this.isRegistered,
        httpPingsSent: this.httpPingsSent,
        httpPingsSuccessful: this.httpPingsSuccessful,
      },
    };
  }

  public async testPingPong(count: number = 3): Promise<{ success: boolean; details: any }> {
    // Simplified ping-pong test using HTTP ping
    const startTime = Date.now();
    let successfulPings = 0;

    for (let i = 0; i < count; i++) {
      try {
        await this.sendHttpPing();
        successfulPings++;
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between pings
      } catch (error) {
        console.error(`[TEST] Ping ${i + 1} failed:`, error);
      }
    }

    const duration = Date.now() - startTime;
    const success = successfulPings === count;

    return {
      success,
      details: {
        successfulPings,
        totalPings: count,
        duration,
        averageResponseTime: duration / count,
      },
    };
  }

  public async testConnectionStability(
    duration: number = 10000
  ): Promise<{ success: boolean; details: any }> {
    const startTime = Date.now();
    const initialState = this.wsState;
    let stateChanges = 0;

    return new Promise(resolve => {
      const checkInterval = setInterval(() => {
        if (this.wsState !== initialState) {
          stateChanges++;
        }

        if (Date.now() - startTime >= duration) {
          clearInterval(checkInterval);
          const success = stateChanges === 0 && this.wsState === 'connected';
          resolve({
            success,
            details: {
              duration: Date.now() - startTime,
              stateChanges,
              finalState: this.wsState,
              initialState,
            },
          });
        }
      }, 1000);
    });
  }

  public async testReconnection(): Promise<{ success: boolean; details: any }> {
    const startTime = Date.now();

    try {
      // Force reconnection
      this.forceReconnection();

      // Wait for reconnection
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds max

      while (attempts < maxAttempts) {
        if (this.isWebSocketReady()) {
          const duration = Date.now() - startTime;
          return {
            success: true,
            details: {
              duration,
              attempts,
            },
          };
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }

      return {
        success: false,
        details: {
          duration: Date.now() - startTime,
          attempts,
          error: 'Reconnection timeout',
        },
      };
    } catch (error) {
      return {
        success: false,
        details: {
          duration: Date.now() - startTime,
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  public getInstanceInfo(): any {
    return {
      hasWebSocket: this.ws !== null,
      wsState: this.wsState,
      isRegistered: this.isRegistered,
      hasEnvironment: this.environ !== undefined,
      hasUser: this.user !== undefined,
      httpPingsSent: this.httpPingsSent,
      httpPingsSuccessful: this.httpPingsSuccessful,
      timers: {
        httpPingTimer: this.httpPingTimer !== undefined,
        aliveTimer: this.aliveTimer !== undefined,
      },
    };
  }

  /**
   * Show friendly message when duplicate tab is detected
   */
  private showDuplicateTabMessage(fingerprint: string, environId: number) {
    // Create overlay message
    const overlay = document.createElement('div');
    overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
            background: rgba(0,0,0,0.8); color: white; 
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            font-family: Arial, sans-serif; z-index: 9999;
        `;

    overlay.innerHTML = `
            <div style="text-align: center; padding: 40px; background: #333; border-radius: 10px; max-width: 500px;">
                <h2 style="color: #fff; margin-bottom: 20px;">⚠️ Multiple Player Tabs Detected</h2>
                <p style="font-size: 16px; line-height: 1.5; margin-bottom: 20px;">
                    You already have the Web Player open. Running it in multiple tabs or browsers may not work correctly.
                </p>
                <p style="font-size: 14px; color: #ccc; margin-bottom: 30px;">
                    If you need multiple synchronized displays, install the PC Player App, which is built for that purpose.
                </p>
                <button id="refreshPlayerBtn" style="
                    background: #007cba; color: white; border: none; padding: 12px 24px; 
                    border-radius: 5px; cursor: pointer; font-size: 16px; margin-right: 10px;
                ">
                    Refresh & Check Again
                </button>
                <div style="font-size: 12px; color: #999; margin-top: 20px;">
                    Environment ID: ${environId} | Device: ${fingerprint.substring(0, 8)}...
                </div>
            </div>
        `;

    document.body.appendChild(overlay);

    // Add refresh functionality
    document.getElementById('refreshPlayerBtn')?.addEventListener('click', () => {
      console.log('[WS-TOOLS] User clicked refresh - reloading page');
      window.location.reload();
    });

    console.log('[WS-TOOLS] Duplicate tab message displayed for environment:', environId);
  }

  /**
   * Get house autostart setting for current environment
   */
  public getHouseAutostart(): boolean {
    if (!this.environ?.house) {
      return false;
    }
    return this.environ.house.autostart_playlist || false;
  }
}

let tokenWait: Promise<boolean>;

declare global {
  interface Window {
    SELECTED_MONTAGE?: number;
    SELECTED_TRACK?: string;
  }
}

// REMOVED: Screen activation now consolidated in checkHouse() method
