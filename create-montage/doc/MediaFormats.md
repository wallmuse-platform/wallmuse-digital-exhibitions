# Media Formats

Supported file formats for content uploaded to WallMuse via CreateMontage.

---

## Video

| Format | Container | Codec | Notes |
|---|---|---|---|
| HD / 4K | MP4 | H.264 baseline | Primary upload format; encrypted server-side |
| SD | MP4 | H.264 baseline | Auto-generated from HD if not provided (722×406, CMO-compliant) |
| Streaming | MP4 | H.264 baseline | Browser native streaming; no client-side fragmentation required |

**SD resolution**: 722×406 px (width + height = 1128 px, below the 1200 px limit set by ADAGP/SABAM and other Copyright Management Organisations for preview display).

### What is not supported

- FLV — obsolete; no modern browser support
- WMV, AVI, MOV — transcode to MP4 before upload
- HEVC/H.265 — not yet supported for upload (used internally for high-efficiency storage)

---

## Images

| Format | Notes |
|---|---|
| JPEG | Recommended for photographs and artworks |
| PNG | Supported; larger file size |
| WebP | Supported |

---

## Audio

| Format | Notes |
|---|---|
| MP3 | Recommended |
| AAC (M4A) | Supported |
| WAV | Supported; large file size |

Audio is used for the `AUD` track type (soundscape, narration). Audio-only items play without a visual layer unless combined with an image or video on another track.

---

## Thumbnail

Auto-generated from the HD video or image if not provided. Can be supplied as JPEG or WebP (722×406 px recommended).

---

## Planned

| Type | Format | Notes |
|---|---|---|
| P5JS | `.js` + assets (ZIP) | Generative / interactive sketch; rendered in sandboxed iframe by the webplayer |
| 360° photo | JPEG equirectangular | `PHOTO_360`, `PHOTO_180` — pending SphericalZoomAndPan implementation |
| 360° video | MP4 equirectangular | `VIDEO_360`, `VIDEO_180` — pending SphericalZoomAndPan implementation |
