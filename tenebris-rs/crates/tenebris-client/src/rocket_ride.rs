//! The rocket the player is currently flying (client-side session state).
//!
//! `PlayerCtrl` is `Copy` and cloned all over, so the `Vec`-backed
//! [`RocketRide`] can't live on it. It lives here in a thread-local instead
//! (same pattern as `drops` / `torch`), and the physics controller, the Stage
//! key, the launch button, and the HUD reach it through these free functions.
//!
//! The flight rules themselves are Core ([`tenebris_core::rocket::RocketRide`])
//! so SP and MP fly identically; this module is just the client-owned "who is
//! riding what right now" handle plus the thrust the controller applies.

use std::cell::RefCell;

use tenebris_core::rocket::{EngineKind, RocketRide};

thread_local! {
    static RIDE: RefCell<Option<RocketRide>> = const { RefCell::new(None) };
}

/// Begin flying a rocket (from the launch button). Replaces any current ride.
pub fn begin(ride: RocketRide) {
    RIDE.with(|c| *c.borrow_mut() = Some(ride));
}

/// Stop flying (landed / recovered / world exit).
pub fn clear() {
    RIDE.with(|c| *c.borrow_mut() = None);
}

/// Is the player currently strapped into a rocket?
pub fn is_riding() -> bool {
    RIDE.with(|c| c.borrow().is_some())
}

/// Read the active ride, if any.
pub fn with<R>(f: impl FnOnce(&RocketRide) -> R) -> Option<R> {
    RIDE.with(|c| c.borrow().as_ref().map(f))
}

/// Thrust the active engine produces right now (N), 0 if not riding / out of fuel.
pub fn thrust_n() -> f32 {
    with(|r| r.thrust_n()).unwrap_or(0.0)
}

/// Current rocket mass (kg), 0 if not riding.
pub fn mass_kg() -> f32 {
    with(|r| r.mass_kg()).unwrap_or(0.0)
}

/// Instantaneous thrust-to-weight ratio against `gravity_mps2`.
pub fn twr(gravity_mps2: f32) -> f32 {
    with(|r| r.twr(gravity_mps2)).unwrap_or(0.0)
}

/// The engine kind currently firing.
pub fn active_engine() -> Option<EngineKind> {
    with(|r| r.active_engine()).flatten()
}

/// (fuel remaining, capacity) of the active stage, for a HUD gauge.
pub fn active_fuel() -> (f32, f32) {
    with(|r| (r.active_fuel(), r.active_capacity())).unwrap_or((0.0, 0.0))
}

/// Stages still attached (including the active one).
pub fn stage_count() -> usize {
    with(|r| r.stage_count()).unwrap_or(0)
}

/// Burn the active stage's fuel for `dt` seconds (the engine is firing).
pub fn burn(dt: f32) {
    RIDE.with(|c| {
        if let Some(r) = c.borrow_mut().as_mut() {
            r.burn(dt);
        }
    });
}

/// Jettison the active stage (Stage key). Returns true if a stage dropped.
pub fn stage() -> bool {
    RIDE.with(|c| c.borrow_mut().as_mut().map(|r| r.stage()).unwrap_or(false))
}

/// True once the whole rocket is out of fuel (time to drop back to free-fly).
pub fn is_spent() -> bool {
    with(|r| r.is_spent()).unwrap_or(true)
}
