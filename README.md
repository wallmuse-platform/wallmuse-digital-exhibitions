# WallMuse - Next-Generation Digital Exhibition Platform

![WallMuse Platform](https://wallmuse.com/wp-content/uploads/wallmuse-logo.png)

**WallMuse** is a comprehensive platform for creating, managing, and displaying interactive digital exhibitions across multiple devices - from museum video walls to personal smartphones.

## 🎯 Platform Overview

After years of development in the cultural tech space, WallMuse provides a complete ecosystem for digital content display and exhibition management.

### 🏗️ Solved Challenges

Cultural institutions, artists, and content creators need to:
- Protect copyrighted content with enterprise-grade DRM
- Deliver synchronized, immersive experiences across multiple devices and screens
- Create professional multi-track compositions with custom interactive tools
- Support everything from single-screen exhibitions to complex multi-room installations

Traditional solutions fall short on either security or user experience. WallMuse solves both.

### Display Targets

- **PCs and Laptops** - Desktop viewing experience
- **Projectors and Video Walls** - Large-format museum installations
- **Smart TVs** - Living room and public space displays
- **Tablets and Smartphones** - Mobile viewing

## ⚡ Three-Pillar Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                       WallMuse Platform                              │
├──────────────────┬─────────────────┬──────────────────┬──────────────┤
│   Web Player     │ PC Desktop App  │  Descriptions    │CreateMontage │
│   (React/TS)     │   (Multi-PC)    │  App (Companion) │   (Editor)   │
├──────────────────┴─────────────────┴──────────────────┴──────────────┤
│                      Backend Server (Proprietary)                    │
│        • REST API • WebSocket • DRM Encryption • Database            │
└──────────────────────────────────────────────────────────────────────┘
```

### 1️⃣ Web Player (React + TypeScript) - *Open Source*
**Dual-buffered rendering** for seamless transitions
- Multi-environment orchestration (Account → House → Environment → Screen)
- Real-time WebSocket synchronization across all devices
- Server-driven autoplay with millisecond-precision timing
- WordPress integration via custom page templates
- 12+ language support

### 2️⃣ PC Desktop Player App - *Multi-Display Professional*
**High-performance desktop application** for professional installations
- Multi-PC deployment with synchronized playback
- Multiple display support per PC (video walls, projection mapping)
- Hardware-accelerated rendering
- Enterprise DRM and copy protection
- Offline playback capabilities

### 3️⃣ Descriptions App (Companion Experience) - *Coming Soon*
**Real-time artwork metadata display** for handheld devices
- Synchronized with main displays for enhanced visitor engagement
- Multi-language support (12+ languages)
- Perfect for museum visitors wanting deeper content exploration
- Timeline navigation and interactive features

### 4️⃣ CreateMontage (Professional Curation Tool) - *Coming Soon*
**Drag-and-drop timeline editor** with multi-track synchronization
- Comprehensive rights management (©, Creative Commons, international licensing)
- Support for HD/UHD (4K) encrypted formats
- Custom interactive tools (programmable by developers)
- Effects, overlays, and professional composition tools
- Compatible with Copyright Management Organisations (ADAGP, DACS, etc.)

## 📦 Repository Structure

This monorepo contains all WallMuse platform components:

### [webplayer/](./webplayer/) - TypeScript Video Engine
**Status:** ✅ Available

The core TypeScript video engine that handles dual-buffer rendering, multi-track synchronization, and media playback.

**Key Features:**
- Dual-buffer rendering for seamless transitions
- Multi-track synchronization with millisecond precision
- Server-driven sequencing via WebSocket
- Canvas/Video element rendering
- Media preloading and coordination
- Embedded by player-container as child iframe

**Tech Stack:** TypeScript, React, WebSocket, HTML5 Video/Canvas API

[→ Full Documentation](./webplayer/README.md)

---

### [player-container/](./player-container/) - React Container & Orchestration
**Status:** ✅ Available

The main React application that orchestrates multi-environment playback, manages user sessions, and provides the web interface for content display.

**Key Features:**
- Multi-environment management across devices
- Session orchestration and synchronization
- WebSocket real-time communication
- WordPress integration via custom page templates
- TypeScript video engine with dual-buffer rendering
- Multi-language support (12 languages)

**Tech Stack:** React, Material-UI, i18next, WebSocket

[→ Full Documentation](./player-container/README.md)

---

### descriptions-app/ - Companion Display Application
**Status:** 🚧 Coming Soon

Real-time companion display application that syncs with the main player to show artwork descriptions, metadata, and timeline navigation.

**Planned Features:**
- Real-time artwork synchronization
- Metadata and descriptions display
- Timeline navigation controls
- Multi-language support
- Handheld mode for mobile devices

---

### create-montage/ - Timeline Editor
**Status:** 🚧 Coming Soon

Professional timeline editor for creating and managing multi-track video compositions.

**Planned Features:**
- Drag-and-drop timeline interface
- Multi-track composition
- Effects and overlays
- Rights management system
- Copyright and licensing tools
- International metadata support

---

### backend/ - Server Infrastructure
**Status:** 🚧 Documentation Coming Soon

Backend server infrastructure providing APIs, WebSocket services, and content management.

**Core Services:**
- REST API for content and user management
- WebSocket server for real-time synchronization
- DRM and encryption services
- Content database and media storage
- Multi-tenant architecture

---

## 🚀 Quick Start

### Player Container (React App)

```bash
# Clone repository
git clone https://github.com/YOUR-USERNAME/wallmuse-digital-exhibitions.git
cd wallmuse-digital-exhibitions/player-container

# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build
```

See [player-container/README.md](./player-container/README.md) for detailed setup instructions.

## 🌍 Live Demos

- **Main Platform:** [wallmuse.com](https://wallmuse.com)
- **Opera Platform:** [ooo2.wallmuse.com](https://ooo2.wallmuse.com)
- **ShareX Platform:** [sharex.wallmuse.com](https://sharex.wallmuse.com)

## 📚 Documentation

### Player Container
- [Setup Guide](./player-container/README.md)
- [WordPress Integration](./player-container/WORDPRESS_INTEGRATION.md)
- [Account Creation Flow](./player-container/TROUBLESHOOTING_ACCOUNT_CREATION.md)
- [Navigation System](./player-container/NAVIGATION_SYSTEM_REFACTOR.md)
- [Component Docs](./player-container/GUEST_ACTION_POPUP_DOCS.md)

### Architecture
- [Platform Overview](./docs/ARCHITECTURE.md) (Coming Soon)
- [Multi-Environment System](./docs/MULTI_ENVIRONMENT.md) (Coming Soon)
- [WebSocket Protocol](./docs/WEBSOCKET_PROTOCOL.md) (Coming Soon)

## 🔐 Enterprise-Grade Security

- **DRM Protection** - Strong encryption for copyrighted content
- **Copy Prevention** - Playback protection during display
- **Rights Management** - Compatible with Copyright Management Organisations (ADAGP, DACS, etc.)
- **Multi-Tenant Security** - Isolated user environments
- **Encrypted WebSocket** - Secure real-time communication
- **HD/UHD Support** - 4K encrypted formats

## 🛠️ Technology Stack

### Frontend (Open Source)
- **React 18** - UI framework
- **Material-UI (MUI)** - Component library
- **TypeScript** - Video engine with dual-buffer rendering
- **i18next** - Internationalization (12+ languages)
- **WebSocket** - Real-time communication
- **PWA** - Progressive Web App capabilities

### Backend (Proprietary)
- **PHP** - REST API
- **WebSocket Server** - Real-time synchronization
- **MySQL** - Content database
- **FFmpeg** - Video processing and encoding
- **DRM Encryption** - Content protection layer

### Infrastructure
- **WordPress** - CMS integration and plugin system
- **Service Workers** - Offline caching and performance

## 🌐 Multi-Language Support

WallMuse supports 12 languages:
- English (EN)
- German (DE)
- Spanish (ES)
- French (FR)
- Italian (IT)
- Croatian (HR)
- Dutch (NL)
- Norwegian (NO)
- Polish (PL)
- Portuguese (PT)
- Ukrainian (UA)
- Japanese (JP)

## 🔐 Account Types

### Guest Account (Free)
- Web features only
- Browser-based storage
- Session-based (no signup required)
- Perfect for trying out the platform

### Personal Account
- Web + PC desktop app features
- Cloud storage (saved forever)
- Multi-display synchronization
- Free and Premium tiers available

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guidelines](./CONTRIBUTING.md) (Coming Soon) before submitting pull requests.

## 📄 License

This project uses a dual-licensing model:

### Frontend Components (Open Source)
- **Web Player (React)** - MIT License
- **Descriptions App** - MIT License
- **CreateMontage Editor** - MIT License

All frontend code in this repository is licensed under the **MIT License**, allowing free use, modification, and distribution.

### Backend Server (Proprietary)
- **Backend API & Services** - Proprietary License

The backend server code is **not publicly available** and remains proprietary to protect our core infrastructure and commercial services.

**Why this model?**
- **Frontend:** Maximum freedom for developers and integrators
- **Backend:** Protected as trade secret, ensuring competitive advantage
- **Enterprise options:** Custom licensing available for organizations requiring on-premise deployment

See [LICENSE](./LICENSE) for full details.

## 💬 Contact & Support

- **Website:** [wallmuse.com](https://wallmuse.com)
- **Issues:** [GitHub Issues](https://github.com/wallmuse-platform/wallmuse-digital-exhibitions/issues)
- **Email:** support[at]wallmuse.com

For backend licensing inquiries, contact: support[at]wallmuse.com

## 🏛️ Use Cases

WallMuse is designed for:
- **Museums and Galleries** - Digital exhibitions and interactive displays
- **Educational Institutions** - Classroom presentations and learning content
- **Corporate Environments** - Digital signage and information displays
- **Personal Use** - Home media galleries and photo/video collections
- **Cultural Events** - Temporary exhibitions and festival installations

---

**Built with ❤️ for the cultural and creative industries**
