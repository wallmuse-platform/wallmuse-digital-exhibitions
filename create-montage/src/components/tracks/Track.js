import React, { useCallback } from 'react';
import { useDrop } from 'react-dnd'
import { Stack, useTheme } from "@mui/material";
import { DragableTypes } from "../constants/DragableTypes";
import TrackArtwork from "../artworks/TrackArtwork";
import {
    artworkIsImage,
    getArtworkDurationInMillis,
    isArtwork,
    isMontage
} from "../artworks/ArtworkUtils";
import { constructDefaultTitleElement, isMultiTrackMontage, isTitle } from "../tools/ToolUtils";
import { ToolTypes } from "../constants/ToolTypes";

const Track = function Track({ trackNumber, artworks, setTrackArtworks, dropMontageIfAllowed, removeMontageFromAllTracks, removeExcessiveEmptyTracks, allowDrop, updateFunctionToolProperties }) {

    const getUpdatedTrackArtworks = useCallback(
        (currentIndex, newIndex, duration, remove) => {
            // find changing artwork and make a copy of it
            const artwork = { ...artworks[currentIndex] };

            const newArtworks = artworks.map(a => ({...a}));
            if (duration) {
                artwork.durationInMillis = duration;
            }
            newArtworks.splice(currentIndex, 1);
            if (!remove) {
                newArtworks.splice(newIndex, 0, artwork)
            }
            return newArtworks;
        }, [artworks])

    const checkMontageSyncStartViolation = useCallback(
        (currentIndex, newIndex, duration, remove) => {
        // Find possibly affected Montages
        const possiblyAffectedMontages = artworks.filter(a => isMultiTrackMontage(a))
        if (possiblyAffectedMontages.length === 0) {
            return false;
        }
        // Emulate the change on a copy of the track
        const newArtworks = getUpdatedTrackArtworks(currentIndex, newIndex, duration, remove);
        let currentEndTime = 0;
        newArtworks.forEach(artwork => {
            currentEndTime += artwork.durationInMillis;
            artwork["endTime"] = currentEndTime;
        })

        // See if any of the montage's end time changes
        let montagesAffected = false;
        possiblyAffectedMontages.forEach(montage => {
            const possiblyAffectedMontage = newArtworks.filter(m => m.trackId === montage.trackId)[0];
            if (possiblyAffectedMontage && possiblyAffectedMontage.endTime !== montage.endTime) {
                montagesAffected = true;
            }
        })
        return montagesAffected;
    }, [artworks, getUpdatedTrackArtworks])

    const updateArtwork = useCallback(
        (currentIndex, newIndex, duration, remove) => {
            if (checkMontageSyncStartViolation(currentIndex, newIndex, duration, remove)) {
                allowDrop(false)
                return;
            }
            allowDrop(true)

            const artwork = artworks[currentIndex];
            if (remove && isMontage(artwork)) {
                removeMontageFromAllTracks(artwork);
                return;
            }

            setTrackArtworks(previousTrackArtworks => {
                const newTrackArtworks = [...previousTrackArtworks];
                newTrackArtworks[trackNumber] = getUpdatedTrackArtworks(currentIndex, newIndex, duration, remove);
                return newTrackArtworks;
            });
            removeExcessiveEmptyTracks()
        }, [setTrackArtworks, artworks, trackNumber, checkMontageSyncStartViolation, getUpdatedTrackArtworks, removeExcessiveEmptyTracks, removeMontageFromAllTracks, allowDrop])

    const handleMontageDrop = artwork => dropMontageIfAllowed(artwork, trackNumber)

    const updateHoveredByTool = (artwork, toolType) => {
        // don't change anything if it's the same artwork
        if (artworks.filter(a => a.trackId === artwork.trackId)[0].hoveredByTool) {
            return;
        }
        setTrackArtworks(previousTrackArtworks => {
            const newTrackArtworks = [...previousTrackArtworks];
            newTrackArtworks[trackNumber].forEach(a => a.hoveredByTool = (artwork.trackId === a.trackId && (artworkIsImage(artwork) || toolType === ToolTypes.ALPHA_CHANNEL_INSERTS)) ? toolType : null )
            return newTrackArtworks;
        });
    }

    function selectBackgroundColor(isActive, canDrop) {
        if (isActive) {
            return '#CCC'
        } else if (canDrop) {
            return '#EEE'
        }
    }
    const [{ canDrop, isOver }, drop] = useDrop(
        () => ({
            accept: DragableTypes.ARTWORK,
            drop: (dragObject) => {
                const artwork = { ...dragObject.artwork };
                artwork.trackId = Date.now().toString() + artwork.id.toString();
                artwork.droppedTrack = trackNumber;

                if (isMontage(artwork)) {
                    handleMontageDrop(artwork);
                } else if (isArtwork(artwork) || isTitle(artwork)) {
                    artwork.durationInMillis = getArtworkDurationInMillis(artwork);
                    if (isTitle(artwork)) {
                        artwork.titleElement = constructDefaultTitleElement();
                    }
                    setTrackArtworks(previousTrackArtworks => {
                        const newTrackArtworks = [...previousTrackArtworks];
                        newTrackArtworks[trackNumber] = [...previousTrackArtworks[trackNumber], artwork];
                        // Add an empty array at the last track if needed
                        const lastTrack = newTrackArtworks[newTrackArtworks.length - 1];
                        if (Array.isArray(lastTrack) && lastTrack.length > 0) {
                            newTrackArtworks.push([])
                        }
                        return newTrackArtworks;
                    });
                }
            },
            collect: (monitor) => ({
                isOver: monitor.isOver(),
                canDrop: monitor.canDrop(),
            }),
        }), [artworks, isMontage, isArtwork, Date.now()]
    )
    const isActive = canDrop && isOver
    const backgroundColor = selectBackgroundColor(isActive, canDrop)

    const renderArtworks = () => {
        let currentEndTime = 0;
        return artworks.map((artwork, index) => {
            currentEndTime += artwork.durationInMillis;
            artwork["endTime"] = currentEndTime;
            return (
                <TrackArtwork
                    key={ artwork.trackId }
                    trackId={ artwork.trackId }
                    artwork={ artwork }
                    index={ index }
                    updateArtwork={ updateArtwork }
                    currentEndTime={ currentEndTime }
                    updateHoveredByTool={ updateHoveredByTool }
                    updateFunctionToolProperties={ updateFunctionToolProperties }
                />
            )})
    }

    const theme= useTheme();

    return (
        <Stack
            direction="row"
            sx={{ borderBottom: 1, borderColor: theme.palette.primary.main, backgroundColor: { backgroundColor }, padding: "5px 0", overflowX: "auto" }}
            ref={ drop }
            minHeight={160} >
            {
                renderArtworks()
            }
        </Stack>
    )
}

export default Track;