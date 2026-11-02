# Specification: Audio Layer (Soundscape — seq 5)

## Overview

Implement the Soundscape layer (seq 5) in the webplayer using the Web Audio API. This layer plays ambient audio, narration, and sound effects synchronised with the visual timeline, independently from the video audio track.

## Current state

- Video audio exists via native `<video>` element with `setVolume()`
- No Web Audio API usage
- No audio-only playback (`AUD` type declared in Artwork but not implemented)
- No spatial audio, no crossfading between audio items

## Architecture

### New module: `AudioEngine.ts`

```
src/manager/
├── Sequencer.ts          (existing)
├── ItemPlayer.ts         (existing)
└── AudioEngine.ts        (NEW)

src/media/
├── MediaFile.ts          (existing)
└── AudioMediaFile.ts     (NEW)
```

### Web Audio API graph

```
AudioContext
├── GainNode (masterGain)            — overall volume
│   ├── GainNode (soundscapeGain)    — seq 5 volume
│   │   ├── AudioBufferSourceNode    — current audio item
│   │   └── AudioBufferSourceNode    — next audio (crossfade)
│   ├── GainNode (videoGain)         — existing video audio
│   │   └── MediaElementSourceNode   — <video> element
│   └── GainNode (effectsGain)       — p5.js / sensor-triggered sounds
│       └── AudioBufferSourceNode    — one-shot effects
└── destination (speakers)
```

### AudioEngine class

```typescript
export class AudioEngine {
  private ctx: AudioContext;
  private masterGain: GainNode;
  private soundscapeGain: GainNode;
  private videoGain: GainNode;
  private effectsGain: GainNode;

  private currentSource: AudioBufferSourceNode | null = null;
  private nextSource: AudioBufferSourceNode | null = null;
  private audioCache: Map<string, AudioBuffer> = new Map();

  private sequencer: Sequencer;

  constructor(sequencer: Sequencer) {
    this.sequencer = sequencer;
    this.ctx = new AudioContext();

    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);

    this.soundscapeGain = this.ctx.createGain();
    this.soundscapeGain.connect(this.masterGain);

    this.videoGain = this.ctx.createGain();
    this.videoGain.connect(this.masterGain);

    this.effectsGain = this.ctx.createGain();
    this.effectsGain.connect(this.masterGain);
  }

  // Resume AudioContext after user interaction (browser autoplay policy)
  async resume(): Promise<void> {
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  // Load and decode an audio file
  async preload(url: string): Promise<AudioBuffer> {
    if (this.audioCache.has(url)) {
      return this.audioCache.get(url)!;
    }
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
    this.audioCache.set(url, audioBuffer);
    return audioBuffer;
  }

  // Play a soundscape item with optional crossfade from current
  async playSoundscape(item: AudioItem, crossfadeDuration: number = 2.0): Promise<void> {
    const buffer = await this.preload(item.url);

    const newSource = this.ctx.createBufferSource();
    newSource.buffer = buffer;
    newSource.loop = item.loop;

    const newGain = this.ctx.createGain();
    newGain.gain.setValueAtTime(0, this.ctx.currentTime);
    newSource.connect(newGain);
    newGain.connect(this.soundscapeGain);

    // Crossfade
    newGain.gain.linearRampToValueAtTime(
      item.volume, this.ctx.currentTime + crossfadeDuration
    );

    if (this.currentSource) {
      // Fade out current
      const oldGain = this.currentSource._gainNode; // stored reference
      oldGain?.gain.linearRampToValueAtTime(0, this.ctx.currentTime + crossfadeDuration);
      setTimeout(() => {
        try { this.currentSource?.stop(); } catch(e) {}
      }, crossfadeDuration * 1000);
    }

    newSource.start(0, item.startOffset ?? 0);
    this.currentSource = newSource;
    (this.currentSource as any)._gainNode = newGain;
  }

  // Stop soundscape with fade-out
  stopSoundscape(fadeDuration: number = 1.0): void {
    if (this.currentSource) {
      const gain = (this.currentSource as any)._gainNode;
      gain?.gain.linearRampToValueAtTime(0, this.ctx.currentTime + fadeDuration);
      setTimeout(() => {
        try { this.currentSource?.stop(); } catch(e) {}
        this.currentSource = null;
      }, fadeDuration * 1000);
    }
  }

  // Connect existing <video> element to the audio graph
  connectVideoElement(videoElement: HTMLVideoElement): MediaElementAudioSourceNode {
    const source = this.ctx.createMediaElementSource(videoElement);
    source.connect(this.videoGain);
    return source;
  }

  // Volume controls
  setMasterVolume(v: number, rampDuration: number = 0.5): void {
    this.masterGain.gain.linearRampToValueAtTime(v, this.ctx.currentTime + rampDuration);
  }

  setSoundscapeVolume(v: number, rampDuration: number = 0.5): void {
    this.soundscapeGain.gain.linearRampToValueAtTime(v, this.ctx.currentTime + rampDuration);
  }

  setVideoVolume(v: number, rampDuration: number = 0.5): void {
    this.videoGain.gain.linearRampToValueAtTime(v, this.ctx.currentTime + rampDuration);
  }

  // Play a one-shot sound effect (sensor trigger, p5.js event)
  async playEffect(url: string, volume: number = 1.0): Promise<void> {
    const buffer = await this.preload(url);
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    source.connect(gain);
    gain.connect(this.effectsGain);
    source.start();
  }
}
```

### AudioItem interface

```typescript
export interface AudioItem {
  url: string;
  volume: number;         // 0.0 – 1.0
  loop: boolean;          // true for ambient soundscapes
  startOffset?: number;   // seconds into the audio to start
  fadeIn?: number;        // seconds
  fadeOut?: number;        // seconds
}
```

## AudioMediaFile class

```typescript
export class AudioMediaFile extends MediaFile {
  private audioEngine: AudioEngine;
  private audioItem: AudioItem;

  constructor(
    aid: number, id: string, url: string, filename: string,
    offset: number, duration: number,
    shapes: Shape[] | undefined, backgroundColor: string | undefined,
    audioEngine: AudioEngine, audioItem: AudioItem
  ) {
    super(aid, id, url, filename, offset, duration, shapes, backgroundColor);
    this.audioEngine = audioEngine;
    this.audioItem = audioItem;
  }

  loadUrl(url: string): void {
    // Preload audio buffer
    this.audioEngine.preload(url);
  }

  start(offset: number): void {
    this.audioEngine.playSoundscape({
      ...this.audioItem,
      startOffset: offset
    });
  }

  isVideo(): boolean { return false; }
  isAudio(): boolean { return true; }

  stop(): void {
    this.audioEngine.stopSoundscape(this.audioItem.fadeOut ?? 1.0);
  }

  pause(): void {
    // Web Audio API doesn't have native pause for BufferSource
    // Workaround: ramp volume to 0
    this.audioEngine.setSoundscapeVolume(0, 0.3);
  }

  setVolume(v: number): void {
    this.audioEngine.setSoundscapeVolume(v);
  }
}
```

## Soundscape layer in the montage

### Data model

Seq 5 items contain audio content:

```javascript
// Montage JSON from server
{
  seqs: [
    // seq 1-4: visual tracks
    {
      // seq 5: Soundscape layer
      array_content: [
        {
          artwork_id: 789,
          offset: 0,
          duration: 120,        // 2 minutes of ambient forest
          repeat: 4,            // loop 4 times = 8 minutes total
          artwork: {
            artwork_id: 789,
            type: "AUD",
            url: "https://s3.../forest-ambient.mp3",
            duration: 120
          },
          effect_type: "soundscape",
          effect_data: JSON.stringify({
            volume: 0.6,
            loop: true,
            fadeIn: 3.0,
            fadeOut: 3.0,
            crossfade: 2.0       // crossfade with next audio item
          })
        },
        {
          artwork_id: 790,
          offset: 480,           // starts at 8 minutes
          duration: 102.63,
          artwork: {
            artwork_id: 790,
            type: "AUD",
            url: "https://s3.../ocean-waves.mp3",
            duration: 102.63
          },
          effect_type: "soundscape",
          effect_data: JSON.stringify({
            volume: 0.4,
            loop: false,
            fadeIn: 5.0,
            fadeOut: 5.0
          })
        }
      ]
    },
    // seq 6: Ambiance (DMX)
    // seq 7: Presence (Sensor)
  ]
}
```

### Sequencer integration

The `Sequencer` runs a parallel timeline for seq 5:

```typescript
// In Sequencer.ts — add audio tracking
private audioEngine: AudioEngine;
private currentAudioItemIndex: number = -1;
private soundscapeItems: Item[] = [];

// When montage loads:
loadSoundscapeLayer(montage: Montage): void {
  const audioTrack = montage.seqs[4]; // seq 5 = index 4
  if (!audioTrack) return;
  this.soundscapeItems = audioTrack.items;

  // Preload first audio item
  if (this.soundscapeItems.length > 0) {
    const firstItem = this.soundscapeItems[0];
    this.audioEngine.preload(firstItem.artwork!.url);
  }
}

// In the run() loop — check if audio item should change:
updateSoundscape(currentTime: number): void {
  for (let i = 0; i < this.soundscapeItems.length; i++) {
    const item = this.soundscapeItems[i];
    const endTime = item.offset + item.duration * (item.repeat || 1);

    if (currentTime >= item.offset && currentTime < endTime) {
      if (i !== this.currentAudioItemIndex) {
        this.currentAudioItemIndex = i;
        const config = JSON.parse(item.effect_data ?? '{}');
        this.audioEngine.playSoundscape({
          url: item.artwork!.url,
          volume: config.volume ?? 1.0,
          loop: config.loop ?? false,
          fadeIn: config.fadeIn ?? 2.0,
          fadeOut: config.fadeOut ?? 2.0,
          startOffset: currentTime - item.offset
        }, config.crossfade ?? 2.0);
      }
      return;
    }
  }

  // No active audio item at this time
  if (this.currentAudioItemIndex !== -1) {
    this.currentAudioItemIndex = -1;
    this.audioEngine.stopSoundscape();
  }
}
```

## Browser autoplay policy

Web Audio API requires user interaction before `AudioContext` can start. The webplayer should:

1. Create `AudioContext` in `suspended` state on page load
2. On first user interaction (click, touch) OR on first WebSocket `play` command, call `audioEngine.resume()`
3. If the player is in a kiosk/digital signage environment with Chrome flags `--autoplay-policy=no-user-gesture-required`, autoplay works directly

## Video audio integration

Currently video audio goes directly to speakers. With `AudioEngine`, route it through the graph:

```typescript
// In App.tsx, when a <video> element is ready:
const videoEl = document.getElementById('video1') as HTMLVideoElement;
videoEl.muted = true; // mute native output
this.audioEngine.connectVideoElement(videoEl); // route through Web Audio graph
```

This allows:
- Consistent volume control across video and soundscape
- Crossfading video audio with soundscape
- Future: spatial audio positioning

## Implementation estimate

| Task | Effort |
|------|--------|
| AudioEngine class (Web Audio graph setup) | 1.5 days |
| AudioMediaFile class | 1 day |
| Preload + cache system | 0.5 day |
| Crossfade logic | 1 day |
| Sequencer: soundscape timeline tracking | 1.5 days |
| Video audio rerouting through AudioEngine | 1 day |
| Autoplay policy handling | 0.5 day |
| Volume controls (master, soundscape, video) | 0.5 day |
| Effects channel (one-shot sounds for sensors/p5) | 0.5 day |
| Item.ts: AUD type parsing + soundscape config | 0.5 day |
| **Total** | **~8–9 days** |
