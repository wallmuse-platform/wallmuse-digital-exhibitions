// Update to the useCopyrightOwner.js file to improve the integration with AddContent.js

import { useState, useCallback, useEffect } from 'react';
import { searchCopyrightOwner } from '../../api'; // Update this path if needed
import { getUserId } from '../../utils/Utils'; // Update this path if needed

/**
 * Custom hook to manage copyright owner selection state and logic
 * 
 * @returns {Object} Hook state and methods
 */
export function useCopyrightOwner(onOwnerSelectorChange = null) {
    const [selectedOwnerId, setSelectedOwnerId] = useState("-1");
    const [authorName, setAuthorName] = useState("");
    const [showOwnerSelector, setShowOwnerSelector] = useState(false);
    const [potentialOwners, setPotentialOwners] = useState([]);
    const [searchPending, setSearchPending] = useState(false);
    const sessionId = getUserId();

    // Add a useEffect to call the callback when the state changes
    useEffect(() => {
        console.log('[useCopyrightOwner] showOwnerSelector changed to:', showOwnerSelector);
        if (onOwnerSelectorChange) {
            onOwnerSelectorChange(showOwnerSelector);
        }
    }, [showOwnerSelector, onOwnerSelectorChange]);

    // Modify the setter to add logging
    const setShowOwnerSelectorWithLog = useCallback((value) => {
        console.log('[useCopyrightOwner] Setting showOwnerSelector to:', value);
        setShowOwnerSelector(value);
    }, []);

    // Perform the search when authorName changes and search is requested
    useEffect(() => {
        if (!searchPending || !authorName || authorName.trim() === '') {
            return; // Skip if no search pending or no name
        }

        const performSearch = async () => {
            try {
                console.log('[useCopyrightOwner] Searching for author:', authorName);
                const owners = await searchCopyrightOwner(sessionId, authorName);

                if (owners.length > 0) {
                    console.log('[useCopyrightOwner] Found potential matches:', owners);

                    // Check for EXACT match first
                    const exactMatch = owners.find(owner =>
                        owner.name === authorName.trim() ||
                        owner.displayName === authorName.trim()
                    );

                    if (exactMatch) {
                        console.log('[useCopyrightOwner] Found EXACT match - auto-selecting:', exactMatch);
                        setSelectedOwnerId(String(exactMatch.id));
                        setAuthorName(exactMatch.displayName || exactMatch.name);
                        setShowOwnerSelector(false); // Don't show dialog for exact matches
                        setPotentialOwners([exactMatch]); // Store the selected owner
                    } else {
                        console.log('[useCopyrightOwner] Multiple matches found - showing selector');
                        setPotentialOwners(owners);
                        setShowOwnerSelector(true);
                    }
                } else {
                    console.log('[useCopyrightOwner] No matches found, using as new author');
                    setSelectedOwnerId("-1");
                    setShowOwnerSelector(false);
                }
            } catch (error) {
                console.error('[useCopyrightOwner] Error searching:', error);
                setSelectedOwnerId("-1");
                setShowOwnerSelector(false);
            } finally {
                setSearchPending(false);
            }
        };

        // Debounce the search
        const timer = setTimeout(performSearch, 500);
        return () => clearTimeout(timer);
    }, [authorName, searchPending, sessionId]);

    // Handle when an owner is selected
    const handleOwnerSelected = useCallback((ownerId, ownerName) => {
        console.log('[useCopyrightOwner] Owner selected:', ownerId, ownerName);
        setSelectedOwnerId(String(ownerId));
        setAuthorName(ownerName);
        setShowOwnerSelector(false);
    }, []);

    // Trigger the owner search
    const searchOwner = useCallback((name) => {
        if (!name || name.trim() === '') {
            resetOwner();
            return;
        }
        console.log('[useCopyrightOwner] Triggering search for:', name);
        setAuthorName(name);
        setSearchPending(true);
    }, []);

    // Reset the owner selection
    const resetOwner = useCallback(() => {
        console.log('[useCopyrightOwner] Resetting owner');
        setSelectedOwnerId("-1");
        setAuthorName("");
        setShowOwnerSelector(false);
        setPotentialOwners([]);
        setSearchPending(false);
    }, []);

    return {
        selectedOwnerId,
        setSelectedOwnerId,
        authorName,
        potentialOwners,
        showOwnerSelector,
        setShowOwnerSelector: setShowOwnerSelectorWithLog,
        handleOwnerSelected,
        searchOwner,
        resetOwner
    };
}

export default useCopyrightOwner;
