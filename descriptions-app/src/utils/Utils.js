/**
 * Utils.js — Wallmuse Descriptions App, common utilities
 *
 * PURPOSE (see docs/DESCRIPTIONS_APP_ARCHITECTURE.md §3.4)
 * Provides shared constants and utility functions used across the app.
 *
 * ROOT ELEMENT (WordPress integration):
 * The app is mounted on a specific DOM element set by the WordPress template:
 *   <div id="root-descriptions" data-user="<?=$sessionId?>" data-theme="..."></div>
 * rootElementId must match this ID exactly or the React app will not render.
 * See README.md → Deploy section for the full WordPress integration details.
 *
 * WARNING — DO NOT pass rootElement to console.log:
 * Sentry (and other monitoring tools) intercept console.log and attempt to
 * JSON.stringify arguments. HTMLDivElement contains circular React internal
 * references (__reactContainer$...) which will throw a
 * "Converting circular structure to JSON" TypeError in production.
 * Log only plain strings derived from rootElement (e.g. rootElement.id).
 */

// ID of the DOM element that hosts the React app (set in WordPress template).
export const rootElementId = "root-descriptions";

// The actual DOM element. Used to read data-user for session auth.
// See getUserId() below.
export const rootElement = document.getElementById(rootElementId);

// Current domain URL, used by ThemeUtils to extract the subdomain for theme selection.
export const wmm_url = window.location.origin;
console.log('[Utils] wmm_url:', wmm_url); // Should log the current domain (e.g., https://wallmuse.com)

/**
 * getUserId — returns the current user's session identifier.
 *
 * Priority order (§7.2 — Session Management):
 *   1. data-user attribute on the root DOM element (set by PHP in WordPress template)
 *   2. ?user= URL query parameter (fallback for local development/testing)
 *
 * The session ID is passed to all API calls for authentication.
 * Session IDs can contain spaces — see serializeParams in api.js.
 *
 * To test locally, set data-user in public/index.html line ~36, or append
 * ?user=YOUR_SESSION_ID to the URL. See README.md → npm start.
 */
export const getUserId = () => {
  return (
    rootElement.dataset.user ||
    new URLSearchParams(window.location.search).get("user")
  );
};
