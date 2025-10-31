/**
 * Playlist Component
 * ----------------
 * A container component that manages a list of draggable montages.
 * Implements drag and drop reordering using dnd-kit.
 * 
 * Features:
 * - Vertical drag and drop reordering of montages
 * - Handles montage selection and deletion
 * - Manages playlist state updates
 * - Integrates with WebPlayer for playlist playback
 * 
 * Technical Implementation:
 * - Uses SortableContext with verticalListSortingStrategy
 * - Handles drag end events with optimized state updates
 * - Maintains playlist synchronization with backend
 * - Manages temporary playlists for single montage playback
 * 
 * @component
 * @param {Object} props
 * @param {string} props.house - House identifier
 * @param {Object} props.playlist - Current playlist data
 * @param {number} props.playlistIndex - Index in playlists array
 * @param {Function} props.handleMontageClick - Selection handler
 * @param {Function} props.handleMontageReorder - Reorder handler
 * @param {Function} props.moveMontageToPlaylist - Playlist transfer handler
 * @param {Function} props.removeMontageFromPlaylist - Delete handler
 * @param {Function} props.updateSaveStatus - Save status callback
 * @param {Function} props.handlePlaylistUpdate - Update handler
 * @param {Function} props.updateDeleteStatus - Delete status callback
 * @param {Array} props.playlists - All available playlists
 * @param {string} props.currentPlaylist - Currently playing playlist ID
 * @param {Function} props.handlePlaylistChange - Playlist change handler
 * @param {Function} props.doLoadPlaylist - Playlist loading handler
 * 
 * Performance Notes:
 * - Multiple re-renders during drag operations are expected
 * - Uses React.memo for child components to optimize updates
 * - Batch updates playlist state after drag completion
 * 
 * Usage Example:
 * <Playlist
 *   house={house}
 *   playlist={playlist}
 *   playlistIndex={index}
 *   handleMontageReorder={handleReorder}
 *   // ... other props
 * />
 */

// React and Hooks
import React, { memo, useMemo, useState, useRef, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';

// Material UI Components and Icons
import {
    Accordion, AccordionSummary, AccordionDetails, Stack, Tooltip,
    Typography
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { PlaylistPlay, Edit } from "@mui/icons-material";

// Custom Components
import PlayListItem from "../playlist-item/PlayListItem";
import EditPlaylistDialog from "./EditPlaylistDialog";
import { DeleteDialog } from "./DeleteDialog";

// Drag and Drop
import {
    DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors,
    closestCenter
} from '@dnd-kit/core';
import {
    arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy
} from '@dnd-kit/sortable';

// Utility Functions and Contexts
import { handleSendCommand } from '../../App'
import { useUIContext } from '../contexts/UIContext';
import { useTranslation } from 'react-i18next';
import { currentTheme, selectTheme } from '../../theme/ThemeUtils';
import { deletePlaylist, updatePlaylist, loadPlaylist } from '../../utils/api';
import { useResponsive } from '../../utils/useResponsive';
import { useEnvironments } from '../../contexts/EnvironmentsContext.js';
import { savePreviousPlaylistId } from '../../Play/playModeUtils';

// Style Utils
import { styled } from '@mui/material/styles';
import { usePlaylistSync } from '../utils/playlistSyncUtils';

function Playlist({
    playlist,
    playlistIndex,
    handleMontageClick,
    handleMontageReorder,
    moveMontageToPlaylist,
    removeMontageFromPlaylist,
    updateSaveStatus,
    handlePlaylistUpdate,
    updateDeleteStatus,
    playlists,
    setPlaylists,
    currentPlaylist,
    handlePlaylistChange,
    doLoadPlaylist,
    isDemo,
    handleAction,
    onMontageNavigation,
    selectedMontagePosition
}) {
    const montageIds = useMemo(() =>
        playlist.montages?.map((montage) => String(montage.originalIndex)),
        [playlist.montages]
    );
    const { t } = useTranslation();
    const theme = selectTheme();
    const responsiveProps = useResponsive();
    const { isMobile, isTablet, isHD, isUHD, isSmartTVHD, isSmartTVUHD } = responsiveProps;
    // console.log('[App] isMobile', isMobile);
    const MIN_PLAYER_WIDTH = 320;
    const [isHovered, setIsHovered] = useState(false);

    // Get all necessary context data for playlist change
    const [readyToPlayPlaylist, setReadyToPlayPlaylist] = useState(false);
    const { house, backendCurrentPlaylist, playlistLoading, syncComplete, error } = useEnvironments();

    const { expandedAccordions, toggleAccordion } = useUIContext();
    // Function to toggle accordion expansion
    const handleAccordionToggle = () => {
        toggleAccordion(playlist.id);
    };

    let isCurrent = (currentPlaylist == playlist.id);
    // console.log('[PlayList] Checking isCurrent:', playlist?.id, currentPlaylist, isCurrent);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
                delay: 100,
                tolerance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = useCallback((event) => {
        const { active, over } = event;
        const ensureStringId = (id) => String(id);

        if (!over) {
            console.log('[PlayList] No over target found');
            return false;
        }

        if (active.id !== over.id) {
            const getOriginalId = (combinedId) => String(combinedId).split('-')[0];
            const activeId = getOriginalId(active.id);
            const overId = getOriginalId(over.id);

            console.log('[PlayList] DragEnd Event:', {
                activeFullId: active.id,
                overFullId: over.id,
                activeId,
                overId,
                playlistIndex,
                playlistMontageIds: playlist?.montages?.map(m => String(m.id))
            });

            // Validate playlist exists
            if (!playlist?.montages) {
                console.error('[PlayList] Invalid playlist or montages array');
                return;
            }

            // Find indices using the extracted original IDs
            const oldIndex = playlist.montages.findIndex(
                (item) => String(item.id) === activeId
            );
            const newIndex = playlist.montages.findIndex(
                (item) => String(item.id) === overId
            );

            console.log('[PlayList] Index search:', {
                activeId,
                overId,
                oldIndex,
                newIndex,
                montageIds: playlist.montages.map((m, i) => ({ index: i, id: String(m.id), matches: String(m.id) === activeId || String(m.id) === overId }))
            });

            // console.log('[PlayList] Found indices:', { oldIndex, newIndex });

            if (oldIndex === -1 || newIndex === -1) {
                console.error('[PlayList] Could not find indices for montages:', {
                    activeId,
                    overId,
                    montages: playlist.montages.map(m => m.id)
                });
                return;
            }

            // Use arrayMove helper with playlist prop
            const newMontages = arrayMove(
                [...playlist.montages],
                oldIndex,
                newIndex
            );

            // console.log('[PlayList] Reordering montages:', {
            //     before: playlist.montages.map(m => m.id),
            //     after: newMontages.map(m => m.id)
            // });

            // Update the playlist with new montage order
            handleMontageReorder(newMontages, playlistIndex);
        }
    }, [playlist, playlistIndex, handleMontageReorder]);


    const currentPlaylistStyle = {
        cursor: "pointer"
    }
    const notCurrentPlaylistStyle = {
        cursor: "auto"
    }
    const isDefaultPlaylist = () => playlist.id === undefined;

    const [saveInProgress, setSaveInProgress] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);

    const [deleteInProgress, setDeleteInProgress] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    const updateInProgress = () => saveInProgress || deleteInProgress;

    const openEditDialog = (event) => {
        if (updateInProgress())
            return false;

        if (event) {
            event.stopPropagation();
        }
        setEditDialogOpen(true);
    };
    const openDeleteDialog = (event) => {
        if (updateInProgress())
            return false;

        if (event) {
            event.stopPropagation();
        }
        setDeleteDialogOpen(true);
    };

    const handleEditDialogSave = (name) => {
        update(null, name);
        setEditDialogOpen(false);
    };
    const handleEditDialogClose = () => {
        setEditDialogOpen(false);
    };
    const handleDeleteDialogConfirm = (index) => {
        doDeletePlaylist(index)
        setDeleteDialogOpen(false);
    };
    const handleDeleteDialogClose = () => {
        setDeleteDialogOpen(false);
    };

    const update = async (event, name) => {
        if (updateInProgress())
            return false;
        if (event) {
            event.stopPropagation();
        }
        setSaveInProgress(true);
        updateSaveStatus(false, null)

        const montages = playlist.montages?.map(montage => montage.id).toString();
        const checks = playlist.montages?.map(montage => montage.is_checked === "1" ? "1" : "0").toString();

        updatePlaylist(playlist.id, name || playlist.name, montages, checks)
            .then(function (response) {
                setSaveInProgress(false)
                if (response.status >= 400) {
                    updateSaveStatus(false, `${t("error")}: ${response.statusText}`)
                } else {
                    const result = response.data;
                    if (result.code && result.message) {
                        updateSaveStatus(false, `${t("error")}: ${result.code}: ${result.message}`)
                    } else {
                        handlePlaylistUpdate(playlistIndex, name)
                    }
                }
            })
            .catch(function (error) {
                setSaveInProgress(false)
                updateSaveStatus(false, `${t("error")}: ${error.message}. ${t("error.generic")}`)
            });
    }

    const doDeletePlaylist = async () => {
        setDeleteInProgress(true);

        deletePlaylist(playlist.id)
            .then(function (result) {
                setDeleteInProgress(false);

                if (result.success) {
                    // Success case
                    console.log(playlistIndex, "deleted [PlayList]");
                    updateDeleteStatus(true, null, playlistIndex);
                } else {
                    // Error case
                    let errorMessage = t("error.generic");

                    if (result.error) {
                        if (typeof result.error === 'string') {
                            errorMessage = `${t("error")}: ${result.error}`;
                        } else if (result.error.message) {
                            errorMessage = `${t("error")}: ${result.error.message}`;
                        }
                    } else if (result.response && result.response.statusText) {
                        errorMessage = `${t("error")}: ${result.response.statusText}`;
                    }

                    updateDeleteStatus(false, errorMessage, null);
                }
            })
            .catch(function (error) {
                setDeleteInProgress(false);
                updateDeleteStatus(false, `${t("error")}: ${error.message || t("error.generic")}`, null);
            });
    }

    const handleDoPlayPlaylist = async (playlistId, event) => {
        event.stopPropagation();

        // Redundant updates possible
        if (playlistId === currentPlaylist) {
            console.log(`[Playlist handleDoPlayPlaylist] Playlist ${playlistId} is already active.`);
            return; 
        }

        // Track the requested playlist immediately
        savePreviousPlaylistId(currentPlaylist);
        console.log(`[Playlist handleDoPlayPlaylist] Switching to playlist: ${playlistId}`);

        handleSendCommand('<vlc><cmd action="stop"/></vlc>', house);
        console.log(`[Playlist handleDoPlayPlaylist] Force stop`);

        try {
            await doLoadPlaylist(playlistId);
            console.log('[Playlist] Playlist loaded:', playlistId);

            // Then, wait for the backend to confirm
            console.log(`[Playlist] Now waiting for backend confirmation...`);
            const syncSuccess = await handlePlaylistChange(playlistId);
            console.log(`[Playlist] Backend sync completed with result: ${syncSuccess}`);

            if (syncSuccess) {
                console.log(`[Playlist handleDoPlayPlaylist] Playlist ${playlistId} is now current.`);
                // Set ready state to true after successful sync
                setReadyToPlayPlaylist(true);

                // Now check if it's the current playlist AFTER sync is complete
                const isCurrent = (playlistId == currentPlaylist);
                console.log('[Playlist] currentPlaylist after sync:', currentPlaylist, 'isCurrent:', isCurrent);

            } else {
                console.warn(`[Playlist handleDoPlayPlaylist] Backend sync failed or timed out for playlist ${playlistId}.`);
            }
        } catch (error) {
            console.error('[Playlist] Error loading playlist:', error);
        }
    };

    const CurrentPlaylistBar = styled('div')(({ theme, isCurrent }) => ({
        position: "relative",
        marginRight: "6px",
        marginLeft: "-12px",
        width: '5px',
        backgroundColor: isCurrent ? "#90EE90" : "transparent", // theme.palette.main.constrastSuccess
        transition: 'width 0.3s ease',  // Smooth transition for the width change
    }));

    // console.log('[Playlist setCurrentPlaylist current] process before return with playlist.id, currentPlaylist, isCurrent:', playlist.id, currentPlaylist, isCurrent, currentTheme);

    return (
        <React.Fragment>
            <Accordion
                expanded={expandedAccordions[playlist.id] || false}
                onChange={handleAccordionToggle}
                sx={{ minWidth: MIN_PLAYER_WIDTH }}
            >
                <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    sx={{
                        '&:hover': {
                            backgroundColor: 'rgba(0, 0, 0, 0.04)', // Optional: subtle hover background
                        }
                    }}
                >

                    <CurrentPlaylistBar isCurrent={isCurrent} />
                    <Typography
                        sx={{
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            // Dynamic maxWidth calculation based on visible icons 
                            maxWidth: isMobile
                                ? `calc(100vw - ${36 + // Base margin/padding
                                36 + // Expand icon space
                                32 + // Play icon space (always visible)
                                (isHovered && !isDefaultPlaylist() && !isCurrent ? 32 : 0) + // Delete icon
                                (isHovered && !isDefaultPlaylist() ? 32 : 0) // Edit icon
                                }px)`
                                : (isHovered && !isDefaultPlaylist() ? '70%' : '85%'),
                            fontSize: isMobile ? '14px' : '16px', // Smaller font size on mobile
                            color: isHovered ? 'text.primary' : 'inherit', // Add this line - use text.primary on hover, inherit otherwise
                            transition: 'color 0.1s ease-in-out' // Smooth color transition
                        }}
                    >
                        {`${t("show_exhibitions." + currentTheme())}: ${playlist.name ? playlist.name : t("component.playlist.exhibitions.default-name")}`}
                    </Typography>
                    <Stack
                        direction="row"
                        spacing={1}
                        sx={{ position: "absolute", right: "40px", transition: 'opacity 0.1s ease-in-out' }}
                    >
                        {
                            !isDefaultPlaylist() && !isCurrent && isHovered ? (
                                <Tooltip title={t("component.playlist.exhibitions.delete")}>
                                    <DeleteOutlineIcon
                                        onClick={(event) => {
                                            event.stopPropagation(); // Prevent accordion from toggling
                                            handleAction(
                                                () => openDeleteDialog(event),
                                                false // Not premium content
                                            );
                                        }}
                                        sx={{
                                            transition: 'opacity 0.1s ease-in-out',
                                            cursor: 'pointer',
                                            color: 'text.primary', // Use theme's contrast color
                                            opacity: 0.7
                                        }}
                                    />
                                </Tooltip>
                            ) : null
                        }
                        {
                            !isDefaultPlaylist() && isHovered ? (
                                <Tooltip title={t("component.playlist.exhibitions.edit")}>
                                    <Edit
                                        onClick={(event) => {
                                            event.stopPropagation(); // Prevent accordion from toggling
                                            handleAction(
                                                () => openEditDialog(event),
                                                false // Not premium content
                                            );
                                        }}
                                        sx={{
                                            transition: 'opacity 0.1s ease-in-out',
                                            cursor: 'pointer',
                                            color: 'text.primary',
                                            opacity: 0.7
                                        }}
                                    />
                                </Tooltip>
                            ) : null
                        }
                        <Tooltip title={isCurrent ? t("component.playlist.exhibitions.playing") : t("component.playlist.exhibitions.play")}>
                            <PlaylistPlay
                                sx={{
                                    ...(isCurrent ? notCurrentPlaylistStyle : currentPlaylistStyle),
                                    color: isHovered ? 'primary.main' : 'inherit',
                                    transition: 'color 0.1s ease-in-out',
                                }}
                                align='right'
                                onClick={(event) => handleDoPlayPlaylist(playlist.id, event)}

                            />
                        </Tooltip>
                    </Stack>

                </AccordionSummary>
                <AccordionDetails>
                    {
                        playlist.montages ?
                            <DndContext onDragEnd={handleDragEnd}
                                sensors={sensors}
                                collisionDetection={closestCenter}
                            >
                                <SortableContext
                                    items={playlist.montages.map((m, index) => `${m.id}-${index}`)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {playlist.montages?.map((montage, index) => (
                                        <PlayListItem
                                            key={`${montage.id}-${index}`}  // Use same unique ID format for key
                                            id={`${montage.id}-${index}`}
                                            montageIndex={index}
                                            montage={montage}
                                            playlistIndex={playlistIndex}
                                            handleMontageClick={handleMontageClick}
                                            moveMontageToPlaylist={moveMontageToPlaylist}
                                            saveInProgress={saveInProgress}
                                            playlists={playlists}
                                            isDefaultPlaylist={isDefaultPlaylist()}
                                            removeMontageFromPlaylist={removeMontageFromPlaylist}
                                            currentPlaylist={currentPlaylist}
                                            handleSendCommand={handleSendCommand}
                                            doLoadPlaylist={doLoadPlaylist}
                                            handlePlaylistChange={handlePlaylistChange}
                                            house={house}
                                            onMontageNavigation={onMontageNavigation}
                                            selectedMontagePosition={selectedMontagePosition}
                                        >
                                        </PlayListItem>
                                    ))}
                                </SortableContext>
                            </DndContext>
                            : null
                    }
                </AccordionDetails>
            </Accordion>
            <EditPlaylistDialog
                editDialogOpen={editDialogOpen}
                handleEditDialogClose={handleEditDialogClose}
                handleEditDialogSave={handleEditDialogSave}
                currentName={playlist.name}
            />
            <DeleteDialog
                deleteDialogOpen={deleteDialogOpen}
                cancelDelete={handleDeleteDialogClose}
                confirmDelete={handleDeleteDialogConfirm}
                namePlaylist={playlist.name}
                deleteInProgress={deleteInProgress}
            />
        </React.Fragment>
    )
}

// export default Playlist;

export default memo(Playlist, (prevProps, nextProps) => {
    const montagesChanged = JSON.stringify(prevProps.playlist?.montages) !== JSON.stringify(nextProps.playlist?.montages);

    if (montagesChanged) {
        console.log('[Playlist memo] Montages changed, will re-render:', {
            playlistId: nextProps.playlist?.id,
            prevMontages: prevProps.playlist?.montages?.map(m => m.id),
            nextMontages: nextProps.playlist?.montages?.map(m => m.id)
        });
    }

    const shouldSkipRender = (
        prevProps.playlist?.id === nextProps.playlist?.id &&
        prevProps.playlist?.name === nextProps.playlist?.name &&
        prevProps.playlistIndex === nextProps.playlistIndex &&
        prevProps.currentPlaylist === nextProps.currentPlaylist &&
        !montagesChanged
    );

    return shouldSkipRender;
});

Playlist.propTypes = {
  playlist: PropTypes.object.isRequired,
  playlistIndex: PropTypes.number.isRequired,
  handleMontageClick: PropTypes.func.isRequired,
  handleMontageReorder: PropTypes.func,
  moveMontageToPlaylist: PropTypes.func,
  removeMontageFromPlaylist: PropTypes.func,
  updateSaveStatus: PropTypes.func,
  handlePlaylistUpdate: PropTypes.func,
  updateDeleteStatus: PropTypes.func,
  playlists: PropTypes.array,
  setPlaylists: PropTypes.func,
  currentPlaylist: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  doLoadPlaylist: PropTypes.func,
  handlePlaylistChange: PropTypes.func,
  house: PropTypes.string,
  isDemo: PropTypes.bool,
  handleAction: PropTypes.func,
  onMontageNavigation: PropTypes.func,
  selectedMontagePosition: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};