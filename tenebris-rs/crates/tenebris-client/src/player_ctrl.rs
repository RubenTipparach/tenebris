//! Port of `tenebris-c/src/client/player_ctrl.{c,h}`.
//!
//! The player physics / movement / camera module - planet-mode walking
//! (gravity, jump, jetpack, swimming, ground snap, ceiling clamp,
//! voxel-containment resolve, bedrock-fall rescue) plus space-mode 6DOF
//! flight (thrust + drag, free mouse-look, Q/E roll) and the roll-slerp
//! transition that bridges the two.
//!
//! # Renames (PORTING.md rule 4 - `player_` prefix dropped)
//!
//! - `player_ctrl_t`          -> `player_ctrl::PlayerCtrl`
//! - `player_init()`          -> `player_ctrl::init()`
//! - `player_update()`        -> `player_ctrl::update()`
//! - `player_teleport_to()`   -> `player_ctrl::teleport_to()`
//! - `player_set_body()`      -> `player_ctrl::set_body()`
//! - `player_rebuild_basis()` -> `player_ctrl::rebuild_basis()`
//! - `player_world_pos()`     -> `player_ctrl::world_pos()`
//! - `player_view()`          -> `player_ctrl::view()`
//!
//! # Body "pointer" shape
//!
//! The C struct holds `const body_config_t* body` /
//! `const body_config_t* last_good_body` - pointers into planet.c's
//! global `BODIES[]` array, compared by identity. The Rust planet port
//! hands out *copies* (`planet::gravity_at` returns an owned
//! `BodyConfig`), so:
//!
//! - `body` becomes `Option<BodyConfig>` (a copy; `None` = C `NULL`).
//!   Identity comparisons (`gq.body != p->body`, `w->body == p->body`)
//!   become `BodyId` comparisons - body ids are unique, so this is the
//!   same predicate pointer equality gave the C.
//! - `last_good_body` is only ever compared for identity, never
//!   dereferenced, so it shrinks to `Option<BodyId>`.
//!
//! Body fields read through the copy (pos / radius / gravity_g / name)
//! are immutable after boot in both trees, so copy-vs-pointer cannot
//! diverge.
//!
//! # World parameter
//!
//! C takes `world_t* w` but never mutates it from this module (all
//! `world_*` calls on the player path are reads), so `update()` takes
//! `Option<&World>` - `None` is the C `NULL` world.
//!
//! # Global state
//!
//! The C file's only statics are the jerk-diagnostic clock / rate-limit
//! timestamps (`s_jerk_clock_s`, `s_jerk_last_info_s`,
//! `s_anti_snap_last_log_s`) and the function-local
//! `s_fallback_logged` counter. Following input.rs's pattern they are
//! `thread_local!` `Cell`s with the same names. They only gate log
//! output - no sim state flows through them.
//!
//! # net_client
//!
//! `player_update` calls `net_client::spawn_body_ready()` to freeze
//! movement during the MP join race. SP / native builds (not connected)
//! return `true` from that helper immediately, so SP never freezes.

// Wired into the app loop when the main_web port lands (final client
// wave); until then consumed by tests only.
#![allow(dead_code)]

use std::cell::Cell;

use crate::gfx_math::{mat4_look_at_dir, Mat4};
use crate::input;
use crate::bag::Bag;
use crate::inventory::{self, Inventory, INV_HOTBAR_SLOTS};
use crate::net_client;
use crate::settings;
use tenebris_core::blocks;
use tenebris_core::config;
use tenebris_core::math::{
    dvec3_add, dvec3_cross, dvec3_dot, dvec3_length, dvec3_make, dvec3_normalize, dvec3_scale,
    dvec3_sub, dvec3_to_vec3, DVec3, Vec3,
};
use tenebris_core::physics::{self, PhysInput, TangentBasis};
use tenebris_core::planet::{self, BodyConfig, BodyId};
use tenebris_core::world::{World, WORLD_MAX_DEPTH};
use tenebris_core::world_water;

pub const EYE_HEIGHT: f32 = 1.6;

/// Full hunger. Survival drains from here; food refills toward it.
pub const MAX_HUNGER: f32 = 100.0;
/// Hunger lost per second in survival.
pub const HUNGER_DRAIN_PER_S: f32 = 0.9;

const LOOK_STICK_SENS: f32 = 2.4;
const WALK_SPEED: f32 = 8.0;
const SPRINT_SPEED: f32 = 14.0;
/* JUMP_VEL / JETPACK_* are sourced from lod.yaml (config::lod().
 * jump_velocity_mps / jetpack_accel_mps2 / jetpack_max_vy_mps); the
 * old defines are retired so the only knob designers reach for is
 * the YAML, not a recompile. */
const PITCH_LIMIT: f32 = 1.55334;

/* ----------------------------------------------------------------------- */

/// Port of `player_ctrl_t`. Field names / widths unchanged except the
/// body pointers (see module docs). `Default` mirrors the C pattern of
/// a zeroed static `player_ctrl_t` before `init` runs.
#[derive(Clone, Copy, Debug, Default)]
pub struct PlayerCtrl {
    pub position: DVec3,
    /* Drift velocity, world-space metres/s. Carries momentum across
     * frames for both space-mode flight (thrust + drag) and planet
     * mode where the radial component is the falling vy and the
     * tangential component carries any leftover orbital push. */
    pub velocity: DVec3,
    pub yaw: f32,
    pub pitch: f32,
    pub grounded: bool,
    /* True when the player is outside every body's gravity-falloff
     * radius. Drives 6DOF mouse-look + thrust-and-drag movement
     * (versus planet-mode walking), the camera.up choice, and the
     * HUD status tag. Edge transitions arm the roll-slerp timer
     * below for a smooth re-entry. */
    pub is_in_space: bool,
    /* Seconds remaining on the post-entry roll-to-level slerp. >0
     * means the basis is being smoothly aligned with the planet's
     * radial up while the player keeps mouse-look authority. Set on
     * space -> planet edges and on teleport, decremented per frame. */
    pub transition_timer_s: f32,
    pub last_tile: i32,

    /* Jump/jetpack timing. jump_held_s counts seconds the jump key
     * has been held since its last 0->1 edge; jump_consumed flips
     * true the frame the impulse fires so it never fires twice for
     * one press. Together they let update() keep tap-to-jump distinct
     * from hold-for-jetpack - jetpack thrust only kicks in once
     * jump_held_s passes the configured threshold. */
    pub jump_held_s: f32,
    pub jump_consumed: bool,

    /* Hotbar inventory. selected_block is the type the right-click
     * place will use; survival_mode gates whether breaking accumulates
     * pickups + costs time, or is instantaneous + free (creative). */
    pub inventory: Inventory,
    pub survival_mode: bool,
    /* Survival item bag: the general store behind the hotbar where
     * crafted resources, tools, and tech-tree items live. Empty in
     * creative; filled by crafting (and later by resource drops). */
    pub bag: Bag,
    /* Tech-tree discovery: a bitset of item ids the player has ever held,
     * driving the in-game progression guide (client::tech_tree). Swept
     * from the bag + hotbar each frame; persisted per world. */
    pub discovered: crate::tech_tree::Discovered,
    /* Survival hunger, 0..MAX_HUNGER. Drains over time in survival;
     * eating food (cooked meat best) refills it. `Default` zeroes it, so
     * the spawn / mode-entry path stamps it full - see `refill_hunger`. */
    pub hunger: f32,
    /* Fractional accumulator for mouse-wheel hotbar cycling. Trackpad
     * scrolls send small per-frame deltas; we only step a slot per
     * unit of accumulated scroll so high-resolution input doesn't
     * skip past every slot in one swipe. */
    pub hotbar_scroll_accum: f32,

    /* Parallel-transported tangent frame, anchored to the *current*
     * body - up is the surface normal of `body`, not of the world
     * origin. Teleporting to another body re-anchors the basis. */
    pub basis: TangentBasis,
    pub basis_ready: bool,

    /* Body we're orbiting / standing on. Gravity pulls toward its
     * center, surface normal comes from (position - body.pos). Swapped
     * by teleport_to; defaults to Tenebris at init. */
    pub body: Option<BodyConfig>,

    /* Last "safe" position - updated each frame the player is grounded
     * and well above the bedrock floor. Read by the bedrock-fall
     * rescue in update() so a player who fell through the world gets
     * teleported back to where they were actually standing instead of
     * computing a surface point from a near-zero radial (which
     * degenerates into the body's prime-meridian default, i.e. the
     * spawn-at-origin bug the player keeps hitting).
     *
     * last_good_body tracks which body the last_good_position lives
     * on - the player may have been standing on a moon and the rescue
     * needs to teleport them back to that moon, not the current body.
     * None = no recorded safe pose yet, fall back to the legacy
     * unit-direction rescue. */
    pub last_good_position: DVec3,
    pub last_good_body: Option<BodyId>,
    /* Number of bedrock-fall rescues that have fired without an
     * intervening recorder hit. Incremented on each rescue, reset to
     * zero when the recorder confirms the player landed on real solid
     * ground. The rescue invalidates last_good_position after a small
     * number of repeats to break out of spawn loops where the saved
     * pose is itself unstable. */
    pub rescue_loop_count: i32,
    /* Seconds remaining on the post-rescue server-save freeze. After
     * a bedrock-fall rescue teleports the player somewhere safe, we
     * don't want the server to overwrite their pre-rescue pose with
     * the rescue destination - otherwise a single fall-through
     * permanently moves their saved spawn to wherever the rescue
     * landed. While this counter is > 0, PLAYER_STATE is sent with
     * grounded=false so the server's save gate (cl->is_grounded)
     * keeps the previous pose on disk.
     *
     * Cleared the moment the player provides movement input
     * (W/A/S/D/space/jetpack) - that signals "yes, this position is
     * intentional, please save it now". Refreshing without moving
     * leaves the original saved pose authoritative. */
    pub rescue_save_freeze_s: f32,
}

/* ----------------------------------------------------------------------- */

/// Rotate v by the shortest rotation aligning unit a with unit b.
/// Rodrigues: v' = v c + (k x v) s + k (k.v)(1 - c),  k = normalize(a x b).
/// Identity when a ~ b; 180 deg around an arbitrary perpendicular when
/// a ~ -b.
fn rotate_between(a: DVec3, b: DVec3, v: DVec3) -> DVec3 {
    let d = dvec3_dot(a, b);
    if d > 0.99999999 {
        return v;
    }
    if d < -0.99999999 {
        let r#ref = if a.x.abs() < 0.9 {
            dvec3_make(1.0, 0.0, 0.0)
        } else {
            dvec3_make(0.0, 1.0, 0.0)
        };
        let k = dvec3_normalize(dvec3_cross(a, r#ref));
        let kv = dvec3_dot(k, v);
        return dvec3_sub(dvec3_scale(k, 2.0 * kv), v);
    }
    let k = dvec3_normalize(dvec3_cross(a, b));
    let angle = d.acos();
    let c = angle.cos();
    let s = angle.sin();
    let cross = dvec3_cross(k, v);
    let kdotv = dvec3_dot(k, v);
    dvec3_add(
        dvec3_add(dvec3_scale(v, c), dvec3_scale(cross, s)),
        dvec3_scale(k, kdotv * (1.0 - c)),
    )
}

/// Port of `player_local_pos()`: offset from the player's current body
/// center (for surface-normal math). Matches JS
/// PlanetPlayer.updateLocalOrientation, which derives localUp from the
/// surface normal of the planet the player is on. (C dereferences
/// p->body unconditionally here; callers guarantee it is set.)
fn player_local_pos(p: &PlayerCtrl) -> DVec3 {
    let b = p.body.as_ref().expect("player_local_pos: body not set");
    let c = dvec3_make(b.pos_x, b.pos_y, b.pos_z);
    dvec3_sub(p.position, c)
}

/// Rotate v by `angle` radians around unit axis `axis` (Rodrigues).
/// Used to mutate the basis in space mode where mouse / roll input
/// applies free 6DOF rotations around basis.up / basis.right /
/// basis.fwd.
fn rotate_axis_angle(v: DVec3, axis: DVec3, angle: f64) -> DVec3 {
    let c = angle.cos();
    let s = angle.sin();
    let cross = dvec3_cross(axis, v);
    let kdotv = dvec3_dot(axis, v);
    dvec3_add(
        dvec3_add(dvec3_scale(v, c), dvec3_scale(cross, s)),
        dvec3_scale(axis, kdotv * (1.0 - c)),
    )
}

/// Re-orthonormalise the basis after partial rotations / slerps so
/// we don't drift off the rotation manifold. up is taken as the
/// authoritative direction; fwd is projected to be perpendicular,
/// then right = cross(fwd, up).
fn orthonormalise_basis(b: &mut TangentBasis) {
    b.up = dvec3_normalize(b.up);
    /* Project fwd onto the plane perpendicular to up. */
    let mut d = dvec3_dot(b.fwd, b.up);
    b.fwd = dvec3_sub(b.fwd, dvec3_scale(b.up, d));
    if dvec3_dot(b.fwd, b.fwd) < 1e-12 {
        /* Degenerate - fwd was parallel to up. Fall back to a stable
         * tangent axis so the next rotation has something to work
         * with. */
        b.fwd = if b.up.x.abs() < 0.9 {
            dvec3_make(1.0, 0.0, 0.0)
        } else {
            dvec3_make(0.0, 1.0, 0.0)
        };
        d = dvec3_dot(b.fwd, b.up);
        b.fwd = dvec3_normalize(dvec3_sub(b.fwd, dvec3_scale(b.up, d)));
    } else {
        b.fwd = dvec3_normalize(b.fwd);
    }
    b.right = dvec3_normalize(dvec3_cross(b.fwd, b.up));
}

/// Maximum per-frame parallel-transport rotation in
/// sync_basis_to_planet. Anything larger means the player has been
/// teleported tangentially in a single frame (lag-spike + velocity*dt
/// overshoot, residual spaceflight momentum during a slerp, a buggy
/// collision response push - historical sources of the "random
/// rotation snap" symptom). Rather than transporting fwd/right through
/// a 10deg+ rotation in one step, which the player perceives as a
/// camera snap, arm the roll-slerp so the rotation eases across
/// multiple frames.
const ANTI_SNAP_MAX_RAD: f64 = 0.0873; /* ~5 deg per frame */

thread_local! {
    /* Total elapsed time the diagnostic has seen. Used to rate-limit
     * chatty INFO transitions (body swap, space flip) AND the
     * anti-snap warning so a long session can't flood the console.
     * ERRORs aren't rate-limited - a real wild rotate is something we
     * want every instance of. */
    static S_JERK_CLOCK_S: Cell<f64> = const { Cell::new(0.0) };
    static S_JERK_LAST_INFO_S: Cell<f64> = const { Cell::new(-1e9) };

    /* Throttle for the anti-snap diagnostic print so a sustained
     * source (e.g. the player physically standing on a
     * violently-moving body) can't flood the console. */
    static S_ANTI_SNAP_LAST_LOG_S: Cell<f64> = const { Cell::new(-1e9) };

    /* C: function-local `static int s_fallback_logged` in the
     * walkable-floor fallback inside player_update. */
    static S_FALLBACK_LOGGED: Cell<i32> = const { Cell::new(0) };
}

/// Re-align the player's persistent tangent basis to the planet
/// radial up. Used in planet mode (after the transition slerp ends)
/// where basis.up must track the surface normal as the player walks
/// around the sphere. fwd/right parallel-transport across by the
/// shortest-arc rotation so the look direction stays continuous.
/// basis_ready = false forces a cold rebuild - used on init.
fn sync_basis_to_planet(p: &mut PlayerCtrl) {
    let local = player_local_pos(p);
    let new_up = dvec3_normalize(local);
    if !p.basis_ready {
        p.basis = physics::tangent_basis(local);
        p.basis_ready = true;
        return;
    }
    let old_up = p.basis.up;
    let mut up_dot = dvec3_dot(old_up, new_up);
    if up_dot > 1.0 {
        up_dot = 1.0;
    }
    if up_dot < -1.0 {
        up_dot = -1.0;
    }
    let up_angle = up_dot.acos();
    /* Anti-snap diagnostic: any rotation >5 deg in one frame is
     * something we want to know about - it indicates an
     * outside-of-physics position teleport (loaded-pose apply,
     * body-swap that skipped the slerp arm, lag spike with surviving
     * tangential velocity, etc.).
     *
     * The OLD behaviour here was to leave basis.up stale and arm the
     * 3-second roll-slerp to "smooth" the rotation. That looked better
     * on screen but broke physics: with basis.up pointing 30 deg off
     * from the real radial, gravity decomposed wrong (~50% of g acted
     * tangentially), the player accelerated sideways for the whole
     * slerp window, drifted into wall columns the ground-snap couldn't
     * rescue them from, and ended up below bedrock - the
     * 'fell through MINIMUM LINE' chain. Correctness wins: update
     * basis.up immediately, strip any inherited tangential velocity
     * (the position teleport made it meaningless), and let the camera
     * snap once. The visible snap is *unavoidable* given the position
     * teleport that caused this - we just stop compounding it. */
    if up_angle > ANTI_SNAP_MAX_RAD {
        let clock = S_JERK_CLOCK_S.with(|c| c.get());
        if clock - S_ANTI_SNAP_LAST_LOG_S.with(|c| c.get()) > 1.0 {
            let vl = dvec3_length(p.velocity);
            let vy = dvec3_dot(p.velocity, new_up);
            eprintln!(
                "[player] WARN: anti-snap fired - basis.up rotated \
                 {:.2} deg in one frame (limit {:.2} deg). \
                 body={} pos=({:.2},{:.2},{:.2}) |v|={:.2} vy_new={:.2} \
                 trans={:.3}s space={}. \
                 Forcing basis update + clearing tangential velocity \
                 to prevent physics runaway.",
                up_angle * (180.0 / std::f64::consts::PI),
                ANTI_SNAP_MAX_RAD * (180.0 / std::f64::consts::PI),
                p.body.as_ref().map_or("(null)", |b| b.name),
                p.position.x,
                p.position.y,
                p.position.z,
                vl,
                vy,
                p.transition_timer_s as f64,
                if p.is_in_space { 1 } else { 0 }
            );
            S_ANTI_SNAP_LAST_LOG_S.with(|c| c.set(clock));
        }
        /* Strip tangential velocity. After a tangential teleport the
         * old vel_tan no longer points in a meaningful direction; if
         * we kept it, gravity-decomposition-of-old-velocity along the
         * NEW radial would compound the misalignment over the next
         * frames. Keep the radial (vy) component so gravity / jump /
         * jetpack carry over cleanly. */
        let vy_new = dvec3_dot(p.velocity, new_up);
        p.velocity = dvec3_scale(new_up, vy_new);
    }
    /* Fall through to the normal parallel-transport path. fwd/right
     * rotate by the shortest-arc rotation from old_up to new_up so the
     * look direction stays continuous; basis.up snaps to the radial
     * exactly. */
    p.basis.fwd = rotate_between(old_up, new_up, p.basis.fwd);
    p.basis.right = rotate_between(old_up, new_up, p.basis.right);
    p.basis.up = new_up;
    p.basis.right = dvec3_normalize(dvec3_cross(p.basis.fwd, p.basis.up));
    p.basis.fwd = dvec3_normalize(dvec3_cross(p.basis.up, p.basis.right));
}

/// Bake the planet-mode scalar yaw + pitch into the basis itself
/// and zero them. compute_look applies yaw/pitch ON TOP of basis.fwd
/// by design - that's the cheap way to accumulate look direction
/// while basis.up tracks the planet radial. The trick stops working
/// the moment the basis becomes 6DOF (entering space, or starting a
/// roll-slerp on a body swap): mouse-look from then on rotates the
/// basis directly, but compute_look would still apply the stale
/// yaw/pitch on top, painting the view direction with a phantom
/// offset that the player can't shake without walking back to the
/// exact orientation they had when the transition started.
///
/// Baking transfers those rotations into basis.fwd/right/up so the
/// basis IS the orientation; subsequent space-mode mouse-look
/// mutates the right thing. Sign conventions match the inline space-
/// mode mouse handling: yaw rotates around basis.up by -yaw (because
/// up x fwd = -right under our basis construction); pitch rotates
/// around basis.right by +pitch (right x fwd = +up). Re-orthonormalise
/// after to clamp any drift from the two sequential rotations.
fn bake_yaw_pitch_into_basis(p: &mut PlayerCtrl) {
    if p.yaw != 0.0 {
        let y = p.yaw as f64;
        p.basis.fwd = rotate_axis_angle(p.basis.fwd, p.basis.up, -y);
        p.basis.right = rotate_axis_angle(p.basis.right, p.basis.up, -y);
    }
    if p.pitch != 0.0 {
        let pi = p.pitch as f64;
        p.basis.fwd = rotate_axis_angle(p.basis.fwd, p.basis.right, pi);
        p.basis.up = rotate_axis_angle(p.basis.up, p.basis.right, pi);
    }
    orthonormalise_basis(&mut p.basis);
    p.yaw = 0.0;
    p.pitch = 0.0;
}

/// Roll-slerp: each frame the basis rotates by `factor` of the way
/// from its current up toward `target_up`, with fwd/right carried
/// along. Matches PlanetPlayer.slerpRollToLevel - exponential
/// approach (lower factor = smoother / slower), so big mis-
/// alignments correct fast and the last few degrees ease in.
fn slerp_basis_to_up(b: &mut TangentBasis, target_up: DVec3, factor: f32) {
    let cur = dvec3_normalize(b.up);
    let tgt = dvec3_normalize(target_up);
    let d = dvec3_dot(cur, tgt);
    if d > 0.99999999 {
        b.up = tgt;
        orthonormalise_basis(b);
        return;
    }
    let angle = (d.clamp(-1.0, 1.0)).acos();
    let step = angle * factor as f64;
    let axis = if d < -0.99999999 {
        /* 180 deg flip - pick any perpendicular axis. */
        let a = if cur.x.abs() < 0.9 {
            dvec3_make(1.0, 0.0, 0.0)
        } else {
            dvec3_make(0.0, 1.0, 0.0)
        };
        dvec3_normalize(dvec3_cross(cur, a))
    } else {
        dvec3_normalize(dvec3_cross(cur, tgt))
    };
    b.up = rotate_axis_angle(b.up, axis, step);
    b.fwd = rotate_axis_angle(b.fwd, axis, step);
    b.right = rotate_axis_angle(b.right, axis, step);
    orthonormalise_basis(b);
}

/* ----------------------------------------------------------------------- */

fn compute_look(p: &PlayerCtrl) -> (DVec3, DVec3) {
    let b = &p.basis;
    let cy = (p.yaw as f64).cos();
    let sy = (p.yaw as f64).sin();
    let cp = (p.pitch as f64).cos();
    let sp = (p.pitch as f64).sin();
    let fwd = dvec3_add(dvec3_scale(b.fwd, cy), dvec3_scale(b.right, sy));
    let look = dvec3_add(dvec3_scale(fwd, cp), dvec3_scale(b.up, sp));
    (dvec3_normalize(look), b.up)
}

fn walk_wish(p: &PlayerCtrl, inp: &PhysInput) -> DVec3 {
    let b = &p.basis;
    let cy = (p.yaw as f64).cos();
    let sy = (p.yaw as f64).sin();
    let fwd = dvec3_add(dvec3_scale(b.fwd, cy), dvec3_scale(b.right, sy));
    let right = dvec3_add(dvec3_scale(b.fwd, -sy), dvec3_scale(b.right, cy));
    let mut wish = dvec3_make(0.0, 0.0, 0.0);
    if inp.forward {
        wish = dvec3_add(wish, fwd);
    }
    if inp.backward {
        wish = dvec3_sub(wish, fwd);
    }
    if inp.right {
        wish = dvec3_add(wish, right);
    }
    if inp.left {
        wish = dvec3_sub(wish, right);
    }
    let l = dvec3_length(wish);
    if l > 1e-6 {
        wish = dvec3_scale(wish, 1.0 / l);
    }
    wish
}

/* Max step-up the player can take horizontally without jumping is
 * sourced from lod.yaml's step_height_m. Walking onto a column whose
 * floor exceeds (current feet radius + step_height) is treated as a
 * vertical wall and blocked. Matches the Minecraft "auto-step-up half
 * a block" feel; tall walls require jump/jetpack. */

/// Try to apply `delta` to `pos` along the body's tangent plane. The
/// candidate tile is rejected (and the move slides) if either:
///   - no walkable floor exists at or below the player's feet within
///     step_height_m (i.e. a wall blocks the move), or
///   - the headroom above the candidate floor is less than body_height
///     (i.e. moving forward would push the player's head into the
///     ceiling of a low passage).
fn try_horizontal_step(
    w: &World,
    p: &PlayerCtrl,
    pos: DVec3,
    delta: DVec3,
    body_height_m: f64,
) -> DVec3 {
    let b = p.body.as_ref().expect("try_horizontal_step: body not set");
    let center = dvec3_make(b.pos_x, b.pos_y, b.pos_z);
    let candidate = dvec3_add(pos, delta);
    let cand_loc = dvec3_sub(candidate, center);
    let cand_tile = w.grid.find_tile(dvec3_normalize(cand_loc), p.last_tile);
    let feet_r = dvec3_length(dvec3_sub(pos, center));
    /* Headroom-respecting floor search: any floor we accept must have
     * body_height_m of clear air above it. If none exists, the
     * candidate tile is impassable from this elevation. */
    let mut cand_gr = w.walkable_floor_near(cand_tile, feet_r, body_height_m);
    if cand_gr <= -1e8 {
        /* Walkable-floor rejected (likely a column whose top solid
         * voxel has another solid above, failing the headroom
         * check). Fall back to the topmost-solid floor before
         * declaring the move blocked - otherwise the player slides
         * off perfectly visible terrain because the cell above the
         * block they want to stand on happens to be solid too. */
        cand_gr = w.topmost_solid_floor(cand_tile);
        if cand_gr <= -1e8 {
            /* No solid voxels at all in this column - genuinely
             * blocked (invalid tile index, or a fully-dug column).
             * Ungenerated tiles are no longer a fall-through hazard:
             * walkable_floor_near returns the analytic procgen
             * surface for them. */
            return pos;
        }
    }
    let step_h = config::lod().step_height_m as f64;
    if cand_gr - feet_r > step_h {
        return pos; /* wall - slide */
    }
    candidate
}

/* ----------------------------------------------------------------------- */

/// Push the player horizontally away from any solid voxel face whose
/// boundary sits within camera_collider_radius_m of the eye (at eye
/// depth). Acts as a "fat" cylinder around the eye/camera so the
/// perspective near plane never finds itself on the wrong side of a
/// wall.
///
/// Each Goldberg tile has up to 6 edge-neighbours; the wall between
/// tile A and tile B lies on the perpendicular bisector plane of the
/// line A.center -> B.center (extruded radially). Distance from the
/// eye to that plane is the projection of (midpoint - eye) onto the
/// normalised separation. If the neighbour's voxel at eye_depth is
/// solid and that distance is less than the collider radius, we push
/// the player back along the wall normal by the penetration amount,
/// projected into the tangent plane so the radial position (and any
/// ground-snap fixup above) stays untouched.
///
/// The push contributions for the (up to) 6 walls sum, so a player
/// wedged into a corner gets pushed diagonally away from BOTH walls
/// in a single frame.
fn camera_collider_push(w: &World, p: &mut PlayerCtrl, cur_tile: i32) {
    let l = config::lod();
    let radius_m = l.camera_collider_radius_m;
    if radius_m <= 0.0 {
        return;
    }
    if cur_tile < 0 || cur_tile >= w.tile_count {
        return;
    }
    let Some(t) = w.grid.tile(cur_tile) else {
        return;
    };

    let b = p.body.as_ref().expect("camera_collider_push: body not set");
    let center = dvec3_make(b.pos_x, b.pos_y, b.pos_z);
    let eye_pos = dvec3_add(p.position, dvec3_scale(p.basis.up, EYE_HEIGHT as f64));
    let eye_local = dvec3_sub(eye_pos, center);
    let eye_r = dvec3_length(eye_local);
    if eye_r < 1e-6 {
        return;
    }
    let eye_depth = w.radius_to_depth(eye_r);
    if eye_depth < 0 || eye_depth >= WORLD_MAX_DEPTH {
        return;
    }

    let mut total_push = dvec3_make(0.0, 0.0, 0.0);
    for k in 0..t.num_neighbors as usize {
        let nb = t.edge_neighbours[k];
        if nb < 0 || nb >= w.tile_count {
            continue;
        }
        /* Ungenerated columns read as all-air; nothing to collide with. */
        if nb >= w.gen_cursor {
            continue;
        }
        let nb_block = w.get(nb, eye_depth);
        if !blocks::is_solid(nb_block) {
            continue;
        }

        let Some(tn) = w.grid.tile(nb) else {
            continue;
        };

        /* Wall plane: perpendicular bisector of (t.center -> tn.center). */
        let to_nb = dvec3_sub(tn.center, t.center);
        let to_nb_len = dvec3_length(to_nb);
        if to_nb_len < 1e-9 {
            continue;
        }
        let n_norm = dvec3_scale(to_nb, 1.0 / to_nb_len);

        /* Midpoint on the unit sphere, projected to eye radius so the
         * comparison is in physical metres at the eye's depth. */
        let mut mid = dvec3_scale(dvec3_add(t.center, tn.center), 0.5);
        let mid_len = dvec3_length(mid);
        if mid_len < 1e-9 {
            continue;
        }
        mid = dvec3_scale(mid, eye_r / mid_len);

        /* Signed perpendicular distance from eye to the wall plane,
         * positive when the wall is on the +n_norm (neighbour) side
         * of the eye. */
        let to_mid = dvec3_sub(mid, eye_local);
        let dist = dvec3_dot(to_mid, n_norm);
        if dist >= radius_m as f64 {
            continue; /* far enough */
        }

        let penetration = radius_m as f64 - dist;
        /* Accumulate a horizontal push along -n_norm by the
         * penetration amount, projected onto the tangent plane so
         * radial position stays as the ground snap left it. */
        let mut push = dvec3_scale(n_norm, -penetration);
        let radial_part = dvec3_dot(push, p.basis.up);
        push = dvec3_sub(push, dvec3_scale(p.basis.up, radial_part));
        total_push = dvec3_add(total_push, push);
    }
    if dvec3_dot(total_push, total_push) > 1e-9 {
        p.position = dvec3_add(p.position, total_push);
    }
}

/* ----------------------------------------------------------------------- */

/// Port of `player_init()`.
pub fn init(p: &mut PlayerCtrl, body: &BodyConfig) {
    p.body = Some(*body);
    p.yaw = 0.0;
    p.pitch = 0.0;
    p.grounded = false;
    p.velocity = dvec3_make(0.0, 0.0, 0.0);
    p.is_in_space = false;
    p.transition_timer_s = 0.0;
    p.last_tile = -1;
    p.jump_held_s = 0.0;
    p.jump_consumed = false;
    p.basis_ready = false;
    /* Default to creative - the menu / a key toggle will switch to
     * survival, which calls inventory::init_empty + sets survival_mode. */
    p.survival_mode = false;
    inventory::init_creative(&mut p.inventory);
    /* Spawn ~2 m above body's prime meridian surface. */
    let r0 = body.radius_m + 2.0;
    p.position = dvec3_make(body.pos_x + r0, body.pos_y, body.pos_z);
    /* No "safe pose" recorded yet - first grounded frame will fill
     * this in. Sentinel: last_good_body == None. */
    p.last_good_position = DVec3::default();
    p.last_good_body = None;
    p.rescue_loop_count = 0;
    p.rescue_save_freeze_s = 0.0;
}

/// Port of `player_world_pos()`.
pub fn world_pos(p: &PlayerCtrl) -> DVec3 {
    p.position
}

/* ----------------------------------------------------------------------- */

/* ----------------------------------------------------------------------- */
/* Player update - split into two top-level branches by gravity
 * influence at the current position. In planet mode we run walking +
 * jetpack + gravity + ground snap with the basis locked to the
 * planet's radial up. In space mode we run 6DOF mouse-look + thrust +
 * drag with no anchor. The transition slerp bridges the space ->
 * planet edge so the camera doesn't pop. */

/// Camera-jerk diagnostic. Distinguishes legitimate transitions
/// (intentional 6DOF look in space, slerp-controlled roll on planet
/// entry, body-swap edges) from genuine anomalies (basis flipping
/// during steady-state walking, position teleporting beyond what
/// velocity * dt can explain). The logger only barks on the second
/// class - and labels it [ERROR] so it stands out in the console -
/// so a "wild rotate while walking" report shows up as a single
/// obvious line. Cheap and rate-limited so it can't tank the
/// framerate even if multiple frames fire in a row.
#[derive(Clone, Copy, Debug, Default)]
struct JerkSnapshot {
    valid: bool,
    position: DVec3,
    basis_up: DVec3,
    basis_fwd: DVec3,
    velocity: DVec3,
    is_in_space: bool,
    grounded: bool,
    transition_timer_s: f32,
    body: Option<BodyConfig>,
}

/* Wild-rotation thresholds (steady-state planet mode only). Walking
 * smoothly produces basis changes of ~0.05 deg / frame at 60 fps;
 * ground snap can yield up to step_height_m (0.6 m) of vertical pop on
 * a step-up; horizontal motion caps at SPRINT_SPEED * dt ~ 0.23 m /
 * frame. The thresholds are well above those expected values so
 * normal gameplay stays silent.
 *
 * The basis-up threshold is intentionally separate from the position
 * one because basis.up rotates by `tangent_dist / body_radius`
 * radians: a 0.5 m tangent slide on a 10 m asteroid (small body)
 * gives 2.9 deg even though the slide is below the position threshold.
 * To keep the basis check meaningful on small bodies we compare the
 * basis rotation against what the actual position change would
 * expect - see jerk_log for the expected-rotation calc. */
const JERK_UP_DELTA_RAD: f64 = 0.0349; /* ~2 deg */
const JERK_FWD_DELTA_RAD: f64 = 0.0349; /* ~2 deg */
const JERK_POS_FUDGE_M: f64 = 1.0; /* tolerance over velocity * dt */
const JERK_RATE_LIMIT_S: f64 = 0.25; /* max one [INFO] line per quarter-second */

/* (S_JERK_CLOCK_S + S_JERK_LAST_INFO_S declared near the top of the
 * file so sync_basis_to_planet's anti-snap warning can rate-limit
 * itself against the same shared clock without forward-declarations.) */

fn jerk_log(p: &PlayerCtrl, prev: &JerkSnapshot, w: Option<&World>, dt: f32) {
    S_JERK_CLOCK_S.with(|c| c.set(c.get() + dt as f64));
    /* Skip the very first frame after init - the basis starts as
     * zero-init {0,0,0} and acos(0)=90 deg, which would print a
     * spurious 90 deg "rotation" the first time update() runs.
     * The valid flag on `prev` is set the first time we run; the
     * basis check confirms it had real content. */
    if !prev.valid {
        return;
    }
    if dvec3_dot(prev.basis_up, prev.basis_up) < 0.5 {
        return;
    }

    /* Snapshot deltas. */
    let dpos = dvec3_sub(p.position, prev.position);
    let pos_jump = dvec3_length(dpos);
    /* Decompose dpos into radial (along prev.basis_up - the planet
     * up the player perceived ENTERING this frame) and tangential
     * (perpendicular). On a planet, radial-only motion can't rotate
     * basis.up; only tangential motion does. So when a rotation
     * snap is reported, the tangential component is what to blame. */
    let pos_radial = dvec3_dot(dpos, prev.basis_up);
    let pos_tan_vec = dvec3_sub(dpos, dvec3_scale(prev.basis_up, pos_radial));
    let pos_tangent = dvec3_length(pos_tan_vec);
    let mut up_dot = dvec3_dot(p.basis.up, prev.basis_up);
    let mut fwd_dot = dvec3_dot(p.basis.fwd, prev.basis_fwd);
    if up_dot > 1.0 {
        up_dot = 1.0;
    }
    if up_dot < -1.0 {
        up_dot = -1.0;
    }
    if fwd_dot > 1.0 {
        fwd_dot = 1.0;
    }
    if fwd_dot < -1.0 {
        fwd_dot = -1.0;
    }
    let up_angle = up_dot.acos();
    let fwd_angle = fwd_dot.acos();
    /* Expected basis.up rotation: arc length pos_tangent traversed
     * on the body sphere subtends pos_tangent / body_radius radians.
     * If the actual rotation is much larger than this, the basis
     * jumped without a corresponding position move - that's the bug
     * symptom (basis re-init / parallel-transport from a stale up). */
    let body_radius = prev.body.as_ref().map_or(1.0, |b| b.radius_m);
    let up_expected = pos_tangent / if body_radius > 1e-3 { body_radius } else { 1.0 };
    let up_excess = up_angle - up_expected;
    let vl_prev = dvec3_length(prev.velocity);
    let body_changed = p.body.map(|b| b.id) != prev.body.map(|b| b.id);
    let space_flipped = p.is_in_space != prev.is_in_space;

    /* Frames where wild rotation is *expected* - skip ERROR
     * detection (still consider INFO for the edges). The slerp
     * mutates the basis directly; space mode is full 6DOF; body
     * swaps trigger their own slerp; teleport is user-initiated. */
    let transitioning = prev.transition_timer_s > 0.0
        || p.transition_timer_s > 0.0
        || prev.is_in_space
        || p.is_in_space
        || body_changed
        || space_flipped;

    /* ---- ERROR class: anomalies in steady-state planet mode that
     * the player would perceive as a snap. Logged unconditionally
     * (no rate-limit) so a single occurrence shows up. The basis-up
     * rotation check is compared against the EXPECTED rotation
     * derived from the tangent-plane position move - that way a
     * legitimate fast sprint on a small asteroid (which produces a
     * geometrically large per-frame basis rotation) doesn't false-
     * trigger, but a basis flip without a matching tangential move
     * (the actual bug we're hunting) is still caught. */
    let mut err_reason: Option<&str> = None;
    if !transitioning {
        if up_excess > JERK_UP_DELTA_RAD {
            err_reason = Some("wild basis.up rotation (exceeds tangent-move expectation)");
        } else if fwd_angle > JERK_FWD_DELTA_RAD && pos_tangent < 0.5 {
            /* basis.fwd shouldn't rotate beyond yaw-input changes
             * when the player is stationary. The pos_tangent gate
             * catches the small-body case the same way. */
            err_reason = Some("wild basis.fwd rotation");
        } else {
            /* Position jump > what velocity*dt + ground-snap step
             * can plausibly explain. Uses prev velocity so the
             * tolerance reflects what the player had on entry to
             * this frame, not what got damped out by the integrator. */
            let max_expected = vl_prev * dt as f64 + JERK_POS_FUDGE_M;
            if pos_jump > max_expected {
                err_reason = Some("unexplained position jump");
            }
        }
    }

    /* ---- INFO class: legitimate transitions, rate-limited so a
     * long flight crossing several SOI edges doesn't drown the
     * console. */
    let mut info_reason: Option<&str> = None;
    if err_reason.is_none() {
        if body_changed {
            info_reason = Some("body change");
        } else if space_flipped {
            info_reason = Some(if p.is_in_space {
                "entered space"
            } else {
                "entered gravity"
            });
        }
    }
    let clock = S_JERK_CLOCK_S.with(|c| c.get());
    if info_reason.is_some() && (clock - S_JERK_LAST_INFO_S.with(|c| c.get())) < JERK_RATE_LIMIT_S {
        info_reason = None;
    }

    if err_reason.is_none() && info_reason.is_none() {
        return;
    }

    let prefix = if err_reason.is_some() { "[ERROR]" } else { "[INFO]" };
    let reason = err_reason.unwrap_or_else(|| info_reason.unwrap());
    if info_reason.is_some() {
        S_JERK_LAST_INFO_S.with(|c| c.set(clock));
    }

    let old_name = prev.body.as_ref().map_or("(null)", |b| b.name);
    let new_name = p.body.as_ref().map_or("(null)", |b| b.name);
    let mut prev_alt = -1.0;
    let mut next_alt = -1.0;
    if let Some(b) = &prev.body {
        let rx = prev.position.x - b.pos_x;
        let ry = prev.position.y - b.pos_y;
        let rz = prev.position.z - b.pos_z;
        prev_alt = (rx * rx + ry * ry + rz * rz).sqrt() - b.radius_m;
    }
    if let Some(b) = &p.body {
        let rx = p.position.x - b.pos_x;
        let ry = p.position.y - b.pos_y;
        let rz = p.position.z - b.pos_z;
        next_alt = (rx * rx + ry * ry + rz * rz).sqrt() - b.radius_m;
    }
    let world_matches = match (w, &p.body) {
        (Some(w), Some(b)) => w.body.id == b.id,
        _ => false,
    };

    /* Velocity decomposition matches the position one: radial vs
     * tangential w.r.t. the entry basis.up. Tangential velocity is
     * the bit that can legitimately move basis.up; a high tangential
     * velocity with a small position move (or vice versa) hints at
     * which solver step desynced. */
    let vy_prev = dvec3_dot(prev.velocity, prev.basis_up);
    let vt_prev = dvec3_sub(prev.velocity, dvec3_scale(prev.basis_up, vy_prev));
    let vl_tan = dvec3_length(vt_prev);
    println!(
        "{} [jerk] {} :: dt={:.4}s body:{}->{} r={:.1}m alt:{:.1}->{:.1} \
         dpos={:.3}m (radial={:+.3} tangent={:.3}) \
         dup={:.2}deg (expected {:.2}deg from tangent; excess {:.2}deg) \
         dfwd={:.2}deg \
         is_space={}->{} grounded={}->{} trans={:.3}s->{:.3}s \
         |v|={:.2} (radial={:+.2} tangent={:.2}) world_matches={}",
        prefix,
        reason,
        dt as f64,
        old_name,
        new_name,
        body_radius,
        prev_alt,
        next_alt,
        pos_jump,
        pos_radial,
        pos_tangent,
        up_angle * (180.0 / std::f64::consts::PI),
        up_expected * (180.0 / std::f64::consts::PI),
        up_excess * (180.0 / std::f64::consts::PI),
        fwd_angle * (180.0 / std::f64::consts::PI),
        prev.is_in_space as i32,
        p.is_in_space as i32,
        prev.grounded as i32,
        p.grounded as i32,
        prev.transition_timer_s as f64,
        p.transition_timer_s as f64,
        dvec3_length(p.velocity),
        vy_prev,
        vl_tan,
        if world_matches { 1 } else { 0 }
    );
}

fn jerk_snapshot_take(s: &mut JerkSnapshot, p: &PlayerCtrl) {
    s.valid = true;
    s.position = p.position;
    s.basis_up = p.basis.up;
    s.basis_fwd = p.basis.fwd;
    s.velocity = p.velocity;
    s.is_in_space = p.is_in_space;
    s.grounded = p.grounded;
    s.transition_timer_s = p.transition_timer_s;
    s.body = p.body;
}

/* Compose: take a BEFORE snapshot, run the update body, log if the
 * per-frame deltas crossed any of the thresholds. The snapshot
 * captures p's state at function entry; comparing it against p at
 * function exit gives the net camera-relevant change, which is
 * what the player actually perceives as a "jerk". */

/// Port of `player_update()`. `w` may be `None` (C `NULL`) or a world
/// for a *different* body than `p.body` - both degrade to the no-world
/// movement fallbacks exactly like the C.
pub fn update(p: &mut PlayerCtrl, w: Option<&World>, dt: f32) {
    let inp = input::state();
    /* Spawn-time freeze: the WELCOME handler kicks an async /saves/body
     * fetch for the spawn body, but the player's first frames run
     * before that response lands. Without the freeze:
     *   - Spawn coords land in air ABOVE the still-unloaded terrain
     *     -> gravity drags the player straight down through what
     *     will-be the ground, then the bedrock rescue snaps them
     *     somewhere unrelated when the blocks finally arrive.
     *   - Or the saved blocks arrive AFTER the player has moved a
     *     few metres and materialise inside their hitbox.
     *
     * Zero out velocity + skip the rest of the tick until
     * net_client_spawn_body_ready() returns true (slot state == 2
     * for the WELCOME body_id, i.e. /saves/body fetch has been
     * applied to the world). SP / native builds return true from
     * that helper immediately - the freeze only ever holds during
     * the MP join race.
     *
     * Position is intentionally NOT touched - just leave the player
     * sitting at the server-provided spawn coords. The renderer can
     * still draw them; the only thing on hold is movement. */
    if !net_client::spawn_body_ready() {
        p.velocity = dvec3_make(0.0, 0.0, 0.0);
        return;
    }
    /* Post-rescue server-save freeze countdown. Stays positive for
     * a few seconds after the bedrock-fall rescue so PLAYER_STATE
     * sends grounded=false on the wire (which gates the server's
     * pose persistence). Any intentional movement input from the
     * player clears it immediately - they want their new position
     * saved. */
    if p.rescue_save_freeze_s > 0.0 {
        p.rescue_save_freeze_s -= dt;
        if p.rescue_save_freeze_s < 0.0 {
            p.rescue_save_freeze_s = 0.0;
        }
        if inp.phys.forward
            || inp.phys.backward
            || inp.phys.left
            || inp.phys.right
            || inp.phys.fly_up
            || inp.phys.fly_down
            || inp.phys.jump
        {
            p.rescue_save_freeze_s = 0.0;
        }
    }
    /* Snapshot the BEFORE state for the camera-jerk diagnostic so
     * we can compare against it after the update. */
    let mut before = JerkSnapshot::default();
    jerk_snapshot_take(&mut before, p);

    /* ---- Body selection + space/planet detection. The gravity
     * tracker picks whichever body delivers the strongest pull at
     * p.position, with a smooth taper out to gravity_falloff_mult.
     * Outside every body's falloff radius we're "in space" and the
     * 6DOF branch takes over. */
    let l = config::lod();
    let gq = planet::gravity_at(p.position, l.gravity_full_mult, l.gravity_falloff_mult);
    let was_in_space = p.is_in_space;
    p.is_in_space = gq.body.is_none();
    if let Some(gb) = &gq.body {
        if p.body.map(|b| b.id) != Some(gb.id) {
            /* Mid-flight body swap - keep the basis as-is and arm the
             * transition slerp so the basis aligns smoothly with the new
             * planet's up over the slerp window. Reset basis_ready=false
             * would yank the camera; we want smooth.
             *
             * Without the arm, the next sync_basis_to_planet call would
             * see a wildly different new_up (the new body's center could
             * be thousands of metres away from the old one), exceed the
             * 5 deg-per-frame anti-snap limit, fire the WARN log, strip
             * tangential velocity, and snap the basis in one step. The
             * user perceives that as an "occasional rotation correction
             * snap" - happens any time the player is hovering at the
             * boundary between two gravity wells (Tenebris <-> Luna)
             * where small position changes flip the strongest-pull body
             * back and forth. */
            p.body = Some(*gb);
            p.last_tile = -1;
            p.transition_timer_s = l.roll_slerp_duration_s;
        }
    }

    /* Hard fall-through safety net. The ground-snap overshoot rescue
     * below handles 99% of "feet ended up below the floor" cases per
     * frame, but if something slips past it (extreme lag spike,
     * collision-solver edge case, dt clamp pile-up) the player can
     * drop below the body's MINIMUM LINE - the bedrock floor at
     * depth 0, i.e. body.radius_m - 64 m for a standard 128-deep
     * shell. Below that radius is no longer "inside the world"; the
     * column is meaningless and the snap rescue can't recover.
     *
     * Snap the player BACK UP to the surface ABOVE wherever they
     * fell from (their current tangential direction), not to a
     * fixed prime-meridian spawn point - preserves the spot the
     * player was playing in. The threshold floors at 0.5 m so tiny
     * asteroids (where body.radius - 64 m is negative) still get a
     * non-degenerate check. */
    if let (Some(body), Some(ww)) = (p.body, w) {
        if !p.is_in_space && ww.body.id == body.id {
            let bedrock_r = body.radius_m - 64.0;
            let min_line_r = if bedrock_r > 0.5 { bedrock_r } else { 0.5 };
            let local = dvec3_sub(p.position, dvec3_make(body.pos_x, body.pos_y, body.pos_z));
            let r_now = dvec3_length(local);
            if r_now < min_line_r {
                /* Rescue-loop guard. If the rescue fires repeatedly without
                 * an intervening grounded frame, the recorded last_good
                 * pose is itself unsafe (e.g. it sits on a column the
                 * player was standing in for one frame but slid off in the
                 * next, or the pose got captured at marginal r right above
                 * the bedrock floor with nothing actually solid beneath).
                 * Counter is reset to zero in the bottom-of-update
                 * recorder whenever update() completes with the player
                 * grounded on a real floor. */
                const RESCUE_LOOP_LIMIT: i32 = 2;
                p.rescue_loop_count += 1;

                /* "Valid ground" predicate: the cell directly under
                 * last_good_position must be a solid voxel. Without this
                 * check the rescue happily teleports to a pose recorded
                 * one frame before the player slid off, and the next tick
                 * gravity drops them back below bedrock - i.e. a spawn
                 * loop. */
                let mut last_good_has_floor = false;
                let mut lg_r = 0.0f64;
                if p.last_good_body == Some(body.id) {
                    let lg_local = dvec3_sub(
                        p.last_good_position,
                        dvec3_make(body.pos_x, body.pos_y, body.pos_z),
                    );
                    lg_r = dvec3_length(lg_local);
                    if lg_r > min_line_r + 1.0 {
                        let lg_dir = dvec3_scale(lg_local, 1.0 / lg_r);
                        let lg_tile = ww.grid.find_tile(lg_dir, -1);
                        /* Check the voxel one block below the recorded
                         * feet altitude. radius_to_depth maps radius to
                         * (depth + SEA_LEVEL_IDX); the floor block we
                         * want is at depth = current_depth - 1. */
                        let feet_depth = ww.radius_to_depth(lg_r);
                        let floor_depth = feet_depth - 1;
                        if lg_tile >= 0 && floor_depth >= 0 && floor_depth < WORLD_MAX_DEPTH {
                            let below = ww.get(lg_tile, floor_depth);
                            last_good_has_floor = blocks::is_solid(below);
                        }
                    }
                }

                let mut used_last_good = false;
                if last_good_has_floor && p.rescue_loop_count <= RESCUE_LOOP_LIMIT {
                    eprintln!(
                        "[player] WARN: fell through MINIMUM LINE on body={} \
                         (r={:.2} < {:.2}); restoring last safe pose at \
                         ({:.2}, {:.2}, {:.2}) r={:.2} (rescue #{}, floor verified)",
                        body.name,
                        r_now,
                        min_line_r,
                        p.last_good_position.x,
                        p.last_good_position.y,
                        p.last_good_position.z,
                        lg_r,
                        p.rescue_loop_count
                    );
                    p.position = p.last_good_position;
                    used_last_good = true;
                }
                if !used_last_good {
                    /* Heavyweight fallback: walk the column under our
                     * current direction looking for the topmost walkable
                     * floor. safe_spawn_local returns floor_r + headroom
                     * along that direction, which is always a voxel above
                     * a real solid block (or the analytic surface if the
                     * column isn't generated yet) - so it can't loop the
                     * way last_good can. We also force-INVALIDATE
                     * last_good so the next fall doesn't try to use the
                     * broken pose again, and reset the rescue counter so
                     * we get fresh budget once we land. */
                    p.last_good_body = None;
                    p.rescue_loop_count = 0;
                    let unit_dir = if r_now > 1e-6 {
                        dvec3_scale(local, 1.0 / r_now)
                    } else {
                        dvec3_make(1.0, 0.0, 0.0)
                    };
                    /* Headroom raised to 50 m (was 5 m) so the
                     * heavyweight rescue puts the player WELL above the
                     * column's top, not 5 m above where they could re-
                     * intersect terrain on the very next tick if procgen
                     * disagrees with the mesh or chunks aren't rebuilt
                     * yet. Gravity will land them on the actual surface
                     * within a few hundred ms; a 50 m fall is the cost
                     * of guaranteeing no further loop. */
                    let safe_local = ww.safe_spawn_local(unit_dir, 50.0);
                    let center = dvec3_make(body.pos_x, body.pos_y, body.pos_z);
                    eprintln!(
                        "[player] WARN: fell through MINIMUM LINE on body={} \
                         (r={:.2} < {:.2}, body_radius={:.1}); last_good invalid \
                         (has_floor={}, lg_r={:.2}), popping to surface \
                         via column scan (new_r={:.2})",
                        body.name,
                        r_now,
                        min_line_r,
                        body.radius_m,
                        last_good_has_floor as i32,
                        lg_r,
                        dvec3_length(safe_local)
                    );
                    p.position = dvec3_add(center, safe_local);
                }
                p.velocity = dvec3_make(0.0, 0.0, 0.0);
                p.grounded = false;
                p.last_tile = -1;
                /* Freeze server-save reporting for a few seconds so the
                 * rescue destination doesn't overwrite the player's
                 * pre-rescue saved pose. The PLAYER_STATE send path
                 * checks rescue_save_freeze_s and forces grounded=false
                 * on the wire while it's positive, which gates the
                 * server's persistence. The freeze clears when the
                 * player provides movement input (input.rs flags) -
                 * intentionally moving means "yes, this is where I want
                 * to be, please save it". */
                p.rescue_save_freeze_s = 5.0;
                /* Cold-rebuild the basis FROM the new position so basis.up
                 * is the radial at the surface we just teleported to.
                 * Critical: without this the basis kept whatever stale
                 * orientation it had during the fall (pointing toward
                 * the body's centre, the old radial), and the next
                 * frame's gravity decomposed against the wrong basis.up
                 * - velocity component along the wrong axis - so the
                 * player kept falling in the same wrong direction and
                 * tripped the safety net again. Same reason the
                 * ground-snap rescue couldn't catch them: its vy <= 0
                 * check is on dot(velocity, basis.up), which reads
                 * positive when basis.up points back where the player
                 * came from. Cold rebuild fixes both. */
                rebuild_basis(p);
                /* No slerp - this is a teleport, not a smooth body
                 * transition. Slerping would leave 3 s of stale-basis
                 * physics on top of an explicit "fix this now" action.
                 * Caller still hears the WARN print so the root cause
                 * (whatever produced the sub-bedrock state) is
                 * diagnosable. */
                p.transition_timer_s = 0.0;
                jerk_log(p, &before, w, dt);
                return;
            }
        }
    }
    /* Edge: planet -> space. Bake the planet-mode yaw/pitch into the
     * basis so the look direction is preserved when compute_look
     * stops adding them on top, then drop into 6DOF mutation of the
     * basis directly. Without this, the player keeps seeing through
     * a phantom yaw/pitch offset that mouse-look in space can never
     * cancel. */
    if !was_in_space && p.is_in_space {
        bake_yaw_pitch_into_basis(p);
    }
    /* Edge: leaving space -> entering a gravity well. Arm the roll
     * slerp so the basis aligns smoothly with the new planet up. */
    if was_in_space && !p.is_in_space {
        p.transition_timer_s = l.roll_slerp_duration_s;
    }

    /* ---- Hotbar / wheel. Same as before, mode-independent. */
    for i in 0..INV_HOTBAR_SLOTS {
        if inp.hotbar[i] {
            inventory::select(&mut p.inventory, i as i32);
        }
    }
    p.hotbar_scroll_accum += inp.wheel_dy;
    while p.hotbar_scroll_accum >= 1.0 {
        let mut s = p.inventory.selected - 1;
        if s < 0 {
            s = INV_HOTBAR_SLOTS as i32 - 1;
        }
        inventory::select(&mut p.inventory, s);
        p.hotbar_scroll_accum -= 1.0;
    }
    while p.hotbar_scroll_accum <= -1.0 {
        let mut s = p.inventory.selected + 1;
        if s >= INV_HOTBAR_SLOTS as i32 {
            s = 0;
        }
        inventory::select(&mut p.inventory, s);
        p.hotbar_scroll_accum += 1.0;
    }

    /* Mouse / look-stick deltas - combined inputs in radians. */
    /* Mouse sensitivity is a runtime setting (Settings menu); fetch
     * once per frame so a slider change takes effect immediately. */
    let mouse_sens = settings::mouse_sensitivity() as f64;
    let mut yaw_delta = inp.mouse_dx as f64 * mouse_sens;
    let mut pitch_delta = -(inp.mouse_dy as f64) * mouse_sens;
    if inp.look_stick_active {
        yaw_delta += inp.look_stick_x as f64 * LOOK_STICK_SENS as f64 * dt as f64;
        pitch_delta += inp.look_stick_y as f64 * LOOK_STICK_SENS as f64 * dt as f64;
    }

    /* ============================================================== */
    /* SPACE MODE - 6DOF orientation, thrust + drag flight.           */
    /* ============================================================== */
    if p.is_in_space {
        /* Rotate basis directly around its own axes. Yaw around
         * basis.up turns left/right; pitch around basis.right looks
         * up/down (no clamp - full 6DOF allows looping); roll around
         * basis.fwd via Q/E so the player can bank. Keeps the basis
         * orthonormal each step. */
        if yaw_delta != 0.0 {
            p.basis.fwd = rotate_axis_angle(p.basis.fwd, p.basis.up, -yaw_delta);
            p.basis.right = rotate_axis_angle(p.basis.right, p.basis.up, -yaw_delta);
        }
        if pitch_delta != 0.0 {
            p.basis.fwd = rotate_axis_angle(p.basis.fwd, p.basis.right, pitch_delta);
            p.basis.up = rotate_axis_angle(p.basis.up, p.basis.right, pitch_delta);
        }
        /* Roll Q/E: rotation around basis.fwd. Under our basis
         * convention fwd x up = +right, so a +theta rotation around
         * fwd tilts up toward +right - visually that's the camera
         * banking RIGHT. Q is the "roll left" key, so we apply a
         * NEGATIVE theta when roll_left is held; E (roll right) gets
         * the positive theta. The previous signs were inverted, which
         * mapped Q to a right-roll. */
        let mut roll_delta = 0.0f64;
        if inp.phys.roll_left {
            roll_delta -= l.space_roll_speed as f64 * dt as f64;
        }
        if inp.phys.roll_right {
            roll_delta += l.space_roll_speed as f64 * dt as f64;
        }
        if roll_delta != 0.0 {
            p.basis.up = rotate_axis_angle(p.basis.up, p.basis.fwd, roll_delta);
            p.basis.right = rotate_axis_angle(p.basis.right, p.basis.fwd, roll_delta);
        }
        orthonormalise_basis(&mut p.basis);

        /* Thrust acts along basis axes - fwd/back, strafe via
         * basis.right, up/down via basis.up (Space/C). Velocity is
         * world-space and decays exponentially toward zero so the
         * ship coasts to a stop. */
        let mut accel = dvec3_make(0.0, 0.0, 0.0);
        if inp.phys.forward {
            accel = dvec3_add(accel, p.basis.fwd);
        }
        if inp.phys.backward {
            accel = dvec3_sub(accel, p.basis.fwd);
        }
        if inp.phys.right {
            accel = dvec3_add(accel, p.basis.right);
        }
        if inp.phys.left {
            accel = dvec3_sub(accel, p.basis.right);
        }
        if inp.phys.fly_up {
            accel = dvec3_add(accel, p.basis.up);
        }
        if inp.phys.fly_down {
            accel = dvec3_sub(accel, p.basis.up);
        }
        let al = dvec3_length(accel);
        if al > 1e-6 {
            accel = dvec3_scale(accel, 1.0 / al);
            let mut thrust = l.space_thrust as f64;
            /* Jetpack-in-space boost: sprint quadruples thrust so the
             * "jetpack" feel reads as a real burner-mode burst rather
             * than a tiny step up. Drag stays unchanged so the player
             * still coasts to a stop on release. */
            if inp.phys.sprint {
                thrust *= 4.0;
            }
            p.velocity = dvec3_add(p.velocity, dvec3_scale(accel, thrust * dt as f64));
        }
        /* Exponential drag - frame-rate-independent. */
        let damp = (-(l.space_drag as f64) * dt as f64).exp();
        p.velocity = dvec3_scale(p.velocity, damp);
        p.position = dvec3_add(p.position, dvec3_scale(p.velocity, dt as f64));
        p.grounded = false;
        p.last_tile = -1;
        jerk_log(p, &before, w, dt);
        return;
    }

    /* ============================================================== */
    /* PLANET MODE - basis locked to planet up; walking + gravity.    */
    /* ============================================================== */

    /* Bring basis into sync with the current radial up. Either via
     * the slerp (transition_timer counting down) or direct
     * parallel-transport (steady state on the planet). */
    if p.transition_timer_s > 0.0 {
        let target_up = dvec3_normalize(player_local_pos(p));
        let mut step = l.roll_slerp_speed * dt;
        if step > 1.0 {
            step = 1.0;
        }
        slerp_basis_to_up(&mut p.basis, target_up, step);
        p.transition_timer_s -= dt;
        if p.transition_timer_s <= 0.0 {
            /* Snap final alignment. After this point yaw + pitch
             * scalars take over and basis.up tracks planet up. */
            p.basis.up = target_up;
            orthonormalise_basis(&mut p.basis);
            p.basis_ready = true;
            /* yaw/pitch scalars accumulated during the slerp stay -
             * compute_look applies them on top of the now-aligned
             * basis so the look direction is continuous across the
             * slerp end. Previously we zeroed them here, which threw
             * away mouse input that came in during the slerp. */
        }
        /* Mouse input during a slerp accumulates into the scalar
         * yaw/pitch (same path as steady-state planet mode) instead
         * of mutating basis directly. The old code rotated basis.up
         * by pitch_delta which fought the slerp's basis.up target,
         * and at slerp-end the forced p.basis.up = target_up was
         * the visible rotation snap. Treating yaw/pitch as scalars
         * here lets the slerp own basis.up exclusively while the
         * player keeps a responsive look during the transition;
         * compute_look layers the scalars on top each frame. */
        p.yaw += yaw_delta as f32;
        p.pitch += pitch_delta as f32;
        if p.pitch > PITCH_LIMIT {
            p.pitch = PITCH_LIMIT;
        }
        if p.pitch < -PITCH_LIMIT {
            p.pitch = -PITCH_LIMIT;
        }
    } else {
        sync_basis_to_planet(p);
        /* Standard tangent-mouse-look - yaw rotates basis.fwd /
         * basis.right around basis.up; pitch is a stored angle that
         * compute_look adds when building the camera matrix. */
        p.yaw += yaw_delta as f32;
        p.pitch += pitch_delta as f32;
        if p.pitch > PITCH_LIMIT {
            p.pitch = PITCH_LIMIT;
        }
        if p.pitch < -PITCH_LIMIT {
            p.pitch = -PITCH_LIMIT;
        }
    }

    let body = p.body.expect("planet mode requires a body");

    /* ---- Walking + jetpack + gravity, all on planet up.
     *
     * Water-state probes feed both the movement-speed scalar (slow
     * down once the body is submerged) and the swim-jump model
     * below. We sample three radii along basis.up:
     *   - feet     (gates feetInWater)
     *   - body     (gates the gravity/drag/movement scalars)
     *   - eyes     (gates the submerged-jump fork, drives "underwater"
     *               look effects in the renderer once those hook in)
     * Without a world handed in the probes default to dry. */
    /* C: `const bool has_world = (w != NULL && w->body == p->body)` -
     * the port carries the same predicate as the filtered Option so
     * every `if (has_world)` becomes `if let Some(w) = ww`. */
    let ww = w.filter(|w| w.body.id == body.id);
    let player_height = l.player_height_m as f64;
    let mut feet_in_water = false;
    let mut body_in_water = false;
    let mut eyes_in_water = false;
    if let Some(w) = ww {
        let center = dvec3_make(body.pos_x, body.pos_y, body.pos_z);
        let local = dvec3_sub(p.position, center);
        let feet_r = dvec3_length(local);
        let local_dir = dvec3_scale(local, 1.0 / if feet_r > 1e-9 { feet_r } else { 1.0 });
        let ft = w.grid.find_tile(local_dir, p.last_tile);
        feet_in_water = w.is_water_at(ft, feet_r);
        body_in_water = w.is_water_at(ft, feet_r + l.water_body_check_height_m as f64);
        eyes_in_water = w.is_water_at(ft, feet_r + EYE_HEIGHT as f64);
    }
    let mut speed = if inp.phys.sprint {
        SPRINT_SPEED
    } else {
        WALK_SPEED
    };
    if body_in_water {
        speed *= l.water_movement_mult;
    }
    let wish = walk_wish(p, &inp.phys);

    /* Water current force. When the player's body is submerged in a
     * flow cell (not a source or sleeping water - those have no flow
     * direction), the cell's flow direction contributes to the same
     * horizontal-step path WASD uses. Project the world-space flow
     * onto the tangent plane so the current is purely horizontal,
     * then feed it through try_horizontal_step alongside WASD so
     * collision against walls / blocks is checked. Going via
     * p.velocity instead would skip try_horizontal_step (the
     * integrator at the end of update() writes velocity * dt
     * straight to position) and let the current push the player
     * through geometry. */
    let mut water_push = dvec3_make(0.0, 0.0, 0.0);
    if let Some(w) = ww {
        if body_in_water {
            let center = dvec3_make(body.pos_x, body.pos_y, body.pos_z);
            let local = dvec3_sub(p.position, center);
            let feet_r = dvec3_length(local);
            let local_dir = dvec3_scale(local, 1.0 / if feet_r > 1e-9 { feet_r } else { 1.0 });
            let feet_tile = w.grid.find_tile(local_dir, p.last_tile);
            let feet_depth = w.radius_to_depth(feet_r);
            if feet_depth >= 0 && feet_depth < WORLD_MAX_DEPTH {
                let mut flow = [0.0f32; 3];
                if world_water::flow_direction(w, feet_tile, feet_depth, &mut flow) {
                    let mut flow_d =
                        dvec3_make(flow[0] as f64, flow[1] as f64, flow[2] as f64);
                    /* Drop the radial component so we don't push the
                     * player through the floor or ceiling. */
                    let radial = dvec3_dot(flow_d, p.basis.up);
                    flow_d = dvec3_sub(flow_d, dvec3_scale(p.basis.up, radial));
                    /* Per-second current strength. Roughly matches a
                     * mild river drift - 1.5 m/s downstream pull at
                     * steady state. Tunable in the future as a YAML
                     * knob alongside the other water flow values. */
                    const CURRENT_STRENGTH: f64 = 1.5;
                    water_push = dvec3_scale(flow_d, CURRENT_STRENGTH * dt as f64);
                }
            }
        }
    }

    if let Some(w) = ww {
        let b = p.basis;
        let cy = (p.yaw as f64).cos();
        let sy = (p.yaw as f64).sin();
        let walk_fwd = dvec3_add(dvec3_scale(b.fwd, cy), dvec3_scale(b.right, sy));
        let strafe = dvec3_add(dvec3_scale(b.fwd, -sy), dvec3_scale(b.right, cy));
        let s = speed as f64 * dt as f64;
        let walk_amt = dvec3_dot(wish, walk_fwd) * s;
        let strafe_amt = dvec3_dot(wish, strafe) * s;
        /* Headroom check is skipped while submerged so the player can
         * swim freely under low ceilings; out of water it gates entry
         * into cramped passages so the head can't clip into stone. */
        let horiz_height = if body_in_water { 0.0 } else { player_height };
        p.position = try_horizontal_step(
            w,
            p,
            p.position,
            dvec3_scale(walk_fwd, walk_amt),
            horiz_height,
        );
        p.position = try_horizontal_step(
            w,
            p,
            p.position,
            dvec3_scale(strafe, strafe_amt),
            horiz_height,
        );
        /* Water current rides the same collision path - applies even
         * with no WASD input, so a drifting player gets carried by the
         * stream without phasing through the bank. */
        if dvec3_dot(water_push, water_push) > 1e-12 {
            p.position = try_horizontal_step(w, p, p.position, water_push, horiz_height);
        }
        let local_dir = dvec3_normalize(player_local_pos(p));
        p.last_tile = w.grid.find_tile(local_dir, p.last_tile);
    } else {
        /* Body anchored but no world handed in (e.g. transition
         * frame before main_web routes the new body's world). Fall
         * back to free walking on the basis tangent. */
        p.position = dvec3_add(p.position, dvec3_scale(wish, speed as f64 * dt as f64));
        p.last_tile = -1;
    }

    /* Vertical velocity along basis.up - kept as a scalar (vy)
     * folded into p.velocity so the space -> planet handoff doesn't
     * need to convert representations. We only USE the basis-up
     * component here; tangential velocity is allowed to coast on
     * for a frame or two as the slerp ends. */
    let mut vy = dvec3_dot(p.velocity, p.basis.up);
    /* Gravity scaled by (a) the body's gravity_g modifier, (b) the
     * smooth falloff multiplier from planet::gravity_at, and (c) the
     * water gravity multiplier while the body is submerged - so the
     * player sinks slowly underwater instead of free-falling. */
    let base_gravity: f32 = 25.0 * body.gravity_g;
    let mut gravity: f32 = base_gravity * gq.multiplier;
    if body_in_water {
        gravity *= l.water_gravity_mult;
    }
    /* Jump / jetpack / swim. Three input branches:
     *   1) Underwater (eyes submerged): jump key is a continuous swim
     *      thrust along basis.up. No tap impulse, no jetpack. Lets
     *      the player surface by holding space. The grounded-jump
     *      branch below still handles the "feet on sea floor, body
     *      submerged" case for an initial push.
     *   2) Grounded, feet in water, eyes above water (wading): the
     *      regular jump impulse fires at full strength.
     *   3) Dry: regular tap-to-jump + hold-for-jetpack as before. */
    if inp.phys.jump {
        p.jump_held_s += dt;
        if eyes_in_water {
            /* Swim up - continuous acceleration while held. Cap at
             * the jetpack terminal so the player can't break the
             * water surface at infinite speed. */
            vy += l.water_swim_force_mps2 as f64 * dt as f64;
            if vy > l.jetpack_max_vy_mps as f64 {
                vy = l.jetpack_max_vy_mps as f64;
            }
            p.jump_consumed = true; /* no separate impulse */
        } else if !p.jump_consumed && p.grounded {
            let mut impulse = l.jump_velocity_mps as f64;
            /* Submerged jump from a sea-floor stance is weakened
             * to roughly the water gravity scale so the player
             * can't launch out of water as if on dry land. */
            if body_in_water {
                impulse *= l.water_submerged_jump_mult as f64;
            }
            vy = impulse;
            p.grounded = false;
            p.jump_consumed = true;
        }
        /* Jetpack stays gated behind the hold threshold and requires
         * the player's HEAD to be above water. Below water the swim
         * thrust (the `eyes_in_water` branch above) is the analogous
         * mechanic and we don't want both stacking. But when the
         * player is half-submerged with body in water and head poking
         * out, the swim thrust is off (eyes dry) and without jetpack
         * they'd be stuck floating on the surface unable to climb out
         * - so this branch fires the moment eyes_in_water flips false,
         * letting them jetpack up out of the water. */
        if !eyes_in_water && p.jump_held_s > l.jetpack_hold_threshold_s && !p.grounded {
            vy += l.jetpack_accel_mps2 as f64 * dt as f64;
            if vy > l.jetpack_max_vy_mps as f64 {
                vy = l.jetpack_max_vy_mps as f64;
            }
        }
    } else {
        p.jump_held_s = 0.0;
        p.jump_consumed = false;
    }
    if !p.grounded {
        vy -= gravity as f64 * dt as f64;
    }
    /* Re-pack vy back into the world-space velocity. Tangential
     * component (orthogonal to basis.up) is damped - without this
     * the player keeps any orbital push from a recent space-mode
     * coast forever. While submerged the damping kicks much harder
     * (per JS PlayerConfig.WATER_DRAG ~ 3 /s) so swimming has the
     * sluggish "moving through honey" feel. */
    let mut vel_tan = dvec3_sub(
        p.velocity,
        dvec3_scale(p.basis.up, dvec3_dot(p.velocity, p.basis.up)),
    );
    let tan_damp_rate = if body_in_water {
        l.water_drag_per_s as f64
    } else {
        2.0
    };
    let tan_damp = (-tan_damp_rate * dt as f64).exp();
    vel_tan = dvec3_scale(vel_tan, tan_damp);
    if body_in_water {
        /* Same exponential drag on the vertical component so the
         * player neither plummets nor rockets while submerged. */
        vy *= (-(l.water_drag_per_s as f64) * dt as f64).exp();
    }
    p.velocity = dvec3_add(vel_tan, dvec3_scale(p.basis.up, vy));

    /* Apply position update from velocity. */
    p.position = dvec3_add(p.position, dvec3_scale(p.velocity, dt as f64));

    /* Ground snap + ceiling collision. Both run only when we have a
     * world for the current body. */
    if let Some(w) = ww {
        let mut local = player_local_pos(p);
        let mut r = dvec3_length(local);
        let local_dir = dvec3_normalize(local);
        /* Re-resolve the tile under the player after the position
         * update so the cave-aware floor finder samples the column
         * we actually moved into. The prev_tile snapshot is what
         * distinguishes a "still in my own column, just overshot
         * the floor" rescue (snap up regardless of distance) from
         * a "drifted tangentially into a tall wall column"
         * (cap snap at step_height to avoid the pop-to-top bug). */
        let prev_tile = p.last_tile;
        let cur_tile = w.grid.find_tile(local_dir, p.last_tile);
        p.last_tile = cur_tile;

        /* Ceiling collision first. If the player's head pokes into a
         * solid voxel - typically because they jumped under an
         * overhang - clamp the radial position back to (ceiling -
         * height) and zero any upward velocity component. Skipped
         * underwater so swimming up against rock simply stops; the
         * player doesn't get teleported. */
        let head_r = r + player_height;
        let ceiling_r = w.ceiling_above(cur_tile, head_r);
        if ceiling_r < head_r && vy > 0.0 && !body_in_water {
            let clamp_r = ceiling_r - player_height;
            p.position = dvec3_add(
                dvec3_make(body.pos_x, body.pos_y, body.pos_z),
                dvec3_scale(local_dir, clamp_r),
            );
            /* Kill the upward velocity; tangential keeps coasting. */
            vy = 0.0;
            vel_tan = dvec3_sub(
                p.velocity,
                dvec3_scale(p.basis.up, dvec3_dot(p.velocity, p.basis.up)),
            );
            p.velocity = vel_tan;
            /* Recompute the snapshot used below. */
            local = player_local_pos(p);
            r = dvec3_length(local);
        } else if ceiling_r < head_r && body_in_water {
            /* Underwater: just nudge radial velocity to zero so the
             * player stops rising into rock without the visible snap. */
            if vy > 0.0 {
                vy = 0.0;
                vel_tan = dvec3_sub(
                    p.velocity,
                    dvec3_scale(p.basis.up, dvec3_dot(p.velocity, p.basis.up)),
                );
                p.velocity = vel_tan;
            }
        }

        /* Voxel-containment resolve. If after all position updates the
         * player's feet voxel is solid, terrain has penetrated the
         * player (peer placed a block at their feet, lag-spike sank
         * them, spawn warped them inside rock, etc). The four rescue
         * gates below (small_step / warped / overshoot) try to predict
         * WHY this happened. This check just asks "are you inside
         * something?" directly, and if yes, pushes to the top of the
         * run of stacked solids.
         *
         * Capped at step + body height (~2.4 m) so a player who drifted
         * tangentially into a tall wall column doesn't get teleported
         * to the wall top - we only resolve intersections the player
         * could plausibly have stepped or dropped into. Larger ones
         * fall through to the heuristic rescues.
         *
         * Replaces the placed_on branch we used to need below: that
         * was a special case of "feet inside solid". This catches it
         * and every cousin (lag, spawn-inside, etc) uniformly. */
        {
            let l_v = config::lod();
            let voxel_resolve_max_lift_m = l_v.step_height_m as f64 + l_v.player_height_m as f64;
            let feet_depth = w.radius_to_depth(r);
            if feet_depth >= 0 && feet_depth < WORLD_MAX_DEPTH {
                let feet_block = w.get(cur_tile, feet_depth);
                if blocks::is_solid(feet_block) {
                    let mut d = feet_depth;
                    while d < WORLD_MAX_DEPTH && blocks::is_solid(w.get(cur_tile, d)) {
                        d += 1;
                    }
                    if d < WORLD_MAX_DEPTH {
                        let new_r = w.depth_to_radius_m(d);
                        let lift = new_r - r;
                        if lift > 0.0 && lift <= voxel_resolve_max_lift_m {
                            /* Only log meaningful corrections. A grounded
                             * player's feet voxel reads solid every frame
                             * and resolves with a sub-centimetre lift that
                             * rounds to 0.00 - logging those floods the
                             * console. Real containment events (a peer
                             * drops a block on you, a lag-sink) lift far
                             * more. Pure log-noise gate; the resolve below
                             * still runs for any positive lift. */
                            const VOXEL_CONTAINMENT_LOG_MIN_LIFT_M: f64 = 0.05;
                            if lift >= VOXEL_CONTAINMENT_LOG_MIN_LIFT_M {
                                eprintln!(
                                    "[player] INFO: voxel-containment \
                                     resolve (body={} tile={} feet_d={} \
                                     top_d={} r={:.2} new_r={:.2} lift={:.2})",
                                    body.name, cur_tile, feet_depth, d, r, new_r, lift
                                );
                            }
                            p.position = dvec3_add(
                                dvec3_make(body.pos_x, body.pos_y, body.pos_z),
                                dvec3_scale(local_dir, new_r),
                            );
                            vel_tan = dvec3_sub(
                                p.velocity,
                                dvec3_scale(p.basis.up, dvec3_dot(p.velocity, p.basis.up)),
                            );
                            p.velocity = vel_tan;
                            vy = 0.0;
                            local = player_local_pos(p);
                            r = dvec3_length(local);
                        }
                    }
                }
            }
        }
        let _ = local; /* C keeps the snapshot current; r is what's read below */

        /* Cave-aware ground snap. The walkable floor closest to the
         * player's feet wins (preferring at-or-below over above), so
         * walking into a cave with an overhang above and a real floor
         * below resolves to the cave floor instead of the overhang
         * top.
         *
         * The "feet below floor" branch needs to handle four
         * distinct situations:
         *   1. BRIDGE DIP - feet slipped a hair under the floor they
         *      were ON via gravity. (gr - r) is small. Snap up to
         *      restore the player to the bridge top.
         *   2. VERTICAL OVERSHOOT - feet were above THIS column's
         *      floor at the start of the frame and have ended up
         *      below it (lag spike, jetpack-fall hitting terrain,
         *      a multi-tile descent crossing into a slightly-lower
         *      tile, spawn placing them inside the procgen-vs-mesh
         *      disagreement). Compared against the start-of-frame
         *      position so the test works ACROSS tile boundaries -
         *      the same_tile check we used to lean on missed the
         *      common "walking + falling = constant tile changes"
         *      case and let the player fall through.
         *   3. WARPED - first frame after spawn / teleport / body
         *      swap (prev_tile = -1). Snap regardless; the warp
         *      target may have been below the surface.
         *   4. TANGENTIAL DRIFT INTO A WALL - player was in a hole
         *      adjacent to a tall column, drifted sideways into the
         *      column tile. The column's only floor is far above
         *      (the wall top) AND was above the player's feet at
         *      frame start too. Do NOT snap - this is the pop-to-
         *      top-of-wall bug; let the player keep falling so
         *      gravity carries them clear of the wall column. */
        let mut gr = w.walkable_floor_near(cur_tile, r, 0.0);
        /* Safety net: if the walkable-floor query finds nothing in
         * the current column (every solid voxel got rejected by the
         * "passable cell above" rule - rare worldgen patterns, dug
         * caverns capped by a single block, or the chunk-rebuild
         * race where blocks were just cleared by the water sim but
         * a stale neighbour reference made the column look unwalk-
         * able), fall back to the top of the topmost solid voxel so
         * the player at least lands on visible terrain instead of
         * dropping into the void. Logs once per occurrence so we can
         * tell whether the fallback is firing in normal play. */
        if gr <= -1e8 {
            let topmost = w.topmost_solid_floor(cur_tile);
            if topmost > -1e8 {
                let logged = S_FALLBACK_LOGGED.with(|c| c.get());
                if logged < 8 {
                    S_FALLBACK_LOGGED.with(|c| c.set(logged + 1));
                    eprintln!(
                        "[player] INFO: walkable-floor-near rejected \
                         every voxel on tile={} - falling back to \
                         topmost-solid floor r={:.2} (event {}/8)",
                        cur_tile,
                        topmost,
                        logged + 1
                    );
                }
                gr = topmost;
            }
        }
        let step_h = config::lod().step_height_m as f64;
        if gr > -1e8 {
            let warped = prev_tile < 0;
            let small_step = (gr - r) <= step_h;
            /* Vertical-overshoot test: was the player AT OR ABOVE this
             * floor at frame start, and below it now? The 0.05 m
             * fudge picks up the case where they were grounded
             * exactly at gr last frame and gravity dipped them under
             * by less than that this frame. The radial component is
             * compared against a slightly-conservative copy of gr,
             * but using the SAME (current-frame) gr for both sides
             * means a wall-drift case (where last frame's r was deep
             * below the wall top) doesn't trip - the wall-top is
             * still way above r_prev, so r_prev >= gr is false. */
            let prev_local = dvec3_sub(
                before.position,
                dvec3_make(body.pos_x, body.pos_y, body.pos_z),
            );
            let r_prev = dvec3_length(prev_local);
            let overshoot = (r_prev >= gr - 0.05) && (r < gr);
            /* placed_on branch removed - the voxel-containment resolve
             * above catches "block placed on me" and every other "feet
             * ended up inside solid" case uniformly. */
            let rescue = small_step || warped || overshoot;
            /* Standard wading state: feet under water but grounded
             * on the seabed. Allowed (player still counts as
             * grounded) so they can jump from the bottom. Fully
             * submerged swimming sets grounded=false even when
             * touching a floor - the JS reference does the same. */
            if r < gr && vy <= 0.0 && rescue {
                if !small_step {
                    /* Big snap - log once per event so we can spot
                     * the pattern in console (helps tell legitimate
                     * spawn rescues from glitchy-physics events). */
                    eprintln!(
                        "[player] INFO: vertical-overshoot rescue \
                         (body={} r={:.2} r_prev={:.2} gr={:.2} delta={:.2} \
                         warped={} overshoot={})",
                        body.name,
                        r,
                        r_prev,
                        gr,
                        gr - r,
                        warped as i32,
                        overshoot as i32
                    );
                }
                let snapped_local = dvec3_scale(local_dir, gr);
                p.position = dvec3_add(
                    dvec3_make(body.pos_x, body.pos_y, body.pos_z),
                    snapped_local,
                );
                vel_tan = dvec3_sub(
                    p.velocity,
                    dvec3_scale(p.basis.up, dvec3_dot(p.velocity, p.basis.up)),
                );
                p.velocity = vel_tan;
                p.grounded = !eyes_in_water;
            } else if (r - gr).abs() < 0.05 && vy <= 0.0 {
                p.grounded = !eyes_in_water;
                vel_tan = dvec3_sub(
                    p.velocity,
                    dvec3_scale(p.basis.up, dvec3_dot(p.velocity, p.basis.up)),
                );
                p.velocity = vel_tan;
            } else {
                p.grounded = false;
            }
        } else {
            p.grounded = false;
        }

        /* Camera-cylinder collider. After all other position updates
         * have settled, push the player horizontally away from any
         * solid voxel face whose edge sits closer than
         * camera_collider_radius_m from the eye at eye-depth. Keeps
         * the perspective near plane (0.3 m) from clipping through
         * walls when the player squeezes up against a column. */
        camera_collider_push(w, p, cur_tile);
    } else {
        p.grounded = false;
    }
    let _ = feet_in_water; /* feet probe reserved for footstep / dive sound hooks */

    /* Record this position as the "last safe" pose if we're solidly
     * standing on a verified solid voxel above bedrock. The bedrock-
     * fall rescue reads this to teleport the player back to where
     * they were actually playing.
     *
     * Conditions for "safe":
     *   - we have a body (not flying in deep space),
     *   - we're grounded this frame,
     *   - the player is at least SAFE_MARGIN_ABOVE_BEDROCK_M above
     *     the body's minimum-line radius,
     *   - AND the voxel directly under the player's feet is solid
     *     (i.e. there's real ground beneath - not a stale grounded
     *     flag carried over from the previous frame). Without this
     *     final check, a player who was grounded for one frame on a
     *     marginal column at r ~ min_line + 16 m can still loop:
     *     the column gets dug out, the flag stays on for a tick,
     *     the recorder snapshots the now-floorless pose, and the
     *     next fall lands the rescue right back at the hole. */
    if let (Some(body), Some(w)) = (p.body, w) {
        if !p.is_in_space && p.grounded && w.body.id == body.id {
            const SAFE_MARGIN_ABOVE_BEDROCK_M: f64 = 16.0;
            let bedrock_r = body.radius_m - 64.0;
            let min_line_r = if bedrock_r > 0.5 { bedrock_r } else { 0.5 };
            let local = dvec3_sub(p.position, dvec3_make(body.pos_x, body.pos_y, body.pos_z));
            let r_now = dvec3_length(local);
            if r_now >= min_line_r + SAFE_MARGIN_ABOVE_BEDROCK_M && r_now > 1e-6 {
                let feet_dir = dvec3_scale(local, 1.0 / r_now);
                let feet_tile = w.grid.find_tile(feet_dir, p.last_tile);
                let feet_depth = w.radius_to_depth(r_now);
                let floor_depth = feet_depth - 1;
                if feet_tile >= 0 && floor_depth >= 0 && floor_depth < WORLD_MAX_DEPTH {
                    let below = w.get(feet_tile, floor_depth);
                    if blocks::is_solid(below) {
                        p.last_good_position = p.position;
                        p.last_good_body = Some(body.id);
                        /* Clean grounded frame on real ground - the
                         * rescue loop budget refreshes ONLY when the
                         * post-rescue window has fully elapsed. Without
                         * this gate, the recorder fires on the first
                         * frame after a rescue (the rescue destination
                         * was deliberately picked to have solid ground
                         * underneath, so the single-frame check trivially
                         * passes), resets the loop count to 0, and the
                         * NEXT fall-through fires as "rescue #1" again -
                         * so the player flickers in an infinite loop
                         * between the rescue spot and bedrock with the
                         * counter never crossing the limit.
                         *
                         * The save-freeze timer (set to 5 s on every
                         * rescue, decremented per frame) is the natural
                         * "we just rescued, don't trust transient ground"
                         * window. While it's still active, count this
                         * grounded frame but don't reset the loop budget.
                         * Once it expires, the player has been on real
                         * ground long enough to clear the budget for
                         * real. */
                        if p.rescue_save_freeze_s <= 0.0 {
                            p.rescue_loop_count = 0;
                        }
                    }
                }
            }
        }
    }

    /* End-of-frame jerk diagnostic. Compares current state against
     * the BEFORE snapshot taken at function entry; logs a single
     * line per "interesting" frame so the bug report can pinpoint
     * the exact event that caused the camera snap. */
    jerk_log(p, &before, w, dt);
}

/// Port of `player_rebuild_basis()`. Cold-rebuild the basis from the
/// player's current position relative to p.body. Use after a teleport
/// or MP-spawn lands the player at a new pose without going through
/// set_body (same body), especially when the player will immediately
/// enter space-mode (is_in_space=true) - space-mode never calls
/// sync_basis_to_planet, so without an explicit rebuild the basis
/// stays at the zero vectors from init, producing a degenerate view
/// matrix and zero-length thrust axes. Safe to call any time p.body is
/// set.
pub fn rebuild_basis(p: &mut PlayerCtrl) {
    if p.body.is_none() {
        return;
    }
    /* physics::tangent_basis fabricates an orthonormal triad with .up
     * pointing radially out from the body and fwd/right arbitrary
     * tangents - good enough for both planet-mode (the slerp will
     * align fwd to look-direction) and space-mode (mouse rotates
     * them freely). Zeroing yaw/pitch keeps the camera consistent:
     * a fresh basis means the saved yaw/pitch are spent now. */
    let local = player_local_pos(p);
    p.basis = physics::tangent_basis(local);
    p.basis_ready = true;
    p.yaw = 0.0;
    p.pitch = 0.0;
}

/// Port of `player_set_body()`. Switch the player's frame of reference
/// to a new body without moving them. Used by the per-frame gravity
/// tracker when the dominant body changes mid-flight. Arms the
/// roll-slerp timer if we're entering a planet's gravity well
/// (was-in-space -> not-in-space) so the basis aligns smoothly. No-op
/// when body is already current.
pub fn set_body(p: &mut PlayerCtrl, body: &BodyConfig) {
    if p.body.map(|b| b.id) == Some(body.id) {
        return;
    }
    p.body = Some(*body);
    p.last_tile = -1;
    /* Always arm the roll slerp on a body swap, not just when
     * leaving space. Two bodies' gravity wells can overlap (Crag /
     * Quartz, asteroid pairs, anywhere two falloff radii kiss),
     * which means the gravity tracker can hand the frame from one
     * planet to another without is_in_space ever flipping true.
     * Without the slerp the next sync_basis_to_planet call would
     * parallel-transport fwd/right through a huge rotation in a
     * single frame - that's the camera-jerk-on-chunk-transition
     * symptom: it isn't actually about chunks, it's about the
     * basis.up vector flipping from "radial w.r.t. old body" to
     * "radial w.r.t. new body" instantly. The slerp spreads that
     * rotation over ROLL_SLERP_DURATION seconds. */
    p.transition_timer_s = config::lod().roll_slerp_duration_s;
    /* Bake any accumulated yaw/pitch into the basis before the
     * slerp starts. During the slerp mouse-look mutates the basis
     * directly (6DOF style), so leaving the scalars non-zero would
     * compound them on top of mouse rotations and warp the view. */
    bake_yaw_pitch_into_basis(p);
}

/// Port of `player_teleport_to()`. Teleport the player to a spot a few
/// metres above the named body's "prime meridian" surface (direction
/// (1, 0, 0) relative to the body). Sets velocity to zero and arms the
/// roll-slerp timer so the camera eases into level on arrival rather
/// than popping. The destination is well within the body's
/// full-gravity radius, so the gravity integrator pulls the player
/// straight onto the surface - no fly mode override, no no-clip drift.
pub fn teleport_to(p: &mut PlayerCtrl, body: &BodyConfig) {
    /* Snap to the destination's prime meridian, ~3 m above the
     * surface - well within the body's full-gravity radius (default
     * 1.4 x r), so the gravity integrator pulls the player straight
     * onto the ground rather than letting them drift through. */
    p.body = Some(*body);
    let center = dvec3_make(body.pos_x, body.pos_y, body.pos_z);
    let offset = dvec3_make(body.radius_m + 3.0, 0.0, 0.0);
    p.position = dvec3_add(center, offset);
    p.velocity = dvec3_make(0.0, 0.0, 0.0);
    p.grounded = false;
    p.is_in_space = false;
    /* Cold-rebuild the basis so the slerp starts from a clean
     * planet-aligned starting point - the old basis pointed at
     * the previous body's surface, which is irrelevant after a
     * cross-system jump. */
    p.basis_ready = false;
    p.last_tile = -1;
    /* Arm the roll-slerp anyway so the very first frame eases the
     * camera into level rather than popping into a fully-locked
     * planet basis from whatever orientation the player was in. */
    p.transition_timer_s = config::lod().roll_slerp_duration_s;
    /* Same yaw/pitch bake reasoning as in set_body - during the
     * post-teleport slerp mouse-look mutates the basis directly,
     * so any leftover scalars would compound and warp the view. */
    p.yaw = 0.0;
    p.pitch = 0.0;
}

/// Port of `player_view()`.
pub fn view(p: &PlayerCtrl) -> Mat4 {
    let (look, up) = compute_look(p);
    /* Eye sits EYE_HEIGHT along the body's surface normal - so the
     * camera's up stays aligned with the local "horizon level" of the
     * body the player is on, matching JS PlanetPlayer.updateCamera.
     *
     * View matrix is built from (eye, look_dir, up) rather than
     * (eye, eye+look, up) so the orientation columns aren't subject
     * to `target - eye` float subtraction at large world distances.
     * Bodies live anywhere in a multi-km world ring; at ~300 m
     * camera-to-world-origin the float epsilon is ~0.005 m, which
     * leaks into the look vector as ~0.3 deg of orientation noise
     * per frame - just enough to read as a micro-snap. Computing
     * the look in doubles (compute_look already does) and passing
     * the direction directly skips that loss; only the translation
     * column carries the eye magnitude, which is harmless. */
    let eye = dvec3_add(p.position, dvec3_scale(p.basis.up, EYE_HEIGHT as f64));
    let eye_f = dvec3_to_vec3(eye);
    let look_f = Vec3 {
        x: look.x as f32,
        y: look.y as f32,
        z: look.z as f32,
    };
    let up_f = Vec3 {
        x: up.x as f32,
        y: up.y as f32,
        z: up.z as f32,
    };
    mat4_look_at_dir(eye_f, look_f, up_f)
}

/* ----------------------------------------------------------------------- */

#[cfg(test)]
mod tests {
    use super::*;
    use tenebris_core::blocks::Block;
    use tenebris_core::planet::BodyId;
    use tenebris_core::world::World;

    /* Headless pin tests. The expected values below were generated by
     * a gcc harness (mingw-w64 x86-64, -O2) that compiled the REAL
     * player_ctrl.c + the C core (math/world/goldberg/planet/
     * planet_gen/config/world_water/physics/inventory/gfx_math) with
     * three stubs - input_state() backed by a settable global,
     * net_client_spawn_body_ready() -> true, and
     * settings_mouse_sensitivity() -> 0.0020f (the compiled default
     * the Rust settings module also reports) - then drove the exact
     * scenario sequences mirrored by each test below and dumped state
     * as IEEE-754 bit patterns.
     *
     * Position / velocity / basis doubles are compared through
     * assert_close (tolerance 1e-9 m / 1e-12 on unit vectors): the
     * sim path runs sin/cos/acos/exp whose last-ulp rounding is
     * libm-specific, so bit-equality across mingw libm and Rust std
     * is not guaranteed - but any algorithmic divergence is metres,
     * not 1e-9. Quantities on transcendental-free paths (spawn
     * position, jump impulse, grounded flags, tile ids, timer
     * arithmetic) are asserted exactly. */

    const DT: f32 = 1.0 / 60.0;

    fn d(bits: u64) -> f64 {
        f64::from_bits(bits)
    }

    fn assert_close(got: f64, want_bits: u64, tol: f64, what: &str) {
        let want = d(want_bits);
        assert!(
            (got - want).abs() <= tol,
            "{}: got {:.17e} (bits {:016x}) want {:.17e} (bits {:016x}) tol {:e}",
            what,
            got,
            got.to_bits(),
            want,
            want.to_bits(),
            tol
        );
    }

    fn assert_dvec3(got: DVec3, want: [u64; 3], tol: f64, what: &str) {
        assert_close(got.x, want[0], tol, &format!("{}.x", what));
        assert_close(got.y, want[1], tol, &format!("{}.y", what));
        assert_close(got.z, want[2], tol, &format!("{}.z", what));
    }

    fn tenebris_world() -> (BodyConfig, World) {
        let body = planet::get(BodyId::Tenebris);
        let mut w = World::create(&body, 4);
        while !w.gen_complete() {
            w.stream_gen(4096);
        }
        (body, w)
    }

    fn clear_input() {
        input::init();
    }

    fn set_phys(f: impl Fn(&mut PhysInput)) {
        input::state_mut(|s| f(&mut s.phys));
    }

    fn steps(p: &mut PlayerCtrl, w: Option<&World>, n: usize) {
        for _ in 0..n {
            update(p, w, DT);
        }
    }

    /* -- A: spawn -> gravity fall -> land --------------------------------- */
    /* -- B: walk forward (WASD acceleration over N fixed-dt steps) -------- */
    /* -- C: tap-jump arc + apex ------------------------------------------- */
    /* -- E: view matrix at fixed yaw/pitch -------------------------------- */
    /* -- G: voxel-containment resolve (peer places block on player) ------- */
    /* One sequential test mirrors the C harness running A->B->C->E->G in a
     * single process, so per-frame state (incl. the thread_local jerk
     * clock) evolves identically. */
    #[test]
    fn pinned_planet_trajectory_suite() {
        clear_input();
        let (body, mut w) = tenebris_world();
        let mut p = PlayerCtrl::default();
        init(&mut p, &body);

        /* A0: spawn pose, exact (pure arithmetic). C pin: pos =
         * (302, 0, 0), vel = 0. */
        assert_eq!(p.position.x.to_bits(), 0x4072e00000000000, "spawn x");
        assert_eq!(p.position.y.to_bits(), 0, "spawn y");
        assert_eq!(p.position.z.to_bits(), 0, "spawn z");
        assert_eq!(p.last_tile, -1);
        assert!(!p.grounded);

        /* A1: 30 gravity-only steps - gravity overshoots into the
         * floor voxel, the voxel-containment resolve pops the feet to
         * the floor top (r = 300 exactly), ground snap grounds. */
        steps(&mut p, Some(&w), 30);
        assert_dvec3(
            p.position,
            [0x4072c00000000000, 0x0000000000000000, 0x0000000000000000],
            1e-9,
            "A1 pos",
        );
        assert_dvec3(
            p.velocity,
            [0x0000000000000000, 0x0000000000000000, 0x0000000000000000],
            1e-9,
            "A1 vel",
        );
        assert!(p.grounded, "A1 grounded");

        /* A2/A3: stays landed and at rest. */
        steps(&mut p, Some(&w), 30);
        let a2 = p.position;
        steps(&mut p, Some(&w), 180);
        assert_eq!(p.position.x.to_bits(), a2.x.to_bits(), "A3 settled x");
        assert_eq!(p.position.y.to_bits(), a2.y.to_bits(), "A3 settled y");
        assert_eq!(p.position.z.to_bits(), a2.z.to_bits(), "A3 settled z");
        assert_dvec3(
            p.position,
            [0x4072c00000000000, 0x0000000000000000, 0x0000000000000000],
            1e-9,
            "A3 pos",
        );
        assert!(p.grounded, "A3 grounded");

        /* B: hold W for 60 steps (walking writes position through
         * try_horizontal_step at a constant 8 m/s; basis.fwd at the
         * prime meridian is +y). C pins after 15 and 60 steps. */
        set_phys(|ph| ph.forward = true);
        steps(&mut p, Some(&w), 15);
        assert_dvec3(
            p.position,
            [0x4072bfe6838d5d63, 0x3ffffff21808b6ed, 0x0000000000000000],
            1e-9,
            "B1 pos",
        );
        steps(&mut p, Some(&w), 45);
        assert_dvec3(
            p.position,
            [0x4072be5266a499db, 0x401fff0dbf2e55ce, 0x0000000000000000],
            1e-9,
            "B2 pos",
        );
        assert!(p.grounded, "B2 grounded");
        set_phys(|ph| ph.forward = false);

        /* C: tap-jump - hold space 6 frames, release, fly the arc. */
        let r_before_jump = dvec3_length(player_local_pos(&p));
        assert_close(r_before_jump, 0x4072c00748213969, 1e-9, "C r before jump");
        set_phys(|ph| ph.jump = true);
        steps(&mut p, Some(&w), 1);
        assert!(!p.grounded, "C jump leaves ground");
        let vy = dvec3_dot(p.velocity, p.basis.up);
        /* C pin: vy = jump_velocity_mps (12) minus one f32-gravity
         * tick (25 * widen(1/60f)) ~ 11.5833333. */
        assert_close(vy, 0x40272aaaa9f00000, 1e-9, "C vy after impulse");
        steps(&mut p, Some(&w), 5);
        set_phys(|ph| ph.jump = false);
        /* Track apex over the remaining arc. C pin: apex at step 28
         * (counting from the impulse frame), apex r ~ 302.78. */
        let mut apex_r = dvec3_length(player_local_pos(&p));
        let mut apex_step = 6;
        for i in 7..=90 {
            steps(&mut p, Some(&w), 1);
            let r = dvec3_length(player_local_pos(&p));
            if r > apex_r {
                apex_r = r;
                apex_step = i;
            }
        }
        assert_eq!(apex_step, 28, "C apex step");
        assert_close(apex_r, 0x4072ec846ff32b30, 1e-9, "C apex r");
        /* Lands back on the floor top (snap quantises r to 300). */
        assert!(p.grounded, "C landed");
        let r_after = dvec3_length(player_local_pos(&p));
        assert_close(r_after, 0x4072c00000000000, 1e-9, "C lands on floor top");

        /* E: view matrix at yaw=0.3, pitch=-0.2. The orientation
         * columns are f32 casts of double-precision math; the C pin
         * matched mingw libm, asserted here at ~1-ulp f32 tolerance
         * for libm safety. */
        p.yaw = 0.3;
        p.pitch = -0.2;
        let m = view(&p);
        let want: [u32; 16] = [
            0x3c01195c, 0x3f798327, 0x3e64edd4, 0x00000000, 0xbe9740a7, 0x3e5d0a8a, 0xbf6e3ff3,
            0x00000000, 0xbf7490ee, 0xbd707abd, 0x3e944a51, 0x00000000, 0x80000000, 0xc393cb45,
            0xc26facb9, 0x3f800000,
        ];
        for (i, wbits) in want.iter().enumerate() {
            let g = m.m[i];
            let wv = f32::from_bits(*wbits);
            assert!(
                (g - wv).abs() <= wv.abs().max(1.0) * 2e-7,
                "E view m[{}]: got {:e} (bits {:08x}) want {:e} (bits {:08x})",
                i,
                g,
                g.to_bits(),
                wv,
                wv.to_bits()
            );
        }
        p.yaw = 0.0;
        p.pitch = 0.0;

        /* G: voxel-containment resolve - a peer places a block at the
         * player's feet; the next update lifts the player to the top
         * of the solid run, zeroes vy, keeps them in the same column.
         * C pins: grounded at r = 300 exactly before, 301 exactly
         * after (one block of lift). */
        let local = player_local_pos(&p);
        let r = dvec3_length(local);
        assert_close(r, 0x4072c00000000000, 1e-9, "G r before");
        let tile = w.grid.find_tile(dvec3_normalize(local), -1);
        let feet_depth = w.radius_to_depth(r);
        w.set(tile, feet_depth, Block::Stone);
        steps(&mut p, Some(&w), 1);
        let r_lifted = dvec3_length(player_local_pos(&p));
        assert_close(r_lifted, 0x4072d00000000000, 1e-9, "G containment lift = 1 block");
        let vy_g = dvec3_dot(p.velocity, p.basis.up);
        assert!(
            vy_g.abs() < 1e-12,
            "G vy zeroed after containment resolve (got {})",
            vy_g
        );
        assert!(p.grounded, "G grounded on lifted floor");
    }

    /* -- D: space mode - 6DOF thrust, mouse yaw, Q-roll ------------------- */
    #[test]
    fn pinned_space_mode_suite() {
        clear_input();
        let (body, w) = tenebris_world();
        let mut p = PlayerCtrl::default();
        init(&mut p, &body);
        /* Park well outside every gravity well (Tenebris falloff
         * 540 m, Luna's tops out at 6000 +- 144 m). Mirror of the MP
         * manual-warp flow: set position, cold-rebuild the basis. */
        p.position = dvec3_make(0.0, 12000.0, 0.0);
        rebuild_basis(&mut p);

        /* 60 steps: thrust forward + steady look-stick yaw
         * (look_stick_x = 0.15 at LOOK_STICK_SENS 2.4 -> 0.006
         * rad/frame). The look stick is used instead of the mouse so
         * the scenario doesn't read settings::mouse_sensitivity() - a
         * process-global the settings tests mutate concurrently. */
        set_phys(|ph| ph.forward = true);
        input::state_mut(|s| {
            s.look_stick_active = true;
            s.look_stick_x = 0.15;
        });
        steps(&mut p, Some(&w), 60);
        assert!(p.is_in_space, "D in space");
        assert!(!p.grounded);
        assert_eq!(p.last_tile, -1);
        assert_dvec3(
            p.position,
            [0x4014a1ac1e82d570, 0x40c7700000000000, 0x3fe672873aed48eb],
            1e-8,
            "D1 pos",
        );
        assert_dvec3(
            p.velocity,
            [0x4020bb35792da6dc, 0x0000000000000000, 0x3ffdb8aa8fe0146b],
            1e-8,
            "D1 vel",
        );
        assert_dvec3(
            p.basis.fwd,
            [0x3fedf2dddc4dd42b, 0x0000000000000000, 0x3fd68ba96967471c],
            1e-12,
            "D1 basis.fwd",
        );
        assert_dvec3(
            p.basis.up,
            [0x0000000000000000, 0x3ff0000000000000, 0x0000000000000000],
            1e-12,
            "D1 basis.up",
        );

        /* 30 steps of Q-roll (roll_left): basis banks around fwd by
         * -space_roll_speed * dt per frame; up tilts away from radial
         * while fwd holds (to re-orthonormalisation noise). */
        set_phys(|ph| {
            ph.forward = false;
            ph.roll_left = true;
        });
        input::state_mut(|s| {
            s.look_stick_active = false;
            s.look_stick_x = 0.0;
        });
        steps(&mut p, Some(&w), 30);
        assert_dvec3(
            p.basis.up,
            [0x3fd2f8afa26463d2, 0x3fe14a27f8255c88, 0xbfe933722fb3a645],
            1e-12,
            "D2 basis.up after roll",
        );
        assert_dvec3(
            p.basis.fwd,
            [0x3fedf2dddc4dd42b, 0xbc8e55b11b7ca6e9, 0x3fd68ba96967471b],
            1e-12,
            "D2 basis.fwd held by roll",
        );
    }

    /* -- F: teleport arms the roll-slerp ----------------------------------- */
    #[test]
    fn pinned_teleport_suite() {
        clear_input();
        let (body, w) = tenebris_world();
        let mut p = PlayerCtrl::default();
        init(&mut p, &body);
        steps(&mut p, Some(&w), 30); /* land on Tenebris so the basis is live */

        let luna = planet::get(BodyId::Luna);
        teleport_to(&mut p, &luna);
        /* Destination is exact arithmetic: center + (radius + 3, 0, 0). */
        assert_eq!(p.position.x.to_bits(), 0x4054c00000000000, "F pos.x = 83");
        assert_eq!(p.position.y.to_bits(), 0x40b7700000000000, "F pos.y = 6000");
        assert_eq!(p.position.z.to_bits(), 0, "F pos.z");
        assert_eq!(p.velocity.x, 0.0);
        assert!(!p.grounded && !p.is_in_space && !p.basis_ready);
        assert_eq!(p.last_tile, -1);
        assert_eq!(p.transition_timer_s, 3.0, "F slerp armed (lod default)");
        assert_eq!(p.yaw, 0.0);
        assert_eq!(p.pitch, 0.0);

        /* 10 update frames against the (mismatched, Tenebris) world -
         * has_world is false so movement falls back to the no-world
         * path while gravity pulls toward Luna's centre (-x from the
         * prime-meridian spawn). The pre-teleport basis.up was already
         * (1,0,0) = Luna's radial, so the slerp's first frame snaps up
         * exactly (d > 0.99999999 branch). C pins after 10 steps;
         * the timer chain is pure f32 arithmetic -> exact. */
        steps(&mut p, Some(&w), 10);
        assert_eq!(
            (p.transition_timer_s as f64).to_bits(),
            0x4006aaaac0000000,
            "F timer countdown"
        );
        assert_dvec3(
            p.position,
            [0x4054b638e37d1c72, 0x40b7700000000000, 0x0000000000000000],
            1e-9,
            "F2 pos (gravity fall toward Luna)",
        );
        assert_dvec3(
            p.basis.up,
            [0x3ff0000000000000, 0x0000000000000000, 0x0000000000000000],
            1e-12,
            "F2 basis.up snapped to Luna radial",
        );
        assert!(!p.basis_ready, "F slerp still owns the basis");
    }

    /* -- set_body: mid-flight swap arms slerp + bakes yaw/pitch ------------ */
    #[test]
    fn set_body_arms_slerp_and_bakes_look() {
        clear_input();
        let (body, w) = tenebris_world();
        let mut p = PlayerCtrl::default();
        init(&mut p, &body);
        steps(&mut p, Some(&w), 30); /* basis live + grounded */

        p.yaw = 0.5;
        p.pitch = 0.3;
        let look_before = compute_look(&p).0;

        /* Same body: no-op. */
        let t_before = p.transition_timer_s;
        set_body(&mut p, &body);
        assert_eq!(p.yaw, 0.5, "same-body set_body is a no-op");
        assert_eq!(p.transition_timer_s, t_before);

        let luna = planet::get(BodyId::Luna);
        set_body(&mut p, &luna);
        assert_eq!(p.body.map(|b| b.id), Some(BodyId::Luna));
        assert_eq!(p.last_tile, -1);
        assert_eq!(p.transition_timer_s, 3.0, "slerp armed on swap");
        assert_eq!(p.yaw, 0.0, "yaw baked");
        assert_eq!(p.pitch, 0.0, "pitch baked");
        /* The bake must preserve the look direction: with yaw/pitch
         * zeroed, compute_look now returns (close to) the same vector
         * straight from the basis. */
        let look_after = compute_look(&p).0;
        assert!(
            dvec3_dot(look_before, look_after) > 1.0 - 1e-9,
            "bake preserves look dir (dot = {})",
            dvec3_dot(look_before, look_after)
        );
    }

    /* -- hotbar: key select + wheel cycling with wrap ----------------------- */
    #[test]
    fn hotbar_select_and_wheel_wrap() {
        clear_input();
        let (body, w) = tenebris_world();
        let mut p = PlayerCtrl::default();
        init(&mut p, &body);

        input::state_mut(|s| s.hotbar[3] = true);
        update(&mut p, Some(&w), DT);
        assert_eq!(p.inventory.selected, 3);
        input::state_mut(|s| s.hotbar[3] = false);

        /* Wheel down cycles forward with wrap; fractional deltas
         * accumulate across frames (trackpad). */
        input::state_mut(|s| s.wheel_dy = -0.6);
        update(&mut p, Some(&w), DT);
        assert_eq!(p.inventory.selected, 3, "fraction not yet a step");
        update(&mut p, Some(&w), DT);
        assert_eq!(p.inventory.selected, 4, "accumulated -1.2 steps once");
        input::state_mut(|s| s.wheel_dy = -(INV_HOTBAR_SLOTS as f32));
        update(&mut p, Some(&w), DT);
        assert_eq!(p.inventory.selected, 4, "full lap wraps to same slot");
        /* Wheel up cycles backward (accum is -0.2 from the fractional
         * leftovers, so +5.0 yields 4 whole steps: 4 -> 0). */
        input::state_mut(|s| s.wheel_dy = 5.0);
        update(&mut p, Some(&w), DT);
        assert_eq!(p.inventory.selected, 0, "4.8 accum steps back 4 slots");
    }
}
