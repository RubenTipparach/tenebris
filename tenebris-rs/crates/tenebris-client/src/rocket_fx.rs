//! Rocket-stack + launch-tower rendering.
//!
//! Ports the JS build's rocket geometry: the assembled rocket on a launch
//! pad is drawn from the baked OBJ models (`assets/models/rocket_*.obj`,
//! copied from the JS `public/models/` set) textured with the rocket-part
//! PNGs, instead of the old procedural cube stack the hex mesher emitted.
//! The launch tower is drawn as a proper single-sided textured box gantry
//! beside the rocket (the JS tower is a box too) - back-face culled, so it
//! no longer reads as the double-sided see-through block the voxel gantry
//! did.
//!
//! A focused static-textured model path rather than `baked_model` (which is
//! a rigged, vertex-coloured animation pipeline): the rocket parts carry
//! per-vertex UVs + one texture each and never animate, so they want a
//! different vertex path. Rendered immediate-mode into the renderer's world
//! sgl context (same as `animals` / `crops`) so they depth-sort against
//! terrain and get the composite/fog.

#![allow(dead_code)]

use std::cell::RefCell;

use sokol::gl as sgl;

use tenebris_core::math::{
    dvec3_add, dvec3_cross, dvec3_make, dvec3_normalize, dvec3_scale, DVec3,
};
use tenebris_core::rocket::{part_role, PartRole};
use tenebris_core::world::{World, WORLD_MAX_DEPTH};

use crate::gfx_math::Mat4;
use crate::renderer;

/// Vertical size (m, before scale) each stacked part occupies - matches the
/// JS `SEGMENT_HEIGHT` and the models' 2-unit height.
const PART_HEIGHT: f32 = 2.0;
/// World scale applied to the unit models so a part reads a couple of metres
/// across on the voxel planet (models are ~1 m radius, 2 m tall).
const ROCKET_SCALE: f32 = 0.9;
/// How far to the side of the rocket the launch-tower gantry stands (m).
const TOWER_OFFSET_M: f32 = 2.1;

struct Vtx {
    pos: [f32; 3],
    uv: [f32; 2],
    shade: f32,
}

struct RocketModel {
    tris: Vec<Vtx>,
}

thread_local! {
    /// [engine, fuel tank, command module] loaded lazily on first draw.
    static MODELS: RefCell<Option<[RocketModel; 3]>> = const { RefCell::new(None) };
}

/// Parse the tiny OBJ subset our rocket models use: `v`, `vt`, `f` (with
/// `v/vt/vn` face tokens), triangulated as a fan. Per-face shade comes from
/// the face-normal's +Y (top bright, underside dark - the draw_box look).
fn load_obj(path: &str) -> RocketModel {
    let src = std::fs::read_to_string(path).unwrap_or_default();
    let mut positions: Vec<[f32; 3]> = Vec::new();
    let mut uvs: Vec<[f32; 2]> = Vec::new();
    let mut tris: Vec<Vtx> = Vec::new();
    let parse_idx = |tok: &str, len: usize| -> Option<usize> {
        let i: i64 = tok.parse().ok()?;
        let idx = if i < 0 { len as i64 + i } else { i - 1 };
        if idx >= 0 && (idx as usize) < len {
            Some(idx as usize)
        } else {
            None
        }
    };
    for line in src.lines() {
        let mut it = line.split_whitespace();
        match it.next() {
            Some("v") => {
                let v: Vec<f32> = it.filter_map(|s| s.parse().ok()).collect();
                if v.len() >= 3 {
                    positions.push([v[0], v[1], v[2]]);
                }
            }
            Some("vt") => {
                let v: Vec<f32> = it.filter_map(|s| s.parse().ok()).collect();
                if v.len() >= 2 {
                    uvs.push([v[0], v[1]]);
                }
            }
            Some("f") => {
                /* (pos_idx, uv_idx) per face vertex. */
                let verts: Vec<(usize, Option<usize>)> = it
                    .filter_map(|tok| {
                        let mut parts = tok.split('/');
                        let p = parse_idx(parts.next()?, positions.len())?;
                        let t = parts.next().and_then(|s| {
                            if s.is_empty() {
                                None
                            } else {
                                parse_idx(s, uvs.len())
                            }
                        });
                        Some((p, t))
                    })
                    .collect();
                if verts.len() < 3 {
                    continue;
                }
                for k in 1..verts.len() - 1 {
                    let tri = [verts[0], verts[k], verts[k + 1]];
                    let p: [[f32; 3]; 3] = [
                        positions[tri[0].0],
                        positions[tri[1].0],
                        positions[tri[2].0],
                    ];
                    /* Face normal +Y for shading. */
                    let e1 = [p[1][0] - p[0][0], p[1][1] - p[0][1], p[1][2] - p[0][2]];
                    let e2 = [p[2][0] - p[0][0], p[2][1] - p[0][1], p[2][2] - p[0][2]];
                    let ny = e1[2] * e2[0] - e1[0] * e2[2];
                    let nlen = (e1[1] * e2[2] - e1[2] * e2[1]).hypot(ny).hypot(e1[0] * e2[1] - e1[1] * e2[0]);
                    let ny = if nlen > 1e-6 { ny / nlen } else { 0.0 };
                    let shade = 0.55 + 0.45 * (0.5 + 0.5 * ny.clamp(-1.0, 1.0));
                    for &(pi, ti) in &tri {
                        let uv = ti.and_then(|t| uvs.get(t).copied()).unwrap_or([0.0, 0.0]);
                        /* OBJ vt is bottom-up; our textures load top-down. */
                        tris.push(Vtx { pos: positions[pi], uv: [uv[0], 1.0 - uv[1]], shade });
                    }
                }
            }
            _ => {}
        }
    }
    RocketModel { tris }
}

fn models() -> bool {
    MODELS.with(|m| {
        if m.borrow().is_none() {
            *m.borrow_mut() = Some([
                load_obj("assets/models/rocket_engine.obj"),
                load_obj("assets/models/rocket_fuel_tank.obj"),
                load_obj("assets/models/rocket_command_module.obj"),
            ]);
        }
        m.borrow().as_ref().map(|a| a.iter().all(|mo| !mo.tris.is_empty())).unwrap_or(false)
    })
}

/// Column-major basis whose +Y column is the surface radial `up`, so a
/// model authored y-up rises straight out of the ground (mirrors the JS
/// `setFromUnitVectors([0,1,0], radial)`).
fn basis_up(up: DVec3) -> [f32; 16] {
    let up = dvec3_normalize(up);
    let reference = if up.y.abs() < 0.9 {
        dvec3_make(0.0, 1.0, 0.0)
    } else {
        dvec3_make(1.0, 0.0, 0.0)
    };
    let right = dvec3_normalize(dvec3_cross(reference, up));
    let fwd = dvec3_cross(up, right);
    [
        right.x as f32, right.y as f32, right.z as f32, 0.0,
        up.x as f32, up.y as f32, up.z as f32, 0.0,
        fwd.x as f32, fwd.y as f32, fwd.z as f32, 0.0,
        0.0, 0.0, 0.0, 1.0,
    ]
}

/// Emit one model's triangles at `base` (world), oriented `basis`, scaled,
/// tinted by `lit`, with `tex_view` bound.
fn draw_model(model: &RocketModel, base: DVec3, basis: &[f32; 16], scale: f32, lit: f32, tex_view: u32) {
    sgl::enable_texture();
    sgl::texture(
        sokol::gfx::View { id: tex_view },
        sokol::gfx::Sampler { id: renderer::rocket_sampler_id() },
    );
    sgl::push_matrix();
    sgl::translate(base.x as f32, base.y as f32, base.z as f32);
    sgl::mult_matrix(&basis[0]);
    sgl::scale(scale, scale, scale);
    sgl::begin_triangles();
    for v in &model.tris {
        let s = v.shade * lit;
        sgl::c3f(s, s, s);
        sgl::v3f_t2f(v.pos[0], v.pos[1], v.pos[2], v.uv[0], v.uv[1]);
    }
    sgl::end();
    sgl::pop_matrix();
}

/// A flat-coloured / textured box (launch-tower segment). Corners in the
/// model's local frame; the whole box is placed by the surrounding matrix.
/// Side faces sample the tower texture's left cell, caps the right cell.
fn draw_tower_box(cx: f32, cy: f32, cz: f32, h: f32, lit: f32) {
    /* launch_tower.png = two 32x32 cells: left (u 0..0.5) sides, right
     * (0.5..1) top/bottom. */
    let side = (0.0f32, 0.5f32);
    let cap = (0.5f32, 1.0f32);
    let (x0, x1) = (cx - h, cx + h);
    let (y0, y1) = (cy - h, cy + h);
    let (z0, z1) = (cz - h, cz + h);
    // (4 corners CCW-from-outside, shade, uv-cell)
    let faces: [([[f32; 3]; 4], f32, (f32, f32)); 6] = [
        ([[x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0]], 1.0, cap), // top +Y
        ([[x0, y0, z1], [x0, y0, z0], [x1, y0, z0], [x1, y0, z1]], 0.55, cap), // bottom -Y
        ([[x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [x1, y0, z0]], 0.85, side), // front -Z
        ([[x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [x0, y0, z1]], 0.7, side), // back +Z
        ([[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], 0.8, side), // right +X
        ([[x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [x0, y0, z0]], 0.75, side), // left -X
    ];
    sgl::begin_triangles();
    for (quad, shade, (u0, u1)) in faces.iter() {
        let uv = [(*u0, 1.0f32), (*u0, 0.0f32), (*u1, 0.0f32), (*u1, 1.0f32)];
        let s = shade * lit;
        sgl::c3f(s, s, s);
        for &i in &[0usize, 1, 2, 0, 2, 3] {
            let v = quad[i];
            sgl::v3f_t2f(v[0], v[1], v[2], uv[i].0, uv[i].1);
        }
    }
    sgl::end();
}

/// Draw every assembled rocket + its launch-tower gantry for the active
/// body. Iterates the world's launch-pad block entities.
pub fn draw(view: Mat4, proj: Mat4, world: &World) {
    if !models() {
        return;
    }
    /* Collect (tile, depth, parts, part-count) for pads that carry a rocket. */
    let pads: Vec<(i32, i32, Vec<u16>)> = world
        .block_entities
        .iter()
        .filter_map(|(tile, depth, e)| {
            let lp = e.launch_pad()?;
            let parts = lp.parts().to_vec();
            if parts.is_empty() {
                None
            } else {
                Some((tile, depth, parts))
            }
        })
        .collect();
    if pads.is_empty() {
        return;
    }

    let center = dvec3_make(world.body.pos_x, world.body.pos_y, world.body.pos_z);

    renderer::sgl_world_begin();
    sgl::defaults();
    sgl::matrix_mode_projection();
    sgl::load_matrix(&proj.m[0]);
    sgl::matrix_mode_modelview();
    sgl::load_matrix(&view.m[0]);

    thread_local! {
        static PIP: std::cell::Cell<sgl::Pipeline> = const { std::cell::Cell::new(sgl::Pipeline { id: 0 }) };
    }
    let mut pip = PIP.with(|p| p.get());
    if pip.id == 0 {
        pip = sgl::make_pipeline(&sokol::gfx::PipelineDesc {
            depth: sokol::gfx::DepthState {
                write_enabled: true,
                compare: sokol::gfx::CompareFunc::Less,
                ..Default::default()
            },
            /* Back-face cull: the models are closed with outward CCW faces,
             * so single-sided is correct - this is what stops the tower from
             * rendering double-sided. */
            cull_mode: sokol::gfx::CullMode::Back,
            face_winding: sokol::gfx::FaceWinding::Ccw,
            ..Default::default()
        });
        PIP.with(|p| p.set(pip));
    }
    sgl::load_pipeline(pip);

    MODELS.with(|m| {
        let mb = m.borrow();
        let models = match mb.as_ref() {
            Some(a) => a,
            None => return,
        };
        for (tile, depth, parts) in &pads {
            let Some(t) = world.grid.tile(*tile) else { continue };
            let up = dvec3_normalize(t.center);
            let basis = basis_up(up);
            /* Pad top surface radius. */
            let mut top = -1;
            for d in (0..WORLD_MAX_DEPTH).rev() {
                if tenebris_core::blocks::is_solid(world.get(*tile, d)) {
                    top = d;
                    break;
                }
            }
            let surf_r = world.depth_to_radius_m((top + 1).max(*depth + 1)) as f32;
            let lit = renderer::entity_sun_brightness(dvec3_add(center, dvec3_scale(up, surf_r as f64)));
            let lit = lit.clamp(0.15, 1.5);

            /* Rocket stack: engine at the bottom, then up the parts list. */
            for (i, &id) in parts.iter().enumerate() {
                let midx = match part_role(id) {
                    Some(PartRole::Engine) => 0usize,
                    Some(PartRole::FuelTank) => 1,
                    Some(PartRole::Capsule) => 2,
                    None => 1,
                };
                let base_r = surf_r + (i as f32) * PART_HEIGHT * ROCKET_SCALE;
                let base = dvec3_add(center, dvec3_scale(up, base_r as f64));
                draw_model(&models[midx], base, &basis, ROCKET_SCALE, lit, renderer::rocket_view_id(midx));
            }

            /* Launch-tower gantry beside the rocket: boxes stacked as tall as
             * the rocket, offset along the tile tangent. */
            let tower_view = renderer::rocket_view_id(3);
            sgl::enable_texture();
            sgl::texture(
                sokol::gfx::View { id: tower_view },
                sokol::gfx::Sampler { id: renderer::rocket_sampler_id() },
            );
            /* Tangent offset direction (basis local +X = right). */
            let right = dvec3_make(basis[0] as f64, basis[1] as f64, basis[2] as f64);
            let box_h = ROCKET_SCALE; /* half-size -> 2*scale box, matches part width */
            let seg_count = (parts.len() + 1).max(3);
            for i in 0..seg_count {
                let r = surf_r + (i as f32) * 2.0 * box_h + box_h;
                let base = dvec3_add(
                    dvec3_add(center, dvec3_scale(up, r as f64)),
                    dvec3_scale(right, TOWER_OFFSET_M as f64),
                );
                sgl::push_matrix();
                sgl::translate(base.x as f32, base.y as f32, base.z as f32);
                sgl::mult_matrix(&basis[0]);
                draw_tower_box(0.0, 0.0, 0.0, box_h, lit);
                sgl::pop_matrix();
            }
        }
    });

    renderer::sgl_world_end();
}
