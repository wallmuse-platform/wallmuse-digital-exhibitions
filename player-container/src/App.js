// App.js

// React core and hooks
import React, { useState, useCallback, useMemo, useEffect, memo, useRef, useReducer, lazy, Suspense } from "react";

// Styling and themes
import "./App.css";
import { ThemeProvider } from "@mui/material/styles";
import { CustomSnackbar, CustomAlert } from "./CustomComponents";

// Material UI components and icons
import { Grid, Stack, Tooltip, Box, Typography } from "@mui/material";

// Internationalization
import { useTranslation } from "react-i18next";

// Custom components
import PropTypes from 'prop-types';
import WebPlayer from './WebPlayer';
import VolumeSlider from './PlayerCommands/VolumeSlider';
import { FullScreen } from "./PlayerCommands/FullScreen.js";
import PlayerCommands from "./PlayerCommands/PlayerCommands";
import PlayerCommands2 from "./PlayerCommands/PlayerCommands2";
import TabButtons from "./PlayerCommands/TabButtons.js";

// Context providers
import { useEnvironments, EnvironmentsProvider } from "./contexts/EnvironmentsContext.js";
import { UIProvider } from './Playlists/contexts/UIContext';
import { useSession, SessionProvider } from './contexts/SessionContext';
import { PlaylistsProvider, usePlaylists } from './contexts/PlaylistsContext';
import { PlaylistProvider } from './Playlists/contexts/PlaylistContext';

// Other utilities and components
import { currentTheme, selectTheme } from "./theme/ThemeUtils";
import { getUserId, isDemoAccount } from "./utils/Utils";
import { sendCommand } from "./wsTools";
import { useResponsive } from './utils/useResponsive';
import navigationManager from './utils/NavigationManager';
const ShowMontages = lazy(() => import("./SelectMontages/MontageSelection.js"));
import Playlists from "./Playlists/playlists/PlayLists";
import DemoSnackbarsContainer from "./utils/DemoSnackbarsContainer.js";
import { CleanupTemporaryPlaylists } from "./Play/playModeUtils.js";
import useScreenPermission from './utils/useScreenPermission';
import BaseLine from "./theme/BaseLine";

// Accounts
import ActivateAccount from "./accounts/ActivateAccount";

// Error boundary components - kept for debugging purposes
import ErrorBoundary from './ErrorBoundary';
import { safeGet, safeArray } from './DebugUtils';
import { hasStaleAccountFlags, cleanupAccountFlags } from "./accounts/accountCleanup";

//Logging users
// import * as Sentry from "@sentry/react";

// Initialization Coordination Mechanism
// Overview
// This application uses a coordination mechanism (WallmuseInit) to ensure that the main app and web player components initialize in the correct sequence, preventing race conditions that could cause video playback issues.
// Key Components
// index.html
// Creates the global WallmuseInit object in the <head> section
// Tracks readiness of both player and webplayer components
// Provides methods for components to signal when they're ready
// Allows components to wait for other components to be ready
// index.js (Main App)
// Creates a fallback WallmuseInit if not found in HTML
// Signals when the main app is mounted and ready using WallmuseInit.ready('player')
// Includes a safety timeout to force ready state if initialization hangs
// App.js
// Accepts onAppReady callback from index.js
// Calls this callback after initial render to signal readiness
// Contains the WebPlayer component which coordinates with the main app
// WebPlayer Component
// Waits for the main player to be ready before proceeding with initialization
// Checks WallmuseInit._playerReady to determine if it needs to wait
// Uses WallmuseInit.playerReady() to wait for the player if necessary
// Signals its own readiness using WallmuseInit.ready('webplayer') after initialization
// Includes timeout and error handling to prevent deadlocks
// Flow Sequence
// HTML creates WallmuseInit (or index.js creates fallback)
// Main app initializes and signals readiness
// WebPlayer checks if main app is ready before proceeding
// WebPlayer completes initialization and signals its readiness
// Both components are ready, and any queued callbacks are processed
// Best Practices
// Always check if WallmuseInit exists before using it
// Signal component readiness even when errors occur to prevent deadlocks
// Use timeouts to ensure the system recovers if initialization hangs

// First, update the App function to accept and use the onAppReady prop

function App({ onAppReady }) {
  console.log("[App InitMechanism] started");

  // Add useEffect to signal app ready after initial render
  useEffect(() => {
    console.log("[App InitMechanism] Initial render complete, calling onAppReady");
    if (onAppReady && typeof onAppReady === 'function') {
      onAppReady();
    }
  }, [onAppReady]);

  return (
    <SessionProvider>
      <EnvironmentsProvider>
        <PlaylistsProvider>
          <div className="App">
            <DontStartBefore />
          </div>
        </PlaylistsProvider>
      </EnvironmentsProvider>
    </SessionProvider>
  );
}

export default App;

function DontStartBefore() {
  console.log("[DontStartBefore] started");

  // 1. ALL useState calls first
  const volumeRef = useRef(parseInt(localStorage.getItem('wallmuse-volume') || '0'));
  const playModeRef = useRef(false);

  // 2. ALL context hooks
  const {
    house,
    environments,
    currentPlaylist,
    setCurrentPlaylist,
    initialLoading,
    syncLoading,
    error,
    needsRefresh,
    setNeedsRefresh,
    resetRefreshNeeded
  } = useEnvironments();

  // All component state
  const [cleanupComplete, setCleanupComplete] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const { playlists, setPlaylists, playlistsLoading } = usePlaylists();

  const { t } = useTranslation();
  const theme = selectTheme();

  // Logging current state
  console.log(
    "[DontStartBefore] house:", house,
    "environments.length:", environments?.length ?? 0,
    "currentPlaylist:", currentPlaylist,
    "initalLoading:", initialLoading,
    "syncLoading:", syncLoading,
    "playlistsLoading:", playlistsLoading
  );

  // 3. Derived values and utilities
  const userId = getUserId();
  const isDemo = isDemoAccount(userId);
  console.log('[DontStartBefore DEBUG] isDemoAccount(userId):', isDemoAccount(userId));

  // 4. useCallback (after state is defined)
  const handleCleanupComplete = useCallback(() => {
    console.log("[DontStartBefore] Cleanup complete");
    setCleanupComplete(true);
  }, []);

  // 5. Custom permission hook to use the screen prompty browser one
  const { checkPermission, PermissionDialog } = useScreenPermission({
    t: t,
    onStatusChange: (status) => {
      console.log("[DontStartBefore] Screen permission status changed:", status);
    }
  });

  // 6. useEffect calls: check permission
  useEffect(() => {
    if (!isDemo) {
      checkPermission();
    } else {
      // For demo accounts, auto-complete permission check
      console.log("[DontStartBefore] Demo account - auto-completing permission check");
      setPermissionGranted(granted => {
        if (!granted) {
          console.log("[DontStartBefore] Setting permissionGranted to true");
        }
        return true;
      });
      // Cleanup will run normally after this - CleanupTemporaryPlaylists component will handle it
    }
  }, [isDemo]);

  // 7. Early returns and render logic

  // Handle loading state
  console.log("[DontStartBefore] initialLoading: ", initialLoading, ", syncLoading: ", syncLoading, ", playlistsLoading: ", playlistsLoading);
  if (initialLoading || syncLoading || playlistsLoading) {

    return <div className="loader"><p>Loading environment and playlist data...</p></div>;
  }

  // Handle errors first
  if (error) {
    return <div className="error-message">{error}</div>;
  }

  // Ensure essential data is available
  if (!house) {
      return <div className="error-message">House data is missing. Please try reloading the page.</div>;
  }

  // Allow environments to be empty - child WebPlayer will create default environment
  if (environments.length === 0) {
      console.log("[DontStartBefore] No environments found, but proceeding - WebPlayer will create default environment");
  }

  // Cleanup phase
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

  if (isDemo && hasStaleAccountFlags()) {
    console.log('[DontStartBefore] Detected stale account flags on demo account, cleaning up');
    cleanupAccountFlags('demo-stale-flags', true);
  }

  // Ready to render the main app
  console.log("[DontStartBefore] Finished, rendering PlayerIntegration");
  return (
    <div className="PlayerIntegration">
      <PermissionDialog theme={theme} />
      <PlayerIntegration
        theme={theme}
        volumeRef={volumeRef}
        playModeRef={playModeRef}
      />
    </div>
  );
}

// Utility function to send commands to the house
export const handleSendCommand = (command, house) => {
  console.log('[handleSendCommand] DEBUG: Starting command send', { command, house, houseType: typeof house });

  if (!house) {
    console.error('[handleSendCommand] House ID is null, cannot send command.');
    return;
  }

  if (house === 'undefined' || house === 'null') {
    console.error('[handleSendCommand] House ID is string "undefined" or "null", cannot send command.');
    return;
  }

  console.log('[App] Sending command:', command, 'to house:', house);
  sendCommand(house, command, (success, response) => {
    if (success) {
      console.log('[App] Command sent successfully:', response);
    } else {
      console.error('[App] Command failed:', response);
    }
  });
};

// Export the stop command with useCallback
export const useStopCommand = (house) => {
  return useCallback(() => {
    handleSendCommand('<vlc><cmd action="stop"/></vlc>', house);
  }, [house]);
};

let currentPlaylistPosition = 0; //  Module-level variable

//  REMOVED: currentMontageIndexRef moved inside component
// const currentMontageIndexRef = useRef(0);

//  REMOVED: These are no longer needed after removing duplicate navigation event

export const getCurrentPosition = () => {
  const videoElement = document.querySelector('.web-player-content video');
  if (videoElement && videoElement.currentTime > 0) {
    return currentPlaylistPosition; //  Can access module variable
  }
  return 0;
};

export const updatePosition = (newPosition) => {
  currentPlaylistPosition = newPosition; //  Can update module variable
  console.log(`[PLAYLIST_POSITION] Updated position to: ${newPosition}`);
};


// PlayerIntegration component - removed memo to allow playlists context updates to propagate
function PlayerIntegration({ theme, volumeRef, playModeRef }) {
  // console.log("[App PlayerIntegration] Props received with volumeRef:", { house, environments, currentPlaylist, setCurrentPlaylist, volumeRef });

  const userId = getUserId();
  const { session } = useSession();
  const isDemo = isDemoAccount(userId);

  // Re get all necessary context data
  const {
    house,
    environments,
    currentPlaylist,
    setCurrentPlaylist,
    initialLoading,
    syncLoading,
    setSyncLoading,
    error,
    needsRefresh,
    setNeedsRefresh,
    resetRefreshNeeded
  } = useEnvironments();

  const { playlists, setPlaylists } = usePlaylists();

  const { t } = useTranslation();

  const MIN_PLAYER_WIDTH = 320;
  const responsiveProps = useResponsive();

  const [currentTempPlaylistId, setCurrentTempPlaylistId] = useState(null);
  const [playModeOneSec, setPlayModeOneSec] = useState(false);
  const [selectedPlaylistPositionForWebPlayer, setSelectedPlaylistPositionForWebPlayer] = useState(null);
  const selectedPlaylistPositionForWebPlayerRef = useRef(null);
  const currentMontageIndexRef = useRef(0); //  ADD: Current montage index ref
  const [currentMontageIndexState, setCurrentMontageIndexState] = useState(0);
  const playlistChangeInProgressRef = useRef(false); // Track playlist changes in progress
  const [accountCreatedSuccess, setAccountCreatedSuccess] = useState(false);
  const [accountSetupPhase, setAccountSetupPhase] = useState('initial');

  // Generate safe montage order signature
  const currentPlaylistObj = useMemo(() => 
    safeArray.find(playlists, p => p.id === currentPlaylist), 
    [playlists, currentPlaylist]
  );
  const montages = useMemo(() => 
    safeGet(currentPlaylistObj, 'montages', []), 
    [currentPlaylistObj]
  );
  const montageOrderSignature = useMemo(() => 
    safeArray.map(montages, m => m.id).join(','), 
    [montages]
  );

  // State for overlay info
  const [webPlayerOverlayInfo, setWebPlayerOverlayInfo] = useState({
    playlistName: '',
    montageName: '',
    track: ''
  });

  console.log('[App PlayerIntegration] isDemo, currentTheme(), theme, userId/session', isDemo, currentTheme(), theme, userId);
  const { isMobile, isTablet, isHD, isUHD, isSmartTVHD, isSmartTVUHD } = responsiveProps;
  // Updated icon class logic with SmartTV considerations
  const iconClass = useMemo(() => {
    if (isMobile) return 'small-icon';
    if (isTablet) return 'tablet-icon';
    if (isHD) return 'hd-icon';
    if (isUHD) return 'uhd-icon';
    if (isSmartTVHD) return 'large-icon';  // Assuming larger icons for HD SmartTVs
    if (isSmartTVUHD) return 'xlarge-icon'; // Assuming even larger icons for 4K SmartTVs
    return ''; // default if none apply
  }, [isMobile, isTablet, isHD, isUHD, isSmartTVHD, isSmartTVUHD]);

  // At the beginning of your component, read the stored phase for account creation
  useEffect(() => {
    const storedPhase = localStorage.getItem('currentSetupPhase');
    if (storedPhase) {
      setAccountSetupPhase(storedPhase);
      setAccountCreatedSuccess(true);
      // Clear it after reading to avoid showing stale messages
      localStorage.removeItem('currentSetupPhase');
    }
  }, []);

  /** Play Mode */

  const handleTempPlaylistCreated = (playlistId) => {
    console.log("[App PlayerIntegration] Setting temp playlist ID:", playlistId);
    setCurrentTempPlaylistId(playlistId);
  };

  const previousPlaylist = useRef(null); // Stores the previous playlist to prevent redundant updates
  // console.log("[App TrackSelection] Playlists data:", playlists);

  // Get current screen ID - This assumes you know the current environment and screen
  const currentEnvironment = environments.find(env => env.alive === "1"); // Get active environment
  // console.log("[App TrackSelection] Current environment:", currentEnvironment);

  const currentScreenId = currentEnvironment?.screens?.[0]?.id; // Get first screen of active environment
  // console.log("[App TrackSelection] Current screen ID:", currentScreenId);

  // Function to handle starting Play Mode for a montage
  const handlePlayStart = () => {
    playModeRef.current = true;
    setPlayModeOneSec(true);    // Temporary 1-second visual effect
    setTimeout(() => setPlayModeOneSec(false), 1000); // Turn off after 1 second
  };

  // Function to handle ending Play Mode and switching back to Playlist Mode
  const handlePlayEnd = () => {
    playModeRef.current = false;
  };

  /** Overlay */

  // Calculate overlay info
  const calculateOverlayInfo = useCallback((playlistId, montagePosition, track) => {
    // Only log when values actually change
    const newState = { playlistId, montagePosition, track };
    const lastState = window.lastOverlayCalc;
    const hasChanged = !lastState || 
      lastState.playlistId !== newState.playlistId ||
      lastState.montagePosition !== newState.montagePosition ||
      lastState.track !== newState.track;
    
    if (hasChanged) {
      console.log('[Overlay] Calculating info:', newState);
      window.lastOverlayCalc = newState;
    }
    
    if (!playlists || !playlistId) {
      return { playlistName: '', montageName: '', track: '' };
    }
    
    // Find playlist
    const playlist = playlists.find(p => p.id === playlistId);
    const playlistName = playlist?.name || `Playlist ${playlistId}`;
    
    // Find montage
    const montage = playlist?.montages?.[montagePosition];
    const montageName = montage?.name || `Montage ${(montagePosition || 0) + 1}`;
    
    const overlayInfo = {
      playlistName,
      montageName,
      track: track || '1'
    };
    
    if (hasChanged) {
      console.log('[Overlay] Result:', overlayInfo);
    }
    
    return overlayInfo;
  }, [playlists]);

  /** Track */

  //  1. Calculate track for current screen display
  const selectedTrackForScreen = useMemo(() => {
    if (!playlists || !currentScreenId) {
      return '1';
    }

    const playlist = playlists.find(p => p.id === currentPlaylist);
    if (!playlist) {
      return '1';
    }

    const currentMontageIndex = currentMontageIndexState;
    const activeMontage = playlist.montages?.[currentMontageIndex] || playlist.montages?.[0];

    if (!activeMontage) {
      return '1';
    }

    const montageScreenDetail = activeMontage.screens?.find(s => String(s.id) === String(currentScreenId));
    const trackToUse = montageScreenDetail?.seq || '1';
    
    return trackToUse;
  }, [playlists, currentPlaylist, currentScreenId, currentMontageIndexState]);

  //  2. Function to update current montage index during playback
  const updateCurrentMontageIndex = useCallback((newIndex) => {
    console.log(`[App PlayerIntegration Track MONTAGE_INDEX NAV] Updating current montage index from ${currentMontageIndexRef.current} to ${newIndex}`);
    currentMontageIndexRef.current = newIndex;
    setCurrentMontageIndexState(newIndex); //  ADD: Update state to trigger useEffect
  }, []);

  //  3. Function to get track for a specific montage index (for track calculation)
  const getTrackForMontageIndex = useCallback((playlistId, montageIndex) => {
    if (!playlists || montageIndex === null || montageIndex === undefined) {
      return '1';
    }

    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist || !playlist.montages) {
      return '1';
    }

    const montage = playlist.montages[montageIndex];
    if (!montage) {
      return '1';
    }

    const currentEnvironment = environments.find(env => env.alive === "1");
    const currentScreenId = currentEnvironment?.screens?.[0]?.id;

    if (!currentScreenId) {
      return '1';
    }

    const montageScreenDetail = montage.screens?.find(s => String(s.id) === String(currentScreenId));
    const finalTrack = montageScreenDetail?.seq || '1';
    
    return finalTrack;
  }, [playlists, environments]);

  // Single navigation handler for NavigationManager (declare first)
  const useNavigationManager = useCallback((playlistId, montageIndex, track = null) => {
    navigationManager.addCommand({
      playlist: playlistId,
      position: { montage: montageIndex, track: track }
    });
  }, []);

  // 1. Add state for playlist changes
  const [isPlaylistChanging, setIsPlaylistChanging] = useState(false);
  const playlistChangeTimeoutRef = useRef(null);
  const navigationDebounceRef = useRef(null);

  // 2. Cleanup effect
  useEffect(() => {
    return () => {
      if (navigationDebounceRef.current) {
        clearTimeout(navigationDebounceRef.current);
      }
      if (playlistChangeTimeoutRef.current) {
        clearTimeout(playlistChangeTimeoutRef.current);
      }
    };
  }, []);

  // // 3. Consolidated navigation handler
  // const handleMontageNavigation = useCallback((selectedPlaylistId, selectedPlaylistPosition) => {
  //   console.log('[NAV] handleMontageNavigation:', { selectedPlaylistId, selectedPlaylistPosition });
    
  //   // Normalize position - convert null to 0 for playlist changes
  //   const normalizedPosition = selectedPlaylistPosition === null ? 0 : selectedPlaylistPosition;
    
  //   // Prevent duplicate calls
  //   const currentState = { playlist: selectedPlaylistId, position: normalizedPosition };
  //   const lastState = window.lastNavigationState;
    
  //   if (lastState && 
  //       lastState.playlist === currentState.playlist && 
  //       lastState.position === currentState.position) {
  //     console.log('[NAV] Skipping duplicate call');
  //     return; // Skip duplicates
  //   }
    
  //   window.lastNavigationState = currentState;
    
  //   // Detect playlist changes
  //   const isPlaylistChange = selectedPlaylistId !== currentPlaylist;
    
  //   if (isPlaylistChange) {
  //     console.log('[NAV] Playlist change detected, setting flag');
  //     setIsPlaylistChanging(true);
      
  //     // 🚀 CRITICAL: Update UI state immediately for playlist changes
  //     console.log('[NAV] Updating currentPlaylist from', currentPlaylist, 'to', selectedPlaylistId);
  //     setCurrentPlaylist(selectedPlaylistId);
      
  //     // Clear any existing timeout
  //     if (playlistChangeTimeoutRef.current) {
  //       clearTimeout(playlistChangeTimeoutRef.current);
  //     }
      
  //     // Set timeout to clear the flag
  //     playlistChangeTimeoutRef.current = setTimeout(() => {
  //       setIsPlaylistChanging(false);
  //       console.log('[NAV] Playlist change flag cleared');
  //     }, 2000); // Give enough time for playlist to fully load
  //   }
    
  //   // Calculate values once
  //   const calculatedTrack = getTrackForMontageIndex(selectedPlaylistId, normalizedPosition);
  //   const overlayInfo = calculateOverlayInfo(selectedPlaylistId, normalizedPosition, calculatedTrack);
    
  //   // Update all states together
  //   setSelectedPlaylistPositionForWebPlayer(normalizedPosition);
  //   selectedPlaylistPositionForWebPlayerRef.current = normalizedPosition;
  //   setWebPlayerOverlayInfo(overlayInfo);
  //   updateCurrentMontageIndex(normalizedPosition);
    
  //   // Update refs immediately
  //   window.SELECTED_TRACK = calculatedTrack;
    
  //   // Single navigation call - no setTimeout needed
  //   navigationManager.addCommand({
  //     playlist: selectedPlaylistId,
  //     position: { montage: normalizedPosition, track: calculatedTrack }
  //   });
    
  // }, [getTrackForMontageIndex, calculateOverlayInfo, updateCurrentMontageIndex, currentPlaylist, setCurrentPlaylist]);

  // 3. Consolidated navigation handler - FIXED VERSION
  // Fixed handleMontageNavigation function in App.js
  const handleMontageNavigation = useCallback((selectedPlaylistId, selectedPlaylistPosition, force = false) => {
    console.log('[NAV] handleMontageNavigation:', { selectedPlaylistId, selectedPlaylistPosition, force });

    // Set global reference for NavigationManager to the target playlist
    window.currentPlaylistForNav = selectedPlaylistId;

    // CRITICAL FIX: Ensure window.currentPlaylist has the full playlist object
    // This is needed for child iframe's parent-child communication
    const targetPlaylistObject = playlists.find(p => String(p.id) === String(selectedPlaylistId));
    if (targetPlaylistObject) {
      window.currentPlaylist = targetPlaylistObject;
      console.log('[NAV] Updated window.currentPlaylist for child iframe access:', targetPlaylistObject.name || targetPlaylistObject.id);
    } else {
      console.warn('[NAV] Could not find playlist object for ID:', selectedPlaylistId);
    }

    // ADDED: Mark that we're doing a navigation update
    window.recentNavigationUpdate = Date.now();

    // Handle position normalization
    let normalizedPosition;
    if (selectedPlaylistPosition === null || selectedPlaylistPosition === undefined) {
      normalizedPosition = 0;
      console.log('[NAV] No position specified, defaulting to 0');
    } else {
      normalizedPosition = selectedPlaylistPosition;
      console.log('[NAV] Using specified position:', normalizedPosition);
    }

    // Prevent duplicate calls (unless force=true)
    const currentState = { playlist: selectedPlaylistId, position: normalizedPosition };
    const lastState = window.lastNavigationState;

    if (!force && lastState &&
        lastState.playlist === currentState.playlist &&
        lastState.position === currentState.position) {
      console.log('[NAV] Skipping duplicate call (use force=true to override)');
      return;
    }

    window.lastNavigationState = currentState;
    
    // Detect playlist changes
    const isPlaylistChange = selectedPlaylistId !== currentPlaylist;
    
    // CRITICAL FIX: Always update currentPlaylist for playlist changes
    if (isPlaylistChange) {
      console.log('[NAV] Playlist change detected:', currentPlaylist, '->', selectedPlaylistId);
      
      // 🚀 IMMEDIATE playlist state update
      setCurrentPlaylist(selectedPlaylistId);
      
      // Set playlist changing flag
      setIsPlaylistChanging(true);
      
      // Clear any existing timeout
      if (playlistChangeTimeoutRef.current) {
        clearTimeout(playlistChangeTimeoutRef.current);
      }
      
      // Set timeout to clear the flag
      playlistChangeTimeoutRef.current = setTimeout(() => {
        setIsPlaylistChanging(false);
        console.log('[NAV] Playlist change flag cleared');
      }, 2000);
    }
    
    // Calculate values using the NEW playlist (not the old currentPlaylist)
    const targetPlaylist = isPlaylistChange ? selectedPlaylistId : currentPlaylist;
    const calculatedTrack = getTrackForMontageIndex(targetPlaylist, normalizedPosition);
    const overlayInfo = calculateOverlayInfo(targetPlaylist, normalizedPosition, calculatedTrack);
    
    console.log('[NAV] Calculated values:', { 
      targetPlaylist,
      normalizedPosition, 
      calculatedTrack, 
      overlayInfo 
    });
    
    // Update all states together
    setSelectedPlaylistPositionForWebPlayer(normalizedPosition);
    selectedPlaylistPositionForWebPlayerRef.current = normalizedPosition;
    setWebPlayerOverlayInfo(overlayInfo);
    updateCurrentMontageIndex(normalizedPosition);
    
    // Update global refs
    window.SELECTED_TRACK = calculatedTrack;
    
    // Send command to NavigationManager
    navigationManager.addCommand({
      playlist: selectedPlaylistId, // Always use the target playlist
      position: { montage: normalizedPosition, track: calculatedTrack }
    });

  }, [playlists, getTrackForMontageIndex, calculateOverlayInfo, updateCurrentMontageIndex, currentPlaylist, setCurrentPlaylist]);
    
  //  5. Optional: Listen for playback events to update current montage index
  useEffect(() => {
    const handleMontageChange = (event) => {
      const { montageIndex } = event.detail;
      if (montageIndex !== undefined && montageIndex !== null) {
        console.log('[App PlayerIntegration PLAYBACK NAV] Montage changed to index:', montageIndex);
        updateCurrentMontageIndex(montageIndex);
      }
    };

    window.addEventListener('webplayer-montage-changed', handleMontageChange);

    return () => {
      window.removeEventListener('webplayer-montage-changed', handleMontageChange);
    };
  }, [updateCurrentMontageIndex]);

  //  6. WebSocket playlist change coordination
  useEffect(() => {
    const handlePlaylistWebSocketChange = (event) => {
      const { playlistId } = event.detail;
      console.log('[WS] Playlist change via WebSocket:', playlistId);
      
      // Coordinate with navigation state
      if (playlistId !== currentPlaylist) {
        setIsPlaylistChanging(true);
        
        // Clear timeout and set new one
        if (playlistChangeTimeoutRef.current) {
          clearTimeout(playlistChangeTimeoutRef.current);
        }
        
        playlistChangeTimeoutRef.current = setTimeout(() => {
          setIsPlaylistChanging(false);
        }, 2000);
      }
    };
    
    window.addEventListener('webplayer-playlist-changed', handlePlaylistWebSocketChange);
    
    return () => {
      window.removeEventListener('webplayer-playlist-changed', handlePlaylistWebSocketChange);
      if (playlistChangeTimeoutRef.current) {
        clearTimeout(playlistChangeTimeoutRef.current);
      }
    };
  }, [currentPlaylist]);

  // Initialize NavigationManager (ONCE only)
  useEffect(() => {
    if (playlists && environments) {
      // Set NavigationManager as ready
      navigationManager.setReady(true);
      
      // Only initialize if we don't have a current playlist
      // and we're not in the middle of a playlist change
      if (!currentPlaylist && !isPlaylistChanging && !window.navigationInitialized) {
        // Use currentPlaylist value (which is undefined for default playlist)
        console.log('[NAV INIT] Using currentPlaylist for initialization:', currentPlaylist);
        const initialTrack = getTrackForMontageIndex(currentPlaylist, 0);
        navigationManager.addCommand({
          playlist: currentPlaylist,
          position: { montage: 0, track: initialTrack }
        });
        window.navigationInitialized = true;
      }
    }
  }, [playlists, environments, isPlaylistChanging, currentPlaylist, getTrackForMontageIndex]); // Add currentPlaylist dependency

  // Note: Re-render handling is already managed by EnvironmentsContext
  // No need for duplicate onAppRerender calls here

  //  6. AUTOMATIC: Calculate track for every montage whenever current montage changes
  useEffect(() => {
    // Skip all automatic navigation during playlist changes
    if (isPlaylistChanging) {
      console.log('[AUTO_TRACK] Skipping due to playlist change in progress');
      return;
    }
    
    // Only log when there's an actual change
    const hasChanged = window.lastAutoTrackState !== currentMontageIndexState;
    if (hasChanged) {
      console.log('[AUTO_TRACK] 🔄 Montage changed to index:', currentMontageIndexState);
      window.lastAutoTrackState = currentMontageIndexState;
    }

    // Skip if no data
    if (!playlists || !currentPlaylist) {
      return;
    }

    // Only update overlay info, don't trigger navigation
    const currentMontageIndex = currentMontageIndexState;
    const currentTrack = getTrackForMontageIndex(currentPlaylist, currentMontageIndex);
    const overlayInfo = calculateOverlayInfo(currentPlaylist, currentMontageIndex, currentTrack);

    setWebPlayerOverlayInfo(overlayInfo);
    setSelectedPlaylistPositionForWebPlayer(currentMontageIndex);
    selectedPlaylistPositionForWebPlayerRef.current = currentMontageIndex;

    // NO NAVIGATION HERE - only UI updates
  }, [currentMontageIndexState, currentPlaylist, playlists, getTrackForMontageIndex, calculateOverlayInfo, isPlaylistChanging]);

  console.log('[App PlayerIntegration NAV] Selected track for screen:', selectedTrackForScreen, 'Screen ID:', currentScreenId);

  // Send ALL track mappings when playlist loads
  useEffect(() => {
    if (!currentPlaylist || !playlists || !currentScreenId) return;

    const playlist = playlists.find(p => p.id === currentPlaylist);
    if (!playlist?.montages) return;

    // CRITICAL: Use montage ID as key (not position) so mappings persist across reordering
    const trackMappings = {};
    playlist.montages.forEach((montage, index) => {
      const montageScreenDetail = montage.screens?.find(s => String(s.id) === String(currentScreenId));
      const track = montageScreenDetail?.seq || '1';
      // Use montage ID as key to make mappings stable across reordering
      trackMappings[montage.id] = track;
    });

    console.log('[App] Sending all track mappings for playlist:', currentPlaylist, trackMappings);

    const sendTrackMappings = (retryCount = 0) => {
      if (window.webPlayerSetTrackMappings) {
        console.log('[App] ✅ Calling webPlayerSetTrackMappings with:', trackMappings);
        window.webPlayerSetTrackMappings(trackMappings);

        // NOTE: Do NOT trigger navigation here when montage order changes
        // The WebPlayer's peer synchronization system will handle montage reordering
        // Triggering navigation here causes issues because selectedPlaylistPositionForWebPlayer
        // is position-based and becomes stale after reordering
      } else if (retryCount < 5) {
        console.log(`[App] ⏳ WebPlayer not ready yet, retrying in 200ms (attempt ${retryCount + 1}/5)`);
        setTimeout(() => sendTrackMappings(retryCount + 1), 200);
      } else {
        console.warn('[App] ⚠️ WebPlayer function not available after 5 retries');
      }
    };

    sendTrackMappings();
  }, [currentPlaylist, playlists, currentScreenId]);

  // Send navigation command when track changes
  useEffect(() => {
    if (selectedTrackForScreen && currentPlaylist && selectedPlaylistPositionForWebPlayer !== null) {
      console.log('[App] Track changed, sending navigation command:', {
        playlist: currentPlaylist,
        montage: selectedPlaylistPositionForWebPlayer,
        track: selectedTrackForScreen
      });

      useNavigationManager(currentPlaylist, selectedPlaylistPositionForWebPlayer, selectedTrackForScreen);
    }
  }, [selectedTrackForScreen, currentPlaylist, selectedPlaylistPositionForWebPlayer, useNavigationManager]);

  /** Player command functions */

  const onPlay = useCallback(() => handleSendCommand('<vlc><cmd action="play"/></vlc>', house), [house]);
  const onPause = useCallback(() => handleSendCommand('<vlc><cmd action="pause"/></vlc>', house), [house]);
  const onStop = useCallback(() => handleSendCommand('<vlc><cmd action="stop"/></vlc>', house), [house]);
  const onRew = useCallback(() => handleSendCommand('<vlc><cmd action="prev"/></vlc>', house), [house]);
  const onFwd = useCallback(() => handleSendCommand('<vlc><cmd action="next"/></vlc>', house), [house]);

  // Single volume change handler that does both jobs
  const onVolumeChange = useCallback((v) => {
    // Store the current volume value
    volumeRef.current = v;
    console.log('[PlayerIntegration onVolumeChange] Current volume:', volumeRef.current);
    // Send command to house
    handleSendCommand('<vlc><cmd action="volume" param="' + v + '"/></vlc>', house);
  }, [house, volumeRef]); // Only house is a dependency

  console.log('[PlayerIntegration] playModeRef', playModeRef);

  useEffect(() => {
    console.log("[App] useEffect: Refresh handling started");

    // Get initial state from localStorage
    const refreshShown = localStorage.getItem('refreshShown') === 'true';
    const needsRefresh = localStorage.getItem('needsRefresh') === 'true';
    const needsSecondRefresh = localStorage.getItem('needsSecondRefresh') === 'true';
    const refreshAttempts = parseInt(localStorage.getItem('refreshAttempts') || '0');
    const accountJustCreated = localStorage.getItem('accountJustCreated') === 'true';
    const activationInProgress = localStorage.getItem('activationInProgress') === 'true';
    const activationComplete = localStorage.getItem('activationComplete') === 'true';
    const guestUserId = localStorage.getItem('guestUserId');
    const wpSessionId = localStorage.getItem('wpSessionId');

    console.log("[App] Initial localStorage state:", {
      refreshShown,
      needsRefresh,
      needsSecondRefresh,
      refreshAttempts,
      accountJustCreated,
      activationInProgress,
      activationComplete,
      guestUserId,
      wpSessionId
    });

    // Add handler for account phase changes
    const handleAccountPhaseChange = (event) => {
      const { phase } = event.detail;
      console.log(`[App] Account phase change event: ${phase}`);

      setAccountSetupPhase(phase);
      setAccountCreatedSuccess(true);
    };

    // Add event listener for screen refresh
    const handleScreenNeedsRefresh = () => {
      console.log("[App] Screen needs refresh event received");
      setNeedsRefresh(true);
      localStorage.setItem('refreshShown', 'true');
      console.log("[App l.456] Set needsRefresh flag via event");
    };

    // Set up all event listeners
    window.addEventListener('account-phase-change', handleAccountPhaseChange);
    window.addEventListener('screen-needs-refresh', handleScreenNeedsRefresh);

    // Check for stored phase on load
    const storedPhase = localStorage.getItem('currentSetupPhase');
    if (storedPhase) {
      console.log(`[App] Found stored phase: ${storedPhase}`);
      setAccountSetupPhase(storedPhase);
      setAccountCreatedSuccess(true);
    }
    // Determine account setup phase - priority ordered for clarity
    else if (refreshAttempts >= 3) {
      // Error state - too many attempts
      console.log("[App] Setting phase: RETRY (too many refresh attempts)");
      setAccountSetupPhase('retry');
      setAccountCreatedSuccess(true);
    }
    else if (activationComplete && !needsRefresh && !needsSecondRefresh) {
      // Final completion state
      console.log("[App] Setting phase: COMPLETED (activation complete, no refreshes needed)");
      setAccountSetupPhase('completed');
      setAccountCreatedSuccess(true);

      // Clear any leftover flags
      localStorage.removeItem('activationInProgress');
      localStorage.removeItem('refreshAttempts');
      localStorage.removeItem('currentSetupPhase');
    }
    else if (activationComplete && refreshAttempts > 0 && refreshAttempts < 3) {
      // Post-refresh optimization state
      console.log("[App] Setting phase: OPTIMIZING (activation complete, still refreshing)");
      setAccountSetupPhase('optimizing');
      setAccountCreatedSuccess(true);
      localStorage.setItem('currentSetupPhase', 'optimizing');
    }
    else if (needsSecondRefresh) {
      // Second refresh state - finalizing screen dimensions (DATA REFRESH ONLY)
      console.log("[App] Setting phase: FINALIZING (refreshing environment data)");
      setAccountSetupPhase('finalizing');
      setAccountCreatedSuccess(true);
      localStorage.setItem('currentSetupPhase', 'finalizing');
    }
    else if (needsRefresh) {
      // First refresh state
      console.log("[App] Setting phase: SETUP (needs first refresh)");
      setAccountSetupPhase('setup');
      setAccountCreatedSuccess(true);
    }
    else if (activationInProgress) {
      // Account creation in progress
      console.log("[App] Setting phase: CREATING (activation in progress)");
      setAccountSetupPhase('creating');
      setAccountCreatedSuccess(true);
    }
    else if (accountJustCreated) {
      // Initial state
      console.log("[App] Setting phase: PREPARING (account just created)");
      setAccountSetupPhase('preparing');
      setAccountCreatedSuccess(true);
    }

    // Safety check for too many refresh attempts
    if (refreshAttempts > 3) {
      console.log("[App] Too many refresh attempts, stopping refresh cycle");
      // Clear all refresh-related flags
      localStorage.removeItem('needsRefresh');
      // localStorage.removeItem('needsSecondRefresh'); // COMMENTED OUT - issue fixed in child WebPlayer
      localStorage.removeItem('activationInProgress');
      localStorage.removeItem('refreshAttempts');
      localStorage.removeItem('refreshShown');
      localStorage.removeItem('currentSetupPhase');
      return;
    }

    // Handle first refresh (user-initiated)
    if (needsRefresh) {
      console.log("[App] needsRefresh flag detected, will show refresh dialog");
      setNeedsRefresh(true);
      localStorage.setItem('refreshShown', 'true');
      console.log("[App l.526] Updated needsRefresh state:", { shouldRefresh: true });
    }

    // Handle second refresh (automatic) - Re-enabled for working 2-mount approach
    if (needsSecondRefresh) {
      console.log("[App] needsSecondRefresh flag detected - performing automatic refresh for screen dimensions");

      // Increment attempts counter before performing refresh
      const newAttemptCount = refreshAttempts + 1;
      localStorage.setItem('refreshAttempts', newAttemptCount.toString());
      console.log(`[App l.536] Incremented refresh attempts to ${newAttemptCount}`);

      // Clear the second refresh flag to prevent immediate loops
      localStorage.removeItem('needsSecondRefresh');

      // If this is the final attempt, also clear other flags
      if (newAttemptCount >= 3) {
        console.log("[App] Final refresh attempt, clearing all refresh flags");
        localStorage.removeItem('needsRefresh');
        localStorage.removeItem('activationInProgress');
        localStorage.removeItem('refreshShown');
        localStorage.removeItem('currentSetupPhase');
      } else {
        // Perform automatic refresh for screen dimension detection
        console.log("[App] Executing automatic refresh for screen dimension population");
        setTimeout(() => {
          window.location.reload();
        }, 1000); // 1 second delay
      }
    }

    // Handle activation complete event for new accounts
    const handleActivationComplete = () => {
      console.log('[App] Activation complete event received');
      // Force re-render by updating needsRefresh state
      setNeedsRefresh({ shouldRefresh: false });
    };

    // Add activation complete event listener
    window.addEventListener('activation-complete', handleActivationComplete);

    // Cleanup function - must be at the end of useEffect
    return () => {
      window.removeEventListener('account-phase-change', handleAccountPhaseChange);
      window.removeEventListener('screen-needs-refresh', handleScreenNeedsRefresh);
      window.removeEventListener('activation-complete', handleActivationComplete);
    };
  }, [setNeedsRefresh, setAccountCreatedSuccess, setAccountSetupPhase]);

  // Function to get message based on the current phase
  const getAccountSetupMessage = () => {
    switch (accountSetupPhase) {
      case 'preparing':
        return t("status.account.preparing") || "Preparing your account...";
      case 'creating':
        return t("status.account.creating") || "Creating your personal account...";
      case 'setup':
        return t("status.account.setup") || "Setting up your environment...";
      case 'finalizing':
        return t("status.account.finalizing") || "Finalizing your account setup. Almost ready!";
      case 'optimizing':
        return t("status.account.optimizing") || "Optimizing your viewing experience...";
      case 'completed':
        return t("success.account.created") || "Your personal account has been created! You can now continue using the application.";
      case 'retry':
        return t("status.account.retry") || "Account setup needs attention. Please try refreshing the page.";
      default:
        return t("status.account.processing") || "Processing your account...";
    }
  };

  // Return without useMemo to allow playlists context updates to propagate
  return (
    <div style={{ minWidth: `${MIN_PLAYER_WIDTH}px` }}>
      <ErrorBoundary>
        <div className="playerIntegration-contents">
          <PlaylistProvider>
            <ThemeProvider theme={theme}>
              <BaseLine currentTheme={currentTheme} theme={theme} isDemo={isDemo} />
              {needsRefresh && !isDemo && (
                <ErrorBoundary fallback={<div>There was an issue with account activation. Please refresh manually.</div>}>
                  <ActivateAccount currentTheme={currentTheme()} theme={theme} t={t} />
                </ErrorBoundary>
              )}

              {/* Demo and Professional Services snackbars */}
              <DemoSnackbarsContainer isDemo={isDemo} theme={currentTheme()} />
              <p>{"\n"}</p>

              {/* Buttons for selecting exhibitions, playlists, displays, and getting info */}
              <ErrorBoundary>
                <TabButtons
                  currentTheme={currentTheme}
                  t={t}
                  responsiveProps={responsiveProps}
                />
              </ErrorBoundary>

              <p>{"\n"}</p>
              <>
                {/* Web Player Container */}
                <Box
                  className="web-player-container"
                  sx={{
                    position: "relative",
                    width: "100%",
                    paddingTop: "56.25%", // Standard 16:9 aspect ratio
                    border: playModeRef.current ? `4px solid ${theme.palette.primary.main}` : "none",
                    borderRadius: playModeRef.current ? "4px" : "0",
                    overflow: "hidden",
                    backgroundColor: "black", // Consistent background
                    zIndex: 1,
                  }}
                >
                  {/* Player Content */}
                  <Box
                    sx={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      zIndex: 2, // Higher than container
                    }}
                  >
                    {/* Play Mode Overlay - Using opacity transition instead of conditional rendering */}
                    {playModeRef.current && (
                      <Box
                        sx={{
                          position: "absolute",
                          top: 10,
                          left: 10,
                          zIndex: 3,
                          backgroundColor: "rgba(0,0,0,0.5)",
                          padding: "4px 8px",
                          borderRadius: "4px",
                          opacity: playModeOneSec ? 1 : 0,
                          transition: "opacity 0.5s ease-in-out",
                        }}
                      >
                        <Typography variant="h6" sx={{ color: "white" }}>
                          Play Mode
                        </Typography>
                        {/* TODO Add Montage Name and Track */}
                      </Box>
                    )}

                    {/* Play Mode Overlay - Using opacity transition instead of conditional rendering */}
                    {playModeRef.current && (
                      <Box
                        sx={{
                          position: "absolute",
                          top: 10,
                          left: 10,
                          zIndex: 3,
                          backgroundColor: "rgba(0,0,0,0.5)",
                          padding: "4px 8px",
                          borderRadius: "4px",
                          opacity: playModeOneSec ? 1 : 0,
                          transition: "opacity 0.5s ease-in-out",
                        }}
                      >
                        <Typography variant="h6" sx={{ color: "white" }}>
                          Play Mode
                        </Typography>
                        {/* TODO Add Montage Name and Track */}
                      </Box>
                    )}

                    {/* Info Overlay - Bottom Left */}
                    {currentPlaylist && (
                      <Box
                        className="overlay-fade" //  CSS handles the 3-second fade
                        sx={{
                          position: "absolute",
                          bottom: 12,
                          left: 12,
                          zIndex: 3,
                          fontSize: "11px",
                          color: "white",
                          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                          fontWeight: 200,
                          lineHeight: "12px",
                          textAlign: "left", //  Proper left alignment
                        }}
                      >
                        <div>Track: {webPlayerOverlayInfo.track}</div>
                        <div>{webPlayerOverlayInfo.montageName}</div>
                      </Box>
                    )}

                    {/* Actual Web Player Component */}
                    <ErrorBoundary>
                      <WebPlayer
                        currentTheme={theme}
                        environments={environments}
                        currentPlaylist={currentPlaylist}
                        selectedTrack={selectedTrackForScreen}
                        t={t}
                        house={house}
                        volumeRef={volumeRef}
                        montageOrderSignature={montageOrderSignature}
                        selectedPlaylistPositionForWebPlayerRef={selectedPlaylistPositionForWebPlayerRef}
                        positionForNav={selectedPlaylistPositionForWebPlayer}
                      />
                    </ErrorBoundary>
                  </Box>
                </Box>

                {/* Player commands */}
                <ErrorBoundary>
                  <PlayerCommands
                    onPlay={onPlay}
                    onPause={onPause}
                    onStop={onStop}
                    onRew={onRew}
                    onFwd={onFwd}
                    iconClass={iconClass}
                    t={t}
                    volumeRef={volumeRef}
                    onVolumeChange={onVolumeChange}
                    onPlayStart={handlePlayStart}
                    onPlayEnd={handlePlayEnd}
                    playModeRef={playModeRef}
                    currentPlaylist={currentPlaylist}
                    currentTempPlaylistId={currentTempPlaylistId}
                    house={house}
                    setPlaylists={setPlaylists}
                    responsiveProps={responsiveProps}
                    theme={theme}
                    syncLoading={syncLoading}
                    setSyncLoading={setSyncLoading}
                  />
                </ErrorBoundary>

                {/* Player rating and social sharing */}
                <ErrorBoundary>
                  <PlayerCommands2
                    responsiveProps={responsiveProps}
                    iconClass={iconClass}
                  />
                </ErrorBoundary>
              </>

              {/* Montage selection todo:delay */}
              <UIProvider>
                <ErrorBoundary>
                  <div id="Playlists">
                    <Playlists
                      currentTheme={currentTheme}
                      house={house}
                      currentPlaylist={currentPlaylist}
                      setCurrentPlaylist={setCurrentPlaylist}
                      playlists={playlists}
                      setPlaylists={setPlaylists}
                      isDemo={isDemo}
                      playModeRef={playModeRef}
                      onPlayEnd={handlePlayEnd}
                      onMontageNavigation={handleMontageNavigation}
                      selectedPlaylistPosition={selectedPlaylistPositionForWebPlayer} 
                    />
                  </div>
                </ErrorBoundary>
              </UIProvider>

              <ErrorBoundary>
                <div id="ShowMontages">
                  <Suspense fallback={<div>...</div>}>
                    <ShowMontages
                      onStop={onStop}
                      onPlayStart={handlePlayStart}
                      onPlayEnd={handlePlayEnd}
                      onTempPlaylistCreated={handleTempPlaylistCreated}
                      playModeRef={playModeRef}
                    />
                  </Suspense>
                </div>
              </ErrorBoundary>
              {/* Test button that uses Sentry's captureException */}
              {/* <button onClick={() => {
                console.log("Button clicked - sending test error");
                Sentry.captureException(new Error("Manual test error for Sentry!"));
              }}>
                Test Sentry Manual Capture
              </button> */}
              {/* TODO: complete with 1 preparing 2 activating 3 finalising */}
              {accountCreatedSuccess && (
                <CustomSnackbar
                  open={accountCreatedSuccess}
                  // Vary duration based on phase - longer for completed, shorter for in-progress phases
                  autoHideDuration={accountSetupPhase === 'completed' ? 6000 :
                    (accountSetupPhase === 'retry' ? 0 : 4000)}
                  onClose={() => setAccountCreatedSuccess(false)}
                  anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                >
                  <CustomAlert
                    // Use warning severity for retry phase
                    severity={accountSetupPhase === 'retry' ? "warning" : "success"}
                    onClose={() => setAccountCreatedSuccess(false)}
                  >
                    {getAccountSetupMessage()}
                  </CustomAlert>
                </CustomSnackbar>
              )}
            </ThemeProvider>
          </PlaylistProvider>
        </div>
      </ErrorBoundary>
    </div>
  );
}

// PropTypes definitions
App.propTypes = {
  onAppReady: PropTypes.func
};

DontStartBefore.propTypes = {
  volumeRef: PropTypes.object.isRequired,
  playModeRef: PropTypes.object.isRequired
};