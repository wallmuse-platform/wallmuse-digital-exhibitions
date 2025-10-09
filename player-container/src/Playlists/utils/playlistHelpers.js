// playlistHelpers.js

/**
 * Core function to sync playlist with backend and update UI/WebPlayer only after confirmation.
 * Exported for reuse in other flows.
 */
export async function syncPlaylistAndUI(playlistId, handlePlaylistChange, setReadyToPlayPlaylist, currentPlaylist) {
    console.log(`[PlaylistHelpers] Now waiting for backend confirmation...`);
    const syncSuccess = await handlePlaylistChange(playlistId);
    console.log(`[PlaylistHelpers] Backend sync completed with result: ${syncSuccess}`);

    if (syncSuccess) {
        console.log(`[PlaylistHelpers] Playlist ${playlistId} is now current.`);
        if (setReadyToPlayPlaylist) setReadyToPlayPlaylist(true);
        const isCurrent = (playlistId == currentPlaylist);
        console.log('[PlaylistHelpers] currentPlaylist after sync:', currentPlaylist, 'isCurrent:', isCurrent);
    } else {
        console.warn(`[PlaylistHelpers] Backend sync failed or timed out for playlist ${playlistId}.`);
    }
    return syncSuccess;
}

export const autoSaveUpdates = async ({
    playlistIndex,
    playlist,
    updatePlaylist,
    setSaveInProgress,
    updateSaveStatus,
    handlePlaylistUpdate,
    t,
    skipStateUpdate = false,
    currentPlaylistId, // optional
    syncWithBackend,   // optional: function (playlistId) => Promise<boolean>
    setReadyToPlayPlaylist, // optional
}) => {
    console.log("[playlistHelpers] autoSaveUpdates called with: playlistIndex, playlist", playlistIndex, playlist, skipStateUpdate);

    if (!playlist.changed) {
        console.log("[playlistHelpers] No changes to save for playlist:", playlist.name);
        return Promise.resolve(); // Return a resolved promise if no changes
    }

    console.log("[playlistHelpers] Updating changed playlist:", playlist);
    const montageIds = playlist.montages.map(m => m.id).join(',');
    const checks = playlist.montages.map(m => m.is_checked == "1" ? "1" : "0").join(',');

    console.log("[playlistHelpers] Extracted montageIds and checks:", montageIds, checks);

    setSaveInProgress(true);

    try {
        const response = await updatePlaylist(playlist.id, playlist.name, montageIds, checks);
        console.log("[playlistHelpers] Response from updatePlaylist:", response);
        setSaveInProgress(false);

        if (response.status >= 200 && response.status < 300) {
            if (!skipStateUpdate) {
                handlePlaylistUpdate(playlistIndex, playlist.name);
            } else {
                updateSaveStatus(true, null, playlistIndex);
            }
            console.log("[playlistHelpers] Playlist update successful for:", playlist.name);

        // --- NEW LOGIC: Backend sync if current playlist ---
        if (syncWithBackend && playlist.id === currentPlaylistId) {
            console.log('[playlistHelpers] About to call syncWithBackend for playlist.id:', playlist.id, 'currentPlaylistId:', currentPlaylistId);
            try {
                const syncResult = await syncWithBackend(playlist.id);
                console.log('[playlistHelpers] syncWithBackend result for playlist.id:', playlist.id, '=>', syncResult);
                if (setReadyToPlayPlaylist) {
                    console.log('[playlistHelpers] Calling setReadyToPlayPlaylist for playlist.id:', playlist.id);
                    setReadyToPlayPlaylist(true);
                }
            } catch (err) {
                console.error('[playlistHelpers] Error in syncWithBackend for playlist.id:', playlist.id, err);
            }
        }
            // --- END NEW LOGIC ---
            return response;
        } else {
            throw new Error(`${t("error")}: ${response.statusText}`);
        }
    } catch (error) {
        console.error("[playlistHelpers] Error during updatePlaylist call:", error);
        setSaveInProgress(false);
        updateSaveStatus(false, `${t("error")}: ${error.message}. ${t("error.generic")}`);
        throw error;
    }
};