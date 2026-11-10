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

**Environment** — a device (browser, PC app) or display group. Identified by its id and one or more **environment keys** (`wmm_environment_key`), registered at creation. The environment key is how the Core Player establishes its WebSocket connection (not to be confused with the house `crypt_key`). Per house, multiple environments are allowed.

**Screen** — a display within an environment. A web browser is always one screen. The PC Desktop App can manage multiple screens per environment (multi-monitor / video wall).

### Environment and Screen States

| Property | Set by | Meaning |
|---|---|---|
| `alive` (environment) | server, computed | `"1"` if the player called the server recently (last call < alive delay), else `"0"`. Cannot be set by a client. |
| `on` (screen) | server, from player reports | `"1"` if the screen is reported playing **and** its environment is alive. Cannot be set by a client. |
| `enabled` (screen) | client, `upd_screen?enabled=0/1` | The only switch a user can change: turn a screen off/on. |

Note: `upd_screen?params={"on":0}` only stores the text in `params`; it does not change `on`. `upd_environment` has no `alive` parameter.

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

Environments are created by **webplayer2** (Core Player); the player-container only creates one as a fallback.

1. **webplayer2** looks for a saved environment in `localStorage` (per device fingerprint). If none, it calls
   `add_environment?house=…&name=Web player&keys=<random uuid>,<fingerprint>` with the account session, then `add_screen`.
   The key stays on the device.
2. **player-container**: if the account has no environment at all (`get_wp_user` returns none), it creates one via
   `createDefaultEnvironment` so Configure can display it. It can also delete environments.
3. If the parent passes `house`, `environ`, `screen` and `key` in the URL, webplayer2 uses them directly.
4. webplayer2 registers on the WebSocket with `environ` + `key`; the server then pushes playlist / montage / track data.

```
webplayer2        →  REST add_environment (session)  →  environment + key (kept on device)
player-container  →  REST add_environment (fallback, only if none) / del_environment
webplayer2        →  WebSocket <registration environ key>  →  server pushes playlist / montage / track data
```

Credentials: the **session** proves the account (create/delete environments, edit content);
the **environment key** proves the device (registration, commands, playlists, media links).

Multi-screen synchronization is maintained by the server broadcasting `seekOffset` corrections to all connected environments sharing the same playlist.

---

## Platform Sites vs WordPress Plugin

WallMuse runs on both its own platform sites and as a WordPress plugin installed on third-party sites. The account and environment mechanics are identical; the session token injection differs:

| Deployment | Session source |
|---|---|
| wallmuse.com, ooo2, sharex | Theme PHP (`common0.php`) injects token into `data-user` |
| WordPress plugin | Plugin PHP (`shortcode.php`) calls `authenticate_with_key`, injects token |

See [player-container architecture docs](../player-container/docs/architecture/WALLMUSE_PLAYER_CONTAINER_RULES.md) for the full session token format.
