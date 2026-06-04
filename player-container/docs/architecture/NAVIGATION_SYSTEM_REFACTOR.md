# Navigation System — Architecture Reference

## Overview

Navigation (moving the WebPlayer to a specific playlist + montage position) flows through a
single path. `NavigationManager` is the only component that dispatches `webplayer-navigate`.
Every other component that wants to navigate calls into it explicitly.

---

## Call Chain — Playlist Switch ("Play" button)

```
User clicks Play on a playlist
  → handleDoPlayPlaylist (PlayList.js)
      → doLoadPlaylist (PlayLists.js)          — sends loadPlaylist cluster signal, polls until confirmed
      → handlePlaylistChange (EnvironmentsContext)
            sets window.currentPlaylist        — WebPlayer reads this on event receipt
      → onMontageNavigation(playlistId, 0)
          → handleMontageNavigation (App.js)
              → NavigationManager.addCommand()
                  [both ready] → processCommand() → dispatch webplayer-navigate
                  [not ready]  → queue command, dispatch when ready
```

## Call Chain — goMontage (montage title click)

```
User clicks a montage title in the playlist UI
  → handleTitleClick (PlayListItem.js)
      [same playlist]
        → onMontageNavigation(playlistId, montageIndex, force=true)
            → handleMontageNavigation (App.js)
                → NavigationManager.addCommand()

      [different playlist]
        → doLoadPlaylist (PlayLists.js)        — sends loadPlaylist cluster signal, polls until confirmed
        → handlePlaylistChange (EnvironmentsContext)
              sets window.currentPlaylist
        → onMontageNavigation(playlistId, montageIndex, force=true)
            → handleMontageNavigation (App.js)
                → NavigationManager.addCommand()
```

Default playlist (`id: undefined`) is handled correctly throughout: `loadPlaylist` with no
playlist param switches the backend to default; `getPlaylistById(undefined)` matches via
the `(!id && !playlistId)` guard in api.js.

`handlePlaylistChange` is pure data prep — no dispatch, no cluster signal.
`onMontageNavigation` / NavigationManager is the sole navigation concern.
These two responsibilities are separated: `autoSaveUpdates` calls `handlePlaylistChange`
without ever calling `onMontageNavigation`, because saving should never move the player.

---

## NavigationManager (`src/utils/NavigationManager.js`)

Singleton, exported as default. Also accessible as `window.navigationManager`.

### State

| Field | Type | Purpose |
|---|---|---|
| `isReady` | boolean | Main app ready (set by App.js) |
| `isPlayerReady` | boolean | WebPlayer loaded and ready |
| `commandQueue` | array | Pending commands; replaced (not accumulated) on each new add |
| `lastProcessedCommand` | object | Used for dedup check |
| `processingCommand` | boolean | Prevents concurrent dispatch |

### Key Methods

| Method | Called by | What it does |
|---|---|---|
| `setReady(bool)` | App.js | Toggles main-app ready; triggers queue flush on `true` |
| `setPlayerReady(bool)` | WebPlayer.js | Toggles player ready; triggers queue flush on `true` (100ms delay) |
| `addCommand(command)` | App.js `handleMontageNavigation` | Dedup check, then process or queue |
| `processCommand(command)` | internal | **Only place that dispatches `webplayer-navigate`** |
| `processQueuedCommands()` | internal | Flushes queue when both ready states become true, or when `processingCommand` lock releases |
| `getStatus()` | debug | Returns current state snapshot |
| `reset()` | debug/recovery | Clears stuck `processingCommand` flag and queue |

### Dedup Guard

Commands with the same `playlist-montage-track` signature within **2 seconds** are dropped.
This prevents the track-mapping effect (which fires immediately after App.js renders) from
re-dispatching a command that `handleDoPlayPlaylist` just sent.

### `webplayer-navigate` Event Shape

```javascript
{
  playlist: string,           // playlist ID
  position: { montage, track },
  montage: number,            // position.montage || 0
  track: string | number,     // position.track || 0
  timestamp: number,
  isPlaylistChange: boolean   // true if playlist differs from window.currentPlaylistForNav
}
```

### Queue Behaviour

`commandQueue` holds at most one command at a time — each `addCommand` call replaces the
previous pending command. When both ready states are true, the latest queued command is
processed and the queue is cleared.

---

## Integration Points

### App.js — `handleMontageNavigation`

The only call site for `NavigationManager.addCommand()`. Called by:
- `handleDoPlayPlaylist` (PlayList.js) via the `onMontageNavigation` prop — playlist switch
- `handleTitleClick` (PlayListItem.js) via the `onMontageNavigation` prop — goMontage click
- Track-mapping effect in App.js — sends the current track selection after mounting

App.js also calls `setReady(true)` once `DontStartBefore` has finished loading.

### WebPlayer.js

Calls `setPlayerReady(true)` once the embedded player is ready to receive events.

### EnvironmentsContext.js — `handlePlaylistChange`

No dispatch, no cluster signal. Pure data prep. Responsibilities:
1. Updates `currentPlaylist` state immediately
2. Fetches fresh playlist data and stores it in `window.currentPlaylist`

Must complete before `handleMontageNavigation` is called so `window.currentPlaylist` is
populated with fresh data when the WebPlayer receives the event.

The `loadPlaylist` cluster signal is the **initiating action's exclusive responsibility**
(`doLoadPlaylist` for both the Play button and goMontage flows). Calling it here would
duplicate the broadcast on local-initiated switches and echo it back on WS-triggered paths.

---

## Console Log Keywords

### NavigationManager
- `[NAV-MANAGER] Initializing` — startup
- `[NAV-MANAGER] 🚦 Ready state changed` — main app ready toggle
- `[NAV-MANAGER] 🎮 Player ready state changed` — player ready toggle
- `[NAV-MANAGER] 📝 Adding command` — new command accepted
- `[NAV-MANAGER] 🔄 Skipping duplicate command` — dedup fired
- `[NAV-MANAGER] ✅ Both ready states true - processing immediately` — instant dispatch
- `[NAV-MANAGER] ⏳ Waiting for ...` — queued
- `[NAV-MANAGER] ▶️ Processing command` — about to dispatch
- `[NAV-MANAGER] ✅ Command processed successfully` — dispatch done

### EnvironmentsContext
- `[handlePlaylistChange] New playlist selected` — entry
- `[handlePlaylistChange] Updating currentPlaylist immediately from X to Y` — state update
- `[handlePlaylistChange] Stored full playlist data in window.currentPlaylist` — data ready

### App.js
- `[NAV] handleMontageNavigation` — navigation request received
- `[NAV] Playlist change detected` — switch vs same-playlist navigation

---

## Debug Helpers (browser console)

```javascript
window.navStatus()           // print NavigationManager.getStatus()
window.resetNav()            // clear stuck processingCommand flag and queue
window.testNavigation(playlistId, position)  // inject a command directly
```

---

## Notes

### NavigationManager queue drain on lock release

When `processCommand` runs, it sets `processingCommand = true` for 500 ms to prevent
concurrent dispatch. If `addCommand` is called while the lock is held (e.g. the track-change
effect in App.js fires a position-0 command just before `handleMontageNavigation` fires the
user's actual target position), the second command is queued. The 500 ms timeout resets
`processingCommand = false` **and then calls `processQueuedCommands()`**, so the queued
command is dispatched automatically rather than being silently lost.
