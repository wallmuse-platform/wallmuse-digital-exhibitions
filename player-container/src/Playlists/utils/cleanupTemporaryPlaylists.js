// Add this function to your app startup (App.js or similar)
import { useEffect } from 'react';
import { usePlaylists } from '../../contexts/PlaylistsContext';
import { deletePlaylist } from "../../utils/api";

// Create a custom hook
export const cleanupTemporaryPlaylists = () => {
  const { playlists, setPlaylists } = usePlaylists();
  
  useEffect(() => {
    const cleanup = async () => {
      try {
        // Find temporary playlists
        const tempPlaylists = playlists.filter(p => p.name?.startsWith('Temp_Playlist_'));
        
        if (tempPlaylists.length > 0) {
          console.log(`[App] Found ${tempPlaylists.length} temporary playlists to clean up:`, 
            tempPlaylists.map(p => p.id));
          
          // Delete each temporary playlist
          for (const playlist of tempPlaylists) {
            try {
              await deletePlaylist(playlist.id);
              console.log(`[App] Deleted temporary playlist ${playlist.id}`);
            } catch (error) {
              console.error(`[App] Error deleting temporary playlist ${playlist.id}:`, error);
            }
          }
          
          // Update playlists state
          setPlaylists(prev => prev.filter(p => !p.name?.startsWith('Temp_Playlist_')));
        } else {
          console.log('[App] No temporary playlists found to clean up');
        }
      } catch (error) {
        console.error('[App] Error cleaning up temporary playlists:', error);
      }
    };
    
    cleanup();
  }, [playlists, setPlaylists]);
};