// AIPromptBar.js — Stub for future AI prompt assistance

import React from 'react';
import { Box, TextField, Button, Typography } from '@mui/material';
import AutoFixHighOutlinedIcon from '@mui/icons-material/AutoFixHighOutlined';

function AIPromptBar({ onParsed }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 2, opacity: 0.5, pointerEvents: 'none' }}>
      <TextField
        fullWidth
        size="small"
        multiline
        maxRows={2}
        placeholder={'Describe what you want — e.g. \u201c3-track montage of Zimmermann calligraphy sorted by date, copyright\u201d (AI assistance coming soon)'}
        disabled
        InputProps={{ readOnly: true }}
      />
      <Button
        variant="outlined"
        size="small"
        disabled
        startIcon={<AutoFixHighOutlinedIcon />}
        sx={{ whiteSpace: 'nowrap', mt: '1px' }}
      >
        Parse
      </Button>
    </Box>
  );
}

export default AIPromptBar;
