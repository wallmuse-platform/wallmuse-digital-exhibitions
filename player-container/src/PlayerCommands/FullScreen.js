import React, { useState, useEffect } from "react";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import { IconButton, Tooltip, Typography } from "@mui/material";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";

export function FullScreen() {
    const [fullScreen, setFullScreen] = useState(false);
    const [isIOS, setIsIOS] = useState(false);

    // Detect iOS device
    useEffect(() => {
        const detectiOS = () => {
            const userAgent = window.navigator.userAgent.toLowerCase();
            return /iphone|ipad|ipod/.test(userAgent);
        };
        setIsIOS(detectiOS());
    }, []);

    const escapeHandler = () => {
        if (!document.fullscreenElement && 
            !document.webkitFullscreenElement && 
            !document.webkitIsFullScreen) {
            setFullScreen(false);
        }
    };

    useEffect(() => {
        console.log("[App wm-player-contents fullscreen: useEffect start");

        const mediaContainer = document.querySelector(".wm-player-contents");
        if (mediaContainer) {
            mediaContainer.addEventListener("webkitfullscreenchange", escapeHandler, false);
            mediaContainer.addEventListener("mozfullscreenchange", escapeHandler, false);
            mediaContainer.addEventListener("fullscreenchange", escapeHandler, false);
            mediaContainer.addEventListener("MSFullscreenChange", escapeHandler, false);
            
            // Special event for iOS
            if (isIOS) {
                mediaContainer.addEventListener('webkitendfullscreen', () => {
                    setFullScreen(false);
                }, false);
            }
        }

        return () => {
            if (mediaContainer) {
                mediaContainer.removeEventListener("webkitfullscreenchange", escapeHandler, false);
                mediaContainer.removeEventListener("mozfullscreenchange", escapeHandler, false);
                mediaContainer.removeEventListener("fullscreenchange", escapeHandler, false);
                mediaContainer.removeEventListener("MSFullscreenChange", escapeHandler, false);
                
                if (isIOS) {
                    mediaContainer.removeEventListener('webkitendfullscreen', () => {
                        setFullScreen(false);
                    }, false);
                }
            }
        };
    }, [isIOS]);

    const handleFullScreenChange = () => {
        const mediaContainer = document.querySelector(".wm-player-contents");
        if (!mediaContainer) {
            console.error("wwm-player-contents element not found.");
            return; // Early exit if the element is not found
        }

        // Check if there's a video element inside the web-player-content
        const videoElement = mediaContainer.querySelector('video');

        if (fullScreen) {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (mediaContainer.webkitExitFullscreen) {
                mediaContainer.webkitExitFullscreen();
            }
            setFullScreen(false);
        } else {
            if (isIOS && videoElement) {
                // For iOS, if there's a video element, use its enterFullscreen method
                try {
                    videoElement.webkitEnterFullscreen();
                    setFullScreen(true);
                } catch (error) {
                    console.warn('[FullScreen] Failed to enter fullscreen on video element:', error.message);
                }
            } else if (isIOS && mediaContainer.webkitEnterFullscreen) {
                // Try the container's enterFullscreen method for iOS
                try {
                    mediaContainer.webkitEnterFullscreen();
                    setFullScreen(true);
                } catch (error) {
                    console.warn('[FullScreen] Failed to enter fullscreen on container:', error.message);
                }
            } else if (mediaContainer.requestFullscreen) {
                mediaContainer.requestFullscreen();
                setFullScreen(true);
            } else if (mediaContainer.webkitRequestFullscreen) {
                mediaContainer.webkitRequestFullscreen();
                setFullScreen(true);
            }
        }
    };

    return (
        <IconButton onClick={handleFullScreenChange} style={{ textAlign: 'right', marginRight: '10px' }}>
            {!fullScreen ? (
                <Tooltip title="Enter Full Screen">
                    <FullscreenIcon/>
                </Tooltip>
            ) : (
                <Tooltip title="Exit Full Screen">
                    <FullscreenExitIcon/>
                </Tooltip>
            )}
        </IconButton>
    );
}