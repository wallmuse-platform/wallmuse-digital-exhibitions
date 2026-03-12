// WizardOptions.js — Tracks / Order / Copyright / Name prefix

import React from 'react';
import {
  Box, TextField, FormControl, InputLabel, Select, MenuItem,
  RadioGroup, FormControlLabel, Radio, Typography, FormLabel,
} from '@mui/material';
import { useTranslation } from 'react-i18next';

const ORDER_OPTIONS = [
  { value: 'default', labelKey: 'wizard.options.order.default', fallback: 'Default' },
  { value: 'author',  labelKey: 'wizard.options.order.author',  fallback: 'By Author' },
  { value: 'datation',labelKey: 'wizard.options.order.datation',fallback: 'By Datation' },
  { value: 'title',   labelKey: 'wizard.options.order.title',   fallback: 'By Title' },
];

const COPYRIGHT_OPTIONS = [
  { value: '-1',  labelKey: 'rights.free' },
  { value: '-2',  labelKey: 'rights.copyright' },
  { value: '-3',  labelKey: 'rights.copyleft' },
  { value: '-4',  labelKey: 'rights.cc-by' },
  { value: '-5',  labelKey: 'rights.cc-by-sa' },
  { value: '-6',  labelKey: 'rights.cc-by-nd' },
  { value: '-7',  labelKey: 'rights.cc-by-nc' },
  { value: '-8',  labelKey: 'rights.cc-by-nc-sa' },
  { value: '-9',  labelKey: 'rights.cc-by-nc-nd' },
  { value: '-10', labelKey: 'rights.other' },
  { value: '-11', labelKey: 'rights.no-access' },
];

function WizardOptions({ tracks, setTracks, order, setOrder, copyright, setCopyright, namePrefix, setNamePrefix }) {
  const { t } = useTranslation();

  const handleTracksChange = (e) => {
    const val = Math.max(1, Math.min(9, parseInt(e.target.value) || 1));
    setTracks(val);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="subtitle2" color="text.secondary">
        {t('wizard.options.title', 'Options')}
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}>

        {/* Track count */}
        <TextField
          size="small"
          type="number"
          label={t('wizard.options.tracks', 'Tracks')}
          value={tracks}
          onChange={handleTracksChange}
          inputProps={{ min: 1, max: 9 }}
          sx={{ width: 90 }}
        />

        {/* Name prefix */}
        <TextField
          size="small"
          label={t('wizard.options.name', 'Montage name')}
          placeholder={t('wizard.options.name.placeholder', 'e.g. Zimmermann_2023')}
          value={namePrefix}
          onChange={e => setNamePrefix(e.target.value)}
          sx={{ minWidth: 200, flex: 1 }}
        />

        {/* Copyright */}
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>{t('wizard.options.copyright', 'Copyright')}</InputLabel>
          <Select
            value={copyright}
            label={t('wizard.options.copyright', 'Copyright')}
            onChange={e => setCopyright(e.target.value)}
          >
            {COPYRIGHT_OPTIONS.map(opt => (
              <MenuItem key={opt.value} value={opt.value}>
                {t(opt.labelKey)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Order */}
      <Box>
        <FormLabel component="legend" sx={{ fontSize: '0.75rem', mb: 0.5 }}>
          {t('wizard.options.order', 'Order')}
        </FormLabel>
        <RadioGroup row value={order} onChange={e => setOrder(e.target.value)}>
          {ORDER_OPTIONS.map(opt => (
            <FormControlLabel
              key={opt.value}
              value={opt.value}
              control={<Radio size="small" />}
              label={<Typography variant="body2">{t(opt.labelKey, opt.fallback)}</Typography>}
            />
          ))}
        </RadioGroup>
      </Box>
    </Box>
  );
}

export default WizardOptions;
