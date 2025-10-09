# WallMuse Player Container (React)

The main React application that provides the web interface and orchestration layer for the WallMuse digital exhibition platform.

## Overview

The Player Container is a React-based web application that manages multi-environment playback, handles user sessions, and provides the primary interface for displaying digital exhibitions across various devices.

## Key Features

### Multi-Environment Management
- Manage multiple display environments from a single account
- Support for web players, PC desktop apps, and mobile devices
- Real-time synchronization across all connected environments
- Environment activation/deactivation controls

### Session Orchestration
- Guest accounts (browser-only, no signup)
- Personal accounts (cloud-saved, multi-device sync)
- Automatic session recovery and state management
- WordPress user integration

### WebSocket Communication
- Real-time bidirectional communication with backend
- Live playlist and montage synchronization
- Multi-display coordination
- Automatic reconnection handling

### WordPress Integration
- Custom page templates for seamless CMS embedding
- Compatible with any WordPress theme (tested with Neve)
- Separate test and production deployment workflows
- Automatic cache busting and service worker versioning

### Internationalization
- 12 language support (EN, DE, ES, FR, IT, HR, NL, NO, PL, PT, UA, JP)
- Dynamic language switching
- Localized UI components and messages

### Responsive Design
- Desktop, tablet, and mobile layouts
- Touch-optimized controls
- Adaptive component sizing
- Progressive Web App (PWA) support

## Technology Stack

- **React 18** - Core UI framework
- **Material-UI (MUI) v5** - Component library
- **i18next** - Internationalization
- **WebSocket API** - Real-time communication
- **Context API** - State management
- **React Router** - Navigation

## Project Structure

```
player-container/
├── public/
│   ├── index.html
│   ├── manifest.json
│   └── locales/          # Translation files
├── src/
│   ├── accounts/         # Account creation and management
│   ├── Configure/        # Environment configuration
│   ├── contexts/         # React contexts (Session, Environments, Playlists)
│   ├── locales/          # i18n translation JSON files
│   ├── Play/             # Playback controls and UI
│   ├── PlayerCommands/   # Player control components
│   ├── Playlists/        # Playlist management
│   ├── SelectMontages/   # Montage selection
│   ├── theme/            # MUI theme configuration
│   ├── utils/            # Utility functions and helpers
│   ├── App.js            # Main app component
│   ├── WebPlayer.js      # Player container component
│   └── index.js          # Entry point
├── scripts/
│   ├── build-ok.sh       # Production deployment script
│   ├── test-ok.sh        # Test deployment script
│   └── increment-sw-version.sh  # Service worker versioning
├── docs/                 # Documentation files
├── package.json
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 16+ and npm 8+
- Access to WallMuse backend API
- (Optional) WordPress site for integration

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR-USERNAME/wallmuse-digital-exhibitions.git
cd wallmuse-digital-exhibitions/player-container

# Install dependencies
npm install
```

### Development

```bash
# Start development server (runs on http://localhost:3000)
npm start

# Run tests
npm test

# Build for production
npm run build
```

### Environment Variables

Create a `.env` file in the root directory:

```env
# API Configuration
REACT_APP_API_URL=https://your-api-endpoint.com

# WebSocket Configuration
REACT_APP_WS_URL=wss://your-websocket-endpoint.com

# Feature Flags
REACT_APP_ENABLE_DEBUG=false
```

## WordPress Integration

The Player Container integrates into WordPress via custom page templates.

### Setup Instructions

1. **Deploy Build Assets**
   ```bash
   # For production
   ./scripts/build-ok.sh

   # For test environment
   ./scripts/test-ok.sh
   ```

2. **Add Page Template to WordPress Theme**
   - Copy `wm_v4_player_static.php` to your theme directory
   - Adjust asset paths to match your server structure

3. **Create WordPress Page**
   - Create new page in WordPress admin
   - Select "WallMuse Player" template
   - Publish page

See [WORDPRESS_INTEGRATION.md](./WORDPRESS_INTEGRATION.md) for detailed setup guide.

## Key Concepts

### Environments
An **environment** represents a single playback instance - a browser tab, PC desktop app, or mobile device. Users can have multiple environments and switch between them.

### Playlists
Collections of **montages** (video compilations) organized thematically. Users can create, edit, and share playlists.

### Montages
Multi-track video compositions created in the CreateMontage editor (separate app). Each montage contains synchronized video tracks with timing information.

### Sessions
User authentication state, managed through the `SessionContext`. Supports both WordPress-integrated authentication and standalone guest/personal accounts.

## Architecture

### React Contexts

#### SessionContext
Manages user authentication, house (account) creation, and WordPress integration.

**Key Functions:**
- `initializeSession()` - Initialize user session
- `updateSession()` - Update session data
- `updateDomWithHouseId()` - Sync house ID to DOM

#### EnvironmentsContext
Manages display environments, screens, and device orchestration.

**Key Functions:**
- `fetchEnvironmentDetails()` - Load environments from API
- `handlePlaylistChange()` - Navigate to different playlist
- `activateEnvironment()` - Activate specific environment

#### PlaylistsContext
Manages playlist data, montages, and content metadata.

**Key Functions:**
- `loadPlaylists()` - Fetch all playlists
- `setCurrentPlaylist()` - Switch active playlist
- `addToPlaylist()` - Add montage to playlist

### Component Hierarchy

```
App
├── SessionContext
├── EnvironmentsContext
├── PlaylistsContext
└── Routes
    ├── Configure (Environment Setup)
    ├── Playlists (Playlist Management)
    ├── SelectMontages (Montage Browser)
    └── Play (Main Player View)
        └── WebPlayer (Player Container)
```

### WebSocket Communication

The app maintains a persistent WebSocket connection for:
- Real-time playlist synchronization
- Multi-environment coordination
- Live montage updates
- Display screen status

**Event Types:**
- `webplayer-navigate` - Navigation commands
- `activation-complete` - Environment activation
- `house-created` - New account created
- `account-phase-change` - Account setup progress

## Account Types

### Guest Account
- Browser-only storage (localStorage)
- Session-based (no signup)
- Limited to web features
- Free tier

**Use Case:** Quick tryout, temporary sessions

### Personal Account
- Cloud storage (persistent)
- Multi-device synchronization
- Web + PC desktop app support
- Free and Premium tiers

**Use Case:** Regular users, multi-display setups

## Development Guidelines

### Code Style
- Use functional components with hooks
- Prefer Context API over prop drilling
- Keep components focused and single-purpose
- Use descriptive variable and function names

### State Management
- Use `useState` for local component state
- Use Context API for shared state
- Avoid unnecessary re-renders with `useMemo` and `useCallback`

### Logging
All console logs should use prefixed identifiers:
- `[SessionContext]` - Session-related logs
- `[EnvironmentsContext]` - Environment-related logs
- `[PlaylistsContext]` - Playlist-related logs
- `[WebPlayer]` - Player-related logs
- `[NAV-MANAGER]` - Navigation logs
- `[GuestActionPopup]` - Account popup logs

See documentation files for complete log keyword lists.

### Translations
When adding new UI text:

1. Add key to all 12 language files in `src/locales/`
2. Use descriptive key names (e.g., `account_creation_title`)
3. Test with at least 2-3 languages
4. Keep translations concise for mobile views

## Deployment

### Test Environment
```bash
./scripts/test-ok.sh
```
- Deploys to `play-v4B-assets` directory
- Uses test page template
- No service worker versioning

### Production Environment
```bash
./scripts/build-ok.sh
```
- Deploys to `play-v4-assets` directory
- Updates production page template
- Automatically increments service worker versions

**Service Worker Sites:**
- wallmuse.com
- ooo2.wallmuse.com
- sharex.wallmuse.com

## Troubleshooting

### Common Issues

**Problem:** Assets not loading (404 errors)
- Check asset paths in WordPress template
- Verify deployment completed successfully
- Clear browser cache and service worker

**Problem:** Styles conflicting with WordPress theme
- Review CSS reset styles in page template
- Increase specificity of custom styles
- Check for !important overrides

**Problem:** WebSocket connection failing
- Verify WebSocket URL configuration
- Check environment crypt_key generation
- Review network/firewall settings

**Problem:** Account creation fails
- Check SessionContext initialization logs
- Verify backend API availability
- Review localStorage flags and state

See [TROUBLESHOOTING_ACCOUNT_CREATION.md](./TROUBLESHOOTING_ACCOUNT_CREATION.md) for detailed debugging procedures.

## Documentation

- [WordPress Integration Guide](./WORDPRESS_INTEGRATION.md)
- [Account Creation Troubleshooting](./TROUBLESHOOTING_ACCOUNT_CREATION.md)
- [Navigation System Refactor](./NAVIGATION_SYSTEM_REFACTOR.md)
- [Guest Action Popup](./GUEST_ACTION_POPUP_DOCS.md)
- [Player Container Rules](./PLAYER_CONTAINER_RULES.md)
- [Enhanced Navigation Solution](./ENHANCED_NAVIGATION_SOLUTION.md)

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Generate coverage report
npm test -- --coverage
```

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Performance Considerations

- Lazy load components with React.lazy()
- Optimize images and media assets
- Use service workers for offline caching
- Debounce API calls and event handlers
- Monitor memory usage in long-running sessions

## Security

- All API requests use HTTPS
- WebSocket connections use WSS
- Environment keys encrypted with crypt_key
- No sensitive data in localStorage
- CORS properly configured

## Contributing

1. Create feature branch from `main`
2. Make changes following code style guidelines
3. Test thoroughly in test environment
4. Update documentation as needed
5. Submit pull request with clear description

## License

[License information to be added]

## Support

- **Issues:** [GitHub Issues](https://github.com/YOUR-USERNAME/wallmuse-digital-exhibitions/issues)
- **Documentation:** [Project Wiki](https://github.com/YOUR-USERNAME/wallmuse-digital-exhibitions/wiki)
- **Website:** [wallmuse.com](https://wallmuse.com)
