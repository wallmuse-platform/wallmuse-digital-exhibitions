import { VideoMediaFile } from '../media/VideoMediaFile';
import React from 'react';
import { wsTools } from '../manager/start';
import { VideoStreamManager } from '../manager/VideoStreamManager';

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
  onVideoLoaded?: () => void; // Callback when video finishes loading
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
        `  Video #${index}: mounted=${instance.getIsMounted && instance.getIsMounted()}, unmounting=${instance.getIsUnmounting && instance.getIsUnmounting()}, initializing=${instance.getIsInitializing && instance.getIsInitializing()}`
      );
    });
  }
}

export const Video = React.forwardRef<HTMLVideoElement, VideoProps>(
  ({ media, hidden, index, shouldLoad, onVideoLoaded }, ref) => {
    // Track error retry attempts
    const errorRetryCount = React.useRef(0);
    const maxRetries = 3;
    const retryDelay = 2000; // 2 seconds between retries

    // MediaSource chunking state
    const mediaSourceRef = React.useRef<MediaSource | null>(null);
    const sourceBufferRef = React.useRef<SourceBuffer | null>(null);
    const streamManagerRef = React.useRef<VideoStreamManager | null>(null);
    const objectUrlRef = React.useRef<string | null>(null);
    const initializedUrlRef = React.useRef<string | null>(null); // Track which URL we've initialized for

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
    }, [index]); // CRITICAL FIX: Only depend on 'index' - component should NOT unmount/remount when media changes, only when slot changes

    // DEBUG: Log autoplay decision for testing
    React.useEffect(() => {
      const autoplayEnabled = wsTools.getHouseAutostart();
      console.log(`🎬 [Video Component #${index}] AutoPlay enabled:`, {
        autoplayEnabled,
        source: 'wsTools.getHouseAutostart()',
        timestamp: Date.now(),
      });
    }, [index]);

    // CRITICAL FIX: Force className update when hidden prop changes
    // Use useLayoutEffect to ensure this runs BEFORE paint, synchronously with DOM mutations
    React.useLayoutEffect(() => {
      if (ref && typeof ref === 'object' && ref.current) {
        const videoElement = ref.current as HTMLVideoElement;
        const newClassName = hidden ? 'video hidden' : 'video';
        const currentClassName = videoElement.className;

        console.log(`🎬 [Video Component #${index}] useLayoutEffect className check:`, {
          currentClassName,
          newClassName,
          hidden,
          needsUpdate: currentClassName !== newClassName,
        });

        if (currentClassName !== newClassName) {
          console.log(
            `🎬 [Video Component #${index}] Forcing className update: "${currentClassName}" -> "${newClassName}"`
          );
          videoElement.className = newClassName;

          // Verify immediately (synchronous)
          const verifyClassName = videoElement.className;
          const computedStyle = window.getComputedStyle(videoElement);
          console.log(`🎬 [Video Component #${index}] Verified className update:`, {
            className: verifyClassName,
            zIndex: computedStyle.zIndex,
            opacity: computedStyle.opacity,
            visibility: computedStyle.visibility,
          });
        }
      }
    }, [index, hidden, ref]);

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

    // CHUNK DELIVERY: Initialize MediaSource when needed
    const initializeChunkedStreaming = React.useCallback(
      async (videoEl: HTMLVideoElement, videoUrl: string, videoDuration: number) => {
        try {
          console.log(
            `🎬 [Video Component #${index}] Initializing chunked streaming for:`,
            videoUrl
          );

          // Create MediaSource
          const mediaSource = new MediaSource();
          mediaSourceRef.current = mediaSource;

          // Create object URL and set as video source
          const objectUrl = URL.createObjectURL(mediaSource);
          objectUrlRef.current = objectUrl;
          videoEl.src = objectUrl;

          // Wait for MediaSource to open
          await new Promise<void>((resolve, reject) => {
            mediaSource.addEventListener('sourceopen', () => resolve(), { once: true });
            mediaSource.addEventListener('error', e => reject(e), { once: true });
          });

          console.log(`🎬 [Video Component #${index}] MediaSource opened`);

          // Create SourceBuffer with video codec
          // Need full MIME type: 'video/mp4; codecs="..."'
          let mimeType: string;
          if (media?.codecs) {
            // If codecs provided, ensure it's in full MIME format
            if (media.codecs.startsWith('video/')) {
              mimeType = media.codecs;
            } else {
              // Add MIME type prefix
              mimeType = `video/mp4; codecs="${media.codecs}, mp4a.40.2"`;
            }
          } else {
            // Default H.264 baseline + AAC
            mimeType = 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"';
          }

          console.log(
            `🎬 [Video Component #${index}] Creating SourceBuffer with MIME type:`,
            mimeType
          );

          const sourceBuffer = mediaSource.addSourceBuffer(mimeType);
          sourceBufferRef.current = sourceBuffer;

          console.log(`🎬 [Video Component #${index}] SourceBuffer created successfully`);

          // Create and start stream manager
          const streamManager = new VideoStreamManager();
          streamManagerRef.current = streamManager;

          streamManager.setCallbacks({
            onChunkLoaded: (chunkIndex, data) => {
              console.log(
                `🎬 [Video Component #${index}] Chunk ${chunkIndex} loaded (${data.byteLength} bytes)`
              );

              // Hide spinner after first chunk loads (video is ready to play)
              if (chunkIndex === 0 && onVideoLoaded) {
                console.log(
                  `🎬 [Video Component #${index}] First chunk loaded, calling onVideoLoaded`
                );
                onVideoLoaded();
              }
            },
            onStreamComplete: () => {
              console.log(`🎬 [Video Component #${index}] Stream complete`);
            },
            onStreamError: error => {
              // Progressive MP4 is expected, don't log as error
              const errorMsg = error instanceof Error ? error.message : String(error);
              if (errorMsg.includes('Progressive MP4')) {
                console.log(
                  `📹 [Video Component #${index}] Progressive MP4 - will use direct streaming`
                );
              } else {
                console.error(`🎬 [Video Component #${index}] Stream error:`, error);
              }
            },
          });

          console.log(`🎬 [Video Component #${index}] About to call startStreaming`);

          await streamManager.startStreaming(videoUrl, videoDuration, mediaSource, sourceBuffer);

          console.log(`🎬 [Video Component #${index}] Chunked streaming started successfully`);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);

          // Check if this is expected (progressive MP4)
          if (errorMsg.includes('Progressive MP4') || errorMsg.includes('not compatible')) {
            console.log(
              `📹 [Video Component #${index}] Using direct streaming (progressive MP4 format)`
            );
          } else {
            console.error(
              `🎬 [Video Component #${index}] Failed to initialize chunked streaming:`,
              error
            );
          }

          // Fallback to direct streaming
          if (videoEl && media?.url) {
            console.log(`🎬 [Video Component #${index}] Loading via browser native streaming`);
            videoEl.src = media.url;
          }
        }
      },
      [index, media?.codecs, media?.url, onVideoLoaded]
    );

    // CHUNK DELIVERY: Setup MediaSource for large videos
    React.useEffect(() => {
      const videoElement = ref && typeof ref === 'object' ? ref.current : null;

      // Check if we should use chunked streaming
      const shouldUseChunking =
        withFragments && typeof MediaSource !== 'undefined' && media?.url && videoElement;

      // Skip if we've already initialized for this URL
      if (shouldUseChunking && videoElement && media && initializedUrlRef.current !== media.url) {
        console.log(
          `🎬 [Video Component #${index}] Setting up chunked streaming for:`,
          media.filename
        );

        // Mark this URL as initialized
        initializedUrlRef.current = media.url;

        // Initialize chunked streaming - duration will be discovered after first chunk
        initializeChunkedStreaming(videoElement, media.url, media.duration || 0);
      }

      // Cleanup function - only cleanup when URL actually changes
      return () => {
        // Only cleanup if the URL is actually changing
        if (initializedUrlRef.current && initializedUrlRef.current !== media?.url) {
          console.log(
            `🎬 [Video Component #${index}] Cleaning up stream manager (URL changed from ${initializedUrlRef.current} to ${media?.url})`
          );

          if (streamManagerRef.current) {
            streamManagerRef.current.destroy();
            streamManagerRef.current = null;
          }
          if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current);
            objectUrlRef.current = null;
          }
          mediaSourceRef.current = null;
          sourceBufferRef.current = null;
          initializedUrlRef.current = null;
        }
      };
    }, [media?.url, index, initializeChunkedStreaming]);

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
          `🎬 [Video Component #${index}] CSS check: z-index=${computedStyle.zIndex}, hidden=${hidden}, actualClassName="${videoElement.className}"`
        );
      }

      // REMOVED: Complex DOM manipulation and forced mounting logic
      // Components should mount naturally with React

      // CHUNK DELIVERY: Determine video source
      // If using chunked streaming, src will be set by MediaSource object URL
      // Otherwise, use direct URL
      const useChunking = withFragments && typeof MediaSource !== 'undefined' && media?.url;
      const videoSrc = useChunking ? '' : media?.url || ''; // Empty when chunking (will be set by effect)

      // CRITICAL FIX: Always render the video element, never unmount
      // Use CSS-based visibility instead of component unmounting to prevent DOM desynchronization
      const videoElement = (
        <video
          ref={ref}
          id={`video-${index}`}
          className={hidden ? 'video hidden' : 'video'} // Use hidden prop, not media check
          src={videoSrc} // Use chunking object URL or direct URL
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
          preload="auto" // Hint browser to use progressive loading with smaller chunks
          crossOrigin="anonymous" // Required for some browsers to use chunked loading properly
          onError={e => {
            const videoEl = e.currentTarget as HTMLVideoElement;

            // HTTP/2 Protocol Error Fix: Automatic retry with backoff
            if (videoEl.error) {
              const errorCode = videoEl.error.code;
              const errorMessage = videoEl.error.message;

              // Ignore errors when no media is loaded (initial render state)
              if (!media?.url) {
                // This is expected during initial render - video has no src yet
                return;
              }

              console.warn(
                `⚠️ [Video #${index}] Playback error (attempt ${errorRetryCount.current + 1}/${maxRetries}):`,
                {
                  filename: media?.filename,
                  url: media?.url,
                  errorCode,
                  errorMessage,
                  networkState: videoEl.networkState,
                  readyState: videoEl.readyState,
                }
              );

              // Retry on network errors (MEDIA_ERR_NETWORK = 2, MEDIA_ERR_SRC_NOT_SUPPORTED = 4)
              if ((errorCode === 2 || errorCode === 4) && errorRetryCount.current < maxRetries) {
                errorRetryCount.current++;

                console.log(
                  `🔄 [Video #${index}] Retrying in ${retryDelay}ms (attempt ${errorRetryCount.current}/${maxRetries})...`
                );

                setTimeout(() => {
                  if (videoEl && media?.url) {
                    console.log(`🔄 [Video #${index}] Attempting reload...`);
                    videoEl.load(); // Reload the video
                    videoEl.play().catch(err => {
                      console.warn(`[Video #${index}] Play failed after retry:`, err.message);
                    });
                  } else {
                    console.log(`🔄 [Video #${index}] Skipping retry - media no longer available`);
                  }
                }, retryDelay * errorRetryCount.current); // Exponential backoff: 2s, 4s, 6s
              } else if (errorRetryCount.current >= maxRetries) {
                console.error(
                  `❌ [Video #${index}] Max retries (${maxRetries}) reached, giving up`
                );
              }
            }
          }}
          onLoadedData={() => {
            // Reset retry count on successful load
            errorRetryCount.current = 0;
            console.log(`✅ [Video #${index}] LOADED:`, media?.filename, 'URL:', media?.url);
            if (onVideoLoaded) {
              onVideoLoaded();
            }
          }}
          onStalled={e => {
            // HTTP/2 Protocol Error Fix: Handle stalled playback
            const videoEl = e.currentTarget as HTMLVideoElement;
            console.warn(`⏸️ [Video #${index}] Playback stalled:`, {
              filename: media?.filename,
              buffered: videoEl.buffered.length > 0 ? `${videoEl.buffered.end(0)}s` : '0s',
              currentTime: videoEl.currentTime,
              readyState: videoEl.readyState,
            });

            // Try to resume playback
            if (videoEl.readyState >= 2) {
              // HAVE_CURRENT_DATA or higher
              console.log(`🔄 [Video #${index}] Attempting to resume stalled video...`);
              videoEl.play().catch(err => {
                console.warn(`[Video #${index}] Resume failed:`, err.message);
              });
            }
          }}
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
          mediaUrl: media?.url,
          mediaFilename: media?.filename,
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
