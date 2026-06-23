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

use crate::persistence;
use crate::player_ctrl::PlayerCtrl;
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

    /* Snapshot non-empty chest + bag stacks for display (read-only borrow
     * dropped before any mutation). */
    let chest_rows: Vec<(usize, u16, u16)> = {
        let w = world.borrow();
        w.block_entities
            .get(tile, depth)
            .and_then(|e| e.chest().copied())
            .map(|c| {
                c.iter()
                    .enumerate()
                    .filter(|(_, s)| s.count > 0)
                    .map(|(i, s)| (i, s.item, s.count))
                    .collect()
            })
            .unwrap_or_default()
    };
    let bag_rows: Vec<(usize, u16, u16)> = {
        let p = player.borrow();
        p.bag
            .slots
            .iter()
            .enumerate()
            .filter(|(_, s)| s.count > 0)
            .map(|(i, s)| (i, s.item, s.count))
            .collect()
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
                egui::RichText::new("Chest - click a stack to take it")
                    .color(egui::Color32::from_rgb(0xc8, 0xd0, 0xe0)),
            );
            if chest_rows.is_empty() {
                ui.label(egui::RichText::new("(empty)").weak());
            }
            for (idx, item, count) in &chest_rows {
                let name = items::def(*item).map(|d| d.name).unwrap_or("?");
                if ui.add_sized([240.0, 22.0], egui::Button::new(format!("{name}  x{count}"))).clicked() {
                    withdraw = Some(*idx);
                }
            }
            ui.separator();
            ui.label(
                egui::RichText::new("Your bag - click a stack to store it")
                    .color(egui::Color32::from_rgb(0xa8, 0xc8, 0xa0)),
            );
            if bag_rows.is_empty() {
                ui.label(egui::RichText::new("(empty)").weak());
            }
            for (idx, item, count) in &bag_rows {
                let name = items::def(*item).map(|d| d.name).unwrap_or("?");
                if ui.add_sized([240.0, 22.0], egui::Button::new(format!("{name}  x{count}"))).clicked() {
                    deposit = Some(*idx);
                }
            }
            ui.separator();
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
