// useTVNavigation.js - Improved version with better TV remote support
// A dedicated hook for TV remote navigation

import { useState, useRef, useEffect } from 'react';

/**
 * Custom hook for TV remote navigation with improved debugging and focus handling
 * @param {Object} options Configuration options
 * @param {number} options.buttonCount Number of buttons in the navigation group
 * @param {boolean} options.isSmartTV Whether the device is a Smart TV 
 * @param {string} options.groupName Identifier for this navigation group
 * @param {boolean} options.isActive Whether this navigation group is currently active
 * @param {number} options.initialFocusIndex Initial button to focus (default: 0)
 * @param {boolean} options.debug Enable debug logging (default: false)
 * @returns {Object} Navigation utilities
 */
export const useTVNavigation = ({
  buttonCount,
  isSmartTV = false,
  groupName = 'default',
  isActive = true,
  initialFocusIndex = 0,
  debug = false
}) => {
  // Skip everything if not on a Smart TV
  if (!isSmartTV) {
    return {
      focusedIndex: 0,
      updateFocus: () => { },
      handleKeyNav: () => { },
      getTVProps: () => ({ tabIndex: 0 })
    };
  }

  // State to track the currently focused button
  const [focusedIndex, setFocusedIndex] = useState(initialFocusIndex);

  // Ref to store button elements
  const buttonElements = useRef(Array(buttonCount).fill(null));

  // Debug logger
  const log = (...args) => {
    if (debug) {
      console.log(`[useTVNavigation:${groupName}]`, ...args);
    }
  };

  // Log initial setup
  useEffect(() => {
    log('Initialized with', { buttonCount, isActive, initialFocusIndex });
  }, []);

  // Update focus to a specific button
  const updateFocus = (newIndex) => {
    if (newIndex >= 0 && newIndex < buttonCount) {
      log('Updating focus to index', newIndex);
      setFocusedIndex(newIndex);

      // Focus the DOM element if it exists
      if (buttonElements.current[newIndex]) {
        // First mark the currently focused element
        buttonElements.current.forEach((el, idx) => {
          if (el) {
            if (idx === newIndex) {
              el.setAttribute('data-tv-focused', 'true');
            } else {
              el.removeAttribute('data-tv-focused');
            }
          }
        });

        // Then focus the element
        buttonElements.current[newIndex].focus();

        // Make sure it's visible in the viewport
        buttonElements.current[newIndex].scrollIntoView({
          behavior: 'smooth',
          block: 'nearest'
        });
      } else {
        log('Warning: Element not found for index', newIndex);
      }
    } else {
      log('Warning: Attempted to focus out-of-range index', newIndex);
    }
  };

  // Handle keyboard navigation
  const handleKeyNav = (e, currentIndex) => {
    if (!isSmartTV) return;

    log('Key pressed:', e.key, 'at index', currentIndex);

    switch (e.key) {
      case 'ArrowRight':
        // Navigate to next button
        updateFocus((currentIndex + 1) % buttonCount);
        e.preventDefault();
        break;

      case 'ArrowLeft':
        // Navigate to previous button
        updateFocus((currentIndex - 1 + buttonCount) % buttonCount);
        e.preventDefault();
        break;

      case 'ArrowUp':
      case 'ArrowDown':
        // For now, just prevent default to maintain focus
        // In a more complex UI, this would navigate between groups
        log('Vertical navigation not implemented');
        e.preventDefault();
        break;

      case 'Enter':
      case ' ': // Space key
        // Activate the button
        log('Activating button at index', currentIndex);
        if (buttonElements.current[currentIndex] &&
          typeof buttonElements.current[currentIndex].click === 'function') {
          buttonElements.current[currentIndex].click();
        }
        e.preventDefault();
        break;

      // Numeric key support (1-9)
      case '1': case '2': case '3': case '4': case '5':
      case '6': case '7': case '8': case '9':
        const numIndex = parseInt(e.key) - 1;
        if (numIndex >= 0 && numIndex < buttonCount) {
          log('Numeric navigation to index', numIndex);
          updateFocus(numIndex);
          e.preventDefault();
        }
        break;

      default:
        // No action for other keys
        break;
    }
  };

  // Register a button element with its index
  const registerButtonRef = index => element => {
    if (element) {
      log('Registering element for index', index);
      buttonElements.current[index] = element;

      // Mark as focusable for CSS targeting
      element.setAttribute('data-tv-focusable', 'true');
      element.setAttribute('data-tv-index', index);
      element.setAttribute('data-tv-group', groupName);

      // Set initial focus state
      if (index === focusedIndex) {
        element.setAttribute('data-tv-focused', 'true');
      }
    }
  };

  // Initialize TV mode and set up global focus management
  useEffect(() => {
    if (!isSmartTV || !isActive) return;

    // Add TV mode class to body (if not already added)
    if (!document.body.classList.contains('tv-mode')) {
      document.body.classList.add('tv-mode');
      log('Added tv-mode class to body');
    }

    // Set focus to initial button after mounting
    const initTimer = setTimeout(() => {
      log('Setting initial focus to index', initialFocusIndex);
      updateFocus(initialFocusIndex);
    }, 300); // Increased timeout for more reliable initialization

    // Add navigation helper element for TV users
    const addNavigationHelper = () => {
      // Check if helper already exists
      if (document.querySelector('.tv-navigation-helper')) {
        return;
      }

      // Create the helper element
      const helperEl = document.createElement('div');
      helperEl.className = 'tv-navigation-helper';
      helperEl.innerHTML = `
        <div>
          <span class="tv-navigation-key">←</span>
          <span class="tv-navigation-key">→</span>
          Use arrow keys to navigate
        </div>
        <div>
          <span class="tv-navigation-key">OK</span>
          Press OK or Enter to select
        </div>
        <div>
          <span class="tv-navigation-key">1-${buttonCount}</span>
          Press number keys for direct access
        </div>
      `;

      // Add to document
      document.body.appendChild(helperEl);

      // Auto-hide after 10 seconds
      setTimeout(() => {
        helperEl.style.opacity = '0';
        helperEl.style.transition = 'opacity 1s ease-out';

        // Remove from DOM after transition
        setTimeout(() => {
          if (helperEl.parentNode) {
            helperEl.parentNode.removeChild(helperEl);
          }
        }, 1000);
      }, 10000);
    };

    // Add the helper after a short delay
    setTimeout(addNavigationHelper, 1500);

    // Global handler to keep focus within this group when active
    const handleGlobalKey = (e) => {
      // Only handle if this group is active
      if (!isActive) return;

      // Check if focus is within this group
      const activeElement = document.activeElement;
      const isInGroup = activeElement &&
        activeElement.getAttribute('data-tv-group') === groupName;

      // If focus left our group, restore it
      if (!isInGroup && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        log('Focus left group, restoring to index', focusedIndex);
        updateFocus(focusedIndex);
      }
    };

    // Add global key handler
    window.addEventListener('keydown', handleGlobalKey);

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleGlobalKey);
      clearTimeout(initTimer);

      // Remove any navigation helper
      const helperEl = document.querySelector('.tv-navigation-helper');
      if (helperEl && helperEl.parentNode) {
        helperEl.parentNode.removeChild(helperEl);
      }
    };
  }, [initialFocusIndex, isActive]);

  return {
    focusedIndex,
    updateFocus,
    handleKeyNav,
    getTVProps: (index) => ({
      onFocus: () => updateFocus(index),
      tabIndex: 0,
      'data-tv-group': groupName,
      'data-tv-index': index,
    }),
    registerButtonRef,
  };
};