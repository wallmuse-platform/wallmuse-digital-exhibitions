import { ChunkManager } from './ChunkManager';
import { LogHelper } from './LogHelper';

interface StreamState {
  isStreaming: boolean;
  currentChunk: number;
  totalChunks: number;
  downloadedBytes: number;
  totalBytes: number;
  bufferEnd: number;
  playbackPosition: number;
}

interface StreamCallbacks {
  onChunkLoaded?: (chunkIndex: number, data: ArrayBuffer) => void;
  onStreamComplete?: () => void;
  onStreamError?: (error: Error) => void;
  onBufferUpdate?: (bufferEnd: number) => void;
}

export class VideoStreamManager {
  private chunkManager: ChunkManager;
  private mediaSource?: MediaSource;
  private sourceBuffer?: SourceBuffer;
  private streamState: StreamState;
  private callbacks: StreamCallbacks;
  private videoUrl: string;
  private videoDuration: number;
  private isDestroyed = false;

  constructor() {
    this.chunkManager = ChunkManager.getInstance();
    this.streamState = {
      isStreaming: false,
      currentChunk: 0,
      totalChunks: 0,
      downloadedBytes: 0,
      totalBytes: 0,
      bufferEnd: 0,
      playbackPosition: 0,
    };
    this.callbacks = {};
    this.videoUrl = '';
    this.videoDuration = 0;
  }

  public setCallbacks(callbacks: StreamCallbacks) {
    this.callbacks = callbacks;
  }

  public async startStreaming(
    videoUrl: string,
    videoDuration: number,
    mediaSource: MediaSource,
    sourceBuffer: SourceBuffer
  ): Promise<void> {
    if (this.isDestroyed) return;

    this.videoUrl = videoUrl;
    this.videoDuration = videoDuration;
    this.mediaSource = mediaSource;
    this.sourceBuffer = sourceBuffer;

    // Cancel any existing requests for this URL
    this.chunkManager.cancelRequestsForUrl(videoUrl);

    try {
      console.log('[VideoStreamManager] Getting video size...');
      // Get video size first
      await this.getVideoSize();

      console.log(
        `[VideoStreamManager] Video size: ${this.streamState.totalBytes} bytes, ${this.streamState.totalChunks} chunks`
      );

      // Start streaming
      this.streamState.isStreaming = true;
      this.streamState.currentChunk = 0;
      this.streamState.downloadedBytes = 0;

      // LogHelper.log('VideoStreamManager', `Starting stream: ${this.streamState.totalChunks} chunks, ${this.streamState.totalBytes} bytes`);

      console.log('[VideoStreamManager] Loading initial chunks...');
      // Start with first few chunks
      await this.loadInitialChunks();

      console.log('[VideoStreamManager] Initial chunks loaded successfully');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      // Progressive MP4 is expected - use warning, not error
      if (errorMsg.includes('Progressive MP4')) {
        console.warn(
          '[VideoStreamManager] Progressive MP4 detected - falling back to direct streaming'
        );
        LogHelper.log('VideoStreamManager', 'Using direct streaming for progressive MP4');
      } else {
        console.error('[VideoStreamManager] ERROR in startStreaming:', error);
        LogHelper.error('VideoStreamManager', 'Failed to start streaming:', error);
      }

      this.callbacks.onStreamError?.(error as Error);
      throw error; // Re-throw so video.tsx can handle it
    }
  }

  private async getVideoSize(): Promise<void> {
    // Create timeout with AbortController for browser compatibility (Safari 15, older browsers)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    // Fetch first 100KB to check MP4 structure
    const response = await fetch(this.videoUrl, {
      headers: { Range: 'bytes=0-102399' },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Failed to get video size: ${response.status}`);
    }

    const range = response.headers.get('Content-Range');
    if (!range) {
      throw new Error('No Content-Range header received');
    }

    this.streamState.totalBytes = parseInt(range.split('/')[1]);
    this.streamState.totalChunks = Math.ceil(
      this.streamState.totalBytes / this.chunkManager.getStats().config.chunkSize
    );

    // Check MP4 structure to detect if fragmented
    const buffer = await response.arrayBuffer();
    const isFragmented = this.detectFragmentedMP4(new Uint8Array(buffer));

    if (!isFragmented) {
      console.warn(
        '[VideoStreamManager] Progressive MP4 detected - will use direct streaming (expected for HandBrake baseline)'
      );
      throw new Error('Progressive MP4 format - not compatible with MediaSource streaming');
    }

    console.log(
      '[VideoStreamManager] Fragmented MP4 detected - proceeding with MediaSource streaming'
    );
  }

  private detectFragmentedMP4(data: Uint8Array): boolean {
    // Parse MP4 boxes to detect if it's fragmented
    let offset = 0;
    let hasMoof = false;

    while (offset < Math.min(data.length - 8, 100000)) {
      // Read box size (4 bytes, big-endian)
      const size =
        (data[offset] << 24) |
        (data[offset + 1] << 16) |
        (data[offset + 2] << 8) |
        data[offset + 3];

      // Read box type (4 bytes, ASCII)
      const type = String.fromCharCode(
        data[offset + 4],
        data[offset + 5],
        data[offset + 6],
        data[offset + 7]
      );

      if (type === 'moof') {
        hasMoof = true;
        break;
      }

      // Move to next box
      if (size === 0 || size === 1 || size > data.length) break;
      offset += size;
    }

    return hasMoof;
  }

  private async loadInitialChunks(): Promise<void> {
    // For progressive MP4, we need to load enough to get the moov atom (initialization segment)
    // This is typically in the first 1-5MB. Let's load first 5MB to be safe.
    const initSegmentSize = 5 * 1024 * 1024; // 5MB - increased to capture full moov atom
    const chunkSize = this.chunkManager.getStats().config.chunkSize;
    const initialChunks = Math.min(
      Math.ceil(initSegmentSize / chunkSize),
      this.streamState.totalChunks
    );

    console.log(
      `[VideoStreamManager] Loading ${initialChunks} initial chunks (${initSegmentSize} bytes for init segment)...`
    );

    for (let i = 0; i < initialChunks; i++) {
      if (this.isDestroyed) {
        console.log(`[VideoStreamManager] Destroyed during initial chunk loading at chunk ${i}`);
        return;
      }
      console.log(`[VideoStreamManager] About to load chunk ${i}...`);
      await this.loadChunk(i);
      console.log(`[VideoStreamManager] Chunk ${i} loaded`);
    }

    console.log(
      `[VideoStreamManager] All ${initialChunks} initial chunks loaded, starting background streaming...`
    );
    // Start background loading
    this.continueStreaming();
  }

  private async loadChunk(chunkIndex: number): Promise<void> {
    console.log(
      `[VideoStreamManager.loadChunk] ENTRY: chunk ${chunkIndex}, destroyed=${this.isDestroyed}, hasSourceBuffer=${!!this.sourceBuffer}, mediaSourceState=${this.mediaSource?.readyState}`
    );

    if (this.isDestroyed || !this.sourceBuffer || this.mediaSource?.readyState !== 'open') {
      console.log(
        `[VideoStreamManager.loadChunk] Skipping chunk ${chunkIndex} - conditions not met`
      );
      return;
    }

    const chunkSize = this.chunkManager.getStats().config.chunkSize;
    const startByte = chunkIndex * chunkSize;
    const endByte = Math.min(startByte + chunkSize - 1, this.streamState.totalBytes - 1);

    try {
      console.log(
        `[VideoStreamManager.loadChunk] Requesting chunk ${chunkIndex}: bytes ${startByte}-${endByte}`
      );

      const chunkResponse = await this.chunkManager.requestChunk(
        this.videoUrl,
        startByte,
        endByte,
        'normal'
      );

      console.log(
        `[VideoStreamManager.loadChunk] Chunk ${chunkIndex} received: ${chunkResponse.data.byteLength} bytes`
      );

      if (this.isDestroyed) {
        console.log(
          `[VideoStreamManager.loadChunk] Destroyed after receiving chunk ${chunkIndex}, aborting`
        );
        return;
      }

      // Append to source buffer
      if (this.sourceBuffer && this.mediaSource?.readyState === 'open') {
        console.log(
          `[VideoStreamManager.loadChunk] Appending chunk ${chunkIndex} to SourceBuffer...`
        );
        // Wait for SourceBuffer to finish processing before calling callback
        await new Promise<void>((resolve, reject) => {
          const onUpdateEnd = () => {
            console.log(
              `[VideoStreamManager.loadChunk] SourceBuffer updateend event fired for chunk ${chunkIndex}`
            );
            this.sourceBuffer!.removeEventListener('updateend', onUpdateEnd);
            this.sourceBuffer!.removeEventListener('error', onError);
            resolve();
          };
          const onError = (e: Event) => {
            console.error(
              `[VideoStreamManager.loadChunk] SourceBuffer error event fired for chunk ${chunkIndex}:`,
              e
            );
            this.sourceBuffer!.removeEventListener('updateend', onUpdateEnd);
            this.sourceBuffer!.removeEventListener('error', onError);
            reject(new Error('SourceBuffer update failed'));
          };

          this.sourceBuffer!.addEventListener('updateend', onUpdateEnd, { once: true });
          this.sourceBuffer!.addEventListener('error', onError, { once: true });

          console.log(
            `[VideoStreamManager.loadChunk] Calling appendBuffer for chunk ${chunkIndex}...`
          );
          this.sourceBuffer.appendBuffer(chunkResponse.data);
          console.log(
            `[VideoStreamManager.loadChunk] appendBuffer called for chunk ${chunkIndex}, waiting for updateend...`
          );
        });

        console.log(
          `[VideoStreamManager.loadChunk] SourceBuffer processing complete for chunk ${chunkIndex}`
        );

        this.streamState.downloadedBytes += chunkResponse.data.byteLength;
        this.streamState.currentChunk = chunkIndex + 1;

        // LogHelper.log('VideoStreamManager', `Chunk ${chunkIndex} loaded: ${chunkResponse.data.byteLength} bytes`);

        console.log(
          `[VideoStreamManager.loadChunk] Calling onChunkLoaded callback for chunk ${chunkIndex}`
        );
        // Call callback AFTER SourceBuffer has finished processing
        this.callbacks.onChunkLoaded?.(chunkIndex, chunkResponse.data);
        console.log(`[VideoStreamManager.loadChunk] Callback completed for chunk ${chunkIndex}`);
      } else {
        console.log(
          `[VideoStreamManager.loadChunk] Skipping append for chunk ${chunkIndex} - SourceBuffer not ready`
        );
      }
    } catch (error) {
      console.error(`[VideoStreamManager.loadChunk] ERROR loading chunk ${chunkIndex}:`, error);
      LogHelper.error('VideoStreamManager', `Failed to load chunk ${chunkIndex}:`, error);

      // If this is an init chunk (first few chunks), this is fatal - re-throw
      if (chunkIndex < 4) {
        throw error;
      }
      // Otherwise, don't throw - let background loading continue
    }
  }

  private async continueStreaming(): Promise<void> {
    while (this.streamState.isStreaming && !this.isDestroyed) {
      // Check if we need more chunks
      if (this.shouldLoadMoreChunks()) {
        const nextChunk = this.streamState.currentChunk;
        if (nextChunk < this.streamState.totalChunks) {
          await this.loadChunk(nextChunk);
        } else {
          // All chunks loaded
          this.streamState.isStreaming = false;
          this.callbacks.onStreamComplete?.();
          break;
        }
      }

      // Wait a bit before checking again
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  private shouldLoadMoreChunks(): boolean {
    if (!this.sourceBuffer) return false;

    // Check buffer status
    if (this.sourceBuffer.buffered.length > 0) {
      this.streamState.bufferEnd = this.sourceBuffer.buffered.end(0);
      this.callbacks.onBufferUpdate?.(this.streamState.bufferEnd);
    }

    // Load more if buffer is less than 5 seconds ahead
    const bufferAhead = this.streamState.bufferEnd - this.streamState.playbackPosition;
    return bufferAhead < 5;
  }

  public updatePlaybackPosition(position: number): void {
    this.streamState.playbackPosition = position;
  }

  public pauseStreaming(): void {
    this.streamState.isStreaming = false;
    LogHelper.log('VideoStreamManager', 'Streaming paused');
  }

  public resumeStreaming(): void {
    if (!this.isDestroyed) {
      this.streamState.isStreaming = true;
      this.continueStreaming();
      LogHelper.log('VideoStreamManager', 'Streaming resumed');
    }
  }

  public destroy(): void {
    this.isDestroyed = true;
    this.streamState.isStreaming = false;
    this.chunkManager.cancelRequestsForUrl(this.videoUrl);

    // Clean up MediaSource
    if (this.mediaSource && this.mediaSource.readyState === 'open') {
      try {
        this.mediaSource.endOfStream();
      } catch (e) {
        // Ignore errors during cleanup
      }
    }

    this.mediaSource = undefined;
    this.sourceBuffer = undefined;

    LogHelper.log('VideoStreamManager', 'Destroyed');
  }

  public getState(): StreamState {
    return { ...this.streamState };
  }

  public getStats() {
    return {
      ...this.streamState,
      chunkManagerStats: this.chunkManager.getStats(),
    };
  }
}

// Add to window for debugging
if (typeof window !== 'undefined') {
  (window as any).VideoStreamManager = VideoStreamManager;
}
