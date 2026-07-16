//! Orbital station rendering.
//!
//! Draws the trading station's wheel structure (`core::station::shell` -
//! ring deck, glazed courtyard with hedges, casino hotel tower with
//! windows / storeys / spiral stairs, docking pads) at its on-rails
//! orbital anchor (`core::station::orbit_pos`), textured with the casino
//! tile set baked by tools/gen-casino-textures.py. Rendered
//! immediate-mode into the renderer's world sgl context (same as
//! `rocket_fx` / `animals`) so it depth-sorts against terrain and gets
//! the composite/fog.
//!
//! Face culling is generic neighbour-occupancy over the prism grid; the
//! neon / sign materials draw EMISSIVE (a floor under the sun term) so
//! the hotel's interior lights and marquees glow at night; the glass
//! material draws LAST through an alpha-blend pipeline so the courtyard
//! floor and hotel windows read as glazing.
//!
//! Orientation matches `core::station::frame_sample`: station-local +y
//! points radially away from Tenebris, +x rides prograde, +z is the
//! orbit normal, and the local origin (keel plane, y = 0) sits AT the
//! anchor - physics and rendering share one frame.

#![allow(dead_code)]

use std::cell::RefCell;
use std::collections::HashSet;

use sokol::gl as sgl;

use tenebris_core::math::{
    dvec3_add, dvec3_cross, dvec3_length, dvec3_make, dvec3_normalize, dvec3_scale, dvec3_sub,
    DVec3,
};
use tenebris_core::planet::{self, BodyId};
use tenebris_core::station::{self, Prism, StationMat, HEX_DIRS};

use crate::gfx_math::Mat4;
use crate::renderer;

/// Texture slot per skin - order matches renderer::load_station_textures.
const TEX_HULL: usize = 0;
const TEX_FLOOR: usize = 1;
const TEX_CARPET: usize = 2;
const TEX_NEON: usize = 3;
const TEX_SIGN: usize = 4;
const TEX_WALL: usize = 5;
const TEX_GLASS: usize = 6;
const TEX_NEON_PINK: usize = 7;
const TEX_NEON_GOLD: usize = 8;
const TEX_TRADE: usize = 9;
const TEX_RESEARCH: usize = 10;
const TEX_MUSEUM: usize = 11;
const TEX_LIGHT: usize = 12;
const TEX_SLOTS: usize = 13;
const TEX_CARDS: usize = 14;
const TEX_COUNT: usize = 15;

/// Face shading (multiplied by the sun term): caps bright, keels dark,
/// sides alternating so the hex facets read in silhouette.
const SHADE_TOP: f32 = 1.0;
const SHADE_BOTTOM: f32 = 0.45;
const SHADE_SIDE_A: f32 = 0.78;
const SHADE_SIDE_B: f32 = 0.62;
/// Emissive materials (neon, signs) never drop below this sun term -
/// they are the station's own lights, indoors and at night.
const EMISSIVE_MIN_LIT: f32 = 1.0;
/// Glazing keeps a modest glow floor: deck-lit panes must stay visibly
/// SOLID at night rather than reading as open holes.
const GLASS_MIN_LIT: f32 = 0.55;

fn tex_for(m: StationMat) -> usize {
    match m {
        StationMat::Hull => TEX_HULL,
        StationMat::Floor => TEX_FLOOR,
        StationMat::Carpet => TEX_CARPET,
        StationMat::Neon => TEX_NEON,
        StationMat::NeonPink => TEX_NEON_PINK,
        StationMat::NeonGold => TEX_NEON_GOLD,
        StationMat::Sign => TEX_SIGN,
        StationMat::Wall => TEX_WALL,
        StationMat::Glass => TEX_GLASS,
        StationMat::TradeTerminal => TEX_TRADE,
        StationMat::ResearchConsole => TEX_RESEARCH,
        StationMat::MuseumCase => TEX_MUSEUM,
        StationMat::LightFixture => TEX_LIGHT,
        StationMat::Slots => TEX_SLOTS,
        StationMat::CardTable => TEX_CARDS,
    }
}

/// True for the station's own light sources - drawn with a sun-term
/// floor so they glow indoors and at night.
fn is_emissive(tex: usize) -> bool {
    matches!(tex, TEX_NEON | TEX_NEON_PINK | TEX_NEON_GOLD | TEX_SIGN | TEX_LIGHT)
}

struct ShellCache {
    groups: [Vec<Prism>; TEX_COUNT],
    occupied: HashSet<(i32, i32, i32)>,
    /// Baked torch-style block-light field (core::station::light_field):
    /// cell -> 0..15, sampled per face like the world mesher samples the
    /// voxel grid, so the lamps / neon / marquees light the casino.
    light: std::collections::HashMap<(i32, i32, i32), u8>,
}

impl ShellCache {
    /// Block light at a cell as a 0..1 brightness fraction.
    fn light01(&self, q: i32, r: i32, layer: i32) -> f32 {
        self.light.get(&(q, r, layer)).copied().unwrap_or(0) as f32 / 15.0
    }
}

thread_local! {
    /// Shell geometry grouped by texture slot + occupancy, built once.
    static SHELL: RefCell<Option<ShellCache>> = const { RefCell::new(None) };
}

fn build_cache() -> ShellCache {
    let cfg = station::config();
    let mut groups: [Vec<Prism>; TEX_COUNT] = Default::default();
    let mut occupied = HashSet::new();
    for p in station::shell(&cfg) {
        occupied.insert((p.q, p.r, p.layer));
        groups[tex_for(p.mat)].push(p);
    }
    ShellCache { groups, occupied, light: station::light_field(&cfg) }
}

/// Hex corner k (pointy-top) at circumradius `a`, in the local xz plane.
fn corner(a: f32, k: usize) -> (f32, f32) {
    let th = std::f32::consts::PI / 6.0 + k as f32 * std::f32::consts::PI / 3.0;
    (a * th.cos(), a * th.sin())
}

/// Emit one hexagonal cap (6 triangles) at local height `y`.
fn emit_cap(x: f32, z: f32, a: f32, y: f32, shade: f32) {
    sgl::c3f(shade, shade, shade);
    for k in 0..6 {
        let (x0, z0) = corner(a, k);
        let (x1, z1) = corner(a, (k + 1) % 6);
        sgl::v3f_t2f(x, y, z, 0.5, 0.5);
        sgl::v3f_t2f(x + x0, y, z + z0, 0.5 + 0.5 * x0 / a, 0.5 + 0.5 * z0 / a);
        sgl::v3f_t2f(x + x1, y, z + z1, 0.5 + 0.5 * x1 / a, 0.5 + 0.5 * z1 / a);
    }
}

/// Emit side quad k (two triangles) of a prism spanning y0..y1.
fn emit_side(x: f32, z: f32, a: f32, k: usize, y0: f32, y1: f32, lit: f32) {
    let (x0, z0) = corner(a, k);
    let (x1, z1) = corner(a, (k + 1) % 6);
    let s = if k % 2 == 0 { SHADE_SIDE_A } else { SHADE_SIDE_B } * lit;
    sgl::c3f(s, s, s);
    let (bx0, bz0, bx1, bz1) = (x + x0, z + z0, x + x1, z + z1);
    sgl::v3f_t2f(bx0, y0, bz0, 0.0, 1.0);
    sgl::v3f_t2f(bx1, y0, bz1, 1.0, 1.0);
    sgl::v3f_t2f(bx1, y1, bz1, 1.0, 0.0);
    sgl::v3f_t2f(bx0, y0, bz0, 0.0, 1.0);
    sgl::v3f_t2f(bx1, y1, bz1, 1.0, 0.0);
    sgl::v3f_t2f(bx0, y1, bz0, 0.0, 0.0);
}

/// True for the fixtures the client draws as real furniture (built from
/// boxes) rather than hex prisms: the casino games and the trading /
/// research stations, all INSIDE the tower. The museum case + courtyard
/// lamp stay hex prisms out in the courtyard.
fn is_furniture(tex: usize) -> bool {
    matches!(tex, TEX_TRADE | TEX_RESEARCH | TEX_SLOTS | TEX_CARDS)
}

/// Emit one textured quad (two triangles). Corners wind p0->p1->p2->p3;
/// uv maps 0..1 across the face (p0 bottom-left). Cull mode is None so
/// winding doesn't matter - both sides show.
fn emit_quad(p0: [f32; 3], p1: [f32; 3], p2: [f32; 3], p3: [f32; 3], s: f32) {
    sgl::c3f(s, s, s);
    sgl::v3f_t2f(p0[0], p0[1], p0[2], 0.0, 1.0);
    sgl::v3f_t2f(p1[0], p1[1], p1[2], 1.0, 1.0);
    sgl::v3f_t2f(p2[0], p2[1], p2[2], 1.0, 0.0);
    sgl::v3f_t2f(p0[0], p0[1], p0[2], 0.0, 1.0);
    sgl::v3f_t2f(p2[0], p2[1], p2[2], 1.0, 0.0);
    sgl::v3f_t2f(p3[0], p3[1], p3[2], 0.0, 0.0);
}

/// Emit a textured axis-aligned box centred at (cx, cz) with half-extents
/// (hx, hz), spanning y0..y1. Faces use the same cap/side shading as the
/// prisms so the furniture reads with the scene light; the bound texture
/// wraps each face 0..1.
fn emit_box(cx: f32, cz: f32, hx: f32, hz: f32, y0: f32, y1: f32, lit: f32) {
    let (x0, x1) = (cx - hx, cx + hx);
    let (z0, z1) = (cz - hz, cz + hz);
    /* Top + bottom caps. */
    emit_quad([x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1], SHADE_TOP * lit);
    emit_quad([x0, y0, z1], [x1, y0, z1], [x1, y0, z0], [x0, y0, z0], SHADE_BOTTOM * lit);
    /* Four sides (alternating shade so the block's facets read). */
    emit_quad([x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0], SHADE_SIDE_A * lit);
    emit_quad([x0, y0, z1], [x0, y0, z0], [x0, y1, z0], [x0, y1, z1], SHADE_SIDE_A * lit);
    emit_quad([x1, y0, z1], [x0, y0, z1], [x0, y1, z1], [x1, y1, z1], SHADE_SIDE_B * lit);
    emit_quad([x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], SHADE_SIDE_B * lit);
}

/// Draw one casino fixture as furniture on the lobby floor at (x, z),
/// floor surface `y0`. Built from boxes, textured with the bound fixture
/// skin, sized in metres so it reads human-scale inside the tower:
///   - Slots: a chunky slot-machine cabinet (stepped base, body, marquee);
///   - CardTable: a felt table top on a pedestal;
///   - Trade/Research: a console desk with an upright screen.
fn emit_furniture(tex: usize, x: f32, z: f32, y0: f32, lit: f32) {
    match tex {
        TEX_SLOTS => {
            emit_box(x, z, 0.58, 0.48, y0, y0 + 0.28, lit); /* stepped base */
            emit_box(x, z, 0.5, 0.4, y0 + 0.28, y0 + 1.7, lit); /* reel body */
            emit_box(x, z, 0.6, 0.5, y0 + 1.7, y0 + 2.0, lit); /* lit marquee */
        }
        TEX_CARDS => {
            emit_box(x, z, 0.22, 0.22, y0, y0 + 0.72, lit); /* pedestal */
            emit_box(x, z, 0.92, 0.92, y0 + 0.72, y0 + 0.9, lit); /* felt top */
        }
        _ => {
            /* Trade / research console: a desk with an upright flat
             * screen. The thin screen box shows the trade-chart /
             * holo-console skin on its broad faces from any approach. */
            emit_box(x, z, 0.74, 0.5, y0, y0 + 0.9, lit); /* desk */
            emit_box(x, z, 0.62, 0.12, y0 + 0.9, y0 + 1.72, lit); /* screen */
        }
    }
}

/// Far-LOD stand-in: one camera-facing quad at the station anchor, sized
/// as a fixed fraction of its distance (constant apparent size), lit by
/// the same sun term as the full drum. Depth-tested in the world context
/// so the planet occludes it below the horizon.
fn draw_glint(view: Mat4, proj: Mat4, anchor: DVec3, dist: f64, glint_frac: f32) {
    thread_local! {
        static PIP_GLINT: std::cell::Cell<sgl::Pipeline> =
            const { std::cell::Cell::new(sgl::Pipeline { id: 0 }) };
    }
    renderer::sgl_world_begin();
    sgl::defaults();
    sgl::matrix_mode_projection();
    sgl::load_matrix(&proj.m[0]);
    sgl::matrix_mode_modelview();
    sgl::load_matrix(&view.m[0]);
    let pip = PIP_GLINT.with(|p| {
        if p.get().id == 0 {
            /* Opaque dot: depth test + write, no blend, no texture. */
            p.set(sgl::make_pipeline(&sokol::gfx::PipelineDesc {
                depth: sokol::gfx::DepthState {
                    write_enabled: true,
                    compare: sokol::gfx::CompareFunc::Less,
                    ..Default::default()
                },
                cull_mode: sokol::gfx::CullMode::None,
                ..Default::default()
            }));
        }
        p.get()
    });
    sgl::load_pipeline(pip);
    /* Camera right/up straight off the view matrix rows. */
    let right = dvec3_make(view.m[0] as f64, view.m[4] as f64, view.m[8] as f64);
    let up = dvec3_make(view.m[1] as f64, view.m[5] as f64, view.m[9] as f64);
    let h = dist * glint_frac as f64 * 0.5;
    let lit = renderer::entity_sun_brightness(anchor).clamp(0.15, 1.0);
    let c0 = dvec3_add(anchor, dvec3_scale(dvec3_add(right, up), -h));
    let c1 = dvec3_add(anchor, dvec3_scale(dvec3_sub(right, up), h));
    let c2 = dvec3_add(anchor, dvec3_scale(dvec3_add(right, up), h));
    let c3 = dvec3_add(anchor, dvec3_scale(dvec3_sub(up, right), h));
    sgl::begin_triangles();
    sgl::c3f(lit, lit, lit);
    for tri in [[c0, c1, c2], [c0, c2, c3]] {
        for v in tri {
            sgl::v3f(v.x as f32, v.y as f32, v.z as f32);
        }
    }
    sgl::end();
    renderer::sgl_world_end();
}

fn make_pipeline(blend: bool) -> sgl::Pipeline {
    let mut desc = sokol::gfx::PipelineDesc {
        depth: sokol::gfx::DepthState {
            /* Glass tests depth but doesn't write it, so panes layer
             * over each other and the world shows through. */
            write_enabled: !blend,
            compare: sokol::gfx::CompareFunc::Less,
            ..Default::default()
        },
        cull_mode: sokol::gfx::CullMode::None,
        ..Default::default()
    };
    if blend {
        desc.colors[0].blend = sokol::gfx::BlendState {
            enabled: true,
            src_factor_rgb: sokol::gfx::BlendFactor::SrcAlpha,
            dst_factor_rgb: sokol::gfx::BlendFactor::OneMinusSrcAlpha,
            src_factor_alpha: sokol::gfx::BlendFactor::One,
            dst_factor_alpha: sokol::gfx::BlendFactor::OneMinusSrcAlpha,
            ..Default::default()
        };
    }
    sgl::make_pipeline(&desc)
}

/// Draw the orbital station for this frame. `sim_t` is the world clock
/// the on-rails orbit is a function of; `cam_world` drives the distance
/// LOD.
pub fn draw(view: Mat4, proj: Mat4, cam_world: DVec3, sim_t: f64) {
    let cfg = station::config();
    let anchor = station::orbit_pos(sim_t);

    /* Distance LOD (station.yaml lod_full_range_m): the whole wheel is a
     * few tens of metres across on a 9.7 km orbit - sub-pixel from the
     * surface - yet its thousands of textured prisms were re-recorded
     * through sokol_gl EVERY frame ("draw-entities" red on the F3 readout
     * while just standing on the planet). Far away, draw one bright
     * depth-tested glint quad instead: still reads as the station sweeping
     * its track across the sky, for two triangles. */
    let dist = dvec3_length(dvec3_sub(cam_world, anchor));
    if dist > cfg.lod_full_range_m as f64 {
        draw_glint(view, proj, anchor, dist, cfg.lod_glint_frac);
        return;
    }
    let b = planet::get(BodyId::Tenebris);

    /* Orbit frame: +y radial out, +x prograde, +z the orbit normal -
     * identical to core::station::frame_sample. */
    let center = dvec3_make(b.pos_x, b.pos_y, b.pos_z);
    let up = dvec3_normalize(dvec3_sub(anchor, center));
    let prograde = dvec3_normalize(station::orbit_vel(sim_t));
    let normal = dvec3_cross(prograde, up);
    let basis: [f32; 16] = [
        prograde.x as f32, prograde.y as f32, prograde.z as f32, 0.0,
        up.x as f32, up.y as f32, up.z as f32, 0.0,
        normal.x as f32, normal.y as f32, normal.z as f32, 0.0,
        0.0, 0.0, 0.0, 1.0,
    ];

    let lit = renderer::entity_sun_brightness(anchor).clamp(0.15, 1.5);
    let lh = station::layer_h(&cfg);
    let a = cfg.hex_size_m;

    renderer::sgl_world_begin();
    sgl::defaults();
    sgl::matrix_mode_projection();
    sgl::load_matrix(&proj.m[0]);
    sgl::matrix_mode_modelview();
    sgl::load_matrix(&view.m[0]);

    thread_local! {
        static PIP_OPAQUE: std::cell::Cell<sgl::Pipeline> = const { std::cell::Cell::new(sgl::Pipeline { id: 0 }) };
        static PIP_GLASS: std::cell::Cell<sgl::Pipeline> = const { std::cell::Cell::new(sgl::Pipeline { id: 0 }) };
    }
    let pip_opaque = PIP_OPAQUE.with(|p| {
        if p.get().id == 0 {
            p.set(make_pipeline(false));
        }
        p.get()
    });
    let pip_glass = PIP_GLASS.with(|p| {
        if p.get().id == 0 {
            p.set(make_pipeline(true));
        }
        p.get()
    });

    sgl::push_matrix();
    /* Keel plane (local y = 0) at the anchor - same origin the physics
     * frame_sample uses. */
    sgl::translate(anchor.x as f32, anchor.y as f32, anchor.z as f32);
    sgl::mult_matrix(&basis[0]);

    SHELL.with(|cell| {
        let mut cache = cell.borrow_mut();
        let cache = cache.get_or_insert_with(build_cache);
        /* Opaque materials first, glass last so blending sees the scene. */
        let order = [
            TEX_HULL, TEX_FLOOR, TEX_CARPET, TEX_WALL, TEX_TRADE, TEX_RESEARCH, TEX_MUSEUM,
            TEX_SLOTS, TEX_CARDS, TEX_NEON, TEX_NEON_PINK, TEX_NEON_GOLD, TEX_LIGHT, TEX_SIGN,
            TEX_GLASS,
        ];
        for tex in order {
            let prisms = &cache.groups[tex];
            if prisms.is_empty() && tex != TEX_HULL {
                continue;
            }
            /* Neon variants + signs are the station's own lighting: they
             * stay bright indoors and at night. Glass keeps a softer
             * floor so the glazed deck openings always read as solid
             * panes (a night-black pane looks like a hole). */
            let lit = if is_emissive(tex) {
                lit.max(EMISSIVE_MIN_LIT)
            } else if tex == TEX_GLASS {
                lit.max(GLASS_MIN_LIT)
            } else {
                lit
            };
            sgl::load_pipeline(if tex == TEX_GLASS { pip_glass } else { pip_opaque });
            sgl::enable_texture();
            sgl::texture(
                sokol::gfx::View { id: renderer::station_view_id(tex) },
                sokol::gfx::Sampler { id: renderer::rocket_sampler_id() },
            );
            sgl::begin_triangles();
            for p in prisms {
                /* The casino games + trading/research stations draw as
                 * real furniture built from boxes, not hex prisms. Lit
                 * by the block light in their own cell. */
                if is_furniture(tex) {
                    let l = lit.max(cache.light01(p.q, p.r, p.layer));
                    emit_furniture(tex, p.x, p.z, p.y, l);
                    continue;
                }
                let (y0, y1) = (p.y, p.y + lh);
                /* Glass never culls against neighbours (a pane next to a
                 * wall still shows); solids cull occupied neighbours.
                 * Every face samples the propagated block light of the
                 * air cell it faces - max(sun, light), exactly how the
                 * world mesher lights faces from torches - so lamps /
                 * neon / marquees light the casino rooms. */
                let solid = tex != TEX_GLASS;
                if !solid || !cache.occupied.contains(&(p.q, p.r, p.layer + 1)) {
                    let l = lit.max(cache.light01(p.q, p.r, p.layer + 1));
                    emit_cap(p.x, p.z, a, y1, SHADE_TOP * l);
                }
                if !solid || !cache.occupied.contains(&(p.q, p.r, p.layer - 1)) {
                    let l = lit.max(cache.light01(p.q, p.r, p.layer - 1));
                    emit_cap(p.x, p.z, a, y0, SHADE_BOTTOM * l);
                }
                for k in 0..6 {
                    /* Side k's outward normal points at 60(k+1) degrees,
                     * which is axial direction HEX_DIRS[(k+1) % 6]. */
                    let (dq, dr) = HEX_DIRS[(k + 1) % 6];
                    if !solid || !cache.occupied.contains(&(p.q + dq, p.r + dr, p.layer)) {
                        let l = lit.max(cache.light01(p.q + dq, p.r + dr, p.layer));
                        emit_side(p.x, p.z, a, k, y0, y1, l);
                    }
                }
            }
            sgl::end();
        }
    });
    sgl::pop_matrix();
}
