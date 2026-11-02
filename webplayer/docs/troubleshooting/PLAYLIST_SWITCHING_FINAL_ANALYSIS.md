# Playlist Switching - Final Analysis

**Date**: December 4, 2025

---

## What We Discovered

### Both Versions Have Same Code! ✅

**Production (`webplayer2`)**:
- Has `window.webPlayerNavigate()` at line 307 ✅
- Parent calls it when playlist changes ✅

**Test (`webplayer2B`)**:
- Has `window.webPlayerNavigate()` at line 309 ✅
- Parent calls it when playlist changes ✅

**THEY'RE THE SAME!** So why does test version restart the app?

---

## The Real Difference

### On Production (wallmuse.com):
**Your observation**: "I changed playlist, no websocket arrives and it is playing"

### On Test (ooo2.wallmuse.com/v4b/):
**Your observation**: WebSocket messages arrive showing montages + playlist, then app restarts

**The WebSocket messages you saw**:
```
12:09:33.863 - Montage 1606
12:09:33.939 - Montage 1612
12:09:34.008 - Montage 1613
...
12:09:34.357 - Playlist 954  ← App restarts HERE
```

---

## Root Cause

The restart happens when **CommandsManager receives the playlist WebSocket message** and calls:

```typescript
// CommandsManager.ts:41-44
private loadPlaylist(p: Playlist) {
    setCurrentPlaylist(p);  // ← This triggers assumeNewPlaylist()
}
```

Which triggers:

```typescript
// Globals.ts
export const setCurrentPlaylist = (p: Playlist) => {
    if (p.id !== ThePlaylist.id) {
        ThePlaylist = p;
        Sequencer.assumeNewPlaylist();  // ← THIS RESTARTS THE APP!
    }
};
```
??this above section needs to be rewritten as solved, priority to parent, if websocket arrives and same playlist, smae index position, ignored, no? //position is briefed for backend changes Batch 1??
---

## Why Production Doesn't Restart

**Theory 1**: Production server doesn't send WebSocket playlist messages ??//obsolete now, no??
- Maybe production backend is different
- No message = no restart ✅

**Theory 2**: Production has already loaded the playlist
- When WebSocket message arrives, `p.id === ThePlaylist.id`
- So `setCurrentPlaylist()` does nothing (exits early)
- No restart ✅

---

## Solution Options

### Option 1: Prevent WebSocket From Sending Redundant Playlist Messages

If `window.webPlayerNavigate()` already handles the playlist switch, the WebSocket message arriving 6 seconds later is **redundant** and causes an unnecessary restart.

**Backend fix**: Don't send playlist message if playlist ID hasn't changed.

??//as this md was untouched please update it, also below??

### Option 2: Make setCurrentPlaylist() Smarter

Don't restart if we're already on the correct playlist:

```typescript
export const setCurrentPlaylist = (p: Playlist) => {
    if (p.id !== ThePlaylist.id) {
        ThePlaylist = p;
        Sequencer.assumeNewPlaylist();
    } else {
        console.log('[Globals] Already on playlist', p.id, '- skipping restart');
        // Just update the playlist data without restarting
        ThePlaylist = p;
    }
};
```

### Option 3: Check If Playlist Data Changed (Not Just ID)

```typescript
export const setCurrentPlaylist = (p: Playlist) => {
    const idChanged = p.id !== ThePlaylist.id;
    const dataChanged = !p.isEquivalent?.(ThePlaylist); // If such method exists

    if (idChanged) {
        ThePlaylist = p;
        Sequencer.assumeNewPlaylist();  // Full restart needed
    } else if (dataChanged) {
        ThePlaylist = p;  // Update data only, no restart
        console.log('[Globals] Playlist data updated without restart');
    } else {
        console.log('[Globals] Playlist unchanged, ignoring');
    }
};
```

---

## Recommended Fix

**Implement Option 2** - Update Globals.ts to not restart when playlist ID is same:

```typescript
export const setCurrentPlaylist = (p: Playlist) => {
    const needsRestart = p.id !== ThePlaylist.id;

    if (needsRestart) {
        console.log('[Globals] Playlist ID changed:', ThePlaylist.id, '→', p.id, '- restarting');
        ThePlaylist = p;
        Sequencer.assumeNewPlaylist();
    } else {
        console.log('[Globals] Same playlist ID:', p.id, '- updating data without restart');
        ThePlaylist = p;  // Update playlist object but don't restart
    }
};
```

This way:
1. `webPlayerNavigate()` switches playlist smoothly ✅
2. WebSocket message arrives 6 seconds later
3. `setCurrentPlaylist()` sees same ID, just updates data, no restart ✅
4. User sees instant playlist switch with no black screen ✅

---

## Testing Plan

1. Deploy fix to Globals.ts
2. Switch playlist on test site
3. Verify:
   - Playlist switches immediately (via webPlayerNavigate)
   - No app restart when WebSocket arrives
   - Logs show "Same playlist ID - updating data without restart"

---

**Status**: Ready to implement Option 2
