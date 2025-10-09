import React from 'react';
import PropTypes from 'prop-types';
import i18n from 'i18next';
import { allLanguages } from '../utils/LanguageUtils'; // Assuming this is the provided allLanguages data

// Create a mapping from two-letter to three-letter language codes
const twoToThreeLetterMap = (() => {
  const map = {};
  allLanguages.forEach(({ code }) => {
    const shortCode = code.slice(0, 2); // Take the first two letters of the three-letter code
    if (!map[shortCode]) {
      map[shortCode] = code; // Map two-letter to three-letter
    }
  });
  return map;
})();

const mapLanguageCode = (i18nLang) => {
  const shortLang = i18nLang.split('-')[0]; // Handle cases like "en-US"
  const threeLetterCode = twoToThreeLetterMap[shortLang];

  if (threeLetterCode) {
    console.log(`[mapLanguageCode] Mapped two-letter code "${shortLang}" to three-letter code "${threeLetterCode}"`);
    return threeLetterCode;
  } else {
    console.error(`[mapLanguageCode] No mapping found for language "${shortLang}"`);
    return null;
  }
};

function DescriptionManager({ descs, bestDescription, bestName }) {
  const [desc, setDesc] = React.useState('');

  React.useEffect(() => {
    console.log("[DescriptionManager] useEffect descs, bestDescription, bestName:", descs, bestDescription, bestName);

    const language = i18n.language; // e.g., "en"
    const threeLetterCode = mapLanguageCode(language) || 'eng'; // Default to English if no match

    console.log("[DescriptionManager] Current i18n.language:", language);
    console.log("[DescriptionManager] Mapped three-letter code:", threeLetterCode);
    console.log("[DescriptionManager] Full descriptions array:", descs);
    console.log("[DescriptionManager] Available languages in descs:", descs?.map(desc => desc.language));

    if (descs && descs.length > 0) {
      const foundDesc = descs.find(desc => desc.language === threeLetterCode);

      if (foundDesc) {
        setDesc(foundDesc.description);
      } else if (bestDescription) {
        setDesc(`No description available in your language (${language}). Best available description is in ${bestName || 'English'}: ${bestDescription}`);
      } else {
        setDesc('No Description Available.');
      }
    } else {
      setDesc(bestDescription || 'No Description Available.');
    }
  }, [descs, bestDescription, bestName]);

  return <>{desc}</>;
}

DescriptionManager.propTypes = {
  descs: PropTypes.arrayOf(
    PropTypes.shape({
      language: PropTypes.string.isRequired,
      description: PropTypes.string.isRequired,
    })
  ),
  bestDescription: PropTypes.string, // Optional bestDescription prop
  bestName: PropTypes.string,        // Language of the bestDescription
};

export default DescriptionManager;