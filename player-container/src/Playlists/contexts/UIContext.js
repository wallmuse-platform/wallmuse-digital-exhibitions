// UIContext.js

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

export const UIContext = createContext();

export const UIProvider = ({ children }) => {
    // Define the key for accessing local storage
    const localStorageKey = 'expandedAccordions';

    // Initialize state from local storage or default to an empty object
    const [expandedAccordions, setExpandedAccordions] = useState(() => {
        return JSON.parse(localStorage.getItem(localStorageKey)) || {};
    });

    // Store references to AccordionSummary elements
    const accordionRefs = useRef({});

    // Update local storage when 'expandedAccordions' state changes
    useEffect(() => {
        console.log("[UI context]: useEffect start");
        localStorage.setItem(localStorageKey, JSON.stringify(expandedAccordions));
    }, [expandedAccordions]);

    const toggleAccordion = (id) => {
        setExpandedAccordions(prev => {
            const isExpanded = !prev[id];

            if (!isExpanded && accordionRefs.current[id]) {
                // Move focus to the AccordionSummary if the accordion is collapsing
                accordionRefs.current[id].focus();
            }

            return {
                ...prev,
                [id]: isExpanded
            };
        });
    };
    // Provide accordionRefs to the context so it can be used in Playlist.js
    return (
        <UIContext.Provider value={{ expandedAccordions, toggleAccordion, accordionRefs }}>
            {children}
        </UIContext.Provider>
    );
};

export const useUIContext = () => useContext(UIContext);