# WallMuse Backend Server

**Status:** 📚 API Documentation Only (Source code not published)

## Overview

The backend server infrastructure provides REST APIs, WebSocket services, content management, DRM encryption, and security features for the WallMuse platform.

**Note:** The backend source code is **not published** in this repository. This documentation describes the API endpoints and integration points for frontend developers.

**License:** Backend is **proprietary** and not publicly available

## Core Services

### REST API
- User authentication and authorization
- Content management (playlists, montages, media)
- Environment and device management
- User preferences and settings
- Analytics and usage tracking

### WebSocket Server
- Real-time synchronization across devices
- Live playlist updates
- Multi-environment coordination
- Display screen status monitoring
- Event broadcasting

### Content Database
- MySQL/MariaDB database
- Media metadata storage
- User account management
- Playlist and montage data
- Rights and licensing information

### DRM and Encryption
- Content encryption
- Environment key generation
- Secure WebSocket connections
- Access control and permissions
- License validation

### Media Processing
- FFmpeg video transcoding
- Thumbnail generation
- Format conversion
- Quality optimization
- Streaming preparation

## Technology Stack

- **PHP** - REST API and backend logic
- **MySQL/MariaDB** - Primary database
- **WebSocket Server** - Real-time communication
- **FFmpeg** - Video processing
- **Redis** (optional) - Caching layer
- **Nginx/Apache** - Web server

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/register` - New user registration
- `GET /api/auth/session` - Session validation

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `GET /api/users/houses` - Get user houses (accounts)
- `POST /api/users/houses` - Create new house

### Environments
- `GET /api/environments` - List user environments
- `POST /api/environments` - Create new environment
- `PUT /api/environments/:id` - Update environment
- `DELETE /api/environments/:id` - Delete environment
- `POST /api/environments/:id/activate` - Activate environment

### Playlists
- `GET /api/playlists` - List user playlists
- `POST /api/playlists` - Create new playlist
- `PUT /api/playlists/:id` - Update playlist
- `DELETE /api/playlists/:id` - Delete playlist
- `POST /api/playlists/copy` - Copy playlists from guest

### Montages
- `GET /api/montages` - List montages
- `POST /api/montages` - Create new montage
- `PUT /api/montages/:id` - Update montage
- `DELETE /api/montages/:id` - Delete montage

## WebSocket Events

### Client → Server
- `authenticate` - Authenticate connection
- `subscribe` - Subscribe to environment updates
- `navigate` - Send navigation command
- `sync` - Request state synchronization

### Server → Client
- `playlist_updated` - Playlist data changed
- `montage_changed` - Active montage changed
- `environment_updated` - Environment state changed
- `sync_state` - Full state synchronization

## Database Schema

(Schema documentation to be added)

## Security

- HTTPS/WSS encryption
- JWT or session-based authentication
- CORS configuration
- Rate limiting
- SQL injection prevention
- XSS protection

## Deployment

(Deployment instructions to be added)

## Configuration

(Configuration guide to be added)

## Development Setup

(Setup instructions to be added)

## API Documentation

Full API documentation will be provided using Swagger/OpenAPI specification.

## Contributing

Backend code is currently proprietary. Documentation is provided for integration purposes.

---

*Part of the [WallMuse Platform](../README.md)*
