# Specification: DMX/ArtNet Bridge (Ambiance Layer — seq 6)

## Overview

Implement the Ambiance layer (seq 6) that controls exhibition lighting via DMX (ArtNet protocol). Since browsers cannot send ArtNet (UDP broadcast) directly, a lightweight backend bridge translates HTTP/WebSocket commands into ArtNet packets on the local network.

## Architecture

```
┌──────────────┐   WebSocket     ┌──────────────┐   ArtNet/UDP    ┌──────────────┐
│  Webplayer   │ ───────────────→│   Backend    │ ───────────────→│  DMX Fixtures│
│  DMX Engine  │   dmx commands  │  ArtNet      │   broadcast     │  (LED, spots)│
│  (seq 6)     │                 │  Bridge      │   port 6454     │              │
└──────────────┘                 │  (Node.js)   │                 └──────────────┘
                                 │  dmxnet      │
                                 └──────────────┘
```

### Why a backend bridge?

- ArtNet uses UDP broadcast on port 6454 — browsers cannot send UDP
- The bridge is a simple Node.js process using **dmxnet** (npm package, well-maintained)
- Same bridge process can serve both the OSC bridge (SPEC_SENSOR_BRIDGE.md) and ArtNet output
- Runs on the same machine as the webplayer or on the local network

## Part 1: ArtNet Bridge (Backend, Node.js)

### Technology

- **dmxnet** (npm: `dmxnet`) — ArtNet sender/receiver for Node.js
- Listens for commands via WebSocket (same WS connection as existing player communication) or HTTP API
- Sends ArtNet packets (sACN/E1.31 support possible via dmxnet)

### Bridge implementation

```typescript
// artnet-bridge.ts
import dmxnet from 'dmxnet';

const dmxnetInstance = new dmxnet.dmxnet({
  verbose: 0,
  oem: 0,
  sName: 'WallMuse',
  lName: 'WallMuse Ambiance Controller'
});

// Create a sender for each universe configured
const senders: Map<number, any> = new Map();

function getOrCreateSender(universe: number): any {
  if (!senders.has(universe)) {
    const sender = dmxnetInstance.newSender({
      ip: '255.255.255.255',  // broadcast
      subnet: 0,
      universe: universe,
      net: 0
    });
    senders.set(universe, sender);
  }
  return senders.get(universe)!;
}

// Set a single channel value
function setChannel(universe: number, channel: number, value: number): void {
  const sender = getOrCreateSender(universe);
  sender.prepChannel(channel, Math.max(0, Math.min(255, Math.round(value))));
  sender.transmit();
}

// Set multiple channels at once (a DMX scene)
function setScene(universe: number, channels: Record<number, number>): void {
  const sender = getOrCreateSender(universe);
  for (const [ch, val] of Object.entries(channels)) {
    sender.prepChannel(parseInt(ch), Math.max(0, Math.min(255, Math.round(val))));
  }
  sender.transmit();
}

// Fade between two scenes over duration
function fadeScene(
  universe: number,
  fromChannels: Record<number, number>,
  toChannels: Record<number, number>,
  durationMs: number,
  stepsPerSecond: number = 40  // 40 Hz update rate
): void {
  const stepCount = Math.ceil(durationMs / 1000 * stepsPerSecond);
  const interval = durationMs / stepCount;
  let step = 0;

  const timer = setInterval(() => {
    step++;
    const progress = step / stepCount;
    const sender = getOrCreateSender(universe);

    const allChannels = new Set([
      ...Object.keys(fromChannels).map(Number),
      ...Object.keys(toChannels).map(Number)
    ]);

    for (const ch of allChannels) {
      const from = fromChannels[ch] ?? 0;
      const to = toChannels[ch] ?? 0;
      const value = from + (to - from) * progress;
      sender.prepChannel(ch, Math.max(0, Math.min(255, Math.round(value))));
    }
    sender.transmit();

    if (step >= stepCount) {
      clearInterval(timer);
    }
  }, interval);
}
```

### WebSocket command format

DMX commands flow through the existing WebSocket channel with `tag_name: 'dmx'`:

```typescript
// Scene change (immediate)
{
  tag_name: 'dmx',
  action: 'set_scene',
  data: {
    universe: 0,
    channels: { 1: 255, 2: 128, 3: 64, 4: 0, 5: 200, 6: 150, 7: 100 }
  }
}

// Fade transition
{
  tag_name: 'dmx',
  action: 'fade',
  data: {
    universe: 0,
    from: { 1: 255, 2: 128, 3: 64 },
    to: { 1: 64, 2: 200, 3: 255 },
    duration: 3000  // ms
  }
}

// Blackout
{
  tag_name: 'dmx',
  action: 'blackout',
  data: { universe: 0 }
}

// All channels full
{
  tag_name: 'dmx',
  action: 'full',
  data: { universe: 0 }
}
```

### HTTP API (alternative for testing)

```
POST /api/dmx/scene     { universe, channels }
POST /api/dmx/fade      { universe, from, to, duration }
POST /api/dmx/blackout  { universe }
GET  /api/dmx/status    → current channel values per universe
```

## Part 2: DMX Engine (Webplayer)

### New module: `DmxEngine.ts`

```
src/manager/
├── Sequencer.ts          (existing)
├── AudioEngine.ts        (from SPEC_AUDIO_LAYER)
├── SensorEngine.ts       (from SPEC_SENSOR_BRIDGE)
└── DmxEngine.ts          (NEW)
```

### DmxEngine class

```typescript
export class DmxEngine {
  private wsTools: WsTools;
  private currentScene: DmxScene | null = null;
  private currentItemIndex: number = -1;
  private ambianceItems: Item[] = [];

  constructor(wsTools: WsTools) {
    this.wsTools = wsTools;
  }

  // Load ambiance layer from montage
  loadAmbianceLayer(montage: Montage): void {
    const dmxTrack = montage.seqs[5]; // seq 6 = index 5
    if (!dmxTrack) {
      this.ambianceItems = [];
      return;
    }
    this.ambianceItems = dmxTrack.items ?? [];
  }

  // Called by Sequencer's run loop
  updateAmbiance(currentTime: number): void {
    for (let i = 0; i < this.ambianceItems.length; i++) {
      const item = this.ambianceItems[i];
      const endTime = item.offset + item.duration;

      if (currentTime >= item.offset && currentTime < endTime) {
        if (i !== this.currentItemIndex) {
          const prevScene = this.currentScene;
          this.currentItemIndex = i;

          const config: DmxSceneConfig = JSON.parse(item.effect_data ?? '{}');
          this.currentScene = config.scene;

          if (prevScene && config.transitionDuration > 0) {
            this.fadeToScene(prevScene, config.scene, config.transitionDuration);
          } else {
            this.setScene(config.scene);
          }
        }
        return;
      }
    }

    // No active ambiance item — blackout or hold last scene
    if (this.currentItemIndex !== -1) {
      this.currentItemIndex = -1;
      // Optional: blackout when no ambiance defined
      // this.blackout();
    }
  }

  // Send scene to bridge
  private setScene(scene: DmxScene): void {
    this.wsTools.send({
      tag_name: 'dmx',
      action: 'set_scene',
      data: {
        universe: scene.universe ?? 0,
        channels: scene.channels
      }
    });
  }

  // Fade between scenes
  private fadeToScene(from: DmxScene, to: DmxScene, durationMs: number): void {
    this.wsTools.send({
      tag_name: 'dmx',
      action: 'fade',
      data: {
        universe: to.universe ?? 0,
        from: from.channels,
        to: to.channels,
        duration: durationMs
      }
    });
  }

  // Immediate blackout
  blackout(): void {
    this.wsTools.send({
      tag_name: 'dmx',
      action: 'blackout',
      data: { universe: 0 }
    });
  }

  // Sensor-triggered scene override (called by SensorEngine)
  overrideScene(scene: DmxScene, fadeDuration: number = 1000): void {
    const from = this.currentScene;
    if (from) {
      this.fadeToScene(from, scene, fadeDuration);
    } else {
      this.setScene(scene);
    }
  }

  // Restore scheduled scene after sensor override
  restoreScheduledScene(fadeDuration: number = 1000): void {
    if (this.currentScene) {
      this.setScene(this.currentScene); // will fade from bridge's current state
    }
  }
}
```

### Data types

```typescript
// DmxScene — a set of channel values
export interface DmxScene {
  universe: number;
  channels: Record<number, number>;  // channel (1-512) → value (0-255)
  label?: string;                    // human-readable name, e.g. "Warm Spotlight"
}

// DmxSceneConfig — stored in Item.effect_data for seq 6 items
export interface DmxSceneConfig {
  scene: DmxScene;
  transitionDuration: number;  // ms, fade from previous scene
}
```

## Ambiance layer in the montage

### Data model

Seq 6 items represent lighting scenes:

```javascript
{
  seqs: [
    // seq 1-4: visual tracks
    // seq 5: Soundscape
    {
      // seq 6: Ambiance (DMX)
      array_content: [
        {
          artwork_id: null,        // no visual artwork
          offset: 0,
          duration: 291.3,         // first half of montage
          effect_type: "dmx",
          effect_data: JSON.stringify({
            scene: {
              universe: 0,
              channels: {
                1: 255, 2: 180, 3: 80,    // fixture 1: warm white
                5: 200, 6: 140, 7: 60     // fixture 2: warm white
              },
              label: "Warm contemplative"
            },
            transitionDuration: 3000
          })
        },
        {
          artwork_id: null,
          offset: 291.3,
          duration: 291.33,
          effect_type: "dmx",
          effect_data: JSON.stringify({
            scene: {
              universe: 0,
              channels: {
                1: 100, 2: 150, 3: 255,   // fixture 1: cool blue
                5: 80, 6: 120, 7: 230     // fixture 2: cool blue
              },
              label: "Cool dynamic"
            },
            transitionDuration: 5000
          })
        }
      ]
    },
    // seq 7: Presence (Sensor)
  ]
}
```

### Fixture abstraction (CreateMontage concern)

The curator works with colours and presets in CreateMontage — the translation to DMX channels happens in CreateMontage or the backend based on fixture profiles from the Open Fixture Library (OFL). The webplayer only deals with raw channel values.

Example fixture mapping (done at publish time):

```
Curator sets: "Warm white, 80% brightness"
                     ↓
Fixture profile: Generic RGB Par, start channel 1
  → Channel 1 (Red): 255
  → Channel 2 (Green): 180
  → Channel 3 (Blue): 80
  → Channel 4 (Dimmer): 204  (80% of 255)
```

## Sequencer integration

```typescript
// In Sequencer.ts
private dmxEngine: DmxEngine;

// When montage loads:
this.dmxEngine.loadAmbianceLayer(montage);

// In run() loop (alongside updateSoundscape):
this.dmxEngine.updateAmbiance(this.getCurrentPosition());

// On montage change:
this.dmxEngine.blackout(); // clean transition
```

## Sensor → Lighting interaction

The `SensorEngine` can trigger lighting changes via `DmxEngine`:

```typescript
// In SensorEngine.executeAction():
case 'adjust_lighting':
  this.dmxEngine.overrideScene(
    action.dmxScene,
    action.fadeDuration ?? 1000
  );
  break;
```

When the sensor condition clears (visitor leaves), `restoreScheduledScene()` fades back to the timeline-defined scene.

## Implementation estimate

### Backend (ArtNet bridge)

| Task | Effort |
|------|--------|
| dmxnet setup + ArtNet sender | 0.5 day |
| WebSocket command handler (set/fade/blackout) | 1 day |
| Fade interpolation engine (40Hz loop) | 0.5 day |
| HTTP API for testing | 0.5 day |
| Configuration (universes, network) | 0.5 day |
| **Backend total** | **~3 days** |

### Webplayer (DMX engine)

| Task | Effort |
|------|--------|
| DmxEngine class | 1 day |
| Sequencer integration (updateAmbiance) | 1 day |
| Item parsing for dmx effect_data | 0.5 day |
| Sensor → lighting interaction | 0.5 day |
| WsTools: send dmx commands | 0.5 day |
| **Webplayer total** | **~3.5 days** |

| **Combined total** | **~6–7 days** |
