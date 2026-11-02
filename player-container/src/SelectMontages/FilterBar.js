import React from 'react';
import { Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

// const FilterBar = ({ montages,  orderBy, setOrderBy, displayBy, setDisplayBy, splittable, deconstructable, qualityBy, setQualityBy, uhd, orientationBy, setOrientationBy, orientation, commercialBy, setCommercialBy, commercial }) => {

const FilterBar = ({ orderBy, setOrderBy, displayBy, setDisplayBy, qualityBy, setQualityBy, orientationBy, setOrientationBy, commercialBy, setCommercialBy }) => {

    const { t } = useTranslation();

    const handleOrderChange = (e) => {
        setOrderBy(e.target.value);
        };
    //TODO
    // Incorrect use of <label for=FORM_ELEMENT>
    // The label's for attribute doesn't match any element id. This might prevent the browser from correctly autofilling the form and accessibility tools from working correctly.
    // To fix this issue, make sure the label's for attribute references the correct id of a form field.
    return (
        <div>
            <FormControl sx={{ margin: '10px', width: '100%', maxWidth: '200px' }}>
                <InputLabel>{t("_order")}</InputLabel>
                <Select value={orderBy} onChange={handleOrderChange}>
                    <MenuItem value="Most Recent">{t("_most_recent")}</MenuItem>
                    <MenuItem value="Alphabetical">{t("_alphabetical")}</MenuItem>
                </Select>
            </FormControl>
            <FormControl sx={{ margin: '10px', width: '100%', maxWidth: '200px' }}>
                <InputLabel>{t("_display")}</InputLabel>
                <Select value={displayBy} onChange={(e) => setDisplayBy(e.target.value)}>
                    <MenuItem value="All Display Types">{t("_all_display_types")}</MenuItem>
                    <MenuItem value="Standard">{t("_standard")}</MenuItem>
                    <MenuItem value="Video Wall">{t("_video_wall")}</MenuItem>
                    <MenuItem value="Deconstructed">{t("_deconstructed")}</MenuItem>
                </Select>
            </FormControl>
            <FormControl sx={{ margin: '10px', width: '100%', maxWidth: '200px' }}>
                <InputLabel>{t("_quality")}</InputLabel>
                <Select value={qualityBy} onChange={(e) => setQualityBy(e.target.value)}>
                    <MenuItem value="All Resolutions">{t("_all_resolutions")}</MenuItem>
                    <MenuItem value="HD">{t("_hd")}</MenuItem>
                    <MenuItem value="4K">{t("_4k")}</MenuItem>
                </Select>
            </FormControl>
            <FormControl sx={{ margin: '10px', width: '100%', maxWidth: '200px' }}>
                <InputLabel>{t("_orientation")}</InputLabel>
                <Select value={orientationBy} onChange={(e) => setOrientationBy(e.target.value)}>
                    <MenuItem value="All Orientations">{t("_all_orientations")}</MenuItem>
                    <MenuItem value="Landscape">{t("_landscape")}</MenuItem>
                    <MenuItem value="Portrait">{t("_portrait")}</MenuItem>
                </Select>
            </FormControl>
            <FormControl sx={{ margin: '10px', width: '100%', maxWidth: '200px' }}>
                <InputLabel>{t("_access")}</InputLabel>
                <Select value={commercialBy} onChange={(e) => setCommercialBy(e.target.value)}>
                    <MenuItem value="All Access Types">{t("_all_access_types")}</MenuItem>
                    <MenuItem value="Premium">{t("_premium")}</MenuItem>
                    <MenuItem value="Free">{t("_free")}</MenuItem>
                </Select>
            </FormControl>
        </div>
    );
}

FilterBar.propTypes = {
    orderBy: PropTypes.string.isRequired,
    setOrderBy: PropTypes.func.isRequired,
    displayBy: PropTypes.string.isRequired,
    setDisplayBy: PropTypes.func.isRequired,
    qualityBy: PropTypes.string.isRequired,
    setQualityBy: PropTypes.func.isRequired,
    orientationBy: PropTypes.string.isRequired,
    setOrientationBy: PropTypes.func.isRequired,
    commercialBy: PropTypes.string.isRequired,
    setCommercialBy: PropTypes.func.isRequired,
  };

export default FilterBar;
