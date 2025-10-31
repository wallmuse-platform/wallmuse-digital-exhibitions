// React core and hooks
import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";

// Styling and themes
import "../App.css";

// Material UI components and icons
import { Grid, Stack, Tooltip, IconButton } from "@mui/material";
import FastForwardIcon from "@mui/icons-material/FastForward";
import FastRewindIcon from "@mui/icons-material/FastRewind";
import StopIcon from "@mui/icons-material/Stop";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import VolumeDown from "@mui/icons-material/VolumeDown";
import VolumeUp from '@mui/icons-material/VolumeUp';
import VolumeOff from '@mui/icons-material/VolumeOff';
import SubtitlesOutlinedIcon from '@mui/icons-material/SubtitlesOutlined';
import SubtitlesOffOutlinedIcon from '@mui/icons-material/SubtitlesOffOutlined';
import IOSAudioAndroidVideoHandler from './IOSAudioAndroidVideoHandler';

// Internationalization
import { useTranslation } from "react-i18next";
import i18n from '../i18n.js';

// Custom components
import PropTypes from 'prop-types';
import VolumeSlider from './VolumeSlider';
import { FullScreen } from "./FullScreen.js";
import PlayerCommands2 from "./PlayerCommands2";
import TabButtons from "./TabButtons.js";

// Context providers
import { useEnvironments } from "../contexts/EnvironmentsContext.js";

// Other utilities and components
import { useGlobalPlayerState } from '../GlobalPlayerState';
import { useResponsive } from '../utils/useResponsive';
import Playlists from "../Playlists/playlists/PlayLists";
import { deletePlaylist } from "../utils/api";
import { handlePlayMontageEnd } from "../Play/playModeUtils.js";

function PlayerCommands({
  onPlay, onPause, onStop, onRew, onFwd, iconClass, t, volumeRef, onVolumeChange, onPlayStart, onPlayEnd, playModeRef,
  currentPlaylist, currentTempPlaylistId, house, setPlaylists, responsiveProps, theme, syncLoading, setSyncLoading
}) {

  const { isPlaying, setIsPlaying } = useGlobalPlayerState(true); // true = subscribe to re-renders

  console.log('[PlayerCommands] Rendering with volumeRef.current, currentPlaylist):', volumeRef.current, currentPlaylist);
  const { handlePlaylistChange } = useEnvironments(); // Only get what you need

  const { isMobile } = responsiveProps;
  console.log('[PlayerCommands] isPlaying', isPlaying);
  // Create mutedRef for persistence and useState for UI updates
  const mutedRef = useRef(
    localStorage.getItem('wallmuse-muted') ?
    JSON.parse(localStorage.getItem('wallmuse-muted')) :
    true // Default to muted for autoplay compliance
  );
  const [muted, setMuted] = useState(mutedRef.current);

  // Don't send initial volume - wait for user interaction when video is ready

  const iconStyle = {
    color: theme.palette.secondary.text, // Use theme color
    fill: theme.palette.secondary.text,
    opacity: 1,
    visibility: 'visible',
    backgroundColor: 'transparent !important',
    borderColor: 'transparent !important'
  };

  // Volume change handler (used by both controls)
  const handleVolumeChange = useCallback((newVolume) => {
    console.log('[VolumeControl] handleVolumeChange called with newVolume:', newVolume, 'current muted:', muted, 'volumeRef:', volumeRef.current);

    // Always update the display volume
    volumeRef.current = newVolume;
    // Update ref and localStorage atomically
    localStorage.setItem('wallmuse-volume', newVolume.toString());

    // Handle auto-unmute first if needed
    if (newVolume > 0 && muted) {
      console.log('[VolumeControl] Auto-unmuting because user set volume > 0');
      mutedRef.current = false;
      setMuted(false);
      localStorage.setItem('wallmuse-muted', 'false');
      // Send the actual volume since we're now unmuted
      console.log('[VolumeControl] Auto-unmute: sending volume:', newVolume);
      onVolumeChange(newVolume);
    } else {
      // Send effective volume: 0 if muted, actual volume if not muted
      const effectiveVolume = muted ? 0 : newVolume;
      console.log('[VolumeControl] sending effectiveVolume:', effectiveVolume, '(muted:', muted, ')');
      onVolumeChange(effectiveVolume);
    }
  }, [onVolumeChange, muted]);

  // Toggle mute handler with improved behavior
  const toggleMute = useCallback(() => {
    console.log('[VolumeControl] toggleMute called. Current state - muted:', muted, 'volumeRef:', volumeRef.current);

    // Toggle muted state
    const newMutedState = !muted;
    mutedRef.current = newMutedState;
    setMuted(newMutedState);

    // Save muted state to localStorage
    localStorage.setItem('wallmuse-muted', JSON.stringify(newMutedState));

    if (!newMutedState) {
      // Unmuting - if volume is 0 (new user), set to default 50
      if (volumeRef.current === 0) {
        volumeRef.current = 50;
        localStorage.setItem('wallmuse-volume', '50');
        console.log('[VolumeControl] Unmuting new user. Set volumeRef to 50, sending volume: 50');
        onVolumeChange(50);
      } else {
        // Returning user - use saved volume
        console.log('[VolumeControl] Unmuting returning user. Current volumeRef:', volumeRef.current, 'sending volume:', volumeRef.current);
        onVolumeChange(volumeRef.current);
      }
    } else {
      // Muting - send 0 but keep volumeRef unchanged
      console.log('[VolumeControl] Muting. volumeRef stays:', volumeRef.current, 'sending volume: 0');
      onVolumeChange(0);
    }

  }, [muted, onVolumeChange]);

  // Listen for auto-unmute event from IOSAudioAndroidVideoHandler
  useEffect(() => {
    const handleAutoUnmute = (event) => {
      console.log('[PlayerCommands] Received wallmuse-unmute event:', event.detail);
      const { muted: newMutedState } = event.detail;

      // Update mute state
      mutedRef.current = newMutedState;
      setMuted(newMutedState);

      // If unmuting, send volume to player
      if (!newMutedState) {
        if (volumeRef.current === 0) {
          volumeRef.current = 50;
          localStorage.setItem('wallmuse-volume', '50');
          console.log('[PlayerCommands] Auto-unmute: Set volume to 50 for fresh user');
          onVolumeChange(50);
        } else {
          console.log('[PlayerCommands] Auto-unmute: Sending current volume:', volumeRef.current);
          onVolumeChange(volumeRef.current);
        }
      }
    };

    window.addEventListener('wallmuse-unmute', handleAutoUnmute);
    return () => window.removeEventListener('wallmuse-unmute', handleAutoUnmute);
  }, [onVolumeChange]);

  // utility function for iOS or when not starting


  // Real toggle approach for play/pause (not solely optimistic) 
  const handlePlayPause = useCallback(() => {
    console.log('[PlayerCommands handlePlayPause] isPlaying', isPlaying)
    if (isPlaying) {
      setIsPlaying(false); // Optimistically update
      onPause();
    } else {
      setIsPlaying(true); // Optimistically update
      onPlay();
    }
  }, [isPlaying, onPlay, onPause, setIsPlaying]);

  const handleStopWithIconUpdate = useCallback(() => {
    onStop();
    // Update playing state to show play icon
    setIsPlaying(false);
  }, [onStop]);

  // Stop use case in Play Mode
  const handleStopPlayMode = async () => {
    try {
      // Then do cleanup if we were in Play Mode
      if (playModeRef.current && currentTempPlaylistId) {
        await handlePlayMontageEnd(currentTempPlaylistId, {
          house,
          handlePlaylistChange, //playlist change 
          currentPlaylist,
          setPlaylists,
          playModeRef,
          // Don't need to stop again since we already did it
          onPlayEnd,
        });
      } else {
        console.log("[PlayerCommands] Not in Play Mode or no temp playlist, stop only");
        playModeRef.current = false;
      }
    } catch (error) {
      console.error("[PlayerCommands] Error in stop handling:", error);
      playModeRef.current = false;
    }
  };

  return useMemo(() => (
    <>
      {/* iOS Audio + Android Video Handler - shows when autoplay is blocked */}
      <IOSAudioAndroidVideoHandler
        onPlay={onPlay}
        handlePlayPause={handlePlayPause}
        theme={theme}
        variant="banner" // or "alert" - choose your preferred style
      />
      <Grid container spacing={1} className="player_commands" sx={{ flexGrow: 1 }}>
        {/* Volume control - reduced to xs={1} on mobile */}
        <Grid item xs={isMobile ? 2 : 3} style={{ textAlign: 'left', marginLeft: '0' }}>
          {isMobile ? (
            <Tooltip title={muted ? t("Unmute") : t("Mute")}>
              {/* TODO change to unmute_ and mute_ with translations */}
              <IconButton
                onClick={toggleMute}
                size="small"
                sx={{
                  position: 'relative',
                  zIndex: 5,
                  visibility: 'visible', // Force visibility
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.08)', // Add hover effect
                  }
                }}
                style={iconStyle}
              >
                {muted ? (
                  <VolumeOff
                    className={`tabs_icon ${iconClass}`}
                    // style={{ 
                    //   color: 'inherit',
                    //   visibility: 'visible', // Force icon visibility
                    //   opacity: 1 // Ensure full opacity
                    // }}
                    style={iconStyle}
                  />
                ) : (
                  <VolumeUp
                    className={`tabs_icon ${iconClass}`}
                    // style={{ 
                    //   color: 'inherit',
                    //   visibility: 'visible', // Force icon visibility
                    //   opacity: 1 // Ensure full opacity
                    // }}
                    style={iconStyle}
                  />
                )}
              </IconButton>
            </Tooltip>
          ) : (
            <Stack spacing={1} direction="row" sx={{ mt: 0.5, mb: 0.5 }} >
              <VolumeDown
                style={{ color: 'inherit', pointerEvents: "none", marginLeft: '0' }}
                fontSize="small"
                className={`tabs_icon ${iconClass}`}
                style={iconStyle}
              />
              <VolumeSlider volumeRef={volumeRef} onVolumeChange={handleVolumeChange} style={iconStyle} />

            </Stack>
          )}
        </Grid>

        {/* Playback controls - take more space on mobile */}
        <Grid item xs={isMobile ? 8 : 6} style={{ display: 'flex', textAlign: 'centre', justifyContent: 'centre', flexBasis: 'auto' }}>
          <Tooltip title={t("backward_")}>
            <IconButton onClick={onRew} disabled={playModeRef.current}>
              <FastRewindIcon
                className={`tabs_icon ${iconClass}`}
                style={iconStyle}
              />
            </IconButton>
          </Tooltip>
          <Tooltip title={isPlaying ? t("pause_") : t("play_")}>
            <IconButton onClick={handlePlayPause} disabled={playModeRef.current}>
              {isPlaying ? (
                <PauseIcon className={`tabs_icon ${iconClass}`} style={iconStyle} />
              ) : (
                <PlayArrowIcon className={`tabs_icon ${iconClass}`} style={iconStyle} />
              )}
            </IconButton>
          </Tooltip>
          <Tooltip title={t("stop_")}>
            <IconButton onClick={playModeRef.current ? handleStopPlayMode : handleStopWithIconUpdate} >
              <StopIcon className={`tabs_icon ${iconClass}`} style={iconStyle} />
            </IconButton>
          </Tooltip>
          <Tooltip title={t("forward_")}>
            <IconButton onClick={onFwd} disabled={playModeRef.current}>
              <FastForwardIcon
                className={`tabs_icon ${iconClass}`}
                style={iconStyle}
              />
            </IconButton>
          </Tooltip>
        </Grid>
        {/* TODO place on Line 2 */}
        {/* <Grid item xs={1} alignItems="right"> */}
        {/* Subtitles control if needed */}
        {/* <Tooltip title={t("subtitles_")}>
          <IconButton onClick={() => setSubtitled(prevSubtitled => !prevSubtitled)}>
            {setSubtitled ? (
              <SubtitlesOutlinedIcon className={`tabs_icon ${iconClass}`} />
            ) : (
              <SubtitlesOffOutlinedIcon className={`tabs_icon ${iconClass}`} />
            )}
          </IconButton>
        </Tooltip> */}
        {/* </Grid> */}

        <Grid item xs={isMobile ? 2 : 3} style={{ display: 'flex', justifyContent: 'right' }}>
          <FullScreen
            className={`tabs_icon ${iconClass}`}
            style={iconStyle}
          />
        </Grid>
      </Grid>
    </>
  ), [
    muted,
    playModeRef.current,
    currentPlaylist,
    currentTempPlaylistId,
    handlePlayPause,
    handleStopWithIconUpdate,
    handleStopPlayMode,
    onRew,
    onFwd,
    onPlay,
    iconClass,
    isMobile,
    toggleMute,
    handleVolumeChange
  ]);
}

PlayerCommands.propTypes = {
  onPlay: PropTypes.func,
  onPause: PropTypes.func,
  onStop: PropTypes.func,
  onRew: PropTypes.func,
  onFwd: PropTypes.func,
  setSubtitled: PropTypes.func,
  iconClass: PropTypes.string,
  responsiveProps: PropTypes.shape({
    isMobile: PropTypes.bool,
    isTablet: PropTypes.bool,
    isHD: PropTypes.bool,
    isUHD: PropTypes.bool,
    isSmartTV: PropTypes.bool,
    isSmartTVHD: PropTypes.bool,
    isSmartTVUHD: PropTypes.bool,
    isPortrait: PropTypes.bool,
    isLandscape: PropTypes.bool
  }),
  t: PropTypes.func,
  volumeRef: PropTypes.object,
  onVolumeChange: PropTypes.func,
  playModeRef: PropTypes.object,
  currentPlaylist: PropTypes.string,
  currentTempPlaylistId: PropTypes.string,
  house: PropTypes.string,
  setPlaylists: PropTypes.func,
  handlePlaylistChange: PropTypes.func,
  deletePlaylist: PropTypes.func,
  handlePlayMontageEnd: PropTypes.func,
  syncLoading: PropTypes.bool,
  setSyncLoading: PropTypes.func
};

export default React.memo(PlayerCommands, (prevProps, nextProps) => {
  return (
    prevProps.currentPlaylist === nextProps.currentPlaylist &&
    prevProps.currentTempPlaylistId === nextProps.currentTempPlaylistId &&
    prevProps.syncLoading === nextProps.syncLoading &&
    prevProps.playModeRef?.current === nextProps.playModeRef?.current &&
    prevProps.volumeRef?.current === nextProps.volumeRef?.current &&
    prevProps.responsiveProps.isMobile === nextProps.responsiveProps.isMobile
  );
});