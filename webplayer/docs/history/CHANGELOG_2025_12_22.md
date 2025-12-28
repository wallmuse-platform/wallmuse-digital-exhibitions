# WebPlayer2B - Critical Fixes - December 22, 2025

## Session Overview
Fixed multiple critical issues related to video slot management, playlist switching, and CSS z-index layering.

## 🚨 THE MOST CRITICAL DISCOVERY: Dual-Mode Architecture (Parent + WebSocket)

**The Root Misconception**: We initially believed playlist changes required WebSocket messages because we saw them arriving during testing.

**The Reality**: The system now supports **BOTH** modes simultaneously:
- ✅ **Parent-child communication** (instant) - For web UI user interactions
- ✅ **WebSocket messages** (delayed but functional) - For remote control & multi-device sync
- 🎯 **Smart coordination**: `setCurrentPlaylist()` checks playlist ID to prevent duplicate updates

**What Was Happening (WRONG)**:
1. User switches playlist → Parent calls `window.webPlayerNavigate()`
2. Child waits for WebSocket message (5-10 seconds)
3. WebSocket arrives with playlist data
4. Child calls `Sequencer.assumeNewPlaylist()` → **Full app restart (black screen)** ❌

**What Should Happen (CORRECT - Like Production)**:
1. User switches playlist → Parent calls `window.webPlayerNavigate()`
2. Parent provides playlist data via `window.currentPlaylist` (plain object)
3. Child converts to Playlist instance: `new Playlist(parentPlaylist)`
4. Child calls `setCurrentPlaylist(playlistInstance)` → **Instant playlist switch** ✅
5. WebSocket message may arrive later, but child ignores it (same playlist ID)

**The Fix That Made Everything Work**:
[src/index.tsx:505-508](src/index.tsx#L505-L508) - Immediately use parent's playlist data instead of waiting for WebSocket:

```typescript
const parentPlaylist = (window.parent as any)?.currentPlaylist;
if (parentPlaylist && parentPlaylist.id === playlist) {
  const { Playlist } = require('./dao/Playlist');
  const playlistInstance = new Playlist(parentPlaylist);
  setCurrentPlaylist(playlistInstance);  // ← Instant switch, no WebSocket wait!
}
```

**Why This Dual-Mode Architecture Works**:
- **Web UI users**: Instant playlist switching via parent-child (no waiting)
- **Remote control**: WebSocket still works for admin panel / multi-device commands
- **Multi-device sync**: Backend can broadcast WebSocket to all screens in house
- **No conflicts**: `setCurrentPlaylist()` checks `p.id !== ThePlaylist.id` before updating
- **Future-proof**: Ready for Electron standalone (will use WebSocket-only mode)

**Current Use Case (Phase 1 - Web Only)**:
- Single-screen web viewing on wallmuse.com
- Parent-child handles all UI interactions
- WebSocket available but not required

**Future Use Case (Phase 2 - Multi-Device)**:
- Backend broadcasts WebSocket to all screens when one changes playlist
- All screens sync via WebSocket (gallery installations)
- Parent-child still provides instant feedback for initiating screen

**Future Use Case (Phase 3 - Electron Standalone)**:
- No parent window, pure WebSocket mode
- Multi-device cluster synchronization
- 6+ months timeline (when proper team available)

**Reference**: See [PROD_VS_TEST_COMPARISON.md](PROD_VS_TEST_COMPARISON.md) and [PLAYLIST_SWITCHING_FINAL_ANALYSIS.md](PLAYLIST_SWITCHING_FINAL_ANALYSIS.md) for full analysis of how production works vs our initial wrong assumptions.

---

## 🔧 Fix 1: Simultaneous Audio Playback (Dual Video Slots Playing)

**Problem**: After removing `undefined` clearing to fix black screens, both video slots (video1 and video2) were playing simultaneously, causing overlapping audio.

**Root Cause**: Video elements remain active when hidden via CSS. Without explicit pause() calls, both videos continue playing even when only one is visible.

**Solution**: Added pause() calls before switching video slots in [src/App.tsx:654-658](src/App.tsx#L654-L658) and [src/App.tsx:681-685](src/App.tsx#L681-L685)

```typescript
// When showing video1:
if (this.video2Ref?.current && this.state.video2) {
  this.video2Ref.current.pause();
  console.log('[App.showVideo] Paused video2 to prevent simultaneous playback');
}

// When showing video2:
if (this.video1Ref?.current && this.state.video1) {
  this.video1Ref.current.pause();
  console.log('[App.showVideo] Paused video1 to prevent simultaneous playback');
}
```

**Why This Works**: Only pauses if the video slot actually has media loaded (prevents errors on empty refs).

---

## 🔧 Fix 2: TypeError - getMontagesCount() Not a Function

**Problem**: `TypeError: e.getMontagesCount is not a function` when parent passed playlist data during navigation.

**Root Cause**: Parent's `window.currentPlaylist` is a plain JavaScript object from HTTP API, but `Globals.setCurrentPlaylist()` expects a Playlist class instance with methods like `getMontagesCount()`.

**Solution**: Convert plain object to Playlist instance in [src/index.tsx:505-508](src/index.tsx#L505-L508)

```typescript
const parentPlaylist = (window.parent as any)?.currentPlaylist;
if (parentPlaylist && parentPlaylist.id === playlist) {
  const { setCurrentPlaylist } = require('./manager/Globals');
  const { Playlist } = require('./dao/Playlist');
  // Convert plain object to Playlist instance
  const playlistInstance = new Playlist(parentPlaylist);
  setCurrentPlaylist(playlistInstance);
}
```

**Why This Works**: `new Playlist(plainObject)` wraps the plain object with all Playlist class methods.

---

## 🔧 Fix 3: BOUNDS ERROR - Position as Object Instead of Number

**Problem**: `🚨 BOUNDS ERROR: Montage index {montage: 0}` - Parent passes position as object `{montage: 0, track: 1}` but child code expects number `0`.

**Root Cause**: Regression from copying clean webplayer2 code. Parent has always sent structured position objects, but this pattern was lost.

**Solution**: Added position resolution logic in [src/index.tsx:333-350](src/index.tsx#L333-L350)

```typescript
// CRITICAL FIX: Resolve position if it's an object {montage: X, track: Y}
let resolvedPosition: number | undefined;
let resolvedTrack: string | number | undefined = track;

if (typeof position === 'object' && position !== null && 'montage' in position) {
  resolvedPosition = position.montage;  // Extract number from object
  if (position.track !== undefined && resolvedTrack === undefined) {
    resolvedTrack = position.track;
  }
} else if (typeof position === 'number') {
  resolvedPosition = position;
} else if (position !== null && position !== undefined) {
  console.log(`[React] 🚨 NAVIGATION: Invalid position format, ignoring:`, position);
  resolvedPosition = undefined;
} else {
  resolvedPosition = position;
}
```

**Updated All References**: Changed `position` to `resolvedPosition` throughout `webPlayerNavigate()` function at lines 364, 375-407, 647-668, 670-698, 730-747.

**Why This Works**: Handles both legacy number format and new object format. Extracts `track` from position object if not explicitly provided.

---

## 🔧 Fix 4: Video Component Unmount/Remount on 3rd Transition

**Problem**: Every 3rd montage transition caused both video components to unmount and remount simultaneously, aborting video file requests with `ERR_CONNECTION_CLOSED`.

**Root Cause**: IIFE (Immediately Invoked Function Expression) wrapper around Video components created new function closure on every render. React saw this as a completely new component tree and unmounted/remounted everything inside it.

**User's Key Insight**: "it s to do with slots probably, 1 ok, 2 ok, but then 1 for montage 3, a cycle issue, no?" - Correctly identified the slot cycling pattern (1→2→1).

**Solution**: Removed IIFE wrapper in [src/App.tsx:2373-2391](src/App.tsx#L2373-L2391)

**Before (Broken)**:
```typescript
{(() => {
  if (hasVideosInPlaylist) {
    return <>
      <Video key="video-1" ... />
      <Video key="video-2" ... />
    </>
  }
})()}  // ← New function instance every render!
```

**After (Fixed)**:
```typescript
<Video
  key="video-1"
  ref={this.video1Ref}
  index={1}
  media={video1 || null}
  hidden={this.state.videoShown !== 1}
  shouldLoad={true}
/>
<Video
  key="video-2"
  ref={this.video2Ref}
  index={2}
  media={video2 || null}
  hidden={this.state.videoShown !== 2}
  shouldLoad={true}
/>
```

**Why This Works**:
- Stable component references - React sees same components across renders
- Uses `hidden` prop for visibility instead of conditional rendering
- Bundle size decreased 327 bytes

**Important Note**: UNMOUNTING/MOUNTING logs in console are **NOT** actual unmounts - they're from useEffect cleanup when `media?.filename` changes. This is normal React behavior.

---

## 🔧 Fix 5: Misleading Debug Output - PlayerPosition Properties

**Problem**: `debugPlayerState()` showed `montage: undefined` in console output.

**Root Cause**: PlayerPosition uses getter methods like `getMontageIndex()`, not direct properties like `.montage`.

**Solution**: Updated debug function in [src/App.tsx:1840-1849](src/App.tsx#L1840-L1849)

**Before**:
```typescript
console.log({
  montage: pos?.montage,  // undefined - property doesn't exist!
  track: pos?.track,
  item: pos?.item
});
```

**After**:
```typescript
console.log({
  montage: pos.getMontageIndex(),  // Correct method
  track: pos.getTrackIndex(),
  item: pos.getItemIndex(),
  offset: pos.getOffset()?.toFixed(2),
});
```

**Why This Works**: Uses the correct public API methods from PlayerPosition class.

---

## 🔧 Fix 6: Black Screen on Playlist Change with goMontage (Z-Index Issue)

**Problem**: Changing playlist with `goMontage(3)` resulted in black screen. Video element rendered with `z-index: 0` when it should be `z-index: 2`.

**Root Cause**: CSS z-index rules required `#root-wm-player` as parent container:
```css
#root-wm-player .video[data-index='1'] { z-index: 2; }
```

But during playlist changes, the DOM structure was:
```html
<div id="wm-player-contents">  <!-- Missing #root-wm-player parent! -->
  <video id="video-1" class="video">  <!-- z-index: 0 (default) -->
```

**Solution**: Updated CSS selectors in [src/App.css:74-92](src/App.css#L74-L92) to support both container IDs

```css
/* CRITICAL FIX: Give the currently playing video higher z-index */
/* UPDATED: Works with both #root-wm-player and #wm-player-contents as parent */
#root-wm-player .video[data-index='1'],
#wm-player-contents .video[data-index='1'] {
  z-index: 2 !important;
}

#root-wm-player .video[data-index='2'],
#wm-player-contents .video[data-index='2'] {
  z-index: 1 !important;
}

/* CRITICAL FIX: When video is hidden, reduce its z-index but keep it visible */
#root-wm-player .video.hidden,
#wm-player-contents .video.hidden {
  z-index: 0 !important;
  display: block !important;
  opacity: 0 !important;
  visibility: hidden !important;
}
```

**Why This Works**:
- CSS rules now match whether parent is `#root-wm-player` OR `#wm-player-contents`
- Handles both normal operation and playlist change states
- Video1 gets `z-index: 2`, Video2 gets `z-index: 1`, hidden videos get `z-index: 0`

**CSS File Size**: Increased 15 bytes (expected for duplicate selectors)

---

## 🎯 Testing Results

All fixes verified working:
- ✅ No simultaneous audio playback during transitions
- ✅ No TypeError when parent passes playlist data
- ✅ Position objects correctly resolved to montage/track indexes
- ✅ Video components remain stable across all transitions (no unmount/remount)
- ✅ Debug output shows correct position data
- ✅ Playlist changes with goMontage show video correctly (no black screen)

---

## 🔑 Key Architectural Insights

### Double-Buffering Video System
- Two video slots (`video1`, `video2`) alternate to enable smooth transitions
- Only one is visible at a time via `videoShown` state (1 or 2)
- Hidden video preloads next content while visible video plays
- **Critical**: Must pause hidden video to prevent simultaneous playback
- **Critical**: Must maintain stable component identity to prevent unmount/remount

### React Reconciliation Pitfalls
- IIFE wrappers create new function instances → React sees new components → unmount/remount
- Conditional rendering (`{condition && <Component />}`) can cause unmounts
- Stable keys + `hidden` prop = components persist across renders
- useEffect cleanup !== component unmounting (check dependency array)

### Parent-Child Communication
- Parent may pass plain objects from HTTP API
- Child must convert to class instances when methods are needed
- Position can be number OR object - must handle both formats
- Parent container ID can vary (`#root-wm-player` vs `#wm-player-contents`)

### CSS Z-Index Layering
- Video1: `z-index: 2` (visible video)
- Video2: `z-index: 1` (preloading video)
- Hidden: `z-index: 0` (not visible)
- Must support multiple parent container IDs for robustness

---

## 📝 Known Issues (Deferred)

### Loading State Indicator
**Issue**: Black screen during initial load with no visible "Loading..." message.

**Status**: Deferred for later fine-tuning (user decision: "we move on to other testing, we can fine tune later")

**Location**: Loading state logic was not touched during this session.

---

## 🚀 Deployment

**Build**: `npm run build` - Compiled successfully with warnings (unused vars, eslint rules)

**Deploy**: `bash scripts/wmp-test.sh` - Deployed to test server `ooo2.wallmuse.com/v4b/`

**Bundle Sizes**:
- JS: 94.8 kB (gzipped)
- CSS: 737 B (gzipped) [+15 B from z-index fix]

---

## 🔍 Debugging Keywords

Filter console logs with these keywords:
- `[App.showVideo]` - Video slot switching
- `[Video Component]` - Video component lifecycle
- `[React]` - React mounting/navigation
- `BOUNDS ERROR` - Position validation errors
- `CRITICAL FIX` - Critical code sections
- `debugPlayerState` - Player state inspection

---

## ⚠️ Critical Files - Handle with Care

These files contain subtle interdependencies:

1. **[src/App.tsx](src/App.tsx)** - Video slot management, double-buffering logic
2. **[src/index.tsx](src/index.tsx)** - Parent-child communication, position resolution
3. **[src/App.css](src/App.css)** - Z-index layering (requires both container ID selectors)
4. **[src/component/video.tsx](src/component/video.tsx)** - Video lifecycle (useEffect cleanup logs are misleading)
5. **[src/manager/Sequencer.ts](src/manager/Sequencer.ts)** - Already clears video slots during playlist changes
6. **[src/manager/PlayerPosition.ts](src/manager/PlayerPosition.ts)** - Use methods, not properties

---

## 📚 Related Documentation

- [PLAYLIST_SWITCHING_FINAL_ANALYSIS.md](PLAYLIST_SWITCHING_FINAL_ANALYSIS.md) - Playlist switching behavior analysis
- [PROD_VS_TEST_COMPARISON.md](PROD_VS_TEST_COMPARISON.md) - Production vs test version differences
- [WEBSOCKET_SYSTEM.md](WEBSOCKET_SYSTEM.md) - WebSocket communication protocol
- [WALLMUSE_WEBPLAYER_RULES.md](WALLMUSE_WEBPLAYER_RULES.md) - Core architecture rules
- [BACKEND_DEVELOPER_BRIEF.md](BACKEND_DEVELOPER_BRIEF.md) - Backend integration guide

---

## 🎯 The Big Picture: What We Learned

### The Wrong Path (What We Initially Thought)
We spent significant time investigating WebSocket messages, thinking they were essential for playlist changes. We saw WebSocket messages arriving during playlist switches and assumed they were the trigger mechanism.

**This was completely wrong.**

### The Right Path (What Actually Works)
Production has **always** used direct parent-child communication via `window.currentPlaylist`. The WebSocket messages we saw were:
1. **Delayed** (5-10 seconds after the user action)
2. **Redundant** (parent already provided the data)
3. **Harmful** (caused unnecessary app restarts when they arrived)

### The Core Architecture (How It Should Work)

```
User clicks playlist
       ↓
Parent HTTP API call (get playlist data)
       ↓
Parent sets: window.currentPlaylist = {...}
       ↓
Parent calls: window.webPlayerNavigate(playlistId, position)
       ↓
Child reads: window.currentPlaylist
       ↓
Child converts: new Playlist(window.currentPlaylist)
       ↓
Child updates: setCurrentPlaylist(playlistInstance)
       ↓
INSTANT PLAYLIST SWITCH ✅

[Later, 5-10 seconds...]
WebSocket message arrives (optional, for remote control)
       ↓
Child checks: same playlist ID? → Ignore it
```

### Why WebSocket Seemed Important
Because in our test environment, the WebSocket server was sending playlist messages. When we removed the immediate parent-child switch logic, these delayed WebSocket messages became the **only** way playlists changed - resulting in:
- 5-10 second delays
- Full app restarts (black screens)
- Unprofessional UX

### The Single Line That Fixed Everything
```typescript
const playlistInstance = new Playlist(parentPlaylist);
```

This one line converts the parent's plain object into a class instance with methods, allowing immediate playlist switching without WebSocket dependency.

### Key Takeaway for Future Developers
**WebSocket is NOT required for playlist changes.** It's only needed for:
- Remote control from other devices
- Multi-screen synchronization
- Server-initiated updates

For user-initiated playlist changes via the UI, **parent-child communication is sufficient and superior** (instant, no delays, no restarts).

---

**Session Date**: December 22, 2025
**Build Version**: main.ec9607de.js / main.7338d45e.css
**Status**: All fixes deployed and tested ✅

**Most Critical Fix**: WebSocket dependency removed - playlist changes now instant like production ✅
