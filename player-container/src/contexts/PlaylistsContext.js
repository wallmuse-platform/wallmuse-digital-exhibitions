//PlaylistsContext.js used to passed Playlists State

import React, { createContext, useContext, useMemo, memo } from 'react';
import { useInitialData } from '../Playlists/hooks/useInitialData'; // Adjust path as needed

// Create the context
export const PlaylistsContext = createContext();

// Hook to use playlists context
export const usePlaylists = () => {
    console.log('[PlaylistsContext] usePlaylists');
    const context = useContext(PlaylistsContext);
    if (!context) {
        throw new Error('[PlaylistsContext] usePlaylists must be used within a PlaylistsProvider');
    }
    return context;
};

// PlaylistsProvider Component
const PlaylistsProviderComponent = ({ children }) => {
    // Use the custom hook directly
    const { playlists, setPlaylists, playlistsLoading, error } = useInitialData();

    // Memoize the context value to prevent unnecessary re-renders
    const contextValue = useMemo(() => ({
        playlists,
        setPlaylists,
        playlistsLoading,
        error,
    }), [playlists, setPlaylists, playlistsLoading, error]);

    // Handle loading and error states
    if (playlistsLoading) return <div>Loading playlists...</div>;
    if (error) return <div>Error loading playlists: {error.message}</div>;

    return (
        <PlaylistsContext.Provider value={contextValue}>
            {children}
        </PlaylistsContext.Provider>
    );
};

// Memoize the provider to prevent unnecessary re-instantiation
export const PlaylistsProvider = memo(PlaylistsProviderComponent);