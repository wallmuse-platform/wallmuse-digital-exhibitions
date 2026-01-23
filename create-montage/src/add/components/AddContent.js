// AddContent.js

import React, { useRef, useState, useEffect } from 'react';
import {
  TextField, Divider, Typography, Box, Button, useMediaQuery, Grid,
  Accordion, AccordionSummary, AccordionDetails, styled, Dialog, DialogTitle,
  DialogContent, FormControl, RadioGroup, FormControlLabel, Radio, DialogActions,
  LinearProgress 
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@mui/material/styles';
import { searchCopyrightOwner } from '../../api'
import { getUserId } from '../../utils/Utils';
import { useUserContext } from '../../context/UserContext';
import CopyrightOwnerSelector from './CopyrightOwnerSelector';
import { useCopyrightOwner } from './useCopyrightOwner';
import debounce from 'lodash/debounce';
import Descriptions from '../../components/details/Descriptions';
import Categories from '../../components/categories/Categories';
import KeywordInput from './KeywordInput';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import Rights from '../../components/details/Rights';
import { Literals } from '../../components/constants/Literals.js';
import Credits from './Credits.js';
import { useCountries } from '../../components/details/useCountries.js';
import CustomCheckbox from './CustomCheckbox';
import { convertDatationText, validateContentData, handleUpload } from './AddContentController.js';
import LoadingSpinner from './LoadingSpinner.js';
import { CustomSnackbar, CustomAlert } from '../../CustomComponents';
import { RequiredFieldIndicator } from './RequiredFieldIndicator';
import './AddContent.css';

// eslint-disable-next-line no-unused-vars
import ChunkedUpload from '../upload/ChunkedUpload';

export function AddContent({ selectedContent }) {

  const theme = useTheme();
  const { t } = useTranslation();
  const sessionId = getUserId();

  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [loading, setLoading] = useState(false);
  const { isPremium } = useUserContext(); // Get isPremium from context (set in App.js)

  const [contentId, setContentId] = useState(''); // Track if we're editing an existing content

  const [triggerRender, setTriggerRender] = useState(false);

  // 1.1. Title and Author useRef
  const titleRef = useRef('');
  const [titleValue, setTitleValue] = useState('');

  const artworkAuthorRef = useRef('');
  const [author, setAuthor] = useState('');

  const languageRef = useRef('');

  const [potentialCopyrightOwners, setPotentialCopyrightOwners] = useState([]);
  // const authorFieldFocused = useRef(false); //prevents unwanted nearby author popup

  const [localDialogVisible, setLocalDialogVisible] = useState(false);

  const {
    selectedOwnerId,
    setSelectedOwnerId,
    authorName,
    potentialOwners,
    showOwnerSelector,
    setShowOwnerSelector,
    handleOwnerSelected,
    searchOwner,
    resetOwner
  } = useCopyrightOwner((newValue) => {
    console.log("[AddContent] Callback: showOwnerSelector changed to:", newValue);
    setLocalDialogVisible(newValue);
  });

  useEffect(() => {
    console.log("[AddContent] Component mounted");
    return () => console.log("[AddContent] Component unmounted");
  }, []);

  // Add a useEffect to monitor changes to selectedOwnerId for debugging
  // useEffect(() => {
  //   console.log("[AddContent] selectedOwnerId changed:", selectedOwnerId);
  // }, [selectedOwnerId]);

  // useEffect(() => {
  //   console.log("[AddContent] showOwnerSelector changed:", showOwnerSelector);
  // }, [showOwnerSelector]);

  // 1.2 Descriptions, separate states + useRef for handling 
  const [descriptions, setDescriptions] = useState([]);
  const [currentDescription, setCurrentDescription] = useState('');
  const [currentDescriptionLang, setCurrentDescriptionLang] = useState('');
  const [currentDescriptionName, setCurrentDescriptionName] = useState('');

  const datationTextRef = useRef('');
  const [datationTextValue, setDatationTextValue] = useState('');

  const datationHiddenRef = useRef(false);
  const [datationHiddenValue, setDatationHiddenValue] = useState('');
  const datationKindRef = useRef(false);
  const [datationKindValue, setDatationKindValue] = useState('');

  // 2. Classification 
  const categoriesRef = useRef([]);
  const [categories, setCategories] = useState([]);  // Manage the UI updates
  const keywordsRef = useRef([]); // Using useRef to store keywords
  const [keywordsValue, setKeywordsValue] = useState('');

  // 3. Media
  const [hdPath, setHdPath] = useState('');
  const [sdPath, setSdPath] = useState('');
  const [thumbnailPath, setThumbnailPath] = useState('');
  const [selectedFiles, setSelectedFiles] = useState({
    hdFile: null,        // HD file
    sdFile: null,        // SD file
    thumbnailFile: null  // Thumbnail file
  });
  const mediaRef = useRef({
    hdPath: '',
    sdPath: '',
    thumbnailPath: ''
  });
  const [isAccordionExpanded, setIsAccordionExpanded] = useState(false);

  // 4. Rights
  const [rights, setRights] = useState([]);
  const [currentRight, setCurrentRight] = useState('-11'); // Default to "No access"
  const [currentRightCountry, setCurrentRightCountry] = useState(Literals.ALL);

  // 5. Credits
  const countries = useCountries();

  const [credits, setCredits] = useState([]);
  const [creditName, setCreditName] = useState('');
  const [creditType, setCreditType] = useState('');
  const [creditLocation, setCreditLocation] = useState("ALL");  // Default to "ALL"

  // C. Checks
  const [titleValid, setTitleValid] = useState(true);
  const [authorValid, setAuthorValid] = useState(true);
  const [datationValid, setDatationtValid] = useState(true);
  const [categoriesValid, setCategoriesValid] = useState(true);
  const [hdMediaValid, setHdMediaValid] = useState(true);
  const [copyrightValid, setCopyrightValid] = useState(true);

  // S. Saving
  const contentDataRef = useRef({
    title: '',
    artworkAuthor: '',
    datationText: '',
    datationStart: '',
    datationEnd: '',
    datationHidden: false,
    datationKind: false,
    categories: [],
    keywords: [], // array to hold keywords
    language: '',
    streaming: true,
    splittable: true,
    croppable: true,
    deconstructable: true,
    media: {
      hdPath: '',
      sdPath: '',
      thumbnailPath: '',
    },
  });

  // Errors and messages saving
  const [addError, setAddError] = useState(false);
  const [addSuccess, setAddSuccess] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [validationErrorMessage, setValidationErrorMessage] = useState("");
  const [apiErrorMessage, setApiErrorMessage] = useState("");
  const [apiError, setApiError] = useState(false);

  // Replace your existing asyncFeedbackReceivedMsg with this function:
  const asyncFeedbackReceivedMsg = () => {
    // Upload progress messages take priority
    if (uploadProgress) {
      return uploadProgress.message;
    }

    // Existing error/success messages
    if (addError && validationErrorMessage) return validationErrorMessage;
    else if (apiError && apiErrorMessage) return apiErrorMessage;
    else if (addError) return t("error.content.validation");
    else if (apiError) return t("error.content.save");
    else if (addSuccess) return t("success.content.saved");
    return "";
  };

  // Add this function to handle closing the feedback:
  const handleCloseAsyncOpFeedback = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }

    // Don't allow closing during upload
    if (uploadProgress && uploadProgress.phase !== 'completed' && uploadProgress.phase !== 'error') {
      return;
    }

    // Reset all feedback states
    setAddError(false);
    setAddSuccess(false);
    setApiError(false);
    setUploadProgress(null);

    // Also reset the error messages
    setValidationErrorMessage("");
    setApiErrorMessage("");
  };

  useEffect(() => {
    if (selectedContent) {
      console.log("[AddContent] Full selectedContent object:", selectedContent);

      setContentId(selectedContent.id);

      // Set title
      titleRef.current = selectedContent.title || '';
      setTitleValue(titleRef.current); // This state updates the form field display
      console.log("[AddContent] Title set to:", titleRef.current);

      // IMPROVED: Better author detection and handling
      let authorName = '';
      let authorId = null;

      // Method 1: Check if author object exists (most reliable)
      if (selectedContent.author && (selectedContent.author.name || selectedContent.author.display_name)) {
        authorName = selectedContent.author.display_name || selectedContent.author.name || '';
        authorId = selectedContent.author.id;
        console.log("[AddContent] MODIFICATION - Found author object:", {
          name: authorName,
          id: authorId,
          fullObject: selectedContent.author
        });
      }
      // Method 2: Check if authors array exists (backup)
      else if (selectedContent.authors && Array.isArray(selectedContent.authors) && selectedContent.authors.length > 0) {
        const firstAuthor = selectedContent.authors[0];
        authorName = firstAuthor.display_name || firstAuthor.name || '';
        authorId = firstAuthor.id;
        console.log("[AddContent] MODIFICATION - Found in authors array:", {
          name: authorName,
          id: authorId,
          fullArray: selectedContent.authors
        });
      }
      // Method 3: Fallback to artworkAuthor string (least reliable)
      else if (selectedContent.artworkAuthor) {
        authorName = selectedContent.artworkAuthor;
        // CRITICAL: Don't set authorId to "-1" for modifications!
        // Try to extract ID from other fields or leave it undefined
        authorId = selectedContent.author_id || null;
        console.log("[AddContent] MODIFICATION - Using artworkAuthor fallback:", {
          name: authorName,
          id: authorId,
          warning: "No author object found - might be parsing issue"
        });
      }

      // Set the author name
      artworkAuthorRef.current = authorName;
      setAuthor(authorName);
      setSelectedOwnerId(authorId.toString());

      console.log("[AddContent] FINAL author state:", {
        ref: artworkAuthorRef.current,
        state: authorName,
        selectedOwnerId: authorId,
        isModification: !!contentId
      });

      // Set language
      languageRef.current = selectedContent.language || '';
      console.log("[AddContent] Language set:", languageRef.current);

      // For descriptions, add more detailed logging
      let initialDescriptions = [];

      if (Array.isArray(selectedContent.descriptions) && selectedContent.descriptions.length > 0) {
        // Check if descriptions actually have content
        const validDescriptions = selectedContent.descriptions.filter(desc => desc.description && desc.description.trim() !== '');
        
        if (validDescriptions.length > 0) {
          initialDescriptions = validDescriptions;  // Correct - only descriptions with content
          console.log("[AddContent] Using API descriptions:", initialDescriptions);
        } else {
          console.log("[AddContent] API descriptions exist but are empty, checking for fallback");
          // Fall back to single description if descriptions array is empty
          if (selectedContent.description) {
            initialDescriptions = [{
              language: selectedContent.language || 'eng',
              description: selectedContent.description,
              name: 'Default'
            }];
            console.log("[AddContent] Using fallback description:", initialDescriptions);
          }
        }
      } else if (selectedContent.description) {
        initialDescriptions = [{
          language: selectedContent.language || 'eng',
          description: selectedContent.description,
          name: 'Default'
        }];
        console.log("[AddContent] Using single description:", initialDescriptions);
      }

      setDescriptions(initialDescriptions);

      // Set up the current description editing fields
      if (initialDescriptions.length > 0) {
        const firstDesc = initialDescriptions[0];
        // Convert <br> tags to newlines for editing
        const normalizedDescription = firstDesc.description
          ? firstDesc.description.replace(/<br\s*\/?>/gi, '\n')
          : '';

        setCurrentDescription(normalizedDescription);
        setCurrentDescriptionLang(firstDesc.language);
        setCurrentDescriptionName(firstDesc.name || 'Default');
      }

      // Set datation fields
      datationTextRef.current = selectedContent.datation || selectedContent.datationText || '';
      setDatationTextValue(datationTextRef.current);

      // Handle datation flags
      datationHiddenRef.current = selectedContent.datation_hidden === 'Y' || selectedContent.datationHidden === true;
      datationKindRef.current = selectedContent.datation_kind === 'Y' || selectedContent.datationKind === true;

      // If using state for checkboxes:
      setDatationHiddenValue(datationHiddenRef.current);
      setDatationKindValue(datationKindRef.current);

      console.log("[AddContent] Datation set:", {
        text: datationTextRef.current,
        hidden: datationHiddenRef.current,
        kind: datationKindRef.current
      });

      // Set categories
      if (Array.isArray(selectedContent.categories)) {
        categoriesRef.current = selectedContent.categories;
      } else {
        categoriesRef.current = [];
      }
      contentDataRef.current.categories = categoriesRef.current;
      console.log("[AddContent] Categories set:", categoriesRef.current);

      // Set keywords
      if (Array.isArray(selectedContent.keywords)) {
        keywordsRef.current = selectedContent.keywords;
      } else if (selectedContent.keywords) {
        keywordsRef.current = selectedContent.keywords.split(',');
      } else {
        keywordsRef.current = [];
      }
      console.log("[AddContent] Keywords set:", keywordsRef.current);

      // Set media paths
      let hd = '';
      let sd = '';
      let thumbnail = '';

      // REMOVE the if (Array.isArray...) check entirely since we're using direct properties
      // Just use the direct properties from your API:
      hd = selectedContent.hdPath || '';
      sd = selectedContent.sdPath || '';
      thumbnail = selectedContent.thumbPath || '';

      console.log("[AddContent] Direct paths from API:", { hd, sd, thumbnail });

      setHdPath(hd);
      setSdPath(sd);
      setThumbnailPath(thumbnail);

      // Also update the mediaRef directly
      mediaRef.current = {
        hdPath: hd,
        sdPath: sd,
        thumbnailPath: thumbnail
      };

      console.log("[AddContent] Updated mediaRef:", mediaRef.current);

      // Set rights
      if (Array.isArray(selectedContent.rights)) {
        setRights(selectedContent.rights);
      } else {
        setRights([]);
      }

      // Set credits - map database format to form format
      if (Array.isArray(selectedContent.credits)) {
        const mappedCredits = selectedContent.credits.map(credit => ({
          name: credit.name,
          type: credit.kind,        // Map 'kind' to 'type'
          owner_id: credit.id,      // Map 'id' to 'owner_id'
          seq: credit.seq           // Preserve existing sequence
        }));
        setCredits(mappedCredits);
      } else {
        setCredits([]);
      }

      // Initialize checkbox values
      contentDataRef.current.streaming = selectedContent.streaming === 'Y' || selectedContent.streaming === true;
      contentDataRef.current.splittable = selectedContent.splittable === 'Y' || selectedContent.splittable === true;
      contentDataRef.current.croppable = selectedContent.croppable === 'Y' || selectedContent.croppable === true;
      contentDataRef.current.deconstructable = selectedContent.deconstructable === 'Y' || selectedContent.deconstructable === true;

      console.log("[AddContent] Checkbox values set:", contentDataRef.current);
      console.log("[AddContent] Setup complete!");

      // Force a re-render at the end
      setTriggerRender(prev => !prev);
    } else {
      console.log("[AddContent] No selectedContent, resetting form.");

      // Reset refs to default values
      setContentId('');
      titleRef.current = '';
      artworkAuthorRef.current = '';
      setDescriptions([]);
      datationTextRef.current = '';
      datationHiddenRef.current = false;
      datationKindRef.current = false;
      categoriesRef.current = [];
      keywordsRef.current = [];
      languageRef.current = '';
      setHdPath('');
      setSdPath('');
      setThumbnailPath('');
      contentDataRef.current.streaming = true;
      contentDataRef.current.splittable = true;
      contentDataRef.current.croppable = true;
      contentDataRef.current.deconstructable = true;
    }
  }, [selectedContent]);  // The useEffect depends on selectedContent

  // 1.2 Descriptions and Datation
  // When descriptions are updated
  const handleDescriptionChange = (newDescriptions) => {
    // Make sure we're not losing the <br> tags that were added
    console.log("[AddContent] Original newDescriptions:", newDescriptions);
    setDescriptions(newDescriptions);  // Update the state for Descriptions component
  };

  // 3. Media
  // Function to handle file selection and update state
  const handleFileSelect = (event, versionType) => {
    const file = event.target.files[0];

    if (file) {
      console.log("[AddContent] File selected:", file, "for type:", versionType);

      // Update the selectedFiles state with the file object and name
      setSelectedFiles((prevState) => ({
        ...prevState,
        [`${versionType}FileName`]: file.name,  // Store the file name for display
        [`${versionType}File`]: file,  // Store the actual file object for upload
      }));

      // Dynamically update mediaRef for the correct version type
      mediaRef.current[`${versionType}Path`] = URL.createObjectURL(file);

      // If this is an HD file and we've already attempted to submit, revalidate
      if (versionType === 'hd' && submitAttempted) {
        setHdMediaValid(true);
      }
    }
  };

  const handleCheckboxChange = (name, value) => {
    contentDataRef.current[name] = value;  // Update the correct field in the ref
    setTriggerRender(prev => !prev);  // Force a re-render to reflect changes in the UI
  };

  useEffect(() => {
    console.log("[AddContent] Current selected files:", selectedFiles);
  }, [selectedFiles]);

  const CustomAccordionSummary = styled(AccordionSummary)(({ theme }) => ({
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    padding: '4px 12px', // Adjust padding to control height
    backgroundColor: theme.palette.background.paper,
    marginLeft: 0,
    minHeight: 56, // Set the minimum height to 32px
    height: 56, // Ensure height is exactly 32px
    '&.Mui-expanded': {
      minHeight: 56, // Maintain height when expanded
    },
    '& .MuiAccordionSummary-content': {
      margin: 0,
      color: theme.palette.text.primary, // Use text.primary color for the text
      alignItems: 'center', // Ensure content aligns properly within the smaller height
    },
    '& .MuiAccordionSummary-expandIconWrapper': {
      color: theme.palette.text.primary, // Use text.primary color for the expand icon
    },
  }));

  const CustomAccordionDetails = styled(AccordionDetails)(({ theme }) => ({
    backgroundColor: theme.palette.background.paper, // Set background color
    paddingTop: theme.spacing(2), // Ensure padding is consistent
    marginLeft: 0, // Remove any unintended left margin
    marginRight: 0, // Remove any unintended right margin
  }));

  const CustomAccordion = styled(Accordion)({
    boxShadow: 'none',
    marginLeft: '0',
    border: 'none',
    backgroundColor: 'transparent', // Set the accordion background to transparent to let child elements handle the background
    width: '100%', // Ensure the accordion takes the full width
  });

  const handleAccordionChange = (panel) => (event, isExpanded) => {
    setIsAccordionExpanded(isExpanded ? panel : false);
  };

  // 4. Rights
  const handleAddRight = () => {
    if (currentRight) {
      // Ensure country is always at least 'ALL' if not specified
      const countryToUse = currentRightCountry || 'ALL';

      // Ensure owner name exists
      const ownerName = artworkAuthorRef.current || '';

      // Reset the currentRight and currentRightCountry to their default values
      setCurrentRight('No access');
      setCurrentRightCountry(Literals.ALL);
    }
  };

  // 5. Credits

  const handleAddCredit = () => {
    if (creditName && creditType) {
      setCredits([...credits, { name: creditName, type: creditType, location: creditLocation }]);
      setCreditName('');
      setCreditType('');
      setCreditLocation('ALL');
    }
  };

  // Checkboxes uses for datation and media 
  const toggleRender = () => {
    setTriggerRender(!triggerRender); // Forces re-render
  };

  // S. Save
  // TODO Rainy Day: Refactor later handleSubmitForm if larger or more complex. 
  // It can be beneficial to break it down into smaller, more focused functions.

  const handleSubmitForm = async () => {
    console.log('[AddContent] handleSubmitForm started');

    setSubmitAttempted(true);

    // If author doesn't have a specific ID, ensure it's set to -1 for new author
    if (!selectedOwnerId || selectedOwnerId === '') {
      console.log('[AddContent] No owner ID set, defaulting to -1 for new author');
      setSelectedOwnerId("-1");
    }

    // Validate fields before proceeding
    const isValid = validateFields();
    if (!isValid) {
      // Show error message
      setAddError(true);
      setValidationErrorMessage(t("complete.required.fields") || "Please complete all required fields");
      return;
    }
    setLoading(true);
    try {
      // Ensure all data is updated correctly
      handleAddRight();
      handleAddCredit();
      const datationKind = datationKindRef.current;
      const datationHidden = datationHiddenRef.current;

      const { datationStart, datationEnd } = convertDatationText(datationTextRef.current);
      const artworkCategories = categoriesRef.current.map(category => category.id);

      // Ensure descriptions are an array or use an empty array if undefined
      const validDescriptions = Array.isArray(descriptions) ? descriptions : [];

      // Create arrays for submission - this matches your legacy format
      const descriptionTexts = validDescriptions.map(desc => desc.description);
      const descriptionLangs = validDescriptions.map(desc => desc.language);

      // Prepare the contentData with descriptions, rights, and other fields
      const updatedContentData = {
        title: titleRef.current,
        artworkAuthor: artworkAuthorRef.current,
        artworkDescription: validDescriptions.length > 0 ? validDescriptions[0].description : '',
        amediadesc: descriptionTexts,
        alanguage: descriptionLangs,
        descriptions: validDescriptions,
        datationText: datationTextRef.current,
        datationStart,
        datationEnd,
        datationHidden,
        datationKind,
        categories: artworkCategories,
        keywords: keywordsRef.current,
        language: descriptions && descriptions.length > 0 ? descriptions[0].language : languageRef.current,
        // Preserve existing media paths - this is crucial!
        media: mediaRef.current,
        hdPath: hdPath || mediaRef.current.hdPath, // Use existing if no new path
        sdPath: sdPath || mediaRef.current.sdPath,
        thumbPath: thumbnailPath || mediaRef.current.thumbnailPath,
        rights: rights,
        credits: credits,
        streaming: contentDataRef.current.streaming,
        splittable: contentDataRef.current.splittable,
        croppable: contentDataRef.current.croppable,
        deconstructable: contentDataRef.current.deconstructable,
        // Add owner info from the copyright owner selection
        ownerInfo: {
          id: selectedOwnerId, // From the useCopyrightOwner hook
          name: artworkAuthorRef.current
        }
      };
      console.log("[handleSubmitForm] Final data being sent:", {
        contentId,
        updatedContentData,
        ownerInfo: updatedContentData.ownerInfo,
        rights: updatedContentData.rights,
        media: updatedContentData.media // Log media to verify
      });

      console.log("[handleSubmitForm] Owner info being sent:", {
        id: selectedOwnerId,
        ownerId: selectedOwnerId,
        name: artworkAuthorRef.current,
        ownerInfo: updatedContentData.ownerInfo
      });
      console.log("[AddContent] Final submission data:", {
        descriptionTexts,
        descriptionLangs,
        descriptions: validDescriptions
      });
      console.log("[AddContent] Credits being submitted:", credits);
      // Validate the data before sending
      const validation = validateContentData(updatedContentData);

      if (!validation.isValid) {
        const errorMessage = `Please complete all required fields: ${validation.errors.join(', ')}`;
        console.error("[AddContent] Validation failed:", errorMessage);
        setAddError(true);
        setValidationErrorMessage(errorMessage);
        setLoading(false);
        return;
      }

      // If there are warnings but no errors, show warning but continue
      if (validation.warnings.length > 0) {
        const warningMessage = `Warning: ${validation.warnings.join(', ')}`;
        console.warn("[AddContent] Validation warnings:", warningMessage);
      }

      // In handleSubmitForm, right before calling handleUpload:
      console.log("[AddContent] Final data being sent:", {
        contentId,
        updatedContentData,
        ownerInfo: updatedContentData.ownerInfo,
        rights: updatedContentData.rights
      });
      const uploadResult = await handleUpload(updatedContentData, contentId, selectedFiles, setUploadProgress, t);
      if (uploadResult) {
        // Refresh artwork list (for both new and modified artworks)
        if (window.refreshArtworksList) {
          setTimeout(() => {
            try {
              // For new content, switch to "Newest" sort so it appears at top
              if (!contentId && window.setSortingNewest) {
                window.setSortingNewest();
              }
              window.refreshArtworksList();
              console.log("[AddContent] Artwork list refreshed after save");
            } catch (error) {
              console.warn("[AddContent] Failed to refresh artwork list:", error);
            }
          }, 1000);
        }
        console.log("[AddContent] Upload successful, showing success message");
        setAddSuccess(true);
        setUploadProgress(null); // Clear progress
        setAddError(false);
        setApiError(false);
        setSubmitAttempted(false);
      } else {
        console.log("[AddContent] Upload returned false, showing error");
        setAddSuccess(false);
        setAddError(true);
        setValidationErrorMessage(t("error.upload.failed") || "Upload failed");
      }
    } catch (error) {
      console.error("[AddContent] handleSubmitForm - Error submitting the form:", error);
      setAddSuccess(false);
      setAddError(false);
      setApiError(true);
      setApiErrorMessage(`Error: ${error.message || "Unknown error occurred"}`);
    } finally {
      setLoading(false);
    }
  };

  const ClearForm = () => {
    // Clear state (for UI display)
    setTitleValue('');
    setAuthor('');
    setDatationTextValue('');
    
    // Clear refs (for form submission data)
    titleRef.current = '';
    artworkAuthorRef.current = '';
    datationTextRef.current = '';
    
    // Clear validation states
    setTitleValid(true);
    setAuthorValid(true);
    setDatationtValid(true);
    setSubmitAttempted(false);

    // ✅ Missing validations:
    setHdMediaValid(true);
    setCategoriesValid(true);
    setCopyrightValid(true);

    // Reset all form data to initial state
    contentDataRef.current = {
      title: '',
      displayTitle: '',
      type: '',
      publicSd: 'Y',
      duration: '',
      datationStart: '',
      datationEnd: '',
      datationKind: 'N',
      datationHidden: 'N',
      datation: '',
      description: '',
      hdPath: '',
      sdPath: '',
      thumbPath: '',
      splittable: true,
      croppable: true,
      deconstructable: true,
      streaming: true
    };

    // Clear selected files
    setSelectedFiles({
      hdFile: null,
      sdFile: null,
      thumbnailFile: null,
      sdFileName: '',
      thumbnailFileName: ''
      // Note: hdFile.name is accessed directly, no hdFileName state
    });

    // Clear categories, rights and credits
    setCategories([]);
    setRights([]); 
    setCredits([]);

  // Clear descriptions
    setDescriptions([]);

    // Clear any other state variables that control form fields
    // Add any other setState calls for form inputs you have

    // Clear file input values
    document.querySelectorAll('input[type="file"]').forEach(input => {
      input.value = '';
    });

    console.log("[ClearForm] Form cleared");
  };

  // Add this to your component to handle scrolling to the first error
  // TODO check
  useEffect(() => {
    console.log('[AddContent] useEffect handle scrolling to the first error');
    if (submitAttempted) {
      // Find the first invalid field and scroll to it
      const scrollToFirstError = () => {
        const errorFields = document.querySelectorAll('.Mui-error');
        if (errorFields.length > 0) {
          errorFields[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      };

      // Small delay to ensure DOM is updated
      setTimeout(scrollToFirstError, 100);
    }
  }, [submitAttempted]);

  //TODO as specify-artwork
  // Title check
  // Keywords check

  const validateFields = () => {
    console.log('[AddContent] entering validateFields');
    // Title validation
    const isTitleValid = titleRef.current && titleRef.current.trim() !== '';
    setTitleValid(isTitleValid);

    // Author validation
    const isAuthorValid = artworkAuthorRef.current && artworkAuthorRef.current.trim() !== '';
    setAuthorValid(isAuthorValid);

    // Datation validation
    const isDatationtValid = datationTextRef.current && datationTextRef.current.trim() !== '';
    setDatationtValid(isDatationtValid);

    // Categories validation
    const isCategoriesValid = Array.isArray(categoriesRef.current) && categoriesRef.current.length > 0;
    setCategoriesValid(isCategoriesValid);

    // HD Media validation - check if either a file is selected or a URL is provided
    const isHdMediaValid = selectedFiles.hdFile || hdPath.trim() !== '';
    setHdMediaValid(isHdMediaValid);

    // Copyright validation
    const isCopyrightValid = Array.isArray(rights) && rights.length > 0;
    setCopyrightValid(isCopyrightValid);

    // Log validation results for debugging
    console.log('[Add Content validateFields] Validation results:', {
      title: isTitleValid,
      author: isAuthorValid,
      datation: isDatationtValid,
      categories: isCategoriesValid,
      hdMedia: isHdMediaValid,
      copyright: isCopyrightValid
    });

    // Return overall validation result
    return isTitleValid && isAuthorValid && isDatationtValid && isCategoriesValid && isHdMediaValid && isCopyrightValid;
  };

  return (
    <Box sx={{ mx: 2, width: 'calc(100% - 32px)' }}>
      <LoadingSpinner loading={loading} />  {/* Add spinner */}
      <Typography variant="h5" component="h2" sx={{ mx: 'auto', mb: 2, color: 'primary.main', textAlign: 'center' }}>
        {contentId ? t("button.modify.content") : t("button.add.content")}
      </Typography>
      {/* 1. Main details */}
      <Typography variant="subtitle1" sx={{ mt: 4, mb: 2 }}>{t("_Main_")}</Typography>
      <Box component="form" sx={{ width: 'auto' }}>

        {/* 1.1. Title and Author */}
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, mb: 3, width: '95%' }}>

          {/* Title field */}
          <Box sx={{ flex: { md: 1 }, width: 'auto' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2" component="label" htmlFor="title-field" >
                {t("_Title_")}
                <RequiredFieldIndicator
                  isValid={titleValid || !submitAttempted}
                  message={t("title.required")}
                  t={t}
                />
              </Typography>
            </Box>
            <TextField
              id="title-field"
              value={titleValue}
              // defaultValue={titleRef.current}
              onChange={(e) => {
                titleRef.current = e.target.value;
                setTitleValue(e.target.value);
                if (submitAttempted) {
                  // Re-validate on change if we've already attempted to submit
                  setTitleValid(e.target.value.trim() !== '');
                }
              }}
              error={!titleValid && submitAttempted}
              helperText={(!titleValid && submitAttempted) ? t("title.required") : ""}
              fullWidth
            />
          </Box>
          {/* Author field */}
          <Box sx={{ flex: { md: 1 }, width: 'auto' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2" component="label" htmlFor="author-field">
                {t("ArtistName_")}
                <RequiredFieldIndicator
                  isValid={authorValid || !submitAttempted}
                  message={t("author.required")}
                  t={t}
                />
              </Typography>
            </Box>
            <TextField
              id="author-field"
              value={author}
              // defaultValue={artworkAuthorRef.current}
              onChange={(e) => {
                const newValue = e.target.value;
                artworkAuthorRef.current = newValue;
                setAuthor(newValue);

                // Don't immediately reset to -1, just mark it for reset if no match is found
                // Only when we confirm there's no match should we set to -1

                // Validate if needed
                if (submitAttempted) {
                  setAuthorValid(newValue.trim() !== '');
                }

                // Trigger the debounced search as you type
                if (newValue.trim() !== '') {
                  console.log("[AddContent] Triggering debounced search for:", newValue);
                  searchOwner(newValue);
                } else {
                  // Only if empty, reset the owner ID
                  resetOwner(); // Reset owner if field is empty
                }
              }}
              // onFocus={() => {
              //   authorFieldFocused.current = true;
              // }}
              onBlur={(e) => {
                // authorFieldFocused.current = false;
                const value = e.target.value.trim();
                if (value !== '') {
                  // Cancel any pending debounced searches
                  searchOwner(value);
                }
              }}
              error={!authorValid && submitAttempted}
              helperText={(!authorValid && submitAttempted) ? t("author.required") : ""}
              fullWidth
            />
          </Box>
        </Box>

        {/* 1.2. Descriptions and Datation */}
        <Box class="wmclass" component="form" sx={{ width: '95%' }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, mb: 3, width: '95%' }}>

            {/* 1.2.1. Descriptions */}
            <Box sx={{ flex: { md: 1 }, width: '95%' }}>
              <Descriptions
                descriptions={descriptions}
                setDescriptions={handleDescriptionChange}  // Update using setDescriptions
                currentDescription={currentDescription}
                setCurrentDescription={setCurrentDescription}
                currentDescriptionLang={currentDescriptionLang}
                setCurrentDescriptionLang={setCurrentDescriptionLang}
                currentDescriptionName={currentDescriptionName}
                setCurrentDescriptionName={setCurrentDescriptionName}
              />
            </Box>
            {/* 1.2.2. Datation */}
            <Box sx={{ flex: { md: 1 }, width: '95%', mt: { md: 6, xs: 0 }, }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="body2" component="label" htmlFor="datation-field">
                  {t("_Datation_")}
                  <RequiredFieldIndicator
                    isValid={datationValid || !submitAttempted}
                    message={t("datation.required")}
                    t={t}
                  />
                </Typography>
              </Box>
              <TextField
                id="datation-field"
                value={datationTextValue}
                onChange={(e) => {
                  datationTextRef.current = e.target.value;
                  setDatationTextValue(e.target.value);
                  if (submitAttempted) {
                    // Re-validate on change if we've already attempted to submit
                    setDatationtValid(e.target.value.trim() !== '');
                  }
                }}
                error={!datationValid && submitAttempted}
                helperText={(!datationValid && submitAttempted) ? t("datation.required") : ""}
                fullWidth
              />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <CustomCheckbox
                  checked={datationHiddenRef.current}
                  onChange={(name, checked) => {
                    datationHiddenRef.current = checked;
                    contentDataRef.current.datationHidden = checked;
                    handleCheckboxChange(name, checked);
                  }}
                  name="datationHidden"
                  label={t("DatationHidden_")}
                />
                <CustomCheckbox
                  checked={datationKindRef.current}
                  onChange={(name, checked) => {
                    datationKindRef.current = checked;
                    contentDataRef.current.datationKind = checked;
                    handleCheckboxChange(name, checked);
                  }}
                  name="datationKind"
                  label={t("Approximate_")}
                />
              </Box>
            </Box>
          </Box>
          {/* 2. Classification */}
          <Typography variant="subtitle1" sx={{ mt: 4, mb: 1 }}>{t("Classification_")}</Typography>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, mb: 3, width: '95%' }}>

            {/* 2.1. Categories Component */}
            <Box sx={{
              flex: { md: 1 },
              width: '95%',
              border: (!categoriesValid && submitAttempted) ? '1px solid' : '1px solid',
              borderColor: (!categoriesValid && submitAttempted) ? 'error.main' : 'rgba(128, 128, 128, 0.3)',  // Use a subtle gray when not error
              borderRadius: 1,
              padding: (!categoriesValid && submitAttempted) ? 1 : 0
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" component="label">
                  {t("Categories_")} {/* Changed to Categories_ to match your other i18n keys */}
                  <RequiredFieldIndicator
                    isValid={categoriesValid || !submitAttempted}
                    message={t("one.category.required")}
                    t={t}
                  />
                </Typography>
              </Box>
              {(!categoriesValid && submitAttempted) && (
                <Typography color="error" variant="caption" sx={{ display: 'block', mb: 1 }}>
                  {t("one.category.required")}
                </Typography>
              )}
              <Categories class="AddContent"
                variant="standard"
                setCategories={(newCategories) => {
                  setCategories(newCategories);
                  categoriesRef.current = newCategories;
                  if (submitAttempted) {
                    // Re-validate on change if we've already attempted to submit
                    setCategoriesValid(newCategories.length > 0);
                  }
                  console.log("[AddContent] Updated categories:", categoriesRef.current);
                }}
                checkedCategories={categoriesRef.current}
              />
            </Box>

            {/* 2.2. KeywordInput Component */}
            <Box sx={{ flex: { md: 1 }, width: '95%' }}>
              <Typography variant="body2" component="label" sx={{ display: 'block', mb: 1 }}>
                {t("Keywords_")} {/* Added label for consistency */}
              </Typography>
              <KeywordInput
                keywordsRef={keywordsRef}
                setKeywords={(newKeywords) => {
                  keywordsRef.current = newKeywords;
                  console.log("[AddContent] Updated keywords:", keywordsRef.current);
                }}
              />
            </Box>
          </Box>
        </Box>

        {/* 3. Media */}
        <Typography variant="subtitle1" sx={{ mt: 4, mb: 1 }}>{t("Media_")}</Typography>
        <Box>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, mb: 3, width: '95%' }}>

            {/* <Box
            sx={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: 2,
              alignItems: 'stretch', // Ensures items stretch to the same height
              flexWrap: 'wrap'
            }}
          > */}
            {/* Media Left part */}
            <Box
              sx={{
                flex: { md: 1 },
                width: '100%',
                border: (!hdMediaValid && submitAttempted) ? '1px solid' : '1px solid',
                borderColor: (!hdMediaValid && submitAttempted) ? 'error.main' : 'rgba(128, 128, 128, 0.3)',
                borderRadius: 1,
                padding: (!hdMediaValid && submitAttempted) ? 1 : 0,
              }}
            >
              <input
                accept="video/*, image/png, image/gif, image/jpeg, image/jpg, image/tiff"
                style={{ display: 'none' }}
                id="hd-upload"
                type="file"
                onChange={(e) => handleFileSelect(e, 'hd')}
              />
              <label htmlFor="hd-upload">
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    border: '1px solid',
                    borderColor: theme.palette.divider, // Use theme divider color for the border
                    borderRadius: '4px', // Slightly round the corners
                    backgroundColor: theme.palette.background.paper, // Set background color to match other contained elements
                    p: 2, // Add padding to make it look more contained
                  }}
                >
                  <Typography variant="body2">
                    {t("BROWSE_HD_4K_")}
                    <RequiredFieldIndicator
                      isValid={hdMediaValid || !submitAttempted}
                      message={t("HD.media.required")}
                      t={t}
                    />
                  </Typography>
                  <FileUploadIcon
                    sx={{
                      cursor: 'pointer',
                      color: theme.palette.primary.main, // Apply the theme color
                      '&:hover': {
                        color: theme.palette.primary.dark, // Darken color on hover
                      }
                    }}
                  />
                </Box>
              </label>
              {selectedFiles.hdFile && (
                <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                  {t("Selected_file_")} {selectedFiles.hdFile.name}
                </Typography>
              )}
            </Box>

            {/* Right part */}
            <Box sx={{ flex: { md: 1 }, width: '95%' }}>
              <Box sx={{ flex: 1, marginTop: 1, minWidth: isMobile ? '95%' : '300px' }}>
                <CustomAccordion expanded={isAccordionExpanded === 'panel1'} onChange={handleAccordionChange('panel1')}>
                  <CustomAccordionSummary expandIcon={<ExpandMoreIcon />} >
                    <Typography variant="body2">
                      {t("BROWSE_SD_TN_")}
                    </Typography>
                  </CustomAccordionSummary>
                  <CustomAccordionDetails>
                    <input
                      accept="video/*, image/png, image/gif, image/jpeg, image/jpg, image/tiff"
                      style={{ display: 'none' }}
                      id="sd-upload"
                      type="file"
                      onChange={(e) => handleFileSelect(e, 'sd')}
                    />
                    <label htmlFor="sd-upload">
                      <Button variant="outlined" component="span" fullWidth sx={{ mb: 2 }}>
                        {t("BROWSE_SD_")}
                      </Button>
                    </label>
                    {selectedFiles.sdFile && (
                      <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                        {t("Selected_file_")}{selectedFiles.sdFileName}
                      </Typography>
                    )}
                    <Divider sx={{ my: 2 }} />
                    {/* Thumbnail Upload */}
                    <input
                      accept="image/*"
                      style={{ display: 'none' }}
                      id="thumbnail-upload"
                      type="file"
                      onChange={(e) => handleFileSelect(e, 'thumbnail')}
                    />
                    <label htmlFor="thumbnail-upload">
                      <Button variant="outlined" component="span" fullWidth>
                        {t("BROWSE_TN_")}
                      </Button>
                    </label>
                    {selectedFiles.thumbnailFile && (
                      <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                        {t("Selected_file_")}{selectedFiles.thumbnailFileName}
                      </Typography>
                    )}
                  </CustomAccordionDetails>
                </CustomAccordion>
                {/* Accordion for URLs */}
                <CustomAccordion expanded={isAccordionExpanded === 'panel2'} onChange={handleAccordionChange('panel2')} sx={{ mt: 2 }}>
                  <CustomAccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>{t("URLs_")}</Typography>
                  </CustomAccordionSummary>
                  <AccordionDetails>
                    <TextField
                      fullWidth
                      label={t("HD_4K_Version_URL")}
                      value={hdPath}
                      onChange={(e) => {
                        setHdPath(e.target.value);
                        // Revalidate if needed
                        if (submitAttempted && e.target.value.trim() !== '') {
                          setHdMediaValid(true);
                        }
                      }}
                      error={!hdMediaValid && submitAttempted && !selectedFiles.hdFile}
                      helperText={(!hdMediaValid && submitAttempted && !selectedFiles.hdFile) ? t("HD.media.required") : ""}
                      sx={{ mb: 2 }}
                    />
                    <TextField
                      fullWidth
                      label={t("SD_Version_URL")}
                      value={sdPath}
                      onChange={(e) => setSdPath(e.target.value)}
                      sx={{ mb: 2 }}
                    />
                    <TextField
                      fullWidth
                      label={t("TN_Version_URL")}
                      value={thumbnailPath}
                      onChange={(e) => setThumbnailPath(e.target.value)}
                    />
                  </AccordionDetails>
                </CustomAccordion>
              </Box>
            </Box>
          </Box>
        </Box>

        <Box
          sx={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row', // Switches between row and column based on screen width
            gap: 2,
            alignItems: 'flex-start', // Align to the top
            flexWrap: 'wrap'
          }}
        >

          {/* Left Column for HD/4K Upload */}

          <Box sx={{ flex: 1, minWidth: isMobile ? '95%' : '300px' }}>

          </Box>

          {/* Right Column with Accordion for SD and Thumbnail Uploads */}

        </Box>

        {/* Thumbnail Colors Section */}
        {/* <Box>
          <Box sx={{ mt: 4 }}>
            <Typography variant="subtitle2">Thumbnail Colors</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'row', gap: 2, flexWrap: 'wrap' }}>
              <FormControlLabel control={<Checkbox />} label="Color1" />
              <FormControlLabel control={<Checkbox />} label="Color2" />
              <FormControlLabel control={<Checkbox />} label="Color3" />
              <Button variant="outlined">Use a color picker</Button>
            </Box>
          </Box>
        </Box> */}


        <Box>
          <Box
            sx={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: 2,
              alignItems: 'stretch', // Ensures items stretch to the same height
              flexWrap: 'wrap', // Allows items to wrap if necessary
            }}
          >
            {/*  Left part  */}
            <Box
              sx={{
                flex: 1,
                minWidth: isMobile ? '95%' : '300px', // Full width on mobile, minWidth on larger screens
                mb: isMobile ? 2 : 0, // Adds margin on bottom when in column mode
              }}
            >
            </Box>
            {/* Right part */}
            <Box
              sx={{
                flex: 1,
                minWidth: isMobile ? '95%' : '300px', // Full width on mobile, minWidth on larger screens
              }}
            >
            </Box>
          </Box>
        </Box>
        {/* 4. Rights */}
        <Typography variant="subtitle1" sx={{ mt: 4, mb: 1 }}>*{t("rights")}</Typography>
        <Box
          sx={{
            flex: { md: 1 },
            width: '95%',//check
            border: (!copyrightValid && submitAttempted) ? '1px solid' : 'none',
            borderColor: 'error.main',
            borderRadius: 1,
            padding: (!copyrightValid && submitAttempted) ? 1 : 0,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, mb: 1 }}>
            <Typography variant="body2">
              <RequiredFieldIndicator
                isValid={copyrightValid || !submitAttempted}
                message={t("copyright.required")}
                t={t}
              />
            </Typography>
          </Box>
          {(!copyrightValid && submitAttempted) && (
            <Typography color="error" variant="caption" sx={{ display: 'block', mb: 1 }}>
              {t("copyright.required")}
            </Typography>
          )}
          <Rights
            rights={rights}
            setRights={(newRights) => {
              console.log("[Add Contents] Rights updated:", {
                oldRights: rights,
                newRights: newRights
              });
              setRights(newRights);
              if (submitAttempted) {
                // Re-validate on change if we've already attempted to submit
                setCopyrightValid(newRights.length > 0);
              }
            }}
            currentRight={currentRight}
            setCurrentRight={setCurrentRight}
            currentRightCountry={currentRightCountry}
            setCurrentRightCountry={setCurrentRightCountry}
            rightsLabel={t("rights")}
            countryLabel={t("countries")}
            selectVariant={'outlined'}
            rightsDirection={'row'}
            formControlHeight={'54px'}
            rightsLabelAsTitle={false}
            isPremium={isPremium}
          />
        </Box>
        <Grid container spacing={2}>
          {/* First checkbox */}
          <Grid item xs={6} sm={6} md={3} display="flex" alignItems="center">
            <CustomCheckbox
              checked={contentDataRef.current.streaming}
              onChange={(name, checked) => handleCheckboxChange(name, checked)}
              name="streaming"
              label={t("Streaming_")}
            />
          </Grid>

          {/* Second checkbox */}
          <Grid item xs={6} sm={6} md={3} display="flex" alignItems="center">
            <CustomCheckbox
              checked={contentDataRef.current.splittable}
              onChange={(name, checked) => handleCheckboxChange(name, checked)}
              name="splittable"
              label={t("Splittable_")}
            />
          </Grid>

          {/* Third checkbox */}
          <Grid item xs={6} sm={6} md={3} display="flex" alignItems="center">
            <CustomCheckbox
              checked={contentDataRef.current.croppable}
              onChange={(name, checked) => handleCheckboxChange(name, checked)}
              name="croppable"
              label={t("Croppable_")}
            />
          </Grid>

          {/* Fourth checkbox */}
          <Grid item xs={6} sm={6} md={3} display="flex" alignItems="center">
            <CustomCheckbox
              checked={contentDataRef.current.deconstructable}
              onChange={(name, checked) => handleCheckboxChange(name, checked)}
              name="deconstructable"
              label={t("Deconstructable_")}
            />
          </Grid>
        </Grid>
        {/* 5. Credits */}
        <Typography variant="subtitle1" sx={{ mt: 4, mb: 1 }}>{t("Credits_")}</Typography>
        <Credits
          credits={credits}
          setCredits={setCredits}
          creditName={creditName}
          setCreditName={setCreditName}
          creditType={creditType}
          setCreditType={setCreditType}
          creditLocation={creditLocation}
          setCreditLocation={setCreditLocation}
          handleAddCredit={handleAddCredit}
        />
        {/* Action Buttons */}
        <Box sx={{ mt: 4, mb: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button
            variant="outlined"
            color="primary"
            onClick={ClearForm}
            disabled={loading}
            sx={{ mr: 2 }}
          >
            {t("action.clear")}
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSubmitForm}
            disabled={loading}
          >
            {contentId ? t("Save_Changes_") : t("Add_Content_")}
          </Button>
        </Box>
      </Box>
      {/* custom dialog author/copyrightowner */}
      <Dialog
        open={showOwnerSelector}
        onClose={() => {

          setShowOwnerSelector(false);
        }}
        maxWidth="sm"
        fullWidth
      >
        {console.log("[AddContent] Dialog rendering with open =", showOwnerSelector)}

        <DialogTitle>{t("did.you.mean")}</DialogTitle>
        <DialogContent>
          <FormControl component="fieldset" fullWidth>
            <RadioGroup
              value={selectedOwnerId}
              onChange={(e) => setSelectedOwnerId(e.target.value)}
            >
              {potentialCopyrightOwners.map((owner) => (
                <FormControlLabel
                  key={owner.id}
                  value={owner.id}
                  control={<Radio />}
                  label={owner.displayName || owner.name}
                />
              ))}
              <FormControlLabel
                value="-1"
                control={<Radio />}
                label={`${t("keep")} "${artworkAuthorRef.current}" (${t("create.new")})`}
              />
            </RadioGroup>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowOwnerSelector(false)}>{t("Cancel")}</Button>
          <Button
            onClick={() => {
              console.log("[Add Contents Dialog] Confirm button clicked with selectedOwnerId:", selectedOwnerId);

              if (selectedOwnerId !== "-1") {
                // Find the selected owner
                const selectedOwner = potentialOwners.find(owner => owner.id === selectedOwnerId);

                if (selectedOwner) {
                  console.log("[Add Contents Dialog] Selected existing author:", selectedOwner);

                  const authorName = selectedOwner.displayName || selectedOwner.name;

                  // Update artworkAuthorRef and UI state
                  artworkAuthorRef.current = authorName;
                  setAuthor(authorName);

                  // No need to manually call setSelectedOwnerId - it's already set via the RadioGroup
                  console.log("[Add Contents Dialog] Updated author:", {
                    ref: artworkAuthorRef.current,
                    state: authorName,
                    id: selectedOwnerId
                  });
                }
              }
              // Close the dialog
              setShowOwnerSelector(false);
            }}
            variant="contained"
            color="primary"
          >
            {t("confirm")}
          </Button>
        </DialogActions>
      </Dialog>
      {/* Feedback snackbar */}
      <CustomSnackbar
        open={addError || addSuccess || apiError || uploadProgress}
        autoHideDuration={uploadProgress ? null : 6000} // Don't auto-hide during upload
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        onClose={handleCloseAsyncOpFeedback}
      >
        <CustomAlert
          severity={addError || apiError ? "error" : "success"}
          onClose={uploadProgress ? null : handleCloseAsyncOpFeedback} // Don't allow close during upload
        >
          {asyncFeedbackReceivedMsg()}

          {/* Add progress bar inside your existing alert */}
          {uploadProgress && (
            <Box sx={{ mt: 1 }}>
              {uploadProgress.phase === 'uploading' ? (
                <LinearProgress variant="determinate" value={uploadProgress.progress} />
              ) : uploadProgress.phase === 'processing' ? (
                <LinearProgress />
              ) : null}
            </Box>
          )}
        </CustomAlert>
      </CustomSnackbar>
    </Box>
  );
}
export default AddContent;