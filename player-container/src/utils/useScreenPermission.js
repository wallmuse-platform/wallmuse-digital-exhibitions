// useScreenPermission.js
import { useState, useEffect } from 'react';
import { ThemeProvider } from "@mui/material/styles";
import { Button } from '@mui/material'; 
import { selectTheme } from "../theme/ThemeUtils";
import "../App.css";

/**
 * Screen permission dialog component (placed upfront as used in hook)
 */
export function ScreenPermissionDialog({ onAccept, onDecline, className, t }) {

    const theme = selectTheme();

    return (
        <ThemeProvider theme={theme}>
            <div className={`screen-permission-dialog ${className || ''}`}
                style={{
                    backgroundColor: theme?.palette?.background?.paper || '#fff',
                    color: theme?.palette?.text?.primary || '#000',
                    border: `2px solid ${theme?.palette?.primary?.main || '#000'}` 
                }}>
                <h3>{t("permission.title")}</h3>
                <p>{t("permission.line1")}</p>
                <p>{t("permission.line2")}</p>
                <div className="permission-buttons">
                    <Button
                        className="permission-accept-button"
                        color="primary" 
                        onClick={onAccept}
                        variant="contained"
                        size="small"
                    >
                        Continue
                    </Button>
                    <Button
                        className="permission-decline-button"
                        color="primary" 
                        onClick={onDecline}
                        variant="outlined"
                        size="small"
                    >
                        Skip
                    </Button>
                </div>
            </div>
        </ThemeProvider>
    );
}


/**
 * Custom hook to handle screen capture permissions
 * @param {Object} options - Configuration options
 * @param {boolean} options.autoRequest - Whether to auto-request on mount
 * @param {boolean} options.forceRequest - Whether to bypass session storage check
 * @param {function} options.onStatusChange - Callback when permission status changes
 * @returns {Object} Permission state and methods
 */
export default function useScreenPermission(options = {}) {
    const {
        autoRequest = false,
        forceRequest = false,
        onStatusChange = null,
        t = null, // Default t function if not provided
    } = options;

    const [permissionRequested, setPermissionRequested] = useState(false);
    const [permissionStatus, setPermissionStatus] = useState(
        localStorage.getItem('screenPermissionStatus') || 'unknown'
    );
    const [showPermissionDialog, setShowPermissionDialog] = useState(false);
    const [isRequesting, setIsRequesting] = useState(false);

    // Update stored status when state changes
    useEffect(() => {
        if (permissionStatus !== 'unknown') {
            localStorage.setItem('screenPermissionStatus', permissionStatus);

            // Call the callback if provided
            if (onStatusChange && typeof onStatusChange === 'function') {
                onStatusChange(permissionStatus);
            }
        }
    }, [permissionStatus, onStatusChange]);

    // Automatically request permission if configured
    useEffect(() => {
        if (autoRequest && !permissionRequested) {
            checkPermission();
        }
    }, [autoRequest, permissionRequested]);

    /**
     * Check if permission has been requested in this session
     */
    const checkPermission = () => {
        // Skip if already processing a request
        if (isRequesting) return;

        console.log("[useScreenPermission] Checking permission status");

        // Check if already requested in this session
        const alreadyRequested = sessionStorage.getItem('screenPermissionRequested');

        if (alreadyRequested && !forceRequest) {
            console.log("[useScreenPermission] Permission already requested in this session");
            setPermissionRequested(true);
            return;
        }

        // Determine if we should show dialog first
        const isAccountCreation = localStorage.getItem('accountJustCreated') === 'true';
        const isGuestCreation = localStorage.getItem('guestUserId') !== null;

        if (isAccountCreation || isGuestCreation || autoRequest) {
            // For account creation or auto-request, skip dialog
            requestPermission();
        } else {
            // For normal usage, show dialog with explanation
            setShowPermissionDialog(true);
        }
    };

    /**
     * Actually request the permission from browser
     */
    const requestPermission = async () => {
        // Mark as requested for this session
        sessionStorage.setItem('screenPermissionRequested', 'true');
        setPermissionRequested(true);
        setIsRequesting(true);

        try {
            console.log("[useScreenPermission] Requesting screen permission");

            if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
                try {
                    // Request permission with minimal settings
                    const stream = await navigator.mediaDevices.getDisplayMedia({
                        video: { width: 1, height: 1 },
                        audio: false
                    });

                    // Stop all tracks immediately
                    stream.getTracks().forEach(track => track.stop());

                    console.log("[useScreenPermission] Screen permission granted");
                    setPermissionStatus('granted');

                    // Dispatch global event for other components
                    window.dispatchEvent(new CustomEvent('screen-permission-changed', {
                        detail: { status: 'granted' }
                    }));
                } catch (err) {
                    console.log("[useScreenPermission] Screen permission denied:", err);
                    setPermissionStatus('denied');

                    // Dispatch global event
                    window.dispatchEvent(new CustomEvent('screen-permission-changed', {
                        detail: { status: 'denied' }
                    }));
                }
            } else {
                console.log("[useScreenPermission] Screen capture not supported");
                setPermissionStatus('unsupported');
            }
        } catch (error) {
            console.error("[useScreenPermission] Error requesting permission:", error);
            setPermissionStatus('error');
        } finally {
            // Close dialog if open and mark as no longer requesting
            setShowPermissionDialog(false);
            setIsRequesting(false);
        }
    };

    /**
     * Handle user's response to permission dialog
     */
    const handleDialogResponse = (accepted) => {
        if (accepted) {
            requestPermission();
        } else {
            console.log("[useScreenPermission] User declined permission dialog");
            setPermissionStatus('user-declined');
            setShowPermissionDialog(false);

            // Mark as requested even though denied
            sessionStorage.setItem('screenPermissionRequested', 'true');
            setPermissionRequested(true);
        }
    };

    /**
     * Get dimensions based on permission status
     */
    const getScreenDimensions = () => {
        if (permissionStatus === 'granted' && window.screen) {
            return {
                width: window.screen.width || 1920,
                height: window.screen.height || 1080
            };
        } else {
            // Default dimensions if permission denied or unsupported
            return { width: 1920, height: 1080 };
        }
    };

    return {
        // State
        permissionStatus,
        permissionRequested,
        showPermissionDialog,
        isRequesting,

        // Actions
        checkPermission,
        requestPermission,
        handleDialogResponse,

        // Utilities
        getScreenDimensions,

        // For rendering dialog
        PermissionDialog: (props) => (
            showPermissionDialog ? (
                <ScreenPermissionDialog
                    onAccept={() => handleDialogResponse(true)}
                    onDecline={() => handleDialogResponse(false)}
                    t={t}
                    {...props}
                />
            ) : null
        )
    };
}

/**
 * Utility function to directly check browser support
 */
export function isScreenCaptureSupported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);
}