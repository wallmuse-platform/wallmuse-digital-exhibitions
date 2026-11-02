# Batch Upload

Batch Upload lets editors import a collection of artworks (video, image, audio) in one operation — a metadata spreadsheet plus the content files — rather than adding them one by one through Add Content.

**Access:** Available to logged-in editors and administrators. Free accounts cannot use this feature.

---

## Overview

The upload follows a fixed five-step sequence shown in the progress stepper at the top of the page:

1. **Metadata file** — drop the UTF-16 `.txt` spreadsheet
2. **Content files** — drop the corresponding media files
3. **Check** — server validates metadata and file matching
4. **Upload** — media files are transferred one at a time
5. **Import** — metadata is written to the database; contents become visible

---

## Step 1 — Prepare the metadata spreadsheet

Download the Excel template from the link in the **AI-Assisted Template Guide** accordion (collapsible panel at the top of the page). The template has one row per artwork, with these columns in order:

| # | Column | Required | Notes |
|---|--------|----------|-------|
| 1 | Author first name | — | |
| 2 | Author nickname | — | |
| 3 | Author surname | — | |
| 4 | Content title | Yes | |
| 5 | Year | Yes | YYYY or YYYY-YYYY |
| 6 | Description EN | — | |
| 7 | Description FR | — | |
| 8 | Description Other | — | |
| 9 | Other Language | — | |
| 10 | Category 1 | Yes (at least one) | |
| 11 | Category 2 | — | |
| 12 | Category 3 | — | |
| 13 | Categories | — | |
| 14 | Country | — | |
| 15 | Rights Representation Acronym | — | CMO acronym, e.g. ADAGP, DACS |
| 16 | Rights Holder | — | If no CMO: author's full name |
| 17 | Place | — | |
| 18 | Credits | — | |
| 19 | Path content (HD) | — | Filename of the HD media file |
| 20 | Path trailer (TR) | — | |
| 21 | Path Image | — | Filename of the thumbnail image |
| 22 | Keywords | — | |
| 23 | Streaming | — | `1` = web player (default); `0` = standalone player only |
| 24 | License Type | — | See license table below |

**Save format:** In Excel, use **Save As → Unicode Text (.txt)**. The file must be UTF-16 LE with a BOM; standard UTF-8 exports are not accepted.

### License Type values

Enter either the label or the numeric ID:

| Label | ID | Description |
|---|---|---|
| FREE | -1 | No restrictions |
| COPYRIGHT | -2 | All rights reserved (Premium accounts only) |
| COPYLEFT | -3 | |
| CC_BY | -4 | |
| CC_BY_SA | -5 | |
| CC_BY_ND | -6 | |
| CC_BY_NC | -7 | |
| CC_BY_NC_SA | -8 | |
| CC_BY_NC_ND | -9 | |
| OTHER | -10 | |
| NO_ACCESS | -11 | |
| CC0 | -12 | |

Free accounts must supply a License Type; the server defaults to Copyright if the field is left blank.

### AI-assisted filling

The Template Guide accordion includes a prompt you can copy into any AI assistant (ChatGPT, Claude, etc.). Fill in the placeholders (author name, year, category, CMO, filenames) and use the result to populate the spreadsheet before exporting.

### File naming

- Use hyphens or underscores instead of spaces.
- The filename in the spreadsheet (columns 19/21) must match the actual file name exactly (accents supported).

---

## Step 2 — Drop the metadata file

Drag and drop the `.txt` file onto the first drop zone, or click it to browse. The page reads the file and shows a preview table with one row per artwork: Title, Author, HD filename, Streaming flag, License type, and Status.

Each row starts in **Waiting** state. Drop the spreadsheet again at any time to reload it and reset the session.

---

## Step 3 — Drop content files

Drag and drop all media files onto the second drop zone. The page matches each file to a row in the spreadsheet by filename:

- A matched row turns **blue** and shows "Matched".
- Unrecognised files (not listed in the spreadsheet) are silently ignored.
- You can drop files in multiple batches; duplicates are deduplicated automatically.

Accepted formats: MP4, JPG, PNG, WebP, and other image/video types. See [Media Formats](./MediaFormats.md) for upload specifications.

---

## Step 4 — Check files

Click **Check Files**. The page sends the spreadsheet and file list to the server, which verifies:

- Column completeness and format
- License type validity (also validated client-side before upload)

Rows with errors turn **red**. Hovering the error chip shows the specific error message. Correct the spreadsheet and restart the session (drop the file again) to fix errors. Once all rows are green (OK), a notification confirms validation.

---

## Step 5 — Upload and import

**Upload** transfers files to storage sequentially, one at a time. Each file has its own progress bar; an overall bar shows combined progress. If storage quota is exceeded, the upload stops and an error is displayed — upgrade your account plan to continue.

Once all files are uploaded, click **Import Contents**. The server writes artwork metadata to the database. On success, all contents become visible in **Add Content → List Contents** and **Curate → Contents**.

If any rows fail during import, an error table lists the line number, content title, author, and error reason. Successfully imported contents are saved even when some rows fail.

Click **Upload Another Batch** to reset and start a new session.

---

## Related Documentation

- [Add Content](./AddContent.md) — Single-artwork upload and editing
- [Media Formats](./MediaFormats.md) — Supported video, image, and audio formats
- [Montage Wizard](./MontageWizard.md) — Guided exhibition builder
