// Credits.js
import React, { useState } from 'react';
import {
    Box,
    TextField,
    Select,
    styled,
    MenuItem,
    FormControl,
    InputLabel,
    Button,
    Chip,
    Stack
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useCountries } from '../../components/details/useCountries';
import CopyrightOwnerSelector from './CopyrightOwnerSelector';

const ListItem = styled('li')(({ theme }) => ({
    margin: theme.spacing(0.5),
}));

const Credits = ({
    credits,
    setCredits,
    creditName,
    setCreditName,
    creditType,
    setCreditType,
    creditLocation,
    setCreditLocation,
    handleAddCredit
}) => {

    const { t } = useTranslation();
    const countries = useCountries();  // Fetch countries as in Rights component



    // Log the result of useCountries
    // console.log("[Credits] Fetched countries from useCountries:", countries);

    const [editing, setEditing] = useState(false);
    const ALL = 'ALL';  // Default value for all countries

    // State for AUT credit handling
    const [showOwnerSelector, setShowOwnerSelector] = useState(false);
    const [pendingCredit, setPendingCredit] = useState(null);
    

    const handleCreditClick = (creditToEdit) => () => {
        setCreditName(creditToEdit.name);
        setCreditType(creditToEdit.type);
        setCreditLocation(creditToEdit.location || ALL);
        setEditing(true);
    };

    const handleCreditDelete = (creditToDelete) => () => {
        setCredits(credits => credits.filter(credit => credit.name !== creditToDelete.name));
    };

    
    // Modified to handle AUT credits specially
    const handleAddOrUpdateCredit = () => {
        if (!creditName || !creditType) return;
        
        // For AUT type credits, show owner selector
        if (creditType === 'AUT') {
            console.log("[Credits] Setting up AUT credit:", creditName);
            
            // Store pending credit info
            const pendingCreditData = {
                name: creditName,
                type: creditType,
                location: creditLocation || ALL,
                editing: editing
            };
            
            console.log("[Credits] Setting pendingCredit:", pendingCreditData);
            setPendingCredit(pendingCreditData);
            
            console.log("[Credits] Setting showOwnerSelector to true");
            setShowOwnerSelector(true);
            
            // After state updates
            console.log("[Credits] Current state:", { 
                showOwnerSelector, 
                pendingCredit,
                creditType,
                creditName 
            });
        } else {
            // For non-AUT credits, add directly
            addCreditDirectly();
        }
    };
    
    // Add a regular credit directly
    const addCreditDirectly = () => {
        const newCredit = {
            name: creditName,
            type: creditType,
            location: creditLocation
        };

        if (editing) {
            // If editing, replace the existing credit
            const updatedCredits = credits.map(credit => 
                (credit.name === creditName && credit.type === creditType) 
                    ? newCredit 
                    : credit
            );
            setCredits(updatedCredits);
        } else {
            // Add new credit
            setCredits([...credits, newCredit]);
        }
        
        resetCreditFields();
    };
    
    // Handle owner selection for AUT credits
    const handleOwnerSelected = (ownerId, ownerName) => {
        if (!pendingCredit) return;
        
        // Create credit with owner ID
        const newCredit = {
            name: ownerName, // Use the selected/confirmed name
            type: pendingCredit.type,
            location: pendingCredit.location,
            owner_id: ownerId // Include the owner ID for AUT credits
        };
        
        if (pendingCredit.editing) {
            // Replace existing credit
            const updatedCredits = credits.map(credit => 
                (credit.name === pendingCredit.name && credit.type === pendingCredit.type) 
                    ? newCredit 
                    : credit
            );
            setCredits(updatedCredits);
        } else {
            // Add new credit
            setCredits([...credits, newCredit]);
        }
        
        // Reset states
        setPendingCredit(null);
        setShowOwnerSelector(false);
        resetCreditFields();
    };
    
    // Cancel AUT credit selection
    const handleCancelOwnerSelection = () => {
        setPendingCredit(null);
        setShowOwnerSelector(false);
    };
    
    // Reset the credit form fields
    const resetCreditFields = () => {
        setCreditName('');
        setCreditType('');
        setCreditLocation(ALL); // Reset to 'All Countries'
        setEditing(false);
    };

    return (
        <Stack spacing={1}>
            <Box
                sx={{
                    mb: 1,
                    display: 'flex',
                    flexDirection: { xs: 'column', md: 'row' },
                    gap: 2
                }}>
                {/* Name Input */}
                <Box sx={{ flex: 1 }}>
                    <TextField
                        fullWidth
                        label="Name"
                        value={creditName}
                        onChange={(e) => setCreditName(e.target.value)}
                    />
                </Box>
                {/* Type Select */}
                <Box sx={{ flex: 1 }}>
                    <FormControl fullWidth>
                        <InputLabel id="type-label">Type</InputLabel>
                        <Select
                            labelId="type-label"
                            value={creditType}
                            onChange={(e) => setCreditType(e.target.value)}
                        >
                            <MenuItem value="AUT">Author or Right Holder</MenuItem>
                            <MenuItem value="LOC">Location</MenuItem>
                            <MenuItem value="OWN">Artwork Owner</MenuItem>
                            <MenuItem value="PHO">Photographer/Capturer</MenuItem>
                            <MenuItem value="REP">Representation Rights</MenuItem>
                        </Select>
                    </FormControl>
                    <FormControl fullWidth sx={{ mt: 2 }}>
                        <InputLabel id="location-label">Location</InputLabel>
                        <Select
                            labelId="location-label"
                            value={creditLocation}
                            onChange={(e) => setCreditLocation(e.target.value)}
                        >
                            {countries.length > 0 && countries.map((country) => (
                                <MenuItem key={country.value} value={country.value}>
                                    {country.label}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>
            </Box>
            {/* Add Button */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                    variant="outlined"
                    size="small"
                    onClick={handleAddOrUpdateCredit}
                    disabled={!creditName || !creditType}
                >
                    {editing ? t("Update Credit") : t("Add Credit")}
                </Button>
            </Box>
            {/* List of Credits */}
            {credits.length > 0 && (
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
                    {credits.map((credit, index) => (
                        <ListItem key={index}>
                            <Chip
                                label={`${credit.name} (${credit.type}) - ${credit.location}`}
                                onClick={handleCreditClick(credit)}
                                onDelete={handleCreditDelete(credit)}
                                size="small"
                            />
                        </ListItem>
                    ))}
                </Stack>
            )}
            {/* Copyright Owner Selector dialog for AUT credits */}
            {showOwnerSelector && pendingCredit && (
                <CopyrightOwnerSelector
                    authorName={pendingCredit.name}
                    onOwnerSelected={handleOwnerSelected}
                    onCancel={handleCancelOwnerSelection}
                />
            )}
        </Stack>
    );
};

export default Credits;