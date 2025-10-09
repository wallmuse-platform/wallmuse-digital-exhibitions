import React, { useState, useEffect } from 'react';

// Material UI Components and Icons
import { Button } from "@mui/material";
import { sendSurveyToGA4 } from '../utils/api'

const ActivateAccount = ({ currentTheme, theme, t }) => {

    console.log('[ActivateAccount] Component rendering');
    console.log('[ActivateAccount] LocalStorage state:', {
        refreshShown: localStorage.getItem('refreshShown'),
        needsRefresh: localStorage.getItem('needsRefresh'),
        accountJustCreated: localStorage.getItem('accountJustCreated'),
        guestUserId: localStorage.getItem('guestUserId')
    });

    const [ageResponse, setAgeResponse] = useState('na');
    const [operaResponse, setOperaResponse] = useState('na');
    const [isCloneAccount, setIsCloneAccount] = useState(false);


    // Check if the current theme is ooo2 using hostname
    const isOoo2Theme = window.location.hostname.includes('ooo2');

    // Check if this is a newly created account
    useEffect(() => {
        console.log('[ActivateAccount] useEffect running');

        // Check if this is a newly created account
        const isNewlyCreated = localStorage.getItem('accountJustCreated') === 'true';
        console.log('[ActivateAccount] Is newly created account:', isNewlyCreated);

        if (isNewlyCreated) {
            setIsCloneAccount(true);
            console.log('[ActivateAccount] Set isNewAccount to true');
            localStorage.removeItem('accountJustCreated');
            console.log('[ActivateAccount] Removed accountJustCreated flag');
        }
    }, []);

    // Single-step function for activation
    const handleActivate = () => {

        // Check if activation already in progress
        if (localStorage.getItem('activationInProgress') === 'true') {
            console.log('[ActivateAccount] Activation already in progress, ignoring');
            return;
        }

        // Set flag to prevent multiple activations
        localStorage.setItem('activationInProgress', 'true');

        console.log('[ActivateAccount] handleActivate start');
        // If user answered any survey questions, send to GA4
        if (ageResponse !== 'na' || operaResponse !== 'na') {
            sendSurveyToGA4(ageResponse, operaResponse);

            // Record survey as submitted in localStorage
            localStorage.setItem(`${window.location.hostname}_survey_submitted`, 'true');
        }

        // Set a flag to indicate refresh has occurred and this popup should close
        localStorage.setItem('activationComplete', 'true');

         // Initialize empty data structures for new accounts if needed
        if (isCloneAccount) {
            try {
                // Initialize empty arrays in localStorage for new accounts
                if (!localStorage.getItem('playlists')) {
                    localStorage.setItem('playlists', JSON.stringify([]));
                }
                if (!localStorage.getItem('environments')) {
                    localStorage.setItem('environments', JSON.stringify([]));
                }
                if (!localStorage.getItem('montages')) {
                    localStorage.setItem('montages', JSON.stringify([]));
                }
                console.log('[ActivateAccount] Initialized empty data structures for new account');
            } catch (e) {
                console.error('[ActivateAccount] Error initializing data structures:', e);
            }
        }

        // Clear previous refresh flags to avoid loops
        localStorage.removeItem('needsRefresh');
        localStorage.removeItem('refreshShown');

        // Force page refresh only if not a new account (since we just refreshed)
        if (!isCloneAccount) {
            // For existing accounts - use needsSecondRefresh directly (not both flags)
            console.log('[ActivateAccount l.90] Using needsSecondRefresh for existing account');
            localStorage.setItem('needsSecondRefresh', 'true');
            // Set refresh counter to track attempts
            localStorage.setItem('refreshAttempts', '1');
            window.location.reload(true);
        } else {
            // For new accounts, just close the popup without refreshing again
            console.log('[ActivateAccount] Closing popup for new account');
            window.dispatchEvent(new CustomEvent('activation-complete'));
            // Clear the activation in progress flag
            setTimeout(() => {
                localStorage.removeItem('activationInProgress');
            }, 500);
        }
    };

    // Style for option buttons
    const optionButtonStyle = (selected) => ({
        background: selected ? theme.palette.primary.main : theme.palette.background.paper,
        color: selected ? theme.palette.background.paper : theme.palette.text.primary,
        border: `1px solid ${selected ? theme.palette.primary.main : theme.palette.divider}`,
        padding: '8px 15px',
        borderRadius: '4px',
        cursor: 'pointer',
        margin: '0 5px',
        fontWeight: selected ? 'bold' : 'normal'
    });

    // Check if we should show the survey
    const shouldShowSurvey = isOoo2Theme &&
        !localStorage.getItem(`${window.location.hostname}_survey_submitted`);

    return (
        <div className="refresh-notification" style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: theme.palette.background.paper,
            color: theme.palette.text.primary,
            padding: '20px',
            borderRadius: '8px',
            zIndex: 1000,
            maxWidth: '400px',
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        }}>
            {/* Only show survey if not previously submitted and on ooo2 theme */}
            {shouldShowSurvey && (
                <div className="survey-section" style={{ marginBottom: '20px' }}>
                    <h3 style={{
                        marginTop: 0,
                        marginBottom: '15px',
                        color: theme.palette.primary.main
                    }}>
                        {t('Quick_Survey')}
                    </h3>

                    {/* Age Question */}
                    <div className="survey-question" style={{ marginBottom: '15px' }}>
                        <p style={{
                            fontWeight: 'bold',
                            marginBottom: '8px',
                            fontSize: '14px',
                            color: theme.palette.text.primary
                        }}>
                            {t('Are_you_30_or_younger')}
                        </p>
                        <div className="options">
                            <button
                                onClick={() => setAgeResponse('yes')}
                                style={optionButtonStyle(ageResponse === 'yes')}
                            >
                                {t('Yes')}
                            </button>
                            <button
                                onClick={() => setAgeResponse('no')}
                                style={optionButtonStyle(ageResponse === 'no')}
                            >
                                {t('No')}
                            </button>
                        </div>
                    </div>

                    {/* Opera Experience Question */}
                    <div className="survey-question" style={{ marginBottom: '15px' }}>
                        <p style={{
                            fontWeight: 'bold',
                            marginBottom: '8px',
                            fontSize: '14px',
                            color: theme.palette.text.primary
                        }}>
                            {t('Have_you_seen_opera')}
                        </p>
                        <div className="options">
                            <button
                                onClick={() => setOperaResponse('yes')}
                                style={optionButtonStyle(operaResponse === 'yes')}
                            >
                                {t('Yes')}
                            </button>
                            <button
                                onClick={() => setOperaResponse('no')}
                                style={optionButtonStyle(operaResponse === 'no')}
                            >
                                {t('No')}
                            </button>
                        </div>
                    </div>

                    <p style={{
                        fontSize: '12px',
                        fontStyle: 'italic',
                        opacity: 0.8,
                        margin: '10px 0',
                        color: theme.palette.text.secondary
                    }}>
                        {t('Survey_optional')}
                    </p>
                </div>
            )}

            {/* Main Activation Section - Always visible */}
            <h3 style={{
                margin: '0 0 15px 0',
                color: theme.palette.primary.main
            }}>
                {t('Complete_Setup')}
            </h3>
            <Button
                onClick={handleActivate}
                style={{ width: '80%' }}  // Fixed: removed extra }
                variant="contained"
                color="primary"
            >
                {t('Activate')}
            </Button>
        </div>
    );
};

export default ActivateAccount;