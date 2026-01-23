// useCountries.js
import countriesEN from '../../locales/en/countriesEN.json';
import countriesFR from '../../locales/fr/countriesFR.json';

export const useCountries = (lang = 'en') => {
  const localeData = lang === 'fr' ? countriesFR : countriesEN;

  const countries = Object.entries(localeData).map(([value, label]) => ({
    value,
    label,
  }));

  // Add the 'ALL' option manually if not in the JSON
  countries.unshift({ value: 'ALL', label: 'All Countries' });

  return countries;
};