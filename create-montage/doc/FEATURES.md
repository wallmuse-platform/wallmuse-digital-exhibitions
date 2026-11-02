# CreateMontage Features

## Overview

CreateMontage is a sophisticated React-based platform that revolutionises how cultural institutions, museums, and art professionals create and manage digital exhibitions.

## Core Features

### 1. Multi-Format Content Management

- **HD/UHD Support**: 4K encrypted formats with automatic format generation
- **SD Web Formats**: Optional standard definition for web display
- **Thumbnail Generation**: Automatic thumbnail creation with custom override options
- **Media Types**: Comprehensive support for images, audio, video, HTML, and text

### 2. Advanced Rights Management System

- **Copyright Hierarchy**: Full support for ©, Creative Commons, and Copy Left licensing
- **International Rights**: Support for ADAGP, BILDKUNST, DACS, and other representation
  organizations
- **Country-Specific Licensing**: Broadcasting permissions by geographic region
- **Moral Rights Protection**: Artist and foundation rights preservation

### 3. Professional Montage Creation Tools

- **Drag & Drop Interface**: Intuitive timeline-based artwork arrangement
- **Multi-Track Synchronization**: Parallel content display across multiple screens
- **Millisecond-precision item durations**: Image item durations are set and stored at millisecond precision (`HH:MM:SS.mmm`). This precision is preserved end-to-end — CreateMontage → backend → webplayer — enabling precise multi-screen track alignment. Video items derive their duration from the file.
- **Interactive Tools**:
  - 🔍 Zoom & Pan effects (Ken Burns style)
  - 📄 Title overlays with customization
  - 🖼️ Alpha channel composition
  - 🌌 Space Image tools for precise positioning

### 4. Hierarchical Content Structure

```
Playlist → Montages → Tracks → Artworks
```

- **Seamless Integration**: Works with WallMuse webplayer ecosystem
- **Real-time Synchronization**: Cross-device content updates
- **Multi-Screen Support**: Triptychs, video walls, and immersive installations

### 5. Comprehensive Metadata Management

- **Categories**: Editable hierarchical classification system
- **Keywords**: Flexible tagging for easy discovery and curation
- **Credits**: Author, location, owner, photographer, representation rights
- **Multilingual Descriptions**: International accessibility support

### 6. Future-Ready Architecture

- **3D/5D Works**: Drone captures and interactive installations
- **Multi-Screen Diffusion**: Hospital rooms, museum walls, public spaces
- **Sensor Integration**: IoT-enabled interactive experiences
- **WebGL/HTML5**: Modern web standards for interactive art

## Target Users

### Museums & Galleries

- Digital collection management
- Exhibition planning and curation
- Visitor experience enhancement

### Cultural Institutions

- Educational content creation
- Interactive learning experiences
- Cultural heritage preservation

### Art Professionals

- Portfolio and exhibition creation
- Client presentation tools
- Collaborative curation workflows

## Technical Excellence

### Modern Technology Stack

- **React 18**: Modern hooks and context patterns
- **Material-UI**: Professional interface design
- **Internationalization**: i18next for global accessibility
- **Error Tracking**: Sentry for reliability monitoring
- **Drag & Drop**: react-dnd for intuitive interaction

### Development Standards

- **Open Source**: Comprehensive documentation for community contribution
- **International Collaboration**: Encourages global digital art cooperation
- **Extensible Architecture**: Plugin system for custom tools and effects

## Use Cases

### Digital Exhibition Creation

1. **Content Upload**: Add HD/UHD artworks with metadata
2. **Rights Assignment**: Configure copyright and licensing
3. **Montage Creation**: Drag and drop artworks into synchronized sequences
4. **Tool Application**: Add effects, titles, and transitions
5. **Export & Display**: Deploy to WallMuse player ecosystem

### Collaborative Curation

1. **Team Access**: Multiple curators can work on same exhibition
2. **Version Control**: Track changes and maintain exhibition history
3. **Approval Workflows**: Review and approval processes
4. **Live Preview**: Real-time preview of exhibition changes

### Multi-Venue Deployment

1. **Single Creation**: Create exhibition once
2. **Multi-Screen**: Deploy across multiple venues simultaneously
3. **Device Adaptation**: Automatic optimization for different display types
4. **Remote Management**: Update content across all venues remotely

## Integration Capabilities

### WallMuse Ecosystem

- **Seamless Integration**: Works with existing WallMuse infrastructure
- **Real-time Updates**: Live synchronization with player systems
- **Cross-Platform**: Web, mobile, and embedded player support

### Third-Party Systems

- **API Access**: RESTful API for external system integration
- **Export Options**: Multiple format support for external players
- **Webhook Support**: Real-time notifications for external systems

## Roadmap

### In Progress

- **SpaceImage** — precise image positioning within the frame for multi-screen compositions (authoring interface and backend in development)
- **AI-Assisted Curation** — metadata entry, upload batch processing, and targeted correction workflows. Ongoing integration using AI tooling in the production pipeline.

### Planned

- **SphericalZoomAndPan** — authored camera paths on 360° panoramic content (`PHOTO_360`, `VIDEO_360`, `PHOTO_180`, `VIDEO_180`). No free viewer navigation — the author controls the camera path, ensuring a consistent experience across all screens. Implementation on hold pending Horizon R&D proposal approval. See [360° design direction](../../webplayer/docs/features/IMPLEMENTATION_360_MEDIA.md).

### Production Workflows

- **Alpha Channel** — compositing a subject video (alpha-channel export from DaVinci Resolve) over a background item. See [ALPHA_CHANNEL_WORKFLOW.md](./ALPHA_CHANNEL_WORKFLOW.md) and the [automated-video-editing scripts](../../automated-video-editing/interview-christian-zimmermann/) used in the first production using this workflow.

See [TOOLS.md](./TOOLS.md) for the full list of current tools with status.

---

_CreateMontage represents a significant advancement in digital art curation, bridging the gap
between traditional exhibition practices and modern digital experiences._
