// MontageWizard.js — Curation Wizard main component

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box, Button, CircularProgress, Typography, Divider, Paper, Snackbar, Alert,
} from '@mui/material';
import PreviewOutlinedIcon from '@mui/icons-material/PreviewOutlined';
import { useTranslation } from 'react-i18next';
import { ThemeProvider } from '@mui/material/styles';
import { selectTheme } from '../theme/ThemeUtils';

import { searchArtworks, countArtworks, getCategories, saveMontages } from '../api';
import { getArtworkDuration } from '../components/artworks/ArtworkUtils';

import AIPromptBar from './AIPromptBar';
import WizardFilters from './WizardFilters';
import WizardOptions from './WizardOptions';
import WizardPreview from './WizardPreview';

// Sort artworks by a given order key
function sortArtworks(artworks, order) {
  if (order === 'default') return [...artworks];
  const clone = [...artworks];
  if (order === 'author') {
    clone.sort((a, b) => {
      const nameA = a.authors?.[0]?.display_name || a.author || '';
      const nameB = b.authors?.[0]?.display_name || b.author || '';
      return nameA.localeCompare(nameB);
    });
  } else if (order === 'datation') {
    clone.sort((a, b) => (a.datation_end || a.datation_start || 0) - (b.datation_end || b.datation_start || 0));
  } else if (order === 'title') {
    clone.sort((a, b) => (a.display_title || a.title || '').localeCompare(b.display_title || b.title || ''));
  }
  return clone;
}

// Distribute artworks evenly across N tracks
function distributeToTracks(artworks, numTracks) {
  const result = Array.from({ length: numTracks }, () => []);
  artworks.forEach((artwork, idx) => {
    result[idx % numTracks].push(artwork);
  });
  return result;
}

function MontageWizard({ onSaveSuccess }) {
  const { t } = useTranslation();
  const theme = selectTheme();

  // ── Data loading ───────────────────────────────────────────────────────────
  const [allArtworks, setAllArtworks] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const [total, cats] = await Promise.all([
          countArtworks('', '', '', ''),
          getCategories(),
        ]);
        const artworks = await searchArtworks('', '', '', '', 0, total || 500);
        if (!cancelled) {
          setAllArtworks(artworks);
          setAllCategories(cats);
        }
      } catch (err) {
        if (!cancelled) setLoadError(err.message || 'Failed to load artworks');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  // ── Filter state ───────────────────────────────────────────────────────────
  const [selectedAuthors, setSelectedAuthors] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [keywordFilter, setKeywordFilter] = useState('');

  // Filtered artworks (client-side, instant)
  const filteredArtworks = useMemo(() => {
    let result = allArtworks;

    if (selectedAuthors.length > 0) {
      // Match by normalized display_name so artworks linked to any DB duplicate
      // of the same author (different id, same name) are all included.
      const authorNames = new Set(selectedAuthors.map(a => a.nameKey));
      result = result.filter(artwork =>
        (artwork.authors || []).some(a =>
          authorNames.has((a.display_name || '').trim().toLowerCase())
        )
      );
    }

    if (selectedCategories.length > 0) {
      const catIds = new Set(selectedCategories.map(c => c.id));
      result = result.filter(artwork =>
        (artwork.categorys || artwork.categories || []).some(c => catIds.has(c.id))
      );
    }

    if (keywordFilter.trim()) {
      const kw = keywordFilter.trim().toLowerCase();
      result = result.filter(artwork => {
        const kwStr = Array.isArray(artwork.keywords)
          ? artwork.keywords.join(',')
          : (artwork.keywords || '');
        return kwStr.toLowerCase().includes(kw)
          || (artwork.display_title || artwork.title || '').toLowerCase().includes(kw);
      });
    }

    return result;
  }, [allArtworks, selectedAuthors, selectedCategories, keywordFilter]);

  // ── Options state ──────────────────────────────────────────────────────────
  const [tracks, setTracks] = useState(1);
  const [order, setOrder] = useState('default');
  const [copyright, setCopyright] = useState('-2');
  const [namePrefix, setNamePrefix] = useState('');

  // ── Preview + Save state ───────────────────────────────────────────────────
  const [distributedTracks, setDistributedTracks] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState(null);

  // Reset preview when filters/options change
  useEffect(() => {
    setDistributedTracks([]);
    setSaveResult(null);
  }, [selectedAuthors, selectedCategories, keywordFilter, tracks, order]);

  const handlePreview = useCallback(() => {
    if (filteredArtworks.length === 0) return;
    const sorted = sortArtworks(filteredArtworks, order);
    const distributed = distributeToTracks(sorted, tracks);
    setDistributedTracks(distributed);
    setSaveResult(null);
  }, [filteredArtworks, order, tracks]);

  const handleSave = useCallback(async () => {
    if (!namePrefix || distributedTracks.length === 0) return;
    setSaving(true);
    setSaveResult(null);
    try {
      const montage = {
        name: namePrefix,
        rating: 'G',
        copyrights: [{ type: copyright, direction: 'A' }],
        seqs: distributedTracks
          .filter(track => track.length > 0)
          .map(track => ({
            array_content: track.map(artwork => ({
              tag_name: 'item',
              artwork_id: artwork.id.toString(),
              offset: '0',
              duration: getArtworkDuration(artwork).toString(),
              repeat: '1',
            })),
          })),
      };
      const response = await saveMontages(montage);
      const newId = response?.data?.id;
      const trackTotals = distributedTracks
        .filter(track => track.length > 0)
        .map(track => track.reduce((sum, aw) => sum + getArtworkDuration(aw), 0));
      const tracksUnaligned = trackTotals.length > 1 &&
        (Math.max(...trackTotals) - Math.min(...trackTotals)) > 1;
      if (onSaveSuccess && newId) {
        onSaveSuccess(newId, tracksUnaligned);
      } else {
        setSaveResult({ success: true, message: t('wizard.save.success', `"${namePrefix}" saved successfully.`, { name: namePrefix }) });
      }
    } catch (err) {
      setSaveResult({ success: false, message: err.message || t('wizard.save.error', 'Save failed. Please try again.') });
    } finally {
      setSaving(false);
    }
  }, [namePrefix, copyright, distributedTracks, t]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ maxWidth: 900, mx: 'auto', px: 2, pb: 4 }}>

        {/* AI Prompt (stub) */}
        <AIPromptBar />

        <Paper variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>

          {/* Loading / error */}
          {loading && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={18} />
              <Typography variant="body2" color="text.secondary">
                {t('wizard.loading', 'Loading contents…')}
              </Typography>
            </Box>
          )}
          {loadError && (
            <Typography variant="body2" color="error">{loadError}</Typography>
          )}

          {!loading && !loadError && (
            <>
              {/* Filters */}
              <WizardFilters
                allArtworks={allArtworks}
                allCategories={allCategories}
                selectedAuthors={selectedAuthors}
                setSelectedAuthors={setSelectedAuthors}
                selectedCategories={selectedCategories}
                setSelectedCategories={setSelectedCategories}
                keywordFilter={keywordFilter}
                setKeywordFilter={setKeywordFilter}
                filteredCount={filteredArtworks.length}
              />

              <Divider />

              {/* Options */}
              <WizardOptions
                tracks={tracks}
                setTracks={setTracks}
                order={order}
                setOrder={setOrder}
                copyright={copyright}
                setCopyright={setCopyright}
                namePrefix={namePrefix}
                setNamePrefix={setNamePrefix}
              />

              {/* Preview button */}
              <Box>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<PreviewOutlinedIcon />}
                  onClick={handlePreview}
                  disabled={filteredArtworks.length === 0 || filteredArtworks.length < tracks}
                >
                  {filteredArtworks.length < tracks && filteredArtworks.length > 0
                    ? t('wizard.preview.not.enough', `Need at least ${tracks} contents`)
                    : t('wizard.preview.button', 'Preview Distribution')}
                </Button>
                {filteredArtworks.length === 0 && !loading && (
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                    {t('wizard.no.artworks', 'No contents match the current filters.')}
                  </Typography>
                )}
              </Box>

              {/* Preview + Save */}
              {distributedTracks.length > 0 && (
                <>
                  <Divider />
                  <WizardPreview
                    distributedTracks={distributedTracks}
                    namePrefix={namePrefix}
                    saving={saving}
                    onSave={handleSave}
                  />
                </>
              )}
            </>
          )}
        </Paper>

        <Snackbar
          open={!!saveResult}
          autoHideDuration={6000}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          onClose={() => setSaveResult(null)}
        >
          <Alert
            severity={saveResult?.success ? 'success' : 'error'}
            onClose={() => setSaveResult(null)}
          >
            {saveResult?.message}
          </Alert>
        </Snackbar>

      </Box>
    </ThemeProvider>
  );
}

export default MontageWizard;
