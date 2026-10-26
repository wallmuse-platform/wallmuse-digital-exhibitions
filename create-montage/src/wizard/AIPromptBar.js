import React from 'react';
import { Box, Alert, Button, Tooltip } from '@mui/material';
import AutoFixHighOutlinedIcon from '@mui/icons-material/AutoFixHighOutlined';

function AIPromptBar() {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
      <Alert severity="info" sx={{ flex: 1, fontSize: '0.85rem', py: 0.5 }}>
        Describe what you want — e.g. <strong>&#x201C;3-track exhibition of Zimmermann calligraphy sorted by date&#x201D;</strong>
      </Alert>
      <Tooltip title="AI assistance coming soon">
        <Button
          variant="outlined"
          size="small"
          startIcon={<AutoFixHighOutlinedIcon />}
          sx={{ whiteSpace: 'nowrap' }}
        >
          Parse
        </Button>
      </Tooltip>
    </Box>
  );
}

export default AIPromptBar;
