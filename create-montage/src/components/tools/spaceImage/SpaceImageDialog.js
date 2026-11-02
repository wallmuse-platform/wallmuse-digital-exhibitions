import {
    Alert, AlertTitle,
    Button, Checkbox,
    Dialog, DialogActions, DialogContent,
    DialogTitle,
    Divider,
    InputLabel, List, ListItem, ListItemText,
    Stack, Typography
} from "@mui/material";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import React, { useState, useEffect, Fragment } from "react";
import { OrientationTypes, ResolutionTypes } from "../../constants/ArtworkProperties";
import { calculateTrackEndTime } from "../../../utils/SaveUtils";


const labelStyle = {
    padding: "10px 0 5px",
    width: 150
}
const inputStyle = {
    marginLeft: 2,
    width: 120
}
export default function SpaceImageDialog({image, setImage, updateSpaceImageProperties, tracks}) {

    const [spaceImageProperties, setSpaceImageProperties] = useState(image.spaceImageProperties);
    const [spaceImageErrors, setSpaceImageErrors] = useState([]);
    const [suitableTracks, setSuitableTracks] = useState([]);

    const handleClose = () => {
        setImage(null);
    }
    const handleSave = () => {
        image.spaceImageProperties = spaceImageProperties;
        updateSpaceImageProperties(image);
        setImage(null);
    }
    const updateSpaceImageSource = (e) => {
        setSpaceImageProperties({...spaceImageProperties, source: e.target.checked});
    }
    const updateSpaceImageDestination = (e) => {
        setSpaceImageProperties({...spaceImageProperties, destination: e.target.checked});
    }
    const updateSpaceImageType = (e) => {
        setSpaceImageProperties({...spaceImageProperties, type: e.target.value});
    }
    const updateSpaceImageΤargetTrack = e => {
        setSpaceImageProperties({...spaceImageProperties, targetTrack: e.target.value})
    }

    console.log(suitableTracks)

    useEffect(() => {
        const findTracksStartingSameTime = () => {
            const suitableTracks = [];
            const artworkStartTime = image.endTime - image.durationInMillis;
            tracks.forEach((track, index) => {
                if (index !== image.droppedTrack && calculateTrackEndTime(track) === artworkStartTime) {
                    suitableTracks.push(index)
                }
            })
            console.log(suitableTracks)
            return suitableTracks;
        }

        const errors = []
        if ( image.resolution === ResolutionTypes.SD ) {
            errors.push("Images of at least HD resolution can be spaced.")
        }
        if ( !image.maxResWidth || !image.maxResHeight ) {
            errors.push("The width or height of this image are not available.")
        } else if ( image.orientation === OrientationTypes.LANDSCAPE && image.maxResWidth < 2 * 1920 ) {
            errors.push(`This is a landscape image but its width at ${image.maxResWidth}px is not sufficient.`)
        } else if ( image.orientation === OrientationTypes.PORTRAIT && image.maxResHeight < 2 * 1920 ) {
            errors.push(`This is a portrait image but its height at ${image.maxResHeight}px is not sufficient.`)
        }
        if (errors.length > 0) {
            setSpaceImageErrors(errors);
            return;
        }
        const otherTracks = findTracksStartingSameTime();
        if (otherTracks.length === 0) {
            errors.push(`There are currently no suitable tracks to space this image. In order to space an image there must be at least one track ending at the same time as the start time of this image.`)
        } else {
            setSuitableTracks(otherTracks);
        }
        setSpaceImageErrors(errors)
    }, [image.maxResHeight, image.maxResWidth, image.orientation, image.resolution, image.droppedTrack, image.durationInMillis, image.endTime, tracks]);

    return (
        <Dialog open={ true } onClose={ handleClose } fullWidth={true} maxWidth='sm'>
            {spaceImageErrors.length > 0 ?
                <Alert severity="warning" >
                    <AlertTitle><Typography variant="h6">The image cannot be spaced:</Typography></AlertTitle>
                    <List dense={true}>
                    {
                        spaceImageErrors.map(
                            (error, index) =>
                                <ListItem key={index} sx={{padding: "4px 0"}}>
                                    <ListItemText>{ error }</ListItemText>
                                </ListItem>
                        )
                    }
                    </List>
                </Alert> : (
                    <Fragment>
                        <DialogTitle sx={{ color: "#8f2883" }}>Space Image</DialogTitle>
                        <DialogContent>
                            <Stack sx={{ width: "100%" }} >
                                <Stack direction="row">
                                    <InputLabel id="target-track-label" sx={ labelStyle } >Choose target:</InputLabel>
                                    <Select
                                        labelId="target-track-label"
                                        id="target-track-select"
                                        value={ spaceImageProperties.targetTrack || ''}
                                        label="Choose target"
                                        variant="standard"
                                        onChange={ updateSpaceImageΤargetTrack }
                                        sx={{ ...inputStyle, width: 200 }}

                                    >
                                        {suitableTracks.map((trackIndex) => (
                                            <MenuItem key={ trackIndex } value={ trackIndex }>Track { trackIndex }</MenuItem>
                                            ))}
                                    </Select>
                                </Stack>
                                <Divider sx={{ marginTop: 2, marginBottom: 2}}/>
                                <Stack direction="row">
                                    <InputLabel id="source-label" sx={ labelStyle } >Source:</InputLabel>
                                    <Checkbox checked={spaceImageProperties.source} onChange={ updateSpaceImageSource } />
                                </Stack>
                                <Stack direction="row">
                                    <InputLabel id="dest-label" sx={ labelStyle } >Destination:</InputLabel>
                                    <Checkbox checked={spaceImageProperties.destination} onChange={ updateSpaceImageDestination } />
                                </Stack>
                                <Stack direction="row">
                                    <InputLabel id="type-label" sx={ labelStyle } >Type:</InputLabel>
                                    <Select
                                        labelId="type-label"
                                        value={ spaceImageProperties.type }
                                        label="Type"
                                        variant="standard"
                                        onChange={ updateSpaceImageType }
                                        sx={ inputStyle }
                                    >
                                        <MenuItem value="portrait">Portrait</MenuItem>
                                        <MenuItem value="landscape">Landscape</MenuItem>
                                        <MenuItem value="specific">Specific</MenuItem>
                                    </Select>
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