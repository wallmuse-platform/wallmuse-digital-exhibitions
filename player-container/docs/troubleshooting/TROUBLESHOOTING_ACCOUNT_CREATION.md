# TROUBLESHOOTING ACCOUNT CREATION

## Overview
This document describes the debugging tools and process for troubleshooting account creation issues, specifically the "2 environments created instead of 1" problem.

## Account Creation Process Dumps

### Purpose
Track the complete account creation flow with milestones, environment states, screen dimensions, and localStorage flags to identify where duplicate environments are created.

### Location
Debug dumps are implemented in:
- `src/contexts/SessionContext.js`
- `src/contexts/EnvironmentsContext.js`

### Usage
**Toggle dumps on/off by commenting/uncommenting the blocks:**
```javascript
// ACCOUNT CREATION PROCESS DUMP - comment/uncomment to toggle
```

### Dump Types

#### 1. House Creation (`milestone: 'house_created'`)
**Location:** SessionContext.js, after `createHouseForUser`
**Tracks:**
- House ID creation
- accountJustCreated flag
- newAccountHouseId flag

#### 2. Environment Fetch (`milestone: 'environment_fetch'`)
**Location:** EnvironmentsContext.js, in `fetchEnvironmentDetails`
**Tracks:**
- Environment count
- Environment IDs and IP addresses
- Screen dimensions for each environment
- All localStorage flags

#### 3. Environment Creation (`milestone: 'environment_creation'`)
**Location:** EnvironmentsContext.js, before `createDefaultEnvironment`
**Tracks:**
- Environment creation attempt
- House ID being processed
- Trigger reason
- All localStorage flags

### Data Structure
Each dump is stored in localStorage as `accountProcess_<timestamp>`:
```json
{
  "timestamp": "2025-09-29T01:17:28.082Z",
  "milestone": "environment_fetch",
  "houseId": "538",
  "environmentCount": 2,
  "environments": [
    {
      "id": "10308",
      "ip": "127.0.0.1",
      "screenDimensions": "2560x1440"
    },
    {
      "id": "10307",
      "ip": "none",
      "screenDimensions": "0x0"
    }
  ],
  "flags": {
    "accountJustCreated": "true",
    "activationComplete": "true",
    "needsRefresh": "false",
    "needsSecondRefresh": "true"
  }
}
```

## Known Issues

### Double Environment Creation
**Problem:** Account creation results in 2 environments instead of 1
- Environment with IP `127.0.0.1` (master)
- Environment without IP (duplicate with faulty screen dimensions `0x0`)

### Root Cause Analysis
1. **Single creation call** triggers `createDefaultEnvironment` once
2. **Child WebPlayer** creates additional environment
3. **needsSecondRefresh cleanup** was previously removing the duplicate
4. **Removing needsSecondRefresh** exposed the underlying issue

### Architecture Notes
- **Environment creation** handled at child WebPlayer (TypeScript) level
- **React EnvironmentsContext** only orchestrates, doesn't directly create
- **Race conditions** between initial mount and house-created event possible

## Debugging Workflow

### Step 1: Enable Dumps
Uncomment all `// ACCOUNT CREATION PROCESS DUMP` blocks in:
- SessionContext.js
- EnvironmentsContext.js

### Step 2: Test Account Creation
1. Clear localStorage
2. Create new guest account on production
3. Complete account setup process

### Step 3: Analyze Timeline
Check localStorage for `accountProcess_*` entries:
1. **house_created** - verify house creation
2. **environment_fetch** - see initial state (should be 0 environments)
3. **environment_creation** - creation attempt
4. **environment_fetch** - final state (shows 2 environments issue)

### Step 4: Identify Issue
Look for:
- When environment count jumps from 1 to 2
- Which environment has proper screen dimensions
- Flag progression through the flow

### Step 5: Disable Dumps
Comment out all dump blocks when debugging complete.

## Parent-Child Synchronization Attempt (Sept 2024)

### What We Tried
**Goal:** Eliminate the 2nd mount during account creation while maintaining proper environment synchronization.

**Approaches Attempted:**
1. **Child-to-Parent Event Communication**
   - Child WebPlayer dispatches `child-environment-created` events
   - Parent EnvironmentsContext listens and updates state without full refresh
   - Added `childEventReceived` state to skip needsSecondRefresh logic

2. **Stable React Key Props**
   - Added `key={webplayer-${house?.id}}` to WebPlayer component
   - Intended to prevent React remounting when environment data changes

3. **Remove Environments Dependency**
   - Removed `environments` from WebPlayer.js useEffect dependency array
   - Commented out environments usage in helper functions
   - Always use fallback values, let child handle environment creation

### What We Learned
**Critical Insight:** Despite all technical improvements, **React component mounting issues persisted** in the child TypeScript app. The child would:
- ✅ Create environments/screens successfully
- ✅ Connect to WebSocket and load montages
- ❌ **Fail to render videos to DOM** (`{container: true, children: 0}`)
- ❌ **Sequencer wouldn't initialize** despite montages loading

**Root Cause:** The child TypeScript React app expects specific initialization sequences that our synchronization changes disrupted. Even when technically "working," the DOM rendering failed.

### Lessons Learned
1. **"If you don't know, don't change"** - Complex parent-child coordination introduced more problems
2. **2-mount approach works reliably** - It may not be elegant, but it's stable
3. **Child environment creation is valuable** - Screen dimensions now properly set (0x0 → 1157x1200)
4. **Event communication is overcomplicated** - Remounts naturally handle data sync

### What We Kept
✅ **Child environment/screen creation** - Major improvement in screen dimension handling
✅ **Removed environments dependency from WebPlayer.js** - Simplifies the component
✅ **Restored needsSecondRefresh logic** - Back to working 2-mount approach

### What We Removed
❌ **Parent-child event listeners** - Overcomplicated and unnecessary
❌ **Stable React key props** - Broke playlist/montage navigation
❌ **Complex conditional refresh logic** - Back to simple needsSecondRefresh

## Current Solutions (Sept 2024)

### Recommended: Accept 2-Mount Approach
**Status:** Working reliably
The 2-mount approach provides stable account creation with proper environment synchronization.

## Manual Cleanup
For webplayer environments (not desktop PC environments), duplicate environments can be manually removed via the Configure section interface.

## Flag Coordination System
The account creation process uses localStorage flags for coordination:
- `accountJustCreated` - New account in setup
- `activationComplete` - Account activation finished
- `needsRefresh` - First refresh needed for screen setup
- `needsSecondRefresh` - Second refresh for cleanup (currently disabled)
- `newAccountHouseId` - House ID for new account
- `activationInProgress` - Account creation in progress

## Environment Types
- **Master Environment** - Has IP `127.0.0.1`, proper screen dimensions
- **Duplicate Environment** - No IP, faulty screen dimensions `0x0`
- **Desktop Environments** - Created by desktop PC player app (different flow)

## Console Log Keywords

Search console logs with these keywords for debugging account creation issues:

### SessionContext Logs
- `[SessionContext] Session updated` - Session data changes
- `[SessionContext] Updating DOM with house ID` - House ID written to DOM
- `[SessionContext] Starting session initialization` - Init process start
- `[SessionContext] WordPress login status` - WP auth state
- `[SessionContext] User has existing houses` - Existing user detected
- `[SessionContext] No houses found, creating one` - New account flow
- `[SessionContext] House creation successful` - House created OK
- `[SessionContext] House creation failed` - House creation error
- `[SessionContext] Cleaned * erroneous house fingerprints` - Cleanup during setup
- `[SessionContext] Autostart setting result` - Autostart config

### EnvironmentsContext Logs
**Environment Fetching:**
- `[fetchEnvironmentDetails] Fetching user details` - Start fetch
- `[fetchEnvironmentDetails] Houses found` - Houses returned
- `[fetchEnvironmentDetails] Found environments` - Env count
- `[fetchEnvironmentDetails] Processing new account setup` - New account path
- `[fetchEnvironmentDetails] No environments found` - Empty state

**Playlist Copying:**
- `[fetchEnvironmentDetails] Copying playlists from guest account` - Guest→Personal copy
- `[fetchEnvironmentDetails] Playlist copy result` - Copy success
- `[fetchEnvironmentDetails] Playlists already copied` - Skip duplicate copy

**Environment Cleanup:**
- `[fetchEnvironmentDetails] Found master environment with IP 127.0.0.1` - Master identified
- `[fetchEnvironmentDetails] Found non-master environments` - Duplicates found
- `[fetchEnvironmentDetails] Removed non-master environment` - Cleanup action
- `[fetchEnvironmentDetails] Environments with faulty screens` - Screen dimension issues

**Screen Management:**
- `[waitForScreenDimensions] Waiting for screen * to get dimensions` - Screen polling
- `[waitForScreenDimensions] Screen dimensions populated successfully` - Dimensions OK
- `[waitForScreenDimensions] Max attempts reached` - Timeout
- `[fetchEnvironmentDetails] Activating faulty screen` - Screen activation attempt
- `[fetchEnvironmentDetails] Screen activated with dimensions` - Screen OK
- `[fetchEnvironmentDetails] Creating screen for master environment` - New screen creation

**Refresh Flags:**
- `[fetchEnvironmentDetails] Setting needsRefresh` - First refresh flag
- `[fetchEnvironmentDetails] setItem('needsSecondRefresh)` - Second refresh flag
- `[EnvironmentsContext] needsSecondRefresh detected` - Second refresh triggered

**Environment Creation:**
- `[fetchEnvironmentDetails] 🔨 CREATING NEW ENVIRONMENT` - Env creation start
- `[fetchEnvironmentDetails] Environment created with ID` - Creation success
- `[fetchEnvironmentDetails] Got dimensions from permission` - Screen permission granted

### General EnvironmentsContext
- `[EnvironmentsContext] Render count` - Component render tracking
- `[EnvironmentsContext] House created event` - House creation event received
- `[EnvironmentsContext] Re-fetching environment details` - Post-creation refresh
- `[EnvironmentsContext] Checking for faulty screens` - Screen validation
- `[handlePlaylistChange] New playlist selected` - Playlist navigation