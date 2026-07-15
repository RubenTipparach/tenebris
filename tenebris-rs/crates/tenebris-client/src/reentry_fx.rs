//! Atmospheric reentry FX (space era). Two effects, both ports of the
//! mining-the-sky look rebuilt on the world sgl layer:
//!
//! 1. FIRST-PERSON STREAKS ([`draw`]): when the player falls fast inside a
//!    body's lower atmosphere, hot plasma streaks stream past the camera
//!    opposite the velocity. Intensity ramps with speed between the
//!    rocket.yaml `[reentry]` thresholds and fades with altitude, so a slow
//!    descent or a high pass draws nothing. TENEBRIS_DEV_REENTRY=1 forces it.
//!
//! 2. HULL-HUGGING PLASMA SHELL ([`draw_shells`]): jettisoned falling stages
//!    (external, visible from the camera) get the full mesh technique from
//!    mining-the-sky's `plasma_mesh.wgsl` - a glow SHELL built on the CPU from
//!    the stage's part-stack SDF (union of round cones), offset off the hull,
//!    smeared downstream into a tapering wake, extracted as nested surface-net
//!    shells, and shaded with a white -> yellow -> orange -> red cooling ramp
//!    keyed to downstream distance and gated by the stage's aero-heating. Fed
//!    by `core::falling_stage` + `crate::falling_stage`; drawn premultiplied-
//!    over so the nested shells composite softly. TENEBRIS_DEV_FALLING=1 keeps
//!    a hot booster framed for headless screenshots.

#![allow(dead_code)]

use std::cell::Cell;

use sokol::gl as sgl;

thread_local! {
    /* Additive FX pipeline, mining-the-sky style: blend ONE/ONE (black =
     * transparent, so vertex-colour fades ARE the alpha), depth TESTED so
     * terrain occludes the plasma but never WRITTEN so overlapping sheath
     * cards + streaks accumulate light instead of z-fighting. Used by the
     * camera-relative streak field. */
    static PIP_FX: Cell<sgl::Pipeline> = const { Cell::new(sgl::Pipeline { id: 0 }) };
    /* Premultiplied-OVER pipeline for the hull shell: src ONE / dst
     * ONE_MINUS_SRC_ALPHA (colour is premultiplied, alpha rides c4f). The
     * nested closed shells + wake overlap heavily; over-blend composites them
     * softly and caps at the alpha instead of summing to a white blowout the
     * way pure additive does. Depth tested, not written, double-sided. */
    static PIP_SHELL: Cell<sgl::Pipeline> = const { Cell::new(sgl::Pipeline { id: 0 }) };
}

use tenebris_core::math::{
    dvec3_add, dvec3_cross, dvec3_dot, dvec3_length, dvec3_make, dvec3_normalize, dvec3_scale,
    dvec3_sub, DVec3,
};
use tenebris_core::rocket::{engine_kind, part_role, EngineKind, PartRole};

/* --- Hull-hugging plasma shell (the mining-the-sky mesh technique) --------
 * A jettisoned stage's plasma is a glow SHELL built on the CPU from the
 * stage's part stack (a union of round cones) - offset off the hull, smeared
 * downstream into a tapering wake, extracted as nested surface-net shells,
 * and shaded with a white -> yellow -> orange -> red cooling ramp keyed to
 * the downstream distance and gated by the stage's heat. Ported from
 * mining-the-sky's plasma_mesh.wgsl + build (surface nets + cooling ramp +
 * fresnel + turbulence), evaluated per-vertex here since we draw through the
 * additive sgl pipeline instead of a bespoke shader.
 *
 * These are the shell's SHAPE knobs (like the STREAK_* / STRUT_* named consts
 * elsewhere - the FX silhouette, not designer-facing physics; the reentry
 * thresholds + heating live in rocket.yaml). */
/// Metres each stacked part spans / its body radius (mirrors rocket_fx).
const SHELL_SEG_M: f64 = 1.8; // PART_HEIGHT * ROCKET_SCALE
const SHELL_PART_R: f64 = 0.9; // PART_RADIUS * ROCKET_SCALE
const SHELL_VAC_SCALE: f64 = 0.62;
/// Glow standoff off the hull, as a fraction of the body radius.
const SHELL_STANDOFF: f64 = 0.55;
/// Downstream wake length, in stack heights (fades to nothing).
const SHELL_WAKE_MULT: f64 = 0.9;
/// Emissive boost: premultiplied rgb may exceed the alpha, so the plasma reads
/// as incandescent (glows brighter than the sky) instead of a translucent
/// brown smear when composited over the sky.
const SHELL_EMISSION: f64 = 2.2;
/// Nested shells: inner bright + fainter offset wisps, spread this many
/// standoffs outward.
const SHELL_LAYERS: usize = 3;
const SHELL_SPREAD: f64 = 1.5;
/// Surface-net grid cell as a fraction of the body radius, and the per-axis
/// cap that bounds the vertex count + CPU cost.
const SHELL_CELL_FRAC: f64 = 0.6;
const SHELL_GRID_CAP: usize = 16;

/// Streaks drawn at full intensity.
const STREAK_COUNT: usize = 56;
/// Streak spawn ring around the flight axis (m).
const RING_MIN_M: f64 = 0.6;
const RING_MAX_M: f64 = 3.2;
/// Streak length range (m) along the flight axis at full intensity.
const LEN_MIN_M: f64 = 1.2;
const LEN_MAX_M: f64 = 3.4;
/// Streak half-width (m).
const HALF_W_M: f64 = 0.055;
/// How far ahead of the camera the streak field sits (m).
const FIELD_AHEAD_M: f64 = 2.0;
/// Field depth along the axis the streaks scroll through (m).
const FIELD_DEPTH_M: f64 = 7.0;
/// Streak scroll speed at full intensity (m/s) - reads as plasma rushing by.
const SCROLL_MPS: f64 = 26.0;

thread_local! {
    static INTENSITY: Cell<f32> = const { Cell::new(0.0) };
    static TIME_S: Cell<f32> = const { Cell::new(0.0) };
}

fn hashf(i: usize, salt: u32) -> f64 {
    let mut h = (i as u32).wrapping_mul(2654435761).wrapping_add(salt.wrapping_mul(97919));
    h ^= h >> 15;
    h = h.wrapping_mul(2246822519);
    h ^= h >> 13;
    (h & 0xFFFFFF) as f64 / 16777215.0
}

/// Per-frame: compute the reentry intensity from altitude above the active
/// body's surface and the player's speed (rocket.yaml [reentry] thresholds).
pub fn update(alt_m: f64, speed_mps: f64, dt: f32) {
    let r = tenebris_core::rocket::config().reentry;
    let mut it = 0.0f32;
    if std::env::var("TENEBRIS_DEV_REENTRY").is_ok() {
        it = 1.0;
    } else if alt_m < r.max_alt_m as f64 && alt_m > 0.0 {
        let ramp = ((speed_mps - r.min_speed_mps as f64)
            / (r.full_speed_mps - r.min_speed_mps).max(1.0) as f64)
            .clamp(0.0, 1.0) as f32;
        /* Fade out near the ground so the fx dies before touchdown. */
        let alt_fade = (alt_m / (r.max_alt_m as f64 * 0.25)).clamp(0.0, 1.0) as f32;
        it = ramp * alt_fade;
    }
    INTENSITY.with(|c| c.set(it));
    TIME_S.with(|c| c.set(c.get() + dt));
}

pub fn intensity() -> f32 {
    INTENSITY.with(|c| c.get())
}

/// Draw the plasma streak field. `cam` is the eye, `vel` the player's world
/// velocity (falls back to `fwd` when nearly still - the dev-preview case).
/// Call inside the world sgl pass with view/proj already loaded (right after
/// rocket_fx::draw).
pub fn draw(view: crate::gfx_math::Mat4, proj: crate::gfx_math::Mat4, cam: DVec3, vel: DVec3, fwd: DVec3, up_hint: DVec3) {
    let it = intensity();
    if it <= 0.02 {
        return;
    }
    crate::renderer::sgl_overlay_begin();
    sgl::defaults();
    sgl::matrix_mode_projection();
    sgl::load_matrix(&proj.m[0]);
    sgl::matrix_mode_modelview();
    sgl::load_matrix(&view.m[0]);
    let t = TIME_S.with(|c| c.get()) as f64;
    let axis = if dvec3_length(vel) > 5.0 { dvec3_normalize(vel) } else { dvec3_normalize(fwd) };
    /* Frame around the flight axis. */
    let reference = if up_hint.y.abs() < 0.9 { dvec3_make(0.0, 1.0, 0.0) } else { dvec3_make(1.0, 0.0, 0.0) };
    let side = dvec3_normalize(dvec3_cross(reference, axis));
    let side2 = dvec3_cross(axis, side);

    let mut pip = PIP_FX.with(|p| p.get());
    if pip.id == 0 {
        let mut desc = sokol::gfx::PipelineDesc {
            depth: sokol::gfx::DepthState {
                write_enabled: false,
                compare: sokol::gfx::CompareFunc::Less,
                ..Default::default()
            },
            cull_mode: sokol::gfx::CullMode::None,
            ..Default::default()
        };
        desc.colors[0].blend = sokol::gfx::BlendState {
            enabled: true,
            src_factor_rgb: sokol::gfx::BlendFactor::One,
            dst_factor_rgb: sokol::gfx::BlendFactor::One,
            src_factor_alpha: sokol::gfx::BlendFactor::One,
            dst_factor_alpha: sokol::gfx::BlendFactor::One,
            ..Default::default()
        };
        pip = sgl::make_pipeline(&desc);
        PIP_FX.with(|p| p.set(pip));
    }
    sgl::load_pipeline(pip);
    sgl::disable_texture();
    sgl::begin_quads();

    /* Plasma sheath: the mining-the-sky flame-card build - a wide orange
     * BODY card plus a narrower WHITE-HOT core card, camera-facing, tapered
     * to ~1/5 width at the tip, with the same turbulent two-sine flicker.
     * Per-vertex colours ramp head -> deep-red tail; under additive blend
     * the tail fade to black is the transparency. */
    {
        let head_at = dvec3_add(cam, dvec3_scale(axis, FIELD_AHEAD_M * 0.7));
        let view_to = dvec3_normalize(dvec3_add(dvec3_scale(head_at, -1.0), cam));
        let mut w_axis = dvec3_cross(axis, view_to);
        if dvec3_length(w_axis) < 1e-4 {
            w_axis = side;
        }
        let w_axis = dvec3_normalize(w_axis);
        let mut card = |len: f64, half_w: f64, seed: f32, inten: f32, head_c: (f32, f32, f32), tail_c: (f32, f32, f32)| {
            let fl = 0.72
                + 0.28
                    * ((t * 46.0 + seed as f64 * 6.28).sin()
                        * (t * 27.0 + seed as f64 * 3.14).sin()) as f32;
            let a = inten * fl * it;
            let tip = dvec3_add(head_at, dvec3_scale(axis, len));
            let wn = dvec3_scale(w_axis, half_w);
            let wt = dvec3_scale(w_axis, half_w * 0.22);
            sgl::c3f(head_c.0 * a, head_c.1 * a, head_c.2 * a);
            let h0 = dvec3_add(head_at, wn);
            let h1 = dvec3_add(head_at, dvec3_scale(wn, -1.0));
            sgl::v3f(h0.x as f32, h0.y as f32, h0.z as f32);
            sgl::v3f(h1.x as f32, h1.y as f32, h1.z as f32);
            sgl::c3f(tail_c.0 * a * 0.25, tail_c.1 * a * 0.25, tail_c.2 * a * 0.25);
            let t1 = dvec3_add(tip, dvec3_scale(wt, -1.0));
            let t0 = dvec3_add(tip, wt);
            sgl::v3f(t1.x as f32, t1.y as f32, t1.z as f32);
            sgl::v3f(t0.x as f32, t0.y as f32, t0.z as f32);
        };
        /* Wide orange body, then the white-hot core (their exact ramp). */
        card(8.0, 2.4, 0.10, 0.8, (1.0, 0.55, 0.12), (0.85, 0.12, 0.03));
        card(5.0, 1.1, 0.63, 1.25, (1.3, 1.25, 1.1), (1.0, 0.55, 0.12));
    }

    let n = ((STREAK_COUNT as f32) * it) as usize;
    for i in 0..n.max(1) {
        let ang = hashf(i, 1) * std::f64::consts::TAU;
        let ring = RING_MIN_M + hashf(i, 2) * (RING_MAX_M - RING_MIN_M);
        let len = (LEN_MIN_M + hashf(i, 3) * (LEN_MAX_M - LEN_MIN_M)) * it as f64;
        /* Scroll toward the camera: plasma streams PAST us against travel. */
        let phase = (hashf(i, 4) + t * SCROLL_MPS / FIELD_DEPTH_M).fract();
        let along = FIELD_AHEAD_M + phase * FIELD_DEPTH_M;
        let radial = dvec3_add(dvec3_scale(side, ang.cos() * ring), dvec3_scale(side2, ang.sin() * ring));
        let head = dvec3_add(dvec3_add(cam, dvec3_scale(axis, along)), radial);
        let tail = dvec3_add(head, dvec3_scale(axis, len));
        /* Billboard the thin quad toward the camera. */
        let to_cam = dvec3_normalize(dvec3_add(dvec3_scale(dvec3_add(head, tail), -0.5), cam));
        let w = dvec3_scale(dvec3_normalize(dvec3_cross(axis, to_cam)), HALF_W_M * (0.7 + 0.6 * hashf(i, 5)));
        /* Colour: white-hot core streaks near the axis, orange -> deep red
         * further out; ends fade via the scroll phase so the loop seam hides. */
        let heat = (1.0 - (ring - RING_MIN_M) / (RING_MAX_M - RING_MIN_M)) as f32;
        let fade = ((phase * (1.0 - phase)) * 4.0) as f32 * it;
        let (cr, cg, cb) = (
            (0.9 + 0.1 * heat) * fade,
            (0.35 + 0.55 * heat) * fade,
            (0.05 + 0.35 * heat * heat) * fade,
        );
        sgl::c3f(cr, cg, cb);
        let (h0, h1) = (dvec3_add(head, w), dvec3_add(head, dvec3_scale(w, -1.0)));
        let (t1, t0) = (dvec3_add(tail, dvec3_scale(w, -1.0)), dvec3_add(tail, w));
        sgl::v3f(h0.x as f32, h0.y as f32, h0.z as f32);
        sgl::v3f(h1.x as f32, h1.y as f32, h1.z as f32);
        sgl::v3f(t1.x as f32, t1.y as f32, t1.z as f32);
        sgl::v3f(t0.x as f32, t0.y as f32, t0.z as f32);
    }
    sgl::end();
    crate::renderer::sgl_overlay_end();
}

/// Get (creating once) the additive FX pipeline shared by the streaks and the
/// plasma shell: blend ONE/ONE (black = transparent), depth TESTED so terrain
/// occludes but never WRITTEN so overlapping glow accumulates.
fn fx_pipeline() -> sgl::Pipeline {
    let mut pip = PIP_FX.with(|p| p.get());
    if pip.id == 0 {
        let mut desc = sokol::gfx::PipelineDesc {
            depth: sokol::gfx::DepthState {
                write_enabled: false,
                compare: sokol::gfx::CompareFunc::Less,
                ..Default::default()
            },
            cull_mode: sokol::gfx::CullMode::None,
            ..Default::default()
        };
        desc.colors[0].blend = sokol::gfx::BlendState {
            enabled: true,
            src_factor_rgb: sokol::gfx::BlendFactor::One,
            dst_factor_rgb: sokol::gfx::BlendFactor::One,
            src_factor_alpha: sokol::gfx::BlendFactor::One,
            dst_factor_alpha: sokol::gfx::BlendFactor::One,
            ..Default::default()
        };
        pip = sgl::make_pipeline(&desc);
        PIP_FX.with(|p| p.set(pip));
    }
    pip
}

/// Premultiplied-over pipeline for the hull-hugging plasma shell.
fn shell_pipeline() -> sgl::Pipeline {
    let mut pip = PIP_SHELL.with(|p| p.get());
    if pip.id == 0 {
        let mut desc = sokol::gfx::PipelineDesc {
            depth: sokol::gfx::DepthState {
                write_enabled: false,
                compare: sokol::gfx::CompareFunc::Less,
                ..Default::default()
            },
            cull_mode: sokol::gfx::CullMode::None,
            ..Default::default()
        };
        desc.colors[0].blend = sokol::gfx::BlendState {
            enabled: true,
            src_factor_rgb: sokol::gfx::BlendFactor::One,
            dst_factor_rgb: sokol::gfx::BlendFactor::OneMinusSrcAlpha,
            src_factor_alpha: sokol::gfx::BlendFactor::One,
            dst_factor_alpha: sokol::gfx::BlendFactor::OneMinusSrcAlpha,
            ..Default::default()
        };
        pip = sgl::make_pipeline(&desc);
        PIP_SHELL.with(|p| p.set(pip));
    }
    pip
}

/// One falling stage's inputs for the plasma shell.
pub struct ShellStage {
    /// Stack centre in world space.
    pub center: DVec3,
    /// Stack axis (unit) - the stage's orientation, may tumble.
    pub axis: DVec3,
    /// Direction of travel (unit) - the windward face the plasma wraps.
    pub flow: DVec3,
    /// Shed part stack (engine at [0], on up).
    pub parts: Vec<u16>,
    /// Aero-heating glow 0..~1.4 from `core::falling_stage`.
    pub heat: f32,
}

/// Draw the hull-hugging plasma shell around every hot falling stage. Opens
/// its own world pass; call after `rocket_fx` drew the tumbling stage models.
pub fn draw_shells(view: crate::gfx_math::Mat4, proj: crate::gfx_math::Mat4, cam: DVec3, stages: &[ShellStage]) {
    if stages.iter().all(|s| s.heat <= 0.05) {
        return;
    }
    crate::renderer::sgl_overlay_begin();
    sgl::defaults();
    sgl::matrix_mode_projection();
    sgl::load_matrix(&proj.m[0]);
    sgl::matrix_mode_modelview();
    sgl::load_matrix(&view.m[0]);
    let t = TIME_S.with(|c| c.get()) as f64;
    let pip = shell_pipeline();
    sgl::load_pipeline(pip);
    sgl::disable_texture();
    for s in stages {
        if s.heat > 0.05 {
            /* Local frame centred on the stack (tight f32), translated to
             * world - the same precision trick rocket_fx uses. */
            sgl::push_matrix();
            sgl::translate(s.center.x as f32, s.center.y as f32, s.center.z as f32);
            emit_shell(s, cam, t);
            sgl::pop_matrix();
        }
    }
    crate::renderer::sgl_overlay_end();
}

fn sign(x: f64) -> f64 {
    if x < 0.0 { -1.0 } else { 1.0 }
}

fn smoothstep(e0: f64, e1: f64, x: f64) -> f64 {
    let t = ((x - e0) / (e1 - e0)).clamp(0.0, 1.0);
    t * t * (3.0 - 2.0 * t)
}

/// Round-cone SDF (Inigo Quilez): distance to a capped cone with spherical end
/// caps of radii r1 (at a) and r2 (at b). The hull is a union of these.
fn sd_round_cone(p: DVec3, a: DVec3, b: DVec3, r1: f64, r2: f64) -> f64 {
    let ba = dvec3_sub(b, a);
    let l2 = dvec3_dot(ba, ba).max(1e-9);
    let rr = r1 - r2;
    let a2 = l2 - rr * rr;
    let il2 = 1.0 / l2;
    let pa = dvec3_sub(p, a);
    let y = dvec3_dot(pa, ba);
    let z = y - l2;
    let x2v = dvec3_sub(dvec3_scale(pa, l2), dvec3_scale(ba, y));
    let x2 = dvec3_dot(x2v, x2v);
    let y2 = y * y * l2;
    let z2 = z * z * l2;
    let k = sign(rr) * rr * rr * x2;
    if sign(z) * a2 * z2 > k {
        return (x2 + z2).max(0.0).sqrt() * il2 - r2;
    }
    if sign(y) * a2 * y2 < k {
        return (x2 + y2).max(0.0).sqrt() * il2 - r1;
    }
    ((x2 * a2 * il2).max(0.0).sqrt() + y * rr) * il2 - r1
}

fn smooth_min(a: f64, b: f64, k: f64) -> f64 {
    let h = (0.5 + 0.5 * (b - a) / k).clamp(0.0, 1.0);
    b * (1.0 - h) + a * h - k * h * (1.0 - h)
}

/// Cheap smooth per-vertex turbulence for the plasma boil (no noise texture):
/// a product of scrolling sines, in [0, 1].
fn boil(p: DVec3, t: f64) -> f64 {
    let n = (p.x * 3.1 + t * 2.0).sin() * (p.y * 3.3 - t * 1.7).sin() * (p.z * 2.9 + t * 1.3).sin();
    0.5 + 0.5 * n
}

/// Build + emit one stage's plasma shell. Works in a LOCAL frame centred on
/// the stack (small f32 coords), wrapped in a translate to world space so the
/// surface-net math keeps precision the way rocket_fx does.
fn emit_shell(s: &ShellStage, cam: DVec3, t: f64) {
    /* Round-cone prims down the stack, centred on the origin along `axis`. */
    let n_parts = s.parts.len().max(1);
    let total_h = n_parts as f64 * SHELL_SEG_M;
    let axis = dvec3_normalize(s.axis);
    let mut prims: Vec<(DVec3, f64, DVec3, f64)> = Vec::with_capacity(n_parts);
    let mut vrad = SHELL_PART_R;
    for (i, &id) in s.parts.iter().enumerate() {
        let vac = engine_kind(id) == Some(EngineKind::Vacuum);
        let scale = if vac { SHELL_VAC_SCALE } else { 1.0 };
        let r = SHELL_PART_R * scale;
        /* Engines pinch to a smaller throat radius at the base. */
        let (r_lo, r_hi) = match part_role(id) {
            Some(PartRole::Engine) => (r * 0.55, r),
            Some(PartRole::Capsule) => (r, r * 0.4),
            _ => (r, r),
        };
        let s0 = i as f64 * SHELL_SEG_M - total_h * 0.5;
        let s1 = (i + 1) as f64 * SHELL_SEG_M - total_h * 0.5;
        prims.push((dvec3_scale(axis, s0), r_lo, dvec3_scale(axis, s1), r_hi));
        vrad = vrad.max(r);
    }

    let flow = if dvec3_length(s.flow) > 1e-6 { dvec3_normalize(s.flow) } else { axis };
    let shell = vrad * SHELL_STANDOFF;
    let wake = total_h * SHELL_WAKE_MULT;
    let cam_local = dvec3_sub(cam, s.center);

    let hull_sdf = |p: DVec3| -> f64 {
        prims
            .iter()
            .fold(f64::MAX, |d, &(a, r1, b, r2)| d.min(sd_round_cone(p, a, b, r1, r2)))
    };

    /* Bounds in the flow frame (s = windward..downstream, x/y perpendicular). */
    let upref = if flow.y.abs() > 0.9 { dvec3_make(1.0, 0.0, 0.0) } else { dvec3_make(0.0, 1.0, 0.0) };
    let rt = dvec3_normalize(dvec3_cross(flow, upref));
    let upv = dvec3_normalize(dvec3_cross(rt, flow));
    let (mut smin, mut smax) = (f64::MAX, f64::MIN);
    let (mut xmin, mut xmax) = (f64::MAX, f64::MIN);
    let (mut ymin, mut ymax) = (f64::MAX, f64::MIN);
    let (mut lead, mut tail) = (f64::MIN, f64::MAX);
    for &(a, r1, b, r2) in &prims {
        for (p, r) in [(a, r1), (b, r2)] {
            let (sc, x, y) = (dvec3_dot(p, flow), dvec3_dot(p, rt), dvec3_dot(p, upv));
            let rr = r + shell;
            smin = smin.min(sc - rr);
            smax = smax.max(sc + rr);
            xmin = xmin.min(x - rr);
            xmax = xmax.max(x + rr);
            ymin = ymin.min(y - rr);
            ymax = ymax.max(y + rr);
            lead = lead.max(sc + r);
            tail = tail.min(sc - r);
        }
    }
    let body = (lead - tail).max(vrad);

    /* Downstream-smeared field: smooth-union of upstream-shifted hull copies,
     * each tapered so the far wake pinches to a point. `== shell` isosurface. */
    let smk = shell * 1.6;
    let ksmear = ((wake / smk).ceil() as usize + 1).clamp(6, 20);
    let taper = shell * 2.2 / wake;
    let field = |p: DVec3| -> f64 {
        let mut d = hull_sdf(p);
        for m in 1..ksmear {
            let kd = wake * m as f64 / (ksmear - 1) as f64;
            d = smooth_min(d, hull_sdf(dvec3_add(p, dvec3_scale(flow, kd))) + kd * taper, smk);
        }
        d - shell
    };

    let pad = shell * 1.8;
    smin -= wake + pad;
    smax += pad;
    xmin -= pad;
    xmax += pad;
    ymin -= pad;
    ymax += pad;

    let cell = (vrad * SHELL_CELL_FRAC).max(0.5);
    let dim = |lo: f64, hi: f64| (((hi - lo) / cell).ceil() as usize).clamp(2, SHELL_GRID_CAP);
    let (gs, gx, gy) = (dim(smin, smax), dim(xmin, xmax), dim(ymin, ymax));
    let (cs, cx, cy) = ((smax - smin) / gs as f64, (xmax - xmin) / gx as f64, (ymax - ymin) / gy as f64);
    let cpos = |i: usize, j: usize, k: usize| -> DVec3 {
        dvec3_add(
            dvec3_add(dvec3_scale(flow, smin + i as f64 * cs), dvec3_scale(rt, xmin + j as f64 * cx)),
            dvec3_scale(upv, ymin + k as f64 * cy),
        )
    };

    let (nx, ny, nz) = (gs + 1, gx + 1, gy + 1);
    let cidx = |i: usize, j: usize, k: usize| (i * ny + j) * nz + k;
    let mut fval = vec![0.0f64; nx * ny * nz];
    for i in 0..nx {
        for j in 0..ny {
            for k in 0..nz {
                fval[cidx(i, j, k)] = field(cpos(i, j, k));
            }
        }
    }

    const EDGES: [((usize, usize, usize), (usize, usize, usize)); 12] = [
        ((0, 0, 0), (1, 0, 0)), ((0, 1, 0), (1, 1, 0)), ((0, 0, 1), (1, 0, 1)), ((0, 1, 1), (1, 1, 1)),
        ((0, 0, 0), (0, 1, 0)), ((1, 0, 0), (1, 1, 0)), ((0, 0, 1), (0, 1, 1)), ((1, 0, 1), (1, 1, 1)),
        ((0, 0, 0), (0, 0, 1)), ((1, 0, 0), (1, 0, 1)), ((0, 1, 0), (0, 1, 1)), ((1, 1, 0), (1, 1, 1)),
    ];
    let lidx = |i: usize, j: usize, k: usize| (i * gx + j) * gy + k;
    let grad_eps = cell * 0.5;
    let heat = s.heat.clamp(0.0, 1.4) as f64;

    sgl::begin_triangles();
    for li in 0..SHELL_LAYERS {
        let layer = if SHELL_LAYERS > 1 { li as f64 / (SHELL_LAYERS - 1) as f64 } else { 0.0 };
        let iso = shell * SHELL_SPREAD * layer;
        let mut cellv: Vec<i32> = vec![-1; gs * gx * gy];
        let mut vpos: Vec<DVec3> = Vec::new();
        let mut vnrm: Vec<DVec3> = Vec::new();
        let mut vcool: Vec<f64> = Vec::new();
        for i in 0..gs {
            for j in 0..gx {
                for k in 0..gy {
                    let mut acc = dvec3_make(0.0, 0.0, 0.0);
                    let mut cnt = 0.0;
                    for &((ax, ay, az), (bx, by, bz)) in EDGES.iter() {
                        let fa = fval[cidx(i + ax, j + ay, k + az)] - iso;
                        let fb = fval[cidx(i + bx, j + by, k + bz)] - iso;
                        if (fa < 0.0) != (fb < 0.0) {
                            let tt = fa / (fa - fb);
                            let pa = cpos(i + ax, j + ay, k + az);
                            let pb = cpos(i + bx, j + by, k + bz);
                            acc = dvec3_add(acc, dvec3_add(pa, dvec3_scale(dvec3_sub(pb, pa), tt)));
                            cnt += 1.0;
                        }
                    }
                    if cnt > 0.0 {
                        let p = dvec3_scale(acc, 1.0 / cnt);
                        let ex = dvec3_make(grad_eps, 0.0, 0.0);
                        let ey = dvec3_make(0.0, grad_eps, 0.0);
                        let ez = dvec3_make(0.0, 0.0, grad_eps);
                        let nrm = dvec3_normalize(dvec3_make(
                            hull_sdf(dvec3_add(p, ex)) - hull_sdf(dvec3_sub(p, ex)),
                            hull_sdf(dvec3_add(p, ey)) - hull_sdf(dvec3_sub(p, ey)),
                            hull_sdf(dvec3_add(p, ez)) - hull_sdf(dvec3_sub(p, ez)),
                        ));
                        let ds = (lead - dvec3_dot(p, flow)).max(0.0);
                        let cool = if ds <= body { 0.30 * (ds / body) } else { (0.30 + 0.70 * ((ds - body) / wake)).min(1.0) };
                        cellv[lidx(i, j, k)] = vpos.len() as i32;
                        vpos.push(p);
                        vnrm.push(nrm);
                        vcool.push(cool);
                    }
                }
            }
        }

        let emit_v = |vi: usize, vpos: &[DVec3], vnrm: &[DVec3], vcool: &[f64]| {
            let p = vpos[vi];
            let cool = vcool[vi];
            /* Cooling ramp gated by heat: red -> orange -> yellow -> white,
             * the hotter colours only develop as the shock climbs. */
            let whitef = smoothstep(0.10, 0.0, cool) * smoothstep(0.55, 1.0, heat);
            let yellowf = smoothstep(0.22, 0.04, cool) * smoothstep(0.30, 0.80, heat);
            let orangef = smoothstep(0.45, 0.10, cool) * smoothstep(0.12, 0.55, heat);
            let mix = |a: (f64, f64, f64), b: (f64, f64, f64), f: f64| {
                (a.0 + (b.0 - a.0) * f, a.1 + (b.1 - a.1) * f, a.2 + (b.2 - a.2) * f)
            };
            let mut col = (0.40, 0.05, 0.02);
            col = mix(col, (1.00, 0.36, 0.07), orangef);
            col = mix(col, (1.00, 0.78, 0.40), yellowf);
            col = mix(col, (1.40, 1.32, 1.22), whitef);
            /* Fresnel rim (denser at grazing angles -> volumetric read). */
            let view = dvec3_normalize(dvec3_sub(cam_local, p));
            let rim = (1.0 - dvec3_dot(vnrm[vi], view).abs()).clamp(0.0, 1.0).powf(1.6);
            let tb = boil(p, t);
            let hot = whitef.max(yellowf * 0.7);
            let dens = ((0.30 + 0.9 * tb) * (0.45 + 0.8 * rim)).clamp(0.0, 1.0);
            let tailfade = smoothstep(0.85, 0.35, cool);
            let layerfade = 1.0 - 0.7 * layer;
            let heatfade = smoothstep(0.03, 0.4, heat) * (0.4 + 0.6 * heat.min(1.0));
            let a = (dens * (0.45 + 1.3 * hot) * tailfade * layerfade * heatfade).clamp(0.0, 0.72);
            /* Premultiplied-over: rgb carries colour*alpha (times an emissive
             * boost so it reads incandescent), alpha rides the 4th channel so
             * the blend does the "over" and caps the pile-up. */
            let e = a * SHELL_EMISSION;
            sgl::c4f((col.0 * e) as f32, (col.1 * e) as f32, (col.2 * e) as f32, a as f32);
            sgl::v3f(p.x as f32, p.y as f32, p.z as f32);
        };
        let tri = |a: i32, b: i32, c: i32, vpos: &[DVec3], vnrm: &[DVec3], vcool: &[f64]| {
            if a < 0 || b < 0 || c < 0 {
                return;
            }
            emit_v(a as usize, vpos, vnrm, vcool);
            emit_v(b as usize, vpos, vnrm, vcool);
            emit_v(c as usize, vpos, vnrm, vcool);
        };
        let quad = |c0: i32, c1: i32, c2: i32, c3: i32, vp: &[DVec3], vn: &[DVec3], vc: &[f64]| {
            tri(c0, c1, c2, vp, vn, vc);
            tri(c0, c2, c3, vp, vn, vc);
        };
        for i in 0..gs {
            for j in 1..gx {
                for k in 1..gy {
                    if (fval[cidx(i, j, k)] < iso) != (fval[cidx(i + 1, j, k)] < iso) {
                        quad(cellv[lidx(i, j - 1, k - 1)], cellv[lidx(i, j, k - 1)], cellv[lidx(i, j, k)], cellv[lidx(i, j - 1, k)], &vpos, &vnrm, &vcool);
                    }
                }
            }
        }
        for i in 1..gs {
            for j in 0..gx {
                for k in 1..gy {
                    if (fval[cidx(i, j, k)] < iso) != (fval[cidx(i, j + 1, k)] < iso) {
                        quad(cellv[lidx(i - 1, j, k - 1)], cellv[lidx(i, j, k - 1)], cellv[lidx(i, j, k)], cellv[lidx(i - 1, j, k)], &vpos, &vnrm, &vcool);
                    }
                }
            }
        }
        for i in 1..gs {
            for j in 1..gx {
                for k in 0..gy {
                    if (fval[cidx(i, j, k)] < iso) != (fval[cidx(i, j, k + 1)] < iso) {
                        quad(cellv[lidx(i - 1, j - 1, k)], cellv[lidx(i, j - 1, k)], cellv[lidx(i, j, k)], cellv[lidx(i - 1, j, k)], &vpos, &vnrm, &vcool);
                    }
                }
            }
        }
    }
    sgl::end();
}
