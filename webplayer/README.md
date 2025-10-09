# Wallmuse React Web Player

A React-based media player for displaying synchronized video and image content in playlist sequences.

## Quick Start

### For New Developers

1. **Read the Rules First**: Start with `WALLMUSE_WEBPLAYER_RULES.md` - especially sections 1-4
2. **Understand the Architecture**: NAV commands → WebSocket → Sequencer → Media Display
3. **Test Your Setup**: Use `test-playlist-switching.html` to verify functionality
4. **Learn Debug Commands**: Use browser console commands to troubleshoot

### Installation

```bash
# Clone and install
npm install

# Start development server
npm start

# Build for production
npm run build
```

## Core Architecture

```
Parent App (NavigationManager.js)
└── NAV Commands ('webplayer-navigate' events)
    └── React Webplayer (index.tsx)
        └── WebSocket Communication
            └── Sequencer (timing & logic)
                └── ItemPlayer (media loading)
                    └── App Component (video/image display)
```

## Key Components

| Component | Purpose | File |
|-----------|---------|------|
| **Sequencer** | Core timing and montage navigation | `src/manager/Sequencer.ts` |
| **ItemPlayer** | Media loading and playback coordination | `src/manager/ItemPlayer.ts` |
| **App** | React UI, video/image rendering | `src/App.tsx` |
| **WebSocket** | Server communication | `src/ws/services.ts` |
| **Navigation** | NAV command processing | `src/index.tsx` |

## Data Hierarchy

```
Playlist (e.g., 1040 or undefined)
├── Montage 0 (74 seconds)
│   ├── Track 0: [Item1, Item2, Item3...]
│   └── Track 1: [ItemA, ItemB, ItemC...]
├── Montage 1 (60 seconds)
│   ├── Track 0: [Item4, Item5, Item6...]
│   └── Track 1: [ItemD, ItemE, ItemF...]
└── ...
```

## Common Commands

### Development
```bash
npm start          # Development server
npm run build      # Production build
npm test          # Run tests (if available)
```

### Debug Console Commands
```javascript
// Check system status
window.debugPlayer()

// Verify sequencer state
window.debugSequencerStatus()

// Monitor playlist type
console.log('Playlist flags:', {
    WM_HAS_VIDEOS: window.WM_HAS_VIDEOS,
    WM_HAS_IMAGES: window.WM_HAS_IMAGES
})

// Check current video element
window.Sequencer?.getCurrentVideoElement?.()
```

## Testing

### Manual Testing Interface
Open `test-playlist-switching.html` in browser for UI-based testing of:
- Play/Pause/Stop commands
- Playlist switching (1039 ↔ 1040)
- Montage navigation
- Track selection

### 4 Critical Benchmarks
1. **Play/Pause/Stop** - UI buttons affect actual playbook
2. **Track Navigation** - Next/Previous work correctly
3. **Playlist Switching** - Different playlists load media
4. **goMontage** - Direct montage navigation works

## Troubleshooting

### Empty UI After Playlist Switch
```javascript
// Check storage mechanism
console.log('Queue status:', {
    exists: !!window.PENDING_APP_OPERATIONS,
    length: window.PENDING_APP_OPERATIONS?.length || 0
})
```

### Play/Pause Not Working
```javascript
// Check sequencer connection
console.log('Sequencer status:', {
    isPlaying: window.Sequencer?.isPlaying(),
    hasApp: !!window.TheApp,
    videoShown: window.TheApp?.state?.videoShown
})
```

### No Audio Despite Volume Slider
Check if volume conversion is applied (should be 0.0-1.0 for HTML5 video):
```javascript
const video = document.querySelector('video');
console.log('Video volume:', video?.volume); // Should be 0.0-1.0, not 0-100
```

## Development Guidelines

### Before Making Changes
1. Test current functionality with benchmark tests
2. Read relevant sections in `WALLMUSE_WEBPLAYER_RULES.md`
3. Understand the data flow for your area of change
4. Use debug commands to verify system state

### Code Standards
- **No comments** unless explicitly requested
- **Defensive programming** - always check for null/undefined
- **Clear logging prefixes** - `[ComponentName.methodName]`
- **Root cause fixes** - don't patch symptoms

### Anti-Patterns to Avoid
- ❌ Special handling for undefined playlist IDs
- ❌ Using URL parameters for navigation
- ❌ Clearing ALL media state during switches
- ❌ Adding setTimeout without cleanup
- ❌ Patching without understanding root cause

### Best Practices
- ✅ Treat undefined playlists like normal playlists
- ✅ Use NAV commands for all navigation
- ✅ Clear only conflicting media state
- ✅ Use proper locks and debouncing
- ✅ Fix root causes that solve multiple symptoms

## File Structure

```
src/
├── App.tsx                 # Main React component
├── index.tsx              # Entry point, NAV handling
├── component/             # UI components
│   ├── image.tsx         # Image display component
│   └── video.tsx         # Video display component
├── dao/                   # Data objects
│   ├── Playlist.ts       # Playlist management
│   ├── Montage.ts        # Montage structure
│   └── Artwork.ts        # Media content
├── manager/               # Core logic
│   ├── Sequencer.ts      # Timing and navigation
│   ├── ItemPlayer.ts     # Media coordination
│   └── Globals.ts        # Global state
└── ws/                    # WebSocket communication
    └── services.ts        # Server communication
```

## Deployment

### Testing Environment
- **Branch**: `webplayer2B`
- **Purpose**: Development and testing
- **URL**: Local development only

### Production Environment
- **Branch**: `webplayer2`
- **Purpose**: Stable releases
- **Build**: `npm run build`
- **Deploy**: Custom rsync scripts to WordPress

## Support

### Documentation
- `WALLMUSE_WEBPLAYER_RULES.md` - Comprehensive technical guide
- `TODO.md` - Current development tasks
- `CHUNK_DELIVERY_ARCHITECTURE.md` - WebSocket communication details

### Debug Tools
- Browser console debug functions
- `test-playlist-switching.html` - Manual testing interface
- Chrome DevTools for React component inspection
- Network tab for WebSocket message monitoring

### Common Log Prefixes for Filtering
- `[SEQUENCER]` - Core timing and logic
- `[APP-STATE]` - React component state
- `[WS-COMMAND]` - WebSocket messages
- `[TRACK-TIMING]` - Track selection logic
- `[GUARD-CHECK]` - System readiness checks

---

**Note**: This is a specialized media player designed for the Wallmuse platform. It requires specific server infrastructure and WebSocket communication protocols.