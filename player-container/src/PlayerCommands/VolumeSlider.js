// VolumeSlider — uncontrolled MUI Slider with key-remount strategy.
// Uses defaultValue + key increment (not the controlled value prop) to avoid the slider
// thumb snapping back on each drag tick. External state changes trigger a remount via
// sliderKey, but only when the user is not actively dragging (isDraggingRef guards this).
import React, { useCallback, useState, useEffect, useRef } from "react";
import Slider from "@mui/material/Slider";
import { grey } from "@mui/material/colors";

const VolumeSlider = ({ volumeRef, value, onVolumeChange }) => {
  const isDraggingRef = useRef(false);
  // key forces remount (with updated defaultValue) when parent value changes externally
  const [sliderKey, setSliderKey] = useState(0);
  const defaultValueRef = useRef(value ?? 0);

  // Sync defaultValue and remount when parent value changes — only when not dragging
  useEffect(() => {
    if (!isDraggingRef.current) {
      defaultValueRef.current = value ?? 0;
      setSliderKey((k) => k + 1);
    }
  }, [value]);

  const handleChange = useCallback((event, newValue) => {
    console.log("[VolumeSlider] handleChange newValue:", newValue);
    isDraggingRef.current = true;
  }, []);

  // Only propagate to parent on release (not on every drag tick) to avoid spamming
  // volume commands to the WebSocket player.
  const handleChangeCommitted = useCallback(
    (event, newValue) => {
      console.log("[VolumeSlider] handleChangeCommitted newValue:", newValue);
      isDraggingRef.current = false;
      volumeRef.current = newValue;
      onVolumeChange(newValue);
    },
    [onVolumeChange],
  );

  return (
    <Slider
      key={sliderKey}
      aria-label="Volume"
      size="small"
      defaultValue={defaultValueRef.current}
      onChange={handleChange}
      onChangeCommitted={handleChangeCommitted}
      sx={{
        color: grey[500],
        width: 100,
        padding: "6px 0",
        "& .MuiSlider-thumb": {
          width: 12,
          height: 12,
        },
        "& .MuiSlider-track": {
          height: 2,
        },
        "& .MuiSlider-rail": {
          height: 2,
        },
      }}
    />
  );
};

export default VolumeSlider;
