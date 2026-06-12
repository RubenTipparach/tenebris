//! Port of `tenebris-c/src/client/chat.{c,h}`.
//!
//! In-game chat. Press Enter to compose, type, Enter to send, Esc to
//! cancel. Recent messages float at the bottom-left and fade out after
//! a few seconds. Every char goes through the same in-game text-input
//! idiom the room JOIN box uses - no `window.prompt`, per CLAUDE.md.
//!
//! Wire path:
//!   client typed text -> net_client send_chat -> MSG_CHAT (C->S)
//!   server filters by room, broadcasts MSG_CHAT (S->C) to peers
//!   net_client decodes -> chat::post_recv pushes into history
//!
//! # Renames (PORTING.md rule 4 - `chat_` prefix dropped)
//!
//! - `chat_init()`          -> `chat::init()`
//! - `chat_shutdown()`      -> `chat::shutdown()`
//! - `chat_clear()`         -> `chat::clear()`
//! - `chat_is_active()`     -> `chat::is_active()`
//! - `chat_event()`         -> `chat::event()`
//! - `chat_draw()`          -> `chat::draw()`
//! - `chat_post_recv()`     -> `chat::post_recv()`
//! - `chat_begin_session()` -> `chat::begin_session()`
//!
//! # Global state
//!
//! The C file's anonymous `static struct { ... } C` becomes a
//! `thread_local! + RefCell` (same pattern as input.rs - sokol apps are
//! single-threaded, and per-thread state keeps unit tests isolated).
//!
//! # sokol boundary (testability)
//!
//! The C draw path interleaves layout math with sgl/sdtx submission.
//! The port factors the pure parts into headless-testable helpers with
//! the same math, same order of operations:
//!
//! - [`visible_indices`]  - the visible-row ring-buffer resolution
//!   (backlog skip + live-window expiry, C's `visible_idx[]` loop).
//! - [`row_alpha`]        - the hold + fade-tail alpha curve.
//! - [`row_colors`]       - the alpha-scaled name/text sdtx colors.
//! - [`blink_on`]         - the compose caret blink phase.
//! - [`compose_layout`]   - compose box / panel pixel layout.
//!
//! [`draw`] submits exactly what those helpers compute, via sokol_gl
//! quads + sokol_debugtext labels, in the same order as the C.
//!
//! `stm_sec(stm_now())` is behind a `now_s()` seam; tests swap in a
//! settable clock (there is no app/time context in the test runner).
//! `settings_chat_fade_s()` stays a live read of `settings::chat_fade_s`
//! like the C; the pure helpers take `fade_hold` as a parameter so fade
//! tests don't depend on the process-global settings value.

// Not wired into the app loop until the main_web port lands (final
// client wave); exercised by unit tests.
#![allow(dead_code)]

use sokol::app as sapp;
use sokol::debugtext as sdtx;
use sokol::gfx as sg;
use sokol::gl as sgl;

use std::cell::{Cell, RefCell};

const CHAT_NAME_MAX: usize = 32;

/// Port of `CHAT_TEXT_MAX` (matches MSG_CHAT_TEXT_LEN-1).
pub const CHAT_TEXT_MAX: usize = 127;
/// Port of `CHAT_HISTORY_MAX` (messages kept in scrollback).
pub const CHAT_HISTORY_MAX: usize = 16;

/* Live-chat visibility: a new message stays on screen for the HOLD
 * window after it arrives, then fades over the last 15 seconds and
 * drops off. The compose box being open always shows the full retained
 * scrollback regardless of age. The HOLD half is runtime-tunable via
 * the Settings menu so a player can shorten the "stuck on screen"
 * duration (default 60 s; was 5 min). The fade tail stays a fixed
 * short trailing curve so messages don't disappear abruptly. */
const CHAT_FADE_OUT_S: f64 = 15.0;

fn chat_fade_hold_s() -> f64 {
    crate::settings::chat_fade_s() as f64
}

/* On a fresh connection the server replays the room's recent chat as
 * a flurry of MSG_CHATs. They reach the client with current-time
 * stamps and would otherwise look like brand-new traffic. Treat any
 * MSG_CHAT received in the first CHAT_JOIN_GRACE_S after
 * begin_session as backlog: stored in scrollback (visible when the
 * compose box opens), suppressed from the floating live panel.
 *
 * Server can take several seconds to deliver its chat backlog after
 * WELCOME on a slow link; bumped from the original 1.5 s so a sluggish
 * replay can't slip past the grace window and land on the floating
 * live panel. */
const CHAT_JOIN_GRACE_S: f64 = 8.0;

/// Port of `chat_msg_t`. The fixed `char[]` buffers become Strings
/// truncated at push time (post_recv) to the same byte budgets the C
/// snprintf enforced.
#[derive(Clone, Debug, Default)]
struct ChatMsg {
    name: String,
    text: String,
    recv_time_s: f64,
    is_backlog: bool,
}

/// Port of the C file's anonymous `static struct { ... } C`.
struct State {
    history: [ChatMsg; CHAT_HISTORY_MAX],
    /// next slot to write (ring buffer)
    head: usize,
    /// number of valid entries (<= MAX)
    count: usize,

    /// compose box open
    active: bool,
    /// `input_buf` + `input_len` fused; ASCII only so len() == char count
    input_buf: String,
    input_blink_start_s: f64,

    /* Session-grace bookkeeping for backlog suppression.
     * session_grace_until_s is monotonic-now + grace at begin_session;
     * comparing inside post_recv decides whether the inbound message
     * is backlog. */
    session_grace_until_s: f64,
}

impl Default for State {
    fn default() -> Self {
        State {
            history: std::array::from_fn(|_| ChatMsg::default()),
            head: 0,
            count: 0,
            active: false,
            input_buf: String::new(),
            input_blink_start_s: 0.0,
            session_grace_until_s: 0.0,
        }
    }
}

thread_local! {
    static S: RefCell<State> = RefCell::new(State::default());
}

/* --------------------------------------------------------------------- */
/* Clock seam - C calls stm_sec(stm_now()) inline; tests have no sokol
 * time context, so they swap in a settable clock. */

#[cfg(not(test))]
fn now_s() -> f64 {
    sokol::time::sec(sokol::time::now())
}

#[cfg(test)]
use test_clock::now_s;

#[cfg(test)]
mod test_clock {
    use std::cell::Cell;

    thread_local! {
        pub static NOW_S: Cell<f64> = const { Cell::new(0.0) };
    }

    pub fn now_s() -> f64 {
        NOW_S.with(|c| c.get())
    }

    pub fn set(t: f64) {
        NOW_S.with(|c| c.set(t));
    }
}

/* --------------------------------------------------------------------- */

/// Port of `chat_init()`.
pub fn init() {
    S.with(|cell| *cell.borrow_mut() = State::default());
}

/// Port of `chat_shutdown()`.
pub fn shutdown() {}

/// Returns true if the chat compose box is open and consuming input.
/// main_web gates player look / movement input on this so typing
/// doesn't also strafe the camera.
pub fn is_active() -> bool {
    S.with(|cell| cell.borrow().active)
}

/// Wipe every retained message + close the compose box. Called on any
/// transition INTO a gameplay state (SP entry, MP welcome) so the
/// floating live panel doesn't auto-open with stale chatter from a
/// previous session.
pub fn clear() {
    S.with(|cell| {
        let s = &mut *cell.borrow_mut();
        /* Drop the retained history wholesale - the visible-row filter
         * + compose-box scrollback both read from history, so once
         * count is zero the floating panel can't show any pre-session
         * messages. Keep session_grace_until_s alone here: callers
         * that need a grace window (begin_session) set it themselves
         * AFTER this clear. */
        s.head = 0;
        s.count = 0;
        s.active = false;
        s.input_buf.clear();
    });
}

/// Signal that a fresh server session just started. The next
/// CHAT_JOIN_GRACE_S seconds of received messages are tagged as backlog
/// (the server replays the room's recent chat history at WELCOME) and
/// hidden from the live floating-chat panel - they only appear when the
/// compose box is opened. Idempotent: re-arming on a second WELCOME
/// just resets the window.
pub fn begin_session() {
    /* Fresh session = no history. Anything that arrived before this
     * point belongs to an earlier session and must not bleed into the
     * new one. The server's first wave of MSG_CHAT replay then lands
     * inside the join-grace window below and is marked backlog as it
     * arrives - so the floating panel stays silent until a TRULY live
     * message comes through. */
    clear();
    S.with(|cell| {
        cell.borrow_mut().session_grace_until_s = now_s() + CHAT_JOIN_GRACE_S;
    });
}

/// snprintf-style byte truncation. The C cut at a byte budget without
/// caring about UTF-8; the port additionally backs off to a char
/// boundary so the String stays valid - identical for the ASCII wire.
fn truncate_bytes(s: &str, max: usize) -> &str {
    if s.len() <= max {
        return s;
    }
    let mut end = max;
    while !s.is_char_boundary(end) {
        end -= 1;
    }
    &s[..end]
}

/// Push a message into local history. Called by net_client when it
/// decodes MSG_CHAT (whether it originated locally or from a peer).
/// `name` is the display string from the name cache; "system" for
/// server-emitted notices in the future.
pub fn post_recv(player_id: u32, name: &str, text: &str) {
    let _ = player_id;
    if text.is_empty() {
        return;
    }
    S.with(|cell| {
        let s = &mut *cell.borrow_mut();
        let grace = s.session_grace_until_s;
        let head = s.head;
        let m = &mut s.history[head];
        m.name = truncate_bytes(if name.is_empty() { "?" } else { name }, CHAT_NAME_MAX - 1)
            .to_string();
        m.text = truncate_bytes(text, CHAT_TEXT_MAX).to_string();
        m.recv_time_s = now_s();
        m.is_backlog = m.recv_time_s < grace;
        s.head = (s.head + 1) % CHAT_HISTORY_MAX;
        if s.count < CHAT_HISTORY_MAX {
            s.count += 1;
        }
    });
}

/* ----------------------------------------------------------------- */
/* Input                                                              */
/* ----------------------------------------------------------------- */

fn open_compose(s: &mut State) {
    s.active = true;
    s.input_buf.clear();
    s.input_blink_start_s = now_s();
}

fn close_compose(s: &mut State) {
    s.active = false;
    s.input_buf.clear();
}

fn submit_compose(s: &mut State) {
    if !s.active {
        return;
    }
    if !s.input_buf.is_empty() {
        // TODO(port-net): net_client::send_chat(&s.input_buf) once the
        // net_client port lands (wave 3). The server's broadcast comes
        // back via MSG_CHAT and lands in post_recv just like any peer's
        // message - no need to locally echo here.
    }
    close_compose(s);
}

fn append_char(s: &mut State, ch: u32) {
    if !s.active {
        return;
    }
    if s.input_buf.len() >= CHAT_TEXT_MAX {
        return;
    }
    /* Allow printable ASCII only - sokol_debugtext fonts don't have
     * Unicode coverage and the wire is ASCII anyway. Newline / CR
     * would also break the wire framing. */
    if !(0x20..=0x7e).contains(&ch) {
        return;
    }
    s.input_buf.push(ch as u8 as char);
    s.input_blink_start_s = now_s();
}

fn backspace(s: &mut State) {
    if !s.active || s.input_buf.is_empty() {
        return;
    }
    s.input_buf.pop();
    s.input_blink_start_s = now_s();
}

/// Port of `chat_event()`. Event hook, called from the menu / overlay
/// layer; if chat owns the event (typed character, Enter / Esc /
/// Backspace, or "open chat" keystroke when idle), returns true to
/// swallow it.
pub fn event(e: &sapp::Event) -> bool {
    S.with(|cell| {
        let s = &mut *cell.borrow_mut();
        if s.active {
            if e._type == sapp::EventType::Char {
                append_char(s, e.char_code);
                return true;
            }
            if e._type == sapp::EventType::KeyDown {
                if e.key_code == sapp::Keycode::Enter {
                    submit_compose(s);
                    return true;
                }
                if e.key_code == sapp::Keycode::Escape {
                    close_compose(s);
                    return true;
                }
                if e.key_code == sapp::Keycode::Backspace {
                    backspace(s);
                    return true;
                }
            }
            return true; /* swallow everything while typing */
        }
        /* Idle: Enter opens the compose box. */
        if e._type == sapp::EventType::KeyDown && e.key_code == sapp::Keycode::Enter {
            open_compose(s);
            return true;
        }
        false
    })
}

/* ----------------------------------------------------------------- */
/* Pure layout / state helpers (headless-testable, see module docs)  */
/* ----------------------------------------------------------------- */

/// Compose box + panel pixel layout. C computes these as locals at the
/// top of chat_draw; identical math, identical constants.
#[derive(Clone, Copy, Debug, PartialEq)]
struct ComposeLayout {
    input_h: f32,
    pad: f32,
    input_y: f32,
    input_w: f32,
    input_right: f32,
}

fn compose_layout(screen_w: f32, screen_h: f32) -> ComposeLayout {
    /* Compose box parked above the hotbar so the input + caret don't
     * sit on top of the slot row. The hotbar reserves
     * (BOTTOM_MARGIN + SLOT_SIZE) = 66 px from the bottom; lift the
     * input enough to clear it with a small visual gap. Width is half
     * the screen (pinned to the left margin) per the chat-bar sizing
     * rule - the rest of the bottom-row real estate belongs to the
     * hotbar centred on the right. */
    let input_h = 32.0f32;
    let pad = 12.0f32;
    let hotbar_top = 66.0f32 + 8.0f32; /* hotbar + small gap */
    let input_y = screen_h - input_h - hotbar_top;
    let input_w = (screen_w - pad * 2.0) * 0.5;
    ComposeLayout { input_h, pad, input_y, input_w, input_right: pad + input_w }
}

/// Caret blink phase: C `(((int)(t_since * 2.0)) & 1) == 0`.
fn blink_on(t_since: f64) -> bool {
    (((t_since * 2.0) as i32) & 1) == 0
}

/// Resolve which history entries are visible, newest first. C's
/// `visible_idx[]` loop: when the compose box is open the player is
/// reading back the conversation, so show every retained message
/// regardless of age or backlog flag. Otherwise: only real-time
/// messages received within the live window (hold + fade tail) make it
/// to the floating panel. Backlog (the server's join-time chat replay)
/// stays in scrollback - visible the moment the player opens the
/// compose box - but doesn't pollute the live HUD with already-seen
/// traffic.
fn visible_indices(s: &State, now: f64, fade_hold: f64) -> Vec<usize> {
    let mut visible = Vec::new();
    for i in 0..s.count {
        let idx = (s.head as i64 - 1 - i as i64).rem_euclid(CHAT_HISTORY_MAX as i64) as usize;
        let m = &s.history[idx];
        if !s.active {
            if m.is_backlog {
                continue;
            }
            let age = now - m.recv_time_s;
            if age >= fade_hold + CHAT_FADE_OUT_S {
                break;
            }
        }
        visible.push(idx);
        if visible.len() >= CHAT_HISTORY_MAX {
            break;
        }
    }
    visible
}

/// Hold + fade-tail alpha for one history row. 1.0 through the hold
/// window (and always while composing), then a linear ramp to 0 over
/// the CHAT_FADE_OUT_S tail.
fn row_alpha(active: bool, age: f64, fade_hold: f64) -> f32 {
    let mut alpha = 1.0f32;
    if !active && age > fade_hold {
        alpha = ((fade_hold + CHAT_FADE_OUT_S - age) / CHAT_FADE_OUT_S) as f32;
        if alpha < 0.0 {
            alpha = 0.0;
        }
    }
    alpha
}

/// Alpha-scaled sdtx colors for (name, text) - the C truncating casts
/// `(uint8_t)(0xff * alpha)` reproduced exactly.
fn row_colors(alpha: f32) -> ((u8, u8, u8), (u8, u8, u8)) {
    let name = (
        (0xff as f32 * alpha) as u8,
        (0xd8 as f32 * alpha) as u8,
        (0x80 as f32 * alpha) as u8,
    );
    let text = (
        (0xf0 as f32 * alpha) as u8,
        (0xf0 as f32 * alpha) as u8,
        (0xf8 as f32 * alpha) as u8,
    );
    (name, text)
}

/* ----------------------------------------------------------------- */
/* Draw                                                               */
/* ----------------------------------------------------------------- */

thread_local! {
    static PIP_ALPHA: Cell<sgl::Pipeline> = const { Cell::new(sgl::Pipeline { id: 0 }) };
}

fn ensure_pip() -> sgl::Pipeline {
    let pip = PIP_ALPHA.with(|c| c.get());
    if pip.id != 0 {
        return pip;
    }
    let mut desc = sg::PipelineDesc::new();
    desc.colors[0].blend.enabled = true;
    desc.colors[0].blend.src_factor_rgb = sg::BlendFactor::SrcAlpha;
    desc.colors[0].blend.dst_factor_rgb = sg::BlendFactor::OneMinusSrcAlpha;
    desc.colors[0].blend.src_factor_alpha = sg::BlendFactor::One;
    desc.colors[0].blend.dst_factor_alpha = sg::BlendFactor::One;
    let pip = sgl::make_pipeline(&desc);
    PIP_ALPHA.with(|c| c.set(pip));
    pip
}

fn quad(x: f32, y: f32, w: f32, h: f32, r: f32, g: f32, b: f32, a: f32) {
    sgl::begin_quads();
    sgl::c4f(r, g, b, a);
    sgl::v2f(x, y);
    sgl::v2f(x + w, y);
    sgl::v2f(x + w, y + h);
    sgl::v2f(x, y + h);
    sgl::end();
}

#[allow(clippy::too_many_arguments)]
fn sdtx_text_at(
    s: &str,
    screen_x: f32,
    screen_y: f32,
    screen_w: f32,
    screen_h: f32,
    scale: f32,
    r: u8,
    g: u8,
    b: u8,
) {
    let cell = 8.0 * scale;
    sdtx::canvas(screen_w / scale, screen_h / scale);
    sdtx::font(1);
    sdtx::origin(screen_x / cell, screen_y / cell);
    sdtx::color3b(r, g, b);
    sdtx::home();
    sdtx::puts(s);
    sdtx::font(0);
}

/// Port of `chat_draw()`. Per-frame draw: history bottom-left, compose
/// box at the bottom edge when active. Call from the UI overlay pass.
pub fn draw(screen_w: f32, screen_h: f32) {
    S.with(|cell| {
        let s = &*cell.borrow();
        if s.count == 0 && !s.active {
            return;
        }
        let now = now_s();

        sgl::defaults();
        sgl::matrix_mode_projection();
        sgl::load_identity();
        sgl::ortho(0.0, screen_w, screen_h, 0.0, -1.0, 1.0);
        sgl::matrix_mode_modelview();
        sgl::load_identity();
        let pip = ensure_pip();
        sgl::load_pipeline(pip);

        let l = compose_layout(screen_w, screen_h);
        let (pad, input_y, input_w, input_h, input_right) =
            (l.pad, l.input_y, l.input_w, l.input_h, l.input_right);
        if s.active {
            quad(pad, input_y, input_w, input_h, 0.06, 0.07, 0.10, 0.92);
            /* Border */
            sgl::begin_quads();
            sgl::c4f(0.55, 0.65, 0.85, 0.85);
            let t = 1.5f32;
            sgl::v2f(pad, input_y);
            sgl::v2f(input_right, input_y);
            sgl::v2f(input_right, input_y + t);
            sgl::v2f(pad, input_y + t);
            sgl::v2f(pad, input_y + input_h - t);
            sgl::v2f(input_right, input_y + input_h - t);
            sgl::v2f(input_right, input_y + input_h);
            sgl::v2f(pad, input_y + input_h);
            sgl::v2f(pad, input_y);
            sgl::v2f(pad + t, input_y);
            sgl::v2f(pad + t, input_y + input_h);
            sgl::v2f(pad, input_y + input_h);
            sgl::v2f(input_right - t, input_y);
            sgl::v2f(input_right, input_y);
            sgl::v2f(input_right, input_y + input_h);
            sgl::v2f(input_right - t, input_y + input_h);
            sgl::end();
            /* Blinking caret at end of typed text. */
            let t_since = now - s.input_blink_start_s;
            if blink_on(t_since) {
                let scale = 1.5f32;
                let cell = 8.0f32 * scale;
                let caret_x = pad + 28.0 + cell * s.input_buf.len() as f32;
                quad(caret_x, input_y + 6.0, 2.0, input_h - 12.0, 1.0, 0.95, 0.30, 1.0);
            }
        }

        /* History panel - semi-opaque backdrop only when there's
         * content so it doesn't permanently darken the corner.
         * Resolved indices land in visible[] (visible_indices) so the
         * row-render loop below can walk a dense list without
         * re-deriving the skip conditions (and without subtly
         * diverging on interleaved backlog vs real-time entries, which
         * the previous index-stride approach silently mis-rendered). */
        let fade_hold = chat_fade_hold_s();
        let visible = visible_indices(s, now, fade_hold);
        if !visible.is_empty() {
            let row_h = 18.0f32;
            let panel_h = visible.len() as f32 * row_h + 8.0;
            let panel_w = screen_w * 0.45;
            let panel_x = pad;
            let panel_y = input_y - panel_h - 6.0;
            quad(panel_x, panel_y, panel_w, panel_h, 0.05, 0.06, 0.10, 0.55);
        }
        /* sgl_draw is centralised in main_web's frame end - see comment
         * at that flush site. Calling it here would lock the GPU upload
         * to chat's vertex range and drop every later module's quads. */

        /* Compose-box label + typed text. */
        if s.active {
            sdtx_text_at("> ", pad + 12.0, input_y + 10.0, screen_w, screen_h, 1.5, 0xff, 0xff, 0xff);
            if !s.input_buf.is_empty() {
                sdtx_text_at(
                    &s.input_buf,
                    pad + 28.0,
                    input_y + 10.0,
                    screen_w,
                    screen_h,
                    1.5,
                    0xff,
                    0xff,
                    0xff,
                );
            } else {
                sdtx_text_at(
                    "(say something - Enter to send, Esc to cancel)",
                    pad + 28.0,
                    input_y + 10.0,
                    screen_w,
                    screen_h,
                    1.0,
                    0x55,
                    0x60,
                    0x70,
                );
            }
        }
        /* History rows, newest at the bottom (closest to compose box). */
        if !visible.is_empty() {
            let row_h = 18.0f32;
            let panel_h = visible.len() as f32 * row_h + 8.0;
            let row_x0 = pad + 8.0;
            let panel_y = input_y - panel_h - 6.0;
            for (i, &idx) in visible.iter().enumerate() {
                let m = &s.history[idx];
                let age = now - m.recv_time_s;
                let alpha = row_alpha(s.active, age, fade_hold);
                let (name_c, txt_c) = row_colors(alpha);
                let row_y = panel_y + (visible.len() - 1 - i) as f32 * row_h + 4.0;

                let composed = format!("{}:", m.name);
                sdtx_text_at(
                    &composed, row_x0, row_y, screen_w, screen_h, 1.0, name_c.0, name_c.1, name_c.2,
                );
                let text_x = row_x0 + 8.0 * (m.name.len() + 1) as f32 + 4.0;
                sdtx_text_at(
                    &m.text, text_x, row_y, screen_w, screen_h, 1.0, txt_c.0, txt_c.1, txt_c.2,
                );
            }
        }
    });
}

/* ----------------------------------------------------------------------- */

#[cfg(test)]
mod tests {
    use super::*;
    use sapp::{Event, EventType, Keycode};

    fn setup() {
        init();
        test_clock::set(0.0);
    }

    fn ch(c: char) -> Event {
        Event { _type: EventType::Char, char_code: c as u32, ..Default::default() }
    }

    fn key(k: Keycode) -> Event {
        Event { _type: EventType::KeyDown, key_code: k, ..Default::default() }
    }

    fn type_str(s: &str) {
        for c in s.chars() {
            event(&ch(c));
        }
    }

    fn input_buf() -> String {
        S.with(|cell| cell.borrow().input_buf.clone())
    }

    fn snapshot<R>(f: impl FnOnce(&State) -> R) -> R {
        S.with(|cell| f(&cell.borrow()))
    }

    /* -- ring buffer ----------------------------------------------------- */

    #[test]
    fn post_recv_pushes_and_wraps_ring() {
        setup();
        for i in 0..20 {
            test_clock::set(i as f64);
            post_recv(1, &format!("p{}", i), &format!("msg {}", i));
        }
        snapshot(|s| {
            assert_eq!(s.count, CHAT_HISTORY_MAX);
            assert_eq!(s.head, 20 % CHAT_HISTORY_MAX); /* = 4 */
            /* oldest survivor is msg 4 (msgs 0..3 overwritten) */
            assert_eq!(s.history[4].text, "msg 4");
            assert_eq!(s.history[3].text, "msg 19");
        });
        /* newest-first resolution while composing (everything shows) */
        event(&key(Keycode::Enter));
        let idx = snapshot(|s| visible_indices(s, 100.0, 60.0));
        assert_eq!(idx.len(), CHAT_HISTORY_MAX);
        snapshot(|s| {
            assert_eq!(s.history[idx[0]].text, "msg 19");
            assert_eq!(s.history[idx[15]].text, "msg 4");
        });
    }

    #[test]
    fn post_recv_ignores_empty_text_and_defaults_name() {
        setup();
        post_recv(1, "bob", "");
        snapshot(|s| assert_eq!(s.count, 0));
        post_recv(1, "", "hello");
        snapshot(|s| {
            assert_eq!(s.count, 1);
            assert_eq!(s.history[0].name, "?");
        });
    }

    #[test]
    fn post_recv_truncates_to_c_buffer_budgets() {
        setup();
        let long_name = "n".repeat(64);
        let long_text = "t".repeat(300);
        post_recv(1, &long_name, &long_text);
        snapshot(|s| {
            assert_eq!(s.history[0].name.len(), CHAT_NAME_MAX - 1); /* 31 */
            assert_eq!(s.history[0].text.len(), CHAT_TEXT_MAX); /* 127 */
        });
    }

    /* -- backlog / session grace ------------------------------------------ */

    #[test]
    fn begin_session_clears_and_tags_grace_window_backlog() {
        setup();
        test_clock::set(10.0);
        post_recv(1, "old", "stale chatter");
        test_clock::set(20.0);
        begin_session(); /* grace until 28.0 */
        snapshot(|s| {
            assert_eq!(s.count, 0); /* history wiped */
            assert_eq!(s.session_grace_until_s, 28.0);
        });

        test_clock::set(21.0);
        post_recv(1, "srv", "replayed line"); /* inside grace -> backlog */
        test_clock::set(29.0);
        post_recv(2, "peer", "live line"); /* past grace -> live */
        snapshot(|s| {
            assert!(s.history[0].is_backlog);
            assert!(!s.history[1].is_backlog);
        });

        /* live panel (compose closed): backlog suppressed */
        let idx = snapshot(|s| visible_indices(s, 30.0, 60.0));
        assert_eq!(idx.len(), 1);
        snapshot(|s| assert_eq!(s.history[idx[0]].text, "live line"));

        /* compose open: full scrollback including backlog */
        event(&key(Keycode::Enter));
        let idx = snapshot(|s| visible_indices(s, 30.0, 60.0));
        assert_eq!(idx.len(), 2);
    }

    /* -- expiry / fade timing ---------------------------------------------- */

    #[test]
    fn live_window_expiry_breaks_at_hold_plus_fade() {
        setup();
        test_clock::set(0.0);
        post_recv(1, "a", "old");
        test_clock::set(50.0);
        post_recv(1, "b", "new");

        /* fade_hold 60: at t=74.9 the old message (age 74.9) is still
         * inside hold + 15 */
        let idx = snapshot(|s| visible_indices(s, 74.9, 60.0));
        assert_eq!(idx.len(), 2);

        /* at exactly age == hold + fade the C `>=` drops it (and breaks
         * the scan, but the newer message was already accepted first) */
        let idx = snapshot(|s| visible_indices(s, 75.0, 60.0));
        assert_eq!(idx.len(), 1);
        snapshot(|s| assert_eq!(s.history[idx[0]].text, "new"));

        /* compose open ignores age entirely */
        event(&key(Keycode::Enter));
        let idx = snapshot(|s| visible_indices(s, 1000.0, 60.0));
        assert_eq!(idx.len(), 2);
    }

    #[test]
    fn expiry_break_stops_at_first_expired_row() {
        setup();
        /* Newest-first scan hits the expired newer-older boundary and
         * BREAKS - exactly like the C - so an older-but-somehow-live
         * entry behind it would also be dropped. Pin the break (not
         * continue) semantics: oldest pushed first, so scan order is
         * newest..oldest and the break hides everything older too. */
        test_clock::set(0.0);
        post_recv(1, "a", "ancient");
        test_clock::set(100.0);
        post_recv(1, "b", "fresh");
        let idx = snapshot(|s| visible_indices(s, 110.0, 60.0));
        assert_eq!(idx.len(), 1); /* ancient (age 110 >= 75) dropped */
        snapshot(|s| assert_eq!(s.history[idx[0]].text, "fresh"));
    }

    #[test]
    fn fade_curve_pinned() {
        /* hold window: full alpha */
        assert_eq!(row_alpha(false, 0.0, 60.0), 1.0);
        assert_eq!(row_alpha(false, 60.0, 60.0), 1.0); /* age > hold is strict */
        /* linear tail over 15 s */
        assert!((row_alpha(false, 67.5, 60.0) - 0.5).abs() < 1e-6);
        assert!((row_alpha(false, 72.0, 60.0) - 0.2).abs() < 1e-4);
        /* clamped at zero past the tail */
        assert_eq!(row_alpha(false, 90.0, 60.0), 0.0);
        /* compose open: always full */
        assert_eq!(row_alpha(true, 1e9, 60.0), 1.0);
    }

    #[test]
    fn row_colors_scale_with_alpha_truncating_like_c() {
        assert_eq!(row_colors(1.0), ((0xff, 0xd8, 0x80), (0xf0, 0xf0, 0xf8)));
        assert_eq!(row_colors(0.5), ((127, 108, 64), (120, 120, 124)));
        assert_eq!(row_colors(0.0), ((0, 0, 0), (0, 0, 0)));
    }

    /* -- compose box editing ------------------------------------------------ */

    #[test]
    fn enter_opens_types_enter_submits_and_clears() {
        setup();
        assert!(!is_active());
        /* idle Enter opens */
        assert!(event(&key(Keycode::Enter)));
        assert!(is_active());
        type_str("hello world");
        assert_eq!(input_buf(), "hello world");
        /* Enter submits (send is TODO(port-net)) and closes */
        assert!(event(&key(Keycode::Enter)));
        assert!(!is_active());
        assert_eq!(input_buf(), "");
    }

    #[test]
    fn escape_cancels_without_sending() {
        setup();
        event(&key(Keycode::Enter));
        type_str("never mind");
        assert!(event(&key(Keycode::Escape)));
        assert!(!is_active());
        assert_eq!(input_buf(), "");
        /* idle Escape is NOT chat's event */
        assert!(!event(&key(Keycode::Escape)));
    }

    #[test]
    fn backspace_edits_and_bottoms_out() {
        setup();
        event(&key(Keycode::Enter));
        type_str("abc");
        assert!(event(&key(Keycode::Backspace)));
        assert_eq!(input_buf(), "ab");
        event(&key(Keycode::Backspace));
        event(&key(Keycode::Backspace));
        assert_eq!(input_buf(), "");
        /* backspace on empty stays empty (and is still swallowed) */
        assert!(event(&key(Keycode::Backspace)));
        assert_eq!(input_buf(), "");
    }

    #[test]
    fn char_filter_printable_ascii_only() {
        setup();
        event(&key(Keycode::Enter));
        event(&ch('a'));
        event(&Event { _type: EventType::Char, char_code: 0x1f, ..Default::default() });
        event(&Event { _type: EventType::Char, char_code: 0x7f, ..Default::default() });
        event(&Event { _type: EventType::Char, char_code: 0x20ac, ..Default::default() }); /* euro */
        event(&ch(' '));
        event(&ch('~')); /* 0x7e boundary accepted */
        assert_eq!(input_buf(), "a ~");
    }

    #[test]
    fn input_caps_at_text_max() {
        setup();
        event(&key(Keycode::Enter));
        for _ in 0..(CHAT_TEXT_MAX + 10) {
            event(&ch('x'));
        }
        assert_eq!(input_buf().len(), CHAT_TEXT_MAX);
    }

    #[test]
    fn active_compose_swallows_unrelated_events() {
        setup();
        event(&key(Keycode::Enter));
        /* a WASD key while typing must be swallowed and not edit */
        assert!(event(&key(Keycode::W)));
        assert!(event(&Event { _type: EventType::MouseDown, ..Default::default() }));
        assert_eq!(input_buf(), "");
        assert!(is_active());
        /* idle: unrelated events pass through */
        event(&key(Keycode::Escape));
        assert!(!event(&key(Keycode::W)));
        assert!(!event(&Event { _type: EventType::MouseDown, ..Default::default() }));
    }

    #[test]
    fn typing_resets_caret_blink_clock() {
        setup();
        test_clock::set(5.0);
        event(&key(Keycode::Enter));
        snapshot(|s| assert_eq!(s.input_blink_start_s, 5.0));
        test_clock::set(7.25);
        event(&ch('a'));
        snapshot(|s| assert_eq!(s.input_blink_start_s, 7.25));
        test_clock::set(9.5);
        event(&key(Keycode::Backspace));
        snapshot(|s| assert_eq!(s.input_blink_start_s, 9.5));
    }

    #[test]
    fn caret_blink_phase_pinned() {
        assert!(blink_on(0.0)); /* on for the first half second */
        assert!(blink_on(0.49));
        assert!(!blink_on(0.5)); /* off for the next */
        assert!(!blink_on(0.99));
        assert!(blink_on(1.0)); /* back on */
    }

    /* -- clear ---------------------------------------------------------------- */

    #[test]
    fn clear_wipes_history_and_closes_compose() {
        setup();
        post_recv(1, "a", "one");
        post_recv(1, "b", "two");
        event(&key(Keycode::Enter));
        type_str("draft");
        clear();
        assert!(!is_active());
        assert_eq!(input_buf(), "");
        snapshot(|s| {
            assert_eq!(s.count, 0);
            assert_eq!(s.head, 0);
        });
        let idx = snapshot(|s| visible_indices(s, 0.0, 60.0));
        assert!(idx.is_empty());
    }

    /* -- layout ------------------------------------------------------------- */

    #[test]
    fn compose_layout_pinned() {
        let l = compose_layout(800.0, 600.0);
        assert_eq!(l.input_h, 32.0);
        assert_eq!(l.pad, 12.0);
        /* 600 - 32 - (66 + 8) */
        assert_eq!(l.input_y, 494.0);
        /* (800 - 24) * 0.5 */
        assert_eq!(l.input_w, 388.0);
        assert_eq!(l.input_right, 400.0);
    }

    #[test]
    fn panel_and_row_math_matches_c() {
        /* These mirror the inline locals in chat_draw: row_h 18,
         * panel_h = n*18 + 8, panel_y = input_y - panel_h - 6,
         * row_y = panel_y + (n-1-i)*18 + 4. */
        let l = compose_layout(800.0, 600.0);
        let n = 3usize;
        let panel_h = n as f32 * 18.0 + 8.0;
        assert_eq!(panel_h, 62.0);
        let panel_y = l.input_y - panel_h - 6.0;
        assert_eq!(panel_y, 426.0);
        /* newest row (i = 0) renders at the bottom of the panel */
        let row_y0 = panel_y + (n - 1) as f32 * 18.0 + 4.0;
        assert_eq!(row_y0, 466.0);
        /* caret x at scale 1.5: pad + 28 + 12 * len */
        let caret_x = l.pad + 28.0 + (8.0 * 1.5) * 5.0;
        assert_eq!(caret_x, 100.0);
    }

    #[test]
    fn player_visible_strings_are_ascii() {
        /* The compose hint is the only literal player-facing string. */
        assert!("(say something - Enter to send, Esc to cancel)".is_ascii());
        assert!("> ".is_ascii());
    }
}
