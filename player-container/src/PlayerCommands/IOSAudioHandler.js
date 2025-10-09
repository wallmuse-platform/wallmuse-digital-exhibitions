// components/IOSAudioHandler.js
import React, { useState, useEffect, useCallback } from 'react';
import { Alert, AlertTitle, Button } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { useTranslation } from 'react-i18next';

const IOSAudioHandler = ({
    onPlay,
    handlePlayPause,
    theme,
    style = {},
    variant = 'banner' // 'banner' or 'alert'
}) => {
    const { t } = useTranslation();
    const [showPrompt, setShowPrompt] = useState(false);

     console.log('[IOSAudioHandler] Component rendered with props:', {
        variant,
        showPrompt,
        hasHandlePlayPause: !!handlePlayPause,
        hasOnPlay: !!onPlay
    });

    // Detect iOS autoplay blocking
    useEffect(() => {
        console.log('[IOSAudioHandler] useEffect triggered');

        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        console.log('[IOSAudioHandler] iOS detection:', isIOS);

        if (isIOS) {
            console.log('[IOSAudioHandler] iOS device detected, checking audio context...');

            const checkAudioContext = () => {
                console.log('[IOSAudioHandler] Checking audio context...');

                if (window.AudioContext || window.webkitAudioContext) {
                    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
                    console.log('[IOSAudioHandler] AudioContext available:', !!AudioContextClass);

                    if (!window.globalAudioContext) {
                        console.log('[IOSAudioHandler] Creating new audio context');
                        window.globalAudioContext = new AudioContextClass();
                    }

                    const audioContext = window.globalAudioContext;
                    console.log('[IOSAudioHandler] Audio context state:', audioContext.state);

                    if (audioContext.state === 'suspended') {
                        console.log('[IOSAudioHandler] Audio context suspended - showing prompt');
                        setShowPrompt(true);
                    } else {
                        console.log('[IOSAudioHandler] Audio context running - no prompt needed');
                    }
                } else {
                    console.log('[IOSAudioHandler] No AudioContext available');
                }
            };

            // Check immediately and after delay
            checkAudioContext();
            setTimeout(checkAudioContext, 500);
            setTimeout(checkAudioContext, 1000); // Check again after 1 second
        } else {
            console.log('[IOSAudioHandler] Not iOS device');
        }
    }, []);

    // Enable audio on iOS
    const handleEnableAudio = useCallback(async () => {
        console.log('[IOSAudioHandler] handleEnableAudio clicked');

        if (window.AudioContext || window.webkitAudioContext) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;

            if (!window.globalAudioContext) {
                window.globalAudioContext = new AudioContextClass();
            }

            const audioContext = window.globalAudioContext;
            console.log('[IOSAudioHandler] Audio context state before resume:', audioContext.state);

            try {
                await audioContext.resume();
                console.log('[IOSAudioHandler] Audio context resumed successfully, state:', audioContext.state);
                setShowPrompt(false);
                // Use handlePlayPause if provided, otherwise fall back to onPlay
                if (handlePlayPause) {
                    console.log('[IOSAudioHandler] Calling handlePlayPause');
                    handlePlayPause();
                } else if (onPlay) {
                    console.log('[IOSAudioHandler] Calling onPlay');
                    onPlay();
                } else {
                    console.warn('[IOSAudioHandler] No onPlay function provided');
                }
            } catch (err) {
                console.error('[IOSAudioHandler] Failed to resume audio:', err);
            }
        } else {
            console.warn('[IOSAudioHandler] No AudioContext available for enable');
        }
    }, [handlePlayPause, onPlay]);

    console.log('[IOSAudioHandler] Render decision - showPrompt:', showPrompt);

    if (!showPrompt) {
        console.log('[IOSAudioHandler] Not rendering - showPrompt is false');
        return null;
    }

    console.log('[IOSAudioHandler] Rendering prompt with variant:', variant);

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
                    <AlertTitle>{t('audioBlocked', 'Audio Blocked')}</AlertTitle>
                    {t('tapToEnableAudio', 'Tap to enable audio playback on iOS')}
                </div>
                <Button
                    variant="contained"
                    size="small"
                    startIcon={<PlayArrowIcon />}
                    onClick={handleEnableAudio}
                    sx={{ ml: 2, flexShrink: 0 }}
                >
                    {t('enableAudio', 'Enable Audio')}
                </Button>
            </Alert>
        );
    }

    // Banner variant (default)
    return (
        <div
            onClick={handleEnableAudio}
            style={{
                backgroundColor: theme?.palette?.primary?.main,
                color: theme?.palette?.primary?.contrastText,
                padding: '12px 16px',
                margin: '8px 16px',
                borderRadius: '8px', // Rounded corners
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

export default IOSAudioHandler;