// useResponsive.js with CustomIconButton support
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useState, useRef, useEffect } from 'react';

export function useResponsive() {
  const theme = useTheme();

  // Standard device size checks using MUI's breakpoints
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const isHD = useMediaQuery(theme.breakpoints.up('lg'));
  const isUHD = useMediaQuery(theme.breakpoints.up('xl'));

  // Addition (to be checked)
  const iconSize = isMobile ? '16px' : isTablet ? '18px' : isHD ? '20px' ? isUHD : '28px' : '18px';

  // Smart TV detection based on user agent
  const isSmartTV = /smart-tv|smarttv|googletv|appletv|hbbtv|pov_tv|netcast.tv|opera tv|tvos/i.test(navigator.userAgent);

  // Orientation checks
  const isPortrait = useMediaQuery('(orientation:portrait)');
  const isLandscape = useMediaQuery('(orientation:landscape)');

  // Enhanced Smart TV checks for HD and 4K
  const isSmartTVHD = isSmartTV && isHD;
  const isSmartTVUHD = isSmartTV && isUHD;

  // Initialize TV mode if detected
  useEffect(() => {
    if (isSmartTV) {
      // Add TV mode class to body for CSS targeting
      document.body.classList.add('tv-mode');

      // Insert TV-specific CSS for focus states
      const tvFocusStyle = document.createElement('style');
      tvFocusStyle.textContent = `
        /* TV focus styles - inserted by useResponsive */
        .tv-mode button:focus,
        .tv-mode .MuiButton-root:focus,
        .tv-mode .MuiButtonBase-root:focus,
        .tv-mode .custom-icon-button:focus {
          background-color: inherit !important;
          color: inherit !important;
          outline: 2px solid ${theme.palette.secondary.main} !important;
          outline-offset: 2px;
        }
      `;
      document.head.appendChild(tvFocusStyle);

      console.log('TV Mode initialized - UI optimized for television display');
    }

    return () => {
      if (isSmartTV) {
        document.body.classList.remove('tv-mode');
      }
    };
  }, [isSmartTV, theme.palette.secondary.main]);

  // TV navigation function for components
  // Enhanced setupButtonNav function for useResponsive hook

  // Add this to your useResponsive hook
  const tvNavigation = {
    setupButtonNav: (buttonCount) => {
      if (!isSmartTV) return {
        handleTVKeyNav: () => { },
        getTVProps: () => ({ tabIndex: 0 })
      };

      // Create an array to track button elements
      const buttonElements = [];
      let currentFocusIndex = 0;

      // Function to update focus - this ensures we're focusing the right element
      const updateFocus = (newIndex) => {
        currentFocusIndex = newIndex;

        // Make sure buttonElements array is populated
        if (buttonElements.length > 0 && buttonElements[newIndex]) {
          buttonElements[newIndex].focus();

          // We also need to make sure the element is visible in the viewport
          buttonElements[newIndex].scrollIntoView({
            behavior: 'smooth',
            block: 'nearest'
          });
        }
      };

      // Improved key navigation handler
      const handleTVKeyNav = (e, currentIndex) => {
        switch (e.key) {
          case 'ArrowRight':
            // Move to next button
            const nextIndex = (currentIndex + 1) % buttonCount;
            updateFocus(nextIndex);
            e.preventDefault();
            break;

          case 'ArrowLeft':
            // Move to previous button
            const prevIndex = (currentIndex - 1 + buttonCount) % buttonCount;
            updateFocus(prevIndex);
            e.preventDefault();
            break;

          case 'ArrowUp':
          case 'ArrowDown':
            // For now, prevent default to maintain focus
            // In a more complex implementation, this would handle group navigation
            e.preventDefault();
            break;

          case 'Enter':
          case ' ': // Space
            // Activate the button if it's clickable
            if (buttonElements[currentIndex] && typeof buttonElements[currentIndex].click === 'function') {
              buttonElements[currentIndex].click();
            }
            e.preventDefault();
            break;

          // Add numeric key support (1-9) for direct access
          case '1': case '2': case '3': case '4': case '5':
          case '6': case '7': case '8': case '9':
            const numIndex = parseInt(e.key) - 1;
            if (numIndex >= 0 && numIndex < buttonCount) {
              updateFocus(numIndex);
              e.preventDefault();
            }
            break;
        }
      };

      // Enhanced ref callback to register buttons
      const registerButton = (index) => (element) => {
        if (element) {
          // Store element reference
          buttonElements[index] = element;

          // Set initial focus on first mount
          if (index === 0 && buttonElements.length === 1) {
            setTimeout(() => updateFocus(0), 100);
          }

          // Add data attributes for better debugging
          element.setAttribute('data-tv-index', index);
          element.setAttribute('data-tv-focusable', 'true');
        }
      };

      // Attach global key event listener for TV navigation
      useEffect(() => {
        // Only for Smart TVs
        if (!isSmartTV) return;

        // Global handler to maintain focus within navigation area
        const handleGlobalKeyNav = (e) => {
          // Check if we're focused within our navigation group
          const activeElement = document.activeElement;
          const isFocusInGroup = activeElement &&
            activeElement.hasAttribute('data-tv-focusable');

          // If focus is outside our group, restore it
          if (!isFocusInGroup && buttonElements.length > 0) {
            updateFocus(currentFocusIndex);
          }
        };

        // Listen for key presses
        window.addEventListener('keydown', handleGlobalKeyNav);

        // Cleanup
        return () => {
          window.removeEventListener('keydown', handleGlobalKeyNav);
        };
      }, [isSmartTV]);

      // Return the necessary props and handlers
      return {
        handleTVKeyNav,
        getTVProps: (index) => ({
          ref: registerButton(index),
          onKeyDown: (e) => handleTVKeyNav(e, index),
          'data-tv-index': index,
          'data-tv-focusable': 'true',
          tabIndex: 0
        })
      };
    }
  };

  return {
    isMobile,
    isTablet,
    isHD,
    isUHD,
    isSmartTV,
    isSmartTVHD,
    isSmartTVUHD,
    isPortrait,
    isLandscape,
    tvNavigation,
    iconSize
  };
}

export default useResponsive;