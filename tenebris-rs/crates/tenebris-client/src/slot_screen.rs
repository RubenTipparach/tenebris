//! Slot-machine game UI (space-era casino). Walk up to a slot cabinet on the
//! station and press Interact to open it; bet credits, pull the lever, watch
//! the three reels spin and land. The odds + payouts are Core
//! (`tenebris_core::casino`); this module is the egui presentation + the
//! spin animation, and it mutates the player's wallet on a win/loss.
//!
//! Credits ride the pose autosave (the 10th pose field), same as the station
//! trade hub - a win is banked within the autosave cadence.

use std::cell::RefCell;
use std::rc::Rc;

use tenebris_core::casino::{self, SlotSymbol};

use crate::player_ctrl::PlayerCtrl;
pub type PlayerHandle = Rc<RefCell<PlayerCtrl>>;

/// Total spin time before the last reel lands (seconds).
const SPIN_TIME_S: f64 = 1.4;
/// Extra time each earlier reel lands before the one to its right (a
/// left-to-right settle, like a real machine).
const REEL_STAGGER_S: f64 = 0.35;
/// How fast the reels blur while spinning (symbol swaps per second).
const BLUR_HZ: f64 = 18.0;

struct Screen {
    open: bool,
    player: Option<PlayerHandle>,
    /// Symbols currently shown (the last landed result between spins).
    reels: [SlotSymbol; 3],
    spinning: bool,
    /// sokol-time seconds when the LAST reel lands.
    end_s: f64,
    target: [SlotSymbol; 3],
    /// Bet locked in when this spin started (so a mid-spin config change
    /// can't change what was wagered).
    wager: i64,
    /// Monotonic spin id, folded into the seed so two spins in the same
    /// clock tick still differ.
    counter: u64,
    /// Result banner ("WIN 150 cr!" / "no luck").
    message: String,
    /// Colour tag for the banner: 0 neutral, 1 win, 2 no-funds.
    message_kind: u8,
}

impl Default for Screen {
    fn default() -> Self {
        Screen {
            open: false,
            player: None,
            reels: [SlotSymbol::Cherry, SlotSymbol::Bell, SlotSymbol::Seven],
            spinning: false,
            end_s: 0.0,
            target: [SlotSymbol::Cherry, SlotSymbol::Bell, SlotSymbol::Seven],
            wager: 0,
            counter: 0,
            message: "Pull to spin".to_string(),
            message_kind: 0,
        }
    }
}

thread_local! {
    static S: RefCell<Screen> = RefCell::new(Screen::default());
}

fn now_s() -> f64 {
    sokol::time::sec(sokol::time::now())
}

pub fn is_open() -> bool {
    S.with(|c| c.borrow().open)
}

pub fn close() {
    S.with(|c| c.borrow_mut().open = false);
}

pub fn set_player(player: Option<PlayerHandle>) {
    S.with(|c| c.borrow_mut().player = player);
}

/// Open the slot machine for `player`. Mutually exclusive with the other
/// survival overlays (takes screen focus so the cursor frees for clicking).
pub fn open(player: PlayerHandle) {
    S.with(|c| {
        let s = &mut *c.borrow_mut();
        s.player = Some(player);
        s.open = true;
        s.spinning = false;
        s.message = "Pull to spin".to_string();
        s.message_kind = 0;
    });
    crate::screens::take_focus(crate::screens::Screen::Slot);
}

/// Esc closes and re-grabs the pointer; everything else is swallowed while open.
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

/// When the last reel lands, settle the reels to the target and pay out once.
fn maybe_land(s: &mut Screen, now: f64) {
    if !s.spinning || now < s.end_s {
        return;
    }
    s.spinning = false;
    s.reels = s.target;
    let cfg = casino::slot_config();
    let win = casino::payout(s.reels, s.wager, &cfg);
    if win > 0 {
        if let Some(p) = &s.player {
            p.borrow_mut().wallet.earn(win);
        }
        s.message = format!("WIN {} cr!", win);
        s.message_kind = 1;
    } else {
        s.message = "No luck - spin again".to_string();
        s.message_kind = 0;
    }
}

/// The symbol a reel shows RIGHT NOW: its landed target once it has settled,
/// otherwise a blurred cycling symbol. Reels settle left-to-right.
fn reel_now(s: &Screen, i: usize, now: f64) -> SlotSymbol {
    if !s.spinning {
        return s.reels[i];
    }
    let land = s.end_s - (2 - i) as f64 * REEL_STAGGER_S;
    if now >= land {
        return s.target[i];
    }
    /* Blur: cycle symbols, each reel phase-offset so they don't sync. */
    let step = (now * BLUR_HZ) as u64 + i as u64 * 2;
    SlotSymbol::from_index((step % casino::SLOT_SYMBOL_COUNT as u64) as u8)
}

pub fn egui_ui(ctx: &egui::Context) {
    if !is_open() {
        return;
    }
    let now = now_s();
    let mut do_close = false;
    let mut do_spin = false;

    S.with(|c| {
        let s = &mut *c.borrow_mut();
        maybe_land(s, now);

        let cfg = casino::slot_config();
        let credits = s.player.as_ref().map(|p| p.borrow().wallet.credits()).unwrap_or(0);
        let can_spin = !s.spinning && credits >= cfg.bet;
        let shown = [reel_now(s, 0, now), reel_now(s, 1, now), reel_now(s, 2, now)];

        egui::Window::new("Slot Machine")
            .collapsible(false)
            .resizable(false)
            .anchor(egui::Align2::CENTER_CENTER, egui::Vec2::ZERO)
            .show(ctx, |ui| {
                ui.horizontal(|ui| {
                    ui.label(
                        egui::RichText::new("CASINO")
                            .strong()
                            .color(egui::Color32::from_rgb(0xf0, 0x60, 0xc0)),
                    );
                    ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                        ui.label(
                            egui::RichText::new(format!("{} cr", credits))
                                .strong()
                                .color(egui::Color32::from_rgb(0xf0, 0xd8, 0x60)),
                        );
                    });
                });
                ui.add_space(6.0);

                /* Three reels. */
                let cell = egui::vec2(76.0, 90.0);
                ui.horizontal(|ui| {
                    ui.add_space(6.0);
                    for sym in shown {
                        let (rect, _) = ui.allocate_exact_size(cell, egui::Sense::hover());
                        draw_reel(ui.painter(), rect, sym);
                        ui.add_space(8.0);
                    }
                });
                ui.add_space(8.0);

                /* Result banner. */
                let col = match s.message_kind {
                    1 => egui::Color32::from_rgb(0x6c, 0xe0, 0x7a),
                    2 => egui::Color32::from_rgb(0xe0, 0x70, 0x60),
                    _ => egui::Color32::from_rgb(0xb0, 0xb8, 0xc8),
                };
                ui.label(egui::RichText::new(&s.message).size(15.0).strong().color(col));
                ui.add_space(8.0);

                /* Spin / lever. */
                let label = if s.spinning {
                    "Spinning...".to_string()
                } else {
                    format!("SPIN  (bet {} cr)", cfg.bet)
                };
                let btn = egui::Button::new(egui::RichText::new(label).size(16.0)).min_size(
                    egui::vec2(200.0, 34.0),
                );
                if ui.add_enabled(can_spin, btn).clicked() {
                    do_spin = true;
                }
                if !s.spinning && credits < cfg.bet {
                    ui.label(
                        egui::RichText::new("not enough credits")
                            .size(12.0)
                            .color(egui::Color32::from_rgb(0xe0, 0x70, 0x60)),
                    );
                }

                ui.add_space(6.0);
                ui.collapsing("Payouts", |ui| {
                    ui.label(format!("3x Seven  ->  bet x {:.0}", cfg.triple_seven_mult));
                    ui.label(format!("3x Bar    ->  bet x {:.0}", cfg.triple_bar_mult));
                    ui.label(format!("3 of a kind ->  bet x {:.0}", cfg.triple_any_mult));
                    ui.label(format!("any pair  ->  bet x {:.1}", cfg.pair_mult));
                });

                ui.add_space(6.0);
                if ui.button("Leave").clicked() {
                    do_close = true;
                }
            });

        /* Start a spin: lock the bet, spend it, roll a fresh seed. */
        if do_spin && can_spin {
            if let Some(p) = &s.player {
                let spent = p.borrow_mut().wallet.try_spend(cfg.bet);
                if spent {
                    s.counter = s.counter.wrapping_add(1);
                    let seed = sokol::time::now()
                        ^ s.counter.wrapping_mul(0x9E37_79B9_7F4A_7C15);
                    s.target = casino::spin(seed);
                    s.wager = cfg.bet;
                    s.spinning = true;
                    s.end_s = now + SPIN_TIME_S;
                    s.message = "Good luck!".to_string();
                    s.message_kind = 0;
                }
            }
        }
    });

    if do_close {
        close();
        crate::screens::grab_pointer();
    }
}

/* ------------------------------------------------------------------ */
/* Reel art - real geometry (per the UI rules), one glyph per symbol.  */

fn draw_reel(p: &egui::Painter, rect: egui::Rect, sym: SlotSymbol) {
    /* Cabinet cell: dark inset with a bright frame. */
    p.rect_filled(rect, 5.0, egui::Color32::from_rgb(0x0e, 0x10, 0x16));
    p.rect_stroke(
        rect,
        5.0,
        egui::Stroke::new(2.0, egui::Color32::from_rgb(0x50, 0x40, 0x60)),
        egui::StrokeKind::Inside,
    );
    let c = rect.center();
    let r = 22.0;
    match sym {
        SlotSymbol::Cherry => {
            let red = egui::Color32::from_rgb(0xd8, 0x30, 0x38);
            p.circle_filled(c + egui::vec2(-9.0, 8.0), 12.0, red);
            p.circle_filled(c + egui::vec2(9.0, 8.0), 12.0, red);
            /* Stems meeting up top. */
            let green = egui::Color32::from_rgb(0x5a, 0xb0, 0x50);
            p.line_segment(
                [c + egui::vec2(-9.0, 8.0), c + egui::vec2(2.0, -16.0)],
                egui::Stroke::new(2.5, green),
            );
            p.line_segment(
                [c + egui::vec2(9.0, 8.0), c + egui::vec2(2.0, -16.0)],
                egui::Stroke::new(2.5, green),
            );
        }
        SlotSymbol::Lemon => {
            let y = egui::Color32::from_rgb(0xe4, 0xc8, 0x38);
            p.add(egui::Shape::ellipse_filled(
                c,
                egui::vec2(r, r * 0.72),
                y,
            ));
        }
        SlotSymbol::Bell => {
            let gold = egui::Color32::from_rgb(0xe8, 0xb8, 0x40);
            /* Trapezoid body + a clapper. */
            p.add(egui::Shape::convex_polygon(
                vec![
                    c + egui::vec2(0.0, -20.0),
                    c + egui::vec2(16.0, 14.0),
                    c + egui::vec2(-16.0, 14.0),
                ],
                gold,
                egui::Stroke::NONE,
            ));
            p.rect_filled(
                egui::Rect::from_center_size(c + egui::vec2(0.0, 16.0), egui::vec2(30.0, 6.0)),
                2.0,
                gold,
            );
            p.circle_filled(c + egui::vec2(0.0, 20.0), 4.0, gold);
        }
        SlotSymbol::Bar => {
            let bar = egui::Color32::from_rgb(0xe8, 0xec, 0xf4);
            for k in -1..=1 {
                p.rect_filled(
                    egui::Rect::from_center_size(
                        c + egui::vec2(0.0, k as f32 * 13.0),
                        egui::vec2(46.0, 8.0),
                    ),
                    2.0,
                    bar,
                );
            }
        }
        SlotSymbol::Seven => {
            p.text(
                c,
                egui::Align2::CENTER_CENTER,
                "7",
                egui::FontId::proportional(52.0),
                egui::Color32::from_rgb(0xe8, 0x40, 0x48),
            );
        }
    }
}
