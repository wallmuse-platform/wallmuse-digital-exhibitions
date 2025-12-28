# Player Container - State Management Guide

## Overview

This guide documents critical state management patterns, React hooks usage, and common pitfalls when working with the Player Container playlist system. Understanding these patterns is essential before modifying playlist-related code.

---

## Table of Contents

1. [Core Principles](#core-principles)
2. [Functional setState Pattern](#functional-setstate-pattern)
3. [Backend API Requirements](#backend-api-requirements)
4. [Context and Remounting Behavior](#context-and-remounting-behavior)
5. [useInitialData Hook](#useinitialdata-hook)
6. [Drag-and-Drop Implementation](#drag-and-drop-implementation)
7. [Debouncing Rapid Operations](#debouncing-rapid-operations)
8. [Duplicate Montages Support](#duplicate-montages-support)
9. [Common Pitfalls](#common-pitfalls)

---

## Core Principles

### The Golden Rule
> "Change only when you know scope, you change and then look for scope... simple is best"

- Make targeted changes to specific areas
- Avoid over-engineering solutions
- Prefer simple, direct approaches over complex abstractions

---

## Functional setState Pattern

### ❌ WRONG - Stale Closure Issue

```javascript
const removeMontageFromPlaylist = (playlistIndex, montageIndex) => {
    // BAD: Using closure variable 'playlists'
    const newPlaylists = playlists.map((pl, idx) => {
        if (idx === playlistIndex) {
            return {
                ...pl,
                montages: pl.montages.filter((_, mIdx) => mIdx !== montageIndex)
            };
        }
        return pl;
    });
    setPlaylists(newPlaylists); // Uses stale state during rapid operations!
};
```

**Problem**: During rapid successive operations (e.g., adding/removing montages quickly), the `playlists` variable captures stale state from the closure. The 2nd or 3rd operation will work with outdated data.

### ✅ CORRECT - Functional setState

```javascript
const removeMontageFromPlaylist = (playlistIndex, montageIndex) => {
    // GOOD: Using functional update
    setPlaylists(currentPlaylists => {
        const newPlaylists = currentPlaylists.map((pl, idx) => {
            if (idx === playlistIndex) {
                return {
                    ...pl,
                    montages: pl.montages.filter((_, mIdx) => mIdx !== montageIndex),
                    changed: true
                };
            }
            return pl;
        });
        return newPlaylists;
    });
};
```

**Why it works**: The functional update `setPlaylists(currentPlaylists => ...)` always receives the **latest state** from React, even during rapid operations. This prevents stale closures.

### When to Use Functional setState

- ✅ **Always use** when updating based on previous state
- ✅ **Critical** for add/remove/reorder operations
- ✅ **Required** for rapid successive operations
- ✅ **Essential** in callbacks with optimized dependency arrays

---

## Backend API Requirements

### Empty Parameters Must Be Sent

When clearing a playlist (removing all montages), the backend needs to receive empty string parameters.

### ❌ WRONG - Omitting Empty Parameters

```javascript
// BAD: Empty string is falsy, parameter not sent to backend
if (montageIds) {
    params = { ...params, montages: montageIds };
}
```

**Problem**: When `montageIds = ''` (empty string), the `if (montageIds)` check is falsy, so the `montages` parameter is **NOT included** in the request. Backend doesn't know you want to clear the playlist.

### ✅ CORRECT - Always Include Parameters

```javascript
// GOOD: Empty string is sent to backend
if (montageIds !== undefined) {
    params = { ...params, montages: montageIds };
}

if (checks !== undefined) {
    params = { ...params, checks };
}
```

**Why it works**: Backend interprets `montages=''` and `checks=''` as "clear the playlist". Omitting the parameters means "don't change anything".

### Example Backend Request

```javascript
// Clearing Playlist3:
{
    version: 1,
    session: 'wp-Education1071-1-3a2a30fc241bda248dd72ac6cc4e07ab',
    playlist: '2266',
    name: 'Playlist3',
    montages: '',  // Empty string = clear
    checks: ''     // Empty string = no checks
}
```

---

## Context and Remounting Behavior

### PlaylistsContext Triggers Remounts

The `PlaylistsContext` is the source of truth for all playlist data. When context values change, **components remount** to reflect the new state.

### Key Points

1. **Context-driven architecture**: `PlaylistsContext` wraps the playlist components
2. **Remounting is intentional**: Changes to playlists trigger component remounts
3. **State synchronization**: All components receive updates through context
4. **No local state duplication**: Components should not maintain their own copies of playlist data

### Example Flow

```javascript
// PlaylistsContext.js
export const PlaylistsProvider = ({ children }) => {
    const [playlists, setPlaylists] = useState([]);

    return (
        <PlaylistsContext.Provider value={{ playlists, setPlaylists }}>
            {children}
        </PlaylistsContext.Provider>
    );
};

// Child components remount when playlists change
// This ensures UI stays in sync with data
```

---

## useInitialData Hook

### Only Runs at First Mount

The `useInitialData` hook in `src/Playlists/hooks/useInitialData.js` is designed to run **only once** when the component first mounts.

### Important Characteristics

```javascript
// useInitialData.js
useEffect(() => {
    // This runs ONLY at initial mount
    loadInitialPlaylistData();
}, []); // Empty dependency array = runs once
```

### What It Does

1. Fetches playlists from backend on first load
2. Initializes context with playlist data
3. Sets up current playlist state
4. **Does not re-run** on subsequent context updates

### When It Re-runs

- Full page refresh
- Component unmount/remount cycle
- Navigation away and back to the playlist section

### Developer Note

Do not add dependencies to `useInitialData` unless you want it to re-fetch data. The empty dependency array is intentional to prevent unnecessary API calls.

---

## Drag-and-Drop Implementation

### Complex useMemo Dependency Issue

The drag-and-drop (DnD) reordering feature was particularly complex to debug due to a **missing dependency in useMemo**.

### ❌ The Bug

```javascript
// BAD: Missing 'playlists' dependency
const handleMontageReorder = useMemo(() => {
    return (playlistIndex, startIndex, endIndex) => {
        // Uses 'playlists' but it's not in dependency array!
        const playlist = playlists[playlistIndex];
        // ...reordering logic
    };
}, [setPlaylists]); // Missing 'playlists'!
```

**Problem**: The `handleMontageReorder` callback captured stale `playlists` data because it wasn't in the dependency array. When dragging, the reorder would work in UI but use outdated montage order when saving to backend.

### ✅ The Fix

```javascript
// GOOD: Complete dependency array
const handleMontageReorder = useMemo(() => {
    return (playlistIndex, startIndex, endIndex) => {
        setPlaylists(currentPlaylists => {
            const playlist = currentPlaylists[playlistIndex];
            // ...reordering logic using currentPlaylists
        });
    };
}, [setPlaylists, playlists]); // Include all dependencies!
```

**Why it works**:
1. Including `playlists` in dependencies ensures callback updates with latest data
2. Using functional setState inside ensures we work with current state
3. Reorder operations now persist correctly to UI and backend

### Key Learnings

- **Always complete dependency arrays** - React's exhaustive-deps ESLint rule exists for a reason
- **useMemo for expensive callbacks** - DnD library needs stable function references
- **Functional setState inside memoized callbacks** - Combines stability with correctness
- **Test rapid operations** - Drag multiple items quickly to catch stale closure bugs

---

## Debouncing Rapid Operations

### Preventing Race Conditions

Even with functional setState, rapid operations (especially deletes) can cause race conditions with backend API calls.

### Implementation Using Refs

```javascript
// In component
const deleteInProgressRef = useRef(false);
const deleteTimeoutRef = useRef(null);

const removeMontageFromPlaylist = (playlistIndex, montageIndex) => {
    // Guard against rapid clicks
    if (deleteInProgressRef.current) {
        console.log('[Playlists] Delete already in progress, ignoring rapid click');
        return;
    }

    deleteInProgressRef.current = true;
    setDeleteInProgress(true);

    // ...perform delete operation

    // Clear flag after 300ms
    if (deleteTimeoutRef.current) {
        clearTimeout(deleteTimeoutRef.current);
    }

    deleteTimeoutRef.current = setTimeout(() => {
        deleteInProgressRef.current = false;
        setDeleteInProgress(false);
    }, 300);
};
```

### Why 300ms?

- Balances user experience with system stability
- Prevents accidental double-clicks
- Allows time for backend API call to complete
- Fast enough that users don't notice the delay

### When to Use Debouncing

- ✅ Delete operations
- ✅ Rapid successive API calls
- ✅ Operations without confirmation dialogs
- ❌ Not needed for operations with confirmation popups (they provide natural delay)

---

## Duplicate Montages Support

### Context: Duplicates Are Allowed

The playlist system **intentionally supports duplicate montages** in the same playlist. This is not a bug.

### Use Cases

1. **Repeated content**: User wants same montage to play multiple times
2. **Educational sequences**: Same content at different points in playlist
3. **User preference**: No restrictions on playlist composition

### Implementation Considerations

#### Array Indexes, Not IDs

```javascript
// Use index-based operations
playlist.montages.filter((_, mIdx) => mIdx !== montageIndex)

// NOT ID-based (would remove all duplicates)
// playlist.montages.filter(m => m.id !== montageId) // WRONG!
```

#### Unique Keys in React

```javascript
// Use combination of ID and index for React keys
{playlist.montages.map((montage, index) => (
    <PlayListItem
        key={`${montage.id}-${index}`}  // Unique even for duplicates
        montage={montage}
        montageIndex={index}
    />
))}
```

#### Backend Format

```javascript
// Multiple same IDs are valid
montages: "1450,1450,1450"  // Same montage 3 times
checks: "1,1,1"
```

#### Checks Feature (Currently Disabled)

**Important**: The `checks` parameter (for enabling/disabling individual montages) is **currently disabled** in the UI.

**Reason**: The WebPlayer TypeScript child component does not yet handle the `is_checked` property. Until WebPlayer supports filtering out unchecked montages during playback, the checkbox UI is hidden.

**Current State**:
- Backend stores `is_checked` values (`"0"` or `"1"`)
- All montages are sent with `checks: "1,1,1..."` (all enabled)
- UI does not display checkboxes to users
- Future work: Implement checks handling in WebPlayer before re-enabling UI

**When Re-enabling**:
1. Update WebPlayer TS to filter montages by `is_checked`
2. Add checkbox UI back to PlayListItem component
3. Test that unchecked montages are skipped during playback
4. Ensure checks persist correctly to backend

### Testing Duplicates

Always test operations with duplicate montages:
- Add same montage multiple times
- Remove one instance (should only remove that specific instance)
- Reorder duplicates
- Refresh to verify backend persistence

---

## Common Pitfalls

### 1. Stale Closures in Callbacks

**Symptom**: Operations work the first time but fail on 2nd/3rd rapid operation.

**Cause**: Using closure variables instead of functional setState.

**Fix**: Always use `setState(currentState => ...)` pattern.

---

### 2. Missing useMemo Dependencies

**Symptom**: Drag-and-drop saves wrong order, UI shows correct but backend has old order.

**Cause**: Missing dependencies in `useMemo` or `useCallback`.

**Fix**: Include all variables used inside the memoized function.

---

### 3. Empty Parameters Not Sent to Backend

**Symptom**: Deleting last montage works in UI but reappears after refresh.

**Cause**: `if (value)` check prevents empty strings from being sent.

**Fix**: Use `if (value !== undefined)` to allow empty strings.

---

### 4. Index vs ID Confusion

**Symptom**: Deleting one duplicate removes all instances.

**Cause**: Using `montage.id` to filter instead of array index.

**Fix**: Always use index for remove operations: `filter((_, idx) => idx !== montageIndex)`.

---

### 5. Race Conditions in Rapid Operations

**Symptom**: Fast clicking causes some operations to fail silently.

**Cause**: Multiple API calls in flight, state updates overlap.

**Fix**: Add debounce using refs to prevent rapid successive operations.

---

### 6. Breaking Context Remounts

**Symptom**: UI doesn't update after playlist changes.

**Cause**: Component maintaining local state copy instead of using context.

**Fix**: Always derive state from context, don't duplicate in local state.

---

### 7. Misusing useInitialData

**Symptom**: Unnecessary API calls on every state change.

**Cause**: Adding dependencies to `useInitialData` hook.

**Fix**: Keep dependency array empty `[]` - it should only run at mount.

---

## Debug Checklist

When debugging playlist issues:

1. ✅ Check if using functional setState pattern
2. ✅ Verify all useMemo/useCallback dependencies are complete
3. ✅ Test with duplicate montages
4. ✅ Test rapid successive operations (3+ quick clicks)
5. ✅ Check network tab for empty parameter values
6. ✅ Verify operations work after page refresh
7. ✅ Ensure operations use indexes not IDs for remove/reorder
8. ✅ Check for stale closures in event handlers

---

## Additional Resources

- [PLAYER_CONTAINER_RULES.md](./PLAYER_CONTAINER_RULES.md) - General coding rules
- [PLAYER_CONTAINER_TROUBLESHOOTING.md](./PLAYER_CONTAINER_TROUBLESHOOTING.md) - Debugging guide
- [React Hooks Documentation](https://react.dev/reference/react) - Official React docs

---

## Version History

- **2025-10-29**: Initial documentation covering state management patterns and common pitfalls
