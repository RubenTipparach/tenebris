# 64-bit Solar System + Floating Origin + Logarithmic Z-Depth

Current state: positions are stored as `dvec3_t` (double precision) in
core, but every render path downcasts to `float` against an implicit
world origin of (0, 0, 0). That works while the player stays near
Tenebris (which sits at origin), but breaks the moment we add real
distances:

* Sequoia is at world (-850, 120, -700). When the player teleports
  there, `player.position` is downcast to a `float vec3` ~1100 m
  from origin. Float precision at 1000 m is ~1.2 × 10⁻⁴ m — tile seams
  start to wobble visibly.
* The asteroid belt is at ~1500 m. Same issue, slightly worse.
* Future inter-planet space-flight will routinely span 10 km+ and
  needs to feel smooth — single-precision math at 10 km is ~10 mm
  precision, which makes physics integration jitter.

The fix is two complementary techniques:

1. **Floating origin** — every frame, pick an "active origin" in
   `dvec3_t` world coordinates. All single-precision math (view matrix,
   model matrices, shader world positions) happens in coordinates
   *relative* to that origin, where values stay small and float
   precision stays sub-millimetre.

2. **Logarithmic depth buffer** — replace the linear-z mapping in
   the projection matrix with a log-z mapping inside the vertex
   shader, so a 0.05 m near plane and a 1 × 10⁷ m far plane coexist
   without z-fighting. Lets us render the sun (at 8 km) and a hand
   reaching toward the camera (at 0.5 m) in the same draw.

---

## Part 1 — Floating origin

### Origin selection

The active origin = the centre of the body the player is currently
anchored to (`player.body->pos_*`). It changes only on teleport, not
per-frame, so it's stable.

For free-flight between planets (a future ship mode) we'd switch the
origin when the player crosses the midpoint between two bodies, with
a small hysteresis band so it doesn't oscillate. Out of scope for
the first cut — start with body-anchored origin.

### Data flow

```
                world space (dvec3_t)               local space (float vec3_t)
   ┌────────────────┐                          ┌──────────────────────┐
   │ player.position│ ─── − origin ──────────► │ camera_local         │ ── view
   │ body[i].pos_*  │ ─── − origin ──────────► │ body_local[i]        │ ── model translate
   │ env.sun_pos    │ ─── − origin ──────────► │ sun_local            │ ── sun draw + lighting
   └────────────────┘                          └──────────────────────┘
                                                         │
                                                         ▼
                                            shader uniforms (all already
                                            in floating-origin space)
```

Mesh data is unchanged — terrain meshes are already in body-local
coords. The only thing the renderer does to place a body in world
space is the model translate, and that translate becomes
`body_world − origin`.

### Concrete changes

* `core/planet.h`: nothing — `body_config_t` already stores
  `pos_x/y/z` as `double`.
* `client/renderer.h`:
  * Change `render_env_t.sun_pos` from `vec3_t` to `dvec3_t sun_pos_world`.
  * Add `dvec3_t origin` parameter to `renderer_begin_frame`.
  * Drop the `vec3_t camera_world` parameters from `renderer_draw_world`,
    `renderer_draw_moons`, `renderer_draw_atmospheres` — instead, the
    renderer recovers `camera_local` from `R.origin` + the active
    player position passed into `begin_frame` (or a separate
    `renderer_set_camera` call).
* `client/renderer.c`:
  * Store `R.origin` (`dvec3_t`) per-frame.
  * Change `R.moons[i].position` from `vec3_t` to `dvec3_t world_pos`
    so subtraction stays in double precision.
  * Per-draw: `vec3_t local = dvec3_to_vec3f(dvec3_sub(world_pos, R.origin))`.
  * Sun draw: `vec3_t sun_local = dvec3_to_vec3f(dvec3_sub(env.sun_pos_world, origin))`.
  * Atmosphere draw: pass `planet_center_local` instead of the world
    centre to the shader uniform; viewer_pos is also already in local
    space (`= camera_local`).
* `client/player_ctrl.h/c`:
  * `player_view(p, origin)` — builds the look-at matrix with eye =
    `dvec3_to_vec3f(p->position − origin)`. Existing call sites pass
    the active body's centre as origin.
* `client/main_web.c`:
  * Compute `dvec3_t origin = dvec3_make(G.body->pos_x, .pos_y, .pos_z)`
    each frame (or each teleport — it only changes then).
  * Pass to `player_view` and `renderer_begin_frame`.
  * No more `cam_world` — renderer derives it.

### Edge cases

* **Active world meshes**: terrain mesh vertices are body-local already,
  so for the active world the model transform is `mat4_translate(0,0,0)` —
  no change to `renderer_draw_world` other than keeping the identity
  matrix it already uses.
* **Skybox**: stays in pure rotation space (already fixed in
  commit 8931d0b). Origin doesn't affect it.
* **Frustum culling**: `extract_frustum` operates on the VP matrix.
  As long as the VP is built in floating-origin space, plane equations
  are in local space too, and `sphere_visible(plane, body_local, r)`
  works unchanged.
* **Physics**: `player_update` already operates on `dvec3_t` positions
  and never downcasts. No change needed.

---

## Part 2 — Logarithmic Z-depth

Standard formulation (Brano Kemen / Outerra). In every vertex shader:

```glsl
uniform float u_log_z_coef;   // = 2.0 / log2(zfar + 1.0), set once per frame

out float v_log_z;            // for optional fragment-depth write

void main() {
    gl_Position = u_mvp * vec4(a_pos, 1.0);
    v_log_z = 1.0 + gl_Position.w;
    gl_Position.z = (log2(max(1e-6, v_log_z)) * u_log_z_coef - 1.0) * gl_Position.w;
}
```

Optionally in fragment shader (only when triangles span large depth
ranges — flat skybox / sun sphere / atmosphere shell):

```glsl
in float v_log_z;
void main() {
    // ...
    gl_FragDepth = log2(v_log_z) * (u_log_z_coef * 0.5);
}
```

The fragment-depth write costs us early-z, so we only enable it on
shaders that need it. Voxel terrain triangles are tiny (≤ 3 m) and
don't need it; the sun sphere (480 m diameter) and atmosphere shell
(~120 m thick) do.

### Files to change

* All vertex shaders in `client/renderer.c`:
  `VS_HEX`, `VS_WATER`, `VS_DISTANT`, `VS_SKY` (probably skip — full-
  screen tri sets z=1 anyway), `VS_SUN`, `VS_ATMOSPHERE`. Add
  `u_log_z_coef` uniform + the three-line log-z block.
* Fragment shaders that need accurate per-pixel depth:
  `FS_SUN`, `FS_ATMOSPHERE`. Add `v_log_z` varying + `gl_FragDepth`
  write.
* Each shader's `sg_shader_desc.uniform_blocks[0]`: add
  `u_log_z_coef` (FLOAT, 1 entry, 4 bytes — but std140 padding makes
  it 16). Bump `size` accordingly.
* `renderer_begin_frame`: compute `R.log_z_coef = 2.0 / log2(zfar + 1.0)`
  once per frame, plumb into every per-shader uniform-apply.
* `main_web.c`: bump `zfar` from `body->radius_m * 6` to something
  global like `1.0e7f` (10 km — covers the sun at 8 km plus margin).
  Drop `znear` to `0.05f` so first-person hands don't clip.

### Tradeoffs

* **Logical correctness**: depth precision is now well-distributed
  from 0.05 m to 10 km. Small objects up close and the sun in the
  distance both get adequate precision.
* **Fragment-depth write cost**: ~5 % perf hit on early-z-bound
  shaders. We only pay it on the sun + atmosphere passes, not on
  the 40k-tile terrain pass.
* **Reverse-Z would be better** (no `gl_FragDepth` needed for any
  shader, plus better precision), but it requires `EXT_clip_control`
  which isn't in WebGL2 — out of scope.

---

## Phasing

Recommended order:

1. **Floating origin first** (~half-day). Self-contained, doesn't
   interact with shaders. Verifies the dvec3 plumbing and reveals any
   accidental float-cast points.
2. **Log-z second** (~half-day). Independent change once floating
   origin is in. Lets us bump zfar and finally see all bodies in the
   solar system at distance.

Each is one commit. Validate by:

* Floating origin: teleport to Sequoia (-850, 120, -700) and visually
  check that tile seams stay tight at 1 m altitude.
* Log-z: stand on Tenebris and look at the sun (8 km away) — should
  render crisply alongside the terrain underfoot.

---

## Out of scope (later)

* Ship-flight floating origin handoff (mid-flight origin re-anchor).
* Multi-origin scene graph for systems with more than ~10 km extent.
* Reverse-Z when WebGPU lands and we can use clip-control.
* 64-bit positions in the network protocol — `proto.c` currently
  doesn't carry positions; add `dvec3_t` fields whenever we wire
  multiplayer state sync.
