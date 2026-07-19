//! Glass + aquarium rendering pass.
//!
//! Glass and aquarium blocks are translucent, so - like the bonfire and
//! the water sheet - they're drawn in their OWN pass rather than baked into
//! the opaque terrain mesh (they're skipped in `hex_mesher::build_tile`).
//! Both render as a hex prism matching their voxel cell, so they tile
//! seamlessly with the terrain and with each other; a run of the SAME kind
//! culls its shared internal faces (`blocks::culls_same_kind`) so a glass
//! wall / a bank of aquariums reads as one shell, never a grid of boxes -
//! the same "solid translucent shell" rule the ice fix applies in the
//! mesher.
//!
//! An aquarium adds two things on top of the glass shell:
//!   - a single WATER SURFACE (the top hex cap only - the water is held
//!     against the glass, so there are no water side faces, exactly as the
//!     user asked and mirroring how a filled tank really looks), drawn only
//!     when the tank has been filled with a water bucket, and skipped when a
//!     filled aquarium sits directly above (so a stacked column shows one
//!     surface at the very top);
//!   - the fish it holds, swimming inside on a lazy circular path, drawn
//!     with the same procedural bodies + animal atlas the wild herd uses
//!     (`animals::draw_tank_fish`), shrunk to fit the glass box.
//!
//! Cells to draw are enumerated from `World::block_entities` (every placed
//! glass / aquarium block carries one - facing-only for glass, an
//! `AquariumState` for a tank), the same way `bonfire_fx` finds bonfires.

use std::cell::Cell;

use sokol::gfx as sg;
use sokol::gl as sgl;

use tenebris_core::blocks::{self, Block};
use tenebris_core::fauna::AnimalKind;
use tenebris_core::goldberg::MAX_VERTS_PER_TILE;
use tenebris_core::math::{
    dvec3_add, dvec3_cross, dvec3_make, dvec3_normalize, dvec3_scale, DVec3,
};
use tenebris_core::world::World;

use crate::animals::{self, TankFish};
use crate::gfx_math::Mat4;
use crate::renderer;

thread_local! {
    static PIP: Cell<sgl::Pipeline> = const { Cell::new(sgl::Pipeline { id: 0 }) };
}

/// How much of a fish's natural size fits in a one-metre tank. Small
/// enough that the deep-bodied reef fish and the long serpent still swim
/// inside the glass rather than clipping through it.
const TANK_FISH_SIZE: f32 = 0.42;
/// The water surface sits this far below the glass top so it reads as a
/// sheet held inside the tank, not flush with the rim.
const WATER_DROP_M: f64 = 0.14;
/// Radius (as a fraction of the cell) the fish circle around the centre.
const SWIM_RADIUS: f64 = 0.26;

/// One glass / aquarium cell resolved to world geometry + its draw flags.
struct GlassCell {
    /// Unit corner directions from the body centre (CCW), `n` used.
    corners: [DVec3; MAX_VERTS_PER_TILE],
    n: usize,
    /// Unit direction to the cell centre + radial up.
    center_dir: DVec3,
    r_bot: f64,
    r_top: f64,
    /// Per-face visibility after same-kind culling (top, bottom, sides[k]).
    top: bool,
    bottom: bool,
    side: [bool; MAX_VERTS_PER_TILE],
    /// Aquarium extras.
    is_aquarium: bool,
    /// This tank holds water (its glass sides + floor are tinted blue so
    /// the cell reads as full of water, not an empty box).
    filled: bool,
    /// Draw the water surface (filled, and no filled tank directly above).
    water_surface: bool,
    /// Species wire ids of the fish inside.
    fish: [u8; 8],
    fish_count: usize,
    lit: f32,
}

/// True if `nb` hides `self_b`'s shared face - only when the SAME
/// self-culling glassy block sits across it (the shell rule).
fn culled(self_b: Block, nb: Block) -> bool {
    blocks::culls_same_kind(self_b) && nb == self_b
}

/// Is the cell above `(tile, depth)` a filled aquarium? (Used so a stacked
/// column of tanks shows one water surface at the very top.)
fn filled_tank_above(w: &World, tile: i32, depth: i32) -> bool {
    let above = depth + 1;
    if w.get(tile, above) != Block::Aquarium {
        return false;
    }
    w.block_entities
        .get(tile, above)
        .and_then(|e| e.aquarium().map(|a| a.water))
        .unwrap_or(false)
}

/// Enumerate the glass / aquarium cells to draw this frame.
fn cells(w: &World) -> Vec<GlassCell> {
    let body_c = dvec3_make(w.body.pos_x, w.body.pos_y, w.body.pos_z);
    let mut out = Vec::new();
    for (tile, depth, e) in w.block_entities.iter() {
        let b = w.get(tile, depth);
        if !blocks::is_glassy(b) {
            continue;
        }
        let t = match w.grid.tile(tile) {
            Some(t) => *t,
            None => continue,
        };
        let n = t.num_verts as usize;
        let mut corners = [DVec3 { x: 0.0, y: 0.0, z: 0.0 }; MAX_VERTS_PER_TILE];
        corners[..n].copy_from_slice(&t.verts[..n]);

        /* Face culling: hide the shared face only against the identical
         * glassy block (glass-glass, aquarium-aquarium). */
        let above = w.get(tile, depth + 1);
        let below = if depth > 0 { w.get(tile, depth - 1) } else { Block::Air };
        let mut side = [true; MAX_VERTS_PER_TILE];
        for (k, s) in side.iter_mut().enumerate().take(n) {
            let nb_tile = t.edge_neighbours[k];
            let nb = if nb_tile >= 0 { w.get(nb_tile, depth) } else { Block::Air };
            *s = !culled(b, nb);
        }

        let aq = e.aquarium();
        let is_aquarium = b == Block::Aquarium;
        let filled = aq.map(|a| a.water).unwrap_or(false);
        let water_surface = filled && !filled_tank_above(w, tile, depth);
        let mut fish = [0u8; 8];
        let mut fish_count = 0;
        if let Some(a) = aq {
            for (i, &k) in a.fish().iter().take(fish.len()).enumerate() {
                fish[i] = k;
                fish_count = i + 1;
            }
        }

        let center_dir = dvec3_normalize(t.center);
        let mid = dvec3_scale(center_dir, (w.depth_to_radius_m(depth) + w.depth_to_radius_m(depth + 1)) * 0.5);
        let lit = renderer::entity_sun_brightness(dvec3_add(body_c, mid)).max(0.3);

        out.push(GlassCell {
            corners,
            n,
            center_dir,
            r_bot: w.depth_to_radius_m(depth),
            r_top: w.depth_to_radius_m(depth + 1),
            top: !culled(b, above),
            bottom: depth > 0 && !culled(b, below),
            side,
            is_aquarium,
            filled,
            water_surface,
            fish,
            fish_count,
            lit,
        });
    }
    out
}

/// An orthonormal tangent basis for the plane perpendicular to `up`.
fn tangent_basis(up: DVec3) -> (DVec3, DVec3) {
    let up = dvec3_normalize(up);
    let reference = if up.y.abs() < 0.9 {
        DVec3 { x: 0.0, y: 1.0, z: 0.0 }
    } else {
        DVec3 { x: 1.0, y: 0.0, z: 0.0 }
    };
    let t = dvec3_normalize(dvec3_cross(reference, up));
    (t, dvec3_cross(up, t))
}

#[inline]
fn v(p: DVec3) {
    sgl::v3f(p.x as f32, p.y as f32, p.z as f32);
}

/// Draw a flat quad (two triangles, both windings so it shows from either
/// side - the shell is double-sided).
fn quad(a: DVec3, b: DVec3, c: DVec3, d: DVec3) {
    for &p in &[a, b, c, a, c, d] {
        v(p);
    }
    for &p in &[a, c, b, a, d, c] {
        v(p);
    }
}

/// A side quad with a vertical colour GRADIENT: the two bottom corners
/// (`ba`, `bb`) get `cbot`, the two top corners (`tb`, `ta`) get `ctop`.
/// Used to shade a filled tank's walls from a lighter blue near the water
/// surface down to a deeper blue at the floor, so the cell reads as a body
/// of water. Double-sided like [`quad`].
fn quad_grad(ba: DVec3, bb: DVec3, tb: DVec3, ta: DVec3, cbot: [f32; 4], ctop: [f32; 4]) {
    let vc = |p: DVec3, col: [f32; 4]| {
        sgl::c4f(col[0], col[1], col[2], col[3]);
        v(p);
    };
    /* Front winding. */
    vc(ba, cbot);
    vc(bb, cbot);
    vc(tb, ctop);
    vc(ba, cbot);
    vc(tb, ctop);
    vc(ta, ctop);
    /* Back winding (shell is double-sided). */
    vc(ba, cbot);
    vc(tb, ctop);
    vc(bb, cbot);
    vc(ba, cbot);
    vc(ta, ctop);
    vc(tb, ctop);
}

pub fn draw(w: &World, view: Mat4, proj: Mat4, time_s: f32) {
    let cells = cells(w);
    if cells.is_empty() {
        return;
    }
    let body_c = dvec3_make(w.body.pos_x, w.body.pos_y, w.body.pos_z);

    renderer::sgl_world_begin();
    sgl::defaults();
    sgl::matrix_mode_projection();
    sgl::load_matrix(&proj.m[0]);
    sgl::matrix_mode_modelview();
    sgl::load_matrix(&view.m[0]);

    /* Pass 1: the fish, first, so their opaque bodies write depth and the
     * translucent glass below blends over them. */
    let mut fish: Vec<TankFish> = Vec::new();
    for c in &cells {
        if c.fish_count == 0 {
            continue;
        }
        let up = c.center_dir;
        let (tx, ty) = tangent_basis(up);
        let mid_r = (c.r_bot + c.r_top) * 0.5;
        let base = dvec3_add(body_c, dvec3_scale(up, mid_r));
        for i in 0..c.fish_count {
            let kind = AnimalKind::from_u8(c.fish[i]);
            /* Each fish circles at its own phase + a small vertical bob so
             * the school doesn't move in lockstep. */
            let ph = time_s as f64 * 0.5 + i as f64 * 2.3;
            let cos = ph.cos();
            let sin = ph.sin();
            let horiz = dvec3_add(
                dvec3_scale(tx, cos * SWIM_RADIUS),
                dvec3_scale(ty, sin * SWIM_RADIUS),
            );
            let bob = dvec3_scale(up, (ph * 0.7).sin() * 0.1);
            let pos = dvec3_add(dvec3_add(base, horiz), bob);
            /* Heading = the tangent of the circular path (derivative). */
            let heading = dvec3_normalize(dvec3_add(
                dvec3_scale(tx, -sin),
                dvec3_scale(ty, cos),
            ));
            fish.push((kind, pos, up, heading, ph as f32 * 4.0, c.lit, TANK_FISH_SIZE));
        }
    }
    animals::draw_tank_fish(&fish);

    /* Pass 2: the translucent glass shells + water surfaces. Depth-tested
     * (terrain in front occludes) but not depth-written (transparent). */
    let mut pip = PIP.with(|p| p.get());
    if pip.id == 0 {
        let mut desc = sg::PipelineDesc {
            depth: sg::DepthState {
                write_enabled: false,
                compare: sg::CompareFunc::LessEqual,
                ..Default::default()
            },
            cull_mode: sg::CullMode::None,
            ..Default::default()
        };
        desc.colors[0].blend = sg::BlendState {
            enabled: true,
            src_factor_rgb: sg::BlendFactor::SrcAlpha,
            dst_factor_rgb: sg::BlendFactor::OneMinusSrcAlpha,
            src_factor_alpha: sg::BlendFactor::One,
            dst_factor_alpha: sg::BlendFactor::OneMinusSrcAlpha,
            ..Default::default()
        };
        pip = sgl::make_pipeline(&desc);
        PIP.with(|p| p.set(pip));
    }
    sgl::load_pipeline(pip);
    sgl::begin_triangles();

    for c in &cells {
        let l = c.lit;
        /* Glass: pale cyan, quite transparent; a hair brighter on the top
         * cap than the sides for a little form. */
        let corner_top = |k: usize| dvec3_add(body_c, dvec3_scale(c.corners[k], c.r_top));
        let corner_bot = |k: usize| dvec3_add(body_c, dvec3_scale(c.corners[k], c.r_bot));

        if c.top {
            sgl::c4f(0.80 * l, 0.90 * l, 0.96 * l, 0.24);
            /* Fan the top hex from vertex 0. */
            for k in 1..c.n - 1 {
                v(corner_top(0));
                v(corner_top(k));
                v(corner_top(k + 1));
                /* back winding too */
                v(corner_top(0));
                v(corner_top(k + 1));
                v(corner_top(k));
            }
        }
        if c.bottom {
            /* A filled tank's floor sits under water -> deep blue; an empty
             * glass box keeps the pale glass tint. */
            if c.filled {
                sgl::c4f(0.10 * l, 0.30 * l, 0.52 * l, 0.62);
            } else {
                sgl::c4f(0.60 * l, 0.72 * l, 0.80 * l, 0.24);
            }
            for k in 1..c.n - 1 {
                v(corner_bot(0));
                v(corner_bot(k + 1));
                v(corner_bot(k));
                v(corner_bot(0));
                v(corner_bot(k));
                v(corner_bot(k + 1));
            }
        }
        /* Side walls. A FILLED tank shades them blue with a top-to-bottom
         * depth gradient (lighter near the surface, deeper at the floor) so
         * the cell reads as a body of blue water held behind the glass;
         * empty glass keeps the near-clear pale tint. Fish were drawn first,
         * so they show through the tinted walls. */
        if c.filled {
            let ctop = [0.30 * l, 0.58 * l, 0.80 * l, 0.42];
            let cbot = [0.11 * l, 0.34 * l, 0.58 * l, 0.56];
            for k in 0..c.n {
                if !c.side[k] {
                    continue;
                }
                let k1 = (k + 1) % c.n;
                quad_grad(
                    corner_bot(k),
                    corner_bot(k1),
                    corner_top(k1),
                    corner_top(k),
                    cbot,
                    ctop,
                );
            }
        } else {
            sgl::c4f(0.70 * l, 0.83 * l, 0.90 * l, 0.20);
            for k in 0..c.n {
                if !c.side[k] {
                    continue;
                }
                let k1 = (k + 1) % c.n;
                quad(corner_bot(k), corner_bot(k1), corner_top(k1), corner_top(k));
            }
        }

        /* Aquarium water surface: one hex cap just below the glass top.
         * No side faces - the glass holds the water against the walls. */
        if c.is_aquarium && c.water_surface {
            let wr = c.r_top - WATER_DROP_M;
            let corner_w = |k: usize| dvec3_add(body_c, dvec3_scale(c.corners[k], wr));
            sgl::c4f(0.24 * l, 0.52 * l, 0.74 * l, 0.62);
            for k in 1..c.n - 1 {
                v(corner_w(0));
                v(corner_w(k));
                v(corner_w(k + 1));
                v(corner_w(0));
                v(corner_w(k + 1));
                v(corner_w(k));
            }
        }
    }

    sgl::end();
    renderer::sgl_world_end();
}
