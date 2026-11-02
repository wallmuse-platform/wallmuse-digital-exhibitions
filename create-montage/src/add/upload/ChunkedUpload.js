// ChunkedUpload.js

import React, { useEffect } from 'react';
import { Box, Button, TextField } from '@mui/material';
import Resumable from 'resumablejs';

const ChunkedUpload = ({ onUploadSuccess, showUpload, handleButtonClick, contentData, setContentData }) => {

  useEffect(() => {
    if (showUpload) {
      const r = new Resumable({
        target: '/upload_file', // Your server-side endpoint
        chunkSize: 1 * 1024 * 1024, // 1MB chunks
        maxChunkRetries: 5, // Retry a chunk 5 times before failing
        chunkRetryInterval: 2000, // 2 seconds between retries
        simultaneousUploads: 3, // Number of simultaneous uploads
        testChunks: false, // Skip testing for existing chunks before upload
        throttleProgressCallbacks: 1 // Throttle progress events
      });

      r.assignBrowse(document.getElementById('upload_artwork'));

      r.on('fileAdded', function (file) {
        console.log('File added', file);
        r.upload();
      });

      r.on('fileProgress', function (file) {
        console.log('File progress', Math.floor(file.progress() * 100) + '%');
        document.getElementById('progress-bar').style.width = Math.floor(file.progress() * 100) + '%';
      });

      r.on('fileSuccess', function (file, message) {
        console.log('Upload successful!', file, message);
        const fileUrl = JSON.parse(message).fileUrl;
        onUploadSuccess(fileUrl);
      });

      r.on('fileError', function (file, message) {
        console.error('Upload error', file, message);
        alert('An error occurred while uploading the file.');
      });
    }
  }, [showUpload, onUploadSuccess]);

  return (
    <Box sx={{ mt: 2 }}>
      {showUpload ? (
        <Box>
          <input type="file" id="upload_artwork" style={{ display: 'none' }} />
          <Button variant="outlined" fullWidth onClick={() => document.getElementById('upload_artwork').click()}>
            BROWSE HD/4K VERSION
          </Button>
          <Box sx={{ border: '1px solid #ddd', width: '100%', height: '20px', marginTop: '10px' }}>
            <div id="progress-bar" style={{ height: '100%', backgroundColor: '#4caf50', width: '0%' }}></div>
          </Box>
        </Box>
      ) : (
        <TextField
          fullWidth
          label="HD/4K Version URL"
          name="hdPath"
          value={contentData.media.hdPath}
          onChange={(e) =>
            setContentData({
              ...contentData,
              media: { ...contentData.media, hdPath: e.target.value },
            })
          }
          sx={{ mt: 2 }}
        />
      )}

      <Button
        variant="outlined"
        fullWidth
        onClick={handleButtonClick}
        sx={{ mt: 2 }}
      >
        {showUpload ? "PROVIDE LINK" : "BROWSE HD/4K VERSION"}
      </Button>
    </Box>
  );
};

export default ChunkedUpload;