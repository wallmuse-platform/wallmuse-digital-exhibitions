export const rootElementId = 'root-create-montage';
export const rootElement = document.getElementById(rootElementId);

// Function to get user ID (either from data attributes or URL params)
export const getUserId = () => {
    return (
        rootElement?.dataset?.user ||
        new URLSearchParams(window.location.search).get("user")
    );
}

// Helper function to get WordPress login status
export function getWpLoggedIn() {
  return rootElement?.dataset?.wpLoggedIn === 'true';
}

// Basic demo check - does not consider WordPress login
// Use this when you need to know if userId is a demo type, regardless of WP status
export function isBasicDemoAccount(userId) {
  if (!userId) return false;
  const id = userId.toLowerCase();

  // Keep backward compatibility: check both 'freeaccount' and 'free'
  // Check both 'Unregistered' and 'unregistered' (case-insensitive)
  const isFree = id.includes('free');
  const isUnregistered = id.includes('unregistered');

  console.log('[Utils] isBasicDemoAccount - isFree:', isFree, 'isUnregistered:', isUnregistered);
  return isFree || isUnregistered;
}

/**
 * Checks if the current user is a demo account (UI Layer)
 *
 * NOTE: This is intentionally different from api.js isDemoAccount()
 * - Utils.js version: WordPress-aware, used in UI to show/hide GuestActionPopup
 * - api.js version: Simple session check, used for backend optimizations
 *
 * This function DOES check WordPress login status because:
 * 1. It's used in UI components to determine whether to show restriction popups
 * 2. WordPress admins should bypass all demo restrictions to test the sites
 * 3. This is the first line of defense - filters before any API calls
 *
 * @param {string} userId - The user ID to check
 * @returns {boolean} True if user is demo AND not WordPress logged in, false otherwise
 */
export function isDemoAccount(userId) {
  if (!userId) return false;

  const isBasicDemo = isBasicDemoAccount(userId);
  const wpLoggedIn = getWpLoggedIn();

  console.log('[Utils] isDemoAccount - basic demo:', isBasicDemo, 'wpLoggedIn:', wpLoggedIn);

  // User is considered demo only if they have demo userId AND are not logged into WordPress
  return isBasicDemo && !wpLoggedIn;
}

// Check if user is a guest account
export function isGuestAccount(userId) {
  if (!userId) return false;
  const isGuest = userId.toLowerCase().startsWith('guest');
  console.log('[Utils] isGuestAccount:', userId, 'startsWith "guest"?', isGuest);
  return isGuest;
}

/**
 * Fetches user profile from API to determine premium status and other details
 * @param {string} sessionId - The user session ID
 * @returns {Promise<Object>} User profile object with isPremium, isLoggedIn, etc.
 */
export const getUserProfile = async (sessionId) => {
  try {
    console.log('[getUserProfile] Fetching profile for session:', sessionId);

    const userProfileUrl = `https://wallmuse.com:8443/wallmuse/ws/get_wp_user?version=1&session=${sessionId}&anticache=${Date.now()}`;
    console.log('[getUserProfile] Making API request to:', userProfileUrl);

    const response = await fetch(userProfileUrl, {
      method: 'GET',
      headers: { 'Accept': 'text/x-json' }
    });

    const data = await response.json();
    console.log('[getUserProfile] API response:', data);

    // Handle error response
    if (data?.tag_name === 'error') {
      console.warn('[getUserProfile] Unexpected API response:', data);
      return {
        isLoggedIn: getWpLoggedIn(),
        isPremium: false,
        houses: []
      };
    }

    // Extract premium status - PAY type indicates premium account
    const isPremium = data?.type === "PAY";

    const userProfile = {
      isLoggedIn: getWpLoggedIn(),
      isPremium,
      houses: data?.houses || [],
      id: data?.id || null,
      type: data?.type || null
    };

    console.log('[getUserProfile] User profile:',
      `LoggedIn: ${userProfile.isLoggedIn}, Premium: ${userProfile.isPremium}, Type: ${userProfile.type}`);

    return userProfile;
  } catch (error) {
    console.error('[getUserProfile] Error fetching user profile:', error);
    return {
      isLoggedIn: false,
      isPremium: false,
      houses: []
    };
  }
};