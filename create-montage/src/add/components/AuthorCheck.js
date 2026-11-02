// AuthorCheck.js

import React, { useState } from 'react';
import axios from 'axios';
import { Dialog, RadioGroup, FormControlLabel, Radio, Button, TextField } from '@mui/material';

function AuthorCheck({ sessionId, onAuthorSelected }) {
  const [authorName, setAuthorName] = useState('');
  const [suggestedAuthors, setSuggestedAuthors] = useState([]);
  const [selectedAuthorId, setSelectedAuthorId] = useState(null);
  const [showDialog, setShowDialog] = useState(false);

  // Fetch author suggestions
  const handleSearchAuthor = async () => {
    try {
      const response = await axios.post('/api/check_author', {
        name: authorName,
        session: sessionId,
        version: '1'
      });
      const authors = response.data.authors;  // Assuming response contains a list of authors
      setSuggestedAuthors(authors);
      setShowDialog(true);
    } catch (error) {
      console.error("Error fetching authors:", error);
    }
  };

  const handleAuthorConfirm = () => {
    const selectedAuthor = suggestedAuthors.find(author => author.id === selectedAuthorId);
    const authorId = selectedAuthorId === '-1' ? null : selectedAuthorId;
    const authorNameFinal = authorId ? selectedAuthor.display_name : authorName;

    // Pass the selected or new author name and ID back to the parent component
    onAuthorSelected({ id: authorId, name: authorNameFinal });
    setShowDialog(false);
  };

  return (
    <div>
      <TextField
        label="Author"
        value={authorName}
        onChange={e => setAuthorName(e.target.value)}
        onBlur={handleSearchAuthor}
        placeholder="Search or create author"
      />

      <Dialog open={showDialog} onClose={() => setShowDialog(false)}>
        <div>
          <h3>Select Author</h3>
          <RadioGroup
            value={selectedAuthorId}
            onChange={(e) => setSelectedAuthorId(e.target.value)}
          >
            {suggestedAuthors.map(author => (
              <FormControlLabel
                key={author.id}
                value={author.id}
                control={<Radio />}
                label={author.display_name}
              />
            ))}
            <FormControlLabel
              value="-1"
              control={<Radio />}
              label={`Create new author: ${authorName}`}
            />
          </RadioGroup>
          <Button onClick={handleAuthorConfirm}>Confirm</Button>
        </div>
      </Dialog>
    </div>
  );
}

export default AuthorCheck;