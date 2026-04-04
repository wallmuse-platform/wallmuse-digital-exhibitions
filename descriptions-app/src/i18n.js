/**
 * i18n.js — Wallmuse Descriptions App, internationalisation setup
 *
 * PURPOSE (see docs/DESCRIPTIONS_APP_ARCHITECTURE.md §3)
 * Initialises react-i18next with EN and FR translation resources.
 *
 * CURRENT STATE — partially implemented:
 * The i18n framework is initialised and the useTranslation hook is imported
 * in App.js, but t() is NOT currently called for artwork content.
 * Artwork titles, descriptions, and metadata come directly from the backend
 * API in whatever language is stored per-artwork in the Wallmuse CMS.
 * Language is therefore determined server-side, not client-side.
 *
 * WHAT i18n IS (and could be) USED FOR:
 * - Currently: not actively used for rendered text.
 * - Future use: static UI labels such as "Location:", "Artwork Owner:",
 *   "Capture:" (currently hardcoded English in App.js footer).
 *   Add keys to translationEN.json and translationFR.json, then use
 *   t('location'), t('owner'), t('capture') in App.js.
 *
 * LANGUAGE DETECTION:
 * Uses i18next-browser-languagedetector which checks (in order):
 *   querystring (?lng=), localStorage, navigator.language, etc.
 * IMPORTANT: the default query parameter is ?lng= NOT ?lang=.
 * If the calling site (e.g. sharex.wallmuse.com) appends ?lang=fr, it
 * will NOT be detected. Either configure the detector to use 'lang'
 * as the lookupQuerystring, or ensure the caller uses ?lng=fr.
 *
 * TRANSLATION FILES:
 * src/locales/en/translationEN.json
 * src/locales/fr/translationFR.json
 * Currently contain static artwork fixture data (not connected to API).
 */
import i18n from "i18next";
import translationEN from "./locales/en/translationEN.json";
import translationFR from "./locales/fr/translationFR.json";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import Backend from "i18next-http-backend";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .use(Backend)
  .init({
    resources: {
      en: { translation: translationEN },
      fr: { translation: translationFR },
    },
    fallbackLng: "en",
    debug: true,

    ns: ["translations"],
    defaultNS: "translation",

    keySeparator: false,

    interpolation: {
      escapeValue: false,
    },
  });
export default i18n;
