// GuestActionPopup.js

import React, { useState } from 'react';
import { useTranslation } from "react-i18next";
import CloseIcon from '@mui/icons-material/Close';
import { cloneGuest } from '../accounts/cloneGuest';
import i18n from 'i18next';
import { Button, IconButton } from '@mui/material';
import { useResponsive } from '../utils/useResponsive';
/**
 * Popup component for guest user actions
 */
const GuestActionPopup = ({
  onClose,
  onContinueWithTemp,
  theme,
  currentTheme,
  updateSession,
  isPremiumContent = false
}) => {
  const { t } = useTranslation();
  const { isMobile, isTablet } = useResponsive();

  console.log('[GuestActionPopup] Rendering popup. isPremiumContent:', isPremiumContent, 'currentTheme:', currentTheme);

  const [isCreating, setIsCreating] = useState(false);

  // Determine if we're on ooo2 theme (only has free content)
  const isOoo2Theme = currentTheme === 'ooo2' || window.location.hostname.includes('ooo2');

  // Generate appropriate sign up link based on theme
  const getSignUpLink = () => {
    const language = i18n.language;
    const langParam = language !== 'en' ? `?lang=${language}` : '';

    if (currentTheme === "wallmuse") {
      return 'https://wallmuse.com/sign-up/';
    } else if (currentTheme === "ooo2") {
      // Special case for ooo2 theme
      // Map language codes to their respective URL paths
      const langPathMap = {
        'en': 'product/free-accounts/',
        'fr': 'produit/compte-gratuit/',
        'es': 'producto/cuenta-gratuita/',
        'de': 'produkt/kostenloses-konto/',
        'it': 'prodotto/account-gratuito/',
        'pt': 'produto/contas-gratuitas/',
        'nl': 'product/gratis-account/',
        'no': 'produkt/gratis-konto/',
        'uk': 'product/безкоштовний-обліковий-запис/',
        'pl': 'produkt/darmowe-konto/',
        'hr': 'proizvod/besplatni-racun/'
      };

      // Get the appropriate path for the current language
      const path = langPathMap[language] || langPathMap['en']; // Default to English path

      return `https://ooo2.wallmuse.com/${path}${langParam}`;
    } else {
      return `https://${currentTheme}.wallmuse.com/sign-up/`;
    }
  };

  // Handle temporary account creation
  const handleGuestAccount = async () => {
    try {
      setIsCreating(true); //  KEEP: Shows loading state on button
      console.log('[GuestActionPopup] Creating temporary account');

      // ⚠️ MODIFY: This part might be causing issues
      // Instead of setting localStorage directly, just dispatch the event
      // localStorage.setItem('currentSetupPhase', 'preparing'); // Remove this line
      window.dispatchEvent(new CustomEvent('account-phase-change', {
        detail: { phase: 'preparing' }
      }));

      const result = await cloneGuest(updateSession); //  KEEP: Core functionality
      console.log('[GuestActionPopup] Temporary account created:', result);

      //  KEEP: Core callback functionality
      if (onContinueWithTemp && typeof onContinueWithTemp === 'function') {
        console.log('[GuestActionPopup] Calling onContinueWithTemp with result');
        onContinueWithTemp(result);
      } else {
        console.error('[GuestActionPopup] onContinueWithTemp is not a function');
      }

      //  KEEP: Closing the popup
      if (onClose && typeof onClose === 'function') {
        console.log('[GuestActionPopup] Calling onClose');
        onClose();
      } else {
        console.error('[GuestActionPopup] onClose is not a function');
      }
    } catch (error) {
      console.error('[GuestActionPopup] Error creating temporary account:', error);
      // ⚠️ MODIFY: This might be related to the issue
      // localStorage.removeItem('currentSetupPhase'); // Remove this line
      alert(t('temp_account_error') || 'Error creating temporary account. Please try again.');
    } finally {
      setIsCreating(false); //  KEEP: Resets loading state
    }
  };

  // Handle sign up
  const handleSignUp = () => {
    const signUpLink = getSignUpLink();
    console.log('[GuestActionPopup] Redirecting to sign up page:', signUpLink);
    window.location.href = signUpLink;
  };

  // Determine if we should show premium content message
  const showPremiumMessage = isPremiumContent && !isOoo2Theme;
  console.log('[GuestActionPopup] showPremiumMessage:', showPremiumMessage);

  // Close button handler - ensure it's a proper function
  const handleClose = () => {
    console.log('[GuestActionPopup] Close button clicked');
    if (onClose && typeof onClose === 'function') {
      onClose();
    } else {
      console.error('[GuestActionPopup] onClose is not a function or not provided');
    }
  };
  // Responsive font sizes
  const fontSize = {
    title: isMobile ? '18px' : isTablet ? '20px' : '24px',
    message: isMobile ? '13px' : isTablet ? '14px' : '15px',
    buttonTitle: isMobile ? '13px' : isTablet ? '14px' : '16px',
    features: isMobile ? '11px' : isTablet ? '12px' : '13px',
  };

  // Colors from MontageSelection
  const freeColor = 'rgb(14, 230, 172)'; // Green
  const premiumColor = 'rgb(21, 86, 237)'; // Blue

  // Guest account features
  const guestFeatures = [
    { text: t('guest_feature_1') || 'Web features' },
    { text: t('guest_feature_2') || 'Browser only' },
    { text: t('guest_feature_3') || 'Session-based' },
    { text: t('guest_feature_4') || 'Free', color: freeColor },
  ];

  // Personal account features (differs by domain)
  const personalFeatures = isOoo2Theme ? [
    { text: t('personal_feature_1') || 'Web + PC app features' },
    { text: t('personal_feature_2') || 'Multi-display sync' },
    { text: t('personal_feature_3') || 'Saved forever' },
    { text: 'Free', color: freeColor },
  ] : [
    { text: t('personal_feature_1') || 'Web + PC app features' },
    { text: t('personal_feature_2') || 'Multi-display sync' },
    { text: t('personal_feature_3') || 'Saved forever' },
    {
      isMultiColor: true,
      parts: [
        { text: 'Free', color: freeColor },
        { text: ' | ', color: theme.palette.text.secondary },
        { text: 'Premium', color: premiumColor }
      ]
    },
  ];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        position: 'relative',
        background: theme.palette.background.paper,
        color: theme.palette.text.primary,
        padding: isMobile ? '15px' : '20px',
        borderRadius: '8px',
        maxWidth: isMobile ? '95%' : isTablet ? '500px' : '600px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
      }}>
        {/* Close button */}
        <button
          onClick={handleClose}
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: theme.palette.text.secondary,
            padding: '5px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <CloseIcon />
        </button>

        <h3 style={{
          margin: '0 0 15px 0',
          color: theme.palette.primary.main,
          paddingRight: '30px',
          fontSize: fontSize.title
        }}>
          {showPremiumMessage
            ? (t('premium_content_title') || 'Premium Content')
            : (t('account_creation_title') || 'Account Creation')}
        </h3>

        {/* Premium content message */}
        {showPremiumMessage && (
          <p style={{ marginBottom: '20px', fontSize: fontSize.message }}>
            {t('premium_content_message') || 'This content requires a premium subscription. Subscribe now to unlock all features.'}
          </p>
        )}

        {/* Standard message for free content */}
        {!showPremiumMessage && (
          <p style={{ marginBottom: '20px', fontSize: fontSize.message }}>
            {t('account_options_message') || 'You need an account to perform this action. Choose an option:'}
          </p>
        )}

        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'center',
          marginTop: '20px',
          gap: isMobile ? '15px' : '20px'
        }}>
          {/* Only show guest account option for free content */}
          {!showPremiumMessage && (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px'
            }}>
              <Button
                onClick={handleGuestAccount}
                variant="contained"
                color="secondary"
                disabled={isCreating}
                sx={{
                  width: '100%',
                  minWidth: isMobile ? '100%' : '180px',
                  padding: isMobile ? '8px 12px' : '10px 16px',
                  fontSize: fontSize.buttonTitle,
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
                  }
                }}
              >
                {isCreating ?
                  (t('creating_account') || 'Creating...') :
                  (t('guest_account_button') || 'GUEST ACCOUNT')}
              </Button>

              {/* Guest features list */}
              <ul style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                textAlign: 'left',
                fontSize: fontSize.features,
                lineHeight: '1.8',
                color: theme.palette.text.secondary,
                width: '100%'
              }}>
                {guestFeatures.map((feature, index) => (
                  <li key={index} style={{
                    marginBottom: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <span style={{ color: freeColor, fontSize: '14px', flexShrink: 0 }}>✓</span>
                    {feature.isMultiColor ? (
                      <span>
                        {feature.parts.map((part, partIndex) => (
                          <span key={partIndex} style={{
                            color: part.color || 'inherit',
                            fontWeight: part.fontWeight || 'normal'
                          }}>
                            {part.text}
                          </span>
                        ))}
                      </span>
                    ) : (
                      <span style={{ color: feature.color || 'inherit' }}>
                        {feature.text}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px'
          }}>
            <Button
              onClick={handleSignUp}
              variant="contained"
              color="primary"
              disabled={isCreating}
              sx={{
                width: '100%',
                minWidth: isMobile ? '100%' : '180px',
                padding: isMobile ? '8px 12px' : '10px 16px',
                fontSize: fontSize.buttonTitle,
                fontWeight: 'bold',
                textTransform: 'uppercase',
                transition: 'all 0.2s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
                }
              }}
            >
              {showPremiumMessage ?
                (t('subscribe_now') || 'Subscribe Now') :
                (t('personal_account_button') || 'PERSONAL ACCOUNT')}
            </Button>

            {/* Personal account features list */}
            {!showPremiumMessage && (
              <ul style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                textAlign: 'left',
                fontSize: fontSize.features,
                lineHeight: '1.8',
                color: theme.palette.text.secondary,
                width: '100%'
              }}>
                {personalFeatures.map((feature, index) => (
                  <li key={index} style={{
                    marginBottom: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <span style={{ color: freeColor, fontSize: '14px', flexShrink: 0 }}>✓</span>
                    {feature.isMultiColor ? (
                      <span>
                        {feature.parts.map((part, partIndex) => (
                          <span key={partIndex} style={{
                            color: part.color || 'inherit',
                            fontWeight: part.fontWeight || 'normal'
                          }}>
                            {part.text}
                          </span>
                        ))}
                      </span>
                    ) : (
                      <span style={{ color: feature.color || 'inherit' }}>
                        {feature.text}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuestActionPopup;