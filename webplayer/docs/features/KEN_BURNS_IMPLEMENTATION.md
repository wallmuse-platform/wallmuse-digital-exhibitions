# Ken Burns Effect Implementation Guide

## Overview

The Ken Burns effect provides smooth zoom and pan animations on still images, creating dynamic visual interest in image-based montages. This implementation uses CSS animations with dynamically injected keyframes for optimal performance.

---

## Architecture

### Key Components

1. **[src/dao/ZoomAndPan.ts](src/dao/ZoomAndPan.ts)** - TypeScript interfaces defining the parameter structure
2. **[src/utils/kenBurnsGenerator.ts](src/utils/kenBurnsGenerator.ts)** - Random generation and CSS calculation utilities
3. **[src/media/ImageMediaFile.ts](src/media/ImageMediaFile.ts)** - Image class with Ken Burns parameters
4. **[src/component/image.tsx](src/component/image.tsx)** - React component applying the animations
5. **[src/manager/Globals.ts](src/manager/Globals.ts#L13-L23)** - Global enable/disable toggle

---

## How It Works

### 1. Parameter Generation

When an image is created, random Ken Burns parameters are auto-generated if `KEN_BURNS_ENABLED = true`:

```typescript
// In ImageMediaFile.getImage()
if (KEN_BURNS_ENABLED) {
  imf.zoomAndPan = generateRandomKenBurns();
}
```

**Generated Parameters:**
- **Start position**: Random anchor point (top-left, top-right, bottom-left, bottom-right, centre)
- **End position**: Different anchor point (ensures movement)
- **Start scale**: 100-110% (slight zoom)
- **End scale**: 110-130% (zoomed in)
- **Scale direction**: height or width (controls zoom axis)
- **Animation type**: constant, ease-in, ease-out, ease-both, accelerate, decelerate

### 2. CSS Keyframe Injection

The Image component dynamically injects CSS `@keyframes` into the document:

```typescript
// In image.tsx - injectKenBurnsKeyframe()
const keyframeCSS = `
  @keyframes ${keyframeName} {
    from {
      transform: scale(${params.start.scale / 100}) translate(${startTranslate});
    }
    to {
      transform: scale(${params.end.scale / 100}) translate(${endTranslate});
    }
  }
`;
```

**Key Points:**
- Keyframes are **cached** using a hash of parameters to avoid duplicates
- `transform` combines `scale()` and `translate()` for zoom + pan
- Each unique parameter set gets its own keyframe animation

### 3. CSS Transform Order (CRITICAL!)

⚠️ **CSS applies transforms in this order: scale THEN translate**

This means translate percentages are relative to the **scaled image size**, not the original size.

**Example:**
- Image is scaled to 120% (1.2x)
- Translate 10% moves 10% of the *scaled* image (12% of viewport)
- This causes excessive cropping if not compensated

**Solution in [kenBurnsGenerator.ts:115-139](src/utils/kenBurnsGenerator.ts#L115-L139):**

```typescript
// Calculate available pan range compensating for scale
const panRange = ((scale - 100) / scale) * 50;

// For 120% scale:
// panRange = ((120 - 100) / 120) * 50 = ~8.3%
// This gives gentle panning without excessive cropping
```

The `* 50` factor uses only 50% of available space for conservative, safe panning.

### 4. Dual-Slot Image Pattern

**Critical Architecture:** Images use a dual-slot buffering system like videos:

```html
<img id="image-1" class="image" src="current.jpg" />  <!-- Visible -->
<img id="image-2" class="image hidden" src="next.jpg" />  <!-- Hidden, preloaded -->
```

**Why This Matters:**
- **Both slots always exist in DOM** (different from production version!)
- Enables smooth **cross-fade transitions** (0.5s opacity animation)
- Image #1 fades out while Image #2 fades in simultaneously
- Prevents component mounting/unmounting flicker

**Key Fix in [image.tsx:145-147](src/component/image.tsx#L145-L147):**
```typescript
// CRITICAL FIX: Always render image element like Video component does
// Don't return null based on shouldLoad - let CSS handle visibility
// This ensures both image-1 and image-2 slots always exist in DOM
```

### 5. Animation State Management

The animation state is controlled via inline styles:

```typescript
const animationStyle = {
  animation: `${keyframeName} ${duration}s ${timingFunction} forwards`,
  animationPlayState: hidden ? 'paused' : 'running',
};
```

**States:**
- **Visible image**: Ken Burns animation runs (`running`)
- **Hidden image**: Animation paused (`paused`)
- **Transition**: Both animations continue smoothly during cross-fade

---

## Critical Implementation Details

### Transform Math Compensation

**Problem:** Simple translate percentages cause excessive cropping.

**Solution:** Divide by scale to compensate for scaled coordinates.

**Formula:**
```typescript
panRange = ((scale - 100) / scale) * conservativeFactor
```

**Example Values:**
- Scale 110%: panRange ≈ 4.5%
- Scale 120%: panRange ≈ 8.3%
- Scale 130%: panRange ≈ 11.5%

These values ensure the image stays within safe cropping boundaries.

### Position Anchor Mapping

Positions map to CSS translate values accounting for scale:

| Position | Translate X | Translate Y |
|----------|-------------|-------------|
| top-left | +panRange% | +panRange% |
| top-right | -panRange% | +panRange% |
| bottom-left | +panRange% | -panRange% |
| bottom-right | -panRange% | -panRange% |
| centre | 0% | 0% |

Positive values pan the image down/right, negative values pan up/left.

### CSS Transitions vs Animations

**Ken Burns Animation:**
- Uses CSS `@keyframes` and `animation` property
- Runs for full image duration (e.g., 30 seconds)
- Controls zoom and pan transform

**Cross-Fade Transition:**
- Uses CSS `transition` property on `.image` class
- Runs for 0.5 seconds when `hidden` class toggles
- Controls opacity fade in/out

**Both run simultaneously** - Ken Burns continues during cross-fade!

### Preloading Flow

**Sequencer.ts orchestrates the loading:**

1. **Play current image**: `imageShown = 1`, `image1` has media
2. **Preload next image**: `imagePreloading = 2`, `image2` loads media
3. **Switch visibility**: `imageShown = 2`, `imagePreloading = 0`
4. **Cross-fade occurs**: Image #1 fades out, Image #2 fades in
5. **Repeat**: Next image preloads into slot #1

**Key Fix in [Sequencer.ts:649-662](src/manager/Sequencer.ts#L649-L662):**
Images were not being preloaded! Added missing image preload logic:

```typescript
} else if (artwork.type === 'IMG' && TheApp?.preloadImage) {
  const imageFile = ImageMediaFile.getImage(...);
  TheApp.preloadImage(imageFile);
}
```

---

## Future Enhancements (Commented in Code)

### Backend Integration

The code is structured to accept Ken Burns parameters from the backend:

```typescript
// FUTURE: Backend will provide these parameters via WebSocket
// zoomAndPan?: ZoomAndPanParams,     // Explicit zoom/pan from updateImageZoomAndPan tool
// copyright?: boolean,                // Copyright flag
// croppable?: boolean,                // If false, use 'contain' mode (fit)
```

### Display Modes

**Fill vs Fit:**
- **Fill mode (current)**: `objectFit: 'cover'` - crops to fill screen
- **Fit mode (future)**: `objectFit: 'contain'` - shows full image with letterboxing

**When to use Fit:**
- Copyrighted images that cannot be cropped
- Images with `croppable: false` flag from backend

**Implementation Ready:**
```typescript
// In image.tsx
objectFit: media.croppable !== false ? 'cover' : 'contain'
```

### Per-Image Configuration

Currently: Global toggle `KEN_BURNS_ENABLED`

**Future Options:**
- Per-playlist: `Playlist.kenBurnsEnabled`
- Per-image: `zoomAndPan.enabled` from backend
- User preferences: Settings UI

---

## Configuration

### Global Toggle

**[src/manager/Globals.ts:17](src/manager/Globals.ts#L17)**

```typescript
export const KEN_BURNS_ENABLED = true;
```

Set to `false` to disable Ken Burns globally. Images will display static without animation.

### Scale Ranges

**[src/utils/kenBurnsGenerator.ts:75-76](src/utils/kenBurnsGenerator.ts#L75-L76)**

```typescript
const startScale = Math.round(randomRange(100, 110, rng));
const endScale = Math.round(randomRange(110, 130, rng));
```

**Current:** 100-130% (subtle zoom)
**Adjustable:** Increase max to 150% for more dramatic effect

⚠️ **Warning:** Scales above 130% may cause excessive cropping on some images.

### Pan Conservatism

**[src/utils/kenBurnsGenerator.ts:123](src/utils/kenBurnsGenerator.ts#L123)**

```typescript
const panRange = ((scale - 100) / scale) * 50; // Conservative pan (50% of available space)
```

**Current:** 50% of available pan space
**Adjustable:**
- Increase to 75 for more movement
- Decrease to 25 for gentler panning

### Transition Duration

**[src/App.css:76](src/App.css#L76)**

```css
transition: opacity 0.5s ease-in-out, visibility 0.5s ease-in-out;
```

**Current:** 0.5 seconds (professional standard)
**Adjustable:**
- 1s for more noticeable cross-fade
- 0.3s for snappier transitions

---

## Testing & Debugging

### Logging

**Transition Tracking:**
```
[Image #1] 🎭 TRANSITION: SHOWING (fade in) - img-112044.jpg
[Image #2] 🎭 TRANSITION: HIDING (fade out) - img-112232.jpg
```

**Ken Burns Injection:**
```
[Ken Burns] Injected keyframe: kb1774199157
  start: { scale: 105, translate: "4.2%, 4.2%" }
  end: { scale: 125, translate: "-10%, 10%" }
```

**Image Loading:**
```
[Image Component #1] Image loaded successfully: img-112044.jpg
```

### DOM Verification

**Both slots should always be present:**

```html
<img id="image-1" class="image" src="..." />
<img id="image-2" class="image hidden" src="..." />
```

**Check in DevTools:**
1. Inspect `#root-wm-player`
2. Verify both `#image-1` and `#image-2` exist
3. One should have `hidden` class, one should not

### CSS Animation Inspection

**Chrome DevTools > Animations panel:**
1. Reload page to start Ken Burns
2. Open Animations panel (More tools > Animations)
3. See running animations with timeline
4. Verify 30s duration matches image duration

---

## Common Pitfalls

### 1. ❌ Don't Use Simple Translate Percentages

```typescript
// WRONG - Causes excessive cropping
return "15%, 15%";
```

```typescript
// CORRECT - Compensates for scale
const panRange = ((scale - 100) / scale) * 50;
return `${panRange}%, ${panRange}%`;
```

### 2. ❌ Don't Return Null from Image Component

```typescript
// WRONG - Breaks dual-slot pattern
if (!media) return null;
```

```typescript
// CORRECT - Always render, handle with empty src
src={media?.url || ''}
```

### 3. ❌ Don't Forget to Clear imagePreloading

```typescript
// WRONG - Blocks future preloads
setState({ imageShown: 1 });
```

```typescript
// CORRECT - Reset preloading state
setState({ imageShown: 1, imagePreloading: 0 });
```

### 4. ❌ Don't Inject Duplicate Keyframes

```typescript
// Use the cache!
if (injectedKeyframes.has(keyframeName)) {
  return keyframeName; // Skip injection
}
```

---

## Performance Considerations

### Keyframe Caching

- **Hash-based caching** prevents duplicate `@keyframes` in DOM
- Same Ken Burns parameters = same keyframe = reused animation
- Reduces DOM pollution and improves performance

### CSS vs JavaScript Animation

**Why CSS animations?**
- **GPU accelerated** - smooth 60fps on all devices
- **Browser optimized** - better than `requestAnimationFrame`
- **Automatic pausing** - when tab inactive, browser pauses CSS animations

### Transform Performance

**Efficient transforms:**
- `transform: scale() translate()` - GPU accelerated
- No layout recalculation, only compositing

**Avoid:**
- Animating `width`, `height`, `top`, `left` - causes layout thrashing
- JavaScript-based transforms - less performant

---

## Browser Compatibility

### Supported Features

✅ CSS `transform` with `scale()` and `translate()`
✅ CSS `@keyframes` animations
✅ CSS `transition` for opacity
✅ Dynamic style element injection

### Tested Browsers

- Chrome/Edge 90+
- Safari 14+
- Firefox 88+

### Fallback Behavior

If Ken Burns disabled:
- Images display static
- Cross-fade transitions still work
- No functional degradation

---

## File Reference

### Core Files

| File | Purpose | Lines of Interest |
|------|---------|-------------------|
| [src/dao/ZoomAndPan.ts](src/dao/ZoomAndPan.ts) | Type definitions | All |
| [src/utils/kenBurnsGenerator.ts](src/utils/kenBurnsGenerator.ts) | Generation & math | 115-139 (transform math) |
| [src/media/ImageMediaFile.ts](src/media/ImageMediaFile.ts) | Image class | 48-57 (generation) |
| [src/component/image.tsx](src/component/image.tsx) | React component | 17-54 (keyframe injection)<br/>75-88 (animation style)<br/>98-105 (transition logging) |
| [src/manager/Globals.ts](src/manager/Globals.ts) | Configuration | 13-23 (toggle) |
| [src/manager/Sequencer.ts](src/manager/Sequencer.ts) | Preloading | 649-662 (image preload) |
| [src/App.css](src/App.css) | Styles | 67-77 (image transitions) |

### Future Integration Points

- **Backend WebSocket messages**: Look for `updateImageZoomAndPan` command
- **Copyright flags**: Add to `getImage()` parameters
- **Playlist configuration**: Add `kenBurnsEnabled` to Playlist DAO

---

## Summary

The Ken Burns implementation provides:

✅ **Automatic random zoom/pan** on all images
✅ **Smooth cross-fade transitions** between images
✅ **Dual-slot buffering** for flicker-free playback
✅ **Future-proof architecture** for backend integration
✅ **GPU-accelerated performance** via CSS animations
✅ **Global enable/disable** for easy testing

Key innovations:
- Transform math compensation for correct scaling
- Dual-slot rendering pattern
- Dynamic CSS keyframe injection with caching
- Separation of Ken Burns animation and cross-fade transition

For questions or modifications, refer to the detailed comments in the source files marked with `// FUTURE:` and `// CRITICAL FIX:` tags.
