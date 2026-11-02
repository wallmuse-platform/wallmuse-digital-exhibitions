import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { Typography, Button } from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import '../../App.css';
import { Contents } from '../components/Contents';
import { AddContent } from '../components/AddContent';
import AuthorCheck from '../components/AuthorCheck';
import { useTranslation } from 'react-i18next';
import { currentTheme } from '../../theme/ThemeUtils';


function FlexBoxes() {
    // Load initial values from localStorage or use defaults
    const getInitialView = () => {
        const savedView = localStorage.getItem('flexboxes-view');
        return savedView || 'contents';
    };

    const getInitialWidth = () => {
        const savedWidth = localStorage.getItem('flexboxes-contents-width');
        return savedWidth ? parseInt(savedWidth, 10) : 200;
    };

    const [view, setView] = useState(getInitialView());
    const [selectedContent, setSelectedContent] = useState(null); // Manages the selected content for editing
    const [contentsWidth, setContentsWidth] = useState(getInitialWidth());
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const containerRef = useRef(null);
    const [selectedAuthor, setSelectedAuthor] = useState(null);

    const MIN_CONTENTS_WIDTH = 320; // Minimum width for Contents
    const MIN_ADD_CONTENT_WIDTH = 320; // Minimum width for AddContent

    const { t } = useTranslation();

    // Save view to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('flexboxes-view', view);
        console.log("View changed to:", view);
    }, [view]);

    // Save contents width to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('flexboxes-contents-width', contentsWidth.toString());
    }, [contentsWidth]);

    const handleMouseDown = (e) => {
        e.preventDefault();
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const handleMouseMove = (e) => {
        if (containerRef.current) {
            const containerRect = containerRef.current.getBoundingClientRect();
            const newWidth = e.clientX - containerRect.left;
            const maxContentsWidth = containerRect.width - MIN_ADD_CONTENT_WIDTH;

            if (newWidth >= MIN_CONTENTS_WIDTH && newWidth <= maxContentsWidth) {
                setContentsWidth(newWidth);
            }
        }
    };

    const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    };

    const handleSaveContent = (contentData) => {
        if (selectedContent) {
            // Call API to update existing content
            // updateContentAPI(contentData);
        } else {
            // Call API to add new content
            // addContentAPI(contentData);
        }
        setView('contents'); // Return to contents view after saving
    };

    // Handle the author selection callback
    const handleAuthorSelected = (author) => {
        console.log("Author selected in FlexBoxes:", author);
        setSelectedAuthor(author);
    };

    // Add this to see when selectedContent changes
    useEffect(() => {
        console.log("selectedContent changed in FlexBoxes:", selectedContent);
    }, [selectedContent]);

    useEffect(() => {
        console.log("View changed to:", view);
    }, [view]);

    return (
        <div
            className="addcontents"
            style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
            }}
            ref={containerRef}
        >
            {/* Mobile toggle buttons */}
            {isMobile && (
                <div className="mobile-toggle-buttons" style={{ display: 'flex', justifyContent: 'center', padding: '10px', margin: '20px' }}>
                    <Button
                        variant={view === "contents" ? "contained" : "outlined"}
                        size="small"
                        onClick={() => setView("contents")}
                        sx={{
                            backgroundColor: view === "contents" ? 'primary.main' : 'transparent',
                            borderColor: 'primary.main',
                            color: view === "contents" ? 'primary.contrastText' : 'primary.main',
                            '&:hover': {
                                backgroundColor: 'primary.main',
                                color: 'primary.contrastText'
                            }
                        }}
                    >
                        {t("bin.search.artworks." + currentTheme())}
                    </Button>
                    <Button
                        variant={view === "addContent" ? "contained" : "outlined"}
                        size="small"
                        onClick={() => setView("addContent")}
                        sx={{
                            marginLeft: 1,
                            backgroundColor: view === "addContent" ? 'primary.main' : 'transparent',
                            borderColor: 'primary.main',
                            color: view === "addContent" ? 'primary.contrastText' : 'primary.main',
                            '&:hover': {
                                backgroundColor: 'primary.main',
                                color: 'primary.contrastText'
                            }
                        }}
                    >
                        {t("rights.add")}
                    </Button>
                </div>
            )}
            {/* Contents Section */}
            <div
                className="content-section"
                style={{
                    width: isMobile ? '100%' : `${contentsWidth}px`, // Dynamic width based on dragging
                    borderWidth: isMobile ? '0' : '1px', // Remove border when mobile
                    borderStyle: isMobile ? 'none' : 'solid', // Remove border style when mobile
                    borderColor: isMobile ? 'transparent' : theme.palette.primary.main, // Transparent border when mobile
                    padding: isMobile ? '0' : '20px', // Remove padding when mobile
                    margin: isMobile ? '0' : '', // Remove margin when mobile
                    display: isMobile ? (view === 'contents' ? 'block' : 'none') : 'block',
                    minWidth: `${MIN_CONTENTS_WIDTH}px`, // Set minimum width
                }}
            >
                <Contents
                    setSelectedContent={setSelectedContent}  // Make sure this function is correctly passed
                    setView={setView}  // Ensure this function is also passed correctly
                />
            </div>
            {/* Divider */}
            {!isMobile && (
                <div
                    onMouseDown={handleMouseDown}
                    style={{
                        // width: '24px', // Make it wider to include the icon area
                        cursor: 'col-resize',
                        backgroundColor: 'transparent', // Make the background transparent
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'center',
                    }}
                >
                    {/* Background line */}
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: '1px',
                            height: '100%',
                            backgroundColor: theme.palette.primary.light,
                            zIndex: 1
                        }}
                    />

                    {/* Draggable indicator with MUI icon */}
                    <div
                        style={{
                            position: 'absolute',
                            top: '40px',
                            left: '50%',
                            transform: 'translate(-50%, 0) rotate(90deg)',
                            backgroundColor: theme.palette.primary.main,
                            color: theme.palette.primary.contrastText,
                            borderRadius: '50%',
                            width: '24px',
                            height: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                            zIndex: 10,
                            userSelect: 'none',
                            // Removed pointerEvents: 'none' so the icon area is also draggable
                        }}
                    >
                        <DragIndicatorIcon sx={{ fontSize: '16px' }} />
                    </div>
                </div>
            )}

            {/* AddContent Section */}
            <div
                className="add-content-section"
                style={{
                    flex: 1, // Take the remaining space
                    borderWidth: isMobile ? '0' : '1px', // Remove border when mobile
                    borderStyle: isMobile ? 'none' : 'solid', // Remove border style when mobile
                    borderColor: isMobile ? 'transparent' : theme.palette.primary.main, // Transparent border when mobile
                    padding: isMobile ? '0' : '20px', // Remove padding when mobile
                    margin: isMobile ? '0' : '', // Remove margin when mobile
                    display: isMobile ? (view === 'addContent' ? 'block' : 'none') : 'block',
                    minWidth: `${MIN_ADD_CONTENT_WIDTH}px`, // Set minimum width
                }}
            >
                <AddContent
                    selectedContent={selectedContent}
                    setView={setView}
                    onSave={handleSaveContent}
                // onCancel={() => setView('contents')}
                />
            </div>
        </div>
    );
}

export default FlexBoxes;