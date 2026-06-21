//! Port of `tenebris-c/src/client/hotbar_ui.{c,h}`.
//!
//! Textured hotbar drawn with sokol_gl. Replaces the old ASCII line in
//! main_web.c - slot icons sample the terrain atlas (same atlas the
//! mesher uses, one column per block) so the hotbar always shows the
//! exact texture you'll place. The selected slot gets a bright outer
//! ring; other slots get a dim frame. Stack count badges render in the
//! bottom-right corner of each slot.
//!
//! Usage:
//!   hotbar_ui::init();        // once at boot, after renderer init
//!   hotbar_ui::draw(&inv);    // each frame, on top of the swapchain
//!   hotbar_ui::shutdown();    // at exit
//!
//! # Renames (PORTING.md rule 4 - `hotbar_ui_` prefix dropped)
//!
//! - `hotbar_ui_init()`     -> `hotbar_ui::init()`
//! - `hotbar_ui_shutdown()` -> `hotbar_ui::shutdown()`
//! - `hotbar_ui_draw()`     -> `hotbar_ui::draw()`
//!
//! # sokol boundary (testability)
//!
//! The C interleaves layout math with sgl/sdtx submission inside
//! hotbar_ui_draw. The port factors the pure parts into
//! headless-testable helpers with the same math:
//!
//! - [`layout`]            - slot row geometry (desktop / mobile).
//! - [`slot_xy`]           - per-slot top-left position.
//! - [`publish_hitboxes`]  - the input.c hitbox publication block.
//! - [`frame_strips`]      - frame_quad's four filled strips.
//! - [`icon_uv`]           - atlas column -> (u0, u1) mapping.
//! - [`count_badge_text`]  - finite-count badge gate + digit string.
//! - [`count_badge_rect`] / [`number_badge_rect`] - badge quads.
//!
//! [`draw`] submits exactly what those helpers compute, in the same
//! pass order as the C (frames, icons, badges, sdtx digits).
//!
// Not wired into the app loop until the main_web port lands (final
// client wave); exercised by unit tests.
#![allow(dead_code)]

#[cfg(test)]
use crate::hex_mesher::HEX_ATLAS_TILES;
use crate::hex_mesher::HEX_ATLAS_U_STEP;
use crate::input;
use crate::inventory::{Inventory, INV_HOTBAR_SLOTS};
use crate::renderer;
use sokol::app as sapp;
use sokol::debugtext as sdtx;
use sokol::gfx as sg;
use sokol::gl as sgl;
use tenebris_core::blocks::{face_tile, Block, FaceCap};

use std::cell::Cell;

/* Slot geometry (pixels). Desktop uses 48 px slots centred at the
 * bottom; on mobile (perf mode) we shrink to 36 px so 9 slots fit a
 * ~412 CSS-px phone width. Mobile layout puts the inventory at the
 * VERY BOTTOM (so the player's thumb naturally reaches it) and
 * stacks the joysticks + action buttons above. The joystick CSS
 * (main_web.c) is positioned to sit just above this bar - keep the
 * three stacks (hotbar / joysticks / action buttons) coordinated. */
const SLOT_SIZE_DESKTOP: f32 = 48.0;
const SLOT_GAP_DESKTOP: f32 = 6.0;
const BOTTOM_MARGIN_DESKTOP: f32 = 18.0;
const SLOT_SIZE_MOBILE: f32 = 36.0;
const SLOT_GAP_MOBILE: f32 = 3.0;
const BOTTOM_MARGIN_MOBILE: f32 = 8.0;
const ICON_PAD: f32 = 4.0;

/* --------------------------------------------------------------------- */
/* Renderer reads, kept as module-local forwards so the call sites
 * below keep the exact C names. */

/// Forward of `renderer_perf_mode_enabled()`.
fn renderer_perf_mode_enabled() -> bool {
    renderer::perf_mode_enabled()
}

/// Forward of `renderer_atlas_view_id()`.
fn renderer_atlas_view_id() -> u32 {
    renderer::atlas_view_id()
}

/// Forward of `renderer_atlas_sampler_id()`.
fn renderer_atlas_sampler_id() -> u32 {
    renderer::atlas_sampler_id()
}

/* --------------------------------------------------------------------- */

thread_local! {
    /// untextured alpha-blended frames + bg
    static P_FRAME: Cell<sgl::Pipeline> = const { Cell::new(sgl::Pipeline { id: 0 }) };
    /// textured alpha-blended icon quads
    static P_ICON: Cell<sgl::Pipeline> = const { Cell::new(sgl::Pipeline { id: 0 }) };
    static P_READY: Cell<bool> = const { Cell::new(false) };
}

/// Port of `hotbar_ui_init()`.
pub fn init() {
    if P_READY.with(|c| c.get()) {
        return;
    }
    /* Both pipelines share the standard SRC_ALPHA / 1-SRC_ALPHA blend
     * mobile_ui already uses, so the hotbar composes cleanly with the
     * underlying scene + overlays. Two separate pipelines because
     * sokol_gl needs a textured-vs-untextured pipeline split (the
     * default pipeline is untextured; binding a texture to it would
     * sample garbage). */
    let mut blend_desc = sg::PipelineDesc::new();
    blend_desc.colors[0].blend.enabled = true;
    blend_desc.colors[0].blend.src_factor_rgb = sg::BlendFactor::SrcAlpha;
    blend_desc.colors[0].blend.dst_factor_rgb = sg::BlendFactor::OneMinusSrcAlpha;
    blend_desc.colors[0].blend.src_factor_alpha = sg::BlendFactor::One;
    blend_desc.colors[0].blend.dst_factor_alpha = sg::BlendFactor::One;
    P_FRAME.with(|c| c.set(sgl::make_pipeline(&blend_desc)));
    P_ICON.with(|c| c.set(sgl::make_pipeline(&blend_desc)));
    P_READY.with(|c| c.set(true));
}

/// Port of `hotbar_ui_shutdown()`.
pub fn shutdown() {
    /* Pipelines are freed by sgl_shutdown when mobile_ui::shutdown
     * tears down the global sgl context - no per-pipeline destroy
     * call needed. */
    P_READY.with(|c| c.set(false));
}

/* ----------------------------------------------------------------------- */
/* Pure layout helpers (headless-testable, see module docs).               */

/// Resolved slot-row geometry - the locals at the top of the C draw.
#[derive(Clone, Copy, Debug, PartialEq)]
pub(crate) struct Layout {
    pub mobile: bool,
    pub slot_size: f32,
    pub slot_gap: f32,
    pub bottom_margin: f32,
    pub x0: f32,
    pub y0: f32,
    pub slots: usize,
}

pub(crate) fn layout(w: f32, h: f32, mobile: bool) -> Layout {
    let slot_size = if mobile { SLOT_SIZE_MOBILE } else { SLOT_SIZE_DESKTOP };
    let slot_gap = if mobile { SLOT_GAP_MOBILE } else { SLOT_GAP_DESKTOP };
    let bottom_margin = if mobile { BOTTOM_MARGIN_MOBILE } else { BOTTOM_MARGIN_DESKTOP };
    let slots = INV_HOTBAR_SLOTS;
    let total_w = slots as f32 * slot_size + (slots - 1) as f32 * slot_gap;
    Layout {
        mobile,
        slot_size,
        slot_gap,
        bottom_margin,
        x0: (w - total_w) * 0.5,
        y0: h - bottom_margin - slot_size,
        slots,
    }
}

/// Top-left corner of slot `i`.
pub(crate) fn slot_xy(l: &Layout, i: usize) -> (f32, f32) {
    (l.x0 + i as f32 * (l.slot_size + l.slot_gap), l.y0)
}

/// Publish the slot hitboxes to input so a touch on a slot selects it.
/// Mobile-only feature - desktop uses number keys / mouse wheel and
/// doesn't need the touch dispatch (and we don't want a stray click on
/// the canvas to clobber the keyboard selection). Setting
/// slot_count = 0 deactivates the tap path.
pub(crate) fn publish_hitboxes(l: &Layout) {
    input::state_mut(|in_mut| {
        if l.mobile {
            in_mut.hotbar_x0 = l.x0;
            in_mut.hotbar_y0 = l.y0;
            in_mut.hotbar_slot_size = l.slot_size;
            in_mut.hotbar_slot_pitch = l.slot_size + l.slot_gap;
            in_mut.hotbar_slot_count = l.slots as i32;
        } else {
            in_mut.hotbar_slot_count = 0;
        }
    });
}

/// frame_quad's decomposition: top + bottom + left + right strips,
/// each as (x, y, w, h).
pub(crate) fn frame_strips(x: f32, y: f32, w: f32, h: f32, thick: f32) -> [[f32; 4]; 4] {
    [
        [x, y, w, thick],
        [x, y + h - thick, w, thick],
        [x, y, thick, h],
        [x + w - thick, y, thick, h],
    ]
}

/// Atlas column -> horizontal texcoord span (u0, u1).
pub(crate) fn icon_uv(col: i32) -> (f32, f32) {
    (col as f32 * HEX_ATLAS_U_STEP, (col + 1) as f32 * HEX_ATLAS_U_STEP)
}

/// Count badge gate + digit string. None for empty slots (nothing to
/// caption) and for CREATIVE_COUNT (>9000) - the "infinite" sentinel; a
/// giant number on every slot is just noise.
pub(crate) fn count_badge_text(block_type: Block, count: i32) -> Option<String> {
    if block_type == Block::Air || count <= 0 {
        return None;
    }
    if count > 9000 {
        return None;
    }
    Some(format!("{}", count))
}

/// Black quantity-badge rect at the bottom-right of a slot, sized to
/// the digit string (8 px per char at scale 1.0) + a 1-px halo.
pub(crate) fn count_badge_rect(x: f32, y: f32, slot_size: f32, ndigits: usize) -> [f32; 4] {
    let cell = 8.0f32;
    let text_w = cell * ndigits as f32;
    [x + slot_size - text_w - 3.0, y + slot_size - 11.0, text_w + 2.0, cell + 2.0]
}

/// Slot-number badge rect at the top-left of every slot.
pub(crate) fn number_badge_rect(x: f32, y: f32) -> [f32; 4] {
    let cell = 8.0f32;
    [x + 1.0, y + 1.0, cell + 2.0, cell + 2.0]
}

/* ----------------------------------------------------------------------- */
/* Untextured primitives. */

fn filled_quad(x: f32, y: f32, w: f32, h: f32, r: f32, g: f32, b: f32, a: f32) {
    sgl::begin_quads();
    sgl::c4f(r, g, b, a);
    sgl::v2f(x, y);
    sgl::v2f(x + w, y);
    sgl::v2f(x + w, y + h);
    sgl::v2f(x, y + h);
    sgl::end();
}

#[allow(clippy::too_many_arguments)]
fn frame_quad(x: f32, y: f32, w: f32, h: f32, thick: f32, r: f32, g: f32, b: f32, a: f32) {
    for s in frame_strips(x, y, w, h, thick) {
        filled_quad(s[0], s[1], s[2], s[3], r, g, b, a);
    }
}

/* ----------------------------------------------------------------------- */

/// Port of `hotbar_ui_draw()`.
pub fn draw(inv: &Inventory) {
    if !P_READY.with(|c| c.get()) {
        return;
    }

    let w = sapp::widthf();
    let h = sapp::heightf();
    if w <= 0.0 || h <= 0.0 {
        return;
    }

    /* Mobile gets smaller slots + a higher bottom margin so the bar
     * fits a phone screen and clears the virtual joysticks at the
     * bottom corners. renderer_perf_mode_enabled() matches the same
     * is-mobile gate the joysticks themselves use, so the two layouts
     * stay consistent. */
    let mobile = renderer_perf_mode_enabled();
    let l = layout(w, h, mobile);
    let slot_size = l.slot_size;
    let slot_gap = l.slot_gap;
    let (x0, y0) = (l.x0, l.y0);
    let slots = l.slots;

    publish_hitboxes(&l);

    /* Open a fresh sgl frame at pixel coordinates: (0,0) top-left,
     * (w,h) bottom-right. mobile_ui::draw uses an identical setup; the
     * two coexist as separate sgl_draw flushes. */
    sgl::defaults();
    sgl::matrix_mode_projection();
    sgl::load_identity();
    sgl::ortho(0.0, w, h, 0.0, -1.0, 1.0);
    sgl::matrix_mode_modelview();
    sgl::load_identity();

    /* ---- pass 1: untextured slot backgrounds + frames ---- */
    sgl::load_pipeline(P_FRAME.with(|c| c.get()));
    for i in 0..slots {
        let x = x0 + i as f32 * (slot_size + slot_gap);
        let y = y0;
        let selected = i as i32 == inv.selected;

        let bg = if selected { 0.20 } else { 0.10 };
        filled_quad(x, y, slot_size, slot_size, bg, bg, bg + 0.02, 0.80);

        if selected {
            /* Bright outer frame slightly inflated so the active slot
             * pops above the rest of the bar. */
            frame_quad(x - 2.0, y - 2.0, slot_size + 4.0, slot_size + 4.0, 2.5, 1.00, 0.88, 0.30, 0.95);
        } else {
            frame_quad(x, y, slot_size, slot_size, 1.5, 0.55, 0.55, 0.65, 0.85);
        }
    }

    /* ---- pass 2: textured icon quads, sampling the terrain atlas ---- */
    sgl::load_pipeline(P_ICON.with(|c| c.get()));
    sgl::enable_texture();
    sgl::texture(
        sg::View { id: renderer_atlas_view_id() },
        sg::Sampler { id: renderer_atlas_sampler_id() },
    );

    for i in 0..slots {
        let s = &inv.slots[i];
        if s.block_type == Block::Air || s.count <= 0 {
            continue;
        }

        let col = face_tile(s.block_type, FaceCap::Top) as i32;
        let (u0, u1) = icon_uv(col);

        let ix = x0 + i as f32 * (slot_size + slot_gap) + ICON_PAD;
        let iy = y0 + ICON_PAD;
        let iw = slot_size - ICON_PAD * 2.0;

        sgl::begin_quads();
        sgl::c4f(1.0, 1.0, 1.0, 1.0);
        sgl::v2f_t2f(ix, iy, u0, 0.0);
        sgl::v2f_t2f(ix + iw, iy, u1, 0.0);
        sgl::v2f_t2f(ix + iw, iy + iw, u1, 1.0);
        sgl::v2f_t2f(ix, iy + iw, u0, 1.0);
        sgl::end();
    }
    sgl::disable_texture();

    /* ---- pass 2b: black quantity badge under each finite-count slot ---
     * Sits on top of the textured icon but below the sdtx digits drawn
     * in pass 3, so the count reads clearly even when it overlaps a
     * bright tile colour. Sized to the digit string (8 px per char at
     * scale 1.0) + a 1-px halo. CREATIVE_COUNT (>9000) skips the badge
     * for the same reason pass 3 skips the digits - it's the "infinite"
     * sentinel and a giant number on every slot is just noise. */
    sgl::load_pipeline(P_FRAME.with(|c| c.get()));
    for i in 0..slots {
        let s = &inv.slots[i];
        let x = x0 + i as f32 * (slot_size + slot_gap);
        let y = y0;

        /* Slot number badge at the top-left of every slot. The number
         * always renders in pass 3 (selected = bright yellow, others =
         * soft grey) but the underlying scene was making it
         * inconsistent to read - bright sky behind the "1" of slot 1
         * erased it for the user. A black halo matches the count badge
         * at the bottom-right and gives the digits a consistent
         * surface. */
        {
            let r = number_badge_rect(x, y);
            filled_quad(r[0], r[1], r[2], r[3], 0.0, 0.0, 0.0, 0.85);
        }

        /* Count badge (bottom-right). Only for finite-count slots;
         * empty slots have nothing to caption and CREATIVE_COUNT
         * (>9000) is the "infinite" sentinel. */
        let Some(digits) = count_badge_text(s.block_type, s.count) else {
            continue;
        };
        let r = count_badge_rect(x, y, slot_size, digits.len());
        filled_quad(r[0], r[1], r[2], r[3], 0.0, 0.0, 0.0, 0.85);
    }

    /* No sgl_draw() here. sokol_gl uploads its vertex buffer only on
     * the FIRST sgl_draw of the frame, then never re-uploads; any
     * vertices queued by later modules would reference un-uploaded
     * GPU memory. main_web does a single sgl_draw at end of frame
     * after every UI module has queued. */

    /* ---- pass 3: slot numbers + finite-count badges via sdtx ---- */
    /* sdtx is fine to drive in a second flush per frame - main_web
     * already called sdtx_draw() before us, so this batch is its own
     * thing. Canvas is set to true pixels (8 px / cell at the oric
     * font) so we can position chars by dividing pixel coords by 8. */
    sdtx::canvas(w, h);
    sdtx::origin(0.0, 0.0);
    for i in 0..slots {
        let s = &inv.slots[i];
        let x = x0 + i as f32 * (slot_size + slot_gap);
        let y = y0;

        /* Slot number top-left. Bright on the selected slot, dim
         * otherwise - matches the frame highlight. */
        if i as i32 == inv.selected {
            sdtx::color3b(0xff, 0xe0, 0x40);
        } else {
            sdtx::color3b(0xc0, 0xc0, 0xd0);
        }
        sdtx::pos((x + 3.0) / 8.0, (y + 2.0) / 8.0);
        sdtx::puts(&format!("{}", i + 1));

        /* Stack count bottom-right. CREATIVE_COUNT (9999) is the
         * "effectively infinite" sentinel inventory sets - skip the
         * badge there because a giant number on every slot is just
         * noise. */
        let Some(buf) = count_badge_text(s.block_type, s.count) else {
            continue;
        };
        sdtx::color3b(0xff, 0xff, 0xff);
        sdtx::pos(
            (x + slot_size - 8.0 * buf.len() as f32 - 2.0) / 8.0,
            (y + slot_size - 10.0) / 8.0,
        );
        sdtx::puts(&buf);
    }
    sdtx::color3b(0xff, 0xff, 0xff);
    /* sdtx flush is centralised at the end of main_web's UI block.
     * Calling sdtx_draw here would force an early upload of the
     * vertex buffer, after which any text queued later in the same
     * frame (mining bar, pause overlay, nameplates) would render
     * stale GPU memory because sokol_debugtext guards
     * sg_update_buffer behind a once-per-frame frame_id check. */
}

/* ----------------------------------------------------------------------- */

#[cfg(test)]
mod tests {
    use super::*;
    use crate::inventory;
    use sokol::app::{Event, EventType, Touchpoint};

    /* -- layout rects -------------------------------------------------- */

    #[test]
    fn desktop_layout_pinned() {
        let l = layout(800.0, 600.0, false);
        /* total_w = 9*48 + 8*6 = 480 */
        assert_eq!(l.slot_size, 48.0);
        assert_eq!(l.slot_gap, 6.0);
        assert_eq!(l.bottom_margin, 18.0);
        assert_eq!(l.x0, 160.0);
        assert_eq!(l.y0, 534.0); /* 600 - 18 - 48 */
        assert_eq!(l.slots, 9);
        /* slot pitch = 54 px */
        assert_eq!(slot_xy(&l, 0), (160.0, 534.0));
        assert_eq!(slot_xy(&l, 1), (214.0, 534.0));
        assert_eq!(slot_xy(&l, 8), (160.0 + 8.0 * 54.0, 534.0));
    }

    #[test]
    fn mobile_layout_pinned() {
        /* ~412 CSS-px phone width: 9 slots of 36 px + 8 gaps of 3 px
         * = 348 px total, fits with margin. */
        let l = layout(412.0, 731.0, true);
        assert_eq!(l.slot_size, 36.0);
        assert_eq!(l.slot_gap, 3.0);
        assert_eq!(l.bottom_margin, 8.0);
        assert_eq!(l.x0, 32.0); /* (412 - 348) / 2 */
        assert_eq!(l.y0, 687.0); /* 731 - 8 - 36 */
        assert_eq!(slot_xy(&l, 4), (32.0 + 4.0 * 39.0, 687.0));
    }

    /* -- hitbox publication + selection mapping --------------------------- */

    #[test]
    fn mobile_publishes_hitboxes_desktop_deactivates() {
        input::init();
        let l = layout(412.0, 731.0, true);
        publish_hitboxes(&l);
        let st = input::state();
        assert_eq!(st.hotbar_x0, 32.0);
        assert_eq!(st.hotbar_y0, 687.0);
        assert_eq!(st.hotbar_slot_size, 36.0);
        assert_eq!(st.hotbar_slot_pitch, 39.0);
        assert_eq!(st.hotbar_slot_count, 9);

        let l = layout(800.0, 600.0, false);
        publish_hitboxes(&l);
        assert_eq!(input::state().hotbar_slot_count, 0);
        /* the rest of the published fields are left stale on purpose -
         * slot_count = 0 alone deactivates the tap path, like the C */
        assert_eq!(input::state().hotbar_x0, 32.0);
    }

    #[test]
    fn touch_on_published_slot_selects_it() {
        /* Round-trip: hotbar publishes, input classifies the tap. */
        input::init();
        let l = layout(412.0, 731.0, true);
        publish_hitboxes(&l);

        /* centre of slot 6: x = 32 + 6*39 + 18 = 284, y = 687 + 18 */
        let mut e = Event {
            _type: EventType::TouchesBegan,
            num_touches: 1,
            ..Default::default()
        };
        e.touches[0] = Touchpoint {
            identifier: 1,
            pos_x: 284.0,
            pos_y: 705.0,
            changed: true,
            ..Default::default()
        };
        input::handle_event(&e);
        let hb = input::state().hotbar;
        assert!(hb[6]);
        assert!(!hb[5] && !hb[7]);
    }

    /* -- frame / badge geometry -------------------------------------------- */

    #[test]
    fn selected_frame_inflates_and_thickens() {
        /* selected: frame_quad(x-2, y-2, s+4, s+4, 2.5) */
        let (x, y) = (160.0f32, 534.0f32);
        let s = frame_strips(x - 2.0, y - 2.0, 48.0 + 4.0, 48.0 + 4.0, 2.5);
        assert_eq!(s[0], [158.0, 532.0, 52.0, 2.5]); /* top */
        assert_eq!(s[1], [158.0, 532.0 + 52.0 - 2.5, 52.0, 2.5]); /* bottom */
        assert_eq!(s[2], [158.0, 532.0, 2.5, 52.0]); /* left */
        assert_eq!(s[3], [158.0 + 52.0 - 2.5, 532.0, 2.5, 52.0]); /* right */

        /* unselected: frame_quad(x, y, s, s, 1.5) */
        let s = frame_strips(x, y, 48.0, 48.0, 1.5);
        assert_eq!(s[0], [160.0, 534.0, 48.0, 1.5]);
        assert_eq!(s[3], [160.0 + 46.5, 534.0, 1.5, 48.0]);
    }

    #[test]
    fn icon_uv_maps_atlas_columns() {
        /* grass top cap is atlas column 4 (pinned in blocks.rs tests) */
        let col = face_tile(Block::Grass, FaceCap::Top) as i32;
        assert_eq!(col, 4);
        let (u0, u1) = icon_uv(col);
        assert!((u0 - 4.0 / 29.0).abs() < 1e-7);
        assert!((u1 - 5.0 / 29.0).abs() < 1e-7);
        /* last column ends exactly at 1.0 */
        let (_, u1) = icon_uv(HEX_ATLAS_TILES - 1);
        assert!((u1 - 1.0).abs() < 1e-6);
    }

    #[test]
    fn count_badge_gates_match_c() {
        assert_eq!(count_badge_text(Block::Stone, 7), Some("7".to_string()));
        assert_eq!(count_badge_text(Block::Stone, 123), Some("123".to_string()));
        assert_eq!(count_badge_text(Block::Stone, 9000), Some("9000".to_string()));
        /* CREATIVE_COUNT sentinel: strictly > 9000 skips */
        assert_eq!(count_badge_text(Block::Stone, 9001), None);
        assert_eq!(count_badge_text(Block::Stone, 9999), None);
        /* empty slots */
        assert_eq!(count_badge_text(Block::Air, 5), None);
        assert_eq!(count_badge_text(Block::Stone, 0), None);
        assert_eq!(count_badge_text(Block::Stone, -1), None);
    }

    #[test]
    fn badge_rects_pinned() {
        /* slot at (160, 534), size 48 */
        assert_eq!(number_badge_rect(160.0, 534.0), [161.0, 535.0, 10.0, 10.0]);
        /* 1 digit: text_w 8 -> x = 160 + 48 - 8 - 3 */
        assert_eq!(count_badge_rect(160.0, 534.0, 48.0, 1), [197.0, 571.0, 10.0, 10.0]);
        /* 3 digits: text_w 24 */
        assert_eq!(count_badge_rect(160.0, 534.0, 48.0, 3), [181.0, 571.0, 26.0, 10.0]);
    }

    #[test]
    fn selection_mapping_uses_inventory_selected() {
        /* The highlight predicate is i == inv.selected; pin it through
         * a real inventory so the type plumbing stays honest. */
        let mut inv = Inventory::default();
        inventory::init_creative(&mut inv);
        inventory::select(&mut inv, 3);
        let flags: Vec<bool> = (0..INV_HOTBAR_SLOTS).map(|i| i as i32 == inv.selected).collect();
        assert_eq!(flags.iter().filter(|&&f| f).count(), 1);
        assert!(flags[3]);
    }
}
