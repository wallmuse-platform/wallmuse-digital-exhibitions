// In a new file: accountCleanup.js

/**
 * Cleans up all account activation related flags from localStorage
 * @param {string} reason - Why cleanup is being performed (logging, debugging)
 * @param {boolean} preserveSession - Whether to preserve session-related items
 * @returns {Object} - Summary of what was cleaned
 */
export function cleanupAccountFlags(reason = 'manual', preserveSession = false) {
  console.log(`[accountCleanup] Cleaning account flags. Reason: ${reason}`);
  
  // Account activation flags
  const activationFlags = [
    'activationComplete',
    'accountJustCreated',
    'copiedHouses',
    'currentSetupPhase',
    'guestUserId',
    'playlistsCopied',
    'refreshAttempts',
    'screenSetupFailed',
    'needsRefresh',
    'needsSecondRefresh', 
    'refreshShown',
    'activationInProgress',
    'newAccountHouseId'
  ];
  
  // Session related flags - only clean if preserveSession is false
  const sessionFlags = [
    'current_house_id'
  ];
  
  // Track what was cleaned
  const cleanedFlags = {
    removed: [],
    preserved: [],
    notFound: []
  };
  
  // Clean activation flags
  activationFlags.forEach(flag => {
    if (localStorage.getItem(flag) !== null) {
      localStorage.removeItem(flag);
      cleanedFlags.removed.push(flag);
    } else {
      cleanedFlags.notFound.push(flag);
    }
  });
  
  // Clean session flags if not preserving
  if (!preserveSession) {
    sessionFlags.forEach(flag => {
      if (localStorage.getItem(flag) !== null) {
        localStorage.removeItem(flag);
        cleanedFlags.removed.push(flag);
      } else {
        cleanedFlags.notFound.push(flag);
      }
    });
  } else {
    sessionFlags.forEach(flag => {
      if (localStorage.getItem(flag) !== null) {
        cleanedFlags.preserved.push(flag);
      }
    });
  }
  
  console.log('[accountCleanup] Cleanup complete:', cleanedFlags);
  // Dispatch event to notify components
  window.dispatchEvent(new CustomEvent('account-flags-cleaned', { 
    detail: { reason, cleanedFlags } 
  }));
  
  return cleanedFlags;
}

/**
 * Checks if there are any stale account flags that should be cleaned
 * @returns {boolean} - True if stale flags detected
 */
export function hasStaleAccountFlags() {
  // Most critical flags to check
  const activationFlags = [
    'activationComplete',
    'accountJustCreated',
    'refreshAttempts',
    'needsRefresh'
  ];
  
  // Check if any activation flags exist
  return activationFlags.some(flag => localStorage.getItem(flag) !== null);
}

/**
 * Reset specific account flag
 * @param {string} flag - Flag to reset
 * @returns {boolean} - True if flag was found and reset
 */
export function resetAccountFlag(flag) {
  if (localStorage.getItem(flag) !== null) {
    localStorage.removeItem(flag);
    console.log(`[accountCleanup] Reset single flag: ${flag}`);
    return true;
  }
  return false;
}