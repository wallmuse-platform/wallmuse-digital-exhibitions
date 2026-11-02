import { WsTools } from './ws-tools';

/**
 * WebSocket Debug Tools
 * Provides easy access to WebSocket testing and debugging functions
 */
class WebSocketDebugTools {
  private wsTools: WsTools;

  constructor() {
    this.wsTools = WsTools.getInstance();
  }

  /**
   * Check current WebSocket state
   */
  public checkState(): any {
    const user = this.wsTools.getUser();
    const hasEnvironment = Array.isArray(user?.houses) && user.houses.length > 0;
    return {
      wsState: this.wsTools.getWsState(),
      isWebSocketReady: this.wsTools.isWebSocketReady(),
      isFullyReady: this.wsTools.isFullyReady(),
      isRegistered: this.wsTools.getIsRegistrationComplete(),
      hasEnvironment,
    };
  }

  /**
   * Force WebSocket setup/reconnection
   */
  public forceSetup(): void {
    console.log('[DEBUG] Forcing WebSocket setup...');
    this.wsTools.forceReconnection();
  }

  /**
   * Check HTTP ping status
   */
  public async checkHttpPing(): Promise<any> {
    console.log('[DEBUG] Checking HTTP ping...');
    return await this.wsTools.testPingPong(1);
  }

  /**
   * Check connection health
   */
  public async checkConnectionHealth(): Promise<any> {
    console.log('[DEBUG] Checking connection health...');
    return await this.wsTools.performHealthCheck();
  }

  /**
   * Test connection uniqueness
   */
  public testConnectionUniqueness(): any {
    console.log('[DEBUG] Testing connection uniqueness...');
    return this.wsTools.testConnectionUniqueness();
  }

  /**
   * Test ping-pong
   */
  public async testPingPong(count: number = 5): Promise<any> {
    console.log(`[DEBUG] Testing ping-pong (${count} pings)...`);
    return await this.wsTools.testPingPong(count);
  }

  /**
   * Test connection stability
   */
  public async testConnectionStability(duration: number = 10000): Promise<any> {
    console.log(`[DEBUG] Testing connection stability (${duration}ms)...`);
    return await this.wsTools.testConnectionStability(duration);
  }

  /**
   * Test reconnection
   */
  public async testReconnection(): Promise<any> {
    console.log('[DEBUG] Testing reconnection...');
    return await this.wsTools.testReconnection();
  }

  /**
   * Perform comprehensive health check
   */
  public async performHealthCheck(): Promise<any> {
    console.log('[DEBUG] Performing comprehensive health check...');
    return await this.wsTools.performHealthCheck();
  }

  /**
   * Get instance information
   */
  public getInstanceInfo(): any {
    console.log('[DEBUG] Getting instance info...');
    return this.wsTools.getInstanceInfo();
  }

  /**
   * Start continuous monitoring
   */
  public startContinuousMonitoring(interval: number = 60000): void {
    console.log(`[DEBUG] Starting continuous monitoring every ${interval}ms`);
    const monitorInterval = setInterval(async () => {
      try {
        const health = await this.checkConnectionHealth();
        const state = this.checkState();
        console.log('[DEBUG-MONITOR] Health:', health);
        console.log('[DEBUG-MONITOR] State:', state);

        if (!health.overall) {
          console.warn('[DEBUG-MONITOR] Health check failed!');
        }
      } catch (error) {
        console.error('[DEBUG-MONITOR] Error:', error);
      }
    }, interval);

    // Store the interval ID for cleanup
    (window as any).__wsDebugMonitorInterval = monitorInterval;
  }

  /**
   * Stop continuous monitoring
   */
  public stopContinuousMonitoring(): void {
    console.log('[DEBUG] Stopping continuous monitoring');
    const intervalId = (window as any).__wsDebugMonitorInterval;
    if (intervalId) {
      clearInterval(intervalId);
      (window as any).__wsDebugMonitorInterval = null;
    }
  }

  /**
   * Quick diagnostic - runs all basic checks
   */
  public async quickDiagnostic(): Promise<any> {
    console.log('[DEBUG] Running quick diagnostic...');

    const results = {
      state: this.checkState(),
      uniqueness: this.testConnectionUniqueness(),
      health: await this.checkConnectionHealth(),
      pingPong: await this.testPingPong(1),
      instanceInfo: this.getInstanceInfo(),
    };

    console.log('[DEBUG] Quick diagnostic results:', results);
    return results;
  }
}

// Create and export debug tools instance
export const wsDebugTools = new WebSocketDebugTools();

// Add to window for easy access (enabled for testing)
if (typeof window !== 'undefined') {
  (window as any).debugWsTools = wsDebugTools;
  console.log('[DEBUG-TOOLS] WebSocket debug tools available at window.debugWsTools');

  // Add convenience functions
  (window as any).wsDebug = {
    state: () => wsDebugTools.checkState(),
    health: () => wsDebugTools.checkConnectionHealth(),
    ping: () => wsDebugTools.checkHttpPing(),
    reconnect: () => wsDebugTools.forceSetup(),
    test: {
      uniqueness: () => wsDebugTools.testConnectionUniqueness(),
      pingPong: (count = 5) => wsDebugTools.testPingPong(count),
      stability: (duration = 10000) => wsDebugTools.testConnectionStability(duration),
      reconnection: () => wsDebugTools.testReconnection(),
    },
    monitor: {
      start: (interval = 60000) => wsDebugTools.startContinuousMonitoring(interval),
      stop: () => wsDebugTools.stopContinuousMonitoring(),
    },
    diagnostic: () => wsDebugTools.quickDiagnostic(),
  };

  console.log('[DEBUG-TOOLS] Convenience functions available at window.wsDebug');
}
