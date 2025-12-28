# Mobile Autoplay Solution - iOS Audio + Android Video

## Problem Statement
- **iOS**: AudioContext suspended until user interaction (audio blocked)
- **Android**: Video autoplay blocked after first video (NotAllowedError)
- **Error**: `play() failed because the user didn't interact with the document first`

## Solution Implemented

### Unified Handler: `IOSAudioAndroidVideoHandler.js`

**Location**: `/src/PlayerCommands/IOSAudioAndroidVideoHandler.js`

**What it does**:
1. ✅ Detects iOS AudioContext suspension (existing functionality)
2. ✅ **NEW**: Intercepts ALL `video.play()` calls globally
3. ✅ **NEW**: Catches `NotAllowedError` from Android video blocking
4. ✅ Shows single "Tap to Play" prompt for ANY blocking
5. ✅ Retries blocked videos after user interaction

### Key Implementation Details

#### 1. Global Video.play() Interceptor
```javascript
// Overrides HTMLVideoElement.prototype.play BEFORE child TypeScript app loads
HTMLVideoElement.prototype.play = function() {
    return originalPlay.call(this).catch(error => {
        if (error.name === 'NotAllowedError') {
            // Store blocked video element
            // Show prompt to user
        }
        throw error; // Preserve original behavior
    });
};
```

**Why this works**:
- Installed before child TypeScript WebPlayer loads
- Affects ALL video elements created later
- No modification to child app needed
- Safe: preserves original behavior

#### 2. User Interaction Handler
```javascript
const handleEnableMedia = async () => {
    // 1. Resume iOS AudioContext (if iOS)
    // 2. Retry ALL blocked video elements
    // 3. Set global flag: window._userHasInteracted = true
    // 4. Hide prompt
};
```

#### 3. Blocked Video Tracking
```javascript
// Global array stores blocked video elements
window._blockedVideoElements = [];

// Each blocked video.play() adds element to array
// After user tap, all are retried
```

## Files Modified

### 1. Created New Handler
- **File**: `IOSAudioAndroidVideoHandler.js`
- **Purpose**: Unified mobile autoplay handling

### 2. Updated Imports
- **File**: `PlayerCommands.js`
- **Line 19**: Changed import from `IOSAudioHandler` to `IOSAudioAndroidVideoHandler`
- **Line 179**: Updated component usage

### 3. Added Translations
- **File**: `locales/en/translationEN.json`
- **New keys**:
  - `mediaBlocked`: "Media Blocked"
  - `tapToEnableVideo`: "Tap to enable video playback"

### 4. Backup Created
- **File**: `IOSAudioHandler.js.backup`
- **Location**: Same directory as original

## How It Works - Step by Step

### Scenario: Android User Plays Multiple Videos

1. **Page loads**
   - React app mounts
   - `IOSAudioAndroidVideoHandler` component mounts
   - Global `video.play()` interceptor installed

2. **Child TypeScript WebPlayer loads**
   - Fetched via `WebPlayer.js`
   - Creates Video Component #1, #2, etc.

3. **Video #1 attempts to play**
   - First interaction = allowed by Android
   - Plays successfully ✅

4. **Video #2 attempts to play**
   - No new user interaction
   - Android blocks with `NotAllowedError` ❌
   - Interceptor catches error
   - Video element stored in `window._blockedVideoElements`
   - Prompt shown: "Tap to Play"

5. **User taps prompt**
   - `handleEnableMedia()` called
   - AudioContext resumed (iOS)
   - All blocked videos retried
   - Prompt hidden
   - Global flag set: `window._userHasInteracted = true`

6. **Future video play attempts**
   - User interaction flag exists
   - Android allows autoplay ✅

## Testing Checklist

### iOS Testing
- [ ] First load shows audio prompt
- [ ] Tap enables audio
- [ ] Videos play after tap
- [ ] No repeated prompts

### Android Testing
- [ ] First video plays without prompt
- [ ] Second video triggers prompt
- [ ] Tap enables all videos
- [ ] Subsequent videos autoplay

### Desktop Testing
- [ ] No prompts shown (not mobile)
- [ ] Videos autoplay normally
- [ ] No performance impact

## Benefits

1. **No Child App Changes**: Works with existing TypeScript WebPlayer
2. **Single Prompt**: One tap handles both audio and video
3. **Clean UX**: User only interrupted once
4. **Safe**: Preserves original error behavior
5. **Extensible**: Easy to add more media types

## Potential Issues & Solutions

### Issue: Multiple prompts shown
**Solution**: Check that interceptor is only installed once (useEffect dependency array)

### Issue: Videos don't retry after tap
**Solution**: Verify `window._blockedVideoElements` is populated. Check console logs.

### Issue: Prompt shows on desktop
**Solution**: Check mobile detection: `isIOS` or `isAndroid` flags

## Console Log Monitoring

**Key logs to watch**:
```
[IOSAudioAndroidVideoHandler] Installing video.play() interceptor
[IOSAudioAndroidVideoHandler] ❌ Video play blocked - NotAllowedError detected
[IOSAudioAndroidVideoHandler] Stored blocked video element, total: 1
[IOSAudioAndroidVideoHandler] handleEnableMedia clicked
[IOSAudioAndroidVideoHandler] Retrying 1 blocked video(s)
[IOSAudioAndroidVideoHandler] ✅ Video play retry successful
```

## Rollback Instructions

If issues occur:

1. **Restore original handler**:
   ```bash
   mv IOSAudioHandler.js.backup IOSAudioHandler.js
   ```

2. **Revert PlayerCommands.js**:
   - Line 19: `import IOSAudioHandler from './IOSAudioHandler';`
   - Line 179: `<IOSAudioHandler ... />`

3. **Remove new file**:
   ```bash
   rm IOSAudioAndroidVideoHandler.js
   ```

## Next Steps

1. Test on real Android device
2. Test on real iOS device
3. Monitor Sentry for `NotAllowedError` reduction
4. Copy to production after testing
5. Update github-repo when stable

---
**Implementation Date**: 2025-10-13
**Status**: Ready for testing
**Risk Level**: Low (safe interceptor, preserves original behavior)
