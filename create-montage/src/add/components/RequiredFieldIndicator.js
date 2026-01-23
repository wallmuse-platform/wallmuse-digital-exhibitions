// Updated RequiredFieldIndicator.js with proper translation support

import React from 'react';
import { Typography, Box, Tooltip } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { useTranslation } from 'react-i18next'; // Import useTranslation hook

/**
 * Component to display required field indicators and validation messages
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.isRequired - Whether the field is required
 * @param {boolean} props.isValid - Whether the field value is valid
 * @param {string} props.message - Error message to display when invalid
 * @param {boolean} props.showIndicator - Whether to show the indicator even when valid
 * @param {Function} props.t - Translation function (optional, component will use its own if not provided)
 */
export const RequiredFieldIndicator = ({ 
  isRequired = true, 
  isValid = true, 
  message, 
  showIndicator = true,
  t: translationFn // Accept t function as an optional prop
}) => {
  // Use provided translation function or get our own
  const { t: internalT } = useTranslation();
  const t = translationFn || internalT;
  
  // Default message with translation
  const defaultMessage = t('This field is required');
  const displayMessage = message || defaultMessage;
  
  // Don't show anything if not required and not showing indicators
  if (!isRequired && !showIndicator) return null;
  
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', ml: 1 }}>      
      {/* Show error icon when invalid */}
      {!isValid && (
        <Tooltip title={displayMessage}>
          <ErrorOutlineIcon color="error" sx={{ fontSize: 16, ml: 0.5 }} />
        </Tooltip>
      )}
    </Box>
  );
};

export default RequiredFieldIndicator;