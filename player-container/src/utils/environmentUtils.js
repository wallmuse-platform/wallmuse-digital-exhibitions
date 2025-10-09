// utils/environmentUtils.js

/**
 * Utility functions for managing environments and screens
 */

/**
 * Check if a screen is considered active/valid
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
 * Check if multiple environments are active
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
  const multipleActiveCheck = checkMultipleActiveEnvironments(environments);
  
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