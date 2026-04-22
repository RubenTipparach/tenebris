# Tenebris → Sokol + C + WASM Conversion Plan

## TL;DR

Port Tenebris from TypeScript / Three.js to C11 built with [Sokol](https://github.com/floooh/sokol)
targeting WebAssembly via Emscripten. Ship in **tiers**, starting with a minimal
creative-mode flat-voxel sandbox, then growing toward the full planet/rocket
game. Architect for **multiplayer from day one** — even the single-player MVP
is built on a `core / client / server` code split so netcode drops in later
without a rewrite.

## Guiding Principles

1. **Tiered delivery.** Each tier is independently shippable and playable.
   Do not start Tier N+1 until Tier N runs on web in a browser.
2. **Creative mode first.** Get block break/place/move/fly working on flat
   terrain before touching planets, crafting, rockets, or UI menus.
3. **Data-oriented C.** No OOP gymnastics. Flat structs, arrays,
   handle/index-based references. No STL-equivalents — just plain arrays and
   arenas.
4. **Multiplayer-ready from Tier 1.** Split code into `core/` (deterministic
   sim shared by client + server), `client/` (renderer, input, UI), and
   `server/` (netcode, persistence). Tier 1 ships SP-only but the split is
   real.
5. **Deterministic world gen.** All procedural generation lives in `core/`
   and is seeded + deterministic across native and WASM so server + client
   generate the same world.
6. **Cut scope aggressively.** The TS project is ~23k LOC. The port is a
   rewrite, not a translation. Feature parity is the Tier 4 goal, not the
   Tier 1 goal.
7. **Ship web builds continuously.** Every tier must run in a browser
   (Chrome + Firefox) — no "it works native, we'll port later."

## Table of Contents

1. [Current Codebase Snapshot](#1-current-codebase-snapshot)
2. [Target Stack](#2-target-stack)
3. [Tier 0 — Hello Triangle](#3-tier-0--hello-triangle)
4. [Tier 1 — Creative Mode MVP](#4-tier-1--creative-mode-mvp)
5. [Tier 2 — Creative Mode Polish](#5-tier-2--creative-mode-polish)
6. [Tier 3 — Planet / Spherical World](#6-tier-3--planet--spherical-world)
7. [Tier 4 — Gameplay Systems](#7-tier-4--gameplay-systems)
8. [Multiplayer Architecture](#8-multiplayer-architecture)
9. [Risks, Open Questions, Milestones](#9-risks-open-questions-milestones)

---

## 1. Current Codebase Snapshot

### Size and shape

- **~23k lines of TypeScript** across `src/`.
- **Two entry points**:
  - `src/main.ts` — classic flat-world Minecraft-style voxel game
    (`World` + `Chunk` on a `Uint8Array`, 16×64×16 chunks, hash noise).
  - `src/mainPlanet.ts` — spherical voxel planets built on a Goldberg
    polyhedron tile grid with LOD, atmosphere, clouds, water, rockets,
    tech/crafting.
- **Three.js** is the renderer. Uses `ShaderMaterial` extensively.
- **Web workers** do terrain generation and chunk meshing
  (`src/workers/*.ts`).
- **GLSL shaders** in `src/shaders/**` — planet, terrain, atmosphere,
  clouds, water, skybox, glass, ice, torch, steam, rocket exhaust, tech.
- **No netcode** exists. README lists networking as a "maybe someday."

### Subsystems (approximate LOC)

| Area | Files | LOC |
|---|---|---|
| Engine (GameEngine, Input, Audio, Storage, Profiler) | `src/engine/*` | ~3.2k |
| Flat voxel world | `src/world/*` | ~570 |
| Planet voxel world | `src/planet/*` | ~5k+ |
| Player (physics + interaction + menus) | `src/player/*` | ~16k |
| Rocket | `src/rocket/*` | ~4k |
| Workers | `src/workers/*` | ~2.6k |
| Shaders | `src/shaders/**` | GLSL |

The `src/player/` directory is by far the heaviest — most of its LOC is
crafting/tech UI menus (Printer3D, Furnace, Electronics Workbench, etc.),
which **do not exist in Tier 1**.

### What's in scope for the port

- Flat voxel world, chunked rendering, break/place, DDA raycast, FPS
  movement, AABB collision (Tier 1).
- Spherical planet + LOD + atmosphere + water (Tier 3).
- Crafting, inventory, rockets, interplanetary flight (Tier 4).
- Multiplayer (threaded through all tiers, lands at Tier 5+).

### What gets cut, replaced, or deferred

- **Three.js** — replaced by sokol_gfx.
- **Vite + TypeScript build** — replaced by Emscripten + CMake.
- **Web Worker messaging** — replaced by `emscripten_wasm_worker`
  (with a pthreads fallback) or offline pre-generation for Tier 1.
- **HTML/CSS menus** — replaced by an immediate-mode UI in C (Nuklear,
  Microui, or sokol_imgui). Tier 1 has no menus.
- **`.aseprite` asset pipeline** — unchanged; exported PNGs already
  live in `public/textures/`.
- **GoogleFonts / analytics / gtag** — dropped.
- **Music / SFX** — deferred to Tier 2 (sokol_audio).
- **Persistence / GameStorage** — replaced by a plain binary save file
  format in Tier 2.

---

## 2. Target Stack

### Core libraries (all STB-style single-header C)

| Lib | Role |
|---|---|
| `sokol_gfx.h` | Graphics API abstraction (WebGL2 on web, GL/Metal/D3D11 native) |
| `sokol_app.h` | Window, input, main-loop, canvas binding |
| `sokol_glue.h` | Glue between app and gfx |
| `sokol_time.h` | Monotonic time, delta time |
| `sokol_audio.h` | Stereo float audio stream (Tier 2+) |
| `sokol_fetch.h` | Async asset loading (HTTP on web, file native) |
| `sokol_log.h` | Logging |
| `sokol_debugtext.h` | Cheap debug text overlay (FPS, profiler) |
| `sokol_gl.h` | Immediate-mode lines/tris for gizmos/debug only |
| `HandmadeMath.h` | Vec/mat math (or roll our own) |
| `stb_image.h` | PNG loader for textures |
| `stb_ds.h` | Dynamic arrays + hashmaps (optional, may roll our own) |

### Renderer backend

- **Web: WebGL2** via sokol_gfx. WebGPU is tempting but ecosystem +
  browser support is still uneven as of 2026; revisit in Tier 3.
- **Native: GL 3.3** for Linux dev, Metal on macOS, D3D11 on Windows.
  Native builds exist only to make the authoritative server compile and
  for faster dev iteration — they are not a shipping target until Tier 4.

### Language + toolchain

- **C11**, `-std=c11 -Wall -Wextra -Wpedantic`.
- **Emscripten** latest stable for WASM builds. `-sUSE_WEBGL2=1
  -sFULL_ES3=1 -sALLOW_MEMORY_GROWTH=1 -sSTACK_SIZE=1mb`.
- **Threading on web**: `emscripten_wasm_workers` (lighter than
  pthreads, better itch.io compatibility). Worth prototyping both before
  committing. Requires COOP/COEP headers — see Risks.
- **CMake** driving both native and emcc builds. One `CMakeLists.txt`,
  two presets (`native`, `web`).
- **Clang-format + clang-tidy** in CI.
- **No dependencies beyond single-header libs** — keeps WASM size small
  and builds fast.

### Target directory layout

```
tenebris-c/
  CMakeLists.txt
  cmake/                # toolchain files, emcc preset
  third_party/          # sokol, stb, HandmadeMath (vendored headers)
  shaders/              # .glsl sources + generated .h via sokol-shdc
  assets/               # copied from public/textures, public/sfx, etc.
  src/
    core/               # SHARED between client and server
      world.c/h         # voxel storage, chunk ops
      chunkgen.c/h      # deterministic world gen (seeded)
      physics.c/h       # AABB + raycast, runs on server authoritatively
      blocks.c/h        # block registry / properties
      math.c/h          # vec/mat helpers
      proto.c/h         # wire protocol types + (de)serialization
      rng.c/h           # deterministic noise + PRNG
    client/             # renderer, input, UI - never linked into server
      main_web.c        # sokol_app entry for WASM client
      renderer.c/h      # sokol_gfx setup, passes, draw calls
      mesher.c/h        # chunk -> GPU mesh (runs on worker thread)
      input.c/h         # sokol_app events -> InputState
      player_ctrl.c/h   # client-side player controller + prediction
      ui.c/h            # debug overlay / HUD (Tier 2+)
      net_client.c/h    # WebSocket client (Tier 5)
    server/             # authoritative sim - native only
      main_server.c     # headless server entry
      tick.c/h          # fixed-timestep sim loop
      net_server.c/h    # WebSocket server (libdatachannel or uws)
      persist.c/h       # save/load world to disk
  tools/                # asset baking, shader codegen helpers
  web/
    index.html          # minimal shell, mounts canvas
    shell.html          # emcc shell template
```

### Build presets

- `cmake --preset=web` → `build-web/tenebris.wasm + .js + .html`, served
  by `python -m http.server` or `emrun`.
- `cmake --preset=native` → native client (dev only) + `tenebris-server`
  binary.
- `cmake --preset=server` → headless server only, for CI and deploy.

---

## 3. Tier 0 — Hello Triangle

Walking-skeleton tier. The goal is **end-to-end build + deploy pipeline**,
not gameplay. If this tier lands cleanly, every subsequent tier is "just
code."

### Scope

- `sokol_app` window opens, fills canvas, handles resize.
- `sokol_gfx` clears to a color.
- One textured quad drawn using a shader compiled by `sokol-shdc`.
- `sokol_debugtext` shows FPS + frame time.
- Keyboard input prints key events to console.
- Asset loading via `sokol_fetch` for a single PNG.

### Deliverables

- `build-web/tenebris.html` loads in Chrome + Firefox and renders the quad.
- CMake + CI: every PR produces a WASM artifact uploaded as a build
  artifact.
- `emrun` or `python -m http.server` dev loop documented in README.
- WASM size under 500 KB compressed (before any game code).

### Files touched

- `CMakeLists.txt`, `cmake/web-toolchain.cmake`
- `third_party/sokol/*.h`, `third_party/stb/*.h`
- `src/client/main_web.c` (entry, sokol_main)
- `src/client/renderer.c/h` (pipeline + quad draw)
- `shaders/quad.glsl` (via sokol-shdc → `shaders/quad.glsl.h`)
- `web/shell.html`
- `assets/test.png`

### Acceptance criteria

- [ ] `cmake --preset=web && cmake --build build-web` produces `.wasm +
      .js + .html` with zero warnings.
- [ ] Page loads, canvas fills viewport, quad visible, FPS text visible.
- [ ] Resizing browser window rescales canvas without distortion.
- [ ] CI green on Linux runner.

### Estimated effort

~2–4 days for someone familiar with sokol; ~1 week from a cold start
(mostly fighting emcc flags, sokol-shdc, and COOP/COEP headers).

---

## 4. Tier 1 — Hex-Sphere MVP (revised)

> **Reset note**: an earlier draft of this tier ported `src/main.ts` (a
> flat cube demo). That demo is broken in the reference repo and isn't
> what the game actually is. The real Tenebris is **hex prisms wrapped
> on a Goldberg/icosphere planet** with LOD streaming. This revised tier
> ports that architecture from day one, modeled after the author's
> existing C/Sokol port (Caelum) — see §10 for the architectural lessons
> taken from it.

The Tier 1 goal is now: **stand on a Goldberg-style hex planet, see the
horizon curve, walk around at 60 FPS at the equivalent of 700 km of
playable surface.** No break/place yet — that moves to Tier 2 once the
streaming pipeline is proven. No planets-plural, no rockets, no
crafting.

### Scope

- **Two coexisting worlds**, recombined every frame:
  1. **Icosphere LOD tree** for everything beyond a ~500 m bubble around
     the camera. 20 root faces (icosahedron), distance-split with
     hysteresis, max depth ~14. Output: cheap colored triangle patches.
  2. **Hex-prism chunks** inside the bubble. 32 × 32 columns × 256
     vertical layers, byte-per-voxel, max ~512 alive. The LOD tree
     suppresses its own patches inside this bubble so we never
     double-draw.
- **Floating origin**: world recentered when camera drifts > N meters so
  GPU vertex math stays near zero. Player position kept in
  double-precision world coords; render coords are floats relative to
  the floating origin.
- **Shared tangent frame** for the hex bubble, anchored at the camera's
  ground projection. Re-anchored only on origin shift, so chunks don't
  regenerate from small player movements.
- **Texture atlas**: 11 tiles in a 1×11 strip — water / sand / dirt /
  grass / stone / ice / snow / dirt_grass / dirt_snow / torch / moon.
  Per-block top/side/bottom mapping (Minecraft convention).
- **Mesher**: naive face-cull. Per-column `min_solid` / `max_solid`
  caches so the inner loop only walks layers that contain solid voxels.
  48-byte hex vertex (`pos[3]` + `normal[3]` + `uv[2]` + `color[3]` +
  `sky_light` + `torch_light`).
- **Sky-light BFS** baked into the vertex `sky_light` field — top-down
  column fill → cross-chunk seed → flood-fill with the Minecraft
  "downward at MAX stays MAX" rule.
- **Job system** with a synchronous Emscripten backend (matches Caelum's
  approach — pthreads on web bring more pain than gain). The
  `job_submit` interface is in place from Tier 1 so a Tier 3 native
  pthread backend or wasm-workers backend drops in without touching
  callers.
- **Spherical surface walking**: capsule physics in the local tangent
  frame. Gravity points along `-up_radial`. Movement keys are mapped
  through the tangent basis so "forward" is along the surface, not
  through the planet.
- **Shader pipeline**: `sokol-shdc` cross-compiles `shaders/*.glsl` to
  GLSL300es / HLSL5 / Metal / WGSL. No more inline GLSL strings.
- **WASM size budget**: < 2 MB compressed (was < 1 MB; bumped because
  sokol-shdc-baked shaders + the LOD tree code + sky-light BFS add real
  weight).

### Out of scope for Tier 1

- Break / place blocks (Tier 2).
- Rocket flight, multi-planet hopping (Tier 3).
- Crafting, inventory, tech blocks (Tier 4).
- Trees / flora (Tier 4).
- Real threading on web (job system has the seam; native gets pthreads
  in Tier 3).
- Persistence / save format (Tier 2).

### TS → C translation map (revised)

| TS file | C destination | Notes |
|---|---|---|
| `src/planet/GoldbergPolyhedron.ts` + `src/planet/Planet.ts` | `core/icosphere.c/h` + `core/planet.c/h` | Subdivision math + LOD tree |
| `src/planet/HexBlock.ts` + `src/planet/ChunkGeometryBuilder.ts` | `core/hex_chunk.c/h` (storage) + `client/hex_mesher.c/h` (geometry) | Split data from drawing |
| `src/workers/lodGeometryWorker.ts` | `client/lod_mesher.c/h` | Triangle patch builder |
| `src/workers/geometryWorker.ts` + `src/workers/TileMeshWorker.ts` | `client/hex_mesher.c/h` | Face-cull + sky-light BFS |
| `src/workers/TileMeshWorkerPool.ts` | `core/job_system.c/h` | Synchronous on web, pthreads native |
| `src/player/PlanetPlayer.ts` | `client/player_ctrl.c` (driver) + `core/physics.c` (capsule on tangent plane) | Spherical surface FPS |
| `src/engine/GameEngine.ts` (planet bits) | `client/main_web.c` + `client/renderer.c` | Two-pipeline frame loop |
| `src/mainPlanet.ts` (boot only) | `client/main_web.c` | Glue |

### Multiplayer readiness

Same rules as the original Tier 1 plan — `core/` stays sokol-free,
deterministic, and arena-allocator-friendly. World mutations still go
through `world_cmd_t` once break/place lands in Tier 2. Chunk gen
remains pure of `(seed, body_id, face_idx, depth, ...)` so server +
client agree byte-for-byte.

### Build pipeline + UAT landing page

Unchanged from the original Tier 1 — `dist/index.html` chooser, `dist/js/`
+ `dist/wasm/`, query overrides, `docs/uat-checklist.md` JS-vs-WASM
parity matrix. The UAT rows themselves change to reflect the hex-sphere
behaviors (walk on a curved surface, see the horizon, LOD transitions
are seamless, etc.) instead of the cube-world rows.

### Caelum lessons applied (the §10 reference)

These are the architectural decisions copied verbatim from the deep
read of the author's existing Caelum port. **No code is lifted** —
Caelum has no LICENSE file as of this writing — but the design ideas
make the difference between "a slow toy planet" and "700 km blazing
playable surface."

1. **The LOD tree and the hex bubble are two separate systems**,
   stitched at a ~500 m suppression radius. Never try to do "hex tiles
   at low LOD" — that's the slow path. Far away → triangles. Close →
   hex prisms. No middle ground.
2. **Floating origin in double-precision world coords.** Translate the
   whole render frame by `-origin` before submitting vertices in
   single-precision. Re-anchor only when the player drifts.
3. **Per-column solid caches** in chunks (`min_solid`, `max_solid`,
   `height_m`). The mesher's hot loop iterates `[min_solid, max_solid]`
   per column instead of `[0, 256]`.
4. **Hysteresis on LOD split/merge** (split at `arc * factor`, merge at
   `arc * factor * 2`) prevents thrash at boundary distances.
5. **Synchronous job system on web.** Caelum measured this and chose
   it over pthreads. We follow.
6. **`sokol-shdc`** for shaders. Inline GLSL was a Tier-0 shortcut.
7. **One job pool, one ring buffer queue, condvars for native, sync
   dispatch for web.** Don't over-engineer the threading layer.

### Acceptance criteria

- [ ] Spawn on a hex planet, see the horizon curve, walk around at
      60 FPS sustained on reference hardware (Chrome on a mid laptop).
- [ ] LOD transitions are visually seamless — no popping at the
      bubble boundary, no gaps, no Z-fighting where LOD meets hex.
- [ ] Walking 1 km doesn't drop below 50 FPS at any point (proves
      streaming + origin shifting work).
- [ ] WASM size < 2 MB compressed.
- [ ] `core/` compiles standalone, no sokol symbols, no `printf`.
- [ ] Hex tile generated at planet `(face=0, depth=13, tile=0)` is
      identical between two clients with the same seed (determinism
      check, scriptable in CI).
- [ ] `npm run build:all` produces `dist/index.html` chooser + js +
      wasm builds.
- [ ] UAT checklist updated with the new hex-sphere row set.

### Estimated effort

~6–10 weeks. This was the old Tier 3 estimate; we've collapsed it into
Tier 1. Tier 2 (creative-mode polish) and Tier 4 (gameplay) push out
correspondingly. Net schedule impact vs. the old plan: roughly +0
weeks because we delete the cube Tier 1 entirely and recover most of
Tier 3.

---

## 5. Tier 2 — Creative Mode Polish

Once Tier 1 is playable, add the smallest amount of polish and UX that
turns it into something you'd want to share. Still single-player, still
flat world.

### Scope

- **Hotbar / block palette.** Simple 9-slot hotbar drawn with
  `sokol_debugtext` or a tiny custom textured-quad UI. No inventory
  model yet — hotbar is hard-coded to a list of block IDs.
- **Fly mode.** Toggle with F — disables gravity, adds vertical move
  keys. Pure creative affordance, not gameplay.
- **Save / load.** Single binary file `world.sav`:
  - Header: magic, version, seed, player position/rotation.
  - Body: list of chunk diffs (only chunks with edits are stored; the
    rest regenerate from seed). Each diff is `(cx, cz, [(lx, ly, lz,
    block)])`.
  - On web, save via IndexedDB + `FS.syncfs` or download-as-file; on
    native, straight fopen/fwrite.
- **Skybox.** Port `src/shaders/skybox` to sokol_gfx. Optional stars if
  cheap.
- **Sun + ambient lighting.** Directional light in shader with a
  dot(normal, sun) term and a flat ambient. No shadow maps.
- **Basic audio.** `sokol_audio` + a streaming OGG decoder (dr_libs) for
  background music, short WAV SFX for break/place. Match
  `public/sfx/*`.
- **Debug overlay (F3).** Port `src/engine/Profiler.ts` minimally: FPS,
  frame time, chunks drawn, chunks in memory, player position.
- **Performance baseline.** Add `emscripten_performance_now()`-based
  timing around mesher + draw calls. Freeze a perf budget: 60 FPS
  sustained, 95th percentile frame < 20 ms.

### Out of scope for Tier 2

- Inventory model with stacks, crafting, tech blocks.
- Dynamic shadows.
- Water simulation.
- Menus (pause menu OK if dead simple; no settings panel).

### Acceptance criteria

- [ ] Load a world, make edits, save, reload the page, edits persist.
- [ ] Toggle fly mode with F, move freely in 3D.
- [ ] Skybox and sun visible.
- [ ] One music track loops, break/place SFX play.
- [ ] F3 overlay shows non-garbage numbers.
- [ ] WASM size < 2 MB compressed.

### Estimated effort

~2–3 weeks on top of Tier 1.

---

## 6. Tier 3 — Planet / Spherical World

This is where the port leaves the "simple Minecraft" lane and catches up
with `mainPlanet.ts`. It is the largest and riskiest tier. Budget
accordingly.

### Scope

- **Goldberg polyhedron tile grid.** Port `src/planet/GoldbergPolyhedron.ts`
  and `src/planet/HexBlock.ts`. Hex + pentagon tiles on a sphere with
  per-tile voxel columns.
- **Planet struct.** Port `src/planet/Planet.ts` minus UI / crafting /
  rocket hooks. One `planet_t` owns tile grid + chunk data + LOD state.
- **LOD pipeline.** Port `src/workers/lodGeometryWorker.ts`. Critical
  for performance. Distance-based LOD using icosahedron vertex
  partitions, matching the current design.
- **Detailed chunk mesher.** Port `src/workers/geometryWorker.ts`. Runs
  off main thread via `emscripten_wasm_workers`.
- **Atmosphere shader.** Port `src/shaders/atmosphere`. Mostly GLSL copy
  with sokol-shdc tweaks.
- **Cloud shader.** Port `src/shaders/clouds`.
- **Water shader.** Port `src/shaders/water`, including the depth
  pre-pass and underwater fog from `GameEngine.animate`.
- **Starfield skybox.** Port `src/shaders/skybox`.
- **Multi-planet scene graph.** Port `src/config/SolarSystemConfig.ts`
  minimally — at least Earth + Moon. No flight between them yet.
- **Per-planet sun direction + lighting.** Match current TS behavior.

### Threading

- Chunk generation → worker thread (wasm worker).
- Mesh building → worker thread, transfers back packed vertex buffer.
- Main thread only uploads GPU buffers and issues draws.
- Chunk dirtying goes through an MPSC queue.

### Shader port strategy

- `src/shaders/**/*.vert,.frag` are already GLSL 3.00 ES-ish.
- Use **sokol-shdc** to translate to the sokol portable form and emit a
  `.h` with embedded source + pipeline layout.
- Uniforms go into a single `uniform_block` struct shared between C and
  shader — sokol-shdc generates that for us.
- Allocate one hour per shader for minor syntax fixes; budget more for
  water + atmosphere (which use depth textures and multiple render
  targets).

### Out of scope for Tier 3

- Rockets / flight / orbital mechanics.
- Trees and flora (port in Tier 4).
- Crafting, inventory, tech blocks.
- Day/night cycle (position of sun is static per TS behavior).

### Acceptance criteria

- [ ] Spawn on Earth, walk around, see the horizon curve.
- [ ] LOD transitions are smooth, no visible seams at chunk borders.
- [ ] Atmosphere + water shaders render correctly in WebGL2.
- [ ] Chunk meshing off-main-thread, no hitches > 16 ms.
- [ ] 60 FPS sustained with 4-tile detailed radius.
- [ ] Moon visible in the sky from Earth surface.

### Estimated effort

~6–10 weeks. The existing TS is the reference implementation, so a lot
of the design work is already done — the bulk of effort is mechanical
porting + shader wrangling + getting WASM workers to behave.

---

## 7. Tier 4 — Gameplay Systems

Feature parity with current TS. Port each subsystem as an independent
milestone with its own acceptance criteria; do not treat Tier 4 as a
single sprint.

### Sub-milestones (can ship in any order once Tier 3 is stable)

#### 4.1 Inventory + stacks

- Port `src/player/Inventory.ts`.
- Data-only in `core/` (the server owns the truth); hotbar rendering in
  `client/`.
- Wire format for inventory sync defined up front even if MP isn't
  live.

#### 4.2 Crafting + tech tree

- Port `src/player/CraftingSystem.ts` (~1.1k LOC — largest single file).
- Recipes as static data tables in C, loaded from a JSON or
  hand-written `.h`.
- Each tech workbench UI (Printer3D, ElectricFurnace, ElectronicsWorkbench,
  HydroGenerator, SteamEngine, Computer, CopperPipe, StorageChest,
  LaunchPad) is a separate sub-task. **These are the bulk of the TS
  LOC.** Port them one at a time with a standard "workbench UI" C
  module they all reuse.

#### 4.3 Trees + flora

- Port `src/planet/Tree.ts` + `MushroomTreeManager`.
- Deterministic scatter in `core/chunkgen.c` so server + client agree.

#### 4.4 Rockets + flight

- Port `src/rocket/*` (~4k LOC). Includes flight physics, camera,
  UI, exhaust particles.
- Interplanetary jumps — Earth ↔ Moon ↔ Sequoia.
- Exhaust particles as a sokol_gfx instanced pipeline.
- **Major netcode question:** authority over the rocket when a player
  is flying it. See §8.

#### 4.5 Light sources / torches

- Port `src/planet/Torch.ts` + indirect lighting.
- The current "lazy calculated indirect lighting" is single-player
  only. For MP, a more explicit light-propagation pass will be needed.

#### 4.6 Menus

- Proper pause menu, settings, video options, keybinds.
- Use sokol_imgui for dev / debug menus; consider a custom
  lightweight UI for production because imgui ships a lot of code.

#### 4.7 Audio systems

- Port `src/engine/AudioManager.ts` + `MusicManager.ts`.
- Streaming OGG playback via dr_libs; positional 3D audio optional.

### Acceptance criteria (whole tier)

- [ ] Feature parity with current `mainPlanet.ts` build in Chrome +
      Firefox.
- [ ] WASM size < 5 MB compressed.
- [ ] 60 FPS sustained on reference hardware.
- [ ] All existing save files from Tier 2 auto-migrate (or a
      one-click converter is shipped).

### Estimated effort

~3–5 months of sustained work after Tier 3. Can parallelize across
multiple devs since sub-milestones are independent.

---

## 8. Multiplayer Architecture

Multiplayer does not get its own "Tier 5" in the sense of a single sprint
— the **architecture is threaded through every tier** from Tier 1 onward.
What we call Tier 5 is the point at which we turn on the wire and a second
player connects. If we've built the `core / client / server` split
correctly, Tier 5 is mostly plumbing.

### 8.1 Authority model

- **Authoritative server.** Server is the source of truth for the world,
  player positions, inventory, crafting results, and any state change a
  cheater might care about.
- **Client-side prediction** for the local player's movement (only) to
  hide RTT. Server reconciles with periodic snapshots; client replays
  unacked inputs on mismatch.
- **No prediction for block edits.** Client sends `PlaceBlock` /
  `BreakBlock` commands and shows the result only when the server
  confirms. For a creative/co-op game, 50–100 ms of latency on placement
  is fine and it eliminates a whole class of rollback bugs.
- **Lockstep-style simulation is explicitly rejected.** The server sim
  runs at a fixed tick; clients are free-running renderers that
  interpolate remote entities.

### 8.2 Code sharing

The `core/` directory is the whole point. It is compiled into:

- The **WASM client** (with `-DCLIENT_BUILD`).
- The **native client** (dev/testing).
- The **headless server** (with `-DSERVER_BUILD`).

Rules:

- `core/` must not include any sokol header.
- `core/` must not allocate via `malloc` in hot paths — use an arena
  passed in by the caller. Server and client can own separate arenas.
- `core/` must be deterministic: identical inputs produce identical
  outputs on both builds. This means:
  - Use fixed-size integer math for anything that affects game state.
  - Avoid `float` non-determinism across compilers by compiling
    `core/` with `-ffp-contract=off -fno-fast-math`.
  - Seed all RNGs explicitly; no time-based or pointer-based seeds.
  - Chunk generation is a pure function of `(seed, cx, cz)`.

### 8.3 Transport

- **Client → Server:** WebSocket over TLS. Trivial to run in browsers,
  works on itch.io, fine for 20 Hz tick rate with small command
  messages.
- **Server implementation:** native C, libdatachannel or uWebSockets
  (both have clean C APIs). Single-threaded event loop with a fixed
  tick.
- **Later (Tier 6+):** Consider WebRTC DataChannel for unreliable-ordered
  state snapshots to shave latency. WebSocket remains for reliable
  commands. Don't build this until it's measurably needed.

### 8.4 Protocol

Keep it **boring, hand-rolled, versioned, little-endian, length-prefixed**.
Single source of truth in `core/proto.h`:

```c
typedef enum {
    MSG_HELLO          = 1,  // C->S: client version, auth token
    MSG_WELCOME        = 2,  // S->C: player_id, world seed, spawn
    MSG_INPUT          = 3,  // C->S: per-tick input bitfield + look
    MSG_PLAYER_CMD     = 4,  // C->S: place/break/craft/interact
    MSG_SNAPSHOT       = 10, // S->C: entity states for visible radius
    MSG_CHUNK_DIFF     = 11, // S->C: changed blocks in a chunk
    MSG_CHAT           = 20,
    // ...
} msg_kind_t;

typedef struct {
    uint16_t kind;
    uint16_t version;   // per-kind version, never break wire
    uint32_t length;    // payload bytes follow
} msg_hdr_t;
```

Every struct on the wire has a `version` field. Breaking a struct bumps
the version and the server supports the last N versions.

FlatBuffers / Protobuf are tempting but add build complexity and WASM
size. Re-evaluate only if hand-rolled starts bleeding.

### 8.5 Tick model

- Server: **20 Hz fixed tick** (50 ms).
- Client: renders at display rate; collects inputs each frame and sends
  a compressed input packet at 30 Hz.
- Server receives inputs, advances sim, sends snapshots at 20 Hz.
- Snapshots contain delta-compressed entity state for the client's
  **interest area** (see 8.6).
- Client interpolates remote entities over a 100 ms buffer
  (2 snapshots).

### 8.6 Interest management

A voxel planet has orders of magnitude more state than a typical FPS
lobby — we cannot broadcast everything.

- Each connected client has an **interest radius** (in chunks or tiles).
- Server maintains per-client "visible set" and diffs it each tick.
- Chunk data streams lazily:
  - Client arrives, says "I'm at (x, y, z)."
  - Server sends chunk **diffs** (not full chunks) — client regenerates
    base chunk locally from the shared seed, then applies diffs.
  - This is a huge bandwidth win and only possible because world gen is
    deterministic (§8.2).
- Entity updates (other players, rockets, mobs later) are sent only if
  within interest radius.

### 8.7 Block edits (most common mutation)

1. Client raycasts locally, sends `MSG_PLAYER_CMD` with
   `{tick, op, x, y, z, block}`.
2. Server validates: is player in range? Is target block breakable?
   Does player have the item (Tier 4+)?
3. Server applies mutation via `world_apply_cmd()` in `core/`.
4. Server broadcasts `MSG_CHUNK_DIFF` to all clients whose interest set
   includes that chunk.
5. Each client applies the diff and remeshes.
6. Mesher already runs on a worker thread, so this does not hitch the
   frame.

### 8.8 Rocket / flight authority

The trickiest case. When a player flies a rocket between planets, they
are effectively "driving" a large kinematic entity.

- Option A (recommended): server simulates the rocket authoritatively,
  client predicts and reconciles like it does for player movement.
  Higher complexity but keeps cheating out.
- Option B: temporarily hand authority to the pilot client while in
  flight; server validates the final landing position. Simpler, trusts
  the client.
- Decision deferred until Tier 5 implementation begins. Design the
  rocket code in Tier 4 with enough indirection that either model
  works.

### 8.9 Persistence

- Server owns the canonical save file. Same binary format as Tier 2
  single-player.
- Periodic autosave (e.g., every 5 min) + on graceful shutdown.
- Client save files disappear in MP — the server's world is the only
  world.
- SP mode in the WASM client becomes "run the server loop in-process"
  — literally link `server/` into the client WASM and skip the socket.
  This keeps one code path for gameplay logic.

### 8.10 What each tier must do to stay MP-ready

| Tier | MP requirement |
|---|---|
| Tier 0 | Nothing specific. |
| Tier 1 | `core/` compiles standalone. All world mutations go through `world_cmd_t`. World gen is deterministic + seeded. |
| Tier 2 | Save file format is the same on client and server. Audio + hotbar are client-only (never in `core/`). |
| Tier 3 | Chunk meshing is client-only. Planet state + LOD decisions are deterministic. WASM worker messaging uses the same `msg_hdr_t` shape as the wire protocol — treat local workers as "loopback clients" to exercise the serialization path. |
| Tier 4 | Inventory + crafting state lives in `core/`. Workbench interactions go through `PLAYER_CMD`. No "UI writes directly to world" shortcuts. |
| Tier 5 | Turn on the WebSocket. Add interest management. Ship. |

If Tiers 1–4 are disciplined, **Tier 5 is approximately one month of
work**, not a rewrite.

---

## 9. Risks, Open Questions, Milestones

### 9.1 Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| COOP/COEP headers required for WASM threads block itch.io hosting | High | Blocks Tier 3 meshing off main thread | Have a single-threaded fallback path; test itch.io early in Tier 2 |
| Shader port effort underestimated (water, atmosphere) | Medium | Weeks of Tier 3 slip | Budget double time for water + atmosphere; keep a "simple shader" fallback |
| Float non-determinism across clang/emcc | Medium | Desync in MP | Compile `core/` with strict FP flags; integer-fixed-point for positions if needed |
| WebGPU becomes mandatory before we're ready | Low | Rework renderer backend | sokol_gfx already abstracts; revisit in Tier 3 |
| WASM size bloats past 5 MB | Medium | Load time regression | Strict diet: no C++, no imgui in shipping build, `-Oz` + Brotli |
| Save format churn between tiers | High | Painful migrations | Version every save + wire struct from day 1; write an explicit migration function per bump |
| Mesher performance regression vs TS | Medium | Playability | Bench Tier 1 mesher against TS baseline; keep perf regressions in CI |
| "Just port it" scope creep | High | Never ships | Enforce tier gates — do not start Tier N+1 until N runs on web |
| Browser audio policies break `sokol_audio` autoplay | Low | SFX silent until click | Kick audio on first input event |
| Crafting/tech UI volume (largest TS surface) | High | Tier 4 slip | Build a shared "workbench UI" widget and port one workbench per week |

### 9.2 Open questions for the user

- **Hosting target.** itch.io (no COOP/COEP) vs custom domain (full
  headers). Affects Tier 3 threading strategy. Currently the game ships
  at `heavyphoton.com/tenebris/`, so full headers should be fine — **please
  confirm.**
- **Multiplayer player count.** Target 4–8 (co-op with friends) or
  16–64 (small public servers)? Affects server arch and interest
  management design.
- **Persistent worlds vs lobbies.** Is a MP world long-lived (like a
  dedicated Minecraft server) or ephemeral per session? Affects
  persistence complexity.
- **Art direction retention.** Any shaders or look-and-feel elements we
  must *not* regress during port? (Water and atmosphere are the
  obvious sacred cows.)
- **WebGPU appetite.** Willing to bet on WebGPU for Tier 3, or stay on
  WebGL2 until it's frictionless?
- **Native client a shipping target?** Or strictly web-only, with
  native builds for dev + dedicated server only?

### 9.3 Milestone table (rough)

Assumes one experienced C/graphics dev full-time. Scale elapsed time
accordingly for part-time or team-of-one-learning-sokol.

| Milestone | Tier | Est. calendar time | Cumulative |
|---|---|---|---|
| Hello triangle in browser | T0 | 1 week | 1 wk |
| Creative MVP: walk, break, place | T1 | 4 weeks | 5 wk |
| Polish: hotbar, save/load, audio | T2 | 3 weeks | 8 wk |
| Planet + LOD + shaders | T3 | 8 weeks | 16 wk |
| Trees + flora + torches | T4.3/4.5 | 2 weeks | 18 wk |
| Inventory + crafting core | T4.1/4.2 | 4 weeks | 22 wk |
| Tech workbenches (one per week) | T4.2 | 8 weeks | 30 wk |
| Rockets + flight | T4.4 | 4 weeks | 34 wk |
| Menus + audio polish | T4.6/4.7 | 2 weeks | 36 wk |
| MP Tier 5: wire + interest mgmt | T5 | 4 weeks | 40 wk |

~9–10 months calendar for feature parity + MP. This is aggressive;
realistic padding → 12–14 months.

### 9.4 Kill criteria

If any of the following are true at Tier 1 review, stop and
reassess:

- WASM size exceeds 2 MB for Tier 1 scope.
- Main-thread frame time exceeds 10 ms on reference hardware.
- `core/` cannot be compiled without sokol symbols.
- Determinism check (server-generated chunk == client-generated
  chunk) fails in a browser.

Any of these means the architecture is off and the later tiers will
compound the problem. Better to fix at Tier 1 than at Tier 5.

---

_Document owner: TBD. Revisit at the end of each tier; update the
milestone table with actuals._

