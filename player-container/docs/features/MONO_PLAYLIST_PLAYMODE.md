# Mono-Playlist PlayMode - Single Montage Playback

## Overview

WallMuse is designed to play **playlists**, not individual montages. To play a single montage, the system uses **mono-playlists** - persistent, single-montage playlists created on-demand. This document describes the mono-playlist architecture and PlayMode lifecycle.

---

## Core Concept

```
User clicks "Play" on montage
    ↓
System gets or creates mono-playlist (mono-{montageId})
    ↓
System saves current playlist for restoration
    ↓
System enters PlayMode and loads mono-playlist
    ↓
Montage plays and loops indefinitely
    ↓
User presses Stop (or plays another montage/playlist)
    ↓
System exits PlayMode and restores previous playlist
```

**Key Principle**: Mono-playlists are **persistent** - they remain in the database and are reused when the same montage is played again. They are hidden from the UI (not shown in playlist list).

---

## Architecture Overview

### Components Involved

1. **MontageSelection.js** - Creates/retrieves mono-playlist and initiates PlayMode
2. **PlayerCommands.js** - Provides Stop button and PlayMode UI indicators
3. **playModeUtils.js** - Handles PlayMode termination and restoration logic
4. **App.js** - Manages PlayMode state via `playModeRef`
5. **WebPlayer (Child App)** - Handles actual playback via WebSocket

### State Management

- **playModeRef.current** - Boolean flag indicating PlayMode is active
- **isPlayMode** (PlayerCommands) - State synced with playModeRef for UI updates
- **localStorage.previousPlaylistId** - Stores playlist to restore after Stop
- **creatingMonoMid** (MontageSelection) - Prevents duplicate creation on rapid clicks

---

## Phase 1: Mono-Playlist Creation/Retrieval

### Location

[MontageSelection.js:291-384](../src/SelectMontages/MontageSelection.js#L291-L384)

### Process

1. **Duplicate Prevention**
   - Check if `creatingMonoMid === montageId`
   - If true, ignore click (prevents race conditions)

2. **Get or Create Mono-Playlist**

   ```javascript
   const response = await getOrCreateMonoPlaylist(
     montageId,
     montage,
     playlists,
     setPlaylists,
   );
   ```

   - Checks if `mono-{montageId}` playlist already exists
   - If exists: Returns existing playlist ID
   - If not: Creates new playlist and adds montage

3. **Save Current Context**

   ```javascript
   // Only save if not already on a mono-playlist
   const isCurrentMono = currentPlaylistObj?.name?.startsWith("mono-");
   if (!isCurrentMono) {
     savePreviousPlaylistId(currentPlaylist);
   }
   ```

4. **Enter PlayMode**
   - Load mono-playlist via `loadPlaylist(house, monoPlaylistId)`
   - Wait for backend sync via `handlePlaylistChange(monoPlaylistId)`
   - Call `onPlayStart()` to set `playModeRef.current = true`

### Key Features

- **On-Demand Creation**: No pre-creation needed, handles all montages
- **Reuse**: Same mono-playlist used for subsequent plays of same montage
- **No Timer**: Montage loops indefinitely until user action
- **Atomic Flag**: `creatingMonoMid` prevents duplicate creation

---

## Phase 2: PlayMode Active State

### UI Changes (PlayerCommands.js)

When `playModeRef.current === true`:

1. **Primary Color Indicators**
   - Stop, Play, Pause icons show in primary color (blue)
   - Visual feedback that PlayMode is active

2. **Disabled Controls**
   - Forward/Backward buttons disabled
   - Tooltip shows "disabled_in_play_mode"

3. **State Synchronization**

   ```javascript
   const [isPlayMode, setIsPlayMode] = useState(playModeRef.current);

   useEffect(() => {
     const checkPlayMode = () => {
       if (playModeRef.current !== isPlayMode) {
         setIsPlayMode(playModeRef.current);
       }
     };
     const interval = setInterval(checkPlayMode, 100);
     return () => clearInterval(interval);
   }, [playModeRef, isPlayMode]);
   ```

   - Polls `playModeRef` every 100ms
   - Updates UI state when PlayMode changes
   - Required because refs don't trigger re-renders

### Playback Behavior

- **Looping**: Montage loops continuously (no auto-stop timer)
- **User Actions**:
  1. Press Stop → Exit PlayMode, restore previous playlist
  2. Play another montage → Switch to different mono-playlist
  3. Play a playlist → Exit PlayMode, load selected playlist
  4. Page reload → Continues playing (persistence)

---

## Phase 3: PlayMode Termination

### Location

[playModeUtils.js:46-135](../src/Play/playModeUtils.js#L46-L135)

### Trigger Points

1. **Stop Button** - User presses Stop in PlayerCommands
2. **Playlist Change** - User selects a different playlist
3. **Montage Change** - User plays a different montage

### Process (handlePlayMontageEnd)

```javascript
await handlePlayMontageEnd(currentPlaylist, {
  house,
  handlePlaylistChange,
  currentPlaylist,
  setPlaylists,
  playModeRef,
  onPlayEnd,
  playlists,
});
```

**Steps:**

1. **Stop Playback**

   ```javascript
   await terminatePlayMode({ house, playModeRef, onPlayEnd });
   ```

   - Sends stop command to player
   - Sets `playModeRef.current = false`
   - Calls `onPlayEnd()` callback

2. **Restore Previous Playlist**

   ```javascript
   const previousPlaylistId = getPreviousPlaylistId();
   const playlistToLoad = previousPlaylistId || undefined; // undefined = default
   await loadPlaylist(house, playlistToLoad);
   await handlePlaylistChange(playlistToLoad);
   ```

3. **Clear Saved State**
   ```javascript
   clearPreviousPlaylistId(); // Remove from localStorage
   ```

### Important Notes

- **Mono-playlists are NOT deleted** - They remain persistent for reuse
- **No cleanup needed** - Simpler than temporary playlist approach
- **Synchronous execution** - Ensures clean state transitions

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    User Action: Play Montage                 │
└─────────────────────┬───────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│  MontageSelection.handlePlayMontage()                        │
│  • Check creatingMonoMid flag                                │
│  • Get/create mono-playlist (mono-{montageId})               │
│  • Save previousPlaylistId (if not on mono-playlist)         │
│  • Load mono-playlist                                        │
│  • Enter PlayMode (playModeRef.current = true)               │
└─────────────────────┬───────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│  WebPlayer Playback                                          │
│  • Montage loops indefinitely                                │
│  • UI shows PlayMode indicators (primary colors)             │
│  • Forward/Backward disabled                                 │
└─────────────────────┬───────────────────────────────────────┘
                      ↓
            User presses Stop
                      ↓
┌─────────────────────────────────────────────────────────────┐
│  PlayerCommands.handleStopClick()                            │
│  • Stop playback                                             │
│  • Call handlePlayMontageEnd(currentPlaylist)                │
└─────────────────────┬───────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│  playModeUtils.handlePlayMontageEnd()                        │
│  • terminatePlayMode() - stop and reset flag                 │
│  • Get previousPlaylistId from localStorage                  │
│  • Load previous playlist (or default if undefined)          │
│  • Sync with backend                                         │
│  • Clear previousPlaylistId from localStorage                │
└─────────────────────┬───────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│                  PlayMode Exited - Normal State              │
└─────────────────────────────────────────────────────────────┘
```

---

## API Functions

### getOrCreateMonoPlaylist(montageId, montage, playlists, setPlaylists)

**Location**: [api.js](../src/utils/api.js)

**Purpose**: Get existing mono-playlist or create new one

**Logic**:

```javascript
const playlistName = `mono-${montageId}`;

// Check if exists
let existingPlaylist = playlists.find((p) => p.name === playlistName);
if (existingPlaylist) {
  return { data: { playlist_id: existingPlaylist.id }, status: 200 };
}

// Create new
const response = await addPlaylist(playlistName);
const newPlaylist = response.data;
const updatedPlaylists = [newPlaylist, ...playlists];
await addMontageToPlaylist(
  montage,
  newPlaylist.id,
  updatedPlaylists,
  setPlaylists,
);

return { data: { playlist_id: newPlaylist.id }, status: 200 };
```

**Returns**: `{ data: { playlist_id }, status }`

---

## Playlist Filtering

### UI Filtering (PlayLists.js)

Mono-playlists are **hidden from the playlist UI**:

```javascript
const filteredPlaylists = playlists.filter((playlist) => {
  // Hide mono-playlists (internal use only)
  if (playlist.name?.startsWith("mono-")) {
    return false;
  }
  return true;
});
```

### Display Association Filtering (AssociateDisplays.js)

Mono-playlists are **excluded from display assignments**:

```javascript
const filteredPlaylists = (Array.isArray(playlists) ? playlists : []).filter(
  (p) => !p?.name || !p.name.startsWith("mono-"),
);
```

---

## Benefits Over Temporary Playlists

### Simplicity

- ✅ No cleanup logic needed
- ✅ No DontStartBefore re-render issues
- ✅ No timer complexity
- ✅ ~300 lines of code removed

### Reliability

- ✅ No race conditions on cleanup
- ✅ No "black screen" issues from premature deletion
- ✅ Survives page reloads (persistence is a feature)
- ✅ Self-healing (recreated if deleted)

### Performance

- ✅ Faster subsequent plays (reuses existing playlist)
- ✅ No repeated create/delete cycles
- ✅ Reduced API calls

### User Experience

- ✅ Seamless looping without interruption
- ✅ Clear visual feedback (primary colors in PlayMode)
- ✅ Intuitive Stop behavior
- ✅ Works across page refreshes

---

## Edge Cases & Handling

### 1. Rapid Double-Click on Play Button

**Solution**: `creatingMonoMid` flag prevents duplicate creation

```javascript
if (creatingMonoMid === montageId) {
  console.warn("Blocked duplicate click");
  return;
}
```

### 2. Switching Between Montages

**Behavior**: Each montage has its own mono-playlist

- Playing montage A → loads `mono-A`
- Playing montage B → loads `mono-B` (saves `mono-A` as previous)
- Press Stop → returns to `mono-A`

### 3. Page Reload During PlayMode

**Behavior**: Continues playing mono-playlist

- User presses Stop → returns to previous playlist (from localStorage)

### 4. Playing Playlist While in PlayMode

**Behavior**: Exits PlayMode, loads selected playlist

- Previous playlist context preserved in localStorage

### 5. Orphaned Mono-Playlists

**Status**: Harmless

- Not shown in UI
- Automatically reused when montage played again
- Future: Optional batch cleanup job (low priority)

---

## Troubleshooting

### PlayMode UI Not Updating

**Symptom**: Stop/Play/Pause icons not showing primary color

**Cause**: `playModeRef` is a ref, doesn't trigger re-renders

**Solution**: State synchronization in PlayerCommands

```javascript
const [isPlayMode, setIsPlayMode] = useState(playModeRef.current);
useEffect(() => {
  const checkPlayMode = () => {
    if (playModeRef.current !== isPlayMode) {
      setIsPlayMode(playModeRef.current);
    }
  };
  const interval = setInterval(checkPlayMode, 100);
  return () => clearInterval(interval);
}, [playModeRef, isPlayMode]);
```

### Previous Playlist Not Restoring

**Check**:

1. Is `previousPlaylistId` saved in localStorage?
2. Does the playlist still exist in the database?
3. Check console logs for sync failures

**Debug**:

```javascript
console.log("[Debug] Previous playlist:", getPreviousPlaylistId());
console.log("[Debug] Current playlist:", currentPlaylist);
```

### Montage Not Looping

**Check**:

1. Is PlayMode active? (`playModeRef.current === true`)
2. Check WebPlayer logs for playback status
3. Verify mono-playlist has correct montage

---

## Migration from Temporary Playlists

**Status**: ✅ **COMPLETED** (December 2025)

### Removed Files

- `src/utils/tempPlaylistsUtils.js`
- `src/Playlists/utils/cleanupTemporaryPlaylists.js`

### Removed Components

- `CleanupTemporaryPlaylists` (from playModeUtils.js)

### Removed Functions

- `cleanupTempPlaylists()` (from useInitialData.js)
- `handleStopPlayMode()` (from PlayerCommands.js)

### Updated Comments

- PlayLists.js header documentation
- PlayList.js header documentation
- PlaybackManager.js variable names

### Bundle Size Impact

- **-1.80 kB** total reduction (gzipped)
- Cleaner codebase with ~300+ lines removed

---

## Future Enhancements

### Optional Cleanup Job

- Backend batch job to delete orphaned mono-playlists
- Low priority - storage overhead is minimal
- Could run weekly/monthly

### Atomic Endpoint

- Create `/get_or_create_mono_playlist` backend endpoint
- Eliminates frontend race condition entirely
- Reduces from 2 API calls to 1

### Playlist Metadata

- Add `is_mono` flag to playlist schema
- More efficient filtering than name prefix matching

---

## Related Documentation

- [PLAY_MONTAGE_FIX_AND_MONO_PLAYLIST_PLAN.md](../troubleshooting/PLAY_MONTAGE_FIX_AND_MONO_PLAYLIST_PLAN.md) - Implementation plan
- [WALLMUSE_FEATURES.md](WALLMUSE_FEATURES.md) - Overall feature documentation
- [Navigation Architecture](../architecture/ENHANCED_NAVIGATION_SOLUTION.md) - Navigation context

---

**Last Updated**: December 2025
**Migration Completed**: December 28, 2025
**Architecture Version**: Mono-Playlist v1.0
