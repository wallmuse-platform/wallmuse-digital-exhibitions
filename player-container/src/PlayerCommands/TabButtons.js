//TabButtons.js

// React and Hooks
import React, { useState, useEffect } from "react";

// Material UI Components and Icons
import {
  Stack,
  Tooltip,
  Modal,
  Box,
  Button,
  IconButton,
  Typography,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import PlaylistAddIcon from "@mui/icons-material/PlaylistAdd";
import DisplaySettingsIcon from "@mui/icons-material/DisplaySettings";
import QrCode2Icon from "@mui/icons-material/QrCode2";
import GetAppIcon from "@mui/icons-material/GetApp";
import DesktopWindowsIcon from "@mui/icons-material/DesktopWindows";
import AppleIcon from "@mui/icons-material/Apple";
import CloseIcon from "@mui/icons-material/Close";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

// Custom Components
import { ConfigureDisplays } from "../Configure/Configure.js";
import Descriptions from "../Descriptions/Descriptions.js";
import { useTVNavigation } from "../utils/useTVNavigation";
import useGuestActionPopup from "../accounts/useGuestActionPopup";
import { useConfigureModal } from "../contexts/ConfigureModalContext";

// Style and Utilities
import "../App.css";
import "../utils/tvNavigation.css"; // Import the TV navigation styles
import { selectTheme } from "../theme/ThemeUtils";
import PropTypes from "prop-types";
import { ThemeProvider } from "@mui/material/styles";
import { useTheme } from "@mui/material/styles";
import { alpha } from "@mui/material/styles";
import { Link } from "react-scroll";

// PC Player v4 downloads and hardware guidance. Kept as module-scoped constants (rather than
// inline JSX) so the modal's render body stays readable and this list is a single place to
// bump the version string or swap a build when a new one is published to backend-v4.
const PC_PLAYER_VERSION = "4.0.0";
// A plain, unambiguous yellow for the "unsigned installer" notice — deliberately not
// theme.palette.warning (MUI's default warning orange, #ed6c02, reads as red/orange rather
// than yellow against this dark modal background, closer to an error than a heads-up).
const PC_PLAYER_WARNING_COLOR = "#FFC107";
const PC_PLAYER_DOWNLOADS = [
  {
    label: "Windows",
    icon: DesktopWindowsIcon,
    href: `https://wallmuse.com/backend-v4/WallMuse-Player-${PC_PLAYER_VERSION}-windows.exe`,
  },
  {
    label: "Mac (Apple Silicon)",
    icon: AppleIcon,
    href: `https://wallmuse.com/backend-v4/WallMuse-Player-${PC_PLAYER_VERSION}-mac-arm64.dmg`,
  },
  {
    label: "Mac (Intel)",
    icon: AppleIcon,
    href: `https://wallmuse.com/backend-v4/WallMuse-Player-${PC_PLAYER_VERSION}-mac-intel.dmg`,
  },
];
const PC_PLAYER_HARDWARE = [
  { computer: "Entry-level Windows PC (Intel Celeron), tested", setup: "1 display in 4K 60 fps, or 2–3 displays in HD" },
  { computer: "Mac mini M1 or M2", setup: "2 displays in 4K 60 fps" },
  { computer: "Mac mini M4", setup: "3 displays in 4K 60 fps" },
  { computer: "Mac with M-series Pro or Max chip", setup: "3–4 displays in 4K 60 fps" },
];

function TabButtons({ currentTheme, t, responsiveProps }) {
  const themeName = currentTheme();
  const theme = useTheme();

  const { isMobile, isTablet, isSmartTV, isSmartTVHD, isSmartTVUHD, iconSize } =
    responsiveProps;

  const isPlugin = document.getElementById('root')?.dataset?.plugin === 'true';

  // Guest action popup hook - Must be here so it persists when modal closes
  const { handleAction: guestHandleAction, isDemo, popup } = useGuestActionPopup();

  // Close Configure before showing GuestActionPopup — two overlapping modals is confusing.
  // Only close Configure for demo users — logged-in users execute the action directly.
  const handleAction = (action, isPremium = false) => {
    if (isDemo) {
      setOpenConfigureDisplays(false);
    }
    guestHandleAction(action, isPremium);
  };

  // For TV navigation, we now only need 2 main buttons
  const mainButtonCount = 2; // The two main buttons always visible

  // For TV navigation, we only consider the buttons visible on the TV
  const tvButtonCount = mainButtonCount; // Just the 2 main buttons for smart TVs

  // Debug TV mode
  useEffect(() => {
    if (isSmartTV) {
      console.log("[TabButtons] Smart TV detected, navigation enabled");
      console.log(`[TabButtons] TV Navigation Button count: ${tvButtonCount}`);
      console.log("[TabButtons] PC Player App button is hidden on Smart TVs");
    }
  }, [isSmartTV, tvButtonCount]);

  // Use the TV navigation hook
  const { getTVProps, focusedIndex } = useTVNavigation({
    buttonCount: tvButtonCount,
    isSmartTV,
    groupName: "tabButtons",
    isActive: true, // This is the active navigation group
    initialFocusIndex: 0, // Start with first button focused
  });

  const [boxWidth, setBoxWidth] = useState("98%");

  // Renamed handleMontageClick to handleBoxWidthChange
  const handleBoxWidthChange = () => setBoxWidth("auto");

  const [openInfo, setOpenInfo] = useState(false);

  const handleCloseInfo = () => {
    setOpenInfo(false);
  };

  // Configure Displays
  const [tooltipOpen, setTooltipOpen] = useState(false);
  // Lives in ConfigureModalContext (above DontStartBefore in App.js), not local useState —
  // see that file for why: TabButtons gets unmounted/remounted whenever DontStartBefore's
  // gating re-runs (e.g. on routine Configure actions like toggling a screen or removing an
  // environment), which would otherwise silently close this modal mid-action.
  const { isConfigureOpen: openConfigureDisplays, setIsConfigureOpen: setOpenConfigureDisplays } =
    useConfigureModal();

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
    padding: isSmartTV ? "12px 20px" : "8px 16px",
    borderRadius: "4px",
    fontSize: IconSizeMinusFour,
    fontWeight: 500,
    margin: "0 8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: "150px", // Set a minimum width to ensure uniform button size
    width: isMobile ? "auto" : "150px", // Fixed width for non-mobile
    height: isSmartTV ? "64px" : "48px", // Fixed height with larger size for TV
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
        <div style={{ display: "inline-block" }} className="button-container">
          {" "}
          {/* Added class for consistent sizing */}
          <IconButton
            onClick={onClick}
            className="tabs_text2"
            sx={{
              ...buttonStyle,
              ...(isSmartTV &&
                focusedIndex === index && {
                  outline: `3px solid ${theme.palette.secondary.main}`,
                  outlineOffset: "2px",
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
      <div
        style={{
          position: "relative",
          display: "flex",
          justifyContent: "center",
        }}
      >
        {!isMobile && !isTablet && !isSmartTV && (
          <div
            style={{ position: "absolute", left: 10 }}
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

            "& .custom-icon-button": {
              // Make buttons take appropriate width based on screen size
              width: {
                xs: "110px)", // On mobile, almost half width minus spacing
                sm: "120px", // Small tablets
                md: "150px", // Medium devices
                lg: "180px", // Large devices
                xl: "200px", // Extra large
                tv: "300px", // Smart TVs
              },
              mx: { xs: 1, sm: 1.5, md: 2 },
            },
          }}
        >
          <Link to="ShowMontages" smooth={true} duration={500}>
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
        {!isMobile && !isTablet && !isSmartTV && !isPlugin && (
          <div
            style={{ position: "absolute", right: 10 }}
            onClick={() => setOpenPCPlayerApp(true)}
          >
            <Tooltip title="PC Player App">
              <GetAppIcon color="contrastText" className="tabs_icon" />
            </Tooltip>
          </div>
        )}
      </div>
      <Modal
        className="modal"
        open={openConfigureDisplays}
        onClose={handleCloseConfigureDisplays}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "auto",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: "20%",
            bottom: "5%",
            width: isMobile ? "96vw" : "90vw",
            overflow: "auto",
            borderRadius: "10px",
            background: `${theme.palette.primary.contrastText}`,
            border: `5px solid ${theme.palette.primary.main}`,
          }}
        >
          <IconButton
            aria-label="close"
            onClick={handleCloseConfigureDisplays}
            style={{
              position: "absolute",
              top: "0",
              right: "0",
              ...(isSmartTV && {
                padding: "16px",
                fontSize: IconSizeMinusFour, // Fixed - was 'iconSize' as a string
              }),
            }}
            tabIndex={0}
            autoFocus={isSmartTV}
            {...(isSmartTV && { "data-tv-focusable": "true" })}
          >
            <CloseIcon />
          </IconButton>
          <ConfigureDisplays
            t={t}
            responsiveProps={responsiveProps}
            onClose={handleCloseConfigureDisplays}
            handleAction={handleAction}
          />
        </Box>
      </Modal>

      <Modal
        className="modal"
        open={openInfo}
        onClose={handleCloseInfo}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "auto",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: "20%",
            bottom: "5%",
            width: isMobile ? "95vw" : "80%",
            overflow: "auto",
            borderRadius: "10px",
            background: `${theme.palette.primary.contrastText}`,
            border: `5px solid ${theme.palette.primary.main}`,
          }}
        >
          <IconButton
            aria-label="close"
            onClick={handleCloseInfo}
            style={{
              position: "absolute",
              top: "0",
              right: "0",
              ...(isSmartTV && {
                padding: "16px",
                fontSize: IconSizeMinusFour,
              }),
            }}
            tabIndex={0}
            autoFocus={isSmartTV}
            {...(isSmartTV && { "data-tv-focusable": "true" })}
          >
            <CloseIcon />
          </IconButton>
          <Descriptions />
        </Box>
      </Modal>

      {!isPlugin && <Modal
        // Deliberately NOT className="modal" here, unlike the two modals above. That shared
        // class (App.css) caps the Modal root itself at width:80%/height:80%, and this modal's
        // inner Box sizes itself independently (width/maxWidth, top/bottom margins) expecting
        // to measure against the full viewport — so that 80% cap wasted the bottom ~20% of the
        // screen with content still cut off above it. Tried overriding width/height back to
        // 100% via sx first, but it lost the cascade to the static class (same specificity,
        // App.css wins on insertion order here) and had no effect — confirmed 2026-11-16.
        // Dropping the class entirely sidesteps that: Modal's own default CSS already sets
        // position:fixed + top/left/right/bottom:0, which alone is the full viewport with
        // nothing to override. The other two Modals keep the shared class untouched.
        open={openPCPlayerApp}
        onClose={handleClosePCPlayerApp}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "auto",
        }}
      >
        <Box
          sx={{
            // Switched from position:absolute + top/bottom percentages (which always stretched
            // the box to nearly the full reserved height, regardless of how much content there
            // actually was, leaving a big empty strip below short content) to the standard
            // flex-centered pattern: this Box stays in normal flow, so the Modal's own
            // style={display:flex, alignItems:center, justifyContent:center} centers it and
            // sizes it to its content automatically. maxHeight + overflowY:auto is only a
            // safety net for when content IS taller than the viewport (e.g. a very short
            // window), not the normal case. position:"relative" is kept only so the close
            // IconButton's position:absolute (top:0,right:0) still anchors to this Box instead
            // of some further ancestor. Confirmed 2026-11-16: the previous version also visually
            // collided with the WordPress admin toolbar (itself position:fixed, higher z-index)
            // when logged in as admin — centering to content size rather than forcing near-full
            // viewport height leaves enough top margin that this no longer happens either.
            position: "relative",
            maxHeight: "96vh",
            overflowY: "auto",
            // Desktop-only surface (the trigger icon is already gated to !isMobile && !isTablet
            // && !isSmartTV, see the condition above), so this can safely use most of the
            // viewport width on desktop without worrying about small-screen layouts at all —
            // isMobile here only covers the narrow dev-tools/manual-resize case, not a real
            // target device.
            width: isMobile ? "95vw" : "92vw",
            maxWidth: isMobile ? "480px" : "1280px",
            borderRadius: "10px",
            background: `${theme.palette.primary.contrastText}`,
            border: `5px solid ${theme.palette.primary.main}`,
            p: { xs: 2, sm: 3, md: 4 },
          }}
        >
          <IconButton
            aria-label="close"
            onClick={handleClosePCPlayerApp}
            style={{
              position: "absolute",
              top: "0",
              right: "0",
              ...(isSmartTV && {
                padding: "16px",
                fontSize: IconSizeMinusFour,
              }),
            }}
            tabIndex={0}
            autoFocus={isSmartTV}
            {...(isSmartTV && { "data-tv-focusable": "true" })}
          >
            <CloseIcon />
          </IconButton>

          <Stack spacing={2} textAlign="left">
            {/* Header */}
            <Box textAlign="center">
              <GetAppIcon color="primary" sx={{ fontSize: 40 }} />
              <Typography variant="h5" fontWeight={600}>
                WallMuse PC Player
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Version {PC_PLAYER_VERSION}
              </Typography>
            </Box>

            <Divider />

            {/* Two-column body on desktop (md+): narrative sections on the left, the hardware
                table + connectivity note on the right — so a tall single-column read becomes a
                roughly-square block that fits one screen at typical desktop window heights
                instead of needing a long scroll. On mobile (and this modal is desktop-only to
                begin with) the grid collapses to a single column in the same reading order. */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1.15fr 0.85fr" },
                gap: { xs: 2, md: 5 },
              }}
            >
              <Stack spacing={2}>
                <Box>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    What it does
                  </Typography>
                  <Typography variant="body2">
                    The WallMuse PC Player is an app for Windows and Mac that turns an
                    ordinary computer into a dedicated exhibition player. Connect one or more
                    displays and it shows content full screen on each of them, with no
                    keyboard, mouse or browser needed.
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    Controlled from any device
                  </Typography>
                  <Typography variant="body2">
                    You don&apos;t use the computer itself to run it. Everything is
                    controlled from a smartphone, tablet or any connected device through
                    WallMuse online: right here, from this player. Choose a playlist, skip
                    to the next exhibition, or enable or disable a display, and the PC Player
                    follows at once. Several displays, and several players in the same
                    account, stay in sync.
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    Plays from local storage
                  </Typography>
                  <Typography variant="body2">
                    Unlike online streaming, which sends HD versions over the internet, the
                    PC Player plays the original master files from its own disk. It is
                    tested up to 4K at 60 frames per second. Higher definitions, such as 8K
                    or 120 frames per second, are possible on computers and displays whose
                    hardware supports them. It downloads the current playlist first, then the
                    rest of your collection in the background. A &quot;Downloading&quot;
                    notice shows until a piece of content is ready. Playback no longer
                    depends on the speed of the connection, so motion stays smooth even in
                    4K. The files are encrypted so that only that player can read them. They
                    can be kept on the computer or on an external disk, and the app&apos;s
                    icon in the system tray shows how much is downloaded.
                  </Typography>
                </Box>
              </Stack>

              <Stack spacing={2}>
                <Box>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    Recommended hardware
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    What a computer can handle depends on two things: how many video streams
                    it can decode at once, and how many displays it can connect.
                  </Typography>
                  <TableContainer sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: "6px" }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600 }}>Computer</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Recommended setup</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {PC_PLAYER_HARDWARE.map((row) => (
                          <TableRow key={row.computer}>
                            <TableCell>{row.computer}</TableCell>
                            <TableCell>{row.setup}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                    On Macs, the limit is usually the number of displays the machine can
                    connect, not its decoding power: a Mac with an M1 chip playing two 4K
                    displays uses less than a third of one processor core. These figures are
                    estimates and will be confirmed by further tests.
                  </Typography>
                </Box>

                <Typography variant="body2" color="text.secondary" fontStyle="italic">
                  The PC Player currently needs an internet connection to start and to
                  receive commands. Starting without a connection, playing what is already
                  downloaded, is planned for a later version.
                </Typography>
              </Stack>
            </Box>

            <Divider />

            {/* Downloads */}
            <Box textAlign="center">
              <Typography variant="h6" gutterBottom>
                Download
              </Typography>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                justifyContent="center"
                alignItems="center"
              >
                {PC_PLAYER_DOWNLOADS.map(({ label, icon: PlatformIcon, href }) => (
                  <Button
                    key={label}
                    variant="outlined"
                    startIcon={<PlatformIcon />}
                    endIcon={<GetAppIcon />}
                    href={href}
                    sx={{
                      minWidth: "180px",
                      // Outlined by default, solid-filled on hover (rather than MUI's default
                      // faint hover tint) — icons need no separate color prop since SvgIcon's
                      // default fill is currentColor, so they flip from primary.main to
                      // contrastText along with the label automatically.
                      borderColor: theme.palette.primary.main,
                      color: theme.palette.primary.main,
                      "&:hover": {
                        backgroundColor: theme.palette.primary.main,
                        borderColor: theme.palette.primary.main,
                        color: theme.palette.primary.contrastText,
                      },
                    }}
                  >
                    {label}
                  </Button>
                ))}
              </Stack>

              {/* These builds aren't code-signed yet (certificates are expected in 2027), so
                  Windows and macOS both show their standard unknown-publisher warning on first
                  launch. Without this note a new user has no way to tell that from a broken or
                  tampered download, so it's spelled out as plainly as the OS dialogs themselves
                  rather than left to a FAQ page. Styled as a plain warning (amber, not red —
                  red/secondary is reserved for actual errors in this app, not an expected OS
                  prompt) and spans the same full width as the two-column body above it, rather
                  than being centered and narrower, so it doesn't read as an afterthought.
                  Confirmed 2026-11-16 against the actual v4 builds: the Mac flow below
                  (Privacy & Security → Open Anyway) matches exactly what a fresh download
                  shows. */}
              <Box
                sx={{
                  mt: 3,
                  width: "100%",
                  textAlign: "left",
                  p: 2,
                  borderRadius: "6px",
                  border: `1px solid ${PC_PLAYER_WARNING_COLOR}`,
                  backgroundColor: alpha(PC_PLAYER_WARNING_COLOR, 0.08),
                }}
              >
                <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ mb: 1 }}>
                  <WarningAmberIcon
                    fontSize="small"
                    sx={{ color: PC_PLAYER_WARNING_COLOR, mt: "1px" }}
                  />
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 600, color: PC_PLAYER_WARNING_COLOR }}
                  >
                    Security warning on first launch
                  </Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  These installers are not code-signed yet (certificates are expected in
                  2027), so your operating system will show a security warning on first
                  launch. This is expected. Follow the steps below to continue.
                </Typography>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  <strong>Windows:</strong> if a blue &quot;Windows protected your PC&quot;
                  box appears, click More info, then Run anyway.
                </Typography>
                <Typography variant="body2">
                  <strong>Mac:</strong> if the Mac says the app can&apos;t be opened, go to
                  System Settings → Privacy &amp; Security and click Open Anyway. On first
                  launch, the Mac may ask for your login password: this lets the player keep
                  its keys in your keychain.
                </Typography>
              </Box>
            </Box>
          </Stack>
        </Box>
      </Modal>}
      {popup}
    </ThemeProvider>
  );
}

TabButtons.propTypes = {
  currentTheme: PropTypes.func, // 'currentTheme' is a function
  t: PropTypes.func, // 't' is also a function
  responsiveProps: PropTypes.object,
};

export default TabButtons;
