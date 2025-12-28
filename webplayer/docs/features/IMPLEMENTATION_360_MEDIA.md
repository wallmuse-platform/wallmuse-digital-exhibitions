# 360° Media Support Implementation Guide

## Executive Summary

This document outlines the implementation strategy for adding 360° panoramic image and video support to the Wallmuse Webplayer. The solution integrates seamlessly with the existing WebSocket-driven architecture and maintains backward compatibility with standard 2D media.

---

## Table of Contents

1. [Technology Recommendation](#technology-recommendation)
2. [Architecture Overview](#architecture-overview)
3. [Time Estimates](#time-estimates)
4. [Backend Changes](#backend-changes)
5. [Frontend Implementation](#frontend-implementation)
6. [Integration Points](#integration-points)
7. [Testing Strategy](#testing-strategy)
8. [Risks & Mitigation](#risks--mitigation)
9. [Future Enhancements](#future-enhancements)

---

## Technology Recommendation

### Primary Choice: React-Three-Fiber (R3F)

**Why React-Three-Fiber?**
- ✅ Active development and strong community support (2025)
- ✅ Perfect fit with existing React architecture
- ✅ Seamless WebSocket command integration
- ✅ Supports WebGPU for better performance
- ✅ Handles both 360° images and videos
- ✅ Maintains existing double-buffering pattern
- ✅ Future-proof for VR/WebXR headset support

**Alternative Considered: React 360**
- ❌ Archived and no longer maintained by Meta
- ❌ No updates since 2019
- ❌ Not recommended for new projects in 2025

**Other Alternatives:**
- **Pannellum**: Lightweight (~30KB), production-ready, but less flexible for future 3D features
- **Photo Sphere Viewer**: Built on Three.js, feature-rich, good middle ground
- **A-Frame**: Alternative VR framework, but less React-native integration

**Decision: Use React-Three-Fiber** for best long-term support and integration.

---

## Architecture Overview

### Current Media Handling System

```
WebSocket Message → WsTools → CommandsManager → Sequencer → ItemPlayer → MediaFile → App Component
```

### Existing Media Types

```typescript
MediaFile (abstract)
├── ImageMediaFile (2D images: JPG, PNG)
├── VideoMediaFile (2D videos: MP4, MOV)
├── EmptyMediaFile (placeholder)
└── MultiImageMediaFile (PSD layers - currently unused)
```

### New 360° Media Architecture

```typescript
MediaFile (abstract)
├── ImageMediaFile
├── VideoMediaFile
├── Panoramic360MediaFile ← NEW
│   ├── is360Video: boolean
│   ├── Supports equirectangular projection
│   └── Works with WebSocket commands
└── EmptyMediaFile
```

### Double-Buffering Pattern (Unchanged)

```typescript
// App State
{
  image1, image2, imageShown,      // 2D images
  video1, video2, videoShown,      // 2D videos
  panoramic1, panoramic2, panoramicShown  // 360° content (NEW)
}
```

### Component Flow

```
1. WebSocket sends: { type: '360_IMAGE', url: 's3://...', ... }
2. Sequencer.showMedia() detects artwork.type === '360_IMAGE'
3. ItemPlayer.getMedia() creates Panoramic360MediaFile
4. TheApp.showPanoramic() updates state
5. <Panoramic360> component renders with R3F Canvas
6. User can rotate view with mouse/touch
```

---

## Time Estimates

### Backend Changes (S3 + API)

| Task | Time | Notes |
|------|------|-------|
| Database schema update | 30-60 min | Add '360_IMAGE', '360_VIDEO' enum values |
| API response updates | 30 min | Ensure Artwork.type supports new values |
| Admin/CMS UI changes | 1-2 hours | Add checkbox to mark content as 360° |
| Testing | 30-60 min | Upload test files, verify API response |
| **Total Backend** | **2.5-4.5 hours** | Could be as little as 2 hours if flexible |

### Frontend Changes (Webplayer)

| Phase | Task | Time | Files |
|-------|------|------|-------|
| **Phase 1** | Setup & Dependencies | 2-3 hours | package.json, new files |
| | • npm install three @react-three/fiber @react-three/drei | | |
| | • Create Panoramic360MediaFile.ts | | src/media/ |
| | • Create panoramic360.tsx component | | src/component/ |
| | • Add App.tsx state (panoramic1/2/Shown) | | src/App.tsx |
| **Phase 2** | System Integration | 3-5 hours | Multiple files |
| | • Update FileHelper.ts detection | | src/manager/FileHelper.ts |
| | • Update ItemPlayer.getMedia() | | src/manager/ItemPlayer.ts |
| | • Update Sequencer.showMedia() | | src/manager/Sequencer.ts |
| | • Add App methods (show/preload) | | src/App.tsx |
| **Phase 3** | Controls & UX | 2-4 hours | Component + CSS |
| | • OrbitControls for rotation | | src/component/panoramic360.tsx |
| | • CSS styling & transitions | | src/App.css |
| | • Loading states | | src/component/panoramic360.tsx |
| | • Z-index layering | | src/App.css |
| **Phase 4** | Video Support | 2-3 hours | Media file + component |
| | • Video texture handling | | src/component/panoramic360.tsx |
| | • Play/pause integration | | src/media/Panoramic360MediaFile.ts |
| | • Volume control | | src/media/Panoramic360MediaFile.ts |
| | • Seek support | | src/App.tsx |
| **Phase 5** | Testing & Polish | 1-2 hours | All files |
| | • WebSocket command testing | | |
| | • Mixed playlist transitions | | |
| | • Performance optimization | | |
| | • Browser compatibility | | |
| **Total Frontend** | | **10-17 hours** | |

### Total Project Estimates

| Scenario | Backend | Frontend | **Total** |
|----------|---------|----------|-----------|
| **Optimistic** | 2 hours | 8 hours | **10 hours** |
| **Realistic** | 3 hours | 12 hours | **15 hours** |
| **Conservative** | 4 hours | 16 hours | **20 hours** |

### Minimum Viable Product (MVP)

**MVP: 360° Images Only (No Video)**
- Time: 4-6 hours frontend + 2-3 hours backend = **6-9 hours total**
- Includes: Basic rendering, rotation controls, WebSocket integration
- Excludes: Video textures, advanced controls, polish

---

## Backend Changes

### 1. Database Schema

**Add new artwork types:**

```sql
-- Example PostgreSQL migration
ALTER TYPE artwork_type_enum ADD VALUE IF NOT EXISTS '360_IMAGE';
ALTER TYPE artwork_type_enum ADD VALUE IF NOT EXISTS '360_VIDEO';
```

Or if using string types:

```sql
-- Update validation to allow new types
-- Existing: 'VID', 'IMG', 'AUD', 'HTML', 'TEXT'
-- New: '360_IMAGE', '360_VIDEO'
```

### 2. S3 Storage

**No changes required!** ✅

360° content uses standard file formats:
- **360° Images**: JPEG, PNG (equirectangular projection)
- **360° Videos**: MP4, MOV (equirectangular projection)

Upload process remains identical to existing media.

### 3. API Response

**Ensure Artwork object includes type:**

```json
{
  "artwork_id": 12345,
  "title": "360 Panorama Test",
  "type": "360_IMAGE",  // ← New value
  "url": "https://s3.amazonaws.com/.../panorama.jpg",
  "filename": "panorama.jpg",
  "width": 4096,
  "height": 2048,
  "duration": 10.0,
  "codecs": null
}
```

### 4. Admin/CMS Interface

Add UI to mark content as 360°:

```
[✓] This is 360° content
    Type: ( ) 360° Image  (•) 360° Video
```

Or auto-detect based on aspect ratio:
- Equirectangular: 2:1 aspect ratio (e.g., 4096x2048)
- Cubemap: 6:1 or 1:6 aspect ratio

### 5. Content Guidelines

**Recommended Specifications:**

| Format | Resolution | Aspect Ratio | File Size |
|--------|-----------|--------------|-----------|
| 360° Image | 4096 x 2048 | 2:1 | 2-8 MB |
| 360° Image (High) | 8192 x 4096 | 2:1 | 8-20 MB |
| 360° Video | 3840 x 1920 (4K) | 2:1 | 50-200 MB/min |
| 360° Video (High) | 7680 x 3840 (8K) | 2:1 | 200-500 MB/min |

**Codec Recommendations:**
- Video: H.264 (compatibility), VP9/AV1 (quality)
- Image: JPEG (best performance), PNG (lossless)

---

## Frontend Implementation

### Step 1: Install Dependencies

```bash
npm install three @react-three/fiber @react-three/drei
```

**Package Sizes:**
- `three`: ~600KB (3D engine)
- `@react-three/fiber`: ~70KB (React renderer for Three.js)
- `@react-three/drei`: ~200KB (helper components)

### Step 2: Create Panoramic360MediaFile

**File:** `src/media/Panoramic360MediaFile.ts`

```typescript
import { MediaFile } from './MediaFile';
import { Shape } from '../dao/Shape';
import { TheApp } from '../manager/Globals';

export class Panoramic360MediaFile extends MediaFile {
  public is360Video: boolean;

  constructor(
    artworkId: number,
    id: string,
    url: string,
    filename: string,
    offset: number,
    duration: number,
    isVideo: boolean,
    shapes?: Shape[],
    backgroundColor?: string
  ) {
    super(artworkId, id, url, filename, offset, duration, shapes, backgroundColor);
    this.is360Video = isVideo;
  }

  public static getPanoramic(
    artworkId: number,
    id: string,
    url: string,
    filename: string,
    offset: number,
    duration: number,
    isVideo: boolean,
    shapes?: Shape[],
    backgroundColor?: string
  ): Panoramic360MediaFile {
    return new Panoramic360MediaFile(
      artworkId,
      id,
      url,
      filename,
      offset,
      duration,
      isVideo,
      shapes,
      backgroundColor
    );
  }

  public start(offset: number): void {
    console.log(`[Panoramic360MediaFile] Starting 360° ${this.is360Video ? 'video' : 'image'}: ${this.filename}`);

    if (TheApp) {
      TheApp.showPanoramic(this);
    } else {
      console.warn('[Panoramic360MediaFile] TheApp not ready');
      if (window.PENDING_APP_OPERATIONS) {
        window.PENDING_APP_OPERATIONS.push({
          type: 'showPanoramic',
          media: this,
          timestamp: Date.now(),
        });
      }
    }
  }

  public loadUrl(url: string): void {
    this.url = url;
  }

  public isVideo(): boolean {
    return this.is360Video;
  }

  public load(callback: () => void): void {
    // Preloading handled by Three.js TextureLoader or VideoTexture
    callback();
  }

  public stop(): void {
    console.log(`[Panoramic360MediaFile] Stopping 360° media: ${this.filename}`);
  }

  public getRealMedia(): MediaFile {
    return this;
  }
}
```

### Step 3: Create Panoramic360 Component

**File:** `src/component/panoramic360.tsx`

```typescript
import React, { useRef, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useTexture, useVideoTexture } from '@react-three/drei';
import * as THREE from 'three';
import { Panoramic360MediaFile } from '../media/Panoramic360MediaFile';

interface Props {
  media: Panoramic360MediaFile;
  hidden: boolean;
  index: 1 | 2;
  shouldLoad?: boolean;
}

// Inner sphere component that uses textures
const PanoramicSphere: React.FC<{ url: string; isVideo: boolean }> = ({ url, isVideo }) => {
  const texture = isVideo
    ? useVideoTexture(url, { start: true, crossOrigin: 'anonymous' })
    : useTexture(url);

  useEffect(() => {
    if (texture) {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
    }
  }, [texture]);

  return (
    <mesh>
      <sphereGeometry args={[500, 60, 40]} />
      <meshBasicMaterial
        map={texture}
        side={THREE.BackSide}
        toneMapped={false}
      />
    </mesh>
  );
};

// Loading fallback
const LoadingFallback: React.FC = () => (
  <mesh>
    <sphereGeometry args={[500, 60, 40]} />
    <meshBasicMaterial color="#000000" side={THREE.BackSide} />
  </mesh>
);

export const Panoramic360 = React.forwardRef<HTMLDivElement, Props>(
  ({ media, hidden, index, shouldLoad = true }, ref) => {
    const className = hidden ? 'panoramic hidden' : 'panoramic';
    const zIndex = hidden ? 0 : 3; // Above video (2) and image (2) layers

    console.log(`[Panoramic360] Rendering panoramic${index}:`, {
      filename: media.filename,
      hidden,
      shouldLoad,
      isVideo: media.isVideo(),
    });

    if (!shouldLoad || !media.url) {
      return (
        <div
          ref={ref}
          className={className}
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            zIndex,
          }}
        />
      );
    }

    return (
      <div
        ref={ref}
        className={className}
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          top: 0,
          left: 0,
          zIndex,
        }}
      >
        <Canvas
          camera={{ position: [0, 0, 0.1], fov: 75 }}
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance',
          }}
        >
          <Suspense fallback={<LoadingFallback />}>
            <PanoramicSphere url={media.url} isVideo={media.isVideo()} />
          </Suspense>
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            rotateSpeed={-0.5}
            enableDamping
            dampingFactor={0.05}
          />
        </Canvas>
      </div>
    );
  }
);

Panoramic360.displayName = 'Panoramic360';
```

### Step 4: Update FileHelper

**File:** `src/manager/FileHelper.ts`

```typescript
export class FileHelper {
  public static isImage(f: string) {
    const ext = this.getExtension(f);
    return ext === 'jpg' || ext === 'jpeg' || ext === 'png';
  }

  public static isPSD(f: string) {
    const ext = this.getExtension(f);
    return ext === 'psd';
  }

  public static isVideo(f: string) {
    const ext = this.getExtension(f);
    return ext === 'mp4' || ext === 'mov';
  }

  // NEW: 360° detection methods
  public static is360Image(f: string, type?: string) {
    // Can detect by type from backend or by naming convention
    return type === '360_IMAGE' || f.includes('_360') || f.includes('panorama');
  }

  public static is360Video(f: string, type?: string) {
    return type === '360_VIDEO' || (this.isVideo(f) && (f.includes('_360') || f.includes('panorama')));
  }

  public static getExtension(ext: string) {
    const p = ext.lastIndexOf('.');
    if (p >= 0) {
      return ext.substring(p + 1).toLowerCase();
    } else {
      return '';
    }
  }
}
```

### Step 5: Update ItemPlayer.getMedia()

**File:** `src/manager/ItemPlayer.ts` (around line 122)

```typescript
import { Panoramic360MediaFile } from '../media/Panoramic360MediaFile';

public static getMedia(
  aid: number,
  id: string,
  url: string | undefined,
  codecs: string | undefined,
  filename: string | undefined,
  type: string,
  offset: number,
  duration: number,
  loop: boolean,
  shapes: Shape[] | undefined,
  backgroundColor: string | undefined
): MediaFile {
  if (!filename || !url) {
    if (shapes) {
      return MediaFile.getEmpty(id, offset, duration, shapes, backgroundColor);
    } else {
      LogHelper.log('MediaFile.get', 'No filename or url or shape in media');
      return this.getPlaceholder(duration);
    }
  }
  // NEW: Check for 360° content first
  else if (type === '360_IMAGE' || FileHelper.is360Image(filename, type)) {
    return Panoramic360MediaFile.getPanoramic(
      aid,
      id,
      url,
      filename,
      offset,
      duration,
      false, // isVideo = false
      shapes,
      backgroundColor
    );
  }
  else if (type === '360_VIDEO' || FileHelper.is360Video(filename, type)) {
    return Panoramic360MediaFile.getPanoramic(
      aid,
      id,
      url,
      filename,
      offset,
      duration,
      true, // isVideo = true
      shapes,
      backgroundColor
    );
  }
  else if (FileHelper.isImage(filename)) {
    return ImageMediaFile.getImage(
      aid,
      id,
      url!,
      filename!,
      offset,
      duration,
      shapes,
      backgroundColor
    );
  }
  else if (FileHelper.isVideo(filename)) {
    return VideoMediaFile.getVideo(
      aid,
      id,
      url,
      codecs,
      filename,
      offset,
      duration,
      loop,
      shapes,
      backgroundColor
    );
  }
  else {
    LogHelper.log('MediaFile.get', 'Unrecognized media format: ' + filename);
    return this.getPlaceholder(duration);
  }
}
```

### Step 6: Update App.tsx State

**File:** `src/App.tsx` (around line 18)

```typescript
import { Panoramic360 } from './component/panoramic360';
import { Panoramic360MediaFile } from './media/Panoramic360MediaFile';

interface AppState {
  image1?: ImageMediaFile;
  image2?: ImageMediaFile;
  imageShown: number;
  imagePreloading: number;
  video1?: VideoMediaFile;
  video2?: VideoMediaFile;
  videoShown: number;
  videoPreloading: number;
  // NEW: 360° panoramic state
  panoramic1?: Panoramic360MediaFile;
  panoramic2?: Panoramic360MediaFile;
  panoramicShown: number;
  panoramicPreloading: number;
  volume: number;
  fadeClass: string;
  loading: boolean;
  renderKey: number;
  forceRender: boolean;
  pendingSeekOffset: number;
}

// Update initial state (around line 53)
state: AppState = {
  imageShown: 0,
  videoShown: 0,
  imagePreloading: 0,
  videoPreloading: 0,
  panoramicShown: 0,      // NEW
  panoramicPreloading: 0, // NEW
  volume: 0,
  fadeClass: 'fadeinout out',
  loading: true,
  renderKey: Date.now(),
  forceRender: false,
  pendingSeekOffset: 0,
};

// Add refs (around line 68)
private panoramic1Ref = React.createRef<HTMLDivElement>();
private panoramic2Ref = React.createRef<HTMLDivElement>();

// Add methods (add after showVideo/showImage methods)
public showPanoramic(media: Panoramic360MediaFile) {
  console.log('[App.showPanoramic] Showing 360° media:', media.filename);

  if (this.state.panoramicShown === 1) {
    this.setState({ panoramic2: media, panoramicShown: 2 });
  } else {
    this.setState({ panoramic1: media, panoramicShown: 1 });
  }

  // Hide 2D media when showing 360°
  this.setState({
    videoShown: 0,
    imageShown: 0,
  });
}

public preloadPanoramic(media: Panoramic360MediaFile) {
  console.log('[App.preloadPanoramic] Preloading 360° media:', media.filename);

  if (this.state.panoramicShown === 1) {
    this.setState({ panoramic2: media, panoramicPreloading: 2 });
  } else {
    this.setState({ panoramic1: media, panoramicPreloading: 1 });
  }
}

// Update render method to include panoramic components
render() {
  return (
    <div id="app" className="App">
      <div id="wm-player-contents">
        {/* Existing image components */}
        <Image
          ref={this.image1Ref}
          media={this.state.image1!}
          hidden={this.state.imageShown !== 1}
          index={1}
          shouldLoad={true}
        />
        <Image
          ref={this.image2Ref}
          media={this.state.image2!}
          hidden={this.state.imageShown !== 2}
          index={2}
          shouldLoad={true}
        />

        {/* Existing video components */}
        <Video
          ref={this.video1Ref}
          media={this.state.video1!}
          hidden={this.state.videoShown !== 1}
          index={1}
          shouldLoad={true}
        />
        <Video
          ref={this.video2Ref}
          media={this.state.video2!}
          hidden={this.state.videoShown !== 2}
          index={2}
          shouldLoad={true}
        />

        {/* NEW: 360° panoramic components */}
        {this.state.panoramic1 && (
          <Panoramic360
            ref={this.panoramic1Ref}
            media={this.state.panoramic1}
            hidden={this.state.panoramicShown !== 1}
            index={1}
            shouldLoad={true}
          />
        )}
        {this.state.panoramic2 && (
          <Panoramic360
            ref={this.panoramic2Ref}
            media={this.state.panoramic2}
            hidden={this.state.panoramicShown !== 2}
            index={2}
            shouldLoad={true}
          />
        )}
      </div>
    </div>
  );
}
```

### Step 7: Add CSS Styles

**File:** `src/App.css`

```css
/* Existing styles... */

/* NEW: 360° Panoramic styles */
.panoramic {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  transition: opacity 0.5s ease-in-out;
  opacity: 1;
}

.panoramic.hidden {
  opacity: 0;
  pointer-events: none;
}

/* Ensure canvas fills container */
.panoramic canvas {
  width: 100% !important;
  height: 100% !important;
  display: block;
}
```

### Step 8: Update Sequencer (Optional)

**File:** `src/manager/Sequencer.ts`

The Sequencer doesn't need changes if ItemPlayer.getMedia() handles the detection. However, you can add explicit handling if needed:

```typescript
// In showMedia() method, the existing logic should work:
// ItemPlayer.getMedia() will return Panoramic360MediaFile
// The media.start() will call TheApp.showPanoramic()
// No additional changes needed!
```

---

## Integration Points

### WebSocket Commands (No Changes Required) ✅

All existing commands work automatically:

```javascript
// Backend sends
{
  "command": "goMontage",
  "montageIndex": 5,
  "item": {
    "artwork": {
      "type": "360_IMAGE",  // ← Only change needed
      "url": "https://s3.../panorama.jpg",
      "filename": "panorama.jpg"
    }
  }
}

// Flow (unchanged):
// 1. WsTools receives command
// 2. CommandsManager processes it
// 3. Sequencer calls showMedia()
// 4. ItemPlayer.getMedia() detects '360_IMAGE'
// 5. Creates Panoramic360MediaFile
// 6. Calls TheApp.showPanoramic()
// 7. React renders <Panoramic360> component
```

**Supported Commands:**
- ✅ `next` - Navigate to next item (works with 360°)
- ✅ `prev` - Navigate to previous item
- ✅ `goMontage` - Jump to specific montage with 360° content
- ✅ `play` - Play 360° video
- ✅ `pause` - Pause 360° video
- ✅ `stop` - Stop playback

### Mixed Playlists

The system handles mixed content seamlessly:

```
Montage 1: Item 1 (2D Image) → Item 2 (360° Image) → Item 3 (2D Video)
Montage 2: Item 1 (360° Video) → Item 2 (2D Image)
```

**Z-Index Layering:**
- 360° Panoramic: `z-index: 3` (top layer)
- 2D Video: `z-index: 2`
- 2D Image: `z-index: 2`

When 360° content displays, it automatically hides 2D layers.

### Double-Buffering Pattern

Same pattern as existing video/image:

```typescript
// Slot 1 shows current content
panoramic1: Panoramic360MediaFile { url: 'current.jpg' }
panoramicShown: 1

// Slot 2 preloads next content
panoramic2: Panoramic360MediaFile { url: 'next.jpg' }
panoramicPreloading: 2

// On transition: swap slots
panoramicShown: 2 // Now shows 'next.jpg'
// Slot 1 becomes available for next preload
```

---

## Testing Strategy

### Unit Tests

```typescript
// Test FileHelper detection
describe('FileHelper', () => {
  it('should detect 360° images by type', () => {
    expect(FileHelper.is360Image('test.jpg', '360_IMAGE')).toBe(true);
  });

  it('should detect 360° images by naming convention', () => {
    expect(FileHelper.is360Image('panorama_360.jpg')).toBe(true);
  });

  it('should detect 360° videos', () => {
    expect(FileHelper.is360Video('test.mp4', '360_VIDEO')).toBe(true);
  });
});

// Test ItemPlayer.getMedia()
describe('ItemPlayer', () => {
  it('should create Panoramic360MediaFile for 360_IMAGE type', () => {
    const media = ItemPlayer.getMedia(
      123, 'id', 'url', null, 'test.jpg', '360_IMAGE',
      0, 10, false, [], null
    );
    expect(media).toBeInstanceOf(Panoramic360MediaFile);
    expect((media as Panoramic360MediaFile).is360Video).toBe(false);
  });

  it('should create Panoramic360MediaFile for 360_VIDEO type', () => {
    const media = ItemPlayer.getMedia(
      123, 'id', 'url', null, 'test.mp4', '360_VIDEO',
      0, 10, false, [], null
    );
    expect(media).toBeInstanceOf(Panoramic360MediaFile);
    expect((media as Panoramic360MediaFile).is360Video).toBe(true);
  });
});
```

### Integration Tests

**Test Scenarios:**

1. **360° Image Display**
   - Load playlist with 360° image
   - Verify sphere renders
   - Verify rotation controls work
   - Verify proper z-index (above 2D content)

2. **360° Video Playback**
   - Load 360° video
   - Verify playback starts
   - Test play/pause commands
   - Test volume control
   - Test seek functionality

3. **Mixed Content Transitions**
   - Create playlist: 2D Image → 360° Image → 2D Video → 360° Video
   - Test `next` command through all transitions
   - Verify proper hiding/showing of layers
   - Verify no memory leaks (check Chrome DevTools)

4. **WebSocket Commands**
   - Test `goMontage` to 360° content
   - Test `next`/`prev` navigation
   - Test `play`/`pause` on 360° video
   - Verify commands work identically to 2D content

5. **Double-Buffering**
   - Load 360° content while other 360° content plays
   - Verify smooth transition with no flicker
   - Check that preloading works (network tab)

### Performance Tests

**Metrics to Monitor:**

| Metric | Target | Tool |
|--------|--------|------|
| Initial load time | < 2s for 4K image | Chrome DevTools Network |
| Frame rate | 60 FPS during rotation | Chrome DevTools Performance |
| Memory usage | < 100MB per 360° image | Chrome DevTools Memory |
| GPU usage | < 50% on mid-range GPU | Chrome DevTools Performance |

**Test Devices:**
- Desktop: Chrome, Firefox, Safari
- Mobile: iOS Safari, Chrome Android
- Test with 4K and 8K panoramas
- Test with 4K 360° video

### Browser Compatibility

| Browser | Version | Expected Support |
|---------|---------|------------------|
| Chrome | 90+ | ✅ Full support |
| Firefox | 88+ | ✅ Full support |
| Safari | 14+ | ✅ Full support (WebGL) |
| Edge | 90+ | ✅ Full support |
| Mobile Safari | iOS 14+ | ✅ Full support |
| Chrome Android | 90+ | ✅ Full support |

**Fallback Strategy:**
If WebGL not available, show placeholder or 2D fallback image.

---

## Risks & Mitigation

### Technical Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Performance degradation** with high-res textures | Medium | • Limit to 4K max for most content<br>• Use texture compression<br>• Implement progressive loading |
| **Memory leaks** from Three.js textures | Medium | • Proper cleanup in useEffect hooks<br>• Dispose textures on unmount<br>• Monitor with Chrome DevTools |
| **Video sync issues** with 360° videos | Medium | • Reuse existing video element patterns<br>• Test extensively with different codecs |
| **Mobile performance** issues | Low | • Reduce resolution for mobile<br>• Disable antialiasing on low-end devices<br>• Test on target devices |
| **Browser compatibility** | Low | • Test on all major browsers<br>• Provide fallback for old browsers |

### Implementation Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Learning curve** for Three.js/R3F | Medium | • Follow official R3F documentation<br>• Start with images (simpler than video)<br>• Allocate time for experimentation |
| **Integration conflicts** with existing code | Low | • Follow existing patterns (double-buffering)<br>• Add tests for regression<br>• Code review before merging |
| **Backend coordination** required | Low | • Backend changes are minimal<br>• Can test with mock data first<br>• Clear API contract |

### Business Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Content creation** requires 360° cameras | Low | • Many stock 360° images available<br>• 360° cameras increasingly affordable<br>• Can convert existing content |
| **Bandwidth** for high-res 360° content | Medium | • Implement progressive loading<br>• Offer multiple quality tiers<br>• Use CDN for delivery |
| **User expectations** for VR headset support | Low | • R3F supports WebXR (future enhancement)<br>• Start with desktop/mobile mouse/touch controls |

---

## Future Enhancements

### Phase 2 Enhancements (Post-MVP)

1. **Interactive Hotspots**
   - Click regions in 360° scene
   - Navigate to different montages
   - Display text/image overlays

2. **VR Headset Support**
   - WebXR integration (R3F supports this)
   - Stereoscopic rendering
   - VR controller support

3. **Advanced Controls**
   - Auto-rotation toggle
   - Gyroscope support on mobile
   - Zoom functionality
   - Field of view adjustment

4. **Audio Enhancements**
   - Spatial audio (positional audio in 3D space)
   - Ambisonic audio for 360° videos
   - Audio rotation with view

5. **Quality Optimization**
   - Adaptive bitrate streaming for 360° video
   - Multiple resolution tiers
   - Progressive image loading
   - Cubemap format support (better quality than equirectangular)

6. **Analytics**
   - Track viewing direction
   - Heatmaps of user attention
   - Engagement metrics

### Technical Debt Considerations

- **Texture Memory Management**: Implement texture pool/cache for better memory usage
- **Lazy Loading**: Only load 360° components when needed (code splitting)
- **Web Workers**: Offload texture processing to workers for better performance
- **Service Worker**: Cache 360° assets for offline playback

---

## Implementation Checklist

### Backend Tasks

- [ ] Update database schema to support `'360_IMAGE'` and `'360_VIDEO'` types
- [ ] Update API to return new artwork types
- [ ] Add admin/CMS UI to mark content as 360°
- [ ] Upload test 360° image to S3
- [ ] Upload test 360° video to S3
- [ ] Test API response with new types
- [ ] Create test playlist with mixed 2D/360° content

### Frontend Tasks - Phase 1 (Setup)

- [ ] Install dependencies: `npm install three @react-three/fiber @react-three/drei`
- [ ] Create `src/media/Panoramic360MediaFile.ts`
- [ ] Create `src/component/panoramic360.tsx`
- [ ] Update `src/dao/Artwork.ts` type comment
- [ ] Add TypeScript types for new media file

### Frontend Tasks - Phase 2 (Integration)

- [ ] Update `src/manager/FileHelper.ts` with 360° detection methods
- [ ] Update `src/manager/ItemPlayer.ts` getMedia() method
- [ ] Update `src/App.tsx`:
  - [ ] Add state properties (panoramic1, panoramic2, panoramicShown)
  - [ ] Add refs (panoramic1Ref, panoramic2Ref)
  - [ ] Add showPanoramic() method
  - [ ] Add preloadPanoramic() method
  - [ ] Add components to render() method
- [ ] Update `src/App.css` with panoramic styles

### Frontend Tasks - Phase 3 (Polish)

- [ ] Add OrbitControls configuration
- [ ] Implement fade transitions
- [ ] Add loading states
- [ ] Configure z-index layering
- [ ] Add error handling for failed texture loads
- [ ] Optimize texture settings (filtering, color space)

### Frontend Tasks - Phase 4 (Video Support)

- [ ] Implement video texture handling in component
- [ ] Wire up play/pause to App.tsx methods
- [ ] Implement volume control integration
- [ ] Add seek support for 360° videos
- [ ] Test video playback synchronization

### Testing Tasks

- [ ] Unit tests for FileHelper detection
- [ ] Unit tests for ItemPlayer.getMedia()
- [ ] Integration test: 360° image display
- [ ] Integration test: 360° video playback
- [ ] Integration test: Mixed content transitions
- [ ] Integration test: WebSocket commands
- [ ] Performance test: Memory usage
- [ ] Performance test: Frame rate during rotation
- [ ] Browser compatibility test: Chrome
- [ ] Browser compatibility test: Firefox
- [ ] Browser compatibility test: Safari
- [ ] Browser compatibility test: Mobile Safari
- [ ] Browser compatibility test: Chrome Android

### Documentation Tasks

- [ ] Update README with 360° support information
- [ ] Document content creation guidelines
- [ ] Document recommended resolutions/formats
- [ ] Add troubleshooting guide
- [ ] Update API documentation

---

## References

### Technical Documentation

- **React Three Fiber**: https://docs.pmnd.rs/react-three-fiber
- **Three.js**: https://threejs.org/docs/
- **@react-three/drei**: https://github.com/pmndrs/drei
- **WebXR API**: https://immersive-web.github.io/webxr/

### Content Creation

- **360° Image Guidelines**: https://support.google.com/maps/answer/7012050
- **Equirectangular Projection**: https://en.wikipedia.org/wiki/Equirectangular_projection
- **360° Video Standards**: https://github.com/google/spatial-media

### Performance

- **Three.js Performance Tips**: https://threejs.org/docs/#manual/en/introduction/Performance-tips
- **React Three Fiber Performance**: https://docs.pmnd.rs/react-three-fiber/advanced/pitfalls

---

## Contact & Support

For questions during implementation:

1. **React Three Fiber Discord**: https://discord.gg/poimandres
2. **Three.js Forum**: https://discourse.threejs.org/
3. **Stack Overflow**: Tag questions with `react-three-fiber` and `three.js`

---

## Conclusion

This implementation provides a solid foundation for 360° media support in the Wallmuse Webplayer. The architecture leverages existing patterns (double-buffering, WebSocket commands, MediaFile hierarchy) to ensure seamless integration with minimal disruption to the current system.

**Key Takeaways:**

- ✅ No changes to WebSocket system or S3 storage
- ✅ Minimal backend changes (just add new type values)
- ✅ Frontend follows established patterns
- ✅ React-Three-Fiber provides future-proof solution
- ✅ Estimated 12-15 hours for production-ready implementation

**Next Steps:**

1. Review this document with team
2. Prioritize MVP scope (images vs. images + videos)
3. Allocate development time
4. Set up test environment with sample 360° content
5. Begin implementation with Phase 1 (Setup)

Good luck with the implementation! 🚀
