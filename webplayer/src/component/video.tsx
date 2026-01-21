import { VideoMediaFile } from '../media/VideoMediaFile';
import React from 'react';
import { wsTools } from '../manager/start';
import { Sequencer } from '../manager/Sequencer';

// --- GLOBAL INTERFACES (Preserved) ---
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
      forceDOMSync: () => void;
    };
  }
}

interface VideoProps {
  media?: VideoMediaFile | null;
  hidden: boolean;
  index: number;
  shouldLoad?: boolean;
  onVideoLoaded?: () => void;
}

const withFragments = true; // DISABLED - chunk streaming causing frozen video on goMontage navigation

export const Video = React.forwardRef<HTMLVideoElement, VideoProps>(
  ({ media, hidden, index, shouldLoad = true, onVideoLoaded }, ref) => {
    // MediaSource Refs
    const mediaSourceRef = React.useRef<MediaSource | null>(null);
    const sourceBufferRef = React.useRef<SourceBuffer | null>(null);
    const objectUrlRef = React.useRef<string | null>(null);
    const initializedUrlRef = React.useRef<string | null>(null);

    // Worker Control Refs
    const isStreamingRef = React.useRef(false);
    const abortControllerRef = React.useRef<AbortController | null>(null);
    const downloadedRef = React.useRef<number>(0);
    const lengthRef = React.useRef<number>(0);

    // Track state in Ref for the Worker loop (avoids dependency closures)
    const mediaRef = React.useRef(media);
    React.useEffect(() => {
      mediaRef.current = media;
    }, [media]);

    const getPlayerPosition = React.useCallback(() => {
      const p = Sequencer.getCurrentPosition();
      const currentFilename = p?.getArtwork()?.filename;
      const thisFilename = mediaRef.current?.filename;

      // CRITICAL FIX: Use video element's currentTime directly if this is the active video
      // This works around Sequencer's playback timer not running
      if (ref && typeof ref === 'object' && ref.current && currentFilename === thisFilename) {
        const videoTime = ref.current.currentTime;

        // Debug logging every 20 seconds
        const now = Date.now();
        const lastLog = (window as any)[`lastPosLog_${index}`] || 0;
        if (now - lastLog > 20000) {
          console.log(`🎬 [Video #${index}] Position check:`, {
            currentFilename,
            thisFilename,
            matches: true,
            videoElementTime: videoTime,
            sequencerOffset: p?.getMediaOffset() || 0,
            usingVideoTime: true,
          });
          (window as any)[`lastPosLog_${index}`] = now;
        }

        return videoTime;
      }

      return 0;
    }, [index, ref]);

    /**
     * WORKER: Now with proactive cleaning for large files
     */
    const startBufferWorker = React.useCallback(async () => {
      if (isStreamingRef.current || !mediaRef.current?.url) return;
      isStreamingRef.current = true;

      // Dynamic chunking: 4MB for very large files (>500MB), 2MB for large (>100MB), 512KB for small
      const CHUNK_SIZE =
        lengthRef.current > 500 * 1024 * 1024
          ? 4096 * 1024
          : lengthRef.current > 100 * 1024 * 1024
            ? 2048 * 1024
            : 512 * 1024;
      // Dynamic buffer ahead: Keep reasonable to avoid QuotaExceededError
      // For very large files, use smaller buffer to stay under ~200MB browser quota
      const MAX_BUFFER_AHEAD =
        lengthRef.current > 1000 * 1024 * 1024
          ? 20 // >1GB: 20s
          : lengthRef.current > 500 * 1024 * 1024
            ? 30 // >500MB: 30s
            : 40; // smaller files: 40s

      console.log(
        `🎬 [Video #${index}] Worker started: ${Math.round(lengthRef.current / 1024 / 1024)}MB file, ${Math.round(CHUNK_SIZE / 1024)}KB chunks`
      );

      let lastLoggedPercent = 0;

      try {
        while (downloadedRef.current < lengthRef.current && isStreamingRef.current) {
          const sb = sourceBufferRef.current;
          const ms = mediaSourceRef.current;

          // CRITICAL: Stop if MediaSource is not in 'open' state
          if (!ms || !sb) {
            console.log(
              `🎬 [Video #${index}] Worker stopped: MediaSource or SourceBuffer detached`
            );
            break;
          }

          if (ms.readyState !== 'open') {
            console.log(
              `🎬 [Video #${index}] Worker stopped: MediaSource readyState is '${ms.readyState}' (not 'open')`
            );
            break;
          }

          const pos = getPlayerPosition();
          let endBuffer = 0;
          try {
            endBuffer = sb.buffered.length > 0 ? sb.buffered.end(sb.buffered.length - 1) : 0;
          } catch (e) {
            break;
          }

          // 1. PROACTIVE GARBAGE COLLECTION
          // Different strategies for ACTIVE (playing) vs BACKGROUND (preloading) videos
          if (sb.buffered.length > 0 && !sb.updating) {
            const startBuffer = sb.buffered.start(0);
            const bufferDuration = endBuffer - startBuffer;

            if (pos > 0) {
              // ACTIVE VIDEO (currently playing): Keep only 10s behind playback position
              if (pos > 20 && startBuffer < pos - 10) {
                console.log(
                  `🎬 [Video #${index}] 🧹 [ACTIVE] Cleaning: ${startBuffer.toFixed(1)}s → ${(pos - 10).toFixed(1)}s`
                );
                sb.remove(0, pos - 10);
                await new Promise(resolve => {
                  sb.onupdateend = resolve;
                });
              }
            } else {
              // BACKGROUND VIDEO (preloading): Limit total buffer to 20s to prevent QuotaExceededError
              // This prevents memory exhaustion for videos loading in background
              const MAX_BACKGROUND_BUFFER = 20; // 20 seconds max for background videos

              if (bufferDuration > MAX_BACKGROUND_BUFFER) {
                const removeEnd = endBuffer - MAX_BACKGROUND_BUFFER;
                console.log(
                  `🎬 [Video #${index}] 🧹 [BACKGROUND] Cleaning: ${startBuffer.toFixed(1)}s → ${removeEnd.toFixed(1)}s (buffer: ${bufferDuration.toFixed(1)}s)`
                );
                sb.remove(startBuffer, removeEnd);
                await new Promise(resolve => {
                  sb.onupdateend = resolve;
                });
              }
            }
          }

          // 2. BACKPRESSURE
          if (endBuffer > pos + MAX_BUFFER_AHEAD) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }

          // 3. FETCH & APPEND
          const startByte = downloadedRef.current;
          const endByte = Math.min(startByte + CHUNK_SIZE, lengthRef.current) - 1;

          const response = await fetch(`${mediaRef.current.url}&frag=1`, {
            headers: { Range: `bytes=${startByte}-${endByte}` },
            signal: abortControllerRef.current?.signal,
          });

          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const arrayBuffer = await response.arrayBuffer();

          if (!isStreamingRef.current || !sourceBufferRef.current) break;

          // Check MediaSource is still open before appending
          if (mediaSourceRef.current?.readyState !== 'open') {
            console.log(
              `🎬 [Video #${index}] MediaSource no longer open (state: ${mediaSourceRef.current?.readyState}), stopping worker`
            );
            break;
          }

          if (sb.updating)
            await new Promise(resolve => {
              sb.onupdateend = resolve;
            });

          // 4. APPEND with QuotaExceededError fallback
          try {
            // Final check before append - MediaSource must be open
            if (mediaSourceRef.current?.readyState !== 'open') {
              console.log(
                `🎬 [Video #${index}] MediaSource closed before append (state: ${mediaSourceRef.current?.readyState}), stopping`
              );
              break;
            }

            await new Promise<void>((resolve, reject) => {
              const currentSb = sourceBufferRef.current;
              if (!currentSb || mediaSourceRef.current?.readyState !== 'open') {
                return reject(new Error('MediaSource closed'));
              }
              currentSb.onupdateend = () => {
                currentSb.onupdateend = null;

                // CRITICAL: Notify App FIRST, then start playback
                // This ensures App can set up seek position before play() is called
                if (downloadedRef.current === 0 && window.TheApp?.videoReadyForSeek) {
                  window.TheApp.videoReadyForSeek(`video-${index}`);
                }

                resolve();
              };
              currentSb.onerror = e =>
                reject(new Error(`SourceBuffer error: ${mediaSourceRef.current?.readyState}`));
              currentSb.appendBuffer(arrayBuffer);
            });

            const isFirstChunk = downloadedRef.current === 0;
            downloadedRef.current = endByte + 1;

            // CRITICAL: Call onVideoLoaded AFTER first chunk is appended (video now has data)
            if (isFirstChunk) {
              console.log(`🎬 [Video #${index}] First chunk loaded successfully, signaling ready`);
              if (onVideoLoaded) {
                console.log(`🎬 [Video #${index}] Calling onVideoLoaded (first chunk ready)`);
                onVideoLoaded();
              }
            }

            // Start playback AFTER the first chunk is fully appended
            if (isFirstChunk && ref && typeof ref === 'object' && ref.current) {
              const shouldAutoplay = wsTools.getHouseAutostart();
              console.log(
                `🎬 [Video #${index}] First chunk loaded, autoplay: ${shouldAutoplay}, video state:`,
                {
                  paused: ref.current.paused,
                  readyState: ref.current.readyState,
                  currentTime: ref.current.currentTime,
                }
              );

              if (shouldAutoplay) {
                ref.current
                  .play()
                  .then(() => {
                    console.log(`🎬 [Video #${index}] ✅ Autoplay SUCCESS - video playing`);
                  })
                  .catch(err => {
                    console.warn(`🎬 [Video #${index}] ❌ Autoplay FAILED:`, err.name, err.message);
                  });
              }
            }

            // Progress logging every 10%
            const percent = Math.floor((downloadedRef.current / lengthRef.current) * 100);
            if (percent >= lastLoggedPercent + 10 && percent <= 100) {
              console.log(
                `🎬 [Video #${index}] Progress: ${percent}% (${Math.round(downloadedRef.current / 1024 / 1024)}MB / ${Math.round(lengthRef.current / 1024 / 1024)}MB)`
              );
              lastLoggedPercent = percent;
            }
          } catch (e: any) {
            if (e.name === 'QuotaExceededError') {
              console.warn(`🎬 [Video #${index}] ⚠️ QuotaExceededError - emergency buffer clear`);
              // Emergency: Clear everything except 5s before and 20s after current position
              if (sb.buffered.length > 0 && !sb.updating) {
                const clearStart = Math.max(0, pos - 5);
                const clearEnd = pos + 20;
                if (clearStart < clearEnd) {
                  console.log(
                    `🎬 [Video #${index}] 🆘 Emergency clear: keep ${clearStart.toFixed(1)}s → ${clearEnd.toFixed(1)}s`
                  );
                  // Remove before
                  if (sb.buffered.start(0) < clearStart) {
                    sb.remove(sb.buffered.start(0), clearStart);
                    await new Promise(resolve => {
                      sb.onupdateend = resolve;
                    });
                  }
                  // Remove after
                  if (sb.buffered.end(sb.buffered.length - 1) > clearEnd) {
                    sb.remove(clearEnd, sb.buffered.end(sb.buffered.length - 1));
                    await new Promise(resolve => {
                      sb.onupdateend = resolve;
                    });
                  }
                }
              }
              await new Promise(resolve => setTimeout(resolve, 2000)); // Cool down 2s
              continue; // Retry this chunk
            } else {
              throw e; // Re-throw other errors
            }
          }
        }

        // Only call endOfStream if we've downloaded EVERYTHING and MediaSource is still open
        if (
          downloadedRef.current >= lengthRef.current &&
          mediaSourceRef.current?.readyState === 'open'
        ) {
          console.log(
            `🎬 [Video #${index}] Download complete (${Math.round(downloadedRef.current / 1024 / 1024)}MB), calling endOfStream()`
          );
          mediaSourceRef.current.endOfStream();
        } else if (downloadedRef.current < lengthRef.current) {
          console.log(
            `🎬 [Video #${index}] Worker stopped early: ${Math.round(downloadedRef.current / 1024 / 1024)}MB / ${Math.round(lengthRef.current / 1024 / 1024)}MB downloaded (${Math.round((downloadedRef.current / lengthRef.current) * 100)}%)`
          );
        }
      } catch (err: any) {
        // Ignore expected errors: AbortError, MediaSource closed (normal during navigation)
        const isExpectedError =
          err.name === 'AbortError' ||
          err.message?.includes('MediaSource closed') ||
          err.message?.includes('SourceBuffer error') ||
          mediaSourceRef.current?.readyState !== 'open';
        if (!isExpectedError) {
          console.error(`🎬 [Video #${index}] Worker Error:`, err);
          console.error(`🎬 [Video #${index}] Error details:`, {
            name: err?.name,
            message: err?.message,
            stack: err?.stack,
            downloadProgress: `${downloadedRef.current} / ${lengthRef.current}`,
            mediaSourceState: mediaSourceRef.current?.readyState,
          });
        }
      } finally {
        isStreamingRef.current = false;
      }
    }, [index, getPlayerPosition]);

    // DOM SYNC: Restoration of manual class handling
    React.useLayoutEffect(() => {
      if (ref && typeof ref === 'object' && ref.current) {
        const videoElement = ref.current;
        const targetClass = hidden ? 'video hidden' : 'video';
        if (videoElement.className !== targetClass) {
          videoElement.className = targetClass;
          if (window.TheApp?.forceDOMSync) window.TheApp.forceDOMSync();
        }

        // CRITICAL FIX: Stop background worker when video becomes hidden
        // This prevents "noisy neighbor" resource contention
        if (hidden && isStreamingRef.current) {
          console.log(
            `🎬 [Video #${index}] Hidden - pausing background worker for: ${mediaRef.current?.filename}`
          );
          isStreamingRef.current = false;
          // DON'T abort - just stop the loop by setting isStreamingRef to false
          // The worker loop will exit gracefully at line 104
          // Pause the video to save CPU
          videoElement.pause();
        }
      }
    }, [hidden, ref, index]);

    // MAIN INITIALIZATION
    React.useEffect(() => {
      const videoEl = ref && typeof ref === 'object' ? ref.current : null;
      if (!shouldLoad || !media?.url || !videoEl || initializedUrlRef.current === media.url) {
        if (!shouldLoad || !media?.url) {
          isStreamingRef.current = false;
          abortControllerRef.current?.abort();
          initializedUrlRef.current = null;
        }
        return;
      }

      console.log(`🎬 [Video #${index}] Mounting Video: ${media.filename}`);
      const mediaSourceSupported = typeof MediaSource !== 'undefined';
      console.log(`🎬 [Video #${index}] MediaSource supported:`, mediaSourceSupported);

      initializedUrlRef.current = media.url;
      isStreamingRef.current = false;
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      // iOS/Safari fallback: Use direct src if MediaSource not available
      if (!mediaSourceSupported || !withFragments) {
        console.log(
          `🎬 [Video #${index}] Using direct src (iOS/Safari mode - browser will handle buffering)`
        );

        // Use URL directly - no &frag=1 needed (server streams file as-is)
        const directUrl = media.url;
        console.log(`🎬 [Video #${index}] Direct URL:`, directUrl);
        videoEl.src = directUrl;

        // Wait for video to have enough data before calling onVideoLoaded
        const onCanPlay = () => {
          console.log(
            `🎬 [Video #${index}] Video ready (canplay event), readyState:`,
            videoEl.readyState
          );
          if (onVideoLoaded) {
            console.log(`🎬 [Video #${index}] Calling onVideoLoaded (direct src mode)`);
            onVideoLoaded();
          }
        };

        videoEl.addEventListener('canplay', onCanPlay, { once: true });

        return () => {
          console.log(`🎬 [Video #${index}] Cleanup (direct src mode) for: ${media?.filename}`);
          videoEl.removeEventListener('canplay', onCanPlay);
        };
      }

      // Desktop: Use MediaSource for chunked streaming
      const ms = new MediaSource();
      mediaSourceRef.current = ms;
      objectUrlRef.current = URL.createObjectURL(ms);
      videoEl.src = objectUrlRef.current;

      console.log(`🎬 [Video #${index}] MediaSource created, readyState: ${ms.readyState}`);
      console.log(`🎬 [Video #${index}] Adding sourceopen listener...`);

      const onSourceOpen = async () => {
        console.log(`🎬 [Video #${index}] 🎉 sourceopen event fired! ReadyState: ${ms.readyState}`);
        ms.removeEventListener('sourceopen', onSourceOpen);
        try {
          // Filter out unsupported codecs (text/subtitle tracks not supported by MediaSource)
          const rawCodecs = media.codecs ?? 'avc1.42C028, mp4a.40.2';
          const filteredCodecs = rawCodecs
            .split(',')
            .map((c: string) => c.trim())
            .filter(
              (c: string) => !c.includes('text') && !c.includes('wvtt') && !c.includes('stpp')
            )
            .join(', ');
          const codecs = filteredCodecs || 'avc1.42C028, mp4a.40.2';
          console.log(`🎬 [Video #${index}] Codecs: raw="${rawCodecs}" → filtered="${codecs}"`);
          const sb = ms.addSourceBuffer(`video/mp4; codecs="${codecs}"`);
          sb.mode = 'segments';
          sourceBufferRef.current = sb;

          const headRes = await fetch(`${media.url}&frag=1`, { headers: { Range: 'bytes=0-1' } });
          const range = headRes.headers.get('Content-Range');
          lengthRef.current = parseFloat(range!.split('/')[1]);
          downloadedRef.current = 0;

          // Start the worker in background (do NOT await - it runs until video is fully loaded!)
          // NOTE: onVideoLoaded will be called from the worker AFTER the first chunk is appended
          startBufferWorker();
        } catch (e) {
          console.error('MSE Failed, Falling back to direct src', e);
          videoEl.src = media.url!;
        }
      };

      ms.addEventListener('sourceopen', onSourceOpen);

      return () => {
        console.log(`🎬 [Video #${index}] Cleanup triggered for: ${media?.filename}`);
        isStreamingRef.current = false;
        abortControllerRef.current?.abort();
        if (objectUrlRef.current) {
          console.log(`🎬 [Video #${index}] Revoking blob URL: ${objectUrlRef.current}`);
          URL.revokeObjectURL(objectUrlRef.current);
          objectUrlRef.current = null;
        }
      };
    }, [media?.url, media?.filename, index, shouldLoad, ref]);

    return (
      <video
        ref={ref}
        id={`video-${index}`}
        className={`video ${hidden ? 'hidden' : ''}`}
        data-filename={media?.filename || 'none'}
        data-index={index}
        data-hidden={hidden}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          position: 'absolute',
          top: 0,
          left: 0,
          // opacity and visibility now controlled by CSS classes
        }}
        autoPlay={wsTools.getHouseAutostart()}
        loop={media?.loop || false}
        playsInline
        muted
        preload="auto"
        crossOrigin="anonymous"
        onStalled={() => console.warn(`🎬 [Video #${index}] Stalled - Buffer empty?`)}
        onLoadedData={() => console.log(`🎬 [Video #${index}] Data Loaded (Ready)`)}
      />
    );
  }
);
