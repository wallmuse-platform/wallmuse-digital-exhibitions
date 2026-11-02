import React, {useState} from 'react';
import { Stack, Snackbar, Alert } from "@mui/material";
import Track from "./Track";
import { getArtworkDurationInMillis } from "../artworks/ArtworkUtils";
import { OperationTypes } from "../constants/OperationTypes";
import { useTranslation } from 'react-i18next';

export default function Tracks({ artworks, setTrackArtworks, addDroppedMontage, updateFunctionToolProperties, operation, currentlyEditingMontage, handleEditMontageDrop}) {

    const [invalidMontageDrop, setInvalidMontageDrop] = useState(false)
    const [dropAllowed, setDropAllowed] = useState(true)
    const invalidMontageDropText = "error.track.drop.samelength"
    const dropDisallowedDropText = "error.track.drop.change"

    const { t} = useTranslation();

    const allowDrop = (allow) => {
        if (allow !== dropAllowed) {
            setDropAllowed(allow);
        }
    }
    const dropMontageIfAllowed = (montage, trackIndex) => {

        if (operation === OperationTypes.MODIFY && currentlyEditingMontage === null) {
            handleEditMontageDrop(montage)
            return true;
        }

        if (!validateMontageDrop(montage, trackIndex)) {
            setInvalidMontageDrop(true);
            return false;
        }
        montage.durationInMillis = getArtworkDurationInMillis(montage);
        const montageTracks = parseInt(montage.tracks);
        setTrackArtworks(previousTrackArtworks => {
            const newTrackArtworks = [...previousTrackArtworks];
            for (let i = trackIndex; i < montageTracks + trackIndex; i++) {
                if (newTrackArtworks.length <= i) {
                    newTrackArtworks[i] = [ montage ]
                } else {
                    newTrackArtworks[i] = [...previousTrackArtworks[i], montage];
                }
            }
            // Add an empty array at the last track if needed
            const lastTrack = newTrackArtworks[newTrackArtworks.length - 1];
            if (Array.isArray(lastTrack) && lastTrack.length > 0) {
                newTrackArtworks.push([])
            }
            return newTrackArtworks;
        });

        addDroppedMontage(montage.id);

    }

    const removeMontageFromAllTracks = montage => {
        setTrackArtworks(previousTrackArtworks => {
            const newTrackArtworks = [...previousTrackArtworks];
            for (let i = 0; i < newTrackArtworks.length; i++) {
                const indexOnTrack = newTrackArtworks[i].findIndex(a => a.trackId === montage.trackId)
                if (indexOnTrack >= 0) {
                    newTrackArtworks[i].splice(indexOnTrack, 1)
                }
            }
            return newTrackArtworks;
        })
        removeExcessiveEmptyTracks();
    }

    const removeExcessiveEmptyTracks = () => {
        const indexesToRemove = []
        for (let i = 0; i < artworks.length - 1; i++) {
            if (artworks[i].length === 0) {
                indexesToRemove.push(i)
            }
        }
        if (indexesToRemove.length > 0) {
            setTrackArtworks(previousTrackArtworks => {
                const newTrackArtworks = [...previousTrackArtworks];
                newTrackArtworks.splice(indexesToRemove[0], indexesToRemove.length)
                return newTrackArtworks;
            })
        }
    }

    const validateMontageDrop = (montage, trackIndex) => {
        const montageTracks = parseInt(montage.tracks);
        for (let i = 1 + trackIndex; i < montageTracks + trackIndex; i++) {
            const trackDuration = i < artworks.length ? countTrackDuration(i) : 0;
            const previousTrackDuration = i-1 < artworks.length ? countTrackDuration(i-1) : 0;
            if (trackDuration !== previousTrackDuration) {
                return false;
            }
        }
        return true;
    }

    const countTrackDuration = index =>
        artworks[index].reduce((duration, artwork) => duration + artwork.durationInMillis, 0)

    const handleCloseError = () => {
        setInvalidMontageDrop(false)
        setDropAllowed(true)
    }
    const renderTracks = () => {
        return artworks.map((track, index) => (
            <Track
                key={ index }
                trackNumber={ index }
                artworks={ artworks[index] }
                setTrackArtworks={ setTrackArtworks }
                dropMontageIfAllowed = { dropMontageIfAllowed }
                removeMontageFromAllTracks={ removeMontageFromAllTracks }
                removeExcessiveEmptyTracks={ removeExcessiveEmptyTracks }
                allowDrop={ allowDrop }
                updateFunctionToolProperties={ updateFunctionToolProperties }
            />
        ));
    }

    return (
        <Stack>
            <div>
                {
                    (invalidMontageDrop || !dropAllowed) ? (
                        <Snackbar
                            open={ invalidMontageDrop || !dropAllowed }
                            autoHideDuration={ 6000 }
                            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                            onClose={ handleCloseError }>
                            <Alert
                                severity="error"
                                onClose={ handleCloseError }
                            >
                                { invalidMontageDrop ? t(invalidMontageDropText) : t(dropDisallowedDropText) }
                            </Alert>
                        </Snackbar>
                    ) : null
                }
            </div>
            {
                renderTracks()
            }
        </Stack>
    )

}