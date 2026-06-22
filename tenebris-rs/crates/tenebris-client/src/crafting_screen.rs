//! Survival crafting screen - a drawn `sokol_gl` panel (per the repo UI
//! rules: real geometry + hit-tested rows, labels via `sokol_debugtext`),
//! modelled on `teleport_menu`.
//!
//! Opened with `B` (E is already the space-mode roll key). Lists the
//! recipes installed from `recipes.yaml`; each row shows the output and
//! its inputs, coloured by whether the player can currently afford it
//! (hotbar + bag combined). Clicking a craftable row - or selecting it
//! with the arrows and pressing Enter - runs the craft through the
//! `bag` bridge, depositing the output into the bag.

use std::cell::RefCell;

use sokol::app as sapp;
use sokol::debugtext as sdtx;
use sokol::gl as sgl;

use crate::bag;
use crate::mobile_ui;
use crate::player_ctrl::PlayerCtrl;
use std::rc::Rc;
use tenebris_core::crafting::{self, Recipe};
use tenebris_core::items;

pub type PlayerHandle = Rc<RefCell<PlayerCtrl>>;

const PANEL_W: f32 = 480.0;
const TITLE_H: f32 = 46.0;
const ROW_H: f32 = 30.0;
const ROW_PAD: f32 = 4.0;
const CLOSE_BTN_PX: f32 = 26.0;
/// Hard cap on rows drawn (no scroll yet; Tier 0 has a handful).
const MAX_ROWS: usize = 16;

#[derive(Clone, Debug, Default)]
struct Screen {
    open: bool,
    selected: i32,
    player: Option<PlayerHandle>,
    mouse_x: f32,
    mouse_y: f32,
    /// Which recipes this surface offers: `None` = the hand bench (`B`),
    /// `Some(block_item_id)` = a placed station (furnace, ...). Only
    /// recipes whose `station` matches are listed / craftable.
    station: Option<items::ItemId>,
}

thread_local! {
    static S: RefCell<Screen> = RefCell::new(Screen::default());
}

pub fn init() {
    S.with(|c| *c.borrow_mut() = Screen::default());
}

pub fn shutdown() {}

pub fn is_open() -> bool {
    S.with(|c| c.borrow().open)
}

/// Force the craft screen closed (e.g. when the inventory or the pause
/// modal takes over).
pub fn close() {
    S.with(|c| c.borrow_mut().open = false);
}

/// Force the craft screen open for `player` (dev / headless entry point,
/// parallel to the `B` toggle). Mutually exclusive with the other
/// survival overlays, like the key path.
pub fn open(player: Option<PlayerHandle>) {
    open_station(player, None);
}

/// Open the craft screen scoped to a station (`None` = hand bench). A
/// placed furnace etc. passes its block item id so only its recipes show.
pub fn open_station(player: Option<PlayerHandle>, station: Option<items::ItemId>) {
    S.with(|c| {
        let s = &mut *c.borrow_mut();
        s.player = player;
        s.open = true;
        s.station = station;
        s.selected = 0;
    });
    crate::inventory_screen::close();
    crate::rocket_screen::close();
    release_pointer();
}

/// The station the screen is currently scoped to.
fn cur_station() -> Option<items::ItemId> {
    S.with(|c| c.borrow().station)
}

/// Recipes offered by the currently-open surface (station-filtered).
fn cur_recipes() -> Vec<Recipe> {
    crafting::recipes_for_station(cur_station())
}

pub fn set_player(player: Option<PlayerHandle>) {
    S.with(|c| c.borrow_mut().player = player);
}

/* sokol runtime seam - real app forwards to sapp; tests swap a double. */
#[cfg(not(test))]
fn screen_sizef() -> (f32, f32) {
    (sapp::widthf(), sapp::heightf())
}
#[cfg(test)]
use test_doubles::screen_sizef;

/// Free the pointer + show the cursor when the screen opens so rows are
/// clickable (gameplay keeps the mouse locked for look). On close, the
/// next canvas click re-locks via the normal input path.
#[cfg(not(test))]
fn release_pointer() {
    sapp::lock_mouse(false);
    sapp::show_mouse(true);
}
#[cfg(test)]
fn release_pointer() {}

/// Number of recipe rows that will be drawn.
fn row_count() -> usize {
    cur_recipes().len().min(MAX_ROWS)
}

fn hit_rect(x: f32, y: f32, w: f32, h: f32, px: f32, py: f32) -> bool {
    px >= x && px < x + w && py >= y && py < y + h
}

/// Panel geometry (pixel coords, origin top-left).
fn compute_layout(screen_w: f32, screen_h: f32) -> (f32, f32, f32, f32) {
    let rows = row_count().max(1) as f32;
    let panel_h = TITLE_H + rows * ROW_H + 16.0;
    let panel_x = (screen_w - PANEL_W) * 0.5;
    let panel_y = (screen_h - panel_h) * 0.5;
    (panel_x, panel_y, PANEL_W, panel_h)
}

fn close_btn_rect(panel_x: f32, panel_y: f32) -> (f32, f32, f32) {
    (panel_x + PANEL_W - CLOSE_BTN_PX - 8.0, panel_y + 10.0, CLOSE_BTN_PX)
}

fn row_rect(panel_x: f32, panel_y: f32, row: usize) -> (f32, f32, f32, f32) {
    (
        panel_x + 10.0,
        panel_y + TITLE_H + row as f32 * ROW_H + ROW_PAD * 0.5,
        PANEL_W - 20.0,
        ROW_H - ROW_PAD,
    )
}

/// Item display name (ASCII, no underscores - safe for the Oric font).
fn item_name(id: items::ItemId) -> &'static str {
    items::def(id).map(|d| d.name).unwrap_or("?")
}

/// "4 plank   <-   1 log, 0 coal" style summary of a recipe.
fn recipe_label(r: &Recipe) -> String {
    let ins: Vec<String> =
        r.inputs.iter().map(|i| format!("{} {}", i.count, item_name(i.item))).collect();
    format!("{} {}   <-   {}", r.output.count, item_name(r.output.item), ins.join(", "))
}

/// Snapshot the player's affordability for each visible recipe (Inventory
/// and Bag are both `Copy`, so this is a cheap borrow-and-drop).
fn affordable_flags() -> Vec<bool> {
    let snap = S.with(|c| {
        c.borrow().player.as_ref().map(|p| {
            let p = p.borrow();
            (p.inventory, p.bag)
        })
    });
    let Some((inv, bag)) = snap else { return Vec::new() };
    cur_recipes()
        .iter()
        .take(MAX_ROWS)
        .map(|r| bag::can_craft(&inv, &bag, r))
        .collect()
}

/// Craft recipe `idx` (within the current station's filtered list) for the
/// bound player. Returns true if it happened.
fn craft_row(idx: usize) -> bool {
    let player = S.with(|c| c.borrow().player.clone());
    let Some(player) = player else { return false };
    let recipes = cur_recipes();
    let Some(recipe) = recipes.get(idx) else { return false };
    let mut p = player.borrow_mut();
    let p = &mut *p;
    bag::try_craft(&mut p.inventory, &mut p.bag, recipe)
    /* NOTE: bag persistence (same-frame save) lands with the SP/MP bag
     * sync wave - the hotbar follows the existing inventory path. */
}

/// Translate a click into a craft / close / select action. Returns true
/// when the click was inside the panel (consume it).
fn handle_click(px: f32, py: f32) -> bool {
    if !is_open() {
        return false;
    }
    let (sw, sh) = screen_sizef();
    let (panel_x, panel_y, panel_w, panel_h) = compute_layout(sw, sh);

    let (cx, cy, cs) = close_btn_rect(panel_x, panel_y);
    if hit_rect(cx, cy, cs, cs, px, py) {
        S.with(|c| c.borrow_mut().open = false);
        return true;
    }
    for row in 0..row_count() {
        let (rx, ry, rw, rh) = row_rect(panel_x, panel_y, row);
        if hit_rect(rx, ry, rw, rh, px, py) {
            S.with(|c| c.borrow_mut().selected = row as i32);
            craft_row(row);
            return true;
        }
    }
    hit_rect(panel_x, panel_y, panel_w, panel_h, px, py)
}

/// Intercept toggle / nav / craft / close input. Returns true if consumed.
pub fn handle_event(e: &sapp::Event, player: Option<PlayerHandle>) -> bool {
    S.with(|c| c.borrow_mut().player = player);

    if is_open() {
        if e._type == sapp::EventType::MouseMove {
            S.with(|c| {
                let s = &mut *c.borrow_mut();
                s.mouse_x = e.mouse_x;
                s.mouse_y = e.mouse_y;
            });
        } else if (e._type == sapp::EventType::TouchesBegan
            || e._type == sapp::EventType::TouchesMoved)
            && e.num_touches > 0
        {
            S.with(|c| {
                let s = &mut *c.borrow_mut();
                s.mouse_x = e.touches[0].pos_x;
                s.mouse_y = e.touches[0].pos_y;
            });
        }
        if e._type == sapp::EventType::MouseDown && e.mouse_button == sapp::Mousebutton::Left {
            return handle_click(e.mouse_x, e.mouse_y);
        }
        if e._type == sapp::EventType::TouchesBegan && e.num_touches > 0 {
            if handle_click(e.touches[0].pos_x, e.touches[0].pos_y) {
                return true;
            }
        }
    }

    if e._type != sapp::EventType::KeyDown {
        return false;
    }
    match e.key_code {
        sapp::Keycode::B => {
            let now_open = S.with(|c| {
                let s = &mut *c.borrow_mut();
                s.open = !s.open;
                s.open
            });
            if now_open {
                /* Mutually exclusive with the inventory overlay - only
                 * one survival panel up at a time so their inputs and
                 * sdtx text never overlap. */
                crate::inventory_screen::close();
                crate::rocket_screen::close();
                release_pointer();
            }
            true
        }
        sapp::Keycode::Escape => {
            if is_open() {
                S.with(|c| c.borrow_mut().open = false);
                return true;
            }
            false
        }
        sapp::Keycode::Up => {
            if !is_open() {
                return false;
            }
            S.with(|c| {
                let s = &mut *c.borrow_mut();
                if s.selected > 0 {
                    s.selected -= 1;
                }
            });
            true
        }
        sapp::Keycode::Down => {
            if !is_open() {
                return false;
            }
            let n = row_count() as i32;
            S.with(|c| {
                let s = &mut *c.borrow_mut();
                if s.selected + 1 < n {
                    s.selected += 1;
                }
            });
            true
        }
        sapp::Keycode::Enter | sapp::Keycode::Space => {
            if !is_open() {
                return false;
            }
            let idx = S.with(|c| c.borrow().selected) as usize;
            craft_row(idx);
            true
        }
        _ => false,
    }
}

fn draw_text_at(x: f32, y: f32, scale: f32, r: u8, g: u8, b: u8, text: &str) {
    let cell_px = 8.0 * scale;
    let (sw, sh) = screen_sizef();
    sdtx::canvas(sw / scale, sh / scale);
    sdtx::font(1);
    sdtx::origin(x / cell_px, y / cell_px);
    sdtx::color3b(r, g, b);
    sdtx::home();
    sdtx::puts(text);
    sdtx::font(0);
}

pub fn draw() {
    if !is_open() {
        /* Closed: nothing to draw. The old "[B] craft" sdtx hint printed
         * at an undefined cursor and only showed under F2; discoverability
         * belongs in the inventory/crafting menu, not a stray HUD line. */
        return;
    }

    let (w, h) = screen_sizef();
    sgl::defaults();
    sgl::matrix_mode_projection();
    sgl::load_identity();
    sgl::ortho(0.0, w, h, 0.0, -1.0, 1.0);
    sgl::matrix_mode_modelview();
    sgl::load_identity();
    let pip = mobile_ui::alpha_pipeline();
    if pip.id == 0 {
        sdtx::color3b(0xff, 0xff, 0xff);
        sdtx::puts("[craft] (drawing pipeline not ready yet)\n");
        return;
    }
    sgl::load_pipeline(pip);

    let (panel_x, panel_y, panel_w, panel_h) = compute_layout(w, h);
    let (mouse_x, mouse_y, sel) = S.with(|c| {
        let s = c.borrow();
        (s.mouse_x, s.mouse_y, s.selected)
    });

    /* Backdrop + panel + border, same palette family as the other menus. */
    mobile_ui::draw_rect(0.0, 0.0, w, h, 0.02, 0.03, 0.07, 0.55);
    mobile_ui::draw_rect(panel_x, panel_y, panel_w, panel_h, 0.10, 0.12, 0.18, 0.96);
    mobile_ui::draw_rect_outline(panel_x, panel_y, panel_w, panel_h, 2.0, 0.85, 0.90, 1.00, 1.0);
    mobile_ui::draw_rect(panel_x, panel_y + TITLE_H - 2.0, panel_w, 2.0, 0.85, 0.90, 1.00, 0.50);

    let (cx, cy, cs) = close_btn_rect(panel_x, panel_y);
    let close_hover = hit_rect(cx, cy, cs, cs, mouse_x, mouse_y);
    let ca = if close_hover { 0.85 } else { 0.55 };
    mobile_ui::draw_rect(cx, cy, cs, cs, 0.45, 0.10, 0.12, ca);
    mobile_ui::draw_rect_outline(cx, cy, cs, cs, 1.5, 1.00, 0.55, 0.55, 0.95);

    let flags = affordable_flags();

    /* Row backgrounds (selected / hovered highlight). */
    for row in 0..row_count() {
        let (rx, ry, rw, rh) = row_rect(panel_x, panel_y, row);
        let selected = row as i32 == sel;
        let hovered = hit_rect(rx, ry, rw, rh, mouse_x, mouse_y);
        let (fr, fg, fb, fa) = if selected {
            (0.20, 0.24, 0.16, 0.95)
        } else if hovered {
            (0.16, 0.18, 0.24, 0.90)
        } else {
            (0.13, 0.15, 0.20, 0.80)
        };
        mobile_ui::draw_rect(rx, ry, rw, rh, fr, fg, fb, fa);
        if selected {
            mobile_ui::draw_rect_outline(rx, ry, rw, rh, 1.5, 0.95, 0.85, 0.45, 0.95);
        }
    }

    /* Text layer. Title names the surface (a station shows its own verb). */
    let title = if cur_station().is_some() { "SMELT" } else { "CRAFT" };
    draw_text_at(panel_x + 16.0, panel_y + 12.0, 3.0, 0xff, 0xff, 0xff, title);
    draw_text_at(
        panel_x + 16.0,
        panel_y + TITLE_H - 16.0,
        1.5,
        0xa0,
        0xa8,
        0xc0,
        "click a recipe to craft - green = ready",
    );
    draw_text_at(cx + 7.0, cy + 5.0, 2.0, 0xff, 0xff, 0xff, "X");

    for (row, r) in cur_recipes().iter().take(row_count()).enumerate() {
        let (rx, ry, _rw, _rh) = row_rect(panel_x, panel_y, row);
        let ready = flags.get(row).copied().unwrap_or(false);
        let (tr, tg, tb) = if ready { (0x66, 0xff, 0x88) } else { (0x88, 0x88, 0x90) };
        draw_text_at(rx + 8.0, ry + 6.0, 1.75, tr, tg, tb, &recipe_label(r));
    }

    /* Footer: what the player currently holds, so it's obvious why a
     * recipe row is green or grey. Reads the bag (mined drops + crafted
     * output) via the unified core item table. Capped so a long list
     * can't overflow the panel. */
    let summary = S.with(|c| {
        c.borrow().player.as_ref().map(|p| {
            let p = p.borrow();
            let mut parts: Vec<String> = Vec::new();
            for s in p.bag.slots.iter() {
                if s.count == 0 || parts.len() >= 8 {
                    continue;
                }
                let name = items::def(s.item).map(|d| d.name).unwrap_or("?");
                parts.push(format!("{} x{}", name, s.count));
            }
            parts
        })
    });
    let line = match summary {
        Some(parts) if !parts.is_empty() => format!("HAVE: {}", parts.join(", ")),
        _ => "HAVE: nothing yet - mine wood and ore to gather resources".to_string(),
    };
    draw_text_at(panel_x + 16.0, panel_y + panel_h - 18.0, 1.25, 0xb0, 0xc0, 0xe0, &line);
}

#[cfg(test)]
mod test_doubles {
    use std::cell::Cell;
    thread_local! {
        pub static SCREEN: Cell<(f32, f32)> = const { Cell::new((1280.0, 720.0)) };
    }
    pub fn screen_sizef() -> (f32, f32) {
        SCREEN.with(|c| c.get())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::inventory::{self, InvSlot};
    use sapp::{Event, EventType, Keycode, Mousebutton};
    use tenebris_core::blocks::Block;
    use tenebris_core::crafting::parse_recipes;
    use tenebris_core::items::PLANK;

    const SRC: &str = "\
[planks]
out: plank 4
in: log 1
[sticks]
out: stick 4
in: plank 2
";

    fn key(t: EventType, k: Keycode) -> Event {
        let mut e = Event { _type: t, ..Default::default() };
        e.key_code = k;
        e
    }

    fn click(x: f32, y: f32) -> Event {
        let mut e = Event { _type: EventType::MouseDown, ..Default::default() };
        e.mouse_button = Mousebutton::Left;
        e.mouse_x = x;
        e.mouse_y = y;
        e
    }

    fn player_with_logs(n: i32) -> PlayerHandle {
        let mut pc = PlayerCtrl::default();
        inventory::init_empty(&mut pc.inventory);
        pc.inventory.slots[1] = InvSlot::block(Block::Wood, n);
        Rc::new(RefCell::new(pc))
    }

    fn setup() {
        init();
        crafting::set_recipes(parse_recipes(SRC, "t"));
    }

    #[test]
    fn b_key_toggles_open_and_close() {
        setup();
        assert!(!is_open());
        assert!(handle_event(&key(EventType::KeyDown, Keycode::B), None));
        assert!(is_open());
        assert!(handle_event(&key(EventType::KeyDown, Keycode::Escape), None));
        assert!(!is_open());
    }

    #[test]
    fn enter_crafts_selected_recipe() {
        setup();
        let p = player_with_logs(3);
        handle_event(&key(EventType::KeyDown, Keycode::B), Some(p.clone()));
        // row 0 = planks; Enter crafts it
        assert!(handle_event(&key(EventType::KeyDown, Keycode::Enter), Some(p.clone())));
        assert_eq!(p.borrow().bag.count_of(PLANK), 4);
        assert_eq!(p.borrow().inventory.slots[1].count, 2); // one log spent
    }

    #[test]
    fn click_on_planks_row_crafts_it() {
        setup();
        let p = player_with_logs(1);
        handle_event(&key(EventType::KeyDown, Keycode::B), Some(p.clone()));
        let (sw, sh) = screen_sizef();
        let (px, py, _, _) = compute_layout(sw, sh);
        let (rx, ry, rw, rh) = row_rect(px, py, 0);
        assert!(handle_event(&click(rx + rw * 0.5, ry + rh * 0.5), Some(p.clone())));
        assert_eq!(p.borrow().bag.count_of(PLANK), 4);
    }

    #[test]
    fn affordable_flags_track_inventory() {
        setup();
        let p = player_with_logs(0); // no logs
        set_player(Some(p.clone()));
        let flags = affordable_flags();
        assert_eq!(flags.len(), 2);
        assert!(!flags[0], "planks not affordable without logs");

        let p2 = player_with_logs(1);
        set_player(Some(p2));
        assert!(affordable_flags()[0], "planks affordable with a log");
    }
}
