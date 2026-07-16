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
use tenebris_core::math::{dvec3_make, DVec3};
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

/// A ship the player climbed out of and LEFT SITTING IN THE WORLD. Exit no
/// longer discards the ride (the old `clear`, which only made sense on the
/// pad and made an in-flight ship vanish - the "my vehicle despawned" bug);
/// it parks it here so the ship keeps drawing at its pose and re-boards
/// when you walk up and press E. Carries everything needed to rebuild the
/// exact ride: remaining parts, per-stage fuel, the world pose it floats
/// at, the orbit it was coasting, and the origin pad so respawn still works
/// after re-boarding.
#[derive(Clone)]
struct Parked {
    parts: Vec<ItemId>,
    fuels: Vec<f32>,
    /// Ship base (the player's ride point), world space.
    pos: DVec3,
    /// Ship axis / nose, world space.
    up: DVec3,
    /// The orbit it was coasting when the player climbed out.
    vel: DVec3,
    origin: Option<Origin>,
}

thread_local! {
    static RIDE: RefCell<Option<RocketRide>> = const { RefCell::new(None) };
    static ORIGIN: RefCell<Option<Origin>> = const { RefCell::new(None) };
    static PARKED: RefCell<Option<Parked>> = const { RefCell::new(None) };
    /// Wall-clock (renderer::time_seconds) until which the engine counts as
    /// firing - set by `burn` whenever fuel actually burned this frame. The
    /// short grace keeps the plume from strobing on frame-time jitter.
    static BURN_UNTIL_S: std::cell::Cell<f64> = const { std::cell::Cell::new(-1e9) };
    /// Last known flight velocity (noted by the autosave with the player
    /// borrowed) - the ORBIT the ride save serializes. Saving position
    /// without velocity resumed a reload stationary at altitude, falling
    /// straight down instead of coasting its orbit.
    static LAST_VEL: std::cell::Cell<DVec3> =
        const { std::cell::Cell::new(DVec3 { x: 0.0, y: 0.0, z: 0.0 }) };
    /// Velocity waiting to be applied to the player after a mid-flight
    /// restore (the restore site has no player borrow; the frame loop
    /// drains this once).
    static PENDING_VEL: std::cell::Cell<Option<DVec3>> = const { std::cell::Cell::new(None) };
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
    sp_save_now();
    crate::rocket_cam::reset();
    /* Flight flies with a FREE cursor (like the JS): the egui flight panel
     * is clickable, and the camera orbits on left-drag instead of raw
     * mouse-look. Exit re-locks (rocket_exit_action). */
    release_pointer();
}

#[cfg(not(test))]
fn release_pointer() {
    sokol::app::lock_mouse(false);
    sokol::app::show_mouse(true);
}
#[cfg(test)]
fn release_pointer() {}

/// Stop flying (climbed out / landed / world exit). Also forgets the origin
/// pad, so a later respawn can't reset a rocket the player has walked away
/// from - the parts are still on the pad; re-board it with E instead.
pub fn clear() {
    RIDE.with(|c| *c.borrow_mut() = None);
    ORIGIN.with(|o| *o.borrow_mut() = None);
    PARKED.with(|c| *c.borrow_mut() = None);
    /* Same-frame clear of the mid-flight save: a landed / exited save must
     * never re-strap the player on the next load. */
    sp_save_now();
}

/// Climb out but LEAVE THE SHIP IN THE WORLD: park it at `pos`/`up` coasting
/// `vel`, and stop riding. The ship keeps drawing there and re-boards with E
/// (see [`board_parked`]) - it does NOT vanish the way [`clear`] made it.
/// The origin pad is preserved so a later respawn still works. Persists the
/// parked ship same-frame so a reload brings it back where it was left.
pub fn park(pos: DVec3, up: DVec3, vel: DVec3) {
    let parked = RIDE.with(|c| {
        let rb = c.borrow();
        rb.as_ref().map(|r| Parked {
            parts: r.remaining_parts(),
            fuels: r.stage_fuels(),
            pos,
            up,
            vel,
            origin: ORIGIN.with(|o| o.borrow().clone()),
        })
    });
    /* Only actually park when there was a ride to leave. */
    if let Some(pk) = parked {
        PARKED.with(|c| *c.borrow_mut() = Some(pk));
        RIDE.with(|c| *c.borrow_mut() = None);
        ORIGIN.with(|o| *o.borrow_mut() = None);
        LAST_VEL.with(|c| c.set(vel));
        sp_save_now();
    }
}

/// Is there a ship parked in the world right now (climbed out, not flying)?
pub fn has_parked() -> bool {
    PARKED.with(|c| c.borrow().is_some())
}

/// The parked ship's draw pose + parts: (base pos, axis up, parts). `None`
/// when nothing is parked. The renderer draws it exactly like the ridden
/// stack (a `StageView` through `draw_falling`).
pub fn parked_view() -> Option<(DVec3, DVec3, Vec<ItemId>)> {
    PARKED.with(|c| c.borrow().as_ref().map(|p| (p.pos, p.up, p.parts.clone())))
}

/// World position of the parked ship's base, for the "walk up to board"
/// range test. `None` when nothing is parked.
pub fn parked_pos() -> Option<DVec3> {
    PARKED.with(|c| c.borrow().as_ref().map(|p| p.pos))
}

/// Re-board the parked ship: rebuild the ride from its parts + fuels,
/// restore its origin pad, resume riding, and hand back the pose the caller
/// snaps the player to `(pos, up, vel)`. `None` when nothing is parked or
/// the saved parts no longer build a flyable rocket (in which case the
/// parked ship is left untouched).
pub fn board_parked() -> Option<(DVec3, DVec3, DVec3)> {
    let pk = PARKED.with(|c| c.borrow_mut().take())?;
    let cfg = tenebris_core::rocket::config();
    let Some(mut ride) = RocketRide::from_stack(&pk.parts, &cfg) else {
        /* Can't fly a broken stack - put it back so it isn't lost. */
        PARKED.with(|c| *c.borrow_mut() = Some(pk));
        return None;
    };
    ride.set_stage_fuels(&pk.fuels);
    RIDE.with(|c| *c.borrow_mut() = Some(ride));
    ORIGIN.with(|o| *o.borrow_mut() = pk.origin.clone());
    LAST_VEL.with(|c| c.set(pk.vel));
    crate::rocket_cam::reset();
    release_pointer();
    sp_save_now();
    Some((pk.pos, pk.up, pk.vel))
}

/// Reset the current rocket: rebuild it full-fuelled from the pad it launched
/// from and return the boarding pose for the caller to snap the player to.
/// `None` if there's no origin to respawn from.
///
/// No duplication: the parts live on the pad, and this re-boards that same
/// rocket - it doesn't mint new ones.
pub fn respawn() -> Option<(DVec3, DVec3)> {
    let pose = ORIGIN.with(|o| {
        let ob = o.borrow();
        let org = ob.as_ref()?;
        let ride = RocketRide::from_stack(&org.stack, &tenebris_core::rocket::config())?;
        RIDE.with(|c| *c.borrow_mut() = Some(ride));
        crate::rocket_cam::reset();
        Some((org.pos, org.up))
    });
    if pose.is_some() {
        sp_save_now();
    }
    pose
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
            /* Latch the plume only when there is fuel to burn - a spent
             * stage's throttle key must not light an exhaust. (This is
             * RocketRide::active_fuel - the f32 - not this module's
             * (fuel, cap) tuple wrapper of the same name.) */
            if r.active_fuel() > 0.0 {
                BURN_UNTIL_S
                    .with(|b| b.set(crate::renderer::time_seconds() as f64 + 0.1));
            }
            r.burn(dt);
        }
    });
}

/// True while the engine is firing (fuel burned within the last grace
/// window) - drives the exhaust plume.
pub fn is_burning() -> bool {
    BURN_UNTIL_S.with(|b| (crate::renderer::time_seconds() as f64) < b.get())
}

/// Jettison the active stage (Stage key). Returns true if a stage dropped.
pub fn stage() -> bool {
    let dropped = RIDE.with(|c| c.borrow_mut().as_mut().map(|r| r.stage()).unwrap_or(false));
    if dropped {
        sp_save_now();
    }
    dropped
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
    let accepted =
        RIDE.with(|c| c.borrow_mut().as_mut().map(|r| r.refuel(units)).unwrap_or(0.0));
    if accepted > 0.0 {
        sp_save_now();
    }
    accepted
}

/* ------------------------------------------------------------------ */
/* Mid-flight persistence: the ride is SAVE STATE. Snapshot on the ride
 * edges (board / stage / exit / respawn - sp_save_now) and on the pose
 * autosave cadence (fuel drift); restored at world load so quitting
 * mid-flight resumes strapped in instead of free-falling while the pad
 * quietly refunds a full rocket. */
/* ------------------------------------------------------------------ */

/// Note the current flight velocity for the ride save - the ORBIT. Called
/// by the autosave (which holds the player borrow) so the snapshot always
/// carries a fresh vector.
pub fn note_velocity(v: DVec3) {
    LAST_VEL.with(|c| c.set(v));
}

/// Velocity restored from a saved mid-flight ride, handed to the frame
/// loop ONCE to reapply to the player (the restore site has no player).
pub fn take_restored_velocity() -> Option<DVec3> {
    PENDING_VEL.with(|c| c.take())
}

/// The current ride OR parked ship as a persistence snapshot, `None` when
/// there is neither. A riding snapshot carries the ship's flight position
/// in the normal pose save (so `ship_*` here stay zero); a parked snapshot
/// has no player attached, so it stores the ship's world pose in `ship_*`.
pub fn save_snapshot() -> Option<crate::persistence::PersistenceRide> {
    /* Riding: live ride + origin pad. */
    let riding = RIDE.with(|c| {
        let rb = c.borrow();
        let r = rb.as_ref()?;
        ORIGIN.with(|o| {
            let ob = o.borrow();
            let org = ob.as_ref()?;
            let vel = LAST_VEL.with(|v| v.get());
            Some(crate::persistence::PersistenceRide {
                /* The ride flies over the origin pad's body. */
                body_id: 0,
                tile: org.tile,
                depth: org.depth,
                pos: [org.pos.x, org.pos.y, org.pos.z],
                up: [org.up.x, org.up.y, org.up.z],
                vel: [vel.x, vel.y, vel.z],
                parts: r.remaining_parts(),
                fuels: r.stage_fuels(),
                pad_stack: org.stack.clone(),
                parked: false,
                ship_pos: [0.0; 3],
                ship_up: [0.0; 3],
            })
        })
    });
    if riding.is_some() {
        return riding;
    }
    /* Parked: no live ride; the ship floats at pk.pos/up coasting pk.vel. */
    PARKED.with(|c| {
        let pb = c.borrow();
        let pk = pb.as_ref()?;
        let (tile, depth, pad_pos, pad_up, pad_stack) = match &pk.origin {
            Some(o) => (
                o.tile,
                o.depth,
                [o.pos.x, o.pos.y, o.pos.z],
                [o.up.x, o.up.y, o.up.z],
                o.stack.clone(),
            ),
            /* No origin (already respawn-forgotten): fall back to the parts
             * as the pad stack so a re-board can still respawn something. */
            None => (-1, -1, [0.0; 3], [0.0; 3], pk.parts.clone()),
        };
        Some(crate::persistence::PersistenceRide {
            body_id: 0,
            tile,
            depth,
            pos: pad_pos,
            up: pad_up,
            vel: [pk.vel.x, pk.vel.y, pk.vel.z],
            parts: pk.parts.clone(),
            fuels: pk.fuels.clone(),
            pad_stack,
            parked: true,
            ship_pos: [pk.pos.x, pk.pos.y, pk.pos.z],
            ship_up: [pk.up.x, pk.up.y, pk.up.z],
        })
    })
}

/// Write (or clear, when not riding) the mid-flight snapshot for the
/// active SP world - the same-frame hook the ride edges call. No-op in
/// MP / menus, mirroring the other sp_save paths.
pub fn sp_save_now() {
    if crate::menu::state() != crate::menu::GameState::InGameSp {
        return;
    }
    let world = crate::menu::active_world();
    if world.is_empty() {
        return;
    }
    crate::persistence::save_ride(&world, save_snapshot().as_ref());
}

/// Re-strap the player into a saved mid-flight ride (world load). Returns
/// false if the snapshot no longer builds a flyable rocket.
pub fn restore_snapshot(s: &crate::persistence::PersistenceRide) -> bool {
    let cfg = tenebris_core::rocket::config();
    let Some(mut ride) = RocketRide::from_stack(&s.parts, &cfg) else {
        return false;
    };
    ride.set_stage_fuels(&s.fuels);
    let origin = Some(Origin {
        stack: s.pad_stack.clone(),
        tile: s.tile,
        depth: s.depth,
        pos: dvec3_make(s.pos[0], s.pos[1], s.pos[2]),
        up: dvec3_make(s.up[0], s.up[1], s.up[2]),
    });
    if s.parked {
        /* PARKED, not riding: bring the ship back sitting in the world at
         * its saved pose. The player's own pose save decides where THEY
         * are (they walked off) - do not strap them in, and do not refund
         * a fresh rocket on the pad. Walk up + E re-boards it. */
        PARKED.with(|c| {
            *c.borrow_mut() = Some(Parked {
                parts: s.parts.clone(),
                fuels: s.fuels.clone(),
                pos: dvec3_make(s.ship_pos[0], s.ship_pos[1], s.ship_pos[2]),
                up: dvec3_make(s.ship_up[0], s.ship_up[1], s.ship_up[2]),
                vel: dvec3_make(s.vel[0], s.vel[1], s.vel[2]),
                origin,
            })
        });
        RIDE.with(|c| *c.borrow_mut() = None);
        return true;
    }
    RIDE.with(|c| *c.borrow_mut() = Some(ride));
    ORIGIN.with(|o| *o.borrow_mut() = origin);
    /* The orbit: queue the saved velocity for the frame loop to reapply
     * to the player (world enter zeroes it). */
    PENDING_VEL.with(|c| c.set(Some(dvec3_make(s.vel[0], s.vel[1], s.vel[2]))));
    LAST_VEL.with(|c| c.set(dvec3_make(s.vel[0], s.vel[1], s.vel[2])));
    /* Same entry conditions as begin(): chase cam parked behind the
     * rocket, cursor free for the flight panel. */
    crate::rocket_cam::reset();
    release_pointer();
    true
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

    /// THE despawn fix: climbing out PARKS the ship in the world instead of
    /// discarding it. It stops riding but stays visible/boardable, and
    /// walking up + boarding rebuilds the exact same rocket where it sits.
    #[test]
    fn park_leaves_the_ship_and_board_parked_re_boards_it() {
        clear();
        let (pos, up) = board();
        let vel = dvec3_make(15.0, 0.0, 2.0);
        park(pos, up, vel);
        assert!(!is_riding(), "climbed out - no longer strapped in");
        assert!(has_parked(), "but the ship is STILL in the world, parked");

        let (ppos, pup, parts) = parked_view().expect("a parked ship to draw");
        assert_eq!(ppos, pos);
        assert_eq!(pup, up);
        assert!(!parts.is_empty(), "the parked ship keeps its parts");
        assert_eq!(parked_pos(), Some(pos));

        /* Re-board it: same rocket, resumes riding, parked slot emptied. */
        let (bp, bu, bv) = board_parked().expect("re-board the parked ship");
        assert_eq!((bp, bu, bv), (pos, up, vel));
        assert!(is_riding(), "strapped back in");
        assert!(!has_parked(), "no longer parked once boarded");
        /* Respawn still works after re-boarding (origin was preserved). */
        assert!(can_respawn());
        clear();
    }

    /// Parking with nothing to leave is a no-op (can't park empty air).
    #[test]
    fn park_with_no_ride_does_nothing() {
        clear();
        park(dvec3_make(1.0, 0.0, 0.0), dvec3_make(0.0, 1.0, 0.0), dvec3_make(0.0, 0.0, 0.0));
        assert!(!has_parked());
        assert!(!is_riding());
    }

    /// A parked ship survives a save/restore round-trip as PARKED (not
    /// riding) at its world pose - the reload-keeps-the-ship contract.
    #[test]
    fn parked_ship_survives_snapshot_restore() {
        clear();
        let (pos, up) = board();
        let vel = dvec3_make(9.0, 1.0, -3.0);
        park(pos, up, vel);
        let snap = save_snapshot().expect("a parked snapshot");
        assert!(snap.parked, "snapshot marks it parked");
        assert!((snap.ship_pos[0] - pos.x).abs() < 1e-3);

        /* Simulate a reload: clear memory, restore from the snapshot. */
        clear();
        assert!(!has_parked());
        assert!(restore_snapshot(&snap), "restores");
        assert!(has_parked(), "back in the world, parked");
        assert!(!is_riding(), "and NOT strapped to the player");
        let (rpos, _rup, _rparts) = parked_view().unwrap();
        assert!((rpos.x - pos.x).abs() < 1e-3, "at its parked pose");
        clear();
    }
}
