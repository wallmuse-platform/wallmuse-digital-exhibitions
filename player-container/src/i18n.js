// i18n.js

import i18n from "i18next";
import translationEN from "./locales/en/translationEN.json";
import translationHR from "./locales/hr/translationHR.json";
import translationNL from "./locales/nl/translationNL.json";
import translationFR from "./locales/fr/translationFR.json";
import translationDE from "./locales/de/translationDE.json";
import translationIT from "./locales/it/translationIT.json";
import translationNO from "./locales/no/translationNO.json";
import translationPT from "./locales/pt/translationPT.json";
import translationUA from "./locales/ua/translationUA.json";
import translationPL from "./locales/pl/translationPL.json";
import translationES from "./locales/es/translationES.json";
import translationJP from "./locales/jp/translationJP.json";

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
    //import Backend from "i18next-http-backend";

    .use(LanguageDetector)
    .use(initReactI18next)
    //.use(Backend)
    .init({
        resources: {
            en: { translation: translationEN },
            hr: { translation: translationHR },
            nl: { translation: translationNL },
            fr: { translation: translationFR },
            de: { translation: translationDE },
            it: { translation: translationIT },
            no: { translation: translationNO },
            pt: { translation: translationPT },
            ua: { translation: translationUA },
            pl: { translation: translationPL },
            es: { translation: translationES },
            jp: { translation: translationJP },
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