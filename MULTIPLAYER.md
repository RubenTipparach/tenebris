# Multiplayer + Local Persistence

Plan for adding multiplayer to Tenebris. **No code yet — review the
shape first.** Once we agree, the milestones (M0..M9) below land as
small independently verifiable PRs.

---

## Goals

1. **Single-player** — works offline, saves and resumes a world.
2. **Multiplayer self-hosted** — a player runs the server on their
   own machine; friends connect over LAN or an exposed port.
3. **Multiplayer cloud-hosted** — same server binary, run on a
   rented host; client connects by URL.
4. **Local persistence everywhere** — every mode writes a save file;
   SP and self-hosted save to disk, cloud writes to its own data dir.

Non-goals (v1): matchmaking, anti-cheat, accounts, voice chat,
mod sandboxing, P2P NAT punching.

---

## Architecture: one server binary, three launch modes

The dedicated server is a native binary (`tenebris-server`) that
links the existing `tenebris-c/src/core/` library — world, blocks,
physics, planet gen, proto. The client (WASM or native) speaks to it
over WebSocket. Every mode is the same server, only the launch and
transport wrapping differ:

| Mode               | Server                              | Transport             |
| ------------------ | ----------------------------------- | --------------------- |
| Single-player      | spawned in-process / web worker     | loopback (ws://127… or shared queue) |
| MP self-hosted     | same binary, native, user starts it | ws:// on user's IP    |
| MP cloud-hosted    | same binary, deployed              | wss:// behind TLS terminator |

This is the load-bearing decision. It means:

* The simulation has exactly **one** implementation (`core/`).
* SP gets save/load for free — it's just "the in-process server saving."
* The server is always authoritative. There is no SP-only code path
  that could drift from the MP one.
* The client only ever talks `proto.h`. It doesn't know if its
  counterpart is in-process or across the internet.

Cost: even SP's first frame goes through a serialise/deserialise
round-trip. For Tenebris's tick budget this is well under a frame.
If it ever becomes a problem we can add a "shared-memory transport"
that skips encoding for the in-process case — same protocol, different
wire.

---

## Transport: pluggable, WebSocket first, WebRTC later

Long-term, **WebRTC DataChannel is the better transport** for a real
game, and Tenebris should grow into it. It's what every shipping
engine — Source, Unreal, Minecraft Bedrock, Roblox — does in some
form, because:

* **Two channels on one connection.** DataChannel lets you mark each
  stream reliable-ordered (chunk edits, chat) or unreliable-unordered
  (player positions, projectiles), or partial-reliability with
  time-bounded retransmit. WebSocket only does reliable-ordered.
* **No TCP head-of-line blocking.** WS rides TCP; one dropped packet
  stalls everything behind it for 50–200 ms. Invisible at Tenebris's
  current pacing, but a hard ceiling for ship combat, vehicle
  physics, or 8+ players in proximity.
* **P2P NAT punching** for self-hosted, so a friend can host from
  their laptop without router config.

What we **don't** want is to pay for that in v1. The cost is real:

* libdatachannel pulls in OpenSSL + usrsctp + libjuice — ~50k LOC of
  dependency vs ~5k for a WS server in C.
* More failure modes per connection (signalling, SDP, ICE, SCTP,
  DataChannel) and harder debugging.
* TURN relay bandwidth costs money when NAT punch fails (~10–20 %
  of connections). Self-hosted would need to ship a TURN server too.
* Stalling M1 on "make libdatachannel build on the CI matrix" pushes
  the "two players move on screen" demo out by weeks.

So the architecture is: **pluggable transport, WebSocket backend
first, DataChannel backend later, game code never sees the socket.**

```c
/* core/net_transport.h — sketch */
typedef struct net_transport_s net_transport_t;
typedef struct net_conn_s      net_conn_t;

typedef enum {
    NET_CHANNEL_RELIABLE = 0,   /* ordered, retransmits forever */
    NET_CHANNEL_UNRELIABLE = 1, /* unordered, no retransmit     */
} net_channel_t;

typedef void (*net_on_open_fn) (net_conn_t* c, void* user);
typedef void (*net_on_msg_fn)  (net_conn_t* c, net_channel_t ch,
                                  const void* data, size_t len, void* user);
typedef void (*net_on_close_fn)(net_conn_t* c, int reason, void* user);

net_transport_t* net_listen (const char* bind_addr, int port,
                                net_on_open_fn, net_on_msg_fn,
                                net_on_close_fn, void* user);
net_conn_t*       net_connect(const char* url,
                                net_on_open_fn, net_on_msg_fn,
                                net_on_close_fn, void* user);
void              net_send   (net_conn_t*, net_channel_t,
                                const void* data, size_t len);
void              net_poll   (net_transport_t*);    /* tick the event loop */
void              net_close  (net_conn_t*);
```

v1 ships a WS implementation of this interface
(`net_transport_ws.c`). On the WS backend, `NET_CHANNEL_UNRELIABLE`
silently falls back to reliable-ordered — same correctness, just no
latency win yet. When/if we feel the WS ceiling, we add
`net_transport_rtc.c` as a second backend without touching protocol,
server, or client logic. The discipline is just "no raw socket calls
outside the transport module."

WebTransport (HTTP/3 + QUIC) is the eventual successor to both and
is even better, but Safari support is still spotty in early 2026 and
server-side QUIC tooling is immature. Same abstraction lets us add
it as a third backend whenever it's ready.

---

## Deployment: Fly.io

The server ships as a single Linux binary in a small Docker image,
deployed to **Fly.io's free tier** (3 × shared-cpu-1x VMs with 256 MB
RAM, free forever for our scale). Fly was chosen over Vercel because
Vercel only runs short-lived serverless functions and can't host a
persistent process. Fly's model — persistent Docker containers,
regional deploy, CLI-driven — is exactly what a dedicated game
server needs.

Repo additions:

```
tenebris-c/
  Dockerfile           ← multi-stage: build with cmake + gcc,
                          final image is a thin runtime layer
  fly.toml             ← Fly app config: app name, region,
                          internal_port, healthcheck
  .dockerignore        ← keep the build context lean
```

Deploy is `cd tenebris-c && fly deploy`. Region defaults to one
close to the dev (`iad` / `sjc` / `lhr`) and can be overridden.
TLS is terminated by Fly's edge proxy, so the client connects to
`wss://<app>.fly.dev/`.

For self-hosting, the same Dockerfile produces the same binary —
players run `docker run -p 8080:8080 tenebris-server` (or just the
bare binary) on their own machine. No cloud account required.

---



```
tenebris-c/
  src/
    core/        ← unchanged. World sim, proto, math. Linked by both.
    client/     ← existing. Adds a "net client" module.
    server/    ← NEW. Tick loop, socket accept, per-client state,
                   persistence I/O.
    common/    ← NEW (optional). Tiny shared bits (frame timer,
                   logging) that are not "sim core" but useful
                   to both client and server.
  cmake/
    server.cmake ← NEW. Builds tenebris-server native binary.
```

The WASM client build is unchanged except for a new `net_client.c`
module under `client/`. The native server build is new — CMake target
`tenebris-server`, no Sokol/GL deps, links only `core/` + a WS lib.

WebSocket library: **libwebsockets** is the obvious pick (mature, C,
permissive licence, runs as a single-thread event loop which matches
our tick model). Browser side uses the native `WebSocket` API exposed
through emscripten — no extra dep.

---

## Wire protocol

`tenebris-c/src/core/proto.h` already defines the kinds. v1 fills
them in:

```
HELLO   C→S   { u32 version, u8 token[32] }
WELCOME S→C   { u32 player_id, u64 world_seed, dvec3 spawn,
                  u32 body_id }
INPUT   C→S   { u32 tick, u16 buttons, f32 yaw, f32 pitch,
                  f32 roll }
PLAYER_CMD C→S { u8 kind, ... }   // place/break/teleport/etc
SNAPSHOT  S→C  { u32 tick, u16 entity_count,
                   { u32 id, dvec3 pos, vec3 vel,
                     f32 yaw, f32 pitch }[] }
CHUNK_DIFF S→C { u32 chunk_id, u16 edit_count,
                   { u32 block_idx, u16 new_block }[] }
CHAT    both   { u16 len, char[len] }
```

Rules of the road:

* Little-endian, length-prefixed (`msg_hdr_t` already specifies
  this).
* `version` field per-kind. Bump it when the payload changes; old
  clients reject mismatched kinds with a clear error rather than
  silently misparse.
* Server is authoritative for **all** entity state and chunk
  contents. Client sends intent (INPUT, PLAYER_CMD), receives truth
  (SNAPSHOT, CHUNK_DIFF). Client-side prediction comes later if
  needed.
* Tick rate: server runs at 20 Hz simulation, sends a snapshot every
  3rd tick (~6.7 Hz). Client interpolates. Both are config knobs
  (see "Tunables" below).

---

## Persistence

One save format, used by every mode. The server is the only thing
that reads or writes it.

```
saves/
  <world-name>/
    meta.yaml         seed, name, created_at, last_played, server version
    chunks/
      <body-id>/
        <chunk-id>.diff   binary: list of {block_idx, block_id} deltas
    players/
      <player-id>.yaml    position, inventory, body anchor
```

* Chunks are stored as **diffs against procedural gen**, not as full
  block arrays. Tenebris generates terrain deterministically from
  `(seed, body, chunk_id)` so a freshly-loaded chunk is "regen +
  apply diff." This keeps save sizes tiny for lightly-edited worlds.
* `meta.yaml` and `players/*.yaml` use the existing tiny-YAML parser
  conventions (see `core/config.c`). Chunk diffs are binary because
  they're hot path.
* SP save dir defaults to a per-user location (`%APPDATA%/Tenebris/`
  on Windows, `~/.local/share/tenebris/` on Linux). Self-hosted
  defaults to `./saves/` next to the binary. Cloud is whatever the
  operator configures.
* Save cadence: every N seconds (config) and on clean shutdown. Dirty
  chunks tracked in a bitset, only those flush.

---

## Main menu UX

Two top-level buttons:

```
            Tenebris

       [ Single player ]
       [   Multiplayer  ]
```

Single player → world list (Continue / New world / Delete) → into game.

Multiplayer → two sub-options:

```
       [ Self-hosted ]   ← "start a server on this machine"
       [ Cloud-hosted ]  ← "connect to a server by URL"
```

* Self-hosted: pick a save (or "new world"), enter port, click Host.
  Client spawns the local server, then connects to it. Server keeps
  running until the host's client exits.
* Cloud-hosted: enter `wss://host:port` (with a "Default Tenebris
  server" preset). No local server is started.

UI implementation follows the project's `mobile_ui.c` rules — real
drawn buttons with hover/pressed states, hit-tested through
`mobile_ui_handle_touch`. **No ASCII frames.** Labels via
`sdtx_printf`.

---

## Milestones

Each milestone is a self-contained PR. Order matters — later ones
depend on earlier ones — but each leaves the build green and the
game runnable.

* **M0. Plan + protocol freeze.** This doc. Lock the wire format in
  `proto.h` (fill in the v1 payload structs). No behaviour change.

* **M1. Server skeleton + transport interface + deploy path.** New
  `tenebris-c/src/server/` directory and `tenebris-server` CMake
  target (gated to non-Emscripten builds). Binary boots,
  initialises Tenebris from `core/`, runs a 20 Hz tick loop, logs
  every Nth tick, handles SIGINT/SIGTERM cleanly. Lands
  `core/net_transport.h` with the `net_listen` / `net_connect` /
  `net_send` / `net_poll` surface — no implementation yet, just
  the interface so server code is written against it. Also lands
  the `Dockerfile` + `fly.toml` so `fly deploy` works end-to-end
  (deploys a binary that ticks but doesn't yet accept connections).
  Verifiable: `./tenebris-server --seed=42` prints ticks and exits
  cleanly on Ctrl-C; `fly deploy` succeeds.

* **M2. WebSocket backend + HELLO/WELCOME.** Implements
  `net_transport_ws.c` (libwebsockets) as the first backend behind
  the M1 interface. `NET_CHANNEL_UNRELIABLE` silently maps to
  reliable-ordered on this backend. Server accepts WS connections,
  handshakes the HELLO/WELCOME pair, prints connected clients.
  Verifiable with `websocat ws://localhost:PORT`.

* **M3. Client net module.** WASM client gets a `net_client.c` that
  uses the same `net_transport_t` interface (browser-side WS
  backend lives in `net_transport_ws_wasm.c`, thin shim over the
  JS `WebSocket` API). Opens a WS to a URL, handshakes, and stores
  the welcome. No gameplay change yet — the client still runs its
  own local world. Verifiable: dev console shows "connected,
  player_id=N."

* **M4. Server-authoritative position.** Client sends INPUT; server
  runs player physics; server sends SNAPSHOT; client renders the
  server's position instead of its own. Single-player loopback works
  through the same path. Verifiable: open two browsers against the
  same server, see two players move.

* **M5. Chunk diffs over the wire.** Block place/break sent as
  PLAYER_CMD, server applies it, server broadcasts CHUNK_DIFF. All
  clients see edits. Verifiable: client A breaks a block, client B
  sees it gone.

* **M6. Persistence.** Server writes chunk diffs and player files to
  the save dir on a timer + on shutdown. Reload on next start
  reproduces the world. Verifiable: edit terrain, kill server,
  restart, edits are still there.

* **M7. In-process server for SP.** New launch mode: SP starts a
  server in a background thread (native) or web worker (WASM) and
  loopback-connects. The "single player" menu button works
  end-to-end. Verifiable: click Single player → new world → play
  → exit → continue → state preserved.

* **M8. Main menu.** Real menu UI per the UX section. SP/MP/quit;
  MP → self-hosted/cloud sub-menu; world list for SP. Replaces the
  current "drop into Tenebris on boot" behaviour.

* **M9. Self-hosted + cloud-hosted polish.** Self-hosted launch
  spawns the native server next to the client (or instructs the
  user to run it). Cloud-hosted is a URL input + saved preset.
  Connection errors get a real dialog, not a silent failure.

After M9 we have the feature. Stretch items go in the "Later"
section below.

---

## Tunables

New `tenebris-c/assets/config/net.yaml`, per the repo's
no-magic-numbers rule:

```yaml
# Server tick + snapshot pacing
server:
  tick_hz: 20.0
  snapshot_every_n_ticks: 3
  max_clients: 8

# Client interpolation
client:
  interp_delay_ms: 100.0
  extrapolate_max_ms: 250.0

# Persistence
save:
  autosave_seconds: 30.0
  saves_dir: "./saves"
```

Parser follows `core/config.c`. Zero / missing fields mean
"compiled-in default."

---

## Open questions (decide before M1)

1. **Native client?** Is the native build a real shipping target, or
   is the browser the only client? If browser-only, server can be the
   only native binary and we save a CMake target. (Default
   assumption: browser-only for v1, native server-only.)
2. **Save format on the wire too?** For SP-loopback we could skip
   serialisation entirely and pass struct pointers. Worth it later;
   for now, treat loopback the same as remote.
3. **Auth.** v1 has none — anyone with the URL connects. Cloud-hosted
   wants at least a shared password before we ship publicly. Punt to
   post-M9?
4. **WASM-as-server for self-hosted?** Could a player "host" from
   their browser? Possible with a service worker + WS-in-a-tab, but
   the UX is fragile (close tab = server gone) and the bandwidth
   profile is wrong. Default no — self-hosted means running the
   native binary.

---

## Later (post-M9)

* Client-side prediction + reconciliation for player movement.
* Delta-compressed snapshots (only send entities that changed).
* Authentication (shared secret → real accounts).
* **WebRTC DataChannel backend** (`net_transport_rtc.c`) — second
  implementation of the M1 transport interface. Unlocks real
  unreliable-unordered for positions, P2P NAT punching for
  self-hosting, and no TCP head-of-line blocking. Triggered by
  either: profiling shows movement jitter we can't hide at the
  snapshot layer, or one-click self-hosting becomes a UX priority.
  Requires libdatachannel + a STUN server (free) and decisions on
  TURN relay cost-sharing for cloud.
* **WebTransport (HTTP/3 + QUIC) backend**, once Safari ships full
  support and server-side QUIC tooling matures. Same interface,
  third backend. Long-term replacement for both WS and WebRTC.
* Mod / scripting sandbox.
* Multi-world hosting on one server binary.
