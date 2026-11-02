import { theme } from "./theme";
import { green } from '@mui/material/colors';

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
        light: 'rgb(241, 69, 128)', 
        dark: 'rgb(168, 19, 72)'
    },
    text: {
        primary: '#393939',
    }
}
export const WallmuseTheme = theme(palette);
