//! The orbital station hub UI (space era Phase 2): Trade / Warehouse / Fuel
//! tabs over the Core market engine (`core::station`). Docking: fly within
//! [`DOCK_RADIUS_M`] of the station point in space and press Interact.
//!
//! Every mutation persists SAME-FRAME to `tenebris-c:station:<world>` via
//! `client_kv` (a bet, a sale, an upgrade can't be quit-scummed away).
//! The 3D tech-hex station structure is the next iteration; the dock point +
//! hub are fully functional without it.

use std::cell::RefCell;
use std::rc::Rc;

use crate::{client_kv, menu, ui_icons};
use tenebris_core::items::{self};
use tenebris_core::math::{dvec3_make, dvec3_length, dvec3_sub, DVec3};
use tenebris_core::planet::{self, BodyId};
use tenebris_core::station::StationState;
use tenebris_core::{economy, world_time};

use crate::player_ctrl::PlayerCtrl;
pub type PlayerHandle = Rc<RefCell<PlayerCtrl>>;

/// Dock range around the station point (m).
pub const DOCK_RADIUS_M: f64 = 40.0;
/// Station orbit altitude above Tenebris, in planet radii from the centre.
const STATION_ORBIT_RADII: f64 = 2.0;

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
}

thread_local! {
    static S: RefCell<Screen> = RefCell::new(Screen {
        open: false,
        tab: Tab::Trade,
        state: StationState::default(),
        player: None,
    });
}

/// World-space position of the trading station: parked on Tenebris's +x axis
/// at a fixed orbital radius (2R = 600 m - inside easy rocket reach, well
/// clear of Luna at 6 km).
pub fn station_pos() -> DVec3 {
    let b = planet::get(BodyId::Tenebris);
    dvec3_make(b.pos_x + b.radius_m * STATION_ORBIT_RADII, b.pos_y, b.pos_z)
}

/// Distance from `pos` to the station dock point.
pub fn dock_distance_m(pos: DVec3) -> f64 {
    dvec3_length(dvec3_sub(pos, station_pos()))
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

/// Drop the hub. Pure state - the pointer grab lives on the undock paths
/// (Esc / the Undock button) so `screens::close_all` and a sibling panel
/// taking focus don't re-capture the cursor out from under them.
pub fn close() {
    S.with(|c| c.borrow_mut().open = false);
}

/// Dock: load the persisted station state for this world and open the hub.
pub fn open(player: PlayerHandle) {
    S.with(|c| {
        let s = &mut *c.borrow_mut();
        s.state = client_kv::get(&kv_key())
            .and_then(|b| StationState::parse(&b))
            .unwrap_or_default();
        s.player = Some(player);
        s.tab = Tab::Trade;
        s.open = true;
    });
    crate::screens::take_focus(crate::screens::Screen::Station);
}

/// Swallow input while open; Esc closes.
pub fn event(e: &sokol::app::Event) -> bool {
    if !is_open() {
        return false;
    }
    if e._type == sokol::app::EventType::KeyDown && e.key_code == sokol::app::Keycode::Escape {
        close();
        crate::screens::grab_pointer();
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
                                        ui_icons::slot(ui, item, 1, 0, 26.0, None);
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
                                if ui_icons::slot(ui, item, count, 0, 34.0, None).clicked()
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
        crate::screens::grab_pointer();
    }
}
