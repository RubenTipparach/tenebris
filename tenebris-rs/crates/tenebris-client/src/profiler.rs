//! Port of `tenebris-c/src/client/profiler.{c,h}`.
//!
//! Per-frame CPU profiler. Hand-instrumented via begin / end pairs,
//! each scoped to a named region. Each slot tracks last-frame
//! milliseconds plus an exponential moving average so the readout is
//! steady on a stable frame and reactive when something spikes.
//!
//! Renames (per PORTING.md rule 4 - module prefix dropped):
//! - `profiler_begin_frame()`    -> `profiler::begin_frame()`
//! - `profiler_end_frame()`      -> `profiler::end_frame()`
//! - `profiler_begin()`          -> `profiler::begin()`
//! - `profiler_end()`            -> `profiler::end()`
//! - `profiler_toggle_visible()` -> `profiler::toggle_visible()`
//! - `profiler_visible()`        -> `profiler::visible()`
//! - `profiler_draw()`           -> `profiler::draw()` (see below)
//!
//! Global-state pattern (template for the rest of the client port):
//! the C file's module-static struct `P` becomes a `static P:
//! Mutex<ProfilerState>` with free functions locking it - the same
//! pattern tenebris-core already uses (`config.rs` `S_SKY`,
//! `planet.rs` `BODIES`). These are single-threaded sokol-app modules;
//! the Mutex is uncontended and only exists to satisfy Rust's static
//! mutability rules. Pick this pattern for future client modules.
//!
//! Deviations from the C, both documented here:
//! - Slot lookup: C keys slots on the literal-string POINTER (cheap
//!   compare; relies on the compiler de-duplicating literals). Rust
//!   compares `&'static str` CONTENT instead - behaviorally identical
//!   for call sites that pass the same region name, and still a linear
//!   scan over < 32 slots.
//! - Draw: the sokol crate (0.3.0) binds no sokol_debugtext module, so
//!   `draw()` cannot emit sdtx calls yet. The exact C readout (same
//!   format strings, same colors, same sort) is built by `draw_rows()`;
//!   `draw()` keeps the C entry-point shape and the renderer port will
//!   feed the rows to its debugtext binding when that path lands. All
//!   row text is 7-bit ASCII per the in-game text rules.

#![allow(dead_code)] // consumed by the renderer/main waves of the port

use sokol::time::{diff as stm_diff, ms as stm_ms, now as stm_now};
use std::sync::Mutex;

const MAX_SLOTS: usize = 32;

/// Rolling frame-time history backing the on-screen frame-time graph.
/// 1024 samples covers a 10 s window down to ~100 fps; above that the
/// windowed view (which trims by accumulated wall time) just shows the
/// most recent < 10 s, which is the honest thing to do.
const FRAME_HIST_CAP: usize = 1024;

/// Port of `prof_slot_t`.
#[derive(Clone, Copy, Debug)]
struct ProfSlot {
    /// region name - `None` == unused slot (C: NULL `name` pointer)
    name: Option<&'static str>,
    /// stm_now() at last begin
    start_t: u64,
    /// accumulated time in the current frame
    ms_curr: f64,
    /// finalised time from the previous frame
    ms_last: f64,
    /// EMA of ms_last across frames
    ms_avg: f64,
    /// begin/end pair count this frame
    calls_curr: i32,
    calls_last: i32,
}

const EMPTY_SLOT: ProfSlot = ProfSlot {
    name: None,
    start_t: 0,
    ms_curr: 0.0,
    ms_last: 0.0,
    ms_avg: 0.0,
    calls_curr: 0,
    calls_last: 0,
};

/// Port of the C file's module-static `P`.
#[derive(Clone, Copy, Debug)]
struct ProfilerState {
    slots: [ProfSlot; MAX_SLOTS],
    slot_count: usize,
    visible: bool,
    /// True between begin_frame and end_frame. begin()/end() no-op
    /// outside a frame: in the app every scope runs inside one, so this
    /// changes nothing there - but unit tests exercise instrumented code
    /// (e.g. interact::update) without ever starting a frame, and their
    /// stray begin/end writes raced the profiler's own state-resetting
    /// tests across test threads.
    in_frame: bool,
    frame_start_t: u64,
    frame_ms_last: f64,
    frame_ms_avg: f64,
    /// Ring buffer of recent whole-frame times in ms (newest written at
    /// `frame_hist_head - 1`). Feeds `frame_graph()`.
    frame_hist: [f32; FRAME_HIST_CAP],
    frame_hist_head: usize,
    frame_hist_len: usize,
}

const INITIAL_STATE: ProfilerState = ProfilerState {
    slots: [EMPTY_SLOT; MAX_SLOTS],
    slot_count: 0,
    visible: false,
    in_frame: false,
    frame_start_t: 0,
    frame_ms_last: 0.0,
    frame_ms_avg: 0.0,
    frame_hist: [0.0; FRAME_HIST_CAP],
    frame_hist_head: 0,
    frame_hist_len: 0,
};

static P: Mutex<ProfilerState> = Mutex::new(INITIAL_STATE);

/* Linear search on the region name. With < 32 slots this is faster
 * than a hash table. Returns the slot index; allocates a fresh slot
 * for an unseen name, or None when all MAX_SLOTS are taken. */
fn slot_index(p: &mut ProfilerState, name: &'static str) -> Option<usize> {
    for i in 0..p.slot_count {
        if p.slots[i].name == Some(name) {
            return Some(i);
        }
    }
    if p.slot_count >= MAX_SLOTS {
        return None;
    }
    let i = p.slot_count;
    p.slot_count += 1;
    p.slots[i] = EMPTY_SLOT;
    p.slots[i].name = Some(name);
    Some(i)
}

/* Slow-EMA helper shared by the frame total and the per-slot totals.
 * Coefficient 0.1 gives ~10-frame memory; close enough to the JS
 * profiler's behaviour. */
fn ema(avg: f64, last: f64) -> f64 {
    if avg <= 0.0 {
        last
    } else {
        avg * 0.9 + last * 0.1
    }
}

/// Append one whole-frame sample (ms) to the ring buffer.
fn push_frame_sample(p: &mut ProfilerState, ms: f32) {
    let head = p.frame_hist_head;
    p.frame_hist[head] = ms;
    p.frame_hist_head = (head + 1) % FRAME_HIST_CAP;
    if p.frame_hist_len < FRAME_HIST_CAP {
        p.frame_hist_len += 1;
    }
}

/* sokol_time must be set up before any stm_now(). The app does that at
 * boot, but unit tests exercise instrumented code paths (e.g.
 * interact::update's sub-scopes) without booting sokol - without this
 * guard every such test dies on sokol_time's initialized assert. The
 * Once makes the profiler self-sufficient wherever it's called from. */
fn ensure_time() {
    static ONCE: std::sync::Once = std::sync::Once::new();
    ONCE.call_once(sokol::time::setup);
}

pub fn begin_frame() {
    ensure_time();
    let mut p = P.lock().unwrap();
    p.in_frame = true;
    p.frame_start_t = stm_now();
    for i in 0..p.slot_count {
        p.slots[i].ms_curr = 0.0;
        p.slots[i].calls_curr = 0;
    }
}

pub fn end_frame() {
    ensure_time();
    let mut p = P.lock().unwrap();
    p.in_frame = false;
    /* Whole-frame total (wall-clock between begin_frame and end_frame
     * - captures everything between, including unprofiled regions). */
    p.frame_ms_last = stm_ms(stm_diff(stm_now(), p.frame_start_t));
    /* Slow-EMA the totals so the readout is stable but still reacts
     * when something starts spiking. */
    p.frame_ms_avg = ema(p.frame_ms_avg, p.frame_ms_last);
    /* Record the raw (un-smoothed) frame time for the spike graph. */
    let frame_ms = p.frame_ms_last as f32;
    push_frame_sample(&mut p, frame_ms);
    for i in 0..p.slot_count {
        let s = &mut p.slots[i];
        s.ms_last = s.ms_curr;
        s.calls_last = s.calls_curr;
        s.ms_avg = ema(s.ms_avg, s.ms_last);
    }
}

/// Time a named region. Calls must nest properly (LIFO); the
/// implementation doesn't validate this - mismatched begin/end
/// pairs corrupt the matching slot's accumulator.
pub fn begin(name: &'static str) {
    ensure_time();
    let mut p = P.lock().unwrap();
    if !p.in_frame {
        return; /* instrumented code running outside a frame (unit tests) */
    }
    let Some(i) = slot_index(&mut p, name) else { return };
    p.slots[i].start_t = stm_now();
}

pub fn end(name: &'static str) {
    ensure_time();
    let mut p = P.lock().unwrap();
    if !p.in_frame {
        return; /* instrumented code running outside a frame (unit tests) */
    }
    let Some(i) = slot_index(&mut p, name) else { return };
    let dt = stm_ms(stm_diff(stm_now(), p.slots[i].start_t));
    p.slots[i].ms_curr += dt;
    p.slots[i].calls_curr += 1;
}

pub fn toggle_visible() {
    let mut p = P.lock().unwrap();
    p.visible = !p.visible;
}

pub fn visible() -> bool {
    P.lock().unwrap().visible
}

/// One-line "who ate the frame" summary of the LAST finalized frame's
/// slots, heaviest first - the lag-spike logger prints it so a stall
/// names its culprit in the console without the F3 readout open. Slots
/// under 0.5 ms are noise and skipped; an empty result means the stall
/// happened OUTSIDE every instrumented region (GPU sync, OS, IO on the
/// main thread, ...), which is itself a lead.
pub fn spike_report(top: usize) -> String {
    let p = P.lock().unwrap();
    let mut idx: Vec<usize> = (0..p.slot_count).collect();
    idx.sort_by(|&a, &b| {
        p.slots[b]
            .ms_last
            .partial_cmp(&p.slots[a].ms_last)
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    let mut out = String::new();
    for &i in idx.iter().take(top) {
        let s = &p.slots[i];
        if s.ms_last < 0.5 {
            break;
        }
        if !out.is_empty() {
            out.push_str("  ");
        }
        out.push_str(&format!("{}={:.1}ms", s.name.unwrap_or("?"), s.ms_last));
    }
    if out.is_empty() {
        out.push_str("(no slot >0.5ms - stall outside instrumented regions)");
    }
    out
}

/// A windowed view of the frame-time history for the on-screen graph.
/// `samples` runs oldest -> newest in milliseconds; `max_ms` is the
/// peak in the window (vertical scale); `span_s` is the wall time the
/// returned samples actually cover (<= the requested window).
pub struct FrameGraph {
    pub samples: Vec<f32>,
    pub max_ms: f32,
    pub span_s: f32,
}

/// Most recent frame samples spanning up to `window_s` seconds of wall
/// time, newest-anchored, returned oldest -> newest. Used by the HUD
/// frame-time graph to spot spikes (e.g. the single-threaded water sim
/// stalling the main thread).
pub fn frame_graph(window_s: f32) -> FrameGraph {
    let p = P.lock().unwrap();
    let cap = FRAME_HIST_CAP;
    let budget_ms = window_s.max(0.0) * 1000.0;
    let mut samples: Vec<f32> = Vec::with_capacity(p.frame_hist_len);
    let mut acc = 0.0f32;
    /* Walk newest -> oldest until the window is covered. */
    for k in 0..p.frame_hist_len {
        let idx = (p.frame_hist_head + cap - 1 - k) % cap;
        let ms = p.frame_hist[idx];
        samples.push(ms);
        acc += ms;
        if acc >= budget_ms {
            break;
        }
    }
    samples.reverse();
    let max_ms = samples.iter().copied().fold(0.0f32, f32::max);
    FrameGraph { samples, max_ms, span_s: acc / 1000.0 }
}

/// One `sdtx_color3b` + `sdtx_printf` pair from the C draw path.
#[derive(Clone, Debug, PartialEq)]
pub struct DrawRow {
    pub color: (u8, u8, u8),
    pub text: String,
}

/* The body of profiler_draw past the visibility gate: identical format
 * strings, colors, and sort as the C - factored out so the readout is
 * testable without a debugtext binding. */
fn rows_for(p: &ProfilerState) -> Vec<DrawRow> {
    let mut rows = Vec::new();
    rows.push(DrawRow {
        color: (0xff, 0xe0, 0x40),
        /* F3 is the ToggleProfiler binding (controls.rs); the C-era "/ P"
         * alternate never got a Rust binding, so don't advertise it. */
        text: "\n=== profiler [F3] ===\n".to_string(),
    });
    let fps = if p.frame_ms_avg > 0.01 { 1000.0 / p.frame_ms_avg } else { 0.0 };
    rows.push(DrawRow {
        color: (0xc0, 0xd0, 0xff),
        text: format!(
            "frame                    {:5.2} ms (avg {:5.2})  fps {:4.0}\n",
            p.frame_ms_last, p.frame_ms_avg, fps
        ),
    });
    /* Sort-on-display by ms_avg desc so the heaviest slot ends up
     * on top - useful when looking for the cause of a spike. Tiny
     * insertion sort, fine for <= 32 slots; ported verbatim so tie
     * order (registration order) matches the C. */
    let mut order = [0usize; MAX_SLOTS];
    for (i, o) in order.iter_mut().enumerate().take(p.slot_count) {
        *o = i;
    }
    for i in 1..p.slot_count {
        let x = order[i];
        let mut j = i;
        while j > 0 && p.slots[order[j - 1]].ms_avg < p.slots[x].ms_avg {
            order[j] = order[j - 1];
            j -= 1;
        }
        order[j] = x;
    }
    for &idx in order.iter().take(p.slot_count) {
        let s = &p.slots[idx];
        /* Highlight slots > 5 ms avg so eye finds the hot ones. */
        let color = if s.ms_avg > 5.0 {
            (0xff, 0x70, 0x70)
        } else if s.ms_avg > 1.0 {
            (0xff, 0xc0, 0x70)
        } else {
            (0xc0, 0xd0, 0xff)
        };
        rows.push(DrawRow {
            color,
            text: format!(
                "  {:<22} {:5.2} ms (avg {:5.2}) x{}\n",
                s.name.unwrap_or(""),
                s.ms_last,
                s.ms_avg,
                s.calls_last
            ),
        });
    }
    /* Trailing color reset (C: sdtx_color3b(0xff,0xff,0xff) with no
     * text) so subsequent HUD prints go back to white. */
    rows.push(DrawRow { color: (0xff, 0xff, 0xff), text: String::new() });
    rows
}

/// The per-slot breakdown as (color, text) rows in sdtx call order -
/// empty when the profiler is hidden. The renderer's HUD pass emits
/// each row as `sdtx_color3b(color)` + `sdtx_printf(text)`.
pub fn draw_rows() -> Vec<DrawRow> {
    let p = P.lock().unwrap();
    if !p.visible {
        return Vec::new();
    }
    rows_for(&p)
}

/// Port of `profiler_draw()`. Keeps the C entry-point shape; the sokol
/// crate (0.3.0) has no sokol_debugtext binding yet, so until the
/// renderer's text path lands this builds the rows and drops them.
/// Callers that can emit text should use `draw_rows()` directly.
pub fn draw() {
    let _rows = draw_rows();
}

#[cfg(test)]
mod tests {
    use super::*;

    /* The profiler is module-global state, so tests that touch it are
     * serialized - same TEST_LOCK pattern as tenebris-core. */
    static TEST_LOCK: Mutex<()> = Mutex::new(());

    fn lock_and_reset() -> std::sync::MutexGuard<'static, ()> {
        let guard = TEST_LOCK.lock().unwrap_or_else(|e| e.into_inner());
        *P.lock().unwrap() = INITIAL_STATE;
        static ONCE: std::sync::Once = std::sync::Once::new();
        ONCE.call_once(sokol::time::setup);
        guard
    }

    #[test]
    fn frame_graph_windows_by_wall_time() {
        let _g = lock_and_reset();
        {
            let mut p = P.lock().unwrap();
            // Five 1000 ms frames pushed through the ring buffer.
            for _ in 0..5 {
                push_frame_sample(&mut p, 1000.0);
            }
        }
        // A 2.5 s window over 1 s frames stops after 3 samples
        // (1000 * 3 = 3000 ms >= 2500 ms).
        let g = frame_graph(2.5);
        assert_eq!(g.samples.len(), 3);
        assert_eq!(g.max_ms, 1000.0);
        assert!((g.span_s - 3.0).abs() < 1e-6);
        // A window larger than the history returns the whole buffer.
        let all = frame_graph(1000.0);
        assert_eq!(all.samples.len(), 5);
    }

    #[test]
    fn ema_pinned() {
        // first sample seeds the average
        assert_eq!(ema(0.0, 5.0), 5.0);
        assert_eq!(ema(-2.0, 3.0), 3.0);
        // 10*0.9 + 20*0.1 = 11 exactly
        assert_eq!(ema(10.0, 20.0), 11.0);
        // decay toward zero: 8*0.9 + 0*0.1
        assert_eq!(ema(8.0, 0.0), 7.2);
    }

    #[test]
    fn visibility_toggles() {
        let _g = lock_and_reset();
        assert!(!visible());
        toggle_visible();
        assert!(visible());
        toggle_visible();
        assert!(!visible());
    }

    #[test]
    fn slots_register_once_per_name() {
        let _g = lock_and_reset();
        begin_frame();
        begin("mesh");
        end("mesh");
        begin("mesh");
        end("mesh");
        begin("water");
        end("water");
        end_frame();
        let p = P.lock().unwrap();
        assert_eq!(p.slot_count, 2);
        assert_eq!(p.slots[0].name, Some("mesh"));
        assert_eq!(p.slots[0].calls_last, 2);
        assert_eq!(p.slots[1].name, Some("water"));
        assert_eq!(p.slots[1].calls_last, 1);
        // finalized times are non-negative and frame total covers them
        assert!(p.slots[0].ms_last >= 0.0);
        assert!(p.frame_ms_last >= 0.0);
        // first frame seeds the EMAs directly
        assert_eq!(p.slots[0].ms_avg, p.slots[0].ms_last);
        assert_eq!(p.frame_ms_avg, p.frame_ms_last);
    }

    #[test]
    fn begin_frame_resets_current_accumulators() {
        let _g = lock_and_reset();
        begin_frame();
        begin("a");
        end("a");
        end_frame();
        begin_frame();
        {
            let p = P.lock().unwrap();
            assert_eq!(p.slots[0].ms_curr, 0.0);
            assert_eq!(p.slots[0].calls_curr, 0);
            // last-frame results survive the reset
            assert_eq!(p.slots[0].calls_last, 1);
        }
        end_frame();
        // a frame with no begin/end pairs finalizes the slot to zero
        let p = P.lock().unwrap();
        assert_eq!(p.slots[0].ms_last, 0.0);
        assert_eq!(p.slots[0].calls_last, 0);
    }

    #[test]
    fn slot_table_caps_at_max_slots() {
        let _g = lock_and_reset();
        begin_frame();
        for i in 0..(MAX_SLOTS + 4) {
            let name: &'static str = Box::leak(format!("region{}", i).into_boxed_str());
            begin(name);
            end(name); // names past MAX_SLOTS are silently dropped
        }
        end_frame();
        let p = P.lock().unwrap();
        assert_eq!(p.slot_count, MAX_SLOTS);
        assert_eq!(p.slots[MAX_SLOTS - 1].name, Some("region31"));
        assert_eq!(p.slots[MAX_SLOTS - 1].calls_last, 1);
    }

    #[test]
    fn draw_rows_empty_when_hidden() {
        let _g = lock_and_reset();
        begin_frame();
        begin("a");
        end("a");
        end_frame();
        assert!(draw_rows().is_empty());
        draw(); // C shape: no-op while hidden, must not panic
        toggle_visible();
        assert!(!draw_rows().is_empty());
        draw();
    }

    #[test]
    fn readout_format_and_sort_match_c() {
        let _g = lock_and_reset();
        // Hand-built state so the readout is deterministic (no clock).
        let mut st = INITIAL_STATE;
        st.frame_ms_last = 16.0;
        st.frame_ms_avg = 20.0; // fps = 1000/20 = 50
        st.slot_count = 3;
        st.slots[0].name = Some("hud");
        st.slots[0].ms_last = 0.25;
        st.slots[0].ms_avg = 0.5;
        st.slots[0].calls_last = 1;
        st.slots[1].name = Some("meshing");
        st.slots[1].ms_last = 5.5;
        st.slots[1].ms_avg = 6.0;
        st.slots[1].calls_last = 2;
        st.slots[2].name = Some("water");
        st.slots[2].ms_last = 1.75;
        st.slots[2].ms_avg = 2.0;
        st.slots[2].calls_last = 12;
        let rows = rows_for(&st);
        assert_eq!(rows.len(), 6); // header + frame + 3 slots + color reset

        assert_eq!(rows[0].color, (0xff, 0xe0, 0x40));
        assert_eq!(rows[0].text, "\n=== profiler [F3] ===\n");

        assert_eq!(rows[1].color, (0xc0, 0xd0, 0xff));
        assert_eq!(
            rows[1].text,
            "frame                    16.00 ms (avg 20.00)  fps   50\n"
        );

        // sorted by ms_avg desc: meshing (6.0), water (2.0), hud (0.5)
        assert_eq!(rows[2].color, (0xff, 0x70, 0x70)); // > 5 ms: red
        assert_eq!(rows[2].text, "  meshing                 5.50 ms (avg  6.00) x2\n");
        assert_eq!(rows[3].color, (0xff, 0xc0, 0x70)); // > 1 ms: orange
        assert_eq!(rows[3].text, "  water                   1.75 ms (avg  2.00) x12\n");
        assert_eq!(rows[4].color, (0xc0, 0xd0, 0xff)); // cool: body blue
        assert_eq!(rows[4].text, "  hud                     0.25 ms (avg  0.50) x1\n");

        assert_eq!(rows[5], DrawRow { color: (0xff, 0xff, 0xff), text: String::new() });

        // every player-visible string is 7-bit ASCII
        for r in &rows {
            assert!(r.text.is_ascii());
        }
    }

    #[test]
    fn readout_zero_avg_shows_zero_fps() {
        let st = INITIAL_STATE; // frame_ms_avg = 0.0 <= 0.01 gate
        let rows = rows_for(&st);
        assert_eq!(
            rows[1].text,
            "frame                     0.00 ms (avg  0.00)  fps    0\n"
        );
    }

    #[test]
    fn readout_tie_keeps_registration_order() {
        // C's insertion sort uses a strict compare, so equal averages
        // stay in registration order.
        let mut st = INITIAL_STATE;
        st.slot_count = 2;
        st.slots[0].name = Some("first");
        st.slots[0].ms_avg = 3.0;
        st.slots[1].name = Some("second");
        st.slots[1].ms_avg = 3.0;
        let rows = rows_for(&st);
        assert!(rows[2].text.starts_with("  first"));
        assert!(rows[3].text.starts_with("  second"));
    }
}
