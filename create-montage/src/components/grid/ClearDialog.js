import {
    Alert,
    Button,
    Dialog,
    DialogActions,
    Typography
} from "@mui/material";
import React from "react";
import { useTranslation } from "react-i18next";

export function ClearDialog({ clear }) {

    const { t } = useTranslation();

    return <Dialog
        open={ true }
        onClose={ () => clear(false) }
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
    >
        <Alert severity="warning" onClose={ () => clear(false) }>
            <Typography variant="body1">{t("clear.dialog.body")}</Typography>
        </Alert>
        <DialogActions sx={{ backgroundColor: "rgb(255, 244, 229)" }}>
            <Button variant="text" onClick={ () => clear(false) }>{ t("action.cancel") }</Button>
            <Button variant="contained" onClick={ () => clear(true) } autoFocus >
                { t("action.confirm") }
            </Button>
        </DialogActions>
    </Dialog>;
}