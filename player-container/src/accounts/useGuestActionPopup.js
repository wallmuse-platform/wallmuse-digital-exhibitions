
// useGuestActionPopup.js
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSession } from '../contexts/SessionContext'; // Make sure path matches your project structure
import { isDemoAccount, getUserId } from '../utils/Utils';
import GuestActionPopup from './GuestActionPopup'; // Create this component
import { useTheme } from '@mui/material/styles';
import { currentTheme } from "../theme/ThemeUtils.js"; // Import the currentTheme function

/**
 * Hook for handling guest actions with popup confirmation
 * @returns {Object} - Functions and state for guest action handling
 */
const useGuestActionPopup = () => {
    const [showPopup, setShowPopup] = useState(false);
    const [pendingAction, setPendingAction] = useState(null);
    const [isPremiumContent, setIsPremiumContent] = useState(false);
    const [localUserId, setLocalUserId] = useState(getUserId());

    const { updateSession } = useSession();
    const theme = useTheme();

    // Get the current theme directly
    const themeId = currentTheme();

    // Update local user ID whenever it changes in the DOM
    useEffect(() => {
        const refreshUserStatus = () => {
            const currentId = getUserId();
            console.log('[useGuestActionPopup] Refreshing user status, old:', localUserId, 'new:', currentId);
            setLocalUserId(currentId);
        };

        // Check on mount and whenever DOM updates occur
        refreshUserStatus();

        // Listen for our custom event
        window.addEventListener('user-status-changed', refreshUserStatus);

        return () => {
            window.removeEventListener('user-status-changed', refreshUserStatus);
        };
    }, [localUserId]);

    /**
     * Handle an action with guest account checking
     * @param {Function} action - The action to perform
     * @param {boolean} isPremium - Whether this is premium content
     */
    const handleAction = (action, isPremium = false) => {
        // IMPORTANT: Get fresh user status at time of action
        const currentUserId = getUserId();
        const isDemo = isDemoAccount(currentUserId);

        console.log('[useGuestActionPopup] handleAction called:', {
            currentUserId,
            isDemo,
            isPremium
        });

        // If not a guest, just perform the action
        if (!isDemo) {
            console.log('[useGuestActionPopup] Not a guest, executing action directly');
            action();
            return;
        }

        // Store the action and content type for later
        setPendingAction(() => action);
        setIsPremiumContent(isPremium);

        // Show the popup
        console.log('[useGuestActionPopup] Setting showPopup to true');
        setShowPopup(true);
    };

    /**
     * Close the popup without performing any action
     */
    const closePopup = () => {
        console.log('[useGuestActionPopup] Closing popup');
        setShowPopup(false);
        setPendingAction(null);
    };

    /**
     * Continue with the temp account and perform the action
     */
    const continueWithTemp = (result) => {
        console.log('[useGuestActionPopup] continueWithTemp called, result:', result);
        console.log('[useGuestActionPopup] Current localStorage before changes:', {
            refreshShown: localStorage.getItem('refreshShown'),
            needsRefresh: localStorage.getItem('needsRefresh'),
            accountJustCreated: localStorage.getItem('accountJustCreated')
        });
      
        // Update local user ID immediately
        setLocalUserId(result.userId);
        console.log('[useGuestActionPopup] Updated local user ID to:', result.userId);
    
        // Update DOM dataset
        const rootElement = document.getElementById('root');
        if (rootElement && rootElement.dataset) {
            console.log('[useGuestActionPopup] Current DOM dataset before update:', {...rootElement.dataset});
            rootElement.dataset.user = result.userId;
            // Clear the house ID to force creation of a new house
            delete rootElement.dataset.house;
            // IMPORTANT: Clear the cached session IDs
            localStorage.removeItem('wp_original_session_id');
            localStorage.removeItem('wp_normalized_session_id');
            localStorage.removeItem('current_house_id');
            console.log('[useGuestActionPopup] Updated DOM dataset:', {...rootElement.dataset});
        } else {
            console.error('[useGuestActionPopup] Could not find root element or dataset');
        }
    
        // Dispatch event to notify all components
        window.dispatchEvent(new CustomEvent('user-status-changed', {
            detail: { userId: result.userId }
        }));
        console.log('[useGuestActionPopup] Dispatched user-status-changed event');
    
        // Set flags for refresh and account creation
        localStorage.setItem('accountJustCreated', 'true');
        localStorage.setItem('needsRefresh', 'true');
        localStorage.setItem('guestUserId', result.userId); // Store the new user ID for verification after refresh
        
        console.log('[useGuestActionPopup l.126] Set localStorage flags:', {
            accountJustCreated: localStorage.getItem('accountJustCreated'),
            needsRefresh: localStorage.getItem('needsRefresh'),
            guestUserId: localStorage.getItem('guestUserId')
        });
        
        // Close the popup before refreshing
        setShowPopup(false);
        console.log('[useGuestActionPopup] Popup closed, preparing for refresh');
        
        // Force refresh after a short delay
        console.log('[useGuestActionPopup] Setting timeout for refresh');
        setTimeout(() => {
            console.log('[useGuestActionPopup] Executing refresh now');
            
            // Check if we have a WordPress session ID
            if (result.wpSessionId) {
                // Use the auto_create_guest parameter to ensure the session persists
                window.location.href = `${window.location.pathname}?auto_create_guest=true&guest_id=${result.userId}&guest_login=${result.guestIdentifier}`;
            } else {
                // Fall back to old method if no WordPress session
                window.location.reload();
            }
        }, 100);
    };

    // The popup component that will be rendered via portal
    const popup = showPopup ? createPortal(
        <GuestActionPopup
            onClose={closePopup}
            onContinueWithTemp={continueWithTemp}
            theme={theme}
            currentTheme={themeId}
            updateSession={updateSession}
            isPremiumContent={isPremiumContent}
        />,
        document.body
    ) : null;

    return {
        handleAction,
        isDemo: isDemoAccount(localUserId), // Use local state for current status
        popup
    };
};

export default useGuestActionPopup;