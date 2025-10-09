// EnvironmentsContext.js - Optimized Version

import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    detailsUser,
    refeshBackendCurrentPlaylist,
    createDefaultEnvironment,
    createDefaultScreen,
    copyGuestPlaylistsToUser,
    activateScreenWithParams,
    removeEnvironment
} from '../utils/api';
import { forceStop } from '../utils/PlaybackManager';
import { getUserId, setHouseId } from '../utils/Utils';
import { useSession } from './SessionContext'; // Import the SessionContext hook
import { CustomSnackbar, CustomAlert } from '../CustomComponents';
import { requestScreenPermissionForEnvironment, getScreenDimensions } from '../utils/requestScreenPermission';


const EnvironmentsContext = createContext();
const sessionId = getUserId();

export const useEnvironments = () => useContext(EnvironmentsContext);

export const EnvironmentsProvider = ({ children }) => {
    // Separate loading states for different purposes
    const [initialLoading, setInitialLoading] = useState(true);
    const [syncLoading, setSyncLoading] = useState(false);
    const [playlistLoading, setPlaylistLoading] = useState(false);
    
    // Consolidated state initialization - group related states
    const [syncComplete, setSyncComplete] = useState(false);
    const [houses, setHouses] = useState([]);
    const [house, setHouse] = useState(null);
    const [environments, setEnvironments] = useState([]);
    const [currentPlaylist, setCurrentPlaylist] = useState(undefined);
    const [backendCurrentPlaylist, setBackendCurrentPlaylist] = useState(undefined);
    const [error, setError] = useState(null);
    const [accountFeedback, setAccountFeedback] = useState({
        success: false,
        error: false
    });
    const [needsRefresh, setNeedsRefresh] = useState(false);

    // Get session data from SessionContext
    const sessionData = useSession();
    // Use safe property access with defaults
    const isLoggedIn = sessionData?.isLoggedIn || true;
    const isDemo = sessionData?.isDemo || false;
    const userDetails = sessionData?.userDetails || null;

    const previousPlaylist = useRef(null);
    const isInitialRender = useRef(true);
    const renderCount = useRef(0);

    // Memoized callback for reset refresh
    const resetRefreshNeeded = useCallback(() => {
        setNeedsRefresh(false);
        localStorage.removeItem('needsRefresh');
        console.log('RemoveItem needsRefresh & setNeedsRefresh to false');
    }, []);

    /**
     * Poll the backend until screen dimensions are properly populated or max attempts reached
     */
    const waitForScreenDimensions = async (screenId, environmentId) => {
        console.log(`[waitForScreenDimensions] Waiting for screen ${screenId} to get dimensions...`);
        
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 10;
            
            const interval = setInterval(async () => {
                attempts++;
                
                try {
                    // Get fresh data
                    const response = await detailsUser(Date.now());
                    const housesData = response?.data?.houses?.[0]?.environments || [];
                    
                    // Find our environment and screen
                    const env = housesData.find(e => e.id === environmentId);
                    const screen = env?.screens?.find(s => s.id === screenId);
                    
                    if (!screen) {
                        console.log(`[waitForScreenDimensions] Check ${attempts}/${maxAttempts}: Screen ${screenId} not found`);
                        
                        if (attempts >= maxAttempts) {
                            clearInterval(interval);
                            resolve({ success: false, reason: 'screen_not_found' });
                        }
                        return;
                    }
                    
                    console.log(`[waitForScreenDimensions] Check ${attempts}/${maxAttempts}: Screen ${screenId} has width=${screen.width}, height=${screen.height}, on=${screen.on}`);
                    
                    // Check if dimensions are populated
                    if (screen.width !== "0" && screen.height !== "0" && screen.on === "1") {
                        console.log(`[waitForScreenDimensions] Screen dimensions populated successfully!`);
                        clearInterval(interval);
                        resolve({ success: true, screen });
                        return;
                    }
                    
                    // After 3 failed attempts, try to activate the screen again
                    if (attempts === 3) {
                        try {
                            console.log(`[waitForScreenDimensions] Still no dimensions after ${attempts} attempts, activating again...`);
                            const dimensions = {
                                width: window.screen.width || 1920,
                                height: window.screen.height || 1080
                            };
                            await activateScreenWithParams(screenId, 1, dimensions, sessionId);
                        } catch (error) {
                            console.error(`[waitForScreenDimensions] Error reactivating screen:`, error);
                        }
                    }
                    
                    // Give up after max attempts
                    if (attempts >= maxAttempts) {
                        console.log(`[waitForScreenDimensions] Max attempts reached, giving up`);
                        clearInterval(interval);
                        resolve({ success: false, reason: 'timeout', screen });
                    }
                } catch (error) {
                    console.error(`[waitForScreenDimensions] Error checking screen dimensions:`, error);
                    clearInterval(interval);
                    reject(error);
                }
            }, 1000); // Check once per second
        });
    };

    /**
     * Fetch environment details from backend.
     */
    const fetchEnvironmentDetails = useCallback(async (forceRefresh = false) => {
        console.log(`[fetchEnvironmentDetails] Fetching user details... (forceRefresh: ${forceRefresh ? 'true' : 'false'})`);
        setInitialLoading(true);

        try {
            const response = await detailsUser(forceRefresh ? Date.now() : undefined);
            const housesData = response?.data?.houses || [];

            if (housesData.length > 0) {
                console.log("[fetchEnvironmentDetails] Houses found:", housesData);
                setHouses(housesData);
                setHouse(housesData[0]?.id || null);

                // Get house ID
                const houseId = housesData[0]?.id;
                console.log("[fetchEnvironmentDetails] houseId:", houseId);

                // Check for existing environments
                const houseEnvironments = [];
                console.log("[fetchEnvironmentDetails] Raw housesData[0]:", housesData[0]);
                console.log("[fetchEnvironmentDetails] housesData[0]?.environments:", housesData[0]?.environments);
                
                if (housesData[0]?.environments) {
                    houseEnvironments.push(...housesData[0].environments);
                }

                console.log("[fetchEnvironmentDetails] Found environments:", houseEnvironments);
                console.log("[fetchEnvironmentDetails] houseEnvironments.length:", houseEnvironments.length);

                // ACCOUNT CREATION PROCESS DUMP - comment/uncomment to toggle
                const accountCreationProcess = {
                    timestamp: new Date().toISOString(),
                    milestone: 'environment_fetch',
                    houseId: houseId,
                    environmentCount: houseEnvironments.length,
                    environments: houseEnvironments.map(env => ({
                        id: env.id,
                        ip: env.ip || 'none',
                        screenDimensions: env.screens?.[0] ? `${env.screens[0].width}x${env.screens[0].height}` : 'no_screen'
                    })),
                    flags: {
                        accountJustCreated: localStorage.getItem('accountJustCreated'),
                        activationComplete: localStorage.getItem('activationComplete'),
                        needsRefresh: localStorage.getItem('needsRefresh'),
                        needsSecondRefresh: localStorage.getItem('needsSecondRefresh')
                    }
                };
                localStorage.setItem('accountProcess_' + Date.now(), JSON.stringify(accountCreationProcess));
                console.log("[ACCOUNT CREATION PROCESS]", accountCreationProcess);

                setEnvironments(houseEnvironments);

                if (houseId) {
                    console.log('[EnvironmentsContext] Updating DOM with discovered house ID:', houseId);
                    setHouseId(houseId); // This will update both DOM and localStorage
                }

                // if (houseId) {
                // Check if this is a newly created account that needs playlists
                const isNewAccount = localStorage.getItem('accountJustCreated') === 'true';
                const newAccountHouseId = localStorage.getItem('newAccountHouseId');

                // Copy playlists first regardless of environment existence
                if (isNewAccount && newAccountHouseId === houseId) {
                    console.log("[fetchEnvironmentDetails] Processing new account setup for house:", houseId);

                    try {
                        console.log("[fetchEnvironmentDetails] Copying playlists from guest account...");
                        // 1. Copy playlists from guest account
                        const domainMatch = sessionId.match(/-(\d+)-[a-f0-9]{32}$/);
                        const domain = domainMatch ? domainMatch[1] : "1";
                        console.log('[fetchEnvironmentDetails] domain:', domain);

                        // Check if we've already copied for this specific house
                        const copiedHouses = JSON.parse(localStorage.getItem('copiedHouses') || '[]');
                        if (!copiedHouses.includes(houseId)) {
                            const copyResult = await copyGuestPlaylistsToUser(domain, sessionId, houseId);
                            console.log("[fetchEnvironmentDetails] Playlist copy result:", copyResult);

                            // Add this house to the list of houses we've copied playlists for
                            copiedHouses.push(houseId);
                            localStorage.setItem('copiedHouses', JSON.stringify(copiedHouses));
                            localStorage.setItem('playlistsCopied', 'true');

                            // IMPORTANT: Clear account creation flags after successful copy
                            localStorage.removeItem('accountJustCreated');
                            localStorage.removeItem('newAccountHouseId');
                        } else {
                            console.log("[fetchEnvironmentDetails] Playlists already copied for house:", houseId);
                        }

                        // 2. Now handle screen setup for the new account
                        if (houseEnvironments.length > 0) {
                            // Add detailed debugging to see exactly what's in the environments
                            console.log("[fetchEnvironmentDetails] Examining environments and screens:");
                            houseEnvironments.forEach(env => {
                                console.log(`Environment ${env.id} (${env.name}):`);
                                if (env.screens && env.screens.length > 0) {
                                    env.screens.forEach(screen => {
                                        console.log(`  Screen ${screen.id}: enabled=${screen.enabled}, on=${screen.on}, width=${screen.width}, height=${screen.height}`);
                                    });
                                } else {
                                    console.log("  No screens");
                                }
                            });
        
                            // Identify the master environment (with IP 127.0.0.1)
                            const masterEnv = houseEnvironments.find(env => env.ip === '127.0.0.1');
                            const cryptKeyEnvs = houseEnvironments.filter(env => env.crypt_key && !env.ip);
        
                            if (masterEnv) {
                                console.log("[fetchEnvironmentDetails] Found master environment with IP 127.0.0.1:", masterEnv.id);
        
                                // Check if we need to remove non-master environments
                                if (cryptKeyEnvs.length > 0) {
                                    console.log("[fetchEnvironmentDetails] Found non-master environments with crypt_key:",
                                        cryptKeyEnvs.map(e => e.id));
        
                                    // Remove the non-master environments
                                    for (const env of cryptKeyEnvs) {
                                        try {
                                            await removeEnvironment(env.id);
                                            console.log(`[fetchEnvironmentDetails] Removed non-master environment ${env.id}`);
                                        } catch (error) {
                                            console.error(`[fetchEnvironmentDetails] Error removing environment ${env.id}:`, error);
                                        }
                                    }
        
                                    // Refresh to update the environments list
                                    const refreshResponse = await detailsUser(Date.now());
                                    if (refreshResponse?.data?.houses?.[0]?.environments) {
                                        setEnvironments(refreshResponse.data.houses[0].environments);
                                    }
                                }
                            }
        
                            // Continue with your existing active screen check
                            const activeScreens = [];
                            houseEnvironments.forEach(env => {
                                if (env.screens) {
                                    env.screens.forEach(screen => {
                                        if (screen.on === "1" && screen.width !== "0" && screen.height !== "0") {
                                            activeScreens.push({ envId: env.id, screenId: screen.id });
                                        }
                                    });
                                }
                            });
        
                            // Check if any environment already has an active screen
                            const hasActiveScreen = houseEnvironments.some(env =>
                                env.screens?.some(screen => screen.on === "1" && screen.width !== "0" && screen.height !== "0")
                            );
        
                            console.log('[fetchEnvironmentDetails] hasActiveScreen', hasActiveScreen);
        
                            if (hasActiveScreen) {
        
                                // Find environments with faulty screens that are named "Web player"
                                const environmentsWithFaultyScreens = houseEnvironments.filter(env =>
                                    env.name === "Web player" &&
                                    env.screens?.some(screen =>
                                        screen.enabled === "1" &&
                                        (screen.width === "0" || screen.height === "0" || screen.on === "0")
                                    )
                                );
        
                                console.log("[fetchEnvironmentDetails] Environments with faulty screens:", environmentsWithFaultyScreens);
        
                                // First, try to fix essential environments before removing any
                                let screenFixed = false;
        
                                // For each environment with faulty screens
                                for (const env of environmentsWithFaultyScreens) {
                                    // If this is the only environment OR it has IP 127.0.0.1, fix its screen
                                    const isEssential = houseEnvironments.length === 1 || env.ip === "127.0.0.1";
                                    
                                    console.log(`[fetchEnvironmentDetails] Environment ${env.id} is ${isEssential ? 'essential' : 'non-essential'}`);
                                    
                                    if (isEssential) {
                                        console.log(`[fetchEnvironmentDetails] Fixing screens for essential environment ${env.id}`);
                                        
                                        // Find the faulty screen
                                        const faultyScreen = env.screens.find(screen => 
                                            screen.enabled === "1" && 
                                            (screen.width === "0" || screen.height === "0" || screen.on === "0")
                                        );
                                        
                                        if (faultyScreen) {
                                            try {
                                                console.log(`[fetchEnvironmentDetails] Activating faulty screen ${faultyScreen.id}`);
                                                
                                                // Get current dimensions
                                                const dimensions = {
                                                    width: window.screen.width || 1920,
                                                    height: window.screen.height || 1080
                                                };
                                                
                                                // Log the activation attempt with details
                                                console.log(`[fetchEnvironmentDetails] Activating screen ${faultyScreen.id} with:`, {
                                                    screenId: faultyScreen.id,
                                                    on: 1,
                                                    dimensions,
                                                    sessionId
                                                });
                                                
                                                // Activate the screen
                                                await activateScreenWithParams(faultyScreen.id, 1, dimensions, sessionId);
                                                console.log(`[fetchEnvironmentDetails] Screen ${faultyScreen.id} activated with dimensions`);
                                                
                                                // Mark that we fixed a screen
                                                screenFixed = true;
                                                
                                                // Wait for dimensions to be populated
                                                const waitResult = await waitForScreenDimensions(faultyScreen.id, env.id);
                                                
                                                if (waitResult.success) {
                                                    console.log(`[fetchEnvironmentDetails] Screen dimensions successfully populated!`);
                                                    // Update environments with the updated screen
                                                    const updatedResponse = await detailsUser(Date.now());
                                                    if (updatedResponse?.data?.houses?.[0]?.environments) {
                                                        setEnvironments(updatedResponse.data.houses[0].environments);
                                                    }
                                                    
                                                    // Clear any refresh flags since we've successfully populated dimensions
                                                    localStorage.removeItem('needsRefresh');
                                                    localStorage.removeItem('needsSecondRefresh');
                                                    localStorage.removeItem('refreshShown');
                                                    localStorage.removeItem('refreshAttempts'); // Clear attempts counter
                                                } else {
                                                    // Check refresh history
                                                    const refreshAlreadyShown = localStorage.getItem('refreshShown') === 'true';
                                                    const refreshAttempts = parseInt(localStorage.getItem('refreshAttempts') || '0');
                                                    const isActivationComplete = localStorage.getItem('activationComplete') === 'true';
                                                    
                                                    // Update attempts counter
                                                    localStorage.setItem('refreshAttempts', (refreshAttempts + 1).toString());
                                                    
                                                    // If we've already tried second refresh and still failing
                                                    if (refreshAttempts >= 2) {
                                                        console.log(`[fetchEnvironmentDetails] Multiple refresh attempts failed. Giving up.`);
                                                        // Clear all refresh flags to avoid infinite loops
                                                        localStorage.removeItem('needsRefresh');
                                                        localStorage.removeItem('needsSecondRefresh');
                                                        localStorage.removeItem('refreshShown');
                                                        // Optionally set a flag to show an error message
                                                        localStorage.setItem('screenSetupFailed', 'true');
                                                    }
                                                    // If we've already shown one refresh, try second refresh
                                                    else if (refreshAlreadyShown || isActivationComplete) {
                                                        console.log(`[fetchEnvironmentDetails] First refresh didn't work, trying silent second refresh`);
                                                        // Remove needsRefresh to avoid both mechanisms running
                                                        localStorage.removeItem('needsRefresh');
                                                        console.log(`[fetchEnvironmentDetails l.356] setItem('needsSecondRefresh)`);
                                                        localStorage.setItem('needsSecondRefresh', 'true');
                                                    }
                                                    // First detection of faulty screen, use normal refresh
                                                    else if (localStorage.getItem('needsRefresh') !== 'true') {
                                                        console.log(`[fetchEnvironmentDetails l.361] Setting first refresh flag`);
                                                        localStorage.setItem('needsRefresh', 'true');
                                                    }
                                                }
                                            } catch (error) {
                                                console.error(`[fetchEnvironmentDetails] Error activating screen ${faultyScreen.id}:`, error);
                                            }
                                        }
                                    }
                                }
        
                                // Only remove non-essential environments if we successfully fixed an essential one
                                if (screenFixed) {
                                    console.log("[fetchEnvironmentDetails] Successfully fixed essential environment, now removing non-essential ones");
                                    
                                    // Now remove non-essential environments with faulty screens
                                    for (const env of environmentsWithFaultyScreens) {
                                        const isEssential = houseEnvironments.length === 1 || env.ip === "127.0.0.1";
                                        
                                        if (!isEssential) {
                                            try {
                                                console.log(`[fetchEnvironmentDetails] Removing non-essential environment ${env.id} with faulty screens`);
                                                await removeEnvironment(env.id);
                                                console.log(`[fetchEnvironmentDetails] Successfully removed environment ${env.id}`);
                                            } catch (error) {
                                                console.error(`[fetchEnvironmentDetails] Error removing environment ${env.id}:`, error);
                                            }
                                        }
                                    }
                                    
                                    // Refresh to update the UI
                                    setTimeout(async () => {
                                        const refreshResponse = await detailsUser(Date.now());
                                        if (refreshResponse?.data?.houses?.[0]?.environments) {
                                            setEnvironments(refreshResponse.data.houses[0].environments);
                                        }
                                    }, 1000);
                                }
                            } else {
                                console.log("[fetchEnvironmentDetails] No active screens found, will create one");
                                // Create environment & screen code...
        
                                // If we have a master environment, prioritize creating a screen for it
                                if (masterEnv && (!masterEnv.screens || masterEnv.screens.length === 0)) {
                                    console.log("[fetchEnvironmentDetails] Creating screen for master environment");
                                    try {
                                        const screenResult = await createDefaultScreen(masterEnv.id);
                                        console.log("[fetchEnvironmentDetails] Screen creation result:", screenResult);
        
                                        // Get latest data to find screen ID
                                        const screenRefreshResponse = await detailsUser(Date.now());
                                        let screenId = null;
        
                                        if (screenRefreshResponse?.data?.houses?.[0]?.environments) {
                                            const refreshedEnv = screenRefreshResponse.data.houses[0].environments.find(
                                                e => e.id === masterEnv.id
                                            );
        
                                            if (refreshedEnv && refreshedEnv.screens && refreshedEnv.screens.length > 0) {
                                                screenId = refreshedEnv.screens[0].id;
                                                console.log("[fetchEnvironmentDetails] Found screen ID:", screenId);
        
                                                // Activate the screen
                                                if (screenId) {
                                                    try {
                                                        const dimensions = {
                                                            width: window.screen.width || 1920,
                                                            height: window.screen.height || 1080
                                                        };
        
                                                        await activateScreenWithParams(screenId, 1, dimensions, sessionId);
                                                        console.log("[fetchEnvironmentDetails] Screen activated with dimensions");
        
                                                        // Wait for dimensions to be populated - add this block
                                                        const waitResult = await waitForScreenDimensions(screenId, masterEnv.id);
                                                        if (waitResult.success) {
                                                            console.log(`[fetchEnvironmentDetails] New screen dimensions successfully populated!`);
                                                            // Update environments with the updated screen
                                                            const updatedResponse = await detailsUser(Date.now());
                                                            if (updatedResponse?.data?.houses?.[0]?.environments) {
                                                                setEnvironments(updatedResponse.data.houses[0].environments);
                                                            }
                                                            
                                                            // Clear any refresh flags since we've successfully populated dimensions
                                                            localStorage.removeItem('needsRefresh');
                                                            localStorage.removeItem('needsSecondRefresh');
                                                            localStorage.removeItem('refreshShown');
                                                        } else {
        
        
                                                            // Check account creation state
                                                            const isActivationComplete = localStorage.getItem('activationComplete') === 'true';
                                                            const isRefreshNeeded = localStorage.getItem('needsRefresh') !== 'true';
                                                            
                                                            // If activation is complete but needsRefresh is not set, use needsSecondRefresh
                                                            if (isActivationComplete && isRefreshNeeded) {
                                                                console.log(`[fetchEnvironmentDetails l.456] Account activation complete but screen needs second refresh`);
                                                                localStorage.setItem('needsSecondRefresh', 'true');
                                                            } 
        
                                                            // Don't set refresh flag again if it's already set
                                                            if (localStorage.getItem('needsRefresh') !== 'true') {
                                                                console.log(`[fetchEnvironmentDetails l.463] setItem('needsRefresh')`);
                                                                localStorage.setItem('needsRefresh', 'true');
                                                            }
                                                        }
                                                    } catch (activateError) {
                                                        console.error("[fetchEnvironmentDetails] Error activating screen:", activateError);
                                                    }
                                                }
                                            }
                                        }
        
                                        // Final refresh to get updated data
                                        console.log("[fetchEnvironmentDetails] Final refresh after setup");
                                        const finalRefresh = await detailsUser(Date.now());
        
                                        if (finalRefresh?.data?.houses?.[0]?.environments) {
                                            setEnvironments(finalRefresh.data.houses[0].environments);
                                        }
                                    } catch (error) {
                                        console.error("[fetchEnvironmentDetails] Error creating screen for master environment:", error);
                                    }
                                }
                            }
                        } else if (houseId) {
                            // COMMENTED OUT: Parent environment creation - let child WebPlayer handle this
                            console.log('[fetchEnvironmentDetails] No environments found - Child WebPlayer will create them');

                            // ACCOUNT CREATION PROCESS DUMP - comment/uncomment to toggle
                            const accountCreationProcess = {
                                timestamp: new Date().toISOString(),
                                milestone: 'environment_creation_deferred',
                                houseId: houseId,
                                action: 'defer_to_child_webplayer',
                                trigger: 'no_existing_environments',
                                flags: {
                                    accountJustCreated: localStorage.getItem('accountJustCreated'),
                                    activationComplete: localStorage.getItem('activationComplete'),
                                    needsRefresh: localStorage.getItem('needsRefresh')
                                }
                            };
                            localStorage.setItem('accountProcess_' + Date.now(), JSON.stringify(accountCreationProcess));

                            // Signal that environment creation is needed (child WebPlayer will handle)
                            localStorage.setItem('environmentCreationNeeded', 'true');

                            /* COMMENTED OUT: Let child WebPlayer handle environment creation
                            try {
                                // Create environment
                                console.log('[fetchEnvironmentDetails] 🔨 CREATING NEW ENVIRONMENT for house:', houseId);
                                const envResult = await createDefaultEnvironment(houseId);

                                if (envResult.success && envResult.environmentId) {
                                    console.log("[fetchEnvironmentDetails] Environment created with ID:", envResult.environmentId);

                                    // First, request screen permission before creating anything
                                    console.log("[fetchEnvironmentDetails] Requesting screen permission before environment creation");
                                    const permissionResult = await requestScreenPermissionForEnvironment();

                                    // Get dimensions from permission result
                                    const dimensions = permissionResult.dimensions;
                                    console.log("[fetchEnvironmentDetails] Got dimensions from permission:", dimensions);

                                    // Create a screen for the environment
                                    const screenResult = await createDefaultScreen(envResult.environmentId);
                                    console.log("[fetchEnvironmentDetails] Screen creation result:", screenResult);

                                    // Get latest data to find screen ID if not returned directly
                                    const screenRefreshResponse = await detailsUser(Date.now());
                                    let screenId = null;

                                    if (screenRefreshResponse?.data?.houses?.[0]?.environments) {
                                        const env = screenRefreshResponse.data.houses[0].environments.find(
                                            e => e.id === envResult.environmentId
                                        );

                                        if (env && env.screens && env.screens.length > 0) {
                                            screenId = env.screens[0].id;
                                            console.log("[fetchEnvironmentDetails] Found screen ID:", screenId);

                                            // Activate the screen with all parameters in one call
                                            if (screenId) {
                                                try {
                                                    // Use dimensions from permission result
                                                    await activateScreenWithParams(screenId, 1, dimensions, sessionId);
                                                    console.log("[fetchEnvironmentDetails] Screen activated with dimensions");

                                                    // Set needsRefresh flag during environment creation
                                                    console.log("[fetchEnvironmentDetails] Setting needsRefresh during environment creation");
                                                    localStorage.setItem('needsRefresh', 'true');
                                                } catch (activateError) {
                                                    console.error("[fetchEnvironmentDetails] Error activating screen:", activateError);
                                                }
                                            }
                                        }
                                    }

                                    // Final refresh to get updated data
                                    console.log("[fetchEnvironmentDetails] Final refresh after setup");
                                    const finalRefresh = await detailsUser(Date.now());

                                    if (finalRefresh?.data?.houses?.[0]?.environments) {
                                        setEnvironments(finalRefresh.data.houses[0].environments);
                                        console.log("[fetchEnvironmentDetails] Updated environments:", finalRefresh.data.houses[0].environments);
                                    }
                                }
                            } catch (error) {
                                console.error("[fetchEnvironmentDetails] Error setting up environment:", error);
                            }
                            */
                        }
                    } catch (playlistError) {
                        console.error("[fetchEnvironmentDetails] Error copying playlists:", playlistError);
                        localStorage.removeItem('accountJustCreated');
                        localStorage.removeItem('newAccountHouseId');
                    }
                    
                }

                // Set current playlist from backend
                const backendCurrentPlaylist = housesData[0]?.current_playlist || undefined;
                setBackendCurrentPlaylist(backendCurrentPlaylist);

                // Set initial playlist only if not already set
                if (currentPlaylist === undefined && backendCurrentPlaylist !== undefined) {
                    setCurrentPlaylist(backendCurrentPlaylist);
                }
            } else {
                console.log("[fetchEnvironmentDetails] No houses found.");
                // House creation handled by SessionContext
            }
        } catch (error) {
            console.error(`[fetchEnvironmentDetails] Error:`, error);
            setError("Failed to load environment data.");
        } finally {
            setInitialLoading(false);
        }
    }, []);

    // Screen check effect - optimized to prevent excessive renders
    useEffect(() => {
        // Skip on initial render and if environments aren't loaded yet
        if (isInitialRender.current || environments.length === 0) {
            isInitialRender.current = false;
            return;
        }

        const isNewAccount = localStorage.getItem('accountJustCreated') === 'true';

        // Only run the intensive check if we're a new account
        if (isNewAccount) {
            console.log("[EnvironmentsContext] Checking for faulty screens in", environments.length, "environments");

            // Use some() for early termination when a faulty screen is found
            const hasFaultyScreen = environments.some(env =>
                env.screens?.some(screen =>
                    screen.enabled === "1" && (screen.width === "0" || screen.height === "0" || screen.on === "0")
                )
            );

            if (hasFaultyScreen) {
                console.log("[EnvironmentsContext] Found faulty screens, setting refresh needed");
                // Batch state updates together
                setNeedsRefresh(true);
                localStorage.setItem('needsRefresh', 'true');

                // Use a ref to track if we've already dispatched this event
                if (!window.refreshEventDispatched) {
                    window.dispatchEvent(new CustomEvent('screen-needs-refresh'));
                    window.refreshEventDispatched = true;
                }
            } else {
                setNeedsRefresh(false);
                localStorage.setItem('needsRefresh', 'false');
            }
        }
    }, [environments]);


    /**
     * Handle manual playlist change - simplified version for use with smart polling
     */
    const handlePlaylistChange = useCallback(async (newPlaylistId, position = null) => {
        console.log("[handlePlaylistChange] New playlist selected:", newPlaylistId, "position:", position);

        // Update UI state immediately for responsive UI
        console.log("[handlePlaylistChange] Updating currentPlaylist immediately from", currentPlaylist, "to", newPlaylistId);
        setCurrentPlaylist(newPlaylistId);

        // Dispatch navigation event to WebPlayer
        const dispatchNavigationEvent = () => {
            console.log("[handlePlaylistChange] Dispatching webplayer-navigate event:", {
                playlist: newPlaylistId,
                position: position
            });

            window.dispatchEvent(new CustomEvent('webplayer-navigate', {
                detail: {
                    playlist: newPlaylistId,
                    position: position,
                    timestamp: Date.now()
                }
            }));
        };

        // Dispatch navigation event immediately
        dispatchNavigationEvent();

        // Backend verification is now handled by smart polling in doLoadPlaylist
        console.log('[handlePlaylistChange] State updated - backend verification handled by smart polling');

        return true;
    }, [currentPlaylist]);

    // AFTER: Consolidated useEffects - combines all initialization logic
    useEffect(() => {
        // Increment render count
        renderCount.current += 1;
        console.log(`[EnvironmentsContext] Render count: ${renderCount.current}`);

        console.log("[EnvironmentsContext] Initializing...");

        // 1. Handle refresh state
        if (localStorage.getItem('refreshShown') === 'true') {
            localStorage.removeItem('refreshShown');
            setNeedsRefresh(false);
        }

        // 2. Set up event listeners
        const handleHouseCreated = async (event) => {
            console.log("[EnvironmentsContext] House created event:", event.detail); //THIS IS LINE 733
            setTimeout(async () => {
                try {
                    console.log("[EnvironmentsContext] Re-fetching environment details after house creation");
                    await fetchEnvironmentDetails(true);
                    console.log("[EnvironmentsContext] Environment refresh complete after house creation");
                } catch (error) {
                    console.error("[EnvironmentsContext] Error handling house creation:", error);
                }
            }, 1000);
        };

        window.addEventListener('house-created', handleHouseCreated);

        // 3. Initial data fetch
        const syncData = async () => {
            console.log("[EnvironmentsContext] Fetching user details...");
            await fetchEnvironmentDetails();
            console.log("[EnvironmentsContext] Sync complete.");
            setSyncComplete(true);
        };

        syncData();

        // Cleanup function - runs when component unmounts
        return () => {
            console.log("[EnvironmentsContext] Cleaning up...");
            window.removeEventListener('house-created', handleHouseCreated);
        };
    }, []);

    // NEW: Handle needsSecondRefresh for data refresh (no page reload)
    useEffect(() => {
        const needsSecondRefresh = localStorage.getItem('needsSecondRefresh') === 'true';

        if (needsSecondRefresh) {
            console.log("[EnvironmentsContext] needsSecondRefresh detected - refreshing environment data");

            const handleDataRefresh = async () => {
                try {
                    // Wait a moment for child WebPlayer to finish processing
                    await new Promise(resolve => setTimeout(resolve, 1000));

                    // Fetch fresh environment data
                    console.log("[EnvironmentsContext] Fetching fresh environment data...");
                    await fetchEnvironmentDetails(true); // Force refresh

                    // Clear the flag
                    localStorage.removeItem('needsSecondRefresh');
                    console.log("[EnvironmentsContext] Data refresh completed, needsSecondRefresh cleared");

                    // Clear other related flags for clean state
                    localStorage.removeItem('environmentCreationNeeded');
                    localStorage.removeItem('currentSetupPhase');

                } catch (error) {
                    console.error("[EnvironmentsContext] Error during data refresh:", error);
                    // Still clear flag to prevent infinite loops
                    localStorage.removeItem('needsSecondRefresh');
                }
            };

            handleDataRefresh();
        }
    }, [fetchEnvironmentDetails]); // Re-run when fetchEnvironmentDetails changes


    // Memoized context value with all loading states
    const contextValue = useMemo(() => ({
        initialLoading,
        setInitialLoading,
        syncLoading,
        setSyncLoading,
        playlistLoading,
        setPlaylistLoading,
        houses,
        house,
        environments,
        setEnvironments,
        currentPlaylist,
        setCurrentPlaylist,
        backendCurrentPlaylist,
        setBackendCurrentPlaylist,
        handlePlaylistChange,
        syncComplete,
        needsRefresh,
        setNeedsRefresh,
        resetRefreshNeeded
    }), [
        initialLoading,
        syncLoading,
        playlistLoading,
        houses,
        house,
        environments,
        currentPlaylist,
        backendCurrentPlaylist,
        syncComplete,
        needsRefresh,
        handlePlaylistChange,
        resetRefreshNeeded
    ]);

    // Simplified feedback handler
    const handleCloseAsyncOpFeedback = useCallback(() => {
        setAccountFeedback({ success: false, error: false });
    }, []);

    return (
        <>
            <EnvironmentsContext.Provider value={contextValue}>
                {error ? <div className="error-message">{error}</div> : children}
            </EnvironmentsContext.Provider>
            <CustomSnackbar
                open={accountFeedback.success || accountFeedback.error}
                autoHideDuration={6000}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                onClose={handleCloseAsyncOpFeedback}
            >
                <CustomAlert
                    severity={accountFeedback.error ? "error" : "success"}
                    onClose={handleCloseAsyncOpFeedback}
                >
                    {accountFeedback.error
                        ? `We encountered an issue: support@wallmuse.com is notified and will get back to you.`
                        : `Your account has been successfully created! Loading your playlists...`
                    }
                </CustomAlert>
            </CustomSnackbar>
        </>
    );
};