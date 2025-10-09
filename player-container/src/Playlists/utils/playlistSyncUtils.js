// playlistSyncUtils.js
import { useEffect, useRef, useState, useCallback } from 'react';
import { handleSendCommand } from '../../App';

export const usePlaylistSync = (
    currentPlaylist,
    backendCurrentPlaylist,
    handlePlaylistChange,
    house
) => {
    // Use refs instead of state to avoid dependency cycles
    const syncingRef = useRef(false);
    const targetPlaylistRef = useRef(null);
    const [isReady, setIsReady] = useState(false);
    
    // This effect handles both initiating sync and detecting completion
    useEffect(() => {
        const runEffect = async () => {
            // Don't do anything if we're already syncing
            if (syncingRef.current) {
                // Check if backend has confirmed our sync request
                if (backendCurrentPlaylist === targetPlaylistRef.current) {
                    console.log('[PlaylistSync] Backend confirmed change');
                    syncingRef.current = false;
                    setIsReady(true);
                    
                    // Reset ready state after a delay
                    setTimeout(() => setIsReady(false), 1000);
                }
                return;
            }
            
            // Start sync if needed
            if (currentPlaylist !== backendCurrentPlaylist) {
                console.log(`[PlaylistSync] Auto-syncing: ${currentPlaylist}`);
                targetPlaylistRef.current = currentPlaylist;
                syncingRef.current = true;
                
                try {
                    await handlePlaylistChange(currentPlaylist);
                } catch (error) {
                    console.error('[PlaylistSync] Auto-sync error:', error);
                    syncingRef.current = false;
                }
            }
        };
        
        runEffect();
    }, [currentPlaylist, backendCurrentPlaylist]); // Minimal dependencies
    
    // Manual playlist change function
    const requestPlaylistChange = useCallback(async (playlistId) => {
        if (!house || playlistId === backendCurrentPlaylist) return true;
        
        console.log(`[PlaylistSync] Manually requesting change to: ${playlistId}`);
        targetPlaylistRef.current = playlistId;
        syncingRef.current = true;
        setIsReady(false);
        
        try {
            await handlePlaylistChange(playlistId);
            return true;
        } catch (error) {
            console.error('[PlaylistSync] Change request error:', error);
            syncingRef.current = false;
            return false;
        }
    }, [house, backendCurrentPlaylist, handlePlaylistChange]);
    
    
    return {
        isLoading: syncingRef.current,
        isReady,
        requestPlaylistChange,
    };
};