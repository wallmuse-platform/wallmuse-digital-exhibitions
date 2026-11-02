// GuestActionPopup.js - Simplified redirect-only version for CreateMontage

import React from 'react';
import { useTranslation } from "react-i18next";
import CloseIcon from '@mui/icons-material/Close';
import { Button } from '@mui/material';
import { getSignUpLink, getGuestCreationUrl } from '../utils/UrlUtils';

/**
 * Popup component for guest user actions
 * This version redirects to Play app for account creation instead of handling it locally
 */
const GuestActionPopup = ({
  onClose,
  theme,
  currentTheme,
  isPremiumContent = false
}) => {
  const { t } = useTranslation();

  console.log('[GuestActionPopup CreateMontage] Rendering popup. isPremiumContent:', isPremiumContent, 'currentTheme:', currentTheme);

  // Determine if we're on ooo2 theme (only has free content)
  const isOoo2Theme = currentTheme === 'ooo2' || window.location.hostname.includes('ooo2');

  // Handle guest account - redirect to Play app
  const handleGuestAccount = () => {
    console.log('[GuestActionPopup CreateMontage] Redirecting to Play app for guest account creation');
    const guestUrl = getGuestCreationUrl();
    console.log('[GuestActionPopup CreateMontage] Guest creation URL:', guestUrl);
    window.location.href = guestUrl;
  };

  // Handle sign up - redirect to sign-up page
  const handleSignUp = () => {
    const signUpLink = getSignUpLink();
    console.log('[GuestActionPopup CreateMontage] Redirecting to sign up page:', signUpLink);
    window.location.href = signUpLink;
  };

  // Determine if we should show premium content message
  const showPremiumMessage = isPremiumContent && !isOoo2Theme;
  console.log('[GuestActionPopup CreateMontage] showPremiumMessage:', showPremiumMessage);

  // Close button handler
  const handleClose = () => {
    console.log('[GuestActionPopup CreateMontage] Close button clicked');
    if (onClose && typeof onClose === 'function') {
      onClose();
    }
  };

  // Responsive sizes based on window width
  const isMobile = window.innerWidth < 600;
  const isTablet = window.innerWidth >= 600 && window.innerWidth < 960;

  const fontSize = {
    title: isMobile ? '18px' : isTablet ? '20px' : '24px',
    message: isMobile ? '13px' : isTablet ? '14px' : '15px',
    buttonTitle: isMobile ? '13px' : isTablet ? '14px' : '16px',
    features: isMobile ? '11px' : isTablet ? '12px' : '13px',
  };

  // Colors
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
                {t('guest_account_button') || 'GUEST ACCOUNT'}
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
                    <span style={{
                      color: feature.color || 'inherit',
                      fontWeight: feature.fontWeight || 'normal'
                    }}>
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Personal account section */}
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
              {showPremiumMessage
                ? (t('subscribe_button') || 'SUBSCRIBE NOW')
                : (t('personal_account_button') || 'PERSONAL ACCOUNT')}
            </Button>

            {/* Personal account features list */}
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
                  <span style={{ color: premiumColor, fontSize: '14px', flexShrink: 0 }}>✓</span>
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
                    <span style={{
                      color: feature.color || 'inherit',
                      fontWeight: feature.fontWeight || 'normal'
                    }}>
                      {feature.text}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuestActionPopup;
