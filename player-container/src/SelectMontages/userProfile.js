// userProfile.js - Fixed for handling special characters in usernames

import axios from 'axios';

export const getUserProfile = async (sessionId) => {
  try {
    const rootElement = document.getElementById('root');
    console.log('[userProfile] rootElement.dataset: ', rootElement.dataset);
    
    // FIXED: Construct URL with raw session ID to preserve exact format
    const userProfileUrl = `https://wallmuse.com:8443/wallmuse/ws/get_wp_user?version=1&session=${sessionId}&anticache=${Date.now()}`;
    console.log('[userProfile] Making API request to:', userProfileUrl);

    // FIXED: Use fetch instead of axios for direct URL control
    const response = await fetch(userProfileUrl, {
      method: 'GET',
      headers: { 'Accept': 'text/x-json' }
    });
    
    const data = await response.json();
    console.log('[userProfile: response]', data);
    
    // Handle error response
    if (data?.tag_name === 'error') {
      console.warn('[userProfile checkPremiumStatus] Unexpected API response:', data);
      // Return basic profile info even if API fails
      return {
        isLoggedIn: rootElement.dataset.wpLoggedIn === 'true',
        isPremium: {},
        isMontageEncryptionOnly: false
      };
    }
    
    // Extract premium status and other details
    const isPremium = data?.type === "PAY";
    const isMontageEncryptionOnly = false; // Set according to your business logic
    
    const userProfile = {
      isLoggedIn: rootElement.dataset.wpLoggedIn === 'true',
      isPremium,
      isMontageEncryptionOnly,
      // Include any other user data from the response
      houses: data?.houses || [],
      id: data?.id || null
    };
    
    console.log('[userProfile] User profile fetched:', 
      `LoggedIn: ${userProfile.isLoggedIn}, Premium: ${JSON.stringify(userProfile.isPremium)}, MontageEncryptionOnly: ${userProfile.isMontageEncryptionOnly}`);
    
    return userProfile;
  } catch (error) {
    console.error('[userProfile] Error fetching user profile:', error);
    // Return default profile on error
    return {
      isLoggedIn: false,
      isPremium: {},
      isMontageEncryptionOnly: false,
      houses: []
    };
  }
};