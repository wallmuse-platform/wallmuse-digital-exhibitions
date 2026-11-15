// utils/environmentUtils.js

/**
 * Utility functions for managing environments and screens
 */

/**
 * Check if a screen is considered active/valid.
 *
 * IMPORTANT — `on` vs `enabled`, do not confuse the two:
 * - `screen.on` is computed by the SERVER (from recent master_alive / daemon activity) —
 *   it reflects whether the screen is genuinely live/streaming right now. The client
 *   cannot set it directly; there is no `upd_screen?on=` parameter.
 * - `screen.enabled` is the ONLY field the client can actually set, via
 *   `upd_screen?enabled=0|1` (see api.js's activateScreen/deactivateScreen, fixed to use
 *   `enabled` on 2026-11-10). It represents the USER'S configured intent — "should this
 *   screen be on" — not whether it currently is.
 *
 * This function intentionally checks `on` because most of its callers (e.g.
 * getBestScreenFromEnvironment, canUseEnvironmentForPlayback in this file) are asking
 * "can we actually use this screen for playback right now," where live server status is
 * the correct signal. But Configure's own UI (ConfigureEnvironmentScreen.js) uses this same
 * function to drive the on/off Switch's checked state — which is wrong, since toggling that
 * Switch only ever changes `enabled`, never `on`. After a refresh, `on` reverts to whatever
 * the server actually observes, independent of the toggle, making the Switch look like it
 * reverted even though `enabled` was set correctly. If you need "did the user enable this
 * screen" rather than "is this screen live," use isScreenEnabled() below instead —
 * do NOT reuse this function for that purpose.
 * @param {Object} screen - Screen object
 * @returns {boolean} - True if screen is active and usable
 */
export const isScreenActive = (screen) => {
  if (!screen) return false;

  // Screen is active if it's on, regardless of dimensions
  // We treat 0x0 dimensions as a temporary state that should be handled
  return screen.on === "1" || screen.active === true;
};

/**
 * Check if a screen is ENABLED — the user's configured intent, set via
 * `upd_screen?enabled=0|1` (see isScreenActive's comment above for the full `on` vs
 * `enabled` distinction). Use this, not isScreenActive, for anything that reflects or
 * decides the result of activateScreen/deactivateScreen: a toggle's own checked state,
 * or logic that needs to know which of those two to call next.
 * @param {Object} screen - Screen object
 * @returns {boolean} - True if the screen is enabled
 */
export const isScreenEnabled = (screen) => {
  if (!screen) return false;
  return screen.enabled === "1";
};

/**
 * Check if a screen has valid dimensions
 * @param {Object} screen - Screen object
 * @returns {boolean} - True if screen has valid dimensions
 */
export const hasValidDimensions = (screen) => {
  if (!screen) return false;
  
  const width = parseInt(screen.width || 0);
  const height = parseInt(screen.height || 0);
  
  return width > 0 && height > 0;
};

/**
 * Check if an environment is active
 * @param {Object} environment - Environment object
 * @returns {boolean} - True if environment is alive
 */
export const isEnvironmentActive = (environment) => {
  if (!environment) return false;
  return environment.alive === "1";
};

/**
 * Get all active environments from a list
 * @param {Array} environments - Array of environment objects
 * @returns {Array} - Array of active environments
 */
export const getActiveEnvironments = (environments) => {
  if (!Array.isArray(environments)) return [];
  return environments.filter(env => isEnvironmentActive(env));
};

/**
 * Get the primary active environment (first one found)
 * @param {Array} environments - Array of environment objects
 * @returns {Object|null} - Primary active environment or null
 */
export const getPrimaryActiveEnvironment = (environments) => {
  const activeEnvs = getActiveEnvironments(environments);
  return activeEnvs.length > 0 ? activeEnvs[0] : null;
};

/**
 * A LIVE "Web player" environment with a genuinely broken screen (0 width/height) is the
 * known signature of the account-creation race documented in
 * TROUBLESHOOTING_ACCOUNT_CREATION.md: one browser's session ends up with a duplicate "Web
 * player" environment left over from the creation race, alongside its real one, before the
 * narrower "new-account first-load race" cleanup catches it.
 *
 * CRITICAL: requires alive === "1". Do NOT match on screen.on === "0" alone (as
 * EnvironmentsContext.js's cleanup predicate does, for its own narrower, transient purpose
 * right after creation) — that's just the normal state of ANY dormant "Web player"
 * environment from a closed browser tab, which is the overwhelming majority of entries in a
 * real account's history and must never be flagged here. Only a currently-alive environment
 * reporting 0x0 dimensions is actually suspicious (stuck mid-creation), not a historical one
 * that simply isn't running right now.
 * @param {Object} environment - Environment object
 * @returns {boolean} - True if this is the known faulty-duplicate signature
 */
export const hasFaultyScreen = (environment) => {
  if (
    !environment ||
    environment.name !== "Web player" ||
    environment.alive !== "1" ||
    !environment.screens
  ) {
    return false;
  }
  return environment.screens.some(
    (screen) =>
      screen.enabled === "1" &&
      (screen.width === "0" || screen.height === "0"),
  );
};

/**
 * DUPLICATE-SESSION WARNING ONLY — do not use this for anything that should legitimately
 * count every active device (that's checkMultipleActiveEnvironments below). This checks for
 * the known duplicate "Web player" environment artifact (see hasFaultyScreen), NOT a generic
 * count of "alive" environments. There is no restriction on how many PC players or genuinely
 * separate browsers can be active at once (a PC player and a web player, or two web players
 * on two different browsers, are never a conflict); the only thing worth surfacing here is a
 * same-browser leftover duplicate from the creation race.
 * Used by: SessionsBanner.js, MultipleEnvironmentsAlert.js ("keep one, end the duplicate").
 * @param {Array} environments - Array of environment objects (one house)
 * @returns {Object} - { hasMultiple: boolean, count: number, environments: Array }
 */
export const checkDuplicateWebPlayerEnvironments = (environments) => {
  if (!Array.isArray(environments)) {
    return { hasMultiple: false, count: 0, environments: [] };
  }

  const duplicates = environments.filter(hasFaultyScreen);
  if (duplicates.length === 0) {
    return { hasMultiple: false, count: 0, environments: [] };
  }

  // Put the healthy, currently-alive "Web player" environment first so the UI shows it as
  // the one to keep. Must also require alive === "1" here — otherwise a dormant historical
  // "Web player" entry (alive="0", not flagged by hasFaultyScreen since that already
  // requires alive) could get picked as "master" instead of the one actually running.
  const master = environments.find(
    (env) => env.name === "Web player" && env.alive === "1" && !hasFaultyScreen(env),
  );
  const flagged = master ? [master, ...duplicates] : duplicates;

  return {
    hasMultiple: true,
    count: flagged.length,
    environments: flagged,
  };
};

/**
 * GENERIC ACTIVE-ENVIRONMENT COUNT — deliberately counts every alive environment regardless
 * of type (PC players included). Do not narrow this to "Web player" only or to the faulty-
 * screen duplicate signature (see checkDuplicateWebPlayerEnvironments above for that) — this
 * one backs the CLUSTER_SYNC "synced to N screens" indicator in App.js, which must count every
 * device a broadcast command actually reached (handleSendCommand sends to the whole house).
 * @param {Array} environments - Array of environment objects
 * @returns {Object} - { hasMultiple: boolean, count: number, environments: Array }
 */
export const checkMultipleActiveEnvironments = (environments) => {
  const activeEnvs = getActiveEnvironments(environments);
  return {
    hasMultiple: activeEnvs.length > 1,
    count: activeEnvs.length,
    environments: activeEnvs
  };
};

/**
 * Get screens from an environment (including inactive/invalid ones)
 * @param {Object} environment - Environment object
 * @param {boolean} activeOnly - If true, return only active screens
 * @returns {Array} - Array of screens
 */
export const getScreensFromEnvironment = (environment, activeOnly = false) => {
  if (!environment || !environment.screens) {
    return [];
  }
  
  if (activeOnly) {
    return environment.screens.filter(screen => isScreenActive(screen));
  }
  
  return environment.screens;
};

/**
 * Check if environment has any screens that could potentially be active
 * @param {Object} environment - Environment object
 * @returns {boolean} - True if environment has screens (even if currently off/invalid)
 */
export const hasScreens = (environment) => {
  return environment && environment.screens && environment.screens.length > 0;
};

/**
 * Get the best available screen from an environment
 * @param {Object} environment - Environment object
 * @returns {Object|null} - Best screen or null
 */
export const getBestScreenFromEnvironment = (environment) => {
  if (!hasScreens(environment)) {
    return null;
  }
  
  const screens = environment.screens;
  
  // Priority 1: Active screen with valid dimensions
  const activeValidScreens = screens.filter(screen => 
    isScreenActive(screen) && hasValidDimensions(screen)
  );
  if (activeValidScreens.length > 0) {
    return activeValidScreens[0];
  }
  
  // Priority 2: Active screen (even with invalid dimensions)
  const activeScreens = screens.filter(screen => isScreenActive(screen));
  if (activeScreens.length > 0) {
    return activeScreens[0];
  }
  
  // Priority 3: Any screen (might be activated later)
  return screens[0];
};

/**
 * Get all screens from all environments with their status
 * @param {Array} environments - Array of environment objects
 * @param {boolean} activeOnly - If true, only return active screens
 * @returns {Array} - Array of { environment, screens } objects
 */
export const getAllScreens = (environments, activeOnly = false) => {
  if (!Array.isArray(environments)) return [];
  
  return environments.map(environment => ({
    environment,
    screens: getScreensFromEnvironment(environment, activeOnly)
  })).filter(({ environment, screens }) => {
    // Always include environments that are active or have screens
    if (isEnvironmentActive(environment)) return true;
    if (screens.length > 0) return true;
    return false;
  });
};

/**
 * Get the current screen ID for WebPlayer usage
 * Uses the best available screen from the primary active environment
 * @param {Array} environments - Array of environment objects  
 * @returns {string|number|null} - Screen ID or null
 */
export const getCurrentScreenId = (environments) => {
  const primaryEnv = getPrimaryActiveEnvironment(environments);
  if (!primaryEnv) return null;
  
  const bestScreen = getBestScreenFromEnvironment(primaryEnv);
  return bestScreen ? bestScreen.id : null;
};

/**
 * Check if an environment can be used for playback
 * @param {Object} environment - Environment object
 * @returns {Object} - { canUse: boolean, reason: string, bestScreen: Object|null }
 */
export const canUseEnvironmentForPlayback = (environment) => {
  if (!isEnvironmentActive(environment)) {
    return { 
      canUse: false, 
      reason: 'Environment is not active', 
      bestScreen: null 
    };
  }
  
  if (!hasScreens(environment)) {
    return { 
      canUse: false, 
      reason: 'Environment has no screens', 
      bestScreen: null 
    };
  }
  
  const bestScreen = getBestScreenFromEnvironment(environment);
  
  if (!bestScreen) {
    return { 
      canUse: false, 
      reason: 'No usable screen found', 
      bestScreen: null 
    };
  }
  
  // Environment can be used even if screen is off or has invalid dimensions
  // because these states can change dynamically
  return { 
    canUse: true, 
    reason: isScreenActive(bestScreen) && hasValidDimensions(bestScreen) 
      ? 'Ready for playback' 
      : 'Screen may need activation or refresh', 
    bestScreen 
  };
};

/**
 * Validate screen setup and provide recommendations
 * @param {Array} environments - Array of environment objects
 * @returns {Object} - Validation results and recommendations
 */
export const validateScreenSetup = (environments) => {
  const activeEnvs = getActiveEnvironments(environments);
  // Duplicate-artifact check (see checkDuplicateWebPlayerEnvironments) — a PC player and a
  // web player, or two web players on different browsers, are not a "conflict" to report here.
  const multipleActiveCheck = checkDuplicateWebPlayerEnvironments(environments);
  
  const issues = [];
  const recommendations = [];
  
  // Check for multiple active environments
  if (multipleActiveCheck.hasMultiple) {
    issues.push({
      type: 'multiple_active_environments',
      severity: 'warning',
      message: `${multipleActiveCheck.count} environments are active. This may cause conflicts.`,
      environments: multipleActiveCheck.environments.map(env => ({ id: env.id, name: env.name }))
    });
    recommendations.push('Consider deactivating unused environments to avoid conflicts');
  }
  
  // Check each active environment for screen issues
  activeEnvs.forEach(env => {
    const playbackCheck = canUseEnvironmentForPlayback(env);
    
    if (!playbackCheck.canUse) {
      if (playbackCheck.reason === 'Environment has no screens') {
        issues.push({
          type: 'no_screens',
          severity: 'error',
          message: `Environment "${env.name}" has no screens defined`,
          environmentId: env.id
        });
        recommendations.push(`Add a screen to environment "${env.name}"`);
      }
    } else {
      const bestScreen = playbackCheck.bestScreen;
      
      if (!isScreenActive(bestScreen)) {
        issues.push({
          type: 'screen_inactive',
          severity: 'warning',
          message: `Environment "${env.name}" has screens but none are active`,
          environmentId: env.id,
          screenId: bestScreen.id
        });
        recommendations.push(`Activate screen "${bestScreen.name}" in environment "${env.name}"`);
      } else if (!hasValidDimensions(bestScreen)) {
        issues.push({
          type: 'invalid_screen_dimensions',
          severity: 'info',
          message: `Screen "${bestScreen.name}" in environment "${env.name}" needs dimension refresh`,
          environmentId: env.id,
          screenId: bestScreen.id,
          currentDimensions: { width: bestScreen.width, height: bestScreen.height }
        });
        recommendations.push(`Refresh the page to update screen dimensions for "${bestScreen.name}"`);
      }
    }
  });
  
  return {
    isValid: issues.filter(issue => issue.severity === 'error').length === 0,
    hasWarnings: issues.filter(issue => issue.severity === 'warning').length > 0,
    hasInfo: issues.filter(issue => issue.severity === 'info').length > 0,
    issues,
    recommendations,
    summary: {
      totalEnvironments: environments.length,
      activeEnvironments: activeEnvs.length,
      environmentsWithScreens: activeEnvs.filter(env => hasScreens(env)).length,
      environmentsReadyForPlayback: activeEnvs.filter(env => 
        canUseEnvironmentForPlayback(env).canUse && 
        canUseEnvironmentForPlayback(env).reason === 'Ready for playback'
      ).length
    }
  };
};