import { theme } from "./theme";

const palette = {
  mode: "light",
  primary: {
    main: "#FFCC00",
    contrastText: "#ffffff",
    light: "rgb(255, 214, 51)",
    dark: "rgb(178, 142, 0)",
  },
  secondary: {
    main: "#fba002",
    contrastText: "#ffffff",
  },
  text: {
    primary: "#393939",
  },
};
export const SharexTheme = theme(palette);
