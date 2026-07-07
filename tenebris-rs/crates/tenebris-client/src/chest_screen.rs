//! Storage-chest UI (egui).
//!
//! Port of the JS `StorageChest` interaction: E on a placed chest opens a
//! panel showing the chest's 27 slots and the player's bag; clicking a
//! chest slot withdraws that stack to the bag, clicking a bag stack
//! deposits it into the chest. The chest contents live in the world's
//! block-entity store (core), so the same state is shared by SP and MP and
//! persists same-frame.

use std::cell::RefCell;
use std::rc::Rc;

use sokol::app as sapp;

use crate::egui_layer;
use crate::persistence;
use crate::player_ctrl::PlayerCtrl;
use crate::ui_icons;
use tenebris_core::block_entity;
use tenebris_core::items;
use tenebris_core::world::World;

pub type PlayerHandle = Rc<RefCell<PlayerCtrl>>;
pub type WorldHandle = Rc<RefCell<World>>;

struct ChestScreen {
    open: bool,
    tile: i32,
    depth: i32,
    world: Option<WorldHandle>,
    player: Option<PlayerHandle>,
}

thread_local! {
    static S: RefCell<ChestScreen> = RefCell::new(ChestScreen {
        open: false,
        tile: -1,
        depth: -1,
        world: None,
        player: None,
    });
}

pub fn is_open() -> bool {
    S.with(|c| c.borrow().open)
}

pub fn close() {
    S.with(|c| c.borrow_mut().open = false);
}

/// Open the chest panel for the placed chest at (tile, depth).
pub fn open(world: WorldHandle, player: PlayerHandle, tile: i32, depth: i32) {
    S.with(|c| {
        let s = &mut *c.borrow_mut();
        s.open = true;
        s.tile = tile;
        s.depth = depth;
        s.world = Some(world);
        s.player = Some(player);
    });
    /* One survival panel up at a time. */
    crate::inventory_screen::close();
    crate::crafting_screen::close();
    crate::rocket_screen::close();
    release_pointer();
}

#[cfg(not(test))]
fn release_pointer() {
    sapp::lock_mouse(false);
    sapp::show_mouse(true);
}
#[cfg(test)]
fn release_pointer() {}

/// Esc closes the chest. Returns true if consumed.
pub fn handle_event(e: &sapp::Event) -> bool {
    if !is_open() {
        return false;
    }
    if e._type == sapp::EventType::KeyDown && e.key_code == sapp::Keycode::Escape {
        close();
        return true;
    }
    false
}

/// SP-only same-frame persistence of the store after a chest edit (mirrors
/// interact's sp_save_tile_after_edit gate).
fn persist(w: &World) {
    if crate::menu::state() != crate::menu::GameState::InGameSp {
        return;
    }
    let name = crate::menu::active_world();
    if name.is_empty() {
        return;
    }
    persistence::save_block_entities(&name, w.body.id as u32, &w.block_entities);
}

const SLOT_PX: f32 = 44.0;
const GRID_COLS: usize = 9;

/// Draw one inventory slot: a framed cell with the item thumbnail (from the
/// `ui_icons` atlas) and a stack-count badge. Returns its click Response.
fn slot_widget(ui: &mut egui::Ui, item: u16, count: u16) -> egui::Response {
    let size = egui::vec2(SLOT_PX, SLOT_PX);
    let (rect, resp) = ui.allocate_exact_size(size, egui::Sense::click());
    let p = ui.painter();
    let bg = if resp.hovered() {
        egui::Color32::from_rgb(0x3a, 0x40, 0x4e)
    } else {
        egui::Color32::from_rgb(0x26, 0x2a, 0x33)
    };
    p.rect_filled(rect, 3.0, bg);
    p.rect_stroke(
        rect,
        3.0,
        egui::Stroke::new(1.0, egui::Color32::from_rgb(0x4a, 0x50, 0x5e)),
        egui::StrokeKind::Inside,
    );
    if count > 0 {
        if let Some([u0, v0, u1, v1]) = ui_icons::uv(item) {
            let uv = egui::Rect::from_min_max(egui::pos2(u0, v0), egui::pos2(u1, v1));
            p.image(egui_layer::ICON_TEX, rect.shrink(5.0), uv, egui::Color32::WHITE);
        } else {
            // No icon yet: a coloured chip so the slot still reads as full.
            p.rect_filled(rect.shrink(10.0), 2.0, egui::Color32::from_rgb(0x88, 0x88, 0x90));
        }
        if count > 1 {
            p.text(
                rect.max - egui::vec2(3.0, 1.0),
                egui::Align2::RIGHT_BOTTOM,
                count.to_string(),
                egui::FontId::proportional(13.0),
                egui::Color32::WHITE,
            );
        }
    }
    resp
}

/// Draw `slots` as a grid of thumbnails; returns the index clicked (if any
/// non-empty slot was clicked this frame).
fn slot_grid(ui: &mut egui::Ui, id: &str, slots: &[(u16, u16)]) -> Option<usize> {
    let mut clicked = None;
    egui::Grid::new(id).spacing(egui::vec2(3.0, 3.0)).show(ui, |ui| {
        for (i, &(item, count)) in slots.iter().enumerate() {
            if slot_widget(ui, item, count).clicked() && count > 0 {
                clicked = Some(i);
            }
            if (i + 1) % GRID_COLS == 0 {
                ui.end_row();
            }
        }
    });
    clicked
}

/// Draw the chest panel and apply any click this frame.
pub fn egui_ui(ctx: &egui::Context) {
    if !is_open() {
        return;
    }
    let (world, player, tile, depth) = S.with(|c| {
        let s = c.borrow();
        (s.world.clone(), s.player.clone(), s.tile, s.depth)
    });
    let (Some(world), Some(player)) = (world, player) else {
        return;
    };

    /* Snapshot every slot (incl. empty) so the panel draws a full grid -
     * chest (27) and bag, read-only borrows dropped before any mutation. */
    let chest_slots: Vec<(u16, u16)> = {
        let w = world.borrow();
        match w.block_entities.get(tile, depth).and_then(|e| e.chest().copied()) {
            Some(c) => c.iter().map(|s| (s.item, s.count)).collect(),
            None => vec![(0, 0); block_entity::CHEST_SLOTS],
        }
    };
    let bag_slots: Vec<(u16, u16)> = {
        let p = player.borrow();
        p.bag.slots.iter().map(|s| (s.item, s.count)).collect()
    };

    let mut withdraw: Option<usize> = None;
    let mut deposit: Option<usize> = None;
    let mut do_close = false;

    egui::Window::new("Storage Chest")
        .collapsible(false)
        .resizable(false)
        .anchor(egui::Align2::CENTER_CENTER, egui::Vec2::ZERO)
        .show(ctx, |ui| {
            ui.label(
                egui::RichText::new("Chest")
                    .color(egui::Color32::from_rgb(0xc8, 0xd0, 0xe0))
                    .strong(),
            );
            if slot_grid(ui, "chest", &chest_slots).map(|i| withdraw = Some(i)).is_some() {}
            ui.add_space(6.0);
            ui.label(
                egui::RichText::new("Bag")
                    .color(egui::Color32::from_rgb(0xa8, 0xc8, 0xa0))
                    .strong(),
            );
            if slot_grid(ui, "bag", &bag_slots).map(|i| deposit = Some(i)).is_some() {}
            ui.add_space(4.0);
            if ui.button("Close").clicked() {
                do_close = true;
            }
        });

    if let Some(slot) = withdraw {
        let mut w = world.borrow_mut();
        let mut p = player.borrow_mut();
        if let Some(e) = w.block_entities.get_mut(tile, depth) {
            let chest = e.chest_mut();
            if let Some((item, count)) = block_entity::chest_take(chest, slot) {
                let leftover = p.bag.add(item, count);
                /* Bag full: put what didn't fit back in the chest. */
                if leftover > 0 {
                    block_entity::chest_add(chest, item, leftover, items::stack_size(item));
                }
            }
        }
        persist(&w);
    } else if let Some(slot) = deposit {
        let mut w = world.borrow_mut();
        let mut p = player.borrow_mut();
        let (item, count) = {
            let s = &p.bag.slots[slot];
            (s.item, s.count)
        };
        if count > 0 {
            let taken = p.bag.take(item, count as u32) as u16;
            let chest = w.block_entities.entry(tile, depth).chest_mut();
            let leftover = block_entity::chest_add(chest, item, taken, items::stack_size(item));
            /* Chest full: return the overflow to the bag. */
            if leftover > 0 {
                p.bag.add(item, leftover);
            }
        }
        persist(&w);
    }

    if do_close {
        close();
    }
}
