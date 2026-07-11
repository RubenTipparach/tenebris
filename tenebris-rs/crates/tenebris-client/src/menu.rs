//! Port of `tenebris-c/src/client/menu.{c,h}`.
//!
//! Top-level game-state machine + every menu screen: profile picker,
//! profile-name input, main menu (SP / MP), SP world picker, new-world
//! name input, MP submenu (self-hosted / cloud), cloud submenu
//! (HOST / JOIN / recent rooms), room-code JOIN input, the in-game
//! pause overlay, the modal Settings overlay, the connecting overlay
//! and the connection-error popup. Panels are sokol_gl geometry with
//! sokol_debugtext labels - never ASCII art - and every player-visible
//! string is 7-bit ASCII with no underscores (CLAUDE.md rules).
//!
//! # Renames (PORTING.md rule 4 - `menu_` prefix dropped)
//!
//! - `menu_init()`               -> `menu::init()`
//! - `menu_shutdown()`           -> `menu::shutdown()`
//! - `menu_tick()`               -> `menu::tick()`
//! - `menu_state()`              -> `menu::state()`
//! - `menu_is_overlay()`         -> `menu::is_overlay()`
//! - `menu_force_state()`        -> `menu::force_state()`
//! - `menu_record_recent_room()` -> `menu::record_recent_room()`
//! - `menu_set_pending_invite()` -> `menu::set_pending_invite()`
//! - `menu_room_code()`          -> `menu::room_code()` (returns String)
//! - `menu_pause_active()`       -> `menu::pause_active()`
//! - `menu_pause_toggle()`       -> `menu::pause_toggle()`
//! - `menu_pause_draw()`         -> `menu::pause_draw()`
//! - `menu_pause_event()`        -> `menu::pause_event()`
//! - `menu_connecting_draw()`    -> `menu::connecting_draw()`
//! - `menu_draw()`               -> `menu::draw()`
//! - `menu_event()`              -> `menu::handle_event()` (matches the
//!   `input_event()` -> `input::handle_event()` rename)
//! - `menu_take_sp_resume(out) -> bool`
//!                               -> `menu::take_sp_resume() -> Option<PersistenceSave>`
//! - `menu_active_world()`       -> `menu::active_world()` (returns String)
//! - `game_state_t`              -> `GameState` (same discriminants 0..=11)
//!
//! # Factoring for headless tests (port-added, no behavior change)
//!
//! Same pattern as teleport_menu.rs / chat.rs:
//!
//! - `sapp_widthf()/heightf()` go through a `screen_sizef()` seam;
//!   `stm_sec(stm_now())` through `now_s()`; `sapp_show_mouse()`
//!   through `show_mouse()`. `#[cfg(test)]` swaps in thread-local
//!   doubles.
//! - All layout functions take `&mut Menu` + `(w, h)` and are pure of
//!   sokol; draw functions are the only sgl/sdtx submitters.
//! - The word-wrap loop inside `draw_text_centered_wrapped` is factored
//!   into `wrap_lines()`; the per-state input-screen strings into
//!   `input_screen_text()`; the animated "RECONNECTING..." header into
//!   `header_with_dots()`; the share toast / slider readout / lite
//!   label formatting into small pure fns - so tests can pin the exact
//!   rendered strings.
//! - `pause_layout` (the live sokol_gl one writing the C static `G_pl`)
//!   becomes the pure `compute_pause_layout()`; both the draw path and
//!   the click path recompute it fresh, exactly like the C does, so the
//!   global stash carries no cross-call state and is dropped.
//!
//! # Dead C code not ported
//!
//! The C file still carries an earlier sdtx-only pause prototype that
//! nothing calls: `layout_pause()`, `pause_compute_layout()`,
//! `G_pause_layout`, `pause_text()`, `pause_text_left()` and the
//! `M.btn_pause_resume/quit/invite/options` fields they wrote (the
//! comment on `btn_pause_options` says it is "unused but kept to keep
//! the struct symmetric"). They are unreachable; the port drops them.
//! `MENU_TRACE` is compiled out in C (`MENU_TRACE_ENABLED 0`) and is
//! not ported either; `state_name()` survives because tests pin it.
//! The redundant per-screen `hide_button()` calls inside each
//! `layout_*` function are subsumed by the bulk hide fence at the top
//! of `layout()` (which the C also performs first); they are not
//! repeated per screen.
//!
//! # Pending cross-module calls
//!
//! net_client calls are wired directly; reads of the link state route
//! through the `poll_net()` snapshot and the actual socket dial routes
//! through `net_connect()` so headless tests can substitute doubles.
//! The hooks are wired by app.rs (frame/event loop).
//!
//! Native room code / share behaviour replicates the C `#else` branch:
//! room code "AAAAAA", focus/blur no-ops, share returns 0.
#![allow(dead_code)]

use std::cell::RefCell;

use sokol::app as sapp;
use sokol::debugtext as sdtx;
use sokol::gfx as sg;
use sokol::gl as sgl;

use crate::client_kv;
use crate::mobile_ui;
use crate::net_client;
use crate::persistence::{self, PersistenceSave};
use crate::profile::{self, Profile, PROFILE_MAX};
use crate::settings;

/* ------------------------------------------------------------------ */
/* Game state enum (menu.h)                                             */
/* ------------------------------------------------------------------ */

/// Port of `game_state_t`. Same discriminants as the C enum.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
#[repr(u8)]
pub enum GameState {
    /// boot lands here first
    #[default]
    ProfileSelect = 0,
    /// typing a new profile name
    ProfileNameInput = 1,
    MainMenu = 2,
    /// picking which world to load
    SpWorldList = 3,
    /// typing a new world name
    SpNewWorldInput = 4,
    /// self-hosted (disabled) / cloud-hosted picker
    MpSubmenu = 5,
    /// under cloud-hosted: host / join
    MpCloudSubmenu = 6,
    /// in-game text input for room code
    MpJoinInput = 7,
    /// transient - kept for future
    MpUrlPrompt = 8,
    InGameSp = 9,
    InGameMp = 10,
    /// connect failed / link dropped - modal popup
    MpConnectError = 11,
}

/// Port of `state_name()`. Dev-log label, never rendered to the player.
fn state_name(s: GameState) -> &'static str {
    match s {
        GameState::ProfileSelect => "PROFILE_SELECT",
        GameState::ProfileNameInput => "PROFILE_NAME_INPUT",
        GameState::MainMenu => "MAIN_MENU",
        GameState::SpWorldList => "SP_WORLD_LIST",
        GameState::SpNewWorldInput => "SP_NEW_WORLD_INPUT",
        GameState::MpSubmenu => "MP_SUBMENU",
        GameState::MpCloudSubmenu => "MP_CLOUD_SUBMENU",
        GameState::MpJoinInput => "MP_JOIN_INPUT",
        GameState::MpUrlPrompt => "MP_URL_PROMPT",
        GameState::InGameSp => "IN_GAME_SP",
        GameState::InGameMp => "IN_GAME_MP",
        GameState::MpConnectError => "MP_CONNECT_ERROR",
    }
}

/* ------------------------------------------------------------------ */
/* Constants                                                            */
/* ------------------------------------------------------------------ */

const MAIN_BTN_W: f32 = 240.0;
const MAIN_BTN_H: f32 = 56.0;
const MAIN_BTN_GAP: f32 = 16.0;

const LIST_BTN_W: f32 = 360.0;
const LIST_BTN_H: f32 = 36.0;
const LIST_BTN_GAP: f32 = 8.0;

/* Recent-room history shown on the MP cloud submenu. Max stored on
 * disk is generous; the visible window is smaller because the panel
 * has limited vertical space between the JOIN button and BACK. */
const ROOM_HISTORY_MAX: usize = 8;
const ROOM_HISTORY_VISIBLE: usize = 4;
const ROOM_CODE_LEN: usize = 6;
const ROOM_HISTORY_KV_KEY: &str = "tenebris-c:recent-rooms";

/// Mirrors `PERSISTENCE_MAX_WORLDS`.
const MAX_WORLDS: usize = persistence::MAX_WORLDS;

/// C `char input_buf[32]` holds at most 31 typed chars.
const INPUT_BUF_MAX: usize = 31;

/* Hardcoded default server. The browser prompt was annoying for every
 * MP session, so the menu just connects straight to this. Power users
 * can still override via the `?server=...` URL query param - see the
 * bypass branch in main_web's init(). */
const DEFAULT_MP_SERVER_URL: &str = "wss://tenebris-c.fly.dev/";

/* Retry budget: 5 minutes total, ~5 s between attempts. The first
 * retry fires near-immediately so a transient hiccup doesn't show
 * the CONNECTING overlay for a full pacing interval. */
const MP_RECONNECT_TOTAL_S: f64 = 300.0;
const MP_RECONNECT_INTERVAL_S: f64 = 5.0;

const SETTINGS_PANEL_W: f32 = 440.0;
const SETTINGS_PANEL_H: f32 = 460.0;
const SETTINGS_TRACK_H: f32 = 12.0;

/* ------------------------------------------------------------------ */
/* State                                                                */
/* ------------------------------------------------------------------ */

/// Port of `menu_button_t`. The C `const char* label` becomes an owned
/// String (the C version even stored a pointer to a stack-local
/// profile name and got away with it; the port owns the bytes).
#[derive(Clone, Debug, Default, PartialEq)]
struct MenuButton {
    x: f32,
    y: f32,
    w: f32,
    h: f32,
    label: String,
    hover: bool,
    visible: bool,
    /// greyed-out, click does nothing
    disabled: bool,
}

/// Port of the C file's anonymous `static struct { ... } M`.
#[derive(Clone, Debug, Default)]
struct Menu {
    state: GameState,
    /* Main-menu buttons. */
    btn_sp: MenuButton,
    btn_mp: MenuButton,
    /* Top-right indicator on the main menu - shows the active profile
     * name; clicking it dumps you back to the profile picker. */
    btn_active_profile: MenuButton,
    /* Top-LEFT chip on the main menu - opens the modal Settings
     * overlay (mouse-sens slider, etc.). Mirrors btn_active_profile
     * on the opposite corner to balance the layout. */
    btn_settings: MenuButton,
    /* SP world-list buttons. */
    btn_new_world: MenuButton,
    btn_back: MenuButton,
    btn_world: [MenuButton; MAX_WORLDS],
    /* Profile-picker buttons. */
    btn_new_profile: MenuButton,
    btn_profile: [MenuButton; PROFILE_MAX],
    /* MP submenu buttons.
     * MP top: btn_self_host (greyed, future) + btn_cloud_host (active).
     * Cloud submenu: btn_host (generates code) + btn_join (enters code). */
    btn_self_host: MenuButton,
    btn_cloud_host: MenuButton,
    btn_host: MenuButton,
    btn_join: MenuButton,

    /* In-game text input. Active when state == MpJoinInput (and any
     * future text-input flows we route through it). C: char[32] + len;
     * only ASCII passes the filter so byte len == char count. */
    input_buf: String,
    input_cursor_blink_start: f64,

    /* Mode chosen on the New World screen, consumed when the SP world
     * boots (false = creative/sandbox, true = survival). */
    new_world_survival: bool,

    /* Terrain seed of the world being entered, resolved by
     * start_sp_for_world: the world's persisted seed, a fresh roll for
     * a brand-new world, or the compiled-in default for pre-seed-
     * feature saves. app.rs reads it on the SP transition and rebuilds
     * the planet when it differs from the loaded terrain. */
    pending_world_seed: u64,

    mouse_x: f32,
    mouse_y: f32,

    /* Resume pose handed off to main_web on entering IN_GAME_SP.
     * C: bool pending_sp_resume + persistence_save_t resume. */
    resume: Option<PersistenceSave>,

    /* World-picker delete flow: the world awaiting its two-button
     * confirm dialog (a real in-panel dialog per CLAUDE.md - never
     * window.confirm). None = normal list. */
    delete_confirm: Option<String>,

    /* Cached world directory. Refreshed on entering SP world list. */
    worlds: Vec<String>,

    /* Cached profile directory. Refreshed on entering profile-select. */
    profiles: Vec<Profile>,

    /* Name the SP autosave loop writes back to. Empty in MP / menu. */
    active_world: String,

    /* Room code for the active MP session. Empty = public room.
     * C: char[9] - at most 8 stored bytes. */
    room_code: String,

    /* MRU list of rooms the player has hosted / joined. Loaded from
     * client_kv on entering the cloud submenu, updated on every
     * successful connect (menu-driven or URL bypass). */
    recent_rooms: Vec<String>,
    btn_recent_room: [MenuButton; ROOM_HISTORY_MAX],

    /* Connection-failure popup. Set on the IN_GAME_MP ->
     * MP_CONNECT_ERROR transition by tick; cleared on dismiss.
     * C: char[96] - at most 95 stored bytes. */
    error_msg: String,

    /* Pending deep-link invite waiting for a profile to exist before
     * we connect. set_pending_invite fills these from ?invite= /
     * ?room= + ?server= at boot, and the profile-picker exit path
     * drains them via consume_pending_invite_if_ready. Empty room
     * means no pending invite. C: char[9] / char[256]. */
    pending_invite_room: String,
    pending_invite_server: String,

    /* In-game pause overlay (Escape during gameplay). The world keeps
     * rendering underneath - state() stays on the gameplay state - so
     * this is a side-channel visibility flag rather than a new
     * GameState entry. */
    pause_visible: bool,

    /* Settings overlay. Modal panel that can be opened from EITHER
     * the main menu's SETTINGS button or the pause menu's SETTINGS
     * button. Owns its own visibility flag so the underlying surface
     * (main menu / pause panel) keeps rendering behind it and we
     * don't need a dedicated GameState entry. While visible,
     * settings_event swallows every event and gets first crack ahead
     * of the regular menu / pause routes. */
    settings_visible: bool,
    btn_settings_back: MenuButton,
    /* Mouse-sensitivity slider geometry + drag state. Recomputed
     * every frame in settings_layout; sens_dragging persists across
     * frames so a mouse-down that started on the handle keeps
     * tracking mouse_move events even when they leave the track
     * bounds. */
    sens_track_x: f32,
    sens_track_y: f32,
    sens_track_w: f32,
    sens_track_h: f32,
    sens_dragging: bool,
    /* Chat-fade slider geometry + drag state. Same shape as the sens
     * slider; maps [settings::CHAT_FADE_MIN_S..MAX_S] to
     * settings::set_chat_fade_s(). */
    chat_track_x: f32,
    chat_track_y: f32,
    chat_track_w: f32,
    chat_track_h: f32,
    chat_dragging: bool,
    /* Lite-graphics toggle button. A click flips
     * settings::set_lite_graphics; the change persists immediately
     * but only takes visual effect on the next reload (perf mode is
     * set before renderer init). Drawn below the chat-fade slider. */
    btn_lite_graphics: MenuButton,
    /* Toast under the INVITE FRIENDS button after a successful share.
     * pause_share_msg_until is a sokol_time stamp; the label fades
     * once now_s() passes it. share_result is 1=shared via Web Share
     * API, 2=copied to clipboard, 3=failure / no API. */
    pause_share_result: i32,
    pause_share_msg_until: f64,
    /* True when the pause panel was opened automatically by a
     * mid-session disconnect rather than by the player pressing Esc.
     * Lets tick auto-close the panel when the link is restored - the
     * manual-Esc case stays open until the player clicks RETURN TO
     * GAME themselves. */
    pause_auto_disconnect: bool,

    /* MP auto-reconnect state. Populated by connect_to_room /
     * consume_pending_invite so tick can re-call net_client with the
     * same parameters when the socket drops mid-session.
     * reconnect_deadline_t == 0 means "not currently retrying";
     * non-zero is a now_s() timestamp past which we promote to the
     * disconnected popup. next_try_t paces attempts at ~5 s apart.
     *
     * Existing room_code already holds the room, but we keep our own
     * copy so a manual disconnect / mode switch doesn't accidentally
     * feed the wrong room into a retry. C buffers: char[128] /
     * char[40] / char[40] / char[9]. */
    reconnect_url: String,
    reconnect_token: String,
    reconnect_name: String,
    reconnect_room: String,
    reconnect_deadline_t: f64,
    reconnect_next_try_t: f64,
    reconnect_attempts: i32,

    /* If true, the profile picker / name input is being shown as a
     * gate to MP rather than as the boot screen. The next successful
     * enter_main_menu_with should route to MpSubmenu instead of
     * stopping at the main menu. */
    pending_mp_after_profile: bool,
}

thread_local! {
    static M: RefCell<Menu> = RefCell::new(Menu::default());
}

/// Borrow helper so internal fns can take `&mut Menu` without nested
/// RefCell borrows (the C code mutates the global `M` freely; the port
/// funnels every public entry point through exactly one borrow).
fn with_menu<R>(f: impl FnOnce(&mut Menu) -> R) -> R {
    M.with(|cell| f(&mut cell.borrow_mut()))
}

/// Dev-only fast path: jump straight into a single-player world, skipping
/// the profile / menu navigation. Drives the same `start_sp_for_world`
/// the menu button does, so the in-game state is identical. Gated by the
/// caller behind an env var (see `app::init`); never reached in normal
/// play.
pub fn dev_start_sp(world_name: &str) {
    with_menu(|m| start_sp_for_world(m, world_name));
}

/// Dev-only: jump straight to one of the egui menu screens (skipping the
/// sokol profile picker) for screenshots / iteration. `which` is "main"
/// (default), "worlds", or "new".
pub fn dev_show_menu(which: &str) {
    with_menu(|m| match which {
        "worlds" => enter_world_list(m),
        "new" => start_sp_new_world(m),
        _ => m.state = GameState::MainMenu,
    });
}

/* ===================================================================== */
/* egui front-end for the single-player menu screens (main menu, world   */
/* list, new-world). Profile-select + multiplayer stay on the sokol path */
/* below; these three render in egui and drive the SAME state machine /  */
/* start_* actions, so nothing forks.                                    */

/// True when the current state renders via [`egui_ui`] (so app.rs routes
/// events to egui and skips the sokol `draw` / `handle_event`).
pub fn state_is_egui() -> bool {
    matches!(
        state(),
        GameState::MainMenu | GameState::SpWorldList | GameState::SpNewWorldInput
    )
}

/// Mode the next SP world should boot in (chosen on the New World screen):
/// true = survival, false = creative/sandbox. Read by the SP-entry inventory
/// priming in app.rs.
pub fn pending_survival() -> bool {
    with_menu(|m| m.new_world_survival)
}

/// A consistent full-width menu button.
fn menu_button(ui: &mut egui::Ui, text: &str) -> egui::Response {
    ui.add_sized(
        [280.0, 42.0],
        egui::Button::new(egui::RichText::new(text).size(20.0)),
    )
}

/// Render the active SP menu screen in egui. No-op for non-egui states.
pub fn egui_ui(ctx: &egui::Context) {
    match state() {
        GameState::MainMenu => {
            egui::Window::new("tenebris-menu")
                .title_bar(false)
                .resizable(false)
                .collapsible(false)
                .anchor(egui::Align2::CENTER_CENTER, egui::Vec2::ZERO)
                .frame(egui::Frame::NONE)
                .show(ctx, |ui| {
                ui.vertical_centered(|ui| {
                    ui.add_space(96.0);
                    ui.label(
                        egui::RichText::new("TENEBRIS")
                            .size(64.0)
                            .strong()
                            .color(egui::Color32::from_rgb(0xe6, 0xcf, 0x73)),
                    );
                    ui.label(
                        egui::RichText::new("a procedural planet sandbox")
                            .size(16.0)
                            .color(egui::Color32::from_rgb(0x90, 0x9a, 0xb0)),
                    );
                    ui.add_space(44.0);
                    with_menu(|m| {
                        if menu_button(ui, "Singleplayer").clicked() {
                            enter_world_list(m);
                        }
                        ui.add_space(8.0);
                        if menu_button(ui, "Multiplayer").clicked() {
                            m.state = GameState::MpSubmenu;
                        }
                        ui.add_space(8.0);
                        if menu_button(ui, "Quit").clicked() {
                            sapp::quit();
                        }
                    });
                });
            });
        }
        GameState::SpWorldList => {
            egui::Window::new("tenebris-menu")
                .title_bar(false)
                .resizable(false)
                .collapsible(false)
                .anchor(egui::Align2::CENTER_CENTER, egui::Vec2::ZERO)
                .frame(egui::Frame::NONE)
                .show(ctx, |ui| {
                ui.vertical_centered(|ui| {
                    ui.add_space(56.0);
                    ui.label(
                        egui::RichText::new("Select World")
                            .size(34.0)
                            .strong()
                            .color(egui::Color32::from_rgb(0xc8, 0xd0, 0xe0)),
                    );
                    ui.add_space(20.0);
                    with_menu(|m| {
                        /* Two-button delete confirm replaces the list
                         * while pending (real in-panel dialog - never
                         * window.confirm, per CLAUDE.md). */
                        if let Some(doomed) = m.delete_confirm.clone() {
                            ui.label(
                                egui::RichText::new(format!("Delete world '{}'?", doomed))
                                    .size(20.0)
                                    .color(egui::Color32::from_rgb(0xe8, 0xb0, 0xb0)),
                            );
                            ui.add_space(4.0);
                            ui.label(
                                egui::RichText::new(
                                    "All its blocks, bag and progress are erased forever.",
                                )
                                .color(egui::Color32::from_rgb(0x90, 0x98, 0xa8)),
                            );
                            ui.add_space(16.0);
                            if ui
                                .add_sized(
                                    [280.0, 42.0],
                                    egui::Button::new(
                                        egui::RichText::new("Delete forever")
                                            .size(20.0)
                                            .color(egui::Color32::from_rgb(0xff, 0xd0, 0xd0)),
                                    ),
                                )
                                .clicked()
                            {
                                persistence::delete(&doomed);
                                m.worlds = persistence::list_worlds();
                                m.delete_confirm = None;
                                println!("[menu] deleted world '{}'", doomed);
                            }
                            ui.add_space(8.0);
                            if menu_button(ui, "Cancel").clicked() {
                                m.delete_confirm = None;
                            }
                            return;
                        }
                        let worlds = m.worlds.clone();
                        if worlds.is_empty() {
                            ui.label(
                                egui::RichText::new("No worlds yet - create one below.")
                                    .color(egui::Color32::from_rgb(0x90, 0x98, 0xa8)),
                            );
                            ui.add_space(8.0);
                        }
                        egui::ScrollArea::vertical().max_height(300.0).show(ui, |ui| {
                            for w in &worlds {
                                ui.horizontal(|ui| {
                                    if ui
                                        .add_sized(
                                            [244.0, 42.0],
                                            egui::Button::new(
                                                egui::RichText::new(w).size(20.0),
                                            ),
                                        )
                                        .clicked()
                                    {
                                        start_sp_for_world(m, w);
                                    }
                                    let del = ui
                                        .add_sized(
                                            [32.0, 42.0],
                                            egui::Button::new(
                                                egui::RichText::new("X")
                                                    .size(16.0)
                                                    .color(egui::Color32::from_rgb(
                                                        0xd0, 0x70, 0x70,
                                                    )),
                                            ),
                                        )
                                        .on_hover_text("Delete this world");
                                    if del.clicked() {
                                        m.delete_confirm = Some(w.clone());
                                    }
                                });
                                ui.add_space(4.0);
                            }
                        });
                        ui.add_space(12.0);
                        if menu_button(ui, "+ New World").clicked() {
                            start_sp_new_world(m);
                        }
                        ui.add_space(8.0);
                        if menu_button(ui, "Back").clicked() {
                            m.state = GameState::MainMenu;
                        }
                    });
                });
            });
        }
        GameState::SpNewWorldInput => {
            egui::Window::new("tenebris-menu")
                .title_bar(false)
                .resizable(false)
                .collapsible(false)
                .anchor(egui::Align2::CENTER_CENTER, egui::Vec2::ZERO)
                .frame(egui::Frame::NONE)
                .show(ctx, |ui| {
                ui.vertical_centered(|ui| {
                    ui.add_space(80.0);
                    ui.label(
                        egui::RichText::new("New World")
                            .size(34.0)
                            .strong()
                            .color(egui::Color32::from_rgb(0xc8, 0xd0, 0xe0)),
                    );
                    ui.add_space(20.0);
                    with_menu(|m| {
                        ui.label("World name");
                        let resp = ui.add(
                            egui::TextEdit::singleline(&mut m.input_buf)
                                .hint_text("my world")
                                .desired_width(280.0)
                                .font(egui::TextStyle::Heading),
                        );
                        /* Keep the field focused so typing lands here. */
                        if !resp.has_focus() && !resp.lost_focus() {
                            resp.request_focus();
                        }
                        ui.add_space(16.0);
                        ui.label("Mode");
                        ui.horizontal(|ui| {
                            ui.selectable_value(
                                &mut m.new_world_survival,
                                false,
                                "Creative / Sandbox",
                            );
                            ui.selectable_value(&mut m.new_world_survival, true, "Survival");
                        });
                        ui.add_space(20.0);

                        let name = m.input_buf.trim().to_string();
                        let name_ok = !name.is_empty();
                        let enter = resp.lost_focus()
                            && ui.input(|i| i.key_pressed(egui::Key::Enter));
                        let create = ui
                            .add_enabled(name_ok, egui::Button::new(
                                egui::RichText::new("Create").size(20.0),
                            ).min_size(egui::vec2(280.0, 42.0)))
                            .clicked();
                        ui.add_space(8.0);
                        let back = menu_button(ui, "Back").clicked();

                        if (create || (enter && name_ok)) && name_ok {
                            start_sp_for_world(m, &name);
                        } else if back {
                            enter_world_list(m);
                        }
                    });
                });
            });
        }
        _ => {}
    }
}

/// snprintf-style byte truncation (C buffers cut at `cap` bytes). All
/// strings that reach these buffers are ASCII; back off to a char
/// boundary so the String invariant holds for any straggler.
fn trunc(s: &str, cap: usize) -> String {
    if s.len() <= cap {
        return s.to_string();
    }
    let mut end = cap;
    while !s.is_char_boundary(end) {
        end -= 1;
    }
    s[..end].to_string()
}

/* ------------------------------------------------------------------ */
/* sokol runtime seams - see "Factoring for headless tests" above.      */
/* ------------------------------------------------------------------ */

#[cfg(not(test))]
fn screen_sizef() -> (f32, f32) {
    (sapp::widthf(), sapp::heightf())
}

#[cfg(not(test))]
fn now_s() -> f64 {
    sokol::time::sec(sokol::time::now())
}

#[cfg(not(test))]
fn show_mouse(visible: bool) {
    sapp::show_mouse(visible);
}

#[cfg(test)]
use test_doubles::{now_s, screen_sizef, show_mouse};

#[cfg(test)]
mod test_doubles {
    use std::cell::Cell;

    thread_local! {
        pub static SCREEN: Cell<(f32, f32)> = const { Cell::new((0.0, 0.0)) };
        pub static NOW_S: Cell<f64> = const { Cell::new(0.0) };
        pub static MOUSE_SHOWN: Cell<Option<bool>> = const { Cell::new(None) };
    }

    pub fn screen_sizef() -> (f32, f32) {
        SCREEN.with(|c| c.get())
    }

    pub fn now_s() -> f64 {
        NOW_S.with(|c| c.get())
    }

    pub fn set_now(t: f64) {
        NOW_S.with(|c| c.set(t));
    }

    pub fn show_mouse(visible: bool) {
        MOUSE_SHOWN.with(|c| c.set(Some(visible)));
    }
}

/* ------------------------------------------------------------------ */
/* net_client snapshot. The menu reads net_client through this          */
/* snapshot so the reconnect state machine stays headless-testable      */
/* (tests drive test_net instead of a live socket).                     */
/* ------------------------------------------------------------------ */

/// What `tick()` observes about the MP link. Mirrors the subset of
/// `net_client_state_t` the menu actually branches on:
/// `NET_CLIENT_READY`, `NET_CLIENT_ERROR`, everything else (IDLE /
/// CONNECTING / HANDSHAKE) is `Other`.
#[derive(Clone, Debug, PartialEq, Eq)]
enum NetLinkState {
    Ready,
    Error,
    Other,
}

#[derive(Clone, Debug, PartialEq)]
struct NetPoll {
    state: NetLinkState,
    /// Port of `net_client_can_retry()` - false for server-issued
    /// terminal kicks (version mismatch etc).
    can_retry: bool,
    /// Port of `net_client_error_message()` - None maps the C NULL.
    error_message: Option<String>,
}

#[cfg(not(test))]
fn poll_net() -> NetPoll {
    NetPoll {
        state: match net_client::state() {
            net_client::NetClientState::Ready => NetLinkState::Ready,
            net_client::NetClientState::Error => NetLinkState::Error,
            _ => NetLinkState::Other,
        },
        can_retry: net_client::can_retry(),
        error_message: net_client::error_message(),
    }
}

/// `net_client_connect()` - seamed like `poll_net` so the headless
/// menu tests don't dial a real socket (the native transport spawns a
/// tokio runtime and a TCP connect per call).
#[cfg(not(test))]
fn net_connect(url: &str) {
    net_client::connect(url);
}

#[cfg(test)]
use test_net::{net_connect, poll_net};

#[cfg(test)]
mod test_net {
    use super::{NetLinkState, NetPoll};
    use std::cell::RefCell;

    thread_local! {
        pub static POLL: RefCell<NetPoll> = RefCell::new(NetPoll {
            state: NetLinkState::Other,
            can_retry: true,
            error_message: None,
        });
        /// URLs `net_connect` was called with, in order.
        pub static CONNECTS: RefCell<Vec<String>> = const { RefCell::new(Vec::new()) };
    }

    pub fn poll_net() -> NetPoll {
        POLL.with(|c| c.borrow().clone())
    }

    pub fn set(p: NetPoll) {
        POLL.with(|c| *c.borrow_mut() = p);
    }

    pub fn net_connect(url: &str) {
        CONNECTS.with(|c| c.borrow_mut().push(url.to_string()));
    }

    pub fn reset_connects() {
        CONNECTS.with(|c| c.borrow_mut().clear());
    }
}

/* ------------------------------------------------------------------ */
/* Room code / text-input / share helpers (native).                     */
/* ------------------------------------------------------------------ */

mod js {
    /// Port of the native `menu_js_new_room_code` fallback: a fixed
    /// "AAAAAA" so native test sessions are deterministic.
    pub fn new_room_code() -> Option<String> {
        Some("AAAAAA".to_string())
    }

    pub fn focus_text_input() {}

    pub fn blur_text_input() {}

    pub fn share_invite(_room_code: &str) -> i32 {
        0
    }
}

/* ------------------------------------------------------------------ */
/* Hit test + layout                                                    */
/* ------------------------------------------------------------------ */

/// Port of `hit()`. Inclusive on every edge, like the C compares.
fn hit(b: &MenuButton, x: f32, y: f32) -> bool {
    if !b.visible || b.disabled {
        return false;
    }
    x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h
}

/// Port of `set_button()`. Hover is computed from the menu's cached
/// mouse position, exactly like the C reads `M.mouse_x/y`.
#[allow(clippy::too_many_arguments)]
fn set_button(
    b: &mut MenuButton,
    x: f32,
    y: f32,
    w: f32,
    h: f32,
    label: &str,
    mouse_x: f32,
    mouse_y: f32,
) {
    b.x = x;
    b.y = y;
    b.w = w;
    b.h = h;
    b.label = label.to_string();
    b.visible = true;
    b.disabled = false;
    b.hover = mouse_x >= x && mouse_x <= x + w && mouse_y >= y && mouse_y <= y + h;
}

/// Port of `set_button_disabled()`. Same as set_button but also marks
/// the button as greyed-out: dimmer fill, no hover state, no click.
/// Used for not-yet-built features (e.g. SELF HOSTED in the MP
/// top-level submenu).
#[allow(clippy::too_many_arguments)]
fn set_button_disabled(
    b: &mut MenuButton,
    x: f32,
    y: f32,
    w: f32,
    h: f32,
    label: &str,
    mouse_x: f32,
    mouse_y: f32,
) {
    set_button(b, x, y, w, h, label, mouse_x, mouse_y);
    b.disabled = true;
    b.hover = false;
}

/// Port of `hide_button()`.
fn hide_button(b: &mut MenuButton) {
    b.visible = false;
    b.hover = false;
    b.disabled = false;
}

/// Port of `layout_main()`.
fn layout_main(m: &mut Menu, w: f32, h: f32) {
    let cx = w * 0.5;
    let cy = h * 0.5;
    let (mx, my) = (m.mouse_x, m.mouse_y);
    set_button(
        &mut m.btn_sp,
        cx - MAIN_BTN_W * 0.5,
        cy - MAIN_BTN_H - MAIN_BTN_GAP * 0.5,
        MAIN_BTN_W,
        MAIN_BTN_H,
        "SINGLE PLAYER",
        mx,
        my,
    );
    set_button(
        &mut m.btn_mp,
        cx - MAIN_BTN_W * 0.5,
        cy + MAIN_BTN_GAP * 0.5,
        MAIN_BTN_W,
        MAIN_BTN_H,
        "MULTIPLAYER",
        mx,
        my,
    );
    /* Active-profile chip top-right. The label gets prefixed with
     * "as " in draw() so the layout doesn't need to read profile
     * state beyond the name. */
    if let Some(active) = profile::get_active() {
        const CHIP_W: f32 = 200.0;
        const CHIP_H: f32 = 32.0;
        set_button(
            &mut m.btn_active_profile,
            w - CHIP_W - 16.0,
            16.0,
            CHIP_W,
            CHIP_H,
            &active.name,
            mx,
            my,
        );
    } else {
        hide_button(&mut m.btn_active_profile);
    }
    /* Settings chip top-LEFT (mirrors the profile chip). */
    set_button(&mut m.btn_settings, 16.0, 16.0, 140.0, 32.0, "SETTINGS", mx, my);
}

/// Port of `layout_mp_submenu()`.
fn layout_mp_submenu(m: &mut Menu, w: f32, h: f32) {
    let cx = w * 0.5;
    let cy = h * 0.5;
    let (mx, my) = (m.mouse_x, m.mouse_y);
    /* Two buttons: SELF HOSTED (disabled - "coming soon") and
     * CLOUD HOSTED (active - enters the cloud submenu). */
    set_button_disabled(
        &mut m.btn_self_host,
        cx - MAIN_BTN_W * 0.5,
        cy - MAIN_BTN_H - MAIN_BTN_GAP * 0.5,
        MAIN_BTN_W,
        MAIN_BTN_H,
        "SELF HOSTED",
        mx,
        my,
    );
    set_button(
        &mut m.btn_cloud_host,
        cx - MAIN_BTN_W * 0.5,
        cy + MAIN_BTN_GAP * 0.5,
        MAIN_BTN_W,
        MAIN_BTN_H,
        "CLOUD HOSTED",
        mx,
        my,
    );
    set_button(
        &mut m.btn_back,
        cx - 120.0,
        h * 0.5 + 220.0,
        240.0,
        LIST_BTN_H,
        "BACK",
        mx,
        my,
    );
}

/// Port of `layout_mp_cloud_submenu()`.
fn layout_mp_cloud_submenu(m: &mut Menu, w: f32, h: f32) {
    let cx = w * 0.5;
    let cy = h * 0.5;
    let (mx, my) = (m.mouse_x, m.mouse_y);
    set_button(
        &mut m.btn_host,
        cx - MAIN_BTN_W * 0.5,
        cy - MAIN_BTN_H - MAIN_BTN_GAP * 0.5,
        MAIN_BTN_W,
        MAIN_BTN_H,
        "HOST",
        mx,
        my,
    );
    set_button(
        &mut m.btn_join,
        cx - MAIN_BTN_W * 0.5,
        cy + MAIN_BTN_GAP * 0.5,
        MAIN_BTN_W,
        MAIN_BTN_H,
        "JOIN",
        mx,
        my,
    );
    /* Recent-room list under the JOIN button. Leave room above the
     * BACK button at h*0.5+220; with LIST_BTN_H=36 + GAP=8 that's
     * ~4 rows plus a heading line. */
    let mut ry = cy + MAIN_BTN_H + MAIN_BTN_GAP * 0.5 + 28.0;
    for i in 0..ROOM_HISTORY_MAX {
        if i < m.recent_rooms.len() && i < ROOM_HISTORY_VISIBLE {
            let label = m.recent_rooms[i].clone();
            set_button(
                &mut m.btn_recent_room[i],
                cx - LIST_BTN_W * 0.5,
                ry,
                LIST_BTN_W,
                LIST_BTN_H,
                &label,
                mx,
                my,
            );
            ry += LIST_BTN_H + LIST_BTN_GAP;
        } else {
            hide_button(&mut m.btn_recent_room[i]);
        }
    }
    set_button(
        &mut m.btn_back,
        cx - 120.0,
        h * 0.5 + 220.0,
        240.0,
        LIST_BTN_H,
        "BACK",
        mx,
        my,
    );
}

/// Port of `layout_join_input()`. Just a BACK button - the input
/// itself isn't a button, it's a drawn box with a typed buffer
/// rendered in draw().
fn layout_join_input(m: &mut Menu, w: f32, h: f32) {
    let (mx, my) = (m.mouse_x, m.mouse_y);
    set_button(
        &mut m.btn_back,
        w * 0.5 - 120.0,
        h * 0.5 + 220.0,
        240.0,
        LIST_BTN_H,
        "BACK",
        mx,
        my,
    );
}

/// Port of `layout_world_list()`.
fn layout_world_list(m: &mut Menu, w: f32, h: f32) {
    let cx = w * 0.5;
    let (mx, my) = (m.mouse_x, m.mouse_y);
    /* Visible vertical space starts ~ h/2 - 140 (just below "SELECT
     * WORLD" heading) and ends ~ h/2 + 220 (above the BACK button). */
    let y0 = h * 0.5 - 120.0;

    set_button(
        &mut m.btn_new_world,
        cx - LIST_BTN_W * 0.5,
        y0,
        LIST_BTN_W,
        LIST_BTN_H,
        "+ NEW WORLD",
        mx,
        my,
    );

    let mut y = y0 + LIST_BTN_H + LIST_BTN_GAP * 2.0;
    let mut max_visible_rows = ((h * 0.4) / (LIST_BTN_H + LIST_BTN_GAP)) as i32;
    if max_visible_rows > MAX_WORLDS as i32 {
        max_visible_rows = MAX_WORLDS as i32;
    }

    for i in 0..MAX_WORLDS {
        if i < m.worlds.len() && (i as i32) < max_visible_rows {
            let label = m.worlds[i].clone();
            set_button(
                &mut m.btn_world[i],
                cx - LIST_BTN_W * 0.5,
                y,
                LIST_BTN_W,
                LIST_BTN_H,
                &label,
                mx,
                my,
            );
            y += LIST_BTN_H + LIST_BTN_GAP;
        } else {
            hide_button(&mut m.btn_world[i]);
        }
    }

    set_button(
        &mut m.btn_back,
        cx - 120.0,
        h * 0.5 + 220.0,
        240.0,
        LIST_BTN_H,
        "BACK",
        mx,
        my,
    );
}

/// Port of `layout_connect_error()`. Single centred BACK TO MENU
/// button under the error panel. The panel itself isn't a button - we
/// draw it in draw() and only hit-test this one.
fn layout_connect_error(m: &mut Menu, w: f32, h: f32) {
    let cx = w * 0.5;
    let (mx, my) = (m.mouse_x, m.mouse_y);
    set_button(
        &mut m.btn_back,
        cx - MAIN_BTN_W * 0.5,
        h * 0.5 + 40.0,
        MAIN_BTN_W,
        MAIN_BTN_H,
        "BACK TO MENU",
        mx,
        my,
    );
}

/// Port of `layout_profile_select()`.
fn layout_profile_select(m: &mut Menu, w: f32, h: f32) {
    let cx = w * 0.5;
    let (mx, my) = (m.mouse_x, m.mouse_y);
    let y0 = h * 0.5 - 120.0;

    set_button(
        &mut m.btn_new_profile,
        cx - LIST_BTN_W * 0.5,
        y0,
        LIST_BTN_W,
        LIST_BTN_H,
        "+ NEW PROFILE",
        mx,
        my,
    );

    let mut y = y0 + LIST_BTN_H + LIST_BTN_GAP * 2.0;
    let mut max_rows = ((h * 0.4) / (LIST_BTN_H + LIST_BTN_GAP)) as i32;
    if max_rows > PROFILE_MAX as i32 {
        max_rows = PROFILE_MAX as i32;
    }
    for i in 0..PROFILE_MAX {
        if i < m.profiles.len() && (i as i32) < max_rows {
            let label = m.profiles[i].name.clone();
            set_button(
                &mut m.btn_profile[i],
                cx - LIST_BTN_W * 0.5,
                y,
                LIST_BTN_W,
                LIST_BTN_H,
                &label,
                mx,
                my,
            );
            y += LIST_BTN_H + LIST_BTN_GAP;
        } else {
            hide_button(&mut m.btn_profile[i]);
        }
    }
    /* No "back" - this is the first screen, nothing to go back to. */
}

/// Port of `layout()`. Bulk-hides every named button up front - each
/// per-state layout fn below only has to SET the buttons it actually
/// uses. This is the single fence keeping "HOST" / "JOIN" / "+ NEW
/// WORLD" / etc. from bleeding through when the state machine
/// transitions - the previous root cause of menu UI surviving into
/// gameplay was a hide_button() that one screen forgot to call.
fn layout(m: &mut Menu, w: f32, h: f32) {
    /* Recent-room buttons only appear on MP_CLOUD_SUBMENU; default
     * them to hidden so they don't bleed onto any other screen. The
     * cloud-submenu layout re-sets the visible subset after this. */
    for i in 0..ROOM_HISTORY_MAX {
        hide_button(&mut m.btn_recent_room[i]);
    }

    hide_button(&mut m.btn_sp);
    hide_button(&mut m.btn_mp);
    hide_button(&mut m.btn_back);
    hide_button(&mut m.btn_active_profile);
    hide_button(&mut m.btn_settings);
    hide_button(&mut m.btn_new_world);
    for i in 0..MAX_WORLDS {
        hide_button(&mut m.btn_world[i]);
    }
    hide_button(&mut m.btn_new_profile);
    for i in 0..PROFILE_MAX {
        hide_button(&mut m.btn_profile[i]);
    }
    hide_button(&mut m.btn_self_host);
    hide_button(&mut m.btn_cloud_host);
    hide_button(&mut m.btn_host);
    hide_button(&mut m.btn_join);

    match m.state {
        GameState::ProfileSelect => layout_profile_select(m, w, h),
        GameState::MainMenu | GameState::MpUrlPrompt => layout_main(m, w, h),
        GameState::SpWorldList => layout_world_list(m, w, h),
        GameState::MpSubmenu => layout_mp_submenu(m, w, h),
        GameState::MpCloudSubmenu => layout_mp_cloud_submenu(m, w, h),
        /* Same layout for every text-input flow: just BACK + box. */
        GameState::MpJoinInput | GameState::ProfileNameInput | GameState::SpNewWorldInput => {
            layout_join_input(m, w, h)
        }
        GameState::MpConnectError => layout_connect_error(m, w, h),
        /* IN_GAME_SP / IN_GAME_MP land here. draw() early-returns in
         * those states so geometry never draws; the bulk hide above
         * already cleared every button - defense in depth against UI
         * bleed when gameplay starts. */
        GameState::InGameSp | GameState::InGameMp => {}
    }
}

/* ------------------------------------------------------------------ */
/* Drawing                                                              */
/* ------------------------------------------------------------------ */

/// Port of `quad()`.
fn quad(x: f32, y: f32, w: f32, h: f32, r: f32, g: f32, b: f32, a: f32) {
    sgl::begin_quads();
    sgl::c4f(r, g, b, a);
    sgl::v2f(x, y);
    sgl::v2f(x + w, y);
    sgl::v2f(x + w, y + h);
    sgl::v2f(x, y + h);
    sgl::end();
}

/// Port of `border()`.
#[allow(clippy::too_many_arguments)]
fn border(x: f32, y: f32, w: f32, h: f32, thick: f32, r: f32, g: f32, b: f32, a: f32) {
    quad(x, y, w, thick, r, g, b, a);
    quad(x, y + h - thick, w, thick, r, g, b, a);
    quad(x, y, thick, h, r, g, b, a);
    quad(x + w - thick, y, thick, h, r, g, b, a);
}

/// Port of `draw_text_centered()`. sokol_debugtext renders 8x8 char
/// cells. Shrink the canvas by `scale` so each cell becomes
/// `8 * scale` screen pixels; place origin in canvas char cells (one
/// cell = 8 canvas units regardless of scale). The menu uses font
/// slot 1 (c64) - its baseline is clean, where Oric's bottom row reads
/// as an underline at 5x scale.
fn draw_text_centered(s: &str, center_x: f32, screen_y: f32, scale: f32, r: u8, g: u8, b: u8) {
    let n = s.len() as f32; /* C strlen; menu strings are ASCII */
    let cell_px = 8.0 * scale;
    let text_w = cell_px * n;
    let text_x = center_x - text_w * 0.5;
    let (sw, sh) = screen_sizef();
    sdtx::canvas(sw / scale, sh / scale);
    sdtx::font(1);
    sdtx::origin(text_x / cell_px, screen_y / cell_px);
    sdtx::color3b(r, g, b);
    sdtx::home();
    sdtx::puts(s);
    sdtx::font(0); /* restore HUD font for any non-menu printers */
}

/// The word-wrap loop of `draw_text_centered_wrapped()`, factored pure
/// so tests can pin the exact line splits. Splits at spaces so no line
/// exceeds `max_chars`; words longer than a line are hard-broken at
/// the column limit so the loop always terminates. Operates on chars
/// (identical to the C byte walk for the ASCII strings this renders).
fn wrap_lines(s: &str, max_chars: usize) -> Vec<String> {
    let max_chars = max_chars.max(1);
    let chars: Vec<char> = s.chars().collect();
    let mut lines: Vec<String> = Vec::new();
    let mut line = String::new();
    let mut line_len = 0usize; /* chars in `line` */
    let mut i = 0usize;
    while i < chars.len() {
        while i < chars.len() && chars[i] == ' ' {
            i += 1;
        }
        if i >= chars.len() {
            break;
        }
        let wstart = i;
        while i < chars.len() && chars[i] != ' ' {
            i += 1;
        }
        let mut wlen = i - wstart;
        /* Word longer than the line - hard-break it. */
        if wlen > max_chars {
            if line_len > 0 {
                lines.push(std::mem::take(&mut line));
                line_len = 0;
            }
            let mut consumed = 0;
            while consumed < wlen {
                let take = (wlen - consumed).min(max_chars);
                lines.push(chars[wstart + consumed..wstart + consumed + take].iter().collect());
                consumed += take;
            }
            continue;
        }
        let needed = wlen + if line_len > 0 { 1 } else { 0 };
        if line_len + needed > max_chars {
            lines.push(std::mem::take(&mut line));
            line_len = 0;
        }
        if line_len > 0 {
            line.push(' ');
            line_len += 1;
        }
        /* Defensive guard from the C `char line[256]` - shouldn't
         * trigger for any realistic max_chars (cell_px>=8 means
         * <=32-char lines). */
        if line_len + wlen >= 255 {
            wlen = 254 - line_len;
        }
        line.extend(&chars[wstart..wstart + wlen]);
        line_len += wlen;
    }
    if line_len > 0 {
        lines.push(line);
    }
    lines
}

/// Port of `draw_text_centered_wrapped()`. Centred word-wrap; emits
/// each line via draw_text_centered. Returns the number of lines drawn
/// so the caller can advance the y cursor. Line pitch is `8 * scale`
/// px (one glyph cell).
#[allow(clippy::too_many_arguments)]
fn draw_text_centered_wrapped(
    s: &str,
    center_x: f32,
    screen_y: f32,
    scale: f32,
    max_width_px: f32,
    r: u8,
    g: u8,
    b: u8,
) -> i32 {
    if s.is_empty() {
        return 0;
    }
    let cell_px = 8.0 * scale;
    let max_chars = ((max_width_px / cell_px) as i32).max(1) as usize;
    let line_pitch = cell_px;
    let lines = wrap_lines(s, max_chars);
    for (i, line) in lines.iter().enumerate() {
        draw_text_centered(line, center_x, screen_y + line_pitch * i as f32, scale, r, g, b);
    }
    lines.len() as i32
}

/// Port of `draw_text_left()`.
fn draw_text_left(s: &str, screen_x: f32, screen_y: f32, scale: f32, r: u8, g: u8, b: u8) {
    let cell_px = 8.0 * scale;
    let (sw, sh) = screen_sizef();
    sdtx::canvas(sw / scale, sh / scale);
    sdtx::font(1);
    sdtx::origin(screen_x / cell_px, screen_y / cell_px);
    sdtx::color3b(r, g, b);
    sdtx::home();
    sdtx::puts(s);
    sdtx::font(0);
}

/// Port of `draw_button()`.
fn draw_button(b: &MenuButton) {
    if !b.visible {
        return;
    }
    if b.disabled {
        /* Dim fill + dim border; matches the "future feature" tone in
         * the rest of the UI. */
        quad(b.x, b.y, b.w, b.h, 0.08, 0.09, 0.12, 0.85);
        border(b.x, b.y, b.w, b.h, 2.0, 0.35, 0.38, 0.45, 0.85);
        return;
    }
    if b.hover {
        quad(b.x, b.y, b.w, b.h, 0.22, 0.30, 0.42, 0.95);
    } else {
        quad(b.x, b.y, b.w, b.h, 0.12, 0.14, 0.19, 0.90);
    }
    border(b.x, b.y, b.w, b.h, 2.0, 0.85, 0.90, 1.0, 1.0);
}

/* ------------------------------------------------------------------ */
/* Player-visible strings, factored pure so tests can pin them.        */
/* All ASCII, no underscores, no em-dashes (CLAUDE.md).                */
/* ------------------------------------------------------------------ */

const TXT_PROFILE_TITLE: &str = "WHO ARE YOU?";
const TXT_MAIN_TITLE: &str = "TENEBRIS";
const TXT_MAIN_HINT: &str = "select a mode";
const TXT_WORLD_TITLE: &str = "SELECT WORLD";
const TXT_MP_TITLE: &str = "MULTIPLAYER";
/* Shortened hint lines so they fit on narrow screens. */
const TXT_MP_HINT_SELF: &str = "self hosted = your machine (coming soon)";
const TXT_MP_HINT_CLOUD: &str = "cloud hosted = shared fly.io server";
const TXT_CLOUD_TITLE: &str = "CLOUD HOSTED";
const TXT_RECENT_ROOMS: &str = "RECENT ROOMS";
const TXT_CONNECT_FAILED: &str = "CONNECTION FAILED";
const TXT_URL_PROMPT: &str = "ENTER URL IN THE BROWSER PROMPT";
const TXT_PAUSED: &str = "PAUSED";
const TXT_DISCONNECTED: &str = "DISCONNECTED";
const TXT_SETTINGS_TITLE: &str = "SETTINGS";
const TXT_MOUSE_SENS: &str = "MOUSE SENSITIVITY";
const TXT_CHAT_FADE: &str = "CHAT FADE (SECONDS)";
const TXT_GFX_QUALITY: &str = "GRAPHICS QUALITY";
const TXT_RELOAD_TO_APPLY: &str = "(RELOAD TO APPLY)";

/// Title / hint / placeholder / text scale for the three text-input
/// screens (the inline ternaries in `menu_draw`'s input case).
fn input_screen_text(s: GameState) -> (&'static str, &'static str, &'static str, f32) {
    match s {
        GameState::ProfileNameInput => (
            "NEW PROFILE",
            "type your name  -  Enter to create  -  Esc to cancel",
            "(type your name)",
            2.0, /* names are longer than codes */
        ),
        GameState::SpNewWorldInput => (
            "NAME YOUR WORLD",
            "type a world name  -  Enter to create  -  Esc to cancel",
            "(type a world name)",
            2.0,
        ),
        /* GAME_MP_JOIN_INPUT defaults */
        _ => (
            "JOIN ROOM",
            "type the 6-char code  -  Enter to join  -  Esc to cancel",
            "(type here)",
            3.0,
        ),
    }
}

/// The active-profile chip label (`snprintf("as %s", ...)` into a
/// char[64] - truncate to 63 bytes for parity).
fn profile_chip_label(name: &str) -> String {
    trunc(&format!("as {}", name), 63)
}

/// The animated trailing-dots header: C
/// `snprintf("%s%s%s%s", prefix, d>=1?".":" ", d>=2?".":" ", d>=3?".":" ")`.
/// Note the padding spaces - the string is always prefix+3 chars wide
/// so the label doesn't wobble as the dots cycle.
fn header_with_dots(prefix: &str, dots: i32) -> String {
    format!(
        "{}{}{}{}",
        prefix,
        if dots >= 1 { "." } else { " " },
        if dots >= 2 { "." } else { " " },
        if dots >= 3 { "." } else { " " }
    )
}

/// Dot phase used by the pause + connecting overlays:
/// `((int)(t * 2.0)) % 4`.
fn dot_phase(t: f64) -> i32 {
    ((t * 2.0) as i32) % 4
}

/// `"ATTEMPT %d - %ds LEFT"` (remaining clamped at 0 before the cast,
/// like the C).
fn reconnect_attempt_line(attempts: i32, remaining_s: f64) -> String {
    let remaining = if remaining_s < 0.0 { 0.0 } else { remaining_s };
    format!("ATTEMPT {} - {}s LEFT", attempts, remaining as i32)
}

/// Share-result toast text + tint. 1 = Web Share API, 2 = clipboard,
/// anything else = failure / no API.
fn share_toast(result: i32) -> (&'static str, (u8, u8, u8)) {
    match result {
        1 => ("SHARED!", (0x80, 0xff, 0xa0)),
        2 => ("LINK COPIED TO CLIPBOARD", (0x80, 0xff, 0xa0)),
        _ => ("SHARE FAILED", (0xff, 0x80, 0x60)),
    }
}

/// Lite-graphics toggle label.
fn lite_graphics_label(on: bool) -> &'static str {
    if on {
        "LITE GRAPHICS: ON"
    } else {
        "LITE GRAPHICS: OFF"
    }
}

/// Mouse-sens readout: internal value is small (0.0005..0.0080) so we
/// display it x 1000 for a friendlier 0.5..8.0 readout (`"%.2f"`).
fn sens_readout(v: f32) -> String {
    format!("{:.2}", v * 1000.0)
}

/// Chat-fade readout (whole seconds, `"%.0f"`).
fn chat_fade_readout(v: f32) -> String {
    format!("{:.0}", v)
}

/// Input-caret blink phase: `(((int)(t_since * 2.0)) & 1) == 0`.
fn blink_on(t_since: f64) -> bool {
    (((t_since * 2.0) as i32) & 1) == 0
}

/* ------------------------------------------------------------------ */
/* menu_draw                                                            */
/* ------------------------------------------------------------------ */

thread_local! {
    /// The C `static sgl_pipeline pip` inside menu_draw - lazily
    /// created alpha-blend pipeline for the menu's own geometry.
    static MENU_PIP: std::cell::Cell<sgl::Pipeline> =
        const { std::cell::Cell::new(sgl::Pipeline { id: 0 }) };
}

/// Port of `menu_draw()`. Render the menu UI in screen-space. Call
/// after the 3D pass during menu states; safe (no-op) during in-game
/// states. Width/height are the current sapp framebuffer dimensions.
///
/// A single sdtx_draw happens in main_web (gameplay path uses the
/// end-of-frame flush; menu path uses the one right after this call
/// returns). Calling sdtx_draw twice per frame triggers the
/// once-per-frame buffer-upload guard inside sokol_debugtext and
/// leaves later text reads pointing at stale GPU memory.
/// app.rs (the main_web port) owns that single sdtx flush.
pub fn draw(screen_w: i32, screen_h: i32) {
    with_menu(|m| draw_inner(m, screen_w, screen_h));
}

fn draw_inner(m: &mut Menu, screen_w: i32, screen_h: i32) {
    if !state_is_overlay(m.state) {
        return;
    }
    /* Settings overlay is a self-contained unit - when it's visible
     * it draws its own full-screen dim backdrop + panel + text, and
     * the underlying menu (main menu / world picker / etc.) is
     * suppressed entirely. We can't safely interleave the two: sdtx
     * batches all text into one flush per frame, so the underlying
     * menu's labels would render ON TOP of the settings panel
     * geometry no matter how we ordered the sgl quads. The cleanest
     * fix is to draw exactly ONE menu unit at a time. */
    if m.settings_visible {
        settings_draw(m, screen_w as f32, screen_h as f32);
        return;
    }

    let w = screen_w as f32;
    let h = screen_h as f32;
    layout(m, w, h);

    sgl::defaults();
    sgl::matrix_mode_projection();
    sgl::load_identity();
    sgl::ortho(0.0, w, h, 0.0, -1.0, 1.0);
    sgl::matrix_mode_modelview();
    sgl::load_identity();

    let mut pip = MENU_PIP.with(|c| c.get());
    if pip.id == 0 {
        let mut desc = sg::PipelineDesc::new();
        desc.colors[0].blend.enabled = true;
        desc.colors[0].blend.src_factor_rgb = sg::BlendFactor::SrcAlpha;
        desc.colors[0].blend.dst_factor_rgb = sg::BlendFactor::OneMinusSrcAlpha;
        desc.colors[0].blend.src_factor_alpha = sg::BlendFactor::One;
        desc.colors[0].blend.dst_factor_alpha = sg::BlendFactor::One;
        pip = sgl::make_pipeline(&desc);
        MENU_PIP.with(|c| c.set(pip));
    }
    sgl::load_pipeline(pip);

    /* Backdrop covers the entire screen, dim. */
    quad(0.0, 0.0, w, h, 0.03, 0.05, 0.10, 0.85);

    /* Container panel behind every menu state's content. Sits the
     * buttons + title + helper text on a single readable surface
     * instead of letting them float on the dim sky. Sized generously
     * so the world picker / profile picker / cloud submenu all fit.
     * Slight border (matched to draw_button's outline) ties
     * everything together. Drawn before the buttons so it sits
     * underneath. */
    if m.state != GameState::ProfileSelect
        && m.state != GameState::MpUrlPrompt
        && m.state != GameState::MpConnectError
    {
        const PANEL_W: f32 = 520.0;
        const PANEL_H: f32 = 540.0;
        let px = w * 0.5 - PANEL_W * 0.5;
        let py = h * 0.5 - PANEL_H * 0.5;
        quad(px, py, PANEL_W, PANEL_H, 0.10, 0.12, 0.18, 0.95);
        border(px, py, PANEL_W, PANEL_H, 2.0, 0.85, 0.90, 1.0, 1.0);
    }

    /* Geometry */
    draw_button(&m.btn_sp);
    draw_button(&m.btn_mp);
    draw_button(&m.btn_self_host);
    draw_button(&m.btn_cloud_host);
    draw_button(&m.btn_host);
    draw_button(&m.btn_join);
    draw_button(&m.btn_active_profile);
    draw_button(&m.btn_settings);
    draw_button(&m.btn_new_profile);
    for i in 0..PROFILE_MAX {
        draw_button(&m.btn_profile[i]);
    }
    draw_button(&m.btn_new_world);
    for i in 0..MAX_WORLDS {
        draw_button(&m.btn_world[i]);
    }
    for i in 0..ROOM_HISTORY_MAX {
        draw_button(&m.btn_recent_room[i]);
    }
    draw_button(&m.btn_back);

    if m.state == GameState::MpUrlPrompt {
        quad(w * 0.5 - 200.0, h * 0.5 + 160.0, 400.0, 40.0, 0.20, 0.20, 0.22, 0.90);
    }

    /* Connection-failed popup panel. Dim red border so the warning
     * reads at a glance; matches the title colour used in the text
     * pass below. */
    if m.state == GameState::MpConnectError {
        const PANEL_W: f32 = 480.0;
        const PANEL_H: f32 = 160.0;
        let px = w * 0.5 - PANEL_W * 0.5;
        let py = h * 0.5 - PANEL_H - 40.0;
        quad(px, py, PANEL_W, PANEL_H, 0.10, 0.07, 0.09, 0.95);
        border(px, py, PANEL_W, PANEL_H, 2.0, 1.0, 0.45, 0.45, 1.0);
    }

    /* In-game text-input box for the JOIN / name flows. Real drawn
     * rect, blinking cursor, all driven by SAPP CHAR / KEY_DOWN
     * events. No browser prompt - per CLAUDE.md the canvas owns every
     * input panel. */
    if state_is_input(m.state) {
        /* Wider box for the longer name inputs; the room JOIN box
         * stays the same shape it had. */
        let is_long_input = m.state == GameState::ProfileNameInput
            || m.state == GameState::SpNewWorldInput;
        let box_w: f32 = if is_long_input { 480.0 } else { 320.0 };
        let box_h: f32 = 48.0;
        let bx = w * 0.5 - box_w * 0.5;
        let by = h * 0.5 - 24.0;
        let input_text_scale: f32 = if is_long_input { 2.0 } else { 3.0 };

        quad(bx, by, box_w, box_h, 0.12, 0.14, 0.19, 0.95);
        border(bx, by, box_w, box_h, 2.0, 0.85, 0.90, 1.0, 1.0);

        let t_since = now_s() - m.input_cursor_blink_start;
        if blink_on(t_since) {
            let cell = 8.0 * input_text_scale;
            let text_w = cell * m.input_buf.len() as f32;
            let text_x = w * 0.5 - text_w * 0.5;
            let caret_x = text_x + text_w + 2.0;
            let caret_y = by + 8.0;
            quad(caret_x, caret_y, 3.0, box_h - 16.0, 1.0, 0.95, 0.30, 1.0);
        }
    }

    sgl::draw();

    /* Text. */
    let cx = w * 0.5;

    match m.state {
        GameState::ProfileSelect => {
            draw_text_centered(TXT_PROFILE_TITLE, cx, h * 0.5 - 200.0, 3.0, 0xff, 0xff, 0xff);
            /* No empty-state hint: "+ NEW PROFILE" is the first button
             * in the picker. Floating grey text below it reads as
             * junk. */
        }
        GameState::MainMenu | GameState::MpUrlPrompt => {
            draw_text_centered(TXT_MAIN_TITLE, cx, h * 0.5 - 220.0, 5.0, 0xff, 0xff, 0xff);
            draw_text_centered(TXT_MAIN_HINT, cx, h * 0.5 - 160.0, 2.0, 0xa0, 0xb0, 0xc8);
        }
        GameState::SpWorldList => {
            draw_text_centered(TXT_WORLD_TITLE, cx, h * 0.5 - 200.0, 3.0, 0xff, 0xff, 0xff);
            /* No empty-state hint: "+ NEW WORLD" is the first button
             * in the list and reads as the obvious next click. */
        }
        GameState::MpSubmenu => {
            draw_text_centered(TXT_MP_TITLE, cx, h * 0.5 - 200.0, 3.0, 0xff, 0xff, 0xff);
            draw_text_centered(TXT_MP_HINT_SELF, cx, h * 0.5 + 180.0, 1.0, 0x70, 0x78, 0x88);
            draw_text_centered(TXT_MP_HINT_CLOUD, cx, h * 0.5 + 196.0, 1.0, 0xa0, 0xb0, 0xc8);
        }
        GameState::MpCloudSubmenu => {
            draw_text_centered(TXT_CLOUD_TITLE, cx, h * 0.5 - 200.0, 3.0, 0xff, 0xff, 0xff);
            if !m.recent_rooms.is_empty() {
                /* Heading sits just above the first recent-room
                 * button. Y matches the offset used in
                 * layout_mp_cloud_submenu. */
                let ry_heading = h * 0.5 + MAIN_BTN_H + MAIN_BTN_GAP * 0.5 + 8.0;
                draw_text_centered(TXT_RECENT_ROOMS, cx, ry_heading, 1.0, 0xa0, 0xb0, 0xc8);
            }
            /* No empty-state hint when there are no recent rooms. */
        }
        GameState::MpConnectError => {
            /* Geometry was already flushed above. Just the title /
             * message text here; the BACK button label is rendered by
             * the generic button-label pass further down. Panel
             * coordinates mirror the geometry block - keep in sync.
             * The kick text runs longer than the panel can hold at
             * scale 1.5, so draw_text_centered_wrapped breaks it
             * across lines on word boundaries instead of letting it
             * bleed past the border. */
            const PANEL_W: f32 = 480.0;
            const PANEL_H: f32 = 160.0;
            let py = h * 0.5 - PANEL_H - 40.0;
            let wrap_budget = PANEL_W - 32.0; /* 16 px pad each side */
            draw_text_centered(TXT_CONNECT_FAILED, cx, py + 28.0, 2.5, 0xff, 0xa0, 0xa0);
            if !m.error_msg.is_empty() {
                draw_text_centered_wrapped(
                    &m.error_msg,
                    cx,
                    py + 84.0,
                    1.5,
                    wrap_budget,
                    0xff,
                    0xff,
                    0xff,
                );
            }
        }
        GameState::MpJoinInput | GameState::ProfileNameInput | GameState::SpNewWorldInput => {
            let (title, hint, placeholder, text_scale) = input_screen_text(m.state);
            draw_text_centered(title, cx, h * 0.5 - 200.0, 3.0, 0xff, 0xff, 0xff);
            draw_text_centered(hint, cx, h * 0.5 + 60.0, 1.0, 0xa0, 0xb0, 0xc8);
            if !m.input_buf.is_empty() {
                draw_text_centered(&m.input_buf, cx, h * 0.5 - 12.0, text_scale, 0xff, 0xff, 0xff);
            } else {
                draw_text_centered(placeholder, cx, h * 0.5 - 4.0, 1.5, 0x55, 0x60, 0x70);
            }
        }
        _ => {}
    }

    /* Button labels: scale 2 for main menu / 1.5 for the denser
     * lists. */
    if m.btn_sp.visible {
        let bx = m.btn_sp.x + m.btn_sp.w * 0.5;
        let by = m.btn_sp.y + (m.btn_sp.h - 8.0 * 2.0) * 0.5;
        draw_text_centered(&m.btn_sp.label, bx, by, 2.0, 0xff, 0xff, 0xff);
    }
    if m.btn_mp.visible {
        let bx = m.btn_mp.x + m.btn_mp.w * 0.5;
        let by = m.btn_mp.y + (m.btn_mp.h - 8.0 * 2.0) * 0.5;
        draw_text_centered(&m.btn_mp.label, bx, by, 2.0, 0xff, 0xff, 0xff);
    }
    if m.btn_self_host.visible {
        let bx = m.btn_self_host.x + m.btn_self_host.w * 0.5;
        let by = m.btn_self_host.y + (m.btn_self_host.h - 8.0 * 2.0) * 0.5;
        /* Disabled buttons get a muted label colour to match their
         * dimmer fill. */
        let (lr, lg, lb) = if m.btn_self_host.disabled {
            (0x70, 0x78, 0x88)
        } else {
            (0xff, 0xff, 0xff)
        };
        draw_text_centered(&m.btn_self_host.label, bx, by, 2.0, lr, lg, lb);
    }
    if m.btn_cloud_host.visible {
        let bx = m.btn_cloud_host.x + m.btn_cloud_host.w * 0.5;
        let by = m.btn_cloud_host.y + (m.btn_cloud_host.h - 8.0 * 2.0) * 0.5;
        draw_text_centered(&m.btn_cloud_host.label, bx, by, 2.0, 0xff, 0xff, 0xff);
    }
    if m.btn_host.visible {
        let bx = m.btn_host.x + m.btn_host.w * 0.5;
        let by = m.btn_host.y + (m.btn_host.h - 8.0 * 2.0) * 0.5;
        draw_text_centered(&m.btn_host.label, bx, by, 2.0, 0xff, 0xff, 0xff);
    }
    if m.btn_join.visible {
        let bx = m.btn_join.x + m.btn_join.w * 0.5;
        let by = m.btn_join.y + (m.btn_join.h - 8.0 * 2.0) * 0.5;
        draw_text_centered(&m.btn_join.label, bx, by, 2.0, 0xff, 0xff, 0xff);
    }
    if m.btn_active_profile.visible {
        let chip = profile_chip_label(&m.btn_active_profile.label);
        let bx = m.btn_active_profile.x + m.btn_active_profile.w * 0.5;
        let by = m.btn_active_profile.y + (m.btn_active_profile.h - 8.0 * 1.0) * 0.5;
        draw_text_centered(&chip, bx, by, 1.0, 0xc0, 0xd0, 0xe8);
    }
    if m.btn_new_world.visible {
        let bx = m.btn_new_world.x + 20.0;
        let by = m.btn_new_world.y + (m.btn_new_world.h - 8.0 * 1.5) * 0.5;
        draw_text_left(&m.btn_new_world.label, bx, by, 1.5, 0x90, 0xff, 0xa0);
    }
    for i in 0..MAX_WORLDS {
        let b = &m.btn_world[i];
        if !b.visible {
            continue;
        }
        let bx = b.x + 20.0;
        let by = b.y + (b.h - 8.0 * 1.5) * 0.5;
        draw_text_left(&b.label, bx, by, 1.5, 0xff, 0xff, 0xff);
    }
    for i in 0..ROOM_HISTORY_MAX {
        let b = &m.btn_recent_room[i];
        if !b.visible {
            continue;
        }
        let bx = b.x + b.w * 0.5;
        let by = b.y + (b.h - 8.0 * 1.5) * 0.5;
        draw_text_centered(&b.label, bx, by, 1.5, 0xff, 0xff, 0xff);
    }
    if m.btn_new_profile.visible {
        let bx = m.btn_new_profile.x + 20.0;
        let by = m.btn_new_profile.y + (m.btn_new_profile.h - 8.0 * 1.5) * 0.5;
        draw_text_left(&m.btn_new_profile.label, bx, by, 1.5, 0x90, 0xff, 0xa0);
    }
    for i in 0..PROFILE_MAX {
        let b = &m.btn_profile[i];
        if !b.visible {
            continue;
        }
        let bx = b.x + 20.0;
        let by = b.y + (b.h - 8.0 * 1.5) * 0.5;
        draw_text_left(&b.label, bx, by, 1.5, 0xff, 0xff, 0xff);
    }
    if m.btn_back.visible {
        let bx = m.btn_back.x + m.btn_back.w * 0.5;
        let by = m.btn_back.y + (m.btn_back.h - 8.0 * 1.5) * 0.5;
        draw_text_centered(&m.btn_back.label, bx, by, 1.5, 0xc0, 0xc0, 0xc0);
    }

    if m.state == GameState::MpUrlPrompt {
        draw_text_centered(TXT_URL_PROMPT, cx, h * 0.5 + 170.0, 2.0, 0xff, 0xd0, 0x60);
    }

    /* (Settings overlay is drawn from the early-return path at the top
     * of this function so it stands alone as its own UI unit.) */
}

/* ------------------------------------------------------------------ */
/* State transitions                                                    */
/* ------------------------------------------------------------------ */

/// Port of `enter_world_list()`.
fn enter_world_list(m: &mut Menu) {
    m.worlds = persistence::list_worlds();
    m.state = GameState::SpWorldList;
    m.delete_confirm = None;
    println!("[menu] SP world list: {} saved world(s)", m.worlds.len());
}

/// Port of `start_sp_for_world()`.
fn start_sp_for_world(m: &mut Menu, world_name: &str) {
    m.active_world = trunc(world_name, persistence::NAME_MAX);
    resolve_world_seed(m, world_name);
    if let Some(s) = persistence::load(world_name) {
        println!(
            "[menu] SP load '{}' at ({:.1}, {:.1}, {:.1}) mode={}",
            world_name,
            s.pos_x,
            s.pos_y,
            s.pos_z,
            if s.survival { "survival" } else { "creative" }
        );
        /* The world's persisted mode wins over the new-world picker -
         * re-entering a survival world must come back survival (this
         * reverting to creative was the "why is there 9999 of stuff /
         * instant mine in my survival world" bug). */
        m.new_world_survival = s.survival;
        m.resume = Some(s);
    } else {
        m.resume = None;
        println!(
            "[menu] SP new '{}' (no save yet, mode={})",
            world_name,
            if m.new_world_survival { "survival" } else { "creative" }
        );
    }
    m.state = GameState::InGameSp;
}

/// Resolve the terrain seed for the world being entered and stash it
/// in `pending_world_seed` for app.rs to consume on the SP transition.
///
/// - A stored seed wins (the world was created after the seed feature).
/// - No stored seed but a saved pose = a pre-seed-feature world; its
///   edits were made against the compiled-in default terrain, so it
///   keeps the default seed. Persisted now so the mapping is explicit.
/// - Neither = a brand-new world: roll a fresh random seed and persist
///   it on this same input frame (per-edit persistence rule).
fn resolve_world_seed(m: &mut Menu, world_name: &str) {
    let default = tenebris_core::planet::default_seed(tenebris_core::planet::BodyId::Tenebris);
    let seed = match persistence::load_seed(world_name) {
        Some(s) => s,
        None => {
            let s = if persistence::exists(world_name) {
                default
            } else {
                let mut b = [0u8; 8];
                profile::random_bytes(&mut b);
                u64::from_le_bytes(b)
            };
            persistence::save_seed(world_name, s);
            s
        }
    };
    m.pending_world_seed = seed;
    println!(
        "[menu] world '{}' seed=0x{:016x}{}",
        world_name,
        seed,
        if seed == default { " (default)" } else { "" }
    );
}

/// The terrain seed of the SP world being entered / played, resolved
/// by start_sp_for_world. app.rs compares it against the loaded
/// planet's seed on the SP transition and regenerates the terrain
/// when they differ. 0 = nothing resolved yet (boot); callers map
/// that to the compiled-in default.
pub fn pending_world_seed() -> u64 {
    let s = with_menu(|m| m.pending_world_seed);
    if s == 0 {
        tenebris_core::planet::default_seed(tenebris_core::planet::BodyId::Tenebris)
    } else {
        s
    }
}

/// Port of `start_sp_new_world()`. Drops to the in-game text-input
/// flow. submit_world_name routes the typed name back through
/// start_sp_for_world. The old window.prompt path is gone per
/// CLAUDE.md.
fn start_sp_new_world(m: &mut Menu) {
    m.input_buf.clear();
    m.input_cursor_blink_start = now_s();
    /* New worlds default to SURVIVAL - the game's real mode; sandbox
     * is the opt-in (and G still toggles in-game). */
    m.new_world_survival = true;
    m.state = GameState::SpNewWorldInput;
    js::focus_text_input();
}

/// Port of `room_code_is_valid()`. True if `s` is a syntactically
/// valid 6-char uppercase-alphanumeric room code. Mirrors
/// input_accepts_char for MP_JOIN_INPUT plus the length check. Used to
/// filter stale / garbage entries when reading back the persisted
/// history.
fn room_code_is_valid(s: &str) -> bool {
    if s.len() != ROOM_CODE_LEN {
        return false;
    }
    s.bytes().all(|c| c.is_ascii_uppercase() || c.is_ascii_digit())
}

/// The line parser of `recent_rooms_load()`, factored pure for tests.
/// The stored format is one code per line, MRU first. Invalid /
/// duplicate / over-long entries are dropped silently so a corrupted
/// localStorage key doesn't break the menu.
fn parse_recent_rooms(csv: &str) -> Vec<String> {
    let mut out: Vec<String> = Vec::new();
    for line in csv.split('\n') {
        if out.len() >= ROOM_HISTORY_MAX {
            break;
        }
        if line.len() != ROOM_CODE_LEN {
            continue;
        }
        let dup = out.iter().any(|r| r == line);
        if !dup && room_code_is_valid(line) {
            out.push(line.to_string());
        }
    }
    out
}

/// Port of `recent_rooms_load()`. Refresh recent_rooms from client_kv.
fn recent_rooms_load(m: &mut Menu) {
    m.recent_rooms.clear();
    if let Some(csv) = client_kv::get(ROOM_HISTORY_KV_KEY) {
        m.recent_rooms = parse_recent_rooms(&csv);
    }
}

/// Port of `recent_rooms_save()`. Write recent_rooms back to client_kv
/// in MRU-first order.
///
/// Note (faithful to the C tree): the WEB kv backend (localStorage)
/// stores the newline-joined list verbatim, so the full history
/// round-trips there. The NATIVE kv backend scrubs framing newlines
/// (C `kv_strip_framing` and the Rust port alike), so on native only
/// a single-entry history survives a re-read. The menu ships as a web
/// game; native keeps the same lossy behavior rather than diverging
/// from the C build.
fn recent_rooms_save(m: &Menu) {
    let buf = m.recent_rooms.join("\n");
    if buf.is_empty() {
        client_kv::remove(ROOM_HISTORY_KV_KEY);
    } else {
        client_kv::set(ROOM_HISTORY_KV_KEY, &buf);
    }
}

/// The MRU mutation inside `menu_record_recent_room()`, factored pure
/// for tests: drop any existing copy so the code moves to the front,
/// shift right to make room at index 0, cap at ROOM_HISTORY_MAX.
fn mru_insert(rooms: &mut Vec<String>, room_code: &str) {
    rooms.retain(|r| r != room_code);
    rooms.truncate(ROOM_HISTORY_MAX - 1);
    rooms.insert(0, room_code.to_string());
}

/// Port of `menu_record_recent_room()`'s body, on a borrowed Menu so
/// connect paths already inside the global borrow can call it.
fn record_recent_room_inner(m: &mut Menu, room_code: &str) {
    if !room_code_is_valid(room_code) {
        return;
    }
    /* Re-read so a record from main_web's URL-bypass path doesn't
     * stomp a list mutated by a different session / tab. */
    recent_rooms_load(m);
    mru_insert(&mut m.recent_rooms, room_code);
    recent_rooms_save(m);
}

/// Port of `menu_record_recent_room()`. Append a 6-char room code to
/// the MRU "recent rooms" list backed by client_kv. Called by the
/// menu's own connect path; also called from main_web's URL-bypass
/// branch (?room= / ?invite=) so links count as joins. Empty or
/// invalid codes are ignored.
pub fn record_recent_room(room_code: &str) {
    with_menu(|m| record_recent_room_inner(m, room_code));
}

/// Port of `connect_to_room()`.
fn connect_to_room(m: &mut Menu, room_code: &str) {
    /* MP requires a profile - the server uses the token to key
     * persisted poses and the name to label nameplates. If we got
     * here without one, the profile-gate in start_multiplayer was
     * bypassed; bounce back to the picker rather than logging in as
     * guest-N. */
    let Some(active) = profile::get_active() else {
        m.pending_mp_after_profile = true;
        m.profiles = profile::list();
        m.state = if !m.profiles.is_empty() {
            GameState::ProfileSelect
        } else {
            GameState::ProfileNameInput
        };
        return;
    };
    let tok = active.token.as_str();
    let name = active.name.as_str();
    net_client::set_profile(tok, name, room_code);
    m.room_code = trunc(room_code, 8);
    println!(
        "[menu] MP: connect to {} (room='{}')",
        DEFAULT_MP_SERVER_URL,
        if m.room_code.is_empty() {
            "(public)"
        } else {
            &m.room_code
        }
    );
    /* Stash the connect parameters so tick can rebuild the session if
     * the socket drops mid-game. Cleared when we leave MP (so a
     * manual quit doesn't trigger phantom reconnects). */
    m.reconnect_url = trunc(DEFAULT_MP_SERVER_URL, 127);
    m.reconnect_token = trunc(tok, 39);
    m.reconnect_name = trunc(name, 39);
    m.reconnect_room = trunc(room_code, 8);
    m.reconnect_deadline_t = 0.0;
    m.reconnect_next_try_t = 0.0;
    m.reconnect_attempts = 0;
    net_connect(DEFAULT_MP_SERVER_URL);
    record_recent_room_inner(m, room_code);
    m.active_world.clear(); /* no SP save target while in MP */
    m.state = GameState::InGameMp;
}

/// Port of `start_host()`. Generate a fresh room code, connect to it.
/// Cloud submenu's HOST button.
fn start_host(m: &mut Menu) {
    let Some(code) = js::new_room_code() else {
        return;
    };
    connect_to_room(m, &code);
}

/// Port of `start_multiplayer()`. MP requires a profile so the server
/// can attribute saves + label nameplates with a real name. If the
/// player hasn't picked / created one yet, gate the MP submenu behind
/// the profile picker (or the name-input screen if there are no
/// profiles to pick from). enter_main_menu_with will see the
/// pending_mp_after_profile flag and route straight to MP_SUBMENU once
/// the profile lands.
fn start_multiplayer(m: &mut Menu) {
    if profile::get_active().is_none() {
        m.pending_mp_after_profile = true;
        m.profiles = profile::list();
        if !m.profiles.is_empty() {
            m.state = GameState::ProfileSelect;
        } else {
            m.input_buf.clear();
            m.input_cursor_blink_start = now_s();
            m.state = GameState::ProfileNameInput;
        }
        return;
    }
    /* MP button drops to the self-host / cloud-host picker - the
     * actual connect happens after the user picks one. */
    m.state = GameState::MpSubmenu;
}

/// Port of `consume_pending_invite_if_ready()`. If a deep-link invite
/// is waiting and we now have an active profile, jump straight into
/// the room. Called from enter_main_menu_with (after the player picks
/// / creates a profile via the wizard). Idempotent: once consumed, the
/// stored room is cleared so further profile swaps don't reconnect.
fn consume_pending_invite_if_ready(m: &mut Menu) {
    if m.pending_invite_room.is_empty() {
        return;
    }
    let Some(active) = profile::get_active() else {
        return;
    };

    let room = m.pending_invite_room.clone();
    let server = if !m.pending_invite_server.is_empty() {
        m.pending_invite_server.clone()
    } else {
        DEFAULT_MP_SERVER_URL.to_string()
    };

    net_client::set_profile(&active.token, &active.name, &room);
    m.room_code = trunc(&room, 8);
    m.reconnect_url = trunc(&server, 127);
    m.reconnect_token = trunc(&active.token, 39);
    m.reconnect_name = trunc(&active.name, 39);
    m.reconnect_room = trunc(&room, 8);
    m.reconnect_deadline_t = 0.0;
    m.reconnect_next_try_t = 0.0;
    m.reconnect_attempts = 0;
    net_connect(&server);
    record_recent_room_inner(m, &room);
    m.active_world.clear();
    m.state = GameState::InGameMp;

    m.pending_invite_room.clear();
    m.pending_invite_server.clear();
}

/// Port of `enter_main_menu_with()`.
fn enter_main_menu_with(m: &mut Menu, p: &Profile) {
    profile::set_active(&p.token);
    m.state = GameState::MainMenu;
    /* A first-time visitor following an invite link lands on the
     * profile picker, creates a profile, and gets dropped straight
     * into the invited room here. No-op when no invite is pending. */
    consume_pending_invite_if_ready(m);
    /* If the player came in via the MP gate (clicked MULTIPLAYER
     * without an active profile), continue to the MP submenu now that
     * they have one. Invite-flow above already routes past the main
     * menu; this is the manual MP-button case. */
    if m.pending_mp_after_profile && m.state == GameState::MainMenu {
        m.pending_mp_after_profile = false;
        m.state = GameState::MpSubmenu;
    } else {
        m.pending_mp_after_profile = false;
    }
}

/// Port of `menu_set_pending_invite()`. Stash a deep-link invite (room
/// code + optional server override). Invite links ALWAYS route through
/// the profile picker first (which init already left as the boot
/// state) - a returning user joining from a fresh tab gets one
/// deliberate "which profile am I?" confirmation click before
/// enter_main_menu_with re-runs consume_pending_invite_if_ready and
/// the invite room auto-loads. Pass "" for `server_url` to use the
/// bundled default.
pub fn set_pending_invite(room_code: &str, server_url: &str) {
    with_menu(|m| {
        if room_code.is_empty() {
            m.pending_invite_room.clear();
            m.pending_invite_server.clear();
            return;
        }
        m.pending_invite_room = trunc(room_code, 8);
        if !server_url.is_empty() {
            m.pending_invite_server = trunc(server_url, 255);
        } else {
            m.pending_invite_server.clear();
        }
    });
}

/// Port of `new_profile_flow()`. In-game text input -
/// submit_profile_name calls profile::create + enter_main_menu_with on
/// Enter. The character filter in input_accepts_char already drops the
/// storage-format separators (newline, CR, colon, tab), so the typed
/// buffer is safe to pass straight to profile::create.
fn new_profile_flow(m: &mut Menu) {
    m.input_buf.clear();
    m.input_cursor_blink_start = now_s();
    m.state = GameState::ProfileNameInput;
    /* Pop the OS soft keyboard on mobile - no-op on desktop. */
    js::focus_text_input();
}

/* ------------------------------------------------------------------ */
/* Click routing                                                        */
/* ------------------------------------------------------------------ */

/// Port of `on_click_profile_select()`.
fn on_click_profile_select(m: &mut Menu, x: f32, y: f32) {
    if hit(&m.btn_new_profile, x, y) {
        new_profile_flow(m);
        return;
    }
    for i in 0..PROFILE_MAX {
        if hit(&m.btn_profile[i], x, y) {
            let p = m.profiles[i].clone();
            enter_main_menu_with(m, &p);
            return;
        }
    }
}

/// Port of `on_click_main()`.
fn on_click_main(m: &mut Menu, x: f32, y: f32) {
    if hit(&m.btn_active_profile, x, y) {
        /* Refresh the cache + drop to picker. */
        m.profiles = profile::list();
        m.state = GameState::ProfileSelect;
        return;
    }
    if hit(&m.btn_settings, x, y) {
        m.settings_visible = true;
        return;
    }
    if hit(&m.btn_sp, x, y) {
        enter_world_list(m);
        return;
    }
    if hit(&m.btn_mp, x, y) {
        start_multiplayer(m);
    }
}

/// Port of `on_click_world_list()`.
fn on_click_world_list(m: &mut Menu, x: f32, y: f32) {
    if hit(&m.btn_back, x, y) {
        m.state = GameState::MainMenu;
        return;
    }
    if hit(&m.btn_new_world, x, y) {
        start_sp_new_world(m);
        return;
    }
    for i in 0..MAX_WORLDS {
        if hit(&m.btn_world[i], x, y) {
            let world = m.worlds[i].clone();
            start_sp_for_world(m, &world);
            return;
        }
    }
}

/// Port of `enter_mp_cloud_submenu()`.
fn enter_mp_cloud_submenu(m: &mut Menu) {
    recent_rooms_load(m);
    m.state = GameState::MpCloudSubmenu;
}

/// Port of `on_click_mp_submenu()`.
fn on_click_mp_submenu(m: &mut Menu, x: f32, y: f32) {
    if hit(&m.btn_back, x, y) {
        m.state = GameState::MainMenu;
        return;
    }
    /* SELF HOSTED is set_button_disabled -> hit() returns false; click
     * falls through silently. CLOUD HOSTED enters its own submenu. */
    if hit(&m.btn_cloud_host, x, y) {
        enter_mp_cloud_submenu(m);
    }
}

/// Port of `on_click_mp_cloud_submenu()`.
fn on_click_mp_cloud_submenu(m: &mut Menu, x: f32, y: f32) {
    if hit(&m.btn_back, x, y) {
        m.state = GameState::MpSubmenu;
        return;
    }
    if hit(&m.btn_host, x, y) {
        start_host(m);
        return;
    }
    if hit(&m.btn_join, x, y) {
        m.input_buf.clear();
        m.input_cursor_blink_start = now_s();
        m.state = GameState::MpJoinInput;
        js::focus_text_input();
        return;
    }
    for i in 0..ROOM_HISTORY_MAX {
        if hit(&m.btn_recent_room[i], x, y) {
            let room = m.recent_rooms[i].clone();
            connect_to_room(m, &room);
            return;
        }
    }
}

/// Port of `on_click_join_input()`.
fn on_click_join_input(m: &mut Menu, x: f32, y: f32) {
    if hit(&m.btn_back, x, y) {
        m.state = GameState::MpCloudSubmenu;
        js::blur_text_input();
    }
}

/// Port of `on_click_profile_name_input()`.
fn on_click_profile_name_input(m: &mut Menu, x: f32, y: f32) {
    if hit(&m.btn_back, x, y) {
        m.state = GameState::ProfileSelect;
        js::blur_text_input();
    }
}

/// Port of `on_click_new_world_input()`.
fn on_click_new_world_input(m: &mut Menu, x: f32, y: f32) {
    if hit(&m.btn_back, x, y) {
        m.state = GameState::SpWorldList;
        js::blur_text_input();
    }
}

/// Port of `on_click_connect_error()`.
fn on_click_connect_error(m: &mut Menu, x: f32, y: f32) {
    if !hit(&m.btn_back, x, y) {
        return;
    }
    /* Tear down the dead socket so the next attempt starts clean,
     * then drop the player back to the top of the menu tree. */
    net_client::disconnect();
    m.error_msg.clear();
    m.room_code.clear();
    m.state = GameState::MainMenu;
}

/// Port of `on_click()`.
fn on_click(m: &mut Menu, x: f32, y: f32) {
    match m.state {
        GameState::ProfileSelect => on_click_profile_select(m, x, y),
        GameState::MainMenu => on_click_main(m, x, y),
        GameState::SpWorldList => on_click_world_list(m, x, y),
        GameState::MpSubmenu => on_click_mp_submenu(m, x, y),
        GameState::MpCloudSubmenu => on_click_mp_cloud_submenu(m, x, y),
        GameState::MpJoinInput => on_click_join_input(m, x, y),
        GameState::ProfileNameInput => on_click_profile_name_input(m, x, y),
        GameState::SpNewWorldInput => on_click_new_world_input(m, x, y),
        GameState::MpConnectError => on_click_connect_error(m, x, y),
        _ => {}
    }
}

/* ------------------------------------------------------------------ */
/* Text input                                                           */
/* ------------------------------------------------------------------ */

/// Port of `state_is_input()`.
fn state_is_input(s: GameState) -> bool {
    s == GameState::MpJoinInput
        || s == GameState::ProfileNameInput
        || s == GameState::SpNewWorldInput
}

/// Port of `input_accepts_char()`. Per-input-state: which characters
/// are allowed. JOIN room codes are uppercase + digit only; profile /
/// world names accept printable ASCII minus the storage-format
/// separators (newline, CR, colon, tab) so they can sit in a
/// localStorage key without ambiguity.
fn input_accepts_char(s: GameState, ch: u32) -> bool {
    if s == GameState::MpJoinInput {
        if (b'a' as u32..=b'z' as u32).contains(&ch) {
            return true; /* will fold to upper */
        }
        return (b'A' as u32..=b'Z' as u32).contains(&ch)
            || (b'0' as u32..=b'9' as u32).contains(&ch);
    }
    /* Profile + world names: printable ASCII minus separators. */
    if !(0x20..=0x7e).contains(&ch) {
        return false;
    }
    ch != ':' as u32 && ch != '\t' as u32
}

/// Port of `input_append_char()`.
fn input_append_char(m: &mut Menu, ch: u32) {
    if !state_is_input(m.state) {
        return;
    }
    if m.input_buf.len() >= INPUT_BUF_MAX {
        return;
    }
    if !input_accepts_char(m.state, ch) {
        return;
    }
    let mut ch = ch;
    /* Room codes auto-uppercased so users don't need to think about
     * case. */
    if m.state == GameState::MpJoinInput && (b'a' as u32..=b'z' as u32).contains(&ch) {
        ch -= ('a' as u32) - ('A' as u32);
    }
    m.input_buf.push(ch as u8 as char); /* filter guarantees ASCII */
    m.input_cursor_blink_start = now_s();
}

/// Port of `input_backspace()`.
fn input_backspace(m: &mut Menu) {
    if !state_is_input(m.state) {
        return;
    }
    if m.input_buf.is_empty() {
        return;
    }
    m.input_buf.pop();
    m.input_cursor_blink_start = now_s();
}

/// Port of `submit_profile_name()`.
fn submit_profile_name(m: &mut Menu, name: &str) {
    let Some(p) = profile::create(name) else {
        return;
    };
    enter_main_menu_with(m, &p);
}

/// Port of `submit_world_name()`.
fn submit_world_name(m: &mut Menu, name: &str) {
    start_sp_for_world(m, name);
}

/// Port of `input_submit()`.
fn input_submit(m: &mut Menu) {
    if !state_is_input(m.state) {
        return;
    }
    if m.input_buf.is_empty() {
        return; /* empty submit = no-op */
    }
    let buf = m.input_buf.clone();
    match m.state {
        GameState::MpJoinInput => connect_to_room(m, &buf),
        GameState::ProfileNameInput => submit_profile_name(m, &buf),
        GameState::SpNewWorldInput => submit_world_name(m, &buf),
        _ => {}
    }
}

/// Port of `input_cancel()`.
fn input_cancel(m: &mut Menu) {
    match m.state {
        GameState::MpJoinInput => m.state = GameState::MpCloudSubmenu,
        GameState::ProfileNameInput => m.state = GameState::ProfileSelect,
        GameState::SpNewWorldInput => m.state = GameState::SpWorldList,
        _ => {}
    }
    js::blur_text_input();
}

/* ------------------------------------------------------------------ */
/* Event handling                                                       */
/* ------------------------------------------------------------------ */

/// Port of `menu_event()`. Returns true if the event was consumed by
/// the menu.
pub fn handle_event(e: &sapp::Event) -> bool {
    with_menu(|m| handle_event_inner(m, e))
}

fn handle_event_inner(m: &mut Menu, e: &sapp::Event) -> bool {
    if !state_is_overlay(m.state) {
        return false;
    }
    /* Settings overlay (if visible) is a modal that swallows
     * everything before any other menu logic gets to see it. */
    if m.settings_visible {
        return settings_event(m, e);
    }
    /* Text-input flow gets first crack at keyboard events. */
    if state_is_input(m.state) {
        if e._type == sapp::EventType::Char {
            input_append_char(m, e.char_code);
            return true;
        }
        if e._type == sapp::EventType::KeyDown {
            if e.key_code == sapp::Keycode::Enter {
                input_submit(m);
                return true;
            }
            if e.key_code == sapp::Keycode::Backspace {
                input_backspace(m);
                return true;
            }
            if e.key_code == sapp::Keycode::Escape {
                /* Cancel back to the screen the input was launched
                 * from. input_cancel handles the per-state target +
                 * drops the mobile soft keyboard. */
                input_cancel(m);
                return true;
            }
        }
    }
    match e._type {
        sapp::EventType::MouseMove => {
            m.mouse_x = e.mouse_x;
            m.mouse_y = e.mouse_y;
            true
        }
        sapp::EventType::MouseDown => {
            if e.mouse_button == sapp::Mousebutton::Left {
                on_click(m, e.mouse_x, e.mouse_y);
                return true;
            }
            false
        }
        sapp::EventType::TouchesBegan => {
            if e.num_touches > 0 {
                m.mouse_x = e.touches[0].pos_x;
                m.mouse_y = e.touches[0].pos_y;
                let (x, y) = (m.mouse_x, m.mouse_y);
                on_click(m, x, y);
            }
            true
        }
        _ => true, /* swallow */
    }
}

/* ------------------------------------------------------------------ */
/* Public                                                               */
/* ------------------------------------------------------------------ */

/// Port of `menu_init()`.
pub fn init() {
    with_menu(|m| {
        *m = Menu::default();
        profile::module_init();
        /* Cache the profile list for the picker screen up front. If a
         * profile is already active (returning user) we still land on
         * the picker so they can swap accounts - one tap on their
         * name advances to the main menu. */
        m.profiles = profile::list();
        m.state = GameState::ProfileSelect;
    });
}

/// Port of `menu_shutdown()`.
pub fn shutdown() {}

/// Port of `menu_state()`.
pub fn state() -> GameState {
    with_menu(|m| m.state)
}

/// Port of `menu_force_state()`. Used by main_web on a `?server=` URL
/// bypass to skip past the menu into MP gameplay. Don't use this from
/// inside the menu - the regular click handlers are the supported
/// path.
pub fn force_state(s: GameState) {
    with_menu(|m| m.state = s);
}

/// The `menu_is_overlay()` predicate on a given state (the C reads the
/// global; the inner fns here already hold the borrow).
fn state_is_overlay(s: GameState) -> bool {
    s == GameState::ProfileSelect
        || s == GameState::ProfileNameInput
        || s == GameState::MainMenu
        || s == GameState::SpWorldList
        || s == GameState::SpNewWorldInput
        || s == GameState::MpSubmenu
        || s == GameState::MpCloudSubmenu
        || s == GameState::MpJoinInput
        || s == GameState::MpUrlPrompt
        || s == GameState::MpConnectError
}

/// Port of `menu_is_overlay()`.
pub fn is_overlay() -> bool {
    with_menu(|m| state_is_overlay(m.state))
}

/// Port of `launch_reconnect_attempt()`.
fn launch_reconnect_attempt(m: &mut Menu) {
    if m.reconnect_url.is_empty() {
        return;
    }
    m.reconnect_attempts += 1;
    println!(
        "[menu] MP reconnect attempt {} -> {} (room='{}')",
        m.reconnect_attempts,
        m.reconnect_url,
        if m.reconnect_room.is_empty() {
            "(public)"
        } else {
            &m.reconnect_room
        }
    );
    /* set_profile must come BEFORE connect - net_client_connect
     * memsets its state, so the profile has to land after that. */
    net_client::set_profile(&m.reconnect_token, &m.reconnect_name, &m.reconnect_room);
    net_connect(&m.reconnect_url);
}

/// Port of `menu_tick()`. Per-frame poll. Reads net_client state and
/// drives transitions that can't be tied to a user click - e.g.
/// promoting IN_GAME_MP to MP_CONNECT_ERROR when the socket dies.
/// Cheap; safe to call every frame from main_web's frame().
pub fn tick() {
    with_menu(tick_inner);
}

fn tick_inner(m: &mut Menu) {
    /* Only watch from inside the in-game state - checking from menu
     * screens would re-fire the popup the moment the user clicked
     * BACK TO MENU (state is still ERROR until the next connect
     * attempt overwrites it). */
    if m.state != GameState::InGameMp {
        /* Leaving MP cancels any in-flight retry window and drops the
         * stashed reconnect params so a stale URL doesn't get fired
         * against a fresh session later. */
        m.reconnect_deadline_t = 0.0;
        m.reconnect_next_try_t = 0.0;
        m.reconnect_url.clear();
        return;
    }
    let ns = poll_net();

    /* Reconnect resolved successfully - clear the retry window. The
     * one-time MP spawn snap already ran on the first WELCOME, so a
     * successful reconnect leaves the player where they currently are
     * (matches the 'don't teleport on temporary disconnect' rule). If
     * we auto-opened the pause panel on the drop, dismiss it now so
     * the player can keep playing without an extra click. */
    if ns.state == NetLinkState::Ready && m.reconnect_deadline_t > 0.0 {
        println!(
            "[menu] MP reconnect succeeded after {} attempt(s)",
            m.reconnect_attempts
        );
        m.reconnect_deadline_t = 0.0;
        m.reconnect_next_try_t = 0.0;
        m.reconnect_attempts = 0;
        if m.pause_auto_disconnect {
            set_pause_visible(m, false, "reconnect-auto-resume");
            m.pause_auto_disconnect = false;
        }
        return;
    }
    if ns.state != NetLinkState::Error {
        return;
    }

    /* Promote to the error popup if we have nothing to retry with
     * (manual disconnect path, or the very first connect failed
     * before reconnect_url got populated - shouldn't happen but keeps
     * the surface symmetric). Same path for server-issued terminal
     * kicks (version mismatch, etc) - those never resolve via retry,
     * so jump straight to the popup with the kick text. */
    if m.reconnect_url.is_empty() || !ns.can_retry {
        let msg = ns.error_message.as_deref().unwrap_or("connection failed");
        m.error_msg = trunc(msg, 95);
        m.state = GameState::MpConnectError;
        if m.pause_visible && m.pause_auto_disconnect {
            set_pause_visible(m, false, "kick-no-retry");
            m.pause_auto_disconnect = false;
        }
        m.reconnect_deadline_t = 0.0;
        m.reconnect_next_try_t = 0.0;
        println!("[menu] MP terminal error (no retry): {}", m.error_msg);
        return;
    }

    let now = now_s();
    /* First time we observe ERROR in this session: open the retry
     * window AND auto-open the pause panel so the reconnect status
     * (and the disabled RETURN TO GAME button) is the only thing the
     * player sees behind the dim backdrop. pause_auto_disconnect lets
     * us close the panel without a click once the link is back. */
    if m.reconnect_deadline_t == 0.0 {
        m.reconnect_deadline_t = now + MP_RECONNECT_TOTAL_S;
        m.reconnect_next_try_t = now + 0.5;
        m.reconnect_attempts = 0;
        if !m.pause_visible {
            m.pause_auto_disconnect = true;
            set_pause_visible(m, true, "auto-open-on-disconnect");
        }
        println!(
            "[menu] MP link dropped, retrying for {:.0}s",
            MP_RECONNECT_TOTAL_S
        );
        return;
    }

    /* Past the deadline -> give up and show the disconnected popup. */
    if now >= m.reconnect_deadline_t {
        m.error_msg = "DISCONNECTED FROM SERVER".to_string();
        m.state = GameState::MpConnectError;
        m.reconnect_deadline_t = 0.0;
        m.reconnect_next_try_t = 0.0;
        println!(
            "[menu] MP reconnect gave up after {} attempt(s)",
            m.reconnect_attempts
        );
        return;
    }

    /* Fire the next attempt if we're past the pacing gate. */
    if now >= m.reconnect_next_try_t {
        launch_reconnect_attempt(m);
        m.reconnect_next_try_t = now + MP_RECONNECT_INTERVAL_S;
    }
}

/// Port of `menu_room_code()`. The 6-char room code shown in the HUD
/// while in IN_GAME_MP. Empty string = public room. Set when the menu
/// enters MP.
pub fn room_code() -> String {
    with_menu(|m| m.room_code.clone())
}

/// Port of `menu_take_sp_resume()`. If the SP transition queued a
/// saved pose to resume from, return it. One-shot: returns None on
/// subsequent calls until the next SP transition. Caller (main_web)
/// applies the pose to the player on entering IN_GAME_SP.
/// app.rs consumes this on the SP transition (maybe_apply_sp_resume).
pub fn take_sp_resume() -> Option<PersistenceSave> {
    with_menu(|m| m.resume.take())
}

/// Port of `menu_active_world()`. The name of the world the SP session
/// is currently writing back to. Empty string when not in SP. Used by
/// the throttled autosave in main_web.
pub fn active_world() -> String {
    with_menu(|m| m.active_world.clone())
}

/// Test-only hook: set the SP active-world directly (the effect
/// `start_sp_world` has) so other modules' tests can stand up the
/// `menu_state() == GAME_IN_GAME_SP && menu_active_world()` persistence
/// gate without driving the whole menu UI flow.
#[cfg(test)]
pub(crate) fn test_set_active_world(name: &str) {
    with_menu(|m| m.active_world = name.to_string());
}

/* ------------------------------------------------------------------ */
/* In-game pause overlay                                                */
/* ------------------------------------------------------------------ */

/// Port of `menu_pause_active()`.
pub fn pause_active() -> bool {
    with_menu(|m| m.pause_visible)
}

/// Port of `set_pause_visible()`. The C version wraps every
/// pause_visible mutation so mystery writes can be traced; the trace
/// is compiled out but the single-writer discipline is kept.
fn set_pause_visible(m: &mut Menu, v: bool, _who: &str) {
    m.pause_visible = v;
}

/// Port of `menu_pause_toggle()`. Call on SAPP_KEYCODE_ESCAPE during
/// gameplay (main_web).
pub fn pause_toggle() {
    with_menu(|m| {
        let is_game = m.state == GameState::InGameSp || m.state == GameState::InGameMp;
        if !is_game {
            set_pause_visible(m, false, "toggle:not-game");
            return;
        }
        let v = !m.pause_visible;
        set_pause_visible(m, v, "toggle");
    });
}

/// Port of `pause_btn_t`. `label == None` parks the button offscreen
/// (the C uses a NULL label + (-1e9, -1e9) position; the hit test
/// checks the label).
#[derive(Clone, Copy, Debug, PartialEq)]
struct PauseBtn {
    x: f32,
    y: f32,
    w: f32,
    h: f32,
    label: Option<&'static str>,
}

/// Port of the C static `G_pl` struct filled by `pause_layout()`. Both
/// the draw path and the click path recompute it fresh in the C, so
/// the port returns it by value instead of stashing a global.
#[derive(Clone, Copy, Debug, PartialEq)]
struct PauseLayout {
    panel_x: f32,
    panel_y: f32,
    panel_w: f32,
    panel_h: f32,
    resume: PauseBtn,
    settings: PauseBtn,
    invite: PauseBtn,
    quit: PauseBtn,
}

/// Port of `pause_layout()`. Pause panel layout in screen pixels.
fn compute_pause_layout(is_mp: bool, w: f32, h: f32) -> PauseLayout {
    let btn_w: f32 = 320.0;
    let btn_h: f32 = 64.0;
    let gap: f32 = 18.0;
    let pad: f32 = 28.0;
    /* RESUME + SETTINGS + (INVITE if MP) + QUIT */
    let row_count: i32 = if is_mp { 4 } else { 3 };
    let panel_w = btn_w + 2.0 * pad;
    let panel_h = 110.0                       /* title block */
        + row_count as f32 * btn_h
        + (row_count - 1) as f32 * gap
        + pad;
    let panel_x = (w - panel_w) * 0.5;
    let panel_y = (h - panel_h) * 0.5;
    let btn_x = panel_x + pad;
    let mut btn_y = panel_y + 110.0;

    let resume = PauseBtn { x: btn_x, y: btn_y, w: btn_w, h: btn_h, label: Some("RETURN TO GAME") };
    btn_y += btn_h + gap;
    let settings = PauseBtn { x: btn_x, y: btn_y, w: btn_w, h: btn_h, label: Some("SETTINGS") };
    btn_y += btn_h + gap;
    let invite = if is_mp {
        let b = PauseBtn { x: btn_x, y: btn_y, w: btn_w, h: btn_h, label: Some("INVITE PLAYERS") };
        btn_y += btn_h + gap;
        b
    } else {
        /* Hide invite by parking it offscreen so the hit-test never
         * matches. SP doesn't have a room to invite anyone to. */
        PauseBtn { x: -1e9, y: -1e9, w: 0.0, h: 0.0, label: None }
    };
    let quit = PauseBtn { x: btn_x, y: btn_y, w: btn_w, h: btn_h, label: Some("QUIT TO MENU") };

    PauseLayout { panel_x, panel_y, panel_w, panel_h, resume, settings, invite, quit }
}

/// Port of `pause_btn_hit()`.
fn pause_btn_hit(b: &PauseBtn, x: f32, y: f32) -> bool {
    if b.label.is_none() {
        return false;
    }
    x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h
}

/// Port of `menu_pause_draw()`. Overlay drawn on top of IN_GAME_SP /
/// IN_GAME_MP; the world keeps rendering behind the panel.
pub fn pause_draw(screen_w: i32, screen_h: i32) {
    with_menu(|m| pause_draw_inner(m, screen_w, screen_h));
}

/// The main pause panel, rendered in egui (RETURN TO GAME / SETTINGS /
/// INVITE(MP) / QUIT). Self-gates on pause being visible with the Settings
/// sub-panel closed (that sub-panel stays on the sokol `pause_draw` path).
/// Added to the in-game egui dispatch in app.rs.
pub fn pause_egui_ui(ctx: &egui::Context) {
    let (show, is_mp, reconnecting) = with_menu(|m| {
        (
            m.pause_visible && !m.settings_visible,
            m.state == GameState::InGameMp,
            m.reconnect_deadline_t > 0.0,
        )
    });
    if !show {
        return;
    }

    let mut do_resume = false;
    let mut do_settings = false;
    let mut do_invite = false;
    let mut do_quit = false;

    egui::Window::new("tenebris-pause")
        .title_bar(false)
        .resizable(false)
        .collapsible(false)
        .anchor(egui::Align2::CENTER_CENTER, egui::Vec2::ZERO)
        .show(ctx, |ui| {
            ui.vertical_centered(|ui| {
                ui.add_space(6.0);
                if reconnecting {
                    ui.label(
                        egui::RichText::new("DISCONNECTED")
                            .size(30.0)
                            .strong()
                            .color(egui::Color32::from_rgb(0xff, 0xc0, 0x60)),
                    );
                    ui.label(
                        egui::RichText::new("reconnecting...")
                            .color(egui::Color32::from_rgb(0xc0, 0xc0, 0xff)),
                    );
                } else {
                    ui.label(
                        egui::RichText::new("PAUSED")
                            .size(34.0)
                            .strong()
                            .color(egui::Color32::from_rgb(0xe6, 0xea, 0xf2)),
                    );
                }
                ui.add_space(16.0);
                if ui
                    .add_enabled(!reconnecting, egui::Button::new(
                        egui::RichText::new("Return to Game").size(20.0),
                    ).min_size(egui::vec2(280.0, 42.0)))
                    .clicked()
                {
                    do_resume = true;
                }
                ui.add_space(8.0);
                if menu_button(ui, "Settings").clicked() {
                    do_settings = true;
                }
                if is_mp {
                    ui.add_space(8.0);
                    if menu_button(ui, "Invite Players").clicked() {
                        do_invite = true;
                    }
                }
                ui.add_space(8.0);
                if menu_button(ui, "Quit to Menu").clicked() {
                    do_quit = true;
                }
            });
        });

    with_menu(|m| {
        if do_resume && !reconnecting {
            pause_apply(m, PauseAction::Resume);
        } else if do_settings {
            pause_apply(m, PauseAction::Settings);
        } else if do_invite {
            pause_apply(m, PauseAction::Invite);
        } else if do_quit {
            pause_apply(m, PauseAction::Quit);
        }
    });
}

/// A pause-panel button action, factored out of `pause_egui_ui` so both the
/// egui buttons and the unit tests drive the exact same state transitions.
enum PauseAction {
    Resume,
    Settings,
    Invite,
    Quit,
}

fn pause_apply(m: &mut Menu, action: PauseAction) {
    match action {
        PauseAction::Resume => {
            set_pause_visible(m, false, "resume");
            m.pause_auto_disconnect = false;
        }
        PauseAction::Settings => {
            m.settings_visible = true;
        }
        PauseAction::Invite => {
            let room = m.room_code.clone();
            let rc = js::share_invite(&room);
            m.pause_share_result = if rc == 0 { 3 } else { rc };
            m.pause_share_msg_until = now_s() + 2.5;
        }
        PauseAction::Quit => {
            if m.state == GameState::InGameMp {
                net_client::disconnect();
                m.room_code.clear();
            }
            m.active_world.clear();
            set_pause_visible(m, false, "quit");
            m.state = GameState::MainMenu;
        }
    }
}

fn pause_draw_inner(m: &mut Menu, screen_w: i32, screen_h: i32) {
    if !m.pause_visible {
        return;
    }
    /* Settings overlay is a self-contained unit. If it's open we draw
     * ONLY settings and skip the pause panel entirely - sdtx batches
     * all text into one flush per frame, so leaving the pause-panel
     * labels queued would let them render on top of the settings
     * panel geometry. One menu unit at a time. */
    if m.settings_visible {
        settings_draw(m, screen_w as f32, screen_h as f32);
        return;
    }
    /* The main pause panel now renders in egui (see `pause_egui_ui`);
     * this sokol path only owns the Settings sub-panel above. */
}

/// Port of `menu_connecting_draw()`. Cross-platform connecting overlay
/// drawn while the MP socket is mid-connect / mid-handshake. Caller
/// (main_web) decides when to call this based on net_client state; the
/// panel is otherwise stateless. Geometry uses the shared mobile_ui
/// alpha pipeline so it shares the centralised sgl flush at the end of
/// the frame.
pub fn connecting_draw(screen_w: i32, screen_h: i32, status_label: &str, room_label: &str) {
    let w = screen_w as f32;
    let h = screen_h as f32;
    if w <= 0.0 || h <= 0.0 {
        return;
    }

    /* Panel sized like a stripped-down pause card - 320 wide so even
     * a narrow phone in portrait gets a readable label without
     * truncating. */
    let panel_w: f32 = 320.0;
    let panel_h: f32 = 120.0;
    let panel_x = (w - panel_w) * 0.5;
    let panel_y = (h - panel_h) * 0.5;

    sgl::defaults();
    sgl::matrix_mode_projection();
    sgl::load_identity();
    sgl::ortho(0.0, w, h, 0.0, -1.0, 1.0);
    sgl::matrix_mode_modelview();
    sgl::load_identity();
    sgl::load_pipeline(mobile_ui::alpha_pipeline());

    /* Full-screen dim backdrop - matches the pause panel's tint so
     * the transition between connecting -> in-game feels continuous. */
    mobile_ui::draw_rect(0.0, 0.0, w, h, 0.02, 0.03, 0.07, 0.75);
    mobile_ui::draw_rect(panel_x, panel_y, panel_w, panel_h, 0.10, 0.12, 0.18, 0.96);
    mobile_ui::draw_rect_outline(panel_x, panel_y, panel_w, panel_h, 2.0, 0.85, 0.90, 1.00, 1.0);

    /* Animated trailing dots so the player knows the screen is live
     * and the client hasn't hung. Cycles 1 -> 4 dots over a second. */
    let t_now = now_s();
    let (retrying, attempts, deadline) =
        with_menu(|m| (m.reconnect_deadline_t > 0.0, m.reconnect_attempts, m.reconnect_deadline_t));
    let header = header_with_dots(
        if retrying { "RECONNECTING" } else { "CONNECTING" },
        dot_phase(t_now),
    );
    let cx = w * 0.5;
    draw_text_centered(&header, cx, panel_y + 24.0, 3.0, 0xff, 0xff, 0xff);

    let retry_line = if retrying {
        reconnect_attempt_line(attempts, deadline - t_now)
    } else {
        String::new()
    };
    let sub = if retrying { retry_line.as_str() } else { status_label };
    if !sub.is_empty() {
        draw_text_centered(sub, cx, panel_y + 62.0, 1.5, 0xc0, 0xc0, 0xff);
    }
    if !room_label.is_empty() {
        draw_text_centered(room_label, cx, panel_y + 88.0, 1.5, 0x80, 0xff, 0xa0);
    }
}

/// Port of `menu_pause_event()`. Route events here BEFORE input.c /
/// chat / teleport_menu see them while the pause panel is up.
/// app.rs wires that routing order (event_inner).
pub fn pause_event(e: &sapp::Event) -> bool {
    with_menu(|m| pause_event_inner(m, e))
}

fn pause_event_inner(m: &mut Menu, e: &sapp::Event) -> bool {
    if !m.pause_visible {
        return false;
    }
    /* Settings overlay opened from the pause panel is modal on top of
     * pause - swallow everything through settings first. */
    if m.settings_visible {
        return settings_event(m, e);
    }

    /* Track mouse for hover. */
    if e._type == sapp::EventType::MouseMove {
        m.mouse_x = e.mouse_x;
        m.mouse_y = e.mouse_y;
        return true;
    }
    if e._type == sapp::EventType::TouchesMoved && e.num_touches > 0 {
        m.mouse_x = e.touches[0].pos_x;
        m.mouse_y = e.touches[0].pos_y;
        return true;
    }

    /* Escape inside the pause overlay is INTENTIONALLY swallowed
     * without closing the panel. The player must click RETURN TO GAME
     * to resume. This keeps the behaviour symmetric: the first Escape
     * opens pause + releases pointer lock (the browser intercepts it
     * for the lock release; main_web's pointer-lock-loss detector
     * turns that into a pause_toggle), and the close action is a
     * deliberate click on the resume button. */
    if e._type == sapp::EventType::KeyDown && e.key_code == sapp::Keycode::Escape {
        /* Esc closes the pause panel (resume) - symmetric with the Esc
         * that opened it. While MP is reconnecting, resume is disabled,
         * so keep the panel up until the socket is back. */
        if m.reconnect_deadline_t <= 0.0 {
            set_pause_visible(m, false, "esc-resume");
            m.pause_auto_disconnect = false;
            show_mouse(true);
        }
        return true;
    }

    /* The pause panel's buttons live in egui now (`pause_egui_ui`), which
     * consumes its own clicks via egui_layer::handle_event (run before
     * this). Everything else - clicks on the dim backdrop, movement keys,
     * scroll - is swallowed here so the player can't act behind the panel. */
    true
}

/* ------------------------------------------------------------------ */
/* Settings overlay - modal panel reachable from both the main menu    */
/* and the pause menu. Hosts the mouse-sensitivity slider for now;     */
/* future settings (audio volume, FOV, etc.) get appended to the same  */
/* panel. Owns its own visibility flag (m.settings_visible) so the     */
/* underlying surface keeps drawing behind it.                         */
/* ------------------------------------------------------------------ */

/// Port of `settings_layout()`.
fn settings_layout(m: &mut Menu, w: f32, h: f32) {
    let px = (w - SETTINGS_PANEL_W) * 0.5;
    let py = (h - SETTINGS_PANEL_H) * 0.5;
    let (mx, my) = (m.mouse_x, m.mouse_y);
    /* Three rows stacked: mouse-sens slider, chat-fade slider, then
     * lite-graphics toggle button. Each leaves room above for the
     * label / value text. */
    m.sens_track_x = px + 40.0;
    m.sens_track_y = py + 130.0;
    m.sens_track_w = SETTINGS_PANEL_W - 80.0;
    m.sens_track_h = SETTINGS_TRACK_H;
    m.chat_track_x = px + 40.0;
    m.chat_track_y = py + 230.0;
    m.chat_track_w = SETTINGS_PANEL_W - 80.0;
    m.chat_track_h = SETTINGS_TRACK_H;
    /* Lite-graphics toggle - same width as the slider tracks so the
     * three rows visually line up; label drawn just above. */
    set_button(
        &mut m.btn_lite_graphics,
        px + 40.0,
        py + 310.0,
        SETTINGS_PANEL_W - 80.0,
        40.0,
        lite_graphics_label(settings::lite_graphics()),
        mx,
        my,
    );
    /* BACK button anchored to the panel's bottom edge. */
    set_button(
        &mut m.btn_settings_back,
        px + (SETTINGS_PANEL_W - 200.0) * 0.5,
        py + SETTINGS_PANEL_H - 70.0,
        200.0,
        48.0,
        "BACK",
        mx,
        my,
    );
}

/// Port of `sens_value_to_handle_x()`. Map current sens value to a
/// screen x along the track (handle centre).
fn sens_value_to_handle_x(m: &Menu) -> f32 {
    let v = settings::mouse_sensitivity();
    let mut t = (v - settings::MOUSE_SENS_MIN) / (settings::MOUSE_SENS_MAX - settings::MOUSE_SENS_MIN);
    t = t.clamp(0.0, 1.0);
    m.sens_track_x + t * m.sens_track_w
}

/// Port of `sens_set_from_handle_x()`. Inverse of above - clamp a
/// mouse x to the track and convert to a sens value, then commit via
/// settings::set_mouse_sensitivity (which persists through client_kv).
fn sens_set_from_handle_x(m: &Menu, x: f32) {
    let mut t = (x - m.sens_track_x) / m.sens_track_w;
    t = t.clamp(0.0, 1.0);
    let v = settings::MOUSE_SENS_MIN + t * (settings::MOUSE_SENS_MAX - settings::MOUSE_SENS_MIN);
    settings::set_mouse_sensitivity(v);
}

/// Port of `sens_track_hit()`. True when the cursor is over the
/// slider's hit zone. Extended a few px vertically beyond the track
/// itself so the handle is easy to grab on a phone.
fn sens_track_hit(m: &Menu, x: f32, y: f32) -> bool {
    const PAD: f32 = 12.0;
    x >= m.sens_track_x
        && x <= m.sens_track_x + m.sens_track_w
        && y >= m.sens_track_y - PAD
        && y <= m.sens_track_y + m.sens_track_h + PAD
}

/* Chat-fade slider helpers - mirror the sens versions exactly, just
 * bound to settings::chat_fade_s instead of mouse sensitivity. */

/// Port of `chat_value_to_handle_x()`.
fn chat_value_to_handle_x(m: &Menu) -> f32 {
    let v = settings::chat_fade_s();
    let mut t = (v - settings::CHAT_FADE_MIN_S) / (settings::CHAT_FADE_MAX_S - settings::CHAT_FADE_MIN_S);
    t = t.clamp(0.0, 1.0);
    m.chat_track_x + t * m.chat_track_w
}

/// Port of `chat_set_from_handle_x()`.
fn chat_set_from_handle_x(m: &Menu, x: f32) {
    let mut t = (x - m.chat_track_x) / m.chat_track_w;
    t = t.clamp(0.0, 1.0);
    let v = settings::CHAT_FADE_MIN_S + t * (settings::CHAT_FADE_MAX_S - settings::CHAT_FADE_MIN_S);
    settings::set_chat_fade_s(v);
}

/// Port of `chat_track_hit()`.
fn chat_track_hit(m: &Menu, x: f32, y: f32) -> bool {
    const PAD: f32 = 12.0;
    x >= m.chat_track_x
        && x <= m.chat_track_x + m.chat_track_w
        && y >= m.chat_track_y - PAD
        && y <= m.chat_track_y + m.chat_track_h + PAD
}

/// Port of `settings_draw()`.
fn settings_draw(m: &mut Menu, w: f32, h: f32) {
    settings_layout(m, w, h);
    let px = (w - SETTINGS_PANEL_W) * 0.5;
    let py = (h - SETTINGS_PANEL_H) * 0.5;

    sgl::defaults();
    sgl::matrix_mode_projection();
    sgl::load_identity();
    sgl::ortho(0.0, w, h, 0.0, -1.0, 1.0);
    sgl::matrix_mode_modelview();
    sgl::load_identity();
    let pip = mobile_ui::alpha_pipeline();
    sgl::load_pipeline(pip);

    /* Dim backdrop covers everything below. */
    mobile_ui::draw_rect(0.0, 0.0, w, h, 0.02, 0.03, 0.07, 0.78);
    /* Panel + border. */
    mobile_ui::draw_rect(px, py, SETTINGS_PANEL_W, SETTINGS_PANEL_H, 0.10, 0.12, 0.18, 0.96);
    mobile_ui::draw_rect_outline(px, py, SETTINGS_PANEL_W, SETTINGS_PANEL_H, 2.0, 0.85, 0.90, 1.00, 1.0);

    /* Two sliders stacked: mouse sens then chat fade. Same shape for
     * both - track with filled left half + handle. Inline so the
     * geometry batches in a single sgl pass. */
    const HANDLE_W: f32 = 18.0;
    const HANDLE_H_OFF: f32 = 14.0;
    /* --- mouse sens slider --- */
    {
        let hx = sens_value_to_handle_x(m);
        mobile_ui::draw_rect(m.sens_track_x, m.sens_track_y, m.sens_track_w, m.sens_track_h, 0.18, 0.20, 0.26, 1.0);
        mobile_ui::draw_rect(m.sens_track_x, m.sens_track_y, hx - m.sens_track_x, m.sens_track_h, 0.45, 0.65, 0.95, 1.0);
        mobile_ui::draw_rect_outline(m.sens_track_x, m.sens_track_y, m.sens_track_w, m.sens_track_h, 1.5, 0.85, 0.90, 1.00, 1.0);
        let handle_h = m.sens_track_h + HANDLE_H_OFF;
        let hx_l = hx - HANDLE_W * 0.5;
        let hy_l = m.sens_track_y - 7.0;
        mobile_ui::draw_rect(hx_l, hy_l, HANDLE_W, handle_h, 0.90, 0.92, 1.0, 1.0);
        mobile_ui::draw_rect_outline(hx_l, hy_l, HANDLE_W, handle_h, 2.0, 0.30, 0.40, 0.60, 1.0);
    }
    /* --- chat fade slider --- */
    {
        let hx = chat_value_to_handle_x(m);
        mobile_ui::draw_rect(m.chat_track_x, m.chat_track_y, m.chat_track_w, m.chat_track_h, 0.18, 0.20, 0.26, 1.0);
        mobile_ui::draw_rect(m.chat_track_x, m.chat_track_y, hx - m.chat_track_x, m.chat_track_h, 0.45, 0.65, 0.95, 1.0);
        mobile_ui::draw_rect_outline(m.chat_track_x, m.chat_track_y, m.chat_track_w, m.chat_track_h, 1.5, 0.85, 0.90, 1.00, 1.0);
        let handle_h = m.chat_track_h + HANDLE_H_OFF;
        let hx_l = hx - HANDLE_W * 0.5;
        let hy_l = m.chat_track_y - 7.0;
        mobile_ui::draw_rect(hx_l, hy_l, HANDLE_W, handle_h, 0.90, 0.92, 1.0, 1.0);
        mobile_ui::draw_rect_outline(hx_l, hy_l, HANDLE_W, handle_h, 2.0, 0.30, 0.40, 0.60, 1.0);
    }

    /* Lite-graphics toggle. The button background is tinted green
     * when ON, grey when OFF, so the state is readable at a glance
     * before reading the label. */
    {
        let lite_hover = hit(&m.btn_lite_graphics, m.mouse_x, m.mouse_y);
        let lite_on = settings::lite_graphics();
        let (r, g, b) = if lite_on {
            if lite_hover { (0.28, 0.46, 0.28) } else { (0.18, 0.36, 0.20) }
        } else if lite_hover {
            (0.22, 0.30, 0.42)
        } else {
            (0.12, 0.14, 0.19)
        };
        mobile_ui::draw_rect(m.btn_lite_graphics.x, m.btn_lite_graphics.y, m.btn_lite_graphics.w, m.btn_lite_graphics.h, r, g, b, 0.98);
        mobile_ui::draw_rect_outline(m.btn_lite_graphics.x, m.btn_lite_graphics.y, m.btn_lite_graphics.w, m.btn_lite_graphics.h, 2.0, 0.85, 0.90, 1.00, 1.0);
    }

    /* BACK button - re-use the menu button visuals. */
    let back_hover = hit(&m.btn_settings_back, m.mouse_x, m.mouse_y);
    if back_hover {
        mobile_ui::draw_rect(m.btn_settings_back.x, m.btn_settings_back.y, m.btn_settings_back.w, m.btn_settings_back.h, 0.22, 0.30, 0.42, 0.98);
    } else {
        mobile_ui::draw_rect(m.btn_settings_back.x, m.btn_settings_back.y, m.btn_settings_back.w, m.btn_settings_back.h, 0.12, 0.14, 0.19, 0.95);
    }
    mobile_ui::draw_rect_outline(m.btn_settings_back.x, m.btn_settings_back.y, m.btn_settings_back.w, m.btn_settings_back.h, 2.0, 0.85, 0.90, 1.00, 1.0);

    /* Text labels on top of the geometry. */
    let cx = w * 0.5;
    draw_text_centered(TXT_SETTINGS_TITLE, cx, py + 22.0, 3.5, 0xff, 0xff, 0xff);
    /* Mouse sens label + value. */
    draw_text_centered(TXT_MOUSE_SENS, cx, py + 80.0, 1.5, 0xc0, 0xc8, 0xd8);
    let buf = sens_readout(settings::mouse_sensitivity());
    draw_text_centered(&buf, cx, py + 104.0, 1.5, 0xff, 0xe0, 0x60);
    /* Chat fade label + value (whole seconds). */
    draw_text_centered(TXT_CHAT_FADE, cx, py + 180.0, 1.5, 0xc0, 0xc8, 0xd8);
    let buf = chat_fade_readout(settings::chat_fade_s());
    draw_text_centered(&buf, cx, py + 204.0, 1.5, 0xff, 0xe0, 0x60);
    /* Lite-graphics label + button text + reload hint. The toggle
     * persists immediately but only takes visual effect on the next
     * page reload (perf mode is locked in before renderer init), so
     * we surface that explicitly. */
    draw_text_centered(TXT_GFX_QUALITY, cx, py + 282.0, 1.5, 0xc0, 0xc8, 0xd8);
    draw_text_centered(
        &m.btn_lite_graphics.label,
        m.btn_lite_graphics.x + m.btn_lite_graphics.w * 0.5,
        m.btn_lite_graphics.y + (m.btn_lite_graphics.h - 8.0 * 1.6) * 0.5,
        1.6,
        0xff,
        0xff,
        0xff,
    );
    draw_text_centered(TXT_RELOAD_TO_APPLY, cx, py + 356.0, 1.0, 0x90, 0x98, 0xa8);
    /* BACK button label. */
    draw_text_centered(
        &m.btn_settings_back.label,
        m.btn_settings_back.x + m.btn_settings_back.w * 0.5,
        m.btn_settings_back.y + (m.btn_settings_back.h - 8.0 * 2.0) * 0.5,
        2.0,
        0xff,
        0xff,
        0xff,
    );
}

/// Port of `settings_event()`. Handles every event while
/// m.settings_visible is true. Returns true for events consumed; the
/// modal swallows everything except hover tracking so input doesn't
/// leak through to the menu / gameplay.
fn settings_event(m: &mut Menu, e: &sapp::Event) -> bool {
    /* Hover tracking + drag updates ride on mouse_move /
     * touches_moved. */
    if e._type == sapp::EventType::MouseMove {
        m.mouse_x = e.mouse_x;
        m.mouse_y = e.mouse_y;
        if m.sens_dragging {
            sens_set_from_handle_x(m, e.mouse_x);
        }
        if m.chat_dragging {
            chat_set_from_handle_x(m, e.mouse_x);
        }
        return true;
    }
    if e._type == sapp::EventType::TouchesMoved && e.num_touches > 0 {
        m.mouse_x = e.touches[0].pos_x;
        m.mouse_y = e.touches[0].pos_y;
        if m.sens_dragging {
            sens_set_from_handle_x(m, e.touches[0].pos_x);
        }
        if m.chat_dragging {
            chat_set_from_handle_x(m, e.touches[0].pos_x);
        }
        return true;
    }
    /* Escape closes the overlay so the player isn't trapped if the
     * BACK button somehow gets covered. */
    if e._type == sapp::EventType::KeyDown && e.key_code == sapp::Keycode::Escape {
        m.settings_visible = false;
        m.sens_dragging = false;
        m.chat_dragging = false;
        return true;
    }

    /* Mouse / touch press, release. */
    let mut press = false;
    let mut release = false;
    let mut cx = 0.0;
    let mut cy = 0.0;
    if e._type == sapp::EventType::MouseDown && e.mouse_button == sapp::Mousebutton::Left {
        press = true;
        cx = e.mouse_x;
        cy = e.mouse_y;
    } else if e._type == sapp::EventType::TouchesBegan && e.num_touches > 0 {
        press = true;
        cx = e.touches[0].pos_x;
        cy = e.touches[0].pos_y;
    } else if e._type == sapp::EventType::MouseUp && e.mouse_button == sapp::Mousebutton::Left {
        release = true;
    } else if e._type == sapp::EventType::TouchesEnded
        || e._type == sapp::EventType::TouchesCancelled
    {
        release = true;
    }
    if press {
        let (sw, sh) = screen_sizef();
        settings_layout(m, sw, sh);
        if hit(&m.btn_settings_back, cx, cy) {
            m.settings_visible = false;
            m.sens_dragging = false;
            m.chat_dragging = false;
            return true;
        }
        if sens_track_hit(m, cx, cy) {
            m.sens_dragging = true;
            sens_set_from_handle_x(m, cx);
            return true;
        }
        if chat_track_hit(m, cx, cy) {
            m.chat_dragging = true;
            chat_set_from_handle_x(m, cx);
            return true;
        }
        if hit(&m.btn_lite_graphics, cx, cy) {
            /* Flip the persistent flag; the label updates on the next
             * settings_layout() call (next draw). Doesn't rebuild
             * pipelines - the player has to reload. */
            settings::set_lite_graphics(!settings::lite_graphics());
            return true;
        }
        /* Press elsewhere inside the modal does nothing but is still
         * consumed - prevents click-through to the underlying menu /
         * gameplay. */
        return true;
    }
    if release {
        m.sens_dragging = false;
        m.chat_dragging = false;
        return true;
    }
    /* Swallow every other event (keyboard, scroll, etc.) so chat /
     * movement can't fire behind the panel. */
    true
}

/* ------------------------------------------------------------------ */
/* Tests                                                                */
/* ------------------------------------------------------------------ */

#[cfg(test)]
mod tests {
    use super::*;
    use crate::client_kv::test_support;
    use sapp::{Event, EventType, Keycode, Mousebutton, Touchpoint};
    use std::sync::MutexGuard;

    const W: f32 = 1280.0;
    const H: f32 = 720.0;

    /// Every test starts from a clean module: fresh kv store (menu,
    /// profile, persistence and settings all write through it - the
    /// guard also serializes against every other kv-touching test),
    /// fresh menu state, known screen size / clock / net link.
    fn setup(name: &str) -> MutexGuard<'static, ()> {
        let guard = test_support::begin(name);
        test_doubles::SCREEN.with(|c| c.set((W, H)));
        test_doubles::set_now(0.0);
        test_doubles::MOUSE_SHOWN.with(|c| c.set(None));
        test_net::set(NetPoll {
            state: NetLinkState::Other,
            can_retry: true,
            error_message: None,
        });
        init();
        guard
    }

    /// Run the same layout pass menu_draw performs before its
    /// hit-tested geometry, headless (the C positions buttons inside
    /// menu_draw; clicks resolve against the last drawn layout).
    fn run_layout() {
        with_menu(|m| layout(m, W, H));
    }

    fn snap<R>(f: impl FnOnce(&Menu) -> R) -> R {
        M.with(|cell| f(&cell.borrow()))
    }

    fn key(k: Keycode) -> Event {
        Event {
            _type: EventType::KeyDown,
            key_code: k,
            ..Default::default()
        }
    }

    fn ch(c: char) -> Event {
        Event {
            _type: EventType::Char,
            char_code: c as u32,
            ..Default::default()
        }
    }

    fn click(x: f32, y: f32) -> Event {
        Event {
            _type: EventType::MouseDown,
            mouse_button: Mousebutton::Left,
            mouse_x: x,
            mouse_y: y,
            ..Default::default()
        }
    }

    fn mouse_move(x: f32, y: f32) -> Event {
        Event {
            _type: EventType::MouseMove,
            mouse_x: x,
            mouse_y: y,
            ..Default::default()
        }
    }

    fn touch(t: EventType, x: f32, y: f32) -> Event {
        let mut e = Event {
            _type: t,
            num_touches: 1,
            ..Default::default()
        };
        e.touches[0] = Touchpoint {
            identifier: 1,
            pos_x: x,
            pos_y: y,
            changed: true,
            ..Default::default()
        };
        e
    }

    fn type_str(s: &str) {
        for c in s.chars() {
            handle_event(&ch(c));
        }
    }

    /// Make a profile the way the C boot flow would have left one:
    /// created + active, then re-init so the picker cache sees it.
    fn with_profile(name: &str) -> Profile {
        let p = profile::create(name).expect("profile created");
        init();
        p
    }

    fn sample_save() -> PersistenceSave {
        PersistenceSave {
            pos_x: 10.0,
            pos_y: -20.5,
            pos_z: 300.25,
            yaw: 1.5,
            pitch: -0.25,
            roll: 0.0,
            body_id: 2,
        
            survival: false,
        }
    }

    /* -- boot + state machine basics ---------------------------------- */

    #[test]
    fn boot_lands_on_profile_select() {
        let _g = setup("menu_boot");
        assert_eq!(state(), GameState::ProfileSelect);
        assert!(is_overlay());
        assert!(!pause_active());
        assert_eq!(room_code(), "");
        assert_eq!(active_world(), "");
        assert_eq!(take_sp_resume(), None);
    }

    #[test]
    fn is_overlay_truth_table() {
        let _g = setup("menu_overlay_table");
        let overlay = [
            GameState::ProfileSelect,
            GameState::ProfileNameInput,
            GameState::MainMenu,
            GameState::SpWorldList,
            GameState::SpNewWorldInput,
            GameState::MpSubmenu,
            GameState::MpCloudSubmenu,
            GameState::MpJoinInput,
            GameState::MpUrlPrompt,
            GameState::MpConnectError,
        ];
        for s in overlay {
            force_state(s);
            assert!(is_overlay(), "{:?} should be overlay", s);
        }
        for s in [GameState::InGameSp, GameState::InGameMp] {
            force_state(s);
            assert!(!is_overlay(), "{:?} should not be overlay", s);
        }
    }

    #[test]
    fn state_names_are_pinned() {
        assert_eq!(state_name(GameState::ProfileSelect), "PROFILE_SELECT");
        assert_eq!(state_name(GameState::MainMenu), "MAIN_MENU");
        assert_eq!(state_name(GameState::MpJoinInput), "MP_JOIN_INPUT");
        assert_eq!(state_name(GameState::InGameMp), "IN_GAME_MP");
        assert_eq!(state_name(GameState::MpConnectError), "MP_CONNECT_ERROR");
    }

    /* -- profile picker / creation flow -------------------------------- */

    #[test]
    fn new_profile_click_then_typed_name_reaches_main_menu() {
        let _g = setup("menu_profile_create_flow");
        run_layout();
        /* "+ NEW PROFILE" row at (460, 240). */
        assert!(handle_event(&click(465.0, 245.0)));
        assert_eq!(state(), GameState::ProfileNameInput);
        type_str("Bob");
        assert_eq!(snap(|m| m.input_buf.clone()), "Bob");
        assert!(handle_event(&key(Keycode::Enter)));
        assert_eq!(state(), GameState::MainMenu);
        assert_eq!(profile::get_active().expect("active").name, "Bob");
    }

    #[test]
    fn clicking_existing_profile_row_activates_it() {
        let _g = setup("menu_profile_pick");
        let p = with_profile("Ann");
        /* Boot always lands on the picker even with an active profile
         * - one tap on the name advances. */
        assert_eq!(state(), GameState::ProfileSelect);
        run_layout();
        /* First profile row at (460, 292). */
        assert!(handle_event(&click(465.0, 296.0)));
        assert_eq!(state(), GameState::MainMenu);
        assert_eq!(profile::get_active().expect("active").token, p.token);
    }

    #[test]
    fn profile_chip_click_returns_to_picker() {
        let _g = setup("menu_profile_chip");
        with_profile("Ann");
        force_state(GameState::MainMenu);
        run_layout();
        /* Chip at (1064, 16, 200, 32). */
        assert!(handle_event(&click(1100.0, 30.0)));
        assert_eq!(state(), GameState::ProfileSelect);
    }

    /* -- SP world flow --------------------------------------------------- */

    #[test]
    fn sp_button_enters_world_list_and_back_returns() {
        let _g = setup("menu_sp_world_list");
        with_profile("Ann");
        force_state(GameState::MainMenu);
        run_layout();
        /* SINGLE PLAYER at (520, 296, 240, 56). */
        assert!(handle_event(&click(640.0, 320.0)));
        assert_eq!(state(), GameState::SpWorldList);
        run_layout();
        /* BACK at (520, 580, 240, 36). */
        assert!(handle_event(&click(640.0, 590.0)));
        assert_eq!(state(), GameState::MainMenu);
    }

    #[test]
    fn new_world_input_flow_starts_sp() {
        let _g = setup("menu_new_world_flow");
        with_profile("Ann");
        force_state(GameState::MainMenu);
        run_layout();
        handle_event(&click(640.0, 320.0)); /* SINGLE PLAYER */
        run_layout();
        /* "+ NEW WORLD" at (460, 240, 360, 36). */
        assert!(handle_event(&click(465.0, 245.0)));
        assert_eq!(state(), GameState::SpNewWorldInput);
        type_str("My World");
        assert!(handle_event(&key(Keycode::Enter)));
        assert_eq!(state(), GameState::InGameSp);
        assert_eq!(active_world(), "My World");
        assert!(!is_overlay());
        /* Fresh world: no resume pose queued. */
        assert_eq!(take_sp_resume(), None);
    }

    #[test]
    fn saved_world_click_queues_one_shot_resume_pose() {
        let _g = setup("menu_sp_resume");
        with_profile("Ann");
        let save = sample_save();
        assert!(persistence::save("alpha", &save));
        force_state(GameState::MainMenu);
        run_layout();
        handle_event(&click(640.0, 320.0)); /* SINGLE PLAYER */
        assert_eq!(snap(|m| m.worlds.clone()), vec!["alpha".to_string()]);
        run_layout();
        /* First world row at (460, 292, 360, 36). */
        assert!(handle_event(&click(465.0, 296.0)));
        assert_eq!(state(), GameState::InGameSp);
        assert_eq!(active_world(), "alpha");
        assert_eq!(take_sp_resume(), Some(save));
        /* One-shot. */
        assert_eq!(take_sp_resume(), None);
    }

    /* -- text-input editing semantics ------------------------------------ */

    #[test]
    fn world_name_input_filters_separators_and_nonascii() {
        let _g = setup("menu_world_name_filter");
        with_profile("Ann");
        force_state(GameState::SpWorldList);
        run_layout();
        handle_event(&click(465.0, 245.0)); /* + NEW WORLD */
        assert_eq!(state(), GameState::SpNewWorldInput);
        /* Printable ASCII passes (incl. space), the storage-format
         * separators colon + tab are dropped, control chars and
         * non-ASCII are dropped. */
        type_str("My: World\t!");
        handle_event(&ch('\u{20ac}')); /* euro - rejected */
        handle_event(&Event {
            _type: EventType::Char,
            char_code: 0x1f,
            ..Default::default()
        });
        assert_eq!(snap(|m| m.input_buf.clone()), "My World!");
    }

    #[test]
    fn join_input_uppercases_and_rejects_punctuation() {
        let _g = setup("menu_join_filter");
        with_profile("Ann");
        force_state(GameState::MpCloudSubmenu);
        run_layout();
        /* JOIN at (520, 368, 240, 56). */
        assert!(handle_event(&click(640.0, 390.0)));
        assert_eq!(state(), GameState::MpJoinInput);
        type_str("ab1! c-d");
        /* lowercase folds to upper, digits pass, '!', ' ', '-'
         * rejected. */
        assert_eq!(snap(|m| m.input_buf.clone()), "AB1CD");
    }

    #[test]
    fn input_backspace_and_length_cap() {
        let _g = setup("menu_input_editing");
        with_profile("Ann");
        force_state(GameState::ProfileNameInput);
        type_str("abcd");
        assert!(handle_event(&key(Keycode::Backspace)));
        assert_eq!(snap(|m| m.input_buf.clone()), "abc");
        /* Backspace on empty is a consumed no-op. */
        with_menu(|m| m.input_buf.clear());
        assert!(handle_event(&key(Keycode::Backspace)));
        assert_eq!(snap(|m| m.input_buf.clone()), "");
        /* C buffer is char[32]: 31 chars max. */
        type_str(&"A".repeat(40));
        assert_eq!(snap(|m| m.input_buf.len()), INPUT_BUF_MAX);
    }

    #[test]
    fn empty_submit_is_a_no_op_and_escape_cancels_per_state() {
        let _g = setup("menu_input_cancel");
        with_profile("Ann");
        force_state(GameState::MpJoinInput);
        assert!(handle_event(&key(Keycode::Enter)));
        assert_eq!(state(), GameState::MpJoinInput); /* empty submit */
        assert!(handle_event(&key(Keycode::Escape)));
        assert_eq!(state(), GameState::MpCloudSubmenu);
        force_state(GameState::ProfileNameInput);
        assert!(handle_event(&key(Keycode::Escape)));
        assert_eq!(state(), GameState::ProfileSelect);
        force_state(GameState::SpNewWorldInput);
        assert!(handle_event(&key(Keycode::Escape)));
        assert_eq!(state(), GameState::SpWorldList);
    }

    #[test]
    fn input_box_back_button_cancels_too() {
        let _g = setup("menu_input_back_btn");
        with_profile("Ann");
        force_state(GameState::MpJoinInput);
        run_layout();
        /* BACK at (520, 580, 240, 36). */
        assert!(handle_event(&click(640.0, 590.0)));
        assert_eq!(state(), GameState::MpCloudSubmenu);
    }

    #[test]
    fn caret_blink_phase_is_pinned() {
        assert!(blink_on(0.0));
        assert!(!blink_on(0.5));
        assert!(blink_on(1.0));
        assert!(!blink_on(1.5));
    }

    /* -- MP flows --------------------------------------------------------- */

    #[test]
    fn mp_submenu_navigation_and_disabled_self_host() {
        let _g = setup("menu_mp_submenu");
        with_profile("Ann");
        force_state(GameState::MainMenu);
        run_layout();
        /* MULTIPLAYER at (520, 368, 240, 56). */
        assert!(handle_event(&click(640.0, 390.0)));
        assert_eq!(state(), GameState::MpSubmenu);
        run_layout();
        /* SELF HOSTED (520, 296) is disabled - click falls through
         * silently. */
        assert!(handle_event(&click(640.0, 320.0)));
        assert_eq!(state(), GameState::MpSubmenu);
        assert!(snap(|m| m.btn_self_host.disabled));
        /* CLOUD HOSTED (520, 368) advances. */
        assert!(handle_event(&click(640.0, 390.0)));
        assert_eq!(state(), GameState::MpCloudSubmenu);
        run_layout();
        /* BACK returns to the MP submenu, then to the main menu. */
        assert!(handle_event(&click(640.0, 590.0)));
        assert_eq!(state(), GameState::MpSubmenu);
        run_layout();
        assert!(handle_event(&click(640.0, 590.0)));
        assert_eq!(state(), GameState::MainMenu);
    }

    #[test]
    fn mp_without_profile_gates_through_name_input() {
        let _g = setup("menu_mp_gate_no_profiles");
        /* No profiles at all. */
        force_state(GameState::MainMenu);
        run_layout();
        assert!(handle_event(&click(640.0, 390.0))); /* MULTIPLAYER */
        assert_eq!(state(), GameState::ProfileNameInput);
        assert!(snap(|m| m.pending_mp_after_profile));
        type_str("Ann");
        assert!(handle_event(&key(Keycode::Enter)));
        /* Post-profile MP gate routes past the main menu. */
        assert_eq!(state(), GameState::MpSubmenu);
        assert!(!snap(|m| m.pending_mp_after_profile));
    }

    #[test]
    fn mp_without_active_profile_gates_through_picker() {
        let _g = setup("menu_mp_gate_picker");
        with_profile("Zed");
        /* Clear the active marker but keep the stored profile. */
        client_kv::remove("tenebris-c:active-profile");
        force_state(GameState::MainMenu);
        run_layout();
        assert!(handle_event(&click(640.0, 390.0))); /* MULTIPLAYER */
        assert_eq!(state(), GameState::ProfileSelect);
        run_layout();
        assert!(handle_event(&click(465.0, 296.0))); /* profile row 0 */
        assert_eq!(state(), GameState::MpSubmenu);
    }

    #[test]
    fn host_generates_code_connects_and_records_room() {
        let _g = setup("menu_host_flow");
        with_profile("Ann");
        force_state(GameState::MpCloudSubmenu);
        run_layout();
        /* HOST at (520, 296, 240, 56). Native room-code fallback is
         * "AAAAAA". */
        assert!(handle_event(&click(640.0, 320.0)));
        assert_eq!(state(), GameState::InGameMp);
        assert_eq!(room_code(), "AAAAAA");
        assert_eq!(active_world(), "");
        let (url, tok, name, room) = snap(|m| {
            (
                m.reconnect_url.clone(),
                m.reconnect_token.clone(),
                m.reconnect_name.clone(),
                m.reconnect_room.clone(),
            )
        });
        assert_eq!(url, DEFAULT_MP_SERVER_URL);
        assert_eq!(tok.len(), 32);
        assert_eq!(name, "Ann");
        assert_eq!(room, "AAAAAA");
        /* MRU history picked the room up. */
        assert_eq!(
            client_kv::get(ROOM_HISTORY_KV_KEY).as_deref(),
            Some("AAAAAA")
        );
    }

    #[test]
    fn join_input_enter_connects_to_typed_room() {
        let _g = setup("menu_join_flow");
        with_profile("Ann");
        force_state(GameState::MpCloudSubmenu);
        run_layout();
        handle_event(&click(640.0, 390.0)); /* JOIN */
        type_str("qw12er");
        assert!(handle_event(&key(Keycode::Enter)));
        assert_eq!(state(), GameState::InGameMp);
        assert_eq!(room_code(), "QW12ER");
        assert_eq!(snap(|m| m.recent_rooms.clone()), vec!["QW12ER"]);
    }

    #[test]
    fn recent_room_row_click_reconnects() {
        let _g = setup("menu_recent_click");
        with_profile("Ann");
        /* A single stored code survives the native kv backend (see
         * recent_rooms_save docs - multi-entry history is web-only). */
        record_recent_room("OLDONE");
        force_state(GameState::MpSubmenu);
        run_layout();
        handle_event(&click(640.0, 390.0)); /* CLOUD HOSTED */
        assert_eq!(state(), GameState::MpCloudSubmenu);
        assert_eq!(snap(|m| m.recent_rooms.clone()), vec!["OLDONE"]);
        run_layout();
        /* First recent row at (460, 452, 360, 36). */
        assert!(handle_event(&click(465.0, 455.0)));
        assert_eq!(state(), GameState::InGameMp);
        assert_eq!(room_code(), "OLDONE");
    }

    #[test]
    fn touch_clicks_buttons_too() {
        let _g = setup("menu_touch");
        with_profile("Ann");
        force_state(GameState::MainMenu);
        run_layout();
        assert!(handle_event(&touch(EventType::TouchesBegan, 640.0, 320.0)));
        assert_eq!(state(), GameState::SpWorldList);
        /* Touch position is cached as the new pointer position. */
        assert_eq!(snap(|m| (m.mouse_x, m.mouse_y)), (640.0, 320.0));
    }

    /* -- room-code validation + MRU history ------------------------------ */

    #[test]
    fn room_code_validation_is_pinned() {
        assert!(room_code_is_valid("ABC123"));
        assert!(room_code_is_valid("ZZZZZZ"));
        assert!(room_code_is_valid("000000"));
        assert!(!room_code_is_valid(""));
        assert!(!room_code_is_valid("ABCDE"));
        assert!(!room_code_is_valid("ABCDEFG"));
        assert!(!room_code_is_valid("abc123")); /* lowercase */
        assert!(!room_code_is_valid("ABC12!"));
        assert!(!room_code_is_valid("ABC 12"));
    }

    #[test]
    fn recent_rooms_mru_dedupe_and_cap() {
        /* The MRU mutation, pinned on the pure helper (the kv-backed
         * multi-entry round-trip is web-only - see recent_rooms_save). */
        let mut rooms: Vec<String> = Vec::new();
        mru_insert(&mut rooms, "AAA111");
        mru_insert(&mut rooms, "BBB222");
        mru_insert(&mut rooms, "AAA111"); /* moves to front, no dup */
        assert_eq!(rooms, vec!["AAA111", "BBB222"]);
        /* Cap at ROOM_HISTORY_MAX, evicting the oldest. */
        for i in 0..9 {
            mru_insert(&mut rooms, &format!("ROOM{:02}", i));
        }
        assert_eq!(rooms.len(), ROOM_HISTORY_MAX);
        assert_eq!(rooms[0], "ROOM08");
        assert_eq!(rooms[7], "ROOM01");
        assert!(!rooms.contains(&"AAA111".to_string()));
    }

    #[test]
    fn record_recent_room_validates_and_persists_through_kv() {
        let _g = setup("menu_recent_record");
        record_recent_room("notvalid"); /* ignored: wrong length */
        record_recent_room("abc123"); /* ignored: lowercase */
        record_recent_room(""); /* ignored: empty */
        assert_eq!(snap(|m| m.recent_rooms.len()), 0);
        assert_eq!(client_kv::get(ROOM_HISTORY_KV_KEY), None);
        record_recent_room("AAA111");
        assert_eq!(snap(|m| m.recent_rooms.clone()), vec!["AAA111"]);
        assert_eq!(
            client_kv::get(ROOM_HISTORY_KV_KEY).as_deref(),
            Some("AAA111")
        );
        /* A fresh load round-trips the stored entry. */
        with_menu(|m| {
            m.recent_rooms.clear();
            recent_rooms_load(m);
        });
        assert_eq!(snap(|m| m.recent_rooms.clone()), vec!["AAA111"]);
    }

    #[test]
    fn recent_rooms_parser_skips_garbage_lines() {
        /* Pure parser over the web-format (newline-joined) value. */
        assert_eq!(
            parse_recent_rooms("GOOD01\nbadbad\nTOOLONG1\nGOOD01\nGOOD02\nX!OOPS"),
            vec!["GOOD01", "GOOD02"]
        );
        assert_eq!(parse_recent_rooms(""), Vec::<String>::new());
        /* MRU order is preserved and the visible cap is enforced. */
        let many: Vec<String> = (0..12).map(|i| format!("ROOM{:02}", i)).collect();
        let parsed = parse_recent_rooms(&many.join("\n"));
        assert_eq!(parsed.len(), ROOM_HISTORY_MAX);
        assert_eq!(parsed[0], "ROOM00");
        assert_eq!(parsed[7], "ROOM07");
    }

    /* -- deep-link invites ------------------------------------------------ */

    #[test]
    fn pending_invite_waits_for_profile_then_connects() {
        let _g = setup("menu_invite_flow");
        set_pending_invite("ROOM77", "");
        /* Boot parked on the picker; invite stays stashed. */
        assert_eq!(state(), GameState::ProfileSelect);
        run_layout();
        handle_event(&click(465.0, 245.0)); /* + NEW PROFILE */
        type_str("Eve");
        handle_event(&key(Keycode::Enter));
        /* enter_main_menu_with consumed the invite straight into MP. */
        assert_eq!(state(), GameState::InGameMp);
        assert_eq!(room_code(), "ROOM77");
        assert_eq!(snap(|m| m.reconnect_url.clone()), DEFAULT_MP_SERVER_URL);
        assert_eq!(snap(|m| m.pending_invite_room.clone()), "");
        assert_eq!(snap(|m| m.recent_rooms.clone()), vec!["ROOM77"]);
    }

    #[test]
    fn pending_invite_server_override_and_clear() {
        let _g = setup("menu_invite_server");
        /* main_web boot order: menu_init() first, then
         * menu_set_pending_invite() from the URL params - so the
         * profile + re-init come before the invite is stashed. */
        with_profile("Ann");
        set_pending_invite("ROOM88", "wss://example.test/");
        run_layout();
        handle_event(&click(465.0, 296.0)); /* pick profile row */
        assert_eq!(state(), GameState::InGameMp);
        assert_eq!(snap(|m| m.reconnect_url.clone()), "wss://example.test/");
        /* Clearing: empty room wipes both fields. */
        set_pending_invite("", "wss://ignored/");
        assert_eq!(snap(|m| m.pending_invite_room.clone()), "");
        assert_eq!(snap(|m| m.pending_invite_server.clone()), "");
    }

    /* -- event swallow semantics ------------------------------------------ */

    #[test]
    fn event_consumption_matches_c() {
        let _g = setup("menu_event_semantics");
        with_profile("Ann");
        force_state(GameState::MainMenu);
        run_layout();
        /* Mouse move: tracked + consumed. */
        assert!(handle_event(&mouse_move(123.0, 456.0)));
        assert_eq!(snap(|m| (m.mouse_x, m.mouse_y)), (123.0, 456.0));
        /* Non-left mouse button: NOT consumed. */
        let right = Event {
            _type: EventType::MouseDown,
            mouse_button: Mousebutton::Right,
            ..Default::default()
        };
        assert!(!handle_event(&right));
        /* Any other event type while the overlay is up is swallowed. */
        let keyup = Event {
            _type: EventType::KeyUp,
            ..Default::default()
        };
        assert!(handle_event(&keyup));
        /* In-game: the menu doesn't touch events at all. */
        force_state(GameState::InGameSp);
        assert!(!handle_event(&mouse_move(1.0, 1.0)));
        assert!(!handle_event(&click(640.0, 320.0)));
    }

    #[test]
    fn hover_follows_cached_mouse_position() {
        let _g = setup("menu_hover");
        with_profile("Ann");
        force_state(GameState::MainMenu);
        handle_event(&mouse_move(640.0, 320.0)); /* over SINGLE PLAYER */
        run_layout();
        assert!(snap(|m| m.btn_sp.hover));
        assert!(!snap(|m| m.btn_mp.hover));
        /* Disabled buttons never hover. */
        force_state(GameState::MpSubmenu);
        run_layout();
        assert!(!snap(|m| m.btn_self_host.hover));
        assert!(snap(|m| m.btn_self_host.disabled));
    }

    /* -- layout pins -------------------------------------------------------- */

    #[test]
    fn layout_main_rects_are_pinned() {
        let _g = setup("menu_layout_main");
        with_profile("Ann");
        force_state(GameState::MainMenu);
        run_layout();
        snap(|m| {
            assert_eq!(
                (m.btn_sp.x, m.btn_sp.y, m.btn_sp.w, m.btn_sp.h),
                (520.0, 296.0, 240.0, 56.0)
            );
            assert_eq!(
                (m.btn_mp.x, m.btn_mp.y, m.btn_mp.w, m.btn_mp.h),
                (520.0, 368.0, 240.0, 56.0)
            );
            assert_eq!(
                (
                    m.btn_settings.x,
                    m.btn_settings.y,
                    m.btn_settings.w,
                    m.btn_settings.h
                ),
                (16.0, 16.0, 140.0, 32.0)
            );
            assert_eq!(
                (
                    m.btn_active_profile.x,
                    m.btn_active_profile.y,
                    m.btn_active_profile.w,
                    m.btn_active_profile.h
                ),
                (1064.0, 16.0, 200.0, 32.0)
            );
            assert_eq!(m.btn_active_profile.label, "Ann");
            /* Stranger-screen buttons all hidden. */
            assert!(!m.btn_host.visible);
            assert!(!m.btn_join.visible);
            assert!(!m.btn_new_world.visible);
            assert!(!m.btn_new_profile.visible);
            assert!(!m.btn_back.visible);
        });
    }

    #[test]
    fn layout_main_without_profile_hides_chip() {
        let _g = setup("menu_layout_main_no_profile");
        force_state(GameState::MainMenu);
        run_layout();
        assert!(!snap(|m| m.btn_active_profile.visible));
    }

    #[test]
    fn layout_world_list_rects_are_pinned() {
        let _g = setup("menu_layout_world_list");
        with_profile("Ann");
        let save = sample_save();
        assert!(persistence::save("alpha", &save));
        assert!(persistence::save("beta", &save));
        with_menu(enter_world_list);
        run_layout();
        snap(|m| {
            assert_eq!(
                (m.btn_new_world.x, m.btn_new_world.y, m.btn_new_world.w, m.btn_new_world.h),
                (460.0, 240.0, 360.0, 36.0)
            );
            assert_eq!(m.btn_new_world.label, "+ NEW WORLD");
            assert_eq!(
                (m.btn_world[0].x, m.btn_world[0].y),
                (460.0, 292.0)
            );
            assert_eq!((m.btn_world[1].x, m.btn_world[1].y), (460.0, 336.0));
            assert!(!m.btn_world[2].visible);
            assert_eq!(
                (m.btn_back.x, m.btn_back.y, m.btn_back.w, m.btn_back.h),
                (520.0, 580.0, 240.0, 36.0)
            );
            assert_eq!(m.btn_back.label, "BACK");
        });
    }

    #[test]
    fn layout_cloud_submenu_rects_are_pinned() {
        let _g = setup("menu_layout_cloud");
        with_profile("Ann");
        /* Seed the in-memory MRU directly (a two-entry history is what
         * the web kv backend would have loaded; layout() itself never
         * re-reads kv - only enter_mp_cloud_submenu does). */
        with_menu(|m| {
            m.recent_rooms = vec!["ROOM02".to_string(), "ROOM01".to_string()];
        });
        force_state(GameState::MpCloudSubmenu);
        run_layout();
        snap(|m| {
            assert_eq!((m.btn_host.x, m.btn_host.y), (520.0, 296.0));
            assert_eq!((m.btn_join.x, m.btn_join.y), (520.0, 368.0));
            assert_eq!(m.btn_host.label, "HOST");
            assert_eq!(m.btn_join.label, "JOIN");
            /* Recent rows start at cy + 56 + 8 + 28 = 452, pitch 44. */
            assert_eq!(
                (m.btn_recent_room[0].x, m.btn_recent_room[0].y),
                (460.0, 452.0)
            );
            assert_eq!(m.btn_recent_room[0].label, "ROOM02"); /* MRU */
            assert_eq!(
                (m.btn_recent_room[1].x, m.btn_recent_room[1].y),
                (460.0, 496.0)
            );
            assert!(!m.btn_recent_room[2].visible);
            assert_eq!((m.btn_back.x, m.btn_back.y), (520.0, 580.0));
        });
    }

    #[test]
    fn layout_connect_error_rect_is_pinned() {
        let _g = setup("menu_layout_error");
        force_state(GameState::MpConnectError);
        run_layout();
        snap(|m| {
            assert_eq!(
                (m.btn_back.x, m.btn_back.y, m.btn_back.w, m.btn_back.h),
                (520.0, 400.0, 240.0, 56.0)
            );
            assert_eq!(m.btn_back.label, "BACK TO MENU");
        });
    }

    #[test]
    fn pause_layout_rects_are_pinned_sp_vs_mp() {
        /* Pure function - no kv needed. */
        let sp = compute_pause_layout(false, W, H);
        assert_eq!(
            (sp.panel_x, sp.panel_y, sp.panel_w, sp.panel_h),
            (452.0, 177.0, 376.0, 366.0)
        );
        assert_eq!((sp.resume.x, sp.resume.y), (480.0, 287.0));
        assert_eq!((sp.settings.x, sp.settings.y), (480.0, 369.0));
        assert_eq!((sp.quit.x, sp.quit.y), (480.0, 451.0));
        assert_eq!(sp.invite.label, None);
        assert!(!pause_btn_hit(&sp.invite, -1e9, -1e9));

        let mp = compute_pause_layout(true, W, H);
        assert_eq!(
            (mp.panel_x, mp.panel_y, mp.panel_w, mp.panel_h),
            (452.0, 136.0, 376.0, 448.0)
        );
        assert_eq!((mp.resume.x, mp.resume.y), (480.0, 246.0));
        assert_eq!((mp.settings.x, mp.settings.y), (480.0, 328.0));
        assert_eq!((mp.invite.x, mp.invite.y), (480.0, 410.0));
        assert_eq!(mp.invite.label, Some("INVITE PLAYERS"));
        assert_eq!((mp.quit.x, mp.quit.y), (480.0, 492.0));
        assert_eq!(mp.resume.label, Some("RETURN TO GAME"));
        assert_eq!(mp.settings.label, Some("SETTINGS"));
        assert_eq!(mp.quit.label, Some("QUIT TO MENU"));
        assert_eq!((mp.resume.w, mp.resume.h), (320.0, 64.0));
    }

    #[test]
    fn settings_layout_rects_are_pinned() {
        let _g = setup("menu_layout_settings");
        with_menu(|m| settings_layout(m, W, H));
        snap(|m| {
            assert_eq!(
                (m.sens_track_x, m.sens_track_y, m.sens_track_w, m.sens_track_h),
                (460.0, 260.0, 360.0, 12.0)
            );
            assert_eq!(
                (m.chat_track_x, m.chat_track_y, m.chat_track_w, m.chat_track_h),
                (460.0, 360.0, 360.0, 12.0)
            );
            assert_eq!(
                (
                    m.btn_lite_graphics.x,
                    m.btn_lite_graphics.y,
                    m.btn_lite_graphics.w,
                    m.btn_lite_graphics.h
                ),
                (460.0, 440.0, 360.0, 40.0)
            );
            assert_eq!(
                (
                    m.btn_settings_back.x,
                    m.btn_settings_back.y,
                    m.btn_settings_back.w,
                    m.btn_settings_back.h
                ),
                (540.0, 520.0, 200.0, 48.0)
            );
            assert_eq!(m.btn_settings_back.label, "BACK");
        });
    }

    /* -- pause overlay ------------------------------------------------------ */

    #[test]
    fn pause_toggle_only_works_in_game() {
        let _g = setup("menu_pause_toggle");
        assert!(!pause_active());
        pause_toggle(); /* ProfileSelect: forced off */
        assert!(!pause_active());
        force_state(GameState::InGameSp);
        pause_toggle();
        assert!(pause_active());
        pause_toggle();
        assert!(!pause_active());
        /* pause_event is inert while hidden. */
        assert!(!pause_event(&click(640.0, 320.0)));
    }

    #[test]
    fn pause_resume_click_closes_and_shows_mouse() {
        let _g = setup("menu_pause_resume");
        force_state(GameState::InGameSp);
        pause_toggle();
        assert!(pause_active());
        /* Escape inside pause resumes (closes) it - symmetric with the
         * Escape that opened it. */
        assert!(pause_event(&key(Keycode::Escape)));
        assert!(!pause_active());
        /* Re-open and exercise the RESUME action (the egui button drives
         * this same `pause_apply`). */
        pause_toggle();
        assert!(pause_active());
        with_menu(|m| pause_apply(m, PauseAction::Resume));
        assert!(!pause_active());
        /* Backdrop clicks + movement keys are swallowed while open. */
        pause_toggle();
        assert!(pause_event(&click(10.0, 10.0)));
        assert!(pause_active());
        assert!(pause_event(&key(Keycode::W)));
    }

    #[test]
    fn pause_quit_sp_returns_to_main_menu() {
        let _g = setup("menu_pause_quit_sp");
        with_profile("Ann");
        with_menu(|m| start_sp_for_world(m, "alpha"));
        assert_eq!(active_world(), "alpha");
        pause_toggle();
        with_menu(|m| pause_apply(m, PauseAction::Quit));
        assert_eq!(state(), GameState::MainMenu);
        assert_eq!(active_world(), "");
        assert!(!pause_active());
    }

    #[test]
    fn pause_quit_mp_disconnects_and_clears_room() {
        let _g = setup("menu_pause_quit_mp");
        with_profile("Ann");
        with_menu(|m| connect_to_room(m, "ABC123"));
        assert_eq!(state(), GameState::InGameMp);
        pause_toggle();
        with_menu(|m| pause_apply(m, PauseAction::Quit));
        assert_eq!(state(), GameState::MainMenu);
        assert_eq!(room_code(), "");
        assert!(!pause_active());
        /* Next tick drops the stashed reconnect params. */
        tick();
        assert_eq!(snap(|m| m.reconnect_url.clone()), "");
    }

    #[test]
    fn pause_invite_share_toast_native_fallback() {
        let _g = setup("menu_pause_invite");
        with_profile("Ann");
        with_menu(|m| connect_to_room(m, "ABC123"));
        pause_toggle();
        test_doubles::set_now(100.0);
        with_menu(|m| pause_apply(m, PauseAction::Invite));
        /* Native share fallback returns 0 -> stored as 3 (failed). */
        assert_eq!(snap(|m| m.pause_share_result), 3);
        assert_eq!(snap(|m| m.pause_share_msg_until), 102.5);
        assert!(pause_active()); /* panel stays open */
    }

    #[test]
    fn pause_settings_button_opens_modal_on_top() {
        let _g = setup("menu_pause_settings");
        force_state(GameState::InGameSp);
        pause_toggle();
        with_menu(|m| pause_apply(m, PauseAction::Settings));
        assert!(snap(|m| m.settings_visible));
        /* Settings is modal over pause: Escape closes settings only. */
        assert!(pause_event(&key(Keycode::Escape)));
        assert!(!snap(|m| m.settings_visible));
        assert!(pause_active());
    }

    /* -- settings overlay ----------------------------------------------------- */

    #[test]
    fn main_menu_settings_chip_opens_and_back_closes() {
        let _g = setup("menu_settings_chip");
        with_profile("Ann");
        force_state(GameState::MainMenu);
        run_layout();
        assert!(handle_event(&click(20.0, 20.0))); /* SETTINGS chip */
        assert!(snap(|m| m.settings_visible));
        /* Modal swallows everything; BACK at (540, 520, 200, 48). */
        assert!(handle_event(&click(640.0, 540.0)));
        assert!(!snap(|m| m.settings_visible));
        assert_eq!(state(), GameState::MainMenu);
    }

    #[test]
    fn sens_slider_press_drag_release() {
        let _g = setup("menu_sens_slider");
        with_profile("Ann");
        settings::set_mouse_sensitivity(settings::MOUSE_SENS_DEFAULT);
        force_state(GameState::MainMenu);
        with_menu(|m| m.settings_visible = true);
        /* Press at the right end of the track (820, 260) -> MAX. */
        assert!(handle_event(&click(820.0, 262.0)));
        assert!(snap(|m| m.sens_dragging));
        assert_eq!(settings::mouse_sensitivity(), settings::MOUSE_SENS_MAX);
        /* Drag to the middle -> midpoint value; drags keep tracking
         * even outside the track's y band. */
        assert!(handle_event(&mouse_move(640.0, 50.0)));
        let mid = settings::MOUSE_SENS_MIN
            + 0.5 * (settings::MOUSE_SENS_MAX - settings::MOUSE_SENS_MIN);
        assert!((settings::mouse_sensitivity() - mid).abs() < 1e-6);
        /* Release stops the drag; further moves change nothing. */
        let up = Event {
            _type: EventType::MouseUp,
            mouse_button: Mousebutton::Left,
            ..Default::default()
        };
        assert!(handle_event(&up));
        assert!(!snap(|m| m.sens_dragging));
        handle_event(&mouse_move(460.0, 262.0));
        assert!((settings::mouse_sensitivity() - mid).abs() < 1e-6);
        /* Press left of center under the track -> clamps to MIN. */
        assert!(handle_event(&click(460.0, 262.0)));
        assert_eq!(settings::mouse_sensitivity(), settings::MOUSE_SENS_MIN);
        settings::set_mouse_sensitivity(settings::MOUSE_SENS_DEFAULT);
    }

    #[test]
    fn chat_fade_slider_maps_track_to_seconds() {
        let _g = setup("menu_chat_slider");
        with_profile("Ann");
        settings::set_chat_fade_s(settings::CHAT_FADE_DEFAULT_S);
        force_state(GameState::MainMenu);
        with_menu(|m| m.settings_visible = true);
        /* Chat track at (460, 360, 360, 12): press at the right end. */
        assert!(handle_event(&click(820.0, 362.0)));
        assert!(snap(|m| m.chat_dragging));
        assert_eq!(settings::chat_fade_s(), settings::CHAT_FADE_MAX_S);
        assert!(handle_event(&touch(EventType::TouchesMoved, 460.0, 362.0)));
        assert_eq!(settings::chat_fade_s(), settings::CHAT_FADE_MIN_S);
        assert!(handle_event(&touch(EventType::TouchesEnded, 460.0, 362.0)));
        assert!(!snap(|m| m.chat_dragging));
        settings::set_chat_fade_s(settings::CHAT_FADE_DEFAULT_S);
    }

    #[test]
    fn lite_graphics_toggle_flips_and_persists() {
        let _g = setup("menu_lite_toggle");
        with_profile("Ann");
        settings::set_lite_graphics(false);
        force_state(GameState::MainMenu);
        with_menu(|m| m.settings_visible = true);
        /* Toggle at (460, 440, 360, 40). */
        assert!(handle_event(&click(640.0, 460.0)));
        assert!(settings::lite_graphics());
        assert!(handle_event(&click(640.0, 460.0)));
        assert!(!settings::lite_graphics());
        assert_eq!(lite_graphics_label(true), "LITE GRAPHICS: ON");
        assert_eq!(lite_graphics_label(false), "LITE GRAPHICS: OFF");
    }

    #[test]
    fn settings_escape_closes_and_resets_drags() {
        let _g = setup("menu_settings_escape");
        force_state(GameState::MainMenu);
        with_menu(|m| {
            m.settings_visible = true;
            m.sens_dragging = true;
            m.chat_dragging = true;
        });
        assert!(handle_event(&key(Keycode::Escape)));
        snap(|m| {
            assert!(!m.settings_visible);
            assert!(!m.sens_dragging);
            assert!(!m.chat_dragging);
        });
    }

    /* -- connect error + reconnect machine ----------------------------------- */

    #[test]
    fn terminal_kick_promotes_to_error_popup_with_message() {
        let _g = setup("menu_kick");
        with_profile("Ann");
        with_menu(|m| connect_to_room(m, "ABC123"));
        test_net::set(NetPoll {
            state: NetLinkState::Error,
            can_retry: false,
            error_message: Some("Version mismatch - refresh: Ctrl+Shift+R".to_string()),
        });
        tick();
        assert_eq!(state(), GameState::MpConnectError);
        assert_eq!(
            snap(|m| m.error_msg.clone()),
            "Version mismatch - refresh: Ctrl+Shift+R"
        );
        /* BACK TO MENU at (520, 400, 240, 56) clears everything. */
        run_layout();
        assert!(handle_event(&click(640.0, 420.0)));
        assert_eq!(state(), GameState::MainMenu);
        assert_eq!(snap(|m| m.error_msg.clone()), "");
        assert_eq!(room_code(), "");
        /* Back on the menu, the error state no longer re-fires. */
        tick();
        assert_eq!(state(), GameState::MainMenu);
    }

    #[test]
    fn error_without_message_uses_fallback_text() {
        let _g = setup("menu_kick_fallback");
        with_profile("Ann");
        with_menu(|m| connect_to_room(m, "ABC123"));
        test_net::set(NetPoll {
            state: NetLinkState::Error,
            can_retry: false,
            error_message: None,
        });
        tick();
        assert_eq!(snap(|m| m.error_msg.clone()), "connection failed");
    }

    #[test]
    fn reconnect_window_paces_attempts_and_recovers() {
        let _g = setup("menu_reconnect_recover");
        with_profile("Ann");
        with_menu(|m| connect_to_room(m, "ABC123"));
        /* Healthy link: tick is a no-op. */
        tick();
        assert_eq!(snap(|m| m.reconnect_deadline_t), 0.0);
        /* Link drops at t=10: window opens, pause auto-opens, no
         * attempt yet (first try paced at +0.5s). */
        test_net::set(NetPoll {
            state: NetLinkState::Error,
            can_retry: true,
            error_message: None,
        });
        test_doubles::set_now(10.0);
        tick();
        snap(|m| {
            assert_eq!(m.reconnect_deadline_t, 10.0 + MP_RECONNECT_TOTAL_S);
            assert_eq!(m.reconnect_next_try_t, 10.5);
            assert_eq!(m.reconnect_attempts, 0);
            assert!(m.pause_visible);
            assert!(m.pause_auto_disconnect);
        });
        assert_eq!(state(), GameState::InGameMp);
        /* t=10.6: first attempt fires; next paced 5s out. */
        test_doubles::set_now(10.6);
        tick();
        snap(|m| {
            assert_eq!(m.reconnect_attempts, 1);
            assert_eq!(m.reconnect_next_try_t, 15.6);
        });
        /* t=12: inside the pacing gate - no new attempt. */
        test_doubles::set_now(12.0);
        tick();
        assert_eq!(snap(|m| m.reconnect_attempts), 1);
        /* t=15.7: second attempt. */
        test_doubles::set_now(15.7);
        tick();
        assert_eq!(snap(|m| m.reconnect_attempts), 2);
        /* Link restored: window cleared, auto-opened pause closes. */
        test_net::set(NetPoll {
            state: NetLinkState::Ready,
            can_retry: true,
            error_message: None,
        });
        test_doubles::set_now(16.0);
        tick();
        snap(|m| {
            assert_eq!(m.reconnect_deadline_t, 0.0);
            assert_eq!(m.reconnect_attempts, 0);
            assert!(!m.pause_visible);
            assert!(!m.pause_auto_disconnect);
        });
        assert_eq!(state(), GameState::InGameMp);
    }

    #[test]
    fn reconnect_gives_up_past_deadline() {
        let _g = setup("menu_reconnect_giveup");
        with_profile("Ann");
        with_menu(|m| connect_to_room(m, "ABC123"));
        test_net::set(NetPoll {
            state: NetLinkState::Error,
            can_retry: true,
            error_message: None,
        });
        test_doubles::set_now(10.0);
        tick(); /* opens window: deadline 310 */
        test_doubles::set_now(311.0);
        tick();
        assert_eq!(state(), GameState::MpConnectError);
        assert_eq!(snap(|m| m.error_msg.clone()), "DISCONNECTED FROM SERVER");
        assert_eq!(snap(|m| m.reconnect_deadline_t), 0.0);
    }

    #[test]
    fn manual_pause_stays_open_through_reconnect() {
        let _g = setup("menu_reconnect_manual_pause");
        with_profile("Ann");
        with_menu(|m| connect_to_room(m, "ABC123"));
        pause_toggle(); /* player opened it themselves */
        test_net::set(NetPoll {
            state: NetLinkState::Error,
            can_retry: true,
            error_message: None,
        });
        test_doubles::set_now(5.0);
        tick();
        assert!(snap(|m| m.pause_visible && !m.pause_auto_disconnect));
        /* While reconnecting, RETURN TO GAME is disabled: the click is
         * swallowed and the panel stays up. */
        assert!(pause_event(&click(640.0, 270.0)));
        assert!(pause_active());
        /* Recovery does NOT auto-close a manually opened panel. */
        test_net::set(NetPoll {
            state: NetLinkState::Ready,
            can_retry: true,
            error_message: None,
        });
        tick();
        assert!(pause_active());
    }

    #[test]
    fn tick_outside_mp_clears_reconnect_params() {
        let _g = setup("menu_tick_outside_mp");
        with_profile("Ann");
        with_menu(|m| connect_to_room(m, "ABC123"));
        assert_eq!(snap(|m| m.reconnect_url.clone()), DEFAULT_MP_SERVER_URL);
        force_state(GameState::MainMenu);
        tick();
        snap(|m| {
            assert_eq!(m.reconnect_url, "");
            assert_eq!(m.reconnect_deadline_t, 0.0);
            assert_eq!(m.reconnect_next_try_t, 0.0);
        });
    }

    #[test]
    fn connect_without_profile_bounces_to_picker() {
        let _g = setup("menu_connect_no_profile");
        /* No profile at all -> name input; with stored profiles ->
         * picker. */
        with_menu(|m| connect_to_room(m, "ABC123"));
        assert_eq!(state(), GameState::ProfileNameInput);
        assert!(snap(|m| m.pending_mp_after_profile));
    }

    /* -- rendered strings ------------------------------------------------------ */

    #[test]
    fn input_screen_strings_are_pinned() {
        assert_eq!(
            input_screen_text(GameState::MpJoinInput),
            (
                "JOIN ROOM",
                "type the 6-char code  -  Enter to join  -  Esc to cancel",
                "(type here)",
                3.0
            )
        );
        assert_eq!(
            input_screen_text(GameState::ProfileNameInput),
            (
                "NEW PROFILE",
                "type your name  -  Enter to create  -  Esc to cancel",
                "(type your name)",
                2.0
            )
        );
        assert_eq!(
            input_screen_text(GameState::SpNewWorldInput),
            (
                "NAME YOUR WORLD",
                "type a world name  -  Enter to create  -  Esc to cancel",
                "(type a world name)",
                2.0
            )
        );
    }

    #[test]
    fn dynamic_strings_are_pinned() {
        assert_eq!(profile_chip_label("Bob"), "as Bob");
        assert_eq!(header_with_dots("RECONNECTING", 0), "RECONNECTING   ");
        assert_eq!(header_with_dots("RECONNECTING", 1), "RECONNECTING.  ");
        assert_eq!(header_with_dots("CONNECTING", 2), "CONNECTING.. ");
        assert_eq!(header_with_dots("CONNECTING", 3), "CONNECTING...");
        assert_eq!(dot_phase(0.0), 0);
        assert_eq!(dot_phase(0.6), 1);
        assert_eq!(dot_phase(1.1), 2);
        assert_eq!(dot_phase(1.6), 3);
        assert_eq!(dot_phase(2.0), 0);
        assert_eq!(reconnect_attempt_line(3, 42.7), "ATTEMPT 3 - 42s LEFT");
        assert_eq!(reconnect_attempt_line(1, -5.0), "ATTEMPT 1 - 0s LEFT");
        assert_eq!(share_toast(1), ("SHARED!", (0x80, 0xff, 0xa0)));
        assert_eq!(
            share_toast(2),
            ("LINK COPIED TO CLIPBOARD", (0x80, 0xff, 0xa0))
        );
        assert_eq!(share_toast(3), ("SHARE FAILED", (0xff, 0x80, 0x60)));
        assert_eq!(sens_readout(0.0020), "2.00");
        assert_eq!(sens_readout(0.0005), "0.50");
        assert_eq!(chat_fade_readout(60.0), "60");
        assert_eq!(chat_fade_readout(299.6), "300");
    }

    #[test]
    fn all_player_visible_strings_are_ascii_no_underscores() {
        let mut all: Vec<String> = vec![
            TXT_PROFILE_TITLE,
            TXT_MAIN_TITLE,
            TXT_MAIN_HINT,
            TXT_WORLD_TITLE,
            TXT_MP_TITLE,
            TXT_MP_HINT_SELF,
            TXT_MP_HINT_CLOUD,
            TXT_CLOUD_TITLE,
            TXT_RECENT_ROOMS,
            TXT_CONNECT_FAILED,
            TXT_URL_PROMPT,
            TXT_PAUSED,
            TXT_DISCONNECTED,
            TXT_SETTINGS_TITLE,
            TXT_MOUSE_SENS,
            TXT_CHAT_FADE,
            TXT_GFX_QUALITY,
            TXT_RELOAD_TO_APPLY,
            "SINGLE PLAYER",
            "MULTIPLAYER",
            "SETTINGS",
            "+ NEW WORLD",
            "+ NEW PROFILE",
            "BACK",
            "BACK TO MENU",
            "SELF HOSTED",
            "CLOUD HOSTED",
            "HOST",
            "JOIN",
            "RETURN TO GAME",
            "INVITE PLAYERS",
            "QUIT TO MENU",
            "DISCONNECTED FROM SERVER",
            "connection failed",
        ]
        .into_iter()
        .map(str::to_string)
        .collect();
        for s in [
            GameState::MpJoinInput,
            GameState::ProfileNameInput,
            GameState::SpNewWorldInput,
        ] {
            let (t, h, p, _) = input_screen_text(s);
            all.extend([t.to_string(), h.to_string(), p.to_string()]);
        }
        all.push(profile_chip_label("Bob"));
        all.push(header_with_dots("RECONNECTING", 2));
        all.push(reconnect_attempt_line(2, 17.0));
        all.push(share_toast(1).0.to_string());
        all.push(share_toast(2).0.to_string());
        all.push(share_toast(3).0.to_string());
        all.push(lite_graphics_label(true).to_string());
        all.push(lite_graphics_label(false).to_string());
        all.push(sens_readout(0.0042));
        all.push(chat_fade_readout(120.0));
        for s in all {
            assert!(s.is_ascii(), "non-ASCII player-visible string: {:?}", s);
            assert!(
                !s.contains('_'),
                "underscore in player-visible string: {:?}",
                s
            );
            assert!(
                !s.contains('\u{2014}') && !s.contains('\u{2013}'),
                "dash glyph in player-visible string: {:?}",
                s
            );
        }
    }

    /* -- word wrap --------------------------------------------------------------- */

    #[test]
    fn wrap_lines_splits_on_spaces() {
        assert_eq!(wrap_lines("one two three", 7), vec!["one two", "three"]);
        assert_eq!(wrap_lines("", 10), Vec::<String>::new());
        assert_eq!(wrap_lines("   ", 10), Vec::<String>::new());
        /* Multiple spaces collapse (the C skips runs of spaces). */
        assert_eq!(wrap_lines("a  b", 10), vec!["a b"]);
        /* Exact fit keeps the word on the line. */
        assert_eq!(wrap_lines("abc def", 3), vec!["abc", "def"]);
    }

    #[test]
    fn wrap_lines_hard_breaks_long_words() {
        assert_eq!(wrap_lines("abcdefghij", 4), vec!["abcd", "efgh", "ij"]);
        assert_eq!(
            wrap_lines("hi abcdefghij yo", 4),
            vec!["hi", "abcd", "efgh", "ij", "yo"]
        );
        /* The connect-error panel budget: scale 1.5 -> cell 12 px,
         * 448 px budget -> 37 chars. Pin the kick-text split. */
        let lines = wrap_lines(
            "Version mismatch - server v3 / client v2. Refresh: Ctrl+Shift+R",
            37,
        );
        assert_eq!(
            lines,
            vec![
                "Version mismatch - server v3 / client",
                "v2. Refresh: Ctrl+Shift+R"
            ]
        );
    }

    /* -- misc helpers --------------------------------------------------------------- */

    #[test]
    fn trunc_cuts_at_byte_cap() {
        assert_eq!(trunc("ABCDEFGH", 8), "ABCDEFGH");
        assert_eq!(trunc("ABCDEFGHI", 8), "ABCDEFGH");
        assert_eq!(trunc("", 8), "");
    }

    #[test]
    fn force_state_is_a_raw_setter() {
        let _g = setup("menu_force_state");
        force_state(GameState::InGameMp);
        assert_eq!(state(), GameState::InGameMp);
        force_state(GameState::MainMenu);
        assert_eq!(state(), GameState::MainMenu);
    }
}
