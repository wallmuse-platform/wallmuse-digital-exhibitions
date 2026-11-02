# WallMuse Platform Architecture

## Overview

WallMuse is a multi-component platform for creating, curating, and displaying synchronized digital exhibitions across any combination of displays — from a single browser tab to a multi-room installation across dozens of screens.

The frontend components are open source (MIT). The backend server and App PC Player are under a separate proprietary licence (available for research and teaching on request; contact support for professional use).

---

## Component Map

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          WallMuse Platform                              │
├──────────────────────────────┬──────────────────────────────────────────┤
│        App Web Player        │            App PC Player                 │
│  player-container (React)    │        Electron — in development         │
│  ┌────────────────────────┐  │  ┌──────────────────────────────────┐    │
│  │  Core Player (webplayer│  │  │  Core Player (webplayer)         │    │
│  │  React/TypeScript)     │  │  │  + encrypted local cache         │    │
│  └────────────────────────┘  │  └──────────────────────────────────┘    │
├──────────────────────────────┴──────────────────────────────────────────┤
│   Companion App (descriptions-app)  │  CreateMontage (Exhibition Planner)│
│   Real-time metadata on handhelds   │  Timeline editor, rights, tools   │
├─────────────────────────────────────┴───────────────────────────────────┤
│                      Backend Server (Proprietary)                       │
│         REST API · WebSocket · DRM Encryption · MySQL · Storage         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Components

### Core Player (`webplayer/`)

TypeScript/React rendering engine shared by both the App Web Player and the App PC Player. Handles dual-buffer rendering, media sequencing, WebSocket-driven synchronization, and Ken Burns / ZoomAndPan effects.

**Key responsibilities:**
- Dual-buffer image and video playback (seamless transitions)
- Time-coded playlist sequencing (Playlist → Montage → Track → Item)
- Real-time WebSocket synchronization with the backend server
- Multi-screen track selection seeded for synchronized Ken Burns paths
- Device fingerprinting for session persistence

### App Web Player (`player-container/`)

React application that embeds the Core Player for browser and WordPress deployment. Manages user sessions, environments, playlists, and provides the player UI.

Deployed on the WallMuse platform sites and distributed as the [WallMuse WordPress Plugin](https://github.com/wallmuse-platform/wallmuse-plugin) for third-party sites.

### App PC Player

Electron-based desktop application embedding the Core Player. Designed for professional multi-display installations. In active development — beta access available for registered accounts.

### Companion App (`descriptions-app/`)

Real-time companion display application synchronized with the main player. Visitors scan a QR code to open artwork descriptions, timeline navigation, and multilingual metadata on their own device.

### CreateMontage (`create-montage/`)

Web-based exhibition planner: drag-and-drop timeline editor, multi-track composition, rights and licensing management, and custom production tools (ZoomAndPan, Title, Alpha Channel, SpaceImage).

### Backend Server

Proprietary server providing REST API, WebSocket server, DRM/encryption services, media storage, and multi-tenant account management. Not publicly available.

---

## Display Targets

| Display | App | Notes |
|---|---|---|
| Browser (desktop, mobile) | App Web Player | WordPress plugin or platform sites |
| Smart TV | App Web Player | Browser-based |
| Projectors / Video walls | App PC Player | Multi-display, PC-driven |
| Tablets and smartphones | App Web Player + Companion App | Visitor handheld experience |
| Standalone kiosks | App PC Player | Offline-capable |

---

## Licence Summary

| Component | Licence |
|---|---|
| webplayer, player-container, descriptions-app, create-montage | MIT |
| Backend server | Proprietary (research/teaching on request) |
| App PC Player | Proprietary |

See [LICENSE](../LICENSE) for full MIT text. For proprietary licensing: support[at]wallmuse.com
