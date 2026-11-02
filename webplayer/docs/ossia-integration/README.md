# Ossia Score Integration

[Ossia Score](https://ossia.io) is an open-source intermedia sequencer for interactive and generative performance. WallMuse launches a tested, compatible version of Ossia Score alongside its player rather than bundling it — this keeps the install footprint predictable and lets the operator choose when to update Ossia independently.

---

## Integration Goal

The integration allows exhibition authors to run Ossia Score scenarios synchronized with a WallMuse montage. Ossia drives audio, lighting (DMX), generative visuals (p5.js), and sensor-reactive events while the WallMuse player handles video/image sequencing and multi-screen synchronization.

---

## Architecture

Ossia Score runs as a separate process. WallMuse communicates with it over OSC (Open Sound Control). The webplayer hosts bridge modules that translate WallMuse timeline events into OSC triggers and receive sensor/state feedback from Ossia.

```
WallMuse webplayer
└── Ossia Bridge (OSC over WebSocket)
    ├── AudioEngine      — Web Audio API soundscape layer
    ├── DMX Bridge       — Lighting control via Ossia → DMX interface
    ├── p5.js Renderer   — Generative visuals in a canvas overlay
    └── Sensor Bridge    — Touch, motion, proximity input to Ossia cues
```

---

## Specification Documents

| Document | Scope | Status |
|---|---|---|
| [SPEC_AUDIO_LAYER.md](./SPEC_AUDIO_LAYER.md) | Web Audio API soundscape (seq 5) | Spec |
| [SPEC_DMX_BRIDGE.md](./SPEC_DMX_BRIDGE.md) | DMX lighting via Ossia | Spec |
| [SPEC_P5JS_RENDERING.md](./SPEC_P5JS_RENDERING.md) | p5.js generative canvas overlay | Spec |
| [SPEC_SENSOR_BRIDGE.md](./SPEC_SENSOR_BRIDGE.md) | Sensor input → Ossia cues | Spec |

Each spec covers: current state, proposed architecture, data flow, and open questions.

---

## Usage

A compatible Ossia Score version is listed in the release notes for each WallMuse version. Install it separately on the exhibition machine. The WallMuse player connects to it on startup if Ossia is running and the OSC bridge is enabled in environment settings.
