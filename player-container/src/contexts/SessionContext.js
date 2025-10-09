// SessionContext.js - Fixed version

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { getUserProfile } from '../SelectMontages/userProfile';
import { getUserId, isDemoAccount, cleanErroneousHouseFingerprints } from "../utils/Utils";
import { createHouseForUser, setHouseAutostart } from "../utils/api";

// Helper function to check if user is a guest
const isGuestAccount = (userId) => {
    return userId && userId.startsWith('wp-guest_');
};

const SessionContext = createContext();

export function useSession() {
    return useContext(SessionContext);
}

export const SessionProvider = ({ children }) => {
    // IMPORTANT: Use the raw, unmodified userId from DOM
    const [userId] = useState(getUserId());
    const [isGuest] = useState(() => isGuestAccount(getUserId()));
    
    // Get WordPress status ONCE at initialization
    const [wpLoggedIn] = useState(() => {
        const rootElement = document.getElementById('root');
        return rootElement?.dataset?.wpLoggedIn === 'true';
    });

    console.log('[SessionContext] rootElement?.dataset?.wpLoggedIn', document.getElementById('root')?.dataset);
    console.log('[SessionContext] wpLoggedIn value:', wpLoggedIn);
    console.log('[SessionContext] isGuest value:', isGuest);

    const [sessionData, setSessionData] = useState({
        userDetails: null,
        isLoggedIn: false,
        isPremium: false,
        isDemo: false,
        houseId: null
    });

    // Define a default session reset function
    const resetSession = useCallback(() => {
        setSessionData({
            userDetails: null,
            isLoggedIn: false,
            isPremium: false,
            isDemo: false,
            houseId: null
        });
    }, []);

    // Define the updateSession function
    const updateSession = useCallback((newSessionData) => {
        setSessionData(prev => ({
            ...prev,
            ...newSessionData,
        }));
        console.log("[SessionContext] Session updated:", newSessionData);
    }, []);

    // In SessionContext.js, after house creation/retrieval is successful
    const updateHouseInDOM = (houseId) => {
    console.log('[SessionContext] Updating DOM with house ID:', houseId);
    const rootElement = document.getElementById('root');
    if (rootElement) {
        rootElement.dataset.house = houseId;
        console.log('[SessionContext] DOM updated. New dataset:', rootElement.dataset);
    }
    // Also update localStorage
    localStorage.setItem('current_house_id', houseId);

    // CRITICAL FIX: Update wm-house localStorage for child WebPlayer coordination
    const existingWmHouse = JSON.parse(localStorage.getItem('wm-house') || '{}');
    const updatedWmHouse = {
        ...existingWmHouse,
        houseId: houseId.toString()
    };
    localStorage.setItem('wm-house', JSON.stringify(updatedWmHouse));
    console.log('[SessionContext] Updated wm-house localStorage:', updatedWmHouse);
    };

    useEffect(() => {
        let isMounted = true;

        const initSession = async () => {
            console.log("[SessionContext] Starting session initialization with userId:", userId);
            console.log("[SessionContext] WordPress login status:", wpLoggedIn);
            console.log("[SessionContext] Is guest account:", isGuest);
        
            // Don't initialize session if WordPress says not logged in AND it's not a guest account
            if (!wpLoggedIn && !isGuest) {
                console.log("[SessionContext] WordPress reports user not logged in and not a guest, skipping initialization");
                if (isMounted) {
                    resetSession();
                }
                return;
            }

            // Guest accounts and logged-in users can proceed
            console.log("[SessionContext] Proceeding with session initialization");

            // First try to get user profile - use raw userId without modification
            try {
                const userDetails = await getUserProfile(userId);
                console.log("[SessionContext] User profile result:", userDetails);

                // Check if component is still mounted before setting state
                if (!isMounted) return;
                
                const isDemo = isDemoAccount(userId);
                
                // If user has houses, use them
                if (userDetails?.houses?.length > 0) {
                    console.log("[SessionContext] User has existing houses:", userDetails.houses);
                    const existingHouse = userDetails.houses[0];
                    
                    if (existingHouse && existingHouse.autostart_playlist !== undefined) {
                        const autostartValue = 
                            typeof existingHouse.autostart_playlist === 'boolean' 
                                ? existingHouse.autostart_playlist 
                                : existingHouse.autostart_playlist === '1' || existingHouse.autostart_playlist === 1;
                        
                        // Store in localStorage for quick access
                        localStorage.setItem('house_autostart', autostartValue ? '1' : '0');
                    }
                    
                    // Store house ID in React state instead of DOM
                    setSessionData({
                        userDetails,
                        isLoggedIn: true,
                        isPremium: userDetails.isPremium || false,
                        isDemo,
                        houseId: existingHouse.id
                    });
                    return;
                } else {
                    // No houses found, create one
                    console.log("[SessionContext] No houses found, creating one");
                    
                    try {
                        const result = await createHouseForUser();

                        // Check again before setting state
                        if (!isMounted) return;
                        
                        if (result.success) {
                            console.log("[SessionContext] House creation successful:", result);

                            // Clean up any erroneous house fingerprints for new accounts
                            const cleanedCount = cleanErroneousHouseFingerprints();
                            if (cleanedCount > 0) {
                                console.log(`[SessionContext] Cleaned ${cleanedCount} erroneous house fingerprints during account setup`);
                            }

                            updateHouseInDOM(result.houseId);

                            // Set autostart for the new house
                            const autostartResult = await setHouseAutostart(result.houseId, 1);
                            console.log("[SessionContext] Autostart setting result:", autostartResult);
                            
                            // Set flags to indicate a new account setup
                            if (!result.alreadyExists) {
                                localStorage.setItem('accountJustCreated', 'true');
                                localStorage.setItem('newAccountHouseId', result.houseId);
                            }
                            
                            // Update user details with the new house
                            const updatedUserDetails = {
                                ...userDetails,
                                houses: [{ id: result.houseId, name: result.houseId }]
                            };
                            
                            // Update session data - store house ID in React state
                            setSessionData({
                                userDetails: updatedUserDetails,
                                isLoggedIn: true,
                                isPremium: userDetails.isPremium || false,
                                isDemo,
                                houseId: result.houseId
                            });
                            
                            // ACCOUNT CREATION PROCESS DUMP - comment/uncomment to toggle
                            const accountCreationProcess = {
                                timestamp: new Date().toISOString(),
                                milestone: 'house_created',
                                houseId: result.houseId,
                                action: 'createHouseForUser',
                                flags: {
                                    accountJustCreated: localStorage.getItem('accountJustCreated'),
                                    newAccountHouseId: localStorage.getItem('newAccountHouseId')
                                }
                            };
                            localStorage.setItem('accountProcess_' + Date.now(), JSON.stringify(accountCreationProcess));

                            // Dispatch house created event for other components
                            window.dispatchEvent(new CustomEvent('house-created', {
                                detail: { houseId: result.houseId }
                            }));
                            return;
                        } else {
                            console.error("[SessionContext] House creation failed:", result);
                            // Still set basic session data even if house creation failed
                            if (isMounted) {
                                setSessionData({
                                    userDetails,
                                    isLoggedIn: true,
                                    isPremium: userDetails.isPremium || false,
                                    isDemo,
                                    houseId: null
                                });
                            }
                        }
                    } catch (houseError) {
                        console.error("[SessionContext] Error creating house:", houseError);
                        if (isMounted) {
                            setSessionData({
                                userDetails,
                                isLoggedIn: true,
                                isPremium: userDetails.isPremium || false,
                                isDemo,
                                houseId: null
                            });
                        }
                    }
                }   
            } catch (profileError) {
                console.error("[SessionContext] Error getting user profile:", profileError);
                if (isMounted) {
                    resetSession();
                }
            }
        };
        
        // Check userId AND (wpLoggedIn OR isGuest) before initializing
        if (userId && (wpLoggedIn || isGuest)) {
            initSession();
        } else {
            console.warn("[SessionContext] No userId or (not logged in to WordPress and not a guest), resetting session");
            if (isMounted) {
                resetSession();
            }
        }

        // Cleanup function
        return () => {
            isMounted = false;
        };
    }, [userId, wpLoggedIn, isGuest, resetSession]); // Add isGuest to dependency array

    // Memoize the context value to prevent unnecessary re-renders
    const contextValue = useMemo(() => ({
        ...sessionData,
        updateSession,
        wpLoggedIn,
        isGuest
    }), [sessionData, updateSession, wpLoggedIn, isGuest]);

    return (
        <SessionContext.Provider value={contextValue}>
            {children}
        </SessionContext.Provider>
    );
};