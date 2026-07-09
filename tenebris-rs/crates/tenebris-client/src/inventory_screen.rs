//! Inventory overlay (egui), opened with `E`.
//!
//! Originally a port of `tenebris-c/src/client/inventory_screen.{c,h}`;
//! the legacy pixel_ui panel (tabs + 50-slot main grid + 3x3 craft
//! grid) is gone. What the screen shows now depends on the mode:
//!
//! - **Survival**: the player's real holdings only - the bag (tools,
//!   food, resources; core item ids) and the hotbar (placeable blocks
//!   with real stack counts) - plus the hand-craft recipe panel.
//!   Clicking a bag stack that holds a placeable block equips it into
//!   the selected hotbar slot (the slot's previous stack goes back to
//!   the bag).
//! - **Creative**: a count-less block palette. Clicking a palette entry
//!   assigns that block to the selected hotbar slot; nothing has a
//!   stack count and nothing is consumed on placement.
//!
//! This module still owns the open/close/event plumbing and the
//! "Shift+E in space" hint toast:
//!
//! - `inventory_screen_toggle()`   -> `inventory_screen::toggle()`
//! - `inventory_screen_is_open()`  -> `inventory_screen::is_open()`
//! - `inventory_screen_event()`    -> `inventory_screen::event()`
//! - `inventory_screen_note_e_tap_in_space()`
//!                                 -> `inventory_screen::note_e_tap_in_space()`
//! - `inventory_screen_draw_hint()`-> `inventory_screen::draw_hint()`

#![allow(dead_code)]

use sokol::app as sapp;
use sokol::debugtext as sdtx;
use sokol::time as stm;

use std::cell::RefCell;

use tenebris_core::blocks::Block;
use tenebris_core::items;

use crate::inventory::{InvSlot, INV_HOTBAR_SLOTS};
use crate::mobile_ui;

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
    hint: HintState,
}

impl Default for InvScreen {
    fn default() -> Self {
        InvScreen { open: false, hint: HintState::default() }
    }
}

thread_local! {
    static G: RefCell<InvScreen> = RefCell::new(InvScreen::default());
}

/// Port of `inventory_screen_toggle()`. Wired to the `E` key (and the
/// mobile DOM button) in app.rs.
pub fn toggle() {
    G.with(|cell| {
        let mut g = cell.borrow_mut();
        g.open = !g.open;
        /* Release pointer lock + show the cursor so the player can
         * actually click slots. Both the E key path and the mobile DOM
         * button reach this function, so the mouse-release lives here
         * once instead of being duplicated at every caller. We never
         * auto-re-lock on close - the browser requires a user gesture
         * for sapp_lock_mouse(true) anyway, and the natural "click the
         * canvas to re-engage" gesture handles it. */
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

        /* Escape closes the overlay. */
        if e._type == sapp::EventType::KeyDown && e.key_code == sapp::Keycode::Escape {
            g.open = false;
            return true;
        }

        /* While open, eat every event so nothing leaks through to the
         * player controller behind the panel (no camera rotation on
         * mouse-move, no block break on click, no movement on WASD).
         * Mouse positions still reach egui because app.rs pumps the
         * egui layer's event feed before this returns. */
        true
    })
}

/* ===================================================================== */
/* egui overlay.                                                          */

use crate::player_ctrl::PlayerCtrl;
use std::rc::Rc;

pub type PlayerHandle = Rc<RefCell<PlayerCtrl>>;

thread_local! {
    static PLAYER: RefCell<Option<PlayerHandle>> = const { RefCell::new(None) };
}

/// Provide the player handle the egui overlay reads/mutates (called each
/// frame from the egui dispatch, like the other survival screens).
pub fn set_player(p: Option<PlayerHandle>) {
    PLAYER.with(|c| *c.borrow_mut() = p);
}

const EGUI_SLOT_PX: f32 = 42.0;
/* Bag rows line up with the 9-slot hotbar below them (18 slots = 2
 * clean rows), so the two grids read as one column-aligned bag. */
const BAG_COLS: usize = INV_HOTBAR_SLOTS;
const PALETTE_COLS: usize = 7;

/// The creative palette: every placeable block, in build-menu order.
/// World-gen-internal variants (Seq* biome tints, Moon, Bedrock) stay
/// out - they exist for the terrain generator, not the build menu.
const CREATIVE_PALETTE: &[Block] = &[
    Block::Torch,
    Block::Stone,
    Block::Dirt,
    Block::Grass,
    Block::Sand,
    Block::Snow,
    Block::Ice,
    Block::Water,
    Block::Wood,
    Block::Leaves,
    Block::DirtGrass,
    Block::DirtSnow,
    Block::CoalOre,
    Block::CopperOre,
    Block::TinOre,
    Block::IronOre,
    Block::Furnace,
    Block::ElectricFurnace,
    Block::Printer3D,
    Block::Computer,
    Block::ElectronicsWorkbench,
    Block::HydroGenerator,
    Block::SteamEngine,
    Block::StorageChest,
    Block::LaunchPad,
    Block::LaunchTower,
    Block::Cable,
    Block::CopperPipe,
];

/// One hotbar cell: framed slot + block thumbnail. `show_count` is on in
/// survival (real stacks) and off in creative (count-less palette).
fn egui_slot(ui: &mut egui::Ui, s: &InvSlot, selected: bool, show_count: bool) -> egui::Response {
    let size = egui::vec2(EGUI_SLOT_PX, EGUI_SLOT_PX);
    let (rect, resp) = ui.allocate_exact_size(size, egui::Sense::click());
    let p = ui.painter();
    let bg = if selected {
        egui::Color32::from_rgb(0x3c, 0x46, 0x5a)
    } else if resp.hovered() {
        egui::Color32::from_rgb(0x3a, 0x40, 0x4e)
    } else {
        egui::Color32::from_rgb(0x26, 0x2a, 0x33)
    };
    p.rect_filled(rect, 3.0, bg);
    let (bw, bc) = if selected {
        (2.0, egui::Color32::from_rgb(0xc8, 0xb0, 0x50))
    } else {
        (1.0, egui::Color32::from_rgb(0x4a, 0x50, 0x5e))
    };
    p.rect_stroke(rect, 3.0, egui::Stroke::new(bw, bc), egui::StrokeKind::Inside);
    if s.block_type != Block::Air && s.count > 0 {
        let shown = if show_count { s.count.clamp(0, u16::MAX as i32) as u16 } else { 1 };
        crate::ui_icons::draw_icon(p, s.block_type as u16, shown, rect.shrink(4.0));
    }
    resp
}

/// The 9-slot hotbar row; returns the slot clicked this frame (if any).
fn hotbar_row(
    ui: &mut egui::Ui,
    hotbar: &[InvSlot; INV_HOTBAR_SLOTS],
    selected: i32,
    show_counts: bool,
) -> Option<usize> {
    let mut clicked = None;
    egui::Grid::new("inv_hotbar").spacing(egui::vec2(3.0, 3.0)).show(ui, |ui| {
        for (i, s) in hotbar.iter().enumerate() {
            if egui_slot(ui, s, i as i32 == selected, show_counts).clicked() {
                clicked = Some(i);
            }
        }
    });
    clicked
}

fn heading(ui: &mut egui::Ui, text: &str, rgb: (u8, u8, u8)) {
    ui.label(
        egui::RichText::new(text)
            .strong()
            .color(egui::Color32::from_rgb(rgb.0, rgb.1, rgb.2)),
    );
}

fn hint_label(ui: &mut egui::Ui, text: &str) {
    ui.label(
        egui::RichText::new(text).small().color(egui::Color32::from_rgb(0x90, 0x98, 0xa8)),
    );
}

/// Draw the inventory overlay and apply this frame's click.
pub fn egui_ui(ctx: &egui::Context) {
    if !is_open() {
        return;
    }
    let Some(player) = PLAYER.with(|c| c.borrow().clone()) else {
        return;
    };

    let (hotbar, selected, survival, bag_slots) = {
        let p = player.borrow();
        let bag: Vec<(u16, u16)> = p.bag.slots.iter().map(|s| (s.item, s.count)).collect();
        (p.inventory.slots, p.inventory.selected, p.survival_mode, bag)
    };

    let mut click_bag: Option<usize> = None;
    let mut click_palette: Option<Block> = None;
    let mut click_hotbar: Option<usize> = None;
    let mut toggle_mode = false;
    let mut do_close = false;
    /* Mode switching is an SP concern - MP is always survival. */
    let can_toggle_mode = crate::menu::state() == crate::menu::GameState::InGameSp;

    egui::Window::new("Inventory")
        .collapsible(false)
        .resizable(false)
        /* Anchor near the top so the panel never covers the HUD hotbar
         * (toolbar) along the bottom edge of the screen. */
        .anchor(egui::Align2::CENTER_TOP, egui::vec2(0.0, 24.0))
        .show(ctx, |ui| {
            /* ---- Mode line: Creative/Sandbox <-> Survival ---- */
            ui.horizontal(|ui| {
                let (label, col) = if survival {
                    ("Mode: Survival", egui::Color32::from_rgb(0x7a, 0xc8, 0x88))
                } else {
                    ("Mode: Creative / Sandbox", egui::Color32::from_rgb(0xe0, 0xc8, 0x60))
                };
                let text = egui::RichText::new(label).strong().color(col);
                if can_toggle_mode {
                    if ui.button(text).clicked() {
                        toggle_mode = true;
                    }
                    hint_label(
                        ui,
                        if survival {
                            "gather + craft to build (click to switch, also G)"
                        } else {
                            "unlimited blocks, no counts (click to switch, also G)"
                        },
                    );
                } else {
                    ui.label(text);
                }
            });
            /* NOT ui.separator(): inside an auto-sized window a bare
             * separator expands to the max available rect on the first
             * layout pass and the window then sizes to include it -
             * that pinned this panel at full screen width + height,
             * covering the HUD hotbar. Fixed spacing keeps the window
             * content-sized. */
            ui.add_space(8.0);

            if survival {
                /* ---- Survival: bag + hotbar (real counts) + craft ---- */
                ui.horizontal_top(|ui| {
                    ui.vertical(|ui| {
                        heading(ui, "Bag", (0xc8, 0xd0, 0xe0));
                        egui::Grid::new("inv_bag").spacing(egui::vec2(3.0, 3.0)).show(ui, |ui| {
                            for (i, &(item, count)) in bag_slots.iter().enumerate() {
                                let resp = crate::ui_icons::slot(
                                    ui,
                                    item,
                                    count,
                                    EGUI_SLOT_PX,
                                    None,
                                );
                                if resp.clicked() && count > 0 {
                                    click_bag = Some(i);
                                }
                                if (i + 1) % BAG_COLS == 0 {
                                    ui.end_row();
                                }
                            }
                        });
                        ui.add_space(8.0);
                        heading(ui, "Hotbar", (0xa8, 0xc8, 0xa0));
                        click_hotbar = hotbar_row(ui, &hotbar, selected, true);
                        ui.add_space(4.0);
                        hint_label(
                            ui,
                            "Click a block stack in the bag to equip it into the \
                             selected hotbar slot. R eats food.",
                        );
                    });

                    ui.add_space(14.0); /* see the separator note above */

                    ui.vertical(|ui| {
                        heading(ui, "Craft", (0xe0, 0xd0, 0x90));
                        crate::crafting_screen::hand_craft_panel(ui, &player);
                    });
                });
            } else {
                /* ---- Creative: count-less block palette + hotbar ---- */
                heading(ui, "Blocks", (0xc8, 0xd0, 0xe0));
                egui::Grid::new("inv_palette").spacing(egui::vec2(3.0, 3.0)).show(ui, |ui| {
                    for (i, &b) in CREATIVE_PALETTE.iter().enumerate() {
                        let cell = InvSlot::block(b, 1);
                        let assigned = hotbar[selected.clamp(0, 8) as usize].block_type == b;
                        if egui_slot(ui, &cell, assigned, false).clicked() {
                            click_palette = Some(b);
                        }
                        if (i + 1) % PALETTE_COLS == 0 {
                            ui.end_row();
                        }
                    }
                });
                ui.add_space(8.0);
                heading(ui, "Hotbar", (0xa8, 0xc8, 0xa0));
                click_hotbar = hotbar_row(ui, &hotbar, selected, false);
                ui.add_space(4.0);
                hint_label(
                    ui,
                    "Pick a hotbar slot, then click a block to assign it. \
                     Placement is free - no counts in creative.",
                );
            }

            ui.add_space(4.0);
            if ui.button("Close").clicked() {
                do_close = true;
            }
        });

    /* Mode toggle: flip survival/creative and re-stock the hotbar to
     * match (same effect as the G key). Mutually exclusive with slot
     * clicks this frame since the inventory is about to be replaced. */
    if toggle_mode {
        let mut p = player.borrow_mut();
        p.survival_mode = !p.survival_mode;
        if p.survival_mode {
            p.hunger = crate::player_ctrl::MAX_HUNGER;
            crate::inventory::init_empty(&mut p.inventory);
        } else {
            crate::inventory::init_creative(&mut p.inventory);
        }
        return;
    }

    if let Some(i) = click_bag {
        /* Survival equip: a bag stack that holds a placeable block swaps
         * with the selected hotbar slot; whatever was in the hotbar slot
         * goes back into that bag slot (as its item id). Non-block items
         * (tools, food) live in the bag - clicking them is a no-op. */
        let mut p = player.borrow_mut();
        let sel = p.inventory.selected.clamp(0, INV_HOTBAR_SLOTS as i32 - 1) as usize;
        let stack = p.bag.slots[i];
        if let Some(b) = items::to_block(stack.item) {
            if stack.count > 0 {
                let old = p.inventory.slots[sel];
                p.inventory.slots[sel] = InvSlot::block(b, stack.count as i32);
                p.bag.slots[i] = if old.block_type != Block::Air && old.count > 0 {
                    items::ItemStack {
                        item: items::from_block(old.block_type),
                        count: old.count.clamp(0, u16::MAX as i32) as u16,
                    }
                } else {
                    items::ItemStack::default()
                };
            }
        }
    } else if let Some(b) = click_palette {
        /* Creative assign: the palette block takes over the selected
         * hotbar slot. Count 1 = "assigned"; placement never consumes. */
        let mut p = player.borrow_mut();
        let sel = p.inventory.selected.clamp(0, INV_HOTBAR_SLOTS as i32 - 1) as usize;
        p.inventory.slots[sel] = InvSlot::block(b, 1);
    } else if let Some(i) = click_hotbar {
        player.borrow_mut().inventory.selected = i as i32;
    }

    if do_close {
        close();
    }
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

    /* -- creative palette -------------------------------------------------- */

    #[test]
    fn palette_has_no_dupes_and_no_air() {
        for (i, a) in CREATIVE_PALETTE.iter().enumerate() {
            assert_ne!(*a, Block::Air);
            for b in &CREATIVE_PALETTE[i + 1..] {
                assert_ne!(*a, *b, "duplicate palette entry {:?}", a);
            }
        }
        /* Every default creative hotbar block is reachable from the
         * palette, so a cleared slot can always be re-assigned. */
        let mut inv = crate::inventory::Inventory::default();
        crate::inventory::init_creative(&mut inv);
        for s in &inv.slots {
            assert!(
                CREATIVE_PALETTE.contains(&s.block_type),
                "{:?} missing from palette",
                s.block_type
            );
        }
    }
}
