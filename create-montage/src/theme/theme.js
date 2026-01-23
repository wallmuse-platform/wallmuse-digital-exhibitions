// theme.js

import { createTheme } from '@mui/material/styles';
import { lighten } from '@mui/material/styles';

export const theme = palette => {

    const mainColor = palette.primary.main;
    const secondaryMainColor = palette.secondary.main;

    const inactiveMain = '#f0f0f0'; // Light grey background for inactive elements

    const inactiveSecondaryMainColor = '#f0f0f0'; // Light grey background for inactive secondary elements
    const contrastColor = palette.primary.contrastText;
    const hoverColor = palette.primary.light;
    const contrastSuccess = palette.primary.contrastSuccess;

    const textPrimary = palette.text.primary;
    const inactiveTextPrimary = '#9e9e9e'; // Dark grey text for inactive elements

    // Include these inactive colors in the palette
    palette.primary.inactive = inactiveMain;
    palette.secondary.inactive = inactiveSecondaryMainColor;
    palette.text.inactive = inactiveTextPrimary;

    return createTheme({
        palette: palette,
        breakpoints: {
            values: {
                xs: 0,    // extra-small devices (phones in portrait)
                sm: 600,  // small devices (phones in landscape)
                md: 960,  // medium devices (tablets)
                lg: 1280, // large devices (small laptops/desktops)
                xl: 2000, // extra-large devices (large laptops/desktops)
                tv: 3840  // SmartTV4Ks
            },
        },
        components: {
            MuiButton: {
                styleOverrides: {
                    root: ({ ownerState }) => ({
                        ...(ownerState.variant === 'contained' && {
                            backgroundColor: ownerState.disabled ? inactiveMain : mainColor,
                            color: ownerState.disabled ? contrastColor : contrastColor,
                            borderColor: ownerState.disabled ? inactiveMain : mainColor,
                            '&:hover': {
                                backgroundColor: ownerState.disabled ? inactiveMain : hoverColor,
                                borderColor: ownerState.disabled ? inactiveMain : hoverColor,
                            },
                        }),
                        ...(ownerState.variant === 'outlined' && {
                            backgroundColor: ownerState.disabled ? 'transparent' : contrastColor,
                            color: ownerState.disabled ? inactiveMain : mainColor,
                            borderColor: ownerState.disabled ? inactiveMain : mainColor,
                            '&:hover': {
                                backgroundColor: ownerState.disabled ? 'transparent' : contrastColor,
                                color: ownerState.disabled ? inactiveMain : hoverColor,
                                borderColor: ownerState.disabled ? inactiveMain : hoverColor,
                            },
                        }),
                        ...(ownerState.variant === 'text' && {
                            color: ownerState.disabled ? inactiveTextPrimary : mainColor,
                        }),
                    }),
                },
            },
            MuiButtonBase: {
                styleOverrides: {
                  root: {
                    // Override the focus highlight styles
                    '&.Mui-focusVisible': {
                      backgroundColor: 'transparent', // Makes focus background transparent
                    }
                  }
                }
            },
            MuiToggleButton: {
                styleOverrides: {
                    root: {
                        backgroundColor: mainColor,
                        color: contrastColor,
                        borderColor: mainColor,
                        '&:hover': {
                            backgroundColor: hoverColor,
                            color: contrastColor,
                            borderColor: hoverColor,
                        },
                        '&.MuiToggleButton-primary.Mui-selected': {
                            backgroundColor: mainColor,
                            color: contrastColor,
                            borderColor: mainColor,
                        }
                    },
                }
            },
            MuiChip: {
                styleOverrides: {
                    root: {
                        '&.MuiChip-filled': {
                            backgroundColor: mainColor,
                            color: contrastColor,
                            borderColor: mainColor,
                            '&:hover': {
                                backgroundColor: lighten(mainColor, 0.1),
                            },
                            '&.Mui-disabled': {
                                backgroundColor: inactiveMain,
                                color: contrastColor,
                                borderColor: inactiveMain,
                            }
                        },
                        '&.MuiChip-outlined': {
                            borderColor: mainColor,
                            color: mainColor,
                            backgroundColor: contrastColor,
                            '&:hover': {
                                borderColor: hoverColor,
                                backgroundColor: hoverColor,
                                color: contrastColor,
                            },
                            '&.Mui-disabled': {
                                borderColor: inactiveMain,
                                color: inactiveMain,
                                backgroundColor: 'transparent',
                            }
                        },
                    },
                },
            },
            MuiTooltip: {
                styleOverrides: {
                  tooltip: {
                    color: contrastColor,
                    size: 'sm',
                    margin: '0',
                    '@media (max-width: 960px)': {
                      fontSize: 14, // Font size below 960px width
                    },
                    '@media (max-width: 600px)': {
                      fontSize: 12, // Font size below 600px width, for more granularity
                    },
                    '@media tv': {
                      fontSize: 24, // Font size for TV media type
                    }
                  }
                }
              },
            MuiPaper: {
                styleOverrides: {
                    root: {
                        margin: '0 10px',
                        border: '1px solid',
                        borderColor: mainColor
                    }
                    // Specific targeting when used within Accordion
                }
            },
            MuiAccordion: {
                styleOverrides: {
                    root: {
                        margin: '0', 
                        '&.Mui-expanded': {
                            margin: '0', // Keeps margin consistent whether expanded or not
                        },
                        '&:before': {
                            display: 'none', // Removes the default Material-UI line if not needed
                        },
                    }
                }
            },
            MuiAccordionSummary: {
                styleOverrides: {
                    root: {
                        color: contrastColor,
                        backgroundColor: mainColor,
                        borderColor: mainColor,
                        ".MuiAccordionSummary-expandIconWrapper": {
                            color: contrastColor,
                        }
                    }
                }
            },
            MuiAccordionDetails: {
                styleOverrides: {
                    root: {
                        margin: ' 0',
                        padding: '0',
                        borderColor: mainColor,
                        borderTop: 0
                    }
                }
            },
        },
        typography: {
            subtitle1: {
                color: mainColor,
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis'
            },
        }
    })
}