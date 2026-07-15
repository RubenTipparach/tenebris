//! Atmospheric reentry FX (space era): when the player / rocket falls fast
//! inside a body's lower atmosphere, hot plasma streaks stream past the
//! camera opposite the velocity - the mining-the-sky look, rebuilt on the
//! world sgl layer. Intensity ramps with speed between the rocket.yaml
//! `[reentry]` thresholds and fades with altitude, so a slow descent or a
//! high pass draws nothing.
//!
//! Purely visual (client); the salvage/explosion half of the feature lands
//! with the tracked falling stages. TENEBRIS_DEV_REENTRY=1 forces full
//! intensity for headless screenshots.

#![allow(dead_code)]

use std::cell::Cell;

use sokol::gl as sgl;

use tenebris_core::math::{
    dvec3_add, dvec3_cross, dvec3_length, dvec3_make, dvec3_normalize, dvec3_scale, DVec3,
};

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
    crate::renderer::sgl_world_begin();
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

    sgl::disable_texture();
    sgl::begin_quads();
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
    crate::renderer::sgl_world_end();
}
