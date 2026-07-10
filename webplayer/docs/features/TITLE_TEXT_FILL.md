# Title Element Text Fill

## Current State (Temporary)

The server sends title-only track elements with text shapes that contain layout information (position, size, font, color) but **no `text` content**. As a temporary measure, the webplayer client fills empty text shapes from available montage/artwork data:

- **Shape 1**: artwork title of the referenced artwork (see fill direction below)
- **Shape 2**: montage author

Missing fields (not yet available client-side): `datation` (year), `credits`.

Code location: `src/manager/Sequencer.ts`, inside the `showMedia` title-only block.

### Fill direction — next_count / previous_count

New-format title items (`tag_name: "title"`) carry two fields set in the admin UI:

| Field | Value | Meaning |
|-------|-------|---------|
| `next_count` | 1 (default) | Look **forward** — title previews the artwork N positions ahead |
| `next_count` | 0 | Look **backward** — title references the artwork that just played |
| `previous_count` | N | Backward offset when `next_count = 0` |

Old-format title items (`tag_name: "item"`, no artwork_id) do not carry these fields; the client defaults to `next_count = 1` (forward preview).

Example: a title at track index 3 with `next_count: 1` fills from the artwork at index 4.

## Option A: Server-Side Text Fill (Target)

The server should populate the `text` field in each text shape before sending via WebSocket. This is the clean solution — the client simply renders what it receives.

### What the server currently sends

```json
{
  "texts": [
    { "tag_name": "text", "x": 960, "y": 300, "width": 800, "height": 100, "size": 48, "color": "FFFFFF", "font": "SansSerif", "halign": "center", "valign": "center" },
    { "tag_name": "text", "x": 960, "y": 500, "width": 800, "height": 80, "size": 36, "color": "CCCCCC", "font": "SansSerif", "halign": "center", "valign": "center" }
  ]
}
```

### What the server should send (Option A)

Each text shape includes a `text` field filled from the database:

```json
{
  "texts": [
    { "tag_name": "text", "text": "Forêt bleue", "x": 960, "y": 300, "width": 800, "height": 100, "size": 48, "color": "FFFFFF", "font": "SansSerif", "halign": "center", "valign": "center" },
    { "tag_name": "text", "text": "Christian Zimmermann", "x": 960, "y": 500, "width": 800, "height": 80, "size": 36, "color": "CCCCCC", "font": "SansSerif", "halign": "center", "valign": "center" },
    { "tag_name": "text", "text": "2019", "x": 960, "y": 620, "width": 800, "height": 60, "size": 28, "color": "999999", "font": "SansSerif", "halign": "center", "valign": "center" },
    { "tag_name": "text", "text": "Photo: J. Dupont", "x": 960, "y": 720, "width": 800, "height": 60, "size": 24, "color": "999999", "font": "SansSerif", "halign": "center", "valign": "center" }
  ]
}
```

### Server-side implementation

The title tool already knows which fields to display (title, author, datation, credits). When building the WebSocket montage payload, the server needs to:

1. For each title track element, query `wmm_track_element_title` to get the title configuration
2. Resolve the text content for each text shape from the associated artwork/montage data:
   - **Title**: from the artwork referenced by the next track element (`wmm_artwork.title`)
   - **Author**: from the montage (`wmm_montage.author`) or artwork author
   - **Datation**: from the artwork (`wmm_artwork.datation`) — year or year range
   - **Credits**: from the artwork (`wmm_artwork.credits`) — photographer/source
3. Set the `text` field on each text shape before serializing to JSON

### Once Option A is implemented

Remove the temporary client-side fill block in `Sequencer.ts` (marked with `TEMPORARY` comment). The client will simply render the text shapes as-is since they already contain text content.
