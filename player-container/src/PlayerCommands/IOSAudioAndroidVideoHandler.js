// components/IOSAudioAndroidVideoHandler.js
// Unified handler for iOS audio blocking + Android/iOS video autoplay blocking
import React, { useState, useEffect, useCallback } from 'react';
import { Alert, AlertTitle, Button } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { useTranslation } from 'react-i18next';

const IOSAudioAndroidVideoHandler = ({
    onPlay,
    handlePlayPause,
    theme,
    style = {},
    variant = 'banner' // 'banner' or 'alert'
}) => {
    const { t } = useTranslation();
    const [showPrompt, setShowPrompt] = useState(false);
    const [blockReason, setBlockReason] = useState(null); // 'audio', 'video', or null

    console.log('[IOSAudioAndroidVideoHandler] Component rendered with props:', {
        variant,
        showPrompt,
        blockReason,
        hasHandlePlayPause: !!handlePlayPause,
        hasOnPlay: !!onPlay
    });

    // Detect mobile devices
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    const isMobile = isIOS || isAndroid;

    // Install global video.play() interceptor for Android/iOS video blocking
    useEffect(() => {
        if (!isMobile) {
            console.log('[IOSAudioAndroidVideoHandler] Not a mobile device, skipping interceptor');
            return;
        }

        console.log('[IOSAudioAndroidVideoHandler] Installing video.play() interceptor for mobile');

        // Store original play method
        const originalPlay = HTMLVideoElement.prototype.play;

        // Override play method to catch NotAllowedError
        HTMLVideoElement.prototype.play = function() {
            const playPromise = originalPlay.call(this);

            // Handle the promise rejection
            return playPromise.catch(error => {
                if (error.name === 'NotAllowedError') {
                    console.log('[IOSAudioAndroidVideoHandler] ❌ Video play blocked - NotAllowedError detected');
                    setBlockReason('video');
                    setShowPrompt(true);

                    // Store video element for retry after user interaction
                    window._blockedVideoElements = window._blockedVideoElements || [];
                    if (!window._blockedVideoElements.includes(this)) {
                        window._blockedVideoElements.push(this);
                        console.log('[IOSAudioAndroidVideoHandler] Stored blocked video element, total:', window._blockedVideoElements.length);
                    }
                }
                // Re-throw error to preserve original behavior
                throw error;
            });
        };

        console.log('[IOSAudioAndroidVideoHandler] ✅ Video play interceptor installed');

        // Cleanup: restore original method on unmount
        return () => {
            HTMLVideoElement.prototype.play = originalPlay;
            console.log('[IOSAudioAndroidVideoHandler] Video play interceptor removed');
        };
    }, [isMobile]);

    // Check iOS AudioContext state
    useEffect(() => {
        if (!isIOS) {
            console.log('[IOSAudioAndroidVideoHandler] Not iOS, skipping AudioContext check');
            return;
        }

        console.log('[IOSAudioAndroidVideoHandler] iOS device detected, checking audio context...');

        const checkAudioContext = () => {
            console.log('[IOSAudioAndroidVideoHandler] Checking audio context...');

            if (window.AudioContext || window.webkitAudioContext) {
                const AudioContextClass = window.AudioContext || window.webkitAudioContext;
                console.log('[IOSAudioAndroidVideoHandler] AudioContext available:', !!AudioContextClass);

                if (!window.globalAudioContext) {
                    console.log('[IOSAudioAndroidVideoHandler] Creating new audio context');
                    window.globalAudioContext = new AudioContextClass();
                }

                const audioContext = window.globalAudioContext;
                console.log('[IOSAudioAndroidVideoHandler] Audio context state:', audioContext.state);

                if (audioContext.state === 'suspended') {
                    console.log('[IOSAudioAndroidVideoHandler] Audio context suspended - showing prompt');
                    setBlockReason('audio');
                    setShowPrompt(true);
                } else {
                    console.log('[IOSAudioAndroidVideoHandler] Audio context running - no prompt needed');
                }
            } else {
                console.log('[IOSAudioAndroidVideoHandler] No AudioContext available');
            }
        };

        // Check immediately and after delays
        checkAudioContext();
        setTimeout(checkAudioContext, 500);
        setTimeout(checkAudioContext, 1000);
    }, [isIOS]);

    // Enable media after user interaction
    const handleEnableMedia = useCallback(async () => {
        console.log('[IOSAudioAndroidVideoHandler] handleEnableMedia clicked, reason:', blockReason);

        try {
            // 1. Resume iOS AudioContext if needed
            if (isIOS && (window.AudioContext || window.webkitAudioContext)) {
                const AudioContextClass = window.AudioContext || window.webkitAudioContext;

                if (!window.globalAudioContext) {
                    window.globalAudioContext = new AudioContextClass();
                }

                const audioContext = window.globalAudioContext;
                console.log('[IOSAudioAndroidVideoHandler] Audio context state before resume:', audioContext.state);

                if (audioContext.state === 'suspended') {
                    await audioContext.resume();
                    console.log('[IOSAudioAndroidVideoHandler] ✅ Audio context resumed, new state:', audioContext.state);
                }
            }

            // 2. Retry blocked video elements (Android/iOS)
            if (window._blockedVideoElements && window._blockedVideoElements.length > 0) {
                console.log('[IOSAudioAndroidVideoHandler] Retrying', window._blockedVideoElements.length, 'blocked video(s)');

                for (const video of window._blockedVideoElements) {
                    try {
                        await video.play();
                        console.log('[IOSAudioAndroidVideoHandler] ✅ Video play retry successful');
                    } catch (retryError) {
                        console.warn('[IOSAudioAndroidVideoHandler] ⚠️ Video play retry failed:', retryError.name);
                    }
                }

                // Clear the blocked videos list
                window._blockedVideoElements = [];
            }

            // 3. Auto-unmute for fresh users (iOS needs this after enabling audio)
            const currentMutedValue = localStorage.getItem('wallmuse-muted');
            if (currentMutedValue === null || JSON.parse(currentMutedValue) === true) {
                console.log('[IOSAudioAndroidVideoHandler] Auto-unmuting (was:', currentMutedValue, ')');
                localStorage.setItem('wallmuse-muted', JSON.stringify(false));

                // Dispatch custom event to notify parent PlayerCommands
                window.dispatchEvent(new CustomEvent('wallmuse-unmute', { detail: { muted: false } }));
                console.log('[IOSAudioAndroidVideoHandler] ✅ Auto-unmute applied and event dispatched');
            }

            // 4. Mark that user has interacted (for future autoplay attempts)
            window._userHasInteracted = true;
            console.log('[IOSAudioAndroidVideoHandler] ✅ User interaction flag set');

            // 5. Hide prompt
            setShowPrompt(false);
            setBlockReason(null);

            // 6. Call provided callbacks
            if (handlePlayPause) {
                console.log('[IOSAudioAndroidVideoHandler] Calling handlePlayPause');
                handlePlayPause();
            } else if (onPlay) {
                console.log('[IOSAudioAndroidVideoHandler] Calling onPlay');
                onPlay();
            }

        } catch (err) {
            console.error('[IOSAudioAndroidVideoHandler] Error enabling media:', err);
        }
    }, [blockReason, isIOS, handlePlayPause, onPlay]);

    console.log('[IOSAudioAndroidVideoHandler] Render decision - showPrompt:', showPrompt);

    if (!showPrompt) {
        console.log('[IOSAudioAndroidVideoHandler] Not rendering - showPrompt is false');
        return null;
    }

    console.log('[IOSAudioAndroidVideoHandler] Rendering prompt with variant:', variant, 'reason:', blockReason);

    // Determine message based on block reason
    const getTitle = () => {
        if (blockReason === 'video') return t('videoBlocked', 'Video Blocked');
        if (blockReason === 'audio') return t('audioBlocked', 'Audio Blocked');
        return t('mediaBlocked', 'Media Blocked');
    };

    const getMessage = () => {
        if (blockReason === 'video') return t('tapToEnableVideo', 'Tap to enable video playback');
        if (blockReason === 'audio') return t('tapToEnableAudio', 'Tap to enable audio playback');
        return t('tapToEnablePlayback', 'Tap to enable playback');
    };

    // Alert variant
    if (variant === 'alert') {
        return (
            <Alert
                severity="info"
                sx={{
                    mb: 2,
                    ...style,
                    '& .MuiAlert-message': {
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        width: '100%',
                        justifyContent: 'space-between'
                    }
                }}
            >
                <div>
                    <AlertTitle>{getTitle()}</AlertTitle>
                    {getMessage()}
                </div>
                <Button
                    variant="contained"
                    size="small"
                    startIcon={<PlayArrowIcon />}
                    onClick={handleEnableMedia}
                    sx={{ ml: 2, flexShrink: 0 }}
                >
                    {t('enablePlayback', 'Enable')}
                </Button>
            </Alert>
        );
    }

    // Banner variant (default)
    return (
        <div
            onClick={handleEnableMedia}
            style={{
                backgroundColor: theme?.palette?.primary?.main,
                color: theme?.palette?.primary?.contrastText,
                padding: '12px 16px',
                margin: '8px 16px',
                borderRadius: '8px',
                cursor: 'pointer',
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: theme?.shadows?.[2] || '0px 2px 4px rgba(0,0,0,0.1)',
                transition: 'all 0.1s ease',
                ...style
            }}
        >
            <PlayArrowIcon />
            {t("tap.to.play")}
        </div>
    );
};

export default IOSAudioAndroidVideoHandler;
