//

import { useState, useEffect, useRef } from "react";
import { getUser, getHouseState, getPlaylists } from "../../utils/api";

export function useInitialData() {
  const [userData, setUserData] = useState(null);
  const [houseData, setHouseData] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [playlistsLoading, setPlaylistsLoading] = useState(true);
  const [error, setError] = useState(null);

  const hasFetchedPlaylists = useRef(false);

  function handleError(message, error) {
    console.error(`[useInitialData] ${message}:`, error);
    setError(`${message}: ${error.message}`);
  }

  async function fetchUserAndHouse() {
    try {
      const user = await getUser();
      setUserData(user);

      if (user?.houses?.length > 0) {
        const house = await getHouseState(user.houses[0].id);
        setHouseData(house);
      }
    } catch (err) {
      handleError("Error fetching user or house data", err);
    }
  }

  async function fetchPlaylists(forceRefresh = false) {
    if (hasFetchedPlaylists.current && !forceRefresh) {
      console.log("[useInitialData] Playlists already fetched.");
      return;
    }
    try {
      const fetchedPlaylists = await getPlaylists();
      setPlaylists(fetchedPlaylists);
      hasFetchedPlaylists.current = true;
      console.log("[useInitialData] Fetched playlists:", fetchedPlaylists);
    } catch (err) {
      handleError("Error fetching playlists", err);
    }
  }

  useEffect(() => {
    console.log(`[useInitialData] useEffect for async function initializeData`);
    async function initializeData() {
      setPlaylistsLoading(true);
      try {
        await fetchUserAndHouse();
        await fetchPlaylists();
      } catch (err) {
        handleError("Error initializing data", err);
      } finally {
        setPlaylistsLoading(false);
      }
    }

    initializeData();
  }, []);

  return {
    userData,
    houseData,
    playlists,
    setPlaylists,
    playlistsLoading,
    error,
  };
}
