import React, { useState, useEffect } from "react";
import {
  Grid,
  IconButton,
  Tooltip,
  Popover,
  Box,
  Switch,
  Stack,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import PropTypes from "prop-types";

// Import icons
import ShortcutIcon from "@mui/icons-material/Shortcut";
import InstagramIcon from "@mui/icons-material/Instagram";
import FacebookIcon from "@mui/icons-material/Facebook";
import TwitterIcon from "@mui/icons-material/Twitter";
import PinterestIcon from "@mui/icons-material/Pinterest";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import PlayCircleFilledIcon from "@mui/icons-material/PlayCircleFilled";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ImageIcon from "@mui/icons-material/Image";
import SvgIcon from "@mui/material/SvgIcon";
import { getHouseId } from "../utils/Utils";
import { setHouseAutostart } from "../utils/api";

// TikTok custom icon - you can replace this with a better SVG path if needed
const TikTokIcon = (props) => (
  <SvgIcon {...props}>
    <path d="M16.6 5.82s.51.5.51.5l-3.4 3.4v2.09c.71.22 1.53.35 2.4.35 2.03 0 3.8-1.06 4.78-2.64l.4 1.6c-1.14 1.64-3.03 2.73-5.18 2.73-1.77 0-3.36-.72-4.47-1.88v3.69c0 2.37-1.94 4.3-4.3 4.3s-4.3-1.93-4.3-4.3c0-2.38 1.94-4.3 4.3-4.3.69 0 1.35.17 1.93.46v2.05c-.58-.33-1.23-.52-1.93-.52-1.79 0-3.24 1.45-3.24 3.24s1.45 3.24 3.24 3.24c1.78 0 3.24-1.45 3.24-3.24l.01-8.3 4.9-4.9c.38-.37.89-.58 1.42-.58.54 0 1.04.21 1.42.59L16.6 5.82z" />
  </SvgIcon>
);

// Add AutostartToggle component
function AutostartToggle({ iconClass }) {
  const { t } = useTranslation();
  const [autostart, setAutostart] = useState(false);

  useEffect(() => {
    // Try to get initial state from localStorage for quick UI response
    const storedAutostart = localStorage.getItem("house_autostart");
    if (storedAutostart !== null) {
      setAutostart(storedAutostart === "1");
    }
  }, []);

  const handleToggleAutostart = async () => {
    try {
      const houseId = getHouseId();
      if (!houseId) {
        console.error("[AutostartToggle] No house ID found for toggle");
        return;
      }

      const newValue = !autostart;
      setAutostart(newValue); // Optimistically update UI

      // Update localStorage
      localStorage.setItem("house_autostart", newValue ? "1" : "0");

      // Call API to update the server
      const result = await setHouseAutostart(houseId, newValue ? 1 : 0);
      console.log("[AutostartToggle] Toggle result:", result);

      // If there was an error, revert the UI state
      if (!result.success) {
        setAutostart(!newValue);
        localStorage.setItem("house_autostart", !newValue ? "1" : "0");
        console.error("[AutostartToggle] Failed to update autostart");
      }
    } catch (error) {
      console.error("[AutostartToggle] Error toggling autostart:", error);
      // Revert UI state on error
      setAutostart(!autostart);
      localStorage.setItem("house_autostart", !autostart ? "1" : "0");
    }
  };

  return (
    <Tooltip title={t("autoplay_playlist")}>
      <Stack direction="row" alignItems="center" spacing={0.5}>
        <PlayCircleFilledIcon
          color={autostart ? "primary" : "disabled"}
          fontSize="small"
          className={iconClass}
        />
        <Switch
          checked={autostart}
          onChange={handleToggleAutostart}
          size="small"
          color="primary"
        />
      </Stack>
    </Tooltip>
  );
}

export function SocialShare({ responsiveProps, iconClass }) {
  const { t } = useTranslation();
  const [anchorEl, setAnchorEl] = useState(null);
  const [copied, setCopied] = useState(false);
  const [copiedThumb, setCopiedThumb] = useState(false);
  const { isMobile, isLandscape } = responsiveProps || {};

  const useCompactLayout = isMobile && isLandscape;

  const handleOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
    setCopied(false);
    setCopiedThumb(false);
  };

  const getShareUrl = () => {
    const ctx = window._wmShareContext || {};
    const keyword = ctx.searchTerm || ctx.montageTitle || "";
    const base = window.location.origin + window.location.pathname;
    const url = keyword ? `${base}?searchword=${encodeURIComponent(keyword)}` : base;
    return url;
  };

  const handleCopy = () => {
    const ctx = window._wmShareContext || {};
    const title = ctx.searchTerm || ctx.montageTitle || "";
    const text = title ? `${title}\n${getShareUrl()}` : getShareUrl();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleCopyThumb = () => {
    const ctx = window._wmShareContext || {};
    const thumbUrl = ctx.thumbnailUrl || "";
    if (!thumbUrl) return;
    navigator.clipboard.writeText(thumbUrl).then(() => {
      setCopiedThumb(true);
      setTimeout(() => setCopiedThumb(false), 2000);
    });
  };

  const open = Boolean(anchorEl);
  const id = open ? "share-popover" : undefined;

  return (
    <>
      <Tooltip title={t("socialmedia")}>
        <IconButton
          onClick={handleOpen}
          aria-describedby={id}
          sx={{ padding: "12px" }}
          className={`tabs_icon ${iconClass}`}
        >
          <ShortcutIcon color="primary" style={{ zIndex: 3 }} />
        </IconButton>
      </Tooltip>
      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        sx={{
          zIndex: 10,
        }}
      >
        <Box
          sx={{
            padding: 2,
            backgroundColor: "white",
            borderRadius: "2.5%",
            width: useCompactLayout ? "auto" : "10vh",
          }}
        >
          <Box
            variant={useCompactLayout ? "subtitle1" : "h5"}
            sx={{
              textAlign: "center",
              marginBottom: useCompactLayout ? "2px" : "3px",
            }}
          >
            {t("socialmedia")}
          </Box>

          {/* Preview card — shows what will be shared */}
          {(() => {
            const ctx = window._wmShareContext || {};
            const title = ctx.searchTerm || ctx.montageTitle || "";
            const thumb = ctx.thumbnailUrl || "";
            if (!title && !thumb) return null;
            return (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1, p: 1, borderRadius: 1, bgcolor: "rgba(0,0,0,0.06)" }}>
                {thumb && <img src={thumb} alt="" style={{ width: 48, height: 36, objectFit: "cover", borderRadius: 4, flexShrink: 0 }} />}
                {title && <Box sx={{ fontSize: "0.75rem", fontWeight: 600, color: "#333", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</Box>}
              </Box>
            );
          })()}

          <Box
            sx={{
              display: "flex",
              flexDirection: useCompactLayout ? "row" : "column",
              alignItems: "center",
              gap: useCompactLayout ? "2px" : "3px",
              flexWrap: useCompactLayout ? "wrap" : "nowrap",
              justifyContent: "center",
            }}
          >
            <IconButton
              onClick={() => window.open("https://www.instagram.com/")}
            >
              <InstagramIcon
                className={`tabs_icon ${iconClass}`}
                sx={{ color: "#E1306C" }}
              />
            </IconButton>

            <IconButton
              onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getShareUrl())}`)}
            >
              <FacebookIcon
                className={`tabs_icon ${iconClass}`}
                sx={{ color: "#1877F2" }}
              />
            </IconButton>

            <IconButton onClick={() => {
              const ctx = window._wmShareContext || {};
              const title = ctx.searchTerm || ctx.montageTitle || "";
              const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(getShareUrl())}${title ? `&text=${encodeURIComponent(title)}` : ""}`;
              window.open(twitterUrl);
            }}>
              <TwitterIcon
                className={`tabs_icon ${iconClass}`}
                sx={{ color: "#1DA1F2" }}
              />
            </IconButton>

            <IconButton onClick={() => window.open("https://www.tiktok.com/")}>
              <TikTokIcon
                className={`tabs_icon ${iconClass}`}
                sx={{ color: "#000000" }}
              />
            </IconButton>

            <IconButton
              onClick={() => window.open(`https://pinterest.com/pin/create/button/?url=${encodeURIComponent(getShareUrl())}`)}
            >
              <PinterestIcon
                className={`tabs_icon ${iconClass}`}
                sx={{ color: "#E60023" }}
              />
            </IconButton>

            <IconButton
              onClick={() => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(getShareUrl())}`)}
            >
              <LinkedInIcon
                className={`tabs_icon ${iconClass}`}
                sx={{ color: "#0077B5" }}
              />
            </IconButton>

            <Tooltip title={copied ? t("copied_") : t("copy_link_")}>
              <IconButton onClick={handleCopy}>
                <ContentCopyIcon
                  className={`tabs_icon ${iconClass}`}
                  sx={{ color: copied ? "#0EE6AC" : "inherit" }}
                />
              </IconButton>
            </Tooltip>

            {(window._wmShareContext?.thumbnailUrl) && (
              <Tooltip title={copiedThumb ? t("copied_") : t("copy_thumbnail_")}>
                <IconButton onClick={handleCopyThumb}>
                  <ImageIcon
                    className={`tabs_icon ${iconClass}`}
                    sx={{ color: copiedThumb ? "#0EE6AC" : "inherit" }}
                  />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>
      </Popover>
    </>
  );
}

SocialShare.propTypes = {
  responsiveProps: PropTypes.shape({
    isMobile: PropTypes.bool,
    isTablet: PropTypes.bool,
    isHD: PropTypes.bool,
    isUHD: PropTypes.bool,
    isSmartTV: PropTypes.bool,
    isSmartTVHD: PropTypes.bool,
    isSmartTVUHD: PropTypes.bool,
    isPortrait: PropTypes.bool,
    isLandscape: PropTypes.bool,
  }),
  iconClass: PropTypes.string,
};

SocialShare.defaultProps = {
  responsiveProps: {
    isMobile: false,
    isTablet: false,
    isHD: false,
    isUHD: false,
    isSmartTV: false,
    isSmartTVHD: false,
    isSmartTVUHD: false,
    isPortrait: true,
    isLandscape: false,
  },
  iconClass: "",
};

// PlayerCommands2 component with proper responsive handling
export default function PlayerCommands2({ responsiveProps, iconClass }) {
  const { t } = useTranslation();
  const { isMobile, isLandscape } = responsiveProps || {};

  const isLandscapeMobile = isLandscape && isMobile;

  return (
    <Grid container spacing={1} className="player_commands">
      <Grid
        item
        xs={isMobile ? 2 : 3}
        style={{
          textAlign: "left",
          marginLeft: "0",
          display: "flex",
          alignItems: "center",
        }}
      >
        {/* Add AutostartToggle to the first column */}
        <AutostartToggle iconClass={iconClass} />
      </Grid>

      <Grid
        item
        xs={isMobile ? 8 : 6}
        style={{
          display: "flex",
          textAlign: "center",
          justifyContent: "center",
          flexBasis: "auto",
        }}
      >
        {/* Middle column content */}
      </Grid>

      <Grid
        item
        xs={isMobile ? 2 : 3}
        style={{
          display: "flex",
          justifyContent: "right",
          alignItems: "center",
        }}
      >
        <SocialShare responsiveProps={responsiveProps} iconClass={iconClass} />
      </Grid>
    </Grid>
  );
}

PlayerCommands2.propTypes = {
  responsiveProps: PropTypes.shape({
    isMobile: PropTypes.bool,
    isTablet: PropTypes.bool,
    isHD: PropTypes.bool,
    isUHD: PropTypes.bool,
    isSmartTV: PropTypes.bool,
    isSmartTVHD: PropTypes.bool,
    isSmartTVUHD: PropTypes.bool,
    isPortrait: PropTypes.bool,
    isLandscape: PropTypes.bool,
  }),
  iconClass: PropTypes.string,
};

PlayerCommands2.defaultProps = {
  responsiveProps: {
    isMobile: false,
    isTablet: false,
    isHD: false,
    isUHD: false,
    isSmartTV: false,
    isSmartTVHD: false,
    isSmartTVUHD: false,
    isPortrait: true,
    isLandscape: false,
  },
  iconClass: "",
};
