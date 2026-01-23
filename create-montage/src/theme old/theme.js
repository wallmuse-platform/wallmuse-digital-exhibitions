import { createTheme } from '@mui/material/styles';

export const theme = palette => {

    const mainColor = palette.primary.main;
    const contrastColor = palette.primary.contrastText;
    const hoverColor = palette.primary.light;

    return createTheme({
        palette: palette,
        components: {
            MuiButton: {
                styleOverrides: {
                    root: ({ ownerState }) => ({
                        ...((ownerState.variant === 'contained' && {
                            backgroundColor: mainColor,
                            color: contrastColor,
                        }) || (ownerState.variant === 'text' && {
                            color: mainColor,
                        })),
                    }),
                },
            },
            MuiToggleButton: {
                styleOverrides: {
                    root: {
                        backgroundColor: contrastColor,
                        color: mainColor,
                        borderColor: mainColor,
                        '&:hover': {
                            backgroundColor: hoverColor,
                            color: contrastColor,
                            borderColor: hoverColor
                        },
                        '&.MuiToggleButton-primary.Mui-selected': {
                            backgroundColor: mainColor,
                            color: contrastColor
                        }
                    },
                }
            },
            MuiChip: {
                styleOverrides: {
                    root: {
                        '&.MuiChip-filled': {
                            borderColor: mainColor,
                            color: contrastColor,
                            backgroundColor: mainColor
                        },
                        '&.MuiChip-filled:hover': {
                            borderColor: mainColor,
                            color: contrastColor,
                            backgroundColor: mainColor
                        },
                        '&.MuiChip-outlined': {
                            borderColor: mainColor,
                            color: mainColor,
                            backgroundColor: contrastColor
                        },
                        '&.MuiChip-outlined:hover': {
                            borderColor: hoverColor,
                            backgroundColor: hoverColor,
                            color: contrastColor
                        }
                    }
                }
            }
        },
        typography: {
            subtitle1: {
                color: mainColor,
            },
        }

        })
}
