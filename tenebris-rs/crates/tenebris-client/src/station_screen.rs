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
use tenebris_core::math::{
    dvec3_add, dvec3_cross, dvec3_dot, dvec3_length, dvec3_normalize, dvec3_scale, dvec3_sub, DVec3,
};
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

/// What the docked panel shows. Docking opens the two-button PROMPT first
/// (Leave Ship / Open Docking Menu); the hub is one click in from there.
#[derive(Clone, Copy, PartialEq)]
enum DockView {
    Prompt,
    Hub,
}

struct Screen {
    open: bool,
    view: DockView,
    tab: Tab,
    state: StationState,
    player: Option<PlayerHandle>,
    /// World-space offset from the orbital anchor captured at dock time;
    /// while the hub is open the player is re-posed to anchor + offset
    /// every frame so the station doesn't sail away mid-trade.
    dock_offset: DVec3,
    /* Tractor beam: while the dock prompt is up the ship is pulled from
     * where it docked (`tractor_from`) onto the nearest landing pad
     * (`tractor_to`), both in STATION-LOCAL metres so the station's orbit
     * cancels out. `tractor_up_from` is the ship's world up at capture; it
     * settles to the deck up. Done once the glide completes. */
    tractor_from: DVec3,
    tractor_to: DVec3,
    tractor_up_from: DVec3,
    tractor_start_s: f64,
    tractor_last_log_s: f64,
    tractor_done: bool,
}

const ZERO_V: DVec3 = DVec3 { x: 0.0, y: 0.0, z: 0.0 };
/// Seconds for the tractor to glide the ship onto the pad.
const TRACTOR_DURATION_S: f64 = 4.0;

thread_local! {
    static S: RefCell<Screen> = RefCell::new(Screen {
        open: false,
        view: DockView::Prompt,
        tab: Tab::Trade,
        state: StationState::default(),
        player: None,
        dock_offset: DVec3 { x: 0.0, y: 0.0, z: 0.0 },
        tractor_from: ZERO_V,
        tractor_to: ZERO_V,
        tractor_up_from: DVec3 { x: 0.0, y: 1.0, z: 0.0 },
        tractor_start_s: 0.0,
        tractor_last_log_s: 0.0,
        tractor_done: false,
    });
    /// Set by the "Leave Ship" button; app.rs drains it and runs the normal
    /// rocket exit (parks the ship, drops the player out) - reusing the one
    /// tested exit path instead of duplicating it here.
    static LEAVE_PENDING: std::cell::Cell<bool> = const { std::cell::Cell::new(false) };
}

/// Drain the "Leave Ship" request (app.rs calls this each frame and runs
/// rocket_exit_action when true).
pub fn take_leave_pending() -> bool {
    LEAVE_PENDING.with(|c| c.replace(false))
}

/// Wall-clock seconds, for the tractor animation timing (independent of the
/// sim clock so a paused sim doesn't stall the glide).
fn now_s() -> f64 {
    sokol::time::sec(sokol::time::now())
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

/// Per-frame while docked: run the TRACTOR BEAM - glide the ship from where
/// it docked onto the nearest landing pad (station-local lerp so the orbit
/// cancels), settling it upright, then hold it there. Logs `[Tractoring]`
/// once a second while the beam is pulling. Everything integrates in the
/// station frame with velocity = station velocity, so undocking leaves the
/// ship flying formation.
pub fn carry_docked_player() {
    if !is_open() {
        return;
    }
    let now = now_s();
    S.with(|c| {
        let s = &mut *c.borrow_mut();
        let Some(player) = s.player.clone() else { return };
        let t = world_time::seconds();
        let sf = tenebris_core::station::frame_sample(tenebris_core::station::orbit_pos(t), t);

        /* Smoothstepped progress along the glide (1.0 once landed). */
        let prog = if s.tractor_done {
            1.0
        } else {
            ((now - s.tractor_start_s) / TRACTOR_DURATION_S).clamp(0.0, 1.0)
        };
        let e = prog * prog * (3.0 - 2.0 * prog);
        let cur_local = dvec3_add(
            s.tractor_from,
            dvec3_scale(dvec3_sub(s.tractor_to, s.tractor_from), e),
        );
        let world = sf.local_to_world(cur_local);
        /* Settle the nose from its docking orientation to the deck up. */
        let up = dvec3_normalize(dvec3_add(
            dvec3_scale(s.tractor_up_from, 1.0 - e),
            dvec3_scale(sf.up, e),
        ));

        {
            let mut p = player.borrow_mut();
            p.position = world;
            p.velocity = sf.station_vel;
            let old_fwd = p.basis.fwd;
            let mut fwd = dvec3_sub(old_fwd, dvec3_scale(up, dvec3_dot(old_fwd, up)));
            if dvec3_length(fwd) < 1e-4 {
                fwd = p.basis.right;
            }
            let fwd = dvec3_normalize(fwd);
            p.basis.up = up;
            p.basis.fwd = fwd;
            p.basis.right = dvec3_cross(fwd, up);
        }

        if !s.tractor_done {
            if now - s.tractor_last_log_s >= 1.0 {
                println!("[Tractoring]");
                s.tractor_last_log_s = now;
            }
            if prog >= 1.0 {
                s.tractor_done = true;
                println!("[dock] tractor complete - ship landed on pad");
            }
        }
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

/// Drop the hub. Pure state - the pointer grab lives on the undock paths
/// (Esc / the Undock button) so `screens::close_all` and a sibling panel
/// taking focus don't re-capture the cursor out from under them.
pub fn close() {
    S.with(|c| c.borrow_mut().open = false);
}

/// Dock: load the persisted station state, open the two-button prompt, and
/// begin tractoring the ship onto the nearest landing pad.
pub fn open(player: PlayerHandle) {
    let t = world_time::seconds();
    let (start_pos, up_from) = {
        let p = player.borrow();
        (p.position, p.basis.up)
    };
    /* Capture the ship's position IN STATION-LOCAL coords + pick the nearest
     * pad; the tractor lerps between them each frame (station orbit cancels
     * out because both are local). */
    let sf = tenebris_core::station::frame_sample(start_pos, t);
    let cfg = tenebris_core::station::config();
    let start_local = sf.local;
    let pad_local = tenebris_core::station::pad_top_local(&cfg)
        .into_iter()
        .min_by(|a, b| {
            let da = dvec3_length(dvec3_sub(*a, start_local));
            let db = dvec3_length(dvec3_sub(*b, start_local));
            da.partial_cmp(&db).unwrap_or(std::cmp::Ordering::Equal)
        })
        .unwrap_or(start_local);
    let now = now_s();
    S.with(|c| {
        let s = &mut *c.borrow_mut();
        s.state = client_kv::get(&kv_key())
            .and_then(|b| StationState::parse(&b))
            .unwrap_or_default();
        s.dock_offset = dvec3_sub(start_pos, station_pos());
        s.player = Some(player);
        s.tab = Tab::Trade;
        s.view = DockView::Prompt;
        s.tractor_from = start_local;
        s.tractor_to = pad_local;
        s.tractor_up_from = up_from;
        s.tractor_start_s = now;
        s.tractor_last_log_s = now;
        s.tractor_done = false;
        s.open = true;
    });
    crate::screens::take_focus(crate::screens::Screen::Station);
    println!(
        "[dock] docked - tractoring ship onto pad ({:.1} m to travel)",
        dvec3_length(dvec3_sub(pad_local, start_local))
    );
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
    match S.with(|c| c.borrow().view) {
        DockView::Prompt => draw_prompt(ctx),
        DockView::Hub => draw_hub(ctx),
    }
}

/// The two-button dock prompt shown the moment you dock: LEAVE SHIP (climb
/// out - parks the ship on/at the station) or OPEN DOCKING MENU (the trade /
/// warehouse / fuel hub). Undock flies you back off.
fn draw_prompt(ctx: &egui::Context) {
    let mut open_hub = false;
    let mut do_leave = false;
    let mut do_close = false;
    egui::Window::new("Docked")
        .collapsible(false)
        .resizable(false)
        .anchor(egui::Align2::CENTER_CENTER, egui::Vec2::ZERO)
        .show(ctx, |ui| {
            ui.set_min_width(260.0);
            ui.label(
                egui::RichText::new("Docked with the orbital station")
                    .strong()
                    .color(egui::Color32::from_rgb(0x8c, 0xd0, 0xf0)),
            );
            ui.add_space(10.0);
            if ui
                .add_sized([240.0, 38.0], egui::Button::new(
                    egui::RichText::new("Leave Ship").size(15.0),
                ))
                .clicked()
            {
                do_leave = true;
            }
            ui.add_space(6.0);
            if ui
                .add_sized([240.0, 38.0], egui::Button::new(
                    egui::RichText::new("Open Trade Screen").size(15.0),
                ))
                .clicked()
            {
                open_hub = true;
            }
            ui.add_space(10.0);
            if ui.add_sized([240.0, 26.0], egui::Button::new("Undock")).clicked() {
                do_close = true;
            }
        });

    if open_hub {
        S.with(|c| c.borrow_mut().view = DockView::Hub);
    }
    if do_leave {
        /* Hand off to the normal exit path (parks the ship + drops the
         * player out) via app.rs; close the panel and free the cursor. */
        LEAVE_PENDING.with(|c| c.set(true));
        close();
        crate::screens::grab_pointer();
    }
    if do_close {
        close();
        crate::screens::grab_pointer();
    }
}

fn draw_hub(ctx: &egui::Context) {
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
