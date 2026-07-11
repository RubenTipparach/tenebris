//! Precipitation FX - rain streaks / snow flakes falling around the player
//! when they are under a raining/snowing cloud.
//!
//! Stateless like the clouds: the weather field (`core::weather`) says
//! whether the player's column is precipitating and whether it's rain or
//! snow; this draws a cylinder of falling marks around the player,
//! animated by the world clock (no stored particles). Marks are placed
//! deterministically in the local tangent disk and cycle downward, so the
//! player always stands inside the shower and it follows them.

#![allow(dead_code)]

use std::cell::Cell;

use sokol::gfx as sg;
use sokol::gl as sgl;
use tenebris_core::math::{
    dvec3_add, dvec3_cross, dvec3_dot, dvec3_length, dvec3_make, dvec3_normalize, dvec3_scale,
    dvec3_sub, dvec3_to_vec3, DVec3,
};
use tenebris_core::weather::{self, Precip};
use tenebris_core::world::World;

use crate::gfx_math::Mat4;
use crate::player_ctrl::PlayerCtrl;
use crate::renderer;

thread_local! {
    static PIP: Cell<sgl::Pipeline> = const { Cell::new(sgl::Pipeline { id: 0 }) };
}

/// Radius of the shower cylinder around the player, metres.
const DISK_R_M: f64 = 16.0;
/// Height the marks fall through above the player, metres.
const COLUMN_H_M: f64 = 22.0;
/// Max marks at full intensity.
const MAX_MARKS: usize = 1100;

/// Dev screenshot override: TENEBRIS_DEV_WEATHER=rain|snow forces a
/// shower around the player. Read once and cached.
pub fn forced_precip() -> Option<Precip> {
    thread_local! { static F: Cell<i8> = const { Cell::new(-2) }; }
    F.with(|c| {
        if c.get() == -2 {
            let v = std::env::var("TENEBRIS_DEV_WEATHER").unwrap_or_default();
            c.set(match v.as_str() {
                "rain" => 1,
                "snow" => 2,
                _ => 0,
            });
        }
        match c.get() {
            1 => Some(Precip::Rain),
            2 => Some(Precip::Snow),
            _ => None,
        }
    })
}

fn hashf(i: u32, salt: u32) -> f64 {
    let mut h = i.wrapping_mul(0x9E37_79B1).wrapping_add(salt.wrapping_mul(0x85EB_CA77));
    h ^= h >> 15;
    h = h.wrapping_mul(0x2C1B_3C6D);
    h ^= h >> 12;
    h = h.wrapping_mul(0x297A_2D39);
    h ^= h >> 15;
    (h as f64) / (u32::MAX as f64)
}

/// Draw precipitation around the player if their column is precipitating.
pub fn draw(view: Mat4, proj: Mat4, w: &World, p: &PlayerCtrl, time_s: f64) {
    let center = dvec3_make(w.body.pos_x, w.body.pos_y, w.body.pos_z);
    let local = dvec3_sub(p.position, center);
    let r = dvec3_length(local);
    if r < 1.0 {
        return;
    }
    let up = dvec3_scale(local, 1.0 / r);
    let cell = weather::cloud_cell(&w.body, up, time_s);
    /* Dev override (TENEBRIS_DEV_WEATHER=rain|snow) forces a shower for
     * screenshots regardless of the field at the spawn. */
    let forced = forced_precip();
    let (raining, precip) = match forced {
        Some(k) => (true, k),
        None => (cell.raining, cell.precip),
    };
    if !raining || precip == Precip::None {
        return;
    }
    let snow = precip == Precip::Snow;

    /* Intensity from how far past the rain threshold this column sits. */
    let cfg = weather::config();
    let intensity = if forced.is_some() {
        1.0
    } else {
        let d = weather::cloud_density(&w.body, up, time_s);
        (((d - cfg.rain_threshold) / (1.0 - cfg.rain_threshold)).clamp(0.0, 1.0) * 0.7 + 0.3).min(1.0)
    };
    let n = ((MAX_MARKS as f32) * intensity) as usize;
    if n == 0 {
        return;
    }

    /* Tangent basis around the player for placing marks. */
    let reference = if up.y.abs() < 0.9 {
        dvec3_make(0.0, 1.0, 0.0)
    } else {
        dvec3_make(1.0, 0.0, 0.0)
    };
    let t1 = dvec3_normalize(dvec3_cross(reference, up));
    let t2 = dvec3_cross(up, t1);

    renderer::sgl_world_begin();
    sgl::defaults();
    sgl::matrix_mode_projection();
    sgl::load_matrix(&proj.m[0]);
    sgl::matrix_mode_modelview();
    sgl::load_matrix(&view.m[0]);

    let mut pip = PIP.with(|c| c.get());
    if pip.id == 0 {
        let mut desc = sg::PipelineDesc {
            depth: sg::DepthState {
                write_enabled: false,
                compare: sg::CompareFunc::Less,
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
            dst_factor_alpha: sg::BlendFactor::One,
            ..Default::default()
        };
        pip = sgl::make_pipeline(&desc);
        PIP.with(|c| c.set(pip));
    }
    sgl::load_pipeline(pip);
    sgl::begin_triangles();

    /* Screen-right in world for billboard width. */
    let cam_right = dvec3_make(view.m[0] as f64, view.m[4] as f64, view.m[8] as f64);
    let mut right = dvec3_sub(cam_right, dvec3_scale(up, dvec3_dot(cam_right, up)));
    if dvec3_length(right) < 1e-6 {
        right = t1;
    }
    let right = dvec3_normalize(right);

    /* Rain: fast thin bluish streaks. Snow: slow small white flakes with
     * a gentle sideways sway. */
    let (fall_mps, streak_len, half_w, col, alpha) = if snow {
        (2.2f64, 0.11f64, 0.055f64, [0.97f32, 0.98, 1.0], 0.92f32)
    } else {
        (24.0f64, 1.3f64, 0.028f64, [0.78f32, 0.85, 0.95], 0.55f32)
    };
    sgl::c4f(col[0], col[1], col[2], alpha);

    for i in 0..n as u32 {
        let a = hashf(i, 1) * std::f64::consts::TAU;
        let rad = hashf(i, 2).sqrt() * DISK_R_M;
        let ground = dvec3_add(
            p.position,
            dvec3_add(dvec3_scale(t1, a.cos() * rad), dvec3_scale(t2, a.sin() * rad)),
        );
        /* Height cycles downward through the column, offset per mark. */
        let phase = hashf(i, 3);
        let fallen = (time_s * fall_mps / COLUMN_H_M + phase).rem_euclid(1.0);
        let h = COLUMN_H_M * (1.0 - fallen);
        /* Snow drifts sideways as it falls. */
        let sway = if snow {
            let s = (time_s * 0.7 + phase * 6.28).sin() * 0.5;
            dvec3_scale(t1, s)
        } else {
            DVec3::default()
        };
        let top = dvec3_add(dvec3_add(ground, dvec3_scale(up, h)), sway);
        let bot = dvec3_sub(top, dvec3_scale(up, streak_len));

        let hr = dvec3_scale(right, half_w);
        let (tl, tr, bl, br) = (
            dvec3_sub(top, hr),
            dvec3_add(top, hr),
            dvec3_sub(bot, hr),
            dvec3_add(bot, hr),
        );
        for q in [tl, tr, br, tl, br, bl] {
            let v = dvec3_to_vec3(q);
            sgl::v3f(v.x, v.y, v.z);
        }
    }

    sgl::end();
    renderer::sgl_world_end();
}
