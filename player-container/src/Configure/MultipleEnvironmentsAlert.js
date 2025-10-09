// utils/MultipleEnvironmentsAlert.js

import React, { useState, useEffect } from 'react';
import { Alert, AlertTitle, Collapse, Button, Box, Typography } from '@mui/material';
import { Warning as WarningIcon, Close as CloseIcon } from '@mui/icons-material';
import { checkMultipleActiveEnvironments } from '../utils/environmentUtils';

const MultipleEnvironmentsAlert = ({ environments, handleDeactivateEnvironment, theme }) => {
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

    // Show alert if multiple environments are active and user hasn't dismissed it
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
      // Reset dismissed state so alert can show again if needed
      setDismissed(false);
    } catch (error) {
      console.error('Error deactivating environment:', error);
    }
  };

  if (!show || !multipleActiveInfo?.hasMultiple) {
    return null;
  }

  return (
    <Collapse in={show}>
      <Alert
        severity="warning"
        icon={<WarningIcon />}
        action={
          <Button
            color="inherit"
            size="small"
            onClick={handleDismiss}
            startIcon={<CloseIcon />}
            sx={{ textTransform: 'none' }}
          >
            ×
          </Button>
        }
        sx={{
          mb: 2,
          '& .MuiAlert-message': {
            width: '100%'
          }
        }}
      >
        <AlertTitle>Multiple Sessions Detected</AlertTitle>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="body2">
            You have {multipleActiveInfo.count} active sessions.
          </Typography>
          <Button
            size="small"
            variant="text"
            onClick={handleDismiss}
            sx={{ textTransform: 'none', color: 'text.secondary' }}
          >
            Keep All
          </Button>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {multipleActiveInfo.environments.map((env, index) => (
            <Box
              key={env.id}
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                py: 0.5,
                px: 1,
                bgcolor: index === 0 ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 152, 0, 0.1)',
                borderRadius: 0.5,
                border: `1px solid ${index === 0 ? 'rgba(76, 175, 80, 0.3)' : 'rgba(255, 152, 0, 0.3)'}`
              }}
            >
              <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {index === 0 ? '🟢' : '🟡'} Session {index + 1} <Typography variant="caption" color="text.secondary">(ID: {env.id})</Typography>
              </Typography>

              {/* Only show deactivate button if this isn't the first environment */}
              {index > 0 && (
                <Button
                  size="small"
                  variant="contained"
                  color="warning"
                  onClick={() => onDeactivateClick(env.id)}
                  sx={{
                    minWidth: 'auto',
                    fontWeight: 'bold',
                    textTransform: 'none',
                    fontSize: '0.75rem',
                    py: 0.25
                  }}
                >
                  End
                </Button>
              )}
            </Box>
          ))}
        </Box>

        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          💡 Primary session stays active. End extra sessions to improve performance.
        </Typography>
      </Alert>
    </Collapse>
  );
};

export default MultipleEnvironmentsAlert;