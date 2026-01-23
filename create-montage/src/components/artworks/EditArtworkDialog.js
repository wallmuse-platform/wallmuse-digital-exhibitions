import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Stack,
    TextField
} from "@mui/material";
import { artworkIsImage, getName } from "./ArtworkUtils";
import { DeleteOutline } from "@mui/icons-material";
import * as React from "react";
import TrackTitle from "../tools/title/TrackTitle";
import { isTitle } from "../tools/ToolUtils";
import { useTranslation } from "react-i18next";

export default function EditArtworkDialog({ editDialogOpen, handleEditDialogClose, artwork, handleDurationChange, handleRemove, handleEditDialogSave, titleElement, setTitleElement }) {

    const { t } = useTranslation();

    const title = isTitle(artwork)
        ? t("track.title.edit")
        : t("track.artwork.edit");

    return(
        <Dialog open={ editDialogOpen } onClose={ handleEditDialogClose } maxWidth='md'>
            <DialogTitle>{ title }</DialogTitle>
            <DialogContent>
                {
                 !isTitle(artwork) ? (
                     <DialogContentText>
                        { `${t("track.artwork.edit-properties")} "${getName(artwork)}"` }
                     </DialogContentText>
                 ) : null
                }
                <Stack sx={{ width: "100%" }} minWidth={400} >
                    {
                        artworkIsImage(artwork) ? (
                            <TextField
                                autoFocus
                                margin="dense"
                                id="duration"
                                label={ t("track.artwork.edit.duration") }
                                type="number"
                                defaultValue={ artwork.durationInMillis / 1000 }
                                variant="standard"
                                onChange={ e => {
                                    handleDurationChange(e.target.value)
                                } }
                                sx = {{ width: 150 }}
                            />
                        ) : (isTitle(artwork) ? (
                            <TrackTitle titleElement={ titleElement } setTitleElement={ setTitleElement } durationInMillis={ artwork.durationInMillis } handleDurationChange={ handleDurationChange } />
                        ) : null)
                    }
                    <Button onClick={ handleRemove } variant="outlined" startIcon={ <DeleteOutline/> }
                            sx={{ margin: "15px 0", maxWidth: "50%" }}>{ t("track.artwork.edit.remove") }</Button>
                </Stack>
            </DialogContent>
        <DialogActions>
            <Button onClick={ handleEditDialogClose }>{ t("action.cancel") }</Button>
            <Button onClick={ handleEditDialogSave }>{ t("action.save") }</Button>
        </DialogActions>
    </Dialog>
)}