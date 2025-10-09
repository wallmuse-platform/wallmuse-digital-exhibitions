// Configure.js - Updated with environment management

import React, { useMemo } from "react";
import { useEnvironments } from "../contexts/EnvironmentsContext.js";
import { removeScreen, removeEnvironment, deactivateEnvironment, deactivateScreen } from "../utils/api.js";
import Loading from "../utils/Loading";
import { useResponsive } from '../utils/useResponsive';
import { ConfigureHeaderGrid } from './ConfigureHeaderGrid';
import { ConfigureEnvironmentScreen } from './ConfigureEnvironmentScreen';
import SessionsBanner from './SessionsBanner';
import {
    checkMultipleActiveEnvironments,
    isEnvironmentActive,
    isScreenActive
} from '../utils/environmentUtils';

export function ConfigureDisplays(t) {
    console.log('Configure component is called');

    const { houses, house, environments, setEnvironments } = useEnvironments();

    // Enhanced environmentGroup with validation
    const environmentGroup = useMemo(() => {
        if (!environments || environments.length === 0) {
            return [];
        }

        const group = environments.map(env => ({
            environment: env,
            screens: env.screens || []
        }));

        // Log multiple active environments
        const multipleCheck = checkMultipleActiveEnvironments(environments);
        if (multipleCheck.hasMultiple) {
            console.warn('[Configure] Multiple active environments detected:', multipleCheck);
        }

        return group;
    }, [environments]);

    const handleEnvironmentGroupUpdate = (updatedEnvironmentGroup) => {
        console.log('[Configure] Updating environment group:', updatedEnvironmentGroup);
        
        // Convert back to environments array and update state
        const updatedEnvironments = updatedEnvironmentGroup.map(({ environment, screens }) => ({
            ...environment,
            screens: screens
        }));
        
        setEnvironments(updatedEnvironments);
    };

    const handleRemoveScreen = (id) => {
        const screenToRemove = environments.flatMap(env => env.screens || []).find(screen => String(screen.id) === String(id));

        if (!screenToRemove) {
            console.error("[Configure] Screen not found:", id);
            return;
        }

        if (isScreenActive(screenToRemove)) {
            alert(t("configure.cannot.remove.screen"));
            return;
        }

        const environmentOfScreen = environments.find(env => env.screens?.includes(screenToRemove));

        if (environmentOfScreen?.name !== "Web player" && environmentOfScreen?.screens?.length === 1) {
            alert(t("configure.requires.one.screen"));
            return;
        }

        removeScreen(id)
            .then(() => {
                const newEnvironments = environments.map(env => {
                    if (env.id === environmentOfScreen?.id) {
                        return {
                            ...env,
                            screens: env.screens?.filter(screen => String(screen.id) !== String(id)) || [],
                        };
                    }
                    return env;
                });

                setEnvironments(newEnvironments);
            })
            .catch(error => {
                console.error("[Configure] Error removing screen:", error);
            });
    };

    const handleRemoveEnvironment = (id) => {
        console.log("[Configure] handleRemoveEnvironment start:", id);
        const environmentToRemove = environments.find(env => String(env.id) === String(id));
        if (!environmentToRemove) {
            console.warn("[Configure] Environment not found:", id);
            return;
        }
        if (isEnvironmentActive(environmentToRemove)) {
            console.log("[Configure] Cannot remove active environment:", environmentToRemove);
            alert("configure.cannot.remove.env.active");
            return;
        }
        console.log("[Configure] Environment is not active, proceeding with removal");
        const newEnvironments = environments.filter(env => String(env.id) !== String(id));
        console.log("[Configure] After filtering, newEnvironments:", newEnvironments);
        setEnvironments(newEnvironments);
        try {
            removeEnvironment(id);
            console.log("[Configure] removeEnvironment API called");
        } catch (err) {
            console.error("[Configure] Error calling removeEnvironment API:", err);
        }
        console.log("[Configure] handleRemoveEnvironment completed");
    };

    // New function to handle environment deactivation
    const handleDeactivateEnvironment = async (id) => {
        console.log("[Configure] handleDeactivateEnvironment start:", id);

        const environmentToDeactivate = environments.find(env => String(env.id) === String(id));

        if (!environmentToDeactivate) {
            console.warn("[Configure] Environment not found:", id);
            return;
        }

        if (!isEnvironmentActive(environmentToDeactivate)) {
            console.log("[Configure] Environment is already inactive:", environmentToDeactivate);
            return;
        }

        try {
            // Step 1: Deactivate all screens in the environment first
            if (environmentToDeactivate.screens && environmentToDeactivate.screens.length > 0) {
                console.log(`[Configure] Deactivating ${environmentToDeactivate.screens.length} screens first`);

                for (const screen of environmentToDeactivate.screens) {
                    if (isScreenActive(screen)) {
                        console.log(`[Configure] Deactivating screen ${screen.id} (${screen.name})`);
                        try {
                            await deactivateScreen(screen.id);
                            console.log(`[Configure] Screen ${screen.id} deactivated successfully`);
                        } catch (screenError) {
                            console.error(`[Configure] Error deactivating screen ${screen.id}:`, screenError);
                            // Continue with other screens even if one fails
                        }
                    } else {
                        console.log(`[Configure] Screen ${screen.id} is already inactive, skipping`);
                    }
                }
            }

            // Step 2: Deactivate the environment
            console.log("[Configure] Now deactivating environment:", id);
            await deactivateEnvironment(id);
            console.log("[Configure] Environment deactivated via API");

            // Step 3: Update local state to reflect all deactivations
            const newEnvironments = environments.map(env => {
                if (String(env.id) === String(id)) {
                    return {
                        ...env,
                        alive: "0", // Set environment as inactive
                        screens: env.screens?.map(screen => ({
                            ...screen,
                            on: "0"      // Set screen as off (but keep enabled/linked)
                            // enabled stays the same - screen remains linked to environment
                        })) || []
                    };
                }
                return env;
            });

            setEnvironments(newEnvironments);
            console.log("[Configure] handleDeactivateEnvironment completed");

        } catch (error) {
            console.error("[Configure] Error deactivating environment:", error);
            alert("Error deactivating environment. Please try again.");
        }
    };

    const { isMobile, isTablet, isHD, isUHD, isSmartTV, isPortrait, isLandscape } = useResponsive();

    // Enhanced numRows calculation with validation
    const numRows = useMemo(() => {
        let totalRows = 16; // Base rows + header

        // Add extra row if multiple environments are active (for alert at top)
        const multipleCheck = checkMultipleActiveEnvironments(environments);
        if (multipleCheck.hasMultiple) {
            totalRows += 2; // Extra space for alert at top
        }

        environmentGroup.forEach(envGroup => {
            let environmentRows = 6;
            if (envGroup.screens.length >= 2) {
                environmentRows += (envGroup.screens.length - 1) * 5;
            }
            totalRows += environmentRows;
        });

        return totalRows;
    }, [environmentGroup, environments]);

    // Validation and logging
    React.useEffect(() => {
        const multipleCheck = checkMultipleActiveEnvironments(environments);
        if (multipleCheck.hasMultiple) {
            console.warn('[Configure] Multiple active environments detected:', {
                count: multipleCheck.count,
                environments: multipleCheck.environments.map(env => ({
                    id: env.id,
                    name: env.name,
                    ip: env.ip
                }))
            });
        }
    }, [environments]);

    return (
        <div
            className="grid-container"
            style={{
                display: "grid",
                minWidth: "360px",
                gridTemplateColumns: isMobile ? "2px 2px repeat(11, 1fr) 2px 2px" : "repeat(15, 1fr)",
                gridTemplateRows: `repeat(${numRows}, minmax(15px, 40px))`,
                overflow: "auto",
                alignItems: "stretch",
            }}
        >
            <ConfigureHeaderGrid account={{ data: houses }} house={house} />
            <SessionsBanner
                environments={environments}
                handleDeactivateEnvironment={handleDeactivateEnvironment}
            />
            <ConfigureEnvironmentScreen
                environmentGroup={environmentGroup}
                handleRemoveScreen={handleRemoveScreen}
                handleRemoveEnvironment={handleRemoveEnvironment}
                handleDeactivateEnvironment={handleDeactivateEnvironment}
                onEnvironmentGroupUpdate={handleEnvironmentGroupUpdate}
            />
        </div>
    );
}