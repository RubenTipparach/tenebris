//! Live config hot-reload (native dev iteration): every ~half second, stat
//! the rendering/tuning YAMLs under `assets/config/` and, when any file's
//! mtime moved since the last poll, re-run the loaders so an edit shows up
//! in-game without a restart.
//!
//! Why it "just works": the tuning configs the renderer consumes are read
//! fresh every frame - `config::water()` / `config::lod()` return the
//! current Mutex snapshot, and the atmosphere overrides are applied onto
//! `planet::BODIES[]` which the per-frame `build_env` re-reads. So replacing
//! the snapshot / re-applying the overrides is all that's needed; the next
//! frame picks it up.
//!
//! Native only - WASM has no filesystem to stat (and ships the configs
//! baked into the bundle), so the whole module compiles out there.

#![cfg(not(target_os = "emscripten"))]

use std::cell::RefCell;
use std::collections::HashMap;
use std::time::SystemTime;

/// Poll cadence in frames (~0.5 s at 60 fps). A stat of ~10 small files is
/// negligible, but there's no reason to do it every frame.
const POLL_EVERY_FRAMES: u64 = 30;

/// The rendering / tuning configs watched for live edits. These are the
/// "designer knob" files the renderer re-reads each frame; gameplay-state
/// configs (recipes, controls, economy) are deliberately excluded so a live
/// edit can't reset mid-session state. Keep this list in sync with
/// [`reload`] in `app.rs` (same paths, same order).
pub const WATCHED: &[&str] = &[
    "assets/config/atmosphere.yaml",
    "assets/config/skybox.yaml",
    "assets/config/lod.yaml",
    "assets/config/water.yaml",
    "assets/config/lighting.yaml",
    "assets/config/clouds.yaml",
    "assets/config/weather.yaml",
    "assets/config/solar.yaml",
    "assets/config/scatter.yaml",
    "assets/config/bonfire.yaml",
];

struct State {
    mtimes: HashMap<&'static str, SystemTime>,
    frame: u64,
}

thread_local! {
    static STATE: RefCell<Option<State>> = const { RefCell::new(None) };
}

fn mtime(path: &str) -> Option<SystemTime> {
    std::fs::metadata(path).and_then(|m| m.modified()).ok()
}

/// Poll the watched files; when any changed since the last poll, invoke
/// `reload` (which re-runs the tuning loaders). The first call seeds the
/// baseline mtimes and never fires, so boot-time loads aren't duplicated.
/// Cheap no-op on the frames between polls.
pub fn poll(reload: impl FnOnce()) {
    STATE.with(|cell| {
        let mut slot = cell.borrow_mut();
        let st = slot.get_or_insert_with(|| {
            let mut mtimes = HashMap::new();
            for &p in WATCHED {
                if let Some(t) = mtime(p) {
                    mtimes.insert(p, t);
                }
            }
            State { mtimes, frame: 0 }
        });
        st.frame = st.frame.wrapping_add(1);
        if st.frame % POLL_EVERY_FRAMES != 0 {
            return;
        }
        let mut changed: Vec<&'static str> = Vec::new();
        for &p in WATCHED {
            if let Some(t) = mtime(p) {
                match st.mtimes.get(p) {
                    Some(prev) if *prev == t => {}
                    _ => {
                        st.mtimes.insert(p, t);
                        changed.push(p);
                    }
                }
            }
        }
        if !changed.is_empty() {
            println!("[hot-reload] configs changed: {} - reloading", changed.join(", "));
            reload();
        }
    });
}
