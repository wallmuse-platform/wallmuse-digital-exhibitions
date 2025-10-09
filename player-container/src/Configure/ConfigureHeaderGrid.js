// ConfigureHeaderGrid.js

// React
import React from 'react';

// Material-UI Icons
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import HomeIcon from '@mui/icons-material/Home';
import LiveTvOutlinedIcon from '@mui/icons-material/LiveTvOutlined';
import DriveFileMoveOutlinedIcon from '@mui/icons-material/DriveFileMoveOutlined';

// Custom Hooks and Utilities
import { useResponsive } from '../utils/useResponsive'; // Responsive design considerations
import { selectTheme } from "../theme/ThemeUtils"; // Assuming selectTheme is a custom utility for theming
import { getAccountColor } from './getAccountColor';

// Internationalization
import { useTranslation } from 'react-i18next';

export function ConfigureHeaderGrid({ account = {}, house, }) {

    // Select the current theme
    const theme = selectTheme();
    // Use translation hook for internationalization
    const { t } = useTranslation();
    // Use responsive hook to adapt UI to different screen sizes
    const { isMobile, isTablet, isHD, iconSize } = useResponsive();

    // Determine icon size based on screen size
    let IconSizeMinusTwo = `${parseInt(iconSize) - 2}px`;

    // Log account information for debugging
    console.log('ConfigureHeader: account:', account);
    console.log('ConfigureHeader: account.data:', account.data);

    return (
        <>
            {/* Display account information in a grid cell */}
            <div
                className="account-info"
                style={{
                    gridRow: "3 / span 4",
                    gridColumn: "7 / span 3",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    border: `2px solid ${theme.palette.primary.main}`,
                }}
            >
                <div>
                    <AccountCircleOutlinedIcon sx={{ fontSize: iconSize, color: theme.palette.primary.main, }} />
                </div>
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '33.3%',
                    overflow: 'hidden',
                }}>
                    {account && account.data ? account.data.name : ''}
                </div>
                <div
                    style={{
                        color: getAccountColor(account && account.data && account.data.type), fontSize: isMobile ? '13px' : '16px',
                        fontStyle: 'italic'
                    }}
                >
                    {account && account.data ? account.data.type : ''}
                </div>
            </div>
            {/* Display house information in a grid cell */}
            <div
                className="house-info"
                style={{
                    gridRow: "9 / span 4", // Changed this line
                    gridColumn: "7 / span 3",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    border: `2px solid ${theme.palette.primary.main}`,
                }}
            >
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                    }}
                >
                    <div>
                        <HomeIcon sx={{ fontSize: iconSize, color: theme.palette.primary.main, }} />
                    </div>
                    <div>{house}</div>
                </div>
            </div>
            {/* If house exists, display download and pull icons with text */}
            {house && (
                <>
                    {/* Download icon and text */}
                    <div
                        style={{
                            gridRow: "10 / span 2",
                            gridColumn: "5 / span 2",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            alignItems: "center",
                            color: theme.palette.primary.main,
                        }}
                    >
                        {/* &#8592; This is a left arrow. */}
                    </div>
                    <div
                        style={{
                            gridRow: "9 / span 4",
                            gridColumn: "3 / span 3",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            alignItems: "center",
                        }}
                    >
                        <DriveFileMoveOutlinedIcon sx={{ fontSize: iconSize, color: theme.palette.primary.main, }} />
                        <em style={{ color: theme.palette.primary.main, fontStyle: "italic", textAlign: "center",  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginLeft: '10px'}}>
                            Download Channel
                        </em>
                    </div>
                    <div
                        style={{
                            gridRow: "11 / span 2",
                            gridColumn: "11 / span 3",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            alignItems: "center",
                            color: theme.palette.primary.main,
                        }}
                    >
                        &#8595; {/* This is a down arrow. */}
                    </div>

                    {/* Pull icon and text */}
                    <div
                        style={{
                            gridRow: "9 / span 4",
                            gridColumn: "11 / span 3",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            alignItems: "center",
                        }}
                    >
                        <LiveTvOutlinedIcon sx={{ fontSize: iconSize, color: theme.palette.primary.main, }}
                        />
                        <em style={{ color: theme.palette.primary.main, fontStyle: "italic", textAlign: "center",  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginLeft: '-10px'}}>
                            Stream Channel
                        </em>
                    </div>
                    <div
                        style={{
                            gridRow: "11 / span 2",
                            gridColumn: "3 / span 3",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            alignItems: "center",
                            color: theme.palette.primary.main,
                        }}
                    >
                        &#8595; {/* This is a down arrow. */}
                    </div>
                </>
            )}
        </>
    );
}