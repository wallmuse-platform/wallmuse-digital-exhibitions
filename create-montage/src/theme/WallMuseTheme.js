import { theme } from "./theme";

const palette = {
    mode: 'light',
    primary: {
        main: '#27BECA',
        contrastText: '#ffffff',
        light: 'rgb(82, 203, 212)',
        dark: 'rgb(27, 133, 141)',
        contrastSuccess: 'green[700]',
    },
    secondary: {
        main: '#ED1550',
        contrastText: '#ffffff',
    },
    text: {
        primary: '#393939',
    }
}
export const WallmuseTheme = theme(palette);
