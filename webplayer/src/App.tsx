import React from 'react';
import './App.css';
import { Video } from './component/video';
import { VideoMediaFile } from './media/VideoMediaFile';
import { ImageMediaFile } from './media/ImageMediaFile';
import { Image } from './component/image';
import { setTheApp, TheApp, Montages } from './manager/Globals';
import { LogHelper } from './manager/LogHelper';
import { Sequencer } from './manager/Sequencer';
import { ItemPlayer } from './manager/ItemPlayer';
import { wsTools } from './manager/start';

// Import WebSocket test runner for development
if (process.env.NODE_ENV === 'development') {
  import('./ws/ws-test-runner');
}

interface AppState {
  image1?: ImageMediaFile;
  image2?: ImageMediaFile;
  imageShown: number;
  imagePreloading: number;
  video1?: VideoMediaFile;
  video2?: VideoMediaFile;
  videoShown: number;
  videoPreloading: number;
  volume: number;
  fadeClass: string;
  loading: boolean;
  // REACT-NATIVE FIX: Force re-render mechanism properties
  renderKey: number;
  forceRender: boolean;
  // CRITICAL FIX: Add pending seek offset for video playback
  pendingSeekOffset: number;
}

export default class WallmusePlayer extends React.Component {
  private hasSignaledReady = false;

  // Add method to check if component is still mounted
  private _isMounted = false;

  // Track last shown montage for duplicate detection
  private _lastShownMontage: number | undefined = undefined;

  // EDGE CASE FIX: Debounce guard for preloadVideo() to prevent infinite loop
  // When transitioning between playlists/montages that contain the same video,
  // preloadVideo() can be called rapidly (459+ times in <100ms), causing freeze.
  // This 100ms debounce blocks the rapid duplicate calls while allowing legitimate
  // navigation (which is always >150ms apart).
  private lastPreloadCall: { url?: string; timestamp: number } = { timestamp: 0 };

  constructor(props: any) {
    super(props);
    // Set global app reference ONCE in constructor to prevent render cycle corruption
    setTheApp(this);
    console.log('🔍 [App] CONSTRUCTOR CALLED', { timestamp: Date.now() });
  }

  state: AppState = {
    imageShown: 0,
    videoShown: 0,
    imagePreloading: 0,
    videoPreloading: 0,
    volume: 0,
    fadeClass: 'fadeinout out',
    loading: true,
    // REACT-NATIVE FIX: Force re-render mechanism
    renderKey: Date.now(),
    forceRender: false,
    // CRITICAL FIX: Add pending seek offset for video playback
    pendingSeekOffset: 0,
  };

  private video1Ref = React.createRef<HTMLVideoElement>();
  private video2Ref = React.createRef<HTMLVideoElement>();
  private image1Ref = React.createRef<HTMLImageElement>();
  private image2Ref = React.createRef<HTMLImageElement>();

  // Add debounce mechanism to prevent infinite loops
  private lastShowVideoCall: { filename: string; artworkId: number; timestamp: number } | null =
    null;
  private readonly SHOW_VIDEO_DEBOUNCE_MS = 100; // 100ms debounce

  // CRITICAL FIX: Track video ready state and pending showVideo calls
  private video1Ready: boolean = false;
  private video2Ready: boolean = false;
  private pendingShowVideo: VideoMediaFile | null = null;
  private startTime: number = Date.now();
  private videoRetryCount: number = 0;
  private readonly MAX_VIDEO_RETRIES: number = 50; // 50 retries = 5 seconds max
  private videoPlayRetryCount: number = 0;
  private readonly MAX_VIDEO_PLAY_RETRIES: number = 20; // 20 retries = 2 seconds max

  // HYBRID APPROACH: Immediate timing data (no setState batching delays)
  private timingRef = {
    currentMontage: 0,
    currentTrack: 0,
    currentOffset: 0,
    mediaOffset: 0,
    lastUpdateTime: 0,
    pendingSeekOffset: 0,
  };

  // HYBRID APPROACH: Update timing reference immediately (no batching delays)
  private updateTimingRef(updates: Partial<typeof this.timingRef>) {
    Object.assign(this.timingRef, updates, { lastUpdateTime: Date.now() });
    // console.log('🔍 [App.updateTimingRef] Immediate timing update:', updates); // PRODUCTION: Commented out high-frequency logs
  }

  // HYBRID APPROACH: Get current timing data (immediate, no state delays)
  private getCurrentTiming() {
    return { ...this.timingRef };
  }

  // HYBRID APPROACH: Sync position data to timing reference for immediate access
  private syncPositionToTimingRef() {
    try {
      const player = ItemPlayer.ThePlayer;
      const position = player?.getPosition();
      if (position) {
        const timingUpdate = {
          currentMontage: position.getMontageIndex(),
          currentTrack: position.getTrackIndex(),
          currentOffset: (window as any).Sequencer?.getCurrentOffset() || 0,
          mediaOffset: (window as any).Sequencer?.getCurrentOffset() || 0,
        };

        // DEBUG: Only warn about zeros during actual problems, not natural flow
        // if (timingUpdate.currentOffset === 0 && timingUpdate.mediaOffset === 0) {
        //     console.warn('🔍 [App.syncPositionToTimingRef] Position reset to zeros detected:', {
        //         sequencerStatus: (window as any).Sequencer?.getStatus(),
        //         isPlaying: (window as any).Sequencer?.isPlaying(),
        //         timingUpdate
        //     });
        // }

        this.updateTimingRef(timingUpdate);
      }
    } catch (error) {
      console.warn('🔍 [App.syncPositionToTimingRef] Error syncing position:', error);
    }
  }

  // HYBRID APPROACH: Update pending seek offset immediately for montage transitions
  public updatePendingSeekOffset(offset: number) {
    this.updateTimingRef({ pendingSeekOffset: offset });
    // Also update state for UI consistency, but timing-critical operations use timingRef
    this.setState(prevState => ({ ...prevState, pendingSeekOffset: offset }));
  }

  // 🚨 CRITICAL FIX: Loading lock to prevent AbortError from simultaneous video operations
  private static isVideoLoading: boolean = false;
  private static videoLoadingLockTimeout: NodeJS.Timeout | null = null;

  // Track last logged position to avoid duplicate logs
  private lastLoggedPosition: {
    montageIndex: number;
    trackIndex: number;
    itemIndex: number;
    offset: number;
  } | null = null;

  // Force overlay updates by adding a timer
  // private overlayUpdateTimer: NodeJS.Timeout | null = null;

  // REACT-NATIVE FIX: Force re-render method
  private forceReactRerender = () => {
    console.log('[App] REACT-NATIVE FIX: Forcing React re-render');
    this.setState((prevState: AppState) => ({
      forceRender: !prevState.forceRender,
      renderKey: Date.now(),
    }));
  };

  // SIMPLE MONTAGE LOGGING - Light console logging once per montage
  private logMontageInfo = () => {
    try {
      const player = ItemPlayer.ThePlayer;
      const position = player?.getPosition();
      if (position) {
        const montageIndex = position.getMontageIndex();
        const trackIndex = position.getTrackIndex();
        const itemIndex = position.getItemIndex();
        const artwork = position?.getArtwork();
        const mediaFile = artwork?.filename || 'none';
        const duration = Math.round(position.getDuration());
        const playlistId = Sequencer.getCurrentPlaylist()?.id || 'none';

        const montageKey = `${playlistId}-${montageIndex}-${trackIndex}`;

        // Only log once per montage/track combination
        if (this.lastLoggedMontage !== montageKey) {
          console.log(
            `🎬 [MONTAGE-INFO] Playlist:${playlistId} | M${montageIndex}:T${trackIndex}:I${itemIndex} | File:${mediaFile} | Duration:${duration}s`
          );
          this.lastLoggedMontage = montageKey;
        }
      }
    } catch (error) {
      console.warn('[App] Error logging montage info:', error);
    }
  };

  // Removed heavy debug overlay - replaced with simple montage logging

  // Track real-time playback time for TIME display
  private playbackStartTime: number = 0;
  private playbackPauseTime: number = 0;
  private isPlaybackPaused: boolean = false;

  // Prevent video switching loops
  private lastVideoChangeTime: number = 0;
  private lastVideoFilename: string = '';

  // Track fade overlay changes to avoid being stuck black
  private lastFadeChangeTime: number = 0;

  // Pending seek offset to apply after video starts playing
  private pendingSeekSeconds: number | null = null;

  // Simple montage tracking - log once per montage
  private lastLoggedMontage: string | null = null;
  // Track last debug position to avoid duplicate logs
  // Throttling for React Root Status logging to prevent spam
  private lastRootStatusLog: number | null = null;
  // Debouncing for React app recovery to prevent false positives during playlist changes
  private recoveryDebounceTime: number | null = null;
  // Track if we're in the middle of a playlist change to avoid false recovery
  private isPlaylistChanging: boolean = false;
  // Debounce for component missing alerts to avoid false positives during navigation
  private componentMissingDebounce: number | null = null;

  public preloadImage(media: ImageMediaFile) {
    LogHelper.log(
      'App.preloadImage',
      'Loading: at ' + (3 - this.state.imageShown) + ' -> ' + media.filename
    );
    if (this.state.imageShown === 1) {
      this.setState(state => {
        return { ...state, image2: media, imagePreloading: 2, videoPreloading: 0 };
      });
    } else {
      this.setState(state => {
        return { ...state, image1: media, imagePreloading: 1, videoPreloading: 0 };
      });
    }
  }

  public showImage(media: ImageMediaFile) {
    console.log('[LOG] App.showImage called with:', media);

    // Log montage info when showing new image
    this.logMontageInfo();

    // TEMPORARY: Disable blocking for image playlists to prevent container destruction
    const isImageFile = media && media.filename && media.filename.includes('img-');
    if (isImageFile) {
      console.log('[App.showImage] 🚑 TEMPORARY FIX: Bypassing video blocking for image files');
      // Skip the blocking check for image files
    } else {
      // CRITICAL FIX: Prevent image from overriding video when video is the intended media
      if (this.state.videoShown > 0 && this.state.video1?.filename) {
        console.log(
          '[App.showImage] 🚨 BLOCKED: Image show blocked because video is currently displayed:',
          {
            videoShown: this.state.videoShown,
            video1: this.state.video1?.filename,
            imageToShow: media.filename,
            reason: 'Preventing image from overriding video display',
          }
        );
        return;
      }
    }

    // Continue with normal image display logic
    if (false) {
      // This condition will never be true now
      console.log(
        '[App.showImage] 🚨 BLOCKED: Image show blocked because video is currently displayed:',
        {
          videoShown: this.state.videoShown,
          video1: this.state.video1?.filename,
          imageToShow: media.filename,
          reason: 'Preventing image from overriding video display',
        }
      );
      return;
    }

    LogHelper.log(
      'App.showImage',
      'Show: at ' + (3 - this.state.imageShown) + ' -> ' + media.filename
    );

    // CRITICAL FIX: Simplified logic to avoid race conditions
    console.log('[App.showImage] Current state before show:', {
      imagePreloading: this.state.imagePreloading,
      imageShown: this.state.imageShown,
      image1: this.state.image1?.filename,
      image2: this.state.image2?.filename,
      targetImage: media.filename,
    });

    // If no image is preloading, start preloading AND set it to show immediately
    if (!this.state.imagePreloading) {
      console.log(
        '[App.showImage] No preloading detected - setting up image1 for immediate display'
      );
      this.setState(
        state => ({
          ...state,
          image1: media,
          imagePreloading: 1,
          imageShown: 1,
          videoShown: 0,
        }),
        () => {
          console.log('[App.showImage] ✅ STATE UPDATED - image1 set to show:', {
            imageShown: this.state.imageShown,
            imagePreloading: this.state.imagePreloading,
            image1: this.state.image1?.filename,
          });
        }
      );
    }
    // If image1 is preloading, switch to show it
    else if (this.state.imagePreloading === 1) {
      console.log('[App.showImage] Image1 was preloading - now switching to show it');
      this.setState(
        state => ({ ...state, imageShown: 1, imagePreloading: 0, videoShown: 0 }),
        () => {
          console.log(
            '[App.showImage] ✅ STATE UPDATED - switched to image1:',
            this.state.imageShown
          );
        }
      );
    }
    // If image2 is preloading, switch to show it
    else if (this.state.imagePreloading === 2) {
      console.log('[App.showImage] Image2 was preloading - now switching to show it');
      this.setState(
        state => ({ ...state, imageShown: 2, imagePreloading: 0, videoShown: 0 }),
        () => {
          console.log(
            '[App.showImage] ✅ STATE UPDATED - switched to image2:',
            this.state.imageShown
          );
        }
      );
    }
    // Fallback: force image1 display
    else {
      console.log('[App.showImage] Fallback - forcing image1 display');
      this.setState(
        state => ({ ...state, image1: media, imageShown: 1, videoShown: 0 }),
        () => {
          console.log(
            '[App.showImage] ✅ STATE UPDATED - fallback image1 showing:',
            this.state.imageShown
          );
        }
      );
    }
    this.makeOpeningTransition();

    // Start playback timer for TIME display
    this.startPlaybackTimer();
  }

  // CRITICAL FIX: React root recovery method
  private attemptReactRootRecovery() {
    console.log('🚑 [App] Attempting React app recovery...');

    // CRITICAL FIX: Don't clear montage cache during normal playlist switches - preserve loaded montages
    try {
      const { Sequencer } = require('./manager/Sequencer');

      console.log(
        '🚑 [App] PLAYLIST TRANSITION: Preserving montage cache to prevent loading errors'
      );

      // CRITICAL FIX: Only reset Sequencer context if really needed, not during normal switches
      if (Sequencer && !Sequencer.isInitialized()) {
        console.log(
          '🚑 [App] Resetting Sequencer playlist context to clear stale playlist reference'
        );
        // Clear the sequencer's playlist reference so it knows data needs to be reloaded
        Sequencer.playlist = undefined;
        Sequencer.nextPlaylist = undefined;
        // Stop any running sequencer to prevent using stale state
        Sequencer.interrupt();
        console.log('🚑 [App] Sequencer state reset - will reload fresh data');
      }
    } catch (error) {
      console.warn('🚨 [App] Failed to clear cache/reset sequencer during recovery:', error);
    }

    try {
      // Try to find the container in multiple locations
      let container = document.getElementById('root-wm-player');

      // If not found locally, try parent window (for iframe scenarios)
      if (!container && window.parent && window.parent !== window) {
        try {
          container = window.parent.document.getElementById('root-wm-player');
          if (container) {
            console.log('🔍 [App] Found container in parent window during recovery');
          }
        } catch (e) {
          console.log('🔍 [App] Cannot access parent window during recovery');
        }
      }

      // If still not found, create a recovery container
      if (!container) {
        console.log('🛠️ [App] Container not found anywhere - creating emergency container');
        container = document.createElement('div');
        container.id = 'root-wm-player';
        container.style.cssText =
          'width: 100%; height: 100vh; position: relative; background: #000;';

        // Try to append to parent body first, then local body
        let targetDocument = document;
        if (window.parent && window.parent !== window) {
          try {
            targetDocument = window.parent.document;
            console.log('🛠️ [App] Using parent document for emergency container');
          } catch (e) {
            console.log('🛠️ [App] Cannot access parent, using local document');
          }
        }

        if (targetDocument.body) {
          targetDocument.body.appendChild(container);
          console.log('✅ [App] Emergency container created and attached');
        } else {
          console.error('🚨 [App] Cannot create emergency container - no body element found');
          return;
        }
      }

      // Check what's actually missing
      const hasAppContent = !!container.querySelector('#wm-player-contents');
      const isEmpty = container.children.length === 0;
      const hasContent = container.innerHTML.length > 0;

      console.log('🔍 [App] Recovery assessment:', {
        hasContainer: !!container,
        hasAppContent: hasAppContent,
        isEmpty: isEmpty,
        hasContent: hasContent,
        childrenCount: container.children.length,
        innerHTML: container.innerHTML.substring(0, 100) + '...',
      });

      // Only recover if container is empty OR missing app content
      if (isEmpty || !hasAppContent) {
        console.log('🚑 [App] Container needs React app recreation, calling mountReactApp...');

        // Clear any existing content first to avoid conflicts
        container.innerHTML = '';

        // Use the same mounting function from index.tsx
        // Import it dynamically to avoid circular dependencies
        const { mountReactApp } = require('./index');
        if (typeof mountReactApp === 'function') {
          mountReactApp();
          console.log('✅ [App] React app recovery initiated via mountReactApp');
        } else {
          console.error('🚨 [App] mountReactApp function not available for recovery');
        }
      } else {
        console.log('✅ [App] React app content appears to be intact, no recovery needed');
      }
    } catch (error) {
      console.error('🚨 [App] React app recovery failed with error:', error);
    }
  }

  public preloadVideo(media: VideoMediaFile) {
    // EDGE CASE FIX: Debounce guard to prevent infinite loop when same video exists in multiple playlists/montages
    // Example: M0 and M1 both contain img-124183.mp4 → rapid transition causes 459+ calls in <100ms
    const now = Date.now();
    if (this.lastPreloadCall.url === media.url && now - this.lastPreloadCall.timestamp < 100) {
      console.log('[App.preloadVideo] ⚠️ Ignoring duplicate call within 100ms:', media.filename);
      return;
    }
    this.lastPreloadCall = { url: media.url, timestamp: now };

    // CRITICAL FIX: Use the opposite slot of what's currently shown
    const videoIndex = this.state.videoShown === 1 ? 2 : 1;

    // CRITICAL FIX: Check if this video is already loaded in EITHER slot
    const existingInTargetSlot = videoIndex === 1 ? this.state.video1 : this.state.video2;
    const existingInOtherSlot = videoIndex === 1 ? this.state.video2 : this.state.video1;

    const isSameVideoInTargetSlot =
      existingInTargetSlot &&
      (existingInTargetSlot.filename === media.filename ||
        existingInTargetSlot.artworkId === media.artworkId ||
        existingInTargetSlot.url === media.url);

    const isSameVideoInOtherSlot =
      existingInOtherSlot &&
      (existingInOtherSlot.filename === media.filename ||
        existingInOtherSlot.artworkId === media.artworkId ||
        existingInOtherSlot.url === media.url);

    if (isSameVideoInTargetSlot) {
      console.log(
        '[App.preloadVideo] ✅ Video already loaded in target slot',
        videoIndex,
        '- reusing existing instance:',
        media.filename
      );
      return;
    }

    if (isSameVideoInOtherSlot) {
      console.log(
        '[App.preloadVideo] ⚠️ Video already loaded in OTHER slot - duplicate preload call ignored:',
        media.filename
      );
      console.log(
        '[App.preloadVideo] This is likely a Sequencer duplicate call (preload + transition)'
      );
      // Don't load the same video in both slots - it wastes bandwidth and causes confusion
      return;
    }

    console.log('[App.preloadVideo] Preloading video in slot', videoIndex, 'for:', media.filename);

    // CRITICAL FIX: Reset video ready state for the slot being loaded
    if (videoIndex === 1) {
      this.video1Ready = false;
    } else {
      this.video2Ready = false;
    }

    // CRITICAL FIX: If this is the first video (no video currently shown), make it visible immediately
    const shouldShowImmediately = this.state.videoShown === 0;

    // CRITICAL FIX: Use functional state update to prevent component unmounting
    this.setState(
      (prevState: AppState) => {
        const newState: AppState = { ...prevState };

        if (videoIndex === 1) {
          newState.video1 = media;
          newState.videoPreloading = videoIndex;
          // CRITICAL: If this is the first video, show it immediately
          if (shouldShowImmediately) {
            newState.videoShown = 1;
          }
        } else {
          newState.video2 = media;
          newState.videoPreloading = videoIndex;
          // CRITICAL: If this is the first video, show it immediately
          if (shouldShowImmediately) {
            newState.videoShown = 2;
          }
        }

        return newState;
      },
      () => {
        console.log(
          '[App.preloadVideo] Video state updated for slot',
          videoIndex,
          ', Video components should now be rendered'
        );
        console.log('[App.preloadVideo] Current state:', {
          video1: this.state.video1?.filename,
          video2: this.state.video2?.filename,
          videoPreloading: this.state.videoPreloading,
          videoShown: this.state.videoShown,
          shouldShowImmediately: shouldShowImmediately,
        });
      }
    );
  }

  // CRITICAL FIX: Method to handle video ready for seek after forced DOM mounting
  public videoReadyForSeek(videoId: string) {
    console.log(`[App] Video ready for seek: ${videoId}`);

    // Update videoShown state to match the mounted video
    const videoIndex = videoId === 'video-1' ? 1 : 2;
    this.setState(prevState => ({
      ...prevState,
      videoShown: videoIndex,
    }));

    console.log(`[App] Updated videoShown to ${videoIndex} for ${videoId}`);

    // Now that video is mounted and state is updated, seek should work
    if (this.state.video1 && videoIndex === 1) {
      console.log(`[App] Video #1 is ready, seek should now work`);
    }
  }

  // CRITICAL FIX: Force first montage to load to populate video state
  private forceFirstMontageLoad() {
    console.log('[App] CRITICAL: Forcing first montage to load');

    // Check if we have a current playlist
    const currentPlaylist = Sequencer.getCurrentPlaylist();
    if (!currentPlaylist) {
      console.log('[App] No current playlist, cannot force montage load');
      return;
    }

    console.log('[App] Current playlist:', currentPlaylist.id, currentPlaylist.name);

    // Get the first montage
    const montageCount = currentPlaylist.getMontagesCount();
    if (montageCount === 0) {
      console.log('[App] No montages available in playlist');
      return;
    }

    const firstMontage = currentPlaylist.getMontage(0);
    if (!firstMontage) {
      console.log('[App] First montage not available');
      return;
    }
    console.log('[App] First montage:', firstMontage.id, firstMontage.name);

    // Get the first track from the first montage
    const tracks = firstMontage.seqs;
    if (!tracks || tracks.length === 0) {
      console.log('[App] No items available in first track');
      return;
    }

    const firstTrack = tracks[0];
    console.log('[App] First track:', firstTrack.id);

    // Get the first item from the first track
    const items = firstTrack.items;
    if (!items || items.length === 0) {
      console.log('[App] No items available in first track');
      return;
    }

    const firstItem = items[0];
    console.log('[App] First item:', firstItem.artwork_id, firstItem.artwork?.filename);

    // Create a VideoMediaFile from the first item
    if (firstItem.artwork && firstItem.artwork.type === 'VID') {
      const videoMedia = new VideoMediaFile(
        firstItem.artwork_id || 0,
        `video-${firstItem.artwork_id || 'unknown'}`, // id: string (unique identifier)
        firstItem.artwork.url,
        firstItem.artwork.codecs || '',
        firstItem.artwork.filename || 'unknown',
        firstItem.offset || 0,
        firstItem.artwork.duration || 60,
        false, // loop
        undefined, // shapes
        undefined // backgroundColor
      );

      console.log('[App] Created VideoMediaFile:', videoMedia.filename);

      // Preload the video and set pending showVideo
      // showVideo will be called when onVideoLoaded fires
      this.preloadVideo(videoMedia);
      this.pendingShowVideo = videoMedia;
      console.log('[App] CRITICAL: First montage video preloaded, waiting for onVideoLoaded');
    } else {
      console.log('[App] First item is not a video:', firstItem.artwork?.type);
    }
  }

  public showVideo(media: VideoMediaFile) {
    // CRITICAL SAFETY CHECK: Don't call showVideo for image-only playlists
    const hasVideosInPlaylist = (window as any).WM_HAS_VIDEOS !== false;
    if (!hasVideosInPlaylist) {
      console.log(
        '[App.showVideo] 🚨 SAFETY CHECK: Refusing to show video for image-only playlist:',
        {
          filename: media.filename,
          WM_HAS_VIDEOS: (window as any).WM_HAS_VIDEOS,
          hasVideosInPlaylist,
        }
      );
      return;
    }

    // CRITICAL FIX: Check if video is already loaded in either slot
    const isVideo1Loaded = this.state.video1?.filename === media.filename;
    const isVideo2Loaded = this.state.video2?.filename === media.filename;

    // If video is already SHOWING in the current slot, just ensure it's playing
    const isVideo1Showing = this.state.videoShown === 1 && isVideo1Loaded;
    const isVideo2Showing = this.state.videoShown === 2 && isVideo2Loaded;

    if (isVideo1Showing || isVideo2Showing) {
      console.log(
        '[App.showVideo] ✅ Video already showing in current slot, ensuring playback:',
        media.filename
      );
      const currentVideoRef = isVideo1Showing ? this.video1Ref : this.video2Ref;
      const isVideoReady = isVideo1Showing ? this.video1Ready : this.video2Ready;

      if (currentVideoRef?.current) {
        console.log('[App.showVideo] Ensuring video is playing:', media.filename, {
          paused: currentVideoRef.current.paused,
          readyState: currentVideoRef.current.readyState,
          currentTime: currentVideoRef.current.currentTime,
          videoReady: isVideoReady,
        });

        // CRITICAL FIX: If video not ready yet, store as pending and wait for onVideoLoaded
        if (currentVideoRef.current.readyState === 0 && !isVideoReady) {
          console.log(
            '[App.showVideo] ⏳ Video not ready yet (readyState: 0), setting as pending:',
            media.filename
          );
          this.pendingShowVideo = media;
          return;
        }

        currentVideoRef.current.play().catch(err => {
          console.log('[App.showVideo] Play failed (expected during transitions):', err.message);
        });
      }
      return;
    }

    // If video is loaded in the OTHER slot (preloaded but not showing), SWITCH to it
    if (isVideo1Loaded && this.state.videoShown !== 1) {
      console.log(
        '[App.showVideo] 🔄 Video preloaded in slot 1, switching to show it:',
        media.filename
      );
      this.setState({ videoShown: 1, loading: false }, () => {
        if (this.video1Ref?.current) {
          // CRITICAL FIX: Unmute and set volume BEFORE playing
          const normalizedVolume = Math.max(0, Math.min(1, this.state.volume / 100));
          this.video1Ref.current.muted = false;
          this.video1Ref.current.volume = normalizedVolume;
          console.log(`[App.showVideo] Unmuted video-1, volume set to ${normalizedVolume}`);

          this.video1Ref.current.play().catch(err => {
            console.log('[App.showVideo] Play failed after switch:', err.message);
          });
        }
        // Pause and mute the other slot
        if (this.video2Ref?.current) {
          this.video2Ref.current.pause();
          this.video2Ref.current.muted = true;
          this.video2Ref.current.volume = 0;
        }
      });
      return;
    }

    if (isVideo2Loaded && this.state.videoShown !== 2) {
      console.log(
        '[App.showVideo] 🔄 Video preloaded in slot 2, switching to show it:',
        media.filename
      );
      this.setState({ videoShown: 2, loading: false }, () => {
        if (this.video2Ref?.current) {
          // CRITICAL FIX: Unmute and set volume BEFORE playing
          const normalizedVolume = Math.max(0, Math.min(1, this.state.volume / 100));
          this.video2Ref.current.muted = false;
          this.video2Ref.current.volume = normalizedVolume;
          console.log(`[App.showVideo] Unmuted video-2, volume set to ${normalizedVolume}`);

          this.video2Ref.current.play().catch(err => {
            console.log('[App.showVideo] Play failed after switch:', err.message);
          });
        }
        // Pause and mute the other slot
        if (this.video1Ref?.current) {
          this.video1Ref.current.pause();
          this.video1Ref.current.muted = true;
          this.video1Ref.current.volume = 0;
        }
      });
      return;
    }

    if (!this.state.videoPreloading) {
      this.preloadVideo(media);
      setTimeout(() => this.showVideo(media), 20);
      return;
    }

    LogHelper.log('App.showVideo', 'Show: ' + media.filename);

    // Log montage info when showing new video
    this.logMontageInfo();

    // 🔍 DIAGNOSTIC BREAKPOINT 1: Entry to showVideo
    console.log('🔍 [DIAGNOSTIC-1] showVideo() ENTRY:', {
      timestamp: new Date().toISOString(),
      newMedia: media.filename,
      artworkId: media.artworkId,
      videoPreloading: this.state.videoPreloading,
      videoShown: this.state.videoShown,
      currentVideo1: this.state.video1?.filename || 'undefined',
      currentVideo2: this.state.video2?.filename || 'undefined',
      stackTrace: new Error().stack?.split('\n').slice(1, 4).join('\n'),
    });

    console.log('[App.showVideo] 🔍 SWITCHING LOGIC:', {
      videoPreloading: this.state.videoPreloading,
      currentVideo1: this.state.video1?.filename,
      currentVideo2: this.state.video2?.filename,
      newMedia: media.filename,
    });

    if (this.state.videoPreloading === 1) {
      if (!this.video1Ref) {
        setTimeout(() => this.showVideo(media), 20);
        return;
      }
      console.log('[App.showVideo] Showing video in slot 1:', media.filename);

      // Show loading spinner during video transition
      console.log('🔄 [SPINNER-DEBUG] Turning spinner ON (video slot)');
      this.setState({ loading: true });

      // CRITICAL FIX: Pause video2 before switching to video1 to prevent simultaneous playback
      // Only pause if video2 has media loaded
      if (this.video2Ref?.current && this.state.video2) {
        this.video2Ref.current.pause();
        console.log('[App.showVideo] Paused video2 to prevent simultaneous playback');
      }

      // CRITICAL FIX: Keep existing video1 instance to prevent unmount/remount
      // Only update if it's a different video
      const shouldUpdateVideo1 =
        !this.state.video1 || this.state.video1.filename !== media.filename;

      // CRITICAL FIX: Only call setState if something actually needs to change
      // If video1 already has this video AND videoShown is already 1, skip setState
      const alreadyShowing = this.state.videoShown === 1 && !shouldUpdateVideo1;

      if (alreadyShowing) {
        console.log(
          '[App.showVideo] ✅ Video already showing in slot 1, skipping setState to prevent unmount:',
          media.filename
        );
        // Video is already playing - just ensure it's not paused
        setTimeout(() => {
          if (this.video1Ref.current) {
            this.video1Ref.current.volume = Math.max(0, Math.min(1, this.state.volume / 100));
            if (this.video1Ref.current.paused) {
              this.video1Ref.current.play();
            }
          }
        }, 100);
      } else {
        // 🔍 DIAGNOSTIC BREAKPOINT 2: Before setState for slot 1
        console.log('🔍 [DIAGNOSTIC-2] BEFORE setState for SLOT 1:', {
          timestamp: new Date().toISOString(),
          shouldUpdateVideo1,
          newMedia: media.filename,
          preservedVideo2: this.state.video2?.filename || 'undefined',
          stateBeforeChange: {
            video1: this.state.video1?.filename || 'undefined',
            video2: this.state.video2?.filename || 'undefined',
            videoShown: this.state.videoShown,
          },
        });

        // CRITICAL FIX: Don't clear hidden slot immediately - it causes fragment abort errors
        // Keep the previous video in the hidden slot until it's naturally replaced
        // This prevents browser from aborting ongoing fragment requests for still-playing video
        this.setState((state: AppState) => {
          // 🔍 DIAGNOSTIC BREAKPOINT 3: Inside setState for slot 1
          console.log('🔍 [DIAGNOSTIC-3] INSIDE setState for SLOT 1:', {
            timestamp: new Date().toISOString(),
            newVideo1: shouldUpdateVideo1 ? media.filename : state.video1?.filename || 'undefined',
            preservedVideo2: state.video2?.filename || 'undefined',
          });

          return {
            ...state,
            videoShown: 1,
            video1: shouldUpdateVideo1 ? media : state.video1, // Preserve instance if same video
            video2: state.video2, // Keep existing video in hidden slot to prevent fragment aborts
            imageShown: 0,
            videoPreloading: 0,
          };
        });
        setTimeout(() => {
          // 🔍 DIAGNOSTIC BREAKPOINT 4: After setState for slot 1
          console.log('🔍 [DIAGNOSTIC-4] AFTER setState for SLOT 1 (in timeout):', {
            timestamp: new Date().toISOString(),
            stateAfterChange: {
              video1: this.state.video1?.filename || 'undefined',
              video2: this.state.video2?.filename || 'undefined',
              videoShown: this.state.videoShown,
            },
          });

          if (this.video1Ref.current) {
            this.video1Ref.current.volume = Math.max(0, Math.min(1, this.state.volume / 100));
            this.video1Ref.current.play();
          }
        }, 100); // Slight delay to let React commit changes
      }
    } else {
      console.log('[App.showVideo] Showing video in slot 2:', media.filename);

      // Show loading spinner during video transition
      console.log('🔄 [SPINNER-DEBUG] Turning spinner ON (video slot)');
      this.setState({ loading: true });

      // CRITICAL FIX: Pause video1 before switching to video2 to prevent simultaneous playback
      // Only pause if video1 has media loaded
      if (this.video1Ref?.current && this.state.video1) {
        this.video1Ref.current.pause();
        console.log('[App.showVideo] Paused video1 to prevent simultaneous playback');
      }

      // CRITICAL FIX: Keep existing video2 instance to prevent unmount/remount
      // Only update if it's a different video
      const shouldUpdateVideo2 =
        !this.state.video2 || this.state.video2.filename !== media.filename;

      // CRITICAL FIX: Only call setState if something actually needs to change
      // If video2 already has this video AND videoShown is already 2, skip setState
      const alreadyShowing = this.state.videoShown === 2 && !shouldUpdateVideo2;

      if (alreadyShowing) {
        console.log(
          '[App.showVideo] ✅ Video already showing in slot 2, skipping setState to prevent unmount:',
          media.filename
        );
        // Video is already playing - just ensure it's not paused
        setTimeout(() => {
          if (this.video2Ref.current) {
            this.video2Ref.current.volume = Math.max(0, Math.min(1, this.state.volume / 100));
            if (this.video2Ref.current.paused) {
              this.video2Ref.current.play();
            }
          }
        }, 100);
      } else {
        // 🔍 DIAGNOSTIC BREAKPOINT 5: Before setState for slot 2
        console.log('🔍 [DIAGNOSTIC-5] BEFORE setState for SLOT 2:', {
          timestamp: new Date().toISOString(),
          shouldUpdateVideo2,
          newMedia: media.filename,
          preservedVideo1: this.state.video1?.filename || 'undefined',
          stateBeforeChange: {
            video1: this.state.video1?.filename || 'undefined',
            video2: this.state.video2?.filename || 'undefined',
            videoShown: this.state.videoShown,
          },
        });

        // CRITICAL FIX: Don't clear hidden slot immediately - it causes fragment abort errors
        // Keep the previous video in the hidden slot until it's naturally replaced
        // This prevents browser from aborting ongoing fragment requests for still-playing video
        this.setState((state: AppState) => {
          // 🔍 DIAGNOSTIC BREAKPOINT 6: Inside setState for slot 2
          console.log('🔍 [DIAGNOSTIC-6] INSIDE setState for SLOT 2:', {
            timestamp: new Date().toISOString(),
            preservedVideo1: state.video1?.filename || 'undefined',
            newVideo2: shouldUpdateVideo2 ? media.filename : state.video2?.filename || 'undefined',
          });

          return {
            ...state,
            videoShown: 2,
            video2: shouldUpdateVideo2 ? media : state.video2, // Preserve instance if same video
            video1: state.video1, // Keep existing video in hidden slot to prevent fragment aborts
            imageShown: 0,
            videoPreloading: 0,
          };
        });
        setTimeout(() => {
          // 🔍 DIAGNOSTIC BREAKPOINT 7: After setState for slot 2
          console.log('🔍 [DIAGNOSTIC-7] AFTER setState for SLOT 2 (in timeout):', {
            timestamp: new Date().toISOString(),
            stateAfterChange: {
              video1: this.state.video1?.filename || 'undefined',
              video2: this.state.video2?.filename || 'undefined',
              videoShown: this.state.videoShown,
            },
          });

          if (this.video2Ref.current) {
            this.video2Ref.current.volume = Math.max(0, Math.min(1, this.state.volume / 100));
            this.video2Ref.current.play();
          }
        }, 100); // Slight delay to let React commit changes
      }
    }
    this.makeOpeningTransition();
  }

  private retryVideoPlay(videoElement: HTMLVideoElement, media: VideoMediaFile) {
    this.videoPlayRetryCount++;
    if (this.videoPlayRetryCount > this.MAX_VIDEO_PLAY_RETRIES) {
      console.error('[App] MAX VIDEO PLAY RETRIES REACHED - video will not play');
      this.videoPlayRetryCount = 0;
      return;
    }

    console.log(
      `[App] Retrying video play (attempt ${this.videoPlayRetryCount}/${this.MAX_VIDEO_PLAY_RETRIES})`
    );

    setTimeout(() => {
      if (videoElement && videoElement.readyState >= 1) {
        // 🚨 CRITICAL FIX: Check loading lock to prevent AbortError
        if (WallmusePlayer.isVideoLoading) {
          console.log(
            '[App] 🚨 Video loading lock active during persistent retry, skipping play() to prevent AbortError'
          );
          return;
        }

        videoElement.volume = Math.max(0, Math.min(1, this.state.volume / 100));
        const playPromise = videoElement.play();

        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log('[App] Video play() succeeded (persistent retry)');
              this.videoPlayRetryCount = 0; // Reset retry count on success
              if (window.onWebPlayerReady) {
                console.log(
                  '[App] Signaling parent that video is ready and playing (persistent retry)'
                );
                window.onWebPlayerReady();
              }
            })
            .catch(error => {
              console.error('[App] Video play() failed (persistent retry):', error);
              this.retryVideoPlay(videoElement, media);
            });
        } else {
          console.log(
            '[App] Video still not ready after retry, readyState:',
            videoElement?.readyState
          );
          this.retryVideoPlay(videoElement, media);
        }
      }
    }, 100); // Faster retry delay for quicker video loading
  }

  public prepareForNextMedia() {
    // LogHelper.log('App', 'prepareForNextMedia()');
    this.lastFadeChangeTime = Date.now();
    this.setState(state => {
      return { ...state, fadeClass: 'fadeinout out' };
    });
  }

  public makeOpeningTransition() {
    // LogHelper.log('App', 'makeOpeningTransition');
    this.lastFadeChangeTime = Date.now();
    this.setState(state => {
      return { ...state, fadeClass: 'fadeinout' };
    });
  }

  // Track playback time for TIME display
  public startPlaybackTimer() {
    this.playbackStartTime = Date.now();
    this.isPlaybackPaused = false;
    console.log('[App] Playback timer started');
  }

  public pausePlaybackTimer() {
    if (!this.isPlaybackPaused) {
      this.playbackPauseTime = Date.now();
      this.isPlaybackPaused = true;
      console.log('[App] Playback timer paused');
      // CRITICAL: Actually pause the video element
      this.pause();
    }
  }

  public resumePlaybackTimer() {
    if (this.isPlaybackPaused) {
      const pauseDuration = Date.now() - this.playbackPauseTime;
      this.playbackStartTime += pauseDuration; // Adjust start time to account for pause
      this.isPlaybackPaused = false;
      console.log('[App] Playback timer resumed');
      // CRITICAL: Actually play the video element
      this.play();
    }
  }

  public getCurrentPlaybackTime(): number {
    // If timer hasn't been started, return 0
    if (this.playbackStartTime === 0) {
      return 0;
    }

    if (this.isPlaybackPaused) {
      return (this.playbackPauseTime - this.playbackStartTime) / 1000;
    } else {
      return (Date.now() - this.playbackStartTime) / 1000;
    }
  }

  private getShownVideo() {
    if (this.state.videoShown === 1) {
      return this.video1Ref.current!;
    } else if (this.state.videoShown === 2) {
      return this.video2Ref.current!;
    }
  }

  public isPlaying() {
    const video = this.getShownVideo();
    return !!(video && !video.paused && !video.ended && video.readyState > 2);
  }

  public play() {
    console.log('[App.play] ENTRY POINT:', {
      videoShown: this.state.videoShown,
      video1Ref: !!this.video1Ref.current,
      video2Ref: !!this.video2Ref.current,
      video1: this.state.video1?.filename,
      video2: this.state.video2?.filename,
    });

    const video = this.getShownVideo();
    if (video) {
      video.play().catch(error => {
        console.log('[App.play] Video play failed (normal during transitions):', error.message);
      });
    } else {
      console.warn('[App.play] WARNING: No video found to play - deferring play operation!', {
        videoShown: this.state.videoShown,
        video1Ref: !!this.video1Ref.current,
        video2Ref: !!this.video2Ref.current,
        video1: this.state.video1?.filename,
        video2: this.state.video2?.filename,
      });

      // CRITICAL FIX: Defer play operation until videos are ready
      console.log('[App.play] 🔄 DEFERRING play operation until videos are loaded');
      setTimeout(() => {
        console.log('[App.play] 🔄 RETRYING deferred play operation');
        const retryVideo = this.getShownVideo();
        if (retryVideo) {
          retryVideo.play().catch(error => {
            console.log('[App.play] Deferred video play failed:', error.message);
          });
        } else {
          console.warn(
            '[App.play] 🚨 DEFERRED play failed - still no videos available after delay'
          );
        }
      }, 500); // Wait 500ms for videos to load
    }
  }

  public pause() {
    this.getShownVideo()?.pause();
  }

  public stop() {
    const video = this.getShownVideo();
    if (video) {
      video.pause();
      video.currentTime = 0;
    }
    this.makeOpeningTransition();
  }

  public setVolume(v: number) {
    console.log('App.setVolume: ' + v);
    const normalizedVolume = Math.max(0, Math.min(1, v / 100));
    this.setState(state => {
      return { ...state, volume: v };
    });

    // CRITICAL FIX: Only unmute and set volume on the SHOWN video
    // Hidden videos must stay muted to prevent audio overlap
    const videoShown = this.state.videoShown;

    if (videoShown === 1 && this.video1Ref.current) {
      this.video1Ref.current.volume = normalizedVolume;
      this.video1Ref.current.muted = false;
      // Ensure video-2 is muted
      if (this.video2Ref.current) {
        this.video2Ref.current.muted = true;
        this.video2Ref.current.volume = 0;
      }
      console.log(`[App.setVolume] Applied volume ${normalizedVolume} to video-1, muted video-2`);
    } else if (videoShown === 2 && this.video2Ref.current) {
      this.video2Ref.current.volume = normalizedVolume;
      this.video2Ref.current.muted = false;
      // Ensure video-1 is muted
      if (this.video1Ref.current) {
        this.video1Ref.current.muted = true;
        this.video1Ref.current.volume = 0;
      }
      console.log(`[App.setVolume] Applied volume ${normalizedVolume} to video-2, muted video-1`);
    } else {
      console.log(
        `[App.setVolume] No active video (videoShown=${videoShown}), will apply when video loads`
      );
    }
  }

  public resetVideoElements(callback?: () => void) {
    if (!this._isMounted) {
      console.log('[App] Component not mounted, skipping reset');
      return;
    }

    console.log('[App] Resetting ALL media state for playlist transition');

    // CRITICAL FIX: Set playlist changing flag to prevent false recovery during transition
    this.isPlaylistChanging = true;

    // CRITICAL FIX: Clear any pending operations from previous playlist to prevent contamination
    if (window.PENDING_APP_OPERATIONS && window.PENDING_APP_OPERATIONS.length > 0) {
      console.log(
        '[App] 🚨 CLEARING',
        window.PENDING_APP_OPERATIONS.length,
        'pending operations from previous playlist:',
        window.PENDING_APP_OPERATIONS.map(op => op.type)
      );
      window.PENDING_APP_OPERATIONS = [];
    }

    // Reset debounce state when playlist changes
    this.lastShowVideoCall = null;

    // CRITICAL FIX: Clear ALL state on playlist change - let new playlist data drive what gets rendered
    // This fixes the issue where old playlist state prevents new playlist from displaying properly
    console.log(
      '[App] Clearing ALL media state - old playlist state can prevent new playlist display'
    );

    this.setState(
      {
        // Clear ALL image state
        image1: undefined,
        image2: undefined,
        imageShown: 0,
        imagePreloading: 0,
        // Clear ALL video state - this was the missing piece!
        video1: undefined,
        video2: undefined,
        videoShown: 0,
        videoPreloading: 0,
      },
      () => {
        console.log('[App] ✅ ALL media state cleared for playlist transition:', {
          imageShown: this.state.imageShown,
          videoShown: this.state.videoShown,
          image1: this.state.image1,
          video1: this.state.video1,
        });

        // CRITICAL FIX: Clear playlist changing flag after transition completes
        setTimeout(() => {
          this.isPlaylistChanging = false;
          console.log('[App] ✅ Playlist transition completed - recovery checks re-enabled');
        }, 2000); // Wait 2 seconds for transition to fully complete

        if (callback) {
          console.log('[App] Executing resetVideoElements callback');
          callback();
        }
      }
    );
  }

  /**
   * Reset debounce state when playlist changes
   * This should be called when the parent remounts after a playlist change
   */
  public resetShowVideoDebounce() {
    this.lastShowVideoCall = null;
    LogHelper.log('App.resetShowVideoDebounce', 'Reset showVideo debounce state');
  }

  /**
   * Clear the last show video call to allow immediate re-showing of the same video
   */
  public clearLastShowVideoCall() {
    this.lastShowVideoCall = null;
    LogHelper.log('App.clearLastShowVideoCall', 'Cleared last show video call');
  }

  /**
   * Clear image state for playlist switching
   */
  public clearImageState() {
    console.log('[App.clearImageState] Clearing image state for playlist switch');
    this.setState({
      imageShown: 0,
      image1: undefined,
      image2: undefined,
      imagePreloading: 0,
    });
  }

  /**
   * Clear video state for playlist switching
   */
  public clearVideoState() {
    console.log('[App.clearVideoState] Clearing video state for playlist switch');
    this.setState({
      videoShown: 0,
      video1: undefined,
      video2: undefined,
      videoPreloading: 0,
    });
  }

  /**
   * Clear all media state for playlist switching
   */
  public clearAllMediaState() {
    console.log('[App.clearAllMediaState] Clearing all media state for playlist switch');
    this.setState({
      imageShown: 0,
      image1: undefined,
      image2: undefined,
      imagePreloading: 0,
      videoShown: 0,
      video1: undefined,
      video2: undefined,
      videoPreloading: 0,
    });
  }

  /**
   * NB: time in seconds
   */
  public seek(time: number) {
    console.log('[App.seek] ENTRY POINT:', {
      time: time,
      videoShown: this.state.videoShown,
      video1Ref: !!this.video1Ref.current,
      video2Ref: !!this.video2Ref.current,
      video1: this.state.video1?.filename,
      video2: this.state.video2?.filename,
    });

    // CRITICAL FIX: Don't seek on image playlists
    const hasImagesInPlaylist = (window as any).WM_HAS_IMAGES === true;
    if (hasImagesInPlaylist) {
      console.log('[App.seek] 🚨 SKIPPING seek operation - this is an image playlist');
      return;
    }

    // Clamp time to valid range
    let clampedTime = Math.max(0, Number.isFinite(time) ? time : 0);

    // CRITICAL FIX: Find video by filename instead of relying on videoShown state
    // This fixes the timing issue where seek happens before videoShown is updated
    let video: HTMLVideoElement | null = null;

    // Check if video1 matches and has a ref
    if (this.state.video1 && this.video1Ref.current) {
      video = this.video1Ref.current;
      console.log('[App.seek] Found video1 by filename match:', this.state.video1.filename);
    }
    // Check if video2 matches and has a ref
    else if (this.state.video2 && this.video2Ref.current) {
      video = this.video2Ref.current;
      console.log('[App.seek] Found video2 by filename match:', this.state.video2.filename);
    }
    // Fallback to getShownVideo (original logic)
    else {
      const fallbackVideo = this.getShownVideo();
      video = fallbackVideo || null;
      console.log('[App.seek] Using fallback getShownVideo method');
    }

    if (video) {
      // Bound by duration if known
      if (isFinite(video.duration) && video.duration > 0) {
        clampedTime = Math.max(0, Math.min(clampedTime, video.duration - 0.05));
      }

      // CRITICAL FIX: Only seek if video has loaded enough data
      // readyState 3 (HAVE_FUTURE_DATA) is required for safe seeking with MSE
      // readyState 1 (HAVE_METADATA) is NOT enough - causes MediaSource to enter 'ended' state
      if (video.readyState < 3) {
        console.log(
          '[App.seek] Video not ready for seek, waiting for enough data. ReadyState:',
          video.readyState
        );
        // Wait for canplay event (readyState 3+) before seeking
        const seekWhenReady = () => {
          console.log(
            '[App.seek] Video ready (readyState:',
            video!.readyState,
            '), now seeking to:',
            clampedTime
          );
          video!.currentTime = clampedTime;
          video!.removeEventListener('canplay', seekWhenReady);
        };
        video.addEventListener('canplay', seekWhenReady, { once: true });
        return;
      }

      console.log(
        '[App.seek] Video found (readyState:',
        video.readyState,
        '), setting currentTime to:',
        clampedTime
      );
      video.currentTime = clampedTime;

      // CRITICAL FIX: Only call video.play() for actual video files, not images
      const currentMedia = this.state.video1 || this.state.video2;
      const isVideoFile =
        currentMedia &&
        currentMedia.filename &&
        (currentMedia.filename.toLowerCase().endsWith('.mp4') ||
          currentMedia.filename.toLowerCase().endsWith('.avi') ||
          currentMedia.filename.toLowerCase().endsWith('.mov') ||
          currentMedia.filename.toLowerCase().endsWith('.webm'));

      // Guard: Skip play if playlist is image-only to avoid AbortError
      const hasVideosInPlaylist = (window as any).WM_HAS_VIDEOS !== false; // default true unless explicitly false
      if (!hasVideosInPlaylist) {
        console.log('[App.seek] Skipping video.play() because current playlist has no videos');
        return;
      }

      if (isVideoFile) {
        console.log(
          '[App.seek] Calling video.play() after seek for video file:',
          currentMedia.filename
        );
        video
          .play()
          .then(() => {
            console.log('[App.seek] Video play() succeeded after seek');
          })
          .catch(error => {
            console.warn(
              '[App.seek] Video play() failed after seek (expected during playlist changes):',
              error
            );
          });
      } else {
        console.log('[App.seek] Skipping video.play() for non-video file:', currentMedia?.filename);
      }
    } else {
      // PRODUCTION: Reduced seek warning verbosity - defer quietly
      // console.warn('[App.seek] WARNING: No video found to seek - deferring seek operation!');

      // CRITICAL FIX: Single retry attempt to prevent hiccups
      setTimeout(() => {
        // Only retry if we now have videos available
        if (
          (this.state.video1 && this.video1Ref.current) ||
          (this.state.video2 && this.video2Ref.current) ||
          this.getShownVideo()
        ) {
          this.seek(clampedTime);
        } else {
          console.log('[App.seek] ℹ️ Seek skipped - videos not ready');
        }
      }, 100); // Reduced delay for smoother flow
    }
  }

  // Add method to force re-render when playlist content types change
  public forcePlaylistContentTypeRerender() {
    if (!this._isMounted) {
      console.log('[App] Cannot force playlist content type re-render - component not mounted');
      return;
    }

    // 🔍 DIAGNOSTIC BREAKPOINT 8: Before force re-render
    console.log('🔍 [DIAGNOSTIC-8] forcePlaylistContentTypeRerender() CALLED:', {
      timestamp: new Date().toISOString(),
      currentState: {
        video1: this.state.video1?.filename || 'undefined',
        video2: this.state.video2?.filename || 'undefined',
        videoShown: this.state.videoShown,
      },
      stackTrace: new Error().stack?.split('\n').slice(1, 5).join('\n'),
    });

    console.log('[App] Forcing re-render for playlist content type change');
    this.forceReactRerender();

    // 🔍 DIAGNOSTIC BREAKPOINT 9: After force re-render (async check)
    setTimeout(() => {
      console.log('🔍 [DIAGNOSTIC-9] AFTER forcePlaylistContentTypeRerender():', {
        timestamp: new Date().toISOString(),
        currentState: {
          video1: this.state.video1?.filename || 'undefined',
          video2: this.state.video2?.filename || 'undefined',
          videoShown: this.state.videoShown,
        },
      });
    }, 50);
  }

  // Add method to force re-initialization if needed
  public forceReinitialization() {
    if (!this._isMounted) {
      console.log('[App] Cannot reinitialize - component not mounted');
      return;
    }

    console.log('[App] Forcing reinitialization');

    // FIXED: Work WITH the container, not against it
    // Preserve #root-wm-player and only clear React state/content
    console.log('[App] Preserving root-wm-player container, clearing only React state');

    // Clear all state to allow fresh start
    this.setState(
      {
        image1: undefined,
        image2: undefined,
        imageShown: 0,
        imagePreloading: 0,
        video1: undefined,
        video2: undefined,
        videoShown: 0,
        videoPreloading: 0,
      },
      () => {
        console.log('[App] State cleared, container preserved - ready for fresh content');

        // FIXED: No need to wait for container remounting - container is stable
        this.waitForJSContainerReady();
      }
    );
  }

  // CRITICAL FIX: Emergency DOM sync method to fix React/DOM desynchronization
  public forceDOMSync() {
    console.log('[App] REACT-NATIVE: Forcing React re-render to fix component state');

    // Simple React-native approach: just force a re-render
    this.setState(
      (prevState: AppState) => ({
        renderKey: (prevState.renderKey || 0) + 1,
      }),
      () => {
        console.log('[App] REACT-NATIVE: Re-render triggered, DOM should sync naturally');
      }
    );
  }

  // NEW METHOD: Wait for JS container to be ready after remounting
  private waitForJSContainerReady() {
    console.log('[App] Starting container readiness detection with WallmuseInit coordination');

    // CRITICAL FIX: Add timeout to prevent infinite loops
    let checkCount = 0;
    const MAX_CHECKS = 50; // Maximum 50 checks (5 seconds) before giving up
    const COORDINATION_TIMEOUT = 10000; // 10 second timeout for coordination
    let startTime = Date.now();

    // CRITICAL FIX: Integrate with WallmuseInit coordination system
    const checkContainerWithWallmuseInit = () => {
      checkCount++;

      // Check if we've exceeded the maximum checks
      if (checkCount > MAX_CHECKS) {
        console.log('[App] 🚨 MAXIMUM CONTAINER CHECKS REACHED - stopping infinite loop');
        console.log('[App] Container readiness check timed out after 5 seconds');
        console.log('[App] Proceeding with available resources to prevent app from being stuck');

        // CRITICAL FIX: Trigger video rendering pipeline even without full coordination
        this.triggerVideoRenderingPipeline();
        return;
      }

      // Check if we've exceeded the coordination timeout
      if (Date.now() - startTime > COORDINATION_TIMEOUT) {
        console.log('[App] 🚨 COORDINATION TIMEOUT REACHED - proceeding without full coordination');
        console.log('[App] Proceeding with container ready after 10 second timeout');

        // Force proceed with what we have
        this.triggerVideoRenderingPipeline();
        return;
      }

      // Check multiple possible container IDs - prioritize wm-player-contents
      const possibleContainers = [
        'root-wm-player', // Primary container (created by fallback strategy)
        'wm-player-contents', // React app content container
        'video-container',
        'player-container',
        'media-container',
      ];

      let container = null;
      let containerId = null;

      // Find which container actually exists
      for (const id of possibleContainers) {
        const found = document.getElementById(id);
        if (found) {
          container = found;
          containerId = id;
          break;
        }
      }

      // CRITICAL FIX: If no container found, only give up after max attempts
      if (!container) {
        if (checkCount >= MAX_CHECKS) {
          console.log('[App] No container found after', MAX_CHECKS, 'attempts - giving up');
          return; // Exit the loop only after max attempts
        } else {
          console.log(
            '[App] Container not found yet, will retry (attempt',
            checkCount,
            '/',
            MAX_CHECKS,
            ')'
          );
          setTimeout(checkContainerWithWallmuseInit, 100);
          return;
        }
      }

      const containerChildren = container?.children?.length || 0;
      // NEW: Consider React mounted as sufficient even if containerChildren is 0
      const reactMounted = (window as any).webplayerReady === true;

      // Check if WallmuseInit coordination is complete
      const wallmuseInit = (window as any).WallmuseInit;
      const playerReady = wallmuseInit?._playerReady || false;
      const webplayerReady =
        (window as any).webplayerReady === true || wallmuseInit?._webplayerReady || false;

      // CRITICAL DEBUG: Check all possible containers and their states
      const allContainerStates = possibleContainers.map(id => {
        const found = document.getElementById(id);
        return {
          id: id,
          exists: !!found,
          children: found?.children?.length || 0,
          display: found ? window.getComputedStyle(found).display : 'N/A',
          visibility: found ? window.getComputedStyle(found).visibility : 'N/A',
        };
      });

      console.log(
        `[App] Checking JS container readiness with WallmuseInit (attempt ${checkCount}/${MAX_CHECKS}):`,
        {
          containerFound: !!container,
          containerId: containerId,
          containerChildren: containerChildren,
          containerReady: containerChildren > 0,
          reactMounted: reactMounted,
          wallmuseInitExists: !!wallmuseInit,
          playerReady: playerReady,
          webplayerReady: webplayerReady,
          coordinationComplete: playerReady && webplayerReady,
          allContainerStates: allContainerStates,
          timeElapsed: Date.now() - startTime,
        }
      );

      // CRITICAL: Wait for container to exist AND WallmuseInit coordination (don't wait for children)
      if ((container && playerReady && webplayerReady) || (container && reactMounted)) {
        console.log(
          '[App] JS container found AND WallmuseInit coordination complete! Triggering video rendering pipeline'
        );

        // Container exists and coordination is ready, now trigger video rendering pipeline
        this.triggerVideoRenderingPipeline();
      } else {
        // Either container not found or coordination not ready yet, check again in 100ms
        // BUT only if we have a container (prevent infinite loop)
        if (container) {
          const waitTime = 100;
          console.log(
            `[App] Container found but coordination not ready yet, checking again in ${waitTime}ms (attempt ${checkCount}/${MAX_CHECKS})`
          );
          console.log(
            `[App] Waiting for: container(${!!container}) player(${playerReady}) webplayer(${webplayerReady})`
          );
          setTimeout(checkContainerWithWallmuseInit, waitTime);
        } else {
          console.log(
            '[App] No container found - stopping readiness check to prevent infinite loop'
          );
        }
      }
    };

    // Start checking for container readiness with WallmuseInit coordination
    checkContainerWithWallmuseInit();
  }

  // NEW METHOD: Extract video rendering pipeline to avoid code duplication
  private triggerVideoRenderingPipeline() {
    setTimeout(() => {
      const currentPlaylist = Sequencer.getCurrentPlaylist();
      if (currentPlaylist) {
        console.log(
          '[App] Container ready and coordination complete, triggering video rendering for playlist:',
          currentPlaylist.id
        );

        // SIGNAL SEQUENCER TO CONTINUE: Container is ready, trigger playback immediately
        console.log(
          '[App] Container ready and coordination complete - signaling sequencer to continue immediately'
        );

        // Check if sequencer is ready to continue
        if (Sequencer.isInitialized() && !Sequencer.isPlaying) {
          console.log(
            '[App] Sequencer ready, starting playback immediately (bypassing 1500ms timeout)'
          );
          Sequencer.play(0);

          // REMOVED: Complex montage forcing that was causing issues
        } else {
          console.log('[App] Sequencer not ready yet, waiting for natural flow to continue');
        }
      }
    }, 100);
  }

  // DEBUG: Add test method to manually show a video
  public testShowVideo() {
    console.log('[App] TEST: Manually calling showVideo with test media');

    // Create a test video media file with required parameters
    const testMedia = new VideoMediaFile(
      999, // artworkId
      'test-id', // id
      'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4', // url
      'avc1.42C028, mp4a.40.2', // codecs
      'test-video.mp4', // filename
      10, // offset
      10, // duration
      false, // loop
      undefined, // shapes
      undefined // backgroundColor
    );

    console.log('[App] TEST: Created test media:', testMedia);
    this.showVideo(testMedia);
  }

  componentDidMount() {
    this._isMounted = true;
    console.log('🔍 [App] COMPONENT MOUNTING', { timestamp: Date.now(), state: this.state });
    // Proper state management for loading - no more direct state mutation
    setTimeout(() => {
      console.log('🔄 [SPINNER-DEBUG] Turning spinner OFF (componentDidMount timeout)');
      this.setState({ loading: false });
    }, 500);

    // CRITICAL DEBUG: Track DOM mutations to catch what's clearing the container
    this.setupDOMMutationObserver();

    // CRITICAL DEBUG: Track React root status
    this.setupReactRootMonitor();

    // CRITICAL DEBUG: Log initial state to understand why no content shows
    console.log('[App] 🚨 CRITICAL DEBUG: Initial state analysis:', {
      loading: this.state.loading,
      imageShown: this.state.imageShown,
      videoShown: this.state.videoShown,
      image1: this.state.image1?.filename,
      image2: this.state.image2?.filename,
      video1: this.state.video1?.filename,
      video2: this.state.video2?.filename,
      canWork: !!(window.MediaSource || (window as any).ManagedMediaSource),
    });

    // CRITICAL: Expose videoReadyForSeek method globally for Video components
    (window as any).TheApp = this;
    console.log('[App] Exposed TheApp globally with videoReadyForSeek method');

    // CRITICAL: Add global play command handler for debugging
    (window as any).debugPlayCommand = () => {
      console.log('[App] DEBUG PLAY COMMAND: Manual play command received');
      console.log('[App] Current video state:', {
        videoShown: this.state.videoShown,
        video1: this.state.video1?.filename,
        video2: this.state.video2?.filename,
      });

      // Check if any video elements exist and their state
      const video1 = document.getElementById('video-1') as HTMLVideoElement;
      const video2 = document.getElementById('video-2') as HTMLVideoElement;

      if (video1) {
        console.log('[App] Video #1 state:', {
          readyState: video1.readyState,
          paused: video1.paused,
          ended: video1.ended,
          currentTime: video1.currentTime,
          duration: video1.duration,
        });

        // Try to play video 1
        video1
          .play()
          .then(() => {
            console.log('[App] SUCCESS: Video #1 play() succeeded');
          })
          .catch(e => {
            console.error('[App] ERROR: Video #1 play() failed:', e);
          });
      }

      if (video2) {
        console.log('[App] Video #2 state:', {
          readyState: video2.readyState,
          paused: video2.paused,
          ended: video2.ended,
          currentTime: video2.currentTime,
          duration: video2.duration,
        });
      }
    };

    // Simple debug function to check sequencer status
    (window as any).checkSequencer = () => {
      console.log('🔍 [SIMPLE DEBUG] Checking sequencer status...');
      try {
        const { Sequencer } = require('./manager/Sequencer');
        const { ItemPlayer } = require('./manager/ItemPlayer');

        console.log('Sequencer status:', Sequencer.getStatus());
        console.log('Is playing:', Sequencer.isPlaying());
        console.log('Has runner:', !!(Sequencer as any).runner);

        const player = ItemPlayer.ThePlayer;
        if (player) {
          const pos = player.getPosition();
          console.log(
            'Current position:',
            pos
              ? {
                  montage: pos.getMontageIndex(),
                  track: pos.getTrackIndex(),
                  item: pos.getItemIndex(),
                }
              : 'null'
          );
        } else {
          console.log('No player available');
        }
      } catch (error) {
        console.error('Error checking sequencer:', error);
      }
    };

    // Force start the sequencer if it's stuck
    (window as any).startSequencer = () => {
      console.log('🚀 [FORCE START] Starting sequencer...');
      try {
        const { Sequencer } = require('./manager/Sequencer');

        if (Sequencer.isStopped()) {
          console.log('Sequencer is stopped, starting playback...');
          Sequencer.play();
        } else if (Sequencer.isPaused()) {
          console.log('Sequencer is paused, resuming...');
          Sequencer.play();
        } else {
          console.log('Sequencer is already running');
        }

        // Check status after starting
        setTimeout(() => {
          console.log('Status after start:', Sequencer.getStatus());
          console.log('Has runner:', !!(Sequencer as any).runner);
        }, 1000);
      } catch (error) {
        console.error('Error starting sequencer:', error);
      }
    };

    // Test UI commands
    (window as any).testUIPlay = () => {
      console.log('🎮 [TEST] Testing UI play command');
      try {
        Sequencer.play();
        console.log('Sequencer.play() called successfully');
      } catch (error) {
        console.error('Error in testUIPlay:', error);
      }
    };

    (window as any).testUIPause = () => {
      console.log('🎮 [TEST] Testing UI pause command');
      try {
        Sequencer.pause();
        console.log('Sequencer.pause() called successfully');
      } catch (error) {
        console.error('Error in testUIPause:', error);
      }
    };

    // Test assumeNewPlaylist for default playlist
    (window as any).testDefaultPlaylist = () => {
      console.log('🔧 [TEST] Testing default playlist initialization...');
      try {
        console.log('Available montages:', Object.keys(Montages).length);
        Sequencer.assumeNewPlaylist(); // Call with undefined for default playlist
        console.log('assumeNewPlaylist() called successfully');

        setTimeout(() => {
          console.log('Position after assumeNewPlaylist:', Sequencer.getCurrentPosition());
        }, 500);
      } catch (error) {
        console.error('Error in testDefaultPlaylist:', error);
      }
    };

    // Debug video playback status
    (window as any).debugVideoPlayback = () => {
      console.log('🎬 [VIDEO DEBUG] Checking video playback status...');

      const video1 = this.video1Ref.current;
      const video2 = this.video2Ref.current;

      console.log(
        'Video 1 (slot 1):',
        video1
          ? {
              readyState: video1.readyState,
              paused: video1.paused,
              ended: video1.ended,
              currentTime: video1.currentTime,
              duration: video1.duration,
              hidden: video1.hidden,
              display: window.getComputedStyle(video1).display,
              src: video1.src,
              networkState: video1.networkState,
              error: video1.error,
            }
          : 'null'
      );

      console.log(
        'Video 2 (slot 2):',
        video2
          ? {
              readyState: video2.readyState,
              paused: video2.paused,
              ended: video2.ended,
              currentTime: video2.currentTime,
              duration: video2.duration,
              hidden: video2.hidden,
              display: window.getComputedStyle(video2).display,
              src: video2.src,
              networkState: video2.networkState,
              error: video2.error,
            }
          : 'null'
      );

      console.log('App state:', {
        videoShown: this.state.videoShown,
        video1: this.state.video1?.filename,
        video2: this.state.video2?.filename,
        video1Url: this.state.video1?.url,
        video2Url: this.state.video2?.url,
      });

      // Check if video is actually playing
      const activeVideo = this.state.videoShown === 1 ? video1 : video2;
      if (activeVideo) {
        console.log('Active video playback:', {
          currentTime: activeVideo.currentTime,
          duration: activeVideo.duration,
          paused: activeVideo.paused,
          readyState: activeVideo.readyState,
          playbackRate: activeVideo.playbackRate,
          volume: activeVideo.volume,
          networkState: activeVideo.networkState,
          error: activeVideo.error,
        });

        // Try to force play if it's not playing
        if (activeVideo.paused && activeVideo.readyState >= 1) {
          console.log('Attempting to force play video...');
          activeVideo
            .play()
            .then(() => {
              console.log('✅ Force play successful');
            })
            .catch(e => {
              console.error('❌ Force play failed:', e);
            });
        }

        // Check network state and try to reload if needed
        if (activeVideo.networkState === 3) {
          // NETWORK_NO_SOURCE
          console.log('🔄 Video has no source, attempting to reload...');
          const currentSrc = activeVideo.src;
          activeVideo.src = '';
          activeVideo.load();
          setTimeout(() => {
            activeVideo.src = currentSrc;
            activeVideo.load();
            console.log('🔄 Video reloaded with src:', currentSrc);
          }, 100);
        }
      }
    };

    // Force reload video to fix loading issues
    (window as any).forceReloadVideo = () => {
      console.log('🔄 [FORCE RELOAD] Reloading video elements...');

      const video1 = this.video1Ref.current;
      const video2 = this.video2Ref.current;

      if (video1) {
        const src1 = video1.src;
        console.log('Reloading video1 with src:', src1);
        video1.src = '';
        video1.load();
        setTimeout(() => {
          video1.src = src1;
          video1.load();
          console.log('Video1 reloaded');
        }, 100);
      }

      if (video2) {
        const src2 = video2.src;
        console.log('Reloading video2 with src:', src2);
        video2.src = '';
        video2.load();
        setTimeout(() => {
          video2.src = src2;
          video2.load();
          console.log('Video2 reloaded');
        }, 100);
      }
    };

    // 🚨 CRITICAL DEBUG: Manual DOM inspection function for CSS/DOM issues
    (window as any).debugVideoVisibility = () => {
      console.log('🚨 [MANUAL DEBUG] Video visibility debugging...');

      const video1Element = document.getElementById('video-1');
      const video2Element = document.getElementById('video-2');
      const rootElement = document.getElementById('wm-player-contents');

      console.log('🚨 [MANUAL DEBUG] DOM elements found:', {
        video1: !!video1Element,
        video2: !!video2Element,
        root: !!rootElement,
      });

      if (video1Element) {
        const computedStyle = window.getComputedStyle(video1Element);
        console.log('🚨 [MANUAL DEBUG] Video1 computed styles:', {
          display: computedStyle.display,
          visibility: computedStyle.visibility,
          opacity: computedStyle.opacity,
          position: computedStyle.position,
          zIndex: computedStyle.zIndex,
          width: computedStyle.width,
          height: computedStyle.height,
          top: computedStyle.top,
          left: computedStyle.left,
        });

        console.log('🚨 [MANUAL DEBUG] Video1 dimensions:', {
          offsetWidth: video1Element.offsetWidth,
          offsetHeight: video1Element.offsetHeight,
          clientWidth: video1Element.clientWidth,
          clientHeight: video1Element.clientHeight,
          scrollWidth: video1Element.scrollWidth,
          scrollHeight: video1Element.scrollHeight,
        });
      }

      if (rootElement) {
        console.log(
          '🚨 [MANUAL DEBUG] Root container HTML:',
          rootElement.innerHTML.substring(0, 500)
        );
      }
    };

    // 🚨 CRITICAL DEBUG: Quick DOM state check function
    (window as any).checkDOMState = () => {
      console.log('🚨 [QUICK CHECK] DOM state check...');

      const rootElement = document.getElementById('wm-player-contents');
      if (rootElement) {
        console.log('🚨 [QUICK CHECK] Root element found:', {
          childElementCount: rootElement.childElementCount,
          innerHTMLLength: rootElement.innerHTML.length,
          hasChildren: rootElement.children.length > 0,
          firstChild: rootElement.firstChild?.nodeType,
          firstElementChild: rootElement.firstElementChild?.tagName,
        });

        // Check if React root is present
        const reactRoot =
          rootElement.querySelector('[data-reactroot]') ||
          rootElement.querySelector('[data-reactroot]');
        console.log('🚨 [QUICK CHECK] React root found:', !!reactRoot);

        // Check for video elements
        const video1 = document.getElementById('video-1');
        const video2 = document.getElementById('video-2');
        console.log('🚨 [QUICK CHECK] Video elements:', {
          video1Exists: !!video1,
          video2Exists: !!video2,
          video1Visible: video1 ? !video1.hidden && video1.style.display !== 'none' : false,
          video2Visible: video2 ? !video2.hidden && video2.style.display !== 'none' : false,
        });
      } else {
        console.log('🚨 [QUICK CHECK] Root element NOT FOUND');
      }
    };

    // 🔍 COMPREHENSIVE STATE TRACKING - Call this to see everything at once
    (window as any).debugPlayerState = () => {
      const { Sequencer } = require('./manager/Sequencer');
      const { ItemPlayer } = require('./manager/ItemPlayer');
      const { ThePlaylist } = require('./manager/Globals');

      console.log('═══════════════════════════════════════════════════');
      console.log('🔍 COMPREHENSIVE PLAYER STATE DEBUG');
      console.log('═══════════════════════════════════════════════════');

      // App state
      console.log('\n📺 APP STATE:');
      console.log({
        videoShown: this.state.videoShown,
        video1Media: this.state.video1?.filename || 'undefined',
        video2Media: this.state.video2?.filename || 'undefined',
        imageShown: this.state.imageShown,
        videoPreloading: this.state.videoPreloading,
        fadeClass: this.state.fadeClass,
      });

      // Video elements
      console.log('\n🎬 VIDEO ELEMENTS:');
      const v1 = this.video1Ref?.current;
      const v2 = this.video2Ref?.current;
      console.log(
        'Video1:',
        v1
          ? {
              exists: true,
              paused: v1.paused,
              currentTime: v1.currentTime.toFixed(2),
              duration: v1.duration?.toFixed(2) || 'unknown',
              readyState: v1.readyState,
              networkState: v1.networkState,
              src: v1.src.split('/').pop(),
              hasError: !!v1.error,
            }
          : 'NOT MOUNTED'
      );
      console.log(
        'Video2:',
        v2
          ? {
              exists: true,
              paused: v2.paused,
              currentTime: v2.currentTime.toFixed(2),
              duration: v2.duration?.toFixed(2) || 'unknown',
              readyState: v2.readyState,
              networkState: v2.networkState,
              src: v2.src.split('/').pop(),
              hasError: !!v2.error,
            }
          : 'NOT MOUNTED'
      );

      // Sequencer state
      console.log('\n⏯️  SEQUENCER STATE:');
      console.log({
        isPlaying: Sequencer.isPlaying(),
        currentPlaylist: ThePlaylist?.id || 'undefined',
        playlistName: ThePlaylist?.name || 'none',
      });

      // Current position
      if (ItemPlayer.ThePlayer) {
        const pos = ItemPlayer.ThePlayer.getPosition();
        console.log('\n📍 CURRENT POSITION:');
        if (pos) {
          console.log({
            montage: pos.getMontageIndex(),
            track: pos.getTrackIndex(),
            item: pos.getItemIndex(),
            offset: pos.getOffset()?.toFixed(2),
          });
        } else {
          console.log('Position is undefined');
        }
      }

      console.log('\n═══════════════════════════════════════════════════');
    };

    console.log('[App] Added debugPlayCommand to window for manual testing');
    console.log('[App] 💡 TIP: Call debugPlayerState() in console for comprehensive state info');

    // DIAGNOSTIC: Add video slot diagnostic function
    (window as any).debugVideoSlots = () => {
      console.log('\n🎬 VIDEO SLOT DIAGNOSTICS');
      console.log('═══════════════════════════════════════════════════');
      console.log('State:', {
        video1: this.state.video1?.filename,
        video2: this.state.video2?.filename,
        videoShown: this.state.videoShown,
        videoPreloading: this.state.videoPreloading,
        loading: this.state.loading,
      });

      const video1 = this.video1Ref.current;
      const video2 = this.video2Ref.current;

      if (video1) {
        console.log('Video #1 DOM state:', {
          src: video1.src,
          currentTime: video1.currentTime,
          duration: video1.duration,
          paused: video1.paused,
          ended: video1.ended,
          readyState: video1.readyState,
          networkState: video1.networkState,
          volume: video1.volume,
          muted: video1.muted,
          className: video1.className,
          hidden: video1.classList.contains('hidden'),
        });
      }

      if (video2) {
        console.log('Video #2 DOM state:', {
          src: video2.src,
          currentTime: video2.currentTime,
          duration: video2.duration,
          paused: video2.paused,
          ended: video2.ended,
          readyState: video2.readyState,
          networkState: video2.networkState,
          volume: video2.volume,
          muted: video2.muted,
          className: video2.className,
          hidden: video2.classList.contains('hidden'),
        });
      }

      // Check for stuck state
      const isStuck =
        this.state.loading &&
        this.state.videoShown !== 0 &&
        ((this.state.videoShown === 1 && video1?.readyState === 0) ||
          (this.state.videoShown === 2 && video2?.readyState === 0));

      if (isStuck) {
        console.warn('⚠️ STUCK STATE DETECTED:', {
          issue: 'Video shown but readyState is 0',
          recommendation: 'Video slot may be stuck, consider clearing and reloading',
        });
      }

      console.log('═══════════════════════════════════════════════════\n');
    };

    console.log('[App] 💡 TIP: Call debugVideoSlots() to check for stuck video states');

    // NOTE: Global navigation commands are now handled by EssentialLogger.ts
    console.log(
      '[App] Global navigation commands available via EssentialLogger: window.goNext(), window.goPrevious(), window.goMontage(index)'
    );

    // Signal to parent that the child React app is ready immediately
    if (window.onWebPlayerReady && !this.hasSignaledReady) {
      console.log('[App] Signaling parent that child React app is ready (componentDidMount)');
      window.onWebPlayerReady();
      this.hasSignaledReady = true;
    }

    // DEBUG: Check if test functions are available
    setTimeout(() => {
      console.log('[App] Checking test functions availability:', {
        testShowVideo: typeof window.testShowVideo,
        testVideoVisibility: typeof window.testVideoVisibility,
        TheApp: !!TheApp,
      });
    }, 100);

    // CRITICAL DEBUG: Check if App component is in DOM
    setTimeout(() => {
      console.log('[App] componentDidMount - React component mounted successfully');
    }, 200);

    // 🚀 STATE RESTITUTION: Process any pending operations that were stored during playlist switching
    setTimeout(() => {
      if (window.PENDING_APP_OPERATIONS && window.PENDING_APP_OPERATIONS.length > 0) {
        console.log(
          '[App] 🚀 STATE RESTITUTION: Processing',
          window.PENDING_APP_OPERATIONS.length,
          'pending operations after mount'
        );
        try {
          const { processPendingAppOperations } = require('./manager/Globals');
          processPendingAppOperations('app-componentDidMount');
        } catch (e) {
          console.warn('[App] 🚀 STATE RESTITUTION: Could not process pending operations:', e);
        }
      } else {
        console.log('[App] 🚀 STATE RESTITUTION: No pending operations to process');
      }
    }, 300); // Small delay to ensure component is fully ready

    // 🚨 CRITICAL DEBUG: Check React rendering status after mount
    setTimeout(() => {
      console.log('[App] 🚨 CRITICAL DEBUG: React rendering status check after mount');

      // Check if video components are actually in the DOM
      const video1Element = document.getElementById('video-1');
      const video2Element = document.getElementById('video-2');
      const rootElement = document.getElementById('wm-player-contents');

      console.log('[App] 🚨 CRITICAL DEBUG: DOM elements check:', {
        rootElement: !!rootElement,
        rootElementChildren: rootElement?.children?.length || 0,
        video1Element: !!video1Element,
        video2Element: !!video2Element,
        video1Hidden: video1Element?.hidden,
        video2Hidden: video2Element?.hidden,
        video1Display: video1Element ? window.getComputedStyle(video1Element).display : 'N/A',
        video2Display: video2Element ? window.getComputedStyle(video2Element).display : 'N/A',
      });

      // Check if React root is properly mounted
      if (rootElement) {
        console.log('[App] 🚨 CRITICAL DEBUG: React root details:', {
          innerHTML: rootElement.innerHTML.substring(0, 200) + '...',
          childNodes: rootElement.childNodes.length,
          firstChild: rootElement.firstChild?.nodeName,
        });
      }
    }, 500); // Check after component is fully rendered

    // 🚨 CRITICAL DEBUG: Enhanced CSS/DOM debugging for video visibility
    setTimeout(() => {
      console.log('[App] 🚨 CRITICAL DEBUG: Enhanced CSS/DOM debugging for video visibility');

      const video1Element = document.getElementById('video-1');
      const video2Element = document.getElementById('video-2');

      if (video1Element) {
        const computedStyle = window.getComputedStyle(video1Element);
        console.log('[App] 🚨 CRITICAL DEBUG: Video1 CSS properties:', {
          display: computedStyle.display,
          visibility: computedStyle.visibility,
          opacity: computedStyle.opacity,
          position: computedStyle.position,
          zIndex: computedStyle.zIndex,
          width: computedStyle.width,
          height: computedStyle.height,
          top: computedStyle.top,
          left: computedStyle.left,
          hidden: video1Element.hidden,
          offsetWidth: video1Element.offsetWidth,
          offsetHeight: video1Element.offsetHeight,
          clientWidth: video1Element.clientWidth,
          clientHeight: video1Element.clientHeight,
          scrollWidth: video1Element.scrollWidth,
          scrollHeight: video1Element.scrollHeight,
        });
      }

      if (video2Element) {
        const computedStyle = window.getComputedStyle(video2Element);
        console.log('[App] 🚨 CRITICAL DEBUG: Video2 CSS properties:', {
          display: computedStyle.display,
          visibility: computedStyle.visibility,
          opacity: computedStyle.opacity,
          position: computedStyle.position,
          zIndex: computedStyle.zIndex,
          width: computedStyle.width,
          height: computedStyle.height,
          top: computedStyle.top,
          left: computedStyle.top,
          hidden: video2Element.hidden,
          offsetWidth: video2Element.offsetWidth,
          offsetHeight: video2Element.offsetHeight,
          clientWidth: video2Element.clientWidth,
          clientHeight: video2Element.clientHeight,
          scrollWidth: video2Element.scrollWidth,
          scrollHeight: video2Element.scrollHeight,
        });
      }
    }, 600);

    // CRITICAL FIX: Start container readiness check after component is fully mounted
    setTimeout(() => {
      console.log('[App] 🚀 STARTING CONTAINER READINESS CHECK after component mount');
      this.waitForJSContainerReady();
    }, 700); // Start after all other initialization is complete

    // Simple montage logging is now handled automatically in showVideo/showImage methods
  }

  componentWillUnmount() {
    console.log('🔍 [App] componentWillUnmount called');

    // CRITICAL FIX: Prevent unmounting during playlist switches
    if (window.TheApp === this) {
      console.log(
        '🚨 [App] CRITICAL: Attempting to unmount active App component during playlist switch - preventing this'
      );
      // Don't allow unmounting of the active App component
      return;
    }

    // Clean up timers and observers
    // No timer cleanup needed for simple montage logging

    if (this.domObserver) {
      this.domObserver.disconnect();
      this.domObserver = null;
    }

    if (this.reactRootInterval) {
      clearInterval(this.reactRootInterval);
      this.reactRootInterval = null;
    }

    console.log('🔍 [App] componentWillUnmount cleanup completed');
  }

  private domObserver: MutationObserver | null = null;
  private reactRootInterval: NodeJS.Timeout | null = null;

  private setupDOMMutationObserver() {
    const container = document.getElementById('root-wm-player');
    if (container) {
      this.domObserver = new MutationObserver(mutations => {
        // FIXED: Throttle mutation logging to reduce noise and only log significant changes
        const significantMutations = mutations.filter(mutation => {
          if (mutation.type !== 'childList') return false;

          // Only log if video/image elements or main containers are affected
          const target = mutation.target as Element;
          const isSignificant =
            target.id === 'root-wm-player' ||
            target.id === 'wm-player-contents' ||
            target.tagName === 'VIDEO' ||
            target.tagName === 'IMG' ||
            Array.from(mutation.addedNodes).some(
              n => (n as Element)?.tagName === 'VIDEO' || (n as Element)?.tagName === 'IMG'
            ) ||
            Array.from(mutation.removedNodes).some(
              n => (n as Element)?.tagName === 'VIDEO' || (n as Element)?.tagName === 'IMG'
            );

          return isSignificant;
        });

        if (significantMutations.length > 0) {
          console.log('🔍 [App] SIGNIFICANT DOM MUTATION:', {
            mutationCount: significantMutations.length,
            details: significantMutations.map(mutation => ({
              type: mutation.type,
              addedNodes: Array.from(mutation.addedNodes).map(n =>
                n.nodeType === Node.ELEMENT_NODE ? (n as Element).tagName : n.nodeType
              ),
              removedNodes: Array.from(mutation.removedNodes).map(n =>
                n.nodeType === Node.ELEMENT_NODE ? (n as Element).tagName : n.nodeType
              ),
              target:
                mutation.target.nodeType === Node.ELEMENT_NODE
                  ? (mutation.target as Element).id || (mutation.target as Element).tagName
                  : 'unknown',
            })),
            timestamp: Date.now(),
          });
        }

        mutations.forEach(mutation => {
          if (mutation.type === 'childList') {
            // Check if our App component is being removed
            if (mutation.removedNodes.length > 0) {
              const removedApp = Array.from(mutation.removedNodes).find(
                node =>
                  node.nodeType === Node.ELEMENT_NODE &&
                  (node as Element).classList?.contains('App')
              );
              if (removedApp) {
                console.log('🚨 [App] APP COMPONENT REMOVED FROM DOM!', {
                  timestamp: Date.now(),
                  stack: new Error().stack,
                });
              }
            }
          }
        });
      });

      this.domObserver.observe(container, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['id', 'class'],
      });

      console.log('🔍 [App] DOM Mutation Observer setup complete');
    }
  }

  private setupReactRootMonitor() {
    this.reactRootInterval = setInterval(() => {
      const container = document.getElementById('root-wm-player');
      // FIXED: Use React 18 API - check for actual React content instead of internal properties
      const hasReactRoot =
        container && container.querySelector('[data-reactroot], #wm-player-contents');
      const hasAppComponent = container?.querySelector('#wm-player-contents');

      // Simplified logging - only when needed
      const now = Date.now();
      if (!this.lastRootStatusLog || now - this.lastRootStatusLog > 10000) {
        this.lastRootStatusLog = now;
        console.log('[App] Status check:', {
          container: !!container,
          children: container?.children?.length || 0,
        });
      }

      // SIMPLIFIED: Only recover if container is truly empty for extended period
      const isReallyEmpty =
        !container || (container.children.length === 0 && container.innerHTML.trim() === '');

      // CRITICAL: Also detect when React root is specifically missing (playlist 1039 issue)
      const hasReactContent = container?.querySelector('#wm-player-contents');
      const reactRootMissing = container && !hasReactContent && container.children.length > 0;

      // CRITICAL FIX: Never recover during playlist transitions or when sequencer is active
      const hasActiveSequencer =
        Sequencer?.isPlaying() || Sequencer?.isPaused() || Sequencer?.getCurrentPlaylist();
      const hasActiveMedia = this.state.videoShown > 0 || this.state.imageShown > 0;

      const shouldConsiderRecovery =
        (isReallyEmpty || reactRootMissing) &&
        this._isMounted &&
        !this.isPlaylistChanging && // Never recover during playlist changes
        !hasActiveSequencer && // Never recover when sequencer is active
        !hasActiveMedia && // Never recover when media is showing
        Date.now() - this.startTime > 30000; // Much longer timeout - only for catastrophic failures

      // OLD LOGIC (disabled due to false positives):
      // const isCompletelyEmpty = container && container.children.length === 0 && container.innerHTML.trim() === '';
      // const shouldConsiderRecovery = (
      //     isCompletelyEmpty && // Container is completely empty
      //     this._isMounted && // AND we were previously mounted
      //     !this.isPlaylistChanging && // AND we're not in the middle of a playlist change
      //     Date.now() - this.startTime > 5000 // AND app has been running for at least 5 seconds
      // );

      // Special logging for React root missing scenario
      if (reactRootMissing && !this.isPlaylistChanging) {
        console.log('🚨 [App] REACT ROOT MISSING but container exists:', {
          containerExists: !!container,
          containerChildren: container?.children?.length,
          hasReactContent: !!hasReactContent,
          isPlaylistChanging: this.isPlaylistChanging,
          hasActiveSequencer,
          hasActiveMedia,
          container: container?.outerHTML?.substring(0, 200) + '...',
        });
      }

      if (shouldConsiderRecovery) {
        // DEBOUNCE: Only recover if empty for sustained period
        if (!this.recoveryDebounceTime) {
          this.recoveryDebounceTime = Date.now();
          console.log('🔍 [App] Container appears empty - starting recovery debounce timer');
        } else {
          // Use different timeouts based on whether we're in a playlist change
          const recoveryTimeout = this.isPlaylistChanging ? 1500 : 3000; // Faster recovery during playlist changes

          if (Date.now() - this.recoveryDebounceTime > recoveryTimeout) {
            const timeoutDesc = this.isPlaylistChanging
              ? '1.5 seconds (playlist changing)'
              : '3+ seconds';
            console.log(
              `🚨 [App] APP CONTENT MISSING for ${timeoutDesc}! Component may have been destroyed`
            );
            this.recoveryDebounceTime = null; // Reset debounce
            this.attemptReactRootRecovery();
          }
        }
      } else {
        // Reset debounce if container is not empty
        if (this.recoveryDebounceTime) {
          console.log('✅ [App] Container content restored - canceling recovery debounce');
          this.recoveryDebounceTime = null;
        }
      }

      // CRITICAL FIX: Only alert about missing component if we're not currently changing playlists or navigating
      // During navigation, React may temporarily unmount/remount components causing false positives
      if (!hasAppComponent && !this.isPlaylistChanging && Date.now() - this.startTime > 15000) {
        // Add debounce for component missing alerts to avoid false positives during navigation
        if (!this.componentMissingDebounce) {
          this.componentMissingDebounce = Date.now();
        } else if (Date.now() - this.componentMissingDebounce > 5000) {
          // 5 second debounce
          console.log(
            '🚨 [App] APP COMPONENT MISSING for 5+ seconds! Component may have unmounted'
          );
          this.componentMissingDebounce = null; // Reset after alerting
        }
      } else {
        // Reset debounce if component is found
        this.componentMissingDebounce = null;
      }
    }, 2000); // Check every 2 seconds
  }

  render() {
    // REMOVED: setTheApp(this) - moved to constructor to prevent DOM clearing
    console.log('🔍 [App] RENDER METHOD CALLED', {
      timestamp: Date.now(),
      videoShown: this.state.videoShown,
      imageShown: this.state.imageShown,
      hasVideo1: !!this.state.video1,
      hasVideo2: !!this.state.video2,
      hasImage1: !!this.state.image1,
      hasImage2: !!this.state.image2,
    });

    const image1: ImageMediaFile | undefined = this.state.image1;
    const image2: ImageMediaFile | undefined = this.state.image2;
    const imageShown = this.state.imageShown;
    const imagePreloading = this.state.imagePreloading;
    const video1: VideoMediaFile | undefined = this.state.video1;
    const video2: VideoMediaFile | undefined = this.state.video2;
    const videoShown = this.state.videoShown;
    const videoPreloading = this.state.videoPreloading;
    const fadeClass: string = this.state.fadeClass;
    const loading = this.state.loading;
    // @ts-ignore
    const canWork = window.MediaSource || window.ManagedMediaSource;
    const isShown = !!(imageShown || videoShown);

    // REMOVED: Problematic direct state mutation that caused race conditions
    // if (loading) {
    //     setTimeout(() => this.state.loading = false, 500);
    // }

    console.log('🔍 [App] RENDER - About to return JSX', {
      isShown,
      canWork,
      loading,
      willRenderVideo: videoShown > 0,
      willRenderImage: imageShown > 0,
    });

    return (
      <div id="wm-player-contents" className="wm-player-contents">
        {!isShown && canWork && !loading && (
          <div className="placeholder">
            ⏸️
            <br />
            Ready to play
          </div>
        )}
        {!canWork && (
          <div className="placeholder">
            ⚠️
            <br />
            Browser not supported
          </div>
        )}
        {loading &&
          (() => {
            console.log('🔄 [SPINNER-DEBUG] Spinner is rendering - loading state is TRUE');
            return (
              <div className="placeholder">
                <div className="spinner"></div>
              </div>
            );
          })()}
        {/* CRITICAL FIX: Conditionally render image components based on playlist type */}
        {(() => {
          const hasImagesInPlaylist = (window as any).WM_HAS_IMAGES === true;

          if (hasImagesInPlaylist) {
            // Always render image components for image playlists, even if media is undefined initially
            console.log(
              '[App] 🚨 CRITICAL DEBUG: Image playlist detected - rendering image components'
            );

            // CRITICAL FIX: Auto-trigger image display if image playlist is detected but no image is showing
            if (this.state.imageShown === 0 && !this.state.videoShown) {
              console.log(
                '[App] 🚑 CRITICAL FIX: Image playlist detected but no image showing - triggering sequencer play'
              );
              // Use setTimeout to avoid setState during render
              setTimeout(() => {
                const { Sequencer } = require('./manager/Sequencer');

                // Unified montage availability check for both default and defined playlists
                const currentPlaylist = Sequencer.getCurrentPlaylist();
                const { Montages } = require('./manager/Globals');

                const montageCount = currentPlaylist
                  ? currentPlaylist.getMontagesCount
                    ? currentPlaylist.getMontagesCount()
                    : 0
                  : Object.keys(Montages).length;

                if (montageCount === 0) {
                  console.log('[App] 🚑 No montages available yet - skipping sequencer start');
                  return;
                }
                console.log(
                  '[App] 🚑 Found',
                  montageCount,
                  'montages, proceeding with sequencer start'
                );

                if (Sequencer && !Sequencer.isPlaying()) {
                  const montageCount = currentPlaylist
                    ? currentPlaylist.getMontagesCount()
                    : Object.keys(require('./manager/Globals').Montages).length;
                  console.log(
                    '[App] 🚑 Starting sequencer for image playlist with',
                    montageCount,
                    'montages'
                  );
                  Sequencer.play(0);
                } else {
                  console.log(
                    '[App] 🚑 Sequencer claims to be playing - but checking if media is actually displaying'
                  );
                  // CRITICAL FIX: If sequencer claims to be playing but no media showing, force restart
                  if (this.state.imageShown === 0 && !this.state.videoShown) {
                    console.log(
                      '[App] 🚨 CRITICAL: Sequencer playing but no media showing - forcing restart for image playlist'
                    );
                    setTimeout(() => {
                      console.log('[App] 🚑 FORCE-RESTARTING Sequencer for stuck image playlist');
                      Sequencer.stop();
                      setTimeout(() => {
                        Sequencer.play(0);
                      }, 100);
                    }, 200);
                  } else {
                    console.log(
                      '[App] 🚑 Sequencer playing and media is showing - letting normal flow continue'
                    );
                  }
                }
              }, 100);
            }

            return (
              <>
                {/* Image1 component - always render for image playlists */}
                <Image
                  ref={this.image1Ref}
                  index={1}
                  media={image1 || undefined}
                  hidden={imageShown !== 1}
                  shouldLoad={imageShown === 1 || imagePreloading === 1}
                  zoomAndPan={image1?.zoomAndPan}
                />
                {/* Image2 component - always render for image playlists */}
                <Image
                  ref={this.image2Ref}
                  index={2}
                  media={image2 || undefined}
                  hidden={imageShown !== 2}
                  shouldLoad={imageShown === 2 || imagePreloading === 2}
                  zoomAndPan={image2?.zoomAndPan}
                />
              </>
            );
          } else {
            // For non-image playlists, only render if image media exists
            return (
              <>
                {image1 && (
                  <Image
                    ref={this.image1Ref}
                    index={1}
                    media={image1}
                    hidden={imageShown !== 1}
                    shouldLoad={imageShown === 1 || imagePreloading === 1}
                    zoomAndPan={image1?.zoomAndPan}
                  />
                )}
                {image2 && (
                  <Image
                    ref={this.image2Ref}
                    index={2}
                    media={image2}
                    hidden={imageShown !== 2}
                    shouldLoad={imageShown === 2 || imagePreloading === 2}
                    zoomAndPan={image2?.zoomAndPan}
                  />
                )}
              </>
            );
          }
        })()}
        {/* CRITICAL FIX: Always render both video components for proper video switching */}
        {/* CRITICAL FIX: Move video rendering OUTSIDE IIFE to prevent unmount/remount on every render */}
        {/* Video components now always render with stable keys - no conditional wrapping */}
        <Video
          key="video-1"
          ref={this.video1Ref}
          index={1}
          media={video1 || null}
          hidden={this.state.videoShown !== 1}
          shouldLoad={true}
          onVideoLoaded={() => {
            console.log(
              '🔄 [SPINNER-DEBUG] Video #1 onVideoLoaded fired, loading:',
              this.state.loading
            );
            this.video1Ready = true;
            if (this.state.loading) {
              console.log('🔄 [SPINNER-DEBUG] Turning spinner OFF (video #1 loaded)');
              this.setState({ loading: false });
            }
            // CRITICAL FIX: Process pending showVideo now that video is ready
            if (
              this.pendingShowVideo &&
              this.state.video1?.filename === this.pendingShowVideo.filename
            ) {
              console.log(
                '[App] Video #1 ready, processing pending showVideo:',
                this.pendingShowVideo.filename
              );
              const pending = this.pendingShowVideo;
              this.pendingShowVideo = null;
              this.showVideo(pending);
            }
          }}
        />
        <Video
          key="video-2"
          ref={this.video2Ref}
          index={2}
          media={video2 || null}
          hidden={this.state.videoShown !== 2}
          shouldLoad={true}
          onVideoLoaded={() => {
            console.log(
              '🔄 [SPINNER-DEBUG] Video #2 onVideoLoaded fired, loading:',
              this.state.loading
            );
            this.video2Ready = true;
            if (this.state.loading) {
              console.log('🔄 [SPINNER-DEBUG] Turning spinner OFF (video #2 loaded)');
              this.setState({ loading: false });
            }
            // CRITICAL FIX: Process pending showVideo now that video is ready
            if (
              this.pendingShowVideo &&
              this.state.video2?.filename === this.pendingShowVideo.filename
            ) {
              console.log(
                '[App] Video #2 ready, processing pending showVideo:',
                this.pendingShowVideo.filename
              );
              const pending = this.pendingShowVideo;
              this.pendingShowVideo = null;
              this.showVideo(pending);
            }
          }}
        />

        {isShown && <div id="fadeinout" className={fadeClass}></div>}

        {/* DEBUG OVERLAY - COMMENTED OUT FOR PRODUCTION
                {/* Debug Overlay - Shows real-time playback information */}
        {/*
                <div
                    data-debug-overlay
                    style={{
                        position: 'absolute',
                        // top: '10px',
                        // left: '10px',
                        // background: 'rgba(0, 0, 0, 0.8)',
                        color: 'white',
                        padding: '8px 12px',
                        borderRadius: '4px',
                        fontSize: '18px',
                        fontFamily: 'monospace',
                        zIndex: 1000,
                        maxWidth: '800px',
                        wordBreak: 'break-word'
                    }}
                >
                    Loading debug info...
                </div>
                */}
        {/* END DEBUG OVERLAY COMMENT */}
      </div>
    );
  }
}
