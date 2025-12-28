# Troubleshooting Cheat Sheet

> **Quick reference for common Wallmuse Web Player issues**

## Debug Commands (Copy-Paste Ready)

### System Status Check
```javascript
// Quick health check
window.debugPlayer()
window.debugSequencerStatus()

// Detailed system state
console.log('System Status:', {
    hasSequencer: !!window.Sequencer,
    hasApp: !!window.TheApp,
    hasPlayer: !!window.ItemPlayer?.ThePlayer,
    isPlaying: window.Sequencer?.isPlaying(),
    playlist: window.Sequencer?.playlist?.id,
    videoShown: window.TheApp?.state?.videoShown,
    imageShown: window.TheApp?.state?.imageShown
});
```

### Media State Check **UPDATED: 2025-12-26**
```javascript
// Check what media is loaded
console.log('Media State:', {
    video1: window.TheApp?.state?.video1?.filename,
    video2: window.TheApp?.state?.video2?.filename,
    image1: window.TheApp?.state?.image1?.filename,
    image2: window.TheApp?.state?.image2?.filename,
    videoShown: window.TheApp?.state?.videoShown,
    imageShown: window.TheApp?.state?.imageShown
});

// Check actual video elements
const videos = document.querySelectorAll('video');
console.log('Video Elements:', Array.from(videos).map((v, i) => ({
    index: i,
    src: v.src || 'no src',
    paused: v.paused,
    muted: v.muted,  // NEW: Check if video is muted
    volume: v.volume,
    readyState: v.readyState,
    hidden: v.classList.contains('hidden')  // NEW: Check if video is hidden
})));

// CRITICAL CHECK: Verify only visible video is unmuted
const videoShown = window.TheApp?.state?.videoShown;
console.log('Audio Status:', {
    videoShown: videoShown,
    video1_muted: videos[0]?.muted,
    video2_muted: videos[1]?.muted,
    correctState: (videoShown === 1 && !videos[0]?.muted && videos[1]?.muted) ||
                  (videoShown === 2 && videos[0]?.muted && !videos[1]?.muted)
});
```

### Storage Queue Check
```javascript
// Check pending operations
console.log('Storage Queue:', {
    exists: !!window.PENDING_APP_OPERATIONS,
    length: window.PENDING_APP_OPERATIONS?.length || 0,
    operations: window.PENDING_APP_OPERATIONS?.map(op => op.type)
});
```

### Playlist Detection
```javascript
// Check playlist type detection
console.log('Playlist Detection:', {
    WM_HAS_VIDEOS: window.WM_HAS_VIDEOS,
    WM_HAS_IMAGES: window.WM_HAS_IMAGES,
    firstArtworkType: window.Sequencer?.playlist?.getMontage(0)?.seqs?.[0]?.items?.[0]?.artwork?.type
});
```

## Common Issues → Quick Fixes

### ❌ Empty UI after playlist switch
```javascript
// CHECK: Storage queue initialized?
!!window.PENDING_APP_OPERATIONS // Should be true

// FIX: If false, check src/index.tsx line ~20 for initialization
```

### ❌ Play/Pause buttons don't work
```javascript
// CHECK: What does pause button actually call?
// Look in src/App.tsx for resumePlaybook() method
// Should call Sequencer.play(), NOT Sequencer.pause()
```

### ❌ Volume slider works but no audio **UPDATED: 2025-12-26**
```javascript
// CHECK: Video element volume
document.querySelector('video')?.volume // Should be 0.0-1.0, not 0-100

// FIX: In src/App.tsx setVolume(), add:
// const normalizedVolume = v / 100;
// video.volume = normalizedVolume;
```

### ❌ Dual audio (hearing two videos at once) **NEW: 2025-12-26**
```javascript
// CHECK: Both videos unmuted?
const videos = document.querySelectorAll('video');
console.log({
    video1_muted: videos[0]?.muted,  // Should be true if video2 is showing
    video2_muted: videos[1]?.muted,  // Should be true if video1 is showing
    videoShown: window.TheApp?.state?.videoShown
});

// ROOT CAUSE: setVolume() was unmuting BOTH video slots
// FIX APPLIED: App.tsx:1036-1067 now only unmutes the visible slot
// Hidden slot is explicitly muted with volume=0
```

### ❌ Montages play 1 second then loop immediately
```javascript
// CHECK: Look for this log pattern
// [Sequencer.loop] POS CALCULATION: pos=0 (WRONG)
// Should be pos=74 (montage duration)

// FIX: In Sequencer.ts, for last montage use:
// pos = position.getOffset() + position.getDuration()
// NOT: pos = player.getNextPositionGlobalOffset()
```

### ❌ Bounds checking errors (Sentry crashes)
```javascript
// CHECK: Array access without bounds checking
// playlist.montages[i] // Dangerous
// playlist.montages[i] && i < playlist.montages.length // Safe

// FIX: Add bounds checking in src/dao/Playlist.ts getMontage()
```

### ❌ Videos show for 67 minutes instead of 1 minute
```javascript
// CHECK: Duration source
// Using montage.duration (4020 seconds) // Wrong
// Using item.duration (60 seconds) // Correct

// FIX: In Sequencer.ts, always use item.duration
```

### ❌ AbortError: play() interrupted by new load
```javascript
// CHECK: Multiple videos loading simultaneously
// Look for rapid-fire showMedia() calls in console

// FIX: Add loading locks in Sequencer.ts:
// if (this.isLoadingMedia) return;
// this.isLoadingMedia = true;
```

### ❌ Image overrides video during playlist switch
```javascript
// CHECK: App.showImage called when video should show
// Look for showImage() logs when expecting showVideo()

// FIX: In App.showImage(), block if video is active:
// if (this.state.videoShown > 0) return;
```

## Log Filters for Debugging

### Filter by component:
- `[SEQUENCER]` - Core timing and navigation
- `[APP-STATE]` - React component updates
- `[WS-COMMAND]` - WebSocket command processing
- `[TRACK-TIMING]` - Track selection logic
- `[GUARD-CHECK]` - System readiness verification

### Filter by issue type:
- `CRITICAL FIX` - Auto-recovery systems
- `BOUNDS` - Array access safety
- `COOLDOWN` - Timing debouncing
- `DRAIN-CHECK` - Operation queue processing

## Test Verification Commands

### Quick benchmark test:
```javascript
// Test play/pause
window.Sequencer.play(0); // Should start playbook
window.Sequencer.pause(); // Should pause
window.Sequencer.play();  // Should resume

// Test playlist switching
// Use test-playlist-switching.html interface
```

### Verify fix worked:
```javascript
// After applying fix, run full system check
window.debugPlayer();
console.log('Fix verification:', {
    issue: 'describe what you fixed',
    wasExpected: 'what should happen now',
    actualResult: 'what actually happens'
});
```

## File Quick Reference

### Most commonly edited files:
- **`src/App.tsx`** - React UI, media display, volume control
- **`src/manager/Sequencer.ts`** - Timing, navigation, montage switching
- **`src/manager/ItemPlayer.ts`** - Media loading coordination
- **`src/index.tsx`** - NAV command handling, app initialization
- **`src/dao/Playlist.ts`** - Data validation, bounds checking

### Test interfaces:
- **`test-playlist-switching.html`** - Manual UI testing
- **Browser console** - Debug commands and system inspection

## Emergency Recovery

### If system completely broken:
```javascript
// Force clean state
window.TheApp?.clearAllMediaState?.();

// Reinitialize storage
window.PENDING_APP_OPERATIONS = [];

// Restart sequencer
window.Sequencer?.stop?.();
window.Sequencer?.play?.(0);
```

### If React unmounted:
```javascript
// Check container exists
document.getElementById('root-wm-player')?.children?.length // Should be > 0

// If empty, may need parent app to remount
// Or use React root recovery if implemented
```

---

**Remember**: Always test the 4 core benchmarks after any fix:
1. Play/Pause/Stop work
2. Next/Previous navigation works
3. Playlist switching works (1039 ↔ 1040)
4. goMontage direct navigation works