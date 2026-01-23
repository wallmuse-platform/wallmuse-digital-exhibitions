import { theme } from "./theme";

const palette = {
    mode: 'light',
    primary: {
        main: '#993894',
        contrastText: '#ffffff',
        light: 'rgb(173, 95, 169)',
        dark: 'rgb(107, 39, 103)',
        contrastSuccess: 'green[700]',
    },
    secondary: {
        main: '#cc9931',
        contrastText: '#ffffff'
    },
    text: {
        primary: '#393939',
    }
}
export const OOO2Theme = theme(palette);
