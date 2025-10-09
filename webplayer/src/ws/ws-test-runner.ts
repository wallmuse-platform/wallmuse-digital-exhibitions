import { wsTestSuite } from './ws-test-suite';
import { WsTools } from './ws-tools';

/**
 * Simple WebSocket Test Runner
 * Provides quick access to common testing scenarios
 */
export class WebSocketTestRunner {
  /**
   * Quick health check - runs basic tests
   */
  public static async quickHealthCheck(): Promise<boolean> {
    console.log('[TEST-RUNNER] Running quick health check...');

    try {
      const wsTools = WsTools.getInstance();

      // Test 1: Connection uniqueness
      const uniqueness = wsTools.testConnectionUniqueness();
      if (!uniqueness.isUnique) {
        console.error('[TEST-RUNNER] ❌ Connection not unique');
        return false;
      }
      console.log('[TEST-RUNNER] ✅ Connection is unique');

      // Test 2: Basic health
      const health = await wsTools.performHealthCheck();
      if (!health.overall) {
        console.error('[TEST-RUNNER] ❌ Health check failed');
        return false;
      }
      console.log('[TEST-RUNNER] ✅ Health check passed');

      // Test 3: Quick ping-pong
      const pingPong = await wsTools.testPingPong(3);
      if (!pingPong.success) {
        console.error('[TEST-RUNNER] ❌ Ping-pong test failed');
        return false;
      }
      console.log('[TEST-RUNNER] ✅ Ping-pong test passed');

      console.log('[TEST-RUNNER] ✅ All quick health checks passed');
      return true;
    } catch (error) {
      console.error('[TEST-RUNNER] ❌ Quick health check failed:', error);
      return false;
    }
  }

  /**
   * Run full test suite
   */
  public static async runFullTestSuite(): Promise<boolean> {
    console.log('[TEST-RUNNER] Running full test suite...');

    try {
      const results = await wsTestSuite.runAllTests();

      if (results.overall) {
        console.log('[TEST-RUNNER] ✅ Full test suite passed');
        console.log('[TEST-RUNNER] Summary:', results.summary);
        return true;
      } else {
        console.error('[TEST-RUNNER] ❌ Full test suite failed');
        console.error(
          '[TEST-RUNNER] Failed tests:',
          Array.from(results.tests.entries())
            .filter(([_, result]) => !result.success)
            .map(([name, result]) => `${name}: ${result.error}`)
        );
        return false;
      }
    } catch (error) {
      console.error('[TEST-RUNNER] ❌ Full test suite error:', error);
      return false;
    }
  }

  /**
   * Start continuous monitoring
   */
  public static startMonitoring(interval: number = 60000): void {
    console.log(`[TEST-RUNNER] Starting continuous monitoring every ${interval}ms`);
    wsTestSuite.startMonitoring(interval);
  }

  /**
   * Stop continuous monitoring
   */
  public static stopMonitoring(): void {
    console.log('[TEST-RUNNER] Stopping continuous monitoring');
    wsTestSuite.stopMonitoring();
  }

  /**
   * Get current connection status
   */
  public static getStatus(): any {
    const wsTools = WsTools.getInstance();
    return {
      instanceInfo: wsTools.getInstanceInfo(),
      uniqueness: wsTools.testConnectionUniqueness(),
      isWebSocketReady: wsTools.isWebSocketReady(),
    };
  }

  /**
   * Test specific functionality
   */
  public static async testSpecific(testName: string): Promise<any> {
    console.log(`[TEST-RUNNER] Running specific test: ${testName}`);

    const wsTools = WsTools.getInstance();

    switch (testName) {
      case 'uniqueness':
        return wsTools.testConnectionUniqueness();

      case 'health':
        return await wsTools.performHealthCheck();

      case 'pingPong':
        return await wsTools.testPingPong(5);

      case 'stability':
        return await wsTools.testConnectionStability(10000);

      case 'reconnection':
        return await wsTools.testReconnection();

      case 'instanceInfo':
        return wsTools.getInstanceInfo();

      default:
        throw new Error(`Unknown test: ${testName}`);
    }
  }
}

// Add to window for easy access (enabled for testing)
if (typeof window !== 'undefined') {
  (window as any).wsTestRunner = WebSocketTestRunner;
  console.log('[TEST-RUNNER] WebSocket test runner available at window.wsTestRunner');

  // Add convenience functions
  (window as any).testWebSocket = {
    quick: () => WebSocketTestRunner.quickHealthCheck(),
    full: () => WebSocketTestRunner.runFullTestSuite(),
    status: () => WebSocketTestRunner.getStatus(),
    test: (name: string) => WebSocketTestRunner.testSpecific(name),
    monitor: (interval = 60000) => WebSocketTestRunner.startMonitoring(interval),
    stopMonitor: () => WebSocketTestRunner.stopMonitoring(),
  };

  console.log('[TEST-RUNNER] Convenience functions available at window.testWebSocket');
}
