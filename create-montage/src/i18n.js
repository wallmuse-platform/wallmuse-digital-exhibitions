import i18n from "i18next";
import translationEN from "./locales/en/translationEN.json";
import translationFR from "./locales/fr/translationFR.json";
import translationDE from "./locales/de/translationDE.json";
import translationES from "./locales/es/translationES.json";
import translationHR from "./locales/hr/translationHR.json";
import translationIT from "./locales/it/translationIT.json";
import translationJP from "./locales/jp/translationJP.json";
import translationNL from "./locales/nl/translationNL.json";
import translationNO from "./locales/no/translationNO.json";
import translationPL from "./locales/pl/translationPL.json";
import translationPT from "./locales/pt/translationPT.json";
import translationUA from "./locales/ua/translationUA.json";

import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

const getLangFromDocument = () => {
    const lang = document.documentElement.lang ?
        document.documentElement.lang.split('-')[0] : 'en';
    console.log('[i18n] Detected document language:', lang);
    return lang;
};

const getLang = () => {
    const lang = getLangFromDocument();
    console.log('[i18n] Detected language:', lang);
    return lang;
}

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            en: { translation: translationEN },
            fr: { translation: translationFR },
            de: { translation: translationDE },
            es: { translation: translationES },
            hr: { translation: translationHR },
            it: { translation: translationIT },
            jp: { translation: translationJP },
            nl: { translation: translationNL },
            no: { translation: translationNO },
            pl: { translation: translationPL },
            pt: { translation: translationPT },
            ua: { translation: translationUA },
        },
        lng: getLang(),
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