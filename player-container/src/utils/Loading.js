// loading.js

import React from 'react';
import { Box, CircularProgress } from '@mui/material';
import { selectTheme } from "../theme/ThemeUtils";

const Loading = () => (
    <Box>
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                marginTop: "200px",
            }}
        >
            <CircularProgress />
            <br />
            <em>Loading...</em>
        </div>
    </Box>
);

export default Loading;

export function GradientCircularProgress() {
    const theme = selectTheme();
    return (
        <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 10
        }}>
            <React.Fragment>
                <svg width={0} height={0}>
                    <defs>
                        <linearGradient id="my_gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor={theme.palette.primary.main} />
                            <stop offset="100%" stopColor={theme.palette.secondary.main} />
                        </linearGradient>
                    </defs>
                </svg>
                <CircularProgress size={60} sx={{ 'svg circle': { stroke: 'url(#my_gradient)' } }} />
            </React.Fragment>
        </div>
    );
}