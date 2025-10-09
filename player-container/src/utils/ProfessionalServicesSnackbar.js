// ProfessionalServicesSnackbar.js
import React from 'react';
import { CustomSnackbar, CustomAlert } from "../CustomComponents";
import { useTranslation } from "react-i18next";
import BusinessIcon from '@mui/icons-material/Business'; // Professional icon
import i18n from 'i18next';
import { useTheme } from '@mui/material/styles';

// Professional Services snackbar - only shows for demo users on wallmuse.com
const ProfessionalServicesSnackbar = ({ isDemo, theme: themeName, transitionDuration = 300, containerMode = false }) => {
    const { t } = useTranslation();
    const [open, setOpen] = React.useState(isDemo);
    const theme = useTheme();

    const handleClose = () => {
        setOpen(false);
    };

    // Only show on wallmuse.com domain for demo users
    if (themeName !== "wallmuse" || !isDemo) {
        return null;
    }

    let title, message, link;

    title = t('goto.sharex') || 'Pro Curations & Custom Apps'; // Translation key
    message = ''; // Simplified to one line

    // Get current language
    const language = i18n.language;
    const langParam = language !== 'en' ? `?lang=${language}` : '';

    // ShareX link with language support
    // Currently only English supported, other languages commented for future implementation
    switch (language) {
        case 'en':
            link = `https://sharex.wallmuse.com/${langParam}`;
            break;
        // case 'fr':
        //     link = `https://sharex.wallmuse.com/fr/${langParam}`;
        //     break;
        // case 'es':
        //     link = `https://sharex.wallmuse.com/es/${langParam}`;
        //     break;
        // case 'de':
        //     link = `https://sharex.wallmuse.com/de/${langParam}`;
        //     break;
        // case 'it':
        //     link = `https://sharex.wallmuse.com/it/${langParam}`;
        //     break;
        // case 'pt':
        //     link = `https://sharex.wallmuse.com/pt/${langParam}`;
        //     break;
        // case 'nl':
        //     link = `https://sharex.wallmuse.com/nl/${langParam}`;
        //     break;
        // case 'no':
        //     link = `https://sharex.wallmuse.com/no/${langParam}`;
        //     break;
        // case 'uk':
        //     link = `https://sharex.wallmuse.com/uk/${langParam}`;
        //     break;
        // case 'pl':
        //     link = `https://sharex.wallmuse.com/pl/${langParam}`;
        //     break;
        // case 'hr':
        //     link = `https://sharex.wallmuse.com/hr/${langParam}`;
        //     break;
        // case 'jp':
        //     link = `https://sharex.wallmuse.com/jp/${langParam}`;
        //     break;
        default:
            link = `https://sharex.wallmuse.com/${langParam}`;
    }

    return (
        <CustomSnackbar
            open={open}
            onClose={handleClose}
            transitionDuration={transitionDuration}
            autoHideDuration={0} // Set to 0 to disable auto-hiding
            showDelay={500} // Half-second delay before showing
            disableWindowBleed={true}
            anchorOrigin={containerMode ? undefined : {
                vertical: 'top',
                horizontal: 'right'
            }}
            sx={{
                position: containerMode ? 'static' : 'relative',
                top: 0,
                margin: containerMode ? 0 : 'auto',
                marginRight: containerMode ? 0 : '10px',
                width: '400px',
            }}
        >
            <CustomAlert
                onClose={handleClose}
                severity="info"
                iconMapping={{
                    info: <BusinessIcon style={{ color: '#E91E63' }} /> // ShareX red color
                }}
                sx={{
                    // ShareX red theme colors
                    backgroundColor: theme.palette?.background?.paper,
                    color: theme.palette?.text?.primary,
                    border: `2px solid #E91E63`, // ShareX red border
                    padding: '5px 10px',
                    borderRadius: '4px',
                    alignItems: 'center',
                    wordBreak: 'break-word',
                }}
            >
                <strong>{title}</strong> <a href={link} rel="noopener noreferrer" style={{
                    color: '#E91E63', // ShareX red link color
                    fontWeight: 'bold',
                    textDecoration: 'underline'
                }}>{t("learn_more") || "Learn More"}</a>
            </CustomAlert>
        </CustomSnackbar>
    );
};

export default ProfessionalServicesSnackbar;