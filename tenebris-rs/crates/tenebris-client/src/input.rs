//! Port of `tenebris-c/src/client/input.{c,h}`.
//!
//! Accumulates sokol_app events (keyboard + mouse + touch) into an
//! [`InputState`]. Touch events drive a virtual joystick (left half /
//! bottom half of the screen) + look drags (right side) + three
//! on-screen buttons (jump / place / break) in the bottom-right corner.
//!
//! # Renames (PORTING.md rule 4 - `input_` prefix dropped)
//!
//! - `input_init()`                  -> `input::init()`
//! - `input_event()`                 -> `input::handle_event()`
//! - `input_state()`                 -> `input::state()` (returns a copy;
//!   the C version returns a const pointer into the global)
//! - `input_state_mut()`             -> `input::state_mut(closure)` (the C
//!   version returns a mutable pointer; Rust can't safely hand out a
//!   `&'static mut` into a thread-local, so callers pass a closure)
//! - `input_consume()`               -> `input::consume()`
//! - `input_set_fly_mode()`          -> `input::set_fly_mode()`
//! - `input_register_mobile_buttons()` -> `input::register_mobile_buttons()`
//! - `input_consume_tp_tap()` etc.   -> `input::consume_tp_tap()` etc.
//! - `tenebris_js_set_move_stick()` etc. (these live in `main_web.c` in
//!   the C tree but mutate input state directly through
//!   `input_state_mut()`) -> `input::js_set_move_stick()` etc. The
//!   `#[no_mangle] extern "C"` wasm-export wrappers that the mobile JS
//!   overlay calls land with the main_web port and will forward here.
//!
//! # Global state
//!
//! The C module keeps a single `static struct S`. sokol apps are
//! single-threaded, so the port uses `thread_local! + RefCell` with
//! free-function accessors. (profiler.rs was still a stub when this
//! module was ported; if a different global-state pattern wins later,
//! unifying this module is mechanical.)
//!
//! # sokol boundary
//!
//! [`handle_event`] consumes `sokol::app::Event` directly - the pinned
//! sokol-rust rev mirrors the modern `sapp_event` (incl. `mouse_dx` /
//! `mouse_dy` and `EventType::Unfocused`) and the struct is plain data
//! with public fields, so tests build synthetic events without a sokol
//! runtime. The handler body also calls four sokol runtime functions
//! (`widthf` / `heightf` / `lock_mouse` / `mouse_locked`); unit tests
//! run headless with no app context, so `#[cfg(test)]` swaps in
//! thread-local doubles for those (the lock double acts like a
//! platform that always grants lock requests). Non-test builds call
//! `sokol::app` directly, matching the C 1:1.
//!
//! Most public items are unused until the later client port waves
//! (player_ctrl, mobile_ui, teleport_menu, main_web) land:
#![allow(dead_code)]

use std::cell::RefCell;

use sokol::app as sapp;
use tenebris_core::physics::PhysInput;

/* ----------------------------------------------------------------------- */

/// Port of `input_state_t`.
#[derive(Clone, Copy, Debug, Default)]
pub struct InputState {
    pub phys: PhysInput,
    /// consumed per-frame
    pub mouse_dx: f32,
    pub mouse_dy: f32,
    pub wheel_dy: f32,
    /* Edge-triggered (true for one frame on press), cleared each frame
     * by consume(). */
    pub left_click: bool,
    pub right_click: bool,
    pub middle_click: bool,
    /* Stays true for as long as the button / break-touch is held.
     * Cleared on release or focus-loss; NOT cleared by consume(). */
    pub left_held: bool,
    pub right_held: bool,
    pub hotbar: [bool; 10],
    pub pointer_locked: bool,

    /* Virtual movement stick (left thumb). Analog in [-1, 1]; mapped
     * into phys.forward/backward/left/right at a 0.3 deadzone. */
    pub stick_x: f32,
    pub stick_y: f32,
    pub stick_active: bool,

    /* Virtual look stick (right thumb). Continuous - consumers multiply
     * by dt and sensitivity and add to mouse_dx/dy. */
    pub look_stick_x: f32,
    pub look_stick_y: f32,
    pub look_stick_active: bool,

    /* Mobile UI button hitboxes (pixels). Updated from renderer each
     * frame so input can test touch-down against them. Any button
     * whose radius is 0 is inactive for this frame. */
    pub btn_break_cx: f32,
    pub btn_break_cy: f32,
    pub btn_break_r: f32,
    pub btn_place_cx: f32,
    pub btn_place_cy: f32,
    pub btn_place_r: f32,
    pub btn_jump_cx: f32,
    pub btn_jump_cy: f32,
    pub btn_jump_r: f32,
    /// opens teleport menu
    pub btn_tp_cx: f32,
    pub btn_tp_cy: f32,
    pub btn_tp_r: f32,
    /* Menu-nav buttons - only active while the teleport menu is open. */
    pub btn_menu_up_cx: f32,
    pub btn_menu_up_cy: f32,
    pub btn_menu_up_r: f32,
    pub btn_menu_down_cx: f32,
    pub btn_menu_down_cy: f32,
    pub btn_menu_down_r: f32,
    pub btn_menu_ok_cx: f32,
    pub btn_menu_ok_cy: f32,
    pub btn_menu_ok_r: f32,
    pub btn_menu_close_cx: f32,
    pub btn_menu_close_cy: f32,
    pub btn_menu_close_r: f32,

    /* Hotbar slot row hit-rects (pixels). hotbar_ui_draw fills these
     * every frame so a touch on the visible hotbar can be classified
     * as a slot select. The row is a strip of slot_count equal-size
     * square slots starting at (x0, y0), pitched by slot_pitch
     * horizontally. slot_count = 0 deactivates the tap dispatch (e.g.
     * on desktop where the keyboard handles selection). */
    pub hotbar_x0: f32,
    pub hotbar_y0: f32,
    pub hotbar_slot_size: f32,
    pub hotbar_slot_pitch: f32,
    pub hotbar_slot_count: i32,

    /* True while we have any touch input going; renderer uses this to
     * decide whether to draw the mobile overlay. */
    pub touch_active: bool,
}

/* ----------------------------------------------------------------------- */

const MAX_TOUCHES: usize = 8;

/// Port of `touch_role_t`.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
enum TouchRole {
    #[default]
    None,
    /// left-thumb virtual movement stick
    Stick,
    /// right-thumb virtual look stick
    LookStick,
    /// drag-to-look fallback (top half)
    Look,
    Break,
    Place,
    Jump,
    /// tap on a hotbar slot - slot index in hotbar_slot
    Hotbar,
    /* Teleport-menu buttons. Edge-triggered - the caller checks for a
     * true value once and is expected to reset it via the
     * consume_menu_* accessors. */
    Tp,
    MenuUp,
    MenuDown,
    MenuOk,
    MenuClose,
}

/// Port of `menu_events_t`. One-shot edge flags set by touch-down on a
/// menu button, consumed by main_web / teleport_menu.
#[derive(Clone, Copy, Debug, Default)]
struct MenuEvents {
    tp_tapped: bool,
    menu_up: bool,
    menu_down: bool,
    menu_ok: bool,
    menu_close: bool,
}

/// Port of `touch_t`.
#[derive(Clone, Copy, Debug, Default)]
struct Touch {
    id: usize,
    role: TouchRole,
    /// valid when role == TouchRole::Hotbar
    hotbar_slot: i32,
    /// where the touch began
    origin_x: f32,
    origin_y: f32,
    /// most recent position
    last_x: f32,
    last_y: f32,
    active: bool,
}

/// Port of the C file's anonymous `static struct { ... } S`.
#[derive(Clone, Copy, Debug, Default)]
struct State {
    /// the public `input_state_t` (named `pub` in C; `pub` is a Rust
    /// keyword)
    pub_: InputState,
    touches: [Touch; MAX_TOUCHES],
    /// Set by touch-jump, cleared by consume(). Never read in the C
    /// module either; kept for 1:1 parity.
    jump_edge: bool,
    survival_toggle_edge: bool,
    /// One-shot: player pressed the eat key (R) this frame.
    eat_edge: bool,
    menu: MenuEvents,
}

thread_local! {
    static S: RefCell<State> = RefCell::new(State::default());
}

/* --------------------------------------------------------------------- */
/* sokol runtime seams - see "sokol boundary" in the module docs. The
 * non-test path is a direct 1:1 forward to sokol::app; tests swap in
 * thread-local doubles because there is no app context to call into. */

#[cfg(not(test))]
fn screen_sizef() -> (f32, f32) {
    (sapp::widthf(), sapp::heightf())
}

#[cfg(not(test))]
fn lock_mouse(lock: bool) {
    sapp::lock_mouse(lock);
}

#[cfg(not(test))]
fn mouse_locked() -> bool {
    sapp::mouse_locked()
}

#[cfg(test)]
use test_doubles::{lock_mouse, mouse_locked, screen_sizef};

#[cfg(test)]
mod test_doubles {
    use std::cell::Cell;

    thread_local! {
        pub static SCREEN: Cell<(f32, f32)> = const { Cell::new((0.0, 0.0)) };
        /// Pointer-lock double: behaves like a platform that always
        /// grants lock requests.
        pub static MOUSE_LOCK: Cell<bool> = const { Cell::new(false) };
    }

    pub fn screen_sizef() -> (f32, f32) {
        SCREEN.with(|c| c.get())
    }

    pub fn lock_mouse(lock: bool) {
        MOUSE_LOCK.with(|c| c.set(lock));
    }

    pub fn mouse_locked() -> bool {
        MOUSE_LOCK.with(|c| c.get())
    }
}

/* ----------------------------------------------------------------------- */

/// Port of `set_key()`.
fn set_key(s: &mut State, k: sapp::Keycode, down: bool) {
    use sapp::Keycode;
    match k {
        Keycode::W => s.pub_.phys.forward = down,
        Keycode::S => s.pub_.phys.backward = down,
        Keycode::A => s.pub_.phys.left = down,
        Keycode::D => s.pub_.phys.right = down,
        Keycode::Space => {
            s.pub_.phys.jump = down;
            s.pub_.phys.fly_up = down;
        }
        Keycode::LeftShift | Keycode::RightShift => s.pub_.phys.sprint = down,
        Keycode::LeftControl | Keycode::RightControl | Keycode::C => {
            s.pub_.phys.fly_down = down;
        }
        Keycode::F => {
            if down {
                s.pub_.phys.fly_mode = !s.pub_.phys.fly_mode;
            }
        }
        Keycode::G => {
            if down {
                s.survival_toggle_edge = true;
            }
        }
        Keycode::R => {
            if down {
                s.eat_edge = true;
            }
        }
        Keycode::Q => s.pub_.phys.roll_left = down,
        Keycode::E => s.pub_.phys.roll_right = down,
        Keycode::Num1
        | Keycode::Num2
        | Keycode::Num3
        | Keycode::Num4
        | Keycode::Num5
        | Keycode::Num6
        | Keycode::Num7
        | Keycode::Num8
        | Keycode::Num9 => {
            if down {
                s.pub_.hotbar[(k as i32 - Keycode::Num1 as i32) as usize] = true;
            }
        }
        Keycode::Num0 => {
            if down {
                s.pub_.hotbar[9] = true;
            }
        }
        _ => {}
    }
}

/* ----------------------------------------------------------------------- */

/// Port of `input_init()`.
pub fn init() {
    S.with(|cell| *cell.borrow_mut() = State::default());
}

/// Port of `input_state()`. Returns a copy (C returns a const pointer
/// into the global).
pub fn state() -> InputState {
    S.with(|cell| cell.borrow().pub_)
}

/// Port of `input_state_mut()`. UI modules (mobile_ui, teleport_menu)
/// publish their own button hitboxes directly into the classification
/// table without needing a setter per field. Callers write to
/// `btn_*_{cx,cy,r}`; a radius of 0 deactivates that button. C returns
/// a mutable pointer; the port passes a closure into the global.
pub fn state_mut<R>(f: impl FnOnce(&mut InputState) -> R) -> R {
    S.with(|cell| f(&mut cell.borrow_mut().pub_))
}

/// Port of `input_consume()`.
pub fn consume() {
    S.with(|cell| {
        let s = &mut *cell.borrow_mut();
        s.pub_.mouse_dx = 0.0;
        s.pub_.mouse_dy = 0.0;
        s.pub_.wheel_dy = 0.0;
        s.pub_.left_click = false;
        s.pub_.right_click = false;
        s.pub_.middle_click = false;
        s.jump_edge = false;
        s.pub_.hotbar = [false; 10];
        /* phys.jump stays as-is: keyboard clears it on KEY_UP; touch
         * clears it when TOUCHES_ENDED fires for the jump button. */
    });
}

/// Port of `input_set_fly_mode()`.
pub fn set_fly_mode(on: bool) {
    S.with(|cell| cell.borrow_mut().pub_.phys.fly_mode = on);
}

/// Port of `input_consume_tp_tap()`.
pub fn consume_tp_tap() -> bool {
    S.with(|cell| {
        let s = &mut *cell.borrow_mut();
        let v = s.menu.tp_tapped;
        s.menu.tp_tapped = false;
        v
    })
}

/// Port of `input_consume_menu_up()`.
pub fn consume_menu_up() -> bool {
    S.with(|cell| {
        let s = &mut *cell.borrow_mut();
        let v = s.menu.menu_up;
        s.menu.menu_up = false;
        v
    })
}

/// Port of `input_consume_menu_down()`.
pub fn consume_menu_down() -> bool {
    S.with(|cell| {
        let s = &mut *cell.borrow_mut();
        let v = s.menu.menu_down;
        s.menu.menu_down = false;
        v
    })
}

/// Port of `input_consume_menu_ok()`.
pub fn consume_menu_ok() -> bool {
    S.with(|cell| {
        let s = &mut *cell.borrow_mut();
        let v = s.menu.menu_ok;
        s.menu.menu_ok = false;
        v
    })
}

/// Port of `input_consume_menu_close()`.
pub fn consume_menu_close() -> bool {
    S.with(|cell| {
        let s = &mut *cell.borrow_mut();
        let v = s.menu.menu_close;
        s.menu.menu_close = false;
        v
    })
}

/// Port of `input_consume_survival_toggle()`. G-key edge for
/// survival-mode toggle.
pub fn consume_survival_toggle() -> bool {
    S.with(|cell| {
        let s = &mut *cell.borrow_mut();
        let v = s.survival_toggle_edge;
        s.survival_toggle_edge = false;
        v
    })
}

/// One-shot: did the player press the eat key (R) this frame?
pub fn consume_eat() -> bool {
    S.with(|cell| {
        let s = &mut *cell.borrow_mut();
        let v = s.eat_edge;
        s.eat_edge = false;
        v
    })
}

/// Port of `input_register_mobile_buttons()`. Renderer tells input
/// where the mobile buttons were placed this frame, so touch hit-tests
/// work.
#[allow(clippy::too_many_arguments)]
pub fn register_mobile_buttons(
    bx: f32,
    by: f32,
    br: f32,
    px: f32,
    py: f32,
    pr: f32,
    jx: f32,
    jy: f32,
    jr: f32,
) {
    S.with(|cell| {
        let p = &mut cell.borrow_mut().pub_;
        p.btn_break_cx = bx;
        p.btn_break_cy = by;
        p.btn_break_r = br;
        p.btn_place_cx = px;
        p.btn_place_cy = py;
        p.btn_place_r = pr;
        p.btn_jump_cx = jx;
        p.btn_jump_cy = jy;
        p.btn_jump_r = jr;
    });
}

/* ----------------------------------------------------------------------- */

/// Port of `find_touch()`.
fn find_touch(touches: &[Touch; MAX_TOUCHES], id: usize) -> Option<usize> {
    (0..MAX_TOUCHES).find(|&i| touches[i].active && touches[i].id == id)
}

/// Port of `alloc_touch()`.
fn alloc_touch(touches: &[Touch; MAX_TOUCHES]) -> Option<usize> {
    (0..MAX_TOUCHES).find(|&i| !touches[i].active)
}

/// Port of `in_circle()`.
fn in_circle(x: f32, y: f32, cx: f32, cy: f32, r: f32) -> bool {
    let dx = x - cx;
    let dy = y - cy;
    (dx * dx + dy * dy) <= (r * r)
}

/// Port of `hotbar_slot_at()`. Returns -1 if (x,y) does NOT hit a
/// hotbar slot, else the 0-based slot index. The hotbar's row is
/// left-aligned at (hotbar_x0, hotbar_y0), slot_count slots of size
/// slot_size pitched horizontally by slot_pitch.
fn hotbar_slot_at(p: &InputState, x: f32, y: f32) -> i32 {
    if p.hotbar_slot_count <= 0 || p.hotbar_slot_size <= 0.0 {
        return -1;
    }
    if y < p.hotbar_y0 || y > p.hotbar_y0 + p.hotbar_slot_size {
        return -1;
    }
    let dx = x - p.hotbar_x0;
    if dx < 0.0 {
        return -1;
    }
    let slot = (dx / p.hotbar_slot_pitch) as i32;
    if slot < 0 || slot >= p.hotbar_slot_count {
        return -1;
    }
    /* dx-into-slot must still land in the slot's size, not the gap. */
    let into = dx - slot as f32 * p.hotbar_slot_pitch;
    if into > p.hotbar_slot_size {
        return -1;
    }
    slot
}

/// Port of `classify_touch()`. Returns (role, hotbar_slot); the slot
/// is -1 unless the role is Hotbar (out-parameter in C).
fn classify_touch(p: &InputState, x: f32, y: f32) -> (TouchRole, i32) {
    /* Menu buttons (only active while the menu is open, i.e. r > 0) win
     * over everything else so a tap on them doesn't leak to the stick
     * or the main-HUD buttons underneath. */
    if p.btn_menu_close_r > 0.0
        && in_circle(x, y, p.btn_menu_close_cx, p.btn_menu_close_cy, p.btn_menu_close_r)
    {
        return (TouchRole::MenuClose, -1);
    }
    if p.btn_menu_up_r > 0.0 && in_circle(x, y, p.btn_menu_up_cx, p.btn_menu_up_cy, p.btn_menu_up_r)
    {
        return (TouchRole::MenuUp, -1);
    }
    if p.btn_menu_down_r > 0.0
        && in_circle(x, y, p.btn_menu_down_cx, p.btn_menu_down_cy, p.btn_menu_down_r)
    {
        return (TouchRole::MenuDown, -1);
    }
    if p.btn_menu_ok_r > 0.0 && in_circle(x, y, p.btn_menu_ok_cx, p.btn_menu_ok_cy, p.btn_menu_ok_r)
    {
        return (TouchRole::MenuOk, -1);
    }

    /* Main HUD buttons. */
    if p.btn_break_r > 0.0 && in_circle(x, y, p.btn_break_cx, p.btn_break_cy, p.btn_break_r) {
        return (TouchRole::Break, -1);
    }
    if p.btn_place_r > 0.0 && in_circle(x, y, p.btn_place_cx, p.btn_place_cy, p.btn_place_r) {
        return (TouchRole::Place, -1);
    }
    if p.btn_jump_r > 0.0 && in_circle(x, y, p.btn_jump_cx, p.btn_jump_cy, p.btn_jump_r) {
        return (TouchRole::Jump, -1);
    }
    if p.btn_tp_r > 0.0 && in_circle(x, y, p.btn_tp_cx, p.btn_tp_cy, p.btn_tp_r) {
        return (TouchRole::Tp, -1);
    }

    /* Hotbar slot taps - mobile-only, hotbar_ui_draw deactivates the
     * row on desktop by setting slot_count = 0. Must win over the
     * bottom-half stick / look-stick zones so a tap-on-slot doesn't
     * leak into the look stick. */
    let slot = hotbar_slot_at(p, x, y);
    if slot >= 0 {
        return (TouchRole::Hotbar, slot);
    }

    let (w, h) = screen_sizef();
    /* Bottom-left quadrant = left-thumb movement stick.
     * Bottom-right quadrant = right-thumb look stick.
     * Top half (either side)  = drag-to-look fallback (mostly desktop). */
    if y > h * 0.5 {
        if x < w * 0.5 {
            return (TouchRole::Stick, -1);
        }
        return (TouchRole::LookStick, -1);
    }
    (TouchRole::Look, -1)
}

/* ----------------------------------------------------------------------- */

/// Port of `compute_stick_offset()`. Normalized stick offset from
/// touch origin, clamped to unit disk. Used by both the movement and
/// look sticks.
fn compute_stick_offset(t: &Touch) -> (f32, f32) {
    let (w, h) = screen_sizef();
    /* Radius in pixels. Tighter than the old 100 px cap so the smaller
     * UI feels tighter under the thumb. */
    let mut radius = (if w < h { w } else { h }) * 0.14;
    if radius > 70.0 {
        radius = 70.0;
    }
    if radius < 40.0 {
        radius = 40.0;
    }
    let dx = t.last_x - t.origin_x;
    let dy = t.last_y - t.origin_y;
    let mut sx = dx / radius;
    let mut sy = -dy / radius; /* screen Y grows down */
    let len = (sx * sx + sy * sy).sqrt();
    if len > 1.0 {
        sx /= len;
        sy /= len;
    }
    (sx, sy)
}

/// Port of `update_stick_from_touch()`.
fn update_stick_from_touch(p: &mut InputState, t: &Touch) {
    let (sx, sy) = compute_stick_offset(t);
    p.stick_x = sx;
    p.stick_y = sy;
    p.stick_active = true;
    p.phys.forward = sy > 0.3;
    p.phys.backward = sy < -0.3;
    p.phys.right = sx > 0.3;
    p.phys.left = sx < -0.3;
}

/// Port of `clear_stick()`.
fn clear_stick(p: &mut InputState) {
    p.stick_x = 0.0;
    p.stick_y = 0.0;
    p.stick_active = false;
    p.phys.forward = false;
    p.phys.backward = false;
    p.phys.left = false;
    p.phys.right = false;
}

/// Port of `update_look_stick_from_touch()`.
fn update_look_stick_from_touch(p: &mut InputState, t: &Touch) {
    let (sx, sy) = compute_stick_offset(t);
    p.look_stick_x = sx;
    p.look_stick_y = sy;
    p.look_stick_active = true;
}

/// Port of `clear_look_stick()`.
fn clear_look_stick(p: &mut InputState) {
    p.look_stick_x = 0.0;
    p.look_stick_y = 0.0;
    p.look_stick_active = false;
}

/* ----------------------------------------------------------------------- */

fn touch_count(e: &sapp::Event) -> usize {
    (e.num_touches.max(0) as usize).min(sapp::MAX_TOUCHPOINTS)
}

/// Port of `handle_touches_began()`.
fn handle_touches_began(s: &mut State, e: &sapp::Event) {
    for tp in &e.touches[..touch_count(e)] {
        if !tp.changed {
            continue;
        }
        let Some(slot) = alloc_touch(&s.touches) else {
            continue;
        };
        let (role, hotbar_slot) = classify_touch(&s.pub_, tp.pos_x, tp.pos_y);
        let mut t = Touch {
            id: tp.identifier,
            role,
            hotbar_slot: -1,
            origin_x: tp.pos_x,
            origin_y: tp.pos_y,
            last_x: tp.pos_x,
            last_y: tp.pos_y,
            active: true,
        };

        match role {
            TouchRole::Stick => update_stick_from_touch(&mut s.pub_, &t),
            TouchRole::LookStick => update_look_stick_from_touch(&mut s.pub_, &t),
            TouchRole::Break => {
                s.pub_.left_click = true;
                s.pub_.left_held = true;
            }
            TouchRole::Place => {
                s.pub_.right_click = true;
                s.pub_.right_held = true;
            }
            TouchRole::Jump => {
                s.jump_edge = true;
                s.pub_.phys.jump = true;
            }
            TouchRole::Hotbar => {
                /* Edge-trigger the per-slot bool the player controller
                 * already consumes for keyboard 1..9; player_update
                 * folds it into inventory_select. */
                if (0..10).contains(&hotbar_slot) {
                    s.pub_.hotbar[hotbar_slot as usize] = true;
                    t.hotbar_slot = hotbar_slot;
                }
            }
            TouchRole::Tp => s.menu.tp_tapped = true,
            TouchRole::MenuUp => s.menu.menu_up = true,
            TouchRole::MenuDown => s.menu.menu_down = true,
            TouchRole::MenuOk => s.menu.menu_ok = true,
            TouchRole::MenuClose => s.menu.menu_close = true,
            _ => {}
        }

        s.touches[slot] = t;
    }
    s.pub_.touch_active = true;
}

/// Port of `handle_touches_moved()`.
fn handle_touches_moved(s: &mut State, e: &sapp::Event) {
    for tp in &e.touches[..touch_count(e)] {
        let Some(slot) = find_touch(&s.touches, tp.identifier) else {
            continue;
        };
        let dx = tp.pos_x - s.touches[slot].last_x;
        let dy = tp.pos_y - s.touches[slot].last_y;
        s.touches[slot].last_x = tp.pos_x;
        s.touches[slot].last_y = tp.pos_y;
        let t = s.touches[slot];
        match t.role {
            TouchRole::Stick => update_stick_from_touch(&mut s.pub_, &t),
            TouchRole::LookStick => update_look_stick_from_touch(&mut s.pub_, &t),
            TouchRole::Look => {
                s.pub_.mouse_dx += dx;
                s.pub_.mouse_dy += dy;
            }
            _ => {}
        }
    }
}

/// Port of `handle_touches_ended()`. Note: like the C, this ends every
/// touch listed in the event regardless of its `changed` flag.
fn handle_touches_ended(s: &mut State, e: &sapp::Event) {
    for tp in &e.touches[..touch_count(e)] {
        let Some(slot) = find_touch(&s.touches, tp.identifier) else {
            continue;
        };
        let role = s.touches[slot].role;
        if role == TouchRole::Stick {
            clear_stick(&mut s.pub_);
        }
        if role == TouchRole::LookStick {
            clear_look_stick(&mut s.pub_);
        }
        if role == TouchRole::Jump {
            s.pub_.phys.jump = false;
        }
        if role == TouchRole::Break {
            s.pub_.left_held = false;
        }
        if role == TouchRole::Place {
            s.pub_.right_held = false;
        }
        s.touches[slot].active = false;
        s.touches[slot].role = TouchRole::None;
    }
    /* Clear touch_active only when zero touches remain. */
    s.pub_.touch_active = s.touches.iter().any(|t| t.active);
}

/* ----------------------------------------------------------------------- */

/// Port of `input_event()`.
pub fn handle_event(e: &sapp::Event) {
    S.with(|cell| {
        let s = &mut *cell.borrow_mut();
        match e._type {
            sapp::EventType::KeyDown => set_key(s, e.key_code, true),
            sapp::EventType::KeyUp => set_key(s, e.key_code, false),

            sapp::EventType::MouseMove => {
                if s.pub_.pointer_locked {
                    /* Per-event delta clamp. Normal fast mouse motion at
                     * 1000 Hz polling produces small per-event deltas
                     * (tens of pixels at most); a single event with a
                     * delta in the hundreds is almost always either a
                     * browser pointer-lock-warp synthetic event or a
                     * stalled-event burst the browser fused into one.
                     * Clamping per event filters those out without
                     * limiting legitimate fast flicks (which spread
                     * across many sub-clamp events). The user-perceived
                     * effect: snap-on-mouse rotation glitches disappear
                     * but 360-degree wrist flicks still work normally.
                     *
                     * The look-stick path on mobile is naturally rate-
                     * bounded so it doesn't need this gate. */
                    const MAX_PER_EVENT_PX: f32 = 200.0;
                    let mut dx = e.mouse_dx;
                    let mut dy = e.mouse_dy;
                    if dx > MAX_PER_EVENT_PX {
                        dx = MAX_PER_EVENT_PX;
                    }
                    if dx < -MAX_PER_EVENT_PX {
                        dx = -MAX_PER_EVENT_PX;
                    }
                    if dy > MAX_PER_EVENT_PX {
                        dy = MAX_PER_EVENT_PX;
                    }
                    if dy < -MAX_PER_EVENT_PX {
                        dy = -MAX_PER_EVENT_PX;
                    }
                    s.pub_.mouse_dx += dx;
                    s.pub_.mouse_dy += dy;
                }
            }

            sapp::EventType::MouseDown => {
                if !s.pub_.pointer_locked && !s.pub_.touch_active {
                    lock_mouse(true);
                }
                if e.mouse_button == sapp::Mousebutton::Left {
                    s.pub_.left_click = true;
                    s.pub_.left_held = true;
                }
                if e.mouse_button == sapp::Mousebutton::Right {
                    s.pub_.right_click = true;
                    s.pub_.right_held = true;
                }
                if e.mouse_button == sapp::Mousebutton::Middle {
                    s.pub_.middle_click = true;
                }
            }
            sapp::EventType::MouseUp => {
                if e.mouse_button == sapp::Mousebutton::Left {
                    s.pub_.left_held = false;
                }
                if e.mouse_button == sapp::Mousebutton::Right {
                    s.pub_.right_held = false;
                }
            }

            sapp::EventType::MouseScroll => {
                s.pub_.wheel_dy += e.scroll_y;
            }

            sapp::EventType::TouchesBegan => handle_touches_began(s, e),
            sapp::EventType::TouchesMoved => handle_touches_moved(s, e),
            sapp::EventType::TouchesEnded | sapp::EventType::TouchesCancelled => {
                handle_touches_ended(s, e)
            }

            sapp::EventType::Unfocused => {
                s.pub_.phys = PhysInput::default();
                s.pub_.left_held = false;
                s.pub_.right_held = false;
                clear_stick(&mut s.pub_);
                clear_look_stick(&mut s.pub_);
            }

            _ => {}
        }
        s.pub_.pointer_locked = mouse_locked();
    });
}

/* --------------------------------------------------------------------- */
/* Ports of the EMSCRIPTEN_KEEPALIVE tenebris_js_set_* hooks from
 * main_web.c. They mutate input state directly (the C versions go
 * through input_state_mut()), so they live here; main_web's wasm
 * export wrappers forward to these. */

/// Port of `tenebris_js_set_move_stick()`.
pub fn js_set_move_stick(x: f64, y: f64, active: bool) {
    S.with(|cell| {
        let p = &mut cell.borrow_mut().pub_;
        if active {
            p.stick_x = x as f32;
            p.stick_y = y as f32;
            p.stick_active = true;
            p.phys.forward = y > 0.3;
            p.phys.backward = y < -0.3;
            p.phys.right = x > 0.3;
            p.phys.left = x < -0.3;
        } else {
            p.stick_x = 0.0;
            p.stick_y = 0.0;
            p.stick_active = false;
            p.phys.forward = false;
            p.phys.backward = false;
            p.phys.left = false;
            p.phys.right = false;
        }
        p.touch_active = true;
    });
}

/// Port of `tenebris_js_set_look_stick()`.
pub fn js_set_look_stick(x: f64, y: f64, active: bool) {
    S.with(|cell| {
        let p = &mut cell.borrow_mut().pub_;
        p.look_stick_x = x as f32;
        p.look_stick_y = y as f32;
        p.look_stick_active = active;
        p.touch_active = true;
    });
}

/// Port of `tenebris_js_set_break()`.
pub fn js_set_break(held: bool) {
    S.with(|cell| {
        let p = &mut cell.borrow_mut().pub_;
        let was = p.left_held;
        p.left_held = held;
        if held && !was {
            p.left_click = true;
        }
        p.touch_active = true;
    });
}

/// Port of `tenebris_js_set_place()`.
pub fn js_set_place(held: bool) {
    S.with(|cell| {
        let p = &mut cell.borrow_mut().pub_;
        let was = p.right_held;
        p.right_held = held;
        if held && !was {
            p.right_click = true;
        }
        p.touch_active = true;
    });
}

/// Port of `tenebris_js_set_jump()`.
pub fn js_set_jump(held: bool) {
    S.with(|cell| {
        let p = &mut cell.borrow_mut().pub_;
        p.phys.jump = held;
        p.phys.fly_up = held;
        p.touch_active = true;
    });
}

/* ----------------------------------------------------------------------- */

#[cfg(test)]
mod tests {
    use super::*;
    use sapp::{Event, EventType, Keycode, Mousebutton, Touchpoint};

    /// Every test starts from a clean module: fresh state, unlocked
    /// pointer, known screen size. (Each #[test] runs on its own
    /// thread so the thread-locals are fresh anyway; this makes it
    /// explicit.)
    fn setup() {
        init();
        test_doubles::MOUSE_LOCK.with(|c| c.set(false));
        test_doubles::SCREEN.with(|c| c.set((800.0, 600.0)));
    }

    fn key(t: EventType, k: Keycode) -> Event {
        Event {
            _type: t,
            key_code: k,
            ..Default::default()
        }
    }

    fn mouse_move(dx: f32, dy: f32) -> Event {
        Event {
            _type: EventType::MouseMove,
            mouse_dx: dx,
            mouse_dy: dy,
            ..Default::default()
        }
    }

    fn mouse_btn(t: EventType, b: Mousebutton) -> Event {
        Event {
            _type: t,
            mouse_button: b,
            ..Default::default()
        }
    }

    fn touch(t: EventType, pts: &[(usize, f32, f32, bool)]) -> Event {
        let mut e = Event {
            _type: t,
            num_touches: pts.len() as i32,
            ..Default::default()
        };
        for (i, &(id, x, y, changed)) in pts.iter().enumerate() {
            e.touches[i] = Touchpoint {
                identifier: id,
                pos_x: x,
                pos_y: y,
                changed,
                ..Default::default()
            };
        }
        e
    }

    /* -- keyboard ------------------------------------------------------ */

    #[test]
    fn wasd_held_state() {
        setup();
        handle_event(&key(EventType::KeyDown, Keycode::W));
        assert!(state().phys.forward);
        handle_event(&key(EventType::KeyDown, Keycode::A));
        handle_event(&key(EventType::KeyDown, Keycode::S));
        handle_event(&key(EventType::KeyDown, Keycode::D));
        let p = state().phys;
        assert!(p.forward && p.backward && p.left && p.right);
        handle_event(&key(EventType::KeyUp, Keycode::W));
        handle_event(&key(EventType::KeyUp, Keycode::A));
        let p = state().phys;
        assert!(!p.forward && !p.left && p.backward && p.right);
    }

    #[test]
    fn space_sets_jump_and_fly_up_and_survives_consume() {
        setup();
        handle_event(&key(EventType::KeyDown, Keycode::Space));
        assert!(state().phys.jump);
        assert!(state().phys.fly_up);
        consume(); /* phys.jump is held-state, not edge */
        assert!(state().phys.jump);
        handle_event(&key(EventType::KeyUp, Keycode::Space));
        assert!(!state().phys.jump);
        assert!(!state().phys.fly_up);
    }

    #[test]
    fn modifier_keys_and_roll() {
        setup();
        handle_event(&key(EventType::KeyDown, Keycode::RightShift));
        assert!(state().phys.sprint);
        handle_event(&key(EventType::KeyUp, Keycode::RightShift));
        assert!(!state().phys.sprint);
        handle_event(&key(EventType::KeyDown, Keycode::C));
        assert!(state().phys.fly_down);
        handle_event(&key(EventType::KeyDown, Keycode::Q));
        handle_event(&key(EventType::KeyDown, Keycode::E));
        assert!(state().phys.roll_left && state().phys.roll_right);
    }

    #[test]
    fn f_toggles_fly_mode_on_down_only() {
        setup();
        handle_event(&key(EventType::KeyDown, Keycode::F));
        assert!(state().phys.fly_mode);
        handle_event(&key(EventType::KeyUp, Keycode::F)); /* no-op */
        assert!(state().phys.fly_mode);
        handle_event(&key(EventType::KeyDown, Keycode::F));
        assert!(!state().phys.fly_mode);
        set_fly_mode(true);
        assert!(state().phys.fly_mode);
    }

    #[test]
    fn g_survival_toggle_is_edge_triggered() {
        setup();
        assert!(!consume_survival_toggle());
        handle_event(&key(EventType::KeyDown, Keycode::G));
        assert!(consume_survival_toggle());
        assert!(!consume_survival_toggle()); /* consumed */
        handle_event(&key(EventType::KeyUp, Keycode::G)); /* no edge on up */
        assert!(!consume_survival_toggle());
    }

    #[test]
    fn hotbar_keys_map_and_consume_clears() {
        setup();
        handle_event(&key(EventType::KeyDown, Keycode::Num1));
        handle_event(&key(EventType::KeyDown, Keycode::Num3));
        handle_event(&key(EventType::KeyDown, Keycode::Num9));
        handle_event(&key(EventType::KeyDown, Keycode::Num0));
        let hb = state().hotbar;
        assert!(hb[0] && hb[2] && hb[8] && hb[9]);
        assert!(!hb[1] && !hb[3]);
        /* KEY_UP never touches the hotbar flags */
        handle_event(&key(EventType::KeyUp, Keycode::Num1));
        assert!(state().hotbar[0]);
        consume();
        assert_eq!(state().hotbar, [false; 10]);
    }

    /* -- mouse --------------------------------------------------------- */

    #[test]
    fn mouse_move_ignored_until_pointer_locked() {
        setup();
        handle_event(&mouse_move(10.0, 5.0));
        assert_eq!(state().mouse_dx, 0.0);
        assert_eq!(state().mouse_dy, 0.0);
        assert!(!state().pointer_locked);
    }

    #[test]
    fn mouse_down_locks_then_deltas_accumulate_with_clamp() {
        setup();
        handle_event(&mouse_btn(EventType::MouseDown, Mousebutton::Left));
        let s = state();
        assert!(s.left_click && s.left_held);
        assert!(s.pointer_locked); /* test double grants the lock request */

        handle_event(&mouse_move(10.0, 5.0));
        handle_event(&mouse_move(-3.0, 2.0));
        let s = state();
        assert_eq!(s.mouse_dx, 7.0);
        assert_eq!(s.mouse_dy, 7.0);

        /* per-event clamp at +/-200 px */
        handle_event(&mouse_move(500.0, -500.0));
        let s = state();
        assert_eq!(s.mouse_dx, 207.0);
        assert_eq!(s.mouse_dy, -193.0);

        consume();
        let s = state();
        assert_eq!(s.mouse_dx, 0.0);
        assert_eq!(s.mouse_dy, 0.0);
        assert!(!s.left_click); /* edge cleared */
        assert!(s.left_held); /* held survives consume */

        handle_event(&mouse_btn(EventType::MouseUp, Mousebutton::Left));
        assert!(!state().left_held);
    }

    #[test]
    fn mouse_buttons_right_and_middle() {
        setup();
        handle_event(&mouse_btn(EventType::MouseDown, Mousebutton::Right));
        assert!(state().right_click && state().right_held);
        handle_event(&mouse_btn(EventType::MouseDown, Mousebutton::Middle));
        assert!(state().middle_click);
        handle_event(&mouse_btn(EventType::MouseUp, Mousebutton::Right));
        assert!(!state().right_held);
        consume();
        let s = state();
        assert!(!s.right_click && !s.middle_click);
    }

    #[test]
    fn mouse_down_during_touch_does_not_request_lock() {
        setup();
        /* any touch (top-half drag-look here) marks touch_active */
        handle_event(&touch(EventType::TouchesBegan, &[(1, 400.0, 100.0, true)]));
        assert!(state().touch_active);
        handle_event(&mouse_btn(EventType::MouseDown, Mousebutton::Left));
        assert!(!state().pointer_locked);
    }

    #[test]
    fn wheel_accumulates_and_consumes() {
        setup();
        handle_event(&Event {
            _type: EventType::MouseScroll,
            scroll_y: 2.5,
            ..Default::default()
        });
        handle_event(&Event {
            _type: EventType::MouseScroll,
            scroll_y: -1.0,
            ..Default::default()
        });
        assert_eq!(state().wheel_dy, 1.5);
        consume();
        assert_eq!(state().wheel_dy, 0.0);
    }

    /* -- touch: sticks --------------------------------------------------- */

    #[test]
    fn bottom_left_touch_drives_move_stick() {
        setup(); /* 800x600 -> radius = min*0.14 = 84 -> clamped to 70 */
        handle_event(&touch(EventType::TouchesBegan, &[(7, 100.0, 500.0, true)]));
        let s = state();
        assert!(s.stick_active && s.touch_active);
        assert_eq!(s.stick_x, 0.0);
        assert_eq!(s.stick_y, 0.0);
        assert!(!s.phys.forward); /* no offset yet */

        /* drag 70 px up -> sy = 1.0 -> forward past the 0.3 deadzone */
        handle_event(&touch(EventType::TouchesMoved, &[(7, 100.0, 430.0, true)]));
        let s = state();
        assert_eq!(s.stick_y, 1.0);
        assert!(s.phys.forward && !s.phys.backward);

        /* drag 30 px right of origin -> sx = 30/70 > 0.3 -> right */
        handle_event(&touch(EventType::TouchesMoved, &[(7, 130.0, 500.0, true)]));
        let s = state();
        assert!((s.stick_x - 30.0 / 70.0).abs() < 1e-6);
        assert!(s.phys.right && !s.phys.forward && !s.phys.left);

        handle_event(&touch(EventType::TouchesEnded, &[(7, 130.0, 500.0, true)]));
        let s = state();
        assert!(!s.stick_active && !s.touch_active);
        assert_eq!(s.stick_x, 0.0);
        assert!(!s.phys.right && !s.phys.forward);
    }

    #[test]
    fn stick_offset_clamps_to_unit_disk() {
        setup();
        handle_event(&touch(EventType::TouchesBegan, &[(1, 100.0, 500.0, true)]));
        /* dx = 140, dy = -140 -> raw (2, 2) -> normalized */
        handle_event(&touch(EventType::TouchesMoved, &[(1, 240.0, 360.0, true)]));
        let s = state();
        let len = (s.stick_x * s.stick_x + s.stick_y * s.stick_y).sqrt();
        assert!((len - 1.0).abs() < 1e-6);
        assert!((s.stick_x - s.stick_y).abs() < 1e-6);
        assert!(s.phys.forward && s.phys.right);
    }

    #[test]
    fn bottom_right_touch_drives_look_stick() {
        setup();
        handle_event(&touch(EventType::TouchesBegan, &[(2, 600.0, 500.0, true)]));
        assert!(state().look_stick_active);
        assert!(!state().stick_active);
        handle_event(&touch(EventType::TouchesMoved, &[(2, 640.0, 470.0, true)]));
        let s = state();
        assert!((s.look_stick_x - 40.0 / 70.0).abs() < 1e-6);
        assert!((s.look_stick_y - 30.0 / 70.0).abs() < 1e-6);
        /* look stick never drives phys movement */
        assert!(!s.phys.forward && !s.phys.right);
        handle_event(&touch(EventType::TouchesCancelled, &[(2, 640.0, 470.0, true)]));
        let s = state();
        assert!(!s.look_stick_active);
        assert_eq!(s.look_stick_x, 0.0);
    }

    #[test]
    fn top_half_touch_is_drag_to_look() {
        setup();
        handle_event(&touch(EventType::TouchesBegan, &[(3, 400.0, 100.0, true)]));
        let s = state();
        assert!(!s.stick_active && !s.look_stick_active);
        /* drag accumulates raw deltas into mouse_dx/dy, no lock needed */
        handle_event(&touch(EventType::TouchesMoved, &[(3, 412.0, 108.0, true)]));
        handle_event(&touch(EventType::TouchesMoved, &[(3, 415.0, 106.0, true)]));
        let s = state();
        assert_eq!(s.mouse_dx, 15.0);
        assert_eq!(s.mouse_dy, 6.0);
    }

    /* -- touch: buttons --------------------------------------------------- */

    #[test]
    fn break_place_jump_buttons() {
        setup();
        register_mobile_buttons(700.0, 500.0, 30.0, 700.0, 560.0, 25.0, 620.0, 560.0, 25.0);

        /* break */
        handle_event(&touch(EventType::TouchesBegan, &[(1, 705.0, 505.0, true)]));
        let s = state();
        assert!(s.left_click && s.left_held);
        consume();
        assert!(!state().left_click && state().left_held);
        handle_event(&touch(EventType::TouchesEnded, &[(1, 705.0, 505.0, true)]));
        assert!(!state().left_held);

        /* place */
        handle_event(&touch(EventType::TouchesBegan, &[(2, 700.0, 560.0, true)]));
        assert!(state().right_click && state().right_held);
        handle_event(&touch(EventType::TouchesEnded, &[(2, 700.0, 560.0, true)]));
        assert!(!state().right_held);

        /* jump: held until the touch ends, survives consume */
        handle_event(&touch(EventType::TouchesBegan, &[(3, 620.0, 560.0, true)]));
        assert!(state().phys.jump);
        consume();
        assert!(state().phys.jump);
        handle_event(&touch(EventType::TouchesEnded, &[(3, 620.0, 560.0, true)]));
        assert!(!state().phys.jump);
    }

    #[test]
    fn zero_radius_button_is_inactive() {
        setup();
        register_mobile_buttons(700.0, 500.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0);
        /* tap where break would be: bottom-right -> falls through to the
         * look stick zone */
        handle_event(&touch(EventType::TouchesBegan, &[(1, 700.0, 500.0, true)]));
        let s = state();
        assert!(!s.left_click && !s.left_held);
        assert!(s.look_stick_active);
    }

    #[test]
    fn tp_and_menu_buttons_are_one_shot_and_win_over_hud() {
        setup();
        register_mobile_buttons(700.0, 500.0, 30.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0);
        state_mut(|p| {
            p.btn_tp_cx = 100.0;
            p.btn_tp_cy = 100.0;
            p.btn_tp_r = 20.0;
            /* menu-close overlaps the break button and must win */
            p.btn_menu_close_cx = 700.0;
            p.btn_menu_close_cy = 500.0;
            p.btn_menu_close_r = 30.0;
            p.btn_menu_up_cx = 200.0;
            p.btn_menu_up_cy = 100.0;
            p.btn_menu_up_r = 20.0;
            p.btn_menu_down_cx = 240.0;
            p.btn_menu_down_cy = 100.0;
            p.btn_menu_down_r = 15.0;
            p.btn_menu_ok_cx = 280.0;
            p.btn_menu_ok_cy = 100.0;
            p.btn_menu_ok_r = 15.0;
        });

        handle_event(&touch(EventType::TouchesBegan, &[(1, 100.0, 100.0, true)]));
        assert!(consume_tp_tap());
        assert!(!consume_tp_tap());

        handle_event(&touch(EventType::TouchesBegan, &[(2, 700.0, 500.0, true)]));
        assert!(consume_menu_close());
        assert!(!state().left_click); /* didn't leak to break */

        handle_event(&touch(EventType::TouchesBegan, &[(3, 200.0, 100.0, true)]));
        handle_event(&touch(EventType::TouchesBegan, &[(4, 240.0, 100.0, true)]));
        handle_event(&touch(EventType::TouchesBegan, &[(5, 280.0, 100.0, true)]));
        assert!(consume_menu_up());
        assert!(consume_menu_down());
        assert!(consume_menu_ok());
        assert!(!consume_menu_up());
    }

    /* -- touch: hotbar ---------------------------------------------------- */

    #[test]
    fn hotbar_tap_selects_slot_and_gap_falls_through() {
        setup();
        state_mut(|p| {
            p.hotbar_x0 = 100.0;
            p.hotbar_y0 = 550.0;
            p.hotbar_slot_size = 40.0;
            p.hotbar_slot_pitch = 50.0;
            p.hotbar_slot_count = 5;
        });

        /* tap inside slot 2: dx = 110, slot = 2, into = 10 <= 40 */
        handle_event(&touch(EventType::TouchesBegan, &[(1, 210.0, 560.0, true)]));
        assert!(state().hotbar[2]);
        assert!(!state().stick_active); /* did not leak into the stick */
        handle_event(&touch(EventType::TouchesEnded, &[(1, 210.0, 560.0, true)]));
        consume();

        /* tap in the gap after slot 2: into = 45 > 40 -> falls through to
         * the bottom-left stick zone */
        handle_event(&touch(EventType::TouchesBegan, &[(2, 245.0, 560.0, true)]));
        assert_eq!(state().hotbar, [false; 10]);
        assert!(state().stick_active);
        handle_event(&touch(EventType::TouchesEnded, &[(2, 245.0, 560.0, true)]));

        /* slot_count = 0 deactivates the row entirely */
        state_mut(|p| p.hotbar_slot_count = 0);
        handle_event(&touch(EventType::TouchesBegan, &[(3, 210.0, 560.0, true)]));
        assert_eq!(state().hotbar, [false; 10]);
    }

    /* -- touch: tracking --------------------------------------------------- */

    #[test]
    fn unchanged_began_points_are_skipped_but_touch_active_still_set() {
        setup();
        handle_event(&touch(EventType::TouchesBegan, &[(1, 100.0, 500.0, false)]));
        let s = state();
        assert!(!s.stick_active); /* skipped: changed == false */
        assert!(s.touch_active); /* C sets this unconditionally */
    }

    #[test]
    fn ended_ignores_changed_flag_and_unknown_ids() {
        setup();
        register_mobile_buttons(0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 620.0, 560.0, 25.0);
        handle_event(&touch(
            EventType::TouchesBegan,
            &[(1, 100.0, 500.0, true), (2, 620.0, 560.0, true)],
        ));
        let s = state();
        assert!(s.stick_active && s.phys.jump);

        /* unknown id: ignored, everything stays */
        handle_event(&touch(EventType::TouchesEnded, &[(99, 0.0, 0.0, true)]));
        let s = state();
        assert!(s.stick_active && s.phys.jump && s.touch_active);

        /* like the C, ended deactivates every listed touch even with
         * changed == false on one of them */
        handle_event(&touch(
            EventType::TouchesEnded,
            &[(1, 100.0, 500.0, false), (2, 620.0, 560.0, true)],
        ));
        let s = state();
        assert!(!s.stick_active && !s.phys.jump && !s.touch_active);
    }

    #[test]
    fn touch_active_clears_only_when_all_touches_end() {
        setup();
        handle_event(&touch(
            EventType::TouchesBegan,
            &[(1, 100.0, 500.0, true), (2, 600.0, 500.0, true)],
        ));
        assert!(state().stick_active && state().look_stick_active);
        handle_event(&touch(EventType::TouchesEnded, &[(2, 600.0, 500.0, true)]));
        let s = state();
        assert!(!s.look_stick_active);
        assert!(s.stick_active && s.touch_active); /* stick touch remains */
        handle_event(&touch(EventType::TouchesEnded, &[(1, 100.0, 500.0, true)]));
        assert!(!state().touch_active);
    }

    /* -- focus loss --------------------------------------------------------- */

    #[test]
    fn unfocused_clears_phys_holds_and_sticks() {
        setup();
        handle_event(&key(EventType::KeyDown, Keycode::W));
        handle_event(&key(EventType::KeyDown, Keycode::F)); /* fly_mode on */
        handle_event(&mouse_btn(EventType::MouseDown, Mousebutton::Left));
        handle_event(&touch(EventType::TouchesBegan, &[(1, 600.0, 500.0, true)]));
        js_set_move_stick(0.5, 0.8, true);

        handle_event(&Event {
            _type: EventType::Unfocused,
            ..Default::default()
        });
        let s = state();
        assert_eq!(s.phys, PhysInput::default()); /* memset incl. fly_mode */
        assert!(!s.left_held && !s.right_held);
        assert!(!s.stick_active && !s.look_stick_active);
        assert_eq!(s.stick_x, 0.0);
        assert_eq!(s.look_stick_x, 0.0);
    }

    /* -- JS virtual-control setters ------------------------------------------ */

    #[test]
    fn js_move_stick_maps_deadzone_and_clears() {
        setup();
        js_set_move_stick(0.5, 0.8, true);
        let s = state();
        assert_eq!(s.stick_x, 0.5);
        assert_eq!(s.stick_y, 0.8);
        assert!(s.stick_active && s.touch_active);
        assert!(s.phys.forward && s.phys.right);
        assert!(!s.phys.backward && !s.phys.left);

        js_set_move_stick(-0.2, -0.9, true);
        let s = state();
        assert!(s.phys.backward && !s.phys.forward);
        assert!(!s.phys.left); /* -0.2 inside the 0.3 deadzone */

        js_set_move_stick(0.0, 0.0, false);
        let s = state();
        assert!(!s.stick_active);
        assert!(!s.phys.forward && !s.phys.backward && !s.phys.left && !s.phys.right);
    }

    #[test]
    fn js_look_stick_passthrough() {
        setup();
        js_set_look_stick(-0.4, 0.6, true);
        let s = state();
        assert!((s.look_stick_x - -0.4).abs() < 1e-6);
        assert!((s.look_stick_y - 0.6).abs() < 1e-6);
        assert!(s.look_stick_active && s.touch_active);
        js_set_look_stick(0.1, 0.2, false);
        let s = state();
        assert!(!s.look_stick_active);
        /* C keeps writing the coords even when inactive */
        assert!((s.look_stick_x - 0.1).abs() < 1e-6);
    }

    #[test]
    fn js_break_place_edge_on_rising_only() {
        setup();
        js_set_break(true);
        assert!(state().left_click && state().left_held);
        consume();
        js_set_break(true); /* still held: no new click edge */
        assert!(!state().left_click && state().left_held);
        js_set_break(false);
        assert!(!state().left_held);

        js_set_place(true);
        assert!(state().right_click && state().right_held);
        consume();
        js_set_place(true);
        assert!(!state().right_click && state().right_held);
        js_set_place(false);
        assert!(!state().right_held);
    }

    #[test]
    fn js_jump_sets_jump_and_fly_up() {
        setup();
        js_set_jump(true);
        let s = state();
        assert!(s.phys.jump && s.phys.fly_up && s.touch_active);
        js_set_jump(false);
        let s = state();
        assert!(!s.phys.jump && !s.phys.fly_up);
    }
}
