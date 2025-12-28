# Wallmuse Player Container Troubleshooting Guide

## Overview

This guide provides detailed troubleshooting information for the Wallmuse Player Container
application, including common issues, debug procedures, and recovery mechanisms.

## 1. Account Creation Issues

### 1.1 "rootElement is not defined" Error

**Problem**: SessionContext tries to update DOM before element exists **Symptoms**:

- Console error: "Cannot read property 'dataset' of null"
- Account creation fails
- House ID not stored in DOM

**Solution**:

```javascript
// Always get fresh reference
const rootElement = document.getElementById('root');
if (rootElement) {
  rootElement.dataset.house = houseId;
}
```

**Prevention**: Ensure DOM element exists before attempting updates

### 1.2 Complete Setup Popup Stuck

**Problem**: Activation event not properly handled **Symptoms**:

- Setup popup remains visible
- User cannot proceed
- Environment not activated

**Solution**:

```javascript
// App.js must listen for activation event
window.addEventListener('activation-complete', () => {
  // Handle activation completion
  setSetupComplete(true);
});
```

**Prevention**: Always implement proper event listeners for activation events

### 1.3 Multiple Environment Fingerprints

**Problem**: Stale device fingerprints accumulate over time **Symptoms**:

- Multiple environments created for same device
- Confusion in environment selection
- localStorage pollution

**Solution**:

```javascript
// Automatic cleanup during account creation
cleanErroneousHouseFingerprints();
```

**Prevention**: Regular cleanup of stale fingerprints

## 2. Environment Management Issues

### 2.1 Multiple Active Environments

**Problem**: More than one environment marked as active **Symptoms**:

- Display conflicts
- Inconsistent media playback
- User confusion

**Solution**:

```javascript
// Detect and resolve multiple active environments
const activeEnvironments = environments.filter(env => env.alive === '1');
if (activeEnvironments.length > 1) {
  // Show alert with deactivation options
  showMultipleEnvironmentAlert(activeEnvironments);
}
```

**Prevention**: Always deactivate previous environment before activating new one

### 2.2 Screen Dimension Issues

**Problem**: Screen dimensions not populated (0x0) **Symptoms**:

- Screen activation fails
- Invalid screen dimensions
- WebPlayer cannot display content

**Solution**:

```javascript
// Screen dimension validation and correction
if (screen.width === '0' || screen.height === '0') {
  // Attempt to populate dimensions
  await activateScreenWithCurrentDimensions(screen.id);

  // Validate after activation
  const updatedScreen = await getScreenDetails(screen.id);
  if (updatedScreen.width === '0') {
    // Use fallback dimensions
    useFallbackDimensions(screen.id);
  }
}
```

**Prevention**: Always validate screen dimensions after creation

### 2.3 WebSocket Connection Failures

**Problem**: Environment created but WebSocket fails to connect **Symptoms**:

- Environment exists but no communication
- WebPlayer shows connection errors
- Media not loading

**Solution**:

```javascript
// Ensure crypt_key is properly generated and stored
const environmentKey = generateEnvironmentKeyFromCryptKey(crypt_key);
if (!environmentKey) {
  // Regenerate environment with new key
  await recreateEnvironmentWithNewKey();
}
```

**Prevention**: Validate key generation before WebSocket connection attempts

## 3. Playlist Management Issues

### 3.1 Missing Demo Playlists

**Problem**: New accounts have no content **Symptoms**:

- Empty playlist list
- No demo content available
- User confusion

**Solution**:

```javascript
// Verify domain mapping and guest account copy process
const domainGuestMap = {
  1: 'unregistered', // wallmuse.com
  8: 'guest_ooo2', // ooo2.com
};

const guestAccountId = getDomainGuestAccountId(domain);
if (guestAccountId) {
  await copyPlaylistsFromGuestAccount(guestAccountId);
}
```

**Prevention**: Always verify domain mapping and guest account availability

### 3.2 Playlist Synchronization Issues

**Problem**: Playlist changes not reflected across components **Symptoms**:

- Stale playlist data
- Inconsistent state
- UI not updating

**Solution**:

```javascript
// Ensure proper context updates
const updatePlaylistInContext = newPlaylist => {
  setCurrentPlaylist(newPlaylist);
  // Notify all dependent components
  notifyPlaylistChange(newPlaylist);
};
```

**Prevention**: Use proper context update patterns and notify dependent components

## 4. WebPlayer Integration Issues

### 4.1 Parent-Child Communication Failures

**Problem**: NAV commands not reaching WebPlayer **Symptoms**:

- WebPlayer not responding to navigation
- Commands not executed
- State desynchronization

**Solution**:

```javascript
// Ensure proper event dispatch
const sendNavCommand = command => {
  const event = new CustomEvent('webplayer-navigate', {
    detail: command,
  });
  window.dispatchEvent(event);
};
```

**Prevention**: Always use proper event dispatch patterns

### 4.2 WebPlayer Not Ready

**Problem**: Commands sent before WebPlayer is ready **Symptoms**:

- Commands ignored
- WebPlayer not initialized
- Empty player display

**Solution**:

```javascript
// Wait for WebPlayer readiness
const waitForWebPlayerReady = async () => {
  if (window.WallmuseInit) {
    await window.WallmuseInit.playerReady();
  }
};
```

**Prevention**: Always check WebPlayer readiness before sending commands

## 5. Performance Issues

### 5.1 Memory Leaks

**Problem**: Memory usage increases over time **Symptoms**:

- Browser becomes slow
- High memory usage
- Eventual crashes

**Solution**:

```javascript
// Proper cleanup in component unmounting
useEffect(() => {
  return () => {
    // Cleanup event listeners
    window.removeEventListener('event', handler);
    // Clear references
    clearReferences();
  };
}, []);
```

**Prevention**: Always implement proper cleanup in useEffect hooks

### 5.2 Excessive API Calls

**Problem**: Too many API requests causing performance issues **Symptoms**:

- Slow response times
- Network errors
- Rate limiting

**Solution**:

```javascript
// Implement request throttling
const throttledApiCall = throttle(apiCall, 1000); // Max 1 call per second
```

**Prevention**: Use throttling and debouncing for API calls

## 6. Debug Procedures

### 6.1 System State Inspection

```javascript
// Check overall system state
const debugSystemState = () => {
  console.log('System State:', {
    hasSession: !!window.SessionContext,
    hasEnvironments: !!window.EnvironmentsContext,
    hasPlaylists: !!window.PlaylistsContext,
    currentEnvironment: window.EnvironmentsContext?.currentEnvironment,
    currentPlaylist: window.PlaylistsContext?.currentPlaylist,
  });
};
```

### 6.2 Environment Debugging

```javascript
// Debug environment state
const debugEnvironments = () => {
  const environments = window.EnvironmentsContext?.environments || [];
  console.log(
    'Environments:',
    environments.map(env => ({
      id: env.id,
      alive: env.alive,
      screens: env.screens?.length || 0,
    }))
  );
};
```

### 6.3 Playlist Debugging

```javascript
// Debug playlist state
const debugPlaylists = () => {
  const playlists = window.PlaylistsContext?.playlists || [];
  console.log(
    'Playlists:',
    playlists.map(playlist => ({
      id: playlist.id,
      name: playlist.name,
      montages: playlist.montages?.length || 0,
    }))
  );
};
```

## 7. Recovery Procedures

### 7.1 Complete System Reset

```javascript
// Reset entire system state
const resetSystemState = () => {
  // Clear all localStorage
  localStorage.clear();

  // Reset all contexts
  window.SessionContext?.reset();
  window.EnvironmentsContext?.reset();
  window.PlaylistsContext?.reset();

  // Reload page
  window.location.reload();
};
```

### 7.2 Environment Recovery

```javascript
// Recover from environment issues
const recoverEnvironment = async () => {
  // Deactivate all environments
  await deactivateAllEnvironments();

  // Create new environment
  const newEnvironment = await createNewEnvironment();

  // Activate new environment
  await activateEnvironment(newEnvironment.id);
};
```

### 7.3 Playlist Recovery

```javascript
// Recover from playlist issues
const recoverPlaylists = async () => {
  // Clear current playlist state
  window.PlaylistsContext?.clearCurrentPlaylist();

  // Reload playlists from server
  await window.PlaylistsContext?.loadPlaylists();

  // Set default playlist
  await window.PlaylistsContext?.setDefaultPlaylist();
};
```

## 8. Monitoring and Logging

### 8.1 Console Log Keywords

Search console logs with these keywords for debugging player container issues:

**SessionContext Logs:**
- `[SessionContext] Session updated` - Session data changes
- `[SessionContext] Updating DOM with house ID` - House ID written to DOM
- `[SessionContext] Starting session initialization` - Init process start
- `[SessionContext] WordPress login status` - WP auth state
- `[SessionContext] User has existing houses` - Existing user detected
- `[SessionContext] No houses found, creating one` - New account flow
- `[SessionContext] House creation successful` - House created OK
- `[SessionContext] House creation failed` - House creation error

**EnvironmentsContext Logs:**
- `[fetchEnvironmentDetails] Fetching user details` - Start fetch
- `[fetchEnvironmentDetails] Found environments` - Env count
- `[fetchEnvironmentDetails] Processing new account setup` - New account path
- `[fetchEnvironmentDetails] No environments found` - Empty state
- `[EnvironmentsContext] Checking for faulty screens` - Screen validation
- `[EnvironmentsContext] House created event` - House creation event received

**PlaylistsContext Logs:**
- `[PlaylistsContext]` - Prefix for all playlist-related operations

**WebPlayer Logs:**
- `[WebPlayer]` - Prefix for WebPlayer communication and integration logs

**NavigationManager Logs:**
- `[NAV-MANAGER]` - Prefix for navigation management logs (see NAVIGATION_SYSTEM_REFACTOR.md for full list)

**GuestActionPopup Logs:**
- `[GuestActionPopup]` - Prefix for account creation popup logs (see GUEST_ACTION_POPUP_DOCS.md for full list)

### 8.2 Error Tracking

```javascript
// Implement comprehensive error tracking
const trackError = (error, context) => {
  console.error(`[${context}] Error:`, error);

  // Send to error tracking service
  if (window.Sentry) {
    window.Sentry.captureException(error, {
      tags: { context },
    });
  }
};
```

### 8.3 Performance Monitoring

```javascript
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

  // Monitor API response times
  const apiTimings = performance.getEntriesByType('navigation');
  console.log('API Timings:', apiTimings);
};
```

## 9. Prevention Strategies

### 9.1 Code Quality

- Always validate data before use
- Implement proper error handling
- Use TypeScript for type safety
- Follow established patterns

### 9.2 Testing

- Test all user flows thoroughly
- Test error scenarios
- Test performance under load
- Test cross-browser compatibility

### 9.3 Monitoring

- Implement comprehensive logging
- Monitor error rates
- Track performance metrics
- Set up alerts for critical issues

---

_This troubleshooting guide should be updated as new issues are discovered and resolved._
