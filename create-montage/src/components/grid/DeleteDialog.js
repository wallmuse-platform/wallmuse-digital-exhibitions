import {
    Alert,
    Button,
    Dialog,
    DialogActions,
    Typography,
} from "@mui/material";
import React from "react";
import { useTranslation } from 'react-i18next';

export function DeleteDialog({deleteDialogOpen, cancelDelete, confirmDelete, name, deleteInProgress }) {

    const { t } = useTranslation();

    return <Dialog
        open={ deleteDialogOpen }
        onClose={ cancelDelete }
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
    >
        <Alert severity="warning" onClose={ cancelDelete }>
            <Typography variant="body1">{ `${t("delete.dialog.body1")} ${name}? ${t("delete.dialog.body2")}.` }
            </Typography>
        </Alert>
        <DialogActions sx={{ backgroundColor: "rgb(255, 244, 229)" }}>
            <Button onClick={ cancelDelete }>{ t("action.cancel") }</Button>
            <Button onClick={ confirmDelete } autoFocus disabled={ deleteInProgress }>
                { deleteInProgress ? t("action.delete.progress") : t("action.delete") }
            </Button>
        </DialogActions>
    </Dialog>;
}