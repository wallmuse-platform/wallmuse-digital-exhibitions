//MontageSelection.js main component

// React core and hooks
import React, { useState, useRef, useEffect, useContext } from "react";

// Material UI components
import Card from '@mui/material/Card';
import CardMedia from '@mui/material/CardMedia';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { Tooltip, Box, CircularProgress } from "@mui/material";
import PlaylistAddIcon from "@mui/icons-material/PlaylistAdd";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import FilterListIcon from '@mui/icons-material/FilterList';

// Custom components and utilities
import { searchMontages, addMontageToPlaylist, addPlaylist, updatePlaylist, deletePlaylist, loadPlaylist, getPlaylists } from '../utils/api.js';
import { saveTempPlaylistId } from '../utils/tempPlaylistsUtils.js';
import { monitorPlayback } from '../wsTools';
import { BaseThumbnailContext } from '../contexts/MontagesContext.js';
import { getUserId } from "../utils/Utils";
import FilterBar from "./FilterBar.js";
import { sortMontages } from './sortMontages';
import DescriptionManager from "./DescriptionManager";
import calculateDuration from "./calculateDuration.js";
import { useGatewayTooltip } from './gatewayTooltips';
import { useResponsive } from '../utils/useResponsive';
import { handleSendCommand } from "../App";
import { CustomSnackbar, CustomAlert } from "../CustomComponents.js";

// Context providers
import { useSession } from '../contexts/SessionContext.js';
import { PlaylistsContext } from '../contexts/PlaylistsContext';
import { useEnvironments } from "../contexts/EnvironmentsContext.js"

// Internationalization
import { useTranslation } from "react-i18next";

// Theme
import { currentTheme, selectTheme } from "../theme/ThemeUtils.js";

// PropTypes for component properties validation
import PropTypes from 'prop-types';
import { handleActionWithGuestCheck } from "../accounts/cloneGuest.js";

// PlayMode
import { handlePlayMontageEnd, savePreviousPlaylistId, clearPreviousPlaylistId} from "../Play/playModeUtils.js";

// Acounts
import useGuestActionPopup from "../accounts/useGuestActionPopup.js";


// Optional comments and checks
// import i18n from '../i18n.js'; 
// TOCHECK: import EnvironmentsContext to initiate houses? 

// Define the ShowMontages component

const ShowMontages = ({ onStop, onPlayStart, onPlayEnd, onTempPlaylistCreated, playModeRef },
  { access_kind, author, author_fn, author_id, authors, best_description, best_name,
    cdate, commercial, croppable, deconstructable, descriptions, duration, montage_id,
    interactive, language, mdate, name, orientation, rating, sd_height, sd_width,
    selectable, seq_count, splittable, thumbnail, preview, tracks, resolution, video_3d }) => {

  const { playlists, setPlaylists } = useContext(PlaylistsContext);
  const { userDetails, isPremium, isDemo } = useSession();  // Retrieve user details and guest status

  // Get all necessary context data from context
  const { 
    house, 
    currentPlaylist, 
    setCurrentPlaylist, 
    backendCurrentPlaylist, 
    handlePlaylistChange,
    loading, 
    syncComplete, 
    error 
  } = useEnvironments();

  console.log('[MontageSelection] userDetails ', userDetails, ' isDemo ', isDemo, ' isPremium', isPremium);

  // Using the i18n library for internationalization
  const { t } = useTranslation();
  const theme = selectTheme();

  console.log('[Montage Selection] playlists, setPlaylists', playlists, setPlaylists);
  // Utility function to find montage by ID
  const getMontageById = (id) => {
    return montages.find(montage => montage.id === id);
  };

  // State variables
  const [montages, setMontages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [orderBy, setOrderBy] = useState('Most Recent');
  const [displayBy, setDisplayBy] = useState('All Display Types');
  const [qualityBy, setQualityBy] = useState('All Resolutions');
  const [orientationBy, setOrientationBy] = useState('All Orientations');
  const [commercialBy, setCommercialBy] = useState('All Access Types');
  const [restrictedActionError, setRestrictedActionError] = useState(null);
  const [addSuccess, setAddSuccess] = useState(false);
  const [addError, setAddError] = useState(null);

  const { isSmartTV } = useResponsive();

  const handleRestrictedAction = () => {
    setRestrictedActionError(t("error.restricted_action"));
  };

  const handleCloseSnackbar = () => {
    setRestrictedActionError(null);
  };

  // Effect: Fetch and sort data
  useEffect(() => {
    console.log('[Montage Selection] searchMontages filters');
    setIsLoading(true);
    searchMontages().then(data => {
      const sortedData = sortMontages(data, orderBy, displayBy, qualityBy, orientationBy, commercialBy);
      setMontages(sortedData);
      setIsLoading(false);
    }).catch(error => {
      console.error('Error fetching montages:', error);
      setIsLoading(false);
    });
  }, [orderBy, displayBy, qualityBy, orientationBy, commercialBy]);

  const userId = getUserId();

  // Context
  const baseThumbnailURL = useContext(BaseThumbnailContext)

  //Handlers
  const [isHovered, setIsHovered] = useState(new Array(montages.length).fill(false));

  //Specific Icons
  const TracksIcon = () => (
    <img
      src="https://wallmuse.com/wallmuse/v4/tracks_h24px.png"
      alt="Tracks Icon"
      style={{
        position: 'relative',
        top: '2px',
        height: "16px"
      }}
    />
  );

  const SixteenPlusIcon = () => (
    <img
      src="https://wallmuse.com/wallmuse/v4/16+_h24px.png"
      alt="SixteenPlus Icon"
      style={{
        height: "16px"
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
    try {
      console.log('[MontageSelection] PlayMontage Adding montage to default playlist', montage, playlists, setPlaylists);
      addMontageToPlaylist(montage, '', playlists, setPlaylists)
        .then(() => {
          setAddSuccess(true);
          setAddError(null);
          console.log('Montage successfully added');
          
          // Auto-hide success message after 3 seconds
          setTimeout(() => {
            setAddSuccess(false);
          }, 3000);
        })
        .catch(error => {
          setAddSuccess(false);
          setAddError(t("error.add_montage") || "Error adding montage to playlist");
          console.error('Error in adding montage:', error);
        });
    } catch (error) {
      setAddSuccess(false);
      setAddError(t("error.add_montage") || "Error adding montage to playlist");
      console.error('Unexpected error:', error);
    }
  };

  // Function to scroll to the WebPlayer
  const scrollToWebPlayer = () => {
    const webPlayerElement = document.querySelector('.web-player-container');
    if (webPlayerElement) {
      const isMobile = window.innerWidth <= 768;
      const offset = isMobile ? 80 : 150; // Adjust offset based on header/menu height
      const topPosition = webPlayerElement.getBoundingClientRect().top + window.pageYOffset - offset;

      window.scrollTo({ top: topPosition, behavior: 'smooth' });
    } else {
      console.warn('[scrollToWebPlayer] WebPlayer element not found.');
    }
  };

  const handlePlayMontage = async (montageId) => {
    console.time("[MontageSelection handlePlayMontage] Execution Timer");

    try {
      // Get montage data
      const montage = getMontageById(montageId);
      if (!montage) {
        console.error('[MontageSelection handlePlayMontage] Montage not found:', montageId);
        return;
      }

      // Calculate duration of the montage for timing purposes
      const montageDuration = parseFloat(montage.duration || 60);
      console.log(`[MontageSelection handlePlayMontage] Montage duration: ${montageDuration}s`);

      // Scroll to WebPlayer
      scrollToWebPlayer();

      // Create temp playlist
      const now = new Date();
      const timestamp = now.toISOString().replace(/[-:.]/g, "").slice(0, 15);
      const playlistName = `Temp_Playlist_${timestamp}`;

      let tempPlaylist = await addPlaylist(playlistName);
      if (!tempPlaylist.data || tempPlaylist.status >= 400) {
        console.error('[MontageSelection handlePlayMontage] Failed to create playlist:', tempPlaylist.statusText);
        return;
      }

      tempPlaylist = tempPlaylist.data;
      console.log('[MontageSelection handlePlayMontage] Temp playlist created:', tempPlaylist);

      // Call a callback to inform the parent component
      onTempPlaylistCreated(tempPlaylist.id); //  Use the destructured prop

      // Update playlists
      const newPlaylists = [tempPlaylist, ...playlists];

      savePreviousPlaylistId(currentPlaylist);

      setPlaylists(newPlaylists);

      // Add montage to playlist
      await addMontageToPlaylist(montage, tempPlaylist.id, newPlaylists, setPlaylists);
      console.log('[MontageSelection handlePlayMontage] Montage added to playlist');

      // Stop current playback
      // await onStop(house);
      // console.log("[MontageSelection handlePlayMontage] Current playback stopped l247");

      try {
        // Load the playlist and start playback
        await loadPlaylist(house, tempPlaylist.id);
        console.log(`[MontageSelection handlePlayMontage] Loading playlist with house: ${house}, playlist: ${tempPlaylist.id}`);

        // Then, wait for the backend to confirm
        console.log(`[MontageSelection handlePlayMontage] Now waiting for backend confirmation...`);
        const syncSuccess = await handlePlaylistChange(tempPlaylist.id);
        console.log(`[MontageSelection handlePlayMontage] Backend sync completed with result: ${syncSuccess}`);

        if (syncSuccess) {
          // Signal play start
          onPlayStart();
          // playModeRef.current=true;
          // Now check if it's the current playlist AFTER sync is complete
          const isCurrent = (tempPlaylist.id == currentPlaylist);
          console.log('[MontageSelection handlePlayMontage] currentPlaylist after sync:', currentPlaylist, 'isCurrent:', isCurrent);
  
        } else {
            console.warn(`[MontageSelection handlePlayMontage] Backend sync failed or timed out for playlist ${playlistId}.`);
        }
      } catch (error) {
        console.error('[MontageSelection handlePlayMontage] Error loading playlist:', error);
      } finally {
        setTimeout(() => {
          console.log(`[MontageSelection handlePlayMontage] Force Play:`);
          handleSendCommand('<vlc><cmd action="play"/></vlc>', house);
        }, 500); // 500ms delay

      }
      // Set a timer to stop playback after the montage duration plus a small buffer
      // This prevents looping and ensures cleanup
      // Inside the timeout function in handlePlayMontage
      // Store the timer reference

      const playbackTimer = setTimeout(async () => {
        console.log("[MontageSelection handlePlayMontage playbackTimer] Timer fired after", montageDuration, "seconds");
        console.log("[MontageSelection handlePlayMontage playbackTimer] Current playModeRef:", playModeRef.current);
        
        if (!playModeRef.current) {
          console.log("[MontageSelection handlePlayMontage playbackTimer] Already out of play mode, cleanup already done");
          return;
        }
        
        console.log(`[MontageSelection handlePlayMontage playbackTimer] Montage playback duration reached, stopping playback. Temp playlist:`, tempPlaylist.id);
        
        try {
          // Stop playback
          console.log("[MontageSelection handlePlayMontage playbackTimer] Calling onStop with house:", house);
          await onStop(house);
          console.log("[MontageSelection handlePlayMontage playbackTimer] Stop command sent successfully");
          
          // Clean up - Call handlePlayMontageEnd directly
          console.log("[MontageSelection handlePlayMontage playbackTimer] Now calling handlePlayMontageEnd with tempPlaylist.id:", tempPlaylist.id);
          await handlePlayMontageEnd(tempPlaylist.id, {
            house,
            handlePlaylistChange, 
            currentPlaylist,
            setPlaylists,
            playModeRef,
            onPlayEnd: () => {
              console.log("[MontageSelection handlePlayMontage] onPlayEnd callback executing, setting playModeRef to false");
              playModeRef.current=false;
            }
          });
          console.log("[MontageSelection handlePlayMontage playbackTimer] handlePlayMontageEnd completed successfully");

          // Scroll back to the montage element
          const lastMontageElement = document.getElementById(`montage-${montageId}`);
          if (lastMontageElement) {
            console.log("[MontageSelection handlePlayMontage playbackTimer] Scrolling to montage element");
            lastMontageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } else {
            console.log("[MontageSelection handlePlayMontage playbackTimer] Montage element not found for scrolling");
          }
        } catch (error) {
          console.error('[MontageSelection handlePlayMontage playbackTimer] Error in playback end handling:', error);
          console.log("[MontageSelection handlePlayMontage playbackTimer] Calling onPlayEnd due to error");
          onPlayEnd();
        }
      }, (montageDuration * 1000) + 1000);

      console.log(`[MontageSelection handlePlayMontage playbackTimer] Timer set to fire after ${montageDuration} seconds + 500ms`);

      // Return a function to cancel the timer if needed
      return () => {
        console.log(`[MontageSelection handlePlayMontage playbackTimer] Cleanup function called, clearing timeout`);
        clearTimeout(playbackTimer);
      };

    } catch (error) {
      console.error('[MontageSelection handlePlayMontage] Error:', error);
      onPlayEnd();
    } finally {
      console.timeEnd("[MontageSelection handlePlayMontage] Execution Timer");
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
    )
  } else return (
    <div className="showmontages">
      <div>
        {/* Header Section with Centered Title and Right-aligned Button */}
        <div style={{
          position: 'relative',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '0 1rem',
          marginBottom: '1rem'
        }}>
          <h2 style={{
            textTransform: 'uppercase',
            margin: '2em',
            textAlign: 'center'
          }}>
            {t("show_exhibitions." + currentTheme())}
          </h2>

          <div style={{
            position: 'absolute',
            right: '1rem',
            top: '50%',
            transform: 'translateY(-50%)'
          }}>
            <Tooltip title={showFilters ? t("hide_filters.tip") : t("show_filters.tip")}>
              <Button
                onClick={toggleFilters}
                variant="contained"
                className="tabs_text"
              >
                {showFilters ? t('hide_filters') : t('show_filters')}
                <FilterListIcon sx={{ marginLeft: 1 }} className="tabs_icon" />
              </Button>
            </Tooltip>
          </div>
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
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        width: '100%'
      }}>

        {sortMontages(montages, orderBy, displayBy, splittable, deconstructable, qualityBy, resolution, orientationBy, orientation, commercialBy, commercial).map((montage, index) => {
          const { id } = montage;
          // console.log ('id for ESLint', id);

          let ratio;
          if (montage.sd_width) {
            ratio = parseInt(montage.sd_width, 10) / parseInt(montage.sd_height, 10);
          } else if (montage.orientation === 'L') {
            ratio = 16 / 9;
          } else if (montage.orientation === 'P') {
            ratio = 9 / 16;
          } else {
            ratio = 16 / 9;
          }

          const tooltipPlay = gatewayTooltipAction('_play', userId, montage);
          const tooltipAdd = gatewayTooltipAction('_add', userId, montage);

          return (
            <div key={montage.id} style={{ flexBasis: '20rem', margin: '1em', position: 'relative' }}
            >
              <Card
                style={{
                  display: 'grid',
                  gridTemplateRows: 'auto 1fr auto',
                  border: '1px solid',
                  borderColor: theme.palette.primary.main,
                  borderRadius: '1em',
                  margin: '2em',
                  position: isHovered[index] === true ? 'absolute' : 'static',
                  transform: isHovered[index] === true ? 'scale(1.5)' : 'scale(1)',
                  transformOrigin: 'center',
                  zIndex: isHovered[index] === true ? 1 : 0,
                  transition: 'transform 0.5s ease-out',
                  willChange: 'transform'
                }}
                onMouseEnter={() => setIsHovered(prevState => ({ ...prevState, [index]: true }))}
                onMouseLeave={() => setIsHovered(prevState => ({ ...prevState, [index]: false }))}
              >
                <CardContent style={{ paddingBottom: '0', position: 'relative' }}>
                  {!isPremium && <div
                    style={{
                      borderRadius: '16px',
                      padding: '0 4px',
                      position: 'absolute',
                      top: '0',
                      right: '0',
                      fontSize: '0.75rem',
                      color: theme.palette.primary.main,
                    }}
                  >
                    {montage.selectable === "N" ?
                      <span style={{ color: '#1556ED' }}>Premium</span> :
                      <span style={{ color: '#0EE6AC' }}>Free</span>
                    }
                  </div>}

                  <Typography
                    variant="div"
                    color="text.secondary"
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      position: 'sticky',
                      top: 0
                    }}
                  >
                    <span style={{ verticalAlign: 'middle' }}>
                      <TracksIcon />
                      <span style={{ position: 'absolute', zIndex: '2', marginLeft: '-20px' }}>{montage.tracks}</span>
                    </span>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <span style={{ verticalAlign: 'middle' }}>
                        {t("_duration")} {calculateDuration(montage.duration)}
                      </span>
                    </div>
                    <span style={{ verticalAlign: 'middle' }}>
                      {montage.rating === "NC-17" && <SixteenPlusIcon />}
                    </span>
                  </Typography>
                  <Typography
                    variant="h5"
                    component="div"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'auto',
                      height: '6rem',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {montage.name}
                  </Typography>
                  <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '10px', paddingBottom: '10px' }}>
                    <CardMedia
                      component="img"
                      style={{
                        height: '140px',
                        width: `${140 * ratio}px` // Calculate the width based on the aspect ratio
                      }}
                      image={baseThumbnailURL + "&session:" + userId + "&artwork=" + montage.thumbnail_url}
                      alt={montage.name}
                    />
                  </div>
                  {(montage.author || montage.author_fn) && (
                    <Typography variant="body2" color="text.secondary"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        height: '2rem',
                        textOverflow: 'ellipsis',
                        justifyContent: 'center'
                      }}
                    >
                      {t(("_curator.") + currentTheme())} {montage.author ? montage.author : ''} {montage.author_fn ? montage.author_fn : ''}
                    </Typography>
                  )}

                  <div id={`montage-${montage.id}`} key={montage.id}>

                    <CardActions style={{ justifyContent: 'center' }} key={montage.id}>
                      <Tooltip title={tooltipPlay}>
                        <Button
                          size="small"
                          variant="outlined"
                          endIcon={<PlayArrowIcon size="small" />}
                          onClick={async () => {
                            handlePlayMontage(montage.id); // Proceed with playing montage
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
                          onClick={() => handleAction(
                            () => handleSelectMontage(montage.id),
                            montage.selectable === "N" // Pass whether this is premium content
                          )}
                        >
                          Add
                        </Button>
                      </Tooltip>
                    </CardActions>
                  </div>
                  {isHovered[index] && (
                    <span style={{
                      display: 'flex',
                      flexDirection: 'column',
                      height: '100%'
                    }}>
                      <Typography variant="body2" color="text.secondary" style={{ textAlign: 'justify', marginBottom: '1em' }}>
                        <DescriptionManager descs={montage.descriptions} bestDescription={montage.best_description} bestName={montage.best_name} />
                      </Typography>
                    </span>
                  )}
                </CardContent>
              </Card>
            </div>
          );
        }
        )}
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
    </div>
  );
}

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

