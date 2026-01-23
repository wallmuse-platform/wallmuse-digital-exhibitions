// CustomComponents.js

import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

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