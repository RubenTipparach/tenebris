//! Fishing minigame (client). With the fishing rod selected, a left
//! click casts a bobber; it arcs into the water and floats. After a
//! hash-random wait the bobber DIPS - that's the bite window: click
//! while it's down to hook the fish, and the reel-in flies the bobber
//! back to the rod and lands the catch (raw fish into the bag).
//! Clicking while it floats calmly just reels the line back empty.
//!
//! Pure client feature (same code path in SP and MP - the catch is a
//! bag item, exactly like crop harvests). Timing knobs live in
//! assets/config/fishing.yaml (core::fishing).

use std::cell::RefCell;

use sokol::gl as sgl;

use tenebris_core::fauna::AnimalKind;
use tenebris_core::fishing as cfg;
use tenebris_core::items;
use tenebris_core::math::{
    dvec3_add, dvec3_cross, dvec3_length, dvec3_make, dvec3_normalize, dvec3_scale, dvec3_sub,
    DVec3, Vec3,
};
use tenebris_core::rng::hash2;
use tenebris_core::world::{World, WORLD_SEA_LEVEL_DEPTH};

use crate::gfx_math::Mat4;
use crate::player_ctrl::PlayerCtrl;
use crate::renderer;

#[derive(Clone, Copy, PartialEq, Debug)]
enum Phase {
    /// Cast bobber arcing through the air.
    Flying,
    /// Floating on the water, waiting for a bite.
    Floating,
    /// Bobber dipped - click NOW to hook.
    Bite,
    /// Line coming back in; `hooked` decides whether it lands a fish.
    Reeling { hooked: bool },
}

struct State {
    phase: Phase,
    pos: DVec3,
    vel: DVec3,
    /// Where the reel-in flies back to (updated to the live rod tip).
    home: DVec3,
    t: f32,
    wait_s: f32,
    /// Water surface radius the float rides (body-local).
    surface_r: f64,
    seed: u32,
    /// The species currently on / approaching the hook. Rolled when
    /// the bite starts; its strength drives the reaction window and
    /// the reward.
    species: AnimalKind,
}

thread_local! {
    static S: RefCell<Option<State>> = const { RefCell::new(None) };
    static PIP3D: std::cell::Cell<sgl::Pipeline> =
        const { std::cell::Cell::new(sgl::Pipeline { id: 0 }) };
    /// Catch counter - the HUD flashes the landed catch briefly.
    static CAUGHT_FLASH_T: std::cell::Cell<f32> = const { std::cell::Cell::new(0.0) };
    /// Rolling HUD line built each frame (species names / counts need
    /// an owned string, unlike the static phase hints).
    static HUD_LINE: RefCell<String> = const { RefCell::new(String::new()) };
}

/// Strength rendered as filled/empty pips, e.g. "***--" for 3/5.
fn strength_pips(strength: u8) -> String {
    let s = strength.min(5) as usize;
    let mut out = String::with_capacity(5);
    for i in 0..5 {
        out.push(if i < s { '*' } else { '-' });
    }
    out
}

/// Rod-tip anchor: well OUT IN FRONT of the CAMERA, only slightly right of
/// centre and near eye height, so the pole reads as pointing forward into
/// the scene (not jutting off to the side). Anchored off the camera VIEW
/// basis (`player_ctrl::camera_basis`) so it follows where you look - pitch
/// up and the tip swings up with the view. The line pays out from here.
fn rod_tip(p: &PlayerCtrl) -> DVec3 {
    let (eye, look, right, up) = crate::player_ctrl::camera_basis(p);
    dvec3_add(
        dvec3_add(eye, dvec3_scale(right, 0.26)),
        dvec3_add(dvec3_scale(look, 0.95), dvec3_scale(up, 0.05)),
    )
}

/// Rod-grip anchor: the butt of the pole down by the hand - close in, low,
/// and just right of centre in the CAMERA frame - so the drawn shaft rises
/// from the hand up and FORWARD to the tip like a held rod, tracking the
/// camera's look direction (see [`rod_tip`]).
fn rod_grip(p: &PlayerCtrl) -> DVec3 {
    let (eye, look, right, up) = crate::player_ctrl::camera_basis(p);
    dvec3_add(
        dvec3_add(eye, dvec3_scale(right, 0.18)),
        dvec3_add(dvec3_scale(look, 0.22), dvec3_scale(up, -0.30)),
    )
}

/// Emit a tapered oriented box (the rod shaft) from `a` (half-width `ra`)
/// to `b` (half-width `rb`) as triangles - must be called inside a
/// begin_triangles batch. `right_ref` seeds the cross-section axes so the
/// shaft always shows visible width regardless of view angle.
#[allow(clippy::too_many_arguments)]
fn shaft_box(a: DVec3, b: DVec3, ra: f64, rb: f64, right_ref: DVec3, r: f32, g: f32, bl: f32, lit: f32) {
    let axis = dvec3_normalize(dvec3_sub(b, a));
    let mut u = dvec3_cross(axis, right_ref);
    if dvec3_length(u) < 1e-4 {
        u = dvec3_cross(axis, dvec3_make(0.0, 1.0, 0.0));
    }
    let u = dvec3_normalize(u);
    let v = dvec3_normalize(dvec3_cross(axis, u));
    let ca = |su: f64, sv: f64| {
        dvec3_add(a, dvec3_add(dvec3_scale(u, su * ra), dvec3_scale(v, sv * ra)))
    };
    let cb = |su: f64, sv: f64| {
        dvec3_add(b, dvec3_add(dvec3_scale(u, su * rb), dvec3_scale(v, sv * rb)))
    };
    let a00 = ca(-1.0, -1.0);
    let a10 = ca(1.0, -1.0);
    let a11 = ca(1.0, 1.0);
    let a01 = ca(-1.0, 1.0);
    let b00 = cb(-1.0, -1.0);
    let b10 = cb(1.0, -1.0);
    let b11 = cb(1.0, 1.0);
    let b01 = cb(-1.0, 1.0);
    sgl::c3f(r * lit, g * lit, bl * lit);
    let quad = |p0: DVec3, p1: DVec3, p2: DVec3, p3: DVec3| {
        for &pt in &[p0, p1, p2, p0, p2, p3] {
            sgl::v3f(pt.x as f32, pt.y as f32, pt.z as f32);
        }
    };
    quad(a00, a10, b10, b00);
    quad(a10, a11, b11, b10);
    quad(a11, a01, b01, b11);
    quad(a01, a00, b00, b01);
    quad(a00, a01, a11, a10);
    quad(b00, b10, b11, b01);
}

/// True while a line is out (drives the HUD hint + click routing).
pub fn is_active() -> bool {
    S.with(|s| s.borrow().is_some())
}

/// HUD hint for the reticle line, if the rod has a line out. Returns
/// an owned String (species names / catch counts are dynamic). The
/// caller reads it for the frame; the buffer lives in HUD_LINE so the
/// borrow stays valid.
pub fn hint() -> Option<String> {
    /* Catch flash wins while it's up (set on a landed fish). */
    if CAUGHT_FLASH_T.with(|c| c.get()) > 0.0 {
        return Some(HUD_LINE.with(|l| l.borrow().clone()));
    }
    S.with(|s| {
        s.borrow().as_ref().map(|st| match st.phase {
            Phase::Flying => "casting...".to_string(),
            Phase::Floating => "waiting for a bite...".to_string(),
            /* The bite names the fish + its strength so the player
             * learns to expect a twitchier hook on the big ones. */
            Phase::Bite => format!(
                "!!! {} [{}] - CLICK !!!",
                st.species.display_name(),
                strength_pips(st.species.fish_strength())
            ),
            Phase::Reeling { hooked: true } => "reeling it in!".to_string(),
            Phase::Reeling { hooked: false } => "reeling in...".to_string(),
        })
    })
}

/// Left click with the rod selected. Cast when idle, hook during a
/// bite, otherwise reel back empty.
pub fn on_click(w: &World, p: &PlayerCtrl) {
    let _ = w;
    S.with(|cell| {
        let mut s = cell.borrow_mut();
        match s.as_mut() {
            None => {
                let c = cfg::config();
                let look = crate::interact::player_look_dir(p);
                let tip = rod_tip(p);
                let vel = dvec3_add(
                    dvec3_scale(look, c.cast_speed_mps as f64),
                    dvec3_scale(p.basis.up, c.cast_lift_mps as f64),
                );
                *s = Some(State {
                    phase: Phase::Flying,
                    pos: tip,
                    vel,
                    home: tip,
                    t: 0.0,
                    wait_s: 0.0,
                    surface_r: 0.0,
                    seed: (p.position.x.to_bits() as u32) ^ (p.position.z.to_bits() as u32),
                    species: AnimalKind::Fish, /* rolled at the bite */
                });
            }
            Some(st) => match st.phase {
                Phase::Bite => {
                    st.phase = Phase::Reeling { hooked: true };
                    st.t = 0.0;
                }
                Phase::Floating | Phase::Flying => {
                    st.phase = Phase::Reeling { hooked: false };
                    st.t = 0.0;
                }
                Phase::Reeling { .. } => {}
            },
        }
    });
}

/// Advance the line. Needs the player mutable for the catch award.
pub fn update(w: &World, p: &mut PlayerCtrl, dt: f32) {
    CAUGHT_FLASH_T.with(|c| c.set((c.get() - dt).max(0.0)));

    /* Putting the rod away (or opening a menu) winds the line in. */
    if crate::inventory::selected_item(&p.inventory) != Some(items::FISHING_ROD) {
        S.with(|s| *s.borrow_mut() = None);
        return;
    }

    let c = cfg::config();
    let center = dvec3_make(w.body.pos_x, w.body.pos_y, w.body.pos_z);
    let mut done = false;
    let mut caught = false;
    let mut caught_species = AnimalKind::Fish;

    S.with(|cell| {
        let mut sref = cell.borrow_mut();
        let Some(st) = sref.as_mut() else { return };
        st.t += dt;
        st.home = rod_tip(p);

        match st.phase {
            Phase::Flying => {
                let up = dvec3_normalize(dvec3_sub(st.pos, center));
                st.vel = dvec3_sub(st.vel, dvec3_scale(up, (c.cast_gravity_mps2 * dt) as f64));
                st.pos = dvec3_add(st.pos, dvec3_scale(st.vel, dt as f64));
                let lp = dvec3_sub(st.pos, center);
                let here = Vec3 { x: lp.x as f32, y: lp.y as f32, z: lp.z as f32 };
                let blk = w.block_at_pos(here, p.last_tile);
                if blk == tenebris_core::blocks::Block::Water {
                    /* Splash down: ride the actual sea surface. */
                    st.surface_r = w.depth_to_radius_m(WORLD_SEA_LEVEL_DEPTH)
                        + tenebris_core::planet_gen::sea_raise_m(&w.body) as f64;
                    st.phase = Phase::Floating;
                    st.t = 0.0;
                    st.wait_s = c.bite_wait_min_s
                        + hash2(st.seed as i32, 0x51) * (c.bite_wait_max_s - c.bite_wait_min_s);
                } else if tenebris_core::blocks::is_solid(blk) || st.t > 5.0 {
                    /* Hit land / timed out - wind it back. */
                    st.phase = Phase::Reeling { hooked: false };
                    st.t = 0.0;
                }
            }
            Phase::Floating | Phase::Bite => {
                let dir = dvec3_normalize(dvec3_sub(st.pos, center));
                let bob = (st.t * 2.2).sin() as f64 * 0.05;
                let dip = if st.phase == Phase::Bite { 0.28 } else { 0.0 };
                st.pos = dvec3_add(center, dvec3_scale(dir, st.surface_r + bob - dip - 0.05));
                if st.phase == Phase::Floating && st.t >= st.wait_s {
                    st.phase = Phase::Bite;
                    st.t = 0.0;
                    st.seed = st.seed.wrapping_mul(0x9E37_79B9).wrapping_add(1);
                    /* Roll which fish is on the line - strength drives
                     * everything from here (window + reward). */
                    st.species = AnimalKind::roll_fishing_species(
                        hash2(st.seed as i32, 0x55),
                        w.body.tileset == tenebris_core::planet::Tileset::Sequoia,
                    );
                } else if st.phase == Phase::Bite && st.t > bite_window_for(&c, st.species) {
                    /* Missed it - the fish lets go, the float pops up. */
                    st.phase = Phase::Floating;
                    st.t = 0.0;
                    st.wait_s = c.bite_wait_min_s
                        + hash2(st.seed as i32, 0x52) * (c.bite_wait_max_s - c.bite_wait_min_s);
                }
            }
            Phase::Reeling { hooked } => {
                let f = (st.t / c.reel_time_s).min(1.0) as f64;
                /* Ease toward the rod tip with a little upward arc. */
                let up = dvec3_normalize(dvec3_sub(st.home, center));
                let lift = (f * std::f64::consts::PI).sin() * if hooked { 1.2 } else { 0.4 };
                let along = dvec3_add(
                    dvec3_scale(st.pos, 1.0 - f),
                    dvec3_scale(st.home, f),
                );
                st.pos = dvec3_add(along, dvec3_scale(up, lift));
                if st.t >= c.reel_time_s {
                    done = true;
                    caught = hooked;
                    caught_species = st.species;
                }
            }
        }
    });

    if done {
        S.with(|s| *s.borrow_mut() = None);
        if caught {
            /* The catch is that species' OWN live-fish item (its own
             * sprite): eat it, cook it, or drop it in an aquarium. You
             * land one fish, plus the bonus-catch roll for a second -
             * live fish don't stack into a "5 reef fish" haul the way the
             * old generic raw-fish reward did. */
            let item = caught_species.fish_item().unwrap_or(items::RAW_FISH);
            let mut n = 1u16;
            let roll = hash2(p.last_tile, 0x53);
            if roll < cfg::config().bonus_catch_chance {
                n += 1;
            }
            /* Landed catch is an item award to the player - hotbar first, then
             * the bag (same routing as pickups + crafts). */
            crate::bag::give(&mut p.inventory, &mut p.bag, item, n);
            HUD_LINE.with(|l| {
                let name = caught_species.display_name();
                *l.borrow_mut() = if n > 1 {
                    format!("landed {n} {name}!")
                } else {
                    format!("landed a {name}!")
                };
            });
            CAUGHT_FLASH_T.with(|c| c.set(1.8));
        }
    }
}

/// The reaction window (seconds) for a bite of `species`: the base
/// window from config, shrunk by strength so the twitchy reef fish
/// gives you barely half the time a minnow does.
fn bite_window_for(c: &cfg::FishingConfig, species: AnimalKind) -> f32 {
    let strength = species.fish_strength().max(1) as f32;
    /* strength 1 -> x1.0, strength 5 -> x0.48. */
    let factor = 1.0 - (strength - 1.0) * 0.13;
    (c.bite_window_s * factor).max(0.25)
}

/// Tiny colored box centred at `c` (bobber halves).
fn bob_box(c: DVec3, h: f64, r: f32, g: f32, b: f32, lit: f32) {
    let (x0, x1) = ((c.x - h) as f32, (c.x + h) as f32);
    let (y0, y1) = ((c.y - h) as f32, (c.y + h) as f32);
    let (z0, z1) = ((c.z - h) as f32, (c.z + h) as f32);
    sgl::c3f(r * lit, g * lit, b * lit);
    let quads: [[[f32; 3]; 4]; 6] = [
        [[x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0]],
        [[x0, y0, z1], [x0, y0, z0], [x1, y0, z0], [x1, y0, z1]],
        [[x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [x1, y0, z0]],
        [[x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [x0, y0, z1]],
        [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]],
        [[x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [x0, y0, z0]],
    ];
    for q in quads.iter() {
        for &i in &[0usize, 1, 2, 0, 2, 3] {
            sgl::v3f(q[i][0], q[i][1], q[i][2]);
        }
    }
}

/// Draw the line + bobber into the offscreen world pass. `view` is the
/// eye-at-origin scene view (`view_scene`), so every emitted vertex is
/// FLOATING-ORIGIN rebased to the camera (`world - camera_world_d`) - the
/// same convention the other props use. Feeding absolute world positions
/// here jittered the rod + bobber at ~150 km (f32 `view * abs_pos`
/// catastrophic cancellation).
pub fn draw(view: Mat4, proj: Mat4, p: &PlayerCtrl) {
    let Some((pos_abs, phase)) = S.with(|s| s.borrow().as_ref().map(|st| (st.pos, st.phase))) else {
        return;
    };
    renderer::sgl_world_begin();
    sgl::defaults();
    sgl::matrix_mode_projection();
    sgl::load_matrix(&proj.m[0]);
    sgl::matrix_mode_modelview();
    sgl::load_matrix(&view.m[0]);

    let mut pip = PIP3D.with(|c| c.get());
    if pip.id == 0 {
        pip = sgl::make_pipeline(&sokol::gfx::PipelineDesc {
            depth: sokol::gfx::DepthState {
                write_enabled: true,
                compare: sokol::gfx::CompareFunc::Less,
                ..Default::default()
            },
            cull_mode: sokol::gfx::CullMode::None,
            ..Default::default()
        });
        PIP3D.with(|c| c.set(pip));
    }
    sgl::load_pipeline(pip);

    /* Sun brightness reads the ABSOLUTE world pos (it rebases internally). */
    let lit = renderer::entity_sun_brightness(pos_abs).max(0.35);
    /* FLOATING ORIGIN: rebase every drawn point by the camera so the
     * eye-at-origin scene view keeps f32 precise at any world scale. Basis
     * vectors are directions, so they need no rebasing. */
    let cam = renderer::camera_world_d();
    let tip = dvec3_sub(rod_tip(p), cam);
    let grip = dvec3_sub(rod_grip(p), cam);
    let pos = dvec3_sub(pos_abs, cam);

    /* The rod shaft: a tapered wood pole from the grip up to the tip,
     * so the line visibly pays out of a rod rather than thin air. */
    sgl::begin_triangles();
    shaft_box(grip, tip, 0.022, 0.008, p.basis.right, 0.42, 0.26, 0.12, lit);
    sgl::end();

    /* The line. */
    sgl::begin_lines();
    sgl::c3f(0.9 * lit, 0.9 * lit, 0.88 * lit);
    sgl::v3f(tip.x as f32, tip.y as f32, tip.z as f32);
    sgl::v3f(pos.x as f32, pos.y as f32, pos.z as f32);
    sgl::end();

    /* The bobber: red cap over a white base (offset along the player's
     * up - close enough to the bobber's own radial); flush red during
     * a bite so the dip reads instantly. */
    sgl::begin_triangles();
    let bite = phase == Phase::Bite;
    let up = p.basis.up;
    bob_box(dvec3_add(pos, dvec3_scale(up, 0.05)), 0.055, 0.95, if bite { 0.1 } else { 0.2 }, 0.12, lit);
    bob_box(dvec3_add(pos, dvec3_scale(up, -0.05)), 0.05, 0.95, 0.94, 0.9, lit);
    sgl::end();

    renderer::sgl_world_end();
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hint_is_none_without_a_line() {
        S.with(|s| *s.borrow_mut() = None);
        CAUGHT_FLASH_T.with(|c| c.set(0.0));
        assert!(hint().is_none());
        assert!(!is_active());
    }
}
