// EditPlaylistDialog.js

// React core
import React, { useState, useEffect } from 'react';

// Material UI components
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from "@mui/material";

// Internationalization
import { useTranslation } from "react-i18next";

export default function EditPlaylistDialog({ editDialogOpen, handleEditDialogClose, handleEditDialogSave, currentName }) {
    // console.log('[EditPlaylistDialog]',editDialogOpen, handleEditDialogClose, handleEditDialogSave, currentName );
    const { t } = useTranslation();

    const title = t("component.playlist.exhibitions.edit.header");

    const [updatedName, setUpdatedName] = useState(currentName || t("component.playlist.exhibitions.default-name"));

    // Update state when currentName changes or dialog opens
    useEffect(() => {
        if (editDialogOpen) {
            setUpdatedName(currentName || t("component.playlist.exhibitions.default-name"));
        }
    }, [currentName, editDialogOpen, t]);

    return (
        <Dialog open={editDialogOpen} onClose={handleEditDialogClose} maxWidth='md'>
            <DialogTitle>{title}</DialogTitle>
            <DialogContent>
                <Stack sx={{ width: "100%" }} minWidth={400} >
                    <TextField
                        autoFocus
                        id="name"
                        // placeholder instead of label: the dialog title ("Edit Playlist") already
                        // provides context, so a floating label is redundant. A placeholder avoids
                        // the MUI outlined notch artifact (label text crossing the top border) and
                        // keeps the field visually clean — consistent with outlined fields elsewhere
                        // in the ecosystem.
                        placeholder={t("component.playlist.exhibitions.edit.rename")}
                        value={updatedName}
                        variant="outlined"
                        onChange={e => {
                            setUpdatedName(e.target.value)
                        }}
                        sx={{ width: 150 }}
                    />
                      {/*<Button onClick={ handleRemove } variant="outlined" startIcon={ <DeleteOutline/> }*/}
                    {/*        sx={{ margin: "15px 0", maxWidth: "50%" }}>{ t("track.artwork.edit.remove") }</Button>*/}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleEditDialogClose}>{t("action.cancel")}</Button>
                <Button onClick={() => {
                    console.log("[EditPlaylistDialog] Save button clicked, name to save:", updatedName);
                    handleEditDialogSave(updatedName);
                }}>{t("action.save")}</Button>
            </DialogActions>
        </Dialog>
    )
}