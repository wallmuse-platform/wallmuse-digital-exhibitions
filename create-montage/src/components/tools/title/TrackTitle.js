import { Checkbox, Divider, FormControlLabel, FormGroup, Stack, TextField, Typography } from "@mui/material";
import FormatAlignCenterIcon from '@mui/icons-material/FormatAlignCenter';
import FormatAlignLeftIcon from '@mui/icons-material/FormatAlignLeft';
import FormatAlignRightIcon from '@mui/icons-material/FormatAlignRight';
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import * as React from "react";
import { CompactPicker } from "react-color";
import Box from "@mui/material/Box";
import { useTranslation } from 'react-i18next';

export default function TrackTitle({titleElement, setTitleElement, durationInMillis, handleDurationChange}) {

    const { t } = useTranslation();

    const handleTitleDirectionChange = (event) => {
        const oldDisplayProps = {...titleElement}
        if (parseInt(event.target.value) === -1) {
            oldDisplayProps["previousCount"] = oldDisplayProps["nextCount"]
            oldDisplayProps["nextCount"] = 0
        } else {
            oldDisplayProps["nextCount"] = oldDisplayProps["previousCount"]
            oldDisplayProps["previousCount"] = 0
        }
        setTitleElement(oldDisplayProps);
    }
    const handleTitleArtworksChange = (event) => {
        const newValue = parseInt(event.target.value);
        if (newValue >= 1) {
            const oldDisplayProps = {...titleElement}
            oldDisplayProps["nextCount"] > 0 ? oldDisplayProps["nextCount"] = newValue : oldDisplayProps["previousCount"] = newValue
            setTitleElement(oldDisplayProps);
        }
    }

    const handleTitleDisplayCheckboxChange = (e, prop) => {
        const oldDisplayProps = {...titleElement}
        oldDisplayProps[prop] = e.target.checked
        setTitleElement(oldDisplayProps);
    }
    const handleTitleDisplayPropChange = (e, prop) => {
        const oldDisplayProps = {...titleElement}
        oldDisplayProps[prop] = e.target.value
        setTitleElement(oldDisplayProps);
    }

    const handleBgChangeComplete = (color) => {
        const oldDisplayProps = {...titleElement}
        oldDisplayProps.backgroundColor = color.hex
        setTitleElement(oldDisplayProps);
    };
    const handleFgChangeComplete = (color) => {
        const oldDisplayProps = {...titleElement}
        oldDisplayProps.color = color.hex
        setTitleElement(oldDisplayProps);
    };

    return (
    <Stack>
        <Stack direction="row">
            <TextField
                id="title-artworks"
                type="number"
                variant="standard"
                label={ t("tools.title.ref-artworks") }
                value={ titleElement.nextCount > 0 ? titleElement.nextCount : titleElement.previousCount }
                onChange={ handleTitleArtworksChange }
            />
            <Select
                id="title-direction-select"
                value={ titleElement.nextCount > 0 ? 1 : -1 }
                variant="standard"
                onChange={ handleTitleDirectionChange }
                sx={ { marginLeft: 2 } }
            >
                <MenuItem value="-1">{ t("tools.title.before") }</MenuItem>
                <MenuItem value="1">{ t("tools.title.after") }</MenuItem>
            </Select>
            <TextField
                id="duration"
                label={ t("tools.title.duration") }
                type="number"
                defaultValue={ durationInMillis / 1000 }
                variant="standard"
                onChange={ e => {
                    handleDurationChange(e.target.value)
                } }
                sx={ { marginLeft: 5, width: 140 } }
            />
        </Stack>
        <Divider sx={{ marginTop: 2, marginBottom: 2}}/>
        <Typography variant="subtitle1" >{ t("tools.title.display") }</Typography>
        <Stack direction="row">
            <FormGroup row={ true }>
                <FormControlLabel control={ <Checkbox checked={ titleElement.displayTitle }
                                                      onChange={ e => handleTitleDisplayCheckboxChange(e, "displayTitle") }
                                                      size="small"/> } label={ t("tools.title.display.title") } />
                <FormControlLabel control={ <Checkbox checked={ titleElement.displayAuthor }
                                                      onChange={ e => handleTitleDisplayCheckboxChange(e, "displayAuthor") }
                                                      size="small"/> } label={ t("tools.title.display.author") } />
                <FormControlLabel control={ <Checkbox checked={ titleElement.displayDatation }
                                                      onChange={ e => handleTitleDisplayCheckboxChange(e, "displayDatation") }
                                                      size="small"/> } label={ t("tools.title.display.datation") } />
                <FormControlLabel control={ <Checkbox checked={ titleElement.displayDescription }
                                                      onChange={ e => handleTitleDisplayCheckboxChange(e, "displayDescription") }
                                                      size="small"/> } label={ t("tools.title.display.description") } />
                <FormControlLabel control={ <Checkbox checked={ titleElement.displayCredits }
                                                      onChange={ e => handleTitleDisplayCheckboxChange(e, "displayCredits") }
                                                      size="small"/> } label={ t("tools.title.display.credits") } />
            </FormGroup>
        </Stack>
        <Divider sx={{ marginTop: 2, marginBottom: 2}}/>
        <Typography variant="subtitle1">{ t("tools.title.text") }</Typography>
        <Stack direction="row">
            <Select
                id="title-font-select"
                value={ titleElement.font }
                variant="standard"
                onChange={ e => handleTitleDisplayPropChange(e, 'font') }
                sx={{ width: 100, marginRight: 2 }}
            >
                <MenuItem value="serif">serif</MenuItem>
                <MenuItem value="sans-serif">sans-serif</MenuItem>
                <MenuItem value="handwrite">handwrite</MenuItem>
                <MenuItem value="impact">impact</MenuItem>
            </Select>
            <Select
                id="title-fontsize-select"
                value={ titleElement.size }
                variant="standard"
                onChange={ e => handleTitleDisplayPropChange(e, 'size') }
                sx={{ width: 100, marginRight: 2 }}
            >
                <MenuItem value="small">{ t("tools.title.text.small") }</MenuItem>
                <MenuItem value="regular">{ t("tools.title.text.regular") }</MenuItem>
                <MenuItem value="large">{ t("tools.title.text.large") }</MenuItem>
            </Select>
            <Select
                id="title-fontsize-select"
                value={ titleElement.halign }
                renderValue={ v => <span>{ t("tools.title.text.align") } {v}</span> }
                variant="standard"
                onChange={ e => handleTitleDisplayPropChange(e, 'halign') }
                sx={{ width: 150 }}
            >
                <MenuItem value="left"><FormatAlignLeftIcon fontSize="small" sx={{ marginRight: 1 }}/> { t("tools.title.text.halign.left") }</MenuItem>
                <MenuItem value="center"><FormatAlignCenterIcon fontSize="small" sx={{ marginRight: 1 }}/> { t("tools.title.text.halign.centre") }</MenuItem>
                <MenuItem value="right"><FormatAlignRightIcon fontSize="small" sx={{ marginRight: 1 }}/> { t("tools.title.text.halign.right") }</MenuItem>
            </Select>
        </Stack>
        <Divider sx={{ marginTop: 2, marginBottom: 2}}/>
            <Stack direction="row">
                <Box>
                    <Typography variant="subtitle1">{ t("tools.title.bgcolour") }</Typography>
                    <CompactPicker
                        color={ titleElement.backgroundColor }
                        onChangeComplete={ handleBgChangeComplete }
                    />
                </Box>
                <Box sx={{ marginLeft: 2}}>
                    <Typography variant="subtitle1">{ t("tools.title.fgcolour") }</Typography>
                    <CompactPicker
                        color={ titleElement.color }
                        onChangeComplete={ handleFgChangeComplete }
                    />
                </Box>
            </Stack>
            <Divider sx={{ marginTop: 2, marginBottom: 2}}/>
    </Stack>
    );
}