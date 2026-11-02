# Volume & Mute State Management

## Overview

Volume and mute state are intentionally **not persisted across page loads**. Every browser session starts muted with no volume set. This is by design — it avoids stale state bugs and gives users a predictable, consistent experience on each visit.

---

## Architecture

### Single Source of Truth: `volumeRef` in `App()`

```
App()
  └── volumeRef = useRef(null)      ← lives here, survives any child remount
  └── playModeRef = useRef(false)
       └── DontStartBefore({ volumeRef, playModeRef })
            └── PlayerCommands({ volumeRef, ... })
```

`volumeRef` is initialized in `App()` — the outermost component that never remounts during a page session. It is passed down as a prop.

**Why not inside `DontStartBefore`?** Environment suppression (and similar state changes) can cause `DontStartBefore` to remount, which would reset a ref initialized there to `null` mid-session, losing the user's current volume level.

---

## State Breakdown

| State | Location | Type | Initial Value | Purpose |
|---|---|---|---|---|
| `volumeRef` | `App()` | `useRef(null)` | `null` | Durable volume value, survives remounts |
| `muted` / `mutedRef` | `PlayerCommands` | `useState(true)` / `useRef(true)` | `true` | Controls mute button UI |
| `displayVolume` | `PlayerCommands` | `useState(null)` | `null` | Drives the MUI Slider — `null` = slider at 0, visually indicating "not set" |

---

## On Page Load

- `volumeRef.current` = `null`
- `muted` = `true`
- `displayVolume` = `null` → VolumeSlider renders at 0

**No localStorage is read for volume or mute on init.** The slider at 0 tells the user they need to set the volume.

---

## User Interaction Flow

### Dragging the volume slider

1. `VolumeSlider.onChangeCommitted` fires with the new value
2. `handleVolumeChange(newVolume)` in `PlayerCommands`:
   - Sets `volumeRef.current = newVolume`
   - Calls `setDisplayVolume(newVolume)` — slider reflects the chosen value
   - Writes `wallmuse-volume` to localStorage (for any secondary reads, not for init)
   - If currently muted: auto-unmutes, calls `onVolumeChange(newVolume)` to send to player

### Unmuting (mute button)

```
mutedRef.current = false → setMuted(false)

if (!volumeRef.current):          // null or 0 — no volume ever set
  volumeRef.current = 50
  setDisplayVolume(50)
  onVolumeChange(50)              // send 50 to player
else:
  setDisplayVolume(volumeRef.current)
  onVolumeChange(volumeRef.current)  // send existing volume to player
```

### iOS auto-unmute (via `IOSAudioAndroidVideoHandler`)

When the user taps "Enable" on the iOS audio prompt, a `wallmuse-unmute` custom event is dispatched. `PlayerCommands` listens for this event and runs the same unmute logic, calling `setDisplayVolume` so the slider updates.

---

## Controlled Slider

`VolumeSlider` uses MUI Slider's **controlled** mode (`value` prop, not `defaultValue`). This is required so the slider position updates when state changes programmatically (e.g., auto-unmute sets volume to 50).

```jsx
<Slider value={value ?? 0} onChange={handleChange} onChangeCommitted={handleChangeCommitted} />
```

`value ?? 0` means: if `displayVolume` is `null`, render at 0. The slider does not "snap" to the user's last session value on load.

---

## Mobile Resize Reset

When `isMobile` changes (viewport crosses the mobile breakpoint), mute and volume display state reset:

```js
useEffect(() => {
  mutedRef.current = true;
  setMuted(true);
  setDisplayVolume(null);
}, [isMobile]);
```

This prevents stale state if the user rotates their device or resizes the browser window across the mobile breakpoint.

---

## localStorage Usage

Volume is **written** to localStorage (`wallmuse-volume`) after each user interaction, but **never read** at init. Any `volume-wallmuse` key in localStorage is an orphaned legacy key and can be safely ignored or cleared.

| Key | Written by | Read at init? |
|---|---|---|
| `wallmuse-volume` | `PlayerCommands.handleVolumeChange`, `toggleMute` | No |
| `wallmuse-muted` | `PlayerCommands.toggleMute`, `IOSAudioAndroidVideoHandler` | No |
| `volume-wallmuse` | Legacy (removed) | No |

---

## Data Flow: Volume to Player

```
User drags slider
  → PlayerCommands.handleVolumeChange(newVolume)
    → App.onVolumeChange(newVolume)
      → wsTools (WebSocket command)
        → WebPlayer receives volume
          → video.volume = newVolume / 100
```
