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
    start: f64,
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
    /// Last time value handed to egui - the monotonic floor (see
    /// [`monotonize`]).
    last_time: f64,
}

thread_local! {
    static LAYER: RefCell<Option<Layer>> = const { RefCell::new(None) };
}

fn now_s() -> f64 {
    sokol::time::sec(sokol::time::now())
}

/// Clamp `t` to be strictly monotonic against `last`, updating `last`.
///
/// egui's pointer-velocity history HARD-ASSERTS that the time it is fed
/// never decreases - and because our frame callback is `extern "C"`, that
/// panic cannot unwind and aborts the whole game. The wall clock is
/// sokol_time's QueryPerformanceCounter, which on some Windows systems
/// steps slightly BACKWARDS when a thread migrates cores (desynced TSCs) -
/// exactly what a multi-second world-load stall invites. Crash report:
/// "Time shouldn't move backwards" (emath history.rs) on the first
/// gameplay frame after a 4.6 s loader stall.
///
/// The clamp holds egui's contract on any hardware: a backwards or equal
/// read becomes "a hair after the last one".
fn monotonize(last: &mut f64, t: f64) -> f64 {
    /* NaN also fails egui's assert (all comparisons false), so it must not
     * pass through either - treat it as a backwards step. */
    let t = if t.is_finite() && t > *last { t } else { *last + 1e-6 };
    *last = t;
    t
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
            start: now_s(),
            pip: sgl::Pipeline { id: 0 },
            tex_w: 0,
            tex_h: 0,
            pixels: Vec::new(),
            img: sg::Image { id: 0 },
            view: sg::View { id: 0 },
            smp: sg::Sampler { id: 0 },
            prims: Vec::new(),
            ppp: 1.0,
            last_time: 0.0,
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
            time: {
                let t = now_s() - l.start;
                Some(monotonize(&mut l.last_time, t))
            },
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
    use super::monotonize;

    /// The crash scenario: a QPC read that steps backwards after a long
    /// stall. egui aborts the process on a non-increasing time (the panic
    /// can't unwind out of the extern "C" frame callback), so the clamp
    /// must turn a backwards read into a forward step.
    #[test]
    fn a_backwards_clock_read_still_moves_time_forward() {
        let mut last = 0.0;
        assert_eq!(monotonize(&mut last, 10.0), 10.0);
        let t = monotonize(&mut last, 9.4); /* QPC stepped back 0.6 s */
        assert!(t > 10.0, "must move forward, got {t}");
        let t2 = monotonize(&mut last, 9.5); /* still behind the floor */
        assert!(t2 > t, "and keep moving forward, got {t2}");
        /* Once the clock catches back up, real time resumes. */
        assert_eq!(monotonize(&mut last, 11.0), 11.0);
    }

    /// Equal timestamps also violate strict progress for velocity math;
    /// nudge them forward.
    #[test]
    fn equal_reads_advance_by_a_hair() {
        let mut last = 5.0;
        let t = monotonize(&mut last, 5.0);
        assert!(t > 5.0);
    }

    /// NaN fails egui's assert too (all comparisons are false), so it must
    /// never pass through.
    #[test]
    fn nan_reads_do_not_pass_through() {
        let mut last = 3.0;
        let t = monotonize(&mut last, f64::NAN);
        assert!(t.is_finite() && t > 3.0, "NaN must become a forward step, got {t}");
    }
}
