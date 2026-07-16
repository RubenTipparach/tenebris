//! Port of `tenebris-c/src/client/teleport_menu.{c,h}`.
//!
//! Keyboard-driven teleport menu. Toggle with T (or M); arrow keys
//! scroll the selection; Enter teleports. Draws a sokol_gl panel with
//! sokol_debugtext labels in the same overlay pass as the debug HUD.
//!
//! # Renames (PORTING.md rule 4 - `teleport_menu_` prefix dropped)
//!
//! - `teleport_menu_init()`       -> `teleport_menu::init()`
//! - `teleport_menu_shutdown()`   -> `teleport_menu::shutdown()`
//! - `teleport_menu_is_open()`    -> `teleport_menu::is_open()`
//! - `teleport_menu_toggle()`     -> `teleport_menu::toggle()`
//! - `teleport_menu_set_player()` -> `teleport_menu::set_player()`
//! - `teleport_menu_event()`      -> `teleport_menu::handle_event()`
//!   (matches the `input_event()` -> `input::handle_event()` rename)
//! - `teleport_menu_poll_touches()` -> `teleport_menu::poll_touches()`
//! - `teleport_menu_draw()`       -> `teleport_menu::draw()`
//! - `teleport_menu_draw_mobile_buttons()`
//!                                -> `teleport_menu::draw_mobile_buttons()`
//!
//! # Factoring for headless tests (port-added, no behavior change)
//!
//! The C file mixes layout math and sgl/sdtx submission in the same
//! functions. The port splits them so the logic half runs without a
//! sokol app context:
//!
//! - `compute_layout()` reads `sapp_widthf()/heightf()` internally in
//!   C; the port takes `(screen_w, screen_h)` so it is a pure function.
//!   Callers fetch the dims through the `screen_sizef()` seam, which
//!   `#[cfg(test)]` swaps for a thread-local double (same pattern as
//!   input.rs).
//! - The inline row / close-button color branches in
//!   `teleport_menu_draw` are factored into `row_fill_color()`,
//!   `row_text_color()` and `close_btn_fill_color()` so tests can pin
//!   the exact highlight palette.
//! - The row label `"%-18s %s r=%5.0fm"` printf and its tag ternary
//!   are factored into `row_label()` / `body_tag()` so tests can pin
//!   the exact (ASCII-only) strings.
//! - `clamp_scroll()` takes `&mut Menu` instead of mutating the global
//!   directly (borrow discipline; same math).
//!
//! All state mutation (open/selected/scroll, click hit-tests, key and
//! touch navigation) is sokol-free except the screen-size seam;
//! `draw()` / `draw_mobile_buttons()` / `draw_text_at()` are the only
//! functions that submit sgl/sdtx commands.
//!
//! Most public items are unused until the main_web port lands:
#![allow(dead_code)]

use std::cell::RefCell;
use std::rc::Rc;

use sokol::app as sapp;
use sokol::debugtext as sdtx;
use sokol::gl as sgl;
use tenebris_core::planet;

use crate::input;
use crate::mobile_ui;
use crate::player_ctrl::{self, PlayerCtrl};
use crate::renderer;

/* ----------------------------------------------------------------------- */

const VISIBLE_ROWS: i32 = 12;
const PANEL_W: f32 = 380.0;
const ROW_H: f32 = 34.0;
const TITLE_H: f32 = 48.0;
const CLOSE_BTN_PX: f32 = 28.0;
const ROW_PAD: f32 = 4.0;

/// Mirrors the C `BODY_COUNT` uses in this file (int arithmetic).
const BODY_COUNT: i32 = planet::BODY_COUNT as i32;

/// Debug teleport destinations are every body, then the orbital station(s).
/// One station today (the casino drum riding Tenebris orbit); centralising
/// the count here keeps the nav / draw / hit-test bounds in agreement.
const STATION_COUNT: i32 = 1;

/// Total selectable rows: bodies first, stations after.
fn dest_count() -> i32 {
    BODY_COUNT + STATION_COUNT
}

/// What a selectable row points at.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum Dest {
    /// Index into the planet table (`planet::get_by_index`).
    Body(i32),
    /// Station index (0-based; only 0 exists today).
    Station(i32),
}

/// Resolve a row index into its destination, or `None` when out of range.
fn dest_at(idx: i32) -> Option<Dest> {
    if idx < 0 {
        None
    } else if idx < BODY_COUNT {
        Some(Dest::Body(idx))
    } else if idx < BODY_COUNT + STATION_COUNT {
        Some(Dest::Station(idx - BODY_COUNT))
    } else {
        None
    }
}

/// Station row label - ASCII only (reaches the player via debugtext).
fn station_row_label(_i: i32) -> String {
    format!("{:<18} hub  Tenebris orbit", "Orbital Station")
}

/// Row label for any destination (body or station).
fn dest_row_label(idx: i32) -> Option<String> {
    match dest_at(idx)? {
        Dest::Body(i) => planet::get_by_index(i).map(|b| row_label(&b)),
        Dest::Station(i) => Some(station_row_label(i)),
    }
}

/// The C menu keeps a raw `player_ctrl_t*` so mobile button taps -
/// which can't pass a player through input.c - can still call
/// player_teleport_to. The port's analogue of that long-lived pointer
/// is a shared `Rc<RefCell<PlayerCtrl>>` handle.
pub type PlayerHandle = Rc<RefCell<PlayerCtrl>>;

/// Port of the C file's anonymous `static struct { ... } M`.
#[derive(Clone, Debug, Default)]
struct Menu {
    open: bool,
    /// index into BODY_COUNT
    selected: i32,
    /// first visible row
    scroll: i32,
    player: Option<PlayerHandle>,
    /* Mouse / touch state pumped from handle_event. The draw pass uses
     * these for hover rendering and the click handler runs the same
     * hit-test against the cached panel rect so a click is always
     * resolved against what the user actually saw. */
    mouse_x: f32,
    mouse_y: f32,
    /* Last drawn panel geometry (pixel coords, origin top-left), cached
     * so the mouse-click hit-test can use the exact same rect even when
     * the draw call hasn't run yet on the very first frame. (Write-only
     * in the C file too - handle_click recomputes the layout itself;
     * kept for 1:1 parity.) */
    panel_x: f32,
    panel_y: f32,
    panel_w: f32,
    panel_h: f32,
    layout_valid: bool,
}

thread_local! {
    static M: RefCell<Menu> = RefCell::new(Menu::default());
}

/// Port of `teleport_menu_init()`.
pub fn init() {
    M.with(|cell| *cell.borrow_mut() = Menu::default());
}

/// Port of `teleport_menu_shutdown()`.
pub fn shutdown() {}

/// Port of `teleport_menu_is_open()`.
pub fn is_open() -> bool {
    M.with(|cell| cell.borrow().open)
}

/// Port of `teleport_menu_toggle()`.
pub fn toggle() {
    M.with(|cell| {
        let m = &mut *cell.borrow_mut();
        m.open = !m.open;
    });
}

/// Port of `teleport_menu_set_player()`.
pub fn set_player(player: Option<PlayerHandle>) {
    M.with(|cell| cell.borrow_mut().player = player);
}

/* --------------------------------------------------------------------- */
/* sokol runtime seam - see "Factoring for headless tests" in the module
 * docs. The non-test path forwards to sokol::app 1:1; tests swap in a
 * thread-local double because there is no app context to call into. */

#[cfg(not(test))]
fn screen_sizef() -> (f32, f32) {
    (sapp::widthf(), sapp::heightf())
}

#[cfg(test)]
use test_doubles::screen_sizef;

#[cfg(test)]
mod test_doubles {
    use std::cell::Cell;

    thread_local! {
        pub static SCREEN: Cell<(f32, f32)> = const { Cell::new((0.0, 0.0)) };
    }

    pub fn screen_sizef() -> (f32, f32) {
        SCREEN.with(|c| c.get())
    }
}

/* ----------------------------------------------------------------------- */

/// Port of `clamp_scroll()`.
fn clamp_scroll(m: &mut Menu) {
    if m.selected < m.scroll {
        m.scroll = m.selected;
    }
    if m.selected >= m.scroll + VISIBLE_ROWS {
        m.scroll = m.selected - VISIBLE_ROWS + 1;
    }
    if m.scroll < 0 {
        m.scroll = 0;
    }
    if m.scroll > dest_count() - VISIBLE_ROWS {
        m.scroll = dest_count() - VISIBLE_ROWS;
    }
    if m.scroll < 0 {
        m.scroll = 0;
    }
}

/// Port of `action_up()`.
fn action_up() {
    M.with(|cell| {
        let m = &mut *cell.borrow_mut();
        if !m.open {
            return;
        }
        if m.selected > 0 {
            m.selected -= 1;
        }
        clamp_scroll(m);
    });
}

/// Port of `action_down()`.
fn action_down() {
    M.with(|cell| {
        let m = &mut *cell.borrow_mut();
        if !m.open {
            return;
        }
        if m.selected < dest_count() - 1 {
            m.selected += 1;
        }
        clamp_scroll(m);
    });
}

/// Port of `action_ok()`.
fn action_ok() {
    let (open, player, selected) = M.with(|cell| {
        let m = cell.borrow();
        (m.open, m.player.clone(), m.selected)
    });
    if !open {
        return;
    }
    if let Some(player) = player {
        /* Riding = the player IS the ship in flight; teleport carries the
         * SHIP (keeps them flying in space) instead of dropping a walking
         * player onto a surface. On foot uses the surface/deck landings. */
        let riding = crate::rocket_ride::is_riding();
        match dest_at(selected) {
            Some(Dest::Body(i)) => {
                if let Some(b) = planet::get_by_index(i) {
                    if riding {
                        /* Ship hovers in space above the destination, still
                         * flying (see teleport_ride_to_body). */
                        player_ctrl::teleport_ride_to_body(&mut player.borrow_mut(), &b);
                    } else {
                        /* player_teleport_to drops the player ~3 m above the
                         * destination's surface - comfortably inside its full-
                         * gravity radius (default 1.4 x body radius), so the
                         * gravity integrator pulls them straight to the ground
                         * rather than letting them no-clip through. The roll-
                         * slerp timer is armed at the same time so the camera
                         * eases into level rather than popping. */
                        player_ctrl::teleport_to(&mut player.borrow_mut(), &b);
                    }
                    /* Belt-and-suspenders: the per-frame body-sync in
                     * main_web also catches this, but call it here too so
                     * the renderer's chunked / LOD partition flips on the
                     * SAME frame the teleport happens - no stale "previous
                     * planet still meshed at full detail" window between
                     * teleport and the next frame's gravity tick. */
                    if let Some(w) = renderer::world_for_body(b.id as u32) {
                        renderer::set_active_world(&w);
                    }
                }
            }
            Some(Dest::Station(_)) => {
                if riding {
                    /* Ship arrives beside the station, matched to its
                     * velocity, ready to dock (see teleport_ride_to_station). */
                    player_ctrl::teleport_ride_to_station(&mut player.borrow_mut());
                } else {
                    /* Drops the player onto the casino deck riding the station's
                     * prograde velocity (see player_ctrl::teleport_to_station). */
                    player_ctrl::teleport_to_station(&mut player.borrow_mut());
                }
                /* The station orbits Tenebris, so make that body the active
                 * meshed world on the same frame as the bodies path does. */
                let ten = planet::get(planet::BodyId::Tenebris);
                if let Some(w) = renderer::world_for_body(ten.id as u32) {
                    renderer::set_active_world(&w);
                }
            }
            None => {}
        }
    }
    M.with(|cell| cell.borrow_mut().open = false);
}

/// Port of `action_close()`.
fn action_close() {
    M.with(|cell| cell.borrow_mut().open = false);
}

/* ----------------------------------------------------------------------- */

/// Port of `hit_rect()`. Pixel-rect hit test. Inclusive on the
/// left/top, exclusive on the right/bottom so adjacent rects don't
/// double-count a single click.
fn hit_rect(x: f32, y: f32, w: f32, h: f32, px: f32, py: f32) -> bool {
    px >= x && px < x + w && py >= y && py < y + h
}

/// Port of `compute_layout()`. Reconstruct the geometry the draw pass
/// uses so the click handler can hit-test rows + close-button without
/// depending on the draw call having run yet this frame. Pure function
/// of the screen size (the C version reads sapp_widthf/heightf
/// internally; see module docs). Returns (panel_x, panel_y, panel_w,
/// panel_h).
fn compute_layout(screen_w: f32, screen_h: f32) -> (f32, f32, f32, f32) {
    let panel_h = TITLE_H + VISIBLE_ROWS as f32 * ROW_H + 20.0;
    let panel_x = (screen_w - PANEL_W) * 0.5;
    let panel_y = (screen_h - panel_h) * 0.5;
    (panel_x, panel_y, PANEL_W, panel_h)
}

/// Port of `close_btn_rect()`. Returns (x, y, s).
fn close_btn_rect(panel_x: f32, panel_y: f32) -> (f32, f32, f32) {
    (
        panel_x + PANEL_W - CLOSE_BTN_PX - 8.0,
        panel_y + 10.0,
        CLOSE_BTN_PX,
    )
}

/// Port of `row_rect()`. Returns (x, y, w, h).
fn row_rect(panel_x: f32, panel_y: f32, row: i32) -> (f32, f32, f32, f32) {
    (
        panel_x + 10.0,
        panel_y + TITLE_H + row as f32 * ROW_H + ROW_PAD * 0.5,
        PANEL_W - 20.0,
        ROW_H - ROW_PAD,
    )
}

/// Port of `handle_click()`. Translate a mouse click at (px, py) into
/// a menu action. Returns true when the click landed on the panel -
/// the caller should treat the event as consumed so it doesn't fall
/// through to the game's look camera grab.
fn handle_click(px: f32, py: f32) -> bool {
    if !is_open() {
        return false;
    }
    let (screen_w, screen_h) = screen_sizef();
    let (panel_x, panel_y, panel_w, panel_h) = compute_layout(screen_w, screen_h);
    /* Close-button: red X in the top-right corner. */
    let (cx, cy, cs) = close_btn_rect(panel_x, panel_y);
    if hit_rect(cx, cy, cs, cs, px, py) {
        M.with(|cell| cell.borrow_mut().open = false);
        return true;
    }
    /* Body rows. */
    let scroll = M.with(|cell| cell.borrow().scroll);
    for row in 0..VISIBLE_ROWS {
        let idx = scroll + row;
        if idx >= dest_count() {
            break;
        }
        let (rx, ry, rw, rh) = row_rect(panel_x, panel_y, row);
        if hit_rect(rx, ry, rw, rh, px, py) {
            M.with(|cell| cell.borrow_mut().selected = idx);
            action_ok();
            return true;
        }
    }
    /* Click landed inside the panel rect but not on a button - still
     * consume so the game doesn't capture pointer-look on the same
     * click that the player is using to interact with the menu. */
    if hit_rect(panel_x, panel_y, panel_w, panel_h, px, py) {
        return true;
    }
    false
}

/// Port of `teleport_menu_event()`. Called from the sokol_app event
/// handler - intercepts toggle / nav / confirm keys. Returns true if
/// it consumed the event (caller should not forward it to input's
/// handler).
pub fn handle_event(e: &sapp::Event, player: Option<PlayerHandle>) -> bool {
    M.with(|cell| cell.borrow_mut().player = player);

    /* Track mouse / touch position whenever the menu is open so the
     * draw pass can highlight the hovered row. */
    if is_open() {
        if e._type == sapp::EventType::MouseMove {
            M.with(|cell| {
                let m = &mut *cell.borrow_mut();
                m.mouse_x = e.mouse_x;
                m.mouse_y = e.mouse_y;
            });
        } else if (e._type == sapp::EventType::TouchesBegan
            || e._type == sapp::EventType::TouchesMoved)
            && e.num_touches > 0
        {
            M.with(|cell| {
                let m = &mut *cell.borrow_mut();
                m.mouse_x = e.touches[0].pos_x;
                m.mouse_y = e.touches[0].pos_y;
            });
        }
        /* Mouse / touch click -> hit-test against panel buttons. */
        if e._type == sapp::EventType::MouseDown && e.mouse_button == sapp::Mousebutton::Left {
            return handle_click(e.mouse_x, e.mouse_y);
        }
        if e._type == sapp::EventType::TouchesBegan && e.num_touches > 0 {
            /* Pass the first touch through hit-test. The mobile nav
             * buttons are still handled by input -> poll_touches
             * separately; the new row clicks fall through to here. */
            let tx = e.touches[0].pos_x;
            let ty = e.touches[0].pos_y;
            if handle_click(tx, ty) {
                return true;
            }
        }
    }

    if e._type != sapp::EventType::KeyDown {
        return false;
    }
    /* Open / close on the OpenTeleport debug action (default M), routed through
     * the binding layer. The old T overload is gone - T is Plant. */
    if crate::controls::action_for_key(e.key_code) == Some(crate::controls::Action::OpenTeleport) {
        M.with(|cell| {
            let m = &mut *cell.borrow_mut();
            m.open = !m.open;
        });
        return true;
    }
    match e.key_code {
        sapp::Keycode::Escape => {
            if is_open() {
                M.with(|cell| cell.borrow_mut().open = false);
                return true;
            }
            false
        }
        sapp::Keycode::Up => {
            if !is_open() {
                return false;
            }
            action_up();
            true
        }
        sapp::Keycode::Down => {
            if !is_open() {
                return false;
            }
            action_down();
            true
        }
        sapp::Keycode::PageUp => {
            if !is_open() {
                return false;
            }
            for _ in 0..VISIBLE_ROWS {
                action_up();
            }
            true
        }
        sapp::Keycode::PageDown => {
            if !is_open() {
                return false;
            }
            for _ in 0..VISIBLE_ROWS {
                action_down();
            }
            true
        }
        sapp::Keycode::Enter | sapp::Keycode::Space => {
            if !is_open() {
                return false;
            }
            action_ok();
            true
        }
        _ => false,
    }
}

/// Port of `teleport_menu_poll_touches()`. Poll touch-button edge
/// events from input and apply their menu actions. Call once per frame.
pub fn poll_touches() {
    /* TP button in the main HUD always toggles the menu. */
    if input::consume_tp_tap() {
        M.with(|cell| {
            let m = &mut *cell.borrow_mut();
            m.open = !m.open;
        });
    }
    /* Menu-nav buttons only get registered when menu is open, so their
     * consume-taps are no-ops otherwise. */
    if input::consume_menu_up() {
        action_up();
    }
    if input::consume_menu_down() {
        action_down();
    }
    if input::consume_menu_ok() {
        action_ok();
    }
    if input::consume_menu_close() {
        action_close();
    }
}

/* ----------------------------------------------------------------------- */

/* Register the 4 nav-button hit rects with input when the menu is
 * open. Positions sit above the mobile HUD stack on the right side so
 * they don't collide with the main jump/break/place/tp buttons. */
const MENU_BTN_R: f32 = 28.0;
const MENU_BTN_GAP: f32 = 10.0;

/// Port of `register_nav_buttons()`.
fn register_nav_buttons() {
    if !is_open() {
        /* Clear so they're ignored in classify_touch. */
        input::state_mut(|p| {
            p.btn_menu_up_r = 0.0;
            p.btn_menu_down_r = 0.0;
            p.btn_menu_ok_r = 0.0;
            p.btn_menu_close_r = 0.0;
        });
        return;
    }
    let (w, h) = screen_sizef();
    let _ = w; /* C reads sapp_widthf() into w then (void)w */
    /* Four buttons in a vertical row on the left side of the menu
     * (mobile-safe; avoids the right-side movement stick + HUD
     * buttons). Center them vertically in the screen. */
    let cx = 40.0 + MENU_BTN_R;
    let cy0 = h * 0.5 - (1.5 * (MENU_BTN_R * 2.0 + MENU_BTN_GAP));
    let mut cy = cy0;
    input::state_mut(|p| {
        p.btn_menu_close_cx = cx;
        p.btn_menu_close_cy = cy;
        p.btn_menu_close_r = MENU_BTN_R;
        cy += MENU_BTN_R * 2.0 + MENU_BTN_GAP;
        p.btn_menu_up_cx = cx;
        p.btn_menu_up_cy = cy;
        p.btn_menu_up_r = MENU_BTN_R;
        cy += MENU_BTN_R * 2.0 + MENU_BTN_GAP;
        p.btn_menu_down_cx = cx;
        p.btn_menu_down_cy = cy;
        p.btn_menu_down_r = MENU_BTN_R;
        cy += MENU_BTN_R * 2.0 + MENU_BTN_GAP;
        p.btn_menu_ok_cx = cx;
        p.btn_menu_ok_cy = cy;
        p.btn_menu_ok_r = MENU_BTN_R;
    });
}

/// Port of `teleport_menu_draw_mobile_buttons()`. Submits nav-button
/// SGL commands when the menu is open. Caller must already have
/// mobile_ui's orthographic projection + alpha pipeline active.
pub fn draw_mobile_buttons() {
    if !is_open() {
        return;
    }
    let inp = input::state();
    mobile_ui::draw_button(
        inp.btn_menu_close_cx,
        inp.btn_menu_close_cy,
        MENU_BTN_R,
        0.50,
        0.15,
        0.15,
        0.55,
        1.00,
        0.55,
        0.55,
        0.80,
        'X',
    );
    mobile_ui::draw_button(
        inp.btn_menu_up_cx,
        inp.btn_menu_up_cy,
        MENU_BTN_R,
        0.20,
        0.25,
        0.40,
        0.55,
        0.70,
        0.85,
        1.00,
        0.80,
        '^',
    );
    mobile_ui::draw_button(
        inp.btn_menu_down_cx,
        inp.btn_menu_down_cy,
        MENU_BTN_R,
        0.20,
        0.25,
        0.40,
        0.55,
        0.70,
        0.85,
        1.00,
        0.80,
        'v',
    );
    mobile_ui::draw_button(
        inp.btn_menu_ok_cx,
        inp.btn_menu_ok_cy,
        MENU_BTN_R,
        0.15,
        0.45,
        0.20,
        0.55,
        0.65,
        1.00,
        0.70,
        0.80,
        'O',
    );
}

/* ----------------------------------------------------------------------- */
/* Pure draw-state helpers (port-added factoring of the inline branches
 * in teleport_menu_draw - see module docs). Same constants, same
 * branch order. */

/// Body row fill color (r, g, b, a) - port of the selected / hovered /
/// idle branch in `teleport_menu_draw`.
fn row_fill_color(selected: bool, hovered: bool) -> (f32, f32, f32, f32) {
    if selected {
        (0.34, 0.42, 0.58, 0.95)
    } else if hovered {
        (0.22, 0.30, 0.42, 0.95)
    } else {
        (0.14, 0.16, 0.22, 0.85)
    }
}

/// Body row label color (r, g, b) - port of the `idx == M.selected`
/// text-tint branch.
fn row_text_color(selected: bool) -> (u8, u8, u8) {
    if selected {
        (0xff, 0xe0, 0x80)
    } else {
        (0xc0, 0xc8, 0xd8)
    }
}

/// Close-button fill color (r, g, b, a) - port of the
/// `close_hovered ? 0.70f : 0.50f` branch.
fn close_btn_fill_color(hovered: bool) -> (f32, f32, f32, f32) {
    (if hovered { 0.70 } else { 0.50 }, 0.15, 0.15, 0.95)
}

/// Port of the tag ternary in `teleport_menu_draw`.
fn body_tag(b: &planet::BodyConfig) -> &'static str {
    if b.is_asteroid {
        "ast"
    } else if b.icy {
        "ice"
    } else if b.barren {
        "rck"
    } else {
        "pla"
    }
}

/// Port of the row label printf `"%-18s %s r=%5.0fm"`. ASCII only -
/// this string reaches the player through the debugtext path.
fn row_label(b: &planet::BodyConfig) -> String {
    format!("{:<18} {} r={:5.0}m", b.name, body_tag(b), b.radius_m)
}

/* ----------------------------------------------------------------------- */

/// Port of `draw_text_at()`. Left-aligned sdtx text at a pixel
/// position. Same trick draw_text_centered in menu.c uses: rescale the
/// sdtx canvas so the 8x8 glyph cell matches the requested scale, then
/// set the origin in cell units. Font 1 (c64) keeps the baseline clean
/// at 2-3x scale. (The C version is variadic printf into a 160-byte
/// buffer; callers here pass a preformatted &str.)
fn draw_text_at(x: f32, y: f32, scale: f32, r: u8, g: u8, b: u8, text: &str) {
    let cell_px = 8.0 * scale;
    let (screen_w, screen_h) = screen_sizef();
    sdtx::canvas(screen_w / scale, screen_h / scale);
    sdtx::font(1);
    sdtx::origin(x / cell_px, y / cell_px);
    sdtx::color3b(r, g, b);
    sdtx::home();
    sdtx::puts(text);
    sdtx::font(0);
}

/// Port of `teleport_menu_draw()`. Registers the nav-button hitboxes,
/// then draws the panel (sokol_gl) + labels (sokol_debugtext). The
/// nav-button graphic submission is done by [`draw_mobile_buttons`],
/// which mobile_ui_draw calls from inside its own sokol_gl state block.
pub fn draw() {
    register_nav_buttons();

    if !is_open() {
        /* Hint line in the F2 debug HUD - clicking is for mouse users,
         * T / M is for keyboard, the mobile right-side T button is
         * managed by mobile_ui. */
        sdtx::color3b(0xa0, 0xa0, 0xc0);
        sdtx::puts("[T] teleport\n");
        return;
    }

    /* Set up the same alpha-blended 2D pipeline mobile_ui and the
     * pause overlay use, in screen-pixel ortho coords (origin top
     * left). All geometry goes into sokol_gl; main_web's end-of-frame
     * sgl_draw flushes it. */
    let (w, h) = screen_sizef();
    sgl::defaults();
    sgl::matrix_mode_projection();
    sgl::load_identity();
    sgl::ortho(0.0, w, h, 0.0, -1.0, 1.0);
    sgl::matrix_mode_modelview();
    sgl::load_identity();
    let pip = mobile_ui::alpha_pipeline();
    if pip.id == 0 {
        /* mobile_ui_draw hasn't run yet this frame (rare - normally
         * runs before us). Fall back to the legacy ASCII overlay so
         * the menu still appears even if the shared pipeline isn't
         * ready. */
        sdtx::color3b(0xff, 0xff, 0xff);
        sdtx::puts("[teleport] (drawing pipeline not ready yet)\n");
        return;
    }
    sgl::load_pipeline(pip);

    /* Compute + cache the layout so the click handler can hit-test
     * against the same rects we draw. */
    let (panel_x, panel_y, panel_w, panel_h) = compute_layout(w, h);
    let (mouse_x, mouse_y, scroll, sel) = M.with(|cell| {
        let m = &mut *cell.borrow_mut();
        m.panel_x = panel_x;
        m.panel_y = panel_y;
        m.panel_w = panel_w;
        m.panel_h = panel_h;
        m.layout_valid = true;
        (m.mouse_x, m.mouse_y, m.scroll, m.selected)
    });

    /* Backdrop + panel + border. Same colour palette as menu_pause_draw
     * so the two overlays read as part of the same UI family. */
    mobile_ui::draw_rect(0.0, 0.0, w, h, 0.02, 0.03, 0.07, 0.55);
    mobile_ui::draw_rect(panel_x, panel_y, panel_w, panel_h, 0.10, 0.12, 0.18, 0.96);
    mobile_ui::draw_rect_outline(panel_x, panel_y, panel_w, panel_h, 2.0, 0.85, 0.90, 1.00, 1.0);

    /* Title bar separator (darker strip at the bottom of the title). */
    mobile_ui::draw_rect(
        panel_x,
        panel_y + TITLE_H - 2.0,
        panel_w,
        2.0,
        0.85,
        0.90,
        1.00,
        0.50,
    );

    /* Close button (red X) in the top-right of the panel. */
    let (cx, cy, cs) = close_btn_rect(panel_x, panel_y);
    let close_hovered = hit_rect(cx, cy, cs, cs, mouse_x, mouse_y);
    let (cr, cg, cb, ca) = close_btn_fill_color(close_hovered);
    mobile_ui::draw_rect(cx, cy, cs, cs, cr, cg, cb, ca);
    mobile_ui::draw_rect_outline(cx, cy, cs, cs, 1.5, 1.00, 0.55, 0.55, 0.95);

    /* Destination rows (bodies, then stations). */
    for row in 0..VISIBLE_ROWS {
        let idx = scroll + row;
        if idx >= dest_count() {
            break;
        }
        let (rx, ry, rw, rh) = row_rect(panel_x, panel_y, row);
        let selected = idx == sel;
        let hovered = hit_rect(rx, ry, rw, rh, mouse_x, mouse_y);
        let (fr, fg, fb, fa) = row_fill_color(selected, hovered);
        mobile_ui::draw_rect(rx, ry, rw, rh, fr, fg, fb, fa);
        if selected {
            mobile_ui::draw_rect_outline(rx, ry, rw, rh, 1.5, 0.95, 0.85, 0.45, 0.95);
        }
    }

    /* Text layer on top of the geometry. */
    draw_text_at(panel_x + 16.0, panel_y + 12.0, 3.0, 0xff, 0xff, 0xff, "TELEPORT");
    draw_text_at(
        panel_x + 16.0,
        panel_y + TITLE_H - 18.0,
        1.5,
        0xa0,
        0xa8,
        0xc0,
        "click a row to go - arrows + enter also work",
    );

    /* X glyph inside the close button. Centered in the 28 px square. */
    draw_text_at(cx + 8.0, cy + 6.0, 2.0, 0xff, 0xff, 0xff, "X");

    for row in 0..VISIBLE_ROWS {
        let idx = scroll + row;
        if idx >= dest_count() {
            break;
        }
        let Some(label) = dest_row_label(idx) else {
            continue;
        };
        let (rx, ry, _rw, _rh) = row_rect(panel_x, panel_y, row);
        let (tr, tg, tb) = row_text_color(idx == sel);
        draw_text_at(rx + 8.0, ry + 6.0, 1.75, tr, tg, tb, &label);
    }

    /* Nav-button SGL commands are still issued by mobile_ui_draw so
     * they share the same orthographic projection + alpha pipeline
     * state. They remain useful on touchscreens that don't deliver
     * fine-grained mouse events. */
}

/* ----------------------------------------------------------------------- */

#[cfg(test)]
mod tests {
    use super::*;
    use sapp::{Event, EventType, Keycode, Mousebutton, Touchpoint};

    const SCREEN_W: f32 = 1280.0;
    const SCREEN_H: f32 = 720.0;

    /// Every test starts from a clean module: fresh menu state, fresh
    /// input state, known screen size. (Each #[test] runs on its own
    /// thread so the thread-locals are fresh anyway; this makes it
    /// explicit.)
    fn setup() {
        init();
        input::init();
        /* Toggle resolves through the binding layer (OpenTeleport = M); reset
         * so a controls test that rebound M on this pooled thread can't leak. */
        crate::controls::reset_to_defaults();
        test_doubles::SCREEN.with(|c| c.set((SCREEN_W, SCREEN_H)));
    }

    fn snapshot() -> Menu {
        M.with(|cell| cell.borrow().clone())
    }

    /// A live player handle, the test analogue of main_web's
    /// `player_ctrl_t*`.
    fn player() -> PlayerHandle {
        Rc::new(RefCell::new(PlayerCtrl::default()))
    }

    fn key(k: Keycode) -> Event {
        Event {
            _type: EventType::KeyDown,
            key_code: k,
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

    /// The panel rect at the test screen size, derived once by hand:
    /// panel_h = 48 + 12*34 + 20 = 476; x = (1280-380)/2; y = (720-476)/2.
    const PANEL_X: f32 = 450.0;
    const PANEL_Y: f32 = 122.0;

    /* -- open / close state machine ------------------------------------ */

    #[test]
    fn starts_closed_and_toggles() {
        setup();
        assert!(!is_open());
        toggle();
        assert!(is_open());
        toggle();
        assert!(!is_open());
    }

    #[test]
    fn teleport_key_toggles_and_consumes() {
        setup();
        /* M is the OpenTeleport debug key (T was dropped - it is Plant now). */
        assert!(handle_event(&key(Keycode::M), None));
        assert!(is_open());
        assert!(handle_event(&key(Keycode::M), None));
        assert!(!is_open());
        /* T must NOT toggle the teleport menu anymore. */
        assert!(!handle_event(&key(Keycode::T), None));
        assert!(!is_open());
    }

    #[test]
    fn escape_closes_only_when_open() {
        setup();
        assert!(!handle_event(&key(Keycode::Escape), None));
        assert!(!is_open());
        toggle();
        assert!(handle_event(&key(Keycode::Escape), None));
        assert!(!is_open());
    }

    #[test]
    fn nav_and_confirm_keys_ignored_when_closed() {
        setup();
        for k in [
            Keycode::Up,
            Keycode::Down,
            Keycode::PageUp,
            Keycode::PageDown,
            Keycode::Enter,
            Keycode::Space,
        ] {
            assert!(!handle_event(&key(k), None), "{:?} consumed while closed", k);
        }
        let m = snapshot();
        assert_eq!((m.selected, m.scroll), (0, 0));
    }

    #[test]
    fn enter_and_space_close_the_menu() {
        setup();
        toggle();
        assert!(handle_event(&key(Keycode::Enter), Some(player())));
        assert!(!is_open());
        toggle();
        assert!(handle_event(&key(Keycode::Space), None));
        assert!(!is_open());
    }

    /* -- navigation order across the body list -------------------------- */

    /// Pins the exact row order against tenebris_core::planet's table:
    /// menu row index i is planet::BodyId::ALL[i].
    #[test]
    fn row_order_matches_planet_table() {
        let expected = [
            "Tenebris",
            "Luna",
            "Selene",
            "Sequoia",
            "Verdant",
            "Sprout",
            "Crag",
            "Quartz",
            "Frostbite",
            "Rime",
            "Asteroid A",
            "Asteroid B",
            "Asteroid C",
            "Asteroid D",
            "Asteroid E",
            "Asteroid F",
            "Asteroid G",
            "Asteroid H",
            "Asteroid I",
            "Asteroid J",
        ];
        assert_eq!(expected.len(), planet::BODY_COUNT);
        for (i, &name) in expected.iter().enumerate() {
            let b = planet::get_by_index(i as i32).expect("body in range");
            assert_eq!(b.name, name, "row {}", i);
        }
        assert!(planet::get_by_index(BODY_COUNT).is_none());
    }

    #[test]
    fn arrow_navigation_clamps_at_both_ends_and_scrolls() {
        setup();
        toggle();
        /* Up at the top is a no-op. */
        assert!(handle_event(&key(Keycode::Up), None));
        assert_eq!(snapshot().selected, 0);
        /* Walk down the full list; selection clamps at the last row (now
         * the station, past the bodies) and scroll lands at
         * dest_count() - VISIBLE_ROWS. */
        for _ in 0..30 {
            handle_event(&key(Keycode::Down), None);
        }
        let m = snapshot();
        assert_eq!(m.selected, dest_count() - 1);
        assert_eq!(m.scroll, dest_count() - VISIBLE_ROWS);
        /* The last row is the station, not a body. */
        assert_eq!(dest_at(m.selected), Some(Dest::Station(0)));
        /* Walk back up; scroll follows the selection. */
        for _ in 0..25 {
            handle_event(&key(Keycode::Up), None);
        }
        let m = snapshot();
        assert_eq!((m.selected, m.scroll), (0, 0));
    }

    #[test]
    fn page_keys_step_by_visible_rows() {
        setup();
        toggle();
        assert!(handle_event(&key(Keycode::PageDown), None));
        let m = snapshot();
        assert_eq!(m.selected, 12);
        assert_eq!(m.scroll, 1); /* selected - VISIBLE_ROWS + 1 */
        handle_event(&key(Keycode::PageDown), None);
        let m = snapshot();
        assert_eq!(m.selected, dest_count() - 1);
        assert_eq!(m.scroll, dest_count() - VISIBLE_ROWS); /* 9 */
        assert!(handle_event(&key(Keycode::PageUp), None));
        let m = snapshot();
        assert_eq!(m.selected, 8);
        assert_eq!(m.scroll, 8);
    }

    /* -- selection from key sequences ------------------------------------ */

    #[test]
    fn key_sequence_maps_to_body_index() {
        setup();
        toggle();
        for _ in 0..3 {
            handle_event(&key(Keycode::Down), None);
        }
        assert!(handle_event(&key(Keycode::Enter), Some(player())));
        let m = snapshot();
        assert_eq!(m.selected, 3); /* Sequoia */
        assert!(!m.open);
        assert_eq!(planet::get_by_index(m.selected).unwrap().name, "Sequoia");
    }

    /* -- layout math ------------------------------------------------------ */

    #[test]
    fn layout_rects_are_pinned() {
        let (px, py, pw, ph) = compute_layout(SCREEN_W, SCREEN_H);
        assert_eq!((px, py, pw, ph), (PANEL_X, PANEL_Y, 380.0, 476.0));
        let (cx, cy, cs) = close_btn_rect(px, py);
        assert_eq!((cx, cy, cs), (PANEL_X + 344.0, PANEL_Y + 10.0, 28.0));
        let (rx, ry, rw, rh) = row_rect(px, py, 0);
        assert_eq!(
            (rx, ry, rw, rh),
            (PANEL_X + 10.0, PANEL_Y + 50.0, 360.0, 30.0)
        );
        let (_, ry5, _, _) = row_rect(px, py, 5);
        assert_eq!(ry5, PANEL_Y + 50.0 + 5.0 * 34.0);
    }

    #[test]
    fn hit_rect_is_left_top_inclusive_right_bottom_exclusive() {
        assert!(hit_rect(10.0, 10.0, 20.0, 20.0, 10.0, 10.0));
        assert!(hit_rect(10.0, 10.0, 20.0, 20.0, 29.9, 29.9));
        assert!(!hit_rect(10.0, 10.0, 20.0, 20.0, 30.0, 10.0));
        assert!(!hit_rect(10.0, 10.0, 20.0, 20.0, 10.0, 30.0));
    }

    /* -- selection from synthetic clicks / touches ------------------------ */

    #[test]
    fn click_on_row_selects_and_teleport_closes() {
        setup();
        toggle();
        /* Exact top-left corner of row 5 (inclusive edge). */
        let (rx, ry, _, _) = row_rect(PANEL_X, PANEL_Y, 5);
        assert!(handle_event(&click(rx, ry), Some(player())));
        let m = snapshot();
        assert_eq!(m.selected, 5); /* Sprout */
        assert!(!m.open);
    }

    #[test]
    fn touch_on_row_selects_and_closes() {
        setup();
        toggle();
        /* Scroll down first so a visible row maps to scroll + row. */
        handle_event(&key(Keycode::PageDown), None); /* scroll = 1 */
        let (rx, ry, rw, rh) = row_rect(PANEL_X, PANEL_Y, 2);
        let e = touch(EventType::TouchesBegan, rx + rw * 0.5, ry + rh * 0.5);
        assert!(handle_event(&e, None));
        let m = snapshot();
        assert_eq!(m.selected, 3); /* scroll(1) + row(2) */
        assert!(!m.open);
    }

    #[test]
    fn click_on_close_button_closes_without_selecting() {
        setup();
        toggle();
        let (cx, cy, cs) = close_btn_rect(PANEL_X, PANEL_Y);
        assert!(handle_event(&click(cx + cs * 0.5, cy + cs * 0.5), None));
        let m = snapshot();
        assert!(!m.open);
        assert_eq!(m.selected, 0);
    }

    #[test]
    fn click_inside_panel_is_consumed_outside_is_not() {
        setup();
        toggle();
        /* Title-bar dead zone: consumed but no state change. */
        assert!(handle_event(&click(PANEL_X + 4.0, PANEL_Y + 4.0), None));
        assert!(is_open());
        /* Row 0's bottom-right corner is exclusive - falls into the
         * panel dead zone, consumed, no selection. */
        let (rx, ry, rw, rh) = row_rect(PANEL_X, PANEL_Y, 0);
        assert!(handle_event(&click(rx + rw, ry + rh), None));
        let m = snapshot();
        assert!(m.open);
        assert_eq!(m.selected, 0);
        /* Fully outside the panel: not consumed, menu stays open. */
        assert!(!handle_event(&click(10.0, 10.0), None));
        assert!(is_open());
        /* Any click while closed is never consumed. */
        toggle();
        assert!(!handle_event(&click(PANEL_X + 4.0, PANEL_Y + 4.0), None));
    }

    #[test]
    fn mouse_and_touch_moves_update_hover_position() {
        setup();
        toggle();
        let e = Event {
            _type: EventType::MouseMove,
            mouse_x: 123.0,
            mouse_y: 456.0,
            ..Default::default()
        };
        assert!(!handle_event(&e, None)); /* move is tracked, not consumed */
        let m = snapshot();
        assert_eq!((m.mouse_x, m.mouse_y), (123.0, 456.0));
        handle_event(&touch(EventType::TouchesMoved, 50.0, 60.0), None);
        let m = snapshot();
        assert_eq!((m.mouse_x, m.mouse_y), (50.0, 60.0));
    }

    /* -- touch nav buttons (input edge flags) ----------------------------- */

    #[test]
    fn nav_buttons_register_only_while_open() {
        setup();
        register_nav_buttons();
        let p = input::state();
        assert_eq!(p.btn_menu_up_r, 0.0);
        assert_eq!(p.btn_menu_close_r, 0.0);
        toggle();
        register_nav_buttons();
        let p = input::state();
        /* cx = 40 + 28; close at h/2 - 1.5*(56+10), then +66 steps. */
        assert_eq!((p.btn_menu_close_cx, p.btn_menu_close_cy), (68.0, 261.0));
        assert_eq!((p.btn_menu_up_cx, p.btn_menu_up_cy), (68.0, 327.0));
        assert_eq!((p.btn_menu_down_cx, p.btn_menu_down_cy), (68.0, 393.0));
        assert_eq!((p.btn_menu_ok_cx, p.btn_menu_ok_cy), (68.0, 459.0));
        for r in [
            p.btn_menu_close_r,
            p.btn_menu_up_r,
            p.btn_menu_down_r,
            p.btn_menu_ok_r,
        ] {
            assert_eq!(r, MENU_BTN_R);
        }
        /* Closing clears the radii again so classify_touch ignores them. */
        toggle();
        register_nav_buttons();
        assert_eq!(input::state().btn_menu_ok_r, 0.0);
    }

    #[test]
    fn poll_touches_drives_menu_from_input_edges() {
        setup();
        /* TP tap toggles the menu open. */
        input::state_mut(|p| {
            p.btn_tp_cx = 100.0;
            p.btn_tp_cy = 100.0;
            p.btn_tp_r = 20.0;
        });
        input::handle_event(&touch(EventType::TouchesBegan, 100.0, 100.0));
        poll_touches();
        assert!(is_open());
        /* With the menu open, taps on the registered nav buttons fan
         * out to up / down / ok / close through the edge flags. */
        register_nav_buttons();
        input::handle_event(&touch(EventType::TouchesBegan, 68.0, 393.0)); /* down */
        poll_touches();
        assert_eq!(snapshot().selected, 1);
        input::handle_event(&touch(EventType::TouchesBegan, 68.0, 327.0)); /* up */
        poll_touches();
        assert_eq!(snapshot().selected, 0);
        input::handle_event(&touch(EventType::TouchesBegan, 68.0, 261.0)); /* close */
        poll_touches();
        assert!(!is_open());
        /* OK closes too (and would teleport with a player attached). */
        toggle();
        register_nav_buttons();
        input::handle_event(&touch(EventType::TouchesBegan, 68.0, 459.0)); /* ok */
        poll_touches();
        assert!(!is_open());
    }

    /* -- label strings ----------------------------------------------------- */

    #[test]
    fn row_labels_are_pinned_and_ascii_only() {
        let label = |i: i32| row_label(&planet::get_by_index(i).unwrap());
        assert_eq!(label(0), "Tenebris           pla r=  300m");
        assert_eq!(label(1), "Luna               rck r=   80m");
        assert_eq!(label(8), "Frostbite          ice r=  220m");
        assert_eq!(label(10), "Asteroid A         ast r=   14m");
        /* The station row is the last destination, after every body. */
        assert_eq!(station_row_label(0), "Orbital Station    hub  Tenebris orbit");
        let fixed = [
            "[T] teleport\n",
            "TELEPORT",
            "click a row to go - arrows + enter also work",
            "X",
        ];
        /* Cover EVERY destination row (bodies + station) plus the fixed
         * chrome strings. */
        for s in (0..dest_count())
            .map(|i| dest_row_label(i).unwrap())
            .chain(fixed.iter().map(|s| s.to_string()))
        {
            assert!(s.is_ascii(), "non-ASCII player-visible string: {:?}", s);
            assert!(
                !s.contains('_') && !s.contains('\u{2014}'),
                "forbidden glyph in player-visible string: {:?}",
                s
            );
        }
    }

    #[test]
    fn body_tag_priority_is_asteroid_ice_rock_planet() {
        /* Asteroids are also barren - is_asteroid must win. */
        let ast = planet::get_by_index(10).unwrap();
        assert!(ast.is_asteroid && ast.barren);
        assert_eq!(body_tag(&ast), "ast");
        assert_eq!(body_tag(&planet::get_by_index(8).unwrap()), "ice"); /* Frostbite */
        assert_eq!(body_tag(&planet::get_by_index(1).unwrap()), "rck"); /* Luna */
        assert_eq!(body_tag(&planet::get_by_index(0).unwrap()), "pla"); /* Tenebris */
    }

    /* -- highlight palette -------------------------------------------------- */

    #[test]
    fn highlight_colors_are_pinned() {
        assert_eq!(row_fill_color(true, false), (0.34, 0.42, 0.58, 0.95));
        assert_eq!(row_fill_color(true, true), (0.34, 0.42, 0.58, 0.95)); /* selected wins */
        assert_eq!(row_fill_color(false, true), (0.22, 0.30, 0.42, 0.95));
        assert_eq!(row_fill_color(false, false), (0.14, 0.16, 0.22, 0.85));
        assert_eq!(row_text_color(true), (0xff, 0xe0, 0x80));
        assert_eq!(row_text_color(false), (0xc0, 0xc8, 0xd8));
        assert_eq!(close_btn_fill_color(true), (0.70, 0.15, 0.15, 0.95));
        assert_eq!(close_btn_fill_color(false), (0.50, 0.15, 0.15, 0.95));
    }

    /* -- station destination ------------------------------------------------ */

    #[test]
    fn stations_follow_bodies_in_the_row_list() {
        assert_eq!(dest_count(), BODY_COUNT + STATION_COUNT);
        assert_eq!(dest_at(0), Some(Dest::Body(0)));
        assert_eq!(dest_at(BODY_COUNT - 1), Some(Dest::Body(BODY_COUNT - 1)));
        /* First row past the bodies is the station. */
        assert_eq!(dest_at(BODY_COUNT), Some(Dest::Station(0)));
        assert_eq!(dest_at(dest_count()), None);
        assert_eq!(dest_at(-1), None);
    }

    #[test]
    fn selecting_the_station_row_lands_on_the_deck() {
        setup();
        toggle();
        let p = player();
        /* Walk to the last row (the station) and confirm. */
        for _ in 0..dest_count() {
            handle_event(&key(Keycode::Down), None);
        }
        assert_eq!(dest_at(snapshot().selected), Some(Dest::Station(0)));
        assert!(handle_event(&key(Keycode::Enter), Some(p.clone())));
        assert!(!is_open());

        let pl = p.borrow();
        assert!(pl.is_in_space, "the station rides orbit, not a surface");
        let t = tenebris_core::world_time::seconds();
        /* Inherits the station's prograde velocity so it doesn't instantly
         * shear off the frame at orbital speed. */
        let vel = tenebris_core::station::orbit_vel(t);
        assert!((pl.velocity.x - vel.x).abs() < 1e-6);
        assert!((pl.velocity.z - vel.z).abs() < 1e-6);
        /* Landed on the drum, near its anchor - not out at a planet radius. */
        let anchor = tenebris_core::station::orbit_pos(t);
        let d = tenebris_core::math::dvec3_length(tenebris_core::math::dvec3_sub(
            pl.position,
            anchor,
        ));
        assert!(d < 200.0, "within the drum, got {d} m from the anchor");
    }
}
