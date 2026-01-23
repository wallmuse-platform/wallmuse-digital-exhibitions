import React from "react";
import { Checkbox, FormControlLabel } from "@mui/material";
import { useTranslation } from 'react-i18next';

export default function SCCheckbox({ suitableForChildren, setSuitableForChildren }) {

    const { t } = useTranslation();

    function onChange (e) {
        setSuitableForChildren(e.target.checked);
    }

    return (
        <FormControlLabel
            className={ "wm-sc-chkbox" }
            control={
                <Checkbox
                    size="small"
                    checked={ suitableForChildren }
                    onChange={ onChange }
                />
            }
            label={ t("checkbox.label") }
        />);
}