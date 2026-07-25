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
    dvec3_add, dvec3_cross, dvec3_dot, dvec3_make, dvec3_normalize, dvec3_scale, dvec3_sub, DVec3,
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
/// Body radius of the part models (unit-model metres, before ROCKET_SCALE) -
/// the tank cylinder is ~1 m; the interstage skirt starts at this radius.
const PART_RADIUS: f32 = 1.0;
/// Vacuum engines draw at this fraction of the atmospheric engine's size: the
/// upper-stage bell is smaller (no atmospheric expansion bell), top-aligned so
/// its housing still meets the tank above.
const VAC_BELL_SCALE: f32 = 0.62;
/// Radial segments of the procedural interstage skirt (the tapered connector
/// between a lower stage's tank and the smaller vacuum engine above it).
const INTERSTAGE_SEGS: usize = 12;
/// Flat shade of the skirt sides (matches the OBJ side-face look before lit).
const INTERSTAGE_SHADE: f32 = 0.75;
/// Vertical support columns around the interstage: solid square-section
/// posts, wide at the base and TAPERING toward the top, running the full
/// interstage height parallel to the rocket axis.
const STRUT_COUNT: usize = 6;
/// Column half-width (m) - uniform top to bottom (no taper), per feedback.
const STRUT_HALF_W_B: f32 = 0.09;
const STRUT_HALF_W_T: f32 = 0.09;
/// Per-face shades so the post reads as a lit solid, not a flat stripe:
/// outer face brightest, tangent sides mid, inner darkest.
const STRUT_SHADE_OUT: f32 = 0.55;
const STRUT_SHADE_SIDE: f32 = 0.38;
const STRUT_SHADE_IN: f32 = 0.25;

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

/// Model basis oriented with a ROLL REFERENCE: `up` is the nose, `fwd_ref` the
/// ship's forward direction, so the mesh's box faces roll with the ship instead
/// of sitting in a nose-only derived frame (which never shows roll). Falls back
/// to [`basis_up`] when `fwd_ref` is zero or parallel to `up`.
fn basis_up_fwd(up: DVec3, fwd_ref: DVec3) -> [f32; 16] {
    let up = dvec3_normalize(up);
    let mut fwd = dvec3_sub(fwd_ref, dvec3_scale(up, dvec3_dot(fwd_ref, up)));
    if dvec3_dot(fwd, fwd) < 1e-9 {
        return basis_up(up); /* no usable roll reference */
    }
    fwd = dvec3_normalize(fwd);
    let right = dvec3_cross(fwd, up);
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
    renderer::sgl_translate_scene(base);
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


/// Procedural interstage skirt: a truncated cone from `r_bottom` (at `base`)
/// tapering to `r_top` over `height` along the basis up axis - the connector
/// between a lower stage's full-width tank and the smaller vacuum bell above.
/// Textured with whatever view the caller binds (the fuel-tank skin, so the
/// skirt reads as part of the airframe).
fn draw_frustum(
    base: DVec3,
    basis: &[f32; 16],
    r_bottom: f32,
    r_top: f32,
    height: f32,
    strut_h: f32,
    lit: f32,
    tex_view: u32,
) {
    let right = dvec3_make(basis[0] as f64, basis[1] as f64, basis[2] as f64);
    let up = dvec3_make(basis[4] as f64, basis[5] as f64, basis[6] as f64);
    let fwd = dvec3_make(basis[8] as f64, basis[9] as f64, basis[10] as f64);
    let top_c = dvec3_add(base, dvec3_scale(up, height as f64));
    sgl::enable_texture();
    sgl::texture(
        sokol::gfx::View { id: tex_view },
        sokol::gfx::Sampler { id: renderer::rocket_sampler_id() },
    );
    sgl::begin_quads();
    let s = INTERSTAGE_SHADE * lit;
    sgl::c3f(s, s, s);
    for i in 0..INTERSTAGE_SEGS {
        let a0 = (i as f64) / INTERSTAGE_SEGS as f64 * std::f64::consts::TAU;
        let a1 = ((i + 1) as f64) / INTERSTAGE_SEGS as f64 * std::f64::consts::TAU;
        let dir = |a: f64| dvec3_add(dvec3_scale(right, a.cos()), dvec3_scale(fwd, a.sin()));
        let b0 = dvec3_add(base, dvec3_scale(dir(a0), r_bottom as f64));
        let b1 = dvec3_add(base, dvec3_scale(dir(a1), r_bottom as f64));
        let t0 = dvec3_add(top_c, dvec3_scale(dir(a0), r_top as f64));
        let t1 = dvec3_add(top_c, dvec3_scale(dir(a1), r_top as f64));
        sgl::v3f_t2f(b0.x as f32, b0.y as f32, b0.z as f32, 0.0, 1.0);
        sgl::v3f_t2f(b1.x as f32, b1.y as f32, b1.z as f32, 1.0, 1.0);
        sgl::v3f_t2f(t1.x as f32, t1.y as f32, t1.z as f32, 1.0, 0.0);
        sgl::v3f_t2f(t0.x as f32, t0.y as f32, t0.z as f32, 0.0, 0.0);
    }
    /* Vertical support columns: SOLID square-section posts, vertical
     * (parallel to the rocket axis), tapering from a wide base to a narrow
     * top over the full interstage height. Per-face shading makes them read
     * as lit solids. Own untextured batch. */
    sgl::end();
    sgl::disable_texture();
    sgl::begin_quads();
    let h = strut_h as f64;
    for j in 0..STRUT_COUNT {
        let a = (j as f64 + 0.5) / STRUT_COUNT as f64 * std::f64::consts::TAU;
        let dir = dvec3_add(dvec3_scale(right, a.cos()), dvec3_scale(fwd, a.sin()));
        let tan = dvec3_add(dvec3_scale(right, -a.sin()), dvec3_scale(fwd, a.cos()));
        let c_b = dvec3_add(base, dvec3_scale(dir, r_bottom as f64));
        let c_t = dvec3_add(c_b, dvec3_scale(up, h));
        /* Base and top half-axes - the taper. */
        let (wb, wt) = (STRUT_HALF_W_B as f64, STRUT_HALF_W_T as f64);
        let corner = |c: DVec3, hw: f64, sw: f64, sd_: f64| {
            dvec3_add(c, dvec3_add(dvec3_scale(tan, hw * sw), dvec3_scale(dir, hw * sd_)))
        };
        let quad = |p0: DVec3, p1: DVec3, p2: DVec3, p3: DVec3, shade: f32| {
            let g = shade * lit;
            sgl::c3f(g, g, g);
            sgl::v3f(p0.x as f32, p0.y as f32, p0.z as f32);
            sgl::v3f(p1.x as f32, p1.y as f32, p1.z as f32);
            sgl::v3f(p2.x as f32, p2.y as f32, p2.z as f32);
            sgl::v3f(p3.x as f32, p3.y as f32, p3.z as f32);
        };
        /* Outer face (+dir), inner face (-dir), two tangent sides. Bottom
         * corners span wb, top corners wt - solid tapered post. */
        quad(corner(c_b, wb, 1.0, 1.0), corner(c_b, wb, -1.0, 1.0),
             corner(c_t, wt, -1.0, 1.0), corner(c_t, wt, 1.0, 1.0), STRUT_SHADE_OUT);
        quad(corner(c_b, wb, 1.0, -1.0), corner(c_b, wb, -1.0, -1.0),
             corner(c_t, wt, -1.0, -1.0), corner(c_t, wt, 1.0, -1.0), STRUT_SHADE_IN);
        quad(corner(c_b, wb, 1.0, -1.0), corner(c_b, wb, 1.0, 1.0),
             corner(c_t, wt, 1.0, 1.0), corner(c_t, wt, 1.0, -1.0), STRUT_SHADE_SIDE);
        quad(corner(c_b, wb, -1.0, -1.0), corner(c_b, wb, -1.0, 1.0),
             corner(c_t, wt, -1.0, 1.0), corner(c_t, wt, -1.0, -1.0), STRUT_SHADE_SIDE);
    }
    sgl::end();
}

/// World height (m) one stacked part occupies - what the ride pose needs to
/// centre the flown stack on the player without copying these constants.
pub fn part_seg_m() -> f32 {
    PART_HEIGHT * ROCKET_SCALE
}

/// Centre of the RIDDEN rocket's drawn stack. The player rides at the
/// BASE and the mesh extends `remaining_parts * seg` up the nose, so the
/// middle sits half the CURRENT stack above them - staging (X) shortens
/// the stack, so this re-centres the instant a stage drops. The single
/// source of truth for both the ride draw and the chase camera's orbit
/// anchor: because both ask here, the camera pivot IS the mesh centre by
/// construction (it used to anchor at the player = the stack's bottom
/// edge, so the ship orbited around a point outside its middle and
/// staging never moved it).
pub fn ride_center(pos: DVec3, up: DVec3) -> DVec3 {
    let n = crate::rocket_ride::remaining_parts().len();
    dvec3_add(pos, dvec3_scale(up, n as f64 * part_seg_m() as f64 * 0.5))
}

/// Cheap deterministic 0..1 hash for the plume's flicker.
fn plume_hash(n: f32) -> f32 {
    ((n.sin() * 43758.547).fract()).abs()
}

/// Engine exhaust plume for the ridden rocket (`[plume]` in rocket.yaml):
/// two crossed additive ribbons from the nozzle down the thrust axis, the
/// bright core fading to the tip colour along the length, whole flame
/// flickering at flicker_hz. Drawn in the OVERLAY (post-water) sgl context
/// like the reentry plasma - depth-tests against the forwarded scene depth
/// with write off, so terrain occludes it and it still reads in front of
/// the sea. Call only while `rocket_ride::is_burning()`.
pub fn draw_plume(view: Mat4, proj: Mat4, nozzle: DVec3, up: DVec3, time_s: f32) {
    let pc = tenebris_core::rocket::config().plume;
    if pc.length_m <= 0.0 || pc.width_m <= 0.0 {
        return;
    }
    renderer::sgl_overlay_begin();
    sgl::defaults();
    sgl::matrix_mode_projection();
    sgl::load_matrix(&proj.m[0]);
    sgl::matrix_mode_modelview();
    sgl::load_matrix(&view.m[0]);
    thread_local! {
        static PIP: std::cell::Cell<sgl::Pipeline> =
            const { std::cell::Cell::new(sgl::Pipeline { id: 0 }) };
    }
    let pip = PIP.with(|p| {
        if p.get().id == 0 {
            /* Additive fire: src ONE dst ONE, depth test on / write off so
             * the flame layers glow over the scene but stays occluded. */
            let mut desc = sokol::gfx::PipelineDesc {
                depth: sokol::gfx::DepthState {
                    write_enabled: false,
                    compare: sokol::gfx::CompareFunc::Less,
                    ..Default::default()
                },
                cull_mode: sokol::gfx::CullMode::None,
                ..Default::default()
            };
            desc.colors[0].blend = sokol::gfx::BlendState {
                enabled: true,
                src_factor_rgb: sokol::gfx::BlendFactor::SrcAlpha,
                dst_factor_rgb: sokol::gfx::BlendFactor::One,
                src_factor_alpha: sokol::gfx::BlendFactor::One,
                dst_factor_alpha: sokol::gfx::BlendFactor::One,
                ..Default::default()
            };
            p.set(sgl::make_pipeline(&desc));
        }
        p.get()
    });
    sgl::load_pipeline(pip);

    /* Exhaust frame: down the thrust axis, two orthogonal ribbon planes. */
    let axis = dvec3_scale(up, -1.0);
    let reference = if up.y.abs() < 0.9 {
        dvec3_make(0.0, 1.0, 0.0)
    } else {
        dvec3_make(1.0, 0.0, 0.0)
    };
    let r1 = dvec3_normalize(dvec3_cross(up, reference));
    let r2 = dvec3_cross(up, r1);

    /* Whole-flame flicker: a hashed pulse per flicker_hz tick shortens the
     * plume and nudges the widths, so the flame dances instead of standing
     * frozen. */
    let tick = (time_s * pc.flicker_hz).floor();
    let pulse = plume_hash(tick * 12.9898);
    let len = (pc.length_m * (1.0 - pc.flicker * pulse)) as f64;
    let segs = (pc.segments.max(2.0)) as i32;

    sgl::begin_quads();
    for ribbon in [r1, r2] {
        for i in 0..segs {
            let t0 = i as f32 / segs as f32;
            let t1 = (i + 1) as f32 / segs as f32;
            /* Cone: narrow at the bell, flaring toward the tip, each edge
             * jittered a little by the flicker. */
            let jit0 = 1.0 - pc.flicker * 0.5 * plume_hash(tick * 3.7 + i as f32 * 17.3);
            let jit1 = 1.0 - pc.flicker * 0.5 * plume_hash(tick * 3.7 + (i + 1) as f32 * 17.3);
            let w0 = (pc.width_m * (0.45 + 1.05 * t0) * jit0) as f64;
            let w1 = (pc.width_m * (0.45 + 1.05 * t1) * jit1) as f64;
            let p0 = dvec3_add(nozzle, dvec3_scale(axis, len * t0 as f64));
            let p1 = dvec3_add(nozzle, dvec3_scale(axis, len * t1 as f64));
            /* Core -> tip colour, alpha dying toward the tail. */
            let col = |t: f32| {
                (
                    pc.core_r + (pc.tip_r - pc.core_r) * t,
                    pc.core_g + (pc.tip_g - pc.core_g) * t,
                    pc.core_b + (pc.tip_b - pc.core_b) * t,
                    (1.0 - t).powf(1.5),
                )
            };
            let (r0c, g0c, b0c, a0) = col(t0);
            let (r1c, g1c, b1c, a1) = col(t1);
            let v = |p: DVec3, r: DVec3, s: f64| {
                let q = dvec3_add(p, dvec3_scale(r, s));
                sgl::v3f(q.x as f32, q.y as f32, q.z as f32);
            };
            sgl::c4f(r0c, g0c, b0c, a0);
            v(p0, ribbon, -w0);
            sgl::c4f(r0c, g0c, b0c, a0);
            v(p0, ribbon, w0);
            sgl::c4f(r1c, g1c, b1c, a1);
            v(p1, ribbon, w1);
            sgl::c4f(r1c, g1c, b1c, a1);
            v(p1, ribbon, -w1);
        }
    }
    sgl::end();
    renderer::sgl_overlay_end();
}

/// Draw one assembled part stack from its BASE (bottom face of the first
/// engine) along the basis' +Y column: each part in its slot, vacuum bells
/// at VAC_BELL_SCALE and TOP-ALIGNED so the housing meets the tank above,
/// with the tapered interstage skirt + support struts closing the gap.
///
/// The one stack renderer - the pad, the ridden rocket, and jettisoned
/// falling stages all go through here. It started as the pad's private
/// loop, and the first ridden rocket drew through a second, simpler copy:
/// bottom-aligned bells, no skirt, no struts - user-visible drift within a
/// day of the fork existing.
fn draw_stack(
    models: &[RocketModel; 3],
    base: DVec3,
    basis: &[f32; 16],
    up: DVec3,
    parts: &[u16],
    lit: f32,
) {
    for (i, &id) in parts.iter().enumerate() {
        let midx = match part_role(id) {
            Some(PartRole::Engine) => 0usize,
            Some(PartRole::FuelTank) => 1,
            Some(PartRole::Capsule) => 2,
            None => 1,
        };
        let vac = tenebris_core::rocket::engine_kind(id)
            == Some(tenebris_core::rocket::EngineKind::Vacuum);
        let scale = if vac { ROCKET_SCALE * VAC_BELL_SCALE } else { ROCKET_SCALE };
        let slot_off = (i as f32) * PART_HEIGHT * ROCKET_SCALE;
        let gap = PART_HEIGHT * (ROCKET_SCALE - scale);
        let part_off = if vac { slot_off + gap } else { slot_off };
        let pbase = dvec3_add(base, dvec3_scale(up, part_off as f64));
        draw_model(&models[midx], pbase, basis, scale, lit, renderer::rocket_view_id(midx));
        if vac && i > 0 {
            /* Interstage: from the slot bottom (sitting on the stage below,
             * full radius) tapering up to the bell base. Skinned with the
             * fuel-tank texture so it reads as airframe. */
            let skirt_base = dvec3_add(base, dvec3_scale(up, slot_off as f64));
            draw_frustum(
                skirt_base,
                basis,
                PART_RADIUS * ROCKET_SCALE,
                PART_RADIUS * scale,
                gap,
                PART_HEIGHT * ROCKET_SCALE,
                lit,
                renderer::rocket_view_id(1),
            );
        }
    }
}

/// Draw every assembled rocket + its launch-tower gantry for the active
/// body. Iterates the world's launch-pad block entities.
pub fn draw(view: Mat4, proj: Mat4, world: &World) {
    if !models() {
        return;
    }
    /* The rocket being flown (or parked away from its pad after climbing out
     * mid-flight - see in_flight_pad's doc) is drawn elsewhere (around the
     * player, or at its parked pose below), so its origin pad hides ITS
     * ROCKET ONLY - the launch tower is ground equipment and must stay
     * standing while the rocket it serviced is away (hiding the whole pad
     * entry took the gantry with it). Every other pad still draws its
     * static rocket. */
    let in_flight = crate::rocket_ride::in_flight_pad();

    /* (tile, depth, parts, rocket-hidden) for pads that carry a rocket. */
    let pads: Vec<(i32, i32, Vec<u16>, bool)> = world
        .block_entities
        .iter()
        .filter_map(|(tile, depth, e)| {
            let lp = e.launch_pad()?;
            let parts = lp.parts().to_vec();
            if parts.is_empty() {
                None
            } else {
                let hidden = in_flight == Some((tile, depth));
                Some((tile, depth, parts, hidden))
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
        /* Ship: opaque, DOUBLE-SIDED (the models' winding isn't reliably
         * outward, and the parts are solid, so drawing both sides avoids the
         * inverted-face look; nearest face wins the depth test). */
        static PIP_SHIP: std::cell::Cell<sgl::Pipeline> = const { std::cell::Cell::new(sgl::Pipeline { id: 0 }) };
    }
    let pip_ship = PIP_SHIP.with(|p| {
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

    /* Tower truss verts accumulate in world space and draw through the raw
     * alpha-cutout pipeline after the sgl ships (sgl can't discard). */
    let mut tower_verts: Vec<f32> = Vec::new();
    MODELS.with(|m| {
        let mb = m.borrow();
        let models = match mb.as_ref() {
            Some(a) => a,
            None => return,
        };
        for (tile, depth, parts, rocket_hidden) in &pads {
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

            /* Rocket stack (shared renderer - see draw_stack). Hidden while
             * this pad's rocket is the one being flown. */
            if !*rocket_hidden {
                sgl::load_pipeline(pip_ship);
                let stack_base = dvec3_add(center, dvec3_scale(up, surf_r as f64));
                draw_stack(models, stack_base, &basis, up, parts, lit);
            }

            /* Launch-tower gantry beside the rocket: box segments stacked as
             * tall as the rocket, offset along the tile tangent. Emitted as
             * world-space truss verts for the alpha-cutout pipeline below. */
            let right = dvec3_make(basis[0] as f64, basis[1] as f64, basis[2] as f64);
            let up_c = dvec3_make(basis[4] as f64, basis[5] as f64, basis[6] as f64);
            let fwd = dvec3_make(basis[8] as f64, basis[9] as f64, basis[10] as f64);
            let box_h = ROCKET_SCALE; /* half-size -> 2*scale box, matches part width */
            let seg_count = (parts.len() + 1).max(3);
            for i in 0..seg_count {
                let r = surf_r + (i as f32) * 2.0 * box_h + box_h;
                let base = dvec3_add(
                    dvec3_add(center, dvec3_scale(up, r as f64)),
                    dvec3_scale(right, TOWER_OFFSET_M as f64),
                );
                push_tower_box(&mut tower_verts, base, right, up_c, fwd, box_h, lit);
            }
        }
    });

    /* Ships are flushed with the sgl world context; the tower truss draws
     * after through the alpha-cutout pipeline (correct depth + see-through). */
    renderer::sgl_world_end();
    if !tower_verts.is_empty() {
        renderer::draw_tower_cutout(
            view,
            proj,
            &tower_verts,
            renderer::rocket_view_id(3),
            renderer::rocket_sampler_id(),
        );
    }
}

/// Draw the tumbling part models of every jettisoned falling stage (space
/// era salvage). Same textured model path as the pad rockets, but oriented by
/// each stage's live tumble axis and centred on its world position. The plasma
/// shell that wraps them is drawn separately by `reentry_fx::draw_shells`.
pub fn draw_falling(view: Mat4, proj: Mat4, world: &World, stages: &[crate::falling_stage::StageView]) {
    if stages.is_empty() || !models() {
        return;
    }
    let _ = world;

    renderer::sgl_world_begin();
    sgl::defaults();
    sgl::matrix_mode_projection();
    sgl::load_matrix(&proj.m[0]);
    sgl::matrix_mode_modelview();
    sgl::load_matrix(&view.m[0]);

    thread_local! {
        static PIP_FALL: std::cell::Cell<sgl::Pipeline> = const { std::cell::Cell::new(sgl::Pipeline { id: 0 }) };
    }
    let pip = PIP_FALL.with(|p| {
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

    MODELS.with(|m| {
        let mb = m.borrow();
        let Some(models) = mb.as_ref() else { return };
        for s in stages {
            let axis = dvec3_normalize(s.axis);
            /* Roll-aware frame: the ship's fwd reference rolls the mesh with the
             * roll keys; tumbling stages (zero ref) fall back to the derived. */
            let basis = basis_up_fwd(axis, s.roll_ref);
            let total_h = s.parts.len() as f32 * PART_HEIGHT * ROCKET_SCALE;
            let lit = renderer::entity_sun_brightness(s.center).clamp(0.15, 1.5);
            /* Base = half a stack down the axis from the centre; the shared
             * renderer takes it from there (same bells / skirt / struts as
             * the pad - a flown rocket is the pad's rocket, moved). */
            let base = dvec3_add(s.center, dvec3_scale(axis, -0.5 * total_h as f64));
            draw_stack(models, base, &basis, axis, &s.parts, lit);
        }
    });
    renderer::sgl_world_end();
}

/// Push one launch-tower box (world-space corners = `base + right*x +
/// up*y + fwd*z`) into `verts` as [x,y,z,u,v,shade] triangles. Side faces
/// sample the tower texture's left cell, caps its right cell.
#[allow(clippy::too_many_arguments)]
fn push_tower_box(verts: &mut Vec<f32>, base: DVec3, right: DVec3, up: DVec3, fwd: DVec3, h: f32, lit: f32) {
    let side = (0.02f32, 0.48f32);
    let cap = (0.52f32, 0.98f32);
    let corner = |lx: f32, ly: f32, lz: f32| -> [f32; 3] {
        [
            (base.x + right.x * lx as f64 + up.x * ly as f64 + fwd.x * lz as f64) as f32,
            (base.y + right.y * lx as f64 + up.y * ly as f64 + fwd.y * lz as f64) as f32,
            (base.z + right.z * lx as f64 + up.z * ly as f64 + fwd.z as f64 * lz as f64) as f32,
        ]
    };
    /* Only the top (+Y) cap, never the bottom: stacked segments share a
     * boundary plane, so drawing both a segment's top cap AND the next
     * segment's bottom cap makes them coplanar and z-fight. Keeping just
     * the top cap leaves exactly one surface per boundary. */
    let faces: [([[f32; 3]; 4], f32, (f32, f32)); 5] = [
        ([corner(-h, h, -h), corner(-h, h, h), corner(h, h, h), corner(h, h, -h)], 1.0, cap), // +Y
        ([corner(-h, -h, -h), corner(-h, h, -h), corner(h, h, -h), corner(h, -h, -h)], 0.85, side), // -Z
        ([corner(h, -h, h), corner(h, h, h), corner(-h, h, h), corner(-h, -h, h)], 0.7, side), // +Z
        ([corner(h, -h, -h), corner(h, h, -h), corner(h, h, h), corner(h, -h, h)], 0.8, side), // +X
        ([corner(-h, -h, h), corner(-h, h, h), corner(-h, h, -h), corner(-h, -h, -h)], 0.75, side), // -X
    ];
    for (quad, shade, (u0, u1)) in faces.iter() {
        let s = shade * lit;
        let uv = [(*u0, 1.0f32), (*u0, 0.0f32), (*u1, 0.0f32), (*u1, 1.0f32)];
        for &i in &[0usize, 1, 2, 0, 2, 3] {
            let v = quad[i];
            verts.extend_from_slice(&[v[0], v[1], v[2], uv[i].0, uv[i].1, s]);
        }
    }
}
