import React, { useRef, useState } from 'react';
import { TextField, Chip, Stack } from '@mui/material';

export default function KeywordInput({ keywordsRef, setKeywords }) {
  const [inputValue, setInputValue] = useState('');  // Use state for controlling input

  // Function to add a keyword on 'Enter' or ','
  const handleKeyPress = (event) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();  // Prevent default form submission
      const newKeyword = inputValue.trim();  // Get the trimmed value
      if (newKeyword && !keywordsRef.current.includes(newKeyword)) {
        // Add the new keyword to the list if it's not already present
        const updatedKeywords = [...keywordsRef.current, newKeyword];
        keywordsRef.current = updatedKeywords;  // Update the ref
        setKeywords(updatedKeywords);  // Trigger update to parent
        console.log("[KeywordInput] Added keywords:", updatedKeywords);
      }
      setInputValue('');  // Clear the input after adding
    }
  };

  // Update input value
  const handleInputChange = (event) => {
    setInputValue(event.target.value);  // Update state with the input value
    console.log("[KeywordInput] Input value changed to:", event.target.value);
  };

  // Function to delete a keyword
  const handleDeleteKeyword = (keywordToDelete) => {
    const updatedKeywords = keywordsRef.current.filter((keyword) => keyword !== keywordToDelete);
    keywordsRef.current = updatedKeywords;  // Update the ref
    setKeywords(updatedKeywords);  // Trigger update to parent
    console.log("[KeywordInput] Deleted keyword:", keywordToDelete, "Updated keywords:", updatedKeywords);
  };

  return (
    <Stack spacing={2}>
      <TextField
        label="Add Keyword"
        placeholder="Type and press Enter or ','"
        onChange={handleInputChange}
        onKeyDown={handleKeyPress}
        onBlur={() => {
          // Also add keyword on blur so it's not lost if user clicks Save directly
          const kw = inputValue.trim();
          if (kw && !keywordsRef.current.includes(kw)) {
            const updated = [...keywordsRef.current, kw];
            keywordsRef.current = updated;
            setKeywords(updated);
            setInputValue('');
          }
        }}
        variant="outlined"
        value={inputValue}
      />
      <Stack direction="row" spacing={1}>
        {keywordsRef.current.map((keyword, index) => (
          <Chip
            key={index}
            label={keyword}
            onDelete={() => handleDeleteKeyword(keyword)}
          />
        ))}
      </Stack>
    </Stack>
  );
}