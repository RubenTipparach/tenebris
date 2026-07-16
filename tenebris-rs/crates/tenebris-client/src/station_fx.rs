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

use tenebris_core::math::{dvec3_cross, dvec3_make, dvec3_normalize, dvec3_sub};
use tenebris_core::planet::{self, BodyId};
use tenebris_core::station::{self, Prism, StairStep, StationMat, HEX_DIRS, STAIR_TREAD_M};

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
const TEX_PLANT: usize = 7;
const TEX_COUNT: usize = 8;

/// Face shading (multiplied by the sun term): caps bright, keels dark,
/// sides alternating so the hex facets read in silhouette.
const SHADE_TOP: f32 = 1.0;
const SHADE_BOTTOM: f32 = 0.45;
const SHADE_SIDE_A: f32 = 0.78;
const SHADE_SIDE_B: f32 = 0.62;
/// Emissive materials (neon, signs) never drop below this sun term -
/// they are the station's own lights, indoors and at night.
const EMISSIVE_MIN_LIT: f32 = 1.0;

fn tex_for(m: StationMat) -> usize {
    match m {
        StationMat::Hull => TEX_HULL,
        StationMat::Floor => TEX_FLOOR,
        StationMat::Carpet => TEX_CARPET,
        StationMat::Neon => TEX_NEON,
        StationMat::Sign => TEX_SIGN,
        StationMat::Wall => TEX_WALL,
        StationMat::Glass => TEX_GLASS,
        StationMat::Plant => TEX_PLANT,
    }
}

struct ShellCache {
    groups: [Vec<Prism>; TEX_COUNT],
    steps: Vec<StairStep>,
    occupied: HashSet<(i32, i32, i32)>,
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
    ShellCache { groups, steps: station::stairs(&cfg), occupied }
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
/// the on-rails orbit is a function of.
pub fn draw(view: Mat4, proj: Mat4, sim_t: f64) {
    let cfg = station::config();
    let anchor = station::orbit_pos(sim_t);
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
            TEX_HULL, TEX_FLOOR, TEX_CARPET, TEX_WALL, TEX_PLANT, TEX_NEON, TEX_SIGN, TEX_GLASS,
        ];
        for tex in order {
            let prisms = &cache.groups[tex];
            if prisms.is_empty() && tex != TEX_HULL {
                continue;
            }
            /* Neon + signs are the station's own lighting: they stay
             * bright indoors and at night. */
            let lit = if tex == TEX_NEON || tex == TEX_SIGN {
                lit.max(EMISSIVE_MIN_LIT)
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
                let (y0, y1) = (p.y, p.y + lh);
                /* Glass never culls against neighbours (a pane next to a
                 * wall still shows); solids cull occupied neighbours. */
                let solid = tex != TEX_GLASS;
                if !solid || !cache.occupied.contains(&(p.q, p.r, p.layer + 1)) {
                    emit_cap(p.x, p.z, a, y1, SHADE_TOP * lit);
                }
                if !solid || !cache.occupied.contains(&(p.q, p.r, p.layer - 1)) {
                    emit_cap(p.x, p.z, a, y0, SHADE_BOTTOM * lit);
                }
                for k in 0..6 {
                    /* Side k's outward normal points at 60(k+1) degrees,
                     * which is axial direction HEX_DIRS[(k+1) % 6]. */
                    let (dq, dr) = HEX_DIRS[(k + 1) % 6];
                    if !solid || !cache.occupied.contains(&(p.q + dq, p.r + dr, p.layer)) {
                        emit_side(p.x, p.z, a, k, y0, y1, lit);
                    }
                }
            }
            /* The spiral stair treads ride the hull group: thin steel
             * pads, all faces (they float in room air). */
            if tex == TEX_HULL {
                for s in &cache.steps {
                    let (y0, y1) = (s.top_m - STAIR_TREAD_M, s.top_m);
                    emit_cap(s.x, s.z, a * 0.8, y1, SHADE_TOP * lit);
                    emit_cap(s.x, s.z, a * 0.8, y0, SHADE_BOTTOM * lit);
                    for k in 0..6 {
                        emit_side(s.x, s.z, a * 0.8, k, y0, y1, lit);
                    }
                }
            }
            sgl::end();
        }
    });
    sgl::pop_matrix();
}
