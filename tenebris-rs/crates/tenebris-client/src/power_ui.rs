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
    Hydro,
    Computer,
    Printer,
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
    crate::screens::take_focus(crate::screens::Screen::Power);
}

pub fn open_steam(world: WorldHandle, player: PlayerHandle, tile: i32, depth: i32) {
    open(Kind::Steam, world, player, tile, depth);
}

pub fn open_electric(world: WorldHandle, player: PlayerHandle, tile: i32, depth: i32) {
    open(Kind::Electric, world, player, tile, depth);
}

pub fn open_hydro(world: WorldHandle, player: PlayerHandle, tile: i32, depth: i32) {
    open(Kind::Hydro, world, player, tile, depth);
}

pub fn open_computer(world: WorldHandle, player: PlayerHandle, tile: i32, depth: i32) {
    open(Kind::Computer, world, player, tile, depth);
}

pub fn open_printer(world: WorldHandle, player: PlayerHandle, tile: i32, depth: i32) {
    open(Kind::Printer, world, player, tile, depth);
}

pub fn handle_event(e: &sapp::Event) -> bool {
    if !is_open() {
        return false;
    }
    if e._type == sapp::EventType::KeyDown && e.key_code == sapp::Keycode::Escape {
        close();
        crate::screens::grab_pointer();
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
    StartPrint(usize),
    TakePrint,
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
                    let (txt, col) = if s.running() {
                        ("RUNNING - powering the cable network", GREEN)
                    } else if s.fuel.count == 0 && s.burn_time <= 0.0 {
                        ("IDLE - add coal", RED)
                    } else if !s.has_water {
                        ("NO WATER - pipe in an active hydro generator", RED)
                    } else {
                        ("IDLE", RED)
                    };
                    ui.label(egui::RichText::new(txt).color(col).strong());
                    ui.horizontal(|ui| {
                        ui.vertical(|ui| {
                            ui.label(egui::RichText::new("Fuel (coal)").weak());
                            if ui_icons::slot(ui, s.fuel.item, s.fuel.count, 0, SLOT, Some(egui::Color32::from_rgb(0xe0, 0x80, 0x40))).clicked() {
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
                            if ui_icons::slot(ui, e.input.item, e.input.count, 0, SLOT, None).clicked() {
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
                            if ui_icons::slot(ui, e.output.item, e.output.count, 0, SLOT, Some(GREEN)).clicked() {
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
        Kind::Hydro => {
            let active = world.borrow().hydro_is_active(tile, depth);
            egui::Window::new("Hydro Generator")
                .collapsible(false)
                .resizable(false)
                .anchor(egui::Align2::CENTER_CENTER, egui::Vec2::ZERO)
                .show(ctx, |ui| {
                    if active {
                        ui.label(egui::RichText::new("ACTIVE - pumping water").color(GREEN).strong());
                        ui.label(egui::RichText::new("Pipe this to a steam engine to feed it water.").weak());
                    } else {
                        ui.label(egui::RichText::new("DRY - place it on water").color(RED).strong());
                    }
                    ui.add_space(6.0);
                    if ui.button("Close").clicked() {
                        do_close = true;
                    }
                });
        }
        Kind::Computer => {
            let powered = {
                let w = world.borrow();
                w.block_entities.get(tile, depth).and_then(|e| match e.state {
                    tenebris_core::block_entity::MachineState::Computer(c) => Some(c.powered),
                    _ => None,
                }).unwrap_or(false)
            };
            egui::Window::new("Computer")
                .collapsible(false)
                .resizable(false)
                .anchor(egui::Align2::CENTER_CENTER, egui::Vec2::ZERO)
                .show(ctx, |ui| {
                    if powered {
                        ui.label(egui::RichText::new("POWERED - enables connected 3D printers").color(GREEN).strong());
                    } else {
                        ui.label(egui::RichText::new("NO POWER - cable it to a running steam engine").color(RED).strong());
                    }
                    ui.add_space(6.0);
                    if ui.button("Close").clicked() {
                        do_close = true;
                    }
                });
        }
        Kind::Printer => {
            let pr = {
                let w = world.borrow();
                w.block_entities.get(tile, depth).and_then(|e| e.printer().copied()).unwrap_or_default()
            };
            let recipes = items::print_recipes();
            egui::Window::new("3D Printer")
                .collapsible(false)
                .resizable(false)
                .anchor(egui::Align2::CENTER_CENTER, egui::Vec2::ZERO)
                .show(ctx, |ui| {
                    if pr.powered {
                        ui.label(egui::RichText::new("POWERED").color(GREEN).strong());
                    } else {
                        ui.label(egui::RichText::new("NO POWER - cable it to a powered computer").color(RED).strong());
                    }
                    ui.horizontal(|ui| {
                        if pr.out_item != 0 {
                            ui.label("Printing");
                            let (r, _) = ui.allocate_exact_size(egui::vec2(150.0, 12.0), egui::Sense::hover());
                            bar(ui.painter(), r, pr.progress, egui::Color32::from_rgb(0xc0, 0x80, 0xe0));
                        } else {
                            ui.label(egui::RichText::new("Idle - pick a recipe").weak());
                        }
                        ui.add_space(10.0);
                        ui.label(egui::RichText::new("Out").weak());
                        if ui_icons::slot(ui, pr.output.item, pr.output.count, 0, SLOT, Some(GREEN)).clicked() {
                            action = Some(Action::TakePrint);
                        }
                    });
                    ui.separator();
                    ui.label(egui::RichText::new("Recipes - click to print (consumes ingredients)").weak());
                    for (i, r) in recipes.iter().enumerate() {
                        ui.horizontal(|ui| {
                            ui_icons::slot(ui, r.output, r.qty, 0, 40.0, None);
                            ui.label(r.name);
                            // inputs
                            for &(item, count) in &r.inputs {
                                ui_icons::slot(ui, item, count, 0, 30.0, None);
                            }
                            let can = pr.powered && pr.out_item == 0;
                            if ui.add_enabled(can, egui::Button::new("Print")).clicked() {
                                action = Some(Action::StartPrint(i));
                            }
                        });
                    }
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
            if ui_icons::slot(ui, item, count, 0, 40.0, None).clicked() && count > 0 {
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
        Kind::Hydro | Kind::Computer => {}
        Kind::Printer => match act {
            Action::StartPrint(i) => {
                let recipes = items::print_recipes();
                if let Some(r) = recipes.get(i) {
                    let has_all =
                        r.inputs.iter().all(|&(item, c)| p.bag.count_of(item) >= c as u32);
                    let pr = w.block_entities.entry(tile, depth).printer_mut();
                    if has_all && pr.powered && pr.out_item == 0 {
                        for &(item, c) in &r.inputs {
                            p.bag.take(item, c as u32);
                        }
                        pr.out_item = r.output;
                        pr.out_qty = r.qty;
                        pr.total = r.time_s;
                        pr.progress = 0.0;
                    }
                }
            }
            Action::TakePrint => {
                let pr = w.block_entities.entry(tile, depth).printer_mut();
                give_back(&mut pr.output, &mut p.bag);
            }
            _ => {}
        },
    }
    persist(&w);
}
