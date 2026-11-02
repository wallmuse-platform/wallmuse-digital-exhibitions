
// tempPlaylistsUtils.js

import { deletePlaylist } from "../utils/api";

export const getTempPlaylistIds = () => {
  return JSON.parse(localStorage.getItem('tempPlaylists')) || [];
};

// Manage TempPlaylistId Storage
export const saveTempPlaylistId = (playlistId, userId) => {
  const tempPlaylists = JSON.parse(localStorage.getItem('tempPlaylists')) || [];
  tempPlaylists.push({ id: playlistId, timestamp: new Date().toISOString(), userId });
  localStorage.setItem('tempPlaylists', JSON.stringify(tempPlaylists));
};

export const clearTempPlaylistIds = () => {
  localStorage.removeItem('tempPlaylists');
};

export const removeTempPlaylistId = (playlistId) => {
  const tempPlaylists = getTempPlaylistIds();
  const updatedPlaylists = tempPlaylists.filter(({ id }) => id !== playlistId);
  localStorage.setItem('tempPlaylists', JSON.stringify(updatedPlaylists));
};

// Cleanup Temporary Playlists
export const cleanupTempPlaylists = (playlists, setPlaylists) => {
  const tempPlaylists = getTempPlaylistIds();

  tempPlaylists.forEach(({ id }) => {
    console.log(`[TempPlaylistsUtils] Cleaning up temp playlist with ID: ${id}`);
    removeTempPlaylistId(id); // Remove from local storage

    setPlaylists((prevPlaylists) =>
      prevPlaylists.filter((pl) => pl.id !== id) // Remove from state
    );

    deletePlaylist(id).catch((error) => {
      console.error(`[TempPlaylistsUtils] Failed to delete temp playlist with ID ${id}:`, error);
    });
  });
};