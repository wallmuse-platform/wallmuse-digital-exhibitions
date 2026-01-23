# Add Content Feature Documentation

## Overview

The **Add Content** feature is part of the **Add Contents** section in CreateMontage V4. This section allows users to:
- Add new artwork/content to the platform
- Modify existing content
- List and search existing contents

The Add Contents section has two main views:
- **List Contents** (left panel) - Browse, search, and manage existing artworks
- **Add Content** (right panel) - Form for adding or modifying artwork metadata

> **Note**: On desktop, both panels are displayed side-by-side with a draggable divider. On mobile devices, toggle buttons allow switching between "List Contents" and "Add Content" views.

---

## File Structure

```
src/add/
├── components/
│   ├── AddContent.js              # Main form component (1525 lines)
│   ├── AddContentController.js    # API calls and business logic (585 lines)
│   ├── Contents.js                # List/display component (336 lines)
│   ├── Credits.js                 # Credits form component (265 lines)
│   ├── useCopyrightOwner.js       # Custom hook for copyright owner logic (127 lines)
│   ├── CopyrightOwnerSelector.js  # Dialog for selecting copyright owners (158 lines)
│   ├── KeywordInput.js            # Keyword input with tags (58 lines)
│   ├── AuthorCheck.js             # Author check/validation (77 lines)
│   ├── CustomCheckbox.js          # Custom checkbox wrapper
│   ├── RequiredFieldIndicator.js  # Required field marker
│   ├── LoadingSpinner.js          # Loading indicator
│   └── ChunkUpload.js             # Chunked file upload handling
├── flexboxes/
│   └── FlexBoxes.js               # Flex layout container (244 lines)
├── searcharea/
│   ├── ContentsSearchArea.js      # Search UI for contents
│   └── ContentsSearch.js          # Search logic
└── upload/
    └── ChunkedUpload.js           # Large file upload handling
```

---

## Component Hierarchy

```
FlexBoxes (Layout Container)
├── Contents (List View - Left Panel)
│   ├── ContentsSearchArea
│   │   ├── Search input
│   │   ├── Search type chips (Title, Keywords, Author)
│   │   ├── Categories filter
│   │   └── Sort options (Alphabetical, Newest)
│   └── Artwork Cards
│       ├── Thumbnail
│       ├── Title, Author, Datation
│       ├── Keywords
│       └── DELETE / MODIFY buttons
│
└── AddContent (Form View - Right Panel)
    ├── Main Section
    │   ├── Title* (required)
    │   └── Author* (required, with copyright owner search)
    ├── Descriptions Section
    │   ├── Description language selector
    │   ├── Description text area
    │   └── Datation* (required, format: YYYY or YYYY-YYYY)
    ├── Classification Section
    │   ├── Categories* (required, at least one)
    │   └── Keywords (optional tags)
    ├── Media Section
    │   ├── HD/4K Version* (required - file upload or URL)
    │   ├── SD Version (optional, auto-generated if not provided)
    │   └── Thumbnail (optional, auto-generated if not provided)
    ├── Rights Section*
    │   ├── Rights selector (Copyright, Creative Commons, etc.)
    │   ├── Countries selector
    │   └── Permission checkboxes (Streaming, Splittable, Croppable, Deconstructable)
    └── Credits Section
        ├── Name input
        ├── Type selector (Author, Location, Owner, Photographer, Representation)
        └── Location/Countries selector
```

---

## Main Components

### 1. FlexBoxes.js (Layout Container)

**Purpose**: Main layout component managing the side-by-side or stacked view of Contents and AddContent panels.

**Key Features**:
- Desktop: Draggable divider between panels
- Mobile: Toggle buttons to switch views
- Persists panel widths and view state in localStorage

**State Variables**:
| Variable | Type | Description |
|----------|------|-------------|
| `view` | string | Current view: "contents" or "addContent" |
| `selectedContent` | object | Selected artwork for editing |
| `contentsWidth` | number | Width of Contents panel (desktop) |
| `selectedAuthor` | object | Currently selected author filter |

---

### 2. Contents.js (List View)

**Purpose**: Display and manage the list of existing artworks with search, filter, and pagination.

**Key Features**:
- Search by Title, Keywords, or Author
- Filter by Categories
- Sort by Alphabetical or Creation Date (Newest)
- Pagination controls
- Edit and Delete actions per artwork

**State Variables**:
| Variable | Type | Description |
|----------|------|-------------|
| `artworks` | array | Array of artwork objects |
| `searchTerm` | string | Current search query |
| `searchCategories` | array | Selected category filters |
| `selectedChip` | number | Search type: 1=Title, 2=Keywords, 3=Author |
| `sortingOption` | string | "alphabetical" or "cdate" |
| `page` / `rowsPerPage` | number | Pagination state |

**Key Functions**:
- `handleDeleteArtwork(artworkId)` - Delete an artwork
- `handleModifyContent(artworkId)` - Load artwork for editing
- `refreshArtworksList()` - Refresh search results

---

### 3. AddContent.js (Main Form)

**Purpose**: Primary form component for adding new or modifying existing artwork content.

**Modes**:
- **CREATE**: Empty form for new artwork (no `contentId`)
- **MODIFY**: Pre-filled form for editing (has `contentId` from `selectedContent`)

#### Form Sections

##### Main Section
| Field | Required | Description |
|-------|----------|-------------|
| Title | Yes | Artwork title |
| Author | Yes | Artist name (triggers copyright owner search) |

##### Descriptions Section
| Field | Required | Description |
|-------|----------|-------------|
| Description Language | No | Language for the description |
| Description | No | Up to 1000 characters |
| Datation | Yes | Year (YYYY) or year range (YYYY-YYYY) |
| Hide | No | Hide datation from display |
| Approximate | No | Mark datation as approximate |

##### Classification Section
| Field | Required | Description |
|-------|----------|-------------|
| Categories | Yes | At least one category required |
| Keywords | No | Tags for organizing content |

> **Note on Categories**: Categories vary by platform:
> - wallmuse.com / sharex.wallmuse.com: Most arts and culture
> - ooo2.wallmuse.com: Opera-specific categories

##### Media Section
| Field | Required | Description |
|-------|----------|-------------|
| HD/4K Version | Yes | High definition file (encrypted, protected) |
| SD Version | No | Standard definition (auto-generated if not provided) |
| Thumbnail | No | Preview image (auto-generated if not provided) |

**Media Format Notes**:
- **HD/4K**: Encrypted and locked to prevent copying
- **SD**: Optional, can be displayed freely on the internet
- **Thumbnail**: Preview image for listings
- SD and Thumbnail are auto-generated from HD if not explicitly provided

##### Rights Section
| Field | Required | Description |
|-------|----------|-------------|
| Rights | Yes | Copyright type (see Rights Table below) |
| Countries | No | Geographic restrictions (default: All Countries) |
| Streaming | No | Allow streaming playback |
| Splittable | No | Allow for video walls |
| Croppable | No | Allow cropping for full-screen display |
| Deconstructable | No | Allow for custom screens (e.g., diagonal bars) |

**Permission Flags Explained**:
- **Streaming**: If unchecked, content is desktop-only with encryption
- **Splittable**: For video wall installations
- **Croppable**: For full-screen without empty areas
- **Deconstructable**: For creative screen layouts (e.g., see-through diagonal bars)

##### Credits Section
| Credit Type | Code | Description |
|-------------|------|-------------|
| Author/Rights Holder | AUT | May include artist foundations with moral rights |
| Location | LOC | Place/location of the artwork |
| Artwork Owner | OWN | Owner without broadcasting rights (except within premises) |
| Photographer | PHO | Photo credits (rarely have separate rights) |
| Representation Rights | REP | Organizations like ADAGP, DACS, VEGAP, etc. |

> **Credits Location**: Can be set for all countries or specific countries.

---

### 4. AddContentController.js (Business Logic)

**Purpose**: Handles API calls, file uploads, and data validation.

**Key Functions**:

| Function | Description |
|----------|-------------|
| `convertDatationText(text)` | Converts "YYYY" or "YYYY-YYYY" to start/end dates |
| `handleUpload(contentData, contentId, files, onProgress, t)` | Main upload orchestration |
| `saveInitialArtwork(contentData)` | Creates/updates artwork via API |
| `uploadAdditionalFiles(file, kind, artworkId, onProgress, t)` | Uploads individual media files |
| `validateContentData(contentData)` | Validates required fields |
| `isValidDatation(text)` | Validates datation format |

**Upload Flow**:

```
For NEW Content:
1. Create temp artwork → get artwork ID
2. Upload HD file → get S3 URL
3. Update artwork with HD URL
4. Upload SD (if provided)
5. Upload Thumbnail (if provided)

For EXISTING Content:
1. Update metadata first
2. Upload new files only if changed
```

---

### 5. Credits.js (Credits Management)

**Purpose**: Manage artwork credits with different types and locations.

**Credit Types**:
| Type | Code | Notes |
|------|------|-------|
| Author/Rights Holder | AUT | Requires copyright owner selection |
| Location | LOC | Place of the artwork |
| Artwork Owner | OWN | No broadcasting rights |
| Photographer | PHO | Photo credits |
| Representation Rights | REP | ADAGP, DACS, etc. |

**Representation Rights Organizations**:
- ADAGP (FR), BILDKUNST (DE), COPY-DAN (DK), DACS (UK)
- SIAE (IT), SPA (PT), VAGA (US), VEGAP (ES), and others

---

### 6. useCopyrightOwner.js (Custom Hook)

**Purpose**: Manage copyright owner search and selection logic.

**Search Flow**:
1. User types author name
2. Debounced search (500ms) triggers API call
3. If exact match → auto-select
4. If multiple matches → show selection dialog
5. If no matches → flag as new author (ID = "-1")

---

## Rights Reference

| Name | Acronym | Description |
|------|---------|-------------|
| Copyright | CR | Specific to States; may include moral rights for internet use |
| Copyleft | CL | Others may freely copy, distribute, and transform without permission |
| CC BY | CC BY | Attribution required; derivatives and commercial use allowed |
| CC BY-ND | CC BY-ND | Attribution required; no derivatives allowed |
| CC BY-NC-SA | CC BY-NC-SA | Attribution required; non-commercial; share-alike |
| CC BY-SA | CC BY-SA | Attribution required; share-alike |
| CC BY-NC | CC BY-NC | Attribution required; non-commercial only |
| CC BY-NC-ND | CC BY-NC-ND | Attribution required; non-commercial; no derivatives |

**Re-usage Rules**:
- **Copyright** and **CC BY-ND/CC BY-NC-ND**: Cannot be reused for creating Montages
- **Other licenses**: Available to other users for creating Montages

---

## Data Flow

```
User Input → AddContent.js
              ↓
         Validation (validateFields)
              ↓
         Build contentData object
              ↓
         AddContentController.handleUpload()
              ↓
    ┌─────────┴─────────┐
    ↓                   ↓
saveInitialArtwork  uploadAdditionalFiles
(XML to API)        (Files to S3)
    ↓                   ↓
    └─────────┬─────────┘
              ↓
         Success/Error feedback
              ↓
         Refresh Contents list
```

---

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/set_artwork_full` | POST | Create/update artwork metadata |
| `/upload_file` | POST | Upload media files |
| `/search_artworks` | GET | Search artworks list |
| `/get_artwork` | GET | Get single artwork details |
| `/delete_artwork` | DELETE | Delete artwork |
| `/search_copyright_owner` | GET | Search copyright owners |

---

## Validation Rules

| Field | Rule |
|-------|------|
| Title | Required, non-empty |
| Author | Required, non-empty |
| Datation | Required, format: YYYY or YYYY-YYYY |
| Categories | At least 1 required |
| HD Media | File upload OR URL required |
| Rights | At least 1 copyright right required |

---

## State Management Summary

### AddContent.js Key State Groups

1. **Identification**: `contentId`, `selectedContent`
2. **Title & Author**: `titleRef`, `author`, `selectedOwnerId`
3. **Descriptions**: `descriptions[]`, language, text
4. **Datation**: `datationTextRef`, hidden flag, approximate flag
5. **Classification**: `categoriesRef[]`, `keywordsRef[]`
6. **Media**: `selectedFiles{}`, `hdPath`, `sdPath`, `thumbnailPath`
7. **Rights**: `rights[]`, permission checkboxes
8. **Credits**: `credits[]`, type, location
9. **Validation**: field validity flags, error messages
10. **UI State**: loading, progress, success/error feedback

---

## Notes for Developers

1. **Ref + State Pattern**: Many fields use both a ref (for truth) and state (for UI updates), e.g., `titleRef` + `titleValue`

2. **Copyright Owner Search**: The author field triggers an automatic search for existing copyright owners to avoid duplicates

3. **File Upload Progress**: Track upload progress via `uploadProgress` state object with `{phase, progress, message}`

4. **Responsive Design**: Uses Material-UI breakpoints; mobile view has toggle buttons instead of side-by-side panels

5. **Internationalization**: Uses react-i18next for translations; descriptions support multiple languages

6. **After Submission**: Form retains previous details unless page is refreshed, allowing efficient batch uploads

---

## Related Documentation

- [Media Formats](./MediaFormats.md) - Supported image and audio/video formats
- [API Reference](./API.md) - Full API documentation
- [User Guide](./UserGuide.md) - End-user documentation
