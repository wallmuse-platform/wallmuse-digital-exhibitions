import {
    Alert, AlertTitle,
    Button, Checkbox,
    Dialog, DialogActions, DialogContent,
    DialogTitle,
    Divider,
    InputLabel, List, ListItem, ListItemText, OutlinedInput,
    Stack, TextField, Typography
} from "@mui/material";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import React, { useState, useEffect, Fragment } from "react";
import { OrientationTypes, ResolutionTypes } from "../../constants/ArtworkProperties";
import { calculateTrackEndTime } from "../../../utils/SaveUtils";
import { artworkIsImage, artworkIsVideo } from "../../artworks/ArtworkUtils";


const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
    PaperProps: {
        style: {
            maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
            width: 250,
        },
    },
};
const labelStyle = {
    padding: "10px 0 5px",
    width: 150
}
const inputStyle = {
    marginLeft: 2,
    width: 120
}
export default function AlphaChannelInsertsDialog({artwork, setImage, updateAlphaChannelInsertsProperties, tracks}) {

    const [alphaChannelInsertsProperties, setalphaChannelInsertsProperties] = useState(artwork.alphaChannelInsertsProperties);
    const [suitableArtworks, setSuitableArtworks] = useState([])
    const [suitableTracks, setSuitableTracks] = useState([])
    const [alphaChannelInsertsErrors, setalphaChannelInsertsErrors] = useState([]);
    const [selectedTrack, setSelectedTrack] = useState(null)

    const handleClose = () => {
        setImage(null);
    }
    const handleSave = () => {
        artwork.alphaChannelInsertsProperties = alphaChannelInsertsProperties;
        updateAlphaChannelInsertsProperties(artwork);
        setImage(null);
    }

    const updateSelectedTrack = newTrack => {
        tracks.forEach((track, index) => {
            if (index === newTrack) {
                console.log(track)
                setSelectedTrack({ track, index });
            }
        })
    }

    useEffect(() => {

        const errors = []
        const otherArtworks = [];
        const otherTracks = [];
        tracks.forEach((track, index) => {
            if (index !== artwork.droppedTrack) {
                track.forEach(otherArtwork => {
                    if (otherArtwork.durationInMillis === artwork.durationInMillis && otherArtwork.id !== artwork.id) {
                        otherArtworks.push({ artwork: otherArtwork, track: index })
                        if (otherTracks.indexOf(index) < 0) {
                            otherTracks.push(index);
                        }
                    }
                })
            }
        })
        if (otherArtworks.length === 0) {
            errors.push("No artworks of the same length exist on other tracks at the moment!")
            setalphaChannelInsertsErrors(errors);
        } else {
            setSuitableArtworks(otherArtworks);
            setSuitableTracks(otherTracks);
            updateSelectedTrack(otherTracks[0]);
        }
    }, [artwork.droppedTrack, artwork.durationInMillis, artwork.id, tracks]);

    return (
        <Dialog open={ true } onClose={ handleClose } fullWidth={true} maxWidth='sm'>
            {alphaChannelInsertsErrors.length > 0 ?
                <Alert severity="warning" >
                    <AlertTitle><Typography variant="h6">Invalid operation</Typography></AlertTitle>
                    <List dense={true}>
                    {
                        alphaChannelInsertsErrors.map(
                            (error, index) =>
                                <ListItem key={index} sx={{padding: "4px 0"}}>
                                    <ListItemText>{ error }</ListItemText>
                                </ListItem>
                        )
                    }
                    </List>
                </Alert> : (
                    <Fragment>
                        <DialogTitle sx={{ color: "#8f2883" }}>Alpha Channel Inserts</DialogTitle>
                        <DialogContent>
                            <Stack sx={{ width: "100%" }} >
                                { selectedTrack ? (
                                    <Stack direction="row" sx={ { marginTop: 1 } }>
                                    <InputLabel id="source-select-label" sx={ labelStyle }>Choose source:</InputLabel>
                                    <Select
                                        id="source-track-select"
                                        value={ selectedTrack.index }
                                        label="Track"
                                        variant="standard"
                                        onChange={ e => updateSelectedTrack(e.target.value) }
                                        sx={ inputStyle }
                                    >
                                        { suitableTracks.map((track, index) =>
                                            <MenuItem key={ index } value={ track }>Track { track + 1 }</MenuItem>) }
                                    </Select>
                                    <Select
                                        id="source-artwork-select"
                                        value="0"
                                        label="Artwork"
                                        variant="standard"
                                        onChange={ () => {
                                        } }
                                        sx={ inputStyle }
                                    >
                                        { tracks.map((track, index) => {
                                            <MenuItem value="0">Track { index }</MenuItem>
                                        }) }
                                    </Select>
                                </Stack>) : null
                                }
                                <Divider sx={{ marginTop: 2, marginBottom: 2}}/>
                                <Stack direction="row">
                                    <InputLabel id="source-label" sx={ labelStyle } >Source:</InputLabel>
                                </Stack>
                                <Stack direction="row">
                                    <InputLabel id="dest-label" sx={ labelStyle } >Destination:</InputLabel>
                                </Stack>
                                <Stack direction="row">
                                    <InputLabel id="type-label" sx={ labelStyle } >Type:</InputLabel>
                                </Stack>
                            </Stack>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={ handleClose }>Cancel</Button>
                        <Button onClick={ handleSave }>Save</Button>
                    </DialogActions>
                </Fragment>
                )
            }
        </Dialog>
    );
}