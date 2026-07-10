# Specification: OSC → WebSocket Bridge & Sensor Rule Evaluation

## Overview

This spec covers two components that enable the Presence layer (seq 7):

1. **OSC → WebSocket bridge** (backend, Node.js): receives OSC messages from sensors, converts them to WebSocket events, and pushes them to connected webplayers.
2. **Sensor rule evaluation engine** (webplayer): evaluates trigger rules defined in CreateMontage against incoming sensor data and executes actions.

## Architecture

```
┌──────────────┐    OSC/UDP     ┌──────────────┐   WebSocket    ┌──────────────┐
│  Smartphone  │ ──────────────→│   Backend    │ ──────────────→│  Webplayer   │
│  Sensors to  │    port 9000   │  OSC Bridge  │   existing WS  │  Rule Engine │
│  OSC app     │                │  (Node.js)   │   connection   │              │
└──────────────┘                └──────────────┘                └──────────────┘

┌──────────────┐    OSC/UDP     ┌──────────────┐
│  LiDAR/ToF   │ ──────────────→│   (same)     │
│  sensor      │    port 9001   │              │
└──────────────┘                └──────────────┘
```

## Part 1: OSC → WebSocket Bridge (Backend)

### Technology

- **osc.js** (npm: `osc`) — lightweight OSC over UDP library for Node.js
- Runs as a service alongside the existing WallMuse backend (Tomcat)
- Can be a standalone Node.js process or integrated into an existing Node service

### OSC Receiver

```typescript
// osc-bridge.ts
import osc from 'osc';

const oscPort = new osc.UDPPort({
  localAddress: '0.0.0.0',
  localPort: 9000,        // configurable per environment
  metadata: true
});

oscPort.on('message', (oscMsg: OscMessage) => {
  // oscMsg: { address: '/proximity', args: [{ type: 'f', value: 1.5 }] }
  const sensorEvent: SensorEvent = {
    type: 'sensor',
    address: oscMsg.address,
    values: oscMsg.args.map(a => a.value),
    timestamp: Date.now(),
    sourceId: 'smartphone-1'  // identified by source IP or config
  };

  // Forward to all webplayers in the same house/environment
  broadcastToEnvironment(sensorEvent);
});

oscPort.open();
```

### WebSocket forwarding

The bridge injects sensor events into the existing WebSocket channel used by the webplayer. Messages use a new `tag_name: 'sensor'`:

```typescript
// Message format over existing WS connection
{
  tag_name: 'sensor',
  data: {
    address: '/proximity',
    values: [1.5],
    timestamp: 1712500000000,
    sourceId: 'smartphone-1'
  }
}
```

### Source identification

Multiple sensors can be active simultaneously. Each is identified by:
- **sourceId**: configured in the environment setup (e.g., `"smartphone-1"`, `"lidar-entrance"`)
- **IP-based**: the bridge maps source IP → sourceId from a configuration file
- **Port-based**: different sensor types can use different UDP ports (9000 for smartphones, 9001 for LiDAR, etc.)

### Bridge configuration

```json
// osc-bridge-config.json (per environment)
{
  "environmentId": "env-123",
  "sources": [
    {
      "sourceId": "smartphone-1",
      "type": "smartphone",
      "port": 9000,
      "expectedAddresses": ["/accel", "/gyro", "/proximity"]
    },
    {
      "sourceId": "lidar-entrance",
      "type": "lidar",
      "port": 9001,
      "expectedAddresses": ["/distance", "/position"]
    }
  ],
  "throttleMs": 100    // minimum interval between forwarded messages (avoid flooding)
}
```

### Throttling

Sensors can emit at 60–100 Hz. The bridge throttles per address to avoid flooding WebSocket:
- Configurable throttle interval (default: 100ms = 10 updates/sec)
- Last-value-wins within throttle window
- Critical events (zone entry/exit) bypass throttle

## Part 2: Sensor Rule Evaluation Engine (Webplayer)

### New module: `SensorEngine.ts`

```
src/manager/
├── Sequencer.ts          (existing)
├── ItemPlayer.ts         (existing)
├── CommandsManager.ts    (existing)
└── SensorEngine.ts       (NEW)
```

### SensorEngine class

```typescript
export class SensorEngine {
  private rules: SensorRule[] = [];
  private sensorState: Map<string, SensorValue> = new Map();
  private sequencer: Sequencer;
  private activeRuleSet: PresenceConfig | null = null;

  constructor(sequencer: Sequencer) {
    this.sequencer = sequencer;
  }

  // Called when a montage is loaded — extract presence config from seq 7
  loadPresenceLayer(montage: Montage): void {
    const presenceTrack = montage.seqs[6]; // seq 7 = index 6
    if (!presenceTrack || !presenceTrack.items?.length) {
      this.activeRuleSet = null;
      this.rules = [];
      return;
    }

    // Parse presence configuration from the track's items
    for (const item of presenceTrack.items) {
      if (item.artwork?.type === 'SENSOR') {
        this.activeRuleSet = JSON.parse(item.effect_data ?? '{}');
        this.rules = this.activeRuleSet.rules.map(r => new SensorRule(r));
      }
    }
  }

  // Called when a sensor WebSocket message arrives
  onSensorData(event: SensorEvent): void {
    // Update state
    this.sensorState.set(event.address, {
      values: event.values,
      timestamp: event.timestamp,
      sourceId: event.sourceId
    });

    // Evaluate rules
    for (const rule of this.rules) {
      const triggered = rule.evaluate(this.sensorState);
      if (triggered && !rule.wasTriggered) {
        rule.wasTriggered = true;
        this.executeAction(rule.action);
      } else if (!triggered && rule.wasTriggered) {
        rule.wasTriggered = false;
        // If rule has a "leave" counterpart, it handles itself
      }
    }
  }

  private executeAction(action: SensorAction): void {
    switch (action.type) {
      case 'change_artwork':
        this.sequencer.showMediaByArtworkId(
          action.targetArtworkId,
          action.transition,
          action.transitionDuration
        );
        break;
      case 'restore_original':
        this.sequencer.restoreScheduledMedia(
          action.transition,
          action.transitionDuration
        );
        break;
      case 'trigger_p5js_event':
        this.sequencer.sendP5jsEvent(action.eventName, action.eventData);
        break;
      case 'adjust_audio':
        this.sequencer.setVolume(action.volume, action.crossfadeDuration);
        break;
      case 'dim_display':
        this.sequencer.setDisplayBrightness(action.brightness, action.duration);
        break;
      case 'pause_resume':
        if (this.sequencer.isPlaying()) {
          this.sequencer.pause();
        } else {
          this.sequencer.play();
        }
        break;
      case 'navigate_montage':
        this.sequencer.seekTo(action.targetPosition);
        break;
    }
  }

  // Called on montage change to reset state
  reset(): void {
    this.sensorState.clear();
    this.rules.forEach(r => r.wasTriggered = false);
  }
}
```

### SensorRule class

```typescript
export class SensorRule {
  id: string;
  condition: SensorCondition;
  action: SensorAction;
  wasTriggered: boolean = false;

  constructor(json: any) {
    this.id = json.id;
    this.condition = json.condition;
    this.action = json.action;
  }

  evaluate(state: Map<string, SensorValue>): boolean {
    const sensorData = state.get(this.getSensorAddress());
    if (!sensorData) return false;

    const value = sensorData.values[0]; // primary axis

    switch (this.condition.type) {
      case 'enters_zone':
        return value < this.condition.threshold;
      case 'leaves_zone':
        return value > this.condition.threshold;
      case 'shake_detected':
        return this.detectShake(sensorData.values, this.condition.threshold);
      case 'value_crosses':
        return this.condition.direction === 'up'
          ? value > this.condition.threshold
          : value < this.condition.threshold;
      case 'value_in_range':
        return value >= this.condition.min && value <= this.condition.max;
      case 'count_changes':
        return value >= this.condition.min && value <= this.condition.max;
      default:
        return false;
    }
  }

  private getSensorAddress(): string {
    // Map sensor name to OSC address
    const addressMap: Record<string, string> = {
      proximity: '/proximity',
      accelerometer: '/accel',
      gyroscope: '/gyro',
      compass: '/compass',
      light: '/light',
      distance: '/distance',
      position: '/position'
    };
    return addressMap[this.condition.sensor] ?? this.condition.sensor;
  }

  private detectShake(values: number[], threshold: number): boolean {
    if (values.length < 3) return false;
    const magnitude = Math.sqrt(values[0]**2 + values[1]**2 + values[2]**2);
    return magnitude > threshold;
  }
}
```

### Sequencer extensions

New methods needed on `Sequencer.ts`:

```typescript
// Show a specific artwork by ID (sensor-triggered content swap)
showMediaByArtworkId(artworkId: number, transition: string, duration: number): void;

// Restore the originally scheduled artwork for the current time position
restoreScheduledMedia(transition: string, duration: number): void;

// Send event to active P5JS overlay
sendP5jsEvent(eventName: string, data: any): void;

// Adjust display brightness (CSS filter on root element)
setDisplayBrightness(percent: number, duration: number): void;
```

### WebSocket integration

In `CommandsManager.ts` or `ws-tools.ts`, add handling for the new `sensor` tag:

```typescript
// In the message handler:
case 'sensor':
  if (this.sensorEngine) {
    this.sensorEngine.onSensorData(message.data);
  }
  break;
```

### Resting state

When no sensor data has been received for a configurable timeout (default: 30 seconds), the engine triggers the resting state defined in the presence config:

```typescript
private restingTimeout: NodeJS.Timeout | null = null;
private restingActive: boolean = false;

onSensorData(event: SensorEvent): void {
  // Reset resting state timer
  if (this.restingTimeout) clearTimeout(this.restingTimeout);
  if (this.restingActive) {
    this.exitRestingState();
  }

  this.restingTimeout = setTimeout(() => {
    this.enterRestingState();
  }, 30000);

  // ... evaluate rules ...
}

private enterRestingState(): void {
  if (!this.activeRuleSet?.restingState) return;
  this.restingActive = true;

  switch (this.activeRuleSet.restingState.type) {
    case 'show_specific':
      this.sequencer.showMediaByArtworkId(
        this.activeRuleSet.restingState.artworkId,
        'fade', 2.0
      );
      break;
    case 'dim':
      this.sequencer.setDisplayBrightness(
        this.activeRuleSet.restingState.brightness, 2.0
      );
      break;
    case 'pause':
      this.sequencer.pause();
      break;
    // 'show_current' = do nothing
  }
}
```

## Data flow summary

```
Smartphone sensor
  → OSC message (UDP, /proximity 1.5)
  → Backend OSC bridge (Node.js)
  → Throttle + format
  → WebSocket message { tag_name: 'sensor', data: {...} }
  → Webplayer ws-tools.ts
  → CommandsManager → SensorEngine.onSensorData()
  → Rule evaluation
  → Action execution (Sequencer methods)
  → Visual/audio/lighting change in player
```

## Implementation estimate

### Backend (OSC bridge)

| Task | Effort |
|------|--------|
| OSC receiver (osc.js, UDP listener) | 0.5 day |
| Source identification + config | 0.5 day |
| Throttling logic | 0.5 day |
| WebSocket forwarding integration | 1 day |
| Bridge configuration file + hot-reload | 0.5 day |
| **Backend total** | **~3 days** |

### Webplayer (rule engine)

| Task | Effort |
|------|--------|
| SensorEngine class + rule evaluation | 2 days |
| SensorRule with all condition types | 1.5 days |
| Sequencer extensions (showMediaByArtworkId, etc.) | 2 days |
| WebSocket sensor message handling | 0.5 day |
| Resting state management | 1 day |
| Display brightness (CSS filter) | 0.5 day |
| P5JS event forwarding | 0.5 day |
| Testing with simulated sensor data | 1 day |
| **Webplayer total** | **~9–10 days** |

| **Combined total** | **~12–13 days** |
