//! A jettisoned rocket stage falling back through the atmosphere.
//!
//! When the pilot stages away a spent booster, the shed part stack becomes a
//! tumbling ballistic body that reenters: gravity pulls it down, atmospheric
//! drag bleeds its speed, and aerodynamic heating lights a plasma sheath
//! around it. This module is the PURE integrator (gravity + drag + a
//! `sqrt(density) * speed^3` heating glow) so SP/MP and the headless tests
//! share it; the client owns spawn / impact / draw because those need the
//! `World` (land-vs-ocean at touchdown) and the drops system (the salvage).
//!
//! Air density is supplied by the caller in [0, 1] (1 = surface): the client
//! derives it from altitude against `reentry.max_alt_m`, so the plasma and the
//! drag live in the same atmosphere band the reentry streaks already use.

use crate::items::ItemId;
use crate::math::{dvec3_add, dvec3_cross, dvec3_dot, dvec3_length, dvec3_normalize, dvec3_scale, DVec3};
use crate::rocket::SalvageConstants;

/// One falling stage: the shed parts plus its ballistic + thermal state.
#[derive(Clone, Debug)]
pub struct FallingStage {
    /// The shed part stack (engine at index 0, on up), for the model + SDF.
    pub parts: Vec<ItemId>,
    /// World-space position of the stack CENTRE.
    pub pos: DVec3,
    pub vel: DVec3,
    /// Current stack orientation (unit), tumbling around `spin_axis`.
    pub axis: DVec3,
    /// Tumble axis (unit) and rate (rad/s).
    pub spin_axis: DVec3,
    pub spin_rate: f64,
    /// Smoothed aero-heating glow, 0 (cold) .. ~1.4 (white-hot shock).
    pub heat: f32,
    pub age_s: f32,
}

/// Rodrigues rotation of `v` about unit `axis` by `ang` radians.
fn rotate_about(v: DVec3, axis: DVec3, ang: f64) -> DVec3 {
    let (c, s) = (ang.cos(), ang.sin());
    dvec3_add(
        dvec3_add(dvec3_scale(v, c), dvec3_scale(dvec3_cross(axis, v), s)),
        dvec3_scale(axis, dvec3_dot(axis, v) * (1.0 - c)),
    )
}

impl FallingStage {
    pub fn new(
        parts: Vec<ItemId>,
        pos: DVec3,
        vel: DVec3,
        axis: DVec3,
        spin_axis: DVec3,
        spin_rate: f64,
    ) -> Self {
        FallingStage {
            parts,
            pos,
            vel,
            axis: dvec3_normalize(axis),
            spin_axis: dvec3_normalize(spin_axis),
            spin_rate,
            heat: 0.0,
            age_s: 0.0,
        }
    }

    /// Advance one physics step. `gravity` is the local orbital acceleration
    /// vector (m/s^2), `air_density` in [0, 1] (1 = surface). Both come from
    /// the caller (the client reads them off `planet` + altitude).
    pub fn step(&mut self, dt: f32, gravity: DVec3, air_density: f32, k: &SalvageConstants) {
        let dtf = dt as f64;
        let speed = dvec3_length(self.vel);
        let rho = air_density.clamp(0.0, 1.0) as f64;

        /* Gravity, then a quadratic drag applied as an exponential damp so it
         * stays stable at any speed/step: v *= exp(-drag_coef * rho * v * dt). */
        self.vel = dvec3_add(self.vel, dvec3_scale(gravity, dtf));
        let damp = (-(k.drag_coef as f64) * rho * speed * dtf).exp();
        self.vel = dvec3_scale(self.vel, damp);
        self.pos = dvec3_add(self.pos, dvec3_scale(self.vel, dtf));

        self.axis = dvec3_normalize(rotate_about(self.axis, self.spin_axis, self.spin_rate * dtf));
        self.age_s += dt;

        /* Aero-heating glow: convective flux proxy q ~ sqrt(rho) * v^3,
         * normalised to `heat_ref`, smoothed with a fast attack (plunging in)
         * and a slow decay (cooling once it slows / thins out). */
        let q = rho.sqrt() * speed * speed * speed;
        let target = (q / k.heat_ref as f64).clamp(0.0, 1.4) as f32;
        let rate = if target > self.heat { k.heat_attack } else { k.heat_decay };
        self.heat += (target - self.heat) * (rate * dt).min(1.0);
    }

    /// Current speed (m/s).
    pub fn speed(&self) -> f64 {
        dvec3_length(self.vel)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::items::FUEL_TANK;
    use crate::math::dvec3_make;
    use crate::rocket::config;

    fn stage_at(vel: DVec3) -> FallingStage {
        FallingStage::new(
            vec![FUEL_TANK],
            dvec3_make(0.0, 0.0, 0.0),
            vel,
            dvec3_make(0.0, 1.0, 0.0),
            dvec3_make(1.0, 0.0, 0.0),
            1.0,
        )
    }

    #[test]
    fn drag_bleeds_speed_in_thick_air() {
        let k = config().salvage;
        let mut s = stage_at(dvec3_make(200.0, 0.0, 0.0));
        let v0 = s.speed();
        /* No gravity, thick air: pure drag must slow it. */
        for _ in 0..60 {
            s.step(1.0 / 60.0, dvec3_make(0.0, 0.0, 0.0), 1.0, &k);
        }
        assert!(s.speed() < v0, "drag slows the stage ({} -> {})", v0, s.speed());
    }

    #[test]
    fn vacuum_coasts_without_drag() {
        let k = config().salvage;
        let mut s = stage_at(dvec3_make(200.0, 0.0, 0.0));
        let v0 = s.speed();
        /* No air (density 0): drag is off, speed holds. */
        for _ in 0..60 {
            s.step(1.0 / 60.0, dvec3_make(0.0, 0.0, 0.0), 0.0, &k);
        }
        assert!((s.speed() - v0).abs() < 1e-6, "no drag in vacuum");
    }

    #[test]
    fn heat_ramps_with_speed_and_density() {
        let k = config().salvage;
        /* Fast plunge through thick air lights up; a slow drift through thin
         * air (sqrt(density) * speed^3 both small) barely glows. */
        let mut hot = stage_at(dvec3_make(160.0, 0.0, 0.0));
        let mut cold = stage_at(dvec3_make(40.0, 0.0, 0.0));
        for _ in 0..30 {
            hot.step(1.0 / 60.0, dvec3_make(0.0, 0.0, 0.0), 1.0, &k);
            cold.step(1.0 / 60.0, dvec3_make(0.0, 0.0, 0.0), 0.05, &k);
        }
        assert!(hot.heat > 0.4, "hot reentry glows ({})", hot.heat);
        assert!(cold.heat < 0.1, "slow drift in thin air stays cool ({})", cold.heat);
    }

    #[test]
    fn heat_decays_when_it_cools() {
        let k = config().salvage;
        let mut s = stage_at(dvec3_make(160.0, 0.0, 0.0));
        for _ in 0..30 {
            s.step(1.0 / 60.0, dvec3_make(0.0, 0.0, 0.0), 1.0, &k);
        }
        let peak = s.heat;
        /* Now it has slowed / thinned - glow must fall back off. */
        s.vel = dvec3_make(5.0, 0.0, 0.0);
        for _ in 0..120 {
            s.step(1.0 / 60.0, dvec3_make(0.0, 0.0, 0.0), 0.0, &k);
        }
        assert!(s.heat < peak * 0.5, "glow cools ({} -> {})", peak, s.heat);
    }

    #[test]
    fn gravity_accelerates_downward() {
        let k = config().salvage;
        let mut s = stage_at(dvec3_make(0.0, 0.0, 0.0));
        s.step(1.0, dvec3_make(0.0, -25.0, 0.0), 0.0, &k);
        assert!(s.vel.y < -20.0, "gravity pulls it down ({})", s.vel.y);
    }
}
