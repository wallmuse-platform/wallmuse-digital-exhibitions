// UrlUtils.js - URL generation utilities for navigation between apps

import { currentTheme } from '../theme/ThemeUtils';
import i18n from '../i18n';

/**
 * Get the appropriate sign-up link based on current theme and language
 * @returns {string} Sign-up URL
 */
export const getSignUpLink = () => {
  const language = i18n.language;
  const theme = currentTheme();

  if (theme === "wallmuse") {
    return 'https://wallmuse.com/sign-up/';
  } else if (theme === "ooo2") {
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
    const langParam = language !== 'en' ? `?lang=${language}` : '';

    return `https://ooo2.wallmuse.com/${path}${langParam}`;
  } else if (theme === "sharex") {
    return 'https://sharex.wallmuse.com/sign-up/';
  } else {
    // Fallback for other themes
    return `https://${theme}.wallmuse.com/sign-up/`;
  }
};

/**
 * Get the Play app URL based on current theme
 * @returns {string} Play app URL
 */
export const getPlayAppUrl = () => {
  const theme = currentTheme();
  const language = i18n.language;
  const langParam = language !== 'en' ? `?lang=${language}` : '';

  if (theme === "wallmuse") {
    return `https://wallmuse.com/${langParam}`;
  } else if (theme === "ooo2") {
    return `https://ooo2.wallmuse.com/${langParam}`;
  } else if (theme === "sharex") {
    return `https://sharex.wallmuse.com/play-2/${langParam}`;
  } else {
    // Fallback for other themes
    return `https://${theme}.wallmuse.com/${langParam}`;
  }
};

/**
 * Build a URL with create_guest parameter for redirecting to Play app
 * @returns {string} Play app URL with create_guest parameter
 */
export const getGuestCreationUrl = () => {
  const playUrl = getPlayAppUrl();
  const separator = playUrl.includes('?') ? '&' : '?';
  return `${playUrl}${separator}create_guest=true`;
};
