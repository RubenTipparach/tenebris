//! On-rails orbital mechanics + planet rotation for the day/night + sky
//! sim.
//!
//! There is no n-body physics here: every body's position is a closed-form
//! function of the world clock (`world_time::seconds()`), so the solar
//! system can never drift, blow up, or need integration. This is the
//! "orbits are on rails" model the design calls for.
//!
//! ## Frames and the floating-origin trick
//!
//! The player stands on the *active* body (the one their physics is
//! anchored to). With a floating origin we do NOT move that body or the
//! player to simulate its spin + orbit - that would fight the terrain mesh
//! and player physics. Instead we keep the active body pinned at its
//! static render centre and rotate the whole SKY (sun + every other body)
//! by the active body's spin, then drift each body along its orbit. From
//! the surface this is indistinguishable from actually spinning/orbiting
//! the planet, and it costs nothing but a per-frame transform.
//!
//! So the two public outputs are:
//!   - [`sun_direction`]   - unit direction to the star, in the active
//!     body's rotating surface frame (drives the day/night terminator).
//!   - [`apparent_pos`]    - where another body should be drawn, in the
//!     same absolute render frame the renderer already uses for bodies.
//!
//! Periods come from `config::time()` (day_length_s / year_length_s) so a
//! designer tunes the pace of the sky in one YAML file; the per-body
//! multipliers below are the structural shape of the system.

use crate::config;
use crate::math::{
    dvec3_add, dvec3_cross, dvec3_dot, dvec3_length, dvec3_make, dvec3_normalize, dvec3_scale,
    dvec3_sub, DVec3,
};
use crate::planet::{self, BodyId};

use std::f64::consts::TAU;

/// World-space axis every body spins about (and every orbit's reference
/// "up"). Orbits lie near the X/Z plane so the sun sweeps low across the
/// sky as the body turns about +Y, giving a strong day/night terminator.
const SPIN_AXIS: DVec3 = DVec3 { x: 0.0, y: 1.0, z: 0.0 };

/// Fallback sun direction when the active body sits at the system origin
/// (orbit radius 0) and "toward the star" is undefined. Matches the old
/// hard-coded sky-light direction so a body without an orbit still lights.
const DEFAULT_SUN_DIR: DVec3 = DVec3 { x: 0.5, y: 0.9, z: 0.3 };

/// One body's on-rails elements. Distances are metres; periods are
/// multiples of the global day / year lengths (see `config::time()`).
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct OrbitElements {
    /// What this body orbits. `None` = orbits the star at the world origin
    /// (the planets); `Some(parent)` = orbits another body (the moons).
    pub parent: Option<BodyId>,
    /// Orbit radius about the parent, in metres. 0 = fixed at the parent.
    pub orbit_radius_m: f64,
    /// Orbit period as a multiple of `year_length_s`.
    pub orbit_years: f64,
    /// Orbit phase at the epoch, radians.
    pub orbit_phase0: f64,
    /// Orbit-plane tilt about the X axis, radians (gives the system some
    /// vertical spread instead of a flat disc).
    pub inclination: f64,
    /// Rotation (spin) period as a multiple of `day_length_s`. Only the
    /// active body's spin is observable, but every body carries one.
    pub spin_days: f64,
    /// Spin phase at the epoch, radians.
    pub spin_phase0: f64,
}

const STATIC: OrbitElements = OrbitElements {
    parent: None,
    orbit_radius_m: 0.0,
    orbit_years: 0.0,
    orbit_phase0: 0.0,
    inclination: 0.0,
    spin_days: 1.0,
    spin_phase0: 0.0,
};

/// The on-rails elements for a body. Four planets orbit the star, each
/// with one or two moons; ten asteroids fill a belt. The home world,
/// Tenebris, is the reference body (1 day, 1 year).
pub fn elements(id: BodyId) -> OrbitElements {
    use BodyId::*;
    match id {
        // ---- Planets (orbit the star at the origin) ----
        Tenebris => OrbitElements {
            parent: None,
            orbit_radius_m: 30_000.0,
            orbit_years: 1.0,
            orbit_phase0: 0.0,
            inclination: 0.0,
            spin_days: 1.0,
            spin_phase0: 0.0,
        },
        /* Sequoia is the COOLER sister world - it sits farther out than
         * the home world (40 km structural = 200 km from the star at the
         * default 150 km solar.yaml scale). */
        Sequoia => OrbitElements {
            parent: None,
            orbit_radius_m: 40_000.0,
            orbit_years: 1.5,
            orbit_phase0: 1.2,
            inclination: 0.05,
            spin_days: 1.1,
            spin_phase0: 0.4,
        },
        Crag => OrbitElements {
            parent: None,
            orbit_radius_m: 22_000.0,
            orbit_years: 0.8,
            orbit_phase0: 3.6,
            inclination: 0.08,
            spin_days: 0.7,
            spin_phase0: 1.1,
        },
        Frostbite => OrbitElements {
            parent: None,
            orbit_radius_m: 55_000.0,
            orbit_years: 2.6,
            orbit_phase0: 5.1,
            inclination: 0.12,
            spin_days: 1.5,
            spin_phase0: 2.0,
        },
        // ---- Moons (orbit their planet) ----
        Luna => OrbitElements {
            parent: Some(Tenebris),
            orbit_radius_m: 3_000.0,
            orbit_years: 0.08,
            orbit_phase0: 0.0,
            inclination: 0.12,
            spin_days: 0.08,
            spin_phase0: 0.0,
        },
        Selene => OrbitElements {
            parent: Some(Tenebris),
            orbit_radius_m: 5_000.0,
            orbit_years: 0.14,
            orbit_phase0: 2.2,
            inclination: -0.18,
            spin_days: 0.14,
            spin_phase0: 0.0,
        },
        Verdant => OrbitElements {
            parent: Some(Sequoia),
            orbit_radius_m: 3_500.0,
            orbit_years: 0.10,
            orbit_phase0: 0.5,
            inclination: 0.10,
            spin_days: 0.10,
            spin_phase0: 0.0,
        },
        Sprout => OrbitElements {
            parent: Some(Sequoia),
            orbit_radius_m: 5_500.0,
            orbit_years: 0.17,
            orbit_phase0: 3.0,
            inclination: -0.10,
            spin_days: 0.17,
            spin_phase0: 0.0,
        },
        Quartz => OrbitElements {
            parent: Some(Crag),
            orbit_radius_m: 4_000.0,
            orbit_years: 0.12,
            orbit_phase0: 1.0,
            inclination: 0.15,
            spin_days: 0.12,
            spin_phase0: 0.0,
        },
        Rime => OrbitElements {
            parent: Some(Frostbite),
            orbit_radius_m: 6_000.0,
            orbit_years: 0.22,
            orbit_phase0: 2.0,
            inclination: -0.12,
            spin_days: 0.22,
            spin_phase0: 0.0,
        },
        // ---- Asteroid belt (between Crag and Sequoia) ----
        Asteroid0 | Asteroid1 | Asteroid2 | Asteroid3 | Asteroid4 | Asteroid5 | Asteroid6
        | Asteroid7 | Asteroid8 | Asteroid9 => {
            let i = (id as i32 - BodyId::Asteroid0 as i32) as f64;
            OrbitElements {
                parent: None,
                orbit_radius_m: 34_000.0 + i * 450.0,
                orbit_years: 1.15 + i * 0.03,
                /* spread the ten rocks around the ring */
                orbit_phase0: i * (TAU / 10.0),
                inclination: 0.05 + (i * 0.37).sin() * 0.06,
                spin_days: 0.3,
                spin_phase0: 0.0,
            }
        }
        #[allow(unreachable_patterns)]
        _ => STATIC,
    }
}

/// System-wide orbit scale: solar.yaml's `sun_distance_m` over Tenebris's
/// STRUCTURAL orbit radius (the elements table above). Applied to every
/// star-orbiting body so "push the sun to 150 km" scales the whole system
/// proportionally - planets keep their relative spacing, moons keep their
/// tight parent orbits (they're parent-relative, not star-relative).
fn star_orbit_scale() -> f64 {
    let base = elements(BodyId::Tenebris).orbit_radius_m;
    let d = config::solar().sun_distance_m as f64;
    if d > 0.0 && base > 0.0 {
        d / base
    } else {
        1.0
    }
}

/// Rodrigues rotation of `v` about unit axis `k` by `angle` radians.
fn rotate_about(v: DVec3, k: DVec3, angle: f64) -> DVec3 {
    let (s, c) = angle.sin_cos();
    let term_cos = dvec3_scale(v, c);
    let term_sin = dvec3_scale(dvec3_cross(k, v), s);
    let term_dot = dvec3_scale(k, dvec3_dot(k, v) * (1.0 - c));
    dvec3_add(dvec3_add(term_cos, term_sin), term_dot)
}

/// Heliocentric (star-centred) position of a body at sim-time `t`,
/// recursing through any parent so moons ride their planet.
pub fn heliocentric_pos(id: BodyId, t: f64) -> DVec3 {
    let e = elements(id);
    let base = match e.parent {
        Some(p) => heliocentric_pos(p, t),
        None => dvec3_make(0.0, 0.0, 0.0),
    };
    if e.orbit_radius_m <= 0.0 {
        return base;
    }
    let year = config::time().year_length_s as f64;
    let period = e.orbit_years * year;
    let a = if period > 0.0 {
        e.orbit_phase0 + TAU * t / period
    } else {
        e.orbit_phase0
    };
    /* In-plane circular orbit, then tilt the plane about X. Star orbits
     * carry the system-wide solar.yaml scale; moon orbits stay structural. */
    let r = e.orbit_radius_m * if e.parent.is_none() { star_orbit_scale() } else { 1.0 };
    let (sa, ca) = a.sin_cos();
    let local = dvec3_make(r * ca, 0.0, r * sa);
    let (si, ci) = e.inclination.sin_cos();
    let tilted = dvec3_make(local.x, -local.z * si, local.z * ci);
    dvec3_add(base, tilted)
}

/// Sampled orbit TRACK of `moon` around `active`, expressed in the
/// active body's render frame at time `t` (the same frame
/// [`apparent_pos`] returns), as a closed ring of `segs + 1` points -
/// what the nav overlay draws so a pilot can see the moons' orbits
/// alongside the station's. Uses the exact circle construction of
/// [`heliocentric_pos`] (in-plane circle tilted about X, moon radii
/// structural) rotated by the active body's CURRENT spin, so the ring
/// passes through the moon's apparent position. `None` unless `moon`
/// actually orbits `active`.
pub fn moon_track(active: BodyId, moon: BodyId, t: f64, segs: usize) -> Option<Vec<DVec3>> {
    let e = elements(moon);
    if e.parent != Some(active) || e.orbit_radius_m <= 0.0 {
        return None;
    }
    let c = body_center(active);
    let spin = spin_angle(active, t);
    let (si, ci) = e.inclination.sin_cos();
    let r = e.orbit_radius_m;
    let mut out = Vec::with_capacity(segs + 1);
    for k in 0..=segs {
        let a = TAU * k as f64 / segs as f64;
        let (sa, ca) = a.sin_cos();
        let local = dvec3_make(r * ca, 0.0, r * sa);
        let tilted = dvec3_make(local.x, -local.z * si, local.z * ci);
        out.push(dvec3_add(c, rotate_about(tilted, SPIN_AXIS, spin)));
    }
    Some(out)
}

/// Spin angle (radians) of a body at sim-time `t`.
pub fn spin_angle(id: BodyId, t: f64) -> f64 {
    let e = elements(id);
    let day = config::time().day_length_s as f64;
    let period = e.spin_days * day;
    if period > 0.0 {
        e.spin_phase0 + TAU * t / period
    } else {
        e.spin_phase0
    }
}

/// Unit direction from the active body's surface toward the star, in the
/// body's rotating frame. As the body spins this vector circles the sky
/// once per day -> day/night. Its slow orbital drift gives a seasonal
/// shift in where the sun rises.
pub fn sun_direction(active: BodyId, t: f64) -> DVec3 {
    let q = heliocentric_pos(active, t);
    let len = dvec3_length(q);
    let to_star = if len > 1.0 {
        dvec3_scale(q, -1.0 / len)
    } else {
        dvec3_normalize(DEFAULT_SUN_DIR)
    };
    rotate_about(to_star, SPIN_AXIS, spin_angle(active, t))
}

/// Absolute render-frame position to draw `body` at, as seen from the
/// `active` body, at sim-time `t`. The active body itself maps to its own
/// static centre, so the renderer can call this uniformly for every body.
pub fn apparent_pos(active: BodyId, body: BodyId, t: f64) -> DVec3 {
    let c_active = body_center(active);
    if body == active {
        return c_active;
    }
    let rel = dvec3_sub(heliocentric_pos(body, t), heliocentric_pos(active, t));
    let rel_rot = rotate_about(rel, SPIN_AXIS, spin_angle(active, t));
    dvec3_add(c_active, rel_rot)
}

/// The static render anchor of a body (its `BodyConfig` position). The
/// active body stays pinned here; the sky moves around it.
fn body_center(id: BodyId) -> DVec3 {
    let b = planet::get(id);
    dvec3_make(b.pos_x, b.pos_y, b.pos_z)
}

/// Inverse of [`apparent_pos`] for arbitrary points: map a RENDER-frame
/// position (the frame the player/rocket lives in, anchored to the
/// `active` body's static centre and rotating with its spin) into the
/// heliocentric frame the orbit sim runs in. This is what puts the
/// player's marker on the solar-system map while they fly between
/// planets.
pub fn world_to_heliocentric(active: BodyId, p_world: DVec3, t: f64) -> DVec3 {
    let rel = dvec3_sub(p_world, body_center(active));
    /* apparent_pos rotates helio-relative offsets INTO the render frame by
     * +spin; undo with -spin, then re-anchor at the active body's
     * heliocentric position. */
    let rel_helio = rotate_about(rel, SPIN_AXIS, -spin_angle(active, t));
    dvec3_add(heliocentric_pos(active, t), rel_helio)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn setup() {
        // Pin the periods + system scale so the math is deterministic
        // regardless of any yaml an earlier test loaded.
        config::parse_time(
            "time:\n  day_length_s: 100.0\n  year_length_s: 1000.0\n",
            "orbit-test",
        );
        config::parse_solar("solar:\n  sun_distance_m: 150000\n", "orbit-test");
    }

    #[test]
    fn active_body_maps_to_its_static_centre() {
        setup();
        // apparent_pos of the active body onto itself is its own centre at
        // every time (the player's world never moves).
        let c = body_center(BodyId::Tenebris);
        for &t in &[0.0, 33.0, 250.0] {
            let p = apparent_pos(BodyId::Tenebris, BodyId::Tenebris, t);
            assert!((p.x - c.x).abs() < 1e-6);
            assert!((p.y - c.y).abs() < 1e-6);
            assert!((p.z - c.z).abs() < 1e-6);
        }
    }

    #[test]
    fn sun_direction_is_unit_and_sweeps_with_spin() {
        setup();
        let d0 = sun_direction(BodyId::Tenebris, 0.0);
        let len = (d0.x * d0.x + d0.y * d0.y + d0.z * d0.z).sqrt();
        assert!((len - 1.0).abs() < 1e-6, "sun dir not unit: {len}");
        // Quarter day later the sun has visibly moved (day/night works).
        let d1 = sun_direction(BodyId::Tenebris, 25.0);
        let dot = d0.x * d1.x + d0.y * d1.y + d0.z * d1.z;
        assert!(dot < 0.9, "sun barely moved over a quarter day: dot={dot}");
        // Half a full rotation: spin axis is +Y, so the horizontal
        // component should roughly invert.
        let dh = sun_direction(BodyId::Tenebris, 50.0);
        assert!(d0.x * dh.x + d0.z * dh.z < 0.0, "sun did not cross the sky");
    }

    #[test]
    fn sun_distance_scales_planets_not_moons() {
        setup();
        // The home world's heliocentric distance IS solar.yaml's
        // sun_distance_m (the whole point of the knob)...
        let d = dvec3_length(heliocentric_pos(BodyId::Tenebris, 0.0));
        assert!((d - 150_000.0).abs() < 1.0, "tenebris-star dist {d} != 150000");
        // ...other planets scale by the same factor (5x here), keeping the
        // system's shape. Sequoia is pinned at 200 km - the cooler sister
        // world sits 50 km farther out than home.
        let ds = dvec3_length(heliocentric_pos(BodyId::Sequoia, 0.0));
        assert!((ds - 200_000.0).abs() < 1.0, "sequoia dist {ds} != 200000");
        // ...while moons keep their tight structural parent orbits.
        let r = elements(BodyId::Luna).orbit_radius_m;
        let dl = dvec3_length(dvec3_sub(
            heliocentric_pos(BodyId::Luna, 0.0),
            heliocentric_pos(BodyId::Tenebris, 0.0),
        ));
        assert!((dl - r).abs() < 1.0, "luna orbit {dl} != structural {r}");
    }

    #[test]
    fn world_to_heliocentric_inverts_apparent_pos() {
        setup();
        // A body drawn at apparent_pos(active, body) must map back to its
        // own heliocentric position - the map marker and the sky agree.
        for &t in &[0.0, 37.0, 411.0] {
            for body in [BodyId::Luna, BodyId::Sequoia, BodyId::Frostbite] {
                let drawn = apparent_pos(BodyId::Tenebris, body, t);
                let back = world_to_heliocentric(BodyId::Tenebris, drawn, t);
                let truth = heliocentric_pos(body, t);
                let d = dvec3_length(dvec3_sub(back, truth));
                assert!(d < 1e-6, "{body:?} t={t}: roundtrip off by {d} m");
            }
        }
    }

    #[test]
    fn moon_rides_its_planet() {
        setup();
        // Luna's heliocentric position is always within orbit_radius of
        // Tenebris (it orbits the planet, not the star).
        let r = elements(BodyId::Luna).orbit_radius_m;
        for &t in &[0.0, 40.0, 120.0, 333.0] {
            let pt = heliocentric_pos(BodyId::Tenebris, t);
            let pl = heliocentric_pos(BodyId::Luna, t);
            let d = dvec3_length(dvec3_sub(pl, pt));
            assert!((d - r).abs() < 1.0, "luna-tenebris dist {d} != {r}");
        }
    }
}
