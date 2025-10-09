/* eslint-disable no-console */
import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { getUserId } from "./utils/Utils";
import { GradientCircularProgress } from './utils/Loading';
import { useEnvironments } from './contexts/EnvironmentsContext';

const WebPlayer = React.memo(function WebPlayer({
  currentTheme,
  environments,
  currentPlaylist,
  selectedTrack,
  t,
  house,
  volumeRef,
  montageOrderSignature,
  selectedPlaylistPositionForWebPlayerRef,
  positionForNav
}) {
  const containerRef = useRef(null);
  const [isPlayerLoaded, setIsPlayerLoaded] = useState(false);
  const [internalLoading, setInternalLoading] = useState(true);
  const [isChildPlayerReady, setIsChildPlayerReady] = useState(false);
  // Use selectedTrack prop directly - no state needed
  const [currentMontage, setCurrentMontage] = useState(undefined);
  const hasLoadedOnce = useRef(false); // Track if we've loaded once

  // Get loading states from useEnvironments hook
  const { initialLoading, syncLoading, playlistLoading } = useEnvironments();

  // Comprehensive loading logic
  const showLoading = initialLoading || syncLoading || internalLoading || playlistLoading || !isChildPlayerReady;

  const logInfo = (...args) => console.log('[WebPlayer]', ...args);
  const logError = (...args) => console.error('[WebPlayer]', ...args);

  // SIMPLIFIED: Only load player ONCE, never reload
  useEffect(() => {

    // If already loaded once, don't reload
    if (hasLoadedOnce.current) {
      logInfo('Player already loaded, skipping reload for playlist change');
      return;
    }

    if (!containerRef.current || !house) {
      logInfo("Waiting for required props... (container:", !!containerRef.current, "house:", house, ")");
      return;
    }

    // Allow loading even without environments - child WebPlayer will create them
    if (!environments?.length) {
      logInfo("No environments found, but proceeding - WebPlayer will create default environment");
    }

    // NEW: Wait for WebPlayer app to be ready before proceeding
    const waitForWebPlayerApp = async () => {
      if (window.WallmuseInit) {
        logInfo("⏳ Waiting for WebPlayer app to be ready...");
        try {
          await window.WallmuseInit.playerReady();
          logInfo("✅ WebPlayer app is ready, proceeding with player load");
        } catch (error) {
          logError("Error waiting for WebPlayer app:", error);
          // Continue anyway to prevent deadlock
        }
      } else {
        logInfo("⚠️ WallmuseInit not found, proceeding without coordination");
      }
      
      // Now proceed with existing loadPlayerOnce logic
      loadPlayerOnce();
    };

        const loadPlayerOnce = async () => {
      try {
        logInfo("🤝 Loading player (one time only)");
        hasLoadedOnce.current = true;

        let environmentId = getEnvironmentId();
        let screenId = getScreenId(environmentId);

        if (!environmentId || !screenId) {
          // If no environments exist, use fallback values - child WebPlayer will create actual environment
          logInfo("⚠️ No environment/screen found, using fallback values - child WebPlayer will create environment");
          // Use fallback values - child TypeScript app will handle environment creation
          environmentId = "0"; // Child WebPlayer will create real environment
          screenId = "0"; // Child WebPlayer will create real screen
        }

        const sessionId = getUserId();
        const anticache = Date.now();

        // Set up global variables for the player
        window.SELECTED_TRACK = selectedTrack || '1';
        window.SELECTED_MONTAGE = currentMontage;
        
        const wallmuseParams = {
          house: house.toString(),
          environ: environmentId.toString(),
          screen: screenId.toString(),
          session: sessionId,
          key: null,
          ready: true,
          controlledByParent: true,
          createEnvironment: false,
          timestamp: Date.now()
        };
        
        window.WALLMUSE_PARAMS = wallmuseParams;
        
        logInfo(`Set globals - track: ${selectedTrack || '1'}, montage: ${currentMontage}`);

        // Build the player URL
        const baseUrl = `/wp-content/themes/neve-child-master/wm-player/index.html`;
        const params = new URLSearchParams({
          session: wallmuseParams.session,
          anticache: anticache.toString(),
          track: selectedTrack || '1',
          house: wallmuseParams.house,
          environ: wallmuseParams.environ,
          screen: wallmuseParams.screen
        });
        
        const playerUrl = `${baseUrl}?${params.toString()}`;
        logInfo(`Loading player from: ${playerUrl}`);

        const response = await fetch(playerUrl, {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const html = await response.text();
        
        if (!containerRef.current) return;

        // Parse and inject HTML (only once)
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Load CSS (only if not already loaded)
        const cssLinks = doc.querySelectorAll('link[rel="stylesheet"]');
        for (const cssLink of cssLinks) {
          if (!document.querySelector(`link[href="${cssLink.href}"]`)) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = cssLink.href;
            document.head.appendChild(link);
            logInfo(`Loaded CSS: ${cssLink.href}`);
          }
        }

        // Add minimal CSS for video visibility
        if (!document.getElementById('webplayer-video-css')) {
          const customStyle = document.createElement('style');
          customStyle.id = 'webplayer-video-css';
          customStyle.textContent = `
            #root-wm-player {
              width: 100% !important;
              height: 100% !important;
              min-height: 400px !important;
            }
            #root-wm-player video {
              width: 100% !important;
              height: 100% !important;
              object-fit: cover !important;
            }
            #root-wm-player video.hidden {
              display: none !important;
            }
          `;
          document.head.appendChild(customStyle);
        }

        // Inject the body content (only once)
        containerRef.current.innerHTML = doc.body.innerHTML;

        // Load scripts (only if not already loaded)
        const scripts = doc.querySelectorAll('script[src]');
        for (const script of scripts) {
          if (!document.querySelector(`script[src="${script.src}"]`)) {
            const newScript = document.createElement('script');
            newScript.src = script.src;
            if (script.defer) newScript.defer = true;
            if (script.async) newScript.async = true;
            document.body.appendChild(newScript);
            logInfo(`Loaded script: ${script.src}`);
          }
        }

        setIsPlayerLoaded(true);

        // Set up ready callback
        window.onWebPlayerReady = () => {
          logInfo('✅ Player is ready');
          setInternalLoading(false);
          setIsChildPlayerReady(true);
        };

        // ADDED: Notify NavigationManager that WebPlayer is ready
        if (window.navigationManager) {
          window.navigationManager.setPlayerReady(true);
          logInfo('🎮 NavigationManager notified that WebPlayer is ready');
        } else {
          logInfo('⚠️ NavigationManager not found - will retry in 100ms');
          // Retry after a short delay in case NavigationManager isn't loaded yet
          setTimeout(() => {
            if (window.navigationManager) {
              window.navigationManager.setPlayerReady(true);
              logInfo('🎮 NavigationManager notified that WebPlayer is ready (delayed)');
            } else {
              logInfo('❌ NavigationManager still not found after delay');
            }
          }, 100);
        }

        logInfo('Player loaded successfully (will not reload again)');

      } catch (error) {
        logError('Error loading player:', error);
        hasLoadedOnce.current = false; // Allow retry on error
        setIsPlayerLoaded(false);
      }
    };

    const loadPlayer = async () => {
      setInternalLoading(true);
      try {
        await waitForWebPlayerApp();
      } catch (error) {
        logError('Error in loadPlayer:', error);
      } finally {
        setInternalLoading(false);
      }
    };

    loadPlayer();
  }, [house, selectedTrack]); // Only reload if house, or selectedTrack change, environments removed

  // Handle navigation events (without reloading player)
  useEffect(() => {
    // Enhanced navigation event handler for WebPlayer.js
    // Replace the existing handleNavigationEvent in your WebPlayer

    const handleNavigationEvent = (event) => {
      logInfo('🎯 Navigation event received:', event.detail);
      
      if (event.detail?.playlist && isPlayerLoaded) {
        const { playlist, position, isPlaylistChange } = event.detail;
        
        // Handle playlist changes differently than montage changes
        if (isPlaylistChange) {
          logInfo('📂 Playlist change detected - will trigger reload cycle');
          
          // For playlist changes, we need to reload the player
          // Set flag to reload on next useEffect cycle
          setIsPlayerLoaded(false);
          hasLoadedOnce.current = false; // Allow reload
          
          // Trigger reload after brief delay
          setTimeout(() => {
            // This will trigger the main useEffect to reload the player
            containerRef.current && (containerRef.current.innerHTML = '');
          }, 100);
          
        } else {
          logInfo('🎬 Montage navigation within same playlist');
          
          // Just update track/montage state for same playlist
          const track = position?.track || '1';
          logInfo(`Track updated to: ${track}`);
          
          const montage = position?.montage;
          setCurrentMontage(montage);
          
          // Update global variables for the child player
          window.SELECTED_TRACK = track;
          window.SELECTED_MONTAGE = montage;
          
          // If player has webPlayerNavigate function, use it
          if (window.webPlayerNavigate) {
            logInfo('Triggering player navigation without reload');
            window.webPlayerNavigate(playlist, position);
          }
        }
      }
    };
    window.addEventListener('webplayer-navigate', handleNavigationEvent);
    
    return () => {
      window.removeEventListener('webplayer-navigate', handleNavigationEvent);
    };
  }, [isPlayerLoaded]);

  // Handle montage order changes (without reloading)
  useEffect(() => {
    if (montageOrderSignature && isPlayerLoaded) {
      logInfo('Montage order signature changed:', montageOrderSignature);
      // Just log - don't reload player
    }
  }, [montageOrderSignature, isPlayerLoaded]);

  // Helper functions (unchanged)
  const getEnvironmentId = () => {
    try {
      const wmHouseRaw = localStorage.getItem('wm-house');
      if (wmHouseRaw) {
        const wmHouse = JSON.parse(wmHouseRaw);
        if (wmHouse.environId) { // Remove environments dependency
          return wmHouse.environId;
        }
      }
      // Comment out environments dependency - child will create environment
      // if (environments?.length > 0) {
      //   const aliveEnv = environments.find(env => env.alive === "1");
      //   return aliveEnv ? aliveEnv.id : environments[0].id;
      // }
      return null;
    } catch (error) {
      logError('Error getting environment ID:', error);
      // return environments?.length > 0 ? environments[0].id : null;
      return null;
    }
  };

  const getScreenId = (environmentId) => {
    // Comment out environments dependency - child will create screen
    // if (!environmentId || !environments?.length) return null;
    // const environment = environments.find(env => env.id === environmentId);
    // return environment?.screens?.length > 0 ? environment.screens[0].id : null;
    return null; // Always return null - child will handle screen creation
  };

  return (
    <div
      className="web-player-content relative w-full h-full flex items-center justify-center bg-black"
      style={{ minHeight: '36.25vw' }}
    >
      {showLoading && <GradientCircularProgress />}
      <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center"
        style={{
          position: 'relative',
          overflow: 'visible',
          zIndex: 1
        }}
      />
    </div>
  );
});

export default WebPlayer;