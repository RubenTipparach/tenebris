//! The orbital station hub UI (space era Phase 2): Trade / Warehouse / Fuel
//! tabs over the Core market engine (`core::station`). The station rides an
//! on-rails circular orbit (`core::station::orbit_pos`, speed derived from
//! the gravity field - see station.yaml + tools/station-math.py); docking is
//! a RENDEZVOUS: fly within `dock_radius_m` AND match the station's orbital
//! velocity to within `dock_max_rel_mps`, then press Interact. While the hub
//! is open the player is carried along the orbit so undocking leaves them
//! flying formation.
//!
//! Every mutation persists SAME-FRAME to `tenebris-c:station:<world>` via
//! `client_kv` (a bet, a sale, an upgrade can't be quit-scummed away).
//! The drum structure itself is drawn by `station_fx`.

use std::cell::RefCell;
use std::rc::Rc;

use crate::{client_kv, menu, ui_icons};
use tenebris_core::items::{self};
use tenebris_core::math::{dvec3_make, dvec3_length, dvec3_sub, DVec3};
use tenebris_core::station::StationState;
use tenebris_core::{economy, world_time};

use crate::player_ctrl::PlayerCtrl;
pub type PlayerHandle = Rc<RefCell<PlayerCtrl>>;

#[derive(Clone, Copy, PartialEq)]
enum Tab {
    Trade,
    Warehouse,
    Fuel,
}

struct Screen {
    open: bool,
    tab: Tab,
    state: StationState,
    player: Option<PlayerHandle>,
    /// World-space offset from the orbital anchor captured at dock time;
    /// while the hub is open the player is re-posed to anchor + offset
    /// every frame so the station doesn't sail away mid-trade.
    dock_offset: DVec3,
}

thread_local! {
    static S: RefCell<Screen> = RefCell::new(Screen {
        open: false,
        tab: Tab::Trade,
        state: StationState::default(),
        player: None,
        dock_offset: DVec3 { x: 0.0, y: 0.0, z: 0.0 },
    });
}

/// World-space position of the trading station NOW: the on-rails orbital
/// anchor at the current world time (see `core::station::orbit_pos`).
pub fn station_pos() -> DVec3 {
    tenebris_core::station::orbit_pos(world_time::seconds())
}

/// Dock range around the station anchor (station.yaml).
pub fn dock_radius_m() -> f64 {
    tenebris_core::station::config().dock_radius_m as f64
}

/// Distance from `pos` to the station dock point.
pub fn dock_distance_m(pos: DVec3) -> f64 {
    dvec3_length(dvec3_sub(pos, station_pos()))
}

/// Relative speed between the player and the station (m/s) - the
/// rendezvous number the rocket has to bring under `dock_max_rel_mps`.
pub fn dock_rel_speed_mps(vel: DVec3) -> f64 {
    dvec3_length(dvec3_sub(vel, tenebris_core::station::orbit_vel(world_time::seconds())))
}

/// True when `vel` is matched closely enough for the dock to accept.
pub fn dock_speed_ok(vel: DVec3) -> bool {
    dock_rel_speed_mps(vel) <= tenebris_core::station::config().dock_max_rel_mps as f64
}

/// Per-frame while the hub is open: carry the docked player along the
/// orbit (anchor + captured offset, velocity = station velocity) so
/// closing the hub leaves them flying formation with the station.
pub fn carry_docked_player() {
    if !is_open() {
        return;
    }
    S.with(|c| {
        let s = c.borrow();
        let Some(player) = s.player.clone() else { return };
        let t = world_time::seconds();
        let mut p = player.borrow_mut();
        let anchor = tenebris_core::station::orbit_pos(t);
        p.position = dvec3_make(
            anchor.x + s.dock_offset.x,
            anchor.y + s.dock_offset.y,
            anchor.z + s.dock_offset.z,
        );
        p.velocity = tenebris_core::station::orbit_vel(t);
    });
}

fn kv_key() -> String {
    format!("tenebris-c:station:{}", menu::active_world())
}

fn persist(state: &StationState) {
    client_kv::set(&kv_key(), &state.serialize());
}

pub fn is_open() -> bool {
    S.with(|c| c.borrow().open)
}

pub fn close() {
    S.with(|c| c.borrow_mut().open = false);
    sokol::app::lock_mouse(true);
}

/// Dock: load the persisted station state for this world and open the hub.
pub fn open(player: PlayerHandle) {
    S.with(|c| {
        let s = &mut *c.borrow_mut();
        s.state = client_kv::get(&kv_key())
            .and_then(|b| StationState::parse(&b))
            .unwrap_or_default();
        /* Capture where the player sits relative to the moving anchor so
         * carry_docked_player keeps them there for the whole visit. */
        s.dock_offset = dvec3_sub(player.borrow().position, station_pos());
        s.player = Some(player);
        s.tab = Tab::Trade;
        s.open = true;
    });
    sokol::app::lock_mouse(false);
    sokol::app::show_mouse(true);
}

/// Swallow input while open; Esc closes.
pub fn event(e: &sokol::app::Event) -> bool {
    if !is_open() {
        return false;
    }
    if e._type == sokol::app::EventType::KeyDown && e.key_code == sokol::app::Keycode::Escape {
        close();
    }
    true
}

pub fn egui_ui(ctx: &egui::Context) {
    if !is_open() {
        return;
    }
    let t = world_time::seconds();
    let mut do_close = false;

    S.with(|c| {
        let s = &mut *c.borrow_mut();
        let Some(player) = s.player.clone() else { return };
        let mut p = player.borrow_mut();
        let mut dirty = false;

        egui::Window::new("Trading Station")
            .resizable(false)
            .collapsible(false)
            .anchor(egui::Align2::CENTER_CENTER, egui::Vec2::ZERO)
            .show(ctx, |ui| {
                ui.set_min_width(430.0);
                ui.horizontal(|ui| {
                    ui.selectable_value(&mut s.tab, Tab::Trade, "Trade");
                    ui.selectable_value(&mut s.tab, Tab::Warehouse, "Warehouse");
                    ui.selectable_value(&mut s.tab, Tab::Fuel, "Fuel");
                    ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                        ui.label(
                            egui::RichText::new(format!("{} cr", p.wallet.credits()))
                                .strong()
                                .color(egui::Color32::from_rgb(0xf0, 0xd8, 0x60)),
                        );
                    });
                });
                ui.separator();

                match s.tab {
                    Tab::Trade => {
                        egui::ScrollArea::vertical().max_height(340.0).show(ui, |ui| {
                            egui::Grid::new("station-trade")
                                .num_columns(6)
                                .spacing([10.0, 6.0])
                                .striped(true)
                                .show(ui, |ui| {
                                    for (item, _) in tenebris_core::station::priced_items() {
                                        let have =
                                            p.bag.count_of(item) + s.state.warehouse_count(item);
                                        ui_icons::slot(ui, item, 1, 26.0, None);
                                        ui.label(
                                            items::display_name(item)
                                                .unwrap_or_else(|| "?".to_string()),
                                        );
                                        let buy =
                                            s.state.buy_price(item, t).unwrap_or(0.0);
                                        let sell =
                                            s.state.sell_price(item, t).unwrap_or(0.0);
                                        ui.label(format!("buy {:.0}", buy.ceil()));
                                        ui.label(format!("sell {:.0}", sell.floor()));
                                        if ui.small_button("Buy").clicked()
                                            && s.state.buy(&mut p.wallet, item, 1, t)
                                        {
                                            dirty = true;
                                        }
                                        let can_sell = have > 0;
                                        if ui
                                            .add_enabled(
                                                can_sell,
                                                egui::Button::new("Sell").small(),
                                            )
                                            .clicked()
                                        {
                                            /* Bag first, then warehouse stock. */
                                            let from_bag = p.bag.take(item, 1) == 1;
                                            let ok = from_bag
                                                || s.state.warehouse_take(item, 1) == 1;
                                            if ok {
                                                s.state.sell(&mut p.wallet, item, 1, t);
                                                dirty = true;
                                            }
                                        }
                                        ui.end_row();
                                    }
                                });
                        });
                        ui.add_space(4.0);
                        ui.label(
                            egui::RichText::new(
                                "prices drift with the market - dumping stock lowers the payout",
                            )
                            .size(12.0)
                            .color(egui::Color32::from_rgb(0x9a, 0xa2, 0xb2)),
                        );
                    }
                    Tab::Warehouse => {
                        ui.label(format!(
                            "Tier {}  -  {} / {} slots used",
                            s.state.tier + 1,
                            s.state.warehouse.len(),
                            s.state.warehouse_slots()
                        ));
                        ui.add_space(6.0);
                        let cols = 9usize;
                        egui::Grid::new("station-wh").spacing([4.0, 4.0]).show(ui, |ui| {
                            for i in 0..s.state.warehouse_slots() as usize {
                                let (item, count) = s
                                    .state
                                    .warehouse
                                    .get(i)
                                    .copied()
                                    .unwrap_or((0, 0));
                                /* Click a filled slot to move one item to the bag. */
                                if ui_icons::slot(ui, item, count, 34.0, None).clicked()
                                    && count > 0
                                    && p.bag.room_for(item, 1)
                                {
                                    if s.state.warehouse_take(item, 1) == 1 {
                                        p.bag.add(item, 1);
                                        dirty = true;
                                    }
                                }
                                if (i + 1) % cols == 0 {
                                    ui.end_row();
                                }
                            }
                        });
                        ui.add_space(8.0);
                        match s.state.upgrade_cost() {
                            Some(cost) => {
                                if ui
                                    .button(format!("Upgrade warehouse ({} cr)", cost))
                                    .clicked()
                                    && s.state.try_upgrade(&mut p.wallet)
                                {
                                    dirty = true;
                                }
                            }
                            None => {
                                ui.label("warehouse fully upgraded");
                            }
                        }
                        ui.add_space(4.0);
                        ui.label(
                            egui::RichText::new("click a slot to move one item to your bag")
                                .size(12.0)
                                .color(egui::Color32::from_rgb(0x9a, 0xa2, 0xb2)),
                        );
                    }
                    Tab::Fuel => {
                        let price = economy::config().fuel_price_per_unit;
                        ui.label(format!("Rocket fuel: {:.1} cr per unit", price));
                        let (fuel, cap) = crate::rocket_ride::active_fuel();
                        if crate::rocket_ride::is_riding() {
                            ui.label(format!(
                                "Docked rocket stage: {:.0} / {:.0} fuel",
                                fuel, cap
                            ));
                            let room = (cap - fuel).max(0.0);
                            let batch = room.min(10.0);
                            let cost = (price * batch).ceil() as i64;
                            if ui
                                .add_enabled(
                                    batch > 0.0,
                                    egui::Button::new(format!(
                                        "Buy {:.0} fuel ({} cr)",
                                        batch, cost
                                    )),
                                )
                                .clicked()
                                && s.state.buy_fuel(&mut p.wallet, batch).is_some()
                            {
                                crate::rocket_ride::refuel(batch);
                                dirty = true;
                            }
                        } else {
                            ui.label(
                                egui::RichText::new(
                                    "dock while riding a rocket to top up its tanks",
                                )
                                .color(egui::Color32::from_rgb(0x9a, 0xa2, 0xb2)),
                            );
                        }
                    }
                }

                ui.add_space(10.0);
                if ui.button("Undock").clicked() {
                    do_close = true;
                }
                ui.add_space(6.0);
            });

        if dirty {
            /* Same-frame persistence: station state AND the wallet (the pose
             * record carries credits; write it through the autosave path by
             * just saving the station blob here - the wallet rides the next
             * pose save, and the authoritative earn/spend already happened). */
            persist(&s.state);
        }
    });

    if do_close {
        close();
    }
}
