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
    /// True anomaly (rad) of the state this conic was built FROM - the
    /// epoch for [`Conic::state_at`] time propagation. Angle from periapsis
    /// (`p_hat`) toward the direction of motion (`q_hat`).
    pub nu0: f64,
}

impl Conic {
    /// The conic implied by (position, velocity) around `body`. `None` for
    /// a degenerate radial trajectory (straight up/down: the angular
    /// momentum is ~0 and there is no orbit plane to draw).
    pub fn from_state(body: &BodyConfig, pos: DVec3, vel: DVec3) -> Option<Conic> {
        let focus = dvec3_make(body.pos_x, body.pos_y, body.pos_z);
        Self::from_state_around(focus, mu(body), pos, vel)
    }

    /// Same as [`Conic::from_state`] but around an explicit focus centre and
    /// GM. Lets a PREDICTED post-burn orbit be built around the current
    /// dominant body without threading a `BodyConfig` through the planner.
    pub fn from_state_around(focus: DVec3, mu: f64, pos: DVec3, vel: DVec3) -> Option<Conic> {
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

        /* Current true anomaly: angle of r from periapsis (p_hat) toward the
         * direction of motion (q_hat). The epoch state_at() propagates from. */
        let nu0 = dvec3_dot(r_vec, q_hat).atan2(dvec3_dot(r_vec, p_hat));

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

        Some(Conic { focus, mu, a, e, periapsis_m, apoapsis_m, period_s, p_hat, q_hat, nu0 })
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

    /// World-space (position, velocity) `dt` seconds after the epoch this
    /// conic was built from (`dt` may be negative). This is the Kepler
    /// propagation the maneuver planner needs to place a burn node at a
    /// future point on the orbit. `None` if the conic can't be advanced
    /// (parabolic, or the state can't be solved).
    ///
    /// Ellipse: mean anomaly advances linearly (M += n*dt), then Kepler's
    /// equation is solved for the eccentric anomaly. Hyperbola: the same via
    /// the hyperbolic anomaly. The perifocal (position, velocity) then come
    /// straight from the stored `p_hat` / `q_hat` basis.
    pub fn state_at(&self, dt: f64) -> Option<(DVec3, DVec3)> {
        let e = self.e;
        let mu = self.mu;
        /* Semi-latus rectum - same value sample() uses, avoids the a-sign
         * branch and works for both conic families. */
        let p = self.periapsis_m * (1.0 + e);
        if !(p.is_finite() && p > 0.0) || !mu.is_finite() {
            return None;
        }

        let nu = if e < 1.0 {
            /* --- Ellipse. --- */
            if !self.period_s.is_finite() || self.period_s <= 0.0 {
                return None;
            }
            let n = std::f64::consts::TAU / self.period_s; /* mean motion */
            /* True -> eccentric -> mean at the epoch. */
            let e0 = 2.0 * ((1.0 - e).sqrt() * (self.nu0 * 0.5).sin())
                .atan2((1.0 + e).sqrt() * (self.nu0 * 0.5).cos());
            let m0 = e0 - e * e0.sin();
            let m = m0 + n * dt;
            /* Kepler M = E - e sin E, Newton from E = M (converges fast for
             * moderate e; our orbits are low-e transfer ellipses). */
            let mut ea = m;
            for _ in 0..48 {
                let f = ea - e * ea.sin() - m;
                let fp = 1.0 - e * ea.cos();
                let d = f / fp;
                ea -= d;
                if d.abs() < 1e-12 {
                    break;
                }
            }
            2.0 * ((1.0 + e).sqrt() * (ea * 0.5).sin())
                .atan2((1.0 - e).sqrt() * (ea * 0.5).cos())
        } else {
            /* --- Hyperbola. --- a is negative; mean motion uses |a|^3. */
            let a_abs = self.a.abs();
            if !a_abs.is_finite() || a_abs <= 0.0 {
                return None;
            }
            let n = (mu / (a_abs * a_abs * a_abs)).sqrt();
            /* True -> hyperbolic anomaly at the epoch (only valid inside the
             * asymptote |nu| < acos(-1/e); tan(H/2) uses the same identity). */
            let k = ((e - 1.0) / (e + 1.0)).sqrt();
            let t0 = k * (self.nu0 * 0.5).tan();
            if t0.abs() >= 1.0 {
                return None; /* epoch is past the asymptote - no finite anomaly */
            }
            let h0 = 2.0 * t0.atanh();
            let m0 = e * h0.sinh() - h0;
            let m = m0 + n * dt;
            /* Solve M = e sinh H - H, Newton from H0 (a decent seed). */
            let mut h = if m.abs() > 6.0 { m.signum() * (m.abs() / e).ln().max(1.0) } else { m };
            for _ in 0..64 {
                let f = e * h.sinh() - h - m;
                let fp = e * h.cosh() - 1.0;
                let d = f / fp;
                h -= d;
                if d.abs() < 1e-12 {
                    break;
                }
            }
            2.0 * ((e + 1.0).sqrt() * (h * 0.5).sinh())
                .atan2((e - 1.0).sqrt() * (h * 0.5).cosh())
        };

        if !nu.is_finite() {
            return None;
        }
        let r = p / (1.0 + e * nu.cos());
        let pos = self.point_at(r, nu);
        /* Perifocal velocity: sqrt(mu/p) * [ -sin nu P + (e + cos nu) Q ]. */
        let s = (mu / p).sqrt();
        let vel = dvec3_add(
            dvec3_scale(self.p_hat, -s * nu.sin()),
            dvec3_scale(self.q_hat, s * (e + nu.cos())),
        );
        /* Never hand back non-finite state: a diverged Kepler/hyperbolic
         * solve would otherwise flow into node geometry and rasterize as a
         * black NaN blob over the HUD. Callers treat None as "no node". */
        if !(r.is_finite()
            && pos.x.is_finite()
            && pos.y.is_finite()
            && pos.z.is_finite()
            && vel.x.is_finite()
            && vel.y.is_finite()
            && vel.z.is_finite())
        {
            return None;
        }
        Some((pos, vel))
    }
}

/// Prograde / orbit-normal / radial-out unit basis at a state - the axes a
/// maneuver node's delta-v is expressed in (the KSP navball convention, and
/// the same markers `nav_ui`'s navball already draws). Radial-out points
/// away from the focus, in-plane, perpendicular to velocity.
pub fn burn_basis(focus: DVec3, pos: DVec3, vel: DVec3) -> (DVec3, DVec3, DVec3) {
    let prograde = dvec3_normalize(vel);
    let normal = dvec3_normalize(dvec3_cross(dvec3_sub(pos, focus), vel));
    let radial_out = dvec3_normalize(dvec3_cross(prograde, normal));
    (prograde, normal, radial_out)
}

/// A planned burn: where the node sits on the current orbit, the delta-v
/// applied there, and the orbit it produces.
#[derive(Clone, Debug)]
pub struct BurnPlan {
    /// World position of the node (where the burn happens).
    pub node_pos: DVec3,
    /// World velocity at the node BEFORE the burn.
    pub node_vel: DVec3,
    /// Total delta-v vector applied at the node, world space.
    pub dv_world: DVec3,
    /// Required delta-v magnitude (m/s) = |dv_world|.
    pub dv_total: f64,
    /// Burn axes at the node.
    pub prograde: DVec3,
    pub normal: DVec3,
    pub radial_out: DVec3,
    /// The orbit that results from the burn, around the SAME focus body.
    /// `None` when the post-burn state is degenerate (purely radial).
    pub after: Option<Conic>,
}

/// Plan a burn `dt_node` seconds ahead on `current`, adding the given
/// delta-v components (prograde / normal / radial-out, m/s) at that point.
/// Returns the node geometry, the required delta-v, and the predicted orbit
/// around the same focus body. `None` if the node point can't be reached
/// (e.g. a parabolic/unsolvable conic).
pub fn plan_burn(
    current: &Conic,
    dt_node: f64,
    dv_pro: f64,
    dv_nrm: f64,
    dv_rad: f64,
) -> Option<BurnPlan> {
    let (node_pos, node_vel) = current.state_at(dt_node)?;
    let (prograde, normal, radial_out) = burn_basis(current.focus, node_pos, node_vel);
    let dv_world = dvec3_add(
        dvec3_add(dvec3_scale(prograde, dv_pro), dvec3_scale(normal, dv_nrm)),
        dvec3_scale(radial_out, dv_rad),
    );
    /* Orthonormal basis, so the magnitude is exactly the RSS of the
     * components - the "delta-v you need" for this node. */
    let dv_total = (dv_pro * dv_pro + dv_nrm * dv_nrm + dv_rad * dv_rad).sqrt();
    let vel_after = dvec3_add(node_vel, dv_world);
    let after = Conic::from_state_around(current.focus, current.mu, node_pos, vel_after);
    Some(BurnPlan { node_pos, node_vel, dv_world, dv_total, prograde, normal, radial_out, after })
}

/// Available delta-v (m/s) from the rocket equation: `ve * ln(m_wet / m_dry)`.
/// `exhaust_mps` is the effective exhaust velocity (Isp * g0); `wet_kg` is the
/// current total mass, `dry_kg` the propellant-empty mass. Zero when there is
/// no propellant or the inputs are degenerate - so the HUD can show "0 m/s"
/// on an empty tank rather than a NaN.
pub fn available_dv(exhaust_mps: f64, wet_kg: f64, dry_kg: f64) -> f64 {
    if exhaust_mps <= 0.0 || dry_kg <= 0.0 || wet_kg <= dry_kg {
        return 0.0;
    }
    exhaust_mps * (wet_kg / dry_kg).ln()
}

/* -------------------------- attitude autopilot ------------------------- */
/* A KSP-SAS-style controller that points the ship's nose at a chosen        */
/* direction (prograde, target, maneuver, ...). The plant here is kinematic  */
/* - the client steers by rotating the basis directly, no angular momentum   */
/* - so this is a PID whose output is a COMMANDED ANGULAR VELOCITY (world     */
/* axes) that the caller integrates into the basis. Kp turns toward the      */
/* target, Kd damps against the closing rate so it settles instead of        */
/* ringing, Ki trims any residual. Gains live in rocket.yaml (flight.*).     */

/// PID gains + the rate clamp for the attitude autopilot.
#[derive(Clone, Copy, Debug)]
pub struct AttGains {
    pub kp: f64,
    pub ki: f64,
    pub kd: f64,
    /// Hard cap on |omega| (rad/s), so the ship can't spin faster than its
    /// manual steer rate.
    pub max_rate: f64,
}

/// Mutable PID state carried between frames by the caller.
#[derive(Clone, Copy, Debug, Default)]
pub struct AttPidState {
    pub integ: DVec3,
    pub prev_err: DVec3,
    pub have_prev: bool,
}

impl AttPidState {
    pub fn reset(&mut self) {
        *self = AttPidState::default();
    }
}

/// Rotation vector (axis * angle, world space, radians) that turns `nose`
/// onto `target`. Zero when aligned; magnitude is the angle between them.
/// Antiparallel picks an arbitrary perpendicular axis for a half-turn so the
/// controller doesn't stall at exactly 180 deg.
pub fn attitude_error(nose: DVec3, target: DVec3) -> DVec3 {
    let c = dvec3_dot(nose, target).clamp(-1.0, 1.0);
    let axis = dvec3_cross(nose, target);
    let s = dvec3_length(axis);
    if s < 1e-9 {
        if c > 0.0 {
            return dvec3_make(0.0, 0.0, 0.0);
        }
        let seed = if nose.x.abs() < 0.9 {
            dvec3_make(1.0, 0.0, 0.0)
        } else {
            dvec3_make(0.0, 1.0, 0.0)
        };
        let a = dvec3_normalize(dvec3_cross(nose, seed));
        return dvec3_scale(a, std::f64::consts::PI);
    }
    let angle = s.atan2(c);
    dvec3_scale(axis, angle / s)
}

/// One PID step: commanded angular velocity (world axes) to null `err`,
/// updating the integral + previous-error state in place. |omega| is clamped
/// to `g.max_rate`. `dt` in seconds.
pub fn attitude_pid_step(g: AttGains, st: &mut AttPidState, err: DVec3, dt: f64) -> DVec3 {
    /* Integral with anti-windup clamp (per component). */
    st.integ = dvec3_add(st.integ, dvec3_scale(err, dt));
    let imax = 0.5;
    st.integ = dvec3_make(
        st.integ.x.clamp(-imax, imax),
        st.integ.y.clamp(-imax, imax),
        st.integ.z.clamp(-imax, imax),
    );
    let deriv = if st.have_prev && dt > 1e-6 {
        dvec3_scale(dvec3_sub(err, st.prev_err), 1.0 / dt)
    } else {
        dvec3_make(0.0, 0.0, 0.0)
    };
    st.prev_err = err;
    st.have_prev = true;
    let mut omega = dvec3_add(
        dvec3_add(dvec3_scale(err, g.kp), dvec3_scale(st.integ, g.ki)),
        dvec3_scale(deriv, g.kd),
    );
    let mag = dvec3_length(omega);
    if mag > g.max_rate {
        omega = dvec3_scale(omega, g.max_rate / mag);
    }
    omega
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::planet::BodyId;

    fn tenebris() -> BodyConfig {
        planet::get(BodyId::Tenebris)
    }

    /// The attitude error is zero when aligned and equals the between-angle
    /// otherwise, with an axis perpendicular to both.
    #[test]
    fn attitude_error_is_zero_aligned_and_the_between_angle_otherwise() {
        let x = dvec3_make(1.0, 0.0, 0.0);
        let y = dvec3_make(0.0, 1.0, 0.0);
        assert!(dvec3_length(attitude_error(x, x)) < 1e-9);
        let e = attitude_error(x, y);
        assert!((dvec3_length(e) - std::f64::consts::FRAC_PI_2).abs() < 1e-9);
        /* axis is +z (x cross y). */
        assert!((dvec3_normalize(e).z - 1.0).abs() < 1e-6);
    }

    /// The PID drives the nose onto the target under the game's kinematic
    /// plant (rate command integrated straight into the orientation), and
    /// settles there without running away.
    #[test]
    fn attitude_pid_converges_and_holds() {
        let g = AttGains { kp: 4.0, ki: 0.0, kd: 1.2, max_rate: 0.9 };
        let mut st = AttPidState::default();
        let mut nose = dvec3_make(1.0, 0.0, 0.0);
        let target = dvec3_normalize(dvec3_make(0.1, 1.0, 0.2));
        let dt = 1.0 / 60.0;
        for _ in 0..1200 {
            let err = attitude_error(nose, target);
            let omega = attitude_pid_step(g, &mut st, err, dt);
            /* Rotate the nose by omega*dt (Rodrigues) - the kinematic plant. */
            let ang = dvec3_length(omega) * dt;
            if ang > 1e-12 {
                let axis = dvec3_scale(omega, 1.0 / dvec3_length(omega));
                let (s, c) = (ang.sin(), ang.cos());
                let cross = dvec3_cross(axis, nose);
                let dot = dvec3_dot(axis, nose);
                nose = dvec3_add(
                    dvec3_add(dvec3_scale(nose, c), dvec3_scale(cross, s)),
                    dvec3_scale(axis, dot * (1.0 - c)),
                );
                nose = dvec3_normalize(nose);
            }
        }
        /* Converges onto the target and holds there (within a few degrees;
         * the exact deadband is a gain-tuning detail confirmed in-game). */
        assert!(dvec3_dot(nose, target) > 0.995, "cos={}", dvec3_dot(nose, target));
    }

    /// Propagating zero seconds returns the state the conic was built from -
    /// the epoch round-trips through nu0.
    #[test]
    fn state_at_zero_round_trips_the_epoch() {
        let b = tenebris();
        let r = 9_000.0;
        let v = 1.15 * (mu(&b) / r).sqrt(); /* elliptical */
        let pos = dvec3_make(r, 0.0, 0.0);
        let vel = dvec3_make(0.0, 30.0, v);
        let c = Conic::from_state(&b, pos, vel).unwrap();
        let (p0, v0) = c.state_at(0.0).unwrap();
        assert!(dvec3_length(dvec3_sub(p0, pos)) < 1e-3 * r, "pos round-trip");
        assert!(
            dvec3_length(dvec3_sub(v0, vel)) < 1e-3 * dvec3_length(vel),
            "vel round-trip"
        );
    }

    /// Half a period around a circle lands on the antipode with the velocity
    /// reversed - the Kepler propagation actually walks the orbit.
    #[test]
    fn state_at_half_period_is_antipodal_on_a_circle() {
        let b = tenebris();
        let r = 10_000.0;
        let v = (mu(&b) / r).sqrt();
        let pos = dvec3_make(r, 0.0, 0.0);
        let vel = dvec3_make(0.0, 0.0, v);
        let c = Conic::from_state(&b, pos, vel).unwrap();
        let (p_half, v_half) = c.state_at(c.period_s * 0.5).unwrap();
        /* Focus at the origin (Tenebris): antipode is -pos. */
        assert!(dvec3_length(dvec3_add(p_half, dvec3_sub(pos, c.focus))) < 1e-2 * r);
        assert!(dvec3_length(dvec3_add(v_half, vel)) < 1e-2 * v);
    }

    /// A prograde burn on a circular orbit raises apoapsis, keeps periapsis,
    /// and reports its magnitude as the required delta-v.
    #[test]
    fn prograde_burn_raises_apoapsis_and_reports_its_dv() {
        let b = tenebris();
        let r = 10_000.0;
        let v = (mu(&b) / r).sqrt();
        let c = Conic::from_state(&b, dvec3_make(r, 0.0, 0.0), dvec3_make(0.0, 0.0, v)).unwrap();
        let plan = plan_burn(&c, 0.0, 50.0, 0.0, 0.0).unwrap();
        assert!((plan.dv_total - 50.0).abs() < 1e-9);
        let after = plan.after.unwrap();
        assert!(
            after.apoapsis_m > c.apoapsis_m + 1.0,
            "ap {} should exceed {}",
            after.apoapsis_m,
            c.apoapsis_m
        );
        assert!((after.periapsis_m - r).abs() < 0.05 * r, "pe {} ~ r {}", after.periapsis_m, r);
    }

    /// Available delta-v is Tsiolkovsky, and degenerate tanks read 0 (not NaN).
    #[test]
    fn available_dv_is_the_rocket_equation() {
        let dv = available_dv(3000.0, 2000.0, 1000.0);
        assert!((dv - 3000.0 * 2.0f64.ln()).abs() < 1e-6);
        assert_eq!(available_dv(3000.0, 1000.0, 1000.0), 0.0); /* empty tank */
        assert_eq!(available_dv(0.0, 2000.0, 1000.0), 0.0); /* no engine */
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
