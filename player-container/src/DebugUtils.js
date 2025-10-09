// DebugUtils.js
import { useEffect, useRef } from 'react';

// Hook to track component lifecycle
export const useComponentLifecycle = (componentName) => {
  const mountCount = useRef(0);
  
  useEffect(() => {
    mountCount.current += 1;
    console.log(`[${componentName}] MOUNTED (count: ${mountCount.current})`);
    
    return () => {
      console.log(`[${componentName}] UNMOUNTED (count: ${mountCount.current})`);
    };
  }, [componentName]);
  
  return mountCount.current;
};

// Function to safely access nested properties
export const safeGet = (obj, path, defaultValue = null) => {
  if (!obj) return defaultValue;
  
  const keys = path.split('.');
  let result = obj;
  
  for (const key of keys) {
    if (result === null || result === undefined) {
      return defaultValue;
    }
    result = result[key];
  }
  
  return result !== undefined ? result : defaultValue;
};

// Function to safely perform operations on arrays
export const safeArray = {
  map: (arr, callback, defaultValue = []) => {
    if (!Array.isArray(arr)) return defaultValue;
    return arr.map(callback);
  },
  
  find: (arr, predicate, defaultValue = null) => {
    if (!Array.isArray(arr)) return defaultValue;
    const found = arr.find(predicate);
    return found !== undefined ? found : defaultValue;
  },
  
  join: (arr, separator = ',', defaultValue = '') => {
    if (!Array.isArray(arr)) return defaultValue;
    return arr.join(separator);
  }
};

// Create a DOM operation wrapper to catch errors
export const safeDomOperation = (operation, fallback = null) => {
  try {
    return operation();
  } catch (error) {
    console.error('DOM operation failed:', error);
    return fallback;
  }
};