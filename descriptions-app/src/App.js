/**
 * App.js — Wallmuse Descriptions App, main component
 *
 * PURPOSE (see docs/DESCRIPTIONS_APP_ARCHITECTURE.md §3.1)
 * Primary container for the real-time artwork display system. Manages all state,
 * fetches the current playlist for a given screen, and drives automatic artwork
 * transitions in sync with the Wallmuse backend timeline.
 *
 * INTEGRATION (§7 — Wallmuse Ecosystem)
 * - Embedded inside a WordPress page as a React root mounted on:
 *     <div id="root-descriptions" data-user="<?=$sessionId?>" data-theme="..."></div>
 * - Screen is identified via URL param: ?screen=screen_id
 *   Each physical display (room, wall) has its own screen ID. The backend
 *   returns the playlist assigned to that screen.
 * - User session is read from data-user (set by PHP) or ?user= URL param.
 *
 * LAYOUT (§6.1)
 *   Grid Container (100vh)
 *   ├── Previous Button  (xs=2, hidden if single artwork)
 *   ├── Artwork Display  (xs=8, or xs=12 if single artwork)
 *   │   ├── Title, Datation, Image, Author, Description, Footer
 *   └── Next Button      (xs=2, hidden if single artwork)
 *   └── Timeline Slider  (xs=12, hidden if single artwork)
 *
 * SINGLE-ARTWORK MODE (street print / QR-code use case)
 * When the playlist contains exactly one artwork, all navigation controls
 * (arrows, slider) are hidden and the display expands to full width.
 * Create a mono-playlist with one montage and one artwork on the backend.
 *
 * KNOWN LIMITATIONS (§5.2, §9.1)
 * - Browser tab throttling: setInterval may fire at reduced frequency when
 *   the tab is backgrounded (especially on mobile). This can cause drift.
 *   Future fix: use the Page Visibility API to pause/resume, or switch to
 *   WebSocket server-push updates.
 * - Network latency is not compensated beyond the initial server position sync.
 * - Future improvements: WebSocket real-time updates, heartbeat re-sync,
 *   React.memo for expensive renders, image preloading. (§11)
 */
import React, { useState, useEffect, useRef } from "react";
// Specific to descriptions app
import './App.css';
import { ThemeProvider } from "@mui/material/styles";
import { Stack, CircularProgress, Grid } from "@mui/material";
import Slider from '@mui/material/Slider';
import Box from '@mui/material/Box';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import IconButton from '@mui/material/IconButton';
import { detailsUser, currentArtworks } from './utils/api';
import { currentTheme, selectTheme } from "./theme/ThemeUtils";
// -----------------       i18n      ------------------  //
// i18n is initialised here (EN/FR resources loaded, LanguageDetector active).
// NOTE: artwork titles, descriptions, and metadata are NOT translated via t() —
// they come directly from the backend CMS in whatever language is stored there
// (determined per-artwork in the Wallmuse backend, not client-side).
// t() is available for future use on static UI labels (Location, Artwork Owner…).
// If you need to force a language via URL, use ?lng=fr (NOT ?lang=fr — the
// i18next-browser-languagedetector default query param is 'lng').
import './i18n';
import { useTranslation } from "react-i18next";
import { getUserId } from './utils/Utils';
import { useLocation } from 'react-router-dom';


function App() {
  // Theme is selected from the subdomain (wallmuse / sharex / aviff / ooo2).
  // See ThemeUtils.js and docs/DESCRIPTIONS_APP_ARCHITECTURE.md §3.3.
  const theme = selectTheme();
  const { t, i18n } = useTranslation();
  const session = getUserId();
  const [isLoading, setIsLoading] = useState(false);
  const [counter, setCounter] = useState(0);
  const [artworks, setArtworks] = useState(null);
  const [currentArtworkIndex, setCurrentArtworkIndex] = useState(0);
  const [originalArtworks, setOriginalArtworks] = useState(null);
  const [artworksWithTiming, setArtworksWithTiming] = useState(null);
  // `duration` = total playlist length in seconds (sum of all artwork durations + offsets).
  // Used as the slider max value. Calculated once after fetch. (§4.2)
  const [duration, setDuration] = useState(0);

  const location = useLocation();
  // `screen` identifies the physical display. Passed to the API so the backend
  // returns the playlist assigned to that screen. (§7.1)
  const urlParams = new URLSearchParams(window.location.search);
  const screen = urlParams.get('screen');

  // Logs the current screen from URL parameters and updates based on the screen value.
  useEffect(() => {
    console.log('[Descriptions App] screen', screen); // logs: screen1 or whatever value you passed in the URL
    // Here you can fetch or process any information relative to the screen variable.
  }, [screen]); // Runs whenever the screen parameter changes.

  // Fetches user-specific details when the component is mounted.
  useEffect(() => {
    detailsUser()
      .then((data) => {
        const { userAccount, house, environments, screens } = data;
        console.log('[Descriptions App] userAccount, house, environments, screens', userAccount, house, environments, screens); // Logs user-related data for debugging.
      })
      .catch((error) => {
        console.error("[Descriptions App] Error fetching details user:", error); // Logs any errors in fetching user details.
      });
  }, []); // Empty dependency array ensures this runs only once when the component mounts.

  // TIMING DESIGN (§4.2, §5.1)
  // startTimeRef is the wall-clock anchor for the counter. Using useRef (not a
  // plain variable) ensures it survives re-renders without recreating Date.now().
  // The counter represents seconds elapsed since startTimeRef.current.
  // On initial load it is offset by the server's reported playlist position so
  // the viewer starts on the correct artwork immediately (see fetch useEffect).
  // On playlist loop it is reset to Date.now() so cumulative endTimes stay valid.
  const startTimeRef = useRef(Date.now());

  // Updates the `counter` value every second to track elapsed time. (§5.1)
  // IMPORTANT: counter is calculated as (now - startTimeRef.current) — NOT by
  // incrementing a variable — so it does not drift even if the interval fires
  // slightly late. setInterval is inherently imprecise; this pattern compensates.
  // LIMITATION: on mobile, browsers throttle background tabs to ~1 tick/minute,
  // which will cause the counter to fall behind. (§5.2 Known Limitations)
  useEffect(() => {
    const intervalId = setInterval(() => {
      const currentTime = Date.now();
      const elapsedTimeInSeconds = Math.floor((currentTime - startTimeRef.current) / 1000);
      setCounter(elapsedTimeInSeconds); // Updates the counter state every second.
    }, 1000);

    return () => {
      clearInterval(intervalId); // Clears the interval to prevent memory leaks.
    };
  }, []); // Empty dependency array ensures this runs only once when the component mounts.

  // Calculates total playlist duration from the processed artwork timings. (§4.2)
  // Each artwork's contribution = endTime - startTime (which includes its offset).
  const calculateTotalDurationFromStartAndEndTimes = (artworks) => {
    let totalDuration = 0;
    artworks.forEach(artwork => {
      const startTime = Number(artwork.startTime);
      const endTime = Number(artwork.endTime);
      if (!isNaN(startTime) && !isNaN(endTime)) {
        const duration = endTime - startTime;
        totalDuration += duration;
      }
    });
    return totalDuration;
  };

  // Fetches artworks for the current screen and sets up timing. (§2.2, §3.2, §4.2)
  //
  // DATA FLOW:
  //   URL ?screen= → API get_current_artworks → XML → JSON → timing calc → state
  //
  // TIMING CALCULATION (§4.2):
  //   endTimes are CUMULATIVE across the playlist (not per-artwork).
  //   artwork[0]: startTime=0,        endTime=duration0
  //   artwork[1]: startTime=endTime0, endTime=endTime0+duration1
  //   etc.
  //   This means the counter must keep growing monotonically; it is only reset
  //   when the entire playlist loops back to artwork[0].
  //
  // SERVER POSITION SYNC:
  //   The backend XML <playlist position="X.XX"> reports the current playback
  //   position in seconds. We anchor startTimeRef so that elapsed time immediately
  //   equals that position. This ensures a viewer joining mid-playlist sees the
  //   correct artwork straight away, not always artwork #0.
  //
  // ARTWORK OBJECT STRUCTURE (§4.1):
  //   { id, title, startTime, endTime, datation_start, datation_end,
  //     datation_kind, author, description (HTML), location, owner,
  //     capture, image_url }
  useEffect(() => {
    setIsLoading(true); // Indicates the loading state.
    currentArtworks(screen)
      .then(({ artworks: originalArtworks, serverPosition }) => {
        let startTime = 0;
        const artworks = originalArtworks.map((artwork) => {
          const duration = parseFloat(artwork._attributes.duration);
          const offset = parseFloat(artwork._attributes.offset);
          const endTime = startTime + duration + offset;

          const newArtwork = {
            id: artwork._attributes.id,
            title: artwork._attributes.title,
            startTime: startTime,
            endTime: endTime,
            datation_end: artwork._attributes.datation_end,
            datation_start: artwork._attributes.datation_start,
            datation_kind: artwork._attributes.datation_kind,
            author: artwork._attributes.author,
            // description contains HTML from the backend CMS. Rendered via
            // dangerouslySetInnerHTML — safe only because source is the trusted
            // Wallmuse backend. Do not render user-supplied HTML here.
            description: artwork._attributes.description,
            location: artwork._attributes.location,
            owner: artwork._attributes.owner,
            capture: artwork._attributes.capture,
            image_url: artwork._attributes.url, // Image URL for rendering.
          };

          startTime = endTime; // Update start time for the next artwork.
          return newArtwork;
        });

        setArtworksWithTiming(artworks); // Sets timing data for all artworks.
        setArtworks(artworks); // Updates the artworks state.
        setDuration(calculateTotalDurationFromStartAndEndTimes(artworks)); // Calculates total duration.

        // Anchor the client clock to the server's current playlist position.
        const pos = serverPosition || 0;
        startTimeRef.current = Date.now() - pos * 1000;
        setCounter(Math.floor(pos));
        const initialIndex = artworks.findIndex((a) => pos >= a.startTime && pos < a.endTime);
        if (initialIndex !== -1) {
          setCurrentArtworkIndex(initialIndex);
        }

        setIsLoading(false); // Stops the loading spinner.
      })
      .catch((error) => {
        console.error("[Descriptions App] Error fetching artworks:", error); // Logs errors in fetching artworks.
        setIsLoading(false);
      });
  }, [screen]); // Runs whenever the screen parameter changes.

  // Drives automatic artwork transitions. (§5.1)
  //
  // Compares counter (elapsed seconds) against the CUMULATIVE endTime of the
  // current artwork. When counter reaches that threshold the next artwork is shown.
  //
  // LOOP BEHAVIOUR: when the last artwork ends, nextIndex wraps to 0.
  // At that point ONLY, we reset startTimeRef and counter to 0 so that the
  // cumulative endTimes are valid again from the start of the new cycle.
  // For mid-playlist advances we do NOT reset — the counter keeps growing,
  // which is exactly what cumulative comparison requires.
  useEffect(() => {
    if (
      artworksWithTiming &&
      artworksWithTiming[currentArtworkIndex] &&
      counter >= artworksWithTiming[currentArtworkIndex].endTime
    ) {
      console.log("[Descriptions App] Updating currentArtworkIndex..."); // Debugging the index update.
      const nextIndex = (currentArtworkIndex + 1) % artworksWithTiming.length;
      if (nextIndex === 0) {
        // Looping back to start: reset the reference time so cumulative endTimes start fresh.
        startTimeRef.current = Date.now();
        setCounter(0);
      }
      setCurrentArtworkIndex(nextIndex); // Moves to the next artwork.
    }
  }, [counter, artworksWithTiming, currentArtworkIndex]); // Runs whenever `counter`, `artworksWithTiming`, or `currentArtworkIndex` changes.

  // Automatically scrolls to the active artwork whenever `currentArtworkIndex` changes.
  useEffect(() => {
    if (!artworks || artworks.length === 0) {
      console.log('[Descriptions App] Artworks is null or undefined');
      return; // Exit early if artworks are not yet populated
    }

    // Ensure `currentArtworkIndex` is within bounds
    if (currentArtworkIndex < 0 || currentArtworkIndex >= artworks.length) {
      console.error('[Descriptions App] Invalid currentArtworkIndex:', currentArtworkIndex);
      return;
    }

    const activeArtwork = document.querySelector(`.active-artwork`); // Selects the current active artwork.
    if (activeArtwork) {
      activeArtwork.scrollIntoView({ behavior: "smooth", inline: "center" }); // Scrolls to the active artwork smoothly.
    }
  }, [currentArtworkIndex, artworks]); // Runs whenever the current artwork index or artworks change.

  if (artworks) {
    console.log('[Descriptions App] Current Artwork:', artworks[currentArtworkIndex]);
    console.log('[Descriptions App] Location:', artworks[currentArtworkIndex]?.location);
    console.log('[Descriptions App] Owner:', artworks[currentArtworkIndex]?.owner);
    console.log('[Descriptions App] Capture:', artworks[currentArtworkIndex]?.capture);
  } else {
    console.log('Artworks is null or undefined');
  }

  if (isLoading || !artworks || artworks.length === 0) {
    return <CircularProgress />; // Show a loading sign while isLoading is true or artworks is not yet populated
  } else {
    return (
      <ThemeProvider theme={theme}>
        <Grid container style={{ height: "100vh" }}>
          {/* Previous Button — hidden when playlist has only one artwork (§6.1, single-artwork mode) */}
          {artworks.length > 1 && (
            <Grid item xs={2} style={{ flexGrow: 1, height: "100%", overflow: "visible" }}>
              {/* overflow:visible prevents iOS Safari from clipping the ArrowBackIosNewIcon,
                  which has a natural leftward visual offset in MUI. ml:"3px" nudges it right. */}
              <Box display="flex" alignItems="center" justifyContent="center" style={{ height: "100%", overflow: "visible" }}>
                <IconButton
                  style={{ border: "2px solid #000", borderRadius: "50%" }}
                  onClick={() => setCurrentArtworkIndex((prevIndex) => Math.max(prevIndex - 1, 0))}
                >
                  <ArrowBackIosNewIcon fontSize="large" sx={{ ml: "3px", color: "#000" }} />
                </IconButton>
              </Box>
            </Grid>
          )}

          {/* Artwork Display — full width (xs=12) in single-artwork mode, xs=8 otherwise */}
          <Grid item xs={artworks.length === 1 ? 12 : 8} style={{ flexGrow: 1, height: "100%" }}>
            <Box display="flex" alignItems="center" justifyContent="center" style={{ height: "100%" }}>
              {artworks && (
                <div className="descriptions-all">
                  <div className="descriptions-body">
                    {/* Title — strip display-hint tokens like {_1_4K} or {visual and audio}
                        that the backend embeds in titles for internal use. */}
                    <div className="descriptions-title" style={{  textAlign: "center", color: theme.palette.primary.main, fontSize: "1.5rem", fontWeight: "bold", margin: "10px 0" }}>
                      {artworks[currentArtworkIndex]?.title.replace(/ *\{[^}]*\} */g, "")}
                    </div>
                    {/* Datation — date strings from API are full ISO dates (e.g. "2012-01-01").
                        We compare only the year portion (slice 0-4).
                        - Same year → shows ( 2012 )
                        - Different years → shows ( 2012 - 2016 )
                        - datation_hidden === "Y" → nothing shown */}
                    <div className="descriptions-datation" style={{ textAlign: "center" }}>

                        {artworks[currentArtworkIndex]?.datation_hidden === "Y"
                          ? null
                          : artworks[currentArtworkIndex]?.datation_start?.slice(0, 4) === artworks[currentArtworkIndex]?.datation_end?.slice(0, 4)
                            ? `( ${artworks[currentArtworkIndex]?.datation_start?.slice(0, 4)} )`
                            : `( ${artworks[currentArtworkIndex]?.datation_start?.slice(0, 4)} - ${artworks[currentArtworkIndex]?.datation_end?.slice(0, 4)} )`}

                    </div>
                    {/* Artwork Details */}
                    <div className="descriptions-view" style={{ textAlign: "center" }}>
                      {/* Image */}
                      <div
                        className="active-artwork"
                        style={{
                          margin: "0 auto",
                          textAlign: "center",
                          padding: "2px",
                        }}
                      >
                        <img
                          src={artworks[currentArtworkIndex]?.image_url}
                          alt={artworks[currentArtworkIndex]?.title}
                          style={{ width: "100%", display: "block" }}
                        />
                      </div>
                    </div>

                    {/* Author */}
                    {artworks[currentArtworkIndex]?.author && (
                      <div className="descriptions-author" style={{ textAlign: "center" }}>
                        <h3>{artworks[currentArtworkIndex]?.author}</h3>
                      </div>
                    )}
                    {/* Description — raw HTML from the backend CMS.
                        Language is determined per-artwork in the CMS (not client-side).
                        Some artworks may have English descriptions if only English was
                        entered in the CMS — this is a content issue, not a code issue.
                        dangerouslySetInnerHTML is intentional: descriptions may contain
                        formatting tags. Source is the trusted Wallmuse backend only. */}
                    {artworks[currentArtworkIndex]?.description && (
                      <div
                        className="descriptions-description"
                        style={{
                          maxHeight: "250px",
                          overflowY: "scroll",
                          margin: "10px",
                          padding: "10px",
                        }}
                        dangerouslySetInnerHTML={{ __html: artworks[currentArtworkIndex]?.description }}
                      />
                    )}

                    {/* Footer: Location, Artwork Owner, Capture
                        These labels are currently hardcoded in English.
                        Future: replace with t('location'), t('owner'), t('capture')
                        once translation keys are added to translationEN.json / translationFR.json */}
                    <div className="descriptions-footer" style={{ textAlign: "center" }}>
                      {artworks[currentArtworkIndex]?.location && (
                        <div>Location: {artworks[currentArtworkIndex].location}</div>
                      )}
                      {artworks[currentArtworkIndex]?.owner && (
                        <div>Artwork Owner: {artworks[currentArtworkIndex].owner}</div>
                      )}
                      {artworks[currentArtworkIndex]?.capture && (
                        <div>Capture: {artworks[currentArtworkIndex].capture}</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </Box>
          </Grid>

          {/* Next Button — hidden when playlist has only one artwork (single-artwork mode) */}
          {artworks.length > 1 && (
            <Grid item xs={2} style={{ flexGrow: 1, height: "100%" }}>
              <Box display="flex" alignItems="center" justifyContent="center" style={{ height: "100%" }}>
                <IconButton
                  style={{ border: "2px solid #000", borderRadius: "50%" }}
                  onClick={() =>
                    setCurrentArtworkIndex((prevIndex) => Math.min(prevIndex + 1, artworks.length - 1))
                  }
                >
                  {/* color="#000" set explicitly — MUI icons use fill:currentColor and
                      may inherit white from some theme contexts, making them invisible. */}
                  <ArrowForwardIosIcon fontSize="large" sx={{ color: "#000" }} />
                </IconButton>
              </Box>
            </Grid>
          )}

          {/* Timeline Slider — hidden in single-artwork mode.
              Allows manual scrubbing through the playlist.
              onChange updates startTimeRef so the interval does not immediately
              override the scrubbed position. (§6.2) */}
          {artworks.length > 1 && <Grid item xs={12}>
            <Slider
              value={counter}
              onChange={(e, newValue) => {
                startTimeRef.current = Date.now() - newValue * 1000;
                setCounter(newValue);
                const newIndex = artworksWithTiming.findIndex(
                  (artwork) => newValue >= artwork.startTime && newValue < artwork.endTime
                );
                if (newIndex !== -1) {
                  setCurrentArtworkIndex(newIndex);
                }
              }}
              valueLabelDisplay="auto"
              step={1}
              min={0}
              max={duration}
            />
          </Grid>}
        </Grid>
      </ThemeProvider>
    )
  }
}

export default App;
