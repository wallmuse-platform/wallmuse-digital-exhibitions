# Montage Wizard

The Montage Wizard (Curation Wizard) is a guided tool for building a WallMuse montage from your existing content library. It lets you filter artworks by author, category, or keyword, set distribution and ordering options, preview the result, and save the montage in one step — without manually assembling tracks in the Curator.

---

## Overview

The wizard has four stages in sequence:

1. **Filter** — select which artworks to include
2. **Options** — set track count, order, exhibition name, and copyright
3. **Preview** — review the per-track distribution before saving
4. **Save** — write the montage to the database and redirect to the Curator

---

## Loading artworks

On open, the wizard fetches the full content library (up to 500 artworks, or the account total if lower). All subsequent filtering is instant, client-side — no further network requests are made when changing filters.

---

## Stage 1 — Filter: Contents Selection

Three filters appear side by side. They can be combined freely; the artwork count chip updates in real time.

### Authors

A multi-select dropdown populated from the artworks in the library. Authors are deduplicated by name — if the same artist appears under multiple database records, they appear as one option. Selecting one or more authors restricts results to artworks linked to those authors.

### Categories

A multi-select dropdown sourced from the platform category list. Selecting one or more categories restricts results to artworks tagged with at least one of the selected categories.

> **Note:** Categories vary by platform environment (wallmuse.com, ooo2.wallmuse.com, etc.). See [Add Content](./AddContent.md) for details.

### Keywords

A free-text field. The filter matches against each artwork's keyword tags and title (case-insensitive, substring match).

---

## Stage 2 — Options

### Exhibition name

A short name used as the montage's display name (e.g. `Zimmermann_2023`). This field is required before saving. Each track is saved as a sequence within the montage under this name.

### Tracks

Number of tracks to distribute artworks across, from 1 to 9. Artworks are distributed round-robin: artwork 1 → track 1, artwork 2 → track 2, …, artwork N+1 → track 1 again. If the filtered artwork count is less than the track count, the Preview button is disabled.

### Order

Controls the sort order applied before distribution:

| Option | Description |
|--------|-------------|
| Default | Original database order |
| By Author | Alphabetical by author display name |
| By Datation | Chronological by datation end year (or start year if no end) |
| By Title | Alphabetical by display title |

### Copyright

The copyright type applied to the montage. Defaults to Copyright. Options match the rights values available in Add Content.

---

## Stage 3 — Preview Distribution

Click **Preview Distribution** to generate the track layout. The preview shows one collapsible accordion panel per track, each listing the artworks assigned to it with thumbnail, title, author, and datation.

Changing any filter or option collapses and clears the preview. Click Preview Distribution again after adjusting settings.

> **Track duration alignment:** If the track durations differ by more than 1 second after save, a warning is shown. Uneven track lengths cause the shorter tracks to loop or leave gaps in a multi-screen installation. To align tracks, adjust the artwork selection or split into more tracks.

---

## Stage 4 — Save

Once the exhibition name is set and the preview is visible, click **Save Exhibition**. The wizard:

1. Sorts artworks by the chosen order
2. Distributes them round-robin across the requested number of tracks
3. Sends the montage to the backend (name, copyright, one sequence per non-empty track, each item with `artwork_id`, `offset = 0`, `duration` from the artwork's metadata, `repeat = 1`)
4. On success, calls `onSaveSuccess` with the new montage ID — this redirects to the Curator where the montage can be further edited

If the exhibition name field is empty, the Save button is disabled and a warning appears.

---

## After saving

The created montage appears in the Curator's montage list. Track items use their artwork's default duration; you can adjust timing, add tools (ZoomAndPan, Alpha Channel, Title), and reorder items there.

---

## Related Documentation

- [Add Content](./AddContent.md) — Add or modify individual artworks
- [Batch Upload](./BatchUpload.md) — Import multiple artworks at once
- [CreateMontage Tools](./TOOLS.md) — ZoomAndPan, Alpha Channel, SpaceImage, Title
