# Play Montage Fix & Mono-Playlist Approach

**Date:** November 23, 2025

---

## Part 1: Today's Fixes

### Problem
Clicking "Play" on a montage from the montage selection was showing a black screen. The temporary playlist was created, but the video never displayed.

### Root Cause
1. The `webplayer-navigate` event was missing the `isPlaylistChange` flag
2. When playlist change was detected, WebPlayer.js tried to reload the player HTML, but the child TypeScript app's scripts don't re-execute after DOM manipulation
3. The `#root-wm-player` element was injected but React never re-mounted into it

### Files Changed

#### 1. EnvironmentsContext.js
**Location:** `src/contexts/EnvironmentsContext.js` (lines ~684-700)

**Change:** Added `isPlaylistChange` flag to the navigation event

```javascript
// BEFORE
window.dispatchEvent(new CustomEvent('webplayer-navigate', {
    detail: {
        playlist: newPlaylistId,
        position: position,
        timestamp: Date.now()
    }
}));

// AFTER
const isPlaylistChange = String(newPlaylistId) !== String(currentPlaylist);
window.dispatchEvent(new CustomEvent('webplayer-navigate', {
    detail: {
        playlist: newPlaylistId,
        position: position,
        isPlaylistChange: isPlaylistChange,
        timestamp: Date.now()
    }
}));
```

#### 2. WebPlayer.js
**Location:** `src/WebPlayer.js` (lines ~287-297)

**Change:** Use `webPlayerNavigate` for playlist changes instead of trying to reload the player HTML

```javascript
// BEFORE - tried to reload player (didn't work)
if (isPlaylistChange) {
    if (containerRef.current) {
        containerRef.current.innerHTML = '';
    }
    setIsPlayerLoaded(false);
    hasLoadedOnce.current = false;
    setReloadTrigger(prev => prev + 1);
}

// AFTER - use existing navigation function
if (isPlaylistChange) {
    logInfo('📂 Playlist change detected - navigating via webPlayerNavigate');
    if (window.webPlayerNavigate) {
        window.webPlayerNavigate({ playlist, position: position || { montage: 0 } });
    }
}
```

#### 3. WebPlayer.js - CSS Fix for 16:9 Aspect Ratio
**Location:** `src/WebPlayer.js` (lines ~352-380 and ~159-206)

**Change:** Fixed video player showing black bars on desktop by:
- Changed container to use absolute positioning with `inset: 0`
- Enhanced CSS injection to override child player's viewport-based rules (`min-height: 100vh`, `min-width: 100vw`)

---

## Part 2: Mono-Playlist Approach Plan (planned 20251228+)

### Current Architecture (Temporary Playlists)
1. User clicks "Play" on a montage
2. `handlePlayMontage` creates a temporary playlist
3. Adds the montage to the temp playlist
4. Navigates to the temp playlist
5. On stop/navigation away, temp playlist is deleted
6. Complex cleanup logic, race conditions, reload issues

### New Architecture (Mono-Playlists)

#### Backend Changes (Create Montage App)
1. **On montage creation:** Automatically create a "mono-playlist" containing only that montage
2. **Store relationship:** Link montage ID to its mono-playlist ID (either in montage record or separate table)
3. **On montage deletion:** Delete the associated mono-playlist
4. **On montage update:** Update the mono-playlist if needed (e.g., track count changes)

#### Frontend Changes

##### MontageSelection.js
1. **Filter mono-playlists from display:** Don't show mono-playlists in user's playlist management
2. **Simplify `handlePlayMontage`:**
   ```javascript
   // NEW - much simpler
   const handlePlayMontage = async (montageId) => {
       const montage = getMontageById(montageId);
       const monoPlaylistId = montage.mono_playlist_id; // New field from backend

       // Just navigate to the mono-playlist - no creation needed
       handlePlaylistChange(monoPlaylistId, 0);
       scrollToWebPlayer();
   };
   ```

##### Remove Temp Playlist Logic
- Remove `addPlaylist` call for temp playlists
- Remove `saveTempPlaylistId` calls
- Remove temp playlist cleanup/deletion logic
- Remove `monitorPlayback` timer for temp playlist cleanup

##### Handle Refresh/Reload
```javascript
// On app load, check if current playlist is a mono-playlist
useEffect(() => {
    const currentPlaylistId = localStorage.getItem('currentPlaylist');
    const isMonoPlaylist = checkIfMonoPlaylist(currentPlaylistId); // New utility

    if (isMonoPlaylist) {
        // Switch to last regular playlist or default
        const lastRegularPlaylist = localStorage.getItem('lastRegularPlaylist');
        const defaultPlaylist = getDefaultPlaylist();
        setCurrentPlaylist(lastRegularPlaylist || defaultPlaylist);
    }
}, []);
```

##### Track Last Regular Playlist
```javascript
// When switching to a regular playlist, save it
const handlePlaylistChange = (playlistId, position) => {
    const isMonoPlaylist = checkIfMonoPlaylist(playlistId);

    if (!isMonoPlaylist) {
        localStorage.setItem('lastRegularPlaylist', playlistId);
    }

    // ... rest of navigation logic
};
```

### Benefits of Mono-Playlist Approach
1. **Simpler code:** No temp playlist creation/deletion
2. **No race conditions:** Playlist always exists
3. **Better for sharing:** Permanent URL with playlist ID
4. **Cleaner architecture:** Single flow for all playback
5. **Works with refresh:** Just need to detect and redirect
6. **Offline-friendly:** Playlist data can be cached

### Estimated Timeline
- **Backend changes:** 0.5-1 day (create montage app modifications)
- **Migration script:** 0.5 day (create mono-playlists for existing montages)
- **Frontend cleanup:** 0.5-1 day (remove temp playlist logic, add mono-playlist filtering)
- **Testing:** 0.5 day

**Total: ~2-3 days**

### Considerations
1. **Database growth:** Each montage gets a playlist (acceptable trade-off for simplicity)
2. **API response:** Include `mono_playlist_id` in montage data from `searchMontages`
3. **Playlist filtering:** Need a flag to distinguish mono-playlists from user playlists
4. **Social sharing:** Mono-playlist URLs work great for sharing specific montages

---

## Deployment Status

| Environment | Version | Status |
|-------------|---------|--------|
| Test (v4b)  | Latest  | Deployed |
| Production  | v4.135  | Deployed |
| GitHub      | Latest  | Copied (commit pending) |
