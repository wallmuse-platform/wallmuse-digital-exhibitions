// Add this simplified logging system to focus on essential functionality
// Replace excessive debug logs with these focused log points:

export class EssentialLogger {
  private static logLevel: 'essential' | 'detailed' | 'verbose' = 'essential';

  public static setLevel(level: 'essential' | 'detailed' | 'verbose') {
    this.logLevel = level;
    console.log(`[LOGGER] Log level set to: ${level}`);
  }

  // ESSENTIAL: Core playback events
  public static playback(event: string, data?: any) {
    if (
      this.logLevel === 'essential' ||
      this.logLevel === 'detailed' ||
      this.logLevel === 'verbose'
    ) {
      console.log(`🎬 [PLAYBACK] ${event}`, data || '');
    }
  }

  // ESSENTIAL: Navigation events
  public static navigation(event: string, data?: any) {
    if (
      this.logLevel === 'essential' ||
      this.logLevel === 'detailed' ||
      this.logLevel === 'verbose'
    ) {
      console.log(`🧭 [NAVIGATION] ${event}`, data || '');
    }
  }

  // ESSENTIAL: Track selection
  public static track(event: string, data?: any) {
    if (
      this.logLevel === 'essential' ||
      this.logLevel === 'detailed' ||
      this.logLevel === 'verbose'
    ) {
      console.log(`🎵 [TRACK] ${event}`, data || '');
    }
  }

  // ESSENTIAL: Media loading
  public static media(event: string, data?: any) {
    if (
      this.logLevel === 'essential' ||
      this.logLevel === 'detailed' ||
      this.logLevel === 'verbose'
    ) {
      console.log(`📽️ [MEDIA] ${event}`, data || '');
    }
  }

  // ESSENTIAL: Playlist operations
  public static playlist(event: string, data?: any) {
    if (
      this.logLevel === 'essential' ||
      this.logLevel === 'detailed' ||
      this.logLevel === 'verbose'
    ) {
      console.log(`📋 [PLAYLIST] ${event}`, data || '');
    }
  }

  // DETAILED: Loop and timing
  public static timing(event: string, data?: any) {
    if (this.logLevel === 'detailed' || this.logLevel === 'verbose') {
      console.log(`⏱️ [TIMING] ${event}`, data || '');
    }
  }

  // VERBOSE: All other debug info
  public static debug(event: string, data?: any) {
    if (this.logLevel === 'verbose') {
      console.log(`🔍 [DEBUG] ${event}`, data || '');
    }
  }
}

// Essential Test Commands:
// Add these to window global for easy testing:
declare global {
  interface Window {
    testEssentials: {
      setLogLevel: (level: 'essential' | 'detailed' | 'verbose') => void;
      testPlayback: () => void;
      testNavigation: () => void;
      testTrackSelection: () => void;
      status: () => void;
      checkElements: () => void;
      testVisibility: () => void;
    };
    debugPlayer: () => void;
    debugElements: () => void;
    testDebug: () => void;
    // ADDED: Global navigation commands
    goNext?: () => void;
    goPrevious?: () => void;
    goMontage?: (montageIndex: number) => void;
    // ADDED: Debug commands
    debugSequencerStatus?: () => void;
    forceSequencerStart?: () => void;
  }
}

// Initialize test commands
export function initializeTestCommands() {
  window.testEssentials = {
    // Set log level
    setLogLevel: (level: 'essential' | 'detailed' | 'verbose') => {
      EssentialLogger.setLevel(level);
    },

    // Test basic playback
    testPlayback: () => {
      console.log('=== PLAYBACK TEST ===');
      EssentialLogger.playback('Testing play/pause/stop');

      const { Sequencer } = require('./Sequencer');
      if (Sequencer.isPlaying()) {
        Sequencer.pause();
        setTimeout(() => {
          if (Sequencer.isPaused()) {
            Sequencer.play();
          }
        }, 2000);
      } else {
        Sequencer.play();
      }
    },

    // Test navigation
    testNavigation: () => {
      console.log('=== NAVIGATION TEST ===');
      const { Sequencer } = require('./Sequencer');
      const { ItemPlayer } = require('./ItemPlayer');

      const current = ItemPlayer.ThePlayer.getPosition()?.getMontageIndex() || 0;
      const playlist = Sequencer.getCurrentPlaylist();
      const montageCount = playlist?.getMontagesCount() || 0;

      EssentialLogger.navigation('Testing navigation', {
        currentMontage: current,
        totalMontages: montageCount,
      });

      // Test next/prev
      setTimeout(() => Sequencer.goNext(), 1000);
      setTimeout(() => Sequencer.goPrevious(), 3000);
    },

    // Test track selection
    testTrackSelection: () => {
      console.log('=== TRACK SELECTION TEST ===');
      const { Sequencer } = require('./Sequencer');
      const { ItemPlayer } = require('./ItemPlayer');

      const position = ItemPlayer.ThePlayer.getPosition();
      if (position) {
        const montage = position.getMontage();
        const trackCount = montage?.seqs?.length || 0;

        EssentialLogger.track('Testing track selection', {
          currentTrack: position.getTrackIndex(),
          totalTracks: trackCount,
        });

        // Cycle through tracks
        for (let i = 0; i < trackCount && i < 3; i++) {
          setTimeout(() => {
            Sequencer.goMontage(position.getMontageIndex(), i);
          }, i * 2000);
        }
      }
    },

    // Quick status check
    status: () => {
      const { Sequencer } = require('./Sequencer');
      const { ItemPlayer } = require('./ItemPlayer');

      const position = ItemPlayer.ThePlayer.getPosition();
      const playlist = Sequencer.getCurrentPlaylist();

      console.log('=== CURRENT STATUS ===');
      console.log(
        '🎬 Playback:',
        Sequencer.getStatus(),
        Sequencer.isPlaying() ? 'PLAYING' : 'STOPPED'
      );
      console.log('📋 Playlist:', playlist?.id, playlist?.name);
      console.log('🧭 Position:', {
        montage: position?.getMontageIndex(),
        track: position?.getTrackIndex(),
        item: position?.getItemIndex(),
      });
      console.log('⏱️ Timing:', {
        offset: Sequencer.getCurrentOffset(),
        timestamp: Sequencer.getCurrentTimestamp(),
      });
    },

    // Check all media elements in DOM
    checkElements: () => {
      console.log('=== DOM ELEMENTS CHECK ===');

      // Check video elements
      const videos = document.querySelectorAll('video');
      console.log('📹 Videos in DOM:', videos.length);
      videos.forEach((video, index) => {
        const computedStyle = window.getComputedStyle(video);
        console.log(`  Video ${index + 1}:`, {
          id: video.id,
          src: video.src,
          display: computedStyle.display,
          visibility: computedStyle.visibility,
          opacity: computedStyle.opacity,
          width: computedStyle.width,
          height: computedStyle.height,
          readyState: video.readyState,
          paused: video.paused,
          currentTime: video.currentTime,
          duration: video.duration,
        });
      });

      // Check image elements
      const images = document.querySelectorAll('img');
      console.log('🖼️ Images in DOM:', images.length);
      images.forEach((img, index) => {
        const computedStyle = window.getComputedStyle(img);
        console.log(`  Image ${index + 1}:`, {
          id: img.id,
          src: img.src,
          display: computedStyle.display,
          visibility: computedStyle.visibility,
          opacity: computedStyle.opacity,
          width: computedStyle.width,
          height: computedStyle.height,
          complete: img.complete,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
        });
      });

      // Check App component state (if available)
      if ((window as any).TheApp) {
        console.log('🎭 App Component State:', {
          imageShown: (window as any).TheApp.state?.imageShown,
          videoShown: (window as any).TheApp.state?.videoShown,
          imagePreloading: (window as any).TheApp.state?.imagePreloading,
          videoPreloading: (window as any).TheApp.state?.videoPreloading,
          image1: (window as any).TheApp.state?.image1?.filename,
          image2: (window as any).TheApp.state?.image2?.filename,
          video1: (window as any).TheApp.state?.video1?.filename,
          video2: (window as any).TheApp.state?.video2?.filename,
        });
      }
    },

    // Test element visibility
    testVisibility: () => {
      console.log('=== VISIBILITY TEST ===');

      const videos = document.querySelectorAll('video');
      const images = document.querySelectorAll('img');

      console.log('📊 Summary:');
      console.log(`  Videos: ${videos.length} total`);
      console.log(`  Images: ${images.length} total`);

      let visibleVideos = 0;
      let visibleImages = 0;

      videos.forEach(video => {
        const style = window.getComputedStyle(video);
        if (
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          parseFloat(style.opacity) > 0
        ) {
          visibleVideos++;
        }
      });

      images.forEach(img => {
        const style = window.getComputedStyle(img);
        if (
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          parseFloat(style.opacity) > 0
        ) {
          visibleImages++;
        }
      });

      console.log(`  Visible videos: ${visibleVideos}`);
      console.log(`  Visible images: ${visibleImages}`);

      if (visibleVideos === 0 && visibleImages === 0) {
        console.log('❌ NO VISIBLE MEDIA ELEMENTS!');
      } else if (visibleVideos > 0 || visibleImages > 0) {
        console.log('✅ Media elements are visible');
      }
    },
  };

  // Auto-set to essential logging on load
  EssentialLogger.setLevel('essential');
  console.log('🚀 Essential logging system loaded. Use window.testEssentials for quick tests.');
  console.log('🔧 Debug functions available: window.debugPlayer() and window.debugElements()');

  // Test if debug functions are properly assigned
  console.log('🔧 Debug function test:', {
    debugPlayerExists: typeof window.debugPlayer === 'function',
    debugElementsExists: typeof window.debugElements === 'function',
    testEssentialsExists: typeof window.testEssentials === 'object',
  });

  // Add immediate debug function
  window.debugElements = () => {
    console.log('🔧 DEBUG ELEMENTS FUNCTION CALLED');
    console.log('=== QUICK ELEMENTS DEBUG ===');

    const videos = document.querySelectorAll('video');
    const images = document.querySelectorAll('img');

    console.log(`📹 Videos: ${videos.length}, 🖼️ Images: ${images.length}`);

    videos.forEach((video, i) => {
      const style = window.getComputedStyle(video);
      console.log(`Video ${i + 1}:`, {
        id: video.id,
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity,
        readyState: video.readyState,
        paused: video.paused,
        src: video.src?.split('/').pop(),
      });
    });

    images.forEach((img, i) => {
      const style = window.getComputedStyle(img);
      console.log(`Image ${i + 1}:`, {
        id: img.id,
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity,
        complete: img.complete,
        src: img.src?.split('/').pop(),
      });
    });

    // Check if any elements are visible
    const visibleVideos = Array.from(videos).filter(v => {
      const style = window.getComputedStyle(v);
      return (
        style.display !== 'none' && style.visibility !== 'hidden' && parseFloat(style.opacity) > 0
      );
    });

    const visibleImages = Array.from(images).filter(img => {
      const style = window.getComputedStyle(img);
      return (
        style.display !== 'none' && style.visibility !== 'hidden' && parseFloat(style.opacity) > 0
      );
    });

    console.log(`✅ Visible: ${visibleVideos.length} videos, ${visibleImages.length} images`);

    if (visibleVideos.length === 0 && visibleImages.length === 0) {
      console.log('❌ NO VISIBLE MEDIA ELEMENTS!');
    }
  };

  // Add focused player debug function
  window.debugPlayer = () => {
    console.log('🔧 DEBUG PLAYER FUNCTION CALLED');
    console.log('=== PLAYER-SPECIFIC DEBUG ===');

    // Check for player-specific elements
    const playerVideos = document.querySelectorAll('#app video');
    const playerImages = document.querySelectorAll('#app img');

    console.log(`🎮 Player videos: ${playerVideos.length}, images: ${playerImages.length}`);

    // Check specific IDs we expect
    const video1 = document.getElementById('video-1');
    const video2 = document.getElementById('video-2');
    const image1 = document.getElementById('image-1');
    const image2 = document.getElementById('image-2');

    console.log('🎯 Expected elements:', {
      'video-1': !!video1,
      'video-2': !!video2,
      'image-1': !!image1,
      'image-2': !!image2,
    });

    if (video1) {
      const style = window.getComputedStyle(video1);
      const videoElement = video1 as HTMLVideoElement;
      console.log('📹 Video-1 state:', {
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity,
        readyState: videoElement.readyState,
        paused: videoElement.paused,
        src: videoElement.src?.split('/').pop(),
      });
    }

    if (video2) {
      const style = window.getComputedStyle(video2);
      const videoElement = video2 as HTMLVideoElement;
      console.log('📹 Video-2 state:', {
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity,
        readyState: videoElement.readyState,
        paused: videoElement.paused,
        src: videoElement.src?.split('/').pop(),
      });
    }

    if (image1) {
      const style = window.getComputedStyle(image1);
      const imageElement = image1 as HTMLImageElement;
      console.log('🖼️ Image-1 state:', {
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity,
        complete: imageElement.complete,
        src: imageElement.src?.split('/').pop(),
      });
    }

    if (image2) {
      const style = window.getComputedStyle(image2);
      const imageElement = image2 as HTMLImageElement;
      console.log('🖼️ Image-2 state:', {
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity,
        complete: imageElement.complete,
        src: imageElement.src?.split('/').pop(),
      });
    }

    // Check App component state if available
    if ((window as any).TheApp) {
      console.log('🎭 App Component State:', {
        imageShown: (window as any).TheApp.state?.imageShown,
        videoShown: (window as any).TheApp.state?.videoShown,
        imagePreloading: (window as any).TheApp.state?.imagePreloading,
        videoPreloading: (window as any).TheApp.state?.videoPreloading,
        image1: (window as any).TheApp.state?.image1?.filename,
        image2: (window as any).TheApp.state?.image2?.filename,
        video1: (window as any).TheApp.state?.video1?.filename,
        video2: (window as any).TheApp.state?.video2?.filename,
      });
    }

    // Summary
    const hasVisibleMedia =
      (video1 && window.getComputedStyle(video1).display !== 'none') ||
      (video2 && window.getComputedStyle(video2).display !== 'none') ||
      (image1 && window.getComputedStyle(image1).display !== 'none') ||
      (image2 && window.getComputedStyle(image2).display !== 'none');

    console.log(`🎯 Player has visible media: ${hasVisibleMedia}`);

    if (!hasVisibleMedia) {
      console.log('❌ PLAYER HAS NO VISIBLE MEDIA ELEMENTS!');
    }
  };

  // Define the checkElements function
  const checkElements = () => {
    console.log('=== DOM ELEMENTS CHECK ===');

    // Check video elements
    const videos = document.querySelectorAll('video');
    console.log('📹 Videos in DOM:', videos.length);
    videos.forEach((video, index) => {
      const computedStyle = window.getComputedStyle(video);
      console.log(`  Video ${index + 1}:`, {
        id: video.id,
        src: video.src,
        display: computedStyle.display,
        visibility: computedStyle.visibility,
        opacity: computedStyle.opacity,
        width: computedStyle.width,
        height: computedStyle.height,
        readyState: video.readyState,
        paused: video.paused,
        currentTime: video.currentTime,
        duration: video.duration,
      });
    });

    // Check image elements
    const images = document.querySelectorAll('img');
    console.log('🖼️ Images in DOM:', images.length);
    images.forEach((img, index) => {
      const computedStyle = window.getComputedStyle(img);
      console.log(`  Image ${index + 1}:`, {
        id: img.id,
        src: img.src,
        display: computedStyle.display,
        visibility: computedStyle.visibility,
        opacity: computedStyle.opacity,
        width: computedStyle.width,
        height: computedStyle.height,
        complete: img.complete,
      });
    });

    // Check for player-specific elements
    const playerVideos = document.querySelectorAll('#app video');
    const playerImages = document.querySelectorAll('#app img');

    console.log(`🎮 Player videos: ${playerVideos.length}, images: ${playerImages.length}`);

    // Check specific IDs we expect
    const video1 = document.getElementById('video-1');
    const video2 = document.getElementById('video-2');
    const image1 = document.getElementById('image-1');
    const image2 = document.getElementById('image-2');

    console.log('🎯 Expected elements:', {
      'video-1': !!video1,
      'video-2': !!video2,
      'image-1': !!image1,
      'image-2': !!image2,
    });

    if (video1) {
      const style = window.getComputedStyle(video1);
      const videoElement = video1 as HTMLVideoElement;
      console.log('📹 Video-1 state:', {
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity,
        readyState: videoElement.readyState,
        paused: videoElement.paused,
        src: videoElement.src?.split('/').pop(),
      });
    }

    if (video2) {
      const style = window.getComputedStyle(video2);
      const videoElement = video2 as HTMLVideoElement;
      console.log('📹 Video-2 state:', {
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity,
        readyState: videoElement.readyState,
        paused: videoElement.paused,
        src: videoElement.src?.split('/').pop(),
      });
    }

    if (image1) {
      const style = window.getComputedStyle(image1);
      const imageElement = image1 as HTMLImageElement;
      console.log('🖼️ Image-1 state:', {
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity,
        complete: imageElement.complete,
        src: imageElement.src?.split('/').pop(),
      });
    }

    if (image2) {
      const style = window.getComputedStyle(image2);
      const imageElement = image2 as HTMLImageElement;
      console.log('🖼️ Image-2 state:', {
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity,
        complete: imageElement.complete,
        src: imageElement.src?.split('/').pop(),
      });
    }

    // Check App component state if available
    if ((window as any).TheApp) {
      console.log('🎭 App Component State:', {
        imageShown: (window as any).TheApp.state?.imageShown,
        videoShown: (window as any).TheApp.state?.videoShown,
        imagePreloading: (window as any).TheApp.state?.imagePreloading,
        videoPreloading: (window as any).TheApp.state?.videoPreloading,
        image1: (window as any).TheApp.state?.image1?.filename,
        image2: (window as any).TheApp.state?.image2?.filename,
        video1: (window as any).TheApp.state?.video1?.filename,
        video2: (window as any).TheApp.state?.video2?.filename,
      });
    }

    // Summary
    const hasVisibleMedia =
      (video1 && window.getComputedStyle(video1).display !== 'none') ||
      (video2 && window.getComputedStyle(video2).display !== 'none') ||
      (image1 && window.getComputedStyle(image1).display !== 'none') ||
      (image2 && window.getComputedStyle(image2).display !== 'none');

    console.log(`🎯 Player has visible media: ${hasVisibleMedia}`);

    if (!hasVisibleMedia) {
      console.log('❌ PLAYER HAS NO VISIBLE MEDIA ELEMENTS!');
    }
  };

  // Assign debug functions to window
  console.log('[EssentialLogger] Assigning debug functions to window...');
  window.debugElements = checkElements;
  window.debugPlayer = () => {
    console.log('=== PLAYER DEBUG ===');
    const { Sequencer } = require('./Sequencer');
    const { ItemPlayer } = require('./ItemPlayer');

    console.log('🎬 Sequencer Status:', Sequencer.getStatus());
    console.log('🎬 Is Playing:', Sequencer.isPlaying());
    console.log('🎬 Current Offset:', Sequencer.getCurrentOffset());

    const position = ItemPlayer.ThePlayer.getPosition();
    console.log('🧭 Current Position:', {
      montage: position?.getMontageIndex(),
      track: position?.getTrackIndex(),
      item: position?.getItemIndex(),
      offset: position?.getOffset(),
    });

    const playlist = Sequencer.getCurrentPlaylist();
    console.log('📋 Current Playlist:', {
      id: playlist?.id,
      name: playlist?.name,
      montageCount: playlist?.getMontagesCount(),
    });
  };

  console.log('🔧 Quick debug: Use window.debugElements() for immediate element check');
  console.log('🎮 Player debug: Use window.debugPlayer() for player-specific check');

  // Verify the functions are assigned
  console.log('[EssentialLogger] Debug function assignment verification:', {
    debugElements: typeof window.debugElements,
    debugPlayer: typeof window.debugPlayer,
  });

  // Add a simple test function
  window.testDebug = () => {
    console.log('[TEST] Debug functions test:');
    console.log('  debugElements:', typeof window.debugElements);
    console.log('  debugPlayer:', typeof window.debugPlayer);

    if (typeof window.debugElements === 'function') {
      console.log('[TEST] Calling debugElements...');
      window.debugElements();
    } else {
      console.log('[TEST] debugElements is not a function!');
    }
  };

  // CRITICAL FIX: Add global navigation commands that were missing
  window.goNext = () => {
    console.log('[GLOBAL] goNext command called');
    const { Sequencer } = require('./Sequencer');
    Sequencer.goNext();
  };

  window.goPrevious = () => {
    console.log('[GLOBAL] goPrevious command called');
    const { Sequencer } = require('./Sequencer');
    Sequencer.goPrevious();
  };

  window.goMontage = (montageIndex: number) => {
    console.log('[GLOBAL] goMontage command called with index:', montageIndex);
    const { Sequencer } = require('./Sequencer');
    Sequencer.goMontage(montageIndex);
  };

  // Debug commands to check sequencer status
  window.debugSequencerStatus = () => {
    const { Sequencer } = require('./Sequencer');
    const { ItemPlayer } = require('./ItemPlayer');

    console.log('🔍 [DEBUG] Sequencer Status Check:', {
      status: Sequencer.getStatus(),
      isPlaying: Sequencer.isPlaying(),
      isPaused: Sequencer.isPaused(),
      isStopped: Sequencer.isStopped(),
      hasRunner: !!(Sequencer as any).runner,
      currentPlaylist: Sequencer.getCurrentPlaylist()?.id,
      playerPosition: ItemPlayer.ThePlayer?.getPosition()
        ? {
            montageIndex: ItemPlayer.ThePlayer.getPosition()?.getMontageIndex(),
            trackIndex: ItemPlayer.ThePlayer.getPosition()?.getTrackIndex(),
            itemIndex: ItemPlayer.ThePlayer.getPosition()?.getItemIndex(),
          }
        : 'null',
      nextPosition: ItemPlayer.ThePlayer?.getNextPosition()
        ? {
            montageIndex: ItemPlayer.ThePlayer.getNextPosition()?.getMontageIndex(),
            trackIndex: ItemPlayer.ThePlayer.getNextPosition()?.getTrackIndex(),
            itemIndex: ItemPlayer.ThePlayer.getNextPosition()?.getItemIndex(),
          }
        : 'null',
    });
  };

  window.forceSequencerStart = () => {
    console.log('🚀 [DEBUG] Force starting sequencer...');
    const { Sequencer } = require('./Sequencer');
    if (Sequencer.isStopped()) {
      Sequencer.play();
    } else {
      console.log('Sequencer is already running');
    }
  };

  console.log('[EssentialLogger] Test function added: window.testDebug()');
  console.log(
    '[EssentialLogger] Navigation commands added: window.goNext(), window.goPrevious(), window.goMontage(index)'
  );
  console.log(
    '[EssentialLogger] Debug commands added: window.debugSequencerStatus(), window.forceSequencerStart()'
  );
}
