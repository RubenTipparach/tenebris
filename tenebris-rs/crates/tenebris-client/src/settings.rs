//! Port of `tenebris-c/src/client/settings.{c,h}`.
//!
//! Player-tunable runtime settings. Single source of truth for values
//! exposed through the in-game Settings screen (menu). Backed by
//! client_kv so changes survive a reload.
//!
//! Add new fields here as the Settings UI grows; each one gets a
//! get/set pair plus a KV key string. `init` is called once from the
//! main_web boot path to populate from disk before gameplay starts.
//!
//! # Renames
//!
//! `settings_init` -> `settings::init`, `settings_mouse_sensitivity`
//! -> `settings::mouse_sensitivity`, etc. The `SETTINGS_` constant
//! prefix drops to the module path (`settings::MOUSE_SENS_DEFAULT`).
//!
//! # Global state
//!
//! The C file keeps the live values in a static struct `S`; the port
//! mirrors that with a `static Mutex` so the single-threaded sokol app
//! gets the same free-function accessors.

// Not wired into the app loop until the main_web port lands (final
// client wave); exercised by unit tests.
#![allow(dead_code)]

use crate::client_kv;
use std::sync::Mutex;

const KV_KEY_MOUSE_SENS: &str = "tenebris-c:settings:mouse-sens";
const KV_KEY_CHAT_FADE: &str = "tenebris-c:settings:chat-fade-s";
const KV_KEY_LITE_GRAPHICS: &str = "tenebris-c:settings:lite-graphics";

/// Min/max bounds for the mouse sensitivity slider. The UI maps the
/// slider's normalised [0..1] position to a sensitivity value in
/// [MIN..MAX] linearly. The default sits roughly in the middle of the
/// range for a 1:1 feel on a standard 800-1600 DPI mouse.
pub const MOUSE_SENS_MIN: f32 = 0.0005;
pub const MOUSE_SENS_MAX: f32 = 0.0080;
pub const MOUSE_SENS_DEFAULT: f32 = 0.0020;

/// Chat live-panel fade window (seconds). After this many seconds
/// since the last received chat message, the floating panel hides
/// (compose box still works via Enter). 60 s default - 5 minutes was
/// too long when the popup contained only one stale "joined" line.
pub const CHAT_FADE_MIN_S: f32 = 10.0;
pub const CHAT_FADE_MAX_S: f32 = 300.0;
pub const CHAT_FADE_DEFAULT_S: f32 = 60.0;

struct State {
    mouse_sens: f32,
    chat_fade_s: f32,
    lite_graphics: bool,
}

static S: Mutex<State> = Mutex::new(State {
    mouse_sens: MOUSE_SENS_DEFAULT,
    chat_fade_s: CHAT_FADE_DEFAULT_S,
    lite_graphics: false,
});

fn lock() -> std::sync::MutexGuard<'static, State> {
    S.lock().unwrap_or_else(|e| e.into_inner())
}

/// strtod-alike: parse the longest leading prefix of `s` (after
/// optional leading whitespace) that forms a valid float; 0.0 when no
/// prefix parses, exactly like C strtod returning 0 on a fully
/// malformed value. Trailing garbage is ignored.
fn strtod_prefix(s: &str) -> f64 {
    let t = s.trim_start();
    for end in (1..=t.len()).rev() {
        if !t.is_char_boundary(end) {
            continue;
        }
        if let Ok(v) = t[..end].parse::<f64>() {
            return v;
        }
    }
    0.0
}

pub fn init() {
    let mut s = lock();
    if let Some(v) = client_kv::get(KV_KEY_MOUSE_SENS) {
        // strtod ignores trailing garbage and returns 0 on a fully
        // malformed value; the range check below sanity-clamps either
        // outcome back to defaults so a corrupt KV entry can't break
        // input.
        let f = strtod_prefix(&v) as f32;
        if f >= MOUSE_SENS_MIN && f <= MOUSE_SENS_MAX {
            s.mouse_sens = f;
        }
    }
    if let Some(v) = client_kv::get(KV_KEY_CHAT_FADE) {
        let f = strtod_prefix(&v) as f32;
        if f >= CHAT_FADE_MIN_S && f <= CHAT_FADE_MAX_S {
            s.chat_fade_s = f;
        }
    }
    if let Some(v) = client_kv::get(KV_KEY_LITE_GRAPHICS) {
        // Stored as "1" or "0" - any other value falls back to the
        // compiled default.
        s.lite_graphics = v == "1";
    }
}

pub fn mouse_sensitivity() -> f32 {
    lock().mouse_sens
}

pub fn set_mouse_sensitivity(v: f32) {
    let v = v.clamp(MOUSE_SENS_MIN, MOUSE_SENS_MAX);
    let mut s = lock();
    if v == s.mouse_sens {
        return;
    }
    s.mouse_sens = v;
    // C: snprintf "%.6f" with the float promoted to double.
    client_kv::set(KV_KEY_MOUSE_SENS, &format!("{:.6}", v as f64));
}

pub fn chat_fade_s() -> f32 {
    lock().chat_fade_s
}

pub fn set_chat_fade_s(v: f32) {
    let v = v.clamp(CHAT_FADE_MIN_S, CHAT_FADE_MAX_S);
    let mut s = lock();
    if v == s.chat_fade_s {
        return;
    }
    s.chat_fade_s = v;
    // C: snprintf "%.2f" with the float promoted to double.
    client_kv::set(KV_KEY_CHAT_FADE, &format!("{:.2}", v as f64));
}

/// Lite-graphics preference. Persistent across reloads via client_kv.
/// Read once at boot by main_web (before renderer init) so the lite
/// water + composite pipelines get built when the user opted in last
/// session. Toggling at runtime persists the new value but does NOT
/// rebuild the renderer - the player has to reload for the visual
/// change to land. Mobile-device auto-detection still wins regardless
/// of this setting; the toggle only lets desktop users opt into the
/// mobile shader path manually for older / integrated GPUs.
pub fn lite_graphics() -> bool {
    lock().lite_graphics
}

pub fn set_lite_graphics(enabled: bool) {
    let mut s = lock();
    if s.lite_graphics == enabled {
        return;
    }
    s.lite_graphics = enabled;
    client_kv::set(KV_KEY_LITE_GRAPHICS, if enabled { "1" } else { "0" });
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::client_kv::test_support;

    /// Reset the settings global back to compiled defaults - the C
    /// equivalent is a fresh process, which the test binary doesn't
    /// give us.
    fn reset_state() {
        let mut s = lock();
        s.mouse_sens = MOUSE_SENS_DEFAULT;
        s.chat_fade_s = CHAT_FADE_DEFAULT_S;
        s.lite_graphics = false;
    }

    #[test]
    fn defaults_before_any_kv() {
        let _g = test_support::begin("settings_defaults");
        reset_state();
        init();
        assert_eq!(mouse_sensitivity(), MOUSE_SENS_DEFAULT);
        assert_eq!(chat_fade_s(), CHAT_FADE_DEFAULT_S);
        assert!(!lite_graphics());
    }

    #[test]
    fn setters_clamp_and_persist_with_c_formats() {
        let _g = test_support::begin("settings_setters");
        reset_state();
        set_mouse_sensitivity(0.0035);
        // Pinned against the C build: snprintf("%.6f", 0.0035f).
        assert_eq!(
            client_kv::get("tenebris-c:settings:mouse-sens").as_deref(),
            Some("0.003500")
        );
        set_chat_fade_s(123.456);
        // Pinned against the C build: snprintf("%.2f", 123.456f).
        assert_eq!(
            client_kv::get("tenebris-c:settings:chat-fade-s").as_deref(),
            Some("123.46")
        );
        set_lite_graphics(true);
        assert_eq!(
            client_kv::get("tenebris-c:settings:lite-graphics").as_deref(),
            Some("1")
        );

        // Clamping mirrors the C min/max guards.
        set_mouse_sensitivity(99.0);
        assert_eq!(mouse_sensitivity(), MOUSE_SENS_MAX);
        set_mouse_sensitivity(0.0);
        assert_eq!(mouse_sensitivity(), MOUSE_SENS_MIN);
        set_chat_fade_s(0.0);
        assert_eq!(chat_fade_s(), CHAT_FADE_MIN_S);
        set_chat_fade_s(1e9);
        assert_eq!(chat_fade_s(), CHAT_FADE_MAX_S);
    }

    #[test]
    fn init_reads_back_persisted_values() {
        let _g = test_support::begin("settings_init_readback");
        reset_state();
        set_mouse_sensitivity(0.0042);
        set_chat_fade_s(45.0);
        set_lite_graphics(true);
        reset_state();
        init();
        assert_eq!(mouse_sensitivity(), 0.0042);
        assert_eq!(chat_fade_s(), 45.0);
        assert!(lite_graphics());
    }

    #[test]
    fn init_rejects_out_of_range_and_garbage() {
        let _g = test_support::begin("settings_init_garbage");
        reset_state();
        client_kv::set("tenebris-c:settings:mouse-sens", "9.5"); // out of range
        client_kv::set("tenebris-c:settings:chat-fade-s", "not-a-number");
        client_kv::set("tenebris-c:settings:lite-graphics", "yes"); // not "1"
        init();
        assert_eq!(mouse_sensitivity(), MOUSE_SENS_DEFAULT);
        assert_eq!(chat_fade_s(), CHAT_FADE_DEFAULT_S);
        assert!(!lite_graphics());

        // strtod semantics: trailing garbage after a valid prefix is
        // ignored, so "0.003abc" still lands in range.
        reset_state();
        client_kv::set("tenebris-c:settings:mouse-sens", "0.003abc");
        init();
        assert_eq!(mouse_sensitivity(), 0.003);
    }
}
