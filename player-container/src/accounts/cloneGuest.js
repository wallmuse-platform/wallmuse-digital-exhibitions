// cloneGuest.js
import { addUser } from '../utils/api';
import { rootElement, getUserId, isDemoAccount } from "../utils/Utils";

/**
 * Simple helper to handle actions with guest account checking
 * @param {Function} action - The action to perform
 * @param {Function} updateSession - Session update function
 * @returns {void}
 */
export const handleActionWithGuestCheck = (action, updateSession) => {
  const userId = getUserId();
  const isDemo = isDemoAccount(userId);
  
  if (isDemo) {
    handleGuestAction(action, updateSession, { showConfirm: true });
  } else {
    action();
  }
};

/**
 * Creates a temporary guest user and triggers SessionContext re-initialization
 * @param {Function} updateSession - Optional function to temporarily update the session
 * @returns {Promise<Object>} The new guest user information
 */
export const cloneGuest = async (updateSession = null) => {
    console.log('[cloneGuest] Triggering guest clone...');
    try {
        // Create guest user with unique identifier
        const guestIdentifier = `guest_${Date.now()}`;
        const newUser = await addUser(guestIdentifier, guestIdentifier, guestIdentifier);
        console.log('[cloneGuest] New guest user created:', newUser);

        if (!newUser?.id) {
            throw new Error('[cloneGuest] Failed to create a guest user. No ID returned.');
        }

        // Now create a WordPress user for this guest using our new API
        try {
            const wpResponse = await fetch(`${window.location.origin}/wp-json/wallmuse/v1/create-guest-user`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    guest_id: newUser.id,
                    guest_login: guestIdentifier
                })
            });

            if (!wpResponse.ok) {
                throw new Error(`WordPress user creation failed: ${wpResponse.status}`);
            }

            const wpUser = await wpResponse.json();
            console.log('[cloneGuest] WordPress user created:', wpUser);
            
            // Use the WordPress user ID as the session ID
            const userId = wpUser.session_id;
            
            // Update DOM dataset
            if (rootElement) {
                rootElement.dataset.user = userId;
                rootElement.dataset.wpLoggedIn = 'true'; // This is important!
                console.log('[cloneGuest] Updated DOM with new user ID:', userId);
            }

            // Store extra information in localStorage for persistence
            localStorage.setItem('wp_original_session_id', userId);
            localStorage.setItem('guestUserId', userId);
            
            // Provide immediate UI feedback if updateSession is available
            if (updateSession && typeof updateSession === 'function') {
                updateSession({
                    userDetails: {
                        id: userId,
                        name: guestIdentifier,
                        isPremium: false,
                        isDemo: true
                    },
                    isLoggedIn: true,
                    isPremium: false,
                    isDemo: true,
                });
                console.log('[cloneGuest] Temporary session update applied');
            }

            // For components that listen to custom events
            window.dispatchEvent(new CustomEvent('user-changed', {
                detail: { userId }
            }));

            // Return the new user info with WordPress session ID
            return {
                userId,
                guestIdentifier,
                wpSessionId: userId
            };

        } catch (wpError) {
            console.error('[cloneGuest] Error creating WordPress user:', wpError);
            // Fall back to using the original user ID if WordPress user creation fails
            return {
                userId: newUser.id,
                guestIdentifier
            };
        }
    } catch (error) {
        console.error('[cloneGuest] Error during guest clone:', error);
        throw error;
    }
};

/**
 * Handles actions attempted by guest users by creating a temporary account when needed
 * @param {Function} action - The action to perform after ensuring user is not a guest
 * @param {Function} updateSession - Optional session update function from SessionContext
 * @param {Object} options - Additional options
 * @param {boolean} options.showConfirm - Whether to show confirmation dialog (default: false)
 * @param {string} options.confirmMessage - Custom confirmation message
 * @param {Function} options.onSuccess - Callback for successful clone
 * @param {Function} options.onError - Callback for failed clone
 * @returns {Promise<any>} Result of the action or null if canceled
 */
export const handleGuestAction = async (action, updateSession = null, options = {}) => {
    const userId = getUserId();
    const isDemo = isDemoAccount(userId);

    // If not a guest account, proceed with action immediately
    if (!isDemo) {
        return action();
    }

    console.log('[GuestActionHandler] Guest account detected, handling action');

    // Show confirmation dialog if requested
    if (options.showConfirm) {
        const confirmMsg = options.confirmMessage ||
            "This action requires a temporary account. Would you like to continue?";

        if (!window.confirm(confirmMsg)) {
            console.log('[GuestActionHandler] User canceled temporary account creation');
            return null;
        }
    }

    try {
        // Create temporary account
        console.log('[GuestActionHandler] Creating temporary account');
        const cloneResult = await cloneGuest(updateSession);

        if (!cloneResult?.userId) {
            throw new Error('Failed to create temporary account');
        }

        console.log('[GuestActionHandler] Temporary account created:', cloneResult.userId);

        // Call success callback if provided
        if (options.onSuccess && typeof options.onSuccess === 'function') {
            options.onSuccess(cloneResult);
        }

        // Wait a moment for the session to update
        await new Promise(resolve => setTimeout(resolve, 500));

        // Execute the original action and return its result
        return action();
    } catch (error) {
        console.error('[GuestActionHandler] Error handling guest action:', error);

        // Call error callback if provided
        if (options.onError && typeof options.onError === 'function') {
            options.onError(error);
        }

        // Display error to user
        alert('Unable to create temporary account. Please try again.');
        return null;
    }
};