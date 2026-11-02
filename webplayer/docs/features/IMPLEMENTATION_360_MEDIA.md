# 360° Media — Design Direction

**Status:** ⏸️ On hold — pending Horizon R&D proposal approval

---

## Overview

WallMuse has a defined design direction for integrating 360° panoramic media (equirectangular photo and video). The implementation approach is named **SphericalZoomAndPan**.

SphericalZoomAndPan extends the existing authored-path ZoomAndPan model to spherical content: instead of pan/zoom coordinates on a flat plane, the author defines a camera path through yaw, pitch, and field-of-view values. Playback follows the authored path — there is no free viewer navigation. This keeps the exhibition experience consistent across multi-screen installations.

---

## Planned Content Types

| Type | Description |
|---|---|
| `PHOTO_360` | Equirectangular still image (full 360°) |
| `PHOTO_180` | Half-sphere still image (180°) |
| `VIDEO_360` | Equirectangular video (full 360°) |
| `VIDEO_180` | Half-sphere video (180°) |

---

## Design Principles

- **Authored paths, not free navigation** — the exhibition author controls the viewing path, ensuring a curated experience consistent across all displays
- **No VR / WebXR** — the feature targets standard displays, not head-mounted devices
- **GPU memory management** — strict `stop()` / `dispose()` lifecycle to prevent memory leaks during playlist transitions

---

## Implementation Hold

This feature is pending approval of the Horizon R&D proposal. No implementation work is currently planned. This file will be updated with technical specification once the proposal is approved and development begins.

For the current ZoomAndPan implementation (flat media), see [Ken Burns Implementation](./KEN_BURNS_IMPLEMENTATION.md).
