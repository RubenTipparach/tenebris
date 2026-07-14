//! Precipitation FX - world-space rain streaks / snow flakes.
//!
//! Stateless like the clouds: the weather field (`core::weather`) says which
//! surface columns are precipitating and whether it is rain or snow; this
//! draws the falling precipitation for the whole visible hemisphere, animated
//! by the world clock (no stored particles). Two coordinated layers:
//!
//! - A dense NEAR shower around the player (a tangent disk of animated
//!   streaks) for immersion when standing in the weather.
//! - Distant STORM SHAFTS: translucent falling curtains under every raining
//!   cloud cell across the visible hemisphere, so a storm reads as rain
//!   hanging under its cloud from far away and from orbit - not just an
//!   effect glued to the camera.
//!
//! Voxel-aware: every streak falls from the cloud deck down to the SURFACE
//! (or the water surface over ocean), so no precipitation is ever drawn below
//! the waterline or buried in terrain, and the near shower is suppressed when
//! the camera is underwater or roofed inside a cave.
//!
//! Snow vs rain is split by ALTITUDE as well as biome: cold columns fall as
//! snow up high and turn to rain below the snow line (`SNOW_LINE_ALT_M`), as
//! two distinct particle styles in the same column.

#![allow(dead_code)]

use std::cell::Cell;

use sokol::gfx as sg;
use sokol::gl as sgl;
use tenebris_core::clouds as clouds_cfg;
use tenebris_core::math::{
    dvec3_add, dvec3_cross, dvec3_dot, dvec3_length, dvec3_make, dvec3_normalize, dvec3_scale,
    dvec3_sub, dvec3_to_vec3, DVec3,
};
use tenebris_core::blocks::Block;
use tenebris_core::planet_gen;
use tenebris_core::rng::hash3;
use tenebris_core::weather::{self, Precip};
use tenebris_core::world::World;

use crate::gfx_math::Mat4;
use crate::player_ctrl::PlayerCtrl;
use crate::renderer;

thread_local! {
    static PIP: Cell<sgl::Pipeline> = const { Cell::new(sgl::Pipeline { id: 0 }) };
}

/// Radius of the dense near shower cylinder around the player, metres.
const DISK_R_M: f64 = 18.0;
/// Height the marks fall through above the surface, metres. Reaches up
/// toward the cloud deck (clouds.yaml altitude ~60 m) so the shower connects
/// to the cloud it falls from instead of floating in a band.
const COLUMN_H_M: f64 = 46.0;
/// Max marks in the near shower at full intensity.
const MAX_MARKS: usize = 1700;
/// Altitude above sea level (metres) above which precipitation falls as snow
/// and below which it turns to rain. Only cold (snow-capable) columns split;
/// warm columns are rain at every altitude. This is the "snow turns into rain
/// after a certain point" line, applied to the falling particle by its height.
const SNOW_LINE_ALT_M: f64 = 16.0;
/// Inner cull for the distant shafts. The immersive near shower is disabled,
/// so the shafts (world-anchored 3D curtains) must reach right up to the
/// player - otherwise there is a rain-free bubble overhead and "the rain is
/// gone" where you actually stand. Small, not the old 30 m gap.
const SHAFT_NEAR_M: f64 = 1.5;
/// Beyond this range distant shafts are culled entirely (metres). Large so
/// storms stay visible from a high orbit but not across the whole planet.
const SHAFT_RANGE_M: f64 = 1400.0;
/// Falling streaks per distant storm cell.
const SHAFT_STREAKS: i32 = 5;
/// Hard cap on distant shaft streaks per frame (perf backstop from orbit).
const MAX_SHAFT_STREAKS: usize = 9000;
/// Fade band, as a fraction of the cloud altitude, over which each drop fades
/// in just below the cloud and out at the surface. The drop falls at constant
/// speed and loops back to the cloud instantly; this fade hides the loop seam
/// and the surface cull so neither reads as a pop or an upward flick.
const STREAK_FADE_FRAC: f64 = 0.15;

thread_local! {
    /// Runtime storm override, cycled by the player (P key): 0 off,
    /// 1 rain, 2 snow. Forces a full overcast + shower everywhere so a
    /// storm can be triggered on demand ("toggle atmosphere moisture").
    static STORM: Cell<i8> = const { Cell::new(0) };
}

/// Cycle the manual storm override: off -> rain -> snow -> off. Returns
/// the new state's label for a HUD toast.
pub fn cycle_storm() -> &'static str {
    STORM.with(|c| {
        let n = (c.get() + 1) % 3;
        c.set(n);
        match n {
            1 => "storm: RAIN",
            2 => "storm: SNOW",
            _ => "storm: OFF",
        }
    })
}

/// True while a manual storm is forced on.
pub fn storm_active() -> bool {
    STORM.with(|c| c.get() != 0)
}

/// Forced precipitation, if any - from the runtime storm toggle (P key)
/// or the TENEBRIS_DEV_WEATHER=rain|snow screenshot override. The toggle
/// wins so it can be flipped live; the env value seeds the default.
pub fn forced_precip() -> Option<Precip> {
    thread_local! { static F: Cell<i8> = const { Cell::new(-2) }; }
    let env = F.with(|c| {
        if c.get() == -2 {
            let v = std::env::var("TENEBRIS_DEV_WEATHER").unwrap_or_default();
            c.set(match v.as_str() {
                "rain" => 1,
                "snow" => 2,
                _ => 0,
            });
        }
        c.get()
    });
    let s = STORM.with(|c| c.get());
    match if s != 0 { s } else { env } {
        1 => Some(Precip::Rain),
        2 => Some(Precip::Snow),
        _ => None,
    }
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

/// Rotate `v` about the +Y planet spin axis (matches clouds drift frame).
fn rotate_y(v: DVec3, ang: f64) -> DVec3 {
    let (s, c) = ang.sin_cos();
    dvec3_make(v.x * c + v.z * s, v.y, -v.x * s + v.z * c)
}

/// Per-style falling look: (fall speed m/s, streak length m, half width m,
/// rgb, alpha). Rain is fast thin bluish streaks; snow is slow small white
/// flakes.
fn style(snow: bool) -> (f64, f64, f64, [f32; 3], f32) {
    if snow {
        (2.2, 0.11, 0.055, [0.97, 0.98, 1.0], 0.92)
    } else {
        /* Rain fall speed, streak width + tint are weather.yaml knobs
         * (faster, thinner, bluer drops than the old fixed values). */
        let c = weather::config();
        let col = [c.rain_color_r, c.rain_color_g, c.rain_color_b];
        (c.rain_fall_mps as f64, 1.0, c.rain_width_m as f64, col, 0.55)
    }
}

/// Surface altitude (metres above sea) that precipitation lands on at a unit
/// direction: the terrain top, or the water surface over ocean, so nothing
/// falls below the waterline.
fn land_alt(w: &World, dir: DVec3) -> f64 {
    let surf = planet_gen::surface_altitude(&w.body, dir) as f64;
    let sea = planet_gen::sea_raise_m(&w.body) as f64; /* SEA_LEVEL is 0 */
    surf.max(sea)
}

/// Push one billboarded streak quad (top -> down `len` along `up`, width from
/// the camera `right`). Colour must be set by the caller.
fn push_streak(top: DVec3, up: DVec3, right: DVec3, len: f64, half_w: f64) {
    let bot = dvec3_sub(top, dvec3_scale(up, len));
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

/// Draw precipitation for the active body: the near shower plus distant
/// storm shafts. Called in the offscreen opaque pass next to `clouds::draw`.
pub fn draw(view: Mat4, proj: Mat4, w: &World, p: &PlayerCtrl, time_s: f64) {
    let center = dvec3_make(w.body.pos_x, w.body.pos_y, w.body.pos_z);
    let local = dvec3_sub(p.position, center);
    let r = dvec3_length(local);
    if r < 1.0 {
        return;
    }
    let up = dvec3_scale(local, 1.0 / r);
    let planet_r = w.body.radius_m as f64;

    let forced = forced_precip();

    /* Cloud deck the precipitation falls from (same shell the clouds ride). */
    let ccfg = clouds_cfg::config();
    let shell_r = planet_r + ccfg.altitude_m as f64;

    /* Screen-right in world for billboard width (shared by both layers). */
    let cam_right = dvec3_make(view.m[0] as f64, view.m[4] as f64, view.m[8] as f64);

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

    /* Near-shower DISABLED: those 3D streaks spawned in a disk around the
     * player and fell "in camera space" right on top of the view, which
     * read as rain stuck to the screen. Precipitation is now the distant
     * shafts (world-anchored curtains) plus the composite lens droplets.
     * The fn is kept (allow(dead_code)) for an easy re-enable. */
    draw_distant_shafts(w, p, up, r, planet_r, shell_r, cam_right, forced, time_s);

    sgl::end();
    renderer::sgl_world_end();
}

/// Dense animated shower in a tangent disk around the player, when the
/// player's own column is precipitating. Voxel-aware (streaks land on the
/// surface / water top, suppressed underwater or in a cave) and split into
/// snow above the snow line and rain below it.
#[allow(dead_code)] // disabled in draw(); kept for easy re-enable
fn draw_near_shower(
    view: Mat4,
    w: &World,
    p: &PlayerCtrl,
    up: DVec3,
    cam_right: DVec3,
    forced: Option<Precip>,
    time_s: f64,
) {
    let center = dvec3_make(w.body.pos_x, w.body.pos_y, w.body.pos_z);
    let cell = weather::cloud_cell(&w.body, up, time_s);
    let (raining, precip) = match forced {
        Some(k) => (true, k),
        None => (cell.raining, cell.precip),
    };
    if !raining || precip == Precip::None {
        return;
    }

    /* Voxel gate: no immersive shower when the camera can't see the sky -
     * inside a water voxel, or roofed under terrain (below the surface). */
    let cam_blk = w.block_at_pos(dvec3_to_vec3(dvec3_sub(p.position, center)), -1);
    if cam_blk == Block::Water {
        return;
    }
    let player_alt = dvec3_length(dvec3_sub(p.position, center)) - w.body.radius_m as f64;
    if player_alt < land_alt(w, up) - 0.8 {
        return; /* underground / in a cave */
    }

    let cfg = weather::config();
    let intensity = if forced.is_some() {
        1.0
    } else {
        let d = weather::cloud_density(&w.body, up, time_s);
        (((d - cfg.rain_threshold) / (1.0 - cfg.rain_threshold)).clamp(0.0, 1.0) * 0.7 + 0.3)
            .min(1.0)
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

    let mut right = dvec3_sub(cam_right, dvec3_scale(up, dvec3_dot(cam_right, up)));
    if dvec3_length(right) < 1e-6 {
        right = t1;
    }
    let right = dvec3_normalize(right);

    let snow_capable = precip == Precip::Snow;
    let (rain_fall, rain_len, rain_w, rain_col, rain_a) = style(false);
    let (snow_fall, snow_len, snow_w, snow_col, snow_a) = style(true);

    for i in 0..n as u32 {
        let a = hashf(i, 1) * std::f64::consts::TAU;
        let rad = hashf(i, 2).sqrt() * DISK_R_M;
        let ground = dvec3_add(
            p.position,
            dvec3_add(dvec3_scale(t1, a.cos() * rad), dvec3_scale(t2, a.sin() * rad)),
        );
        /* Land the streak on the surface (or water top) under this mark, so
         * nothing dips below the waterline or into the ground. */
        let g_local = dvec3_sub(ground, center);
        let g_len = dvec3_length(g_local);
        if g_len < 1.0 {
            continue;
        }
        let g_dir = dvec3_scale(g_local, 1.0 / g_len);
        let base_alt = land_alt(w, g_dir);
        let base_r = w.body.radius_m as f64 + base_alt;
        let base_pt = dvec3_add(center, dvec3_scale(g_dir, base_r));

        /* Height cycles downward through the column, offset per mark. */
        let phase = hashf(i, 3);
        let mark_alt = base_alt + phase * COLUMN_H_M; /* altitude of this mark */
        let snow = snow_capable && mark_alt > SNOW_LINE_ALT_M;
        let (fall_mps, streak_len, half_w, col, alpha) = if snow {
            (snow_fall, snow_len, snow_w, snow_col, snow_a)
        } else {
            (rain_fall, rain_len, rain_w, rain_col, rain_a)
        };
        let fallen = (time_s * fall_mps / COLUMN_H_M + phase).rem_euclid(1.0);
        let h = COLUMN_H_M * (1.0 - fallen);
        /* Snow drifts sideways as it falls. */
        let sway = if snow {
            let s = (time_s * 0.7 + phase * 6.28).sin() * 0.5;
            dvec3_scale(t1, s)
        } else {
            DVec3::default()
        };
        let top = dvec3_add(dvec3_add(base_pt, dvec3_scale(up, h)), sway);
        sgl::c4f(col[0], col[1], col[2], alpha);
        push_streak(top, up, right, streak_len, half_w);
    }
    let _ = view;
}

/// Translucent falling curtains under every raining cloud cell across the
/// visible hemisphere, so a storm reads as rain hanging beneath its cloud
/// from far away and from orbit. Mirrors the clouds shell iteration + horizon
/// cull; each cell emits a few long streaks spanning cloud base -> surface.
#[allow(clippy::too_many_arguments)]
fn draw_distant_shafts(
    w: &World,
    p: &PlayerCtrl,
    up_player: DVec3,
    r: f64,
    planet_r: f64,
    shell_r: f64,
    cam_right: DVec3,
    forced: Option<Precip>,
    time_s: f64,
) {
    let ccfg = clouds_cfg::config();
    if ccfg.density <= 0.0 {
        return;
    }
    let wcfg = weather::config();
    let center = dvec3_make(w.body.pos_x, w.body.pos_y, w.body.pos_z);

    /* Same drifting sample frame as the clouds so shafts sit under the puffs
     * they fall from. */
    let drift_ang = time_s * ccfg.drift_mps as f64 / shell_r;
    let dir = rotate_y(up_player, drift_ang);
    let theta_p = dir.y.clamp(-1.0, 1.0).acos();

    let cell_ang = (ccfg.cell_m as f64 / shell_r).max(1e-5);
    let n_rows = (std::f64::consts::PI / cell_ang).ceil() as i32;

    /* Horizon cull (identical construction to clouds.rs). */
    let horizon_player = (planet_r / r.max(planet_r)).clamp(-1.0, 1.0).acos();
    let horizon_puff = (planet_r / shell_r).clamp(-1.0, 1.0).acos();
    let margin_ang = 2.0 * ccfg.puff_w_m as f64 / shell_r;
    let view_ang = horizon_player + horizon_puff + margin_ang;
    let cos_view = view_ang.min(std::f64::consts::PI).cos();

    let range2 = SHAFT_RANGE_M * SHAFT_RANGE_M;
    let near2 = SHAFT_NEAR_M * SHAFT_NEAR_M;

    let right_ref = dvec3_normalize(if dvec3_length(cam_right) < 1e-6 {
        dvec3_make(1.0, 0.0, 0.0)
    } else {
        cam_right
    });

    let (_, _, rain_w, rain_col, _) = style(false);
    let (_, _, snow_w, snow_col, _) = style(true);

    let mut drawn = 0usize;
    for ti in 0..n_rows {
        if drawn >= MAX_SHAFT_STREAKS {
            break;
        }
        let theta_c = (ti as f64 + 0.5) * cell_ang;
        if theta_c >= std::f64::consts::PI {
            continue;
        }
        if (theta_c - theta_p).abs() > view_ang + cell_ang {
            continue;
        }
        let sin_t = theta_c.sin().max(0.05);
        let dphi = cell_ang / sin_t;
        let row_cells = (std::f64::consts::TAU / dphi).ceil() as i32;
        for pj in 0..row_cells {
            if drawn >= MAX_SHAFT_STREAKS {
                break;
            }
            let theta = theta_c;
            let phi = (pj as f64 + 0.5) * dphi;
            let (st, ct) = theta.sin_cos();
            let (sp, cp) = phi.sin_cos();
            let dir_c = dvec3_make(st * cp, ct, st * sp);
            if dvec3_dot(dir_c, dir) < cos_view {
                continue; /* behind the horizon */
            }
            let dir_w = rotate_y(dir_c, -drift_ang);

            /* Is this cell precipitating? Forced storm rains everywhere. */
            let cell = weather::cloud_cell(&w.body, dir_w, time_s);
            let (raining, precip) = match forced {
                Some(k) => (true, k),
                None => (cell.raining, cell.precip),
            };
            if !raining || precip == Precip::None {
                continue;
            }

            /* Column geometry: from the cloud base down to the surface top. */
            let base_alt = land_alt(w, dir_w);
            let base_r = planet_r + base_alt;
            let top_r = shell_r;
            if top_r - base_r < 2.0 {
                continue;
            }
            let base_pt = dvec3_add(center, dvec3_scale(dir_w, base_r));
            let d2 = {
                let d = dvec3_sub(base_pt, p.position);
                d.x * d.x + d.y * d.y + d.z * d.z
            };
            if d2 < near2 || d2 > range2 {
                continue; /* handled by near shower, or too far */
            }

            /* Distance fade so far shafts stay faint (visible, not a wall).
             * Opacity ramps rain_alpha_far -> rain_alpha_near (weather.yaml). */
            let d = d2.sqrt();
            let fade = (1.0 - (d / SHAFT_RANGE_M)).clamp(0.0, 1.0) as f32;
            let alpha = wcfg.rain_alpha_far + (wcfg.rain_alpha_near - wcfg.rain_alpha_far) * fade;

            let up = dir_w;
            let mut right = dvec3_sub(right_ref, dvec3_scale(up, dvec3_dot(right_ref, up)));
            if dvec3_length(right) < 1e-6 {
                right = dvec3_normalize(dvec3_cross(dvec3_make(0.0, 1.0, 0.0), up));
            }
            let right = dvec3_normalize(right);

            let snow_capable = precip == Precip::Snow;
            let col_h = top_r - base_r; /* full column height */
            /* Rain and snow use SEPARATE emitter configs (weather.yaml):
             * density = streaks per cell, fall speed = m/s each streak drops,
             * streak length = mark length. Snow drifts slowly with short
             * flakes; rain falls fast with longer streaks. Count is capped by
             * MAX_SHAFT_STREAKS. */
            let (fall_mps, streak_cfg, density_mult) = if snow_capable {
                (wcfg.snow_fall_mps as f64, wcfg.snow_streak_m as f64, wcfg.snow_density_mult)
            } else {
                (wcfg.rain_fall_mps as f64, wcfg.rain_streak_m as f64, wcfg.rain_density_mult)
            };
            let n_streaks = ((SHAFT_STREAKS as f32) * density_mult).round() as i32;
            for s in 0..n_streaks {
                if drawn >= MAX_SHAFT_STREAKS {
                    break;
                }
                /* Spread streaks across the cell in the tangent plane. */
                let ja = hash3(ti, pj.wrapping_add(s * 97), 0x51) as f64;
                let jb = hash3(ti.wrapping_add(s * 41), pj, 0x52) as f64;
                let cell_w = (ccfg.cell_m as f64) * 0.5;
                let t1 = dvec3_normalize(dvec3_cross(dvec3_make(0.0, 1.0, 0.0), up));
                let t2 = dvec3_cross(up, t1);
                let off = dvec3_add(
                    dvec3_scale(t1, (ja - 0.5) * cell_w),
                    dvec3_scale(t2, (jb - 0.5) * cell_w),
                );
                let phase = hash3(ti.wrapping_add(7 * s), pj, 0x53) as f64;
                /* Fall phase keyed to the CONSTANT cloud altitude, never the
                 * per-cell ground clearance. The cell drifts across the
                 * terrain with the clouds, so its clearance (col_h) changes
                 * every frame; the old `time_s * v / col_h` therefore carried a
                 * time_s-scaled wobble in its rate, and once time_s*col_h' grew
                 * past col_h (~30 s in) the rate went negative and drops ran
                 * BACKWARD - rain visibly falling up, worse the longer the
                 * session ran. Keying the rate to the fixed cloud altitude
                 * makes `fall` strictly linear in time, so every drop descends
                 * at a constant v and loops back to the cloud, forever. */
                let cloud_alt = shell_r - planet_r;
                let fall = (time_s * fall_mps / cloud_alt + phase).rem_euclid(1.0);
                let drop_alt = cloud_alt * (1.0 - fall); /* altitude above surface datum */
                let top_h = drop_alt - base_alt; /* height above the actual ground */
                if top_h <= 0.0 {
                    continue; /* drop has reached the surface this frame */
                }
                let snow = snow_capable && drop_alt > SNOW_LINE_ALT_M;
                let (wcol, wwidth) = if snow {
                    (snow_col, snow_w * 6.0)
                } else {
                    (rain_col, rain_w * 6.0)
                };
                /* Fade in just below the cloud, out at the ground (a metres
                 * band), so the loop seam and the surface cull are both
                 * invisible - no pop, no rubberband. */
                let fade_m = STREAK_FADE_FRAC * cloud_alt;
                let life = ((cloud_alt - drop_alt) / fade_m)
                    .clamp(0.0, 1.0)
                    .min((top_h / fade_m).clamp(0.0, 1.0));
                let seg = streak_cfg.min(col_h);
                let top = dvec3_add(dvec3_add(base_pt, off), dvec3_scale(up, top_h));
                sgl::c4f(wcol[0], wcol[1], wcol[2], alpha * life as f32);
                push_streak(top, up, right, seg.min(top_h).max(0.0), wwidth);
                drawn += 1;
            }
        }
    }
}
