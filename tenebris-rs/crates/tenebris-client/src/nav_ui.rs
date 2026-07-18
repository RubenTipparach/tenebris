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
const BALL_RADIUS_PX: f32 = 78.0;
const BALL_MARGIN_PX: f32 = 26.0; /* above the screen bottom */
const BALL_SEGS: usize = 48;
const MARKER_R_PX: f32 = 6.0;
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
/// Planned-maneuver colours: the node marker + delta-v arrow (bright
/// magenta) and the predicted post-burn orbit (a lighter magenta so it
/// reads as distinct from the live cyan/orange track).
const NODE_COL: [f32; 4] = [1.0, 0.3, 0.85, 1.0];
const NODE_ORBIT_COL: [f32; 4] = [0.95, 0.5, 0.9, 0.8];
/// Master switch for the whole maneuver-planner UI (the on-canvas overlay,
/// the readout lines, AND the egui editor). DISABLED for now at the user's
/// request: the on-canvas node overlay was drawing degenerate (NaN) geometry
/// on hyperbolic / interplanetary orbits, which rasterized as a black blob
/// over the attitude gizmo. The Core math (`nav::plan_burn` etc.) and this
/// module's node state stay intact and tested; flip this back on when the
/// visuals are reworked (a proper widget / gizmo pass).
pub const MANEUVER_ENABLED: bool = false;
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

/// Draw the planned maneuver over the orbit tracks: the predicted post-burn
/// orbit (magenta), a node marker, and a delta-v arrow. Shared by the flight
/// view and the map so both render the same plan. `cam_d` sizes the marks so
/// they read at any zoom. Call between `sgl_overlay_begin/end` on the line
/// pipeline (same context the orbit tracks use).
fn draw_node(pos: DVec3, vel: DVec3, cam_d: f64) {
    if !MANEUVER_ENABLED {
        return;
    }
    let Some(plan) = node_plan(pos, vel) else {
        return;
    };
    if let Some(after) = &plan.after {
        line_strip(&after.sample(ORBIT_SEGS, HYPERBOLA_CLIP_M), NODE_ORBIT_COL);
        let pe = dvec3_add(after.focus, dvec3_scale(after.p_hat, after.periapsis_m));
        cross_marker(pe, 22.0, NODE_ORBIT_COL);
        if after.apoapsis_m.is_finite() {
            let ap = dvec3_add(after.focus, dvec3_scale(after.p_hat, -after.apoapsis_m));
            cross_marker(ap, 22.0, NODE_ORBIT_COL);
        }
    }
    cross_marker(plan.node_pos, (cam_d * 0.03).clamp(4.0, 6_000.0), NODE_COL);
    if plan.dv_total > 1e-3 {
        let dir = dvec3_scale(plan.dv_world, 1.0 / plan.dv_total);
        arrow(plan.node_pos, dir, cam_d * 0.14, NODE_COL);
    }
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
        draw_node(ship_pos, ship_vel, cam_d);
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
    draw_node(pos, vel, cam_d);

    if cam_d > tenebris_core::rocket::config().camera.zoom_far_m as f64 {
        let len = cam_d * 0.12;
        arrow(pos, nose, len * 1.4, NOSE_COL);
        arrow(pos, dvec3_scale(nose, -1.0), len * 0.7, [NOSE_COL[0], NOSE_COL[1], NOSE_COL[2], 0.35]);
        arrow(pos, fwd, len, [0.3, 0.9, 0.35, 0.9]);
        arrow(pos, dvec3_scale(fwd, -1.0), len * 0.7, [0.3, 0.9, 0.35, 0.35]);
        arrow(pos, right, len, [0.95, 0.35, 0.3, 0.9]);
        arrow(pos, dvec3_scale(right, -1.0), len * 0.7, [0.95, 0.35, 0.3, 0.35]);
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

fn marker(cx: f32, cy: f32, bx: f32, by: f32, bz: f32, col: [f32; 4]) {
    /* Front hemisphere draws where it projects; behind clamps to the rim,
     * dimmed, so you still know which way to turn. */
    let (px, py, alpha) = if bz > 0.0 {
        (bx, by, col[3])
    } else {
        let len = (bx * bx + by * by).sqrt().max(1e-4);
        (bx / len * 0.97, by / len * 0.97, col[3] * 0.35)
    };
    let x = cx + px * BALL_RADIUS_PX;
    let y = cy - py * BALL_RADIUS_PX; /* screen y grows downward */
    sgl::begin_triangles();
    sgl::c4f(col[0], col[1], col[2], alpha);
    let n = 10;
    for i in 0..n {
        let a0 = i as f32 / n as f32 * std::f32::consts::TAU;
        let a1 = (i + 1) as f32 / n as f32 * std::f32::consts::TAU;
        sgl::v2f(x, y);
        sgl::v2f(x + a0.cos() * MARKER_R_PX, y + a0.sin() * MARKER_R_PX);
        sgl::v2f(x + a1.cos() * MARKER_R_PX, y + a1.sin() * MARKER_R_PX);
    }
    sgl::end();
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
    sim_t: f64,
) {
    let focus = nav::dominant_body(pos);
    let focus_c = dvec3_make(focus.pos_x, focus.pos_y, focus.pos_z);
    let up = dvec3_normalize(dvec3_sub(pos, focus_c));

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

    /* Sky disc. */
    sgl::begin_triangles();
    sgl::c4f(SKY[0], SKY[1], SKY[2], SKY[3]);
    for i in 0..BALL_SEGS {
        let a0 = i as f32 / BALL_SEGS as f32 * std::f32::consts::TAU;
        let a1 = (i + 1) as f32 / BALL_SEGS as f32 * std::f32::consts::TAU;
        sgl::v2f(cx, cy);
        sgl::v2f(cx + a0.cos() * BALL_RADIUS_PX, cy + a0.sin() * BALL_RADIUS_PX);
        sgl::v2f(cx + a1.cos() * BALL_RADIUS_PX, cy + a1.sin() * BALL_RADIUS_PX);
    }
    sgl::end();

    /* Ground: the hemisphere of directions BELOW the local horizon,
     * projected onto the ball. Sample the horizon great circle (all
     * directions perpendicular to `up`), keep the visible arc, and close
     * the polygon through the rim on the ground side. Degenerate cases
     * (nose straight up/down) have no visible horizon - all sky or all
     * ground. */
    let nose_up = dvec3_dot(nose, up);
    if nose_up < 0.999 {
        /* Horizon plane basis. */
        let seed = if up.x.abs() < 0.9 { dvec3_make(1.0, 0.0, 0.0) } else { dvec3_make(0.0, 1.0, 0.0) };
        let e1 = dvec3_normalize(dvec3_cross(up, seed));
        let e2 = dvec3_cross(up, e1);
        /* Visible horizon arc in ball space. */
        let mut arc: Vec<(f32, f32)> = Vec::new();
        let n = 96;
        for i in 0..=n {
            let a = i as f64 / n as f64 * std::f64::consts::TAU;
            let d = dvec3_add(dvec3_scale(e1, a.cos()), dvec3_scale(e2, a.sin()));
            let (bx, by, bz) = ball_coords(d, right, fwd, nose);
            if bz > 0.0 {
                arc.push((bx, by));
            }
        }
        /* Where "down" projects - the rim point the closing sweep passes
         * through, so the filled side is the ground side. */
        let (dx, dy, _dz) = ball_coords(dvec3_scale(up, -1.0), right, fwd, nose);
        if nose_up <= -0.999 || arc.len() < 2 {
            /* Nose straight down (or horizon fully hidden while pointing
             * groundward): the whole ball is ground. */
            if nose_up < 0.0 {
                sgl::begin_triangles();
                sgl::c4f(GROUND[0], GROUND[1], GROUND[2], GROUND[3]);
                for i in 0..BALL_SEGS {
                    let a0 = i as f32 / BALL_SEGS as f32 * std::f32::consts::TAU;
                    let a1 = (i + 1) as f32 / BALL_SEGS as f32 * std::f32::consts::TAU;
                    sgl::v2f(cx, cy);
                    sgl::v2f(cx + a0.cos() * BALL_RADIUS_PX, cy + a0.sin() * BALL_RADIUS_PX);
                    sgl::v2f(cx + a1.cos() * BALL_RADIUS_PX, cy + a1.sin() * BALL_RADIUS_PX);
                }
                sgl::end();
            }
        } else {
            /* Fan from the ground-side rim midpoint over the arc + the rim
             * arc between the horizon's endpoints (walked the ground way). */
            let dlen = (dx * dx + dy * dy).sqrt().max(1e-4);
            let (gx, gy) = (dx / dlen, dy / dlen);
            /* Order the polygon: arc points, then rim points from the
             * arc's end angle to its start angle passing the ground point. */
            let a_start = arc[0];
            let a_end = *arc.last().unwrap();
            let ang = |p: (f32, f32)| p.1.atan2(p.0);
            let (s, e, g) = (ang(a_start), ang(a_end), gy.atan2(gx));
            /* Sweep from e to s in the direction that passes g. */
            let norm = |a: f32| {
                let mut a = a;
                while a < 0.0 {
                    a += std::f32::consts::TAU;
                }
                a % std::f32::consts::TAU
            };
            let ccw_dist = |from: f32, to: f32| norm(to - from);
            let through_g_ccw = ccw_dist(e, g) < ccw_dist(e, s);
            let sweep = if through_g_ccw { ccw_dist(e, s) } else { -(std::f32::consts::TAU - ccw_dist(e, s)) };
            let rim_steps = 24;
            let mut poly: Vec<(f32, f32)> = arc.clone();
            for i in 1..=rim_steps {
                let a = e + sweep * i as f32 / rim_steps as f32;
                poly.push((a.cos(), a.sin()));
            }
            /* Fan from the ground point (inside the polygon by construction). */
            sgl::begin_triangles();
            sgl::c4f(GROUND[0], GROUND[1], GROUND[2], GROUND[3]);
            let fan = (gx * 0.5, gy * 0.5);
            for w in poly.windows(2) {
                sgl::v2f(cx + fan.0 * BALL_RADIUS_PX, cy - fan.1 * BALL_RADIUS_PX);
                sgl::v2f(cx + w[0].0 * BALL_RADIUS_PX, cy - w[0].1 * BALL_RADIUS_PX);
                sgl::v2f(cx + w[1].0 * BALL_RADIUS_PX, cy - w[1].1 * BALL_RADIUS_PX);
            }
            sgl::end();
        }
    }

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

    /* Markers. Prograde/retrograde need some speed to mean anything. */
    let spd = dvec3_length(vel);
    if spd > 1.0 {
        let pro = dvec3_scale(vel, 1.0 / spd);
        let (bx, by, bz) = ball_coords(pro, right, fwd, nose);
        marker(cx, cy, bx, by, bz, PROGRADE);
        let (rx, ry, rz) = ball_coords(dvec3_scale(pro, -1.0), right, fwd, nose);
        marker(cx, cy, rx, ry, rz, RETROGRADE);
        /* Orbit normal (h = r x v): the "tilt the plane" direction. */
        let rel = dvec3_sub(pos, focus_c);
        let h = dvec3_cross(rel, vel);
        if dvec3_dot(h, h) > 1e-6 {
            let (nx, ny, nz) = ball_coords(dvec3_normalize(h), right, fwd, nose);
            marker(cx, cy, nx, ny, nz, NORMAL);
        }
    }
    /* Radial out - "up" away from the focus body. */
    let (ux, uy, uz) = ball_coords(up, right, fwd, nose);
    marker(cx, cy, ux, uy, uz, RADIAL_OUT);
    /* Target direction. */
    if let Some((tp, _tv)) = target_state(sim_t) {
        let to = dvec3_sub(tp, pos);
        if dvec3_dot(to, to) > 1.0 {
            let (tx, ty, tz) = ball_coords(dvec3_normalize(to), right, fwd, nose);
            marker(cx, cy, tx, ty, tz, TARGET_COL);
        }
    }

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
     * the orbit the burn produces. Gated with the rest of the planner UI. */
    if MANEUVER_ENABLED {
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
