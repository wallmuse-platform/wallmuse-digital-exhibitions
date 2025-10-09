import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import WallmusePlayer from './App';
import { setHouse, start, startAuthenticated } from './manager/start';
import { Debug } from './ws/ws-tools';
import { CircularProgress } from '@mui/material';
import { Sequencer } from './manager/Sequencer';

// Initialize the operations queue FIRST to ensure storage mechanism works during remounts
if (!window.PENDING_APP_OPERATIONS) {
  window.PENDING_APP_OPERATIONS = [];
  console.log(
    '[STORAGE] Initialized PENDING_APP_OPERATIONS queue for state preservation during remounts'
  );
}

// URL parameter processing removed - all navigation flows through NAV commands

export function mountReactApp() {
  try {
    console.log('[React] mountReactApp: start, readyState=', document.readyState);
    let container: HTMLElement | null = null;

    // Check if we're in an html and try to access parent's container
    if (window.parent && window.parent !== window) {
      try {
        console.log('[React] Attempting to render to parent container');

        // Try by ID first
        container = window.parent.document.getElementById('root-wm-player') as HTMLElement | null;

        // If not found, try by class
        if (!container) {
          container = window.parent.document.querySelector(
            '.web-player-content'
          ) as HTMLElement | null;
          if (container) {
            console.log('[React] Found parent container by class: web-player-content');
          }
        } else {
          console.log('[React] Found parent container by ID: root-wm-player');
        }

        if (!container) {
          console.log('[React] Parent container not found, falling back to local');
        }
      } catch (e) {
        console.log('[React] Cannot access parent container (cross-origin), using local');
      }
    }

    // Fallback to local container if parent not accessible
    if (!container) {
      // Try multiple possible container IDs
      const possibleContainerIds = ['root-wm-player', 'wm-player-contents'];

      for (const id of possibleContainerIds) {
        container = document.getElementById(id) as HTMLElement | null;
        if (container) {
          console.log(`[React] Found local container with ID: ${id}`);
          break;
        }
      }

      // If no ID-based container found, try finding by class name
      if (!container) {
        console.log('[React] No ID-based container found, searching by class name');
        const classBased = document.querySelector('.web-player-content') as HTMLElement | null;
        if (classBased) {
          container = classBased;
          console.log('[React] Found container by class: web-player-content');
        }
      }
    }

    // CRITICAL FIX: If no container exists anywhere, create one locally to prevent infinite loop
    if (!container) {
      console.log('[React] No container found anywhere, creating local fallback container');

      // Create a local container to prevent infinite loop
      container = document.createElement('div');
      container.id = 'root-wm-player';
      container.style.cssText = 'width: 100%; height: 100vh; position: relative;';

      // Append to body if no other suitable location
      if (document.body) {
        document.body.appendChild(container);
        console.log('[React] Created and mounted local fallback container to body');
      } else {
        // If body doesn't exist yet, wait for it
        console.log('[React] Body not ready, waiting for DOM...');
        setTimeout(() => {
          if (document.body) {
            document.body.appendChild(container!);
            console.log('[React] Created and mounted local fallback container to body (delayed)');
            // Retry mount after container is created
            setTimeout(mountReactApp, 100);
          }
        }, 100);
        return;
      }
    }

    const describe = (el: HTMLElement | null) => {
      if (!el) return 'null';
      const id = el.id ? `#${el.id}` : '';
      const cls = el.className ? `.${String(el.className).split(' ').join('.')}` : '';
      return `${el.tagName.toLowerCase()}${id}${cls}`;
    };

    const parent = container.parentElement as HTMLElement | null;
    console.log(
      '[React] mountReactApp: found container =',
      describe(container),
      'parent =',
      describe(parent),
      'innerHTML.len(before)=',
      container.innerHTML.length
    );

    // Check if container already has React content
    if (container.querySelector('[data-reactroot]')) {
      console.log('[React] Container already has React content, skipping mount');
      return;
    }

    const root = ReactDOM.createRoot(container);
    root.render(
      <React.StrictMode>
        <WallmusePlayer />
      </React.StrictMode>
    );

    setTimeout(() => {
      console.log('[React] mountReactApp: innerHTML.len(after)=', container!.innerHTML.length);
      signalWebPlayerReady();
    }, 0);
  } catch (e) {
    console.error('[React] mountReactApp: unexpected error during mount', e);
  }
}

// One-shot remount guard: if parent wipes our container shortly after mount, remount once
function setupRemountGuard() {
  if ((window as any).__wmRemountGuardSetup__) return;
  (window as any).__wmRemountGuardSetup__ = true;
  let remounted = false;
  let debounceTimer: any = null;
  let stabilityTimer: any = null;
  const root = document.getElementById('root-wm-player');
  if (!root) return;

  // CRITICAL FIX: Wait for React to finish initial rendering before monitoring
  setTimeout(() => {
    const observer = new MutationObserver(() => {
      if (remounted) return;

      const hasContent = root.innerHTML.length > 0;
      const hasInner = !!root.querySelector('#wm-player-contents');

      // CRITICAL FIX: Only trigger if container is completely empty for a sustained period
      if (!hasContent || !hasInner) {
        if (debounceTimer) clearTimeout(debounceTimer);
        if (stabilityTimer) clearTimeout(stabilityTimer);

        // Wait longer before deciding to remount (React needs time to render)
        debounceTimer = setTimeout(() => {
          if (remounted) return;

          // Double-check stability before remounting
          stabilityTimer = setTimeout(() => {
            if (remounted) return;
            const finalCheck =
              root.innerHTML.length === 0 || !root.querySelector('#wm-player-contents');
            if (finalCheck) {
              console.log('[React] 🚨 Container cleared externally – remounting once');
              remounted = true;
              observer.disconnect();
              mountReactApp();
            }
          }, 1000); // Wait 1 second for stability
        }, 2000); // Wait 2 seconds before initial check
      }
    });

    observer.observe(root, { childList: true, subtree: true });
  }, 3000); // Wait 3 seconds before starting to monitor
}

// Global state to prevent duplicate navigation events
let lastNavigationEvent: { playlist: string; position: number; timestamp: number } | null = null;
const NAVIGATION_DEBOUNCE_MS = 500; // 500ms debounce to prevent rapid remounts

// Global state to prevent duplicate sequencer calls
let lastSequencerCall: { playlist: string; position?: number; timestamp: number } | null = null;
const SEQUENCER_DEBOUNCE_MS = 1000; // 1 second debounce for sequencer calls

// DEBUG: Track all navigation events to see what's happening
let navigationEventCounter = 0;
let lastNavigationLog = '';

// CRITICAL: Filter out AbortError noise from interrupted video play requests
window.addEventListener('unhandledrejection', event => {
  const message = String(event.reason?.message || event.reason);
  if (message.includes('The play() request was interrupted by a new load request')) {
    console.log(
      '[React] Filtered AbortError from interrupted video play (normal during playlist changes)'
    );
    event.preventDefault(); // Prevent console noise
    return;
  }
  // Let other unhandled rejections through normally
});

// Setup navigation listener for existing coordination system
function setupNavigationListener() {
  console.log('[React] Setting up navigation listener for existing coordination system');

  // Listen for webplayer-navigate events from parent
  window.addEventListener('webplayer-navigate', (event: any) => {
    navigationEventCounter++;
    console.log('[React] 🎯 NAVIGATION EVENT RECEIVED!', {
      eventType: event.type,
      hasDetail: !!event.detail,
    });

    const eventDetail = event.detail || {};
    const { playlist, position, montage, track, timestamp } = eventDetail;

    // Navigation event extraction logging condensed

    // CRITICAL FIX: Handle position as object {montage: X, track: Y} or number
    let resolvedPosition: number;
    let resolvedTrack: string | number | undefined = track; // Start with top-level track

    if (typeof position === 'object' && position !== null && 'montage' in position) {
      resolvedPosition = position.montage;
      // CRITICAL FIX: Also extract track from position object if available
      if (position.track !== undefined) {
        resolvedTrack = position.track;
        console.log(`[React] 🔧 NAVIGATION: Extracted track from position object:`, position.track);
      }
      // Position object extraction logging condensed
    } else if (typeof position === 'number') {
      resolvedPosition = position;
      console.log(`[React] 🔧 NAVIGATION: Using numeric position directly:`, resolvedPosition);
    } else {
      resolvedPosition = 0; // Default to first montage
      console.log(`[React] 🚨 NAVIGATION: Invalid position format, defaulting to 0:`, position);
    }

    console.log(`[React] 🎯 NAVIGATION EVENT #${navigationEventCounter}:`, {
      playlist,
      resolvedPosition,
      track,
    });

    // CRITICAL FIX: Deduplicate navigation events to prevent multiple remounts
    const now = Date.now();
    if (
      lastNavigationEvent &&
      lastNavigationEvent.playlist === playlist &&
      lastNavigationEvent.position === resolvedPosition && // Use resolved position!
      now - lastNavigationEvent.timestamp < NAVIGATION_DEBOUNCE_MS
    ) {
      console.log(
        `[React] 🚨 DUPLICATE NAVIGATION EVENT #${navigationEventCounter} DETECTED - ignoring to prevent multiple remounts:`,
        {
          playlist,
          resolvedPosition,
          timeSinceLast: now - lastNavigationEvent.timestamp,
          debounceThreshold: NAVIGATION_DEBOUNCE_MS,
          lastNavigationEvent,
        }
      );
      return; // Ignore duplicate event
    }

    // Update last navigation event with resolved position
    lastNavigationEvent = { playlist, position: resolvedPosition, timestamp: now };
    lastNavigationLog = `Event #${navigationEventCounter}: ${playlist} at ${new Date(
      timestamp
    ).toISOString()}`;

    console.log(`[React] ✅ PROCESSING NAVIGATION EVENT #${navigationEventCounter}:`, {
      playlist,
      resolvedPosition,
      montage,
      track: resolvedTrack,
      timestamp,
      lastNavigationLog,
    });

    // Process navigation with resolved position and track
    (window as any).webPlayerNavigate({
      playlist,
      position: resolvedPosition,
      montage,
      track: resolvedTrack,
      timestamp,
    });
  });

  console.log('[React] Navigation listener set up successfully');
}

// Implement the existing webPlayerNavigate function for coordination
(window as any).webPlayerNavigate = (params: any) => {
  console.log('[React] webPlayerNavigate called with params:', params);
  console.log('[React] 🔍 PARAMS DEBUG:', {
    paramsType: typeof params,
    paramsValue: params,
    paramsKeys: typeof params === 'object' && params ? Object.keys(params) : 'not-object',
    track: params?.track,
    montage: params?.montage,
    playlist: params?.playlist,
  });

  try {
    // CRITICAL FIX: Handle case where params is not an object (legacy compatibility)
    let paramsObj;
    if (typeof params === 'object' && params !== null) {
      paramsObj = params;
    } else if (typeof params === 'string' || typeof params === 'number') {
      // Legacy: single parameter might be playlist ID
      console.log('[React] 🔧 LEGACY COMPATIBILITY: Converting primitive param to object:', params);
      paramsObj = { playlist: params };
    } else {
      paramsObj = {};
    }

    const { playlist, position, montage, track } = paramsObj;

    console.log('[React] 🎯 NAVIGATION PARAMETERS:', { playlist, position, montage, track });

    // Reset any existing pending values before processing new navigation
    console.log('[React] Resetting pending navigation values for new navigation event');
    Sequencer.setPendingMontageIndex(0);
    // Note: Montage track overrides are preserved across navigation events

    // Handle track navigation FIRST - before any playlist processing
    if (track !== undefined && track !== null) {
      console.log('[React] Processing track navigation to:', track);
      const trackIndex = parseInt(track) - 1; // Convert to 0-based index
      // Set track override for the target montage (use position or default to montage 0)
      const targetMontageIndex = typeof position === 'number' ? position : 0;
      Sequencer.setMontageTrackOverride(targetMontageIndex, trackIndex);
      console.log(
        '[React] Set track override for montage',
        targetMontageIndex,
        'to track index:',
        trackIndex
      );
    }

    // CRITICAL FIX: Set pending montage index from position parameter
    if (position !== undefined && position !== null && typeof position === 'number') {
      console.log('[React] 🎯 NAVIGATION: Setting pending montage index from position:', position);
      console.log(
        '[React] 🔍 NAVIGATION: Position type check - raw position:',
        position,
        'type:',
        typeof position
      );
      try {
        // IMPORTANT: Check if position needs 1-based to 0-based conversion
        // Most UI systems use 1-based montage numbers but arrays are 0-based
        const montageIndex = position; // Keep as-is for now, add logging to debug
        Sequencer.setPendingMontageIndex(montageIndex);
        console.log(
          '[React] ✅ NAVIGATION: Pending montage index set to:',
          montageIndex,
          '(from position:',
          position,
          ')'
        );

        // CRITICAL DEBUG: Verify it was set correctly
        const verifyIndex = Sequencer.getPendingMontageIndex();
        console.log('[React] 🔍 NAVIGATION: Verified pending montage index is:', verifyIndex);
      } catch (error) {
        console.error('[React] ❌ NAVIGATION: Error setting pending montage index:', error);
      }
    } else {
      console.log(
        '[React] 🚨 NAVIGATION: Invalid position parameter (not a number) - montage index will default to 0, received:',
        position,
        typeof position
      );
    }

    // Handle playlist navigation - INTEGRATE WITH EXISTING STORAGE MECHANISM
    if (playlist) {
      console.log('[React] Processing playlist navigation to:', playlist);

      // Instead of directly calling sequencer functions, dispatch events that integrate with existing storage
      if (typeof playlist === 'object' && playlist.id) {
        // We have full playlist data - dispatch to existing storage system
        console.log('[React] Full playlist data received, dispatching to storage system');
        const storageEvent = new CustomEvent('webplayer-playlist-data', {
          detail: { playlist, timestamp: Date.now() },
        });
        document.dispatchEvent(storageEvent);
        window.dispatchEvent(storageEvent);
      } else {
        // We have just a playlist ID - trigger parent to load it via existing mechanism
        console.log(
          '[React] Playlist ID received, triggering parent load via existing storage mechanism'
        );

        // Dispatch events to both local and parent contexts
        const loadEvent = new CustomEvent('webplayer-load-playlist', {
          detail: { playlistId: playlist, timestamp: Date.now() },
        });
        document.dispatchEvent(loadEvent);
        window.dispatchEvent(loadEvent);

        // CRITICAL: Also dispatch to parent window to trigger their existing navigation
        if (window.parent && window.parent !== window) {
          try {
            // Dispatch to parent window to trigger their existing navigation
            const parentEvent = new CustomEvent('webplayer-navigate-playlist', {
              detail: { playlistId: playlist, timestamp: Date.now() },
            });
            window.parent.document.dispatchEvent(parentEvent);
            console.log('[React] Dispatched navigation event to parent window');

            // Also try dispatching the original webplayer-navigate event to parent
            const originalEvent = new CustomEvent('webplayer-navigate', {
              detail: { playlist: playlist, position: null, timestamp: Date.now() },
            });
            window.parent.document.dispatchEvent(originalEvent);
            console.log('[React] Dispatched original webplayer-navigate event to parent');
          } catch (e) {
            console.log('[React] Cannot dispatch to parent (cross-origin)');
          }
        }

        // Also try to call the parent's webPlayerNavigate function directly if accessible
        if (window.parent && window.parent !== window && window.parent.webPlayerNavigate) {
          try {
            console.log('[React] Calling parent webPlayerNavigate function directly');
            window.parent.webPlayerNavigate({ playlist, position: null, timestamp: Date.now() });
          } catch (e) {
            console.log('[React] Cannot call parent webPlayerNavigate (cross-origin)');
          }
        }

        // CRITICAL: Also try to update the sequencer directly if available
        // This ensures the playlist change is processed even if parent events fail
        try {
          console.log('[React] Attempting to update sequencer directly with new playlist');
          // Try to call the sequencer's playlist update method via the global TheApp
          if (window.TheApp && typeof (window.TheApp as any).assumeNewPlaylist === 'function') {
            console.log('[React] Calling TheApp.assumeNewPlaylist() directly');
            // CRITICAL FIX: Don't call assumeNewPlaylist() without playlist data - this causes wrong media to load
            console.log(
              '[React] Skipping TheApp.assumeNewPlaylist() call - playlist loading should be handled by parent app'
            );
          }
        } catch (e) {
          console.log('[React] Cannot update sequencer directly:', e);
        }

        // CRITICAL FIX: Skip additional sequencer calls ONLY for playlist changes, not same-playlist navigation
        // The parent app is already handling the playlist switch, but we still need to handle position changes
        console.log(
          '[React] 🚨 PLAYLIST PROCESSING COMPLETE - continuing with position/montage navigation if needed'
        );

        // CRITICAL FIX: Wait for WebSocket playlist command, but implement fallback if it doesn't arrive
        try {
          console.log('[React] Waiting for WebSocket playlist command for:', playlist);

          // Set a timeout to check if WebSocket playlist command arrives
          const webSocketTimeout = 5000; // 5 second timeout - increased to reduce false alarms

          setTimeout(() => {
            const currentPlaylist = Sequencer?.getCurrentPlaylist();
            const currentPlaylistId = currentPlaylist?.id;

            // If the sequencer still doesn't have the target playlist after timeout, something is wrong
            if (currentPlaylistId !== playlist) {
              console.log(
                `[React] ⏱️ WebSocket timeout after ${webSocketTimeout}ms - using fallback navigation`
              );
              // console.log('[React] Current playlist:', currentPlaylistId, 'Target playlist:', playlist); // PRODUCTION: Reduced log verbosity
              // console.log('[React] This indicates a problem with parent-to- communication'); // PRODUCTION: Reduced log verbosity

              // Handle undefined (default) playlist switching
              if (playlist === undefined) {
                console.log(
                  '[React] Target is default playlist (undefined), calling setCurrentPlaylist(undefined)'
                );
                const { setCurrentPlaylist } = require('./manager/Globals');
                setCurrentPlaylist(undefined);
              } else {
                // Try to get playlist data from parent window global state for defined playlists
                try {
                  const parentPlaylist = (window.parent as any)?.currentPlaylist;
                  if (parentPlaylist && parentPlaylist.id === playlist) {
                    console.log(
                      '[React] Found target playlist in parent globals, calling setCurrentPlaylist'
                    );
                    const { setCurrentPlaylist } = require('./manager/Globals');
                    setCurrentPlaylist(parentPlaylist);
                  } else {
                    console.log('[React] Could not find playlist data in parent globals');
                  }
                } catch (e) {
                  console.log('[React] Cannot access parent playlist data:', e);
                }
              }
            } else {
              console.log('[React] ✅ Sequencer correctly updated to playlist:', currentPlaylistId);
            }
          }, webSocketTimeout);
        } catch (e) {
          console.log('[React] Cannot call global Sequencer:', e);
        }

        // CRITICAL: Force sequencer reload by dispatching a custom event that the sequencer listens for
        try {
          // CRITICAL FIX: Debounce sequencer calls to prevent multiple rapid remounts
          const now = Date.now();
          const currentPosition = position !== undefined ? position : montage; // Use position or montage for comparison

          if (
            lastSequencerCall &&
            (lastSequencerCall as NonNullable<typeof lastSequencerCall>).playlist === playlist &&
            (lastSequencerCall as NonNullable<typeof lastSequencerCall>).position ===
              currentPosition &&
            now - (lastSequencerCall as NonNullable<typeof lastSequencerCall>).timestamp <
              SEQUENCER_DEBOUNCE_MS
          ) {
            console.log(
              '[React] 🚨 DUPLICATE SEQUENCER CALL DETECTED - ignoring to prevent multiple remounts:',
              {
                playlist,
                position: currentPosition,
                timeSinceLast:
                  now - (lastSequencerCall as NonNullable<typeof lastSequencerCall>).timestamp,
                debounceThreshold: SEQUENCER_DEBOUNCE_MS,
              }
            );
            return; // Skip this sequencer call
          }

          // Update last sequencer call with position information
          lastSequencerCall = { playlist, position: currentPosition, timestamp: now };

          console.log('[React] Dispatching custom sequencer-reload event');
          const reloadEvent = new CustomEvent('sequencer-reload-playlist', {
            detail: { playlistId: playlist, timestamp: Date.now() },
          });
          document.dispatchEvent(reloadEvent);
          window.dispatchEvent(reloadEvent);

          // CRITICAL FIX: Work WITH the parent system instead of against it
          console.log(
            '[React] Attempting to coordinate with parent playlist system for ID:',
            playlist
          );

          // Try to call the parent's playlist loading function if available
          if (window.parent && window.parent !== window) {
            try {
              // Dispatch a more specific event to trigger playlist loading
              const loadPlaylistEvent = new CustomEvent('webplayer-load-playlist-data', {
                detail: {
                  playlistId: playlist,
                  action: 'load',
                  timestamp: Date.now(),
                },
              });
              window.parent.document.dispatchEvent(loadPlaylistEvent);
              console.log('[React] Dispatched webplayer-load-playlist-data event to parent');

              // CRITICAL: Also try to call the parent's existing playlist management
              if (
                (window.parent as any).loadPlaylist &&
                typeof (window.parent as any).loadPlaylist === 'function'
              ) {
                console.log('[React] Calling parent.loadPlaylist() directly');
                (window.parent as any).loadPlaylist(playlist);
              }

              // CRITICAL: Try to update the parent's current playlist state
              if (
                (window.parent as any).setCurrentPlaylist &&
                typeof (window.parent as any).setCurrentPlaylist === 'function'
              ) {
                console.log('[React] Calling parent.setCurrentPlaylist() directly');
                (window.parent as any).setCurrentPlaylist(playlist);
              }
            } catch (e) {
              console.log('[React] Cannot dispatch to parent (cross-origin)');
            }
          }

          // Also try to dispatch to parent
          if (window.parent && window.parent !== window) {
            try {
              window.parent.document.dispatchEvent(reloadEvent);
              console.log('[React] Dispatched sequencer-reload event to parent');
            } catch (e) {
              console.log('[React] Cannot dispatch to parent (cross-origin)');
            }
          }
        } catch (e) {
          console.log('[React] Error dispatching sequencer-reload event:', e);
        }
      }
    }

    // CRITICAL FIX: Handle same-playlist position navigation by comparing with current playlist
    // Check if this is truly same-playlist navigation by comparing current vs target playlist
    const currentPlaylist = Sequencer?.getCurrentPlaylist();
    const currentPlaylistId = currentPlaylist?.id;

    // CRITICAL: Distinguish between "no playlist parameter" vs "playlist parameter is undefined"
    const hasPlaylistParameter = 'playlist' in paramsObj;

    const isSamePlaylist =
      // Case 1: No playlist parameter at all (position-only navigation)
      (!hasPlaylistParameter && position !== undefined) ||
      // Case 2: Both current and target are undefined (both on default playlist)
      (currentPlaylistId === undefined && playlist === undefined && hasPlaylistParameter) ||
      // Case 3: Both have same ID (convert to strings to handle number vs string comparison)
      (currentPlaylistId !== undefined &&
        playlist !== undefined &&
        String(currentPlaylistId) === String(playlist));

    // DEBUG: Log the playlist comparison logic
    console.log('[React] 🔍 PLAYLIST COMPARISON DEBUG:', {
      currentPlaylistId,
      targetPlaylist: playlist,
      hasPlaylistParameter,
      position,
      case1: !hasPlaylistParameter && position !== undefined,
      case2: currentPlaylistId === undefined && playlist === undefined && hasPlaylistParameter,
      case3:
        currentPlaylistId !== undefined &&
        playlist !== undefined &&
        String(currentPlaylistId) === String(playlist),
      isSamePlaylist,
    });

    if (position !== undefined && position !== null && isSamePlaylist) {
      console.log(
        '[React] 🎯 SAME-PLAYLIST NAVIGATION: Processing position navigation to montage:',
        position,
        {
          currentPlaylistId,
          targetPlaylist: playlist,
          hasPlaylistParameter,
          isSamePlaylist,
          reason: !hasPlaylistParameter
            ? 'no-playlist-param'
            : currentPlaylistId === undefined && playlist === undefined
            ? 'both-undefined'
            : currentPlaylistId === playlist
            ? 'same-id'
            : 'other',
        }
      );

      try {
        // For same-playlist navigation, call goMontage directly
        if (Sequencer && typeof Sequencer.goMontage === 'function') {
          const trackOverride = Sequencer.getMontageTrackOverride(position);
          console.log(
            '[React] 🎯 SAME-PLAYLIST NAVIGATION: Calling Sequencer.goMontage() directly with montage:',
            position,
            'and track override:',
            trackOverride
          );

          // CRITICAL DEBUG: Check montage bounds before calling goMontage
          const currentPlaylist = Sequencer.getCurrentPlaylist();
          let montageCount;
          if (currentPlaylist) {
            // Regular playlist
            montageCount = currentPlaylist.getMontagesCount();
          } else {
            // Default playlist - check global montages
            const globalMontages = Object.values((window as any).Montages || {});
            montageCount = globalMontages.length;

            // TIMING FIX: If no montages loaded yet, limit retries to prevent infinite loops
            if (montageCount === 0) {
              const retryCount = (params as any).retryCount || 0;
              if (retryCount < 5) {
                // Max 5 retries (2.5 seconds)
                console.log(
                  `[React] 🔄 No global montages loaded yet, retrying navigation in 500ms (attempt ${
                    retryCount + 1
                  }/5)`
                );
                const retryParams = { ...params, retryCount: retryCount + 1 };
                setTimeout(() => window.webPlayerNavigate(retryParams), 500);
                return;
              } else {
                console.warn(
                  '[React] ⚠️ Max retries reached - deferring navigation until montages arrive'
                );
                return; // Defer navigation instead of proceeding with empty montages
              }
            }
          }
          console.log(
            '[React] 🔍 BOUNDS CHECK: Montage index:',
            position,
            'Available montages:',
            montageCount,
            'Is default playlist:',
            !currentPlaylist
          );

          // CRITICAL: Validate bounds before calling goMontage
          if (position >= 0 && position < montageCount) {
            Sequencer.goMontage(position);
            console.log('[React] ✅ SAME-PLAYLIST NAVIGATION: goMontage() called successfully');
          } else {
            console.error(
              '[React] 🚨 BOUNDS ERROR: Montage index',
              position,
              'is out of bounds (0-' + (montageCount - 1) + '). Skipping navigation.'
            );
            return; // Don't call goMontage with invalid index
          }
        } else {
          console.log('[React] ❌ SAME-PLAYLIST NAVIGATION: Sequencer.goMontage not available');
        }
      } catch (error) {
        console.error('[React] ❌ SAME-PLAYLIST NAVIGATION: Error calling goMontage:', error);
      }

      // Also dispatch events for parent coordination
      const positionEvent = new CustomEvent('webplayer-seek-position', {
        detail: { position, timestamp: Date.now() },
      });
      document.dispatchEvent(positionEvent);
      window.dispatchEvent(positionEvent);
    }

    // Handle position navigation for playlist changes (existing logic)
    else if (position !== undefined && position !== null && playlist !== null) {
      console.log('[React] Processing position navigation with playlist change to:', position);
      // Position changes are typically handled by the existing storage system
      // Dispatch event for parent to handle
      const positionEvent = new CustomEvent('webplayer-seek-position', {
        detail: { position, timestamp: Date.now() },
      });
      document.dispatchEvent(positionEvent);
      window.dispatchEvent(positionEvent);
    }

    // Handle montage navigation - use existing sequencer if available
    if (montage !== undefined && montage !== null) {
      console.log('[React] Processing montage navigation to:', montage);
      // Montage changes are typically handled by the existing storage system
      // Dispatch event for parent to handle
      const montageEvent = new CustomEvent('webplayer-navigate-montage', {
        detail: { montage, timestamp: Date.now() },
      });
      document.dispatchEvent(montageEvent);
      window.dispatchEvent(montageEvent);
    }

    // Track navigation was already handled at the beginning of this function

    console.log(
      '[React] Navigation parameters processed successfully - integrated with existing storage mechanism'
    );
  } catch (error) {
    console.error('[React] Error in webPlayerNavigate:', error);
  }
};

// Enhanced mount function that sets up coordination
function initializeWebPlayer() {
  console.log('[React] Initializing web player with existing coordination system');

  // Set up navigation listener first
  setupNavigationListener();

  // Try to mount immediately
  mountReactApp();

  // Set up a one-shot remount guard to recover from parent wipes
  setupRemountGuard();

  // CRITICAL FIX: If mount failed, don't set up infinite observer loop
  // Instead, rely on the fallback container creation in mountReactApp
  if (
    !document.getElementById('root-wm-player') &&
    !(
      window.parent &&
      window.parent !== window &&
      window.parent.document.getElementById('root-wm-player')
    )
  ) {
    console.log('[React] Container not found, but fallback strategy will handle this');
    console.log('[React] No infinite observer loop - fallback container will be created locally');
  }
}

// Signal to parent that webplayer is ready for coordination
function signalWebPlayerReady() {
  console.log('[React] Signaling webplayer ready for existing coordination system');

  // Dispatch custom event to parent
  const readyEvent = new CustomEvent('webplayer-ready', {
    detail: {
      timestamp: Date.now(),
      ready: true,
      coordination: 'existing-system',
    },
  });

  document.dispatchEvent(readyEvent);
  window.dispatchEvent(readyEvent);

  // Also call the existing onWebPlayerReady function if available
  if (window.onWebPlayerReady && typeof window.onWebPlayerReady === 'function') {
    console.log('[React] Calling existing onWebPlayerReady function');
    window.onWebPlayerReady();
  }

  // NEW: Set flat coordination flags for App checks
  try {
    (window as any).webplayerReady = true;
    const wmInit = (window as any).WallmuseInit || {};
    wmInit._webplayerReady = true;
    (window as any).WallmuseInit = wmInit;
  } catch (e) {
    // ignore
  }

  console.log('[React] Webplayer ready signal sent');

  // Track parameters now handled through NAV commands only

  // WORKAROUND: Try to get track info from parent window globals
  setTimeout(() => {
    try {
      console.log('[MONTAGE_PARAM] Trying to retrieve track from parent globals');

      // Try different possible global variables that might contain the track
      const possibleTrackSources = [
        () => (window.parent as any)?.selectedTrack,
        () => (window.parent as any)?.currentTrack,
        () => (window.parent as any)?.navigationManager?.currentTrack,
        () => (window.parent as any)?.navigationManager?.selectedTrack,
        () => (window as any).selectedTrack,
        () => (window as any).currentTrack,
      ];

      for (const getTrack of possibleTrackSources) {
        try {
          const track = getTrack();
          if (track && track !== '1' && track !== 1) {
            const trackIndex = parseInt(track.toString()) - 1;
            console.log(
              '[MONTAGE_PARAM] Found track from parent:',
              track,
              '-> trackIndex:',
              trackIndex
            );
            // Set track override for montage 0 (default startup montage)
            Sequencer.setMontageTrackOverride(0, trackIndex);
            break;
          }
        } catch (e) {
          // Try next source
        }
      }
    } catch (error) {
      console.log('[MONTAGE_PARAM] Could not retrieve track from parent:', error);
    }
  }, 100);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeWebPlayer);
} else {
  initializeWebPlayer();
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
//reportWebVitals(console.log);

// @ts-ignore
const canWork = window.MediaSource || window.ManagedMediaSource;
if (canWork) {
  if (Debug) {
    start(
      process.env.REACT_APP_TESTLOGIN!,
      process.env.REACT_APP_TESTPWD!,
      process.env.REACT_APP_TESTTOKEN!
    );
  } else {
    const parent = document.getElementById('root');
    if (parent && parent.dataset.user) {
      console.log('Session (#3): ' + parent.dataset.user);
      startAuthenticated(parent.dataset.user);
    } else {
      // const token = zone!.dataset.user;
      const params = new URLSearchParams(window.location.search);
      console.log('Session: ' + params.get('session'));
      if (params.get('house')) {
        setHouse(
          parseInt(params.get('house')!, 10),
          parseInt(params.get('environ')!, 10),
          parseInt(params.get('screen')!, 10),
          params.get('key')!
        );
      }
      startAuthenticated(params.get('session')!);
    }
  }
}

interface WebPlayerProps {
  currentTheme: string;
  environments: any; // Replace 'any' with proper type if known
  currentPlaylist: any; // Replace 'any' with proper type if known
  selectedTrack?: string;
  t: (key: string) => string;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  house: any; // Replace 'any' with proper type if known
  volumeRef: React.RefObject<HTMLDivElement>;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  montageOrderSignature: any; // Replace 'any' with proper type if known
  selectedPlaylist?: string;
  selectedMontagePosition?: number;
}

const WebPlayer: React.FC<WebPlayerProps> = ({
  currentTheme,
  environments,
  currentPlaylist,
  selectedTrack = '1',
  t,
  isPlaying,
  setIsPlaying,
  house,
  volumeRef,
  loading,
  setLoading,
  montageOrderSignature,
  selectedPlaylist,
  selectedMontagePosition,
}) => {
  // Add these logs for debugging
  console.log('[MONTAGE_PARAM] Setting global SELECTED_MONTAGE:', selectedMontagePosition);
  console.log('[MONTAGE_PARAM] Setting global SELECTED_TRACK:', selectedTrack);

  window.SELECTED_MONTAGE = selectedMontagePosition;
  window.SELECTED_TRACK = selectedTrack;

  const containerRef = useRef<HTMLDivElement>(null);
  const abortController = useRef(new AbortController());

  // Construct the URL with the montage and playlist parameters
  const constructWebPlayerUrl = (
    sessionId: string,
    anticache: number,
    currentTrack: string,
    montageIndex?: number,
    playlistId?: string
  ) => {
    const baseUrl = '/wp-content/themes/neve-child-master/wm-playerB/index.html';
    const params = new URLSearchParams({
      session: sessionId,
      anticache: anticache.toString(),
      track: currentTrack,
    });

    // Add montage parameter if specified
    if (montageIndex !== undefined && montageIndex !== null && montageIndex >= 0) {
      params.append('montage', montageIndex.toString());
    }

    // Add playlist ID if specified
    if (playlistId) {
      params.append('playlist', playlistId);
    }

    return `${baseUrl}?${params.toString()}`;
  };

  // Load the player by fetching its HTML
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session') || '';
    const anticache = Date.now();
    const currentTrack = selectedTrack;
    const currentMontagePos = selectedMontagePosition;

    const url = constructWebPlayerUrl(
      sessionId,
      anticache,
      currentTrack,
      currentMontagePos,
      selectedPlaylist
    );

    const loadPlayer = async () => {
      try {
        const response = await fetch(url, {
          signal: abortController.current.signal,
          headers: {
            'Cache-Control': 'no-cache',
            Pragma: 'no-cache',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        let html = await response.text();

        // const assetBase = process.env.REACT_APP_ASSET_PATH || '/wp-content/themes/neve-child-master/play-v4-assets/';
        const assetBase =
          process.env.REACT_APP_ASSET_PATH ||
          '/wp-content/themes/neve-child-master/play-v4B-assets/';

        html = html
          .replace(/href="static\/css/g, `href="${assetBase}css`)
          .replace(/src="static\/js/g, `src="${assetBase}js`);
        if (!containerRef.current) {
          throw new Error('Container ref is null after fetch');
        }

        // Load CSS first
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        const cssLink = tempDiv.querySelector('link[rel="stylesheet"]') as HTMLLinkElement;
        if (cssLink) {
          const linkPromise = new Promise(resolve => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = cssLink.href;
            link.onload = resolve;
            document.head.appendChild(link);
          });
          await linkPromise;
        }

        // Inject HTML
        containerRef.current.innerHTML = html;

        // Load the main script
        const mainScript = containerRef.current.querySelector('script[defer]') as HTMLScriptElement;
        if (mainScript) {
          await new Promise(resolve => {
            const script = document.createElement('script');
            script.src = mainScript.src;
            script.onload = resolve;
            document.body.appendChild(script);
          });
        }
      } catch (error) {
        console.error('Error loading player:', error);
      }
    };

    loadPlayer();

    // Cleanup function
    return () => {
      abortController.current.abort();
    };
  }, [selectedTrack, selectedMontagePosition, selectedPlaylist]);

  return (
    <div
      id="wm-player-contents"
      className="wm-player-contents relative w-full h-full flex items-center justify-center bg-black"
      style={{ minHeight: '36.25vw' }}
    >
      {loading && <CircularProgress />}
      <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center"
        style={{
          position: 'relative',
          overflow: 'visible',
          zIndex: 1,
        }}
      />
    </div>
  );
};

declare global {
  interface Window {
    SELECTED_TRACK?: string;
    SELECTED_MONTAGE?: number;
  }
}

const getParameterFromGlobalOrURL = (paramName: string) => {
  if (paramName === 'montage' && window.SELECTED_MONTAGE !== undefined) {
    console.log('[MONTAGE_PARAM] Using global SELECTED_MONTAGE:', window.SELECTED_MONTAGE);
    return window.SELECTED_MONTAGE.toString();
  }
  if (paramName === 'track' && window.SELECTED_TRACK !== undefined) {
    console.log('[MONTAGE_PARAM] Using global SELECTED_TRACK:', window.SELECTED_TRACK);
    return window.SELECTED_TRACK;
  }
  // Navigation parameters (montage, track, playlist) removed - use NAV commands only
  if (paramName === 'montage' || paramName === 'track' || paramName === 'playlist') {
    return null; // Navigation parameters no longer supported via URL
  }

  // Keep URL fallback for non-navigation parameters (session, auth, etc.)
  const params = new URLSearchParams(window.location.search);
  const value = params.get(paramName);
  console.log(`[MONTAGE_PARAM] Using URL param ${paramName}:`, value);
  return value;
};

console.log(
  '[MONTAGE_PARAM] getMontageFromUrl: window.SELECTED_MONTAGE =',
  window.SELECTED_MONTAGE,
  'type:',
  typeof window.SELECTED_MONTAGE
);
