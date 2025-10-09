// Utils.js

export const rootElementId = "root";
export const rootElement = document.getElementById(rootElementId);

export const wmm_url = window.location.origin;
console.log('[Utils] wmm_url:', wmm_url); // Should log the current domain (e.g., https://wallmuse.com)

/**
 * Gets the user ID from the DOM or URL params
 * IMPORTANT: Preserves the original format exactly as it is in the DOM
 * 
 * @returns {string|null} The user ID or null if not found
 */
export const getUserId = () => {
  // Get the raw userID from the DOM attribute or URL
  const rawUserId = rootElement.dataset.user || 
                    new URLSearchParams(window.location.search).get("user");
  
  // If no userId found, return null
  if (!rawUserId) return null;
  
  // For debugging: Log the HTML attribute to see exactly what's in the DOM
  if (rootElement.dataset.user) {
    console.log("[Utils] DOM dataset full:", JSON.stringify(rootElement.dataset));
  }
  
  // Store the original ID for later use (important!)
  localStorage.setItem('wp_original_session_id', rawUserId);
  
  // Also store a version with spaces replaced by dots (for debugging only)
  if (rawUserId.includes(' ')) {
    const normalizedId = rawUserId.replace(/\s+/g, '.');
    console.log("[Utils] Normalized version (spaces→dots):", normalizedId);
    localStorage.setItem('wp_normalized_session_id', normalizedId);
  }
  
  // CRITICAL: Always return the original, unmodified ID from the DOM
  // The WordPress server expects the exact original format with spaces
  return rawUserId;
};

/**
 * Gets the house ID from DOM dataset or localStorage
 * @returns {string|null} The house ID or null if not found
 */
export const getHouseId = () => {
  // First try to get from DOM dataset
  const houseId = rootElement.dataset.house || null;
  
  console.log("[Utils] House ID from DOM:", houseId);
  
  // If found in DOM, update localStorage
  if (houseId) {
    localStorage.setItem('current_house_id', houseId);
    return houseId;
  }
  
  // If not in DOM, try localStorage
  return localStorage.getItem('current_house_id') || null;
};

/**
 * Sets the house ID in both DOM dataset and localStorage
 * @param {string} houseId - The house ID to set
 */
export const setHouseId = (houseId) => {
  if (!houseId) return;
  
  console.log("[Utils] Setting house ID:", houseId);
  
  // Update DOM dataset
  if (rootElement) {
    rootElement.dataset.house = houseId;
    console.log("[Utils] DOM updated. New house value:", rootElement.dataset.house);
    console.log("[Utils] Full DOM dataset:", JSON.stringify(rootElement.dataset));
  }
  
  // Update localStorage
  localStorage.setItem('current_house_id', houseId);
  
  // Dispatch custom event to notify other components
  window.dispatchEvent(new CustomEvent('houseIdUpdated', { detail: { houseId } }));
};

/**
 * Gets the original, unmodified session ID for API calls
 * This is important as WordPress expects the exact format with spaces
 */
export const getOriginalSessionId = () => {
  return localStorage.getItem('wp_original_session_id') || getUserId();
};

/**
 * Creates a URL with the session ID properly preserved (not URL encoded)
 * @param {string} endpoint - API endpoint
 * @param {object} params - URL parameters including session
 * @returns {string} Properly formatted URL
 */
export const createApiUrl = (endpoint, params) => {
  // Start with endpoint
  let url = endpoint.startsWith('http') ? endpoint : `${wmm_url}${endpoint}`;
  
  // Add query parameters
  if (params && Object.keys(params).length > 0) {
    const queryParts = [];
    
    // Add each parameter
    for (const [key, value] of Object.entries(params)) {
      // Special handling for session to preserve spaces
      if (key === 'session') {
        queryParts.push(`${encodeURIComponent(key)}=${value}`);
      } else {
        queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
      }
    }
    
    // Join parts and add to URL
    return `${url}?${queryParts.join('&')}`;
  }
  
  return url;
};

/**
 * Helper function for debugging session ID issues
 * Logs all versions of the session ID
 */
export const debugSessionId = () => {
  const original = localStorage.getItem('wp_original_session_id');
  const normalized = localStorage.getItem('wp_normalized_session_id');
  const current = getUserId();
  const houseId = getHouseId();
  
  console.group('Session ID Debug Information');
  console.log('Original (with spaces):', original);
  console.log('Normalized (dots):', normalized);
  console.log('Current (from getUserId):', current);
  console.log('House ID:', houseId);
  console.groupEnd();
  
  return {
    original,
    normalized,
    current,
    houseId
  };
};

// Helper function to get WordPress login status
export function getWpLoggedIn() {
  return rootElement?.dataset?.wpLoggedIn === 'true';
}

// Original function - checks if userId indicates a demo account
export function isBasicDemoAccount(userId) {
  if (!userId) return false;
  const id = userId.toLowerCase();
  console.log('[utils] id.includes free || unregistered', (id.includes('free') || id.includes('unregistered')));
  return id.includes('free') || id.includes('unregistered');
}

// New function - checks if user should be treated as demo (considers WP login)
export function shouldShowDemoMode(userId) {
  const isDemo = isBasicDemoAccount(userId);
  const wpLoggedIn = getWpLoggedIn();
  
  console.log('[utils] shouldShowDemoMode - isDemo:', isDemo, 'wpLoggedIn:', wpLoggedIn);
  
  // Show demo mode only if user is demo AND not logged into WordPress
  return isDemo && !wpLoggedIn;
}

// Modified isDemoAccount to be WordPress-aware
export function isDemoAccount(userId) {
  if (!userId) return false;
  const id = userId.toLowerCase();
  const isBasicDemo = id.includes('free') || id.includes('unregistered');
  const wpLoggedIn = getWpLoggedIn();
  
  console.log('[utils] isDemoAccount - basic demo:', isBasicDemo, 'wpLoggedIn:', wpLoggedIn);
  
  // User is considered demo only if they have demo userId AND are not logged into WordPress
  return isBasicDemo && !wpLoggedIn;
}

export function isGuestAccount(userId) {
  if (!userId) return false;
  const isGuest = userId.startsWith('guest');
  console.log('[Utils] isGuestAccount:', userId, 'startsWith "guest"?', isGuest);
  return isGuest;
}

/**
 * Cleans erroneous house fingerprint entries from localStorage
 * Removes wm-house-{fingerprint} keys but preserves wm-house and user data
 * Works for all account types: guest, logged-in, demo
 * @returns {number} Number of erroneous entries removed
 */
export const cleanErroneousHouseFingerprints = () => {
    console.log('[Utils] Starting cleanup of erroneous house fingerprints');

    const keys = Object.keys(localStorage);
    let removedCount = 0;
    const removedEntries = [];

    // Only remove wm-house-{long-fingerprint} keys (not "wm-house" itself)
    keys.forEach(key => {
        if (key.startsWith('wm-house-') && key.length > 15) {
            const houseData = localStorage.getItem(key);
            console.log(`[Utils] Found erroneous fingerprint: ${key} = ${houseData}`);
            localStorage.removeItem(key);
            removedEntries.push({ key, data: houseData });
            removedCount++;
        }
    });

    if (removedCount > 0) {
        console.log(`[Utils] ✅ Cleaned ${removedCount} erroneous house fingerprints:`, removedEntries);
    } else {
        console.log('[Utils] ✅ No erroneous house fingerprints found - localStorage is clean');
    }

    // Log what remains for verification
    const remainingHouseKeys = Object.keys(localStorage).filter(key => key.startsWith('wm-house'));
    console.log('[Utils] Remaining house-related keys:', remainingHouseKeys);

    return removedCount;
};

export function getCurrentDomain(sessionId) {
  if (window.location.hostname.includes("ooo2")) {
    return "8";
  }
  const domainMatch = sessionId.match(/-(\d+)-[a-f0-9]{32}$/);
  if (domainMatch) {
    return domainMatch[1];
  }
  return "1";
}