//! Floating item drops (client) - the Minecraft-style pickup loop:
//! breaking a block spawns a small spinning textured HEX PRISM (the
//! world's block shape in miniature) at the break site; walking near
//! vacuums it into the hotbar / bag.
//!
//! Drops are transient entities, not world state: they despawn after
//! [`DESPAWN_S`] like their Minecraft counterparts, so they are NOT
//! persisted (the CLAUDE.md same-frame rule covers the block edit that
//! spawned them - the removed block is already saved). They are also
//! local to the player who broke the block: in MP the breaking client
//! owns the loot, matching the previous direct-to-inventory behaviour,
//! so remote edits never double-spawn loot.

use std::cell::{Cell, RefCell};

use sokol::gl as sgl;

use tenebris_core::blocks::{face_tile, Block, FaceCap};
use tenebris_core::items::{self, ItemId};
use tenebris_core::math::{
    dvec3_add, dvec3_cross, dvec3_length, dvec3_make, dvec3_normalize, dvec3_scale, dvec3_sub,
    DVec3,
};
use tenebris_core::world::World;

use crate::gfx_math::Mat4;
use crate::hex_mesher::HEX_ATLAS_U_STEP;
use crate::inventory;
use crate::player_ctrl::PlayerCtrl;
use crate::renderer;

/// Footprint radius + half-height of the floating mini hex prism
/// (metres). Blocks are hex prisms, so their drops are too.
const HEX_RADIUS_M: f64 = 0.16;
const HEX_HALF_H_M: f64 = 0.10;
/// Bob amplitude + rate, spin rate.
const BOB_AMPL_M: f64 = 0.05;
const BOB_RATE: f32 = 2.2;
const SPIN_RATE: f32 = 1.5;
/// Drops inside this range get pulled toward the player...
const MAGNET_RADIUS_M: f64 = 2.6;
/// ...and collected once they're this close.
const PICKUP_RADIUS_M: f64 = 1.2;
const MAGNET_SPEED_MPS: f64 = 7.0;
/// Uncollected drops vanish after this long (Minecraft parity).
const DESPAWN_S: f32 = 300.0;

#[derive(Clone, Copy, Debug)]
struct Drop {
    pos: DVec3,
    /// Surface-up at the spawn cell (bob axis).
    up: DVec3,
    item: ItemId,
    count: u16,
    age_s: f32,
    /// Per-drop phase so a pile of drops doesn't bob in lockstep.
    phase: f32,
}

thread_local! {
    static S: RefCell<Vec<Drop>> = const { RefCell::new(Vec::new()) };
    static PIP: Cell<sgl::Pipeline> = const { Cell::new(sgl::Pipeline { id: 0 }) };
}

/// Clear all drops (world enter / leave).
pub fn init() {
    S.with(|c| c.borrow_mut().clear());
}

pub fn count() -> usize {
    S.with(|c| c.borrow().len())
}

/// Spawn a drop at the centre of world cell (tile, depth).
pub fn spawn(w: &World, tile: i32, depth: i32, item: ItemId, count: u16) {
    let Some(t) = w.grid.tile(tile) else { return };
    let mid_r = (w.depth_to_radius_m(depth) + w.depth_to_radius_m(depth + 1)) * 0.5;
    let center = dvec3_make(w.body.pos_x, w.body.pos_y, w.body.pos_z);
    let pos = dvec3_add(center, dvec3_scale(t.center, mid_r));
    spawn_at(pos, dvec3_normalize(t.center), item, count);
}

/// Spawn a drop at an explicit world position.
pub fn spawn_at(pos: DVec3, up: DVec3, item: ItemId, count: u16) {
    if count == 0 {
        return;
    }
    S.with(|c| {
        let list = &mut *c.borrow_mut();
        let phase = (list.len() as f32 * 1.7) % std::f32::consts::TAU;
        list.push(Drop { pos, up, item, count, age_s: 0.0, phase });
    });
}

/// The block whose texture the drop cube shows. Non-block resources map
/// to the block they visually came from (coal chunk -> coal ore cube).
fn visual_block(item: ItemId) -> Block {
    if let Some(b) = items::to_block(item) {
        if b != Block::Air {
            return b;
        }
    }
    match item {
        items::COAL => Block::CoalOre,
        items::COPPER => Block::CopperOre,
        items::TIN => Block::TinOre,
        items::IRON => Block::IronOre,
        items::SEEDS => Block::Grass,
        items::PLANK | items::STICK => Block::Wood,
        _ => Block::Dirt,
    }
}

/// Per-frame: age, magnet toward the player, collect in pickup range.
/// Routing matches the old direct-add: placeable blocks go to the hotbar
/// (`inventory::add`), everything else to the bag. A drop that doesn't
/// fit (hotbar full) stays on the ground and retries as slots free up.
pub fn update(dt: f32, p: &mut PlayerCtrl) {
    let player_at = dvec3_add(p.position, dvec3_scale(p.basis.up, 0.8));
    S.with(|c| {
        let list = &mut *c.borrow_mut();
        let mut i = 0;
        while i < list.len() {
            let d = &mut list[i];
            d.age_s += dt;
            let to_player = dvec3_sub(player_at, d.pos);
            let dist = dvec3_length(to_player);
            let mut collected = false;
            if dist < PICKUP_RADIUS_M {
                collected = try_collect(p, d.item, d.count);
            } else if dist < MAGNET_RADIUS_M && dist > 1e-6 {
                /* Accelerating pull, faster the closer it gets. */
                let speed = MAGNET_SPEED_MPS * (1.0 + (MAGNET_RADIUS_M - dist));
                let step = (speed * dt as f64).min(dist);
                d.pos = dvec3_add(d.pos, dvec3_scale(to_player, step / dist));
            }
            if collected || d.age_s > DESPAWN_S {
                list.swap_remove(i);
            } else {
                i += 1;
            }
        }
    });
}

fn try_collect(p: &mut PlayerCtrl, item: ItemId, count: u16) -> bool {
    if let Some(b) = items::to_block(item) {
        /* Blocks stack into the hotbar one by one; bail (and keep the
         * drop) if the hotbar is full for this type. */
        for k in 0..count {
            if !inventory::add(&mut p.inventory, b) {
                return k > 0; /* partial pickups keep it simple: all-or-first */
            }
        }
        true
    } else {
        p.bag.add(item, count) == 0
    }
}

/* ---------------------------------------------------------------------- */
/* Rendering: one mini textured hex prism per drop, bobbing + spinning,    */
/* in the offscreen world sgl context (same pass as animals / crops).      */

/// Draw all drops. `time_s` drives bob + spin.
pub fn draw(view: Mat4, proj: Mat4, time_s: f32) {
    let list = S.with(|c| c.borrow().clone());
    if list.is_empty() {
        return;
    }

    renderer::sgl_world_begin();
    sgl::defaults();
    sgl::matrix_mode_projection();
    sgl::load_matrix(&proj.m[0]);
    sgl::matrix_mode_modelview();
    sgl::load_matrix(&view.m[0]);

    let mut pip = PIP.with(|p| p.get());
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
        PIP.with(|p| p.set(pip));
    }
    sgl::load_pipeline(pip);
    sgl::enable_texture();
    sgl::texture(
        sokol::gfx::View { id: renderer::atlas_view_id() },
        sokol::gfx::Sampler { id: renderer::atlas_sampler_id() },
    );

    for d in &list {
        let bob = (time_s * BOB_RATE + d.phase).sin() as f64 * BOB_AMPL_M;
        let pos = dvec3_add(d.pos, dvec3_scale(d.up, bob));
        let spin = time_s * SPIN_RATE + d.phase;
        let lit = renderer::entity_sun_brightness(d.pos);
        draw_hex(pos, d.up, spin, visual_block(d.item), lit);
    }

    sgl::disable_texture();
    renderer::sgl_world_end();
}

/// One textured mini hex prism at `pos`, spun `angle` about `up` -
/// the same silhouette as a world block, in miniature. Caps sample the
/// block's top/bottom tiles (hex inscribed in the tile column's square);
/// the six side quads sample the side tile.
fn draw_hex(pos: DVec3, up: DVec3, angle: f32, block: Block, lit: f32) {
    let up = dvec3_normalize(up);
    let reference = if up.y.abs() < 0.9 {
        dvec3_make(0.0, 1.0, 0.0)
    } else {
        dvec3_make(1.0, 0.0, 0.0)
    };
    let r0 = dvec3_normalize(dvec3_cross(reference, up));
    let f0 = dvec3_cross(up, r0);
    let (ca, sa) = (angle.cos() as f64, angle.sin() as f64);
    let right = dvec3_add(dvec3_scale(r0, ca), dvec3_scale(f0, sa));
    let fwd = dvec3_sub(dvec3_scale(f0, ca), dvec3_scale(r0, sa));
    let uy = dvec3_scale(up, HEX_HALF_H_M);

    /* Six rim directions (unit, in the prism's spun tangent plane) and
     * the cap-UV trig that maps the hexagon onto the square tile. */
    let mut rim = [DVec3::default(); 6];
    let mut trig = [(0.0f32, 0.0f32); 6];
    for (k, (rimk, trigk)) in rim.iter_mut().zip(trig.iter_mut()).enumerate() {
        let ang = k as f64 / 6.0 * std::f64::consts::TAU;
        *rimk = dvec3_add(dvec3_scale(right, ang.cos()), dvec3_scale(fwd, ang.sin()));
        *trigk = (ang.cos() as f32, ang.sin() as f32);
    }
    let corner = |k: usize, top: bool| {
        let radial = dvec3_scale(rim[k % 6], HEX_RADIUS_M);
        let v = dvec3_add(pos, radial);
        if top {
            dvec3_add(v, uy)
        } else {
            dvec3_sub(v, uy)
        }
    };

    let col_u = |cap: FaceCap| {
        let col = face_tile(block, cap) as i32;
        (col as f32 * HEX_ATLAS_U_STEP, (col + 1) as f32 * HEX_ATLAS_U_STEP)
    };
    let (tu0, tu1) = col_u(FaceCap::Top);
    let (bu0, bu1) = col_u(FaceCap::Bottom);
    let (su0, su1) = col_u(FaceCap::Side);

    let vtx = |p: DVec3, u: f32, v: f32| {
        sgl::v3f_t2f(p.x as f32, p.y as f32, p.z as f32, u, v);
    };

    sgl::begin_triangles();
    /* Top + bottom caps: fans from the cap centre, hex inscribed in the
     * tile's UV square. */
    for (u0, u1, top, shade) in [(tu0, tu1, true, 1.0f32), (bu0, bu1, false, 0.55)] {
        let s = shade * lit;
        sgl::c3f(s, s, s);
        let umid = (u0 + u1) * 0.5;
        let uhal = (u1 - u0) * 0.5;
        let centre = if top { dvec3_add(pos, uy) } else { dvec3_sub(pos, uy) };
        for k in 0..6 {
            let n = (k + 1) % 6;
            let (ka, kb) = if top { (k, n) } else { (n, k) };
            vtx(centre, umid, 0.5);
            vtx(corner(ka, top), umid + uhal * trig[ka].0, 0.5 + 0.5 * trig[ka].1);
            vtx(corner(kb, top), umid + uhal * trig[kb].0, 0.5 + 0.5 * trig[kb].1);
        }
    }
    /* Six side quads, shade cycling for depth. */
    for k in 0..6 {
        let n = (k + 1) % 6;
        let shade = [0.85f32, 0.75, 0.7, 0.75, 0.8, 0.72][k];
        let s = shade * lit;
        sgl::c3f(s, s, s);
        let quad = [
            (corner(k, false), su0, 1.0f32),
            (corner(n, false), su1, 1.0),
            (corner(n, true), su1, 0.0),
            (corner(k, true), su0, 0.0),
        ];
        for &i in &[0usize, 1, 2, 0, 2, 3] {
            let (p, u, v) = quad[i];
            vtx(p, u, v);
        }
    }
    sgl::end();
}

/// Dev/screenshot aid: a short row of drops just ahead of the player.
pub fn dev_spawn(w: &World, p: &PlayerCtrl) {
    let center = dvec3_make(w.body.pos_x, w.body.pos_y, w.body.pos_z);
    let local = dvec3_sub(p.position, center);
    let r = dvec3_length(local);
    for (k, item) in [
        items::from_block(Block::Dirt),
        items::from_block(Block::Stone),
        items::COAL,
        items::from_block(Block::Wood),
    ]
    .into_iter()
    .enumerate()
    {
        let side = (k as f64 - 1.5) * 0.9;
        let point = dvec3_add(
            local,
            dvec3_add(dvec3_scale(p.basis.fwd, 3.5), dvec3_scale(p.basis.right, side)),
        );
        let dir = dvec3_normalize(point);
        let floor = w.walkable_floor_near(w.grid.find_tile(dir, p.last_tile), r, 1.0);
        if floor <= 0.0 {
            continue;
        }
        let pos = dvec3_add(center, dvec3_scale(dir, floor + 0.35));
        spawn_at(pos, dir, item, 1);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::inventory;

    #[test]
    fn magnet_pulls_then_collects_into_hotbar() {
        init();
        let mut p = PlayerCtrl::default();
        inventory::init_empty(&mut p.inventory);
        p.position = dvec3_make(100.0, 0.0, 0.0);
        p.basis.up = dvec3_make(1.0, 0.0, 0.0);
        /* 2 m below the player: inside magnet range, outside pickup. */
        spawn_at(dvec3_make(98.8, 0.0, 0.0), dvec3_make(1.0, 0.0, 0.0), items::from_block(tenebris_core::blocks::Block::Dirt), 1);
        assert_eq!(count(), 1);
        for _ in 0..600 {
            update(1.0 / 60.0, &mut p);
            if count() == 0 {
                break;
            }
        }
        assert_eq!(count(), 0, "drop collected");
        assert_eq!(p.inventory.slots[0].count, 1, "dirt landed in the hotbar");
    }

    #[test]
    fn resources_route_to_the_bag_and_drops_despawn() {
        init();
        let mut p = PlayerCtrl::default();
        inventory::init_empty(&mut p.inventory);
        p.position = dvec3_make(100.0, 0.0, 0.0);
        p.basis.up = dvec3_make(1.0, 0.0, 0.0);
        spawn_at(dvec3_make(100.5, 0.0, 0.0), dvec3_make(1.0, 0.0, 0.0), items::COAL, 3);
        update(1.0 / 60.0, &mut p);
        assert_eq!(p.bag.count_of(items::COAL), 3, "coal went to the bag");
        assert_eq!(count(), 0);

        /* Far away: never collected, despawns after DESPAWN_S. */
        spawn_at(dvec3_make(500.0, 0.0, 0.0), dvec3_make(1.0, 0.0, 0.0), items::COAL, 1);
        update(DESPAWN_S + 1.0, &mut p);
        assert_eq!(count(), 0, "stale drop despawned");
    }
}
