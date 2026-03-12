// TabButtons.js

import React, { useState, useEffect } from 'react';
import { Box, Stack, Tooltip, Button, IconButton, useMediaQuery } from "@mui/material";
import { useTheme } from '@mui/material/styles';
import QueuePlayNextOutlinedIcon from '@mui/icons-material/QueuePlayNextOutlined';
import AddBoxOutlinedIcon from '@mui/icons-material/AddBoxOutlined';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import AutoFixHighOutlinedIcon from '@mui/icons-material/AutoFixHighOutlined';
import { selectTheme } from '../theme/ThemeUtils';
import { ThemeProvider } from '@mui/material/styles';
import { useUserContext } from '../context/UserContext';

function TabButtons({ t, setSection, wpLoggedIn }) {
  const { isPremium } = useUserContext() || {};
  const [currentSection, setCurrentSection] = useState(() => {
    const savedSection = localStorage.getItem('currentSection');
    return savedSection || 'basicGrid';
  });
  const theme = selectTheme();
  const muiTheme = useTheme();
  const isNarrow = useMediaQuery(muiTheme.breakpoints.down('md'));

  useEffect(() => {
    setSection(currentSection);
  }, [currentSection, setSection]);

  const handleClick = (section) => {
    localStorage.setItem('currentSection', section);
    setCurrentSection(section);
  };

  const canBatchUpload = wpLoggedIn || isPremium;
  const batchUploadTooltip = canBatchUpload
    ? t('button.batch.upload.tip')
    : t('button.batch.upload.restricted');

  // Left icon is contextual: Batch Upload when ADD CONTENT is active,
  // Curation Wizard when CURATE is active
  const isAddContentContext = ['addContents', 'batchUpload'].includes(currentSection);
  const isCurateContext = ['basicGrid', 'wizard'].includes(currentSection);

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', my: 2 }}>

        {/* Far left: context-dependent — hidden on mobile/tablet */}
        {!isNarrow && (
          <Box sx={{ position: 'absolute', left: 8 }}>
            {isAddContentContext && (
              <Tooltip title={batchUploadTooltip}>
                <span>
                  <IconButton
                    size="small"
                    className="tabs_icon"
                    onClick={() => canBatchUpload && handleClick('batchUpload')}
                    disabled={!canBatchUpload}
                    sx={currentSection === 'batchUpload' ? { color: 'primary.main' } : {}}
                  >
                    <UploadFileOutlinedIcon />
                  </IconButton>
                </span>
              </Tooltip>
            )}
            {isCurateContext && (
              <Tooltip title={t('button.wizard.tip')}>
                <span>
                  <IconButton
                    size="small"
                    className="tabs_icon"
                    onClick={() => handleClick('wizard')}
                    sx={currentSection === 'wizard' ? { color: 'primary.main' } : {}}
                  >
                    <AutoFixHighOutlinedIcon />
                  </IconButton>
                </span>
              </Tooltip>
            )}
          </Box>
        )}

        {/* Center: the two main buttons */}
        <Stack className="overall_buttons" direction="row" spacing={2}>
          <Tooltip title={t('button.add.content.tip')}>
            <Button
              disableRipple
              variant={isAddContentContext ? 'contained' : 'outlined'}
              className={`tabs_text ${isAddContentContext ? 'active' : ''}`}
              endIcon={<AddBoxOutlinedIcon />}
              onClick={() => handleClick('addContents')}
            >
              {t('button.add.content')}
            </Button>
          </Tooltip>
          <Tooltip title={t('button.curate.tip')}>
            <Button
              disableRipple
              variant={isCurateContext ? 'contained' : 'outlined'}
              className={`tabs_text ${isCurateContext ? 'active' : ''}`}
              endIcon={<QueuePlayNextOutlinedIcon className="tabs_icon" />}
              onClick={() => handleClick('basicGrid')}
            >
              {t('button.curate')}
            </Button>
          </Tooltip>
        </Stack>

        {/* Far right: Account Delegations (placeholder — ShareX admins) — hidden on mobile/tablet */}
        {!isNarrow && <Box sx={{ position: 'absolute', right: 8 }}>
          <Tooltip title="For ShareX Administrators">
            <span>
              <IconButton disabled size="small" className="tabs_icon">
                <ManageAccountsIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Box>}

      </Box>
    </ThemeProvider>
  );
}

export default TabButtons;
