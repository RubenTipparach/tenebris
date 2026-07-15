//! Orbital station drum rendering.
//!
//! Draws the trading station's hex-prism shell (`core::station::shell`) at
//! its on-rails orbital anchor (`core::station::orbit_pos`), textured with
//! the casino tech tile set baked by tools/gen-casino-textures.py. Rendered
//! immediate-mode into the renderer's world sgl context (same as
//! `rocket_fx` / `animals`) so it depth-sorts against terrain and gets the
//! composite/fog - the drum is visible sweeping overhead from the surface.
//!
//! Face culling comes from each prism's [`PrismRole`]: interior disk cells
//! only show caps (their sides face neighbouring prisms), wall cells only
//! show sides plus rim caps on the keel / crown layers. That keeps the
//! whole 900-prism drum around ~30k sgl vertices.
//!
//! Orientation: station-local +y points radially away from Tenebris (decks
//! face the sky), +x rides prograde along the orbit, +z is the orbit
//! normal. The anchor sits at the drum's volumetric centre.

#![allow(dead_code)]

use std::cell::RefCell;

use sokol::gl as sgl;

use tenebris_core::blocks::Block;
use tenebris_core::math::{dvec3_cross, dvec3_normalize, dvec3_sub, dvec3_make};
use tenebris_core::planet::{self, BodyId};
use tenebris_core::station::{self, Prism, PrismRole};

use crate::gfx_math::Mat4;
use crate::renderer;

/// Texture slot per drum skin - order matches renderer::load_station_textures.
const TEX_HULL: usize = 0;
const TEX_FLOOR: usize = 1;
const TEX_CARPET: usize = 2;
const TEX_NEON: usize = 3;
const TEX_SIGN: usize = 4;

/// Face shading (multiplied by the sun term): caps bright, keels dark,
/// sides alternating so the hex facets read in silhouette.
const SHADE_TOP: f32 = 1.0;
const SHADE_BOTTOM: f32 = 0.45;
const SHADE_SIDE_A: f32 = 0.78;
const SHADE_SIDE_B: f32 = 0.62;

fn tex_for(b: Block) -> usize {
    match b {
        Block::StationFloor => TEX_FLOOR,
        Block::CasinoCarpet => TEX_CARPET,
        Block::NeonTrim => TEX_NEON,
        Block::CasinoSign => TEX_SIGN,
        _ => TEX_HULL,
    }
}

thread_local! {
    /// Shell geometry grouped by texture slot, built once from config.
    static SHELL: RefCell<Option<[Vec<Prism>; 5]>> = const { RefCell::new(None) };
}

fn shell_groups() -> [Vec<Prism>; 5] {
    let cfg = station::config();
    let mut groups: [Vec<Prism>; 5] = Default::default();
    for p in station::shell(&cfg) {
        groups[tex_for(p.block)].push(p);
    }
    groups
}

/// Hex corner k (pointy-top) at circumradius `a`, in the local xz plane.
fn corner(a: f32, k: usize) -> (f32, f32) {
    let th = std::f32::consts::PI / 6.0 + k as f32 * std::f32::consts::PI / 3.0;
    (a * th.cos(), a * th.sin())
}

/// Emit one hexagonal cap (6 triangles) at local height `y`.
fn emit_cap(p: &Prism, a: f32, y: f32, shade: f32) {
    sgl::c3f(shade, shade, shade);
    for k in 0..6 {
        let (x0, z0) = corner(a, k);
        let (x1, z1) = corner(a, (k + 1) % 6);
        sgl::v3f_t2f(p.x, y, p.z, 0.5, 0.5);
        sgl::v3f_t2f(p.x + x0, y, p.z + z0, 0.5 + 0.5 * x0 / a, 0.5 + 0.5 * z0 / a);
        sgl::v3f_t2f(p.x + x1, y, p.z + z1, 0.5 + 0.5 * x1 / a, 0.5 + 0.5 * z1 / a);
    }
}

/// Emit the six side quads (as triangles) of a prism spanning y0..y1.
fn emit_sides(p: &Prism, a: f32, y0: f32, y1: f32, lit: f32) {
    for k in 0..6 {
        let (x0, z0) = corner(a, k);
        let (x1, z1) = corner(a, (k + 1) % 6);
        let s = if k % 2 == 0 { SHADE_SIDE_A } else { SHADE_SIDE_B } * lit;
        sgl::c3f(s, s, s);
        let (bx0, bz0, bx1, bz1) = (p.x + x0, p.z + z0, p.x + x1, p.z + z1);
        sgl::v3f_t2f(bx0, y0, bz0, 0.0, 1.0);
        sgl::v3f_t2f(bx1, y0, bz1, 1.0, 1.0);
        sgl::v3f_t2f(bx1, y1, bz1, 1.0, 0.0);
        sgl::v3f_t2f(bx0, y0, bz0, 0.0, 1.0);
        sgl::v3f_t2f(bx1, y1, bz1, 1.0, 0.0);
        sgl::v3f_t2f(bx0, y1, bz0, 0.0, 0.0);
    }
}

/// Draw the orbital station drum for this frame. `sim_t` is the world
/// clock the on-rails orbit is a function of.
pub fn draw(view: Mat4, proj: Mat4, sim_t: f64) {
    let cfg = station::config();
    let anchor = station::orbit_pos(sim_t);
    let b = planet::get(BodyId::Tenebris);

    /* Orbit frame: +y radial out, +x prograde, +z the orbit normal. */
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
    let layer_h = cfg.height_m / cfg.layers.max(1) as f32;
    let top_y = (cfg.layers - 1) as f32 * layer_h;
    let a = cfg.hex_size_m;

    renderer::sgl_world_begin();
    sgl::defaults();
    sgl::matrix_mode_projection();
    sgl::load_matrix(&proj.m[0]);
    sgl::matrix_mode_modelview();
    sgl::load_matrix(&view.m[0]);

    thread_local! {
        /* Opaque, double-sided: the drum is watertight from culled faces
         * alone, and double-sided keeps the interior visible when the
         * player flies inside the hollow. */
        static PIP: std::cell::Cell<sgl::Pipeline> = const { std::cell::Cell::new(sgl::Pipeline { id: 0 }) };
    }
    let pip = PIP.with(|p| {
        if p.get().id == 0 {
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

    sgl::push_matrix();
    sgl::translate(anchor.x as f32, anchor.y as f32, anchor.z as f32);
    sgl::mult_matrix(&basis[0]);
    /* Anchor at the drum's volumetric centre. */
    sgl::translate(0.0, -cfg.height_m * 0.5, 0.0);

    SHELL.with(|cell| {
        let mut cache = cell.borrow_mut();
        let groups = cache.get_or_insert_with(shell_groups);
        for (tex, prisms) in groups.iter().enumerate() {
            if prisms.is_empty() {
                continue;
            }
            sgl::enable_texture();
            sgl::texture(
                sokol::gfx::View { id: renderer::station_view_id(tex) },
                sokol::gfx::Sampler { id: renderer::rocket_sampler_id() },
            );
            sgl::begin_triangles();
            for p in prisms {
                match p.role {
                    /* Disk cells: caps only - sides face neighbours. */
                    PrismRole::Floor | PrismRole::Ceiling => {
                        emit_cap(p, a, p.y + layer_h, SHADE_TOP * lit);
                        emit_cap(p, a, p.y, SHADE_BOTTOM * lit);
                    }
                    /* Wall cells: sides, plus rim caps on keel + crown. */
                    PrismRole::Wall => {
                        emit_sides(p, a, p.y, p.y + layer_h, lit);
                        if p.y >= top_y - 1e-4 {
                            emit_cap(p, a, p.y + layer_h, SHADE_TOP * lit);
                        }
                        if p.y <= 1e-4 {
                            emit_cap(p, a, p.y, SHADE_BOTTOM * lit);
                        }
                    }
                }
            }
            sgl::end();
        }
    });
    sgl::pop_matrix();
}
