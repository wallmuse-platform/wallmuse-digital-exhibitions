// Rights.js

import React, { useState } from 'react';
import { Button, Chip, Stack, styled, Typography, Box, InputLabel } from "@mui/material";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import FormControl from "@mui/material/FormControl";
import { Literals } from "../constants/Literals";
import { useTranslation } from "react-i18next";
import { useCountries } from './useCountries';
import { Height, LineWeight } from '@mui/icons-material';

const ListItem = styled('li')(({ theme }) => ({
    margin: theme.spacing(0.5),
}));

export default function Rights({
    rights,
    setRights,
    currentRight,
    setCurrentRight,
    currentRightCountry,
    setCurrentRightCountry,
    rightsLabel = "Rights", // New prop for Rights label, No default value
    countryLabel = "Countries", // New prop for Countries label, No default value
    onRightChange = null, // Optional callback when a right is selected
    onCountryChange = null, // Optional callback when a country is selected
    selectVariant = "standard",  // Default to 'standard' for the underlined style
    rightsDirection = "",
    formControlHeight = null,
    rightsLabelAsTitle = true,
    isPremium = true // If true, Copyright is selectable; if false, it's greyed out (Premium feature)
}) {
    const { t } = useTranslation();
    const countries = useCountries();

    const [editing, setEditing] = useState(false);
    const ALL = Literals.ALL;

    const handleRightClick = rightToEdit => () => {
        setCurrentRight(rightToEdit.type);
        setCurrentRightCountry(rightToEdit.country || ALL);
        setEditing(true);
    };

    const handleRightDelete = rightToDelete => () => {
        const deletedCountry = rightToDelete.country;
        if ((currentRightCountry === ALL && typeof deletedCountry === "undefined") || currentRightCountry === deletedCountry) {
            setEditing(false);
        }
        setRights(rights => rights.filter(right => right.country !== rightToDelete.country));
    };

    const handleRightChange = event => {
        setCurrentRight(event.target.value);
        if (onRightChange) onRightChange(event.target.value);
    };

    const handleCountryChange = event => {
        const newCountry = event.target.value;
        setEditing(rights && rights.filter(r => (typeof r.country === "undefined" && newCountry === 'ALL') || r.country === newCountry).length > 0);
        setCurrentRightCountry(newCountry);
        if (onCountryChange) onCountryChange(newCountry);
    };

    const addRight = () => {
        const newRight = {
            type: currentRight,
            direction: 'A'
        };
        if (currentRightCountry !== ALL) {
            newRight.country = currentRightCountry;
        }
        let newRights = rights
            ? rights.filter(d => d.country !== currentRightCountry)
            : [];
        if (currentRightCountry === ALL) {
            newRights = newRights.filter(r => typeof r.country !== "undefined");
        }
        newRights = [...newRights, newRight];
        setRights(newRights);
        setEditing(true);
    };

    const selectStyles = selectVariant === 'none' ? { border: 'none', boxShadow: 'none', '& .MuiOutlinedInput-notchedOutline': { border: 'none' } } : {};

    const commonSelectStyle = {
        paddingTop: 'formControlHeight',
        paddingBottom: 'formControlHeight' // Adjust to match the larger padding
    };

    return (
        <Stack spacing={1}>
            {rightsLabelAsTitle && rightsLabel && <Typography variant="subtitle1">{rightsLabel}</Typography>}

            <Box
                sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', md: rightsDirection }, // Column on mobile, row on larger screens
                    gap: 2, // Add gap between elements
                    alignItems: 'stretch',  // Ensures items stretch to the same height
                }}
            >
                <FormControl
                    variant={selectVariant}
                    sx={{
                        ...selectStyles,
                        flex: 1,
                        minHeight: formControlHeight,  // Ensure this matches the minHeight of the other control
                        ...commonSelectStyle

                    }}
                >
                    {rightsLabel && <InputLabel>{rightsLabel}</InputLabel>}
                    <Select
                        value={currentRight}
                        onChange={handleRightChange}
                        size="small"
                        sx={{ 
                            ...selectStyles, 
                            ...commonSelectStyle,
                            minHeight: formControlHeight  // Ensure this matches the minHeight of the other control
                        }}
                    >
                        <MenuItem value="-11">{t("rights.no-access")}</MenuItem>
                        <MenuItem value="-1">{t("rights.free")}</MenuItem>
                        <MenuItem
                            value="-2"
                            disabled={!isPremium}
                            sx={!isPremium ? { opacity: 0.4 } : {}}
                        >
                            {t("rights.copyright")}{!isPremium ? ' (Premium)' : ''}
                        </MenuItem>
                        <MenuItem value="-3">{t("rights.copyleft")}</MenuItem>
                        <MenuItem value="-4">{t("rights.cc-by")}</MenuItem>
                        <MenuItem value="-5">{t("rights.cc-by-sa")}</MenuItem>
                        <MenuItem value="-6">{t("rights.cc-by-nd")}</MenuItem>
                        <MenuItem value="-7">{t("rights.cc-by-nc")}</MenuItem>
                        <MenuItem value="-8">{t("rights.cc-by-nc-sa")}</MenuItem>
                        <MenuItem value="-9">{t("rights.cc-by-nc-nd")}</MenuItem>
                        <MenuItem value="-10">{t("rights.other")}</MenuItem>
                    </Select>
                </FormControl>

                <FormControl
                    variant={selectVariant}
                    sx={{
                        ...selectStyles,
                        flex: 1,
                        minHeight: formControlHeight,  // Ensure this matches the minHeight of the other control
                        ...commonSelectStyle

                    }
                    }>
                    {countryLabel && <InputLabel>{countryLabel}</InputLabel>}
                    <Select
                        value={currentRightCountry}
                        onChange={handleCountryChange}
                        sx={selectStyles}
                    >
                        {countries.map((country) => (
                            <MenuItem key={country.value} value={country.value}>
                                {country.label}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                    variant="outlined"
                    size="small"
                    onClick={addRight}
                    disabled={!(currentRight && currentRightCountry)}
                >
                    {editing ? t("rights.update") : t("rights.add")}
                </Button>
            </Box>

            {rights ? (
                <Stack
                    direction="row"
                    component="ul"
                    sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        listStyle: 'none',
                        p: 0.5,
                        m: 0,
                    }}
                >
                    {rights.map((data, index) => (
                        <ListItem key={index}>
                            <Chip
                                label={data.country || ALL}
                                onClick={handleRightClick(data)}
                                onDelete={handleRightDelete(data)}
                                size="small"
                            />
                        </ListItem>
                    ))}
                </Stack>
            ) : null}
        </Stack>
    );
}