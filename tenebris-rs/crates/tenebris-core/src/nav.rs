//! Orbital navigation math - the two-body conic a rocket's state implies.
//!
//! Core, because SP and MP fly the same physics and the numbers on the nav
//! HUD (apoapsis, periapsis, period) must agree with what the integrator
//! will actually do.
//!
//! The gravity field (`planet::orbital_gravity_at`) is a SUM over every
//! body, so no closed-form orbit is exact. But the bodies are parked -
//! nothing moves except the station - and at any point one body utterly
//! dominates the field (they're thousands of radii apart), so the two-body
//! conic around the [`dominant_body`] is the trajectory to within a hair.
//! That's also exactly the KSP idiom the nav UI wants: one focus body, one
//! ellipse, and a handover when a moon's pull takes over ("entering its
//! sphere of influence" = it became the dominant body).

use crate::math::{
    dvec3_add, dvec3_cross, dvec3_dot, dvec3_length, dvec3_make, dvec3_normalize, dvec3_scale,
    dvec3_sub, DVec3,
};
use crate::planet::{self, BodyConfig};

/// Gravitational parameter GM of a body: the field anchors surface gravity
/// at the surface, so mu = g_surf * R^2 (the same identity Kepler's law
/// falls out of in `station::orbit_speed_mps`).
pub fn mu(body: &BodyConfig) -> f64 {
    (planet::SURFACE_GRAVITY_MPS2_PER_G * body.gravity_g) as f64 * body.radius_m * body.radius_m
}

/// The body whose field is strongest at `pos` - the de-facto sphere of
/// influence. Ties are impossible in practice (fields fall off as 1/d^2
/// and the bodies are thousands of radii apart).
pub fn dominant_body(pos: DVec3) -> BodyConfig {
    let mut best = planet::get(planet::BodyId::Tenebris);
    let mut best_a = -1.0f64;
    for i in 0..planet::BODY_COUNT as i32 {
        let Some(b) = planet::get_by_index(i) else { continue };
        let d = dvec3_sub(dvec3_make(b.pos_x, b.pos_y, b.pos_z), pos);
        let d2 = dvec3_dot(d, d).max((b.radius_m * 0.5) * (b.radius_m * 0.5));
        let a = mu(&b) / d2;
        if a > best_a {
            best_a = a;
            best = b;
        }
    }
    best
}

/// A two-body conic section: the orbit the current state implies around
/// its focus body. Ellipse when bound (e < 1), hyperbola when not.
#[derive(Clone, Copy, Debug)]
pub struct Conic {
    /// Focus body's centre, world space.
    pub focus: DVec3,
    /// Focus body's GM.
    pub mu: f64,
    /// Semi-major axis, metres (negative for a hyperbola).
    pub a: f64,
    /// Eccentricity (0 circle .. <1 ellipse .. >=1 escape).
    pub e: f64,
    /// Closest approach, metres FROM THE FOCUS CENTRE (not altitude).
    pub periapsis_m: f64,
    /// Farthest point from the focus centre; `INFINITY` when unbound.
    pub apoapsis_m: f64,
    /// Orbital period, seconds; `INFINITY` when unbound.
    pub period_s: f64,
    /// Unit vector focus -> periapsis, in the orbit plane.
    pub p_hat: DVec3,
    /// Unit vector in-plane, 90 deg ahead of periapsis (direction of
    /// motion at periapsis).
    pub q_hat: DVec3,
}

impl Conic {
    /// The conic implied by (position, velocity) around `body`. `None` for
    /// a degenerate radial trajectory (straight up/down: the angular
    /// momentum is ~0 and there is no orbit plane to draw).
    pub fn from_state(body: &BodyConfig, pos: DVec3, vel: DVec3) -> Option<Conic> {
        let focus = dvec3_make(body.pos_x, body.pos_y, body.pos_z);
        let mu = mu(body);
        let r_vec = dvec3_sub(pos, focus);
        let r = dvec3_length(r_vec);
        if r < 1e-6 {
            return None;
        }
        let v2 = dvec3_dot(vel, vel);

        /* Specific angular momentum. Near-zero = radial launch, no plane. */
        let h_vec = dvec3_cross(r_vec, vel);
        let h2 = dvec3_dot(h_vec, h_vec);
        /* Threshold: the plane is meaningless when the tangential speed is
         * under ~1% of circular at this radius. */
        let v_circ2 = mu / r;
        if h2 < r * r * v_circ2 * 1e-4 {
            return None;
        }

        /* Eccentricity vector: e = (v x h)/mu - r_hat. Points at periapsis. */
        let vxh = dvec3_cross(vel, h_vec);
        let e_vec = dvec3_sub(dvec3_scale(vxh, 1.0 / mu), dvec3_scale(r_vec, 1.0 / r));
        let e = dvec3_length(e_vec);

        /* Vis-viva: 1/a = 2/r - v^2/mu. a < 0 for hyperbolic. */
        let inv_a = 2.0 / r - v2 / mu;
        let a = if inv_a.abs() < 1e-12 { f64::INFINITY } else { 1.0 / inv_a };

        /* In-plane basis. A perfectly circular orbit has no periapsis -
         * e_vec ~ 0 - so fall back to the current radial direction, which
         * is as good a theta=0 as any on a circle. */
        let h_hat = dvec3_scale(h_vec, 1.0 / h2.sqrt());
        let p_hat = if e > 1e-6 {
            dvec3_scale(e_vec, 1.0 / e)
        } else {
            dvec3_normalize(r_vec)
        };
        let q_hat = dvec3_normalize(dvec3_cross(h_hat, p_hat));

        let bound = e < 1.0 && a.is_finite() && a > 0.0;
        let (apoapsis_m, period_s) = if bound {
            (a * (1.0 + e), std::f64::consts::TAU * (a * a * a / mu).sqrt())
        } else {
            (f64::INFINITY, f64::INFINITY)
        };
        let periapsis_m = if bound {
            a * (1.0 - e)
        } else {
            /* Hyperbolic/parabolic: p/(1+e) via the semi-latus rectum. */
            (h2 / mu) / (1.0 + e)
        };

        Some(Conic { focus, mu, a, e, periapsis_m, apoapsis_m, period_s, p_hat, q_hat })
    }

    /// Sample the conic into `n` world-space points for a polyline.
    ///
    /// Ellipse: the full loop (closed - the last point meets the first).
    /// Hyperbola: the arc around periapsis clipped at `r_max` from the
    /// focus, so an escape trajectory doesn't draw off to infinity.
    pub fn sample(&self, n: usize, r_max: f64) -> Vec<DVec3> {
        let n = n.max(8);
        let p = self.periapsis_m * (1.0 + self.e); /* semi-latus rectum */
        let mut out = Vec::with_capacity(n + 1);
        if self.e < 1.0 {
            for i in 0..=n {
                let th = i as f64 / n as f64 * std::f64::consts::TAU;
                let r = p / (1.0 + self.e * th.cos());
                out.push(self.point_at(r, th));
            }
        } else {
            /* True anomaly where r hits r_max: cos(th) = (p/r - 1)/e. */
            let c = ((p / r_max - 1.0) / self.e).clamp(-1.0, 1.0);
            let th_max = c.acos();
            for i in 0..=n {
                let th = -th_max + i as f64 / n as f64 * (2.0 * th_max);
                let r = p / (1.0 + self.e * th.cos());
                out.push(self.point_at(r, th));
            }
        }
        out
    }

    fn point_at(&self, r: f64, theta: f64) -> DVec3 {
        dvec3_add(
            self.focus,
            dvec3_add(
                dvec3_scale(self.p_hat, r * theta.cos()),
                dvec3_scale(self.q_hat, r * theta.sin()),
            ),
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::planet::BodyId;

    fn tenebris() -> BodyConfig {
        planet::get(BodyId::Tenebris)
    }

    /// A circular orbit's elements: a = r, e ~ 0, and the period matches
    /// the station's Kepler-derived one at the same radius (10 km -> the
    /// pinned ~4188.8 s).
    #[test]
    fn circular_orbit_matches_the_station_track() {
        let b = tenebris();
        let r = 10_000.0;
        let v = (mu(&b) / r).sqrt();
        let pos = dvec3_make(r, 0.0, 0.0);
        let vel = dvec3_make(0.0, 0.0, v);
        let c = Conic::from_state(&b, pos, vel).expect("circular is not degenerate");
        assert!((c.a - r).abs() < 1e-6 * r, "a {} != r {}", c.a, r);
        assert!(c.e < 1e-9, "e {} should be ~0", c.e);
        assert!((c.period_s - 4188.79).abs() < 0.05, "period {}", c.period_s);
        assert!((c.apoapsis_m - r).abs() < 1e-3);
        assert!((c.periapsis_m - r).abs() < 1e-3);
    }

    /// Slower than circular at r: the start point IS apoapsis and the
    /// periapsis drops below r.
    #[test]
    fn subcircular_speed_makes_the_start_the_apoapsis() {
        let b = tenebris();
        let r = 10_000.0;
        let v = 0.9 * (mu(&b) / r).sqrt();
        let c = Conic::from_state(&b, dvec3_make(r, 0.0, 0.0), dvec3_make(0.0, 0.0, v)).unwrap();
        assert!(c.e > 0.0 && c.e < 1.0);
        assert!((c.apoapsis_m - r).abs() < 1e-3 * r, "apoapsis {} != {}", c.apoapsis_m, r);
        assert!(c.periapsis_m < r);
        /* Ap/Pe sit on the sampled line. */
        let pts = c.sample(256, 1e9);
        let max_r = pts.iter().map(|p| dvec3_length(dvec3_sub(*p, c.focus))).fold(0.0, f64::max);
        assert!((max_r - c.apoapsis_m).abs() < c.apoapsis_m * 1e-3);
    }

    /// Past escape velocity the conic goes hyperbolic: e > 1, no period,
    /// and the sampled arc respects the clip radius.
    #[test]
    fn escape_velocity_goes_hyperbolic() {
        let b = tenebris();
        let r = 10_000.0;
        let v = 1.5 * (2.0 * mu(&b) / r).sqrt();
        let c = Conic::from_state(&b, dvec3_make(r, 0.0, 0.0), dvec3_make(0.0, 0.0, v)).unwrap();
        assert!(c.e > 1.0, "e {}", c.e);
        assert!(c.period_s.is_infinite());
        assert!(c.apoapsis_m.is_infinite());
        let pts = c.sample(64, 15_000.0);
        for p in &pts {
            let d = dvec3_length(dvec3_sub(*p, c.focus));
            assert!(d <= 15_000.0 * 1.01, "sample at {d} escaped the clip");
        }
    }

    /// Straight up is not an orbit - no plane, no conic, no line to draw.
    #[test]
    fn radial_launch_is_degenerate() {
        let b = tenebris();
        let c = Conic::from_state(&b, dvec3_make(310.0, 0.0, 0.0), dvec3_make(50.0, 0.0, 0.0));
        assert!(c.is_none());
    }

    /// The SOI handover: Tenebris owns its space until you get close to
    /// Luna, then Luna's field wins. This is what re-focuses the drawn
    /// orbit when a transfer arrives.
    #[test]
    fn dominant_body_hands_over_near_luna() {
        assert_eq!(dominant_body(dvec3_make(0.0, 3_000.0, 0.0)).name, "Tenebris");
        assert_eq!(dominant_body(dvec3_make(0.0, 5_900.0, 0.0)).name, "Luna");
        assert_eq!(dominant_body(dvec3_make(400.0, 0.0, 0.0)).name, "Tenebris");
    }

    /// Every sampled ellipse point satisfies the conic equation - the line
    /// we draw is the orbit, not an approximation of one.
    #[test]
    fn sampled_points_lie_on_the_conic() {
        let b = tenebris();
        let r = 8_000.0;
        let v = 1.1 * (mu(&b) / r).sqrt();
        let c = Conic::from_state(&b, dvec3_make(r, 0.0, 0.0), dvec3_make(0.0, 40.0, v)).unwrap();
        let p = c.periapsis_m * (1.0 + c.e);
        for pt in c.sample(128, 1e9) {
            let rel = dvec3_sub(pt, c.focus);
            let rr = dvec3_length(rel);
            let cos_th = dvec3_dot(dvec3_normalize(rel), c.p_hat).clamp(-1.0, 1.0);
            let expect = p / (1.0 + c.e * cos_th);
            assert!((rr - expect).abs() < 1e-6 * rr.max(1.0), "r {} vs conic {}", rr, expect);
        }
    }
}
