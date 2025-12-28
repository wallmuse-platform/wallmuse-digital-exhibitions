# 1. Montage Transition Stalling Fix

**Status**: ⚠️ Partially Fixed - Need user confirmation if issue still occurs
**Last Reviewed**: 2025-12-28

## Issue Summary
During playlist 1040 playback, there's a long stall at the end of montage 1 when transitioning back to montage 0. The system correctly detects timeout and initiates montage transition, but gets stuck during position calculation.

## What Was Fixed ✅

1. **Log Message Terminology** ([Sequencer.ts:782](src/manager/Sequencer.ts#L782))
   - Changed from: "No more items in current montage"
   - Changed to: "No more items in current track"
   - Improves debugging clarity

2. **Loop Logic** ([Sequencer.ts:798-803](src/manager/Sequencer.ts#L798-L803))
   - Properly loops back to M0 when playlist ends
   - Works for both defined playlists and default playlists

## What Was NOT Implemented ❌

The planned fix from the original TODO was **not implemented**:
- ❌ Same-position detection (M0T0I0 → M0T0I0)
- ❌ `App.replayCurrentVideo()` method
- ❌ Explicit mono-montage playlist handling

## Current Behavior

For single-montage playlists (e.g., 1 montage with 1 item):
1. Plays M0T0I0
2. Sequencer tries next item → none exists
3. Sequencer tries next montage → none exists
4. Sequencer loops to M0T0I0 via `createPosition(0, firstTrack)`
5. Calls `showMedia(nextPos, true)`

**Potential Issue**: If `showMedia()` detects duplicate and ignores the call, video won't replay.

## Testing Needed

**User**: Please test with a single-montage playlist and report:
- ✅ Does it loop continuously without stalling?
- ❌ Does it stall after first playback?

If stalling still occurs, implement the original planned fix below:

---

## Original Planned Fix (If Needed)

### Same-Position Detection and Replay

**File**: `src/manager/Sequencer.ts` - in `goNext()` method after line 207

Add detection for same-position loop:

```typescript
// After calculating nextPos, before calling showMedia
const isSamePosition = (
  nextPos.getMontageIndex() === currentPos.getMontageIndex() &&
  nextPos.getTrackIndex() === currentPos.getTrackIndex() &&
  nextPos.getItemIndex() === currentPos.getItemIndex()
);

if (isSamePosition) {
  LogHelper.log(
    'Sequencer.goNext',
    'Loop to same position detected (mono-montage playlist) - forcing video replay'
  );
  // Don't call showMedia() - it will ignore duplicate
  // Instead, directly replay the current video
  window.TheApp?.replayCurrentVideo();
  return;
}

player.setPosition(nextPos);
this.showMedia(nextPos, true);
```

**File**: `src/App.tsx` - add new public method

```typescript
public replayCurrentVideo() {
  // Used for mono-montage playlists that loop to the same position
  const videoEl = this.state.videoShown === 1
    ? this.video1Ref.current
    : this.video2Ref.current;

  if (videoEl) {
    console.log('[App.replayCurrentVideo] Replaying from start (mono-montage loop)');
    videoEl.currentTime = 0;
    videoEl.play().catch(err => {
      console.warn('[App.replayCurrentVideo] Play failed:', err.message);
    });
  }
}
```

**Benefits**:
- ✅ No re-render - reuses existing video element
- ✅ No component recreation - preserves double-buffering
- ✅ No interference with track management
- ✅ Simple - just rewinds and replays current video

---

**Last Updated**: 2025-12-28
**Priority**: ⚠️ NEEDS TESTING - May be resolved, may need original fix implemented
**Action Required**: User to test single-montage playlists and report if stalling still occurs

---

# 2. Video Autoplay Implementation

### Current Status: ✅ IMPLEMENTED (HTML autoplay attribute)

**Last Reviewed**: 2025-12-28
**Parent UI Integration**: Yes - via `PlayerCommands2.js` AutostartToggle component

## Implementation Summary

### What Works Now ✅

1. **Parent UI Toggle** ([play C 3/play/src/PlayerCommands/PlayerCommands2.js:26-88](../../play%20C%203/play/src/PlayerCommands/PlayerCommands2.js#L26-L88))
   - `AutostartToggle` component with Play icon + Switch
   - Stores setting in `localStorage` (`house_autostart`)
   - Calls API `setHouseAutostart(houseId, value)` to persist server-side
   - Optimistic UI updates with error rollback

2. **Server-Side Storage** ([src/dao/House.ts:9](src/dao/House.ts#L9))
   - `House` DAO has `autostart_playlist: boolean` field
   - Value synced from server via WebSocket

3. **Webplayer Implementation** ([src/component/video.tsx:365](src/component/video.tsx#L365))
   - Video element uses: `autoPlay={wsTools.getHouseAutostart()}`
   - `wsTools.getHouseAutostart()` reads from `environ.house.autostart_playlist`
   - Debug logging shows autoplay state on component mount ([video.tsx:122-129](src/component/video.tsx#L122-L129))

### How It Works

**Flow**:
1. User toggles autostart in parent UI (play C 3)
2. Parent calls `setHouseAutostart(houseId, newValue)` API
3. Server updates `House.autostart_playlist` in database
4. Webplayer fetches environment via WebSocket → receives updated `house.autostart_playlist`
5. Video component reads `wsTools.getHouseAutostart()` → sets HTML `autoPlay` attribute
6. Browser respects `autoPlay={true/false}` for video playback

### Browser Autoplay Policies

Modern browsers restrict autoplay for user experience:
- ✅ **Muted videos**: Always allowed to autoplay
- ⚠️ **Unmuted videos**: Require user interaction first
- 📱 **Mobile Safari**: Requires `playsInline` attribute (already set)

Current implementation uses `muted` attribute ([video.tsx:368](src/component/video.tsx#L368)), so autoplay works reliably across all browsers.

### What Was Deferred (Sequencer AutoAdvance)

The following complexity was intentionally NOT implemented:

**Sequencer AutoAdvance Integration** (not implemented - deferred):
- Would control automatic playlist progression between items
- Requires coordination with HTML autoplay
- Not requested by users yet
- Current Sequencer has "natural flow" that works well

**Reason for Deferral**: Current HTML autoplay implementation is sufficient for the webplayer's target audience (newcomers, handheld, smart TV solutions). Sequencer autoAdvance adds complexity without clear user demand.

### Testing Status

- ✅ Chrome/Firefox/Safari/Edge: HTML autoplay works
- ✅ Mobile (iOS/Android): Works with `muted` + `playsInline`
- ✅ Smart TV: WebView implementations support autoplay
- ✅ Parent UI integration: Toggle syncs correctly

---

**Implementation Complete:** 2025-12-28 (HTML autoplay attribute)
**Future Work**: Sequencer autoAdvance integration if users request it

---

# 3. Video Chunk Delivery - Fragmented MP4 Migration

**Status**: Infrastructure implemented and ready. Automatic detection and fallback working.
**Priority**: Medium (optimization - current system works well)
**Reference**: See [docs/architecture/CHUNK_DELIVERY_ARCHITECTURE.md](docs/architecture/CHUNK_DELIVERY_ARCHITECTURE.md) for full implementation details.

### Current Limitation

All videos are currently **progressive MP4** (HandBrake baseline encoding), which are **not compatible** with MediaSource API chunk delivery. The system automatically detects this and falls back to browser native streaming with HTTP range requests, which works perfectly.

### Future Enhancement: Fragmented MP4 Support

When videos are re-encoded as **fragmented MP4**, the system will automatically use MediaSource-based chunked streaming with **zero code changes**.

**Benefits**:
- 512KB chunk delivery instead of full file downloads
- Better performance on mobile/3G/4G connections
- Faster initial playback (smaller initialization segment)
- More efficient bandwidth usage

### Required Changes

#### 1. HandBrake Encoding Updates

**Current Command** (produces progressive MP4):
```bash
HandBrake --input video.mov --output video.mp4 \
  --encoder x264 \
  --encoder-preset slow \
  --encoder-profile baseline \
  --quality 20
```

**Updated Command** (produces fragmented MP4):
```bash
HandBrake --input video.mov --output video.mp4 \
  --encoder x264 \
  --encoder-preset slow \
  --encoder-profile baseline \
  --quality 20 \
  --enable-x264-fragment
```

**Key Addition**: `--enable-x264-fragment` flag enables fragmentation during encoding.

#### 2. FFmpeg Post-Processing (Alternative Approach)

If you prefer to keep current HandBrake settings and post-process, use FFmpeg to convert existing progressive MP4 files to fragmented MP4:

```bash
ffmpeg -i input.mp4 -c copy -movflags frag_keyframe+empty_moov+default_base_moof output.mp4
```

**Flags Explained**:
- `frag_keyframe` - Create fragment at each keyframe
- `empty_moov` - Create minimal moov atom (faster startup)
- `default_base_moof` - Use moof-based fragments

**Advantages**:
- No re-encoding (fast)
- Preserves original quality
- Can be batched across existing library

#### 3. Server-Side Batch Processing

**Current**: Server-side batch process encodes videos with HandBrake, uploads to S3.

**Update Required**:
1. Add `--enable-x264-fragment` to HandBrake command in batch processing script
2. **OR** Add FFmpeg post-processing step after HandBrake encoding
3. Consider versioning strategy (keep old progressive MP4s? Re-encode entire library?)

**Considerations**:
- **Storage**: Fragmented MP4 files are similar size to progressive MP4
- **Processing Time**: Re-encoding entire library may take significant time
- **Migration Strategy**: Could use hybrid approach (new videos fragmented, old videos on-demand)

#### 4. Testing and Validation

Before deploying to production:

1. **Test Encoding**:
   ```bash
   # Encode test video with fragmentation
   HandBrake --input test.mov --output test-fragmented.mp4 --enable-x264-fragment

   # Verify structure
   node scripts/check-mp4-structure.js "https://your-cdn.com/test-fragmented.mp4"
   ```

2. **Expected Output**:
   ```
   📦 MP4 Box Structure:
     [ftyp] size: 32 bytes, offset: 0
     [moov] size: 13,651 bytes, offset: 32
     [moof] size: 1,024 bytes, offset: 13683
     [mdat] size: 524,288 bytes, offset: 14707
     [moof] size: 1,024 bytes, offset: 538995
     [mdat] size: 524,288 bytes, offset: 540019
     ...

   🎯 Verdict:
     ✅ FRAGMENTED MP4 - Compatible with MediaSource API!
   ```

3. **Monitor Console**: Should see MediaSource chunking logs instead of fallback warnings:
   ```
   [VideoStreamManager] Fragmented MP4 detected - proceeding with MediaSource streaming
   [ChunkManager] Requesting chunk 0: bytes 0-524287
   [ChunkManager] Requesting chunk 1: bytes 524288-1048575
   ```

### Performance Optimization Opportunities

Once fragmented MP4 is deployed, consider these enhancements:

#### 1. Adaptive Chunk Size
- **Current**: Fixed 512KB chunks
- **Enhancement**: Adjust chunk size based on network speed
- **Implementation**: Monitor download times, adjust `ChunkManager.config.chunkSize`

#### 2. Concurrent Chunk Loading
- **Current**: `maxConcurrentChunks: 1`
- **Enhancement**: Increase for faster connections (e.g., 2-3 concurrent)
- **Consideration**: May exhaust browser connection pool on slow networks

#### 3. Buffer Ahead Configuration
- **Current**: Fixed 5 seconds ahead buffering
- **Enhancement**: Increase for more stable playback on unstable networks
- **Implementation**: Adjust `VideoStreamManager.shouldLoadMoreChunks()` threshold

#### 4. Adaptive Bitrate Streaming (Advanced)
- Encode multiple quality levels (720p, 1080p, 4K)
- Switch quality based on network conditions
- Requires server-side support for multiple encodings

### Diagnostic Tools

#### Check MP4 Structure
```bash
node scripts/check-mp4-structure.js "https://your-cdn.com/video.mp4"
```

#### Browser Console Commands
```javascript
// Check chunk manager status
window.chunkManager.getStats()

// Check if MediaSource is supported
typeof MediaSource !== 'undefined'

// Inspect video element
document.getElementById('video-1')
```

### Migration Checklist

- [ ] Update HandBrake batch processing script with `--enable-x264-fragment`
- [ ] Test fragmented encoding with sample 4K video (50-60Hz)
- [ ] Verify file size comparison (fragmented vs progressive)
- [ ] Verify playback quality (no degradation expected)
- [ ] Test on multiple browsers (Chrome, Firefox, Safari)
- [ ] Test on mobile devices (iOS Safari, Android Chrome)
- [ ] Test on slow network (throttle to 3G in DevTools)
- [ ] Monitor chunk delivery logs in production
- [ ] Update CDN cache policies if needed (chunk-friendly caching)
- [ ] Decide on migration strategy (all at once vs gradual)
- [ ] Re-encode sample batch (10-20 videos)
- [ ] Deploy to production, monitor performance
- [ ] (Optional) Re-encode entire library or keep hybrid approach

### Expected Outcome

**Before** (Progressive MP4 - Current):
```
⚠️ [VideoStreamManager] Progressive MP4 detected - will use direct streaming
📹 Using direct streaming (progressive MP4 format)
```

**After** (Fragmented MP4 - Future):
```
✅ [VideoStreamManager] Fragmented MP4 detected - proceeding with MediaSource streaming
🎬 [Video Component #1] Initializing chunked streaming
[ChunkManager] Loading chunk 0/256 (512KB)
[ChunkManager] Loading chunk 1/256 (512KB)
✅ [Video #1] LOADED: video.mp4 via MediaSource chunks
```

### Resources

- **HandBrake Documentation**: [https://handbrake.fr/docs/](https://handbrake.fr/docs/)
- **FFmpeg Documentation**: [https://ffmpeg.org/ffmpeg-formats.html#mov_002c-mp4_002c-ismv](https://ffmpeg.org/ffmpeg-formats.html#mov_002c-mp4_002c-ismv)
- **MediaSource API**: [https://developer.mozilla.org/en-US/docs/Web/API/MediaSource](https://developer.mozilla.org/en-US/docs/Web/API/MediaSource)
- **MP4 Box Structure**: [https://www.cimarronsystems.com/wp-content/uploads/2017/04/Elements-of-the-H.264-VideoAAC-Audio-MP4-Movie-v2_0.pdf](https://www.cimarronsystems.com/wp-content/uploads/2017/04/Elements-of-the-H.264-VideoAAC-Audio-MP4-Movie-v2_0.pdf)

---

**Video Chunk Delivery Last Updated:** 2025-12-28
**Implementation Complete:** 2025-12-28 (detection and fallback working)
**Future Work:** Fragmented MP4 re-encoding when resources available

---

# 4. Same Encoding for Streaming vs Standalone?

**Status**: Planning - Unified encoding strategy recommended
**Priority**: High (affects storage costs and future Electron app)
**Last Reviewed**: 2025-12-28

## Context

The webplayer currently uses progressive MP4 (HandBrake baseline encoding) for streaming. Future requirements include:
- **Electron standalone app** with local file playback and encryption for copyrighted content
- **360° video support** (2026, separate channel)
- **S3 storage optimization** to minimize costs
- **Dual-slot loading** already handles performance (avoiding expensive CDN)

## Answer: Yes - Use Fragmented MP4 for Both

### Unified Encoding Approach

**Recommended**: Use **fragmented MP4** for both streaming and standalone with zero code changes in webplayer.

**Benefits**:
- ✅ **Same files** work for MediaSource API chunked streaming AND whole-file download
- ✅ **Reduced storage** - single file set instead of maintaining two separate encodings
- ✅ **Encryption layer** applies seamlessly to standalone downloads (DRM or AES-128)
- ✅ **Zero webplayer changes** - system already detects fragmented MP4 automatically
- ✅ **Future-proof** for 360° videos (fragmented MP4 supports equirectangular projection)

### Multi-Tier Encoding Strategy

```
Original (4K 60fps source)
├── 4K (3840x2160) - Fragmented MP4, HEVC/H.265, CRF 22-24
├── 3K (2560x1440) - Fragmented MP4, HEVC/H.265, CRF 23-25
├── HD (1920x1080) - Fragmented MP4, H.264 baseline, CRF 23
├── SD (722x406)    - Fragmented MP4, H.264 baseline, CRF 24  ⚠️ CMO-COMPLIANT
└── TN (thumbnail)  - JPEG/WebP, 722x406 pixels
```

**SD Resolution Rationale** (722x406):
- ✅ **CMO-Compliant**: ADAGP/SABAM Copyright Management Organizations allow preview sizes where width + height < 1200px (722 + 406 = 1128px)
- ✅ **16:9 aspect ratio** preserved (722 ÷ 406 ≈ 1.78)
- ✅ **Small file size** for mobile/preview use
- ✅ **Legal compliance** for copyrighted artwork display

**Codec Selection**:
- **H.265/HEVC** for 4K/3K: 35-50% smaller files (critical for S3 storage costs)
- **H.264 baseline** for HD/SD: Maximum compatibility across all devices
- **Fragmented container**: Both codecs support it, works for streaming AND standalone

### Storage Architecture

**Current**: S3 with dual-slot loading (no CDN needed)

**Why No CDN**:
- ⚠️ CDN costs increase dramatically compared to S3 alone
- ✅ **Dual-slot approach** already provides performance bypass (play slot 1 while slot 2 loads)
- ✅ S3 HTTP range requests work well for progressive/fragmented MP4
- ✅ Browser native streaming handles buffering efficiently

**Exception**: Consider CloudFront only for:
- Geographic distribution if users are global (can use S3 Transfer Acceleration instead)
- DDoS protection (but use AWS Shield or CloudFlare proxy instead)

### Implementation for Standalone (Electron)

**Encryption Layer** (for copyrighted content):
```typescript
// Electron app decrypts fragmented MP4 on-the-fly
const decryptedBuffer = await decryptFile(encryptedMP4Path, userKey);
const blob = new Blob([decryptedBuffer], { type: 'video/mp4' });
const url = URL.createObjectURL(blob);
videoElement.src = url; // Same fragmented MP4, just decrypted locally
```

**No Re-encoding Needed**:
- Download encrypted fragmented MP4 files to local storage
- Decrypt in memory during playback
- Same webplayer code handles playback (MediaSource or direct)

### 360° Video Preparation (2026)

**Fragmented MP4 supports equirectangular projection**:
```typescript
// Same container format, different spatial metadata
<video src="360-video-fragmented.mp4" />
// Use Three.js or A-Frame for sphere mapping
```

**Benefits of Fragmented MP4 for 360°**:
- ✅ **Chunked loading** reduces memory pressure (360° videos are huge)
- ✅ **Same encoding pipeline** as regular videos
- ✅ **Spatial audio** supported in MP4 container

---

**Last Updated**: 2025-12-28
**Priority**: High - Affects storage strategy and future Electron app
**Next Steps**:
1. Update HandBrake batch processing to produce fragmented MP4
2. Test with sample 4K video
3. Verify CMO-compliant SD resolution (722x406)

---

# 5. Partial File Updates: Practical Implementation

**Status**: Planning - Phased approach for small company
**Priority**: Medium (optimization - current system works)
**Last Reviewed**: 2025-12-28

## Problem

When source videos or metadata change, the current batch processing re-encodes **all derivative formats** even if only one format changed. This wastes:
- **Processing time**: Hours of unnecessary encoding
- **Storage**: Duplicate versions of unchanged files
- **Bandwidth**: Re-uploading files that didn't change

**Example Waste**:
```
Source video updated → Re-encode all formats
- 4K re-encoded (needed) ✅
- 3K re-encoded (needed - depends on 4K) ✅
- HD re-encoded (NOT needed - unchanged source) ❌ WASTE
- SD re-encoded (NOT needed - unchanged source) ❌ WASTE
- TN re-created (NOT needed - unchanged source) ❌ WASTE

Result: 40-80% unnecessary reprocessing
```

## Solution: Dependency Graph + Hash-based Change Detection

### Phase 1 (2025 Q1-Q2) - Foundation

**Goal**: Reduce unnecessary reprocessing by 40-80%

#### 1.1 Database Schema for Format Tracking

**New Table**: `video_formats`
```sql
CREATE TABLE video_formats (
  id INT PRIMARY KEY AUTO_INCREMENT,
  artwork_id INT NOT NULL,
  format_type ENUM('source', '4K', '3K', 'HD', 'SD', 'TN') NOT NULL,
  file_path VARCHAR(512) NOT NULL,
  file_hash VARCHAR(64) NOT NULL,  -- SHA-256 of file content
  file_size BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  parent_format_id INT NULL,  -- Foreign key to parent format in dependency graph

  FOREIGN KEY (artwork_id) REFERENCES artworks(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_format_id) REFERENCES video_formats(id) ON DELETE SET NULL,

  UNIQUE KEY unique_artwork_format (artwork_id, format_type),
  INDEX idx_file_hash (file_hash)
);
```

**Dependency Relationships**:
```
source → 4K → 3K → HD → SD → TN
         ↓
        (all children)
```

#### 1.2 Hash-based Change Detection

**Before Processing**:
```javascript
async function determineProcessingNeeds(artworkId, changedFormat) {
  // Get current hash from database
  const currentRecord = await db.query(
    'SELECT file_hash FROM video_formats WHERE artwork_id = ? AND format_type = ?',
    [artworkId, changedFormat]
  );

  // Compute hash of new file
  const newFileHash = await computeSHA256(newFilePath);

  // Compare hashes
  if (currentRecord && currentRecord.file_hash === newFileHash) {
    console.log(`✅ ${changedFormat} unchanged - skipping reprocessing`);
    return []; // No processing needed
  }

  // File changed - determine dependents
  const needsReprocessing = [];

  function markDependents(formatType) {
    const formatHierarchy = {
      'source': ['4K'],
      '4K': ['3K'],
      '3K': ['HD'],
      'HD': ['SD'],
      'SD': ['TN']
    };

    const children = formatHierarchy[formatType] || [];
    children.forEach(child => {
      if (!needsReprocessing.includes(child)) {
        needsReprocessing.push(child);
        markDependents(child); // Recursive
      }
    });
  }

  markDependents(changedFormat);

  console.log(`📋 Processing needed for: ${changedFormat} → [${needsReprocessing.join(', ')}]`);
  return needsReprocessing;
}
```

**Example Output**:
```
Source changed → Reprocess: 4K, 3K, HD, SD, TN
4K changed → Reprocess: 3K, HD, SD, TN
HD changed → Reprocess: SD, TN
SD changed → Reprocess: TN
TN changed → Reprocess: (nothing)
```

#### 1.3 Conditional Processing Pipeline

**Batch Processing Script** (pseudo-code):
```javascript
async function processBatchVideos(artworks) {
  for (const artwork of artworks) {
    // Step 1: Determine what changed
    const changedFormats = await detectChanges(artwork.id);

    // Step 2: For each changed format, determine dependents
    const allProcessingNeeds = new Set();

    for (const changedFormat of changedFormats) {
      const dependents = await determineProcessingNeeds(artwork.id, changedFormat);
      dependents.forEach(format => allProcessingNeeds.add(format));
    }

    // Step 3: Process only what's needed
    if (allProcessingNeeds.size === 0) {
      console.log(`✅ Artwork ${artwork.id} - No changes detected, skipping`);
      continue;
    }

    console.log(`🔄 Artwork ${artwork.id} - Processing: [${[...allProcessingNeeds].join(', ')}]`);

    // Step 4: Execute encoding pipeline
    if (allProcessingNeeds.has('4K')) {
      await encode4K(artwork);
      await updateFormatRecord(artwork.id, '4K', await computeHash('4K'));
    }

    if (allProcessingNeeds.has('3K')) {
      await encode3K(artwork);
      await updateFormatRecord(artwork.id, '3K', await computeHash('3K'));
    }

    // ... continue for HD, SD, TN
  }
}
```

**Expected Savings**:
- **Scenario 1**: Only metadata changed (title, description) → 0% reprocessing
- **Scenario 2**: Source video replaced → 100% reprocessing (necessary)
- **Scenario 3**: 4K manually tweaked → Reprocess 3K, HD, SD, TN only (skip source, skip 4K)
- **Average**: 40-80% reduction in unnecessary processing

### Phase 2 (2025 Q3-Q4) - GPU Acceleration

**Goal**: 5-47x faster encoding with hardware acceleration

#### Replace HandBrake CPU-only with FFmpeg GPU Encoding

**Current HandBrake** (CPU-only, slow):
```bash
HandBrake --input source.mov --output 4k.mp4 \
  --encoder x264 \
  --encoder-preset slow \
  --encoder-profile baseline \
  --quality 20
```

**New FFmpeg with GPU** (NVIDIA NVENC - 5-6x faster):
```bash
ffmpeg -i source.mov \
  -c:v hevc_nvenc \
  -preset p7 \
  -cq:v 24 \
  -movflags frag_keyframe+empty_moov+default_base_moof \
  -f mp4 4k.mp4
```

**Hardware Options**:
- **NVIDIA GPU** (NVENC): 5-6x faster, works on GeForce/Quadro/Tesla
- **Intel CPU** (Quick Sync): 3-4x faster, works on recent Intel CPUs
- **Apple Silicon** (VideoToolbox): 4-5x faster, works on M1/M2/M3 Macs

**Cost**:
- **$0**: Use existing hardware (if GPU/Quick Sync available)
- **~$500-1500**: Buy dedicated GPU (e.g., NVIDIA RTX 4060 or better)

**Example Batch Encoding** (with GPU):
```bash
# 4K HEVC (fragmented MP4)
ffmpeg -i source.mov \
  -c:v hevc_nvenc -preset p7 -cq:v 22 \
  -s 3840x2160 \
  -movflags frag_keyframe+empty_moov+default_base_moof \
  -f mp4 4k.mp4

# 3K HEVC (fragmented MP4)
ffmpeg -i source.mov \
  -c:v hevc_nvenc -preset p7 -cq:v 24 \
  -s 2560x1440 \
  -movflags frag_keyframe+empty_moov+default_base_moof \
  -f mp4 3k.mp4

# HD H.264 baseline (fragmented MP4)
ffmpeg -i source.mov \
  -c:v h264_nvenc -preset p7 -profile:v baseline -cq:v 23 \
  -s 1920x1080 \
  -movflags frag_keyframe+empty_moov+default_base_moof \
  -f mp4 hd.mp4

# SD H.264 baseline (CMO-compliant, fragmented MP4)
ffmpeg -i source.mov \
  -c:v h264_nvenc -preset p7 -profile:v baseline -cq:v 24 \
  -s 722x406 \
  -movflags frag_keyframe+empty_moov+default_base_moof \
  -f mp4 sd.mp4

# Thumbnail JPEG
ffmpeg -i source.mov -vf "thumbnail,scale=722:406" -frames:v 1 thumbnail.jpg
```

### Phase 3 (2026 Q1-Q2) - 360° Video Preparation

**Goal**: Support 360° videos without memory exhaustion

#### Segment-based Processing for 360° Videos

**Challenge**: 360° videos are massive (e.g., 8K equirectangular = 50GB+ source)

**Solution**: Process in GOP-aligned segments (10-second chunks)
```javascript
async function process360Video(sourceVideo) {
  const segmentDuration = 10; // seconds
  const totalDuration = await getVideoDuration(sourceVideo);
  const segments = Math.ceil(totalDuration / segmentDuration);

  for (let i = 0; i < segments; i++) {
    const startTime = i * segmentDuration;

    // Extract 10-second segment
    await ffmpeg(`
      -i ${sourceVideo}
      -ss ${startTime}
      -t ${segmentDuration}
      -c copy
      segment_${i}.mp4
    `);

    // Encode segment to 4K
    await ffmpeg(`
      -i segment_${i}.mp4
      -c:v hevc_nvenc -preset p7 -cq:v 22
      -s 3840x2160
      -movflags frag_keyframe+empty_moov+default_base_moof
      segment_${i}_4k.mp4
    `);

    // Delete temporary segment
    await deleteFile(`segment_${i}.mp4`);
  }

  // Concatenate all encoded segments
  await ffmpeg(`
    -f concat -safe 0 -i segments.txt
    -c copy
    360_video_4k.mp4
  `);
}
```

**Expected Savings**:
- **Memory**: Reduces peak memory from 20GB+ to <2GB per segment
- **Partial Updates**: If only segment 5 changed, only reprocess segment 5 (40-60% savings)

### Phase 4 (2026 Q3+) - Optimization & Scale

**Goal**: Further optimize for large-scale operations

#### Smart Caching with Priority Scoring

**Cache popular formats** based on access patterns:
```javascript
function calculatePriority(artwork) {
  return (
    artwork.viewCount * 0.5 +
    artwork.downloadCount * 2.0 +
    (Date.now() - artwork.lastAccessTime < 7 * 24 * 3600 * 1000 ? 100 : 0) // Recent access bonus
  );
}
```

**Pre-generate high-priority formats**, defer low-priority on-demand.

#### Edge Processing for Thumbnails

**Generate thumbnails on-demand** at CDN edge (if CDN is eventually added):
- Use Lambda@Edge or Cloudflare Workers
- Cache generated thumbnails in CDN
- Reduces S3 storage for rarely-accessed artworks

**Note**: Only consider if CDN becomes necessary (currently avoided due to dual-slot approach)

---

## Implementation Checklist

### Phase 1 (Foundation) - 2025 Q1-Q2
- [ ] Create `video_formats` database table with dependency tracking
- [ ] Implement SHA-256 hash computation for video files
- [ ] Build dependency graph resolver (format hierarchy)
- [ ] Update batch processing script with conditional pipeline
- [ ] Test with sample artwork library (10-20 videos)
- [ ] Measure reprocessing reduction (target: 40-80%)

### Phase 2 (GPU Acceleration) - 2025 Q3-Q4
- [ ] Identify available GPU hardware (NVIDIA/Intel/Apple)
- [ ] Install FFmpeg with GPU support (compile with `--enable-nvenc` or use pre-built)
- [ ] Replace HandBrake commands with FFmpeg GPU equivalents
- [ ] Test encoding quality (CRF values may need adjustment)
- [ ] Benchmark speedup (target: 5-10x for HEVC, 3-5x for H.264)
- [ ] Update batch processing to use GPU encoding

### Phase 3 (360° Preparation) - 2026 Q1-Q2
- [ ] Research 360° video storage formats (equirectangular vs cubemap)
- [ ] Implement segment-based processing (10-second GOPs)
- [ ] Test with sample 360° video (8K equirectangular)
- [ ] Verify spatial audio preservation
- [ ] Update webplayer to support 360° playback (Three.js/A-Frame)

### Phase 4 (Optimization) - 2026 Q3+
- [ ] Implement priority scoring for cache management
- [ ] Consider edge processing for thumbnails (if CDN added later)
- [ ] Monitor S3 storage costs and optimize tier distribution
- [ ] Evaluate adaptive bitrate streaming (HLS/DASH) if needed

---

**Last Updated**: 2025-12-28
**Priority**: Medium (optimization - current system works)
**Expected Savings**: 40-80% reduction in unnecessary reprocessing (Phase 1)
**Performance Gain**: 5-47x faster encoding with GPU (Phase 2)