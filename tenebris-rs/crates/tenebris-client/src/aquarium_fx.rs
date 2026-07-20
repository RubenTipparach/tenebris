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
use tenebris_core::config;
use tenebris_core::fauna::AnimalKind;
use tenebris_core::goldberg::MAX_VERTS_PER_TILE;
use tenebris_core::math::{
    dvec3_add, dvec3_cross, dvec3_make, dvec3_normalize, dvec3_scale, dvec3_sub, DVec3, Vec3,
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
/// Water surface drop below the tank's top face - matches
/// `hex_mesher::AQUARIUM_WATER_DROP_M` (where the surface is actually
/// drawn) so the side gradient's surface reference lines up with it.
const WATER_DROP_M: f64 = 0.22;
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
    /// This tank holds water (its glass sides + floor are tinted with the
    /// planet's water colour so the cell reads as full of water).
    filled: bool,
    /// Radius of the WATER SURFACE for this cell's whole column (the top of
    /// the topmost filled tank in the stack, minus the surface drop). The
    /// side shading grades by depth BELOW this - shared by every cell in a
    /// stacked column, so the column reads as one body of water with no
    /// per-cell seam.
    surface_r: f64,
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

/// Is the cell `(tile, depth)` a WATER-FILLED aquarium?
fn filled_water_at(w: &World, tile: i32, depth: i32) -> bool {
    w.get(tile, depth) == Block::Aquarium
        && w.block_entities
            .get(tile, depth)
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
        let filled = aq.map(|a| a.water).unwrap_or(false);
        /* Water surface radius for the WHOLE column: scan up while the cell
         * above is another filled tank, so a stacked column shares one
         * surface and its side shading grades continuously (no per-cell
         * seam). */
        let surface_r = if filled {
            let mut top = depth;
            while filled_water_at(w, tile, top + 1) {
                top += 1;
            }
            w.depth_to_radius_m(top + 1) - WATER_DROP_M
        } else {
            0.0
        };
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
            filled,
            surface_r,
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

/// The planet's water palette (from `lod.yaml`, the same values the water
/// block reads): the near-surface colour, the deep colour it grades to, and
/// the e-folding depth (m) over which it does so.
struct WaterPalette {
    surface: Vec3,
    deep: Vec3,
    full_depth_m: f64,
}

impl WaterPalette {
    /// Resolve the palette for the body's tileset.
    fn for_body(w: &World) -> WaterPalette {
        let ts = (w.body.tileset as usize).min(4);
        let lod = config::lod();
        let surface = lod.tileset_water_color[ts];
        let mut deep = lod.tileset_water_deep_color[ts];
        /* {0,0,0} deep colour = "use a sane default": a darkened surface
         * colour, matching the water shader's own fallback intent. */
        if deep.x == 0.0 && deep.y == 0.0 && deep.z == 0.0 {
            deep = Vec3 { x: surface.x * 0.30, y: surface.y * 0.34, z: surface.z * 0.42 };
        }
        let full = lod.tileset_water_full_depth_m[ts];
        WaterPalette { surface, deep, full_depth_m: if full > 0.0 { full as f64 } else { 2.5 } }
    }

    /// Beer-Lambert-ish colour at `depth_below` metres under the surface:
    /// the surface colour near the top grading to the deep colour with
    /// depth (`1 - exp(-d/full)`), pre-multiplied by the lit factor. Alpha
    /// climbs a little with depth so deep water reads more solid. Because
    /// this keys off ABSOLUTE depth below the shared column surface, a
    /// stacked column grades as one continuous body.
    fn color(&self, depth_below: f64, l: f32) -> [f32; 4] {
        let t = (1.0 - (-(depth_below.max(0.0)) / self.full_depth_m).exp()) as f32;
        let mix = |a: f32, b: f32| (a + (b - a) * t) * l;
        [
            mix(self.surface.x, self.deep.x),
            mix(self.surface.y, self.deep.y),
            mix(self.surface.z, self.deep.z),
            0.46 + 0.30 * t,
        ]
    }
}

pub fn draw(w: &World, view: Mat4, proj: Mat4, time_s: f32) {
    if renderer::dev_hidden("aquarium") {
        return;
    }
    let cells = cells(w);
    if cells.is_empty() {
        return;
    }
    let body_c = dvec3_make(w.body.pos_x, w.body.pos_y, w.body.pos_z);
    /* Floating origin: the glass-shell vertices are baked as body_c + offset,
     * so at heliocentric scale (body ~150 km off the world origin) absolute
     * f32 vertices jitter. Rebase the body centre by the absolute camera and
     * draw with the eye-at-origin scene view (the caller passes view_scene),
     * matching the other props. The tank FISH keep an ABSOLUTE position -
     * draw_kind rebases them through sgl_translate_scene - so only the shells
     * use body_cr. */
    let body_cr = dvec3_sub(body_c, renderer::camera_world_d());

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

    /* The planet's water palette (lod.yaml) - the same colours the water
     * block reads - so a filled tank matches the ocean of the world it's on
     * (Tenebris blue, Sequoia green). */
    let water = WaterPalette::for_body(w);

    for c in &cells {
        let l = c.lit;
        let corner_top = |k: usize| dvec3_add(body_cr, dvec3_scale(c.corners[k], c.r_top));
        let corner_bot = |k: usize| dvec3_add(body_cr, dvec3_scale(c.corners[k], c.r_bot));

        /* Top glass lid: only on an EMPTY glass box (a filled tank shows
         * its water surface instead, drawn below). Pale, near-clear glass. */
        if c.top && !c.filled {
            sgl::c4f(0.80 * l, 0.90 * l, 0.96 * l, 0.22);
            for k in 1..c.n - 1 {
                v(corner_top(0));
                v(corner_top(k));
                v(corner_top(k + 1));
                v(corner_top(0));
                v(corner_top(k + 1));
                v(corner_top(k));
            }
        }
        if c.bottom {
            /* A filled tank's floor sits at the bottom of the water column
             * -> the deep water colour; an empty glass box keeps the pale
             * glass tint. */
            if c.filled {
                let [r, g, b, a] = water.color(c.surface_r - c.r_bot, l);
                sgl::c4f(r, g, b, a);
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
        /* Side walls (flat - the water is held against the glass, so no
         * waves). A FILLED tank shades them by DEPTH BELOW THE COLUMN'S
         * SURFACE using the planet's water palette, so a stacked column
         * reads as one continuous body of water (no per-cell seam) and
         * matches the ocean's colour. Empty glass keeps the near-clear
         * tint. Fish were drawn first, so they show through the walls. */
        if c.filled {
            let ctop = water.color(c.surface_r - c.r_top, l);
            let cbot = water.color(c.surface_r - c.r_bot, l);
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

        /* The water SURFACE is not drawn here - it's emitted into the water
         * mesh (hex_mesher::build_aquarium_water) so it renders through the
         * water shader (refraction / fresnel), exactly like the ocean. */
    }

    sgl::end();
    renderer::sgl_world_end();
}
