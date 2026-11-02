import { WsTools } from './ws-tools';

/**
 * Comprehensive WebSocket Test Suite
 * Tests connection stability, uniqueness, and performance
 */
export class WebSocketTestSuite {
  private wsTools: WsTools;
  private testResults: Map<string, any> = new Map();
  private isRunning = false;

  constructor() {
    this.wsTools = WsTools.getInstance();
  }

  /**
   * Run all tests in sequence
   */
  public async runAllTests(): Promise<{
    overall: boolean;
    tests: Map<string, any>;
    summary: {
      totalTests: number;
      passedTests: number;
      failedTests: number;
      duration: number;
    };
  }> {
    if (this.isRunning) {
      throw new Error('Test suite already running');
    }

    this.isRunning = true;
    const startTime = Date.now();
    console.log('[TEST-SUITE] Starting comprehensive WebSocket test suite...');

    try {
      // Test 1: Connection Uniqueness
      await this.runTest('uniqueness', () => this.testUniqueness());

      // Test 2: Basic Connection Health
      await this.runTest('health', () => this.testBasicHealth());

      // Test 3: Ping-Pong Responsiveness
      await this.runTest('pingPong', () => this.testPingPong());

      // Test 4: Connection Stability
      await this.runTest('stability', () => this.testStability());

      // Test 5: Reconnection Capability
      await this.runTest('reconnection', () => this.testReconnection());

      // Test 6: Memory and Resource Usage
      await this.runTest('resources', () => this.testResourceUsage());

      // Test 7: Long-term Stability (if enabled)
      if (process.env.NODE_ENV === 'development') {
        await this.runTest('longTermStability', () => this.testLongTermStability());
      }
    } catch (error) {
      console.error('[TEST-SUITE] Error during test execution:', error);
    } finally {
      this.isRunning = false;
    }

    const duration = Date.now() - startTime;
    const results = this.calculateResults(duration);

    console.log('[TEST-SUITE] Test suite completed:', results);
    return results;
  }

  /**
   * Run a single test with error handling
   */
  private async runTest(name: string, testFn: () => Promise<any>): Promise<void> {
    console.log(`[TEST-SUITE] Running test: ${name}`);
    const startTime = Date.now();

    try {
      const result = await testFn();
      const duration = Date.now() - startTime;

      this.testResults.set(name, {
        success: true,
        duration,
        result,
        timestamp: new Date().toISOString(),
      });

      console.log(`[TEST-SUITE] Test ${name} passed in ${duration}ms`);
    } catch (error) {
      const duration = Date.now() - startTime;

      this.testResults.set(name, {
        success: false,
        duration,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });

      console.error(`[TEST-SUITE] Test ${name} failed in ${duration}ms:`, error);
    }
  }

  /**
   * Test 1: Connection Uniqueness
   */
  private async testUniqueness(): Promise<any> {
    const uniqueness = this.wsTools.testConnectionUniqueness();

    if (!uniqueness.isUnique) {
      throw new Error(`Connection not unique: ${JSON.stringify(uniqueness)}`);
    }

    return uniqueness;
  }

  /**
   * Test 2: Basic Health Check
   */
  private async testBasicHealth(): Promise<any> {
    const health = await this.wsTools.performHealthCheck();

    if (!health.overall) {
      throw new Error(`Health check failed: ${JSON.stringify(health)}`);
    }

    return health;
  }

  /**
   * Test 3: Ping-Pong Responsiveness
   */
  private async testPingPong(): Promise<any> {
    const pingPong = await this.wsTools.testPingPong(5);

    if (!pingPong.success) {
      throw new Error(`Ping-pong test failed: ${JSON.stringify(pingPong)}`);
    }

    // Check response times are reasonable
    if (pingPong.details.averageResponseTime > 5000) {
      throw new Error(`Average response time too high: ${pingPong.details.averageResponseTime}ms`);
    }

    return pingPong;
  }

  /**
   * Test 4: Connection Stability
   */
  private async testStability(): Promise<any> {
    const stability = await this.wsTools.testConnectionStability(10000); // 10 seconds

    if (!stability.success) {
      throw new Error(`Stability test failed: ${JSON.stringify(stability)}`);
    }

    return stability;
  }

  /**
   * Test 5: Reconnection Capability
   */
  private async testReconnection(): Promise<any> {
    const reconnection = await this.wsTools.testReconnection();

    if (!reconnection.success) {
      throw new Error(`Reconnection test failed: ${JSON.stringify(reconnection)}`);
    }

    // Check reconnection time is reasonable
    if (reconnection.details.duration > 30000) {
      throw new Error(`Reconnection took too long: ${reconnection.details.duration}ms`);
    }

    return reconnection;
  }

  /**
   * Test 6: Resource Usage
   */
  private async testResourceUsage(): Promise<any> {
    const instanceInfo = this.wsTools.getInstanceInfo();

    // Check for memory leaks
    if (instanceInfo.pendingPings > 10) {
      throw new Error(`Too many pending pings: ${instanceInfo.pendingPings}`);
    }

    // Check timer usage
    const activeTimers = Object.values(instanceInfo.timers).filter(Boolean).length;
    if (activeTimers > 5) {
      throw new Error(`Too many active timers: ${activeTimers}`);
    }

    return instanceInfo;
  }

  /**
   * Test 7: Long-term Stability (development only)
   */
  private async testLongTermStability(): Promise<any> {
    const stability = await this.wsTools.testConnectionStability(30000); // 30 seconds

    if (!stability.success) {
      throw new Error(`Long-term stability test failed: ${JSON.stringify(stability)}`);
    }

    return stability;
  }

  /**
   * Calculate test results summary
   */
  private calculateResults(duration: number): {
    overall: boolean;
    tests: Map<string, any>;
    summary: {
      totalTests: number;
      passedTests: number;
      failedTests: number;
      duration: number;
    };
  } {
    const totalTests = this.testResults.size;
    const passedTests = Array.from(this.testResults.values()).filter(r => r.success).length;
    const failedTests = totalTests - passedTests;

    return {
      overall: failedTests === 0,
      tests: this.testResults,
      summary: {
        totalTests,
        passedTests,
        failedTests,
        duration,
      },
    };
  }

  /**
   * Get detailed test results
   */
  public getTestResults(): Map<string, any> {
    return new Map(this.testResults);
  }

  /**
   * Clear test results
   */
  public clearResults(): void {
    this.testResults.clear();
  }

  /**
   * Start continuous monitoring
   */
  public startMonitoring(interval: number = 60000): void {
    console.log(`[TEST-SUITE] Starting continuous monitoring every ${interval}ms`);

    // Use the debug function for monitoring
    if ((window as any).debugWsTools) {
      (window as any).debugWsTools.startContinuousMonitoring(interval);
    }
  }

  /**
   * Stop continuous monitoring
   */
  public stopMonitoring(): void {
    console.log('[TEST-SUITE] Stopping continuous monitoring');

    if ((window as any).debugWsTools) {
      (window as any).debugWsTools.stopContinuousMonitoring();
    }
  }
}

// Export singleton instance
export const wsTestSuite = new WebSocketTestSuite();

// Add to window for easy access in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).wsTestSuite = wsTestSuite;
  console.log('[TEST-SUITE] WebSocket test suite available at window.wsTestSuite');
}
