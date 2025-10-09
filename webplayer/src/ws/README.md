# WebSocket Testing and Monitoring System

This system ensures WebSocket connection uniqueness, stability, and proper cleanup. The WebSocket should remain unique unless the parent component remounts.

## Key Features

### 1. **Connection Uniqueness**

- Each WsTools instance has a unique UUID
- Singleton pattern ensures only one instance exists
- Proper cleanup when parent remounts

### 2. **Comprehensive Testing**

- Connection stability testing
- Ping-pong responsiveness testing
- Reconnection capability testing
- Resource usage monitoring

### 3. **Continuous Monitoring**

- Real-time health checks
- Automatic error detection
- Performance metrics tracking

## Usage

### Quick Health Check

```javascript
// In browser console
await window.testWebSocket.quick();
```

### Full Test Suite

```javascript
// Run all tests
await window.testWebSocket.full();
```

### Continuous Monitoring

```javascript
// Start monitoring every 60 seconds
window.testWebSocket.monitor(60000);

// Stop monitoring
window.testWebSocket.stopMonitor();
```

### Specific Tests

```javascript
// Test connection uniqueness
await window.testWebSocket.test('uniqueness');

// Test ping-pong
await window.testWebSocket.test('pingPong');

// Test reconnection
await window.testWebSocket.test('reconnection');

// Get current status
window.testWebSocket.status();
```

## Debug Functions

### Available at `window.debugWsTools`

- `checkState()` - Current connection state
- `checkConnectionHealth()` - Detailed health information
- `testConnectionStability(duration)` - Stability test
- `testPingPong(count)` - Ping-pong test
- `testConnectionUniqueness()` - Uniqueness test
- `testReconnection()` - Reconnection test
- `performHealthCheck()` - Comprehensive health check
- `getInstanceInfo()` - Instance information
- `startContinuousMonitoring(interval)` - Start monitoring
- `stopContinuousMonitoring()` - Stop monitoring

## Test Results

### Quick Health Check Results

```javascript
{
  success: true,
  tests: {
    uniqueness: { isUnique: true, instanceCount: 1 },
    health: { overall: true, connection: true, registration: true },
    pingPong: { success: true, averageResponseTime: 150 }
  }
}
```

### Full Test Suite Results

```javascript
{
  overall: true,
  tests: Map<string, TestResult>,
  summary: {
    totalTests: 7,
    passedTests: 7,
    failedTests: 0,
    duration: 45000
  }
}
```

## Connection Lifecycle

1. **Initialization**: Unique instance created with UUID
2. **Connection**: WebSocket connects and registers
3. **Operation**: Continuous ping-pong and health monitoring
4. **Cleanup**: Proper cleanup when parent remounts

## Monitoring

The system provides continuous monitoring to ensure:

- Connection remains stable
- Ping-pong responses are timely
- No memory leaks occur
- Reconnection works properly

## Error Handling

- Automatic reconnection on failures
- Timeout detection for ping-pong
- Resource cleanup on errors
- Detailed error logging

## Performance Metrics

- Connection age tracking
- Response time monitoring
- Success rate calculation
- Resource usage tracking

## Best Practices

1. **Always use singleton**: `WsTools.getInstance()`
2. **Test before production**: Run full test suite
3. **Monitor continuously**: Enable monitoring in development
4. **Check uniqueness**: Ensure only one instance exists
5. **Handle cleanup**: Proper cleanup on parent remount

## Troubleshooting

### Connection Not Unique

```javascript
// Check if multiple instances exist
window.debugWsTools.testConnectionUniqueness();
```

### Ping-Pong Failures

```javascript
// Test ping-pong responsiveness
await window.debugWsTools.testPingPong(5);
```

### Memory Leaks

```javascript
// Check resource usage
window.debugWsTools.getInstanceInfo();
```

### Reconnection Issues

```javascript
// Test reconnection capability
await window.debugWsTools.testReconnection();
```
