# Developer Quick Start Guide

> **Goal**: Get you productive on the Wallmuse Web Player in 15 minutes

## Essential Knowledge (5 minutes)

### The Big Picture

1. **Parent App** sends NAV commands (playlist changes, navigation)
2. **React App** receives commands and loads playlist data via WebSocket
3. **Sequencer** handles timing and decides what media to show when
4. **App Component** displays videos/images in double-buffered slots

### Data Flow

```
NAV Command → WebSocket → Playlist Data → Sequencer Logic → Media Display
```

### Key Files You'll Edit

- `src/App.tsx` - UI and media display (React component)
- `src/manager/Sequencer.ts` - Timing logic and montage navigation
- `src/manager/ItemPlayer.ts` - Media loading coordination

## Debug Tools (2 minutes)

Open browser console and use these commands:

```javascript
// System health check
window.debugPlayer();

// Current playbook status
window.debugSequencerStatus();

// What media is supposed to be showing
console.log('App state:', {
  videoShown: window.TheApp?.state?.videoShown,
  imageShown: window.TheApp?.state?.imageShown,
});
```

## Test Your Changes (3 minutes)

1. **Open**: `test-playlist-switching.html` in browser
2. **Test these 4 benchmarks**:
   - Play/Pause/Stop buttons work
   - Can switch between playlists (1039 ↔ 1040)
   - Next/Previous navigation works
   - goMontage direct navigation works

## Common Problems & Quick Fixes (5 minutes)

### Problem: Empty UI after playlist switch

**Quick Check**:

```javascript
console.log('Storage queue:', window.PENDING_APP_OPERATIONS?.length || 0);
```

**Quick Fix**: Ensure `PENDING_APP_OPERATIONS` is initialized in `src/index.tsx`

### Problem: Play/Pause buttons don't work

**Quick Check**:

```javascript
console.log('Sequencer playing:', window.Sequencer?.isPlaying());
```

**Quick Fix**: Check `resumePlaybook()` in `src/App.tsx` calls `Sequencer.play()` not
`Sequencer.pause()`

### Problem: Videos load but no audio **UPDATED: 2025-12-26**

**Quick Check**:

```javascript
// Check if both videos are unmuted (BUG!)
document.querySelectorAll('video').forEach((v, i) => {
  console.log(`Video ${i+1}:`, {muted: v.muted, volume: v.volume});
});
```

**Root Cause**: Both video slots were being unmuted, causing audio overlap

**Fix Applied**: `setVolume()` in `App.tsx` now only unmutes the visible video slot:
```typescript
// Only unmute the SHOWN video
if (videoShown === 1 && this.video1Ref.current) {
  this.video1Ref.current.muted = false;
  this.video2Ref.current.muted = true; // Mute the other one
}
```

**Reference**: [App.tsx:1036-1067](../../src/App.tsx#L1036-L1067)

### Problem: Initial video load warnings **UPDATED: 2025-12-26**

**Console Shows**:
```
⚠️ [Video #1] Initial load (waiting for media): {filename: undefined, url: undefined, ...}
```

**This is NORMAL**: Videos mount before WebSocket sends playlist data

**Why It Happens**:
1. Video components render immediately on app startup
2. WebSocket playlist data arrives in ~200ms
3. Videos update with correct media after data arrives

**Changed**: Console now shows `console.warn()` instead of `console.error()` to indicate this is expected behavior, not a bug

**Reference**: [video.tsx:211](../../src/component/video.tsx#L211)

### Problem: Montages play for 1 second then loop

**Quick Check**: Look for `[Sequencer.loop] POS CALCULATION:` in console **Quick Fix**: In
`Sequencer.ts`, use montage duration for last montage, not next position offset

## Making Changes Safely

### Before You Edit

1. **Test current functionality** with the 4 benchmarks above
2. **Check related logs** in browser console
3. **Understand the data flow** for your change area

### After You Edit

1. **Test all 4 benchmarks** still work
2. **Check console for errors**
3. **Verify your specific fix** works as expected

### Code Style

- **No comments** (unless user specifically asks)
- **Add logging** with clear prefixes like `[MyComponent.methodName]`
- **Check for null/undefined** before accessing properties
- **Follow existing patterns** in the codebase

## Key Concepts

### NAV Commands (Not URL Parameters)

- ❌ Don't read URL parameters directly
- ✅ All navigation flows through NAV events from parent
- Handle in `src/index.tsx` in the `webplayer-navigate` event listener

### Undefined Playlists Are Valid

- ❌ Don't add special handling for `playlist: undefined`
- ✅ Treat undefined playlists exactly like numbered playlists (e.g., 1040)
- They represent "default" playlists and are architecturally intentional

### Double-Buffered Videos

- App has 2 video slots (video1, video2)
- One shows current media, other preloads next media
- Switch between slots for smooth transitions
- Managed by `videoShown` state (1 or 2)

### Timing System

- Sequencer calculates when to advance to next item/montage
- Uses `offset` (current time) vs `pos` (advancement threshold)
- When `offset >= pos`, advance to next position
- Preload triggers at `pos - 1.5 seconds`

## Most Common Mistakes

1. **Adding patches instead of root cause fixes** - understand WHY something broke
2. **Special-casing undefined playlists** - they're normal, don't treat them differently
3. **Clearing all media state** - only clear conflicting state (images when switching to videos)
4. **Not testing all benchmarks** - your fix might break something else
5. **Assuming test frameworks** - check what's actually available before using

## When You're Stuck

### Debug Strategy

1. **Reproduce the issue** consistently
2. **Filter console logs** by relevant prefixes (`[SEQUENCER]`, `[APP-STATE]`, etc.)
3. **Trace the data flow** from user action to expected result
4. **Find where it breaks** - where expected behavior diverges
5. **Fix the root cause** not just the symptom

### Get Help

- Check `WALLMUSE_WEBPLAYER_RULES.md` sections 8-15 for detailed troubleshooting
- Look at similar working functionality in the codebase
- Test with `test-playlist-switching.html` to isolate issues

---

**Remember**: This is a robust system with many edge cases already solved. When you find an issue,
there's usually a deeper architectural reason. Fix root causes, not symptoms, and always test all
functionality after changes.
