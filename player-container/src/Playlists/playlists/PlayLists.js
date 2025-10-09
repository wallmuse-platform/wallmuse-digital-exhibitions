/**
* Playlists Container Component
* ---------------------------
* Root component managing all playlists and their interactions.
* Handles playlist CRUD operations and playlist-montage relationships.
* 
* Key Features:
* - Manages playlist state and operations
* - Handles temporary playlists for single montage playback
* - Provides drag and drop montage reordering within playlists
* - Manages playlist saving, updating, and deletion
* - Handles user permissions and guest access
* 
* State Management:
* - Uses PlaylistsContext for global playlist state
* - Manages async operations (add, save, delete, load)
* - Handles operation feedback through loading states and snackbars
* - Cleans up temporary playlists automatically
* 
* @component
* @param {Object} props
* @param {string} props.currentTheme - Theme identifier
* @param {string} props.house - House identifier
* @param {string} props.currentPlaylist - Active playlist ID
* @param {Function} props.setCurrentPlaylist - Playlist setter
* @param {Function} props.handlePlaylistChange - Change handler
* 
* Key Functions:
* - handlePlaylistUpdate: Updates playlist metadata and content
* - handleMontageReorder: Manages drag and drop reordering
* - moveMontageToPlaylist: Transfers montages between playlists
* - removeMontageFromPlaylist: Deletes montages from playlists
* 
* Performance Considerations:
* - Uses memoization for filtered playlists
* - Optimizes montage operations with batch updates
* - Manages side effects for playlist synchronization
* 
* Error Handling:
* - Provides user feedback through Snackbar notifications
* - Handles guest user restrictions
* - Manages async operation errors
* 
* Usage Example:
* <Playlists
*   currentTheme={theme}
*   house={house}
*   currentPlaylist={currentPlaylist}
*   setCurrentPlaylist={setCurrentPlaylist}
* />
*/

// React and Hooks
import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

// Material UI Components and Icons
import { Button, ThemeProvider, Tooltip } from "@mui/material";
import { PlaylistAdd } from "@mui/icons-material";

// Contexts
import { useSession } from '../../contexts/SessionContext';

import { usePlaylists } from '../../contexts/PlaylistsContext'; // Context for managing playlists
import { cleanupTempPlaylists } from '../../utils/tempPlaylistsUtils.js';
import { usePlaylist } from '../contexts/PlaylistContext'; // Context for individual playlist operations

// Utilities and API calls
import { selectTheme } from "../../theme/ThemeUtils";
import { CustomSnackbar, CustomAlert } from '../../CustomComponents';
import {
    addPlaylist,
    deleteMontageFromPlaylist,
    loadPlaylist,
    updatePlaylist,
    detailsUser,
    deletePlaylist,
    refeshBackendCurrentPlaylist
} from "../../utils/api";
import { autoSaveUpdates } from '../utils/playlistHelpers';

// Components
import Playlist from "../playlist/PlayList";
import handleSendCommand from "../../App"
import { terminatePlayMode } from '../../Play/playModeUtils';
import { useEnvironments } from "../../contexts/EnvironmentsContext";

// Internationalization
import { useTranslation } from "react-i18next";

// Accounts
import useGuestActionPopup from "../../accounts/useGuestActionPopup";
import { getUserId } from '../../utils/Utils';

// Styles
// import "../../App.css"; 

function Playlists({ currentTheme, house, currentPlaylist, setCurrentPlaylist, playlists,
    setPlaylists, isDemo, playModeRef, onPlayEnd, onMontageNavigation,
    selectedPlaylistPosition }) {

    const { t } = useTranslation();
    const { handlePlaylistChange, syncLoading, setSyncLoading } = useEnvironments(); // Only get what you need

    useEffect(() => {
        if (playlists.length > 1) {
            console.log('[Playlists] useEffect Cleaning up temporary playlists...');
            cleanupTempPlaylists(playlists, setPlaylists);
        }
    }, []); // Run only on mount

    const hideTempPlaylist = true; // Set to true to hide temporary playlists

    console.log('[Playlists] Playlists started, isDemo', isDemo);

    const theme = selectTheme();
    const { saveInProgress, setSaveInProgress, deleteInProgress, setDeleteInProgress } = usePlaylist();

    const [addInProgress, setAddInProgress] = useState(false);
    const [addSuccess, setAddSuccess] = useState(false);
    const [addError, setAddError] = useState(null);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [saveError, setSaveError] = useState(null);
    const [deleteSuccess, setDeleteSuccess] = useState(false);
    const [deleteError, setDeleteError] = useState(null);

    const [loadInProgress, setLoadInProgress] = useState(false);
    const [loadSuccess, setLoadSuccess] = useState(false);
    const [loadError, setLoadError] = useState(null);
    const [restrictedActionError, setRestrictedActionError] = useState(null);
    const [showSnackbar, setShowSnackbar] = useState(false);

    // 🚀 NEW: Guard against multiple simultaneous doLoadPlaylist calls
    const loadInProgressRef = useRef(false);

    const { handleAction, popup } = useGuestActionPopup();

    const updateSaveStatus = useCallback((saveSuccess, saveError, savedPlaylistIndex) => {
        setSaveSuccess(saveSuccess);
        setSaveError(saveError);

        if (saveSuccess && savedPlaylistIndex !== undefined) {
            setPlaylists(prevPlaylists => {
                const newPlaylists = [...prevPlaylists];
                // Only update the changed flag, preserving all other properties
                newPlaylists[savedPlaylistIndex] = {
                    ...newPlaylists[savedPlaylistIndex],
                    changed: false
                };
                return newPlaylists;
            });
        }
    }, [setSaveSuccess, setSaveError]);

    const updateDeleteStatus = useCallback((deleteSuccess, deleteError, deletedPlaylistIndex) => {
        // Use handleAction to handle guest account check if needed
        handleAction(
            () => {
                // Check if deleteError exists and is an Error object
                if (deleteError) {
                    if (deleteError instanceof Error && !deleteError.code) {
                        // Create a formatted error message
                        setDeleteError(`${deleteError.message || 'An error occurred'}. Please try again later`);
                    } else {
                        // Handle normal error object with code
                        setDeleteError(deleteError);
                    }
                } else {
                    // Handle case where deleteError is undefined
                    setDeleteError(null);
                }

                setDeleteSuccess(deleteSuccess);

                if (deleteSuccess && deletedPlaylistIndex !== null) {
                    setPlaylists(prevPlaylists => {
                        const newPlaylists = [...prevPlaylists];
                        newPlaylists.splice(deletedPlaylistIndex, 1);
                        return newPlaylists;
                    });
                }
            },
            false // Not premium content
        );
    }, [setPlaylists, setDeleteSuccess, setDeleteError, handleAction]);


    //TODO FRED SERVER AFFECTS CREATE M TOO/ WS: in the mean time patch that works 
    const handlePlaylistUpdate = useCallback((playlistIndex, name) => {
        handleAction(
            () => {
                console.log('[Playlists Fred] playlistIndex:', playlistIndex, ' name:', name);
                const newPlaylists = [...playlists];
                if (name) {
                    newPlaylists[playlistIndex].name = name;
                    console.log('[Playlists Fred] playlistIndex:', playlistIndex, ' newPlaylists:', newPlaylists);
                }
                newPlaylists[playlistIndex].changed = false;

                console.log('[PlayLists] About to call autoSaveUpdates:', {
                    playlistIndex,
                    playlist: newPlaylists[playlistIndex],
                    montageIds: newPlaylists[playlistIndex].montages.map(m => m.id)
                });

                setPlaylists(newPlaylists);
            },
            false // Not related to premium content
        );
    }, [playlists, setPlaylists, handleAction]);

    // TODO server not passing to WebPlayer TS, so can't handle  
    //   const handleMontageChecked = useCallback((montageIndex, playlistIndex) => {
    //     const newPlaylists = [...playlists];
    //     const currentState = newPlaylists[playlistIndex].montages[montageIndex].is_checked === "1";
    //     newPlaylists[playlistIndex].montages[montageIndex].is_checked = currentState ? "0" : "1";
    //     newPlaylists[playlistIndex].changed = true;

    //     console.log('[PlayLists handleMontageClick] After toggle, updated montage:', newPlaylists[playlistIndex].montages[montageIndex]);
    //     console.log('[PlayLists handleMontageClick] Updated playlists before setting state:', newPlaylists);

    //     // Use a callback to ensure state is updated before proceeding
    //     setPlaylists(newPlaylists);
    //     console.log('[PlayLists handleMontageClick after setPlaylist] Updated playlists before setting state:', newPlaylists);

    //     console.log('[PlayLists handleMontageClick after setPlaylist] Sending montage:', newPlaylists[playlistIndex].montages[montageIndex]);

    //     autoSaveUpdates({
    //         playlistIndex,
    //         playlist: newPlaylists[playlistIndex],
    //         updatePlaylist,
    //         setSaveInProgress,
    //         updateSaveStatus,
    //         handlePlaylistUpdate,
    //         t
    //     });
    // }, [playlists, updatePlaylist, setSaveInProgress, updateSaveStatus, handlePlaylistUpdate, t]);

    const handleMontageClick = useCallback((montageIndex, playlistIndex) => {
        handleAction(
            () => {
                const newPlaylists = [...playlists];
                const currentState = newPlaylists[playlistIndex].montages[montageIndex].is_checked === "1";
                newPlaylists[playlistIndex].montages[montageIndex].is_checked = currentState ? "0" : "1";
                newPlaylists[playlistIndex].changed = true;

                if (playlists.id === currentPlaylist) {
                    console.log('[PlayLists handleMontageClick currentPlaylist] Montage changed in current playlist:', playlists.id);
                    // No need to call setCurrentPlaylist here!
                } else {
                    console.log('[PlayLists handleMontageClick currentPlaylist] Montage changed in non-current playlist:', playlists.id);
                }

                console.log('[PlayLists handleMontageClick] After toggle, updated montage:', newPlaylists[playlistIndex].montages[montageIndex]);
                console.log('[PlayLists handleMontageClick] Updated playlists before setting state:', newPlaylists);

                // Use a callback to ensure state is updated before proceeding
                setPlaylists(newPlaylists);
                console.log('[PlayLists handleMontageClick after setPlaylist] Updated playlists before setting state:', newPlaylists);

                console.log('[PlayLists handleMontageClick after setPlaylist] Sending montage:', newPlaylists[playlistIndex].montages[montageIndex]);

                autoSaveUpdates({
                    playlistIndex,
                    playlist: newPlaylists[playlistIndex],
                    updatePlaylist,
                    setSaveInProgress,
                    updateSaveStatus,
                    handlePlaylistUpdate,
                    t,
                    currentPlaylistId: currentPlaylist,
                    syncWithBackend: handlePlaylistChange
                });
            },
            false // Not premium content
        );
    }, [playlists, updatePlaylist, setSaveInProgress, updateSaveStatus, handlePlaylistUpdate, t, setPlaylists, handleAction]);

    const handleMontageReorder = useCallback((montages, playlistIndex) => {
        // Replace the isDemo check with handleAction
        handleAction(() => {
            console.log('[PlayLists] Starting montage reorder:', {
                playlistIndex,
                montagesCount: montages.length,
                currentPlaylistsState: playlists
            });

            // First update the UI
            setPlaylists(prevPlaylists => {
                const newPlaylists = prevPlaylists.map((playlist, index) =>
                    index === playlistIndex
                        ? { ...playlist, montages, changed: true }
                        : playlist
                );
                console.log('[handleMontageReorder] Updated playlists state:', {
                    playlistIndex,
                    newMontages: newPlaylists[playlistIndex].montages.map(m => m.id)
                });
                return newPlaylists;
            });

            // Then handle the save separately
            const updatedPlaylist = {
                ...playlists[playlistIndex],
                montages,
                changed: true
            };

            // Save without triggering another state update
            autoSaveUpdates({
                playlistIndex,
                playlist: updatedPlaylist,
                updatePlaylist,
                setSaveInProgress,
                updateSaveStatus,
                handlePlaylistUpdate,
                t,
                skipStateUpdate: true, // or false, as needed for your logic
                currentPlaylistId: currentPlaylist,
                syncWithBackend: handlePlaylistChange
            });
        },
            false); // Set isPremiumContent to false
    }, [playlists, setPlaylists, autoSaveUpdates, updatePlaylist, setSaveInProgress, updateSaveStatus, handlePlaylistUpdate, t, handleAction]);

    const removeMontageFromPlaylist = useCallback(async (montageIndex, playlistIndex) => {
        console.log('[Playlists] removeMontageFromPlaylist: montageIndex:', montageIndex, ' playlistIndex:', playlistIndex);

        if (isDemo) {
            handleRestrictedAction();  // Show snackbar for restricted action
            return;  // Exit the function early
        }
        const playlist = playlists[playlistIndex];
        console.log('[Playlists] playlist = playlists[playlistIndex]:', playlist);
        if (!playlist || !playlist.montages || !playlist.montages[montageIndex]) {
            console.error(`[PlayLists] Invalid playlist or montage index: ${playlistIndex}, ${montageIndex}`);
            return;
        }

        const montageIdToRemove = playlist.montages[montageIndex].id;
        console.log('[PlayLists] Removing montage with ID:', montageIdToRemove, 'from playlist:', playlist.id);

        try {
            setDeleteInProgress(true);
            await deleteMontageFromPlaylist(playlist.id, montageIdToRemove);
            setDeleteInProgress(false);

            console.log('[PlayLists] Montage removal successful:', montageIdToRemove);

            // Update local state to reflect this change
            const updatedPlaylists = [...playlists];
            updatedPlaylists[playlistIndex].montages.splice(montageIndex, 1);
            updatedPlaylists[playlistIndex].changed = true;

            console.log('[PlayLists] Updated playlist after montage removal:', updatedPlaylists[playlistIndex]);

            setPlaylists(updatedPlaylists);
            // Optionally, call autoSaveUpdates if needed
            autoSaveUpdates({
                playlistIndex,
                playlist: updatedPlaylists[playlistIndex],
                updatePlaylist,
                setSaveInProgress,
                updateSaveStatus,
                handlePlaylistUpdate,
                t,
                currentPlaylistId: currentPlaylist,
                syncWithBackend: handlePlaylistChange
            });
        } catch (error) {
            console.error('[PlayLists] Failed to delete montage from playlist:', error);
            setDeleteInProgress(false);
        }
    }, [setPlaylists, deleteMontageFromPlaylist, setDeleteInProgress, autoSaveUpdates, updatePlaylist, setSaveInProgress, updateSaveStatus, t, isDemo]);

    const handleRestrictedAction = (reason) => {
        if (reason === 'guest') {
            // Don't show snackbar for guest users - we'll use the popup instead
            return false;
        } else {
            // Show snackbar for other restriction reasons (e.g., premium content)
            setRestrictedActionError(t("error.restricted_action"));
            setShowSnackbar(true);
            return true;
        }
    };
    // moveMontageToPlaylist here copies from default to an other playlist
    const moveMontageToPlaylist = useCallback((montage, playlistId) => {
        if (isDemo) {
            handleRestrictedAction();  // This function should already set showSnackbar
            return;  // Exit the function early
        }
        const playlistToUpdateIndex = playlists.findIndex(playlist => playlist.id === playlistId);
        if (playlistToUpdateIndex === -1) {
            console.error('[PlayLists] Playlist not found:', playlistId);
            setAddError(t("error.playlist_not_found"));
            setShowSnackbar(true); // Show error message
            return;
        }
        const playlistToUpdate = playlists[playlistToUpdateIndex];

        console.log('[Playlists] moveMontageToPlaylist call autoSaveUpdates', montage, playlistId);

        const newPlaylists = [...playlists];
        if (!playlistToUpdate.montages) {
            playlistToUpdate.montages = [];
        }

        playlistToUpdate.montages.push(montage);
        playlistToUpdate.changed = true;
        newPlaylists[playlistToUpdateIndex] = playlistToUpdate;

        setPlaylists(newPlaylists);

        autoSaveUpdates({
            playlistIndex: playlistToUpdateIndex,
            playlist: playlistToUpdate,
            updatePlaylist: updatePlaylist,
            setSaveInProgress: setSaveInProgress,
            updateSaveStatus: updateSaveStatus,
            handlePlaylistUpdate: handlePlaylistUpdate,
            t: t,
            currentPlaylistId: currentPlaylist,
            syncWithBackend: handlePlaylistChange
        }).catch(error => {
            console.error("[PlayLists] Failed to add montage to playlist:", error);
            setSaveError(`${t("error.add_montage")}: ${error.message}`);
            setShowSnackbar(true); // Show error message
        });
    }, [playlists, setPlaylists, updatePlaylist, setSaveInProgress, updateSaveStatus, handlePlaylistUpdate, t, handleRestrictedAction, isDemo]);

    const handleCloseAsyncOpFeedback = useCallback(() => {
        setShowSnackbar(false);
        setSaveError(null);
        setSaveSuccess(false);
        setDeleteError(null);
        setDeleteSuccess(false);
        setRestrictedActionError(null);  // Reset restricted action error
    }, []);

    const asyncFeedbackReceivedMsg = useCallback(() => {
        if (restrictedActionError) return restrictedActionError; // Message for restricted actions
        else if (addError) return addError; // Message for add error
        else if (saveError) return saveError; // Message for save error
        else if (deleteError) return deleteError; // Message for delete error
        else if (loadError) return loadError; // Message for load error
        else if (addSuccess) return t("success.playlist.added"); // Message for add success
        else if (saveSuccess) return t("success.save"); // Message for save success
        else if (deleteSuccess) return t("success.delete"); // Message for delete success
        else if (loadSuccess) return t("success.load"); // Message for load success
        return ""; // Ensure a default return
    }, [restrictedActionError, addError, saveError, deleteError, loadError, addSuccess, saveSuccess, deleteSuccess, loadSuccess, t]);

    const memoizedPlaylists = useMemo(() => {
        console.log('[PlayLists: Hide] Original playlists:', playlists);

        // Filter playlists
        const filteredPlaylists = playlists.filter(playlist => {
            if (hideTempPlaylist && playlist.name?.startsWith('Temp_Playlist_')) {
                return false;
            }
            return true;
        });

        // Transform playlists and their montages
        return filteredPlaylists.map(playlist => ({
            ...playlist,
            montages: playlist.montages?.map((montage, index) => ({
                ...montage,
                originalIndex: index + 1
            }))
        }));
    }, [playlists, hideTempPlaylist]); // Removed setPlaylists from dependencies

    const add = async () => {
        // Use handleAction to handle guest account check
        // Check current user status at time of execution
        const currentUserId = getUserId();
        console.log('[Playlists] add - Current userId at execution time:', currentUserId);
        handleAction(
            async () => {
                // This function runs after account creation if needed
                setAddInProgress(true);
                setAddSuccess(false);
                setAddError(null);

                try {
                    const response = await addPlaylist(t("component.playlists.default-name"));
                    setAddInProgress(false);

                    if (response.status >= 400) {
                        setAddSuccess(false);
                        setAddError(`${t("error")}: ${response.statusText}`);
                        setShowSnackbar(true);
                    } else {
                        const result = response.data;

                        if (result.code && result.message) {
                            setAddSuccess(false);
                            setAddError(`${t("error")}: ${result.code}: ${result.message}`);
                            setShowSnackbar(true);
                        } else {
                            const newPlaylist = result;
                            newPlaylist.montages = [];
                            newPlaylist.changed = false;

                            // Use an intermediate variable for readability
                            const newPlaylists = [newPlaylist, ...playlists];
                            setPlaylists(newPlaylists);
                            setAddSuccess(true);
                            setShowSnackbar(true);
                        }
                    }
                } catch (error) {
                    setAddInProgress(false);
                    setAddSuccess(false);
                    setAddError(`${t("error")}: ${error.message}. ${t("error.generic")}`);
                    setShowSnackbar(true);
                }
            },
            false // Not related to premium content
        );
    };

    const doLoadPlaylist = async (selectedPlaylistId, selectedPlaylistPosition = null) => {
        console.log(`[doLoadPlaylist] Start for playlistId: ${selectedPlaylistId} position: ${selectedPlaylistPosition}`);

        if (loadInProgressRef.current) {
            console.log(`[doLoadPlaylist] Skipping - load already in progress`);
            return false;
        }

        loadInProgressRef.current = true;
        setLoadInProgress(true);
        setLoadError(null);

        try {
            // If in PlayMode, terminate it first
            if (playModeRef && playModeRef.current === true) {
                console.log("[doLoadPlaylist] Detected active PlayMode, terminating it");
                await terminatePlayMode(null, {
                    house,
                    setPlaylists,
                    playModeRef,
                    onPlayEnd,
                    playlists
                });
            }

            // 1. Send the command
            const response = await loadPlaylist(house, selectedPlaylistId);

            if (response.status >= 400) {
                setLoadError(`Error: ${response.statusText}`);
                return false;
            }

            // 2. Smart polling with exponential backoff
            const pollForPlaylistChange = async () => {
                const maxAttempts = 8;
                const baseDelay = 250; // Start with 250ms

                for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                    try {
                        // Check current backend state
                        const currentBackendPlaylist = await refeshBackendCurrentPlaylist();

                        console.log(`[Poll ${attempt}/${maxAttempts}] Backend: ${currentBackendPlaylist}, Expected: ${selectedPlaylistId}`);

                        if (currentBackendPlaylist === selectedPlaylistId) {
                            // Success! Update state
                            setCurrentPlaylist(selectedPlaylistId);

                            // Trigger navigation
                            if (onMontageNavigation) {
                                onMontageNavigation(selectedPlaylistId, selectedPlaylistPosition);
                            }

                            return true;
                        }

                        // Exponential backoff: 250ms, 500ms, 1s, 2s, 4s, 8s, 16s, 32s
                        const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), 5000); // Cap at 5s
                        await new Promise(resolve => setTimeout(resolve, delay));

                    } catch (error) {
                        console.error(`[Poll ${attempt}] Error:`, error);
                        // Continue polling on errors (network issues, etc.)
                    }
                }

                // Polling timeout - accept failure gracefully
                console.warn(`[doLoadPlaylist] Polling timeout after ${maxAttempts} attempts`);
                return false;
            };

            const success = await pollForPlaylistChange();

            if (!success) {
                // Fallback: Update frontend optimistically
                console.log(`[doLoadPlaylist] Fallback: Updating frontend optimistically`);
                setCurrentPlaylist(selectedPlaylistId);

                // Trigger navigation even on fallback
                if (onMontageNavigation) {
                    onMontageNavigation(selectedPlaylistId, selectedPlaylistPosition);
                }
            }

            setLoadSuccess(true);
            setShowSnackbar(true);
            return success;

        } catch (error) {
            console.error(`[doLoadPlaylist] Error:`, error);
            setLoadError(`Error: ${error.message}`);
            return false;
        } finally {
            setLoadInProgress(false);
            loadInProgressRef.current = false;
        }
    };

    console.log('[PlayLists] playlistsgt...', playlists);
    return (

        <ThemeProvider theme={theme} className="playlists">
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%'
            }}>
                {/* Header Section with Centered Title and Right-aligned Button */}
                <div style={{
                    position: 'relative',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: '0 1rem',
                    marginBottom: '1rem'
                }}>
                    <h2 style={{
                        textTransform: 'uppercase',
                        margin: '2em',
                        textAlign: 'center'
                    }}>
                        {t("show_playlists_")}
                    </h2>

                    <div style={{
                        position: 'absolute',
                        right: '1rem',
                        top: '50%',
                        transform: 'translateY(-50%)'
                    }}>
                        <Tooltip title={t("action.add.tip")}>
                            <Button
                                disabled={addInProgress}
                                variant="contained"
                                className="tabs_text"
                                onClick={() => { add() }}
                                sx={{ marginBottom: 0 }}
                            >
                                {`${t("action.add")}`}
                                <PlaylistAdd sx={{ marginLeft: 1 }} className="tabs_icon" />
                            </Button>
                        </Tooltip>
                    </div>
                </div>
                {/* Render playlists*/}
                {(syncLoading || addInProgress || loadInProgress) && <div className="loading-spinner">Loading...</div>}

                {memoizedPlaylists.map((playlist, index) => (
                    <Playlist
                        key={playlist.id || index}
                        playlist={playlist}
                        playlistIndex={index}
                        handleMontageClick={handleMontageClick}
                        handleMontageReorder={handleMontageReorder}
                        moveMontageToPlaylist={moveMontageToPlaylist}
                        removeMontageFromPlaylist={removeMontageFromPlaylist}
                        updateSaveStatus={updateSaveStatus}
                        handlePlaylistUpdate={handlePlaylistUpdate}
                        updateDeleteStatus={updateDeleteStatus}
                        playlists={playlists}
                        setPlaylists={setPlaylists}
                        currentPlaylist={currentPlaylist}
                        handlePlaylistChange={handlePlaylistChange}
                        doLoadPlaylist={doLoadPlaylist}
                        isDemo={isDemo}
                        handleAction={handleAction}
                        onMontageNavigation={onMontageNavigation}
                        selectedPlaylistPosition={selectedPlaylistPosition}
                    />
                ))}
                {/* Snackbar for feedback messages */}
                <CustomSnackbar
                    open={restrictedActionError || addError || addSuccess || saveError || deleteError || loadError || saveSuccess || deleteSuccess || loadSuccess}
                    autoHideDuration={6000}
                    anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                    onClose={handleCloseAsyncOpFeedback}
                >
                    <CustomAlert
                        severity={
                            restrictedActionError || addError || saveError || deleteError || loadError
                                ? "error"
                                : "success"
                        }
                        onClose={handleCloseAsyncOpFeedback}
                    >
                        {asyncFeedbackReceivedMsg()}
                    </CustomAlert>
                </CustomSnackbar>
                {popup}
            </div>
        </ThemeProvider>
    );
}



Playlists.propTypes = {
  currentTheme: PropTypes.string,
  house: PropTypes.string, // optional if context fallback
  currentPlaylist: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  setCurrentPlaylist: PropTypes.func,
  playlists: PropTypes.array.isRequired,
  setPlaylists: PropTypes.func.isRequired,
  isDemo: PropTypes.bool,
  playModeRef: PropTypes.object,
  onPlayEnd: PropTypes.func,
  onMontageNavigation: PropTypes.func,
  selectedPlaylistPosition: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

export default React.memo(Playlists, (prevProps, nextProps) => {
  return (
    prevProps.currentPlaylist === nextProps.currentPlaylist &&
    prevProps.selectedPlaylistPosition === nextProps.selectedPlaylistPosition &&
    prevProps.isDemo === nextProps.isDemo &&
    prevProps.playlists.length === nextProps.playlists.length &&
    prevProps.playlists.every((playlist, index) => 
      playlist.id === nextProps.playlists[index]?.id &&
      playlist.name === nextProps.playlists[index]?.name &&
      playlist.montages?.length === nextProps.playlists[index]?.montages?.length
    )
  );
});