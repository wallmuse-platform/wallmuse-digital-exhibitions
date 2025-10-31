//TabButtons.js

// React and Hooks
import React, { useState, useEffect } from 'react';

// Material UI Components and Icons
import {
  Stack, Tooltip, Modal, Box, Button,
  IconButton
} from "@mui/material";
import PlaylistAddIcon from "@mui/icons-material/PlaylistAdd";
import DisplaySettingsIcon from "@mui/icons-material/DisplaySettings";
import QrCode2Icon from "@mui/icons-material/QrCode2";
import GetAppIcon from '@mui/icons-material/GetApp';
import DesktopWindowsIcon from '@mui/icons-material/DesktopWindows';
import AppleIcon from '@mui/icons-material/Apple';
import CloseIcon from '@mui/icons-material/Close';

// Custom Components
import { ConfigureDisplays } from '../Configure/Configure.js';
import Descriptions from '../Descriptions/Descriptions.js';
import { useTVNavigation } from '../utils/useTVNavigation';
import useGuestActionPopup from '../accounts/useGuestActionPopup';

// Style and Utilities
import '../App.css';
import '../utils/tvNavigation.css'; // Import the TV navigation styles
import { selectTheme } from "../theme/ThemeUtils";
import PropTypes from 'prop-types';
import { ThemeProvider } from '@mui/material/styles';
import { useTheme } from '@mui/material/styles';
import { Link } from 'react-scroll';

function TabButtons({ currentTheme, t, responsiveProps }) {

  const themeName = currentTheme();
  const theme = useTheme();

  const { isMobile, isTablet, isSmartTV, isSmartTVHD, isSmartTVUHD, iconSize } = responsiveProps;

  // Guest action popup hook - Must be here so it persists when modal closes
  const { handleAction, popup } = useGuestActionPopup();

  // For TV navigation, we now only need 2 main buttons
  const mainButtonCount = 2; // The two main buttons always visible

  // For TV navigation, we only consider the buttons visible on the TV
  const tvButtonCount = mainButtonCount; // Just the 2 main buttons for smart TVs

  // Debug TV mode
  useEffect(() => {
    if (isSmartTV) {
      console.log('[TabButtons] Smart TV detected, navigation enabled');
      console.log(`[TabButtons] TV Navigation Button count: ${tvButtonCount}`);
      console.log('[TabButtons] PC Player App button is hidden on Smart TVs');
    }
  }, [isSmartTV, tvButtonCount]);

  // Use the TV navigation hook
  const { getTVProps, focusedIndex } = useTVNavigation({
    buttonCount: tvButtonCount,
    isSmartTV,
    groupName: 'tabButtons',
    isActive: true, // This is the active navigation group
    initialFocusIndex: 0 // Start with first button focused
  });

  const [boxWidth, setBoxWidth] = useState('98%');

  // Renamed handleMontageClick to handleBoxWidthChange
  const handleBoxWidthChange = () => setBoxWidth('auto');

  const [openInfo, setOpenInfo] = useState(false);

  const handleCloseInfo = () => {
    setOpenInfo(false);
  };

  // Configure Displays
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [openConfigureDisplays, setOpenConfigureDisplays] = useState(false);

  const handleTooltipClose = () => {
    setTooltipOpen(false);
  };

  const handleTooltipOpen = () => {
    setTooltipOpen(true);
    setTimeout(() => {
      setTooltipOpen(false);
    }, 3000); // close after 3 seconds
  };

  const handleCloseConfigureDisplays = () => {
    setOpenConfigureDisplays(false);
  };

  // PC Player App
  const [openPCPlayerApp, setOpenPCPlayerApp] = useState(false);
  const handleClosePCPlayerApp = () => {
    setOpenPCPlayerApp(false);
  };
  let IconSizeMinusFour = `${parseInt(iconSize) - 4}px`;

  // Button styles using theme, similar to TrialAccountSnackbar approach
  const buttonStyle = {
    backgroundColor: theme.palette?.primary?.main,
    color: theme.palette?.primary?.contrastText,
    padding: isSmartTV ? '12px 20px' : '8px 16px',
    borderRadius: '4px',
    fontSize: IconSizeMinusFour,
    fontWeight: 500,
    margin: '0 8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '150px', // Set a minimum width to ensure uniform button size
    width: isMobile ? 'auto' : '150px', // Fixed width for non-mobile
    height: isSmartTV ? '64px' : '48px', // Fixed height with larger size for TV
  };

  // Debug for TV mode styling
  useEffect(() => {
    if (isSmartTV) {
      console.log("[TabButtons] buttonStyle for TV:", buttonStyle);
    }
  }, [isSmartTV, buttonStyle]);

  // Custom wrapper for tooltip + IconButton
  // Improved to better handle focus for TV navigation
  const TooltipButton = ({ title, onClick, icon, children, index }) => {
    // Create a ref to hold the button element
    const buttonRef = React.useRef(null);

    // Debug when focus changes (TV mode only)
    useEffect(() => {
      if (isSmartTV && focusedIndex === index) {
        console.log(`[TabButtons] Button ${index} received focus`);
      }
    }, [focusedIndex, index]);

    const tvProps = isSmartTV ? getTVProps(index) : { tabIndex: 0 };

    return (
      <Tooltip title={title} arrow placement="top">
        <div style={{ display: 'inline-block' }} className="button-container"> {/* Added class for consistent sizing */}
          <IconButton
            onClick={onClick}
            className="tabs_text2"
            sx={{
              ...buttonStyle,
              ...(isSmartTV && focusedIndex === index && {
                outline: `3px solid ${theme.palette.secondary.main}`,
                outlineOffset: '2px',
              }),
            }}
            ariaLabel={title}
            ref={(el) => {
              buttonRef.current = el;
              // Call the original ref from getTVProps if it exists
              if (tvProps.ref) {
                tvProps.ref(el);
              }
            }}
            {...tvProps}
            data-button-index={index}
          >
            <span className="tabs_text2">{children}</span>
            {icon}
          </IconButton>
        </div>
      </Tooltip>
    );
  };

  return (
    <ThemeProvider theme={theme} classname="tabbuttons">
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
        {!isMobile && !isTablet && !isSmartTV && (
          <div style={{ position: 'absolute', left: 10 }}
            onMouseEnter={handleTooltipOpen}
            onMouseLeave={handleTooltipClose}
            onClick={() => setOpenConfigureDisplays(true)}
          >
            <Tooltip title={t("configure_displays_")}>
              <DisplaySettingsIcon color="contrastText" className="tabs_icon" />
            </Tooltip>
          </div>
        )}

        <Stack
          className="overall_buttons"
          display="flex"
          justifyContent="center"
          spacing={isSmartTV ? 4 : 2}
          direction="row"
          data-tv-group="tabButtons"
          sx={{
            // General padding/margin that works for all screen sizes
            px: { xs: 2, sm: 3, md: 4, lg: 5, xl: 6 },

            '& .custom-icon-button': {
              // Make buttons take appropriate width based on screen size
              width: {
                xs: '110px)', // On mobile, almost half width minus spacing
                sm: '120px',            // Small tablets
                md: '150px',            // Medium devices
                lg: '180px',            // Large devices
                xl: '200px',            // Extra large
                tv: '300px'             // Smart TVs
              },
              mx: { xs: 1, sm: 1.5, md: 2 }
            }
          }}
        >
          <Link
            to="ShowMontages"
            smooth={true}
            duration={500}
          >
            <Tooltip title={t("show_exhibitions." + currentTheme())}>
              <Button
                disableRipple
                variant="contained"
                className="tabs_text2"
                endIcon={<PlaylistAddIcon className="tabs_icon" />}
                style={{ minWidth: "150px" }} 
              >
                {t("exhibitions." + currentTheme())}
              </Button>
            </Tooltip>
            
          </Link>
          <Tooltip title={t("info." + themeName)}> 
            <Button
              disableRipple
              variant="contained"
              className="tabs_text2"
              onClick={() => setOpenInfo(true)}
              endIcon={<QrCode2Icon className="tabs_icon" />}
              style={{ minWidth: "150px" }} 
            >
              {t("get_info_." + themeName)}
            </Button>
          </Tooltip>
        </Stack>
        {!isMobile && !isTablet && !isSmartTV && (
          <div style={{ position: 'absolute', right: 10 }}
            onClick={() => setOpenPCPlayerApp(true)}
          >
            <Tooltip title="PC Player App">
              <GetAppIcon color="contrastText" className="tabs_icon" />
            </Tooltip>
          </div>
        )}
      </div>
      <Modal className='modal'
        open={openConfigureDisplays}
        onClose={handleCloseConfigureDisplays}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: 'auto',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: '20%',
            bottom: '5%',
            width: isMobile ? '96vw' : '90vw',
            overflow: 'auto',
            borderRadius: '10px',
            background: `${theme.palette.primary.contrastText}`,
            border: `5px solid ${theme.palette.primary.main}`,
          }}
        >
          <IconButton
            aria-label="close"
            onClick={handleCloseConfigureDisplays}
            style={{
              position: 'absolute',
              top: '0',
              right: '0',
              ...(isSmartTV && {
                padding: '16px',
                fontSize: IconSizeMinusFour // Fixed - was 'iconSize' as a string
              })
            }}
            tabIndex={0}
            autoFocus={isSmartTV}
            {...(isSmartTV && { 'data-tv-focusable': 'true' })}
          >
            <CloseIcon />
          </IconButton>
          <ConfigureDisplays t={t} responsiveProps={responsiveProps} onClose={handleCloseConfigureDisplays} handleAction={handleAction} />
        </Box>
      </Modal>

      <Modal className='modal'
        open={openInfo}
        onClose={handleCloseInfo}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: 'auto',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: '20%',
            bottom: '5%',
            width: isMobile ? '95vw' : '80%',
            overflow: 'auto',
            borderRadius: '10px',
            background: `${theme.palette.primary.contrastText}`,
            border: `5px solid ${theme.palette.primary.main}`,
          }}
        >
          <IconButton
            aria-label="close"
            onClick={handleCloseInfo}
            style={{
              position: 'absolute',
              top: '0',
              right: '0',
              ...(isSmartTV && {
                padding: '16px',
                fontSize: IconSizeMinusFour
              })
            }}
            tabIndex={0}
            autoFocus={isSmartTV}
            {...(isSmartTV && { 'data-tv-focusable': 'true' })}
          >
            <CloseIcon />
          </IconButton>
          <Descriptions />
        </Box>
      </Modal>

      <Modal className='modal'
        open={openPCPlayerApp}
        onClose={handleClosePCPlayerApp}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: 'auto',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: '20%',
            bottom: '5%',
            width: isMobile ? '95vw' : '80%',
            overflow: 'auto',
            borderRadius: '10px',
            background: `${theme.palette.primary.contrastText}`,
            border: `5px solid ${theme.palette.primary.main}`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
          }}
        >
          <IconButton
            aria-label="close"
            onClick={handleClosePCPlayerApp}
            style={{
              position: 'absolute',
              top: '0',
              right: '0',
              ...(isSmartTV && {
                padding: '16px',
                fontSize: IconSizeMinusFour
              })
            }}
            tabIndex={0}
            autoFocus={isSmartTV}
            {...(isSmartTV && { 'data-tv-focusable': 'true' })}
          >
            <CloseIcon />
          </IconButton>
          <h2>PC Player App (V3)</h2>
          <p style={{ fontStyle: 'italic' }}>V4 soon to come, currently in test</p>
          <div>
            <DesktopWindowsIcon color="primary" />
            <a href="https://wallmuse.com/backend-v3/WallMuse Backend-windows32-online.exe" tabIndex={0}>Windows 32 bit</a>
          </div>
          <br />
          <div>
            <DesktopWindowsIcon color="primary" />
            <a href="https://wallmuse.com/backend-v3/WallMuse%20Backend-windows64-online.exe" tabIndex={0}>Windows 64 bit</a>
          </div>
          <br />
          <div>
            <AppleIcon color="primary" />
            <a href="https://wallmuse.com/backend-v3/WallMuse Backend-macos64-online.dmg" tabIndex={0}>Mac OS</a>
          </div>
          <br />
          <div>
            <AppleIcon color="primary" />
            <a href="https://wallmuse.com/backend-v3/WallMuse Backend-macos64-online.dmg" tabIndex={0}>Mac M</a>
          </div>
        </Box>
      </Modal>
      {popup}
    </ThemeProvider >
  );
}

TabButtons.propTypes = {
  currentTheme: PropTypes.func,  // 'currentTheme' is a function
  t: PropTypes.func,  // 't' is also a function
  responsiveProps: PropTypes.object,
};

export default TabButtons;