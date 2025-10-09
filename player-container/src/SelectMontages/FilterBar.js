import React from 'react';
import { Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import PropTypes from 'prop-types';

// const FilterBar = ({ montages,  orderBy, setOrderBy, displayBy, setDisplayBy, splittable, deconstructable, qualityBy, setQualityBy, uhd, orientationBy, setOrientationBy, orientation, commercialBy, setCommercialBy, commercial }) => {

const FilterBar = ({ orderBy, setOrderBy, displayBy, setDisplayBy, qualityBy, setQualityBy, orientationBy, setOrientationBy, commercialBy, setCommercialBy }) => {

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
                <InputLabel>Order</InputLabel>
                <Select value={orderBy} onChange={handleOrderChange}>
                    <MenuItem value="Most Recent">Most Recent</MenuItem>
                    <MenuItem value="Alphabetical">Alphabetical</MenuItem>
                </Select>
            </FormControl>
            <FormControl sx={{ margin: '10px', width: '100%', maxWidth: '200px' }}>
                <InputLabel>Display</InputLabel>
                <Select value={displayBy} onChange={(e) => setDisplayBy(e.target.value)}>
                    <MenuItem value="All Display Types">All Display Types</MenuItem>
                    <MenuItem value="Standard">Standard</MenuItem>
                    <MenuItem value="Video Wall">Video Wall</MenuItem>
                    <MenuItem value="Destructured">Destructured</MenuItem>
                </Select>
            </FormControl>
            <FormControl sx={{ margin: '10px', width: '100%', maxWidth: '200px' }}>
                <InputLabel>Quality</InputLabel>
                <Select value={qualityBy} onChange={(e) => setQualityBy(e.target.value)}>
                    <MenuItem value="All Resolutions">All Resolutions</MenuItem>
                    <MenuItem value="HD">HD</MenuItem>
                    <MenuItem value="4K">4K</MenuItem>
                </Select>
            </FormControl>
            <FormControl sx={{ margin: '10px', width: '100%', maxWidth: '200px' }}>
                <InputLabel>Orientation</InputLabel>
                <Select value={orientationBy} onChange={(e) => setOrientationBy(e.target.value)}>
                    <MenuItem value="All Orientations">All Orientations</MenuItem>
                    <MenuItem value="Landscape">Landscape</MenuItem>
                    <MenuItem value="Portrait">Portrait</MenuItem>
                </Select>
            </FormControl>
            <FormControl sx={{ margin: '10px', width: '100%', maxWidth: '200px' }}>
                <InputLabel>Access</InputLabel>
                <Select value={commercialBy} onChange={(e) => setCommercialBy(e.target.value)}>
                    <MenuItem value="All Access Types">All Access Types</MenuItem>
                    <MenuItem value="Premium">Premium</MenuItem>
                    <MenuItem value="Free">Free</MenuItem>
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