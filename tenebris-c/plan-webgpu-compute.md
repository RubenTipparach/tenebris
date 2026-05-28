# WebGPU + compute-shader migration

Status: **Stage 0 in progress** (flag-gated build wiring).

## Why

The voxel mesher and the lighting BFS run on the CPU, single-threaded
(WASM has no usable threads on GitHub Pages - no `SharedArrayBuffer`
without COOP/COEP headers, which Pages can't set). The biggest remaining
performance ceiling is to move meshing / lighting / water onto the GPU as
**compute passes**.

WebGL2 has **no compute shaders**, so this requires the **WebGPU**
backend. Unlike threads, WebGPU needs no special response headers and
runs fine on GitHub Pages. Sokol already ships a WebGPU backend
(`SOKOL_WGPU`) and the compute API (`sg_begin_pass(.compute=true)`,
`sg_dispatch`, `.usage.storage_buffer`), so no dependency upgrade is
needed.

## Feasibility (verified statically)

- **Shaders -> WGSL**: all 10 `src/shaders/*.glsl` cross-compile cleanly
  with the vendored `sokol-shdc --slang wgsl`.
- **C render code is backend-agnostic**: it goes through
  `sglue_environment()` / `sglue_swapchain()` and selects shader variants
  via `<shader>_shader_desc(sg_query_backend())`. No GL-specific branching
  to rewrite for parity.
- **Sokol compute + storage buffers + WGPU**: present in the vendored
  `sokol_gfx.h`. `sokol_app.h` documents the required Emscripten flag as
  `--use-port=emdawnwebgpu`.

## Hard constraint

The dev container has **no `emcc`, no browser, no GPU**. WGSL generation,
C-compile, and CMake wiring can be checked statically; **render parity
and the Emscripten WebGPU port flag must be validated in-browser.**
WebGPU's stricter validation may also surface latent issues WebGL2
tolerated. Therefore the backend is **flag-gated and default-off** - the
shipping WebGL2 build (and CI) is unchanged - and compute work only
begins once Stage 0 renders correctly in a real browser.

## Stages

### Stage 0 - WebGPU at render parity (build config only)  [this PR]

No rendering-logic changes; same CPU meshing/lighting, drawn through
WebGPU.

- CMake `option(TENEBRIS_WEBGPU)` (default OFF).
- `cmake/sokol-shdc.cmake`: slang `wgsl` when `TENEBRIS_WEBGPU` (else
  `glsl300es`).
- `CMakeLists.txt` Emscripten block: define `SOKOL_WGPU` instead of
  `SOKOL_GLES3`; graphics flags become `--use-port=emdawnwebgpu`
  (compile + link) instead of `-sUSE_WEBGL2=1 -sFULL_ES3=1`. Everything
  else (memory growth, stack, exported methods, websocket, shell,
  preload) is unchanged.

**Build / test:**
```
cmake -B build-wgpu -DTENEBRIS_WEBGPU=ON <emscripten toolchain args>
cmake --build build-wgpu
```
Open in a WebGPU-capable browser (Chrome/Edge, Safari 18+, recent
Firefox). Validate: terrain + water + atmosphere + HUD render identically
to the WebGL2 build; block edits still work; no console validation errors.

**Likely iteration points (in-browser):** the exact `emdawnwebgpu` port
invocation for the CI Emscripten version; any WGSL uniform-layout / bind
mismatch sokol-shdc didn't paper over; `sokol_gl` (chat / mobile UI) and
`sokol_debugtext` pipeline formats under WGPU.

### Stage 1 - Voxel + light state in GPU storage buffers

Mirror the per-tile voxel columns (and the light nibble grid) into
`storage_buffer` resources; CPU stays the source of truth and writes
through on edit (same same-frame-persist rule applies to the CPU copy).
Prerequisite for any compute pass to read voxel data.

### Stage 2 - Compute meshing

A compute pass reads a chunk's voxel storage buffer and emits vertices /
indices into storage buffers bound as vertex/index buffers (indirect
draw for the count). Removes the per-edit CPU mesh build **and** the
buffer upload. Pairs naturally with the per-chunk tile lists from the
remesh PR.

### Stage 3 - Compute lighting (and/or water)

Port the lighting flood-fill to a GPU compute pass (iterative /
jump-flood), killing the relight frame-spike entirely. Water-flow
automaton is a later candidate.

## Deferred decision

Once Stage 0 is validated in-browser, decide the web default:

- **WebGPU-only web build** - single path, lets the CPU mesher/lighting
  eventually retire in favour of compute. Cost: drops browsers without
  WebGPU.
- **Dual backend** - WebGL2 stays default, WebGPU behind the flag. Max
  reach, but the compute win only reaches WebGPU users and both a CPU and
  a GPU mesher/lighting path must be maintained.

This choice is forced by Stage 2 (compute can't run on the WebGL2 path),
so it must be settled before Stage 2 begins.
