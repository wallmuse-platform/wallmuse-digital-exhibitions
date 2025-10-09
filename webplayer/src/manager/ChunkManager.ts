import { LogHelper } from './LogHelper';

interface ChunkRequest {
  url: string;
  startByte: number;
  endByte: number;
  priority: 'high' | 'normal' | 'low';
  abortController?: AbortController;
}

interface ChunkResponse {
  data: ArrayBuffer;
  startByte: number;
  endByte: number;
  loadTime: number;
}

interface VideoStreamConfig {
  chunkSize: number;
  aheadTime: number;
  maxConcurrentChunks: number;
  retryAttempts: number;
  retryDelay: number;
  timeout: number;
}

export class ChunkManager {
  private static instance: ChunkManager;
  private activeRequests: Map<string, ChunkRequest> = new Map();
  private requestQueue: ChunkRequest[] = [];
  private processingQueue = false;
  private config: VideoStreamConfig;

  private constructor() {
    this.config = {
      chunkSize: 512 * 1024, // 512KB chunks for better real-time performance
      aheadTime: 5, // 5 seconds ahead
      maxConcurrentChunks: 1, // Reduced: Prevent connection pool exhaustion
      retryAttempts: 2,
      retryDelay: 1000,
      timeout: 8000,
    };
  }

  public static getInstance(): ChunkManager {
    if (!ChunkManager.instance) {
      ChunkManager.instance = new ChunkManager();
    }
    return ChunkManager.instance;
  }

  public setConfig(config: Partial<VideoStreamConfig>) {
    this.config = { ...this.config, ...config };
  }

  public async requestChunk(
    url: string,
    startByte: number,
    endByte: number,
    priority: 'high' | 'normal' | 'low' = 'normal'
  ): Promise<ChunkResponse> {
    const requestId = `${url}-${startByte}-${endByte}`;

    // Check if already requested
    if (this.activeRequests.has(requestId)) {
      const existing = this.activeRequests.get(requestId)!;
      if (priority === 'high' && existing.priority !== 'high') {
        // Upgrade priority
        existing.priority = 'high';
        this.reorderQueue();
      }
      // Return existing promise or wait for completion
      return this.waitForRequest(requestId);
    }

    const abortController = new AbortController();
    const request: ChunkRequest = {
      url,
      startByte,
      endByte,
      priority,
      abortController,
    };

    this.activeRequests.set(requestId, request);

    if (this.activeRequests.size < this.config.maxConcurrentChunks) {
      return this.processRequest(requestId, request);
    } else {
      // Add to queue
      this.requestQueue.push(request);
      this.reorderQueue();
      return this.waitForRequest(requestId);
    }
  }

  private async processRequest(requestId: string, request: ChunkRequest): Promise<ChunkResponse> {
    const startTime = Date.now();
    let attempts = 0;

    while (attempts <= this.config.retryAttempts) {
      try {
        const response = await fetch(request.url + '&frag=1', {
          headers: {
            Range: `bytes=${request.startByte}-${request.endByte}`,
          },
          signal: AbortSignal.timeout(this.config.timeout), // FIXED: Enable timeout to prevent hanging requests
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.arrayBuffer();
        const loadTime = Date.now() - startTime;

        // LogHelper.log('ChunkManager', `Chunk loaded: ${request.startByte}-${request.endByte} in ${loadTime}ms`);

        // Clean up
        this.activeRequests.delete(requestId);
        this.processNextInQueue();

        return {
          data,
          startByte: request.startByte,
          endByte: request.endByte,
          loadTime,
        };
      } catch (error) {
        attempts++;
        // LogHelper.error('ChunkManager', `Chunk request failed (attempt ${attempts}):`, error);

        if (attempts > this.config.retryAttempts) {
          this.activeRequests.delete(requestId);
          this.processNextInQueue();
          throw error;
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay * attempts));
      }
    }

    throw new Error('Max retry attempts exceeded');
  }

  private async waitForRequest(requestId: string): Promise<ChunkResponse> {
    return new Promise((resolve, reject) => {
      const checkComplete = () => {
        if (!this.activeRequests.has(requestId)) {
          // Request completed, resolve with result
          // Note: In a real implementation, you'd need to store the result
          resolve({} as ChunkResponse);
        } else {
          setTimeout(checkComplete, 100);
        }
      };
      checkComplete();
    });
  }

  private reorderQueue() {
    this.requestQueue.sort((a, b) => {
      const priorityOrder = { high: 3, normal: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  private processNextInQueue() {
    if (
      this.requestQueue.length > 0 &&
      this.activeRequests.size < this.config.maxConcurrentChunks
    ) {
      const nextRequest = this.requestQueue.shift()!;
      const requestId = `${nextRequest.url}-${nextRequest.startByte}-${nextRequest.endByte}`;
      this.processRequest(requestId, nextRequest);
    }
  }

  public cancelAllRequests() {
    // Cancel all active requests
    this.activeRequests.forEach(request => {
      request.abortController?.abort();
    });
    this.activeRequests.clear();
    this.requestQueue = [];
  }

  public cancelRequestsForUrl(url: string) {
    // Cancel requests for specific URL
    const toCancel = Array.from(this.activeRequests.entries()).filter(([requestId]) =>
      requestId.startsWith(url)
    );

    toCancel.forEach(([requestId, request]) => {
      request.abortController?.abort();
      this.activeRequests.delete(requestId);
    });

    // Remove from queue
    this.requestQueue = this.requestQueue.filter(req => req.url !== url);
  }

  public getStats() {
    return {
      activeRequests: this.activeRequests.size,
      queuedRequests: this.requestQueue.length,
      config: this.config,
    };
  }
}

// Add to window for debugging
if (typeof window !== 'undefined') {
  (window as any).chunkManager = ChunkManager.getInstance();
}
