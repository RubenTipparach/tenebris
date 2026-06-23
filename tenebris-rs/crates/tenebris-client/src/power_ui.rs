//! egui panels for the powered machines: the steam engine (generator) and
//! the electric furnace (consumer). Both share the open/close/persist
//! machinery; `egui_ui` dispatches to the right layout.
//!
//! Steam engine: a fuel slot + a running/idle status; burns coal over time
//! and powers the cable network it touches. Electric furnace: input +
//! progress + output, no fuel, with a POWERED / NO POWER readout; it smelts
//! only while connected by cables to a running steam engine.

use std::cell::RefCell;
use std::rc::Rc;

use sokol::app as sapp;

use crate::persistence;
use crate::player_ctrl::PlayerCtrl;
use crate::ui_icons;
use tenebris_core::block_entity::{ChestSlot, STEAM_BURN_S_PER_COAL};
use tenebris_core::items;
use tenebris_core::world::World;

pub type PlayerHandle = Rc<RefCell<PlayerCtrl>>;
pub type WorldHandle = Rc<RefCell<World>>;

#[derive(Clone, Copy, PartialEq)]
enum Kind {
    Steam,
    Electric,
}

struct Screen {
    open: bool,
    kind: Kind,
    tile: i32,
    depth: i32,
    world: Option<WorldHandle>,
    player: Option<PlayerHandle>,
}

thread_local! {
    static S: RefCell<Screen> = RefCell::new(Screen {
        open: false,
        kind: Kind::Steam,
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

fn open(kind: Kind, world: WorldHandle, player: PlayerHandle, tile: i32, depth: i32) {
    S.with(|c| {
        let s = &mut *c.borrow_mut();
        s.open = true;
        s.kind = kind;
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

pub fn open_steam(world: WorldHandle, player: PlayerHandle, tile: i32, depth: i32) {
    open(Kind::Steam, world, player, tile, depth);
}

pub fn open_electric(world: WorldHandle, player: PlayerHandle, tile: i32, depth: i32) {
    open(Kind::Electric, world, player, tile, depth);
}

#[cfg(not(test))]
fn release_pointer() {
    sapp::lock_mouse(false);
    sapp::show_mouse(true);
}
#[cfg(test)]
fn release_pointer() {}

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

const SLOT: f32 = 52.0;
const GREEN: egui::Color32 = egui::Color32::from_rgb(0x6e, 0xc0, 0x7a);
const RED: egui::Color32 = egui::Color32::from_rgb(0xd0, 0x6a, 0x5a);

enum Action {
    LoadInput(u16),
    LoadFuel,
    TakeInput,
    TakeFuel,
    TakeOutput,
}

/// Progress / fuel bar in `rect` filled to `frac`.
fn bar(p: &egui::Painter, rect: egui::Rect, frac: f32, fill: egui::Color32) {
    p.rect_filled(rect, 2.0, egui::Color32::from_rgb(0x20, 0x22, 0x29));
    let f = egui::Rect::from_min_max(
        rect.min,
        egui::pos2(rect.min.x + rect.width() * frac.clamp(0.0, 1.0), rect.max.y),
    );
    p.rect_filled(f, 2.0, fill);
}

pub fn egui_ui(ctx: &egui::Context) {
    if !is_open() {
        return;
    }
    let (kind, world, player, tile, depth) = S.with(|c| {
        let s = c.borrow();
        (s.kind, s.world.clone(), s.player.clone(), s.tile, s.depth)
    });
    let (Some(world), Some(player)) = (world, player) else {
        return;
    };

    let bag_rows: Vec<(u16, u16)> = {
        let p = player.borrow();
        p.bag.slots.iter().map(|s| (s.item, s.count)).collect()
    };
    let mut action: Option<Action> = None;
    let mut do_close = false;

    match kind {
        Kind::Steam => {
            let s = {
                let w = world.borrow();
                w.block_entities.get(tile, depth).and_then(|e| e.steam_engine().copied()).unwrap_or_default()
            };
            egui::Window::new("Steam Engine")
                .collapsible(false)
                .resizable(false)
                .anchor(egui::Align2::CENTER_CENTER, egui::Vec2::ZERO)
                .show(ctx, |ui| {
                    if s.running() {
                        ui.label(egui::RichText::new("RUNNING - powering the cable network").color(GREEN).strong());
                    } else {
                        ui.label(egui::RichText::new("IDLE - add coal to run").color(RED).strong());
                    }
                    ui.horizontal(|ui| {
                        ui.vertical(|ui| {
                            ui.label(egui::RichText::new("Fuel (coal)").weak());
                            if ui_icons::slot(ui, s.fuel.item, s.fuel.count, SLOT, Some(egui::Color32::from_rgb(0xe0, 0x80, 0x40))).clicked() {
                                action = Some(Action::TakeFuel);
                            }
                        });
                        ui.add_space(8.0);
                        ui.vertical(|ui| {
                            ui.add_space(20.0);
                            let (r, _) = ui.allocate_exact_size(egui::vec2(150.0, 12.0), egui::Sense::hover());
                            bar(ui.painter(), r, s.burn_time / STEAM_BURN_S_PER_COAL, egui::Color32::from_rgb(0xe0, 0x80, 0x40));
                            ui.label(egui::RichText::new(format!("burn: {:.0}s", s.burn_time)).small().weak());
                        });
                    });
                    ui.separator();
                    ui.label(egui::RichText::new("Bag - click coal to fuel").weak());
                    bag_grid(ui, &bag_rows, &mut action, true);
                    ui.add_space(4.0);
                    if ui.button("Close").clicked() {
                        do_close = true;
                    }
                });
        }
        Kind::Electric => {
            let e = {
                let w = world.borrow();
                w.block_entities.get(tile, depth).and_then(|x| x.electric_furnace().copied()).unwrap_or_default()
            };
            egui::Window::new("Electric Furnace")
                .collapsible(false)
                .resizable(false)
                .anchor(egui::Align2::CENTER_CENTER, egui::Vec2::ZERO)
                .show(ctx, |ui| {
                    if e.powered {
                        ui.label(egui::RichText::new("POWERED").color(GREEN).strong());
                    } else {
                        ui.label(egui::RichText::new("NO POWER - cable it to a running steam engine").color(RED).strong());
                    }
                    ui.horizontal(|ui| {
                        ui.vertical(|ui| {
                            ui.label(egui::RichText::new("Input").weak());
                            if ui_icons::slot(ui, e.input.item, e.input.count, SLOT, None).clicked() {
                                action = Some(Action::TakeInput);
                            }
                        });
                        ui.add_space(8.0);
                        ui.vertical(|ui| {
                            ui.add_space(20.0);
                            let (r, _) = ui.allocate_exact_size(egui::vec2(64.0, 10.0), egui::Sense::hover());
                            bar(ui.painter(), r, e.progress, egui::Color32::from_rgb(0x60, 0xb0, 0xe0));
                        });
                        ui.add_space(8.0);
                        ui.vertical(|ui| {
                            ui.label(egui::RichText::new("Output").weak());
                            if ui_icons::slot(ui, e.output.item, e.output.count, SLOT, Some(GREEN)).clicked() {
                                action = Some(Action::TakeOutput);
                            }
                        });
                    });
                    ui.separator();
                    ui.label(egui::RichText::new("Bag - click ore to smelt").weak());
                    bag_grid(ui, &bag_rows, &mut action, false);
                    ui.add_space(4.0);
                    if ui.button("Close").clicked() {
                        do_close = true;
                    }
                });
        }
    }

    if let Some(act) = action {
        apply(kind, &world, &player, tile, depth, act);
    }
    if do_close {
        close();
    }
}

/// The bag grid. `fuel_only` routes every click to fuel (steam engine);
/// otherwise smeltable ore routes to the input.
fn bag_grid(ui: &mut egui::Ui, rows: &[(u16, u16)], action: &mut Option<Action>, fuel_only: bool) {
    egui::Grid::new("power-bag").spacing(egui::vec2(3.0, 3.0)).show(ui, |ui| {
        for (i, &(item, count)) in rows.iter().enumerate() {
            if ui_icons::slot(ui, item, count, 40.0, None).clicked() && count > 0 {
                if fuel_only {
                    if items::is_fuel(item) {
                        *action = Some(Action::LoadFuel);
                    }
                } else if items::smelt_output(item).is_some() {
                    *action = Some(Action::LoadInput(item));
                }
            }
            if (i + 1) % 9 == 0 {
                ui.end_row();
            }
        }
    });
}

fn apply(kind: Kind, world: &WorldHandle, player: &PlayerHandle, tile: i32, depth: i32, act: Action) {
    let mut w = world.borrow_mut();
    let mut p = player.borrow_mut();
    let take_into = |slot: &mut ChestSlot, item: u16, bag: &mut crate::bag::Bag| {
        if slot.count == 0 || slot.item == item {
            let room = items::stack_size(item).saturating_sub(slot.count);
            let got = bag.take(item, room as u32) as u16;
            if got > 0 {
                slot.item = item;
                slot.count += got;
            }
        }
    };
    let give_back = |slot: &mut ChestSlot, bag: &mut crate::bag::Bag| {
        if slot.count > 0 {
            let left = bag.add(slot.item, slot.count);
            if left == 0 {
                *slot = ChestSlot::default();
            } else {
                slot.count = left;
            }
        }
    };
    match kind {
        Kind::Steam => {
            let s = w.block_entities.entry(tile, depth).steam_engine_mut();
            match act {
                Action::LoadFuel => take_into(&mut s.fuel, items::COAL, &mut p.bag),
                Action::TakeFuel => give_back(&mut s.fuel, &mut p.bag),
                _ => {}
            }
        }
        Kind::Electric => {
            let e = w.block_entities.entry(tile, depth).electric_furnace_mut();
            match act {
                Action::LoadInput(item) => take_into(&mut e.input, item, &mut p.bag),
                Action::TakeInput => give_back(&mut e.input, &mut p.bag),
                Action::TakeOutput => give_back(&mut e.output, &mut p.bag),
                _ => {}
            }
        }
    }
    persist(&w);
}
