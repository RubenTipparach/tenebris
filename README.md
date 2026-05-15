# tenebris-c

Sokol + C11 + WebAssembly port of Tenebris. See `../conversion.md` for
the full plan.

[**Join our test server here!**](https://rubentipparach.github.io/tenebris/wasm/?invite=T9VVPW)

## Status

**Tier 0**: hello triangle (in progress). Target is a browser-loadable
WASM that clears the screen and draws a textured quad to prove the
pipeline end-to-end.

**Tier 1+**: not yet started.

## First-time setup

```sh
# Vendor third-party single-header libs (sokol, stb, HandmadeMath)
./scripts/fetch-deps.sh

# Install Emscripten SDK and activate it (one-time, outside this repo)
#   https://emscripten.org/docs/getting_started/downloads.html
# Then `source emsdk_env.sh` in each shell that builds the web target.
```

## Build

```sh
# Web (WASM) build — this is the shipping target
cmake --preset=web
cmake --build build-web

# Native dev build (Linux/macOS/Windows) — for fast iteration + server
cmake --preset=native
cmake --build build-native
```

Web artifacts land in `build-web/tenebris.html + .js + .wasm`. Serve
with `emrun build-web/tenebris.html` or any static HTTP server that
sets COOP/COEP headers.

## Server HTTP dashboard

The dedicated server (`tenebris-server`) listens for WebSocket clients
on `--port` (default `8080`) and answers plain HTTP `GET`s on the same
port. The live deployment runs on Fly.io at
[`https://tenebris-c.fly.dev`](https://tenebris-c.fly.dev/health).

The pretty UI: **[the live dashboard on GitHub Pages](https://rubentipparach.github.io/tenebris/dashboard/)**
polls these endpoints every 2-5 seconds and pairs login/logout events
to show session durations. The page itself is a single static HTML
file (`web/dashboard/index.html`) that the landing-page build stages
into `dist/dashboard/index.html`. Append `#http://localhost:8080` (or
`?host=...`) to point it at a different server.

Raw JSON for `curl` / scripts:

| Endpoint | Description |
| --- | --- |
| [`GET /health`](https://tenebris-c.fly.dev/health) | Plaintext "alive" line + usage hint. |
| [`GET /status`](https://tenebris-c.fly.dev/status) | Live JSON snapshot: uptime, tick rate, CPU %, RAM (RSS/VmSize), online players (id/name/room/body), and allocated rooms. |
| [`GET /rooms`](https://tenebris-c.fly.dev/rooms) | Every room ever seen, with `unique_users` (distinct names ever to log in), `total_logins`, `last_seen_ts`, and `live_clients`. Combines `sessions.log` with the live room table so empty private rooms still appear. |
| [`GET /logins`](https://tenebris-c.fly.dev/logins) | JSON array of `{ts, event, name, room}` records. `event` is `"login"` (handshake success) or `"logout"` (client disconnect after handshake). |
| [`GET /chat`](https://tenebris-c.fly.dev/chat) | JSON array of `{ts, name, room, text}` chat messages, server-wide, time-ordered. |
| `GET /chat/send?text=...&room=...` | Broadcast a chat message to a room as `~server~` (sender renders with that name in-game). Authenticated by the `TENEBRIS_ADMIN_TOKEN` env var if set: append `&token=...`. Without the env var the endpoint is open (dev mode). |
| [`GET /saves`](https://tenebris-c.fly.dev/saves) | JSON inventory of every persisted tile column (`.col` file) on the saves volume. Use this to confirm that block edits are actually hitting durable storage and to verify which room/seed/body they belong to. |

### Inspecting persisted block edits

When the in-game world looks like your placed blocks vanished after a
relog, hit `/saves` to see what the server actually has on disk.
Sample output:

```json
{
  "filters": {},
  "tiles": [
    {"room": "T9VVPW",     "seed": 0, "body": 0, "tile": 160427, "size": 144, "mtime": 1778808130},
    {"room": "__public__", "seed": 0, "body": 0, "tile":    100, "size": 144, "mtime": 1778808129}
  ],
  "total_files": 2,
  "matched": 2,
  "emitted": 2,
  "truncated": false
}
```

Each entry corresponds to one tile column (128 block depths) on a
specific body for a specific room. `room` is the slug used on disk;
`__public__` is the empty-code lobby. `size` is bytes (16-byte header
+ 128-byte payload = 144 for v1 files). `mtime` is the unix timestamp
of the last write.

Filter with any combination of:

```sh
# Just the tiles for one private room
curl 'https://tenebris-c.fly.dev/saves?room=T9VVPW' | jq

# Just one body across every room (handy for the spawn planet)
curl 'https://tenebris-c.fly.dev/saves?body=0' | jq

# A specific (room, body, seed) tuple
curl 'https://tenebris-c.fly.dev/saves?room=T9VVPW&body=0&seed=0' | jq '.tiles | length'
```

`total_files` always reflects the full disk state regardless of how
the filters narrowed `matched` / `emitted`. When the JSON gets
truncated to fit the response buffer, `"truncated": true` and
`emitted < matched` so you know to narrow further with filters.

If `total_files` is 0 right after you placed blocks, the volume isn't
persisting writes - check `fly volumes list` to confirm the
`tenebris_saves` volume exists and is actually attached to the
running machine. The server prints `[saves] write-probe ok in
/data/saves` at boot when writes round-trip correctly.

> **Why does the server seem to restart on its own?** `fly.toml` sets
> `auto_stop_machines = 'stop'` + `min_machines_running = 0`, so the Fly
> machine sleeps when idle and starts back up on the first request. The
> first `/status` after a quiet period will take a few seconds; subsequent
> ones are instant. Audit logs persist on the `/data` mount across these
> stops, so login / chat history isn't lost.

Both `/logins` and `/chat` accept `?n=N` to limit the number of
returned records (default `200`, clamped to `[1, 5000]`). Example:

```sh
curl https://tenebris-c.fly.dev/logins?n=50 | jq
curl https://tenebris-c.fly.dev/chat?n=100  | jq
```

Records are persisted to `<saves_dir>/sessions.log` and
`<saves_dir>/chat.log` on the Fly volume mount (tab-separated, one
event per line) so the history survives restarts. Each file
auto-truncates to the most recent 5000 lines.

## Directory layout

```
src/
  core/     shared between client and server, MUST NOT link sokol
  client/   renderer, input, UI
  server/   authoritative sim (Tier 5+)
shaders/    GLSL sources, processed by sokol-shdc
assets/     runtime assets (textures, audio) copied from ../public
third_party/  vendored single-header libs (populated by fetch-deps.sh)
web/        HTML shell template for emcc
```

## References / further reading

Inspirations and techniques to draw from when revisiting renderer
subsystems. These are *not* dependencies — the current code mostly
implements simplified analytical variants.

- **Atmospheric scattering** —
  [Bruneton 2008, *Precomputed Atmospheric Scattering*](https://ebruneton.github.io/precomputed_atmospheric_scattering/)
  for the canonical Rayleigh + Mie precomputed-LUT approach;
  [GPU Gems 2 ch.16, *Accurate Atmospheric Scattering*](https://developer.nvidia.com/gpugems/gpugems2/part-ii-shading-lighting-and-shadows/chapter-16-accurate-atmospheric-scattering)
  for the analytical per-pixel form the sky shader currently uses.
- **Water rendering** —
  [Fire-Face *Water Shading*](https://fire-face.com/personal/water/)
  for fresnel-blended reflection / refraction with screen-space
  reflections, foam masks, and depth-derived shoreline blending. The
  current `VS_WATER`/`FS_WATER` only does an analytical 3-octave fBm
  swell with a fresnel mix; the techniques on Fire-Face's page are
  what to reach for when we add a render-target reflection probe.
