// WizardFilters.js — Author / Category / Keyword filtering

import React, { useMemo } from 'react';
import { Box, Autocomplete, TextField, Chip, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

function WizardFilters({
  allArtworks,
  allCategories,
  selectedAuthors,
  setSelectedAuthors,
  selectedCategories,
  setSelectedCategories,
  keywordFilter,
  setKeywordFilter,
  filteredCount,
}) {
  const { t } = useTranslation();

  // Derive unique authors from the fetched artworks.
  // Deduplicate by normalized display_name so that DB duplicates
  // (e.g. "Christian Zimmermann" stored under multiple ids) appear once.
  const authorOptions = useMemo(() => {
    const seen = new Set();
    const authors = [];
    for (const artwork of allArtworks) {
      const authorList = artwork.authors || [];
      for (const a of authorList) {
        if (a.kind && a.kind !== 'AUT') continue;
        const nameKey = (a.display_name || '').trim().toLowerCase();
        if (nameKey && !seen.has(nameKey)) {
          seen.add(nameKey);
          authors.push({ nameKey, label: a.display_name });
        }
      }
    }
    return authors.sort((a, b) => a.label?.localeCompare(b.label));
  }, [allArtworks]);

  // Categories from the API (shape: { id, name })
  const categoryOptions = useMemo(() => {
    return (allCategories || []).map(c => ({ id: c.id, label: c.name }))
      .sort((a, b) => a.label?.localeCompare(b.label));
  }, [allCategories]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Typography variant="subtitle2" color="text.secondary">
        {t('wizard.filters.title', 'Artwork Selection')}
        {' '}
        <Chip
          label={`${filteredCount} ${t('wizard.filters.artworks', 'artworks')}`}
          size="small"
          color={filteredCount > 0 ? 'primary' : 'default'}
          sx={{ ml: 1 }}
        />
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Autocomplete
          multiple
          size="small"
          options={authorOptions}
          value={selectedAuthors}
          onChange={(_, newVal) => setSelectedAuthors(newVal)}
          isOptionEqualToValue={(opt, val) => opt.nameKey === val.nameKey}
          getOptionLabel={opt => opt.label || ''}
          renderInput={params => (
            <TextField {...params} label={t('wizard.filters.authors', 'Authors')} placeholder={t('wizard.filters.authors.placeholder', 'Select authors…')} />
          )}
          sx={{ minWidth: 220, flex: 1 }}
          limitTags={3}
        />

        <Autocomplete
          multiple
          size="small"
          options={categoryOptions}
          value={selectedCategories}
          onChange={(_, newVal) => setSelectedCategories(newVal)}
          isOptionEqualToValue={(opt, val) => opt.id === val.id}
          getOptionLabel={opt => opt.label || ''}
          renderInput={params => (
            <TextField {...params} label={t('wizard.filters.categories', 'Categories')} placeholder={t('wizard.filters.categories.placeholder', 'Select categories…')} />
          )}
          sx={{ minWidth: 220, flex: 1 }}
          limitTags={3}
        />

        <TextField
          size="small"
          label={t('wizard.filters.keywords', 'Keywords')}
          placeholder={t('wizard.filters.keywords.placeholder', 'e.g. calligraphy')}
          value={keywordFilter}
          onChange={e => setKeywordFilter(e.target.value)}
          sx={{ minWidth: 180, flex: 1 }}
        />
      </Box>
    </Box>
  );
}

export default WizardFilters;
