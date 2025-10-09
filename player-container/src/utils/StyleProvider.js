//StyleProvider.js

import React, { createContext, useContext, useMemo } from 'react';
import { useResponsive } from './utils/useResponsive';  // Make sure the path is correct

const StyleContext = createContext();

export const StyleProvider = ({ children }) => {
  const { isMobile, isTablet, isHD, isUHD, isSmartTV } = useResponsive();

  let tabsIconClass = "normal-tabs-icon";
  if (isMobile) {
    tabsIconClass = "mobile-tabs-icon";
  } else if (isTablet) {
    tabsIconClass = "tablet-tabs-icon";
  } else if (isHD) {
    tabsIconClass = "hd-tabs-icon";
  } else if (isUHD) {
    tabsIconClass = "4k-tabs-icon";
  } else if (isSmartTV) {
    tabsIconClass = "smarttv-tabs-icon";
  }

  let tabsTextClass = "normal-tabs-text";
  if (isMobile) {
    tabsTextClass = "mobile-tabs-text";
  } else if (isTablet) {
    tabsTextClass = "tablet-tabs-text";
  } else if (isHD) {
    tabsTextClass = "hd-tabs-text";
  } else if (isUHD) {
    tabsTextClass = "4k-tabs-text";
  } else if (isSmartTV) {
    tabsTextClass = "smarttv-tabs-text";
  }

  // useMemo to memoize the styles to avoid unnecessary re-renders
  const style = useMemo(() => ({
    tabsIconClass,
    tabsTextClass
  }), [tabsIconClass, tabsTextClass]);

  return (
    <StyleContext.Provider value={{ style }}>
      {children}
    </StyleContext.Provider>
  );
};

// Exporting the context hook for easy access in other components
export const useStyle = () => useContext(StyleContext);