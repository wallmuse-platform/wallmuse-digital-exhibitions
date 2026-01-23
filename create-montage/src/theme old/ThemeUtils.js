import { rootElement } from "../utils/Utils";
import { WallmuseTheme } from "./WallMuseTheme";
import { SharexTheme } from "./SharexTheme";
import { OOO2Theme } from "./OOO2Theme";

export const selectTheme = () => {
    if (!rootElement.dataset.theme) {
        return WallmuseTheme;
    }
    const theme = rootElement.dataset.theme.toLowerCase();
    switch (theme) {
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
  