// Fixed CopyrightOwnerSelector.js without self-import

import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  Radio, 
  RadioGroup, 
  FormControl, 
  FormControlLabel, 
  Typography 
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { searchCopyrightOwner } from '../../api'; // Adjust the path as needed
import { getUserId } from '../../utils/Utils'; // Adjust the path as needed

/**
 * CopyrightOwnerSelector component that handles searching and selecting copyright owners.
 */
const CopyrightOwnerSelector = ({ 
  authorName, 
  onOwnerSelected, 
  onCancel,
  showErrorMessage = true 
}) => {
  const { t } = useTranslation();
  const sessionId = getUserId(); // Get the session ID directly
  
  const [loading, setLoading] = useState(false);
  const [owners, setOwners] = useState([]);
  const [searchError, setSearchError] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedId, setSelectedId] = useState("-1");

  // Search for owners when authorName changes
  useEffect(() => {
    // Skip the search if authorName is empty or undefined
    if (!authorName || authorName.trim() === '') {
      onOwnerSelected("-1", authorName || '');
      return;
    }
    
    const searchOwners = async () => {
      setLoading(true);
      setSearchError(null);
      
      try {
        console.log("[CopyrightOwnerSelector] Searching for author:", authorName);
        const ownersList = await searchCopyrightOwner(sessionId, authorName);
        console.log("[CopyrightOwnerSelector] Search results:", ownersList);
        setOwners(ownersList);
        
        // If we found owners, show the dialog
        if (ownersList.length > 0) {
          console.log("[CopyrightOwnerSelector] Showing dialog with owners");
          setSelectedId(ownersList[0].id); // Set first owner as default
          setShowDialog(true);
        } else {
          console.log("[CopyrightOwnerSelector] No owners found, treating as new author");
          // No owners found, treat as new author
          onOwnerSelected("-1", authorName);
        }
      } catch (error) {
        console.error("[CopyrightOwnerSelector] Error searching for copyright owners:", error);
        setSearchError(error.message || "Error searching for copyright owners");
        // Still allow using the current name as a new owner
        onOwnerSelected("-1", authorName);
      } finally {
        setLoading(false);
      }
    };
    
    // Debounce the search
    const timer = setTimeout(searchOwners, 500);
    return () => clearTimeout(timer);
  }, [authorName, onOwnerSelected, sessionId]);

  // Handle owner selection
  const handleConfirm = () => {
    if (selectedId === "-1") {
      // Create new owner
      console.log("[CopyrightOwnerSelector] Creating new owner:", authorName);
      onOwnerSelected("-1", authorName);
    } else {
      // Use existing owner
      const selectedOwner = owners.find(owner => owner.id === selectedId);
      if (selectedOwner) {
        console.log("[CopyrightOwnerSelector] Selected existing owner:", selectedOwner.displayName);
        onOwnerSelected(selectedOwner.id, selectedOwner.displayName);
      }
    }
    setShowDialog(false);
  };

  // Handle dialog close
  const handleCancel = () => {
    console.log("[CopyrightOwnerSelector] Dialog canceled");
    setShowDialog(false);
    onCancel();
  };

  // Only show the dialog if there are actually owners to select from and dialog should be shown
  if (!showDialog || owners.length === 0) {
    return null;
  }

  return (
    <>
      {showErrorMessage && searchError && (
        <Typography color="error" variant="caption">
          {searchError}
        </Typography>
      )}
      
      {/* Selection Dialog */}
      <Dialog open={showDialog} onClose={handleCancel} maxWidth="sm" fullWidth>
        <DialogTitle>{t("Did_you_mean")}</DialogTitle>
        <DialogContent>
          <FormControl component="fieldset" fullWidth>
            <RadioGroup 
              value={selectedId} 
              onChange={(e) => setSelectedId(e.target.value)}
            >
              {owners.map((owner) => (
                <FormControlLabel 
                  key={owner.id}
                  value={owner.id}
                  control={<Radio />}
                  label={owner.displayName}
                />
              ))}
              <FormControlLabel
                value="-1"
                control={<Radio />}
                label={`${t("Keep")} "${authorName}" (${t("Create_New")})`}
              />
            </RadioGroup>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancel}>{t("Cancel")}</Button>
          <Button 
            onClick={handleConfirm} 
            variant="contained" 
            color="primary"
          >
            {t("Confirm")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CopyrightOwnerSelector;