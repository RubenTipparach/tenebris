//! Bonfire UI (egui) - the flint-tier campfire's cook + fuel panel.
//!
//! Modeled on `furnace_screen`: an input slot -> cook-progress arrow ->
//! output slot, with a fuel slot + a burn bar below. Unlike the furnace the
//! fuel is wood-family (sticks / logs / charcoal / coal) and it burns
//! continuously to stay lit; feed it fuel to keep the fire (and its light)
//! alive. Cooking: raw meat / fish -> cooked, a log -> charcoal.
//!
//! The bonfire state lives in the core block-entity store and cooks / burns
//! on the machine tick; this screen only moves items in/out (persisted
//! same-frame).

use std::cell::RefCell;
use std::rc::Rc;

use sokol::app as sapp;

use crate::persistence;
use crate::player_ctrl::PlayerCtrl;
use crate::ui_icons;
use tenebris_core::block_entity;
use tenebris_core::items;
use tenebris_core::world::World;

pub type PlayerHandle = Rc<RefCell<PlayerCtrl>>;
pub type WorldHandle = Rc<RefCell<World>>;

struct BonfireScreen {
    open: bool,
    tile: i32,
    depth: i32,
    world: Option<WorldHandle>,
    player: Option<PlayerHandle>,
}

thread_local! {
    static S: RefCell<BonfireScreen> = RefCell::new(BonfireScreen {
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

/// Open the bonfire panel for the placed bonfire at (tile, depth).
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
    crate::furnace_screen::close();
    release_pointer();
}

#[cfg(not(test))]
fn release_pointer() {
    sapp::lock_mouse(false);
    sapp::show_mouse(true);
}
#[cfg(test)]
fn release_pointer() {}

/// Esc closes the bonfire. Returns true if consumed.
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
    LoadInput(u16),
    LoadFuel(u16),
    TakeInput,
    TakeFuel,
    TakeOutput,
}

const SLOT: f32 = 52.0;

/// Draw the bonfire panel and apply any click this frame.
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

    let b = {
        let w = world.borrow();
        w.block_entities.get(tile, depth).and_then(|e| e.bonfire().copied()).unwrap_or_default()
    };
    let bag_rows: Vec<(u16, u16)> = {
        let p = player.borrow();
        p.bag.slots.iter().map(|s| (s.item, s.count)).collect()
    };
    let cookables: Vec<(u16, u16)> = bag_rows
        .iter()
        .copied()
        .filter(|&(item, count)| count > 0 && items::smelt_output(item).is_some())
        .collect();

    let cfg = tenebris_core::config::bonfire();
    let mut action: Option<Action> = None;
    let mut do_close = false;

    egui::Window::new("Bonfire")
        .collapsible(false)
        .resizable(false)
        .anchor(egui::Align2::CENTER_CENTER, egui::Vec2::ZERO)
        .show(ctx, |ui| {
            let status = if b.lit() {
                format!("Lit - {}s of fuel left", b.burn_s.max(0.0) as u32)
            } else {
                "Out - add sticks or logs to light it".to_string()
            };
            ui.label(egui::RichText::new(status).color(if b.lit() {
                egui::Color32::from_rgb(0xe0, 0x90, 0x40)
            } else {
                egui::Color32::from_rgb(0x88, 0x88, 0x88)
            }));
            ui.add_space(4.0);

            // Input -> [cook progress] -> Output row.
            ui.horizontal(|ui| {
                ui.vertical(|ui| {
                    ui.label(egui::RichText::new("Cook").weak());
                    if ui_icons::slot(ui, b.input.item, b.input.count, SLOT, None).clicked() {
                        action = Some(Action::TakeInput);
                    }
                });
                ui.add_space(8.0);
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
                    egui::pos2(track.min.x + track.width() * b.cook_progress.clamp(0.0, 1.0), track.max.y),
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
                    ui.label(egui::RichText::new("Result").weak());
                    if ui_icons::slot(ui, b.output.item, b.output.count, SLOT, Some(egui::Color32::from_rgb(0x6e, 0xc0, 0x7a))).clicked() {
                        action = Some(Action::TakeOutput);
                    }
                });
            });
            ui.add_space(8.0);
            // Fuel slot + burn bar.
            ui.horizontal(|ui| {
                ui.vertical(|ui| {
                    ui.label(egui::RichText::new("Fuel (sticks/logs/charcoal)").weak());
                    if ui_icons::slot(ui, b.fuel.item, b.fuel.count, SLOT, Some(egui::Color32::from_rgb(0xe0, 0x80, 0x40))).clicked() {
                        action = Some(Action::TakeFuel);
                    }
                });
                ui.add_space(8.0);
                ui.vertical(|ui| {
                    ui.add_space(18.0);
                    /* Burn bar scaled against a charcoal charge as the
                     * full-bar reference. */
                    let frac = b.burn_s / cfg.charcoal_burn_s.max(1.0);
                    let (rect, _) =
                        ui.allocate_exact_size(egui::vec2(150.0, 12.0), egui::Sense::hover());
                    let p = ui.painter();
                    p.rect_filled(rect, 2.0, egui::Color32::from_rgb(0x20, 0x22, 0x29));
                    let fill = egui::Rect::from_min_max(
                        rect.min,
                        egui::pos2(rect.min.x + rect.width() * frac.clamp(0.0, 1.0), rect.max.y),
                    );
                    p.rect_filled(fill, 2.0, egui::Color32::from_rgb(0xe0, 0x80, 0x40));
                });
            });

            ui.add_space(6.0);
            ui.horizontal(|ui| {
                ui.label("Auto-cook:");
                egui::ComboBox::from_id_salt("bonfire-autocook")
                    .selected_text("pick food")
                    .show_ui(ui, |ui| {
                        for &(item, count) in &cookables {
                            let name = items::def(item).map(|d| d.name).unwrap_or("?");
                            if ui.selectable_label(false, format!("{name}  x{count}")).clicked() {
                                action = Some(Action::LoadInput(item));
                            }
                        }
                    });
            });

            ui.separator();
            ui.label(egui::RichText::new("Bag - click food to cook, wood to fuel").weak());
            egui::Grid::new("bonfire-bag").spacing(egui::vec2(3.0, 3.0)).show(ui, |ui| {
                for (i, &(item, count)) in bag_rows.iter().enumerate() {
                    if ui_icons::slot(ui, item, count, 40.0, None).clicked() && count > 0 {
                        if items::smelt_output(item).is_some() {
                            action = Some(Action::LoadInput(item));
                        } else if block_entity::is_bonfire_fuel(item) {
                            action = Some(Action::LoadFuel(item));
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

/// Mutate the bonfire + bag for a click, then persist same-frame.
fn apply(world: &WorldHandle, player: &PlayerHandle, tile: i32, depth: i32, act: Action) {
    let mut w = world.borrow_mut();
    let mut p = player.borrow_mut();
    match act {
        Action::LoadInput(item) => {
            let b = w.block_entities.entry(tile, depth).bonfire_mut();
            if b.input.count == 0 || b.input.item == item {
                let cap = items::stack_size(item);
                let room = cap.saturating_sub(b.input.count);
                let take = p.bag.take(item, room as u32) as u16;
                if take > 0 {
                    b.input.item = item;
                    b.input.count += take;
                }
            }
        }
        Action::LoadFuel(item) => {
            let b = w.block_entities.entry(tile, depth).bonfire_mut();
            if b.fuel.count == 0 || b.fuel.item == item {
                let cap = items::stack_size(item);
                let room = cap.saturating_sub(b.fuel.count);
                let take = p.bag.take(item, room as u32) as u16;
                if take > 0 {
                    b.fuel.item = item;
                    b.fuel.count += take;
                }
            }
        }
        Action::TakeInput | Action::TakeFuel | Action::TakeOutput => {
            let b = w.block_entities.entry(tile, depth).bonfire_mut();
            let slot = match act {
                Action::TakeInput => &mut b.input,
                Action::TakeFuel => &mut b.fuel,
                _ => &mut b.output,
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
