//! Client-side registry of jettisoned rocket stages tumbling back to the
//! surface (space era salvage). The BALLISTIC + heating model is Core
//! ([`tenebris_core::falling_stage::FallingStage`]); this module owns the live
//! list, steps it against the world (orbital gravity + an atmosphere-band air
//! density), and resolves the impact - because that needs the `World` (the
//! land-vs-ocean call) and the drops system (the salvage):
//!
//! - LAND impact: the stage slams in and shatters, leaving a few metal scraps
//!   (`IRON`) to walk over and recover.
//! - OCEAN splashdown: the stage floats intact - every part drops back,
//!   completely recoverable.
//!
//! Same pattern as `rocket_ride` / `drops`: a thread-local the physics step
//! and the renderers reach through free functions. Stepped once per frame from
//! `app`, drawn as tumbling part models (`rocket_fx`) wrapped in the plasma
//! shell (`reentry_fx`).

use std::cell::RefCell;

use tenebris_core::blocks;
use tenebris_core::falling_stage::FallingStage;
use tenebris_core::items::{ItemId, IRON};
use tenebris_core::math::{
    dvec3_add, dvec3_cross, dvec3_length, dvec3_make, dvec3_normalize, dvec3_scale, dvec3_sub, DVec3,
};
use tenebris_core::planet;
use tenebris_core::rocket;
use tenebris_core::world::{World, WORLD_MAX_DEPTH};

use crate::drops;

thread_local! {
    static LIST: RefCell<Vec<FallingStage>> = const { RefCell::new(Vec::new()) };
    /// Cheap deterministic counter for scrap-count / spin variety (no rng /
    /// Date; index-varied like the rest of the FX).
    static SEQ: std::cell::Cell<u32> = const { std::cell::Cell::new(0) };
}

/// A snapshot of one falling stage for the renderers (models + plasma shell).
pub struct StageView {
    pub center: DVec3,
    pub axis: DVec3,
    pub flow: DVec3,
    pub parts: Vec<u16>,
    pub heat: f32,
}

/// Jettison a shed stack into a falling body at `pos` moving at `vel`. `axis`
/// is the stack's up direction at release; it tumbles from there.
pub fn spawn(parts: Vec<ItemId>, pos: DVec3, vel: DVec3, axis: DVec3) {
    if parts.is_empty() {
        return;
    }
    let seq = SEQ.with(|c| {
        let v = c.get();
        c.set(v.wrapping_add(1));
        v
    });
    /* A tumble axis roughly perpendicular to the stack, varied per spawn. */
    let a = dvec3_normalize(axis);
    let seed = (seq as f64) * 2.399963;
    let reference = dvec3_make(seed.cos(), 0.3, seed.sin());
    let spin_axis = dvec3_normalize(dvec3_cross(a, reference));
    let rate = rocket::config().salvage.spin_rate as f64;
    LIST.with(|c| {
        c.borrow_mut()
            .push(FallingStage::new(parts, pos, vel, a, spin_axis, rate))
    });
}

/// Drop every tracked stage (world exit).
pub fn clear() {
    LIST.with(|c| c.borrow_mut().clear());
}

pub fn is_empty() -> bool {
    LIST.with(|c| c.borrow().is_empty())
}

/// Body-local altitude of `pos` above mean sea level (m).
fn sea_altitude(world: &World, pos: DVec3) -> f64 {
    let center = dvec3_make(world.body.pos_x, world.body.pos_y, world.body.pos_z);
    dvec3_length(dvec3_sub(pos, center)) - world.body.radius_m
}

/// Advance every falling stage. On impact, drop the salvage and remove it.
pub fn step(world: &World, dt: f32) {
    let cfg = rocket::config();
    let sal = cfg.salvage;
    let band = cfg.reentry.max_alt_m.max(1.0) as f64;
    let center = dvec3_make(world.body.pos_x, world.body.pos_y, world.body.pos_z);
    let sea_r = world.body.radius_m;

    LIST.with(|c| {
        let list = &mut *c.borrow_mut();
        list.retain_mut(|s| {
            let alt = sea_altitude(world, s.pos);
            /* Air density: 1 at the surface, 0 at the top of the reentry band
             * (above it - orbit/coast - there is no drag or heating). */
            let density = ((band - alt) / band).clamp(0.0, 1.0) as f32;
            let gravity = planet::orbital_gravity_at(s.pos);
            s.step(dt, gravity, density, &sal);

            /* Impact test: resolve the tile under the stage and its surface. */
            let dir = dvec3_normalize(dvec3_sub(s.pos, center));
            let tile = world.grid.find_tile(dir, -1);
            let mut top = -1;
            for d in (0..WORLD_MAX_DEPTH).rev() {
                if blocks::is_solid(world.get(tile, d)) {
                    top = d;
                    break;
                }
            }
            let terrain_r = if top >= 0 { world.depth_to_radius_m(top + 1) } else { sea_r - 8.0 };
            /* Seabed below sea level -> the column is ocean; the impact plane
             * is the water surface (sea_r), otherwise the terrain top. */
            let is_ocean = terrain_r < sea_r - 0.5;
            let impact_r = if is_ocean { sea_r } else { terrain_r };
            let r = dvec3_length(dvec3_sub(s.pos, center));

            if r <= impact_r {
                let up = dir;
                let surf = dvec3_add(center, dvec3_scale(up, impact_r));
                if is_ocean {
                    /* Splashdown: intact, every part recoverable. */
                    for &part in &s.parts {
                        drops::spawn_at(surf, up, part, 1);
                    }
                } else {
                    /* Land: shatters into a few metal scraps. */
                    let spread = (sal.scrap_max - sal.scrap_min).max(0.0);
                    let jitter = ((s.age_s * 7.0).fract()) * spread;
                    let scraps = (sal.scrap_min + jitter).round().max(1.0) as u16;
                    drops::spawn_at(surf, up, IRON, scraps);
                }
                false
            } else {
                true
            }
        });
    });
}

/// Snapshot the live stages for the renderers.
pub fn views() -> Vec<StageView> {
    let force = std::env::var("TENEBRIS_DEV_FALLING").is_ok();
    LIST.with(|c| {
        c.borrow()
            .iter()
            .map(|s| StageView {
                center: s.pos,
                axis: s.axis,
                flow: s.vel,
                parts: s.parts.clone(),
                heat: if force { s.heat.max(1.2) } else { s.heat },
            })
            .collect()
    })
}

/// Dev-only: drop a hot booster ahead of the player so the reentry plasma
/// shell can be inspected in a headless screenshot (TENEBRIS_DEV_FALLING).
pub fn dev_spawn(player_pos: DVec3, up: DVec3, fwd: DVec3) {
    use tenebris_core::items::{FUEL_TANK, ROCKET_ENGINE};
    let ahead = dvec3_add(player_pos, dvec3_scale(dvec3_normalize(fwd), 9.0));
    let pos = dvec3_add(ahead, dvec3_scale(dvec3_normalize(up), -1.0));
    /* Falling fast toward the surface so it lights up. */
    let vel = dvec3_scale(dvec3_normalize(up), -90.0);
    spawn(vec![ROCKET_ENGINE, FUEL_TANK, FUEL_TANK], pos, vel, up);
}
