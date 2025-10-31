// ConfigureEnvironmentScreen.js - Updated Version

import React, { useState, useEffect } from 'react';
import { currentTheme, selectTheme } from "../theme/ThemeUtils";
import { Switch, IconButton, Tooltip, Box, FormControlLabel } from '@mui/material';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import QrCodeIcon from '@mui/icons-material/QrCode';
import { PiComputerTower } from 'react-icons/pi';
import TvIcon from '@mui/icons-material/Tv';
import TabletAndroidIcon from '@mui/icons-material/TabletAndroid';
import SmartphoneIcon from '@mui/icons-material/Smartphone';
import Icon from '@mui/material/Icon';
import { useTranslation } from 'react-i18next';
import { useResponsive } from '../utils/useResponsive';
import { wmm_url, getUserId, isDemoAccount } from '../utils/Utils.js';
import { activateScreen, deactivateScreen, activateEnvironment, deactivateEnvironment } from '../utils/api';

import {
  isEnvironmentActive,
  isScreenActive,
  hasValidDimensions,
  getAllActiveScreens,
  validateScreenSetup,
  canUseEnvironmentForPlayback 
} from '../utils/environmentUtils';


export function ConfigureEnvironmentScreen({
  environmentGroup,
  handleRemoveScreen,
  handleRemoveEnvironment,
  handleDeactivateEnvironment,
  onEnvironmentGroupUpdate,
  onClose,
  handleAction,  // Accept handleAction from parent
  ...otherProps
}) {
  console.log('ConfigureEnvironmentScreen: environmentGroup:', environmentGroup);

  const theme = selectTheme();
  const themeName = currentTheme();
  const { t } = useTranslation();
  const { isMobile, isTablet, isHD, iconSize } = useResponsive();

  // Updated state name for clarity
  const [showOnlyActive, setShowOnlyActive] = useState(true);

  let IconSizeMinusTwo = `${parseInt(iconSize) - 2}px`;
  let currentRow = 15;
  let totalScreens = 0;

  const [hoveredItem, setHoveredItem] = useState(null);
  const [validationResults, setValidationResults] = useState(null);

  // Validate screen setup when environments change
  useEffect(() => {
    if (environmentGroup && environmentGroup.length > 0) {
      const allEnvironments = environmentGroup.map(item => item.environment);
      const results = validateScreenSetup(allEnvironments);
      setValidationResults(results);
      
      if (results.issues.length > 0) {
        console.log('[ConfigureEnvironmentScreen] Validation issues found:', results);
      }
    }
  }, [environmentGroup]);

  const handleMouseEnter = (id) => {
    console.log('ConfigureEnvironmentScreen: Mouse entered:', id);
    setHoveredItem(id);
  };

  const handleMouseLeave = () => {
    console.log('ConfigureEnvironmentScreen: Mouse left');
    setHoveredItem(null);
  };

  // Enhanced filtering logic - no virtual screens
  const filteredEnvironmentGroup = environmentGroup.map(({ environment, screens }) => {
    let filteredScreens;
    
    if (showOnlyActive) {
      // Show active environments and their screens (including inactive screens for context)
      if (isEnvironmentActive(environment)) {
        // For active environments, show all screens so user can see what needs activation
        filteredScreens = screens;
      } else {
        // For inactive environments, only show active screens
        filteredScreens = screens.filter(screen => isScreenActive(screen));
      }
    } else {
      // Show all screens when not filtering
      filteredScreens = [...screens];
    }
    
    return {
      environment,
      screens: filteredScreens
    };
  }).filter(({ environment, screens }) => {
    if (showOnlyActive) {
      // Keep environments that are active OR have active screens
      return isEnvironmentActive(environment) || 
             screens.some(screen => isScreenActive(screen));
    }
    // Show all environments when not filtering
    return true;
  });

  const handleScreenToggle = async (screen) => {
    console.log("[Configure] handleScreenToggle called for screen:", screen.id);
    console.log("[Configure] About to call handleAction, userId:", getUserId(), "isDemo:", isDemoAccount(getUserId()));
    // Close modal before showing popup
    if (onClose) {
      console.log("[Configure] Closing modal");
      onClose();
    }
    // Use handleAction to check for demo account
    console.log("[Configure] Calling handleAction");
    handleAction(
      async () => {
        console.log("[Configure] Inside handleAction callback - executing screen toggle");
        const isCurrentlyActive = isScreenActive(screen);
        console.log(`[ConfigureEnvironmentScreen] Toggling screen ${screen.id} from ${isCurrentlyActive ? 'on' : 'off'} to ${isCurrentlyActive ? 'off' : 'on'}`);

        try {
          if (isCurrentlyActive) {
            // Turn screen off
            await deactivateScreen(screen.id);
          } else {
            // Turn screen on
            await activateScreen(screen.id, 1);
          }

          // Update local state immediately for responsive UI
          const updatedEnvironmentGroup = environmentGroup.map(({ environment, screens }) => ({
            environment,
            screens: screens.map(s =>
              s.id === screen.id
                ? { ...s, on: isCurrentlyActive ? "0" : "1" }
                : s
            )
          }));

          // You'll need to pass a callback from parent to update the state
          if (onEnvironmentGroupUpdate) {
            onEnvironmentGroupUpdate(updatedEnvironmentGroup);
          }

        } catch (error) {
          console.error(`[ConfigureEnvironmentScreen] Error toggling screen ${screen.id}:`, error);
          alert(`Error ${isCurrentlyActive ? 'deactivating' : 'activating'} screen. Please try again.`);
        }
      },
      false // Not premium content
    );
  };

  const handleEnvironmentToggle = async (environment) => {
    // Close modal before showing popup
    if (onClose) {
      onClose();
    }
    // Use handleAction to check for demo account
    handleAction(
      async () => {
        const isCurrentlyActive = isEnvironmentActive(environment);
        console.log(`[ConfigureEnvironmentScreen] Toggling environment ${environment.id} from ${isCurrentlyActive ? 'alive' : 'dead'} to ${isCurrentlyActive ? 'dead' : 'alive'}`);

        try {
          if (isCurrentlyActive) {
            // Deactivate environment (you'll need to create activateEnvironment function)
            await deactivateEnvironment(environment.id);
          } else {
            // Activate environment - you'll need to create this API function
            await activateEnvironment(environment.id);
          }

          // Update local state immediately for responsive UI
          const updatedEnvironmentGroup = environmentGroup.map(({ environment: env, screens }) => ({
            environment: env.id === environment.id
              ? { ...env, alive: isCurrentlyActive ? "0" : "1" }
              : env,
            screens
          }));

          if (onEnvironmentGroupUpdate) {
            onEnvironmentGroupUpdate(updatedEnvironmentGroup);
          }

        } catch (error) {
          console.error(`[ConfigureEnvironmentScreen] Error toggling environment ${environment.id}:`, error);
          alert(`Error ${isCurrentlyActive ? 'deactivating' : 'activating'} environment. Please try again.`);
        }
      },
      false // Not premium content
    );
  };

  // Enhanced screen status indicator
  const getScreenStatusColor = (screen) => {
    if (!isScreenActive(screen)) return "action"; // Gray for inactive
    if (!hasValidDimensions(screen)) return "warning"; // Orange for needs refresh
    return "success"; // Green for ready
  };

  const getScreenStatusTooltip = (screen) => {
    if (!isScreenActive(screen)) return "Screen is off - click to activate";
    if (!hasValidDimensions(screen)) return "Screen active but may need page refresh for dimensions";
    return "Screen active and ready";
  };

  // Enhanced environment status indicator  
  const getEnvironmentStatusColor = (environment) => {
    if (!isEnvironmentActive(environment)) return "action"; // Gray for inactive
    
    const playbackCheck = canUseEnvironmentForPlayback(environment);
    
    if (!playbackCheck.canUse) return "error"; // Red for cannot use
    if (playbackCheck.reason !== 'Ready for playback') return "warning"; // Orange for needs attention
    return "success"; // Green for ready
  };

  const getEnvironmentStatusTooltip = (environment) => {
    if (!isEnvironmentActive(environment)) return "Environment is inactive";
    
    const playbackCheck = canUseEnvironmentForPlayback(environment);
    return playbackCheck.reason;
  };

  return (
    <>

      {/* Toggle switch for "Only Active" - Updated label */}
      <div 
        style={{
          gridRow: '13 / 14',
          gridColumn: '1 / 16',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingRight: '10px',
          backgroundColor: theme.palette.background.paper,
        }}
      >
        <FormControlLabel
          control={
            <Switch
              checked={showOnlyActive}
              onChange={(e) => {
                const newValue = e.target.checked;
                console.log("[Configure] Toggle switch clicked:", newValue);
                console.log("[Configure] About to call handleAction, userId:", getUserId(), "isDemo:", isDemoAccount(getUserId()));
                // Close modal before showing popup
                if (onClose) {
                  console.log("[Configure] Closing modal");
                  onClose();
                }
                // Use handleAction to check for demo account
                console.log("[Configure] Calling handleAction");
                handleAction(
                  () => {
                    console.log("[Configure] Inside handleAction callback - executing setShowOnlyActive");
                    setShowOnlyActive(newValue);
                  },
                  false // Not premium content
                );
              }}
              sx={{
                '& .MuiSwitch-switchBase.Mui-checked': {
                  color: theme.palette.primary.main,
                },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                  backgroundColor: theme.palette.primary.main,
                },
              }}
            />
          }
          label={
            <div
              style={{ 
                color: theme.palette.text.primary,
                fontSize: '1.25rem',
                fontFamily: 'inherit'
              }}
            >
              {t("descriptions.showOnlyOn")}
            </div>
          }
        />
      </div>

      {/* Environment and Screen Components */}
      {filteredEnvironmentGroup && filteredEnvironmentGroup.map(({ environment, screens }, index) => {
        const environmentRow = currentRow;
        currentRow += 1;

        const isEncrypted = environment.name !== 'Web player';

        // Screen components with enhanced status indicators
        const screenComponents = screens.map((screen, screenIndex) => {
          const screenRow = environmentRow + screenIndex * 5;
          const statusColor = getScreenStatusColor(screen);
          const statusTooltip = getScreenStatusTooltip(screen);
          
          return (
            <div
              key={screen.id}
              className="screen"
              style={{
                gridRow: `${screenRow} / span 4`,
                gridColumn: '7 / 10',
                border: `2px solid ${theme.palette.primary.main}`,
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-start",
                height: "100%",
                width: "100%",
                backgroundColor: theme.palette.primary.contrastText,
                position: "relative",
                // Visual indication for inactive screens
                opacity: isScreenActive(screen) ? 1 : 0.6
              }}
              onMouseEnter={() => handleMouseEnter(screen.id)}
              onMouseLeave={handleMouseLeave}
            >
              {/* Line 1: Switch + Status icon */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  height: "25%",
                  overflow: 'hidden',
                }}
              >
                <Tooltip title={t("action.enable")}>
                  <Switch
                    size={isMobile ? 'small' : 'medium'}
                    style={{ alignSelf: "center" }}
                    checked={isScreenActive(screen)}
                    onChange={() => handleScreenToggle(screen)}
                    classes={{
                      thumb: {
                        boxShadow: "none",
                        border: "1px solid",
                        borderColor: theme.palette.primary.main,
                        backgroundColor: theme.palette.primary.main,
                      },
                    }}
                  />
                </Tooltip>
                
                <Tooltip title={statusTooltip}>
                  <FiberManualRecordIcon 
                    sx={{ fontSize: iconSize }} 
                    color={statusColor}
                  />
                </Tooltip>
              </div>

              {/* Line 2: Screen name with device icon */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                fontSize: 'IconSizeMinusTwo',
                justifyContent: 'center',
                height: '50%',
                overflow: 'hidden',
              }}>
                {/* Device icon based on screen width */}
                {Number(screen.width) <= 768 && <SmartphoneIcon sx={{ fontSize: IconSizeMinusTwo, color: theme.palette.primary.main }} />}
                {Number(screen.width) > 768 && Number(screen.width) <= 1024 && <TabletAndroidIcon sx={{ fontSize: IconSizeMinusTwo, color: theme.palette.primary.main }} />}
                {Number(screen.width) > 1024 && <TvIcon sx={{ fontSize: IconSizeMinusTwo, color: theme.palette.primary.main }} />}
                
                <div style={{ 
                  lineHeight: '1',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '100%',
                  textAlign: 'center',
                  fontWeight: 'normal',
                  fontSize: 'IconSizeMinusTwo'
                }}>
                  {screen.name}
                </div>
                
                {/* Show dimensions if available */}
                {hasValidDimensions(screen) && (
                  <div style={{
                    fontSize: '10px',
                    color: theme.palette.text.secondary,
                    textAlign: 'center'
                  }}>
                    {screen.width}×{screen.height}
                  </div>
                )}
              </div>

              {/* Line 3: QR Code + Delete icon */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-end",
                  height: "25%",
                  padding: "0 5px 5px 5px",
                  overflow: 'hidden',
                  visibility: hoveredItem === screen.id ? "visible" : "hidden",
                }}
              >
                <Tooltip
                  title={
                    <div>
                      <div style={{ fontSize: '0.875rem' }}>{t("info."+themeName)}</div>
                      <div 
                        style={{
                          color: theme.palette.primary.main,
                          textDecoration: 'underline',
                          cursor: 'pointer',
                          fontSize: '0.75rem'
                        }}
                        onClick={() => window.open(`${wmm_url}/info/?screen=${screen.id}`, '_blank')}
                      >
                        {`${wmm_url}/info/?screen=${screen.id}`}
                      </div>
                    </div>
                  }
                  arrow
                >
                  <IconButton>
                    <QrCodeIcon sx={{ fontSize: iconSize }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t("action.delete")}>
                  <IconButton
                    onClick={() => {
                      // Close modal before showing popup
                      if (onClose) {
                        onClose();
                      }
                      // Use handleAction to check for demo account
                      handleAction(
                        () => handleRemoveScreen(screen.id),
                        false // Not premium content
                      );
                    }}
                  >
                    <DeleteForeverIcon sx={{ fontSize: iconSize }} />
                  </IconButton>
                </Tooltip>
              </div>
            </div>
          );
        });

        currentRow += Math.max(1, screens.length) * 5;

        // Environment component with enhanced status
        return (
          <React.Fragment key={`environmentGroup-${index}`}>
            <div
              key={environment.id}
              className={`environmentGroup ${index % 2 !== 0 ? "left" : "right"}`}
              style={{
                gridRow: `${environmentRow} / span 4`,
                gridColumn: isEncrypted ? '3 / 6' : '11 / 14',
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-start",
                height: "100%",
                position: "relative"
              }}
              onMouseEnter={() => handleMouseEnter(environment.id)}
              onMouseLeave={handleMouseLeave}
            >
              <div
                className="environment"
                style={{
                  gridRow: `${environmentRow} / span ${4 + screens.length * 5}`,
                  gridColumn: isEncrypted ? '3 / 6' : '11 / 14',
                  justifyContent: "flex-start",
                  border: isEncrypted ? `2px solid ${theme.palette.primary.main}` : `2px dotted ${theme.palette.primary.main}`,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-start",
                  height: "100%",
                }}
              >
                {/* Line 1: Switch + Status icon */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    height: "25%",
                    overflow: 'hidden',
                  }}
                >
                  <Switch
                    size={isMobile ? 'small' : 'medium'}
                    style={{ alignSelf: "center" }}
                    checked={isEnvironmentActive(environment)}
                    onChange={() => handleEnvironmentToggle(environment)}
                    classes={{
                      thumb: {
                        boxShadow: "none",
                        border: "1px solid",
                        borderColor: theme.palette.primary.main,
                        backgroundColor: theme.palette.primary.main,
                      },
                    }}
                  />
                  
                  <Tooltip title={getEnvironmentStatusTooltip(environment)}>
                    <IconButton>
                      <FiberManualRecordIcon 
                        sx={{ fontSize: iconSize }} 
                        color={getEnvironmentStatusColor(environment)}
                      />
                    </IconButton>
                  </Tooltip>
                </div>

                {/* Line 2: Environment name */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: 'column',
                    alignItems: "center",
                    fontSize: 'IconSizeMinusTwo',
                    justifyContent: "center",
                    whiteSpace: 'nowrap',
                    overflow: "hidden",
                    textOverflow: 'ellipsis',
                    height: '50%',
                  }}
                >
                  <Icon sx={{ fontSize: IconSizeMinusTwo, color: theme.palette.primary.main }}>
                    <PiComputerTower />
                  </Icon>
                  <div style={{
                    lineHeight: '1',
                    whiteSpace: 'nowrap', 
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '100%',
                    textAlign: 'center',
                    fontWeight: 'normal',
                    fontSize: 'IconSizeMinusTwo'
                  }}>
                    {environment.name}
                  </div>
                  
                  {/* Show IP if available */}
                  {environment.ip && (
                    <div style={{
                      fontSize: '10px',
                      color: theme.palette.text.secondary,
                      textAlign: 'center'
                    }}>
                      {environment.ip}
                    </div>
                  )}
                </div>
                
                {/* Line 3: Delete button */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    alignItems: "flex-end",
                    height: "25%",
                    padding: "0 5px 5px 5px",
                    overflow: 'hidden',
                    visibility: hoveredItem === environment.id ? "visible" : "hidden",
                  }}
                >
                  <IconButton
                    onClick={() => {
                      // Close modal before showing popup
                      if (onClose) {
                        onClose();
                      }
                      // Use handleAction to check for demo account
                      handleAction(
                        () => handleRemoveEnvironment(environment.id),
                        false // Not premium content
                      );
                    }}
                    style={{ marginRight: "0" }}
                  >
                    <DeleteForeverIcon sx={{ fontSize: iconSize }} />
                  </IconButton>
                </div>
              </div>
            </div>
            {screenComponents}
          </React.Fragment>
        );
      })}
    </>
  );
}