# CreateMontage Development Rules

## 1. Overview

The CreateMontage App is a React-based application with two main sections:
- **Curate (Create Montage)** - Grid-based montage creation interface
- **Add Contents** - Content/artwork management (added later, shares modules with Curate)

---

## 2. Architecture

### 2.1 Context Provider Hierarchy

```
App.js
└── ThemeProvider
    └── SessionContext.Provider (sessionId)
        └── UserContext.Provider ({ isDemo, isPremium })
            ├── TabButtons (section switcher)
            └── ComponentToRender
                ├── BasicGrid (Curate section)
                └── AddContents (Add Contents section)
```

### 2.2 Account Types

| Type | Detection | isPremium | Notes |
|------|-----------|-----------|-------|
| **Demo** | sessionId contains 'free' or 'unregistered' | `false` | Entry accounts for newcomers |
| **Guest** | sessionId starts with 'guest' | `false` | Temporary, stored locally, no login |
| **Login (CLI)** | API `type === "CLI"` | `false` | Free registered accounts |
| **Login (PAY)** | API `type === "PAY"` | `true` | Premium registered accounts |

### 2.3 Data Flow

```
SessionContext (sessionId)
└── UserContext ({ isDemo, isPremium })
    ├── Curate: Grid → Details → Rights/Descriptions/Categories
    └── Add Contents: FlexBoxes → AddContent → Rights/Descriptions/Categories
```

---

## 3. File Structure

```
src/
├── App.js                    # Entry point, context providers
├── api.js                    # Centralized API client
├── context/
│   └── UserContext.js        # UserContext + SessionContext
├── utils/
│   └── Utils.js              # getUserId, isDemoAccount, getUserProfile, etc.
│
├── components/               # SHARED + CURATE COMPONENTS
│   ├── details/
│   │   ├── Rights.js         # ⭐ Shared - Rights management
│   │   ├── Descriptions.js   # ⭐ Shared - Multi-language descriptions
│   │   ├── useCountries.js   # ⭐ Shared - Country data hook
│   │   └── Details.js        # Curate only - Details panel
│   ├── categories/
│   │   └── Categories.js     # ⭐ Shared - Category picker
│   ├── grid/
│   │   └── Grid.js           # Curate main component (BasicGrid)
│   └── searchArea/
│       └── SearchArea.js     # Curate search UI
│
└── add/                      # ADD CONTENTS SECTION
    ├── AddContents.js        # Entry wrapper
    ├── flexboxes/
    │   └── FlexBoxes.js      # Layout: Contents | AddContent
    ├── components/
    │   ├── AddContent.js     # Main form component
    │   ├── Contents.js       # Artwork list/search
    │   ├── Credits.js        # Credits management
    │   ├── KeywordInput.js   # Keyword tags
    │   └── AddContentController.js  # Business logic
    └── searcharea/
        └── ContentsSearchArea.js    # Search UI
```

---

## 4. Shared Components

### 4.1 Rights.js
**Location:** `/src/components/details/Rights.js`
**Used in:** Curate (Details.js), Add Contents (AddContent.js)

```javascript
<Rights
  rights={rights}
  setRights={setRights}
  currentRight={currentRight}
  setCurrentRight={setCurrentRight}
  currentRightCountry={currentRightCountry}
  setCurrentRightCountry={setCurrentRightCountry}
  isPremium={isPremium}  // Controls Copyright option availability
/>
```

**Rights Values:**
| Value | Right |
|-------|-------|
| `-11` | No access |
| `-1` | Free |
| `-2` | Copyright (Premium only) |
| `-3` | Copyleft |
| `-4` to `-9` | Creative Commons variants |
| `-10` | Other |

### 4.2 Descriptions.js
**Location:** `/src/components/details/Descriptions.js`
**Used in:** Curate (Details.js), Add Contents (AddContent.js)

### 4.3 Categories.js
**Location:** `/src/components/categories/Categories.js`
**Used in:** Curate (Details.js), Add Contents (AddContent.js), Search areas

### 4.4 useCountries.js
**Location:** `/src/components/details/useCountries.js`
**Used in:** Rights.js, Credits.js

---

## 5. Context Usage

### 5.1 SessionContext (ancestor)
```javascript
import { useSession } from '../../context/UserContext';

const sessionId = useSession();
// Or via Utils:
import { getUserId } from '../../utils/Utils';
const sessionId = getUserId();
```

### 5.2 UserContext (child of SessionContext)
```javascript
import { useUserContext } from '../../context/UserContext';

const { isDemo, isPremium } = useUserContext();
```

---

## 6. Key Data Structures

### Rights
```javascript
{
  type: "-6",           // Right type value
  direction: "A",       // Always "A"
  country: "US"         // Or undefined for ALL countries
}
```

### Descriptions
```javascript
{
  language: "eng",      // ISO 639-1 code
  description: "Text",  // Content (line breaks as <br>)
  name: "Default"       // Identifier
}
```

### Credits (Add Contents only)
```javascript
{
  name: "John Doe",
  type: "AUT",          // AUT|LOC|OWN|PHO|REP
  location: "ALL",      // Country or "ALL"
  owner_id: "123"       // Only for AUT type
}
```

---

## 7. Premium Feature Gating

**Copyright** right is restricted to Premium accounts:

1. `App.js` fetches `isPremium` via `getUserProfile(sessionId)`
2. Passed through `UserContext.Provider`
3. Components access via `useUserContext()`
4. `Rights.js` disables Copyright option when `isPremium === false`

---

## 8. API Endpoints

**Shared:**
- `getCategories()` - Category list
- `searchArtworks()` - Artwork search

**Add Contents:**
- `searchCopyrightOwner()` - Author lookup
- `getArtworkById()` - Single artwork details
- `deleteArtwork()` - Remove artwork
- `set_artwork_full` - Create/update artwork
- `upload_file` - Media upload

**Curate:**
- `saveMontages()` - Save montage
- `deleteMontage()` - Remove montage
- `getMontageFull()` - Full montage data

---

## 9. Development Notes

### Adding New Shared Components
1. Place in `/src/components/` (appropriate subfolder)
2. Import in both Curate and Add Contents as needed
3. Use consistent prop patterns

### Using Premium Features
1. Get `isPremium` from `useUserContext()`
2. Conditionally render/disable features
3. Show "(Premium)" indicator for locked features

### Form Data Pattern (Add Contents)
```javascript
// Refs hold actual values for submission
const titleRef = useRef('');
// State for UI display
const [titleValue, setTitleValue] = useState('');
// Sync on change
titleRef.current = value;
setTitleValue(value);
```
