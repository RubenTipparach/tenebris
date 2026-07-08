//! Port of `tenebris-c/src/client/remote_players.{c,h}`.
//!
//! Tracks every other connected player's last-reported pose. The local
//! player is excluded - net_client filters by the player_id from
//! WELCOME so the client's own avatar isn't drawn twice.
//!
//! Renames (per PORTING.md rule 4 - module prefix dropped):
//! - `remote_players_init()`              -> `remote_players::init()`
//! - `remote_players_shutdown()`          -> `remote_players::shutdown()`
//! - `remote_players_set_from_snapshot()` -> `remote_players::set_from_snapshot()`
//!   (takes a slice; the slice length replaces the C `count` arg, the
//!   `count < 0` clamp is structurally impossible, the `> MAX` clamp
//!   survives as a truncation)
//! - `remote_players_count()`             -> `remote_players::count()`
//! - `remote_players_get()`               -> `remote_players::get()`
//!   (returns `Option<RemotePlayer>` by value instead of a pointer)
//! - `remote_players_draw()`              -> `remote_players::draw()`
//! - `remote_players_draw_nameplates()`   -> `remote_players::draw_nameplates()`
//! - `remote_players_name_fn`             -> a `&dyn Fn(u32) -> Option<String>`
//!   parameter (`None` / empty string = the C NULL / "" fallback path)
//! - `REMOTE_PLAYERS_MAX`                 -> `MAX_PLAYERS`
//!
//! # sokol boundary
//!
//! Drawing goes straight through sokol-gl / sokol-debugtext like the
//! C, but the math that decides WHAT gets drawn is factored into pure
//! helpers so tests can run headless:
//! - [`interp_pose`] - the prev/cur snapshot interpolation + walk-cycle
//!   swing from `remote_players_draw`'s loop body.
//! - [`box_vertices`] - the 36 (position, colour) pairs the C `box()`
//!   emits through `sgl_c3f` / `sgl_v3f`. The C sets the colour once
//!   per face; sokol-gl stamps the current colour on every vertex, so
//!   emitting an explicit per-vertex colour is byte-identical.
//! - [`planet_up_basis`] / [`lerp_yaw`] / [`mat4_mul_vec4`] - direct
//!   ports, already pure in the C.
//! - [`build_nameplate_entries`] - the projection / culling / fallback
//!   naming pass of `remote_players_draw_nameplates`; the draw fn just
//!   submits the entries. (Storing `String` also fixes the C's
//!   dangling `fallback[20]` stack buffer - rendered text identical.)
//!
//! `stm_sec(stm_now())` is reached through the `now_sec()` seam;
//! tests swap in a settable clock (same pattern as `input.rs`).

#![allow(dead_code)] // consumed by the net_client/renderer/main waves of the port

use crate::gfx_math::Mat4;
use crate::renderer;
use sokol::debugtext as sdtx;
use sokol::gfx as sg;
use sokol::gl as sgl;
use std::cell::{Cell, RefCell};
use tenebris_core::math::DVec3;

/// Port of `REMOTE_PLAYERS_MAX`.
pub const MAX_PLAYERS: usize = 16;

/// Port of `remote_pose_t`. Incoming pose from a SNAPSHOT entry.
/// net_client builds an array of these from the decoded snapshot and
/// hands it to [`set_from_snapshot`], which then owns the interp
/// machinery (prev/cur poses + timestamps).
#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub struct RemotePose {
    pub player_id: u32,
    pub body_id: u32,
    pub pos: DVec3,
    pub yaw: f32,
    pub pitch: f32,
}

/// Port of `remote_player_t`. One slot per known remote player. The
/// renderer interpolates between `pos_prev` (pose at second-most-recent
/// snapshot) and `pos_cur` (pose at most-recent snapshot), lagging
/// displayed motion by one snapshot interval so it stays smooth across
/// the 6.7 Hz update rate. Classic Source-style entity interpolation.
#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub struct RemotePlayer {
    pub player_id: u32,
    pub body_id: u32,
    pub pos_prev: DVec3,
    pub pos_cur: DVec3,
    pub yaw_prev: f32,
    pub yaw_cur: f32,
    pub pitch_prev: f32,
    pub pitch_cur: f32,
    /// monotonic seconds at last update
    pub snapshot_time_s: f64,
    pub active: bool,
}

/// Port of the C file's module-static `R`.
struct State {
    players: [RemotePlayer; MAX_PLAYERS],
    count: i32,
}

impl Default for State {
    fn default() -> Self {
        State { players: [RemotePlayer::default(); MAX_PLAYERS], count: 0 }
    }
}

thread_local! {
    static R: RefCell<State> = RefCell::new(State::default());
    /* The C keeps these as function-local statics inside
     * remote_players_draw / remote_players_draw_nameplates; lazily
     * created on first use the same way. */
    static PIP3D: Cell<sgl::Pipeline> = const { Cell::new(sgl::Pipeline { id: 0 }) };
    static PIP_ALPHA: Cell<sgl::Pipeline> = const { Cell::new(sgl::Pipeline { id: 0 }) };
}

/* Server broadcasts at ~6.7 Hz so the gap between snapshots is
 * ~150 ms. Interpolating across that window lags the displayed
 * pose by one snapshot interval but keeps motion smooth. */
const INTERP_DELAY_S: f64 = 0.150;

/* --------------------------------------------------------------------- */
/* sokol time seam - see module docs. */

#[cfg(not(test))]
fn now_sec() -> f64 {
    sokol::time::sec(sokol::time::now())
}

#[cfg(test)]
use test_doubles::now_sec;

#[cfg(test)]
mod test_doubles {
    use std::cell::Cell;

    thread_local! {
        pub static NOW_S: Cell<f64> = const { Cell::new(0.0) };
    }

    pub fn now_sec() -> f64 {
        NOW_S.with(|c| c.get())
    }

    pub fn set_now(s: f64) {
        NOW_S.with(|c| c.set(s));
    }
}

/* --------------------------------------------------------------------- */

/// Port of `remote_players_init()`.
pub fn init() {
    R.with(|r| *r.borrow_mut() = State::default());
}

/// Port of `remote_players_shutdown()`.
pub fn shutdown() {}

/// Port of `remote_players_set_from_snapshot()`. Wholesale-replace
/// from a freshly-arrived SNAPSHOT. Matches each incoming pose to the
/// previous one by player_id so the prev/cur interp pair survives
/// across snapshots.
pub fn set_from_snapshot(arr: &[RemotePose]) {
    let count = arr.len().min(MAX_PLAYERS);

    let now = now_sec();

    R.with(|r| {
        let mut r = r.borrow_mut();

        let mut fresh = [RemotePlayer::default(); MAX_PLAYERS];

        for (i, input) in arr.iter().take(count).enumerate() {
            /* Look up the previous slot for this player_id so prev pose
             * survives across snapshots. Linear scan is cheap at N=16. */
            let mut old: Option<&RemotePlayer> = None;
            for j in 0..r.count as usize {
                if r.players[j].active && r.players[j].player_id == input.player_id {
                    old = Some(&r.players[j]);
                    break;
                }
            }

            let slot = &mut fresh[i];
            slot.player_id = input.player_id;
            slot.body_id = input.body_id;
            slot.pos_cur = input.pos;
            slot.yaw_cur = input.yaw;
            slot.pitch_cur = input.pitch;
            if let Some(old) = old {
                slot.pos_prev = old.pos_cur;
                slot.yaw_prev = old.yaw_cur;
                slot.pitch_prev = old.pitch_cur;
            } else {
                /* New player - no history yet; snap to the incoming pose. */
                slot.pos_prev = input.pos;
                slot.yaw_prev = input.yaw;
                slot.pitch_prev = input.pitch;
            }
            slot.snapshot_time_s = now;
            slot.active = true;
        }

        r.players = fresh;
        r.count = count as i32;
    });
}

/// Port of `remote_players_count()`.
pub fn count() -> i32 {
    R.with(|r| r.borrow().count)
}

/// Port of `remote_players_get()`. Returns `None` out of range
/// (the C returned NULL).
pub fn get(i: i32) -> Option<RemotePlayer> {
    R.with(|r| {
        let r = r.borrow();
        if i < 0 || i >= r.count {
            return None;
        }
        Some(r.players[i as usize])
    })
}

/* ------------------------------------------------------------------ */
/* Drawing                                                              */
/* ------------------------------------------------------------------ */

/// Pure half of the C `box()`: the 36 (position, colour) vertex pairs
/// for a colour-shaded cuboid centred on (cx, cy, cz) with extents
/// (hx, hy, hz). Top and bottom faces get a slight tone bias so the
/// mesh reads three-dimensional without baked lighting. Emission order
/// matches the C `sgl_v3f` sequence exactly; the per-face `sgl_c3f`
/// becomes a colour stamped on each of that face's 6 vertices (which
/// is what sokol-gl does internally anyway).
#[allow(clippy::too_many_arguments)]
fn box_vertices(
    cx: f32,
    cy: f32,
    cz: f32,
    hx: f32,
    hy: f32,
    hz: f32,
    r: f32,
    g: f32,
    b: f32,
) -> [([f32; 3], [f32; 3]); 36] {
    let (x0, x1) = (cx - hx, cx + hx);
    let (y0, y1) = (cy - hy, cy + hy);
    let (z0, z1) = (cz - hz, cz + hz);

    /* Bake per-face shading so even with no lighting model the cuboid
     * silhouettes read clearly. Top brightest, bottom darkest, sides
     * intermediate; the dim_xz / dim_z deltas pick out the front
     * and back independently. */
    let top = [r * 1.10, g * 1.10, b * 1.10];
    let bot = [r * 0.55, g * 0.55, b * 0.55];
    let mid = [r, g, b];
    let xs = [r * 0.80, g * 0.80, b * 0.80];

    [
        /* +Y top - CCW from outside (viewed from +Y looking down). */
        ([x0, y1, z0], top), ([x1, y1, z1], top), ([x1, y1, z0], top),
        ([x0, y1, z0], top), ([x0, y1, z1], top), ([x1, y1, z1], top),
        /* -Y bottom - CCW from outside (viewed from -Y looking up). */
        ([x0, y0, z0], bot), ([x1, y0, z0], bot), ([x1, y0, z1], bot),
        ([x0, y0, z0], bot), ([x1, y0, z1], bot), ([x0, y0, z1], bot),
        /* +Z front */
        ([x0, y0, z1], mid), ([x1, y0, z1], mid), ([x1, y1, z1], mid),
        ([x0, y0, z1], mid), ([x1, y1, z1], mid), ([x0, y1, z1], mid),
        /* -Z back */
        ([x0, y0, z0], xs), ([x1, y1, z0], xs), ([x1, y0, z0], xs),
        ([x0, y0, z0], xs), ([x0, y1, z0], xs), ([x1, y1, z0], xs),
        /* +X right */
        ([x1, y0, z0], xs), ([x1, y1, z1], xs), ([x1, y0, z1], xs),
        ([x1, y0, z0], xs), ([x1, y1, z0], xs), ([x1, y1, z1], xs),
        /* -X left */
        ([x0, y0, z0], mid), ([x0, y0, z1], mid), ([x0, y1, z1], mid),
        ([x0, y0, z0], mid), ([x0, y1, z1], mid), ([x0, y1, z0], mid),
    ]
}

/// GPU half of the C `box()`: submits [`box_vertices`] through
/// sokol-gl. Each call is its own `sgl_begin_triangles` / `sgl_end`
/// pair so the caller is free to push / rotate / pop the modelview
/// between parts (the walk cycle does this per limb).
#[allow(clippy::too_many_arguments)]
fn draw_box(cx: f32, cy: f32, cz: f32, hx: f32, hy: f32, hz: f32, r: f32, g: f32, b: f32) {
    let verts = box_vertices(cx, cy, cz, hx, hy, hz, r, g, b);
    sgl::begin_triangles();
    for (p, c) in verts.iter() {
        sgl::c3f(c[0], c[1], c[2]);
        sgl::v3f(p[0], p[1], p[2]);
    }
    sgl::end();
}

/// Port of `planet_up_basis()`. Build a 4x4 column-major rotation that
/// maps local +Y to `up`, picks an arbitrary tangent forward. Used so
/// the humanoid stands radial-up on the planet instead of along
/// world-Y. Forward axis isn't tracked across snapshots (yaw is just a
/// scalar), so the choice of reference is the same convention as
/// phys_tangent_basis - close enough that remote players don't
/// moonwalk sideways when walking around the equator.
fn planet_up_basis(ux: f64, uy: f64, uz: f64) -> [f32; 16] {
    /* Pick a reference axis not parallel to up so the cross product is
     * well-defined. Same threshold as phys_tangent_basis. */
    let (rx, ry, rz): (f64, f64, f64) =
        if uy.abs() < 0.9 { (0.0, 1.0, 0.0) } else { (1.0, 0.0, 0.0) };
    /* right = normalize(cross(ref, up)) */
    let mut cx = ry * uz - rz * uy;
    let mut cy = rz * ux - rx * uz;
    let mut cz = rx * uy - ry * ux;
    let cl = (cx * cx + cy * cy + cz * cz).sqrt();
    if cl < 1e-9 {
        /* should not happen given the threshold above */
        let mut out = [0.0f32; 16];
        out[0] = 1.0;
        out[5] = 1.0;
        out[10] = 1.0;
        out[15] = 1.0;
        return out;
    }
    cx /= cl;
    cy /= cl;
    cz /= cl;
    /* fwd = cross(up, right) */
    let fx = uy * cz - uz * cy;
    let fy = uz * cx - ux * cz;
    let fz = ux * cy - uy * cx;
    /* Humanoid local axes: +X right, +Y up, faces toward -Z (the head
     * draws at +Y, the body grows along +Y). Map local +Z to -fwd so
     * the face direction (-Z) is +fwd. Column-major: col0=right,
     * col1=up, col2=-fwd, col3=origin. */
    let mut out = [0.0f32; 16];
    out[0] = cx as f32;
    out[1] = cy as f32;
    out[2] = cz as f32;
    out[3] = 0.0;
    out[4] = ux as f32;
    out[5] = uy as f32;
    out[6] = uz as f32;
    out[7] = 0.0;
    out[8] = -(fx as f32);
    out[9] = -(fy as f32);
    out[10] = -(fz as f32);
    out[11] = 0.0;
    out[12] = 0.0;
    out[13] = 0.0;
    out[14] = 0.0;
    out[15] = 1.0;
    out
}

/// Port of `draw_humanoid()`. Procedural humanoid. ~1.8 m tall, origin
/// at feet, faces -Z at yaw=0. Six axis-aligned boxes drawn through
/// the sgl modelview stack so legs and arms can swing for a walk
/// cycle.
///
/// Anatomy (origin = feet, +Y up):
///   foot  ground level
///   hips  y = 0.80 m       (legs are 0.40 m half-height boxes)
///   chest y = 1.10 m       (torso 0.30 m half-height)
///   shoulder y = 1.40 m    (arms 0.30 m half-height, hang from chest top)
///   head  y = 1.60 m       (0.13 m cube)
///
/// `swing_rad` rotates legs / arms around their hip / shoulder pivot
/// in the X axis (forward / back). Right limbs swing opposite to
/// left, arms counter-phase to legs - classic walk cycle. swing_rad
/// == 0 = idle pose.
///
/// `up_x/y/z` is the planet radial direction at the figure's feet,
/// already normalised. The whole figure is rotated so its local +Y
/// aligns with that vector, so the avatar stands upright on the
/// planet's surface regardless of where on the sphere it stands.
#[allow(clippy::too_many_arguments)]
fn draw_humanoid(cx: f32, cy: f32, cz: f32, yaw: f32, swing_rad: f32, up_x: f64, up_y: f64, up_z: f64) {
    /* Move the whole figure to its world position, rotate so local
     * +Y points along the planet radial, then apply yaw around the
     * local up axis (now +Y in the figure frame) before drawing the
     * limbs.
     *   - MODEL_YAW_OFFSET (+pi/2): the limbs / torso are built with
     *     the figure's side facing +Z in body-local space; this
     *     trailing turn re-aligns the front with the yaw forward
     *     vector so remote players don't walk sideways to their
     *     heading.
     *   - yaw_sign = -1: the local player's yaw convention is the
     *     reverse of sgl_rotate's positive-around-+Y direction for
     *     this basis, so the model appeared to mirror the camera
     *     ('I look left, the other player sees me look right').
     *     Negating yaw fixes the mirror without disturbing the
     *     +90 deg side-vs-front offset. */
    const MODEL_YAW_OFFSET: f32 = 1.570_796_326_79; /* +pi/2 */
    sgl::push_matrix();
    sgl::translate(cx, cy, cz);
    let basis = planet_up_basis(up_x, up_y, up_z);
    sgl::mult_matrix(&basis[0]);
    sgl::rotate(-yaw + MODEL_YAW_OFFSET, 0.0, 1.0, 0.0);

    /* Torso - fixed, centred on the chest. */
    sgl::push_matrix();
    sgl::translate(0.0, 1.10, 0.0);
    draw_box(0.0, 0.0, 0.0, 0.22, 0.30, 0.13, 0.25, 0.45, 0.80);
    sgl::pop_matrix();

    /* Head - fixed, on top of torso. */
    sgl::push_matrix();
    sgl::translate(0.0, 1.60, 0.0);
    draw_box(0.0, 0.0, 0.0, 0.13, 0.13, 0.13, 0.95, 0.78, 0.62);
    sgl::pop_matrix();

    /* Left leg - pivot at hip, hangs down. swing_rad rotates around
     * X so the leg sweeps forward / back as the figure walks. */
    sgl::push_matrix();
    sgl::translate(-0.12, 0.80, 0.0);
    sgl::rotate(swing_rad, 1.0, 0.0, 0.0);
    sgl::translate(0.0, -0.40, 0.0);
    draw_box(0.0, 0.0, 0.0, 0.10, 0.40, 0.10, 0.20, 0.20, 0.30);
    sgl::pop_matrix();

    /* Right leg - opposite phase. */
    sgl::push_matrix();
    sgl::translate(0.12, 0.80, 0.0);
    sgl::rotate(-swing_rad, 1.0, 0.0, 0.0);
    sgl::translate(0.0, -0.40, 0.0);
    draw_box(0.0, 0.0, 0.0, 0.10, 0.40, 0.10, 0.20, 0.20, 0.30);
    sgl::pop_matrix();

    /* Left arm - counter-phase to left leg (== same sign as right
     * leg) so opposite-side limbs swing forward together. Pivots at
     * the shoulder (top of torso). */
    sgl::push_matrix();
    sgl::translate(-0.30, 1.40, 0.0);
    sgl::rotate(-swing_rad, 1.0, 0.0, 0.0);
    sgl::translate(0.0, -0.30, 0.0);
    draw_box(0.0, 0.0, 0.0, 0.08, 0.30, 0.10, 0.20, 0.40, 0.75);
    sgl::pop_matrix();

    /* Right arm - opposite the left. */
    sgl::push_matrix();
    sgl::translate(0.30, 1.40, 0.0);
    sgl::rotate(swing_rad, 1.0, 0.0, 0.0);
    sgl::translate(0.0, -0.30, 0.0);
    draw_box(0.0, 0.0, 0.0, 0.08, 0.30, 0.10, 0.20, 0.40, 0.75);
    sgl::pop_matrix();

    sgl::pop_matrix();
}

/// Port of `lerp_yaw()`. Minimal-angle interpolation for yaw - wraps
/// past +/-pi so a snap from +179 deg to -179 deg goes the short way
/// around.
fn lerp_yaw(a: f32, b: f32, t: f32) -> f32 {
    let mut diff = b - a;
    const TWO_PI: f32 = 6.283_185_307_179_586_476_92;
    const PI: f32 = 3.141_592_653_589_793_238_46;
    while diff > PI {
        diff -= TWO_PI;
    }
    while diff < -PI {
        diff += TWO_PI;
    }
    a + diff * t
}

/// Interpolated draw state for one remote player - the loop body of
/// the C `remote_players_draw` up to (but not including) the
/// `draw_humanoid` call, factored out so tests can pin the sampled
/// pose at fixed times.
#[derive(Clone, Copy, Debug, PartialEq)]
struct InterpPose {
    lx: f32,
    ly: f32,
    lz: f32,
    yaw: f32,
    swing_rad: f32,
    ux: f64,
    uy: f64,
    uz: f64,
}

fn interp_pose(p: &RemotePlayer, now: f64) -> InterpPose {
    let dt = now - p.snapshot_time_s;
    let mut t = dt / INTERP_DELAY_S;
    t = t.clamp(0.0, 1.0);

    let lx = (p.pos_prev.x + (p.pos_cur.x - p.pos_prev.x) * t) as f32;
    let ly = (p.pos_prev.y + (p.pos_cur.y - p.pos_prev.y) * t) as f32;
    let lz = (p.pos_prev.z + (p.pos_cur.z - p.pos_prev.z) * t) as f32;
    let yaw = lerp_yaw(p.yaw_prev, p.yaw_cur, t as f32);

    /* Walk cycle. Speed is the horizontal distance covered between
     * the prev/cur snapshot poses divided by the interp window.
     * Above ~0.5 m/s we play a swing animation at 1.4 Hz scaled
     * to the speed (capped so very fast players don't flail). */
    let dxh = p.pos_cur.x - p.pos_prev.x;
    let dzh = p.pos_cur.z - p.pos_prev.z;
    let mut horizontal_speed = (dxh * dxh + dzh * dzh).sqrt() / INTERP_DELAY_S;
    let mut swing_rad = 0.0f32;
    if horizontal_speed > 0.4 {
        let mut cycle_hz = 1.4;
        let swing_amp = 0.45; /* radians, ~26 degrees */
        if horizontal_speed > 4.0 {
            horizontal_speed = 4.0;
        }
        cycle_hz *= horizontal_speed * 0.5;
        swing_rad = (swing_amp * (now * cycle_hz * 6.28318530718).sin()) as f32;
    }

    /* The player's reported position is the FEET anchor, same as
     * G.player.position. draw_humanoid grows upward from cy along
     * the planet radial computed from the interpolated position. */
    let ul = ((lx as f64) * (lx as f64) + (ly as f64) * (ly as f64) + (lz as f64) * (lz as f64))
        .sqrt();
    let (ux, uy, uz) = if ul > 1e-6 {
        ((lx as f64) / ul, (ly as f64) / ul, (lz as f64) / ul)
    } else {
        (0.0, 1.0, 0.0)
    };

    InterpPose { lx, ly, lz, yaw, swing_rad, ux, uy, uz }
}

/// Port of `remote_players_draw()`. Draw markers for every remote
/// player. Uses sokol_gl directly so the call has to land inside the
/// 3D pass (after the offscreen world draw but before the swapchain
/// composite - see main_web.c for the slot).
pub fn draw(view: Mat4, proj: Mat4) {
    let (players, count) = R.with(|r| {
        let r = r.borrow();
        (r.players, r.count)
    });
    if count == 0 {
        return;
    }

    /* World-space sgl context: flushes inside the offscreen scene pass
     * so humanoids z-sort against the terrain depth buffer and sit
     * UNDER the water pass + composite post-process instead of being
     * painted over them (see renderer::sgl_world_begin). */
    renderer::sgl_world_begin();
    sgl::defaults();
    sgl::matrix_mode_projection();
    sgl::load_matrix(&proj.m[0]);
    sgl::matrix_mode_modelview();
    sgl::load_matrix(&view.m[0]);

    let mut pip3d = PIP3D.with(|p| p.get());
    if pip3d.id == 0 {
        /* Depth state is explicit: humanoids must z-sort against
         * terrain + each other in the offscreen pass. write_enabled
         * + LESS lets a near figure occlude a far one and lets the
         * terrain occlude figures behind it. Created while the WORLD
         * sgl context is current, so sokol-gl compiles it against the
         * offscreen Rgba8 + DEPTH_STENCIL attachment formats.
         *
         * cull_mode=BACK because box() emits CCW-from-outside winding
         * for every face (verified: see the per-face vertex order in
         * box_vertices() above). Culling back faces halves the
         * fragment work for the six-cube-per-figure mesh.
         * face_winding=CCW matches sokol-gl's default, called out
         * explicitly so a future tweak to sgl_setup doesn't silently
         * flip the convention. */
        pip3d = sgl::make_pipeline(&sg::PipelineDesc {
            depth: sg::DepthState {
                write_enabled: true,
                compare: sg::CompareFunc::Less,
                ..Default::default()
            },
            cull_mode: sg::CullMode::Back,
            face_winding: sg::FaceWinding::Ccw,
            ..Default::default()
        });
        PIP3D.with(|p| p.set(pip3d));
    }
    sgl::load_pipeline(pip3d);

    let now = now_sec();

    for p in players.iter().take(count as usize) {
        if !p.active {
            continue;
        }
        let ip = interp_pose(p, now);
        draw_humanoid(ip.lx, ip.ly, ip.lz, ip.yaw, ip.swing_rad, ip.ux, ip.uy, ip.uz);
    }

    renderer::sgl_world_end();
    /* No sgl_draw here. The world context flushes once inside the
     * offscreen pass (compose_to_swapchain); calling sgl_draw mid-flow
     * would upload only this context's vertices so far and starve any
     * geometry recorded after it. */
}

/// Port of `mat4_mul_vec4()` (file-local helper). Multiply a 4x4
/// column-major matrix by a homogeneous (x,y,z,1). The renderer
/// follows the column-major convention (m[0..3] = column 0, etc.).
fn mat4_mul_vec4(m: &[f32; 16], x: f32, y: f32, z: f32) -> (f32, f32, f32, f32) {
    (
        m[0] * x + m[4] * y + m[8] * z + m[12],
        m[1] * x + m[5] * y + m[9] * z + m[13],
        m[2] * x + m[6] * y + m[10] * z + m[14],
        m[3] * x + m[7] * y + m[11] * z + m[15],
    )
}

/// One projected nameplate, ready to draw. Port of the anonymous
/// `entries[]` struct in `remote_players_draw_nameplates`.
struct NameplateEntry {
    tx: f32,
    ty: f32,
    text_w: f32,
    name: String,
}

/* Nameplate glyph metrics (the C keeps these as locals in
 * remote_players_draw_nameplates; shared here between the pure build
 * pass and the submit pass). */
const NAMEPLATE_SCALE: f32 = 1.0;
const NAMEPLATE_CELL: f32 = 8.0 * NAMEPLATE_SCALE;

/// Pure half of `remote_players_draw_nameplates`: projects every
/// visible remote player to screen coords and caches the result.
/// Two render passes follow in [`draw_nameplates`]: dark backdrops via
/// sokol_gl, then yellow text via sokol_debugtext on top. Caching
/// keeps the math from running twice and lets us sort backdrop draws
/// into a single sgl batch.
fn build_nameplate_entries(
    players: &[RemotePlayer],
    count: usize,
    now: f64,
    view: &Mat4,
    proj: &Mat4,
    screen_w: f32,
    screen_h: f32,
    name_fn: &dyn Fn(u32) -> Option<String>,
) -> Vec<NameplateEntry> {
    /* vp = proj * view, column-major. Use HandmadeMath-equivalent
     * manual multiply to avoid pulling in a different math lib. */
    let mut vp = [0.0f32; 16];
    for col in 0..4 {
        for row in 0..4 {
            let mut acc = 0.0f32;
            for k in 0..4 {
                acc += proj.m[k * 4 + row] * view.m[col * 4 + k];
            }
            vp[col * 4 + row] = acc;
        }
    }

    let cell = NAMEPLATE_CELL;
    let mut entries: Vec<NameplateEntry> = Vec::with_capacity(MAX_PLAYERS);

    for p in players.iter().take(count) {
        if !p.active {
            continue;
        }
        let name = match name_fn(p.player_id) {
            Some(n) if !n.is_empty() => n,
            /* Never skip the plate - always show SOMETHING so a
             * silent peer isn't visually anonymous. PLAYER_INFO is
             * eventual; once it lands the cache returns the real
             * name and this branch stops firing. */
            _ => format!("id-{}", p.player_id),
        };

        let dt = now - p.snapshot_time_s;
        let mut t = dt / INTERP_DELAY_S;
        t = t.clamp(0.0, 1.0);

        /* Anchor the nameplate at head height + a little extra so it
         * floats clear of the model's hair. The +2.1 offset MUST be
         * along the player's local up (= radial direction from the
         * body centre) - adding to world +Y put the plate to the
         * SIDE of any player who wasn't standing at the +Y pole. */
        let wx = (p.pos_prev.x + (p.pos_cur.x - p.pos_prev.x) * t) as f32;
        let wy = (p.pos_prev.y + (p.pos_cur.y - p.pos_prev.y) * t) as f32;
        let wz = (p.pos_prev.z + (p.pos_cur.z - p.pos_prev.z) * t) as f32;
        let ulen = (wx * wx + wy * wy + wz * wz).sqrt();
        let (mut ux, mut uy, mut uz) = (0.0f32, 1.0f32, 0.0f32);
        if ulen > 1e-6 {
            ux = wx / ulen;
            uy = wy / ulen;
            uz = wz / ulen;
        }
        const HEAD_OFF: f32 = 2.1;
        let head_x = wx + ux * HEAD_OFF;
        let head_y = wy + uy * HEAD_OFF;
        let head_z = wz + uz * HEAD_OFF;

        let (cx, cy, _cz, cw) = mat4_mul_vec4(&vp, head_x, head_y, head_z);
        /* Behind-the-camera: skip. */
        if cw <= 0.001 {
            continue;
        }

        let ndc_x = cx / cw;
        let ndc_y = cy / cw;
        /* Clip-space y is +up in GL; screen px is +down. Flip. */
        let sx = (ndc_x * 0.5 + 0.5) * screen_w;
        let sy = (1.0 - (ndc_y * 0.5 + 0.5)) * screen_h;

        let n = name.len() as i32;
        let text_w = cell * (n as f32);
        let tx = sx - text_w * 0.5;
        let ty = sy - cell;

        /* Off-screen? Skip - keeps text from oozing along the edges
         * when a player is way off to the side. */
        if tx < -text_w || tx > screen_w {
            continue;
        }
        if ty < -cell || ty > screen_h {
            continue;
        }

        entries.push(NameplateEntry { tx, ty, text_w, name });
    }

    entries
}

/// Port of `remote_players_draw_nameplates()`. Queue nameplates as
/// sdtx text above each remote player's head. Call AFTER [`draw`],
/// INSIDE the swapchain pass where sdtx is accumulating text.
/// main_web passes the screen dimensions + a lookup that maps
/// player_id to a display string (the net_client name cache;
/// `None` / empty = no name known yet).
pub fn draw_nameplates(
    view: Mat4,
    proj: Mat4,
    screen_w: f32,
    screen_h: f32,
    name_fn: &dyn Fn(u32) -> Option<String>,
) {
    let (players, count) = R.with(|r| {
        let r = r.borrow();
        (r.players, r.count)
    });
    if count == 0 {
        return;
    }

    let now = now_sec();
    let entries = build_nameplate_entries(
        &players,
        count as usize,
        now,
        &view,
        &proj,
        screen_w,
        screen_h,
        name_fn,
    );

    if entries.is_empty() {
        return;
    }

    let scale = NAMEPLATE_SCALE;
    let cell = NAMEPLATE_CELL;

    /* ----- Pass 1: dark transparent backdrop rectangles via sgl ----- */
    let mut pip_alpha = PIP_ALPHA.with(|p| p.get());
    if pip_alpha.id == 0 {
        let mut desc = sg::PipelineDesc::new();
        desc.colors[0].blend = sg::BlendState {
            enabled: true,
            src_factor_rgb: sg::BlendFactor::SrcAlpha,
            dst_factor_rgb: sg::BlendFactor::OneMinusSrcAlpha,
            src_factor_alpha: sg::BlendFactor::One,
            dst_factor_alpha: sg::BlendFactor::One,
            ..Default::default()
        };
        pip_alpha = sgl::make_pipeline(&desc);
        PIP_ALPHA.with(|p| p.set(pip_alpha));
    }
    sgl::defaults();
    sgl::matrix_mode_projection();
    sgl::load_identity();
    sgl::ortho(0.0, screen_w, screen_h, 0.0, -1.0, 1.0);
    sgl::matrix_mode_modelview();
    sgl::load_identity();
    sgl::load_pipeline(pip_alpha);

    const PAD_X: f32 = 4.0;
    const PAD_Y: f32 = 2.0;
    sgl::begin_quads();
    sgl::c4f(0.0, 0.0, 0.0, 0.65);
    for e in &entries {
        let x0 = e.tx - PAD_X;
        let y0 = e.ty - PAD_Y;
        let x1 = e.tx + e.text_w + PAD_X;
        let y1 = e.ty + cell + PAD_Y;
        sgl::v2f(x0, y0);
        sgl::v2f(x1, y0);
        sgl::v2f(x1, y1);
        sgl::v2f(x0, y1);
    }
    sgl::end();
    /* No sgl_draw - see draw()'s matching comment. */

    /* ----- Pass 2: nameplate text via sdtx on top of the backdrop ----- */
    sdtx::canvas(screen_w / scale, screen_h / scale);
    sdtx::font(1);
    sdtx::color3b(0xff, 0xe8, 0x80);
    for e in &entries {
        sdtx::origin(e.tx / cell, e.ty / cell);
        sdtx::home();
        sdtx::puts(&e.name);
    }
    sdtx::font(0);
}

/* ----------------------------------------------------------------------- */

#[cfg(test)]
mod tests {
    use super::test_doubles::set_now;
    use super::*;
    use crate::gfx_math::mat4_identity;
    use tenebris_core::math::dvec3_make;

    const EPS: f32 = 1e-6;

    fn pose(id: u32, pos: DVec3, yaw: f32) -> RemotePose {
        RemotePose { player_id: id, body_id: 0, pos, yaw, pitch: 0.0 }
    }

    /* ------------------------------------------------------------- */
    /* Snapshot bookkeeping                                            */

    #[test]
    fn snapshot_threads_prev_cur_by_player_id() {
        init();
        set_now(10.0);
        set_from_snapshot(&[pose(7, dvec3_make(1.0, 2.0, 3.0), 0.5)]);
        assert_eq!(count(), 1);
        let p = get(0).unwrap();
        assert!(p.active);
        assert_eq!(p.player_id, 7);
        // New player: no history, snaps to the incoming pose.
        assert_eq!(p.pos_prev, dvec3_make(1.0, 2.0, 3.0));
        assert_eq!(p.pos_cur, dvec3_make(1.0, 2.0, 3.0));
        assert_eq!(p.yaw_prev, 0.5);
        assert_eq!(p.yaw_cur, 0.5);
        assert_eq!(p.snapshot_time_s, 10.0);

        set_now(10.1);
        set_from_snapshot(&[pose(7, dvec3_make(4.0, 6.0, 9.0), 1.0)]);
        let p = get(0).unwrap();
        // Known player: prev pose carries the old cur.
        assert_eq!(p.pos_prev, dvec3_make(1.0, 2.0, 3.0));
        assert_eq!(p.pos_cur, dvec3_make(4.0, 6.0, 9.0));
        assert_eq!(p.yaw_prev, 0.5);
        assert_eq!(p.yaw_cur, 1.0);
        assert_eq!(p.snapshot_time_s, 10.1);

        // A player missing from the next snapshot disappears; a new
        // id snaps with no history.
        set_now(10.2);
        set_from_snapshot(&[pose(9, dvec3_make(5.0, 5.0, 5.0), 2.0)]);
        assert_eq!(count(), 1);
        let p = get(0).unwrap();
        assert_eq!(p.player_id, 9);
        assert_eq!(p.pos_prev, dvec3_make(5.0, 5.0, 5.0));
        // get() out of range = None (C returned NULL).
        assert!(get(1).is_none());
        assert!(get(-1).is_none());
    }

    #[test]
    fn snapshot_caps_at_max_players() {
        init();
        set_now(1.0);
        let poses: Vec<RemotePose> = (0..20)
            .map(|i| pose(i as u32, dvec3_make(i as f64, 0.0, 0.0), 0.0))
            .collect();
        set_from_snapshot(&poses);
        assert_eq!(count(), MAX_PLAYERS as i32);
        // First MAX_PLAYERS entries survive, in order.
        assert_eq!(get(0).unwrap().player_id, 0);
        assert_eq!(get(15).unwrap().player_id, 15);
        assert!(get(16).is_none());
        // Empty snapshot clears everyone.
        set_from_snapshot(&[]);
        assert_eq!(count(), 0);
    }

    /* ------------------------------------------------------------- */
    /* Interpolation                                                   */

    fn interp_fixture() -> RemotePlayer {
        RemotePlayer {
            player_id: 1,
            body_id: 0,
            pos_prev: dvec3_make(0.0, 0.0, 0.0),
            pos_cur: dvec3_make(0.45, 0.0, 0.0),
            yaw_prev: 3.0,
            yaw_cur: -3.0,
            pitch_prev: 0.0,
            pitch_cur: 0.0,
            snapshot_time_s: 0.0,
            active: true,
        }
    }

    #[test]
    fn interp_pose_pinned_at_fixed_times() {
        let p = interp_fixture();

        // Half-way through the 150 ms window: t = 0.5.
        let ip = interp_pose(&p, 0.075);
        assert_eq!(ip.lx, 0.225); // f64 lerp, f32 cast: exact
        assert_eq!(ip.ly, 0.0);
        assert_eq!(ip.lz, 0.0);
        // Yaw wraps the short way: 3.0 -> -3.0 passes through +pi.
        assert!((ip.yaw - 3.1415927).abs() < 1e-6, "yaw = {}", ip.yaw);
        // Walk swing: speed = 0.45/0.15 = 3 m/s > 0.4; cycle_hz =
        // 1.4 * 1.5 = 2.1; swing = 0.45 * sin(0.075 * 2.1 * 2pi).
        assert!((ip.swing_rad - 0.37611333).abs() < 1e-6, "swing = {}", ip.swing_rad);
        // Up = interpolated position normalised.
        assert!((ip.ux - 1.0).abs() < 1e-9);
        assert_eq!(ip.uy, 0.0);
        assert_eq!(ip.uz, 0.0);

        // At/after the window end the pose clamps to cur.
        let ip = interp_pose(&p, 0.15);
        assert_eq!(ip.lx, 0.45);
        let ip = interp_pose(&p, 99.0);
        assert_eq!(ip.lx, 0.45);

        // Before the snapshot time it clamps to prev.
        let ip = interp_pose(&p, -1.0);
        assert_eq!(ip.lx, 0.0);
        assert_eq!(ip.yaw, 3.0);
    }

    #[test]
    fn interp_pose_idle_at_origin() {
        // Stationary player at the origin: no swing, degenerate up
        // falls back to +Y.
        let mut p = interp_fixture();
        p.pos_prev = dvec3_make(0.0, 0.0, 0.0);
        p.pos_cur = dvec3_make(0.0, 0.0, 0.0);
        p.yaw_prev = 1.0;
        p.yaw_cur = 1.0;
        let ip = interp_pose(&p, 0.075);
        assert_eq!(ip.swing_rad, 0.0);
        assert_eq!((ip.ux, ip.uy, ip.uz), (0.0, 1.0, 0.0));
    }

    #[test]
    fn lerp_yaw_pinned() {
        assert_eq!(lerp_yaw(0.1, 0.2, 0.5), 0.1 + (0.2f32 - 0.1) * 0.5);
        // Wrap: +3.0 to -3.0 is +0.2831853 rad the short way.
        let y = lerp_yaw(3.0, -3.0, 0.5);
        assert!((y - 3.1415927).abs() < 1e-6, "y = {y}");
        // No wrap inside (-pi, pi).
        assert_eq!(lerp_yaw(0.0, 1.0, 0.25), 0.25);
    }

    /* ------------------------------------------------------------- */
    /* Avatar geometry                                                 */

    #[test]
    fn box_vertices_pinned() {
        let v = box_vertices(1.0, 2.0, 3.0, 0.5, 1.0, 1.5, 0.2, 0.4, 0.6);
        assert_eq!(v.len(), 36);
        // Extents: x 0.5..1.5, y 1.0..3.0, z 1.5..4.5.
        // Top face first vertex: (x0,y1,z0), colour * 1.10.
        assert_eq!(v[0].0, [0.5, 3.0, 1.5]);
        assert_eq!(v[0].1, [0.2f32 * 1.10, 0.4f32 * 1.10, 0.6f32 * 1.10]);
        assert_eq!(v[1].0, [1.5, 3.0, 4.5]);
        // Bottom face starts at 6: (x0,y0,z0), colour * 0.55.
        assert_eq!(v[6].0, [0.5, 1.0, 1.5]);
        assert_eq!(v[6].1, [0.2f32 * 0.55, 0.4f32 * 0.55, 0.6f32 * 0.55]);
        // +Z front at 12 keeps the base colour.
        assert_eq!(v[12].0, [0.5, 1.0, 4.5]);
        assert_eq!(v[12].1, [0.2, 0.4, 0.6]);
        // -Z back at 18 dims by 0.80.
        assert_eq!(v[18].0, [0.5, 1.0, 1.5]);
        assert_eq!(v[18].1, [0.2f32 * 0.80, 0.4f32 * 0.80, 0.6f32 * 0.80]);
        // +X right at 24 also dims by 0.80.
        assert_eq!(v[24].0, [1.5, 1.0, 1.5]);
        assert_eq!(v[24].1, v[18].1);
        // -X left at 30 keeps the base colour; last vertex is (x0,y1,z0).
        assert_eq!(v[30].1, [0.2, 0.4, 0.6]);
        assert_eq!(v[35].0, [0.5, 3.0, 1.5]);
    }

    #[test]
    fn planet_up_basis_pinned() {
        // up = +Y (|uy| >= 0.9): ref = (1,0,0); right = ref x up =
        // (0,0,1); fwd = up x right = (1,0,0); col2 = -fwd.
        let m = planet_up_basis(0.0, 1.0, 0.0);
        let want: [f32; 16] = [
            0.0, 0.0, 1.0, 0.0, // col 0 = right
            0.0, 1.0, 0.0, 0.0, // col 1 = up
            -1.0, 0.0, 0.0, 0.0, // col 2 = -fwd
            0.0, 0.0, 0.0, 1.0,
        ];
        for i in 0..16 {
            assert!((m[i] - want[i]).abs() <= EPS, "m[{}]: {} vs {}", i, m[i], want[i]);
        }
        // up = +Z (|uy| < 0.9): ref = (0,1,0); right = ref x up =
        // (1,0,0); fwd = up x right = (0,1,0); col2 = -fwd.
        let m = planet_up_basis(0.0, 0.0, 1.0);
        let want: [f32; 16] = [
            1.0, 0.0, 0.0, 0.0, // col 0 = right
            0.0, 0.0, 1.0, 0.0, // col 1 = up
            0.0, -1.0, 0.0, 0.0, // col 2 = -fwd
            0.0, 0.0, 0.0, 1.0,
        ];
        for i in 0..16 {
            assert!((m[i] - want[i]).abs() <= EPS, "m[{}]: {} vs {}", i, m[i], want[i]);
        }
    }

    /* ------------------------------------------------------------- */
    /* Nameplates                                                      */

    #[test]
    fn nameplate_entries_pinned() {
        init();
        set_now(50.0);
        set_from_snapshot(&[pose(9, dvec3_make(0.0, 0.0, 0.0), 0.0)]);
        let (players, count) = R.with(|r| {
            let r = r.borrow();
            (r.players, r.count)
        });

        // proj scales y by 0.2 so the +2.1 head offset lands on
        // screen; view = identity. Head projects to ndc (0, 0.42).
        let view = mat4_identity();
        let mut proj = mat4_identity();
        proj.m[5] = 0.2;

        // No name known: fallback "id-9" (4 chars, text_w 32).
        let entries = build_nameplate_entries(
            &players, count as usize, 50.0, &view, &proj, 800.0, 600.0, &|_| None,
        );
        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].name, "id-9");
        assert_eq!(entries[0].text_w, 32.0);
        assert!((entries[0].tx - 384.0).abs() < 1e-3, "tx = {}", entries[0].tx);
        assert!((entries[0].ty - 166.0).abs() < 1e-3, "ty = {}", entries[0].ty);

        // Known name: centred on the same pixel with its own width.
        let entries = build_nameplate_entries(
            &players, count as usize, 50.0, &view, &proj, 800.0, 600.0,
            &|id| if id == 9 { Some("bob".to_string()) } else { None },
        );
        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].name, "bob");
        assert_eq!(entries[0].text_w, 24.0);
        assert!((entries[0].tx - 388.0).abs() < 1e-3, "tx = {}", entries[0].tx);

        // Empty string from the cache also falls back (C checked
        // !*name).
        let entries = build_nameplate_entries(
            &players, count as usize, 50.0, &view, &proj, 800.0, 600.0,
            &|_| Some(String::new()),
        );
        assert_eq!(entries[0].name, "id-9");
    }

    #[test]
    fn nameplate_skips_behind_camera() {
        init();
        set_now(50.0);
        // Perspective-style w = -z: a player at +Z is behind the
        // camera (cw <= 0.001) and must be skipped.
        set_from_snapshot(&[pose(3, dvec3_make(0.0, 0.0, 5.0), 0.0)]);
        let (players, count) = R.with(|r| {
            let r = r.borrow();
            (r.players, r.count)
        });
        let view = mat4_identity();
        let mut proj = Mat4 { m: [0.0; 16] };
        proj.m[0] = 1.0;
        proj.m[5] = 1.0;
        proj.m[10] = 1.0;
        proj.m[11] = -1.0; // clip w = -z
        let entries = build_nameplate_entries(
            &players, count as usize, 50.0, &view, &proj, 800.0, 600.0, &|_| None,
        );
        assert!(entries.is_empty());
    }
}
