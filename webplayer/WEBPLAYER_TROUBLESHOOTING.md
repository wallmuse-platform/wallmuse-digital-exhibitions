# Wallmuse WebPlayer Troubleshooting Guide

## Overview

This guide provides detailed troubleshooting information for the Wallmuse WebPlayer application,
including common playback issues, WebSocket problems, and recovery procedures.

## 1. Playback Issues

### 1.1 Play/Pause/Stop Not Working

**Problem**: UI buttons don't affect playback, videos keep playing **Symptoms**:

- Buttons appear to work but no effect
- Videos continue playing despite pause commands
- Stop button doesn't stop playback

**Root Cause**: Sequencer not properly connected to media elements **Solution**:

```typescript
// Check that TheApp.pause() calls Sequencer.pause(), not Sequencer.play()
// File: src/App.tsx - look for resumePlaybook() method
const handlePause = () => {
  if (Sequencer.isPlaying()) {
    Sequencer.pause(); // ✅ Correct
    // NOT: Sequencer.play(); // ❌ Wrong
  }
};
```

**Prevention**: Always verify button handlers call correct sequencer methods

### 1.2 Empty UI After Playlist Switch

**Problem**: Playlist changes but no media displays **Symptoms**:

- Playlist loads successfully
- No video/image elements visible
- Empty player display

**Root Cause**: Storage mechanism not initialized during remounts **Solution**:

```typescript
// Ensure PENDING_APP_OPERATIONS queue exists in src/index.tsx
if (!window.PENDING_APP_OPERATIONS) {
  window.PENDING_APP_OPERATIONS = [];
}
```

**Debug**: Check browser console for `[STORAGE]` messages **Prevention**: Always initialize storage
mechanisms before use

### 1.3 Videos Show for 1 Second Then Loop

**Problem**: Montages play briefly then restart immediately **Symptoms**:

- Montage plays for ~1 second
- Immediately restarts from beginning
- Infinite loop behavior

**Root Cause**: Timing calculation using wrong offset values **Solution**:

```typescript
// File: src/manager/Sequencer.ts - check pos calculation logic
// Use montage duration for last montage in loops, not next position offset
const isLastMontage = position.getMontageIndex() === montageCount - 1;
const isNextPositionMontage0 = nextPosition?.getMontageIndex() === 0;

if (isLastMontage && isNextPositionMontage0 && pos === 0) {
  // Use current montage duration instead of next position offset
  pos = position.getOffset() + position.getDuration();
}
```

**Prevention**: Always validate timing calculations for loop scenarios

### 1.4 Volume Slider Works But No Audio

**Problem**: Volume commands flow correctly but videos are silent **Symptoms**:

- Volume slider responds
- Commands sent successfully
- No audio output

**Root Cause**: HTML5 video elements need 0.0-1.0 scale, not 0-100 scale **Solution**:

```typescript
// File: src/App.tsx - look for setVolume() method
const setVolume = (v: number) => {
  const normalizedVolume = v / 100; // ✅ Convert to 0.0-1.0 scale
  videoElement.volume = normalizedVolume;
};
```

**Prevention**: Always normalize volume values for HTML5 video elements

## 2. WebSocket Connection Issues

### 2.1 "Bad key provided" Error

**Problem**: WebSocket connection fails with key validation error **Symptoms**:

- Console error: "Bad key provided"
- WebSocket connection refused
- No playlist data received

**Root Cause**: Using UUID format instead of 32-character hex key **Solution**:

```typescript
// Use correct key format: 32-character hex string (no hyphens)
const generateKey = () => {
  return uuid().replace(/-/g, '').substring(0, 32);
  // ✅ Correct: "caca4778c2accf69e2108f60732728f6"
  // ❌ Wrong: "caca4778-c2ac-cf69-e210-8f60732728f6"
};
```

**Prevention**: Always use 32-character hex format for environment keys

### 2.2 No Videos in DOM

**Problem**: WebSocket connects but no video elements appear **Symptoms**:

- Connection successful
- Playlist data received
- No video elements in DOM

**Root Cause**: Environment filtering logic looking in wrong place **Solution**:

```typescript
// Filter by screens within montages, not montage-level environment_id
const filteredMontages = data.montages.filter((montage: any) => {
  if (!Array.isArray(montage.screens)) {
    return false;
  }
  return montage.screens.some(
    (screen: any) => parseInt(screen.environment_id) === currentEnvironmentId
  );
});
```

**Prevention**: Montages don't have environment_id field - check screens within montages

### 2.3 Infinite Key Generation Loop

**Problem**: System gets stuck generating keys repeatedly **Symptoms**:

- Console spam with key generation
- System becomes unresponsive
- No actual connection established

**Root Cause**: Recursive calls in environment creation **Solution**:

```typescript
// Direct environment creation without recursion
const createNewEnvironment = async () => {
  // Direct creation, no recursive calls
  const environment = await api.createEnvironment();
  return environment;
};
```

**Prevention**: Avoid recursive patterns in environment creation

## 3. Media Loading Issues

### 3.1 AbortError: play() Interrupted ⚠️ NORMAL BEHAVIOR

**Problem**: Console shows AbortError messages during video transitions **Symptoms**:

- Console errors during video changes
- "The play() request was interrupted by a new load request"
- Videos still play normally

**Root Cause**: This is NORMAL browser behavior, not an actual error **Solution**:

```typescript
// Log as warnings, not errors (to prevent Sentry spam)
// File: src/ws/ws-tools.ts - setupErrorHandlers() method handles these gracefully
const handleAbortError = error => {
  if (error.name === 'AbortError') {
    console.warn('Video transition AbortError (normal):', error.message);
    return; // Don't treat as actual error
  }
  console.error('Real error:', error);
};
```

**Key Understanding**: Video transitions naturally abort previous play requests

### 3.2 Images Display for 67 Minutes Instead of 1 Minute

**Problem**: Image montages have extremely long durations **Symptoms**:

- Images display for hours instead of minutes
- Incorrect duration calculations
- Empty player display

**Root Cause**: Using montage duration instead of item duration **Solution**:

```typescript
// File: src/manager/Sequencer.ts - check duration calculation logic
// Always use item.duration for both images and videos
const mediaDuration = item.duration; // ✅ Correct
// NOT: const mediaDuration = (artwork?.type === 'IMG') ? actualMontageDuration : item.duration;
```

**Prevention**: Always use item.duration for media display timing

### 3.3 Rapid Fire Montage Switching

**Problem**: Montages switch every few milliseconds, system freezes **Symptoms**:

- Montages change rapidly
- System becomes unresponsive
- Console spam with switching logs

**Root Cause**: No cooldown between montage changes, infinite loops **Solution**:

```typescript
// File: src/manager/Sequencer.ts - implement MONTAGE_CHANGE_COOLDOWN_MS
private static lastMontageChangeTime = 0;
private static readonly MONTAGE_CHANGE_COOLDOWN_MS = 500; // 500ms cooldown

if (this.lastMontageChangeTime && (now - this.lastMontageChangeTime) < this.MONTAGE_CHANGE_COOLDOWN_MS) {
    return; // Skip advancement during cooldown
}
```

**Prevention**: Always implement cooldowns for rapid state changes

## 4. Track Navigation Issues

### 4.1 Track Resets to Default After Loop

**Problem**: Track selection forgotten after playlist loops **Symptoms**:

- User selects Track 2
- Playlist loops back to beginning
- Track resets to Track 0

**Root Cause**: Track memory not preserved across loops **Solution**:

```typescript
// Preserve track memory for future loops
const currentMontageIndex = p.getMontageIndex();
const currentTrackIndex = p.getTrackIndex();
if (currentMontageIndex >= 0 && currentTrackIndex >= 0) {
  this.setMontageTrackOverride(currentMontageIndex, currentTrackIndex);
}
```

**Prevention**: Always preserve track overrides for each montage

### 4.2 Track Jumping Between Montages

**Problem**: Track selection changes unexpectedly between montages **Symptoms**:

- Track 2 selected on Montage 0
- Montage 1 starts with Track 0
- Inconsistent track behavior

**Root Cause**: Track continuity not applied during montage transitions **Solution**:

```typescript
// Apply track continuity if next montage would use different track
if (currentTrackIndex !== defaultTrackIndex) {
  this.setMontageTrackOverride(nextIndex, currentTrackIndex);
  console.log('Applied track continuity: montage', nextIndex, '-> track', currentTrackIndex);
}
```

**Prevention**: Always apply track continuity during montage transitions

## 5. Performance Issues

### 5.1 Memory Leaks

**Problem**: Memory usage increases over time **Symptoms**:

- Browser becomes slow
- High memory usage
- Eventual crashes

**Solution**:

```typescript
// Proper cleanup in component unmounting
useEffect(() => {
  return () => {
    // Cleanup event listeners
    window.removeEventListener('event', handler);
    // Clear media references
    clearMediaReferences();
    // Clear timers
    clearAllTimers();
  };
}, []);
```

**Prevention**: Always implement proper cleanup in useEffect hooks

### 5.2 Excessive WebSocket Messages

**Problem**: Too many WebSocket messages causing performance issues **Symptoms**:

- Slow response times
- Network congestion
- Console spam

**Solution**:

```typescript
// Throttle WebSocket keep-alive messages
private static lastKeepAliveTime = 0;
private static readonly KEEP_ALIVE_THROTTLE_MS = 1000; // Max 1 per second

if (now - this.lastKeepAliveTime < this.KEEP_ALIVE_THROTTLE_MS) {
    return; // Skip this keep-alive
}
this.lastKeepAliveTime = now;
```

**Prevention**: Always throttle frequent WebSocket operations

## 6. Debug Procedures

### 6.1 System State Inspection

```typescript
// Check overall system state
const debugSystemState = () => {
  console.log('WebPlayer State:', {
    hasSequencer: !!window.Sequencer,
    hasApp: !!window.TheApp,
    hasPlayer: !!window.ItemPlayer?.ThePlayer,
    isPlaying: window.Sequencer?.isPlaying(),
    currentPlaylist: window.Sequencer?.getCurrentPlaylist()?.id,
    appVideoShown: window.TheApp?.state?.videoShown,
    appImageShown: window.TheApp?.state?.imageShown,
  });
};
```

### 6.2 Media Element Analysis

```typescript
// Analyze current video elements
const debugVideoElements = () => {
  const videos = document.querySelectorAll('video');
  console.log(
    'Video Elements:',
    Array.from(videos).map((v, i) => ({
      index: i,
      src: v.src,
      readyState: v.readyState,
      duration: v.duration,
      paused: v.paused,
      currentTime: v.currentTime,
    }))
  );
};
```

### 6.3 Track Selection Debugging

```typescript
// Debug track selection logic
const debugTrackSelection = () => {
  const playlist = window.Sequencer?.playlist;
  if (playlist) {
    const montage = playlist.getMontage(0);
    console.log('Track Selection Debug:', {
      montageTracks: montage?.seqs?.length || 0,
      currentTrack: window.Sequencer?.getCurrentTrack(),
      trackOverrides: window.Sequencer?.montageTrackOverrides,
    });
  }
};
```

## 7. Recovery Procedures

### 7.1 Complete System Reset

```typescript
// Reset entire WebPlayer system
const resetWebPlayerSystem = () => {
  // Stop current playback
  window.Sequencer?.stop();

  // Clear all state
  window.TheApp?.clearAllMediaState();

  // Clear track overrides
  window.Sequencer?.clearTrackOverrides();

  // Reload page
  window.location.reload();
};
```

### 7.2 Media State Recovery

```typescript
// Recover from media state issues
const recoverMediaState = () => {
  // Clear current media
  window.TheApp?.setState({
    videoShown: 0,
    imageShown: 0,
    video1: undefined,
    video2: undefined,
    image1: undefined,
    image2: undefined,
  });

  // Restart playback
  window.Sequencer?.play(0);
};
```

### 7.3 WebSocket Recovery

```typescript
// Recover from WebSocket issues
const recoverWebSocket = async () => {
  // Close existing connection
  if (window.WsTools?.instance?.ws) {
    window.WsTools.instance.ws.close();
  }

  // Wait for cleanup
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Reconnect
  await window.WsTools?.instance?.getCommands();
};
```

## 8. Monitoring and Logging

### 8.1 Key Log Messages to Monitor

- `[Sequencer]`: Core playback operations
- `[ItemPlayer]`: Media loading and playback
- `[WS-COMMAND]`: WebSocket command processing
- `[TRACK-TIMING]`: Track selection and timing
- `[MEDIA-LOAD]`: Media loading operations

### 8.2 Performance Monitoring

```typescript
// Monitor performance metrics
const monitorPerformance = () => {
  // Monitor memory usage
  if (performance.memory) {
    console.log('Memory Usage:', {
      used: performance.memory.usedJSHeapSize,
      total: performance.memory.totalJSHeapSize,
      limit: performance.memory.jsHeapSizeLimit,
    });
  }

  // Monitor frame rate
  let frameCount = 0;
  const startTime = performance.now();

  const countFrames = () => {
    frameCount++;
    requestAnimationFrame(countFrames);
  };

  setTimeout(() => {
    const fps = frameCount / ((performance.now() - startTime) / 1000);
    console.log('FPS:', fps);
  }, 5000);
};
```

### 8.3 Error Tracking

```typescript
// Implement comprehensive error tracking
const trackWebPlayerError = (error: Error, context: string) => {
  console.error(`[${context}] WebPlayer Error:`, error);

  // Send to error tracking service
  if (window.Sentry) {
    window.Sentry.captureException(error, {
      tags: {
        context,
        component: 'WebPlayer',
      },
    });
  }
};
```

## 9. Prevention Strategies

### 9.1 Code Quality

- Always validate data before use
- Implement proper error handling
- Use TypeScript for type safety
- Follow established patterns

### 9.2 Testing

- Test all playback scenarios
- Test error recovery procedures
- Test performance under load
- Test cross-browser compatibility

### 9.3 Monitoring

- Implement comprehensive logging
- Monitor error rates
- Track performance metrics
- Set up alerts for critical issues

---

_This troubleshooting guide should be updated as new issues are discovered and resolved._
