import { theme } from "./theme";

const palette = {
    mode: 'light',
    primary: {
        main: '#000000',
        contrastText: '#ffffff',
        light: 'rgb(51, 51, 51)',
        dark: 'rgb(0, 0, 0)'
    },
    secondary: {
        main: '#FA0408',
        contrastText: '#ffffff'
    },
    text: {
        primary: '#393939',
    }
}
export const AVIFFTheme = theme(palette);
