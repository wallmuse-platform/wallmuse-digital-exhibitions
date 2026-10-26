import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Box, Typography, Button, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, LinearProgress, Alert,
  Accordion, AccordionSummary, AccordionDetails, Stack, Divider,
  Chip, Tooltip, Stepper, Step, StepLabel, Snackbar,
} from '@mui/material';
import MuiAlert from '@mui/material/Alert';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import ReplayIcon from '@mui/icons-material/Replay';
import { selectTheme } from '../theme/ThemeUtils';
import { ThemeProvider } from '@mui/material/styles';
import { useUserContext } from '../context/UserContext';
import { useTranslation } from 'react-i18next';
import batchUploadEN from '../locales/en/batchUploadEN.json';
import batchUploadFR from '../locales/fr/batchUploadFR.json';
import {
  checkBatchFiles,
  saveBatchChoices,
  uploadBatchArtwork,
  importBatchArtworks,
} from '../api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TEMPLATE_PATH = '/wallmuse/components/com_wmbatchartworkupload/views/wmbatchartworkupload/tmpl/batch-template/batch_upload_template.xls';
const templateUrl = window.location.hostname.includes('wallmuse.com')
  ? TEMPLATE_PATH
  : `https://wallmuse.com${TEMPLATE_PATH}`;

const LICENSE_TYPE_MAP = {
  // String labels
  FREE:                  '-1',
  COPYRIGHT:             '-2',
  COPYLEFT:              '-3',
  CC_BY:                 '-4',
  CC_BY_SA:              '-5',
  CC_BY_ND:              '-6',
  CC_BY_NC:              '-7',
  CC_BY_NC_SA:           '-8',
  CC_BY_NC_ND:           '-9',
  OTHER:                 '-10',
  NO_ACCESS:             '-11',
  CC0:                   '-12',
  NO_PUBLIC_PLACES:      '-13',
  NO_HOSPITALS:          '-14',
  NO_EDUCATION_FREE:     '-15',
  NO_MON_EDUCATION_FREE: '-16',
  // Numeric IDs (pass-through)
  '-1': '-1', '-2': '-2', '-3': '-3', '-4': '-4',
  '-5': '-5', '-6': '-6', '-7': '-7', '-8': '-8',
  '-9': '-9', '-10': '-10', '-11': '-11', '-12': '-12',
  '-13': '-13', '-14': '-14', '-15': '-15', '-16': '-16',
};

const getFilename = (path) => {
  if (!path) return '';
  const i = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
  return i >= 0 ? path.substring(i + 1) : path;
};

const parseTSV = (text) => {
  const cleaned = text.startsWith('\uFEFF') ? text.slice(1) : text;
  return cleaned
    .split(/\r?\n/)
    .filter(line => line.trim().length > 0)
    .map(line => line.split('\t'));
};

// Re-encode a TSV string as UTF-16 LE with BOM (matches the server's expected format)
const toUtf16LE = (str) => {
  const buf = new ArrayBuffer(str.length * 2);
  const view = new DataView(buf);
  for (let i = 0; i < str.length; i++) {
    view.setUint16(i * 2, str.charCodeAt(i), true); // true = little-endian
  }
  return buf;
};

// Transform column 23 (License Type) from string labels to numeric codes before upload
const transformCsvLicenseTypes = (file, licenseMap) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsText(file, 'UTF-16');
    reader.onload = (e) => {
      try {
        const rows = parseTSV(e.target.result);
        let changed = false;
        const transformed = rows.map((row, idx) => {
          if (idx === 0) return row; // header row unchanged
          const lt = (row[23] || '').trim().toUpperCase();
          const mapped = lt && licenseMap[lt];
          if (mapped && mapped !== row[23]) {
            changed = true;
            const newRow = [...row];
            newRow[23] = mapped;
            return newRow;
          }
          return row;
        });
        if (!changed) { resolve(file); return; }
        const tsv = '\uFEFF' + transformed.map(r => r.join('\t')).join('\r\n');
        const blob = new Blob([toUtf16LE(tsv)], { type: 'text/plain' });
        resolve(new File([blob], file.name, { type: file.type }));
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
  });

const interpolate = (str, vars) =>
  Object.entries(vars).reduce((acc, [k, v]) => acc.replace(`{${k}}`, v), str);

const useBatchStrings = () => {
  const { i18n } = useTranslation();
  return i18n.language?.startsWith('fr') ? batchUploadFR : batchUploadEN;
};

const ROW_COLORS = {
  default: 'inherit',
  matched: '#e3f2fd',
  ok:      '#e8f5e9',
  error:   '#ffebee',
};

// ─── AI Preamble ──────────────────────────────────────────────────────────────

function AIPreamble({ s }) {
  return (
    <Accordion disableGutters sx={{ mb: 3, border: '1px solid', borderColor: 'divider' }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          {s.guideTitle}
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Alert severity="info" sx={{ fontSize: '0.85rem', flex: 1 }}>
              {s.guideAlert}
            </Alert>
            <Button
              variant="outlined"
              size="small"
              startIcon={<InsertDriveFileOutlinedIcon />}
              component="a"
              href={templateUrl}
              download="batch_upload_template.xls"
              sx={{ whiteSpace: 'nowrap' }}
            >
              {s.downloadTemplate}
            </Button>
          </Box>

          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{s.promptLabel}</Typography>
          <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50', fontFamily: 'monospace', fontSize: '0.8rem', whiteSpace: 'pre-wrap' }}>
            {s.prompt}
          </Paper>

          <Divider />

          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{s.rightsRepTitle}</Typography>
          <Typography sx={{ fontSize: '0.85rem' }}>{s.rightsRepExamples}</Typography>
          <Alert severity="warning" sx={{ fontSize: '0.85rem' }}>{s.rightsRepWarning}</Alert>

          <Divider />

          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{s.streamingTitle}</Typography>
          <Box component="ul" sx={{ pl: 3, mt: 0, '& li': { fontSize: '0.85rem', mb: 0.5 } }}>
            <li>{s.streaming1}</li>
            <li>{s.streaming0}</li>
          </Box>

          <Divider />

          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{s.fileNamingTitle}</Typography>
          <Box component="ul" sx={{ pl: 3, mt: 0, '& li': { fontSize: '0.85rem', mb: 0.5 } }}>
            <li>{s.fileNaming1}</li>
            <li>{s.fileNaming2}</li>
          </Box>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}

// ─── Dropzone ─────────────────────────────────────────────────────────────────

function Dropzone({ label, hint, accept, multiple, onFiles, dragActive, setDragActive, disabled }) {
  const inputRef = useRef(null);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragActive(false);
    if (disabled) return;
    onFiles(e.dataTransfer.files);
  }, [disabled, onFiles, setDragActive]);

  return (
    <Paper
      variant="outlined"
      onDragOver={e => { e.preventDefault(); if (!disabled) setDragActive(true); }}
      onDragLeave={() => setDragActive(false)}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      sx={{
        border: '2px dashed',
        borderColor: disabled ? 'grey.300' : dragActive ? 'primary.main' : 'grey.400',
        borderRadius: 2,
        p: { xs: 3, sm: 4 },
        textAlign: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        bgcolor: disabled ? 'grey.100' : dragActive ? 'action.hover' : 'background.paper',
        transition: 'border-color 0.2s, background-color 0.2s',
        userSelect: 'none',
      }}
    >
      <input
        ref={inputRef}
        type="file"
        style={{ display: 'none' }}
        accept={accept}
        multiple={multiple}
        onChange={e => onFiles(e.target.files)}
      />
      <CloudUploadIcon sx={{ fontSize: 40, color: disabled ? 'grey.400' : 'primary.light', mb: 1 }} />
      <Typography variant="body1" sx={{ fontWeight: 500, color: disabled ? 'text.disabled' : 'text.primary' }}>
        {label}
      </Typography>
      {hint && (
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
          {hint}
        </Typography>
      )}
    </Paper>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

function BatchUpload({ wpLoggedIn }) {
  const theme = selectTheme();
  const { isPremium } = useUserContext() || {};
  const canAccess = wpLoggedIn || isPremium;
  const s = useBatchStrings();

  // Files
  const [csvFile,      setCsvFile]      = useState(null);
  const [artworkFiles, setArtworkFiles] = useState([]);

  // Parsed table
  const [tableRows, setTableRows] = useState([]);
  const hdMap    = useRef({});
  const sdMap    = useRef({});
  const thumbMap = useRef({});

  // Row status
  const [rowStatus, setRowStatus] = useState({});
  const [rowErrors, setRowErrors] = useState({});

  // Step flags
  const [checking,      setChecking]      = useState(false);
  const [checkDone,     setCheckDone]     = useState(false);
  const [checkHasErrors,setCheckHasErrors]= useState(false);
  const [uploading,     setUploading]     = useState(false);
  const [uploadDone,    setUploadDone]    = useState(false);
  const [importing,     setImporting]     = useState(false);
  const [importResult,  setImportResult]  = useState(null);

  // Per-file upload progress
  const [uploadProgress, setUploadProgress] = useState({});

  // Drag states
  const [csvDrag,     setCsvDrag]     = useState(false);
  const [artworkDrag, setArtworkDrag] = useState(false);

  // Inline message (below stepper)
  const [message, setMessage] = useState(null);

  // Snackbar (bottom-of-screen pop-up)
  const [snackbar, setSnackbar] = useState({ open: false, text: '', severity: 'success' });

  // Scroll refs
  const actionRef        = useRef(null); // action buttons row
  const progressRef      = useRef(null); // upload progress section
  const transformedCsvRef = useRef(null); // CSV with numeric license codes for server

  // ── Snackbar helpers ─────────────────────────────────────────────────────

  const notify = useCallback((text, severity = 'success') => {
    setSnackbar({ open: true, text, severity });
  }, []);

  // ── Auto-scroll + notify on key state transitions ────────────────────────

  useEffect(() => {
    if (checkDone && !checkHasErrors) {
      notify(s.notifyValidated);
      actionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    if (checkDone && checkHasErrors) {
      notify(s.notifyRowErrors, 'warning');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkDone, checkHasErrors]);

  useEffect(() => {
    if (uploading) {
      progressRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [uploading]);

  useEffect(() => {
    if (uploadDone) {
      notify(s.notifyUploadDone);
      actionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadDone]);

  useEffect(() => {
    if (importResult?.success) {
      notify(s.notifyImportDone);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [importResult]);

  // ── Derived: active stepper step ─────────────────────────────────────────

  const activeStep =
    importResult            ? 5 :
    importing || uploadDone ? 4 :
    uploading || (checkDone && !checkHasErrors) ? 3 :
    checking || artworkFiles.length > 0 ? 2 :
    csvFile                 ? 1 : 0;

  // ── Reset ─────────────────────────────────────────────────────────────────

  const handleReset = () => {
    setCsvFile(null);
    setArtworkFiles([]);
    setTableRows([]);
    setRowStatus({});
    setRowErrors({});
    setChecking(false);
    setCheckDone(false);
    setCheckHasErrors(false);
    setUploading(false);
    setUploadDone(false);
    setImporting(false);
    setImportResult(null);
    setUploadProgress({});
    setMessage(null);
    hdMap.current = {};
    sdMap.current = {};
    thumbMap.current = {};
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── CSV file handling ─────────────────────────────────────────────────────

  const handleCSVFiles = useCallback((files) => {
    const file = Array.from(files).find(f =>
      f.name.toLowerCase().endsWith('.txt') ||
      f.name.toLowerCase().endsWith('.csv') ||
      f.type.startsWith('text/')
    );
    if (!file) {
      setMessage({ severity: 'error', text: s.msgWrongFormat });
      return;
    }
    const reader = new FileReader();
    reader.readAsText(file, 'UTF-16');
    reader.onload = (e) => {
      const rows = parseTSV(e.target.result);
      if (rows.length < 2) {
        setMessage({ severity: 'error', text: s.msgEmptyFile });
        return;
      }
      hdMap.current = {};
      sdMap.current = {};
      thumbMap.current = {};
      const newStatus = {};
      const parsed = rows.slice(1).map((row, i) => {
        const hdFile    = getFilename(row[18] || '');
        const sdFile    = getFilename(row[19] || '');
        const thumbFile = getFilename(row[20] || '');
        if (hdFile)    hdMap.current[hdFile.normalize('NFC')]    = i;
        if (sdFile)    sdMap.current[sdFile.normalize('NFC')]    = i;
        if (thumbFile) thumbMap.current[thumbFile.normalize('NFC')] = i;
        newStatus[i] = 'default';
        const artist = [row[0], row[2]].filter(Boolean).join(' ');
        const streaming    = (row[22] || '').trim();
        const licenseType  = (row[23] || '').trim();
        return { title: row[3] || '', artist: artist + (row[1] ? ` (${row[1]})` : ''), hdPath: row[18] || '', streaming, licenseType };
      });
      transformedCsvRef.current = null;
      setCsvFile(file);
      setTableRows(parsed);
      setRowStatus(newStatus);
      setRowErrors({});
      setArtworkFiles([]);
      setCheckDone(false);
      setCheckHasErrors(false);
      setUploadDone(false);
      setImportResult(null);
      setUploadProgress({});
      setMessage({ severity: 'success', text: interpolate(s.msgFileLoaded, { filename: file.name, n: parsed.length }) });
    };
    reader.onerror = () =>
      setMessage({ severity: 'error', text: interpolate(s.msgReadError, { filename: file.name }) });
  }, []);

  // ── Artwork files handling ────────────────────────────────────────────────

  const handleArtworkFiles = useCallback((files) => {
    if (!csvFile) {
      setMessage({ severity: 'warning', text: s.msgNoCSV });
      return;
    }
    const newRowStatus = {};
    const toAdd = [];
    Array.from(files).forEach(file => {
      const name = file.name.normalize('NFC');
      let found = false;
      if (hdMap.current[name] !== undefined)    { newRowStatus[hdMap.current[name]]    = 'matched'; found = true; }
      if (sdMap.current[name] !== undefined)    { newRowStatus[sdMap.current[name]]    = 'matched'; found = true; }
      if (thumbMap.current[name] !== undefined) { newRowStatus[thumbMap.current[name]] = 'matched'; found = true; }
      if (found) toAdd.push(file);
    });
    if (toAdd.length === 0) {
      setMessage({ severity: 'warning', text: s.msgNoMatch });
      return;
    }
    setRowStatus(prev => ({ ...prev, ...newRowStatus }));
    setArtworkFiles(prev => {
      const existing = new Set(prev.map(f => f.name));
      return [...prev, ...toAdd.filter(f => !existing.has(f.name))];
    });
    setMessage({ severity: 'info', text: interpolate(s.msgFilesMatched, { n: toAdd.length }) });
  }, [csvFile]);

  // ── Check files ───────────────────────────────────────────────────────────

  const handleCheck = async () => {
    setChecking(true);
    setMessage(null);
    const fileToCheck = await transformCsvLicenseTypes(csvFile, LICENSE_TYPE_MAP);
    transformedCsvRef.current = fileToCheck;
    const result = await checkBatchFiles(fileToCheck, artworkFiles);
    setChecking(false);
    if (result.error) {
      setMessage({ severity: 'error', text: result.error });
      return;
    }
    const newStatus = {};
    const newErrors = {};
    let errorCount = 0;
    result.artworks.forEach((aw, i) => {
      if (aw.errors) {
        newStatus[i] = 'error';
        newErrors[i] = aw.errors.replace(/^\[|\]$/g, '');
        errorCount++;
      } else {
        newStatus[i] = 'ok';
      }
    });
    // Client-side license type validation
    tableRows.forEach((row, i) => {
      const lt = (row.licenseType || '').trim().toUpperCase();
      if (!lt && !isPremium) {
        if (newStatus[i] !== 'error') errorCount++;
        newStatus[i] = 'error';
        newErrors[i] = newErrors[i]
          ? `${newErrors[i]}; ${s.errLicenseRequired}`
          : s.errLicenseRequired;
        return;
      }
      if (!lt) return;
      let ltError = null;
      if (!(lt in LICENSE_TYPE_MAP)) {
        ltError = interpolate(s.errInvalidLicense, { lt: row.licenseType, valid: Object.keys(LICENSE_TYPE_MAP).join(', ') });
      } else if ((lt === 'COPYRIGHT' || lt === '-2') && !isPremium) {
        ltError = s.errCopyrightPremium;
      }
      if (ltError) {
        if (newStatus[i] !== 'error') errorCount++;
        newStatus[i] = 'error';
        newErrors[i] = newErrors[i] ? `${newErrors[i]}; ${ltError}` : ltError;
      }
    });

    setRowStatus(prev => ({ ...prev, ...newStatus }));
    setRowErrors(newErrors);
    setCheckDone(true);
    setCheckHasErrors(errorCount > 0);
  };

  // ── Upload artworks (sequential) ──────────────────────────────────────────

  const handleUpload = async () => {
    setUploading(true);
    setMessage(null);
    await saveBatchChoices(transformedCsvRef.current || csvFile, artworkFiles);

    const initial = {};
    artworkFiles.forEach(f => { initial[f.name] = { percent: 0, status: 'pending' }; });
    setUploadProgress(initial);

    // Upload one at a time - safer for large video files
    let quotaHit = false;
    for (const file of artworkFiles) {
      setUploadProgress(prev => ({ ...prev, [file.name]: { percent: 0, status: 'uploading' } }));
      const result = await uploadBatchArtwork(csvFile, file, (pct) => {
        setUploadProgress(prev => ({ ...prev, [file.name]: { percent: pct, status: 'uploading' } }));
      });
      setUploadProgress(prev => ({
        ...prev,
        [file.name]: {
          percent: result.success ? 100 : prev[file.name]?.percent ?? 0,
          status: result.success ? 'success' : 'error',
        },
      }));
      if (result.quota) {
        setMessage({ severity: 'error', text: s.errQuotaExceeded || 'Storage quota exceeded. Upgrade your plan to upload more files.' });
        quotaHit = true;
        break;
      }
    }
    setUploading(false);
    if (!quotaHit) setUploadDone(true);
  };

  // ── Import artworks ───────────────────────────────────────────────────────

  const handleImport = async () => {
    setImporting(true);
    setMessage(null);
    const result = await importBatchArtworks(transformedCsvRef.current || csvFile);
    setImporting(false);
    setImportResult(result);
  };

  // ── Derived values ────────────────────────────────────────────────────────

  const canCheck  = !!(csvFile && artworkFiles.length > 0 && !checking && !uploading && !checkDone);
  const canUpload = checkDone && !checkHasErrors && !uploading && !uploadDone;
  const canImport = uploadDone && !importing && !importResult;

  const overallPercent = artworkFiles.length > 0
    ? Math.round(Object.values(uploadProgress).reduce((s, p) => s + (p.percent || 0), 0) / artworkFiles.length)
    : 0;
  const uploadSuccessCount = Object.values(uploadProgress).filter(p => p.status === 'success').length;
  const uploadFailCount    = Object.values(uploadProgress).filter(p => p.status === 'error').length;

  // ── Render ────────────────────────────────────────────────────────────────

  if (!canAccess) {
    return (
      <ThemeProvider theme={theme}>
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Alert severity="warning" sx={{ maxWidth: 480, mx: 'auto' }}>
            {s.accountRestricted}
          </Alert>
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ maxWidth: 900, mx: 'auto', px: { xs: 2, sm: 3 }, py: 3 }}>

        <Typography variant="h6" align="center" sx={{ mb: 2, fontWeight: 700, letterSpacing: 1 }}>
          {s.pageTitle}
        </Typography>

        {/* ── Stepper ── */}
        <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 3 }}>
          {s.steps.map(label => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* AI preamble */}
        <AIPreamble s={s} />

        {/* Inline message */}
        {message && (
          <Alert severity={message.severity} sx={{ mb: 2 }} onClose={() => setMessage(null)}>
            {message.text}
          </Alert>
        )}

        {/* ── Step 1: TXT file ── */}
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
          {s.step1Title}
        </Typography>
        <Dropzone
          label={s.dropZone1Label}
          hint={s.dropZone1Hint}
          accept=".txt,.csv,text/*"
          multiple={false}
          onFiles={handleCSVFiles}
          dragActive={csvDrag}
          setDragActive={setCsvDrag}
          disabled={uploading || importing}
        />
        {csvFile && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
            <InsertDriveFileOutlinedIcon fontSize="small" color="primary" />
            <Typography variant="body2" color="primary">{csvFile.name}</Typography>
          </Box>
        )}

        {/* ── Table preview ── */}
        {tableRows.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              {tableRows.length === 1
                ? interpolate(s.tablePreview, { n: tableRows.length })
                : interpolate(s.tablePreviewPlural, { n: tableRows.length })}
            </Typography>
            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 300, overflow: 'auto' }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{s.colTitle}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{s.colAuthor}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{s.colHD}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{s.colStreaming}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{s.colLicense}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{s.colStatus}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tableRows.map((row, i) => {
                    const status = rowStatus[i] || 'default';
                    return (
                      <TableRow key={i} sx={{ bgcolor: ROW_COLORS[status] }}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell sx={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {row.title}
                        </TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.artist}</TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {getFilename(row.hdPath) || '—'}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                          {row.streaming === '0' || row.streaming === 'N' ? '🔒 No' : '▶ Yes'}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                          {row.licenseType || 'COPYRIGHT'}
                        </TableCell>
                        <TableCell>
                          {status === 'default' && <Chip label={s.statusWaiting}  size="small" />}
                          {status === 'matched' && <Chip label={s.statusMatched}  size="small" color="primary" />}
                          {status === 'ok'      && <Chip label="OK"       size="small" color="success" icon={<CheckCircleIcon />} />}
                          {status === 'error'   && (
                            <Tooltip title={rowErrors[i] || s.statusError}>
                              <Chip label={s.statusError} size="small" color="error" icon={<ErrorIcon />} />
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* ── Step 2: Artwork files ── */}
        {csvFile && !uploadDone && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              {s.step2Title}
            </Typography>
            <Dropzone
              label={s.dropZone2Label}
              hint={s.dropZone2Hint}
              accept="video/*,image/*"
              multiple
              onFiles={handleArtworkFiles}
              dragActive={artworkDrag}
              setDragActive={setArtworkDrag}
              disabled={uploading || importing || checkDone}
            />
            {artworkFiles.length > 0 && (
              <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {artworkFiles.map(f => (
                  <Chip key={f.name} label={f.name} size="small" variant="outlined" />
                ))}
              </Box>
            )}
          </Box>
        )}

        {/* ── Action buttons (always visible once CSV loaded) ── */}
        {csvFile && (
          <Box ref={actionRef} sx={{ mt: 4 }}>
            <Divider sx={{ mb: 2 }} />

            {/* Check - visible until check passes */}
            {!checkDone && (
              <Button
                fullWidth
                size="large"
                variant={canCheck ? 'contained' : 'outlined'}
                color="primary"
                onClick={handleCheck}
                disabled={!canCheck}
                startIcon={checking ? <HourglassEmptyIcon /> : null}
                sx={{ mb: 1 }}
              >
                {checking ? s.btnChecking : s.btnCheck}
              </Button>
            )}
            {checking && <LinearProgress sx={{ mb: 2, borderRadius: 2 }} />}

            {/* Upload - visible after check passes */}
            {checkDone && !checkHasErrors && !uploadDone && (
              <Button
                fullWidth
                size="large"
                variant={canUpload ? 'contained' : 'outlined'}
                color="primary"
                onClick={handleUpload}
                disabled={!canUpload}
                startIcon={uploading ? <HourglassEmptyIcon /> : null}
                sx={{ mb: 1 }}
              >
                {uploading
                  ? interpolate(s.btnUploading, { pct: overallPercent })
                  : artworkFiles.length === 1
                    ? interpolate(s.btnUpload, { n: artworkFiles.length })
                    : interpolate(s.btnUploadPlural, { n: artworkFiles.length })}
              </Button>
            )}

            {/* Import - visible after upload done */}
            {uploadDone && !importResult && (
              <Button
                fullWidth
                size="large"
                variant={canImport ? 'contained' : 'outlined'}
                color="success"
                onClick={handleImport}
                disabled={!canImport}
                startIcon={importing ? <HourglassEmptyIcon /> : null}
                sx={{ mb: 1 }}
              >
                {importing ? s.btnImporting : s.btnImport}
              </Button>
            )}
            {importing && <LinearProgress color="success" sx={{ mb: 2, borderRadius: 2 }} />}

            <Divider sx={{ mt: 1 }} />
          </Box>
        )}

        {/* ── Upload progress ── */}
        {Object.keys(uploadProgress).length > 0 && (
          <Box ref={progressRef} sx={{ mt: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2">
                {s.uploadProgressTitle}
              </Typography>
              {uploadDone && (
                <Typography variant="caption" color={uploadFailCount > 0 ? 'error' : 'success.main'}>
                  {interpolate(s.uploadSucceeded, { ok: uploadSuccessCount, total: artworkFiles.length })}
                  {uploadFailCount > 0 && interpolate(s.uploadFailed, { n: uploadFailCount })}
                </Typography>
              )}
            </Box>

            {/* Overall bar */}
            <LinearProgress
              variant="determinate"
              value={overallPercent}
              color={uploadFailCount > 0 ? 'error' : uploadDone ? 'success' : 'primary'}
              sx={{ height: 10, borderRadius: 5, mb: 2 }}
            />

            {/* Per-file bars */}
            <Stack spacing={1.5}>
              {artworkFiles.map(f => {
                const prog = uploadProgress[f.name];
                if (!prog) return null;
                const isDone  = prog.status === 'success';
                const isError = prog.status === 'error';
                const isPending = prog.status === 'pending';
                return (
                  <Box key={f.name}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{f.name}</Typography>
                      <Typography variant="caption" color={isError ? 'error' : isDone ? 'success.main' : 'text.secondary'}>
                        {isError ? s.fileStatusFailed : isDone ? s.fileStatusDone : isPending ? s.fileStatusWaiting : `${prog.percent}%`}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant={isPending ? 'buffer' : 'determinate'}
                      value={isPending ? 0 : prog.percent}
                      valueBuffer={0}
                      color={isError ? 'error' : isDone ? 'success' : 'primary'}
                      sx={{ height: 5, borderRadius: 3 }}
                    />
                  </Box>
                );
              })}
            </Stack>
          </Box>
        )}

        {/* ── Import result ── */}
        {importResult && (
          <Box sx={{ mt: 3 }}>
            {importResult.success ? (
              <Alert severity="success" icon={<CheckCircleIcon />} sx={{ fontSize: '1rem' }}>
                {s.importSuccess}
              </Alert>
            ) : (
              <Box>
                <Alert severity="error" sx={{ mb: 1 }}>
                  {s.importPartialError}
                </Alert>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>{s.errColLine}</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{s.errColArtwork}</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{s.errColAuthor}</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{s.errColError}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {importResult.errors.map((err, i) => (
                        <TableRow key={i} sx={{ bgcolor: ROW_COLORS.error }}>
                          <TableCell>{err.line || '—'}</TableCell>
                          <TableCell>{err.artwork || '—'}</TableCell>
                          <TableCell>{[err.firstname, err.lastname].filter(Boolean).join(' ') || '—'}</TableCell>
                          <TableCell>{err.quota ? (s.errQuotaExceeded || 'Storage quota exceeded. Upgrade your plan to upload more files.') : err.error}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {/* Reset button */}
            <Button
              fullWidth
              size="large"
              variant="outlined"
              startIcon={<ReplayIcon />}
              onClick={handleReset}
              sx={{ mt: 3 }}
            >
              {s.btnRestart}
            </Button>
          </Box>
        )}

      </Box>

      {/* ── Snackbar notification ── */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <MuiAlert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          variant="filled"
          elevation={6}
          sx={{ width: '100%' }}
        >
          {snackbar.text}
        </MuiAlert>
      </Snackbar>

    </ThemeProvider>
  );
}

export default BatchUpload;
