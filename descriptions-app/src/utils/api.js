/**
 * api.js — Wallmuse Descriptions App, API layer
 *
 * PURPOSE (see docs/DESCRIPTIONS_APP_ARCHITECTURE.md §3.2)
 * All backend communication for the Descriptions App lives here.
 * Handles XML responses, converts them to JSON, calculates playlist
 * timing, and returns structured data to App.js.
 *
 * BACKEND (§7.2)
 * Base URL: https://wallmuse.com:8443/wallmuse/ws
 * Authentication: session-based. The session ID is read from the DOM
 * element data-user attribute (set by PHP in the WordPress template) via getUserId().
 * Session IDs can contain spaces — see serializeParams below.
 *
 * DATA FLOW (§2.2)
 *   currentArtworks(screen)
 *     → GET /get_current_artworks?screen=X&session=Y
 *     → XML response
 *     → xml2json conversion
 *     → timing calculation (cumulative startTime/endTime)
 *     → returns { artworks[], serverPosition }
 *
 * TIMING (§4.2)
 * endTimes are cumulative across the playlist:
 *   artwork[0]: endTime = duration0 + offset0
 *   artwork[1]: endTime = endTime0 + duration1 + offset1
 *   etc.
 * App.js relies on this structure for its counter comparison.
 * Do NOT change to per-artwork durations without updating App.js transition logic.
 *
 * SERVER POSITION
 * The XML root element <playlist position="X.XX"> tells us where in the
 * playlist the backend currently is (in seconds). This is returned as
 * serverPosition so App.js can anchor its client clock to match, ensuring
 * viewers who open the page mid-playlist see the correct artwork immediately.
 *
 * KNOWN ISSUES / FUTURE (§9.3, §11.1)
 * - No retry on network failure — consider exponential backoff for resilience.
 * - No WebSocket: the app polls only on mount (or screen change). A WebSocket
 *   push from the server would allow instant re-sync when the playlist changes.
 * - Error boundary: currently errors are caught and logged; a user-facing
 *   fallback message would improve the experience.
 */
import axios from 'axios';
// import { getUserId } from './Utils';
import { getUserId } from './Utils.js';
import { xml2json } from 'xml-js';

const baseURL = 'https://wallmuse.com:8443/wallmuse/ws';

/**
 * Custom parameter serializer that preserves spaces in session IDs.
 * This is critical: Wallmuse session IDs (WordPress session tokens) can
 * contain spaces. Standard encodeURIComponent() converts spaces to %20,
 * which the backend rejects. This serializer leaves the session value
 * as-is while still encoding all other parameters normally.
 * (§7.2 — Session Management)
 */
const serializeParams = params => {
  // Special handling for the session parameter
  if (params.session) {
    // For the session parameter, we want to keep its exact format
    // For all other parameters, we use normal URL encoding
    const sessionParam = `session=${params.session}`;

    // Create the rest of the parameters normally
    const otherParams = Object.entries(params)
      .filter(([key]) => key !== 'session')
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');

    return otherParams ? `${sessionParam}&${otherParams}` : sessionParam;
  } else {
    // Fall back to normal serialization if no session parameter
    return Object.entries(params)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');
  }
};

/**
 * detailsUser — fetches user account context from the backend.
 * Returns user account, house, environments, and screen data.
 * Currently used only for logging in App.js; could be used in future
 * to drive per-user personalisation. (§3.2)
 */
export const detailsUser = async () => {
  console.log('[api] detailsUser: Starting user details retrieval');

  try {
    const response = await axios.get(`${baseURL}/get_wp_user`, {
      headers: {
        Accept: 'text/x-json',
      },
      params: {
        version: 1,
        session: getUserId(),
      },
    });

    if (response.data?.tag_name === 'error') {
      console.error('[api] detailsUser: Server error:', response.data.message);
      return { success: false, error: response.data, user: null };
    }

    console.log('[api] detailsUser: Retrieved user details successfully');
    return { success: true, user: response.data };
  } catch (error) {
    console.error('[api] detailsUser: Failed to retrieve user details:', error);
    return { success: false, error: error.message, user: null };
  }
};

/**
 * currentArtworks — fetches and processes the artwork playlist for a screen.
 *
 * @param {string} screen — the screen identifier from ?screen= URL param
 * @returns {{ success, artworks[], serverPosition }}
 *
 * RESPONSE STRUCTURE (abbreviated):
 *   <playlist position="8.72">
 *     <artwork artwork_id="..." title="..." duration="62.06" offset="0.0"
 *              description="..." datation_start="2012-01-01" ... >
 *       <credit kind="AUT" name="..." display_name="..."/>
 *     </artwork>
 *     ...
 *   </playlist>
 *
 * SINGLE-ARTWORK EDGE CASE:
 * xml2json returns artwork as an object (not array) when there is only one.
 * The Array.isArray check normalises this to always be an array so the
 * map() below works regardless of playlist size.
 *
 * LANGUAGE NOTE:
 * The description attribute is returned in whatever language is stored in
 * the backend CMS for that artwork. There is no language parameter in this
 * call — language is determined server-side from the user session. If some
 * artworks show the wrong language, the description needs to be updated in
 * the Wallmuse backend CMS, not in this code.
 *
 * ARTWORK OBJECT (§4.1 — returned inside the artworks array):
 *   { ...rawXmlObject, startTime, endTime, url, datation_start,
 *     datation_end, author, credits[] }
 * Note: App.js re-maps these into a cleaner flat object — both the spread
 * _attributes and the top-level convenience fields are available.
 */
export const currentArtworks = async screen => {
  console.log('[api] currentArtworks: Starting artwork retrieval for screen:', screen);

  try {
    // Fetch the current artworks
    const response = await axios.get(`${baseURL}/get_current_artworks`, {
      headers: {
        Accept: 'text/xml',
      },
      params: {
        version: 1,
        session: getUserId(),
        screen: screen,
      },
    });

    // Convert the XML response to JSON
    const data = JSON.parse(xml2json(response.data, { compact: true, spaces: 4 }));

    // Check if the response contains an error
    if (data.error && data.error._attributes.code === '666') {
      console.error('[api] currentArtworks: Server error:', data.error._attributes.message);
      return { success: false, error: data.error._attributes.message, artworks: [] };
    }

    // Initialize the start time to 0
    let startTime = 0;

    // Ensure data.playlist.artwork is an array.
    // xml2json returns a plain object when there is only one <artwork> element.
    // Wrapping in [] normalises single-artwork playlists (e.g. street-print use case).
    const artworkArray = Array.isArray(data.playlist.artwork)
      ? data.playlist.artwork
      : [data.playlist.artwork];

    // Iterate over the artworks
    const artworks = artworkArray.map(artwork => {
      // Check if _attributes exists
      if (!artwork._attributes) {
        console.error('[api] currentArtworks: Unexpected artwork structure:', artwork);
        return artwork;
      }

      // Get the duration and offset of the current artwork
      const duration = parseFloat(artwork._attributes.duration) || 0;
      const offset = parseFloat(artwork._attributes.offset) || 0;

      // Calculate the cumulative end time (§4.2).
      // endTime = previous endTime + this artwork's duration + offset.
      // App.js transition logic depends on this cumulative structure.
      const endTime = startTime + duration + offset;

      // Update the start time for the next artwork
      startTime = endTime;

      const credits = Array.isArray(artwork.credit)
        ? artwork.credit.map(credit => credit._attributes)
        : artwork.credit
          ? [artwork.credit._attributes]
          : [];

      // Map credits to a cleaner format
      const formattedCredits = credits.map(credit => ({
        kind: credit.kind || 'Unknown Kind',
        name: credit.name || 'Unknown Name',
        display_name: credit.display_name || credit.name || 'No Display Name',
      }));

      // Extract the author field
      const author = artwork._attributes.author || 'Unknown Author'; // Default to 'Unknown Author' if missing

      // Return the artwork with its start and end times, and author
      const newArtwork = {
        ...artwork,
        startTime,
        endTime,
        url: artwork._attributes.url, // Corrected assignment
        datation_start: artwork._attributes.datation_start,
        datation_end: artwork._attributes.datation_end,
        author, // Include the extracted author
        credits, // Include the extracted credits
      };

      // Log the details for debugging
      console.log('[api] currentArtworks: Artwork URL:', newArtwork.url);
      console.log('[api] currentArtworks: Artwork Author:', newArtwork.author);
      console.log('[api] currentArtworks: Artwork Credits:', newArtwork.credits);

      return newArtwork;
    });

    // Read the server's current playlist position from <playlist position="X.XX">.
    // This is used by App.js to anchor its client clock so viewers joining
    // mid-playlist see the right artwork immediately rather than always artwork #0.
    const serverPosition = parseFloat(data.playlist._attributes?.position) || 0;

    console.log('[api] currentArtworks: Retrieved', artworks.length, 'artworks, server position:', serverPosition);
    return { success: true, artworks, serverPosition };
  } catch (error) {
    console.error('[api] currentArtworks: Failed to retrieve artworks:', error);
    return { success: false, error: error.message, artworks: [] };
  }
};
