# Production vs Test Version Comparison

**Date**: December 4, 2025

---

## Directory Structure

| Version | Path | Description |
|---------|------|-------------|
| **Test WebPlayer** | `/Users/alexandrekhan/react/webplayer2B` | Your fork with fixes (wm-playerB) |
| **Prod WebPlayer** | `/Users/alexandrekhan/react/webplayer2` | Production webplayer (wm-player) |
| **Test Parent** | `/Users/alexandrekhan/react/play C 3` | Test parent UI (loads wm-playerB) |
| **Prod Parent** | `/Users/alexandrekhan/react/play C` | Production parent UI (loads wm-player) |
??// the was an error it said
| **Test Parent** | `/Users/alexandrekhan/react/play C`
it should be
| **Test Parent** | `/Users/alexandrekhan/react/play C 3` 
?? 
---

## Key Difference in Playlist Handling

### Production (webplayer2/src/index.tsx:499-505)

```typescript
const parentPlaylist = (window.parent as any)?.currentPlaylist;
if (parentPlaylist && parentPlaylist.id === playlist) {
    console.log('[React] Found target playlist in parent globals, calling setCurrentPlaylist');
    const { setCurrentPlaylist } = require('./manager/Globals');
    setCurrentPlaylist(parentPlaylist);  // ← CALLS setCurrentPlaylist() DIRECTLY!
}
```

**How it works**:
1. Looks for `window.parent.currentPlaylist` (full object)
2. If found, **immediately calls** `setCurrentPlaylist(parentPlaylist)`
3. No WebSocket wait needed - instant playlist switch! ✅

### Test (webplayer2B/src/index.tsx:503-509)

```typescript
const parentPlaylistId = (window as any).currentPlaylistForNav;
if (parentPlaylistId && String(parentPlaylistId) === String(playlist)) {
    console.log('[handlePlaylistChange core] ✅ Parent-child playlist sync confirmed:', parentPlaylistId);
    console.log('[handlePlaylistChange core] ⏳ Waiting for WebSocket to send playlist data (usually arrives within 5-10 seconds)...');
    // ← DOES NOT CALL setCurrentPlaylist()! Just waits for WebSocket!
}
```

**How it works (or doesn't)**:
1. Looks for `window.currentPlaylistForNav` (just ID string)
2. Confirms sync but **does NOT call** `setCurrentPlaylist()`
3. Waits for WebSocket message (5-10 seconds)
4. When WebSocket arrives, triggers full app restart (black screen) ❌

---

## The Critical Mistake

In our debugging session, we **incorrectly assumed**:
- Production must be using WebSocket for playlist changes
- We need to wait for WebSocket messages

**The reality**:
- Production uses `window.parent.currentPlaylist` (full playlist object)
- Production calls `setCurrentPlaylist()` immediately - no WebSocket wait!
- The WebSocket messages you saw arriving later are **not needed** for playlist switching

---

## Parent Comparison

### Both Versions Set The Same Variable

**Test Parent** (`play C/play/src/App.js:614`):
```javascript
window.currentPlaylistForNav = selectedPlaylistId;
```

**Production Parent** (assumed same):
```javascript
window.currentPlaylistForNav = selectedPlaylistId;
```

**BUT**: Production child looks for `window.parent.currentPlaylist` (object), not `window.currentPlaylistForNav` (ID)!

---

## What Actually Happens in Production

Based on the code, here's what **should** happen in production:

1. Parent sets `window.currentPlaylistForNav = '2290'` (ID only)
2. Child looks for `window.parent.currentPlaylist` (full object) ← **This probably doesn't exist!**
3. Child logs "Could not find playlist data in parent globals"
4. Child does nothing
5. **BUT somehow playlist still changes...** 🤔

**This suggests**:
- Either production parent DOES set `window.parent.currentPlaylist` somewhere else
- OR production child has another mechanism we haven't seen yet
- OR production relies on WebSocket messages (contradicting what code shows)

---

## Testing Results

### Production (wallmuse.com)
**Your observation**: "I changed playlist, no websocket arrives and it is playing"

**This proves**:
- Production does NOT wait for WebSocket
- Playlist changes immediately without WebSocket messages
- No app reload/restart ✅

### Test (ooo2.wallmuse.com/v4b/)
**Your observation**: "V4b test version is changing, but reloads entirely the app as context dependent. As in UI this looks unprofessional"

**This proves**:
- Test version waits for WebSocket (5-10 seconds)
- When WebSocket arrives, triggers `Sequencer.assumeNewPlaylist()` → full restart
- Black screen / unprofessional UX ❌

---

## The Real Question

**How does production switch playlists without WebSocket?**

Options:
1. Production parent sets `window.parent.currentPlaylist` (full object) that we haven't found yet
2. Production child has additional logic we haven't examined
3. Production URL navigation triggers a different code path

**Need to investigate**:
- Check if production parent sets `window.parent.currentPlaylist` anywhere
- Compare full navigation flows between prod and test
- Check if URL parameters differ between versions

---

## Recommended Fix

To make test version work like production:

### Option A: Restore Production Pattern (if parent provides full object)

```typescript
const parentPlaylist = (window as any).currentPlaylist;
if (parentPlaylist && String(parentPlaylist.id) === String(playlist)) {
    console.log('[React] Found playlist in parent, calling setCurrentPlaylist');
    const { setCurrentPlaylist } = require('./manager/Globals');
    setCurrentPlaylist(parentPlaylist);  // Immediate switch!
    return; // Don't wait for WebSocket
}
```

### Option B: Parent Must Provide Full Playlist Data

If parent only provides ID, parent needs to be changed to provide full playlist object:

```javascript
// In parent App.js after HTTP API call:
const playlistData = await fetchPlaylist(selectedPlaylistId);
window.currentPlaylistForNav = selectedPlaylistId;
window.currentPlaylist = playlistData;  // ← Add this!
```

---

## Summary

| Aspect | Production | Test (webplayer2B) |
|--------|-----------|-------------------|
| **Playlist switch speed** | Instant | 5-10 seconds |
| **WebSocket dependency** | No | Yes |
| **App restart on switch** | No | Yes (black screen) |
| **User experience** | Smooth ✅ | Unprofessional ❌ |
| **Parent data required** | Full playlist object? | Just ID |
| **Code pattern** | `setCurrentPlaylist(parentPlaylist)` | Wait for WebSocket |

**Action Required**: Investigate how production parent provides playlist data, then replicate that pattern in test version.
??//this is solved no???
---

**Next Steps**:
1. Test production console to see what `window.parent.currentPlaylist` contains
2. Check if production parent has additional playlist data setting
3. Restore immediate `setCurrentPlaylist()` call in test version once we confirm data source
??//Next steps for me fix backend websocket change so when changing playlist or position systematically sent, except not for house demo/free account that will only rely on parent as new comers before having an account// 