//PlayListItem.js
import "../PlayLists.css";
import React, { useState, useEffect, useMemo } from "react";
import Stack from '@mui/material/Stack';
import { styled } from '@mui/material/styles';
import {
    Box, Button,
    Checkbox,
    Dialog, DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    InputLabel,
    OutlinedInput, Select,
    Tooltip, Modal,
    IconButton
} from "@mui/material";
import Typography from "@mui/material/Typography";
import { selectTheme } from "../../theme/ThemeUtils";
import { DragHandle, Delete } from "@mui/icons-material";
import PlaylistAddIcon from "@mui/icons-material/PlaylistAdd";
import SettingsIcon from '@mui/icons-material/Settings';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CloseIcon from '@mui/icons-material/Close';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTranslation } from "react-i18next";
import AssociateDisplays from "../associate-displays/AssociateDisplays";
import { useResponsive } from '../../utils/useResponsive';
import PropTypes from 'prop-types'; // Added missing import

//overrides of wp theme 
const NumberOfTracksButtonContainer = styled('div')(({ theme }) => ({
    width: theme.spacing(3.75),
    height: theme.spacing(3.75),
    background: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    alignSelf: 'center',
    position: "relative",
    margin: 0,
    clipPath: "polygon(25% 20%, 60% 20%, 85% 50%, 60% 80%, 25% 80%)",
    display: 'flex',  // Ensures children are flex items
    alignItems: 'center',  // Vertically center the child button
    justifyContent: 'center',  // Horizontally center the child button
    [theme.breakpoints.up('tv')]: {
        width: theme.spacing(6),
        height: theme.spacing(6)
    }
}));

const NumberOfTracksButton = styled('span')(({ theme }) => ({
    position: "relative",  // Changed to relative for better control within the container
    width: theme.spacing(4),
    height: theme.spacing(4),
    color: theme.palette.primary.contrastText,
    lineHeight: theme.spacing(4),
    textAlign: 'center',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    clipPath: "polygon(25% 20%, 60% 20%, 85% 50%, 60% 80%, 25% 80%)",
    [theme.breakpoints.up('xl')]: {
        width: theme.spacing(7),
        height: theme.spacing(7),
        fontSize: '20px'
    }
}));

const TypographyStyle = styled(Typography)(({ theme }) => ({
    fontSize: '16px',
    lineHeight: '30px',
    alignSelf: 'center',  // Centers vertically in a flex container
    [theme.breakpoints.up('tv')]: {
        fontSize: '24px',  // Larger font size for SmartTV
        lineHeight: '40px'
    }
}));

function PlayListItem({ montageIndex, montage, playlistIndex, handleMontageClick, moveMontageToPlaylist, handleMontageReorder, saveInProgress, playlists, isDefaultPlaylist, removeMontageFromPlaylist }) {

    // console.log('[PlayListItem] playlistIndex:', playlistIndex, ' playlists:', playlists);

    const theme = selectTheme();
    const responsiveProps = useResponsive();
    const { isMobile } = responsiveProps;

    const [openPlaylistSelection, setOpenPlaylistSelection] = React.useState(false);

    // useEffect(() => {
    //     if (playlists) {
    //         console.log('[PlayListItem] Current montages:', playlists.map((playlist, playlistIndex) => playlist.montages ? playlist.montages.map((m, index) => ({playlistIndex, index, id: m.id})) : []));
    //     }
    // }, [playlists]);

    // useEffect(() => {
    //     console.log('PlayListItem mounted/updated:', {
    //         montageIndex,
    //         id: montage.id
    //     });
    // }, [montage, montageIndex]);

    const [openAssociateDisplays, setOpenAssociateDisplays] = useState(false);

    const handleOpenAssociateDisplays = () => setOpenAssociateDisplays(true);
    const handleCloseAssociateDisplays = () => setOpenAssociateDisplays(false);

    const openPlaylistSelectionDialog = () => {
        setOpenPlaylistSelection(true)
    }
    const handlePlaylistSelectionDialogClose = (event, reason) => {
        setOpenPlaylistSelection(false);
    }
    const handlePlaylistSelectionChange = event => {
        const playlistId = event.target.value;
        console.log('PlaylistItem: handlePlaylistSelectionChange', montage, playlistId);
        if (playlistId != -1) {
            moveMontageToPlaylist(montage, playlistId)
        }
    }
    const removeMontage = () => {
        removeMontageFromPlaylist(montageIndex, playlistIndex);
        console.log('[PlayListItem] removeMontageFromPlaylist:', montageIndex, playlistIndex);
    }

    // console.log('[PlayListItem] Setting up useSortable:', {
    //     id: String(montage.id),
    //     montageIndex,
    //     montage
    // });


    // Create a unique ID combining montage ID and position
    const uniqueId = `${montage.id}-${montageIndex}`;

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({
        id: uniqueId,
        data: {
            montageIndex,
            montage,
            disabled: saveInProgress
        },
        // Add these options to constrain movement
        modifiers: [
            // Restricts movement to horizontal axis only
            {
                name: 'restrictToHorizontalAxis',
                options: {
                    lockAxis: 'y'
                }
            },
            // Constrains dragging to the parent container
            {
                name: 'restrictToParentElement',
                options: {
                    boundary: 'parent'
                }
            }
        ]
    });

    const style = useMemo(() => ({
        transform: CSS.Transform.toString(transform),
        transition,
        height: "40px",
        lineHeight: "40px",
        position: "relative",
        // Add user-select none to prevent text selection during drag
        userSelect: 'none',
        // Make sure the container has proper overflow handling
        overflow: 'visible'
    }), [transform, transition]);

    const draggingStyle = useMemo(() => ({
        ...style,
        opacity: isDragging ? 0.5 : 1,
        // Add z-index while dragging to ensure item stays on top
        zIndex: isDragging ? 999 : 'auto',
        // Prevent pointer events while dragging to avoid interference
        pointerEvents: isDragging ? 'none' : 'auto',
        // Add a transform to improve visual feedback
        boxShadow: isDragging ? '0 5px 10px rgba(0,0,0,0.2)' : 'none'
    }), [style, isDragging]);

    // Debug logging
    useEffect(() => {
        console.log('[PlayListItem] Item rendered:', {
            montageIndex,
            playlistIndex,
            isDragging,
            montageData: montage
        });
    }, [montageIndex, playlistIndex, isDragging, montage]);

    const { t } = useTranslation();

    // Add custom handler to prevent default behavior on dragstart
    const handleDragStart = (e) => {
        // Prevent window scrolling when dragging starts
        document.body.style.overflow = 'hidden';

        // You can also add a class to the body for additional styling during drag
        document.body.classList.add('dragging-active');
    };

    // Clean up after drag ends
    const handleDragEnd = () => {
        document.body.style.overflow = '';
        document.body.classList.remove('dragging-active');
    };

    // Add effect to handle component unmount
    useEffect(() => {
        return () => {
            // Cleanup if component unmounts during drag
            document.body.style.overflow = '';
            document.body.classList.remove('dragging-active');
        };
    }, []);

    return (
        // <div ref={setNodeRef} {...attributes}>
        <div
            ref={setNodeRef}
            {...attributes}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <Stack direction="row" spacing={1} alignItems="center" sx={isDragging ? draggingStyle : style}>
                {/* NOT SHOWING: backend needs to pass to webplayer is_checked */}
                {/* <Checkbox
                    label={"Selected"}
                    checked={montage.is_checked === "1"}
                    disabled={saveInProgress}
                    onChange={() => {
                        console.log("[PlayListItem] Before change, montage is_checked:", montage.is_checked); // Log before state change
                        handleMontageClick(montageIndex, playlistIndex);
                    }}
                /> */}
                <NumberOfTracksButtonContainer className="numberOfTracksButtonContainer">
                    <NumberOfTracksButton className="numberOfTracksButton" >{montage.tracks_count}</NumberOfTracksButton>
                </NumberOfTracksButtonContainer>
                <TypographyStyle
                    variant="subtitle1"
                    gutterBottom
                    sx={{
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        paddingRight: '120px'
                    }}
                >
                    {montage.name}
                </TypographyStyle>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ position: "absolute", right: "0" }}>
                    {/* top: "10px", */}
                    {
                        isDefaultPlaylist ?
                            <Tooltip title={t("component.playlist.exhibitions.add-to-playlist")}>
                                <PlaylistAddIcon sx={{ cursor: "pointer" }}
                                    color="primary"
                                    onClick={openPlaylistSelectionDialog} />
                            </Tooltip> : null
                    }
                    <Tooltip title={t("component.playlist.exhibitions.item.delete")}>
                        <DeleteOutlineIcon
                            sx={{ cursor: "pointer" }}
                            color="primary"
                            onClick={removeMontage}
                        />
                    </Tooltip>
                    <div>
                        <Tooltip title={t("component.playlist.exhibitions.associate-displays")}>
                            <SettingsIcon
                                color="primary"
                                style={{
                                    display: 'block',
                                    alignSelf: 'center',

                                }}
                                onClick={handleOpenAssociateDisplays} />
                        </Tooltip>
                        <Modal className='modal'
                            open={openAssociateDisplays}
                            onClose={handleCloseAssociateDisplays}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: 'auto'
                            }}
                            aria-labelledby="modal-modal-title"
                            aria-describedby="modal-modal-description"
                        >
                            <Box
                                sx={{
                                    position: 'absolute',
                                    top: '20%',
                                    bottom: '5%',
                                    width: isMobile ? '95vw' : '90vw', // Use a ternary operator to conditionally set the width
                                    overflow: 'auto',
                                    borderRadius: '10px',
                                    background: `${theme.palette.primary.contrastText}`,
                                    border: `5px solid ${theme.palette.primary.main}`, // Add this line
                                }}
                            >
                                <AssociateDisplays
                                    montageId={montage.id}
                                    playlistIndex={playlistIndex}
                                    onClose={handleCloseAssociateDisplays} 
                                />
                                {/* <Button onClick={handleCloseAssociateDisplays}>Close</Button> */}
                                <IconButton
                                    aria-label="close"
                                    onClick={handleCloseAssociateDisplays}
                                    style={{ position: 'absolute', top: '0', right: '0' }}
                                >
                                    <CloseIcon />
                                </IconButton>
                            </Box>
                        </Modal>
                    </div>
                    <Tooltip title={t("component.playlist.exhibitions.item.drag")}>
                        {/* IMPORTANT CHANGE: Only apply the listeners to the DragHandle icon with improved styling */}
                        <DragHandle
                            {...listeners}
                            color="primary"
                            sx={{
                                cursor: isDragging ? 'grabbing' : 'grab',
                                touchAction: 'none', // Improves touch device behavior
                                '&:hover': {
                                    color: theme.palette.primary.dark,
                                }
                            }}
                            onMouseDown={(e) => {
                                // Prevent text selection when starting drag
                                e.preventDefault();
                                // Optional: add a specific class to the body when drag starts from handle
                                document.body.classList.add('handle-dragging');
                            }}
                            onMouseUp={() => {
                                document.body.classList.remove('handle-dragging');
                            }}
                        />
                    </Tooltip>
                </Stack>
            </Stack>
            <Dialog disableEscapeKeyDown open={openPlaylistSelection} onClose={handlePlaylistSelectionDialogClose}>
                <DialogTitle>{t("component.playlist.exhibitions.add-montage")}</DialogTitle>
                <DialogContent>
                    <Box component="form" sx={{ display: 'flex', flexWrap: 'wrap' }}>
                        <FormControl sx={{ m: 1, minWidth: 120 }}>
                            <InputLabel htmlFor="playlist-dialog-native">{t("component.playlist.exhibitions.playlist")}</InputLabel>
                            <Select
                                native
                                onChange={handlePlaylistSelectionChange}
                                input={<OutlinedInput label="Playlist" id="playlist-dialog-native" />}
                            >
                                <option key="-1" value="-1">{t("component.playlist.exhibitions.select-playlist-default")}</option>
                                {
                                    playlists.filter(playlist => playlist.id).map(playlist => {
                                        return (
                                            <option key={playlist.id} value={playlist.id}>{playlist.name}</option>
                                        )
                                    })
                                }
                            </Select>
                        </FormControl>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handlePlaylistSelectionDialogClose}>Ok</Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}

export default React.memo(PlayListItem, (prev, next) => {
    const prevMontages = prev.playlists[prev.playlistIndex]?.montages;
    const nextMontages = next.playlists[next.playlistIndex]?.montages;

    return (
        prev.montage.id === next.montage.id &&
        prev.montageIndex === next.montageIndex &&
        prev.playlistIndex === next.playlistIndex &&
        prev.montage.is_checked === next.montage.is_checked &&
        prev.saveInProgress === next.saveInProgress &&
        prevMontages?.length === nextMontages?.length
    );
});

PlayListItem.propTypes = {
    montageIndex: PropTypes.number.isRequired,
    montage: PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
        name: PropTypes.string.isRequired,
        is_checked: PropTypes.string.isRequired,
        tracks_count: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired
    }).isRequired,
    playlistIndex: PropTypes.number.isRequired,
    handleMontageClick: PropTypes.func.isRequired,
    moveMontageToPlaylist: PropTypes.func.isRequired,
    saveInProgress: PropTypes.bool,
    playlists: PropTypes.array.isRequired,
    isDefaultPlaylist: PropTypes.bool,
    removeMontageFromPlaylist: PropTypes.func.isRequired
};