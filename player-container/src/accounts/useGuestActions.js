// useGuestActions.js
import { useCallback } from 'react';
import { useSession } from '../context/SessionContext';
import { handleGuestAction } from './cloneGuest';
import { isDemoAccount, getUserId } from '../utils/Utils';

/**
 * Custom hook that provides utilities for handling guest users
 * @returns {Object} Guest action utilities
 */
export const useGuestActions = () => {
  const { updateSession } = useSession();
  const userId = getUserId();
  const isDemo = isDemoAccount(userId);
  
  /**
   * Wraps an action with guest account handling
   * @param {Function} action - The action to perform 
   * @param {Object} options - Options for handleGuestAction
   * @returns {Promise<any>} Result of the action
   */
  const withGuestHandling = useCallback((action, options = {}) => {
    return handleGuestAction(action, updateSession, options);
  }, [updateSession]);
  
  /**
   * Creates a wrapped version of an event handler that handles guest users
   * @param {Function} handler - The original event handler
   * @param {Object} options - Options for handleGuestAction
   * @returns {Function} Wrapped event handler
   */
  const createGuestHandler = useCallback((handler, options = {}) => {
    return (...args) => {
      withGuestHandling(() => handler(...args), options);
    };
  }, [withGuestHandling]);
  
  return {
    isDemo,
    withGuestHandling,
    createGuestHandler
  };
};