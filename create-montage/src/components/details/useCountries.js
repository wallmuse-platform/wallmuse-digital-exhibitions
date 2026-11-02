// useCountries.js
import { useTranslation } from 'react-i18next';
import countriesEN from '../../locales/en/countriesEN.json';
import countriesFR from '../../locales/fr/countriesFR.json';

const LOCALE_MAP = { fr: countriesFR };

export const useCountries = () => {
  const { i18n, t } = useTranslation();
  const lang = (i18n.language || 'en').split('-')[0];
  const localeData = LOCALE_MAP[lang] || countriesEN;

  const countries = Object.entries(localeData).map(([value, label]) => ({ value, label }));
  countries.unshift({ value: 'ALL', label: t('countries.all', 'All Countries') });

  return countries;
};
