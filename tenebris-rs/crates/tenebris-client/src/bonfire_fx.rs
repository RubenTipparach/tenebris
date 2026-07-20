//! Bonfire visuals + light emission.
//!
//! The bonfire is a placed `Block::Bonfire` voxel carrying a
//! `MachineState::Bonfire` block-entity (cook + fuel + burn state, in
//! core::block_entity). It is skipped by the hex mesher (see
//! `hex_mesher::build_tile`) and drawn here instead as an emissive
//! campfire - a stack of crossed sticks plus a flip-book flame billboard
//! that glows at night - so it reads as a fire regardless of the sun.
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

use sokol::gfx as sg;
use sokol::gl as sgl;
use tenebris_core::block_entity::MachineState;
use tenebris_core::math::{
    dvec3_add, dvec3_cross, dvec3_dot, dvec3_make, dvec3_normalize, dvec3_scale, dvec3_sub,
    dvec3_to_vec3, DVec3,
};
use tenebris_core::world::World;

use crate::gfx_math::Mat4;
use crate::renderer;
use crate::torch;

/// Flame flip-book: horizontal strip of FLAME_FRAMES cells, cycled over
/// time for the licking animation. See tools/gen-flame-flipbook.py.
const FLAME_FRAMES: usize = 6;
/// Flip-book playback rate (cells per second).
const FLAME_FPS: f32 = 11.0;

thread_local! {
    static PIP: Cell<sgl::Pipeline> = const { Cell::new(sgl::Pipeline { id: 0 }) };
    static FLAME_PIP: Cell<sgl::Pipeline> = const { Cell::new(sgl::Pipeline { id: 0 }) };
    /* Flame texture, loaded once on first draw. */
    static FLAME_VIEW: Cell<u32> = const { Cell::new(0) };
    static FLAME_SMP: Cell<u32> = const { Cell::new(0) };
    static FLAME_TRIED: Cell<bool> = const { Cell::new(false) };
}

/// Lazy-load the flame flip-book texture into a GPU view + sampler.
/// Returns (view_id, sampler_id), or (0,0) if the PNG is missing.
fn flame_texture() -> (u32, u32) {
    if !FLAME_TRIED.with(|c| c.get()) {
        FLAME_TRIED.with(|c| c.set(true));
        if let Some(img) = renderer::load_png_rgba("assets/textures/flame_flipbook.png", false) {
            let mut desc = sg::ImageDesc {
                width: img.w,
                height: img.h,
                pixel_format: sg::PixelFormat::Rgba8,
                label: c"flame-flipbook".as_ptr(),
                ..Default::default()
            };
            desc.data.mip_levels[0] = sg::slice_as_range(&img.rgba);
            let image = sg::make_image(&desc);
            let view = sg::make_view(&sg::ViewDesc {
                texture: sg::TextureViewDesc { image, ..Default::default() },
                label: c"flame-view".as_ptr(),
                ..Default::default()
            });
            let smp = sg::make_sampler(&sg::SamplerDesc {
                min_filter: sg::Filter::Linear,
                mag_filter: sg::Filter::Linear,
                wrap_u: sg::Wrap::ClampToEdge,
                wrap_v: sg::Wrap::ClampToEdge,
                label: c"flame-sampler".as_ptr(),
                ..Default::default()
            });
            FLAME_VIEW.with(|c| c.set(view.id));
            FLAME_SMP.with(|c| c.set(smp.id));
        } else {
            println!("[bonfire] flame_flipbook.png missing; flame billboard disabled");
        }
    }
    (FLAME_VIEW.with(|c| c.get()), FLAME_SMP.with(|c| c.get()))
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

/// One ORIENTED stick: a thin square-section box running from local point
/// a to b (frame coords), so a leaning stick reads as a stick, not an
/// axis-aligned slab. Colour is set by the caller.
fn stick(f: &Frame, ax: f64, au: f64, af: f64, bx: f64, bu: f64, bf: f64, th: f64) {
    let a = wp(f, ax, au, af);
    let b = wp(f, bx, bu, bf);
    let axis = dvec3_sub(b, a);
    let len = dvec3_length_sq(axis).sqrt();
    if len < 1e-5 {
        return;
    }
    let axis = dvec3_scale(axis, 1.0 / len);
    let refv = if axis.y.abs() < 0.9 {
        dvec3_make(0.0, 1.0, 0.0)
    } else {
        dvec3_make(1.0, 0.0, 0.0)
    };
    let p1 = dvec3_normalize(dvec3_cross(axis, refv));
    let p2 = dvec3_cross(axis, p1);
    /* 8 corners: a-end quad then b-end quad, each ±th on p1/p2. */
    let corner = |base: DVec3, s1: f64, s2: f64| {
        dvec3_add(base, dvec3_add(dvec3_scale(p1, s1 * th), dvec3_scale(p2, s2 * th)))
    };
    let c = [
        corner(a, -1.0, -1.0),
        corner(a, 1.0, -1.0),
        corner(a, 1.0, 1.0),
        corner(a, -1.0, 1.0),
        corner(b, -1.0, -1.0),
        corner(b, 1.0, -1.0),
        corner(b, 1.0, 1.0),
        corner(b, -1.0, 1.0),
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

/// Draw all placed bonfires: a stack of crossed sticks (always) + a
/// flip-book flame billboard (only while lit).
pub fn draw(w: &World, view: Mat4, proj: Mat4, time_s: f32) {
    let mut frames = frames(w);
    if frames.is_empty() {
        return;
    }
    /* Floating origin: at heliocentric scale the bodies sit ~150 km from the
     * world origin, so absolute f32 stick/flame vertices jitter. Rebase every
     * frame's draw base by the absolute camera (the caller hands us the
     * eye-at-origin scene view to match). The body-local torch-light path
     * below uses `local_base`, which stays body-local and is untouched. */
    let cam = renderer::camera_world_d();
    for f in &mut frames {
        f.base = dvec3_sub(f.base, cam);
    }

    /* ---------- Pass 1: the stick pile (opaque, depth-written) ----------
     * Drawn in the WORLD (offscreen) context so it's part of the scene the
     * water pass refracts and depth-tests against. */
    renderer::sgl_world_begin();
    sgl::defaults();
    sgl::matrix_mode_projection();
    sgl::load_matrix(&proj.m[0]);
    sgl::matrix_mode_modelview();
    sgl::load_matrix(&view.m[0]);

    let mut pip = PIP.with(|p| p.get());
    if pip.id == 0 {
        let mut desc = sg::PipelineDesc {
            depth: sg::DepthState {
                write_enabled: true,
                compare: sg::CompareFunc::Less,
                ..Default::default()
            },
            cull_mode: sg::CullMode::None,
            ..Default::default()
        };
        /* RGB-only: the offscreen alpha is the composite's wet-mask (terrain
         * bakes v_wet there; water fog keys off it). The stick pile must not
         * write it, or a bonfire below sea level would paint teal water fog as
         * a square - the same class as the torch-glow teal square. */
        desc.colors[0].write_mask = sg::ColorMask::Rgb;
        pip = sgl::make_pipeline(&desc);
        PIP.with(|p| p.set(pip));
    }
    sgl::load_pipeline(pip);
    sgl::begin_triangles();
    for f in &frames {
        /* A teepee of sticks: six thin billets leaning in from a base ring
         * up to a shared apex, with a couple of logs crossed at the base.
         * Warm lit brown (the fire lights the wood) when burning, grey-brown
         * charcoal when cold. */
        let (lr, lg, lb) = if f.lit { (0.56, 0.34, 0.16) } else { (0.26, 0.23, 0.22) };
        sgl::c3f(lr, lg, lb);
        let th = 0.028;
        let ring = 0.24;
        let apex = 0.44;
        for i in 0..6 {
            let a = (i as f64) / 6.0 * std::f64::consts::TAU + 0.3;
            let (ca, sa) = (a.cos(), a.sin());
            /* Leaning billet: base out on the ring -> apex just off centre
             * (small offset so the tips don't all pinch to one point). */
            stick(
                f,
                ca * ring,
                0.03,
                sa * ring,
                ca * 0.05,
                apex,
                sa * 0.05,
                th,
            );
        }
        /* Two logs crossed flat at the base. */
        stick(f, -ring, 0.045, -0.06, ring, 0.045, 0.06, th * 1.3);
        stick(f, -0.06, 0.045, ring, 0.06, 0.045, -ring, th * 1.3);
        /* Glowing ember bed at the base when lit. */
        if f.lit {
            sgl::c3f(1.0, 0.45, 0.14);
            push_box(f, 0.0, 0.05, 0.0, 0.11, 0.03, 0.11);
        }
    }
    sgl::end();
    renderer::sgl_world_end();

    /* ---------- Pass 2: the flame billboard (flip-book, additive) -------
     * Recorded in the OVERLAY (default) sgl context, NOT the world/offscreen
     * one, so it flushes AFTER the water pass and depth-tests against the
     * scene+water depth the composite forwarded. Recorded in the offscreen
     * pass (as it used to be), the additive/no-depth-write flame left no depth
     * for the later opaque water pass, so water overpainted the flame wherever
     * the sea sat behind it - the "flame not drawing over water" bug. See
     * renderer::sgl_overlay_begin. */
    let (fview, fsmp) = flame_texture();
    if fview != 0 && !renderer::dev_hidden("flame") && frames.iter().any(|f| f.lit) {
        renderer::sgl_overlay_begin();
        sgl::defaults();
        sgl::matrix_mode_projection();
        sgl::load_matrix(&proj.m[0]);
        sgl::matrix_mode_modelview();
        sgl::load_matrix(&view.m[0]);
        let mut fpip = FLAME_PIP.with(|p| p.get());
        if fpip.id == 0 {
            let mut desc = sg::PipelineDesc {
                /* Test depth so terrain in front occludes the flame, but do
                 * NOT write it (transparent). */
                depth: sg::DepthState {
                    write_enabled: false,
                    compare: sg::CompareFunc::Less,
                    ..Default::default()
                },
                cull_mode: sg::CullMode::None,
                ..Default::default()
            };
            /* Additive blend so the emissive flame glows and overlapping
             * cross-billboards brighten. */
            desc.colors[0].blend = sg::BlendState {
                enabled: true,
                src_factor_rgb: sg::BlendFactor::SrcAlpha,
                dst_factor_rgb: sg::BlendFactor::One,
                src_factor_alpha: sg::BlendFactor::One,
                dst_factor_alpha: sg::BlendFactor::One,
                ..Default::default()
            };
            fpip = sgl::make_pipeline(&desc);
            FLAME_PIP.with(|p| p.set(fpip));
        }
        sgl::load_pipeline(fpip);
        sgl::enable_texture();
        sgl::texture(sg::View { id: fview }, sg::Sampler { id: fsmp });
        sgl::begin_triangles();
        sgl::c4f(1.0, 1.0, 1.0, 1.0);

        /* Screen-right in world (view matrix row 0). */
        let cam_right = dvec3_make(view.m[0] as f64, view.m[4] as f64, view.m[8] as f64);
        const FLAME_W: f64 = 0.55; // half-width
        const FLAME_H: f64 = 1.35;

        for f in &frames {
            if !f.lit {
                continue;
            }
            /* Upright cylindrical billboard: horizontal axis = screen-right
             * projected off the surface normal, so the flame always stands
             * up and turns to face the camera. */
            let mut right = dvec3_sub(cam_right, dvec3_scale(f.up, dvec3_dot(cam_right, f.up)));
            if dvec3_length_sq(right) < 1e-6 {
                right = f.t1;
            }
            let right = dvec3_normalize(right);
            let right2 = dvec3_normalize(dvec3_cross(f.up, right)); // crossed quad
            /* Current flip-book cell, offset per fire so they desync. */
            let frame_i = (((time_s * FLAME_FPS + f.phase * 3.0) as i64).rem_euclid(
                FLAME_FRAMES as i64,
            )) as usize;
            let u0 = frame_i as f32 / FLAME_FRAMES as f32;
            let u1 = (frame_i as f32 + 1.0) / FLAME_FRAMES as f32;
            /* Base a touch above the sticks so the flame roots in them. */
            let base = dvec3_add(f.base, dvec3_scale(f.up, 0.14));
            for axis in [right, right2] {
                billboard_quad(base, f.up, axis, FLAME_W, FLAME_H, u0, u1);
            }
        }
        sgl::end();
        sgl::disable_texture();
    }

    renderer::sgl_world_end();
}

#[inline]
fn dvec3_length_sq(v: DVec3) -> f64 {
    v.x * v.x + v.y * v.y + v.z * v.z
}

/// Emit one upright flame quad (two triangles) rooted at `base`, rising
/// `h` along `up`, `w` half-wide along `axis`, sampling flip-book columns
/// [u0,u1] (v: 0 = flame tip at the top, 1 = base at the bottom).
#[allow(clippy::too_many_arguments)]
fn billboard_quad(base: DVec3, up: DVec3, axis: DVec3, w: f64, h: f64, u0: f32, u1: f32) {
    let bl = dvec3_sub(base, dvec3_scale(axis, w));
    let br = dvec3_add(base, dvec3_scale(axis, w));
    let tl = dvec3_add(bl, dvec3_scale(up, h));
    let tr = dvec3_add(br, dvec3_scale(up, h));
    let vt = |p: DVec3, u: f32, v: f32| {
        let q = dvec3_to_vec3(p);
        sgl::v3f_t2f(q.x, q.y, q.z, u, v);
    };
    vt(bl, u0, 1.0);
    vt(br, u1, 1.0);
    vt(tr, u1, 0.0);
    vt(bl, u0, 1.0);
    vt(tr, u1, 0.0);
    vt(tl, u0, 0.0);
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
     * a fire coming on lights its surroundings, one going out clears them.
     * BODY-LOCAL flame point: dirty_in_range projects radially from the body
     * origin and compares body-local tile centres, exactly like the light
     * bake (collect_lights uses local_base too). Passing f.base (absolute
     * world) worked only on a body at the world origin (Tenebris); off-origin
     * bodies dirtied the wrong tiles, so a lit fire never re-baked its
     * surroundings and the ground stayed dark. */
    for f in frames(w) {
        let flame = dvec3_to_vec3(dvec3_add(f.local_base, dvec3_scale(f.up, FLAME_TIP_M * 0.5)));
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
