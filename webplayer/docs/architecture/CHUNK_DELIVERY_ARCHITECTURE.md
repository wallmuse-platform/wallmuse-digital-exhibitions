# Video Chunk Delivery Architecture

> **Status**: ⚠️ MediaSource chunking DEPRECATED - Using direct src mode
> **Last Updated**: 2026-01-21
> **Implementation**: Direct src with browser-native Range requests (chunking disabled)

---

## ⚠️ IMPORTANT: MediaSource Chunking Deprecated (January 21, 2026)

**MediaSource-based chunked streaming has been DISABLED** due to critical server overload issues.

### Why Chunking Was Disabled

On January 21, 2026, the production server experienced a critical overload:

| Metric | Value | Expected |
|--------|-------|----------|
| Requests from single IP | **5,394** (54% of traffic) | ~50-100 |
| HTTP requests per video | **200-600** | 1 (with Range) |
| Same fragment requested | **50+ times** in 30s | Once |
| Server impact | **Crash** | Normal operation |

**Root Cause Analysis**:

1. **Navigation restart problem**: Each user navigation (goMontage, playlist switch) caused the chunked downloader to restart from byte 0
2. **Request multiplication**: 1GB video = ~256 chunks × multiple navigation cycles = hundreds of requests
3. **Server fragmentation overhead**: Each `&frag=1` request triggers MP4 fragmentation check on the server
4. **No client-side caching**: Browser HTTP cache doesn't help because each chunk is a unique byte range

### Current Configuration

```typescript
// In video.tsx - KEEP THIS FALSE
const withFragments = false;  // DISABLED - chunk streaming causing server overload
```

**Direct src mode** is now the standard:
- Browser makes **1 request** per video (with native Range header support)
- Server responds with standard HTTP 206 Partial Content
- Works on all platforms including iOS
- No server overload risk

---

## Overview

The video streaming system now uses **direct src mode** for all platforms, relying on the browser's native HTTP Range request handling for efficient video streaming.

## Platform Support Matrix (Current)

| Platform | Streaming Mode | Requests per Video | Notes |
|----------|----------------|-------------------|-------|
| **All Desktop Browsers** | Direct src | 1 (with Range) | Browser handles buffering |
| **iOS Safari** | Direct src | 1 (with Range) | Native HLS support available |
| **Android** | Direct src | 1 (with Range) | Browser handles buffering |

## Current Implementation Status

### ✅ What Works Now (January 2026)

- **Direct src streaming** for all platforms (browser handles Range requests natively)
- **Audio restoration** - Proper unmute/volume on montage transitions
- **Pending showVideo mechanism** - Waits for video data before playback
- **iOS compatibility** - Uses `canplay` event for readiness detection

### ⚠️ MediaSource Chunking (DEPRECATED)

The following features are **disabled** but code remains for potential future use:
- ~~MediaSource-based chunked delivery~~
- ~~Dynamic chunk sizing (512KB-4MB)~~
- ~~Intelligent buffer management~~
- ~~Background worker suspension~~
- ~~Proactive garbage collection~~

### Historical Improvements (December 2025 - January 2026)

<details>
<summary>Click to expand historical changes (for reference only)</summary>

1. **iOS Compatibility Fix** (Jan 2026)
   - Detects MediaSource unavailability on iOS
   - Falls back to direct `<video src>` (browser handles streaming)
   - Waits for `canplay` event before seeking

2. **Codec Filtering** (Jan 2026)
   - Filters out `text`, `wvtt`, `stpp` codecs from server-provided codec strings
   - Prevents MediaSource `NotSupportedError` for videos with subtitle tracks
   - Example: `"avc1.42C01F, mp4a.40.2, text"` → `"avc1.42C01F, mp4a.40.2"`

3. **Large File Optimization** (Jan 2026)
   - Dynamic chunk sizing: 4MB for >500MB files
   - Reduced buffer ahead: 20s for >1GB files (prevents quota errors)
   - Proactive garbage collection for active/background videos

4. **Resource Management** (Jan 2026)
   - Background worker suspension when video hidden
   - Graceful shutdown without aborting active fetches
   - Emergency buffer clearing on QuotaExceededError

5. **First-Chunk Timing Fix** (Jan 2026)
   - `onVideoLoaded` callback now fires after first chunk is successfully appended
   - Ensures video has data (readyState > 0) before App attempts seek operations
   - Prevents "Video not ready for seek" errors

</details>

## Architecture Layers

### 1. **Platform Detection Layer** (Highest Priority)
- **Purpose**: Detect MediaSource API availability
- **Decision Point**: iOS vs Desktop/Android routing
- **Implementation**: `typeof MediaSource !== 'undefined'`

### 2. **Video Component Layer** (High Priority)
- **Purpose**: Manages video playback and lifecycle
- **Components**: `Video` component ([video.tsx](../../src/component/video.tsx))
- **Key Features**:
  - MediaSource initialization with refs
  - iOS fallback with canplay event waiting
  - Audio unmute on montage transitions (App.tsx)

### 3. **Buffer Worker Layer** (Medium Priority)
- **Purpose**: Background chunk downloading with intelligent buffering
- **Implementation**: Inline worker in Video component (lines 86-272)
- **Key Features**:
  - Dynamic chunk sizing based on file size
  - Proactive garbage collection
  - Backpressure mechanism
  - QuotaExceededError recovery

### 4. **Network Layer** (Lowest Priority)
- **Purpose**: HTTP range requests for video chunks
- **Implementation**: Fetch API with Range headers
- **Configuration**: Dynamic based on file size and playback position

## How It Works

### Platform Detection and Routing

```typescript
// Video component checks MediaSource availability
const mediaSourceSupported = typeof MediaSource !== 'undefined';

if (!mediaSourceSupported || !withFragments) {
  // iOS/Safari fallback: Direct src (browser handles streaming natively)
  videoEl.src = media.url;

  // Wait for canplay before signaling ready
  videoEl.addEventListener('canplay', onCanPlay, { once: true });
} else {
  // Desktop/Android: MediaSource chunked streaming with &frag=1
  const ms = new MediaSource();
  videoEl.src = URL.createObjectURL(ms);
  ms.addEventListener('sourceopen', onSourceOpen);
}
```

**Implementation**: [src/component/video.tsx:303-346](../../src/component/video.tsx#L303-L346)

### Desktop/Android: MediaSource Chunked Streaming

#### 1. Initialization
```typescript
const ms = new MediaSource();
mediaSourceRef.current = ms;
videoEl.src = URL.createObjectURL(ms);

ms.addEventListener('sourceopen', async () => {
  // Filter out unsupported codecs (text/subtitle tracks)
  const rawCodecs = media.codecs ?? 'avc1.42C028, mp4a.40.2';
  const filteredCodecs = rawCodecs
    .split(',')
    .map(c => c.trim())
    .filter(c => !c.includes('text') && !c.includes('wvtt') && !c.includes('stpp'))
    .join(', ');
  const codecs = filteredCodecs || 'avc1.42C028, mp4a.40.2';

  const sb = ms.addSourceBuffer(`video/mp4; codecs="${codecs}"`);
  sb.mode = 'segments';

  // Determine file size via HEAD request (MUST include &frag=1)
  const headRes = await fetch(`${media.url}&frag=1`, {
    headers: { 'Range': 'bytes=0-1' }
  });
  const range = headRes.headers.get('Content-Range');
  lengthRef.current = parseFloat(range.split('/')[1]);

  // Start background worker - onVideoLoaded will be called after first chunk
  startBufferWorker();
});
```

**Implementation**: [src/component/video.tsx:338-368](../../src/component/video.tsx#L338-L368)

#### 2. Dynamic Chunk Sizing

```typescript
// Larger chunks for larger files to reduce HTTP overhead
const CHUNK_SIZE = lengthRef.current > 500 * 1024 * 1024 ? 4096 * 1024 :  // >500MB: 4MB
                   lengthRef.current > 100 * 1024 * 1024 ? 2048 * 1024 :  // >100MB: 2MB
                   512 * 1024;                                             // <100MB: 512KB

// Smaller buffer for large files to stay under ~200MB browser quota
const MAX_BUFFER_AHEAD = lengthRef.current > 1000 * 1024 * 1024 ? 20 :  // >1GB: 20s
                         lengthRef.current > 500 * 1024 * 1024 ? 30 :   // >500MB: 30s
                         40;                                             // <500MB: 40s
```

**Implementation**: [src/component/video.tsx:90-97](../../src/component/video.tsx#L90-L97)

#### 3. Proactive Garbage Collection

```typescript
if (sb.buffered.length > 0 && !sb.updating) {
  const startBuffer = sb.buffered.start(0);
  const bufferDuration = endBuffer - startBuffer;

  if (pos > 0) {
    // ACTIVE VIDEO: Keep only 10s behind playback position
    if (pos > 20 && startBuffer < pos - 10) {
      sb.remove(0, pos - 10);
    }
  } else {
    // BACKGROUND VIDEO: Limit total buffer to 20s
    if (bufferDuration > 20) {
      const removeEnd = endBuffer - 20;
      sb.remove(startBuffer, removeEnd);
    }
  }
}
```

**Implementation**: [src/component/video.tsx:125-150](../../src/component/video.tsx#L125-L150)

**Why this matters**: Prevents QuotaExceededError (~200MB browser limit) and reduces memory pressure

#### 4. Backpressure Mechanism

```typescript
// Don't fetch more chunks if we're already buffered ahead
if (endBuffer > pos + MAX_BUFFER_AHEAD) {
  await new Promise(resolve => setTimeout(resolve, 1000));
  continue;
}
```

**Implementation**: [src/component/video.tsx:152-156](../../src/component/video.tsx#L152-L156)

#### 5. QuotaExceededError Recovery

```typescript
try {
  sourceBuffer.appendBuffer(arrayBuffer);
} catch (e) {
  if (e.name === 'QuotaExceededError') {
    // Emergency: Keep only 5s before → 20s after playback position
    const clearStart = Math.max(0, pos - 5);
    const clearEnd = pos + 20;
    sb.remove(clearStart, clearEnd);
    await new Promise(resolve => setTimeout(resolve, 2000));
    continue; // Retry this chunk
  }
}
```

**Implementation**: [src/component/video.tsx:222-248](../../src/component/video.tsx#L222-L248)

### iOS/Safari: Direct Src Streaming

#### Why iOS Needs Special Handling

**MediaSource API Not Available**:
- iOS Safari does **not support** MediaSource Extensions API
- `typeof MediaSource === 'undefined'` on all iOS devices
- Attempting `new MediaSource()` throws `ReferenceError`

**Native Video Streaming**:
- iOS Safari has excellent native video streaming support
- Handles HTTP range requests automatically
- Supports HLS (HTTP Live Streaming) natively
- Better battery efficiency than custom streaming

#### Implementation

```typescript
if (!mediaSourceSupported || !withFragments) {
  console.log(`🎬 [Video #${index}] Using direct src (iOS/Safari mode)`);

  // Use URL directly - browser handles streaming natively
  videoEl.src = media.url;

  // Wait for canplay event before signaling ready for seeking
  const onCanPlay = () => {
    console.log(`🎬 [Video #${index}] Video ready (canplay), readyState:`, videoEl.readyState);
    if (onVideoLoaded) {
      onVideoLoaded(); // Signal App that video is ready for seek operations
    }
  };

  videoEl.addEventListener('canplay', onCanPlay, { once: true });

  return () => {
    videoEl.removeEventListener('canplay', onCanPlay);
  };
}
```

**Implementation**: [src/component/video.tsx:318-341](../../src/component/video.tsx#L318-L341)

#### iOS-Specific Considerations

1. **Direct URL**: Uses `media.url` directly - browser handles all streaming natively
2. **Async Loading**: Must wait for `canplay` event before seeking (readyState >= 3)
3. **No Chunk Control**: iOS manages buffering internally via native streaming
4. **Audio Context**: iOS requires user gesture to resume AudioContext (separate banner handling)
5. **Memory Management**: iOS manages video memory automatically, no manual GC needed

#### Expected iOS Logs

```
🎬 [Video #1] Mounting Video: video.mp4
🎬 [Video #1] MediaSource supported: false
🎬 [Video #1] Using direct src (iOS/Safari mode - browser will handle buffering)
🎬 [Video #1] Direct URL: https://...video.mp4?version=1
🎬 [Video #1] Data Loaded (Ready)
🎬 [Video #1] Video ready (canplay event), readyState: 3
🎬 [Video #1] Calling onVideoLoaded (direct src mode)
```

## Resource Management

### Background Worker Suspension

**Problem**: Hidden videos continue downloading, consuming bandwidth and memory ("noisy neighbor")

**Solution**: Stop worker when video becomes hidden

```typescript
React.useLayoutEffect(() => {
  if (hidden && isStreamingRef.current) {
    console.log(`🎬 [Video #${index}] Hidden - pausing background worker`);
    isStreamingRef.current = false;  // Stops worker loop at line 104
    videoElement.pause();             // Save CPU
    // DON'T call abort() - that kills active fetches!
  }
}, [hidden]);
```

**Implementation**: [src/component/video.tsx:280-287](../../src/component/video.tsx#L280-L287)

### Graceful Worker Shutdown

**Critical Bug Fixed**: Calling `abortController.abort()` was terminating active downloads mid-transfer, causing "ERR_CONNECTION_CLOSED" errors.

**Solution**: Just set `isStreamingRef.current = false` and let the loop exit naturally:

```typescript
while (downloadedRef.current < lengthRef.current && isStreamingRef.current) {
  // Worker checks isStreamingRef on each iteration
  // Exits gracefully when false
}
```

**Implementation**: [src/component/video.tsx:104](../../src/component/video.tsx#L104)

## Audio Management

### Problem: Audio Lost on Montage Transitions

When switching between montages, videos start with `muted={true}` and don't get unmuted.

### Solution: Unmute and Restore Volume

```typescript
// In App.tsx showVideo() method
if (this.video1Ref?.current) {
  const normalizedVolume = Math.max(0, Math.min(1, this.state.volume / 100));
  this.video1Ref.current.muted = false;
  this.video1Ref.current.volume = normalizedVolume;
  console.log(`[App.showVideo] Unmuted video-1, volume: ${normalizedVolume}`);
  this.video1Ref.current.play().catch(err => {
    console.log('[App.showVideo] Play failed:', err.message);
  });
}

// Mute the other slot
if (this.video2Ref?.current) {
  this.video2Ref.current.pause();
  this.video2Ref.current.muted = true;
  this.video2Ref.current.volume = 0;
}
```

**Implementation**: [src/App.tsx:702-740](../../src/App.tsx#L702-L740)

## Performance Characteristics

### Desktop/Android (MediaSource)

| File Size | Chunk Size | Buffer Ahead | Initial Load | Memory Usage |
|-----------|-----------|--------------|--------------|--------------|
| < 100MB   | 512KB     | 40s          | ~2s          | ~50MB        |
| 100-500MB | 2MB       | 30s          | ~3s          | ~100MB       |
| 500MB-1GB | 4MB       | 30s          | ~4s          | ~150MB       |
| > 1GB     | 4MB       | 20s          | ~5s          | ~180MB       |

### iOS (Direct Src)

| Connection | Initial Load | Buffering | Memory Usage |
|------------|--------------|-----------|--------------|
| WiFi       | 1-2s         | Minimal   | iOS managed  |
| 4G         | 2-4s         | Adaptive  | iOS managed  |
| 3G         | 4-8s         | Frequent  | iOS managed  |

**Note**: iOS automatically adjusts buffering based on connection quality and battery state.

## Browser Compatibility

### MediaSource API Support

- ✅ **Desktop Chrome/Edge**: Full support, tested with 2.5GB files
- ✅ **Desktop Firefox**: Full support
- ✅ **Desktop Safari 15+**: Full support (macOS)
- ✅ **Android Chrome**: Full support (API 21+)
- ✅ **Android Firefox**: Full support
- ❌ **iOS Safari**: Not supported - automatic fallback to direct src
- ❌ **Old Android**: <API 21 - automatic fallback to direct src

### Direct Src Support

- ✅ **All browsers**: HTTP range requests supported universally
- ✅ **iOS Safari**: Excellent native streaming with HLS support
- ✅ **Fallback**: Always works, no exceptions

## Configuration

### Global Toggle

```typescript
// At top of video.tsx
const withFragments = false;  // Enable/disable chunking globally
```

**Implementation**: [src/component/video.tsx:32](../../src/component/video.tsx#L32)

Set to `false` to force direct src for all platforms (useful for debugging).

### Dynamic Configuration (Automatic)

All chunking parameters are **automatically configured** based on file size and platform:

- **Chunk size**: 512KB → 4MB (based on file size)
- **Buffer ahead**: 20s → 40s (based on file size)
- **Background buffer**: 20s max (prevents memory exhaustion)
- **iOS mode**: Automatic detection and fallback

No manual configuration needed.

## Debugging and Monitoring

### Console Log Prefixes

- `🎬 [Video #N]` - Video component lifecycle and worker operations
- `[App.showVideo]` - Video slot switching and audio management
- `[App.seek]` - Seek operations and readyState checks
- `[IOSAudioAndroidVideoHandler]` - iOS audio context management

### Key Logs to Monitor

**Desktop/Android MediaSource Mode**:
```
🎬 [Video #1] MediaSource supported: true
🎬 [Video #1] MediaSource created, readyState: closed
🎬 [Video #1] sourceopen event fired! ReadyState: open
🎬 [Video #1] Worker started: 512MB file, 2048KB chunks
🎬 [Video #1] Progress: 10% (51MB / 512MB)
🎬 [Video #1] 🧹 [ACTIVE] Cleaning: 10.0s → 85.0s
```

**iOS Direct Src Mode**:
```
🎬 [Video #1] MediaSource supported: false
🎬 [Video #1] Using direct src (iOS/Safari mode)
🎬 [Video #1] iOS URL (frag removed): https://...mp4?version=1
🎬 [Video #1] Video ready (canplay event), readyState: 3
```

### Browser DevTools

```javascript
// Check video element state
const video = document.getElementById('video-1');
console.log({
  src: video.src,
  readyState: video.readyState,
  paused: video.paused,
  currentTime: video.currentTime,
  buffered: video.buffered.length > 0 ?
    [video.buffered.start(0), video.buffered.end(0)] : 'none'
});

// Check MediaSource (desktop only)
console.log('MediaSource available:', typeof MediaSource !== 'undefined');
```

## Error Handling

### MediaSource Not Supported (iOS)

- **Detection**: `typeof MediaSource === 'undefined'`
- **Action**: Automatic fallback to direct src
- **Impact**: None - video plays normally via iOS native streaming
- **Logs**: `🎬 [Video #N] MediaSource supported: false`

### QuotaExceededError (Desktop)

- **Cause**: SourceBuffer exceeds ~200MB browser quota
- **Action**: Emergency buffer clearing, keep only 5s before → 20s after position
- **Recovery**: Automatic retry after 2s cooldown
- **Logs**: `🎬 [Video #N] ⚠️ QuotaExceededError - emergency buffer clear`

### Network Connection Lost

- **Detection**: `fetch()` throws network error
- **Action**: Worker exits gracefully, logs error details
- **Recovery**: Video component remounts on next montage/playlist change
- **Logs**: `🎬 [Video #N] Worker Error: [details]`

### Video Stalled

- **Detection**: `stalled` event on video element
- **Logs**: `🎬 [Video #N] Stalled - Buffer empty?`
- **Action**: Browser automatically attempts to resume buffering
- **Common on**: Poor network connections or large file initial load

## Key Architectural Decisions

### 1. Platform Detection Over Feature Detection

**Decision**: Check `typeof MediaSource !== 'undefined'` rather than trying to use it and catching errors.

**Rationale**: Cleaner, faster, avoids unnecessary error logs. iOS will **never** support MediaSource.

### 2. `&frag=1` Parameter Required for Chunked Streaming

**Decision**: Always include `&frag=1` parameter in chunk fetch requests for MediaSource streaming.

**Rationale**: The server uses this parameter to return properly fragmented MP4 data suitable for MediaSource API. Without it, the server returns progressive MP4 which may not work with chunked appending.

### 3. iOS Uses Direct Src (Browser Native)

**Decision**: iOS uses direct `videoEl.src = media.url` without MediaSource.

**Rationale**: iOS Safari doesn't support MediaSource API. The browser's native video streaming handles buffering efficiently.

### 4. Codec Filtering for MediaSource

**Decision**: Filter out `text`, `wvtt`, `stpp` codecs before creating SourceBuffer.

**Rationale**: MediaSource doesn't support text/subtitle track codecs. Server returns codec strings like `"avc1.42C01F, mp4a.40.2, text"` which must be filtered to `"avc1.42C01F, mp4a.40.2"`.

### 5. Wait for canplay on iOS

**Decision**: Don't call `onVideoLoaded()` until `canplay` event fires (readyState >= 3).

**Rationale**: Prevents premature seek operations that fail with "Video not ready" errors.

### 6. First-Chunk Timing for MediaSource

**Decision**: Call `onVideoLoaded()` only after the first chunk is successfully appended to SourceBuffer.

**Rationale**: The video has no data until the first chunk is appended. Calling `onVideoLoaded()` before this causes App to attempt seek operations on an empty video (readyState: 0).

### 7. Dynamic Chunk Sizing

**Decision**: Scale chunk size from 512KB to 4MB based on file size.

**Rationale**:
- Small files: 512KB = less memory, faster response
- Large files: 4MB = fewer HTTP requests, less overhead
- Tested with 2.5GB file successfully

### 8. Graceful Worker Shutdown (No abort())

**Decision**: Stop worker by setting `isStreamingRef = false`, not calling `abort()`.

**Rationale**: abort() kills in-flight downloads, causing "Connection closed" errors. Let fetches complete naturally.

### 9. Proactive Garbage Collection

**Decision**: Remove old buffer data proactively, not just when quota exceeded.

**Rationale**:
- Prevents QuotaExceededError before it happens
- Reduces memory pressure
- Different strategies for active (10s behind) vs background (20s max) videos

### 10. Background Worker Suspension

**Decision**: Stop hidden video workers immediately.

**Rationale**: Prevents "noisy neighbor" problem where background video competes with active video for bandwidth/CPU.

## Files Modified

### Core Implementation (January 2026)
- [src/component/video.tsx](../../src/component/video.tsx) - Platform detection, MediaSource/direct src routing, buffer worker
- [src/App.tsx](../../src/App.tsx) - Audio unmute on montage transitions, seek safety checks

### Removed Files
- ~~src/manager/VideoStreamManager.ts~~ - Removed (functionality moved to inline worker)
- ~~src/manager/ChunkManager.ts~~ - Removed (replaced by direct fetch in worker)

### Related Files (Not Modified)
- [src/media/VideoMediaFile.ts](../../src/media/VideoMediaFile.ts) - Video media model
- [src/manager/Sequencer.ts](../../src/manager/Sequencer.ts) - Playback sequencing
- [src/ws/ws-tools.ts](../../src/ws/ws-tools.ts) - WebSocket commands

## Testing Checklist

### Desktop Testing
- [ ] Chrome: MediaSource chunked streaming
- [ ] Firefox: MediaSource chunked streaming
- [ ] Safari: MediaSource chunked streaming (macOS only)
- [ ] Large files (>1GB): Check QuotaExceededError handling
- [ ] Montage transitions: Audio preserved
- [ ] Background videos: Worker suspended when hidden

### iOS Testing
- [ ] Safari: Direct src fallback
- [ ] Audio context: User gesture prompt
- [ ] Seek operations: No "Video not ready" errors
- [ ] Multiple montages: Smooth transitions
- [ ] Network issues: Graceful handling

### Android Testing
- [ ] Chrome: MediaSource chunked streaming
- [ ] Firefox: MediaSource chunked streaming
- [ ] Old devices (<API 21): Direct src fallback

## Conclusion (Current State)

The current architecture uses **direct src mode** for all platforms:

- ✅ **Simple and reliable** - Browser handles all streaming natively
- ✅ **Server-friendly** - 1 request per video instead of 200+
- ✅ **iOS compatibility** - Works on all platforms
- ✅ **Audio preservation** - Unmute and volume restoration on transitions
- ✅ **Zero configuration** - No special parameters needed

**Trade-off**: Less control over buffering, but avoids server overload issues.

---

## Future Recommendations: HLS and DASH

If advanced streaming features are needed in the future (adaptive bitrate, better seeking in large files), consider implementing **HLS** or **DASH** instead of custom MediaSource chunking.

### Why HLS/DASH Instead of Custom MediaSource?

| Feature | Custom MediaSource (Deprecated) | HLS/DASH |
|---------|--------------------------------|----------|
| Server requests | 200-600 per video | 1 manifest + efficient segments |
| Caching | Poor (unique byte ranges) | Excellent (discrete segment files) |
| Adaptive bitrate | Not implemented | Built-in |
| CDN support | Limited | Native |
| iOS support | No | Native HLS |
| Server load | High (fragmentation per request) | Low (pre-segmented) |
| Implementation | Custom client code | Standard players |

### HLS (HTTP Live Streaming) - Recommended for iOS Priority

**Pros**:
- Native iOS Safari support (no JavaScript needed)
- Widely supported on all platforms
- Excellent CDN caching
- Adaptive bitrate streaming
- Industry standard

**Server-side requirements**:
```bash
# Convert MP4 to HLS using FFmpeg
ffmpeg -i input.mp4 \
  -codec: copy \
  -start_number 0 \
  -hls_time 10 \
  -hls_list_size 0 \
  -f hls output.m3u8
```

**Client-side implementation**:
```typescript
// iOS - Native support, just set src
videoEl.src = 'https://server/video.m3u8';

// Desktop/Android - Use hls.js library
import Hls from 'hls.js';

if (Hls.isSupported()) {
  const hls = new Hls();
  hls.loadSource('https://server/video.m3u8');
  hls.attachMedia(videoEl);
} else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
  // Native HLS support (Safari)
  videoEl.src = 'https://server/video.m3u8';
}
```

**Recommended library**: [hls.js](https://github.com/video-dev/hls.js/) (~200KB gzipped)

### DASH (Dynamic Adaptive Streaming over HTTP)

**Pros**:
- More flexible than HLS
- Better codec support (VP9, AV1)
- Standardized by MPEG
- Fine-grained control over segments

**Cons**:
- No native iOS support (requires JavaScript player)
- More complex than HLS
- Less widely deployed

**Server-side requirements**:
```bash
# Convert MP4 to DASH using FFmpeg
ffmpeg -i input.mp4 \
  -codec: copy \
  -f dash \
  -seg_duration 10 \
  output.mpd
```

**Client-side implementation**:
```typescript
import dashjs from 'dashjs';

const player = dashjs.MediaPlayer().create();
player.initialize(videoEl, 'https://server/video.mpd', true);
```

**Recommended library**: [dash.js](https://github.com/Dash-Industry-Forum/dash.js/) (~300KB gzipped)

### Implementation Recommendations

#### Phase 1: Server-Side Preparation
1. Add FFmpeg or similar tool to transcode uploaded videos to HLS format
2. Store both original MP4 and HLS segments (`.m3u8` + `.ts` files)
3. Serve HLS segments from CDN if available

#### Phase 2: Client-Side Integration
1. Detect platform capability:
   ```typescript
   const canPlayHLS = videoEl.canPlayType('application/vnd.apple.mpegurl');
   const hlsJsSupported = typeof Hls !== 'undefined' && Hls.isSupported();
   ```
2. Use native HLS on iOS Safari
3. Use hls.js on other platforms
4. Fall back to direct MP4 if HLS unavailable

#### Phase 3: Adaptive Bitrate (Optional)
1. Create multiple quality levels (1080p, 720p, 480p)
2. Let HLS/DASH player auto-select based on bandwidth
3. Configure quality switching thresholds

### Estimated Effort

| Task | Effort | Priority |
|------|--------|----------|
| Server: HLS transcoding pipeline | Medium | High |
| Client: hls.js integration | Low | High |
| Storage: HLS segment hosting | Low | High |
| Multi-bitrate encoding | Medium | Low |
| DASH support | Medium | Low |

### When to Implement

Consider HLS/DASH when:
- Users report buffering issues with large files
- Need adaptive bitrate for varying network conditions
- Want CDN-friendly video delivery
- Require better seeking performance in large files

For current use case with direct src mode working well, this is **not urgent** but recommended for future scalability.

---

## Summary of Architecture Evolution

| Date | Implementation | Status |
|------|---------------|--------|
| Pre-2026 | Direct src | Working |
| Jan 2026 | MediaSource chunking | Implemented then disabled |
| Jan 21, 2026 | Direct src (reverted) | **Current** |
| Future | HLS/DASH | **Recommended** |
