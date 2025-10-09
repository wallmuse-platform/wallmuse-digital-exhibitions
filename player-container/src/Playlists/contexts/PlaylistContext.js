// PlaylistContext.js used for success messages

import React, { createContext, useContext, useState } from 'react';

const PlaylistContext = createContext();

export const usePlaylist = () => useContext(PlaylistContext);

export const PlaylistProvider = ({ children }) => {
    const [saveInProgress, setSaveInProgress] = useState(false);
    const [deleteInProgress, setDeleteInProgress] = useState(false);

    const updateInProgress = () => saveInProgress || deleteInProgress;

    return (
        <PlaylistContext.Provider value={{
            saveInProgress, setSaveInProgress,
            deleteInProgress, setDeleteInProgress,
            updateInProgress
        }}>
            {children}
        </PlaylistContext.Provider>
    );
};
