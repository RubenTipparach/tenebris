//! egui integration for the sokol stack.
//!
//! egui is render-backend-agnostic: each frame it emits a set of clipped,
//! textured triangle meshes plus a font/texture atlas. There is no
//! off-the-shelf egui<->sokol backend, so this module is the bridge:
//!
//! - input: `handle_event` translates `sokol_app` events into egui events,
//!   so egui sees the mouse / keyboard.
//! - run: `run` feeds the accumulated input to an `egui::Context` and runs
//!   the caller's UI closure, stashing the paint output.
//! - render: `draw` uploads any new texture data into an `sg::Image` and
//!   replays the meshes through `sokol_gl` (a textured, scissored,
//!   premultiplied-alpha 2D pipeline) inside the gameplay swapchain pass.
//!
//! egui packs a white texel into its font atlas, so a single bound texture
//! draws both glyphs and solid panel fills. Colours are `Color32`
//! (premultiplied sRGB) emitted straight as vertex bytes; the pipeline
//! blends premultiplied (`ONE, ONE_MINUS_SRC_ALPHA`).

use std::cell::RefCell;

use sokol::app as sapp;
use sokol::gfx as sg;
use sokol::gl as sgl;

use crate::ui_icons;

/// egui `TextureId` the inventory/crafting/chest grids use for item
/// thumbnails; the draw loop binds the `ui_icons` atlas for it.
pub const ICON_TEX: egui::TextureId = egui::TextureId::User(1);

/// egui `TextureId` for the solar-system map's body thumbnails; the draw
/// loop binds the renderer's baked body-gallery atlas for it.
pub const BODY_TEX: egui::TextureId = egui::TextureId::User(2);

struct Layer {
    ctx: egui::Context,
    /// egui input events accumulated between `run` calls.
    events: Vec<egui::Event>,
    modifiers: egui::Modifiers,
    pointer: egui::Pos2,
    /// Premultiplied-alpha 2D pipeline (lazily made once the gfx pool is up).
    pip: sgl::Pipeline,
    /// Font/texture atlas mirror + GPU handles. Rebuilt when egui resizes it.
    tex_w: usize,
    tex_h: usize,
    pixels: Vec<u8>, // tex_w*tex_h*4 RGBA, CPU mirror so deltas can patch it
    img: sg::Image,
    view: sg::View,
    smp: sg::Sampler,
    /// Stashed paint output from the last `run`, consumed by `draw`.
    prims: Vec<egui::ClippedPrimitive>,
    ppp: f32,
    /// Previous raw clock read; per-frame deltas between consecutive reads
    /// drive egui's clock (see [`advance_egui_clock`]).
    prev_raw: f64,
    /// Accumulated, strictly-increasing egui clock (sum of clamped deltas).
    acc_time: f64,
}

thread_local! {
    static LAYER: RefCell<Option<Layer>> = const { RefCell::new(None) };
}

fn now_s() -> f64 {
    sokol::time::sec(sokol::time::now())
}

/// Advance egui's clock by the clamped delta since the last raw read.
///
/// egui's pointer-velocity history HARD-ASSERTS that the time it is fed
/// never decreases - and because our frame callback is `extern "C"`, that
/// panic cannot unwind and aborts the whole game. We feed it sokol_time
/// (QueryPerformanceCounter on Windows), whose reads can step BACKWARDS -
/// or, worse, sit permanently BEHIND - when a thread migrates to a core
/// with a desynced TSC. Crash report: "Time shouldn't move backwards"
/// (emath history.rs) on the first gameplay frame after a 4.6 s loader stall.
///
/// The earlier fix fed egui a monotonic FLOOR of the absolute `now - start`.
/// That held the assert but had a nasty failure of its own: once the render
/// thread settled on a core whose TSC ran ~1 s behind the init core, EVERY
/// read fell under the floor, so egui's clock crawled forward at 1 us/frame
/// and its window fade-in animations never completed - leaving every panel
/// stuck near-transparent, with a fresh game unable to clear it (the floor
/// persists for the whole process). See `diag`-style regression below.
///
/// Driving the clock from per-frame DELTAS cancels any constant per-core
/// offset: consecutive reads on the behind core still differ by a real
/// +16 ms. Each delta is clamped to a sane, strictly-positive window, so a
/// backwards / equal / non-finite read costs one hair-width step (and
/// recovers on the very next frame, since `prev` tracks the new position),
/// while a forward overshoot advances at most `MAX_STEP_S`.
fn advance_egui_clock(prev_raw: &mut f64, acc: &mut f64, raw: f64) -> f64 {
    const MIN_STEP_S: f64 = 1e-6;
    const MAX_STEP_S: f64 = 0.25;
    let dt = raw - *prev_raw;
    let dt = if dt.is_finite() { dt.clamp(0.0, MAX_STEP_S) } else { 0.0 };
    /* Track the newest raw read even when it stepped back, so a thread that
     * MOVED to a slower core stalls for exactly one frame, not forever. */
    *prev_raw = raw;
    /* Floor at a hair so the result is STRICTLY increasing across a
     * backwards / equal / NaN read (egui's assert rejects equal too). */
    *acc += dt.max(MIN_STEP_S);
    *acc
}

pub fn init() {
    LAYER.with(|c| {
        let ctx = egui::Context::default();
        ctx.set_pixels_per_point(1.0);
        *c.borrow_mut() = Some(Layer {
            ctx,
            events: Vec::new(),
            modifiers: egui::Modifiers::default(),
            pointer: egui::Pos2::ZERO,
            pip: sgl::Pipeline { id: 0 },
            tex_w: 0,
            tex_h: 0,
            pixels: Vec::new(),
            img: sg::Image { id: 0 },
            view: sg::View { id: 0 },
            smp: sg::Sampler { id: 0 },
            prims: Vec::new(),
            ppp: 1.0,
            prev_raw: now_s(),
            acc_time: 0.0,
        });
    });
}

fn map_key(k: sapp::Keycode) -> Option<egui::Key> {
    use egui::Key as E;
    use sapp::Keycode as K;
    Some(match k {
        K::Escape => E::Escape,
        K::Enter => E::Enter,
        K::Tab => E::Tab,
        K::Backspace => E::Backspace,
        K::Delete => E::Delete,
        K::Left => E::ArrowLeft,
        K::Right => E::ArrowRight,
        K::Up => E::ArrowUp,
        K::Down => E::ArrowDown,
        K::Space => E::Space,
        _ => return None,
    })
}

/// Feed a sokol_app event to egui. Returns true if egui wants the pointer /
/// keyboard (so the caller can swallow it from gameplay) - only meaningful
/// after the first `run`.
pub fn handle_event(e: &sapp::Event) -> bool {
    LAYER.with(|c| {
        let mut b = c.borrow_mut();
        let Some(l) = b.as_mut() else { return false };

        l.modifiers = egui::Modifiers {
            alt: e.modifiers & sapp::MODIFIER_ALT != 0,
            ctrl: e.modifiers & sapp::MODIFIER_CTRL != 0,
            shift: e.modifiers & sapp::MODIFIER_SHIFT != 0,
            mac_cmd: false,
            command: e.modifiers & sapp::MODIFIER_CTRL != 0,
        };

        match e._type {
            sapp::EventType::MouseMove => {
                l.pointer = egui::pos2(e.mouse_x, e.mouse_y);
                l.events.push(egui::Event::PointerMoved(l.pointer));
            }
            sapp::EventType::MouseDown | sapp::EventType::MouseUp => {
                let pressed = e._type == sapp::EventType::MouseDown;
                let button = match e.mouse_button {
                    sapp::Mousebutton::Right => egui::PointerButton::Secondary,
                    sapp::Mousebutton::Middle => egui::PointerButton::Middle,
                    _ => egui::PointerButton::Primary,
                };
                l.pointer = egui::pos2(e.mouse_x, e.mouse_y);
                l.events.push(egui::Event::PointerButton {
                    pos: l.pointer,
                    button,
                    pressed,
                    modifiers: l.modifiers,
                });
            }
            sapp::EventType::KeyDown | sapp::EventType::KeyUp => {
                if let Some(key) = map_key(e.key_code) {
                    let pressed = e._type == sapp::EventType::KeyDown;
                    l.events.push(egui::Event::Key {
                        key,
                        physical_key: None,
                        pressed,
                        repeat: false,
                        modifiers: l.modifiers,
                    });
                }
            }
            sapp::EventType::MouseScroll => {
                /* Forward the wheel so egui panels (the solar-map zoom,
                 * trade/craft/inventory scroll lists) actually receive it -
                 * without this case egui's scroll delta was always zero and
                 * the map's wheel-zoom code got no input. Line unit: egui
                 * scales it by its line-scroll speed. Positive scroll_y =
                 * wheel away = content up / zoom in, egui's own convention. */
                l.events.push(egui::Event::MouseWheel {
                    unit: egui::MouseWheelUnit::Line,
                    delta: egui::vec2(e.scroll_x, e.scroll_y),
                    modifiers: l.modifiers,
                    phase: egui::TouchPhase::Move,
                });
            }
            sapp::EventType::Char => {
                if let Some(ch) = char::from_u32(e.char_code) {
                    if !ch.is_control() {
                        l.events.push(egui::Event::Text(ch.to_string()));
                    }
                }
            }
            _ => {}
        }
        // (Per-screen pointer/keyboard claiming is wired as screens port;
        // for now events are forwarded and gameplay keeps its own paths.)
        false
    })
}

/// Run the egui frame: feed input, run `ui`, stash the paint output.
pub fn run(screen_w: f32, screen_h: f32, mut ui: impl FnMut(&egui::Context)) {
    LAYER.with(|c| {
        let mut b = c.borrow_mut();
        let Some(l) = b.as_mut() else { return };
        let raw = egui::RawInput {
            screen_rect: Some(egui::Rect::from_min_size(
                egui::Pos2::ZERO,
                egui::vec2(screen_w, screen_h),
            )),
            time: Some(advance_egui_clock(&mut l.prev_raw, &mut l.acc_time, now_s())),
            modifiers: l.modifiers,
            events: std::mem::take(&mut l.events),
            ..Default::default()
        };
        // egui::Context is Arc-backed; clone to avoid borrowing `l` across
        // the UI closure.
        let ctx = l.ctx.clone();
        ctx.begin_pass(raw);
        ui(&ctx);
        let out = ctx.end_pass();
        l.ppp = out.pixels_per_point;
        apply_texture_deltas(l, &out.textures_delta);
        l.prims = ctx.tessellate(out.shapes, out.pixels_per_point);
    });
}

fn ensure_image(l: &mut Layer, w: usize, h: usize) {
    if l.tex_w == w && l.tex_h == h && l.img.id != 0 {
        return;
    }
    if l.img.id != 0 {
        sg::destroy_view(l.view);
        sg::destroy_image(l.img);
    }
    l.tex_w = w;
    l.tex_h = h;
    l.pixels = vec![0u8; w * h * 4];
    l.img = sg::make_image(&sg::ImageDesc {
        width: w as i32,
        height: h as i32,
        pixel_format: sg::PixelFormat::Rgba8,
        usage: sg::ImageUsage { dynamic_update: true, ..Default::default() },
        ..Default::default()
    });
    l.view = sg::make_view(&sg::ViewDesc {
        texture: sg::TextureViewDesc { image: l.img, ..Default::default() },
        ..Default::default()
    });
    if l.smp.id == 0 {
        l.smp = sg::make_sampler(&sg::SamplerDesc {
            min_filter: sg::Filter::Linear,
            mag_filter: sg::Filter::Linear,
            wrap_u: sg::Wrap::ClampToEdge,
            wrap_v: sg::Wrap::ClampToEdge,
            ..Default::default()
        });
    }
}

fn apply_texture_deltas(l: &mut Layer, delta: &egui::TexturesDelta) {
    for (id, image_delta) in &delta.set {
        // Only the managed font atlas (id 0) is supported for now; that
        // covers all glyphs + solid fills (egui's white texel lives there).
        if *id != egui::TextureId::Managed(0) {
            continue;
        }
        // egui 0.34 delivers every atlas (incl. the font atlas) as a
        // premultiplied-sRGBA ColorImage.
        let egui::ImageData::Color(c) = &image_delta.image;
        let size = c.size;
        let rgba: Vec<u8> = c.pixels.iter().flat_map(|c| c.to_array()).collect();
        match image_delta.pos {
            None => {
                ensure_image(l, size[0], size[1]);
                l.pixels.copy_from_slice(&rgba);
            }
            Some([px, py]) => {
                // Patch a sub-region into the CPU mirror.
                for row in 0..size[1] {
                    let dst = ((py + row) * l.tex_w + px) * 4;
                    let src = row * size[0] * 4;
                    l.pixels[dst..dst + size[0] * 4]
                        .copy_from_slice(&rgba[src..src + size[0] * 4]);
                }
            }
        }
        // Re-upload the whole atlas (it changes rarely - mostly at boot).
        let mut data = sg::ImageData::new();
        data.mip_levels[0] = sg::slice_as_range(&l.pixels);
        sg::update_image(l.img, &data);
    }
}

/// Replay the stashed meshes through sokol_gl inside the current pass.
/// Caller must invoke this in the swapchain pass (after the 3D scene).
pub fn draw() {
    let (sw, sh) = (sapp::widthf(), sapp::heightf());
    LAYER.with(|c| {
        let mut b = c.borrow_mut();
        let Some(l) = b.as_mut() else { return };
        if l.prims.is_empty() || l.img.id == 0 {
            return;
        }
        if l.pip.id == 0 {
            let mut desc = sg::PipelineDesc::new();
            desc.colors[0].blend.enabled = true;
            // egui Color32 is premultiplied sRGB.
            desc.colors[0].blend.src_factor_rgb = sg::BlendFactor::One;
            desc.colors[0].blend.dst_factor_rgb = sg::BlendFactor::OneMinusSrcAlpha;
            desc.colors[0].blend.src_factor_alpha = sg::BlendFactor::One;
            desc.colors[0].blend.dst_factor_alpha = sg::BlendFactor::OneMinusSrcAlpha;
            l.pip = sgl::make_pipeline(&desc);
        }

        sgl::defaults();
        sgl::push_pipeline();
        sgl::load_pipeline(l.pip);
        sgl::enable_texture();
        sgl::matrix_mode_projection();
        sgl::load_identity();
        sgl::ortho(0.0, sw, sh, 0.0, -1.0, 1.0);
        sgl::matrix_mode_modelview();
        sgl::load_identity();

        let prims = std::mem::take(&mut l.prims);
        for prim in &prims {
            let egui::epaint::Primitive::Mesh(mesh) = &prim.primitive else {
                continue;
            };
            /* Pick the texture for this batch: egui's own font/solid atlas
             * (Managed) or our item-icon atlas (the ICON_TEX user id). */
            let (view, smp) = match mesh.texture_id {
                ICON_TEX if ui_icons::view_id() != 0 => (
                    sg::View { id: ui_icons::view_id() },
                    sg::Sampler { id: ui_icons::sampler_id() },
                ),
                BODY_TEX if crate::renderer::body_gallery_view_id() != 0 => (
                    sg::View { id: crate::renderer::body_gallery_view_id() },
                    sg::Sampler { id: crate::renderer::body_gallery_sampler_id() },
                ),
                _ => (l.view, l.smp),
            };
            sgl::texture(view, smp);
            let r = prim.clip_rect;
            let x = r.min.x.max(0.0);
            let y = r.min.y.max(0.0);
            let w = (r.max.x - x).max(0.0);
            let h = (r.max.y - y).max(0.0);
            sgl::scissor_rectf(x, y, w, h, true);
            sgl::begin_triangles();
            for &idx in &mesh.indices {
                let v = &mesh.vertices[idx as usize];
                let [cr, cg, cb, ca] = v.color.to_array();
                sgl::v2f_t2f_c4b(v.pos.x, v.pos.y, v.uv.x, v.uv.y, cr, cg, cb, ca);
            }
            sgl::end();
        }
        l.prims = prims;
        l.prims.clear();
        sgl::scissor_rectf(0.0, 0.0, sw, sh, true);
        sgl::disable_texture();
        sgl::pop_pipeline();
    });
}

#[cfg(test)]
mod tests {
    use super::advance_egui_clock;

    /// Drive a real egui window through `advance_egui_clock` and return the
    /// gold label's alpha on the last frame. egui premultiplies, so a faded
    /// label reads back with a scaled-down alpha; a settled one reads 255.
    fn last_frame_label_alpha(raw_reads: &[f64]) -> u8 {
        let ctx = egui::Context::default();
        ctx.set_pixels_per_point(1.0);
        let mut prev = raw_reads[0];
        let mut acc = 0.0f64;
        let mut gold_a = 0u8;
        for &raw in raw_reads {
            let t = advance_egui_clock(&mut prev, &mut acc, raw);
            let input = egui::RawInput {
                screen_rect: Some(egui::Rect::from_min_size(
                    egui::Pos2::ZERO,
                    egui::vec2(1000.0, 600.0),
                )),
                time: Some(t),
                ..Default::default()
            };
            ctx.begin_pass(input);
            egui::Window::new("diag")
                .anchor(egui::Align2::CENTER_CENTER, egui::Vec2::ZERO)
                .show(&ctx, |ui| {
                    ui.label(
                        egui::RichText::new("TENEBRIS")
                            .size(64.0)
                            .color(egui::Color32::from_rgb(0xe6, 0xcf, 0x73)),
                    );
                });
            let out = ctx.end_pass();
            let prims = ctx.tessellate(out.shapes, out.pixels_per_point);
            gold_a = 0;
            for p in &prims {
                if let egui::epaint::Primitive::Mesh(m) = &p.primitive {
                    for v in &m.vertices {
                        let [r, _g, b, a] = v.color.to_array();
                        if r > b && a > gold_a {
                            gold_a = a;
                        }
                    }
                }
            }
        }
        gold_a
    }

    /// THE REGRESSION (user report: "everything is stuck being faded with
    /// opacity"): the render thread settled on a core whose TSC ran ~1 s
    /// behind the init core, so every raw read is below the init value yet
    /// still advances 16 ms/frame. The old absolute-floor scheme pinned
    /// egui's clock at ~0 and the window fade-in never finished (alpha ~41).
    /// Delta-driven, the constant offset cancels and the fade settles to 255.
    #[test]
    fn behind_core_clock_still_settles_window_opacity() {
        let start = 100.0f64;
        let behind = 1.0f64;
        let reads: Vec<f64> =
            (0..16).map(|f| start - behind + f as f64 * 0.016).collect();
        assert_eq!(
            last_frame_label_alpha(&reads),
            255,
            "a constant per-core clock offset must not freeze the fade-in"
        );
    }

    /// A normal, in-phase clock also settles (sanity: the fix didn't break
    /// the happy path).
    #[test]
    fn normal_clock_settles_window_opacity() {
        let reads: Vec<f64> = (0..16).map(|f| 50.0 + f as f64 * 0.016).collect();
        assert_eq!(last_frame_label_alpha(&reads), 255);
    }

    /// egui aborts the process on a non-increasing time (the panic can't
    /// unwind out of the extern "C" frame callback), so the clock must be
    /// STRICTLY increasing across a backwards read - and recover the very
    /// next frame instead of crawling.
    #[test]
    fn a_backwards_clock_read_recovers_next_frame() {
        let mut prev = 100.0;
        let mut acc = 0.0;
        let t0 = advance_egui_clock(&mut prev, &mut acc, 100.016);
        let t1 = advance_egui_clock(&mut prev, &mut acc, 99.4); /* stepped back */
        assert!(t1 > t0, "must still move forward, got {t1} <= {t0}");
        /* The next real frame from the new (lower) position advances a full
         * dt - NOT another hair-width crawl step. */
        let t2 = advance_egui_clock(&mut prev, &mut acc, 99.416);
        assert!(t2 - t1 > 0.01, "recovers a real dt after the glitch, got {}", t2 - t1);
    }

    /// Equal reads still advance (egui rejects equal too).
    #[test]
    fn equal_reads_advance_by_a_hair() {
        let mut prev = 5.0;
        let mut acc = 2.0;
        let a = advance_egui_clock(&mut prev, &mut acc, 5.0);
        let b = advance_egui_clock(&mut prev, &mut acc, 5.0);
        assert!(b > a && a > 2.0);
    }

    /// A forward overshoot advances by at most MAX_STEP_S, so a glitched
    /// jump can't fast-forward animations by minutes.
    #[test]
    fn forward_overshoot_is_capped() {
        let mut prev = 10.0;
        let mut acc = 0.0;
        let t = advance_egui_clock(&mut prev, &mut acc, 10.0 + 60.0); /* +60 s */
        assert!(t <= 0.25 + 1e-9, "capped at MAX_STEP_S, got {t}");
    }

    /// NaN fails egui's assert too (all comparisons false), so it must never
    /// pass through - it costs one hair-width step.
    #[test]
    fn nan_reads_do_not_pass_through() {
        let mut prev = 3.0;
        let mut acc = 1.0;
        let t = advance_egui_clock(&mut prev, &mut acc, f64::NAN);
        assert!(t.is_finite() && t > 1.0, "NaN must become a forward step, got {t}");
    }
}
