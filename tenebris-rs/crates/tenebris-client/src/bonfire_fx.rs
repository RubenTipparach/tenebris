//! Bonfire visuals + light emission.
//!
//! The bonfire is a placed `Block::Bonfire` voxel carrying a
//! `MachineState::Bonfire` block-entity (cook + fuel + burn state, in
//! core::block_entity). It is skipped by the hex mesher (see
//! `hex_mesher::build_tile`) and drawn here instead as an emissive
//! campfire - a ring of logs plus a flickering flame that glows at night -
//! so it reads as a fire regardless of the sun.
//!
//! Two entry points, both driven from the main loop over the current
//! `World`:
//! - [`draw`] renders every placed bonfire (logs always; flame only while
//!   lit).
//! - [`collect_lights`] returns each LIT bonfire's flame as a `torch::Torch`
//!   record scaled per `bonfire_config` (2x a torch), which the app feeds to
//!   `torch::set_extra_lights` so the terrain bake lights it through the
//!   same spatial-grid path as torches.

#![allow(dead_code)]

use std::cell::Cell;

use sokol::gl as sgl;
use tenebris_core::block_entity::MachineState;
use tenebris_core::math::{
    dvec3_add, dvec3_cross, dvec3_make, dvec3_normalize, dvec3_scale, dvec3_to_vec3, DVec3,
};
use tenebris_core::world::World;

use crate::gfx_math::Mat4;
use crate::renderer;
use crate::torch;

thread_local! {
    static PIP: Cell<sgl::Pipeline> = const { Cell::new(sgl::Pipeline { id: 0 }) };
}

/// Height (metres, along the surface normal) of the flame tip above the
/// log ring - also where the light sample is taken. Kept here (not a
/// designer knob) because it's tied to the drawn geometry.
const FLAME_TIP_M: f64 = 1.05;
/// Log-ring radius, metres.
const RING_R_M: f64 = 0.42;

/// World-space frame for one placed bonfire: the cell it sits in, its
/// outward normal, and a tangent basis for laying out logs / flame.
struct Frame {
    base: DVec3,       // absolute world log-ring ground point (for drawing)
    local_base: DVec3, // body-LOCAL ground point (for the torch light bake,
    // whose vertex frame is body-local like torch positions)
    up: DVec3,    // surface normal
    t1: DVec3,    // tangent
    t2: DVec3,    // tangent
    lit: bool,
    phase: f32, // per-fire flicker offset
}

/// Gather every placed bonfire's world frame from the block-entity store.
fn frames(w: &World) -> Vec<Frame> {
    let center = dvec3_make(w.body.pos_x, w.body.pos_y, w.body.pos_z);
    let mut out = Vec::new();
    for (tile, depth, e) in w.block_entities.iter() {
        let MachineState::Bonfire(b) = e.state else { continue };
        let Some(t) = w.grid.tile(tile) else { continue };
        /* Logs sit on the top face of the block below (= the bottom of the
         * bonfire's own cell). */
        let r = w.depth_to_radius_m(depth);
        let up = dvec3_normalize(t.center);
        let local_base = dvec3_scale(t.center, r);
        let base = dvec3_add(center, local_base);
        let reference = if up.y.abs() < 0.9 {
            dvec3_make(0.0, 1.0, 0.0)
        } else {
            dvec3_make(1.0, 0.0, 0.0)
        };
        let t1 = dvec3_normalize(dvec3_cross(reference, up));
        let t2 = dvec3_cross(up, t1);
        /* Decorrelate flicker per fire from its tile id (no RNG needed). */
        let phase = (tile as f32) * 0.6180339;
        out.push(Frame { base, local_base, up, t1, t2, lit: b.lit(), phase });
    }
    out
}

/// Local (right, up, fwd) offset -> world point.
#[inline]
fn wp(f: &Frame, r: f64, u: f64, fw: f64) -> DVec3 {
    dvec3_add(
        f.base,
        dvec3_add(
            dvec3_add(dvec3_scale(f.t1, r), dvec3_scale(f.up, u)),
            dvec3_scale(f.t2, fw),
        ),
    )
}

#[inline]
fn tri(a: DVec3, b: DVec3, c: DVec3) {
    for p in [a, b, c] {
        let v = dvec3_to_vec3(p);
        sgl::v3f(v.x, v.y, v.z);
    }
}

/// A box centred at local (cx,cu,cf) with half-extents (hr,hu,hf) in the
/// frame's tangent basis - 12 triangles. Colour set by the caller.
#[allow(clippy::too_many_arguments)]
fn push_box(f: &Frame, cx: f64, cu: f64, cf: f64, hr: f64, hu: f64, hf: f64) {
    let c = [
        wp(f, cx - hr, cu - hu, cf - hf),
        wp(f, cx + hr, cu - hu, cf - hf),
        wp(f, cx + hr, cu + hu, cf - hf),
        wp(f, cx - hr, cu + hu, cf - hf),
        wp(f, cx - hr, cu - hu, cf + hf),
        wp(f, cx + hr, cu - hu, cf + hf),
        wp(f, cx + hr, cu + hu, cf + hf),
        wp(f, cx - hr, cu + hu, cf + hf),
    ];
    const FACES: [[usize; 4]; 6] = [
        [0, 1, 2, 3],
        [5, 4, 7, 6],
        [4, 0, 3, 7],
        [1, 5, 6, 2],
        [3, 2, 6, 7],
        [4, 5, 1, 0],
    ];
    for q in FACES {
        tri(c[q[0]], c[q[1]], c[q[2]]);
        tri(c[q[0]], c[q[2]], c[q[3]]);
    }
}

/// Draw all placed bonfires. Logs always; flame only while lit.
pub fn draw(w: &World, view: Mat4, proj: Mat4, time_s: f32) {
    let frames = frames(w);
    if frames.is_empty() {
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
    sgl::begin_triangles();

    for f in &frames {
        /* --- Logs: five short billets laid in a star around the ring,
         * tilted up toward the centre. Charred grey when cold, warm brown
         * when lit. --- */
        let (lr, lg, lb) = if f.lit { (0.34, 0.20, 0.10) } else { (0.22, 0.20, 0.20) };
        for i in 0..5 {
            let a = (i as f64) / 5.0 * std::f64::consts::TAU;
            let (ca, sa) = (a.cos(), a.sin());
            /* Log lies along its radial direction (ca,sa) in the tangent
             * plane; drawn as a thin box offset out to the ring. */
            let cx = ca * RING_R_M * 0.5;
            let cf = sa * RING_R_M * 0.5;
            sgl::c3f(lr, lg, lb);
            /* Approximate the radial billet with an axis-aligned thin box;
             * exact orientation isn't important at this size. */
            let (hr, hf) = (0.30 * ca.abs() + 0.07, 0.30 * sa.abs() + 0.07);
            push_box(f, cx, 0.09, cf, hr, 0.07, hf);
        }

        if !f.lit {
            continue;
        }

        /* --- Flame: a cluster of upward triangles, orange at the base
         * fading to yellow at a flickering tip. Emissive: colours are
         * written straight (no lighting), so it glows at night. --- */
        let flick = ((time_s * 7.0 + f.phase) as f64).sin() * 0.10
            + ((time_s * 13.0 + f.phase * 2.0) as f64).sin() * 0.05;
        let tip = FLAME_TIP_M + flick;
        const N: usize = 6;
        for i in 0..N {
            let a0 = (i as f64) / (N as f64) * std::f64::consts::TAU;
            let a1 = ((i + 1) as f64) / (N as f64) * std::f64::consts::TAU;
            let br = 0.22;
            let p0 = wp(f, a0.cos() * br, 0.14, a0.sin() * br);
            let p1 = wp(f, a1.cos() * br, 0.14, a1.sin() * br);
            /* Tip wobbles slightly off-axis for a living look. */
            let sway = ((time_s * 5.0 + f.phase + i as f32) as f64).sin() * 0.05;
            let apex = wp(f, sway, tip, sway * 0.7);
            /* Base ring = hot orange; apex = yellow. Draw each face twice
             * with base + apex colours by splitting the triangle midway. */
            let mid0 = wp(f, a0.cos() * br * 0.5, tip * 0.55, a0.sin() * br * 0.5);
            let mid1 = wp(f, a1.cos() * br * 0.5, tip * 0.55, a1.sin() * br * 0.5);
            sgl::c3f(1.0, 0.45, 0.10); /* hot base */
            tri(p0, p1, mid1);
            tri(p0, mid1, mid0);
            sgl::c3f(1.0, 0.80, 0.20); /* yellow upper */
            tri(mid0, mid1, apex);
        }
        /* A small bright core so the centre reads as white-hot. */
        sgl::c3f(1.0, 0.92, 0.55);
        push_box(f, 0.0, 0.30, 0.0, 0.06, 0.14, 0.06);
    }

    sgl::end();
    renderer::sgl_world_end();
}

thread_local! {
    /* Quantized lit-flame positions from last sync, to detect when the set
     * of lit bonfires actually changes (a fire lit / extinguished / placed
     * / mined) - so we only re-dirty the terrain then, not every frame. */
    static LAST_LIT: std::cell::RefCell<Vec<[i64; 3]>> =
        const { std::cell::RefCell::new(Vec::new()) };
}

/// Once-per-frame: refresh the torch light mirror with the lit bonfires and,
/// when that set changed, dirty the terrain around every bonfire so the
/// per-vertex bake re-runs (lighting a newly-lit fire, or darkening one that
/// just went out). Cheap when nothing changed (a steady burn does not
/// re-dirty).
pub fn sync_lights(w: &mut World) {
    let lights = collect_lights(w);
    let cur: Vec<[i64; 3]> = lights
        .iter()
        .map(|t| {
            [
                (t.position.x * 8.0) as i64,
                (t.position.y * 8.0) as i64,
                (t.position.z * 8.0) as i64,
            ]
        })
        .collect();
    let changed = LAST_LIT.with(|c| {
        let mut c = c.borrow_mut();
        if *c != cur {
            *c = cur.clone();
            true
        } else {
            false
        }
    });
    if !changed {
        return;
    }
    let range = torch::LIGHT_RANGE_M
        * tenebris_core::config::bonfire().light_radius_scale.max(0.1);
    /* Dirty around EVERY bonfire (lit or not) so both transitions relight:
     * a fire coming on lights its surroundings, one going out clears them. */
    for f in frames(w) {
        let flame = dvec3_to_vec3(dvec3_add(f.base, dvec3_scale(f.up, FLAME_TIP_M * 0.5)));
        w.dirty_in_range(flame, range);
    }
    torch::set_extra_lights(lights);
}

/// Every LIT bonfire's flame as a scaled `torch::Torch` light record, for
/// `torch::set_extra_lights`. Scale comes from bonfire_config
/// (light_radius_scale / intensity are folded into one `scale`, since the
/// bake uses a single multiplier for both reach and brightness).
pub fn collect_lights(w: &World) -> Vec<torch::Torch> {
    let cfg = tenebris_core::config::bonfire();
    /* The bake's single `scale` multiplies both range and brightness. Use
     * the radius scale (2x reach); the 2x brightness rides on the same
     * factor, matching the "2x a torch" spec. */
    let scale = cfg.light_radius_scale.max(0.1);
    let mut out = Vec::new();
    for f in frames(w) {
        if !f.lit {
            continue;
        }
        /* Body-LOCAL flame point: the terrain bake's vertex frame is
         * body-local (like torch positions), so the light must be too - an
         * absolute position would only line up on a body sitting at the
         * world origin. */
        let flame = dvec3_add(f.local_base, dvec3_scale(f.up, FLAME_TIP_M * 0.5));
        out.push(torch::Torch {
            position: dvec3_to_vec3(flame),
            up: dvec3_to_vec3(f.up),
            flicker_phase: f.phase,
            tile_idx: -1,
            scale,
        });
    }
    out
}
