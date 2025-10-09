// GlobalPlayerState.js

import { useState, useEffect } from 'react';

// Global state for isPlaying only
const globalPlayerState = {
  isPlaying: { current: false }
};

// Helper function that updates isPlaying and dispatches events
export const setGlobalIsPlaying = (value) => {
  globalPlayerState.isPlaying.current = value;
  window.dispatchEvent(new CustomEvent('playerStateChange', { 
    detail: { key: 'isPlaying', value } 
  }));
};

// Getter function (no re-renders)
export const getGlobalIsPlaying = () => globalPlayerState.isPlaying.current;

// Custom hook for components that need to re-render when isPlaying changes
export const useGlobalPlayerState = (subscribeToChanges = true) => {
  const [, forceUpdate] = useState({});
  
  useEffect(() => {
    // If subscribeToChanges is false, don't subscribe (read-only mode)
    if (!subscribeToChanges) {
      return;
    }
    
    const handleStateChange = (event) => {
      if (event.detail.key === 'isPlaying') {
        forceUpdate({}); // Trigger re-render
      }
    };
    
    window.addEventListener('playerStateChange', handleStateChange);
    return () => window.removeEventListener('playerStateChange', handleStateChange);
  }, [subscribeToChanges]);
  
  return {
    isPlaying: globalPlayerState.isPlaying.current,
    setIsPlaying: setGlobalIsPlaying
  };
};

// Read-only hook (never re-renders)
export const useGlobalPlayerStateReadOnly = () => {
  return {
    isPlaying: globalPlayerState.isPlaying.current,
    setIsPlaying: setGlobalIsPlaying
  };
};

// For debugging
export const debugGlobalPlayerState = () => {
  console.log('Global Player State (isPlaying only):', {
    isPlaying: globalPlayerState.isPlaying.current
  });
  return globalPlayerState;
};