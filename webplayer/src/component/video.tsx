import { VideoMediaFile } from '../media/VideoMediaFile';
import React from 'react';
import { wsTools } from '../manager/start';

interface WallmuseInit {
  playerReady(): Promise<void>;
  ready(component: string): void;
  _playerReady: boolean;
  _playerReadyPromise: Promise<void> | null;
}

declare global {
  interface Window {
    WallmuseInit?: WallmuseInit;
    TheApp?: {
      videoReadyForSeek: (videoId: string) => void;
      forceDOMSync: () => void; // CRITICAL: Emergency DOM sync method
    };
    debugVideo: {
      testPlayback: () => void;
      logInstances: () => void;
      getStatus: () => any;
    };
  }
}

// CRITICAL FIX: Make media optional to support double buffering
interface VideoProps {
  media?: VideoMediaFile; // Made optional
  hidden: boolean;
  index: number;
  shouldLoad?: boolean;
  // autoPlay?: boolean; // DEFERRED: Complex autoplay implementation - see TODO.md
}

const withFragments = true; // Server Range requests confirmed working - fragments re-enabled

// Track Video component instances for debugging and cleanup
class VideoComponentTracker {
  private static instances = new Map<number, any>();

  static register(instance: any) {
    this.instances.set(instance.props.index, instance);
    console.log(
      `🎬 [VIDEO-TRACKER] Registered Video #${instance.props.index}, total instances: ${this.instances.size}`
    );
  }

  static unregister(instance: any) {
    this.instances.delete(instance.props.index);
    console.log(
      `🎬 [VIDEO-TRACKER] Unregistered Video #${instance.props.index}, total instances: ${this.instances.size}`
    );
  }

  static getInstances() {
    return Array.from(this.instances.values());
  }

  static logStatus() {
    console.log(`🎬 [VIDEO-TRACKER] Status: ${this.instances.size} instances`);
    this.instances.forEach((instance, index) => {
      console.log(
        `  Video #${index}: mounted=${
          instance.getIsMounted && instance.getIsMounted()
        }, unmounting=${instance.getIsUnmounting && instance.getIsUnmounting()}, initializing=${
          instance.getIsInitializing && instance.getIsInitializing()
        }`
      );
    });
  }
}

export const Video = React.forwardRef<HTMLVideoElement, VideoProps>(
  ({ media, hidden, index, shouldLoad }, ref) => {
    // CRITICAL DEBUG: Add useEffect to track component lifecycle
    React.useEffect(() => {
      console.log(`🎬 [Video Component #${index}] MOUNTED:`, {
        filename: media?.filename,
        hidden: hidden,
        shouldLoad: shouldLoad,
        hasMedia: !!media,
        timestamp: Date.now(),
        componentId: `video-${index}`,
        reason: 'Component mounted successfully',
      });

      // CRITICAL DEBUG: Check if ref is properly set
      if (ref && typeof ref === 'object' && ref.current) {
        console.log(`✅ [Video Component #${index}] Component properly mounted in React`);
      } else {
        console.log(`❌ [Video Component #${index}] Component failed to mount in React`);
        console.log(
          `🚨 [Video Component #${index}] Component ref not ready, this is normal during initial render`
        );
      }

      return () => {
        console.log(`🎬 [Video Component #${index}] UNMOUNTING:`, {
          filename: media?.filename,
          hidden: hidden,
          shouldLoad: shouldLoad,
          hasMedia: !!media,
          timestamp: Date.now(),
          componentId: `video-${index}`,
          reason: 'Component unmounting - check if this is causing DOM desynchronization',
        });
      };
    }, [index, hidden, shouldLoad, media?.filename]); // Component lifecycle tracking

    // DEBUG: Log autoplay decision for testing
    React.useEffect(() => {
      const autoplayEnabled = wsTools.getHouseAutostart();
      console.log(`🎬 [Video Component #${index}] AutoPlay enabled:`, {
        autoplayEnabled,
        source: 'wsTools.getHouseAutostart()',
        timestamp: Date.now(),
      });
    }, [index]);

    // DEBUG: Track source changes (only log when they actually change)
    React.useEffect(() => {
      if (ref && typeof ref === 'object' && ref.current && media?.url) {
        const videoElement = ref.current as HTMLVideoElement;
        const oldSrc = videoElement.src;
        if (oldSrc !== media.url) {
          console.log(`🎬 [Video Component #${index}] Source changed: ${oldSrc} -> ${media.url}`);
        }
      }
    }, [media?.url, index, ref]);

    try {
      // DEBUG: Only log essential info for first video
      if (index === 1 && media?.filename) {
        console.log(
          `🎬 [Video Component #${index}] Rendering: ${media.filename}, hidden: ${hidden}`
        );
      }

      // DEBUG: Check if CSS z-index is being applied
      if (ref && typeof ref === 'object' && ref.current) {
        const videoElement = ref.current as HTMLVideoElement;
        const computedStyle = window.getComputedStyle(videoElement);
        console.log(
          `🎬 [Video Component #${index}] CSS check: z-index=${computedStyle.zIndex}, hidden=${hidden}`
        );
      }

      // REMOVED: Complex DOM manipulation and forced mounting logic
      // Components should mount naturally with React

      // CRITICAL FIX: Always render the video element, never unmount
      // Use CSS-based visibility instead of component unmounting to prevent DOM desynchronization
      const videoElement = (
        <video
          ref={ref}
          id={`video-${index}`}
          className={`video ${hidden ? 'hidden' : ''}`} // Use hidden prop, not media check
          src={media?.url || ''} // Always set src, empty string when no media
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            position: 'absolute',
            top: 0,
            left: 0,
            // REMOVED: Inline z-index - let CSS handle this
            // zIndex: 1,  // ← This was overriding the CSS!
            // REMOVED: All inline visibility styles - let CSS handle this
            // opacity: media ? 1 : 0,  // ❌ This was setting opacity: 0!
            // pointerEvents: media ? 'auto' : 'none',  // ❌ This was interfering with CSS
            transition: 'opacity 0.3s ease-in-out', // Smooth transition for visibility changes
          }}
          autoPlay={wsTools.getHouseAutostart()} // Use server autostart setting
          loop={media?.loop || false}
          playsInline
          muted
          controls={false}
          // CRITICAL FIX: Add data attributes for debugging
          data-index={index}
          data-filename={media?.filename || 'none'}
          data-hidden={hidden}
          data-has-media={!!media}
          data-should-load={shouldLoad}
          // CRITICAL: Add more debugging attributes
          data-media-id={media?.artworkId || 'none'}
          data-media-type={media?.constructor.name || 'none'}
          data-timestamp={Date.now()}
          // CRITICAL: Add visibility state for debugging
          data-opacity={media ? 1 : 0}
          data-pointer-events={media ? 'auto' : 'none'}
        />
      );

      // CRITICAL DEBUG: Log that we're about to return the video element
      if (index === 1) {
        // Only log for first video to reduce noise
        console.log(`🎬 [Video Component #${index}] About to return video element:`, {
          elementType: videoElement.type,
          elementProps: videoElement.props,
          willRender: true,
        });
      }

      return videoElement;
    } catch (error) {
      console.error(`🚨 [Video Component #${index}] Error during render:`, error);
      return null; // Return null or a placeholder if rendering fails
    }
  }
);

// Only add debug functions in development
if (process.env.NODE_ENV !== 'production') {
  window.debugVideo = {
    testPlayback: () => {
      console.log('[VIDEO-DEBUG] Testing video playback system...');
      VideoComponentTracker.logStatus();
    },

    logInstances: () => {
      console.log('[VIDEO-DEBUG] Logging all video instances...');
      VideoComponentTracker.logStatus();
    },

    getStatus: () => {
      const instances = VideoComponentTracker.getInstances();
      return {
        totalInstances: instances.length,
        instances: instances.map(instance => ({
          index: instance.props.index,
          media: instance.props.media?.filename,
          mounted: instance.getIsMounted && instance.getIsMounted(),
          unmounting: instance.getIsUnmounting && instance.getIsUnmounting(),
          initializing: instance.getIsInitializing && instance.getIsInitializing(),
        })),
      };
    },
  };

  console.log('Video debug functions added to window.debugVideo');
}
