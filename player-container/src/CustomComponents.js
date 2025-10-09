// CustomComponents.js
// Check if CustomIconButton
import React, { useState, useEffect, useRef, forwardRef } from 'react';
import PropTypes from 'prop-types';
import { useTheme } from '@mui/material/styles'; // Import useTheme hook

/**
 * CustomIconButton - A reusable icon button component with styling support
 * Designed to work with custom size classes and avoid WordPress conflicts
 * Theme-aware CustomIconButton with forwardRef support
 */


// export const CustomIconButton = forwardRef(({
//   onClick,
//   disabled = false,
//   children,
//   sx = {},
//   className = '',
//   title,
//   ariaLabel,
//   variant, // Remove default to make it optional
//   color = 'primary',
//   icon,
//   width, // Optional explicit width
//   height, // Optional explicit height
//   ...rest
// }, ref) => {
//   // Add state to track pressed and hover states
//   const [isPressed, setIsPressed] = useState(false);
//   const [isHovered, setIsHovered] = useState(false);

//   // Access the theme using MUI's useTheme hook
//   const theme = useTheme();

//   // Responsive sizing function - use explicit values if provided, otherwise use responsive defaults
//   const getResponsiveSizing = () => {
//     // If explicit dimensions are provided, use those
//     if (width && height) {
//       return { width, height };
//     }
    
//     // Default responsive sizing based on theme breakpoints
//     return {
//       // Base size for desktops (between md and lg breakpoints)
//       width: '200px',
//       height: '48px',
      
//       // Responsive sizes using theme breakpoints
//       [theme.breakpoints.down('md')]: {
//         width: '180px',
//         height: '44px',
//       },
//       [theme.breakpoints.down('sm')]: {
//         width: '100%', // Full width on small screens
//         maxWidth: '150px',
//         height: '36px',
//       },
//       // TV size - for very large screens
//       [theme.breakpoints.up('tv')]: {
//         width: '300px',
//         height: '72px',
//         fontSize: '20px',
//       },
//       // XL desktop size
//       [theme.breakpoints.up('xl')]: {
//         width: '240px',
//         height: '58px',
//         fontSize: '18px',
//       },
//     };
//   };

//   // Get colors from theme based on variant and color props, but only if variant is specified
//   const getColorStyles = () => {
//     // If no variant is specified, don't apply theme-based colors
//     if (!variant) return {};

//     // Default colors in case theme isn't available
//     let styles = {};

//     if (theme && theme.palette) {
//       const colorPalette = theme.palette[color] || theme.palette.primary;

//       if (variant === 'contained') {
//         styles = {
//           backgroundColor: isPressed
//             ? colorPalette.dark
//             : (isHovered ? colorPalette.light : colorPalette.main),
//           color: colorPalette.contrastText
//         };
//       } else if (variant === 'outlined') {
//         styles = {
//           backgroundColor: 'transparent',
//           color: isPressed
//             ? colorPalette.dark
//             : (isHovered ? colorPalette.light : colorPalette.main),
//           border: `1px solid ${isPressed
//             ? colorPalette.dark
//             : (isHovered ? colorPalette.light : colorPalette.main)}`
//         };
//       } else if (variant === 'text') {
//         styles = {
//           backgroundColor: isPressed
//             ? `rgba(${hexToRgb(colorPalette.main)}, 0.2)`
//             : (isHovered ? `rgba(${hexToRgb(colorPalette.main)}, 0.1)` : 'transparent'),
//           color: colorPalette.main
//         };
//       }

//       // If disabled, use inactive colors from theme
//       if (disabled && colorPalette.inactive) {
//         styles.backgroundColor = variant === 'text' ? 'transparent' : colorPalette.inactive;
//         styles.color = theme.palette.text.inactive || '#9e9e9e';
//         styles.borderColor = colorPalette.inactive;
//       }
//     }

//     return styles;
//   };

//   // Helper function to convert hex to rgb
//   const hexToRgb = (hex) => {
//     if (!hex || typeof hex !== 'string') return '0, 0, 0';

//     // Remove # if present
//     hex = hex.replace('#', '');

//     // Parse hex values
//     const r = parseInt(hex.substring(0, 2), 16);
//     const g = parseInt(hex.substring(2, 4), 16);
//     const b = parseInt(hex.substring(4, 6), 16);

//     return `${r}, ${g}, ${b}`;
//   };

//   // Get feedback styles that apply to all buttons regardless of variant
//   const getFeedbackStyles = () => {
//     return {
//       transform: isPressed ? 'scale(0.96)' : 'scale(1)',
//       boxShadow: isPressed ? 'inset 0 1px 2px rgba(0, 0, 0, 0.2)' : 'none',
//     };
//   };

//   // Base styles
//   const baseStyles = {
//     opacity: disabled ? 0.5 : 1,
//     cursor: disabled ? 'default' : 'pointer',
//     display: 'inline-flex',
//     alignItems: 'center',
//     justifyContent: 'center',
//     borderRadius: '4px',
//     padding: '8px 16px',
//     transition: 'all 0.15s ease',
//     // Apply responsive sizing
//     ...getResponsiveSizing(),
//     // Apply feedback styles to all buttons
//     ...getFeedbackStyles(),
//     // Only apply color styles if variant is specified
//     ...getColorStyles()
//   };

//   // Combine base styles with custom sx prop (sx takes precedence)
//   const combinedStyles = { ...baseStyles, ...sx };

//   // Event handlers
//   const handleMouseDown = () => {
//     if (!disabled) setIsPressed(true);
//   };

//   const handleMouseUp = () => {
//     if (!disabled) setIsPressed(false);
//   };

//   const handleMouseEnter = () => {
//     if (!disabled) setIsHovered(true);
//   };

//   const handleMouseLeave = () => {
//     if (!disabled) {
//       setIsHovered(false);
//       setIsPressed(false); // Reset pressed state when leaving
//     }
//   };

//   // Touch event handlers for mobile
//   const handleTouchStart = () => {
//     if (!disabled) setIsPressed(true);
//   };

//   const handleTouchEnd = () => {
//     if (!disabled) setIsPressed(false);
//   };

//   // Build the className string including variant and color only if specified
//   const buildClassName = () => {
//     let classStr = `custom-icon-button ${className} ${isPressed ? 'pressed' : ''} ${isHovered ? 'hovered' : ''}`;
//     if (variant) classStr += ` ${variant}`;
//     if (color) classStr += ` ${color}`;
//     return classStr;
//   };

//   return (
//     <div
//       ref={ref}
//       onClick={disabled ? null : onClick}
//       onMouseDown={handleMouseDown}
//       onMouseUp={handleMouseUp}
//       onMouseEnter={handleMouseEnter}
//       onMouseLeave={handleMouseLeave}
//       onTouchStart={handleTouchStart}
//       onTouchEnd={handleTouchEnd}
//       onMouseOut={handleMouseLeave}
//       role="button"
//       tabIndex={disabled ? -1 : 0}
//       aria-disabled={disabled}
//       aria-label={ariaLabel}
//       title={title}
//       className={buildClassName()}
//       style={combinedStyles}
//       onKeyDown={(e) => {
//         if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
//           e.preventDefault();
//           setIsPressed(true);
//           onClick && onClick(e);
//           setTimeout(() => setIsPressed(false), 150);
//         }
//       }}
//       {...rest}
//     >
//       {icon && <span style={{ marginRight: children ? '8px' : 0 }}>{icon}</span>}
//       {children && <span style={{ textTransform: 'uppercase' }}>{children}</span>}
//     </div>
//   );
// });

// // Add display name for dev tools
// CustomIconButton.displayName = 'CustomIconButton';

// // PropTypes
// CustomIconButton.propTypes = {
//   onClick: PropTypes.func,
//   disabled: PropTypes.bool,
//   children: PropTypes.node,
//   sx: PropTypes.object,
//   className: PropTypes.string,
//   title: PropTypes.string,
//   ariaLabel: PropTypes.string,
//   variant: PropTypes.oneOf(['contained', 'outlined', 'text']),
//   color: PropTypes.string,
//   icon: PropTypes.node,
//   width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
//   height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
// };


// /**
//  * CustomIconButton with integrated Tooltip
//  * Requires installing react-tooltip or similar
//  */
// export const TooltipButton = forwardRef(({
//   tooltipTitle,
//   children,
//   icon,
//   ...props
// }, ref) => {
//   return (
//     <CustomIconButton
//       ref={ref}
//       title={tooltipTitle || props.title}
//       {...props}
//     >
//       {icon}
//       {children && (
//         <span style={{ 
//           marginLeft: icon ? '8px' : 0, 
//           textTransform: 'uppercase' 
//         }}>
//           {children}
//         </span>
//       )}
//     </CustomIconButton>
//   );
// });

// TooltipButton.displayName = 'TooltipButton';

// // PropTypes for TooltipButton
// TooltipButton.propTypes = {
//   tooltipTitle: PropTypes.string,
//   children: PropTypes.node,
//   icon: PropTypes.node,
//   // Inherits other props from CustomIconButton
// };

/**
 * CustomAlert - A simple alert component for use inside CustomSnackbar
 * Styled to match the provided design with icons and border styles
 */
export const CustomAlert = ({
  severity = 'success',
  onClose,
  children,
  sx = {},
  className = '',
  iconMapping = {},
  ...rest
}) => {
  // Default severity styles as fallbacks when no theme is provided
  const severityStyles = {
    success: {
      backgroundColor: '#e8f5e9',
      color: '#000',
      borderColor: '#4caf50',
      border: '2px solid #4caf50'
    },
    error: {
      backgroundColor: '#ffebee',
      color: '#000',
      borderColor: '#f44336',
      border: '2px solid #f44336'
    },
    warning: {
      backgroundColor: '#fff8e1',
      color: '#000',
      borderColor: '#ff9800',
      border: '2px solid #ff9800'
    },
    info: {
      backgroundColor: '#e3f2fd',
      color: '#000',
      borderColor: '#2196f3',
      border: '2px solid #2196f3'
    }
  };

  // Get the appropriate icon based on severity
  const getIcon = () => {
    // Check if a custom icon is provided via iconMapping
    if (iconMapping && iconMapping[severity]) {
      return iconMapping[severity];
    }

    // Otherwise use default icons
    switch (severity) {
      case 'success':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="11" stroke="#4caf50" strokeWidth="2" fill="none" />
            <path d="M7 12L10 15L17 8" stroke="#4caf50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );
      case 'error':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="11" stroke="#f44336" strokeWidth="2" fill="none" />
            <path d="M12 7V13" stroke="#f44336" strokeWidth="2" strokeLinecap="round" />
            <circle cx="12" cy="17" r="1" fill="#f44336" />
          </svg>
        );
      case 'warning':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 3L22 20H2L12 3Z" stroke="#ff9800" strokeWidth="2" fill="none" />
            <path d="M12 10V14" stroke="#ff9800" strokeWidth="2" strokeLinecap="round" />
            <circle cx="12" cy="17" r="1" fill="#ff9800" />
          </svg>
        );
      case 'info':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="11" stroke="#2196f3" strokeWidth="2" fill="none" />
            <path d="M12 7V8" stroke="#2196f3" strokeWidth="2" strokeLinecap="round" />
            <path d="M12 11V17" stroke="#2196f3" strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
      default:
        return null;
    }
  };

  // Base styles updated with 5px border radius
  const baseStyles = {
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    boxSizing: 'border-box',
    borderRadius: '5px',
    fontWeight: 400,
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    ...severityStyles[severity]
  };

  // Combine base styles with custom sx prop
  const combinedStyles = { ...baseStyles, ...sx };

  return (
    <div
      className={`custom-alert custom-alert-${severity} ${className}`}
      style={combinedStyles}
      {...rest}
    >
      <div style={{ marginRight: '12px', flexShrink: 0 }}>
        {getIcon()}
      </div>
      <div className="custom-alert-message" style={{ flex: 1 }}>{children}</div>
      {onClose && (
        <div
          className="custom-alert-close"
          onClick={onClose}
          role="button"
          tabIndex={0}
          aria-label="Close"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onClose();
            }
          }}
          style={{
            marginLeft: '16px',
            cursor: 'pointer',
            fontSize: '20px',
            lineHeight: '20px',
            fontWeight: 'bold',
            opacity: 0.7,
            transition: 'opacity 0.2s',
            padding: '0 5px',
          }}
        >
          ×
        </div>
      )}
    </div>
  );
};

// PropTypes for CustomAlert
CustomAlert.propTypes = {
  severity: PropTypes.oneOf(['success', 'error', 'warning', 'info']),
  onClose: PropTypes.func,
  children: PropTypes.node.isRequired,
  sx: PropTypes.object,
  className: PropTypes.string,
  iconMapping: PropTypes.object
};

/**
 * CustomSnackbar - A reusable notification component that avoids WordPress conflicts
 */
export const CustomSnackbar = ({
  open = false,
  autoHideDuration = 6000,
  onClose,
  anchorOrigin = { vertical: 'bottom', horizontal: 'right' },
  children,
  sx = {},
  className = '',
  transitionDuration = 500,
  disableWindowBleed = true,
  showDelay = 0,
  ...rest
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const timerRef = useRef(null);
  const delayTimerRef = useRef(null);
  const closeAnimationTimerRef = useRef(null);
  const snackbarRef = useRef(null);

  // Handle open state changes
  // Handle open state changes
  useEffect(() => {
    if (open) {
      // Apply delay if specified before showing the snackbar
      if (showDelay > 0) {
        clearTimeout(delayTimerRef.current);
        delayTimerRef.current = setTimeout(() => {
          setIsVisible(true);
        }, showDelay);
      } else {
        setIsVisible(true);
      }

      // Set up auto-hide timer if duration > 0
      if (autoHideDuration > 0) {
        clearTimeout(timerRef.current);

        // Account for the show delay when setting up the auto-hide timer
        const totalDelay = showDelay + autoHideDuration;

        timerRef.current = setTimeout(() => {
          handleClose({ type: 'timeout' });
        }, totalDelay);
      }
    } else {
      // When open becomes false, trigger the close animation
      setIsVisible(false);
    }

    // Clean up all timers on unmount or when open changes
    return () => {
      clearTimeout(timerRef.current);
      clearTimeout(delayTimerRef.current);
    };
  }, [open, autoHideDuration, transitionDuration, showDelay]);


  // Add window resize handling for left/right positioned snackbars to prevent truncation
  useEffect(() => {
    const handleResize = () => {
      if (!snackbarRef.current || !disableWindowBleed) return;

      const { left, right, width } = snackbarRef.current.getBoundingClientRect();
      const windowWidth = window.innerWidth;

      // Adjust position if the snackbar would be partially out of view
      if (anchorOrigin.horizontal === 'left' && left < 0) {
        snackbarRef.current.style.left = '20px';
      } else if (anchorOrigin.horizontal === 'right' && right > windowWidth) {
        snackbarRef.current.style.right = '20px';
      }

      // Ensure it's not wider than the viewport
      if (width > windowWidth - 40) {
        snackbarRef.current.style.maxWidth = `${windowWidth - 40}px`;
      }
    };

    if (isVisible && disableWindowBleed) {
      window.addEventListener('resize', handleResize);
      // Initial check
      setTimeout(handleResize, 0);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [isVisible, anchorOrigin.horizontal, disableWindowBleed]);

  // Handle close action
  const handleClose = (event) => {
    // Clear auto-hide timer
    clearTimeout(timerRef.current);

    // Start the exit animation
    setIsVisible(false);

    // Notify parent component after animation completes
    setTimeout(() => {
      if (onClose) {
        onClose(event);
      }
    }, transitionDuration);
  };

  // Calculate position based on anchorOrigin
  const getPositionStyles = () => {
    const { vertical, horizontal } = anchorOrigin;

    const positionStyles = {
      position: 'fixed',
      zIndex: 9999,
      [vertical]: '20px',
      ...(horizontal === 'left' ? { left: '20px' } : {}),
      ...(horizontal === 'center' ? { left: '50%', transform: 'translateX(-50%)' } : {}),
      ...(horizontal === 'right' ? { right: '20px' } : {})
    };

    // Override transform if it's center position with additional transformY
    if (horizontal === 'center') {
      positionStyles.transform = isVisible
        ? 'translateX(-50%) translateY(0)'
        : `translateX(-50%) translateY(${vertical === 'top' ? '-20px' : '20px'})`;
    }

    return positionStyles;
  };

  // Base styles with modified dimensions and animation
  const baseStyles = {
    display: open || isVisible ? 'block' : 'none',
    maxWidth: '300px',
    minWidth: '175px',
    width: '100%',
    transition: `opacity ${transitionDuration}ms, transform ${transitionDuration}ms`,
    opacity: isVisible && open ? 1 : 0,
    transform: isVisible && open
      ? 'translateY(0)'
      : `translateY(${anchorOrigin.vertical === 'top' ? '-20px' : '20px'})`,
    ...getPositionStyles()
  };

  // Combine base styles with custom sx prop
  const combinedStyles = { ...baseStyles, ...sx };

  if (!open && !isVisible) {
    return null;
  }

  return (
    <div
      ref={snackbarRef}
      className={`custom-snackbar ${className}`}
      style={combinedStyles}
      role="alert"
      {...rest}
    >
      {React.cloneElement(children, {
        onClose: handleClose,
        ...children.props
      })}
    </div>
  );
};

// PropTypes for documentation and type checking
// CustomIconButton.propTypes = {
//   onClick: PropTypes.func,
//   disabled: PropTypes.bool,
//   children: PropTypes.node.isRequired,
//   sx: PropTypes.object,
//   className: PropTypes.string,
//   title: PropTypes.string,
//   ariaLabel: PropTypes.string
// };

CustomAlert.propTypes = {
  severity: PropTypes.oneOf(['success', 'error', 'warning', 'info']),
  onClose: PropTypes.func,
  children: PropTypes.node.isRequired,
  sx: PropTypes.object,
  className: PropTypes.string,
  iconMapping: PropTypes.object
};

CustomSnackbar.propTypes = {
  open: PropTypes.bool,
  autoHideDuration: PropTypes.number,
  onClose: PropTypes.func,
  anchorOrigin: PropTypes.shape({
    vertical: PropTypes.oneOf(['top', 'bottom']).isRequired,
    horizontal: PropTypes.oneOf(['left', 'center', 'right']).isRequired
  }),
  children: PropTypes.node.isRequired,
  sx: PropTypes.object,
  className: PropTypes.string,
  transitionDuration: PropTypes.number,
  disableWindowBleed: PropTypes.bool,
  showDelay: PropTypes.number
};

export default CustomSnackbar;