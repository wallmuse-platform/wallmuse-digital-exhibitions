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
                        label={t("component.playlist.exhibitions.edit.rename")}
                        value={updatedName} // Use value instead of defaultValue
                        variant="filled"
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