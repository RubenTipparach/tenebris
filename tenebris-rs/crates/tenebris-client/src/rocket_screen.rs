//! Rocket assembly + test-flight screen (egui).
//!
//! E on a placed launch pad opens this panel. The assembled stack lives in
//! the world's block-entity store at the pad's (tile, depth) as a
//! `LaunchPadState`, so it is shared by SP/MP and persists same-frame (the
//! CLAUDE.md world-edit rule); the parts also render as stacked cubes on the
//! pad in-world. ADD pulls a crafted part from the bag onto the stack; REMOVE
//! TOP returns the top part to the bag. LAUNCH boards a flyable stack and
//! runs the core flight sim, streaming telemetry.

use std::cell::RefCell;
use std::rc::Rc;

use sokol::app as sapp;

use crate::egui_layer;
use crate::persistence;
use crate::player_ctrl::PlayerCtrl;
use crate::ui_icons;
use tenebris_core::items::{self, ItemId, COMMAND_MODULE, FUEL_TANK, ROCKET_ENGINE, VACUUM_ENGINE};
use tenebris_core::rocket::{self, FlightState, RocketFlight, RocketSpec};
use tenebris_core::world::World;

pub type PlayerHandle = Rc<RefCell<PlayerCtrl>>;
pub type WorldHandle = Rc<RefCell<World>>;

/// The buildable parts, in typical stack order (engine first). Two engine
/// types: the atmospheric engine lifts off, the vacuum engine is the efficient
/// upper stage you stage to in space.
const PART_ROWS: [(ItemId, &str); 4] = [
    (ROCKET_ENGINE, "Atmospheric Engine"),
    (VACUUM_ENGINE, "Vacuum Engine"),
    (FUEL_TANK, "Fuel Tank"),
    (COMMAND_MODULE, "Command Module"),
];

struct Screen {
    open: bool,
    tile: i32,
    depth: i32,
    world: Option<WorldHandle>,
    player: Option<PlayerHandle>,
    /// Some while a test flight is running / finished.
    flight: Option<RocketFlight>,
}

thread_local! {
    static S: RefCell<Screen> = RefCell::new(Screen {
        open: false,
        tile: -1,
        depth: -1,
        world: None,
        player: None,
        flight: None,
    });
}

pub fn init() {
    S.with(|c| {
        let s = &mut *c.borrow_mut();
        s.open = false;
        s.tile = -1;
        s.depth = -1;
        s.world = None;
        s.player = None;
        s.flight = None;
    });
}

pub fn is_open() -> bool {
    S.with(|c| c.borrow().open)
}

pub fn close() {
    S.with(|c| {
        let s = &mut *c.borrow_mut();
        s.open = false;
        s.flight = None;
    });
}

/// Open the assembly panel for the launch pad at (tile, depth).
pub fn open(world: WorldHandle, player: PlayerHandle, tile: i32, depth: i32) {
    /* Make sure the pad carries assembly state so the mesher + persistence
     * see it even before the first part is added. */
    {
        let mut w = world.borrow_mut();
        w.block_entities.entry(tile, depth).launch_pad_mut();
    }
    S.with(|c| {
        let s = &mut *c.borrow_mut();
        s.open = true;
        s.tile = tile;
        s.depth = depth;
        s.world = Some(world);
        s.player = Some(player);
        s.flight = None;
    });
    /* One survival panel up at a time. */
    crate::screens::take_focus(crate::screens::Screen::Rocket);
}

/// Esc closes the screen. Returns true if consumed.
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

/// Advance a running test flight (full throttle until it lands).
pub fn update(dt: f32) {
    S.with(|c| {
        let s = &mut *c.borrow_mut();
        if !s.open {
            return;
        }
        if let Some(f) = s.flight.as_mut() {
            if f.state != FlightState::Landed {
                f.set_throttle(1.0);
                f.step(dt, &rocket::config());
            }
        }
    });
}

/// SP-only same-frame persistence after an assembly edit (mirrors the chest
/// panel's gate).
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

const SLOT_PX: f32 = 40.0;

/// Draw one part thumbnail (framed cell with the item icon from the
/// `ui_icons` atlas). `dim` greys it out (e.g. an empty stack placeholder).
fn part_icon(ui: &mut egui::Ui, item: u16, dim: bool) {
    let size = egui::vec2(SLOT_PX, SLOT_PX);
    let (rect, _) = ui.allocate_exact_size(size, egui::Sense::hover());
    let p = ui.painter();
    p.rect_filled(rect, 3.0, egui::Color32::from_rgb(0x26, 0x2a, 0x33));
    p.rect_stroke(
        rect,
        3.0,
        egui::Stroke::new(1.0, egui::Color32::from_rgb(0x4a, 0x50, 0x5e)),
        egui::StrokeKind::Inside,
    );
    if item != 0 {
        let tint = if dim {
            egui::Color32::from_rgba_unmultiplied(0xff, 0xff, 0xff, 0x66)
        } else {
            egui::Color32::WHITE
        };
        if let Some([u0, v0, u1, v1]) = ui_icons::uv(item) {
            let uv = egui::Rect::from_min_max(egui::pos2(u0, v0), egui::pos2(u1, v1));
            p.image(egui_layer::ICON_TEX, rect.shrink(4.0), uv, tint);
        } else {
            p.rect_filled(rect.shrink(8.0), 2.0, egui::Color32::from_rgb(0x88, 0x88, 0x90));
        }
    }
}

/// Draw the assembly / telemetry panel and apply this frame's action.
pub fn egui_ui(ctx: &egui::Context) {
    if !is_open() {
        return;
    }
    let (world, player, tile, depth, has_flight) = S.with(|c| {
        let s = c.borrow();
        (s.world.clone(), s.player.clone(), s.tile, s.depth, s.flight.is_some())
    });
    let (Some(world), Some(player)) = (world, player) else {
        return;
    };

    if has_flight {
        draw_flight_panel(ctx);
        return;
    }

    /* Snapshot the stack + capacity + bag counts (read borrows dropped
     * before any mutation below). */
    let (parts, capacity): (Vec<u16>, usize) = {
        let w = world.borrow();
        match w.block_entities.get(tile, depth).as_ref().and_then(|e| e.launch_pad()) {
            Some(p) => (p.parts().to_vec(), p.capacity()),
            None => (Vec::new(), 0),
        }
    };
    let bag_count = |id: u16| -> u32 { player.borrow().bag.count_of(id) };

    let cfg = rocket::config();
    let faults = rocket::validate(&parts);
    let spec = RocketSpec::from_parts(&parts, &cfg);

    let mut add: Option<ItemId> = None;
    let mut remove = false;
    let mut launch = false;
    let mut do_close = false;

    egui::Window::new("Rocket Assembly")
        .collapsible(false)
        .resizable(false)
        .anchor(egui::Align2::CENTER_CENTER, egui::Vec2::ZERO)
        .show(ctx, |ui| {
            ui.horizontal(|ui| {
                /* ---- Parts palette ---- */
                ui.vertical(|ui| {
                    ui.label(
                        egui::RichText::new("Parts")
                            .color(egui::Color32::from_rgb(0xc8, 0xd0, 0xe0))
                            .strong(),
                    );
                    for (id, name) in PART_ROWS {
                        ui.horizontal(|ui| {
                            part_icon(ui, id, false);
                            ui.vertical(|ui| {
                                ui.label(name);
                                ui.label(
                                    egui::RichText::new(format!("in bag: {}", bag_count(id)))
                                        .color(egui::Color32::from_rgb(0xa8, 0xc8, 0xa0))
                                        .small(),
                                );
                            });
                            let can_add = bag_count(id) > 0 && parts.len() < capacity;
                            if ui.add_enabled(can_add, egui::Button::new("Add")).clicked() {
                                add = Some(id);
                            }
                        });
                    }
                });

                ui.separator();

                /* ---- Assembled stack (top -> bottom visually) ---- */
                ui.vertical(|ui| {
                    ui.label(
                        egui::RichText::new(format!("Stack  {}/{}", parts.len(), capacity))
                            .color(egui::Color32::from_rgb(0xc8, 0xd0, 0xe0))
                            .strong(),
                    );
                    if parts.is_empty() {
                        part_icon(ui, 0, true);
                        ui.label(
                            egui::RichText::new("(empty)")
                                .color(egui::Color32::from_rgb(0x88, 0x90, 0xa0))
                                .small(),
                        );
                    } else {
                        for (vi, &id) in parts.iter().rev().enumerate() {
                            let is_top = vi == 0;
                            ui.horizontal(|ui| {
                                part_icon(ui, id, false);
                                let label = match items::def(id) {
                                    Some(d) => d.name,
                                    None => "?",
                                };
                                let txt = if is_top {
                                    egui::RichText::new(format!("{label}  (top)"))
                                        .color(egui::Color32::from_rgb(0xe0, 0xd0, 0x90))
                                } else {
                                    egui::RichText::new(label)
                                        .color(egui::Color32::from_rgb(0xc0, 0xc6, 0xd2))
                                };
                                ui.label(txt);
                            });
                        }
                    }
                    ui.add_space(4.0);
                    if ui
                        .add_enabled(!parts.is_empty(), egui::Button::new("Remove Top"))
                        .clicked()
                    {
                        remove = true;
                    }
                });
            });

            ui.separator();

            /* ---- Validity + flight spec ---- */
            if faults.is_empty() {
                ui.label(
                    egui::RichText::new("READY TO LAUNCH")
                        .color(egui::Color32::from_rgb(0x6c, 0xd0, 0x7a))
                        .strong(),
                );
                let g = cfg.flight.gravity_mps2;
                ui.label(format!("Thrust: {:.0} N", spec.total_thrust_n));
                ui.label(format!("Fuel: {:.0}", spec.fuel_capacity));
                ui.label(format!("Mass: {:.0} kg (dry {:.0})", spec.wet_mass_kg, spec.dry_mass_kg));
                ui.label(format!("TWR: {:.2}", spec.twr(g)));
                ui.add_space(4.0);
                if ui.button("Launch").clicked() {
                    launch = true;
                }
            } else {
                for f in &faults {
                    ui.label(
                        egui::RichText::new(f.message())
                            .color(egui::Color32::from_rgb(0xe0, 0x80, 0x70)),
                    );
                }
            }
            ui.add_space(4.0);
            if ui.button("Close").clicked() {
                do_close = true;
            }
        });

    /* ---- Apply this frame's action (same-frame persist on edits) ---- */
    if let Some(id) = add {
        let mut w = world.borrow_mut();
        let mut p = player.borrow_mut();
        if p.bag.count_of(id) > 0 {
            let pad = w.block_entities.entry(tile, depth).launch_pad_mut();
            if pad.push(id) {
                p.bag.take(id, 1);
            }
        }
        persist(&w);
    } else if remove {
        let mut w = world.borrow_mut();
        let mut p = player.borrow_mut();
        let popped = w.block_entities.entry(tile, depth).launch_pad_mut().pop();
        if let Some(id) = popped {
            /* Bag full: keep the part on the pad rather than dropping it. */
            if p.bag.room_for(id, 1) {
                p.bag.add(id, 1);
            } else {
                w.block_entities.entry(tile, depth).launch_pad_mut().push(id);
            }
        }
        persist(&w);
    } else if launch && faults.is_empty() {
        /* Board: snapshot the assembled stack into a flown rocket and seat
         * the player at the pad top. Hold jump to fire the engine; X to
         * stage; Z to exit.
         *
         * The pad KEEPS its parts (this used to empty it). The flown rocket
         * is a session on top of the pad's rocket - the renderer hides the
         * pad's static copy while it's the one being flown, and exiting
         * leaves the rocket on the pad rather than deleting it or dumping the
         * parts into the bag. That's what makes respawn and re-boarding work,
         * and it can't duplicate parts: they only ever live on the pad. */
        if let Some(ride) = rocket::RocketRide::from_stack(&parts, &cfg) {
            let mut p = player.borrow_mut();
            let w = world.borrow();
            let (pos, up) = if let Some(t) = w.grid.tile(tile) {
                let center =
                    tenebris_core::math::dvec3_make(w.body.pos_x, w.body.pos_y, w.body.pos_z);
                let dir = tenebris_core::math::dvec3_normalize(t.center);
                let r = w.depth_to_radius_m(depth + 1) + 1.0;
                let pos =
                    tenebris_core::math::dvec3_add(center, tenebris_core::math::dvec3_scale(dir, r));
                p.position = pos;
                p.velocity = tenebris_core::math::DVec3::default();
                p.grounded = false;
                (pos, dir)
            } else {
                (p.position, p.basis.up)
            };
            drop(w);
            drop(p);
            crate::rocket_ride::begin(ride, parts.clone(), tile, depth, pos, up);
            do_close = true;
        }
    }

    if do_close {
        close();
    }
}

/// The live test-flight telemetry view (replaces the assembly panel while a
/// flight is running / has landed).
fn draw_flight_panel(ctx: &egui::Context) {
    let mut back = false;
    let mut do_close = false;
    let snap = S.with(|c| c.borrow().flight);
    let Some(f) = snap else {
        return;
    };

    egui::Window::new("Test Flight")
        .collapsible(false)
        .resizable(false)
        .anchor(egui::Align2::CENTER_CENTER, egui::Vec2::ZERO)
        .show(ctx, |ui| {
            let (label, color) = match f.state {
                FlightState::Grounded => ("GROUNDED", egui::Color32::from_rgb(0xc0, 0xc6, 0xd2)),
                FlightState::Launching => ("LAUNCHING", egui::Color32::from_rgb(0xe0, 0xc0, 0x70)),
                FlightState::InFlight => ("IN FLIGHT", egui::Color32::from_rgb(0x80, 0xc0, 0xe0)),
                FlightState::Landing => ("LANDING", egui::Color32::from_rgb(0xe0, 0xc0, 0x70)),
                FlightState::Landed => {
                    if f.crashed {
                        ("CRASHED", egui::Color32::from_rgb(0xe0, 0x70, 0x60))
                    } else {
                        ("LANDED", egui::Color32::from_rgb(0x6c, 0xd0, 0x7a))
                    }
                }
            };
            ui.label(egui::RichText::new(label).color(color).strong());
            ui.label(format!("Altitude: {:.1} m", f.altitude_m));
            ui.label(format!("Velocity: {:.1} m/s", f.vel_mps));
            ui.label(format!("Fuel: {:.0}", f.fuel));
            ui.add_space(4.0);
            ui.horizontal(|ui| {
                if ui.button("Back").clicked() {
                    back = true;
                }
                if ui.button("Close").clicked() {
                    do_close = true;
                }
            });
        });

    if back {
        S.with(|c| c.borrow_mut().flight = None);
    }
    if do_close {
        close();
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tenebris_core::rocket::PartRole;

    fn role_of(id: ItemId) -> PartRole {
        rocket::part_role(id).unwrap_or(PartRole::FuelTank)
    }

    fn part_count(stack: &[ItemId], role: PartRole) -> usize {
        stack.iter().filter(|&&id| rocket::part_role(id) == Some(role)).count()
    }

    #[test]
    fn part_rows_cover_the_three_part_kinds() {
        let roles: Vec<PartRole> = PART_ROWS.iter().map(|(id, _)| role_of(*id)).collect();
        assert!(roles.contains(&PartRole::Engine));
        assert!(roles.contains(&PartRole::FuelTank));
        assert!(roles.contains(&PartRole::Capsule));
    }

    #[test]
    fn part_count_tallies_the_stack() {
        let stack = [ROCKET_ENGINE, FUEL_TANK, FUEL_TANK];
        assert_eq!(part_count(&stack, PartRole::Engine), 1);
        assert_eq!(part_count(&stack, PartRole::FuelTank), 2);
        assert_eq!(part_count(&stack, PartRole::Capsule), 0);
    }

    #[test]
    fn part_ids_have_definitions() {
        for (id, _) in PART_ROWS {
            assert!(tenebris_core::items::def(id).is_some());
        }
    }
}
