# WebSocket and Command System Documentation

## 1. WebSocket Connection Management

- **Connection Stability**
  - Removed unnecessary WebSocket closures during playlist transitions
  - Added `isPlaylistTransitioning` flag for better state tracking
  - Enhanced connection health monitoring
  - Improved reconnection logic with exponential backoff

- **State Tracking**
  - Added detailed logging for WebSocket state changes
  - Improved closure event logging with stack traces
  - Better connection state management
  - Enhanced error recovery mechanisms

## 2. Command Handling

- **Command Queue**
  - Set `COMMAND_TIMEOUT` to 0 (no expiration)
  - Commands remain in queue until processed
  - Improved queue processing logic
  - Better handling of command priorities

- **Navigation Commands**
  - Enhanced 'next' and 'prev' command handling
  - Improved montage navigation logic
  - Better state management during transitions
  - Added comprehensive logging

## 3. Navigation Logic

- **Previous Montage Navigation**
  - Time-based navigation rules:
    - First 5 seconds: goes to previous montage
    - After 5 seconds: goes to start of current montage
  - Improved position tracking
  - Enhanced transition handling
  - Better error recovery

- **State Management**
  - Added state consistency checks
  - Improved error handling
  - Better resource cleanup
  - Enhanced logging system

## 4. Debug Tools

### 4.1 `checkState`

```javascript
checkState: () => {
  console.log('[DEBUG] WsTools state:', {
    wsExists: !!this.ws,
    wsReadyState: this.ws?.readyState,
    wsUrl: this.ws?.url,
    isConnecting: this.isConnecting,
    wsState: this.wsState,
    httpPingTimer: !!this.httpPingTimer,
    httpPingsSent: this.httpPingsSent,
    httpPingsSuccessful: this.httpPingsSuccessful,
    lastHttpPingTime: this.lastHttpPingTime,
    HTTP_PING_URL: this.HTTP_PING_URL,
  });
};
```

**Purpose**: Provides a comprehensive snapshot of the WebSocket connection state

- Shows if WebSocket exists and its ready state
- Displays connection status and URL
- Shows HTTP ping statistics
- Useful for diagnosing connection issues

### 4.2 `forceSetup`

```javascript
forceSetup: () => {
  console.log('[DEBUG] Force calling setupWebSocket...');
  this.setupWebSocket();
};
```

**Purpose**: Forces a new WebSocket connection setup

- Useful when connection is stuck or in a bad state
- Can be used to manually trigger reconnection
- Helps in testing connection recovery

### 4.3 `checkHttpPing`

```javascript
checkHttpPing: () => {
  console.log('[DEBUG] HTTP Ping Status:', {
    pingsSent: this.httpPingsSent,
    pingsSuccessful: this.httpPingsSuccessful,
    lastPingTime: this.lastHttpPingTime,
    lastPingResponse: this.lastHttpPingResponse,
    pingTimer: !!this.httpPingTimer,
  });
};
```

**Purpose**: Monitors HTTP ping health checks

- Shows ping success/failure statistics
- Displays timing information
- Helps diagnose connection stability issues
- Useful for monitoring connection health

### 4.4 `checkConnectionHealth`

```javascript
checkConnectionHealth: () => {
  console.log('[DEBUG] Connection Health:', {
    connectionState: this.connectionState,
    isConnecting: this.isConnecting,
    wsState: this.wsState,
    isRegistrationComplete: this.isRegistrationComplete,
    lastMessageReceived: this.lastMessageReceived,
    connectionDuration: Date.now() - this.connectionStartTime,
  });
};
```

**Purpose**: Provides detailed connection health information

- Shows current connection state
- Displays registration status
- Shows message activity
- Helps track connection duration
- Useful for monitoring overall connection health

## 5. Usage Examples

```javascript
// Access debug tools in browser console
window.debugWsTools.checkState();
window.debugWsTools.forceSetup();
window.debugWsTools.checkHttpPing();
window.debugWsTools.checkConnectionHealth();
```

## 6. Key Benefits

- More stable WebSocket connections
- Reliable command processing
- Predictable navigation behavior
- Enhanced debugging capabilities
- Better error recovery
- Improved system monitoring

## 7. Volume Control

**UPDATED: 2025-12-26**

- **Critical Fix: Hidden Video Muting**
  - Only the visible video slot receives volume and is unmuted
  - Hidden video slot is explicitly muted with volume=0
  - Prevents audio overlap from both video elements playing simultaneously
  - Volume commands from WebSocket only affect the active video

- **Implementation** ([App.tsx:1036-1067](../src/App.tsx#L1036-L1067))
  ```typescript
  public setVolume(v: number) {
    const videoShown = this.state.videoShown;

    if (videoShown === 1 && this.video1Ref.current) {
      this.video1Ref.current.volume = normalizedVolume;
      this.video1Ref.current.muted = false;
      // Ensure video-2 is muted
      if (this.video2Ref.current) {
        this.video2Ref.current.muted = true;
        this.video2Ref.current.volume = 0;
      }
    } else if (videoShown === 2 && this.video2Ref.current) {
      // Similar logic for video-2
    }
  }
  ```

## 8. Technical Details

- **Connection Health**
  - Regular heartbeat checks
  - Automatic reconnection
  - State recovery mechanisms
  - Connection quality monitoring

- **Command Processing**
  - No command expiration
  - Guaranteed command delivery
  - Improved error handling
  - Better state management
  - Volume commands only affect visible video slot

- **Navigation Rules**
  - 5-second threshold for montage navigation
  - Improved position tracking
  - Better transition handling
  - Enhanced error recovery
