// 

import { useState, useEffect, useRef } from 'react';
import { getUser, getHouseState, getPlaylists, deletePlaylist } from "../../utils/api";
import { getTempPlaylistIds, removeTempPlaylistId } from "../../utils/tempPlaylistsUtils";

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

    async function cleanupTempPlaylists() {
        try {
            const tempPlaylists = getTempPlaylistIds();
            console.log("[useInitialData] Temp playlists before cleanup:", tempPlaylists);

            const results = await Promise.allSettled(
                tempPlaylists.map(({ id }) =>
                    deletePlaylist(id).then((response) => {
                        if (response) {
                            console.log(`[useInitialData] Temp playlist ${id} deleted successfully.`);
                            removeTempPlaylistId(id);
                        } else {
                            console.warn(`[useInitialData] Failed to delete temp playlist ${id}.`);
                        }
                    })
                )
            );

            results.forEach((result, index) => {
                if (result.status === "rejected") {
                    console.error(`[useInitialData] Error deleting temp playlist ${tempPlaylists[index].id}:`, result.reason);
                }
            });
        } catch (err) {
            handleError("Error during temp playlist cleanup", err);
        }
    }

    useEffect(() => {
        console.log(`[useInitialData] useEffect for async function initializeData`);
        async function initializeData() {
            setPlaylistsLoading(true);
            try {
                await fetchUserAndHouse();
                await cleanupTempPlaylists();
                await fetchPlaylists();
            } catch (err) {
                handleError("Error initializing data", err);
            } finally {
                setPlaylistsLoading(false);
            }
        }

        initializeData();
    }, []);

    return { userData, houseData, playlists, setPlaylists, playlistsLoading, error };
}