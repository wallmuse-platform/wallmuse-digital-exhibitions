# GuestActionPopup Component Documentation

## Overview
Modal dialog that prompts users to choose between Guest Account (temporary) and Personal Account (permanent) when attempting restricted actions.

## Feature Structure (Parallel Design)

### Design Rationale
Features are organized in parallel rows for clear comparison:

| Row | Guest Account | Personal Account |
|-----|---------------|------------------|
| 1 | Web features | Web + PC app features |
| 2 | Browser only | Multi-display sync |
| 3 | Session-based | Saved forever |
| 4 | Free | Free \| Premium |

**Why this structure:**
- Row 1: Feature scope (what you can do)
- Row 2: Location/sync capability (where/how)
- Row 3: Duration/persistence (how long)
- Row 4: Pricing (cost)

Each row provides a clear contrasting relationship that non-technical users can understand.

## Domain-Specific Behavior

### OOO2 Theme
- Shows only "Free" for personal accounts (no Premium option)
- Uses same 4-feature structure

### Wallmuse/Sharex Themes
- Shows "Free | Premium" for personal accounts
- Uses same 4-feature structure

**Detection:**
```javascript
const isOoo2Theme = currentTheme === 'ooo2' || window.location.hostname.includes('ooo2');
```

## Translation Keys

### Guest Account Features
- `guest_feature_1`: "Web features"
- `guest_feature_2`: "Browser only"
- `guest_feature_3`: "Session-based"
- `guest_feature_4`: "Free"

### Personal Account Features
- `personal_feature_1`: "Web + PC app features"
- `personal_feature_2`: "Multi-display sync"
- `personal_feature_3`: "Saved forever"

**Note:** Feature order changed from original implementation - `personal_feature_2` and `personal_feature_3` were swapped for parallel alignment.

## Color Coding

Colors match MontageSelection component:
- **Free:** `rgb(14, 230, 172)` (green)
- **Premium:** `rgb(21, 86, 237)` (blue)
- **Checkmarks:** Green for all features

## Supported Languages
EN, DE, ES, FR, IT, HR, NL, NO, PL, PT, UA, JP (12 total)

## Console Log Keywords

Search logs with these keywords for debugging:

### Component Lifecycle
- `[GuestActionPopup] Rendering popup`
- `[GuestActionPopup] showPremiumMessage`

### Guest Account Creation
- `[GuestActionPopup] Creating temporary account`
- `[GuestActionPopup] Temporary account created`
- `[GuestActionPopup] Error creating temporary account`

### User Actions
- `[GuestActionPopup] Redirecting to sign up page`
- `[GuestActionPopup] Close button clicked`
- `[GuestActionPopup] Calling onContinueWithTemp`
- `[GuestActionPopup] Calling onClose`

### Error States
- `[GuestActionPopup] onContinueWithTemp is not a function`
- `[GuestActionPopup] onClose is not a function`

## File Location
`src/accounts/GuestActionPopup.js`

## Modifying Features

To add/modify features:

1. Update `guestFeatures` and `personalFeatures` arrays in GuestActionPopup.js
2. Add/update translation keys in all 12 language files:
   - `src/locales/{en,de,es,fr,it,hr,nl,no,pl,pt,ua,jp}/translation{XX}.json`
3. Maintain parallel structure for clarity
4. Use `color` property for colored text, or `isMultiColor` for multi-colored strings

Example:
```javascript
{ text: t('new_feature_key') || 'Default text' }
{ text: t('colored_feature') || 'Free', color: freeColor }
```
