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
    dvec3_add, dvec3_length, dvec3_make, dvec3_scale, dvec3_sub, dvec3_to_vec3, vec3_normalize,
    DVec3, Vec3,
};
use tenebris_core::planet::{self, BodyConfig, BodyId, BODY_COUNT};
use tenebris_core::planet_gen;
use tenebris_core::proto::{BODY_ID_IN_SPACE, TENEBRIS_PROTOCOL_VERSION};
use tenebris_core::world::{World, WORLD_MAX_DEPTH};
use tenebris_core::world_water;

use crate::chat;
use crate::crafting_screen;
use crate::gfx_math::{mat4_perspective, Mat4};
use crate::hotbar_ui;
use crate::input;
use crate::interact::{self, InteractState, MINING_TIME_S};
use crate::chest_screen;
use crate::egui_layer;
use crate::furnace_screen;
use crate::power_ui;
use crate::ui_icons;
use crate::inventory::{self, INV_HOTBAR_SLOTS};
use crate::inventory_screen;
use crate::item_atlas;
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
}

/// Dev-only: once in-game and a few frames settled, drop the requested dev
/// blocks at the tile under the reticle and frame them. Self-disables
/// after firing.
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
    if center < 0 {
        return;
    }

    match DEV_PLACE_MODE.with(|c| c.get()) {
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
                pad.push(items::ROCKET_ENGINE);
                pad.push(items::FUEL_TANK);
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
                pad.push(items::ROCKET_ENGINE);
                pad.push(items::FUEL_TANK);
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
    /* Install the crafting recipe table from data so the craft screen
     * and the bag bridge can read it (see core::crafting). */
    tenebris_core::crafting::set_recipes(tenebris_core::crafting::load_recipes(
        "assets/config/recipes.yaml",
    ));
    /* Survival mining + ore-drop tuning. */
    tenebris_core::mining::load_config("assets/config/mining.yaml");
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
    item_atlas::init();
    ui_icons::init();
    inventory_screen::init();
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

    /* Drain Tenebris gen synchronously at init so the spawn tile has
     * terrain the moment the first frame lands. */
    {
        let mut w = world.borrow_mut();
        while !w.gen_complete() {
            let n = w.tile_count;
            w.stream_gen(n);
        }
    }
    /* Register Tenebris first so it becomes the active body - gets
     * streaming + edit handling. Anything registered after will be
     * one-shot meshed at register time (non-active moons/asteroids). */
    renderer::register_world(&world);

    /* Build and register every non-main body - moons, neighbouring
     * planets, the asteroid belt. Fully generated + chunked at boot so
     * block edits on any of them go through the same dirty-rebuild
     * path the active body uses. */
    let mut moons: Vec<Rc<RefCell<World>>> = Vec::new();
    for id in (BodyId::Luna as i32)..(BODY_COUNT as i32) {
        let Some(b) = planet::get_by_index(id) else { continue };
        let body_world = Rc::new(RefCell::new(World::create(
            &b,
            planet::subdivisions_for_radius(b.radius_m),
        )));
        {
            let mut w = body_world.borrow_mut();
            while !w.gen_complete() {
                let n = w.tile_count;
                w.stream_gen(n);
            }
        }
        renderer::register_world(&body_world);
        if moons.len() < 32 {
            moons.push(body_world);
        }
    }

    /* Spawn above the surface at (1, 0, 0). Surface altitude sampled
     * directly so we don't depend on any tile being generated yet. */
    {
        let dir = dvec3_make(1.0, 0.0, 0.0);
        let mut surface_m = planet_gen::surface_altitude(&body, dir);
        if surface_m < 0.5 {
            surface_m = 0.5;
        }
        player.borrow_mut().position =
            dvec3_scale(dir, body.radius_m + surface_m as f64 + 8.0);
    }

    /* Show the main menu after worldgen finishes. SP / MP buttons
     * drive the transition into gameplay. */
    menu::init();
    remote_players::init();
    chat::init();

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
        menu::dev_start_sp(name);
    }
    if std::env::var("TENEBRIS_DEV_CRAFT").is_ok() {
        crafting_screen::open(Some(player.clone()));
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
        if p.survival_mode { "SURVIVAL" } else { "CREATIVE" }
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
    if !app.player.borrow().survival_mode {
        return;
    }
    if app.interact.mining_progress_s <= 0.0 {
        return;
    }

    let mut pct = app.interact.mining_progress_s / MINING_TIME_S;
    pct = pct.clamp(0.0, 1.0);

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

    /* Apply persisted column + torch data for the SPAWN body only.
     * Other bodies' saves are flushed lazily by apply_sp_saves_lazy
     * the first time each body is detail-meshed. */
    let spawn_world = app.world.clone();
    apply_sp_world_saves(&spawn_world);
    mark_sp_saves_applied(app, &spawn_world);

    let Some(s) = menu::take_sp_resume() else {
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
            /* MP defaults to survival: blocks have quantity. Torches
             * still flow in unlimited via inventory_init_empty. */
            let mut p = app.player.borrow_mut();
            p.survival_mode = true;
            inventory::init_empty(&mut p.inventory);
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
            /* SP stays creative by default; G still toggles. */
            let mut p = app.player.borrow_mut();
            p.survival_mode = false;
            inventory::init_creative(&mut p.inventory);
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
    };
    persistence::save(&world, &s);
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
        Block::Grass | Block::SeqGrass => 'g',
        Block::Stone | Block::CragRock | Block::AsteroidRock => '#',
        Block::Ice | Block::FrostIce => 'i',
        Block::Snow | Block::SeqSnow => 's',
        Block::DirtGrass | Block::DirtSnow | Block::SeqDirtGrass | Block::SeqDirtSnow => 'D',
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
/* frame                                                                   */
/* --------------------------------------------------------------------- */

extern "C" fn frame() {
    /* Pump the network state machine first so any handshake progress
     * is reflected in this frame's HUD. */
    net_client::tick();
    /* Let the menu observe the net state and promote a dropped MP
     * socket to the modal error popup BEFORE the overlay short-circuit
     * below. */
    menu::tick();

    /* In the main menu, draw the menu overlay and skip the entire game
     * update path. */
    if menu::is_overlay() {
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
        menu::draw(sapp::widthf() as i32, sapp::heightf() as i32);
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
    chest_screen::egui_ui(ctx);
    furnace_screen::egui_ui(ctx);
    power_ui::egui_ui(ctx);
    rocket_screen::egui_ui(ctx);
}

fn frame_inner(app: &mut App) {
    maybe_apply_sp_resume(app);
    dev_maybe_place(app);
    apply_sp_saves_lazy(app);
    maybe_apply_mp_spawn(app);
    maybe_prime_mode_for_state(app);

    /* Pointer-lock-loss -> open pause menu. The browser eats the first
     * Escape press to release pointer lock; detecting the lock-state
     * transition is what gets the pause panel up on a SINGLE Esc. */
    {
        let now_locked = sapp::mouse_locked();
        let st = menu::state();
        let in_gameplay = st == GameState::InGameSp || st == GameState::InGameMp;
        /* Web pointer-lock-loss fallback: the browser eats the Esc that
         * releases pointer lock, so we synthesize the pause-open from the
         * lock-state transition. Guard against overlays that legitimately
         * release the mouse (inventory / crafting) - opening the
         * inventory unlocks the mouse and must NOT trip the pause panel.
         * On native, the direct Esc handler in event_inner is the real
         * opener; this stays for the web Esc path. */
        let overlay_open = inventory_screen::is_open() || crafting_screen::is_open();
        if in_gameplay
            && app.was_mouse_locked
            && !now_locked
            && !menu::pause_active()
            && !overlay_open
        {
            menu::pause_toggle();
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

    /* G-key toggles survival mode in SP only (MP is always survival).
     * Consume the edge either way. */
    if input::consume_survival_toggle() && menu::state() == GameState::InGameSp {
        let mut p = app.player.borrow_mut();
        p.survival_mode = !p.survival_mode;
        if p.survival_mode {
            inventory::init_empty(&mut p.inventory);
        } else {
            inventory::init_creative(&mut p.inventory);
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
                p.inventory.slots[i].block_type =
                    Block::from_raw(pend_type[i] as u8).unwrap_or(Block::Air);
                p.inventory.slots[i].count = pend_count[i] as i32;
            }
            if pend_sel >= 0 && (pend_sel as usize) < INV_HOTBAR_SLOTS {
                p.inventory.selected = pend_sel;
            }
            /* Re-stamp the reserved torch + water slots after any
             * restore. */
            inventory::ensure_reserved_torch(&mut p.inventory);
            inventory::ensure_reserved_water(&mut p.inventory);
        }
        let p = app.player.borrow();
        let mut cur_type = [0u16; 9];
        let mut cur_count = [0i16; 9];
        for i in 0..9 {
            if i < INV_HOTBAR_SLOTS {
                cur_type[i] = p.inventory.slots[i].block_type.raw() as u16;
                /* Clamp the creative "essentially infinite" count to
                 * i16::MAX so the wire round-trips cleanly. */
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
        interact::update(
            &mut app.interact,
            &mut phys_world.borrow_mut(),
            &mut app.player.borrow_mut(),
            dt,
        );
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
            for w_rc in &worlds {
                let mut w = w_rc.borrow_mut();
                world_water::step(&mut w, budget);
                /* Placed-machine behavior (furnace smelt, later generators
                 * / printer). Persist same-frame in SP when a smelt
                 * completes (a durable output change). */
                let machines_changed = w.tick_machines(dt);
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

    /* Sun lives along the canonical sky-light direction at a far fixed
     * position. */
    const SUN_DIST: f32 = 8000.0;
    const SUN_RADIUS: f32 = 240.0;
    let sun_dir = vec3_normalize(Vec3 { x: 0.5, y: 0.9, z: 0.3 });
    let sun_pos = Vec3 {
        x: sun_dir.x * SUN_DIST,
        y: sun_dir.y * SUN_DIST,
        z: sun_dir.z * SUN_DIST,
    };
    /* Atmosphere is anchored to whatever body the player is currently
     * standing on. Zeroed per-body fields fall back to the tuned
     * defaults (see the C commentary). */
    let active_body = app.player.borrow().body.unwrap_or(app.body);
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

    renderer::begin_frame(sapp::width(), sapp::height(), env);
    /* Opaque scene -> offscreen colour + depth attachments. */
    profiler::begin("draw-skybox");
    renderer::draw_skybox(view, proj);
    profiler::end("draw-skybox");
    profiler::begin("draw-sun");
    renderer::draw_sun(view, proj);
    profiler::end("draw-sun");
    profiler::begin("draw-world");
    /* Pass the active body's world, not G.world - hardcoding G.world
     * reverted active to Tenebris every frame (LOD flap on Crag). */
    renderer::draw_world(view, proj, &phys_world, cam_world, dt);
    profiler::end("draw-world");
    profiler::begin("draw-moons");
    renderer::draw_moons(view, proj, cam_world);
    profiler::end("draw-moons");
    profiler::begin("draw-torches");
    renderer::draw_torches(view, proj);
    profiler::end("draw-torches");

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
    /* Gameplay HUD - hidden while the pause panel OR the inventory
     * overlay is up. Pause: its sdtx text flushes on top of ALL sgl
     * geometry and would bleed over the modal. Inventory: it draws its
     * own hotbar row, so showing the HUD hotbar too would put two
     * hotbars on screen. */
    if !menu::pause_active() && !inventory_screen::is_open() && !rocket_screen::is_open() {
        /* No sdtx_draw here - single flush at the end of the UI block. */
        hotbar_ui::draw(&app.player.borrow().inventory);
        /* Real (non-ASCII) mining progress bar. */
        draw_mining_bar(app, sapp::widthf(), sapp::heightf());
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
     * Shift+E in space, closed with the same. Drawn after the
     * gameplay HUD so it sits on top of the hotbar; before the pause
     * panel so pause still wins when both are open. */
    inventory_screen::draw(&mut app.player.borrow_mut().inventory);

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
    /* The main menu owns input while it's up. */
    if menu::is_overlay() {
        menu::handle_event(e);
        return;
    }
    with_app(|app| event_inner(app, e));
}

fn event_inner(app: &mut App, e: &sapp::Event) {
    /* Feed every event to egui so its panels see the mouse / keyboard.
     * (Swallowing from gameplay is added per-screen as each ports over.) */
    egui_layer::handle_event(e);

    /* In-game pause overlay: swallow every event it owns. */
    if menu::pause_active() && menu::pause_event(e) {
        return;
    }
    /* Storage chest + furnace panels: while open they own Esc (their
     * slots are egui widgets, handled in the egui layer). */
    if chest_screen::handle_event(e) {
        return;
    }
    if furnace_screen::handle_event(e) {
        return;
    }
    if power_ui::handle_event(e) {
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
    if e._type == sapp::EventType::KeyDown && e.key_code == sapp::Keycode::F8 {
        pixel_ui::demo_toggle();
        return;
    }

    /* Tech-block interaction: plain E while looking at a placed station
     * opens that station's screen (launch pad -> rocket assembly, furnace
     * -> smelting). Checked before the inventory toggle so the block is
     * the in-world entry point; Shift+E stays the inventory binding, and
     * a non-station target falls through to the normal E behaviour. */
    if e._type == sapp::EventType::KeyDown
        && e.key_code == sapp::Keycode::E
        && (e.modifiers & sapp::MODIFIER_SHIFT) == 0
        && app.interact.has_target
        && !app.interact.is_torch_target
    {
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

    /* E: toggle the inventory / crafting overlay.
     *
     *   In gravity:        E              -> toggles
     *   In space:          E              -> roll-right (legacy), and
     *                                       a few rapid taps fires the
     *                                       Shift+E hint toast.
     *   Anywhere:          Shift+E        -> toggles
     *   While overlay open: any E          -> closes
     *
     * The branching here is so the player who came in from a planet
     * surface, where plain E worked, doesn't lose roll-control the
     * moment they leave gravity - but also gets a visible nudge that
     * the binding moved. The toggle path swallows the event; the
     * roll path falls through to input.rs's existing
     * Keycode::E -> roll_right wiring. */
    if e._type == sapp::EventType::KeyDown && e.key_code == sapp::Keycode::E {
        let shift_held = (e.modifiers & sapp::MODIFIER_SHIFT) != 0;
        let in_space = app.player.borrow().is_in_space;
        let inv_open = inventory_screen::is_open();
        if inv_open || !in_space || shift_held {
            inventory_screen::toggle();
            /* Mutually exclusive with the craft panel - only one
             * survival overlay up at a time so their input + sdtx text
             * never collide. */
            if inventory_screen::is_open() {
                crafting_screen::close();
                rocket_screen::close();
            }
            return;
        }
        /* In space, no shift, overlay closed: roll-right wants this
         * key. Count the tap so a sustained run of unmodified Es
         * surfaces the Shift+E hint toast. */
        inventory_screen::note_e_tap_in_space();
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
    if e._type == sapp::EventType::KeyDown && e.key_code == sapp::Keycode::Escape {
        let st = menu::state();
        if (st == GameState::InGameSp || st == GameState::InGameMp) && !menu::pause_active() {
            crafting_screen::close();
            inventory_screen::close();
            menu::pause_toggle();
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
    if e._type == sapp::EventType::KeyDown && e.key_code == sapp::Keycode::F2 {
        app.debug_ui_visible = !app.debug_ui_visible;
        return;
    }
    /* F1 stays available regardless of F2 - the roster is gameplay-
     * facing. */
    if e._type == sapp::EventType::KeyDown && e.key_code == sapp::Keycode::F1 {
        app.players_panel_visible = !app.players_panel_visible;
        return;
    }
    if e._type == sapp::EventType::KeyDown && e.key_code == sapp::Keycode::F4 {
        /* Block snapshot to the console. Not gated on F2. */
        print_block_snapshot(app);
        return;
    }
    if e._type == sapp::EventType::KeyDown && e.key_code == sapp::Keycode::F5 {
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
        if e._type == sapp::EventType::KeyDown && e.key_code == sapp::Keycode::H {
            renderer::set_terrain_visible(!renderer::terrain_visible());
            return;
        }
        if e._type == sapp::EventType::KeyDown && e.key_code == sapp::Keycode::J {
            renderer::set_water_visible(!renderer::water_visible());
            return;
        }
        if e._type == sapp::EventType::KeyDown && e.key_code == sapp::Keycode::K {
            renderer::set_skybox_visible(!renderer::skybox_visible());
            return;
        }
        if e._type == sapp::EventType::KeyDown
            && (e.key_code == sapp::Keycode::F3 || e.key_code == sapp::Keycode::P)
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
