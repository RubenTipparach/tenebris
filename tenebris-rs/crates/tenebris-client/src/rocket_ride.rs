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

use tenebris_core::items::ItemId;
use tenebris_core::math::DVec3;
use tenebris_core::rocket::{EngineKind, RocketRide};

/// Where a ride came from: the launch pad and the pose the player boarded
/// at. Kept so the rocket can be respawned (reset to full fuel back on the
/// pad) and so the renderer can hide the pad's own static rocket while it's
/// the one being flown.
///
/// The pad KEEPS its assembled parts on board (unlike the old flow, which
/// emptied it), so `stack` is exactly what's still sitting on the pad -
/// respawn re-boards that same rocket rather than conjuring a new one, so
/// there's no way to duplicate crafted parts.
#[derive(Clone)]
struct Origin {
    stack: Vec<ItemId>,
    tile: i32,
    depth: i32,
    pos: DVec3,
    up: DVec3,
}

thread_local! {
    static RIDE: RefCell<Option<RocketRide>> = const { RefCell::new(None) };
    static ORIGIN: RefCell<Option<Origin>> = const { RefCell::new(None) };
}

/// Board a rocket assembled on the pad at (`tile`, `depth`). `pos`/`up` are
/// the boarding pose (pad top + radial up); `stack` is what stays on the pad.
///
/// Re-seeds the chase camera here rather than at the call sites, so every
/// way of boarding starts parked behind the rocket instead of wherever the
/// last flight's mouse left it.
pub fn begin(ride: RocketRide, stack: Vec<ItemId>, tile: i32, depth: i32, pos: DVec3, up: DVec3) {
    RIDE.with(|c| *c.borrow_mut() = Some(ride));
    ORIGIN.with(|o| *o.borrow_mut() = Some(Origin { stack, tile, depth, pos, up }));
    crate::rocket_cam::reset();
}

/// Stop flying (climbed out / landed / world exit). Also forgets the origin
/// pad, so a later respawn can't reset a rocket the player has walked away
/// from - the parts are still on the pad; re-board it with E instead.
pub fn clear() {
    RIDE.with(|c| *c.borrow_mut() = None);
    ORIGIN.with(|o| *o.borrow_mut() = None);
}

/// Reset the current rocket: rebuild it full-fuelled from the pad it launched
/// from and return the boarding pose for the caller to snap the player to.
/// `None` if there's no origin to respawn from.
///
/// No duplication: the parts live on the pad, and this re-boards that same
/// rocket - it doesn't mint new ones.
pub fn respawn() -> Option<(DVec3, DVec3)> {
    ORIGIN.with(|o| {
        let ob = o.borrow();
        let org = ob.as_ref()?;
        let ride = RocketRide::from_stack(&org.stack, &tenebris_core::rocket::config())?;
        RIDE.with(|c| *c.borrow_mut() = Some(ride));
        crate::rocket_cam::reset();
        Some((org.pos, org.up))
    })
}

/// The pad (tile, depth) of the rocket being flown RIGHT NOW, or `None` when
/// not riding. The renderer skips this pad's static rocket so it isn't drawn
/// twice - once on the pad and once around the player.
pub fn in_flight_pad() -> Option<(i32, i32)> {
    if !is_riding() {
        return None;
    }
    ORIGIN.with(|o| o.borrow().as_ref().map(|org| (org.tile, org.depth)))
}

/// Is a rocket available to respawn (origin still known)?
pub fn can_respawn() -> bool {
    ORIGIN.with(|o| o.borrow().is_some())
}

/// Is the player currently strapped into a rocket?
pub fn is_riding() -> bool {
    RIDE.with(|c| c.borrow().is_some())
}

/// Every part still attached (see `RocketRide::remaining_parts`) - what the
/// renderer draws around the player and what climbing out hands back.
pub fn remaining_parts() -> Vec<tenebris_core::items::ItemId> {
    with(|r| r.remaining_parts()).unwrap_or_default()
}

/// Delta-v left in the whole rocket, m/s.
pub fn delta_v_mps() -> f32 {
    with(|r| r.delta_v_mps(&tenebris_core::rocket::config())).unwrap_or(0.0)
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

/// The active (bottom) stage's part ids, for the falling body a jettison
/// sheds. Read this BEFORE calling [`stage`], which removes that stage.
pub fn active_stage_parts() -> Vec<tenebris_core::items::ItemId> {
    with(|r| r.active_stage_parts()).unwrap_or_default()
}

/// True once the whole rocket is out of fuel (time to drop back to free-fly).
pub fn is_spent() -> bool {
    with(|r| r.is_spent()).unwrap_or(true)
}

/// Station refuel: pour `units` into the active stage (capped at capacity).
/// Returns the amount accepted.
pub fn refuel(units: f32) -> f32 {
    RIDE.with(|c| c.borrow_mut().as_mut().map(|r| r.refuel(units)).unwrap_or(0.0))
}

#[cfg(test)]
mod tests {
    use super::*;
    use tenebris_core::items::{COMMAND_MODULE, FUEL_TANK, ROCKET_ENGINE};
    use tenebris_core::math::dvec3_make;

    fn stack() -> Vec<ItemId> {
        vec![ROCKET_ENGINE, FUEL_TANK, COMMAND_MODULE]
    }

    fn board() -> (DVec3, DVec3) {
        let cfg = tenebris_core::rocket::config();
        let ride = RocketRide::from_stack(&stack(), &cfg).unwrap();
        let pos = dvec3_make(300.0, 0.0, 0.0);
        let up = dvec3_make(1.0, 0.0, 0.0);
        begin(ride, stack(), 7, 3, pos, up);
        (pos, up)
    }

    /// Respawn rebuilds a full-fuelled rocket and reports the pad pose - the
    /// point being you can reset a botched or burnt-out flight without
    /// walking back to the pad.
    #[test]
    fn respawn_refuels_and_returns_to_the_pad() {
        clear();
        let (pos, up) = board();

        for _ in 0..100 {
            burn(1.0);
        }
        assert!(is_spent(), "burnt dry");

        let (rp, ru) = respawn().expect("origin is known while riding");
        assert!(!is_spent(), "respawn gives a full tank");
        assert_eq!(rp, pos, "and puts you back at the pad");
        assert_eq!(ru, up);
        clear();
    }

    /// While riding, the origin pad is reported so the renderer can hide its
    /// static rocket (else the rocket draws twice).
    #[test]
    fn in_flight_pad_tracks_the_origin_only_while_riding() {
        clear();
        assert_eq!(in_flight_pad(), None, "not riding -> nothing to hide");
        board();
        assert_eq!(in_flight_pad(), Some((7, 3)));
        clear();
        assert_eq!(in_flight_pad(), None, "after exit the pad shows its rocket again");
    }

    /// Exiting forgets the origin, so respawn can't yank a rocket the player
    /// climbed out of and walked away from - the parts are on the pad, and
    /// re-boarding is the way back.
    #[test]
    fn exit_forgets_the_origin() {
        clear();
        board();
        assert!(can_respawn());
        clear();
        assert!(!can_respawn());
        assert_eq!(respawn(), None);
    }
}
