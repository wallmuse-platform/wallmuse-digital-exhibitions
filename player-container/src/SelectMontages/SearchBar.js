import React from 'react';
import { TextField, InputAdornment, IconButton } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { currentTheme } from '../theme/ThemeUtils';

/**
 * SearchBar Component
 *
 * Provides search functionality for montages with:
 * - Search input for filtering by name, author, or description
 * - Clear button to reset search
 * - Integration with URL parameters (handled by parent)
 *
 * @param {string} searchTerm - Current search term
 * @param {function} onSearchChange - Callback when search term changes
 * @param {function} onSearch - Callback when search is triggered (Enter key or search icon)
 */
const SearchBar = ({ searchTerm, onSearchChange, onSearch }) => {
  const { t } = useTranslation();

  const handleSearchChange = (event) => {
    const value = event.target.value;
    onSearchChange(value);

    // Don't trigger search on every keystroke - only on Enter or when user stops typing
    // The parent component will handle the filtering via useEffect
  };

  const handleClear = () => {
    onSearchChange('');
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      event.target.blur(); // Remove focus from input
      // Trigger scroll to montages section when Enter is pressed
      if (onSearch) {
        setTimeout(() => {
          onSearch();
        }, 300); // Small delay to ensure filtering completes
      }
    }
  };

  return (
    <TextField
      fullWidth
      variant="outlined"
      placeholder={t("search_montages.placeholder." + currentTheme()) || "Search..."}
      value={searchTerm}
      onChange={handleSearchChange}
      onKeyPress={handleKeyPress}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon />
          </InputAdornment>
        ),
        endAdornment: searchTerm && (
          <InputAdornment position="end">
            <IconButton
              aria-label="clear search"
              onClick={handleClear}
              edge="end"
              size="small"
            >
              <ClearIcon />
            </IconButton>
          </InputAdornment>
        ),
      }}
      sx={{
        marginBottom: 2,
        '& .MuiOutlinedInput-root': {
          backgroundColor: 'background.paper',
          paddingRight: '14px',
          paddingLeft: '14px',
        },
        '& .MuiInputBase-input': {
          padding: '16.5px 8px', // Added horizontal padding so text doesn't touch icons
        },
        '& .MuiInputAdornment-root': {
          height: '100%',
          maxHeight: 'none',
        }
      }}
    />
  );
};

SearchBar.propTypes = {
  searchTerm: PropTypes.string.isRequired,
  onSearchChange: PropTypes.func.isRequired,
  onSearch: PropTypes.func,
};

export default SearchBar;
