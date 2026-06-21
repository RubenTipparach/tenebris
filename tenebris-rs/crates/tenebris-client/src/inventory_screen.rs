//! Port of `tenebris-c/src/client/inventory_screen.{c,h}`.
//!
//! The full-screen inventory + crafting + equipment + skills overlay
//! opened by pressing `E`. Built on top of pixel_ui so the chrome
//! (panel, title, tab bar, slots, buttons) matches the mockups in
//! crafting.md exactly. Equipment + Skills tabs render disabled
//! buttons today - they're surfaced as future destinations, not
//! working screens yet.
//!
//! # Renames (PORTING.md rule 4 - `inventory_screen_` prefix dropped)
//!
//! - `inventory_screen_init()`     -> `inventory_screen::init()`
//! - `inventory_screen_toggle()`   -> `inventory_screen::toggle()`
//! - `inventory_screen_is_open()`  -> `inventory_screen::is_open()`
//! - `inventory_screen_event()`    -> `inventory_screen::event()`
//! - `inventory_screen_draw()`     -> `inventory_screen::draw()`
//! - `inventory_screen_note_e_tap_in_space()`
//!                                 -> `inventory_screen::note_e_tap_in_space()`
//! - `inventory_screen_draw_hint()`-> `inventory_screen::draw_hint()`
//!
//! # sokol boundary (testability)
//!
//! - [`compute_layout`] is pure - the desktop / mobile presets pin
//!   headless.
//! - The Shift+E hint state machine is factored into [`HintState`]
//!   with an injected clock so the tap-count / show / cool-down
//!   windows pin without sokol_time.

#![allow(dead_code)]

use sokol::app as sapp;
use sokol::debugtext as sdtx;
use sokol::time as stm;

use std::cell::RefCell;

use tenebris_core::blocks::{face_tile, Block, FaceCap};

use crate::hex_mesher::HEX_ATLAS_U_STEP;
use crate::inventory::{
    InvSlot, Inventory, ItemId, INV_CRAFT_COLS, INV_CRAFT_ROWS, INV_CRAFT_SLOTS, INV_HOTBAR_SLOTS,
    INV_MAIN_COLS, INV_MAIN_SLOTS,
};
use crate::item_atlas;
use crate::mobile_ui;
use crate::pixel_ui::{self, ButtonState, SlotState};
use crate::renderer;

/* ----------------------------------------------------------------------- */
/* Layout. Two presets: a full-sized desktop layout that matches the
 * geometry in tools/gen-ui-mockups.py, and a compact mobile layout
 * that fits a ~360 wide screen. compute_layout() picks one based on
 * screen width every frame so a window resize flips presets live. */

/// Port of the file-local `layout_t`.
#[derive(Clone, Copy, Debug, PartialEq)]
pub(crate) struct Layout {
    pub panel_w: i32,
    pub panel_h: i32,
    pub title_bar_h: i32,
    pub tab_w: i32,
    pub tab_h: i32,
    pub tab_gap: i32,
    pub slot_px: i32,
    pub slot_gap: i32,
    /// inset between panel edge + content
    pub pad: i32,
    /// tab-row y offset inside the panel
    pub tab_y: i32,
    /// gap between tab row + content area
    pub content_pad_y: i32,
    pub mobile: bool,
}

/// Port of `compute_layout()`.
pub(crate) fn compute_layout(screen_w: f32, screen_h: f32) -> Layout {
    /* 900 px is the threshold: above it the desktop sizes fit
     * comfortably with margin, below it we hit the compact preset
     * which sizes slots + tabs to whatever the phone width allows. */
    let mobile = screen_w < 900.0;
    let mut l = if mobile {
        let panel_w = screen_w as i32 - 16;
        let pad = 8;
        let slot_gap = 3;
        let tab_gap = 4;

        /* Slot size on mobile is constrained by the 9-slot hotbar -
         * the widest row. Pick the largest slot that still fits the
         * hotbar inside the panel after padding + gaps, then clamp
         * to 22..40 so tiny phones stay tappable and huge phablets
         * don't get clown-shoes-sized cells. */
        let hb_budget = panel_w - 2 * pad - 8 * slot_gap;
        let slot_px = (hb_budget / 9).clamp(22, 40);

        /* Tab bar shrinks to whatever lets 4 tabs fit the panel width
         * after pad+gap. Same idea as the hotbar - the row is the
         * constraint, not a fixed number. */
        let tab_budget = panel_w - 2 * pad - 3 * tab_gap;
        let tab_w = (tab_budget / 4).max(56);

        Layout {
            panel_w,
            panel_h: screen_h as i32 - 16,
            title_bar_h: 24,
            tab_w,
            tab_h: 28,
            tab_gap,
            slot_px,
            slot_gap,
            pad,
            tab_y: 46,
            content_pad_y: 12,
            mobile,
        }
    } else {
        Layout {
            panel_w: 1040,
            panel_h: 560,
            title_bar_h: 32,
            tab_w: 200,
            tab_h: 36,
            tab_gap: 12,
            slot_px: 36,
            slot_gap: 6,
            pad: 20,
            tab_y: 64,
            content_pad_y: 16,
            mobile,
        }
    };
    if l.panel_w > screen_w as i32 - 16 {
        l.panel_w = screen_w as i32 - 16;
    }
    if l.panel_h > screen_h as i32 - 16 {
        l.panel_h = screen_h as i32 - 16;
    }
    l
}

/* Tab order. The active tab is rendered with the hover sprite via
 * ButtonState::Active; disabled tabs show the greyed sprite and
 * swallow clicks. The .1 (enabled) flag controls which destinations
 * are reachable today - extend the enabled set as those screens land. */
const TAB_INVENTORY: usize = 0;
const TAB_CRAFTING: usize = 1;
const TAB_EQUIPMENT: usize = 2;
const TAB_SKILLS: usize = 3;
const TAB_COUNT: usize = 4;

const TABS: [(&str, bool); TAB_COUNT] = [
    ("INVENTORY", true),
    ("CRAFTING", true),
    ("EQUIPMENT", false),
    ("SKILLS", false),
];

/* ----------------------------------------------------------------------- */
/* Shift+E hint state machine (pure; clock injected). e_tap_count +
 * e_last_tap_sec measure "tapped E recently in space"; once the count
 * crosses the threshold the toast becomes visible until
 * hint_until_sec, then gets suppressed until hint_suppress_until_sec
 * so we don't re-fire every frame the player keeps mashing. */

#[derive(Default, Debug)]
pub(crate) struct HintState {
    pub(crate) e_tap_count: i32,
    pub(crate) e_last_tap_sec: f64,
    pub(crate) hint_until_sec: f64,
    pub(crate) hint_suppress_until_sec: f64,
}

impl HintState {
    /// Port of `inventory_screen_note_e_tap_in_space()` body.
    pub(crate) fn note_tap_at(&mut self, now: f64) {
        /* Already showing the hint, or inside the cool-down after a
         * previous show - skip the count update so we don't spam the
         * toast while it's already up. */
        if now < self.hint_suppress_until_sec {
            return;
        }

        /* Reset the run if the last tap was more than a beat ago - we
         * only want to react to "deliberate repeated mashing". */
        if now - self.e_last_tap_sec > 1.5 {
            self.e_tap_count = 0;
        }
        self.e_tap_count += 1;
        self.e_last_tap_sec = now;

        if self.e_tap_count >= 3 {
            self.hint_until_sec = now + 4.0;
            /* 4 s of visible toast + 8 s cool-down so the player has a
             * chance to read it and try again without immediate
             * re-fire. */
            self.hint_suppress_until_sec = now + 12.0;
            self.e_tap_count = 0;
        }
    }

    /// The visibility gate at the top of `inventory_screen_draw_hint()`.
    pub(crate) fn visible_at(&self, now: f64) -> bool {
        now < self.hint_until_sec
    }
}

/* ----------------------------------------------------------------------- */

struct InvScreen {
    open: bool,
    active: usize,

    /* Unique id strings for pixel_ui's hot/active tracking. Filled at
     * init (the C snprintf's into fixed buffers); passed by &str to
     * pixel_ui::slot / button calls each frame. */
    id_tab: Vec<String>,
    id_main: Vec<String>,
    id_hotbar: Vec<String>,
    id_craft: Vec<String>,
    id_craft_output: String,
    id_craft_button: String,

    hint: HintState,

    /* Cursor position in pixels, tracked from sapp events so the held
     * drag stack can be drawn following the mouse. */
    mouse_x: f32,
    mouse_y: f32,
}

impl Default for InvScreen {
    fn default() -> Self {
        InvScreen {
            open: false,
            active: TAB_INVENTORY,
            id_tab: Vec::new(),
            id_main: Vec::new(),
            id_hotbar: Vec::new(),
            id_craft: Vec::new(),
            id_craft_output: String::new(),
            id_craft_button: String::new(),
            hint: HintState::default(),
            mouse_x: 0.0,
            mouse_y: 0.0,
        }
    }
}

thread_local! {
    static G: RefCell<InvScreen> = RefCell::new(InvScreen::default());
}

/// Port of `inventory_screen_init()`. Depends on pixel_ui::init +
/// item_atlas::init having already run; app.rs wires the order.
pub fn init() {
    G.with(|cell| {
        let mut g = cell.borrow_mut();
        g.active = TAB_INVENTORY;
        g.id_tab = (0..TAB_COUNT).map(|i| format!("invscr_tab_{}", i)).collect();
        g.id_main = (0..INV_MAIN_SLOTS).map(|i| format!("invscr_main_{}", i)).collect();
        g.id_hotbar = (0..INV_HOTBAR_SLOTS).map(|i| format!("invscr_hb_{}", i)).collect();
        g.id_craft = (0..INV_CRAFT_SLOTS).map(|i| format!("invscr_cr_{}", i)).collect();
        g.id_craft_output = "invscr_cr_out".to_string();
        g.id_craft_button = "invscr_cr_btn".to_string();
    });
}

/// Port of `inventory_screen_toggle()`. Wired to the `E` key (and the
/// mobile DOM button) in app.rs.
pub fn toggle() {
    G.with(|cell| {
        let mut g = cell.borrow_mut();
        g.open = !g.open;
        /* Release pointer lock + show the cursor so the player can
         * actually click slots and tabs. Both the E key path and the
         * mobile DOM button reach this function, so the mouse-release
         * lives here once instead of being duplicated at every caller.
         * We never auto-re-lock on close - the browser requires a user
         * gesture for sapp_lock_mouse(true) anyway, and the natural
         * "click the canvas to re-engage" gesture handles it. */
        if g.open {
            sapp::lock_mouse(false);
            sapp::show_mouse(true);
        }
    });
}

/// Port of `inventory_screen_is_open()`.
pub fn is_open() -> bool {
    G.with(|cell| cell.borrow().open)
}

/// Force the overlay closed (e.g. when the craft panel or the pause
/// modal takes over).
pub fn close() {
    G.with(|cell| cell.borrow_mut().open = false);
}

/// Port of `inventory_screen_event()`. Forward every sapp event while
/// the overlay is open so movement / mouse-look events get swallowed
/// instead of leaking through to the player controller. Returns true
/// when the event was consumed (the caller should NOT then pass it on
/// to the input layer).
pub fn event(e: &sapp::Event) -> bool {
    G.with(|cell| {
        let mut g = cell.borrow_mut();
        if !g.open {
            return false;
        }

        /* Track the cursor so the held drag stack can follow it. */
        match e._type {
            sapp::EventType::MouseMove
            | sapp::EventType::MouseDown
            | sapp::EventType::MouseUp => {
                g.mouse_x = e.mouse_x;
                g.mouse_y = e.mouse_y;
            }
            sapp::EventType::TouchesBegan | sapp::EventType::TouchesMoved => {
                if e.num_touches > 0 {
                    g.mouse_x = e.touches[0].pos_x;
                    g.mouse_y = e.touches[0].pos_y;
                }
            }
            _ => {}
        }

        /* Escape closes the overlay. */
        if e._type == sapp::EventType::KeyDown && e.key_code == sapp::Keycode::Escape {
            g.open = false;
            return true;
        }

        /* While open, eat every event so nothing leaks through to the
         * player controller behind the panel (no camera rotation on
         * mouse-move, no block break on click, no movement on WASD).
         * Mouse positions still reach pixel_ui because app.rs pumps
         * pixel_ui::event AFTER inventory_screen::event returns true. */
        true
    })
}

/* ----------------------------------------------------------------------- */
/* Slot rendering helper. Picks the right atlas + UV for a slot
 * (block icons sample the terrain atlas, item icons sample the item
 * atlas, empty slots paint just the frame). */

/// An empty slot, for clearing during drag moves.
const EMPTY: InvSlot = InvSlot::block(Block::Air, 0);

/// Atlas view/sampler, UV rect, and display count for a slot's icon.
/// Shared by the hit-tested slot draw and the floating cursor draw so
/// both render an item identically.
fn slot_icon_params(s: &InvSlot) -> (u32, u32, f32, f32, f32, f32, i32) {
    let mut view = 0u32;
    let mut samp = 0u32;
    let (mut u0, mut v0, mut u1, mut v1) = (0.0f32, 0.0f32, 1.0f32, 1.0f32);
    let mut count = 0;

    if s.count > 0 {
        if s.item_id != ItemId::None {
            /* Item icon - sample the item atlas. */
            if let Some((iu0, iv0, iu1, iv1)) = item_atlas::uv(s.item_id) {
                u0 = iu0;
                v0 = iv0;
                u1 = iu1;
                v1 = iv1;
                view = item_atlas::view_id();
                samp = item_atlas::sampler_id();
            }
            count = s.count;
        } else if s.block_type != Block::Air {
            /* Block icon - sample the terrain atlas one column wide. */
            let col = face_tile(s.block_type, FaceCap::Top) as i32;
            u0 = col as f32 * HEX_ATLAS_U_STEP;
            u1 = (col + 1) as f32 * HEX_ATLAS_U_STEP;
            v0 = 0.0;
            v1 = 1.0;
            view = renderer::atlas_view_id();
            samp = renderer::atlas_sampler_id();
            count = s.count;
        }
    }

    /* Suppress the count badge in two cases the hotbar already
     * handles the same way: creative-mode "infinite" stacks
     * (>9000), and singleton tool items where a "1" badge would
     * just be noise. The badge is useful for stackable resources. */
    let mut display_count = count;
    if display_count > 9000 {
        display_count = 0;
    }
    if count == 1 && s.item_id >= ItemId::Pickaxe && s.item_id <= ItemId::ProspectingAxe {
        display_count = 0;
    }
    (view, samp, u0, v0, u1, v1, display_count)
}

/// Port of `draw_slot_for()`. Returns whether the slot was clicked this
/// frame so the caller can run the drag (pick up / place) logic.
fn draw_slot_for(s: &InvSlot, id: &str, x: i32, y: i32, w: i32, h: i32, state: SlotState) -> bool {
    let (view, samp, u0, v0, u1, v1, display_count) = slot_icon_params(s);
    pixel_ui::slot(id, x, y, w, h, view, samp, u0, v0, u1, v1, display_count, state)
}

/// Draw a stack as the floating "held" cursor item: icon + count only,
/// no slot frame and (crucially) NO hit-test. Hit-testing here would
/// steal pixel_ui's single active widget from the slot underneath and
/// break click-to-place.
fn draw_cursor_stack(s: &InvSlot, x: i32, y: i32, w: i32, h: i32) {
    let (view, samp, u0, v0, u1, v1, display_count) = slot_icon_params(s);
    pixel_ui::slot_ghost(x, y, w, h, view, samp, u0, v0, u1, v1, display_count);
}

/// True when two slots hold the same kind, so a held stack merges onto
/// a matching slot instead of swapping.
fn same_kind(a: &InvSlot, b: &InvSlot) -> bool {
    if a.item_id != ItemId::None || b.item_id != ItemId::None {
        a.item_id == b.item_id
    } else {
        a.block_type == b.block_type
    }
}

/// Minecraft left-click semantics between the held cursor stack and a
/// clicked slot: an empty cursor picks the slot up; a held stack drops
/// into an empty slot, merges onto a matching one, or swaps otherwise.
fn apply_slot_click(cursor: &mut InvSlot, slot: &mut InvSlot) {
    if cursor.count <= 0 {
        *cursor = *slot;
        *slot = EMPTY;
    } else if slot.count <= 0 {
        *slot = *cursor;
        *cursor = EMPTY;
    } else if same_kind(cursor, slot) {
        slot.count += cursor.count;
        *cursor = EMPTY;
    } else {
        std::mem::swap(cursor, slot);
    }
}

/// Return a held stack to the bag (first empty hotbar then main slot)
/// when the screen closes, so it isn't stranded on the hidden cursor.
fn stash_cursor(inv: &mut Inventory) {
    let held = inv.cursor;
    if held.count <= 0 {
        inv.cursor = EMPTY;
        return;
    }
    for i in 0..INV_HOTBAR_SLOTS {
        if inv.slots[i].count <= 0 {
            inv.slots[i] = held;
            inv.cursor = EMPTY;
            return;
        }
    }
    for i in 0..INV_MAIN_SLOTS {
        if inv.main[i].count <= 0 {
            inv.main[i] = held;
            inv.cursor = EMPTY;
            return;
        }
    }
    /* No room anywhere - keep it on the cursor for the next open. */
}

/* ----------------------------------------------------------------------- */
/* Tab content draws. */

/// Port of `draw_inventory_tab()`.
#[allow(clippy::too_many_arguments)]
fn draw_inventory_tab(
    g: &InvScreen,
    inv: &mut Inventory,
    panel_x: i32,
    panel_y: i32,
    panel_w: i32,
    panel_h: i32,
    content_y: i32,
    l: &Layout,
) {
    /* Main inventory grid.
     *
     * Desktop: 10 cols x 5 rows fits the bag (50 slots) with a wide
     * panel.
     *
     * Mobile: 6 cols x 9 rows. The 9-slot hotbar is the width
     * constraint, so the main grid uses the same slot_px but fewer
     * columns - the rows just stack taller. */
    let cols = if l.mobile { 6 } else { INV_MAIN_COLS as i32 };
    let rows = (INV_MAIN_SLOTS as i32 + cols - 1) / cols;
    let grid_w = cols * l.slot_px + (cols - 1) * l.slot_gap;
    let grid_x = panel_x + (panel_w - grid_w) / 2;
    let grid_y = content_y + if l.mobile { 12 } else { 30 };

    for idx in 0..INV_MAIN_SLOTS {
        let r = idx as i32 / cols;
        let c = idx as i32 % cols;
        if r >= rows {
            break;
        }
        let sx = grid_x + c * (l.slot_px + l.slot_gap);
        let sy = grid_y + r * (l.slot_px + l.slot_gap);
        if draw_slot_for(&inv.main[idx], &g.id_main[idx], sx, sy, l.slot_px, l.slot_px, SlotState::Normal) {
            apply_slot_click(&mut inv.cursor, &mut inv.main[idx]);
        }
    }

    /* HOTBAR label + 9-slot row below the main grid. The selected
     * hotbar slot keeps the gold accent so the player can confirm
     * what's currently in their hand without leaving the screen. */
    let hb_cols = INV_HOTBAR_SLOTS as i32;
    let hb_w = hb_cols * l.slot_px + (hb_cols - 1) * l.slot_gap;
    let hb_x = panel_x + (panel_w - hb_w) / 2;
    let hb_y = grid_y + rows * (l.slot_px + l.slot_gap) + if l.mobile { 18 } else { 36 };
    pixel_ui::label(hb_x, hb_y - 12, "HOTBAR");

    for c in 0..INV_HOTBAR_SLOTS {
        let sx = hb_x + c as i32 * (l.slot_px + l.slot_gap);
        let state = if c as i32 == inv.selected { SlotState::Selected } else { SlotState::Normal };
        if draw_slot_for(&inv.slots[c], &g.id_hotbar[c], sx, hb_y, l.slot_px, l.slot_px, state) {
            apply_slot_click(&mut inv.cursor, &mut inv.slots[c]);
        }
    }

    if !l.mobile {
        pixel_ui::label(
            panel_x + 20,
            panel_y + panel_h - 22,
            "DRAG TO MOVE  /  E CLOSES  /  TAB SWITCHES SCREEN",
        );
    }
}

/// Port of `draw_crafting_tab()`.
#[allow(clippy::too_many_arguments)]
fn draw_crafting_tab(
    g: &InvScreen,
    inv: &mut Inventory,
    panel_x: i32,
    panel_y: i32,
    panel_w: i32,
    panel_h: i32,
    content_y: i32,
    l: &Layout,
) {
    /* Split: left half = compact inventory, right half = 3x3 craft
     * grid + output. Mirrors the layout in the crafting mockup. */
    let gap_between = if l.mobile { 8 } else { 20 };
    let half_w = (panel_w - 2 * l.pad - gap_between) / 2;
    let left_x = panel_x + l.pad;
    let right_x = panel_x + l.pad + half_w + gap_between;
    let split_y = content_y;

    pixel_ui::label(left_x, split_y, "INVENTORY");
    pixel_ui::label(right_x, split_y, "CRAFTING");

    /* ---- Left: compact inventory + hotbar. ----
     * 4 cols x 6 rows of the main grid (24 slots); the rest is
     * reachable via the scroll affordance the design doc calls out
     * (sprites exist; no scroll behaviour yet). Hotbar below uses
     * the same slot size so the eye reads them as one bag. */
    let cols = 4;
    let rows = 6;
    let grid_w = cols * l.slot_px + (cols - 1) * l.slot_gap;
    let grid_h = rows * l.slot_px + (rows - 1) * l.slot_gap;
    let grid_x = left_x + (half_w - grid_w) / 2;
    let grid_y = split_y + if l.mobile { 14 } else { 30 };

    for r in 0..rows {
        for c in 0..cols {
            let idx = (r * cols + c) as usize;
            if idx >= INV_MAIN_SLOTS {
                break;
            }
            let sx = grid_x + c * (l.slot_px + l.slot_gap);
            let sy = grid_y + r * (l.slot_px + l.slot_gap);
            if draw_slot_for(&inv.main[idx], &g.id_main[idx], sx, sy, l.slot_px, l.slot_px, SlotState::Normal) {
                apply_slot_click(&mut inv.cursor, &mut inv.main[idx]);
            }
        }
    }

    /* Hotbar row.
     *   Desktop: centred under the left half so the 9 slots stay
     *     flush against the compact inventory grid above them.
     *   Mobile: spans the full panel width below the split halves,
     *     because the 9 slots don't fit inside the narrow left half
     *     of a phone screen. */
    let hb_cols = INV_HOTBAR_SLOTS as i32;
    let hb_w = hb_cols * l.slot_px + (hb_cols - 1) * l.slot_gap;
    let hb_x = if l.mobile {
        panel_x + (panel_w - hb_w) / 2
    } else {
        left_x + (half_w - hb_w) / 2
    };
    let hb_y = if l.mobile {
        panel_y + panel_h - l.pad - l.slot_px
    } else {
        grid_y + grid_h + 30
    };
    pixel_ui::label(hb_x, hb_y - 12, "HOTBAR");

    for c in 0..INV_HOTBAR_SLOTS {
        let sx = hb_x + c as i32 * (l.slot_px + l.slot_gap);
        let state = if c as i32 == inv.selected { SlotState::Selected } else { SlotState::Normal };
        if draw_slot_for(&inv.slots[c], &g.id_hotbar[c], sx, hb_y, l.slot_px, l.slot_px, state) {
            apply_slot_click(&mut inv.cursor, &mut inv.slots[c]);
        }
    }

    /* ---- Right: 3x3 personal crafting grid + output. ----
     * Recipe matching isn't wired up yet; click handling on the
     * craft slots is the next chunk to land. */
    let cr_cols = INV_CRAFT_COLS as i32;
    let cr_rows = INV_CRAFT_ROWS as i32;
    let cr_w = cr_cols * l.slot_px + (cr_cols - 1) * l.slot_gap;
    let cr_h = cr_rows * l.slot_px + (cr_rows - 1) * l.slot_gap;
    let cr_x = right_x + if l.mobile { 4 } else { 20 };
    let cr_y = split_y + if l.mobile { 26 } else { 50 };

    pixel_ui::label(cr_x, cr_y - 14, "INGREDIENTS");
    for r in 0..cr_rows {
        for c in 0..cr_cols {
            let idx = (r * cr_cols + c) as usize;
            let sx = cr_x + c * (l.slot_px + l.slot_gap);
            let sy = cr_y + r * (l.slot_px + l.slot_gap);
            if draw_slot_for(&inv.craft[idx], &g.id_craft[idx], sx, sy, l.slot_px, l.slot_px, SlotState::Normal) {
                apply_slot_click(&mut inv.cursor, &mut inv.craft[idx]);
            }
        }
    }

    /* Arrow + output slot to the right of the 3x3 grid.
     * On mobile we drop the arrow under the grid (vertical) so the
     * output slot can sit below; on desktop it stays inline. */
    if l.mobile {
        let out_x = cr_x + (cr_w - l.slot_px) / 2;
        let out_y = cr_y + cr_h + 12;
        pixel_ui::label(out_x - 4, out_y - 12, "OUTPUT");
        draw_slot_for(
            &inv.craft_output,
            &g.id_craft_output,
            out_x,
            out_y,
            l.slot_px,
            l.slot_px,
            SlotState::Normal,
        );
        let btn_w = (l.slot_px * 3) + (l.slot_gap * 2);
        let btn_y = out_y + l.slot_px + 10;
        pixel_ui::button(&g.id_craft_button, cr_x, btn_y, btn_w, l.tab_h, "CRAFT", ButtonState::Disabled);
    } else {
        let arrow_x = cr_x + cr_w + 16;
        let arrow_y = cr_y + (cr_h / 2) - 8;
        pixel_ui::label(arrow_x, arrow_y, ">");

        let out_x = arrow_x + 24;
        let out_y = cr_y + (cr_h - l.slot_px) / 2;
        pixel_ui::label(out_x - 4, out_y - 18, "OUTPUT");
        draw_slot_for(
            &inv.craft_output,
            &g.id_craft_output,
            out_x,
            out_y,
            l.slot_px,
            l.slot_px,
            SlotState::Normal,
        );

        let btn_y = cr_y + cr_h + 40;
        pixel_ui::button(&g.id_craft_button, cr_x, btn_y, 160, 36, "CRAFT", ButtonState::Disabled);
    }

    if !l.mobile {
        pixel_ui::label(
            right_x + 20,
            panel_y + panel_h - 22,
            "PLACE ITEMS IN THE 3X3 GRID TO CRAFT",
        );
    }
}

/* ----------------------------------------------------------------------- */

/// Port of `inventory_screen_draw()`. Per-frame draw call; no-op when
/// the overlay isn't open.
pub fn draw(inv: &mut Inventory) {
    if !is_open() {
        /* Closed while holding a stack: return it to the bag so it
         * isn't stranded on the hidden cursor. No-op when nothing held. */
        stash_cursor(inv);
        return;
    }

    let sw = sapp::widthf();
    let sh = sapp::heightf();
    if sw <= 0.0 || sh <= 0.0 {
        return;
    }

    /* Dim backdrop so the world reads as paused. Drawn first via
     * mobile_ui's untextured rect helper - the pixel_ui begin() below
     * stays on its own sgl pipeline. */
    mobile_ui::draw_rect(0.0, 0.0, sw, sh, 0.0, 0.0, 0.0, 0.55);

    pixel_ui::begin();

    let l = compute_layout(sw, sh);
    let panel_x = (sw as i32 - l.panel_w) / 2;
    let panel_y = (sh as i32 - l.panel_h) / 2;

    pixel_ui::panel(panel_x, panel_y, l.panel_w, l.panel_h);

    /* Title bar centred along the top of the panel. */
    let bar_x = panel_x + l.pad;
    let bar_y = panel_y + l.pad / 2;
    let bar_w = l.panel_w - 2 * l.pad;
    pixel_ui::title_bar(bar_x, bar_y, bar_w, l.title_bar_h);

    G.with(|cell| {
        /* The widget calls below re-enter pixel_ui's own state, not
         * ours - a shared borrow for the id strings is enough. */
        let mut g = cell.borrow_mut();

        /* Title text - uses the active tab's label so the header stays
         * in sync with what's below. */
        let title = TABS[g.active].0;
        pixel_ui::label(bar_x + 10, bar_y + (l.title_bar_h - 8) / 2, title);

        /* Tab bar centred under the title. The active tab uses the
         * hover sprite via ButtonState::Active; disabled tabs (the
         * not-yet-implemented destinations) show the greyed sprite. */
        let tab_total = TAB_COUNT as i32 * l.tab_w + (TAB_COUNT as i32 - 1) * l.tab_gap;
        let tab_x0 = panel_x + (l.panel_w - tab_total) / 2;
        let tab_y = panel_y + l.tab_y;
        for i in 0..TAB_COUNT {
            let st = if !TABS[i].1 {
                ButtonState::Disabled
            } else if i == g.active {
                ButtonState::Active
            } else {
                ButtonState::Normal
            };

            let x = tab_x0 + i as i32 * (l.tab_w + l.tab_gap);
            if pixel_ui::button(&g.id_tab[i], x, tab_y, l.tab_w, l.tab_h, TABS[i].0, st)
                && TABS[i].1
            {
                g.active = i;
            }
        }

        let content_y = tab_y + l.tab_h + l.content_pad_y;

        match g.active {
            TAB_INVENTORY => {
                draw_inventory_tab(&g, inv, panel_x, panel_y, l.panel_w, l.panel_h, content_y, &l)
            }
            TAB_CRAFTING => {
                draw_crafting_tab(&g, inv, panel_x, panel_y, l.panel_w, l.panel_h, content_y, &l)
            }
            /* Unreachable - disabled tabs swallow clicks. */
            _ => {}
        }

        /* The held stack rides the cursor, drawn last (on top) with no
         * frame and no hit-test. */
        if inv.cursor.count > 0 {
            let cw = l.slot_px;
            let cx = g.mouse_x as i32 - cw / 2;
            let cy = g.mouse_y as i32 - cw / 2;
            draw_cursor_stack(&inv.cursor, cx, cy, cw, cw);
        }
    });

    pixel_ui::end();
}

/* ----------------------------------------------------------------------- */
/* Shift+E hint. In space the `E` key is roll-right, so opening the
 * inventory needs Shift+E. A player who came in from a planet surface
 * (where plain E opens it) often taps E a few times in space before
 * realising. app.rs calls note_e_tap_in_space() each time that
 * happens; if the player taps a few times in quick succession, the
 * next draw_hint() paints a transient toast for ~4 seconds, then
 * suppresses re-fires for a cool-down so we don't nag every frame. */

/// Port of `inventory_screen_note_e_tap_in_space()`.
pub fn note_e_tap_in_space() {
    let now = stm::sec(stm::now());
    G.with(|cell| cell.borrow_mut().hint.note_tap_at(now));
}

/// Port of `inventory_screen_draw_hint()`.
pub fn draw_hint() {
    let now = stm::sec(stm::now());
    if !G.with(|cell| cell.borrow().hint.visible_at(now)) {
        return;
    }

    const MSG: &str = "PRESS SHIFT+E TO OPEN INVENTORY IN SPACE";

    let w = sapp::widthf();
    let h = sapp::heightf();
    if w <= 0.0 || h <= 0.0 {
        return;
    }

    /* 8 px per glyph at sdtx scale 1. Centre the line horizontally
     * and place it just under the reticle so it doesn't crowd the
     * hotbar. */
    let char_w = 8.0f32;
    let text_w = char_w * MSG.len() as f32;
    let text_x = (w - text_w) * 0.5;
    let text_y = h * 0.42;

    /* Backdrop strip for readability over varied scene colours. */
    mobile_ui::draw_rect(text_x - 12.0, text_y - 4.0, text_w + 24.0, 16.0, 0.0, 0.0, 0.0, 0.75);

    sdtx::canvas(w, h);
    sdtx::origin(0.0, 0.0);
    sdtx::color3b(0xff, 0xe0, 0x40); /* gold accent from the UI palette */
    sdtx::pos(text_x / 8.0, text_y / 8.0);
    sdtx::puts(MSG);
}

/* ----------------------------------------------------------------------- */

#[cfg(test)]
mod tests {
    use super::*;

    /* -- layout presets ------------------------------------------------ */

    #[test]
    fn desktop_layout_pinned() {
        let l = compute_layout(1280.0, 720.0);
        assert!(!l.mobile);
        assert_eq!(l.panel_w, 1040);
        assert_eq!(l.panel_h, 560);
        assert_eq!(l.title_bar_h, 32);
        assert_eq!(l.tab_w, 200);
        assert_eq!(l.tab_h, 36);
        assert_eq!(l.tab_gap, 12);
        assert_eq!(l.slot_px, 36);
        assert_eq!(l.slot_gap, 6);
        assert_eq!(l.pad, 20);
        assert_eq!(l.tab_y, 64);
        assert_eq!(l.content_pad_y, 16);
    }

    #[test]
    fn desktop_panel_clamps_to_small_window() {
        /* A 1000-wide desktop window (>= 900 keeps the desktop preset)
         * clamps the 1040 panel to width - 16. */
        let l = compute_layout(1000.0, 500.0);
        assert!(!l.mobile);
        assert_eq!(l.panel_w, 984);
        assert_eq!(l.panel_h, 484);
    }

    #[test]
    fn mobile_layout_pinned_for_412_phone() {
        let l = compute_layout(412.0, 731.0);
        assert!(l.mobile);
        assert_eq!(l.panel_w, 396); /* 412 - 16 */
        assert_eq!(l.panel_h, 715);
        /* hb_budget = 396 - 16 - 24 = 356; 356 / 9 = 39 (in 22..40). */
        assert_eq!(l.slot_px, 39);
        /* tab_budget = 396 - 16 - 12 = 368; 368 / 4 = 92 (>= 56). */
        assert_eq!(l.tab_w, 92);
        assert_eq!(l.tab_h, 28);
        assert_eq!(l.pad, 8);
        assert_eq!(l.slot_gap, 3);
        assert_eq!(l.tab_y, 46);
    }

    #[test]
    fn mobile_slot_clamps() {
        /* Tiny phone: slots floor at 22 so they stay tappable. */
        let l = compute_layout(200.0, 400.0);
        assert_eq!(l.slot_px, 22);
        assert_eq!(l.tab_w, 56); /* tab floor */
        /* Wide phablet just under the desktop threshold: cap at 40. */
        let l = compute_layout(899.0, 500.0);
        assert!(l.mobile);
        assert_eq!(l.slot_px, 40);
    }

    #[test]
    fn threshold_is_900() {
        assert!(compute_layout(899.9, 600.0).mobile);
        assert!(!compute_layout(900.0, 600.0).mobile);
    }

    /* -- hint state machine --------------------------------------------- */

    #[test]
    fn three_quick_taps_fire_the_hint() {
        let mut h = HintState::default();
        h.note_tap_at(10.0);
        h.note_tap_at(10.5);
        assert!(!h.visible_at(10.6));
        h.note_tap_at(11.0);
        /* Fires: visible for 4 s, suppressed for 12 s, count reset. */
        assert!(h.visible_at(11.0));
        assert!(h.visible_at(14.999));
        assert!(!h.visible_at(15.0));
        assert_eq!(h.e_tap_count, 0);
        assert_eq!(h.hint_suppress_until_sec, 23.0);
    }

    #[test]
    fn slow_taps_reset_the_run() {
        let mut h = HintState::default();
        h.note_tap_at(10.0);
        h.note_tap_at(10.5);
        /* > 1.5 s gap resets the count: this tap becomes #1 again. */
        h.note_tap_at(12.1);
        assert_eq!(h.e_tap_count, 1);
        h.note_tap_at(12.5);
        assert!(!h.visible_at(12.5));
        h.note_tap_at(12.9);
        assert!(h.visible_at(12.9));
    }

    #[test]
    fn taps_during_cooldown_are_ignored() {
        let mut h = HintState::default();
        h.note_tap_at(1.0);
        h.note_tap_at(1.2);
        h.note_tap_at(1.4); /* fires; suppressed until 13.4 */
        /* Mashing during show + cool-down neither extends the toast
         * nor accumulates count. */
        h.note_tap_at(2.0);
        h.note_tap_at(2.1);
        h.note_tap_at(2.2);
        h.note_tap_at(2.3);
        assert_eq!(h.e_tap_count, 0);
        assert_eq!(h.hint_until_sec, 5.4);
        assert!(!h.visible_at(6.0));
        /* After the cool-down, taps count again - but the > 1.5 s gap
         * rule starts the run fresh. */
        h.note_tap_at(13.5);
        assert_eq!(h.e_tap_count, 1);
    }

    /* -- tab table -------------------------------------------------------- */

    #[test]
    fn tab_table_matches_c() {
        assert_eq!(TABS[TAB_INVENTORY], ("INVENTORY", true));
        assert_eq!(TABS[TAB_CRAFTING], ("CRAFTING", true));
        assert_eq!(TABS[TAB_EQUIPMENT], ("EQUIPMENT", false));
        assert_eq!(TABS[TAB_SKILLS], ("SKILLS", false));
    }
}
