//! Puffy clouds (client) - a drifting layer of white box-cluster puffs
//! on a shell above the planet surface.
//!
//! Zero state: every frame re-derives the visible puffs from a
//! deterministic hash over lat/long cells of the cloud shell, with the
//! whole sampling frame rotated about the planet's spin axis by
//! `time * drift / shell_radius` - the pattern rotating IS the drift,
//! so clouds cross the sky like weather without any per-cloud storage,
//! and every client on a body sees the same sky. The layer covers the
//! WHOLE shell: every cell whose puff clears the planet's horizon is
//! drawn (each puff's box frame is spanned by its own surface normal,
//! so the layer visibly curves around the globe and stays a coherent
//! sphere of weather when seen from space). Puffs beyond `range_m`
//! drop their lump cluster and draw as a single slab - an LOD, not a
//! cutoff. Rendering goes through the renderer's world-space sokol_gl
//! context (like `animals.rs`) so puffs z-sort against terrain and sit
//! under the composite post-process. Tuning lives in
//! `assets/config/clouds.yaml` (core::clouds).

use std::cell::Cell;

use sokol::gl as sgl;

use tenebris_core::clouds as clouds_cfg;
use tenebris_core::math::{
    dvec3_add, dvec3_cross, dvec3_length, dvec3_make, dvec3_normalize, dvec3_scale, dvec3_sub,
    DVec3,
};
use tenebris_core::rng::hash3;
use tenebris_core::weather;
use tenebris_core::world::World;

use crate::gfx_math::Mat4;
use crate::player_ctrl::PlayerCtrl;
use crate::renderer;

thread_local! {
    static PIP3D: Cell<sgl::Pipeline> = const { Cell::new(sgl::Pipeline { id: 0 }) };
}

/* Hash salts - distinct decision streams per cell, not tunables. */
const SALT_EXIST: i32 = 0x71;
const SALT_SIZE: i32 = 0x72;
const SALT_JITTER_A: i32 = 0x73;
const SALT_JITTER_B: i32 = 0x74;
const SALT_LUMPS: i32 = 0x75;

/// Rotate `v` about the +Y planet spin axis (matches orbit::SPIN_AXIS).
fn rotate_y(v: DVec3, ang: f64) -> DVec3 {
    let (s, c) = ang.sin_cos();
    dvec3_make(v.x * c + v.z * s, v.y, -v.x * s + v.z * c)
}

/// One axis-aligned-in-frame cuboid centred at `c`, spanned by the
/// local (t1, t2, up) frame, per-face shaded like the entity boxes.
#[allow(clippy::too_many_arguments)]
fn push_puff_box(
    c: DVec3,
    up: DVec3,
    t1: DVec3,
    t2: DVec3,
    hx: f64,
    hy: f64,
    hz: f64,
    col: [f32; 3],
) {
    /* 8 corners: (sx, sy, sz) in {-1, 1}. */
    let corner = |sx: f64, sy: f64, sz: f64| {
        dvec3_add(
            dvec3_add(c, dvec3_scale(t1, sx * hx)),
            dvec3_add(dvec3_scale(up, sy * hy), dvec3_scale(t2, sz * hz)),
        )
    };
    let p = [
        corner(-1.0, -1.0, -1.0),
        corner(1.0, -1.0, -1.0),
        corner(1.0, -1.0, 1.0),
        corner(-1.0, -1.0, 1.0),
        corner(-1.0, 1.0, -1.0),
        corner(1.0, 1.0, -1.0),
        corner(1.0, 1.0, 1.0),
        corner(-1.0, 1.0, 1.0),
    ];
    /* (quad corner indices, shade) - flat-bottomed cumulus look: bright
     * top, noticeably darker base. */
    let faces: [([usize; 4], f32); 6] = [
        ([4, 7, 6, 5], 1.0),  /* top */
        ([0, 1, 2, 3], 0.62), /* bottom */
        ([0, 4, 5, 1], 0.85),
        ([2, 6, 7, 3], 0.85),
        ([1, 5, 6, 2], 0.78),
        ([3, 7, 4, 0], 0.78),
    ];
    for (q, shade) in faces.iter() {
        sgl::c3f(col[0] * shade, col[1] * shade, col[2] * shade);
        for &i in &[0usize, 1, 2, 0, 2, 3] {
            let v = p[q[i]];
            sgl::v3f(v.x as f32, v.y as f32, v.z as f32);
        }
    }
}

/// Draw the cloud layer for the active body. Called in the offscreen
/// opaque pass next to the other sgl world entities.
pub fn draw(view: Mat4, proj: Mat4, w: &World, p: &PlayerCtrl, time_s: f64) {
    let cfg = clouds_cfg::config();
    if cfg.density <= 0.0 {
        return;
    }
    let center = dvec3_make(w.body.pos_x, w.body.pos_y, w.body.pos_z);
    let local = dvec3_sub(p.position, center);
    let r = dvec3_length(local);
    if r < 1.0 {
        return;
    }
    let shell_r = w.body.radius_m as f64 + cfg.altitude_m as f64;

    /* Sample frame: rotate the player direction INTO cloud space (the
     * pattern is fixed there; the inverse rotation on the way out is
     * what makes the puffs drift across the world). */
    let drift_ang = time_s * cfg.drift_mps as f64 / shell_r;
    let dir_world = dvec3_scale(local, 1.0 / r);
    let dir = rotate_y(dir_world, drift_ang);

    let theta_p = dir.y.clamp(-1.0, 1.0).acos(); /* 0..pi from +Y */

    let cell_ang = (cfg.cell_m as f64 / shell_r).max(1e-5);
    let n_rows = (std::f64::consts::PI / cell_ang).ceil() as i32;

    /* Horizon cull: a shell point is (conservatively) visible when the
     * angle between it and the player, both seen from the planet
     * centre, is under the sum of the two tangent-horizon angles -
     * acos(R/r) for the player, acos(R/shell) for the puff - plus a
     * puff-width margin so clouds peeking over the horizon still draw.
     * On the surface this collapses to the shell's own horizon cap;
     * from space it opens up to the full facing hemisphere. dot() is
     * rotation-invariant, so the test runs in cloud space before any
     * rotate-back. */
    let planet_r = w.body.radius_m as f64;
    let horizon_player = (planet_r / r.max(planet_r)).clamp(-1.0, 1.0).acos();
    let horizon_puff = (planet_r / shell_r).clamp(-1.0, 1.0).acos();
    let margin_ang = 2.0 * cfg.puff_w_m as f64 / shell_r;
    let view_ang = horizon_player + horizon_puff + margin_ang;
    let cos_view = view_ang.min(std::f64::consts::PI).cos();

    renderer::sgl_world_begin();
    sgl::defaults();
    sgl::matrix_mode_projection();
    sgl::load_matrix(&proj.m[0]);
    sgl::matrix_mode_modelview();
    sgl::load_matrix(&view.m[0]);

    let mut pip = PIP3D.with(|c| c.get());
    if pip.id == 0 {
        /* Fully OPAQUE clouds: no blending (translucent cloud faces had
         * order-dependent sorting artefacts in the thin shell). Depth TEST
         * + WRITE on so puffs occlude each other and the terrain correctly,
         * and read as solid masses. */
        let desc = sokol::gfx::PipelineDesc {
            depth: sokol::gfx::DepthState {
                write_enabled: true,
                compare: sokol::gfx::CompareFunc::Less,
                ..Default::default()
            },
            cull_mode: sokol::gfx::CullMode::None,
            ..Default::default()
        };
        pip = sgl::make_pipeline(&desc);
        PIP3D.with(|c| c.set(pip));
    }
    sgl::load_pipeline(pip);
    sgl::begin_triangles();

    let detail2 = (cfg.range_m as f64) * (cfg.range_m as f64);
    /* Weather: the moisture/solar field (core::weather) gates each cell's
     * coverage - clouds condense where solar warmth meets biome moisture,
     * clear over arid ground. The field drifts over the world with the
     * layer, so cells grow and dissipate as it passes. */
    let wcfg = weather::config();
    for ti in 0..n_rows {
        let theta_c = (ti as f64 + 0.5) * cell_ang;
        if theta_c >= std::f64::consts::PI {
            continue;
        }
        /* Row cull: co-latitude difference lower-bounds the great-
         * circle distance to every cell in the row. */
        if (theta_c - theta_p).abs() > view_ang + cell_ang {
            continue;
        }
        /* Row-local longitude step: cells stay ~cell_m wide as the
         * rows tighten toward the poles (each row indexes its own
         * phi grid, which is fine - identity only has to be stable
         * per row). */
        let sin_t = theta_c.sin().max(0.05);
        let dphi = cell_ang / sin_t;
        let row_cells = (std::f64::consts::TAU / dphi).ceil() as i32;
        for pj in 0..row_cells {
            let roll = hash3(ti, pj, SALT_EXIST);
            /* Puff centre: cell centre + hashed jitter, rotated back
             * out of cloud space onto the world shell. */
            let jt = (hash3(ti, pj, SALT_JITTER_A) as f64 - 0.5) * 0.8;
            let jp = (hash3(ti, pj, SALT_JITTER_B) as f64 - 0.5) * 0.8;
            let theta = theta_c + jt * cell_ang;
            let phi = (pj as f64 + 0.5 + jp) * dphi;
            let (st, ct) = theta.sin_cos();
            let (sp, cp) = phi.sin_cos();
            let dir_c = dvec3_make(st * cp, ct, st * sp);
            /* Behind the planet's horizon - skip before rotate-back. */
            if dir_c.x * dir.x + dir_c.y * dir.y + dir_c.z * dir.z < cos_view {
                continue;
            }
            /* Weather: sample the cloud field at this cell's WORLD position
             * (drifted into world space). Coverage drives whether a cloud
             * is here at all + how big/opaque it is; the field drifting
             * over the world IS the spawn/grow/dissipate lifecycle. */
            let dir_w_base = rotate_y(dir_c, -drift_ang);
            let mut cell = weather::cloud_cell(&w.body, dir_w_base, time_s);
            /* Dev override (TENEBRIS_DEV_WEATHER): force a dark storm deck
             * overhead so the forced shower has clouds to fall from. */
            if crate::weather_fx::forced_precip().is_some() {
                cell.cover = 1.0;
                cell.alpha = 1.0;
                cell.raining = true;
            }
            if cell.cover <= 0.03 {
                continue; /* clear sky here */
            }
            /* Coverage-driven cell population: sparse scattered puffs where
             * coverage is low (a few forming clouds), rising to a SOLID
             * deck (every cell filled) at full overcast - so a rain cloud
             * always covers the ground it rains on, with no gaps for the
             * precipitation to fall through. */
            let cov = cell.cover as f64;
            let sc = {
                let t = ((cov - 0.4) / 0.6).clamp(0.0, 1.0);
                t * t * (3.0 - 2.0 * t)
            };
            let eff = cfg.density as f64 + (1.0 - cfg.density as f64) * sc;
            if (roll as f64) >= eff {
                continue;
            }
            /* Every cloud drifts at the single layer speed (cfg.drift_mps) -
             * that's the hard max, so nothing zips past the base rate. */
            let dir_w = rotate_y(dir_c, -drift_ang);
            let pos = dvec3_add(center, dvec3_scale(dir_w, shell_r));
            let d2 = {
                let d = dvec3_sub(pos, p.position);
                d.x * d.x + d.y * d.y + d.z * d.z
            };

            /* Local frame + day/night lit colour (moonlit floor). Rain
             * clouds darken their base a touch. */
            let up = dir_w;
            let reference = if up.y.abs() < 0.9 {
                dvec3_make(0.0, 1.0, 0.0)
            } else {
                dvec3_make(1.0, 0.0, 0.0)
            };
            let t1 = dvec3_normalize(dvec3_cross(reference, up));
            let t2 = dvec3_cross(up, t1);
            let lit = renderer::entity_sun_brightness(pos).max(cfg.night_min);
            let grey = if cell.raining { 0.72 } else { 1.0 };
            let col = [cfg.color[0] * lit * grey, cfg.color[1] * lit * grey, cfg.color[2] * lit * grey];

            /* Size grows with coverage: a small forming cloud is a little
             * cube, a mature mass is a wide cumulus. Rain/snow clouds tower
             * into big, tall dark masses. */
            let storm = if cell.raining { wcfg.rain_cloud_scale as f64 } else { 1.0 };
            let sz =
                (0.35 + 1.1 * cell.cover as f64) * (0.65 + 0.5 * hash3(ti, pj, SALT_SIZE) as f64) * storm;
            let hw = cfg.puff_w_m as f64 * sz;
            let hh = cfg.puff_h_m as f64 * sz * if cell.raining { 1.7 } else { 1.0 };
            if d2 > detail2 {
                push_puff_box(pos, up, t1, t2, hw, hh * 1.4, hw * 0.8, col);
                continue;
            }
            push_puff_box(pos, up, t1, t2, hw, hh, hw * 0.8, col);
            /* Mature clouds grow a cluster of lumps AROUND the slab - not
             * just stacked on top - so the underside is bumpy cumulus when
             * you look straight up, instead of a flat floating plate. Each
             * lump gets a hashed radial offset in the tangent plane plus a
             * vertical offset that ranges from below the slab to above it,
             * making the puff a rounded blob from every angle. */
            if cell.cover > 0.4 {
                let lumps = 3 + (hash3(ti, pj, SALT_LUMPS) * 3.0) as i32;
                for l in 0..lumps {
                    let la = hash3(ti, pj.wrapping_add(31 * (l + 1)), SALT_LUMPS) as f64
                        * std::f64::consts::TAU;
                    let ld = hw * (0.25 + 0.55 * hash3(ti.wrapping_add(l), pj, SALT_SIZE) as f64);
                    /* Vertical spread: -0.5h (hanging below) .. +1.0h (piled
                     * on top), so lumps wrap the slab top AND bottom. */
                    let vh = hash3(ti.wrapping_add(l * 13), pj, SALT_JITTER_A) as f64;
                    let voff = (vh - 0.35) * hh * 1.5;
                    let off = dvec3_add(
                        dvec3_add(
                            dvec3_scale(t1, la.cos() * ld),
                            dvec3_scale(t2, la.sin() * ld),
                        ),
                        dvec3_scale(up, voff),
                    );
                    let lc = dvec3_add(pos, off);
                    let ls = 0.4 + 0.35 * hash3(ti, pj.wrapping_add(7 * l), SALT_SIZE) as f64;
                    push_puff_box(lc, up, t1, t2, hw * ls, hh * ls * 1.3, hw * ls * 0.95, col);
                }
            }
        }
    }

    sgl::end();
    renderer::sgl_world_end();
}
