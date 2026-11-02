# WebSocket Protocol

This document describes the WebSocket communication between the Core Player (`webplayer`) and the WallMuse backend server. The connection is established by the Core Player after receiving its environment credentials from the App Web Player or App PC Player.

---

## Connection

The Core Player generates a session key from the environment's `crypt_key` and opens a persistent WebSocket connection to the backend. The server then drives playback by pushing content and synchronization commands.

### Registration

On connect, the player sends an XML registration message:

```xml
<registration environ="{environmentId}" key="{sessionKey}" version="2"/>
```

| Field | Description |
|---|---|
| `environ` | Environment ID assigned at environment creation |
| `key` | Session key derived from `crypt_key` |
| `version` | Protocol version (currently `2`) |

---

## Server-to-Client Messages

The server pushes JSON objects tagged with a `tag_name` field. The Core Player's `CommandsManager` dispatches each message by tag.

### Montage

Sent when the active montage changes. Contains the full montage definition including all tracks and items.

```json
{
  "tag_name": "montage",
  "id": "1553",
  "name": "Exhibition Title",
  "tracks": "3",
  "duration": "74.0",
  "seq_count": "3",
  "orientation": "L",
  "splittable": "N",
  "deconstructable": "N",
  "croppable": "N",
  "uhd": "N",
  "rating": "G",
  "author_id": "3216",
  "author": "Author Name",
  "language": "",
  "thumbnail_url": "14281",
  "best_name": "Artwork Title: Language Description",
  "best_description": "Artwork description text.",
  "selectable": "Y",
  "cdate": "20160331T045414",
  "mdate": "20160401T155413",
  "seqs": [
    {
      "tag_name": "seq",
      "id": "1",
      "array_content": [
        {
          "tag_name": "item",
          "artwork_id": "14278",
          "title": "Artwork Title",
          "..."
        }
      ]
    }
  ]
}
```

**Key fields:**

| Field | Type | Description |
|---|---|---|
| `id` | string | Montage ID |
| `duration` | string | Total montage duration in seconds |
| `tracks` | string | Number of tracks (screens) |
| `seq_count` | string | Number of sequences (tracks) |
| `orientation` | string | `L` (landscape) or `P` (portrait) |
| `splittable` | string | `Y`/`N` — whether the montage can be split across screens |
| `seqs` | array | Array of track objects, each with `array_content` (items) |

### Item

Nested within a `seq.array_content` array. Represents one artwork slot on a track.

| Field | Description |
|---|---|
| `artwork_id` | Reference to the artwork record |
| `title` | Display title |
| `offset` | Start time within the track (seconds) |
| `duration` | Item display duration (seconds) |
| `type` | Artwork type: `VID`, `IMG`, `AUD`, `HTML`, `TEXT` |
| `url` | Media URL (absent for non-streamable artworks) |
| `effect_type` | Effect applied: `pan_zoom`, `ken_burns`, or absent |
| `effect_data` | JSON-encoded effect parameters (ZoomAndPan) |

### Seek Offset

Sent periodically to correct drift between devices sharing a playlist.

```json
{
  "tag_name": "seek_offset",
  "offset": "2.340"
}
```

The player applies the offset to its internal clock without interrupting playback.

---

## Client-to-Server Commands

The player sends commands in response to user actions or internal state changes.

### Play / Pause / Stop

```json
{ "tag_name": "play" }
{ "tag_name": "pause" }
{ "tag_name": "stop" }
```

### Navigate

```json
{
  "tag_name": "go_montage",
  "montage_index": "2"
}
```

### Camera Override (play mode)

```json
{
  "tag_name": "camera_override",
  "yaw": 45.0,
  "pitch": -10.0,
  "fov": 75.0
}
```

Used in play/teaser mode to lock the viewer to a specific framing of 360° content. (Planned — not yet implemented.)

---

## Synchronization Model

All connected environments sharing a playlist receive the same `seek_offset` corrections from the server. Multi-screen camera and effect synchronization is derived client-side from elapsed time plus authored parameters (ZoomAndPan / Ken Burns seed), so no additional camera state needs to be broadcast.

The connection is persistent. If disconnected, the player attempts reconnection with exponential backoff.

---

## Related

- [Track Management Architecture](../webplayer/docs/architecture/TRACK_MANAGEMENT_ARCHITECTURE.md)
- [WebSocket System](../webplayer/docs/architecture/WEBSOCKET_SYSTEM.md)
- [Multi-Environment System](./MULTI_ENVIRONMENT.md)
