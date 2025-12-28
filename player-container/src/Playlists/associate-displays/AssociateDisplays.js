// AssociateDisplays.js

// React and Main Libraries
import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { CustomSnackbar, CustomAlert } from "../../CustomComponents";
import PropTypes from 'prop-types';

// Material-UI Components and Hooks
import { 
  Typography, 
  IconButton, 
  Select, 
  MenuItem, 
  FormControl, 
  Paper,
  Box,
  Divider,
  Tooltip,
  Badge,
  Switch
} from "@mui/material";

// Icons
import { PiComputerTower } from 'react-icons/pi';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import SmartphoneIcon from '@mui/icons-material/Smartphone';
import TabletAndroidIcon from '@mui/icons-material/TabletAndroid';
import TvIcon from '@mui/icons-material/Tv';
import CloseIcon from '@mui/icons-material/Close';

// Custom Hooks and Utilities
import { useResponsive } from '../../utils/useResponsive';
import { getUserId } from "../../utils/Utils";
import { setTrackScreen } from "../../utils/api";

// Contexts
import { useEnvironments } from "../../contexts/EnvironmentsContext.js";
import { usePlaylists } from '../../contexts/PlaylistsContext';
import { selectTheme } from "../../theme/ThemeUtils";

const AssociateDisplays = ({ montageId, playlistIndex, onClose, handleAction }) => {
    const theme = selectTheme();
    const iconColor = theme.palette.primary.main;
    const { t } = useTranslation();
    const { isMobile, isTablet, isHD, isUHD, isSmartTV, isPortrait, isLandscape, iconSize } = useResponsive();

    const { environments } = useEnvironments();
    const { playlists, setPlaylists } = usePlaylists();

    // Ref for the component container
    const componentRef = useRef(null);

    // State for feedback messages
    const [saveInProgress, setSaveInProgress] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [saveError, setSaveError] = useState(null);
    
    // Toggle for showing only active displays
    const [showOnlyActive, setShowOnlyActive] = useState(true);

    // Safely filter valid playlists
    const filteredPlaylists = (Array.isArray(playlists) ? playlists : [])
        .filter(p => !p?.name || !p.name.startsWith('Temp_Playlist_'));

    // Extracting the selectedPlaylist and relatedMontage based on provided indices
    const selectedPlaylist = filteredPlaylists[playlistIndex] || filteredPlaylists[0];
    const relatedMontage = selectedPlaylist?.montages?.find(m => m.id === montageId);

    // Filter environments based on toggle state
    const filteredEnvironments = React.useMemo(() => {
        if (!Array.isArray(environments)) return [];
        
        return environments.filter(env => {
            if (!Array.isArray(env.screens)) {
                return false; // Skip environments with invalid screens property
            }

            // Check if environment has any active screens (with green status indicator)
            const hasActiveScreens = env.screens.some(screen => 
                screen.on === "1" && screen.width !== "0" && screen.height !== "0"
            );

            // Include all environments when toggle is off, or only active ones when toggle is on
            return !showOnlyActive || hasActiveScreens;
        });
    }, [environments, showOnlyActive]);

    const handleTrackChange = async (montageId, screenId, trackNumber) => {
        // Safety check for required data
        if (!Array.isArray(environments) || !Array.isArray(playlists)) {
            console.error("[AssociateDisplays] Missing required data:", { environments, playlists });
            return;
        }

        // Find the specific montage by ID
        let montageIndex = playlists.findIndex(p => p.montages?.some(m => m.id === montageId));
        if (montageIndex === -1) {
            console.error("[AssociateDisplays HandleTrackChange] Montage not found!", { montageId });
            return;
        }
        let montage = playlists[montageIndex]?.montages?.find(m => m.id === montageId);
        if (!montage) {
            console.error("[AssociateDisplays] Montage not found after index lookup:", { montageId, montageIndex });
            return;
        }

        // Check if the screen exists in the montage and get current track
        let screenIndex = montage.screens?.findIndex(s => s.id === screenId) ?? -1;
        const currentTrack = screenIndex !== -1 ? montage.screens[screenIndex]?.seq : "";

        // Check if track is actually changing
        const isTrackChanging = currentTrack !== (trackNumber?.toString() || "");

        console.log("[AssociateDisplays] Track change check:", {
            currentTrack,
            newTrack: trackNumber?.toString() || "",
            isChanging: isTrackChanging
        });

        // If track is not changing, or if handleAction is not provided, proceed directly
        if (!isTrackChanging || !handleAction) {
            console.log("[AssociateDisplays] No track change or no handleAction, proceeding directly");
            return;
        }

        // Track is changing - close dialog immediately before showing popup
        console.log("[AssociateDisplays] Closing dialog before showing popup");
        if (onClose) {
            onClose();
        }

        // Use handleAction to check for demo account
        handleAction(
            async () => {
                console.log("[AssociateDisplays] Executing track change after guest check");
                // Original track change logic below
                let screenIndex = montage.screens?.findIndex(s => s.id === screenId) ?? -1;
        if (screenIndex === -1) {
            // Screen doesn't exist, retrieve it from environments and add it
            const environment = environments?.find(e => e?.screens?.some(s => s.id === screenId));
            const newScreen = environment?.screens?.find(s => s.id === screenId);
            if (!newScreen) {
                console.error("[AssociateDisplays HandleTrackChange] Screen not found in environments!", { screenId });
                return;
            }
            let clonedScreen = { ...newScreen, seq: trackNumber?.toString() || "" };
            if (!montage.screens) {
                montage.screens = [];
            }
            montage.screens.push(clonedScreen);
        } else {
            // Screen exists, update its seq
            if (montage.screens && montage.screens[screenIndex]) {
            montage.screens[screenIndex] = { ...montage.screens[screenIndex], seq: trackNumber?.toString() || "" };
            }
        }
    
        // Replace the updated montage in the playlist
        let updatedMontages = playlists[montageIndex]?.montages?.map(m => m.id === montageId ? montage : m) || [];
        let updatedPlaylists = playlists.map((p, idx) => idx === montageIndex ? { ...p, montages: updatedMontages } : p);
        setPlaylists(updatedPlaylists);
    
        // Find the house ID for the screen
        const environment = environments?.find(e => e?.screens?.some(s => s.id === screenId));
        const house = environment ? environment.house : -1;
        console.log('AssociateDisplays: ', environment, ' house: ', house);
      
        setSaveInProgress(true);
        setSaveSuccess(false);
        setSaveError(null);

        try {
            const session = getUserId();
            const seqNumberInt = trackNumber ? parseInt(trackNumber, 10) : null;

            console.log("[AssociateDisplays] Server call montageId, house, seqNumberInt, screenId, session", montageId, house, seqNumberInt, screenId, session);

            const response = await setTrackScreen(montageId, seqNumberInt, screenId, session);
            console.log("[AssociateDisplays] Server updated successfully");
            setSaveSuccess(true);
        } catch (error) {
            console.error("[AssociateDisplays] Failed to update server", error);
            setSaveError(error.message);
        } finally {
            setSaveInProgress(false);
        }
            },
            false // Not premium content
        );
    };

    // Handler for toggle change
    const handleToggleChange = () => {
        setShowOnlyActive(prev => !prev);
    };

    // Handler for close button
    const handleClose = () => {
        if (onClose && typeof onClose === 'function') {
            onClose();
        }
    };

    // Handle click outside to close
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (componentRef.current && !componentRef.current.contains(event.target)) {
                // Check if the click is on a Material-UI dropdown/menu which might be rendered outside our component
                const isDropdownClick = event.target.closest('.MuiPopover-root') || 
                                      event.target.closest('.MuiMenu-root') ||
                                      event.target.closest('.MuiSelect-root') ||
                                      event.target.closest('[role="presentation"]') ||
                                      event.target.closest('[role="menu"]');
                
                // Only close if it's not a dropdown/menu click
                if (!isDropdownClick) {
                    handleClose();
                }
            }
        };

        // Add event listener with a small delay to avoid immediate closure
        const timeoutId = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
        }, 100);
        
        // Cleanup event listener on unmount
        return () => {
            clearTimeout(timeoutId);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose]); // Include onClose in dependency array

    // Render screen component - extracts the screen rendering logic for reuse
    const renderScreen = (screen, env) => {
        if (screen.width === "0" && screen.height === "0") {
            return null; // Skip screens with 0x0 dimensions
        }

        const screenDetail = relatedMontage?.screens?.find(s => String(s.id) === String(screen.id));
        
        return (
            <Paper 
                key={screen.id} 
                elevation={2} 
                sx={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    margin: '10px 0',
                    padding: 2,
                    borderLeft: screen.on === "1" ? `4px solid #4CAF50` : `4px solid #9e9e9e`,
                    borderRadius: 1
                }}
            >
                <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    flex: '1 1 auto',
                    marginRight: 2
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Badge 
                            color={screen.on === "1" ? "success" : "default"} 
                            variant="dot"
                            sx={{ mr: 1 }}
                        >
                            {isMobile && <SmartphoneIcon sx={{ fontSize: iconSize, color: iconColor }} />}
                            {isTablet && <TabletAndroidIcon sx={{ fontSize: iconSize, color: iconColor }} />}
                            {(isHD || isUHD || isSmartTV) && <TvIcon sx={{ fontSize: iconSize, color: iconColor }} />}
                        </Badge>
                        <Typography variant="subtitle1" fontWeight="bold">
                            {screen.name}
                        </Typography>
                    </Box>
                    <Box sx={{ 
                        display: 'flex', 
                        flexDirection: 'row', 
                        flexWrap: 'wrap',
                        '& > *': { mr: 2, fontSize: '0.875rem', color: 'text.secondary' }
                    }}>
                        <Typography>
                            {t("Orientation")}: {screen.orientation === 'L' ? t("Landscape") : 
                                screen.orientation === 'P' ? t("Portrait") : 
                                screen.orientation === 'S' ? t("Square") : t("Default")}
                        </Typography>
                        <Typography>{t("Dimensions")}: {screen.width} x {screen.height}</Typography>
                        <Typography>{screen.enabled === "1" ? t("Enabled") : t("Disabled")}</Typography>
                    </Box>
                </Box>
                <Box>
                    <FormControl size="small">
                        <Tooltip title={t("action.save.changed.associations.tip")} placement="top">
                            <Select
                                sx={{ minWidth: 120 }}
                                value={screenDetail ? screenDetail.seq : ""}
                                onChange={(e) => handleTrackChange(montageId, screen.id, e.target.value)}
                                displayEmpty
                            >
                                <MenuItem value=""><em>None</em></MenuItem>
                                {relatedMontage && Array.from({ length: relatedMontage.tracks_count }, (_, i) => (
                                    <MenuItem key={i} value={String(i + 1)}>Track {i + 1}</MenuItem>
                                ))}
                            </Select>
                        </Tooltip>
                    </FormControl>
                </Box>
            </Paper>
        );
    };

    // Render environment component - extracts the environment rendering logic
    const renderEnvironment = (env) => {
        if (!Array.isArray(env.screens)) return null;

        // Filter out invalid screens
        const validScreens = env.screens.filter(screen => 
            screen.width !== "0" && screen.height !== "0"
        );
        
        if (validScreens.length === 0) return null;

        // Check if environment has any active screens
        const hasActiveScreens = validScreens.some(screen => screen.on === "1");
        const isWeb = env.name === "Web player";
        
        return (
            <Paper
                key={env.id}
                elevation={3}
                sx={{
                    mb: 2,
                    border: isWeb ? `2px dotted ${theme.palette.primary.main}` : 'none',
                    borderRadius: 1,
                    overflow: 'hidden'
                }}
            >
                <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    padding: 2,
                    bgcolor: hasActiveScreens ? 'rgba(76, 175, 80, 0.1)' : 'transparent' 
                }}>
                    <IconButton size="small" sx={{ mr: 1 }}>
                        <PiComputerTower style={{ color: theme.palette.primary.main }} />
                    </IconButton>
                    <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                            {env.name}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            {t("IP")} {env.ip}
                        </Typography>
                    </Box>
                    <Badge 
                        color={hasActiveScreens ? "success" : "default"} 
                        variant="dot"
                        sx={{ 
                            '& .MuiBadge-badge': {
                                width: 12,
                                height: 12,
                                borderRadius: '50%'
                            }
                        }}
                    />
                </Box>
                <Divider />
                <Box sx={{ padding: 2 }}>
                    {validScreens.map(screen => renderScreen(screen, env))}
                </Box>
            </Paper>
        );
    };

    if (!relatedMontage) {
        return <Typography>No montage data available</Typography>;
    }

    return (
        <Box ref={componentRef}>
            {/* Header */}
            <Box sx={{ position: 'sticky', top: 0, bgcolor: 'background.paper', zIndex: 10, mb: 3, py: 2, position: 'relative' }}>
                {/* Close Button - Absolute Top Right */}
                <IconButton
                    onClick={handleClose}
                    sx={{
                        position: 'absolute',
                        right: 0,
                        top: 0,
                        color: theme.palette.text.secondary,
                        '&:hover': {
                            color: theme.palette.text.primary,
                            backgroundColor: 'rgba(255, 255, 255, 0.1)'
                        }
                    }}
                    size="large"
                >
                    <CloseIcon />
                </IconButton>
                
                <Typography 
                    variant="body1"
                    sx={{ color: theme.palette.primary.inactive, marginLeft: 1 }}
                >
                    {selectedPlaylist.name || t("component.selectedPlaylist.exhibitions.default-name")}
                </Typography>
                <Typography variant="h5" sx={{
                    textAlign: 'center',
                    color: theme.palette.primary.main,
                    fontWeight: 'bold',
                    my: 1
                }}>
                    Associate Displays: {relatedMontage.name}
                </Typography>
                
                {/* Toggle for Active Displays Only - Aligned Right */}
                <Box sx={{ 
                    position: 'relative',
                    display: 'flex',
                    justifyContent: 'center',
                    width: '100%',
                    mt: 2
                }}>
                    <Box sx={{ 
                        position: 'absolute',
                        right: 10,
                        display: 'flex',
                        alignItems: 'center'
                    }}>
                        <Typography sx={{ mr: 2, fontWeight: 'medium' }}>
                            {t("descriptions.showOnlyOn")}
                        </Typography>
                        <Switch
                            checked={showOnlyActive}
                            onChange={handleToggleChange}
                            color="primary"
                            inputProps={{ 'aria-label': 'toggle active displays' }}
                        />
                    </Box>
                </Box>
            </Box>

            {/* Environments Section */}
            <Box>
                {filteredEnvironments.length > 0 ? (
                    filteredEnvironments.map(env => renderEnvironment(env))
                ) : (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                        <Typography variant="body1" color="text.secondary">
                            No active displays found. Turn off the filter to see all displays.
                        </Typography>
                    </Box>
                )}
            </Box>

            {/* Feedback Snackbar */}
            <CustomSnackbar
                open={saveSuccess || saveError != null}
                autoHideDuration={6000}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                onClose={() => {
                    setSaveSuccess(false);
                    setSaveError(null);
                }}
            >
                <CustomAlert
                    severity={saveError ? "error" : "success"}
                    onClose={() => {
                        setSaveSuccess(false);
                        setSaveError(null);
                    }}
                >
                    {saveError ? `Error: ${saveError}` : t("action.save.changed.associations")}
                </CustomAlert>
            </CustomSnackbar>
        </Box>
    );
};

// PropTypes for the component
AssociateDisplays.propTypes = {
    montageId: PropTypes.string.isRequired,
    playlistIndex: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    onClose: PropTypes.func,
    handleAction: PropTypes.func
};

export default AssociateDisplays;