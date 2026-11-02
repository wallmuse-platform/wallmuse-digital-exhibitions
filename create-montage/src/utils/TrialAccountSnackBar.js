// TrialAccountSnackbar.js

import React from 'react';
import { CustomSnackbar, CustomAlert } from "./CustomComponents";
import { useTranslation } from "react-i18next";
import InfoIcon from '@mui/icons-material/Info'; // Import the Info icon from MUI
import i18n from 'i18next';
import { useTheme } from '@mui/material/styles'; // Import the theme hook from MUI

// Use the theme passed from parent component rather than detecting it independently
const TrialAccountOrNotWideSnackbar = ({ isDemo, theme: themeName, transitionDuration = 300 }) => {
    const { t } = useTranslation();
    const [open, setOpen] = React.useState(isDemo);
    // Use MUI's useTheme hook instead of context
    const theme = useTheme();

    const handleClose = () => {
        setOpen(false);
    };

    let title, message, link;

    title = t('demo_'); // Ensure 'demo_' is a valid translation key
    message = t('only_for_subscribers_'); // Ensure 'only_for_subscribers_' is a valid translation key

    // Get current language
    const language = i18n.language; // e.g., "en"
    const langParam = language !== 'en' ? `?lang=${language}` : '';

    if (themeName === "wallmuse") {
        link = 'https://wallmuse.com/sign-up/';
    } else if (themeName === "ooo2") {
        // Special case for ooo2 theme
        // Map language codes to their respective URL paths
        const langPathMap = {
            'en': 'product/free-accounts/',
            'fr': 'produit/compte-gratuit/',
            'es': 'producto/cuenta-gratuita/',
            'de': 'produkt/kostenloses-konto/',
            'it': 'prodotto/account-gratuito/',
            'pt': 'produto/contas-gratuitas/',
            'nl': 'product/gratis-account/',
            'no': 'produkt/gratis-konto/',
            'uk': 'product/безкоштовний-обліковий-запис/',
            'pl': 'produkt/darmowe-konto/',
            'hr': 'proizvod/besplatni-racun/'
        };

        // Get the appropriate path for the current language
        const path = langPathMap[language] || langPathMap['en']; // Default to English path

        link = `https://ooo2.wallmuse.com/${path}${langParam}`;
    } else {
        link = `https://${themeName}.wallmuse.com/sign-up/`;
    }

    return (
        <CustomSnackbar
            open={open}
            onClose={handleClose}
            transitionDuration={transitionDuration}
            autoHideDuration={0} // Set to 0 to disable auto-hiding
            showDelay={500} // Half-second delay before showing
            disableWindowBleed={true}
            anchorOrigin={{
                vertical: 'top',
                horizontal: 'left'
            }}
            sx={{
                position: 'relative',
                top: 5,
                margin: 'auto',
                marginLeft: '10px', // Add left margin as requested
                width: '350px',
            }}
        >
            <CustomAlert
                onClose={handleClose}
                severity="info"
                iconMapping={{
                    info: <InfoIcon style={{ color: theme.palette?.primary?.main }} />
                }}
                sx={{
                    // Use theme values directly from MUI's useTheme hook
                    backgroundColor: theme.palette?.primary?.contrastText,
                    color: theme.palette?.text?.inactive,
                    border: `2px solid ${theme.palette?.primary?.main}`,
                    padding: '5px 10px',
                    borderRadius: '4px',
                    alignItems: 'center',
                    wordBreak: 'break-word',
                }}
            >
                <div style={{ textAlign: 'center' }}>
                    {/* Show account info only for isDemoAccount */}      
                    <strong>{title}</strong> - {message} <a href={link} rel="noopener noreferrer" style={{
                        color: theme.palette?.primary?.main,
                        fontWeight: 'bold',
                        textDecoration: 'underline'
                    }}>{t("user_account_")}</a>
                    <br /> {/* Add a line break */}       
                    <span className="tablet-pc-notice" style={{ marginTop: '8px'}}>{t("TabPCs_")}</span>
                </div>
            </CustomAlert>
        </CustomSnackbar>
    );
};

export default TrialAccountOrNotWideSnackbar;