//! Third-person chase camera for the rocket ride.
//!
//! Ported from the JS reference's `src/rocket/RocketCamera.ts`: a spherical
//! orbit around the rocket at (distance, azimuth, elevation), always looking
//! at it, with the rocket's own up as the camera up. Tunables live in
//! `rocket.yaml [camera]` (the JS `ROCKET_CONFIG.CAMERA` values).
//!
//! The mouse orbits the CAMERA; it does not steer. That split is the whole
//! point of the mode - flying is keys (see `controls::Action::Rocket*`), and
//! the camera is free to look wherever you want while you fly. It's why the
//! rocket can't just reuse the FPS camera, where look direction *is* heading.
//!
//! Two deliberate divergences from the JS, per CLAUDE.md "Rust leads - do
//! not chase JS parity":
//!
//! 1. **The orbit frame is the rocket's own basis**, so azimuth 0 really is
//!    "behind the nose". The JS built its frame from `worldUp x rocketUp`,
//!    which made "behind" drift as you flew around the sphere and, worse,
//!    hard-snapped `forward` to `(0,0,-1)` whenever the rocket pointed near
//!    global +Y (`RocketCamera.ts:122`) - a visible pop with no blend. On a
//!    round planet that threshold is crossed constantly. The rocket here
//!    carries an orthonormal basis already, so there's nothing to
//!    reconstruct and no degenerate case to guard.
//! 2. **The mouse orbits without holding a button.** The JS released pointer
//!    lock in flight and orbited on left-drag because it needed a cursor for
//!    its HTML flight buttons. This client stays pointer-locked and its UI is
//!    in-canvas, so drag-to-look would be a downgrade.
//!
//! Smoothing matches the JS exactly and matters: only the three orbit params
//! are damped. The anchor and up are read rigidly from the rocket every
//! frame, so the camera is welded to it and only YOUR input eases in.

use std::cell::RefCell;

use crate::gfx_math::{mat4_look_at_dir, Mat4};
use tenebris_core::math::{dvec3_add, dvec3_normalize, dvec3_scale, dvec3_to_vec3, DVec3, Vec3};

/// Live orbit state. `target_*` is where the input has asked to be;
/// `cur_*` is the damped value actually used to place the camera.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct RocketCam {
    pub cur_distance: f32,
    pub cur_azimuth: f32,
    pub cur_elevation: f32,
    target_distance: f32,
    target_azimuth: f32,
    target_elevation: f32,
}

impl Default for RocketCam {
    fn default() -> Self {
        let c = tenebris_core::rocket::config().camera;
        RocketCam {
            cur_distance: c.distance_m,
            cur_azimuth: 0.0, /* directly behind the nose */
            cur_elevation: c.elevation_rad,
            target_distance: c.distance_m,
            target_azimuth: 0.0,
            target_elevation: c.elevation_rad,
        }
    }
}

thread_local! {
    static CAM: RefCell<RocketCam> = RefCell::new(RocketCam {
        /* Not Default::default() - a const-initialised thread_local can't
         * read the config. `reset` seeds it from rocket.yaml on boarding. */
        cur_distance: 20.0,
        cur_azimuth: 0.0,
        cur_elevation: 0.3,
        target_distance: 20.0,
        target_azimuth: 0.0,
        target_elevation: 0.3,
    });
}

/// Which frame the chase camera's orbit angles live in.
///
/// `Rocket`: the rocket's own basis - azimuth 0 is behind the nose and the
/// camera turns with the ship. `Equatorial`: fixed world axes (up = the
/// planet spin axis, +Y), so the camera holds a stable equator-aligned
/// view while the rocket manoeuvres inside it - the KSP "orbit mode"
/// counterpart to its chase mode.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum CamFrame {
    Rocket,
    Equatorial,
}

thread_local! {
    /* Persists across flights on purpose: the alignment is a pilot
     * preference, not flight state. */
    static FRAME: std::cell::Cell<CamFrame> = const { std::cell::Cell::new(CamFrame::Rocket) };
}

/// Toggle rocket-frame <-> equatorial (the CamAlign key).
pub fn toggle_frame() {
    FRAME.with(|f| {
        f.set(match f.get() {
            CamFrame::Rocket => CamFrame::Equatorial,
            CamFrame::Equatorial => CamFrame::Rocket,
        })
    });
}

pub fn frame() -> CamFrame {
    FRAME.with(|f| f.get())
}

/// HUD label for the current alignment (ASCII, per the in-game-text rule).
pub fn frame_label() -> &'static str {
    match frame() {
        CamFrame::Rocket => "rocket",
        CamFrame::Equatorial => "equatorial",
    }
}

/// The frame the orbit angles apply in: the rocket's own basis, or fixed
/// world axes for the equatorial view. Returns (fwd, up, right), the same
/// handedness as the player basis (fwd x up = right).
fn orbit_frame(fwd: DVec3, up: DVec3, right: DVec3) -> (DVec3, DVec3, DVec3) {
    match frame() {
        CamFrame::Rocket => (fwd, up, right),
        CamFrame::Equatorial => (
            tenebris_core::math::dvec3_make(0.0, 0.0, 1.0),
            tenebris_core::math::dvec3_make(0.0, 1.0, 0.0),
            tenebris_core::math::dvec3_make(-1.0, 0.0, 0.0),
        ),
    }
}

/// Re-seed the orbit from config. Call when boarding, so every flight
/// starts parked behind the rocket rather than wherever the last one ended.
pub fn reset() {
    CAM.with(|c| *c.borrow_mut() = RocketCam::default());
}

/// Orbit the camera. `dx`/`dy` are raw mouse pixels.
///
/// Both axes add (dragging down raises the camera, so it looks down at the
/// rocket) - matching the JS, whose "invert deltaX" comment describes an
/// inversion its code never performs.
pub fn orbit(dx: f32, dy: f32) {
    let c = tenebris_core::rocket::config().camera;
    CAM.with(|cell| {
        let m = &mut *cell.borrow_mut();
        m.target_azimuth = wrap_pi(m.target_azimuth + dx * c.mouse_sens);
        m.target_elevation = clamp_elevation(m.target_elevation + dy * c.mouse_sens);
    });
}

/// Zoom by one scroll notch. `notches` is +1 per notch away (pull back).
/// Multiplicative, so each notch is a constant *fraction* of the current
/// distance - it zooms as fast up close as it does far out.
pub fn zoom(notches: f32) {
    let c = tenebris_core::rocket::config().camera;
    CAM.with(|cell| {
        let m = &mut *cell.borrow_mut();
        let d = m.target_distance * (1.0 + notches * c.zoom_step);
        m.target_distance = d.clamp(c.min_distance_m, c.max_distance_m);
    });
}

/// Ease the orbit toward its target. Frame-rate independent:
/// `1 - exp(-rate * dt)`.
pub fn update(dt: f32) {
    let c = tenebris_core::rocket::config().camera;
    let t = 1.0 - (-c.smooth_rate * dt).exp();
    CAM.with(|cell| {
        let m = &mut *cell.borrow_mut();
        m.cur_distance += (m.target_distance - m.cur_distance) * t;
        m.cur_elevation += (m.target_elevation - m.cur_elevation) * t;
        /* Angles need wraparound-aware easing or crossing +-pi unwinds the
         * long way round - a full spin instead of a nudge. */
        m.cur_azimuth = lerp_angle(m.cur_azimuth, m.target_azimuth, t);
    });
}

pub fn state() -> RocketCam {
    CAM.with(|c| *c.borrow())
}

/// Unit direction from the rocket to the camera, in the rocket's own frame.
///
/// Azimuth 0 = behind the nose (`-fwd`); +azimuth swings right; +elevation
/// lifts toward the rocket's up.
fn orbit_dir(fwd: DVec3, up: DVec3, right: DVec3, azimuth: f32, elevation: f32) -> DVec3 {
    let (ca, sa) = ((azimuth as f64).cos(), (azimuth as f64).sin());
    let (ce, se) = ((elevation as f64).cos(), (elevation as f64).sin());
    let v = dvec3_add(
        dvec3_add(dvec3_scale(right, sa * ce), dvec3_scale(up, se)),
        dvec3_scale(fwd, -ca * ce),
    );
    dvec3_normalize(v)
}

/// The chase view: eye on the orbit sphere, looking back at `anchor`.
///
/// `fwd`/`up`/`right` are the rocket's orthonormal basis and `anchor` is the
/// rocket itself. Built from a look DIRECTION rather than a target, like
/// `player_ctrl::view` - and here it's exact rather than merely careful,
/// since the eye is `anchor + dir * distance`, so looking back at the anchor
/// is precisely `-dir`. No `target - eye` subtraction, so none of the
/// float-cancellation noise that motivates the same trick over there.
pub fn view(anchor: DVec3, fwd: DVec3, up: DVec3, right: DVec3) -> Mat4 {
    let m = state();
    let (f, u, r) = orbit_frame(fwd, up, right);
    let dir = orbit_dir(f, u, r, m.cur_azimuth, m.cur_elevation);
    let eye = dvec3_add(anchor, dvec3_scale(dir, m.cur_distance as f64));
    let look = dvec3_scale(dir, -1.0);
    mat4_look_at_dir(
        dvec3_to_vec3(eye),
        Vec3 { x: look.x as f32, y: look.y as f32, z: look.z as f32 },
        Vec3 { x: u.x as f32, y: u.y as f32, z: u.z as f32 },
    )
}

/// Where the chase camera's eye actually sits. The renderer has several
/// consumers (water fresnel, reentry FX) that otherwise assume the eye is
/// at the player, so they need to be told.
pub fn eye(anchor: DVec3, fwd: DVec3, up: DVec3, right: DVec3) -> DVec3 {
    let m = state();
    let (f, u, r) = orbit_frame(fwd, up, right);
    let dir = orbit_dir(f, u, r, m.cur_azimuth, m.cur_elevation);
    dvec3_add(anchor, dvec3_scale(dir, m.cur_distance as f64))
}

/* --------------------------- small helpers ---------------------------- */

fn wrap_pi(a: f32) -> f32 {
    use std::f32::consts::{PI, TAU};
    let mut a = a;
    while a > PI {
        a -= TAU;
    }
    while a < -PI {
        a += TAU;
    }
    a
}

/// Clamp just shy of straight up/down - at exactly +-pi/2 the orbit
/// direction is parallel to `up` and the look-at basis is degenerate.
fn clamp_elevation(e: f32) -> f32 {
    const LIMIT: f32 = std::f32::consts::FRAC_PI_2 - 0.01;
    e.clamp(-LIMIT, LIMIT)
}

/// Lerp `a` -> `b` the short way around the circle.
fn lerp_angle(a: f32, b: f32, t: f32) -> f32 {
    wrap_pi(a + wrap_pi(b - a) * t)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tenebris_core::math::{dvec3_dot, dvec3_make};

    /// The rocket's basis, nose along +x.
    fn basis() -> (DVec3, DVec3, DVec3) {
        (
            dvec3_make(1.0, 0.0, 0.0), /* fwd */
            dvec3_make(0.0, 1.0, 0.0), /* up */
            dvec3_make(0.0, 0.0, 1.0), /* right */
        )
    }

    #[test]
    fn azimuth_zero_elevation_zero_sits_directly_behind_the_nose() {
        let (f, u, r) = basis();
        let d = orbit_dir(f, u, r, 0.0, 0.0);
        assert!((d.x + 1.0).abs() < 1e-9, "should be -fwd, got {d:?}");
        assert!(d.y.abs() < 1e-9 && d.z.abs() < 1e-9);
    }

    #[test]
    fn positive_elevation_lifts_the_camera_above_the_rocket() {
        let (f, u, r) = basis();
        let d = orbit_dir(f, u, r, 0.0, 0.3);
        assert!(dvec3_dot(d, u) > 0.0, "camera should be above, got {d:?}");
        assert!(dvec3_dot(d, f) < 0.0, "and still behind");
    }

    #[test]
    fn orbit_dir_is_always_unit() {
        let (f, u, r) = basis();
        for az in [-3.0, -1.0, 0.0, 0.7, 3.1] {
            for el in [-1.5, -0.3, 0.0, 0.3, 1.5] {
                let d = orbit_dir(f, u, r, az, el);
                let len = dvec3_dot(d, d).sqrt();
                assert!((len - 1.0).abs() < 1e-9, "az {az} el {el} -> len {len}");
            }
        }
    }

    /// The camera looks AT the rocket from wherever it orbits to - the one
    /// invariant a chase cam must never break.
    #[test]
    fn the_camera_always_looks_back_at_the_rocket() {
        let (f, u, r) = basis();
        let anchor = dvec3_make(1234.0, -56.0, 78.0);
        for az in [0.0, 1.2, -2.5] {
            CAM.with(|c| {
                let m = &mut *c.borrow_mut();
                m.cur_azimuth = az;
                m.cur_elevation = 0.3;
                m.cur_distance = 20.0;
            });
            let e = eye(anchor, f, u, r);
            let to_anchor = dvec3_normalize(tenebris_core::math::dvec3_sub(anchor, e));
            let d = orbit_dir(f, u, r, az, 0.3);
            /* look dir is -orbit_dir, and must point from eye to anchor. */
            for (a, b) in [(to_anchor.x, -d.x), (to_anchor.y, -d.y), (to_anchor.z, -d.z)] {
                assert!((a - b).abs() < 1e-6, "az {az}: {a} vs {b}");
            }
        }
    }

    /// Distance from the rocket is exactly the orbit distance, whatever the
    /// angles - i.e. the camera rides a sphere, not an ellipsoid.
    #[test]
    fn the_eye_sits_at_the_orbit_distance() {
        let (f, u, r) = basis();
        let anchor = dvec3_make(0.0, 300.0, 0.0);
        CAM.with(|c| {
            let m = &mut *c.borrow_mut();
            m.cur_azimuth = 0.9;
            m.cur_elevation = -0.4;
            m.cur_distance = 37.0;
        });
        let e = eye(anchor, f, u, r);
        let off = tenebris_core::math::dvec3_sub(e, anchor);
        let len = dvec3_dot(off, off).sqrt();
        assert!((len - 37.0).abs() < 1e-6, "expected 37 m out, got {len}");
    }

    #[test]
    fn elevation_clamps_short_of_straight_up() {
        let lim = std::f32::consts::FRAC_PI_2 - 0.01;
        assert_eq!(clamp_elevation(99.0), lim);
        assert_eq!(clamp_elevation(-99.0), -lim);
        assert_eq!(clamp_elevation(0.2), 0.2);
    }

    /// Easing across the +-pi seam must take the short way. Naive lerp
    /// spins the camera all the way around instead of nudging it.
    #[test]
    fn angle_lerp_takes_the_short_way_around() {
        use std::f32::consts::PI;
        /* 170 deg -> -170 deg is a 20 deg step across the seam. */
        let a = PI - 0.17;
        let b = -PI + 0.17;
        let out = lerp_angle(a, b, 0.5);
        /* Halfway is just past +-pi, i.e. |out| must stay NEAR pi, not
         * collapse toward 0 (which is what the long way round looks like). */
        assert!(out.abs() > PI - 0.02, "lerp went the long way: {out}");
    }

    #[test]
    fn zoom_is_multiplicative_and_clamped() {
        reset();
        let c = tenebris_core::rocket::config().camera;
        zoom(1.0);
        let after = CAM.with(|m| m.borrow().target_distance);
        assert!((after - c.distance_m * (1.0 + c.zoom_step)).abs() < 1e-4);

        for _ in 0..200 {
            zoom(1.0);
        }
        assert_eq!(CAM.with(|m| m.borrow().target_distance), c.max_distance_m);
        for _ in 0..400 {
            zoom(-1.0);
        }
        assert_eq!(CAM.with(|m| m.borrow().target_distance), c.min_distance_m);
    }

    /// Smoothing must converge to the target and never overshoot.
    #[test]
    fn update_eases_toward_the_target() {
        reset();
        orbit(100.0, 0.0);
        let target = CAM.with(|m| m.borrow().target_azimuth);
        let mut last = CAM.with(|m| m.borrow().cur_azimuth);
        for _ in 0..200 {
            update(1.0 / 60.0);
            let cur = CAM.with(|m| m.borrow().cur_azimuth);
            assert!(cur <= target + 1e-6, "overshot: {cur} > {target}");
            last = cur;
        }
        assert!((last - target).abs() < 1e-3, "did not converge: {last} vs {target}");
    }
}
