import { handleSendCommand } from "../App";
import { loadPlaylist, deletePlaylist } from "../utils/api"
import { useEffect, useRef } from 'react';
import { usePlaylists } from '../contexts/PlaylistsContext';
import { useEnvironments, handlePlaylistChange } from "../contexts/EnvironmentsContext.js";

// In playbackUtils.js or similar file

// Core function to terminate PlayMode and clean up temporary playlists
// Modified terminatePlayMode to avoid using hooks
export const terminatePlayMode = async (tempPlaylistId = null, {
    house,
    setPlaylists,
    playModeRef,
    onPlayEnd,
    playlists
}) => {
    console.log("[terminatePlayMode] Starting PlayMode termination");

    // Signal play end first to avoid race
    try {

        // 1. ensure playback is completely stopped
        handleSendCommand('<vlc><cmd action="stop"/></vlc>', house);
        console.log("[terminatePlayMode] Stopped temporary playlist");

        // 2. First set the play mode to false to prevent any new operations
        if (playModeRef && playModeRef.current) {
            playModeRef.current = false;
        }

        // 3. Call onPlayEnd callback if provided
        if (typeof onPlayEnd === 'function') {
            onPlayEnd();
            console.log("[terminatePlayMode] After onPlayEnd, playModeRef:", playModeRef?.current);
        }

        // 4. If no temp playlist ID, just exit
        if (!tempPlaylistId) {
            console.log(`[terminatePlayMode] No temp playlist ID provided, exiting`);
            return false;
        }

        // 5. Wait to ensure stop command is fully processed
        await new Promise(resolve => setTimeout(resolve, 200));

        // 6. Delete temporary playlist if we have an ID
        if (tempPlaylistId) {
            if (typeof deletePlaylist === 'function') {
                try {
                    console.log(`[terminatePlayMode] Deleting playlist ${tempPlaylistId}`);
                    await deletePlaylist(tempPlaylistId);
                    console.log(`[terminatePlayMode] Successfully deleted playlist ${tempPlaylistId}`);
                } catch (error) {
                    console.error(`[terminatePlayMode] Error deleting playlist:`, error);

                    // If deletion fails, try to make one more attempt after a delay
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    try {
                        console.log(`[terminatePlayMode] Making second attempt to delete playlist ${tempPlaylistId}`);
                        await deletePlaylist(tempPlaylistId);
                        console.log(`[terminatePlayMode] Second attempt successful`);
                    } catch (error2) {
                        console.error(`[terminatePlayMode] Second deletion attempt failed:`, error2);
                        // At this point we've tried our best, so just continue
                    }
                }
                // Update playlists state
                if (typeof setPlaylists === 'function') {
                    setPlaylists((prevPlaylists) => prevPlaylists.filter((pl) => pl.id !== tempPlaylistId));
                }
            }
        } else if (playlists) {
            // If no specific ID provided but we have playlists, find and delete all temporary playlists
            const tempPlaylists = playlists.filter(p => p?.name?.startsWith('Temp_Playlist_'));

            if (tempPlaylists.length > 0) {
                console.log(`[terminatePlayMode] Found ${tempPlaylists.length} temporary playlists to clean up`);

                for (const playlist of tempPlaylists) {
                    try {
                        await deletePlaylist(playlist.id);
                        console.log(`[terminatePlayMode] Deleted temporary playlist: ${playlist.id}`);
                    } catch (error) {
                        console.error(`[terminatePlayMode] Failed to delete temp playlist ${playlist.id}:`, error);
                    }
                }

                // Update playlists state once after deleting all
                if (typeof setPlaylists === 'function') {
                    setPlaylists((prevPlaylists) =>
                        prevPlaylists.filter(pl => !pl?.name?.startsWith('Temp_Playlist_'))
                    );
                }
            }
        }

        // Wait for operations to complete
        await new Promise(resolve => setTimeout(resolve, 300));

        console.log("[terminatePlayMode] PlayMode termination complete");
        return true;
    } catch (error) {
        console.error("[terminatePlayMode] Error:", error);

        // Make sure PlayMode flag is reset even on error
        if (playModeRef) playModeRef.current = false;

        return false;
    }
};

// Enhanced handlePlayMontageEnd with detailed logging, minimizing changes to shared functions
export const handlePlayMontageEnd = async (tempPlaylistId, {
    house,
    handlePlaylistChange,
    currentPlaylist,
    setPlaylists,
    playModeRef,
    onPlayEnd,
    playlists
}) => {
    const sessionId = Date.now(); // Unique ID for this session
    console.log(`[HPM:${sessionId}] STARTING - TempPlaylistID: ${tempPlaylistId}, CurrentPlaylist: ${currentPlaylist}`);

    // Log current playlists state before any operations
    if (playlists) {
        const tempPlaylists = playlists.filter(p => p?.name?.startsWith('Temp_Playlist_'));
        console.log(`[HPM:${sessionId}] Current playlists state - Total: ${playlists.length}, Temp playlists: ${tempPlaylists.length}`);
        console.log(`[HPM:${sessionId}] All temp playlists:`, tempPlaylists.map(p => ({ id: p.id, name: p.name })));
    }

    // First, terminate PlayMode and clean up resources
    console.log(`[HPM:${sessionId}] Calling terminatePlayMode for tempPlaylistId: ${tempPlaylistId}`);
    const terminateResult = await terminatePlayMode(tempPlaylistId, {
        house,
        setPlaylists,
        playModeRef,
        onPlayEnd,
        playlists
    });
    console.log(`[HPM:${sessionId}] terminatePlayMode completed with result: ${terminateResult}`);

    try {
        // Get the previous playlist ID with our own logging
        const previousPlaylistId = getPreviousPlaylistId();
        console.log(`[HPM:${sessionId}] Retrieved previousPlaylistId: ${previousPlaylistId}`);

        // If no previous playlist was saved, it means we were on default playlist
        // Load default playlist (undefined/empty)
        const playlistToLoad = previousPlaylistId || undefined;
        console.log(`[HPM:${sessionId}] Will load playlist: ${playlistToLoad} (${!previousPlaylistId ? 'DEFAULT' : 'SPECIFIC'})`);

        if (!previousPlaylistId) {
            console.log(`[HPM:${sessionId}] No previous playlist ID found - loading default playlist`);
        }

        // Verify if previous playlist exists and what type it is
        let previousPlaylistDetails = "default playlist";
        if (previousPlaylistId && playlists) {
            const prevPlaylist = playlists.find(p => p.id === previousPlaylistId);
            if (prevPlaylist) {
                previousPlaylistDetails = `name: "${prevPlaylist.name}", isTemp: ${prevPlaylist.name?.startsWith('Temp_Playlist_')}`;
                console.log(`[HPM:${sessionId}] Previous playlist details: ${previousPlaylistDetails}`);
            } else {
                console.warn(`[HPM:${sessionId}] Previous playlist ${previousPlaylistId} not found in current playlists!`);
            }
        }

        // Log the state before loading the previous playlist
        console.log(`[HPM:${sessionId}] BEFORE loadPlaylist - CurrentPlaylist: ${currentPlaylist}, About to load: ${playlistToLoad}`);

        // Load the previous playlist (or default if undefined)
        await loadPlaylist(house, playlistToLoad);
        console.log(`[HPM:${sessionId}] loadPlaylist API call completed for playlist: ${playlistToLoad}`);

        // Wait for backend confirmation with detailed logging
        console.log(`[HPM:${sessionId}] BEFORE handlePlaylistChange - Calling for playlist: ${playlistToLoad}`);
        const beforeHandleCurrentPlaylist = currentPlaylist;
        const syncSuccess = await handlePlaylistChange(playlistToLoad);
        console.log(`[HPM:${sessionId}] handlePlaylistChange completed with result: ${syncSuccess}, for playlist: ${playlistToLoad}`);

        // Check currentPlaylist immediately after sync
        if (syncSuccess) {
            const afterHandleCurrentPlaylist = currentPlaylist;
            const playlistChanged = beforeHandleCurrentPlaylist !== afterHandleCurrentPlaylist;
            const isCurrent = (playlistToLoad == afterHandleCurrentPlaylist);

            console.log(`[HPM:${sessionId}] AFTER handlePlaylistChange - Before: ${beforeHandleCurrentPlaylist}, After: ${afterHandleCurrentPlaylist}, Changed: ${playlistChanged}, Target: ${playlistToLoad}, IsCorrect: ${isCurrent}`);

            if (!isCurrent) {
                console.warn(`[HPM:${sessionId}] SYNC ISSUE: currentPlaylist (${afterHandleCurrentPlaylist}) differs from target (${playlistToLoad}) after sync`);
            }
        } else {
            console.warn(`[HPM:${sessionId}] Backend sync failed for playlist ${playlistToLoad}`);
        }

        // Clear the saved previous playlist ID with our own logging (if any was saved)
        if (previousPlaylistId) {
            console.log(`[HPM:${sessionId}] Clearing previousPlaylistId (${previousPlaylistId}) from localStorage`);
            clearPreviousPlaylistId();
        }
        console.log(`[HPM:${sessionId}] COMPLETED handlePlayMontageEnd function`);
    } catch (error) {
        console.error(`[HPM:${sessionId}] ERROR in handlePlayMontageEnd:`, error);
    }

    // Final state check
    console.log(`[HPM:${sessionId}] FINAL STATE - CurrentPlaylist: ${currentPlaylist}, PlayModeRef: ${playModeRef?.current}`);
};

export const CleanupTemporaryPlaylists = ({ currentPlaylist, setCurrentPlaylist, house, onCleanupComplete }) => {
    const { playlists } = usePlaylists();
    //TODO clean up only if older than 2hours in case disrupting play process of another guest?
    const cleanupAttemptedRef = useRef(false);
    const onCleanupCompleteRef = useRef(onCleanupComplete);

    // Keep refs updated
    onCleanupCompleteRef.current = onCleanupComplete;

    useEffect(() => {
        console.log('[PlaylistCleanup] useEffect triggered', {
            cleanupAttempted: cleanupAttemptedRef.current,
            hasPlaylists: !!playlists,
            playlistsLength: playlists?.length,
            hasHouse: !!house
        });

        // Skip if cleanup was already attempted
        if (cleanupAttemptedRef.current) {
            console.log('[PlaylistCleanup] Cleanup already attempted, skipping');
            return;
        }

        // Wait for playlists to load
        if (!playlists) {
            console.log('[PlaylistCleanup] Playlists not loaded yet, waiting...');
            return;
        }

        // If playlists array is empty, complete immediately (no cleanup needed)
        if (playlists.length === 0) {
            console.log('[PlaylistCleanup] No playlists available, completing immediately');
            onCleanupCompleteRef.current();
            cleanupAttemptedRef.current = true;
            return;
        }

        // Mark as attempted immediately to prevent multiple runs
        cleanupAttemptedRef.current = true;
        console.log(`[PlaylistCleanup] Starting cleanup with ${playlists.length} playlists loaded`);

        const cleanup = async () => {
            console.log('[PlaylistCleanup] Starting temporary playlist cleanup');

            // Find all temporary playlists
            const tempPlaylists = playlists.filter(p => p?.name?.startsWith('Temp_Playlist_'));

            if (tempPlaylists.length === 0) {
                console.log('[PlaylistCleanup] No temporary playlists found');
                // IMPORTANT: Always call onCleanupComplete even when no cleanup is needed
                onCleanupCompleteRef.current();
                return;
            }

            console.log(`[PlaylistCleanup] Found ${tempPlaylists.length} temporary playlists to clean up`);

            // Check if current playlist is temporary
            const currentPlaylistObj = playlists.find(p => p?.id === currentPlaylist);
            const isTemporary = currentPlaylistObj?.name?.startsWith('Temp_Playlist_');

            // CRITICAL FIX: If current playlist is temporary, switch away BEFORE deleting
            if (isTemporary && house) {
                console.log(`[PlaylistCleanup] CRITICAL: Current playlist ${currentPlaylist} is temporary!`);
                console.log(`[PlaylistCleanup] Must switch away from it BEFORE deleting to prevent black screen`);

                try {
                    const previousPlaylistId = getPreviousPlaylistId();
                    const playlistToLoad = previousPlaylistId || undefined; // undefined = default playlist
                    console.log(`[PlaylistCleanup] Step 1: Switching to previous/default playlist: ${playlistToLoad || 'DEFAULT'}`);

                    // Load the non-temp playlist FIRST
                    console.log(`[PlaylistCleanup] Calling loadPlaylist with house: ${house}, playlist: ${playlistToLoad}`);
                    const loadResult = await loadPlaylist(house, playlistToLoad);
                    console.log('[PlaylistCleanup] loadPlaylist returned:', loadResult);

                    // CRITICAL: Update React state
                    // This will trigger DontStartBefore to re-render and handle the sync
                    if (setCurrentPlaylist) {
                        console.log(`[PlaylistCleanup] Updating React state: currentPlaylist → ${playlistToLoad || 'undefined'}`);
                        setCurrentPlaylist(playlistToLoad);
                    }

                    console.log('[PlaylistCleanup] Step 1 COMPLETE: Switched away from temp playlist');
                    console.log('[PlaylistCleanup] DontStartBefore will now re-render and sync frontend/backend');

                    // Wait a bit for the loadPlaylist API call and state updates to propagate
                    // DontStartBefore's natural sync process will ensure frontend/backend alignment
                    console.log('[PlaylistCleanup] Waiting 1000ms for state propagation...');
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    console.log('[PlaylistCleanup] Wait complete');

                    // Clear localStorage if we had a saved ID
                    if (previousPlaylistId) {
                        clearPreviousPlaylistId();
                        console.log('[PlaylistCleanup] Cleared previousPlaylistId from localStorage');
                    }
                } catch (error) {
                    console.error('[PlaylistCleanup] Error switching away from temp playlist:', error);
                    console.error('[PlaylistCleanup] Error stack:', error.stack);
                    // Continue anyway - try to clean up even if switch failed
                }
            }

            // NOW delete all temporary playlists (after switching away)
            console.log(`[PlaylistCleanup] Step 2: Deleting ${tempPlaylists.length} temp playlists`);
            for (const playlist of tempPlaylists) {
                try {
                    console.log(`[PlaylistCleanup] Deleting temp playlist: ${playlist.id} (${playlist.name})`);
                    await deletePlaylist(playlist.id);
                    console.log(`[PlaylistCleanup] Successfully deleted: ${playlist.id}`);
                } catch (error) {
                    console.error(`[PlaylistCleanup] Failed to delete playlist ${playlist.id}:`, error);
                }
            }

            console.log('[PlaylistCleanup] Step 2 COMPLETE: All temp playlists deleted');
            console.log('[PlaylistCleanup] Temporary playlist cleanup FINISHED');
            onCleanupCompleteRef.current();
        };

        cleanup();
    }, [playlists]); // Only depend on playlists - other values captured from props/refs

    // This component doesn't render anything
    return null;
};

// Save previous playlist ID to localStorage
export const savePreviousPlaylistId = (playlistId) => {
    if (playlistId) {
        localStorage.setItem('previousPlaylistId', playlistId);
        console.log(`[localStorage] Saved previous playlist ID: ${playlistId}`);
    }
};

// Get previous playlist ID from localStorage
export const getPreviousPlaylistId = () => {
    const playlistId = localStorage.getItem('previousPlaylistId');
    console.log(`[localStorage] Retrieved previous playlist ID: ${playlistId}`);
    return playlistId;
};

// Clear previous playlist ID from localStorage
export const clearPreviousPlaylistId = () => {
    localStorage.removeItem('previousPlaylistId');
    console.log('[localStorage] Cleared previous playlist ID');
};