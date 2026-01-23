// Contents.js

import React, { useEffect, useState, useContext } from 'react';
import { Tooltip, CircularProgress, Box } from "@mui/material";
import useMediaQuery from '@mui/material/useMediaQuery';

// Utilities
import { searchArtworks, countArtworks, deleteArtwork, getArtworkById } from '../../api'; // Update the path according to your structure
import { BaseThumbnailContext } from '../../context/ArtworksContext.js';
import ContentsSearchArea from '../searcharea/ContentsSearchArea.js';
import { useTranslation } from "react-i18next";
import { getUserId, isDemoAccount } from '../../utils/Utils';
import { useUserContext } from '../../context/UserContext';  // Import the custom hook
import AuthorCheck from './AuthorCheck.js';
import useGuestActionPopup from '../../accounts/useGuestActionPopup'; // Import the guest action hook

// Material UI components
import Card from '@mui/material/Card';
import CardMedia from '@mui/material/CardMedia';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import Edit from '@mui/icons-material/Edit';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';

// Theme
import { selectTheme, currentTheme } from "../../theme/ThemeUtils.js";

export function Contents({ setSelectedContent, setView }) {
  const sessionId = getUserId();
  const { t } = useTranslation();
  const theme = selectTheme();
  const themeName = currentTheme();
  const baseThumbnailURL = useContext(BaseThumbnailContext);
  const { handleAction, popup } = useGuestActionPopup(); // Use the guest action hook
  const [artworks, setArtworks] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchCategories, setSearchCategories] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [loading, setLoading] = useState(true);
  const [isHovered, setIsHovered] = useState({});
  const [selectedChip, setSelectedChip] = useState("1"); // Default to "1" (Title)
  const [elementsCount, setCountElement] = useState(0);  // Add this state to track the count of elements
  const [sortingOption, setSortingOption] = useState("alphabetical"); // Add state for sorting option

  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [selectedAuthor, setSelectedAuthor] = useState(null);
  const handleAuthorSelected = (author) => {
    setSelectedAuthor(author);
  };


  useEffect(() => {
    const fetchArtworks = async () => {
      setLoading(true);

      let desc = selectedChip === "1" ? searchTerm : null;
      let keywords = selectedChip === "2" ? searchTerm : null;
      let author = selectedChip === "3" ? searchTerm : null;
      const cats = searchCategories.map(c => c.id).join(',');

      // Set the sort parameter based on the sorting option
      let sort = sortingOption === "alphabetical" ? "name" : "cdate";

      // Fetch the count of artworks
      const count = await countArtworks(desc, keywords, author, cats);
      setCountElement(count);

      // Fetch the artworks
      const result = await searchArtworks(desc, keywords, author, cats, page, rowsPerPage, sort);


      setArtworks(result);
      setLoading(false);
    };

    fetchArtworks();
  }, [searchTerm, page, rowsPerPage, searchCategories, selectedChip, sortingOption]);

  const handleDeleteArtwork = async (artworkId) => {
    // Wrap the delete action with guest handling
    handleAction(
      async () => {
        try {
          const response = await deleteArtwork(artworkId);

          if (response?.error) {
            alert(response.error.message);
          } else {
            // Remove the deleted artwork from the state without reloading
            setArtworks((prevArtworks) => prevArtworks.filter(artwork => artwork.id !== artworkId));
            alert(t('Artwork deleted successfully.'));
          }
        } catch (error) {
          alert(t('An error occurred while deleting the artwork.'));
          console.error(error);
        }
      },
      false // isPremiumContent = false for now
    );
  };
    
  const handleModifyContent = async (artworkId) => {
    try {
      const selectedArtwork = await getArtworkById(artworkId);  // Fetch artwork from API by ID
      
      if (selectedArtwork) {
        setSelectedContent(selectedArtwork);  // Set the selected content for AddContent
        setView('addContent');  // Switch to the AddContent section
      } else {
        alert('Artwork not found.');
      }
    } catch (error) {
      console.error('Error fetching artwork:', error);
      alert('Error fetching artwork.');
    }
  };

  useEffect(() => {
    window.refreshArtworksList = refreshArtworksList;
    window.setSortingNewest = () => {
      setSortingOption("newest");
    };
  }, [searchTerm, page, rowsPerPage, searchCategories, selectedChip, sortingOption]);

  // Add this function to Contents.js to refresh the list
  const refreshArtworksList = async () => {
    setLoading(true);
    
    let desc = selectedChip === "1" ? searchTerm : null;
    let keywords = selectedChip === "2" ? searchTerm : null;
    let author = selectedChip === "3" ? searchTerm : null;
    const cats = searchCategories.map(c => c.id).join(',');
    let sort = sortingOption === "alphabetical" ? "name" : "cdate";

    const count = await countArtworks(desc, keywords, author, cats);
    setCountElement(count);

    const result = await searchArtworks(desc, keywords, author, cats, page, rowsPerPage, sort);
    setArtworks(result);
    setLoading(false);
  };

  const calculateAspectRatio = (artwork) => {
    let ratio;

    if (artwork.sd_width && artwork.sd_height) {
      ratio = parseInt(artwork.sd_width, 10) / parseInt(artwork.sd_height, 10);
    } else if (artwork.orientation === 'L') { // Landscape
      ratio = 16 / 9;
    } else if (artwork.orientation === 'P') { // Portrait
      ratio = 9 / 16;
    } else { // Default
      ratio = 16 / 9;
    }

    return ratio;
  };

  const paneStyle = {
    // height removed - causes layout issues with flex parent
    overflow: 'auto',
    display: 'flex',
    flexWrap: 'wrap',
    gap: isMobile ? '0' : '20px', // No gap when mobile
    justifyContent: 'center',
    // alignItems: 'center',
    margin: isMobile ? '0' : '0 auto', // No margin when mobile
    padding: isMobile ? '0' : '10px', // No padding when mobile
    maxWidth: '100%',
  };

  const searchAreaStyle = {
    marginBottom: '20px',
    minWidth: '300px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '10px 20px',
    boxSizing: 'border-box',
    width: '100%', // Take full width of parent
  };

  const cardsContainerStyle = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: isMobile ? '0' : '20px',
    justifyContent: 'center',
    flex: 1, // Take remaining space
  };

  const cardStyle = {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    border: `1px solid ${theme.palette.primary.main}`,
    borderRadius: '10px',
    padding: '10px',
    transition: 'transform 0.3s ease-in-out',
    transformOrigin: 'center',
    width: '280px', // This ensures the card takes up the full width available
    flex: '1 1 100%', // Make the cards flexible
    margin: '0 auto', // Center the card itself
  };



  return (
    <>
      {popup}  {/* Render the guest action popup */}
      <Typography variant="h5" component="h2" sx={{ mx: 'auto', mb: 2, color: 'primary.main', textAlign: 'center' }}>
        {t("button.list.contents")}
      </Typography>
      <div style={paneStyle}>
        {/* Add the search area component at the top */}
        <Box sx={searchAreaStyle}>
          <ContentsSearchArea
            elementsCount={elementsCount}
            page={page}
            setPage={setPage}
            rowsPerPage={rowsPerPage}
            setRowsPerPage={setRowsPerPage}
            term={searchTerm}
            handleSearchTermChange={setSearchTerm}
            searchCategories={searchCategories}
            handleSearchCategoriesChange={setSearchCategories}
            selectedChip={selectedChip}
            setSelectedChip={setSelectedChip}
            sortingOption={sortingOption} // Pass current sorting option value
            setSortingOption={setSortingOption} // Pass down sorting option setter
          />
        </Box>
        <div style={cardsContainerStyle}>
          {loading ? (
            <CircularProgress className="wm-progress" />
          ) : (
            artworks.map((artwork, index) => {
              // Fallback to artwork.id if artwork.thumbnail_url is undefined
              const thumbnailId = artwork.thumbnail_url || artwork.id;
              const aspectRatio = calculateAspectRatio(artwork);

              return (
                <div key={artwork.id} style={{ position: 'relative' }}>
                  <Card
                    style={{
                      ...cardStyle,
                      transform: isHovered[index] ? 'scale(1.05)' : 'scale(1)',
                      zIndex: isHovered[index] ? 1 : 0,
                    }}
                    onMouseEnter={() => setIsHovered((prevState) => ({ ...prevState, [index]: true }))}
                    onMouseLeave={() => setIsHovered((prevState) => ({ ...prevState, [index]: false }))}
                  >
                    <CardContent>
                      <Typography
                        variant="h6"
                        component="div"
                        style={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2, // Limit the text to 2 lines
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          height: '3em', // Adjust height to ensure it fits two lines
                          lineHeight: '1.5em', // Set the line height to control the spacing
                        }}
                      >
                        {artwork.title}
                      </Typography>

                      <Typography variant="body2" color="text.secondary">
                        {`Author(s): ${artwork.authors && Array.isArray(artwork.authors) ? artwork.authors.map(author => author.display_name).join(', ') : 'Unknown'}`}
                      </Typography>

                      <Typography variant="body2" color="text.secondary">
                        {`Datation: ${artwork.datation || 'Unknown'}`}
                      </Typography>

                      <Typography variant="body2" color="text.secondary">
                        {Array.isArray(artwork.keywords) ? artwork.keywords.join(', ') : 'No available keywords'}
                      </Typography>

                      <CardMedia>
                        <img
                          style={{
                            objectFit: "cover",
                            width: "100%",
                            height: `${140 * aspectRatio}px`, // Adjust height based on aspect ratio
                            marginTop: "10px"
                          }}
                          src={`${baseThumbnailURL}&session=${sessionId}&artwork=${thumbnailId}`}
                          srcSet={`${baseThumbnailURL}&session=${sessionId}&artwork=${thumbnailId}`}
                          alt={artwork.display_title}
                          loading="lazy"
                          className="wm-artwork"
                        />
                      </CardMedia>
                    </CardContent>
                    <CardActions style={{ justifyContent: 'center' }}>
                      <Tooltip title={t('Delete')}>
                        <Button
                          size="small"
                          variant="outlined"
                          color="secondary"
                          startIcon={<DeleteOutlineIcon />}
                          onClick={() => handleDeleteArtwork(artwork.id)}
                        >
                          Delete
                        </Button>
                      </Tooltip>
                      <Tooltip title={t('Modify')}>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<Edit />}
                          onClick={() => handleModifyContent(artwork.id)}
                        >
                          Modify
                        </Button>
                      </Tooltip>
                    </CardActions>
                  </Card>
                </div>
              );
            })
          )}
        </div>
      </div>

    </>
  );
}