//! Dev screenshot writer (`TENEBRIS_DEV_SHOT=<path.png>`): once a second,
//! read the finished back buffer with glReadPixels and overwrite the target
//! PNG (tmp + rename, so a reader never sees a half-written file).
//!
//! Exists because external capture is unreliable on Windows: PrintWindow
//! returns white for a GL swapchain, and screen-copies lose the z-order
//! fight against whatever the user has focused. Reading from inside the
//! context sidesteps all of it - the same "deterministic tool, don't
//! hand-aim" call the LODCAM section of CLAUDE.md makes. Capture scripts
//! set the env var, wait for boot + a write tick, and read the file.
//!
//! Call [`maybe_write`] at the very end of `frame()`, after
//! `renderer::end_frame()` has committed and before sokol swaps - the
//! default framebuffer's back buffer holds the complete frame there.

use std::cell::Cell;

const GL_RGBA: u32 = 0x1908;
const GL_UNSIGNED_BYTE: u32 = 0x1401;
const GL_PACK_ALIGNMENT: u32 = 0x0D05;

/* Overwrite cadence in frames (~1 s at 60 fps). Dev-tool internals, not a
 * designer knob - stays a named const. */
const SHOT_EVERY_FRAMES: u64 = 60;

#[cfg(not(target_os = "emscripten"))]
#[cfg_attr(windows, link(name = "opengl32"))]
#[cfg_attr(all(unix, not(target_os = "macos")), link(name = "GL"))]
extern "system" {
    fn glReadPixels(x: i32, y: i32, w: i32, h: i32, format: u32, ty: u32, data: *mut u8);
    fn glPixelStorei(pname: u32, param: i32);
}

thread_local! {
    static SHOT_PATH: Option<String> = std::env::var("TENEBRIS_DEV_SHOT").ok().filter(|s| !s.is_empty());
    static FRAME: Cell<u64> = const { Cell::new(0) };
}

/// No-op unless TENEBRIS_DEV_SHOT is set. Reads the back buffer on the
/// GL thread (the frame callback) and overwrites the PNG every
/// [`SHOT_EVERY_FRAMES`] frames.
#[cfg(target_os = "emscripten")]
pub fn maybe_write(_width: i32, _height: i32) {}

/// No-op unless TENEBRIS_DEV_SHOT is set. Reads the back buffer on the
/// GL thread (the frame callback) and overwrites the PNG every
/// [`SHOT_EVERY_FRAMES`] frames.
#[cfg(not(target_os = "emscripten"))]
pub fn maybe_write(width: i32, height: i32) {
    SHOT_PATH.with(|p| {
        let Some(path) = p.as_deref() else { return };
        let n = FRAME.with(|f| {
            let v = f.get().wrapping_add(1);
            f.set(v);
            v
        });
        if n % SHOT_EVERY_FRAMES != 0 || width <= 0 || height <= 0 {
            return;
        }
        let (w, h) = (width as usize, height as usize);
        let mut pixels = vec![0u8; w * h * 4];
        unsafe {
            glPixelStorei(GL_PACK_ALIGNMENT, 1);
            glReadPixels(0, 0, width, height, GL_RGBA, GL_UNSIGNED_BYTE, pixels.as_mut_ptr());
        }
        /* GL rows are bottom-up; PNG wants top-down. */
        let stride = w * 4;
        let mut flipped = vec![0u8; pixels.len()];
        for row in 0..h {
            let src = (h - 1 - row) * stride;
            flipped[row * stride..(row + 1) * stride]
                .copy_from_slice(&pixels[src..src + stride]);
        }
        /* The alpha channel carries the wet mask (see composite.fs.glsl),
         * not opacity - force it opaque so viewers don't ghost the image. */
        for px in flipped.chunks_exact_mut(4) {
            px[3] = 0xFF;
        }
        let tmp = format!("{path}.tmp");
        let write = || -> Result<(), Box<dyn std::error::Error>> {
            let file = std::fs::File::create(&tmp)?;
            let mut enc = png::Encoder::new(std::io::BufWriter::new(file), width as u32, height as u32);
            enc.set_color(png::ColorType::Rgba);
            enc.set_depth(png::BitDepth::Eight);
            enc.write_header()?.write_image_data(&flipped)?;
            std::fs::rename(&tmp, path)?;
            Ok(())
        };
        if let Err(e) = write() {
            eprintln!("[dev-shot] write failed for {path}: {e}");
        }
    });
}
