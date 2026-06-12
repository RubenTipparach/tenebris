//! Port of `tenebris-c/src/client/mobile_ui.{c,h}`.
//!
//! Tiny 2D overlay drawn via sokol_gl - the shared helper layer every
//! other canvas UI module builds on: rounded (circle) buttons, rings,
//! stroke-segment glyphs, filled / outlined rects, and the shared
//! alpha-blended 2D pipeline. Also owns the top-right debug hamburger
//! menu + its hit-testing.
//!
//! The overlay reports its own hit rects to input every frame so touch
//! classification can hit-test the buttons.
//!
//! # Renames (PORTING.md rule 4 - `mobile_ui_` prefix dropped)
//!
//! - `mobile_ui_init()`                    -> `mobile_ui::init()`
//! - `mobile_ui_shutdown()`                -> `mobile_ui::shutdown()`
//! - `mobile_ui_draw()`                    -> `mobile_ui::draw()`
//! - `mobile_ui_draw_button()`             -> `mobile_ui::draw_button()`
//! - `mobile_ui_draw_rect()`               -> `mobile_ui::draw_rect()`
//! - `mobile_ui_draw_rect_outline()`       -> `mobile_ui::draw_rect_outline()`
//! - `mobile_ui_handle_touch()`            -> `mobile_ui::handle_touch()`
//! - `mobile_ui_alpha_pipeline()`          -> `mobile_ui::alpha_pipeline()`
//! - `mobile_ui_pause_button_rect()`       -> `mobile_ui::pause_button_rect()`
//! - `mobile_ui_set_debug_menu_visible()`  -> `mobile_ui::set_debug_menu_visible()`
//! - `mobile_ui_set_teleport_visible()`    -> `mobile_ui::set_teleport_visible()`
//! - `mobile_ui_circle_t`                  -> `mobile_ui::Circle`
//!
//! # Global state
//!
//! The C statics (S_MENU_OPEN, S_DEBUG_MENU_VISIBLE, S_TELEPORT_VISIBLE,
//! S_PIP_ALPHA) become `thread_local!` Cells - same pattern as input.rs.
//!
//! # sokol boundary (testability)
//!
//! Drawing helpers split tessellation from submission so the geometry
//! is pinnable headless:
//!
//! - [`circle_fan_tris`] / [`ring_tris`]   - triangle lists for
//!   draw_circle_fan / draw_ring (same angle stepping, same winding).
//! - [`segment_quad`]                      - draw_segment's one quad.
//! - [`glyph_segments`]                    - draw_glyph's stroke table.
//! - [`menu_layout_for_width`]             - menu_button_layout's math.
//! - [`menu_hit_test`]                     - the handle_touch hit table
//!   (square abs-distance boxes, exactly like the C fabsf compares).
//!
//! `sapp_widthf` / `sapp_heightf` sit behind seams; tests swap in a
//! settable screen size (no app context in the test runner), mirroring
//! input.rs.
//!
//! # Pending cross-module seams
//!
//! renderer.rs is still a stub; its calls are module-local
//! placeholders marked TODO(port-renderer) that mirror the C boot
//! defaults (render layers visible) and drop writes. profiler and
//! teleport_menu are already ported and called directly.

// Not wired into the app loop until the main_web port lands (final
// client wave); exercised by unit tests.
#![allow(dead_code)]

use crate::input;
use crate::profiler;
use crate::teleport_menu;
use sokol::gfx as sg;
use sokol::gl as sgl;

use std::cell::Cell;

/* ----------------------------------------------------------------------- */

/* All dimensions halved from the first pass so both joysticks + three
 * buttons can share the bottom half of the screen without crowding. */
const BTN_RADIUS: f32 = 22.0;
const BTN_MARGIN: f32 = 14.0;
const BTN_GAP: f32 = 10.0;
/* Retired on-canvas joystick sizes - kept for 1:1 parity with the C
 * defines (the joysticks moved to the DOM control deck). */
const STICK_RADIUS: f32 = 38.0;
const STICK_KNOB_R: f32 = 15.0;

/* C literal in draw_circle_fan / draw_ring (2*pi as the C wrote it). */
const TWO_PI: f32 = 6.283_185_3;

/* C: local `float thick = 3.0f` in draw_glyph. */
const GLYPH_THICK: f32 = 3.0;

/* --------------------------------------------------------------------- */
/* Screen-size seams - direct sokol::app forwards outside tests. */

#[cfg(not(test))]
fn screen_widthf() -> f32 {
    sokol::app::widthf()
}

#[cfg(not(test))]
fn screen_heightf() -> f32 {
    sokol::app::heightf()
}

#[cfg(test)]
use test_doubles::{screen_heightf, screen_widthf};

#[cfg(test)]
mod test_doubles {
    use std::cell::Cell;

    thread_local! {
        pub static SCREEN: Cell<(f32, f32)> = const { Cell::new((0.0, 0.0)) };
    }

    pub fn screen_widthf() -> f32 {
        SCREEN.with(|c| c.get().0)
    }

    pub fn screen_heightf() -> f32 {
        SCREEN.with(|c| c.get().1)
    }
}

/* --------------------------------------------------------------------- */
/* Cross-module seams pending later port waves. Call sites keep the
 * exact C shape so swapping in the real modules is mechanical. */

/// TODO(port-renderer): forward to `renderer::terrain_visible()` /
/// `renderer::set_terrain_visible()` once the renderer module lands.
/// Placeholders return the C renderer's boot default (visible) and
/// drop writes.
fn renderer_terrain_visible() -> bool {
    true
}
fn renderer_set_terrain_visible(_visible: bool) {}

/// TODO(port-renderer): forward to `renderer::water_visible()` /
/// `renderer::set_water_visible()`.
fn renderer_water_visible() -> bool {
    true
}
fn renderer_set_water_visible(_visible: bool) {}

/// TODO(port-renderer): forward to `renderer::skybox_visible()` /
/// `renderer::set_skybox_visible()`.
fn renderer_skybox_visible() -> bool {
    true
}
fn renderer_set_skybox_visible(_visible: bool) {}

/* ----------------------------------------------------------------------- */

/// Port of `mobile_ui_init()`.
pub fn init() {
    sgl::setup(&sgl::Desc {
        logger: sgl::Logger { func: Some(sokol::log::slog_func), ..Default::default() },
        /* Default sgl pipeline pool is 64; every module that draws
         * via sokol_gl (hotbar, menu, pause, chat, profiler, etc.)
         * adds one entry, and each sgl pipeline expands to multiple
         * sg_pipelines internally. Bumping the sgl pool keeps headroom
         * for future overlays without re-tripping the silent
         * "pause panel renders as ghost" failure. */
        pipeline_pool_size: 128,
        ..Default::default()
    });
}

/// Port of `mobile_ui_shutdown()`.
pub fn shutdown() {
    sgl::shutdown();
}

/* ----------------------------------------------------------------------- */
/* Pure tessellation (headless-testable, see module docs).                 */

/// Triangle fan for a filled circle: `seg` triangles around (cx, cy),
/// same angle stepping as the C loop.
fn circle_fan_tris(cx: f32, cy: f32, r: f32, seg: i32) -> Vec<[(f32, f32); 3]> {
    let mut tris = Vec::with_capacity(seg.max(0) as usize);
    for i in 0..seg {
        let a0 = i as f32 / seg as f32 * TWO_PI;
        let a1 = (i + 1) as f32 / seg as f32 * TWO_PI;
        tris.push([
            (cx, cy),
            (cx + a0.cos() * r, cy + a0.sin() * r),
            (cx + a1.cos() * r, cy + a1.sin() * r),
        ]);
    }
    tris
}

/// Triangle list for an annulus: two triangles per segment, same vertex
/// order as the C.
fn ring_tris(cx: f32, cy: f32, inner: f32, outer: f32, seg: i32) -> Vec<[(f32, f32); 3]> {
    let mut tris = Vec::with_capacity((seg.max(0) as usize) * 2);
    for i in 0..seg {
        let a0 = i as f32 / seg as f32 * TWO_PI;
        let a1 = (i + 1) as f32 / seg as f32 * TWO_PI;
        let (x0i, y0i) = (cx + a0.cos() * inner, cy + a0.sin() * inner);
        let (x1i, y1i) = (cx + a1.cos() * inner, cy + a1.sin() * inner);
        let (x0o, y0o) = (cx + a0.cos() * outer, cy + a0.sin() * outer);
        let (x1o, y1o) = (cx + a1.cos() * outer, cy + a1.sin() * outer);
        /* Two triangles per segment. */
        tris.push([(x0i, y0i), (x0o, y0o), (x1o, y1o)]);
        tris.push([(x0i, y0i), (x1o, y1o), (x1i, y1i)]);
    }
    tris
}

/// draw_segment's quad: a thick line from (x0, y0) to (x1, y1). None
/// when the segment has zero length (the C early-returns).
fn segment_quad(x0: f32, y0: f32, x1: f32, y1: f32, thick: f32) -> Option<[(f32, f32); 4]> {
    let dx = x1 - x0;
    let dy = y1 - y0;
    let len = (dx * dx + dy * dy).sqrt();
    if len <= 0.0 {
        return None;
    }
    let nx = -dy / len * thick * 0.5;
    let ny = dx / len * thick * 0.5;
    Some([(x0 - nx, y0 - ny), (x1 - nx, y1 - ny), (x1 + nx, y1 + ny), (x0 + nx, y0 + ny)])
}

/// Simple 3x5 glyph strokes for the button labels. The stroke endpoints
/// (x0, y0, x1, y1) per supported glyph - drawn as thick quads. Keeps
/// mobile_ui self-contained and readable without another font
/// dependency. Supported glyphs: B P J T H K X ^ v O F =
fn glyph_segments(ch: char, cx: f32, cy: f32, size: f32) -> Vec<[f32; 4]> {
    let half = size * 0.5;
    let top = cy - half;
    let bot = cy + half;
    let left = cx - half * 0.7;
    let right = cx + half * 0.7;
    let mid_y = cy;
    match ch {
        'B' => vec![
            [left, top, left, bot],
            [left, top, right, top],
            [left, mid_y, right, mid_y],
            [left, bot, right, bot],
            [right, top, right, mid_y],
            [right, mid_y, right, bot],
        ],
        'P' => vec![
            [left, top, left, bot],
            [left, top, right, top],
            [left, mid_y, right, mid_y],
            [right, top, right, mid_y],
        ],
        'J' => vec![
            [left, top, right, top],
            [(left + right) * 0.5, top, (left + right) * 0.5, bot - 4.0],
            [left + 2.0, bot, (left + right) * 0.5, bot - 4.0],
        ],
        'T' => vec![
            [left, top, right, top],
            [(left + right) * 0.5, top, (left + right) * 0.5, bot],
        ],
        'H' => vec![
            [left, top, left, bot],
            [right, top, right, bot],
            [left, mid_y, right, mid_y],
        ],
        'K' => vec![
            [left, top, left, bot],
            [left, mid_y, right, top],
            [left, mid_y, right, bot],
        ],
        'X' => vec![[left, top, right, bot], [left, bot, right, top]],
        '^' => vec![
            [left, mid_y, (left + right) * 0.5, top],
            [(left + right) * 0.5, top, right, mid_y],
        ],
        'v' => vec![
            [left, mid_y, (left + right) * 0.5, bot],
            [(left + right) * 0.5, bot, right, mid_y],
        ],
        'O' => vec![
            /* Simple checkmark "OK": a tick. */
            [left, mid_y, left + size * 0.25, bot - 2.0],
            [left + size * 0.25, bot - 2.0, right, top],
        ],
        'F' => vec![
            [left, top, left, bot],
            [left, top, right, top],
            [left, mid_y, right - 2.0, mid_y],
        ],
        '=' => {
            /* Hamburger menu - three horizontal stripes. */
            let dy = size * 0.30;
            vec![
                [left, mid_y - dy, right, mid_y - dy],
                [left, mid_y, right, mid_y],
                [left, mid_y + dy, right, mid_y + dy],
            ]
        }
        _ => Vec::new(),
    }
}

/* ----------------------------------------------------------------------- */
/* Submission wrappers around the pure tessellation. */

#[allow(clippy::too_many_arguments)]
fn draw_circle_fan(cx: f32, cy: f32, r: f32, seg: i32, rgb_r: f32, rgb_g: f32, rgb_b: f32, a: f32) {
    sgl::begin_triangles();
    sgl::c4f(rgb_r, rgb_g, rgb_b, a);
    for tri in circle_fan_tris(cx, cy, r, seg) {
        for (x, y) in tri {
            sgl::v2f(x, y);
        }
    }
    sgl::end();
}

#[allow(clippy::too_many_arguments)]
fn draw_ring(
    cx: f32,
    cy: f32,
    inner: f32,
    outer: f32,
    seg: i32,
    rgb_r: f32,
    rgb_g: f32,
    rgb_b: f32,
    a: f32,
) {
    sgl::begin_triangles();
    sgl::c4f(rgb_r, rgb_g, rgb_b, a);
    for tri in ring_tris(cx, cy, inner, outer, seg) {
        for (x, y) in tri {
            sgl::v2f(x, y);
        }
    }
    sgl::end();
}

#[allow(clippy::too_many_arguments)]
fn draw_segment(x0: f32, y0: f32, x1: f32, y1: f32, thick: f32, r: f32, g: f32, b: f32, a: f32) {
    let Some(q) = segment_quad(x0, y0, x1, y1, thick) else {
        return;
    };
    sgl::begin_quads();
    sgl::c4f(r, g, b, a);
    for (x, y) in q {
        sgl::v2f(x, y);
    }
    sgl::end();
}

fn draw_glyph(ch: char, cx: f32, cy: f32, size: f32, r: f32, g: f32, b: f32) {
    for s in glyph_segments(ch, cx, cy, size) {
        draw_segment(s[0], s[1], s[2], s[3], GLYPH_THICK, r, g, b, 1.0);
    }
}

/// Port of `mobile_ui_draw_button()`. Public so teleport_menu can draw
/// its own buttons using the same primitives (matches the look of the
/// other HUD buttons). Supported glyphs: BPJTXOxv^=F.
#[allow(clippy::too_many_arguments)]
pub fn draw_button(
    cx: f32,
    cy: f32,
    r: f32,
    fill_r: f32,
    fill_g: f32,
    fill_b: f32,
    fill_a: f32,
    ring_r: f32,
    ring_g: f32,
    ring_b: f32,
    ring_a: f32,
    glyph: char,
) {
    draw_circle_fan(cx, cy, r, 32, fill_r, fill_g, fill_b, fill_a);
    draw_ring(cx, cy, r - 2.0, r, 32, ring_r, ring_g, ring_b, ring_a);
    draw_glyph(glyph, cx, cy, 16.0, 1.0, 1.0, 1.0);
}

/* ----------------------------------------------------------------------- */

thread_local! {
    /* Debug-toggle menu state. The hamburger button at top-right toggles
     * S_MENU_OPEN; when open, a vertical column of toggle buttons drops
     * below it (terrain / water / sky / teleport / profiler). Closed by
     * default so first-time users don't see a debug overlay. Tracked
     * here rather than in the renderer because it's a UI concern - the
     * underlying toggles already live in the renderer's debug-flag
     * block. */
    static S_MENU_OPEN: Cell<bool> = const { Cell::new(false) };
    static S_DEBUG_MENU_VISIBLE: Cell<bool> = const { Cell::new(false) };
    static S_TELEPORT_VISIBLE: Cell<bool> = const { Cell::new(true) };
    /* Shared alpha-blended 2D pipeline. Created the first time draw()
     * runs; exposed via alpha_pipeline() so menu_pause and other
     * overlays can use it instead of each lazily making their own
     * (which was silently failing for the pause panel). */
    static S_PIP_ALPHA: Cell<sgl::Pipeline> = const { Cell::new(sgl::Pipeline { id: 0 }) };
}

/* Geometry of the menu-item buttons + the menu button itself,
 * recomputed every frame so it stays in sync with sapp_widthf().
 * Returned by menu_button_layout for both the draw and hit-test
 * paths so they can't drift apart. Item order:
 *   [0] terrain (H)   render flag
 *   [1] water   (J)   render flag
 *   [2] sky     (K)   render flag
 *   [3] teleport (T)  opens teleport list (replaces the old floating TP button)
 *   [4] profiler (P)  toggles the profiler overlay
 */
pub(crate) const MENU_ITEM_COUNT: usize = 5;

/// Port of `menu_layout_t`.
#[derive(Clone, Copy, Debug, PartialEq)]
pub(crate) struct MenuLayout {
    /// hamburger button centre
    pub menu_x: f32,
    pub menu_y: f32,
    /// shared x for the popup column
    pub item_x: f32,
    pub item_y: [f32; MENU_ITEM_COUNT],
    pub radius: f32,
    /// hit-box expansion for fat-thumb taps
    pub hit_pad: f32,
}

/// The pure math of `menu_button_layout()`, parameterised on the
/// screen width so it's testable headless.
pub(crate) fn menu_layout_for_width(screen_w: f32) -> MenuLayout {
    let radius = BTN_RADIUS;
    let hit_pad = 14.0; /* generous - same idea as the 96 px corner used before */
    let menu_x = screen_w - BTN_MARGIN - radius;
    let menu_y = BTN_MARGIN + radius;
    let dy = radius * 2.0 + BTN_GAP;
    let mut item_y = [0.0f32; MENU_ITEM_COUNT];
    for (i, y) in item_y.iter_mut().enumerate() {
        *y = menu_y + dy * (i + 1) as f32;
    }
    MenuLayout { menu_x, menu_y, item_x: menu_x, item_y, radius, hit_pad }
}

fn menu_button_layout() -> MenuLayout {
    menu_layout_for_width(screen_widthf())
}

/* Standalone mobile pause button: a top-left circle so mobile players
 * (no Esc key) can open the pause overlay. Always visible during
 * gameplay - main_web only calls mobile_ui::draw when in-game anyway.
 * Bigger than the right-cluster buttons so it's easy to spot + tap. */
const PAUSE_BTN_RADIUS: f32 = 30.0;

/// Port of `mobile_ui_circle_t`. Geometry of the standalone mobile
/// pause button in screen pixels, so main_web can hit-test the same
/// rectangle the draw path renders.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Circle {
    pub x: f32,
    pub y: f32,
    pub r: f32,
}

/// Port of `mobile_ui_pause_button_rect()`.
pub fn pause_button_rect() -> Circle {
    Circle {
        x: BTN_MARGIN + PAUSE_BTN_RADIUS,
        y: BTN_MARGIN + PAUSE_BTN_RADIUS,
        r: PAUSE_BTN_RADIUS,
    }
}

/// Port of `mobile_ui_alpha_pipeline()`. Shared alpha-blended 2D
/// sokol_gl pipeline, created on first draw() and proven to render
/// correctly in the gameplay swapchain pass. Returns an invalid
/// pipeline (.id == 0) until the first draw() call has run.
pub fn alpha_pipeline() -> sgl::Pipeline {
    S_PIP_ALPHA.with(|c| c.get())
}

/// Filled rectangle in screen-pixel coords using the shared alpha
/// pipeline. Caller must have already called sgl_load_pipeline +
/// sgl_ortho. Wraps the sgl_begin_quads / sgl_v2f / sgl_end pattern so
/// menu_pause etc. don't have to duplicate it.
#[allow(clippy::too_many_arguments)]
pub fn draw_rect(x: f32, y: f32, w: f32, h: f32, r: f32, g: f32, b: f32, a: f32) {
    sgl::begin_quads();
    sgl::c4f(r, g, b, a);
    sgl::v2f(x, y);
    sgl::v2f(x + w, y);
    sgl::v2f(x + w, y + h);
    sgl::v2f(x, y + h);
    sgl::end();
}

/// The four strips draw_rect_outline submits, as (x, y, w, h) - pure so
/// the geometry is pinnable headless.
pub(crate) fn rect_outline_strips(x: f32, y: f32, w: f32, h: f32, t: f32) -> [[f32; 4]; 4] {
    [
        [x, y, w, t],
        [x, y + h - t, w, t],
        [x, y, t, h],
        [x + w - t, y, t, h],
    ]
}

/// Rectangle outline (1-2 px strip on each edge) at the given rect.
/// Caller is responsible for matching the pipeline state.
#[allow(clippy::too_many_arguments)]
pub fn draw_rect_outline(x: f32, y: f32, w: f32, h: f32, t: f32, r: f32, g: f32, b: f32, a: f32) {
    for s in rect_outline_strips(x, y, w, h, t) {
        draw_rect(s[0], s[1], s[2], s[3], r, g, b, a);
    }
}

/// Toggle whether the top-right hamburger debug menu is drawn /
/// hit-tested. Off by default; main_web flips it on along with every
/// other debug surface when F2 is pressed.
pub fn set_debug_menu_visible(visible: bool) {
    S_DEBUG_MENU_VISIBLE.with(|c| c.set(visible));
    if !visible {
        S_MENU_OPEN.with(|c| c.set(false)); /* collapse the popup */
    }
}

/// Toggle whether the standalone teleport (T) button + the teleport
/// menu's mobile nav buttons are drawn / hit-tested. Survival players
/// shouldn't have access to fast travel, so main_web flips this off
/// whenever survival mode is on. On by default.
pub fn set_teleport_visible(visible: bool) {
    S_TELEPORT_VISIBLE.with(|c| c.set(visible));
}

/* ----------------------------------------------------------------------- */
/* Hit-testing.                                                             */

/// What a touch landed on inside the debug menu.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum MenuHit {
    /// the hamburger / X button itself
    MenuButton,
    /// popup column entry (index into the item order above)
    Item(usize),
}

/// The pure hit table of `mobile_ui_handle_touch()`: square boxes via
/// abs-distance compares, exactly like the C `fabsf` pair. The menu
/// button gets the full top-right corner zone for mobile fat-thumb
/// friendliness - same generosity the original corner-based debug
/// toggles used. The popup items use a tighter hit_pad so adjacent
/// items don't overlap their hit boxes as much (their centres sit
/// 2*radius + BTN_GAP apart); on overlap the lower-indexed item wins,
/// like the C loop.
pub(crate) fn menu_hit_test(
    l: &MenuLayout,
    menu_open: bool,
    teleport_visible: bool,
    x: f32,
    y: f32,
) -> Option<MenuHit> {
    let menu_r = l.radius + 30.0;
    let item_r = l.radius + l.hit_pad;

    if (x - l.menu_x).abs() <= menu_r && (y - l.menu_y).abs() <= menu_r {
        return Some(MenuHit::MenuButton);
    }
    if !menu_open {
        return None;
    }

    for i in 0..MENU_ITEM_COUNT {
        /* Skip the teleport item entirely when teleport is hidden -
         * survival players shouldn't be able to summon the teleport
         * menu via the hamburger either. */
        if i == 3 && !teleport_visible {
            continue;
        }
        if (x - l.item_x).abs() <= item_r && (y - l.item_y[i]).abs() <= item_r {
            return Some(MenuHit::Item(i));
        }
    }
    None
}

/// Port of `mobile_ui_handle_touch()`. Hit-test the menu button +
/// (when open) its popup column. Returns true if the touch / click
/// landed on a debug button - the caller (main_web) treats that as an
/// exclusive event so the underlying movement layer doesn't also see
/// the tap. Coordinates are in pixels, origin top-left, matching
/// sapp_event touch / mouse positions.
pub fn handle_touch(x: f32, y: f32) -> bool {
    if !S_DEBUG_MENU_VISIBLE.with(|c| c.get()) {
        return false;
    }
    let l = menu_button_layout();
    let open = S_MENU_OPEN.with(|c| c.get());
    let tp_visible = S_TELEPORT_VISIBLE.with(|c| c.get());
    match menu_hit_test(&l, open, tp_visible, x, y) {
        Some(MenuHit::MenuButton) => {
            S_MENU_OPEN.with(|c| c.set(!open));
            true
        }
        Some(MenuHit::Item(i)) => {
            match i {
                0 => renderer_set_terrain_visible(!renderer_terrain_visible()),
                1 => renderer_set_water_visible(!renderer_water_visible()),
                2 => renderer_set_skybox_visible(!renderer_skybox_visible()),
                3 => teleport_menu::toggle(),
                4 => profiler::toggle_visible(),
                _ => {}
            }
            true
        }
        None => false,
    }
}

/* ----------------------------------------------------------------------- */

/// Port of `mobile_ui_draw()`. Must be called inside the main render
/// pass (after sg_begin_pass, before sg_end_pass). Submits orthographic
/// 2D geometry via sokol_gl.
pub fn draw() {
    let w = screen_widthf();
    let h = screen_heightf();
    if w <= 0.0 || h <= 0.0 {
        return;
    }

    /* Standalone teleport (T) shortcut anchored at the bottom-right.
     * Only debug-mode + creative players ever see this; mobile uses
     * the F2 hamburger menu's T entry to reach the same flow. */
    let bx = w - BTN_MARGIN - BTN_RADIUS;
    let tp_y = h - BTN_MARGIN - BTN_RADIUS;

    let tp_visible = S_TELEPORT_VISIBLE.with(|c| c.get());

    /* No on-canvas BREAK / PLACE / JUMP buttons any more - the DOM
     * control deck handles touch input. Clear the hit rects so a
     * stale on-canvas button can't fire on a stray tap. */
    input::register_mobile_buttons(0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0);
    input::state_mut(|in_| {
        in_.btn_tp_cx = bx;
        in_.btn_tp_cy = tp_y;
        in_.btn_tp_r = if tp_visible { BTN_RADIUS } else { 0.0 };
    });

    /* Orthographic projection: (0,0) top-left to (w,h) bottom-right. */
    sgl::defaults();
    sgl::matrix_mode_projection();
    sgl::load_identity();
    sgl::ortho(0.0, w, h, 0.0, -1.0, 1.0);
    sgl::matrix_mode_modelview();
    sgl::load_identity();

    /* Alpha-blended 2D. sokol_gl defaults don't enable blending; set a
     * pipeline with SRC_ALPHA / ONE_MINUS_SRC_ALPHA below the UI.
     * Stashed in S_PIP_ALPHA on first call so other overlays
     * (menu_pause::draw, etc.) can use the same pipeline rather than
     * each lazily creating their own (which silently failed for the
     * pause panel on some browser / driver combos). */
    if S_PIP_ALPHA.with(|c| c.get()).id == 0 {
        let mut desc = sg::PipelineDesc::new();
        desc.colors[0].blend.enabled = true;
        desc.colors[0].blend.src_factor_rgb = sg::BlendFactor::SrcAlpha;
        desc.colors[0].blend.dst_factor_rgb = sg::BlendFactor::OneMinusSrcAlpha;
        desc.colors[0].blend.src_factor_alpha = sg::BlendFactor::One;
        desc.colors[0].blend.dst_factor_alpha = sg::BlendFactor::One;
        let pip = sgl::make_pipeline(&desc);
        S_PIP_ALPHA.with(|c| c.set(pip));
        /* One-shot trace so we can confirm the pool wasn't exhausted
         * when this pipeline went in. id != 0 means valid; id == 0
         * means sg_make_pipeline silently failed (any sgl_draw bound
         * to this pipeline will render nothing). */
        println!("[mobile_ui] S_PIP_ALPHA created: id={}", pip.id);
    }
    sgl::load_pipeline(S_PIP_ALPHA.with(|c| c.get()));

    /* On-canvas joysticks + BREAK / PLACE / JUMP buttons used to live
     * here. They've been retired in favour of the DOM control deck
     * (mobile-only; see main_web's tenebris_mobile_controls_install).
     * Desktop never needed the on-canvas duplicates - keyboard +
     * mouse cover everything. The standalone teleport (T) shortcut
     * stays because it's debug / creative-only and is gated by F2
     * via S_TELEPORT_VISIBLE - mobile reaches teleport through the
     * F2 hamburger menu below. */
    if tp_visible {
        draw_circle_fan(bx, tp_y, BTN_RADIUS, 32, 0.35, 0.20, 0.50, 0.50);
        draw_ring(bx, tp_y, BTN_RADIUS - 2.0, BTN_RADIUS, 32, 0.85, 0.60, 1.00, 0.75);
        draw_glyph('T', bx, tp_y, 16.0, 1.0, 0.95, 1.0);
    }

    /* Debug-toggle menu - single hamburger button at the top-right
     * corner that drops down a vertical column of three toggles when
     * open: terrain (H), water (J), sky (K). Each toggle paints
     * itself in a coloured "on" state or dim-red "off" state so the
     * current setting is unmissable. Hit-testing lives in
     * handle_touch so the layout in menu_button_layout() is the only
     * source of truth shared by the draw + tap paths.
     *
     * Hidden unless main_web has flipped on the debug UI master (F2).
     * The dedicated teleport (T) button above stays visible
     * regardless - it's a gameplay control, not debug. */
    if S_DEBUG_MENU_VISIBLE.with(|c| c.get()) {
        let l = menu_button_layout();
        let open = S_MENU_OPEN.with(|c| c.get());
        let r = l.radius;

        /* Hamburger / X button itself. Glyph flips to indicate
         * open vs closed state. */
        draw_circle_fan(
            l.menu_x,
            l.menu_y,
            r,
            32,
            if open { 0.55 } else { 0.20 },
            if open { 0.45 } else { 0.22 },
            if open { 0.15 } else { 0.28 },
            0.65,
        );
        draw_ring(
            l.menu_x,
            l.menu_y,
            r - 2.0,
            r,
            32,
            if open { 1.00 } else { 0.85 },
            if open { 0.95 } else { 0.90 },
            if open { 0.55 } else { 1.00 },
            0.85,
        );
        draw_glyph(if open { 'X' } else { '=' }, l.menu_x, l.menu_y, 16.0, 1.0, 1.0, 1.0);

        if open {
            /* (glyph, on, on-tint rgb) per item. */
            let items: [(char, bool, f32, f32, f32); MENU_ITEM_COUNT] = [
                ('H', renderer_terrain_visible(), 0.20, 0.25, 0.35), /* terrain */
                ('J', renderer_water_visible(), 0.10, 0.30, 0.40),   /* water   */
                ('K', renderer_skybox_visible(), 0.40, 0.25, 0.10),  /* sky     */
                ('T', teleport_menu::is_open(), 0.35, 0.20, 0.50),   /* teleport */
                ('P', profiler::visible(), 0.15, 0.45, 0.20),        /* profiler */
            ];
            for (i, item) in items.iter().enumerate() {
                /* Mirror handle_touch's skip - keep the row empty
                 * rather than re-laying-out the column, which would
                 * confuse the hit-test math. */
                if i == 3 && !tp_visible {
                    continue;
                }
                let ix = l.item_x;
                let iy = l.item_y[i];
                let (glyph, on, on_r, on_g, on_b) = *item;
                if on {
                    draw_circle_fan(ix, iy, r, 32, on_r, on_g, on_b, 0.55);
                    draw_ring(ix, iy, r - 2.0, r, 32, 0.85, 0.95, 1.00, 0.80);
                    draw_glyph(glyph, ix, iy, 16.0, 1.00, 1.00, 1.00);
                } else {
                    draw_circle_fan(ix, iy, r, 32, 0.45, 0.10, 0.10, 0.65);
                    draw_ring(ix, iy, r - 2.0, r, 32, 1.00, 0.45, 0.45, 0.85);
                    draw_glyph(glyph, ix, iy, 16.0, 1.00, 0.85, 0.85);
                }
            }
        }
    }

    /* Teleport-menu nav buttons piggyback on this state block so they
     * share the same orthographic pipeline + blend. Gated on the same
     * flag as the standalone T button so survival players never see
     * the teleport-list overlay or its nav arrows. */
    if tp_visible {
        teleport_menu::draw_mobile_buttons();
    }

    /* (Pause button now lives as an HTML overlay in main_web -
     * the sokol_gl on-canvas version was invisible on certain
     * mobile browsers, and the DOM button handles touch + visibility
     * more reliably anyway.) */

    /* Single sgl_draw lives at the end of main_web's frame so all
     * UI modules get their geometry uploaded together. See the
     * comment at that flush site for the upload-once-per-frame
     * rationale. */
}

/* ----------------------------------------------------------------------- */

#[cfg(test)]
mod tests {
    use super::*;

    fn setup(w: f32, h: f32) {
        test_doubles::SCREEN.with(|c| c.set((w, h)));
        S_MENU_OPEN.with(|c| c.set(false));
        S_DEBUG_MENU_VISIBLE.with(|c| c.set(false));
        S_TELEPORT_VISIBLE.with(|c| c.set(true));
    }

    /* -- layout ----------------------------------------------------------- */

    #[test]
    fn menu_layout_pinned_at_800px() {
        let l = menu_layout_for_width(800.0);
        assert_eq!(l.radius, 22.0);
        assert_eq!(l.hit_pad, 14.0);
        assert_eq!(l.menu_x, 764.0); /* 800 - 14 - 22 */
        assert_eq!(l.menu_y, 36.0); /* 14 + 22 */
        assert_eq!(l.item_x, 764.0);
        /* dy = 2*22 + 10 = 54 */
        assert_eq!(l.item_y, [90.0, 144.0, 198.0, 252.0, 306.0]);
    }

    #[test]
    fn pause_button_rect_pinned() {
        assert_eq!(pause_button_rect(), Circle { x: 44.0, y: 44.0, r: 30.0 });
    }

    /* -- hit-test tables --------------------------------------------------- */

    #[test]
    fn menu_button_square_zone_with_corner_padding() {
        let l = menu_layout_for_width(800.0);
        /* menu_r = 22 + 30 = 52; the box is a SQUARE (abs compares) */
        assert_eq!(menu_hit_test(&l, false, true, 764.0, 36.0), Some(MenuHit::MenuButton));
        /* exact edges are inclusive */
        assert_eq!(menu_hit_test(&l, false, true, 764.0 + 52.0, 36.0), Some(MenuHit::MenuButton));
        assert_eq!(menu_hit_test(&l, false, true, 764.0 - 52.0, 36.0 + 52.0), Some(MenuHit::MenuButton));
        /* one past the edge misses */
        assert_eq!(menu_hit_test(&l, false, true, 764.0 + 52.1, 36.0), None);
        assert_eq!(menu_hit_test(&l, false, true, 764.0, 36.0 + 52.1), None);
        /* corner of the square would be outside a circle of r 52:
         * (45, 45) px off-centre - still a hit, pinning square-not-
         * circle semantics */
        assert_eq!(menu_hit_test(&l, false, true, 764.0 - 45.0, 36.0 + 45.0), Some(MenuHit::MenuButton));
    }

    #[test]
    fn items_unreachable_while_closed() {
        let l = menu_layout_for_width(800.0);
        assert_eq!(menu_hit_test(&l, false, true, 764.0, 144.0), None);
        assert_eq!(menu_hit_test(&l, true, true, 764.0, 144.0), Some(MenuHit::Item(1)));
    }

    #[test]
    fn item_boxes_pinned_with_edges() {
        let l = menu_layout_for_width(800.0);
        /* item_r = 22 + 14 = 36 */
        for i in 0..MENU_ITEM_COUNT {
            assert_eq!(
                menu_hit_test(&l, true, true, 764.0, l.item_y[i]),
                Some(MenuHit::Item(i)),
                "centre of item {}",
                i
            );
        }
        /* exact horizontal edge inclusive */
        assert_eq!(menu_hit_test(&l, true, true, 764.0 - 36.0, 306.0), Some(MenuHit::Item(4)));
        assert_eq!(menu_hit_test(&l, true, true, 764.0 - 36.1, 306.0), None);
        /* below the last item's box: 306 + 36 hits, +36.1 misses */
        assert_eq!(menu_hit_test(&l, true, true, 764.0, 342.0), Some(MenuHit::Item(4)));
        assert_eq!(menu_hit_test(&l, true, true, 764.0, 342.1), None);
    }

    #[test]
    fn overlapping_item_boxes_first_index_wins() {
        /* Item pitch is 54 px but boxes are 72 px tall, so the bands
         * overlap; the C loop order resolves the tie to the lower
         * index. y = 120 is within 36 of both item 0 (90) and item 1
         * (144). */
        let l = menu_layout_for_width(800.0);
        assert_eq!(menu_hit_test(&l, true, true, 764.0, 120.0), Some(MenuHit::Item(0)));
        /* past item 0's band the next item takes over */
        assert_eq!(menu_hit_test(&l, true, true, 764.0, 126.1), Some(MenuHit::Item(1)));
    }

    #[test]
    fn hidden_teleport_skips_item_3_only() {
        let l = menu_layout_for_width(800.0);
        assert_eq!(menu_hit_test(&l, true, false, 764.0, 252.0), None);
        /* the row is NOT re-laid-out: 2 and 4 keep their slots */
        assert_eq!(menu_hit_test(&l, true, false, 764.0, 198.0), Some(MenuHit::Item(2)));
        assert_eq!(menu_hit_test(&l, true, false, 764.0, 306.0), Some(MenuHit::Item(4)));
        /* item 3's now-uncovered band is dead space: 252 is > 36 px
         * from both neighbours (198 / 306), so nothing answers there
         * until y re-enters item 4's box at 306 - 36 = 270 */
        assert_eq!(menu_hit_test(&l, true, false, 764.0, 252.1), None);
        assert_eq!(menu_hit_test(&l, true, false, 764.0, 270.0), Some(MenuHit::Item(4)));
    }

    /* -- handle_touch state machine ------------------------------------------ */

    #[test]
    fn handle_touch_requires_debug_visible() {
        setup(800.0, 600.0);
        assert!(!handle_touch(764.0, 36.0)); /* hidden -> ignored */
        set_debug_menu_visible(true);
        assert!(handle_touch(764.0, 36.0)); /* opens */
        assert!(S_MENU_OPEN.with(|c| c.get()));
        assert!(handle_touch(764.0, 36.0)); /* toggles closed */
        assert!(!S_MENU_OPEN.with(|c| c.get()));
    }

    #[test]
    fn handle_touch_dispatches_items_and_misses_fall_through() {
        setup(800.0, 600.0);
        set_debug_menu_visible(true);
        /* closed: item tap falls through to the game */
        assert!(!handle_touch(764.0, 144.0));
        /* open it, then the same tap is consumed (item 1 = water,
         * dispatch is a TODO(port-renderer) seam) */
        assert!(handle_touch(764.0, 36.0));
        assert!(handle_touch(764.0, 144.0));
        /* teleport item consumed AND toggles the (thread-local)
         * teleport menu */
        assert!(!teleport_menu::is_open());
        assert!(handle_touch(764.0, 252.0));
        assert!(teleport_menu::is_open());
        assert!(handle_touch(764.0, 252.0));
        assert!(!teleport_menu::is_open());
        /* a tap nowhere near the column falls through */
        assert!(!handle_touch(100.0, 300.0));
        /* menu stays open across item taps */
        assert!(S_MENU_OPEN.with(|c| c.get()));
    }

    #[test]
    fn hiding_debug_menu_collapses_popup() {
        setup(800.0, 600.0);
        set_debug_menu_visible(true);
        handle_touch(764.0, 36.0); /* open */
        set_debug_menu_visible(false);
        assert!(!S_MENU_OPEN.with(|c| c.get()));
        set_debug_menu_visible(true);
        /* popup stayed collapsed: item tap falls through */
        assert!(!handle_touch(764.0, 144.0));
    }

    #[test]
    fn teleport_hidden_blocks_item_3_via_handle_touch() {
        setup(800.0, 600.0);
        set_debug_menu_visible(true);
        set_teleport_visible(false);
        handle_touch(764.0, 36.0); /* open */
        assert!(!handle_touch(764.0, 252.0)); /* teleport slot dead */
        assert!(handle_touch(764.0, 198.0)); /* sky still live */
    }

    /* -- tessellation pins ------------------------------------------------- */

    #[test]
    fn circle_fan_segment_count_and_endpoints() {
        let tris = circle_fan_tris(10.0, 20.0, 22.0, 32);
        assert_eq!(tris.len(), 32); /* one tri per segment */
        /* every triangle is anchored at the centre */
        for t in &tris {
            assert_eq!(t[0], (10.0, 20.0));
        }
        /* first rim vertex sits at angle 0 -> (cx + r, cy) */
        assert!((tris[0][1].0 - 32.0).abs() < 1e-4);
        assert!((tris[0][1].1 - 20.0).abs() < 1e-4);
        /* fan closes: last triangle's trailing vertex returns to
         * angle 2*pi == angle 0 */
        assert!((tris[31][2].0 - 32.0).abs() < 1e-3);
        assert!((tris[31][2].1 - 20.0).abs() < 1e-3);
        /* adjacent triangles share an edge */
        assert_eq!(tris[0][2], tris[1][1]);
    }

    #[test]
    fn ring_two_tris_per_segment() {
        let tris = ring_tris(0.0, 0.0, 20.0, 22.0, 32);
        assert_eq!(tris.len(), 64);
        /* first segment, inner/outer radii at angle 0 */
        assert!((tris[0][0].0 - 20.0).abs() < 1e-4); /* inner */
        assert!((tris[0][1].0 - 22.0).abs() < 1e-4); /* outer */
        /* second triangle of the pair reuses the first inner vertex */
        assert_eq!(tris[0][0], tris[1][0]);
        /* and the shared outer vertex */
        assert_eq!(tris[0][2], tris[1][1]);
    }

    #[test]
    fn segment_quad_pinned_and_degenerate_rejected() {
        /* horizontal segment, thick 3 -> offsets purely in y */
        let q = segment_quad(0.0, 0.0, 10.0, 0.0, 3.0).unwrap();
        assert_eq!(q, [(0.0, -1.5), (10.0, -1.5), (10.0, 1.5), (0.0, 1.5)]);
        /* vertical segment -> offsets purely in x (note sign: normal
         * is (-dy, dx)/len) */
        let q = segment_quad(0.0, 0.0, 0.0, 10.0, 3.0).unwrap();
        assert_eq!(q, [(1.5, 0.0), (1.5, 10.0), (-1.5, 10.0), (-1.5, 0.0)]);
        /* zero-length segment is dropped, like the C early-return */
        assert_eq!(segment_quad(5.0, 5.0, 5.0, 5.0, 3.0), None);
    }

    #[test]
    fn glyph_stroke_counts_pinned() {
        let strokes = |ch| glyph_segments(ch, 0.0, 0.0, 16.0).len();
        assert_eq!(strokes('B'), 6);
        assert_eq!(strokes('P'), 4);
        assert_eq!(strokes('J'), 3);
        assert_eq!(strokes('T'), 2);
        assert_eq!(strokes('H'), 3);
        assert_eq!(strokes('K'), 3);
        assert_eq!(strokes('X'), 2);
        assert_eq!(strokes('^'), 2);
        assert_eq!(strokes('v'), 2);
        assert_eq!(strokes('O'), 2);
        assert_eq!(strokes('F'), 3);
        assert_eq!(strokes('='), 3);
        /* unsupported glyphs draw nothing (C default: break) */
        assert_eq!(strokes('Q'), 0);
        assert_eq!(strokes(' '), 0);
    }

    #[test]
    fn glyph_t_geometry_pinned() {
        /* size 16 at origin: half 8, top -8, bot 8, left -5.6,
         * right 5.6 */
        let segs = glyph_segments('T', 0.0, 0.0, 16.0);
        assert_eq!(segs.len(), 2);
        let close =
            |s: &[f32; 4], e: [f32; 4]| s.iter().zip(e.iter()).all(|(a, b)| (a - b).abs() < 1e-5);
        assert!(close(&segs[0], [-5.6, -8.0, 5.6, -8.0])); /* crossbar */
        assert!(close(&segs[1], [0.0, -8.0, 0.0, 8.0])); /* stem */
    }

    #[test]
    fn button_tessellation_budget_pinned() {
        /* draw_button = fan(32) + ring(32) + glyph quads:
         * fan: 32 tris = 96 verts; ring: 64 tris = 192 verts;
         * each glyph stroke is one quad = 4 verts. */
        let fan_verts = circle_fan_tris(0.0, 0.0, 22.0, 32).len() * 3;
        let ring_verts = ring_tris(0.0, 0.0, 20.0, 22.0, 32).len() * 3;
        assert_eq!(fan_verts, 96);
        assert_eq!(ring_verts, 192);
        let glyph_verts = |ch| {
            glyph_segments(ch, 0.0, 0.0, 16.0)
                .iter()
                .filter(|s| segment_quad(s[0], s[1], s[2], s[3], GLYPH_THICK).is_some())
                .count()
                * 4
        };
        assert_eq!(fan_verts + ring_verts + glyph_verts('B'), 96 + 192 + 24);
        assert_eq!(fan_verts + ring_verts + glyph_verts('T'), 96 + 192 + 8);
        assert_eq!(fan_verts + ring_verts + glyph_verts('='), 96 + 192 + 12);
    }

    /* -- rect helpers --------------------------------------------------------- */

    #[test]
    fn rect_outline_strips_pinned() {
        let s = rect_outline_strips(10.0, 20.0, 100.0, 50.0, 2.0);
        assert_eq!(s[0], [10.0, 20.0, 100.0, 2.0]); /* top */
        assert_eq!(s[1], [10.0, 68.0, 100.0, 2.0]); /* bottom */
        assert_eq!(s[2], [10.0, 20.0, 2.0, 50.0]); /* left */
        assert_eq!(s[3], [108.0, 20.0, 2.0, 50.0]); /* right */
    }

    #[test]
    fn alpha_pipeline_invalid_until_first_draw() {
        /* Per-thread state: fresh test thread -> no draw() yet. */
        assert_eq!(alpha_pipeline().id, 0);
    }
}
