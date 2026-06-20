# Celestial Motion: A Living Solar System

This document is the design + implementation plan for turning Tenebris's
currently-static solar system into a fully dynamic one: real day/night,
real orbits, real moon hierarchies, and the floating-origin work needed
to make all of it precise at any distance.

It is a companion to `plan.md` (which covers the prerequisite
floating-origin and log-z depth work) and extends it.

---

## Goals

1. **Bodies move.** Every planet orbits the sun. Every moon orbits its
   planet. Asteroids orbit the sun. Positions are derived from time, not
   stored as constants in `BODIES[]`.
2. **Time advances.** A single world clock drives planetary rotation
   (day/night), orbital position, and any future time-driven systems
   (weather, ship FTL cooldowns, server tick).
3. **Coordinates stay precise.** A true dynamic floating-origin system
   re-anchors as the player moves between bodies, so float-precision
   math never has to deal with the >1 km world-space numbers the orbits
   will routinely produce.
4. **Four new biomes ship alongside.** Desert, temperate grass, ocean,
   and mountainous planets — each is a real Tenebris-scale landable,
   each occupies an orbital slot.
5. **All knobs are YAML.** Day length, orbital radius, period, phase,
   inclination, axial tilt, hysteresis bands — every tunable goes into
   `assets/config/orbit.yaml` (or `terrain.yaml` for biome tuning) per
   the no-magic-numbers rule.

Non-goals for the first cut:
- N-body gravity. Orbits are kinematic (analytic Kepler), not simulated.
- Eclipse shadow rendering. Bonus if it falls out of the sun-direction
  recompute, but not required.
- Network sync of body positions. Time is deterministic from a shared
  epoch — clients re-derive positions locally. `proto.c` is untouched.
- Mid-orbit collisions or perturbations. Orbits are decorative-but-real.

---

## Current state (May 2026)

Captured from a code survey so this doc is self-contained:

- **20 bodies** enumerated in `body_id_t` (`src/core/planet.h:15-49`).
  Positions are stored as `double pos_x/y/z` in `body_config_t`
  (`planet.h:67`) and hardcoded as constants in `BODIES[]`
  (`src/core/planet.c:7+`).
- **Sun is a static direction vector.** `R.env.sun_dir = (0.5, 0.9, 0.3)`
  normalized, multiplied by `SUN_DIST = 8000.0f` to place it in world
  space (`src/client/main_web.c:937-942`). All shaders (`hex.glsl`,
  `water.glsl`, `atmosphere.glsl`, `distant.glsl`) receive a `u_sun_dir`
  uniform — direction only, never a position.
- **Player is anchored to one body** at a time via gravity selection
  (`planet_gravity_at()`, `planet.h:172`). Other bodies render as
  decorative spheres via `renderer_draw_moons()`.
- **No floating origin.** Every render path downcasts dvec3 → vec3
  against world (0,0,0). `plan.md` specs the body-anchored fix but
  hasn't landed.
- **Biomes are per-column boolean flags** (`column_profile_t` in
  `planet_gen.h:26-37`): `barren`, `icy`, `sequoia`, `crag`, `frost`,
  `asteroid`. `planet_sample_with_profile()` switches on these to pick
  block types.
- **Atmosphere config is per-body YAML** at
  `assets/config/atmosphere.yaml`, keyed by body name.

---

## Architecture overview

```
                  world clock (double seconds since epoch)
                                │
              ┌─────────────────┼──────────────────┐
              ▼                 ▼                  ▼
        orbital state     rotation state      sun-direction
        (per body)        (per body)          (per body, derived)
              │                 │                  │
              │                 ▼                  │
              │           u_planet_rotation        │
              │           (per-body uniform)       │
              ▼                                    ▼
        body.pos_world           shaders receive u_sun_dir_local
        (dvec3, per frame)       in body-local frame
              │
              ▼
        floating origin selection
        (gravity-weighted + hysteresis + deep-space grid)
              │
              ▼
        renderer_begin_frame(origin)
        → all matrices built in floating-origin space
        → float precision stays sub-millimetre regardless of
          absolute world distance
```

The world clock is the single source of truth. Everything time-varying
derives from it deterministically: given the same `t`, every client
computes the same body positions, the same sun direction, the same
day-phase. No network sync needed for celestial state.

---

## Phase 0 — Prerequisites from `plan.md`

Land these first. They are self-contained refactors and they de-risk
everything below.

1. **Floating origin (body-anchored)** — `plan.md` Part 1.
2. **Logarithmic depth buffer** — `plan.md` Part 2.

After both, the sun at 8 km and tile seams at 1 m both render crisply,
and `renderer_begin_frame(origin)` exists as the integration point for
Phase 3.

---

## Phase 1 — Four new biome planets

The orbital system is more fun with a populated sky, and the biome
refactor introduces no time-dependence — so we ship the planets before
the motion work.

### 1.1 Biome refactor (no behavior change)

Replace the bool-soup in `column_profile_t` with a single enum:

```c
typedef enum {
    BIOME_ROCK = 0,        // moons, asteroids
    BIOME_ICE,             // Frostbite-style
    BIOME_SEQUOIA_GRASS,   // existing Sequoia look
    BIOME_CRAG_RED,        // existing Crag look
    BIOME_FROST_BLUE,      // existing Frostbite cap
    BIOME_ASTEROID,        // existing carbonaceous

    // New in this pass:
    BIOME_DESERT,
    BIOME_TEMPERATE_GRASS,
    BIOME_OCEAN,
    BIOME_MOUNTAIN,
} biome_t;
```

`body_config_t` gains `biome_t primary_biome`. `planet_profile()` reads
`primary_biome` plus latitude/noise to pick a per-column biome (e.g. a
temperate-grass planet still gets snow at the poles).
`planet_sample_with_profile()` becomes a switch on the enum.

Rename `has_water` → `has_atmosphere` in this same commit — the field
name has been a known misnomer (see `atmosphere.yaml:70-72`).

### 1.2 Biome generators

All amplitudes / frequencies / thresholds go into a new
`assets/config/terrain.yaml`, one section per biome:

```yaml
desert:
  noise_amplitude_m: 4.0          # low dunes, not mountains
  noise_frequency: 0.08
  snow_line_latitude: 1.0         # never snows
  cactus_density: 0.002           # blocks per tile, gated by noise
  sky_tint: [1.0, 0.85, 0.7]      # warm pale

temperate_grass:
  noise_amplitude_m: 8.0
  noise_frequency: 0.04
  lake_threshold: -0.6            # noise < threshold → fill with water
  forest_density: 0.05
  snow_line_latitude: 0.85

ocean:
  noise_amplitude_m: 2.0          # nearly spherical
  noise_frequency: 0.02
  sea_level_m: 1.0                # most of surface is below this
  archipelago_threshold: 0.78     # rare island peaks
  has_seafloor: true              # voxels exist below water, not just shell

mountain:
  ridge_noise_amplitude_m: 80.0   # tall
  ridge_noise_frequency: 0.025
  ridge_sharpness: 1.6            # 1.0 = round, 2.0 = razor
  snow_altitude_m: 40.0           # snow above this altitude, regardless of latitude
  exposed_stone_altitude_m: 20.0
```

Per-biome generator notes:

- **Desert.** Cheap variant of the existing terrain noise with low
  amplitude and high frequency. Surface block is sand. Add a `CACTUS`
  block type (sprite asset under `assets/textures/`, baked to
  `.sprite` at build per the static-asset rules). Cactus density is
  noise-gated so they cluster naturally. No water at any altitude.
- **Temperate grass.** Closest to Tenebris. Rolling hills via
  mid-frequency Perlin. Lakes are local noise minima below
  `lake_threshold`. Forest scatter via existing tree-spawn path.
- **Ocean.** New code path: columns default to water. `planet_profile`
  flips `is_ocean = true` and `planet_sample_with_profile` emits
  WATER below sea level, SAND/STONE for the seafloor (when
  `has_seafloor` is true; cheaper to omit on initial pass), and only
  emits land above an `archipelago_threshold`-gated noise mask.
- **Mountain.** Ridged-multifractal noise (`1 - abs(perlin)` raised to
  `ridge_sharpness`). Snow gating switches from
  *latitude-driven* (existing planets) to *altitude-driven* — at any
  latitude, blocks above `snow_altitude_m` are snow. Exposed stone
  between grass line and snow line.

### 1.3 New bodies

Append to `body_id_t`:

```c
BODY_DUNE,        // desert
BODY_MEADOW,      // temperate grass
BODY_OCEANUS,     // ocean
BODY_RIDGEMARK,   // mountain
```

(Names are placeholders — pick canonical names before shipping.)

Each gets a row in `BODIES[]` with radius 200–320 m, a unique seed,
`gravity_g`, `primary_biome` set, and `has_atmosphere = true` for all
four (yes, desert and mountain planets get sky — the cap shader
already handles dry-air look via `rayleigh_scale`).

Add per-body sections to `atmosphere.yaml` for sky tinting.

Asset checklist per the static-asset rules: new sprites for sand,
cactus, mountain-stone, seafloor-sand go under `assets/textures/` as
PNG (Makefile bakes to `.sprite`). New tileset enum values
(`TILESET_DESERT`, etc.) for palette dispatch — or reuse `EARTH` with
per-biome tint, since sprites are paletted.

---

## Phase 2 — Time and motion

This is the heart of the system. Three commits.

### 2.1 The world clock

Single source of truth: `double world_clock_seconds`, advancing
monotonically since a fixed epoch. Lives in `core/world.c` as
`world_now()`. Drives every time-varying computation below.

Client and server both call `world_now()` with the same epoch base
(epoch is `0` at first world load, or a configured start time). Network
state sync stays untouched — clients re-derive celestial positions
locally from time alone.

`orbit.yaml`:

```yaml
clock:
  # All time units are seconds of wall-clock unless noted. The system
  # is intentionally fast: 10 real minutes per Tenebris day so the
  # player sees a sunrise within a play session.
  epoch_offset_s: 0
  time_scale: 1.0    # debug knob — 60 makes 1 second = 1 minute
```

### 2.2 Day/night via planet rotation

Each `body_config_t` gains:

```c
double  rotation_period_s;    // sidereal day; 0 = tidally locked
float   axial_tilt_deg;
double  rotation_phase_s;     // phase offset at t=0
```

The sun stays at a fixed world position (defined in `orbit.yaml`,
initially at world origin). The *planet rotates*. Voxel meshes do
**not** rotate — instead, each frame the renderer recomputes the
sun-direction *in the body's local frame*:

```c
mat3_t  R_body = body_rotation_at(body, t);  // axis = tilted Y, angle = t/period
vec3_t  sun_dir_world = normalize(env.sun_pos_world - body.pos_world);
vec3_t  sun_dir_local = mat3_mul_vec3(mat3_transpose(R_body), sun_dir_world);
// upload u_sun_dir = sun_dir_local to hex/water/atmosphere shaders
```

The player rides the planet implicitly: gravity always points to body
centre, and the surface-attachment basis is rebuilt from the player's
local position each frame. No "stand on a moving platform" code needed
because the platform's geometry isn't actually moving — only the sun's
apparent direction is.

`orbit.yaml`:

```yaml
day_night:
  default_rotation_period_s: 600    # 10 real minutes per day
  default_axial_tilt_deg: 23.4

tenebris:
  rotation_period_s: 600
  axial_tilt_deg: 23.4
  rotation_phase_s: 0.0
oceanus:
  rotation_period_s: 720
  axial_tilt_deg: 12.0
# ... per-body overrides
```

Tidally locked moons (`rotation_period_s = 0`) get a special case: the
rotation matrix is the orientation that always shows the same face to
the parent, which falls out naturally from the orbital position.

**Sun goes from `vec3` direction to `dvec3` position.** This unlocks the
moon-eclipse path even if we don't ship eclipses in the first cut: the
sun direction at a body becomes `sun_pos - body_pos`, which means a
moon at the right place geometrically can dim it without any new
plumbing.

### 2.3 Orbits

Each `body_config_t` gains:

```c
body_id_t orbit_primary;        // BODY_COUNT for "sun" (i.e. no parent)
double    orbit_radius_m;
double    orbit_period_s;
double    orbit_phase_s;
float     orbit_inclination_deg;
float     orbit_eccentricity;   // 0 = circular; keep at 0 for first cut
```

Each frame, before any rendering:

```c
void celestial_update(double t) {
    // Resolve parents-first so moons can read their parent's updated pos.
    for each body in topological order (sun → planets → moons):
        if body.orbit_primary == NONE:
            body.pos_world = body.initial_pos;   // sun or fixed reference
        else:
            dvec3_t p = planet_get(body.orbit_primary)->pos_world;
            double  theta = 2*PI * ((t - body.orbit_phase_s) / body.orbit_period_s);
            body.pos_world = p + kepler_offset(body.orbit_radius_m,
                                               theta,
                                               body.orbit_inclination_deg);
}
```

`kepler_offset` for the first cut is plain circular motion in a tilted
plane:

```c
dvec3_t kepler_offset(double r, double theta, float inc_deg) {
    double inc = deg2rad(inc_deg);
    return (dvec3_t){
        r * cos(theta),
        r * sin(theta) * sin(inc),
        r * sin(theta) * cos(inc),
    };
}
```

Eccentricity (real ellipses) is a one-line extension later — solve
Kepler's equation via Newton iteration. Skip for v1.

`orbit.yaml`:

```yaml
sun:
  position: [0, 0, 0]
  radius_m: 240
  light_intensity: 1.0

# orbit_primary = sun unless stated otherwise
# orbit_radius_m is metres from primary's centre
# orbit_period_s is the body's year

tenebris:
  orbit_radius_m: 1500
  orbit_period_s: 3600
  orbit_phase_s: 0
  orbit_inclination_deg: 0

dune:
  orbit_radius_m: 2400
  orbit_period_s: 5400
  orbit_phase_s: 900
  orbit_inclination_deg: 2.0

luna:
  orbit_primary: tenebris
  orbit_radius_m: 380
  orbit_period_s: 280
  orbit_phase_s: 0
  orbit_inclination_deg: 5.0

# ... etc
```

Existing static `pos_x/y/z` constants in `BODIES[]` are deleted —
positions are now derived. The `dvec3_t pos_world` field becomes a
runtime cache, recomputed each frame by `celestial_update()`.

### 2.4 Why this won't break gravity / atmosphere

- `planet_gravity_at()` reads `body.pos_world` — which is now updated
  each frame instead of static. No code change to gravity itself.
- The atmosphere shader receives `u_planet_centre` in local floating-
  origin space. Since the planet's local position is recomputed each
  frame from the floating origin, the atmosphere shell tracks the
  planet automatically.
- Terrain meshes are body-local — they never see world space.

The one risk is **player physics on the active planet while the planet
moves through space**. Since the player is stored in body-local
coordinates relative to the active body (or should be — verify in
`player_ctrl.c` before this lands), the planet sliding through world
space is invisible to the player. The body's *rotation* is also
invisible to physics because we don't rotate the mesh; we rotate the
sun direction.

If the player physics is in world space rather than body-local, that's
a refactor that has to happen before Phase 2.3.

---

## Phase 3 — True dynamic floating origin

`plan.md` Part 1 lands a body-anchored origin: origin = active body's
centre, changes only on teleport. Once planets move and the player can
fly between them, that's insufficient — we need a real handoff system.

### 3.1 Origin policy

The origin is a `dvec3_t` computed each frame by one helper:

```c
dvec3_t world_pick_origin(dvec3_t player_pos,
                          const gravity_query_t* grav,
                          dvec3_t prev_origin,
                          const origin_config_t* cfg);
```

Policy:

1. **Near a body** (gravity multiplier > `body_capture_grav`):
   origin = body centre.
2. **Leaving a body** (gravity multiplier dropped below
   `body_release_grav`): origin remains at the last body until the
   player crosses into another body's capture region OR enters deep
   space.
3. **Deep space** (no body has multiplier > `body_release_grav`):
   origin tracks the player, snapped to a fixed grid so it only
   updates when the player crosses a grid cell boundary:

   ```c
   origin = floor(player_pos / cfg->grid_m) * cfg->grid_m;
   ```

The hysteresis band (`capture_grav` vs `release_grav`) prevents
oscillation when the player hovers at a body's edge. The grid snap
prevents per-frame origin jitter in deep space.

```yaml
floating_origin:
  body_capture_grav: 0.6
  body_release_grav: 0.4
  deep_space_grid_m: 1024
```

### 3.2 Re-anchor smoothness

When origin shifts by `delta_origin = new - prev`:

- The view matrix is rebuilt with the new origin → camera_local shifts
  by `-delta_origin`.
- Every body's `pos_local` shifts by `-delta_origin`.
- Net visual change: **zero**. Every position in the scene shifts by
  the same amount in opposite directions, so the rendered image is
  identical.

This invariance is the whole point of floating origin and is the
property that makes mid-flight handoff safe.

Caveats that would break the invariance and are therefore forbidden:

- **No frame-to-frame temporal effects** that depend on world-space
  positions (motion blur, TAA, screen-space accumulation). Tenebris has
  none today. If we add them later, they must operate in local space.
- **Origin selection runs before any matrix or uniform is built that
  frame.** A late origin change after some uniforms are uploaded would
  cause inter-uniform inconsistency. Pin origin selection to the top of
  the frame loop in `main_web.c`.

### 3.3 Integration with the rest

Once Phase 3 lands, every consumer is already wired:

- `renderer_begin_frame(origin)` — from `plan.md` Part 1.
- `player_view(p, origin)` — from `plan.md` Part 1.
- Per-body uniforms get `body_local = (vec3_t)(body.pos_world - origin)`
  per frame — the cast is safe because the subtraction is in doubles
  and the result is always within ~10 km.
- Sun gets `sun_local = (vec3_t)(env.sun_pos_world - origin)`.

The renderer doesn't know or care whether the origin came from a body
centre or a deep-space grid cell — it just consumes a `dvec3_t`.

---

## Validation plan

Each commit gets a specific test:

1. **Floating origin (body-anchored).** Teleport to Sequoia
   (currently at world -850, 120, -700). Stand at 1 m altitude. Tile
   seams must stay tight — no sub-pixel wobble.
2. **Log-z.** Stand on Tenebris, look at the sun. Sun renders crisply
   alongside terrain underfoot. No z-fighting between atmosphere shell
   and terrain horizon.
3. **Biome enum refactor.** Visual diff against pre-refactor build:
   identical. Run server gen + client gen seed-matched and assert byte
   equality on a sample chunk.
4. **`has_water` → `has_atmosphere` rename.** All atmosphere-bearing
   bodies still render their sky.
5. **Four new biomes.** Teleport to each new planet; biome-correct
   blocks appear; no missing-block crashes; sky tint matches yaml.
6. **Four new planet rows.** All four show in the teleport menu;
   teleport-to + spawn works on all four.
7. **Day/night.** Stand still on Tenebris, watch sun arc across the
   sky over `day_length_s`. Terminator sweeps smoothly. Atmosphere
   tints orange at horizon, blue at zenith.
8. **Orbits.** Watch the moon Luna orbit Tenebris over its
   `orbit_period_s`. Watch Tenebris and Dune both orbit the sun and
   see them change relative positions over a few minutes.
9. **True floating origin.** Fly from Tenebris to Dune (~3 km of
   travel). Tile seams stay tight at takeoff, in deep space, and on
   landing. Sun rendering doesn't pop when origin re-anchors. Place a
   visible debug marker at the floating origin and confirm it snaps
   to expected positions during the flight.

---

## Risks and unknowns

- **Player physics frame of reference.** If `player.position` is stored
  in world space (not body-local), Phase 2.3 will introduce sub-frame
  position errors as the planet moves through world space between
  player-update and rendering. Resolution: confirm by reading
  `player_ctrl.c` before Phase 2.3 lands; if world-space, either
  refactor or constrain the integration order so player update reads
  the same `body.pos_world` snapshot used by render.
- **Network determinism.** Two clients running with slightly different
  `time_scale` debug values would see different body positions. Either
  forbid time scaling in multiplayer or sync `time_scale` via
  `proto.c`.
- **YAML parser limits.** The deliberately tiny YAML subset (see
  `core/config.c`) handles key/value, vec3 lists, and top-level
  sections. The proposed `orbit.yaml` schema fits inside that — the
  `orbit_primary` field is a string body name, parsed like the existing
  per-body section names. No parser changes needed.
- **Eccentric orbits.** Skipped for v1. Adding them later is a single
  function swap inside `kepler_offset` plus an `eccentricity` field in
  yaml — no consumer changes.
- **Eclipses.** Not implemented. The sun-as-world-position change makes
  the geometry tractable later (sample whether any other body
  intersects the sun-direction ray inside the atmosphere shader), but
  no time is allocated for it here.

---

## Suggested commit order

1. `plan.md` Part 1 — floating origin (body-anchored).
2. `plan.md` Part 2 — log-z depth.
3. Biome enum refactor (no behavior change).
4. Rename `has_water` -> `has_atmosphere`.
5. Add four biomes + new block types + `terrain.yaml`.
6. Add four planet rows + `atmosphere.yaml` sections.
7. World clock + `orbit.yaml` skeleton.
8. Day/night via planet rotation + sun as `dvec3` world position.
9. Orbital position update + parent hierarchy.
10. True floating origin (dynamic re-anchor with hysteresis and
    deep-space grid).

Ten commits, each independently testable, each landing on
`claude/tenebris-planets-orbits-o4w5Y`. Estimated total scope: about a
week of focused work, with Phase 2 (commits 7-9) being the most
intricate and Phase 3 (commit 10) being the highest-precision-bug
risk.
