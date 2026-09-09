# Modular Ships - Design Proposal

**Status: PROPOSAL. Nothing here is implemented yet.** Section 10 lists eight
decisions that are the user's to make; Q1, Q3 and Q7 must be answered before
step 1 because they change the data model rather than just the tuning.

Scope, from the request: rip out the orbital-mechanics FLIGHT model for the
player ship and replace it with a standard-feeling ship (thrust + linear and
angular damping) that still falls down gravity wells and still flies in
floating-origin space; keep the launch pad and its progression; let the player
build MODULAR ships instead of a fixed vertical stack; keep the world's orbital
motion (planets and the casino station); and hand an approaching ship into a
station's moving reference frame so it inherits that station's orbital velocity.

Companion assets: `tools/gen-ship-parts.py` generates the part mockups this doc
specifies - see "Mockup assets" at the end.

---

I verified the load-bearing claims against the tree before writing. Several proposals were wrong on facts that change the design; those corrections are baked in below.

---

# Modular Ships: Implementation Plan

**Repo:** `/home/user/tenebris/tenebris-rs` · **Target:** replace the Kepler/patched-conic ship model with an arcade rigid-body flight model on a modular part graph, while the world keeps orbiting.

## 0. Four facts I verified that override the proposals

These are checked against the tree, not the code map. Get them wrong and the plan fails.

1. **A ridden ship has *no* damping today.** The RCS accumulation block is gated `if !riding` twice (`player_ctrl.rs:1848`, `player_ctrl.rs:1863`), so `rcs_active` (`player_ctrl.rs:1872`) is **always false while riding**. The `if rcs_active { v *= exp(-space_drag*dt) }` at `player_ctrl.rs:1914-1917` is the **on-foot spacewalk's** damping. Ask #4 is therefore *add* damping on the ship path, not *ungate* it. **`lod.yaml:107 space_drag` stays** — deleting it as "a duplicate" (minimal-surgery, parts-first) would silently remove the spacewalker's only brake.
2. **Item ids 150-155 are fish.** `items.rs:142-147` = `FISH_MINNOW`…`FISH_SERPENT`. Highest live id is `ROCK = 162` (`items.rs:169`). New parts start at **163**. The frame-first roster would have turned every minnow in every save into a hull truss.
3. **The block-entity record has exactly three separator levels and they are all taken.** `record_parse` (`block_entity.rs:867`) does `rec.split(':')`, reads the payload from `parts.get(4)`, and parses it with `nums()` = `split(',')`; records are joined by `;` (`persistence.rs:723`, `server.rs:489`). Both minimal-surgery's `:m:...item:parent:socket:roll` and frame-first's `:l:<segments>:<blob>` **shred on arrival**. A graph payload must be a **flat, fixed-arity comma list of integers**.
4. **The ride save's tail is extensible; its head is not.** `load_ride` gates on `matches!(head.len(), 9|12|19|20)` (`persistence.rs:632`) and reads `docked: head.len() == 20` (`persistence.rs:685`) — an *exact* equality. Growing the head to 21/24/26 (all three proposals) silently un-docks every ship and is rejected outright. But `parts` is `;`-joined u16 with `if parts.is_empty() { return None }` (`persistence.rs:640`) — a colon-bearing token there **deletes the ship**. The extension point is **trailing groups**, which already degrade via `groups.next().unwrap_or("")` (`persistence.rs:638`).

Two more that shape the plan:

- **Ship collision is unguarded.** There is no `riding` reference anywhere after `player_ctrl.rs:2264`; the ground-snap / ceiling / tree-floor block from `player_ctrl.rs:2361` collides a flying ship as a 1.8 m player capsule — and it is where the OPEN tree-fallthrough bug lives. No proposal supplied a replacement.
- **Planet-mode gravity is `!p.grounded`-gated** (`player_ctrl.rs:2276`). An unconditional gravity term makes a TWR<1 ship sink through the launch pad.

---

## 1. The boundary

**The line is a module boundary, and it is checkable by one question: does this function take `(body_id, time)` or does it take `(ship_pos, ship_vel)`?** Everything that answers *"where is a body or a frame at time t"* is **world kinematics and survives untouched** — `orbit::elements/heliocentric_pos/apparent_pos/body_track/sun_direction/spin_angle` (`orbit.rs:85/229/377/297/363/324`), which is what `renderer::update_celestial` (`renderer.rs:4620-4632`) reads every frame to make planets visibly orbit, and `station::orbit_pos/orbit_vel/orbit_radius_m/orbit_speed_mps` (`station.rs:795/804/771/780`), the only body with genuinely time-varying physics state. Everything that answers *"what conic will this ship follow"* dies: the whole of `tenebris-core/src/nav.rs`'s `Conic`/`state_at`/`patched_trajectory`/`find_soi_crossing`/`plan_burn`/`burn_basis`/`available_dv` stack, plus the ~800 lines of `nav_ui.rs` that draw it. **This is nearly free because `nav.rs` was never in a physics path** — the ship integrator at `player_ctrl.rs:1895-1918` is already thrust + `planet::orbital_gravity_at` + Euler and has never called `nav`. So ask #5 ("still adhere to gravity wells") is satisfied by *not touching* `planet.rs:899`, and ask #1 is a prediction-layer deletion plus a new damping term. **Planets stay parked in the physics frame**: `planet::reposition_heliocentric` (`planet.rs:689`, sole caller `app.rs:2462`) keeps running once at boot and gravity keeps summing from frozen anchors — ask #7 is already true visually via `apparent_pos`, and time-parameterising `BodyConfig.pos_*` would break the static-anchor assumption under terrain meshing, chunk streaming, `station::orbit_pos` (built on `planet::get(Tenebris).pos_*`, `station.rs:882`) and every saved world position. **Ships and the conic HUD must be cut in the same commit** — damping without the HUD removal leaves a navball advertising orbits the physics no longer flies.

---

## 2. Flight model

New file `crates/tenebris-core/src/ship.rs`. One integrator, called for the ridden ship, every parked hull, and (later) debris.

### 2.1 State

```rust
pub enum ShipFrame { World, Surface(BodyId), Station(u8) }
pub enum ShipMode  { Flying, Parked, Landed }   // Landed = frozen pose, still drawn/boardable

pub struct ShipBody {
    pub frame:    ShipFrame,
    pub mode:     ShipMode,
    pub pos:      DVec3,     // FRAME-LOCAL metres
    pub vel:      DVec3,     // FRAME-LOCAL m/s
    pub att:      DQuat,     // AUTHORITY. frame-local orientation
    pub ang_vel:  DVec3,     // BODY-frame rad/s
    pub throttle: f64,       // 0..1, slewed
    pub fuel:     f32,       // one ship-wide pool
    pub assist:   bool,
    pub damp_bias:   DVec3,  // frame-handoff damping attractor, decays to 0
    pub damp_bias_t: f64,
    pub graph:    ShipGraph,
    pub mass:     MassProps, // cached, dirty on edit + 5% fuel buckets
}
```

Body axes keep the existing convention so nothing downstream flips: **+Z = nose = thrust axis** (today's `basis.up`, see `app.rs:7413 axis: p.basis.up` and `player_ctrl.rs:1898`), +X = right, +Y = fwd/roll reference. `TangentBasis` becomes a *derived view* via the existing `basis_from_quat` (`player_ctrl.rs:380`), so the renderer, chase cam, navball and saves read the same struct they read today. This finally satisfies the standing quaternion rule end-to-end: today `steer_rocket_attitude` (`player_ctrl.rs:426/455`) rebuilds a `DQuat` from the basis every frame and throws it away, and `rocket_fx::basis_up_fwd` (`rocket_fx.rs:197`) re-derives a frame from two vectors with a singular fallback. Both go.

### 2.2 Integrator — `ship::step(&mut ShipBody, &ShipEnv, &ShipInput, &ShipCfg, dt)`

Semi-implicit (symplectic) Euler. Order matters; damping is applied to the **pre-impulse** velocity so this frame's throttle is never fought by drag.

```
0. if mode == Landed { return }                      // frozen, still world state
1. throttle += clamp(cmd - throttle, ±ramp*dt)
2. flow = throttle * Σ thruster.fuel_per_s;  if fuel <= 0 { throttle_eff = 0 }
   fuel -= flow*dt
3. F_body = Σ_i throttle_eff * t_i * dir_i
   τ_thrust = Σ_i (r_i - com) × (throttle_eff * t_i * dir_i)     // off-axis engines torque
   τ_cmd    = ctl.pyr ⊙ mass.torque_nm
4. α  = I⁻¹ ⊙ (τ_cmd + τ_thrust)                     // I diagonal, body axes
   ω += α*dt
   ω  = ω / (1 + k_ang*dt)                           // semi-implicit, unconditionally stable
   if |ω| > max_ang_rate { ω = ω.normalize()*max_ang_rate }
   att = (att * DQuat::from_scaled_axis(ω*dt)).normalize()
5. a  = att*(F_body/mass_kg) + g_local               // see 2.4
   v += a*dt
6. // damping toward a BLENDED attractor (see 3.4)
   s      = 1 - clamp(damp_bias_t/frame_blend_s, 0, 1);  damp_bias_t += dt
   target = damp_bias * s
   k_lin  = (if assist {linear_damp_hz} else {linear_damp_coast_hz})
          * (1 + air_density*atmo_drag_mult)
          + linear_damp_quad*(1 + air_density*atmo_drag_mult)*|v - target|
   v = target + (v - target) / (1 + k_lin*dt)
   if |v - target| < damp_rest_mps { v = target }
7. pos += v*dt
8. contact resolve (see 2.6)
```

**Why `v/(1+k·dt)` and not `v*exp(-k·dt)`:** the semi-implicit form is unconditionally stable, never overshoots into a sign flip on a frame spike, and needs no `exp`. The exponential form the tree uses today at `player_ctrl.rs:1915` is fine at 60 fps and wrong at 5 fps.

**Designable closed forms** (put these in the YAML comments so nobody bisects by feel):

- terminal cruise: `a_max = k_lin·v + k_quad·v²` → for the starter ship `a_max = 75000/800 = 94 m/s²`, giving `v ≈ 197 m/s`
- stop time to 10%: `t90 = 2.3/k_lin` → **5.75 s** at `k_lin = 0.4`
- terminal fall in a well: `v_term = g/k_lin` → 62 m/s at surface `g=25`
- max turn rate: `ω_max = τ/(I·k_ang)`, clamped by `max_ang_rate_rads`

**Starter-ship sanity (verified numbers, no part retune needed):** cockpit 200 + tank 500 wet + engine 100 = **800 kg**; `[engine] thrust_n: 75000` (`rocket.yaml:12`) → `a = 94 m/s²`, TWR on Tenebris (`g = 25`, `planet.rs:886`) = **3.8**, cruise ≈ 197 m/s. Tenebris circumference at `radius_m: 300` (`planet.rs:333`) is 1885 m, so you cross a planet in 10 s and reach the station at 10 km in ~55 s. Part stats do **not** need retuning; only the damping is new.

### 2.3 Inertia

`I` is **diagonal** (products dropped — `inertia_products: 0` is a knob if it ever matters). Per part, a solid box of its `bbox` about its own centre plus parallel-axis to the ship CoM:

```
I_xx += m*((2hy)² + (2hz)²)/12 + m*(dy² + dz²)     // and yy, zz
```
floored at `min_inertia_kgm2` so a one-part ship is not zero-inertia. Starter chain: `I_pitch ≈ 1200 kg·m²`. With a cockpit's baseline 6 kN·m and `k_ang = 3.0`, `ω_max = 6000/(1200·3) = 1.67 rad/s` — right at the 1.6 clamp, so the starter feels responsive. A 24-part hull (`I ≈ 50,000`) on the cockpit alone gets 0.04 rad/s and is unflyable, which is exactly the pressure that makes gyros a real build decision.

### 2.4 Gravity — ask #5, and the one thing that must not be broken

```
ShipFrame::World      → g_local = planet::orbital_gravity_at(world_pos)          // planet.rs:899, UNCHANGED
ShipFrame::Surface(b) → g_local = same (Surface differs only by origin)
ShipFrame::Station(_) → g_local = sf.world_vec_to_local(orbital_gravity_at(world_pos))
                        + (-local_up * artificial_gravity_mps2) if probe.in_field
```

**Real gravity stays on inside the station SOI.** Three of the four proposals zeroed it there ("the frame is in free fall so it cancels"), which creates a hard acceleration cliff at the boundary and locally deletes ask #5. It is also unnecessary: at the station's 10 km orbit radius, `g = 25·(300/10000)² = 0.0225 m/s²` — three orders below the damping term. Keep it; it costs one rotate and removes the cliff.

`grounded` semantics survive: gravity is applied normally, and the contact resolve (2.6) cancels the into-surface component, so a TWR<1 ship still sits on the pad instead of sinking through it (today's `!p.grounded` guard at `player_ctrl.rs:2276`).

### 2.5 Atmosphere

`ShipEnv.air_density = clamp(1 - alt_m / atmo_scale_height_m, 0, 1)`, **zero unless `planet::body_has_atmosphere(body)`** (the standing no-atmosphere-no-effects rule). It scales `k_lin`/`k_quad` by `atmo_drag_mult` and enables the Wing's lift term:

```
L = Σ_wings lift_coef * area * ρ * |v|² * sin(α)     // α = angle between nose and velocity
```
applied perpendicular to velocity in the nose plane. Wings genuinely do nothing in vacuum, which is the trade.

**Do not reuse `[reentry] max_alt_m: 120` for this** (minimal-surgery proposed it): it is a VFX threshold, it would make the atmosphere 120 m thick — shorter than the launch tower's useful range — and raising it would start plasma streaks at 3 km. New key, own meaning.

### 2.6 Contact — the gap all four proposals left

A ship must **never** run the walker's ground-snap block (`player_ctrl.rs:2361-2960`). That block is a 1.8 m capsule solver and owns the open tree-fallthrough bug. Add `if riding { skip }` and the ship contact resolve **in the same commit** — separately, one of them is a fall-through-the-world release.

```rust
// ship::contact_resolve(&mut ShipBody, env, dt)
// contacts = gear feet (part-local, from PartDef.contact) or, if no gear,
//            the 4 lowest corners of the hull AABB
for c in contacts {
    let w   = world_pos_of(c);
    let (floor_r, _) = world::walkable_floor(w);            // the SAME query the walker uses
    let pen = floor_r + c.radius - radius_of(w);
    if pen > 0.0 {
        pos    += radial * pen / n_contacts;
        v_rad   = dot(vel, radial);
        if v_rad < 0.0 { vel -= radial * v_rad * (1.0 + restitution); }
        ang_vel *= (1.0 - contact_ang_friction*dt).max(0.0);
        touching = true;
        if v_rad < -part.impact_tolerance_mps { damage/log }
    }
}
if touching && |vel| < land_rest_mps && |ang_vel| < land_rest_rads { mode = Landed }
```

`Landed` freezes integration entirely, which is what makes a parked ship *stay* on the pad and stay boardable.

### 2.7 Attitude assist — cascade, do not retune the PID onto a torque plant

Keep `nav::AttGains/AttPidState/attitude_error/attitude_pid_step` (`nav.rs:586/600/620/643`) and **move them into `ship.rs` unchanged in math**. They emit a commanded angular *rate*. Wrap a new inner proportional loop:

```
τ_assist = clamp(I ⊙ (ω_cmd - ω) * assist_rate_kp, ±mass.torque_nm)
```

The outer plant the PID sees is still rate-following, so its gains, its settle deadband (`nav.rs:653-666`) and both of its regression tests (`nav.rs:719`, `nav.rs:752`) stay valid. That deadband guards a *reported* "constant sine flipping" bug; retuning a kinematic-plant PID onto an inertial plant resurrects it. Note `assist_rate_kp` is a **dimensionless** gain multiplying `I` — the fixed `3.2 N·m/(rad/s)` in the minimal-surgery proposal would have made the autopilot inert on any real hull.

Flight-assist attitude hold is *not* the PID: it is step 4's `k_ang` damping. A first-order decay structurally cannot ring.

### 2.8 Controls — the dual-source rule applies

Three new actions, and **both** `assets/config/controls.yaml` and `controls.rs::default_bindings` must change together, plus `shipped_yaml_matches_the_intended_scheme` extended. This is the exact scar CLAUDE.md cites and every proposal skipped it.

| Action | Default | Note |
|---|---|---|
| `throttle_hold` | `Space` | reuses the existing jump binding; the slew rate makes it read analog |
| `rcs_translate` | `LeftAlt` | modifier — hold + WASD is translation instead of attitude |
| `flight_assist` | `X` | toggle; **X is freed by deleting the Stage keybind** (`controls.yaml:82`, `app.rs:8283`) |

**Pre-existing drift to fix in the same PR:** `controls.yaml:72` ships `interact: E` with `roll_right` unbound and E doing double duty, while CLAUDE.md mandates Interact on **F** with **Q/E** as the roll pair. Reconcile it here or the new bindings land on top of a scheme that already disagrees with its own defaults.

### 2.9 YAML — extend `assets/config/rocket.yaml`

New `[ship]` section, parsed by the existing `match (section, key)` switch at `rocket.rs:416-473`. Zero-sentinel throughout: **`0` (or omitted) means "use the compiled default in `DEFAULT_ROCKET_CONFIG`"** (`rocket.rs:296`).

```yaml
# ---------------------------------------------------------------------
# [ship] - arcade flight model. Damping is semi-implicit: v /= 1 + k*dt.
#
# Designable closed forms (derive, do not bisect):
#   terminal cruise   a_max = k_lin*v + k_quad*v^2
#   stop time to 10%  t90   = 2.3 / k_lin
#   terminal fall     v     = g / k_lin
#   max turn rate     w_max = torque / (inertia * k_ang), capped by max_ang_rate_rads
#
# Starter ship (cockpit 200 + tank 500 + engine 100 = 800 kg, 75 kN):
#   a_max 94 m/s2 -> cruise ~197 m/s, TWR 3.8 on Tenebris, stop in ~6 s.
#
# ZERO SENTINEL: every field here treats 0 as "use the compiled default".
# To express genuinely-zero damping use the *_coast_hz pair with assist OFF,
# or set the DEFAULT to 0 in rocket.rs - do not write 0 here and expect off.
# ---------------------------------------------------------------------
[ship]
# --- linear ---
linear_damp_hz:          0.40    # 1/s, flight assist ON. t90 ~ 5.8 s
linear_damp_coast_hz:    0.02    # 1/s, assist OFF - near-Newtonian coast
linear_damp_quad:        0.0004  # 1/m, softens the top end; heavy ships feel heavy
damp_rest_mps:           0.05    # snap to the attractor below this, kills 1e-9 drift
atmo_drag_mult:          6.0     # k multiplier at air_density = 1
atmo_scale_height_m:     2500.0  # density ramps 1 -> 0 over this altitude
max_speed_mps:           0       # 0 = no clamp (terminal velocity is emergent)

# --- angular ---
angular_damp_hz:         3.0     # 1/s, assist ON. spin settles in ~0.8 s
angular_damp_coast_hz:   0.20    # 1/s, assist OFF
max_ang_rate_rads:       1.6     # hard clamp; supersedes flight.steer_rate_rads
assist_rate_kp:          4.0     # DIMENSIONLESS: tau = I * kp * (w_cmd - w)
min_inertia_kgm2:        200.0
inertia_products:        0       # 0 = diagonal-only inertia tensor

# --- control ---
throttle_ramp_per_s:     2.0     # analog slew: 0 -> 1 in 0.5 s
rcs_thrust_frac:         0.12    # lateral thrust as a fraction of main thrust
mass_recalc_fuel_step:   0.05    # re-fold mass props each 5% of the fuel pool

# --- frames / handoff ---
frame_blend_s:           3.0     # damping-attractor ramp after a frame change
parked_anchor:           1       # 1 = a Parked ship in World frame holds station
                                 #     (no gravity, no damping) so it is always
                                 #     re-boardable. See the never-despawn rule.

# --- contact ---
restitution:             0.05
contact_ang_friction:    8.0     # 1/s spin bleed while touching ground
land_rest_mps:           0.4     # below this + settled -> ShipMode::Landed
land_rest_rads:          0.15

# --- build limits ---
max_parts:               24
thrust_offaxis_max_deg:  12.0    # ThrustOffAxis becomes a WARNING past this
```

**Deleted from `[flight]`:** `gravity_mps2` (a hand-synced duplicate of `planet::SURFACE_GRAVITY_MPS2_PER_G`, `planet.rs:886` — the TWR readout reads the constant), `launch_alt_m`, `safe_landing_mps`, `drag_coef`, `parachute_drag` (all belonged to the dead `RocketFlight`). `steer_rate_rads` is superseded by `max_ang_rate_rads`. `att_kp/ki/kd/att_deadband_rad` **move to `[ship]`** unchanged. **`lod.yaml:107 space_drag` stays** — it is the on-foot spacewalk's damping (fact #1), and its schema comment gets a line saying so.

New station keys go in `assets/config/station.yaml` (see §3).

Per the one-path rule, extend `shipped_rocket_yaml_parses_when_present` (`rocket.rs:1368`) to `include_str!` the real file and assert every `[ship]` key round-trips against `DEFAULT_ROCKET_CONFIG`.

---

## 3. Reference frames + station handoff

### 3.1 The frame set

New `crates/tenebris-core/src/frame.rs`:

```rust
pub enum FrameId { World, Surface(BodyId), Station(u8) }
pub struct Frame { pub id: FrameId, pub origin: DVec3, pub prograde: DVec3,
                   pub up: DVec3, pub normal: DVec3, pub vel: DVec3, pub q: DQuat }
pub fn sample(id: FrameId, t: f64) -> Frame;
```

The three vector maps are the **existing bodies of `StationFrame::local_to_world` / `local_vec_to_world` / `world_vec_to_local` (`station.rs:940/949/958`) lifted one level**, not rewritten. `q` is built from the same `(prograde, up, normal)` columns so orientations compose as `q_world = f.q * b.att`.

- `World` — origin 0, identity basis, `vel = 0`. Absolute heliocentric f64.
- `Surface(b)` — origin `planet::get(b).pos_*`, identity basis, `vel = 0`. Bodies are parked so this is a pure translation. **Include it only if you take the fleet/multi-ship option** (§10 Q3); on its own it buys no precision (f64 at 1.5e5 m resolves 2e-11 m) and it plants a rebase at the atmosphere seam that already has a documented "rocket angle jumps leaving the atmosphere" fix (`player_ctrl.rs:1575`). **Default recommendation: ship `World` + `Station` only.**
- `Station(id)` — from a new cheap `station::frame_basis(id, t) -> Frame` split out of `frame_sample` (`station.rs:872`); the expensive hex-column half becomes `station::probe(&Frame, world_pos) -> ColumnProbe { support_m, ceiling_m, column_top_m, embedded, in_field }`. This split alone removes the double-Mutex + span-cache traffic paid up to 7× per frame and lets `station_fx.rs:569-572` stop re-deriving the basis itself (a live duplicate-authority bug). Preserve the flipped-wheel convention: local `+y` points **at** Tenebris (`station.rs:882-887`).

### 3.2 Ask #6: floating origin already exists — do not build a second one

The render origin follows the **camera** (`origin_d = cam_eye`, `app.rs:7102`; `view_scene = mat4_clear_translation(view)`, `app.rs:7110`; `renderer::begin_frame` rebases every body as `world_pos = f32(world_pos_d - camera_world_d)`, `renderer.rs:4928-4931`; props via `renderer::sgl_translate_scene`, `renderer.rs:2281`). While riding, that camera is welded to the ship. Ask #6 needs **two fixes, not a system**:

- `renderer::set_lod_anchor` (`app.rs:7246`) must follow the **ship's** world pose while riding, or zooming out triggers a full-body remesh.
- Two standing floating-origin bugs where f32 world coords escape the rebase: `rocket_fx::draw_frustum` (`rocket_fx.rs:241-315`) builds absolute world vertices and emits them under `view_scene`, and `renderer::draw_tower_cutout` (`renderer.rs:7125`) does the same for the launch tower. Displacement is the full camera vector — a planet radius on Tenebris, ~20 km on Sequoia. The frustum dies with the vertical stack; the tower verts get rebased by `camera_world_d` before `sg::update_buffer`.

### 3.3 Handoff trigger

New keys in `assets/config/station.yaml`:

```yaml
  ship_soi_radius_m:   300.0   # capture: ship enters the station's frame
  ship_soi_release_m:  420.0   # release (1.4x hysteresis - must exceed capture)
  ship_dock_capture_m:   8.0   # local pad-capture radius
```

Sizing rationale, since three proposals picked 400-900 m with no error budget:
- **Coriolis**, the dominant fictitious term at ship speeds: `2ωv`, with `ω = 15/10000 = 1.5e-3 rad/s`. At a 50 m/s in-bubble approach that is **0.15 m/s²**, against a damping deceleration of `0.4·50 = 20 m/s²` — **0.75%**, genuinely imperceptible. At the full 197 m/s cruise it is 0.59 m/s² against 79 m/s² — still under 1%. The frame stays inertial, per the standing rule, and now with a stated budget.
- **Centrifugal** at `r_local = 300 m`: `ω²r = 6.8e-4 m/s²`. Ignorable.
- **Tunnelling**: 197 m/s at 60 fps is 3.3 m/frame against a 300 m shell. Still use the **swept test** — closest approach of the segment `pos_prev → pos_now` to the anchor, not the endpoint — because the existing on-foot test samples the *pre*-integration position (`player_ctrl.rs:1367`) and a frame spike is free to skip it.
- 300 m is 5× `dock_radius_m: 60` (`station.yaml:68`) — a comfortable approach shell that is not a "you are auto-braked from a kilometre out" bubble.

`frame::resolve(pos_w, vel_w, cur, t) -> FrameId` is the **single** frame-selection rule shared by the walker and every ship, replacing the three mutually-inconsistent proximity tests the tree has today (`in_field` per-hex-column band at `station.rs:919`, `dock_radius_m` sphere at `station_screen.rs:110-117`, and `nav_ui`'s invented `STATION_SOI_DOCK_RADII` at `nav_ui.rs:107`).

### 3.4 What gets rebased, and why there is no snap

```rust
pub fn rebase(b: &mut ShipBody, from: &Frame, to: &Frame) {
    let pw = from.origin + from.to_world_vec(b.pos);
    let vw = from.vel    + from.to_world_vec(b.vel);
    let qw = from.q * b.att;

    b.pos = to.from_world_vec(pw - to.origin);
    b.vel = to.from_world_vec(vw - to.vel);
    b.att = to.q.conjugate() * qw;
    // ang_vel is BODY-frame and carries across unchanged; the frame's own
    // 1.5e-3 rad/s is inside the inertial-frame budget above.

    // THE PART EVERY PROPOSAL GOT WRONG: ramp the damping ATTRACTOR,
    // not the coefficient. At s=1 this reproduces the OLD attractor exactly,
    // so damping acceleration is continuous across the boundary.
    b.damp_bias   = to.from_world_vec(from.vel - to.vel);
    b.damp_bias_t = 0.0;
    b.frame       = to.id;
}
```

**Position, velocity and orientation are bit-identical across the boundary** because `rebase` is an exact change of coordinates — the renderer (which reads the composed world pose), the chase cam, the save and MP all see nothing move. That is the correct no-snap argument, and it is why nothing is lerped.

**But the *derivative* is not automatically continuous**, and this is the flaw the judges found in all four designs. Before entry, damping pulls velocity toward world-rest; after entry, toward station-rest. Naively that steps the damping acceleration by `k_lin·|station_vel| = 0.4 × 15 = **6 m/s²**` — 0.24 g appearing out of nowhere with no thrust and no plume. `frame_blend` in the earlier proposals ramped `k_lin` from one value to *itself* (both frames read the same config key) and was a literal no-op.

The fix above ramps the **attractor**: `damp_bias` starts at the old frame's rest velocity expressed in the new frame (magnitude 15 m/s) and decays to zero over `frame_blend_s = 3 s`. At the instant of handoff `s = 1`, so the damping term is identical to the frame before. Over three seconds the attractor slides to station-rest and the ship settles alongside the casino. **That settle is ask #8**: letting go of the stick near the station now parks you at its 15 m/s absolute velocity. The HUD shows a `FRAME: STATION` badge and crossfades the navball prograde marker from world- to frame-relative over the same window.

Release at `ship_soi_release_m` is the exact inverse, and it hands the ship the station's orbital velocity back as free-world velocity — symmetric with what stepping off the deck already does at `player_ctrl.rs:1827`.

### 3.5 Reusing the existing machinery, not duplicating it

The on-foot integrator at `player_ctrl.rs:1741-1831` is the reference implementation and **stays**. Its capture-once discipline (`player_ctrl.rs:1748-1750` — derive local from world exactly *once* on entry, never re-derive) is the rule `rebase` follows, and it is what prevents the documented orbital-velocity leak. The single change on the walker side is deleting `&& !riding` from `player_ctrl.rs:1741` and routing both the walker and the ship through `frame::resolve`.

Three per-frame pose-overwrite sites die, because they are verbatim the "free world body plus per-frame corrections" pattern the station rule forbids:

- `app.rs::maybe_carry_docked_ship` (`app.rs:7979-8002`, called every frame from `app.rs:5891`) — hard-teleports the docked ship onto its pad.
- `station_screen::carry_docked_player` (`station_screen.rs:130-196`) — a 4 s wall-clock smoothstep tractor that overwrites position, velocity and basis.
- `rocket_ride::DOCKED_PAD` (`rocket_ride.rs:97`) as a separate frame representation.

Replaced by: **a docked ship is a `ShipBody` in `ShipFrame::Station` in `ShipMode::Landed`, pinned by the same contact resolve against the pad.** The tractor becomes an assist mode that damps `pos` toward `station::pad_top_local[i]` **inside `ship::step`** — a force, not a script.

`station_screen::dock_speed_ok` (`station_screen.rs:126`) now measures **frame-local** relative speed, which is the number it always meant. Keep `dock_max_rel_mps: 8.0` as a don't-ram-the-pad check and gate docking on the ship carrying a **Docking Clamp** part — the skill check becomes a build decision plus a soft-landing check rather than a hand-matched 15 m/s rendezvous. (See §10 Q4 if you want it to stay a piloting challenge.)

---

## 4. Modular ship data model

### 4.1 Graph

```rust
pub const SHIP_PART_MAX: usize = 24;
pub const ROOT: u8 = 255;

#[derive(Clone, Copy, PartialEq, Eq, Debug, Default)]
pub struct PartInst {
    pub item:    u16,
    pub parent:  u8,   // ROOT for parts[0]
    pub nodroll: u8,   // parent node index in bits 0..4, roll quarter-turn in bits 5..7
}
pub struct ShipGraph { pub parts: [PartInst; SHIP_PART_MAX], pub len: u8 }  // Copy, 98 bytes
```

`parts[0]` is the root. Every other part mates **its own node 0** to `parts[parent].nodes[node]`. Because `parent < self_index` by construction, **connectivity and acyclicity are free** — a whole class of validation disappears. `roll` is a quarter-turn detent (0..3) about the mating axis, so orientation is integral and cannot drift in a save.

`nodroll` packing is deliberate: `2·24 + 24 + 24 + 2 = 98 bytes`, which is **under** the current largest `MachineState` variant (`ChestInv` = 27 × 4 = 108 bytes). **`LaunchPadState` stays `Copy`, `MachineState`/`BlockEntity` stay `Copy`, no `.get()`/`entry()` call site in the tree changes, and no block entity in the world gets bigger.** Unpacked parallel arrays (minimal-surgery's `[u16;24]` + three `[u8;24]` = 122 bytes) would have grown every torch and chest in the world.

### 4.2 Part registry

New `crates/tenebris-core/src/ship_parts.rs` + `assets/config/ship_parts.yaml` with repeated `[part.<name>]` sections (the flat `match (section, key)` at `rocket.rs:416` genuinely cannot express repeated sections — this is the one place a new parser is justified, and the reason is stated in code).

```rust
pub struct AttachNode { pub pos: Vec3, pub dir: Vec3, pub kind: NodeKind } // Stack|Radial|Hardpoint
pub struct PartDef {
    pub item: ItemId, pub role: PartRole, pub mass_kg: f32, pub dry_mass_kg: f32,
    pub bbox: Vec3, pub nodes: Vec<AttachNode>,
    pub thrust_n: f32, pub fuel_per_s: f32, pub fuel_cap: f32,
    pub torque_nm: Vec3, pub lift_coef: f32, pub lift_area_m2: f32,
    pub contact_radius_m: f32, pub impact_tolerance_mps: f32,
    pub cargo_slots: u8, pub atmo_efficiency: f32,
    pub model: String, pub icon: String,
}
pub fn def(item: ItemId) -> Option<&PartDef>;
```

**This collapses five separate "what is a part" authorities into one table:** `rocket::part_role`'s if-chain (`rocket.rs:46`), `rocket::engine_kind` + `EngineKind` (`rocket.rs:35/27`), the fixed `[RocketModel; 3]` array (`rocket_fx.rs:79`), `hex_mesher::rocket_part_col`'s atlas match (`hex_mesher.rs:976`), and `rocket_screen::PART_ROWS` (`rocket_screen.rs:30`).

The `[engine]`, `[engine_vacuum]`, `[fuel_tank]`, `[command_module]` blocks **move out of `rocket.yaml` into `ship_parts.yaml` 1:1** — do not leave the numbers in two files for even one PR. Add a drift test `shipped_ship_parts_yaml_covers_every_part_item` that `include_str!`s the real file and asserts every item with a part role has `mass > 0`, a model path and an icon.

### 4.3 Derived properties — one geometry authority

```rust
pub fn solve_transforms(&ShipGraph) -> Vec<(DVec3, DQuat)>;   // depth-first, ship-local
pub fn mass_props(&ShipGraph, fuel_frac: f32) -> MassProps;
```

`solve_transforms` replaces `slot_off = i * PART_HEIGHT * ROCKET_SCALE` (`rocket_fx.rs:477`) **everywhere** — renderer, mass fold, thrust nodes, builder canvas — so the drawn geometry can never disagree with the physics. Child pose:

```
q_child = q_parent * align(-child.node0.dir → parent.node[n].dir) * rot(dir, 90°·roll)
p_child = p_parent + q_parent*parent.node[n].pos - q_child*child.node0.pos
```

`MassProps { mass_kg, com_local, inertia_diag, torque_nm, thrusters: Vec<Thruster>, fuel_cap, has_dock, cargo_slots, contacts }`, where `Thruster { r_local, dir_local, thrust_n, fuel_per_s }`. Tank mass interpolates dry→wet by fill fraction exactly as `StageActive::fuel_mass` does today (`rocket.rs:632`), so **CoM and inertia shift as tanks drain** — recomputed on a `mass_recalc_fuel_step` bucket (5%), not per frame, so the "pure fold" is not a per-frame allocation in the hot path.

**Fuel is one ship-wide pool.** Staging is gone.

### 4.4 Validation

`ship::validate(&ShipGraph) -> Vec<ShipFault>` keeps `RocketFault`'s exact shape, its ASCII `message()` contract and the `fault_messages_are_ascii` test (`rocket.rs:1228`). `EngineNotAtBottom` dies with the stack. New: `Empty`, `UnknownPart`, `NoCockpit`, `NoEngine`, `NoFuelTank`, `NodeOccupied`, `TooManyParts`, `Overlap` (AABB test on solved transforms), and `ThrustOffAxis(deg)` as a **warning**, not a launch block — off-axis engines torquing the hull is the parts-first payoff, and forbidding it flattens every ship back to the symmetric stack the design is trying to escape.

### 4.5 Save format — additive, and it degrades gracefully in *both* directions

**Pad (`block_entity::LaunchPadState`).** Keep the `:l:` arm exactly as-is for reading, and **write `:l:` whenever the graph is a plain vertical chain** so the common case is byte-identical and old clients/servers interoperate. Add a new `:m:` tag for branched graphs as a **flat, fixed-arity comma list of integers**, so the existing `nums()` helper (`block_entity.rs:868`) parses it verbatim:

```
:m:<segments>,<len>,item,parent,nodroll, item,parent,nodroll, ...
```

Three ints per node, no nested separator, no colon. (`:m:8,3,114,255,0,113,0,1,112,1,1` = a 3-part chain.)

**Ride (`persistence::PersistenceRide`).** Head stays at **exactly 20 fields** — do not touch `matches!(head.len(), 9|12|19|20)` (`persistence.rs:632`) or `docked: head.len() == 20` (`persistence.rs:685`). `parts` stays a plain `;`-joined u16 list so `if parts.is_empty() { return None }` (`persistence.rs:640`) can never trip. **Append trailing groups**, which `groups.next().unwrap_or("")` already tolerates:

```
head | parts | fuels | pad_stack | graph | att | frame
```
- `graph` — `;`-joined `parent.nodroll` pairs, index-aligned with `parts`. Absent ⇒ vertical chain via `decode_legacy_chain`.
- `att` — `qx;qy;qz;qw`, frame-local. Absent ⇒ derived from `ship_up` with zero roll. **This finally fixes the parked-roll loss** (`app.rs:7457` passes `roll_ref: (0,0,0)` today).
- `frame` — `kind;ref`. Absent ⇒ derived from `docked`.

This is strictly better than every proposal's head-growth: an **old binary reading a new save** reads `parts` and gets the right ship as a vertical chain rather than losing it, and a **new binary reading any of the four legacy head lengths** works unchanged.

`ship::decode_legacy_chain(&[u16]) -> ShipGraph` (part *i* parented to *i-1* on the axial-top node, roll 0) is the entire migration story for both formats. **One caveat the proposals missed:** the legacy stacks are often *multi-stage* (`RocketRide::remaining_parts`, `rocket.rs:688`, regenerates engine/tank/engine/tank/capsule), and a mid-chain engine has no free node above it. The chain decoder must therefore **not** run `validate` — it produces a graph directly, and mid-chain engines get an implicit `Stack` pass-through node in their `PartDef` so a legacy two-stage rocket loads as one long ship.

**Also fixed here:** `save_snapshot` hard-codes `body_id: 0` in both branches (`rocket_ride.rs:503` and `:545`) while `app.rs:4524` restores only when `r.body_id == body_id` — a **live despawn-on-reload for any ship parked on Sequoia or a moon**. Write the real active body id.

---

## 5. Builder UI

**Extend `crates/tenebris-client/src/rocket_screen.rs` in place.** The door does not move: `Block::LaunchPad => rocket_screen::open` (`app.rs:8436`), the `[F] open rocket` prompt (`app.rs:3806`), `screens.rs:77`, and `rocket_screen::open/close/init/handle_event` (`rocket_screen.rs:83/74/58/104`) all keep their signatures. Ask #2 is honoured by not touching them.

Reused wholesale, nothing reinvented: `slot_dnd::wire<A>` / `slot_dnd::ghost<A>` (`slot_dnd.rs:26/44`), `ui_icons::slot` (`ui_icons.rs:280`), and the collect-during-layout / apply-after-layout discipline from `furnace_screen.rs:117-300` (the panel holds the world and player borrows during layout). Panel-local address type:

```rust
enum Addr { Palette(ItemId), Hot(usize), Bag(usize), Node(u8 /*part*/, u8 /*node*/), Part(u8) }
```

egui keys drag payloads by type, so a builder drag can never cross-drop into the furnace panel.

**Four panes:**

- **Left — PARTS.** An icon *grid* from `ship_parts::def` entries, each an `ui_icons::slot` with the count from `bag::available` (hotbar + bag). Dimmed at zero. Deletes `PART_ROWS` (`rocket_screen.rs:30`, a second source of truth) and the private `part_icon` (`rocket_screen.rs:149`, a duplicate of the shared slot widget).
- **Centre — BLUEPRINT.** A **live 3D preview**, not an icon diagram. Reuse the same `rocket_fx` draw path fed by `ship::solve_transforms` into a small render target, orbitable with left-drag (this is the *one* place I overrule three of the four proposals: an isometric grid of inventory thumbnails means you never see the ship you are building, which is the entire pleasure of a modular builder, and after step 7 the real mesh is one call away). Free attach nodes render as small rings, brightening when a compatible part is dragged. A crosshair marks the CoM and a dashed line the net thrust axis, so `ThrustOffAxis` is visible before it is a fault. **Symmetry mode** (1× / 2× / 3× / 6×, matching the hex world) mirrors placement about the nose axis — non-negotiable, or four RCS quads is four drags plus four roll cycles.
- **Right — SHIP.** Mass dry/wet, CoM offset, TWR against `planet::SURFACE_GRAVITY_MPS2_PER_G`, **derived cruise speed** `a_max/k_lin`, per-axis turn rate `τ/(I·k_ang)`, fuel-seconds at full throttle, part count / `max_parts`, then the red `ShipFault` list. No delta-v — it is a Kepler budget metric with no meaning here.
- **Bottom — YOUR ITEMS.** The hotbar row (9) **and** the bag rows (27) as one grid, per the standing hotbar rule. This fixes a live bug: `rocket_screen` today reads only `p.bag` (`rocket_screen.rs:202/327/331/341`) and literally cannot see a fuel tank on your hotbar. All movement routes through `bag::available` / `bag::give` (`bag.rs:215/227`), hotbar-first on give.

**Every mutation** — attach, detach subtree, roll, re-parent, symmetry place — calls `rocket_screen::persist` (`rocket_screen.rs:134`) on the **same input frame**, at the same point in the call graph as today's `push`/`pop` (`rocket_screen.rs:328/337/343`). No `[Save]` button; a deferred save is a rule violation.

**Launch** keeps its shape (`rocket_screen.rs:347-379`): `ship::validate` gate → build `ShipBody` → `rocket_ride::begin`. The pad **keeps its graph** (the existing anti-dupe rule, `rocket_screen.rs:352-357`), so respawn re-boards rather than duplicating crafted parts, and `rocket_fx::in_flight_pad` (`rocket_fx.rs:345`) keeps hiding the pad's static copy.

**The launch pad's role.** It stays the assembly bench and the respawn anchor, and it gains one thing it does not have today: `LaunchPadState.segments` (currently defaulted to 8 and never raised by anything — `LaunchTower` is pure gantry decoration, `rocket_fx.rs:600`) becomes the **ship size budget**. Each Launch Tower placed adjacent raises `segments` by 8, capped at `max_parts`. That turns the tower from scenery into the progression gate for bigger hulls, at the cost of one adjacency scan.

Deleted from this screen: `draw_flight_panel` (`rocket_screen.rs:389-436`) and the `RocketFlight::step` call (`rocket_screen.rs:117-130`), which are the UI of a second, dead 1-D flight sim.

---

## 6. Part roster

Existing ids keep their items and recipes. New ids start at **163** (150-155 are fish; max live id is `ROCK = 162`). All ten land far below the 192-slot `tech_tree::Discovered` bitset ceiling (`tech_tree.rs:39`, `DISCO_WORDS = 3`). Every part ships its `.obj`, world texture and 32×32 icon **in the same change** (static-asset + item-visuals rules), generated deterministically by a new `tools/gen-ship-parts.py`.

| Part | id | Role · Tier | Key stats | Attach nodes | Visual |
|---|---|---|---|---|---|
| **Cockpit Module** | 114 *(existing)* | Cockpit · T3<br>copper 4 + iron 3 + circuit 1 | 200 kg · torque **6 kN·m** all axes · 3 cargo slots · seat at (0,0,0.4) | 1 Stack aft, 4 Radial | Existing `rocket_command_module.obj`, retextured: blunt off-white hex capsule, smoked-amber canopy band across the +Y (roll-reference) face so "up" reads at a glance, two bronze grab rails, black RCS ports on the shoulders. |
| **Hull Truss** | **163** | Structure · T2<br>iron 3 + bronze 1 | 40 kg · no stats · this is the part that makes ships **wide** | 2 Stack (fore/aft) + 4 Radial mid-span | Open hex lattice 2 m long: six gunmetal longerons with X-bracing, pale-bronze machined end collars, one yellow/black hazard chevron on the fore collar. Deliberately visually quiet — it is scaffolding. |
| **Hull Plate** | **164** | Structure · T2<br>iron 6 + bronze 2 | 120 kg · +0.010 linear damp · +0.05 angular damp | 6 (all Stack/Radial) | Solid 2 m riveted box: off-white ceramic panels on a fine seam grid, bronze rivet strip down each edge, scorch gradient on the aft face so a stack shows re-entry wear. |
| **Fuel Tank** | 113 *(existing)* | Tank · T2<br>iron 5 | cap 100 · wet 500 / dry 50 kg | 2 Stack | Existing `rocket_fuel_tank.obj`: brushed-aluminium hex cylinder, two dark strap bands, orange fill-port decal, frost patches near the base. |
| **Radial Tank** | **165** | Tank · T2<br>iron 3 | cap 40 · wet 190 / dry 22 kg · +0.006 linear damp | 1 Radial | Stubby capsule pod, half the main tank's length, matte orange with one white spine stripe, grey clamp-ring collar at the mount and a rounded nose cap. |
| **Main Thruster** | 112 *(existing)* | Engine · T2<br>bronze 3 + iron 2 | 75 kN · 10 fuel/s · 100 kg · atmo_eff 1.0 | 1 Stack fore | Existing `rocket_engine.obj`: short wide bell, soot-darkened rim grading to scorched copper at the throat, four turbopump lines wrapping the shoulder. |
| **Cruise Thruster** | 149 *(existing — closes two gaps)* | Engine · T3<br>**NEW recipe:** bronze 2 + iron 3 + circuit 1 | 30 kN · 3 fuel/s · 80 kg · atmo_eff 0.45 | 1 Stack fore | **NEW `ship_cruise_thruster.obj`** — today it cheats by reusing the main engine at 0.62 scale (`rocket_fx.rs:476-481`) and has **no crafting recipe anywhere**. Long slender nozzle, ~1.6× the main engine's length at half its mouth: pale ceramic throat, nickel regenerative-cooling coils spiralling the barrel, cyan igniter ring. Must read "long and thin" beside the main engine's "short and fat". |
| **RCS Quad** | **166** | Rcs · T3<br>bronze 2 + wire 2 | torque **3 kN·m**/axis · lateral 4 kN · 0.15 fuel/s · 25 kg. Torque scales with `\|r − com\|`, so quads on the extremities out-turn quads bunched at the middle | 1 Radial | 40 cm chamfered cube, four short cones at 90°, white body with black nozzle throats and a yellow/black chevron band at the mount face. Fires a 0.15-scale puff through the existing plume path. |
| **Gyro Stabiliser** | **167** | Gyro · T3<br>iron 4 + copper 3 + circuit 2 | torque **40 kN·m** all axes · +0.9 angular damp · **no fuel** · 90 kg. The part that makes a heavy hull controllable | 2 Stack | Caged flywheel: grey drum with large cut-away windows showing a polished brass ring on a dark gimbal yoke, two amber status lights. The ring spins in-render at a rate proportional to `\|ω\|` so the part visibly does its job. |
| **Control Fin** | **168** | Aero · T2<br>iron 2 + bronze 1 | lift_area 2.4 m² · lift_coef 0.9 · +0.35 roll damp *in atmosphere only* · +0.020 linear damp · 45 kg | 1 Radial (mirrors in symmetry mode) | Swept delta ~2.2 m span: dark grey composite with a chordwise rib pattern, polished bronze leading edge, a lighter hinged trailing flap that deflects in-render with roll input. |
| **Landing Strut** | **169** | Gear · T2<br>iron 3 + bronze 1 | 55 kg · contact_radius 0.35 m · foot 1.4 m below mount · impact tolerance 12 m/s. **Supplies the contact points §2.6 resolves against** | 1 Radial (3+ for a stable stance) | Folded A-frame: two grey tubular struts on a black round foot pad, bronze pivot boss, visible hydraulic damper with a chrome piston. Stows flush, extends below a config altitude. |
| **Docking Clamp** | **170** | Dock · T3<br>iron 3 + copper 2 + circuit 1 | 70 kg · `has_dock` gates station capture | 2 Stack (mate face + hull) | Androgynous ring collar: grey annulus, three inward latch hooks at 120°, rubberised black seal face, ring of white guide LEDs that go amber inside the station SOI and solid green on capture. |
| **Cargo Pod** | **171** | Cargo · T3<br>iron 5 + bronze 3 | 90 kg empty · **+9 slots** · cargo mass adds to `mass_kg` | 2 Stack + 2 Radial | Ribbed hex container 2.8 m long: olive-drab panels, broad white horizontal stripe, four recessed corner lock fittings, hinged end door with a black chevron and a stencilled load-rating decal. |

**Cargo Pod is not a stat line.** It is a new world-mutating store and must ship with: a slot-grid panel showing **hotbar + bag** alongside the pod (the hotbar rule), all movement through `bag::available`/`give`, a `cargo` trailing group in the ride save, and a `sp_save_now()` on every mutation. If that is out of scope for the milestone, ship the pod as +mass with no slots and add the store later — do **not** half-wire it.

**Also fix while here:** `items::print_recipes` (`items.rs:543`) is a second recipe authority whose costs already **disagree** with `recipes.yaml` (rocket-engine bronze 4 vs 3, fuel-tank iron 6 vs 5, launch-pad iron4+stone4 vs iron4+bronze2). Fold it into `recipes.yaml` with a station tag before adding ten parts to two drifted tables.

---

## 7. What gets ripped

| file:symbol | Why | Replacement |
|---|---|---|
| `nav.rs:71` `Conic` (+ `from_state:101`, `from_state_around:109`, `sample:182`, `state_at:226`, `time_from_nu:326`, `time_to_point:367`) | The two-body conic solve **is** ask #1 | Nothing — a forward velocity ray on the surviving `nav_ui::arrow` |
| `nav.rs:399/418/467` `PatchedLeg` / `find_soi_crossing` / `patched_trajectory` | Patched conics; also compares SOI bodies by **name string** | `frame::resolve` — a swept distance test with hysteresis |
| `nav.rs:509/519/542/568` `burn_basis` / `BurnPlan` / `plan_burn` / `available_dv` | Maneuver planning; `available_dv` is dead and duplicates `rocket.rs:733` | Point and burn |
| `nav.rs:32` `dominant_body` | Two disagreeing SOI answers (boot-order-dependent via `planet::sun_mu`, and a documented mid-orbit flip near Sequoia, `nav_ui.rs:2127`) | `planet::gravity_at`, already computed once per frame at `player_ctrl.rs:1358` |
| `nav_ui.rs:190-257` + `498-841` — the whole maneuver-node system (`Node`, `place_node_at`, `node_plan`, `draw_node`, `gizmo_pick/hover/drag/release`, `trajectory_pick`, `node_slide_to`, `node_delete_pick`) ≈420 lines | No nodes in an arcade ship | Collapses the LMB chain at `app.rs:8241-8268` to "SAS button, else chase camera" |
| `nav_ui.rs:639/657/666/876/893/929` orbit pick cache, `draw_conic_track`, `dashed_soi_marker`, `draw_patched_conics` | The conic render + click layer | Velocity ray; inside a station SOI, a closing-rate corridor to the pad |
| `nav_ui.rs:1469` — 5 of 10 `AttMode` variants (Normal, Antinormal, RadialOut, RadialIn, Maneuver) | Each needs an angular-momentum vector, a focus body, or a burn plan | `FrameProgradeRel` / `FrameRetroRel` / Target / AntiTarget / KillRot / Hold. **`AttMode::ALL` (`nav_ui.rs:1484`) and `AP_BUTTONS: [BtnRect; 10]` (`nav_ui.rs:355/434`) plus the 2×5 layout at `:428` must all change together — a mismatch is an out-of-bounds panic, not a compile error.** |
| `nav_ui.rs:1940` `readout_lines` orbit + node blocks | Ap/Pe/period/eccentricity/countdown | Speed, throttle %, assist state, altitude, target range **and relative velocity**, `FRAME: STATION` badge |
| `player_ctrl.rs:1888-1900` + `2169-2175` + `2264-2277` | Two duplicated thrust rules; the second is nested in the walker branch | One `ship::step` call |
| `player_ctrl.rs:1741` the `&& !riding` clause | The single boolean excluding ships from the station frame | `frame::resolve` for walker and ship alike |
| `app.rs:7979` `maybe_carry_docked_ship`; `station_screen.rs:130-196` tractor pose overwrite; `rocket_ride.rs:97` `DOCKED_PAD` | The forbidden free-body-plus-corrections pattern | A `ShipBody` in `Station` frame, `Landed` mode, pinned by contact |
| `rocket.rs:568/593/624/844/775` `StageSpec`/`stages`/`StageActive`/`stage()`/`active_stage_parts`, `rocket.rs:733` `delta_v_mps`, `app.rs:7870` `rocket_stage_action`, `controls.yaml:82` Stage keybind | Staging is a multi-stage-orbital concept | One fuel pool; fuel-seconds + cruise speed on the HUD. `falling_stage` is **re-targeted** as generic debris, not deleted |
| `rocket.rs:879-998` `RocketFlight`/`FlightState`/`step` + tests `1384-1448`; `rocket_screen.rs:117-130`/`389-436` | A **second, unused** 1-D flight sim whose 5 tests read as flight coverage | `ship::step` |
| `rocket.rs:1007-1080` `LaunchPad` + tests `1451/1478` | A **third** pad-stack representation, zero non-test callers | `block_entity::LaunchPadState` |
| `rocket.rs:18/27/35/46` `PartRole`/`EngineKind`/`engine_kind`/`part_role`; `rocket_fx.rs:79` `[RocketModel; 3]`; `hex_mesher.rs:976` `rocket_part_col`; `rocket_screen.rs:30` `PART_ROWS` | Five authorities for "what is a part" | `ship_parts::def()` |
| `rocket_ride.rs:148` `clear()` | The literal mechanism of the never-despawn bug; already zero production callers | `park()` — the only exit path |
| `rocket_ride.rs:84/89` `LAST_VEL`/`PENDING_VEL` + `app.rs:5222`/`7393` | Workarounds that exist only because velocity lived on the player | `ShipBody.vel` |
| `rocket_fx.rs:176/197` `basis_up`/`basis_up_fwd`; `rocket_fx.rs:241-315` `draw_frustum`; `rocket_fx.rs:332` `ride_center` | Orientation re-derived from two vectors with a singular fallback; a skirt that exists to hide a stack seam **and carries a live floating-origin bug**; a ship centre synthesized from part *count* | `DQuat → Mat4`; nothing (nodes mate flush); `ship::center()` from real bounds/CoM, keeping the one-function contract its 8 callers rely on |
| `hex_mesher.rs:990` `emit_rocket_stack` + `:976` + atlas cols 90-92 (`renderer.rs:373-375`) | Verified zero callers — a dead second ship renderer | Nothing |
| `orbit.rs:400` `world_to_heliocentric`; `orbit.rs:264` `moon_track` | Zero callers; strict subset of `body_track:297` | `body_track` at `nav_ui.rs:1331` |
| `rocket.yaml [flight]` `gravity_mps2`, `launch_alt_m`, `safe_landing_mps`, `drag_coef`, `parachute_drag` | A hand-synced duplicate of `planet.rs:886` + four dead knobs | `planet::SURFACE_GRAVITY_MPS2_PER_G`; `[ship]` |
| `app.rs:1402-1471` `TENEBRIS_DEV_PLANNER` | Depends on the Kepler stack end to end | A dev hook that parks a ship at the station approach radius |

---

## 8. What explicitly stays

| file:symbol | Why it survives |
|---|---|
| `orbit.rs:85/229/287/297/324/363/377` `elements`/`heliocentric_pos`/`apparent_star_pos`/`body_track`/`spin_angle`/`sun_direction`/`apparent_pos` | **Ask #7 in code.** Highest-fanout module in the tree; `sun_direction` alone drives lighting, atmosphere and `fauna.rs:768`'s night gate |
| `planet.rs:899` `orbital_gravity_at` | **Ask #5.** One call, untouched, from `ship::step`. Still serves `falling_stage.rs:106` |
| `planet.rs:689` `reposition_heliocentric` | Bodies stay parked at t=0. Deliberate — see §10 Q1 |
| `station.rs:771/780/787/795/804` `orbit_radius_m`/`orbit_speed_mps`/`orbit_period_s`/`orbit_pos`/`orbit_vel` | The casino keeps orbiting on rails. Closed-form in world time, zero stored state, so server-resume time compression stays free |
| `station.rs:940/949/958` the three map operators | **Lifted into `frame.rs`, not rewritten** (never-rebuild rule) |
| `player_ctrl.rs:1741-1831` the on-foot station integrator | The reference implementation of the **station stationary-frame rule** — capture once, integrate local, compose world. `ship::rebase` mirrors it deliberately so the two cannot drift |
| `player_ctrl.rs:373/380` `quat_from_basis`/`basis_from_quat` + test `:4225` | The **quaternion rule** bridge, now *promoted*: the DQuat becomes the stored authority instead of a per-frame round trip |
| `nav.rs:586/600/620/643` `AttGains`/`AttPidState`/`attitude_error`/`attitude_pid_step` + tests `:719/:752` | Orbit-agnostic shortest-arc + PID. Kept as a **rate** controller under a new torque loop so the gains, the deadband and both tests stay valid |
| `rocket_ride.rs:126/169/181/283/316/345/564/577` `begin`/`forget`/`park`/`board_parked`/`respawn`/`in_flight_pad`/`sp_save_now`/`restore_snapshot` + all 8 tests `:654-819` | **The never-despawn contract.** Behaviour preserved byte-for-byte: exit PARKS, the pad keeps its parts so respawn cannot duplicate, `board_parked` puts the ship back if the graph no longer validates, `forget()` stays non-persisting so a world switch cannot stomp the incoming save. Only the payload widens |
| `persistence.rs:578/621` `save_ride`/`load_ride` + the 9/12/19/20 ladder | Extended by trailing groups only. **No existing save becomes unreadable** |
| `block_entity.rs:151/439/448/847/951` `LaunchPadState` + accessors + the `:l:` codec | The pad is world state and MP-synced. `:l:` preserved verbatim for chain ships |
| `rocket_screen.rs:58/74/83/104/134` + `app.rs:8436` + `screens.rs:77` | **Ask #2** — the launch pad door does not move |
| `rocket_cam.rs:41-256` | Frame-agnostic, f64-clean; its `eye()` is what makes the render origin follow the ship |
| `nav_ui.rs:527` `project` + `:1078-1254` `line_pip`/`hud_pip`/`set_remap`/`vtx`/`line_strip`/`cross_marker`/`circle`/`arrow` | The overlay substrate. The eye-shell remap and the f64-relative projector encode **three separately-fixed** floating-origin/clipping bugs. **Split into `nav_overlay.rs` BEFORE any deletion** |
| `nav_ui.rs:1767-1907`, `1925-1934` the navball sphere, clipper, rim, nose crosshair; `:340-496` the hit-tested SAS cluster | Attitude presentation is exactly what a standard ship wants; a real drawn hit-testable panel per the UI rule. Only the marker roster shrinks |
| `nav_ui.rs:127-178/845/855` `Target`/`cycle_target`/`target_state` | Ask #8's data source. **Extended:** `target_state` returns zero velocity for every body (`nav_ui.rs:858-861`) — fix by finite-differencing `orbit::apparent_pos` |
| `solar_map.rs` (all 867 lines) | Its only Kepler coupling is `nav_ui::gizmo_dragging()` at `:513` — one condition. Do not touch the f64 `mat4_look_at_dir` trick at `:296-305` |
| `station_fx.rs:314/547` `bake`/`draw` + `shaders/station_mesh.rs` | Kept **and adopted as the ship renderer template**: bake local geometry once into a texture-grouped VB, pose per frame. A 24-part hull re-recorded through sokol_gl every frame hits the same wall that forced the station off that path, and the world sgl context has a hard 256k-vertex budget (`renderer.rs:2207`) that silently blanks the whole context on overflow. Clone `station_mesh` (hand-written `#version 410`, explicit `layout(location)`) — no byte-array shaders |
| `slot_dnd.rs:26/44`, `ui_icons.rs:280/219/249`, `bag.rs:215/227`, `furnace_screen.rs:117-300` | The builder is assembled from these |
| `crafting.rs` + `recipes.yaml` + `tech_tree.rs` | Progression is already data-driven; new parts appear automatically |
| `player_ctrl.rs:1055-1297` `jerk_log` | Mandatory runtime diagnostic. **Expect it to fire on every rebase** unless the composed pose path is followed — that alarm is the point |
| `lod.yaml:107` `space_drag` | **The on-foot spacewalk's damping.** Not a duplicate of anything (fact #1) |

---

## 9. Migration plan

Nine steps. Each is independently shippable; the game is playable after every one.

### Step 1 — Dead-code sweep + two bug fixes *(risk: low)*

Delete `rocket::LaunchPad` (`rocket.rs:1007-1080`, tests `1451/1478`), `RocketFlight`/`FlightState`/`step` (`rocket.rs:879-998`, tests `1384-1448`) and `rocket_screen::draw_flight_panel` (`rocket_screen.rs:389-436`), `nav::available_dv` (`nav.rs:568`), `Conic::from_state_around` (`nav.rs:109`), `orbit::world_to_heliocentric` (`orbit.rs:400`), `hex_mesher::emit_rocket_stack`/`rocket_part_col` (`hex_mesher.rs:990/976`) + atlas cols 90-92, `rocket_ride::clear()` (`rocket_ride.rs:148`). Fold `orbit::moon_track` into `body_track`. Fix `rocket_ride.rs:503/545` `body_id: 0`. Rebase `draw_tower_cutout` verts by `camera_world_d` (`renderer.rs:7125`).

**Files:** `rocket.rs`, `nav.rs`, `orbit.rs`, `hex_mesher.rs`, `renderer.rs`, `rocket_ride.rs`, `rocket_screen.rs`, `nav_ui.rs`
**Tests:** existing suites green unmodified; the `body_id` fix gets a round-trip test on a Sequoia-parked ride.
**Playable:** yes — every symbol removed has verified-zero production callers. The Test Flight button disappears; ships parked off Tenebris now survive a reload; the launch tower stops drawing displaced (a full planet radius on Tenebris, ~20 km on Sequoia).

### Step 2 — Split station frame from station probe *(risk: low)*

`station::frame_basis(t) -> Frame` + `station::probe(&Frame, world_pos) -> ColumnProbe`, with a thin `frame_sample` shim so all seven call sites compile unchanged. Point `station_fx.rs:569-572` at `frame_basis` instead of re-deriving the basis.

**Files:** `station.rs:872-963`, `station_fx.rs`, new `frame.rs` skeleton
**Tests:** `station.rs:1722-1900` green **bit-for-bit**.
**Playable:** yes — pure refactor. Per-frame Mutex + span-cache traffic drops measurably.
**Watch:** the flipped-wheel `up` convention (`station.rs:882-887`) must move with the basis or the deck normal inverts and the walker falls off the station.

### Step 3 — Land `ship.rs` + `ship_parts.rs`, unwired *(risk: low-medium)*

`PartInst`/`ShipGraph`/`PartDef`/`def()`/`solve_transforms`/`mass_props`/`validate`/`encode`/`decode`/`decode_legacy_chain`/`ShipBody`/`ship::step`. Move the four existing part blocks out of `rocket.yaml` into `ship_parts.yaml` 1:1. Add the `[ship]` section + parser arms.

**Files:** new `ship.rs`, `ship_parts.rs`, `assets/config/ship_parts.yaml`; `rocket.rs` (parser), `rocket.yaml`, `lib.rs`
**Tests:** `decode(encode(g)) == g` for every shape; a legacy 6-part two-stage chain decodes to the geometry `draw_stack` produces today; `mass_props` of the starter matches `RocketSpec::from_parts`; damping test asserts terminal cruise within 1% of the closed form; a `+Z`-nose convention pin; both shipped-YAML drift tests.
**Playable:** yes — additive dead code behind tests.
**Watch:** `planet::test_support::lock_and_reset` — `cargo test` runs every module in one process against the global `BODIES` Mutex.

### Step 4 — Wire the integrator, **feel-identical** *(risk: HIGH)*

Replace `player_ctrl.rs:1888-1918` and `2169-2175` with: borrow the ridden `ShipBody`, call `ship::step`, compose `p.position/p.velocity/p.basis` from the ship pose. `RIDE` holds a `ShipBody`. Ship with `linear_damp_hz`/`angular_damp_hz` set to the **compiled defaults of 0** and `max_ang_rate_rads == steer_rate_rads` and infinite inertia, so the arithmetic is identical to today. Add the `if riding { skip }` guard before `player_ctrl.rs:2361` **and** the ship contact resolve (§2.6) **in this same commit**.

**Files:** `player_ctrl.rs:395-460, 1888-1922, 2140-2300, 2361`, `rocket_ride.rs`, `ship.rs`
**Tests:** `pinned_space_mode_suite` (`player_ctrl.rs:3739-3818`, bit-exact f64) and `starter_rocket_test_launch_reaches_orbit` (`:3908-4038`) **must pass unmodified** — that is this step's entire acceptance criterion. Pin `frame == World` so composition is identity. New: a ship rests on the pad at TWR<1; a ship lands on struts without clipping.
**Playable:** yes, and identical.
**Watch:** this is where the ship stops being the player. It touches the chase-cam anchor, the plume anchor, the `StageView` build (`app.rs:7410`), `jerk_log`, the autosave path, and ~45 `is_riding()` gates — **keep `is_riding()` as the derived predicate** so none of those gates change. Per the standing rules, **ask the user to fly, roll through the poles, and confirm no orientation flip** before merging.

### Step 5 — Rip the orbital UI *(risk: medium)*

**First commit of the PR:** extract `nav_overlay.rs`. **Then** delete the node system, the conic layer, the six dying `nav_ui` entry points in `app.rs:8241-8268`, the two egui node buttons (`app.rs:8111-8125`), the dev planner (`app.rs:1402-1471`), and `solar_map.rs:513`'s `gizmo_dragging` condition. Shrink `AttMode::ALL`, `AP_BUTTONS` and the layout together. Repoint `navball_up` off `dominant_body` onto `planet::gravity_at`. Delete `nav.rs` down to the attitude PID, which moves to `ship.rs`.

**Files:** `nav.rs`, `nav_ui.rs`, new `nav_overlay.rs`, `app.rs`, `solar_map.rs`
**Tests:** `target_cycle_visits_everything_and_wraps` (`nav_ui.rs:2006`) and `ball_space_is_the_steering_frame` (`:2087`) survive. The station-crosses-Sequoia's-field property (`:2127`) documents a real tuning fact — **re-pin it in core**, do not just delete it.
**Playable:** yes. Left-drag now unambiguously orbits the chase camera, which the user will notice immediately.

### Step 6 — Turn on arcade flight *(risk: HIGH, user-verified only)*

Set the real `[ship]` numbers. Give the ship real inertia, `ang_vel`, torque, analog throttle and the cascaded assist controller. Add the three control actions to **both** `controls.yaml` and `default_bindings`, extend the drift test, and reconcile the pre-existing E/F interact drift.

**Files:** `ship.rs`, `rocket.yaml`, `controls.rs`, `assets/config/controls.yaml`, `player_ctrl.rs`
**Tests:** re-pin `pinned_space_mode_suite` and delete/replace `starter_rocket_test_launch_reaches_orbit` (orbits decay by design now) with: a hover test (constant thrust reaches terminal within 2% of the closed form), a spin-down test (`ω` under 1% within `4/k_ang`), a pole-crossing roll-preservation test, and a shipped-yaml-matches-defaults test for `[ship]`.
**Playable:** yes, and this is the commit where the game becomes what the user asked for.
**Watch:** must land in the same release window as step 5, never before it. Every value balanced against drag-free coasting needs a look. **Requires in-game confirmation of feel and of pole-crossing roll — green tests are not proof here.**

### Step 7 — Frame handoff *(risk: medium-high)*

`frame::resolve` with the swept enter test and hysteresis, `rebase` with the `damp_bias` attractor ramp, the `station.yaml` keys. Delete `&& !riding` (`player_ctrl.rs:1741`), `maybe_carry_docked_ship` (`app.rs:7979`) and the tractor's pose overwrite. Docking becomes a local-frame damped approach in `ship::step`, gated on `has_dock`; `dock_speed_ok` measures frame-local speed. Add the `FRAME: STATION` badge and target-relative navball markers.

**Files:** `frame.rs`, `station.rs`, `station.yaml`, `player_ctrl.rs:1741`, `app.rs:5891/7979/8397-8429`, `station_screen.rs:110-262`, `nav_ui.rs`
**Tests:** the regressions this area has **never had** — a jump on the deck lands on the deck; `World→Station→World` returns pose, velocity **and attitude** within 1e-9; a 197 m/s SOI crossing shows zero world-pose discontinuity **and** a damping-acceleration step under 0.05 m/s²; enter/exit does not chatter on a tangential pass.
**Playable:** yes; station approach becomes the feature.
**Watch:** **capture once, never re-derive local from world per frame** — that is the documented velocity leak. `teleport_ride_to_station` (`player_ctrl.rs:3138-3162`) already does the hard-snap version and becomes the soft path's target-state function; do not leave two. **In-game confirmation: fly in fast, fly in slow, dock, undock, exit while docked, reload.**

### Step 8 — Storage + save migration *(risk: HIGHEST)*

`LaunchPadState { parts: [PartInst; 24], len, segments }`, still `Copy`. `:m:` record beside the untouched `:l:` reader, `:l:` still *written* for chain ships. `PersistenceRide` trailing groups (`graph`/`att`/`frame`), head unchanged at 20. `Parked { ship: ShipBody, origin }`; `advance_parked` becomes `ship::step` with `ShipMode::Parked` and `parked_anchor` holding station. Wire `segments` to Launch Tower adjacency.

**Files:** `block_entity.rs:49/151-216/847/951`, `persistence.rs:536-700`, `rocket_ride.rs:44-330/492-630`, `net_client.rs:1739`, `server.rs:1900`, `rocket_screen.rs:328-343`
**Tests:** a real migration corpus — a saved 20-field riding ride, a 20-field parked ride, a 19-field docked ride, a 12-field legacy ride, a 9-field ride, and an old `:l:` pad record must **all** load into the identical vertical ship; a `:m:` record round-trips through `record_write`/`record_parse`; a chain ship's on-disk bytes are byte-identical to pre-step-8.
**Playable:** yes.
**Watch:** this is the **standing all-caps never-despawn bug's** save path plus the MP wire format. Ship the legacy readers; never a converter that rewrites saves in place. **In-game confirmation: exit mid-flight, exit docked, reload, re-board — on Tenebris *and* on Sequoia** (step 1's `body_id` fix is what makes the Sequoia case testable at all).

### Step 9 — Builder + parts + art *(risk: medium)*

Rewrite `rocket_screen::egui_ui`'s body as the four-pane builder with symmetry mode and the live 3D preview. Add the seven new parts (163-171) with recipes, icons and OBJs, plus the cruise thruster's own model and its missing recipe. `rocket_fx::draw_stack`'s linear loop becomes `ship::solve_transforms`; adopt the `station_fx` bake-once architecture; `rocket_tex_img: [sg::Image; 4]` (`renderer.rs:1908`) becomes a registry-keyed Vec with the tower moved out of it. `draw_plume` takes a list of `(nozzle, axis, throttle)`. Fold `items::print_recipes` into `recipes.yaml`.

**Files:** `rocket_screen.rs`, `items.rs`, `recipes.yaml`, `ui_icons.rs`, `rocket_fx.rs:461-687`, `renderer.rs:1908/2663`, new `assets/models/ship_*.obj`, `assets/textures/items/*.png`, `tools/gen-ship-parts.py`
**Tests:** the icon/model coverage test from step 3 now covers all eleven parts; every new id < 192.
**Playable:** yes — this is where ask #3 becomes playable. Steps 4-8 all run the old Add/Remove-Top panel, which the graph model represents exactly.
**Watch:** keep **one** renderer (`rocket_fx.rs:455-460` records that a forked ridden-rocket renderer drifted user-visibly within a day). `print_recipes` currently disagrees with the yaml on three items — call the reconciliation out to the user as a deliberate cost change.

---

## 10. Risks + open questions

**Q1 — Do planets physically orbit, or is the render motion what you meant?**
This plan keeps them **parked**: `reposition_heliocentric` runs once at boot, gravity reads frozen anchors, and `renderer::update_celestial` animates them. That is zero work and matches what you already see. The literal reading — gravity sources actually move — touches the parked `BODIES` table, `orbital_gravity_at`, the active-body static-render-anchor trick (`orbit.rs:12-18`), `station::orbit_pos` (built on `planet::get(Tenebris).pos_*`), terrain anchoring, chunk streaming and every world-space save. **Decide before step 1.** *(A) Keep render-only motion — recommended, zero cost. (B) Make bodies time-varying — a separate project of comparable size to this one.*

**Q2 — MP: a branched ship on an old peer is data loss, not degradation.**
`record_parse`'s `_ => {}` arm returns a *default* entity (`block_entity.rs:975`), and the server re-serializes and broadcasts its store (`server.rs:487/1900`). So one un-upgraded client sees a `:m:` pad as empty and pushes that emptiness back. Writing `:l:` for chain ships means the common case is safe, but branched ships need a real answer. *(A) Bump the proto version and refuse older clients when the world contains a branched pad — clean, breaks old-client compat. (B) Make `record_parse` return `None` for unknown tags and teach the store to preserve unparsed records verbatim — keeps compat, costs a non-`Copy` side table on the server. (C) SP-only branched ships for this milestone; MP ships stay vertical.*

**Q3 — One ship or a fleet?**
Everything today is a single `Option`: one `RIDE`, one `PARKED`, one `DOCKED_PAD`, one ride record per world key. A modular *builder* strongly implies owning several hulls. A fleet needs a ship registry, a per-ship save key, multiple parked ships in the draw path, and `in_flight_pad` as a set. It is far cheaper to decide now than to migrate the save twice. *(A) One ship — as planned. (B) Fleet — restructure the ride key and park slot in step 8, +1 PR. If (B), also take `FrameId::Surface`; otherwise drop it as dead weight.*

**Q4 — Does docking stay a skill check?**
Once the ship flies in the station frame, matching 15 m/s is automatic and the current gate (60 m + 8 m/s of a 15 m/s orbit) is trivially met. This plan replaces it with a **Docking Clamp part + a soft-landing threshold**, turning a piloting stunt into a build decision. *(A) As planned — docking becomes convenience. (B) Keep it a skill moment — needs a new challenge the plan does not contain: an approach corridor, an alignment cone, or a moving pad. Say which, in step 7.*

**Q5 — Does staging survive in any form?**
Deleting it orphans `falling_stage` (core + client), `SalvageConstants`, `reentry_fx`'s booster path, the Stage keybind and the metal-scrap drops. `falling_stage::step` is the closest thing in the tree to a free-flying non-player rigid body. *(A) Re-target it as generic detached-hull debris — only pays off if ships can lose parts, i.e. collision damage, which is not in scope. (B) Delete outright and reclaim the code + its economy loop. (C) Keep an explicit player-assigned "detach group" per node so the salvage economy works unchanged.* This plan assumes (A) but leaves it unwired until damage exists — **do not ship it half-wired**.

**Q6 — Cargo Pod: full store or mass-only?**
A `+9 slots` pod is a new world-mutating store needing a hotbar-inclusive panel, a `cargo` save group and a same-frame write. *(A) Full store in step 9, +~1 PR. (B) Ship it as mass-and-silhouette only and add the store later.*

**Q7 — Should the ship be walkable inside?**
The frame model supports it for free (a ship frame nests exactly like the station frame), but it needs part-local collision spans and turns `bbox` into real interior volumes. Decide **before step 3** or the part geometry gets authored twice. *(A) Pilot pinned at the cockpit node — as planned. (B) Walkable — roughly doubles the frame and art work.*

**Q8 — Does assist-off Newtonian flight ship?**
`linear_damp_coast_hz: 0.02` gives a near-drag-free coast, so a determined pilot can still hand-fly a real orbit — with no conic HUD to fly it on. It costs nothing to include and may be exactly the depth you want, or exactly the thing you were deleting. *(A) Ship it as a bound toggle. (B) Set the coast defaults equal to the assist defaults and make damping unconditional.*

**Two things I cannot verify and you must:** flight *feel* after step 6 (roll through the poles, confirm no orientation flip; confirm the damping is not syrup), and the never-despawn contract after step 8 (exit mid-flight, exit docked, reload, re-board, on Tenebris **and** Sequoia). Green tests have historically passed while both of those were broken.

---

## 11. Mockup assets (built, in-tree)

`tools/gen-ship-parts.py` is a deterministic stdlib+zlib generator (the
CLAUDE.md static-asset pipeline) that emits, for each of the ten new parts:

| output | purpose |
|---|---|
| `assets/models/ship_<part>.obj` | geometry, one `o` group per sub-piece - the exact OBJ subset `baked_model.rs` parses (`o` / `usemtl` / `v` / `f` / `mtllib`) |
| `assets/models/ship_<part>.mtl` | per-group `Kd` colours |
| `assets/models/ship_<part>.json` | pivot **plus the attachment nodes** - this file IS the node spec section 4.1 mates parts on, so the art and the physics graph cannot disagree |
| `assets/textures/items/<part>.png` | 32x32 RGBA inventory icon |

The icons are **rendered from the models** by the small software rasterizer at
the bottom of the generator, using the same shading rule the game applies at
load (`baked_model.rs::shade_from_normal` - top faces bright, undersides dark).
One source of truth: an icon cannot drift from the part it depicts.

Authoring conventions, matching the existing `assets/models/rocket_*.obj` set:

- units are metres; a standard hull module is 2 m long and ~2 m across
- a part runs along **+Y with its aft mating face at y = 0**
  (`rocket_fuel_tank.obj` is y = 0..2), so parts stack by translating +Y
- **engines are the exception and are authored bell-aft** (bell at y = 0,
  mating node at the fore end) so the part hangs below what it mounts to
- node 0 is the part's own mating node - the one that meets its parent

Regenerate with `python tools/gen-ship-parts.py`, or
`python tools/gen-ship-parts.py --sheet out.png` to also write a contact sheet.

These are **mockups for the proposal**, not final art: they establish
silhouette, palette, scale and the node layout. If the plan is accepted they
become the real assets in step 9, at which point the parts want a texture pass
(the models currently carry flat per-group colours, not sampled textures) and
the icons may want hand-pixel polish over the rendered baseline.
