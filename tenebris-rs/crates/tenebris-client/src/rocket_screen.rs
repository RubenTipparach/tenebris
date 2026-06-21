//! Rocket assembly + test-flight screen - a drawn `sokol_gl` panel (real
//! geometry + hit-tested buttons, labels via `sokol_debugtext`), modelled
//! on `crafting_screen`.
//!
//! Opened with `G`. Lets the player stack crafted rocket parts (from the
//! bag) into a `core::rocket::LaunchPad`, shows the assembly's validity +
//! flight spec, and on LAUNCH runs the core flight simulation live,
//! streaming telemetry (state / altitude / velocity / fuel). This is the
//! text-telemetry stand-in for the 3-D flight controller + camera that
//! land next; the assembly logic and physics are the same core path the
//! 3-D version will use.

use std::cell::RefCell;
use std::rc::Rc;

use sokol::app as sapp;
use sokol::debugtext as sdtx;
use sokol::gl as sgl;

use crate::mobile_ui;
use crate::player_ctrl::PlayerCtrl;
use tenebris_core::items::{ItemId, COMMAND_MODULE, FUEL_TANK, ROCKET_ENGINE};
use tenebris_core::rocket::{self, FlightState, LaunchPad, PartRole, RocketFlight};

pub type PlayerHandle = Rc<RefCell<PlayerCtrl>>;

const PANEL_W: f32 = 460.0;
const PANEL_H: f32 = 380.0;
const TITLE_H: f32 = 44.0;
const CLOSE_PX: f32 = 26.0;
const ROW_H: f32 = 34.0;
const BTN_W: f32 = 70.0;

/// The three buildable part types, in stack order (engine first).
const PART_ROWS: [(ItemId, &str); 3] = [
    (ROCKET_ENGINE, "ENGINE"),
    (FUEL_TANK, "FUEL TANK"),
    (COMMAND_MODULE, "COMMAND MODULE"),
];

#[derive(Default)]
struct Screen {
    open: bool,
    player: Option<PlayerHandle>,
    pad: LaunchPad,
    /// Some while a test flight is running / finished.
    flight: Option<RocketFlight>,
    mouse_x: f32,
    mouse_y: f32,
}

thread_local! {
    static S: RefCell<Screen> = RefCell::new(Screen::default());
}

pub fn init() {
    S.with(|c| *c.borrow_mut() = Screen::default());
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

#[cfg(not(test))]
fn screen_sizef() -> (f32, f32) {
    (sapp::widthf(), sapp::heightf())
}

#[cfg(not(test))]
fn release_pointer() {
    sapp::lock_mouse(false);
    sapp::show_mouse(true);
}

/* Test stand-ins so the module's logic compiles without a live sokol
 * app (mirrors crafting_screen's test_doubles seam). */
#[cfg(test)]
fn screen_sizef() -> (f32, f32) {
    (1280.0, 720.0)
}

#[cfg(test)]
fn release_pointer() {}

fn hit(x: f32, y: f32, w: f32, h: f32, px: f32, py: f32) -> bool {
    px >= x && px < x + w && py >= y && py < y + h
}

fn panel_rect(sw: f32, sh: f32) -> (f32, f32) {
    ((sw - PANEL_W) * 0.5, (sh - PANEL_H) * 0.5)
}

fn close_rect(px: f32, py: f32) -> (f32, f32, f32) {
    (px + PANEL_W - CLOSE_PX - 8.0, py + 9.0, CLOSE_PX)
}

/// Add-button rect for part row `i` (0..3).
fn add_rect(px: f32, py: f32, i: usize) -> (f32, f32, f32, f32) {
    let y = py + TITLE_H + 10.0 + i as f32 * ROW_H;
    (px + PANEL_W - BTN_W - 16.0, y, BTN_W, ROW_H - 8.0)
}

fn remove_rect(px: f32, py: f32) -> (f32, f32, f32, f32) {
    let y = py + TITLE_H + 10.0 + 3.0 * ROW_H + 6.0;
    (px + 16.0, y, 120.0, ROW_H - 8.0)
}

fn launch_rect(px: f32, py: f32) -> (f32, f32, f32, f32) {
    (px + 16.0, py + PANEL_H - 44.0, 150.0, 32.0)
}

fn reset_rect(px: f32, py: f32) -> (f32, f32, f32, f32) {
    (px + PANEL_W - 16.0 - 150.0, py + PANEL_H - 44.0, 150.0, 32.0)
}

fn part_count(pad: &LaunchPad, role: PartRole) -> usize {
    pad.parts().iter().filter(|&&id| rocket::part_role(id) == Some(role)).count()
}

fn role_of(id: ItemId) -> PartRole {
    rocket::part_role(id).unwrap_or(PartRole::Engine)
}

/// Step the live test flight (auto full-throttle) while the screen is up.
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

/// Toggle / click handling. Returns true if the event was consumed.
pub fn handle_event(e: &sapp::Event, player: Option<PlayerHandle>) -> bool {
    S.with(|c| c.borrow_mut().player = player);

    if e._type == sapp::EventType::KeyDown && e.key_code == sapp::Keycode::G {
        let now_open = S.with(|c| {
            let s = &mut *c.borrow_mut();
            s.open = !s.open;
            s.open
        });
        if now_open {
            // mutually exclusive with the other survival overlays
            crate::crafting_screen::close();
            crate::inventory_screen::close();
            release_pointer();
        }
        return true;
    }

    if !is_open() {
        return false;
    }

    if e._type == sapp::EventType::MouseMove {
        S.with(|c| {
            let s = &mut *c.borrow_mut();
            s.mouse_x = e.mouse_x;
            s.mouse_y = e.mouse_y;
        });
    }

    if e._type == sapp::EventType::KeyDown && e.key_code == sapp::Keycode::Escape {
        close();
        return true;
    }

    if e._type == sapp::EventType::MouseDown && e.mouse_button == sapp::Mousebutton::Left {
        return handle_click(e.mouse_x, e.mouse_y);
    }
    // Swallow everything else while open.
    true
}

fn handle_click(px_in: f32, py_in: f32) -> bool {
    let (sw, sh) = screen_sizef();
    let (px, py) = panel_rect(sw, sh);

    let (cx, cy, cs) = close_rect(px, py);
    if hit(cx, cy, cs, cs, px_in, py_in) {
        close();
        return true;
    }

    S.with(|c| {
        let s = &mut *c.borrow_mut();
        let Some(player) = s.player.clone() else { return true };

        // RESET (after a flight): clear it back to assembly.
        if s.flight.is_some() {
            let (rx, ry, rw, rh) = reset_rect(px, py);
            if hit(rx, ry, rw, rh, px_in, py_in) {
                s.flight = None;
            }
            return true; // telemetry view swallows other clicks
        }

        // LAUNCH: board the assembled rocket if valid.
        let (lx, ly, lw, lh) = launch_rect(px, py);
        if hit(lx, ly, lw, lh, px_in, py_in) {
            if let Some(f) = s.pad.board(&rocket::config()) {
                s.flight = Some(f);
            }
            return true;
        }

        // REMOVE TOP: pop a part back into the bag.
        let (rx, ry, rw, rh) = remove_rect(px, py);
        if hit(rx, ry, rw, rh, px_in, py_in) {
            if let Some(id) = s.pad.remove_top() {
                player.borrow_mut().bag.add(id, 1);
            }
            return true;
        }

        // ADD buttons: move a part from the bag onto the stack.
        for (i, (id, _)) in PART_ROWS.iter().enumerate() {
            let (ax, ay, aw, ah) = add_rect(px, py, i);
            if hit(ax, ay, aw, ah, px_in, py_in) {
                let mut p = player.borrow_mut();
                if p.bag.count_of(*id) > 0 && s.pad.add_part(*id) {
                    p.bag.take(*id, 1);
                }
                return true;
            }
        }
        true
    })
}

fn draw_text_at(x: f32, y: f32, scale: f32, r: u8, g: u8, b: u8, text: &str) {
    let cell_px = 8.0 * scale;
    let (sw, sh) = screen_sizef();
    sdtx::canvas(sw / scale, sh / scale);
    sdtx::font(1);
    sdtx::origin(x / cell_px, y / cell_px);
    sdtx::color3b(r, g, b);
    sdtx::home();
    sdtx::puts(text);
    sdtx::font(0);
}

fn button(x: f32, y: f32, w: f32, h: f32, enabled: bool, hovered: bool, label: &str) {
    let (r, g, b) = if !enabled {
        (0.18, 0.18, 0.22)
    } else if hovered {
        (0.20, 0.40, 0.26)
    } else {
        (0.16, 0.28, 0.20)
    };
    mobile_ui::draw_rect(x, y, w, h, r, g, b, 0.95);
    mobile_ui::draw_rect_outline(x, y, w, h, 1.5, 0.70, 0.85, 0.75, 0.9);
    let tc = if enabled { 0xff } else { 0x80 };
    draw_text_at(x + 8.0, y + h * 0.5 - 6.0, 1.25, tc, tc, tc, label);
}

pub fn draw() {
    if !is_open() {
        return;
    }
    let (sw, sh) = screen_sizef();
    if sw <= 0.0 || sh <= 0.0 {
        return;
    }
    let pip = mobile_ui::alpha_pipeline();
    if pip.id == 0 {
        return;
    }

    // Bind ortho + alpha pipeline (mobile_ui leaves them, but be safe).
    sgl::defaults();
    sgl::matrix_mode_projection();
    sgl::load_identity();
    sgl::ortho(0.0, sw, sh, 0.0, -1.0, 1.0);
    sgl::matrix_mode_modelview();
    sgl::load_identity();
    sgl::load_pipeline(pip);

    let (px, py) = panel_rect(sw, sh);

    mobile_ui::draw_rect(0.0, 0.0, sw, sh, 0.02, 0.03, 0.07, 0.55);
    mobile_ui::draw_rect(px, py, PANEL_W, PANEL_H, 0.10, 0.12, 0.18, 0.96);
    mobile_ui::draw_rect_outline(px, py, PANEL_W, PANEL_H, 2.0, 0.85, 0.90, 1.00, 1.0);
    mobile_ui::draw_rect(px, py + TITLE_H - 2.0, PANEL_W, 2.0, 0.85, 0.90, 1.00, 0.5);

    let (cx, cy, cs) = close_rect(px, py);
    let (mx, my) = S.with(|c| {
        let s = c.borrow();
        (s.mouse_x, s.mouse_y)
    });
    mobile_ui::draw_rect(cx, cy, cs, cs, 0.45, 0.10, 0.12, if hit(cx, cy, cs, cs, mx, my) { 0.85 } else { 0.55 });
    mobile_ui::draw_rect_outline(cx, cy, cs, cs, 1.5, 1.00, 0.55, 0.55, 0.95);
    draw_text_at(cx + 7.0, cy + 5.0, 2.0, 0xff, 0xff, 0xff, "X");

    draw_text_at(px + 16.0, py + 12.0, 2.5, 0xff, 0xff, 0xff, "ROCKET");

    S.with(|c| {
        let s = c.borrow();
        let cfg = rocket::config();

        if let Some(f) = s.flight.as_ref() {
            draw_telemetry(px, py, f, mx, my);
            return;
        }

        let bag_count = |id: ItemId| s.player.as_ref().map(|p| p.borrow().bag.count_of(id)).unwrap_or(0);

        // Part rows: bag count + in-stack count + ADD button.
        for (i, (id, name)) in PART_ROWS.iter().enumerate() {
            let y = py + TITLE_H + 10.0 + i as f32 * ROW_H;
            let in_bag = bag_count(*id);
            let on_rocket = part_count(&s.pad, role_of(*id));
            draw_text_at(
                px + 16.0,
                y + 6.0,
                1.4,
                0xd0,
                0xd8,
                0xff,
                &format!("{:<14} bag {}  on rocket {}", name, in_bag, on_rocket),
            );
            let (ax, ay, aw, ah) = add_rect(px, py, i);
            button(ax, ay, aw, ah, in_bag > 0, hit(ax, ay, aw, ah, mx, my), "ADD");
        }

        let (rx, ry, rw, rh) = remove_rect(px, py);
        button(rx, ry, rw, rh, !s.pad.is_empty(), hit(rx, ry, rw, rh, mx, my), "REMOVE TOP");

        // Status: faults or the ready spec.
        let faults = s.pad.faults();
        let status_y = ry + ROW_H + 10.0;
        if faults.is_empty() {
            let spec = s.pad.spec(&cfg);
            draw_text_at(
                px + 16.0,
                status_y,
                1.4,
                0x66,
                0xff,
                0x88,
                "READY TO LAUNCH",
            );
            draw_text_at(
                px + 16.0,
                status_y + 18.0,
                1.25,
                0xc0,
                0xe0,
                0xc0,
                &format!(
                    "thrust {:.0} N   fuel {:.0}   TWR {:.1}",
                    spec.total_thrust_n,
                    spec.fuel_capacity,
                    spec.twr(cfg.flight.gravity_mps2)
                ),
            );
        } else {
            draw_text_at(px + 16.0, status_y, 1.4, 0xff, 0xc0, 0x60, "NOT READY:");
            for (k, f) in faults.iter().take(3).enumerate() {
                draw_text_at(
                    px + 28.0,
                    status_y + 18.0 + k as f32 * 14.0,
                    1.1,
                    0xff,
                    0xb0,
                    0x70,
                    f.message(),
                );
            }
        }

        let (lx, ly, lw, lh) = launch_rect(px, py);
        button(lx, ly, lw, lh, s.pad.is_flyable(), hit(lx, ly, lw, lh, mx, my), "LAUNCH");
    });
}

fn draw_telemetry(px: f32, py: f32, f: &RocketFlight, mx: f32, my: f32) {
    let state = match f.state {
        FlightState::Grounded => "ON THE PAD",
        FlightState::Launching => "LAUNCHING",
        FlightState::InFlight => "IN FLIGHT",
        FlightState::Landing => "PARACHUTE OUT",
        FlightState::Landed => {
            if f.crashed {
                "CRASHED"
            } else {
                "LANDED"
            }
        }
    };
    let y = py + TITLE_H + 16.0;
    let (sr, sg, sb) = if f.state == FlightState::Landed && f.crashed {
        (0xff, 0x70, 0x70)
    } else if f.state == FlightState::Landed {
        (0x66, 0xff, 0x88)
    } else {
        (0xc0, 0xd8, 0xff)
    };
    draw_text_at(px + 16.0, y, 2.0, sr, sg, sb, state);
    draw_text_at(px + 16.0, y + 36.0, 1.4, 0xd0, 0xd8, 0xff, &format!("altitude  {:.0} m", f.altitude_m));
    draw_text_at(px + 16.0, y + 56.0, 1.4, 0xd0, 0xd8, 0xff, &format!("velocity  {:.0} m/s", f.vel_mps));
    draw_text_at(px + 16.0, y + 76.0, 1.4, 0xd0, 0xd8, 0xff, &format!("fuel      {:.0}", f.fuel));

    let (rx, ry, rw, rh) = reset_rect(px, py);
    button(rx, ry, rw, rh, true, hit(rx, ry, rw, rh, mx, my), "BACK");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn part_rows_cover_the_three_part_kinds() {
        let roles: Vec<PartRole> = PART_ROWS.iter().map(|(id, _)| role_of(*id)).collect();
        assert!(roles.contains(&PartRole::Engine));
        assert!(roles.contains(&PartRole::FuelTank));
        assert!(roles.contains(&PartRole::Capsule));
    }

    #[test]
    fn part_count_tallies_the_stack() {
        let mut pad = LaunchPad::new();
        pad.add_part(ROCKET_ENGINE);
        pad.add_part(FUEL_TANK);
        pad.add_part(FUEL_TANK);
        assert_eq!(part_count(&pad, PartRole::Engine), 1);
        assert_eq!(part_count(&pad, PartRole::FuelTank), 2);
        assert_eq!(part_count(&pad, PartRole::Capsule), 0);
    }

    // item names exist for the part rows (used implicitly in the draw).
    #[test]
    fn part_ids_have_definitions() {
        for (id, _) in PART_ROWS {
            assert!(tenebris_core::items::def(id).is_some());
        }
    }
}
