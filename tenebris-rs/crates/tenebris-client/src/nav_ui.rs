//! KSP-style flight navigation: orbit lines in the world, a navball HUD,
//! and target selection.
//!
//! Everything here is presentation over `tenebris_core::nav` - the conic
//! math lives in Core so the numbers shown agree with the physics that SP
//! and MP actually integrate.
//!
//! - **World pass** ([`draw_world`]): the rocket's orbit as a polyline
//!   (ellipse cyan, escape arc orange) around the DOMINANT body, with
//!   Ap/Pe ticks; the station's true orbit track; a halo cage around the
//!   current target. The rocket's line hides inside the station's
//!   approach sphere - once you're arriving, docking owns the screen,
//!   not the trajectory (the user's "no trajectory inside an SOI" rule;
//!   for moons the same rule shows up as the conic RE-FOCUSING on the
//!   moon when its field becomes dominant).
//! - **HUD pass** ([`draw_hud`]): a navball. The ball is the attitude
//!   sphere around the craft: centre = where the NOSE points, up/down on
//!   screen = what W/S will do, left/right = what A/D will do - by
//!   construction, because the ball's axes ARE the craft's steering axes.
//!   That is the "which axis will WASD pitch/yaw" readout, always true in
//!   both camera alignments. Sky/ground halves split at the local
//!   horizon; markers for prograde/retrograde, radial out, orbit normal,
//!   and the target.
//! - **Targets** ([`cycle_target`]): station first, then the moons and
//!   planets. T cycles while flying (T is Plant on foot - farming is
//!   surface-only, so the key is free in flight).
//!
//! Navball geometry/colour constants live at the top of this file for
//! now; migrating them to ui.yaml per the tunables rule is a follow-up
//! (they're one block, sized to move).

use std::cell::Cell;

use sokol::debugtext as sdtx;
use sokol::gfx as sg;
use sokol::gl as sgl;

use crate::gfx_math::Mat4;
use crate::renderer;
use tenebris_core::math::{
    dvec3_add, dvec3_cross, dvec3_dot, dvec3_length, dvec3_make, dvec3_normalize, dvec3_scale,
    dvec3_sub, DVec3,
};
use tenebris_core::nav::{self, Conic};
use tenebris_core::planet::{self, BodyId};
use tenebris_core::station;

/* ------------------------------ tunables ------------------------------ */
/* Navball look. TODO(ui.yaml): designer knobs, move to config in the UI
 * polish pass - kept in one block so the migration is mechanical. */
const BALL_RADIUS_PX: f32 = 92.0;
const BALL_MARGIN_PX: f32 = 26.0; /* above the screen bottom */
const BALL_SEGS: usize = 48;
const MARKER_R_PX: f32 = 6.0;
/// Beyond this many body radii the ground hemisphere swings from the planet
/// to the star (the "brown points at the SOI, sun if heliocentric" rule).
const SOI_RADII: f64 = 60.0;
/// Pitch-ladder tick colours: major (10 deg, with a number) brighter than the
/// minor (5 deg) ticks, both faint enough that markers stay legible.
const LADDER_MAJOR: [f32; 4] = [0.90, 0.94, 1.0, 0.7];
const LADDER_MINOR: [f32; 4] = [0.80, 0.86, 0.95, 0.4];
const SKY: [f32; 4] = [0.18, 0.42, 0.72, 0.92];
const GROUND: [f32; 4] = [0.52, 0.33, 0.16, 0.95];
const RIM: [f32; 4] = [0.85, 0.88, 0.95, 0.9];
const NOSE_COL: [f32; 4] = [1.0, 0.85, 0.2, 1.0];
const PROGRADE: [f32; 4] = [0.75, 0.95, 0.3, 1.0];
const RETROGRADE: [f32; 4] = [0.95, 0.5, 0.2, 1.0];
const RADIAL_OUT: [f32; 4] = [0.3, 0.9, 0.95, 1.0];
const NORMAL: [f32; 4] = [0.8, 0.4, 0.95, 1.0];
const TARGET_COL: [f32; 4] = [0.98, 0.35, 0.75, 1.0];
/* Orbit lines. 768 chords keeps a 10 km ellipse looking like a curve even
 * fully zoomed out (~80 m per chord); lines are near-free to draw. */
const ORBIT_SEGS: usize = 768;
const ELLIPSE_COL: [f32; 4] = [0.35, 0.9, 0.95, 0.85];
const ESCAPE_COL: [f32; 4] = [0.95, 0.6, 0.25, 0.85];
/// Maneuver-gizmo colours (KSP-style burn handles) + the divergent predicted
/// trajectory (purple). Prograde green, normal purple, radial cyan; the
/// negative handle of each pair is a dimmer shade of the same hue.
const H_PROGRADE: [f32; 4] = [0.75, 0.95, 0.30, 1.0];
const H_RETRO: [f32; 4] = [0.55, 0.70, 0.25, 1.0];
const H_NORMAL: [f32; 4] = [0.70, 0.35, 0.95, 1.0];
const H_NORMAL_B: [f32; 4] = [0.48, 0.26, 0.72, 1.0];
const H_RADIAL: [f32; 4] = [0.30, 0.85, 0.95, 1.0];
const H_RADIAL_B: [f32; 4] = [0.22, 0.58, 0.70, 1.0];
const H_CENTER: [f32; 4] = [1.0, 0.90, 0.35, 1.0];
/// The purple divergent curve = the trajectory the planned burn produces.
const NODE_PATH_COL: [f32; 4] = [0.72, 0.38, 0.95, 0.9];

/// Master switch for the maneuver-planner egui controls ([`egui_maneuver`]).
pub const MANEUVER_ENABLED: bool = true;
/// The in-world 3D maneuver gizmo ([`draw_node`]): burn handles at the node
/// oriented to the orbital plane + the divergent purple trajectory. ON now -
/// it is NaN-guarded (a diverged conic draws nothing) and draws UNDER the
/// ship's attitude arrows, so it can't obscure the gizmo like the old version.
const NODE_OVERLAY_ENABLED: bool = true;
const STATION_TRACK_COL: [f32; 4] = [0.4, 0.8, 0.6, 0.55];
/// The moons' orbit rings - cooler + fainter than the station's so the
/// dockable target stays the loudest line on the chart.
const MOON_TRACK_COL: [f32; 4] = [0.7, 0.72, 0.85, 0.45];
const HYPERBOLA_CLIP_M: f64 = 40_000.0;
/* Inside this many dock radii of the station the rocket's trajectory line
 * hides - the approach/docking UI is what matters there. */
const STATION_SOI_DOCK_RADII: f64 = 2.0;

/* ------------------------------ targets ------------------------------- */

/// Something the pilot can target: the orbital station or a celestial
/// body. Asteroids are skipped - ten belt rocks in the cycle order would
/// bury the six worth flying to.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Target {
    Station,
    Body(BodyId),
}

/// Cycle order: the station (the flight everyone is making), Tenebris's
/// moons, then the outer planets and their moons.
const TARGETS: &[Target] = &[
    Target::Station,
    Target::Body(BodyId::Luna),
    Target::Body(BodyId::Selene),
    Target::Body(BodyId::Sequoia),
    Target::Body(BodyId::Verdant),
    Target::Body(BodyId::Sprout),
    Target::Body(BodyId::Crag),
    Target::Body(BodyId::Quartz),
    Target::Body(BodyId::Frostbite),
    Target::Body(BodyId::Rime),
];

thread_local! {
    /// Current maneuver target. Persists across flights on purpose -
    /// re-boarding shouldn't forget the plan. Stored as the Target itself
    /// (not a TARGETS index) so the solar-system map can set ANY body -
    /// including belt asteroids, which the T-cycle deliberately skips.
    static TARGET_SEL: Cell<Option<Target>> = const { Cell::new(None) };
}

/// Advance to the next target (station -> moons -> planets -> none).
/// A target outside the cycle order (e.g. an asteroid picked on the map)
/// steps to the front of the cycle.
pub fn cycle_target() {
    TARGET_SEL.with(|c| {
        let next = match c.get().and_then(|t| TARGETS.iter().position(|&x| x == t)) {
            None if c.get().is_some() => Some(TARGETS[0]), /* off-cycle -> front */
            None => Some(TARGETS[0]),                      /* none -> front */
            Some(i) if i + 1 < TARGETS.len() => Some(TARGETS[i + 1]),
            Some(_) => None, /* last -> none */
        };
        c.set(next);
    });
}

pub fn target() -> Option<Target> {
    TARGET_SEL.with(|c| c.get())
}

/// Set (or clear) the maneuver target directly - the solar-system map's
/// entry point. Accepts any body, asteroids included.
pub fn set_target(t: Option<Target>) {
    TARGET_SEL.with(|c| c.set(t));
}

/* --------------------------- maneuver node ---------------------------- */

/// A planned burn: how far ahead on the orbit it sits (`dt`, seconds) and
/// the prograde / normal / radial delta-v (m/s) applied there. The heavy
/// lifting - propagating to the node and re-solving the conic - is Core
/// (`nav::plan_burn`); this just holds the edit state.
#[derive(Clone, Copy)]
struct Node {
    dt: f64,
    pro: f64,
    nrm: f64,
    rad: f64,
}

thread_local! {
    /// The active maneuver node, if the pilot is planning one. Persists
    /// across the flight like the target does.
    static NODE: Cell<Option<Node>> = const { Cell::new(None) };
}

/// Is a maneuver node currently being planned?
pub fn node_active() -> bool {
    NODE.with(|c| c.get().is_some())
}

/// Create a node (seeded a quarter-period ahead with a zero burn) or clear
/// the existing one. `period_s` is the current orbit's period for the lead
/// time; non-finite (escape orbit) falls back to a fixed lead.
pub fn toggle_node(period_s: f64) {
    NODE.with(|c| {
        if c.get().is_some() {
            c.set(None);
        } else {
            let dt = if period_s.is_finite() && period_s > 0.0 { period_s * 0.25 } else { 120.0 };
            c.set(Some(Node { dt, pro: 0.0, nrm: 0.0, rad: 0.0 }));
        }
    });
}

/// Drop the current node.
pub fn clear_node() {
    NODE.with(|c| c.set(None));
}

/// The node's edit state (time-to-node s, prograde, normal, radial m/s), or
/// `None` when no node is planned. For the egui editor.
pub fn node_params() -> Option<(f64, f64, f64, f64)> {
    NODE.with(|c| c.get().map(|n| (n.dt, n.pro, n.nrm, n.rad)))
}

/// Write the node's edit state back (a no-op if no node is planned). Time is
/// clamped non-negative - you can't plan a burn in the past.
pub fn set_node_params(dt: f64, pro: f64, nrm: f64, rad: f64) {
    NODE.with(|c| {
        if c.get().is_some() {
            c.set(Some(Node { dt: dt.max(0.0), pro, nrm, rad }));
        }
    });
}

/// The planned burn for the current ship state: propagates the node onto the
/// orbit and re-solves the resulting conic. `None` when no node is set or the
/// orbit can't be propagated (degenerate / radial).
pub fn node_plan(pos: DVec3, vel: DVec3) -> Option<nav::BurnPlan> {
    let n = NODE.with(|c| c.get())?;
    let focus = nav::dominant_body(pos);
    let conic = Conic::from_state(&focus, pos, vel)?;
    nav::plan_burn(&conic, n.dt, n.pro, n.nrm, n.rad)
}

/* ---- attitude autopilot (rotate the nose to a navball symbol) ---- */

thread_local! {
    /// The engaged autopilot mode, or `None` (manual). One at a time, KSP-SAS
    /// style.
    static AUTOPILOT: Cell<Option<AttMode>> = const { Cell::new(None) };
    /// PID state, reset whenever the mode changes so the integral doesn't
    /// carry across targets.
    static AP_PID: std::cell::RefCell<nav::AttPidState> =
        std::cell::RefCell::new(nav::AttPidState { integ: ZERO_V, prev_err: ZERO_V, have_prev: false });
}

const ZERO_V: DVec3 = DVec3 { x: 0.0, y: 0.0, z: 0.0 };

/// The engaged autopilot mode (`None` = manual control).
pub fn autopilot_mode() -> Option<AttMode> {
    AUTOPILOT.with(|c| c.get())
}

/// Engage `mode`, or disengage if it's already the active one (button
/// toggles). Resets the PID on any change of target.
pub fn toggle_autopilot(mode: AttMode) {
    AUTOPILOT.with(|c| {
        if c.get() == Some(mode) {
            c.set(None);
        } else {
            c.set(Some(mode));
            AP_PID.with(|p| p.borrow_mut().reset());
        }
    });
}

/// Force manual control (called when the pilot touches WASD/QR).
pub fn clear_autopilot() {
    AUTOPILOT.with(|c| {
        if c.get().is_some() {
            c.set(None);
            AP_PID.with(|p| p.borrow_mut().reset());
        }
    });
}

/// Commanded angular velocity (world axes) to hold the engaged autopilot
/// mode, or `None` when manual / the mode has no current direction (no
/// target, no node, no speed). `nose` is the ship's thrust axis (basis.up).
/// The caller integrates this omega into the basis. [`AttMode::KillRot`]
/// returns zero (a kinematic ship has no residual spin to null, so it just
/// holds the current heading).
pub fn autopilot_omega(
    pos: DVec3,
    vel: DVec3,
    nose: DVec3,
    sun_dir: DVec3,
    sim_t: f64,
    dt: f64,
) -> Option<DVec3> {
    let mode = AUTOPILOT.with(|c| c.get())?;
    if mode == AttMode::KillRot {
        return Some(ZERO_V);
    }
    let up = navball_up(pos, sun_dir);
    let focus = nav::dominant_body(pos);
    let focus_c = dvec3_make(focus.pos_x, focus.pos_y, focus.pos_z);
    let target = mode_dir(mode, pos, vel, up, focus_c, sim_t)?;
    let err = nav::attitude_error(nose, target);
    let f = tenebris_core::rocket::config().flight;
    let g = nav::AttGains {
        kp: f.att_kp as f64,
        ki: f.att_ki as f64,
        kd: f.att_kd as f64,
        max_rate: f.steer_rate_rads as f64,
    };
    Some(AP_PID.with(|p| nav::attitude_pid_step(g, &mut p.borrow_mut(), err, dt)))
}

/* ---- rotate-to-symbol buttons (a cluster beside the navball) ---- */

#[derive(Clone, Copy)]
struct BtnRect {
    x: f32,
    y: f32,
    w: f32,
    h: f32,
    mode: AttMode,
    avail: bool,
}

thread_local! {
    /// The 10 buttons' screen rects, refreshed each frame by the navball draw
    /// and read by the mouse hit-test in the event loop.
    static AP_BUTTONS: Cell<Option<[BtnRect; 10]>> = const { Cell::new(None) };
    /// Which button the cursor is over (for the highlight + tooltip), set from
    /// the event loop on mouse-move.
    static AP_HOVER: Cell<Option<AttMode>> = const { Cell::new(None) };
    /// Tooltip label anchor (screen px) + mode, set while hovering so the text
    /// pass can print the label over the panel drawn on the ball pass.
    static AP_TIP: Cell<Option<(f32, f32, AttMode)>> = const { Cell::new(None) };
    /// Pitch-ladder major-tick number anchors (screen px) + value, filled by
    /// the ball pass and printed by the sdtx text pass.
    static LADDER_NUMS: std::cell::RefCell<Vec<(f32, f32, i32)>> =
        const { std::cell::RefCell::new(Vec::new()) };
}

const BTN_PX: f32 = 26.0;
const BTN_GAP: f32 = 4.0;

/// Filled rect (screen space).
fn ui_rect(x: f32, y: f32, w: f32, h: f32, col: [f32; 4]) {
    sgl::begin_triangles();
    sgl::c4f(col[0], col[1], col[2], col[3]);
    sgl::v2f(x, y);
    sgl::v2f(x + w, y);
    sgl::v2f(x + w, y + h);
    sgl::v2f(x, y);
    sgl::v2f(x + w, y + h);
    sgl::v2f(x, y + h);
    sgl::end();
}

fn ui_rect_outline(x: f32, y: f32, w: f32, h: f32, col: [f32; 4]) {
    sgl::begin_lines();
    sgl::c4f(col[0], col[1], col[2], col[3]);
    let p = [(x, y), (x + w, y), (x + w, y + h), (x, y + h)];
    for i in 0..4 {
        let a = p[i];
        let b = p[(i + 1) % 4];
        sgl::v2f(a.0, a.1);
        sgl::v2f(b.0, b.1);
    }
    sgl::end();
}

/// Set from the event loop each mouse-move (Phase-3 tooltip + hover glow).
pub fn set_ap_hover(m: Option<AttMode>) {
    AP_HOVER.with(|c| c.set(m));
}

/// The mode whose button the cursor is over, if any.
pub fn ap_hover(mx: f32, my: f32) -> Option<AttMode> {
    let rects = AP_BUTTONS.with(|c| c.get())?;
    rects
        .iter()
        .find(|r| mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h)
        .map(|r| r.mode)
}

/// LMB hit-test on the button cluster: toggles that mode's autopilot and
/// returns true (so the caller swallows the click). Only fires while riding.
pub fn autopilot_button_pick(mx: f32, my: f32) -> bool {
    if !crate::rocket_ride::is_riding() {
        return false;
    }
    let Some(rects) = AP_BUTTONS.with(|c| c.get()) else {
        return false;
    };
    for r in rects {
        if r.avail && mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h {
            toggle_autopilot(r.mode);
            return true;
        }
    }
    false
}

/// Draw the 10-button cluster to the LEFT of the ball, glyph per mode,
/// engaged highlighted, unavailable dimmed. Stashes the rects for hit-test.
fn draw_autopilot_buttons(cx: f32, cy: f32, pos: DVec3, vel: DVec3, up: DVec3, focus_c: DVec3, sim_t: f64) {
    let bw = 2.0 * BTN_PX + BTN_GAP;
    let bh = 5.0 * BTN_PX + 4.0 * BTN_GAP;
    let left = cx - BALL_RADIUS_PX - 16.0 - bw;
    let top = cy - bh * 0.5;
    let hover = AP_HOVER.with(|c| c.get());
    let engaged = autopilot_mode();
    let rects: [BtnRect; 10] = std::array::from_fn(|i| {
        let mode = AttMode::ALL[i];
        let col = (i % 2) as f32;
        let row = (i / 2) as f32;
        let x = left + col * (BTN_PX + BTN_GAP);
        let y = top + row * (BTN_PX + BTN_GAP);
        let avail =
            mode == AttMode::KillRot || mode_dir(mode, pos, vel, up, focus_c, sim_t).is_some();
        let is_eng = engaged == Some(mode);
        let is_hov = hover == Some(mode);
        let bg = if is_eng {
            [0.24, 0.30, 0.42, 0.92]
        } else if is_hov {
            [0.16, 0.19, 0.26, 0.88]
        } else {
            [0.09, 0.10, 0.14, 0.82]
        };
        ui_rect(x, y, BTN_PX, BTN_PX, bg);
        let border = if is_eng {
            [1.0, 0.90, 0.35, 1.0]
        } else if is_hov {
            [0.8, 0.85, 0.95, 0.9]
        } else {
            [0.45, 0.50, 0.60, 0.7]
        };
        ui_rect_outline(x, y, BTN_PX, BTN_PX, border);
        let mut gc = mode.color();
        if !avail {
            gc[3] *= 0.3;
        }
        draw_glyph(mode, x + BTN_PX * 0.5, y + BTN_PX * 0.5, BTN_PX * 0.26, gc);
        BtnRect { x, y, w: BTN_PX, h: BTN_PX, mode, avail }
    });
    AP_BUTTONS.with(|c| c.set(Some(rects)));

    /* Instant tooltip panel above the hovered button (label printed in the
     * text pass by draw_ap_tooltip_text). */
    if let Some(hmode) = hover {
        let label = hmode.label();
        let tw = label.len() as f32 * 8.0 + 10.0;
        let tx = (left + bw * 0.5 - tw * 0.5).max(2.0);
        let ty = top - 22.0;
        ui_rect(tx, ty, tw, 16.0, [0.05, 0.06, 0.09, 0.92]);
        ui_rect_outline(tx, ty, tw, 16.0, [0.6, 0.65, 0.75, 0.85]);
        AP_TIP.with(|c| c.set(Some((tx + 5.0, ty + 4.0, hmode))));
    } else {
        AP_TIP.with(|c| c.set(None));
    }
}

/// Print the hovered button's tooltip label. Separate text pass (sdtx) since
/// the panel is drawn on the sgl ball pass. Call from the HUD text block.
pub fn draw_ap_tooltip_text(screen_w: f32, screen_h: f32) {
    let Some((x, y, mode)) = AP_TIP.with(|c| c.get()) else {
        return;
    };
    let cell = 8.0f32;
    sdtx::canvas(screen_w, screen_h);
    sdtx::font(1);
    sdtx::pos(x / cell, y / cell);
    sdtx::color3b(0xf0, 0xf2, 0xf8);
    sdtx::puts(mode.label());
}

/* ---- gizmo screen-space interaction (drag the 3D handles) ---- */

/// The gizmo's on-screen geometry, refreshed each frame by [`draw_node`] and
/// read by the mouse hit-test in the event loop. `handles` is (screen x, y,
/// axis 0=pro/1=nrm/2=rad, sign +/-1).
#[derive(Clone, Copy)]
struct GizmoScreen {
    node: (f32, f32),
    handles: [(f32, f32, u8, f64); 6],
}

thread_local! {
    static GIZMO_SCREEN: Cell<Option<GizmoScreen>> = const { Cell::new(None) };
    /// Active drag: (axis, sign); axis 3 = the center (slide along the orbit).
    static GIZMO_DRAG: Cell<Option<(u8, f64)>> = const { Cell::new(None) };
    /// Handle under the cursor for the hover glow: -2 none, -1 center, 0..5
    /// the handle index in `GizmoScreen::handles`.
    static GIZMO_HOVER: Cell<i8> = const { Cell::new(-2) };
}

/// Grab radius (px) and drag sensitivities. Tunable feel; not physics.
const GIZMO_GRAB_PX: f32 = 24.0;
const GIZMO_DV_PER_PX: f64 = 0.12; /* m/s of delta-v per pixel pulled */
const GIZMO_DT_PER_PX: f64 = 2.5; /* seconds of time-to-node per pixel */

/// Project a world point to window pixels through `vp` (= proj*view). `None`
/// behind the camera. The nav eye-shell remap moves lines ALONG their eye ray,
/// so this projection of the raw world point lands on the same pixel the drawn
/// handle does.
fn project(vp: &Mat4, p: DVec3, sw: f32, sh: f32) -> Option<(f32, f32)> {
    let (x, y, z) = (p.x as f32, p.y as f32, p.z as f32);
    let m = &vp.m;
    let cx = m[0] * x + m[4] * y + m[8] * z + m[12];
    let cy = m[1] * x + m[5] * y + m[9] * z + m[13];
    let cw = m[3] * x + m[7] * y + m[11] * z + m[15];
    if cw <= 1e-3 {
        return None;
    }
    Some(((cx / cw * 0.5 + 0.5) * sw, (1.0 - (cy / cw * 0.5 + 0.5)) * sh))
}

/// LMB-down hit-test at window pixel (mx,my). Grabs the nearest handle or the
/// center within [`GIZMO_GRAB_PX`]; returns true if something was grabbed (so
/// the caller suppresses the camera orbit). Empty space returns false ->
/// left-drag keeps orbiting the camera.
pub fn gizmo_pick(mx: f32, my: f32) -> bool {
    if !NODE_OVERLAY_ENABLED || !node_active() {
        return false;
    }
    let Some(g) = GIZMO_SCREEN.with(|c| c.get()) else {
        return false;
    };
    let r2 = GIZMO_GRAB_PX * GIZMO_GRAB_PX;
    let mut best: Option<(u8, f64, f32)> = None;
    for (hx, hy, axis, sign) in g.handles.iter().copied() {
        let d2 = (mx - hx) * (mx - hx) + (my - hy) * (my - hy);
        if d2 < r2 && best.map_or(true, |b| d2 < b.2) {
            best = Some((axis, sign, d2));
        }
    }
    let cd2 = (mx - g.node.0).powi(2) + (my - g.node.1).powi(2);
    if cd2 < r2 && best.map_or(true, |b| cd2 < b.2) {
        GIZMO_DRAG.with(|c| c.set(Some((3, 0.0)))); /* center slide */
        return true;
    }
    if let Some((axis, sign, _)) = best {
        GIZMO_DRAG.with(|c| c.set(Some((axis, sign))));
        return true;
    }
    false
}

/// Per-frame hover test: record which handle (or the center) the cursor is
/// over so [`draw_node`] can light it up. Cheap; call on every mouse-move.
pub fn gizmo_hover(mx: f32, my: f32) {
    let hov = (|| {
        if !NODE_OVERLAY_ENABLED || !node_active() {
            return Some(-2i8);
        }
        let g = GIZMO_SCREEN.with(|c| c.get())?;
        let r2 = GIZMO_GRAB_PX * GIZMO_GRAB_PX;
        let mut best: Option<(i8, f32)> = None;
        for (i, (hx, hy, _, _)) in g.handles.iter().enumerate() {
            let d2 = (mx - hx) * (mx - hx) + (my - hy) * (my - hy);
            if d2 < r2 && best.map_or(true, |b| d2 < b.1) {
                best = Some((i as i8, d2));
            }
        }
        let cd2 = (mx - g.node.0).powi(2) + (my - g.node.1).powi(2);
        if cd2 < r2 && best.map_or(true, |b| cd2 < b.1) {
            return Some(-1i8);
        }
        Some(best.map_or(-2, |b| b.0))
    })()
    .unwrap_or(-2);
    GIZMO_HOVER.with(|c| c.set(hov));
}

/// Push a colour toward white (hover highlight) while keeping its alpha.
fn brighten(c: [f32; 4]) -> [f32; 4] {
    [
        (c[0] + 0.35).min(1.0),
        (c[1] + 0.35).min(1.0),
        (c[2] + 0.35).min(1.0),
        c[3],
    ]
}

pub fn gizmo_dragging() -> bool {
    GIZMO_DRAG.with(|c| c.get().is_some())
}

pub fn gizmo_release() {
    GIZMO_DRAG.with(|c| c.set(None));
}

/// Apply a mouse move (dx,dy px) to the active drag: pull a handle along its
/// on-screen axis to grow that delta-v, or slide the center -> time-to-node.
pub fn gizmo_drag(dx: f32, dy: f32) {
    let Some((axis, sign)) = GIZMO_DRAG.with(|c| c.get()) else {
        return;
    };
    let Some((dt, pro, nrm, rad)) = node_params() else {
        return;
    };
    if axis == 3 {
        set_node_params((dt + dx as f64 * GIZMO_DT_PER_PX).max(0.0), pro, nrm, rad);
        return;
    }
    /* Pull along the handle's CURRENT screen direction (recomputed each move
     * so it tracks the arrow as it grows). */
    let Some(g) = GIZMO_SCREEN.with(|c| c.get()) else {
        return;
    };
    let Some((hx, hy, _, _)) = g.handles.iter().copied().find(|h| h.2 == axis && h.3 == sign)
    else {
        return;
    };
    let (sdx, sdy) = (hx - g.node.0, hy - g.node.1);
    let len = (sdx * sdx + sdy * sdy).sqrt().max(1.0);
    let pull = (dx * sdx + dy * sdy) / len; /* signed pixels along the handle */
    let delta = sign * pull as f64 * GIZMO_DV_PER_PX;
    let (mut p, mut nm, mut r) = (pro, nrm, rad);
    match axis {
        0 => p += delta,
        1 => nm += delta,
        _ => r += delta,
    }
    set_node_params(dt, p, nm, r);
}

/// Draw the planned maneuver over the orbit tracks: the predicted post-burn
/// orbit (magenta), a node marker, and a delta-v arrow. Shared by the flight
/// view and the map so both render the same plan. `cam_d` sizes the marks so
/// they read at any zoom. Call between `sgl_overlay_begin/end` on the line
/// pipeline (same context the orbit tracks use).
fn draw_node(pos: DVec3, vel: DVec3, cam_d: f64, vp: Mat4) {
    if !NODE_OVERLAY_ENABLED {
        return;
    }
    let Some(plan) = node_plan(pos, vel) else {
        GIZMO_SCREEN.with(|c| c.set(None));
        return;
    };
    let n = plan.node_pos;
    if !(n.x.is_finite() && n.y.is_finite() && n.z.is_finite()) {
        GIZMO_SCREEN.with(|c| c.set(None));
        return; /* diverged conic -> draw nothing, never a NaN blob */
    }
    /* Divergent predicted trajectory (purple) - the orbit the burn makes. */
    if let Some(after) = &plan.after {
        let pts: Vec<DVec3> = after
            .sample(ORBIT_SEGS, HYPERBOLA_CLIP_M)
            .into_iter()
            .filter(|p| p.x.is_finite() && p.y.is_finite() && p.z.is_finite())
            .collect();
        if pts.len() > 1 {
            line_strip(&pts, NODE_PATH_COL);
        }
    }
    /* Six handles at the node (dir, axis 0/1/2, sign, colour, signed dv on
     * that side). The pulled side grows with |dv|; the idle side stays at the
     * base grab length. Lengths scale with camera distance to read at any
     * zoom. Each handle's arrow is drawn AND its tip projected to screen for
     * the drag hit-test. */
    let (_, dvp, dvn, dvr) = node_params().unwrap_or((0.0, 0.0, 0.0, 0.0));
    let base = cam_d * 0.09;
    let grow = cam_d * 0.010;
    let neg = |d: DVec3| dvec3_scale(d, -1.0);
    let handles: [(DVec3, u8, f64, [f32; 4], f64); 6] = [
        (plan.prograde, 0, 1.0, H_PROGRADE, if dvp >= 0.0 { dvp } else { 0.0 }),
        (neg(plan.prograde), 0, -1.0, H_RETRO, if dvp < 0.0 { dvp } else { 0.0 }),
        (plan.normal, 1, 1.0, H_NORMAL, if dvn >= 0.0 { dvn } else { 0.0 }),
        (neg(plan.normal), 1, -1.0, H_NORMAL_B, if dvn < 0.0 { dvn } else { 0.0 }),
        (plan.radial_out, 2, 1.0, H_RADIAL, if dvr >= 0.0 { dvr } else { 0.0 }),
        (neg(plan.radial_out), 2, -1.0, H_RADIAL_B, if dvr < 0.0 { dvr } else { 0.0 }),
    ];
    let (sw, sh) = (sokol::app::widthf(), sokol::app::heightf());
    let hover = GIZMO_HOVER.with(|c| c.get());
    let mut screen = [(0.0f32, 0.0f32, 0u8, 0.0f64); 6];
    for (i, (dir, axis, sign, col, dv)) in handles.iter().enumerate() {
        let l = base + dv.abs() * grow;
        /* Light up the handle under the cursor: brighten toward white and
         * grow it a touch so it reads as grabbable. */
        let c = if hover == i as i8 { brighten(*col) } else { *col };
        arrow(n, *dir, if hover == i as i8 { l * 1.15 } else { l }, c);
        let (sx, sy) = project(&vp, dvec3_add(n, dvec3_scale(*dir, l)), sw, sh)
            .unwrap_or((-1.0e4, -1.0e4));
        screen[i] = (sx, sy, *axis, *sign);
    }
    /* Center grab handle (brightens on hover, hover index -1). */
    let cc = if hover == -1 { brighten(H_CENTER) } else { H_CENTER };
    cross_marker(n, (cam_d * 0.02).clamp(3.0, 3_000.0), cc);
    let node_screen = project(&vp, n, sw, sh).unwrap_or((-1.0e4, -1.0e4));
    GIZMO_SCREEN.with(|c| c.set(Some(GizmoScreen { node: node_screen, handles: screen })));
}

/// The maneuver-planner widget: a self-contained egui panel with a top-down
/// `egui_plot` orbit chart (current orbit, predicted post-burn orbit, the
/// node, the ship, the focus body) plus the burn controls and the
/// required-vs-available delta-v. Replaces the old on-canvas 3D overlay, so it
/// can never paint over the flight HUD; every plotted series is NaN-filtered
/// so a diverged conic draws nothing instead of a garbage blob. Call from the
/// Flight panel's Maneuver section while riding.
pub fn egui_maneuver(ui: &mut egui::Ui, pos: DVec3, vel: DVec3) {
    let focus = nav::dominant_body(pos);
    let Some(current) = Conic::from_state(&focus, pos, vel) else {
        ui.label("no orbit to plan from yet");
        return;
    };

    /* Burn controls. */
    match node_params() {
        None => {
            if ui.button("Plan node").clicked() {
                toggle_node(current.period_s);
            }
        }
        Some((mut dt, mut pro, mut nrm, mut rad)) => {
            egui::Grid::new("mnvr-node").num_columns(2).show(ui, |ui| {
                ui.label("time to node (s)");
                ui.add(egui::DragValue::new(&mut dt).speed(5.0).range(0.0..=1e8));
                ui.end_row();
                ui.label("prograde (m/s)");
                ui.add(egui::DragValue::new(&mut pro).speed(1.0));
                ui.end_row();
                ui.label("normal (m/s)");
                ui.add(egui::DragValue::new(&mut nrm).speed(1.0));
                ui.end_row();
                ui.label("radial (m/s)");
                ui.add(egui::DragValue::new(&mut rad).speed(1.0));
                ui.end_row();
            });
            set_node_params(dt, pro, nrm, rad);
            if ui.button("Clear node").clicked() {
                clear_node();
            }
        }
    }

    /* Required vs available delta-v + the resulting orbit. */
    let plan = node_plan(pos, vel);
    if let Some(p) = &plan {
        let avail = crate::rocket_ride::delta_v_mps() as f64;
        let col = if p.dv_total <= avail {
            egui::Color32::from_rgb(120, 230, 140)
        } else {
            egui::Color32::from_rgb(240, 120, 110)
        };
        ui.colored_label(col, format!("need {:.1} m/s    have {:.1} m/s", p.dv_total, avail));
        if let Some(after) = &p.after {
            let r = focus.radius_m;
            if after.e < 1.0 {
                ui.label(format!(
                    "-> Ap {:.0} m   Pe {:.0} m   T {:.0} s",
                    after.apoapsis_m - r,
                    after.periapsis_m - r,
                    after.period_s
                ));
            } else {
                ui.label(format!("-> ESCAPE   Pe {:.0} m   e {:.2}", after.periapsis_m - r, after.e));
            }
        }
    }

    /* Top-down orbit chart, centred on the focus body: world (x,z) -> plot
     * (x,y). Every series is NaN-filtered so a diverged/hyperbolic conic can
     * never poison the plot (the old overlay's black-blob failure mode). */
    let (fx, fz) = (current.focus.x, current.focus.z);
    let proj = |q: DVec3| -> [f64; 2] { [q.x - fx, q.z - fz] };
    let finite = |v: Vec<[f64; 2]>| -> Vec<[f64; 2]> {
        v.into_iter().filter(|q| q[0].is_finite() && q[1].is_finite()).collect()
    };
    let cur_pts = finite(current.sample(256, HYPERBOLA_CLIP_M).into_iter().map(proj).collect());
    let burn_pts = plan.as_ref().and_then(|p| p.after.as_ref()).map(|after| {
        finite(after.sample(256, HYPERBOLA_CLIP_M).into_iter().map(proj).collect())
    });
    let node_xy = plan.as_ref().map(|p| proj(p.node_pos)).filter(|q| q[0].is_finite() && q[1].is_finite());
    let ship_xy = proj(pos);

    egui_plot::Plot::new("mnvr-plot")
        .data_aspect(1.0)
        .height(190.0)
        .show_axes(false)
        .show_grid(true)
        .show(ui, |pu| {
            pu.points(
                egui_plot::Points::new("body", vec![[0.0, 0.0]])
                    .radius(5.0)
                    .color(egui::Color32::from_rgb(120, 170, 255)),
            );
            pu.line(
                egui_plot::Line::new("orbit", cur_pts)
                    .color(egui::Color32::from_rgb(90, 220, 235))
                    .width(1.5),
            );
            if let Some(bp) = burn_pts {
                pu.line(
                    egui_plot::Line::new("burn", bp)
                        .color(egui::Color32::from_rgb(240, 120, 230))
                        .width(1.5),
                );
            }
            if ship_xy[0].is_finite() && ship_xy[1].is_finite() {
                pu.points(
                    egui_plot::Points::new("ship", vec![ship_xy])
                        .radius(3.5)
                        .color(egui::Color32::WHITE),
                );
            }
            if let Some(np) = node_xy {
                pu.points(
                    egui_plot::Points::new("node", vec![np])
                        .radius(5.0)
                        .color(egui::Color32::from_rgb(255, 80, 220)),
                );
            }
        });
}

/// Display name for the HUD ("none" when nothing is targeted).
pub fn target_name() -> &'static str {
    match target() {
        None => "none",
        Some(Target::Station) => "Station",
        Some(Target::Body(id)) => planet::get(id).name,
    }
}

/// Target's world position and velocity right now. Bodies are parked
/// (their positions are static anchors); only the station moves.
pub fn target_state(sim_t: f64) -> Option<(DVec3, DVec3)> {
    match target()? {
        Target::Station => Some((station::orbit_pos(sim_t), station::orbit_vel(sim_t))),
        Target::Body(id) => {
            let b = planet::get(id);
            Some((dvec3_make(b.pos_x, b.pos_y, b.pos_z), dvec3_make(0.0, 0.0, 0.0)))
        }
    }
}

/* --------------------------- map-view lines --------------------------- */

/// Faint system-scale ring colour for the planets' star orbits.
const PLANET_TRACK_COL: [f32; 4] = [0.45, 0.55, 0.75, 0.4];
/// The asteroid belt band.
const BELT_TRACK_COL: [f32; 4] = [0.5, 0.5, 0.55, 0.2];

/// The 3D map view's orbit layer: every planet's ring about the star,
/// every moon's ring about its planet, the asteroid belt, the station
/// track, a halo cage on the maneuver target, and a marker at the SHIP.
/// Drawn only while the solar map is open (the flight HUD keeps its own
/// leaner `draw_world` pass). Same eye-shell remap trick, so the rings
/// survive any zoom.
#[allow(clippy::too_many_arguments)]
pub fn draw_map_orbits(
    view: Mat4,
    proj: Mat4,
    eye: DVec3,
    active: BodyId,
    ship_pos: DVec3,
    ship_vel: DVec3,
    riding: bool,
    sim_t: f64,
) {
    /* Shell scales with the zoom (eye->ship distance) so the rings never
     * clip against the map's distance-scaled near plane. */
    set_remap(eye, dvec3_length(dvec3_sub(ship_pos, eye)));
    renderer::sgl_overlay_begin();
    sgl::defaults();
    sgl::matrix_mode_projection();
    sgl::load_matrix(&proj.m[0]);
    sgl::matrix_mode_modelview();
    sgl::load_matrix(&view.m[0]);
    sgl::load_pipeline(line_pip());

    use tenebris_core::orbit;

    /* Planets about the star + their moons about them. */
    for id in [BodyId::Crag, BodyId::Tenebris, BodyId::Sequoia, BodyId::Frostbite] {
        if let Some(pts) = orbit::body_track(active, id, sim_t, ORBIT_SEGS) {
            line_strip(&pts, PLANET_TRACK_COL);
        }
    }
    for id in [
        BodyId::Luna,
        BodyId::Selene,
        BodyId::Verdant,
        BodyId::Sprout,
        BodyId::Quartz,
        BodyId::Rime,
    ] {
        if let Some(pts) = orbit::body_track(active, id, sim_t, 128) {
            line_strip(&pts, MOON_TRACK_COL);
        }
    }
    /* Belt: first + last rock's rings bound the band. */
    for id in [BodyId::Asteroid0, BodyId::Asteroid9] {
        if let Some(pts) = orbit::body_track(active, id, sim_t, ORBIT_SEGS) {
            line_strip(&pts, BELT_TRACK_COL);
        }
    }

    /* Station track (it orbits Tenebris's render anchor). */
    let ten = planet::get(BodyId::Tenebris);
    let ten_c = dvec3_make(ten.pos_x, ten.pos_y, ten.pos_z);
    let x_axis = dvec3_make(1.0, 0.0, 0.0);
    let z_axis = dvec3_make(0.0, 0.0, 1.0);
    if active == BodyId::Tenebris {
        circle(ten_c, x_axis, z_axis, station::orbit_radius_m(), STATION_TRACK_COL, ORBIT_SEGS);
        cross_marker(station::orbit_pos(sim_t), 40.0, STATION_TRACK_COL);
    }

    /* Maneuver-target halo cage - the map's highlight for "fly here". */
    match target() {
        Some(Target::Station) => cross_marker(station::orbit_pos(sim_t), 80.0, TARGET_COL),
        Some(Target::Body(id)) => {
            let c = orbit::apparent_pos(active, id, sim_t);
            let r = planet::get(id).radius_m * 1.5;
            let y_axis = dvec3_make(0.0, 1.0, 0.0);
            circle(c, x_axis, z_axis, r, TARGET_COL, 96);
            circle(c, x_axis, y_axis, r, TARGET_COL, 96);
            circle(c, y_axis, z_axis, r, TARGET_COL, 96);
        }
        None => {}
    }

    /* The ship: a white cross that scales with camera distance so it
     * reads at any zoom, plus the live conic when actually flying. */
    let cam_d = dvec3_length(dvec3_sub(ship_pos, eye)).max(1.0);
    cross_marker(ship_pos, (cam_d * 0.02).clamp(2.0, 4_000.0), [1.0, 1.0, 1.0, 0.95]);
    if riding {
        let focus = nav::dominant_body(ship_pos);
        if let Some(conic) = Conic::from_state(&focus, ship_pos, ship_vel) {
            let col = if conic.e < 1.0 { ELLIPSE_COL } else { ESCAPE_COL };
            let pts = conic.sample(ORBIT_SEGS, HYPERBOLA_CLIP_M);
            line_strip(&pts, col);
            let pe = dvec3_add(conic.focus, dvec3_scale(conic.p_hat, conic.periapsis_m));
            cross_marker(pe, 25.0, col);
            if conic.apoapsis_m.is_finite() {
                let ap = dvec3_add(conic.focus, dvec3_scale(conic.p_hat, -conic.apoapsis_m));
                cross_marker(ap, 25.0, col);
            }
        }
        /* Planned maneuver: same predicted-orbit + node draw as the flight
         * view, so a burn planned in either place shows in both. */
        draw_node(ship_pos, ship_vel, cam_d, crate::gfx_math::mat4_mul(proj, view));
    }

    renderer::sgl_overlay_end();
}

/* ---------------------------- world lines ----------------------------- */

thread_local! {
    static LINE_PIP: Cell<sgl::Pipeline> = const { Cell::new(sgl::Pipeline { id: 0 }) };
    static HUD_PIP: Cell<sgl::Pipeline> = const { Cell::new(sgl::Pipeline { id: 0 }) };
}

/// Alpha-blended 2D pipeline for the navball, created lazily in the
/// default (swapchain) context. Own pipeline rather than
/// `mobile_ui::alpha_pipeline()` because that one is id 0 until
/// mobile_ui's FIRST draw has run - and this module draws before it in
/// the frame, so on early frames the ball would silently bind an invalid
/// pipeline. (That is exactly the "where is my navball" bug.)
fn hud_pip() -> sgl::Pipeline {
    let existing = HUD_PIP.with(|c| c.get());
    if existing.id != 0 {
        return existing;
    }
    let mut desc = sg::PipelineDesc::default();
    desc.colors[0].blend = sg::BlendState {
        enabled: true,
        src_factor_rgb: sg::BlendFactor::SrcAlpha,
        dst_factor_rgb: sg::BlendFactor::OneMinusSrcAlpha,
        src_factor_alpha: sg::BlendFactor::One,
        dst_factor_alpha: sg::BlendFactor::One,
        ..Default::default()
    };
    let pip = sgl::make_pipeline(&desc);
    HUD_PIP.with(|c| c.set(pip));
    pip
}

/// Always-on-top alpha-blended line pipeline for the world sgl context
/// (created lazily inside the world context so it belongs to it).
///
/// Depth compare is ALWAYS, not LessEqual: these are navigation overlays
/// (orbit tracks, velocity/attitude arrows, Ap/Pe ticks), and letting the
/// planet occlude them hid exactly the part of the orbit you steer by -
/// the arc behind the body - and clipped the arrows into the terrain.
/// Nav data must stay readable in front of everything, like a HUD.
fn line_pip() -> sgl::Pipeline {
    let existing = LINE_PIP.with(|c| c.get());
    if existing.id != 0 {
        return existing;
    }
    let mut desc = sg::PipelineDesc {
        primitive_type: sg::PrimitiveType::Lines,
        depth: sg::DepthState {
            compare: sg::CompareFunc::Always,
            write_enabled: false,
            ..Default::default()
        },
        ..Default::default()
    };
    desc.colors[0].blend = sg::BlendState {
        enabled: true,
        src_factor_rgb: sg::BlendFactor::SrcAlpha,
        dst_factor_rgb: sg::BlendFactor::OneMinusSrcAlpha,
        src_factor_alpha: sg::BlendFactor::One,
        dst_factor_alpha: sg::BlendFactor::One,
        ..Default::default()
    };
    let pip = sgl::make_pipeline(&desc);
    LINE_PIP.with(|c| c.set(pip));
    pip
}

/* Eye-shell remap: every nav-line vertex is moved along its own eye ray
 * onto a fixed-radius shell around the camera. A pinhole projection keeps
 * a point's SCREEN position exactly unchanged when it slides along its
 * eye ray, and the line pipeline's depth compare is ALWAYS - so the true
 * distance is irrelevant, and an orbit track 30 km out (well past the
 * 20 km zfar, which was clipping it) renders complete from any zoom.
 * This is the poor man's log-z for overlay lines: no depth-buffer or
 * shader changes, just geometry that can never reach the far plane. */
thread_local! {
    static REMAP_EYE: std::cell::Cell<DVec3> =
        const { std::cell::Cell::new(DVec3 { x: 0.0, y: 0.0, z: 0.0 }) };
    /// Per-frame shell radius, set by each draw pass from the camera
    /// distance (see set_remap). Must sit inside (znear, zfar).
    static REMAP_SHELL: std::cell::Cell<f64> = const { std::cell::Cell::new(SHELL_DIST_M) };
}
/// Fallback / floor shell radius when no camera distance is set.
const SHELL_DIST_M: f64 = 500.0;

/// Seed the eye-shell remap for this pass. The shell radius scales with the
/// camera distance so it always lands between the near and far planes: the
/// solar-map near plane grows with zoom (znear up to 500 m at ~500 km out),
/// and a FIXED 500 m shell then got clipped by it - the "orbit lines vanish
/// past ~400 km" bug. Scaling the shell with the zoom keeps every line
/// visible at any range (the remap is pinhole-invariant, so shell radius
/// changes depth only, never screen position - a poor-man's log depth that
/// works within sokol_gl's fixed pipeline, where a real log-z shader can't
/// be injected).
fn set_remap(eye: DVec3, cam_dist: f64) {
    REMAP_EYE.with(|c| c.set(eye));
    REMAP_SHELL.with(|c| c.set(cam_dist.max(SHELL_DIST_M * 0.02)));
}

/// Emit a world-space nav vertex via the eye-shell remap.
fn vtx(p: DVec3) {
    let eye = REMAP_EYE.with(|c| c.get());
    let shell = REMAP_SHELL.with(|c| c.get());
    let d = dvec3_sub(p, eye);
    let len = dvec3_length(d);
    let q = if len > 1e-6 {
        dvec3_add(eye, dvec3_scale(d, shell / len))
    } else {
        p
    };
    sgl::v3f(q.x as f32, q.y as f32, q.z as f32);
}

fn line_strip(pts: &[DVec3], col: [f32; 4]) {
    if pts.len() < 2 {
        return;
    }
    sgl::begin_lines();
    sgl::c4f(col[0], col[1], col[2], col[3]);
    for w in pts.windows(2) {
        vtx(w[0]);
        vtx(w[1]);
    }
    sgl::end();
}

/// A small 3-axis cross at `p` - the Ap/Pe ticks and body markers.
fn cross_marker(p: DVec3, half_m: f64, col: [f32; 4]) {
    let h = half_m;
    let pts = [
        (dvec3_add(p, dvec3_make(-h, 0.0, 0.0)), dvec3_add(p, dvec3_make(h, 0.0, 0.0))),
        (dvec3_add(p, dvec3_make(0.0, -h, 0.0)), dvec3_add(p, dvec3_make(0.0, h, 0.0))),
        (dvec3_add(p, dvec3_make(0.0, 0.0, -h)), dvec3_add(p, dvec3_make(0.0, 0.0, h))),
    ];
    sgl::begin_lines();
    sgl::c4f(col[0], col[1], col[2], col[3]);
    for (a, b) in pts {
        vtx(a);
        vtx(b);
    }
    sgl::end();
}

/// Circle of radius `r` around `center` in the plane spanned by `e1`/`e2`.
fn circle(center: DVec3, e1: DVec3, e2: DVec3, r: f64, col: [f32; 4], segs: usize) {
    let mut pts = Vec::with_capacity(segs + 1);
    for i in 0..=segs {
        let a = i as f64 / segs as f64 * std::f64::consts::TAU;
        pts.push(dvec3_add(
            center,
            dvec3_add(dvec3_scale(e1, r * a.cos()), dvec3_scale(e2, r * a.sin())),
        ));
    }
    line_strip(&pts, col);
}

/// A world-space arrow from `from` along `dir` (unit) for `len` metres,
/// with a 4-fin head so it reads from any angle.
fn arrow(from: DVec3, dir: DVec3, len: f64, col: [f32; 4]) {
    let tip = dvec3_add(from, dvec3_scale(dir, len));
    /* Two perpendiculars to the shaft for the head fins. */
    let seed = if dir.x.abs() < 0.9 { dvec3_make(1.0, 0.0, 0.0) } else { dvec3_make(0.0, 1.0, 0.0) };
    let s1 = dvec3_normalize(dvec3_cross(dir, seed));
    let s2 = dvec3_cross(dir, s1);
    let back = dvec3_sub(tip, dvec3_scale(dir, len * 0.18));
    let w = len * 0.08;
    sgl::begin_lines();
    sgl::c4f(col[0], col[1], col[2], col[3]);
    vtx(from);
    vtx(tip);
    for s in [s1, s2, dvec3_scale(s1, -1.0), dvec3_scale(s2, -1.0)] {
        let fin = dvec3_add(back, dvec3_scale(s, w));
        vtx(tip);
        vtx(fin);
    }
    sgl::end();
}

/// Draw the nav layer into the world pass. Call while riding in space
/// (self-gates otherwise, so the call site can stay unconditional).
/// `right`/`fwd`/`nose` are the rocket's basis for the attitude arrows.
#[allow(clippy::too_many_arguments)]
/// Beyond this many active-body radii the flight overlay adds the full
/// heliocentric system chart (planet rings, belt, all moons) on top of its
/// lean near-body layer - "fly far enough and you see the solar system's
/// orbits", the same rings the O-map draws. Nearer than this only the
/// local station + Tenebris-moon tracks show, to keep low orbit uncluttered.
const SYSTEM_RINGS_MIN_RADII: f64 = 6.0;

#[allow(clippy::too_many_arguments)]
pub fn draw_world(
    view: Mat4,
    proj: Mat4,
    eye: DVec3,
    pos: DVec3,
    vel: DVec3,
    right: DVec3,
    fwd: DVec3,
    nose: DVec3,
    active: BodyId,
    riding: bool,
    in_space: bool,
    sim_t: f64,
) {
    if !riding || !in_space {
        return;
    }
    /* Far enough from the active body to show the whole system chart? The
     * active body's static render anchor is its centre. */
    let active_body = planet::get(active);
    let active_center = dvec3_make(active_body.pos_x, active_body.pos_y, active_body.pos_z);
    let far_out =
        dvec3_length(dvec3_sub(pos, active_center)) > active_body.radius_m * SYSTEM_RINGS_MIN_RADII;
    /* Seed the eye-shell remap (see vtx): all line geometry this frame
     * collapses onto a shell around the CAMERA (radius scaled to the
     * eye->ship distance) so neither the near nor far plane can clip the
     * orbit tracks however far the camera zooms. */
    set_remap(eye, dvec3_length(dvec3_sub(pos, eye)));

    /* OVERLAY context, not the world context: the world scene gets the
     * fog / atmosphere composite and then the WATER pass painted over it,
     * which washed the orbit tracks out wherever they crossed a planet.
     * The overlay (default) context flushes at the frame's final
     * sgl::draw(), after water and the lens pass - nav lines are HUD
     * data and read on top of all of it. */
    renderer::sgl_overlay_begin();
    sgl::defaults();
    sgl::matrix_mode_projection();
    sgl::load_matrix(&proj.m[0]);
    sgl::matrix_mode_modelview();
    sgl::load_matrix(&view.m[0]);
    sgl::load_pipeline(line_pip());

    let x_axis = dvec3_make(1.0, 0.0, 0.0);
    let z_axis = dvec3_make(0.0, 0.0, 1.0);

    /* Station orbit track: the one true orbit in the system (bodies are
     * parked; only the station moves). Equatorial circle at its radius. */
    let ten = planet::get(BodyId::Tenebris);
    let ten_c = dvec3_make(ten.pos_x, ten.pos_y, ten.pos_z);
    circle(ten_c, x_axis, z_axis, station::orbit_radius_m(), STATION_TRACK_COL, ORBIT_SEGS);
    let st_pos = station::orbit_pos(sim_t);
    cross_marker(st_pos, 40.0, STATION_TRACK_COL);

    /* Near-body layer: Tenebris's two moons (their real inclined rings +
     * a marker at each moon). Suppressed once far_out, where the full
     * system chart below draws every moon instead (no double-draw). */
    if !far_out {
        for moon in [BodyId::Luna, BodyId::Selene] {
            if let Some(pts) =
                tenebris_core::orbit::moon_track(BodyId::Tenebris, moon, sim_t, ORBIT_SEGS)
            {
                line_strip(&pts, MOON_TRACK_COL);
                let mp = tenebris_core::orbit::apparent_pos(BodyId::Tenebris, moon, sim_t);
                cross_marker(mp, 60.0, MOON_TRACK_COL);
            }
        }
    }

    /* Far-out layer: the whole heliocentric chart (planets about the star,
     * their moons, the asteroid belt band) - the same rings the O-map
     * draws, so flying out into interplanetary space finally shows the
     * solar system's orbits in the normal flight view. The eye-shell remap
     * (vtx) keeps these ~150 km rings inside the far plane at any zoom. */
    if far_out {
        use tenebris_core::orbit;
        for id in [BodyId::Crag, BodyId::Tenebris, BodyId::Sequoia, BodyId::Frostbite] {
            if let Some(pts) = orbit::body_track(active, id, sim_t, ORBIT_SEGS) {
                line_strip(&pts, PLANET_TRACK_COL);
            }
        }
        for id in [
            BodyId::Luna,
            BodyId::Selene,
            BodyId::Verdant,
            BodyId::Sprout,
            BodyId::Quartz,
            BodyId::Rime,
        ] {
            if let Some(pts) = orbit::body_track(active, id, sim_t, 128) {
                line_strip(&pts, MOON_TRACK_COL);
            }
        }
        for id in [BodyId::Asteroid0, BodyId::Asteroid9] {
            if let Some(pts) = orbit::body_track(active, id, sim_t, ORBIT_SEGS) {
                line_strip(&pts, BELT_TRACK_COL);
            }
        }
    }

    /* Target halo: a 3-ring cage around the body (or a bright station
     * marker), so the thing you're flying at reads across any distance. */
    match target() {
        Some(Target::Station) => cross_marker(st_pos, 80.0, TARGET_COL),
        Some(Target::Body(id)) => {
            let b = planet::get(id);
            let c = dvec3_make(b.pos_x, b.pos_y, b.pos_z);
            let r = b.radius_m * 1.5;
            let y_axis = dvec3_make(0.0, 1.0, 0.0);
            circle(c, x_axis, z_axis, r, TARGET_COL, 96);
            circle(c, x_axis, y_axis, r, TARGET_COL, 96);
            circle(c, y_axis, z_axis, r, TARGET_COL, 96);
        }
        None => {}
    }

    /* The rocket's own orbit, around whichever body owns the sky here
     * (nav::dominant_body = the SOI). Hidden on final approach to the
     * station - within a couple of dock radii the line is noise over the
     * thing you're docking with. */
    let near_station =
        dvec3_length(dvec3_sub(pos, st_pos)) < station::config().dock_radius_m as f64 * STATION_SOI_DOCK_RADII;
    if !near_station {
        let focus = nav::dominant_body(pos);
        if let Some(conic) = Conic::from_state(&focus, pos, vel) {
            let col = if conic.e < 1.0 { ELLIPSE_COL } else { ESCAPE_COL };
            let pts = conic.sample(ORBIT_SEGS, HYPERBOLA_CLIP_M);
            line_strip(&pts, col);
            /* Ap/Pe ticks (Pe always exists; Ap only when bound). */
            let pe = dvec3_add(conic.focus, dvec3_scale(conic.p_hat, conic.periapsis_m));
            cross_marker(pe, 25.0, col);
            if conic.apoapsis_m.is_finite() {
                let ap = dvec3_add(conic.focus, dvec3_scale(conic.p_hat, -conic.apoapsis_m));
                cross_marker(ap, 25.0, col);
            }
        }
    }

    /* Attitude gizmo: past close-chase range the rocket is subpixel, so
     * draw its axes as arrows sized to the camera distance - orientation
     * readable from ANY zoom. Nose (thrust) in the crosshair yellow, its
     * negatives dim; fwd green, right red (the WASD steering axes). */
    let cam_d = crate::rocket_cam::state().cur_distance as f64;

    /* Planned maneuver drawn FIRST, so the ship's attitude arrows below
     * render ON TOP of it and are never obscured (the "something is
     * covering my directional arrows" bug). */
    draw_node(pos, vel, cam_d, crate::gfx_math::mat4_mul(proj, view));

    if cam_d > tenebris_core::rocket::config().camera.zoom_far_m as f64 {
        /* All axes the SAME length so the gizmo reads as a uniform cross;
         * only the nose (forward/thrust) arrow is drawn longer to call out
         * which way the ship points. Left/right and up/down are told apart
         * by vibrancy (full alpha vs dim), not by length. */
        let len = cam_d * 0.12;
        arrow(pos, nose, len * 1.4, NOSE_COL);
        arrow(pos, dvec3_scale(nose, -1.0), len, [NOSE_COL[0], NOSE_COL[1], NOSE_COL[2], 0.35]);
        arrow(pos, fwd, len, [0.3, 0.9, 0.35, 0.9]);
        arrow(pos, dvec3_scale(fwd, -1.0), len, [0.3, 0.9, 0.35, 0.35]);
        arrow(pos, right, len, [0.95, 0.35, 0.3, 0.9]);
        arrow(pos, dvec3_scale(right, -1.0), len, [0.95, 0.35, 0.3, 0.35]);
    }

    /* When the cursor hovers an autopilot button, draw a long arrow from the
     * ship in that symbol's world direction, so you can see where e.g.
     * "prograde" actually points before committing to the burn. */
    if let Some(hmode) = AP_HOVER.with(|c| c.get()) {
        let sun_dir = tenebris_core::orbit::sun_direction(active, sim_t);
        let up = navball_up(pos, sun_dir);
        let focus = nav::dominant_body(pos);
        let focus_c = dvec3_make(focus.pos_x, focus.pos_y, focus.pos_z);
        if let Some(d) = mode_dir(hmode, pos, vel, up, focus_c, sim_t) {
            arrow(pos, d, cam_d * 0.20, hmode.color());
        }
    }

    renderer::sgl_overlay_end();
}

/* ------------------------------- navball ------------------------------ */

/// Ball-space coordinates of a world direction: x right on screen, y up
/// on screen, z out of the screen toward the viewer.
///
/// The axes are the CRAFT's steering axes - x = basis.right (what A/D yaw
/// along), y = -basis.fwd (what W/S pitch along), z = the nose. That's
/// what makes the ball an honest control readout: W/S always moves
/// markers vertically and A/D horizontally, whatever the camera does.
fn ball_coords(d: DVec3, right: DVec3, fwd: DVec3, nose: DVec3) -> (f32, f32, f32) {
    (
        dvec3_dot(d, right) as f32,
        -dvec3_dot(d, fwd) as f32,
        dvec3_dot(d, nose) as f32,
    )
}

/// The KSP-style attitude targets. Each names a world direction to point the
/// nose at (except [`AttMode::KillRot`], which just holds the current
/// attitude). Shared by the navball markers, the rotate-to buttons, and the
/// PID autopilot so all three agree on what "prograde" etc. mean.
#[derive(Clone, Copy, PartialEq, Eq)]
pub enum AttMode {
    Prograde,
    Retrograde,
    Normal,
    Antinormal,
    RadialOut,
    RadialIn,
    Target,
    AntiTarget,
    Maneuver,
    KillRot,
}

impl AttMode {
    /// The 10 modes in button order (KSP SAS layout).
    pub const ALL: [AttMode; 10] = [
        AttMode::Prograde,
        AttMode::Retrograde,
        AttMode::Normal,
        AttMode::Antinormal,
        AttMode::RadialOut,
        AttMode::RadialIn,
        AttMode::Target,
        AttMode::AntiTarget,
        AttMode::Maneuver,
        AttMode::KillRot,
    ];

    /// Short label for the hover tooltip (ASCII only - navball font rule).
    pub fn label(self) -> &'static str {
        match self {
            AttMode::Prograde => "Prograde",
            AttMode::Retrograde => "Retrograde",
            AttMode::Normal => "Normal",
            AttMode::Antinormal => "Anti-normal",
            AttMode::RadialOut => "Radial out",
            AttMode::RadialIn => "Radial in",
            AttMode::Target => "Target",
            AttMode::AntiTarget => "Anti-target",
            AttMode::Maneuver => "Maneuver node",
            AttMode::KillRot => "Kill rotation",
        }
    }

    /// Marker/handle colour for this mode.
    pub fn color(self) -> [f32; 4] {
        match self {
            AttMode::Prograde => PROGRADE,
            AttMode::Retrograde => RETROGRADE,
            AttMode::Normal => NORMAL,
            AttMode::Antinormal => [NORMAL[0] * 0.7, NORMAL[1] * 0.7, NORMAL[2] * 0.85, 1.0],
            AttMode::RadialOut => RADIAL_OUT,
            AttMode::RadialIn => [RADIAL_OUT[0] * 0.7, RADIAL_OUT[1] * 0.7, RADIAL_OUT[2] * 0.85, 1.0],
            AttMode::Target => TARGET_COL,
            AttMode::AntiTarget => [TARGET_COL[0] * 0.7, TARGET_COL[1] * 0.5, TARGET_COL[2] * 0.7, 1.0],
            AttMode::Maneuver => [0.35, 0.7, 0.98, 1.0],
            AttMode::KillRot => [0.85, 0.88, 0.95, 1.0],
        }
    }
}

/// World-space unit direction the nose should point for `mode`, or `None`
/// when it isn't defined right now (no speed for pro/retro, no target
/// selected, no maneuver node, or [`AttMode::KillRot`] which has no aim).
/// `focus_c` is the dominant body's centre; `up` is radial-out (SOI up).
pub fn mode_dir(
    mode: AttMode,
    pos: DVec3,
    vel: DVec3,
    up: DVec3,
    focus_c: DVec3,
    sim_t: f64,
) -> Option<DVec3> {
    let spd = dvec3_length(vel);
    match mode {
        AttMode::Prograde if spd > 1.0 => Some(dvec3_scale(vel, 1.0 / spd)),
        AttMode::Retrograde if spd > 1.0 => Some(dvec3_scale(vel, -1.0 / spd)),
        AttMode::Normal | AttMode::Antinormal => {
            let h = dvec3_cross(dvec3_sub(pos, focus_c), vel);
            if dvec3_dot(h, h) > 1e-6 {
                let n = dvec3_normalize(h);
                Some(if mode == AttMode::Normal { n } else { dvec3_scale(n, -1.0) })
            } else {
                None
            }
        }
        AttMode::RadialOut => Some(up),
        AttMode::RadialIn => Some(dvec3_scale(up, -1.0)),
        AttMode::Target | AttMode::AntiTarget => {
            let (tp, _tv) = target_state(sim_t)?;
            let to = dvec3_sub(tp, pos);
            if dvec3_dot(to, to) > 1.0 {
                let d = dvec3_normalize(to);
                Some(if mode == AttMode::Target { d } else { dvec3_scale(d, -1.0) })
            } else {
                None
            }
        }
        AttMode::Maneuver => {
            let plan = node_plan(pos, vel)?;
            if dvec3_dot(plan.dv_world, plan.dv_world) > 1e-9 {
                Some(dvec3_normalize(plan.dv_world))
            } else {
                None
            }
        }
        _ => None,
    }
}

/* ---- navball glyph primitives (screen space, sgl ortho) ---- */

fn ui_disc(x: f32, y: f32, r: f32, col: [f32; 4]) {
    sgl::begin_triangles();
    sgl::c4f(col[0], col[1], col[2], col[3]);
    let n = 12;
    for i in 0..n {
        let a0 = i as f32 / n as f32 * std::f32::consts::TAU;
        let a1 = (i + 1) as f32 / n as f32 * std::f32::consts::TAU;
        sgl::v2f(x, y);
        sgl::v2f(x + a0.cos() * r, y + a0.sin() * r);
        sgl::v2f(x + a1.cos() * r, y + a1.sin() * r);
    }
    sgl::end();
}

fn ui_ring(x: f32, y: f32, r: f32, col: [f32; 4]) {
    sgl::begin_lines();
    sgl::c4f(col[0], col[1], col[2], col[3]);
    let n = 16;
    for i in 0..n {
        let a0 = i as f32 / n as f32 * std::f32::consts::TAU;
        let a1 = (i + 1) as f32 / n as f32 * std::f32::consts::TAU;
        sgl::v2f(x + a0.cos() * r, y + a0.sin() * r);
        sgl::v2f(x + a1.cos() * r, y + a1.sin() * r);
    }
    sgl::end();
}

fn ui_line(x0: f32, y0: f32, x1: f32, y1: f32, col: [f32; 4]) {
    sgl::begin_lines();
    sgl::c4f(col[0], col[1], col[2], col[3]);
    sgl::v2f(x0, y0);
    sgl::v2f(x1, y1);
    sgl::end();
}

/// Filled or outlined triangle, apex up (`up=true`) or down.
fn ui_tri(x: f32, y: f32, r: f32, col: [f32; 4], up: bool) {
    let s = if up { -1.0 } else { 1.0 };
    let (ax, ay) = (x, y + s * r);
    let (bx, by) = (x - r * 0.9, y - s * r * 0.7);
    let (cxp, cyp) = (x + r * 0.9, y - s * r * 0.7);
    sgl::begin_triangles();
    sgl::c4f(col[0], col[1], col[2], col[3]);
    sgl::v2f(ax, ay);
    sgl::v2f(bx, by);
    sgl::v2f(cxp, cyp);
    sgl::end();
}

/// Diamond: filled when `fill`, else outline.
fn ui_diamond(x: f32, y: f32, r: f32, col: [f32; 4], fill: bool) {
    if fill {
        sgl::begin_triangles();
        sgl::c4f(col[0], col[1], col[2], col[3]);
        sgl::v2f(x, y - r);
        sgl::v2f(x + r, y);
        sgl::v2f(x, y + r);
        sgl::v2f(x, y - r);
        sgl::v2f(x, y + r);
        sgl::v2f(x - r, y);
        sgl::end();
    } else {
        sgl::begin_lines();
        sgl::c4f(col[0], col[1], col[2], col[3]);
        let p = [(x, y - r), (x + r, y), (x, y + r), (x - r, y)];
        for i in 0..4 {
            let a = p[i];
            let b = p[(i + 1) % 4];
            sgl::v2f(a.0, a.1);
            sgl::v2f(b.0, b.1);
        }
        sgl::end();
    }
}

/// Four corner brackets around (x,y), target-reticle style.
fn ui_brackets(x: f32, y: f32, r: f32, col: [f32; 4]) {
    let e = r * 0.45;
    for &(sx, sy) in &[(-1.0f32, -1.0f32), (1.0, -1.0), (1.0, 1.0), (-1.0, 1.0)] {
        let (cxx, cyy) = (x + sx * r, y + sy * r);
        ui_line(cxx, cyy, cxx - sx * e, cyy, col);
        ui_line(cxx, cyy, cxx, cyy - sy * e, col);
    }
}

/// Draw the distinct glyph for `mode` at screen (x,y). Shape AND colour set
/// each apart so they read at a glance even overlapping on the ball.
fn draw_glyph(mode: AttMode, x: f32, y: f32, r: f32, col: [f32; 4]) {
    let spokes = |cnt: &[f32]| {
        for a in cnt {
            let ar = a.to_radians();
            ui_line(x + ar.cos() * r, y + ar.sin() * r, x + ar.cos() * r * 1.7, y + ar.sin() * r * 1.7, col);
        }
    };
    match mode {
        AttMode::Prograde => {
            ui_ring(x, y, r, col);
            ui_disc(x, y, r * 0.3, col);
            spokes(&[-90.0, 30.0, 150.0]);
        }
        AttMode::Retrograde => {
            ui_ring(x, y, r, col);
            let d = r * 0.6;
            ui_line(x - d, y - d, x + d, y + d, col);
            ui_line(x - d, y + d, x + d, y - d, col);
            spokes(&[-90.0, 30.0, 150.0]);
        }
        AttMode::Normal => ui_tri(x, y, r, col, true),
        AttMode::Antinormal => ui_tri(x, y, r, col, false),
        AttMode::RadialOut => {
            ui_diamond(x, y, r, col, false);
            ui_disc(x, y, r * 0.28, col);
        }
        AttMode::RadialIn => ui_diamond(x, y, r * 0.85, col, true),
        AttMode::Target => {
            ui_brackets(x, y, r, col);
            ui_disc(x, y, r * 0.3, col);
        }
        AttMode::AntiTarget => {
            ui_brackets(x, y, r, col);
            let d = r * 0.4;
            ui_line(x - d, y - d, x + d, y + d, col);
            ui_line(x - d, y + d, x + d, y - d, col);
        }
        AttMode::Maneuver => {
            ui_ring(x, y, r, col);
            ui_disc(x, y, r * 0.3, col);
            spokes(&[-90.0, 30.0, 150.0]);
        }
        AttMode::KillRot => {
            /* Stability/hold: concentric rings (KSP's SAS-lock feel). */
            ui_ring(x, y, r, col);
            ui_ring(x, y, r * 0.45, col);
        }
    }
}

/// Place a mode's marker on the ball. Front hemisphere draws where it
/// projects; the back hemisphere clamps to the rim and dims, so you still
/// know which way to turn toward it.
fn marker(cx: f32, cy: f32, bx: f32, by: f32, bz: f32, mode: AttMode, col: [f32; 4]) {
    let (px, py, alpha) = if bz > 0.0 {
        (bx, by, col[3])
    } else {
        let len = (bx * bx + by * by).sqrt().max(1e-4);
        (bx / len * 0.97, by / len * 0.97, col[3] * 0.35)
    };
    let x = cx + px * BALL_RADIUS_PX;
    let y = cy - py * BALL_RADIUS_PX; /* screen y grows downward */
    draw_glyph(mode, x, y, MARKER_R_PX, [col[0], col[1], col[2], alpha]);
}

/// Pitch ladder, ADI-style: a short horizontal tick at each pitch line up the
/// ball's vertical meridian, from -90 to +90. Minor ticks every 5 deg, longer
/// major ticks every 10 deg, and the major ticks carry a degree NUMBER
/// (stashed for the sdtx text pass). Each tick is drawn at the front point of
/// its constant-elevation circle where that circle crosses the vertical
/// meridian, oriented along the circle's tangent so it tilts correctly with
/// roll. The horizon (0 deg) is also the sky/ground seam.
fn draw_pitch_ladder(cx: f32, cy: f32, up: DVec3, right: DVec3, fwd: DVec3, nose: DVec3) {
    /* Ladder direction is the ATTITUDE-vertical, the plane of {up, nose}, so
     * it tilts with roll (KSP ADI) instead of the screen vertical. `w` is the
     * horizon-ward axis (component of the nose perpendicular to up); a
     * direction at elevation deg is d = sin*up + cos*w, which sits on the
     * front face for every |deg| < 90. */
    let nu = dvec3_dot(nose, up);
    let w = dvec3_sub(nose, dvec3_scale(up, nu));
    let wl = dvec3_length(w);
    if wl < 1e-3 {
        return; /* nose at the zenith/nadir pole: no meaningful pitch line */
    }
    let w = dvec3_scale(w, 1.0 / wl);
    let mut nums: Vec<(f32, f32, i32)> = Vec::new();
    let mut last_num: Option<(f32, f32)> = None;
    for deg in (-85..=85).step_by(5) {
        let major = deg % 10 == 0;
        let (s, c) = ((deg as f64).to_radians().sin(), (deg as f64).to_radians().cos());
        let d0 = dvec3_add(dvec3_scale(up, s), dvec3_scale(w, c));
        let (bx, by, bz) = ball_coords(d0, right, fwd, nose);
        if bz <= 0.0 {
            continue;
        }
        let p0 = (cx + bx * BALL_RADIUS_PX, cy - by * BALL_RADIUS_PX);
        /* Screen tangent along the elevation circle (perp to up and d0), so
         * the tick is horizontal-on-the-ball and rolls with the ship. */
        let tan3 = dvec3_cross(up, d0);
        if dvec3_dot(tan3, tan3) < 1e-9 {
            continue;
        }
        let d1 = dvec3_normalize(dvec3_add(d0, dvec3_scale(dvec3_normalize(tan3), 0.03)));
        let (tx, ty, _) = ball_coords(d1, right, fwd, nose);
        let (mut dx, mut dy) =
            ((tx - bx) * BALL_RADIUS_PX, -(ty - by) * BALL_RADIUS_PX);
        let dl = (dx * dx + dy * dy).sqrt().max(1e-3);
        dx /= dl;
        dy /= dl;
        let half = if major { 30.0 } else { 13.0 };
        let col = if major { LADDER_MAJOR } else { LADDER_MINOR };
        sgl::begin_lines();
        sgl::c4f(col[0], col[1], col[2], col[3]);
        sgl::v2f(p0.0 - dx * half, p0.1 - dy * half);
        sgl::v2f(p0.0 + dx * half, p0.1 + dy * half);
        sgl::end();
        if major {
            /* Number just past the right end of the tick (signed pitch).
             * Skip if it would collide with the last one placed - near the
             * poles the pitch lines compress, so labelling every 10 deg there
             * would overlap; drop those and keep the readable central band. */
            let (nx, ny) = (p0.0 + dx * (half + 10.0), p0.1 + dy * (half + 10.0));
            let ok = last_num.map_or(true, |(lx, ly)| (nx - lx).hypot(ny - ly) > 16.0);
            if ok {
                nums.push((nx, ny, deg as i32));
                last_num = Some((nx, ny));
            }
        }
    }
    LADDER_NUMS.with(|c| *c.borrow_mut() = nums);
}

/// Print the pitch-ladder degree numbers collected by [`draw_pitch_ladder`].
/// Separate text pass (sdtx) since the ladder ticks draw on the sgl ball
/// pass. Only points that landed inside the ball are printed.
pub fn draw_navball_degrees_text(screen_w: f32, screen_h: f32) {
    let nums = LADDER_NUMS.with(|c| c.borrow().clone());
    if nums.is_empty() {
        return;
    }
    let cx = screen_w * 0.5;
    let cy = screen_h - BALL_MARGIN_PX - BALL_RADIUS_PX;
    let cell = 8.0f32;
    sdtx::canvas(screen_w, screen_h);
    sdtx::font(1);
    sdtx::color3b(0xe8, 0xec, 0xf4);
    for (x, y, v) in nums {
        /* Keep labels on/near the ball so they don't spill onto the buttons. */
        if (x - cx).hypot(y - cy) > BALL_RADIUS_PX + 4.0 {
            continue;
        }
        let s = format!("{v}");
        sdtx::pos((x - s.len() as f32 * cell * 0.5) / cell, (y - 4.0) / cell);
        sdtx::puts(&s);
    }
}

/// The navball "up" (radial-out): toward the sky, away from the ground
/// hemisphere. Near a planet that's away from the body centre; once we're
/// past its influence the primary is the star, so up flips to away-from-sun
/// (brown points at the sun) - the "brown tracks the SOI, sun if
/// heliocentric" rule. `sun_dir` is the render-frame unit vector to the star.
pub fn navball_up(pos: DVec3, sun_dir: DVec3) -> DVec3 {
    let focus = nav::dominant_body(pos);
    let focus_c = dvec3_make(focus.pos_x, focus.pos_y, focus.pos_z);
    let rel = dvec3_sub(pos, focus_c);
    if dvec3_length(rel) > focus.radius_m * SOI_RADII {
        dvec3_scale(sun_dir, -1.0)
    } else {
        dvec3_normalize(rel)
    }
}

/// Attitude in degrees for the HUD readout: pitch (nose elevation above the
/// local horizon, +up) and roll (how far the ball's "up" is rotated from
/// screen-up about the nose). Pure - shared style with [`readout_lines`].
pub fn attitude_degrees(up: DVec3, right: DVec3, fwd: DVec3, nose: DVec3) -> (f64, f64) {
    let pitch = dvec3_dot(nose, up).clamp(-1.0, 1.0).asin().to_degrees();
    /* Where radial-out projects on the ball: its screen angle from straight
     * up IS the roll. */
    let (bx, by) = (dvec3_dot(up, right), -dvec3_dot(up, fwd));
    let roll = (bx).atan2(by).to_degrees();
    (pitch, roll)
}

/// Draw the navball + orbital readouts. Call from the HUD block while
/// riding (self-gates on nothing - the caller owns the gate, matching the
/// other HUD draws).
///
/// `pos`/`vel` world-space; `right`/`fwd`/`nose` the craft basis (nose =
/// basis.up, the thrust axis); `sim_t` the world clock.
pub fn draw_hud(
    screen_w: f32,
    screen_h: f32,
    pos: DVec3,
    vel: DVec3,
    right: DVec3,
    fwd: DVec3,
    nose: DVec3,
    sun_dir: DVec3,
    sim_t: f64,
) {
    let focus = nav::dominant_body(pos);
    let focus_c = dvec3_make(focus.pos_x, focus.pos_y, focus.pos_z);
    let up = navball_up(pos, sun_dir);

    /* 2D prologue - own ortho block, same pattern as hotbar_ui. */
    sgl::defaults();
    sgl::matrix_mode_projection();
    sgl::load_identity();
    sgl::ortho(0.0, screen_w, screen_h, 0.0, -1.0, 1.0);
    sgl::matrix_mode_modelview();
    sgl::load_identity();
    sgl::load_pipeline(hud_pip());

    let cx = screen_w * 0.5;
    let cy = screen_h - BALL_MARGIN_PX - BALL_RADIUS_PX;

    /* Ball body: a concentric-ring triangle mesh, each vertex tinted sky or
     * ground by whether its 3-D direction is above or below the local horizon
     * (dot(d, up)). GL interpolates across the boundary, so the horizon reads
     * as a soft seam that stays correct at ANY pitch/roll - replacing the old
     * horizon-polygon construction that over-filled to all-ground near the
     * horizon. `d` is the front-face direction reconstructed from the ball
     * coords: dot(d,right)=bx, dot(d,fwd)=-by, dot(d,nose)=bz. */
    let rings = 22usize;
    let vert = |r: f32, a: f32| {
        let (bx, by) = (r * a.cos(), r * a.sin());
        let bz = (1.0 - bx * bx - by * by).max(0.0).sqrt();
        let d = dvec3_add(
            dvec3_add(dvec3_scale(right, bx as f64), dvec3_scale(fwd, -(by as f64))),
            dvec3_scale(nose, bz as f64),
        );
        let c = if dvec3_dot(d, up) >= 0.0 { SKY } else { GROUND };
        sgl::c4f(c[0], c[1], c[2], c[3]);
        sgl::v2f(cx + bx * BALL_RADIUS_PX, cy - by * BALL_RADIUS_PX);
    };
    sgl::begin_triangles();
    for ri in 0..rings {
        let r0 = ri as f32 / rings as f32;
        let r1 = (ri + 1) as f32 / rings as f32;
        for si in 0..BALL_SEGS {
            let a0 = si as f32 / BALL_SEGS as f32 * std::f32::consts::TAU;
            let a1 = (si + 1) as f32 / BALL_SEGS as f32 * std::f32::consts::TAU;
            vert(r0, a0);
            vert(r1, a0);
            vert(r1, a1);
            vert(r0, a0);
            vert(r1, a1);
            vert(r0, a1);
        }
    }
    sgl::end();

    /* Rim ring. */
    sgl::begin_triangles();
    sgl::c4f(RIM[0], RIM[1], RIM[2], RIM[3]);
    let rin = BALL_RADIUS_PX;
    let rout = BALL_RADIUS_PX + 2.5;
    for i in 0..BALL_SEGS {
        let a0 = i as f32 / BALL_SEGS as f32 * std::f32::consts::TAU;
        let a1 = (i + 1) as f32 / BALL_SEGS as f32 * std::f32::consts::TAU;
        let (c0, s0, c1, s1) = (a0.cos(), a0.sin(), a1.cos(), a1.sin());
        sgl::v2f(cx + c0 * rin, cy + s0 * rin);
        sgl::v2f(cx + c0 * rout, cy + s0 * rout);
        sgl::v2f(cx + c1 * rout, cy + s1 * rout);
        sgl::v2f(cx + c0 * rin, cy + s0 * rin);
        sgl::v2f(cx + c1 * rout, cy + s1 * rout);
        sgl::v2f(cx + c1 * rin, cy + s1 * rin);
    }
    sgl::end();

    /* Pitch ladder: constant-elevation rings every 30 deg from the horizon,
     * so attitude reads in degrees off the ball, not just by feel. */
    draw_pitch_ladder(cx, cy, up, right, fwd, nose);

    /* Direction markers - one distinct glyph per attitude mode, all driven
     * by the same mode_dir() the buttons and autopilot use. KillRot has no
     * direction so it is skipped. */
    for mode in AttMode::ALL {
        if mode == AttMode::KillRot {
            continue;
        }
        if let Some(d) = mode_dir(mode, pos, vel, up, focus_c, sim_t) {
            let (bx, by, bz) = ball_coords(d, right, fwd, nose);
            marker(cx, cy, bx, by, bz, mode, mode.color());
        }
    }

    /* Rotate-to-symbol autopilot buttons, clustered left of the ball. */
    draw_autopilot_buttons(cx, cy, pos, vel, up, focus_c, sim_t);

    /* Nose crosshair - fixed at centre by construction. */
    sgl::begin_lines();
    sgl::c4f(NOSE_COL[0], NOSE_COL[1], NOSE_COL[2], NOSE_COL[3]);
    sgl::v2f(cx - 14.0, cy);
    sgl::v2f(cx - 4.0, cy);
    sgl::v2f(cx + 4.0, cy);
    sgl::v2f(cx + 14.0, cy);
    sgl::v2f(cx, cy - 4.0);
    sgl::v2f(cx, cy + 10.0);
    sgl::end();
}

/// The text readouts beside the navball: orbit numbers + target range.
/// Returns lines for the caller to print with the shared sdtx style (the
/// rocket HUD owns the text pass; this keeps one text look).
pub fn readout_lines(pos: DVec3, vel: DVec3, sim_t: f64) -> Vec<String> {
    let mut out = Vec::new();
    let focus = nav::dominant_body(pos);
    if let Some(c) = Conic::from_state(&focus, pos, vel) {
        if c.e < 1.0 {
            out.push(format!(
                "orbit [{}]  Ap {:.0} m  Pe {:.0} m  T {:.0} s",
                focus.name,
                c.apoapsis_m - focus.radius_m,
                c.periapsis_m - focus.radius_m,
                c.period_s
            ));
        } else {
            out.push(format!(
                "ESCAPE [{}]  Pe {:.0} m  e {:.2}",
                focus.name,
                c.periapsis_m - focus.radius_m,
                c.e
            ));
        }
    }
    if let Some((tp, tv)) = target_state(sim_t) {
        let dist = dvec3_length(dvec3_sub(tp, pos));
        let rel = dvec3_length(dvec3_sub(vel, tv));
        out.push(format!("target {}  {:.0} m  rel {:.1} m/s", target_name(), dist, rel));
    }
    /* Planned maneuver: the required delta-v (what the burn costs) vs the
     * ship's available delta-v (rocket_ride, the real staged number), plus
     * the orbit the burn produces. The egui widget shows this too; the HUD
     * text line is tied to the (off) 3D overlay to avoid duplication. */
    if NODE_OVERLAY_ENABLED {
        if let (Some((dt, pro, nrm, rad)), Some(plan)) = (node_params(), node_plan(pos, vel)) {
        let avail = crate::rocket_ride::delta_v_mps() as f64;
        let flag = if plan.dv_total <= avail { "" } else { "  (SHORT)" };
        out.push(format!(
            "NODE in {:.0}s  need {:.1} / have {:.1} m/s{}",
            dt, plan.dv_total, avail, flag
        ));
        out.push(format!("  pro {:.1}  nrm {:.1}  rad {:.1} m/s", pro, nrm, rad));
        if let Some(after) = &plan.after {
            let r = focus.radius_m;
            if after.e < 1.0 {
                out.push(format!(
                    "  -> Ap {:.0} m  Pe {:.0} m  T {:.0} s",
                    after.apoapsis_m - r,
                    after.periapsis_m - r,
                    after.period_s
                ));
            } else {
                out.push(format!("  -> ESCAPE  Pe {:.0} m  e {:.2}", after.periapsis_m - r, after.e));
            }
        }
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    /// The cycle covers every entry plus "none" and wraps - a stuck or
    /// skipped target makes T feel broken in the one place you can't
    /// debug it (mid-flight).
    #[test]
    fn target_cycle_visits_everything_and_wraps() {
        set_target(None); /* start at none */
        assert_eq!(target(), None);
        let mut seen = Vec::new();
        for _ in 0..TARGETS.len() {
            cycle_target();
            seen.push(target().expect("every step lands on a target"));
        }
        assert_eq!(seen.len(), TARGETS.len());
        assert_eq!(seen[0], Target::Station, "station is first - the flight everyone makes");
        cycle_target();
        assert_eq!(target(), None, "one past the end is none");
        cycle_target();
        assert_eq!(target(), Some(Target::Station), "and it wraps");
    }

    /// The maneuver node: create seeds a quarter-period lead + zero burn,
    /// edits round-trip, and node_plan produces the required dv + the orbit
    /// the burn makes (a prograde burn raises apoapsis).
    #[test]
    fn maneuver_node_plans_a_burn() {
        clear_node();
        assert!(!node_active());
        toggle_node(1000.0);
        assert!(node_active());
        let (dt, pro, nrm, rad) = node_params().unwrap();
        assert!((dt - 250.0).abs() < 1e-9, "quarter-period lead");
        assert_eq!((pro, nrm, rad), (0.0, 0.0, 0.0), "seeded with no burn");

        set_node_params(60.0, 40.0, 0.0, 0.0);
        let b = planet::get(BodyId::Tenebris);
        let r = 10_000.0;
        let v = (nav::mu(&b) / r).sqrt(); /* circular */
        let plan = node_plan(dvec3_make(r, 0.0, 0.0), dvec3_make(0.0, 0.0, v)).unwrap();
        assert!((plan.dv_total - 40.0).abs() < 1e-6, "required dv = the burn magnitude");
        let after = plan.after.expect("prograde burn stays bound");
        assert!(after.apoapsis_m > r + 1.0, "prograde raises apoapsis");

        clear_node();
        assert!(!node_active());
        assert!(node_plan(dvec3_make(r, 0.0, 0.0), dvec3_make(0.0, 0.0, v)).is_none());
    }

    /// Ball space is the craft's steering frame: nose dead centre, and the
    /// axes line up so W/S moves markers vertically, A/D horizontally.
    #[test]
    fn ball_space_is_the_steering_frame() {
        let right = dvec3_make(1.0, 0.0, 0.0);
        let fwd = dvec3_make(0.0, 0.0, 1.0);
        let nose = dvec3_make(0.0, 1.0, 0.0);
        /* The nose itself: centre of the ball, front hemisphere. */
        let (x, y, z) = ball_coords(nose, right, fwd, nose);
        assert!(x.abs() < 1e-6 && y.abs() < 1e-6 && z > 0.99);
        /* A direction to the craft's right: +x on the ball. */
        let (x, _, _) = ball_coords(right, right, fwd, nose);
        assert!(x > 0.99);
        /* A direction behind the nose: z < 0 (rim-clamped, dimmed). */
        let (_, _, z) = ball_coords(dvec3_scale(nose, -1.0), right, fwd, nose);
        assert!(z < -0.99);
    }

    /// Readouts for a circular orbit name the right focus body. 5 km up,
    /// where Tenebris's field is ~6x anything else's.
    #[test]
    fn readout_reports_the_circular_orbit() {
        set_target(None);
        let b = planet::get(BodyId::Tenebris);
        let r = 5_000.0;
        let mu = tenebris_core::nav::mu(&b);
        let v = (mu / r).sqrt();
        let lines = readout_lines(dvec3_make(r, 0.0, 0.0), dvec3_make(0.0, 0.0, v), 0.0);
        assert!(!lines.is_empty());
        assert!(lines[0].contains("Tenebris"), "{}", lines[0]);
        /* T = 2*pi*sqrt(r^3/mu) = ~1481 s at 5 km. */
        assert!(lines[0].contains("T 1481 s") || lines[0].contains("T 1480 s"), "{}", lines[0]);
    }

    /// Pin a genuine (and surprising) property of the system: at the
    /// station's 10 km orbit radius, the +X crossing is CONTESTED - the
    /// bodies are pinned in place, Sequoia (20 km out, heavier than
    /// Tenebris) pulls harder there than Tenebris does, so the dominant
    /// body flips mid-orbit. The station doesn't feel it (on rails), but a
    /// free-flying rocket does, and the nav focus following the real field
    /// is the honest display. If station altitude or body masses ever
    /// change, this documents what to re-check.
    #[test]
    fn the_station_orbit_crosses_into_sequoias_field() {
        use tenebris_core::nav::dominant_body;
        assert_eq!(
            dominant_body(dvec3_make(10_000.0, 0.0, 0.0)).name,
            "Sequoia",
            "the +X crossing of the 10 km orbit is Sequoia's"
        );
        assert_eq!(
            dominant_body(dvec3_make(0.0, 0.0, 10_000.0)).name,
            "Tenebris",
            "the +Z crossing (no planet that way) stays Tenebris's"
        );
    }
}
