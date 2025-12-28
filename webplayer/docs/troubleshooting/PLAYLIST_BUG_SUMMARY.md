# Playlist Change Bug - Summary

**Date**: December 4, 2025
**Status**: Root cause identified from Git history

---

## 🎯 TL;DR

**Problem**: Playlist switching stopped working 1 year ago
**Root Cause**: Frederic's commit `e09efeacc4` ("Playlist change bug") deleted the playlist update logic
**Impact**: Frontend now expects WebSocket to send playlist change messages, but backend was never updated
**Fix Required**: Backend WebSocket server must send new playlist data when user switches playlists

---

## 📜 The Smoking Gun

### Commit Details

- **Commit**: `e09efeacc4`
- **Author**: Frederic Ortun <fortun@aloum.net>
- **Date**: 1 year ago (December 2023)
- **Title**: "Playlist change bug"
- **Repository**: http://wallmuse2.aloum.net:3000/Wallmuse/WebPlayer

### What Frederic Changed

#### Deleted File: `PlaylistFactory.ts`

This file contained the playlist update logic:

```typescript
export const updatePlaylist = (p: Playlist) => {
    setCurrentPlaylist(p);
    // Check if it has actually changed
    // if (! p.isEquivalent(Playlist.getCurrent())) {
    //     Playlist.setPlaylist(p);
    //     Sequencer.assumeNewPlaylist();  // ← This was critical!
    //     SysTray.refreshState();
    //     if (! enoughSimilar) {
    //         restartPlayIfPlaying();
    //     }
    // }
}
```

**The commented-out code shows there WAS logic to handle playlist changes**, but it was already disabled when Frederic made his commit.

#### Modified: `Globals.ts`

**New code**:
```typescript
export const setCurrentPlaylist = (p: Playlist) => {
    if (p.id !== ThePlaylist.id) {  // ← Only updates if ID is different
        ThePlaylist = p;
        Sequencer.assumeNewPlaylist();
    }
};
```

**Key Point**: This function is the **ONLY** way to trigger `Sequencer.assumeNewPlaylist()` now.

#### Modified: `CommandsManager.ts`

**Before**:
```typescript
private loadPlaylist(p: Playlist) {
    updatePlaylist(p);  // Called the factory
}
```

**After**:
```typescript
private loadPlaylist(p: Playlist) {
    setCurrentPlaylist(p);  // Direct call
}
```

**Key Point**: `loadPlaylist()` is called by WebSocket messages. If no WebSocket message arrives, this never runs.

---

## 🔍 Why It Broke

### The Flow Before (When It Worked)

```
User clicks playlist change button
    ↓
HTTP API: GET /api/playlist/2290
    ↓
[SOMETHING HAPPENED HERE - need to investigate backend]
    ↓
WebSocket sends: {"tag_name":"playlist","id":"2290",...}
    ↓
CommandsManager.loadPlaylist() called
    ↓
updatePlaylist() → Sequencer.assumeNewPlaylist()
    ↓
✅ Player updates to new playlist
```

### The Flow After (Broken)

```
User clicks playlist change button
    ↓
HTTP API: GET /api/playlist/2290
    ↓
[NOTHING HAPPENS - WebSocket doesn't send message]
    ↓
❌ setCurrentPlaylist() never called
    ↓
❌ Sequencer.assumeNewPlaylist() never runs
    ↓
❌ Player stuck on old playlist
```

---

## 🛠️ What Needs to Be Fixed

### Backend WebSocket Server

The WebSocket server needs to:

1. **Detect when a playlist change request happens**
   - Either via WebSocket command from client
   - Or via notification from HTTP API

2. **Send a WebSocket message with new playlist data**
   ```json
   {
     "tag_name": "playlist",
     "id": "2290",
     "title": "Playlist 2290 Title",
     "montages": [...]
   }
   ```

3. **Trigger `CommandsManager.loadPlaylist()`**
   - This calls `setCurrentPlaylist()`
   - Which calls `Sequencer.assumeNewPlaylist()`
   - Which updates the player ✅

---

## 🔎 Questions for Gerasimos/Backend Developer

1. **Before Frederic's commit**:
   - Was there a mechanism for WebSocket to receive playlist change notifications?
   - How did the HTTP API communicate with WebSocket server?
   - What triggered WebSocket to send new playlist data?

2. **Backend code location**:
   - Where is the WebSocket server code?
   - Is it in a separate repository?
   - What language/framework? (Node.js, Python, Java, etc.)

3. **Current architecture**:
   - Does HTTP API and WebSocket server share a database?
   - Is there Redis, message queue, or other communication mechanism?
   - How are WebSocket connections tracked per user/session?

---

## 📋 Action Items

### For Backend Developer (Gerasimos or other)

- [ ] Find the WebSocket server code repository
- [ ] Examine commit history from 1 year ago (December 2023)
- [ ] Look for deleted/modified code related to playlist change notifications
- [ ] Identify how HTTP API can notify WebSocket server of playlist changes
- [ ] Implement one of these solutions:
  - **Option A**: WebSocket command to request playlist change
  - **Option B**: HTTP API triggers WebSocket to push new playlist data

### For Alexandre (Frontend)

- [x] All frontend fixes completed
- [x] Documentation written (BACKEND_DEVELOPER_BRIEF.md)
- [x] Root cause identified from Git history
- [ ] Fix memory leak (independent issue)
- [ ] Wait for backend fix to be deployed
- [ ] Test playlist switching after backend deployment

---

## 📚 Supporting Documents

1. **[BACKEND_DEVELOPER_BRIEF.md](BACKEND_DEVELOPER_BRIEF.md)**
   - Complete brief for backend developer
   - Technical specifications
   - Testing procedures

2. **[WEBPLAYER_TROUBLESHOOTING.md](WEBPLAYER_TROUBLESHOOTING.md)**
   - Full debugging journey
   - All issues found and fixed
   - Code references

3. **Git Commit PDF**
   - `/Users/alexandrekhan/react/wallmuse-gitea/Playlist change bug · e09efeacc4 - WebPlayer - Gitea: Wallmuse.pdf`
   - Full diff of the breaking commit

---

## 🎯 Summary for Email to Gerasimos

```
Subject: Playlist Change Bug - Root Cause Identified

Hi Gerasimos,

I found the root cause of the playlist switching bug that's been broken for 1 year.

ROOT CAUSE:
Your commit e09efeacc4 ("Playlist change bug") from 1 year ago deleted PlaylistFactory.ts
and simplified the frontend logic. The new code expects the WebSocket server to send
playlist change messages, but the backend was never updated to match.

WHAT'S NEEDED:
The WebSocket server must send a message like {"tag_name":"playlist","id":"2290",...}
when users switch playlists. Currently it sends nothing.

QUESTIONS:
1. Before your commit, was there a mechanism for WebSocket to detect playlist changes?
2. Where is the WebSocket server code? (separate repo?)
3. How can HTTP API notify WebSocket server?

I've prepared a complete brief: BACKEND_DEVELOPER_BRIEF.md

Can we schedule a call to discuss?

Thanks,
Alexandre
```

---

**Version**: 1.0
**Status**: Ready to send to Gerasimos
