//! Port of `tenebris-c/src/client/renderer.{c,h}`.
//!
//! Chunked-planet renderer. Every celestial body shares the same
//! chunked mesh layout (lod.yaml mesh_chunk_count chunks); the active
//! body streams edits (the world's dirty-tile queue -> wall-clock
//! budgeted chunk rebuilds), inactive bodies render a far-LOD icosphere until
//! the player approaches. Frame structure: offscreen opaque pass
//! (skybox, sun, terrain, moons, torches) -> composite blit to the
//! swapchain (underwater post-process) -> water cap pass sampling the
//! offscreen scene -> UI.
//!
//! # Renames (per PORTING.md rule 4 - `renderer_` prefix dropped)
//!
//! - `renderer_init()` / `renderer_shutdown()` -> `init()` / `shutdown()`
//! - `renderer_set_perf_mode()` / `renderer_perf_mode_enabled()` ->
//!   `set_perf_mode()` / `perf_mode_enabled()`
//! - `renderer_begin_frame()` -> `begin_frame()`
//! - `renderer_draw_skybox()` / `_sun` / `_world` / `_moons` / `_water`
//!   / `_torches` / `_face_outline` / `_water_flow_debug` ->
//!   `draw_skybox()` etc.
//! - `renderer_compose_to_swapchain()` -> `compose_to_swapchain()`
//! - `renderer_register_world()` / `_moon` -> `register_world()` /
//!   `register_moon()` (worlds are passed as `&Rc<RefCell<World>>`;
//!   identity is `Rc::ptr_eq`, standing in for the C pointer compare)
//! - `renderer_set_active_world()` -> `set_active_world()`
//! - `renderer_world_for_body()` -> `world_for_body()` (returns an
//!   `Option<Rc<RefCell<World>>>` instead of a nullable pointer)
//! - `renderer_body_meshed()` -> `body_meshed()`
//! - `renderer_set_terrain_visible()` etc. -> `set_terrain_visible()` etc.
//! - `renderer_moon_count()` -> `moon_count()`
//! - `renderer_end_frame()` -> `end_frame()`
//! - `renderer_triangles_drawn_this_frame()` etc. ->
//!   `triangles_drawn_this_frame()` etc.
//! - `renderer_atlas_view_id()` / `_sampler_id` -> `atlas_view_id()` /
//!   `atlas_sampler_id()`
//! - `renderer_chunk_count(int*, int*)` -> `chunk_count() -> (i32, i32)`
//! - `render_env_t` -> `RenderEnv`
//!
//! Other deltas from the C, all behavior-preserving:
//! - stb_image -> the `png` crate ([`load_png_rgba`]); same RGBA8
//!   output, same vertical-flip convention per call site.
//! - the C function-statics (`s_log_accum`, `s_last_log_s`,
//!   `G_OUTLINE_PIP`) become state fields / module thread-locals.
//! - `relight_track.world` (write-only in the C) is dropped.
//! - generated shader interfaces come from `crate::shaders::*` (the
//!   sokol-shdc `sokol_rust` backend) instead of `<name>.glsl.h`.
//!
//! # sokol boundary
//!
//! GPU submission can't run headless, so everything that *computes* is
//! factored into pure functions and the `sg_*` calls live in thin
//! wrappers that consume their output:
//!
//! - [`bake_atlas_pixels`] (pixels + per-column averages) vs
//!   `bake_atlas()` (sg_make_image/view/sampler)
//! - [`build_uvsphere_mesh`] / [`build_distant_mesh`] /
//!   [`build_distant_texture_pixels`] vs the `*_for_body` uploaders
//! - [`camera_basis`], [`starfield_bg_atten`],
//!   [`build_starfield_params`], [`build_atmosphere_params`],
//!   [`sun_mvp`] vs `draw_skybox()` / `draw_sun()`
//! - [`chunk_anchors`], [`classify_tile`], [`compute_chunk_cull`],
//!   [`chunk_visible`], [`extract_frustum`], [`sphere_visible`],
//!   [`body_draws_chunked`], [`remesh_budget_allows`], [`grow_capacity`]
//!   vs the draw / upload paths
//! - `register_world_record()` (registry bookkeeping) vs
//!   `register_world()` (registry + GPU mesh/texture build)
//!
//! Tests pin the pure halves; the GPU halves are line-for-line ports
//! of the C and carry no logic of their own beyond resource calls.

#![allow(dead_code)] // wired up by the main_web wave of the port

use crate::gfx_math::{mat4_identity, mat4_mul, mat4_translate, Mat4};
use crate::hex_mesher::{self, HexMesh, HexVertex};
use crate::net_client;
use crate::profiler;
use crate::shaders;
use crate::torch;
use sokol::gfx as sg;
use sokol::gl as sgl;
use std::cell::{Cell, RefCell};
use std::ffi::CString;
use std::rc::Rc;
use tenebris_core::blocks::{self, Block, FaceCap};
use tenebris_core::config;
use tenebris_core::math::{
    dvec3_cross, dvec3_dot, dvec3_length, dvec3_make, dvec3_normalize, dvec3_scale, dvec3_sub,
    dvec3_to_vec3, vec3_add, vec3_length, vec3_sub, DVec3, Vec3,
};
use tenebris_core::orbit;
use tenebris_core::planet::{self, BodyConfig, BodyId, Tileset};
use tenebris_core::planet_gen;
use tenebris_core::world::{World, WORLD_MAX_DEPTH};
use tenebris_core::world_water;

/* ----------------------------------------------------------------------- */
/* Goldberg @ subs=6 = 40,962 tiles. Per-tile draw calls would cost
 * ~400 ms/frame just in binding overhead. Instead we build merged
 * chunk meshes on CPU, upload per chunk, and render the planet in
 * chunk_n() draw calls. See renderer.c for the full design
 * commentary. */

/* 2048 tiles/frame finishes Tenebris (40 962 tiles) in ~20 frames.
 * (Kept for parity with the C header constant; the current code path
 * full-meshes bodies in one shot - see body_full_mesh.) */
const MESH_BUDGET_PER_FRAME: i32 = 2048;
/* Per-chunk initial GPU vertex / index capacities. chunk_upload grows
 * the GPU buffer at 2x whenever the CPU mesh outgrows it, so memory
 * tracks actual content rather than worst case. */
const INIT_VERTICES: i32 = 32 << 10;
const INIT_INDICES: i32 = 96 << 10;
const INIT_WATER_VERTICES: i32 = 8 << 10;
const INIT_WATER_INDICES: i32 = 24 << 10;

/* Number of mesh chunks the planet is split into. Anchors are spread
 * evenly over the sphere (Fibonacci lattice); each tile is assigned to
 * its nearest anchor, giving roughly equal partitions.
 *
 * Block edits dirty only the chunks containing edited tiles, so a
 * single mine/place rebuild touches one chunk's worth of tiles instead
 * of the whole planet. The count is a runtime knob (lod.yaml
 * mesh_chunk_count): more chunks = fewer tiles re-meshed per edit
 * (= less hitch placing blocks and applying peer / water edits) at the
 * cost of a few more draw calls. RENDER_CHUNK_COUNT_MAX is the
 * compile-time upper bound the per-body arrays are sized to; the live
 * count clamps into it. */
pub const RENDER_CHUNK_COUNT_MAX: usize = 256;

/* Live chunk count, read once from lod.yaml's mesh_chunk_count (loaded
 * at boot, never reloaded) and clamped into [1, RENDER_CHUNK_COUNT_MAX].
 * Cached on first use so allocate / free / draw loops always agree on
 * the same count for the life of the process. (C: static int g_chunk_n
 * + chunk_n().) */
fn chunk_n() -> usize {
    static G_CHUNK_N: std::sync::OnceLock<usize> = std::sync::OnceLock::new();
    *G_CHUNK_N.get_or_init(|| {
        let n = config::lod().mesh_chunk_count;
        n.clamp(1, RENDER_CHUNK_COUNT_MAX as i32) as usize
    })
}

/* Maximum number of registered bodies (C: sizeof(R.bodies)/sizeof). */
const MAX_BODIES: usize = 32;

/* "Too far for chunked detail" hard cutoff shared by the terrain,
 * water, and moon-LOD passes. */
const MAX_DETAIL_DIST_M: f32 = 5000.0;

/* ----------------------------------------------------------------------- */

/// Port of `render_env_t`. See renderer.h for per-field commentary.
#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub struct RenderEnv {
    pub sun_dir: Vec3,
    pub sun_pos: Vec3,
    pub sun_radius: f32,
    pub sky_top: Vec3,
    pub sky_bottom: Vec3,
    pub ambient: Vec3,

    pub atmo_planet_center: Vec3,
    pub atmo_planet_radius: f32,
    pub atmo_radius: f32,
    pub atmo_lower_radius: f32,
    pub atmo_strength: f32,
    pub atmo_rayleigh_scale: f32,
    pub atmo_mie_scale: f32,
    pub atmo_sun_intensity: f32,
    pub atmo_sunset_strength: f32,
    pub atmo_wavelengths: Vec3,
    pub atmo_mie_g: f32,
    pub atmo_scale_height: f32,
    pub atmo_sunset_tint: Vec3,
    pub atmo_sunset_glow: Vec3,
    pub atmo_sunset_horizon: Vec3,
    pub camera_world: Vec3,
    /// Active body's spin angle (radians) about its +Y axis at the current
    /// sim time. The starfield samples through a basis counter-rotated by
    /// this, so the stars wheel across the sky with the day exactly like
    /// the sun + moons do. 0 = no rotation.
    pub star_spin_angle: f32,
}

/* ----------------------------------------------------------------------- */
/* Image loading - stands in for stb_image. Decodes any 8/16-bit PNG
 * to tightly-packed RGBA8 exactly like stbi_load(path, .., 4). */

pub(crate) struct LoadedImage {
    pub(crate) w: i32,
    pub(crate) h: i32,
    pub(crate) rgba: Vec<u8>,
}

/// pub(crate): pixel_ui + ui_icons reuse this as their stb_image
/// stand-in (same RGBA8 output as `stbi_load(path, .., 4)`).
pub(crate) fn load_png_rgba(path: &str, flip_vertical: bool) -> Option<LoadedImage> {
    let file = std::fs::File::open(path).ok()?;
    let mut decoder = png::Decoder::new(std::io::BufReader::new(file));
    /* EXPAND promotes palette/1-2-4 bit to 8-bit; STRIP_16 matches
     * stb_image's default 8-bit output. */
    decoder.set_transformations(png::Transformations::EXPAND | png::Transformations::STRIP_16);
    let mut reader = decoder.read_info().ok()?;
    let mut buf = vec![0u8; reader.output_buffer_size()];
    let info = reader.next_frame(&mut buf).ok()?;
    buf.truncate(info.buffer_size());
    let (w, h) = (info.width as i32, info.height as i32);
    let mut rgba = match info.color_type {
        png::ColorType::Rgba => buf,
        png::ColorType::Rgb => {
            let mut out = Vec::with_capacity((w * h * 4) as usize);
            for px in buf.chunks_exact(3) {
                out.extend_from_slice(&[px[0], px[1], px[2], 255]);
            }
            out
        }
        png::ColorType::Grayscale => {
            let mut out = Vec::with_capacity((w * h * 4) as usize);
            for &g in &buf {
                out.extend_from_slice(&[g, g, g, 255]);
            }
            out
        }
        png::ColorType::GrayscaleAlpha => {
            let mut out = Vec::with_capacity((w * h * 4) as usize);
            for px in buf.chunks_exact(2) {
                out.extend_from_slice(&[px[0], px[0], px[0], px[1]]);
            }
            out
        }
        /* EXPAND already converted Indexed; unreachable in practice. */
        png::ColorType::Indexed => return None,
    };
    if flip_vertical {
        let stride = (w * 4) as usize;
        let rows: Vec<&[u8]> = rgba.chunks_exact(stride).rev().collect();
        rgba = rows.concat();
    }
    Some(LoadedImage { w, h, rgba })
}

/* ----------------------------------------------------------------------- */
/* Atlas bake - pure half. */

const ATLAS_TILE_PX: i32 = 16;
/* Physical column count: 93 legacy UV-addressed columns + the extension
 * tiles at 93..107 (baked at u > 1.0; the hex FS rescales u by 93/108 -
 * see hex_mesher::HEX_ATLAS_TILES_PHYS). */
const ATLAS_TILES: usize = hex_mesher::HEX_ATLAS_TILES_PHYS as usize;
const ATLAS_W: i32 = ATLAS_TILE_PX * hex_mesher::HEX_ATLAS_TILES_PHYS;
const ATLAS_H: i32 = ATLAS_TILE_PX;

/// Source image per atlas column (None = column stays transparent).
/// Columns 0-11 default tileset, 12-17 Sequoia, 18-20 runtime-tinted
/// variants, 21-24 vegetation + planet core.
const ATLAS_PATHS: [Option<&str>; ATLAS_TILES] = [
    None,
    Some("assets/textures/water.png"),
    Some("assets/textures/sand.png"),
    Some("assets/textures/dirt.png"),
    Some("assets/textures/grass.png"),
    Some("assets/textures/rocks.png"),
    Some("assets/textures/ice_glass.png"), /* 6 Ice - frosted, alpha-dithered */
    Some("assets/textures/snow.png"),
    Some("assets/textures/dirt_grass.png"),
    Some("assets/textures/dirt_snow.png"),
    Some("assets/textures/torch.png"),
    Some("assets/textures/moon.png"),
    Some("assets/textures/planet_seq/planet_seq_grass.png"), /* 12 SEQ_GRASS */
    Some("assets/textures/planet_seq/planet_seq_dirt.png"),  /* 13 SEQ_DIRT */
    Some("assets/textures/planet_seq/planet_seq_grass_dirt.png"), /* 14 SEQ_DIRT_GRASS */
    Some("assets/textures/planet_seq/planet_seq_sand.png"),  /* 15 SEQ_SAND */
    Some("assets/textures/planet_seq/planet_seq_snow.png"),  /* 16 SEQ_SNOW */
    Some("assets/textures/planet_seq/planet_seq_snow_dirt.png"), /* 17 SEQ_DIRT_SNOW */
    Some("assets/textures/moon.png"),                        /* 18 CRAG_ROCK */
    Some("assets/textures/ice.png"),                         /* 19 FROST_ICE */
    Some("assets/textures/rocks.png"),                       /* 20 ASTEROID_ROCK */
    Some("assets/textures/wood.png"),                        /* 21 WOOD */
    Some("assets/textures/grass.png"),                       /* 22 LEAVES */
    Some("assets/textures/rocks.png"),                       /* 23 BEDROCK */
    /* Dedicated ORIGINAL rust-red foliage (tools/gen-sequoia-textures.py)
     * - earlier cuts tinted grass.png (no red channel -> black) then
     * snow.png (blue specks) then sand.png; Sequoia owns its own now. */
    Some("assets/textures/planet_seq/planet_seq_leaves.png"), /* 24 SEQ_LEAVES */
    /* Ore-bearing rock: dedicated stone-with-mineral-speck textures
     * (matches the JS rocks_*.png minerals set) rather than a flat tint
     * over plain rock - so each ore reads as specks embedded in stone. */
    Some("assets/textures/minerals/rocks_coal.png"),         /* 25 COAL_ORE */
    Some("assets/textures/minerals/rocks_copper.png"),       /* 26 COPPER_ORE */
    Some("assets/textures/minerals/rocks_tin.png"),          /* 27 TIN_ORE */
    Some("assets/textures/minerals/rocks_iron.png"),         /* 28 IRON_ORE */
    /* Tech-block tiles (ported JS art). Each placed machine shows its
     * 16x16 _face on every face - the same icon the JS uses for the
     * block - so it reads as that machine without a per-face cube net.
     * face_tile() maps each tech Block to one of these columns. */
    Some("assets/textures/technology/furnace_face.png"),               /* 29 Furnace */
    Some("assets/textures/technology/electric_furnace_face.png"),      /* 30 ElectricFurnace */
    Some("assets/textures/technology/3d_printer_face.png"),            /* 31 Printer3D */
    Some("assets/textures/technology/computer_face.png"),              /* 32 Computer */
    Some("assets/textures/technology/electronics_workbench_face.png"), /* 33 Workbench */
    Some("assets/textures/technology/hydro_generator_face.png"),       /* 34 HydroGenerator */
    Some("assets/textures/technology/steam_engine_face.png"),          /* 35 SteamEngine */
    Some("assets/textures/technology/storage_face.png"),               /* 36 StorageChest */
    Some("assets/textures/technology/launch_pad_face.png"),            /* 37 LaunchPad */
    Some("assets/textures/technology/launch_tower_face.png"),          /* 38 LaunchTower */
    Some("assets/textures/technology/cable.png"),                      /* 39 Cable */
    Some("assets/textures/technology/copper_pipe.png"),                /* 40 CopperPipe */
    Some("assets/textures/farmland.png"),                              /* 41 Farmland (tilled soil) */
    /* Tech-block cube cells, sliced from each 48x32 JS net
     * (front/left/right/back/top/bottom). emit_tech_cube maps these
     * per cube face; 6 contiguous columns per machine from col 42. */
    Some("assets/textures/technology/furnace__front.png"), /* 42 furnace front */
    Some("assets/textures/technology/furnace__left.png"), /* 43 furnace left */
    Some("assets/textures/technology/furnace__right.png"), /* 44 furnace right */
    Some("assets/textures/technology/furnace__back.png"), /* 45 furnace back */
    Some("assets/textures/technology/furnace__top.png"), /* 46 furnace top */
    Some("assets/textures/technology/furnace__bottom.png"), /* 47 furnace bottom */
    Some("assets/textures/technology/electric_furnace__front.png"), /* 48 electric_furnace front */
    Some("assets/textures/technology/electric_furnace__left.png"), /* 49 electric_furnace left */
    Some("assets/textures/technology/electric_furnace__right.png"), /* 50 electric_furnace right */
    Some("assets/textures/technology/electric_furnace__back.png"), /* 51 electric_furnace back */
    Some("assets/textures/technology/electric_furnace__top.png"), /* 52 electric_furnace top */
    Some("assets/textures/technology/electric_furnace__bottom.png"), /* 53 electric_furnace bottom */
    Some("assets/textures/technology/3d_printer__front.png"), /* 54 3d_printer front */
    Some("assets/textures/technology/3d_printer__left.png"), /* 55 3d_printer left */
    Some("assets/textures/technology/3d_printer__right.png"), /* 56 3d_printer right */
    Some("assets/textures/technology/3d_printer__back.png"), /* 57 3d_printer back */
    Some("assets/textures/technology/3d_printer__top.png"), /* 58 3d_printer top */
    Some("assets/textures/technology/3d_printer__bottom.png"), /* 59 3d_printer bottom */
    Some("assets/textures/technology/computer__front.png"), /* 60 computer front */
    Some("assets/textures/technology/computer__left.png"), /* 61 computer left */
    Some("assets/textures/technology/computer__right.png"), /* 62 computer right */
    Some("assets/textures/technology/computer__back.png"), /* 63 computer back */
    Some("assets/textures/technology/computer__top.png"), /* 64 computer top */
    Some("assets/textures/technology/computer__bottom.png"), /* 65 computer bottom */
    Some("assets/textures/technology/electronics_workbench__front.png"), /* 66 electronics_workbench front */
    Some("assets/textures/technology/electronics_workbench__left.png"), /* 67 electronics_workbench left */
    Some("assets/textures/technology/electronics_workbench__right.png"), /* 68 electronics_workbench right */
    Some("assets/textures/technology/electronics_workbench__back.png"), /* 69 electronics_workbench back */
    Some("assets/textures/technology/electronics_workbench__top.png"), /* 70 electronics_workbench top */
    Some("assets/textures/technology/electronics_workbench__bottom.png"), /* 71 electronics_workbench bottom */
    Some("assets/textures/technology/hydro_generator__front.png"), /* 72 hydro_generator front */
    Some("assets/textures/technology/hydro_generator__left.png"), /* 73 hydro_generator left */
    Some("assets/textures/technology/hydro_generator__right.png"), /* 74 hydro_generator right */
    Some("assets/textures/technology/hydro_generator__back.png"), /* 75 hydro_generator back */
    Some("assets/textures/technology/hydro_generator__top.png"), /* 76 hydro_generator top */
    Some("assets/textures/technology/hydro_generator__bottom.png"), /* 77 hydro_generator bottom */
    Some("assets/textures/technology/steam_engine__front.png"), /* 78 steam_engine front */
    Some("assets/textures/technology/steam_engine__left.png"), /* 79 steam_engine left */
    Some("assets/textures/technology/steam_engine__right.png"), /* 80 steam_engine right */
    Some("assets/textures/technology/steam_engine__back.png"), /* 81 steam_engine back */
    Some("assets/textures/technology/steam_engine__top.png"), /* 82 steam_engine top */
    Some("assets/textures/technology/steam_engine__bottom.png"), /* 83 steam_engine bottom */
    Some("assets/textures/technology/storage_chest__front.png"), /* 84 storage_chest front */
    Some("assets/textures/technology/storage_chest__left.png"), /* 85 storage_chest left */
    Some("assets/textures/technology/storage_chest__right.png"), /* 86 storage_chest right */
    Some("assets/textures/technology/storage_chest__back.png"), /* 87 storage_chest back */
    Some("assets/textures/technology/storage_chest__top.png"), /* 88 storage_chest top */
    Some("assets/textures/technology/storage_chest__bottom.png"), /* 89 storage_chest bottom */
    /* Rocket parts, rendered as stacked cubes on a launch pad. Each shows
     * its item icon on every face (downscaled to 16x16 by the loader). */
    Some("assets/textures/items/rocket_engine.png"),  /* 90 rocket engine */
    Some("assets/textures/items/fuel_tank.png"),      /* 91 fuel tank */
    Some("assets/textures/items/command_module.png"), /* 92 command module */
    /* Biome-sod extension tiles (past HEX_ATLAS_TILES; sampled at
     * u > 1.0 via the hex FS 93/108 rescale). Baked from the stock
     * grass art by tools/gen-biome-grass.py - a multiply tint can't
     * yellow a texture whose red channel is mostly zero, so pasture
     * is a channel-mixed PNG instead of an ATLAS_TINTS entry. */
    Some("assets/textures/jungle_grass.png"),      /* 93 JUNGLE_GRASS top */
    Some("assets/textures/jungle_dirt_grass.png"), /* 94 JUNGLE_GRASS side */
    Some("assets/textures/dry_grass.png"),         /* 95 DRY_GRASS top */
    Some("assets/textures/dry_dirt_grass.png"),    /* 96 DRY_GRASS side */
    Some("assets/textures/cactus.png"),            /* 97 CACTUS (scatter) */
    /* Station / casino structure set (space era Phase 2 "built look" +
     * Phase 5 casino room) - baked by tools/gen-casino-textures.py. */
    Some("assets/textures/technology/station_hull.png"),      /* 98 STATION_HULL */
    Some("assets/textures/technology/station_floor.png"),     /* 99 STATION_FLOOR */
    Some("assets/textures/technology/casino_carpet.png"),     /* 100 CASINO_CARPET */
    Some("assets/textures/technology/casino_wall.png"),       /* 101 CASINO_WALL */
    Some("assets/textures/technology/neon_trim.png"),         /* 102 NEON_TRIM */
    Some("assets/textures/technology/casino_sign.png"),       /* 103 CASINO_SIGN */
    Some("assets/textures/technology/slot_machine_face.png"), /* 104 SLOT_MACHINE */
    Some("assets/textures/technology/card_table_face.png"),   /* 105 CARD_TABLE */
    /* Dedicated ORIGINAL textures (tools/gen-sequoia-textures.py) - the
     * first cut tinted snow.png, which read as a recycled snow tile. */
    Some("assets/textures/planet_seq/planet_seq_mycelium.png"), /* 106 SEQ_MYCELIUM */
    Some("assets/textures/planet_seq/planet_seq_shroom_cap.png"), /* 107 SEQ_SHROOM_CAP */
];

/// Per-channel multiplier applied to each loaded tile. {1,1,1} =
/// untinted.
const ATLAS_TINTS: [[f32; 3]; ATLAS_TILES] = [
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    [1.30, 0.55, 0.35], /* CRAG_ROCK     - Mars-red rust */
    [0.55, 0.80, 1.25], /* FROST_ICE     - glacial blue  */
    [0.70, 0.68, 0.65], /* ASTEROID_ROCK - dim gray      */
    [1.00, 1.00, 1.00], /* WOOD     - passthrough        */
    [0.65, 1.05, 0.50], /* LEAVES   - saturated green    */
    [0.30, 0.30, 0.32], /* BEDROCK  - near-black slate   */
    [1.0, 1.0, 1.0], /* SEQ_LEAVES - colour baked in the texture */
    /* Ore tints are neutral: the mineral colour lives in the dedicated
     * speck textures now, not a multiplier over plain rock. */
    [1.0, 1.0, 1.0], /* COAL_ORE   */
    [1.0, 1.0, 1.0], /* COPPER_ORE */
    [1.0, 1.0, 1.0], /* TIN_ORE    */
    [1.0, 1.0, 1.0], /* IRON_ORE   */
    /* Tech tiles 29..89 are pre-coloured pixel art - no tint. */
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    /* 90-92 rocket parts (engine, fuel tank, command module). */
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    /* 93-105 extension tiles: pre-baked PNGs, no tint; 106-107 tinted
     * Sequoia Sporewood tiles (mycelium ground / mushroom cap). */
    [1.0, 1.0, 1.0], /* JUNGLE_GRASS top  */
    [1.0, 1.0, 1.0], /* JUNGLE_GRASS side */
    [1.0, 1.0, 1.0], /* DRY_GRASS top     */
    [1.0, 1.0, 1.0], /* DRY_GRASS side    */
    [1.0, 1.0, 1.0], /* CACTUS            */
    [1.0, 1.0, 1.0], /* STATION_HULL      */
    [1.0, 1.0, 1.0], /* STATION_FLOOR     */
    [1.0, 1.0, 1.0], /* CASINO_CARPET     */
    [1.0, 1.0, 1.0], /* CASINO_WALL       */
    [1.0, 1.0, 1.0], /* NEON_TRIM         */
    [1.0, 1.0, 1.0], /* CASINO_SIGN       */
    [1.0, 1.0, 1.0], /* SLOT_MACHINE      */
    [1.0, 1.0, 1.0], /* CARD_TABLE        */
    [1.0, 1.0, 1.0], /* 106 SEQ_MYCELIUM  - colour baked in the texture */
    [1.0, 1.0, 1.0], /* 107 SEQ_SHROOM_CAP - colour baked in the texture */
];

struct AtlasBake {
    pixels: Vec<u8>, /* ATLAS_W x ATLAS_H RGBA8 */
    col_avg: [Vec3; ATLAS_TILES],
}

/// Pure half of the C `bake_atlas()`: assembles the atlas pixel strip
/// (nearest-sample downscale to 16x16 per column, per-channel tint,
/// clamp) and the per-column average colours the distant LOD samples.
/// `load` abstracts the file read so tests can inject synthetic
/// images; production passes [`load_png_rgba`] with vertical flip on
/// (the C sets stbi_set_flip_vertically_on_load(1) for the atlas).
fn bake_atlas_pixels<F>(load: F) -> AtlasBake
where
    F: Fn(&str) -> Option<LoadedImage>,
{
    let tile_px = ATLAS_TILE_PX;
    let w = ATLAS_W;
    let h = ATLAS_H;
    let mut atlas = vec![0u8; (w * h * 4) as usize];

    for col in 0..ATLAS_TILES {
        let Some(path) = ATLAS_PATHS[col] else { continue };
        let Some(img) = load(path) else { continue };
        let (tw, th, pix) = (img.w, img.h, &img.rgba);
        let tr = ATLAS_TINTS[col][0];
        let tg = ATLAS_TINTS[col][1];
        let tb = ATLAS_TINTS[col][2];
        for y in 0..tile_px {
            let sy = y * th / tile_px;
            for x in 0..tile_px {
                let sx = x * tw / tile_px;
                let src = ((sy * tw + sx) * 4) as usize;
                let dst = ((y * w + col as i32 * tile_px + x) * 4) as usize;
                /* Multiply-blend tint clamped to 0..255 so bright tints
                 * (Mars red) don't overflow into the alpha channel. */
                let mut r = (pix[src] as f32 * tr) as i32;
                if r > 255 {
                    r = 255;
                }
                let mut g = (pix[src + 1] as f32 * tg) as i32;
                if g > 255 {
                    g = 255;
                }
                let mut b = (pix[src + 2] as f32 * tb) as i32;
                if b > 255 {
                    b = 255;
                }
                atlas[dst] = r as u8;
                atlas[dst + 1] = g as u8;
                atlas[dst + 2] = b as u8;
                atlas[dst + 3] = pix[src + 3];
            }
        }
    }

    /* Per-column average colour over the already-tinted pixels, used
     * by the distant-LOD texture builder. Near-transparent pixels are
     * skipped; an empty column averages to mid-gray. */
    let mut col_avg = [Vec3::default(); ATLAS_TILES];
    for (col, avg) in col_avg.iter_mut().enumerate() {
        let mut sr = 0.0f64;
        let mut sg_ = 0.0f64;
        let mut sb = 0.0f64;
        let mut n = 0i32;
        for y in 0..tile_px {
            for x in 0..tile_px {
                let idx = ((y * w + col as i32 * tile_px + x) * 4) as usize;
                if atlas[idx + 3] < 8 {
                    continue; /* skip near-transparent */
                }
                sr += atlas[idx] as f64;
                sg_ += atlas[idx + 1] as f64;
                sb += atlas[idx + 2] as f64;
                n += 1;
            }
        }
        *avg = if n > 0 {
            Vec3 {
                x: (sr / n as f64 / 255.0) as f32,
                y: (sg_ / n as f64 / 255.0) as f32,
                z: (sb / n as f64 / 255.0) as f32,
            }
        } else {
            Vec3 { x: 0.5, y: 0.5, z: 0.5 }
        };
    }
    AtlasBake { pixels: atlas, col_avg }
}

/* ----------------------------------------------------------------------- */
/* Distant-body icosphere + per-body LOD textures (pure halves). */

const DISTANT_MAX_VERTS: usize = 1024; /* SUBDIV=3 needs 642 unique verts */
const DISTANT_MAX_TRIS: usize = 1280; /* SUBDIV=3 needs 1280 tris        */

const DISTANT_TEX_W: i32 = 256;
const DISTANT_TEX_H: i32 = 128;
/* Tangent-space slope encoder: scales raw altitude delta (m / texel)
 * into [-1, +1] so a 5 m vertical change across one texel registers
 * as a full unit slope. */
const DISTANT_NORMAL_SLOPE_SCALE: f32 = 0.2;

/// Port of `edge_mid_t` + `midpoint_lookup()`. Dedupes subdivision
/// midpoints so adjacent tris share the new vertex; same linear scan
/// and insertion order as the C.
fn midpoint_lookup(
    edges: &mut Vec<(u32, u32, u32)>,
    verts: &mut Vec<[f32; 3]>,
    a: u32,
    b: u32,
) -> u32 {
    let lo = a.min(b);
    let hi = a.max(b);
    for &(ea, eb, mid) in edges.iter() {
        if ea == lo && eb == hi {
            return mid;
        }
    }
    /* New midpoint - average and re-project to unit sphere. */
    let mut mx = (verts[a as usize][0] + verts[b as usize][0]) * 0.5;
    let mut my = (verts[a as usize][1] + verts[b as usize][1]) * 0.5;
    let mut mz = (verts[a as usize][2] + verts[b as usize][2]) * 0.5;
    let l = (mx * mx + my * my + mz * mz).sqrt();
    if l > 0.0 {
        mx /= l;
        my /= l;
        mz /= l;
    }
    let idx = verts.len() as u32;
    verts.push([mx, my, mz]);
    edges.push((lo, hi, idx));
    idx
}

/// Equirectangular pixel index -> body-local unit direction. Keep in
/// lock-step with the dir_to_uv mapping in distant.glsl.
fn distant_pixel_to_dir(px: i32, py: i32) -> DVec3 {
    let u = (px as f64 + 0.5) / DISTANT_TEX_W as f64;
    let v = (py as f64 + 0.5) / DISTANT_TEX_H as f64;
    let lon = (u - 0.5) * 2.0 * std::f64::consts::PI;
    let lat = (0.5 - v) * std::f64::consts::PI;
    let cl = lat.cos();
    DVec3 { x: cl * lon.cos(), y: lat.sin(), z: cl * lon.sin() }
}

/// Port of `sample_planet_lod_color()`. Biome colour + water blend +
/// height shade + tileset tint for one surface direction, driven from
/// the procgen noise (same order of operations, f32 math, as the C).
/// Returns (rgb, water_alpha).
fn sample_planet_lod_color(
    body: &BodyConfig,
    fallback: Vec3,
    unit_dir: DVec3,
    surface_m: f32,
    col_avg: &[Vec3; ATLAS_TILES],
) -> (Vec3, f32) {
    let prof = planet_gen::profile(body, unit_dir);
    let top = planet_gen::sample_with_profile(&prof, surface_m);
    /* Fallback: empty / non-solid cell at the surface - seed with the
     * renderer-side distant fallback so the texture never goes black. */
    if top == Block::Air {
        return (fallback, 0.0);
    }
    let col = blocks::face_tile(top, FaceCap::Top) as i32;
    /* Physical column range - includes the biome-sod extension tiles,
     * so jungle / pasture / desert-rock read from deep space too. */
    let mut base = if (0..ATLAS_TILES as i32).contains(&col) {
        col_avg[col as usize]
    } else {
        fallback
    };

    let l = config::lod();
    let mut ts = body.tileset as i32;
    if !(0..=4).contains(&ts) {
        ts = 0;
    }
    let ts = ts as usize;

    /* Water column thickness drives both the visual water blend AND
     * the alpha mask the shader reads for its specular gate. The sea
     * sits at SEA_LEVEL + sea_raise_m, NOT at a hardcoded 0 - Sequoia
     * raises its sea +2 m, so testing surface_m < 0 read its whole
     * shallow archipelago as dry land and the planet/preview showed no
     * water at all. Test + measure depth against the REAL sea. */
    let mut water_alpha = 0.0f32;
    let sea = planet_gen::sea_raise_m(body); /* SEA_LEVEL is 0.0 */
    if body.has_water && surface_m < sea {
        let depth_m = sea - surface_m;
        let mut full_depth = l.tileset_water_full_depth_m[ts];
        if full_depth <= 0.0 {
            full_depth = 4.0;
        }
        let mut wf = depth_m / full_depth;
        if wf > 1.0 {
            wf = 1.0;
        }
        let wc = l.tileset_water_color[ts];
        base.x = base.x * (1.0 - wf) + wc.x * wf;
        base.y = base.y * (1.0 - wf) + wc.y * wf;
        base.z = base.z * (1.0 - wf) + wc.z * wf;
        water_alpha = wf;
    }

    /* Height shade + per-tileset tint. */
    let mut t = surface_m / l.distant_shade_range_m;
    if t < -1.0 {
        t = -1.0;
    }
    if t > 1.0 {
        t = 1.0;
    }
    let u = t * 0.5 + 0.5;
    let shade = l.distant_shade_floor + (l.distant_shade_ceiling - l.distant_shade_floor) * u;
    let lo = l.tileset_lowland_tint[ts];
    let hi = l.tileset_peak_tint[ts];
    base.x *= shade * (lo.x * (1.0 - u) + hi.x * u);
    base.y *= shade * (lo.y * (1.0 - u) + hi.y * u);
    base.z *= shade * (lo.z * (1.0 - u) + hi.z * u);
    (base, water_alpha)
}

/* ----------------------------------------------------------------------- */
/* Body-gallery thumbnails (the solar-system map's picker "screenshots").  */

/// Thumbnail edge, px. The gallery atlas is GALLERY_COLS x GALLERY_ROWS
/// of these, one cell per `BodyId::ALL` entry in declaration order.
pub const GALLERY_THUMB_PX: i32 = 48;
const GALLERY_COLS: i32 = 5;
const GALLERY_ROWS: i32 = 4;

/// Pure half of the gallery bake: one lit-sphere thumbnail per body,
/// coloured by the exact sampling the distant LOD uses (biome colour +
/// water blend + height shade), lit by a fixed key light with a soft
/// terminator, alpha-feathered at the disc edge. Premultiplied RGBA -
/// the egui layer's blend expects it.
fn build_body_gallery_pixels(col_avg: &[Vec3; ATLAS_TILES]) -> (i32, i32, Vec<u8>) {
    let w = GALLERY_COLS * GALLERY_THUMB_PX;
    let h = GALLERY_ROWS * GALLERY_THUMB_PX;
    let mut px = vec![0u8; (w * h * 4) as usize];
    /* Key light: upper-left, toward the viewer - reads as "sunlit globe"
     * in a UI card regardless of the body's real sky. */
    let light = {
        let l = Vec3 { x: -0.45, y: 0.5, z: 0.75 };
        let len = (l.x * l.x + l.y * l.y + l.z * l.z).sqrt();
        Vec3 { x: l.x / len, y: l.y / len, z: l.z / len }
    };
    for (bi, &id) in BodyId::ALL.iter().enumerate() {
        let b = planet::get(id);
        let fallback = body_distant_color(&b);
        let ox = (bi as i32 % GALLERY_COLS) * GALLERY_THUMB_PX;
        let oy = (bi as i32 / GALLERY_COLS) * GALLERY_THUMB_PX;
        let t = GALLERY_THUMB_PX as f32;
        for py in 0..GALLERY_THUMB_PX {
            for pxi in 0..GALLERY_THUMB_PX {
                /* Pixel -> [-1,1] disc coords; sphere normal faces +Z. */
                let fx = (pxi as f32 + 0.5) / t * 2.0 - 1.0;
                let fy = (py as f32 + 0.5) / t * 2.0 - 1.0;
                let rr = fx * fx + fy * fy;
                /* 1-px feathered edge so the disc anti-aliases on any
                 * panel colour. */
                let alpha = ((1.0 - rr.sqrt()) * (t * 0.5)).clamp(0.0, 1.0);
                if alpha <= 0.0 {
                    continue;
                }
                let nz = (1.0 - rr.min(1.0)).sqrt();
                let n = Vec3 { x: fx, y: -fy, z: nz };
                let dir = dvec3_make(n.x as f64, n.y as f64, n.z as f64);
                let mut surface_m = planet_gen::surface_altitude(&b, dir);
                if b.barren {
                    surface_m *= 0.3; /* same rule as the distant texture */
                }
                let (rgb, _water) =
                    sample_planet_lod_color(&b, fallback, dir, surface_m, col_avg);
                let lit = 0.35 + 0.65 * (n.x * light.x + n.y * light.y + n.z * light.z).max(0.0);
                let idx = (((oy + py) * w + ox + pxi) * 4) as usize;
                /* Premultiply by the edge alpha. */
                px[idx] = ((rgb.x * lit).clamp(0.0, 1.0) * alpha * 255.0) as u8;
                px[idx + 1] = ((rgb.y * lit).clamp(0.0, 1.0) * alpha * 255.0) as u8;
                px[idx + 2] = ((rgb.z * lit).clamp(0.0, 1.0) * alpha * 255.0) as u8;
                px[idx + 3] = (alpha * 255.0) as u8;
            }
        }
    }
    (w, h, px)
}

/// GPU half: bake + upload the gallery atlas (init time, after
/// bake_atlas so the column averages are live).
fn bake_body_gallery(r: &mut Renderer) {
    let (w, h, px) = build_body_gallery_pixels(&r.atlas_col_avg);
    let mut desc = sg::ImageDesc {
        width: w,
        height: h,
        pixel_format: sg::PixelFormat::Rgba8,
        label: c"body-gallery".as_ptr(),
        ..Default::default()
    };
    desc.data.mip_levels[0] = sg::slice_as_range(&px);
    r.gallery_img = sg::make_image(&desc);
    r.gallery_view = sg::make_view(&sg::ViewDesc {
        texture: sg::TextureViewDesc { image: r.gallery_img, ..Default::default() },
        label: c"body-gallery-view".as_ptr(),
        ..Default::default()
    });
    r.gallery_smp = sg::make_sampler(&sg::SamplerDesc {
        min_filter: sg::Filter::Linear,
        mag_filter: sg::Filter::Linear,
        wrap_u: sg::Wrap::ClampToEdge,
        wrap_v: sg::Wrap::ClampToEdge,
        label: c"body-gallery-smp".as_ptr(),
        ..Default::default()
    });
}

/// Raw view / sampler ids for the gallery (egui_layer binds them for the
/// BODY_TEX user texture).
pub fn body_gallery_view_id() -> u32 {
    R.with(|cell| cell.borrow().gallery_view.id)
}
pub fn body_gallery_sampler_id() -> u32 {
    R.with(|cell| cell.borrow().gallery_smp.id)
}

/// UV rect (u0, v0, u1, v1) of a body's thumbnail in the gallery atlas.
pub fn body_gallery_uv(id: BodyId) -> (f32, f32, f32, f32) {
    let i = BodyId::ALL.iter().position(|&b| b == id).unwrap_or(0) as i32;
    let cx = (i % GALLERY_COLS) as f32;
    let cy = (i / GALLERY_COLS) as f32;
    (
        cx / GALLERY_COLS as f32,
        cy / GALLERY_ROWS as f32,
        (cx + 1.0) / GALLERY_COLS as f32,
        (cy + 1.0) / GALLERY_ROWS as f32,
    )
}

/// Pure half of `build_distant_textures_for_body()`: the equirect
/// albedo (RGB = biome colour, A = water mask) + normal (RG = packed
/// tangent slope) pixel grids. Returns (albedo, normal), each
/// DISTANT_TEX_W x DISTANT_TEX_H RGBA8.
fn build_distant_texture_pixels(
    bcfg: &BodyConfig,
    fallback: Vec3,
    col_avg: &[Vec3; ATLAS_TILES],
) -> (Vec<u8>, Vec<u8>) {
    let w = DISTANT_TEX_W;
    let h = DISTANT_TEX_H;

    /* Single altitude grid - albedo reads it per pixel, the normal map
     * a second time via central differences, so the ~12 noise octaves
     * per direction are only evaluated once. */
    let mut alt = vec![0.0f32; (w * h) as usize];
    for py in 0..h {
        for px in 0..w {
            let dir = distant_pixel_to_dir(px, py);
            let mut surface_m = planet_gen::surface_altitude(bcfg, dir);
            if bcfg.barren {
                surface_m *= 0.3;
            }
            alt[(py * w + px) as usize] = surface_m;
        }
    }

    let mut albedo = vec![0u8; (w * h * 4) as usize];
    let mut normal = vec![0u8; (w * h * 4) as usize];
    for py in 0..h {
        for px in 0..w {
            let dir = distant_pixel_to_dir(px, py);
            let surface_m = alt[(py * w + px) as usize];
            let (rgb, water_a) = sample_planet_lod_color(bcfg, fallback, dir, surface_m, col_avg);
            /* Quantise to 8-bit; clamp covers height-shade x tint
             * pushing a channel just over 1.0. */
            let r = rgb.x.clamp(0.0, 1.0);
            let g = rgb.y.clamp(0.0, 1.0);
            let b = rgb.z.clamp(0.0, 1.0);
            let a = water_a;
            let idx = ((py * w + px) * 4) as usize;
            albedo[idx] = (r * 255.0 + 0.5) as u8;
            albedo[idx + 1] = (g * 255.0 + 0.5) as u8;
            albedo[idx + 2] = (b * 255.0 + 0.5) as u8;
            albedo[idx + 3] = (a * 255.0 + 0.5) as u8;

            /* Normal map via central differences across the altitude
             * grid. U wraps (longitude), V clamps (latitude). */
            let px_l = if px == 0 { w - 1 } else { px - 1 };
            let px_r = if px == w - 1 { 0 } else { px + 1 };
            let py_d = if py == 0 { 0 } else { py - 1 };
            let py_u = if py == h - 1 { h - 1 } else { py + 1 };
            let h_l = alt[(py * w + px_l) as usize];
            let h_r = alt[(py * w + px_r) as usize];
            let h_d = alt[(py_d * w + px) as usize];
            let h_u = alt[(py_u * w + px) as usize];
            let mut dx = (h_r - h_l) * 0.5 * DISTANT_NORMAL_SLOPE_SCALE;
            let mut dy = (h_u - h_d) * 0.5 * DISTANT_NORMAL_SLOPE_SCALE;
            if dx < -1.0 {
                dx = -1.0;
            }
            if dx > 1.0 {
                dx = 1.0;
            }
            if dy < -1.0 {
                dy = -1.0;
            }
            if dy > 1.0 {
                dy = 1.0;
            }
            normal[idx] = ((dx * 0.5 + 0.5) * 255.0 + 0.5) as u8;
            normal[idx + 1] = ((dy * 0.5 + 0.5) * 255.0 + 0.5) as u8;
            normal[idx + 2] = 255;
            normal[idx + 3] = 255;
        }
    }
    (albedo, normal)
}

/// Pure half of `build_distant_mesh_for_body()`: unit icosphere
/// subdivided `levels` times; vertices packed as pos(3) + radial
/// normal(3). Returns (interleaved f32 vertex data, u32 indices).
fn build_distant_mesh(levels: i32) -> (Vec<f32>, Vec<u32>) {
    /* Base unit icosahedron - same constants as goldberg's seed mesh. */
    let tau = (1.0 + 5.0f64.sqrt()) / 2.0;
    let inv = 1.0 / (1.0 + tau * tau).sqrt();
    let n = inv as f32;
    let t = (tau * inv) as f32;
    const BASE_TRIS: [[u32; 3]; 20] = [
        [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
        [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
        [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
        [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
    ];
    let mut verts: Vec<[f32; 3]> = vec![
        [-n, t, 0.0], [n, t, 0.0], [-n, -t, 0.0], [n, -t, 0.0],
        [0.0, -n, t], [0.0, n, t], [0.0, -n, -t], [0.0, n, -t],
        [t, 0.0, -n], [t, 0.0, n], [-t, 0.0, -n], [-t, 0.0, n],
    ];
    let mut tris: Vec<[u32; 3]> = BASE_TRIS.to_vec();

    /* Subdivide: each pass splits every tri into 4 by inserting edge
     * midpoints (deduped via the edge cache so adjacent tris share the
     * new vertex). */
    for _ in 0..levels {
        let mut edges: Vec<(u32, u32, u32)> = Vec::new();
        let mut new_tris: Vec<[u32; 3]> = Vec::with_capacity(tris.len() * 4);
        for tri in &tris {
            let (a, b, c) = (tri[0], tri[1], tri[2]);
            let mab = midpoint_lookup(&mut edges, &mut verts, a, b);
            let mbc = midpoint_lookup(&mut edges, &mut verts, b, c);
            let mca = midpoint_lookup(&mut edges, &mut verts, c, a);
            new_tris.push([a, mab, mca]);
            new_tris.push([b, mbc, mab]);
            new_tris.push([c, mca, mbc]);
            new_tris.push([mab, mbc, mca]);
        }
        tris = new_tris;
    }

    /* Pack: pos (3) + normal (3, radial). Per-pixel colour comes from
     * the distant LOD texture sampled in the fragment shader. */
    let mut vbuf = Vec::with_capacity(verts.len() * 6);
    for p in &verts {
        vbuf.extend_from_slice(&[p[0], p[1], p[2], p[0], p[1], p[2]]);
    }
    let mut ibuf = Vec::with_capacity(tris.len() * 3);
    for tri in &tris {
        ibuf.extend_from_slice(tri);
    }
    (vbuf, ibuf)
}

/// Port of `body_distant_color()` - fallback colour when the terrain
/// colour sample misses.
fn body_distant_color(b: &BodyConfig) -> Vec3 {
    match b.tileset {
        Tileset::Sequoia => Vec3 { x: 0.35, y: 0.70, z: 0.25 },
        Tileset::Crag => Vec3 { x: 0.70, y: 0.30, z: 0.18 },
        Tileset::Frost => Vec3 { x: 0.55, y: 0.75, z: 0.95 },
        Tileset::Asteroid => Vec3 { x: 0.35, y: 0.32, z: 0.30 },
        _ => {
            if b.icy {
                Vec3 { x: 0.80, y: 0.90, z: 1.00 }
            } else if b.barren {
                Vec3 { x: 0.55, y: 0.55, z: 0.55 }
            } else {
                Vec3 { x: 0.30, y: 0.45, z: 0.60 }
            }
        }
    }
}

/* ----------------------------------------------------------------------- */
/* Smooth UV sphere - used by the sun (front-face emissive). */

const UVSPHERE_LON: i32 = 32;
const UVSPHERE_LAT: i32 = 16;

/// Pure half of the uvsphere build in `renderer_init()`: 32 lon x 16
/// lat position-only sphere. Returns (positions, indices).
fn build_uvsphere_mesh() -> (Vec<f32>, Vec<u32>) {
    let lon = UVSPHERE_LON;
    let lat = UVSPHERE_LAT;
    let vcount = ((lat + 1) * (lon + 1)) as usize;
    let icount = (lat * lon * 6) as usize;
    let mut sv = Vec::with_capacity(vcount * 3);
    for y in 0..=lat {
        let v = y as f32 / lat as f32;
        let phi = v * 3.14159265f32;
        let (sp, cp) = (phi.sin(), phi.cos());
        for x in 0..=lon {
            let u = x as f32 / lon as f32;
            let th = u * 6.2831853f32;
            let (st, ct) = (th.sin(), th.cos());
            sv.push(sp * ct);
            sv.push(cp);
            sv.push(sp * st);
        }
    }
    let mut si = Vec::with_capacity(icount);
    for y in 0..lat {
        for x in 0..lon {
            let a = (y * (lon + 1) + x) as u32;
            let b = a + (lon + 1) as u32;
            si.extend_from_slice(&[a, b, a + 1, a + 1, b, b + 1]);
        }
    }
    (sv, si)
}

/* ----------------------------------------------------------------------- */
/* Frustum culling - Gribb/Hartmann plane extraction. */

/// Port of `frustum_plane_t`. ax + by + cz + d >= 0 for "inside".
#[derive(Clone, Copy, Debug, Default)]
struct FrustumPlane {
    a: f32,
    b: f32,
    c: f32,
    d: f32,
}

fn extract_frustum(vp: Mat4) -> [FrustumPlane; 6] {
    let m = &vp.m;
    let mut p = [
        /* Left:   row3 + row0 */
        FrustumPlane { a: m[3] + m[0], b: m[7] + m[4], c: m[11] + m[8], d: m[15] + m[12] },
        /* Right:  row3 - row0 */
        FrustumPlane { a: m[3] - m[0], b: m[7] - m[4], c: m[11] - m[8], d: m[15] - m[12] },
        /* Bottom: row3 + row1 */
        FrustumPlane { a: m[3] + m[1], b: m[7] + m[5], c: m[11] + m[9], d: m[15] + m[13] },
        /* Top:    row3 - row1 */
        FrustumPlane { a: m[3] - m[1], b: m[7] - m[5], c: m[11] - m[9], d: m[15] - m[13] },
        /* Near:   row3 + row2 */
        FrustumPlane { a: m[3] + m[2], b: m[7] + m[6], c: m[11] + m[10], d: m[15] + m[14] },
        /* Far:    row3 - row2 */
        FrustumPlane { a: m[3] - m[2], b: m[7] - m[6], c: m[11] - m[10], d: m[15] - m[14] },
    ];
    /* Normalise so radius comparison is in world units. */
    for pl in &mut p {
        let inv = 1.0f32 / (pl.a * pl.a + pl.b * pl.b + pl.c * pl.c).sqrt();
        pl.a *= inv;
        pl.b *= inv;
        pl.c *= inv;
        pl.d *= inv;
    }
    p
}

fn sphere_visible(p: &[FrustumPlane; 6], c: Vec3, r: f32) -> bool {
    for pl in p {
        let dist = pl.a * c.x + pl.b * c.y + pl.c * c.z + pl.d;
        if dist < -r {
            return false;
        }
    }
    true
}

/// Uniform mat4 scale (model X/Y/Z by s).
fn mat4_scale_uniform(s: f32) -> Mat4 {
    let mut m = mat4_identity();
    m.m[0] = s;
    m.m[5] = s;
    m.m[10] = s;
    m
}

/// Sun model-view-projection: vp * translate(sun_pos) * scale(radius).
/// Pure so tests can pin it against gfx_math.
fn sun_mvp(view: Mat4, proj: Mat4, sun_pos: Vec3, sun_radius: f32) -> Mat4 {
    let vp = mat4_mul(proj, view);
    let scale = mat4_scale_uniform(sun_radius);
    let trans = mat4_translate(sun_pos);
    let model = mat4_mul(trans, scale);
    mat4_mul(vp, model)
}

/// Far-shell compression - the "log-z protocol" for celestials. The sun
/// sits 150 km out and the outer planets to 200+ km, far past the 20 km
/// zfar, so drawn at their true positions the far plane slices them (the
/// crescent-cut sun). Anything beyond the shell start slides along its
/// own eye ray onto a compressed band inside zfar, scaled by the same
/// factor so its APPARENT size is exactly unchanged; the map is
/// monotonic in distance, so mutual occlusion order among compressed
/// bodies is preserved. Angular positions are exact - only depth is
/// squeezed, which is what a far plane can't see.
fn far_shell(eye: Vec3, pos: Vec3, radius: f32) -> (Vec3, f32) {
    /// Compression kicks in here (inside zfar with margin)...
    const START_M: f32 = 14000.0;
    /// ...and asymptotes at START + SPAN (well inside zfar 20 km).
    const SPAN_M: f32 = 4500.0;
    let d = vec3_length(vec3_sub(pos, eye));
    if d <= START_M {
        return (pos, radius);
    }
    let dp = START_M + SPAN_M * (1.0 - START_M / d);
    let s = dp / d;
    (
        Vec3 {
            x: eye.x + (pos.x - eye.x) * s,
            y: eye.y + (pos.y - eye.y) * s,
            z: eye.z + (pos.z - eye.z) * s,
        },
        radius * s,
    )
}

/* ----------------------------------------------------------------------- */
/* Chunk assignment - chunk_n() well-spread sphere anchors (Fibonacci
 * lattice). Tile -> chunk mapping is "nearest anchor by dot product". */

/// Port of `build_chunk_anchors()` + the CHUNK_ANCHORS static. Built
/// once on first use.
fn chunk_anchors() -> &'static [DVec3] {
    static ANCHORS: std::sync::OnceLock<Vec<DVec3>> = std::sync::OnceLock::new();
    ANCHORS.get_or_init(|| {
        /* Fibonacci lattice: a near-uniform spread of N points on the
         * unit sphere for any N (the old set was fixed at 32 =
         * icosahedron verts + face centres). Tile->chunk assignment is
         * nearest-anchor, so an even spread keeps each chunk's tile
         * count roughly balanced. */
        let n = chunk_n();
        let golden = std::f64::consts::PI * (3.0 - 5.0f64.sqrt()); /* golden angle */
        (0..n)
            .map(|i| {
                let y = 1.0 - 2.0 * (i as f64 + 0.5) / n as f64; /* -1..1 */
                let r = (1.0 - y * y).max(0.0).sqrt();
                let th = golden * i as f64;
                DVec3 { x: th.cos() * r, y, z: th.sin() * r }
            })
            .collect()
    })
}

/// Port of `classify_tile()`. Largest dot product = closest anchor on
/// the unit sphere (first-best wins on ties, like the C's strict >).
fn classify_tile(center: DVec3) -> i32 {
    let anchors = chunk_anchors();
    let mut best = -1e30f64;
    let mut best_i = 0i32;
    for (i, a) in anchors.iter().enumerate() {
        let d = dvec3_dot(center, *a);
        if d > best {
            best = d;
            best_i = i as i32;
        }
    }
    best_i
}

/* ----------------------------------------------------------------------- */
/* Per-frame chunk-level backface cull. See renderer.c for the
 * horizon-angle derivation. */

/// Port of `chunk_cull_t`.
#[derive(Clone, Copy, Debug)]
struct ChunkCull {
    cux: f64,
    cuy: f64,
    cuz: f64, /* body-local camera direction (unit) */
    cull_cos: f64, /* anchor . cam_dir < this -> cull   */
}

/// Port of `compute_chunk_cull()`.
fn compute_chunk_cull(world_pos: Vec3, radius_m: f32, camera_world: Vec3) -> ChunkCull {
    let cx = (camera_world.x - world_pos.x) as f64;
    let cy = (camera_world.y - world_pos.y) as f64;
    let cz = (camera_world.z - world_pos.z) as f64;
    let cd = (cx * cx + cy * cy + cz * cz).sqrt();
    if cd < 1e-9 {
        /* Camera exactly at body centre - pathological. Don't cull. */
        return ChunkCull { cux: 1.0, cuy: 0.0, cuz: 0.0, cull_cos: -2.0 };
    }
    let cux = cx / cd;
    let cuy = cy / cd;
    let cuz = cz / cd;
    let cos_h = if cd > radius_m as f64 { radius_m as f64 / cd } else { 0.0 };
    let theta_h = cos_h.acos();
    /* Per-chunk angular padding, derived from the live chunk count so
     * it auto-scales with granularity: each of N evenly-spread anchors
     * owns a spherical cap of solid angle 4*pi/N, i.e. half-angle
     * acos(1 - 2/N). Voronoi boundaries reach slightly past the bare
     * cap, so pad by mesh_cull_pad_factor to keep horizon-straddling
     * chunks visible. (At N=32 the default factor 1.55 reproduces the
     * historical ~0.55 rad / ~31 degrees.) */
    let nchunks = chunk_n();
    let cap_half = (1.0 - 2.0 / nchunks as f64).acos();
    let theta_chunk = config::lod().mesh_cull_pad_factor as f64 * cap_half;
    /* Clamp the kept half-angle to pi. Past pi the cos() is no longer
     * monotonic, so without this a coarse chunk count (large cap_half)
     * would start spuriously culling; pinning at pi gives cull_cos =
     * -1, i.e. "keep everything", which is the correct coarse-grid
     * limit. */
    let mut keep = theta_h + theta_chunk;
    if keep > std::f64::consts::PI {
        keep = std::f64::consts::PI;
    }
    ChunkCull { cux, cuy, cuz, cull_cos: keep.cos() }
}

/// Port of `chunk_visible()`.
#[inline]
fn chunk_visible(cc: &ChunkCull, ci: usize) -> bool {
    let a = chunk_anchors()[ci];
    let dot = a.x * cc.cux + a.y * cc.cuy + a.z * cc.cuz;
    dot >= cc.cull_cos
}

/* ----------------------------------------------------------------------- */
/* Camera basis + skybox uniform computation (pure). */

/// Camera basis columns + projection factors extracted from view /
/// proj matrices, shared by the skybox, atmosphere and composite
/// passes (same math at all three call sites in the C).
#[derive(Clone, Copy, Debug)]
struct CameraBasis {
    right: [f32; 3],
    up: [f32; 3],
    fwd: [f32; 3],
    tan_half: f32,
    aspect: f32,
}

/// Rotate a camera basis about the world +Y axis by `angle` radians.
/// Used to spin the starfield sampling frame with the planet's rotation.
fn spin_basis_y(b: &CameraBasis, angle: f32) -> CameraBasis {
    let (s, c) = angle.sin_cos();
    let roty = |v: [f32; 3]| [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c];
    CameraBasis {
        right: roty(b.right),
        up: roty(b.up),
        fwd: roty(b.fwd),
        tan_half: b.tan_half,
        aspect: b.aspect,
    }
}

fn camera_basis(view: Mat4, proj: Mat4) -> CameraBasis {
    /* proj.m[5] = 1/tan(fovY/2); proj.m[0] = m[5]/aspect. */
    let inv_tan_half = proj.m[5];
    let tan_half = if inv_tan_half != 0.0 { 1.0 / inv_tan_half } else { 1.0 };
    let aspect = if proj.m[0] != 0.0 { inv_tan_half / proj.m[0] } else { 1.0 };
    FRAME_ASPECT.with(|c| c.set(aspect as f32));
    CameraBasis {
        right: [view.m[0], view.m[4], view.m[8]],
        up: [view.m[1], view.m[5], view.m[9]],
        fwd: [-view.m[2], -view.m[6], -view.m[10]],
        tan_half,
        aspect,
    }
}

/// Starfield brightness multiplier so daytime stars fade as the camera
/// dives into the atmosphere. Density at camera altitude is the proxy
/// for "air between camera and space".
fn starfield_bg_atten(env: &RenderEnv) -> f32 {
    let mut bg_atten = 1.0f32;
    if env.atmo_strength > 0.001 && env.atmo_radius > env.atmo_lower_radius {
        let rg = if env.atmo_lower_radius > 0.0 {
            env.atmo_lower_radius
        } else {
            env.atmo_planet_radius
        };
        let thickness = env.atmo_radius - rg;
        let cam_local = vec3_sub(env.camera_world, env.atmo_planet_center);
        let cam_r = vec3_length(cam_local);
        let h_norm = (cam_r - rg) / thickness;
        let clamped = h_norm.clamp(0.0, 1.0);
        let scale_h = if env.atmo_scale_height > 0.0 { env.atmo_scale_height } else { 0.25 };
        let dens_cam = (-clamped / scale_h).exp();
        bg_atten = 1.0 - dens_cam;
        if bg_atten < 0.05 {
            bg_atten = 0.05; /* never absolute black */
        }
        if bg_atten > 1.0 {
            bg_atten = 1.0;
        }
    }
    bg_atten
}

/// Build the starfield uniform block from config + camera basis.
fn build_starfield_params(
    sky: &config::SkyboxConfig,
    basis: &CameraBasis,
    time_seconds: f32,
    bg_atten: f32,
) -> shaders::starfield::StarfieldParams {
    shaders::starfield::StarfieldParams {
        u_cam_right: basis.right,
        _pad_12: [0; 4],
        u_cam_up: basis.up,
        _pad_28: [0; 4],
        u_cam_fwd: basis.fwd,
        _pad_44: [0; 4],
        u_sky_params: [basis.tan_half, basis.aspect, time_seconds, bg_atten],
        u_star_densities: [
            sky.star_densities.x,
            sky.star_densities.y,
            sky.star_densities.z,
            sky.star_sharpness,
        ],
        u_star_intensities: [
            sky.star_intensities.x,
            sky.star_intensities.y,
            sky.star_intensities.z,
            sky.star_brightness_threshold,
        ],
        u_star_color: [sky.star_color.x, sky.star_color.y, sky.star_color.z],
        _pad_108: [0; 4],
        u_nebula_warm: [
            sky.nebula_warm_color.x,
            sky.nebula_warm_color.y,
            sky.nebula_warm_color.z,
        ],
        _pad_124: [0; 4],
        u_nebula_cool: [
            sky.nebula_cool_color.x,
            sky.nebula_cool_color.y,
            sky.nebula_cool_color.z,
        ],
        _pad_140: [0; 4],
        u_nebula_params: [
            sky.nebula_intensity,
            sky.nebula_drift_speed,
            sky.nebula_scale1,
            sky.nebula_scale2,
        ],
        u_nebula_smoothstep: [
            sky.nebula_cloud_lo,
            sky.nebula_cloud_hi,
            sky.nebula_warm_blend_lo,
            sky.nebula_warm_blend_hi,
        ],
        u_space_color: [sky.space_color.x, sky.space_color.y, sky.space_color.z],
        _pad_188: [0; 4],
    }
}

/// Build both atmosphere uniform blocks. Camera position is passed in
/// PLANET-LOCAL space (the shader's ray-sphere intersect assumes the
/// planet sits at origin).
fn build_atmosphere_params(
    env: &RenderEnv,
    basis: &CameraBasis,
) -> (
    shaders::atmosphere::AtmosphereVsParams,
    shaders::atmosphere::AtmosphereFsParams,
) {
    let cam_local = vec3_sub(env.camera_world, env.atmo_planet_center);
    let avp = shaders::atmosphere::AtmosphereVsParams {
        cam_right: [basis.right[0], basis.right[1], basis.right[2], basis.tan_half],
        cam_up: [basis.up[0], basis.up[1], basis.up[2], basis.aspect],
        cam_forward: [basis.fwd[0], basis.fwd[1], basis.fwd[2], 0.0],
        camera_pos: [cam_local.x, cam_local.y, cam_local.z, 0.0],
    };
    /* Overcast greys + darkens the SKY DOME, the same way overcast_ambient /
     * overcast_sun_tint dim the terrain. Without this the ground darkened
     * under a storm while the sky stayed clear blue - the "weather slider
     * doesn't update the sky" bug. No new uniform: modulate the three
     * scattering coefficients the shader already reads. Cut rayleigh so the
     * blue fades toward neutral, lift mie so the dome hazes to a flat grey
     * sheet, and dim the sun-scatter so it darkens. All three amounts are
     * weather.yaml knobs. Reads the previous frame's overcast (set later in
     * the frame) - a harmless 1-frame lag on a slowly-changing value. */
    let oc = FRAME_OVERCAST.with(|c| c.get()).clamp(0.0, 1.0);
    let wc = tenebris_core::weather::config();
    let ray = env.atmo_rayleigh_scale * (1.0 - oc * wc.overcast_sky_blue_cut);
    let mie = env.atmo_mie_scale * (1.0 + oc * wc.overcast_sky_haze);
    let sun_i = env.atmo_sun_intensity * (1.0 - oc * wc.overcast_sky_dim);
    let afp = shaders::atmosphere::AtmosphereFsParams {
        sun_direction: [env.sun_dir.x, env.sun_dir.y, env.sun_dir.z, 0.0],
        radii: [
            env.atmo_planet_radius,
            env.atmo_radius,
            if env.atmo_scale_height > 0.0 { env.atmo_scale_height } else { 0.25 },
            0.0,
        ],
        scatter_coeffs: [ray, mie, env.atmo_mie_g, sun_i],
    };
    (avp, afp)
}

/* ----------------------------------------------------------------------- */
/* CPU Caelum sample - one-ray port of the atmosphere shader's
 * GPU Gems 2 scattering march, used to colour the distance fog with
 * the ACTUAL sky at the horizon (same params, same sunset warmth,
 * same tone map), so fog and sky can never disagree. One 8x4-sample
 * march per frame is noise on the CPU budget. */

fn horizon_sky_color(env: &RenderEnv, cam_fwd: [f32; 3]) -> [f32; 3] {
    const NUM_SAMPLES: usize = 8;
    const NUM_LIGHT_SAMPLES: usize = 4;
    const WAVELENGTHS_INV4: [f32; 3] = [5.602, 9.473, 19.644];

    type V3 = [f32; 3];
    fn dot(a: V3, b: V3) -> f32 {
        a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
    }
    fn add(a: V3, b: V3) -> V3 {
        [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
    }
    fn scale(a: V3, s: f32) -> V3 {
        [a[0] * s, a[1] * s, a[2] * s]
    }
    fn norm(a: V3) -> V3 {
        let l = dot(a, a).sqrt().max(1e-6);
        scale(a, 1.0 / l)
    }
    /* raySphereIntersect, planet at origin. */
    fn hit(ro: V3, rd: V3, radius: f32) -> (f32, f32) {
        let b = dot(ro, rd);
        let c = dot(ro, ro) - radius * radius;
        let disc = b * b - c;
        if disc < 0.0 {
            return (-1.0, -1.0);
        }
        let s = disc.sqrt();
        (-b - s, -b + s)
    }

    let p_radius = env.atmo_planet_radius;
    let a_radius = env.atmo_radius;
    let scale_h = if env.atmo_scale_height > 0.0 { env.atmo_scale_height } else { 0.25 };
    let thickness = (a_radius - p_radius).max(1e-3);
    let density = |alt: f32| (-(alt.clamp(0.0, 1.0)) / scale_h).exp();
    let optical_depth = |ro: V3, rd: V3, len: f32| -> f32 {
        let step = len / NUM_LIGHT_SAMPLES as f32;
        let nstep = step / thickness;
        let mut d = 0.0;
        for i in 0..NUM_LIGHT_SAMPLES {
            let sp = add(ro, scale(rd, step * (i as f32 + 0.5)));
            let alt = (dot(sp, sp).sqrt() - p_radius) / thickness;
            d += density(alt) * nstep;
        }
        d
    };

    let cam = vec3_sub(env.camera_world, env.atmo_planet_center);
    let ro: V3 = [cam.x, cam.y, cam.z];
    let up = norm(ro);
    /* Horizon ray along the camera's forward azimuth: the fog matches
     * the slice of sky it actually fades into (warm toward the sun,
     * cool away from it), tracking as the player turns. */
    let fwd_flat = add(cam_fwd, scale(up, -dot(cam_fwd, up)));
    let rd = if dot(fwd_flat, fwd_flat) > 1e-6 {
        norm(fwd_flat)
    } else {
        /* Looking straight up/down: any tangent will do. */
        let r = if up[1].abs() < 0.9 { [0.0, 1.0, 0.0] } else { [1.0, 0.0, 0.0] };
        norm([
            up[1] * r[2] - up[2] * r[1],
            up[2] * r[0] - up[0] * r[2],
            up[0] * r[1] - up[1] * r[0],
        ])
    };
    let sun: V3 = [env.sun_dir.x, env.sun_dir.y, env.sun_dir.z];

    let (a0, a1) = hit(ro, rd, a_radius);
    if a1 < 0.0 {
        return [0.0, 0.0, 0.0];
    }
    let ray_start = a0.max(0.0);
    let mut ray_end = a1;
    let (p0, _) = hit(ro, rd, p_radius);
    if p0 > 0.0 {
        ray_end = ray_end.min(p0);
    }
    if ray_start >= ray_end {
        return [0.0, 0.0, 0.0];
    }

    let step = (ray_end - ray_start) / NUM_SAMPLES as f32;
    let nstep = step / thickness;
    let mut rayleigh_sum: V3 = [0.0; 3];
    let mut mie_sum: V3 = [0.0; 3];
    let mut opt_r = 0.0f32;
    let mut opt_m = 0.0f32;
    for i in 0..NUM_SAMPLES {
        /* Shader dithers in [0, 0.5); the fixed midpoint matches its
         * average and keeps the fog colour temporally stable. */
        let sp = add(ro, scale(rd, ray_start + step * (i as f32 + 0.25)));
        let h = dot(sp, sp).sqrt();
        if h < p_radius {
            continue;
        }
        let local_density = density((h - p_radius) / thickness);
        let seg = local_density * nstep;
        opt_r += seg;
        opt_m += seg;
        let (sp0, _) = hit(sp, sun, p_radius);
        if sp0 > 0.0 {
            continue; /* in the planet's shadow */
        }
        let (_, sa1) = hit(sp, sun, a_radius);
        let sun_depth = optical_depth(sp, sun, sa1.max(0.0));
        let att = [
            (-(env.atmo_rayleigh_scale * WAVELENGTHS_INV4[0] * (opt_r + sun_depth)
                + env.atmo_mie_scale * (opt_m + sun_depth)))
                .exp(),
            (-(env.atmo_rayleigh_scale * WAVELENGTHS_INV4[1] * (opt_r + sun_depth)
                + env.atmo_mie_scale * (opt_m + sun_depth)))
                .exp(),
            (-(env.atmo_rayleigh_scale * WAVELENGTHS_INV4[2] * (opt_r + sun_depth)
                + env.atmo_mie_scale * (opt_m + sun_depth)))
                .exp(),
        ];
        rayleigh_sum = add(rayleigh_sum, scale(att, local_density * nstep));
        mie_sum = add(mie_sum, scale(att, local_density * nstep));
    }
    rayleigh_sum = [
        rayleigh_sum[0] * env.atmo_rayleigh_scale * WAVELENGTHS_INV4[0],
        rayleigh_sum[1] * env.atmo_rayleigh_scale * WAVELENGTHS_INV4[1],
        rayleigh_sum[2] * env.atmo_rayleigh_scale * WAVELENGTHS_INV4[2],
    ];
    mie_sum = scale(mie_sum, env.atmo_mie_scale);

    let cos_theta = dot(rd, sun);
    let phase_r = 0.75 * (1.0 + cos_theta * cos_theta);
    let g = env.atmo_mie_g;
    let g2 = g * g;
    let phase_m =
        (1.0 - g2) / (4.0 * std::f32::consts::PI * (1.0 + g2 - 2.0 * g * cos_theta).max(1e-4).powf(1.5));

    let mut color = [
        env.atmo_sun_intensity * (rayleigh_sum[0] * phase_r + mie_sum[0] * phase_m),
        env.atmo_sun_intensity * (rayleigh_sum[1] * phase_r + mie_sum[1] * phase_m),
        env.atmo_sun_intensity * (rayleigh_sum[2] * phase_r + mie_sum[2] * phase_m),
    ];

    /* Analytic sunset warmth - same block as the shader. */
    {
        let sun_height = dot(sun, up);
        let sunset = {
            /* smoothstep(0.18, 0.0, sun_height) - warmth builds as the
             * sun approaches the horizon... */
            let t = ((sun_height - 0.18) / (0.0 - 0.18)).clamp(0.0, 1.0);
            t * t * (3.0 - 2.0 * t)
        } * {
            /* ...peaks through dusk / dawn (sun just below the horizon
             * - the scattering integral alone goes BLUE there, which
             * read wrong), and smoothstep(-0.28, -0.12) closes it out
             * to genuine dark once the sun is well down. */
            let t = ((sun_height + 0.32) / (-0.10 + 0.32)).clamp(0.0, 1.0);
            t * t * (3.0 - 2.0 * t)
        };
        let view_sun = cos_theta.max(0.0);
        let tint = [1.3f32, 1.0, 0.6];
        for k in 0..3 {
            color[k] *= 1.0 + (tint[k] - 1.0) * sunset * 0.85;
        }
        let glow = view_sun.powi(3) * sunset;
        let glow_c = [1.0f32, 0.65, 0.25];
        /* Horizon-band term: rd is tangent, so 1-|dot(rd,up)| = 1.
         * Strengths match the atmosphere shader (0.22 / 0.11 - boosted
         * so dusk / dawn reads orange-red, not residual blue). */
        let horizon_c = [0.8f32, 0.4, 0.15];
        for k in 0..3 {
            color[k] += glow_c[k] * glow * env.atmo_sun_intensity * 0.22
                + horizon_c[k] * sunset * env.atmo_sun_intensity * 0.11;
        }
    }

    [
        1.0 - (-color[0]).exp(),
        1.0 - (-color[1]).exp(),
        1.0 - (-color[2]).exp(),
    ]
}

/* ----------------------------------------------------------------------- */
/* Scheduling decisions (pure). */

/// The chunked-vs-LOD rule shared by renderer_draw_world (direct) and
/// renderer_draw_moons / renderer_draw_water (inverted / mirrored):
/// only the ACTIVE body draws chunked terrain, and only within the
/// 5 km hard cutoff. Everything else is far-LOD.
#[inline]
fn body_draws_chunked(is_active: bool, dist: f32) -> bool {
    is_active && dist <= MAX_DETAIL_DIST_M
}

/// Hysteresis on the detail UNLOAD: once a body is meshed it keeps its
/// chunks until the LOD anchor has stayed beyond `cutoff * factor` for the
/// debounce time. Reloading detail is a multi-second full remesh of the
/// whole body (163k tiles observed at 2.7 s), so the 5 km boundary must
/// never flap it - crossing back inside at any point cancels the timer.
const DETAIL_UNLOAD_FACTOR: f32 = 1.5;
const DETAIL_UNLOAD_DEBOUNCE_S: f32 = 3.0;

thread_local! {
    /// The point LOD load/unload decisions measure from: the PLAYER, set
    /// by the app each frame. The camera is the wrong anchor - the rocket
    /// chase-cam zooms out to 20 km for the map view, and using its eye
    /// unloaded + reloaded the planet's entire detail mesh on every zoom
    /// across the 5 km cutoff (the reported 2.7 s stalls). None falls back
    /// to the camera (boot frames before the first set).
    static LOD_ANCHOR: Cell<Option<Vec3>> = const { Cell::new(None) };
}

/// Publish this frame's LOD anchor (player world position).
pub fn set_lod_anchor(p: Vec3) {
    LOD_ANCHOR.with(|c| c.set(Some(p)));
}

/// The wall-clock remesh budget gate from renderer_draw_world: rebuild
/// the next dirty chunk when nothing has been rebuilt yet (so progress
/// is guaranteed no matter how small the budget) or when the budget
/// hasn't been spent. Mirrors the C's `chunks_rebuilt >= 1 &&
/// elapsed >= budget_ms -> break` inverted.
fn remesh_budget_allows(chunks_rebuilt: i32, elapsed_ms: f64, budget_ms: f64) -> bool {
    chunks_rebuilt < 1 || elapsed_ms < budget_ms
}

/// Port of the regrow_buffer() capacity walk: double until it fits.
fn grow_capacity(mut cap: i32, needed: i32) -> i32 {
    while cap < needed {
        cap *= 2;
    }
    cap
}

/* ----------------------------------------------------------------------- */
/* sokol time seam - the relight tracker measures wall-clock cost in
 * production; headless tests get a null clock (no stm_setup). */

#[cfg(not(test))]
fn now_ticks() -> u64 {
    sokol::time::now()
}
#[cfg(test)]
fn now_ticks() -> u64 {
    0
}

#[cfg(not(test))]
fn ticks_ms(diff: u64) -> f64 {
    sokol::time::ms(diff)
}
#[cfg(test)]
fn ticks_ms(_diff: u64) -> f64 {
    0.0
}

fn ticks_diff(new: u64, old: u64) -> u64 {
    new.wrapping_sub(old)
}

/* ----------------------------------------------------------------------- */
/* Module state. */

/// Port of `mesh_chunk_t`. Each chunk owns its own GPU buffer pair so
/// a dirty chunk can be re-uploaded in isolation. The *_capacity
/// fields track the CURRENT GPU buffer sizes (element slots) so we can
/// detect when the CPU mesh has outgrown them. (CPU-side mesh
/// capacities live inside the HexMesh Vecs - hex_mesher's reserve()
/// keeps the C doubling policy.)
struct MeshChunk {
    vbuf: sg::Buffer,
    ibuf: sg::Buffer,
    water_vbuf: sg::Buffer,
    water_ibuf: sg::Buffer,
    vbuf_capacity: i32,       /* HexVertex slots */
    ibuf_capacity: i32,       /* u32 slots       */
    water_vbuf_capacity: i32,
    water_ibuf_capacity: i32,
    mesh: HexMesh,
    water_mesh: HexMesh,
    last_uploaded_index_count: i32,
    last_uploaded_water_idx_count: i32,
    dirty: bool,    /* tiles inside this chunk need rebuild   */
    streamed: bool, /* all owned tiles have been meshed once  */
}

impl Default for MeshChunk {
    fn default() -> Self {
        MeshChunk {
            vbuf: sg::Buffer::new(),
            ibuf: sg::Buffer::new(),
            water_vbuf: sg::Buffer::new(),
            water_ibuf: sg::Buffer::new(),
            vbuf_capacity: 0,
            ibuf_capacity: 0,
            water_vbuf_capacity: 0,
            water_ibuf_capacity: 0,
            mesh: HexMesh::new(),
            water_mesh: HexMesh::new(),
            last_uploaded_index_count: 0,
            last_uploaded_water_idx_count: 0,
            dirty: false,
            streamed: false,
        }
    }
}

/// Port of `chunked_body_t`. A whole celestial body; every body shares
/// the same chunk_n()-chunk layout (arrays sized to the compile-time
/// max). active = streams edits; inactive = far LOD until
/// demand-loaded on approach.
struct ChunkedBody {
    world: Rc<RefCell<World>>,
    chunks: [MeshChunk; RENDER_CHUNK_COUNT_MAX],
    tile_to_chunk: Vec<i32>, /* empty = the C's NULL (not allocated) */
    /* Per-chunk tile membership, built once in body_alloc_chunks. The
     * flat array holds every tile index grouped by chunk; off/cnt give
     * each chunk's slice. Lets body_chunk_rebuild_full iterate only
     * its own tiles instead of scanning all tile_count of them per
     * rebuild. (empty Vec = the C's NULL.) */
    chunk_tile_flat: Vec<i32>,
    chunk_tile_off: [i32; RENDER_CHUNK_COUNT_MAX],
    chunk_tile_cnt: [i32; RENDER_CHUNK_COUNT_MAX],
    mesh_cursor: i32,
    streamed_complete: bool,
    is_active: bool,
    has_water: bool,
    chunks_allocated: bool, /* GPU buffers exist              */
    meshed: bool,           /* chunks have content + uploaded */
    /// This frame's chunked-vs-LOD decision, computed ONCE in draw_world
    /// (anchor + hysteresis) and mirrored by draw_moons / draw_water so
    /// the three passes can never disagree mid-flap.
    chunked_now: bool,
    /// When the LOD anchor first went beyond the unload radius; -1 = it
    /// is inside. Drives the unload debounce.
    detail_out_since: f32,
    world_pos: Vec3,        /* model-translate origin (body centre) */
    radius_m: f32,
    distant_color: Vec3,
    distant_vbuf: sg::Buffer,
    distant_ibuf: sg::Buffer,
    distant_index_count: i32,
    distant_tex_albedo: sg::Image,
    distant_tex_normal: sg::Image,
    distant_view_albedo: sg::View,
    distant_view_normal: sg::View,
}

impl ChunkedBody {
    fn new(world: Rc<RefCell<World>>) -> ChunkedBody {
        ChunkedBody {
            world,
            chunks: std::array::from_fn(|_| MeshChunk::default()),
            tile_to_chunk: Vec::new(),
            chunk_tile_flat: Vec::new(),
            chunk_tile_off: [0; RENDER_CHUNK_COUNT_MAX],
            chunk_tile_cnt: [0; RENDER_CHUNK_COUNT_MAX],
            mesh_cursor: 0,
            streamed_complete: false,
            is_active: false,
            has_water: false,
            chunks_allocated: false,
            meshed: false,
            chunked_now: false,
            detail_out_since: -1.0,
            world_pos: Vec3::default(),
            radius_m: 0.0,
            distant_color: Vec3::default(),
            distant_vbuf: sg::Buffer::new(),
            distant_ibuf: sg::Buffer::new(),
            distant_index_count: 0,
            distant_tex_albedo: sg::Image::new(),
            distant_tex_normal: sg::Image::new(),
            distant_view_albedo: sg::View::new(),
            distant_view_normal: sg::View::new(),
        }
    }
}

/// Relight-session blocking-cost tracker (see renderer.c for the full
/// commentary). The C's write-only `world` pointer member is dropped.
#[derive(Default)]
struct RelightTrack {
    active: bool,
    started_at: u64,
    block_ms_total: f64,
    peak_call_ms: f64,
    frames: i32,
    peak_iters: i32,
    last_frame_iters: i32,
}

/// Port of the module-static `R`.
struct Renderer {
    pip_hex: sg::Pipeline,
    pip_water: sg::Pipeline,
    pip_water_mobile: sg::Pipeline,
    pip_composite: sg::Pipeline,
    pip_composite_mobile: sg::Pipeline,
    smp_offscreen: sg::Sampler,
    smp_offscreen_depth: sg::Sampler,
    pip_starfield: sg::Pipeline,
    pip_atmosphere: sg::Pipeline,
    fullscreen_tri_vbuf: sg::Buffer,
    pip_distant: sg::Pipeline,
    pip_sun: sg::Pipeline,
    /// Average RGB of each atlas column (bake_atlas time); the distant
    /// LOD samples it per pixel to roughly match the surface colour.
    atlas_col_avg: [Vec3; ATLAS_TILES],
    uvsphere_vbuf: sg::Buffer,
    uvsphere_ibuf: sg::Buffer,
    uvsphere_index_count: i32,
    atlas_img: sg::Image,
    atlas_view: sg::View,
    atlas_smp: sg::Sampler,

    /// Body-gallery atlas: one lit-sphere thumbnail per BodyId (the
    /// "screenshots" the solar-system map's picker shows). Baked once at
    /// init from the same colour sampling the distant LOD uses.
    gallery_img: sg::Image,
    gallery_view: sg::View,
    gallery_smp: sg::Sampler,

    water_normal_img: sg::Image,
    water_normal_view: sg::View,
    water_normal_smp: sg::Sampler,

    flow_arrow_img: sg::Image,
    flow_arrow_view: sg::View,
    flow_arrow_smp: sg::Sampler,
    flow_arrow_pip: sgl::Pipeline,

    /* Animal texture atlas (assets/textures/animals.png) - one 32x32
     * unwrap tile per AnimalKind, sampled by client::animals. */
    animal_tex_img: sg::Image,
    animal_tex_view: sg::View,
    animal_tex_smp: sg::Sampler,

    /* Rocket-part model textures (assets/textures/rocket_parts + the launch
     * tower), sampled by client::rocket_fx. Index: 0 engine, 1 fuel tank,
     * 2 command module, 3 launch tower. */
    rocket_tex_img: [sg::Image; 4],
    rocket_tex_view: [sg::View; 4],
    rocket_tex_smp: sg::Sampler,
    station_tex_img: [sg::Image; 15],
    station_tex_view: [sg::View; 15],

    /* Crop texture atlas (assets/textures/crops.png) - one 32x32 material
     * tile per column (bark / leaves / melon rind / fruit / ...), sampled
     * by client::crops so plant boxes are textured, not flat. */
    crop_tex_img: sg::Image,
    crop_tex_view: sg::View,
    crop_tex_smp: sg::Sampler,

    distant_lod_smp: sg::Sampler,

    /* Offscreen colour + depth render targets (Phase A scaffolding -
     * see renderer.c). Created lazily in begin_frame, recreated on
     * resize. */
    offscreen_color: sg::Image,
    offscreen_depth: sg::Image,
    offscreen_color_att: sg::View,
    offscreen_depth_att: sg::View,
    offscreen_color_tex: sg::View,
    offscreen_depth_tex: sg::View,
    /* Intermediate (post-water) colour + depth. The composite (droplets
     * stripped) and the water pass render here; the final LENS pass samples
     * this - the real post-water image - so the camera rain-on-glass droplets
     * refract the water correctly, then blits to the swapchain. */
    mid_color: sg::Image,
    mid_depth: sg::Image,
    mid_color_att: sg::View,
    mid_depth_att: sg::View,
    mid_color_tex: sg::View,
    mid_depth_tex: sg::View,
    offscreen_w: i32,
    offscreen_h: i32,

    bodies: Vec<ChunkedBody>,
    active_body_idx: i32, /* -1 until something is registered */

    time_seconds: f32, /* for water wave animation */

    pass_action: sg::PassAction,
    env: RenderEnv,

    tris: usize,
    tiles_remeshed: usize,

    relight_track: RelightTrack,

    /* Per-frame counters reset by begin_frame. */
    relight_loop_ms_this_frame: f64,
    relight_iters_this_frame: i32,
    mesh_rebuild_ms_this_frame: f64,
    chunks_remeshed_this_frame: i32,

    /* C function-statics hoisted into state (renames documented at
     * module top): the ~2 s missing-chunk diagnostic accumulator and
     * the flow-debug once-per-second log clock. */
    log_accum_s: f64,
    flow_debug_last_log_s: f64,
}

impl Default for Renderer {
    fn default() -> Self {
        Renderer {
            pip_hex: sg::Pipeline::new(),
            pip_water: sg::Pipeline::new(),
            pip_water_mobile: sg::Pipeline::new(),
            pip_composite: sg::Pipeline::new(),
            pip_composite_mobile: sg::Pipeline::new(),
            smp_offscreen: sg::Sampler::new(),
            smp_offscreen_depth: sg::Sampler::new(),
            pip_starfield: sg::Pipeline::new(),
            pip_atmosphere: sg::Pipeline::new(),
            fullscreen_tri_vbuf: sg::Buffer::new(),
            pip_distant: sg::Pipeline::new(),
            pip_sun: sg::Pipeline::new(),
            atlas_col_avg: [Vec3::default(); ATLAS_TILES],
            uvsphere_vbuf: sg::Buffer::new(),
            uvsphere_ibuf: sg::Buffer::new(),
            uvsphere_index_count: 0,
            atlas_img: sg::Image::new(),
            atlas_view: sg::View::new(),
            atlas_smp: sg::Sampler::new(),
            gallery_img: sg::Image::new(),
            gallery_view: sg::View::new(),
            gallery_smp: sg::Sampler::new(),
            water_normal_img: sg::Image::new(),
            water_normal_view: sg::View::new(),
            water_normal_smp: sg::Sampler::new(),
            flow_arrow_img: sg::Image::new(),
            flow_arrow_view: sg::View::new(),
            flow_arrow_smp: sg::Sampler::new(),
            flow_arrow_pip: sgl::Pipeline { id: 0 },
            animal_tex_img: sg::Image::new(),
            animal_tex_view: sg::View::new(),
            animal_tex_smp: sg::Sampler::new(),
            rocket_tex_img: [sg::Image::new(); 4],
            rocket_tex_view: [sg::View::new(); 4],
            rocket_tex_smp: sg::Sampler::new(),
            station_tex_img: [sg::Image::new(); 15],
            station_tex_view: [sg::View::new(); 15],
            crop_tex_img: sg::Image::new(),
            crop_tex_view: sg::View::new(),
            crop_tex_smp: sg::Sampler::new(),
            distant_lod_smp: sg::Sampler::new(),
            offscreen_color: sg::Image::new(),
            offscreen_depth: sg::Image::new(),
            offscreen_color_att: sg::View::new(),
            offscreen_depth_att: sg::View::new(),
            offscreen_color_tex: sg::View::new(),
            offscreen_depth_tex: sg::View::new(),
            mid_color: sg::Image::new(),
            mid_depth: sg::Image::new(),
            mid_color_att: sg::View::new(),
            mid_depth_att: sg::View::new(),
            mid_color_tex: sg::View::new(),
            mid_depth_tex: sg::View::new(),
            offscreen_w: 0,
            offscreen_h: 0,
            bodies: Vec::new(),
            active_body_idx: -1,
            time_seconds: 0.0,
            pass_action: sg::PassAction::new(),
            env: RenderEnv::default(),
            tris: 0,
            tiles_remeshed: 0,
            relight_track: RelightTrack::default(),
            relight_loop_ms_this_frame: 0.0,
            relight_iters_this_frame: 0,
            mesh_rebuild_ms_this_frame: 0.0,
            chunks_remeshed_this_frame: 0,
            log_accum_s: 0.0,
            flow_debug_last_log_s: 0.0,
        }
    }
}

thread_local! {
    static R: RefCell<Renderer> = RefCell::new(Renderer::default());

    /* File-statics in the C, outside the memset-on-init R struct. */
    static TERRAIN_VISIBLE: Cell<bool> = const { Cell::new(true) };
    static WATER_VISIBLE: Cell<bool> = const { Cell::new(true) };
    static SKYBOX_VISIBLE: Cell<bool> = const { Cell::new(true) };
    static FLOW_DEBUG: Cell<bool> = const { Cell::new(false) };
    static PERF_MODE: Cell<bool> = const { Cell::new(false) };

    /* Port of G_OUTLINE_PIP - lazy-created lines pipeline for the
     * block outline + flow-debug overlays. */
    static OUTLINE_PIP: Cell<sgl::Pipeline> = const { Cell::new(sgl::Pipeline { id: 0 }) };
    /* Lazy triangles pipeline + boot-loaded crack-stage atlas for the
     * block-break decal. CRACK_STATE: 0 untried, 1 loaded, -1 failed. */
    static CRACK_VIEW: Cell<u32> = const { Cell::new(0) };
    static CRACK_SMP: Cell<u32> = const { Cell::new(0) };
    static CRACK_STAGES: Cell<i32> = const { Cell::new(0) };
    static CRACK_STATE: Cell<i8> = const { Cell::new(0) };

    /* Dedicated sokol_gl context for WORLD-SPACE entity geometry
     * (animals, crops, remote players). It flushes inside the OFFSCREEN
     * scene pass (compose_to_swapchain, before end_pass) instead of the
     * default context's end-of-frame flush in the swapchain pass.
     *
     * Why: entities must be part of the SCENE, not painted over the
     * composite. In the swapchain pass they drew after the water pass,
     * so a critter under a lake pasted on top of the water surface; and
     * they were excluded from the underwater fog / distortion
     * post-process. In the offscreen pass they z-sort against the
     * terrain's own depth buffer and the water + composite treat them
     * like any other scene geometry. (Terrain occlusion alone also
     * worked in the swapchain pass - the composite forwards scene depth
     * via gl_FragDepth - but the water ordering did not.)
     *
     * A separate context (not just an sgl layer) because each context
     * has its own vertex buffer: sokol_gl uploads a context's buffer
     * once per frame at its first draw, so one shared buffer can't
     * flush mid-frame and keep accepting UI vertices afterwards. */
    static SGL_WORLD_CTX: Cell<sgl::Context> = const { Cell::new(sgl::Context { id: 0 }) };
    /// This frame's composite fog (xyz colour, w density incl. the
    /// altitude fade). Stashed so the water pass - which draws AFTER
    /// the composite - can apply the same fog to the sea surface.
    static FRAME_FOG: Cell<[f32; 4]> = const { Cell::new([0.0; 4]) };
    /// Overcast coverage at the camera this frame (0 = clear, 1 = solid
    /// cloud). Dims + flattens the terrain lighting so a cloudy region
    /// visibly darkens. Set in the composite/fog block, read at the
    /// terrain uniform sites (a frame of lag on the early ones is
    /// invisible since coverage drifts slowly).
    static FRAME_OVERCAST: Cell<f32> = const { Cell::new(0.0) };
    /// Rain wetness 0..1 for this frame: how wet the terrain / trees look
    /// (darken + ripple sheen in the hex shader). Set in the composite/fog
    /// block from the camera's precipitation, read at the hex fs uniform.
    static FRAME_WET: Cell<f32> = const { Cell::new(0.0) };
    /// Monotonic frame time (s) of the last wet-level smoothing step, so the
    /// fade uses a real dt. -1 = uninitialised (first frame snaps).
    static WET_PREV_T: Cell<f32> = const { Cell::new(-1.0) };
    /// Emerge-from-water dry-off intensity 0..1: 1.0 the instant the camera
    /// leaves the water, decaying to 0 as it "dries" - drives the running
    /// water-drips composite overlay. Paired with the prev-under edge latch
    /// and the dry-off end time below.
    static FRAME_EMERGE: Cell<f32> = const { Cell::new(0.0) };
    static PREV_UNDER: Cell<bool> = const { Cell::new(false) };
    static EMERGE_END_S: Cell<f64> = const { Cell::new(0.0) };
    /// Camera aspect (width / height) for this frame, so the composite
    /// rain-on-glass droplets stay round. Set in camera_basis.
    static FRAME_ASPECT: Cell<f32> = const { Cell::new(1.777) };
    /// Throttle for the world-sgl-context overflow warning (see
    /// context_draw in draw_world) - a sustained overflow logs once per
    /// few seconds, not per frame.
    static SGL_OVERFLOW_LAST_LOG_S: Cell<f64> = const { Cell::new(-1e9) };
}

/// Overcast-dimmed ambient fill for a terrain uniform.
/// The frame's camera position in world space (env.camera_world, set by
/// begin_frame). This is the CAMERA - the solar-map orbit eye, the rocket
/// chase-cam, the LODCAM - not the player. Anything that culls "what can
/// this view see" (cloud horizon cull, billboard LOD) must anchor here:
/// anchoring to the player leaves the far hemisphere bare when a detached
/// camera looks at the planet from elsewhere.
pub fn camera_world() -> Vec3 {
    R.with(|cell| cell.borrow().env.camera_world)
}

/// Per-tileset atmospheric limb-rim colour with global fallback (zero
/// sentinel, same merge rule as the other lod.yaml palette fields). The
/// global default is Tenebris's blue - bodies with non-blue atmospheres
/// (Sequoia's brown haze) override it or their terrain reads blue-tinted
/// from orbit.
fn rim_color_for(lc: &config::LodConfig, ts: usize) -> Vec3 {
    let ts = if ts < 5 { ts } else { 0 };
    let c = lc.tileset_rim_color[ts];
    if c.x > 0.0 || c.y > 0.0 || c.z > 0.0 {
        c
    } else {
        lc.distant_rim_color
    }
}

fn overcast_ambient(base: Vec3) -> [f32; 3] {
    let oc = FRAME_OVERCAST.with(|c| c.get());
    let dim = 1.0 - oc * tenebris_core::weather::config().overcast_amb_dim;
    [base.x * dim, base.y * dim, base.z * dim]
}

/// Overcast-dimmed sun tint for a terrain uniform (the sun is blocked more
/// than the sky fill, so the region flattens as well as darkens).
fn overcast_sun_tint(tint: Vec3) -> [f32; 3] {
    let oc = FRAME_OVERCAST.with(|c| c.get());
    let dim = 1.0 - oc * tenebris_core::weather::config().overcast_sun_dim;
    [tint.x * dim, tint.y * dim, tint.z * dim]
}

/// Lazily create the world-entity sgl context against the offscreen
/// target formats (Rgba8 + DepthStencil, no MSAA - must match
/// ensure_offscreen_targets, or the per-context pipelines break).
fn sgl_world_ctx() -> sgl::Context {
    SGL_WORLD_CTX.with(|c| {
        let mut ctx = c.get();
        if ctx.id == 0 {
            ctx = sgl::make_context(&sgl::ContextDesc {
                color_format: sg::PixelFormat::Rgba8,
                depth_format: sg::PixelFormat::DepthStencil,
                sample_count: 1,
                /* Explicit pools: the sokol_gl DEFAULT is 64k vertices, and
                 * on any overflow the whole context renders NOTHING for the
                 * frame. A full storm deck (weather moisture at max fills
                 * EVERY cloud cell with a storm-scaled lump cluster) blows
                 * 64k on its own - the "no clouds while it is raining" bug:
                 * clouds, drops, animals, bonfire FX all silently vanished,
                 * while the rain shafts survived in the separate default
                 * (swapchain) context. Same failure + fix precedent as the
                 * station drum in mobile_ui::init (default context 256k).
                 * The overflow diagnostic next to context_draw() reports if
                 * this ever saturates again. */
                max_vertices: 256 * 1024,
                max_commands: 32 * 1024,
                ..Default::default()
            });
            c.set(ctx);
        }
        ctx
    })
}

/// Route subsequent sgl recording (and lazy `sgl::make_pipeline` calls)
/// into the world-entity context. Pair with [`sgl_world_end`].
pub fn sgl_world_begin() {
    sgl::set_context(sgl_world_ctx());
}

/// Back to the default (UI / swapchain) sgl context.
pub fn sgl_world_end() {
    sgl::set_context(sgl::default_context());
}

/// Route sgl recording into the DEFAULT (swapchain) context for TRANSPARENT
/// atmospheric FX (rain, reentry plasma). Unlike [`sgl_world_begin`] - which
/// records into the offscreen context that flushes BEFORE the water pass - the
/// default context flushes at the frame's final `sgl::draw()`, AFTER
/// `draw_water`. That matters because these FX are additive / over-blended with
/// depth-write OFF: recorded in the offscreen pass they leave no depth for the
/// later opaque water pass to test against, so water overpaints them wherever
/// the sea surface is in front of the terrain. Recorded here they composite
/// after water and depth-test against the scene+water depth the composite
/// forwarded, so they read correctly in FRONT of the sea. Pipelines created
/// lazily under this context bind to the swapchain formats. Pair with
/// [`sgl_overlay_end`].
pub fn sgl_overlay_begin() {
    sgl::set_context(sgl::default_context());
}

/// Leave the overlay context (a no-op restore - already the default context).
pub fn sgl_overlay_end() {
    sgl::set_context(sgl::default_context());
}

/// Day/night brightness for the sgl entity renderers (critters / crops /
/// item drops): the terrain's sun-terminator curve reduced to a single
/// scalar - 1.0 in daylight, easing down to a 0.16 night floor so
/// entities darken with the world instead of glowing fullbright at night.
pub fn entity_sun_brightness(world_pos: DVec3) -> f32 {
    R.with(|cell| {
        let r = cell.borrow();
        let c = r.env.atmo_planet_center;
        let px = world_pos.x as f32 - c.x;
        let py = world_pos.y as f32 - c.y;
        let pz = world_pos.z as f32 - c.z;
        let len = (px * px + py * py + pz * pz).sqrt();
        if len < 1e-3 {
            return 1.0;
        }
        let d = (px * r.env.sun_dir.x + py * r.env.sun_dir.y + pz * r.env.sun_dir.z) / len;
        /* SURFACE term: day/night by which side of the planet the entity
         * is over, with a soft terminator band (~sunset). Right for
         * animals / crops / torch glows standing ON the ground. */
        let t = ((d + 0.10) / 0.22).clamp(0.0, 1.0);
        let surface = 0.16 + 0.84 * t;
        /* SPACE term: sunlight is DIRECT regardless of which hemisphere
         * the entity floats over - a rocket above the night side is still
         * in full sun. The only darkness up there is the planet's own
         * shadow: behind the terminator plane (along < 0) AND inside the
         * shadow cylinder (perpendicular distance to the sun axis under
         * the planet radius), with a soft penumbra edge. Without this the
         * ridden rocket went near-black in space whenever its ground
         * track crossed the night side. */
        let rad = r.env.atmo_planet_radius.max(1.0);
        let along = d * len;
        let perp = (len * len - along * along).max(0.0).sqrt();
        let umbra = if along < 0.0 {
            ((rad - perp) / (0.15 * rad)).clamp(0.0, 1.0)
        } else {
            0.0
        };
        let space = 0.16 + 0.84 * (1.0 - umbra);
        /* Blend surface -> space across half a radius of altitude, so
         * ground entities keep the sunset look and orbital ones get the
         * umbra model. */
        let alt01 = ((len - rad) / (0.5 * rad)).clamp(0.0, 1.0);
        surface + (space - surface) * alt01
    })
}

/* ----------------------------------------------------------------------- */
/* Perf mode + debug toggles (public API). */

/// Port of `renderer_set_perf_mode()`. MUST be called before `init()`;
/// gates which pipelines get built (see renderer.h).
pub fn set_perf_mode(enabled: bool) {
    PERF_MODE.with(|c| c.set(enabled));
}

/// Port of `renderer_perf_mode_enabled()`.
pub fn perf_mode_enabled() -> bool {
    PERF_MODE.with(|c| c.get())
}

/// Port of `renderer_set_terrain_visible()` - chunks + GPU buffers
/// stay live, flipping back on shows everything immediately.
pub fn set_terrain_visible(v: bool) {
    TERRAIN_VISIBLE.with(|c| c.set(v));
}

/// Port of `renderer_terrain_visible()`.
pub fn terrain_visible() -> bool {
    TERRAIN_VISIBLE.with(|c| c.get())
}

/// Port of `renderer_set_water_visible()`.
pub fn set_water_visible(v: bool) {
    WATER_VISIBLE.with(|c| c.set(v));
}

/// Port of `renderer_water_visible()`.
pub fn water_visible() -> bool {
    WATER_VISIBLE.with(|c| c.get())
}

/// Port of `renderer_set_skybox_visible()`.
pub fn set_skybox_visible(v: bool) {
    SKYBOX_VISIBLE.with(|c| c.set(v));
}

/// Port of `renderer_skybox_visible()`.
pub fn skybox_visible() -> bool {
    SKYBOX_VISIBLE.with(|c| c.get())
}

/// Port of `renderer_set_flow_debug()`.
pub fn set_flow_debug(v: bool) {
    FLOW_DEBUG.with(|c| c.set(v));
}

/// Port of `renderer_flow_debug()`.
pub fn flow_debug() -> bool {
    FLOW_DEBUG.with(|c| c.get())
}

/* ----------------------------------------------------------------------- */
/* GPU asset loads (init-time). */

/// GPU half of `bake_atlas()`: runs the pure bake, uploads the strip,
/// makes the nearest-clamp sampler, stores the per-column averages.
fn bake_atlas(r: &mut Renderer) {
    /* C: stbi_set_flip_vertically_on_load(1) for atlas tiles. */
    let bake = bake_atlas_pixels(|path| load_png_rgba(path, true));
    r.atlas_col_avg = bake.col_avg;
    let mut desc = sg::ImageDesc {
        width: ATLAS_W,
        height: ATLAS_H,
        pixel_format: sg::PixelFormat::Rgba8,
        label: c"hex-atlas".as_ptr(),
        ..Default::default()
    };
    desc.data.mip_levels[0] = sg::slice_as_range(&bake.pixels);
    r.atlas_img = sg::make_image(&desc);
    r.atlas_view = sg::make_view(&sg::ViewDesc {
        texture: sg::TextureViewDesc { image: r.atlas_img, ..Default::default() },
        label: c"hex-atlas-view".as_ptr(),
        ..Default::default()
    });
    r.atlas_smp = sg::make_sampler(&sg::SamplerDesc {
        min_filter: sg::Filter::Nearest,
        mag_filter: sg::Filter::Nearest,
        wrap_u: sg::Wrap::ClampToEdge,
        wrap_v: sg::Wrap::ClampToEdge,
        label: c"hex-atlas-sampler".as_ptr(),
        ..Default::default()
    });
}

/// Port of `load_water_normal()` - pre-baked normal map sampled by
/// water_mobile.glsl; 1x1 flat-blue fallback when the asset is
/// missing. Also creates the shared distant-LOD sampler (same spot as
/// the C).
fn load_water_normal(r: &mut Renderer) {
    const FALLBACK: [u8; 4] = [128, 128, 255, 255];
    let loaded = load_png_rgba("assets/textures/water_normal.png", false);
    let (w, h, pixels): (i32, i32, &[u8]) = match &loaded {
        Some(img) => {
            println!(
                "[renderer] loaded water_normal.png {}x{} (channels=4)",
                img.w, img.h
            );
            (img.w, img.h, &img.rgba)
        }
        None => {
            println!(
                "[renderer] WARNING: assets/textures/water_normal.png \
                 missing; mobile water normals will be flat"
            );
            (1, 1, &FALLBACK)
        }
    };
    let mut desc = sg::ImageDesc {
        width: w,
        height: h,
        pixel_format: sg::PixelFormat::Rgba8,
        label: c"water-normal".as_ptr(),
        ..Default::default()
    };
    desc.data.mip_levels[0] = sg::slice_as_range(pixels);
    r.water_normal_img = sg::make_image(&desc);
    r.water_normal_view = sg::make_view(&sg::ViewDesc {
        texture: sg::TextureViewDesc { image: r.water_normal_img, ..Default::default() },
        label: c"water-normal-view".as_ptr(),
        ..Default::default()
    });
    r.water_normal_smp = sg::make_sampler(&sg::SamplerDesc {
        min_filter: sg::Filter::Linear,
        mag_filter: sg::Filter::Linear,
        wrap_u: sg::Wrap::Repeat,
        wrap_v: sg::Wrap::Repeat,
        label: c"water-normal-sampler".as_ptr(),
        ..Default::default()
    });

    /* Shared sampler for the per-body distant-LOD albedo + normal
     * textures. Equirect wraps in U (longitude), clamps in V
     * (latitude). */
    r.distant_lod_smp = sg::make_sampler(&sg::SamplerDesc {
        min_filter: sg::Filter::Linear,
        mag_filter: sg::Filter::Linear,
        wrap_u: sg::Wrap::Repeat,
        wrap_v: sg::Wrap::ClampToEdge,
        label: c"distant-lod-sampler".as_ptr(),
        ..Default::default()
    });
}

/// Animal texture atlas - one 32x32 unwrap tile per AnimalKind
/// (tools/gen-animal-textures.py). NEAREST so the pixel-art fur /
/// scales stay crisp on the box bodies.
fn load_animal_textures(r: &mut Renderer) {
    const FALLBACK: [u8; 4] = [200, 160, 120, 255];
    let loaded = load_png_rgba("assets/textures/animals.png", false);
    let (w, h, pixels): (i32, i32, &[u8]) = match &loaded {
        Some(img) => (img.w, img.h, &img.rgba),
        None => {
            println!(
                "[renderer] WARNING: assets/textures/animals.png missing; \
                 animals will render flat-tinted"
            );
            (1, 1, &FALLBACK)
        }
    };
    let mut desc = sg::ImageDesc {
        width: w,
        height: h,
        pixel_format: sg::PixelFormat::Rgba8,
        label: c"animal-atlas".as_ptr(),
        ..Default::default()
    };
    desc.data.mip_levels[0] = sg::slice_as_range(pixels);
    r.animal_tex_img = sg::make_image(&desc);
    r.animal_tex_view = sg::make_view(&sg::ViewDesc {
        texture: sg::TextureViewDesc { image: r.animal_tex_img, ..Default::default() },
        label: c"animal-atlas-view".as_ptr(),
        ..Default::default()
    });
    r.animal_tex_smp = sg::make_sampler(&sg::SamplerDesc {
        min_filter: sg::Filter::Nearest,
        mag_filter: sg::Filter::Nearest,
        wrap_u: sg::Wrap::ClampToEdge,
        wrap_v: sg::Wrap::ClampToEdge,
        label: c"animal-atlas-sampler".as_ptr(),
        ..Default::default()
    });
}

/// Raw view / sampler ids for the animal atlas (client::animals).
pub fn animal_view_id() -> u32 {
    R.with(|cell| cell.borrow().animal_tex_view.id)
}
pub fn animal_sampler_id() -> u32 {
    R.with(|cell| cell.borrow().animal_tex_smp.id)
}

/// Rocket-part model textures (ported from the JS build's rocket stack):
/// 0 engine, 1 fuel tank, 2 command module, 3 launch tower. Sampled by
/// client::rocket_fx. NEAREST to keep the pixel-art crisp.
fn load_rocket_textures(r: &mut Renderer) {
    const PATHS: [&str; 4] = [
        "assets/textures/rocket_parts/medium_engine.png",
        "assets/textures/rocket_parts/medium_fuel_tank.png",
        "assets/textures/rocket_parts/command_module.png",
        "assets/textures/technology/launch_tower.png",
    ];
    const FALLBACK: [u8; 4] = [200, 205, 210, 255];
    r.rocket_tex_smp = sg::make_sampler(&sg::SamplerDesc {
        min_filter: sg::Filter::Nearest,
        mag_filter: sg::Filter::Nearest,
        wrap_u: sg::Wrap::ClampToEdge,
        wrap_v: sg::Wrap::ClampToEdge,
        label: c"rocket-tex-sampler".as_ptr(),
        ..Default::default()
    });
    for (i, path) in PATHS.iter().enumerate() {
        let loaded = load_png_rgba(path, false);
        let (w, h, pixels): (i32, i32, &[u8]) = match &loaded {
            Some(img) => (img.w, img.h, &img.rgba),
            None => {
                println!("[renderer] WARNING: {path} missing; rocket part flat-tinted");
                (1, 1, &FALLBACK)
            }
        };
        let mut desc = sg::ImageDesc {
            width: w,
            height: h,
            pixel_format: sg::PixelFormat::Rgba8,
            label: c"rocket-tex".as_ptr(),
            ..Default::default()
        };
        desc.data.mip_levels[0] = sg::slice_as_range(pixels);
        r.rocket_tex_img[i] = sg::make_image(&desc);
        r.rocket_tex_view[i] = sg::make_view(&sg::ViewDesc {
            texture: sg::TextureViewDesc { image: r.rocket_tex_img[i], ..Default::default() },
            label: c"rocket-tex-view".as_ptr(),
            ..Default::default()
        });
    }
}

/// Orbital-station skins (client::station_fx). Index order matches
/// station_fx::TEX_*: 0 hull, 1 floor, 2 carpet, 3 neon trim, 4 sign,
/// 5 casino wall, 6 glass, 7 pink neon, 8 gold neon, 9 trade terminal,
/// 10 research console, 11 museum case, 12 light fixture, 13 slots,
/// 14 card table. NEAREST (the shared rocket sampler) keeps it crisp.
fn load_station_textures(r: &mut Renderer) {
    const PATHS: [&str; 15] = [
        "assets/textures/technology/station_hull.png",
        "assets/textures/technology/station_floor.png",
        "assets/textures/technology/casino_carpet.png",
        "assets/textures/technology/neon_trim.png",
        "assets/textures/technology/casino_sign.png",
        "assets/textures/technology/casino_wall.png",
        "assets/textures/technology/station_glass.png",
        "assets/textures/technology/neon_trim_pink.png",
        "assets/textures/technology/neon_trim_gold.png",
        "assets/textures/technology/trade_terminal.png",
        "assets/textures/technology/research_console.png",
        "assets/textures/technology/museum_case.png",
        "assets/textures/technology/light_fixture.png",
        "assets/textures/technology/slot_machine_face.png",
        "assets/textures/technology/card_table_face.png",
    ];
    const FALLBACK: [u8; 4] = [150, 156, 166, 255];
    for (i, path) in PATHS.iter().enumerate() {
        let loaded = load_png_rgba(path, false);
        let (w, h, pixels): (i32, i32, &[u8]) = match &loaded {
            Some(img) => (img.w, img.h, &img.rgba),
            None => {
                println!("[renderer] WARNING: {path} missing; station face flat-tinted");
                (1, 1, &FALLBACK)
            }
        };
        let mut desc = sg::ImageDesc {
            width: w,
            height: h,
            pixel_format: sg::PixelFormat::Rgba8,
            label: c"station-tex".as_ptr(),
            ..Default::default()
        };
        desc.data.mip_levels[0] = sg::slice_as_range(pixels);
        r.station_tex_img[i] = sg::make_image(&desc);
        r.station_tex_view[i] = sg::make_view(&sg::ViewDesc {
            texture: sg::TextureViewDesc { image: r.station_tex_img[i], ..Default::default() },
            label: c"station-tex-view".as_ptr(),
            ..Default::default()
        });
    }
}

/// View id for a station skin (see `load_station_textures` order).
pub fn station_view_id(idx: usize) -> u32 {
    R.with(|cell| cell.borrow().station_tex_view[idx.min(14)].id)
}

/// View id for a rocket part texture (0 engine, 1 tank, 2 capsule, 3 tower).
pub fn rocket_view_id(idx: usize) -> u32 {
    R.with(|cell| cell.borrow().rocket_tex_view[idx.min(3)].id)
}
pub fn rocket_sampler_id() -> u32 {
    R.with(|cell| cell.borrow().rocket_tex_smp.id)
}

/// Crop material atlas - one 32x32 tile per column, sampled by
/// client::crops so the procedural plant boxes are textured. NEAREST so
/// the pixel-art bark / leaves / rind stay crisp.
fn load_crop_textures(r: &mut Renderer) {
    const FALLBACK: [u8; 4] = [90, 150, 60, 255];
    let loaded = load_png_rgba("assets/textures/crops.png", false);
    let (w, h, pixels): (i32, i32, &[u8]) = match &loaded {
        Some(img) => (img.w, img.h, &img.rgba),
        None => {
            println!(
                "[renderer] WARNING: assets/textures/crops.png missing; \
                 crops will render flat-tinted"
            );
            (1, 1, &FALLBACK)
        }
    };
    let mut desc = sg::ImageDesc {
        width: w,
        height: h,
        pixel_format: sg::PixelFormat::Rgba8,
        label: c"crop-atlas".as_ptr(),
        ..Default::default()
    };
    desc.data.mip_levels[0] = sg::slice_as_range(pixels);
    r.crop_tex_img = sg::make_image(&desc);
    r.crop_tex_view = sg::make_view(&sg::ViewDesc {
        texture: sg::TextureViewDesc { image: r.crop_tex_img, ..Default::default() },
        label: c"crop-atlas-view".as_ptr(),
        ..Default::default()
    });
    r.crop_tex_smp = sg::make_sampler(&sg::SamplerDesc {
        min_filter: sg::Filter::Nearest,
        mag_filter: sg::Filter::Nearest,
        wrap_u: sg::Wrap::ClampToEdge,
        wrap_v: sg::Wrap::ClampToEdge,
        label: c"crop-atlas-sampler".as_ptr(),
        ..Default::default()
    });
}

/// Raw view / sampler ids for the crop atlas (client::crops).
pub fn crop_view_id() -> u32 {
    R.with(|cell| cell.borrow().crop_tex_view.id)
}
pub fn crop_sampler_id() -> u32 {
    R.with(|cell| cell.borrow().crop_tex_smp.id)
}

/// Port of `load_flow_arrow()` - F5 overlay texture; NEAREST so the
/// pixel-art arrow stays crisp. The sgl pipeline is lazy-created on
/// first F5 draw (sgl_setup runs later than renderer init).
fn load_flow_arrow(r: &mut Renderer) {
    const FALLBACK: [u8; 4] = [255, 255, 255, 0];
    let loaded = load_png_rgba("assets/textures/water_flow_arrow.png", false);
    let (w, h, pixels): (i32, i32, &[u8]) = match &loaded {
        Some(img) => (img.w, img.h, &img.rgba),
        None => {
            println!(
                "[renderer] WARNING: assets/textures/water_flow_arrow.png \
                 missing; F5 flow-debug overlay will be invisible"
            );
            (1, 1, &FALLBACK)
        }
    };
    let mut desc = sg::ImageDesc {
        width: w,
        height: h,
        pixel_format: sg::PixelFormat::Rgba8,
        label: c"flow-arrow".as_ptr(),
        ..Default::default()
    };
    desc.data.mip_levels[0] = sg::slice_as_range(pixels);
    r.flow_arrow_img = sg::make_image(&desc);
    r.flow_arrow_view = sg::make_view(&sg::ViewDesc {
        texture: sg::TextureViewDesc { image: r.flow_arrow_img, ..Default::default() },
        label: c"flow-arrow-view".as_ptr(),
        ..Default::default()
    });
    r.flow_arrow_smp = sg::make_sampler(&sg::SamplerDesc {
        min_filter: sg::Filter::Nearest,
        mag_filter: sg::Filter::Nearest,
        wrap_u: sg::Wrap::ClampToEdge,
        wrap_v: sg::Wrap::ClampToEdge,
        label: c"flow-arrow-sampler".as_ptr(),
        ..Default::default()
    });
}

/// Port of `ensure_flow_arrow_pip()` - lazy textured-quad pipeline for
/// the F5 overlay (kept for parity; the current overlay draws lines
/// through the outline pipeline, same as the C).
fn ensure_flow_arrow_pip(r: &mut Renderer) {
    if r.flow_arrow_pip.id != 0 {
        return;
    }
    let mut desc = sg::PipelineDesc {
        depth: sg::DepthState {
            compare: sg::CompareFunc::LessEqual,
            write_enabled: false,
            ..Default::default()
        },
        ..Default::default()
    };
    desc.colors[0].blend = sg::BlendState {
        enabled: true,
        src_factor_rgb: sg::BlendFactor::SrcAlpha,
        dst_factor_rgb: sg::BlendFactor::OneMinusSrcAlpha,
        src_factor_alpha: sg::BlendFactor::One,
        dst_factor_alpha: sg::BlendFactor::One,
        ..Default::default()
    };
    r.flow_arrow_pip = sgl::make_pipeline(&desc);
}

/* ----------------------------------------------------------------------- */
/* init / shutdown. */

/// Port of `renderer_init()`. Builds every pipeline (mobile variants
/// only when perf mode was set beforehand), the fullscreen-tri vbuf,
/// the uvsphere, and loads the atlas + helper textures. Per-chunk
/// meshes are allocated lazily once a body registers.
pub fn init() {
    R.with(|cell| {
        let mut r = cell.borrow_mut();
        *r = Renderer::default(); /* C: memset(&R, 0, sizeof(R)) */
        r.active_body_idx = -1;
        let perf_mode = perf_mode_enabled();

        /* Hex (opaque terrain) pipeline. Explicit attr offsets; stride
         * is the full HexVertex (44 B) - hex and water pipelines read
         * from the same shared vbuf. */
        {
            use shaders::hex::*;
            let shd = sg::make_shader(&hex_shader_desc(sg::query_backend()));
            let mut desc = sg::PipelineDesc {
                shader: shd,
                index_type: sg::IndexType::Uint32,
                depth: sg::DepthState {
                    write_enabled: true,
                    compare: sg::CompareFunc::LessEqual,
                    ..Default::default()
                },
                cull_mode: sg::CullMode::Back,
                face_winding: sg::FaceWinding::Ccw,
                label: c"hex-pipeline".as_ptr(),
                ..Default::default()
            };
            desc.layout.attrs[ATTR_HEX_A_POS] = sg::VertexAttrState {
                format: sg::VertexFormat::Float3,
                offset: std::mem::offset_of!(HexVertex, pos) as i32,
                ..Default::default()
            };
            desc.layout.attrs[ATTR_HEX_A_NORMAL] = sg::VertexAttrState {
                format: sg::VertexFormat::Float3,
                offset: std::mem::offset_of!(HexVertex, normal) as i32,
                ..Default::default()
            };
            desc.layout.attrs[ATTR_HEX_A_UV] = sg::VertexAttrState {
                format: sg::VertexFormat::Float2,
                offset: std::mem::offset_of!(HexVertex, uv) as i32,
                ..Default::default()
            };
            desc.layout.attrs[ATTR_HEX_A_SKY_LIGHT] = sg::VertexAttrState {
                format: sg::VertexFormat::Float,
                offset: std::mem::offset_of!(HexVertex, sky_light) as i32,
                ..Default::default()
            };
            desc.layout.attrs[ATTR_HEX_A_TORCH_LIGHT] = sg::VertexAttrState {
                format: sg::VertexFormat::Float,
                offset: std::mem::offset_of!(HexVertex, torch_light) as i32,
                ..Default::default()
            };
            desc.layout.attrs[ATTR_HEX_A_WET] = sg::VertexAttrState {
                format: sg::VertexFormat::Float,
                offset: std::mem::offset_of!(HexVertex, wet) as i32,
                ..Default::default()
            };
            desc.layout.buffers[0].stride = std::mem::size_of::<HexVertex>() as i32;
            r.pip_hex = sg::make_pipeline(&desc);
        }

        /* Water pipeline - draws in the swapchain pass after compose.
         * Depth write + LESS_EQUAL to self-sort; terrain-vs-water
         * occlusion is manual in the fs (offscreen depth sample +
         * discard). Cull none so the cap reads from underneath. Blend
         * disabled (shoreline fade is in-shader). */
        {
            use shaders::water::*;
            let shd = sg::make_shader(&water_shader_desc(sg::query_backend()));
            let mut desc = sg::PipelineDesc {
                shader: shd,
                index_type: sg::IndexType::Uint32,
                depth: sg::DepthState {
                    write_enabled: true,
                    compare: sg::CompareFunc::LessEqual,
                    ..Default::default()
                },
                cull_mode: sg::CullMode::None,
                face_winding: sg::FaceWinding::Ccw,
                label: c"water-pipeline".as_ptr(),
                ..Default::default()
            };
            desc.layout.attrs[ATTR_WATER_A_POS] = sg::VertexAttrState {
                format: sg::VertexFormat::Float3,
                offset: std::mem::offset_of!(HexVertex, pos) as i32,
                ..Default::default()
            };
            desc.layout.attrs[ATTR_WATER_A_NORMAL] = sg::VertexAttrState {
                format: sg::VertexFormat::Float3,
                offset: std::mem::offset_of!(HexVertex, normal) as i32,
                ..Default::default()
            };
            desc.layout.attrs[ATTR_WATER_A_UV] = sg::VertexAttrState {
                format: sg::VertexFormat::Float2,
                offset: std::mem::offset_of!(HexVertex, uv) as i32,
                ..Default::default()
            };
            desc.layout.attrs[ATTR_WATER_A_SKY_LIGHT] = sg::VertexAttrState {
                format: sg::VertexFormat::Float,
                offset: std::mem::offset_of!(HexVertex, sky_light) as i32,
                ..Default::default()
            };
            desc.layout.attrs[ATTR_WATER_A_TORCH_LIGHT] = sg::VertexAttrState {
                format: sg::VertexFormat::Float,
                offset: std::mem::offset_of!(HexVertex, torch_light) as i32,
                ..Default::default()
            };
            desc.layout.buffers[0].stride = std::mem::size_of::<HexVertex>() as i32;
            desc.colors[0].blend.enabled = false;
            r.pip_water = sg::make_pipeline(&desc);
        }

        /* Mobile / perf-mode water pipeline: alpha-blended on top of
         * the swapchain composite, depth test but no write. Only built
         * when perf mode was set before init. */
        if perf_mode {
            use shaders::water_mobile::*;
            let shd = sg::make_shader(&water_mobile_shader_desc(sg::query_backend()));
            let mut desc = sg::PipelineDesc {
                shader: shd,
                index_type: sg::IndexType::Uint32,
                depth: sg::DepthState {
                    write_enabled: false,
                    compare: sg::CompareFunc::LessEqual,
                    ..Default::default()
                },
                cull_mode: sg::CullMode::None,
                face_winding: sg::FaceWinding::Ccw,
                label: c"water-mobile-pipeline".as_ptr(),
                ..Default::default()
            };
            desc.layout.attrs[ATTR_WATER_MOBILE_A_POS] = sg::VertexAttrState {
                format: sg::VertexFormat::Float3,
                offset: std::mem::offset_of!(HexVertex, pos) as i32,
                ..Default::default()
            };
            desc.layout.attrs[ATTR_WATER_MOBILE_A_NORMAL] = sg::VertexAttrState {
                format: sg::VertexFormat::Float3,
                offset: std::mem::offset_of!(HexVertex, normal) as i32,
                ..Default::default()
            };
            desc.layout.attrs[ATTR_WATER_MOBILE_A_SKY_LIGHT] = sg::VertexAttrState {
                format: sg::VertexFormat::Float,
                offset: std::mem::offset_of!(HexVertex, sky_light) as i32,
                ..Default::default()
            };
            desc.layout.attrs[ATTR_WATER_MOBILE_A_TORCH_LIGHT] = sg::VertexAttrState {
                format: sg::VertexFormat::Float,
                offset: std::mem::offset_of!(HexVertex, torch_light) as i32,
                ..Default::default()
            };
            desc.layout.buffers[0].stride = std::mem::size_of::<HexVertex>() as i32;
            desc.colors[0].blend = sg::BlendState {
                enabled: true,
                src_factor_rgb: sg::BlendFactor::SrcAlpha,
                dst_factor_rgb: sg::BlendFactor::OneMinusSrcAlpha,
                op_rgb: sg::BlendOp::Add,
                src_factor_alpha: sg::BlendFactor::One,
                dst_factor_alpha: sg::BlendFactor::OneMinusSrcAlpha,
                op_alpha: sg::BlendOp::Add,
            };
            r.pip_water_mobile = sg::make_pipeline(&desc);
        }

        /* Composite blit pipeline - fullscreen triangle, writes
         * gl_FragDepth = scene depth so later sokol_gl draws test
         * against the real scene. */
        {
            let shd = sg::make_shader(&shaders::composite::composite_shader_desc(
                sg::query_backend(),
            ));
            r.pip_composite = sg::make_pipeline(&sg::PipelineDesc {
                shader: shd,
                index_type: sg::IndexType::None,
                cull_mode: sg::CullMode::None,
                depth: sg::DepthState {
                    write_enabled: true,
                    compare: sg::CompareFunc::Always,
                    ..Default::default()
                },
                label: c"composite-pipeline".as_ptr(),
                ..Default::default()
            });
        }
        if perf_mode {
            let shd = sg::make_shader(&shaders::composite_mobile::composite_mobile_shader_desc(
                sg::query_backend(),
            ));
            r.pip_composite_mobile = sg::make_pipeline(&sg::PipelineDesc {
                shader: shd,
                index_type: sg::IndexType::None,
                cull_mode: sg::CullMode::None,
                depth: sg::DepthState {
                    write_enabled: true,
                    compare: sg::CompareFunc::Always,
                    ..Default::default()
                },
                label: c"composite-mobile-pipeline".as_ptr(),
                ..Default::default()
            });
        }
        r.smp_offscreen = sg::make_sampler(&sg::SamplerDesc {
            min_filter: sg::Filter::Linear,
            mag_filter: sg::Filter::Linear,
            wrap_u: sg::Wrap::ClampToEdge,
            wrap_v: sg::Wrap::ClampToEdge,
            label: c"offscreen-sampler".as_ptr(),
            ..Default::default()
        });
        /* Depth needs a separate sampler - WebGL2 disallows linear
         * filtering on depth textures sampled as regular sampler2D. */
        r.smp_offscreen_depth = sg::make_sampler(&sg::SamplerDesc {
            min_filter: sg::Filter::Nearest,
            mag_filter: sg::Filter::Nearest,
            wrap_u: sg::Wrap::ClampToEdge,
            wrap_v: sg::Wrap::ClampToEdge,
            label: c"offscreen-depth-sampler".as_ptr(),
            ..Default::default()
        });

        /* Starfield + nebula (opaque base layer); fullscreen triangle
         * via gl_VertexIndex, no depth write. */
        {
            let shd =
                sg::make_shader(&shaders::starfield::starfield_shader_desc(sg::query_backend()));
            r.pip_starfield = sg::make_pipeline(&sg::PipelineDesc {
                shader: shd,
                index_type: sg::IndexType::None,
                cull_mode: sg::CullMode::None,
                depth: sg::DepthState {
                    write_enabled: false,
                    compare: sg::CompareFunc::LessEqual,
                    ..Default::default()
                },
                label: c"starfield-pipeline".as_ptr(),
                ..Default::default()
            });
        }

        /* Atmospheric scattering (alpha-blended overlay). Preserves
         * destination alpha - the wet mask composite.glsl reads. */
        {
            use shaders::atmosphere::*;
            let shd = sg::make_shader(&atmosphere_shader_desc(sg::query_backend()));
            let mut desc = sg::PipelineDesc {
                shader: shd,
                index_type: sg::IndexType::None,
                cull_mode: sg::CullMode::None,
                depth: sg::DepthState {
                    write_enabled: false,
                    compare: sg::CompareFunc::LessEqual,
                    ..Default::default()
                },
                label: c"atmosphere-pipeline".as_ptr(),
                ..Default::default()
            };
            desc.layout.attrs[ATTR_ATMOSPHERE_A_POS] = sg::VertexAttrState {
                format: sg::VertexFormat::Float2,
                ..Default::default()
            };
            desc.layout.buffers[0].stride = (2 * std::mem::size_of::<f32>()) as i32;
            desc.colors[0].blend = sg::BlendState {
                enabled: true,
                src_factor_rgb: sg::BlendFactor::SrcAlpha,
                dst_factor_rgb: sg::BlendFactor::OneMinusSrcAlpha,
                src_factor_alpha: sg::BlendFactor::Zero,
                dst_factor_alpha: sg::BlendFactor::One,
                ..Default::default()
            };
            r.pip_atmosphere = sg::make_pipeline(&desc);
        }

        /* Fullscreen-triangle vbuf (vec2 a_pos): the over-large
         * triangle covers the viewport; excess clipped. */
        {
            const FULLSCREEN_TRI: [f32; 6] = [-1.0, -1.0, 3.0, -1.0, -1.0, 3.0];
            r.fullscreen_tri_vbuf = sg::make_buffer(&sg::BufferDesc {
                data: sg::slice_as_range(&FULLSCREEN_TRI),
                label: c"fullscreen-tri-vbuf".as_ptr(),
                ..Default::default()
            });
        }

        /* Distant-LOD pipeline (per-body icosphere mesh built at
         * register time). */
        {
            use shaders::distant::*;
            let shd = sg::make_shader(&distant_shader_desc(sg::query_backend()));
            let mut desc = sg::PipelineDesc {
                shader: shd,
                index_type: sg::IndexType::Uint32,
                depth: sg::DepthState {
                    write_enabled: true,
                    compare: sg::CompareFunc::LessEqual,
                    ..Default::default()
                },
                cull_mode: sg::CullMode::Back,
                face_winding: sg::FaceWinding::Ccw,
                label: c"distant-pipeline".as_ptr(),
                ..Default::default()
            };
            desc.layout.attrs[ATTR_DISTANT_A_POS] = sg::VertexAttrState {
                format: sg::VertexFormat::Float3,
                ..Default::default()
            };
            desc.layout.attrs[ATTR_DISTANT_A_NORMAL] = sg::VertexAttrState {
                format: sg::VertexFormat::Float3,
                ..Default::default()
            };
            desc.layout.buffers[0].stride = (6 * std::mem::size_of::<f32>()) as i32;
            r.pip_distant = sg::make_pipeline(&desc);
        }

        /* Smooth UV sphere - shared by sun + atmosphere shells. */
        {
            let (sv, si) = build_uvsphere_mesh();
            r.uvsphere_vbuf = sg::make_buffer(&sg::BufferDesc {
                data: sg::slice_as_range(&sv),
                label: c"uvsphere-vbuf".as_ptr(),
                ..Default::default()
            });
            r.uvsphere_ibuf = sg::make_buffer(&sg::BufferDesc {
                usage: sg::BufferUsage { index_buffer: true, ..Default::default() },
                data: sg::slice_as_range(&si),
                label: c"uvsphere-ibuf".as_ptr(),
                ..Default::default()
            });
            r.uvsphere_index_count = si.len() as i32;
        }

        /* Sun pipeline - emissive front-face sphere. Depth-TESTED so
         * terrain still occludes it, but NOT depth-written: the sun's
         * pixels keep the far-plane depth, so the composite pass reads
         * them as sky and the distance fog never dims the disc. */
        {
            use shaders::sun::*;
            let shd = sg::make_shader(&sun_shader_desc(sg::query_backend()));
            let mut desc = sg::PipelineDesc {
                shader: shd,
                index_type: sg::IndexType::Uint32,
                depth: sg::DepthState {
                    write_enabled: false,
                    compare: sg::CompareFunc::LessEqual,
                    ..Default::default()
                },
                cull_mode: sg::CullMode::Back,
                face_winding: sg::FaceWinding::Ccw,
                label: c"sun-pipeline".as_ptr(),
                ..Default::default()
            };
            desc.layout.attrs[ATTR_SUN_A_POS] = sg::VertexAttrState {
                format: sg::VertexFormat::Float3,
                ..Default::default()
            };
            desc.layout.buffers[0].stride = (3 * std::mem::size_of::<f32>()) as i32;
            r.pip_sun = sg::make_pipeline(&desc);
        }

        bake_atlas(&mut r);
        bake_body_gallery(&mut r);
        load_water_normal(&mut r);
        load_flow_arrow(&mut r);
        load_animal_textures(&mut r);
        load_rocket_textures(&mut r);
        load_station_textures(&mut r);
        load_crop_textures(&mut r);
        /* Per-chunk meshes are allocated lazily once a body registers. */
    });
}

/// Port of `renderer_shutdown()`.
pub fn shutdown() {
    R.with(|cell| {
        let mut r = cell.borrow_mut();
        for body in &mut r.bodies {
            for c in &mut body.chunks[..chunk_n()] {
                c.mesh = HexMesh::new();
                c.water_mesh = HexMesh::new();
                if c.vbuf.id != 0 {
                    sg::destroy_buffer(c.vbuf);
                }
                if c.ibuf.id != 0 {
                    sg::destroy_buffer(c.ibuf);
                }
                if c.water_vbuf.id != 0 {
                    sg::destroy_buffer(c.water_vbuf);
                }
                if c.water_ibuf.id != 0 {
                    sg::destroy_buffer(c.water_ibuf);
                }
            }
            if body.distant_vbuf.id != 0 {
                sg::destroy_buffer(body.distant_vbuf);
            }
            if body.distant_ibuf.id != 0 {
                sg::destroy_buffer(body.distant_ibuf);
            }
            if body.distant_view_albedo.id != 0 {
                sg::destroy_view(body.distant_view_albedo);
            }
            if body.distant_view_normal.id != 0 {
                sg::destroy_view(body.distant_view_normal);
            }
            if body.distant_tex_albedo.id != 0 {
                sg::destroy_image(body.distant_tex_albedo);
            }
            if body.distant_tex_normal.id != 0 {
                sg::destroy_image(body.distant_tex_normal);
            }
            body.tile_to_chunk = Vec::new();
            body.chunk_tile_flat = Vec::new();
        }
        r.bodies.clear();
        r.active_body_idx = -1;
        sg::destroy_view(r.atlas_view);
        sg::destroy_image(r.atlas_img);
        sg::destroy_sampler(r.atlas_smp);
        sg::destroy_view(r.water_normal_view);
        sg::destroy_image(r.water_normal_img);
        sg::destroy_sampler(r.water_normal_smp);
        if r.distant_lod_smp.id != 0 {
            sg::destroy_sampler(r.distant_lod_smp);
        }
        if r.offscreen_color_tex.id != 0 {
            sg::destroy_view(r.offscreen_color_tex);
        }
        if r.offscreen_depth_tex.id != 0 {
            sg::destroy_view(r.offscreen_depth_tex);
        }
        if r.offscreen_color_att.id != 0 {
            sg::destroy_view(r.offscreen_color_att);
        }
        if r.offscreen_depth_att.id != 0 {
            sg::destroy_view(r.offscreen_depth_att);
        }
        if r.offscreen_color.id != 0 {
            sg::destroy_image(r.offscreen_color);
        }
        if r.offscreen_depth.id != 0 {
            sg::destroy_image(r.offscreen_depth);
        }
        sg::destroy_pipeline(r.pip_hex);
        sg::destroy_pipeline(r.pip_water);
        if r.pip_water_mobile.id != 0 {
            sg::destroy_pipeline(r.pip_water_mobile);
        }
        sg::destroy_pipeline(r.pip_composite);
        if r.pip_composite_mobile.id != 0 {
            sg::destroy_pipeline(r.pip_composite_mobile);
        }
        sg::destroy_sampler(r.smp_offscreen);
        sg::destroy_sampler(r.smp_offscreen_depth);
        sg::destroy_pipeline(r.pip_starfield);
        sg::destroy_pipeline(r.pip_atmosphere);
        sg::destroy_buffer(r.fullscreen_tri_vbuf);
        sg::destroy_pipeline(r.pip_distant);
        sg::destroy_pipeline(r.pip_sun);
        sg::destroy_buffer(r.uvsphere_vbuf);
        sg::destroy_buffer(r.uvsphere_ibuf);
    });
}

/* ----------------------------------------------------------------------- */
/* Skybox + sun passes. */

/// Port of `renderer_draw_skybox()`. Pass A: starfield + nebula
/// (always draws). Pass B: atmospheric scattering overlay (gated on
/// the K toggle + per-body strength).
pub fn draw_skybox(view: Mat4, proj: Mat4) {
    R.with(|cell| {
        let r = cell.borrow();
        let basis = camera_basis(view, proj);
        let sky = config::skybox();
        let bg_atten = starfield_bg_atten(&r.env);

        /* ---- Pass A: starfield + nebula (opaque) ---- */
        sg::apply_pipeline(r.pip_starfield);
        /* Counter-rotate the sampling basis by the body's spin so the star
         * field wheels overhead with the day, matching the sun + moons
         * (which are placed via +spin). Only the starfield is rotated;
         * the atmosphere below keeps the true camera basis. */
        let star_basis = spin_basis_y(&basis, -r.env.star_spin_angle);
        let sp = build_starfield_params(&sky, &star_basis, r.time_seconds, bg_atten);
        sg::apply_uniforms(shaders::starfield::UB_STARFIELD_PARAMS, &sg::value_as_range(&sp));
        /* No apply_bindings: the starfield pipeline has no vertex
         * layout and no textures (positions from gl_VertexIndex). */
        sg::draw(0, 3, 1);

        /* ---- Pass B: atmospheric scattering (alpha-blended) ---- */
        if skybox_visible() && r.env.atmo_strength > 0.001 {
            sg::apply_pipeline(r.pip_atmosphere);
            let (avp, afp) = build_atmosphere_params(&r.env, &basis);
            sg::apply_uniforms(
                shaders::atmosphere::UB_ATMOSPHERE_VS_PARAMS,
                &sg::value_as_range(&avp),
            );
            sg::apply_uniforms(
                shaders::atmosphere::UB_ATMOSPHERE_FS_PARAMS,
                &sg::value_as_range(&afp),
            );
            let mut bind = sg::Bindings::new();
            bind.vertex_buffers[0] = r.fullscreen_tri_vbuf;
            sg::apply_bindings(&bind);
            sg::draw(0, 3, 1);
        }
    });
}

/// Port of `renderer_draw_sun()`. Procedural-surface sphere at
/// env.sun_pos (granulation / sunspots / limb darkening / rim - see
/// sun.fs.glsl); look knobs come from solar.yaml. `camera_world` feeds
/// the limb-darkening view term.
pub fn draw_sun(view: Mat4, proj: Mat4, camera_world: Vec3) {
    R.with(|cell| {
        let mut r = cell.borrow_mut();
        if r.env.sun_radius <= 0.0 {
            return;
        }
        /* Far-shell: the 150 km sun slides inside zfar at identical
         * apparent size (see far_shell) - no more crescent clipping. */
        let (sun_pos, sun_radius) = far_shell(camera_world, r.env.sun_pos, r.env.sun_radius);
        let mvp = sun_mvp(view, proj, sun_pos, sun_radius);

        sg::apply_pipeline(r.pip_sun);
        let sun_vs = shaders::sun::SunVsParams { u_mvp: mvp.m };
        sg::apply_uniforms(shaders::sun::UB_SUN_VS_PARAMS, &sg::value_as_range(&sun_vs));
        let sc = config::solar();
        /* Camera in the sun's unit-sphere space (mesh verts are the unit
         * sphere; the model matrix scales by sun_radius). */
        let inv_r = 1.0 / r.env.sun_radius.max(1.0);
        let cam_local = [
            (camera_world.x - r.env.sun_pos.x) * inv_r,
            (camera_world.y - r.env.sun_pos.y) * inv_r,
            (camera_world.z - r.env.sun_pos.z) * inv_r,
        ];
        /* Sim time drives the churn so every client's surface agrees.
         * Wrapped to keep f32 noise coords precise on old worlds; the
         * once-per-wrap reseed is imperceptible on a boiling surface. */
        let t = (tenebris_core::world_time::seconds() % 100_000.0) as f32;
        let sun_fs = shaders::sun::SunFsParams {
            u_color_hot: [sc.sun_color_hot.x, sc.sun_color_hot.y, sc.sun_color_hot.z],
            u_time: t,
            u_color_cool: [sc.sun_color_cool.x, sc.sun_color_cool.y, sc.sun_color_cool.z],
            u_granule_scale: sc.sun_granule_scale,
            u_color_spot: [sc.sun_color_spot.x, sc.sun_color_spot.y, sc.sun_color_spot.z],
            u_churn_speed: sc.sun_churn_speed,
            u_cam_local: cam_local,
            u_limb_power: sc.sun_limb_power,
            u_limb_strength: sc.sun_limb_strength,
            u_rim_boost: sc.sun_rim_boost,
            u_spot_threshold: sc.sun_spot_threshold,
            u_spot_sharpness: sc.sun_spot_sharpness,
            u_warp_amount: sc.sun_warp_amount,
            _pad_84: 0.0,
            u_brightness: sc.sun_brightness,
            _pad_92: 0.0,
        };
        sg::apply_uniforms(shaders::sun::UB_SUN_FS_PARAMS, &sg::value_as_range(&sun_fs));
        let mut bind = sg::Bindings::new();
        bind.vertex_buffers[0] = r.uvsphere_vbuf;
        bind.index_buffer = r.uvsphere_ibuf;
        sg::apply_bindings(&bind);
        sg::draw(0, r.uvsphere_index_count as usize, 1);
        r.tris += (r.uvsphere_index_count / 3) as usize;
    });
}

/* ----------------------------------------------------------------------- */
/* Body registration. */

/// GPU half of `build_distant_textures_for_body()`: discards any
/// previous textures, runs the pure pixel build, uploads.
fn build_distant_textures_for_body(body: &mut ChunkedBody, col_avg: &[Vec3; ATLAS_TILES]) {
    if body.distant_view_albedo.id != 0 {
        sg::destroy_view(body.distant_view_albedo);
        body.distant_view_albedo = sg::View::new();
    }
    if body.distant_view_normal.id != 0 {
        sg::destroy_view(body.distant_view_normal);
        body.distant_view_normal = sg::View::new();
    }
    if body.distant_tex_albedo.id != 0 {
        sg::destroy_image(body.distant_tex_albedo);
        body.distant_tex_albedo = sg::Image::new();
    }
    if body.distant_tex_normal.id != 0 {
        sg::destroy_image(body.distant_tex_normal);
        body.distant_tex_normal = sg::Image::new();
    }
    let bcfg = body.world.borrow().body;
    let (albedo, normal) = build_distant_texture_pixels(&bcfg, body.distant_color, col_avg);

    let mut desc = sg::ImageDesc {
        width: DISTANT_TEX_W,
        height: DISTANT_TEX_H,
        pixel_format: sg::PixelFormat::Rgba8,
        label: c"distant-lod-albedo".as_ptr(),
        ..Default::default()
    };
    desc.data.mip_levels[0] = sg::slice_as_range(&albedo);
    body.distant_tex_albedo = sg::make_image(&desc);
    let mut desc = sg::ImageDesc {
        width: DISTANT_TEX_W,
        height: DISTANT_TEX_H,
        pixel_format: sg::PixelFormat::Rgba8,
        label: c"distant-lod-normal".as_ptr(),
        ..Default::default()
    };
    desc.data.mip_levels[0] = sg::slice_as_range(&normal);
    body.distant_tex_normal = sg::make_image(&desc);
    body.distant_view_albedo = sg::make_view(&sg::ViewDesc {
        texture: sg::TextureViewDesc { image: body.distant_tex_albedo, ..Default::default() },
        label: c"distant-lod-albedo-view".as_ptr(),
        ..Default::default()
    });
    body.distant_view_normal = sg::make_view(&sg::ViewDesc {
        texture: sg::TextureViewDesc { image: body.distant_tex_normal, ..Default::default() },
        label: c"distant-lod-normal-view".as_ptr(),
        ..Default::default()
    });
}

/// GPU half of `build_distant_mesh_for_body()`.
fn build_distant_mesh_for_body(body: &mut ChunkedBody) {
    let levels = config::lod().distant_subdivisions;
    let (vbuf, ibuf) = build_distant_mesh(levels);
    body.distant_vbuf = sg::make_buffer(&sg::BufferDesc {
        data: sg::slice_as_range(&vbuf),
        label: c"body-distant-vbuf".as_ptr(),
        ..Default::default()
    });
    body.distant_ibuf = sg::make_buffer(&sg::BufferDesc {
        usage: sg::BufferUsage { index_buffer: true, ..Default::default() },
        data: sg::slice_as_range(&ibuf),
        label: c"body-distant-ibuf".as_ptr(),
        ..Default::default()
    });
    body.distant_index_count = ibuf.len() as i32;
}

/// Registry bookkeeping half of `renderer_register_world()`: claims a
/// slot, fills the body metadata, picks the first registration as the
/// active body. Returns the slot index, or None when the table is
/// full. GPU work (distant mesh / textures / chunk meshing) happens in
/// [`register_world`].
fn register_world_record(r: &mut Renderer, w: &Rc<RefCell<World>>) -> Option<usize> {
    if r.bodies.len() >= MAX_BODIES {
        return None;
    }
    let slot = r.bodies.len();
    let mut body = ChunkedBody::new(w.clone());
    {
        let wb = w.borrow();
        body.world_pos = Vec3 {
            x: wb.body.pos_x as f32,
            y: wb.body.pos_y as f32,
            z: wb.body.pos_z as f32,
        };
        body.radius_m = wb.body.radius_m as f32;
        body.has_water = wb.body.has_water;
        body.distant_color = body_distant_color(&wb.body);
    }
    body.mesh_cursor = 0;
    if r.active_body_idx < 0 {
        /* First-registered body is the active one - the player spawns
         * on it. */
        r.active_body_idx = slot as i32;
        body.is_active = true;
    }
    r.bodies.push(body);
    Some(slot)
}

/// Test-only registry hook for other modules' headless tests
/// (net_client): take the bookkeeping half of `register_world()` only,
/// skipping the GPU half (no sokol-gfx context under `cargo test`), so
/// `world_for_body()` resolves.
#[cfg(test)]
pub(crate) fn test_register_world(w: &Rc<RefCell<World>>) {
    R.with(|cell| {
        let mut r = cell.borrow_mut();
        let _ = register_world_record(&mut r, w);
    });
}

/// Port of `renderer_register_world()`. The world must already be
/// world_gen_complete. First registration becomes the active body
/// (full mesh now); later ones defer chunk meshing until approach.
pub fn register_world(w: &Rc<RefCell<World>>) {
    R.with(|cell| {
        let mut r = cell.borrow_mut();
        let Some(slot) = register_world_record(&mut r, w) else { return };
        /* Build the far-LOD icosphere + per-body distant textures now
         * (one-shot cost at register time). */
        let col_avg = r.atlas_col_avg;
        build_distant_mesh_for_body(&mut r.bodies[slot]);
        build_distant_textures_for_body(&mut r.bodies[slot], &col_avg);

        let (name, tile_count) = {
            let wb = w.borrow();
            (wb.body.name, wb.tile_count)
        };
        if r.bodies[slot].is_active {
            body_alloc_chunks(&mut r.bodies[slot]);
            body_full_mesh(&mut r, slot);
            for ci in 0..chunk_n() {
                chunk_upload(&mut r.bodies[slot].chunks[ci]);
            }
            r.bodies[slot].chunks_allocated = true;
            r.bodies[slot].meshed = true;
            println!(
                "[renderer] register {} (active): {} tiles, full mesh now",
                name, tile_count
            );
        } else {
            /* Deferred - draws as an icosphere until close enough;
             * renderer_draw_world demand-loads the chunked mesh. */
            r.bodies[slot].is_active = false;
            r.bodies[slot].chunks_allocated = false;
            r.bodies[slot].meshed = false;
            println!(
                "[renderer] register {} (deferred): {} tiles, meshes on approach",
                name, tile_count
            );
        }
    });
}

/// Port of `renderer_register_moon()` - backwards-compat shim.
pub fn register_moon(w: &Rc<RefCell<World>>) {
    register_world(w);
}

/// Rust-port extension: immediate whole-body rebuild after its World
/// was regenerated in place (per-world terrain seed): far-LOD textures,
/// full relight + chunk remesh (rayon), GPU upload. Called by the app's
/// staged loader BETWEEN presented frames (right after the loading
/// screen's commit), so the uploads land in a fresh sokol frame and
/// can't collide with the per-frame dirty sweep's once-per-buffer rule.
pub fn remesh_body_now(body_id: u32) {
    R.with(|cell| {
        let mut r = cell.borrow_mut();
        let r = &mut *r;
        let Some(bi) = (0..r.bodies.len())
            .find(|&i| r.bodies[i].world.borrow().body.id as u32 == body_id)
        else {
            return;
        };
        let col_avg = r.atlas_col_avg;
        build_distant_textures_for_body(&mut r.bodies[bi], &col_avg);
        if !r.bodies[bi].meshed || r.bodies[bi].tile_to_chunk.is_empty() {
            /* Never detail-meshed: nothing chunked on the GPU to
             * refresh - body_load_detail meshes the regenerated world
             * when the body next crosses the LOD cutoff. */
            return;
        }
        let t0 = now_ticks();
        /* body_full_mesh drains the whole dirty queue; the full rebuild
         * subsumes any rolled-over per-chunk dirty flags too. */
        body_full_mesh(r, bi);
        for ci in 0..chunk_n() {
            r.bodies[bi].chunks[ci].dirty = false;
            chunk_upload(&mut r.bodies[bi].chunks[ci]);
        }
        let (name, tile_count) = {
            let w = r.bodies[bi].world.borrow();
            (w.body.name, w.tile_count)
        };
        println!(
            "[renderer] full remesh of {} ({} tiles) after world regen in {:.1} ms",
            name,
            tile_count,
            ticks_ms(ticks_diff(now_ticks(), t0))
        );
    });
}

/// Port of `renderer_world_for_body()`. Used by net_client to apply
/// incoming CHUNK_DIFF messages to the right planet/moon.
pub fn world_for_body(body_id: u32) -> Option<Rc<RefCell<World>>> {
    R.with(|cell| {
        let r = cell.borrow();
        for b in &r.bodies {
            if b.world.borrow().body.id as u32 == body_id {
                return Some(b.world.clone());
            }
        }
        None
    })
}

/// Port of `renderer_body_meshed()`.
pub fn body_meshed(body_id: u32) -> bool {
    R.with(|cell| {
        let r = cell.borrow();
        for b in &r.bodies {
            if b.world.borrow().body.id as u32 == body_id {
                return b.meshed;
            }
        }
        false
    })
}

/// Port of `renderer_moon_count()` - historically "non-active bodies".
pub fn moon_count() -> i32 {
    R.with(|cell| {
        let r = cell.borrow();
        if r.bodies.is_empty() {
            return 0;
        }
        r.bodies.len() as i32 - 1
    })
}

/// Port of `renderer_set_active_world()`. The previously-active body
/// keeps its mesh; only streaming / edit handling moves.
pub fn set_active_world(w: &Rc<RefCell<World>>) {
    R.with(|cell| {
        let mut r = cell.borrow_mut();
        for i in 0..r.bodies.len() {
            if Rc::ptr_eq(&r.bodies[i].world, w) {
                if r.active_body_idx == i as i32 {
                    return; /* already active - no-op */
                }
                let old_name = if r.active_body_idx >= 0 {
                    r.bodies[r.active_body_idx as usize].world.borrow().body.name
                } else {
                    "(none)"
                };
                let new_name = w.borrow().body.name;
                if r.active_body_idx >= 0 {
                    let old = r.active_body_idx as usize;
                    r.bodies[old].is_active = false;
                }
                r.active_body_idx = i as i32;
                r.bodies[i].is_active = true;
                println!("[renderer] active body: {} -> {} (slot {})", old_name, new_name, i);
                return;
            }
        }
        eprintln!(
            "[renderer] WARN: renderer_set_active_world: body={} not found among {} registered bodies",
            w.borrow().body.name,
            r.bodies.len()
        );
    });
}

/* ----------------------------------------------------------------------- */
/* Chunk allocation / upload / rebuild. */

/// Port of `body_alloc_chunks()`. Allocates per-chunk GPU buffers +
/// classifies every tile into its chunk. Idempotent.
fn body_alloc_chunks(body: &mut ChunkedBody) {
    if !body.tile_to_chunk.is_empty() {
        return;
    }
    let (tile_count, name) = {
        let w = body.world.borrow();
        (w.tile_count, w.body.name)
    };
    let nchunks = chunk_n();
    {
        let w = body.world.borrow();
        body.tile_to_chunk = Vec::with_capacity(tile_count as usize);
        for i in 0..tile_count {
            let t = w.grid.tile(i).expect("tile index in range");
            body.tile_to_chunk.push(classify_tile(t.center));
        }
    }

    /* Group tiles by chunk into a flat list (counting sort / prefix
     * sum) so body_chunk_rebuild_full walks only the ~tile_count/nchunks
     * tiles it owns instead of scanning all tile_count of them on every
     * single edit. */
    for ci in 0..nchunks {
        body.chunk_tile_cnt[ci] = 0;
    }
    for i in 0..tile_count as usize {
        body.chunk_tile_cnt[body.tile_to_chunk[i] as usize] += 1;
    }
    let mut acc = 0;
    for ci in 0..nchunks {
        body.chunk_tile_off[ci] = acc;
        acc += body.chunk_tile_cnt[ci];
    }
    body.chunk_tile_flat = vec![0i32; tile_count as usize];
    {
        let mut cursor = [0i32; RENDER_CHUNK_COUNT_MAX];
        cursor[..nchunks].copy_from_slice(&body.chunk_tile_off[..nchunks]);
        for i in 0..tile_count {
            let ci = body.tile_to_chunk[i as usize] as usize;
            body.chunk_tile_flat[cursor[ci] as usize] = i;
            cursor[ci] += 1;
        }
    }

    /* INIT_* are calibrated for a 32-chunk planet. Keep the *total*
     * starting buffer budget constant as the chunk count changes - with
     * more, smaller chunks each one needs proportionally less - so mesh
     * memory tracks content, not chunk count. regrow_buffer doubles any
     * chunk that outgrows its start, and the floors stop a very high
     * count from creating uselessly tiny buffers. */
    const INIT_CALIB_CHUNKS: i32 = 32;
    let mut init_v = INIT_VERTICES * INIT_CALIB_CHUNKS / nchunks as i32;
    let mut init_i = INIT_INDICES * INIT_CALIB_CHUNKS / nchunks as i32;
    let mut init_wv = INIT_WATER_VERTICES * INIT_CALIB_CHUNKS / nchunks as i32;
    let mut init_wi = INIT_WATER_INDICES * INIT_CALIB_CHUNKS / nchunks as i32;
    if init_v < 1024 {
        init_v = 1024;
    }
    if init_i < 3072 {
        init_i = 3072;
    }
    if init_wv < 256 {
        init_wv = 256;
    }
    if init_wi < 768 {
        init_wi = 768;
    }

    for (i, c) in body.chunks.iter_mut().take(nchunks).enumerate() {
        c.mesh.reset();
        c.water_mesh.reset();
        c.vbuf_capacity = init_v;
        c.ibuf_capacity = init_i;
        c.water_vbuf_capacity = init_wv;
        c.water_ibuf_capacity = init_wi;

        let label = CString::new(format!("{}-vbuf-{}", name, i)).unwrap();
        c.vbuf = sg::make_buffer(&sg::BufferDesc {
            size: c.vbuf_capacity as usize * std::mem::size_of::<HexVertex>(),
            usage: sg::BufferUsage { stream_update: true, ..Default::default() },
            label: label.as_ptr(),
            ..Default::default()
        });
        let label = CString::new(format!("{}-ibuf-{}", name, i)).unwrap();
        c.ibuf = sg::make_buffer(&sg::BufferDesc {
            size: c.ibuf_capacity as usize * std::mem::size_of::<u32>(),
            usage: sg::BufferUsage {
                stream_update: true,
                index_buffer: true,
                ..Default::default()
            },
            label: label.as_ptr(),
            ..Default::default()
        });
        let label = CString::new(format!("{}-water-vbuf-{}", name, i)).unwrap();
        c.water_vbuf = sg::make_buffer(&sg::BufferDesc {
            size: c.water_vbuf_capacity as usize * std::mem::size_of::<HexVertex>(),
            usage: sg::BufferUsage { stream_update: true, ..Default::default() },
            label: label.as_ptr(),
            ..Default::default()
        });
        let label = CString::new(format!("{}-water-ibuf-{}", name, i)).unwrap();
        c.water_ibuf = sg::make_buffer(&sg::BufferDesc {
            size: c.water_ibuf_capacity as usize * std::mem::size_of::<u32>(),
            usage: sg::BufferUsage {
                stream_update: true,
                index_buffer: true,
                ..Default::default()
            },
            label: label.as_ptr(),
            ..Default::default()
        });
    }
}

/// Port of `regrow_buffer()`. Sokol stream-update buffers are
/// immutable in size, so destroy + rebuild at the doubled capacity.
fn regrow_buffer(
    old: sg::Buffer,
    capacity: &mut i32,
    needed: i32,
    element_size: usize,
    index_buf: bool,
    label: &std::ffi::CStr,
) -> sg::Buffer {
    let new_cap = grow_capacity(*capacity, needed);
    if old.id != 0 {
        sg::destroy_buffer(old);
    }
    let b = sg::make_buffer(&sg::BufferDesc {
        size: new_cap as usize * element_size,
        usage: sg::BufferUsage {
            stream_update: true,
            index_buffer: index_buf,
            ..Default::default()
        },
        label: label.as_ptr(),
        ..Default::default()
    });
    *capacity = new_cap;
    b
}

/// Port of `chunk_upload()`. Grows GPU buffers when the CPU mesh
/// outgrew them (silent sg_update_buffer overflow was the "terrain
/// under my feet doesn't render" bug), then uploads.
fn chunk_upload(c: &mut MeshChunk) {
    if c.mesh.vertices.len() as i32 > c.vbuf_capacity {
        c.vbuf = regrow_buffer(
            c.vbuf,
            &mut c.vbuf_capacity,
            c.mesh.vertices.len() as i32,
            std::mem::size_of::<HexVertex>(),
            false,
            c"world-vbuf-grow",
        );
    }
    if c.mesh.indices.len() as i32 > c.ibuf_capacity {
        c.ibuf = regrow_buffer(
            c.ibuf,
            &mut c.ibuf_capacity,
            c.mesh.indices.len() as i32,
            std::mem::size_of::<u32>(),
            true,
            c"world-ibuf-grow",
        );
    }
    if c.water_mesh.vertices.len() as i32 > c.water_vbuf_capacity {
        c.water_vbuf = regrow_buffer(
            c.water_vbuf,
            &mut c.water_vbuf_capacity,
            c.water_mesh.vertices.len() as i32,
            std::mem::size_of::<HexVertex>(),
            false,
            c"water-vbuf-grow",
        );
    }
    if c.water_mesh.indices.len() as i32 > c.water_ibuf_capacity {
        c.water_ibuf = regrow_buffer(
            c.water_ibuf,
            &mut c.water_ibuf_capacity,
            c.water_mesh.indices.len() as i32,
            std::mem::size_of::<u32>(),
            true,
            c"water-ibuf-grow",
        );
    }

    if !c.mesh.vertices.is_empty() {
        sg::update_buffer(c.vbuf, &sg::slice_as_range(&c.mesh.vertices));
        sg::update_buffer(c.ibuf, &sg::slice_as_range(&c.mesh.indices));
    }
    c.last_uploaded_index_count = c.mesh.indices.len() as i32;
    if !c.water_mesh.vertices.is_empty() {
        sg::update_buffer(c.water_vbuf, &sg::slice_as_range(&c.water_mesh.vertices));
        sg::update_buffer(c.water_ibuf, &sg::slice_as_range(&c.water_mesh.indices));
    }
    c.last_uploaded_water_idx_count = c.water_mesh.indices.len() as i32;
}

/// Build one chunk's terrain + water meshes from its ordered tile list.
///
/// A chunk holds ~`tile_count / CHUNK_COUNT` tiles (≈5k on a subs=6 body),
/// so a single edit-triggered chunk rebuild meshes thousands of tiles on
/// the main thread. Each tile's geometry is independent (reads `&World`,
/// emits self-relative indices), so for a large chunk we split the tile
/// list into contiguous ascending ranges, build a partial mesh per range
/// across the rayon pool, then stitch the partials back in range order
/// with `HexMesh::append`. Contiguous ranges + ordered append make the
/// result byte-identical to the sequential build (pinned mesh hashes
/// hold). Small chunks build inline to dodge the fan-out overhead.
fn build_chunk_mesh(c: &mut MeshChunk, w: &World, tiles: &[i32], has_water: bool) {
    use rayon::prelude::*;

    c.mesh.reset();
    c.water_mesh.reset();

    /* Below this, the rayon split + merge costs more than it saves. */
    const PARALLEL_MIN_TILES: usize = 512;
    let nthreads = rayon::current_num_threads();
    if tiles.len() < PARALLEL_MIN_TILES || nthreads < 2 {
        for &i in tiles {
            hex_mesher::build_tile(&mut c.mesh, w, i);
            hex_mesher::build_scatter(&mut c.mesh, w, i);
            hex_mesher::build_water(&mut c.water_mesh, w, i);
            if has_water {
                hex_mesher::build_water_voxels(&mut c.water_mesh, w, i);
            }
        }
        return;
    }

    let range_len = tiles.len().div_ceil(nthreads);
    let partials: Vec<(HexMesh, HexMesh)> = tiles
        .par_chunks(range_len)
        .map(|range| {
            let mut mesh = HexMesh::new();
            let mut water = HexMesh::new();
            for &i in range {
                hex_mesher::build_tile(&mut mesh, w, i);
                hex_mesher::build_scatter(&mut mesh, w, i);
                hex_mesher::build_water(&mut water, w, i);
                if has_water {
                    hex_mesher::build_water_voxels(&mut water, w, i);
                }
            }
            (mesh, water)
        })
        .collect();

    for (mesh, water) in &partials {
        c.mesh.append(mesh);
        c.water_mesh.append(water);
    }
}

/// Port of `body_chunk_rebuild_full()`. Drives the lighting BFS to
/// completion BEFORE meshing this chunk so the per-vertex sky/torch
/// values reflect a fully converged grid, then rebuilds the chunk's
/// terrain + water meshes. Tracks the relight session cost (see
/// renderer.c for the full commentary).
fn body_chunk_rebuild_full(r: &mut Renderer, bi: usize, chunk_idx: usize) {
    let world_rc = r.bodies[bi].world.clone();
    let mut w = world_rc.borrow_mut();

    let t_relight_start = now_ticks();
    let mut relight_iters = 0;
    profiler::begin("relight-loop");
    let mut safety = 200;
    while w.light.is_dirty() && safety > 0 {
        safety -= 1;
        hex_mesher::relight_if_needed(&mut w);
        relight_iters += 1;
    }
    profiler::end("relight-loop");
    let relight_ms = ticks_ms(ticks_diff(now_ticks(), t_relight_start));
    if relight_iters > 0 {
        let first_work_this_frame = r.relight_loop_ms_this_frame == 0.0;
        if !r.relight_track.active {
            r.relight_track = RelightTrack {
                active: true,
                started_at: t_relight_start,
                ..Default::default()
            };
        }
        if first_work_this_frame {
            r.relight_track.frames += 1;
        }
        r.relight_track.block_ms_total += relight_ms;
        if relight_ms > r.relight_track.peak_call_ms {
            r.relight_track.peak_call_ms = relight_ms;
        }
        r.relight_track.last_frame_iters += relight_iters;
        if r.relight_track.last_frame_iters > r.relight_track.peak_iters {
            r.relight_track.peak_iters = r.relight_track.last_frame_iters;
        }
    }
    r.relight_loop_ms_this_frame += relight_ms;
    r.relight_iters_this_frame += relight_iters;

    let t_mesh_start = now_ticks();
    profiler::begin("chunk-remesh");
    let tiles_remeshed;
    {
        let body = &mut r.bodies[bi];
        let has_water = body.has_water;
        /* Gather this chunk's own tiles via the precomputed per-chunk
         * flat list (PR#39 perf: O(chunk tiles), not an O(tile_count)
         * full-grid scan), then hand the ascending list to the parallel
         * chunk mesher. Combines main's fast gather with the branch's
         * multithreaded build. */
        let off = body.chunk_tile_off[chunk_idx] as usize;
        let cnt = body.chunk_tile_cnt[chunk_idx] as usize;
        let tiles: Vec<i32> = body.chunk_tile_flat[off..off + cnt]
            .iter()
            .copied()
            .filter(|&i| i < w.gen_cursor)
            .collect();
        tiles_remeshed = tiles.len();
        let c = &mut body.chunks[chunk_idx];
        build_chunk_mesh(c, &w, &tiles, has_water);
    }
    profiler::end("chunk-remesh");
    r.tiles_remeshed += tiles_remeshed;
    r.mesh_rebuild_ms_this_frame += ticks_ms(ticks_diff(now_ticks(), t_mesh_start));
    r.chunks_remeshed_this_frame += 1;

    /* One-shot session summary when world_light reports the session
     * drained back to clean. */
    if let Some(summary) = w.light.consume_session_summary() {
        use tenebris_core::world_light::{
            LIGHT_TRIGGER_BLOCK_EDIT, LIGHT_TRIGGER_FULL_MARK, LIGHT_TRIGGER_TORCH,
        };
        let mut trig = String::new();
        if summary.triggers & LIGHT_TRIGGER_TORCH != 0 {
            trig.push_str("torch ");
        }
        if summary.triggers & LIGHT_TRIGGER_BLOCK_EDIT != 0 {
            trig.push_str("block-edit ");
        }
        if summary.triggers & LIGHT_TRIGGER_FULL_MARK != 0 {
            trig.push_str("full-mark ");
        }
        if trig.is_empty() {
            trig.push_str("(none) ");
        }
        let real_elapsed_ms = ticks_ms(ticks_diff(now_ticks(), r.relight_track.started_at));
        println!(
            "[light] {}rebuild done on {}: blocked {:.2} ms cpu over \
             {} frame(s) (peak {:.2} ms / {} iters in 1 frame), \
             wall {:.0} ms, {} ops, {} call(s), {} edit(s), \
             {} torch(es){}",
            trig,
            w.body.name,
            r.relight_track.block_ms_total,
            r.relight_track.frames,
            r.relight_track.peak_call_ms,
            r.relight_track.peak_iters,
            real_elapsed_ms,
            summary.total_ops,
            summary.total_calls,
            summary.edits_seen,
            summary.torch_count,
            if summary.was_full_pass { ", FULL pass" } else { "" }
        );
        r.relight_track.active = false;
    }
}

/// Port of `body_full_mesh()`. One-shot mesh of every tile in a body
/// into its chunks, with the lighting BFS forced to convergence first
/// (stale light baked into a mesh would persist - see renderer.c).
fn body_full_mesh(r: &mut Renderer, bi: usize) {
    let world_rc = r.bodies[bi].world.clone();
    let mut w = world_rc.borrow_mut();

    let t_relight_start = now_ticks();
    let mut relight_iters = 0;
    profiler::begin("relight-loop");
    let mut safety = 200;
    while w.light.is_dirty() && safety > 0 {
        safety -= 1;
        hex_mesher::relight_if_needed(&mut w);
        relight_iters += 1;
    }
    profiler::end("relight-loop");
    let relight_ms = ticks_ms(ticks_diff(now_ticks(), t_relight_start));
    r.relight_loop_ms_this_frame += relight_ms;
    r.relight_iters_this_frame += relight_iters;
    if relight_ms > 1.0 {
        println!(
            "[light] body_full_mesh relight on {}: {:.2} ms in {} call(s)",
            w.body.name, relight_ms, relight_iters
        );
    }

    let t_mesh_start = now_ticks();
    profiler::begin("chunk-remesh");
    {
        use rayon::prelude::*;
        let body = &mut r.bodies[bi];
        let has_water = body.has_water;
        let gen = w.gen_cursor.min(w.tile_count);

        /* Bucket generated tiles into their owning chunk, ascending tile
         * order preserved so each chunk's mesh-append order is identical
         * to the old sequential path (mesh output stays byte-for-byte
         * stable - the pinned hex_mesher hashes still hold). */
        let mut buckets: Vec<Vec<i32>> = vec![Vec::new(); body.chunks.len()];
        for i in 0..gen {
            let ci = body.tile_to_chunk[i as usize] as usize;
            buckets[ci].push(i);
        }

        /* Fan the per-chunk CPU mesh build across the rayon pool. Each
         * closure writes only its own chunk's HexMesh and reads &World
         * immutably; World is plain Vec storage (Send + Sync), so the
         * shared borrow is race-free. GL uploads stay on the caller
         * (GL) thread - see the chunk_upload loop at the call site. */
        let w_ref: &World = &w;
        body
            .chunks
            .par_iter_mut()
            .zip(buckets.into_par_iter())
            .for_each(|(c, tiles)| {
                c.mesh.reset();
                c.water_mesh.reset();
                for i in tiles {
                    hex_mesher::build_tile(&mut c.mesh, w_ref, i);
                    hex_mesher::build_scatter(&mut c.mesh, w_ref, i);
                    if has_water {
                        hex_mesher::build_water(&mut c.water_mesh, w_ref, i);
                        hex_mesher::build_water_voxels(&mut c.water_mesh, w_ref, i);
                    }
                }
            });
    }
    /* This pass meshed every generated tile, so every dirty tile is now
     * resolved: drain the whole dirty queue (clears the bits + empties
     * it) in one shot. Routes through dirty_consume - not a per-tile
     * tile_clear_dirty loop - so the dirty_queue the per-frame remesh
     * path drains doesn't keep stale entries after a full mesh. */
    w.dirty_consume();
    profiler::end("chunk-remesh");
    r.mesh_rebuild_ms_this_frame += ticks_ms(ticks_diff(now_ticks(), t_mesh_start));
    r.bodies[bi].streamed_complete = true;
    r.bodies[bi].mesh_cursor = w.tile_count;
    /* Consume any session the full BFS pass completed so the next
     * consume on a different body / chunk path doesn't pick it up. */
    if let Some(summary) = w.light.consume_session_summary() {
        println!(
            "[light] body_full_mesh session done on {}: {} ops, {} call(s), trig=0x{:x}{}",
            w.body.name,
            summary.total_ops,
            summary.total_calls,
            summary.triggers,
            if summary.was_full_pass { ", FULL pass" } else { "" }
        );
    }
}

/// Port of `body_load_detail()`. Demand-load the chunked terrain the
/// first frame a previously-distant body crosses the LOD cutoff.
fn body_load_detail(r: &mut Renderer, bi: usize) {
    if r.bodies[bi].meshed {
        return;
    }
    let t0 = now_ticks();
    /* Kick the lazy per-body fetch of persisted .col files. Idempotent
     * within a connection; the response lands async on the world's
     * blocks + dirty bits and the per-frame remesh sweep picks it up. */
    let body_id = r.bodies[bi].world.borrow().body.id as u32;
    net_client::fetch_body_saves(body_id);
    if !r.bodies[bi].chunks_allocated {
        body_alloc_chunks(&mut r.bodies[bi]);
        r.bodies[bi].chunks_allocated = true;
    }
    body_full_mesh(r, bi);
    for ci in 0..chunk_n() {
        chunk_upload(&mut r.bodies[bi].chunks[ci]);
    }
    r.bodies[bi].meshed = true;
    let elapsed_ms = ticks_ms(ticks_diff(now_ticks(), t0));
    let (name, tile_count) = {
        let w = r.bodies[bi].world.borrow();
        (w.body.name, w.tile_count)
    };
    println!(
        "[renderer] loaded detail for {} (body={}, {} tiles) in {:.1} ms - \
         compare net-client body-totals for this body to /saves output",
        name, body_id, tile_count, elapsed_ms
    );
}

/// Port of `body_unload_detail()`. Releases the per-chunk CPU meshes +
/// GPU buffers + tile->chunk table; the distant LOD assets stay live.
fn body_unload_detail(body: &mut ChunkedBody) {
    if !body.meshed && !body.chunks_allocated {
        return;
    }
    for c in &mut body.chunks[..chunk_n()] {
        c.mesh = HexMesh::new();
        c.water_mesh = HexMesh::new();
        if c.vbuf.id != 0 {
            sg::destroy_buffer(c.vbuf);
            c.vbuf = sg::Buffer::new();
        }
        if c.ibuf.id != 0 {
            sg::destroy_buffer(c.ibuf);
            c.ibuf = sg::Buffer::new();
        }
        if c.water_vbuf.id != 0 {
            sg::destroy_buffer(c.water_vbuf);
            c.water_vbuf = sg::Buffer::new();
        }
        if c.water_ibuf.id != 0 {
            sg::destroy_buffer(c.water_ibuf);
            c.water_ibuf = sg::Buffer::new();
        }
        c.last_uploaded_index_count = 0;
        c.last_uploaded_water_idx_count = 0;
        c.vbuf_capacity = 0;
        c.ibuf_capacity = 0;
        c.water_vbuf_capacity = 0;
        c.water_ibuf_capacity = 0;
    }
    body.tile_to_chunk = Vec::new();
    body.chunk_tile_flat = Vec::new();
    body.chunks_allocated = false;
    body.meshed = false;
    let (name, id) = {
        let w = body.world.borrow();
        (w.body.name, w.body.id as u32)
    };
    println!("[renderer] unloaded detail for {} (body={}) - far-LOD only now", name, id);
}

/* ----------------------------------------------------------------------- */
/* Distant-body (far LOD) pass. */

/// Port of `renderer_draw_moons()`. Draws every body that ISN'T
/// drawing chunks as a textured icosphere. Exactly one body is allowed
/// to draw chunks at a time (the active one within 5 km), so this is
/// the exact inverse of the terrain pass's condition.
/// Re-place every registered body for this frame from the on-rails orbit
/// sim: each body is drawn where it appears in the `active` body's rotating
/// surface frame at sim-time `t`. The active body maps to its own static
/// centre (the player never moves), so the call is uniform over all bodies.
/// Drives the in-sky motion of moons + planets; the sun direction is
/// computed alongside in app.rs from `orbit::sun_direction`.
pub fn update_celestial(active: BodyId, t: f64) {
    R.with(|cell| {
        let r = &mut *cell.borrow_mut();
        for b in &mut r.bodies {
            let id = b.world.borrow().body.id;
            b.world_pos = dvec3_to_vec3(orbit::apparent_pos(active, id, t));
        }
    });
}

pub fn draw_moons(view: Mat4, proj: Mat4, camera_world: Vec3) {
    R.with(|cell| {
        let mut r = cell.borrow_mut();
        if r.bodies.is_empty() {
            return;
        }

        let vp_base = mat4_mul(proj, view);
        let frustum = extract_frustum(vp_base);

        sg::apply_pipeline(r.pip_distant);
        let mut tris = 0usize;
        for bi in 0..r.bodies.len() {
            let body = &r.bodies[bi];
            if body.distant_index_count <= 0 {
                continue;
            }
            if !sphere_visible(&frustum, body.world_pos, body.radius_m * 1.5) {
                continue;
            }
            let delta = vec3_sub(body.world_pos, camera_world);
            let mut dist = vec3_length(delta);
            if dist < 1.0 {
                dist = 1.0;
            }
            /* Mirror the terrain pass's decision (inverted): LOD renders
             * when chunked didn't. Reads the cached per-frame verdict
             * (anchor + hysteresis) instead of recomputing, so the two
             * passes can never disagree mid-flap. */
            let _ = dist;
            if body.chunked_now {
                continue;
            }

            /* Far-shell: outer planets (Sequoia at 200 km, ...) slide
             * inside zfar at identical apparent size, same protocol as
             * the sun - order-preserving, so mutual occlusion holds. */
            let (fs_pos, fs_radius) = far_shell(camera_world, body.world_pos, body.radius_m);
            let model = mat4_mul(mat4_translate(fs_pos), mat4_scale_uniform(fs_radius));
            let mvp = mat4_mul(vp_base, model);
            /* Per-body distant albedo + normal views + the shared
             * linear-clamp sampler. Skip if not built yet (rare init
             * race). */
            if body.distant_view_albedo.id == 0 || body.distant_view_normal.id == 0 {
                continue;
            }
            let mut bind = sg::Bindings::new();
            bind.vertex_buffers[0] = body.distant_vbuf;
            bind.index_buffer = body.distant_ibuf;
            bind.views[shaders::distant::VIEW_TEX_ALBEDO] = body.distant_view_albedo;
            bind.views[shaders::distant::VIEW_TEX_NORMAL] = body.distant_view_normal;
            bind.samplers[shaders::distant::SMP_SMP_CLAMP] = r.distant_lod_smp;
            sg::apply_bindings(&bind);
            let dvp = shaders::distant::DistantVsParams { u_mvp: mvp.m };
            sg::apply_uniforms(shaders::distant::UB_DISTANT_VS_PARAMS, &sg::value_as_range(&dvp));
            let wc = config::water();
            let lc = config::lod();
            let rim = rim_color_for(&lc, body.world.borrow().body.tileset as usize);
            let dfp = shaders::distant::DistantFsParams {
                u_sun_dir: [r.env.sun_dir.x, r.env.sun_dir.y, r.env.sun_dir.z],
                u_pad0: 0.0,
                u_ambient: overcast_ambient(r.env.ambient),
                u_pad1: 0.0,
                u_camera_pos: [camera_world.x, camera_world.y, camera_world.z],
                u_normal_strength: 0.6,
                u_water_specular_tint: [wc.sun_tint.x, wc.sun_tint.y, wc.sun_tint.z],
                u_water_specular_intensity: wc.specular_intensity,
                u_water_specular_power: wc.specular_power,
                u_pad2: 0.0,
                u_pad3: 0.0,
                u_pad4: 0.0,
                u_rim_color: [rim.x, rim.y, rim.z],
                u_rim_power: lc.distant_rim_power,
                u_rim_intensity: lc.distant_rim_intensity,
                u_rim_floor: lc.distant_rim_floor,
                u_pad5: 0.0,
                u_pad6: 0.0,
            };
            sg::apply_uniforms(shaders::distant::UB_DISTANT_FS_PARAMS, &sg::value_as_range(&dfp));
            sg::draw(0, body.distant_index_count as usize, 1);
            tris += (body.distant_index_count / 3) as usize;
        }
        r.tris += tris;
    });
}

/* ----------------------------------------------------------------------- */
/* Offscreen targets + frame begin / compose / end. */

/// Port of `ensure_offscreen_targets()`. Colour + depth render targets
/// sized to the swapchain; recreated on resize (no in-place resize in
/// sokol). DEPTH_STENCIL so the offscreen depth matches the default
/// swapchain depth format and stays texture-sampleable on WebGL2.
fn ensure_offscreen_targets(r: &mut Renderer, w: i32, h: i32) {
    if w <= 0 || h <= 0 {
        return;
    }
    if r.offscreen_color.id != 0 && r.offscreen_w == w && r.offscreen_h == h {
        return;
    }
    if r.offscreen_color_tex.id != 0 {
        sg::destroy_view(r.offscreen_color_tex);
    }
    if r.offscreen_depth_tex.id != 0 {
        sg::destroy_view(r.offscreen_depth_tex);
    }
    if r.offscreen_color_att.id != 0 {
        sg::destroy_view(r.offscreen_color_att);
    }
    if r.offscreen_depth_att.id != 0 {
        sg::destroy_view(r.offscreen_depth_att);
    }
    if r.offscreen_color.id != 0 {
        sg::destroy_image(r.offscreen_color);
    }
    if r.offscreen_depth.id != 0 {
        sg::destroy_image(r.offscreen_depth);
    }
    for v in [r.mid_color_tex, r.mid_depth_tex, r.mid_color_att, r.mid_depth_att] {
        if v.id != 0 {
            sg::destroy_view(v);
        }
    }
    if r.mid_color.id != 0 {
        sg::destroy_image(r.mid_color);
    }
    if r.mid_depth.id != 0 {
        sg::destroy_image(r.mid_depth);
    }

    r.offscreen_color = sg::make_image(&sg::ImageDesc {
        usage: sg::ImageUsage { color_attachment: true, ..Default::default() },
        width: w,
        height: h,
        pixel_format: sg::PixelFormat::Rgba8,
        sample_count: 1,
        label: c"offscreen-color".as_ptr(),
        ..Default::default()
    });
    r.offscreen_depth = sg::make_image(&sg::ImageDesc {
        usage: sg::ImageUsage { depth_stencil_attachment: true, ..Default::default() },
        width: w,
        height: h,
        pixel_format: sg::PixelFormat::DepthStencil,
        sample_count: 1,
        label: c"offscreen-depth".as_ptr(),
        ..Default::default()
    });
    r.offscreen_color_att = sg::make_view(&sg::ViewDesc {
        color_attachment: sg::ImageViewDesc { image: r.offscreen_color, ..Default::default() },
        label: c"offscreen-color-att".as_ptr(),
        ..Default::default()
    });
    r.offscreen_depth_att = sg::make_view(&sg::ViewDesc {
        depth_stencil_attachment: sg::ImageViewDesc {
            image: r.offscreen_depth,
            ..Default::default()
        },
        label: c"offscreen-depth-att".as_ptr(),
        ..Default::default()
    });
    r.offscreen_color_tex = sg::make_view(&sg::ViewDesc {
        texture: sg::TextureViewDesc { image: r.offscreen_color, ..Default::default() },
        label: c"offscreen-color-tex".as_ptr(),
        ..Default::default()
    });
    r.offscreen_depth_tex = sg::make_view(&sg::ViewDesc {
        texture: sg::TextureViewDesc { image: r.offscreen_depth, ..Default::default() },
        label: c"offscreen-depth-tex".as_ptr(),
        ..Default::default()
    });
    /* Intermediate (post-water) targets - same formats as the offscreen. */
    r.mid_color = sg::make_image(&sg::ImageDesc {
        usage: sg::ImageUsage { color_attachment: true, ..Default::default() },
        width: w,
        height: h,
        pixel_format: sg::PixelFormat::Rgba8,
        sample_count: 1,
        label: c"mid-color".as_ptr(),
        ..Default::default()
    });
    r.mid_depth = sg::make_image(&sg::ImageDesc {
        usage: sg::ImageUsage { depth_stencil_attachment: true, ..Default::default() },
        width: w,
        height: h,
        pixel_format: sg::PixelFormat::DepthStencil,
        sample_count: 1,
        label: c"mid-depth".as_ptr(),
        ..Default::default()
    });
    r.mid_color_att = sg::make_view(&sg::ViewDesc {
        color_attachment: sg::ImageViewDesc { image: r.mid_color, ..Default::default() },
        label: c"mid-color-att".as_ptr(),
        ..Default::default()
    });
    r.mid_depth_att = sg::make_view(&sg::ViewDesc {
        depth_stencil_attachment: sg::ImageViewDesc { image: r.mid_depth, ..Default::default() },
        label: c"mid-depth-att".as_ptr(),
        ..Default::default()
    });
    r.mid_color_tex = sg::make_view(&sg::ViewDesc {
        texture: sg::TextureViewDesc { image: r.mid_color, ..Default::default() },
        label: c"mid-color-tex".as_ptr(),
        ..Default::default()
    });
    r.mid_depth_tex = sg::make_view(&sg::ViewDesc {
        texture: sg::TextureViewDesc { image: r.mid_depth, ..Default::default() },
        label: c"mid-depth-tex".as_ptr(),
        ..Default::default()
    });
    r.offscreen_w = w;
    r.offscreen_h = h;
}

/// Port of `renderer_begin_frame()`. Opens the offscreen opaque pass;
/// `compose_to_swapchain` ends it and opens the swapchain pass.
pub fn begin_frame(w: i32, h: i32, env: RenderEnv) {
    R.with(|cell| {
        let mut r = cell.borrow_mut();
        ensure_offscreen_targets(&mut r, w, h);
        r.env = env;
        r.tris = 0;
        r.tiles_remeshed = 0;
        r.relight_loop_ms_this_frame = 0.0;
        r.relight_iters_this_frame = 0;
        r.mesh_rebuild_ms_this_frame = 0.0;
        r.chunks_remeshed_this_frame = 0;
        if r.relight_track.active {
            r.relight_track.last_frame_iters = 0;
        }

        let mut pass_action = sg::PassAction::new();
        pass_action.colors[0] = sg::ColorAttachmentAction {
            load_action: sg::LoadAction::Clear,
            clear_value: sg::Color {
                r: env.sky_bottom.x,
                g: env.sky_bottom.y,
                b: env.sky_bottom.z,
                a: 1.0,
            },
            ..Default::default()
        };
        pass_action.depth = sg::DepthAttachmentAction {
            load_action: sg::LoadAction::Clear,
            clear_value: 1.0,
            ..Default::default()
        };
        r.pass_action = pass_action;
        let mut pass = sg::Pass {
            action: r.pass_action,
            label: c"offscreen-scene".as_ptr(),
            ..Default::default()
        };
        pass.attachments.colors[0] = r.offscreen_color_att;
        pass.attachments.depth_stencil = r.offscreen_depth_att;
        sg::begin_pass(&pass);
    });
}

/// Port of `renderer_compose_to_swapchain()`. Ends the offscreen pass,
/// opens the swapchain pass, draws the fullscreen composite (with the
/// underwater fog + distortion post-process on desktop; a plain
/// depth-forwarding blit + view-distance fog in perf mode).
thread_local! {
    /// Composite params stashed by the desktop compose pass so the final LENS
    /// pass ([`draw_lens_to_swapchain`]) can reuse them with lens_mode flipped.
    static FRAME_COMP_FS: std::cell::RefCell<Option<shaders::composite::CompositeFsParams>> =
        const { std::cell::RefCell::new(None) };
    static FRAME_COMP_VS: std::cell::RefCell<Option<shaders::composite::CompositeVsParams>> =
        const { std::cell::RefCell::new(None) };
}

pub fn compose_to_swapchain(view: Mat4, proj: Mat4) {
    R.with(|cell| {
        let r = cell.borrow();
        /* Flush the world-space sgl entities (animals / crops / remote
         * players) into the offscreen scene while its depth buffer is
         * still bound: terrain occludes them properly and they get the
         * composite + water refraction. The default sgl context (UI)
         * keeps its own buffer and flushes at end-of-frame as before. */
        /* Baked station drum, OPAQUE groups: before the sgl entity flush
         * so entities depth-test against the hull. (Glass flushes after -
         * see below.) No-op unless station_fx requested a near-draw. */
        crate::station_fx::flush_baked_opaque();
        let world_ctx = SGL_WORLD_CTX.with(|c| c.get());
        if world_ctx.id != 0 {
            /* Overflow watchdog: a saturated sokol_gl context DRAWS NOTHING
             * for the frame, silently - this is how the storm cloud deck
             * vanished. If the (now much larger) pool ever fills again, say
             * so out loud instead of letting entities disappear unexplained.
             * Throttled so a sustained overflow can't flood the console. */
            let err = sgl::context_error(world_ctx);
            if err.any {
                let now = time_seconds() as f64;
                let last = SGL_OVERFLOW_LAST_LOG_S.with(|c| c.get());
                if now - last > 5.0 {
                    SGL_OVERFLOW_LAST_LOG_S.with(|c| c.set(now));
                    eprintln!(
                        "[renderer] WARN: world sgl context overflow - nothing \
                         drawn this frame (vertices_full={} commands_full={} \
                         uniforms_full={}). Entity/cloud geometry exceeds the \
                         pool; raise max_vertices in sgl_world_ctx or thin the \
                         emitters.",
                        err.vertices_full, err.commands_full, err.uniforms_full
                    );
                }
            }
            sgl::context_draw(world_ctx);
        }
        /* Baked station GLASS: after the entities so the glazing blends
         * over the finished scene (depth-tested, no write). */
        crate::station_fx::flush_baked_glass();
        sg::end_pass();

        /* Desktop: composite (droplets stripped) renders into the INTERMEDIATE
         * target, NOT the swapchain - the water pass draws over it and the
         * final LENS pass (draw_lens_to_swapchain) samples this post-water
         * image so the camera droplets refract the real water. Perf/mobile
         * keeps the old direct-to-swapchain path (no lens droplets there). */
        let mut pass = sg::Pass::default();
        if perf_mode_enabled() {
            pass.label = c"swapchain-composite".as_ptr();
            pass.swapchain = sokol::glue::swapchain();
        } else {
            pass.label = c"mid-composite".as_ptr();
            pass.attachments.colors[0] = r.mid_color_att;
            pass.attachments.depth_stencil = r.mid_depth_att;
        }
        pass.action.colors[0] = sg::ColorAttachmentAction {
            load_action: sg::LoadAction::Clear,
            clear_value: sg::Color { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
            ..Default::default()
        };
        pass.action.depth = sg::DepthAttachmentAction {
            load_action: sg::LoadAction::Clear,
            clear_value: 1.0,
            ..Default::default()
        };
        sg::begin_pass(&pass);

        /* Underwater fog colours, tinted by the active body's tileset
         * (Sequoia = green) with global water config fallback. */
        let w_cu = config::water();
        let mut comp_deep = w_cu.deep_color;
        let mut comp_absorb = w_cu.absorption;
        if r.active_body_idx >= 0 {
            let lp = config::lod();
            let mut ts = r.bodies[r.active_body_idx as usize].world.borrow().body.tileset as i32;
            if !(0..=4).contains(&ts) {
                ts = 0;
            }
            let ts = ts as usize;
            if lp.tileset_water_deep_color[ts].x > 0.0
                || lp.tileset_water_deep_color[ts].y > 0.0
                || lp.tileset_water_deep_color[ts].z > 0.0
            {
                comp_deep = lp.tileset_water_deep_color[ts];
            }
            if lp.tileset_water_absorption[ts].x > 0.0
                || lp.tileset_water_absorption[ts].y > 0.0
                || lp.tileset_water_absorption[ts].z > 0.0
            {
                comp_absorb = lp.tileset_water_absorption[ts];
            }
        }
        /* cam_under is voxel-driven: only flag underwater when the
         * camera's containing block is actually BLOCK_WATER (caves dug
         * below sea level stay crisp). */
        let mut cam_under_shared = false;
        /* Partially submerged: the camera is straddling the water surface, so
         * the lens should be wet with drips ABOVE the waterline only. This is
         * NOT "a water voxel sits somewhere below me" (that is true all along a
         * shoreline while walking dry): it is a wave-height test at the eye -
         * water must be present here AND the eye must sit within a thin band of
         * the actual sea surface. Walking along the water with the eye a metre
         * above the surface stays dry. */
        let mut cam_partial_shared = false;
        if r.active_body_idx >= 0 {
            let ab = &r.bodies[r.active_body_idx as usize];
            let cam_local = vec3_sub(r.env.camera_world, ab.world_pos);
            let world = ab.world.borrow();
            let cam_blk = world.block_at_pos(cam_local, -1);
            cam_under_shared = cam_blk == Block::Water;
            let cam_r = (cam_local.x * cam_local.x
                + cam_local.y * cam_local.y
                + cam_local.z * cam_local.z)
                .sqrt()
                .max(1e-3);
            /* Mean sea surface radius - the SAME reference the composite's
             * per-pixel waterline mask uses (planet_params.w), so CPU "am I
             * straddling" and GPU "is this pixel above water" agree. */
            let sea_surf_r = ab.radius_m
                + tenebris_core::planet_gen::sea_raise_m(&world.body)
                + w_cu.height_offset_m
                - w_cu.depth_offset_m;
            /* Water present at the eye: the eye voxel, or the voxel just below
             * it, is water (so a dry beach at sea-level altitude never arms). */
            let water_here = cam_under_shared || {
                let probe = config::water().partial_band_m;
                let below = Vec3 {
                    x: cam_local.x - cam_local.x / cam_r * probe,
                    y: cam_local.y - cam_local.y / cam_r * probe,
                    z: cam_local.z - cam_local.z / cam_r * probe,
                };
                world.block_at_pos(below, -1) == Block::Water
            };
            let eye_above = cam_r - sea_surf_r; /* >0 above surface, <0 below */
            let band = config::water().partial_band_m;
            cam_partial_shared = water_here && eye_above > -band && eye_above < band;
        }
        /* Fully-submerged flag for the lens FX: the eye is in water AND not
         * merely straddling the surface. When straddling we clear it so the
         * composite still runs the drops (masked to the above-water half);
         * when truly under it stays set so all lens FX are skipped. */
        let cam_under_fx = cam_under_shared && !cam_partial_shared;

        /* Perf mode: blit + forward depth, then screen-wide
         * Beer-Lambert fog when the camera is in a water voxel. */
        if perf_mode_enabled() {
            sg::apply_pipeline(r.pip_composite_mobile);
            let fs_m = shaders::composite_mobile::CompositeMobileFsParams {
                deep_color: [comp_deep.x, comp_deep.y, comp_deep.z, 0.0],
                absorption: [comp_absorb.x, comp_absorb.y, comp_absorb.z, 0.0],
                fog_params: [0.3, 20000.0, if cam_under_shared { 1.0 } else { 0.0 }, 0.0],
            };
            sg::apply_uniforms(
                shaders::composite_mobile::UB_COMPOSITE_MOBILE_FS_PARAMS,
                &sg::value_as_range(&fs_m),
            );
            let mut bind = sg::Bindings::new();
            bind.views[shaders::composite_mobile::VIEW_SCENE_COLOR_MOBILE] =
                r.offscreen_color_tex;
            bind.views[shaders::composite_mobile::VIEW_SCENE_DEPTH_MOBILE] =
                r.offscreen_depth_tex;
            bind.samplers[shaders::composite_mobile::SMP_SCENE_MOBILE_SMP] = r.smp_offscreen;
            bind.samplers[shaders::composite_mobile::SMP_SCENE_DEPTH_MOBILE_SMP] =
                r.smp_offscreen_depth;
            sg::apply_bindings(&bind);
            sg::draw(0, 3, 1);
            return;
        }

        sg::apply_pipeline(r.pip_composite);

        /* Same camera-basis extraction the skybox + atmosphere passes
         * use, so the underwater post-process reconstructs world rays
         * with the same convention. */
        let basis = camera_basis(view, proj);
        let vs = shaders::composite::CompositeVsParams {
            cam_right: [basis.right[0], basis.right[1], basis.right[2], basis.tan_half],
            cam_up: [basis.up[0], basis.up[1], basis.up[2], basis.aspect],
            cam_forward: [basis.fwd[0], basis.fwd[1], basis.fwd[2], 0.0],
            camera_pos: [r.env.camera_world.x, r.env.camera_world.y, r.env.camera_world.z, 0.0],
        };
        FRAME_COMP_VS.with(|c| *c.borrow_mut() = Some(vs));
        sg::apply_uniforms(shaders::composite::UB_COMPOSITE_VS_PARAMS, &sg::value_as_range(&vs));

        /* Wet-mask gate body parameters; sea radius derived the same
         * way hex_mesher places the actual cap. */
        let w = &w_cu;
        let mut body_center = Vec3::default();
        let mut sea_radius = 0.0f32;
        let cam_under = cam_under_fx;
        /* Emerge-from-water drips: on the underwater -> surface edge, arm a
         * dry-off window; the drips overlay runs while it counts down. */
        {
            const DRY_SECONDS: f64 = 2.6;
            let now = r.time_seconds as f64;
            let was_under = PREV_UNDER.with(|c| c.get());
            /* Arm the dry-off window when we leave the water AND keep it topped
             * up every frame while partially submerged, so the lens stays wet
             * (drips above the waterline) until we fully clear the surface. */
            if (was_under && !cam_under) || cam_partial_shared {
                EMERGE_END_S.with(|c| c.set(now + DRY_SECONDS));
            }
            PREV_UNDER.with(|c| c.set(cam_under));
            let emerge = if cam_under {
                0.0 /* still submerged - no drips yet */
            } else {
                let end = EMERGE_END_S.with(|c| c.get());
                (((end - now) / DRY_SECONDS).clamp(0.0, 1.0)) as f32
            };
            FRAME_EMERGE.with(|c| c.set(emerge));
        }
        /* Atmospheric distance fog: the active body's atmosphere.yaml
         * knobs, dimmed by the local daylight (night fog goes dark, not
         * milky) and faded out with camera altitude - climb above the
         * weather and the vista clears. Density 0 = fog off. */
        let mut fog = [0.0f32; 4];
        if r.active_body_idx >= 0 {
            let ab = &r.bodies[r.active_body_idx as usize];
            body_center = ab.world_pos;
            sea_radius = ab.radius_m
                + tenebris_core::planet_gen::sea_raise_m(&ab.world.borrow().body)
                + w.height_offset_m
                - w.depth_offset_m;

            /* Weather at the camera: overcast coverage + whether it's
             * precipitating here. Overcast dims the terrain lighting;
             * precipitation + cloud thicken the fog. Sampled every frame
             * (independent of the fog-density gate). */
            let (wx_overcast, wx_precip, wx_is_rain) = {
                let world = ab.world.borrow();
                let cam = vec3_sub(r.env.camera_world, body_center);
                let cr = (cam.x * cam.x + cam.y * cam.y + cam.z * cam.z).sqrt().max(1e-3);
                let dir = tenebris_core::math::dvec3_make(
                    (cam.x / cr) as f64,
                    (cam.y / cr) as f64,
                    (cam.z / cr) as f64,
                );
                let t = tenebris_core::world_time::seconds();
                let cell = tenebris_core::weather::cloud_cell(&world.body, dir, t);
                /* Dev override forces a full overcast storm here too, so the
                 * fog + lighting change matches the forced precipitation.
                 * Snow counts as precipitation (fog + overcast) but is NOT
                 * liquid, so it must not wet surfaces - only RAIN drives the
                 * ripple / wet-sheen / lens-droplet shaders. */
                use tenebris_core::weather::Precip;
                match crate::weather_fx::forced_precip() {
                    Some(k) => (1.0, true, k == Precip::Rain),
                    None => (
                        cell.cover,
                        cell.raining,
                        cell.raining && cell.precip == Precip::Rain,
                    ),
                }
            };
            FRAME_OVERCAST.with(|c| c.set(wx_overcast));
            /* Camera altitude above the surface + the cloud-deck height: the
             * rain-on-glass lens FX only makes sense when the camera is down
             * in the weather (below the clouds), never from orbit. */
            let cam_alt = {
                let c = vec3_sub(r.env.camera_world, body_center);
                (c.x * c.x + c.y * c.y + c.z * c.z).sqrt() - ab.radius_m
            };
            let cloud_deck = tenebris_core::clouds::config().altitude_m;
            let in_weather_layer = cam_alt < cloud_deck;
            /* Wet terrain while it's raining at the camera: a strong base
             * wetness the moment precipitation starts, deepening a touch
             * under heavier overcast. Dry (0) otherwise, and never on the
             * lens from above the cloud deck / in space. */
            let wet_target = if wx_precip && wx_is_rain && in_weather_layer {
                (0.55 + 0.45 * wx_overcast).min(1.0)
            } else {
                0.0
            };
            /* Ease the wet level toward its target instead of snapping, so the
             * rain-on-glass lens + terrain sheen fade in when the camera enters
             * a rainy region and fade out when it leaves. Exponential smoothing
             * with a config time-constant; dt from the monotonic frame clock. */
            let tau = tenebris_core::weather::config().wet_fade_tau_s;
            let now_t = r.time_seconds;
            let prev_t = WET_PREV_T.with(|c| c.get());
            let dt = if prev_t < 0.0 { 0.0 } else { (now_t - prev_t).clamp(0.0, 0.25) };
            WET_PREV_T.with(|c| c.set(now_t));
            let k = if tau > 1e-4 { 1.0 - (-dt / tau).exp() } else { 1.0 };
            let prev_wet = FRAME_WET.with(|c| c.get());
            let wet_now = prev_wet + (wet_target - prev_wet) * k;
            FRAME_WET.with(|c| c.set(wet_now));

            let bc = tenebris_core::planet::get(ab.world.borrow().body.id);
            if bc.atmo_fog_density > 0.0 {
                let cam = vec3_sub(r.env.camera_world, body_center);
                let cam_r = (cam.x * cam.x + cam.y * cam.y + cam.z * cam.z).sqrt().max(1e-3);
                /* Fog colour = the ACTUAL Caelum sky at the horizon
                 * (one CPU march per frame with the same params as the
                 * atmosphere pass), so far terrain always melts into
                 * the sky it stands against - day, night, and the
                 * sunset warmth all come out of the same integral. An
                 * optional per-body fog_color acts as a tint on top. */
                let base = if r.env.atmo_strength > 0.001 {
                    /* Average the horizon sky colour around the WHOLE compass
                     * (radial up, view-independent) instead of sampling only
                     * the look direction. The fog then stays one stable colour
                     * as the player turns - it swung obviously warm/cool at
                     * dusk before, since the sunward horizon is orange and the
                     * opposite is blue. Still shifts with position + time of
                     * day, just not with head-turn. Reads more like a
                     * volumetric haze than a directional tint. */
                    let cc = r.env.atmo_planet_center;
                    let camv = vec3_sub(r.env.camera_world, cc);
                    let ul = (camv.x * camv.x + camv.y * camv.y + camv.z * camv.z).sqrt().max(1e-3);
                    let up = [camv.x / ul, camv.y / ul, camv.z / ul];
                    let refv = if up[1].abs() < 0.9 { [0.0f32, 1.0, 0.0] } else { [1.0f32, 0.0, 0.0] };
                    let mut t1 = [
                        up[1] * refv[2] - up[2] * refv[1],
                        up[2] * refv[0] - up[0] * refv[2],
                        up[0] * refv[1] - up[1] * refv[0],
                    ];
                    let t1l = (t1[0] * t1[0] + t1[1] * t1[1] + t1[2] * t1[2]).sqrt().max(1e-6);
                    t1 = [t1[0] / t1l, t1[1] / t1l, t1[2] / t1l];
                    let t2 = [
                        up[1] * t1[2] - up[2] * t1[1],
                        up[2] * t1[0] - up[0] * t1[2],
                        up[0] * t1[1] - up[1] * t1[0],
                    ];
                    const FOG_DIRS: usize = 6;
                    let mut acc = [0.0f32; 3];
                    for k in 0..FOG_DIRS {
                        let a = (k as f32) / (FOG_DIRS as f32) * std::f32::consts::TAU;
                        let (cs, sn) = (a.cos(), a.sin());
                        let dir = [
                            t1[0] * cs + t2[0] * sn,
                            t1[1] * cs + t2[1] * sn,
                            t1[2] * cs + t2[2] * sn,
                        ];
                        let col = horizon_sky_color(&r.env, dir);
                        acc = [acc[0] + col[0], acc[1] + col[1], acc[2] + col[2]];
                    }
                    let inv = 1.0 / FOG_DIRS as f32;
                    [acc[0] * inv, acc[1] * inv, acc[2] * inv]
                } else {
                    /* Airless body with fog forced on: flat colour
                     * dimmed by local daylight (terminator band). */
                    let d = (cam.x * r.env.sun_dir.x
                        + cam.y * r.env.sun_dir.y
                        + cam.z * r.env.sun_dir.z)
                        / cam_r;
                    let daylight = 0.16 + 0.84 * ((d + 0.10) / 0.22).clamp(0.0, 1.0);
                    [
                        bc.atmo_fog_color.x * daylight,
                        bc.atmo_fog_color.y * daylight,
                        bc.atmo_fog_color.z * daylight,
                    ]
                };
                let tint = if bc.atmo_fog_color.x + bc.atmo_fog_color.y + bc.atmo_fog_color.z > 0.0
                    && r.env.atmo_strength > 0.001
                {
                    [bc.atmo_fog_color.x, bc.atmo_fog_color.y, bc.atmo_fog_color.z]
                } else {
                    [1.0, 1.0, 1.0]
                };
                let height = if bc.atmo_fog_height_m > 0.0 { bc.atmo_fog_height_m } else { 60.0 };
                let alt = (cam_r - sea_radius).max(0.0);
                /* Quadratic fade: the fog thins out noticeably as the
                 * player climbs, clearing well before fog_height_m. */
                let k = {
                    let t = (1.0 - alt / height).clamp(0.0, 1.0);
                    t * t
                };
                /* Weather thickens the fog: a base bump per unit overcast,
                 * and a bigger multiplier while it's actually raining /
                 * snowing (a wall of grey close in). The colour greys +
                 * dims toward overcast so it reads as storm haze, not the
                 * bright clear-sky horizon. */
                let wcfg = tenebris_core::weather::config();
                let precip_mult = if wx_precip { wcfg.rain_fog_mult } else { 1.0 };
                let cloud_mult = 1.0 + wx_overcast * wcfg.cloud_fog_add;
                let grey_t = wx_overcast * 0.5;
                let lum = (base[0] * 0.3 + base[1] * 0.59 + base[2] * 0.11) * 0.85;
                let g = |c: f32| (c * (1.0 - grey_t) + lum * grey_t) * (1.0 - 0.2 * wx_overcast);
                fog = [
                    g(base[0]) * tint[0],
                    g(base[1]) * tint[1],
                    g(base[2]) * tint[2],
                    bc.atmo_fog_density * k * precip_mult * cloud_mult,
                ];
            }
        }

        FRAME_FOG.with(|f| f.set(fog));
        let fs = shaders::composite::CompositeFsParams {
            /* deep_color.w = camera aspect (w/h) so rain-on-glass drops stay
             * round. */
            deep_color: [comp_deep.x, comp_deep.y, comp_deep.z, FRAME_ASPECT.with(|c| c.get())],
            /* absorption.w = wet-FX depth-blur strength (water.yaml wet_blur);
             * the composite reads it as the blur blend amount. */
            absorption: [comp_absorb.x, comp_absorb.y, comp_absorb.z, config::water().wet_blur],
            /* near_far.z = wet-fade altitude window (m); .w = emerge-from-
             * water drip intensity (running drops + mild depth blur that dry
             * off after surfacing). */
            near_far: [
                0.3,
                20000.0,
                w.wet_fade_band_m,
                FRAME_EMERGE.with(|c| c.get()),
            ],
            planet_params: [body_center.x, body_center.y, body_center.z, sea_radius],
            fx_params: [
                w.underwater_distortion,
                r.time_seconds,
                /* Tri-state submersion for the lens FX:
                 *   1.0 = eye fully underwater  -> all lens droplets skipped
                 *   0.5 = eye straddling surface -> droplets run, above-water
                 *         mask bites (drops only on the above-water half)
                 *   0.0 = dry above the water    -> droplets run everywhere,
                 *         including over the ocean the camera looks down on
                 * (cam_under is already cam_under_shared && !partial). */
                if cam_under {
                    1.0
                } else if cam_partial_shared {
                    0.5
                } else {
                    0.0
                },
                /* .w = rain-on-glass intensity: droplets refract the lens
                 * (no lens fog) + a mild depth blur softens the distant
                 * background while it rains. dry = 0 = no-op. */
                FRAME_WET.with(|c| c.get()),
            ],
            fog_params: fog,
            /* Camera rain-on-glass lens droplets (weather.yaml): x = count /
             * coverage, y = refraction strength, z = animation speed, w = drop
             * size (grid frequency). Count and size are independent knobs. */
            rain_lens: {
                let wx = tenebris_core::weather::config();
                [
                    wx.rain_lens_density,
                    wx.rain_lens_refract,
                    wx.rain_lens_speed,
                    wx.rain_lens_size,
                ]
            },
            /* Compose pass: droplets OFF (they run in the lens pass). */
            lens_mode: [0.0; 4],
        };
        /* Stash for the lens pass, which reuses these params with lens_mode
         * flipped to 1 (droplets on) sampling the post-water intermediate. */
        FRAME_COMP_FS.with(|c| *c.borrow_mut() = Some(fs));
        sg::apply_uniforms(shaders::composite::UB_COMPOSITE_FS_PARAMS, &sg::value_as_range(&fs));

        let mut bind = sg::Bindings::new();
        bind.views[shaders::composite::VIEW_SCENE_COLOR] = r.offscreen_color_tex;
        bind.views[shaders::composite::VIEW_SCENE_DEPTH] = r.offscreen_depth_tex;
        bind.samplers[shaders::composite::SMP_SCENE_SMP] = r.smp_offscreen;
        bind.samplers[shaders::composite::SMP_SCENE_DEPTH_SMP] = r.smp_offscreen_depth;
        sg::apply_bindings(&bind);
        sg::draw(0, 3, 1);
    });
}

/// Final LENS pass: end the intermediate pass, open the swapchain, and blit the
/// post-water intermediate to it - applying ONLY the camera rain-on-glass
/// droplets (composite shader in lens mode), so each drop refracts the real
/// water. Forwards the intermediate depth so the after-water sgl FX (reentry
/// plasma, rain streaks) still depth-test correctly. Leaves the swapchain pass
/// OPEN for those FX + the UI. Call right after `draw_water`.
pub fn draw_lens_to_swapchain() {
    R.with(|cell| {
        let r = cell.borrow();
        sg::end_pass(); // close the intermediate (mid) pass

        let mut pass = sg::Pass {
            label: c"swapchain-lens".as_ptr(),
            swapchain: sokol::glue::swapchain(),
            ..Default::default()
        };
        pass.action.colors[0] = sg::ColorAttachmentAction {
            load_action: sg::LoadAction::Clear,
            clear_value: sg::Color { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
            ..Default::default()
        };
        pass.action.depth = sg::DepthAttachmentAction {
            load_action: sg::LoadAction::Clear,
            clear_value: 1.0,
            ..Default::default()
        };
        sg::begin_pass(&pass);

        sg::apply_pipeline(r.pip_composite);
        let (Some(vs), Some(mut fs)) = (
            FRAME_COMP_VS.with(|c| *c.borrow()),
            FRAME_COMP_FS.with(|c| *c.borrow()),
        ) else {
            return;
        };
        /* Reuse the compose camera basis (v_view_dir / v_camera_pos drive the
         * above-waterline droplet mask) and params, flipping to lens mode. */
        sg::apply_uniforms(shaders::composite::UB_COMPOSITE_VS_PARAMS, &sg::value_as_range(&vs));
        fs.lens_mode = [1.0, 0.0, 0.0, 0.0]; // lens pass: droplets ON
        sg::apply_uniforms(shaders::composite::UB_COMPOSITE_FS_PARAMS, &sg::value_as_range(&fs));

        let mut bind = sg::Bindings::new();
        /* Sample the POST-WATER intermediate for both colour (droplet
         * refraction base) and depth (forwarded to the swapchain). */
        bind.views[shaders::composite::VIEW_SCENE_COLOR] = r.mid_color_tex;
        bind.views[shaders::composite::VIEW_SCENE_DEPTH] = r.mid_depth_tex;
        bind.samplers[shaders::composite::SMP_SCENE_SMP] = r.smp_offscreen;
        bind.samplers[shaders::composite::SMP_SCENE_DEPTH_SMP] = r.smp_offscreen_depth;
        sg::apply_bindings(&bind);
        sg::draw(0, 3, 1);
    });
}

/// Port of `renderer_end_frame()`.
pub fn end_frame() {
    sg::end_pass();
    sg::commit();
}

/* ----------------------------------------------------------------------- */
/* Chunked terrain + water draws. */

/// Port of `body_draw_chunks()`. Caller has already applied pip_hex +
/// the lighting uniform blocks; this sets the per-body model + planet
/// block and issues the chunk draws. Returns triangles drawn.
#[allow(clippy::too_many_arguments)]
fn body_draw_chunks(
    body: &ChunkedBody,
    vp: Mat4,
    camera_world: Vec3,
    atlas_view: sg::View,
    atlas_smp: sg::Sampler,
    crack_view: sg::View,
    crack_smp: sg::Sampler,
    crack: &shaders::hex::HexFsCrack,
) -> usize {
    let model = mat4_translate(body.world_pos);
    let mvp = mat4_mul(vp, model);

    /* Planet centre is body-local origin (pre-translate); sea-level
     * radius matches where the cap mesh actually sits (seeded worlds
     * carry their sea one block higher). */
    let w = config::water();
    let sea_radius = body.radius_m
        + tenebris_core::planet_gen::sea_raise_m(&body.world.borrow().body)
        + w.height_offset_m
        - w.depth_offset_m;
    let hvp = shaders::hex::HexVsParams {
        u_vp: mvp.m,
        u_planet: [0.0, 0.0, 0.0, if body.has_water { sea_radius } else { 0.0 }],
    };
    sg::apply_uniforms(shaders::hex::UB_HEX_VS_PARAMS, &sg::value_as_range(&hvp));
    /* Block-break crack channel: real cell data when this body owns
     * the mined block, all-zero (disabled) otherwise. */
    sg::apply_uniforms(shaders::hex::UB_HEX_FS_CRACK, &sg::value_as_range(crack));
    let cc = compute_chunk_cull(body.world_pos, body.radius_m, camera_world);
    let mut tris = 0usize;
    for (ci, c) in body.chunks[..chunk_n()].iter().enumerate() {
        if c.last_uploaded_index_count <= 0 {
            continue;
        }
        if !chunk_visible(&cc, ci) {
            continue;
        }
        let mut bind = sg::Bindings::new();
        bind.vertex_buffers[0] = c.vbuf;
        bind.index_buffer = c.ibuf;
        bind.views[shaders::hex::VIEW_HEX_ATLAS] = atlas_view;
        bind.samplers[shaders::hex::SMP_HEX_ATLAS_SMP] = atlas_smp;
        bind.views[shaders::hex::VIEW_CRACK_TEX] = crack_view;
        bind.samplers[shaders::hex::SMP_CRACK_SMP] = crack_smp;
        sg::apply_bindings(&bind);
        sg::draw(0, c.last_uploaded_index_count as usize, 1);
        tris += (c.last_uploaded_index_count / 3) as usize;
    }
    tris
}

/// Port of `body_draw_water()`. Desktop path samples the offscreen
/// scene for refraction + thickness extinction; perf mode alpha-blends
/// the stripped mobile shader over the composite. Returns triangles
/// drawn.
fn body_draw_water(r: &Renderer, bi: usize, vp: Mat4, camera_world: Vec3) -> usize {
    let body = &r.bodies[bi];
    if !body.has_water {
        return 0;
    }
    let any = body.chunks[..chunk_n()]
        .iter()
        .any(|c| c.last_uploaded_water_idx_count > 0);
    if !any {
        return 0;
    }

    let model = mat4_translate(body.world_pos);
    let mvp = mat4_mul(vp, model);

    /* All water knobs come from water.yaml; near/far stay hardcoded
     * (renderer-pipeline detail, mirrors main_web's projection). */
    let w = config::water();
    let t_scaled = r.time_seconds * w.time_scale;
    let l = config::lighting();
    /* Per-tileset water tinting with global fallback (zero sentinel). */
    let lp = config::lod();
    let mut ts_idx = body.world.borrow().body.tileset as i32;
    if !(0..=4).contains(&ts_idx) {
        ts_idx = 0;
    }
    let ts_idx = ts_idx as usize;
    let mut deep_c = w.deep_color;
    let mut absorb = w.absorption;
    if lp.tileset_water_deep_color[ts_idx].x > 0.0
        || lp.tileset_water_deep_color[ts_idx].y > 0.0
        || lp.tileset_water_deep_color[ts_idx].z > 0.0
    {
        deep_c = lp.tileset_water_deep_color[ts_idx];
    }
    if lp.tileset_water_absorption[ts_idx].x > 0.0
        || lp.tileset_water_absorption[ts_idx].y > 0.0
        || lp.tileset_water_absorption[ts_idx].z > 0.0
    {
        absorb = lp.tileset_water_absorption[ts_idx];
    }
    /* Sky-reflection tones: at grazing angles (every ray from orbit)
     * the cap mirrors these, so Sequoia's green sea needs its own. */
    let mut sky_h = w.sky_horizon_color;
    let mut sky_z = w.sky_zenith_color;
    if lp.tileset_water_sky_horizon[ts_idx].x > 0.0
        || lp.tileset_water_sky_horizon[ts_idx].y > 0.0
        || lp.tileset_water_sky_horizon[ts_idx].z > 0.0
    {
        sky_h = lp.tileset_water_sky_horizon[ts_idx];
    }
    if lp.tileset_water_sky_zenith[ts_idx].x > 0.0
        || lp.tileset_water_sky_zenith[ts_idx].y > 0.0
        || lp.tileset_water_sky_zenith[ts_idx].z > 0.0
    {
        sky_z = lp.tileset_water_sky_zenith[ts_idx];
    }

    let mut tris = 0usize;

    /* Perf mode: smaller uniform blocks, no FBO bindings, pre-baked
     * normal map instead of in-shader fbm. */
    if perf_mode_enabled() {
        let mut vs_mobile = shaders::water_mobile::VsParamsMobile {
            u_vp: mvp.m,
            u_planet: [0.0, 0.0, 0.0, 0.0],
            u_sun_dir: [r.env.sun_dir.x, r.env.sun_dir.y, r.env.sun_dir.z, 0.0],
            u_terminator: [l.night_ambient_floor, l.terminator_lo, l.terminator_hi, 0.0],
        };
        vs_mobile.u_vp = mvp.m;
        sg::apply_uniforms(
            shaders::water_mobile::UB_VS_PARAMS_MOBILE,
            &sg::value_as_range(&vs_mobile),
        );

        let fs_mobile = shaders::water_mobile::FsParamsMobile {
            u_camera_pos: [camera_world.x, camera_world.y, camera_world.z],
            _pad_12: [0; 4],
            u_sun_dir: [r.env.sun_dir.x, r.env.sun_dir.y, r.env.sun_dir.z],
            u_time: t_scaled,
            u_deep_color: [deep_c.x, deep_c.y, deep_c.z],
            u_spec_intensity: w.specular_intensity,
            u_spec_power: w.specular_power,
            _pad_52: [0; 12],
            u_sun_tint: overcast_sun_tint(w.sun_tint),
            _pad_76: [0; 4],
            u_sky_horizon: [sky_h.x, sky_h.y, sky_h.z],
            _pad_92: [0; 4],
            u_sky_zenith: [sky_z.x, sky_z.y, sky_z.z],
            u_sky_horizon_strength: w.sky_horizon_strength,
            u_ripple_scale: w.ripple_scale,
            u_ripple_speed: w.ripple_speed,
            u_wave_steepness: w.wave_steepness,
            u_night_floor: l.night_ambient_floor,
            u_torch_color: [l.torch_color.x, l.torch_color.y, l.torch_color.z, l.torch_intensity],
            /* Horizon haze - cheap stand-in for the desktop shader's
             * Beer-Lambert thickness fog. */
            u_horizon_fade_m: w.horizon_fade_m,
            u_horizon_fade_strength: w.horizon_fade_strength,
            /* Per-voxel water falling-bias (water.yaml
             * flow_uv_speed_falling). */
            u_flow_speed_falling: config::water_flow().uv_speed_falling,
            _pad_156: [0; 4],
        };
        sg::apply_uniforms(
            shaders::water_mobile::UB_FS_PARAMS_MOBILE,
            &sg::value_as_range(&fs_mobile),
        );

        let cc = compute_chunk_cull(body.world_pos, body.radius_m, camera_world);
        for (ci, c) in body.chunks[..chunk_n()].iter().enumerate() {
            if c.last_uploaded_water_idx_count <= 0 {
                continue;
            }
            if !chunk_visible(&cc, ci) {
                continue;
            }
            let mut bind = sg::Bindings::new();
            bind.vertex_buffers[0] = c.water_vbuf;
            bind.index_buffer = c.water_ibuf;
            bind.views[shaders::water_mobile::VIEW_WATER_NORMAL_TEX] = r.water_normal_view;
            bind.samplers[shaders::water_mobile::SMP_WATER_NORMAL_SMP] = r.water_normal_smp;
            sg::apply_bindings(&bind);
            sg::draw(0, c.last_uploaded_water_idx_count as usize, 1);
            tris += (c.last_uploaded_water_idx_count / 3) as usize;
        }
        return tris;
    }

    /* Desktop water - std140 blocks come straight from the generated
     * module; terminator inputs shared with the hex shader. */
    let vs_params = shaders::water::VsParams {
        u_vp: mvp.m,
        u_planet: [0.0, 0.0, 0.0, 0.0],
        u_sun_dir: [r.env.sun_dir.x, r.env.sun_dir.y, r.env.sun_dir.z, 0.0],
        u_terminator: [l.night_ambient_floor, l.terminator_lo, l.terminator_hi, 0.0],
        u_time: t_scaled,
        u_swell_amplitude: w.swell_amplitude,
        u_swell_frequency: w.swell_frequency,
        u_swell_speed: w.swell_speed,
    };
    sg::apply_uniforms(shaders::water::UB_VS_PARAMS, &sg::value_as_range(&vs_params));

    let fs_params = shaders::water::FsParams {
        u_camera_pos: [camera_world.x, camera_world.y, camera_world.z],
        _pad_12: [0; 4],
        u_sun_dir: [r.env.sun_dir.x, r.env.sun_dir.y, r.env.sun_dir.z],
        u_time: t_scaled,
        u_refract_amount: w.refract_amount,
        u_near: 0.3,
        u_far: 20000.0,
        _pad_44: [0; 4],
        u_absorption: [absorb.x, absorb.y, absorb.z],
        _pad_60: [0; 4],
        u_deep_color: [deep_c.x, deep_c.y, deep_c.z],
        u_spec_intensity: w.specular_intensity,
        u_spec_power: w.specular_power,
        _pad_84: [0; 12],
        u_sun_tint: overcast_sun_tint(w.sun_tint),
        _pad_108: [0; 4],
        /* Foam scalars packed into vec4s; crest.w doubles as the mix
         * intensity, slope.w unused (kept aligned). */
        u_foam_crest: [w.foam_crest_lo, w.foam_crest_hi, w.foam_crest_weight, w.foam_intensity],
        u_foam_slope: [w.foam_slope_lo, w.foam_slope_hi, w.foam_slope_weight, 0.0],
        u_foam_color: [w.foam_color.x, w.foam_color.y, w.foam_color.z],
        _pad_156: [0; 4],
        u_sky_horizon: [sky_h.x, sky_h.y, sky_h.z],
        u_sky_horizon_strength: w.sky_horizon_strength,
        u_sky_zenith: [sky_z.x, sky_z.y, sky_z.z],
        u_ripple_scale: w.ripple_scale,
        u_ripple_speed: w.ripple_speed,
        u_wave_steepness: w.wave_steepness,
        u_night_floor: l.night_ambient_floor,
        _pad_204: [0; 4],
        u_torch_color: [l.torch_color.x, l.torch_color.y, l.torch_color.z, l.torch_intensity],
        u_flow_speed_falling: config::water_flow().uv_speed_falling,
        /* Rain intensity for the surface rain ripples (same eased wetness
         * the composite rain-on-glass lens uses). */
        u_rain: FRAME_WET.with(|c| c.get()),
        _pad_232: [0; 8],
        /* Same sky-matched fog the composite used this frame - the
         * water pass draws after the post-process, so it fogs itself. */
        u_fog: FRAME_FOG.with(|f| f.get()),
    };
    sg::apply_uniforms(shaders::water::UB_FS_PARAMS, &sg::value_as_range(&fs_params));

    let cc = compute_chunk_cull(body.world_pos, body.radius_m, camera_world);
    for (ci, c) in body.chunks[..chunk_n()].iter().enumerate() {
        if c.last_uploaded_water_idx_count <= 0 {
            continue;
        }
        if !chunk_visible(&cc, ci) {
            continue;
        }
        let mut bind = sg::Bindings::new();
        bind.vertex_buffers[0] = c.water_vbuf;
        bind.index_buffer = c.water_ibuf;
        /* Offscreen colour + depth views; LINEAR colour sampler for
         * smooth refraction, NEAREST for depth (WebGL2 rule). */
        bind.views[shaders::water::VIEW_WATER_SCENE_COLOR] = r.offscreen_color_tex;
        bind.views[shaders::water::VIEW_WATER_SCENE_DEPTH] = r.offscreen_depth_tex;
        bind.samplers[shaders::water::SMP_WATER_SCENE_SMP] = r.smp_offscreen;
        bind.samplers[shaders::water::SMP_WATER_SCENE_DEPTH_SMP] = r.smp_offscreen_depth;
        sg::apply_bindings(&bind);
        sg::draw(0, c.last_uploaded_water_idx_count as usize, 1);
        tris += (c.last_uploaded_water_idx_count / 3) as usize;
    }
    tris
}

/// Port of `renderer_draw_world()`. Advances the wave clock, handles
/// edits (dirty tiles -> budgeted chunk rebuilds + uploads), runs the
/// missing-chunk diagnostic, then draws every body's chunked terrain
/// that passes the active + 5 km rule.
pub fn draw_world(
    view: Mat4,
    proj: Mat4,
    world: &Rc<RefCell<World>>,
    camera_world: Vec3,
    dt_seconds: f32,
) {
    /* Auto-discover the active body if main hasn't pre-registered it.
     * (register_world borrows R internally, so do this before taking
     * the long borrow below.) */
    let found =
        R.with(|cell| cell.borrow().bodies.iter().any(|b| Rc::ptr_eq(&b.world, world)));
    if !found {
        register_world(world);
    }

    R.with(|cell| {
        let mut r = cell.borrow_mut();
        let r = &mut *r;
        r.time_seconds += dt_seconds;
        r.tris = 0;

        /* The body whose world matches the arg is the one editing; if
         * it's not the current active body, switch. */
        let mut target_active = -1i32;
        for (i, b) in r.bodies.iter().enumerate() {
            if Rc::ptr_eq(&b.world, world) {
                target_active = i as i32;
                break;
            }
        }
        if target_active >= 0 && target_active != r.active_body_idx {
            if r.active_body_idx >= 0 {
                let old = r.active_body_idx as usize;
                r.bodies[old].is_active = false;
            }
            r.active_body_idx = target_active;
            r.bodies[target_active as usize].is_active = true;
        }

        /* Edit handling - every meshed body. Bodies not demand-loaded
         * yet have an empty tile_to_chunk; skip them (body_load_detail
         * meshes from scratch when they come into range). */
        let budget_ms = {
            let b = config::lod().mesh_remesh_budget_ms as f64;
            if b < 0.0 {
                0.0
            } else {
                b
            }
        };
        let nchunks = chunk_n();
        for bi in 0..r.bodies.len() {
            if !r.bodies[bi].meshed || r.bodies[bi].tile_to_chunk.is_empty() {
                continue;
            }
            let world_rc = r.bodies[bi].world.clone();
            let dirty_tiles;
            {
                let mut w = world_rc.borrow_mut();
                let body = &mut r.bodies[bi];
                /* Drain the dirty-tile queue: map each changed tile to
                 * its chunk and flag that chunk for rebuild. Replaces
                 * the old "scan every tile's dirty bit each frame"
                 * sweep, so an idle frame - or a frame carrying just
                 * one peer edit - costs O(changed tiles) instead of
                 * O(tile_count). dirty_consume then clears the bits +
                 * empties the queue in one pass. */
                dirty_tiles = w.dirty_tiles().len();
                for &tile in w.dirty_tiles() {
                    let ci = body.tile_to_chunk[tile as usize] as usize;
                    body.chunks[ci].dirty = true;
                }
                w.dirty_consume();
            }
            /* Rebuild dirty chunks under a wall-clock budget so neither
             * a local placement, a burst of peer edits, nor a water
             * flood that dirties many chunks at once can stall the
             * frame. Always rebuild at least one chunk so progress is
             * guaranteed; past that, stop once the budget is spent and
             * let the remaining dirty chunks roll over to the next
             * frame. (The first rebuild also drives the global relight
             * BFS to convergence; later chunks in the same frame find
             * light already clean, so the budget mostly governs raw
             * mesh-build cost.) */
            let t_budget_start = now_ticks();
            let mut rebuilt: Vec<usize> = Vec::new();
            for ci in 0..nchunks {
                if !r.bodies[bi].chunks[ci].dirty {
                    continue;
                }
                if !remesh_budget_allows(
                    rebuilt.len() as i32,
                    ticks_ms(ticks_diff(now_ticks(), t_budget_start)),
                    budget_ms,
                ) {
                    break;
                }
                body_chunk_rebuild_full(r, bi, ci);
                r.bodies[bi].chunks[ci].dirty = false;
                rebuilt.push(ci);
            }
            let chunks_rebuilt = rebuilt.len();
            for &ci in &rebuilt {
                chunk_upload(&mut r.bodies[bi].chunks[ci]);
            }
            /* Trace per-frame remesh activity (silence here when diffs
             * arrived = no rebuild = bug). Idle frames stay quiet. */
            if dirty_tiles > 0 {
                let name = r.bodies[bi].world.borrow().body.name;
                println!(
                    "[renderer] remesh {}: {} dirty tile(s), {} chunk(s) rebuilt",
                    name, dirty_tiles, chunks_rebuilt
                );
            }
        }

        /* Periodic diagnostic - every ~2 s flag chunks on the active
         * body with last_uploaded_index_count == 0 and their distance
         * from the player.
         *
         * Gated on the body actually being CHUNKED right now. This
         * diagnostic predates detail eviction: once the LOD unload landed
         * (player past 7.5 km -> chunks freed, the distant icosphere draws
         * instead), every evicted chunk legitimately has idx_count == 0 and
         * the log spammed all 128 as MISSING from orbit - they aren't
         * missing, the planet is deliberately a sphere out there. Guarded,
         * it goes back to meaning what it says: a chunk the CURRENT LOD
         * says should be drawn, with nothing uploaded - a real hole. */
        r.log_accum_s += dt_seconds as f64;
        if r.log_accum_s > 2.0
            && r.active_body_idx >= 0
            && r.bodies[r.active_body_idx as usize].meshed
            && r.bodies[r.active_body_idx as usize].chunked_now
        {
            r.log_accum_s = 0.0;
            let active = &r.bodies[r.active_body_idx as usize];
            let w = active.world.borrow();
            for ci in 0..chunk_n() {
                let c = &active.chunks[ci];
                if c.last_uploaded_index_count > 0 {
                    continue;
                }
                let anchor = chunk_anchors()[ci];
                let anchor_local = Vec3 {
                    x: anchor.x as f32 * active.radius_m,
                    y: anchor.y as f32 * active.radius_m,
                    z: anchor.z as f32 * active.radius_m,
                };
                let anchor_world = vec3_add(anchor_local, active.world_pos);
                let dist = vec3_length(vec3_sub(anchor_world, camera_world));
                let tile_count = active.chunk_tile_cnt[ci];
                println!(
                    "[renderer] MISSING chunk {} on {}: {} tiles, dist={:.1}m, idx_count={}",
                    ci, w.body.name, tile_count, dist, c.last_uploaded_index_count
                );
            }
        }

        /* Draw all bodies' chunked terrain. Skipped entirely when the
         * debug toggle is off (buffers stay populated). */
        let vp = mat4_mul(proj, view);
        if terrain_visible() {
            sg::apply_pipeline(r.pip_hex);
            /* Per-frame lighting blocks - sun dir (vs + fs), ambient
             * (fs), day/night terminator. */
            let l = config::lighting();
            {
                let sc = tenebris_core::scatter::config();
                /* Simple, believable grass wind - deliberately NOT the
                 * atmospheric weather sim (its per-cell direction shifted as
                 * the player moved and read as random). A single fixed
                 * prevailing wind direction the VS projects onto each blade's
                 * tangent plane, plus a slow global gust envelope, so the
                 * whole sward leans + ripples the same way and breathes
                 * together - a coherent low-frequency wave rolling downwind,
                 * like the reference grass demos. */
                let wind_on = sc.grass_wind > 0.5;
                /* Global gust: the reach eases ~70%..100% over a few seconds -
                 * one shared breath, not per-blade jitter. */
                let gust = 0.85 + 0.15 * (r.time_seconds * 0.55).sin();
                let amp = if wind_on { sc.sway_amp_m * gust } else { 0.0 };
                let lean = sc.sway_lean_bias.clamp(0.0, 1.0);
                let gust_k = std::f32::consts::TAU / sc.sway_gust_wavelength_m.max(0.5);
                /* Fixed world-space prevailing wind; the VS re-projects it
                 * onto each vertex's tangent plane so the visible field agrees
                 * everywhere. xyz = unit dir * lean bias (length recovers the
                 * bias), w = gust-wave spatial frequency (rad/m). */
                let wind_dir_w = {
                    let v = [1.0f32, 0.0, 0.35];
                    let l = (v[0] * v[0] + v[1] * v[1] + v[2] * v[2]).sqrt();
                    [v[0] / l, v[1] / l, v[2] / l]
                };
                let hex_vs_light = shaders::hex::HexVsLight {
                    u_sun_dir: [r.env.sun_dir.x, r.env.sun_dir.y, r.env.sun_dir.z],
                    _pad_12: [0; 4],
                    /* w carries the clock for the scatter wind sway. */
                    u_terminator: [
                        l.night_ambient_floor,
                        l.terminator_lo,
                        l.terminator_hi,
                        r.time_seconds as f32,
                    ],
                    u_sway: [
                        sc.sway_speed,
                        amp,
                        sc.underwater_sway_speed,
                        sc.underwater_sway_amp_m,
                    ],
                    u_wind_dir: [
                        wind_dir_w[0] * lean,
                        wind_dir_w[1] * lean,
                        wind_dir_w[2] * lean,
                        gust_k,
                    ],
                };
                sg::apply_uniforms(
                    shaders::hex::UB_HEX_VS_LIGHT,
                    &sg::value_as_range(&hex_vs_light),
                );
            }
            {
                /* From-orbit atmospheric limb rim: camera in the planet-LOCAL
                 * frame (v_local is a_pos, i.e. relative to the body centre =
                 * active.world_pos), plus the sea radius + fog band so the
                 * shader can fade the rim IN as the ground fog fades OUT. Rim
                 * look reuses the shared lod.yaml distant_rim_* knobs. */
                let lodc = config::lod();
                let (cam_local, sea_radius_rim, fog_h, rim_ts) = {
                    let idx = r.active_body_idx;
                    if idx >= 0 && (idx as usize) < r.bodies.len() {
                        let ab = &r.bodies[idx as usize];
                        let cl = vec3_sub(camera_world, ab.world_pos);
                        let (fh, ts) = {
                            let bw = ab.world.borrow();
                            (
                                if bw.body.atmo_fog_height_m > 0.0 { bw.body.atmo_fog_height_m } else { 60.0 },
                                bw.body.tileset as usize,
                            )
                        };
                        ([cl.x, cl.y, cl.z], ab.radius_m, fh, ts)
                    } else {
                        ([0.0, 0.0, 0.0], 1.0, 60.0, 0)
                    }
                };
                let rim = rim_color_for(&lodc, rim_ts);
                let hex_fs_light = shaders::hex::HexFsLight {
                    u_sun_dir: [r.env.sun_dir.x, r.env.sun_dir.y, r.env.sun_dir.z],
                    _pad_12: [0; 4],
                    u_ambient: overcast_ambient(r.env.ambient),
                    _pad_28: [0; 4],
                    /* fs repurposes .y = rain wetness, .z = time seconds
                     * for the wet-terrain look (the vs-side smoothstep
                     * range lo/hi is not needed in the fs). */
                    u_terminator: [
                        l.night_ambient_floor,
                        FRAME_WET.with(|c| c.get()),
                        r.time_seconds as f32,
                        0.0,
                    ],
                    u_cam_local: cam_local,
                    u_sea_radius: sea_radius_rim,
                    u_rim_color: [rim.x, rim.y, rim.z],
                    u_rim_power: lodc.distant_rim_power,
                    u_rim_intensity: lodc.distant_rim_intensity,
                    u_fog_height_m: fog_h,
                    _pad_84: 0.0,
                    _pad_88: 0.0,
                };
                sg::apply_uniforms(
                    shaders::hex::UB_HEX_FS_LIGHT,
                    &sg::value_as_range(&hex_fs_light),
                );
            }
            {
                /* Wet-surface rain-ripple knobs (weather.yaml). Packed to
                 * match hex_fs_rain[4] in hex.fs.glsl. */
                let wx = tenebris_core::weather::config();
                let hex_fs_rain = shaders::hex::HexFsRain {
                    rain0: [
                        wx.rain_ripple_scale,
                        wx.rain_ripple_strength,
                        wx.rain_flow_across,
                        wx.rain_flow_down,
                    ],
                    rain1: [
                        wx.rain_flow_speed,
                        wx.rain_flow_strength,
                        wx.rain_wave_scale,
                        wx.rain_wave_strength,
                    ],
                    rain2: [
                        wx.rain_wave_speed,
                        wx.rain_wet_darken,
                        wx.rain_sky_sheen,
                        wx.rain_glint_power,
                    ],
                    rain3: [wx.rain_glint_strength, 0.0, 0.0, 0.0],
                };
                sg::apply_uniforms(
                    shaders::hex::UB_HEX_FS_RAIN,
                    &sg::value_as_range(&hex_fs_rain),
                );
            }
            /* Underwater-dim block reuses the cap's absorption +
             * deep_color so submerged terrain tints with the same
             * curve the cap uses. */
            {
                let w = config::water();
                let hex_under = shaders::hex::HexFsWater {
                    u_absorption: [w.absorption.x, w.absorption.y, w.absorption.z],
                    _pad_12: [0; 4],
                    u_deep_color: [w.deep_color.x, w.deep_color.y, w.deep_color.z],
                    _pad_28: [0; 4],
                };
                sg::apply_uniforms(
                    shaders::hex::UB_HEX_FS_WATER,
                    &sg::value_as_range(&hex_under),
                );
            }
            /* Torch tint + intensity (lighting.yaml). */
            {
                let hex_torch = shaders::hex::HexFsTorch {
                    u_torch_color: [
                        l.torch_color.x,
                        l.torch_color.y,
                        l.torch_color.z,
                        l.torch_intensity,
                    ],
                };
                sg::apply_uniforms(
                    shaders::hex::UB_HEX_FS_TORCH,
                    &sg::value_as_range(&hex_torch),
                );
            }

            /* This frame's mining state (one-shot; app re-publishes
             * every frame it's actively mining). */
            let break_req = BREAK_REQ.with(|c| c.take());
            let (crack_view_id, crack_smp_id, crack_stages) = ensure_crack_atlas();
            let crack_view = sg::View { id: crack_view_id };
            let crack_smp = sg::Sampler { id: crack_smp_id };
            let crack_alpha = tenebris_core::mining::config().crack_alpha;
            for bi in 0..r.bodies.len() {
                let is_active = bi as i32 == r.active_body_idx;
                /* Non-active bodies are ALWAYS far-LOD: they never draw
                 * chunked terrain (see body_draws_chunked), so force their
                 * cached verdict to "not chunked" and release any detail
                 * mesh here - BEFORE any frustum cull. This is the "every
                 * astro body always shows its low-detail LOD" invariant.
                 *
                 * The old code frustum-culled a non-active body with a bare
                 * `continue` that skipped updating chunked_now. A body that
                 * lost active status (a teleport / body switch) while
                 * off-screen therefore kept a STALE chunked_now=true and
                 * drew NEITHER chunks (not active) NOR its distant impostor
                 * (draw_moons skips chunked_now bodies) - it vanished, and
                 * stayed gone until it happened to swing back on-screen.
                 * Clearing it unconditionally makes draw_moons draw the
                 * impostor the instant the body is in view; draw_moons still
                 * frustum-culls the impostor itself, so off-screen bodies
                 * cost nothing. */
                if !is_active {
                    if r.bodies[bi].meshed {
                        body_unload_detail(&mut r.bodies[bi]);
                    }
                    r.bodies[bi].chunked_now = false;
                    r.bodies[bi].detail_out_since = -1.0;
                    continue;
                }
                /* Only the ACTIVE body draws chunked terrain, and only
                 * within the hard cutoff; everything else is far-LOD
                 * (drawn by draw_moons).
                 *
                 * The decision measures from the LOD ANCHOR (the player),
                 * NOT the camera - the chase-cam's map zoom must never
                 * unload the mesh - and unloading is debounced behind the
                 * hysteresis radius, because a reload is a multi-second
                 * full remesh. Result cached in chunked_now so the moons /
                 * water mirrors agree by construction. */
                let anchor =
                    LOD_ANCHOR.with(|c| c.get()).unwrap_or(camera_world);
                let lod_dist =
                    vec3_length(vec3_sub(r.bodies[bi].world_pos, anchor)).max(1.0);
                let want = if r.bodies[bi].meshed {
                    is_active && lod_dist <= MAX_DETAIL_DIST_M * DETAIL_UNLOAD_FACTOR
                } else {
                    body_draws_chunked(is_active, lod_dist)
                };
                let chunked = if r.bodies[bi].meshed && !want {
                    /* Debounce the unload: flapping across the boundary
                     * must never pay the reload. */
                    let now_s = r.time_seconds;
                    let since = r.bodies[bi].detail_out_since;
                    if since < 0.0 {
                        r.bodies[bi].detail_out_since = now_s;
                        true
                    } else {
                        now_s - since < DETAIL_UNLOAD_DEBOUNCE_S
                    }
                } else {
                    r.bodies[bi].detail_out_since = -1.0;
                    want
                };
                r.bodies[bi].chunked_now = chunked;
                if !chunked {
                    /* Release the chunked mesh + GPU buffers; the far LOD
                     * takes over and body_load_detail rebuilds on a real
                     * re-approach. */
                    if r.bodies[bi].meshed {
                        body_unload_detail(&mut r.bodies[bi]);
                        r.bodies[bi].detail_out_since = -1.0;
                    }
                    continue;
                }
                if !r.bodies[bi].meshed {
                    body_load_detail(r, bi);
                }
                let crack_ub = match &break_req {
                    Some(req)
                        if r.bodies[bi].world.borrow().body.id as u32 == req.body_id =>
                    {
                        build_crack_ub(
                            &r.bodies[bi].world.borrow(),
                            req,
                            crack_stages,
                            crack_alpha,
                        )
                    }
                    _ => crack_ub_off(),
                };
                let tris = body_draw_chunks(
                    &r.bodies[bi],
                    vp,
                    r.env.camera_world,
                    r.atlas_view,
                    r.atlas_smp,
                    crack_view,
                    crack_smp,
                    &crack_ub,
                );
                r.tris += tris;
            }
            /* Water is drawn in renderer_draw_water (swapchain pass,
             * after compose) so it can sample the offscreen scene. */
        }
    });
}

/// Port of `renderer_draw_water()`. Runs after compose_to_swapchain;
/// only the active body within the detail cutoff draws its cap.
pub fn draw_water(view: Mat4, proj: Mat4, camera_world: Vec3) {
    if !terrain_visible() {
        return;
    }
    if !water_visible() {
        return;
    }
    R.with(|cell| {
        let mut r = cell.borrow_mut();
        let r = &mut *r;
        let vp = mat4_mul(proj, view);
        let frustum = extract_frustum(vp);

        sg::apply_pipeline(if perf_mode_enabled() {
            r.pip_water_mobile
        } else {
            r.pip_water
        });
        for bi in 0..r.bodies.len() {
            if !r.bodies[bi].has_water {
                continue;
            }
            let is_active = bi as i32 == r.active_body_idx;
            if !is_active
                && !sphere_visible(&frustum, r.bodies[bi].world_pos, r.bodies[bi].radius_m * 1.5)
            {
                continue;
            }
            /* Mirror the terrain pass's decision: only a body that drew
             * chunks this frame draws its translucent cap. Cached verdict
             * (anchor + hysteresis), so the passes agree by construction. */
            let _ = is_active;
            if !r.bodies[bi].chunked_now {
                continue;
            }
            let tris = body_draw_water(r, bi, vp, camera_world);
            r.tris += tris;
        }
    });
}

/* ----------------------------------------------------------------------- */
/* Block-outline wireframe + F5 flow-debug overlay (sokol_gl). */

/// Port of `ensure_outline_pip()`. Lines + depth test (no write) +
/// alpha blend; lazy so menu-only sessions never pay for it.
fn ensure_outline_pip() -> sgl::Pipeline {
    let existing = OUTLINE_PIP.with(|c| c.get());
    if existing.id != 0 {
        return existing;
    }
    let mut desc = sg::PipelineDesc {
        primitive_type: sg::PrimitiveType::Lines,
        depth: sg::DepthState {
            compare: sg::CompareFunc::LessEqual,
            write_enabled: false,
            ..Default::default()
        },
        ..Default::default()
    };
    desc.colors[0].blend = sg::BlendState {
        enabled: true,
        src_factor_rgb: sg::BlendFactor::SrcAlpha,
        dst_factor_rgb: sg::BlendFactor::OneMinusSrcAlpha,
        src_factor_alpha: sg::BlendFactor::One,
        dst_factor_alpha: sg::BlendFactor::One,
        ..Default::default()
    };
    let pip = sgl::make_pipeline(&desc);
    OUTLINE_PIP.with(|c| c.set(pip));
    pip
}

/// Face classification for the outline draw - port of the C local
/// enum in renderer_draw_face_outline.
#[derive(PartialEq)]
enum OutlineFace {
    None,
    TopCap,
    BottomCap,
    Side,
}

/// Port of `renderer_draw_face_outline()`. Wireframe of the single
/// face of (tile, depth) shared with (nbr_tile, nbr_depth). No-op for
/// any combination that isn't a valid neighbour.
#[allow(clippy::too_many_arguments)]
pub fn draw_face_outline(
    view: Mat4,
    proj: Mat4,
    world: &World,
    tile_idx: i32,
    depth: i32,
    nbr_tile: i32,
    nbr_depth: i32,
    r: f32,
    g: f32,
    b: f32,
    a: f32,
) {
    if tile_idx < 0 || tile_idx >= world.tile_count {
        return;
    }
    if depth < 0 || depth >= WORLD_MAX_DEPTH {
        return;
    }
    let Some(t) = world.grid.tile(tile_idx) else { return };
    let n = t.num_verts as i32;
    if n <= 0 {
        return;
    }

    /* Classify which face. Top/bottom caps are depth+1 / depth-1 on
     * the same tile; side faces are same-depth neighbour-tile pairs
     * found via the goldberg edge_neighbours table. */
    let mut kind = OutlineFace::None;
    let mut side_edge_k: i32 = -1;
    if nbr_tile == tile_idx {
        if nbr_depth == depth + 1 {
            kind = OutlineFace::TopCap;
        } else if nbr_depth == depth - 1 {
            kind = OutlineFace::BottomCap;
        }
    } else if nbr_depth == depth {
        for k in 0..n {
            if t.edge_neighbours[k as usize] == nbr_tile {
                side_edge_k = k;
                break;
            }
        }
        if side_edge_k >= 0 {
            kind = OutlineFace::Side;
        }
    }
    if kind == OutlineFace::None {
        return;
    }

    let pip = ensure_outline_pip();
    sgl::defaults();
    sgl::matrix_mode_projection();
    sgl::load_matrix(&proj.m[0]);
    sgl::matrix_mode_modelview();
    sgl::load_matrix(&view.m[0]);
    sgl::translate(
        world.body.pos_x as f32,
        world.body.pos_y as f32,
        world.body.pos_z as f32,
    );
    sgl::load_pipeline(pip);

    sgl::begin_lines();
    sgl::c4f(r, g, b, a);

    match kind {
        OutlineFace::TopCap | OutlineFace::BottomCap => {
            /* Cap perimeter at the matching radius: top cap at
             * radius(depth+1), bottom at radius(depth). */
            let ring_r = if kind == OutlineFace::TopCap {
                world.depth_to_radius_m(depth + 1)
            } else {
                world.depth_to_radius_m(depth)
            };
            for k in 0..n {
                let next = (k + 1) % n;
                let a_v = dvec3_scale(t.verts[k as usize], ring_r);
                let b_v = dvec3_scale(t.verts[next as usize], ring_r);
                sgl::v3f(a_v.x as f32, a_v.y as f32, a_v.z as f32);
                sgl::v3f(b_v.x as f32, b_v.y as f32, b_v.z as f32);
            }
        }
        OutlineFace::Side => {
            /* Side quad: corners verts[k], verts[k+1] at the two
             * radii; trace 4 edges. */
            let k_a = side_edge_k;
            let k_b = (k_a + 1) % n;
            let r_bot = world.depth_to_radius_m(depth);
            let r_top = world.depth_to_radius_m(depth + 1);
            let inner_a = dvec3_scale(t.verts[k_a as usize], r_bot);
            let inner_b = dvec3_scale(t.verts[k_b as usize], r_bot);
            let outer_a = dvec3_scale(t.verts[k_a as usize], r_top);
            let outer_b = dvec3_scale(t.verts[k_b as usize], r_top);
            /* bottom edge */
            sgl::v3f(inner_a.x as f32, inner_a.y as f32, inner_a.z as f32);
            sgl::v3f(inner_b.x as f32, inner_b.y as f32, inner_b.z as f32);
            /* right edge */
            sgl::v3f(inner_b.x as f32, inner_b.y as f32, inner_b.z as f32);
            sgl::v3f(outer_b.x as f32, outer_b.y as f32, outer_b.z as f32);
            /* top edge */
            sgl::v3f(outer_b.x as f32, outer_b.y as f32, outer_b.z as f32);
            sgl::v3f(outer_a.x as f32, outer_a.y as f32, outer_a.z as f32);
            /* left edge */
            sgl::v3f(outer_a.x as f32, outer_a.y as f32, outer_a.z as f32);
            sgl::v3f(inner_a.x as f32, inner_a.y as f32, inner_a.z as f32);
        }
        OutlineFace::None => unreachable!(),
    }
    sgl::end();
}

/// Block-break crack request for one frame: the mined cell + progress,
/// stashed by app BEFORE draw_world and consumed by the next terrain
/// pass, which paints the crack INSIDE the hex shader (see the crack
/// channel in tenebris-rs/shaders/hex.glsl). Same geometry + depth as
/// the terrain itself, so the old inflated-prism decal's z-fighting is
/// impossible by construction.
#[derive(Clone, Copy)]
struct BreakReq {
    body_id: u32,
    tile: i32,
    depth: i32,
    block: Block,
    frac: f32,
}

thread_local! {
    static BREAK_REQ: Cell<Option<BreakReq>> = const { Cell::new(None) };
}

/// Publish this frame's mining state. Call BEFORE draw_world; the
/// request is consumed (and cleared) by the next terrain pass, so an
/// idle frame simply doesn't publish. `frac` is mining progress in
/// [0, 1] and selects the crack stage; the block shatters harder the
/// closer it is to breaking.
pub fn set_break_overlay(world: &World, block: Block, tile_idx: i32, depth: i32, frac: f32) {
    if tile_idx < 0 || tile_idx >= world.tile_count || depth < 0 || depth >= WORLD_MAX_DEPTH {
        return;
    }
    BREAK_REQ.with(|c| {
        c.set(Some(BreakReq {
            body_id: world.body.id as u32,
            tile: tile_idx,
            depth,
            block,
            frac,
        }))
    });
}

/// The all-zero crack uniform block: alpha 0 disables the channel for
/// this draw.
fn crack_ub_off() -> shaders::hex::HexFsCrack {
    shaders::hex::HexFsCrack {
        u_crack_axis: [0.0; 4],
        u_crack_band: [0.0; 4],
        u_crack_t1: [0.0; 4],
        u_crack_t2: [0.0; 4],
        u_crack_planes: [[0.0; 4]; 6],
    }
}

/// Build the hex pass's crack uniform block for the mined cell. The
/// cell prism reuses the mesher's width factor (1.0 terrain hex, 0.20
/// trunk, hashed 0.65..1.0 leaves) so cracks hug skinny trunks and
/// variable-width leaves exactly like the block's own geometry. Side
/// planes pass through the body origin because the mesher builds side
/// walls radially - the fragment test in the shader relies on that.
fn build_crack_ub(w: &World, req: &BreakReq, stages: i32, alpha: f32) -> shaders::hex::HexFsCrack {
    let mut ub = crack_ub_off();
    let Some(t) = w.grid.tile(req.tile) else { return ub };
    let n = (t.num_verts as usize).min(6);
    if n < 3 || stages <= 0 {
        return ub;
    }

    /* Stage sub-rect of the horizontal atlas strip. */
    let frac = req.frac.clamp(0.0, 1.0);
    let stage = ((frac * stages as f32) as i32).clamp(0, stages - 1);
    let su0 = stage as f32 / stages as f32;
    let su1 = (stage + 1) as f32 / stages as f32;

    let width = hex_mesher::block_hex_width(req.block, req.tile, req.depth).min(1.0);
    let corners: Vec<DVec3> =
        (0..n).map(|k| hex_mesher::shrink_corner(t, k as i32, width)).collect();

    let axis = dvec3_normalize(t.center);
    /* Tangent basis anchored at corner 0 - the shader's angle origin,
     * so the side-face wrap starts at a real corner. */
    let c0 = corners[0];
    let mut t1 = dvec3_sub(c0, dvec3_scale(axis, dvec3_dot(c0, axis)));
    let t1_len = dvec3_length(t1);
    if t1_len < 1e-9 {
        return ub;
    }
    t1 = dvec3_scale(t1, 1.0 / t1_len);
    let t2 = dvec3_cross(axis, t1);

    /* Corner angular radius (sin of the centre->corner angle) - the
     * cap fan's radial normalisation, mirroring length(perp) of a unit
     * fragment direction in the shader. */
    let mut rho_max = 0.0f64;
    for c in &corners {
        let cd = dvec3_normalize(*c);
        let perp = dvec3_sub(cd, dvec3_scale(axis, dvec3_dot(cd, axis)));
        rho_max = rho_max.max(dvec3_length(perp));
    }

    ub.u_crack_axis = [axis.x as f32, axis.y as f32, axis.z as f32, alpha];
    ub.u_crack_band = [
        w.depth_to_radius_m(req.depth) as f32,
        w.depth_to_radius_m(req.depth + 1) as f32,
        su0,
        su1,
    ];
    ub.u_crack_t1 = [t1.x as f32, t1.y as f32, t1.z as f32, rho_max as f32];
    ub.u_crack_t2 = [t2.x as f32, t2.y as f32, t2.z as f32, n as f32];
    for k in 0..n {
        let a = corners[k];
        let b = corners[(k + 1) % n];
        let mut pn = dvec3_cross(a, b);
        let l = dvec3_length(pn);
        if l < 1e-12 {
            continue;
        }
        pn = dvec3_scale(pn, 1.0 / l);
        /* Orient outward - the cell axis points into the interior. */
        if dvec3_dot(pn, axis) > 0.0 {
            pn = dvec3_scale(pn, -1.0);
        }
        ub.u_crack_planes[k] = [pn.x as f32, pn.y as f32, pn.z as f32, 0.0];
    }
    ub
}

/// Load the crack-stage atlas once, at boot (see `preload_break_atlas`).
/// Returns `(view, sampler, stages)`. The hex pipeline binds this view
/// on EVERY terrain draw (the crack channel is a shader branch, not a
/// separate pass), so a missing PNG falls back to a 1x1 transparent
/// atlas instead of disabling - the binding must always be valid.
fn ensure_crack_atlas() -> (u32, u32, i32) {
    if CRACK_STATE.with(|c| c.get()) == 1 {
        return (
            CRACK_VIEW.with(|c| c.get()),
            CRACK_SMP.with(|c| c.get()),
            CRACK_STAGES.with(|c| c.get()),
        );
    }
    let path = "assets/textures/break_stages.png";
    let (w, h, rgba) = match load_png_rgba(path, false) {
        Some(img) if img.h > 0 && img.w / img.h > 0 => (img.w, img.h, img.rgba),
        _ => {
            println!("[break] {} missing; crack channel gets a blank 1x1 atlas", path);
            (1, 1, vec![0u8; 4])
        }
    };
    /* Horizontal strip of square stages: count = width / height. */
    let stages = w / h;
    let mut desc = sg::ImageDesc {
        width: w,
        height: h,
        pixel_format: sg::PixelFormat::Rgba8,
        label: c"break-atlas".as_ptr(),
        ..Default::default()
    };
    desc.data.mip_levels[0] = sg::slice_as_range(&rgba);
    let image = sg::make_image(&desc);
    let view = sg::make_view(&sg::ViewDesc {
        texture: sg::TextureViewDesc { image, ..Default::default() },
        label: c"break-view".as_ptr(),
        ..Default::default()
    });
    let smp = sg::make_sampler(&sg::SamplerDesc {
        min_filter: sg::Filter::Nearest,
        mag_filter: sg::Filter::Nearest,
        wrap_u: sg::Wrap::ClampToEdge,
        wrap_v: sg::Wrap::ClampToEdge,
        label: c"break-sampler".as_ptr(),
        ..Default::default()
    });
    CRACK_VIEW.with(|c| c.set(view.id));
    CRACK_SMP.with(|c| c.set(smp.id));
    CRACK_STAGES.with(|c| c.set(stages));
    CRACK_STATE.with(|c| c.set(1));
    println!("[break] crack atlas loaded: {} stages ({}x{})", stages, w, h);
    (view.id, smp.id, stages)
}

/// Preload the crack atlas at boot, OUTSIDE any render pass, so the
/// first mining frame never creates GPU resources mid-pass. Called from
/// app init after `ui_icons::init`.
pub fn preload_break_atlas() {
    let _ = ensure_crack_atlas();
}

/// Per-cell arrow emission for the F5 overlay - port of
/// `flow_arrow_visit()`. Emits one bright red arrow per flow cell:
/// shaft from the hex centre out along the flow direction plus two
/// barb lines at the tip. Returns true when an arrow was drawn.
fn flow_arrow_visit(w: &World, tile: i32, depth: i32, lift_m: f32) -> bool {
    let Some(t) = w.grid.tile(tile) else { return false };
    if w.blocks[(tile as usize) * WORLD_MAX_DEPTH as usize + depth as usize]
        != Block::Water.raw()
    {
        return false;
    }
    let mut flow_world = [0.0f32; 3];
    if !world_water::flow_direction(w, tile, depth, &mut flow_world) {
        return false;
    }

    /* Cap centre, lifted a hair along radial so the arrow sits flush
     * with the surface without z-fighting the wave crests. */
    let r_cap = w.depth_to_radius_m(depth + 1) + lift_m as f64;
    let cx = (t.center.x * r_cap) as f32;
    let cy = (t.center.y * r_cap) as f32;
    let cz = (t.center.z * r_cap) as f32;

    /* Project flow onto tile tangent plane, normalise. */
    let nx = t.center.x as f32;
    let ny = t.center.y as f32;
    let nz = t.center.z as f32;
    let dn = flow_world[0] * nx + flow_world[1] * ny + flow_world[2] * nz;
    let mut fx = flow_world[0] - nx * dn;
    let mut fy = flow_world[1] - ny * dn;
    let mut fz = flow_world[2] - nz * dn;
    let fl = (fx * fx + fy * fy + fz * fz).sqrt();
    if fl < 1e-4 {
        return false;
    }
    fx /= fl;
    fy /= fl;
    fz /= fl;
    let rx = ny * fz - nz * fy;
    let ry = nz * fx - nx * fz;
    let rz = nx * fy - ny * fx;

    /* Shaft fills most of a hex; barbs sweep ~30 deg BACK from the
     * tip (cos positive times -forward goes back, sin spreads). */
    let shaft = 0.60f32;
    let barb = 0.22f32;
    let cs = 0.524f32.cos(); /* 30 deg */
    let sn = 0.524f32.sin();

    let tipx = cx + fx * shaft;
    let tipy = cy + fy * shaft;
    let tipz = cz + fz * shaft;

    sgl::c4f(1.0, 0.15, 0.15, 1.0); /* bright red arrow = flow block */
    sgl::v3f(cx, cy, cz);
    sgl::v3f(tipx, tipy, tipz);

    let bax = -fx * cs + rx * sn;
    let bay = -fy * cs + ry * sn;
    let baz = -fz * cs + rz * sn;
    let bbx = -fx * cs - rx * sn;
    let bby = -fy * cs - ry * sn;
    let bbz = -fz * cs - rz * sn;
    sgl::v3f(tipx, tipy, tipz);
    sgl::v3f(tipx + bax * barb, tipy + bay * barb, tipz + baz * barb);
    sgl::v3f(tipx, tipy, tipz);
    sgl::v3f(tipx + bbx * barb, tipy + bby * barb, tipz + bbz * barb);
    true
}

/// Port of `renderer_draw_water_flow_debug()`. F5 overlay: a red
/// arrow on every water cell with a non-zero simulator flow
/// direction; the ABSENCE of an arrow is the diagnostic. No-op when
/// the flag is off.
pub fn draw_water_flow_debug(view: Mat4, proj: Mat4) {
    if !flow_debug() {
        return;
    }
    R.with(|cell| {
        let mut r = cell.borrow_mut();
        if r.active_body_idx < 0 {
            return;
        }
        let world_rc = r.bodies[r.active_body_idx as usize].world.clone();
        let w = world_rc.borrow();

        let pip = ensure_outline_pip();
        sgl::defaults();
        sgl::matrix_mode_projection();
        sgl::load_matrix(&proj.m[0]);
        sgl::matrix_mode_modelview();
        sgl::load_matrix(&view.m[0]);
        sgl::translate(
            w.body.pos_x as f32,
            w.body.pos_y as f32,
            w.body.pos_z as f32,
        );
        sgl::load_pipeline(pip);

        sgl::begin_lines();
        let lift_m = 0.05f32;
        let mut drawn = 0;
        world_water::origin_visit_all(&w, |tile, depth| {
            if flow_arrow_visit(&w, tile, depth, lift_m) {
                drawn += 1;
            }
        });
        sgl::end();

        if (r.time_seconds as f64) - r.flow_debug_last_log_s > 1.0 {
            println!("[flow-debug] drew {} arrow(s) this frame", drawn);
            r.flow_debug_last_log_s = r.time_seconds as f64;
        }
    });
}

/// Port of `renderer_draw_torches()`. Offscreen opaque pass alongside
/// terrain + moons so the water cap can sample torch pixels.
pub fn draw_torches(view: Mat4, proj: Mat4) {
    if !terrain_visible() {
        return;
    }
    let time_seconds = R.with(|cell| cell.borrow().time_seconds);
    let vp = mat4_mul(proj, view);
    torch::draw(vp, time_seconds);
}

/* ----------------------------------------------------------------------- */
/* Light glow - the far-LOD stand-in for the baked per-vertex torch
 * light. One emissive billboard per light, distance-scaled so a base
 * reads as a warm dot from orbit (past the 5 km chunk cutoff, where
 * the baked light's terrain mesh no longer draws) and on REMOTE
 * bodies whose lights came from the SP save (set_remote_lights). The
 * quad buffer only rebuilds when the light set changes (torch
 * generation counter / remote list update) - drawing is one bind +
 * one draw per lit body. */

struct GlowState {
    pip: sg::Pipeline,
    shd_made: bool,
    buf: sg::Buffer,
    cap_verts: usize,
    /* (body_id, first_vertex, vertex_count) into the shared buffer. */
    segments: Vec<(u32, i32, i32)>,
    last_gen: u64,
    remote_dirty: bool,
    /* body_id -> flame positions (body-local) from the SP save, for
     * bodies OTHER than the active one (whose live list wins). */
    remote: std::collections::HashMap<u32, Vec<Vec3>>,
}

thread_local! {
    static GLOW: RefCell<GlowState> = RefCell::new(GlowState {
        pip: sg::Pipeline::new(),
        shd_made: false,
        buf: sg::Buffer::new(),
        cap_verts: 0,
        segments: Vec::new(),
        last_gen: u64::MAX,
        remote_dirty: false,
        remote: std::collections::HashMap::new(),
    });
}

/// Install (or clear, with an empty list) the glow points for a body
/// the player is NOT currently on - SP loads these from the per-body
/// persisted torch lists so your bases still shine from another world.
pub fn set_remote_lights(body_id: u32, flames: Vec<Vec3>) {
    GLOW.with(|g| {
        let g = &mut *g.borrow_mut();
        if flames.is_empty() {
            g.remote.remove(&body_id);
        } else {
            g.remote.insert(body_id, flames);
        }
        g.remote_dirty = true;
    });
}

/// Drop every remote glow list (world exit / MP join).
pub fn clear_remote_lights() {
    GLOW.with(|g| {
        let g = &mut *g.borrow_mut();
        g.remote.clear();
        g.remote_dirty = true;
    });
}

/// One glow quad = 6 vertices of (center xyz, corner xy, size).
const GLOW_VERT_FLOATS: usize = 6;

fn glow_push_quad(verts: &mut Vec<f32>, c: Vec3, size: f32) {
    const CORNERS: [(f32, f32); 6] =
        [(-1.0, -1.0), (1.0, -1.0), (1.0, 1.0), (-1.0, -1.0), (1.0, 1.0), (-1.0, 1.0)];
    for (cx, cy) in CORNERS {
        verts.extend_from_slice(&[c.x, c.y, c.z, cx, cy, size]);
    }
}

/// Draw the emissive glow points. Runs inside the offscreen scene pass
/// (after the opaque terrain), additive with depth-test so the planet
/// occludes lights beyond the horizon.
pub fn draw_light_glow(view: Mat4, proj: Mat4) {
    let l = config::lighting();
    if l.glow_alpha_day <= 0.0 && l.glow_alpha_night <= 0.0 {
        return;
    }
    R.with(|cell| {
        let r = &mut *cell.borrow_mut();
        if r.active_body_idx < 0 {
            return;
        }
        let active_body_id = {
            let ab = &r.bodies[r.active_body_idx as usize];
            ab.world.borrow().body.id as u32
        };
        GLOW.with(|g| {
            let g = &mut *g.borrow_mut();

            /* Rebuild the quad buffer only when the light set moved. */
            let gen = torch::lights_generation();
            if gen != g.last_gen || g.remote_dirty {
                g.last_gen = gen;
                g.remote_dirty = false;
                let mut verts: Vec<f32> = Vec::new();
                g.segments.clear();
                {
                    let first = 0i32;
                    torch::with_lights(|list| {
                        for t in list {
                            glow_push_quad(&mut verts, torch::flame_pos(t), 0.0);
                        }
                    });
                    let count = (verts.len() / GLOW_VERT_FLOATS) as i32;
                    if count > 0 {
                        g.segments.push((active_body_id, first, count));
                    }
                }
                for (&body_id, flames) in g.remote.iter() {
                    if body_id == active_body_id {
                        continue; /* live list already covers it */
                    }
                    let first = (verts.len() / GLOW_VERT_FLOATS) as i32;
                    for f in flames {
                        glow_push_quad(&mut verts, *f, 0.0);
                    }
                    let count = (verts.len() / GLOW_VERT_FLOATS) as i32 - first;
                    if count > 0 {
                        g.segments.push((body_id, first, count));
                    }
                }
                let need = verts.len();
                if need > 0 {
                    if need > g.cap_verts {
                        if g.buf.id != sg::Buffer::new().id {
                            sg::destroy_buffer(g.buf);
                        }
                        g.cap_verts = need * 2;
                        g.buf = sg::make_buffer(&sg::BufferDesc {
                            size: g.cap_verts * std::mem::size_of::<f32>(),
                            usage: sg::BufferUsage {
                                stream_update: true,
                                ..Default::default()
                            },
                            label: c"glow-quads".as_ptr(),
                            ..Default::default()
                        });
                    }
                    sg::update_buffer(g.buf, &sg::slice_as_range(&verts));
                }
            }
            if g.segments.is_empty() {
                return;
            }

            /* Lazy pipeline against the offscreen formats: additive,
             * depth-tested, no depth write. */
            if !g.shd_made {
                g.shd_made = true;
                let shd =
                    sg::make_shader(&shaders::glow::glow_shader_desc(sg::query_backend()));
                let mut desc = sg::PipelineDesc {
                    shader: shd,
                    index_type: sg::IndexType::None,
                    depth: sg::DepthState {
                        pixel_format: sg::PixelFormat::DepthStencil,
                        compare: sg::CompareFunc::LessEqual,
                        write_enabled: false,
                        ..Default::default()
                    },
                    cull_mode: sg::CullMode::None,
                    sample_count: 1,
                    label: c"glow-pipeline".as_ptr(),
                    ..Default::default()
                };
                desc.colors[0].pixel_format = sg::PixelFormat::Rgba8;
                desc.colors[0].blend = sg::BlendState {
                    enabled: true,
                    src_factor_rgb: sg::BlendFactor::One,
                    dst_factor_rgb: sg::BlendFactor::One,
                    src_factor_alpha: sg::BlendFactor::One,
                    dst_factor_alpha: sg::BlendFactor::One,
                    ..Default::default()
                };
                desc.layout.attrs[shaders::glow::ATTR_GLOW_A_CENTER].format =
                    sg::VertexFormat::Float3;
                desc.layout.attrs[shaders::glow::ATTR_GLOW_A_CORNER].format =
                    sg::VertexFormat::Float2;
                desc.layout.attrs[shaders::glow::ATTR_GLOW_A_SIZE].format =
                    sg::VertexFormat::Float;
                g.pip = sg::make_pipeline(&desc);
            }

            let basis = camera_basis(view, proj);
            let vp = mat4_mul(proj, view);
            sg::apply_pipeline(g.pip);
            let mut bind = sg::Bindings::new();
            bind.vertex_buffers[0] = g.buf;
            sg::apply_bindings(&bind);
            let fsp = shaders::glow::GlowFsParams {
                u_color: [l.glow_color.x, l.glow_color.y, l.glow_color.z, 0.0],
            };

            for &(body_id, first, count) in &g.segments {
                /* Body world position: lights are stored body-local. */
                let Some(bi) = r
                    .bodies
                    .iter()
                    .position(|b| b.world.borrow().body.id as u32 == body_id)
                else {
                    continue;
                };
                let body_pos = r.bodies[bi].world_pos;
                let model = mat4_translate(body_pos);
                let mvp = mat4_mul(vp, model);
                let cam_local = vec3_sub(r.env.camera_world, body_pos);
                let vsp = shaders::glow::GlowVsParams {
                    u_mvp: mvp.m,
                    u_right_min: [
                        basis.right[0],
                        basis.right[1],
                        basis.right[2],
                        l.glow_min_size_m,
                    ],
                    u_up_scale: [basis.up[0], basis.up[1], basis.up[2], l.glow_size_per_m],
                    u_cam_day: [cam_local.x, cam_local.y, cam_local.z, l.glow_alpha_day],
                    u_sun_night: [
                        r.env.sun_dir.x,
                        r.env.sun_dir.y,
                        r.env.sun_dir.z,
                        l.glow_alpha_night,
                    ],
                };
                sg::apply_uniforms(
                    shaders::glow::UB_GLOW_VS_PARAMS,
                    &sg::value_as_range(&vsp),
                );
                sg::apply_uniforms(shaders::glow::UB_GLOW_FS_PARAMS, &sg::value_as_range(&fsp));
                sg::draw(first as usize, count as usize, 1);
            }
        });
    });
}

/* ----------------------------------------------------------------------- */
/* Launch-tower cutout geometry (client::rocket_fx). A raw sg draw (not sgl)
 * so the fragment shader can DISCARD transparent truss texels - giving a
 * double-sided (cull none) alpha cutout that writes depth for the beams,
 * so clouds and its own far faces sort correctly. Verts are world-space
 * [pos.xyz, uv.xy, shade] (6 floats each); drawn in the offscreen pass. */

struct TowerGeo {
    buf: sg::Buffer,
    cap_floats: usize,
    pip: sg::Pipeline,
    made: bool,
}

thread_local! {
    static TOWER_GEO: std::cell::RefCell<TowerGeo> = const {
        std::cell::RefCell::new(TowerGeo {
            buf: sg::Buffer { id: 0 },
            cap_floats: 0,
            pip: sg::Pipeline { id: 0 },
            made: false,
        })
    };
}

const TOWER_VERT_FLOATS: usize = 6;

/// Draw the launch-tower truss geometry with the alpha-cutout shader.
/// `verts` = world-space [x,y,z,u,v,shade] per vertex; `tex_view`/`tex_smp`
/// are the launch-tower texture handles.
pub fn draw_tower_cutout(view: Mat4, proj: Mat4, verts: &[f32], tex_view: u32, tex_smp: u32) {
    if verts.len() < TOWER_VERT_FLOATS {
        return;
    }
    TOWER_GEO.with(|c| {
        let g = &mut *c.borrow_mut();
        if !g.made {
            g.made = true;
            let shd = sg::make_shader(&shaders::tower::tower_shader_desc(sg::query_backend()));
            let mut desc = sg::PipelineDesc {
                shader: shd,
                index_type: sg::IndexType::None,
                depth: sg::DepthState {
                    pixel_format: sg::PixelFormat::DepthStencil,
                    compare: sg::CompareFunc::LessEqual,
                    write_enabled: true,
                    ..Default::default()
                },
                cull_mode: sg::CullMode::None,
                sample_count: 1,
                label: c"tower-pipeline".as_ptr(),
                ..Default::default()
            };
            desc.colors[0].pixel_format = sg::PixelFormat::Rgba8;
            desc.layout.attrs[shaders::tower::ATTR_TOWER_A_POS].format = sg::VertexFormat::Float3;
            desc.layout.attrs[shaders::tower::ATTR_TOWER_A_UV].format = sg::VertexFormat::Float2;
            desc.layout.attrs[shaders::tower::ATTR_TOWER_A_SHADE].format = sg::VertexFormat::Float;
            g.pip = sg::make_pipeline(&desc);
        }
        if verts.len() > g.cap_floats {
            if g.buf.id != 0 {
                sg::destroy_buffer(g.buf);
            }
            g.cap_floats = verts.len() * 2;
            g.buf = sg::make_buffer(&sg::BufferDesc {
                size: g.cap_floats * std::mem::size_of::<f32>(),
                usage: sg::BufferUsage { stream_update: true, ..Default::default() },
                label: c"tower-verts".as_ptr(),
                ..Default::default()
            });
        }
        sg::update_buffer(g.buf, &sg::slice_as_range(verts));
        let vp = mat4_mul(proj, view);
        sg::apply_pipeline(g.pip);
        let mut bind = sg::Bindings::new();
        bind.vertex_buffers[0] = g.buf;
        bind.views[shaders::tower::VIEW_TOWER_TEX] = sg::View { id: tex_view };
        bind.samplers[shaders::tower::SMP_TOWER_SMP] = sg::Sampler { id: tex_smp };
        sg::apply_bindings(&bind);
        let vsp = shaders::tower::TowerVsParams { u_vp: vp.m };
        sg::apply_uniforms(shaders::tower::UB_TOWER_VS_PARAMS, &sg::value_as_range(&vsp));
        sg::draw(0, verts.len() / TOWER_VERT_FLOATS, 1);
    });
}

/* ----------------------------------------------------------------------- */
/* Frame counters + accessors. */

/// The renderer's frame clock (seconds since boot) - the same value the
/// torch flicker + water waves animate on. Exposed so sibling entity
/// renderers (animals' idle clip, viewmodel sway) stay in sync with it.
pub fn time_seconds() -> f32 {
    R.with(|cell| cell.borrow().time_seconds)
}

/// Port of `renderer_triangles_drawn_this_frame()`.
pub fn triangles_drawn_this_frame() -> usize {
    R.with(|cell| cell.borrow().tris)
}

/// Port of `renderer_tiles_drawn_this_frame()`.
pub fn tiles_drawn_this_frame() -> usize {
    R.with(|cell| {
        let r = cell.borrow();
        if r.active_body_idx < 0 {
            return 0;
        }
        r.bodies[r.active_body_idx as usize].mesh_cursor as usize
    })
}

/// Port of `renderer_tiles_remeshed_this_frame()`.
pub fn tiles_remeshed_this_frame() -> usize {
    R.with(|cell| cell.borrow().tiles_remeshed)
}

/// Port of `renderer_chunk_count(int*, int*)` - returns
/// (total chunk count, tiles meshed on the active body).
pub fn chunk_count() -> (i32, i32) {
    R.with(|cell| {
        let r = cell.borrow();
        let tiles_meshed = if r.active_body_idx >= 0 {
            r.bodies[r.active_body_idx as usize].mesh_cursor
        } else {
            0
        };
        (chunk_n() as i32, tiles_meshed)
    })
}

/// Port of `renderer_atlas_view_id()` - raw sg_view id so UI modules
/// (hotbar) can sample the same atlas the terrain mesher uses.
pub fn atlas_view_id() -> u32 {
    R.with(|cell| cell.borrow().atlas_view.id)
}

/// Port of `renderer_atlas_sampler_id()`.
pub fn atlas_sampler_id() -> u32 {
    R.with(|cell| cell.borrow().atlas_smp.id)
}

/* ----------------------------------------------------------------------- */

#[cfg(test)]
mod tests {
    use super::*;
    use crate::gfx_math::{mat4_look_at, mat4_perspective};
    use tenebris_core::math::vec3_make;
    use tenebris_core::planet::{self, BodyId};

    const EPS: f32 = 1e-6;

    /* --------------------------------------------------------------- */
    /* Chunk anchors + tile classification.                              */

    #[test]
    fn chunk_anchors_pinned() {
        /* No lod.yaml is loaded in the test binary, so the live count
         * is the compiled-in mesh_chunk_count default. */
        assert_eq!(chunk_n(), 128);
        let anchors = chunk_anchors();
        assert_eq!(anchors.len(), chunk_n());
        /* Every anchor is unit length (the Fibonacci lattice generates
         * points directly on the unit sphere). */
        for a in anchors.iter() {
            let len = (a.x * a.x + a.y * a.y + a.z * a.z).sqrt();
            assert!((len - 1.0).abs() < 1e-12, "len = {len}");
        }
        /* y descends monotonically from ~+1 to ~-1 (the lattice's
         * latitude sequence y_i = 1 - 2(i + 0.5)/N). */
        let n = anchors.len() as f64;
        for (i, a) in anchors.iter().enumerate() {
            let want_y = 1.0 - 2.0 * (i as f64 + 0.5) / n;
            assert!((a.y - want_y).abs() < 1e-15, "anchor {i} y = {}", a.y);
        }
        /* Pin anchor[0] and anchor[1] against the golden-angle
         * construction: th_i = pi * (3 - sqrt(5)) * i,
         * anchor = (cos(th) * r, y, sin(th) * r). */
        let golden = std::f64::consts::PI * (3.0 - 5.0f64.sqrt());
        let y0 = 1.0 - 1.0 / n;
        let r0 = (1.0 - y0 * y0).max(0.0).sqrt();
        assert!((anchors[0].x - r0).abs() < 1e-15);
        assert_eq!(anchors[0].z, 0.0); /* sin(0) * r0 */
        let y1 = 1.0 - 3.0 / n;
        let r1 = (1.0 - y1 * y1).max(0.0).sqrt();
        assert!((anchors[1].x - golden.cos() * r1).abs() < 1e-15);
        assert!((anchors[1].z - golden.sin() * r1).abs() < 1e-15);
    }

    #[test]
    fn classify_tile_nearest_anchor() {
        let anchors = chunk_anchors();
        /* A direction exactly on an anchor classifies to that anchor. */
        for (i, a) in anchors.iter().enumerate() {
            assert_eq!(classify_tile(*a), i as i32, "anchor {i}");
        }
        /* A direction nudged slightly off anchor 7 still maps to 7. */
        let a = anchors[7];
        let nudged = dvec3_normalize(DVec3 { x: a.x + 0.01, y: a.y, z: a.z });
        assert_eq!(classify_tile(nudged), 7);
    }

    /* --------------------------------------------------------------- */
    /* Rebuild scheduling.                                               */

    #[test]
    fn remesh_budget_always_rebuilds_one_chunk() {
        /* Progress guarantee: the first dirty chunk rebuilds no matter
         * how small (or already-blown) the budget is, so a hostile
         * config can't starve the queue. */
        assert!(remesh_budget_allows(0, 0.0, 0.0));
        assert!(remesh_budget_allows(0, 100.0, 0.0));
        assert!(remesh_budget_allows(0, 100.0, 4.0));
        /* Past the first chunk the wall-clock budget gates (C: break
         * when chunks_rebuilt >= 1 && elapsed >= budget). */
        assert!(remesh_budget_allows(1, 3.9, 4.0));
        assert!(!remesh_budget_allows(1, 4.0, 4.0));
        assert!(!remesh_budget_allows(5, 100.0, 4.0));
        assert!(remesh_budget_allows(5, 0.5, 4.0));
    }

    #[test]
    fn grow_capacity_doubles_until_fit() {
        assert_eq!(grow_capacity(32, 32), 32);
        assert_eq!(grow_capacity(32, 33), 64);
        assert_eq!(grow_capacity(32, 100), 128);
        assert_eq!(grow_capacity(INIT_VERTICES, INIT_VERTICES * 3), INIT_VERTICES * 4);
    }

    #[test]
    fn chunked_vs_lod_rule() {
        /* Active body inside the cutoff: chunked. */
        assert!(body_draws_chunked(true, 10.0));
        assert!(body_draws_chunked(true, MAX_DETAIL_DIST_M));
        /* Active body past the cutoff: LOD (icosphere). */
        assert!(!body_draws_chunked(true, MAX_DETAIL_DIST_M + 1.0));
        /* Non-active bodies are ALWAYS LOD regardless of distance. */
        assert!(!body_draws_chunked(false, 10.0));
        assert!(!body_draws_chunked(false, 9999999.0));
    }

    /* --------------------------------------------------------------- */
    /* Frustum + chunk cull.                                             */

    #[test]
    fn frustum_sphere_visibility() {
        /* Camera at +5z looking at origin, 90 deg fov, far 100. */
        let view = mat4_look_at(
            vec3_make(0.0, 0.0, 5.0),
            vec3_make(0.0, 0.0, 0.0),
            vec3_make(0.0, 1.0, 0.0),
        );
        let proj = mat4_perspective(std::f32::consts::FRAC_PI_2, 1.6, 0.1, 100.0);
        let frustum = extract_frustum(mat4_mul(proj, view));
        /* Origin in front: visible. */
        assert!(sphere_visible(&frustum, vec3_make(0.0, 0.0, 0.0), 1.0));
        /* Behind the camera: culled. */
        assert!(!sphere_visible(&frustum, vec3_make(0.0, 0.0, 20.0), 1.0));
        /* Beyond the far plane: culled. */
        assert!(!sphere_visible(&frustum, vec3_make(0.0, 0.0, -200.0), 1.0));
        /* Far off to the side: culled; large radius rescues it. */
        assert!(!sphere_visible(&frustum, vec3_make(500.0, 0.0, 0.0), 1.0));
        assert!(sphere_visible(&frustum, vec3_make(500.0, 0.0, 0.0), 600.0));
    }

    #[test]
    fn chunk_cull_pinned() {
        /* Camera exactly at body centre: pathological, no cull. */
        let cc = compute_chunk_cull(vec3_make(0.0, 0.0, 0.0), 100.0, vec3_make(0.0, 0.0, 0.0));
        assert_eq!(cc.cull_cos, -2.0);
        for ci in 0..chunk_n() {
            assert!(chunk_visible(&cc, ci));
        }
        /* Camera at 2x radius along +X: cos_h = 0.5, theta_h = pi/3,
         * cull_cos = cos(pi/3 + pad * acos(1 - 2/N)) with the
         * compiled-in pad factor (1.55) and chunk count (128). */
        let cc = compute_chunk_cull(vec3_make(0.0, 0.0, 0.0), 100.0, vec3_make(200.0, 0.0, 0.0));
        assert!((cc.cux - 1.0).abs() < 1e-12);
        assert_eq!(cc.cuy, 0.0);
        assert_eq!(cc.cuz, 0.0);
        let cap_half = (1.0 - 2.0 / chunk_n() as f64).acos();
        let theta_chunk = config::lod().mesh_cull_pad_factor as f64 * cap_half;
        let want = (std::f64::consts::FRAC_PI_3 + theta_chunk).cos();
        assert!((cc.cull_cos - want).abs() < 1e-12, "cull_cos = {}", cc.cull_cos);
        /* The anchor best aligned with the camera direction (+X) is
         * kept; the one facing directly away is culled. */
        let anchors = chunk_anchors();
        let mut best_i = 0;
        let mut worst_i = 0;
        for (i, a) in anchors.iter().enumerate() {
            if a.x > anchors[best_i].x {
                best_i = i;
            }
            if a.x < anchors[worst_i].x {
                worst_i = i;
            }
        }
        assert!(chunk_visible(&cc, best_i));
        assert!(!chunk_visible(&cc, worst_i));
    }

    /* --------------------------------------------------------------- */
    /* Camera basis + skybox uniforms.                                   */

    #[test]
    fn camera_basis_pinned() {
        let view = mat4_look_at(
            vec3_make(0.0, 0.0, 5.0),
            vec3_make(0.0, 0.0, 0.0),
            vec3_make(0.0, 1.0, 0.0),
        );
        let proj = mat4_perspective(std::f32::consts::FRAC_PI_2, 1.6, 0.1, 100.0);
        let basis = camera_basis(view, proj);
        assert_eq!(basis.right, [1.0, 0.0, 0.0]);
        assert_eq!(basis.up, [0.0, 1.0, 0.0]);
        assert_eq!(basis.fwd, [0.0, 0.0, -1.0]);
        /* fovY = 90 deg -> tan_half = 1; aspect recovered = 1.6. */
        assert!((basis.tan_half - 1.0).abs() <= EPS);
        assert!((basis.aspect - 1.6).abs() <= 1e-5);
        /* Degenerate projection falls back to 1 / 1 (C guards). */
        let basis = camera_basis(view, Mat4 { m: [0.0; 16] });
        assert_eq!(basis.tan_half, 1.0);
        assert_eq!(basis.aspect, 1.0);
    }

    #[test]
    fn bg_atten_pinned() {
        /* No atmosphere - stars at full brightness. */
        let env = RenderEnv::default();
        assert_eq!(starfield_bg_atten(&env), 1.0);
        /* Camera at the bottom of a thick atmosphere: density ~ 1,
         * atten clamps to the 0.05 floor. */
        let env = RenderEnv {
            atmo_strength: 1.0,
            atmo_planet_radius: 100.0,
            atmo_lower_radius: 100.0,
            atmo_radius: 130.0,
            atmo_scale_height: 0.25,
            camera_world: vec3_make(100.0, 0.0, 0.0), /* on the ground */
            ..Default::default()
        };
        assert_eq!(starfield_bg_atten(&env), 0.05);
        /* Camera at the top of the shell: density ~ exp(-4) ~ 0.018,
         * atten ~ 0.982. */
        let env = RenderEnv { camera_world: vec3_make(130.0, 0.0, 0.0), ..env };
        let atten = starfield_bg_atten(&env);
        assert!((atten - (1.0 - (-4.0f32).exp())).abs() <= EPS, "atten = {atten}");
    }

    #[test]
    fn starfield_params_mapping() {
        let sky = config::skybox(); /* compiled-in defaults */
        let view = mat4_look_at(
            vec3_make(0.0, 0.0, 5.0),
            vec3_make(0.0, 0.0, 0.0),
            vec3_make(0.0, 1.0, 0.0),
        );
        let proj = mat4_perspective(std::f32::consts::FRAC_PI_2, 1.6, 0.1, 100.0);
        let basis = camera_basis(view, proj);
        let sp = build_starfield_params(&sky, &basis, 12.5, 0.75);
        assert_eq!(sp.u_cam_right, basis.right);
        assert_eq!(sp.u_cam_up, basis.up);
        assert_eq!(sp.u_cam_fwd, basis.fwd);
        assert_eq!(sp.u_sky_params, [basis.tan_half, basis.aspect, 12.5, 0.75]);
        assert_eq!(
            sp.u_star_densities,
            [
                sky.star_densities.x,
                sky.star_densities.y,
                sky.star_densities.z,
                sky.star_sharpness
            ]
        );
        assert_eq!(
            sp.u_nebula_smoothstep,
            [
                sky.nebula_cloud_lo,
                sky.nebula_cloud_hi,
                sky.nebula_warm_blend_lo,
                sky.nebula_warm_blend_hi
            ]
        );
        assert_eq!(sp.u_space_color, [sky.space_color.x, sky.space_color.y, sky.space_color.z]);
    }

    #[test]
    fn atmosphere_params_mapping() {
        let env = RenderEnv {
            sun_dir: vec3_make(0.0, 1.0, 0.0),
            atmo_planet_center: vec3_make(10.0, 20.0, 30.0),
            atmo_planet_radius: 300.0,
            atmo_radius: 390.0,
            atmo_strength: 1.0,
            atmo_rayleigh_scale: 1.0,
            atmo_mie_scale: 0.05,
            atmo_mie_g: 0.76,
            atmo_sun_intensity: 30.0,
            atmo_scale_height: 0.0, /* zero -> shader default 0.25 */
            camera_world: vec3_make(11.0, 22.0, 33.0),
            ..Default::default()
        };
        let view = mat4_look_at(
            vec3_make(0.0, 0.0, 5.0),
            vec3_make(0.0, 0.0, 0.0),
            vec3_make(0.0, 1.0, 0.0),
        );
        let proj = mat4_perspective(std::f32::consts::FRAC_PI_2, 1.6, 0.1, 100.0);
        let basis = camera_basis(view, proj);
        let (avp, afp) = build_atmosphere_params(&env, &basis);
        /* Camera position arrives PLANET-LOCAL. */
        assert_eq!(avp.camera_pos, [1.0, 2.0, 3.0, 0.0]);
        assert_eq!(avp.cam_right[3], basis.tan_half);
        assert_eq!(avp.cam_up[3], basis.aspect);
        assert_eq!(afp.sun_direction, [0.0, 1.0, 0.0, 0.0]);
        assert_eq!(afp.radii, [300.0, 390.0, 0.25, 0.0]);
        assert_eq!(afp.scatter_coeffs, [1.0, 0.05, 0.76, 30.0]);
    }

    #[test]
    fn sun_mvp_matches_gfx_math_composition() {
        let view = mat4_look_at(
            vec3_make(1.0, 2.0, 3.0),
            vec3_make(0.0, 0.0, 0.0),
            vec3_make(0.0, 1.0, 0.0),
        );
        let proj = mat4_perspective(1.0, 1.5, 0.3, 20000.0);
        let pos = vec3_make(100.0, -50.0, 75.0);
        let mvp = sun_mvp(view, proj, pos, 12.0);
        /* Manual composition: (proj*view) * (translate * scale). */
        let mut scale = mat4_identity();
        scale.m[0] = 12.0;
        scale.m[5] = 12.0;
        scale.m[10] = 12.0;
        let want = mat4_mul(mat4_mul(proj, view), mat4_mul(mat4_translate(pos), scale));
        assert_eq!(mvp.m, want.m);
    }

    /* --------------------------------------------------------------- */
    /* Procedural meshes.                                                */

    #[test]
    fn uvsphere_counts_and_first_verts() {
        let (sv, si) = build_uvsphere_mesh();
        /* (LAT+1) x (LON+1) = 17 x 33 = 561 verts; LAT*LON*6 = 3072
         * indices. */
        assert_eq!(sv.len(), 561 * 3);
        assert_eq!(si.len(), 3072);
        /* First vertex: phi = 0 -> (0, 1, 0) (sin(0)=0, cos(0)=1). */
        assert_eq!(&sv[0..3], &[0.0, 1.0, 0.0]);
        /* All indices in range. */
        assert!(si.iter().all(|&i| (i as usize) < 561));
        /* First quad: a=0, b=33 -> [0, 33, 1, 1, 33, 34]. */
        assert_eq!(&si[0..6], &[0, 33, 1, 1, 33, 34]);
    }

    #[test]
    fn distant_mesh_subdivision_counts() {
        /* levels=0: bare icosahedron. */
        let (v, i) = build_distant_mesh(0);
        assert_eq!(v.len(), 12 * 6);
        assert_eq!(i.len(), 20 * 3);
        /* levels=2 (the lod.yaml default): 162 verts / 320 tris. */
        let (v, i) = build_distant_mesh(2);
        assert_eq!(v.len(), 162 * 6);
        assert_eq!(i.len(), 320 * 3);
        /* levels=3 hits the C's static caps exactly: 642 verts / 1280
         * tris (DISTANT_MAX_VERTS=1024 / DISTANT_MAX_TRIS=1280). */
        let (v, i) = build_distant_mesh(3);
        assert_eq!(v.len(), 642 * 6);
        assert!(642 <= DISTANT_MAX_VERTS);
        assert_eq!(i.len(), DISTANT_MAX_TRIS * 3);
        /* Every vertex unit length; normal == position (radial). */
        for vert in v.chunks_exact(6) {
            let len = (vert[0] * vert[0] + vert[1] * vert[1] + vert[2] * vert[2]).sqrt();
            assert!((len - 1.0).abs() < 1e-5, "len = {len}");
            assert_eq!(&vert[0..3], &vert[3..6]);
        }
        /* Indices in range. */
        assert!(i.iter().all(|&x| (x as usize) < 642));
    }

    #[test]
    fn distant_pixel_to_dir_pinned() {
        /* Every direction is unit length. */
        for &(px, py) in &[(0, 0), (128, 64), (255, 127), (64, 100)] {
            let d = distant_pixel_to_dir(px, py);
            let len = (d.x * d.x + d.y * d.y + d.z * d.z).sqrt();
            assert!((len - 1.0).abs() < 1e-12);
        }
        /* Top row: lat = (0.5 - 0.5/128) * pi -> y ~ +1 (north pole). */
        let d = distant_pixel_to_dir(0, 0);
        assert!(d.y > 0.999, "y = {}", d.y);
        /* Bottom row: y ~ -1. */
        let d = distant_pixel_to_dir(0, DISTANT_TEX_H - 1);
        assert!(d.y < -0.999);
        /* Equator-centre pixel: lon = (128.5/256 - 0.5) * 2pi, lat =
         * (0.5 - 64.5/128) * pi. */
        let d = distant_pixel_to_dir(128, 64);
        let lon = (128.5 / 256.0 - 0.5) * 2.0 * std::f64::consts::PI;
        let lat = (0.5 - 64.5 / 128.0) * std::f64::consts::PI;
        assert!((d.x - lat.cos() * lon.cos()).abs() < 1e-12);
        assert!((d.y - lat.sin()).abs() < 1e-12);
        assert!((d.z - lat.cos() * lon.sin()).abs() < 1e-12);
    }

    /* --------------------------------------------------------------- */
    /* Atlas bake (synthetic loader - no files, no GPU).                 */

    #[test]
    fn atlas_bake_tint_clamp_and_averages() {
        let bake = bake_atlas_pixels(|path| match path {
            "assets/textures/water.png" => Some(LoadedImage {
                w: 1,
                h: 1,
                rgba: vec![100, 200, 50, 255],
            }),
            "assets/textures/moon.png" => Some(LoadedImage {
                w: 2,
                h: 2,
                rgba: vec![255; 16],
            }),
            _ => None,
        });
        assert_eq!(bake.pixels.len(), (ATLAS_W * ATLAS_H * 4) as usize);

        /* Column 0 has no source image: fully transparent, average
         * falls back to mid-gray. */
        let idx0 = 0usize;
        assert_eq!(&bake.pixels[idx0..idx0 + 4], &[0, 0, 0, 0]);
        assert_eq!(bake.col_avg[0], Vec3 { x: 0.5, y: 0.5, z: 0.5 });

        /* Column 1 (water, untinted): the 1x1 source repeats across
         * the 16x16 cell. */
        let idx1 = ((0 * ATLAS_W + ATLAS_TILE_PX) * 4) as usize;
        assert_eq!(&bake.pixels[idx1..idx1 + 4], &[100, 200, 50, 255]);
        let avg = bake.col_avg[1];
        assert!((avg.x - 100.0 / 255.0).abs() <= EPS);
        assert!((avg.y - 200.0 / 255.0).abs() <= EPS);
        assert!((avg.z - 50.0 / 255.0).abs() <= EPS);

        /* Column 11 (moon, untinted): pure white. */
        let idx11 = ((11 * ATLAS_TILE_PX) * 4) as usize;
        assert_eq!(&bake.pixels[idx11..idx11 + 4], &[255, 255, 255, 255]);

        /* Column 18 (moon tinted Mars-red 1.30/0.55/0.35): red clamps
         * at 255, green = (255*0.55) = 140 (truncated), blue = 89. */
        let idx18 = ((18 * ATLAS_TILE_PX) * 4) as usize;
        assert_eq!(&bake.pixels[idx18..idx18 + 4], &[255, 140, 89, 255]);
        let avg = bake.col_avg[18];
        assert!((avg.x - 1.0).abs() <= EPS);
        assert!((avg.y - 140.0 / 255.0).abs() <= EPS);
        assert!((avg.z - 89.0 / 255.0).abs() <= EPS);

        /* Paths table spot checks (the C's paths[] order). */
        assert_eq!(ATLAS_PATHS[1], Some("assets/textures/water.png"));
        assert_eq!(ATLAS_PATHS[10], Some("assets/textures/torch.png"));
        /* SEQ_LEAVES is Sequoia's OWN baked foliage texture (tint
         * passthrough) - tinting stock tiles kept failing (grass.png
         * has no red channel; snow.png's blue specks bled through). */
        assert_eq!(
            ATLAS_PATHS[24],
            Some("assets/textures/planet_seq/planet_seq_leaves.png")
        );
        assert_eq!(ATLAS_TINTS[24], [1.0, 1.0, 1.0]);
    }

    /* --------------------------------------------------------------- */
    /* Distant LOD colour sampling.                                      */

    #[test]
    fn lod_color_water_blend_invariants() {
        let body = planet::get(BodyId::Tenebris); /* has_water = true */
        let col_avg = [Vec3 { x: 0.4, y: 0.4, z: 0.4 }; ATLAS_TILES];
        let fallback = vec3_make(0.1, 0.2, 0.3);
        let dir = dvec3_normalize(DVec3 { x: 0.3, y: 0.8, z: 0.5 });
        /* Deep below sea level: water alpha saturates at 1 (default
         * full depth = 4 m). */
        let (_, alpha) = sample_planet_lod_color(&body, fallback, dir, -10.0, &col_avg);
        assert_eq!(alpha, 1.0);
        /* Halfway: alpha = depth / full_depth = 0.5. */
        let (_, alpha) = sample_planet_lod_color(&body, fallback, dir, -2.0, &col_avg);
        assert_eq!(alpha, 0.5);
        /* Above sea level: no water mask. */
        let (_, alpha) = sample_planet_lod_color(&body, fallback, dir, 5.0, &col_avg);
        assert_eq!(alpha, 0.0);
        /* A body with no water never sets the mask even below 0. */
        let moon = planet::get(BodyId::Luna);
        let (_, alpha) = sample_planet_lod_color(&moon, fallback, dir, -10.0, &col_avg);
        assert_eq!(alpha, 0.0);
    }

    /* --------------------------------------------------------------- */
    /* World registry (bookkeeping half - no GPU).                       */

    fn test_world(id: BodyId) -> Rc<RefCell<World>> {
        let body = planet::get(id);
        Rc::new(RefCell::new(World::create(&body, 1)))
    }

    #[test]
    fn registry_world_for_body_and_active_switch() {
        let luna = test_world(BodyId::Luna);
        let selene = test_world(BodyId::Selene);
        let luna_id = luna.borrow().body.id as u32;
        let selene_id = selene.borrow().body.id as u32;

        /* Record-only registration (the GPU half is exercised in the
         * live build; the registry semantics are what net_client +
         * teleport_menu depend on). */
        R.with(|cell| {
            let mut r = cell.borrow_mut();
            assert_eq!(register_world_record(&mut r, &luna), Some(0));
            assert_eq!(register_world_record(&mut r, &selene), Some(1));
            /* First registration became active. */
            assert_eq!(r.active_body_idx, 0);
            assert!(r.bodies[0].is_active);
            assert!(!r.bodies[1].is_active);
            /* Body metadata captured from the world's config. */
            let wb = luna.borrow();
            assert_eq!(r.bodies[0].radius_m, wb.body.radius_m as f32);
            assert_eq!(r.bodies[0].has_water, wb.body.has_water);
            assert_eq!(r.bodies[0].world_pos.x, wb.body.pos_x as f32);
        });

        /* world_for_body finds by id; unknown id is None. */
        let found = world_for_body(luna_id).expect("luna registered");
        assert!(Rc::ptr_eq(&found, &luna));
        let found = world_for_body(selene_id).expect("selene registered");
        assert!(Rc::ptr_eq(&found, &selene));
        assert!(world_for_body(9999).is_none());

        /* body_meshed: nothing GPU-meshed in this test. */
        assert!(!body_meshed(luna_id));
        assert!(!body_meshed(selene_id));
        assert!(!body_meshed(9999));

        /* moon_count = bodies - 1 (the active one). */
        assert_eq!(moon_count(), 1);

        /* set_active_world switches the flags; re-setting the same
         * world is a no-op; an unregistered world warns + keeps the
         * current active. */
        set_active_world(&selene);
        R.with(|cell| {
            let r = cell.borrow();
            assert_eq!(r.active_body_idx, 1);
            assert!(!r.bodies[0].is_active);
            assert!(r.bodies[1].is_active);
        });
        set_active_world(&selene); /* no-op */
        let stranger = test_world(BodyId::Sprout);
        set_active_world(&stranger); /* warns, unchanged */
        R.with(|cell| {
            assert_eq!(cell.borrow().active_body_idx, 1);
        });

        /* tiles_drawn / chunk_count read the active body's cursor. */
        assert_eq!(tiles_drawn_this_frame(), 0);
        assert_eq!(chunk_count(), (chunk_n() as i32, 0));
    }

    #[test]
    fn registry_caps_at_max_bodies() {
        R.with(|cell| {
            let mut r = cell.borrow_mut();
            for _ in 0..MAX_BODIES {
                assert!(register_world_record(&mut r, &test_world(BodyId::Asteroid0)).is_some());
            }
            assert!(register_world_record(&mut r, &test_world(BodyId::Asteroid1)).is_none());
            assert_eq!(r.bodies.len(), MAX_BODIES);
        });
    }

    /* --------------------------------------------------------------- */
    /* Visibility toggles + perf mode.                                   */

    #[test]
    fn toggles_default_and_roundtrip() {
        /* C defaults: terrain / water / skybox on, flow debug off,
         * perf mode off. (Thread-local state - each test thread gets
         * fresh defaults.) */
        assert!(terrain_visible());
        assert!(water_visible());
        assert!(skybox_visible());
        assert!(!flow_debug());
        assert!(!perf_mode_enabled());

        set_terrain_visible(false);
        assert!(!terrain_visible());
        set_terrain_visible(true);
        set_water_visible(false);
        assert!(!water_visible());
        set_skybox_visible(false);
        assert!(!skybox_visible());
        set_flow_debug(true);
        assert!(flow_debug());
        set_perf_mode(true);
        assert!(perf_mode_enabled());
    }

    /* --------------------------------------------------------------- */
    /* Generated shader modules: every desc fn referenced + std140       */
    /* struct sizes pinned against the C headers.                        */

    #[test]
    fn all_shader_descs_build() {
        let descs: [(&str, fn(sg::Backend) -> sg::ShaderDesc); 10] = [
            ("atmosphere", shaders::atmosphere::atmosphere_shader_desc),
            ("composite", shaders::composite::composite_shader_desc),
            ("composite_mobile", shaders::composite_mobile::composite_mobile_shader_desc),
            ("distant", shaders::distant::distant_shader_desc),
            ("hex", shaders::hex::hex_shader_desc),
            ("starfield", shaders::starfield::starfield_shader_desc),
            ("sun", shaders::sun::sun_shader_desc),
            ("torch", shaders::torch::torch_shader_desc),
            ("water", shaders::water::water_shader_desc),
            ("water_mobile", shaders::water_mobile::water_mobile_shader_desc),
        ];
        for (name, f) in descs {
            /* Desktop OpenGL (glcore / GL 4.1) ONLY - the Rust port does not
             * support GLSL ES / WebGL (see CLAUDE.md), so we only validate
             * the glcore desc. Desc building is pure - no GPU context. */
            for backend in [sg::Backend::Glcore] {
                let d = f(backend);
                assert!(!d.label.is_null(), "{name} ({backend:?}) label");
                assert!(
                    !d.vertex_func.source.is_null(),
                    "{name} ({backend:?}) vs source"
                );
                assert!(
                    !d.fragment_func.source.is_null(),
                    "{name} ({backend:?}) fs source"
                );
            }
        }
    }

    #[test]
    fn uniform_block_sizes_pinned() {
        use std::mem::size_of;
        /* std140 sizes must match the C-generated headers exactly -
         * sg_apply_uniforms validates the range length against the
         * shader's declared block size. */
        assert_eq!(size_of::<shaders::hex::HexVsParams>(), 80);
        assert_eq!(size_of::<shaders::hex::HexVsLight>(), 64); /* +u_sway +u_wind_dir (scatter wind) */
        assert_eq!(size_of::<shaders::hex::HexFsLight>(), 96); /* +from-orbit rim (3 vec4s) */
        assert_eq!(size_of::<shaders::hex::HexFsWater>(), 32);
        assert_eq!(size_of::<shaders::hex::HexFsTorch>(), 16);
        assert_eq!(size_of::<shaders::starfield::StarfieldParams>(), 192);
        assert_eq!(size_of::<shaders::atmosphere::AtmosphereVsParams>(), 64);
        assert_eq!(size_of::<shaders::atmosphere::AtmosphereFsParams>(), 48);
        assert_eq!(size_of::<shaders::composite::CompositeVsParams>(), 64);
        /* 8 vec4s: hand-added fog_params + rain_lens + the lens_mode flag that
         * splits compose (droplets off) from the post-water lens pass. */
        assert_eq!(size_of::<shaders::composite::CompositeFsParams>(), 128);
        assert_eq!(size_of::<shaders::composite_mobile::CompositeMobileFsParams>(), 48);
        assert_eq!(size_of::<shaders::distant::DistantVsParams>(), 64);
        assert_eq!(size_of::<shaders::distant::DistantFsParams>(), 112); /* +rim fresnel (2 vec4s) */
        assert_eq!(size_of::<shaders::sun::SunVsParams>(), 64);
        /* 6 vec4s: procedural surface (colors / churn / cam / limb / spot /
         * warp) - see the table at the top of sun.fs.glsl. */
        assert_eq!(size_of::<shaders::sun::SunFsParams>(), 96);
        assert_eq!(size_of::<shaders::water::VsParams>(), 128);
        /* 16 vec4s since the hand-added distance-fog uniform (u_fog). */
        assert_eq!(size_of::<shaders::water::FsParams>(), 256);
        assert_eq!(size_of::<shaders::water_mobile::VsParamsMobile>(), 112);
        assert_eq!(size_of::<shaders::water_mobile::FsParamsMobile>(), 160);
        assert_eq!(size_of::<shaders::torch::TorchVsParams>(), 80);
    }

    #[test]
    fn hex_vertex_layout_matches_c() {
        /* The pipeline attr offsets assume the C hex_vertex_t layout:
         * 44-byte stride, fields in pos/normal/uv/sky/torch/wet order. */
        assert_eq!(std::mem::size_of::<HexVertex>(), 44);
        assert_eq!(std::mem::offset_of!(HexVertex, pos), 0);
        assert_eq!(std::mem::offset_of!(HexVertex, normal), 12);
        assert_eq!(std::mem::offset_of!(HexVertex, uv), 24);
        assert_eq!(std::mem::offset_of!(HexVertex, sky_light), 32);
        assert_eq!(std::mem::offset_of!(HexVertex, torch_light), 36);
        assert_eq!(std::mem::offset_of!(HexVertex, wet), 40);
    }

    #[test]
    fn render_env_default_is_zeroed() {
        let env = RenderEnv::default();
        assert_eq!(env.sun_radius, 0.0);
        assert_eq!(env.atmo_strength, 0.0);
        assert_eq!(env.sun_dir, Vec3::default());
        assert_eq!(env.camera_world, Vec3::default());
    }
}
