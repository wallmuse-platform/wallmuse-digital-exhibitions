import {Alert, AlertTitle, Dialog, Typography} from "@mui/material";
import React from "react";
import { useTranslation } from 'react-i18next';

export function ErrorDialog({errors, onClose}) {

    const { t } = useTranslation();

    return <Dialog
        open={ errors.length > 0 }
        onClose={ onClose }
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
    >
        <Alert severity="error" onClose={ onClose }>
            <AlertTitle><Typography variant="h5">{ t("save.dialog.error.title") }</Typography></AlertTitle>
            <ul>
                {
                    errors.map(
                        (error, index) =>
                            <li key={index}><Typography variant="subtitle2">{ error }</Typography></li>
                    )
                }
            </ul>
        </Alert>
    </Dialog>;
}