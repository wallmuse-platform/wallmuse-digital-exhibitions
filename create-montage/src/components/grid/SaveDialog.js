import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle, Typography,
} from "@mui/material";
import React from "react";
import { constructDuration } from "../artworks/ArtworkUtils";
import { useTranslation } from 'react-i18next';

export function SaveDialog({saveDialogOpen, cancelSave, confirmSave, name, numberOfTracks, duration, suitableForChildren, saveInProgress, themeName }) {

    const { t } = useTranslation();

    return <Dialog
        open={ saveDialogOpen }
        onClose={ cancelSave }
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
    >
        <DialogTitle id="alert-dialog-title">
            {t("save.dialog.title." + themeName)}
        </DialogTitle>
        <DialogContent>
            <Typography variant="body1">{ `${t("save.dialog.name")} ${name}` }</Typography>
            <Typography variant="body1">{ `${t("save.dialog.tracks")} ${numberOfTracks}` }</Typography>
            <Typography variant="body1">{ `${t("save.dialog.duration")} ${constructDuration(duration)}` }</Typography>
            <Typography variant="body1">{ `${t("save.dialog.rating")} ${suitableForChildren ? 
                t("save.dialog.rating.yes") : 
                t("save.dialog.rating.no")}` }</Typography>
        </DialogContent>
        <DialogActions>
            <Button onClick={ cancelSave }>{ t("action.cancel") }</Button>
            <Button onClick={ confirmSave } autoFocus disabled={ saveInProgress }>
                { saveInProgress ? t("action.save.progress") : t("action.save") }
            </Button>
        </DialogActions>
    </Dialog>;
}