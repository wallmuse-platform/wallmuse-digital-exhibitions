# Multi-Device Sync Implementation Guide

**Status**: Phase 1 (Web-Only) complete ✅
**Next**: Phase 2 (Multi-Device) - when needed ??// ongoing rather?? 
**Timeline**: Phase 3 (Electron) - 6+ months ??//planned July - Dec 2026 with Alexandre and Gerasimos as consultant supervising an engineer (French contrat en alternance)
Please recheck all below//

---

## Current Architecture (Phase 1) ✅

### What Works Now
- ✅ Single-screen web viewing on wallmuse.com
- ✅ Instant playlist switching via parent-child
- ✅ WebSocket connected but not required
- ✅ Professional UX (no delays)

### How It Works
```typescript
// User clicks playlist in web UI
Parent UI:
  1. Fetches playlist data via HTTP API
  2. Sets window.currentPlaylist = {...}
  3. Calls window.webPlayerNavigate(playlistId, position)

Child WebPlayer:
  1. Reads window.currentPlaylist
  2. Creates Playlist instance: new Playlist(parentPlaylist)
  3. Calls setCurrentPlaylist() → INSTANT SWITCH ✅

WebSocket (optional):
  - May send playlist message 5-10 seconds later
  - setCurrentPlaylist() checks: p.id !== ThePlaylist.id
  - If same playlist, ignores (no duplicate update)
```

---

## Phase 2: Multi-Device Sync (When Needed)

### Trigger Events
Implement Phase 2 when you need:
1. **Art gallery installation** - Multiple screens must sync
2. **Remote control** - Admin panel controls all screens
3. **Server streams** - Multiple environments in one house
4. **Testing multi-device** - Quality assurance for cluster setups

### Backend Requirements (Ask Backend Team)

#### 1. Screen Registration
Each webplayer must register with house/environment/screen IDs:

```python
# Backend: Track active WebSocket connections
class WebSocketManager:
    connections = {}  # {connection_id: {house_id, environment_id, screen_id}}

    def register_screen(self, connection_id, house_id, environment_id, screen_id):
        self.connections[connection_id] = {
            'house_id': house_id,
            'environment_id': environment_id,
            'screen_id': screen_id,
            'connected_at': datetime.now()
        }
```

**Frontend already sends this** via [src/ws/ws-tools.ts](src/ws/ws-tools.ts):
```typescript
// WsTools.register() sends house/environment/screen info
// No changes needed!
```

#### 2. Broadcast Playlist Changes
When ANY screen changes playlist, broadcast to ALL screens in that house:

```python
# Backend: Add this to playlist switch endpoint
def switch_playlist(house_id, environment_id, screen_id, playlist_id):
    # Update database
    db.update_screen_playlist(screen_id, playlist_id)

    # Get full playlist data
    playlist_data = db.get_playlist(playlist_id)

    # Get all screens in this house/environment
    screens = db.get_screens_in_environment(house_id, environment_id)

    # Broadcast to ALL screens (including the one that initiated)
    for screen in screens:
        connection = websocket_manager.get_connection(screen.id)
        if connection and connection.is_connected:
            websocket_send(connection, {
                "tag_name": "playlist",
                "id": playlist_data.id,
                "name": playlist_data.name,
                # ... full playlist object
                "montages": [...],  # All montage data
            })
```

**Critical**: Send to ALL screens, not just others. This ensures consistency even if parent-child fails.

#### 3. HTTP API Endpoint
```python
# Backend: POST /api/switch_playlist
@app.route('/api/switch_playlist', methods=['POST'])
def api_switch_playlist():
    data = request.json
    house_id = data['house_id']
    environment_id = data['environment_id']
    screen_id = data['screen_id']
    playlist_id = data['playlist_id']

    # Trigger broadcast
    switch_playlist(house_id, environment_id, screen_id, playlist_id)

    return {'status': 'ok', 'playlist_id': playlist_id}
```

### Frontend (Already Ready!) ✅

**No changes needed!** The frontend already handles WebSocket playlist messages:

```typescript
// src/manager/CommandsManager.ts:41-44
private loadPlaylist(p: Playlist) {
  LogHelper.log('CommandsManager.loadPlaylist', 'Loading playlist:', p.id || p.name);
  setCurrentPlaylist(p);  // Already implemented!
}
```

```typescript
// src/manager/Globals.ts (webplayer2B version)
export const setCurrentPlaylist = (p: Playlist | undefined) => {
  // ... validation ...

  if (p.id !== ThePlaylist?.id) {
    LogHelper.log('setCurrentPlaylist', `Changing playlist from ${ThePlaylist?.id} to ${p.id}`);
    ThePlaylist = p;
    Sequencer.assumeNewPlaylist(p);  // Switches playlist
  } else {
    LogHelper.log('setCurrentPlaylist', `Playlist ${p.id} already set, ignoring duplicate call`);
  }
};
```

**This already prevents duplicate updates!**

---

## Testing Multi-Device Sync

### Test Setup
1. Open **2 browser tabs** in different windows
2. Use **same house/environment** but **different screen IDs**
3. URL format:
   ```
   Tab 1: https://ooo2.wallmuse.com/v4b/?house=123&environ=456&screen=1&session=xxx
   Tab 2: https://ooo2.wallmuse.com/v4b/?house=123&environ=456&screen=2&session=xxx
   ```

### Test Procedure

#### Test 1: Parent-Child (Current)
**Action**: Change playlist in Tab 1 via UI

**Expected**:
- ✅ Tab 1: Instant switch (parent-child)
- ❌ Tab 2: No change (no WebSocket broadcast yet)

**Logs (Tab 1)**:
```
[React] Playlist change requested: 2290
[React] Found playlist in parent, calling setCurrentPlaylist
[Globals] Changing playlist from 2042 to 2290
[Sequencer] Changing to playlist: 2290
```

**Logs (Tab 2)**:
```
(No logs - doesn't receive update)
```

**Status**: ✅ Expected behavior (Phase 1)

---

#### Test 2: WebSocket Broadcast (After Backend Implementation)
**Action**: Change playlist in Tab 1 via UI

**Expected**:
- ✅ Tab 1: Instant switch (parent-child)
- ✅ Tab 2: Delayed switch (WebSocket ~5-10 seconds)

**Logs (Tab 1)**:
```
[React] Playlist change requested: 2290
[React] Found playlist in parent, calling setCurrentPlaylist
[Globals] Changing playlist from 2042 to 2290
[Sequencer] Changing to playlist: 2290

[5 seconds later...]
[WS-TOOLS] WebSocket message: {"tag_name":"playlist","id":"2290"}
[CommandsManager] Loading playlist: 2290
[Globals] Playlist 2290 already set, ignoring duplicate call  ← No restart!
```

**Logs (Tab 2)**:
```
[WS-TOOLS] WebSocket message: {"tag_name":"playlist","id":"2290"}
[CommandsManager] Loading playlist: 2290
[Globals] Changing playlist from 2042 to 2290
[Sequencer] Changing to playlist: 2290  ← Syncs from WebSocket!
```

**Status**: ✅ Multi-device sync working!

---

#### Test 3: Remote Control (Admin Panel)
**Action**: Admin panel sends WebSocket command to change playlist

**Expected**:
- ✅ Tab 1: Changes via WebSocket
- ✅ Tab 2: Changes via WebSocket

**Both tabs switch simultaneously** (no parent-child involved)

---

## Backend Questions to Ask

### Question 1: WebSocket Broadcasting
**Q**: Does the backend currently broadcast WebSocket playlist messages to ALL screens in a house when one screen changes playlist?

**Check**: Look for code like:
```python
for screen in screens:
    websocket_send(screen.connection, playlist_data)
```

**Expected**: Probably NO (not implemented yet)

---

### Question 2: Screen Identification
**Q**: How does backend identify which WebSocket connection belongs to which screen?

**Check**: Does backend track `{connection_id: screen_id}` mapping?

**Expected**: Should exist (webplayer registers with house/environ/screen)

---

### Question 3: HTTP API for Playlist Switch
**Q**: Is there an HTTP endpoint that triggers WebSocket broadcast?

**Check**: Look for `/api/switch_playlist` or similar

**Expected**: Probably NO (parent UI calls old HTTP API without broadcast)

---

## Implementation Timeline

### Now (Phase 1) ✅
- ✅ Web-only single-screen deployment
- ✅ Instant playlist switching
- ✅ Production-ready UX

### When Multi-Device Needed (Phase 2)
**Timeline**: When first gallery installation or multi-device testing required

**Backend work** (estimate: 1-2 days):
1. Add WebSocket broadcast logic to playlist switch endpoint
2. Test with 2+ screens
3. Verify all screens sync

**Frontend work**: ✅ ZERO - Already implemented!

### Electron Standalone (Phase 3)
**Timeline**: 6+ months (when proper team available)

**Work required**:
1. Electron packaging
2. Remove parent-child dependency (use WebSocket-only)
3. Multi-device cluster testing
4. Deployment infrastructure

---

## Verification Checklist

### Phase 1 (Current) ✅
- [x] Single screen web viewing works
- [x] Playlist switching is instant
- [x] No black screens on navigation
- [x] WebSocket connected (but not required)
- [x] Parent-child communication functional

### Phase 2 (Multi-Device)
- [ ] Backend broadcasts WebSocket to all screens
- [ ] 2+ browser tabs sync when one changes playlist
- [ ] Remote control via admin panel works
- [ ] Parent-child + WebSocket coexist without conflicts
- [ ] Logs show "already set, ignoring duplicate" when both trigger

### Phase 3 (Electron)
- [ ] Electron app packages successfully
- [ ] No parent window dependency
- [ ] Pure WebSocket mode works
- [ ] Multi-device cluster synchronization verified
- [ ] Deployment to PC installations

---

## Summary

### Current State (Phase 1)
Your implementation is **correct for current needs**:
- ✅ Fast, professional UX
- ✅ WebSocket infrastructure ready
- ✅ Future-proof architecture
- ✅ No unnecessary delays

### When You Need Multi-Device (Phase 2)
**Backend must add**: WebSocket broadcasting to all screens in house
**Frontend needs**: ✅ NOTHING - Already implemented!

### Strategic Decision
**Delay Electron until proper team** (6+ months)
**Focus on web deployment now** (working perfectly)
**Add multi-device when needed** (backend work only)

---

**Your instinct was correct**: Keep the fast web UX now, add multi-device sync when actually needed, delay Electron until you have resources.
