# WebSocket vs Parent-Child Communication - Architecture Analysis

**Date**: December 22, 2025

---

## Your Critical Question

> "I have doubts... could you check original webplayer if anything indicates that a websocket is systematically expected to trigger changing playlist? My concern is that what I'm doing is bypassing the websocket altogether... But wallmuse is meant to sync multitrack montage over a cluster of devices... Hence if user changes playlist for one device/environment and screen it should work for others as a cluster called a house."

**Answer**: You are **absolutely correct** to be concerned. The WebSocket IS essential for multi-device synchronization.

---

## What Production Actually Does (Hybrid Approach)

### Production Code Analysis: [webplayer2/src/index.tsx:473-516](../webplayer2/src/index.tsx#L473-L516)

```typescript
// Set a timeout to check if WebSocket playlist command arrives
const webSocketTimeout = 5000; // 5 second timeout

setTimeout(() => {
  // Check if WebSocket successfully updated the playlist
  const currentPlaylistId = Sequencer.getCurrentPlaylist()?.id;

  if (currentPlaylistId !== playlist) {
    // WebSocket didn't update playlist - use parent fallback
    const parentPlaylist = (window.parent as any)?.currentPlaylist;
    if (parentPlaylist && parentPlaylist.id === playlist) {
      console.log('[React] Found target playlist in parent globals, calling setCurrentPlaylist');
      setCurrentPlaylist(parentPlaylist); // ← FALLBACK ONLY
    } else {
      console.log('[React] Could not find playlist data in parent globals');
    }
  } else {
    console.log('[React] ✅ Sequencer correctly updated to playlist:', currentPlaylistId);
  }
}, webSocketTimeout); // Wait 5 seconds for WebSocket
```

**Key Points**:
1. **Primary**: WebSocket should update playlist within 5 seconds
2. **Fallback**: If WebSocket fails, use parent data
3. **Purpose**: Ensure UX doesn't break if WebSocket is slow/down

---

## How Multi-Device Sync Should Work

### Scenario: User Changes Playlist on Web UI

```
USER ACTION: Selects Playlist 2290
       ↓
PARENT WEB UI:
  1. HTTP API: POST /switch_playlist (house_id, screen_id, playlist_id)
       ↓
BACKEND SERVER:
  2. Receives playlist switch request
  3. Updates database: screen_193865.current_playlist = 2290
  4. WebSocket BROADCAST to ALL screens in house:
     - Screen 193865 (PC 1) ← WebSocket message: playlist 2290
     - Screen 193866 (PC 2) ← WebSocket message: playlist 2290
     - Screen 193867 (Server Stream) ← WebSocket message: playlist 2290
       ↓
ALL WEBPLAYERS (Standalone + Web):
  5. Receive WebSocket: {"tag_name":"playlist","id":"2290",...}
  6. CommandsManager.loadPlaylist(playlist)
  7. setCurrentPlaylist(new Playlist(playlist))
  8. Sequencer.assumeNewPlaylist()
  9. ALL SCREENS SWITCH SIMULTANEOUSLY ✅
```

**Critical**: This requires backend to broadcast WebSocket messages to all screens in the house when ANY screen changes playlist.

---

## What webplayer2B Is Currently Doing (WRONG for Multi-Device)

### Current Implementation: [webplayer2B/src/index.tsx:505-508](src/index.tsx#L505-L508)

```typescript
const parentPlaylist = (window.parent as any)?.currentPlaylist;
if (parentPlaylist && parentPlaylist.id === playlist) {
  const playlistInstance = new Playlist(parentPlaylist);
  setCurrentPlaylist(playlistInstance);  // ← IMMEDIATE, NO TIMEOUT
}
```

**Problem**: This bypasses WebSocket entirely and switches immediately using parent data.

**Why This Breaks Multi-Device Sync**:
- **Web UI screen changes** → Uses parent data → Switches immediately ✅
- **Other screens in house** → No WebSocket broadcast → **NEVER RECEIVE UPDATE** ❌
- **Standalone Electron** → No parent window → **CANNOT WORK** ❌

---

## The Correct Architecture (Hybrid with WebSocket Priority)

### What webplayer2B SHOULD Do

```typescript
// When playlist navigation happens
const handlePlaylistChange = (playlist: string, position: any) => {
  console.log('[React] Playlist change requested:', playlist);

  // STEP 1: Immediately notify parent (for web-only single-screen scenarios)
  const parentPlaylist = (window.parent as any)?.currentPlaylist;

  // STEP 2: Wait for WebSocket to broadcast playlist change to ALL screens
  const webSocketTimeout = 5000; // 5 seconds for WebSocket

  setTimeout(() => {
    const currentPlaylistId = Sequencer.getCurrentPlaylist()?.id;

    if (currentPlaylistId !== playlist) {
      // FALLBACK: WebSocket didn't arrive - use parent data if available
      console.log('[React] ⚠️ WebSocket timeout - using parent fallback');

      if (parentPlaylist && parentPlaylist.id === playlist) {
        console.log('[React] Using parent playlist data as fallback');
        const playlistInstance = new Playlist(parentPlaylist);
        setCurrentPlaylist(playlistInstance);
      } else {
        console.warn('[React] ❌ No WebSocket AND no parent data - playlist change failed');
      }
    } else {
      console.log('[React] ✅ WebSocket successfully updated playlist');
    }
  }, webSocketTimeout);
};
```

**Why This Works**:
1. **WebSocket Primary**: All screens (web + standalone) receive broadcast
2. **Parent Fallback**: If WebSocket is slow/broken, web UI doesn't hang
3. **Multi-Device**: All screens in house sync via WebSocket broadcast
4. **Standalone Compatible**: Electron apps only rely on WebSocket (no parent)

---

## Track Management & Peer Synchronization **UPDATED: 2025-12-27**

### Track Assignments vs Navigation

**Navigation (Playlist/Position)**: Stored in server database, broadcast via WebSocket
- Parent prevails for same-browser: immediate navigation
- WebSocket syncs peers: updates other browsers/devices in cluster

**Track Assignments**: Stored in environment configuration, per-montage per-screen
- Stored by **montage ID** (not position) to survive playlist reordering
- Parent sends track mappings immediately, server broadcasts to peers

### Peer Synchronization for Track Changes

**Example**: User on PC1 changes montage 1552 to Track 3

```
PC1 (Same Browser):
  1. Parent sends track mapping: { 1552: '3' }
  2. WebPlayer applies immediately (parent prevails)
  3. Parent POSTs to server: /update_screen_assignment

SERVER:
  4. Updates environment configuration
  5. WebSocket broadcasts to ALL screens:
     montage.screens[193810].seq_refs = [{ id: "3" }]

PC2, PC3, Streaming Server (Peer Screens):
  6. WebSocket receives environment update
  7. Detects track assignment change
  8. Extracts new track from screens array
  9. Updates track override and navigates
  10. ✅ All screens synchronized!
```

### Montage Signature for Reorder Detection

**Signature**: Identifies montage order in playlist
```javascript
signature = "1552-1559-1450";  // Montage IDs in order
```

**Reorder Detection**: When signature changes, reload current position
- Track mappings survive because they use montage ID (not position)
- Navigation reloads to show correct montage at current position

### Complete Track Management Documentation

For comprehensive documentation including data flows, code pointers, and troubleshooting:

**See**: [Track Management Architecture](./TRACK_MANAGEMENT_ARCHITECTURE.md) ✏️ *New 2025-12-27*

---

## Your Architecture Concerns - Addressed

### 1. Web Player (Embedded in Parent UI)
**Use Case**: Single screen viewing on wallmuse.com
- **Primary**: WebSocket (for consistency with multi-device)
- **Fallback**: Parent data (if WebSocket fails)

### 2. Standalone Electron Apps (Future)
**Use Case**: PC installations controlling house environments
- **Only Option**: WebSocket (no parent window exists)
- **Critical**: MUST work for multi-screen synchronization

### 3. Multi-Device Clusters (Houses with Multiple Screens)
**Use Case**: Art gallery with 10 screens across 3 PC + 2 server streams
- **Only Option**: WebSocket broadcast
- **Critical**: All screens must switch simultaneously

---

## Backend Requirements (For Fred)

### What Backend Must Implement

1. **HTTP API Endpoint**: `/switch_playlist`
   ```
   POST /switch_playlist
   {
     "house_id": 123,
     "environment_id": 456,
     "screen_id": 193865,
     "playlist_id": 2290
   }
   ```

2. **WebSocket Broadcast Logic**:
   ```python
   # When playlist switch request received:
   def switch_playlist(house_id, environment_id, screen_id, playlist_id):
       # Update database
       db.update_screen_playlist(screen_id, playlist_id)

       # Get all screens in this house/environment
       screens = db.get_screens_in_environment(house_id, environment_id)

       # Broadcast WebSocket message to ALL screens
       for screen in screens:
           websocket_send(screen.connection_id, {
               "tag_name": "playlist",
               "id": playlist_id,
               # ... full playlist data
           })
   ```

3. **Screen Registration**:
   - Each webplayer (web or standalone) connects to WebSocket
   - Registers with `house_id`, `environment_id`, `screen_id`
   - Backend tracks active connections per screen

---

## Testing Multi-Device Sync (How to Verify)

### Test Setup
1. Open 2 browser tabs with same house/environment but different screen IDs
2. Change playlist on Tab 1
3. Verify Tab 2 receives WebSocket message and switches

### Expected Logs (Tab 1 - Initiator)
```
[React] Playlist change requested: 2290
[WS-TOOLS] WebSocket message received: {"tag_name":"playlist","id":"2290"}
[CommandsManager] Loading playlist: 2290
[Sequencer] Changing to playlist: 2290
```

### Expected Logs (Tab 2 - Listener)
```
[WS-TOOLS] WebSocket message received: {"tag_name":"playlist","id":"2290"}
[CommandsManager] Loading playlist: 2290
[Sequencer] Changing to playlist: 2290
```

**Both tabs should switch simultaneously via WebSocket.**

---

## Recommended Fix for webplayer2B

### Option 1: Restore Production Pattern (Recommended)

Change [src/index.tsx:505-508](src/index.tsx#L505-L508) back to production's hybrid approach:

```typescript
// Wait for WebSocket to send playlist data
const webSocketTimeout = 5000;

setTimeout(() => {
  const currentPlaylistId = Sequencer.getCurrentPlaylist()?.id;

  if (currentPlaylistId !== playlist) {
    // WebSocket didn't update - use parent fallback
    const parentPlaylist = (window.parent as any)?.currentPlaylist;
    if (parentPlaylist && parentPlaylist.id === playlist) {
      console.log('[React] WebSocket timeout - using parent fallback');
      const playlistInstance = new Playlist(parentPlaylist);
      setCurrentPlaylist(playlistInstance);
    }
  }
}, webSocketTimeout);
```

**Why**: Maintains multi-device compatibility while still having fallback.

### Option 2: Reduce Timeout for Better UX

If 5 seconds feels too long for web-only scenarios:

```typescript
// Check if we're in standalone mode (no parent)
const isStandalone = !window.parent || window.parent === window;
const webSocketTimeout = isStandalone ? 10000 : 2000; // Shorter timeout for web UI
```

**Why**: Web UI gets faster fallback, standalone waits longer for WebSocket.

---

## Questions for Fred

1. **Backend Broadcast**: Does the backend currently broadcast WebSocket playlist messages to ALL screens in a house when one screen changes playlist?

2. **Screen Identification**: How does backend identify which WebSocket connections belong to which screens?

3. **Standalone Timeline**: When are Electron apps planned? Do we need to maintain WebSocket compatibility now?

4. **Single vs Multi-Screen**: Are there separate codebases planned for:
   - Web-only (single screen) - Can bypass WebSocket?
   - Multi-device (clusters) - MUST use WebSocket?

5. **Testing Environment**: Can we test multi-device sync on v4b test server with 2+ screen IDs?

---

## Summary

### Current State (webplayer2B)
- ✅ **Fast** - Instant playlist switching via parent data
- ❌ **Single-device only** - Breaks multi-device sync
- ❌ **No standalone support** - Electron apps won't work

### Recommended State (Hybrid)
- ✅ **Multi-device** - WebSocket broadcast syncs all screens
- ✅ **Standalone compatible** - Electron apps use WebSocket
- ✅ **Fallback** - Parent data if WebSocket fails
- ⚠️ **2-5 second delay** - Acceptable for reliability

### The Trade-off
**Speed vs Architecture**: Instant switching (current) vs proper multi-device support (production pattern).

**Recommendation**: **Restore production's hybrid pattern** - the 2-5 second delay is acceptable for a robust, scalable architecture.

---

**Your instinct was correct**: Bypassing WebSocket entirely breaks the core multi-device synchronization architecture.

---

## Known Issues & Fixes Applied (April 2026)

### Fix 1 — Fallback guard: don't crash player when montages not cached

**Problem**: When the child WebPlayer connects on a stale environment (wrong `wm-house` entry), the server sends content for the wrong screen. The 5-second fallback in `index.tsx` then tries to force-load the intended playlist from `window.parent.currentPlaylist`, but that playlist's montages were never pushed over WebSocket (wrong env) so the global cache doesn't have them. `Playlist.getMontage()` throws a loading error and the player stops.

**Fix** (`src/index.tsx`, inside the 5-second timeout fallback):
Before calling `setCurrentPlaylist()` with the parent's playlist data, verify that every montage referenced by that playlist is already in the global cache. If any are missing, log a warning and keep the current playback rather than crashing.

```
[React] ⚠️ Fallback blocked: target playlist montages not in cache — likely wrong environment (stale wm-house).
```

**Impact**: The player continues playing whatever content the server sent (even if it's the wrong playlist) rather than stopping entirely. The environment issue (Fix 2) is the root cause.

---

### Fix 2 — Skip stale environment restore when `environ=0`

**Problem**: The parent container (`WebPlayer.js`) builds the child URL before the EnvironmentsContext finishes loading, so it passes `environ=0&screen=0`. `checkHouse()` in `ws-tools.ts` then reads from `wm-house` localStorage and restores a stale environment from a previous session. The child registers on that stale env, the server sends its assigned content, and ws-tools creates a Default Playlist that overrides the navigation-commanded playlist.

**Fix** (`src/ws/ws-tools.ts`, `checkHouse()`):
When `environ=0` is present in the URL, skip both localStorage restore paths (fingerprint-specific and generic `wm-house`). A fresh environment is created via WebSocket instead. The new environment is saved to localStorage, so subsequent loads (where the parent can read the correct env) work normally.

**Important**: localStorage is NOT cleared — only skipped. This avoids accidentally wiping a valid env if `environ=0` is ever passed in error. The fresh env created will overwrite localStorage on save.

**Log to look for**:
```
[WS-TOOLS] environ=0 in URL — skipping localStorage restore, will create fresh environment
```

**Long-term fix needed**: The parent container should wait for EnvironmentsContext before building the child URL, or communicate the correct environ/screen to the child after they are ready (e.g. via a post-load navigation event). This would eliminate the `environ=0` race entirely.

---

### Fix 3 — WS debounce blocking montage reorder (signature change)

**Date**: 2026-06-03

**Problem**: `handlePlaylistMessage` in `ws-tools.ts` debounced messages based on playlist ID + timing only. A montage reorder message (same playlist ID, new montage order) arriving within 750ms of the previous message was silently dropped. The player continued at the old order and never detected the change.

**Fix** (`src/ws/ws-tools.ts`): Added `_lastPlaylistMsgSig` tracking alongside `_lastPlaylistMsgId`/`_lastPlaylistMsgAt`. Before dropping a message as duplicate, the debounce now checks `montageOrderSignature`. If the signature changed, the message is allowed through regardless of timing.

**Log to look for**:
```
[WS-TOOLS] Signature changed within debounce window, allowing through: X -> Y
```

---

### Fix 4 — B&W spinner invisible behind GPU-composited video

**Date**: 2026-06-03

**Problem**: During track changes, `loading: true` was correctly set in `App.tsx` state (confirmed in logs — ~7 seconds for CDN buffer). The `.placeholder` spinner had `z-index: 9999` but Chrome's hardware-accelerated `<video>` elements get their own compositor layer and render above CSS stacking context regardless of z-index.

**Fix** (`src/App.css`): Added `transform: translateZ(0)` (merged into existing `transform: translate(-50%, -50%)`) and `will-change: transform` on `.placeholder`. This forces the spinner into its own GPU compositing layer, guaranteeing it renders above the video elements.

```css
#root-wm-player .placeholder {
  transform: translate(-50%, -50%) translateZ(0);
  will-change: transform;
}
```

---

### Fix 5 — Container `WebPlayer.js` merge conflicts + regressions

**Date**: 2026-06-03

**Problem**: `WebPlayer.js` had 31 unresolved `<<<<<<< Updated upstream` / `>>>>>>> Stashed changes` conflict blocks. The "upstream" side had three regressions vs the stashed version: `getScreenId()` always returned `null`, no `getEnvKey()` function, `key: null` hardcoded in player params, and wrong player URL (`wm-player` instead of `wm-playerB`).

**Fix**: Resolved all 31 conflicts taking the stashed side throughout. Additional fixes applied:
- Removed duplicate `if (!containerRef.current) return;` guard (merge artifact)
- Fixed signature-change false positive: `prevSignatureRef` now skips the initial mount (first time `montageOrderSignature` becomes truthy) so it only fires on genuine reorders

**Net result**: Player URL now correctly uses `wm-playerB`, passes real `screenId`/`key` from `wm-house` localStorage, and the `wmScreenReady` handler calls `refreshScreenState()` without remounting the player.

---

### Fix 6 — Duplicate API call from container

**Date**: 2026-06-04

**Problem**: Container was making two API calls when switching playlists — two independent code paths each triggered a fetch for the same playlist data.

**Fix**: Identified and consolidated duplicate call in container code. Single authoritative fetch path retained.

---

### Observation — NavigationManager command appears as same-playlist move

**Date**: 2026-06-04

**Context**: During `goMontage` to a different playlist, logs showed WebPlayer logging "Montage navigation within same playlist" even though the event was triggered by a playlist switch.

**Explanation**: This is correct behaviour, not a bug. The WS broadcast delivers the playlist data first (WebPlayer switches to playlist 264 at log line 90). By the time NavigationManager fires the `webplayer-navigate` event (log line 150), the WebPlayer is already on the new playlist — so from its internal state, it's a position-only move within the current playlist.

**Implication**: WS being authoritative for playlist delivery means the parent's NavigationManager position command is effectively downgraded to an intra-playlist navigation. The two signals complement rather than collide: WS does the structural switch, NavigationManager mops up with the precise montage position. The slightly misleading log wording ("same playlist") is a side-effect of this correct sequencing.

---

## Backend Cluster Coordination Brief (backend)

### Architecture overview

**Hierarchy**: House → Environments → Screens. A "cluster" is any house with multiple active environments/screens. The web player registers via WebSocket immediately on load:

```xml
<registration environ="11020" key="91774c72-aec9-dc79-eb1e-12f50b70761e" version="2"/>
```

The server then pushes the current playlist to that screen (first playlist and first montage shown — full payload can be bulky):

```json
{"tag_name":"playlist","id":"264","name":"Test2","random":"0",
 "montages":[{"tag_name":"montage","id":"1552","tracks":"3",
   "screens":[{"tag_name":"screen","id":"193753","name":"Main",
     "environment_id":"10453","house_id":"269",
     "seq_refs":[{"tag_name":"seq_ref","id":"1"}]}]}]}
```

### Screen liveness

**The WS connection established by `<registration>` IS the liveness indicator** — no separate ping needed. While the connection is open the screen is alive and eligible for broadcast. When it drops the server removes it from the broadcast list.

The `AssociateDisplays` webservice provides the HTTP/persisted view of the same state. WebSocket `activate_screen` / `deactivate_screen` commands provide real-time overrides on top.

**Implication for cluster broadcast**: the server already has everything it needs — the house ID comes from the environment, and the active recipient list is all screens in that house that currently have an open WS connection (i.e. sent `<registration>` and haven't disconnected). The question for each command type below is simply whether the broadcast logic is wired up to use that list.

---

### Cluster broadcast status (confirmed 2026-06-09)

| # | Question | Status | Backend location |
|---|----------|--------|-----------------|
| 1 | Playlist switch → all screens | ✅ Implemented | `WebServiceCommands.java:395` |
| 2 | `goMontage` → peer screens | ❌ Missing | No endpoint; `send_command + dest=-1` path is the candidate |
| 3 | Play/stop → all screens | ✅ Implemented | `WebServiceCommands.java:191` |
| 4 | Montage reorder (signature) → all screens | ✅ Implemented | `WmmHouseFactory.java:128` |
| 5 | Demo sessions excluded from broadcast | ❌ Missing | `WebServiceGeneric.java:173` — no guard exists |

**Q2 fix** (backend): add `send_command` broadcast for `montage` action with `dest=-1` (all screens in house). No webplayer2 changes needed — `case 'montage'` in `CommandsManager.ts` already handles receiving it.

**Q5 fix** (backend): in `sendCommand` / `sendLoadPlaylist`, check whether the resolved `WmmUserAccount` is a demo account before entering the peer-broadcast path. Add `isDemo` / `isGuest` flag to `WmmUserAccount`, or match against known demo session prefixes. Demo sessions to exclude:
- `wp-freeaccount-1-9360c44751f327c087cf9c030ffa58d1` (wallmuse.com, sharex.wallmuse.com)
- `wp-Demo150610-1-b741bf8297ee3ee82b29aa3af1ff16fb` (ooo2.wallmuse.com)

---

### What the web player already handles (no backend changes needed)

- Receiving `playlist` messages and switching via `CommandsManager.loadPlaylist()`
- Receiving `montage` command and calling `Sequencer.goMontage(index)`
- Detecting montage reorder via signature comparison and reloading position
- Screen activation/deactivation via `activate_screen` / `deactivate_screen` commands
