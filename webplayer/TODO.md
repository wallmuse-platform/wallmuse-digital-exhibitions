# TODO: Montage Transition Stalling Fix
??//this needs updating, progress was done recently, please recheck//
## Issue Summary
During playlist 1040 playback, there's a long stall at the end of montage 1 when transitioning back to montage 0. The system correctly detects timeout and initiates montage transition, but gets stuck during position calculation.

## Root Cause Analysis (from logs)
- ✅ Timeout detection working: `timeSinceStart: 61.051, expectedDuration: 60`
- ✅ Montage transition logic working: `from: 1, to: 0, expected: 0`
- ❌ **Stall occurs in**: `getNextPosition` calculation for new montage
- ❌ **PlayerPosition objects recreated repeatedly** instead of reused

## Recommended Fixes (Priority Order)

### Option A: Position Calculation Timeout ⚡ (HIGH PRIORITY - 5 mins)
**Problem**: `getNextPosition` method can get stuck in infinite loops during montage transitions
**Solution**: Add timeout mechanism to prevent position calculation from hanging

```typescript
// In Sequencer.ts - getNextPosition method
private static getNextPosition(currentPosition: PlayerPosition, timeout: number = 5000): PlayerPosition | null {
    const startTime = Date.now();
    
    // Existing calculation logic here...
    
    // Add periodic timeout checks within calculation loops
    if (Date.now() - startTime > timeout) {
        console.error('[Sequencer] getNextPosition timeout - returning fallback position');
        return this.createFallbackPosition(currentPosition);
    }
}

private static createFallbackPosition(current: PlayerPosition): PlayerPosition {
    // Return safe position (montage 0, track 0, item 0)
    return new PlayerPosition(0, 0, 0, current.getDuration());
}
```

### Option B: PlayerPosition Caching 🔍 (MEDIUM PRIORITY - 10 mins)
**Problem**: PlayerPosition objects being created repeatedly during transitions
**Solution**: Cache and reuse PlayerPosition objects to prevent recreation loops

```typescript
// Add to Sequencer class
private static positionCache = new Map<string, PlayerPosition>();

private static getCachedPosition(montage: number, track: number, item: number): PlayerPosition | null {
    const key = `${montage}-${track}-${item}`;
    return this.positionCache.get(key) || null;
}

private static cachePosition(position: PlayerPosition): void {
    const key = `${position.getMontageIndex()}-${position.getTrackIndex()}-${position.getItemIndex()}`;
    this.positionCache.set(key, position);
}
```

### Option C: Enhanced Transition Logging 🔍 (LOW PRIORITY - 15 mins)
**Problem**: Need more visibility into exactly where the stall occurs
**Solution**: Add granular logging throughout position calculation

```typescript
// In getNextPosition and related methods
console.log('[DEBUG-POSITION] Step 1: Starting position calculation', currentPosition);
console.log('[DEBUG-POSITION] Step 2: Checking next item in track');
console.log('[DEBUG-POSITION] Step 3: Checking next track in montage');
console.log('[DEBUG-POSITION] Step 4: Checking next montage');
console.log('[DEBUG-POSITION] Step 5: Final position calculated', newPosition);
```

### Option D: Montage Transition State Machine 🚠 (FUTURE - 30+ mins)
**Problem**: Complex transition logic can lead to race conditions
**Solution**: Implement state machine for cleaner transitions

```typescript
enum TransitionState {
    PLAYING = 'playing',
    END_OF_ITEM = 'end_of_item', 
    END_OF_MONTAGE = 'end_of_montage',
    CALCULATING_NEXT = 'calculating_next',
    TRANSITIONING = 'transitioning'
}
```

## Implementation Notes

### Where to Look:
- **Primary**: `Sequencer.ts` - `getNextPosition()` method around line 1527
- **Secondary**: `PlayerPosition.ts` - Constructor and `fromPosition()` methods
- **Logs show**: Stall happens after "About to calculate next position" message

### Success Criteria:
- ✅ No stalls longer than 2 seconds during montage transitions
- ✅ PlayerPosition objects reused instead of recreated unnecessarily  
- ✅ Fallback mechanism prevents infinite loops
- ✅ Smooth cycling between montage 0 ↔ montage 1

### Testing Approach:
1. Test montage 0 → montage 1 transition (should already work)
2. Test montage 1 → montage 0 transition (currently stalls)
3. Test multiple complete cycles (0→1→0→1...)
4. Verify timeout mechanism triggers appropriately

## Current State
- [x] Screen activation consolidation complete
- [x] React root detection fixes applied
- [x] DOM mutation logging optimized
- [ ] **Next**: Fix montage transition stalling
- [ ] PlayerPosition lifecycle optimization
- [ ] Comprehensive transition testing

---
**Last Updated**: September 3, 2025
**Priority**: HIGH - Affects user experience during playlist cycling

---

# 2. Video Autoplay Implementation

### Current Status: DEFERRED

The webplayer currently uses a simplified autoplay approach (`autoPlay={false}`) that works well for its intended audience: newcomers seeking handheld and smart TV solutions as an alternative to the PC player app.

### Why Deferred

Autoplay involves multiple layers of complexity that intersect in non-obvious ways:

1. **HTML5 Video Autoplay vs Sequencer AutoAdvance**
   - HTML `autoplay` attribute controls whether videos start automatically when loaded
   - Sequencer `autoAdvance` controls whether playlist progresses automatically between items
   - These are conceptually different but users expect them to work together

2. **House Autostart Setting**
   - The `House` DAO contains `autostart_playlist` boolean field
   - This setting comes from the parent UI and affects playlist behavior
   - Currently accessible via `wsTools.getHouseAutostart()`

3. **Browser Autoplay Policies**
   - Modern browsers restrict autoplay for user experience
   - Requires user interaction or media to be muted
   - Different policies on mobile vs desktop

4. **React Component State Management**
   - Video components receive props from App state
   - HTML attributes must sync with React props
   - Timing issues between DOM updates and state changes

5. **Sequencer Integration**
   - Backup code exists in `src/manager/Sequencer_backup.ts` with different autoplay concepts
   - Current Sequencer has "natural flow" accommodating command and nav parameters
   - Integration points need careful analysis to avoid conflicts

### Previous Implementation Attempts

**Video Component Changes:**
```typescript
// Attempted interface change (reverted):
interface VideoProps {
    media?: VideoMediaFile;
    hidden: boolean;
    index: number;
    shouldLoad?: boolean;
    autoPlay?: boolean; // ← This was added and reverted
}

// Attempted useEffect for HTML sync (reverted):
React.useEffect(() => {
    if (ref && typeof ref === 'object' && ref.current) {
        const videoElement = ref.current as HTMLVideoElement;
        if (autoPlay) {
            videoElement.setAttribute('autoplay', '');
            videoElement.autoplay = true;
        } else {
            videoElement.removeAttribute('autoplay');
            videoElement.autoplay = false;
        }
    }
}, [autoPlay, index, ref]);
```

**App Component Changes (reverted):**
```typescript
// State addition (reverted):
interface AppState {
    // ... other props
    houseAutostart: boolean; // ← This was added and reverted
}

// Method addition (reverted):
public updateHouseAutostart() {
    const houseAutostart = wsTools.getHouseAutostart();
    if (this.state.houseAutostart !== houseAutostart) {
        console.log('[App] Updating house autostart setting:', houseAutostart);
        this.setState({ houseAutostart });
    }
}

// Prop passing (reverted):
<Video
    autoPlay={this.state.houseAutostart} // ← This was added and reverted
/>
```

### What Works Now

- Videos load and display correctly
- Manual playback controls work
- Playlist progression works via Sequencer
- UI shows autoplay setting correctly
- House autostart data is accessible

### When to Implement

Implement this feature when:
1. Users specifically request autoplay functionality
2. Requirements are clearly defined (HTML autoplay vs Sequencer autoAdvance)
3. Browser compatibility needs are understood
4. Testing strategy is in place for different devices/browsers
5. Sequencer integration approach is decided

### Implementation Strategy (Future)

When implementing, consider this approach:

1. **Analyze Sequencer Integration**
   - Compare current Sequencer with Sequencer_backup
   - Understand autoAdvance vs HTML autoplay relationship
   - Decide on unified autoplay concept

2. **Start with Simple Case**
   - Implement HTML autoplay only first
   - Test browser compatibility across devices
   - Handle browser autoplay policy restrictions

3. **Add Sequencer Integration**
   - Coordinate autoplay with autoAdvance
   - Handle edge cases (network delays, load failures)
   - Test playlist transitions

4. **Add UI Controls**
   - Allow users to override autoplay setting
   - Provide clear feedback about autoplay state
   - Handle browser policy rejections gracefully

### Related Files
- `src/component/video.tsx` - Video component with autoplay prop support
- `src/App.tsx` - Main app component state management
- `src/dao/House.ts` - House data with autostart_playlist field
- `src/ws/ws-tools.ts` - getHouseAutostart() method
- `src/manager/Sequencer.ts` - Current sequencer implementation
- `src/manager/Sequencer_backup.ts` - Alternative sequencer with different autoplay concepts

### Testing Requirements (Future)

- Cross-browser testing (Chrome, Firefox, Safari, Edge)
- Mobile device testing (iOS Safari, Android Chrome)
- Smart TV testing (various WebView implementations)
- Network condition testing (slow/intermittent connections)
- User interaction requirement testing (autoplay policies)

---

**Autoplay Last Updated:** 2025-09-25
**Reason for Deferral:** Current behavior is acceptable for webplayer's target audience (newcomers, handheld, smart TV solutions)