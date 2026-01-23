// CustomCheckbox.js

import React from 'react';
import { Checkbox, FormControlLabel } from '@mui/material';
import { useTheme } from '@mui/material/styles';

function CustomCheckbox({ label, checked, onChange, name }) {
  const theme = useTheme();

  return (
    <FormControlLabel
      control={
        <Checkbox
          checked={checked}
          onChange={(e) => onChange(name, e.target.checked)} // Passing name and checked status to the parent
          name={name}
          sx={{
            color: theme.palette.primary.main, // Use theme color for checkbox
            '&.Mui-checked': {
              color: theme.palette.primary.main, // Color when checked
            },
          }}
        />
      }
      label={label}
    />
  );
}

export default CustomCheckbox;