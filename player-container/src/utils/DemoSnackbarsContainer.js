// DemoSnackbarsContainer.js - Responsive container for demo and professional snackbars
import React from 'react';
import { Box, useMediaQuery, useTheme } from '@mui/material';
import TrialAccountSnackbar from './TrialAccountSnackBar.js';
import ProfessionalServicesSnackbar from './ProfessionalServicesSnackbar.js';

const DemoSnackbarsContainer = ({ isDemo, theme: themeName }) => {
    const muiTheme = useTheme();
    const isMobile = useMediaQuery(muiTheme.breakpoints.down('md')); // Mobile/tablet breakpoint

    if (!isDemo) {
        return null;
    }

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: isMobile ? 1 : 0,
                width: '100%',
                mb: 1, // Add margin bottom for spacing
                px: isMobile ? 0 : 1 // Add padding for desktop margins
            }}
        >
            {/* Demo Account Snackbar */}
            <Box sx={{
                order: isMobile ? 1 : 1,
                width: isMobile ? '100%' : 'auto',
                maxWidth: isMobile ? '400px' : 'auto',
                display: isMobile ? 'flex' : 'block',
                justifyContent: isMobile ? 'center' : 'flex-start'
            }}>
                <TrialAccountSnackbar
                    isDemo={isDemo}
                    theme={themeName}
                    containerMode={true}
                />
            </Box>


            {/* Professional Services Snackbar */}
            <Box sx={{
                order: isMobile ? 2 : 2,
                width: isMobile ? '100%' : 'auto',
                maxWidth: isMobile ? '400px' : 'auto',
                display: isMobile ? 'flex' : 'block',
                justifyContent: isMobile ? 'center' : 'flex-end'
            }}>
                <ProfessionalServicesSnackbar
                    isDemo={isDemo}
                    theme={themeName}
                    containerMode={true}
                />
            </Box>
        </Box>
    );
};

export default DemoSnackbarsContainer;