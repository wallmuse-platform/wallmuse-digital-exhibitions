//MontageSelection.js main component

// React core and hooks
import React, { useState, useRef, useEffect, useContext } from "react";

// Material UI components
import Card from "@mui/material/Card";
import CardMedia from "@mui/material/CardMedia";
import CardContent from "@mui/material/CardContent";
import CardActions from "@mui/material/CardActions";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import {
  Tooltip,
  Box,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  OutlinedInput,
} from "@mui/material";
import PlaylistAddIcon from "@mui/icons-material/PlaylistAdd";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import FilterListIcon from "@mui/icons-material/FilterList";

// Custom components and utilities
import {
  searchMontages,
  addMontageToPlaylist,
  addPlaylist,
  updatePlaylist,
  deletePlaylist,
  loadPlaylist,
  getPlaylists,
  getOrCreateMonoPlaylist,
} from "../utils/api.js";
import { monitorPlayback } from "../wsTools";
import { BaseThumbnailContext } from "../contexts/MontagesContext.js";
import { getUserId } from "../utils/Utils";
import FilterBar from "./FilterBar.js";
import SearchBar from "./SearchBar.js";
import { sortMontages } from "./sortMontages";
import DescriptionManager from "./DescriptionManager";
import calculateDuration from "./calculateDuration.js";
import { useGatewayTooltip } from "./gatewayTooltips";
import { useResponsive } from "../utils/useResponsive";
import { handleSendCommand } from "../App";
import { CustomSnackbar, CustomAlert } from "../CustomComponents.js";

// Context providers
import { useSession } from "../contexts/SessionContext.js";
import { PlaylistsContext } from "../contexts/PlaylistsContext";
import { useEnvironments } from "../contexts/EnvironmentsContext.js";

// Internationalization
import { useTranslation } from "react-i18next";

// Theme
import { currentTheme, selectTheme } from "../theme/ThemeUtils.js";

// PropTypes for component properties validation
import PropTypes from "prop-types";
import { handleActionWithGuestCheck } from "../accounts/cloneGuest.js";

// PlayMode
import {
  handlePlayMontageEnd,
  savePreviousPlaylistId,
  clearPreviousPlaylistId,
} from "../Play/playModeUtils.js";

// Acounts
import useGuestActionPopup from "../accounts/useGuestActionPopup.js";

// Optional comments and checks
// import i18n from '../i18n.js';
// TOCHECK: import EnvironmentsContext to initiate houses?

// Define the ShowMontages component

const ShowMontages = (
  { onStop, onPlayStart, onPlayEnd, playModeRef },
  {
    access_kind,
    author,
    author_fn,
    author_id,
    authors,
    best_description,
    best_name,
    cdate,
    commercial,
    croppable,
    deconstructable,
    descriptions,
    duration,
    montage_id,
    interactive,
    language,
    mdate,
    name,
    orientation,
    rating,
    sd_height,
    sd_width,
    selectable,
    seq_count,
    splittable,
    thumbnail,
    preview,
    tracks,
    resolution,
    video_3d,
  },
) => {
  const { playlists, setPlaylists } = useContext(PlaylistsContext);
  const { userDetails, isPremium, isDemo } = useSession(); // Retrieve user details and guest status

  // Get all necessary context data from context
  const {
    house,
    currentPlaylist,
    setCurrentPlaylist,
    backendCurrentPlaylist,
    handlePlaylistChange,
    syncLoading,
    syncComplete,
    error,
  } = useEnvironments();

  console.log(
    "[MontageSelection] userDetails ",
    userDetails,
    " isDemo ",
    isDemo,
    " isPremium",
    isPremium,
  );

  // Using the i18n library for internationalization
  const { t } = useTranslation();
  const theme = selectTheme();

  console.log(
    "[Montage Selection] playlists, setPlaylists",
    playlists,
    setPlaylists,
  );
  // Utility function to find montage by ID
  const getMontageById = (id) => {
    return montages.find((montage) => montage.id === id);
  };

  // State variables
  const [montages, setMontages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [orderBy, setOrderBy] = useState("Most Recent");
  const [displayBy, setDisplayBy] = useState("All Display Types");
  const [qualityBy, setQualityBy] = useState("All Resolutions");
  const [orientationBy, setOrientationBy] = useState("All Orientations");
  const [commercialBy, setCommercialBy] = useState("All Access Types");
  const [restrictedActionError, setRestrictedActionError] = useState(null);
  const [addSuccess, setAddSuccess] = useState(false);
  const [addError, setAddError] = useState(null);

  // Dialog state for playlist selection
  const [openPlaylistSelection, setOpenPlaylistSelection] = useState(false);
  const [selectedMontageForDialog, setSelectedMontageForDialog] =
    useState(null);

  // Mono-playlist creation flag (prevent duplicate creation on rapid clicks)
  const [creatingMonoMid, setCreatingMonoMid] = useState(null);

  // Ref to store hover timeout to prevent flickering
  const hoverTimeoutRef = useRef(null);

  const { isSmartTV, isMobile } = useResponsive();

  const handleRestrictedAction = () => {
    setRestrictedActionError(t("error.restricted_action"));
  };

  const handleCloseSnackbar = () => {
    setRestrictedActionError(null);
  };

  // Effect: Read search parameter from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const searchword =
      params.get("searchword") ||
      params.get("search-word") ||
      params.get("search");
    if (searchword) {
      console.log(
        "[MontageSelection] URL search parameter detected:",
        searchword,
      );
      setSearchTerm(searchword);

      // Scroll to montages section after a short delay to ensure content is loaded
      setTimeout(() => {
        scrollToMontages();
      }, 500);
    }
  }, []);

  // Effect: Fetch and sort data (with debounced search)
  useEffect(() => {
    console.log("[Montage Selection] searchMontages filters", { searchTerm });

    // Debounce search input - wait 500ms after user stops typing
    const searchDebounceTimer = setTimeout(
      () => {
        setIsLoading(true);
        searchMontages()
          .then((data) => {
            // Filter by search term BEFORE sorting
            let filteredData = data;
            if (searchTerm) {
              const term = searchTerm.toLowerCase();
              filteredData = data.filter(
                (m) =>
                  m.name?.toLowerCase().includes(term) ||
                  m.author?.toLowerCase().includes(term) ||
                  m.author_fn?.toLowerCase().includes(term) ||
                  m.descriptions?.some((d) =>
                    d.description?.toLowerCase().includes(term),
                  ),
              );
              console.log(
                `[MontageSelection] Search filtered ${data.length} montages to ${filteredData.length} results for term: "${searchTerm}"`,
              );
            }

            const sortedData = sortMontages(
              filteredData,
              orderBy,
              displayBy,
              qualityBy,
              orientationBy,
              commercialBy,
            );
            setMontages(sortedData);
            setIsLoading(false);
          })
          .catch((error) => {
            console.error("Error fetching montages:", error);
            setIsLoading(false);
          });
      },
      searchTerm ? 500 : 0,
    ); // 500ms debounce for search, immediate for filters

    // Cleanup timeout on unmount or when dependencies change
    return () => clearTimeout(searchDebounceTimer);
  }, [searchTerm, orderBy, displayBy, qualityBy, orientationBy, commercialBy]);

  const userId = getUserId();

  // Context
  const baseThumbnailURL = useContext(BaseThumbnailContext);

  //Handlers
  const [isHovered, setIsHovered] = useState(
    new Array(montages.length).fill(false),
  );

  //Specific Icons
  const TracksIcon = () => (
    <img
      src="https://wallmuse.com/wallmuse/v4/tracks_h24px.png"
      alt="Tracks Icon"
      style={{
        position: "relative",
        top: "2px",
        height: "16px",
      }}
    />
  );

  const SixteenPlusIcon = () => (
    <img
      src="https://wallmuse.com/wallmuse/v4/16+_h24px.png"
      alt="SixteenPlus Icon"
      style={{
        height: "16px",
      }}
    />
  );

  const { handleAction, popup } = useGuestActionPopup();
  const { gatewayTooltipAction } = useGatewayTooltip();

  // Handler to toggle filters

  const [showFilters, setShowFilters] = useState(false);

  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };

  const handleSelectMontage = (montageId) => {
    const montage = getMontageById(montageId);
    console.log(
      "[MontageSelection] Opening playlist selection dialog for montage:",
      montage,
    );
    setSelectedMontageForDialog(montage);
    setOpenPlaylistSelection(true);
  };

  const handlePlaylistSelectionDialogClose = () => {
    setOpenPlaylistSelection(false);
    setSelectedMontageForDialog(null);
  };

  const handlePlaylistSelectionChange = (event) => {
    const playlistId = event.target.value;
    console.log(
      "[MontageSelection] Playlist selected:",
      playlistId,
      "for montage:",
      selectedMontageForDialog,
    );

    if (playlistId !== "-1" && selectedMontageForDialog) {
      try {
        console.log(
          "[MontageSelection] Adding montage to playlist",
          selectedMontageForDialog,
          playlistId,
        );
        addMontageToPlaylist(
          selectedMontageForDialog,
          playlistId,
          playlists,
          setPlaylists,
        )
          .then(() => {
            setAddSuccess(true);
            setAddError(null);
            console.log("Montage successfully added");

            // Close dialog
            handlePlaylistSelectionDialogClose();

            // Auto-hide success message after 3 seconds
            setTimeout(() => {
              setAddSuccess(false);
            }, 3000);
          })
          .catch((error) => {
            setAddSuccess(false);
            setAddError(
              t("error.add_montage") || "Error adding montage to playlist",
            );
            console.error("Error in adding montage:", error);
          });
      } catch (error) {
        setAddSuccess(false);
        setAddError(
          t("error.add_montage") || "Error adding montage to playlist",
        );
        console.error("Unexpected error:", error);
      }
    }
  };

  // Function to scroll to the WebPlayer
  const scrollToWebPlayer = () => {
    const webPlayerElement = document.querySelector(".web-player-container");
    if (webPlayerElement) {
      const offset = isMobile ? 80 : 150; // Adjust offset based on header/menu height
      const topPosition =
        webPlayerElement.getBoundingClientRect().top +
        window.pageYOffset -
        offset;

      window.scrollTo({ top: topPosition, behavior: "smooth" });
    } else {
      console.warn("[scrollToWebPlayer] WebPlayer element not found.");
    }
  };

  // Function to scroll to the Montages section (shows first results)
  const scrollToMontages = () => {
    // Try to find the first montage card to show results, otherwise scroll to section
    const firstMontageCard = document.querySelector(
      ".showmontages .MuiCard-root",
    );
    const targetElement =
      firstMontageCard || document.querySelector(".showmontages");

    if (targetElement) {
      const offset = isMobile ? 100 : 200; // Larger offset to show search bar + first results
      const topPosition =
        targetElement.getBoundingClientRect().top + window.pageYOffset - offset;

      window.scrollTo({ top: topPosition, behavior: "smooth" });
    } else {
      console.warn("[scrollToMontages] Montages section not found.");
    }
  };

  const handlePlayMontage = async (montageId) => {
    console.time("[MonoPlaylist] Total execution time");

    // Prevent duplicate creation if user clicks Play multiple times
    if (creatingMonoMid === montageId) {
      console.warn(
        `[MonoPlaylist] ⚠ Blocked duplicate click for montage ${montageId}`,
      );
      return;
    }

    try {
      setCreatingMonoMid(montageId); // Set flag to prevent duplicate clicks

      // Get montage data
      const montage = getMontageById(montageId);
      if (!montage) {
        console.error(`[MonoPlaylist] ✗ Montage not found: ${montageId}`);
        return;
      }

      console.log(
        `[MonoPlaylist] ▶ Starting play for montage: "${montage.name}" (ID: ${montageId})`,
      );

      // Get or create mono-playlist (uses existing API endpoints - no backend changes!)
      const response = await getOrCreateMonoPlaylist(
        montageId,
        montage,
        playlists,
        setPlaylists,
      );
      if (!response.data || response.status >= 400) {
        console.error(
          `[MonoPlaylist] ✗ Failed to get/create mono-playlist:`,
          response,
        );
        return;
      }

      const monoPlaylistId = response.data.playlist_id;
      console.log(`[MonoPlaylist] ✓ Using mono-playlist ID: ${monoPlaylistId}`);

      // Save current playlist ONLY if it's not already a mono-playlist
      // This prevents saving mono-1559 when replaying the same montage
      const currentPlaylistObj = playlists.find(
        (p) => p.id === currentPlaylist,
      );
      const isCurrentMono = currentPlaylistObj?.name?.startsWith("mono-");

      if (!isCurrentMono) {
        savePreviousPlaylistId(currentPlaylist);
        console.log(
          `[MonoPlaylist] ✓ Saved previous playlist: ${currentPlaylist} ("${currentPlaylistObj?.name || "DEFAULT"}")`,
        );
      } else {
        console.log(
          `[MonoPlaylist] ⚠ Skipping save - already on mono-playlist: ${currentPlaylist} ("${currentPlaylistObj?.name}")`,
        );
      }

      // Scroll to WebPlayer
      scrollToWebPlayer();

      try {
        // Load the mono-playlist
        await loadPlaylist(house, monoPlaylistId);
        console.log(
          `[MonoPlaylist] → Loading playlist (house: ${house}, playlist: ${monoPlaylistId})`,
        );

        // Wait for backend sync
        console.log(`[MonoPlaylist] → Waiting for backend sync...`);
        const syncSuccess = await handlePlaylistChange(monoPlaylistId);
        console.log(
          `[MonoPlaylist] ${syncSuccess ? "✓" : "✗"} Backend sync result: ${syncSuccess}`,
        );

        if (syncSuccess) {
          // Signal play start
          onPlayStart();
          console.log(
            `[MonoPlaylist] ✓ Play started - montage will loop until stopped`,
          );

          // Check if current playlist matches
          const isCurrent = monoPlaylistId == currentPlaylist;
          console.log(
            `[MonoPlaylist] Current playlist: ${currentPlaylist}, isCurrent: ${isCurrent}`,
          );

          // NO TIMER - Let montage loop naturally
          // User will either:
          //   1. Play another montage (switches mono-playlist)
          //   2. Play another playlist (switches playlist)
          //   3. Press Stop (returns to previous playlist via handlePlayMontageEnd)
        } else {
          console.warn(
            `[MonoPlaylist] ✗ Backend sync failed for playlist: ${monoPlaylistId}`,
          );
          onPlayEnd();
        }
      } catch (error) {
        console.error(`[MonoPlaylist] ✗ Error loading playlist:`, error);
        onPlayEnd();
      } finally {
        // Force play command after short delay
        setTimeout(() => {
          console.log(`[MonoPlaylist] → Force Play command`);
          handleSendCommand('<vlc><cmd action="play"/></vlc>', house);
        }, 500);
      }
    } catch (error) {
      console.error(`[MonoPlaylist] ✗ Error:`, error);
      onPlayEnd();
    } finally {
      setCreatingMonoMid(null); // Clear flag
      console.timeEnd("[MonoPlaylist] Total execution time");
    }
  };

  if (isLoading) {
    return (
      <Box>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            marginTop: "200px",
          }}
        >
          <CircularProgress />
          <br />
          <em>Loading...</em>
        </div>
      </Box>
    );
  } else
    return (
      <div className="showmontages">
        <div>
          {/* Header Section with Centered Title and Right-aligned Button */}
          <div
            style={{
              position: "relative",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              padding: "0 1rem",
              marginBottom: "1rem",
            }}
          >
            <h2
              style={{
                textTransform: "uppercase",
                margin: "2em",
                textAlign: "center",
              }}
            >
              {t("show_exhibitions." + currentTheme())}
            </h2>

            <div
              style={{
                position: "absolute",
                right: "1rem",
                top: "50%",
                transform: "translateY(-50%)",
              }}
            >
              <Tooltip
                title={
                  showFilters ? t("hide_filters.tip") : t("show_filters.tip")
                }
              >
                <Button
                  onClick={toggleFilters}
                  variant="contained"
                  className="tabs_text"
                >
                  {showFilters ? t("hide_filters") : t("show_filters")}
                  <FilterListIcon
                    sx={{ marginLeft: 1 }}
                    className="tabs_icon"
                  />
                </Button>
              </Tooltip>
            </div>
          </div>

          {/* Search Bar */}
          <div
            style={{ padding: "0 1rem", maxWidth: "800px", margin: "0 auto" }}
          >
            <SearchBar
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              onSearch={scrollToMontages}
            />
          </div>

          {/* Filter Bar */}
          {!isSmartTV && showFilters && (
            <FilterBar
              orderBy={orderBy}
              setOrderBy={setOrderBy}
              displayBy={displayBy}
              setDisplayBy={setDisplayBy}
              qualityBy={qualityBy}
              setQualityBy={setQualityBy}
              orientationBy={orientationBy}
              setOrientationBy={setOrientationBy}
              commercialBy={commercialBy}
              setCommercialBy={setCommercialBy}
            />
          )}
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            width: "100%",
          }}
        >
          {sortMontages(
            montages,
            orderBy,
            displayBy,
            splittable,
            deconstructable,
            qualityBy,
            resolution,
            orientationBy,
            orientation,
            commercialBy,
            commercial,
          ).map((montage, index) => {
            const { id } = montage;
            // console.log ('id for ESLint', id);

            let ratio;
            if (montage.sd_width) {
              ratio =
                parseInt(montage.sd_width, 10) /
                parseInt(montage.sd_height, 10);
            } else if (montage.orientation === "L") {
              ratio = 16 / 9;
            } else if (montage.orientation === "P") {
              ratio = 9 / 16;
            } else {
              ratio = 16 / 9;
            }

            const tooltipPlay = gatewayTooltipAction("_play", userId, montage);
            const tooltipAdd = t(
              "component.playlist.exhibitions.add-to-playlist",
            );

            return (
              <div
                key={montage.id}
                style={{
                  flexBasis: "20rem",
                  margin: "1em",
                  position: "relative",
                }}
              >
                <Card
                  style={{
                    display: "grid",
                    gridTemplateRows: "auto 1fr auto",
                    border: "1px solid",
                    borderColor: theme.palette.primary.main,
                    borderRadius: "1em",
                    margin: "2em",
                    position: isHovered[index] === true ? "absolute" : "static",
                    transform:
                      isHovered[index] === true ? "scale(1.5)" : "scale(1)",
                    transformOrigin: "center",
                    zIndex: isHovered[index] === true ? 1 : 0,
                    transition: "transform 0.5s ease-out",
                    willChange: "transform",
                  }}
                  onMouseEnter={() => {
                    // Clear any pending timeout
                    if (hoverTimeoutRef.current) {
                      clearTimeout(hoverTimeoutRef.current);
                    }
                    setIsHovered((prevState) => ({
                      ...prevState,
                      [index]: true,
                    }));
                  }}
                  onMouseLeave={() => {
                    // Add a small delay before removing hover to prevent flickering
                    hoverTimeoutRef.current = setTimeout(() => {
                      setIsHovered((prevState) => ({
                        ...prevState,
                        [index]: false,
                      }));
                    }, 100);
                  }}
                >
                  <CardContent
                    style={{ paddingBottom: "0", position: "relative" }}
                  >
                    {!isPremium && (
                      <div
                        style={{
                          borderRadius: "16px",
                          padding: "0 4px",
                          position: "absolute",
                          top: "0",
                          right: "0",
                          fontSize: "0.75rem",
                          color: theme.palette.primary.main,
                        }}
                      >
                        {montage.selectable === "N" ? (
                          <span style={{ color: "#1556ED" }}>Premium</span>
                        ) : (
                          <span style={{ color: "#0EE6AC" }}>Free</span>
                        )}
                      </div>
                    )}

                    <Typography
                      variant="div"
                      color="text.secondary"
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        position: "sticky",
                        top: 0,
                      }}
                    >
                      <span style={{ verticalAlign: "middle" }}>
                        <TracksIcon />
                        <span
                          style={{
                            position: "absolute",
                            zIndex: "2",
                            marginLeft: "-20px",
                          }}
                        >
                          {montage.tracks}
                        </span>
                      </span>
                      <div
                        style={{ display: "flex", justifyContent: "center" }}
                      >
                        <span style={{ verticalAlign: "middle" }}>
                          {t("_duration")} {calculateDuration(montage.duration)}
                        </span>
                      </div>
                      <span style={{ verticalAlign: "middle" }}>
                        {montage.rating === "NC-17" && <SixteenPlusIcon />}
                      </span>
                    </Typography>
                    <Typography
                      variant="h5"
                      component="div"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "auto",
                        height: "6rem",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {montage.name}
                    </Typography>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        paddingTop: "10px",
                        paddingBottom: "10px",
                      }}
                    >
                      <CardMedia
                        component="img"
                        style={{
                          height: "140px",
                          width: `${140 * ratio}px`, // Calculate the width based on the aspect ratio
                        }}
                        image={
                          baseThumbnailURL +
                          "&session:" +
                          userId +
                          "&artwork=" +
                          montage.thumbnail_url
                        }
                        alt={montage.name}
                      />
                    </div>
                    {(montage.author || montage.author_fn) && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          height: "2rem",
                          textOverflow: "ellipsis",
                          justifyContent: "center",
                        }}
                      >
                        {t("_curator." + currentTheme())}{" "}
                        {montage.author ? montage.author : ""}{" "}
                        {montage.author_fn ? montage.author_fn : ""}
                      </Typography>
                    )}

                    <div id={`montage-${montage.id}`} key={montage.id}>
                      <CardActions
                        style={{ justifyContent: "center" }}
                        key={montage.id}
                      >
                        <Tooltip title={tooltipPlay}>
                          <Button
                            size="small"
                            variant="outlined"
                            endIcon={<PlayArrowIcon size="small" />}
                            onClick={async () => {
                              handlePlayMontage(montage.id); // Proceed with PlayMontage
                            }}
                          >
                            Play
                          </Button>
                        </Tooltip>
                        <Tooltip title={tooltipAdd}>
                          <Button
                            size="small"
                            variant="outlined"
                            endIcon={<PlaylistAddIcon size="small" />}
                            onClick={() =>
                              handleAction(
                                () => handleSelectMontage(montage.id),
                                montage.selectable === "N", // Pass whether this is premium content
                              )
                            }
                          >
                            Add
                          </Button>
                        </Tooltip>
                      </CardActions>
                    </div>
                    {isHovered[index] && (
                      <span
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          height: "100%",
                        }}
                      >
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          style={{ textAlign: "justify", marginBottom: "1em" }}
                        >
                          <DescriptionManager
                            descs={montage.descriptions}
                            bestDescription={montage.best_description}
                            bestName={montage.best_name}
                          />
                        </Typography>
                      </span>
                    )}
                  </CardContent>
                </Card>
              </div>
            );
          })}
          {popup}
        </div>
        {(addSuccess || addError) && (
          <CustomSnackbar
            open={addSuccess || addError !== null}
            autoHideDuration={6000}
            onClose={() => {
              setAddSuccess(false);
              setAddError(null);
            }}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          >
            <CustomAlert
              severity={addError ? "error" : "success"}
              onClose={() => {
                setAddSuccess(false);
                setAddError(null);
              }}
            >
              {addError ? addError : t("success.montage.added")}
            </CustomAlert>
          </CustomSnackbar>
        )}

        {/* Playlist selection dialog */}
        <Dialog
          disableEscapeKeyDown
          open={openPlaylistSelection}
          onClose={handlePlaylistSelectionDialogClose}
        >
          <DialogTitle>
            {t("component.playlist.exhibitions.add-montage")}
          </DialogTitle>
          <DialogContent>
            <Box component="form" sx={{ display: "flex", flexWrap: "wrap" }}>
              <FormControl fullWidth sx={{ m: 1 }}>
                <InputLabel htmlFor="playlist-dialog-native">
                  {t("component.playlist.exhibitions.playlist")}
                </InputLabel>
                <Select
                  native
                  onChange={handlePlaylistSelectionChange}
                  input={
                    <OutlinedInput
                      label="Playlist"
                      id="playlist-dialog-native"
                    />
                  }
                >
                  <option key="-1" value="-1">
                    {t(
                      "component.playlist.exhibitions.select-playlist-default",
                    )}
                  </option>
                  {playlists.map((playlist) => {
                    // Show all playlists including default (which has no id or empty string id)
                    const playlistId = playlist.id || "";
                    const playlistName =
                      playlist.name ||
                      t("component.playlist.exhibitions.default-name");
                    return (
                      <option key={playlistId || "default"} value={playlistId}>
                        {playlistName}
                      </option>
                    );
                  })}
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
};

ShowMontages.propTypes = {
  commercial: PropTypes.string.isRequired, // added isRequired
  croppable: PropTypes.bool.isRequired, // added isRequired
  deconstructable: PropTypes.bool.isRequired, // added isRequired
  descriptions: PropTypes.array.isRequired, // added isRequired
  duration: PropTypes.number,
  montage_id: PropTypes.string.isRequired,
  interactive: PropTypes.bool,
  language: PropTypes.string,
  mdate: PropTypes.string,
  name: PropTypes.string.isRequired,
  orientation: PropTypes.string,
  rating: PropTypes.number,
  sd_height: PropTypes.number,
  sd_width: PropTypes.number,
  selectable: PropTypes.bool,
  seq_count: PropTypes.number,
  splittable: PropTypes.bool.isRequired,
  thumbnail: PropTypes.string,
  preview: PropTypes.string,
  tracks: PropTypes.number,
  resolution: PropTypes.string,
  video_3d: PropTypes.bool,
};
export default ShowMontages;

// ShowMontages Structure
// |
// |-- State Variables
// |   |-- montages
// |   |-- isLoading
// |   |-- orderBy
// |   |-- displayBy
// |   |-- qualityBy
// |   |-- orientationBy
// |   |-- commercialBy
// |   |-- isHovered
// |
// |-- Effects
// |   |-- Fetch montages
// |   |-- Sort montages
// |
// |-- Context
// |   |-- baseThumbnailURL
// |   |-- userId
// |
// |-- i18n Translation
// |
// |-- Handlers
// |   |-- handleMouseEnter
// |   |-- handleMouseLeave
// |
// |-- Components
// |   |-- TracksIcon & SixteenPlusIcon
// |   |-- Return
// |       |-- h1
// |       |-- FilterBar (if not isSmartTV)
// |       |-- div (container for montages)
// |           |-- Montage Cards (mapped from montages)
// |               |-- Card
// |                   |-- CardContent
// |                       |-- Typography (Tracks and Duration)
// |                       |-- Typography (Montage Name)
// |                       |-- CardMedia (Montage Image)
// |                       |-- Typography (Curator)
// |                       |-- CardActions
// |                           |-- Play Button
// |                           |-- Add Button
// |                       |-- Typography (Description, if hovered)
