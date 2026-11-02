# Multi-Environment System

WallMuse uses two parallel hierarchies: one for **who is playing** (account structure) and one for **what is playing** (content structure). The backend server links them at runtime.

---

## Account Hierarchy

```
Account (login)
└── House  (a named location — one per account currently)
    └── Environment  (a device or display group)
        └── Screen   (a single display within that environment)
```

**Account** — the WallMuse user account. Can be a guest (session-only), a free registered account, or a premium account.

**House** — a named location associated with the account (e.g. "My Gallery", "Museum X"). Currently one house per account. The house carries the autostart playlist setting.

**Environment** — a device session. Identified by a `crypt_key` generated at creation. The environment key is how the Core Player establishes its WebSocket connection. One active environment at a time per house.

**Screen** — a display within an environment. A web browser is always one screen. The PC Desktop App can manage multiple screens per environment (multi-monitor / video wall).

### Environment and Screen States

| Property | Value | Meaning |
|---|---|---|
| `alive` | `"1"` | Environment is active |
| `alive` | `"0"` | Environment is inactive |
| `on` | `"1"` | Screen is active |
| `on` | `"0"` | Screen is inactive (but still valid) |

---

## Content Hierarchy

```
Playlist
└── Montages  (sequenced array, each with a fixed duration)
    └── Tracks  (one per screen in a multi-display setup)
        └── Items  (artworks with timing, effects, and optional shapes)
```

**Playlist** — the top-level programme. A playlist has a fixed or open-ended duration and loops by default.

**Montage** — one chapter within a playlist. Has a total duration (`duration` field). All tracks within a montage play in sync.

**Track** — content for one screen. In a single-screen setup there is one track. In a multi-display installation (triptych, video wall), each screen receives its own track, seeded from the same montage so Ken Burns paths and timing are coordinated.

**Item** — one artwork slot on a track. Carries timing (`offset`, `duration`), artwork reference, optional ZoomAndPan/Ken Burns effect, shapes (Title, Alpha), and background colour.

---

## How They Connect

The App Web Player (player-container) creates an environment via REST API, which returns a `crypt_key`. It passes that key to the Core Player (webplayer) via URL parameters. The Core Player uses the key to open a WebSocket connection to the backend server, which then drives playback by pushing the active playlist content.

```
player-container  →  REST API  →  creates environment (crypt_key)
player-container  →  URL params  →  webplayer receives (environ, screen, house, session)
webplayer  →  WebSocket  →  server pushes playlist / montage / track data
```

Multi-screen synchronization is maintained by the server broadcasting `seekOffset` corrections to all connected environments sharing the same playlist.

---

## Platform Sites vs WordPress Plugin

WallMuse runs on both its own platform sites and as a WordPress plugin installed on third-party sites. The account and environment mechanics are identical; the session token injection differs:

| Deployment | Session source |
|---|---|
| wallmuse.com, ooo2, sharex | Theme PHP (`common0.php`) injects token into `data-user` |
| WordPress plugin | Plugin PHP (`shortcode.php`) calls `authenticate_with_key`, injects token |

See [player-container architecture docs](../player-container/docs/architecture/WALLMUSE_PLAYER_CONTAINER_RULES.md) for the full session token format.
