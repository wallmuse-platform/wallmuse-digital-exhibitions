# WallMuse Integration Guide

This page covers what an artist-coder needs to embed or extend a WallMuse player: how to obtain a session token, how the WebSocket session works, and how to communicate with a running player from a p5.js sketch or any other JavaScript running alongside it.

For the full WebSocket message reference see [WEBSOCKET_PROTOCOL.md](./WEBSOCKET_PROTOCOL.md). For the platform architecture see [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## 1 — Session token

Every player session requires a token that identifies the account and authorises playback. Two delivery paths exist depending on your integration:

### Platform PHP (server-rendered pages)

The backend injects the token into the page as a JavaScript global before the player bundle loads:

```html
<script>
  window.wallmuse = {
    token: "wp-{login}-{domainId}-{checksum}",
    ...
  };
</script>
```

The token format is `wp-{login}-{domainId}-{md5(login + domainId + secret)}`. The `login`, `domainId`, and `secret` come from the account configuration on the backend.

### WordPress plugin (shortcode injection)

The `[wallmuse]` shortcode renders the player and injects the token via the same `window.wallmuse` global. Two optional attributes control the guest flow:

```
[wallmuse signup_url="https://example.com/signup" guest_url="https://example.com/tour"]
```

See the [wallmuse-plugin repository](https://github.com/wallmuse-platform/wallmuse-plugin) for shortcode reference and account tier details.

### Demo / free accounts

Sessions whose login contains `demo`, `freeaccount`, `unregistered` (case-insensitive), or the `wm-plugin-free` tier are treated as demo sessions. Demo sessions have access restricted to content marked for public preview.

---

## 2 — WebSocket session

The player connects to the backend over WebSocket on startup. The connection carries montage state, synchronisation offsets, and playback commands. Artist-coders generally do not interact with the WebSocket directly — use the postMessage API (section 3) instead — but understanding the session helps when debugging timing or sync issues.

### Connection and registration

After the WebSocket opens, the player sends an XML registration message:

```xml
<registration environ="production" key="{token}" version="2"/>
```

The server responds with a JSON montage payload that drives the initial playback state.

### Server → player messages

| Type | Trigger |
|------|---------|
| `montage` | New montage loaded; contains the full sequence of tracks and items |
| `seek_offset` | Clock synchronisation; adjusts playback position by a millisecond delta |

### Player → server messages

```json
{ "type": "play" }
{ "type": "pause" }
{ "type": "stop" }
{ "type": "go_montage", "montage_id": "123" }
```

Multi-screen installations share the same session token across screens. The server broadcast of `seek_offset` keeps all screens aligned.

---

## 3 — p5.js postMessage API

P5JS artworks run in a sandboxed `<iframe>` inside the webplayer. The player and the sketch communicate via `window.postMessage` with `targetOrigin: "*"`.

### Messages the player sends to the sketch

```js
// Playback lifecycle
{ type: "play" }
{ type: "pause" }
{ type: "stop" }
{ type: "seek", position: 12500 }   // position in ms from item start

// Context
{ type: "artwork-context", artwork: { id, title, author, duration, ... } }
{ type: "resize", width: 1920, height: 1080 }

// Heartbeat (each rendered frame)
{ type: "tick", elapsed: 12500 }    // ms since item start
```

### Messages the sketch sends to the player

```js
// Send from inside the iframe:
window.parent.postMessage({ type: "ready" }, "*");        // sketch loaded
window.parent.postMessage({ type: "seek", position: 0 }, "*");
```

### Minimal p5.js sketch

```js
// sketch.js — placed inside the P5JS ZIP package
window.addEventListener("message", (e) => {
  const msg = e.data;
  if (msg.type === "play")  loop();
  if (msg.type === "pause") noLoop();
  if (msg.type === "stop")  { noLoop(); background(0); }
  if (msg.type === "tick")  elapsed = msg.elapsed;
  if (msg.type === "resize") resizeCanvas(msg.width, msg.height);
  if (msg.type === "artwork-context") ctx = msg.artwork;
});

function setup() {
  createCanvas(windowWidth, windowHeight);
  window.parent.postMessage({ type: "ready" }, "*");
}

function draw() {
  // your animation using elapsed, ctx, etc.
}
```

The `window.wallmuse` bridge object is available inside the iframe and carries `{ token, sessionId, artworkId }` for artworks that need to query the backend.

### Overlay modes

A P5JS item can be placed in three modes on the montage timeline:

| Mode | Description |
|------|-------------|
| Standalone | The sketch is the only content on the track for its duration |
| Background overlay | The sketch renders behind a video or image item on another track |
| Foreground overlay | The sketch renders in front of a video or image item on another track |

Overlay mode is set per-item in the montage Curator. The sketch itself does not need to know its mode — the player handles compositing.

For full rendering specification see [SPEC_P5JS_RENDERING.md](../webplayer/docs/ossia-integration/SPEC_P5JS_RENDERING.md).

---

## 4 — Packaging a P5JS artwork

A P5JS artwork uploaded to WallMuse is a ZIP archive containing:

```
sketch.js        (required — entry point)
assets/          (optional — images, fonts, data files)
```

The webplayer generates a minimal `index.html` at runtime, loads p5.js from the CDN, and injects the `window.wallmuse` bridge before executing `sketch.js`. Do not include an `index.html` in the ZIP.

Upload the ZIP as a new content item in **Add Content**, selecting the `P5JS` content type (upcoming feature — see [AddContent.md](../create-montage/doc/AddContent.md)).
