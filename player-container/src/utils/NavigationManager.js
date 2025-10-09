// Fixed NavigationManager - Removes persistence, fixes state sync issues

class NavigationManager {
  constructor() {
    this.isReady = false;
    this.isPlayerReady = false;
    this.commandQueue = [];
    this.lastProcessedCommand = null;
    this.processingCommand = false; // Prevent concurrent processing
    
    // REMOVED: All persistent storage - no more unwanted replays on reload
    
    this.initialize();
  }

  initialize() {
    console.log('[NAV-MANAGER] Initializing fixed NavigationManager (no persistence)');
    
    // Set up global access
    window.navigationManager = this;
    
    console.log('[NAV-MANAGER] NavigationManager initialized');
  }

  setReady(ready) {
    const wasReady = this.isReady;
    this.isReady = ready;
    
    console.log(`[NAV-MANAGER] 🚦 Ready state changed: ${wasReady} -> ${ready}`);
    
    if (ready && !wasReady) {
      // Just became ready - process any queued commands
      this.processQueuedCommands();
    }
  }

  setPlayerReady(ready) {
    const wasPlayerReady = this.isPlayerReady;
    this.isPlayerReady = ready;
    
    console.log(`[NAV-MANAGER] 🎮 Player ready state changed: ${wasPlayerReady} -> ${ready}`);
    
    if (ready && !wasPlayerReady) {
      // Player just became ready - process any queued commands
      setTimeout(() => {
        this.processQueuedCommands();
      }, 100);
    }
  }

  addCommand(command) {
    // Prevent duplicate commands
    const commandKey = `${command.playlist}-${command.position?.montage}`;
    const lastCommandKey = this.lastProcessedCommand ? 
      `${this.lastProcessedCommand.playlist}-${this.lastProcessedCommand.position?.montage}` : '';
    
    if (commandKey === lastCommandKey) {
      console.log('[NAV-MANAGER] 🔄 Skipping duplicate command');
      return;
    }

    const enhancedCommand = {
      ...command,
      timestamp: Date.now(),
      id: `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
    };
    
    console.log(`[NAV-MANAGER] 📝 Adding command:`, enhancedCommand);
    
    // Clear old commands and add new one
    this.commandQueue = [enhancedCommand];
    
    // Enhanced ready state logging
    console.log(`[NAV-MANAGER] Ready states: isReady=${this.isReady}, isPlayerReady=${this.isPlayerReady}`);
    
    // Process immediately if ready and not already processing
    if (this.isReady && this.isPlayerReady && !this.processingCommand) {
      console.log('[NAV-MANAGER] ✅ Both ready states true - processing immediately');
      this.processCommand(enhancedCommand);
    } else {
      if (!this.isReady) {
        console.log('[NAV-MANAGER] ⏳ Waiting for main app ready state');
      }
      if (!this.isPlayerReady) {
        console.log('[NAV-MANAGER] ⏳ Waiting for player ready state');
      }
      if (this.processingCommand) {
        console.log('[NAV-MANAGER] ⏳ Waiting for current command to finish processing');
      }
    }
  }

  processQueuedCommands() {
    console.log(`[NAV-MANAGER] Ready states check: isReady=${this.isReady}, isPlayerReady=${this.isPlayerReady}`);
    
    if (!this.isReady || !this.isPlayerReady || this.processingCommand) {
      if (!this.isReady) {
        console.log('[NAV-MANAGER] ⏳ Cannot process - main app not ready');
      }
      if (!this.isPlayerReady) {
        console.log('[NAV-MANAGER] ⏳ Cannot process - player not ready');
      }
      if (this.processingCommand) {
        console.log('[NAV-MANAGER] ⏳ Cannot process - already processing a command');
      }
      return;
    }
    
    if (this.commandQueue.length === 0) {
      console.log('[NAV-MANAGER] ✅ No commands to process');
      return;
    }
    
    console.log(`[NAV-MANAGER] 🔄 Processing ${this.commandQueue.length} queued commands`);
    
    // Process only the latest command (ignore older ones)
    const latestCommand = this.commandQueue[this.commandQueue.length - 1];
    this.processCommand(latestCommand);
    
    // Clear queue after processing
    this.commandQueue = [];
  }

  processCommand(command) {
    if (this.processingCommand) {
      console.log('[NAV-MANAGER] ⏳ Command already processing, skipping');
      return;
    }

    this.processingCommand = true;
    console.log(`[NAV-MANAGER] ▶️ Processing command:`, command);
    
    try {
      // ENHANCED: Include playlist change flag in the event
      const currentPlaylist = window.currentPlaylistForNav; // Will be set by handleMontageNavigation
      const isPlaylistChange = currentPlaylist && command.playlist !== currentPlaylist;
      
      // Dispatch navigation event
      const navigationEvent = new CustomEvent('webplayer-navigate', {
        detail: {
          playlist: command.playlist,
          position: command.position,
          montage: command.position?.montage || 0, 
          track: command.position?.track || 0,      
          timestamp: command.timestamp,
          isPlaylistChange: isPlaylistChange
        }
      });
      
      window.dispatchEvent(navigationEvent);
      
      // Update last processed command
      this.lastProcessedCommand = command;
      
      console.log(`[NAV-MANAGER] ✅ Command processed successfully`);
      
      // Reset processing flag after a brief delay
      setTimeout(() => {
        this.processingCommand = false;
      }, 500);
      
    } catch (error) {
      console.error('[NAV-MANAGER] ❌ Error processing command:', error);
      this.processingCommand = false;
    }
  }

  // Debug methods
  getStatus() {
    return {
      isReady: this.isReady,
      isPlayerReady: this.isPlayerReady,
      queueLength: this.commandQueue.length,
      processingCommand: this.processingCommand,
      lastProcessedCommand: this.lastProcessedCommand
    };
  }

  // Clear any stuck states
  reset() {
    this.processingCommand = false;
    this.commandQueue = [];
    console.log('[NAV-MANAGER] 🔄 Reset completed');
  }
}

// Create and export singleton instance
const navigationManager = new NavigationManager();

// Global test/debug functions
window.testNavigation = (playlist, position) => {
  navigationManager.addCommand({ playlist, position });
};

window.navStatus = () => {
  console.log(navigationManager.getStatus());
};

window.resetNav = () => {
  navigationManager.reset();
};

export default navigationManager;