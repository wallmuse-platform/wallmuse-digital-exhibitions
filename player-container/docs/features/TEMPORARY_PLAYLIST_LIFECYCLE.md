# Temporary Playlist Lifecycle - Play Montage Feature

## Overview

WallMuse is designed to play **playlists**, not individual montages. To preview a single montage, the system creates a **temporary playlist** containing only that montage. This document describes the complete lifecycle of temporary playlists from creation to cleanup.

---

## Core Concept

```
User clicks "Play" on montage
    ↓
System creates temporary playlist
    ↓
System saves current playlist for restoration
    ↓
Montage plays in temporary playlist
    ↓
System deletes temporary playlist
    ↓
System restores previous playlist
```

**Key Principle**: Temporary playlists are ephemeral - they exist only for the duration of the montage preview and are always cleaned up.

---

## Architecture Overview

### Components Involved

1. **MontageSelection.js** - Creates temp playlist and initiates playback
2. **PlayerCommands.js** - Provides Stop button for manual termination
3. **playModeUtils.js** - Handles cleanup and restoration logic
4. **App.js** - Provides safety cleanup on refresh/reload
5. **WebPlayer (Child App)** - Handles actual playback via WebSocket

### State Management

- **playModeRef.current** - Boolean flag indicating Play Mode is active
- **currentTempPlaylistId** - Tracks the temporary playlist ID
- **localStorage.previousPlaylistId** - Stores playlist to restore after cleanup

---

## Phase 1: Creation

### Location
[MontageSelection.js:239-283](src/SelectMontages/MontageSelection.js#L239-L283)

### Trigger
User clicks "Play" button on a montage card

### Process

```javascript
handlePlayMontage(montageId) {
  // 1. Create unique temp playlist name with timestamp
  const timestamp = new Date().toISOString().replace(/[-:.]/g, "").slice(0, 15);
  const playlistName = `Temp_Playlist_${timestamp}`;

  // 2. Create playlist via API
  const tempPlaylist = await addPlaylist(playlistName);
  // Example: Temp_Playlist_20251030T102246

  // 3. Notify parent component (App.js) of temp playlist ID
  onTempPlaylistCreated(tempPlaylist.id);

  // 4. Save current playlist for restoration later
  savePreviousPlaylistId(currentPlaylist);

  // 5. Add montage to temp playlist
  await addMontageToPlaylist(montage, tempPlaylist.id);

  // 6. Update playlists state
  setPlaylists([tempPlaylist, ...playlists]);

  // 7. Load and start playback
  await loadPlaylist(house, tempPlaylist.id);
  await handlePlaylistChange(tempPlaylist.id);

  // 8. Force play command
  handleSendCommand('<vlc><cmd action="play"/></vlc>', house);

  // 9. Set Play Mode flag
  onPlayStart(); // Sets playModeRef.current = true
}
```

### Log Signatures

```
[MontageSelection handlePlayMontage] Montage duration: 333.32s
Adding a playlist: Temp_Playlist_20251030T102246
[MontageSelection handlePlayMontage] Temp playlist created: {id: '2270', name: 'Temp_Playlist_20251030T102246'}
[App PlayerIntegration] Setting temp playlist ID: 2270
```

---

## Phase 2: Playback (Play Mode)

### Location
[MontageSelection.js:324-369](src/SelectMontages/MontageSelection.js#L324-L369)

### Play Mode State

When in Play Mode (`playModeRef.current = true`):

- **Play/Pause buttons**: DISABLED & GREYED OUT (opacity 0.3) - prevents user confusion during preview
- **Stop button**: ENABLED & NORMAL OPACITY - allows manual termination
- **Forward/Backward**: DISABLED & GREYED OUT (opacity 0.3) - montage preview is linear
- **Volume/Mute**: ENABLED & NORMAL OPACITY - user can adjust audio
- **Fullscreen**: ENABLED & NORMAL OPACITY - user can enter/exit fullscreen

**Visual Feedback**: Disabled buttons show reduced opacity (30%) and tooltip "Disabled during montage preview" for clarity.

### Automatic Termination Timer

```javascript
// Set timer to fire after montage duration + 1 second buffer
const playbackTimer = setTimeout(async () => {
  // Check if still in Play Mode
  if (!playModeRef.current) {
    console.log("Already out of play mode, cleanup already done");
    return;
  }

  // Stop playback
  await onStop(house);

  // Trigger complete cleanup and restoration
  await handlePlayMontageEnd(tempPlaylistId, {
    house,
    handlePlaylistChange,
    currentPlaylist,
    setPlaylists,
    playModeRef,
    onPlayEnd // Sets playModeRef.current = false
  });

  // Scroll back to montage card
  document.getElementById(`montage-${montageId}`)?.scrollIntoView({
    behavior: 'smooth',
    block: 'center'
  });
}, (montageDuration * 1000) + 1000);
```

### Log Signatures

```
[MontageSelection handlePlayMontage playbackTimer] Timer set to fire after 333.32 seconds + 500ms
[PlayerIntegration] playModeRef {current: true}
[PlayerCommands] Rendering with volumeRef.current, currentPlaylist): 30 2270
```

---

## Phase 3: Termination Triggers

There are **three pathways** for termination, ensuring no orphaned playlists:

| Scenario | Trigger | Handler | Backend Sync |
|----------|---------|---------|--------------|
| **Natural End** | Timer expires | `handlePlayMontageEnd()` | Via `handlePlaylistChange()` |
| **User Stop** | Stop button click | `handleStopPlayMode()` → `handlePlayMontageEnd()` | Via `handlePlaylistChange()` |
| **Browser Refresh** | Page reload | `CleanupTemporaryPlaylists` component | Via `DontStartBefore` sync |

### How Termination Works

All three scenarios follow the same cleanup pattern:

1. **Stop playback** (if playing)
2. **Delete temp playlist** via API
3. **Switch to previous/default playlist**
4. **Sync backend** to ensure WebPlayer loads correct playlist

The key difference is **how backend synchronization happens**:

- **Natural End & Stop**: Use `handlePlaylistChange()` to dispatch WebSocket event → backend updates → WebPlayer reacts
- **Refresh**: Uses `CleanupTemporaryPlaylists` to update React state → `DontStartBefore` detects state change → `usePlaylistSync` hook handles backend alignment

### Why Different Sync Paths?

**During Active Session** (Natural End / Stop):
- React component is mounted and has access to context functions
- `handlePlaylistChange()` is available and triggers immediate WebSocket-based sync
- WebPlayer is already connected and listening for events

**During Page Load** (Refresh):
- React component is mounting, context functions may not be fully initialized
- `CleanupTemporaryPlaylists` updates React state (`setCurrentPlaylist`)
- `DontStartBefore` waits for frontend/backend alignment before rendering PlayerIntegration
- Built-in `usePlaylistSync` hook automatically syncs when it detects state mismatch
- This leverages the existing architecture instead of duplicating sync logic

**Architecture Principle**: Work WITH the existing sync mechanisms, don't fight them.

---

### 3a. Natural End - Timer Completion

**Trigger**: Montage finishes playing, timer fires

**Flow**:
1. Timer reaches montage duration + 1 second
2. Checks `playModeRef.current` is still true
3. Calls `onStop(house)` to stop playback
4. Calls `handlePlayMontageEnd()` for cleanup
5. `handlePlayMontageEnd()` calls `handlePlaylistChange()` for backend sync

**Log Signatures**:
```
[MontageSelection handlePlayMontage playbackTimer] Timer fired after 333.32 seconds
[MontageSelection handlePlayMontage playbackTimer] Calling onStop with house: 281
```

---

### 3b. User Stop - Manual Interruption

**Location**: [PlayerCommands.js:181-202](src/PlayerCommands/PlayerCommands.js#L181-L202)

**Trigger**: User clicks Stop button while in Play Mode

**UI State**:
```javascript
// Stop button detects Play Mode and routes to special handler
<IconButton
  onClick={playModeRef.current ? handleStopPlayMode : handleStopWithIconUpdate}
>
  <StopIcon />
</IconButton>
```

**Flow**:
```javascript
const handleStopPlayMode = async () => {
  console.log("[PlayerCommands handleStopPlayMode] START");

  try {
    // CRITICAL: Stop playback FIRST before cleanup
    console.log("[PlayerCommands handleStopPlayMode] Calling onStop to stop playback");
    onStop(); // Sends stop command to WebSocket → Sequencer stops
    setIsPlaying(false); // Update UI state

    // Then verify we're in Play Mode with a temp playlist
    if (playModeRef.current && currentTempPlaylistId) {
      console.log("[PlayerCommands handleStopPlayMode] Calling handlePlayMontageEnd");

      // Complete cleanup and restoration
      await handlePlayMontageEnd(currentTempPlaylistId, {
        house,
        handlePlaylistChange,
        currentPlaylist,
        setPlaylists,
        playModeRef,
        onPlayEnd
      });

      console.log("[PlayerCommands handleStopPlayMode] handlePlayMontageEnd completed");
    } else {
      console.log("Not in Play Mode or no temp playlist");
      playModeRef.current = false;
    }
  } catch (error) {
    console.error("Error in stop handling:", error);
    playModeRef.current = false;
  }

  console.log("[PlayerCommands handleStopPlayMode] END");
};
```

**Log Signatures**:
```
[PlayerCommands Stop Button] Clicked - playModeRef.current: true
[PlayerCommands Stop Button] Routing to handleStopPlayMode
[PlayerCommands handleStopPlayMode] START - playModeRef.current: true, currentTempPlaylistId: 2270
[PlayerCommands handleStopPlayMode] Calling onStop to stop playback
[HPM:1761819845000] STARTING - TempPlaylistID: 2270, CurrentPlaylist: 2270
```

---

### 3c. Refresh/Reload - Safety Cleanup

**Location**: [App.js:218-228](src/App.js#L218-L228)

**Trigger**: User refreshes browser or navigates away during Play Mode

**Purpose**: Catch orphaned temp playlists from interrupted sessions

**Critical Fix**: Switch away from temp playlist BEFORE deleting to prevent black screen

**Flow**:
```javascript
// App.js DontStartBefore component - runs BEFORE PlayerIntegration renders
if (!cleanupComplete) {
  return (
    <CleanupTemporaryPlaylists
      currentPlaylist={currentPlaylist}
      setCurrentPlaylist={setCurrentPlaylist}
      house={house}
      onCleanupComplete={handleCleanupComplete}
    />
  );
}
```

**Implementation**: [playModeUtils.js:206-286](src/Play/playModeUtils.js#L206-L286)

```javascript
export const CleanupTemporaryPlaylists = ({ currentPlaylist, setCurrentPlaylist, house, onCleanupComplete }) => {
  useEffect(() => {
    const cleanup = async () => {
      // Find all temporary playlists (naming convention: Temp_Playlist_*)
      const tempPlaylists = playlists.filter(p => p?.name?.startsWith('Temp_Playlist_'));

      if (tempPlaylists.length === 0) {
        onCleanupComplete();
        return;
      }

      const currentPlaylistObj = playlists.find(p => p.id === currentPlaylist);
      const isTemporary = currentPlaylistObj?.name?.startsWith('Temp_Playlist_');

      // CRITICAL: If current playlist IS a temp playlist, switch away FIRST
      if (isTemporary && house) {
        console.log('[PlaylistCleanup] CRITICAL: Current playlist is temporary!');
        console.log('[PlaylistCleanup] Must switch away BEFORE deleting to prevent black screen');

        const previousPlaylistId = getPreviousPlaylistId();
        const playlistToLoad = previousPlaylistId || undefined; // undefined = default

        // Step 1: Load previous/default playlist via API
        await loadPlaylist(house, playlistToLoad);

        // Step 2: Update React state - triggers DontStartBefore re-render
        setCurrentPlaylist(playlistToLoad);

        // Step 3: Wait for state propagation
        await new Promise(resolve => setTimeout(resolve, 1000));

        clearPreviousPlaylistId();
      }

      // Step 4: Now safe to delete temp playlists
      for (const playlist of tempPlaylists) {
        await deletePlaylist(playlist.id);
      }

      onCleanupComplete();
    };

    cleanup();
  }, [playlists]);

  return null; // This component doesn't render anything
};
```

**Key Points**:
1. **No Manual Backend Polling**: Removed duplicate sync logic
2. **React State Update**: `setCurrentPlaylist()` triggers DontStartBefore to re-render
3. **DontStartBefore Sync**: Built-in `usePlaylistSync` hook detects mismatch and syncs naturally
4. **1 Second Wait**: Allows state propagation before deletion
5. **Clean Architecture**: Works WITH existing sync mechanisms, not against them

**Log Signatures**:
```
[DontStartBefore] started
[PlaylistCleanup] Starting temporary playlist cleanup
[PlaylistCleanup] Found 1 temporary playlists to clean up
[PlaylistCleanup] CRITICAL: Current playlist 2270 is temporary!
[PlaylistCleanup] Step 1: Switching to previous/default playlist
[PlaylistCleanup] Step 2: Deleting temp playlists
[PlaylistCleanup] Successfully deleted: 2270
```

---

## Phase 4: Cleanup

### Location
[playModeUtils.js:11-111](src/Play/playModeUtils.js#L11-L111)

### Primary Function: `terminatePlayMode()`

```javascript
export const terminatePlayMode = async (tempPlaylistId, {
  house,
  setPlaylists,
  playModeRef,
  onPlayEnd,
  playlists
}) => {
  console.log("[terminatePlayMode] Starting PlayMode termination");

  try {
    // 1. Stop playback completely
    handleSendCommand('<vlc><cmd action="stop"/></vlc>', house);
    console.log("[terminatePlayMode] Stopped temporary playlist");

    // 2. Set Play Mode flag to false (prevents new operations)
    if (playModeRef && playModeRef.current) {
      playModeRef.current = false;
    }

    // 3. Call onPlayEnd callback (notifies parent)
    if (typeof onPlayEnd === 'function') {
      onPlayEnd();
    }

    // 4. Exit early if no temp playlist ID
    if (!tempPlaylistId) {
      return false;
    }

    // 5. Wait for stop command to process
    await new Promise(resolve => setTimeout(resolve, 200));

    // 6. Delete temporary playlist via API
    if (typeof deletePlaylist === 'function') {
      try {
        console.log(`[terminatePlayMode] Deleting playlist ${tempPlaylistId}`);
        await deletePlaylist(tempPlaylistId);
        console.log(`[terminatePlayMode] Successfully deleted playlist ${tempPlaylistId}`);
      } catch (error) {
        console.error(`[terminatePlayMode] Error deleting playlist:`, error);

        // Retry once after delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        await deletePlaylist(tempPlaylistId);
      }

      // 7. Update playlists state - remove deleted playlist
      if (typeof setPlaylists === 'function') {
        setPlaylists((prevPlaylists) =>
          prevPlaylists.filter((pl) => pl.id !== tempPlaylistId)
        );
      }
    }

    // 8. Wait for operations to complete
    await new Promise(resolve => setTimeout(resolve, 300));

    console.log("[terminatePlayMode] PlayMode termination complete");
    return true;

  } catch (error) {
    console.error("[terminatePlayMode] Error:", error);

    // Ensure PlayMode flag is reset even on error
    if (playModeRef) playModeRef.current = false;

    return false;
  }
};
```

### Log Signatures

```
[terminatePlayMode] Starting PlayMode termination
[terminatePlayMode] Stopped temporary playlist
[terminatePlayMode] After onPlayEnd, playModeRef: false
[terminatePlayMode] Deleting playlist 2270
[api deletePlaylist] Playlist 2270 deleted successfully.
[terminatePlayMode] PlayMode termination complete
```

---

## Phase 5: Restoration

### Location
[playModeUtils.js:114-204](src/Play/playModeUtils.js#L114-L204)

### Orchestration Function: `handlePlayMontageEnd()`

```javascript
export const handlePlayMontageEnd = async (tempPlaylistId, {
  house,
  handlePlaylistChange,
  currentPlaylist,
  setPlaylists,
  playModeRef,
  onPlayEnd,
  playlists
}) => {
  const sessionId = Date.now(); // Unique ID for logging
  console.log(`[HPM:${sessionId}] STARTING - TempPlaylistID: ${tempPlaylistId}`);

  // STEP 1: Terminate PlayMode (stop + delete temp playlist)
  console.log(`[HPM:${sessionId}] Calling terminatePlayMode`);
  const terminateResult = await terminatePlayMode(tempPlaylistId, {
    house,
    setPlaylists,
    playModeRef,
    onPlayEnd,
    playlists
  });
  console.log(`[HPM:${sessionId}] terminatePlayMode completed: ${terminateResult}`);

  try {
    // STEP 2: Retrieve previous playlist ID from localStorage
    const previousPlaylistId = getPreviousPlaylistId();
    console.log(`[HPM:${sessionId}] Retrieved previousPlaylistId: ${previousPlaylistId}`);

    if (!previousPlaylistId) {
      console.log(`[HPM:${sessionId}] No previous playlist ID found, exiting`);
      return;
    }

    // STEP 3: Verify previous playlist exists
    if (playlists) {
      const prevPlaylist = playlists.find(p => p.id === previousPlaylistId);
      if (prevPlaylist) {
        console.log(`[HPM:${sessionId}] Previous playlist: "${prevPlaylist.name}"`);
      } else {
        console.warn(`[HPM:${sessionId}] Previous playlist ${previousPlaylistId} not found!`);
      }
    }

    // STEP 4: Load previous playlist via API
    console.log(`[HPM:${sessionId}] Loading playlist: ${previousPlaylistId}`);
    await loadPlaylist(house, previousPlaylistId);
    console.log(`[HPM:${sessionId}] loadPlaylist API call completed`);

    // STEP 5: Wait for backend synchronization
    console.log(`[HPM:${sessionId}] Calling handlePlaylistChange`);
    const syncSuccess = await handlePlaylistChange(previousPlaylistId);
    console.log(`[HPM:${sessionId}] Sync completed: ${syncSuccess}`);

    // STEP 6: Verify restoration
    if (syncSuccess) {
      const isCurrent = (previousPlaylistId == currentPlaylist);
      console.log(`[HPM:${sessionId}] Restoration successful: ${isCurrent}`);

      if (!isCurrent) {
        console.warn(`[HPM:${sessionId}] SYNC ISSUE: currentPlaylist differs from target`);
      }
    } else {
      console.warn(`[HPM:${sessionId}] Backend sync failed`);
    }

    // STEP 7: Clear saved previous playlist ID
    console.log(`[HPM:${sessionId}] Clearing previousPlaylistId from localStorage`);
    clearPreviousPlaylistId();
    console.log(`[HPM:${sessionId}] COMPLETED handlePlayMontageEnd`);

  } catch (error) {
    console.error(`[HPM:${sessionId}] ERROR:`, error);
  }

  console.log(`[HPM:${sessionId}] FINAL STATE - PlayModeRef: ${playModeRef?.current}`);
};
```

### localStorage Management

**Save Previous Playlist**:
```javascript
export const savePreviousPlaylistId = (playlistId) => {
  if (playlistId) {
    localStorage.setItem('previousPlaylistId', playlistId);
    console.log(`[localStorage] Saved previous playlist ID: ${playlistId}`);
  }
};
```

**Retrieve Previous Playlist**:
```javascript
export const getPreviousPlaylistId = () => {
  const playlistId = localStorage.getItem('previousPlaylistId');
  console.log(`[localStorage] Retrieved previous playlist ID: ${playlistId}`);
  return playlistId;
};
```

**Clear Previous Playlist**:
```javascript
export const clearPreviousPlaylistId = () => {
  localStorage.removeItem('previousPlaylistId');
  console.log('[localStorage] Cleared previous playlist ID');
};
```

### Log Signatures

```
[HPM:1761819845000] STARTING - TempPlaylistID: 2270, CurrentPlaylist: 2270
[HPM:1761819845000] Calling terminatePlayMode for tempPlaylistId: 2270
[HPM:1761819845000] terminatePlayMode completed with result: true
[HPM:1761819845000] Retrieved previousPlaylistId: 2268
[HPM:1761819845000] Loading playlist: 2268
[HPM:1761819845000] Sync completed: true
[localStorage] Cleared previous playlist ID
[HPM:1761819845000] COMPLETED handlePlayMontageEnd
```

---

## Child App (WebPlayer) Integration

### WebSocket Communication

The parent app (React) creates playlists via REST API, but the child app (TypeScript WebPlayer) handles playback via WebSocket.

**Playlist Loading**:
```
[WS-TOOLS] Processing playlist: 2270
[WS-TOOLS] INITIAL PLAYLIST LOAD: {playlistId: 2270, playlistName: 'Temp_Playlist_20251030T102246'}
setCurrentPlaylist: Setting initial playlist: 2270
Sequencer.assumeNewPlaylist: Changing to playlist: ID 2270
```

**Playback Control**:
```
[WS-TOOLS] Processing commands: 1
[CommandsManager.vlc] Executing VLC command: play
Sequencer.play: Playback started
```

**Stop Command**:
```
[WS-TOOLS] Processing commands: 1
[CommandsManager.vlc] Executing VLC command: stop
Sequencer.stop: Playback stopped
```

### Parent-Child Coordination

See [WALLMUSE_PLAYER_CONTAINER_RULES.md](WALLMUSE_PLAYER_CONTAINER_RULES.md) for complete details on parent-child communication.

---

## Error Handling and Edge Cases

### Missing Previous Playlist ID

**Scenario**: localStorage has no `previousPlaylistId`

**Cause**:
- Browser cleared localStorage during playback
- User opened in incognito mode
- `savePreviousPlaylistId()` was never called

**Handling**:
```javascript
const previousPlaylistId = getPreviousPlaylistId();
if (!previousPlaylistId) {
  console.log("No previous playlist ID found, exiting");
  return; // Exit gracefully, leave user at current state
}
```

**Result**: Temp playlist is deleted but no restoration occurs. User must manually select a playlist.

---

### Playlist Deletion Failure

**Scenario**: API call to delete temp playlist fails

**Handling**:
```javascript
try {
  await deletePlaylist(tempPlaylistId);
} catch (error) {
  console.error("Error deleting playlist:", error);

  // Retry once after delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  try {
    await deletePlaylist(tempPlaylistId);
  } catch (error2) {
    console.error("Second deletion attempt failed:", error2);
    // Continue anyway - backend will clean up eventually
  }
}
```

**Result**: Two attempts are made. If both fail, process continues to prevent user from being stuck.

---

### Multiple Temporary Playlists

**Scenario**: Multiple `Temp_Playlist_*` playlists exist (from crashes or errors)

**Handling**: CleanupTemporaryPlaylists in App.js detects and removes all temp playlists on startup

```javascript
const tempPlaylists = playlists.filter(p => p?.name?.startsWith('Temp_Playlist_'));
for (const playlist of tempPlaylists) {
  await deletePlaylist(playlist.id);
}
```

---

### Timer vs Manual Stop Race Condition

**Scenario**: Timer fires while user is clicking Stop button

**Handling**: `playModeRef.current` check prevents duplicate cleanup

```javascript
if (!playModeRef.current) {
  console.log("Already out of play mode, cleanup already done");
  return;
}
```

**Result**: First termination trigger wins, subsequent triggers exit early.

---

## Testing the Lifecycle

### Manual Test Cases

1. **Normal Playback**
   - Click "Play" on montage
   - Wait for montage to finish
   - Verify temp playlist deleted
   - Verify previous playlist restored

2. **Manual Stop**
   - Click "Play" on montage
   - Click "Stop" before montage finishes
   - Verify temp playlist deleted
   - Verify previous playlist restored

3. **Browser Refresh**
   - Click "Play" on montage
   - Refresh browser while playing
   - Verify temp playlist cleaned up on reload

4. **No Previous Playlist**
   - Clear localStorage
   - Play montage (creates temp playlist)
   - Stop playback
   - Verify graceful handling (no error, temp playlist deleted)

### Console Log Checklist

**Creation Phase**:
- ✅ `Adding a playlist: Temp_Playlist_*`
- ✅ `[MontageSelection handlePlayMontage] Temp playlist created`
- ✅ `[localStorage] Saved previous playlist ID`

**Playback Phase**:
- ✅ `[MontageSelection handlePlayMontage playbackTimer] Timer set`
- ✅ `[WS-TOOLS] INITIAL PLAYLIST LOAD`
- ✅ `Sequencer.play: Playback started`

**Termination Phase**:
- ✅ `[terminatePlayMode] Starting PlayMode termination`
- ✅ `[terminatePlayMode] Stopped temporary playlist`

**Cleanup Phase**:
- ✅ `[terminatePlayMode] Deleting playlist`
- ✅ `[api deletePlaylist] Playlist * deleted successfully`

**Restoration Phase**:
- ✅ `[HPM:*] Retrieved previousPlaylistId`
- ✅ `[HPM:*] Loading playlist`
- ✅ `[HPM:*] Sync completed: true`
- ✅ `[localStorage] Cleared previous playlist ID`

---

## UI/UX Considerations

### PlayerCommands State During Play Mode

| Button | State | Visual | Reason |
|--------|-------|--------|--------|
| Play/Pause | DISABLED | Opacity 0.3 (greyed) | Prevents confusion - montage preview is automatic |
| Stop | ENABLED | Opacity 1.0 (normal) | Allows manual termination |
| Forward | DISABLED | Opacity 0.3 (greyed) | Montage preview is linear, no navigation |
| Backward | DISABLED | Opacity 0.3 (greyed) | Montage preview is linear, no navigation |
| Volume | ENABLED | Opacity 1.0 (normal) | User can adjust audio during preview |
| Mute | ENABLED | Opacity 1.0 (normal) | User can mute audio during preview |
| Fullscreen | ENABLED | Opacity 1.0 (normal) | User can enter fullscreen mode |

**Implementation**: [PlayerCommands.js:270-330](src/PlayerCommands/PlayerCommands.js#L270-L330)
- Disabled buttons wrapped in `<span>` for tooltip to work
- `sx={{ opacity: playModeRef.current ? 0.3 : 1 }}` for visual feedback
- Tooltip shows "Disabled during montage preview" when disabled

### Visual Feedback

- **Disabled buttons (Play/Pause/Forward/Backward)**: Greyed out with 30% opacity
- **Disabled button tooltip**: Shows "Disabled during montage preview"
- **Active buttons (Stop/Volume/Mute/Fullscreen)**: Full color and 100% opacity
- **Stop button**: Remains prominent to allow user to exit preview mode
- **Volume controls**: Remain fully interactive for audio adjustment
- **Montage card**: Could be highlighted to indicate "playing" (future enhancement)

### Scroll Behavior

After montage ends (natural or manual stop):
```javascript
const lastMontageElement = document.getElementById(`montage-${montageId}`);
if (lastMontageElement) {
  lastMontageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
```

User is scrolled back to the montage card they played, providing clear context.

---

## Developer Notes

### Key Design Principles

1. **Always Clean Up**: Three termination pathways ensure no orphaned playlists
2. **Fail Gracefully**: Missing previousPlaylistId doesn't crash the app
3. **Prevent Race Conditions**: playModeRef checks prevent duplicate cleanup
4. **Extensive Logging**: Every step is logged for debugging
5. **Retry Logic**: Playlist deletion is retried once if it fails

### Naming Convention

Temporary playlists MUST start with `Temp_Playlist_` for cleanup detection:
```javascript
const playlistName = `Temp_Playlist_${timestamp}`;
```

DO NOT change this naming convention without updating CleanupTemporaryPlaylists logic.

### localStorage Keys

- `previousPlaylistId` - Stores playlist to restore (cleared after use)
- `wm-house-*` - House fingerprints (unrelated to temp playlists)
- `wallmuse-volume` - Volume setting (unrelated to temp playlists)
- `wallmuse-muted` - Mute state (unrelated to temp playlists)

### Critical Dependencies

- **playModeRef**: Must be passed through App → PlayerIntegration → PlayerCommands
- **onTempPlaylistCreated**: Must be called to set currentTempPlaylistId in App.js
- **handlePlaylistChange**: Must properly sync with backend for restoration
- **WebSocket**: Child app must handle playlist loading for playback to work

---

## Future Improvements

### Potential Enhancements

1. **Visual Play Mode Indicator**
   - Banner showing "Preview Mode" during montage playback
   - Clear indication that Stop will return to previous state

2. **Playlist History**
   - Store multiple previous playlists for back/forward navigation
   - Allow user to cancel preview and return to specific playlist

3. **Preview Queue**
   - Allow user to queue multiple montages for preview
   - Auto-advance to next montage after current finishes

4. **Persistent Preview State**
   - Save preview state across browser sessions
   - Restore preview on page reload (instead of just cleanup)

### Code Quality

1. **Error Boundaries**
   - Wrap MontageSelection in ErrorBoundary
   - Gracefully handle failures in handlePlayMontageEnd

2. **TypeScript Migration**
   - Convert playModeUtils.js to TypeScript
   - Add strong typing for context parameters

3. **Unit Tests**
   - Test each phase independently
   - Mock localStorage for testing edge cases
   - Test race conditions with timer/stop combinations

---

## Troubleshooting Guide

### Symptom: Temp playlist not deleted

**Check**:
- Is `terminatePlayMode()` being called?
- Is `deletePlaylist()` API call succeeding?
- Check network tab for DELETE request

**Logs to look for**:
```
[terminatePlayMode] Deleting playlist {id}
[api deletePlaylist] Playlist {id} deleted successfully
```

---

### Symptom: Previous playlist not restored

**Check**:
- Does `localStorage.previousPlaylistId` exist?
- Is `getPreviousPlaylistId()` returning a value?
- Is `handlePlaylistChange()` syncing correctly?

**Logs to look for**:
```
[localStorage] Saved previous playlist ID: {id}
[HPM:*] Retrieved previousPlaylistId: {id}
[HPM:*] Sync completed: true
```

---

### Symptom: WebPlayer frozen after stop

**Root Cause**: `handleStopPlayMode` wasn't calling `onStop()` before cleanup

**Check**:
- Is `onStop()` being called BEFORE `handlePlayMontageEnd()`?
- Is WebSocket receiving stop command?
- Is playlist restoration loading properly?

**Logs to look for**:
```
[PlayerCommands handleStopPlayMode] Calling onStop to stop playback
[WS-TOOLS] Processing commands: 1
[CommandsManager.vlc] Executing VLC command: stop
Sequencer.stop: Playback stopped
[terminatePlayMode] Starting PlayMode termination
[HPM:*] Will load playlist: undefined (DEFAULT)
```

**Fix Applied**: [PlayerCommands.js:185-188](src/PlayerCommands/PlayerCommands.js#L185-L188) - Added `onStop()` call before cleanup to properly stop sequencer before deleting playlist.

---

### Symptom: Multiple temp playlists accumulating / Black screen on refresh

**Root Cause**: When user refreshes during montage preview, `currentPlaylist` is the temp playlist. CleanupTemporaryPlaylists was deleting it while WebPlayer was trying to load it, causing black screen.

**Fix Applied**: [playModeUtils.js:264-290](src/Play/playModeUtils.js#L264-L290)
1. **Switch away FIRST**: Load default/previous playlist BEFORE deleting temp playlists
2. **Wait for switch**: 500ms delay to let WebPlayer process the switch
3. **Then delete**: Only delete temp playlists after switching away

**Check**:
- Is CleanupTemporaryPlaylists running on app load?
- Does it switch away before deleting?
- Is deletion succeeding?

**Logs to look for**:
```
[PlaylistCleanup] CRITICAL: Current playlist 2272 is temporary!
[PlaylistCleanup] Must switch away from it BEFORE deleting to prevent black screen
[PlaylistCleanup] Step 1: Switching to previous/default playlist: DEFAULT
[PlaylistCleanup] Step 1 COMPLETE: Switched away from temp playlist
[PlaylistCleanup] Step 2: Deleting 1 temp playlists
[PlaylistCleanup] Successfully deleted: 2272
[PlaylistCleanup] Step 2 COMPLETE: All temp playlists deleted
```

---

## Appendix: Complete Log Flow

### Successful Lifecycle (Natural End - Timer)

```
// CREATION
[MontageSelection handlePlayMontage] Montage duration: 333.32s
Adding a playlist: Temp_Playlist_20251030T102246
[MontageSelection handlePlayMontage] Temp playlist created: {id: '2270'}
[localStorage] Saved previous playlist ID: 2268
[App PlayerIntegration] Setting temp playlist ID: 2270

// PLAYBACK
[WS-TOOLS] INITIAL PLAYLIST LOAD: {playlistId: 2270}
Sequencer.assumeNewPlaylist: Changing to playlist: ID 2270
[MontageSelection handlePlayMontage playbackTimer] Timer set to fire after 333.32 seconds

// TERMINATION (Timer)
[MontageSelection handlePlayMontage playbackTimer] Timer fired after 333.32 seconds
[HPM:1761819845000] STARTING - TempPlaylistID: 2270

// CLEANUP
[terminatePlayMode] Starting PlayMode termination
[terminatePlayMode] Stopped temporary playlist
[terminatePlayMode] Deleting playlist 2270
[api deletePlaylist] Playlist 2270 deleted successfully

// RESTORATION
[HPM:1761819845000] Retrieved previousPlaylistId: 2268
[HPM:1761819845000] Loading playlist: 2268
[HPM:1761819845000] Sync completed: true
[localStorage] Cleared previous playlist ID
[HPM:1761819845000] COMPLETED handlePlayMontageEnd
```

---

### Successful Lifecycle (Manual Stop - User Clicks Stop Button)

```
// CREATION (same as above)
[MontageSelection handlePlayMontage] Montage duration: 333.32s
Adding a playlist: Temp_Playlist_20251030T111156
[MontageSelection handlePlayMontage] Temp playlist created: {id: '2272'}
[localStorage] Saved previous playlist ID: undefined (or specific ID if existed)
[App PlayerIntegration] Setting temp playlist ID: 2272

// PLAYBACK
[WS-TOOLS] INITIAL PLAYLIST LOAD: {playlistId: 2272}
Sequencer.assumeNewPlaylist: Changing to playlist: ID 2272
Sequencer.play: Playback started

// USER CLICKS STOP BUTTON
[PlayerCommands Stop Button] Clicked - playModeRef.current: true
[PlayerCommands Stop Button] Routing to handleStopPlayMode
[PlayerCommands handleStopPlayMode] START - playModeRef.current: true, currentTempPlaylistId: 2272
[PlayerCommands handleStopPlayMode] Calling onStop to stop playback

// STOP COMMAND SENT TO SEQUENCER
[WS-TOOLS] Processing commands: 1
[CommandsManager.vlc] Executing VLC command: stop
[2025-10-30 12:11:56.487] Sequencer.stop: Playback stopped

// CLEANUP AND RESTORATION
[PlayerCommands handleStopPlayMode] Calling handlePlayMontageEnd with tempPlaylistId: 2272
[HPM:1761822716487] STARTING - TempPlaylistID: 2272
[terminatePlayMode] Starting PlayMode termination
[terminatePlayMode] Deleting playlist 2272
[api deletePlaylist] Playlist 2272 deleted successfully
[HPM:1761822716487] Retrieved previousPlaylistId: null
[HPM:1761822716487] Will load playlist: undefined (DEFAULT)
[HPM:1761822716487] No previous playlist ID found - loading default playlist
[HPM:1761822716487] loadPlaylist API call completed for playlist: undefined
[HPM:1761822716487] Sync completed: true
[PlayerCommands handleStopPlayMode] handlePlayMontageEnd completed
[PlayerCommands handleStopPlayMode] END - playModeRef.current: false

// RESULT: User back to default playlist, ready for new action
```

---

## Version History

- **v1.0** (2025-10-30) - Initial documentation based on code analysis
- **v1.1** (2025-10-30) - Added fix for Stop button not calling `onStop()` before cleanup (Bug #1)
  - Updated handleStopPlayMode flow to stop playback first
  - Added visual feedback documentation (greyed out buttons with opacity 0.3)
  - Clarified that Fullscreen remains enabled in Play Mode
  - Added comprehensive logging for Stop button click routing
- **v1.2** (2025-10-30) - Fixed black screen on refresh during montage preview (Bug #2)
  - CleanupTemporaryPlaylists now switches away from temp playlist BEFORE deleting it
  - Prevents WebPlayer from trying to load a playlist that's being deleted
  - Added 500ms delay to ensure playlist switch completes before deletion
  - Fixed demo accounts bypassing cleanup (they now run cleanup properly)
  - Improved cleanup timing to wait for playlists to load before attempting cleanup
- **v1.3** (2025-10-30) - Simplified and optimized cleanup synchronization architecture
  - Removed duplicate backend polling from CleanupTemporaryPlaylists
  - Now leverages DontStartBefore's built-in usePlaylistSync hook for natural sync
  - Reduced cleanup time and eliminated unnecessary render cycles
  - Works WITH existing sync mechanisms instead of against them
  - Added comprehensive explanation of three termination scenarios and their sync paths
  - Clarified architectural principle: "Work WITH the existing sync mechanisms, don't fight them"
- Future versions will track improvements and bug fixes

---

**END OF DOCUMENT**
