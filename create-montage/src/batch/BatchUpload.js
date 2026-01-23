import * as React from 'react';
import { Box, Typography, Button, Tooltip } from '@mui/material';
import { Link } from '@mui/material';
import { selectTheme } from '../theme/ThemeUtils';
import { ThemeProvider } from '@mui/material/styles';

const theme = selectTheme();

function BatchUpload() {
  return (
    <ThemeProvider theme={theme}>
      <Box
        sx={{
          display: { xs: 'block', md: 'flex' },
          p: 2,
        }}
      >
        <Box
          id="batch_upload"
          sx={{
            flex: 1,
            order: { xs: 1, md: 1 },
          }}
        >
          <Typography variant="h6" sx={{ display: 'flex', justifyContent: 'center' }}>
            BATCH UPLOAD
          </Typography>
          <Typography variant="body1">
            <pre style={{ whiteSpace: 'pre-wrap', textIndent: '2em', paddingLeft: '2em', paddingRight: '2em' }}>
              {`
              A feature designed for professional users, available upon request. 
              It streamlines the process of uploading multiple artworks/contents efficiently. 
              Batch Upload used these steps:

                1.  Template Preparation:
                    Download the provided template file. 
                    Open it in Microsoft Excel and specify the required information. 

                2.  Formatting Guidelines:
                    Use , ; or / as separators for multiple Rights Representations, Keywords. 
                    Export the file as 'UTF-16 Unicode Text (.txt)'. 

                3.  Saving and Continuing:
                    Save the file and select 'Continue' when prompted about eventual incompatibility. 

                4.  Upload Process:
                    Navigate back to the 'Batch Upload' tab. Choose the TXT file (in Unicode format 16). 
                    Select artworks from a folder or drag them onto the page area. 
                    Press 'Check files', then proceed to 'Upload' and 'Import' to complete the process. 

                5.  Verification and Access:
                    After completion, imported works are visible in LIST CONTENTS. 

                
              `}
            </pre>
          </Typography>
          <Button 
            variant="contained" 
            color="secondary" 
            sx={{ 
              borderRadius: '5px', 
              mt: 2, 
              display: 'flex', 
              justifyContent: 'center', 
              maxWidth: '300px', 
              width: '100%', 
              marginLeft: 'auto', 
              marginRight: 'auto', 
              marginTop: '1em',
              marginBottom: '3em',
            }}
            component={Link}
            href="mailto:support@wallmuse.com?subject=Request Batch Upload Access"
          >
            Request Batch Upload Access
          </Button>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default BatchUpload;