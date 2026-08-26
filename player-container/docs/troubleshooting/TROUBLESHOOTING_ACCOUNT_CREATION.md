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

## WooCommerce Hook — Critical Note

### Problem: `woocommerce_thankyou` Never Fires
The WordPress Redirection plugin fires at `template_redirect`, sending a 301 redirect before WooCommerce's order-received template loads. This means `woocommerce_thankyou` — which fires inside that template — never executes, so new accounts are never registered in the Wallmuse backend.

### Fix (applied in `functions.php`)
Use `woocommerce_checkout_order_processed` instead — it fires during order processing before any redirect:
```php
add_action('woocommerce_checkout_order_processed', 'register_user_to_manager_debug', 10, 1);
```

### Duplicate Prevention
The backend may return `<error>Contact already used: [name]</error>` when an account already exists (e.g., user registered on sharex.wallmuse.com first). Without proper handling, this caused infinite retry loops. Fix: treat "already used" responses as success and mark the order as processed:
```php
} elseif (strpos($response_body, 'already used') !== false) {
    update_post_meta($order_id, '_wm_user_registered', true);
}
```

## Playlist Copy Auto-Reload

After copying playlists from a guest account to the new personal account, `fetchEnvironmentDetails` dispatches a `screen-needs-refresh` event and triggers an automatic page reload after 1.5 seconds:
```js
window.dispatchEvent(new CustomEvent("screen-needs-refresh"));
setTimeout(() => window.location.reload(), 1500);
```
This is necessary because `useInitialData` fetches playlists on mount before the guest→personal copy completes. Without this reload, the playlists panel shows empty even though the data exists in the backend.

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
- **Environment creation** handled at two levels:
  - **Parent (EnvironmentsContext)**: creates environment + screen via REST API, so `get_wp_user` returns it immediately and Configure shows it
  - **Child WebPlayer (TypeScript)**: creates environment via WebSocket; this one is NOT returned by `get_wp_user` — it only appears after a second refresh
- **Race conditions** between initial mount and house-created event possible
- **Critical**: If the REST API creation block in `fetchEnvironmentDetails` is removed, new accounts will show 0 environments in Configure even though the player works (the WebSocket environment is invisible to the REST endpoint)

### Server-Side Investigation (Aug 2026)
Checked with the backend whether `add_environment` has a server-side bug causing the duplicate. Verdict: **no server-side bug** — the double creation is an architectural consequence of two independent creation paths, not faulty dedup logic.

**Authentication is not the issue.** `this.get()` (line 1437) automatically appends `&session=` + `this.token` to every call, so `checkAccessByHouse` always receives a valid `sessionId`. The URL in the code looks session-less but isn't.

**Why dedup can't catch the duplicate:** `getEnvironmentWithNameAndKey` matches on name AND any of the provided keys.
1. Parent (`EnvironmentsContext` REST) creates env A with its own keys.
2. Child WebPlayer then calls `add_environment?keys={newUUID},{fingerprint}` — neither key exists on env A, so no match is found, and env B gets created.
3. The server is behaving correctly here — it has no way to know env A and the child's request belong to the same session. The fingerprint only dedupes within the *child's own* reconnect cycles (returning user, fingerprint already stored → match found → no new env); it can't dedupe across the two different code paths (REST vs WebSocket).

**Real issue found — key accumulation.** Every time `add_environment` returns an existing environment via fingerprint match (a normal reconnect), lines 327–333 save the new random UUID as an *additional* key on that environment. This isn't a correctness bug, but over many sessions it silently grows `wmm_environment_key` rows indefinitely. Worth a periodic cleanup or capping keys per environment server-side.

**Open question — post-cleanup dangling reference.** After `needsSecondRefresh` deletes env B (the child's environment), the child still has env B's ID in localStorage. On the next load, `environ.house` is already set so `add_environment` is skipped (line 1177) — but the child then tries to operate on a deleted environment. Whether this actually breaks anything depends on what the child does when it gets a 510/unknown-environment error back from the server. **Next step: check whether that error path triggers a localStorage clear + re-creation, or whether it silently fails.**

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
- `activationComplete` - Set by `ActivateAccount.js` when user clicks Activate. **Must be removed in App.js "completed" branch** — if left in localStorage it causes the "Account created!" snackbar to re-trigger on every subsequent page load for existing users
- `needsRefresh` - First refresh needed for screen setup (set by EnvironmentsContext after environment creation)
- `needsSecondRefresh` - Second refresh for duplicate environment cleanup (active, used in EnvironmentsContext)
- `newAccountHouseId` - House ID for new account
- `activationInProgress` - Account creation in progress, guards against double-activation

### Why `accountJustCreated` is always null in ActivateAccount
`SessionContext.js:206` sets `accountJustCreated: 'true'` when the house is first created. However, `EnvironmentsContext.js:329` removes it immediately after successful playlist copy — which completes before `ActivateAccount` renders on the same page. As a result, `ActivateAccount` always logs `Is newly created account: false` and `accountJustCreated: null`. This is expected behaviour, not a bug.

The "Your personal account has been created!" validation snackbar fires through the `needsRefresh` path in App.js (~line 1482), not through `accountJustCreated`. Do not use `accountJustCreated` presence in `ActivateAccount` logs as a signal that account creation failed.

## Possible Improvements

### No-op `useGuestActionPopup` refresh on post-reload mount
On the page load after `needsRefresh` triggers a reload, `useGuestActionPopup` fires a user-status refresh where old and new token are identical:
```
[useGuestActionPopup] Refreshing user status, old: wp-guest_...-1-... new: wp-guest_...-1-...
```
The reload already delivered the correct session; the check finds nothing changed. Not harmful, but the refresh could be skipped when the token is known to be stable (e.g. guard with `if (old !== new)` before triggering downstream effects).

### 1-2 ActivateAccount render is a no-op
After the `needsRefresh` reload, `ActivateAccount` mounts once before `App.js` has set `phase: COMPLETED`. At that point all flags are null so it exits immediately without doing anything. Gating `ActivateAccount` rendering on the phase having a non-initial value would eliminate this render, but the complexity cost is likely not worth it for now.

---

## Environment Types
- **Master Environment** - Has IP `127.0.0.1`, proper screen dimensions
- **Duplicate Environment** - No IP, faulty screen dimensions `0x0`
- **Desktop Environments** - Created by desktop PC player app (different flow)

## Plugin Site Guest Creation (`data-plugin="true"`)

### Problem
On a museum running the WallMuse WordPress plugin, `POST /wp-json/wallmuse/v1/create-guest-user` returns 404 because the plugin has no such endpoint by default. The guest creation falls back to the numeric wallmuse.com user ID (e.g. `29827`), which is not a valid session token and breaks the reload flow.

### How It Works (Fixed)
The plugin endpoint lives in `includes/guest.php`. It receives the session token obtained client-side and sets a short-lived cookie so PHP can serve it on the next page load.

**Client flow (`cloneGuest.js`, gated on `data-plugin === "true"`):**
1. `addUser(...)` → `newUser.api_key`
2. `registerDomain(api_key, hostname)` — scopes the account to this museum's domain
3. `authenticateWithKey(api_key)` → `session` (domain-scoped token, e.g. `wp-guest_...-12-...`)
4. `createGuestWordPressUser(id, login, session)` — POSTs `{ guest_id, guest_login, session }` to the plugin endpoint

**Plugin endpoint (`wallmuse/v1/create-guest-user`):**
- Reads `session` from the POST body
- Sets `wallmuse_guest_session` cookie (1 hour, httponly, SameSite=Lax)
- Returns `{ session_id: session }`

**On page reload (`shortcode.php`):**
- `wallmuse_player_shortcode` checks `$_COOKIE['wallmuse_guest_session']` before falling back to the demo token
- Serves the guest session in `data-user` so `getUserId()` reads the correct token from the DOM

### wallmuse.com behaviour (no `data-plugin`)
The `registerDomain`/`authenticateWithKey`/`session` calls are skipped entirely. wallmuse.com's own `create-guest-user` endpoint handles session creation server-side and returns `{ session_id: <wp_user_id> }` (a numeric WP user ID, not a session token). The actual session comes from the WP auth cookie; PHP serves the proper `wp-guest_...` token on reload via `wallmuse_get_user_token()`.

### Cross-origin WS calls not visible in Network inspector
`addUser`, `registerDomain`, and `authenticateWithKey` all call `wallmuse.com:8443` via axios. When viewed from a plugin site (`museum.local`), these cross-origin requests do not appear in the browser Network panel — only in the console logs. Confirm success by checking for `[api] User created successfully` and `[api] authenticateWithKey token:` in the console.

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
