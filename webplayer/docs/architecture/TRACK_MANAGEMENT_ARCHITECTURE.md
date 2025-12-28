# Track Management Architecture - Complete System Documentation

**Date**: 2025-12-27
**Status**: Production Implementation

---

## Table of Contents

1. [Overview](#overview)
2. [Core Concepts](#core-concepts)
3. [Source of Truth Architecture](#source-of-truth-architecture)
4. [Track Assignment System](#track-assignment-system)
5. [Peer Synchronization](#peer-synchronization)
6. [Montage Signature & Reordering](#montage-signature--reordering)
7. [Implementation Details](#implementation-details)
8. [Data Flow Diagrams](#data-flow-diagrams)
9. [Key Files & Code Pointers](#key-files--code-pointers)

---

## Overview

The track management system enables synchronized multi-track montage playback across a cluster of devices/screens within a house. Each montage can have multiple tracks (video variations), and screens can be assigned to different tracks of the same montage.

### Key Features

- **Per-montage track assignments** stored by montage ID (not position)
- **Parent prevails** for same-browser navigation
- **WebSocket peer synchronization** for multi-device clusters
- **Automatic reorder detection** via montage signature comparison
- **Persistent track mappings** survive playlist reordering

---

## Core Concepts

### 1. House Cluster Architecture

A **house** consists of multiple **environments**, each with one or more **screens**:

```
House 269 "Main"
├── Environment 10511 (PC Browser 1)
│   └── Screen 193810 → Track 2
├── Environment 10453 (PC Browser 2)
│   └── Screen 193753 → Track 1
└── Environment 10454 (Streaming Server)
    └── Screen 193754 → Track 3
```

**Key Point**: All screens in a house must stay synchronized on the same playlist and montage position, but can play different tracks.

### 2. Track Indexing Convention

- **UI/Server**: 1-based indexing (Track 1, Track 2, Track 3)
- **Internal Code**: 0-based indexing (0, 1, 2)
- **Conversion**: `trackIndex = parseInt(track) - 1`

### 3. Montage ID vs Position

- **Montage ID**: Stable identifier (e.g., 1552, 1450, 1559) - never changes
- **Montage Position**: Index in playlist (0, 1, 2) - changes when reordered
- **Critical**: Track assignments use montage ID to survive reordering

---

## Source of Truth Architecture

### Playlist & Position: Server Database

**Source**: Server database stores playlist and position per screen

```javascript
// Server database (conceptual)
screen_193810: {
  current_playlist: 264,
  current_position: 1,  // Montage index in playlist
  // ... other screen properties
}
```

**Updates**:
- User selects playlist → Parent sends NAV command → WebSocket updates ALL screens in house
- User navigates montage → Parent sends NAV command → WebSocket updates ALL screens in house

**Parent Prevails**: Same-browser navigation processes immediately without waiting for WebSocket

### Track Assignments: Environment Configuration

**Source**: Server environment configuration stores track assignments per montage

```javascript
// Environment configuration (from server)
montage_1552: {
  screens: [
    { id: 193810, seq_refs: [{ id: "2" }] },  // Track 2
    { id: 193753, seq_refs: [{ id: "1" }] },  // Track 1
    { id: 193754, seq_refs: [{ id: "3" }] }   // Track 3
  ]
}
```

**Updates**:
- User changes track assignment → Parent updates server → Server broadcasts environment update → WebSocket syncs ALL screens

**Key Insight**: Track assignments are part of environment/screen configuration, NOT navigation state

---

## Track Assignment System

### Storage: ID-Based Mapping

Track overrides stored by **montage ID** (not position):

```typescript
// Sequencer.ts
private static montageTrackOverrides: Map<string, number> = new Map();

// Examples:
// "1552" → 1  (Entre-deux Seines → Track 2, 0-based)
// "1450" → 0  (Mythic Paintings → Track 1, 0-based)
// "1559" → 2  (Panathenaic Stadium → Track 3, 0-based)
```

**Why ID-based?** Position changes during reordering, but ID remains stable.

### Setting Track Overrides

**From Parent (Same Browser)**:

```javascript
// Parent App.js sends track mappings by montage ID
const trackMappings = {
  1450: '1',  // Mythic → Track 1
  1552: '2',  // Entre-deux → Track 2
  1559: '3'   // Panathenaic → Track 3
};

// Sent via window.applyTrackMappings(trackMappings)
```

**From WebSocket (Peer Sync)**:

```javascript
// WebSocket receives environment update with screen assignments
// ws-tools.ts extracts track assignments from montage screens
const montage = playlist.getMontage(i);
const screenDetail = montage.screens?.find(s => s.id === currentScreenId);
const track = screenDetail?.seq_refs?.[0]?.id;  // "2"
const trackIndex = parseInt(track) - 1;  // 1 (0-based)

Sequencer.setMontageTrackOverride(montageIndex, trackIndex);
```

### Pending Track Mappings

**Problem**: Track mappings may arrive before playlist data loads

**Solution**: Temporary storage with conversion when ready

```typescript
// index.tsx - Pending storage
if (!currentPlaylist) {
  window.PENDING_TRACK_MAPPINGS = trackMappings;
  return;
}

// Applied after playlist loads
window.applyPendingTrackMappings = () => {
  const mappings = window.PENDING_TRACK_MAPPINGS;
  Object.entries(mappings).forEach(([montageId, track]) => {
    // Find montage position from ID
    const position = findMontagePosition(montageId);
    const trackIndex = parseInt(track) - 1;
    Sequencer.setMontageTrackOverride(position, trackIndex);
  });
};
```

**Reference**: [index.tsx:907-977](../../src/index.tsx#L907-L977)

---

## Peer Synchronization

### What Triggers Peer Sync?

WebSocket detects environment changes and synchronizes **peer screens** (other browsers/devices in the house):

1. **Playlist Change**: Different playlist ID
2. **Position Change**: Different montage index
3. **Track Assignment Change**: Different track for any montage
4. **Montage Reorder**: Different signature (order changed)

### Environment State Tracking

```typescript
// ws-tools.ts
private previousEnvironmentState?: {
    playlistId?: number;
    position?: number;
    trackAssignments: Map<number, number>;  // montageIndex → trackIndex
    montageSignature?: string;  // "1552-1559-1450"
};
```

**Reference**: [ws-tools.ts:91-97](../../src/ws/ws-tools.ts#L91-L97)

### Peer Sync Flow

```
SCENARIO: User on PC1 changes track for montage 1552

PC1 (Same Browser - Parent Prevails):
  1. User clicks track button
  2. Parent sends track mapping: { 1552: '3' }
  3. WebPlayer applies immediately (parent prevails)
  4. Parent sends API request to server

SERVER:
  5. Updates environment configuration
  6. Broadcasts WebSocket message to ALL screens in house:
     - environment.screens[193810].seq_refs = [{ id: "3" }]

PC2 (Peer Browser - WebSocket Sync):
  7. WebSocket receives environment update
  8. Detects track assignment change
  9. Extracts new track: screen 193810 → Track 3
  10. Updates Sequencer.setMontageTrackOverride(1, 2)
  11. Calls Sequencer.goMontage(currentPosition, newTrack)
  12. ✅ PC2 now plays Track 3 (synchronized!)
```

**Reference**: [ws-tools.ts:583-725](../../src/ws/ws-tools.ts#L583-L725)

---

## Montage Signature & Reordering

### What is Montage Signature?

A signature identifies the order of montages in a playlist:

```javascript
// Original order
playlist.montages = [1552, 1559, 1450];
signature = "1552-1559-1450"

// After reordering
playlist.montages = [1559, 1450, 1552];
signature = "1559-1450-1552"  // ← CHANGED!
```

### Reorder Detection

```typescript
// ws-tools.ts - Generate signature
const signature = playlist.montages
  .map(m => m.id)
  .join('-');

// Compare with previous
const signatureChanged =
  previousState?.montageSignature !== signature;

if (signatureChanged) {
  console.log('[WS-PEER-SYNC] 🔀 Montage reordering detected');
  // Reload current position with new order
  Sequencer.goMontage(currentPosition, trackOverride);
}
```

**Why Important?** After reordering, the montage at position 1 might be different. Reload ensures correct montage plays.

**Reference**: [ws-tools.ts:648-660](../../src/ws/ws-tools.ts#L648-L660)

### Track Mappings Survive Reordering

Because track mappings use montage **ID** (not position):

```javascript
// Before reorder: Panathenaic at position 1
trackOverrides.set("1559", 2);  // Track 3

// After reorder: Panathenaic moved to position 0
// Mapping still works! Position changed, but ID 1559 unchanged
const montage = playlist.getMontage(0);  // ID: 1559
const track = trackOverrides.get("1559");  // Still 2 ✅
```

---

## Implementation Details

### 1. Track Override Storage (ID-Based)

**File**: [Sequencer.ts:36-42](../../src/manager/Sequencer.ts#L36-L42)

```typescript
private static montageTrackOverrides: Map<string, number> = new Map();
private static pendingPositionOverrides: Map<number, number> = new Map();
```

**Why Two Maps?**
- `montageTrackOverrides`: Permanent storage by montage ID
- `pendingPositionOverrides`: Temporary storage when montage not yet loaded

### 2. Setting Track Override

**File**: [Sequencer.ts:364-388](../../src/manager/Sequencer.ts#L364-L388)

```typescript
public static setMontageTrackOverride(montageIndex: number, trackIndex: number) {
  let montageId: string | undefined;

  // Try to get montage ID from loaded playlist
  if (this._playlist) {
    const montage = this._playlist.getMontage(montageIndex);
    montageId = montage?.id?.toString();
  }

  if (montageId) {
    // Store by ID (permanent)
    this.montageTrackOverrides.set(montageId, trackIndex);
    this.pendingPositionOverrides.delete(montageIndex);
  } else {
    // Store by position temporarily (until montage loads)
    this.pendingPositionOverrides.set(montageIndex, trackIndex);
  }
}
```

### 3. Getting Track Override

**File**: [Sequencer.ts:390-410](../../src/manager/Sequencer.ts#L390-L410)

```typescript
public static getMontageTrackOverride(montageIndex: number): number | undefined {
  // Try ID-based lookup first
  if (this._playlist) {
    const montage = this._playlist.getMontage(montageIndex);
    if (montage?.id) {
      const override = this.montageTrackOverrides.get(montage.id.toString());
      if (override !== undefined) {
        return override;
      }
    }
  }

  // Fall back to position-based (pending)
  return this.pendingPositionOverrides.get(montageIndex);
}
```

### 4. Track Selection in goMontage

**File**: [index.tsx:746-763](../../src/index.tsx#L746-L763)

```typescript
// Parent prevails: Use track from navigation params if provided
let trackOverride: number | undefined;
if (resolvedTrack !== undefined && resolvedTrack !== null) {
  trackOverride = parseInt(String(resolvedTrack)) - 1; // Parent prevails
  console.log('[React] 🎯 Using track from navigation params (parent prevails)');
} else {
  // Fall back to stored override
  trackOverride = Sequencer.getMontageTrackOverride(resolvedPosition);
  console.log('[React] 🎯 Using stored override:', trackOverride);
}

Sequencer.goMontage(resolvedPosition, trackOverride);
```

### 5. Applying Track Mappings from Parent

**File**: [index.tsx:907-977](../../src/index.tsx#L907-L977)

```typescript
window.applyTrackMappings = (trackMappings) => {
  // Store pending if playlist not loaded
  if (!currentPlaylist) {
    window.PENDING_TRACK_MAPPINGS = trackMappings;
    return;
  }

  // Map montage IDs to positions
  Object.entries(trackMappings).forEach(([montageId, track]) => {
    const trackIndex = parseInt(String(track)) - 1;

    // Find montage position from ID
    let montagePosition = -1;
    for (let i = 0; i < montageCount; i++) {
      const montage = currentPlaylist.getMontage(i);
      if (montage && String(montage.id) === String(montageId)) {
        montagePosition = i;
        break;
      }
    }

    if (montagePosition !== -1) {
      Sequencer.setMontageTrackOverride(montagePosition, trackIndex);
    }
  });
};
```

### 6. WebSocket Peer Synchronization

**File**: [ws-tools.ts:583-725](../../src/ws/ws-tools.ts#L583-L725)

```typescript
private handleEnvironmentUpdate() {
  // Build current state from environment
  const currentState = {
    playlistId,
    position: currentPosition,
    trackAssignments: new Map(),
    montageSignature: playlist.montages.map(m => m.id).join('-')
  };

  // Extract track assignments from screens
  playlist.montages.forEach((montage, index) => {
    const screenDetail = montage.screens?.find(s => s.id === screenId);
    if (screenDetail?.seq_refs?.[0]?.id) {
      const track = parseInt(screenDetail.seq_refs[0].id) - 1;
      currentState.trackAssignments.set(index, track);
    }
  });

  // Detect changes
  const playlistChanged = prev?.playlistId !== current.playlistId;
  const positionChanged = prev?.position !== current.position;
  const signatureChanged = prev?.montageSignature !== current.montageSignature;
  const trackChanged = !mapsEqual(prev?.trackAssignments, current.trackAssignments);

  // Handle changes
  if (trackChanged && !playlistChanged) {
    console.log('[WS-PEER-SYNC] 🎵 Track assignment change detected');
    Sequencer.goMontage(currentPosition, newTrack);
  }

  if (signatureChanged && !playlistChanged) {
    console.log('[WS-PEER-SYNC] 🔀 Montage reordering detected');
    Sequencer.goMontage(currentPosition, trackOverride);
  }
}
```

### 7. Default Playlist Screen Data Fix

**File**: [ws-tools.ts:362-391](../../src/ws/ws-tools.ts#L362-L391)

**Problem**: Default playlist (undefined ID) arrives as montages array, but was being skipped if montages recently cached

**Solution**: Check for screen assignment data and always process if present

```typescript
// Check if montages array includes screen assignment data
const hasScreenData = data.montages.some(m =>
  m.screens && Array.isArray(m.screens) && m.screens.length > 0
);

// Only skip if montages cached AND no new screen data
if (hasRecentlyAddedMontages && !hasScreenData) {
  console.log('[WS-TOOLS] SKIPPING: montages cached without screen data');
  return;
}

if (hasScreenData) {
  console.log('[WS-TOOLS] Has screen data - creating playlist to preserve assignments');
}

// Create default playlist with screen assignments
const defaultPlaylist = {
  tag_name: "playlist",
  id: undefined,
  name: "Default Playlist",
  montages: data.montages  // Includes screens with seq_refs
};
```

---

## Data Flow Diagrams

### Track Assignment Update Flow

```
USER ACTION: Changes Track for Montage 1552
       ↓
PARENT APP (Same Browser):
  1. handleTrackChange() detects change
  2. Builds track mappings: { 1552: '3' }
  3. Calls window.applyTrackMappings({ 1552: '3' })
       ↓
WEBPLAYER (Same Browser):
  4. Converts montage ID → position: 1552 is at index 1
  5. Converts track: '3' → 2 (0-based)
  6. Sequencer.setMontageTrackOverride(1, 2)
  7. Stores: montageTrackOverrides.set("1552", 2)
  8. ✅ Track change applied immediately (parent prevails)
       ↓
PARENT APP → SERVER:
  9. POST /api/update_screen_assignment
  10. { screen_id: 193810, montage_id: 1552, track: 3 }
       ↓
SERVER → ALL SCREENS IN HOUSE:
  11. WebSocket broadcasts environment update
  12. Includes updated screens array with new seq_refs
       ↓
PEER WEBPLAYERS (Other Browsers):
  13. ws-tools.ts receives environment update
  14. handleEnvironmentUpdate() detects track change
  15. Extracts: montage 1552 → Track 3 for screen 193810
  16. Sequencer.setMontageTrackOverride(1, 2)
  17. Sequencer.goMontage(currentPosition, 2)
  18. ✅ Peers synchronized!
```

### Playlist Reorder Flow

```
USER ACTION: Reorders playlist (moves Mythic from position 0 to 2)
       ↓
PARENT APP:
  1. Sends reordered playlist to server
  2. Server updates playlist.montages order
       ↓
SERVER → ALL SCREENS:
  3. WebSocket broadcasts playlist with new order
       ↓
WEBPLAYER:
  4. ws-tools.ts receives playlist message
  5. setCurrentPlaylist(newPlaylist)
  6. Generates new signature: "1559-1552-1450" (was "1552-1559-1450")
  7. Detects: signatureChanged = true
       ↓
TRACK MAPPINGS (Automatic):
  8. Track overrides stored by ID remain valid:
     - "1552" → 1  ✅ Still works (Entre-deux)
     - "1450" → 0  ✅ Still works (Mythic)
     - "1559" → 2  ✅ Still works (Panathenaic)
       ↓
NAVIGATION:
  9. Sequencer.goMontage(currentPosition, trackOverride)
  10. Gets montage at new position
  11. Looks up track by montage ID
  12. ✅ Correct track plays despite reorder!
```

---

## Key Files & Code Pointers

### Parent App (Play C 3)

**Track Mappings by Montage ID**:
- [App.js:828-848](../../../play%20C%203/play/src/App.js#L828-L848) - Build track mappings from playlist

**Navigation Manager**:
- [NavigationManager.js:51-65](../../../play%20C%203/play/src/utils/NavigationManager.js#L51-L65) - Duplicate detection includes track

### WebPlayer (webplayer2B)

**Track Override Storage**:
- [Sequencer.ts:36-42](../../src/manager/Sequencer.ts#L36-L42) - Map declarations
- [Sequencer.ts:364-388](../../src/manager/Sequencer.ts#L364-L388) - setMontageTrackOverride()
- [Sequencer.ts:390-410](../../src/manager/Sequencer.ts#L390-L410) - getMontageTrackOverride()

**Track Application**:
- [index.tsx:746-763](../../src/index.tsx#L746-L763) - Track selection priority (parent prevails)
- [index.tsx:907-977](../../src/index.tsx#L907-L977) - applyTrackMappings() function

**WebSocket Peer Sync**:
- [ws-tools.ts:91-97](../../src/ws/ws-tools.ts#L91-L97) - Environment state tracking
- [ws-tools.ts:583-725](../../src/ws/ws-tools.ts#L583-L725) - handleEnvironmentUpdate()
- [ws-tools.ts:648-660](../../src/ws/ws-tools.ts#L648-L660) - Signature generation

**Default Playlist Fix**:
- [ws-tools.ts:362-391](../../src/ws/ws-tools.ts#L362-L391) - Screen data detection

**Montage Track Selection**:
- [Montage.ts:37-115](../../src/dao/Montage.ts#L37-L115) - getTrackIndex() with seq parameter

---

## Best Practices

### DO ✅

1. **Always use montage ID for track storage** - never position
2. **Parent prevails for same-browser** - immediate updates without WebSocket
3. **WebSocket syncs peers** - updates other browsers/devices in cluster
4. **Check for pending mappings** - handle timing issues gracefully
5. **Detect signature changes** - reload after reordering
6. **Include track in duplicate detection** - prevent skipping track changes

### DON'T ❌

1. **Don't store tracks by position** - breaks on reorder
2. **Don't skip WebSocket updates** - breaks multi-device sync
3. **Don't assume playlist loaded** - use pending storage
4. **Don't ignore screen data** - needed for track assignments
5. **Don't special-case undefined playlist** - treat like any other ID

---

## Troubleshooting

### Track Not Changing

**Check**:
1. Is track mapping using montage ID? (not position)
2. Is WebSocket receiving environment updates?
3. Are peer browsers detecting track assignment changes?
4. Is track override being retrieved correctly?

**Debug**:
```javascript
// Check stored overrides
Sequencer.montageTrackOverrides  // Should show ID → track mapping

// Check current montage ID
const montage = playlist.getMontage(position);
console.log('Montage ID:', montage.id);

// Check track retrieval
const track = Sequencer.getMontageTrackOverride(position);
console.log('Retrieved track:', track);
```

### Navigation Not Working in Default Playlist

**Symptoms**: "No global montages loaded yet, retrying..."

**Cause**: WebSocket skipped default playlist because montages already cached

**Fix**: Ensure screen data check is in place ([ws-tools.ts:362-391](../../src/ws/ws-tools.ts#L362-L391))

### Peer Screens Not Synchronizing

**Check**:
1. Are all screens in same house?
2. Is WebSocket broadcasting to all screens?
3. Is environment update being detected?
4. Are track assignments in WebSocket message?

**Debug**:
```javascript
// Check environment state
window.wsTools.previousEnvironmentState

// Check current assignments
const montage = playlist.getMontage(0);
const screen = montage.screens.find(s => s.id === screenId);
console.log('My track:', screen?.seq_refs?.[0]?.id);
```

---

## Related Documentation

- [Enhanced Navigation Solution](../../../play%20C%203/play/docs/architecture/ENHANCED_NAVIGATION_SOLUTION.md) - Parent app navigation architecture
- [WebSocket vs Parent Architecture](./WEBSOCKET_VS_PARENT_ARCHITECTURE.md) - Communication mechanisms
- [WebSocket System](./WEBSOCKET_SYSTEM.md) - WebSocket connection management
- [Wallmuse WebPlayer Rules](./WALLMUSE_WEBPLAYER_RULES.md) - Core development rules

---

**Last Updated**: 2025-12-27
**Author**: Claude Code
**Status**: Production Implementation
