//ThemeUtils.js

import { rootElement } from "../utils/Utils";
import { theme } from "./theme";
import { WallmuseTheme } from "./WallMuseTheme";
import { SharexTheme } from "./SharexTheme";
import { OOO2Theme } from "./OOO2Theme";

const getBodyFont = () => {
    try { return window.getComputedStyle(document.body).fontFamily || null; }
    catch(e) { return null; }
};

const buildPluginTheme = (hex, fontFamily) => theme({
    mode: 'light',
    primary: { main: hex || '#27BECA', contrastText: '#ffffff' },
    secondary: { main: '#ED1550', contrastText: '#ffffff' },
    text: { primary: '#393939' },
    fontFamily: fontFamily || getBodyFont() || undefined,
});

export const selectTheme = () => {
    if (rootElement?.dataset?.plugin === 'true') {
        return buildPluginTheme(
            rootElement.dataset.primaryColor || null,
            rootElement.dataset.fontFamily   || null,
        );
    }

    const themeName = (rootElement?.dataset?.theme || '').toLowerCase();
    switch (themeName) {
        case "wallmuse":
            return WallmuseTheme;
        case "sharex":
            return SharexTheme;
        case "ooo2":
            return OOO2Theme;
        default:
            return WallmuseTheme;
    }
}

export const currentTheme = () => {
    // console.log(`currentTheme: ${rootElement.dataset.theme}`);
    if (!rootElement.dataset.theme) {
      return "wallmuse";
    }
    return rootElement.dataset.theme.toLowerCase();
  };
  