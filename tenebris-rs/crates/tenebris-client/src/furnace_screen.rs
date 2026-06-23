//! Furnace UI (egui) - a Minecraft-style smelter.
//!
//! Port of the JS `FurnaceUI`: an input slot + a smelt-progress arrow + an
//! output slot in a row, with a fuel (coal) slot and a fuel bar below.
//! Click a bag stack to load it (ore -> input, coal -> fuel); click a
//! furnace slot to pull its contents back to the bag. An "auto-load"
//! dropdown fills the input from a smeltable stack you hold.
//!
//! The furnace state lives in the core block-entity store and smelts over
//! time on the machine tick; this screen only moves items in/out (and
//! persists those moves same-frame).

use std::cell::RefCell;
use std::rc::Rc;

use sokol::app as sapp;

use crate::persistence;
use crate::player_ctrl::PlayerCtrl;
use crate::ui_icons;
use tenebris_core::block_entity::{self, FUEL_PER_COAL};
use tenebris_core::items;
use tenebris_core::world::World;

pub type PlayerHandle = Rc<RefCell<PlayerCtrl>>;
pub type WorldHandle = Rc<RefCell<World>>;

struct FurnaceScreen {
    open: bool,
    tile: i32,
    depth: i32,
    world: Option<WorldHandle>,
    player: Option<PlayerHandle>,
}

thread_local! {
    static S: RefCell<FurnaceScreen> = RefCell::new(FurnaceScreen {
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

/// Open the furnace panel for the placed furnace at (tile, depth).
pub fn open(world: WorldHandle, player: PlayerHandle, tile: i32, depth: i32) {
    S.with(|c| {
        let s = &mut *c.borrow_mut();
        s.open = true;
        s.tile = tile;
        s.depth = depth;
        s.world = Some(world);
        s.player = Some(player);
    });
    crate::inventory_screen::close();
    crate::crafting_screen::close();
    crate::rocket_screen::close();
    crate::chest_screen::close();
    release_pointer();
}

#[cfg(not(test))]
fn release_pointer() {
    sapp::lock_mouse(false);
    sapp::show_mouse(true);
}
#[cfg(test)]
fn release_pointer() {}

/// Esc closes the furnace. Returns true if consumed.
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

/// What a click this frame asked for.
enum Action {
    LoadInput(u16), // item id from the bag -> input slot
    LoadFuel,       // coal from the bag -> fuel slot
    TakeInput,
    TakeFuel,
    TakeOutput,
}

const SLOT: f32 = 52.0;

/// Draw the furnace panel and apply any click this frame.
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

    let f = {
        let w = world.borrow();
        w.block_entities.get(tile, depth).and_then(|e| e.furnace().copied()).unwrap_or_default()
    };
    let bag_rows: Vec<(u16, u16)> = {
        let p = player.borrow();
        p.bag.slots.iter().map(|s| (s.item, s.count)).collect()
    };
    /* Smeltable stacks the player holds, for the auto-load dropdown. */
    let smeltables: Vec<(u16, u16)> = bag_rows
        .iter()
        .copied()
        .filter(|&(item, count)| count > 0 && items::smelt_output(item).is_some())
        .collect();

    let mut action: Option<Action> = None;
    let mut do_close = false;

    egui::Window::new("Furnace")
        .collapsible(false)
        .resizable(false)
        .anchor(egui::Align2::CENTER_CENTER, egui::Vec2::ZERO)
        .show(ctx, |ui| {
            // Input -> [progress] -> Output row.
            ui.horizontal(|ui| {
                ui.vertical(|ui| {
                    ui.label(egui::RichText::new("Input").weak());
                    if ui_icons::slot(ui, f.input.item, f.input.count, SLOT, None).clicked() {
                        action = Some(Action::TakeInput);
                    }
                });
                ui.add_space(8.0);
                // Smelt-progress arrow.
                let (rect, _) =
                    ui.allocate_exact_size(egui::vec2(64.0, SLOT), egui::Sense::hover());
                let p = ui.painter();
                let cy = rect.center().y;
                let track = egui::Rect::from_min_max(
                    egui::pos2(rect.min.x, cy - 4.0),
                    egui::pos2(rect.max.x, cy + 4.0),
                );
                p.rect_filled(track, 2.0, egui::Color32::from_rgb(0x20, 0x22, 0x29));
                let fill = egui::Rect::from_min_max(
                    track.min,
                    egui::pos2(track.min.x + track.width() * f.progress.clamp(0.0, 1.0), track.max.y),
                );
                p.rect_filled(fill, 2.0, egui::Color32::from_rgb(0xe0, 0xa0, 0x40));
                p.text(
                    egui::pos2(rect.center().x, rect.min.y + 6.0),
                    egui::Align2::CENTER_TOP,
                    "->",
                    egui::FontId::proportional(15.0),
                    egui::Color32::from_rgb(0xc0, 0xc6, 0xd2),
                );
                ui.add_space(8.0);
                ui.vertical(|ui| {
                    ui.label(egui::RichText::new("Output").weak());
                    if ui_icons::slot(ui, f.output.item, f.output.count, SLOT, Some(egui::Color32::from_rgb(0x6e, 0xc0, 0x7a))).clicked() {
                        action = Some(Action::TakeOutput);
                    }
                });
            });
            ui.add_space(8.0);
            // Fuel slot + fuel charge bar.
            ui.horizontal(|ui| {
                ui.vertical(|ui| {
                    ui.label(egui::RichText::new("Fuel (coal)").weak());
                    if ui_icons::slot(ui, f.fuel.item, f.fuel.count, SLOT, Some(egui::Color32::from_rgb(0xe0, 0x80, 0x40))).clicked() {
                        action = Some(Action::TakeFuel);
                    }
                });
                ui.add_space(8.0);
                ui.vertical(|ui| {
                    ui.add_space(18.0);
                    let frac = f.fuel_remaining as f32 / FUEL_PER_COAL as f32;
                    let (rect, _) =
                        ui.allocate_exact_size(egui::vec2(150.0, 12.0), egui::Sense::hover());
                    let p = ui.painter();
                    p.rect_filled(rect, 2.0, egui::Color32::from_rgb(0x20, 0x22, 0x29));
                    let fill = egui::Rect::from_min_max(
                        rect.min,
                        egui::pos2(rect.min.x + rect.width() * frac.clamp(0.0, 1.0), rect.max.y),
                    );
                    p.rect_filled(fill, 2.0, egui::Color32::from_rgb(0xe0, 0x80, 0x40));
                    ui.label(
                        egui::RichText::new(format!("{} smelts left", f.fuel_remaining))
                            .small()
                            .weak(),
                    );
                });
            });

            // Auto-load dropdown.
            ui.add_space(6.0);
            ui.horizontal(|ui| {
                ui.label("Auto-load:");
                egui::ComboBox::from_id_salt("furnace-autoload")
                    .selected_text("pick ore")
                    .show_ui(ui, |ui| {
                        for &(item, count) in &smeltables {
                            let name = items::def(item).map(|d| d.name).unwrap_or("?");
                            if ui.selectable_label(false, format!("{name}  x{count}")).clicked() {
                                action = Some(Action::LoadInput(item));
                            }
                        }
                    });
            });

            ui.separator();
            ui.label(egui::RichText::new("Bag - click ore to smelt, coal to fuel").weak());
            egui::Grid::new("furnace-bag").spacing(egui::vec2(3.0, 3.0)).show(ui, |ui| {
                for (i, &(item, count)) in bag_rows.iter().enumerate() {
                    if ui_icons::slot(ui, item, count, 40.0, None).clicked() && count > 0 {
                        if items::smelt_output(item).is_some() {
                            action = Some(Action::LoadInput(item));
                        } else if items::is_fuel(item) {
                            action = Some(Action::LoadFuel);
                        }
                    }
                    if (i + 1) % 9 == 0 {
                        ui.end_row();
                    }
                }
            });
            ui.add_space(4.0);
            if ui.button("Close").clicked() {
                do_close = true;
            }
        });

    if let Some(act) = action {
        apply(&world, &player, tile, depth, act);
    }
    if do_close {
        close();
    }
}

/// Mutate the furnace + bag for a click, then persist same-frame.
fn apply(world: &WorldHandle, player: &PlayerHandle, tile: i32, depth: i32, act: Action) {
    let mut w = world.borrow_mut();
    let mut p = player.borrow_mut();
    match act {
        Action::LoadInput(item) => {
            let f = w.block_entities.entry(tile, depth).furnace_mut();
            // Only load if the input slot is empty or already this item.
            if f.input.count == 0 || f.input.item == item {
                let cap = items::stack_size(item);
                let room = cap.saturating_sub(f.input.count);
                let take = p.bag.take(item, room as u32) as u16;
                if take > 0 {
                    f.input.item = item;
                    f.input.count += take;
                }
            }
        }
        Action::LoadFuel => {
            let f = w.block_entities.entry(tile, depth).furnace_mut();
            if f.fuel.count == 0 || items::is_fuel(f.fuel.item) {
                let cap = items::stack_size(items::COAL);
                let room = cap.saturating_sub(f.fuel.count);
                let take = p.bag.take(items::COAL, room as u32) as u16;
                if take > 0 {
                    f.fuel.item = items::COAL;
                    f.fuel.count += take;
                }
            }
        }
        Action::TakeInput | Action::TakeFuel | Action::TakeOutput => {
            let f = w.block_entities.entry(tile, depth).furnace_mut();
            let slot = match act {
                Action::TakeInput => &mut f.input,
                Action::TakeFuel => &mut f.fuel,
                _ => &mut f.output,
            };
            if slot.count > 0 {
                let leftover = p.bag.add(slot.item, slot.count);
                if leftover == 0 {
                    *slot = block_entity::ChestSlot::default();
                } else {
                    slot.count = leftover;
                }
            }
        }
    }
    persist(&w);
}
