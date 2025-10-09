// Configure/SessionsBanner.js - Inline banner for multiple sessions

import React, { useState, useEffect } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { checkMultipleActiveEnvironments } from '../utils/environmentUtils';

const SessionsBanner = ({ environments, handleDeactivateEnvironment }) => {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [multipleActiveInfo, setMultipleActiveInfo] = useState(null);

  useEffect(() => {
    if (!environments || environments.length === 0) {
      setShow(false);
      return;
    }

    const activeInfo = checkMultipleActiveEnvironments(environments);
    setMultipleActiveInfo(activeInfo);

    // Show banner if multiple environments are active and user hasn't dismissed it
    if (activeInfo.hasMultiple && !dismissed) {
      setShow(true);
    } else {
      setShow(false);
    }
  }, [environments, dismissed]);

  const handleDismiss = () => {
    setDismissed(true);
    setShow(false);
  };

  const onDeactivateClick = async (environmentId) => {
    try {
      if (handleDeactivateEnvironment) {
        await handleDeactivateEnvironment(environmentId);
      }
      // Reset dismissed state so banner can show again if needed
      setDismissed(false);
    } catch (error) {
      console.error('Error deactivating environment:', error);
    }
  };

  if (!show || !multipleActiveInfo?.hasMultiple) {
    return null;
  }

  return (
    <Box
      sx={{
        gridColumn: '1 / -1',
        gridRow: 'span 1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 2,
        py: 1,
        bgcolor: 'rgba(255, 152, 0, 0.1)',
        border: '1px solid rgba(255, 152, 0, 0.3)',
        borderRadius: 1,
        mx: 1,
        my: 0.5
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: '1rem' }}>
          🟡 <strong>{multipleActiveInfo.count} sessions active</strong> • Keep primary • End extras
        </Typography>

        {multipleActiveInfo.environments.slice(1).map((env, index) => (
          <Button
            key={env.id}
            size="small"
            variant="contained"
            color="warning"
            onClick={() => onDeactivateClick(env.id)}
            sx={{
              minWidth: 'auto',
              fontSize: '0.75rem',
              py: 0.25,
              px: 1,
              textTransform: 'none'
            }}
          >
            End Session {index + 2}
          </Button>
        ))}
      </Box>

      <Button
        size="small"
        onClick={handleDismiss}
        sx={{
          minWidth: 'auto',
          color: 'text.secondary',
          fontSize: '1.2rem',
          fontWeight: 'bold',
          '&:hover': { bgcolor: 'rgba(0,0,0,0.1)' }
        }}
      >
        ×
      </Button>
    </Box>
  );
};

export default SessionsBanner;