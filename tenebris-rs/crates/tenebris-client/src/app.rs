//! Port of `tenebris-c/src/client/main_web.c` - the Goldberg-sphere
//! entry point. Whole planet = one Goldberg polyhedron; streamed tile
//! terrain gen across frames (Tenebris itself is drained synchronously
//! at init, exactly like the C).
//!
//! The C file's `sokol_impl.c` translation unit (SOKOL_IMPL compiles of
//! sokol_gfx/app/glue/time/debugtext/gl) has no Rust source equivalent:
//! the sokol crate's build.rs compiles the same C headers with the same
//! backend defines, so that half of the port is the dependency itself.
//!
//! Name mapping: statics `G_*` from main_web.c live as fields of [`App`]
//! (the C file relies on translation-unit statics; the port gathers them
//! so frame/event/cleanup share one `RefCell` instead of many). The
//! EM_JS bodies moved verbatim to `web/library_tenebris.js`; the
//! `EMSCRIPTEN_KEEPALIVE` callbacks are the `#[no_mangle]` exports at
//! the bottom of this file.

use std::cell::RefCell;
use std::rc::Rc;
use std::sync::Mutex;

use sokol::app as sapp;
use sokol::debugtext as sdtx;
use sokol::gfx as sg;
use sokol::gl as sgl;
use sokol::time as stm;

use tenebris_core::blocks::Block;
use tenebris_core::config;
use tenebris_core::job_system;
use tenebris_core::math::{
    dvec3_add, dvec3_dot, dvec3_length, dvec3_make, dvec3_normalize, dvec3_scale, dvec3_sub, dvec3_to_vec3,
    vec3_normalize,
    DVec3, Vec3,
};
use tenebris_core::orbit;
use tenebris_core::planet::{self, BodyConfig, BodyId, BODY_COUNT};
use tenebris_core::planet_gen;
use tenebris_core::proto::{BODY_ID_IN_SPACE, TENEBRIS_PROTOCOL_VERSION};
use tenebris_core::world::{World, WORLD_MAX_DEPTH};
use tenebris_core::world_water;

use crate::animals;
use crate::clouds;
use crate::weather_fx;
use crate::chat;
use crate::crafting_screen;
use crate::crops;
use crate::drops;
use crate::fishing;
use crate::viewmodel;
use crate::gfx_math::{mat4_perspective, Mat4};
use crate::hotbar_ui;
use crate::input;
use crate::interact::{self, InteractState};
use crate::chest_screen;
use crate::screens;
use crate::station_screen;
use crate::bonfire_fx;
use crate::bonfire_screen;
use crate::egui_layer;
use crate::furnace_screen;
use crate::power_ui;
use crate::ui_icons;
use crate::inventory::{self, INV_HOTBAR_SLOTS};
use crate::inventory_screen;
use crate::tech_tree;
use crate::menu::{self, GameState};
use crate::mobile_ui;
use crate::net_client::{self, NetClientState, NetDesyncKind};
use crate::persistence::{self, PersistenceSave, COLUMN_BYTES};
use crate::pixel_ui;
use crate::player_ctrl::{self, PlayerCtrl};
use crate::rocket_screen;
use crate::profile;
use crate::profiler;
use crate::remote_players;
use crate::renderer::{self, RenderEnv};
use crate::settings;
use crate::teleport_menu;
use crate::torch;

/* --------------------------------------------------------------------- */
/* On-screen error overlay - captures sokol_gfx / sokol_app log lines
 * (panic/error/warning) into a small ring buffer and displays the most
 * recent ones at the top of the screen. Hooked up via the
 * sg_setup().logger.func callback below. Mobile debugging: there's no
 * JS console on iOS Safari without remote-debug tooling, so any error
 * has to be visible in-app or we fly blind. */

const ERR_LOG_LINES: usize = 12;
const ERR_LOG_LINE_LEN: usize = 128;

struct ErrLog {
    lines: [String; ERR_LOG_LINES],
    /// total messages received (>= ring size)
    total: u32,
}

/* The logger callback can fire before/inside init and (in principle)
 * off-thread on some native backends, so this one global stays a
 * Mutex rather than a thread_local. */
static G_ERR: Mutex<Option<ErrLog>> = Mutex::new(None);

extern "C" fn on_screen_log(
    tag: *const core::ffi::c_char,
    level: u32,
    item: u32,
    msg: *const core::ffi::c_char,
    line: u32,
    file: *const core::ffi::c_char,
    user: *mut core::ffi::c_void,
) {
    /* level: 0 = panic, 1 = error, 2 = warning, 3 = info. We only grab
     * the alarming ones - info-level logs would flood. */
    if level <= 2 && !msg.is_null() {
        let tag_s = if tag.is_null() {
            "?".to_string()
        } else {
            unsafe { core::ffi::CStr::from_ptr(tag) }.to_string_lossy().into_owned()
        };
        let msg_s = unsafe { core::ffi::CStr::from_ptr(msg) }.to_string_lossy().into_owned();
        let lvl = match level {
            0 => "PANIC",
            1 => "ERROR",
            _ => "WARN",
        };
        let mut formatted = format!(
            "{}[{} id={}]: {:.80}",
            lvl,
            tag_s,
            item,
            // %.80s - truncate the message, not the whole line.
            &msg_s.chars().take(80).collect::<String>()
        );
        formatted.truncate(ERR_LOG_LINE_LEN - 1);
        if let Ok(mut g) = G_ERR.lock() {
            let e = g.get_or_insert_with(|| ErrLog {
                lines: Default::default(),
                total: 0,
            });
            let slot = (e.total as usize) % ERR_LOG_LINES;
            e.lines[slot] = formatted;
            e.total += 1;
        }
    }
    /* Forward to the default sokol logger so the JS console / native
     * stderr still gets every message for post-mortem grepping. */
    sokol::log::slog_func(tag, level, item, msg, line, file, user);
}

fn draw_error_overlay() {
    let Ok(g) = G_ERR.lock() else { return };
    let Some(e) = g.as_ref() else { return };
    if e.total == 0 {
        return;
    }
    sdtx::color3b(255, 80, 80);
    sdtx::puts(&format!("\n=== sokol log: {} msgs ===\n", e.total));
    let show = (e.total as usize).min(ERR_LOG_LINES);
    let start = e.total as usize - show;
    for i in 0..show {
        let slot = (start + i) % ERR_LOG_LINES;
        sdtx::puts(&e.lines[slot]);
        sdtx::puts("\n");
    }
    sdtx::color3b(255, 255, 255);
}

/* --------------------------------------------------------------------- */

/// Streaming budget: tiles generated per frame. Tenebris is subs=6 =
/// 40962 tiles total - at 512/frame it's ~80 frames (~1.3 s) to fully
/// populate. Each tile gen is a handful of noise evals, well inside the
/// 16 ms frame budget. Moon subdivisions are pulled from body config.
const GEN_TILES_PER_FRAME: i32 = 512;

/// Bitmap size for bodies whose SP saves have been replayed. Matches
/// `SP_SAVES_APPLIED_MAX` in the C.
const SP_SAVES_APPLIED_MAX: usize = 256;

/// Port of the C file's `static struct { ... } G` plus every
/// function-local `static` in main_web.c (gathered here because Rust
/// has no function statics with the same single-threaded semantics).
struct App {
    body: BodyConfig,
    world: Rc<RefCell<World>>,
    moons: Vec<Rc<RefCell<World>>>, // C: world_t* moons[32]
    player: Rc<RefCell<PlayerCtrl>>,
    interact: InteractState,
    last_time: u64,
    tick: u32,
    smoothed_fps: f32,

    /* F2 master toggle for ALL debug UI (G_debug_ui_visible). */
    debug_ui_visible: bool,
    /* F1 players panel (G_players_panel_visible). */
    players_panel_visible: bool,

    /* SP resume / save latches. */
    sp_resume_applied: bool,
    inv_primed_for_state: i32,
    sp_saves_applied: [bool; SP_SAVES_APPLIED_MAX],
    mp_spawn_applied: bool,
    sp_save_accum: f64,

    /* Which session's edits the in-memory spawn-planet terrain holds:
     * "" = pristine boot procgen, "sp:<world>" = that SP world's
     * edits, "mp" = an MP session's server diffs. Together with the
     * World's seed this decides whether entering a session can reuse
     * the loaded terrain or must regenerate it (per-world seeds +
     * no cross-world edit leaks). */
    terrain_tag: String,

    /* Staged loader (boot worldgen / SP-MP terrain regen). While Some,
     * frame() presents a loading screen (progress bar + status) and
     * runs one budgeted slice of work per frame instead of the game -
     * the fix for the "white screen while booting / loading a level"
     * feedback hole. */
    loader: Option<Loader>,

    /* Position-relay diagnostics (G_last_sent_*). */
    last_sent_pos: DVec3,
    last_sent_body: u32,
    last_sent_yaw: f32,
    last_sent_pitch: f32,
    last_sent_valid: bool,
    pos_log_accum: f64,

    /* frame()-local statics. */
    was_mouse_locked: bool,
    state_send_ctr: u32,
    water_accum_s: f32,
    inv_last_type: [u16; 9],
    inv_last_count: [i16; 9],
    inv_last_sel: i32,
    inv_init: bool,
    /* MP-parity sync caches: last bag upload (change detection, hunger
     * quantised to whole points) + the block-entity sync countdown. */
    bag_last_items: [u16; tenebris_core::proto::MSG_BAG_SLOTS],
    bag_last_counts: [u16; tenebris_core::proto::MSG_BAG_SLOTS],
    bag_last_hunger_i: i32,
    bag_sync_init: bool,
    bent_sync_cd: f32,

    /* DOM-overlay visibility caches (emscripten frame block). Kept
     * unconditionally so App has one shape on every target. */
    #[allow(dead_code)]
    last_pause_btn: i32,
    #[allow(dead_code)]
    last_inventory_btn: i32,
    #[allow(dead_code)]
    last_mobile: i32,
    #[allow(dead_code)]
    last_fullscreen_btn: i32,
}

thread_local! {
    static APP: RefCell<Option<App>> = const { RefCell::new(None) };
}

fn with_app<R>(f: impl FnOnce(&mut App) -> R) -> Option<R> {
    APP.with(|cell| cell.borrow_mut().as_mut().map(f))
}

/* --------------------------------------------------------------------- */
/* Accessors for modules that need the live player pose but don't want
 * to pull the app module. C exports tenebris_get_local_player_pos /
 * tenebris_get_local_player_body_id as global symbols net_client.c
 * links against; the port registers a provider fn instead. */

fn local_player_provider() -> (DVec3, u32) {
    APP.with(|cell| {
        let Ok(b) = cell.try_borrow() else {
            return (dvec3_make(0.0, 0.0, 0.0), 0);
        };
        let Some(app) = b.as_ref() else {
            return (dvec3_make(0.0, 0.0, 0.0), 0);
        };
        let Ok(p) = app.player.try_borrow() else {
            return (dvec3_make(0.0, 0.0, 0.0), 0);
        };
        /* G.player.body is the live gravitational anchor (None when
         * anchorless in deep space). Fall back to BODY_TENEBRIS (0) so
         * the audit's distance calculations have something to anchor
         * to instead of mis-attributing everything to body 0 = error. */
        let body_id = p.body.map(|b| b.id as u32).unwrap_or(0);
        (p.position, body_id)
    })
}

/* --------------------------------------------------------------------- */
/* Pure helpers (unit-tested below). */

/// Port of the smoothing in `update_overlay`:
/// `G.smoothed_fps = G.smoothed_fps * 0.9 + inst_fps * 0.1`.
fn smoothed_fps_next(prev: f32, dt: f32) -> f32 {
    let inst = if dt > 0.0 { 1.0 / dt } else { 0.0 };
    prev * 0.9 + inst * 0.1
}

/// Port of the lag-spike clamp at the top of `frame()`. Returns the
/// clamped dt and whether the spike path (mouse-delta discard) fired.
const LAG_SPIKE_S: f32 = 0.1;
fn lag_clamp(dt: f32) -> (f32, bool) {
    if dt > LAG_SPIKE_S {
        (LAG_SPIKE_S, true)
    } else {
        (dt, false)
    }
}

/// Shared accumulator shape used by `maybe_autosave_sp` /
/// `periodic_pos_log` / the water tick: add dt, fire + reset to zero
/// when the period elapses.
fn accum_fire(accum: &mut f64, dt: f64, period: f64) -> bool {
    *accum += dt;
    if *accum < period {
        return false;
    }
    *accum = 0.0;
    true
}

/// Mirrors the room-code normalisation the JS query-param reader does
/// (`s.toUpperCase().substring(0, 8)`). Idempotent on the JS output;
/// applied again on the Rust side so the contract is pinned by a test.
#[allow(dead_code)]
fn normalize_room_code(s: &str) -> String {
    s.to_uppercase().chars().take(8).collect()
}

/// Which mode-priming action `maybe_prime_mode_for_state` takes for a
/// menu-state transition. None = no transition (same state as last
/// prime) or a non-gameplay state.
#[derive(Debug, PartialEq, Eq, Clone, Copy)]
enum PrimeAction {
    EnterMp,
    EnterSp,
}
fn mode_prime_action(state: i32, primed_for: i32) -> Option<PrimeAction> {
    if state == primed_for {
        return None;
    }
    if state == GameState::InGameMp as i32 {
        Some(PrimeAction::EnterMp)
    } else if state == GameState::InGameSp as i32 {
        Some(PrimeAction::EnterSp)
    } else {
        None
    }
}

/// MP spawn ground-snap window (see `maybe_apply_mp_spawn`). Given the
/// saved radial distance and the analytic surface radius, returns the
/// snapped radius when the pose is meaningfully above the surface
/// (mid-jump / jetpack saves) but not so far it was a space flight.
const SNAP_MIN_ALT_M: f64 = 3.0;
const SNAP_MAX_ALT_M: f64 = 100.0;
fn spawn_snap_radius(r: f64, surface_r: f64) -> Option<f64> {
    let ground_r = surface_r + 1.5;
    let alt_above_surf = r - surface_r;
    if alt_above_surf > SNAP_MIN_ALT_M && alt_above_surf < SNAP_MAX_ALT_M {
        Some(ground_r)
    } else {
        None
    }
}

/// Port of `player_lat_lon_deg()` (F1 players panel). Returns
/// (lat_deg, lon_deg, alt_m).
fn player_lat_lon_deg(world_pos: DVec3, body: &BodyConfig) -> (f64, f64, f64) {
    let dx = world_pos.x - body.pos_x;
    let dy = world_pos.y - body.pos_y;
    let dz = world_pos.z - body.pos_z;
    let len = (dx * dx + dy * dy + dz * dz).sqrt();
    if len < 1e-9 {
        return (0.0, 0.0, -body.radius_m);
    }
    let k = 180.0 / std::f64::consts::PI;
    (
        (dy / len).asin() * k,
        dz.atan2(dx) * k,
        len - body.radius_m,
    )
}

/* --------------------------------------------------------------------- */
/* init                                                                    */
/* --------------------------------------------------------------------- */

thread_local! {
    /// Dev-only: frames to wait before dropping the dev showcase blocks.
    /// Placement must happen during steady gameplay, not at init: editing
    /// the world before the first frame double-updates a chunk's GPU
    /// buffer in one frame (sokol's one-update-per-buffer-per-frame rule),
    /// which aborts. -1 = disabled. Mode: 1 = launch pad, 2 = ore/tech
    /// showcase ring.
    static DEV_PLACE_COUNTDOWN: std::cell::Cell<i32> = const { std::cell::Cell::new(-1) };
    static DEV_PLACE_MODE: std::cell::Cell<u8> = const { std::cell::Cell::new(0) };
    /// Space-exploration mode: frames to wait after entering a fresh space
    /// world before building the launch complex (lets terrain gen finish +
    /// the player ground so the tile under them is valid). -1 = idle.
    static SPACE_BUILD_COUNTDOWN: std::cell::Cell<i32> = const { std::cell::Cell::new(-1) };
    /// Dev: pinned camera world-position for the underwater fish shot
    /// (TENEBRIS_DEV_FISH=under). Held each frame so gravity doesn't
    /// drop the camera off its perch above the school.
    static DEV_FISH_CAM: std::cell::Cell<Option<DVec3>> = const { std::cell::Cell::new(None) };
    /// Dev: TENEBRIS_DEV_CRACK holds the survival mine button on the block
    /// under the reticle every frame (camera pitched down) so a screenshot
    /// catches the block-break crack decal mid-mine. -1 unknown, 0 off, 1 on.
    static DEV_CRACK: std::cell::Cell<i8> = const { std::cell::Cell::new(-1) };
    /// Dev: TENEBRIS_DEV_DROPS spawns a row of floating item drops ahead of
    /// the player once worldgen settles. -1 unknown, 1 armed, 0 done/off.
    static DEV_DROPS: std::cell::Cell<i8> = const { std::cell::Cell::new(-1) };
    /// Dev: freeze the world clock at a fixed time of day (TENEBRIS_DEV_TIME)
    /// so a screenshot captures a chosen sun angle. -1 unknown, 0 run, 1 freeze.
    static DEV_TIME_FROZEN: std::cell::Cell<i8> = const { std::cell::Cell::new(-1) };
}

/// Dev-only: once in-game and a few frames settled, drop the requested dev
/// blocks at the tile under the reticle and frame them. Self-disables
/// after firing.
/// Dev-screenshot aid: point the camera at a world-space target (yaw +
/// pitch from the player's carried tangent basis).
fn dev_aim_at(app: &App, target: DVec3) {
    let mut p = app.player.borrow_mut();
    let dot = |a: DVec3, b: DVec3| a.x * b.x + a.y * b.y + a.z * b.z;
    let eye = dvec3_add(p.position, dvec3_scale(p.basis.up, 1.6));
    let look = dvec3_normalize(dvec3_sub(target, eye));
    let up = p.basis.up;
    let to_t = dvec3_sub(look, dvec3_scale(up, dot(look, up)));
    p.yaw = (dot(to_t, p.basis.right)).atan2(dot(to_t, p.basis.fwd)) as f32;
    p.pitch = dot(look, up).clamp(-1.0, 1.0).asin() as f32;
}

fn dev_maybe_place(app: &mut App) {
    let n = DEV_PLACE_COUNTDOWN.with(|c| c.get());
    if n < 0 || menu::state() != GameState::InGameSp {
        return;
    }
    /* Hold the camera looking almost straight down while we wait, so the
     * interact raycast settles onto the ground tile right under the
     * reticle - that's the tile we then build on, guaranteeing the blocks
     * land in frame (the player's position-tile drifts off-camera). */
    app.player.borrow_mut().pitch = -1.30;
    if n > 0 {
        DEV_PLACE_COUNTDOWN.with(|c| c.set(n - 1));
        return;
    }
    DEV_PLACE_COUNTDOWN.with(|c| c.set(-1));

    /* The tile the player is standing on, cached by the physics step each
     * frame (find_tile seeded with last_tile, which converges; a cold
     * find_tile from hint 0 stalls on the far side of the planet). This
     * is directly under the downward-looking camera, so the blocks land
     * in frame. */
    let center = app.player.borrow().last_tile;
    let dev_mode = DEV_PLACE_MODE.with(|c| c.get());
    /* Most showcases build on the tile under the player, so they need a valid
     * last_tile. The dive showcase (21) instead scans the whole planet for the
     * deepest ocean and repositions the camera itself, so it must run even when
     * the player spawns in orbit (last_tile == -1). */
    if center < 0 && dev_mode != 21 {
        return;
    }

    match dev_mode {
        18 => {
            /* Bonfire showcase (TENEBRIS_DEV_BONFIRE): place a lit bonfire
             * a few metres ahead, pre-loaded with fuel + raw meat cooking,
             * so a night still shows its 2x-torch glow and the cook panel
             * has content. */
            let (ppos, fwd, last_tile) = {
                let p = app.player.borrow();
                (p.position, p.basis.fwd, p.last_tile)
            };
            let mut aim: Option<DVec3> = None;
            {
            let mut w = app.world.borrow_mut();
            let bc = dvec3_make(w.body.pos_x, w.body.pos_y, w.body.pos_z);
            let local = dvec3_sub(ppos, bc);
            let point = dvec3_add(local, dvec3_scale(fwd, 5.0));
            let dir = dvec3_normalize(point);
            let tile = w.grid.find_tile(dir, last_tile);
            if let Some(fpos) =
                tenebris_core::fauna::floor_pos(&w, dir, dvec3_length(local), tile)
            {
                /* radius_to_depth of the surface top already lands on the
                 * first AIR cell above the ground, so no +1 (that floated
                 * the fire one voxel up). */
                let depth = w.radius_to_depth(dvec3_length(dvec3_sub(fpos, bc)));
                w.set(tile, depth, Block::Bonfire);
                let e = w.block_entities.entry(tile, depth);
                let b = e.bonfire_mut();
                b.fuel = tenebris_core::block_entity::ChestSlot {
                    item: tenebris_core::items::CHARCOAL,
                    count: 4,
                };
                b.input = tenebris_core::block_entity::ChestSlot {
                    item: tenebris_core::items::RAW_MEAT,
                    count: 3,
                };
                b.burn_s = tenebris_core::config::bonfire().charcoal_burn_s;
                let flame = tenebris_core::math::dvec3_to_vec3(
                    dvec3_add(dvec3_scale(dir, w.depth_to_radius_m(depth)), dvec3_scale(dir, 0.5)),
                );
                w.dirty_in_range(flame, torch::LIGHT_RANGE_M * 2.5);
                println!("[dev] placed lit bonfire at tile {tile} depth {depth}");
                /* Aim the camera at the fire so the still frames it + its
                 * glow pool. */
                aim = Some(dvec3_add(bc, dvec3_scale(dir, w.depth_to_radius_m(depth) + 0.5)));
            }
            }
            if let Some(a) = aim {
                dev_aim_at(app, a);
            } else {
                app.player.borrow_mut().pitch = -0.20;
            }
        }
        13 => {
            /* Sky view: pitch the camera up so the sun (and any moons /
             * planets that are above the horizon) frame against the sky -
             * a still of the on-rails orbit sim from the surface. */
            let mut p = app.player.borrow_mut();
            p.pitch = 0.95;
        }
        16 => {
            /* Torch-light showcase (TENEBRIS_DEV_TORCH[=N]): plant N
             * torches (default 3) scattered ahead like a small village,
             * so a night still shows the warm baked pools and - from
             * altitude - the emissive glow points. Same call pattern as
             * the SP reload path: torch::place + dirty_in_range so
             * nearby chunks re-bake their per-vertex torch light. */
            let n: usize = std::env::var("TENEBRIS_DEV_TORCH")
                .ok()
                .and_then(|v| v.parse().ok())
                .filter(|v| *v > 1)
                .unwrap_or(3);
            let (ppos, fwd, right, last_tile) = {
                let p = app.player.borrow();
                (p.position, p.basis.fwd, p.basis.right, p.last_tile)
            };
            let w = app.world.borrow();
            let bc = dvec3_make(w.body.pos_x, w.body.pos_y, w.body.pos_z);
            let local = dvec3_sub(ppos, bc);
            let mut placed = 0;
            for k in 0..n {
                /* Hash-scattered cluster: 4..~40 m ahead, +-25 m wide. */
                let ha = tenebris_core::rng::hash2(k as i32, 3) as f64;
                let hb = tenebris_core::rng::hash2(k as i32, 7) as f64;
                let ahead = 4.0 + ha * (4.0 + n as f64 * 1.5).min(60.0);
                let side = (hb - 0.5) * (6.0 + n as f64).min(50.0);
                let point = dvec3_add(
                    local,
                    dvec3_add(dvec3_scale(fwd, ahead), dvec3_scale(right, side)),
                );
                let dir = dvec3_normalize(point);
                let tile = w.grid.find_tile(dir, last_tile);
                let Some(pos) = tenebris_core::fauna::floor_pos(&w, dir, dvec3_length(local), tile)
                else {
                    continue;
                };
                let base = tenebris_core::math::dvec3_to_vec3(dvec3_sub(pos, bc));
                let up_f = tenebris_core::math::dvec3_to_vec3(dir);
                if torch::place(base, up_f, tile) {
                    placed += 1;
                }
            }
            drop(w);
            if placed > 0 {
                let mut w = app.world.borrow_mut();
                let plocal = tenebris_core::math::dvec3_to_vec3(local);
                w.dirty_in_range(plocal, torch::LIGHT_RANGE_M + 70.0);
                /* Persist like a real placement so a later run of the
                 * same world reloads the village (exercises the glow's
                 * save-restore path too). */
                interact::sp_save_torches_after_change(&w);
            }
            println!("[dev] placed {} torches ahead", placed);
            app.player.borrow_mut().pitch = -0.25;
        }
        17 => {
            /* Fish showcase (TENEBRIS_DEV_FISH): the five water species
             * lined up broadside ahead of the player, frozen, so a shot
             * frames the minnow / ray / eel / reef fish / turtle. =under
             * drops them just below the nearest ocean surface. */
            let under = std::env::var("TENEBRIS_DEV_FISH")
                .map(|v| v == "under")
                .unwrap_or(false);
            let anchor = animals::dev_spawn_fish(&app.world.borrow(), &app.player.borrow(), under);
            println!("[dev] spawned {} fish (underwater={under})", animals::count());
            if let Some(adir) = anchor {
                /* Underwater shot: dip the camera just below the sea
                 * surface (shallow enough to stay clear of the seabed)
                 * and pull it back horizontally from the school so we
                 * look at the fish broadside - their bug eyes face the
                 * lens. */
                let (center, sea_r) = {
                    let w = app.world.borrow();
                    let c = dvec3_make(w.body.pos_x, w.body.pos_y, w.body.pos_z);
                    let sr = w.depth_to_radius_m(tenebris_core::world::WORLD_SEA_LEVEL_DEPTH)
                        + tenebris_core::planet_gen::sea_raise_m(&w.body) as f64;
                    (c, sr)
                };
                if let Some(mid) = animals::herd_center() {
                    /* Horizontal forward: the player's facing flattened
                     * onto the local tangent plane (radial component of
                     * adir removed), so the pull-back slides sideways,
                     * not up into the air or down into the floor. */
                    let fwd = app.player.borrow().basis.fwd;
                    let radial = dvec3_dot(fwd, adir);
                    let mut hf = dvec3_sub(fwd, dvec3_scale(adir, radial));
                    if dvec3_length(hf) < 1e-4 {
                        hf = app.player.borrow().basis.right;
                    }
                    let hf = dvec3_normalize(hf);
                    let back = dvec3_sub(mid, dvec3_scale(hf, 4.5));
                    let cam = dvec3_add(center, dvec3_scale(dvec3_normalize(dvec3_sub(back, center)), sea_r - 0.55));
                    {
                        let mut p = app.player.borrow_mut();
                        p.position = cam;
                        p.velocity = tenebris_core::math::DVec3::default();
                    }
                    DEV_FISH_CAM.with(|c| c.set(Some(cam)));
                    dev_aim_at(app, mid);
                }
            } else if let Some(mid) = animals::herd_center() {
                dev_aim_at(app, mid);
            }
        }
        14 => {
            /* Animal showcase: drop a herd near the player, then aim the
             * camera at its centre so the critters are framed. */
            animals::dev_spawn(&app.world.borrow(), &app.player.borrow());
            crops::dev_spawn(&app.world.borrow(), &app.player.borrow(), 4.0);
            println!("[dev] spawned {} animals, {} crops", animals::count(), crops::count());
            if let Some(mid) = animals::herd_center() {
                dev_aim_at(app, mid);
            }
            /* Survival + a partly-drained hunger bar + some meat, so the
             * hunger HUD + eat loop are visible in the shot. */
            {
                let mut p = app.player.borrow_mut();
                p.survival_mode = true;
                p.hunger = player_ctrl::MAX_HUNGER * 0.48;
                p.bag.add(tenebris_core::items::COOKED_MEAT, 3);
                p.bag.add(tenebris_core::items::RAW_MEAT, 2);
                /* Some seeds + berries so the farming loop + icons show. */
                p.bag.add(tenebris_core::items::SEEDS, 6);
                p.bag.add(tenebris_core::items::BERRIES, 4);
                /* A pickaxe so the held-tool viewmodel is in the shot. */
                p.bag.add(tenebris_core::items::WOOD_PICKAXE, 1);
            }
        }
        19 => {
            /* Farming showcase (TENEBRIS_DEV_FARM): a row of all crop kinds
             * (berry, wheat, carrot, then the four orchard fruits) planted
             * flat ahead and framed at a shallow down-angle so each plant's
             * silhouette reads. Stock a bucket + fruit seeds so the hotbar
             * icons show too. */
            /* Till the patch under + around the player into farmland so the
             * tilled-soil texture is in frame beneath the crop row. */
            dev_set_surface(&app.world, center, Block::Farmland);
            dev_for_each_neighbor(&app.world, center, |w, _, n| {
                dev_set_surface_w(w, n, Block::Farmland);
                for m in w.grid.tile(n).map(|t| t.neighbors).unwrap_or([-1; 6]) {
                    dev_set_surface_w(w, m, Block::Farmland);
                }
            });
            let ahead = 2.2;
            crops::dev_spawn(&app.world.borrow(), &app.player.borrow(), ahead);
            let target = {
                let p = app.player.borrow();
                /* Aim at the crops' mid-height (~0.4 m up the plant) so the
                 * shot looks along the row nearly level instead of steeply
                 * down into the soil. */
                dvec3_add(
                    dvec3_add(p.position, dvec3_scale(p.basis.fwd, ahead)),
                    dvec3_scale(p.basis.up, 0.9),
                )
            };
            dev_aim_at(app, target);
            {
                let mut p = app.player.borrow_mut();
                p.survival_mode = true;
                p.bag.add(tenebris_core::items::BUCKET, 1);
                p.bag.add(tenebris_core::items::WATER_BUCKET, 1);
                p.bag.add(tenebris_core::items::APPLE, 2);
                p.bag.add(tenebris_core::items::WATERMELON, 1);
                p.bag.add(tenebris_core::items::APPLE_SEEDS, 3);
                p.bag.add(tenebris_core::items::KIWI_SEEDS, 3);
            }
            println!("[dev] farm showcase: {} crops", crops::count());
        }
        20 => {
            /* Growth-phase row (TENEBRIS_DEV_GROW=watermelon|orange|apple|
             * kiwi): one fruit planted as a row through its five growth
             * stages (sprout -> ripe) on a tilled strip, framed head-on so
             * the whole arc is visible in one shot. */
            use tenebris_core::farming::CropKind;
            let kind = match std::env::var("TENEBRIS_DEV_GROW").unwrap_or_default().as_str() {
                "orange" => CropKind::Orange,
                "apple" => CropKind::Apple,
                "kiwi" => CropKind::Kiwi,
                _ => CropKind::Watermelon,
            };
            let (row_tiles, target) =
                crops::dev_growth_row(&app.world.borrow(), &app.player.borrow(), kind, 1.7);
            /* Till exactly the tiles the row sits on (plus the player's own
             * tile + ring) into farmland, so each stage stands on tilled
             * soil regardless of the terrain shape. */
            dev_set_surface(&app.world, center, Block::Farmland);
            dev_for_each_neighbor(&app.world, center, |w, _, n| {
                dev_set_surface_w(w, n, Block::Farmland);
            });
            for t in row_tiles {
                dev_set_surface(&app.world, t, Block::Farmland);
            }
            /* Pull the camera back + up and pin it (reusing the fish-cam
             * perch so gravity can't drop it) for a 3/4 view that frames the
             * whole row - the plants are small, so a fixed vantage beats the
             * player's ground-level eye. */
            let (cam, aim) = {
                let p = app.player.borrow();
                let cam = dvec3_add(
                    dvec3_add(p.position, dvec3_scale(p.basis.fwd, -2.4)),
                    dvec3_scale(p.basis.up, 1.1),
                );
                /* Aim at the plants' mid-height so the ripe fruit sits centred
                 * and readable, not tipped off the top of the frame. */
                let aim = dvec3_add(target, dvec3_scale(p.basis.up, 0.35));
                (cam, aim)
            };
            app.player.borrow_mut().position = cam;
            dev_aim_at(app, aim);
            DEV_FISH_CAM.with(|c| c.set(Some(cam)));
            {
                let mut p = app.player.borrow_mut();
                p.survival_mode = true;
            }
            println!(
                "[dev] growth row: {:?} x5 phases, cam=({:.1},{:.1},{:.1})",
                kind, cam.x, cam.y, cam.z
            );
        }
        21 => {
            /* Dive showcase (TENEBRIS_DEV_DIVE): scan the WHOLE planet for two
             * ocean spots regardless of where the player spawned - the deepest
             * tile (full-submersion murk + fish) and a shallow SHOAL tile whose
             * seabed sits ~1 block below sea level (partial-submersion framing).
             * TENEBRIS_DEV_DIVE=<metres>: >= 2 floats the eye that deep for the
             * full underwater look; a small value (< 2, e.g. 0.5) instead WADES
             * the player onto the shoal - feet on the block one lower than the
             * sea-level block, so the eye (feet + EYE_HEIGHT) rests ~0.6 m above
             * the surface, inside the 0.8 m partial band with the near plane
             * dipping into the water. (A non-numeric value keeps the 4 m default.) */
            let dive_depth = std::env::var("TENEBRIS_DEV_DIVE")
                .ok()
                .and_then(|v| v.trim().parse::<f64>().ok())
                .filter(|d| *d > 0.0)
                .unwrap_or(4.0);
            let wade = dive_depth < 2.0;
            let dive = {
                let w = app.world.borrow();
                let center = dvec3_make(w.body.pos_x, w.body.pos_y, w.body.pos_z);
                let sea_r = w.depth_to_radius_m(tenebris_core::world::WORLD_SEA_LEVEL_DEPTH)
                    + tenebris_core::planet_gen::sea_raise_m(&w.body) as f64;
                let mut best = -1i32;
                let mut best_s = 0.0f32; /* metric for the chosen tile */
                for i in 0..w.tile_count {
                    if let Some(t) = w.grid.tile(i) {
                        let s = tenebris_core::planet_gen::profile(&w.body, t.center).surface_m;
                        if wade {
                            /* Seabed ~2 blocks below sea level: surface_m nearest
                             * -2 m, underwater (s < 0). Feet there put the eye
                             * (feet + EYE_HEIGHT 1.6 m) ~0.4 m BELOW the surface -
                             * the near plane mostly in water, waterline at eye. */
                            if s < -0.2 {
                                let score = -(s + 2.0).abs();
                                if best < 0 || score > best_s {
                                    best_s = score;
                                    best = i;
                                }
                            }
                        } else if s < best_s {
                            /* Deepest ocean tile (most negative surface). */
                            best_s = s;
                            best = i;
                        }
                    }
                }
                if best >= 0 {
                    let dir = dvec3_normalize(w.grid.tile(best).unwrap().center);
                    let surf_m =
                        tenebris_core::planet_gen::profile(&w.body, w.grid.tile(best).unwrap().center)
                            .surface_m as f64;
                    Some((best, dir, sea_r, center, surf_m))
                } else {
                    None
                }
            };
            if let Some((tile, dir, sea_r, center, surf_m)) = dive {
                /* position is the FEET; the rendered eye sits EYE_HEIGHT above it
                 * along `up`. Wading: feet on the shoal seabed (sea_r + surf_m,
                 * ~2 m below sea level) -> eye ~0.4 m BELOW the surface, so the
                 * waterline crosses the near plane. Diving: feet dive_depth below
                 * the surface -> eye deep enough to stay fully underwater. */
                let feet_r = if wade { sea_r + surf_m } else { sea_r - dive_depth };
                let cam = dvec3_add(center, dvec3_scale(dir, feet_r));
                {
                    let mut p = app.player.borrow_mut();
                    p.position = cam;
                    p.velocity = tenebris_core::math::DVec3::default();
                    p.last_tile = tile;
                }
                animals::dev_spawn_fish(&app.world.borrow(), &app.player.borrow(), true);
                /* Aim direction. A tangent target (perpendicular to the planet
                 * normal `dir`) built at EYE height makes the look vector level,
                 * so `dev_aim_at` resolves to pitch ~0 and the waterline sits
                 * horizontal across the frame. */
                let reference = if dir.y.abs() < 0.9 {
                    dvec3_make(0.0, 1.0, 0.0)
                } else {
                    dvec3_make(1.0, 0.0, 0.0)
                };
                let tangent = dvec3_normalize(tenebris_core::math::dvec3_cross(reference, dir));
                let eye = dvec3_add(cam, dvec3_scale(dir, crate::player_ctrl::EYE_HEIGHT as f64));
                let level_fwd = dvec3_add(eye, dvec3_scale(tangent, 6.0));
                /* Wading: look straight forward along the surface so the
                 * above-water / below-waterline split frames level - do NOT chase
                 * the fish school (it sits underwater and tilts the view down).
                 * Diving fully under: prefer the fish school for the murk shot. */
                let target = if wade {
                    level_fwd
                } else {
                    animals::herd_center().unwrap_or(level_fwd)
                };
                dev_aim_at(app, target);
                DEV_FISH_CAM.with(|c| c.set(Some(cam)));
                println!(
                    "[dev] dive: {} tile {} (seabed {:.1} m below sea, feet_r={:.1})",
                    if wade { "wade" } else { "deep" },
                    tile,
                    -surf_m,
                    feet_r
                );
            } else {
                println!("[dev] dive: no ocean found on this planet");
            }
        }
        22 => {
            /* Grass showcase (TENEBRIS_DEV_GRASS): scan for a flat Fields
             * tile with a grass top and drop the camera just above it,
             * looking across the sward at a shallow down-angle so the wind
             * sway of the scatter grass is framed (reliable, like the dive
             * cam - the land spawn is often desert/rock). */
            use tenebris_core::blocks::{is_solid, Block};
            let w0 = app.world.borrow();
            let surf_of = |i: i32| -> i32 {
                let mut s = -1i32;
                for d in (0..tenebris_core::world::WORLD_MAX_DEPTH).rev() {
                    if is_solid(w0.get(i, d)) {
                        s = d;
                        break;
                    }
                }
                s
            };
            let spot = {
                let center = dvec3_make(w0.body.pos_x, w0.body.pos_y, w0.body.pos_z);
                let mut found: Option<(i32, DVec3, f64, DVec3)> = None;
                for i in 0..w0.tile_count {
                    let Some(t) = w0.grid.tile(i) else { continue };
                    if tenebris_core::planet_gen::biome(&w0.body, t.center)
                        != tenebris_core::planet_gen::Biome::Fields
                    {
                        continue;
                    }
                    let surf = surf_of(i);
                    if surf < 0 {
                        continue;
                    }
                    let top = w0.get(i, surf);
                    if !matches!(top, Block::Grass | Block::DryGrass | Block::JungleGrass) {
                        continue;
                    }
                    /* Flat neighbourhood: every neighbour's surface within 1
                     * voxel, so the camera isn't walled in by raised tiles. */
                    let flat = t.neighbors.iter().all(|&n| {
                        n < 0 || (surf_of(n) - surf).abs() <= 1
                    });
                    if flat {
                        let dir = dvec3_normalize(t.center);
                        let r_surf = w0.depth_to_radius_m(surf + 1);
                        /* Only a SUNLIT tile - many flat grass tiles sit on
                         * the planet's night side and would shoot black. */
                        let pos = dvec3_add(center, dvec3_scale(dir, r_surf));
                        if renderer::entity_sun_brightness(pos) > 0.6 {
                            found = Some((i, dir, r_surf, center));
                            break;
                        }
                    }
                }
                found
            };
            drop(w0);
            if let Some((tile, dir, r_surf, center)) = spot {
                /* Feet just above the sward (renderer adds its own 1.6 m eye
                 * height). Pin the position, then set pitch DIRECTLY to look
                 * down at the near grass - the basis recomputes from the
                 * pinned position each frame, so a fixed pitch is reliable
                 * (aiming via a world target used the stale spawn basis and
                 * pointed at the sky). */
                let cam = dvec3_add(center, dvec3_scale(dir, r_surf + 0.05));
                {
                    let mut p = app.player.borrow_mut();
                    p.position = cam;
                    p.velocity = tenebris_core::math::DVec3::default();
                    p.last_tile = tile;
                    p.yaw = 0.0;
                    /* Look nearly ACROSS the sward (slightly down) so the
                     * side-to-side blade lean of the wind sway is visible -
                     * a top-down view foreshortens it into nothing. */
                    p.pitch = -0.16;
                }
                DEV_FISH_CAM.with(|c| c.set(Some(cam)));
                println!("[dev] grass: Fields tile {}", tile);
            } else {
                println!("[dev] grass: no Fields grass tile found");
            }
        }
        23 => {
            /* Orbit showcase (TENEBRIS_DEV_ORBIT): park the camera far out in
             * space on a line PERPENDICULAR to the sun, looking straight at the
             * planet centre. That puts the day/night terminator down the middle
             * of the disk so the reddish-orange sunset band along the shadow
             * edge can be inspected. TENEBRIS_DEV_TIME still sets the sun angle. */
            let (center, radius, sun_dir) = {
                let w = app.world.borrow();
                let sim_t = tenebris_core::world_time::seconds();
                let sd = dvec3_normalize(tenebris_core::orbit::sun_direction(w.body.id, sim_t));
                (
                    dvec3_make(w.body.pos_x, w.body.pos_y, w.body.pos_z),
                    w.body.radius_m,
                    sd,
                )
            };
            /* View direction perpendicular to the sun (so the terminator
             * bisects the visible disk); fall back if the cross degenerates. */
            let reference = if sun_dir.y.abs() < 0.9 {
                dvec3_make(0.0, 1.0, 0.0)
            } else {
                dvec3_make(1.0, 0.0, 0.0)
            };
            let view_dir = dvec3_normalize(tenebris_core::math::dvec3_cross(sun_dir, reference));
            let dist = radius * 2.2;
            let cam = dvec3_add(center, dvec3_scale(view_dir, dist));
            {
                let mut p = app.player.borrow_mut();
                p.position = cam;
                p.velocity = tenebris_core::math::DVec3::default();
                p.last_tile = -1;
                /* Keep is_in_space FALSE so the camera basis stays radial and
                 * the planet renders as full terrain (not the distant LOD
                 * impostor). DEV_FISH_CAM re-pins the position after physics
                 * each frame, so gravity can't pull the camera down. At the
                 * camera, radial "up" == view_dir, so looking straight down
                 * (-pi/2, nudged off the singularity) points at the planet
                 * centre and frames the full disk. */
                p.yaw = 0.0;
                p.pitch = -1.552;
            }
            DEV_FISH_CAM.with(|c| c.set(Some(cam)));
            /* The surface chunks were meshed around the SPAWN tile, not the
             * orbit vantage - force a full-planet remesh so the whole disk
             * renders as terrain from out here. (Grab the id into a local
             * first: remesh_body_now borrows the world internally, so an
             * outstanding app.world.borrow() here would double-borrow.) */
            let body_id = app.world.borrow().body.id as u32;
            renderer::remesh_body_now(body_id);
            println!(
                "[dev] orbit: cam at {:.0} m ({:.1}x radius), view perpendicular to sun",
                dist,
                dist / radius
            );
        }
        15 => {
            /* Occlusion test (TENEBRIS_DEV_OCCLUDE): raise a dirt column
             * a few metres ahead with the frozen herd + a crop row
             * BEHIND it, then aim straight at it. Everything behind the
             * column must be hidden / cut at its silhouette, and the
             * crop reticle hint must NOT light up through it - the
             * regression scene for entity-vs-terrain depth and the
             * block-distance gates on the entity picks. */
            animals::dev_spawn(&app.world.borrow(), &app.player.borrow());
            crops::dev_spawn(&app.world.borrow(), &app.player.borrow(), 7.5);
            {
                let (ppos, fwd, right, last_tile) = {
                    let p = app.player.borrow();
                    (p.position, p.basis.fwd, p.basis.right, p.last_tile)
                };
                let mut w = app.world.borrow_mut();
                let bc = dvec3_make(w.body.pos_x, w.body.pos_y, w.body.pos_z);
                let local = dvec3_sub(ppos, bc);
                /* A single-tile column, four high: hides the critter dead
                 * ahead while the flanking ones peek around its edges -
                 * one usually ends up half-cut by the column, the money
                 * shot for the depth test. */
                let mut raised = 0;
                for side in [0.0f64] {
                    let point = dvec3_add(
                        local,
                        dvec3_add(dvec3_scale(fwd, 4.5), dvec3_scale(right, side)),
                    );
                    let tile = w.grid.find_tile(dvec3_normalize(point), last_tile);
                    if tile < 0 {
                        continue;
                    }
                    let mut top = -1;
                    for d in (0..tenebris_core::world::WORLD_MAX_DEPTH).rev() {
                        if tenebris_core::blocks::is_solid(w.get(tile, d)) {
                            top = d;
                            break;
                        }
                    }
                    if top < 0 {
                        continue;
                    }
                    let cap = tenebris_core::world::WORLD_MAX_DEPTH - 2;
                    for d in top + 1..=(top + 4).min(cap) {
                        w.set(tile, d, Block::Dirt);
                        raised += 1;
                    }
                }
                println!(
                    "[dev] occlusion wall: {} dirt block(s); {} animals + {} crops behind it",
                    raised,
                    animals::count(),
                    crops::count()
                );
            }
            if let Some(mid) = animals::herd_center() {
                dev_aim_at(app, mid);
            }
        }
        5 => {
            /* Furnace UI shot: place a furnace on a front tile, stock the
             * bag with ore + coal, and open the smelter panel. */
            let depth = {
                let mut w = app.world.borrow_mut();
                let mut top = -1;
                for d in (0..tenebris_core::world::WORLD_MAX_DEPTH).rev() {
                    if tenebris_core::blocks::is_solid(w.get(center, d)) {
                        top = d;
                        break;
                    }
                }
                if top < 0 || top + 1 >= tenebris_core::world::WORLD_MAX_DEPTH {
                    return;
                }
                let d = top + 1;
                w.set(center, d, Block::Furnace);
                /* Pre-load the furnace so the shot shows it mid-smelt:
                 * input copper, coal lit, one ingot already produced. */
                let f = w.block_entities.entry(center, d).furnace_mut();
                f.input = tenebris_core::block_entity::ChestSlot {
                    item: tenebris_core::items::COPPER,
                    count: 6,
                };
                f.fuel = tenebris_core::block_entity::ChestSlot {
                    item: tenebris_core::items::COAL,
                    count: 2,
                };
                f.output = tenebris_core::block_entity::ChestSlot {
                    item: tenebris_core::items::COPPER_INGOT,
                    count: 2,
                };
                f.fuel_remaining = 5;
                f.progress = 0.45;
                d
            };
            {
                let mut p = app.player.borrow_mut();
                p.bag.add(tenebris_core::items::COPPER, 8);
                p.bag.add(tenebris_core::items::TIN, 8);
                p.bag.add(tenebris_core::items::IRON, 8);
                p.bag.add(tenebris_core::items::COAL, 16);
            }
            furnace_screen::open(app.world.clone(), app.player.clone(), center, depth);
        }
        4 => {
            /* Open-pit mine: dig the player's tile + its ring down a few
             * blocks (open to the sky for light) and tile the pit floor
             * with the four ore types, so digging down reveals speckled
             * ore in a stone matrix. The player falls into the pit and
             * looks down at the seam. */
            let depth = tenebris_core::world::WORLD_MAX_DEPTH;
            let surf = {
                let w = app.world.borrow();
                let mut top = -1;
                for d in (0..depth).rev() {
                    if tenebris_core::blocks::is_solid(w.get(center, d)) {
                        top = d;
                        break;
                    }
                }
                top
            };
            if surf < 0 {
                return;
            }
            let floor = (surf - 5).max(1);
            let ores = [
                Block::CopperOre,
                Block::TinOre,
                Block::IronOre,
                Block::CoalOre,
                Block::CopperOre,
                Block::IronOre,
            ];
            {
                let mut w = app.world.borrow_mut();
                /* Centre column: hollow out, ore on the floor. */
                for d in (floor + 1)..=surf {
                    w.set(center, d, Block::Air);
                }
                w.set(center, floor, Block::CoalOre);
            }
            dev_for_each_neighbor(&app.world, center, |w, i, n| {
                for d in (floor + 1)..=surf {
                    w.set(n, d, Block::Air);
                }
                w.set(n, floor, ores[i % ores.len()]);
            });
            app.player.borrow_mut().pitch = -0.85;
        }
        2 => {
            /* Ore + tech-block showcase: the centre tile becomes the
             * launch pad, the ring of neighbours each becomes a different
             * ore / reference block so one shot shows every tint. */
            let ring = [
                Block::CoalOre,
                Block::CopperOre,
                Block::TinOre,
                Block::IronOre,
                Block::CopperOre,
                Block::IronOre,
            ];
            dev_set_surface(&app.world, center, Block::LaunchPad);
            dev_for_each_neighbor(&app.world, center, |w, i, n| {
                dev_set_surface_w(w, n, ring[i % ring.len()]);
            });
            /* Curate the hotbar so one shot labels every ore + the tech
             * block as clean icons (runs after the SP creative prime, so
             * these writes stick). */
            let mut p = app.player.borrow_mut();
            let kit = [
                Block::LaunchPad,
                Block::CoalOre,
                Block::CopperOre,
                Block::TinOre,
                Block::IronOre,
                Block::Wood,
                Block::Stone,
            ];
            for (i, b) in kit.iter().enumerate() {
                if i < crate::inventory::INV_HOTBAR_SLOTS as usize {
                    p.inventory.slots[i] = crate::inventory::InvSlot::block(*b, 1);
                }
            }
        }
        6 => {
            /* Tech-block showcase: the player stands on bare terrain and the
             * ring of neighbours each becomes a different machine cube, so
             * one shot shows the cube geometry + ported JS net faces. */
            let ring = [
                Block::Furnace,
                Block::ElectricFurnace,
                Block::Computer,
                Block::Printer3D,
                Block::SteamEngine,
                Block::HydroGenerator,
            ];
            let player_pos = app.player.borrow().position;
            dev_for_each_neighbor(&app.world, center, |w, i, n| {
                /* Place the machine in the AIR voxel above the surface (the
                 * way a real player placement does), so the cube sits ON
                 * the ground instead of sinking into the top terrain layer. */
                let mut top = -1;
                for d in (0..tenebris_core::world::WORLD_MAX_DEPTH).rev() {
                    if tenebris_core::blocks::is_solid(w.get(n, d)) {
                        top = d;
                        break;
                    }
                }
                if top >= 0 && top + 1 < tenebris_core::world::WORLD_MAX_DEPTH {
                    let d = top + 1;
                    w.set(n, d, ring[i % ring.len()]);
                    /* Face each machine toward the player at the centre. */
                    let facing = w.facing_toward(n, d, player_pos);
                    w.block_entities
                        .set(n, d, tenebris_core::block_entity::BlockEntity::with_facing(facing));
                }
            });
            let mut p = app.player.borrow_mut();
            let kit = [
                Block::Furnace,
                Block::ElectricFurnace,
                Block::Computer,
                Block::Printer3D,
                Block::SteamEngine,
                Block::HydroGenerator,
                Block::StorageChest,
                Block::ElectronicsWorkbench,
                Block::LaunchTower,
            ];
            for (i, b) in kit.iter().enumerate() {
                if i < crate::inventory::INV_HOTBAR_SLOTS as usize {
                    p.inventory.slots[i] = crate::inventory::InvSlot::block(*b, 1);
                }
            }
            p.pitch = -0.18;
        }
        7 => {
            /* Storage-chest UI shot: a ring of chest cubes around the
             * player (so the placed tech block is visible in-world), with
             * the first one stocked + its panel opened. */
            use tenebris_core::block_entity::chest_add;
            use tenebris_core::items;
            let player_pos = app.player.borrow().position;
            let mut opened: Option<(i32, i32)> = None;
            dev_for_each_neighbor(&app.world, center, |w, _, n| {
                let mut top = -1;
                for dd in (0..tenebris_core::world::WORLD_MAX_DEPTH).rev() {
                    if tenebris_core::blocks::is_solid(w.get(n, dd)) {
                        top = dd;
                        break;
                    }
                }
                if top < 0 || top + 1 >= tenebris_core::world::WORLD_MAX_DEPTH {
                    return;
                }
                let nd = top + 1;
                w.set(n, nd, Block::StorageChest);
                let f = w.facing_toward(n, nd, player_pos);
                let e = w.block_entities.entry(n, nd);
                e.facing = f;
                if opened.is_none() {
                    let chest = e.chest_mut();
                    chest_add(chest, items::IRON_INGOT, 12, 64);
                    chest_add(chest, items::COPPER, 30, 64);
                    chest_add(chest, items::COAL, 5, 64);
                    opened = Some((n, nd));
                }
            });
            {
                let mut p = app.player.borrow_mut();
                p.bag.add(items::PLANK, 20);
                p.bag.add(items::IRON_INGOT, 8);
                p.bag.add(items::COPPER_INGOT, 12);
                p.bag.add(items::CPU_CHIP, 3);
                p.pitch = -0.25;
            }
            if let Some((t, d)) = opened {
                chest_screen::open(app.world.clone(), app.player.clone(), t, d);
            }
        }
        8 => {
            /* Power chain: steam engine -> cable -> electric furnace on
             * three consecutive ring tiles (mutually adjacent), all at the
             * centre's surface depth so the cable network connects. Engine
             * burning, furnace fed -> the furnace reads POWERED + smelts. */
            use tenebris_core::block_entity::{ChestSlot, STEAM_BURN_S_PER_COAL};
            use tenebris_core::items;
            let ring: Vec<i32> = {
                let w = app.world.borrow();
                match w.grid.tile(center) {
                    Some(t) => t.neighbors.iter().copied().filter(|&n| n >= 0).collect(),
                    None => Vec::new(),
                }
            };
            if ring.len() < 3 {
                return;
            }
            let depth = {
                let w = app.world.borrow();
                let mut top = -1;
                for d in (0..tenebris_core::world::WORLD_MAX_DEPTH).rev() {
                    if tenebris_core::blocks::is_solid(w.get(center, d)) {
                        top = d;
                        break;
                    }
                }
                if top < 0 || top + 1 >= tenebris_core::world::WORLD_MAX_DEPTH {
                    return;
                }
                top + 1
            };
            let _ = ring;
            /* Full modular chain as a vertical stack on the centre tile, so
             * depth-adjacency links every node regardless of neighbour
             * order: water -> hydro -> pipe -> steam engine -> cable ->
             * electric furnace. The engine then has BOTH water (pipes) and
             * coal, so it runs and powers the furnace. */
            let max = tenebris_core::world::WORLD_MAX_DEPTH;
            let fur_depth = (depth + 5).min(max - 1);
            if depth + 5 >= max {
                return;
            }
            {
                let mut w = app.world.borrow_mut();
                w.set(center, depth, Block::Water); // hydro sits on this
                w.set(center, depth + 1, Block::HydroGenerator);
                w.set(center, depth + 2, Block::CopperPipe);
                w.set(center, depth + 3, Block::SteamEngine);
                let s = w.block_entities.entry(center, depth + 3).steam_engine_mut();
                s.fuel = ChestSlot { item: items::COAL, count: 4 };
                s.burn_time = STEAM_BURN_S_PER_COAL;
                w.set(center, depth + 4, Block::Cable);
                w.set(center, depth + 5, Block::ElectricFurnace);
                let ef = w.block_entities.entry(center, depth + 5).electric_furnace_mut();
                ef.input = ChestSlot { item: items::IRON, count: 5 };
                ef.progress = 0.5;
            }
            {
                let mut p = app.player.borrow_mut();
                p.bag.add(items::IRON, 8);
                p.bag.add(items::COAL, 16);
                p.pitch = 0.25;
            }
            power_ui::open_electric(app.world.clone(), app.player.clone(), center, fur_depth);
        }
        9 => {
            /* Printer chain (vertical stack): water -> hydro -> pipe ->
             * engine -> cable -> computer -> cable -> printer. The printer
             * is powered only via a powered computer (the JS gate). */
            use tenebris_core::block_entity::{ChestSlot, STEAM_BURN_S_PER_COAL};
            use tenebris_core::items;
            let max = tenebris_core::world::WORLD_MAX_DEPTH;
            let depth = {
                let w = app.world.borrow();
                let mut top = -1;
                for d in (0..max).rev() {
                    if tenebris_core::blocks::is_solid(w.get(center, d)) {
                        top = d;
                        break;
                    }
                }
                top + 1
            };
            if depth < 1 || depth + 7 >= max {
                return;
            }
            let printer_depth = depth + 7;
            {
                let mut w = app.world.borrow_mut();
                w.set(center, depth, Block::Water);
                w.set(center, depth + 1, Block::HydroGenerator);
                w.set(center, depth + 2, Block::CopperPipe);
                w.set(center, depth + 3, Block::SteamEngine);
                let s = w.block_entities.entry(center, depth + 3).steam_engine_mut();
                s.fuel = ChestSlot { item: items::COAL, count: 4 };
                s.burn_time = STEAM_BURN_S_PER_COAL;
                w.set(center, depth + 4, Block::Cable);
                w.set(center, depth + 5, Block::Computer);
                w.block_entities.entry(center, depth + 5).computer_mut();
                w.set(center, depth + 6, Block::Cable);
                w.set(center, printer_depth, Block::Printer3D);
                let pr = w.block_entities.entry(center, printer_depth).printer_mut();
                pr.out_item = tenebris_core::items::from_block(Block::LaunchTower);
                pr.out_qty = 1;
                pr.total = 10.0;
                pr.progress = 0.45;
            }
            {
                let mut p = app.player.borrow_mut();
                p.bag.add(items::IRON_INGOT, 20);
                p.bag.add(items::BRONZE_INGOT, 8);
                p.bag.add(items::COAL, 16);
                p.pitch = 0.35;
            }
            power_ui::open_printer(app.world.clone(), app.player.clone(), center, printer_depth);
        }
        10 => {
            /* Wiring showcase (geometry, no UI panel): lay the copper-pipe /
             * cable network out HORIZONTALLY along the ground so the modular
             * connectors - not the machine cubes - are the subject.
             *
             * A path is built by walking the neighbour graph outward from the
             * player; consecutive tiles are mutually adjacent (each is a
             * neighbour of the previous), so a pipe / cable laid along the
             * path connects end to end. Layout along the path:
             *   hydro -> pipe -> pipe -> pipe -> steam engine
             *         -> cable -> cable -> computer
             * The long pipe and cable runs read as a pipeline on the terrain;
             * cable arms are slimmer than copper-pipe arms. */
            let max = tenebris_core::world::WORLD_MAX_DEPTH;
            let dot = |a: DVec3, b: DVec3| a.x * b.x + a.y * b.y + a.z * b.z;
            let path: Vec<i32> = {
                let w = app.world.borrow();
                let tc = |t: i32| w.grid.tile(t).map(|x| x.center);
                let norm = |a: DVec3| {
                    let l = dvec3_length(a);
                    if l > 1e-12 {
                        dvec3_scale(a, 1.0 / l)
                    } else {
                        a
                    }
                };
                let neighbors = |t: i32| -> Vec<i32> {
                    match w.grid.tile(t) {
                        Some(x) => x.neighbors.iter().copied().filter(|&n| n >= 0).collect(),
                        None => Vec::new(),
                    }
                };
                let c0 = match tc(center) {
                    Some(c) => c,
                    None => return,
                };
                let mut path = vec![center];
                /* First hop: head outward (neighbour farthest from centre). */
                let mut cur;
                {
                    let mut best = -1;
                    let mut bd = f64::INFINITY;
                    for n in neighbors(center) {
                        if let Some(c) = tc(n) {
                            let d = dot(c, c0);
                            if d < bd {
                                bd = d;
                                best = n;
                            }
                        }
                    }
                    if best < 0 {
                        return;
                    }
                    path.push(best);
                    cur = best;
                }
                /* Keep going straight: each step picks the neighbour whose
                 * direction best continues the previous step. */
                let mut dir = norm(dvec3_sub(tc(cur).unwrap_or(c0), c0));
                for _ in 0..8 {
                    let cc = match tc(cur) {
                        Some(c) => c,
                        None => break,
                    };
                    let mut best = -1;
                    let mut bd = -2.0;
                    for n in neighbors(cur) {
                        if path.contains(&n) {
                            continue;
                        }
                        if let Some(c) = tc(n) {
                            let d = dot(norm(dvec3_sub(c, cc)), dir);
                            if d > bd {
                                bd = d;
                                best = n;
                            }
                        }
                    }
                    if best < 0 {
                        break;
                    }
                    dir = norm(dvec3_sub(tc(best).unwrap_or(cc), cc));
                    path.push(best);
                    cur = best;
                }
                path
            };
            if path.len() < 8 {
                return;
            }
            let player_pos = app.player.borrow().position;
            /* Common ground level for the whole strip = the surface depth at
             * the run's middle. Levelling to one depth makes the run a clean,
             * aligned horizontal line (and the connector arms join cleanly,
             * since every node shares a depth). */
            let level_top = {
                let w = app.world.borrow();
                let mut top = -1;
                for d in (0..max).rev() {
                    if tenebris_core::blocks::is_solid(w.get(path[3], d)) {
                        top = d;
                        break;
                    }
                }
                top
            };
            if level_top < 1 || level_top + 2 >= max {
                return;
            }
            /* (path index, block). Index 0 is under the player, left bare.
             * A long copper-pipe run then a cable run, with the only machine
             * pushed to the far end so the connector geometry - not the
             * cubes - fills the frame. */
            let layout = [
                (1usize, Block::CopperPipe),
                (2, Block::CopperPipe),
                (3, Block::CopperPipe),
                (4, Block::Cable),
                (5, Block::Cable),
                (6, Block::Cable),
                (7, Block::SteamEngine),
            ];
            {
                let mut w = app.world.borrow_mut();
                /* Flatten a shelf along the path + a one-tile skirt so the run
                 * isn't occluded by terrain bumps: clear everything above the
                 * level, make the level itself solid. */
                let mut shelf: Vec<i32> = Vec::new();
                for &t in path.iter().take(9) {
                    shelf.push(t);
                    if let Some(tile) = w.grid.tile(t) {
                        for k in 0..tile.num_neighbors as usize {
                            let n = tile.neighbors[k];
                            if n >= 0 && !shelf.contains(&n) {
                                shelf.push(n);
                            }
                        }
                    }
                }
                for &t in shelf.iter() {
                    for d in (level_top + 1)..max {
                        if w.get(t, d) != Block::Air {
                            w.set(t, d, Block::Air);
                        }
                    }
                    if !tenebris_core::blocks::is_solid(w.get(t, level_top)) {
                        w.set(t, level_top, Block::Stone);
                    }
                }
                let d = level_top + 1;
                for (idx, b) in layout.iter() {
                    let t = path[*idx];
                    w.set(t, d, *b);
                    if tenebris_core::blocks::is_tech_block(*b)
                        && *b != Block::Cable
                        && *b != Block::CopperPipe
                    {
                        let facing = w.facing_toward(t, d, player_pos);
                        w.block_entities.set(
                            t,
                            d,
                            tenebris_core::block_entity::BlockEntity::with_facing(facing),
                        );
                    }
                }
            }
            /* Move the camera to a viewpoint OFF TO THE SIDE of the run so it
             * reads broadside (segments spread left-to-right), not collapsed
             * down the line. Walk perpendicular to the run from its middle a
             * few tiles, stand the player on that tile's surface (grounded so
             * physics doesn't drop it), then aim at the run middle. */
            let norm = |a: DVec3| {
                let l = dvec3_length(a);
                if l > 1e-12 {
                    dvec3_scale(a, 1.0 / l)
                } else {
                    a
                }
            };
            let cross = |a: DVec3, b: DVec3| {
                dvec3_make(
                    a.y * b.z - a.z * b.y,
                    a.z * b.x - a.x * b.z,
                    a.x * b.y - a.y * b.x,
                )
            };
            let mid_idx = 3usize;
            let mid_tile = path[mid_idx];
            /* Surface world position of any tile (feet height). */
            let surf_world = |w: &World, t: i32| -> Option<(DVec3, i32)> {
                let mut top = -1;
                for d in (0..max).rev() {
                    if tenebris_core::blocks::is_solid(w.get(t, d)) {
                        top = d;
                        break;
                    }
                }
                w.grid
                    .tile(t)
                    .map(|x| (dvec3_scale(norm(x.center), w.depth_to_radius_m(top.max(0) + 1)), top))
            };
            /* Find the side viewpoint tile. */
            let view_tile = {
                let w = app.world.borrow();
                let up_m = match w.grid.tile(mid_tile) {
                    Some(t) => norm(t.center),
                    None => return,
                };
                let run_dir = match (w.grid.tile(path[mid_idx + 1]), w.grid.tile(path[mid_idx - 1]))
                {
                    (Some(a), Some(b)) => norm(dvec3_sub(a.center, b.center)),
                    _ => return,
                };
                let side = norm(cross(up_m, run_dir));
                let mut cur = mid_tile;
                for _ in 0..1 {
                    let cc = match w.grid.tile(cur) {
                        Some(t) => t.center,
                        None => break,
                    };
                    let nb: Vec<i32> = match w.grid.tile(cur) {
                        Some(t) => t.neighbors.iter().copied().filter(|&n| n >= 0).collect(),
                        None => Vec::new(),
                    };
                    let mut best = -1;
                    let mut bd = -2.0;
                    for n in nb {
                        if path.contains(&n) {
                            continue;
                        }
                        if let Some(t) = w.grid.tile(n) {
                            let d = dot(norm(dvec3_sub(t.center, cc)), side);
                            if d > bd {
                                bd = d;
                                best = n;
                            }
                        }
                    }
                    if best < 0 {
                        break;
                    }
                    cur = best;
                }
                cur
            };
            /* Compute the new camera position + aim target. */
            let (view_pos, mid_world) = {
                let w = app.world.borrow();
                let v = surf_world(&w, view_tile);
                let m = surf_world(&w, mid_tile);
                match (v, m) {
                    (Some((vp, _)), Some((mp, _))) => (vp, mp),
                    _ => return,
                }
            };
            let mut p = app.player.borrow_mut();
            /* Stand the player on the viewpoint tile, just above the surface
             * so physics settles the feet onto it. Rebuild the basis for the
             * new location before deriving yaw/pitch. */
            let up = norm(view_pos);
            p.position = dvec3_add(view_pos, dvec3_scale(up, 0.5));
            p.velocity = dvec3_make(0.0, 0.0, 0.0);
            p.basis = tenebris_core::physics::tangent_basis(p.position);
            p.basis_ready = true;
            {
                let eye = dvec3_add(p.position, dvec3_scale(p.basis.up, 1.6));
                let to = dvec3_sub(mid_world, eye);
                let to_len = dvec3_length(to).max(1e-9);
                let look = dvec3_scale(to, 1.0 / to_len);
                let bu = p.basis.up;
                let fwd = p.basis.fwd;
                let right = p.basis.right;
                let to_t = dvec3_sub(look, dvec3_scale(bu, dot(look, bu)));
                p.yaw = (dot(to_t, right)).atan2(dot(to_t, fwd)) as f32;
                p.pitch = dot(look, bu).clamp(-1.0, 1.0).asin() as f32;
            }
            let kit = [
                Block::CopperPipe,
                Block::Cable,
                Block::HydroGenerator,
                Block::SteamEngine,
                Block::Computer,
                Block::ElectricFurnace,
            ];
            for (i, b) in kit.iter().enumerate() {
                if i < crate::inventory::INV_HOTBAR_SLOTS as usize {
                    p.inventory.slots[i] = crate::inventory::InvSlot::block(*b, 1);
                }
            }
        }
        11 => {
            /* Rocket-stacking showcase: place a launch pad on the player's
             * tile and pre-assemble a flyable stack (engine -> 2 tanks ->
             * capsule) so the parts render in-world AND the assembly panel
             * opens populated. Stock the bag with spares + craft mats. */
            use tenebris_core::items;
            let depth = {
                let w = app.world.borrow();
                let mut top = -1;
                for d in (0..tenebris_core::world::WORLD_MAX_DEPTH).rev() {
                    if tenebris_core::blocks::is_solid(w.get(center, d)) {
                        top = d;
                        break;
                    }
                }
                if top < 0 || top + 1 >= tenebris_core::world::WORLD_MAX_DEPTH {
                    return;
                }
                top + 1
            };
            {
                let mut w = app.world.borrow_mut();
                w.set(center, depth, Block::LaunchPad);
                let pad = w.block_entities.entry(center, depth).launch_pad_mut();
                /* Two-stage starter: atmospheric booster (engine + 2 tanks) to
                 * lift off, a vacuum upper stage (engine + tank) to stage to in
                 * space, capsule on top. */
                pad.push(items::ROCKET_ENGINE);
                pad.push(items::FUEL_TANK);
                pad.push(items::FUEL_TANK);
                pad.push(items::VACUUM_ENGINE);
                pad.push(items::FUEL_TANK);
                pad.push(items::COMMAND_MODULE);
            }
            {
                let mut p = app.player.borrow_mut();
                p.bag.add(items::ROCKET_ENGINE, 2);
                p.bag.add(items::FUEL_TANK, 4);
                p.bag.add(items::COMMAND_MODULE, 2);
                p.bag.add(items::IRON_INGOT, 16);
                p.bag.add(items::BRONZE_INGOT, 8);
                p.pitch = 0.12;
            }
            rocket_screen::open(app.world.clone(), app.player.clone(), center, depth);
        }
        12 => {
            /* Rocket-stacking in-world view (no panel): build a pad + flyable
             * stack on a tile a few hops out and aim the camera at it, so the
             * stacked part cubes read against the sky. */
            use tenebris_core::items;
            let dot = |a: DVec3, b: DVec3| a.x * b.x + a.y * b.y + a.z * b.z;
            let target = {
                let w = app.world.borrow();
                let c_dir = match w.grid.tile(center) {
                    Some(t) => t.center,
                    None => return,
                };
                let mut cur = center;
                for _ in 0..2 {
                    let nb: Vec<i32> = match w.grid.tile(cur) {
                        Some(t) => t.neighbors.iter().copied().filter(|&n| n >= 0).collect(),
                        None => Vec::new(),
                    };
                    let mut best = cur;
                    let mut best_dot = f64::INFINITY;
                    for n in nb {
                        if let Some(t) = w.grid.tile(n) {
                            let d = dot(t.center, c_dir);
                            if d < best_dot {
                                best_dot = d;
                                best = n;
                            }
                        }
                    }
                    cur = best;
                }
                cur
            };
            let depth = {
                let w = app.world.borrow();
                let mut top = -1;
                for d in (0..tenebris_core::world::WORLD_MAX_DEPTH).rev() {
                    if tenebris_core::blocks::is_solid(w.get(target, d)) {
                        top = d;
                        break;
                    }
                }
                if top < 0 || top + 1 >= tenebris_core::world::WORLD_MAX_DEPTH {
                    return;
                }
                top + 1
            };
            {
                let mut w = app.world.borrow_mut();
                w.set(target, depth, Block::LaunchPad);
                let pad = w.block_entities.entry(target, depth).launch_pad_mut();
                /* Two-stage starter: atmospheric booster (engine + 2 tanks) to
                 * lift off, a vacuum upper stage (engine + tank) to stage to in
                 * space, capsule on top. */
                pad.push(items::ROCKET_ENGINE);
                pad.push(items::FUEL_TANK);
                pad.push(items::FUEL_TANK);
                pad.push(items::VACUUM_ENGINE);
                pad.push(items::FUEL_TANK);
                pad.push(items::COMMAND_MODULE);
            }
            /* Aim at the middle of the stack. */
            let (tdir, r_mid) = {
                let w = app.world.borrow();
                let r0 = w.depth_to_radius_m(depth + 1);
                (w.grid.tile(target).map(|t| t.center), r0 + 3.0)
            };
            let mut p = app.player.borrow_mut();
            if let Some(tc) = tdir {
                let tlen = dvec3_length(tc);
                let mid_world = if tlen > 1e-9 { dvec3_scale(tc, r_mid / tlen) } else { tc };
                let to = dvec3_sub(mid_world, p.position);
                let to_len = dvec3_length(to).max(1e-9);
                let look = dvec3_scale(to, 1.0 / to_len);
                let up = p.basis.up;
                let fwd = p.basis.fwd;
                let right = p.basis.right;
                let to_t = dvec3_sub(look, dvec3_scale(up, dot(look, up)));
                p.yaw = (dot(to_t, right)).atan2(dot(to_t, fwd)) as f32;
                p.pitch = dot(look, up).clamp(-1.0, 1.0).asin() as f32;
            }
        }
        _ => {
            /* Launch pad: centre tile + its ring all become the pad. */
            dev_set_surface(&app.world, center, Block::LaunchPad);
            dev_for_each_neighbor(&app.world, center, |w, _, n| {
                dev_set_surface_w(w, n, Block::LaunchPad);
            });
        }
    }
}

/// Run `f(world, neighbor_index, neighbor_tile)` over each valid neighbour
/// of `center`. Collects the neighbour list first so the closure can hold
/// the world borrow without aliasing the grid read.
fn dev_for_each_neighbor(world: &Rc<RefCell<World>>, center: i32, mut f: impl FnMut(&mut World, usize, i32)) {
    if center < 0 {
        return;
    }
    let neighbors: Vec<i32> = {
        let w = world.borrow();
        match w.grid.tile(center) {
            Some(t) => t.neighbors.iter().copied().filter(|&n| n >= 0).collect(),
            None => Vec::new(),
        }
    };
    let mut w = world.borrow_mut();
    for (i, n) in neighbors.into_iter().enumerate() {
        f(&mut w, i, n);
    }
}

/// Replace `tile`'s topmost solid voxel (its presented surface) with `b`.
fn dev_set_surface(world: &Rc<RefCell<World>>, tile: i32, b: Block) {
    let mut w = world.borrow_mut();
    dev_set_surface_w(&mut w, tile, b);
}

/// Same as [`dev_set_surface`] but on an already-borrowed world.
fn dev_set_surface_w(w: &mut World, tile: i32, b: Block) {
    if tile < 0 {
        return;
    }
    let mut top = -1;
    for d in (0..tenebris_core::world::WORLD_MAX_DEPTH).rev() {
        if tenebris_core::blocks::is_solid(w.get(tile, d)) {
            top = d;
            break;
        }
    }
    if top >= 0 {
        w.set(tile, top, b);
    }
}

/// Space-exploration mode: build the prepared launch complex once, a few
/// frames after entering a FRESH space world (armed by EnterSp). Waits for
/// the terrain + a valid ground tile under the player, then lays a stone
/// apron, a fueled+assembled rocket on a launch pad, a supply chest, a 3D
/// printer, and a furnace on the ring around spawn. Every edit persists on
/// the same frame (CLAUDE.md rule), so the complex survives a reload and is
/// never rebuilt (the reloaded world isn't "new").
fn space_complex_maybe_build(app: &mut App) {
    let n = SPACE_BUILD_COUNTDOWN.with(|c| c.get());
    if n < 0 || menu::state() != GameState::InGameSp {
        return;
    }
    use tenebris_core::block_entity::chest_add;
    use tenebris_core::items;
    use tenebris_core::math::{dvec3_add, dvec3_make, dvec3_normalize, dvec3_scale, dvec3_sub, DVec3};
    use tenebris_core::world::WORLD_MAX_DEPTH;

    /* Seed tile: the player's own tile if grounded, else the tile under
     * their radial direction (a fresh world can spawn them above / in
     * space before gravity settles). -1 = the grid isn't ready yet. */
    let seed_tile = {
        let p = app.player.borrow();
        if p.last_tile >= 0 {
            p.last_tile
        } else {
            let w = app.world.borrow();
            let bc = dvec3_make(w.body.pos_x, w.body.pos_y, w.body.pos_z);
            let dir = dvec3_normalize(dvec3_sub(p.position, bc));
            w.grid.find_tile(dir, 0)
        }
    };
    if seed_tile < 0 {
        return; /* grid not ready - keep waiting (countdown not spent) */
    }
    if n > 0 {
        SPACE_BUILD_COUNTDOWN.with(|c| c.set(n - 1));
        return;
    }
    SPACE_BUILD_COUNTDOWN.with(|c| c.set(-1));

    /* A launch complex belongs on dry LAND, never in the ocean. BFS out
     * from the seed tile to the nearest tile whose terrain pokes above the
     * sea surface; fall back to the seed if the search somehow finds none. */
    let center = {
        let w = app.world.borrow();
        let sea = tenebris_core::planet_gen::sea_raise_m(&w.body) + 1.5;
        let is_land = |tile: i32| -> bool {
            w.grid.tile(tile).is_some_and(|t| {
                let dir = dvec3_normalize(t.center);
                tenebris_core::planet_gen::surface_altitude(&w.body, dir) > sea
            })
        };
        if is_land(seed_tile) {
            seed_tile
        } else {
            let mut visited = std::collections::HashSet::new();
            let mut queue = std::collections::VecDeque::new();
            visited.insert(seed_tile);
            queue.push_back(seed_tile);
            let mut found = seed_tile;
            while let Some(cur) = queue.pop_front() {
                if is_land(cur) {
                    found = cur;
                    break;
                }
                if visited.len() > 30000 {
                    break;
                }
                if let Some(t) = w.grid.tile(cur) {
                    for &nb in t.neighbors.iter() {
                        if nb >= 0 && visited.insert(nb) {
                            queue.push_back(nb);
                        }
                    }
                }
            }
            found
        }
    };

    /* Plant the player on the apron centre so the complex builds around
     * them and they don't drift off in space. */
    {
        let w = app.world.borrow();
        let bc = dvec3_make(w.body.pos_x, w.body.pos_y, w.body.pos_z);
        if let Some(t) = w.grid.tile(center) {
            let tdir = dvec3_normalize(t.center);
            let mut top = -1;
            for d in (0..WORLD_MAX_DEPTH).rev() {
                if tenebris_core::blocks::is_solid(w.get(center, d)) {
                    top = d;
                    break;
                }
            }
            let stand_r = w.depth_to_radius_m((top + 1).max(1)) + 0.1;
            let mut p = app.player.borrow_mut();
            p.position = dvec3_add(bc, dvec3_scale(tdir, stand_r));
            p.velocity = DVec3::default();
            p.last_tile = center;
            p.is_in_space = false;
        }
    }
    let player_pos = app.player.borrow().position;

    /* Topmost air voxel (one above the surface) of a tile, or -1 if the
     * column has no room. */
    fn top_air(w: &World, tile: i32) -> i32 {
        let mut top = -1;
        for d in (0..WORLD_MAX_DEPTH).rev() {
            if tenebris_core::blocks::is_solid(w.get(tile, d)) {
                top = d;
                break;
            }
        }
        if top < 0 || top + 1 >= WORLD_MAX_DEPTH {
            -1
        } else {
            top + 1
        }
    }

    let ring: Vec<i32> = {
        let w = app.world.borrow();
        match w.grid.tile(center) {
            Some(t) => t.neighbors.iter().copied().filter(|&x| x >= 0).collect(),
            None => Vec::new(),
        }
    };
    let mut edited: Vec<i32> = vec![center];
    {
        let mut w = app.world.borrow_mut();
        /* Stone apron under the whole complex (center + ring). */
        dev_set_surface_w(&mut w, center, Block::Stone);
        for &r in &ring {
            dev_set_surface_w(&mut w, r, Block::Stone);
            edited.push(r);
        }
        /* Fueled, assembled rocket on a launch pad (ring[0]). */
        if let Some(&pad_tile) = ring.first() {
            let d = top_air(&w, pad_tile);
            if d >= 0 {
                w.set(pad_tile, d, Block::LaunchPad);
                let pad = w.block_entities.entry(pad_tile, d).launch_pad_mut();
                /* Two-stage starter: atmospheric booster (engine + 2 tanks) to
                 * lift off, a vacuum upper stage (engine + tank) to stage to in
                 * space, capsule on top. */
                pad.push(items::ROCKET_ENGINE);
                pad.push(items::FUEL_TANK);
                pad.push(items::FUEL_TANK);
                pad.push(items::VACUUM_ENGINE);
                pad.push(items::FUEL_TANK);
                pad.push(items::COMMAND_MODULE);
            }
        }
        /* Supply chest (ring[1]): spare rocket parts, metals, food. */
        if let Some(&ct) = ring.get(1) {
            let d = top_air(&w, ct);
            if d >= 0 {
                w.set(ct, d, Block::StorageChest);
                let f = w.facing_toward(ct, d, player_pos);
                let e = w.block_entities.entry(ct, d);
                e.facing = f;
                let chest = e.chest_mut();
                chest_add(chest, items::ROCKET_ENGINE, 2, 64);
                chest_add(chest, items::VACUUM_ENGINE, 2, 64);
                chest_add(chest, items::FUEL_TANK, 4, 64);
                chest_add(chest, items::COMMAND_MODULE, 2, 64);
                chest_add(chest, items::IRON_INGOT, 32, 64);
                chest_add(chest, items::BRONZE_INGOT, 16, 64);
                chest_add(chest, items::COOKED_MEAT, 8, 64);
            }
        }
        /* A 3D printer + furnace so the base can make more parts. */
        for (idx, blk) in [(2usize, Block::Printer3D), (3usize, Block::Furnace)] {
            if let Some(&t) = ring.get(idx) {
                let d = top_air(&w, t);
                if d >= 0 {
                    w.set(t, d, blk);
                    let f = w.facing_toward(t, d, player_pos);
                    w.block_entities.entry(t, d).facing = f;
                }
            }
        }
        /* The launch-tower gantry is drawn as textured geometry beside the
         * rocket by client::rocket_fx (single-sided, ported tower texture) -
         * no voxel LaunchTower blocks, which read as double-sided see-through
         * prisms. */
    }
    /* Same-frame persistence for every edited column + its block entities. */
    {
        let w = app.world.borrow();
        for &t in &edited {
            crate::interact::sp_save_tile_after_edit(&w, t);
        }
    }
    /* Survival head-start kit in the bag; persisted immediately. */
    let world = menu::active_world();
    {
        let mut p = app.player.borrow_mut();
        p.bag.add(items::IRON_INGOT, 16);
        p.bag.add(items::BRONZE_INGOT, 8);
        p.bag.add(items::COAL, 8);
        p.bag.add(items::PLANK, 16);
        p.bag.add(items::COOKED_MEAT, 4);
        persistence::save_bag(&world, p.hunger, &p.bag.serialize());
    }
    /* Stand back from the pad and face the rocket so the whole complex -
     * gantry + rocket - reads on world load instead of a straight-up stare. */
    if let Some(&pad_tile) = ring.first() {
        let (pad_c, center_c, surf_r, rocket_mid_r) = {
            let w = app.world.borrow();
            let top = (0..WORLD_MAX_DEPTH)
                .rev()
                .find(|&d| tenebris_core::blocks::is_solid(w.get(pad_tile, d)))
                .unwrap_or(0);
            (
                w.grid.tile(pad_tile).map(|t| dvec3_normalize(t.center)),
                w.grid.tile(center).map(|t| dvec3_normalize(t.center)),
                w.depth_to_radius_m(top + 1),
                w.depth_to_radius_m(top + 1) + 4.0, /* aim a few m up the rocket */
            )
        };
        let bc = {
            let w = app.world.borrow();
            dvec3_make(w.body.pos_x, w.body.pos_y, w.body.pos_z)
        };
        if let (Some(pc), Some(cc)) = (pad_c, center_c) {
            /* Vantage: on the apron, pushed ~8 m away from the pad along the
             * surface + lifted to eye height, so the tower fits the frame. */
            let back = dvec3_normalize(dvec3_sub(cc, pc)); /* pad -> centre dir */
            let stand_dir = dvec3_normalize(dvec3_add(cc, dvec3_scale(back, 0.035)));
            let eye = dvec3_add(bc, dvec3_scale(stand_dir, surf_r + 1.6));
            let target = dvec3_add(bc, dvec3_scale(pc, rocket_mid_r));
            let mut p = app.player.borrow_mut();
            p.position = eye;
            p.velocity = DVec3::default();
            let up = dvec3_normalize(dvec3_sub(eye, bc));
            let to = dvec3_sub(target, eye);
            let to_len = dvec3_length(to).max(1e-9);
            let look = dvec3_scale(to, 1.0 / to_len);
            let (fwd, right) = (p.basis.fwd, p.basis.right);
            let dot = |a: DVec3, b: DVec3| a.x * b.x + a.y * b.y + a.z * b.z;
            let to_t = dvec3_sub(look, dvec3_scale(up, dot(look, up)));
            p.yaw = (dot(to_t, right)).atan2(dot(to_t, fwd)) as f32;
            p.pitch = dot(look, up).clamp(-1.0, 1.0).asin() as f32;
        }
    }
    println!("[space] launch complex built around tile {center}");
}

extern "C" fn init() {
    /* Bump sokol's buffer pool way above the default 128 (see the long
     * rationale in the C file: 4 buffers per chunk x 32 chunks x ~20
     * bodies plus regrow churn; pool exhaustion = missing chunks).
     * Pipeline pool 256 for the same reason (hex / water / composite /
     * atmosphere / skybox / per-body + every UI module's sgl pipe). */
    sg::setup(&sg::Desc {
        environment: sokol::glue::environment(),
        logger: sg::Logger {
            func: Some(on_screen_log),
            ..Default::default()
        },
        buffer_pool_size: 4096,
        pipeline_pool_size: 256,
        ..Default::default()
    });
    stm::setup();
    /* IMPORTANT: every one of the 8 sdtx font slots gets filled, even
     * the ones we don't actively use - kills the white trailing-bleed
     * at >1x scale (see C comment). */
    let mut sdtx_desc = sdtx::Desc {
        logger: sdtx::Logger {
            func: Some(on_screen_log),
            ..Default::default()
        },
        ..Default::default()
    };
    sdtx_desc.fonts[0] = sdtx::font_oric(); /* HUD  */
    sdtx_desc.fonts[1] = sdtx::font_c64(); /* menu */
    for i in 2..8 {
        sdtx_desc.fonts[i] = sdtx::font_c64(); /* trailing-bleed guards */
    }
    sdtx::setup(&sdtx_desc);

    input::init();
    settings::init(); /* load mouse sensitivity etc. from client_kv */
    job_system::init(0);
    renderer::init();
    torch::init();
    animals::init();
    crops::init();
    drops::init();
    mobile_ui::init();
    hotbar_ui::init();
    teleport_menu::init();
    crafting_screen::init();
    rocket_screen::init();
    egui_layer::init();

    /* net_client's /saves audit scores distance from the camera to
     * each persisted tile via this provider (C: the two exported
     * tenebris_get_local_player_* symbols). */
    net_client::set_local_player_provider(local_player_provider);

    #[cfg(target_os = "emscripten")]
    unsafe {
        /* Stop the browser from refreshing the page when the player
         * presses F5 (the water-flow debug overlay toggle). */
        tenebris_block_f5_refresh();
        /* DOM overlays are mobile-only scaffolding per CLAUDE.md: the
         * pause button stands in for the Esc key, and the joystick +
         * action deck stand in for keyboard / mouse. The pause panel
         * itself is in-canvas (menu) on every platform. */
        if tenebris_is_mobile_device() != 0 {
            tenebris_pause_button_install();
            tenebris_inventory_button_install();
            tenebris_fullscreen_button_install();
            tenebris_mobile_controls_install();
        }
    }

    /* Load atmosphere overrides from YAML before creating any worlds -
     * planet::set_atmosphere mutates BODIES[] and the renderer reads
     * body atmo fields every frame. */
    planet::load_atmosphere("assets/config/atmosphere.yaml");
    config::load_skybox("assets/config/skybox.yaml");
    config::load_lod("assets/config/lod.yaml");
    config::load_water("assets/config/water.yaml");
    config::load_lighting("assets/config/lighting.yaml");
    config::load_bonfire("assets/config/bonfire.yaml");
    tenebris_core::weather::load_config("assets/config/weather.yaml");
    config::load_time("assets/config/time.yaml");
    /* Keyboard bindings (remappable): raw keys -> named actions. */
    crate::controls::load("assets/config/controls.yaml");
    /* Space-era economy tunables (credits, prices, spreads) + the station
     * market's base price table ([prices] section of the same file). */
    tenebris_core::economy::load_config("assets/config/economy.yaml");
    tenebris_core::station::load_prices("assets/config/economy.yaml");
    /* Start the world clock in daylight (start_day_fraction of a day),
     * unless a dev override pins the time of day. */
    {
        let tc = config::time();
        let frac = match std::env::var("TENEBRIS_DEV_TIME") {
            Ok(v) => v.parse::<f32>().unwrap_or(tc.start_day_fraction),
            Err(_) => tc.start_day_fraction,
        };
        tenebris_core::world_time::set_seconds((frac as f64) * tc.day_length_s as f64);
    }
    /* Install the crafting recipe table from data so the craft screen
     * and the bag bridge can read it (see core::crafting). */
    tenebris_core::crafting::set_recipes(tenebris_core::crafting::load_recipes(
        "assets/config/recipes.yaml",
    ));
    /* Survival mining + ore-drop tuning. */
    tenebris_core::mining::load_config("assets/config/mining.yaml");
    /* Crop growth + yield tuning (farming loop). */
    tenebris_core::farming::load_config("assets/config/farming.yaml");
    /* Decorative surface scatter densities (grass / rocks / kelp...). */
    tenebris_core::scatter::load_config("assets/config/scatter.yaml");
    /* Cloud layer densities / drift (see client clouds.rs). */
    tenebris_core::clouds::load_config("assets/config/clouds.yaml");
    tenebris_core::fishing::load_config("assets/config/fishing.yaml");
    tenebris_core::gameplay::load_config("assets/config/gameplay.yaml");
    /* Rocket part stats + flight constants (consumed by the rocket
     * assembly + flight port). */
    tenebris_core::rocket::set_config(tenebris_core::rocket::load_rocket_config(
        "assets/config/rocket.yaml",
    ));
    config::load_ui("assets/config/ui.yaml");

    /* pixel_ui::init reads the atlas path out of config::ui(), so it
     * has to run AFTER config::load_ui - otherwise a themed ui.yaml
     * that points at a non-default PNG would be ignored on first
     * boot. */
    pixel_ui::init();
    ui_icons::init();
    /* Crack-stage atlas for the mining decal - loaded at boot, outside
     * any render pass. */
    renderer::preload_break_atlas();
    /* One-shot dump of Tenebris's effective atmosphere values so we
     * can sanity-check that the YAML actually landed. */
    {
        let tb = planet::get(BodyId::Tenebris);
        println!(
            "[atmo] {} effective: rad_mult={:.3} rayleigh={:.3} mie={:.3} \
             sun_int={:.2} sunset={:.3} scale_h={:.3} mie_g={:.3}\n\
             [atmo]   wavelengths=({:.3}, {:.3}, {:.3})\n\
             [atmo]   sunset_tint=({:.3}, {:.3}, {:.3}) glow=({:.3}, {:.3}, {:.3}) \
             horizon=({:.3}, {:.3}, {:.3})",
            tb.name,
            tb.atmo_radius_mult,
            tb.atmo_rayleigh_scale,
            tb.atmo_mie_scale,
            tb.atmo_sun_intensity,
            tb.atmo_sunset_strength,
            tb.atmo_scale_height,
            tb.atmo_mie_g,
            tb.atmo_wavelengths.x,
            tb.atmo_wavelengths.y,
            tb.atmo_wavelengths.z,
            tb.atmo_sunset_tint.x,
            tb.atmo_sunset_tint.y,
            tb.atmo_sunset_tint.z,
            tb.atmo_sunset_glow.x,
            tb.atmo_sunset_glow.y,
            tb.atmo_sunset_glow.z,
            tb.atmo_sunset_horizon.x,
            tb.atmo_sunset_horizon.y,
            tb.atmo_sunset_horizon.z,
        );
    }

    let body = planet::get(BodyId::Tenebris);
    let world = Rc::new(RefCell::new(World::create(
        &body,
        planet::subdivisions_for_radius(body.radius_m),
    )));
    let player = Rc::new(RefCell::new(PlayerCtrl::default()));
    player_ctrl::init(&mut player.borrow_mut(), &body);
    teleport_menu::set_player(Some(player.clone()));
    crafting_screen::set_player(Some(player.clone()));

    /* Worldgen, lighting, meshing and registration are staged across
     * frames by the boot loader (frame() -> loader_frame) so the
     * player watches a progress bar instead of a white window. Only
     * the cheap World allocations happen here; Tenebris registers
     * first when its mesh stage runs (making it the active body), and
     * every moon / asteroid gens + registers after it. */
    let mut moons: Vec<Rc<RefCell<World>>> = Vec::new();
    for id in (BodyId::Luna as i32)..(BODY_COUNT as i32) {
        let Some(b) = planet::get_by_index(id) else { continue };
        if moons.len() < 32 {
            moons.push(Rc::new(RefCell::new(World::create(
                &b,
                planet::subdivisions_for_radius(b.radius_m),
            ))));
        }
    }

    /* Spawn above the surface at (1, 0, 0). Surface altitude sampled
     * directly so we don't depend on any tile being generated yet. */
    player.borrow_mut().position = default_spawn_pos(&body);

    /* Show the main menu after worldgen finishes. SP / MP buttons
     * drive the transition into gameplay. */
    menu::init();
    remote_players::init();
    chat::init();
    /* Dev: jump straight to an egui menu screen for screenshots /
     * iteration (skips the sokol profile picker). */
    if let Ok(v) = std::env::var("TENEBRIS_DEV_MENU") {
        menu::dev_show_menu(&v);
    }

    /* Dev fast-path for headless iteration / screenshots, gated entirely
     * on env vars so normal play never sees any of it:
     *   TENEBRIS_DEV_PAD=1     -> drop a launch pad on the spawn surface
     *   TENEBRIS_DEV_KIT=1     -> stock a rocket-build kit (pad + parts)
     *   TENEBRIS_DEV_SP[=name] -> boot straight into an SP world
     *   TENEBRIS_DEV_ROCKET=1  -> open the rocket-assembly screen
     */
    /* Deferred to a few in-game frames in (see dev_maybe_place); placing
     * at init double-updates a GPU buffer and aborts. SHOWCASE wins if
     * both are set. */
    if std::env::var("TENEBRIS_DEV_FURNACE").is_ok() {
        DEV_PLACE_MODE.with(|c| c.set(5));
        DEV_PLACE_COUNTDOWN.with(|c| c.set(15));
    } else if std::env::var("TENEBRIS_DEV_MINE").is_ok() {
        DEV_PLACE_MODE.with(|c| c.set(4));
        DEV_PLACE_COUNTDOWN.with(|c| c.set(15));
    } else if std::env::var("TENEBRIS_DEV_SHOWCASE").is_ok() {
        DEV_PLACE_MODE.with(|c| c.set(2));
        DEV_PLACE_COUNTDOWN.with(|c| c.set(15));
    } else if std::env::var("TENEBRIS_DEV_PAD").is_ok() {
        DEV_PLACE_MODE.with(|c| c.set(1));
        DEV_PLACE_COUNTDOWN.with(|c| c.set(15));
    } else if std::env::var("TENEBRIS_DEV_TECH").is_ok() {
        DEV_PLACE_MODE.with(|c| c.set(6));
        DEV_PLACE_COUNTDOWN.with(|c| c.set(15));
    } else if std::env::var("TENEBRIS_DEV_CHEST").is_ok() {
        DEV_PLACE_MODE.with(|c| c.set(7));
        DEV_PLACE_COUNTDOWN.with(|c| c.set(15));
    } else if std::env::var("TENEBRIS_DEV_POWER").is_ok() {
        DEV_PLACE_MODE.with(|c| c.set(8));
        DEV_PLACE_COUNTDOWN.with(|c| c.set(15));
    } else if std::env::var("TENEBRIS_DEV_PRINTER").is_ok() {
        DEV_PLACE_MODE.with(|c| c.set(9));
        DEV_PLACE_COUNTDOWN.with(|c| c.set(15));
    } else if std::env::var("TENEBRIS_DEV_WIRES").is_ok() {
        DEV_PLACE_MODE.with(|c| c.set(10));
        DEV_PLACE_COUNTDOWN.with(|c| c.set(15));
    } else if std::env::var("TENEBRIS_DEV_ROCKET").is_ok() {
        DEV_PLACE_MODE.with(|c| c.set(11));
        DEV_PLACE_COUNTDOWN.with(|c| c.set(15));
    } else if std::env::var("TENEBRIS_DEV_ROCKET_WORLD").is_ok() {
        DEV_PLACE_MODE.with(|c| c.set(12));
        DEV_PLACE_COUNTDOWN.with(|c| c.set(15));
    } else if std::env::var("TENEBRIS_DEV_SKY").is_ok() {
        DEV_PLACE_MODE.with(|c| c.set(13));
        DEV_PLACE_COUNTDOWN.with(|c| c.set(15));
    } else if std::env::var("TENEBRIS_DEV_ANIMALS").is_ok() {
        DEV_PLACE_MODE.with(|c| c.set(14));
        DEV_PLACE_COUNTDOWN.with(|c| c.set(15));
    } else if std::env::var("TENEBRIS_DEV_FISH").is_ok() {
        DEV_PLACE_MODE.with(|c| c.set(17));
        DEV_PLACE_COUNTDOWN.with(|c| c.set(15));
    } else if std::env::var("TENEBRIS_DEV_DIVE").is_ok() {
        DEV_PLACE_MODE.with(|c| c.set(21));
        DEV_PLACE_COUNTDOWN.with(|c| c.set(15));
    } else if std::env::var("TENEBRIS_DEV_GRASS").is_ok() {
        DEV_PLACE_MODE.with(|c| c.set(22));
        DEV_PLACE_COUNTDOWN.with(|c| c.set(15));
    } else if std::env::var("TENEBRIS_DEV_ORBIT").is_ok() {
        DEV_PLACE_MODE.with(|c| c.set(23));
        DEV_PLACE_COUNTDOWN.with(|c| c.set(15));
    } else if std::env::var("TENEBRIS_DEV_BONFIRE").is_ok() {
        DEV_PLACE_MODE.with(|c| c.set(18));
        DEV_PLACE_COUNTDOWN.with(|c| c.set(15));
    } else if std::env::var("TENEBRIS_DEV_FARM").is_ok() {
        DEV_PLACE_MODE.with(|c| c.set(19));
        DEV_PLACE_COUNTDOWN.with(|c| c.set(15));
    } else if std::env::var("TENEBRIS_DEV_GROW").is_ok() {
        DEV_PLACE_MODE.with(|c| c.set(20));
        DEV_PLACE_COUNTDOWN.with(|c| c.set(15));
    } else if std::env::var("TENEBRIS_DEV_OCCLUDE").is_ok() {
        DEV_PLACE_MODE.with(|c| c.set(15));
        DEV_PLACE_COUNTDOWN.with(|c| c.set(15));
    } else if std::env::var("TENEBRIS_DEV_TORCH").is_ok() {
        DEV_PLACE_MODE.with(|c| c.set(16));
        DEV_PLACE_COUNTDOWN.with(|c| c.set(15));
    }
    if std::env::var("TENEBRIS_DEV_KIT").is_ok() {
        let mut p = player.borrow_mut();
        inventory::add(&mut p.inventory, Block::LaunchPad);
        p.bag.add(tenebris_core::items::ROCKET_ENGINE, 1);
        p.bag.add(tenebris_core::items::FUEL_TANK, 2);
        p.bag.add(tenebris_core::items::COMMAND_MODULE, 1);
        p.bag.add(tenebris_core::items::IRON_INGOT, 16);
        p.bag.add(tenebris_core::items::BRONZE_INGOT, 8);
    }
    if let Ok(v) = std::env::var("TENEBRIS_DEV_SP") {
        let name = if v.is_empty() { "devworld" } else { v.as_str() };
        /* TENEBRIS_DEV_SPACE=1 boots the world in Space-Exploration mode
         * (prepared launch complex) without going through the egui picker. */
        if std::env::var("TENEBRIS_DEV_SPACE").is_ok() {
            menu::dev_set_space_mode();
        }
        menu::dev_start_sp(name);
    }
    if std::env::var("TENEBRIS_DEV_PAUSE").is_ok() {
        /* Screenshot aid: open the pause overlay at spawn. */
        menu::pause_toggle();
    }
    if std::env::var("TENEBRIS_DEV_INPUTS").is_ok() {
        /* Screenshot aid: open the pause + Inputs (key bindings) overlay. */
        menu::dev_open_inputs();
    }
    if std::env::var("TENEBRIS_DEV_STATION").is_ok() {
        /* Screenshot aid: open the orbital station hub at spawn. */
        station_screen::open(player.clone());
    }
    if std::env::var("TENEBRIS_DEV_CRAFT").is_ok() {
        crafting_screen::open(Some(player.clone()));
    }
    if std::env::var("TENEBRIS_DEV_INV").is_ok() {
        /* Stock the bag so the grid shows real thumbnails and recipes
         * light up, then open the egui inventory overlay. */
        use tenebris_core::items;
        {
            let mut p = player.borrow_mut();
            let blocks = [
                Block::Stone, Block::Dirt, Block::Grass, Block::Sand, Block::Wood,
                Block::CoalOre, Block::CopperOre, Block::TinOre, Block::IronOre,
                Block::Furnace, Block::StorageChest, Block::SteamEngine, Block::Cable,
                Block::LaunchPad,
            ];
            for b in blocks.iter() {
                p.bag.add(items::from_block(*b), 32);
            }
            p.bag.add(items::COPPER_INGOT, 8);
            p.bag.add(items::TIN_INGOT, 8);
            p.bag.add(items::IRON_INGOT, 8);
            p.bag.add(items::COAL, 16);
        }
        inventory_screen::toggle();
    }

    APP.with(|cell| {
        *cell.borrow_mut() = Some(App {
            body,
            world,
            moons,
            player,
            interact: InteractState::default(),
            last_time: stm::now(),
            tick: 0,
            smoothed_fps: 60.0,
            debug_ui_visible: false,
            players_panel_visible: false,
            sp_resume_applied: false,
            inv_primed_for_state: -1,
            sp_saves_applied: [false; SP_SAVES_APPLIED_MAX],
            mp_spawn_applied: false,
            sp_save_accum: 0.0,
            terrain_tag: String::new(),
            /* Nothing loads at boot - the menu needs no terrain. The
             * first world entry (SP pick / MP join) starts the loader. */
            loader: None,
            last_sent_pos: DVec3::default(),
            last_sent_body: 0,
            last_sent_yaw: 0.0,
            last_sent_pitch: 0.0,
            last_sent_valid: false,
            pos_log_accum: 0.0,
            was_mouse_locked: false,
            state_send_ctr: 0,
            water_accum_s: 0.0,
            inv_last_type: [0; 9],
            inv_last_count: [0; 9],
            inv_last_sel: -1,
            inv_init: false,
            bag_last_items: [0; tenebris_core::proto::MSG_BAG_SLOTS],
            bag_last_counts: [0; tenebris_core::proto::MSG_BAG_SLOTS],
            bag_last_hunger_i: -1,
            bag_sync_init: false,
            bent_sync_cd: 0.0,
            last_pause_btn: -1,
            last_inventory_btn: -1,
            last_mobile: -1,
            last_fullscreen_btn: -1,
        });
    });
}

/* --------------------------------------------------------------------- */

/// Port of `world_for_body()`. Find the world backing a given body.
/// `G.world` holds Tenebris's voxel state; every other body's world
/// lives in `G.moons`. None if the body wasn't registered.
fn world_for_body(app: &App, body: Option<&BodyConfig>) -> Option<Rc<RefCell<World>>> {
    let body = body?;
    if app.world.borrow().body.id == body.id {
        return Some(app.world.clone());
    }
    for m in &app.moons {
        if m.borrow().body.id == body.id {
            return Some(m.clone());
        }
    }
    None
}

/* --------------------------------------------------------------------- */
/* HUD / overlay draws                                                     */
/* --------------------------------------------------------------------- */

/// Always-on bottom-right strip: protocol version + active profile
/// name when in MP. Not gated on the F2 debug toggle.
fn draw_version_strip() {
    let line = if menu::state() == GameState::InGameMp {
        /* Priority: active profile name > server-side cached name for
         * our welcome.player_id > 'guest'. */
        let mut nm: Option<String> = None;
        if let Some(active) = profile::get_active() {
            if !active.name.is_empty() {
                nm = Some(active.name.clone());
            }
        }
        if nm.is_none() && net_client::state() == NetClientState::Ready {
            let w = net_client::welcome();
            nm = net_client::name_for_id(w.player_id);
        }
        let nm = match nm {
            Some(s) if !s.is_empty() => s,
            _ => "guest".to_string(),
        };
        format!("{}  v{}", nm, TENEBRIS_PROTOCOL_VERSION)
    } else {
        format!("v{}", TENEBRIS_PROTOCOL_VERSION)
    };
    let n = line.len();
    if n == 0 {
        return;
    }
    /* sdtx scale 1 = 8 px per glyph. Stick the line one row up from
     * the absolute bottom-right corner. */
    let w = sapp::widthf();
    let h = sapp::heightf();
    if w < 64.0 || h < 16.0 {
        return;
    }
    sdtx::canvas(w, h);
    sdtx::font(0);
    let text_w = 8.0 * n as f32;
    let origin_x = (w - text_w - 8.0) / 8.0;
    let origin_y = (h - 12.0) / 8.0;
    sdtx::origin(origin_x, origin_y);
    sdtx::color3b(0xa0, 0xc0, 0xff);
    sdtx::home();
    sdtx::puts(&line);
}

/// Frame-time graph: a rolling wall-clock window plus two reference
/// frame budgets drawn as guide lines (60 fps and 30 fps). Dev-HUD
/// reference values, not gameplay tunables.
const FRAME_GRAPH_WINDOW_S: f32 = 10.0;
const FRAME_BUDGET_60_MS: f32 = 1000.0 / 60.0;
const FRAME_BUDGET_30_MS: f32 = 1000.0 / 30.0;

/// Draw the frame-time graph (top-right) when the profiler is toggled
/// on (F3 / P). Each column is one frame, coloured green / yellow / red
/// by the 60 / 30 fps budgets, so a main-thread stall (e.g. the water
/// sim) shows up as a tall red spike. Queues sgl quads + sdtx labels
/// into the frame's single flush.
fn draw_frame_graph() {
    if !profiler::visible() {
        return;
    }
    let w = sapp::widthf();
    let h = sapp::heightf();
    if w < 200.0 || h < 140.0 {
        return;
    }
    /* The shared 2D pipeline is created on the first mobile_ui::draw();
     * bail until it exists rather than drawing with no blending. */
    let pip = mobile_ui::alpha_pipeline();
    if pip.id == 0 {
        return;
    }

    let fg = profiler::frame_graph(FRAME_GRAPH_WINDOW_S);

    let pad = 8.0f32;
    let panel_w = 360.0f32.min(w - 2.0 * pad);
    let panel_h = 120.0f32;
    let x0 = w - panel_w - pad;
    let y0 = pad;
    let plot_x = x0 + 6.0;
    let plot_y = y0 + 20.0;
    let plot_w = panel_w - 12.0;
    let plot_h = panel_h - 28.0;

    /* Auto-scale to the worst spike in the window (10% headroom), but
     * never below the 30 fps line so the guides stay meaningful. */
    let y_max = (fg.max_ms * 1.1).max(FRAME_BUDGET_30_MS * 1.2);
    let ms_to_y = |ms: f32| plot_y + plot_h - (ms / y_max).clamp(0.0, 1.0) * plot_h;

    /* Bind a fresh ortho + the shared alpha pipeline so we don't depend
     * on whatever UI module queued geometry last. */
    sgl::defaults();
    sgl::matrix_mode_projection();
    sgl::load_identity();
    sgl::ortho(0.0, w, h, 0.0, -1.0, 1.0);
    sgl::matrix_mode_modelview();
    sgl::load_identity();
    sgl::load_pipeline(pip);

    /* Panel + plot backdrop. */
    mobile_ui::draw_rect(x0, y0, panel_w, panel_h, 0.04, 0.05, 0.08, 0.80);
    mobile_ui::draw_rect(plot_x, plot_y, plot_w, plot_h, 0.10, 0.11, 0.15, 0.70);

    /* 60 fps (green) + 30 fps (orange) budget guide lines. */
    mobile_ui::draw_rect(plot_x, ms_to_y(FRAME_BUDGET_60_MS), plot_w, 1.0, 0.30, 0.80, 0.40, 0.55);
    mobile_ui::draw_rect(plot_x, ms_to_y(FRAME_BUDGET_30_MS), plot_w, 1.0, 0.95, 0.65, 0.25, 0.55);

    /* One column per frame, coloured by which budget it blew. */
    let n = fg.samples.len();
    if n > 0 {
        let step = plot_w / n as f32;
        let bar_w = step.max(1.0);
        for (i, &ms) in fg.samples.iter().enumerate() {
            let bx = plot_x + i as f32 * step;
            let bh = ((ms / y_max).clamp(0.0, 1.0) * plot_h).max(1.0);
            let by = plot_y + plot_h - bh;
            let (r, g, b) = if ms >= FRAME_BUDGET_30_MS {
                (0.95, 0.30, 0.30)
            } else if ms >= FRAME_BUDGET_60_MS {
                (0.95, 0.80, 0.30)
            } else {
                (0.40, 0.80, 0.45)
            };
            mobile_ui::draw_rect(bx, by, bar_w, bh, r, g, b, 0.95);
        }
    }

    /* Label row: window span, window-averaged ms, peak ms, fps. ASCII
     * only per the in-game text rules. */
    let avg_ms = if n > 0 && fg.span_s > 0.0 { fg.span_s * 1000.0 / n as f32 } else { 0.0 };
    let fps = if fg.span_s > 0.0 { n as f32 / fg.span_s } else { 0.0 };
    sdtx::canvas(w, h);
    sdtx::font(0);
    sdtx::origin((x0 + 6.0) / 8.0, (y0 + 6.0) / 8.0);
    sdtx::home();
    sdtx::color3b(0xc0, 0xd0, 0xff);
    sdtx::puts(&format!(
        "FRAME {:.0}s  avg {:.1}ms  max {:.1}ms  fps {:.0}",
        fg.span_s, avg_ms, fg.max_ms, fps
    ));
    sdtx::color3b(0xff, 0xff, 0xff);
}

fn update_overlay(app: &mut App, dt: f32) {
    app.smoothed_fps = smoothed_fps_next(app.smoothed_fps, dt);

    /* Every readout here is developer scaffolding - hidden unless the
     * player toggled the debug UI on with F2. */
    if !app.debug_ui_visible {
        return;
    }

    sdtx::canvas(sapp::widthf() * 0.5, sapp::heightf() * 0.5);
    sdtx::origin(1.0, 1.0);
    sdtx::color3b(0xff, 0xff, 0xff);
    sdtx::puts(&format!(
        "Tenebris (Goldberg {} tiles, {} moons)\n",
        app.world.borrow().tile_count,
        renderer::moon_count()
    ));
    sdtx::puts(&format!("FPS: {:.1}\n", app.smoothed_fps));
    /* Menu / pause state line for live debugging. */
    sdtx::color3b(0xff, 0xc0, 0x70);
    sdtx::puts(&format!(
        "menu state={} pause={} locked={} overlay={}\n",
        menu::state() as i32,
        menu::pause_active() as i32,
        sapp::mouse_locked() as i32,
        menu::is_overlay() as i32
    ));
    sdtx::color3b(0xff, 0xff, 0xff);

    {
        let ns = net_client::state();
        if ns != NetClientState::Idle {
            let label = match ns {
                NetClientState::Connecting => "connecting",
                NetClientState::Handshake => "handshaking",
                NetClientState::Ready => "online",
                _ => "offline",
            };
            if ns == NetClientState::Ready {
                let w = net_client::welcome();
                sdtx::color3b(0x80, 0xff, 0x80);
                let room = menu::room_code();
                if !room.is_empty() {
                    sdtx::puts(&format!(
                        "net: {} (player-id={}, body={}, +{} remote) room: {}\n",
                        label,
                        w.player_id,
                        w.body_id,
                        remote_players::count(),
                        room
                    ));
                } else {
                    sdtx::puts(&format!(
                        "net: {} (player-id={}, body={}, +{} remote) room: public\n",
                        label,
                        w.player_id,
                        w.body_id,
                        remote_players::count()
                    ));
                }
            } else {
                sdtx::color3b(0xff, 0xc0, 0x40);
                sdtx::puts(&format!("net: {}\n", label));
            }
            sdtx::color3b(0xff, 0xff, 0xff);
        }
    }

    let p = app.player.borrow();
    let pos = player_ctrl::world_pos(&p);
    /* Altitude reads against the body the player is currently anchored
     * to (G.player.body), not the spawn-time root planet. */
    let frame_body = p.body.unwrap_or(app.body);
    let dx = pos.x - frame_body.pos_x;
    let dy = pos.y - frame_body.pos_y;
    let dz = pos.z - frame_body.pos_z;
    let r = (dx * dx + dy * dy + dz * dz).sqrt();
    let alt = r - frame_body.radius_m;
    /* Per-frame gravity readout - same query the player physics uses. */
    let l = config::lod();
    let hud_gq = planet::gravity_at(pos, l.gravity_full_mult, l.gravity_falloff_mult);
    let status = if p.is_in_space {
        "[SPACE FLIGHT]"
    } else if p.transition_timer_s > 0.0 {
        "[ENTERING GRAVITY]"
    } else if p.grounded {
        "[GROUNDED]"
    } else {
        "[AIRBORNE]"
    };
    sdtx::puts(&format!(
        "frame: {}  radius: {:.1} m\n",
        frame_body.name, frame_body.radius_m
    ));
    sdtx::puts(&format!(
        "alt: {:.1} m  grav: {:3.0}%  {}\n",
        alt,
        hud_gq.multiplier * 100.0,
        status
    ));
    sdtx::puts(&format!("pos: ({:.2}, {:.2}, {:.2})\n", pos.x, pos.y, pos.z));
    sdtx::puts(&format!(
        "yaw: {:.2}  pitch: {:.2}  tile: {}\n",
        p.yaw, p.pitch, p.last_tile
    ));
    sdtx::puts(&format!(
        "tris: {}  tiles drawn: {}  remeshed/f: {}\n",
        renderer::triangles_drawn_this_frame(),
        renderer::tiles_drawn_this_frame(),
        renderer::tiles_remeshed_this_frame()
    ));

    if !app.world.borrow().gen_complete() {
        sdtx::color3b(0xf0, 0xc0, 0x50);
        sdtx::puts(&format!(
            "loading world... {}%\n",
            app.world.borrow().gen_progress_pct()
        ));
        sdtx::color3b(0xff, 0xff, 0xff);
    }
    if app.interact.has_target {
        if app.interact.is_torch_target {
            sdtx::puts(&format!(
                "target: torch #{}  dist={:.1}m  [LMB break]\n",
                app.interact.torch_idx, app.interact.distance
            ));
        } else {
            sdtx::puts(&format!(
                "target: tile={} depth={} dist={:.1}m\n",
                app.interact.hit_tile, app.interact.hit_depth, app.interact.distance
            ));
        }
    }

    /* Mode + hotbar. */
    if p.survival_mode {
        sdtx::color3b(0xff, 0x90, 0x70);
    } else {
        sdtx::color3b(0x90, 0xc0, 0xff);
    }
    sdtx::puts(&format!(
        "MODE: {}   [G to toggle]\n",
        if p.space_mode {
            "SPACE EXPLORATION"
        } else if p.survival_mode {
            "SURVIVAL"
        } else {
            "CREATIVE"
        }
    ));
    sdtx::color3b(0xff, 0xff, 0xff);
    drop(p);
    /* Debug terrain visibility - bright cyan when hidden so it's
     * obvious the toggle is on. */
    if !renderer::terrain_visible() {
        sdtx::color3b(0x55, 0xff, 0xff);
        sdtx::puts("TERRAIN HIDDEN  [H or top-right tap]\n");
        sdtx::color3b(0xff, 0xff, 0xff);
    } else {
        sdtx::puts("[H] hide terrain\n");
    }
    if !renderer::water_visible() {
        sdtx::color3b(0x55, 0xff, 0xff);
        sdtx::puts("WATER HIDDEN    [J or top-left tap]\n");
        sdtx::color3b(0xff, 0xff, 0xff);
    } else {
        sdtx::puts("[J] hide water\n");
    }
    if !renderer::skybox_visible() {
        sdtx::color3b(0x55, 0xff, 0xff);
        sdtx::puts("SKY/ATMO HIDDEN [K or top-mid tap]\n");
        sdtx::color3b(0xff, 0xff, 0xff);
    } else {
        sdtx::puts("[K] hide sky/atmo\n");
    }
    sdtx::puts("[T] teleport menu   [F3 / P] profiler   [F1] players\n");
}

/* Tiny static-pipeline helper shared by the three sgl panel draws
 * below (each C function carried its own `static sgl_pipeline`; the
 * descs are identical, so behaviour is unchanged). */
fn ui_alpha_pipeline(slot: &'static std::thread::LocalKey<std::cell::Cell<sgl::Pipeline>>) -> sgl::Pipeline {
    if slot.with(|c| c.get()).id == 0 {
        let mut desc = sg::PipelineDesc::new();
        desc.colors[0].blend.enabled = true;
        desc.colors[0].blend.src_factor_rgb = sg::BlendFactor::SrcAlpha;
        desc.colors[0].blend.dst_factor_rgb = sg::BlendFactor::OneMinusSrcAlpha;
        desc.colors[0].blend.src_factor_alpha = sg::BlendFactor::One;
        desc.colors[0].blend.dst_factor_alpha = sg::BlendFactor::One;
        slot.with(|c| c.set(sgl::make_pipeline(&desc)));
    }
    slot.with(|c| c.get())
}

thread_local! {
    static PIP_MINING: std::cell::Cell<sgl::Pipeline> = const { std::cell::Cell::new(sgl::Pipeline { id: 0 }) };
    static PIP_PLAYERS: std::cell::Cell<sgl::Pipeline> = const { std::cell::Cell::new(sgl::Pipeline { id: 0 }) };
    static PIP_DESYNC: std::cell::Cell<sgl::Pipeline> = const { std::cell::Cell::new(sgl::Pipeline { id: 0 }) };
}

/// Centred mining progress bar drawn via sokol_gl. Visible only while
/// a survival mine is in progress; positioned just above the hotbar.
fn draw_mining_bar(app: &App, screen_w: f32, screen_h: f32) {
    /* Progress for whatever is being broken this frame: a plant (any mode,
     * ~1 s) takes precedence, else a block being mined in survival. */
    let pct = if app.interact.is_crop_target && app.interact.crop_break_s > 0.0 {
        (app.interact.crop_break_s / crops::CROP_BREAK_S).clamp(0.0, 1.0)
    } else if app.player.borrow().survival_mode
        && app.interact.mining_progress_s > 0.0
        && app.interact.mining_tile >= 0
        && app.interact.mining_depth >= 0
    {
        /* Normalised to the REAL break time of the block being mined (tool-
         * dependent, 2.5s..10s): the bar hits 100% exactly when it breaks. */
        let p = app.player.borrow();
        let block = app.world.borrow().get(app.interact.mining_tile, app.interact.mining_depth);
        let break_s = interact::break_seconds_for(&p, block).max(1e-4);
        (app.interact.mining_progress_s / break_s).clamp(0.0, 1.0)
    } else {
        return;
    };

    let bar_w = 280.0f32;
    let bar_h = 14.0f32;
    let pad = 3.0f32;
    let bx = screen_w * 0.5 - bar_w * 0.5;
    /* Sit ~96 px above the bottom edge, just above the hotbar. */
    let by = screen_h - 96.0;
    let fill_w = bar_w * pct;

    sgl::defaults();
    sgl::matrix_mode_projection();
    sgl::load_identity();
    sgl::ortho(0.0, screen_w, screen_h, 0.0, -1.0, 1.0);
    sgl::matrix_mode_modelview();
    sgl::load_identity();
    sgl::load_pipeline(ui_alpha_pipeline(&PIP_MINING));

    /* Track (dark backdrop with halo). */
    sgl::begin_quads();
    sgl::c4f(0.04, 0.06, 0.10, 0.85);
    sgl::v2f(bx - pad, by - pad);
    sgl::v2f(bx + bar_w + pad, by - pad);
    sgl::v2f(bx + bar_w + pad, by + bar_h + pad);
    sgl::v2f(bx - pad, by + bar_h + pad);
    sgl::end();

    /* Fill - warm orange. */
    sgl::begin_quads();
    sgl::c4f(0.95, 0.62, 0.22, 1.0);
    sgl::v2f(bx, by);
    sgl::v2f(bx + fill_w, by);
    sgl::v2f(bx + fill_w, by + bar_h);
    sgl::v2f(bx, by + bar_h);
    sgl::end();

    /* Light border around the bar interior. */
    let t = 1.0f32;
    sgl::begin_quads();
    sgl::c4f(0.85, 0.90, 1.0, 0.95);
    sgl::v2f(bx, by);
    sgl::v2f(bx + bar_w, by);
    sgl::v2f(bx + bar_w, by + t);
    sgl::v2f(bx, by + t);
    sgl::v2f(bx, by + bar_h - t);
    sgl::v2f(bx + bar_w, by + bar_h - t);
    sgl::v2f(bx + bar_w, by + bar_h);
    sgl::v2f(bx, by + bar_h);
    sgl::v2f(bx, by);
    sgl::v2f(bx + t, by);
    sgl::v2f(bx + t, by + bar_h);
    sgl::v2f(bx, by + bar_h);
    sgl::v2f(bx + bar_w - t, by);
    sgl::v2f(bx + bar_w, by);
    sgl::v2f(bx + bar_w, by + bar_h);
    sgl::v2f(bx + bar_w - t, by + bar_h);
    sgl::end();
    /* No sgl_draw - centralised flush at end of frame. */

    /* Percentage label centred just above the bar. */
    let buf = format!("MINING {}%", (pct * 100.0) as i32);
    let n = buf.len();
    let scale = 1.0f32;
    let cell = 8.0 * scale;
    let text_w = cell * n as f32;
    let tx = screen_w * 0.5 - text_w * 0.5;
    let ty = by - cell - 4.0;
    sdtx::canvas(screen_w / scale, screen_h / scale);
    sdtx::font(1);
    sdtx::origin(tx / cell, ty / cell);
    sdtx::color3b(0xff, 0xd0, 0x70);
    sdtx::home();
    sdtx::puts(&buf);
    sdtx::font(0);
    sdtx::color3b(0xff, 0xff, 0xff);
    /* sdtx flush is centralised at frame end. */
}

/// Survival hunger meter, top-left. Fill runs green (full) -> red
/// (empty); an eat hint shows while it's low.
fn draw_hunger_bar(app: &App, screen_w: f32, screen_h: f32) {
    let (survival, pct) = {
        let p = app.player.borrow();
        (p.survival_mode, (p.hunger / player_ctrl::MAX_HUNGER).clamp(0.0, 1.0))
    };
    if !survival {
        return;
    }

    let bar_w = 180.0f32;
    let bar_h = 14.0f32;
    let pad = 3.0f32;
    let bx = 18.0f32;
    let by = 18.0f32;
    let fill_w = bar_w * pct;

    sgl::defaults();
    sgl::matrix_mode_projection();
    sgl::load_identity();
    sgl::ortho(0.0, screen_w, screen_h, 0.0, -1.0, 1.0);
    sgl::matrix_mode_modelview();
    sgl::load_identity();
    sgl::load_pipeline(ui_alpha_pipeline(&PIP_MINING));

    let quad = |x0: f32, y0: f32, x1: f32, y1: f32| {
        sgl::v2f(x0, y0);
        sgl::v2f(x1, y0);
        sgl::v2f(x1, y1);
        sgl::v2f(x0, y1);
    };

    /* Track. */
    sgl::begin_quads();
    sgl::c4f(0.04, 0.06, 0.10, 0.85);
    quad(bx - pad, by - pad, bx + bar_w + pad, by + bar_h + pad);
    sgl::end();

    /* Fill - lerp green (full) to red (empty). */
    let fr = 0.90 - 0.50 * pct;
    let fg = 0.20 + 0.60 * pct;
    sgl::begin_quads();
    sgl::c4f(fr, fg, 0.20, 1.0);
    quad(bx, by, bx + fill_w, by + bar_h);
    sgl::end();

    /* Label + eat hint (the key label tracks the Eat binding). */
    let eat_key = crate::controls::action_label(crate::controls::Action::Eat);
    let buf = if pct <= 0.0 {
        format!("STARVING - eat! [{}]", eat_key)
    } else if pct < 0.3 {
        format!("HUNGER {}%  [{}] eat", (pct * 100.0) as i32, eat_key)
    } else {
        format!("HUNGER {}%", (pct * 100.0) as i32)
    };
    let cell = 8.0f32;
    sdtx::canvas(screen_w, screen_h);
    sdtx::font(1);
    sdtx::origin(bx / cell, (by + bar_h + 4.0) / cell);
    if pct < 0.3 {
        sdtx::color3b(0xff, 0x80, 0x60);
    } else {
        sdtx::color3b(0xd0, 0xe0, 0xd0);
    }
    sdtx::home();
    sdtx::puts(&buf);
    sdtx::font(0);
    sdtx::color3b(0xff, 0xff, 0xff);
}

/// Per-frame MP-parity sync with the server: apply the bag/hunger
/// replay + kill-credit meat, mirror the server's crop lists + herds
/// for the active body, upload local bag changes (event-driven), and
/// diff-sync block-entity records a few times a second.
fn mp_parity_sync(app: &mut App, phys_world: &Rc<RefCell<World>>, dt: f32) {
    use tenebris_core::proto::MSG_BAG_SLOTS;
    let body_id = phys_world.borrow().body.id as u32;

    /* Server bag replay (rejoin): overwrite the local bag + hunger. */
    if let Some((items, counts, hunger)) = net_client::take_pending_bag() {
        let mut p = app.player.borrow_mut();
        for i in 0..MSG_BAG_SLOTS.min(p.bag.slots.len()) {
            /* Fresh: MSG_BAG_STATE carries 4 bytes per slot (item + count),
             * so a replayed tool arrives with no durability and reads as
             * undamaged. KNOWN GAP - an MP relog repairs your tools. Closing
             * it means widening the slot to 6 bytes and bumping
             * MSG_BAG_STATE_VERSION, which needs the Fly server redeployed
             * in lockstep, so it's deliberately not done here. SP persists
             * durability properly (bag.rs serialize/parse). */
            p.bag.slots[i] = tenebris_core::items::ItemStack::new(items[i], counts[i]);
        }
        p.hunger = hunger.clamp(0.0, player_ctrl::MAX_HUNGER);
        /* Prime the change detector so the replay isn't echoed back. */
        app.bag_last_items = items;
        app.bag_last_counts = counts;
        app.bag_last_hunger_i = p.hunger as i32;
        app.bag_sync_init = true;
    }

    /* Kill credit: the server confirmed our killing blow. */
    let meat = net_client::take_meat_award();
    if meat > 0 {
        app.player.borrow_mut().bag.add(tenebris_core::items::RAW_MEAT, meat);
    }

    /* Upload the bag when a slot changes or hunger crosses a whole
     * point (~1 Hz while draining; instant on eat / pickup). */
    {
        let p = app.player.borrow();
        let mut items = [0u16; MSG_BAG_SLOTS];
        let mut counts = [0u16; MSG_BAG_SLOTS];
        for i in 0..MSG_BAG_SLOTS.min(p.bag.slots.len()) {
            items[i] = p.bag.slots[i].item;
            counts[i] = p.bag.slots[i].count;
        }
        let hunger_i = p.hunger as i32;
        if !app.bag_sync_init
            || items != app.bag_last_items
            || counts != app.bag_last_counts
            || hunger_i != app.bag_last_hunger_i
        {
            net_client::send_bag_state(&items, &counts, p.hunger);
            app.bag_last_items = items;
            app.bag_last_counts = counts;
            app.bag_last_hunger_i = hunger_i;
            app.bag_sync_init = true;
        }
    }

    /* Server crops / herds for the active body (join replays, other
     * players' actions, kills). */
    if let Some(list) = net_client::take_crops_if_dirty(body_id) {
        crops::restore(list);
    }
    if let Some(list) = net_client::take_animals_if_dirty(body_id) {
        let c = {
            let w = phys_world.borrow();
            dvec3_make(w.body.pos_x, w.body.pos_y, w.body.pos_z)
        };
        animals::apply_remote(c, &list);
    }

    /* Block-entity diff sync at ~4 Hz: pushes local machine-UI ops +
     * placement inits; the shadow (fed by incoming diffs too) keeps
     * server updates from echoing back. */
    app.bent_sync_cd -= dt;
    if app.bent_sync_cd <= 0.0 {
        app.bent_sync_cd = 0.25;
        net_client::sync_block_entities(body_id, &phys_world.borrow());
    }
}

/// The tool the viewmodel should show: the block target's ideal tool when
/// the player owns it (mirrors interact's held-tool pick, so the render
/// matches the speed bonus actually applied), else the best tool owned.
fn held_tool_for_display(app: &App, _w: &World) -> Option<tenebris_core::items::ItemId> {
    use tenebris_core::mining::{self, ToolKind};
    /* EQUIP rule: the viewmodel shows exactly what's in the SELECTED
     * hotbar slot, and only if it's a tool - matching the mining logic
     * (interact::best_tool_for). */
    let p = app.player.borrow();
    inventory::selected_item(&p.inventory)
        .filter(|&id| mining::tool_kind(id) != ToolKind::None || id == tenebris_core::items::HOE)
}

/// Which crop kind a plant press would sow, or `None` without seeds.
/// The SELECTED hotbar item wins when it's a seed (deliberate choice of
/// what to plant); otherwise the bag is scanned berry -> wheat -> carrot
/// so bare "T on farmland" still plants something sensible.
fn plantable_seed_kind(p: &crate::player_ctrl::PlayerCtrl) -> Option<tenebris_core::farming::CropKind> {
    use tenebris_core::farming::{kind_for_seed, CropKind};
    if let Some(sel) = inventory::selected_item(&p.inventory) {
        if let Some(k) = kind_for_seed(sel) {
            return Some(k);
        }
    }
    for k in [CropKind::Berry, CropKind::Wheat, CropKind::Carrot] {
        if p.bag.count_of(tenebris_core::farming::seed_item(k)) > 0 {
            return Some(k);
        }
    }
    None
}

/// Convert the selected hotbar item in place (`from` -> `to`), one unit.
/// Used by the bucket fill / pour swap (both are stack-1 tools, so this
/// just re-skins the slot). No-op if the selected slot doesn't hold `from`.
fn swap_selected_item(
    p: &mut crate::player_ctrl::PlayerCtrl,
    from: tenebris_core::items::ItemId,
    to: tenebris_core::items::ItemId,
) {
    let sel = p.inventory.selected as usize;
    if sel >= p.inventory.slots.len() {
        return;
    }
    let s = &mut p.inventory.slots[sel];
    if s.item == from && s.count > 0 {
        s.item = to;
    }
}

/// Farming ground hint: with a hoe on hand, dirt/grass under the reticle
/// prompts "[T] till soil"; tilled farmland with seeds prompts
/// "[T] plant seed". Makes the till-before-plant flow discoverable (it's
/// not obvious you must work the ground first). Yields to the crop hint.
/// Friendly name for a machine block the player can open with Interact, or
/// `None` if the block is not an openable machine. Single source of truth for
/// both the aim prompt ([`draw_machine_hint`]) and the E-open dispatch - keep
/// this list in sync with the `match targeted` machine arms in `event_inner`.
/// ASCII only + no underscores (CLAUDE.md in-game-text rule).
fn machine_label(b: Block) -> Option<&'static str> {
    Some(match b {
        Block::LaunchPad => "rocket",
        Block::Furnace => "furnace",
        Block::Bonfire => "bonfire",
        Block::ElectronicsWorkbench => "workbench",
        Block::StorageChest => "chest",
        Block::SteamEngine => "steam engine",
        Block::ElectricFurnace => "electric furnace",
        Block::HydroGenerator => "generator",
        Block::Computer => "computer",
        Block::Printer3D => "3d printer",
        _ => return None,
    })
}

/// Dock prompt: shown while flying in space within dock range of the orbital
/// trading station. The key label tracks the Interact binding.
fn draw_station_hint(app: &App, screen_w: f32, screen_h: f32) {
    let p = app.player.borrow();
    if !p.is_in_space || crate::station_screen::is_open() {
        return;
    }
    let d = crate::station_screen::dock_distance_m(p.position);
    drop(p);
    if d > crate::station_screen::DOCK_RADIUS_M {
        return;
    }
    let key = crate::controls::action_label(crate::controls::Action::Interact);
    let msg = format!("[{}] dock - trading station", key);
    let cell = 8.0f32;
    let x = (screen_w * 0.5 - (msg.len() as f32 * cell) * 0.5) / cell;
    let y = (screen_h * 0.5 + 24.0) / cell;
    sdtx::canvas(screen_w, screen_h);
    sdtx::origin(0.0, 0.0);
    sdtx::font(1);
    sdtx::pos(x, y);
    sdtx::color3b(0x90, 0xd0, 0xf0);
    sdtx::puts(&msg);
    sdtx::font(0);
    sdtx::color3b(0xff, 0xff, 0xff);
}

/// Reticle prompt shown when aiming at an openable machine: `"[E] open chest"`.
/// The key label tracks the Interact binding (controls.yaml), so a remap moves
/// the prompt with it. Drawn from the HUD block, same slot as the other hints.
fn draw_machine_hint(app: &App, screen_w: f32, screen_h: f32) {
    if !app.interact.has_target || app.interact.is_torch_target {
        return;
    }
    let targeted = app
        .world
        .borrow()
        .get(app.interact.hit_tile, app.interact.hit_depth);
    let Some(name) = machine_label(targeted) else {
        return;
    };
    let key = crate::controls::action_label(crate::controls::Action::Interact);
    let msg = format!("[{}] open {}", key, name);
    let cell = 8.0f32;
    let x = (screen_w * 0.5 - (msg.len() as f32 * cell) * 0.5) / cell;
    let y = (screen_h * 0.5 + 24.0) / cell;
    sdtx::canvas(screen_w, screen_h);
    sdtx::font(1);
    sdtx::origin(x, y);
    sdtx::color3b(0x90, 0xd0, 0xf0);
    sdtx::home();
    sdtx::puts(&msg);
    sdtx::font(0);
    sdtx::color3b(0xff, 0xff, 0xff);
}

/// Reticle prompt shown when aiming at a loose scatter object you can gather:
/// `"[E] pick up flint"` over a pebble, `"[E] pick up mossy rock"` over a leafy
/// mound. Asks `interact::pickup_target` - the same question the E handler asks
/// - so the prompt is an exact preview of whether E will fire, never a lie.
/// Machine blocks can't carry scatter, so this never collides with the machine
/// hint's slot.
fn draw_pickup_hint(app: &App, screen_w: f32, screen_h: f32) {
    let Some((_, name)) = ({
        let w = app.world.borrow();
        let p = app.player.borrow();
        crate::interact::pickup_target(&app.interact, &w, &p)
    }) else {
        return;
    };
    let key = crate::controls::action_label(crate::controls::Action::Interact);
    let msg = format!("[{}] pick up {}", key, name);
    let cell = 8.0f32;
    let x = (screen_w * 0.5 - (msg.len() as f32 * cell) * 0.5) / cell;
    let y = (screen_h * 0.5 + 24.0) / cell;
    sdtx::canvas(screen_w, screen_h);
    sdtx::font(1);
    sdtx::origin(x, y);
    sdtx::color3b(0x90, 0xd0, 0xf0);
    sdtx::home();
    sdtx::puts(&msg);
    sdtx::font(0);
    sdtx::color3b(0xff, 0xff, 0xff);
}

/// Credits readout (top-right): the space-era wallet. Only shown in survival /
/// space worlds - creative has no economy.
fn draw_credits_hud(app: &App, screen_w: f32, screen_h: f32) {
    let p = app.player.borrow();
    if !p.survival_mode {
        return;
    }
    let msg = format!("{} cr", p.wallet.credits());
    drop(p);
    let cell = 8.0f32;
    let x = (screen_w - (msg.len() as f32 + 1.5) * cell) / cell;
    sdtx::canvas(screen_w, screen_h);
    /* Reset the origin - earlier HUD draws (hints) leave it shifted, which
     * pushed this readout off-canvas. */
    sdtx::origin(0.0, 0.0);
    sdtx::font(1);
    sdtx::pos(x, 1.0);
    sdtx::color3b(0xf0, 0xd8, 0x60);
    sdtx::puts(&msg);
    sdtx::font(0);
    sdtx::color3b(0xff, 0xff, 0xff);
}

/// Rocket flight HUD (top-centre) shown while the player is riding a rocket:
/// active engine kind, stages left, active-stage fuel %, TWR, and speed, plus
/// the throttle / stage key hints (which track their bindings).
fn draw_rocket_hud(app: &App, screen_w: f32, screen_h: f32) {
    if !crate::rocket_ride::is_riding() {
        return;
    }
    let eng = match crate::rocket_ride::active_engine() {
        Some(tenebris_core::rocket::EngineKind::Atmospheric) => "ATMOSPHERIC",
        Some(tenebris_core::rocket::EngineKind::Vacuum) => "VACUUM",
        None => "-",
    };
    let (fuel, cap) = crate::rocket_ride::active_fuel();
    let pct = if cap > 0.0 { (fuel / cap * 100.0) as i32 } else { 0 };
    let stages = crate::rocket_ride::stage_count();
    let g = tenebris_core::rocket::config().flight.gravity_mps2;
    let twr = crate::rocket_ride::twr(g);
    let speed = tenebris_core::math::dvec3_length(app.player.borrow().velocity);
    let throttle_key = crate::controls::action_label(crate::controls::Action::Jump);
    let stage_key = crate::controls::action_label(crate::controls::Action::Stage);
    let lines = [
        format!("ROCKET  stage {}  {} engine", stages, eng),
        format!("fuel {}%   TWR {:.2}   speed {:.0} m/s", pct, twr, speed),
        format!("[hold {}] throttle   [{}] stage", throttle_key, stage_key),
    ];
    sdtx::canvas(screen_w, screen_h);
    sdtx::font(1);
    let cell = 8.0f32;
    for (i, msg) in lines.iter().enumerate() {
        let x = (screen_w * 0.5 - (msg.len() as f32 * cell) * 0.5) / cell;
        let y = (28.0 + i as f32 * 12.0) / cell;
        sdtx::pos(x, y);
        sdtx::color3b(0xf0, 0xd0, 0x80);
        sdtx::puts(msg);
    }
    sdtx::font(0);
    sdtx::color3b(0xff, 0xff, 0xff);
}

fn draw_farming_hint(app: &App, screen_w: f32, screen_h: f32) {
    /* Fishing owns the reticle line while a line is out (or the rod is
     * selected): cast state / bite alarm / catch flash. */
    if let Some(msg) = fishing::hint() {
        let cell = 8.0f32;
        let x = (screen_w * 0.5 - (msg.len() as f32 * cell) * 0.5) / cell;
        let y = (screen_h * 0.5 + 24.0) / cell;
        sdtx::canvas(screen_w, screen_h);
        sdtx::pos(x, y);
        sdtx::color3f(1.0, 0.95, 0.6);
        sdtx::puts(&msg);
        return;
    }
    if crops::reticle_growth().is_some() {
        return; /* the crop hint owns this line when aiming at a crop */
    }
    if !app.interact.has_target || app.interact.is_torch_target {
        return;
    }
    let ground = app.world.borrow().get(app.interact.hit_tile, app.interact.hit_depth);
    let p = app.player.borrow();
    let msg = if ground == Block::Farmland && plantable_seed_kind(&p).is_some() {
        "[T] plant seed"
    } else if matches!(
        ground,
        Block::Dirt | Block::Grass | Block::JungleGrass | Block::DryGrass
    ) && inventory::selected_item(&p.inventory) == Some(tenebris_core::items::HOE)
    {
        "[T] till soil"
    } else {
        return;
    };
    drop(p);

    let cell = 8.0f32;
    let x = (screen_w * 0.5 - (msg.len() as f32 * cell) * 0.5) / cell;
    let y = (screen_h * 0.5 + 24.0) / cell;
    sdtx::canvas(screen_w, screen_h);
    sdtx::font(1);
    sdtx::origin(x, y);
    sdtx::color3b(0x90, 0xe0, 0x80);
    sdtx::home();
    sdtx::puts(msg);
    sdtx::font(0);
    sdtx::color3b(0xff, 0xff, 0xff);
}

/// Survival tool-gate hint: when the player holds the mine button on a
/// block their current tool can't harvest (rock/ore without a pickaxe),
/// the block never breaks - which reads as "broken" without a cue. Show
/// a short prompt under the reticle so the pickaxe requirement is legible.
fn draw_tool_gate_hint(app: &App, screen_w: f32, screen_h: f32) {
    if !app.player.borrow().survival_mode {
        return;
    }
    if !app.interact.has_target || app.interact.is_torch_target {
        return;
    }
    if !input::state().left_held {
        return;
    }
    let block = app.world.borrow().get(app.interact.hit_tile, app.interact.hit_depth);
    if tenebris_core::blocks::is_unbreakable(block) {
        return;
    }
    let tier = {
        let p = app.player.borrow();
        tenebris_core::mining::tool_tier(interact::best_tool_for(&p, block))
    };
    if tenebris_core::mining::required_tier(block) <= tier {
        return; /* harvestable - the crack decal + mining bar show progress */
    }

    let msg = "Need a pickaxe to mine this";
    let cell = 8.0f32;
    let x = (screen_w * 0.5 - (msg.len() as f32 * cell) * 0.5) / cell;
    let y = (screen_h * 0.5 + 24.0) / cell;
    sdtx::canvas(screen_w, screen_h);
    sdtx::font(1);
    sdtx::origin(x, y);
    sdtx::color3b(0xf0, 0x90, 0x60);
    sdtx::home();
    sdtx::puts(msg);
    sdtx::font(0);
    sdtx::color3b(0xff, 0xff, 0xff);
}

/// F1 players panel - overlay listing every connected player (local +
/// remote) with their lat/long on the body they're standing on.
fn draw_players_panel(app: &App, screen_w: f32, screen_h: f32) {
    if !app.players_panel_visible {
        return;
    }

    /* Count entries upfront so we can size the panel. */
    let local_count = if net_client::state() == NetClientState::Ready { 1 } else { 0 };
    let remote_n = remote_players::count();
    let mut total = local_count + remote_n;
    if total < 1 {
        total = 1; /* show 'no peers' line at minimum */
    }

    let row_h = 14.0f32;
    let pad = 10.0f32;
    let title_h = 22.0f32;
    let w = 460.0f32; /* widened for the name column */
    let h = title_h + total as f32 * row_h + pad;
    let x = screen_w - w - 16.0;
    let y = 16.0f32;

    /* Backdrop. */
    sgl::defaults();
    sgl::matrix_mode_projection();
    sgl::load_identity();
    sgl::ortho(0.0, screen_w, screen_h, 0.0, -1.0, 1.0);
    sgl::matrix_mode_modelview();
    sgl::load_identity();
    sgl::load_pipeline(ui_alpha_pipeline(&PIP_PLAYERS));

    sgl::begin_quads();
    sgl::c4f(0.05, 0.06, 0.10, 0.88);
    sgl::v2f(x, y);
    sgl::v2f(x + w, y);
    sgl::v2f(x + w, y + h);
    sgl::v2f(x, y + h);
    sgl::end();

    let t = 1.5f32;
    sgl::begin_quads();
    sgl::c4f(0.55, 0.65, 0.85, 0.85);
    sgl::v2f(x, y);         sgl::v2f(x + w, y);     sgl::v2f(x + w, y + t);     sgl::v2f(x, y + t);
    sgl::v2f(x, y + h - t); sgl::v2f(x + w, y + h - t); sgl::v2f(x + w, y + h); sgl::v2f(x, y + h);
    sgl::v2f(x, y);         sgl::v2f(x + t, y);     sgl::v2f(x + t, y + h);     sgl::v2f(x, y + h);
    sgl::v2f(x + w - t, y); sgl::v2f(x + w, y);     sgl::v2f(x + w, y + h);     sgl::v2f(x + w - t, y + h);
    sgl::end();

    /* Title + rows via sdtx. Single scale (=1) for everything. */
    {
        sdtx::canvas(screen_w, screen_h);
        sdtx::font(1);
        sdtx::origin((x + 12.0) / 8.0, (y + 8.0) / 8.0);
        sdtx::color3b(0xff, 0xff, 0xff);
        sdtx::home();
        sdtx::puts("PLAYERS [F1]");
        sdtx::font(0);
    }
    let mut row_y = y + title_h;

    if local_count > 0 {
        let wcm = net_client::welcome();
        let body = planet::get_by_index(wcm.body_id as i32).unwrap_or(app.body);
        let (lat, lon, alt) = player_lat_lon_deg(app.player.borrow().position, &body);
        /* Prefer the active profile name for the local row. */
        let mut nm: Option<String> = None;
        if let Some(active) = profile::get_active() {
            if !active.name.is_empty() {
                nm = Some(active.name.clone());
            }
        }
        if nm.is_none() {
            nm = net_client::name_for_id(wcm.player_id);
        }
        let nm = match nm {
            Some(s) if !s.is_empty() => s,
            _ => format!("id-{}", wcm.player_id),
        };
        let mut nmbuf = format!("{:<16}", nm);
        nmbuf.truncate(16);
        let buf = format!(
            "* {}  {}  lat={:+7.2}  lon={:+7.2}  alt={:5.0}m",
            nmbuf, body.name, lat, lon, alt
        );
        sdtx::canvas(screen_w, screen_h);
        sdtx::font(1);
        sdtx::origin((x + 12.0) / 8.0, row_y / 8.0);
        sdtx::color3b(0x80, 0xff, 0xa0);
        sdtx::home();
        sdtx::puts(&buf);
        sdtx::font(0);
        row_y += row_h;
    }

    for i in 0..remote_n {
        let Some(rp) = remote_players::get(i) else { continue };
        let body = planet::get_by_index(rp.body_id as i32).unwrap_or(app.body);
        /* F1 shows the freshest known pose (no interp lag). */
        let (lat, lon, alt) = player_lat_lon_deg(rp.pos_cur, &body);
        let nm = match net_client::name_for_id(rp.player_id) {
            Some(s) if !s.is_empty() => s,
            _ => format!("id-{}", rp.player_id),
        };
        let mut nmbuf = format!("{:<16}", nm);
        nmbuf.truncate(16);
        let buf = format!(
            "  {}  {}  lat={:+7.2}  lon={:+7.2}  alt={:5.0}m",
            nmbuf, body.name, lat, lon, alt
        );
        sdtx::canvas(screen_w, screen_h);
        sdtx::font(1);
        sdtx::origin((x + 12.0) / 8.0, row_y / 8.0);
        sdtx::color3b(0xff, 0xc0, 0x70);
        sdtx::home();
        sdtx::puts(&buf);
        sdtx::font(0);
        row_y += row_h;
    }

    if local_count + remote_n == 0 {
        sdtx::canvas(screen_w, screen_h);
        sdtx::font(1);
        sdtx::origin((x + 12.0) / 8.0, row_y / 8.0);
        sdtx::color3b(0x80, 0x90, 0xa8);
        sdtx::home();
        sdtx::puts("  (offline - single player)");
        sdtx::font(0);
    }
}

/// Server-side desync popup. Centred panel with the reason + block id
/// for 5 s after each notice, then fades.
fn draw_desync_popup(screen_w: f32, screen_h: f32) {
    let (dk, dsec, dblock) = net_client::last_desync();
    if dk == NetDesyncKind::None || dsec < 0.0 || dsec > 5.0 {
        return;
    }

    /* Fade alpha out over the last second of the 5 s window. */
    let fade: f32 = if dsec < 4.0 { 1.0 } else { (5.0 - dsec) as f32 };

    let w = 480.0f32;
    let h = 96.0f32;
    let x = (screen_w - w) * 0.5;
    let y = 64.0f32; /* near top of screen */

    sgl::defaults();
    sgl::matrix_mode_projection();
    sgl::load_identity();
    sgl::ortho(0.0, screen_w, screen_h, 0.0, -1.0, 1.0);
    sgl::matrix_mode_modelview();
    sgl::load_identity();
    sgl::load_pipeline(ui_alpha_pipeline(&PIP_DESYNC));

    /* Backdrop. */
    sgl::begin_quads();
    sgl::c4f(0.18, 0.04, 0.04, 0.85 * fade);
    sgl::v2f(x, y);
    sgl::v2f(x + w, y);
    sgl::v2f(x + w, y + h);
    sgl::v2f(x, y + h);
    sgl::end();

    /* Red border, 2 px. */
    let t = 2.0f32;
    sgl::begin_quads();
    sgl::c4f(1.0, 0.40, 0.40, fade);
    sgl::v2f(x, y);         sgl::v2f(x + w, y);         sgl::v2f(x + w, y + t);     sgl::v2f(x, y + t);
    sgl::v2f(x, y + h - t); sgl::v2f(x + w, y + h - t); sgl::v2f(x + w, y + h);     sgl::v2f(x, y + h);
    sgl::v2f(x, y);         sgl::v2f(x + t, y);         sgl::v2f(x + t, y + h);     sgl::v2f(x, y + h);
    sgl::v2f(x + w - t, y); sgl::v2f(x + w, y);         sgl::v2f(x + w, y + h);     sgl::v2f(x + w - t, y + h);
    sgl::end();

    /* Labels via sdtx, scaled-canvas trick (same as menu). */
    {
        let title_scale = 3.0f32;
        let title_cell = 8.0 * title_scale;
        let title = "DESYNC";
        let tw = title_cell * title.len() as f32;
        let tx = x + (w - tw) * 0.5;
        let ty = y + 14.0;
        sdtx::canvas(screen_w / title_scale, screen_h / title_scale);
        sdtx::origin(tx / title_cell, ty / title_cell);
        sdtx::color3b(0xff, 0x80, 0x80);
        sdtx::home();
        sdtx::puts(title);
    }
    {
        let body_scale = 1.5f32;
        let body_cell = 8.0 * body_scale;
        let buf = format!("server says you're inside block {}  ({:.1}s ago)", dblock, dsec);
        let tw = body_cell * buf.len() as f32;
        let tx = x + (w - tw) * 0.5;
        let ty = y + 60.0;
        sdtx::canvas(screen_w / body_scale, screen_h / body_scale);
        sdtx::origin(tx / body_cell, ty / body_cell);
        sdtx::color3b(0xff, 0xc0, 0xc0);
        sdtx::home();
        sdtx::puts(&buf);
    }
    /* Restore the default-scale canvas. */
    sdtx::canvas(screen_w, screen_h);
}

/* --------------------------------------------------------------------- */
/* SP resume / saves replay / MP spawn                                     */
/* --------------------------------------------------------------------- */

/// Restore every saved tile column + torch list for an SP world.
/// Read side of the per-edit persistence contract.
fn apply_sp_world_saves(w_rc: &Rc<RefCell<World>>) {
    let world_name = menu::active_world();
    if world_name.is_empty() {
        return;
    }
    let body_id = w_rc.borrow().body.id as u32;

    /* Tile columns: enumerate every saved entry, apply per-voxel via
     * world.set so dirty marking + light invalidation behave exactly
     * as a live edit would. */
    let tiles = persistence::list_saved_tiles(&world_name, body_id);
    let mut tiles_applied = 0;
    let mut voxels_applied = 0;
    {
        let mut w = w_rc.borrow_mut();
        for &tile in &tiles {
            if tile < 0 || tile >= w.tile_count {
                continue;
            }
            let Some(column) = persistence::load_tile(&world_name, body_id, tile) else {
                continue;
            };
            for d in 0..COLUMN_BYTES.min(WORLD_MAX_DEPTH as usize) {
                let b = column[d];
                if b != w.blocks[tile as usize * WORLD_MAX_DEPTH as usize + d] {
                    w.set(tile, d as i32, Block::from_raw(b).unwrap_or(Block::Air));
                    voxels_applied += 1;
                }
            }
            tiles_applied += 1;
        }
    }
    if tiles_applied > 0 {
        println!(
            "[sp-saves] body={}: {} tile(s) restored, {} voxel(s) overwrote procgen",
            body_id, tiles_applied, voxels_applied
        );
    }

    /* Per-voxel water-flow state columns. load_state_column writes
     * directly into the byte buffer without re-queueing a flow tick -
     * the saved state is already converged. */
    let water_tiles = persistence::list_saved_water_tiles(&world_name, body_id);
    let mut water_tiles_applied = 0;
    {
        let mut w = w_rc.borrow_mut();
        for &tile in &water_tiles {
            if tile < 0 || tile >= w.tile_count {
                continue;
            }
            let Some(column) = persistence::load_water_state(&world_name, body_id, tile) else {
                continue;
            };
            world_water::load_state_column(&mut w, tile, &column);
            water_tiles_applied += 1;
        }
    }
    if water_tiles_applied > 0 {
        println!(
            "[sp-saves] body={}: {} water-state column(s) restored",
            body_id, water_tiles_applied
        );
    }

    /* Torch list: load + replay through torch::place, then dirty every
     * mesh tile in light range so the loaded torch bakes into the
     * per-vertex torch light (caves stayed dark after reload without
     * this). */
    let torches = persistence::load_torches(&world_name, body_id);
    let mut placed = 0;
    for t in &torches {
        let pos = Vec3 { x: t.pos[0], y: t.pos[1], z: t.pos[2] };
        let up = Vec3 { x: t.up[0], y: t.up[1], z: t.up[2] };
        if torch::place(pos, up, t.tile_idx) {
            w_rc.borrow_mut().dirty_in_range(pos, torch::LIGHT_RANGE_M);
            placed += 1;
        }
    }
    if placed > 0 {
        println!("[sp-saves] body={}: {} torch(es) restored", body_id, placed);
    }

    /* Refresh the renderer's remote glow lists from EVERY body's saved
     * torches so lit bases on other worlds show as warm dots across
     * space. Idempotent + cheap (a handful of localStorage reads); the
     * active body is skipped at draw time in favour of its live list. */
    for id in 0..tenebris_core::planet::BODY_COUNT as u32 {
        let saved = persistence::load_torches(&world_name, id);
        let flames: Vec<tenebris_core::math::Vec3> = saved
            .iter()
            .map(|t| tenebris_core::math::Vec3 {
                x: t.pos[0] + t.up[0] * torch::FLAME_HEIGHT_M,
                y: t.pos[1] + t.up[1] * torch::FLAME_HEIGHT_M,
                z: t.pos[2] + t.up[2] * torch::FLAME_HEIGHT_M,
            })
            .collect();
        renderer::set_remote_lights(id, flames);
    }

    /* Crop list: reload every planted crop with its saved growth so the
     * player's farm survives a reload (same per-body snapshot shape as
     * torches). */
    let saved_crops = persistence::load_crops(&world_name, body_id);
    if !saved_crops.is_empty() {
        let restored: Vec<tenebris_core::farming::Crop> = saved_crops
            .iter()
            .map(|c| {
                tenebris_core::farming::Crop::at(
                    DVec3 { x: c.pos[0] as f64, y: c.pos[1] as f64, z: c.pos[2] as f64 },
                    DVec3 { x: c.up[0] as f64, y: c.up[1] as f64, z: c.up[2] as f64 },
                    c.tile_idx,
                    c.growth,
                    tenebris_core::farming::CropKind::from_u8(c.kind),
                )
            })
            .collect();
        let n = restored.len();
        crops::restore(restored);
        println!("[sp-saves] body={}: {} crop(s) restored", body_id, n);
    }

    /* Per-placed-block state (tech-block facing now; machine state later).
     * The blocks themselves loaded above; this layers their placed state
     * back on so cubes keep their orientation across reload. */
    let bents = persistence::load_block_entities(&world_name, body_id);
    if !bents.is_empty() {
        let mut w = w_rc.borrow_mut();
        let n = bents.len();
        for (tile, depth, e) in bents {
            w.block_entities.set(tile, depth, e);
        }
        println!("[sp-saves] body={}: {} block-entit(ies) restored", body_id, n);
    }
}

fn mark_sp_saves_applied(app: &mut App, w_rc: &Rc<RefCell<World>>) {
    let id = w_rc.borrow().body.id as u32 as usize;
    if id < SP_SAVES_APPLIED_MAX {
        app.sp_saves_applied[id] = true;
    }
}

/// Default spawn: above the surface at (1, 0, 0) on `body`. Surface
/// altitude sampled analytically so no tile needs to be generated.
/// Shared by boot and by new-world SP entry (a fresh seed means fresh
/// surface heights, so a stale pose can't be kept).
fn default_spawn_pos(body: &BodyConfig) -> DVec3 {
    let dir = dvec3_make(1.0, 0.0, 0.0);
    let mut surface_m = planet_gen::surface_altitude(body, dir);
    if surface_m < 0.5 {
        surface_m = 0.5;
    }
    dvec3_add(
        dvec3_make(body.pos_x, body.pos_y, body.pos_z),
        dvec3_scale(dir, body.radius_m + surface_m as f64 + 8.0),
    )
}

/// Start regenerating the spawn planet in place with `seed`: patch the
/// global body table, swap in a fresh (ungenerated) World, drop client
/// state anchored to the old terrain, and hand the heavy work - gen,
/// relight, remesh - to the staged loader, which presents a progress
/// bar while it runs. The caller's flow (saves replay, resume pose)
/// re-runs after the loader finishes; frame_inner is skipped while a
/// loader is active, so gameplay never touches the half-built world.
fn start_world_regen(app: &mut App, seed: u64) {
    planet::set_seed(BodyId::Tenebris, seed);
    let body = planet::get(BodyId::Tenebris);
    app.body = body;
    *app.world.borrow_mut() = World::create(&body, planet::subdivisions_for_radius(body.radius_m));
    /* World-scoped client state from the previous terrain. The
     * incoming session's torches / crops replay from persistence when
     * the session entry flow resumes (apply_sp_world_saves); the herd
     * respawns near the player through the normal spawn logic. */
    torch::clear();
    crops::restore(Vec::new());
    drops::init();
    animals::init();
    let id = body.id as usize;
    if id < SP_SAVES_APPLIED_MAX {
        app.sp_saves_applied[id] = false;
    }
    /* The player's cached body copy still carries the old seed. */
    {
        let mut p = app.player.borrow_mut();
        if p.body.map(|b| b.id) == Some(body.id) {
            player_ctrl::set_body(&mut p, &body);
        }
        p.last_tile = -1;
    }
    app.loader = Some(Loader { stage: LoadStage::Gen, light_slices: 0 });
    println!(
        "[main] spawn planet regen started: seed=0x{:016x} ({} tiles)",
        seed,
        app.world.borrow().tile_count
    );
}

/// One-shot apply of a resume pose when SP transitions in.
fn maybe_apply_sp_resume(app: &mut App) {
    /* Reset the latch the moment we leave SP, so re-entry replays the
     * resume side effects (chat clear, save apply, pose teleport). */
    if menu::state() != GameState::InGameSp {
        app.sp_resume_applied = false;
        return;
    }
    if app.sp_resume_applied {
        return;
    }

    /* Wipe any chat history left over from a prior MP session. */
    chat::clear();

    /* Per-world terrain: regenerate the planet when the incoming
     * world's seed differs from the loaded terrain's, or when the
     * loaded terrain carries another session's edits (world A's
     * mining must not appear in world B). Pristine boot terrain with
     * a matching seed is reused as-is. */
    let target_tag = format!("sp:{}", menu::active_world());
    let target_seed = menu::pending_world_seed();
    if app.terrain_tag != target_tag {
        /* New session: let each moon's persisted columns replay again
         * (the lazy loader is once per body per session). Moon terrain
         * itself keeps the compiled seed. */
        app.sp_saves_applied = [false; SP_SAVES_APPLIED_MAX];
    }
    let (seed_matches, generated) = {
        let w = app.world.borrow();
        (w.body.seed == target_seed, w.gen_complete())
    };
    if !seed_matches
        || !generated
        || (app.terrain_tag != target_tag && !app.terrain_tag.is_empty())
    {
        /* Hand the heavy build to the staged loader and bail; the
         * latch stays unset, so this whole entry flow re-runs once the
         * loader finishes (seed matches + generated then, no second
         * pass). `!generated` covers the very first entry - boot no
         * longer loads any terrain, because the menu doesn't need it. */
        start_world_regen(app, target_seed);
        return;
    }
    app.terrain_tag = target_tag;

    /* Apply persisted column + torch data for the SPAWN body only.
     * Other bodies' saves are flushed lazily by apply_sp_saves_lazy
     * the first time each body is detail-meshed. */
    let spawn_world = app.world.clone();
    apply_sp_world_saves(&spawn_world);
    mark_sp_saves_applied(app, &spawn_world);

    let Some(s) = menu::take_sp_resume() else {
        /* Brand-new world (no saved pose): snap to the default spawn.
         * The player's old pose came from different terrain - menu
         * fly-around or another world - and a fresh seed means fresh
         * surface heights. */
        let spawn = default_spawn_pos(&app.body);
        let mut p = app.player.borrow_mut();
        p.position = spawn;
        p.velocity = dvec3_make(0.0, 0.0, 0.0);
        p.basis_ready = false;
        p.last_tile = -1;
        p.transition_timer_s = 0.0;
        player_ctrl::rebuild_basis(&mut p);
        /* Seed the bedrock-fall rescue anchor with the spawn pose so
         * a rescue can't teleport into the previous world's terrain. */
        p.last_good_position = spawn;
        p.last_good_body = Some(app.body.id);
        /* Fresh world: the configured starting credits (economy.yaml). */
        p.wallet = tenebris_core::economy::Wallet::new(
            tenebris_core::economy::config().starting_credits,
        );
        drop(p);
        app.sp_resume_applied = true;
        return;
    };

    let mut p = app.player.borrow_mut();
    p.position = dvec3_make(s.pos_x, s.pos_y, s.pos_z);
    p.velocity = dvec3_make(0.0, 0.0, 0.0);
    p.yaw = s.yaw;
    p.pitch = s.pitch;
    /* Cold-rebuild basis at the resumed position so the anti-snap path
     * doesn't fire a wild rotation right after RESUME. */
    p.basis_ready = false;
    p.last_tile = -1;
    p.transition_timer_s = 0.0;
    player_ctrl::rebuild_basis(&mut p);
    /* roll lives in the save struct for forward-compat; body
     * resolution stays on Tenebris for now (M4's SOI tracker handles
     * re-anchoring on the fly). */
    let _ = s.roll;
    let _ = s.body_id;
    /* Credits wallet rides the pose record (10th field; old saves = 0). */
    p.wallet = tenebris_core::economy::Wallet::new(s.credits);
    drop(p);
    app.sp_resume_applied = true;
}

/// Per-frame lazy save loader: each registered moon whose chunked mesh
/// has been built but whose persisted columns haven't been replayed
/// yet gets its saves flushed now. At most once per body per session.
fn apply_sp_saves_lazy(app: &mut App) {
    if menu::state() != GameState::InGameSp {
        return;
    }
    if !app.sp_resume_applied {
        return;
    }
    for i in 0..app.moons.len() {
        let w = app.moons[i].clone();
        let id = w.borrow().body.id as u32;
        if id as usize >= SP_SAVES_APPLIED_MAX {
            continue;
        }
        if app.sp_saves_applied[id as usize] {
            continue;
        }
        if !renderer::body_meshed(id) {
            continue;
        }
        apply_sp_world_saves(&w);
        app.sp_saves_applied[id as usize] = true;
    }
}

/// Apply the server-side saved pose on the FIRST MP entry only.
fn maybe_apply_mp_spawn(app: &mut App) {
    if menu::state() != GameState::InGameMp {
        app.mp_spawn_applied = false;
        return;
    }
    if app.mp_spawn_applied {
        return;
    }
    if net_client::state() != NetClientState::Ready {
        return;
    }
    let w = net_client::welcome();

    /* MP is server-authoritative on spawn. Whatever the WELCOME packet
     * carries IS the player's starting pose. */
    let mut spawn = dvec3_make(w.spawn_x, w.spawn_y, w.spawn_z);

    /* body_id resolution: IN_SPACE applies the absolute pose without
     * snap; a valid id snaps + binds the body; unknown ids are treated
     * like in-space. */
    let spawn_in_space = w.body_id == BODY_ID_IN_SPACE;
    let spawn_body: Option<BodyConfig> = if spawn_in_space {
        println!("[main] MP spawn: body=IN_SPACE, applying absolute pose without ground-snap");
        None
    } else {
        let b = planet::get_by_index(w.body_id as i32);
        if b.is_none() {
            println!(
                "[main] WARN MP spawn: unknown body_id={}, treating as in-space",
                w.body_id
            );
        }
        b
    };
    if let Some(sb) = &spawn_body {
        let center = dvec3_make(sb.pos_x, sb.pos_y, sb.pos_z);
        let local = dvec3_sub(spawn, center);
        let r = dvec3_length(local);
        if r > 1e-6 {
            let dir = dvec3_scale(local, 1.0 / r);
            let mut surf = planet_gen::surface_altitude(sb, dir);
            if surf < 0.5 {
                surf = 0.5;
            }
            let surface_r = sb.radius_m + surf as f64;
            if let Some(ground_r) = spawn_snap_radius(r, surface_r) {
                spawn = dvec3_add(center, dvec3_scale(dir, ground_r));
                println!(
                    "[main] MP spawn ground-snapped: was alt={:.1}m, snapped to {:.1}m",
                    r - sb.radius_m,
                    ground_r - sb.radius_m
                );
            }
        }
    }
    {
        let mut p = app.player.borrow_mut();
        p.position = spawn;
        p.velocity = dvec3_make(0.0, 0.0, 0.0);
        p.yaw = w.spawn_yaw;
        p.pitch = w.spawn_pitch;
        /* Force a fresh planet basis at the new position; the MP spawn
         * intentionally does NOT arm the roll slerp. */
        p.basis_ready = false;
        p.last_tile = -1;
        p.transition_timer_s = 0.0;
        /* Bind the player to the saved body so the renderer activates
         * the right one on the very next draw. In-space rejoin keeps
         * the boot-default body as the anchor (the engine reads
         * p.body without a None check in several hot paths). */
        if let Some(sb) = &spawn_body {
            if p.body.map(|b| b.id) != Some(sb.id) {
                player_ctrl::set_body(&mut p, sb);
            }
        }
        /* Cold-rebuild the basis from the just-applied position -
         * critical for in-space spawns (space mode never calls
         * sync_basis_to_planet). */
        player_ctrl::rebuild_basis(&mut p);
        /* Seed last_good with the MP spawn pose so the bedrock-fall
         * rescue has a real anchor from frame 0. */
        if let Some(sb) = &spawn_body {
            p.last_good_position = spawn;
            p.last_good_body = Some(sb.id);
        }
    }
    /* Loud diagnostic for the floating-spawn investigation. */
    {
        let sb = planet::get_by_index(w.body_id as i32);
        let (mut r, mut alt) = (0.0, 0.0);
        if let Some(sb) = &sb {
            let dx = spawn.x - sb.pos_x;
            let dy = spawn.y - sb.pos_y;
            let dz = spawn.z - sb.pos_z;
            r = (dx * dx + dy * dy + dz * dz).sqrt();
            alt = r - sb.radius_m;
        }
        println!(
            "[main] MP spawn applied: player-id={} welcome=({:.2}, {:.2}, {:.2}) body={} \
             -> pos=({:.2}, {:.2}, {:.2}) r={:.2} alt={:+.2} yaw={:.2} pitch={:.2}",
            w.player_id,
            w.spawn_x,
            w.spawn_y,
            w.spawn_z,
            w.body_id,
            spawn.x,
            spawn.y,
            spawn.z,
            r,
            alt,
            w.spawn_yaw,
            w.spawn_pitch
        );
    }
    app.mp_spawn_applied = true;
}

/// Port of `maybe_prime_mode_for_state()` - primes inventory /
/// survival defaults on the actual menu transition.
fn maybe_prime_mode_for_state(app: &mut App) {
    let s = menu::state() as i32;
    match mode_prime_action(s, app.inv_primed_for_state) {
        Some(PrimeAction::EnterMp) => {
            /* MP terrain is the compiled-in default seed (interop
             * with the server's worldgen); an SP world may have
             * reseeded the planet, and SP edits must not leak into
             * the MP view. Server-persisted columns re-fetch after
             * WELCOME either way. The staged loader shows a progress
             * bar while the rebuild runs (frame_inner checks
             * app.loader right after this fn). */
            let mp_seed = planet::default_seed(BodyId::Tenebris);
            let (seed_matches, generated) = {
                let w = app.world.borrow();
                (w.body.seed == mp_seed, w.gen_complete())
            };
            if !seed_matches
                || !generated
                || (app.terrain_tag != "mp" && !app.terrain_tag.is_empty())
            {
                start_world_regen(app, mp_seed);
            }
            app.terrain_tag = "mp".to_string();

            /* MP defaults to survival: blocks have quantity. Torches
             * still flow in unlimited via inventory_init_empty. */
            let mut p = app.player.borrow_mut();
            p.survival_mode = true;
            p.hunger = player_ctrl::MAX_HUNGER;
            inventory::init_empty(&mut p.inventory);
            /* In-flight craft + queue are session-scoped. */
            p.crafting = None;
            crafting_screen::clear_queue();
            /* Drop any stale pose pending server WELCOME - MP spawn is
             * fully server-authoritative. */
            p.position = DVec3::default();
            p.velocity = DVec3::default();
            println!(
                "[main] entered MP - survival mode + empty hotbar (torches granted), \
                 pose cleared pending server WELCOME"
            );
        }
        Some(PrimeAction::EnterSp) => {
            /* Mode comes from the world's save when resuming, or the
             * New World picker (default survival); G still toggles
             * in-game. The bag gets the world's persisted contents, or
             * a clean slate - the in-memory bag must never leak between
             * worlds ("new world, why is my inventory not cleared?"). */
            let space = menu::pending_space();
            let survival = menu::pending_survival() || space;
            let world = menu::active_world();
            let mut p = app.player.borrow_mut();
            p.survival_mode = survival;
            p.space_mode = space;
            if survival {
                inventory::init_empty(&mut p.inventory);
            } else {
                inventory::init_creative(&mut p.inventory);
            }
            /* Space Exploration: on a FRESH world, build the prepared launch
             * complex + fueled rocket + starter kit once the terrain is ready
             * and the player has grounded (deferred, like dev placement).
             * Re-entering an existing space world skips this - the complex
             * loaded from persistence. */
            if space && menu::pending_is_new_world() {
                SPACE_BUILD_COUNTDOWN.with(|c| c.set(20));
            }
            match persistence::load_bag(&world) {
                Some((hunger, blob)) => {
                    p.bag = crate::bag::Bag::parse(&blob).unwrap_or_default();
                    p.hunger = hunger.clamp(0.0, player_ctrl::MAX_HUNGER);
                }
                None => {
                    p.bag = crate::bag::Bag::default();
                    p.hunger = player_ctrl::MAX_HUNGER;
                }
            }
            /* Tech-tree discovery persists per world alongside the bag. */
            p.discovered = persistence::load_tech(&world)
                .and_then(|blob| crate::tech_tree::Discovered::parse(&blob))
                .unwrap_or_default();
            /* In-flight craft + queue are session-scoped - a craft from
             * world A must not deliver into world B's bag. */
            p.crafting = None;
            crafting_screen::clear_queue();
        }
        None => {
            if s == app.inv_primed_for_state {
                return;
            }
        }
    }
    app.inv_primed_for_state = s;
}

/* --------------------------------------------------------------------- */
/* Periodic logs / autosave                                                */
/* --------------------------------------------------------------------- */

/// Diagnostic: every 5 s log the player position alongside the most
/// recent pose we sent to the server.
fn periodic_pos_log(app: &mut App, dt: f64) {
    if !accum_fire(&mut app.pos_log_accum, dt, 5.0) {
        return;
    }
    let p = app.player.borrow();
    let anchor = p.body;
    let b = anchor.unwrap_or(app.body);
    let dx = p.position.x - b.pos_x;
    let dy = p.position.y - b.pos_y;
    let dz = p.position.z - b.pos_z;
    let r = (dx * dx + dy * dy + dz * dz).sqrt();
    let alt = r - b.radius_m;
    let mode = match menu::state() {
        GameState::InGameMp => "MP",
        GameState::InGameSp => "SP",
        _ => "menu",
    };
    let lg_body_name = p
        .last_good_body
        .and_then(|id| planet::get_by_index(id as i32))
        .map(|b| b.name.to_string())
        .unwrap_or_else(|| "(none)".to_string());
    println!(
        "[main] pos {} anchor={}{} curr=({:.2}, {:.2}, {:.2}) r={:.2} alt={:+.2} \
         yaw={:.2} pitch={:.2} grounded={} lg=({:.2}, {:.2}, {:.2}) lg-body={}",
        mode,
        anchor.map(|b| b.name).unwrap_or("NONE"),
        if p.is_in_space { " (in-space)" } else { "" },
        p.position.x,
        p.position.y,
        p.position.z,
        r,
        alt,
        p.yaw,
        p.pitch,
        p.grounded as i32,
        p.last_good_position.x,
        p.last_good_position.y,
        p.last_good_position.z,
        lg_body_name
    );
    if app.last_sent_valid {
        let dx = app.last_sent_pos.x - b.pos_x;
        let dy = app.last_sent_pos.y - b.pos_y;
        let dz = app.last_sent_pos.z - b.pos_z;
        let sr = (dx * dx + dy * dy + dz * dz).sqrt();
        let salt = sr - b.radius_m;
        let ddx = p.position.x - app.last_sent_pos.x;
        let ddy = p.position.y - app.last_sent_pos.y;
        let ddz = p.position.z - app.last_sent_pos.z;
        let delta = (ddx * ddx + ddy * ddy + ddz * ddz).sqrt();
        let body_str = if app.last_sent_body == BODY_ID_IN_SPACE {
            "IN-SPACE".to_string()
        } else {
            format!("{}", app.last_sent_body)
        };
        println!(
            "[main] pos {}     sent=({:.2}, {:.2}, {:.2}) r={:.2} alt={:+.2} \
             body={} yaw={:.2} pitch={:.2} delta-from-curr={:.2}m",
            mode,
            app.last_sent_pos.x,
            app.last_sent_pos.y,
            app.last_sent_pos.z,
            sr,
            salt,
            body_str,
            app.last_sent_yaw,
            app.last_sent_pitch,
            delta
        );
    } else {
        println!("[main] pos {}     sent=(none yet)", mode);
    }
}

/// Throttled SP autosave: pose to localStorage / kv every 5 s.
fn maybe_autosave_sp(app: &mut App, dt: f64) {
    if menu::state() != GameState::InGameSp {
        return;
    }
    let world = menu::active_world();
    if world.is_empty() {
        return; /* SP without a world - shouldn't happen */
    }
    if !accum_fire(&mut app.sp_save_accum, dt, 5.0) {
        return;
    }
    let p = app.player.borrow();
    let s = PersistenceSave {
        pos_x: p.position.x,
        pos_y: p.position.y,
        pos_z: p.position.z,
        yaw: p.yaw,
        pitch: p.pitch,
        roll: 0.0,
        body_id: 0,
        /* World mode rides the pose autosave so re-entering the world
         * restores survival/creative instead of silently reverting. */
        survival: p.survival_mode,
        space: p.space_mode,
        credits: p.wallet.credits(),
    };
    persistence::save(&world, &s);
    /* Bag + hunger ride the same cadence (tools/meat must survive a
     * re-entry; pose is cheap to re-derive, the bag is not). */
    persistence::save_bag(&world, p.hunger, &p.bag.serialize());
    /* Tech-tree discovery rides the same autosave cadence. */
    persistence::save_tech(&world, &p.discovered.serialize());
}

/* --------------------------------------------------------------------- */
/* F4 block snapshot (console diagnostic)                                  */
/* --------------------------------------------------------------------- */

fn block_name(b: Block) -> &'static str {
    match b {
        Block::Air => "AIR",
        Block::Water => "WATER",
        Block::Sand => "SAND",
        Block::Dirt => "DIRT",
        Block::Grass => "GRASS",
        Block::Stone => "STONE",
        Block::Ice => "ICE",
        Block::Snow => "SNOW",
        Block::DirtGrass => "DIRT_GRASS",
        Block::DirtSnow => "DIRT_SNOW",
        Block::Torch => "TORCH",
        Block::Moon => "MOON",
        Block::SeqGrass => "SEQ_GRASS",
        Block::SeqDirt => "SEQ_DIRT",
        Block::SeqDirtGrass => "SEQ_DIRT_GRASS",
        Block::SeqSand => "SEQ_SAND",
        Block::SeqSnow => "SEQ_SNOW",
        Block::SeqDirtSnow => "SEQ_DIRT_SNOW",
        Block::CragRock => "CRAG_ROCK",
        Block::FrostIce => "FROST_ICE",
        Block::AsteroidRock => "ASTEROID_ROCK",
        Block::Wood => "WOOD",
        Block::Leaves => "LEAVES",
        Block::Bedrock => "BEDROCK",
        Block::SeqLeaves => "SEQ_LEAVES",
        Block::CoalOre => "COAL_ORE",
        Block::CopperOre => "COPPER_ORE",
        Block::TinOre => "TIN_ORE",
        Block::IronOre => "IRON_ORE",
        Block::LaunchPad => "LAUNCH_PAD",
        Block::Furnace => "FURNACE",
        Block::ElectricFurnace => "ELECTRIC_FURNACE",
        Block::Printer3D => "3D_PRINTER",
        Block::Computer => "COMPUTER",
        Block::ElectronicsWorkbench => "ELECTRONICS_WORKBENCH",
        Block::HydroGenerator => "HYDRO_GENERATOR",
        Block::SteamEngine => "STEAM_ENGINE",
        Block::StorageChest => "STORAGE_CHEST",
        Block::LaunchTower => "LAUNCH_TOWER",
        Block::Cable => "CABLE",
        Block::CopperPipe => "COPPER_PIPE",
        Block::Farmland => "FARMLAND",
        Block::JungleGrass => "JUNGLE_GRASS",
        Block::DryGrass => "DRY_GRASS",
        Block::Bonfire => "BONFIRE",
    }
}

/// One-letter glyph per block for the ASCII column dump (devtools
/// console only - not player-facing text).
fn block_glyph(b: Block) -> char {
    match b {
        Block::Air => 'a',
        Block::Water => 'w',
        Block::Sand | Block::SeqSand => 'S',
        Block::Dirt | Block::SeqDirt => 'd',
        Block::Grass | Block::SeqGrass | Block::JungleGrass | Block::DryGrass => 'g',
        Block::Stone | Block::CragRock | Block::AsteroidRock => '#',
        Block::Ice | Block::FrostIce => 'i',
        Block::Snow | Block::SeqSnow => 's',
        Block::DirtGrass | Block::DirtSnow | Block::SeqDirtGrass | Block::SeqDirtSnow => 'D',
        Block::Farmland => 'f',
        Block::Torch => 'T',
        Block::Moon => 'm',
        Block::Wood => 'W',
        Block::Leaves | Block::SeqLeaves => 'L',
        Block::Bedrock => 'b',
        Block::CoalOre => 'c',
        Block::CopperOre => 'o',
        Block::TinOre => 't',
        Block::IronOre => 'r',
        Block::LaunchPad => 'P',
        Block::Furnace => 'F',
        /* Ported tech blocks share one glyph in the devtools dump. */
        Block::ElectricFurnace
        | Block::Printer3D
        | Block::Computer
        | Block::ElectronicsWorkbench
        | Block::HydroGenerator
        | Block::SteamEngine
        | Block::StorageChest
        | Block::LaunchTower
        | Block::Cable
        | Block::CopperPipe => 'E',
        Block::Bonfire => 'B',
    }
}

/// Glyph for water-simulator state in the snapshot grid: O = ocean /
/// spawner (state==0), $ = source flag, F = falling, 0..7 flow level.
fn water_glyph(w: &World, tile: i32, depth: i32) -> char {
    let s = world_water::get_state(w, tile, depth);
    if s == 0 {
        return 'O';
    }
    if world_water::state_is_source(s) {
        return '$';
    }
    if world_water::state_is_falling(s) {
        return 'F';
    }
    let level = world_water::state_level(s).clamp(0, 9);
    (b'0' + level as u8) as char
}

/// F4-bound: dump the player's tile + 6 hex neighbours, 9 depths each,
/// to stdout. Same diagnostic shape as the Tenebris-JS tool.
fn print_block_snapshot(app: &App) {
    let p = app.player.borrow();
    let w_rc = world_for_body(app, p.body.as_ref()).unwrap_or_else(|| app.world.clone());
    let w = w_rc.borrow();
    let center = dvec3_make(w.body.pos_x, w.body.pos_y, w.body.pos_z);
    let local = dvec3_sub(p.position, center);
    let r_now = dvec3_length(local);
    if r_now < 1e-6 {
        println!("[snapshot] degenerate radial - aborting");
        return;
    }
    let feet_dir = dvec3_scale(local, 1.0 / r_now);
    let own_tile = w.grid.find_tile(feet_dir, p.last_tile);
    let feet_depth = w.radius_to_depth(r_now);
    if own_tile < 0 {
        println!("[snapshot] goldberg_find_tile returned -1");
        return;
    }

    println!(
        "\n[snapshot] body={} feet-tile={} feet-depth={} player-pos=({:.2}, {:.2}, {:.2})",
        w.body.name, own_tile, feet_depth, p.position.x, p.position.y, p.position.z
    );

    let mut tile_ids = [0i32; 7];
    let mut n_ids = 1usize;
    tile_ids[0] = own_tile;
    if let Some(own_t) = w.grid.tile(own_tile) {
        for k in 0..own_t.num_neighbors as usize {
            if n_ids >= 7 {
                break;
            }
            let nb = own_t.edge_neighbours[k];
            if nb >= 0 {
                tile_ids[n_ids] = nb;
                n_ids += 1;
            }
        }
    }

    const RANGE: i32 = 4;
    let d_lo = (feet_depth - RANGE).max(0);
    let d_hi = (feet_depth + RANGE).min(WORLD_MAX_DEPTH - 1);

    for (i, &tid) in tile_ids[..n_ids].iter().enumerate() {
        let Some(t) = w.grid.tile(tid) else { continue };
        let tc = dvec3_scale(t.center, w.body.radius_m);
        let wc = dvec3_add(center, tc);
        let role = if i == 0 { "FEET" } else { "NB  " };
        println!(
            "[snapshot] {} tile={} center-world=({:.2}, {:.2}, {:.2})",
            role, tid, wc.x, wc.y, wc.z
        );
        for d in (d_lo..=d_hi).rev() {
            let b = w.get(tid, d);
            let marker = if d == feet_depth { " <-- feet" } else { "" };
            if b == Block::Water {
                let st = world_water::get_state(&w, tid, d);
                let n_org = world_water::origin_count(&w, tid, d);
                let level = world_water::state_level(st);
                println!(
                    "[snapshot]   d={:3}  block={:<14} (id={:2})  state=0x{:02X} (lvl={}{}{}) origins={}{}",
                    d,
                    block_name(b),
                    b.raw(),
                    st,
                    level,
                    if world_water::state_is_source(st) { " SRC" } else { "" },
                    if world_water::state_is_falling(st) { " FALLING" } else { "" },
                    n_org,
                    marker
                );
            } else {
                println!(
                    "[snapshot]   d={:3}  block={:<14} (id={:2}){}",
                    d,
                    block_name(b),
                    b.raw(),
                    marker
                );
            }
        }
    }

    /* Visual hex layout. */
    let nb_label = b"1234560";
    println!("[snapshot] hex layout (m = feet tile, 1-6 = edge neighbours):");
    println!(
        "[snapshot]     {} {} {}",
        nb_label[0] as char, nb_label[1] as char, nb_label[2] as char
    );
    println!("[snapshot]      [m]");
    println!(
        "[snapshot]     {} {} {}",
        nb_label[3] as char, nb_label[4] as char, nb_label[5] as char
    );
    println!("[snapshot] water: O=ocean/spawner $=source F=falling 0-7=flow-level");
    println!("[snapshot] depth  m  123 456");
    for d in (d_lo..=d_hi).rev() {
        let mb = w.get(own_tile, d);
        let m_glyph = if mb == Block::Water {
            water_glyph(&w, own_tile, d)
        } else {
            block_glyph(mb)
        };
        let mut nb_glyphs = ['.'; 6];
        let max_nb = (n_ids - 1).min(6);
        for k in 0..max_nb {
            let nb = tile_ids[1 + k];
            let nbb = w.get(nb, d);
            nb_glyphs[k] = if nbb == Block::Water {
                water_glyph(&w, nb, d)
            } else {
                block_glyph(nbb)
            };
        }
        let marker = if d == feet_depth { " <-- feet" } else { "" };
        println!(
            "[snapshot]  d={:3} {}  {}{}{} {}{}{}{}",
            d,
            m_glyph,
            nb_glyphs[0],
            nb_glyphs[1],
            nb_glyphs[2],
            nb_glyphs[3],
            nb_glyphs[4],
            nb_glyphs[5],
            marker
        );
    }
    println!(
        "[snapshot] legend: a=air w=water S=sand d=dirt g=grass #=stone i=ice s=snow \
         D=dirt-side T=torch W=wood L=leaves b=bedrock m=moon .=other"
    );
    println!("[snapshot] end\n");
}

/* --------------------------------------------------------------------- */
/* Staged loader - boot worldgen + SP/MP terrain regen with a real        */
/* loading screen instead of a frozen white window.                        */
/* --------------------------------------------------------------------- */

/// The loader's current stage. Each stage runs in ~[`LOADER_BUDGET_MS`]
/// slices, one per presented frame, so the bar animates while the work
/// happens. Nothing loads at boot - the menu needs no terrain - so the
/// whole sequence runs on the FIRST world entry (SP pick / MP join),
/// and later entries skip the stages that are already resident (moons
/// persist across worlds; only the reseeded spawn planet redoes
/// Gen/Light/Mesh).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum LoadStage {
    /// Streaming worldgen for the spawn planet.
    Gen,
    /// Slicing the spawn planet's global light BFS to convergence (the
    /// single most expensive part of a full mesh, pulled forward so the
    /// mesh stage's stall stays short).
    Light,
    /// One-shot full mesh: register_world on the first load (becoming
    /// the active body), remesh_body_now on a regen. Blocks for a
    /// couple of seconds - the loading screen presented just before
    /// this slice says so.
    Mesh,
    /// Per-moon streaming gen + (deferred) registration. Already-
    /// resident moons skip instantly, so this only costs on the first
    /// load of a session.
    Moons { idx: usize },
}

struct Loader {
    stage: LoadStage,
    /// Total relight slices run, capping the Light stage the same way
    /// body_full_mesh's safety counter does.
    light_slices: i32,
}

/// Wall-clock budget per loader frame. Keeps the loading screen
/// animating at interactive rates while still chewing through work.
const LOADER_BUDGET_MS: f64 = 30.0;
/// Tiles per stream_gen call inside a loader slice (the budget loop
/// checks the clock between calls).
const LOADER_SLICE_TILES: i32 = 4096;
/// Global cap on relight slices (mirrors body_full_mesh's safety cap).
const LOADER_LIGHT_MAX_SLICES: i32 = 400;

/// One loading-screen frame: present the CURRENT status first, then run
/// a budgeted slice of work - so even a monolithic slice (the mesh
/// build) stalls behind an honest just-presented message. Returns true
/// while the loader owns the frame.
fn loader_frame(app: &mut App) -> bool {
    let Some(loader) = app.loader.take() else { return false };
    let (status, frac) = loader_status(app, &loader);
    draw_loading_frame(&status, frac);
    app.loader = loader_step(app, loader);
    if app.loader.is_none() {
        println!("[loader] done");
    }
    true
}

/// Status line + progress fraction for the loading screen. The bar
/// tracks the CURRENT stage's own progress (per-stage reset, with the
/// text explaining which stage is running).
fn loader_status(app: &App, l: &Loader) -> (String, f32) {
    let world_name = app.world.borrow().body.name;
    match l.stage {
        LoadStage::Gen => {
            let w = app.world.borrow();
            let frac = if w.tile_count > 0 {
                (w.gen_cursor as f32 / w.tile_count as f32).clamp(0.0, 1.0)
            } else {
                0.0
            };
            (format!("generating {}", world_name), frac)
        }
        LoadStage::Light => (format!("lighting {}", world_name), 1.0),
        LoadStage::Mesh => ("building terrain mesh".to_string(), 1.0),
        LoadStage::Moons { idx } => {
            let mut done = 0i64;
            let mut total = 0i64;
            for m in &app.moons {
                let w = m.borrow();
                done += w.gen_cursor.min(w.tile_count) as i64;
                total += w.tile_count as i64;
            }
            let frac = if total > 0 { (done as f32 / total as f32).clamp(0.0, 1.0) } else { 1.0 };
            let name = app
                .moons
                .get(idx)
                .map(|m| m.borrow().body.name)
                .unwrap_or("moons");
            (format!("preparing {} ({}/{})", name, idx + 1, app.moons.len()), frac)
        }
    }
}

/// Advance the loader by one budgeted slice. Returns the next state,
/// or None when everything is loaded.
fn loader_step(app: &mut App, mut l: Loader) -> Option<Loader> {
    let t0 = stm::now();
    let in_budget = |t0: u64| stm::sec(stm::since(t0)) * 1000.0 < LOADER_BUDGET_MS;
    match l.stage {
        LoadStage::Gen => {
            let mut w = app.world.borrow_mut();
            while !w.gen_complete() && in_budget(t0) {
                w.stream_gen(LOADER_SLICE_TILES);
            }
            if w.gen_complete() {
                println!("[loader] {} generated ({} tiles)", w.body.name, w.tile_count);
                l.stage = LoadStage::Light;
            }
        }
        LoadStage::Light => {
            let mut w = app.world.borrow_mut();
            while w.light.is_dirty() && l.light_slices < LOADER_LIGHT_MAX_SLICES && in_budget(t0)
            {
                crate::hex_mesher::relight_if_needed(&mut w);
                l.light_slices += 1;
            }
            if !w.light.is_dirty() || l.light_slices >= LOADER_LIGHT_MAX_SLICES {
                println!("[loader] {} lit in {} slice(s)", w.body.name, l.light_slices);
                l.stage = LoadStage::Mesh;
            }
        }
        LoadStage::Mesh => {
            /* Bind the id BEFORE any renderer call: holding the world
             * borrow across it would collide with body_full_mesh's own
             * borrow_mut. */
            let body_id = app.world.borrow().body.id as u32;
            if renderer::world_for_body(body_id).is_none() {
                /* First load this session: first registration = active
                 * body, full mesh + upload (light already converged
                 * above, so this is the rayon mesh build only). */
                renderer::register_world(&app.world);
            } else {
                renderer::remesh_body_now(body_id);
            }
            l.stage = LoadStage::Moons { idx: 0 };
        }
        LoadStage::Moons { idx } => {
            /* Already-resident moons (generated + registered) skip in
             * one pass, so a spawn-planet regen doesn't pay the moon
             * walk again. */
            let mut idx = idx;
            while idx < app.moons.len() {
                let w_rc = app.moons[idx].clone();
                let body_id = w_rc.borrow().body.id as u32;
                if w_rc.borrow().gen_complete() && renderer::world_for_body(body_id).is_some() {
                    idx += 1;
                    continue;
                }
                let complete = {
                    let mut w = w_rc.borrow_mut();
                    while !w.gen_complete() && in_budget(t0) {
                        w.stream_gen(LOADER_SLICE_TILES);
                    }
                    w.gen_complete()
                };
                if complete && renderer::world_for_body(body_id).is_none() {
                    /* Deferred registration: far-LOD assets now, chunked
                     * mesh on approach (body_load_detail). */
                    renderer::register_world(&w_rc);
                    idx += 1;
                    continue;
                }
                break; /* budget spent mid-gen */
            }
            if idx >= app.moons.len() {
                return None;
            }
            l.stage = LoadStage::Moons { idx };
        }
    }
    Some(l)
}

thread_local! {
    static PIP_LOADING: std::cell::Cell<sgl::Pipeline> = const { std::cell::Cell::new(sgl::Pipeline { id: 0 }) };
}

/// Present one loading-screen frame: dark clear, title, status line and
/// a real progress bar (sokol_gl geometry + sdtx labels per the repo UI
/// rules - no ASCII art, no DOM).
fn draw_loading_frame(status: &str, frac: f32) {
    let sw = sapp::widthf();
    let sh = sapp::heightf();
    let mut pass = sg::Pass {
        swapchain: sokol::glue::swapchain(),
        ..Default::default()
    };
    pass.action.colors[0] = sg::ColorAttachmentAction {
        load_action: sg::LoadAction::Clear,
        clear_value: sg::Color { r: 0.02, g: 0.03, b: 0.05, a: 1.0 },
        ..Default::default()
    };
    sg::begin_pass(&pass);

    /* Progress bar: track, fill, thin border. */
    let bar_w = (sw * 0.4).clamp(280.0, 560.0);
    let bar_h = 16.0f32;
    let bx = (sw - bar_w) * 0.5;
    let by = sh * 0.56;
    sgl::defaults();
    sgl::matrix_mode_projection();
    sgl::load_identity();
    sgl::ortho(0.0, sw, sh, 0.0, -1.0, 1.0);
    sgl::matrix_mode_modelview();
    sgl::load_identity();
    sgl::load_pipeline(ui_alpha_pipeline(&PIP_LOADING));
    let quad = |x0: f32, y0: f32, x1: f32, y1: f32| {
        sgl::v2f(x0, y0);
        sgl::v2f(x1, y0);
        sgl::v2f(x1, y1);
        sgl::v2f(x0, y1);
    };
    sgl::begin_quads();
    /* Track. */
    sgl::c4f(0.08, 0.10, 0.14, 1.0);
    quad(bx, by, bx + bar_w, by + bar_h);
    /* Fill - warm gold, matching the menu title. */
    sgl::c4f(0.90, 0.78, 0.42, 1.0);
    quad(bx + 2.0, by + 2.0, bx + 2.0 + (bar_w - 4.0) * frac.clamp(0.0, 1.0), by + bar_h - 2.0);
    /* Border. */
    sgl::c4f(0.35, 0.38, 0.48, 1.0);
    quad(bx - 1.0, by - 1.0, bx + bar_w + 1.0, by);
    quad(bx - 1.0, by + bar_h, bx + bar_w + 1.0, by + bar_h + 1.0);
    quad(bx - 1.0, by, bx, by + bar_h);
    quad(bx + bar_w, by, bx + bar_w + 1.0, by + bar_h);
    sgl::end();
    sgl::draw();

    /* Labels via sdtx, scaled-canvas trick (same as the desync popup). */
    {
        let title = "TENEBRIS";
        let scale = 4.0f32;
        let cell = 8.0 * scale;
        sdtx::canvas(sw / scale, sh / scale);
        sdtx::origin((sw * 0.5 - cell * title.len() as f32 * 0.5) / cell, (sh * 0.40) / cell);
        sdtx::color3b(0xe6, 0xcf, 0x73);
        sdtx::home();
        sdtx::puts(title);
    }
    {
        let line = format!("{}  {}%", status, (frac.clamp(0.0, 1.0) * 100.0) as i32);
        let scale = 1.5f32;
        let cell = 8.0 * scale;
        sdtx::canvas(sw / scale, sh / scale);
        sdtx::origin((sw * 0.5 - cell * line.len() as f32 * 0.5) / cell, (by + bar_h + 14.0) / cell);
        sdtx::color3b(0xa8, 0xb0, 0xc4);
        sdtx::home();
        sdtx::puts(&line);
    }
    sdtx::canvas(sw, sh);
    sdtx::draw();
    sg::end_pass();
    sg::commit();
}

/* --------------------------------------------------------------------- */
/* frame                                                                   */
/* --------------------------------------------------------------------- */

extern "C" fn frame() {
    /* Pump the network state machine first so any handshake progress
     * is reflected in this frame's HUD - and so an MP socket stays
     * alive while the terrain loader runs below. */
    net_client::tick();
    /* Let the menu observe the net state and promote a dropped MP
     * socket to the modal error popup BEFORE the overlay short-circuit
     * below. */
    menu::tick();

    /* Staged terrain loader (first world entry / seed regen): present
     * the loading screen and run one budgeted work slice instead of
     * the game. */
    if with_app(loader_frame).unwrap_or(false) {
        return;
    }

    /* In the main menu, draw the menu overlay and skip the entire game
     * update path. */
    if menu::is_overlay() {
        /* Re-arm the one-shot gameplay-entry latches while any menu
         * screen is up. frame_inner is the code that resets them on
         * "not in SP/MP any more" - but frame_inner doesn't run during
         * this short-circuit, so without this a menu -> world-B entry
         * after playing world A skipped the whole EnterSp priming
         * (mode picker ignored, inventory / bag / resume pose carried
         * over from the previous session). */
        with_app(|app| {
            app.sp_resume_applied = false;
            app.mp_spawn_applied = false;
            app.inv_primed_for_state = -1;
        });
        let mut pass = sg::Pass {
            swapchain: sokol::glue::swapchain(),
            ..Default::default()
        };
        pass.action.colors[0] = sg::ColorAttachmentAction {
            load_action: sg::LoadAction::Clear,
            clear_value: sg::Color { r: 0.04, g: 0.06, b: 0.10, a: 1.0 },
            ..Default::default()
        };
        sg::begin_pass(&pass);
        sdtx::canvas(sapp::widthf(), sapp::heightf());
        if menu::state_is_egui() {
            /* SP menu screens render in egui (main menu / world list /
             * new world); the rest stay on the sokol path. */
            egui_layer::run(sapp::widthf(), sapp::heightf(), |ctx| menu::egui_ui(ctx));
            egui_layer::draw();
            sgl::draw();
        } else {
            menu::draw(sapp::widthf() as i32, sapp::heightf() as i32);
        }
        sdtx::draw();
        sg::end_pass();
        sg::commit();
        return;
    }

    with_app(frame_inner);
}

/// Build this frame's egui UI. Dispatches to each screen's egui builder.
/// Screens port from sokol_gl to egui one at a time.
fn egui_ui(app: &mut App, ctx: &egui::Context) {
    crafting_screen::set_player(Some(app.player.clone()));
    crafting_screen::egui_ui(ctx);
    inventory_screen::set_player(Some(app.player.clone()));
    inventory_screen::egui_ui(ctx);
    tech_tree::set_player(Some(app.player.clone()));
    tech_tree::egui_ui(ctx);
    chest_screen::egui_ui(ctx);
    station_screen::egui_ui(ctx);
    furnace_screen::egui_ui(ctx);
    bonfire_screen::egui_ui(ctx);
    power_ui::egui_ui(ctx);
    rocket_screen::egui_ui(ctx);
    menu::pause_egui_ui(ctx);
    menu::weather_egui_ui(ctx);
    menu::inputs_egui_ui(ctx);
}

fn frame_inner(app: &mut App) {
    maybe_apply_sp_resume(app);
    dev_maybe_place(app);
    space_complex_maybe_build(app);
    apply_sp_saves_lazy(app);
    maybe_apply_mp_spawn(app);
    maybe_prime_mode_for_state(app);
    if app.loader.is_some() {
        /* A terrain regen just started (SP world entry / MP entry
         * above): present the loading screen instead of running a
         * gameplay frame against the still-empty regenerated world. */
        loader_frame(app);
        return;
    }

    /* Pointer-lock-loss -> open pause menu. The browser eats the first
     * Escape press to release pointer lock; detecting the lock-state
     * transition is what gets the pause panel up on a SINGLE Esc. */
    {
        let now_locked = sapp::mouse_locked();
        let st = menu::state();
        let in_gameplay = st == GameState::InGameSp || st == GameState::InGameMp;
        /* Web pointer-lock-loss fallback: the browser eats the Esc that
         * releases pointer lock, so we synthesize the pause-open from the
         * lock-state transition. Every modal screen releases the pointer on
         * open (that's how its slots become clickable), so screens::any_open
         * has to gate this - otherwise E-ing a bonfire looks exactly like an
         * eaten Esc and the pause panel opens on top of it. On native, the
         * direct Esc handler in event_inner is the real opener; this stays
         * for the web Esc path. */
        if in_gameplay
            && app.was_mouse_locked
            && !now_locked
            && !menu::pause_active()
            && !screens::any_open()
        {
            menu::pause_toggle();
            /* Release the pointer lock so the cursor actually appears over
             * the (egui) pause panel - show_mouse alone can't reveal a
             * captured pointer. */
            sapp::lock_mouse(false);
            sapp::show_mouse(true);
        }
        app.was_mouse_locked = now_locked;
    }

    let raw_dt_sec = stm::sec(stm::laptime(&mut app.last_time));
    let mut dt = raw_dt_sec as f32;
    /* Lag-spike handling: discard accumulated mouse + look-stick
     * deltas on a stall so the camera doesn't wild-rotate on chunk
     * load, then clamp dt. */
    let (clamped, spiked) = lag_clamp(dt);
    if spiked {
        let s = input::state();
        println!(
            "[ERROR] [lag] frame stall {:.3}s (clamped to {:.3}s); \
             discarding {}/{} px of accumulated mouse delta",
            dt, LAG_SPIKE_S, s.mouse_dx as i32, s.mouse_dy as i32
        );
        input::state_mut(|s| {
            s.mouse_dx = 0.0;
            s.mouse_dy = 0.0;
            s.look_stick_x = 0.0;
            s.look_stick_y = 0.0;
        });
    }
    dt = clamped;
    app.tick = app.tick.wrapping_add(1);

    /* Tech-tree discovery: mark everything currently held as discovered so
     * the progression guide unlocks nodes as materials are gathered /
     * crafted. Cheap bitset sweep; runs in both SP and MP. */
    {
        let mut p = app.player.borrow_mut();
        let inv = p.inventory;
        let bag = p.bag;
        tech_tree::discover_held(&mut p.discovered, &inv, &bag);
    }
    /* Advance any in-progress timed craft (runs even with the panel
     * closed). */
    crafting_screen::tick_craft(&app.player, dt);
    /* Floating item drops: bob, magnet toward the player, collect. */
    {
        let mut p = app.player.borrow_mut();
        drops::update(dt, &mut p);
    }
    /* Dev: keep one hot booster framed ahead of the camera so the reentry
     * plasma shell can be screenshotted headless (respawned each frame so it
     * never falls out of view). */
    if std::env::var("TENEBRIS_DEV_FALLING").is_ok() {
        crate::falling_stage::clear();
        let p = app.player.borrow();
        crate::falling_stage::dev_spawn(p.position, p.basis.up, p.basis.fwd);
    }
    /* Jettisoned falling stages: ballistic reentry + salvage on impact
     * (metal scraps on land, intact parts in the ocean). */
    if !crate::falling_stage::is_empty() {
        let w = app.world.borrow();
        crate::falling_stage::step(&w, dt);
    }
    /* Bonfire lighting: publish lit-bonfire flames into the torch light
     * mirror (2x a torch) and relight the terrain around them when the lit
     * set changes. */
    {
        let mut w = app.world.borrow_mut();
        bonfire_fx::sync_lights(&mut w);
    }

    /* Advance the world clock (drives the on-rails orbit + day/night sim).
     * Frozen when a dev time-of-day is pinned for screenshots. */
    let time_frozen = DEV_TIME_FROZEN.with(|c| {
        if c.get() < 0 {
            c.set(if std::env::var("TENEBRIS_DEV_TIME").is_ok() { 1 } else { 0 });
        }
        c.get() == 1
    });
    if !time_frozen {
        let scale = config::time().time_scale as f64;
        tenebris_core::world_time::advance(dt as f64 * scale);
    }

    profiler::begin_frame();

    /* Stream a few tiles of terrain per frame. (Profiler slot names
     * use '-' separators - the oric font renders '_' as a euro glyph.) */
    profiler::begin("worldgen");
    {
        let mut w = app.world.borrow_mut();
        if !w.gen_complete() {
            w.stream_gen(GEN_TILES_PER_FRAME);
        }
    }
    profiler::end("worldgen");

    /* Poll touch-button edge events before consuming input. */
    if app.debug_ui_visible {
        teleport_menu::poll_touches();
    }

    /* Dev screenshot aid: a row of floating drops ahead of the player
     * (TENEBRIS_DEV_DROPS), spawned once when worldgen settles. */
    {
        let fire = DEV_DROPS.with(|c| {
            match c.get() {
                -1 => {
                    let v = std::env::var("TENEBRIS_DEV_DROPS").is_ok() as i8;
                    c.set(v);
                    false
                }
                1 => {
                    if app.world.borrow().gen_complete() {
                        c.set(0);
                        true
                    } else {
                        false
                    }
                }
                _ => false,
            }
        });
        if fire {
            drops::dev_spawn(&app.world.borrow(), &app.player.borrow());
            println!("[dev] spawned {} drops", drops::count());
        }
    }

    /* Dev screenshot aid: hold the survival mine button on the block
     * under a downward-pitched reticle so a still captures the crack
     * decal mid-mine. Cached env read (thread-local), dev-only. */
    {
        let on = match DEV_CRACK.with(|c| c.get()) {
            -1 => {
                let v = std::env::var("TENEBRIS_DEV_CRACK").is_ok() as i8;
                DEV_CRACK.with(|c| c.set(v));
                if v == 1 {
                    /* Equip a pickaxe (hotbar slot 1, selected) so stone
                     * is harvestable and the crack decal deepens - and so
                     * the shot exercises the hotbar's item-icon path. */
                    let mut p = app.player.borrow_mut();
                    p.inventory.slots[1] =
                        crate::inventory::InvSlot::of(tenebris_core::items::WOOD_PICKAXE, 1);
                    p.inventory.selected = 1;
                }
                v == 1
            }
            v => v == 1,
        };
        /* Survival + camera pitched down at the surface. We do NOT hold
         * the mine button: the crack decal is forced on at a demo stage in
         * the render path instead, so the still shows the decal without
         * actually breaking blocks. */
        if on {
            let mut p = app.player.borrow_mut();
            p.survival_mode = true;
            /* Aim a few metres ahead so the decal shot reads at gameplay
             * distance instead of point-blank at the feet block. */
            p.pitch = -0.55;
        }
    }

    /* Dev screenshot aid: pin the camera pitch (radians) so headless
     * stills can frame the ground / horizon without mouse input. */
    if let Ok(v) = std::env::var("TENEBRIS_DEV_PITCH") {
        if let Ok(rad) = v.parse::<f32>() {
            app.player.borrow_mut().pitch = rad;
        }
    }
    /* Dev screenshot aid: hold the player at a fixed altitude above the
     * body surface (metres above spawn radius) - the "from orbit" shot. */
    if let Ok(v) = std::env::var("TENEBRIS_DEV_HOVER") {
        if let Ok(alt) = v.parse::<f64>() {
            let (bc, r) = {
                let w = app.world.borrow();
                (
                    dvec3_make(w.body.pos_x, w.body.pos_y, w.body.pos_z),
                    w.body.radius_m + alt,
                )
            };
            let mut p = app.player.borrow_mut();
            let dir = dvec3_normalize(dvec3_sub(p.position, bc));
            p.position = dvec3_add(bc, dvec3_scale(dir, r));
            p.velocity = tenebris_core::math::DVec3::default();
        }
    }

    /* Dev screenshot aid: hold the camera on its underwater-fish perch
     * each frame so gravity can't drop it off. */
    DEV_FISH_CAM.with(|c| {
        if let Some(cam) = c.get() {
            let mut p = app.player.borrow_mut();
            p.position = cam;
            p.velocity = tenebris_core::math::DVec3::default();
        }
    });

    /* G-key toggles survival mode in SP only (MP is always survival).
     * Consume the edge either way. */
    /* K cycles a manual storm (off -> rain -> snow): forces a full
     * overcast + shower everywhere so weather can be triggered on demand.
     * The change is immediately visible (deck + shower), so a console line
     * is enough feedback without a toast system. */
    if input::consume_storm_toggle() {
        println!("[weather] {}", weather_fx::cycle_storm());
    }
    if input::consume_survival_toggle() && menu::state() == GameState::InGameSp {
        let mut p = app.player.borrow_mut();
        p.survival_mode = !p.survival_mode;
        /* Manually toggling the base mode drops the space-exploration label -
         * it becomes a plain survival/creative world from here on. */
        p.space_mode = false;
        if p.survival_mode {
            p.hunger = player_ctrl::MAX_HUNGER;
            inventory::init_empty(&mut p.inventory);
        } else {
            inventory::init_creative(&mut p.inventory);
        }
    }

    /* Hunger: drains over time in survival; press R to eat meat from the
     * bag (cooked restores more than raw). Creative ignores it. */
    {
        let mut p = app.player.borrow_mut();
        if p.survival_mode {
            p.hunger = (p.hunger - player_ctrl::HUNGER_DRAIN_PER_S * dt).max(0.0);
            if input::consume_eat() {
                /* Best food first: cooked meat > bread > raw meat >
                 * berries > carrot (restore order). */
                let fcfg = tenebris_core::farming::config();
                let restore = if p.bag.count_of(tenebris_core::items::COOKED_MEAT) > 0 {
                    p.bag.take(tenebris_core::items::COOKED_MEAT, 1);
                    45.0
                } else if p.bag.count_of(tenebris_core::items::BREAD) > 0 {
                    p.bag.take(tenebris_core::items::BREAD, 1);
                    fcfg.bread_hunger_restore
                } else if p.bag.count_of(tenebris_core::items::COOKED_FISH) > 0 {
                    p.bag.take(tenebris_core::items::COOKED_FISH, 1);
                    35.0
                } else if p.bag.count_of(tenebris_core::items::RAW_MEAT) > 0 {
                    p.bag.take(tenebris_core::items::RAW_MEAT, 1);
                    20.0
                } else if p.bag.count_of(tenebris_core::items::RAW_FISH) > 0 {
                    p.bag.take(tenebris_core::items::RAW_FISH, 1);
                    12.0
                } else if p.bag.count_of(tenebris_core::items::BERRIES) > 0 {
                    p.bag.take(tenebris_core::items::BERRIES, 1);
                    fcfg.berry_hunger_restore
                } else if p.bag.count_of(tenebris_core::items::CARROT) > 0 {
                    p.bag.take(tenebris_core::items::CARROT, 1);
                    fcfg.carrot_hunger_restore
                } else if let Some((fruit, seed)) = [
                    (tenebris_core::items::APPLE, tenebris_core::items::APPLE_SEEDS),
                    (tenebris_core::items::ORANGE, tenebris_core::items::ORANGE_SEEDS),
                    (tenebris_core::items::WATERMELON, tenebris_core::items::WATERMELON_SEEDS),
                    (tenebris_core::items::KIWI, tenebris_core::items::KIWI_SEEDS),
                ]
                .into_iter()
                .find(|&(f, _)| p.bag.count_of(f) > 0)
                {
                    /* Orchard fruit: restores hunger and yields a seed of
                     * its kind, so eating what you forage also lets you
                     * start planting it. */
                    p.bag.take(fruit, 1);
                    p.bag.add(seed, 1);
                    fcfg.fruit_hunger_restore
                } else {
                    0.0
                };
                if restore > 0.0 {
                    p.hunger = (p.hunger + restore).min(player_ctrl::MAX_HUNGER);
                }
            }
        } else {
            /* Drop the edge so it doesn't fire on the next survival frame. */
            input::consume_eat();
        }
    }

    /* Pre-update body selection: strongest gravity pull wins; swap
     * BEFORE player_update so the world we hand in matches p.body even
     * on the swap frame. Keep the renderer's active body in sync. */
    {
        let l = config::lod();
        let pos = app.player.borrow().position;
        let gq = planet::gravity_at(pos, l.gravity_full_mult, l.gravity_falloff_mult);
        if let Some(gb) = gq.body {
            let cur = app.player.borrow().body.map(|b| b.id);
            if cur != Some(gb.id) {
                player_ctrl::set_body(&mut app.player.borrow_mut(), &gb);
            }
        }
        let body = app.player.borrow().body;
        if body.is_some() {
            if let Some(active_w) = world_for_body(app, body.as_ref()) {
                renderer::set_active_world(&active_w);
            }
        }
    }
    /* Route physics through the world that backs the player's current
     * body; fall back to G.world so the path is never null. */
    let phys_world = {
        let body = app.player.borrow().body;
        world_for_body(app, body.as_ref()).unwrap_or_else(|| app.world.clone())
    };
    profiler::begin("player-update");
    /* Pause keeps physics running so the world stays alive behind the
     * panel; we zero held-key + click state for the duration. */
    if menu::pause_active() {
        input::state_mut(|m| {
            m.phys = Default::default();
            m.left_held = false;
            m.right_held = false;
            m.left_click = false;
            m.right_click = false;
            m.middle_click = false;
            m.stick_active = false;
            m.stick_x = 0.0;
            m.stick_y = 0.0;
            m.look_stick_active = false;
            m.look_stick_x = 0.0;
            m.look_stick_y = 0.0;
        });
    }
    /* MP join freeze: skip physics until net is READY so the player
     * doesn't fall from a stale pose then snap to the server pose. */
    let mp_loading =
        menu::state() == GameState::InGameMp && net_client::state() != NetClientState::Ready;
    /* Worldgen freeze: pause physics entirely while gen is streaming
     * so a cold load can't drop the player below the analytic floor. */
    let worldgen_loading = !phys_world.borrow().gen_complete();
    if !mp_loading && !worldgen_loading {
        let w = phys_world.borrow();
        player_ctrl::update(&mut app.player.borrow_mut(), Some(&w), dt);
    }
    profiler::end("player-update");
    /* Throttled SP pose autosave + 5 s position trace. */
    maybe_autosave_sp(app, dt as f64);
    periodic_pos_log(app, dt as f64);

    /* MP water-resync is server-driven (MSG_SYNC_TICK); no client
     * timer here any more - see the C comment block. */

    /* M4 position relay: when MP is READY, ship our pose every 3rd
     * frame (~20 Hz at 60 fps capped by the server tick). */
    {
        if menu::state() == GameState::InGameMp && net_client::state() == NetClientState::Ready {
            app.state_send_ctr = app.state_send_ctr.wrapping_add(1);
            if app.state_send_ctr % 3 == 0 {
                let p = app.player.borrow();
                /* Real body anchor on the wire: query gravity directly
                 * so deep space persists as IN_SPACE. */
                let body_id = {
                    let l = config::lod();
                    let gq = planet::gravity_at(
                        p.position,
                        l.gravity_full_mult,
                        l.gravity_falloff_mult,
                    );
                    match gq.body {
                        Some(b) => b.id as u32,
                        None => BODY_ID_IN_SPACE,
                    }
                };
                /* Force grounded=false on the wire while the post-
                 * rescue freeze counts down (gates server pose
                 * persistence). */
                let send_grounded = p.grounded && p.rescue_save_freeze_s <= 0.0;
                net_client::send_player_state(
                    app.state_send_ctr,
                    body_id,
                    p.position.x,
                    p.position.y,
                    p.position.z,
                    p.yaw,
                    p.pitch,
                    send_grounded,
                );
                app.last_sent_pos = p.position;
                app.last_sent_body = body_id;
                app.last_sent_yaw = p.yaw;
                app.last_sent_pitch = p.pitch;
                app.last_sent_valid = true;
            }
        }
    }
    /* MP inventory persistence: apply the server-pushed hotbar once,
     * and ship local changes (memcmp against the last snapshot). */
    if menu::state() == GameState::InGameMp && net_client::state() == NetClientState::Ready {
        if let Some((pend_type, pend_count, pend_sel)) = net_client::take_pending_inventory() {
            let mut p = app.player.borrow_mut();
            for i in 0..INV_HOTBAR_SLOTS.min(9) {
                /* The wire "type" field carries the full item id now
                 * (blocks are ids < BLOCK_COUNT, tools 100+); legacy
                 * saves only ever stored block ids, which parse the
                 * same. */
                p.inventory.slots[i].item = pend_type[i];
                p.inventory.slots[i].count = pend_count[i] as i32;
            }
            if pend_sel >= 0 && (pend_sel as usize) < INV_HOTBAR_SLOTS {
                p.inventory.selected = pend_sel;
            }
        }
        let p = app.player.borrow();
        let mut cur_type = [0u16; 9];
        let mut cur_count = [0i16; 9];
        for i in 0..9 {
            if i < INV_HOTBAR_SLOTS {
                cur_type[i] = p.inventory.slots[i].item;
                /* Clamp so the wire's i16 counts round-trip cleanly
                 * (legacy saves may still carry the old 9999 stacks). */
                cur_count[i] = p.inventory.slots[i].count.clamp(0, i16::MAX as i32) as i16;
            }
        }
        let cur_sel = p.inventory.selected;
        drop(p);
        let changed = !app.inv_init
            || cur_sel != app.inv_last_sel
            || cur_type != app.inv_last_type
            || cur_count != app.inv_last_count;
        if changed {
            net_client::send_inventory_state(&cur_type, &cur_count, cur_sel);
            app.inv_last_type = cur_type;
            app.inv_last_count = cur_count;
            app.inv_last_sel = cur_sel;
            app.inv_init = true;
        }
    }
    profiler::begin("interact");
    /* interact keeps running while paused (input zeroing above already
     * stopped mining / placement); frozen during MP join until READY. */
    if !mp_loading {
        let mp = menu::state() == GameState::InGameMp;
        /* MP: the server owns the herds; mirror its broadcasts. SP: local
         * sim. set_remote only clears state on an actual mode change. */
        animals::set_remote(mp);
        if mp {
            mp_parity_sync(app, &phys_world, dt);
        }
        /* Wander + re-seat the animals + grow the crops before interact
         * runs its raycasts. The crop reticle hint gates on last frame's
         * block-hit distance so it doesn't light up through a wall (one
         * frame of staleness is invisible for a HUD hint). */
        {
            let w = phys_world.borrow();
            /* Mutable: night stalkers lunge - knockback + hunger land on
             * the player inside animals::update. */
            let mut p = app.player.borrow_mut();
            animals::update(dt, &w, &mut p);
            let block_limit = if app.interact.has_target && !app.interact.is_torch_target {
                app.interact.distance as f32
            } else {
                f32::MAX
            };
            crops::update(dt, &w, &p, block_limit);
            /* Scatter wild fruit plants in the fields / jungle around the
             * player to forage (deterministic, not persisted). */
            crops::spawn_wild_near(&w, &p);
        }
        fishing::update(&phys_world.borrow(), &mut app.player.borrow_mut(), dt);
        interact::update(
            &mut app.interact,
            &mut phys_world.borrow_mut(),
            &mut app.player.borrow_mut(),
            dt,
        );
        /* Break a plant like a block: holding the mine button on a crop
         * fills interact.crop_break_s; when it reaches CROP_BREAK_S (~1 s)
         * the plant pops and drops its produce/seeds into the bag. Mature
         * crops yield full produce + seeds; uprooting an unripe one returns
         * just its seed. Same-frame persist (SP) / relay (MP). */
        if app.interact.is_crop_target && app.interact.crop_break_s >= crops::CROP_BREAK_S {
            app.interact.crop_break_s = 0.0;
            let broken = {
                let w = phys_world.borrow();
                let p = app.player.borrow();
                crops::break_under_reticle(&w, &p)
            };
            if let Some(crop) = broken {
                let cfg = tenebris_core::farming::config();
                {
                    let mut p = app.player.borrow_mut();
                    let seed = tenebris_core::farming::seed_item(crop.kind);
                    if crop.is_mature() {
                        let produce = tenebris_core::farming::produce_item(crop.kind);
                        p.bag.add(produce, cfg.produce_count_of(crop.kind));
                        let seeds = cfg.seed_count_of(crop.kind);
                        if seeds > 0 {
                            p.bag.add(seed, seeds);
                        }
                    } else {
                        p.bag.add(seed, 1); /* uproot -> seed back */
                    }
                }
                if mp {
                    let body_id = phys_world.borrow().body.id as u32;
                    net_client::send_crop_op(
                        body_id,
                        tenebris_core::proto::CROP_OP_REMOVE,
                        crop.tile_idx,
                        crop.pos,
                        crop.up,
                        crop.growth,
                        crop.kind as u8,
                    );
                } else {
                    crops::sp_save_after_change(&phys_world.borrow());
                }
            }
        }
        /* Plant (T): plant a seed on tilled soil, or till dirt/grass with a
         * hoe. (Harvesting is no longer here - plants are broken above.)
         * The crop list
         * mutation happens in crops::plant_or_harvest; here we apply the
         * bag change + persist same-frame (CLAUDE.md world-edit rule) or,
         * in MP, tell the server (it persists + relays to the room). */
        if input::consume_plant() {
            /* A bucket in hand repurposes the farm key: an empty bucket
             * scoops water it's aimed at; a full one waters the crop under
             * the reticle. Handled before plant/harvest so the same key
             * covers the whole "or just let it rain" watering loop. */
            let held_bucket = {
                let p = app.player.borrow();
                match inventory::selected_item(&p.inventory) {
                    Some(tenebris_core::items::BUCKET) => Some(false),
                    Some(tenebris_core::items::WATER_BUCKET) => Some(true),
                    _ => None,
                }
            };
            let bucket_used = if let Some(has_water) = held_bucket {
                let out = {
                    let w = phys_world.borrow();
                    let p = app.player.borrow();
                    crops::use_bucket(&w, &p, has_water)
                };
                match out {
                    crops::BucketOutcome::Scooped => {
                        let mut p = app.player.borrow_mut();
                        swap_selected_item(
                            &mut p,
                            tenebris_core::items::BUCKET,
                            tenebris_core::items::WATER_BUCKET,
                        );
                        true
                    }
                    crops::BucketOutcome::Watered(tile) => {
                        {
                            let mut p = app.player.borrow_mut();
                            swap_selected_item(
                                &mut p,
                                tenebris_core::items::WATER_BUCKET,
                                tenebris_core::items::BUCKET,
                            );
                        }
                        /* watered_s is transient client state; the crop's
                         * persisted growth updates on its own each frame, so
                         * no extra save needed here. In MP the boost is a
                         * local nicety (rain drives growth authoritatively). */
                        let _ = tile;
                        true
                    }
                    crops::BucketOutcome::None => false,
                }
            } else {
                false
            };
            let outcome = if bucket_used {
                crops::Outcome::None
            } else {
                let w = phys_world.borrow();
                let p = app.player.borrow();
                let seed_kind = plantable_seed_kind(&p);
                /* Equip rule: the hoe only tills while selected. */
                let has_hoe =
                    inventory::selected_item(&p.inventory) == Some(tenebris_core::items::HOE);
                crops::plant_or_harvest(&w, &p, &app.interact, seed_kind, has_hoe)
            };
            match outcome {
                crops::Outcome::Planted(crop) => {
                    let seed = tenebris_core::farming::seed_item(crop.kind);
                    {
                        let mut p = app.player.borrow_mut();
                        if p.bag.take(seed, 1) > 0 {
                            /* Seed lived in the hotbar, not the bag. */
                            let sel = p.inventory.selected as usize;
                            let s = &mut p.inventory.slots[sel];
                            if s.item == seed && s.count > 0 {
                                s.count -= 1;
                                if s.count == 0 {
                                    s.item = Block::Air as u16;
                                }
                            }
                        }
                    }
                    if mp {
                        let body_id = phys_world.borrow().body.id as u32;
                        net_client::send_crop_op(
                            body_id,
                            tenebris_core::proto::CROP_OP_PLANT,
                            crop.tile_idx,
                            crop.pos,
                            crop.up,
                            crop.growth,
                            crop.kind as u8,
                        );
                    } else {
                        crops::sp_save_after_change(&phys_world.borrow());
                    }
                }
                crops::Outcome::Tilled(tile, depth) => {
                    /* Tilling is a normal world block edit: dirt/grass ->
                     * farmland, persisted same-frame (SP) or relayed to the
                     * server (MP), same as a place. */
                    {
                        let mut w = phys_world.borrow_mut();
                        w.set(tile, depth, Block::Farmland);
                    }
                    if mp {
                        let body_id = phys_world.borrow().body.id as u32;
                        net_client::send_edit(
                            tenebris_core::proto::PLAYER_CMD_PLACE,
                            body_id,
                            tile,
                            depth,
                            Block::Farmland as i32,
                        );
                    } else {
                        interact::sp_save_tile_after_edit(&phys_world.borrow(), tile);
                    }
                }
                crops::Outcome::Harvested(_)
                | crops::Outcome::NotReady
                | crops::Outcome::None => {}
            }
        }
    } else {
        /* Drop the edge while MP is loading so it doesn't fire on join. */
        input::consume_plant();
    }
    profiler::end("interact");
    input::consume();

    /* Water-flow tick - SP-only (in MP the server is authoritative and
     * broadcasts via CHUNK_DIFF; see the C comment for the determinism
     * + remesh-storm rationale). */
    {
        let wf = config::water_flow();
        const TICK_PERIOD_S: f32 = 0.05; /* matches MP tick_hz=20 */
        let mut period_s = wf.ticks_per_step as f32 * TICK_PERIOD_S;
        if period_s < TICK_PERIOD_S {
            period_s = TICK_PERIOD_S;
        }
        app.water_accum_s += dt;
        let sp = menu::state() == GameState::InGameSp;
        if sp && app.water_accum_s >= period_s {
            app.water_accum_s = 0.0;
            /* Water steps synchronously on the main (GL) thread, so a
             * heavy step shows up directly as a frame spike. Profile it
             * under its own slot so the frame-time graph can attribute
             * the stall. */
            profiler::begin("water-sim");
            let budget = wf.max_ticks_per_step.max(1);
            let sp_world = menu::active_world();
            let mut dirty_tiles = vec![0i32; 8192];
            let mut worlds: Vec<Rc<RefCell<World>>> = Vec::with_capacity(33);
            worlds.push(app.world.clone());
            for m in &app.moons {
                if worlds.len() >= 33 {
                    break;
                }
                worlds.push(m.clone());
            }
            let mp_active = menu::state() == GameState::InGameMp;
            for w_rc in &worlds {
                let mut w = w_rc.borrow_mut();
                world_water::step(&mut w, budget);
                /* Placed-machine behavior (furnace smelt, later generators
                 * / printer). Persist same-frame in SP when a smelt
                 * completes (a durable output change). In MP the SERVER
                 * ticks machines and broadcasts progress (BentityDiff);
                 * ticking locally too would fight those updates. */
                let machines_changed = if mp_active { false } else { w.tick_machines(dt) };
                if machines_changed && !sp_world.is_empty() {
                    persistence::save_block_entities(&sp_world, w.body.id as u32, &w.block_entities);
                }
                if sp_world.is_empty() {
                    continue;
                }
                let body_id = w.body.id as u32;
                let n = world_water::drain_persist_dirty(&mut w, &mut dirty_tiles);
                for &tile in dirty_tiles[..n as usize].iter() {
                    if let Some(col) = world_water::state_column(&w, tile) {
                        let col: &[u8; COLUMN_BYTES] =
                            col.try_into().expect("state column is COLUMN_BYTES");
                        persistence::save_water_state(&sp_world, body_id, tile, col);
                    }
                }
            }
            profiler::end("water-sim");
        }
    }

    let aspect = sapp::widthf() / sapp::heightf();
    let view: Mat4 = player_ctrl::view(&app.player.borrow());
    /* zfar = 20 km - covers the sun (8 km) + far asteroids with
     * margin. */
    let zfar = 20000.0f32;
    let proj = mat4_perspective(60.0 * (std::f32::consts::PI / 180.0), aspect, 0.3, zfar);

    /* Atmosphere + sky are anchored to whatever body the player is
     * currently standing on. Zeroed per-body fields fall back to the tuned
     * defaults (see the C commentary). */
    let active_body = app.player.borrow().body.unwrap_or(app.body);

    /* Sun direction comes from the on-rails sky sim: it circles the sky as
     * the active body spins (day/night) and drifts with its orbit. The disc
     * sits far along that direction from the body's render centre. */
    const SUN_DIST: f32 = 8000.0;
    const SUN_RADIUS: f32 = 240.0;
    let sim_t = tenebris_core::world_time::seconds();
    let sun_dir = vec3_normalize(dvec3_to_vec3(orbit::sun_direction(active_body.id, sim_t)));
    let sun_pos = Vec3 {
        x: active_body.pos_x as f32 + sun_dir.x * SUN_DIST,
        y: active_body.pos_y as f32 + sun_dir.y * SUN_DIST,
        z: active_body.pos_z as f32 + sun_dir.z * SUN_DIST,
    };
    let has_atmo = active_body.has_water;
    let planet_r = active_body.radius_m as f32;
    let radius_mult = if active_body.atmo_radius_mult > 0.0 { active_body.atmo_radius_mult } else { 1.3 };
    let lower_mult = if active_body.atmo_lower_radius_mult > 0.0 { active_body.atmo_lower_radius_mult } else { 1.0 };
    let rayleigh = if active_body.atmo_rayleigh_scale > 0.0 { active_body.atmo_rayleigh_scale } else { 1.0 };
    let mie = if active_body.atmo_mie_scale > 0.0 { active_body.atmo_mie_scale } else { 0.05 };
    let sun_int = if active_body.atmo_sun_intensity > 0.0 { active_body.atmo_sun_intensity } else { 30.0 };
    let sunset = if active_body.atmo_sunset_strength > 0.0 { active_body.atmo_sunset_strength } else { 0.3 };
    let scale_h = if active_body.atmo_scale_height > 0.0 { active_body.atmo_scale_height } else { 0.25 };
    let mie_g = if active_body.atmo_mie_g > 0.0 { active_body.atmo_mie_g } else { 0.76 };
    /* vec3 zero-test: x+y+z > 0 means at least one channel was set. */
    let wl = active_body.atmo_wavelengths;
    let wavelengths = if wl.x + wl.y + wl.z > 0.0 { wl } else { Vec3 { x: 5.602, y: 9.473, z: 19.644 } };
    let st = active_body.atmo_sunset_tint;
    let sunset_tint = if st.x + st.y + st.z > 0.0 { st } else { Vec3 { x: 1.30, y: 1.00, z: 0.60 } };
    let sg_ = active_body.atmo_sunset_glow;
    let sunset_glow = if sg_.x + sg_.y + sg_.z > 0.0 { sg_ } else { Vec3 { x: 1.00, y: 0.65, z: 0.25 } };
    let sh = active_body.atmo_sunset_horizon;
    let sunset_horizon = if sh.x + sh.y + sh.z > 0.0 { sh } else { Vec3 { x: 0.80, y: 0.40, z: 0.15 } };
    /* atmo_lower sinks the planet-clip sphere below ground when
     * lower_mult < 1 - softens the dark band below the limb. */
    let clip_radius = planet_r * lower_mult;
    let atmo_r = planet_r * radius_mult;
    let mut env = RenderEnv {
        sun_dir,
        sun_pos,
        sun_radius: SUN_RADIUS,
        sky_top: Vec3 { x: 0.02, y: 0.04, z: 0.10 },
        sky_bottom: Vec3 { x: 0.05, y: 0.08, z: 0.15 },
        ambient: Vec3 { x: 0.35, y: 0.35, z: 0.40 },
        atmo_planet_center: Vec3 {
            x: active_body.pos_x as f32,
            y: active_body.pos_y as f32,
            z: active_body.pos_z as f32,
        },
        atmo_planet_radius: clip_radius, /* Rp - atmosphere lower / planet-clip */
        atmo_radius: atmo_r,             /* Ra - outer shell                    */
        atmo_strength: if has_atmo { 1.0 } else { 0.0 },
        atmo_rayleigh_scale: rayleigh,
        atmo_mie_scale: mie,
        atmo_sun_intensity: sun_int,
        atmo_sunset_strength: sunset,
        atmo_wavelengths: wavelengths,
        atmo_mie_g: mie_g,
        atmo_scale_height: scale_h,
        atmo_sunset_tint: sunset_tint,
        atmo_sunset_glow: sunset_glow,
        atmo_sunset_horizon: sunset_horizon,
        ..Default::default()
    };
    /* Camera world pos for the water-shader fresnel - the player's
     * parallel-transported basis keeps it continuous. */
    let cam_world_d = {
        let p = app.player.borrow();
        dvec3_add(p.position, dvec3_scale(p.basis.up, 1.6))
    };
    let cam_world = dvec3_to_vec3(cam_world_d);
    env.camera_world = cam_world;
    /* Spin the starfield with the planet's rotation so the sky wheels
     * overhead with the day, matching the sun + moons. */
    env.star_spin_angle = orbit::spin_angle(active_body.id, sim_t) as f32;

    renderer::begin_frame(sapp::width(), sapp::height(), env);
    /* Opaque scene -> offscreen colour + depth attachments. */
    profiler::begin("draw-skybox");
    renderer::draw_skybox(view, proj);
    profiler::end("draw-skybox");
    profiler::begin("draw-sun");
    renderer::draw_sun(view, proj);
    profiler::end("draw-sun");
    /* Publish this frame's mining state so the terrain pass paints the
     * crack channel on the mined cell in-shader (replaced the old
     * inflated prism decal, which z-fought the terrain at planet-scale
     * depth precision). */
    {
        let w = phys_world.borrow();
        let block = w.get(app.interact.hit_tile, app.interact.hit_depth);
        let frac = {
            let p = app.player.borrow();
            if p.survival_mode
                && app.interact.has_target
                && app.interact.mining_progress_s > 0.0
                && app.interact.mining_tile == app.interact.hit_tile
                && app.interact.mining_depth == app.interact.hit_depth
            {
                let break_s = interact::break_seconds_for(&p, block).max(1e-4);
                Some((app.interact.mining_progress_s / break_s).clamp(0.0, 1.0))
            } else {
                None
            }
        };
        /* Dev screenshot aid: paint a fixed mid-late stage on the aimed
         * block without mining it (TENEBRIS_DEV_CRACK). */
        let frac = if DEV_CRACK.with(|c| c.get()) == 1 { Some(0.7) } else { frac };
        if let Some(frac) = frac {
            renderer::set_break_overlay(
                &w,
                block,
                app.interact.hit_tile,
                app.interact.hit_depth,
                frac,
            );
        }
    }
    profiler::begin("draw-world");
    /* Pass the active body's world, not G.world - hardcoding G.world
     * reverted active to Tenebris every frame (LOD flap on Crag). */
    renderer::draw_world(view, proj, &phys_world, cam_world, dt);
    profiler::end("draw-world");
    profiler::begin("draw-moons");
    /* Place every body for this frame from the on-rails orbit sim, then
     * draw them sweeping across the active body's sky. */
    renderer::update_celestial(active_body.id, sim_t);
    renderer::draw_moons(view, proj, cam_world);
    profiler::end("draw-moons");
    profiler::begin("draw-torches");
    renderer::draw_torches(view, proj);
    /* Emissive glow points: the far-LOD stand-in for baked torch
     * light, so bases shine from orbit + remote bodies. */
    renderer::draw_light_glow(view, proj);
    profiler::end("draw-torches");
    /* Animals + crops - same offscreen opaque pass so terrain/torches
     * z-sort correctly against them. */
    animals::draw(view, proj, renderer::time_seconds());
    crate::rocket_fx::draw(view, proj, &app.world.borrow());
    /* Jettisoned falling stages: tumbling part models wrapped in the
     * hull-hugging reentry plasma shell (the mining-the-sky mesh technique).
     * Stepped in the frame update; drawn here in the world pass. */
    {
        let views = crate::falling_stage::views();
        if !views.is_empty() {
            crate::rocket_fx::draw_falling(view, proj, &app.world.borrow(), &views);
            let p = app.player.borrow();
            let eye = dvec3_add(p.position, dvec3_scale(p.basis.up, player_ctrl::EYE_HEIGHT as f64));
            let shells: Vec<crate::reentry_fx::ShellStage> = views
                .iter()
                .map(|v| crate::reentry_fx::ShellStage {
                    center: v.center,
                    axis: v.axis,
                    flow: v.flow,
                    parts: v.parts.clone(),
                    heat: v.heat,
                })
                .collect();
            crate::reentry_fx::draw_shells(view, proj, eye, &shells);
        }
    }
    /* Reentry plasma: streaks past the camera when falling fast in the
     * lower atmosphere (rocket.yaml [reentry]; dev-forced by
     * TENEBRIS_DEV_REENTRY). Same world sgl pass as the rocket. */
    {
        let p = app.player.borrow();
        let center = dvec3_make(app.body.pos_x, app.body.pos_y, app.body.pos_z);
        let rel = dvec3_sub(p.position, center);
        let alt = tenebris_core::math::dvec3_length(rel) - app.body.radius_m;
        let speed = tenebris_core::math::dvec3_length(p.velocity);
        crate::reentry_fx::update(alt, speed, 1.0 / 60.0);
        let eye = dvec3_add(p.position, dvec3_scale(p.basis.up, player_ctrl::EYE_HEIGHT as f64));
        crate::reentry_fx::draw(view, proj, eye, p.velocity, p.basis.fwd, p.basis.up);
    }
    fishing::draw(view, proj, &app.player.borrow());
    crops::draw(view, proj);
    drops::draw(view, proj, renderer::time_seconds());
    {
        let w = app.world.borrow();
        bonfire_fx::draw(&w, view, proj, renderer::time_seconds());
    }
    /* Cloud layer above the surface - same pass, drifts with sim time
     * so every peer's sky agrees. */
    {
        let w = phys_world.borrow();
        let p = app.player.borrow();
        clouds::draw(view, proj, &w, &p, sim_t);
        /* Rain / snow around the player when their column is precipitating. */
        weather_fx::draw(view, proj, &w, &p, sim_t);
    }

    /* First-person held tool (survival): the baked wood-tool model the
     * current swing would use, chopping while the mine button is held. */
    {
        let (survival, in_space) = {
            let p = app.player.borrow();
            (p.survival_mode, p.is_in_space)
        };
        if survival && !in_space && !menu::pause_active() {
            let tool = held_tool_for_display(app, &phys_world.borrow());
            let mining = input::state().left_held
                && app.interact.has_target
                && !app.interact.is_torch_target;
            viewmodel::draw(proj, tool, mining, renderer::time_seconds(), dt);
        }
    }

    /* Remote-player markers - same offscreen pass so they get the
     * depth-sorted composite + water refraction for free. */
    remote_players::draw(view, proj);

    /* Target highlight: outline only the single face the reticle is
     * aimed at. Drawn into the world pass for natural depth-test. */
    if app.interact.has_target && !app.interact.is_torch_target && !menu::pause_active() {
        renderer::draw_face_outline(
            view,
            proj,
            &app.world.borrow(),
            app.interact.hit_tile,
            app.interact.hit_depth,
            app.interact.place_tile,
            app.interact.place_depth,
            1.00,
            1.00,
            1.00,
            0.95,
        );
        /* The block-break crack renders inside the terrain pass now
         * (renderer::set_break_overlay, published before draw_world). */
    }

    /* Hand off to the swapchain pass. */
    profiler::begin("compose");
    renderer::compose_to_swapchain(view, proj);
    profiler::end("compose");

    /* Water draws in the swapchain pass on TOP of the composited
     * scene (samples offscreen colour + depth for refraction). */
    profiler::begin("draw-water");
    renderer::draw_water(view, proj, cam_world);
    /* F5 toggle: yellow arrows on every water cell with non-zero flow
     * direction. */
    renderer::draw_water_flow_debug(view, proj);
    profiler::end("draw-water");

    /* UI overlays go on the swapchain on top of the water. */
    profiler::begin("ui");
    update_overlay(app, dt);
    /* Always-on version + profile readout, outside the F2 gate. */
    draw_version_strip();
    /* Teleport overlay is creative/debug-only. */
    if app.debug_ui_visible {
        teleport_menu::draw();
    }
    /* Crafting is gameplay UI, not a debug overlay: it must render
     * whenever the player has it open, independent of the F2 toggle.
     * (draw() self-gates on is_open(), so this is a no-op when closed.) */
    crafting_screen::draw();
    /* Rocket assembly + test-flight screen. update() steps the live test
     * flight; the panel itself draws via egui_ui(). */
    rocket_screen::update(dt);
    if app.debug_ui_visible {
        draw_error_overlay();
        profiler::draw();
    }
    /* F1 players panel is independent of the F2 master. */
    draw_players_panel(app, sapp::widthf(), sapp::heightf());
    draw_desync_popup(sapp::widthf(), sapp::heightf());
    chat::draw(sapp::widthf(), sapp::heightf());
    /* Nameplates above remote players (net_client name cache). */
    remote_players::draw_nameplates(view, proj, sapp::widthf(), sapp::heightf(), &|id| {
        net_client::name_for_id(id)
    });
    /* Gameplay HUD - hidden while the pause panel or any modal screen is
     * up: the hotbar's sdtx slot digits flush on top of ALL geometry
     * including egui, so the bar - numbers and all - must vanish together
     * instead of the digits bleeding through the panel. */
    if !menu::pause_active() && !screens::any_open() {
        /* No sdtx_draw here - single flush at the end of the UI block. */
        hotbar_ui::draw(&app.player.borrow().inventory);
        /* Real (non-ASCII) mining progress bar. */
        draw_mining_bar(app, sapp::widthf(), sapp::heightf());
        /* Survival hunger meter (top-left). */
        draw_hunger_bar(app, sapp::widthf(), sapp::heightf());
        /* Farming ground hint: till soil / plant seed. (Plants no longer
         * show a harvest prompt - they're broken like blocks.) */
        draw_farming_hint(app, sapp::widthf(), sapp::heightf());
        /* Machine prompt: "[E] open chest" when aiming at an openable machine
         * (chest, furnace, 3d printer, generator, rocket pad, ...). Machine
         * blocks are disjoint from the farmland/dirt the farming hint fires on,
         * so the two never print over each other. */
        draw_machine_hint(app, sapp::widthf(), sapp::heightf());
        /* Pickup prompt: "[E] pick up flint" / "[E] pick up mossy rock" when
         * aiming at a loose scatter object. Scatter only grows on plain ground,
         * which carries no machine, so this and the machine hint are disjoint. */
        draw_pickup_hint(app, sapp::widthf(), sapp::heightf());
        /* Rocket flight HUD (top-centre) while riding a rocket. */
        draw_rocket_hud(app, sapp::widthf(), sapp::heightf());
        /* Credits wallet (top-right). */
        draw_credits_hud(app, sapp::widthf(), sapp::heightf());
        /* Station dock prompt (in space, within range). */
        draw_station_hint(app, sapp::widthf(), sapp::heightf());
        /* Survival: prompt when the targeted block needs a better tool. */
        draw_tool_gate_hint(app, sapp::widthf(), sapp::heightf());
    }
    /* Sync the hamburger debug-menu + teleport-button visibility with
     * the master F2 toggle every frame. */
    mobile_ui::set_debug_menu_visible(app.debug_ui_visible);
    mobile_ui::set_teleport_visible(app.debug_ui_visible);
    mobile_ui::draw();

    /* Centre-screen reticle dot - gameplay only, mobile_ui_draw just
     * left the alpha pipeline + ortho projection bound for us. */
    {
        let st = menu::state();
        let in_game = st == GameState::InGameSp || st == GameState::InGameMp;
        if in_game && !menu::pause_active() {
            let sw = sapp::widthf();
            let sh = sapp::heightf();
            let dot = 3.0f32;
            mobile_ui::draw_rect(
                sw * 0.5 - dot,
                sh * 0.5 - dot,
                dot * 2.0,
                dot * 2.0,
                1.0,
                1.0,
                1.0,
                0.85,
            );
        }
    }
    /* DOM overlays are mobile-only scaffolding; hide them while the
     * in-canvas pause panel is up so taps don't pass behind it. */
    #[cfg(target_os = "emscripten")]
    {
        let st = menu::state();
        let in_game = st == GameState::InGameSp || st == GameState::InGameMp;
        let show_mobile_dom = in_game && !menu::pause_active();
        let v = show_mobile_dom as i32;
        if v != app.last_pause_btn {
            unsafe { tenebris_pause_button_set_visible(v) };
            app.last_pause_btn = v;
        }
        if v != app.last_inventory_btn {
            unsafe { tenebris_inventory_button_set_visible(v) };
            app.last_inventory_btn = v;
        }
        if v != app.last_mobile {
            unsafe { tenebris_mobile_controls_set_visible(v) };
            app.last_mobile = v;
        }
        if v != app.last_fullscreen_btn {
            unsafe { tenebris_fullscreen_button_set_visible(v) };
            app.last_fullscreen_btn = v;
        }
    }
    /* Pixel-art UI demo. Drawn between the hotbar and the pause panel
     * so it sits above gameplay HUD but below the modal pause overlay.
     * No-op unless F8 has toggled the demo on. */
    pixel_ui::demo_draw();

    /* Inventory + crafting overlay - opened with `E` in gravity or
     * Shift+E in space. The panel itself now renders via egui_ui()
     * (thumbnail grid + crafting); the old sokol panel is retired. */

    /* Shift+E hint toast: paints over the HUD when the player has
     * been mashing plain E in space without the overlay opening.
     * Self-gates on the timer state, so calling unconditionally is
     * cheap. Drawn after the overlay so it sits on top of any open
     * panel - the only case where both would be visible at once is
     * a player tapping E mid-overlay, which is unusual but harmless. */
    inventory_screen::draw_hint();

    /* Pause overlay draws last so the dim backdrop + panel sit on top
     * of every HUD element. No-op when not active. */
    menu::pause_draw(sapp::width(), sapp::height());

    /* Connecting overlay: drawn during the INITIAL MP connect /
     * handshake only (drops after READY route through the pause
     * panel's reconnect UI instead). */
    if menu::state() == GameState::InGameMp
        && net_client::state() != NetClientState::Ready
        && !menu::pause_active()
    {
        let ns = net_client::state();
        let status = match ns {
            NetClientState::Connecting => "OPENING SOCKET",
            NetClientState::Handshake => "WAITING FOR SERVER",
            _ => "RECONNECTING",
        };
        let room = menu::room_code();
        let room_buf = if !room.is_empty() {
            format!("ROOM {}", room)
        } else {
            String::new()
        };
        menu::connecting_draw(sapp::width(), sapp::height(), status, &room_buf);
    }

    /* Frame-time graph (toggle with the profiler key, F3 / P). Drawn
     * last so it sits on top of every HUD element; queues into the same
     * sgl / sdtx batches flushed just below. */
    draw_frame_graph();

    /* egui overlay: build this frame's UI, then record its meshes into the
     * sgl batch so the single sgl_draw below flushes them on top of the
     * sokol HUD. */
    egui_layer::run(sapp::widthf(), sapp::heightf(), |ctx| {
        egui_ui(app, ctx);
    });
    egui_layer::draw();

    /* ONE sgl_draw per frame, at the very end after every UI module
     * has queued its geometry (sokol_gl uploads its vertex buffer only
     * on the first draw of the frame - see the C comment). */
    sgl::draw();

    /* ONE sdtx_draw per frame, same reason. */
    sdtx::draw();
    profiler::end("ui");

    profiler::end_frame();
    renderer::end_frame();
}

/* --------------------------------------------------------------------- */
/* event                                                                   */
/* --------------------------------------------------------------------- */

extern "C" fn event(e: *const sapp::Event) {
    let e = unsafe { &*e };
    /* Input is dead while the staged loader owns the screen - nothing
     * behind the loading bar should react to clicks or keys. */
    if with_app(|a| a.loader.is_some()).unwrap_or(false) {
        return;
    }
    /* The main menu owns input while it's up. The egui-rendered SP
     * screens route through the egui layer; the rest use the sokol
     * menu's own hit-testing. */
    if menu::is_overlay() {
        if menu::state_is_egui() {
            egui_layer::handle_event(e);
        } else {
            menu::handle_event(e);
        }
        return;
    }
    with_app(|app| event_inner(app, e));
}

fn event_inner(app: &mut App, e: &sapp::Event) {
    /* Feed every event to egui so its panels see the mouse / keyboard.
     * (Swallowing from gameplay is added per-screen as each ports over.) */
    egui_layer::handle_event(e);

    /* The mouse wheel belongs to whichever egui panel is open (recipe
     * lists + grids scroll) - without this the same scroll ALSO cycled
     * the hotbar underneath the crafting screen. */
    if e._type == sapp::EventType::MouseScroll && screens::any_open() {
        return;
    }

    /* In-game pause overlay: swallow every event it owns. */
    if menu::pause_active() && menu::pause_event(e) {
        return;
    }
    /* Storage chest + furnace panels: while open they own Esc (their
     * slots are egui widgets, handled in the egui layer). */
    if chest_screen::handle_event(e) {
        return;
    }
    if bonfire_screen::handle_event(e) {
        return;
    }
    if furnace_screen::handle_event(e) {
        return;
    }
    if power_ui::handle_event(e) {
        return;
    }
    /* Orbital trading station hub: swallows input while docked. */
    if station_screen::event(e) {
        return;
    }
    /* Survival craft screen: first crack after pause so B toggles it and,
     * while open, it owns clicks + Esc (closed, it ignores everything and
     * falls through). Always available - not gated on the F2 debug UI. */
    if crafting_screen::handle_event(e, Some(app.player.clone())) {
        return;
    }
    /* Rocket assembly screen: Esc closes it while it owns the pointer. */
    if rocket_screen::handle_event(e) {
        return;
    }

    /* F8: toggle the pixel-art UI demo panel. The demo exercises every
     * widget (panel, button states, slot states, title bar, close X)
     * so the swatch can be eyeballed live while iterating on art and
     * ui.yaml. Wired here, not inside the debug_ui_visible block,
     * because the inventory / crafting screens that ride on this
     * module aren't debug features. */
    /* Stage (default X): jettison the spent booster while flying a rocket.
     * The shed stack becomes a tumbling falling body (reentry plasma +
     * salvage) if more than one stage remains. */
    if e._type == sapp::EventType::KeyDown
        && crate::controls::action_for_key(e.key_code) == Some(crate::controls::Action::Stage)
        && crate::rocket_ride::is_riding()
    {
        let shed = crate::rocket_ride::active_stage_parts();
        if crate::rocket_ride::stage() && !shed.is_empty() {
            let p = app.player.borrow();
            /* Drop it a stack-length below the player, moving with them plus a
             * small backward kick so it visibly separates behind the climb. */
            let along = dvec3_scale(p.basis.up, -(shed.len() as f64) * 1.8);
            let pos = dvec3_add(p.position, along);
            let kick = dvec3_scale(p.basis.up, -6.0);
            let vel = dvec3_add(p.velocity, kick);
            crate::falling_stage::spawn(shed, pos, vel, p.basis.up);
        }
        return;
    }
    if e._type == sapp::EventType::KeyDown
        && crate::controls::action_for_key(e.key_code) == Some(crate::controls::Action::PixelUiDemo)
    {
        pixel_ui::demo_toggle();
        return;
    }

    /* Tech-block interaction: plain E while looking at a placed station
     * opens that station's screen (launch pad -> rocket assembly, furnace
     * -> smelting). Checked before the inventory toggle so the block is
     * the in-world entry point; Shift+E stays the inventory binding, and
     * a non-station target falls through to the normal E behaviour. */
    let interact_pressed = e._type == sapp::EventType::KeyDown
        && crate::controls::action_for_key(e.key_code) == Some(crate::controls::Action::Interact);
    /* Dock at the orbital trading station: Interact while in space within
     * dock range opens the station hub (the interact raycast is skipped in
     * space, so this can't shadow a machine). */
    if interact_pressed
        && app.player.borrow().is_in_space
        && station_screen::dock_distance_m(app.player.borrow().position)
            <= station_screen::DOCK_RADIUS_M
    {
        station_screen::open(app.player.clone());
        return;
    }
    if interact_pressed && app.interact.has_target && !app.interact.is_torch_target {
        let targeted = app
            .world
            .borrow()
            .get(app.interact.hit_tile, app.interact.hit_depth);
        match targeted {
            Block::LaunchPad => {
                rocket_screen::open(
                    app.world.clone(),
                    app.player.clone(),
                    app.interact.hit_tile,
                    app.interact.hit_depth,
                );
                return;
            }
            Block::Furnace => {
                furnace_screen::open(
                    app.world.clone(),
                    app.player.clone(),
                    app.interact.hit_tile,
                    app.interact.hit_depth,
                );
                return;
            }
            /* A placed bonfire opens its cook + fuel panel (feed it wood
             * to keep it lit; cook meat / char logs). */
            Block::Bonfire => {
                bonfire_screen::open(
                    app.world.clone(),
                    app.player.clone(),
                    app.interact.hit_tile,
                    app.interact.hit_depth,
                );
                return;
            }
            /* The electronics workbench opens the crafting screen scoped to
             * its own station (cpu chip / ram / motherboard / power supply /
             * print nozzle), the same way the furnace gates smelting. */
            Block::ElectronicsWorkbench => {
                crafting_screen::open_station(
                    Some(app.player.clone()),
                    Some(tenebris_core::items::from_block(Block::ElectronicsWorkbench)),
                );
                return;
            }
            /* A placed storage chest opens its 27-slot inventory panel. */
            Block::StorageChest => {
                chest_screen::open(
                    app.world.clone(),
                    app.player.clone(),
                    app.interact.hit_tile,
                    app.interact.hit_depth,
                );
                return;
            }
            /* Powered machines. */
            Block::SteamEngine => {
                power_ui::open_steam(
                    app.world.clone(),
                    app.player.clone(),
                    app.interact.hit_tile,
                    app.interact.hit_depth,
                );
                return;
            }
            Block::ElectricFurnace => {
                power_ui::open_electric(
                    app.world.clone(),
                    app.player.clone(),
                    app.interact.hit_tile,
                    app.interact.hit_depth,
                );
                return;
            }
            Block::HydroGenerator => {
                power_ui::open_hydro(
                    app.world.clone(),
                    app.player.clone(),
                    app.interact.hit_tile,
                    app.interact.hit_depth,
                );
                return;
            }
            Block::Computer => {
                power_ui::open_computer(
                    app.world.clone(),
                    app.player.clone(),
                    app.interact.hit_tile,
                    app.interact.hit_depth,
                );
                return;
            }
            Block::Printer3D => {
                power_ui::open_printer(
                    app.world.clone(),
                    app.player.clone(),
                    app.interact.hit_tile,
                    app.interact.hit_depth,
                );
                return;
            }
            _ => {}
        }
    }

    /* Interact (default E) on a loose scatter object under the reticle:
     * pick it up. Hovering a flint pebble or a leafy bush mound and
     * pressing E gathers it, so the thing the player SEES on the ground is
     * the thing E collects - the same gather the bare-hands right-click
     * forage does, sharing interact::scatter_pickup_item. Checked before
     * the inventory toggle (like the station screens above); plain ground
     * finds nothing and falls through to the normal E behaviour. */
    if interact_pressed {
        let picked = {
            let w = app.world.borrow();
            let p = app.player.borrow();
            crate::interact::try_pickup_scatter(&app.interact, &w, &p)
        };
        if picked {
            return;
        }
    }

    /* Interact (default E) with no machine under the reticle: toggle the
     * inventory / crafting overlay. Same everywhere now - roll moved to
     * Q / R (see controls.yaml), so E no longer doubles as roll-right in
     * space and needs no shift modifier or space special-case. */
    if interact_pressed {
        inventory_screen::toggle();
        /* Mutually exclusive with the craft panel - only one survival
         * overlay up at a time so their input + sdtx text never collide. */
        if inventory_screen::is_open() {
            crafting_screen::close();
            rocket_screen::close();
        }
        return;
    }
    /* K: toggle the tech-tree / progression guide overlay. */
    if e._type == sapp::EventType::KeyDown
        && crate::controls::action_for_key(e.key_code) == Some(crate::controls::Action::OpenTechTree)
    {
        tech_tree::toggle();
        if tech_tree::is_open() {
            inventory_screen::close();
            crafting_screen::close();
            rocket_screen::close();
        }
        return;
    }
    if tech_tree::event(e) {
        pixel_ui::event(e);
        return;
    }
    if inventory_screen::event(e) {
        /* Still pump pixel_ui for mouse movement / clicks so the
         * inventory's widgets stay live. */
        pixel_ui::event(e);
        return;
    }

    /* Pump mouse / touch state into the pixel UI even when nothing is
     * open - keeps the cursor warm so a screen can open mid-frame and
     * pick up an already-correct hot state. The pixel UI's widget
     * functions are what actually decide whether to consume a click;
     * pixel_ui::event itself never claims an event. When a UI screen
     * (the demo for now) is visible, swallow the click below the
     * widget layer so it doesn't also dig the world. */
    pixel_ui::event(e);
    if pixel_ui::demo_visible() {
        match e._type {
            sapp::EventType::MouseDown
            | sapp::EventType::MouseUp
            | sapp::EventType::TouchesBegan
            | sapp::EventType::TouchesEnded
            | sapp::EventType::TouchesCancelled => return,
            _ => {}
        }
    }

    /* Escape opens the pause panel directly. Reliable on native, where
     * nothing releases pointer lock for the web detector above to catch.
     * crafting / inventory get first crack earlier and close themselves
     * on Esc, so reaching here means none are open - bring up pause as a
     * modal, defensively closing any HUD overlay first so nothing draws
     * over it. */
    if e._type == sapp::EventType::KeyDown
        && crate::controls::action_for_key(e.key_code) == Some(crate::controls::Action::Pause)
    {
        let st = menu::state();
        if (st == GameState::InGameSp || st == GameState::InGameMp) && !menu::pause_active() {
            screens::close_all();
            menu::pause_toggle();
            /* Release the pointer lock so the cursor actually appears over
             * the (egui) pause panel - show_mouse alone can't reveal a
             * captured pointer. */
            sapp::lock_mouse(false);
            sapp::show_mouse(true);
        }
        return;
    }
    /* Chat takes Enter (open compose) + every keystroke while
     * composing. */
    if chat::event(e) {
        return;
    }
    /* Teleport menu gets first crack when open - gated on the F2
     * debug master. */
    if app.debug_ui_visible && teleport_menu::handle_event(e, Some(app.player.clone())) {
        return;
    }
    /* F2 toggles the master debug-UI visibility; stays live always. */
    if e._type == sapp::EventType::KeyDown
        && crate::controls::action_for_key(e.key_code) == Some(crate::controls::Action::ToggleDebugUi)
    {
        app.debug_ui_visible = !app.debug_ui_visible;
        return;
    }
    /* Players roster stays available regardless of the debug master - it is
     * gameplay-facing. */
    if e._type == sapp::EventType::KeyDown
        && crate::controls::action_for_key(e.key_code) == Some(crate::controls::Action::PlayersPanel)
    {
        app.players_panel_visible = !app.players_panel_visible;
        return;
    }
    if e._type == sapp::EventType::KeyDown
        && crate::controls::action_for_key(e.key_code) == Some(crate::controls::Action::BlockSnapshot)
    {
        /* Block snapshot to the console. Not gated on the debug master. */
        print_block_snapshot(app);
        return;
    }
    if e._type == sapp::EventType::KeyDown
        && crate::controls::action_for_key(e.key_code) == Some(crate::controls::Action::FlowDebug)
    {
        /* Water-flow debug arrows + console confirmation. */
        let on = !renderer::flow_debug();
        renderer::set_flow_debug(on);
        let mut n_origins = 0;
        world_water::origin_visit_all(&app.world.borrow(), |_t, _d| n_origins += 1);
        println!(
            "[flow-debug] F5 toggled {} (origin cells in world: {})",
            if on { "ON" } else { "OFF" },
            n_origins
        );
        return;
    }
    if app.debug_ui_visible {
        let dbg = |a| {
            e._type == sapp::EventType::KeyDown
                && crate::controls::action_for_key(e.key_code) == Some(a)
        };
        if dbg(crate::controls::Action::ToggleTerrain) {
            renderer::set_terrain_visible(!renderer::terrain_visible());
            return;
        }
        if dbg(crate::controls::Action::ToggleWater) {
            renderer::set_water_visible(!renderer::water_visible());
            return;
        }
        if dbg(crate::controls::Action::ToggleSkybox) {
            renderer::set_skybox_visible(!renderer::skybox_visible());
            return;
        }
        if e._type == sapp::EventType::KeyDown
            && crate::controls::action_for_key(e.key_code)
                == Some(crate::controls::Action::ToggleProfiler)
        {
            profiler::toggle_visible();
            return;
        }
    }

    /* (Mobile pause button is an HTML overlay - its click handler
     * calls tenebris_js_pause_pressed via Module.ccall.) */

    /* Mobile hamburger hit-test - only while the debug UI is shown. */
    if app.debug_ui_visible {
        if e._type == sapp::EventType::TouchesBegan
            && e.num_touches > 0
            && mobile_ui::handle_touch(e.touches[0].pos_x, e.touches[0].pos_y)
        {
            return;
        }
        if e._type == sapp::EventType::MouseDown
            && e.mouse_button == sapp::Mousebutton::Left
            && mobile_ui::handle_touch(e.mouse_x, e.mouse_y)
        {
            return;
        }
    }
    /* A modal screen owns the pointer while it's up, so gameplay input must
     * not also see this event. egui already got it at the top of
     * event_inner, and the screen's own handle_event had first refusal on
     * Esc; anything still here would leak behind the panel.
     *
     * This is load-bearing beyond "no camera turn / no block break behind an
     * open panel": input::handle_event re-locks the pointer on ANY MouseDown
     * (input.rs:841), so without this gate the first click on a bonfire /
     * chest / furnace slot would yank the cursor away from the very panel
     * that just released it. The pause menu used to mask that by eating
     * these clicks itself - back when opening a machine wrongly opened
     * pause. It doesn't anymore, so the gate has to be real.
     *
     * KeyUp is deliberately still forwarded: it can only ever RELEASE a key.
     * Dropping it would latch whatever was held when the panel opened - hold
     * W, press E on a bonfire, release W, and the player would walk off on
     * close, since nothing clears input state on open. */
    if screens::any_open() {
        if e._type == sapp::EventType::KeyUp {
            input::handle_event(e);
        }
        return;
    }
    input::handle_event(e);
}

/* --------------------------------------------------------------------- */
/* cleanup                                                                 */
/* --------------------------------------------------------------------- */

extern "C" fn cleanup() {
    net_client::disconnect();
    chat::shutdown();
    remote_players::shutdown();
    menu::shutdown();
    teleport_menu::shutdown();
    crafting_screen::shutdown();
    hotbar_ui::shutdown();
    mobile_ui::shutdown();
    torch::shutdown();
    renderer::shutdown();
    APP.with(|cell| {
        if let Some(app) = cell.borrow_mut().as_mut() {
            app.moons.clear();
        }
        /* world_destroy: dropping the Rc graph is the Rust analogue. */
        *cell.borrow_mut() = None;
    });
    job_system::shutdown();
    sdtx::shutdown();
    sg::shutdown();
}

/* --------------------------------------------------------------------- */
/* sokol_main                                                              */
/* --------------------------------------------------------------------- */

/// Port of `sokol_main()`. Called from `main()`.
pub fn run() {
    sapp::run(&sapp::Desc {
        init_cb: Some(init),
        frame_cb: Some(frame),
        event_cb: Some(event),
        cleanup_cb: Some(cleanup),
        width: 1280,
        height: 720,
        window_title: c"Tenebris".as_ptr(),
        icon: sapp::IconDesc {
            sokol_default: true,
            ..Default::default()
        },
        logger: sapp::Logger {
            func: Some(sokol::log::slog_func),
            ..Default::default()
        },
        ..Default::default()
    });
}

/* --------------------------------------------------------------------- */
/* Web glue: extern declarations for the EM_JS bodies that moved to
 * web/library_tenebris.js, plus the EMSCRIPTEN_KEEPALIVE re-entry
 * points the JS side invokes via Module.ccall. Keep the signatures in
 * lockstep with the JS library (and the EXPORTED_FUNCTIONS list in
 * build-web.*). */
/* --------------------------------------------------------------------- */

#[cfg(target_os = "emscripten")]
extern "C" {
    /// `?server=` query param; malloc'd C string or NULL.
    fn tenebris_get_server_url() -> *mut core::ffi::c_char;
    /// 1 on mobile/tablet (or ?perf=lite override), else 0.
    fn tenebris_is_mobile_device() -> i32;
    /// `?room=` / `?invite=` query param; malloc'd C string or NULL.
    fn tenebris_get_room_code() -> *mut core::ffi::c_char;
    fn tenebris_block_f5_refresh();
    fn tenebris_pause_button_install();
    fn tenebris_pause_button_set_visible(visible: i32);
    fn tenebris_inventory_button_install();
    fn tenebris_inventory_button_set_visible(visible: i32);
    fn tenebris_fullscreen_button_install();
    fn tenebris_fullscreen_button_set_visible(visible: i32);
    fn tenebris_mobile_controls_install();
    fn tenebris_mobile_controls_set_visible(visible: i32);
    /// Emscripten heap free - releases the JS-side `_malloc` buffers.
    fn free(ptr: *mut core::ffi::c_void);
}

/// Take ownership of a `_malloc`'d NUL-terminated UTF-8 string handed
/// back by the JS library (same helper shape as client_kv's).
#[cfg(target_os = "emscripten")]
unsafe fn take_js_cstring(p: *mut core::ffi::c_char) -> Option<String> {
    if p.is_null() {
        return None;
    }
    let s = core::ffi::CStr::from_ptr(p).to_string_lossy().into_owned();
    free(p as *mut core::ffi::c_void);
    Some(s)
}

/* EMSCRIPTEN_KEEPALIVE callbacks. JS calls these via Module.ccall;
 * they must appear in -sEXPORTED_FUNCTIONS at link time. */
#[cfg(target_os = "emscripten")]
mod js_callbacks {
    use super::*;

    /// JS pause button tapped. Same effect as Escape on desktop.
    #[no_mangle]
    pub extern "C" fn tenebris_js_pause_pressed() {
        menu::pause_toggle();
        if menu::pause_active() {
            sapp::lock_mouse(false);
            sapp::show_mouse(true);
        }
    }

    /// JS inventory button tapped. inventory_screen::toggle owns the
    /// pointer-lock + cursor-show release so this stays a thin
    /// wrapper - same destination Shift+E reaches, so the two input
    /// paths share state with no second source of truth.
    #[no_mangle]
    pub extern "C" fn tenebris_js_inventory_pressed() {
        inventory_screen::toggle();
    }

    #[no_mangle]
    pub extern "C" fn tenebris_js_set_move_stick(x: f64, y: f64, active: i32) {
        input::js_set_move_stick(x, y, active != 0);
    }

    #[no_mangle]
    pub extern "C" fn tenebris_js_set_look_stick(x: f64, y: f64, active: i32) {
        input::js_set_look_stick(x, y, active != 0);
    }

    #[no_mangle]
    pub extern "C" fn tenebris_js_set_break(held: i32) {
        input::js_set_break(held != 0);
    }

    #[no_mangle]
    pub extern "C" fn tenebris_js_set_place(held: i32) {
        input::js_set_place(held != 0);
    }

    #[no_mangle]
    pub extern "C" fn tenebris_js_set_jump(held: i32) {
        input::js_set_jump(held != 0);
    }

    /// Re-entry from the /saves fetch promise (C:
    /// `net_client_saves_audit_cb`).
    #[no_mangle]
    pub extern "C" fn net_client_saves_audit_cb(json: *const core::ffi::c_char) {
        if json.is_null() {
            return;
        }
        let s = unsafe { core::ffi::CStr::from_ptr(json) }.to_string_lossy();
        net_client::saves_audit_cb(&s);
    }

    /// Re-entry from the /saves/body fetch promise (C:
    /// `net_client_body_blob_cb`).
    #[no_mangle]
    pub extern "C" fn net_client_body_blob_cb(body_id: u32, data: *const u8, len: i32) {
        if data.is_null() || len <= 0 {
            net_client::body_blob_cb(body_id, &[]);
            return;
        }
        let slice = unsafe { std::slice::from_raw_parts(data, len as usize) };
        net_client::body_blob_cb(body_id, slice);
    }
}

/* --------------------------------------------------------------------- */
/* Tests - the factorable app-level logic. The frame fn itself is
 * exercised by the native launch smoke run.                              */
/* --------------------------------------------------------------------- */

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fps_smoothing_converges_toward_instant_rate() {
        /* 60 fps steady state stays ~60. */
        let mut fps = 60.0f32;
        for _ in 0..100 {
            fps = smoothed_fps_next(fps, 1.0 / 60.0);
        }
        assert!((fps - 60.0).abs() < 0.01, "fps={}", fps);
        /* Single 30 fps frame moves it exactly 10% of the way. */
        let n = smoothed_fps_next(60.0, 1.0 / 30.0);
        assert!((n - (60.0 * 0.9 + 30.0 * 0.1)).abs() < 1e-4);
        /* dt == 0 treats instantaneous fps as 0 (C: dt > 0 ? 1/dt : 0). */
        let z = smoothed_fps_next(60.0, 0.0);
        assert!((z - 54.0).abs() < 1e-4);
    }

    #[test]
    fn lag_clamp_only_fires_above_threshold() {
        assert_eq!(lag_clamp(0.016), (0.016, false));
        assert_eq!(lag_clamp(0.1), (0.1, false)); /* boundary: C uses strict > */
        let (dt, spiked) = lag_clamp(0.75);
        assert!(spiked);
        assert_eq!(dt, LAG_SPIKE_S);
    }

    #[test]
    fn accum_fire_matches_c_cadence() {
        /* 5 s cadence at 1 s steps: fires on the 5th add, resets. */
        let mut acc = 0.0f64;
        let mut fires = 0;
        for _ in 0..10 {
            if accum_fire(&mut acc, 1.0, 5.0) {
                fires += 1;
            }
        }
        assert_eq!(fires, 2);
        /* C resets to 0.0 (drops the overshoot) rather than carrying
         * the remainder. */
        let mut acc = 0.0f64;
        assert!(accum_fire(&mut acc, 7.5, 5.0));
        assert_eq!(acc, 0.0);
    }

    #[test]
    fn mode_prime_transitions() {
        let sp = GameState::InGameSp as i32;
        let mp = GameState::InGameMp as i32;
        let menu_s = GameState::MainMenu as i32;
        /* -1 = never primed: first gameplay entry primes. */
        assert_eq!(mode_prime_action(mp, -1), Some(PrimeAction::EnterMp));
        assert_eq!(mode_prime_action(sp, -1), Some(PrimeAction::EnterSp));
        /* Same state as last prime: no re-fire (the C early-return). */
        assert_eq!(mode_prime_action(mp, mp), None);
        assert_eq!(mode_prime_action(sp, sp), None);
        /* SP <-> MP transitions re-prime. */
        assert_eq!(mode_prime_action(sp, mp), Some(PrimeAction::EnterSp));
        assert_eq!(mode_prime_action(mp, sp), Some(PrimeAction::EnterMp));
        /* Leaving to the menu doesn't prime anything. */
        assert_eq!(mode_prime_action(menu_s, mp), None);
    }

    #[test]
    fn spawn_snap_window() {
        let surface_r = 1000.0;
        /* At/below the surface (caves): untouched. */
        assert_eq!(spawn_snap_radius(999.0, surface_r), None);
        assert_eq!(spawn_snap_radius(1000.0, surface_r), None);
        /* Sub-threshold procgen-vs-mesh noise: untouched (<= 3 m). */
        assert_eq!(spawn_snap_radius(1003.0, surface_r), None);
        /* Mid-jump / jetpack saves: snapped to surface + 1.5. */
        assert_eq!(spawn_snap_radius(1010.0, surface_r), Some(1001.5));
        assert_eq!(spawn_snap_radius(1099.9, surface_r), Some(1001.5));
        /* Space flight: untouched (>= 100 m). */
        assert_eq!(spawn_snap_radius(1100.0, surface_r), None);
        assert_eq!(spawn_snap_radius(1500.0, surface_r), None);
    }

    #[test]
    fn lat_lon_basics() {
        let body = planet::get(BodyId::Tenebris);
        let r = body.radius_m;
        let at = |x: f64, y: f64, z: f64| {
            player_lat_lon_deg(
                dvec3_make(body.pos_x + x, body.pos_y + y, body.pos_z + z),
                &body,
            )
        };
        /* +y pole = +90 lat. */
        let (lat, _lon, alt) = at(0.0, r, 0.0);
        assert!((lat - 90.0).abs() < 1e-9);
        assert!(alt.abs() < 1e-6);
        /* +x equator = lat 0, lon 0. */
        let (lat, lon, _) = at(r, 0.0, 0.0);
        assert!(lat.abs() < 1e-9);
        assert!(lon.abs() < 1e-9);
        /* +z equator = lon +90. */
        let (_, lon, _) = at(0.0, 0.0, r);
        assert!((lon - 90.0).abs() < 1e-9);
        /* Degenerate centre: alt = -radius. */
        let (lat, lon, alt) = at(0.0, 0.0, 0.0);
        assert_eq!((lat, lon), (0.0, 0.0));
        assert!((alt + r).abs() < 1e-9);
        /* Altitude offset. */
        let (_, _, alt) = at(r + 25.0, 0.0, 0.0);
        assert!((alt - 25.0).abs() < 1e-9);
    }

    #[test]
    fn room_code_normalisation_mirrors_js() {
        /* JS: s.toUpperCase().substring(0, 8). */
        assert_eq!(normalize_room_code("abcd23"), "ABCD23");
        assert_eq!(normalize_room_code("abcdefghijk"), "ABCDEFGH");
        assert_eq!(normalize_room_code(""), "");
        /* Idempotent on already-normalised input. */
        assert_eq!(normalize_room_code("ABCD23"), "ABCD23");
    }

    #[test]
    fn snapshot_glyphs() {
        assert_eq!(block_glyph(Block::Air), 'a');
        assert_eq!(block_glyph(Block::Stone), '#');
        assert_eq!(block_glyph(Block::SeqGrass), 'g'); /* base biome glyph */
        assert_eq!(block_glyph(Block::Bedrock), 'b');
        assert_eq!(block_name(Block::SeqDirtSnow), "SEQ_DIRT_SNOW");
        /* Water glyphs come from the state byte. */
        let pk = world_water::state_pack(false, false, 3);
        assert_eq!(world_water::state_level(pk), 3);
    }
}
