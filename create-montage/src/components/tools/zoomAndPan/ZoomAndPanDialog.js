import {
    Alert,
    Button,
    Dialog, DialogActions, DialogContent, DialogContentText,
    DialogTitle,
    Divider,
    InputLabel,
    Stack, TextField,
    Typography
} from "@mui/material";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import * as React from "react";
import { useState } from "react";
import { useTranslation } from 'react-i18next';

export default function ZoomAndPanDialog({image, setImage, updateImageZoomAndPan}) {

    const { t } = useTranslation();
    const [scaleWarning, setScaleWarning] = useState(false);

    const labelStyle = {
        padding: "4px 0 5px",
        width: 50
    }
    const inputStyle = {
        marginLeft: 2,
        width: 120
    }
    const [zoomAndPan, setZoomAndPan] = useState(image.zoomAndPan)
    const handleClose = () => {
        setImage(null);
    }
    const handleSave = () => {
        image.zoomAndPan = zoomAndPan;
        updateImageZoomAndPan(image);
        setImage(null);
    }
    const updateZoomAndPanStartFrom = event => {
        setZoomAndPan(old => {
            const newZoomAndPan = { ...old };
            const startProp = { ...old.start };
            startProp.from = event.target.value;
            newZoomAndPan.start = startProp
            return newZoomAndPan;
        })
    }
    const updateZoomAndPanStartScale = event => {
        const scale = event.target.value;
        if (scale < 80 || scale > 130) {
            setScaleWarning(true)
        } else {
            setScaleWarning(false)
        }
        setZoomAndPan(old => {
            const newZoomAndPan = { ...old };
            const startProp = { ...old.start };
            startProp.scale = scale;
            newZoomAndPan.start = startProp
            return newZoomAndPan;
        })
    }
    const updateZoomAndPanStartScaleDirection = event => {
        const scaleDirection = event.target.value;
        setZoomAndPan(old => {
            const newZoomAndPan = { ...old };
            const startProp = { ...old.start };
            startProp.scaleDirection = scaleDirection;
            newZoomAndPan.start = startProp
            return newZoomAndPan;
        })
    }
    const updateZoomAndPanEndTo = event => {
        setZoomAndPan(old => {
            const newZoomAndPan = { ...old };
            const endProp = { ...old.end };
            endProp.to = event.target.value;
            newZoomAndPan.end = endProp
            return newZoomAndPan;
        })
    }
    const updateZoomAndPanEndScale = event => {
        const scale = event.target.value;
        if (scale < 80 || scale > 130) {
            setScaleWarning(true)
        } else {
            setScaleWarning(false)
        }
        setZoomAndPan(old => {
            const newZoomAndPan = { ...old };
            const endProp = { ...old.end };
            endProp.scale = scale;
            newZoomAndPan.end = endProp
            return newZoomAndPan;
        })
    }
    const updateZoomAndPanEndScaleDirection = event => {
        const scaleDirection = event.target.value;
        setZoomAndPan(old => {
            const newZoomAndPan = { ...old };
            const endProp = { ...old.end };
            endProp.scaleDirection = scaleDirection;
            newZoomAndPan.end = endProp
            return newZoomAndPan;
        })
    }
    const updateZoomAndPanType = event => {
        setZoomAndPan(old => {
            const newZoomAndPan = { ...old };
            newZoomAndPan.type = event.target.value;
            return newZoomAndPan;
        })
    }

    return (
        <Dialog open={ true } onClose={ handleClose } maxWidth='xs'>
            {scaleWarning ?
                <Alert severity="warning" >
                    <Typography variant="body1"> { t("tools.zoom-and-pan.warning.low-scale") } </Typography>
                </Alert> : undefined
            }
            <DialogTitle sx={{ color: "#2adb68" }}> { t("tools.zoom-and-pan.title") } </DialogTitle>
            <DialogContent>
                <DialogContentText>
                    { t("tools.zoom-and-pan.desc") }
                </DialogContentText>
                <Stack sx={{ width: "100%" }} >
                    <Divider sx={{ marginTop: 2, marginBottom: 2}}/>
                    <Typography variant="h6" sx={{ color: "#2adb68" }}>{ t("tools.zoom-and-pan.start") }</Typography>
                    <Stack direction="row">
                        <InputLabel id="start-from-select-label" sx={ labelStyle } >{ t("tools.zoom-and-pan.from") }</InputLabel>
                        <Select
                            labelId="start-from-select-label"
                            id="start-from-select"
                            value={ zoomAndPan.start.from }
                            label={ t("tools.zoom-and-pan.from") }
                            variant="standard"
                            onChange={ updateZoomAndPanStartFrom }
                            sx={ inputStyle }
                        >
                            <MenuItem value="top-left">{ t("tools.zoom-and-pan.top-left") }</MenuItem>
                            <MenuItem value="top-right">{ t("tools.zoom-and-pan.top-right") }</MenuItem>
                            <MenuItem value="bottom-left">{ t("tools.zoom-and-pan.bottom-left") }</MenuItem>
                            <MenuItem value="bottom-right">{ t("tools.zoom-and-pan.bottom-right") }</MenuItem>
                            <MenuItem value="centre">{ t("tools.zoom-and-pan.centre") }</MenuItem>
                        </Select>
                    </Stack>
                    <Stack direction="row" sx={{ marginTop: 1 }}>
                        <InputLabel id="start-scale-select-label" sx={ labelStyle } >{ t("tools.zoom-and-pan.scale") }</InputLabel>
                        <Select
                            id="start-scaleDirection-select"
                            value={ zoomAndPan.start.scaleDirection }
                            label={ t("tools.zoom-and-pan.direction") }
                            variant="standard"
                            onChange={ updateZoomAndPanStartScaleDirection }
                            sx={ inputStyle }
                        >
                            <MenuItem value="height">{ t("tools.zoom-and-pan.height") }</MenuItem>
                            <MenuItem value="width">{ t("tools.zoom-and-pan.width") }</MenuItem>
                        </Select>
                        <TextField
                            type="number"
                            id="start-scale-select"
                            value={ zoomAndPan.start.scale }
                            variant="standard"
                            InputProps={{
                                endAdornment: (
                                    <span style={{ position: "absolute", right: "20px" }}>
                                        %
                                    </span>
                                )
                            }}
                            onChange={ updateZoomAndPanStartScale }
                            sx={ inputStyle }
                        />
                    </Stack>
                    <Divider sx={{ marginTop: 2, marginBottom: 2}}/>
                    <Typography variant="subtitle1" sx={{ color: "#2adb68" }}>{ t("tools.zoom-and-pan.end") }</Typography>
                    <Stack direction="row">
                        <InputLabel id="end-to-select-label" sx={ labelStyle } >{ t("tools.zoom-and-pan.to") }</InputLabel>
                        <Select
                            labelId="end-to-select-label"
                            id="end-to-select"
                            value={ zoomAndPan.end.to }
                            label={ t("tools.zoom-and-pan.to") }
                            variant="standard"
                            onChange={ updateZoomAndPanEndTo }
                            sx={ inputStyle }
                        >
                            <MenuItem value="top-left">{ t("tools.zoom-and-pan.top-left") }</MenuItem>
                            <MenuItem value="top-right">{ t("tools.zoom-and-pan.top-right") }</MenuItem>
                            <MenuItem value="bottom-left">{ t("tools.zoom-and-pan.bottom-left") }</MenuItem>
                            <MenuItem value="bottom-right">{ t("tools.zoom-and-pan.bottom-right") }</MenuItem>
                            <MenuItem value="centre">{ t("tools.zoom-and-pan.centre") }</MenuItem>
                        </Select>
                    </Stack>
                    <Stack direction="row" sx={{ marginTop: 1 }}>
                        <InputLabel id="end-scale-select-label" sx={ labelStyle } >{ t("tools.zoom-and-pan.scale") }</InputLabel>
                        <Select
                            id="end-scaleDirection-select"
                            value={ zoomAndPan.end.scaleDirection }
                            label={ t("tools.zoom-and-pan.direction") }
                            variant="standard"
                            onChange={ updateZoomAndPanEndScaleDirection }
                            sx={ inputStyle }
                        >
                            <MenuItem value="height">{ t("tools.zoom-and-pan.height") }</MenuItem>
                            <MenuItem value="width">{ t("tools.zoom-and-pan.width") }</MenuItem>
                        </Select>
                        <TextField
                            type="number"
                            id="end-scale-select"
                            value={ zoomAndPan.end.scale }
                            variant="standard"
                            InputProps={{
                                endAdornment: (
                                    <span style={{ position: "absolute", right: "20px" }}>
                                        %
                                    </span>
                                )
                            }}
                            onChange={ updateZoomAndPanEndScale }
                            sx={ inputStyle }
                        />
                    </Stack>
                    <Divider sx={{ marginTop: 2, marginBottom: 2}}/>
                    <Stack direction="row">
                        <InputLabel id="type-select-label" sx={ labelStyle } >{ t("tools.zoom-and-pan.type") }</InputLabel>
                        <Select
                            labelId="type-select-label"
                            id="type-select"
                            value={ zoomAndPan.type }
                            label={ t("tools.zoom-and-pan.type") }
                            variant="standard"
                            onChange={ updateZoomAndPanType }
                            sx={ inputStyle }
                        >
                            <MenuItem value="constant">{ t("tools.zoom-and-pan.constant") }</MenuItem>
                            <MenuItem value="ease-in">{ t("tools.zoom-and-pan.ease-in") }</MenuItem>
                            <MenuItem value="ease-out">{ t("tools.zoom-and-pan.ease-out") }</MenuItem>
                            <MenuItem value="ease-both">{ t("tools.zoom-and-pan.ease-both") }</MenuItem>
                            <MenuItem value="accelerate">{ t("tools.zoom-and-pan.accelerate") }</MenuItem>
                            <MenuItem value="decelerate">{ t("tools.zoom-and-pan.decelerate") }</MenuItem>
                        </Select>
                    </Stack>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={ handleClose }>{ t("action.cancel") }</Button>
                <Button onClick={ handleSave }>{ t("action.save") }</Button>
            </DialogActions>
        </Dialog>
    );
}