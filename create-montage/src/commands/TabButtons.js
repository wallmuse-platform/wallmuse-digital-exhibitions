// TabButtons.js

import React, { useState, useEffect } from 'react';
import { Stack, Tooltip, Button } from "@mui/material";
import QueuePlayNextOutlinedIcon from '@mui/icons-material/QueuePlayNextOutlined';
import AddBoxOutlinedIcon from '@mui/icons-material/AddBoxOutlined';
import { selectTheme } from '../theme/ThemeUtils';
import { ThemeProvider } from '@mui/material/styles';

function TabButtons({ t, setSection }) {
  // Initialize state with value from localStorage or default to 'basicGrid'
  const [currentSection, setCurrentSection] = useState(() => {
    const savedSection = localStorage.getItem('currentSection');
    return savedSection || 'basicGrid';
  });
  const theme = selectTheme();

  // Set the section in parent component when component mounts or when currentSection changes
  useEffect(() => {
    setSection(currentSection);
  }, [currentSection, setSection]);

  const handleClick = (section) => {
    // Save to localStorage whenever user clicks a tab
    localStorage.setItem('currentSection', section);
    setCurrentSection(section);
  };

  const buttons = [
    { section: 'addContents', tip: "button.add.content.tip", icon: <AddBoxOutlinedIcon />, text: "button.add.content" },
    { section: 'basicGrid', tip: "button.curate.tip", icon: <QueuePlayNextOutlinedIcon className="tabs_icon" />, text: "button.curate" },
  ];

  return (
    <ThemeProvider theme={theme}> {/* Only use ThemeProvider if it is NOT applied globally in the parent */}
      <Stack
        className="overall_buttons"
        display="flex"
        justifyContent="center"
        spacing={2}
        direction="row"
        sx={{ my: 2 }}
      >
        {buttons.map(button => (
          <Tooltip title={t(button.tip)} key={button.section}>
            <Button
              disableRipple
              variant={currentSection === button.section ? 'contained' : 'outlined'}
              className={`tabs_text ${currentSection === button.section ? 'active' : ''}`}
              endIcon={button.icon}
              onClick={() => handleClick(button.section)}
            >
              {t(button.text)}
            </Button>
          </Tooltip>
        ))}
      </Stack>
    </ThemeProvider>
  );
}

export default TabButtons;