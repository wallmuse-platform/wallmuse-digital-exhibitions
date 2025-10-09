// VolumeSlider.js - Corrected version
import React, { useCallback, useState, useEffect } from "react";
import Slider from '@mui/material/Slider';
import { grey } from "@mui/material/colors";

const VolumeSlider = ({ volumeRef, onVolumeChange }) => {
  // Handle slider change
  const handleChange = useCallback((event, newValue) => {
    console.log('[VolumeSlider] handleChange newValue:', newValue);
    // Don't update during dragging to prevent rerenders
  }, []);
  
  // Only call parent when slider is released
  const handleChangeCommitted = useCallback((event, newValue) => {
    console.log('[VolumeSlider] handleChangeCommitted newValue:', newValue);
    volumeRef.current = newValue;
    onVolumeChange(newValue);
  }, [onVolumeChange]);

  return (
    <Slider
      aria-label="Volume"
      size="small"
      defaultValue={volumeRef.current}
      onChange={handleChange}
      onChangeCommitted={handleChangeCommitted}
      sx={{
        color: grey[500],
        width: 100,
        padding: '6px 0',
        '& .MuiSlider-thumb': {
          width: 12,
          height: 12,
        },
        '& .MuiSlider-track': {
          height: 2,
        },
        '& .MuiSlider-rail': {
          height: 2,
        },
      }}
    />
  );
};

export default VolumeSlider;