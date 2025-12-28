# Backend Developer Brief - Playlist Change Issue

**Date**: December 4, 2025
**Priority**: HIGH - Regression since ~12 months ago ??//it's a bug in backend, I trace it as 12 months old got the commit trace, what does Regression suggest, not handled? I would be more positive, no need to talk about internal delays, issues to the world, no ??
**Suggested Developer**: Gerasimos (or other backend dev with WebSocket access)
??// we solved most of this, no, please recheck, all is good now except backend ongoing at the moment and that needs to be tested on 2 different browsers, and 2 tabs same browser not allowed as not recognized by server??
---

## 🎯 Executive Summary

Playlist switching in the webplayer stopped working ~12 months ago. Users click to change playlists, but the webplayer continues showing the old playlist.

**Root Cause**: When user requests a playlist change, **NO WebSocket message is sent** to update the webplayer with the new playlist data.

**Impact**: Users cannot navigate between playlists without doing a full page refresh (poor UX).

---

## 🔍 The Technical Problem

### What Currently Happens (BROKEN ❌)

```
1. User clicks "Playlist 2290"
2. Parent UI sets: window.currentPlaylistForNav = '2290'
3. Parent UI calls: GET /api/playlist/2290 (HTTP) ✅ Works
4. Webplayer (child) detects the change ✅ Works
5. Webplayer waits for data via WebSocket ❌ PROBLEM HERE
6. WebSocket sends: NOTHING ❌ No message received!
7. Webplayer keeps showing old playlist 264 ❌ Stuck on old data
```

### What Should Happen (EXPECTED ✅)

```
1. User clicks "Playlist 2290"
2. Parent UI sets: window.currentPlaylistForNav = '2290'
3. Parent UI calls: GET /api/playlist/2290 (HTTP)
4. Webplayer (child) detects the change
5. ⚠️ WebSocket server is notified of the change
6. WebSocket sends: {"tag_name":"playlist","id":"2290",...} ✅ New playlist data!
7. Webplayer displays the new playlist ✅ Success
```

---

## 📊 Evidence of the Problem

### Frontend Logs (Proof that frontend is working)

```
[handlePlaylistChange] Set window.currentPlaylistForNav: 2290
[handlePlaylistChange core] Parent playlist mismatch - parent has: 2290 expecting: 264
[handlePlaylistChange core] ⚠️ Backend must send playlist data via WebSocket
```

**Translation**: Frontend detects the change correctly, but is stuck waiting for WebSocket data.

### WebSocket Messages Received

When switching from playlist 264 to playlist 2290:

**Browser Network Tab (WS)**: **NO NEW MESSAGES** ❌

The webplayer receives:
- Initial playlist 264 on page load ✅
- **NOTHING when user clicks to change to playlist 2290** ❌

### What We SHOULD Receive

When user switches to playlist 2290, we should receive:

```json
{
  "tag_name": "playlist",
  "id": "2290",
  "title": "Playlist 2290 Title",
  "montages": [...]
}
```

**But we receive NOTHING** - no WebSocket message at all.

---

## 🛠️ Required Solution (Backend)

The WebSocket server must implement **one of these two options**:

### Option A: WebSocket Command (RECOMMENDED)

The client sends a command via WebSocket to request a new playlist:

**Client sends**:
```json
{
  "command": "change_playlist",
  "playlist_id": "2290"
}
```

**Server responds**:
```json
{
  "tag_name": "playlist",
  "id": "2290",
  "title": "Playlist 2290 Title",
  "montages": [...]
}
```

### Option B: HTTP API Notification

When the HTTP API receives `GET /api/playlist/2290`:
1. HTTP API notifies the WebSocket server (via Redis, database, etc.)
2. WebSocket server sends new data to the active connection
3. Requires tracking which WebSocket connection corresponds to which session

---

## 🔧 Required Access

To implement the fix, the developer will need:

### Server Access
- [ ] SSH access to WebSocket server (`wss://manager.wallmuse.com:8443/`)
- [ ] Access to WebSocket server source code
- [ ] Access to WebSocket server logs
- [ ] Permissions to restart WebSocket service

### Code Access
- [ ] WebSocket server Git repository
- [ ] WebSocket architecture documentation (if exists)
- [ ] Database schema (if used for session tracking)

### Testing Access
- [ ] Test account to test playlist changes
- [ ] Access to test environment (`wm-playerB`)
- [ ] Ability to monitor WebSocket messages

---

## 📝 Current Architecture

### Frontend (Already fixed ✅)

```
WordPress Page (Parent)
    ↓ (direct HTML injection, not iframe)
Core Webplayer (React)
    ↓ (WebSocket connection)
WebSocket Server ← ❌ THIS IS WHERE THE PROBLEM IS
```

**Important**:
- Webplayer is injected as direct HTML (not iframe) for iOS compatibility
- Parent and child share the same `window` context
- Parent-child communication via `window.currentPlaylistForNav`

### System URLs

| Service | URL | Port |
|---------|-----|------|
| HTTP API | `https://manager.wallmuse.com:8444/` | 8444 |
| WebSocket | `wss://manager.wallmuse.com:8443/` | 8443 |
| Test Player | `https://manager.wallmuse.com:8444/wm-playerB/` | 8444 |

---

## 🧪 How to Test the Fix

### 1. Manual Testing

1. Open `https://manager.wallmuse.com:8444/wm-playerB/`
2. Open browser Console (F12)
3. Note initial playlist (e.g., 264)
4. Click playlist change button to switch to 2290
5. **Check in Network tab > WS**:
   - WebSocket message received contains `"id": "2290"`
6. **Check in player**:
   - Displayed montage corresponds to playlist 2290
   - No page refresh/reload

### 2. Logs to Monitor

**Frontend (Browser console)**:
```
[handlePlaylistChange] Set window.currentPlaylistForNav: 2290
[handlePlaylistChange core] ✅ Parent-child playlist sync confirmed: 2290
```

**Backend (WebSocket server logs)**:
```
[WebSocket] Received playlist change request: 2290
[WebSocket] Sending playlist data: 2290 to client XYZ
```

### 3. Success Criteria

- [ ] WebSocket message contains correct `playlist_id`
- [ ] Displayed montage corresponds to new playlist
- [ ] No page refresh/reload
- [ ] Works for multiple successive changes
- [ ] Console shows no errors

---

## 🚨 What Does NOT Work

### ❌ Attempt 1: Page Reload

**Tried**: `window.location.reload()` when IDs match

**Result**: Infinite reload loop, black screen, catastrophic UX

**Reason**: WebSocket reconnects and sends no data → reload → no data → reload...

### ❌ Attempt 2: Frontend-Only Fix

**Impossible** because:
- Frontend cannot "force" WebSocket to send different playlist
- All data comes from WebSocket server
- Without correct data, impossible to display correct playlist

---

## 💡 Questions for Backend Developer

Before starting, the developer should answer:

1. **Current WebSocket architecture**:
   - What framework/language for WebSocket server? (Node.js, Python, Java, etc.)
   - How are playlists currently sent to clients?
   - Is there already a WebSocket command system?

2. **Session tracking**:
   - How to track which WebSocket connection corresponds to which user?
   - Is there a session ID or token?

3. **HTTP ↔ WebSocket communication**:
   - Can the HTTP API and WebSocket server communicate?
   - Via what method? (Redis pub/sub, database, internal API, etc.)

4. **History**:
   - ⚠️ **CRITICAL**: Commit `e09efeacc4` by Frederic Ortun (1 year ago) titled "Playlist change bug"
   - This commit **deleted** `PlaylistFactory.ts` which had playlist update logic
   - The old code called `Sequencer.assumeNewPlaylist()` when playlists changed
   - The new code in `Globals.ts` only calls `assumeNewPlaylist()` when `setCurrentPlaylist()` is called
   - **Root cause**: WebSocket doesn't call `setCurrentPlaylist()` when user switches playlists
   - Frontend now expects WebSocket to send new playlist data to trigger the update

---

## 🔍 Root Cause Analysis (Based on Git History)

### The Breaking Change (Commit e09efeacc4 - 1 year ago)

Frederic's commit "Playlist change bug" made these changes:

**What was deleted**:
```typescript
// PlaylistFactory.ts (DELETED FILE)
export const updatePlaylist = (p: Playlist) => {
    setCurrentPlaylist(p);
    // Check if it has actually changed
    // if (! p.isEquivalent(Playlist.getCurrent())) {
    //     Playlist.setPlaylist(p);
    //     Sequencer.assumeNewPlaylist();  // ← This handled playlist changes!
    //     SysTray.refreshState();
    //     if (! enoughSimilar) {
    //         restartPlayIfPlaying();
    //     }
    // }
}
```

**What replaced it**:
```typescript
// Globals.ts (MODIFIED)
export const setCurrentPlaylist = (p: Playlist) => {
    if (p.id !== ThePlaylist.id) {  // ← Only if ID is different
        ThePlaylist = p;
        Sequencer.assumeNewPlaylist();
    }
};

// CommandsManager.ts (MODIFIED)
private loadPlaylist(p: Playlist) {
    setCurrentPlaylist(p);  // Direct call instead of updatePlaylist()
}
```

### Why This Broke Playlist Switching

**Before the commit** (Working ✅):
1. User switches playlist → HTTP API call
2. Some mechanism triggered WebSocket to send new playlist data
3. `CommandsManager.loadPlaylist()` called `updatePlaylist()`
4. `updatePlaylist()` handled the change and called `Sequencer.assumeNewPlaylist()`
5. Player updated ✅

**After the commit** (Broken ❌):
1. User switches playlist → HTTP API call
2. **WebSocket doesn't send new playlist data** ❌
3. `setCurrentPlaylist()` is never called
4. `Sequencer.assumeNewPlaylist()` never runs
5. Player stays stuck on old playlist ❌

### The Missing Piece

The commit simplified the frontend logic but **requires** the WebSocket server to actively send playlist change messages. The backend was never updated to match this new requirement.

**Frontend now expects**: WebSocket server to send `{"tag_name":"playlist","id":"2290",...}` when user switches playlists

**Backend currently does**: Nothing - doesn't send any message when playlist changes

---

## 📚 References

### Detailed Documents
- [WEBPLAYER_TROUBLESHOOTING.md](WEBPLAYER_TROUBLESHOOTING.md) - Complete guide with all debugging
- [WEBSOCKET_SYSTEM.md](WEBSOCKET_SYSTEM.md) - WebSocket system documentation

### Frontend Code (For reference)
- [src/index.tsx:500-520](src/index.tsx#L500-L520) - Playlist change detection
- [src/ws/ws-tools.ts](src/ws/ws-tools.ts) - WebSocket client

### Endpoints
- HTTP API: `GET https://manager.wallmuse.com:8444/api/playlist/{id}`
- WebSocket: `wss://manager.wallmuse.com:8443/`

---

## 📞 Contact & Next Steps

**Client**: Alexandre Khan
**Timeline**: Problem exists since ~18 months, needs urgent fix
**User Impact**: Cannot navigate between playlists

**Suggested next steps**:
1. Backend developer confirms access and current architecture
2. Choose between Option A (WebSocket command) or Option B (HTTP notification)
3. Implementation of fix
4. Testing in development environment
5. Production deployment
6. Verification with manual tests

---

## 🐛 Memory Leak (Bonus)

While backend developer works on WebSocket, Alexandre will fix a memory leak on frontend side.

**No coordination needed** - these are independent issues.

---

**Note for Gerasimos**: If you have questions about the architecture or need additional information, everything is documented in `WEBPLAYER_TROUBLESHOOTING.md`. Frontend fixes are already done and tested. The only blocker is on the WebSocket server side.

---

**Version**: 1.0
**Language**: English
**Status**: Ready for backend developer
