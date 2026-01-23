// useGuestActionPopup.js - Hook for CreateMontage (redirect-only version)

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { isDemoAccount, getUserId } from '../utils/Utils';
import GuestActionPopup from './GuestActionPopup';
import { useTheme } from '@mui/material/styles';
import { currentTheme } from "../theme/ThemeUtils";

/**
 * Hook for handling guest actions with popup confirmation
 * This version shows popup and redirects to Play app for account creation
 * @returns {Object} - Functions and state for guest action handling
 */
const useGuestActionPopup = () => {
    const [showPopup, setShowPopup] = useState(false);
    const [isPremiumContent, setIsPremiumContent] = useState(false);

    const theme = useTheme();
    const themeId = currentTheme();

    /**
     * Handle an action with guest account checking
     * @param {Function} action - The action to perform (will be ignored since we redirect)
     * @param {boolean} isPremium - Whether this is premium content
     */
    const handleAction = (action, isPremium = false) => {
        const currentUserId = getUserId();
        const isDemo = isDemoAccount(currentUserId);

        console.log('[useGuestActionPopup CreateMontage] handleAction called:', {
            currentUserId,
            isDemo,
            isPremium
        });

        // If not a demo account, just perform the action
        if (!isDemo) {
            console.log('[useGuestActionPopup CreateMontage] Not a demo account, executing action directly');
            action();
            return;
        }

        // If demo account, show the popup
        // Note: We don't store the action since we're redirecting to Play app
        setIsPremiumContent(isPremium);
        console.log('[useGuestActionPopup CreateMontage] Setting showPopup to true');
        setShowPopup(true);
    };

    /**
     * Close the popup without performing any action
     */
    const closePopup = () => {
        console.log('[useGuestActionPopup CreateMontage] Closing popup');
        setShowPopup(false);
    };

    // The popup component that will be rendered via portal
    const popup = showPopup ? createPortal(
        <GuestActionPopup
            onClose={closePopup}
            theme={theme}
            currentTheme={themeId}
            isPremiumContent={isPremiumContent}
        />,
        document.body
    ) : null;

    return {
        handleAction,
        isDemo: isDemoAccount(getUserId()),
        popup
    };
};

export default useGuestActionPopup;
