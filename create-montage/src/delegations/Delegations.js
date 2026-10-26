// Delegations.js — Account Delegations info panel (ShareX Administrators)

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Divider, Link, Paper, Typography } from '@mui/material';

const SECTIONS = [
  {
    titleKey: 'delegations.parent-child.title',
    bodyKey:  'delegations.parent-child.body',
  },
  {
    titleKey: 'delegations.cmo.title',
    bodyKey:  'delegations.cmo.body',
  },
  {
    titleKey: 'delegations.between-accounts.title',
    bodyKey:  'delegations.between-accounts.body',
    exampleKey: 'delegations.between-accounts.example',
  },
  {
    titleKey: 'delegations.common-exhibition.title',
    bodyKey:  'delegations.common-exhibition.body',
    exampleKey: 'delegations.common-exhibition.example',
  },
];

const CONTACT_URL = {
  fr: 'https://sharex.wallmuse.com/?lang=fr#wp-block-themeisle-blocks-advanced-column-6cbd13ae',
  default: 'https://sharex.wallmuse.com/#wp-block-themeisle-blocks-advanced-columns-b119b3bb',
};

function Delegations() {
  const { t, i18n } = useTranslation();
  const contactUrl = i18n.language.startsWith('fr') ? CONTACT_URL.fr : CONTACT_URL.default;

  return (
    <Paper
      variant="outlined"
      sx={{ maxWidth: 900, mx: 'auto', mt: 2, mb: 4, p: { xs: 2, sm: 3 } }}
    >
      <Typography variant="h6" gutterBottom>
        {t('delegations.about.title')}
      </Typography>

      <Divider sx={{ mb: 2 }} />

      {SECTIONS.map(({ titleKey, bodyKey, exampleKey }, i) => (
        <Box key={titleKey}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              {t(titleKey)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t(bodyKey)}
            </Typography>
            {exampleKey && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 1, pl: 1.5, borderLeft: '3px solid', borderColor: 'divider', fontStyle: 'italic' }}
              >
                {t(exampleKey)}
              </Typography>
            )}
          </Box>
          {i < SECTIONS.length - 1 && <Divider sx={{ mb: 2 }} />}
        </Box>
      ))}

      <Divider sx={{ mt: 1, mb: 2 }} />

      <Typography variant="body2" color="text.secondary">
        {t('delegations.contact')}{' '}
        <Link href={contactUrl} target="_blank" rel="noopener noreferrer" underline="hover">
          sharex.wallmuse.com
        </Link>
      </Typography>
    </Paper>
  );
}

export default Delegations;
