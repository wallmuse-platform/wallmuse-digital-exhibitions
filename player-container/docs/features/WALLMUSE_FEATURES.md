# 🎬 **Wallmuse Web Player - Feature Overview**

## **🎮 Media Playback & Control**
- **Multi-format support** - Video, audio, image montages and playlists
- **Advanced player controls** - Play, pause, volume, fullscreen mode
- **Streaming capabilities** - Real-time media delivery across channels
- **Position management** - Seamless playback state synchronization

## **📱 Multi-Environment Display Management**
- **Cross-device synchronization** - Manage displays across multiple screens/devices
- **Environment detection** - Automatic discovery of active display environments
- **Screen configuration** - Individual screen setup and management
- **Resolution adaptation** - Support for various screen sizes and orientations

## **🏠 Account & Session Management**
- **Guest mode** - Instant access without registration
- **Subscription accounts** - Full-featured user accounts
- **Session persistence** - Maintain state across browser sessions
- **Multi-session detection** - Smart handling of concurrent user sessions

## **📋 Playlist & Content Organization**
- **Dynamic playlists** - Create, edit, and manage media collections
- **Montage selection** - Choose from available content montages
- **Content association** - Link playlists to specific display environments
- **Drag-and-drop interface** - Intuitive playlist management

## **🌐 Internationalization & Accessibility**
- **Multi-language support** - 12+ languages (EN, DE, ES, FR, IT, JP, NL, NO, PL, PT, HR, UA)
- **Responsive design** - Mobile, tablet, desktop optimization
- **Theme customization** - Configurable UI themes and styling
- **Accessibility features** - Screen reader support and keyboard navigation

## **🔧 Configuration & Setup**
- **Environment wizard** - Step-by-step display setup process
- **Network configuration** - WebSocket connections and API management
- **Permission handling** - Screen sharing and browser permissions
- **Error recovery** - Robust error handling and user guidance

## **⚡ Performance & Optimization**
- **Lazy loading** - Optimized component loading for better performance
- **State management** - Efficient React context and state handling
- **Memory optimization** - Prevent memory leaks in long-running sessions
- **Network efficiency** - Smart API calls and caching strategies

## **📲 QR Code Generation (Descriptions modal)**

The Descriptions modal (`src/Descriptions/Descriptions.js`) provides two modes, toggled by a tab bar at the top:

### Screen QR Codes (default)
- Generates a QR code per display screen pointing to `{wmm_url}/info/?screen=SCREEN_ID`
- Toggle: **Only Active Displays** — filters to screens with `on === "1"`, or shows all

### Artwork QR Codes
- Designed for **permanent physical installations** (museums, galleries, street prints)
- Each QR code points to `{wmm_url}/info/?screen=SCREEN_ID&artwork_id=ARTWORK_ID`
- The `artwork_id` parameter pins the visitor to a specific artwork regardless of what is currently playing on the screen; auto-advance is disabled, manual prev/next browsing remains available
- Active screen resolved automatically: first screen with `on === "1"`, fallback to `screens[0]`
- Artworks fetched via `searchArtworks` (`search_artworks` WS, scoped by session — returns all artworks the user can access based on access rights: public domain, creative commons, licensed)
- Grid layout: thumbnail (250×250 THUMBNAIL url from response) | title + author(s) + datation | QR code + full URL below
- Pagination: 50 artworks per page, "Load more" button if result set hits the limit

**TODO:** My Artworks / All Artworks toggle — deferred pending a backend endpoint to distinguish uploader vs viewer access rights.

## **🛡️ Enterprise Features**
- **Multiple environments** - Support for complex multi-display setups
- **Screen validation** - Ensure proper display configurations
- **Conflict resolution** - Handle competing sessions gracefully
- **Deployment flexibility** - Web-based deployment with various hosting options

**Perfect for:** Digital signage, multi-screen presentations, media walls, retail displays, corporate communications! 🚀