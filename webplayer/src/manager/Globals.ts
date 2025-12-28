import { Playlist } from '../dao/Playlist';
import { Montage } from '../dao/Montage';
import WallmusePlayer from '../App';
import { Sequencer } from './Sequencer';
import { LogHelper } from './LogHelper';
import { ItemPlayer } from './ItemPlayer';

export let ThePlaylist: Playlist | undefined;
export let TheScreen: string;
export let Montages: { [key: string]: Montage } = {};
export let TheApp: WallmusePlayer;

// ===== KEN BURNS CONFIGURATION =====
// Global toggle for Ken Burns effect on images
// Set to true to enable auto-generated zoom/pan animations on all images
// Set to false to disable Ken Burns effect entirely
export const KEN_BURNS_ENABLED = true;

// FUTURE: This may be moved to:
// - Per-playlist configuration (Playlist.kenBurnsEnabled)
// - Per-image configuration (via zoomAndPan.enabled parameter from backend)
// - User preference settings
// ===================================

// Add queuing mechanism for when App isn't ready
declare global {
  interface Window {
    PENDING_APP_OPERATIONS?: Array<{
      type:
        | 'showVideo'
        | 'showImage'
        | 'preloadVideo'
        | 'preloadImage'
        | 'seek'
        | 'play'
        | 'pause'
        | 'stop'
        | 'setVolume'
        | 'goMontage'
        | 'setPlaylist';
      media?: any;
      offset?: number;
      volume?: number;
      montageIndex?: number;
      trackIndex?: number;
      playlistId?: number | string;
      timestamp: number;
    }>;
    testShowVideo?: () => void;
    testVideoVisibility?: () => void;
    debugSequencer?: () => void;
    debugMediaConflicts?: () => void;
    forceCleanState?: () => void;
  }
}

// Playlist content type detection function
const detectPlaylistContentTypes = (playlist: Playlist | undefined) => {
  let hasImages = false;
  let hasVideos = false;

  if (playlist) {
    const montageCount = playlist.getMontagesCount();
    LogHelper.log(
      'detectPlaylistContentTypes',
      `Scanning playlist ${playlist.id} with ${montageCount} montages`
    );

    // Scan through all montages in the playlist
    for (let i = 0; i < montageCount; i++) {
      const montage = playlist.getMontage(i);
      if (montage && montage.seqs) {
        // Scan through all tracks in the montage
        for (const track of montage.seqs) {
          if (track.items) {
            // Scan through all items in the track
            for (const item of track.items) {
              if (item.artwork && item.artwork.type === 'IMG') {
                hasImages = true;
              } else if (item.artwork && item.artwork.type === 'VID') {
                hasVideos = true;
              }

              // Early exit if we found both types
              if (hasImages && hasVideos) {
                break;
              }
            }
          }
          if (hasImages && hasVideos) break;
        }
      }
      if (hasImages && hasVideos) break;
    }
  } else {
    // For undefined playlist, use global montages (default playlist behavior)
    const montageKeys = Object.keys(Montages);
    for (const key of montageKeys) {
      const montage = Montages[key];
      if (montage && montage.seqs) {
        for (const track of montage.seqs) {
          if (track.items) {
            for (const item of track.items) {
              if (item.artwork && item.artwork.type === 'IMG') {
                hasImages = true;
              } else if (item.artwork && item.artwork.type === 'VID') {
                hasVideos = true;
              }
              if (hasImages && hasVideos) break;
            }
          }
          if (hasImages && hasVideos) break;
        }
      }
      if (hasImages && hasVideos) break;
    }
  }

  // Set global window flags
  (window as any).WM_HAS_IMAGES = hasImages;
  (window as any).WM_HAS_VIDEOS = hasVideos;

  LogHelper.log(
    'setCurrentPlaylist',
    `🎨 PLAYLIST CONTENT TYPES DETECTED: ${playlist?.id || 'undefined'} - Images: ${hasImages}, Videos: ${hasVideos}`
  );

  // Force React re-render when content types change so conditional rendering updates
  if (TheApp && typeof TheApp.forcePlaylistContentTypeRerender === 'function') {
    LogHelper.log(
      'setCurrentPlaylist',
      '🔄 Forcing React re-render for playlist content type change'
    );
    TheApp.forcePlaylistContentTypeRerender();
  }

  return { hasImages, hasVideos };
};

export const setCurrentPlaylist = (p: Playlist | undefined) => {
  if (p === null) {
    LogHelper.log('setCurrentPlaylist', 'Null playlist provided, ignoring');
    return;
  }

  // Allow undefined playlists to be set normally
  if (ThePlaylist === undefined && p === undefined) {
    LogHelper.log('setCurrentPlaylist', 'Undefined playlist already set, ignoring duplicate call');
    return;
  } else if (ThePlaylist === undefined) {
    LogHelper.log(
      'setCurrentPlaylist',
      `Setting initial playlist: ${p?.id || 'undefined'} (${p?.name || 'undefined'})`
    );
    ThePlaylist = p;
    // CRITICAL FIX: Detect playlist content types and set window globals
    detectPlaylistContentTypes(p);

    // CRITICAL FIX: Update parent window's currentPlaylist for parent-child communication
    // This ensures cross-playlist goMontage navigation has access to full playlist data
    if (window.parent && window.parent !== window) {
      try {
        (window.parent as any).currentPlaylist = p;
        LogHelper.log(
          'setCurrentPlaylist',
          `Updated parent window.currentPlaylist: ${p?.id || 'undefined'}`
        );
      } catch (e) {
        LogHelper.log('setCurrentPlaylist', 'Cannot update parent window (cross-origin)');
      }
    }

    if (p) {
      Sequencer.assumeNewPlaylist(p);
    }
  } else if (p === undefined) {
    LogHelper.log(
      'setCurrentPlaylist',
      `Changing playlist from ${ThePlaylist?.id || 'undefined'} to undefined`
    );
    ThePlaylist = p;
    // CRITICAL FIX: Detect playlist content types and set window globals
    detectPlaylistContentTypes(p);

    // CRITICAL FIX: Update parent window's currentPlaylist for parent-child communication
    if (window.parent && window.parent !== window) {
      try {
        (window.parent as any).currentPlaylist = p;
        LogHelper.log('setCurrentPlaylist', `Updated parent window.currentPlaylist: undefined`);
      } catch (e) {
        LogHelper.log('setCurrentPlaylist', 'Cannot update parent window (cross-origin)');
      }
    }

    // Always notify sequencer of playlist change, even for undefined playlists
    Sequencer.assumeNewPlaylist(p);
  } else if (p.id !== ThePlaylist?.id) {
    LogHelper.log(
      'setCurrentPlaylist',
      `Changing playlist from ${ThePlaylist?.id || 'undefined'} to ${p.id} (${p.name})`
    );
    ThePlaylist = p;
    // CRITICAL FIX: Detect playlist content types and set window globals
    detectPlaylistContentTypes(p);

    // CRITICAL FIX: Update parent window's currentPlaylist for parent-child communication
    // This is the key fix for cross-playlist goMontage navigation
    if (window.parent && window.parent !== window) {
      try {
        (window.parent as any).currentPlaylist = p;
        LogHelper.log(
          'setCurrentPlaylist',
          `Updated parent window.currentPlaylist: ${p.id} (${p.name})`
        );

        // CRITICAL FIX: Try multiple methods to update parent's React state
        try {
          // Method 1: Call parent's exposed function if available
          if ((window.parent as any).setCurrentPlaylistFromChild) {
            (window.parent as any).setCurrentPlaylistFromChild(p.id);
            LogHelper.log(
              'setCurrentPlaylist',
              `Called parent setCurrentPlaylistFromChild for playlist ${p.id}`
            );
          }

          // Method 2: Dispatch events (both document and window)
          const event = new CustomEvent('child-playlist-changed', {
            detail: { playlistId: p.id, playlist: p, timestamp: Date.now() },
          });
          window.parent.document.dispatchEvent(event);
          window.parent.dispatchEvent(event);
          LogHelper.log(
            'setCurrentPlaylist',
            `Dispatched child-playlist-changed events to parent for playlist ${p.id}`
          );
        } catch (eventError) {
          LogHelper.log(
            'setCurrentPlaylist',
            'Could not update parent state (cross-origin or not available)'
          );
        }
      } catch (e) {
        LogHelper.log('setCurrentPlaylist', 'Cannot update parent window (cross-origin)');
      }
    }

    if (p) {
      Sequencer.assumeNewPlaylist(p);
    }
  } else {
    LogHelper.log('setCurrentPlaylist', `Playlist ${p.id} already set, ignoring duplicate call`);
    // Still detect content types even for duplicate calls in case montages were updated
    detectPlaylistContentTypes(p);
  }
};

export const setScreenName = (s: string) => {
  TheScreen = s;
};

export const addMontage = (montage: Montage) => {
  Montages['m' + montage.id] = montage;

  // CRITICAL FIX: Re-detect content types after adding montage
  // This handles the case where playlist was loaded before montages arrived via WebSocket
  const currentPlaylist = ThePlaylist;
  if (currentPlaylist) {
    LogHelper.log(
      'addMontage',
      `Montage ${montage.id} added, re-detecting content types for playlist ${currentPlaylist.id}`
    );
    detectPlaylistContentTypes(currentPlaylist);
  }
};

export const getMontage = (id: number) => {
  return Montages['m' + id];
};

export const clearMontages = () => {
  console.log('[Globals] Clearing all montages from global cache');
  const montageKeys = Object.keys(Montages);
  montageKeys.forEach(key => delete Montages[key]);
  console.log('[Globals] Cleared', montageKeys.length, 'montages:', montageKeys);
};

// Prevent duplicate processing with simple lock
let processingPendingOps = false;

export const processPendingAppOperations = (source = 'unknown') => {
  // Check if already processing to prevent duplicate execution
  if (processingPendingOps) {
    console.log(
      '[DRAIN-CHECK] Already processing operations, skipping duplicate call from:',
      source
    );
    return;
  }
  processingPendingOps = true;

  // Add these debug markers at critical points:
  console.log('[DRAIN-CHECK] Processing operations:', {
    source: source,
    queueLength: window.PENDING_APP_OPERATIONS ? window.PENDING_APP_OPERATIONS.length : 0,
    hasTheApp: !!window.TheApp,
    hasItemPlayer: !!ItemPlayer?.ThePlayer,
    operations: window.PENDING_APP_OPERATIONS
      ? window.PENDING_APP_OPERATIONS.map(op => op.type)
      : [],
  });

  if (window.PENDING_APP_OPERATIONS && window.PENDING_APP_OPERATIONS.length > 0) {
    console.log(
      '[Globals] 🚀 STATE RESTITUTION: Processing',
      window.PENDING_APP_OPERATIONS.length,
      'pending operations'
    );
    console.log(
      '[Globals] 🚀 STATE RESTITUTION: Pending operations:',
      window.PENDING_APP_OPERATIONS
    );

    const pendingOps = [...window.PENDING_APP_OPERATIONS];
    window.PENDING_APP_OPERATIONS = []; // Clear the queue

    pendingOps.forEach(op => {
      try {
        console.log('[Globals] 🚀 STATE RESTITUTION: Processing pending operation:', op.type, op);
        switch (op.type) {
          case 'setPlaylist':
            const current = ThePlaylist?.id;

            // UNIFIED PROCESS: Handle all playlist types (undefined, numbered) the same way
            if (current !== op.playlistId) {
              // Playlist change detected - let WS flow handle it for ALL playlist types
              console.log(
                '[Globals] setPlaylist op: Target playlist',
                op.playlistId,
                'differs from current',
                current,
                '- WS flow will handle playlist switch'
              );

              // The WS flow will deliver the playlist object for both numbered and undefined playlists
              // No special treatment needed - same process for all
            } else {
              console.log(
                '[Globals] setPlaylist op: Already on target playlist',
                op.playlistId,
                '- no change needed'
              );
            }
            break;
          case 'goMontage':
            console.log('[Globals] 🔍 GOMONTAGE DEBUG: Processing goMontage operation:', {
              montageIndex: op.montageIndex,
              trackIndex: op.trackIndex,
              opType: typeof op.montageIndex,
              fullOp: op,
              timestamp: Date.now(),
            });
            if (typeof op.montageIndex === 'number') {
              Sequencer.goMontage(op.montageIndex, op.trackIndex);
            }
            break;
          case 'showVideo':
            if (op.media) TheApp.showVideo(op.media);
            break;
          case 'showImage':
            if (op.media) TheApp.showImage(op.media);
            break;
          case 'preloadVideo':
            if (op.media) TheApp.preloadVideo(op.media);
            break;
          case 'preloadImage':
            if (op.media) TheApp.preloadImage(op.media);
            break;
          case 'seek':
            if (op.offset !== undefined) TheApp.seek(op.offset);
            break;
          case 'play':
            if (op.offset !== undefined) {
              // If an offset was provided, seek before play
              TheApp.seek(op.offset);
            }
            TheApp.play();
            break;
          case 'pause':
            TheApp.pause();
            break;
          case 'stop':
            TheApp.stop();
            break;
          case 'setVolume':
            if (op.volume !== undefined) TheApp.setVolume(op.volume);
            break;
        }
      } catch (error) {
        console.error('[Globals] Error processing pending operation:', op.type, error);
      }
    });

    setTimeout(() => {
      console.log('[Globals] Post-queue playback/DOM sanity check');
      const currentPlaylist = Sequencer.getCurrentPlaylist();
      if (currentPlaylist && !Sequencer.isPlaying()) {
        console.log('[Globals] Post-queue: Starting playbook for playlist:', currentPlaylist.id);
        Sequencer.play(0);
      } else if (!currentPlaylist && !Sequencer.isPlaying()) {
        console.log('[Globals] Post-queue: Starting default playlist playback');
        Sequencer.play(0);
      } else {
        console.log('[Globals] Post-queue: Sequencer already running or no playlist');
      }
      processingPendingOps = false; // Release lock after all processing is complete
    }, 200);
  } else {
    processingPendingOps = false; // Release lock if no operations to process
  }
};

export const setTheApp = (app: WallmusePlayer) => {
  TheApp = app;
  console.log('[GLOBALS] setTheApp called with:', {
    appExists: !!app,
    appMethods: app ? Object.getOwnPropertyNames(Object.getPrototypeOf(app)) : [],
    hasShowVideo: app && typeof app.showVideo === 'function',
  });

  // Add global test functions for debugging
  window.testShowVideo = () => {
    if (TheApp) {
      console.log('[GLOBALS] Calling testShowVideo');
      TheApp.testShowVideo();
    } else {
      console.log('[GLOBALS] TheApp not ready for testShowVideo');
    }
  };

  window.testVideoVisibility = () => {
    if (TheApp) {
      console.log('[GLOBALS] Current video visibility state:', {
        videoShown: TheApp.state.videoShown,
        video1: TheApp.state.video1?.filename,
        video2: TheApp.state.video2?.filename,
        videoPreloading: TheApp.state.videoPreloading,
        imageShown: TheApp.state.imageShown,
      });
    } else {
      console.log('[GLOBALS] TheApp not ready for testVideoVisibility');
    }
  };

  // Debug function to analyze sequencer state
  // Debug function to check media type conflicts
  window.debugMediaConflicts = () => {
    console.log('🔍 === MEDIA TYPE CONFLICT ANALYSIS ===');

    // Content type flags
    const hasImages = (window as any).WM_HAS_IMAGES;
    const hasVideos = (window as any).WM_HAS_VIDEOS;

    // App state
    const appState = TheApp?.state;

    // Sequencer state
    const { Sequencer } = require('./Sequencer');
    const currentPlaylist = Sequencer.getCurrentPlaylist();

    console.log('1. Content Type Flags:', {
      WM_HAS_IMAGES: hasImages,
      WM_HAS_VIDEOS: hasVideos,
      shouldRenderImages: hasImages === true,
      shouldRenderVideos: hasVideos !== false,
    });

    console.log('2. App Media State:', {
      videoShown: appState?.videoShown,
      imageShown: appState?.imageShown,
      video1: appState?.video1?.filename,
      video2: appState?.video2?.filename,
      image1: appState?.image1?.filename,
      image2: appState?.image2?.filename,
    });

    console.log('3. Sequencer State:', {
      currentPlaylist: currentPlaylist?.id || 'undefined',
      playlistName: currentPlaylist?.name || 'default',
      isPlaying: Sequencer.isPlaying(),
      status: Sequencer.status,
    });

    console.log('4. 🚨 CONFLICTS DETECTED:', {
      imagePlaylistWithVideoShowing:
        hasImages === true && hasVideos === false && appState?.videoShown > 0,
      videoPlaylistWithImageShowing:
        hasVideos === true && hasImages === false && appState?.imageShown > 0,
      bothMediaTypesShowing: appState?.videoShown > 0 && appState?.imageShown > 0,
      noMediaShowing: appState?.videoShown === 0 && appState?.imageShown === 0,
    });

    // Check if state matches content type
    const expectedVideoVisible = hasVideos !== false && hasImages !== true;
    const expectedImageVisible = hasImages === true && hasVideos === false;
    const actualVideoVisible = appState?.videoShown > 0;
    const actualImageVisible = appState?.imageShown > 0;

    console.log('5. 🎯 STATE vs EXPECTED:', {
      shouldShowVideo: expectedVideoVisible,
      actuallyShowingVideo: actualVideoVisible,
      shouldShowImage: expectedImageVisible,
      actuallyShowingImage: actualImageVisible,
      stateMatches:
        expectedVideoVisible === actualVideoVisible && expectedImageVisible === actualImageVisible,
    });

    console.log('=== END MEDIA CONFLICT ANALYSIS ===');
  };

  // Force clean all media state for testing
  window.forceCleanState = () => {
    console.log('🧹 FORCING CLEAN STATE...');

    if (TheApp && typeof TheApp.clearAllMediaState === 'function') {
      TheApp.clearAllMediaState();
      console.log('✅ App media state cleared');
    }

    // Also clear content type flags
    (window as any).WM_HAS_IMAGES = false;
    (window as any).WM_HAS_VIDEOS = false;
    console.log('✅ Content type flags cleared');

    console.log('🧹 Clean state forced - use debugMediaConflicts() to verify');
  };

  // Debug current artwork data
  (window as any).debugCurrentArtwork = () => {
    console.log('🔍 === CURRENT ARTWORK DEBUG ===');

    // Try multiple ways to get sequencer
    let sequencer = (window as any).TheSequencer;
    if (!sequencer) {
      sequencer = (window as any).Sequencer;
    }
    if (!sequencer) {
      // Try to import it
      try {
        const { Sequencer } = require('./Sequencer');
        sequencer = Sequencer;
      } catch (e) {
        console.log('Could not import Sequencer:', e);
      }
    }

    if (!sequencer) {
      console.log('❌ No sequencer available through any method');
      console.log(
        'Available globals:',
        Object.keys(window).filter(k => k.includes('equencer') || k.includes('Sequencer'))
      );
      return;
    }

    console.log('✅ Found sequencer:', typeof sequencer);

    const currentItem = sequencer.getCurrentItem?.();
    console.log('Current item:', currentItem);

    if (currentItem?.artwork) {
      console.log('Artwork details:', {
        type: currentItem.artwork.type,
        filename: currentItem.artwork.filename,
        url: currentItem.artwork.url,
        artwork_id: currentItem.artwork.artwork_id,
        duration: currentItem.artwork.duration,
        codecs: currentItem.artwork.codecs,
      });
    } else {
      console.log('❌ No artwork in current item');
    }

    // Also try to get current playlist and montage info
    try {
      const currentPlaylist = sequencer.getCurrentPlaylist?.();
      const currentMontage = sequencer.getCurrentMontage?.();
      console.log('Playlist info:', {
        playlistId: currentPlaylist?.id,
        playlistName: currentPlaylist?.name,
        montageIndex: currentMontage?.index || 'unknown',
      });
    } catch (e) {
      console.log('Could not get playlist/montage info:', e);
    }

    console.log('=== END CURRENT ARTWORK DEBUG ===');
  };

  // Debug playlist structure
  (window as any).debugPlaylistStructure = () => {
    console.log('🔍 === PLAYLIST STRUCTURE DEBUG ===');

    // Try multiple ways to get sequencer
    let sequencer = (window as any).TheSequencer;
    if (!sequencer) {
      sequencer = (window as any).Sequencer;
    }
    if (!sequencer) {
      try {
        const { Sequencer } = require('./Sequencer');
        sequencer = Sequencer;
      } catch (e) {
        console.log('Could not import Sequencer:', e);
      }
    }

    if (!sequencer) {
      console.log('❌ No sequencer available');
      return;
    }

    const currentPlaylist = sequencer.getCurrentPlaylist?.();
    console.log('Current playlist:', currentPlaylist);

    if (currentPlaylist?.montages) {
      console.log('Montages count:', currentPlaylist.montages.length);
      currentPlaylist.montages.forEach((montage: any, index: number) => {
        console.log(`Montage ${index}:`, {
          tracks: montage.tracks?.length || 0,
          firstTrack: montage.tracks?.[0]
            ? {
                items: montage.tracks[0].items?.length || 0,
                firstItem: montage.tracks[0].items?.[0]
                  ? {
                      artwork_id: montage.tracks[0].items[0].artwork_id,
                      artwork: montage.tracks[0].items[0].artwork
                        ? {
                            type: montage.tracks[0].items[0].artwork.type,
                            filename: montage.tracks[0].items[0].artwork.filename,
                          }
                        : 'no artwork',
                    }
                  : 'no items',
              }
            : 'no tracks',
        });
      });
    } else {
      console.log('❌ No montages in current playlist');
    }

    // Check sequencer state
    try {
      console.log('Sequencer state:', {
        currentMontageIndex: sequencer.getCurrentMontageIndex?.(),
        currentTrackIndex: sequencer.getCurrentTrackIndex?.(),
        currentItemIndex: sequencer.getCurrentItemIndex?.(),
        isPlaying: sequencer.isPlaying?.(),
        status: sequencer.getStatus?.(),
      });
    } catch (e) {
      console.log('Could not get sequencer state:', e);
    }

    console.log('=== END PLAYLIST STRUCTURE DEBUG ===');
  };

  // Debug track items in detail
  (window as any).debugTrackItems = () => {
    console.log('🔍 === TRACK ITEMS DEBUG ===');

    let sequencer = (window as any).TheSequencer;
    if (!sequencer) {
      sequencer = (window as any).Sequencer;
    }
    if (!sequencer) {
      try {
        const { Sequencer } = require('./Sequencer');
        sequencer = Sequencer;
      } catch (e) {
        console.log('Could not import Sequencer:', e);
      }
    }

    if (!sequencer) {
      console.log('❌ No sequencer available');
      return;
    }

    const currentPlaylist = sequencer.getCurrentPlaylist?.();
    if (!currentPlaylist) {
      console.log('❌ No current playlist');
      return;
    }

    console.log('Playlist:', currentPlaylist.id, currentPlaylist.name);

    if (currentPlaylist.montages) {
      currentPlaylist.montages.forEach((montage: any, montageIndex: number) => {
        console.log(`\n--- Montage ${montageIndex} ---`);
        console.log('Montage object:', montage);

        if (montage.tracks) {
          console.log(
            'Tracks type:',
            typeof montage.tracks,
            'isArray:',
            Array.isArray(montage.tracks)
          );

          // Handle both array and object formats
          if (Array.isArray(montage.tracks)) {
            montage.tracks.forEach((track: any, trackIndex: number) => {
              console.log(`  Track ${trackIndex}:`, {
                itemsCount: track.items?.length || 0,
                items: track.items || [],
              });

              if (track.items && track.items.length > 0) {
                track.items.forEach((item: any, itemIndex: number) => {
                  console.log(`    Item ${itemIndex}:`, {
                    artwork_id: item.artwork_id,
                    artwork: item.artwork,
                    item,
                  });
                });
              } else {
                console.log('    ❌ No items in this track');
              }
            });
          } else {
            // Handle tracks as object
            console.log('  Tracks object keys:', Object.keys(montage.tracks));
            Object.entries(montage.tracks).forEach(([trackKey, track]: [string, any]) => {
              console.log(`  Track ${trackKey}:`, {
                itemsCount: track.items?.length || 0,
                items: track.items || [],
              });

              if (track.items && track.items.length > 0) {
                track.items.forEach((item: any, itemIndex: number) => {
                  console.log(`    Item ${itemIndex}:`, {
                    artwork_id: item.artwork_id,
                    artwork: item.artwork,
                    item,
                  });
                });
              } else {
                console.log('    ❌ No items in this track');
              }
            });
          }
        } else {
          console.log('  ❌ No tracks in this montage');
        }
      });
    } else {
      console.log('❌ No montages in playlist');
    }

    console.log('=== END TRACK ITEMS DEBUG ===');
  };

  // Debug where media is actually coming from
  (window as any).debugMediaSource = () => {
    console.log('🔍 === MEDIA SOURCE DEBUG ===');

    // Check App state for current media
    const app = (window as any).TheApp;
    if (app) {
      console.log('App media state:', {
        video1: app.state?.video1?.filename,
        video2: app.state?.video2?.filename,
        image1: app.state?.image1?.filename,
        image2: app.state?.image2?.filename,
        videoShown: app.state?.videoShown,
        imageShown: app.state?.imageShown,
      });
    }

    // Check global montage storage
    const globalMontages = (window as any).globalMontages;
    console.log('Global montages:', globalMontages);

    // Check if there are any cached items
    let sequencer = (window as any).TheSequencer;
    if (!sequencer) {
      sequencer = (window as any).Sequencer;
    }
    if (!sequencer) {
      try {
        const { Sequencer } = require('./Sequencer');
        sequencer = Sequencer;
      } catch (e) {
        console.log('Could not import Sequencer:', e);
      }
    }

    if (sequencer) {
      try {
        // Check if sequencer has any internal cached data
        console.log('Sequencer internals:', {
          currentPlaylist: sequencer.getCurrentPlaylist?.()?.id,
          currentMontageIndex: sequencer.getCurrentMontageIndex?.(),
          currentItem: sequencer.getCurrentItem?.(),
        });

        // Try to get the current montage directly
        const currentMontage = sequencer.getCurrentMontage?.();
        console.log('Current montage from sequencer:', currentMontage);
      } catch (e) {
        console.log('Error accessing sequencer internals:', e);
      }
    }

    // Check document elements
    const videoElements = document.querySelectorAll('video');
    const imageElements = document.querySelectorAll('img');
    console.log('DOM elements:', {
      videos: Array.from(videoElements).map(v => ({ id: v.id, src: v.src?.substring(0, 50) })),
      images: Array.from(imageElements).map(i => ({ id: i.id, src: i.src?.substring(0, 50) })),
    });

    console.log('=== END MEDIA SOURCE DEBUG ===');
  };

  // Force sequencer to initialize properly for current playlist
  (window as any).forceSequencerInit = () => {
    console.log('🔧 === FORCING SEQUENCER INITIALIZATION ===');

    let sequencer = (window as any).TheSequencer;
    if (!sequencer) {
      sequencer = (window as any).Sequencer;
    }
    if (!sequencer) {
      try {
        const { Sequencer } = require('./Sequencer');
        sequencer = Sequencer;
      } catch (e) {
        console.log('Could not import Sequencer:', e);
        return;
      }
    }

    const currentPlaylist = sequencer.getCurrentPlaylist?.();
    if (!currentPlaylist) {
      console.log('❌ No current playlist to initialize');
      return;
    }

    console.log('Current playlist:', currentPlaylist.id, currentPlaylist.name);

    try {
      // Check ItemPlayer state before calling goMontage
      const { ItemPlayer } = require('./ItemPlayer');
      console.log('ItemPlayer.ThePlayer exists:', !!ItemPlayer.ThePlayer);
      if (ItemPlayer.ThePlayer) {
        console.log('Current position in ItemPlayer:', ItemPlayer.ThePlayer.getPosition?.());
      }

      // Force call goMontage(0) to initialize the sequencer properly
      console.log('🚀 Calling goMontage(0) to force initialization...');
      sequencer.goMontage(0);

      setTimeout(() => {
        console.log('Sequencer state after goMontage(0):', {
          currentMontageIndex: sequencer.getCurrentMontageIndex?.(),
          currentTrackIndex: sequencer.getCurrentTrackIndex?.(),
          currentItemIndex: sequencer.getCurrentItemIndex?.(),
          currentItem: sequencer.getCurrentItem?.(),
        });

        // Also check ItemPlayer state after
        if (ItemPlayer.ThePlayer) {
          console.log('ItemPlayer position after goMontage:', ItemPlayer.ThePlayer.getPosition?.());
        }
      }, 100);
    } catch (e) {
      console.log('❌ Error calling goMontage:', e);
    }

    console.log('=== END SEQUENCER INITIALIZATION ===');
  };

  // Debug why UI shows empty despite components rendering
  (window as any).debugEmptyUI = () => {
    console.log('🔍 === EMPTY UI DEBUG ===');

    // Check root container
    const rootContainer = document.getElementById('wm-player-contents');
    console.log('Root container:', {
      exists: !!rootContainer,
      innerHTML: rootContainer?.innerHTML?.length || 0,
      children: rootContainer?.children.length || 0,
      display: rootContainer ? window.getComputedStyle(rootContainer).display : 'not found',
      visibility: rootContainer ? window.getComputedStyle(rootContainer).visibility : 'not found',
    });

    // Check all image elements
    const allImages = document.querySelectorAll('img');
    console.log('All images in DOM:', allImages.length);

    Array.from(allImages).forEach((img, index) => {
      const computedStyle = window.getComputedStyle(img);
      console.log(`Image ${index}:`, {
        id: img.id,
        src: img.src ? img.src.substring(0, 50) + '...' : 'no src',
        className: img.className,
        style: {
          display: computedStyle.display,
          visibility: computedStyle.visibility,
          opacity: computedStyle.opacity,
          position: computedStyle.position,
          width: computedStyle.width,
          height: computedStyle.height,
          zIndex: computedStyle.zIndex,
        },
        isVisible:
          computedStyle.display !== 'none' &&
          computedStyle.visibility !== 'hidden' &&
          computedStyle.opacity !== '0',
        parentElement: img.parentElement?.tagName,
        parentId: img.parentElement?.id,
        parentClass: img.parentElement?.className,
      });
    });

    // Check React components in the root
    if (rootContainer) {
      const reactNodes = rootContainer.querySelectorAll('[data-reactroot], [data-react-checksum]');
      console.log('React nodes found:', reactNodes.length);
    }

    // Check App state
    const app = (window as any).TheApp;
    if (app) {
      console.log('App render state:', {
        imageShown: app.state?.imageShown,
        videoShown: app.state?.videoShown,
        image1: app.state?.image1?.filename,
        image2: app.state?.image2?.filename,
        loading: app.state?.loading,
      });
    }

    console.log('=== END EMPTY UI DEBUG ===');
  };

  // Debug container mounting issues
  (window as any).debugContainers = () => {
    console.log('🔍 === CONTAINER DEBUG ===');

    // Check all possible container IDs
    const possibleContainers = [
      'root-wm-player',
      'wm-player-contents',
      'web-player-content',
      'root',
      'webplayer-container',
    ];

    possibleContainers.forEach(id => {
      const element = document.getElementById(id);
      console.log(`Container '${id}':`, {
        exists: !!element,
        innerHTML: element?.innerHTML?.length || 0,
        children: element?.children.length || 0,
        className: element?.className || 'no class',
      });
    });

    // Check all divs that might be player containers
    const allDivs = document.querySelectorAll('div');
    const playerDivs = Array.from(allDivs).filter(
      div =>
        div.className.includes('player') ||
        div.className.includes('web-player') ||
        div.id.includes('player') ||
        div.id.includes('root')
    );

    console.log(
      'Potential player containers:',
      playerDivs.map(div => ({
        id: div.id,
        className: div.className,
        innerHTML: div.innerHTML?.length || 0,
        children: div.children.length,
      }))
    );

    console.log('=== END CONTAINER DEBUG ===');
  };

  // Force remount React to correct container
  (window as any).forceRemount = () => {
    console.log('🔧 === FORCING REACT REMOUNT ===');

    // Find the target container
    const targetContainer = document.querySelector('.web-player-content') as HTMLElement;
    if (!targetContainer) {
      console.log('❌ Target container .web-player-content not found');
      return;
    }

    console.log('✅ Found target container:', {
      className: targetContainer.className,
      innerHTML: targetContainer.innerHTML?.length || 0,
      children: targetContainer.children.length,
    });

    // Clear the container
    targetContainer.innerHTML = '';
    console.log('🧹 Cleared target container');

    // Create a proper React root container
    const reactRoot = document.createElement('div');
    reactRoot.id = 'wm-player-contents';
    reactRoot.style.cssText = 'width: 100%; height: 100%; position: relative;';

    targetContainer.appendChild(reactRoot);
    console.log('📦 Created React root container with ID: wm-player-contents');

    // Force React to remount
    try {
      const { mountReactApp } = require('../index');
      setTimeout(() => {
        console.log('🚀 Calling mountReactApp() to remount...');
        mountReactApp();

        setTimeout(() => {
          console.log('✅ Remount completed, checking container:', {
            hasContent: reactRoot.innerHTML.length > 0,
            children: reactRoot.children.length,
          });
        }, 500);
      }, 100);
    } catch (e) {
      console.log('❌ Error remounting React:', e);
    }

    console.log('=== END REACT REMOUNT ===');
  };

  // Debug video visibility logic
  (window as any).debugVideoVisibility = () => {
    console.log('🔍 === VIDEO VISIBILITY DEBUG ===');

    const app = (window as any).TheApp;
    if (!app) {
      console.log('❌ No app available');
      return;
    }

    const state = app.state;
    console.log('App state:', {
      videoShown: state.videoShown,
      imageShown: state.imageShown,
      video1: state.video1?.filename,
      video2: state.video2?.filename,
      videoPreloading: state.videoPreloading,
    });

    // Check actual video elements in DOM
    const video1 = document.getElementById('video-1') as HTMLVideoElement;
    const video2 = document.getElementById('video-2') as HTMLVideoElement;

    console.log('Video elements in DOM:', {
      video1Exists: !!video1,
      video2Exists: !!video2,
      video1Hidden: video1?.hidden,
      video2Hidden: video2?.hidden,
      video1Display: video1 ? window.getComputedStyle(video1).display : 'not found',
      video2Display: video2 ? window.getComputedStyle(video2).display : 'not found',
      video1Src: video1?.src,
      video2Src: video2?.src,
    });

    // Check what the render logic should be doing
    const hasVideosInPlaylist = (window as any).WM_HAS_VIDEOS !== false;
    const hasImagesInPlaylist = (window as any).WM_HAS_IMAGES === true;

    console.log('Render logic analysis:', {
      hasVideosInPlaylist,
      hasImagesInPlaylist,
      shouldRenderVideos: hasVideosInPlaylist,
      shouldRenderImages: hasImagesInPlaylist,
      videoShown: state.videoShown,
      expectedVideo1Hidden: state.videoShown !== 1,
      expectedVideo2Hidden: state.videoShown !== 2,
    });

    console.log('=== END VIDEO VISIBILITY DEBUG ===');
  };

  // Debug where React is actually mounted vs where it should be
  (window as any).debugReactMounting = () => {
    console.log('🔍 === REACT MOUNTING DEBUG ===');

    // Check all possible containers
    const containers = {
      'wm-player-contents': document.getElementById('wm-player-contents'),
      'root-wm-player': document.getElementById('root-wm-player'),
      'web-player-content-class': document.querySelector('.web-player-content'),
      'react-root': document.querySelector('[data-reactroot]'),
      'any-video': document.querySelector('video'),
      'any-img-with-id': document.querySelector('img[id^="image-"]'),
    };

    console.log('Container search results:');
    Object.entries(containers).forEach(([name, element]) => {
      if (element) {
        console.log(`✅ ${name}:`, {
          exists: true,
          tagName: element.tagName,
          id: element.id,
          className: element.className,
          innerHTML: element.innerHTML?.length || 0,
          children: element.children.length,
          isVisible: (element as HTMLElement).offsetParent !== null,
        });
      } else {
        console.log(`❌ ${name}: not found`);
      }
    });

    // Check if React is mounted somewhere else
    const allReactRoots = document.querySelectorAll('[data-reactroot]');
    console.log(`Found ${allReactRoots.length} React roots in document`);

    Array.from(allReactRoots).forEach((root, index) => {
      console.log(`React root ${index}:`, {
        element: root.tagName,
        id: root.id,
        className: root.className,
        parent: root.parentElement?.tagName,
        parentId: root.parentElement?.id,
        parentClass: root.parentElement?.className,
        isVisible: (root as HTMLElement).offsetParent !== null,
        hasVideoChildren: !!root.querySelector('video'),
        hasImageChildren: !!root.querySelector('img[id^="image-"]'),
      });
    });

    console.log('=== END REACT MOUNTING DEBUG ===');
  };

  // Debug playlist-specific mounting issues
  (window as any).debug1039Issue = () => {
    console.log('🔍 === 1039 SPECIFIC DEBUG ===');

    // Check current playlist
    let sequencer = (window as any).TheSequencer;
    if (!sequencer) {
      try {
        const { Sequencer } = require('./Sequencer');
        sequencer = Sequencer;
      } catch (e) {
        console.log('Could not import Sequencer:', e);
      }
    }

    if (sequencer) {
      const currentPlaylist = sequencer.getCurrentPlaylist?.();
      console.log('Current playlist:', {
        id: currentPlaylist?.id,
        name: currentPlaylist?.name,
        montagesCount: currentPlaylist?.montages?.length || 0,
      });
    }

    // Check if we need to run forceRemount for 1039
    const app = (window as any).TheApp;
    console.log('App status:', {
      appExists: !!app,
      containerStatus: app
        ? {
            container: false, // This is the issue!
            children: 0,
          }
        : 'no app',
    });

    // Check if React is mounted to visible container
    const targetContainer = document.querySelector('.web-player-content');
    const reactContainer = document.getElementById('wm-player-contents');

    console.log('Container analysis:', {
      targetContainerExists: !!targetContainer,
      targetContainerVisible: (targetContainer as HTMLElement)?.offsetParent !== null,
      reactContainerExists: !!reactContainer,
      reactContainerVisible: (reactContainer as HTMLElement)?.offsetParent !== null,
      needsRemount: !!targetContainer && !reactContainer,
    });

    if (targetContainer && !reactContainer) {
      console.log('🚨 DIAGNOSIS: 1039 needs forceRemount() to fix container mounting');
      console.log('🔧 SOLUTION: Run forceRemount() to mount React to visible container');
    }

    console.log('=== END 1039 SPECIFIC DEBUG ===');
  };

  // Monitor container destruction to find the cause
  (window as any).monitorContainerDestruction = () => {
    console.log('🔍 === STARTING CONTAINER DESTRUCTION MONITORING ===');

    const targetContainer = document.getElementById('wm-player-contents');
    if (!targetContainer) {
      console.log('❌ wm-player-contents not found - cannot monitor');
      return;
    }

    console.log('✅ Monitoring wm-player-contents for destruction...');

    // Monitor the container itself
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.type === 'childList') {
          mutation.removedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              if (
                element.id === 'wm-player-contents' ||
                element.classList.contains('wm-player-contents')
              ) {
                console.log('🚨 CONTAINER DESTRUCTION DETECTED!');
                console.log('🔍 Destroyed element:', {
                  id: element.id,
                  className: element.className,
                  tagName: element.tagName,
                  parentWas: mutation.target,
                });
                console.log('🔍 Call stack at destruction:');
                console.trace('Container destruction stack trace');

                // Try to identify what triggered this
                setTimeout(() => {
                  console.log('🔍 State after destruction:', {
                    containerExists: !!document.getElementById('wm-player-contents'),
                    parentStillExists: !!(mutation.target as Element),
                    rootExists: !!document.getElementById('root-wm-player'),
                  });
                }, 0);
              }
            }
          });
        }
      });
    });

    // Monitor the parent container for changes
    const parentContainer = targetContainer.parentElement;
    if (parentContainer) {
      observer.observe(parentContainer, {
        childList: true,
        subtree: true,
      });
      console.log(
        '✅ Monitoring parent container:',
        parentContainer.id || parentContainer.className
      );
    }

    // Also monitor the root container
    const rootContainer = document.getElementById('root-wm-player');
    if (rootContainer && rootContainer !== parentContainer) {
      observer.observe(rootContainer, {
        childList: true,
        subtree: true,
      });
      console.log('✅ Also monitoring root container');
    }

    // Store observer globally so it can be stopped
    (window as any).containerObserver = observer;

    console.log('✅ Container destruction monitoring active');
    console.log('💡 Run stopContainerMonitoring() to stop monitoring');
  };

  // Stop monitoring
  (window as any).stopContainerMonitoring = () => {
    const observer = (window as any).containerObserver;
    if (observer) {
      observer.disconnect();
      delete (window as any).containerObserver;
      console.log('✅ Container destruction monitoring stopped');
    } else {
      console.log('❌ No active monitoring to stop');
    }
  };

  window.debugSequencer = () => {
    const { Sequencer } = require('./Sequencer');
    const { ItemPlayer } = require('./ItemPlayer');

    console.log('=== SEQUENCER DEBUG ANALYSIS ===');

    // Basic sequencer state
    console.log('1. Sequencer Status:', {
      isPlaying: Sequencer.isPlaying(),
      isPaused: Sequencer.isPaused(),
      isStopped: Sequencer.isStopped(),
      status: Sequencer.status,
      offset: Sequencer.getCurrentOffset(),
    });

    // Playlist state
    const currentPlaylist = Sequencer.getCurrentPlaylist();
    console.log('2. Playlist State:', {
      currentPlaylist: currentPlaylist?.id || 'undefined',
      currentPlaylistName: currentPlaylist?.name || 'default',
      pendingMontageIndex: Sequencer.getPendingMontageIndex(),
    });

    // Global montages for default playlists
    console.log('3. Global Montages (for default playlist):', {
      montageCount: Object.keys(Montages).length,
      montageKeys: Object.keys(Montages),
      firstMontage: Object.values(Montages)[0]
        ? {
            id: Object.values(Montages)[0].id,
            name: Object.values(Montages)[0].name,
            trackCount: Object.values(Montages)[0].seqs?.length,
          }
        : 'none',
    });

    // ItemPlayer position state
    const player = ItemPlayer.ThePlayer;
    const position = player?.getPosition();
    console.log('4. Player Position:', {
      hasPlayer: !!player,
      hasPosition: !!position,
      position: position
        ? {
            montageIndex: position.getMontageIndex(),
            trackIndex: position.getTrackIndex(),
            itemIndex: position.getItemIndex(),
            playlist: position.getPlaylist()?.id || 'undefined',
          }
        : null,
    });

    // Media content analysis
    if (position) {
      let montage;
      if (currentPlaylist) {
        montage = currentPlaylist.getMontage(position.getMontageIndex());
      } else {
        montage = Object.values(Montages)[position.getMontageIndex()];
      }

      console.log('5. Current Media Analysis:', {
        montageFound: !!montage,
        montageId: montage?.id,
        montageName: montage?.name,
        trackExists: !!montage?.seqs?.[position.getTrackIndex()],
        itemExists: !!montage?.seqs?.[position.getTrackIndex()]?.items?.[position.getItemIndex()],
        currentItem: montage?.seqs?.[position.getTrackIndex()]?.items?.[position.getItemIndex()]
          ? {
              artworkType:
                montage.seqs[position.getTrackIndex()].items[position.getItemIndex()].artwork?.type,
              artworkUrl:
                montage.seqs[position.getTrackIndex()].items[position.getItemIndex()].artwork?.url,
              artworkFilename:
                montage.seqs[position.getTrackIndex()].items[position.getItemIndex()].artwork
                  ?.filename,
            }
          : null,
      });
    }

    // App state
    console.log('6. App Media State:', {
      hasTheApp: !!TheApp,
      videoShown: TheApp?.state?.videoShown || 0,
      imageShown: TheApp?.state?.imageShown || 0,
      video1: TheApp?.state?.video1?.filename || 'none',
      video2: TheApp?.state?.video2?.filename || 'none',
    });

    console.log('=== END SEQUENCER DEBUG ===');
  };

  // Process any pending operations that were queued while App wasn't ready
  if (window.PENDING_APP_OPERATIONS && window.PENDING_APP_OPERATIONS.length > 0) {
    console.log(
      '[Globals] App is now ready, processing',
      window.PENDING_APP_OPERATIONS.length,
      'pending operations'
    );
    processPendingAppOperations('setTheApp');
  }
};
