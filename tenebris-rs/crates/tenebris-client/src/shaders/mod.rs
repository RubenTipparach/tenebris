//! sokol-shdc-generated shader modules - port of the C build's
//! `<name>.glsl.h` headers (see `tenebris-c/cmake/sokol-shdc.cmake`).
//!
//! Each module is the output of sokol-shdc's `sokol_rust` backend run
//! over the matching annotated-GLSL source. Most sources still live
//! under `tenebris-c/src/shaders/`; shaders the Rust port has diverged
//! from the C build (currently `hex.glsl`, which grew the block-break
//! crack channel) live in the port's own `tenebris-rs/shaders/` per the
//! self-contained-port rule. The files are deterministic build
//! artifacts checked in as-is (don't edit by hand - regenerate).
//!
//! Generation command (run from `tenebris-rs/`; swap the input dir to
//! `../tenebris-c/src/shaders/` for the not-yet-diverged shaders):
//!
//! ```text
//! ..\tenebris-c\third_party\sokol-tools-bin\sokol-shdc.exe \
//!     --input  shaders/<name>.glsl \
//!     --output crates/tenebris-client/src/shaders/<name>.rs \
//!     --slang  glsl410:glsl300es \
//!     --format sokol_rust
//! ```
//!
//! Slang set mirrors the C build exactly (cmake/sokol-shdc.cmake):
//! `glsl410` for native desktop GL (SOKOL_GLCORE, Windows + Linux) and
//! `glsl300es` for the WebGL2 / emscripten build (SOKOL_GLES3). The
//! Apple-only `metal_macos` slang is not generated - the Rust port has
//! no macOS target yet.
//!
//! Tool: sokol-shdc from https://github.com/floooh/sokol-tools-bin
//! (master binary vendored at `tenebris-c/third_party/sokol-tools-bin/
//! sokol-shdc.exe`, sha256
//! 85af3537cc432a44bac568ad64838821cef09c64cd58098a58e99612ccdc0ab8;
//! emits "#version:1#" reflection, matching the pinned sokol-rust rev
//! 9e3db76's post-2024 view/sampler binding model).

pub mod atmosphere;
pub mod composite;
pub mod composite_mobile;
pub mod distant;
pub mod glow;
pub mod hex;
pub mod starfield;
pub mod sun;
pub mod torch;
pub mod tower;
pub mod water;
pub mod water_mobile;
