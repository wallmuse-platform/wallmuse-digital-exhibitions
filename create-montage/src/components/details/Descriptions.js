import React, { useState } from 'react'
import {Button, Chip, Stack, styled, TextareaAutosize, Typography, Box} from "@mui/material";
import LanguageSelector from "./LanguageSelector";
import { useTranslation } from 'react-i18next';
import { currentTheme } from "../../theme/ThemeUtils.js";

const ListItem = styled('li')(({ theme }) => ({
    margin: theme.spacing(0.5),
}));

// Add this component to handle displaying text with line breaks
export const TextWithBreaks = ({ children }) => {
    if (!children) return null;
    
    // This will handle both normal \n line breaks and <br> tags that might already be in the text
    // First, convert any <br> tags to \n to normalize the input
    const normalizedText = children.replace(/<br\s*\/?>/gi, '\n');
    
    return (
        <>
            {normalizedText.split('\n').map((line, i, arr) => (
                <React.Fragment key={i}>
                    {line}
                    {i < arr.length - 1 && <br />}
                </React.Fragment>
            ))}
        </>
    );
};

export default function Descriptions({ descriptions, setDescriptions, currentDescription, setCurrentDescription,
                                         currentDescriptionLang, setCurrentDescriptionLang,
                                         currentDescriptionName, setCurrentDescriptionName}) {

    const { t } = useTranslation();
    const [editing, setEditing] = useState(false);

    const handleDescriptionClick = (descToEdit) => () => {
        // When loading description for editing, convert <br> tags to newlines
        // for proper display in textarea
        const normalizedDescription = descToEdit.description 
            ? descToEdit.description.replace(/<br\s*\/?>/gi, '\n')
            : '';
            
        setCurrentDescription(normalizedDescription);
        setCurrentDescriptionLang(descToEdit.language);
        setCurrentDescriptionName(descToEdit.name);
        setEditing(true);
    }

    const handleDescriptionDelete = (descToDelete) => () => {
        setDescriptions((descs) => descs.filter((desc) => desc.language !== descToDelete.language));
    };

    const addDescription = () => {
        // When saving, convert newlines to <br> tags for storage
        const formattedDescription = currentDescription
            ? currentDescription.replace(/\n/g, '<br>')
            : '';

        console.log("[Descriptions] Converting description with line breaks:", 
            { original: currentDescription, formatted: formattedDescription });
            
        const newDescription = {
            language: currentDescriptionLang,
            description: formattedDescription,
            name: currentDescriptionName
        };

        let newDescriptions = descriptions
        ? descriptions.filter(d => d.language !== currentDescriptionLang)
        : [];
    
        newDescriptions = [...newDescriptions, newDescription];
        // Log before setting
        console.log("[Descriptions] Setting descriptions with formatted line breaks:", newDescriptions);
        
        setDescriptions(newDescriptions);
        setEditing(true);
        
        // Log the updated descriptions for debugging
        console.log("[Descriptions] Updated descriptions with formatting:", newDescriptions);
    };

    const handleLanguageChange = (langCode, langName) => {
        setEditing(descriptions && descriptions.filter(d => d.language === langCode).length > 0)
        setCurrentDescriptionLang(langCode);
        setCurrentDescriptionName(langName);
    };

    return (
        <Stack spacing={1}>
            <Typography variant="subtitle1">{ t("details.descriptions.title") }</Typography>
            <LanguageSelector
                language={ currentDescriptionLang }
                handleLanguageChange={ (langCode, langName) => handleLanguageChange(langCode, langName) }
                textLabel={ t("details.descriptions.language") }
            />
            <TextareaAutosize
                minRows={2}
                maxRows={4}
                aria-label={ t("details.descriptions.aria-label." + currentTheme()) }
                placeholder={ t("details.descriptions.placeholder." + currentTheme()) }
                value={ currentDescription || "" }
                onChange={ (e) => setCurrentDescription(e.target.value) }
            />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                    variant="outlined"
                    size="small"
                    onClick={ addDescription }
                    disabled={ !(currentDescription && currentDescriptionLang) }
                >
                    { editing ? t("details.descriptions.update") : t("details.descriptions.add") }
                </Button>
            </Box>
            { descriptions ?
            <Stack direction="row"
                sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    listStyle: 'none',
                    p: 0.5,
                    m: 0, 
                }}
                component="ul"
            >
                {descriptions.map((data, index) => {
                    return (
                        <ListItem key={index}>
                            <Chip
                                label={data.language}
                                onClick={ handleDescriptionClick(data) }
                                onDelete={ handleDescriptionDelete(data) }
                                size="small"
                            />
                        </ListItem>
                    );
                })}
            </Stack>
            : null}
        </Stack>
    );
}