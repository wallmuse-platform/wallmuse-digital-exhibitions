import { handleSendCommand } from "../App";
import { loadPlaylist } from "../utils/api";

// In playbackUtils.js or similar file

// Core function to terminate PlayMode
// Used for mono-playlists (persistent, not deleted)
export const terminatePlayMode = async ({ house, playModeRef, onPlayEnd }) => {
  console.log("[terminatePlayMode] Starting PlayMode termination");

  try {
    // 1. Ensure playback is completely stopped
    handleSendCommand('<vlc><cmd action="stop"/></vlc>', house);
    console.log("[terminatePlayMode] Stopped playback");

    // 2. Set the play mode to false to prevent any new operations
    if (playModeRef && playModeRef.current) {
      playModeRef.current = false;
    }

    // 3. Call onPlayEnd callback if provided
    if (typeof onPlayEnd === "function") {
      onPlayEnd();
      console.log(
        "[terminatePlayMode] After onPlayEnd, playModeRef:",
        playModeRef?.current,
      );
    }

    // 4. Wait for operations to complete
    await new Promise((resolve) => setTimeout(resolve, 300));

    console.log("[terminatePlayMode] PlayMode termination complete");
    return true;
  } catch (error) {
    console.error("[terminatePlayMode] Error:", error);

    // Make sure PlayMode flag is reset even on error
    if (playModeRef) playModeRef.current = false;

    return false;
  }
};

// Enhanced handlePlayMontageEnd - handles mono-playlists (persistent, not deleted)
export const handlePlayMontageEnd = async (
  playlistId,
  {
    house,
    handlePlaylistChange,
    currentPlaylist,
    setPlaylists,
    playModeRef,
    onPlayEnd,
    playlists,
  },
) => {
  const sessionId = Date.now(); // Unique ID for this session
  console.log(
    `[MonoPlaylist:End:${sessionId}] ⏹ STOP - Playlist: ${playlistId}, Current: ${currentPlaylist}`,
  );

  // Determine if this is a mono-playlist
  const playlist = playlists?.find((p) => p.id === playlistId);
  const isMonoPlaylist = playlist?.name?.startsWith("mono-");

  console.log(
    `[MonoPlaylist:End:${sessionId}] Type: "${playlist?.name}" - Mono: ${isMonoPlaylist}`,
  );

  // Log current playlists state before any operations
  if (playlists) {
    const monoPlaylists = playlists.filter((p) => p?.name?.startsWith("mono-"));
    console.log(
      `[MonoPlaylist:End:${sessionId}] Playlists - Total: ${playlists.length}, Mono: ${monoPlaylists.length}`,
    );
  }

  // Terminate PlayMode (stop playback and reset play mode)
  // Mono-playlists are persistent and not deleted
  console.log(
    `[MonoPlaylist:End:${sessionId}] → Stopping playback and resetting PlayMode`,
  );
  const terminateResult = await terminatePlayMode({
    house,
    playModeRef,
    onPlayEnd,
  });
  console.log(
    `[MonoPlaylist:End:${sessionId}] ✓ Terminated with result: ${terminateResult}`,
  );

  try {
    // Get the previous playlist ID with our own logging
    const previousPlaylistId = getPreviousPlaylistId();
    console.log(
      `[MonoPlaylist:End:${sessionId}] → Returning to previous playlist: ${previousPlaylistId || "DEFAULT"}`,
    );

    // If no previous playlist was saved, it means we were on default playlist
    // Load default playlist (undefined/empty)
    const playlistToLoad = previousPlaylistId || undefined;

    // Verify if previous playlist exists and what type it is
    if (previousPlaylistId && playlists) {
      const prevPlaylist = playlists.find((p) => p.id === previousPlaylistId);
      if (prevPlaylist) {
        console.log(
          `[MonoPlaylist:End:${sessionId}] Previous playlist: "${prevPlaylist.name}"`,
        );
      } else {
        console.warn(
          `[MonoPlaylist:End:${sessionId}] ⚠ Previous playlist ${previousPlaylistId} not found!`,
        );
      }
    }

    // Load the previous playlist (or default if undefined)
    await loadPlaylist(house, playlistToLoad);
    console.log(
      `[MonoPlaylist:End:${sessionId}] → Loading playlist: ${playlistToLoad || "DEFAULT"}`,
    );

    // Wait for backend confirmation with detailed logging
    console.log(`[MonoPlaylist:End:${sessionId}] → Waiting for sync...`);
    const beforeHandleCurrentPlaylist = currentPlaylist;
    const syncSuccess = await handlePlaylistChange(playlistToLoad);
    console.log(
      `[MonoPlaylist:End:${sessionId}] ${syncSuccess ? "✓" : "✗"} Sync result: ${syncSuccess}`,
    );

    // Check currentPlaylist immediately after sync
    if (syncSuccess) {
      const afterHandleCurrentPlaylist = currentPlaylist;
      const isCurrent = playlistToLoad == afterHandleCurrentPlaylist;
      console.log(
        `[MonoPlaylist:End:${sessionId}] Current playlist now: ${afterHandleCurrentPlaylist} (${isCurrent ? "correct" : "MISMATCH"})`,
      );

      if (!isCurrent) {
        console.warn(
          `[MonoPlaylist:End:${sessionId}] ⚠ SYNC ISSUE: Expected ${playlistToLoad}, got ${afterHandleCurrentPlaylist}`,
        );
      }
    } else {
      console.warn(`[MonoPlaylist:End:${sessionId}] ✗ Backend sync failed`);
    }

    // Clear the saved previous playlist ID (if any was saved)
    if (previousPlaylistId) {
      clearPreviousPlaylistId();
      console.log(
        `[MonoPlaylist:End:${sessionId}] ✓ Cleared previousPlaylistId from localStorage`,
      );
    }
    console.log(
      `[MonoPlaylist:End:${sessionId}] ✓ COMPLETED - returned to previous playlist`,
    );
  } catch (error) {
    console.error(`[MonoPlaylist:End:${sessionId}] ✗ ERROR:`, error);
  }

  // Final state check
  console.log(
    `[MonoPlaylist:End:${sessionId}] Final state - Playlist: ${currentPlaylist}, PlayMode: ${playModeRef?.current}`,
  );
};

// Save previous playlist ID to localStorage
export const savePreviousPlaylistId = (playlistId) => {
  if (playlistId) {
    localStorage.setItem("previousPlaylistId", playlistId);
    console.log(`[localStorage] Saved previous playlist ID: ${playlistId}`);
  }
};

// Get previous playlist ID from localStorage
export const getPreviousPlaylistId = () => {
  const playlistId = localStorage.getItem("previousPlaylistId");
  console.log(`[localStorage] Retrieved previous playlist ID: ${playlistId}`);
  return playlistId;
};

// Clear previous playlist ID from localStorage
export const clearPreviousPlaylistId = () => {
  localStorage.removeItem("previousPlaylistId");
  console.log("[localStorage] Cleared previous playlist ID");
};
