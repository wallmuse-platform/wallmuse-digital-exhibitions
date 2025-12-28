# Wallmuse React Web Player

A React-based media player for displaying synchronized video and image content in playlist sequences. Serves as the foundation for a Progressive Web App (PWA) and will serve as the core for an Electron standalone version.

## 📚 Documentation

All detailed documentation has been organized into the [`/docs`](./docs) folder for better clarity:

### 🏗️ Architecture
- **[WebSocket vs Parent Architecture](./docs/architecture/WEBSOCKET_VS_PARENT_ARCHITECTURE.md)** ✏️ *Updated 2025-12-27*
  - Communication mechanisms, data flow patterns, peer synchronization
- **[WebSocket System](./docs/architecture/WEBSOCKET_SYSTEM.md)** ✏️ *Updated 2025-12-26*
  - WebSocket connection management, command handling, volume control
- **[Track Management Architecture](./docs/architecture/TRACK_MANAGEMENT_ARCHITECTURE.md)** ✅ *New 2025-12-27*
  - Complete system documentation: source of truth, peer sync, signature detection, code pointers
- **[Chunk Delivery Architecture](./docs/architecture/CHUNK_DELIVERY_ARCHITECTURE.md)**
  - HTTP Range requests, video streaming, chunked delivery
- **[Wallmuse WebPlayer Rules](./docs/architecture/WALLMUSE_WEBPLAYER_RULES.md)** ✏️ *Updated 2025-12-27*
  - Core development rules, track management, volume control, media loading patterns

### ✨ Features
- **[Wallmuse WebPlayer Features](./docs/features/WALLMUSE_WEBPLAYER_FEATURES.md)**
  - Complete feature list and capabilities
- **[Multi-Device Implementation Guide](./docs/features/MULTI_DEVICE_IMPLEMENTATION_GUIDE.md)**
  - Cross-device compatibility strategies
- **[Ken Burns Implementation](./docs/features/KEN_BURNS_IMPLEMENTATION.md)**
  - Animated pan/zoom effects for images
- **[360° Media Implementation](./docs/features/IMPLEMENTATION_360_MEDIA.md)** ⚠️ *Not yet implemented*
  - Panoramic and 360° video support (planned)


### 📖 Guides
- **[Developer Quick Start](./docs/guides/DEVELOPER_QUICK_START.md)** ✏️ *Updated 2025-12-26*
  - Get productive in 15 minutes, common problems & fixes
- **[Backend Developer Brief](./docs/guides/BACKEND_DEVELOPER_BRIEF.md)** 📦 *Batch 1: Dec 2025*
  - WebSocket server requirements and integration (more batches to come) 
- **[Troubleshooting Cheat Sheet](./docs/guides/TROUBLESHOOTING_CHEAT_SHEET.md)** ✏️ *Updated 2025-12-26*
  - Quick debug commands, common issues with fixes

### 🔧 Troubleshooting
- **[WebPlayer Troubleshooting](./docs/troubleshooting/WEBPLAYER_TROUBLESHOOTING.md)** ✏️ *Updated 2025-12-26*
  - Complete troubleshooting reference, recent improvements
- **[Playlist Switching Final Analysis](./docs/troubleshooting/PLAYLIST_SWITCHING_FINAL_ANALYSIS.md)**
  - Deep dive into playlist navigation issues
- **[Playlist Bug Summary](./docs/troubleshooting/PLAYLIST_BUG_SUMMARY.md)**
  - Known issues and resolution status

### 📊 Analysis
- **[Fred Original vs Forks Analysis](./docs/analysis/FRED_ORIGINAL_VS_FORKS_ANALYSIS.md)**
  - Comparison of codebase versions
- **[Prod vs Test Comparison](./docs/analysis/PROD_VS_TEST_COMPARISON.md)**
  - Production vs development environment differences

### 📜 History
- **[Changelog 2025-12-22](./docs/history/CHANGELOG_2025_12_22.md)**
  - Recent changes and updates

---

## ⚡ Quick Start

### Installation
```bash
npm install
npm start          # Development server
npm run build      # Production build
```

### Core Architecture
```
Parent App (NavigationManager.js)
└── NAV Commands ('webplayer-navigate' events)
    └── React Webplayer (index.tsx)
        └── WebSocket Communication
            └── Sequencer (timing & logic)
                └── ItemPlayer (media loading)
                    └── App Component (video/image display)
```

### Data Hierarchy
```
Playlist (e.g., 954 or undefined)
├── Montage 0 (74 seconds)
│   ├── Track 0: [Item1, Item2, Item3...]
│   └── Track 1: [ItemA, ItemB, ItemC...]
├── Montage 1 (60 seconds)
│   └── ...
```

---

## 🐛 Debug Commands

```javascript
// System health check
window.debugPlayer()
window.debugSequencerStatus()

// Check video audio status
const videos = document.querySelectorAll('video');
videos.forEach((v, i) => console.log(`Video ${i+1}:`, {muted: v.muted, volume: v.volume}));

// Check current state
console.log({
    videoShown: window.TheApp?.state?.videoShown,
    imageShown: window.TheApp?.state?.imageShown,
    isPlaying: window.Sequencer?.isPlaying()
});
```

---

## 🧪 Testing

### Manual Testing
Open `test-playlist-switching.html` for UI-based testing

### 4 Critical Benchmarks
1. ✅ Play/Pause/Stop buttons work
2. ✅ Playlist switching (e.g., 954 ↔ 955)
3. ✅ Next/Previous montage navigation
4. ✅ goMontage direct navigation
   - 4a. Same playlist ✅
   - 4b. Different playlist (not yet tested)

---

## 🚀 Recent Updates (2025-12-26)

### Console Log Improvements
- **Video Load Warnings**: Changed from `console.error()` to `console.warn()` - these are expected during startup
- **Better Messages**: "Initial load (waiting for media)" instead of "LOAD ERROR"

### Audio Control Fix
- **Problem**: Both video slots were unmuted, causing dual audio
- **Fix**: Only the visible video slot receives volume and is unmuted
- **Impact**: Eliminates audio overlap issue

### UI Improvements
- **Internationalization**: Replaced French placeholders with English
- **Visual Clarity**: Added emoji icons (⏸️ pause, ⚠️ warning)
- **Loading Spinner**: CSS-only circular progress instead of hourglass emoji

See [WebPlayer Troubleshooting](./docs/troubleshooting/WEBPLAYER_TROUBLESHOOTING.md#recent-improvements-2025-12-26) for details.

---

## 📁 Key Files

| Component | Purpose | File |
|-----------|---------|------|
| **Sequencer** | Core timing and navigation | `src/manager/Sequencer.ts` |
| **ItemPlayer** | Media loading coordination | `src/manager/ItemPlayer.ts` |
| **App** | React UI, video/image rendering | `src/App.tsx` |
| **WebSocket** | Server communication | `src/ws/services.ts` |
| **Navigation** | NAV command processing | `src/index.tsx` |

---

## 🎯 Development Standards

### Code Conventions
- **No comments** unless explicitly requested
- **Defensive programming** - always check null/undefined
- **Clear logging** - use prefixes like `[ComponentName.methodName]`
- **Type safety** - use TypeScript types, avoid `any`

### Anti-Patterns ❌
- Special handling for undefined playlist IDs
- Using URL parameters for navigation
- Clearing ALL media state during switches
- Adding setTimeout without cleanup

### Best Practices ✅
- Treat undefined playlists like normal playlists (each account has a default playlist with `undefined` as ID)
- Use NAV commands for all navigation
- Clear only conflicting media state
- Use proper locks and debouncing
- Fix root causes, not symptoms

---

## 🌐 Deployment

### Testing Environment
- **Branch**: `webplayer2B`
- **Purpose**: Development and testing

### Production Environment
- **Branch**: `webplayer2`
- **Build**: `npm run build`
- **Deploy**: Custom rsync scripts to WordPress

---

## 📞 Support

For detailed troubleshooting, see:
- [Troubleshooting Cheat Sheet](./docs/guides/TROUBLESHOOTING_CHEAT_SHEET.md)
- [WebPlayer Troubleshooting](./docs/troubleshooting/WEBPLAYER_TROUBLESHOOTING.md)

Common log filters:
- `[SEQUENCER]` - Core timing and logic
- `[APP-STATE]` - React component state
- `[WS-COMMAND]` - WebSocket messages
- `[TRACK-TIMING]` - Track selection logic

---

**Note**: This is a specialized media player for the Wallmuse platform. Requires specific server infrastructure and WebSocket communication protocols.

**Last Updated**: 2025-12-27
