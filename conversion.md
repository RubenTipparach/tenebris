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

## 4. Tier 1 — Creative Mode MVP

This is the first tier that looks like a game. Port of `src/main.ts` +
`src/world/*` + `src/player/Player.ts` + `src/player/Physics.ts` +
`src/player/BlockInteraction.ts`. **Everything else in `src/` is out of
scope for this tier.** No planets, no rockets, no crafting, no inventory
UI, no menus, no music.

### Scope

- Flat infinite-ish voxel world. 16 × 64 × 16 chunks (match TS).
- 4 block types: AIR, STONE, DIRT, GRASS (match `src/world/Block.ts`).
- Single texture atlas (3 textures packed: wall, floor, ceiling).
- Deterministic terrain gen from seeded hash noise (port
  `Chunk.getTerrainHeight` exactly — it needs to match on server too).
- FPS controller: WASD, mouse look, jump, sprint, gravity.
- AABB player-vs-world collision.
- DDA voxel raycast for block targeting.
- Left-click breaks, right-click places the currently selected block
  (hotkey 1–4 cycles block type).
- Wireframe outline on targeted block.
- Skybox (solid color or gradient — no stars yet).
- One sun (directional light) + ambient — baked in the shader, no
  dynamic shadows.
- Chunk mesher runs **on main thread** in Tier 1. Worker offload is Tier 3.
- Greedy meshing is out of scope; use naive face-culling like the TS
  `Chunk.buildMesh`. Optimization comes later.

### TS → C translation map

| TS file | C destination | Notes |
|---|---|---|
| `src/world/Block.ts` | `core/blocks.c/h` | Enum + `is_solid()` + texture IDs. No materials — atlas UVs baked into mesher. |
| `src/world/Chunk.ts` | `core/world.c/h` + `client/mesher.c` | Split storage (core) from meshing (client). |
| `src/world/World.ts` | `core/world.c/h` | Hashmap of `(cx,cz) → chunk*`. `world_raycast()` in core. |
| `src/engine/GameEngine.ts` | `client/main_web.c` + `client/renderer.c` | sokol_app lifecycle. Kill most of the TS content — starfield, water depth, underwater fog all deferred. |
| `src/engine/InputManager.ts` | `client/input.c` | sokol_app event → `InputState` struct. Pointer-lock uses `sapp_lock_mouse`. |
| `src/player/Player.ts` | `client/player_ctrl.c` (movement) + `core/physics.c` (AABB) | Client owns camera; physics tick is in core so the server can run the same function. |
| `src/player/Physics.ts` | `core/physics.c/h` | `physics_resolve_aabb()` + `physics_check_ground()`. Shared. |
| `src/player/BlockInteraction.ts` | `client/interact.c` | Raycast + place/break. In SP mode mutates world directly; in MP it sends a `PlaceBlock` / `BreakBlock` command over the wire (Tier 5). |
| `src/main.ts` | `client/main_web.c` | Boot sequence. |

### Rendering plan

- One mesh per chunk, one draw call per chunk.
- Vertex format: `vec3 pos; vec3 normal; vec2 uv; uint8 block_type;`
  packed into ~24 bytes.
- Single pipeline, single shader (`shaders/voxel.glsl`), single texture
  atlas binding. No per-material branching — block type selects UV
  offset into the atlas in the vertex shader.
- Dirty chunks are remeshed on the main thread at end of frame, capped
  at N per frame (e.g. 2) to avoid hitches.
- View-frustum cull chunks by AABB before drawing.

### Multiplayer readiness in Tier 1 (IMPORTANT)

Even though Tier 1 ships single-player, every new file **must respect
the `core / client / server` split from day one**. Concretely:

- `core/world.c` never calls into sokol, never touches the GPU, never
  calls `printf` with anything other than `SOKOL_LOG`.
- Player block-edit actions go through a **command struct**, even in SP:
  ```c
  typedef struct {
      uint32_t tick;
      uint8_t  kind;   // BREAK_BLOCK / PLACE_BLOCK
      int32_t  x, y, z;
      uint8_t  block;
  } world_cmd_t;
  void world_apply_cmd(world_t* w, const world_cmd_t* c);
  ```
  In Tier 1 the client calls `world_apply_cmd` locally. In Tier 5 the
  client sends it over WebSocket and the server calls it. **No gameplay
  logic lives in the renderer path.**
- Chunk generation takes `(cx, cz, seed)` and is pure. Given the same
  seed, server and client produce the same chunk byte-for-byte.

This is the cheapest time to enforce the split. Getting it right in
Tier 1 saves a massive rewrite at Tier 5.

### Build pipeline + UAT landing page

The WASM port must ship alongside the existing TS/Three.js build so we
can UAT parity in production. **We do not replace the JS build during
Tier 1.** Both builds coexist; a landing page lets testers pick which
one they want to launch.

#### Changes to the existing build

- **Keep `npm run build`** (Vite + TS) exactly as-is. It continues to
  emit the existing game into `dist/` under a new subpath.
- **Move the current JS build output** from `dist/` root to
  `dist/js/`. Update `base` in `vite.config.ts` from `/tenebris/` to
  `/tenebris/js/` so asset URLs resolve inside the subpath.
- **Add `npm run build:wasm`** that invokes
  `cmake --preset=web --build` and copies `tenebris.html +
  tenebris.wasm + tenebris.js + assets` into `dist/wasm/`.
- **Add `npm run build:all`** that runs both in sequence, then copies
  the new landing-page `index.html` (see below) into `dist/`.
- **Comment out itch deploy** in `itch-build.sh` and `itch-build.bat`
  — leave the files in place with a `# DISABLED during WASM port. Re-enable
  when WASM reaches Tier 2+.` header. Do not delete; we want to re-enable
  cleanly once WASM is itch-ready.
  - If `build.sh build` currently auto-deploys to `heavy-photon-site`,
    that behavior stays — but it now copies `dist/` which contains the
    landing page + both builds.

#### GitHub Pages landing page (the "fork")

A new top-level `dist/index.html` served at `heavyphoton.com/tenebris/`.
Minimal static HTML, no framework. Two big buttons / cards:

- **▶ Play (Stable)** → `./js/index.html` — the TypeScript build.
- **🧪 Play (WASM Preview)** → `./wasm/index.html` — the C/Sokol build.

UX requirements:

- Warn on the WASM card that it is a work-in-progress UAT preview and
  feature-incomplete (list Tier 1 scope bullets: creative mode only,
  flat world, no planets, no crafting, etc.).
- Remember last choice in `localStorage` and auto-redirect after a
  3-second countdown on repeat visits (with a "cancel" link).
- Query-string override: `?build=js` or `?build=wasm` skips the chooser
  entirely — gives UAT testers a single link they can share for either
  build.
- Share a common header so both builds render inside the same visual
  shell (font, favicon, analytics snippet if we keep it).

#### UAT workflow

- A test matrix lives in `docs/uat-checklist.md` (new file,
  created alongside Tier 1 scope). Each row is a creative-mode
  behavior (move, jump, break block, place block, chunk streaming,
  save/load once Tier 2 is in, etc.). Each column is "JS" / "WASM" —
  testers tick both.
- A divergence in any row blocks the tier gate. Either the WASM build
  fixes the behavior or the row is explicitly excluded from Tier 1
  scope (with justification).
- Both builds share the same seed and chunk-gen function in their
  respective languages during Tier 1. The long-term goal is a single
  deterministic chunk-gen in `core/` that the JS build links against
  via a small WASM shim — **but that is a Tier 2 nicety, not a Tier 1
  requirement.** In Tier 1 it's acceptable to eyeball parity rather
  than byte-match it.

#### CI changes

- `.github/workflows/static.yml` extended:
  - Setup Emscripten (`mymindstorm/setup-emsdk` action) in addition to
    Node.
  - Run `npm run build:all` instead of `npm run build`.
  - Fail the job if either `dist/js/index.html` or
    `dist/wasm/index.html` is missing.
- Deploy step unchanged — still uploads `dist/` to GitHub Pages.

### Acceptance criteria

- [ ] Walk around a 4-chunk-radius flat voxel world at 60 FPS on a
      mid-range laptop in Chrome.
- [ ] Break and place blocks with immediate visual feedback.
- [ ] Hotkeys 1–4 select block type.
- [ ] Jumping + gravity feels right (port constants from
      `src/player/Player.ts`).
- [ ] No hitches > 16 ms from chunk generation or meshing.
- [ ] WASM size < 1 MB compressed.
- [ ] `core/` compiles as a standalone static lib with **zero** sokol
      or emcc symbols referenced.
- [ ] `npm run build:all` produces `dist/index.html`, `dist/js/**`,
      and `dist/wasm/**` with zero errors.
- [ ] Visiting `heavyphoton.com/tenebris/` shows the chooser; both
      buttons route to working builds.
- [ ] `?build=wasm` and `?build=js` query overrides work.
- [ ] Itch deploy script is commented out and documented as such.
- [ ] `docs/uat-checklist.md` exists with at least the Tier 1 row set
      and is linked from the chooser page.

### Estimated effort

~3–5 weeks of focused work. Add ~3 days for the build-pipeline split
and landing page (mostly CI + path plumbing, not new code).

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

