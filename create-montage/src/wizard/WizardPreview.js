// WizardPreview.js — Track preview and save

import React, { useContext } from 'react';
import {
  Box, Button, Typography, Accordion, AccordionSummary, AccordionDetails,
  List, ListItem, ListItemAvatar, ListItemText, Avatar, CircularProgress,
  Alert,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import { useTranslation } from 'react-i18next';
import { BaseThumbnailContext } from '../context/ArtworksContext';
import { useSession } from '../context/UserContext';

function WizardPreview({ distributedTracks, namePrefix, saving, saveResult, onSave }) {
  const { t } = useTranslation();
  const baseThumbnailURL = useContext(BaseThumbnailContext);
  const sessionId = useSession();

  if (!distributedTracks || distributedTracks.length === 0) {
    return null;
  }

  const totalArtworks = distributedTracks.reduce((sum, track) => sum + track.length, 0);

  const getThumbnailUrl = (artwork) => {
    const id = artwork.thumbnail_url || artwork.id;
    return `${baseThumbnailURL}&artwork=${id}&session=${sessionId}`;
  };

  const getAuthorName = (artwork) => {
    if (artwork.authors && artwork.authors.length > 0) {
      return artwork.authors.map(a => a.display_name).join(', ');
    }
    return artwork.author || '';
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="subtitle2" color="text.secondary">
          {t('wizard.preview.title', 'Preview')}
          {' — '}
          <strong>{namePrefix || t('wizard.preview.unnamed', 'Untitled')}</strong>
          {', '}
          {distributedTracks.length} {t('wizard.preview.tracks', 'tracks')},
          {' '}{totalArtworks} {t('wizard.preview.artworks', 'artworks')}
        </Typography>
        <Button
          variant="contained"
          size="small"
          startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <SaveOutlinedIcon />}
          onClick={onSave}
          disabled={saving || !namePrefix}
        >
          {saving ? t('wizard.preview.saving', 'Saving…') : t('wizard.preview.save', 'Save Montage')}
        </Button>
      </Box>

      {!namePrefix && (
        <Alert severity="warning" sx={{ py: 0 }}>
          {t('wizard.preview.name.required', 'Please enter a montage name before saving.')}
        </Alert>
      )}

      {saveResult && (
        <Alert severity={saveResult.success ? 'success' : 'error'} sx={{ py: 0 }}>
          {saveResult.message}
        </Alert>
      )}

      {distributedTracks.map((track, idx) => (
        <Accordion key={idx} defaultExpanded={idx === 0} disableGutters elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 40, '& .MuiAccordionSummary-content': { my: 0.5 } }}>
            <Typography variant="body2" fontWeight={500}>
              {t('wizard.preview.track', 'Track')} {idx + 1}
              <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                ({track.length} {t('wizard.preview.artworks', 'artworks')})
              </Typography>
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 0 }}>
            <List dense disablePadding>
              {track.map((artwork, artIdx) => (
                <ListItem key={artwork.id || artIdx} divider sx={{ py: 0.5 }}>
                  <ListItemAvatar sx={{ minWidth: 48 }}>
                    <Avatar
                      variant="rounded"
                      src={getThumbnailUrl(artwork)}
                      alt={artwork.display_title}
                      sx={{ width: 36, height: 36 }}
                    />
                  </ListItemAvatar>
                  <ListItemText
                    primary={<Typography variant="body2" noWrap>{artwork.display_title || artwork.title}</Typography>}
                    secondary={<Typography variant="caption" color="text.secondary" noWrap>{getAuthorName(artwork)}{artwork.datation_end ? ` · ${artwork.datation_end}` : ''}</Typography>}
                  />
                </ListItem>
              ))}
            </List>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
}

export default WizardPreview;
