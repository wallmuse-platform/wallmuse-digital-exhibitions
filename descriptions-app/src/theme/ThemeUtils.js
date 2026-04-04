/**
 * ThemeUtils.js — Wallmuse Descriptions App, theme system
 *
 * PURPOSE (see docs/DESCRIPTIONS_APP_ARCHITECTURE.md §3.3)
 * Selects the MUI theme based on the subdomain of the current URL.
 * This enables multi-tenant visual styling from a single deployed build.
 *
 * THEME SELECTION LOGIC:
 *   URL subdomain → theme name (lowercase) → MUI theme object
 *   e.g. sharex.wallmuse.com → "sharex" → SharexTheme
 *
 * SUPPORTED THEMES (add new entries in both selectTheme and a new theme file):
 *   wallmuse  → WallMuseTheme.js  (default)
 *   sharex    → SharexTheme.js
 *   aviff     → AVIFFTheme.js
 *   ooo2      → OOO2Theme.js
 *
 * ADDING A NEW THEME (see also README.md → Theming section):
 *   1. Copy an existing theme file, e.g. src/theme/WallMuseTheme.js → ClientXTheme.js
 *   2. Edit the palette object and update the export name.
 *   3. Import it here and add a case below.
 *   4. Set data-theme="clientx" on the WordPress root div.
 *
 * SENTRY / CONSOLE.LOG WARNING:
 * Do NOT pass DOM nodes (HTMLDivElement, rootElement, etc.) to console.log here.
 * Sentry intercepts console.log and tries to JSON.stringify all arguments.
 * DOM nodes with React internal refs (__reactContainer$...) are circular
 * structures and will throw "TypeError: Converting circular structure to JSON",
 * crashing the app in production. Log only plain strings and primitives.
 */
import { WallmuseTheme } from "./WallMuseTheme";
import { SharexTheme } from "./SharexTheme";
import { AVIFFTheme } from "./AVIFFTheme";
import { OOO2Theme } from "./OOO2Theme";
import { wmm_url } from "../utils/Utils"

export const rootElementId = "root-descriptions";


export const selectTheme = () => {
  switch (currentTheme()) {
    case "wallmuse":
      return WallmuseTheme;
    case "sharex":
      return SharexTheme;
    case "aviff":
      return AVIFFTheme;
    case "ooo2":
      return OOO2Theme;
    default:
      return WallmuseTheme;
  }
};

export const currentTheme = () => {
  const subdomain = wmm_url.split("//")[1]?.split(".")[0]; // Extract subdomain
  console.log("[ThemeUtils] currentTheme:", subdomain);
  return subdomain ? subdomain.toLowerCase() : "wallmuse"; // Default to 'wallmuse' if undefined
};
