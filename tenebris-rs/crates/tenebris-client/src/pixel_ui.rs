//! Port of `tenebris-c/src/client/pixel_ui.{c,h}`.
//!
//! Immediate-mode UI module for the in-game inventory and crafting
//! screens. Renders nine-sliced pixel-art panels, buttons (in
//! normal/hover/pressed/disabled states), and inventory slots from a
//! single sprite atlas PNG. Layout + nine-slice margins for every
//! sprite live in assets/config/ui.yaml so the look is theme-swappable:
//! drop in a different PNG with the same layout and the same widget
//! calls paint the new theme.
//!
//! # Renames (PORTING.md rule 4 - `pixel_ui_` prefix dropped)
//!
//! - `pixel_ui_init()`         -> `pixel_ui::init()`
//! - `pixel_ui_shutdown()`     -> `pixel_ui::shutdown()`
//! - `pixel_ui_event()`        -> `pixel_ui::event()`
//! - `pixel_ui_begin()/end()`  -> `pixel_ui::begin()/end()`
//! - `pixel_ui_panel()`        -> `pixel_ui::panel()`
//! - `pixel_ui_title_bar()`    -> `pixel_ui::title_bar()`
//! - `pixel_ui_label()`        -> `pixel_ui::label()`
//! - `pixel_ui_button()`       -> `pixel_ui::button()`
//! - `pixel_ui_slot()`         -> `pixel_ui::slot()`
//! - `pixel_ui_demo_*()`       -> `pixel_ui::demo_*()`
//!
//! # Deviations forced by Rust
//!
//! - The C tracks hot/active widgets by POINTER identity of the
//!   `const char* id` argument (string literals dedupe at compile
//!   time). Rust `&str` literals have no such guarantee across
//!   codegen units, so the port compares ids by VALUE and stores the
//!   active/hot id as an owned `String`. The API contract weakens
//!   accordingly: ids must be *unique strings* rather than *stable
//!   pointers* - every C call site already satisfies that.
//! - stb_image -> `renderer::load_png_rgba` (the `png` crate), same
//!   RGBA8 output, no vertical flip - matching the C's
//!   `stbi_set_flip_vertically_on_load(0)`.
//!
//! # sokol boundary (testability)
//!
//! The pure parts are factored out of the sgl/sdtx submission so the
//! geometry + state machine pin headless, mirroring hotbar_ui.rs:
//!
//! - [`point_in_rect`]      - the widget hit-test.
//! - [`nine_slice_quads`]   - draw_nine_slice's (dst, src) quad list,
//!                            including the margin clamp + the
//!                            all-zero-margins 1:1 blit degenerate.
//! - [`Interact`]           - the hot/active state machine
//!                            (begin/end frame edges + per-widget
//!                            update), exactly the C field updates.
//! - [`button_sprite`]      - pressed-wins-over-hover sprite pick.
//! - [`slot_sprite`]        - slot state -> sprite pick.
//! - [`slot_count_text`]    - count badge gate (finite stacks only).

// Wired into app.rs (init / event / demo draw); the widget surface is
// consumed by inventory_screen.rs.
#![allow(dead_code)]

use sokol::app as sapp;
use sokol::debugtext as sdtx;
use sokol::gfx as sg;
use sokol::gl as sgl;
use tenebris_core::config::{self, UiSprite, UiSpriteId};

use std::cell::RefCell;

use crate::renderer::load_png_rgba;

/* ----------------------------------------------------------------------- */
/* Public widget-state enums (ports of the C typedefs). */

/// Port of `pixel_ui_button_state_t`.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ButtonState {
    Normal,
    /// renders the greyed-out style AND suppresses hover / click
    Disabled,
    /// renders the hover sprite regardless of mouse position so a tab
    /// bar can highlight the active tab; still processes clicks
    Active,
}

/// Port of `pixel_ui_slot_state_t`.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum SlotState {
    Normal,
    Selected,
    Disabled,
}

/* ----------------------------------------------------------------------- */
/* Hot/active interaction state - the pure half of the module state
 * (headless-testable). `hot` is the widget under the cursor THIS
 * frame; `active` is the widget the user pressed down on (clicks fire
 * when the cursor releases over the active widget). */

#[derive(Default, Debug)]
pub(crate) struct Interact {
    pub(crate) hot: Option<String>,
    pub(crate) active: Option<String>,

    /* Mouse / touch state pumped by event(). mouse_down tracks the
     * current button-held state; mouse_pressed and mouse_released are
     * the per-frame edges, cleared in end(). */
    pub(crate) mouse_x: f32,
    pub(crate) mouse_y: f32,
    pub(crate) mouse_down: bool,
    pub(crate) mouse_pressed: bool,
    pub(crate) mouse_released: bool,
}

impl Interact {
    /// The per-widget hot/active update shared by button + slot
    /// (the C block inside pixel_ui_button / pixel_ui_slot). Returns
    /// true on the click edge (release over the active widget).
    pub(crate) fn update_widget(&mut self, id: &str, hovered: bool, disabled: bool) -> bool {
        let mut clicked = false;
        if !disabled {
            if hovered {
                self.hot = Some(id.to_string());
            }
            if hovered && self.mouse_pressed {
                self.active = Some(id.to_string());
            }
            if self.mouse_released && self.active.as_deref() == Some(id) {
                if hovered {
                    clicked = true;
                }
                self.active = None;
            }
        }
        clicked
    }

    /// The begin() reset: hot is re-derived every frame.
    pub(crate) fn begin_frame(&mut self) {
        self.hot = None;
    }

    /// The end() commit: release outside any widget clears active so a
    /// future press starts a fresh interaction; edge flags are
    /// per-frame.
    pub(crate) fn end_frame(&mut self) {
        if self.mouse_released && self.active.is_some() {
            self.active = None;
        }
        self.mouse_pressed = false;
        self.mouse_released = false;
    }
}

/* ----------------------------------------------------------------------- */
/* Module state. Single-instance singleton like the C - the inventory /
 * crafting screens are both consumers of the same atlas + the same
 * hot/active tracking. */

#[derive(Default)]
struct PixelUi {
    /// init succeeded and atlas is uploaded
    ready: bool,
    /// false if the PNG failed to load
    atlas_ok: bool,

    atlas_img: u32,
    atlas_view: u32,
    atlas_smp: u32,
    atlas_w: f32,
    atlas_h: f32,

    /// textured + alpha-blended for sprites
    pip_tex: u32,
    /// untextured + alpha-blended for shading
    pip_flat: u32,

    it: Interact,

    /// Demo screen visibility. Toggled by F8 in app.rs so the swatch
    /// can be eyeballed live while iterating on art / YAML.
    demo_visible: bool,
}

thread_local! {
    static G: RefCell<PixelUi> = RefCell::new(PixelUi::default());
}

/* ----------------------------------------------------------------------- */
/* Init / shutdown. */

/// Port of `pixel_ui_init()`. Load the atlas PNG named in
/// assets/config/ui.yaml (or the compiled-in default) into a GPU
/// texture and create the alpha-blended pipelines used for drawing.
/// Safe to call twice - the second call is a no-op. Returns 0 on
/// success, non-zero if the atlas couldn't be loaded (the module then
/// renders nothing).
pub fn init() -> i32 {
    G.with(|cell| {
        let mut g = cell.borrow_mut();
        if g.ready {
            return 0;
        }

        let ui = config::ui();

        /* Load the atlas PNG. Same path stbi_load uses for the terrain
         * atlas - RGBA8, no flip. On WASM the file is preloaded into
         * the emscripten virtual FS by the build's --preload-file
         * directive; on native it's read off disk. */
        let Some(img) = load_png_rgba(&ui.atlas_path, false) else {
            println!("[pixel_ui] WARNING: {} missing; UI module disabled", ui.atlas_path);
            g.ready = true;
            g.atlas_ok = false;
            return -1;
        };
        g.atlas_w = img.w as f32;
        g.atlas_h = img.h as f32;

        let mut desc = sg::ImageDesc {
            width: img.w,
            height: img.h,
            pixel_format: sg::PixelFormat::Rgba8,
            label: c"pixel-ui-atlas".as_ptr(),
            ..Default::default()
        };
        desc.data.mip_levels[0] = sg::slice_as_range(&img.rgba);
        let atlas_img = sg::make_image(&desc);
        g.atlas_img = atlas_img.id;
        g.atlas_view = sg::make_view(&sg::ViewDesc {
            texture: sg::TextureViewDesc { image: atlas_img, ..Default::default() },
            label: c"pixel-ui-atlas-view".as_ptr(),
            ..Default::default()
        })
        .id;
        /* Nearest-neighbour sampling is essential - bilinear on pixel
         * art smears the bronze trim into a blurry mess at non-1:1
         * scale. Clamp wrap so a sub-rect can't bleed neighbour sprite
         * texels. */
        g.atlas_smp = sg::make_sampler(&sg::SamplerDesc {
            min_filter: sg::Filter::Nearest,
            mag_filter: sg::Filter::Nearest,
            wrap_u: sg::Wrap::ClampToEdge,
            wrap_v: sg::Wrap::ClampToEdge,
            label: c"pixel-ui-atlas-sampler".as_ptr(),
            ..Default::default()
        })
        .id;

        /* Two pipelines: textured (sprites) and untextured (text-
         * backdrop dim rectangles). Both share the standard SRC_ALPHA /
         * 1-SRC_ALPHA blend the rest of the UI uses, so the pixel UI
         * composes cleanly over the scene + under sokol_debugtext. */
        let mut blend_desc = sg::PipelineDesc::new();
        blend_desc.colors[0].blend.enabled = true;
        blend_desc.colors[0].blend.src_factor_rgb = sg::BlendFactor::SrcAlpha;
        blend_desc.colors[0].blend.dst_factor_rgb = sg::BlendFactor::OneMinusSrcAlpha;
        blend_desc.colors[0].blend.src_factor_alpha = sg::BlendFactor::One;
        blend_desc.colors[0].blend.dst_factor_alpha = sg::BlendFactor::One;
        g.pip_tex = sgl::make_pipeline(&blend_desc).id;
        g.pip_flat = sgl::make_pipeline(&blend_desc).id;

        g.atlas_ok = true;
        g.ready = true;
        println!("[pixel_ui] atlas loaded: {} ({}x{})", ui.atlas_path, img.w, img.h);
        0
    })
}

/// Port of `pixel_ui_shutdown()`.
pub fn shutdown() {
    /* Pipelines + images get reclaimed when sokol shuts down at app
     * exit; no per-resource destroy needed during normal operation. */
    G.with(|cell| cell.borrow_mut().ready = false);
}

/* ----------------------------------------------------------------------- */
/* Event pump. Touch events are mapped to mouse equivalents so the
 * widget hit-tests don't need a second code path. */

/// Port of `pixel_ui_event()`. Returns true if the module consumed the
/// event - never the case today (see the C comment: the hot/active
/// machinery doesn't know widget rects until widgets are drawn, so the
/// widgets themselves block click-through via their return value;
/// this just keeps mouse coords + edge flags warm).
pub fn event(e: &sapp::Event) -> bool {
    G.with(|cell| {
        let mut g = cell.borrow_mut();
        if !g.ready || !g.atlas_ok {
            return false;
        }

        match e._type {
            sapp::EventType::MouseMove => {
                g.it.mouse_x = e.mouse_x;
                g.it.mouse_y = e.mouse_y;
            }
            sapp::EventType::MouseDown => {
                g.it.mouse_x = e.mouse_x;
                g.it.mouse_y = e.mouse_y;
                g.it.mouse_down = true;
                g.it.mouse_pressed = true;
            }
            sapp::EventType::MouseUp => {
                g.it.mouse_x = e.mouse_x;
                g.it.mouse_y = e.mouse_y;
                g.it.mouse_down = false;
                g.it.mouse_released = true;
            }
            sapp::EventType::TouchesBegan => {
                if e.num_touches > 0 {
                    g.it.mouse_x = e.touches[0].pos_x;
                    g.it.mouse_y = e.touches[0].pos_y;
                    g.it.mouse_down = true;
                    g.it.mouse_pressed = true;
                }
            }
            sapp::EventType::TouchesMoved => {
                if e.num_touches > 0 {
                    g.it.mouse_x = e.touches[0].pos_x;
                    g.it.mouse_y = e.touches[0].pos_y;
                }
            }
            sapp::EventType::TouchesEnded | sapp::EventType::TouchesCancelled => {
                g.it.mouse_down = false;
                g.it.mouse_released = true;
            }
            _ => {}
        }
        false
    })
}

/* ----------------------------------------------------------------------- */
/* Per-frame begin / end. */

/// Port of `pixel_ui_begin()`.
pub fn begin() {
    G.with(|cell| {
        let mut g = cell.borrow_mut();
        if !g.ready || !g.atlas_ok {
            return;
        }

        g.it.begin_frame();

        let w = sapp::widthf();
        let h = sapp::heightf();
        if w <= 0.0 || h <= 0.0 {
            return;
        }

        sgl::defaults();
        sgl::matrix_mode_projection();
        sgl::load_identity();
        sgl::ortho(0.0, w, h, 0.0, -1.0, 1.0);
        sgl::matrix_mode_modelview();
        sgl::load_identity();
    });
}

/// Port of `pixel_ui_end()`.
pub fn end() {
    G.with(|cell| {
        let mut g = cell.borrow_mut();
        if !g.ready || !g.atlas_ok {
            return;
        }
        g.it.end_frame();
    });
}

/* ----------------------------------------------------------------------- */
/* Pure geometry helpers (headless-testable, see module docs). */

/// Port of `point_in_rect` - inclusive left/top, exclusive right/bottom.
pub(crate) fn point_in_rect(px: f32, py: f32, x: f32, y: f32, w: f32, h: f32) -> bool {
    px >= x && px < x + w && py >= y && py < y + h
}

/// One textured quad: destination rect (x, y, w, h) sampling source
/// atlas texels (x, y, w, h).
#[derive(Clone, Copy, Debug, PartialEq)]
pub(crate) struct SubQuad {
    pub(crate) dst: [f32; 4],
    pub(crate) src: [f32; 4],
}

/// Port of `draw_nine_slice`'s geometry: decompose a nine-sliced sprite
/// into up to nine (dst, src) quads covering the destination rect. The
/// four corner slices stay at native size; the four edges stretch along
/// one axis; the centre stretches in both. A sprite with all-zero
/// margins degenerates to a single 1:1 blit anchored at the rect's
/// top-left - used for non-stretchable glyphs like the close X.
/// Zero-area quads are filtered exactly where C's draw_sub early-outs.
pub(crate) fn nine_slice_quads(s: &UiSprite, dx: f32, dy: f32, dw: f32, dh: f32) -> Vec<SubQuad> {
    let sl = s.left as f32;
    let sr = s.right as f32;
    let st = s.top as f32;
    let sb = s.bottom as f32;

    let keep = |q: SubQuad| -> Option<SubQuad> {
        /* draw_sub's guard: skip degenerate quads. */
        if q.dst[2] <= 0.0 || q.dst[3] <= 0.0 || q.src[2] <= 0.0 || q.src[3] <= 0.0 {
            None
        } else {
            Some(q)
        }
    };

    if sl == 0.0 && sr == 0.0 && st == 0.0 && sb == 0.0 {
        /* Non-stretchable: blit at native size, top-left aligned. */
        return keep(SubQuad {
            dst: [dx, dy, s.w as f32, s.h as f32],
            src: [s.x as f32, s.y as f32, s.w as f32, s.h as f32],
        })
        .into_iter()
        .collect();
    }

    /* Clamp margins so a small destination rect doesn't end up with
     * overlapping corners. Falls back to a degenerate centre rather
     * than corrupting the bevel. */
    let (mut ml, mut mr, mut mt, mut mb) = (sl, sr, st, sb);
    if ml + mr > dw {
        let k = dw / (ml + mr);
        ml *= k;
        mr *= k;
    }
    if mt + mb > dh {
        let k = dh / (mt + mb);
        mt *= k;
        mb *= k;
    }

    let (sx, sy) = (s.x as f32, s.y as f32);
    let (sw, sh) = (s.w as f32, s.h as f32);

    /* Source band widths along U / V. Corners keep their native size
     * so the bevel doesn't smear. */
    let u_mid = sw - sl - sr;
    let v_mid = sh - st - sb;

    /* Destination column / row positions and widths. */
    let (x0, w0) = (dx, ml);
    let (x1, w1) = (dx + ml, dw - ml - mr);
    let (x2, w2) = (dx + dw - mr, mr);
    let (y0, h0) = (dy, mt);
    let (y1, h1) = (dy + mt, dh - mt - mb);
    let (y2, h2) = (dy + dh - mb, mb);

    /* Source column / row offsets. */
    let (sx0, usw0) = (sx, sl);
    let (sx1, usw1) = (sx + sl, u_mid);
    let (sx2, usw2) = (sx + sw - sr, sr);
    let (sy0, ush0) = (sy, st);
    let (sy1, ush1) = (sy + st, v_mid);
    let (sy2, ush2) = (sy + sh - sb, sb);

    /* Nine quads: TL, T, TR, L, C, R, BL, B, BR. */
    [
        SubQuad { dst: [x0, y0, w0, h0], src: [sx0, sy0, usw0, ush0] },
        SubQuad { dst: [x1, y0, w1, h0], src: [sx1, sy0, usw1, ush0] },
        SubQuad { dst: [x2, y0, w2, h0], src: [sx2, sy0, usw2, ush0] },
        SubQuad { dst: [x0, y1, w0, h1], src: [sx0, sy1, usw0, ush1] },
        SubQuad { dst: [x1, y1, w1, h1], src: [sx1, sy1, usw1, ush1] },
        SubQuad { dst: [x2, y1, w2, h1], src: [sx2, sy1, usw2, ush1] },
        SubQuad { dst: [x0, y2, w0, h2], src: [sx0, sy2, usw0, ush2] },
        SubQuad { dst: [x1, y2, w1, h2], src: [sx1, sy2, usw1, ush2] },
        SubQuad { dst: [x2, y2, w2, h2], src: [sx2, sy2, usw2, ush2] },
    ]
    .into_iter()
    .filter_map(keep)
    .collect()
}

/// The button sprite pick (the C comment: pressed wins over hover when
/// the user has mouse-down on this button - including drag-off-and-back
/// - and ACTIVE forces the hover sprite even without mouse-over so
/// tabs can read as selected).
pub(crate) fn button_sprite(
    disabled: bool,
    active_state: bool,
    hovered: bool,
    is_active_widget: bool,
) -> UiSpriteId {
    if disabled {
        UiSpriteId::ButtonDisabled
    } else if is_active_widget && hovered {
        UiSpriteId::ButtonPressed
    } else if hovered || active_state {
        UiSpriteId::ButtonHover
    } else {
        UiSpriteId::ButtonNormal
    }
}

/// The slot sprite pick.
pub(crate) fn slot_sprite(state: SlotState, hovered: bool) -> UiSpriteId {
    match state {
        SlotState::Disabled => UiSpriteId::SlotDisabled,
        SlotState::Selected => UiSpriteId::SlotSelected,
        SlotState::Normal => {
            if hovered {
                UiSpriteId::SlotHover
            } else {
                UiSpriteId::SlotNormal
            }
        }
    }
}

/// Count badge gate - finite stacks only, matching the hotbar
/// convention (>9000 is the "infinite" sentinel for creative-mode
/// inventories; <= 0 hides the badge).
pub(crate) fn slot_count_text(count: i32) -> Option<String> {
    if count > 0 && count <= 9000 {
        Some(format!("{}", count))
    } else {
        None
    }
}

/* ----------------------------------------------------------------------- */
/* Internal draws against the sprite atlas. */

/// Port of `draw_sub` - emit one textured quad covering the screen rect
/// sampling the given atlas texel rect. sokol_gl quad uses CCW winding
/// starting at top-left.
fn draw_sub(g: &PixelUi, q: &SubQuad) {
    let [x, y, w, h] = q.dst;
    let [sx, sy, sw, sh] = q.src;
    let u0 = sx / g.atlas_w;
    let v0 = sy / g.atlas_h;
    let u1 = (sx + sw) / g.atlas_w;
    let v1 = (sy + sh) / g.atlas_h;
    sgl::begin_quads();
    sgl::c4f(1.0, 1.0, 1.0, 1.0);
    sgl::v2f_t2f(x, y, u0, v0);
    sgl::v2f_t2f(x + w, y, u1, v0);
    sgl::v2f_t2f(x + w, y + h, u1, v1);
    sgl::v2f_t2f(x, y + h, u0, v1);
    sgl::end();
}

/// Port of `draw_sprite` - nine-slice the given sprite id over the
/// destination rect, bound to the module's own atlas + pipelines.
fn draw_sprite(g: &PixelUi, id: UiSpriteId, x: f32, y: f32, w: f32, h: f32) {
    let ui = config::ui();
    sgl::load_pipeline(sgl::Pipeline { id: g.pip_tex });
    sgl::enable_texture();
    sgl::texture(sg::View { id: g.atlas_view }, sg::Sampler { id: g.atlas_smp });
    for q in nine_slice_quads(&ui.sprites[id as usize], x, y, w, h) {
        draw_sub(g, &q);
    }
    sgl::disable_texture();
}

/* ----------------------------------------------------------------------- */
/* Public widgets. */

/// Port of `pixel_ui_panel()`.
pub fn panel(x: i32, y: i32, w: i32, h: i32) {
    G.with(|cell| {
        let g = cell.borrow();
        if !g.ready || !g.atlas_ok {
            return;
        }
        draw_sprite(&g, UiSpriteId::Panel, x as f32, y as f32, w as f32, h as f32);
    });
}

/// Port of `pixel_ui_title_bar()`.
pub fn title_bar(x: i32, y: i32, w: i32, h: i32) {
    G.with(|cell| {
        let g = cell.borrow();
        if !g.ready || !g.atlas_ok {
            return;
        }
        draw_sprite(&g, UiSpriteId::TitleBar, x as f32, y as f32, w as f32, h as f32);
    });
}

/// Port of `pixel_ui_label()`. Plain label rendered with
/// sokol_debugtext. Coordinates are pixels of the screen-space ortho
/// projection. `label` must be 7-bit ASCII - per the repo rule, no
/// em-dashes / smart quotes / underscores. (Like the C, this does not
/// gate on the atlas being loaded - text is sdtx-only.)
pub fn label(x: i32, y: i32, label: &str) {
    if label.is_empty() {
        return;
    }
    /* sokol_debugtext glyphs are 8 px tall at scale 1. The pixel art
     * panels are scaled to the screen ortho; the canvas() call below
     * matches the same ortho so positions are in raw pixels. */
    sdtx::canvas(sapp::widthf(), sapp::heightf());
    sdtx::origin(0.0, 0.0);
    sdtx::color3b(0xe8, 0xd2, 0xa8); /* parchment from the UI palette */
    sdtx::pos(x as f32 / 8.0, y as f32 / 8.0);
    sdtx::puts(label);
}

/// Port of `pixel_ui_button()`. Returns true on the frame the user
/// releases the mouse over the button (the standard immediate-mode
/// click semantic). `id` must be unique per logical widget (see the
/// module-docs deviation note on pointer- vs value-identity).
pub fn button(id: &str, x: i32, y: i32, w: i32, h: i32, text: &str, state: ButtonState) -> bool {
    G.with(|cell| {
        let mut g = cell.borrow_mut();
        if !g.ready || !g.atlas_ok {
            return false;
        }

        let disabled = state == ButtonState::Disabled;
        let active = state == ButtonState::Active;
        let (fx, fy, fw, fh) = (x as f32, y as f32, w as f32, h as f32);
        let hovered = !disabled && point_in_rect(g.it.mouse_x, g.it.mouse_y, fx, fy, fw, fh);

        let clicked = g.it.update_widget(id, hovered, disabled);

        let sprite = button_sprite(disabled, active, hovered, g.it.active.as_deref() == Some(id));
        draw_sprite(&g, sprite, fx, fy, fw, fh);

        if !text.is_empty() {
            /* Centre the label inside the button. sokol_debugtext
             * glyphs are 8x8 at scale 1, so the label width in pixels
             * is 8 * strlen. */
            let gw = 8.0f32;
            let gh = 8.0f32;
            let n = text.len();
            let tx = fx + (fw - gw * n as f32) * 0.5;
            /* Pressed button: nudge the label down 1 px to reinforce
             * the pushed-in feel. */
            let ty = fy
                + (fh - gh) * 0.5
                + if sprite == UiSpriteId::ButtonPressed { 1.0 } else { 0.0 };

            sdtx::canvas(sapp::widthf(), sapp::heightf());
            sdtx::origin(0.0, 0.0);
            if disabled {
                sdtx::color3b(0x6b, 0x60, 0x58);
            } else if hovered || active {
                sdtx::color3b(0xff, 0xff, 0xff);
            } else {
                sdtx::color3b(0xe8, 0xd2, 0xa8);
            }
            sdtx::pos(tx / 8.0, ty / 8.0);
            sdtx::puts(text);
        }

        clicked
    })
}

/// Port of `pixel_ui_slot()`. A clickable inventory slot.
/// `atlas_view_id` + `atlas_sampler_id` point at the texture the icon
/// is sampled from (terrain atlas for block icons, item atlas for
/// crafted items); 0 skips the icon draw. `u0..v1` is the icon
/// sub-rect in normalised UVs. count <= 0 hides the count badge;
/// count > 9000 is treated as "infinite" and the badge is suppressed
/// too. Returns true on click.
#[allow(clippy::too_many_arguments)]
pub fn slot(
    id: &str,
    x: i32,
    y: i32,
    w: i32,
    h: i32,
    atlas_view_id: u32,
    atlas_sampler_id: u32,
    u0: f32,
    v0: f32,
    u1: f32,
    v1: f32,
    count: i32,
    state: SlotState,
) -> bool {
    G.with(|cell| {
        let mut g = cell.borrow_mut();
        if !g.ready || !g.atlas_ok {
            return false;
        }

        let (fx, fy, fw, fh) = (x as f32, y as f32, w as f32, h as f32);
        if fw <= 0.0 || fh <= 0.0 {
            return false;
        }

        let disabled = state == SlotState::Disabled;
        let hovered = !disabled && point_in_rect(g.it.mouse_x, g.it.mouse_y, fx, fy, fw, fh);

        let clicked = g.it.update_widget(id, hovered, disabled);

        draw_sprite(&g, slot_sprite(state, hovered), fx, fy, fw, fh);

        /* Icon: sample the caller-provided atlas over the slot's inner
         * area. The pad scales with the slot so a 24 px slot keeps the
         * icon proportionally inset; floor at 2 px so tiny slots still
         * leave the frame visible. */
        if atlas_view_id != 0 {
            let mut pad = fw / 6.0;
            if pad < 2.0 {
                pad = 2.0;
            }
            sgl::load_pipeline(sgl::Pipeline { id: g.pip_tex });
            sgl::enable_texture();
            sgl::texture(sg::View { id: atlas_view_id }, sg::Sampler { id: atlas_sampler_id });
            sgl::begin_quads();
            sgl::c4f(1.0, 1.0, 1.0, 1.0);
            sgl::v2f_t2f(fx + pad, fy + pad, u0, v0);
            sgl::v2f_t2f(fx + fw - pad, fy + pad, u1, v0);
            sgl::v2f_t2f(fx + fw - pad, fy + fh - pad, u1, v1);
            sgl::v2f_t2f(fx + pad, fy + fh - pad, u0, v1);
            sgl::end();
            sgl::disable_texture();
        }

        /* Count badge - finite stacks only, matching the hotbar
         * convention. */
        if let Some(buf) = slot_count_text(count) {
            let n = buf.len();
            sdtx::canvas(sapp::widthf(), sapp::heightf());
            sdtx::origin(0.0, 0.0);
            sdtx::color3b(0xff, 0xff, 0xff);
            sdtx::pos((fx + fw - 8.0 * n as f32 - 1.0) / 8.0, (fy + fh - 9.0) / 8.0);
            sdtx::puts(&buf);
        }

        clicked
    })
}

/* ----------------------------------------------------------------------- */
/* Demo: a small overlay panel that draws every widget so the look is
 * visible end-to-end without a real inventory screen wired up yet.
 * Toggleable from app.rs with F8. */

/// Port of `pixel_ui_demo_visible()`.
pub fn demo_visible() -> bool {
    G.with(|cell| cell.borrow().demo_visible)
}

/// Port of `pixel_ui_demo_toggle()`.
pub fn demo_toggle() {
    G.with(|cell| {
        let mut g = cell.borrow_mut();
        g.demo_visible = !g.demo_visible;
    });
}

/// Port of `pixel_ui_demo_draw()`.
pub fn demo_draw() {
    if !demo_visible() {
        return;
    }
    if !G.with(|cell| {
        let g = cell.borrow();
        g.ready && g.atlas_ok
    }) {
        return;
    }

    begin();

    /* Panel anchored near the top-left, sized to fit a title strip, a
     * row of 6 slots, and three buttons. */
    let panel_x = 40;
    let panel_y = 80;
    let panel_w = 360;
    let panel_h = 220;

    panel(panel_x, panel_y, panel_w, panel_h);

    /* Title strip nested inside the panel. */
    title_bar(panel_x + 16, panel_y + 12, panel_w - 32, 22);
    label(panel_x + 28, panel_y + 17, "pixel-ui demo");

    /* Slot row. Slots draw at 32 x 32 to give the demo something
     * chunky enough to eyeball - the runtime inventory picks its own
     * slot size based on screen width. */
    let slot_size = 32;
    let slot_pitch = 40;
    const SLOT_IDS: [&str; 6] = [
        "demo_slot_0",
        "demo_slot_1",
        "demo_slot_2",
        "demo_slot_3",
        "demo_slot_4",
        "demo_slot_5",
    ];
    for (i, slot_id) in SLOT_IDS.iter().enumerate() {
        let sx = panel_x + 24 + i as i32 * slot_pitch;
        let sy = panel_y + 56;
        let st = match i {
            1 => SlotState::Selected,
            5 => SlotState::Disabled,
            _ => SlotState::Normal,
        };
        slot(
            slot_id,
            sx,
            sy,
            slot_size,
            slot_size,
            0,
            0, /* no icon atlas in the demo */
            0.0,
            0.0,
            0.0,
            0.0,
            i as i32 * 3, /* a fake stack count */
            st,
        );
    }

    /* Button row. Click the "OK" button to print to the console so a
     * developer can confirm the hot/active machinery is wiring through
     * to the click return without needing an inventory model. */
    if button(
        "demo_btn_ok",
        panel_x + 24,
        panel_y + 110,
        96,
        28,
        "OK",
        ButtonState::Normal,
    ) {
        println!("[pixel_ui] demo OK clicked");
    }
    button(
        "demo_btn_cancel",
        panel_x + 132,
        panel_y + 110,
        96,
        28,
        "Cancel",
        ButtonState::Normal,
    );
    button(
        "demo_btn_disabled",
        panel_x + 240,
        panel_y + 110,
        96,
        28,
        "Locked",
        ButtonState::Disabled,
    );

    label(panel_x + 24, panel_y + 158, "click OK then check the console");
    label(panel_x + 24, panel_y + 178, "press F8 to toggle this panel");

    /* Render the close-X glyph in its native 12x12 size at the top-
     * right corner of the panel. Renders 1:1 because nine_slice for
     * close_x is all zeros (non-stretchable). */
    G.with(|cell| {
        let g = cell.borrow();
        draw_sprite(
            &g,
            UiSpriteId::CloseX,
            (panel_x + panel_w - 22) as f32,
            (panel_y + 10) as f32,
            12.0,
            12.0,
        );
    });

    end();
}

/* ----------------------------------------------------------------------- */

#[cfg(test)]
mod tests {
    use super::*;
    use tenebris_core::config::ui_defaults;

    fn spr(x: i32, y: i32, w: i32, h: i32, l: i32, r: i32, t: i32, b: i32) -> UiSprite {
        UiSprite { x, y, w, h, left: l, right: r, top: t, bottom: b }
    }

    /* -- hit-testing -------------------------------------------------- */

    #[test]
    fn point_in_rect_edges_match_c() {
        /* >= on left/top, strict < on right/bottom. */
        assert!(point_in_rect(10.0, 20.0, 10.0, 20.0, 5.0, 5.0));
        assert!(point_in_rect(14.999, 24.999, 10.0, 20.0, 5.0, 5.0));
        assert!(!point_in_rect(15.0, 22.0, 10.0, 20.0, 5.0, 5.0));
        assert!(!point_in_rect(12.0, 25.0, 10.0, 20.0, 5.0, 5.0));
        assert!(!point_in_rect(9.999, 22.0, 10.0, 20.0, 5.0, 5.0));
    }

    /* -- nine-slice geometry ------------------------------------------ */

    #[test]
    fn nine_slice_default_panel_pinned() {
        /* panel: rect [0,0,32,32], margins [8,8,8,8] over a 100x60
         * destination at (10, 20). */
        let s = ui_defaults().sprites[UiSpriteId::Panel as usize];
        let q = nine_slice_quads(&s, 10.0, 20.0, 100.0, 60.0);
        assert_eq!(q.len(), 9);
        /* TL corner: native 8x8 at the rect origin, sampling (0,0,8,8). */
        assert_eq!(q[0], SubQuad { dst: [10.0, 20.0, 8.0, 8.0], src: [0.0, 0.0, 8.0, 8.0] });
        /* Top edge stretches horizontally: dst 84 wide, src 16 wide. */
        assert_eq!(q[1], SubQuad { dst: [18.0, 20.0, 84.0, 8.0], src: [8.0, 0.0, 16.0, 8.0] });
        /* TR corner anchored at the right edge. */
        assert_eq!(q[2], SubQuad { dst: [102.0, 20.0, 8.0, 8.0], src: [24.0, 0.0, 8.0, 8.0] });
        /* Centre stretches in both axes. */
        assert_eq!(q[4], SubQuad { dst: [18.0, 28.0, 84.0, 44.0], src: [8.0, 8.0, 16.0, 16.0] });
        /* BR corner. */
        assert_eq!(q[8], SubQuad { dst: [102.0, 72.0, 8.0, 8.0], src: [24.0, 24.0, 8.0, 8.0] });
    }

    #[test]
    fn nine_slice_zero_margins_is_native_blit() {
        /* close_x: all-zero margins -> single 1:1 blit at the dest
         * top-left, IGNORING the requested w/h (C behaviour). */
        let s = ui_defaults().sprites[UiSpriteId::CloseX as usize];
        let q = nine_slice_quads(&s, 100.0, 50.0, 99.0, 99.0);
        assert_eq!(q, vec![SubQuad {
            dst: [100.0, 50.0, 12.0, 12.0],
            src: [56.0, 16.0, 12.0, 12.0]
        }]);
    }

    #[test]
    fn nine_slice_margin_clamp_on_tiny_dest() {
        /* Destination narrower than left+right margins: margins scale
         * by k = dw / (ml + mr) so corners never overlap. 8+8 = 16
         * margins into an 8-wide dest -> k = 0.5 -> 4 px margins and a
         * zero-width centre column (filtered out). */
        let s = spr(0, 0, 32, 32, 8, 8, 8, 8);
        let q = nine_slice_quads(&s, 0.0, 0.0, 8.0, 32.0);
        /* Centre column (w1 = 8 - 4 - 4 = 0) drops T, C, B quads. */
        assert_eq!(q.len(), 6);
        assert_eq!(q[0].dst, [0.0, 0.0, 4.0, 8.0]); /* TL, clamped to 4 wide */
        assert_eq!(q[1].dst, [4.0, 0.0, 4.0, 8.0]); /* TR */
        /* Source rects keep the native 8-wide corner band (the bevel
         * compresses on screen, it doesn't resample a narrower band). */
        assert_eq!(q[0].src, [0.0, 0.0, 8.0, 8.0]);
    }

    #[test]
    fn nine_slice_top_bottom_only_sprite() {
        /* scrollbar_track: margins [0, 0, 4, 4] - horizontal bands
         * only. Left/right columns have zero width so 9 quads filter
         * down to the 3 middle-column bands. */
        let s = ui_defaults().sprites[UiSpriteId::ScrollbarTrack as usize];
        let q = nine_slice_quads(&s, 5.0, 10.0, 8.0, 40.0);
        assert_eq!(q.len(), 3);
        assert_eq!(q[0], SubQuad { dst: [5.0, 10.0, 8.0, 4.0], src: [0.0, 64.0, 8.0, 4.0] });
        assert_eq!(q[1], SubQuad { dst: [5.0, 14.0, 8.0, 32.0], src: [0.0, 68.0, 8.0, 8.0] });
        assert_eq!(q[2], SubQuad { dst: [5.0, 46.0, 8.0, 4.0], src: [0.0, 76.0, 8.0, 4.0] });
    }

    /* -- hot/active state machine -------------------------------------- */

    fn press(it: &mut Interact) {
        it.mouse_down = true;
        it.mouse_pressed = true;
    }

    fn release(it: &mut Interact) {
        it.mouse_down = false;
        it.mouse_released = true;
    }

    #[test]
    fn click_fires_on_release_over_active() {
        let mut it = Interact::default();
        /* Frame 1: press over the widget - arms active, no click yet. */
        it.begin_frame();
        press(&mut it);
        assert!(!it.update_widget("btn", true, false));
        assert_eq!(it.active.as_deref(), Some("btn"));
        assert_eq!(it.hot.as_deref(), Some("btn"));
        it.end_frame();
        /* Frame 2: release over the widget - click fires, active
         * clears. */
        it.begin_frame();
        release(&mut it);
        assert!(it.update_widget("btn", true, false));
        assert_eq!(it.active, None);
        it.end_frame();
        assert!(!it.mouse_pressed && !it.mouse_released);
    }

    #[test]
    fn release_off_widget_cancels_without_click() {
        let mut it = Interact::default();
        it.begin_frame();
        press(&mut it);
        it.update_widget("btn", true, false);
        it.end_frame();
        /* Drag off, then release: the widget sees the release while
         * not hovered - no click, active cleared by the widget. */
        it.begin_frame();
        release(&mut it);
        assert!(!it.update_widget("btn", false, false));
        assert_eq!(it.active, None);
        it.end_frame();
    }

    #[test]
    fn release_outside_any_widget_clears_active_in_end() {
        let mut it = Interact::default();
        it.begin_frame();
        press(&mut it);
        it.update_widget("btn", true, false);
        it.end_frame();
        /* The widget isn't drawn this frame (panel closed); end()
         * still clears active on the release edge. */
        it.begin_frame();
        release(&mut it);
        it.end_frame();
        assert_eq!(it.active, None);
    }

    #[test]
    fn disabled_widget_ignores_everything() {
        let mut it = Interact::default();
        it.begin_frame();
        press(&mut it);
        assert!(!it.update_widget("btn", true, true));
        assert_eq!(it.active, None);
        assert_eq!(it.hot, None);
    }

    #[test]
    fn press_a_release_over_b_clicks_neither() {
        let mut it = Interact::default();
        it.begin_frame();
        press(&mut it);
        it.update_widget("a", true, false);
        it.update_widget("b", false, false);
        it.end_frame();
        it.begin_frame();
        release(&mut it);
        assert!(!it.update_widget("a", false, false));
        /* a's update already consumed the active clear; b sees
         * active == None and never fires. */
        assert!(!it.update_widget("b", true, false));
        it.end_frame();
    }

    /* -- sprite picks --------------------------------------------------- */

    #[test]
    fn button_sprite_priority_matches_c() {
        use UiSpriteId::*;
        /* disabled wins over everything */
        assert_eq!(button_sprite(true, true, true, true), ButtonDisabled);
        /* pressed = active widget AND hovered */
        assert_eq!(button_sprite(false, false, true, true), ButtonPressed);
        /* active widget but dragged off: falls to hover? No - hovered
         * is false, active_state false -> NORMAL (C: hover branch
         * requires hovered || ACTIVE state). */
        assert_eq!(button_sprite(false, false, false, true), ButtonNormal);
        /* plain hover */
        assert_eq!(button_sprite(false, false, true, false), ButtonHover);
        /* ACTIVE state forces hover sprite without mouse-over */
        assert_eq!(button_sprite(false, true, false, false), ButtonHover);
        assert_eq!(button_sprite(false, false, false, false), ButtonNormal);
    }

    #[test]
    fn slot_sprite_priority_matches_c() {
        use UiSpriteId::*;
        assert_eq!(slot_sprite(SlotState::Disabled, true), SlotDisabled);
        assert_eq!(slot_sprite(SlotState::Selected, false), SlotSelected);
        /* C order: disabled, then selected, then hover. A SELECTED slot
         * stays selected under the cursor. */
        assert_eq!(slot_sprite(SlotState::Selected, true), SlotSelected);
        assert_eq!(slot_sprite(SlotState::Normal, true), SlotHover);
        assert_eq!(slot_sprite(SlotState::Normal, false), SlotNormal);
    }

    #[test]
    fn slot_count_badge_gate() {
        assert_eq!(slot_count_text(0), None);
        assert_eq!(slot_count_text(-3), None);
        assert_eq!(slot_count_text(1), Some("1".to_string()));
        assert_eq!(slot_count_text(9000), Some("9000".to_string()));
        /* creative "infinite" sentinel */
        assert_eq!(slot_count_text(9001), None);
        assert_eq!(slot_count_text(9999), None);
    }
}
