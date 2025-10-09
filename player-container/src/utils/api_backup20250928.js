// api.js - Centralized API functions for Wallmuse application
// This file contains all web service calls to the Wallmuse backend

import axios from 'axios';
import { getUserId, getHouseId, setHouseId, createApiUrl } from "./Utils.js";
import qs from 'qs';
import { sendCommand } from "../wsTools";

// Base URLs for API calls
const baseURL = "https://wallmuse.com:8443/wallmuse/ws";
const RootUrl = 'https://manager.wallmuse.com:8444/wallmuse/ws/'; // From WsTools

// Get the session ID EXACTLY as it appears in the DOM (with spaces intact)
const sessionId = getUserId();
console.log('[api] Using session ID:', sessionId);

let all_screens = [];
export let main_house = 0;

/**
 * Custom parameter serializer that preserves spaces in session IDs
 * This is critical for complex session IDs with spaces
 */
const serializeParams = (params) => {
  // Special handling for the session parameter
  if (params.session) {
    // For the session parameter, we want to keep its exact format
    // For all other parameters, we use normal URL encoding
    const sessionParam = `session=${params.session}`;

    // Create the rest of the parameters normally
    const otherParams = Object.entries(params)
      .filter(([key]) => key !== 'session')
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');

    return otherParams ? `${sessionParam}&${otherParams}` : sessionParam;
  } else {
    // Fall back to normal serialization if no session parameter
    return Object.entries(params)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');
  }
};

//--------------------------------------------------------------------------
// GUEST ACCOUNT HANDLING
//--------------------------------------------------------------------------

/**
 * Checks if the current user is a guest account
 * @returns {boolean} True if the user is a guest, false otherwise
 */
export const isDemoAccount = () => {
  if (!sessionId) return false;
  return sessionId.includes('Unregistered') || sessionId.includes('freeaccount');
};

/**
 * Sends survey data to GA4 REST API for OOO2 domain
 * @param {string} ageResponse - 'yes', 'no', or 'na'
 * @param {string} operaResponse - 'yes', 'no', or 'na'
 * @param {string} domain - The domain identifier (e.g., 'ooo2')
 * @returns {Promise<boolean>} - True if successful, false otherwise
 */

export const sendSurveyToGA4 = (ageResponse, operaResponse, domain = 'ooo2') => {
  if (window.gtag) {
    // Send event with both parameters only if they were answered
    const eventParams = { 'domain': domain || 'ooo2' };

    // Only include responses that were explicitly selected (not 'na')
    if (ageResponse !== 'na') {
      eventParams['age_response'] = ageResponse;
    }

    if (operaResponse !== 'na') {
      eventParams['opera_experience'] = operaResponse;
    }

    // Send the event to GA4
    window.gtag('event', 'opera_survey_submission', eventParams);
    console.log('[api] Survey response sent to GA4:', eventParams);
    return true;
  } else {
    console.warn('[api] Google Analytics not detected');
    return false;
  }
};

/**
 * Sends survey data to WordPress REST API for OOO2 domain
 * @param {string} ageResponse - 'yes', 'no', or 'na'
 * @param {string} operaResponse - 'yes', 'no', or 'na'
 * @param {string} domain - The domain identifier (e.g., 'ooo2')
 * @returns {Promise<boolean>} - True if successful, false otherwise
 */
export const sendSurveyToWordPress = async (ageResponse, operaResponse, domain) => {
  try {
    // Get WordPress REST API URL and nonce
    const apiUrl = window.wpApiSettings?.root || '/wp-json/';
    const nonce = window.wpApiSettings?.nonce || '';

    // Prepare request with axios
    const response = await axios({
      method: 'POST',
      url: `${apiUrl}ooo2/v1/survey`,
      headers: {
        'Content-Type': 'application/json',
        'X-WP-Nonce': nonce
      },
      data: {
        age_response: ageResponse,
        opera_response: operaResponse,
        domain: domain,
        session: sessionId // Pass the session ID from your api.js
      }
    });

    console.log('[api] survey response:', response.data);
    return true;
  } catch (error) {
    console.error('[api] Error saving survey to WordPress:', error);
    return false;
  }
};

//--------------------------------------------------------------------------
// HOUSE MANAGEMENT
//--------------------------------------------------------------------------

/**
 * Creates a house for a user, unless one already exists
 * @param {string} userId - Optional user ID, defaults to current session ID
 * @returns {Promise<Object>} Result object with success status and house details
 *  FIXED: Properly handles session IDs with special characters
 */

export const createHouseForUser = async () => {
  const houseName = 'Main';

  try {
    console.log('[api] createHouseForUser called for session:', sessionId);

    // Skip house creation for guest accounts unless explicitly needed
    if (isDemoAccount(sessionId)) {
      console.log('[api] Guest account detected, checking if house creation is necessary');
      // Get the current house from the DOM or localStorage
      const existingHouseId = getHouseId();
      if (existingHouseId) {
        console.log(`[api] Guest account already has house ID: ${existingHouseId}`);
        return {
          success: true,
          houseId: existingHouseId,
          alreadyExists: true,
          isDemo: true
        };
      }
    }

    // Validate session ID
    if (!sessionId || typeof sessionId !== 'string') {
      console.error('[api] Invalid session ID:', sessionId);
      return { success: false, error: 'Invalid session ID' };
    }

    // FIXED: Construct URL with raw session ID
    const userUrl = `${baseURL}/get_wp_user?version=1&session=${sessionId}&anticache=${Date.now()}`;
    console.log('[api] Request URL (raw):', userUrl);

    // FIXED: Use raw URL string without params object
    const getUserResponse = await fetch(userUrl, {
      method: 'GET',
      headers: { 'Accept': 'text/x-json' }
    });

    const userData = await getUserResponse.json();
    console.log('[api] getUserResponse data:', userData);

    // Handle error responses
    if (userData?.tag_name === 'error') {
      console.error('[api] Error getting user info:', userData);//ERROR HERE
      return { success: false, error: userData };
    }

    // Extract user ID from response
    const userId = userData?.id;
    console.log('[api] userId:', userId);

    if (!userId) {
      console.error('[api] No user ID found in response');
      return { success: false, error: 'No user ID found' };
    }

    // Check if house already exists
    const existingHouse = Array.isArray(userData.houses) ?
      userData.houses.find(h => h.name === houseName) : null;

    if (existingHouse) {
      console.log(`[api] House already exists: ${houseName}, id: ${existingHouse.id}`);

      // Save the house ID to DOM and localStorage
      if (existingHouse.id) {
        setHouseId(existingHouse.id);
      }

      return {
        success: true,
        data: existingHouse,
        houseId: existingHouse.id,
        alreadyExists: true,
      };
    }

    // Create house using fetch for maximum control
    console.log(`[api] Creating new house for user ${userId}`);

    // FIXED: Construct add_house URL with raw session ID
    const addHouseUrl = `${baseURL}/add_house?version=1&user=${encodeURIComponent(userId)}&name=${encodeURIComponent(houseName)}&session=${sessionId}`;
    console.log('[api] Add house URL (raw):', addHouseUrl);

    const addHouseResponse = await fetch(addHouseUrl, {
      method: 'GET',
      headers: { 'Accept': 'text/x-json' }
    });

    const responseData = await addHouseResponse.json();
    console.log('[api] Add house response:', responseData);

    if (responseData?.tag_name === 'error') {
      console.error('[api] Error creating house:', responseData.message);
      return { success: false, data: responseData, houseId: null };
    }

    // If we got a house ID in the response, use it
    const newHouseId = responseData?.id || houseName;

    // Save the house ID to DOM and localStorage
    if (newHouseId) {
      setHouseId(newHouseId);
      console.log(`[api] New house created and saved with ID: ${newHouseId}`);
    }

    return {
      success: true,
      data: responseData,
      houseId: newHouseId
    };
  } catch (error) {
    console.error('[api] Exception during createHouseForUser:', error);
    return { success: false, error };
  }
};

/**
 * Gets the state of a house
 * @param {string|number} houseId - The house ID
 * @returns {Promise} - Promise resolving to the house state
 * 
 * WS: "/get_house_state", "int house, String key?, String session?"
 */
export const getHouseState = async (houseId) => {
  if (!houseId) {
    return null;
  }

  try {
    const response = await axios.get(`${baseURL}/get_house_state`, {
      headers: {
        Accept: 'text/x-json',
      },
      params: {
        version: 1,
        session: sessionId,
        house: houseId
      },
    });
    console.log('[api] get_house_state response:', response.data);
    return response.data;
  } catch (error) {
    console.error('[api] Error getting house state:', error);
    return null;
  }
};

/**
 * Sets autostart flag for a house and updates localStorage
 * @param {string|number} houseId - The house ID
 * @param {number} autostart - 1 to enable autostart, 0 to disable
 * @returns {Promise} - Promise resolving to the response
 */
export const setHouseAutostart = async (houseId, autostart = 1) => {
  if (!houseId) {
    console.error('[api] setHouseAutostart called without houseId');
    return { success: false, error: 'Missing houseId' };
  }

  try {
    console.log(`[api] Setting autostart=${autostart} for house: ${houseId}`);

    // Update localStorage immediately (optimistic update)
    localStorage.setItem('house_autostart', autostart ? '1' : '0');
    console.log(`[api] Updated localStorage house_autostart=${autostart ? '1' : '0'}`);

    const response = await axios.get(`${baseURL}/set_autostart`, {
      headers: {
        Accept: 'text/x-json',
      },
      params: {
        version: 1,
        session: sessionId,
        house: houseId,
        autostart: autostart
      },
    });

    console.log('[api] set_autostart response:', response.data);

    // If the API call was successful, confirm the localStorage update
    // This is actually redundant since we already set it, but it's good for clarity
    if (response.data) {
      localStorage.setItem('house_autostart', autostart ? '1' : '0');
    }

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('[api] Error setting house autostart:', error);

    // If the API call failed, revert the localStorage update
    // This assumes the previous value was the opposite of what we tried to set
    localStorage.setItem('house_autostart', autostart ? '0' : '1');
    console.log(`[api] Reverted localStorage house_autostart due to error`);

    return {
      success: false,
      error
    };
  }
};

//--------------------------------------------------------------------------
// ENVIRONMENT MANAGEMENT
//--------------------------------------------------------------------------

/**
 * Creates a default web player environment for a house
 * @param {string|number} houseId - The house ID
 * @returns {Promise} - Promise resolving to the API response
 * 
 * WS: "/add_environment", "int house?, String name, String keys, String key?, String session?"
 */
export const createDefaultEnvironment = async (houseId) => {
  try {
    console.log('[api] Creating web player environment for house:', houseId);

    // Create a web player environment name
    const environmentName = `Web player`;

    // Call the add_environment endpoint with web player configuration
    const response = await axios.get(`${baseURL}/add_environment`, {
      headers: {
        Accept: 'text/x-json',
      },
      params: {
        version: 1,
        house: houseId,
        name: environmentName,
        keys: environmentName,
        ip: '127.0.0.1', // Common value for web players
        session: sessionId
      }
    });

    console.log('[api] add_environment response:', response.data);

    // Check if the response indicates success
    if (response.data && response.data.tag_name === 'error') {
      console.error('[api] Error creating environment:', response.data.message);
      return { success: false, data: response.data };
    }

    return { success: true, data: response.data, environmentId: response.data.id };
  } catch (error) {
    console.error('[api] Error calling add_environment API:', error);
    return { success: false, error };
  }
};

/**
 * Removes an environment
 * @param {string|number} id - The environment ID to remove
 * @returns {Promise} - Promise resolving to the removal result
 * 
 * WS: "/del_environment", "int environ, String key?, String session?"
 */
export const removeEnvironment = async (id) => {
  checkString(id, 'api: id');

  console.log('api: removeEnvironment: sessionID', sessionId);
  console.log('api: removeEnvironment: id', id);

  try {
    const response = await axios.post(`${baseURL}/del_environment?version=1&session=${sessionId}&environ=${id}`, "", {
      headers: {
        Accept: 'text/x-json',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
    });

    console.log('api: removeEnvironment: response.data', response.data);
    return response.data;
  } catch (error) {
    console.error('[api] Error removing environment:', error);
    throw error;
  }
};

/**
 * Deactivate an environment (set alive to "0") using upd_environment
 * @param {string|number} environId - The environment ID to deactivate
 * @returns {Promise} - Promise resolving to the API response
 * 
 * WS: "/upd_environment", "int environ, String name?, String keys?, String key, String session?"
 */
export const deactivateEnvironment = async (environId) => {
  checkString(environId, 'api: environId');

  console.log('[api] deactivateEnvironment: sessionID', sessionId);
  console.log('[api] deactivateEnvironment: environId', environId);

  try {
    // Use upd_environment to set the environment as inactive
    const response = await axios.post(`${baseURL}/upd_environment`, null, {
      headers: {
        Accept: 'text/x-json',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      params: {
        version: 1,
        environ: environId,
        alive: '0',  // Set environment as inactive
        session: sessionId
      }
    });

    console.log('[api] deactivateEnvironment: response.data', response.data);
    return response.data;
  } catch (error) {
    console.error('[api] Error deactivating environment:', error);
    throw error;
  }
};

/**
 * Activate an environment (set alive to "1") using upd_environment
 * @param {string|number} environId - The environment ID to activate
 * @returns {Promise} - Promise resolving to the API response
 * 
 * WS: "/upd_environment", "int environ, String name?, String keys?, String key, String session?"
 */
export const activateEnvironment = async (environId) => {
  checkString(environId, 'api: environId');

  console.log('[api] activateEnvironment: sessionID', sessionId);
  console.log('[api] activateEnvironment: environId', environId);

  try {
    // Use upd_environment to set the environment as active
    const response = await axios.get(`${baseURL}/upd_environment`, {
      headers: {
        Accept: 'text/x-json'
      },
      params: {
        version: 1,
        environ: environId,
        alive: '1',  // Set environment as active
        session: sessionId
      }
    });

    console.log('[api] activateEnvironment: response.data', response.data);
    return response.data;
  } catch (error) {
    console.error('[api] Error activating environment:', error);
    throw error;
  }
};


/**
 * Update environment with new key and optionally activate it
 * @param {string|number} environId - The environment ID to update
 * @param {string} environmentKey - The new environment key (UUID format)
 * @param {boolean} activate - Whether to set alive to "1" (default: true)
 * @param {string} name - Optional new name for environment
 * @returns {Promise} - Promise resolving to the API response
 */

export const updateEnvironmentKey = async (environId, environmentKey, activate = true) => {
  checkString(environId, 'api: environId');
  checkString(environmentKey, 'api: environmentKey');

  console.log('[api] updateEnvironmentKey:', { environId, environmentKey, activate });

  try {
    const params = {
      version: 1,
      environ: environId,
              akey: environmentKey,  // CHANGED: keys → akey
      session: sessionId
    };

    if (activate) {
      params.alive = '1';
    }

    const response = await axios.get(`${baseURL}/upd_environment`, {
      headers: { Accept: 'text/x-json' },
      params: params,
      paramsSerializer: (params) => serializeParams(params)
    });

    console.log('[api] updateEnvironmentKey: response.data', response.data);
    
    if (response.data?.tag_name === 'error') {
      throw new Error(`Server error: ${response.data.message} (Code: ${response.data.code})`);
    }

    return response.data;
  } catch (error) {
    console.error('[api] Error updating environment key:', error);
    throw error;
  }
};

// ============================================================================
// ENHANCED VERSION: With Key Generation from Crypt Key
// ============================================================================

/**
 * Generate deterministic environment key from crypt_key
 * @param {string} cryptKey - The environment's crypt_key
 * @returns {string} - UUID format key derived from crypt_key
 */
const generateEnvironmentKeyFromCryptKey = (cryptKey) => {
  if (!cryptKey || cryptKey.length < 32) {
    throw new Error('Invalid crypt_key provided');
  }
  
  // Transform first 32 chars of crypt_key to UUID format
  const hex = cryptKey.substring(0, 32).toLowerCase();
  const uuid = [
    hex.substring(0, 8),
    hex.substring(8, 12),
    hex.substring(12, 16),
    hex.substring(16, 20),
    hex.substring(20, 32)
  ].join('-');
  
  console.log('[api] Generated environment key from crypt_key:', uuid);
  return uuid;
};

/**
 * Update environment with key derived from its crypt_key
 * @param {Object} environment - Environment object with id and crypt_key
 * @param {boolean} activate - Whether to activate the environment
 * @returns {Promise} - Promise resolving to the API response
 */
export const updateEnvironmentWithDeterministicKey = async (environment, activate = true) => {
  if (!environment || !environment.id || !environment.crypt_key) {
    throw new Error('Invalid environment object - missing id or crypt_key');
  }

  console.log('[api] updateEnvironmentWithDeterministicKey: environment', {
    id: environment.id,
    name: environment.name,
    hasCryptKey: !!environment.crypt_key
  });

  try {
    // Generate deterministic key from crypt_key
    const environmentKey = generateEnvironmentKeyFromCryptKey(environment.crypt_key);
    
    // Update environment with the new key
    const result = await updateEnvironmentKey(environment.id, environmentKey, activate);
    
    console.log('[api] updateEnvironmentWithDeterministicKey: success', {
      environId: environment.id,
      key: environmentKey,
      activated: activate
    });
    
    return {
      ...result,
      generatedKey: environmentKey  // Include the generated key in response
    };
    
  } catch (error) {
    console.error('[api] updateEnvironmentWithDeterministicKey: error', error);
    throw error;
  }
};


//--------------------------------------------------------------------------
// SCREEN MANAGEMENT
//--------------------------------------------------------------------------

/**
 * Creates a browser screen for an environment
 * @param {string|number} environId - The environment ID
 * @returns {Promise} - Promise resolving to the API response
 * 
 * WS: "/add_screen", "int environ, String name, String key?, String session?"
 */
/**
 * Creates a browser screen for an environment
 * @param {string|number} environId - The environment ID
 * @returns {Promise} - Promise resolving to the API response
 * 
 * WS: "/add_screen", "int environ, String name, String key?, String session?"
 */
export const createDefaultScreen = async (environId) => {
  try {
    console.log('[api] Creating browser screen for environment:', environId);

    // Get the user's screen dimensions
    const screenWidth = window.screen.width || 1920;
    const screenHeight = window.screen.height || 1080;

    // Create screen name
    const screenName = `Browser Screen (${screenWidth}x${screenHeight})`;

    // Create screen parameters
    const screenParams = JSON.stringify({
      width: screenWidth,
      height: screenHeight,
      type: 'web',
      browserScreen: true
    });

    console.log('[api] Screen parameters:', screenParams);

    // Call the add_screen endpoint
    const response = await axios.get(`${baseURL}/add_screen`, {
      headers: {
        Accept: 'text/x-json',
      },
      params: {
        version: 1,
        environ: environId,
        name: screenName,
        params: screenParams,
        enabled: 1,
        session: sessionId
      }
    });

    console.log('[api] add_screen response:', response.data);

    // Check if the response indicates success or is empty
    if (!response.data || Object.keys(response.data).length === 0) {
      console.log('[api] Screen creation returned empty response');
      // ws not RESTful
      return {
        success: false,
        data: response.data,
        error: 'Empty response received'
      };
    }

    if (response.data && response.data.tag_name === 'error') {
      console.error('[api] Error creating screen:', response.data.message);
      return {
        success: false,
        data: response.data
      };
    }

    // No ID returned but response seems successful
    if (!response.data.id) {
      console.warn('[api] Screen created but no ID returned:', response.data);
      return {
        success: true,
        data: response.data,
        screenId: null,
        warning: 'No screen ID returned'
      };
    }

    return {
      success: true,
      data: response.data,
      screenId: response.data.id
    };
  } catch (error) {
    console.log('[api] Error calling add_screen API:', error);
    return {
      success: false,
      error: error.message || 'Unknown error',
      data: null
    };
  }
};

/**
 * Activate screen with both enabled status and parameters
 * @param {string|number} screenId - The screen ID to activate
 * @param {number} [enabled=1] - Whether the screen is enabled (1) or disabled (0)
 * @param {object} [dimensions] - Screen dimensions, uses window size if not provided
 * @param {string} [sessionIdParam] - Optional session ID
 * @returns {Promise} - Promise resolving to the activation result
 */
export const activateScreenWithParams = async (screenId, enabled = 1, dimensions, sessionIdParam) => {
  const activeSessionId = sessionIdParam || sessionId;

  try {
    console.log('[api] activateScreenWithParams - screenId:', screenId);

    // First activate the screen
    await activateScreen(screenId, enabled, activeSessionId);

    // Get screen dimensions
    const screenWidth = dimensions?.width || window.screen.width || 1920;
    const screenHeight = dimensions?.height || window.screen.height || 1080;

    // Create screen parameters
    const screenParams = JSON.stringify({
      width: screenWidth,
      height: screenHeight,
      type: 'web',
      browserScreen: true,
      on: 1
    });

    // Update screen with parameters
    const response = await axios.get(`${baseURL}/upd_screen`, {
      headers: { Accept: 'text/x-json' },
      params: {
        version: 1,
        screen: screenId,
        params: screenParams,
        session: activeSessionId
      }
    });

    console.log('[api] Screen parameters update response:', response.data);

    // MODIFIED: Only set refresh flag if this is part of an account creation process
    const isAccountCreation = localStorage.getItem('accountJustCreated') === 'true' ||
      localStorage.getItem('activationInProgress') === 'true';

    if (isAccountCreation) {
      console.log('[api] Setting needsRefresh for account creation');
      localStorage.setItem('needsRefresh', 'true');
      window.dispatchEvent(new CustomEvent('screen-needs-refresh'));
    } else {
      console.log('[api] Routine screen activation - NOT setting refresh flag');
    }
    // Flag that we need a refresh
    // console.log('[api l.566] setItem(needsRefresh)');
    // localStorage.setItem('needsRefresh', 'true');
    // window.dispatchEvent(new CustomEvent('screen-needs-refresh'));

    return response.data;
  } catch (error) {
    console.error('[api] Error in activateScreenWithParams:', error);
    throw error;
  }
};

/**
 * Activate screen for an environment
 * @param {string|number} screenId - The screen ID
 * @param {number} enabled - Whether the screen is enabled (1) or disabled (0)
 * @param {string} [sessionIdParam] - Optional session ID (will use global sessionId if not provided)
 * @returns {Promise} - Promise resolving to the API response
 */

export const activateScreen = async (screenId, enabled = 1, sessionIdParam) => {
  const activeSessionId = sessionIdParam || sessionId;

  try {
    console.log('[api] activateScreen with screenId, enabled, sessionId:', screenId, enabled, activeSessionId);

    // Get the user's screen dimensions
    const screenWidth = window.screen.width || 1920;
    const screenHeight = window.screen.height || 1080;

    // Create screen parameters with dimensions and on status
    const screenParams = JSON.stringify({
      width: screenWidth,
      height: screenHeight,
      type: 'web',
      browserScreen: true,
      on: 1  // Explicitly set on status to 1
    });

    // Activate the screen with dimensions
    const response = await axios.get(`${baseURL}/upd_screen`, {
      headers: { Accept: 'text/x-json' },
      params: {
        version: 1,
        screen: screenId,
        enabled: parseInt(enabled, 10),
        params: screenParams,  // Include screen parameters
        session: activeSessionId
      }
    });

    console.log('[api] activateScreen response:', response.data);
    return response.data;
  } catch (error) {
    console.error('[api] Error activating screen:', error);
    throw error;
  }
};

/**
 * Deactivate screen (set on: 0) - keep it linked but turn it off
 * @param {string|number} screenId - The screen ID to deactivate
 * @param {string} [sessionIdParam] - Optional session ID (will use global sessionId if not provided)
 * @returns {Promise} - Promise resolving to the API response
 */
export const deactivateScreen = async (screenId, sessionIdParam) => {
  const activeSessionId = sessionIdParam || sessionId;

  try {
    console.log('[api] deactivateScreen with screenId, sessionId:', screenId, activeSessionId);

    // Simple screen parameters - just turn off
    const screenParams = JSON.stringify({
      on: 0  // Set screen as off (but keep it linked)
    });

    // Deactivate the screen (turn off but keep enabled/linked)
    const response = await axios.get(`${baseURL}/upd_screen`, {
      headers: { Accept: 'text/x-json' },
      params: {
        version: 1,
        screen: screenId,
        // enabled: keep current value (don't unlink)
        params: screenParams,  // Just set on: 0
        session: activeSessionId
      }
    });

    console.log('[api] deactivateScreen response:', response.data);
    return response.data;
  } catch (error) {
    console.error('[api] Error deactivating screen:', error);
    throw error;
  }
};

/**
 * Removes a screen
 * @param {string|number} id - The screen ID to remove
 * @returns {Promise} - Promise resolving to the removal result
 * 
 * WS: "/del_screen", "int screen, String key?, String session?"
 */
export const removeScreen = async (id) => {
  checkString(id, 'api: id');

  console.log('api: removeScreen function called');
  console.log('api: removeScreen: id', id);

  try {
    const response = await axios.post(`${baseURL}/del_screen?version=1&session=${sessionId}&screen=${id}`, "", {
      headers: {
        Accept: 'text/x-json',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
    });

    console.log('api: removeScreen: response.data', response.data);
    return response.data;
  } catch (error) {
    console.error('[api] Error removing screen:', error);
    throw error;
  }
};

/**
 * Sets the track screen for a montage
 * @param {string|number} montageId - The montage ID
 * @param {string|number} seq - The sequence number
 * @param {string|number} screenId - The screen ID
 * @param {string} session - The session ID
 * @returns {Promise} - Promise resolving to the result
 * 
 * WS: "/set_track_screen", "int montage?, int seq?, int track?, int screen, String key?, String session?"
 */
export const setTrackScreen = async (montageId, seq, screenId, session) => {
  let params = {
    version: 1,
    montage: montageId,
    seq: seq,
    screen: screenId,
    session: session,
  };

  console.info("Calling setTrackScreen: ", params);

  try {
    const response = await axios.post(`${baseURL}/set_track_screen`, "", {
      headers: {
        Accept: 'text/x-json',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      params
    });

    return response.data;
  } catch (error) {
    console.error("Error in setTrackScreen: ", error);
    throw error;
  }
};

//--------------------------------------------------------------------------
// USER MANAGEMENT
//--------------------------------------------------------------------------

/**
 * Creates a new user
 * @param {string} name - The user's name
 * @param {string} login - The user's login
 * @param {string} password - The user's password
 * @returns {Promise} - Promise resolving to the user data
 * 
 * WS: "/add_user", "String name, String login, String password"
 */
export const addUser = async (name, login, password) => {
  console.log(`[api] Creating user with name: ${name}, login: ${login}`);

  try {
    const response = await axios.post(`${baseURL}/add_user`, null, {
      headers: {
        Accept: 'text/x-json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      params: {
        version: 1,
        name,
        login,
        password,
      },
    });

    console.log('[api] User created successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('[api] Error creating user:', error);
    throw error;
  }
};

/**
 * Authenticate a user and get a valid session ID
 * @param {string} login - The user's login
 * @param {string} password - The user's password
 * @returns {Promise<string|null>} - Promise resolving to a valid session ID or null
 */
export const authenticateUser = async (login, password) => {
  try {
    console.log(`[api] Authenticating user: ${login}`);

    const response = await axios.get(`${baseURL}/get_user`, {
      headers: {
        Accept: 'text/x-json',
      },
      params: {
        version: 1,
        login: login,
        password: password
      }
    });

    console.log('[api] Authentication response:', response.data);

    if (response.data && response.data.id) {
      // User authenticated successfully
      const userId = response.data.id;
      const domain = response.data.domain.split(':')[0];
      const domainId = '8'; // Or extract from domain if possible

      // Generate a session ID based on the authenticated user
      const sessionId = `wp-${login}-${domainId}-${md5(userId + Date.now())}`;

      // Store the session ID
      localStorage.setItem('user_id', sessionId);

      console.log('[api] Generated valid session ID:', sessionId);
      return sessionId;
    }

    return null;
  } catch (error) {
    console.error('[api] Authentication error:', error);
    return null;
  }
};

/**
 * Gets the current user from the server
 * @returns {Promise} - Promise resolving to the user data
 * 
 * WS: "/get_joomla_user", "String session"
 */
export const getUser = async () => {
  try {
    const response = await axios.get(`${baseURL}/get_joomla_user`, {
      headers: {
        Accept: 'text/x-json',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache'
      },
      params: {
        version: 1,
        session: sessionId
      },
    });
    main_house = response.data.house;
    return response.data;
  } catch (error) {
    console.error('[api] Error getting user:', error);
    throw error;
  }
};

/**
 * Gets detailed user information including houses and environments
 * @param {number|undefined} anticache - Optional cache busting parameter
 * @returns {Promise} - Promise resolving to the detailed user data
 * 
 * WS: "/get_wp_user", "String session"
 */
export const detailsUser = async (anticache) => {

  try {
    anticache = anticache || Date.now();

    // Construct URL manually to check what it looks like
    const url = `${baseURL}/get_wp_user?version=1&session=${encodeURIComponent(sessionId)}&anticache=${anticache}`;
    console.log('[Api] Calling URL:', url);

    const response = await axios.get(url, {
      headers: {
        Accept: 'text/x-json',
      }
    });


    console.log('[Api] detailsUser Response:', response);
    const data = response.data;

    if (!data) {
      console.error('[Api] detailsUser: Unexpected response data:', data);
      throw new Error('[Api] detailsUser: User account data is missing');
    }

    let account, house, environments;
    if (data.houses && data.houses.length > 0) {
      house = data.houses[0].name;
    } else {
      console.log('data.houses is undefined or not an array');
    }

    if (data.houses && data.houses[0]) {
      account = data.name;
      console.log('[Api] detailsUser data.houses:', data.houses);
      console.log('[Api] detailsUser house:', house);
      environments = data.houses[0].environments;
      console.log('[Api] detailsUser environments:', environments);
    }

    let screens = [];
    if (Array.isArray(environments)) {
      screens = environments.flatMap(env => env.screens);
    }

    console.log('[Api] detailsUser Returning data get_wp_user:', { account, house, environments, screens });
    return { data, account, house, environments, screens };
  } catch (error) {
    console.error('[Api] detailsUser Error fetching user details:', error);
    throw error;
  }
};


/**
 * Gets the guest account session ID for a given domain
 * @param {string} domain - The domain number
 * @returns {string} - The guest account session ID
 */
export function getDomainGuestAccountId(domain) {
  const domainGuestMap = {
    "1": "wp-freeaccount-1-9360c44751f327c087cf9c030ffa58d1", // WallMuse and ShareX
    "8": "wp-Unregistered-8-0220ca51e4e92392300619067deb19ee" // OOO2
  };

  const stringDomain = String(domain);
  const guestId = domainGuestMap[stringDomain];

  if (!guestId) {
    console.warn(`[api] No guest session found for domain ${domain}, defaulting to WallMuse`);
  }

  return guestId || domainGuestMap["1"];
}

//--------------------------------------------------------------------------
// PLAYLIST MANAGEMENT
//--------------------------------------------------------------------------

/**
 * Gets playlists for the current user
 * @returns {Promise} - Promise resolving to the playlists
 * 
 * WS: "/get_playlists", "int user?, String key?, String session?"
 */
export const getPlaylists = async () => {
  console.log('getPlaylists: Sending request');

  try {
    const response = await axios.get(`${baseURL}/get_playlists`, {
      headers: {
        Accept: 'text/x-json',
      },
      params: {
        version: 1,
        session: sessionId,
      },
    });

    if (response.data["playlists"]) {
      return response.data["playlists"].sort((a, b) => {
        // Move playlists without IDs to the end
        if (!a.id) return 1;
        if (!b.id) return -1;

        return (a.id < b.id ? 1 : a.id > b.id ? -1 : 0);
      });
    } else {
      return [];
    }
  } catch (error) {
    console.error('Error fetching playlists:', error);
    return [];
  }
};

/**
 * Gets a specific playlist by ID
 * @param {string|number} playlistId - The playlist ID
 * @returns {Promise} - Promise resolving to the playlist
 */
export const getPlaylistById = async (playlistId) => {
  console.log(`[api] Fetching playlist with ID ${playlistId}`);

  try {
    const response = await axios.get(`${baseURL}/get_playlists`, {
      headers: {
        Accept: 'text/x-json',
      },
      params: {
        version: 1,
        session: sessionId
      },
    });

    console.log('[api] playlist: Server response:', response.data);

    const playlists = response.data.playlists;
    console.log('[api] playlist: Found playlists:', playlists);

    let playlist;
    for (let i = 0; i < playlists.length; i++) {
      const id = playlists[i].id;
      console.log('[api] playlist: Playlist ${i} ID: ${id}', `Playlist ${i} ID: ${id}`);

      if (id == playlistId || (!id && !playlistId)) {
        playlist = playlists[i];
        break;
      }
    }

    if (!playlist) {
      throw new Error(`playlist: Playlist with ID ${playlistId} not found`);
    }

    console.log('[api] playlist: Fetched playlist:', playlist);
    return playlist;
  } catch (error) {
    console.error('[api] Error fetching playlist by ID:', error);
    throw error;
  }
};

/**
 * Creates a new playlist
 * @param {string} name - The playlist name
 * @returns {Promise} - Promise resolving to the created playlist
 * 
 * WS: "/add_playlist", "int user?, String name, String key?, String session?"
 */
export const addPlaylist = async name => {
  console.info("Adding a playlist:", name);

  try {
    return await axios.post(`${baseURL}/add_playlist`, null,
      {
        headers: {
          Accept: 'text/x-json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        params: {
          version: 1,
          session: sessionId,
          name,
        }
      });
  } catch (error) {
    console.error('[api] Error adding playlist:', error);
    throw error;
  }
};

/**
 * Updates a playlist
 * @param {string|number} playlistId - The playlist ID
 * @param {string} name - The playlist name
 * @param {string} montageIds - Comma-separated list of montage IDs
 * @param {string} checks - Comma-separated list of check values
 * @returns {Promise} - Promise resolving to the update result
 * 
 * WS: "/upd_playlist", "int user?, int playlist?, String name?, int random?, String montages?, String checks?, String key?, String session?"
 */
export const updatePlaylist = async (playlistId, name, montageIds, checks) => {
  let params = {
    version: 1,
    session: sessionId,
  };

  console.log("[api] updatePlaylist, before updatePlaylist call - Montages:", montageIds, "Type:", typeof montageIds);

  // Build params based on input
  if (playlistId) {
    params = { ...params, playlist: playlistId };
  }
  if (name) {
    params = { ...params, name };
  }

  // Here's where you log the type and content before processing
  console.log("[api] updatePlaylist, before processing montages, Type:", typeof montageIds, "Value:", montageIds);

  if (montageIds) {
    params = { ...params, montages: montageIds };
  }

  if (checks !== undefined) { // Only include checks if it's not undefined
    params = { ...params, checks };
  }

  // Log the full parameter object before making the API call
  console.info("[api] updatePlaylist with params:", params);

  try {
    const response = await axios.post(`${baseURL}/upd_playlist`, qs.stringify(params, { arrayFormat: 'repeat' }), {
      headers: {
        Accept: 'text/x-json',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
      },
    });

    // Log the API response to understand what the server is returning
    console.log('[api] updatePlaylist: Response:', response);
    return response;
  } catch (error) {
    console.error('[api] updatePlaylist: Error updating playlist:', error);
    throw error;
  }
};

/**
 * Adds a montage to a playlist
 * @param {object} montage - The montage to add
 * @param {string|number} playlistId - The playlist ID
 * @param {Array} playlists - The current playlists array
 * @param {Function} setPlaylists - Function to update playlists state
 * @returns {Promise} - Promise resolving to the update result
 */
export const addMontageToPlaylist = async (montage, playlistId = '', playlists, setPlaylists) => {
  console.log('addMontageToPlaylist called with:', montage, playlistId, playlists);

  try {
    // Ensure the montage properties are standardized
    const standardizedMontage = {
      ...montage,
      tracks_count: montage.tracks_count || montage.tracks,
      is_checked: montage.is_checked || '1',
    };

    const newPlaylists = [...playlists];

    let playlistToUpdate;

    if (playlistId) {
      // If playlistId is provided, find the corresponding playlist
      playlistToUpdate = newPlaylists.find(playlist => playlist.id === playlistId);
      if (!playlistToUpdate) {
        console.error(`Playlist with ID ${playlistId} not found; cannot proceed.`);
        return;
      }
    } else {
      // If no playlistId, fall back to the default playlist (i.e., the one with undefined ID)
      playlistToUpdate = newPlaylists.find(playlist => !playlist.id);
      if (!playlistToUpdate) {
        console.error("Default playlist not found; cannot proceed.");
        return;
      }
    }

    // Initialize montages array if not already present
    if (!playlistToUpdate.montages) {
      playlistToUpdate.montages = [];
    }

    // Add the montage to the playlist
    playlistToUpdate.montages.push(standardizedMontage);
    playlistToUpdate.changed = true;

    // Update the state with the modified playlists array
    setPlaylists(newPlaylists);

    // Prepare montage IDs and checks for server update
    const montageIds = playlistToUpdate.montages.map(m => m.id).join(',');
    console.log("[api] updatePlaylist, before processing montages, Type:", typeof montageIds, "Value:", montageIds);
    const checks = playlistToUpdate.montages.map(m => m.is_checked ? 1 : 0).join(',');

    // Send the updated playlist to the server
    await updatePlaylist(playlistToUpdate.id, playlistToUpdate.name, montageIds, checks);
    console.log('[api] updatePlaylist called for:', playlistToUpdate);

    return { success: true };
  } catch (error) {
    console.error('[api] Error adding montage to playlist:', error);
    return { success: false, error };
  }
};

/**
 * Removes a montage from a playlist
 * @param {string|number} playlistId - The playlist ID
 * @param {string|number} montageIdToRemove - The montage ID to remove
 * @returns {Promise} - Promise resolving to the removal result
 */
export const deleteMontageFromPlaylist = async (playlistId, montageIdToRemove) => {
  try {
    console.log(`Deleting montage ${montageIdToRemove} from playlist ${playlistId}`);

    // Fetch the current playlist
    const playlist = await getPlaylistById(playlistId);
    console.log('playlist: Fetched playlist:', playlist);

    // Get the IDs of the montages that are not the one to be removed
    const montageIdsToKeep = playlist.montages
      .filter(montage => montage.id !== montageIdToRemove)
      .map(montage => montage.id);

    // Call the upd_playlist endpoint with the montage IDs to keep
    const response = await axios.post(`${baseURL}/upd_playlist`, null, {
      headers: {
        Accept: 'text/x-json',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      params: {
        version: 1,
        session: sessionId,
        playlist: playlistId,
        montages: montageIdsToKeep.join(','),
      }
    });

    if (response.status === 200) {
      console.log(`[api] playlist: Montage ${montageIdToRemove} deleted from playlist ${playlistId} successfully.`);
      return { success: true };
    } else {
      console.error(`[api] playlist: Failed to delete montage ${montageIdToRemove} from playlist ${playlistId}. Status code: ${response.status}`);
      return { success: false, error: `Status code: ${response.status}` };
    }
  } catch (error) {
    console.error(`[api] playlist: Failed to delete montage ${montageIdToRemove} from playlist ${playlistId}.`, error);
    return { success: false, error };
  }
};

/**
 * Deletes a playlist
 * @param {string|number} playlistId - The playlist ID to delete
 * @returns {Promise} - Promise resolving to the deletion result
 * 
 * WS: "/del_playlist", "int user?, int playlist?, String key?, String session?"
 */
export const deletePlaylist = async (playlistId) => {
  try {
    const response = await axios.post(`${baseURL}/del_playlist`, qs.stringify({
      version: 1,
      session: sessionId,
      playlist: playlistId
    }), {
      headers: {
        Accept: 'text/x-json',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
    });

    if (response.status === 200) {
      console.log(`[api deletePlaylist] Playlist ${playlistId} deleted successfully.`);
      return { success: true, response };
    } else {
      console.error(`[api deletePlaylist] Failed to delete playlist ${playlistId}. Status code: ${response.status}`);
      return { success: false, error: `Status code: ${response.status}`, response };
    }
  } catch (error) {
    console.error(`[api deletePlaylist] Failed to delete playlist ${playlistId}.`, error);
    return { success: false, error };
  }
};

/**
 * Gets the default playlist
 * @returns {Promise} - Promise resolving to the default playlist and montage IDs
 */
export const getDefaultPlaylist = async () => {
  try {
    const playlists = await getPlaylists();

    // Find the primary playlist (undefined id/name signifies default)
    const defaultPlaylist = playlists.find(playlist => !playlist?.id);

    // Map the array of montages to an array of montage IDs
    const montageIds = defaultPlaylist?.montages?.map(montage => montage.id) || [];

    return {
      defaultPlaylist,
      montageIds,
    };
  } catch (error) {
    console.error('[api] Error getting default playlist:', error);
    return { defaultPlaylist: null, montageIds: [] };
  }
};

/**
 * Loads a playlist
 * @param {string|number} house - The house ID
 * @param {string|number} playlist - The playlist ID
 * @returns {Promise} - Promise resolving to the load result
 */
export const loadPlaylist = async (house, playlist) => {
  let params = {
    version: 1,
    session: sessionId,
    house,
    anticache: Date.now() // Ensure uniqueness
  };

  if (playlist) {
    params = { ...params, playlist };
  }

  console.info("Loading playlist: ", params);

  try {
    return await axios.post(`${baseURL}/load_playlist`,
      "", {
      headers: {
        Accept: 'text/x-json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache'
      },
      params
    });
  } catch (error) {
    console.error('[api] Error loading playlist:', error);
    throw error;
  }
};

/**
 * Refreshes the current playlist from the backend
 * @returns {Promise} - Promise resolving to the current playlist ID
 */
export const refeshBackendCurrentPlaylist = async () => {
  try {
    const anticache = Date.now();
    console.log('[Api] refreshBackendCurrentPlaylist: Fetching with anticache:', anticache);

    const response = await axios.get(`${baseURL}/get_wp_user`, {
      headers: {
        Accept: 'text/x-json',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache'
      },
      params: {
        version: 1,
        session: sessionId,
        anticache: anticache
      },
    });

    // Extract data consistently
    const accountName = response.data.name;
    const refreshedBackendCurrentPlaylist = response.data.houses?.[0]?.current_playlist || undefined;

    console.log('[Api] refreshBackendCurrentPlaylist: Result', {
      account: accountName,
      currentPlaylist: refreshedBackendCurrentPlaylist,
      houseId: response.data.houses?.[0]?.id
    });

    return refreshedBackendCurrentPlaylist;
  } catch (error) {
    console.error('[Api] refreshBackendCurrentPlaylist: Error:', error);
    throw error;
  }
};

/**
 * Copies all playlists from domain's guest account to the current user
 * @param {string} domain - The domain number
 * @param {string} targetSessionId - The session ID of the user receiving the playlists
 * @param {string|number} houseId - The house ID of the target user
 * @returns {Promise} - Promise resolving to the copying result
 */

export const copyGuestPlaylistsToUser = async (domain, targetSessionId, houseId) => {
  try {
    // Get the guest account ID for this domain
    const guestSessionId = getDomainGuestAccountId(domain);
    console.log(`[api] Copying playlists from guest account ${guestSessionId} to user ${targetSessionId}`);

    // Get playlists from guest account
    const response = await axios.get(`${baseURL}/get_playlists`, {
      headers: {
        Accept: 'text/x-json',
      },
      params: {
        version: 1,
        session: guestSessionId
      },
    });

    const templatePlaylists = response.data.playlists || [];
    console.log('[api] Guest account playlists:', templatePlaylists);

    const results = [];

    // Process all playlists including the default one (with no ID)
    for (const templatePlaylist of templatePlaylists) {
      const isDefault = !templatePlaylist.id;

      let targetPlaylistId;
      let playlistName = templatePlaylist.name || "";

      // For the default playlist, we don't need to create a new one
      // For named playlists, we need to create them first
      if (isDefault) {
        console.log('[api] Processing default playlist');
        // Default playlist - no need to create, it already exists
        targetPlaylistId = undefined;
      } else {
        console.log('[api] Cloning named playlist:', playlistName);

        // Create a new playlist for the target user
        const newPlaylistResponse = await axios.post(`${baseURL}/add_playlist`, null, {
          headers: {
            Accept: 'text/x-json',
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          params: {
            version: 1,
            session: targetSessionId,
            name: playlistName,
          }
        });

        if (!newPlaylistResponse.data || !newPlaylistResponse.data.id) {
          console.error(`[api] Failed to create playlist ${playlistName}`);
          results.push({
            original: templatePlaylist,
            success: false,
            error: 'Failed to create playlist'
          });
          continue; // Skip to next playlist
        }

        targetPlaylistId = newPlaylistResponse.data.id;
        console.log('[api] Created new playlist with ID:', targetPlaylistId);
      }

      // Extract montages from template playlist
      if (Array.isArray(templatePlaylist.montages) && templatePlaylist.montages.length > 0) {
        const montageIds = templatePlaylist.montages.map(m => m.id).join(',');
        const checks = templatePlaylist.montages.map(m => m.is_checked ? 1 : 0).join(',');

        // Prepare params - for default playlist, omit playlist ID and name
        const params = {
          version: 1,
          session: targetSessionId,
          montages: montageIds,
          checks: checks
        };

        // Add playlist ID and name only for non-default playlists
        if (!isDefault) {
          params.playlist = targetPlaylistId;
          params.name = playlistName;
        }

        // Update the playlist with montages
        await axios.post(`${baseURL}/upd_playlist`, null, {
          headers: {
            Accept: 'text/x-json',
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          params: params
        });

        console.log(`[api] Added ${templatePlaylist.montages.length} montages to ${isDefault ? 'default playlist' : 'playlist ' + targetPlaylistId}`);

        results.push({
          original: templatePlaylist,
          newId: targetPlaylistId,
          isDefault: isDefault,
          success: true,
          montageCount: templatePlaylist.montages.length
        });
      } else {
        console.warn(`[api] No montages found for ${isDefault ? 'default playlist' : 'playlist ' + playlistName}`);
        results.push({
          original: templatePlaylist,
          newId: targetPlaylistId,
          isDefault: isDefault,
          success: true,
          montageCount: 0
        });
      }
    }

    return {
      success: true,
      results,
      message: `Copied ${results.filter(r => r.success).length} playlists from guest account`
    };
  } catch (error) {
    console.error('[api] Error copying guest playlists:', error);
    return { success: false, error: error.message };
  }
};

//--------------------------------------------------------------------------
// MONTAGE MANAGEMENT
//--------------------------------------------------------------------------

/**
 * Gets categories from the server
 * @returns {Promise} - Promise resolving to categories
 * 
 * WS: "/get_categories", "String session"
 */
export const getCategories = async () => {
  try {
    const response = await axios.get(`${baseURL}/get_categories`, {
      headers: {
        Accept: 'text/x-json',
      },
      params: {
        version: 1,
        session: sessionId
      },
    });
    return response.data["categorys"] ? response.data["categorys"] : [];
  } catch (error) {
    console.error('[api] Error getting categories:', error);
    return [];
  }
};

/**
 * Gets a montage by ID
 * @param {string|number} montageId - The montage ID
 * @param {object} house - The house object
 * @returns {Promise} - Promise resolving to the montage data
 * 
 * WS: "/load_montage", "int montage, int house, String key?, String session?"
 */
export const getMontageById = async (montageId, house) => {
  console.log('[api] getMontageById called with ID:', montageId, 'and House:', house);

  if (!house) {
    console.error('[api] getMontageById: No house defined.');
    return;
  }

  try {
    const response = await axios.post(`${baseURL}/load_montage`, {
      version: 1,
      session: sessionId,
      montage: montageId,
      house: house.id,
      display: 1
    });

    console.log('[api] loadMontage: Response from loadMontage:', response);

    if (response.data) {
      console.log('[api] loadMontage: response data exists, proceeding to setTrackScreen with data', response.data);

      const trackResponse = await axios.post(`${baseURL}/set_track_screen`, {
        version: 1,
        session: sessionId,
        montage: montageId,
        screen: all_screens,
        seq: 1
      });

      console.log('[api] Response from setTrackScreen:', trackResponse);

      if (trackResponse.data) {
        console.log('[api] trackResponse data:', trackResponse.data);
      } else {
        console.log('[api] No data received from setTrackScreen');
      }
    } else {
      console.log('[api] No data received from loadMontage, not proceeding to setTrackScreen');
    }

    return response.data ? response.data : [];
  } catch (error) {
    console.error('[api] Error in getMontageById:', error);
    throw error;
  }
};

/**
 * Loads montages by ID
 * @param {string|number} id - The montage ID
 * @param {string|number} house - The house ID
 * @returns {Promise} - Promise resolving to the montage data
 */
export const loadMontages = async (id, house) => {
  console.log('Calling loadMontages with ID:', id, 'and House:', house);

  try {
    const response = await axios.get(`${baseURL}/load_montage`, {
      headers: {
        Accept: 'text/x-json',
      },
      params: {
        version: 1,
        session: sessionId,
        montage: id,
        house: house,
        display: 1
      },
    });

    console.log('[api] loadMontage: Response from loadMontage:', response);

    if (response.data) {
      console.log('[api] loadMontage: response data exists, proceeding to setTrackScreen with response.data', response.data);

      console.log('[api] loadMontage: Preparing to call setTrackScreen with:', {
        session: sessionId,
        montage: id,
        screen: all_screens,
        seq: 1,
      });

      const trackResponse = await axios.get(`${baseURL}/set_track_screen`, {
        headers: {
          Accept: 'text/x-json',
        },
        params: {
          version: 1,
          session: sessionId,
          montage: id,
          screen: all_screens,
          seq: 1,
        },
      });

      console.log('[api] Response from setTrackScreen:', trackResponse);

      if (trackResponse.data) {
        console.log('[api] trackResponse data:', trackResponse.data);
      } else {
        console.log('[api] No data received from setTrackScreen');
      }
    } else {
      console.log('[api] No data received from loadMontage, not proceeding to setTrackScreen');
    }

    return response.data ? response.data : [];
  } catch (error) {
    console.error('[api] Error in loadMontages:', error);
    throw error;
  }
};

/**
 * Searches for montages
 * @param {object} params - Search parameters
 * @returns {Promise} - Promise resolving to matching montages
 * 
 * WS: "/search_montages_full", various search parameters
 */
export const searchMontages = async (author, author_fn, author_id, authors, best_description, best_name, cdate, croppable, deconstructable, descriptions, duration, id, interactive, language, mdate, name, orientation, rating, resolution, sd_height, sd_width, selectable, seq_count, splittable, tag_name, thumbnail_url, tracks, uhd, video_3d, commercial) => {
  try {
    const response = await axios.get(`${baseURL}/search_montages_full`, {
      headers: {
        Accept: 'text/x-json',
      },
      params: {
        version: 1,
        session: sessionId,
        display: 1,
        descriptions: descriptions,
        commercial: commercial,
        splittable: splittable,
        deconstructable: deconstructable,
        orientation: orientation,
        uhd: uhd,
      },
    });

    return typeof response.data.montages === 'undefined' ? [] : response.data.montages;
  } catch (error) {
    console.error('[api] Error searching montages:', error);
    return [];
  }
};

/**
 * Gets all montages with pagination
 * @param {number} page - The page number
 * @param {number} size - The page size
 * @returns {Promise} - Promise resolving to montages
 * 
 * WS: "/get_all_montages_full", "int page, int page_size, String session"
 */
export const getAllMontagesFull = async (page, size) => {
  try {
    const response = await axios.get(`${baseURL}/get_all_montages_full`, {
      headers: {
        Accept: 'text/x-json',
      },
      params: {
        version: 1,
        session: sessionId,
        page: page,
        page_size: size,
      },
    });

    return typeof response.data.montages === 'undefined' ? [] : response.data.montages;
  } catch (error) {
    console.error('[api] Error getting all montages:', error);
    return [];
  }
};

//--------------------------------------------------------------------------
// COMMAND MANAGEMENT
//--------------------------------------------------------------------------

/**
 * Sends a command to a house
 * @param {string} command - The command to send
 * @param {string|number} house - The house ID
 * @returns {Promise} - Promise resolving to the command result
 * 
 * WS: "/send_command", "String command, int house, String session"
 */
export const sendCommandToHouse = async (command, house) => {
  if (!house) {
    throw new Error('[sendCommandToHouse] House ID is null or undefined.');
  }

  console.log(`[api] Sending command: ${command} to house: ${house}`);

  try {
    const result = await fetch(`${RootUrl}send_command?version=2&session=${sessionId}&house=${house}&command=${encodeURIComponent(command)}`);
    const text = await result.text();

    // Check for error markers in the response
    if (text.trim().startsWith('<error')) {
      console.error('[api] Command failed:', text);
      return { success: false, error: text };
    }

    console.log('[api] Command succeeded:', text);
    return { success: true, response: text };
  } catch (error) {
    console.error('[api] Error sending command:', error);
    return { success: false, error: error.message };
  }
};

//--------------------------------------------------------------------------
// PLAYLIST COPY FUNCTIONS
//--------------------------------------------------------------------------

/**
 * Copies playlists from a source user to the current user
 * @param {string} sourceUserId - The source user ID to copy playlists from
 * @returns {Promise} - Promise resolving to the copied playlists
 */
export const copyPlaylistsFromUser = async (sourceUserId) => {
  try {
    // 1. Get playlists from source user
    console.log('[api] Copying playlists from user:', sourceUserId);

    const response = await axios.get(`${baseURL}/get_playlists`, {
      headers: {
        Accept: 'text/x-json',
      },
      params: {
        version: 1,
        session: sourceUserId
      },
    });

    const sourcePlaylists = response.data.playlists || [];
    console.log('[api] Source playlists:', sourcePlaylists);

    // 2. Create each playlist for current user
    const results = [];
    for (const playlist of sourcePlaylists) {
      // Skip the default playlist
      if (!playlist.id) {
        console.log('[api] Skipping default playlist');
        continue;
      }

      console.log('[api] Copying playlist:', playlist.name);

      // Create new playlist with the same name
      const newPlaylistResponse = await addPlaylist(playlist.name);

      if (newPlaylistResponse.data && newPlaylistResponse.data.id) {
        const newPlaylistId = newPlaylistResponse.data.id;

        // Get montage IDs from original playlist
        const montageIds = (playlist.montages || [])
          .map(montage => montage.id)
          .join(',');

        // Get checks from original playlist
        const checks = (playlist.montages || [])
          .map(montage => montage.is_checked ? 1 : 0)
          .join(',');

        // Update new playlist with montages from original
        const updateResponse = await updatePlaylist(
          newPlaylistId,
          playlist.name,
          montageIds,
          checks
        );

        results.push({
          original: playlist,
          copied: updateResponse.data,
          success: true
        });
      } else {
        results.push({
          original: playlist,
          success: false,
          error: 'Failed to create playlist'
        });
      }
    }

    return {
      success: true,
      results
    };
  } catch (error) {
    console.error('[api] Error copying playlists:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Function to check if string is null or undefined
 * @param {string} arg - The string to check
 * @param {string} functionName - The name of the function for logging
 */
function checkString(arg, functionName) {
  if (arg === null || arg === undefined) {
    console.error(functionName + ': argument is null');
  }
}

// Export any variables needed elsewhere
export { sessionId };