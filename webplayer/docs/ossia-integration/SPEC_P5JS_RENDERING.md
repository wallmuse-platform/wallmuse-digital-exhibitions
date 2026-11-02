# Specification: p5.js Rendering in Webplayer

## Overview

Extend the webplayer to render `P5JS` content type items, both as standalone artworks on a track and as overlay/modifier tools applied to one artwork, a sequence, or an entire track.

## Architecture

### New MediaFile subclass: `P5jsMediaFile`

Follows the existing pattern: `MediaFile` (abstract) → `VideoMediaFile`, `ImageMediaFile`, `P5jsMediaFile`.

```
src/media/
├── MediaFile.ts          (existing abstract base)
├── VideoMediaFile.ts     (existing)
├── ImageMediaFile.ts     (existing)
├── MultiImageMediaFile.ts(existing)
└── P5jsMediaFile.ts      (NEW)
```

### P5jsMediaFile

```typescript
export class P5jsMediaFile extends MediaFile {

  private iframe: HTMLIFrameElement | null = null;
  private sketchUrl: string;
  private assetsBaseUrl: string;
  private canvasWidth: number;
  private canvasHeight: number;
  private responsive: boolean;
  private overlayConfig?: P5jsOverlayConfig;

  constructor(
    aid: number,
    id: string,
    url: string,           // URL to the auto-generated index.html (SD path)
    filename: string,
    offset: number,
    duration: number,
    shapes: Shape[] | undefined,
    backgroundColor: string | undefined,
    p5jsConfig: P5jsConfig
  ) {
    super(aid, id, url, filename, offset, duration, shapes, backgroundColor);
    this.sketchUrl = p5jsConfig.sketchUrl;
    this.assetsBaseUrl = p5jsConfig.assetsBaseUrl;
    this.canvasWidth = p5jsConfig.canvasWidth || 1920;
    this.canvasHeight = p5jsConfig.canvasHeight || 1080;
    this.responsive = p5jsConfig.responsive || false;
  }

  loadUrl(url: string): void {
    // Iframe is created in App.tsx render, not here
    // This just validates the URL is reachable
  }

  start(offset: number): void {
    // Send play command to iframe via postMessage
    this.postToSketch({ type: 'play', offset });
  }

  isVideo(): boolean {
    return false; // Rendered via iframe, not <video>
  }

  public isP5js(): boolean {
    return true;
  }

  public pause(): void {
    this.postToSketch({ type: 'pause' });
  }

  public stop(): void {
    this.postToSketch({ type: 'stop' });
  }

  private postToSketch(message: any): void {
    if (this.iframe?.contentWindow) {
      this.iframe.contentWindow.postMessage(message, '*');
    }
  }

  // Called by App.tsx when overlay mode - passes underlying artwork info
  public setArtworkContext(context: ArtworkContext): void {
    this.postToSketch({ type: 'artwork-context', data: context });
  }

  public setIframe(el: HTMLIFrameElement): void {
    this.iframe = el;
  }
}
```

### Type definitions

```typescript
// src/dao/P5jsConfig.ts
export interface P5jsConfig {
  sketchUrl: string;
  assetsBaseUrl: string;
  canvasWidth: number;
  canvasHeight: number;
  frameRate: number;
  responsive: boolean;
}

// src/dao/P5jsOverlayConfig.ts
export interface P5jsOverlayConfig {
  applyTo: 'artwork' | 'sequence' | 'track';
  blendMode: string;
  opacity: number;
  transparentBackground: boolean;
  passArtworkData: boolean;
}

// src/dao/ArtworkContext.ts
export interface ArtworkContext {
  artworkId: number;
  title: string;
  author?: string;
  duration: number;
  currentTime: number;
  type: string;
}
```

## Rendering in App.tsx

### Standalone mode

Add a third rendering slot alongside `image1/2` and `video1/2`:

```typescript
// App.tsx state additions
interface AppState {
  // ... existing ...
  p5js1?: P5jsMediaFile;
  p5js2?: P5jsMediaFile;
  p5jsShown: number;  // 0 = none, 1 = slot 1, 2 = slot 2
}
```

Render as a sandboxed iframe:

```tsx
{/* P5JS rendering slots */}
{this.state.p5js1 && (
  <iframe
    ref={el => this.state.p5js1?.setIframe(el!)}
    src={this.state.p5js1.url}
    className={`p5js-slot ${this.state.p5jsShown === 1 ? 'visible' : 'hidden'}`}
    sandbox="allow-scripts allow-same-origin"
    style={{
      position: 'absolute',
      top: 0, left: 0,
      width: '100%', height: '100%',
      border: 'none',
      zIndex: 10,
      opacity: this.state.p5jsShown === 1 ? 1 : 0,
      transition: 'opacity 0.5s'
    }}
  />
)}
{/* Same for p5js2 */}
```

### Overlay mode

When a P5JS item is configured as an overlay (via `effect_type: 'p5js-overlay'` in the Item data), it renders as an additional iframe layered on top of the current artwork:

```tsx
{this.state.p5jsOverlay && (
  <iframe
    ref={el => this.state.p5jsOverlay?.setIframe(el!)}
    src={this.state.p5jsOverlay.url}
    className="p5js-overlay"
    sandbox="allow-scripts allow-same-origin"
    style={{
      position: 'absolute',
      top: 0, left: 0,
      width: '100%', height: '100%',
      border: 'none',
      zIndex: 20,          // above artwork layer (10)
      opacity: this.state.p5jsOverlay.overlayConfig?.opacity ?? 0.8,
      mixBlendMode: this.state.p5jsOverlay.overlayConfig?.blendMode ?? 'normal',
      pointerEvents: 'none',  // clicks pass through to artwork
      backgroundColor: 'transparent'
    }}
  />
)}
```

## Media Factory

### FileHelper extension

```typescript
// FileHelper.ts — add:
static isP5js(artwork: Artwork): boolean {
  return artwork.type === 'P5JS';
}
```

### ItemPlayer integration

In `ItemPlayer.ts`, the method that creates `MediaFile` instances from `Item` objects needs a new branch:

```typescript
// In the media file creation logic:
if (FileHelper.isP5js(item.artwork)) {
  return new P5jsMediaFile(
    item.artwork.artwork_id,
    uuid(),
    item.artwork.url,           // SD path (index.html)
    item.artwork.filename ?? '',
    item.offset,
    item.duration,
    item.shapes,
    item.background_color,
    item.p5jsConfig              // new field on Item
  );
}
```

## Item data model extension

```typescript
// Item.ts — add:
public p5jsConfig?: P5jsConfig;
public p5jsOverlayConfig?: P5jsOverlayConfig;

// In constructor:
if (this.artwork?.type === 'P5JS' && json.p5js_config) {
  this.p5jsConfig = json.p5js_config;
}
if (this.effect_type === 'p5js-overlay' && this.effect_data) {
  try {
    this.p5jsOverlayConfig = JSON.parse(this.effect_data);
  } catch (e) {
    console.warn('[Item] Failed to parse p5js overlay config:', this.effect_data);
  }
}
```

## Overlay lifecycle

### Single artwork overlay

1. When `Sequencer` transitions to an item that has a `p5js-overlay` effect:
   - Load the overlay iframe (preload during previous item, like video preloading)
   - Show overlay iframe on top of artwork
   - If `passArtworkData` is true, send `artwork-context` via postMessage
2. When the item ends:
   - Fade out overlay iframe
   - Destroy iframe

### Sequential artworks overlay

1. Overlay iframe loads once at the start of the first item in the sequence
2. On each artwork transition, send updated `artwork-context` to the sketch
3. Overlay persists across item boundaries — no reload
4. Destroy when sequence ends

### Whole track overlay

1. Overlay iframe loads when the montage starts
2. Send `artwork-context` on every item transition
3. Overlay persists for the entire montage duration
4. Destroy when montage changes

## postMessage protocol

### Player → Sketch messages

```typescript
// Playback control
{ type: 'play', offset: number }
{ type: 'pause' }
{ type: 'stop' }
{ type: 'seek', position: number }

// Artwork context (when passArtworkData is true)
{ type: 'artwork-context', data: ArtworkContext }

// Display sizing
{ type: 'resize', width: number, height: number }

// Timeline position (sent every second)
{ type: 'tick', currentTime: number, totalDuration: number }
```

### Sketch → Player messages

```typescript
// Sketch ready notification
{ type: 'ready', canvasWidth: number, canvasHeight: number }

// Request artwork data
{ type: 'request-context' }

// Error notification
{ type: 'error', message: string }
```

## Auto-generated index.html wrapper

The server (or CreateMontage at publish time) generates an `index.html` that wraps the sketch:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    html, body { margin: 0; padding: 0; overflow: hidden; background: transparent; }
    canvas { display: block; }
  </style>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.min.js"></script>
</head>
<body>
  <script>
    // WallMuse bridge — exposes player messages to the sketch
    window.wallmuse = {
      artworkContext: null,
      currentTime: 0,
      totalDuration: 0,
      onArtworkChange: null,  // sketch can set this callback
      onTick: null
    };

    window.addEventListener('message', (event) => {
      const msg = event.data;
      switch (msg.type) {
        case 'play':
          if (typeof loop === 'function') loop();
          break;
        case 'pause':
          if (typeof noLoop === 'function') noLoop();
          break;
        case 'stop':
          if (typeof noLoop === 'function') noLoop();
          break;
        case 'artwork-context':
          window.wallmuse.artworkContext = msg.data;
          if (window.wallmuse.onArtworkChange) {
            window.wallmuse.onArtworkChange(msg.data);
          }
          break;
        case 'tick':
          window.wallmuse.currentTime = msg.currentTime;
          window.wallmuse.totalDuration = msg.totalDuration;
          if (window.wallmuse.onTick) {
            window.wallmuse.onTick(msg.currentTime, msg.totalDuration);
          }
          break;
        case 'resize':
          if (typeof resizeCanvas === 'function') {
            resizeCanvas(msg.width, msg.height);
          }
          break;
      }
    });

    // Notify player when sketch is ready
    window.addEventListener('load', () => {
      parent.postMessage({ type: 'ready' }, '*');
    });
  </script>
  <script src="sketch.js"></script>
</body>
</html>
```

## Sequencer tick integration

In `Sequencer.ts`, the main playback loop should periodically send tick messages to active P5JS iframes:

```typescript
// In the run() method or equivalent timer:
if (this.activeP5jsMedia) {
  this.activeP5jsMedia.postToSketch({
    type: 'tick',
    currentTime: this.getCurrentPosition(),
    totalDuration: this.getCurrentMontage()?.duration ?? 0
  });
}
```

## Security

- Iframe uses `sandbox="allow-scripts allow-same-origin"` — no `allow-top-navigation`, `allow-forms`, or `allow-popups`
- Sketches cannot navigate the parent page or open new windows
- Sketches can only communicate via postMessage
- Asset URLs are pre-signed S3 URLs with expiration

## Implementation estimate

| Task | Effort |
|------|--------|
| P5jsMediaFile class | 1 day |
| P5jsConfig / ArtworkContext types | 0.5 day |
| App.tsx: standalone rendering (iframe slots) | 1.5 days |
| App.tsx: overlay rendering (z-layer + blend) | 2 days |
| ItemPlayer: P5JS media creation branch | 0.5 day |
| Item.ts: p5jsConfig / overlay parsing | 0.5 day |
| Sequencer: overlay lifecycle (single/seq/track) | 2–3 days |
| Sequencer: tick messaging loop | 0.5 day |
| postMessage protocol + bridge (index.html) | 1 day |
| Preload strategy for P5JS iframes | 1 day |
| Cross-fade transitions (P5JS ↔ IMG/VID) | 1 day |
| **Total** | **~11–13 days** |
