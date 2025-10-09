
/**
 * Utility function to get screen dimensions regardless of permission status
 * Safe to use anywhere in the app
 */
export function getScreenDimensions() {
    const permissionStatus = localStorage.getItem('screenPermissionStatus');

    if (permissionStatus === 'granted' && window.screen) {
        return {
            width: window.screen.width || 1920,
            height: window.screen.height || 1080
        };
    } else {
        // Default dimensions if permission denied or unknown
        return { width: 1920, height: 1080 };
    }
}

// Non-hook version for EnvironmentsContext

// Add this exported function to your useScreenPermission.js file
export async function requestScreenPermissionForEnvironment(environmentId) {
    console.log(`[screenPermission] Requesting screen permission for environment ${environmentId}`);

    try {
        // Check if we already know the permission status
        const existingStatus = localStorage.getItem('screenPermissionStatus');
        if (existingStatus) {
            console.log(`[screenPermission] Using existing permission status: ${existingStatus}`);
            return {
                environmentId,
                permissionStatus: existingStatus,
                dimensions: getScreenDimensions()
            };
        }

        // Check if we've already requested in this session
        if (sessionStorage.getItem('screenPermissionRequested') === 'true') {
            console.log('[screenPermission] Permission already requested in this session');
            return {
                environmentId,
                permissionStatus: 'unknown',
                dimensions: getScreenDimensions()
            };
        }

        // Mark as requested
        sessionStorage.setItem('screenPermissionRequested', 'true');

        // Request permission
        if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
            try {
                const stream = await navigator.mediaDevices.getDisplayMedia({
                    video: true,
                    audio: false
                });

                // Get dimensions if possible
                let width = 1920;
                let height = 1080;

                const videoTrack = stream.getVideoTracks()[0];
                if (videoTrack && videoTrack.getSettings) {
                    const settings = videoTrack.getSettings();
                    if (settings.width && settings.height) {
                        width = settings.width;
                        height = settings.height;
                        console.log(`[screenPermission] Detected screen size: ${width}x${height}`);
                    }
                }

                // Stop tracks
                stream.getTracks().forEach(track => track.stop());

                localStorage.setItem('screenPermissionStatus', 'granted');
                console.log('[screenPermission] Permission granted');

                return {
                    environmentId,
                    permissionStatus: 'granted',
                    dimensions: { width, height }
                };
            } catch (err) {
                console.log('[screenPermission] Permission denied', err);
                localStorage.setItem('screenPermissionStatus', 'denied');

                return {
                    environmentId,
                    permissionStatus: 'denied',
                    dimensions: getScreenDimensions() // Default dimensions
                };
            }
        } else {
            console.log('[screenPermission] Screen capture not supported');
            localStorage.setItem('screenPermissionStatus', 'unsupported');

            return {
                environmentId,
                permissionStatus: 'unsupported',
                dimensions: getScreenDimensions() // Default dimensions
            };
        }
    } catch (error) {
        console.error('[screenPermission] Error requesting permission:', error);
        return {
            environmentId,
            permissionStatus: 'error',
            dimensions: getScreenDimensions() // Default dimensions
        };
    }
}
