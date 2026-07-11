//! Port of `tenebris-c/src/client/torch.{c,h}`.
//!
//! Torch entity system. A torch is NOT a hex block - it's a placed
//! mesh entity drawn separately from the terrain pass. Geometry is a
//! three-piece procedural mesh (handle cylinder + head cylinder + flame
//! cone) built once at boot and instanced per placed torch.
//!
//! Renames (per PORTING.md rule 4 - module prefix dropped):
//! - `torch_init()`        -> `torch::init()`
//! - `torch_shutdown()`    -> `torch::shutdown()`
//! - `torch_place()`       -> `torch::place()`
//! - `torch_remove_near()` -> `torch::remove_near()`
//! - `torch_draw()`        -> `torch::draw()`
//! - `torch_count()`       -> `torch::count()`
//! - `torch_list()`        -> `torch::list()` (returns a snapshot
//!   `Vec<Torch>` instead of a `const torch_t*` - the RefCell-owned
//!   state can't hand out a raw slice; same "stable until the next
//!   place/remove" contract, enforced by the copy)
//! - `torch_flame_pos()`   -> `torch::flame_pos()`
//! - `torch_position_at()` -> `torch::position_at()`
//! - `torch_remove()`      -> `torch::remove()`
//! - `torch_raycast()`     -> `torch::raycast()` (the C out-param
//!   `float* out_dist` becomes the second tuple element; like the C it
//!   carries `max_dist` when nothing was hit)
//! - `TORCH_MAX_COUNT`        -> `MAX_COUNT`
//! - `TORCH_LIGHT_RANGE_M`    -> `LIGHT_RANGE_M`
//! - `TORCH_LIGHT_DECAY`      -> `LIGHT_DECAY`
//! - `TORCH_FLAME_HEIGHT_M`   -> `FLAME_HEIGHT_M`
//!
//! # sokol boundary
//!
//! The C interleaves geometry generation and GPU upload inside
//! `build_geometry()`. The port factors the pure part into
//! [`build_vertices`] (returns the exact vertex/index arrays the C
//! fed to `sg_make_buffer`) so tests can pin the data headless;
//! `build_geometry()` keeps the C name and does the `sg_make_buffer`
//! submission. List management / raycast / model-matrix math is pure
//! and untouched by the split.

#![allow(dead_code)] // consumed by the interact/renderer/main waves of the port

use crate::gfx_math::{mat4_mul, vec3_cross, Mat4};
use crate::shaders;
use sokol::gfx as sg;
use std::cell::RefCell;
use tenebris_core::math::{
    vec3_add, vec3_dot, vec3_normalize, vec3_scale, vec3_sub, Vec3,
};

/* ----------------------------------------------------------------------- */
/* Geometry constants - match the JS reference (src/planet/Torch.ts)
 * so torches placed by this build look identical to those built in
 * the JS reference. */

const HANDLE_HEIGHT: f32 = 0.40;
const HANDLE_RADIUS: f32 = 0.03;
const HEAD_HEIGHT: f32 = 0.10;
const HEAD_RADIUS: f32 = 0.06;
const FLAME_HEIGHT: f32 = 0.15;
const FLAME_RADIUS: f32 = 0.05;
const FLAME_BASE_Y: f32 = HANDLE_HEIGHT + HEAD_HEIGHT; /* = 0.50 */

/* 8 angular segments around each cylinder/cone - coarse but the torch
 * is small enough that finer subdivision doesn't pay off. Polygon
 * count stays trivial (~96 verts merged across the three pieces). */
const N_SEG: usize = 8;

/// The C's `TORCH_MAX_COUNT`. No longer a placement cap (the Rust list
/// grows unbounded); kept as a sizing hint for pre-allocations.
pub const MAX_COUNT: usize = 256;

/* Light range + decay used both by the in-shader flicker and the
 * mesher's per-vertex torch_light bake. Range is the cutoff radius
 * (m) past which a torch contributes nothing; decay is the
 * inverse-square shape parameter - higher = sharper falloff. */
pub const LIGHT_RANGE_M: f32 = 6.0;
pub const LIGHT_DECAY: f32 = 2.0;

/* Where the flame sits, relative to the torch base (= a_pos in the
 * mesh). Lighting samples are taken from the flame, not the base. */
pub const FLAME_HEIGHT_M: f32 = 0.55;

/// Port of `torch_vertex_t`.
#[repr(C)]
#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub struct TorchVertex {
    pub pos: [f32; 3],
    pub color: [f32; 3],
    pub anim_w: f32,
}

/// Port of `torch_t`.
#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub struct Torch {
    /// body-local world pos at the BASE of the torch
    pub position: Vec3,
    /// unit surface normal - torch points along this
    pub up: Vec3,
    /// seconds added to time so torches desync
    pub flicker_phase: f32,
    /// tile this torch is anchored to (for despawn)
    pub tile_idx: i32,
    /// Per-source light multiplier: scales BOTH the reach (range *= scale)
    /// and the brightness (contribution *= scale) in the per-vertex bake.
    /// 1.0 for a plain torch; a bonfire publishes its flame here at 2.0.
    /// Treated as 1.0 when <= 0 (so a Default-constructed torch still lights).
    pub scale: f32,
}

/* ----------------------------------------------------------------------- */

/* Generated-shader interface: attributes are declared in-order
 * (a_pos, a_color, a_anim_weight) and the single uniform block binds
 * at slot 0. */
use crate::shaders::torch::{
    ATTR_TORCH_A_ANIM_WEIGHT, ATTR_TORCH_A_COLOR, ATTR_TORCH_A_POS, UB_TORCH_VS_PARAMS,
};

/// Port of the generated `torch_vs_params_t` (std140: mat4 at 0,
/// floats at 64/68, padded to a 16-byte multiple).
#[repr(C)]
struct TorchVsParams {
    u_mvp: [f32; 16],
    u_time: f32,
    u_flicker_amount: f32,
    _pad_72: [u8; 8],
}

/// Port of the C file's module-static `T`. The C capped the list at a
/// fixed 256-slot array; the port grows it unbounded - light count is
/// a content decision, not a memory one (the per-vertex bake reads
/// lights through the spatial grid below, so bake cost tracks LOCAL
/// light density, not the planet-wide total).
struct State {
    vbuf: sg::Buffer,
    ibuf: sg::Buffer,
    pip: sg::Pipeline,
    index_count: i32,
    list: Vec<Torch>,
}

impl Default for State {
    fn default() -> Self {
        State {
            vbuf: sg::Buffer::new(),
            ibuf: sg::Buffer::new(),
            pip: sg::Pipeline::new(),
            index_count: 0,
            list: Vec::new(),
        }
    }
}

thread_local! {
    static T: RefCell<State> = RefCell::new(State::default());
}

/* ------------------------------------------------------------------ */
/* Cross-thread light mirror. The torch state above is thread-local
 * (module-static port; mutated + rendered on the main thread), but the
 * chunk mesher fans build_tile across the rayon pool - worker threads
 * baking per-vertex torch light MUST see the same list, or every
 * parallel rebuild bakes darkness (the bug this fixes: torches lit
 * nothing once chunk builds went multithreaded, because each worker
 * saw an empty thread-local list). Every mutation republishes the
 * list into a process-global mirror and bumps a generation counter;
 * [`with_lights`] refreshes a per-thread cache only when the
 * generation moved, so the per-vertex hot path costs one relaxed
 * atomic load, no locking. */

use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;

static LIGHTS_GEN: AtomicU64 = AtomicU64::new(0);

/// Cross-thread snapshot: the list plus a 3D spatial grid over torch
/// positions ([`GRID_CELL_M`] cells), so the mesher gathers only the
/// lights that can actually reach the tile being built - bake cost
/// tracks local light density, not the planet-wide count.
pub struct LightsShared {
    pub list: Vec<Torch>,
    grid: std::collections::HashMap<(i32, i32, i32), Vec<u32>>,
}

/// Spatial-grid cell edge, metres. Must be >= LIGHT_RANGE_M so a +-1
/// cell neighbourhood around a query point covers the light range.
const GRID_CELL_M: f32 = 16.0;

fn grid_key(p: Vec3) -> (i32, i32, i32) {
    (
        (p.x / GRID_CELL_M).floor() as i32,
        (p.y / GRID_CELL_M).floor() as i32,
        (p.z / GRID_CELL_M).floor() as i32,
    )
}

static LIGHTS: Mutex<Option<std::sync::Arc<LightsShared>>> = Mutex::new(None);

fn lights_shared() -> std::sync::Arc<LightsShared> {
    LIGHTS
        .lock()
        .unwrap()
        .clone()
        .unwrap_or_else(|| {
            std::sync::Arc::new(LightsShared {
                list: Vec::new(),
                grid: std::collections::HashMap::new(),
            })
        })
}

thread_local! {
    /* (generation, snapshot) - u64::MAX forces the first refresh. The
     * Arc swap makes a refresh O(1) no matter how many lights exist. */
    static LIGHTS_CACHE: RefCell<(u64, std::sync::Arc<LightsShared>)> = RefCell::new((
        u64::MAX,
        std::sync::Arc::new(LightsShared {
            list: Vec::new(),
            grid: std::collections::HashMap::new(),
        }),
    ));
}

/// Monotonic mutation counter - cheap "did the lights change?" check
/// for consumers that cache derived data (the LOD glow buffer).
pub fn lights_generation() -> u64 {
    LIGHTS_GEN.load(Ordering::Acquire)
}

/// Gather every light that could touch a terrain COLUMN: the tile's
/// radial axis from `r_min` to `r_max` metres, padded by the tile's
/// horizontal radius. Walks the spatial grid cells along the axis
/// (O(column length / cell) lookups), so a planet with 100k lights
/// costs a tile build exactly what its LOCAL lights cost.
pub fn lights_along_column(dir: Vec3, r_min: f32, r_max: f32, pad_m: f32) -> Vec<Torch> {
    let shared = LIGHTS_CACHE.with(|c| {
        let mut c = c.borrow_mut();
        let gen = LIGHTS_GEN.load(Ordering::Acquire);
        if c.0 != gen {
            c.1 = lights_shared();
            c.0 = gen;
        }
        c.1.clone()
    });
    if shared.list.is_empty() {
        return Vec::new();
    }
    /* +-n cell neighbourhood: enough to cover light range + tile pad. */
    let n = (((LIGHT_RANGE_M + pad_m) / GRID_CELL_M).ceil() as i32).max(1);
    let mut out: Vec<Torch> = Vec::new();
    let mut seen: Vec<u32> = Vec::new();
    let steps = (((r_max - r_min) / GRID_CELL_M).ceil() as i32).max(1);
    for s in 0..=steps {
        let r = r_min + (r_max - r_min) * (s as f32 / steps as f32);
        let p = vec3_scale(dir, r);
        let (kx, ky, kz) = grid_key(p);
        for dx in -n..=n {
            for dy in -n..=n {
                for dz in -n..=n {
                    let Some(cell) = shared.grid.get(&(kx + dx, ky + dy, kz + dz)) else {
                        continue;
                    };
                    for &i in cell {
                        if !seen.contains(&i) {
                            seen.push(i);
                            out.push(shared.list[i as usize]);
                        }
                    }
                }
            }
        }
    }
    out
}

/* Extra, non-torch light sources merged into the same bake: lit bonfires
 * publish their flames here (scale 2.0) so the terrain mesher lights them
 * through the exact same spatial-grid path as torches, WITHOUT them
 * entering the persisted torch list (which would save a bonfire as a
 * torch). The app refreshes this whenever the set of lit bonfires
 * changes, then calls `lights_publish`. */
static EXTRA_LIGHTS: Mutex<Vec<Torch>> = Mutex::new(Vec::new());

/// Replace the extra (non-torch) light set - lit bonfire flames - and
/// republish the merged mirror. Each entry is a `Torch` record whose
/// `position` is the flame point, `up` is +radial, and `scale` is the
/// per-source multiplier (2.0 for a bonfire).
pub fn set_extra_lights(lights: Vec<Torch>) {
    *EXTRA_LIGHTS.lock().unwrap() = lights;
    lights_publish();
}

/// Republish the live list (torches + extra bonfire lights) into the
/// cross-thread mirror. Every mutator (place / remove / clear / shutdown /
/// set_extra_lights) must call this.
fn lights_publish() {
    let mut snap = T.with(|t| t.borrow().list.clone());
    snap.extend(EXTRA_LIGHTS.lock().unwrap().iter().copied());
    let mut grid: std::collections::HashMap<(i32, i32, i32), Vec<u32>> =
        std::collections::HashMap::new();
    for (i, t) in snap.iter().enumerate() {
        grid.entry(grid_key(t.position)).or_default().push(i as u32);
    }
    *LIGHTS.lock().unwrap() = Some(std::sync::Arc::new(LightsShared { list: snap, grid }));
    LIGHTS_GEN.fetch_add(1, Ordering::Release);
}

/// Run `f` over the current torch-list snapshot - safe on ANY thread
/// (the rayon mesh workers included).
pub fn with_lights<R>(f: impl FnOnce(&[Torch]) -> R) -> R {
    LIGHTS_CACHE.with(|c| {
        let mut c = c.borrow_mut();
        let gen = LIGHTS_GEN.load(Ordering::Acquire);
        if c.0 != gen {
            c.1 = lights_shared();
            c.0 = gen;
        }
        f(&c.1.list)
    })
}

/* ----------------------------------------------------------------------- */

/// Port of `push_vertex()`. Appends instead of writing through an
/// out-pointer + counter; emission order is identical.
#[allow(clippy::too_many_arguments)]
fn push_vertex(dst: &mut Vec<TorchVertex>, x: f32, y: f32, z: f32, r: f32, g: f32, b: f32, anim_w: f32) {
    dst.push(TorchVertex { pos: [x, y, z], color: [r, g, b], anim_w });
}

/// Port of `build_cylinder()`. Cylinder spanning (y0..y1) with radius
/// r0 at the bottom and r1 at the top. Two caps + N_SEG side quads.
/// anim_w + per-vertex colour are stamped uniformly across all of this
/// piece's vertices.
#[allow(clippy::too_many_arguments)]
fn build_cylinder(
    dst: &mut Vec<TorchVertex>,
    idx: &mut Vec<u16>,
    y0: f32,
    y1: f32,
    r0: f32,
    r1: f32,
    cr: f32,
    cg: f32,
    cb: f32,
    anim_w: f32,
) {
    /* Bottom-cap centre + ring. */
    let bot_centre = dst.len();
    push_vertex(dst, 0.0, y0, 0.0, cr, cg, cb, anim_w);
    let bot_ring = dst.len();
    for i in 0..N_SEG {
        let a = (i as f32) / (N_SEG as f32) * 6.2831853f32;
        push_vertex(dst, a.cos() * r0, y0, a.sin() * r0, cr, cg, cb, anim_w);
    }
    /* Top-cap centre + ring. */
    let top_centre = dst.len();
    push_vertex(dst, 0.0, y1, 0.0, cr, cg, cb, anim_w);
    let top_ring = dst.len();
    for i in 0..N_SEG {
        let a = (i as f32) / (N_SEG as f32) * 6.2831853f32;
        push_vertex(dst, a.cos() * r1, y1, a.sin() * r1, cr, cg, cb, anim_w);
    }

    /* Bottom cap (CW from below = CCW from outside, so we wind
     * centre/i+1/i to keep the outward face pointing -Y). */
    for i in 0..N_SEG {
        let next = (i + 1) % N_SEG;
        idx.push(bot_centre as u16);
        idx.push((bot_ring + next) as u16);
        idx.push((bot_ring + i) as u16);
    }
    /* Top cap (outward face +Y). */
    for i in 0..N_SEG {
        let next = (i + 1) % N_SEG;
        idx.push(top_centre as u16);
        idx.push((top_ring + i) as u16);
        idx.push((top_ring + next) as u16);
    }
    /* Side quads. */
    for i in 0..N_SEG {
        let next = (i + 1) % N_SEG;
        let b0 = (bot_ring + i) as u16;
        let b1 = (bot_ring + next) as u16;
        let t0 = (top_ring + i) as u16;
        let t1 = (top_ring + next) as u16;
        idx.push(b0);
        idx.push(b1);
        idx.push(t1);
        idx.push(b0);
        idx.push(t1);
        idx.push(t0);
    }
}

/// Port of `build_cone()`. Cone with base radius r at y0 + tip at
/// (0, y1, 0).
#[allow(clippy::too_many_arguments)]
fn build_cone(
    dst: &mut Vec<TorchVertex>,
    idx: &mut Vec<u16>,
    y0: f32,
    y1: f32,
    r: f32,
    cr: f32,
    cg: f32,
    cb: f32,
    anim_w: f32,
) {
    let base_centre = dst.len();
    push_vertex(dst, 0.0, y0, 0.0, cr, cg, cb, anim_w);
    let base_ring = dst.len();
    for i in 0..N_SEG {
        let a = (i as f32) / (N_SEG as f32) * 6.2831853f32;
        push_vertex(dst, a.cos() * r, y0, a.sin() * r, cr, cg, cb, anim_w);
    }
    let tip = dst.len();
    push_vertex(dst, 0.0, y1, 0.0, cr, cg, cb, anim_w);

    /* Base cap (faces -Y, but for an upward-pointing cone in our
     * winding convention this points away from the rest of the
     * scene; we still emit it so the cone reads as solid from below). */
    for i in 0..N_SEG {
        let next = (i + 1) % N_SEG;
        idx.push(base_centre as u16);
        idx.push((base_ring + next) as u16);
        idx.push((base_ring + i) as u16);
    }
    /* Lateral faces from base ring to tip. */
    for i in 0..N_SEG {
        let next = (i + 1) % N_SEG;
        idx.push((base_ring + i) as u16);
        idx.push((base_ring + next) as u16);
        idx.push(tip as u16);
    }
}

/// Pure half of the C `build_geometry()`: produces the exact vertex +
/// index arrays the C handed to `sg_make_buffer`. Split out so tests
/// can pin the data without a GPU context.
fn build_vertices() -> (Vec<TorchVertex>, Vec<u16>) {
    /* Upper-bound vert/index counts in the C: three pieces, each a
     * cylinder (handle / head) or cone (flame); cylinders contribute
     * 2*N_SEG sides + 2 caps, cones contribute N_SEG sides + 1 cap.
     * The Vecs reserve the same slack. */
    const MAX_V: usize = 256;
    const MAX_I: usize = 512;
    let mut verts: Vec<TorchVertex> = Vec::with_capacity(MAX_V);
    let mut idx: Vec<u16> = Vec::with_capacity(MAX_I);

    /* Handle - saddle-brown cylinder, static. */
    build_cylinder(
        &mut verts, &mut idx,
        0.0, HANDLE_HEIGHT, HANDLE_RADIUS, HANDLE_RADIUS,
        0.545, 0.271, 0.075, 0.0,
    );
    /* Head - slightly tapered dark-gray cylinder, static. */
    build_cylinder(
        &mut verts, &mut idx,
        HANDLE_HEIGHT, HANDLE_HEIGHT + HEAD_HEIGHT,
        HEAD_RADIUS, HEAD_RADIUS * 0.8,
        0.20, 0.20, 0.20, 0.0,
    );
    /* Flame - warm-orange cone, animated (anim_w = 1). */
    build_cone(
        &mut verts, &mut idx,
        FLAME_BASE_Y, FLAME_BASE_Y + FLAME_HEIGHT, FLAME_RADIUS,
        1.0, 0.667, 0.267, 1.0,
    );

    (verts, idx)
}

/// GPU half of the C `build_geometry()`: uploads the arrays from
/// [`build_vertices`]. Requires a live sokol-gfx context.
fn build_geometry() {
    let (verts, idx) = build_vertices();
    let vbuf = sg::make_buffer(&sg::BufferDesc {
        data: sg::slice_as_range(&verts),
        label: c"torch-vbuf".as_ptr(),
        ..Default::default()
    });
    let ibuf = sg::make_buffer(&sg::BufferDesc {
        data: sg::slice_as_range(&idx),
        usage: sg::BufferUsage { index_buffer: true, ..Default::default() },
        label: c"torch-ibuf".as_ptr(),
        ..Default::default()
    });
    T.with(|t| {
        let mut t = t.borrow_mut();
        t.vbuf = vbuf;
        t.ibuf = ibuf;
        t.index_count = idx.len() as i32;
    });
}

/* ----------------------------------------------------------------------- */

/// Port of `torch_init()`.
pub fn init() {
    let shd = sg::make_shader(&shaders::torch::torch_shader_desc(sg::query_backend()));
    let mut desc = sg::PipelineDesc {
        shader: shd,
        index_type: sg::IndexType::Uint16,
        depth: sg::DepthState {
            write_enabled: true,
            compare: sg::CompareFunc::LessEqual,
            ..Default::default()
        },
        cull_mode: sg::CullMode::Back,
        face_winding: sg::FaceWinding::Ccw,
        label: c"torch-pipeline".as_ptr(),
        ..Default::default()
    };
    desc.layout.attrs[ATTR_TORCH_A_POS].format = sg::VertexFormat::Float3;
    desc.layout.attrs[ATTR_TORCH_A_COLOR].format = sg::VertexFormat::Float3;
    desc.layout.attrs[ATTR_TORCH_A_ANIM_WEIGHT].format = sg::VertexFormat::Float;
    desc.layout.buffers[0].stride = std::mem::size_of::<TorchVertex>() as i32;
    let pip = sg::make_pipeline(&desc);
    T.with(|t| t.borrow_mut().pip = pip);
    build_geometry();
    T.with(|t| t.borrow_mut().list.clear());
    lights_publish();
}

/// Port of `torch_shutdown()`.
pub fn shutdown() {
    /* Pipeline + buffers are destroyed by sg_shutdown at program
     * exit; nothing per-module to free. */
    T.with(|t| t.borrow_mut().list.clear());
    lights_publish();
}

/// Rust-port extension: drop every placed torch. Called when the SP
/// terrain regenerates for a different world / seed - the incoming
/// world's persisted torch list replays right after via
/// apply_sp_world_saves, so nothing from the previous world leaks.
pub fn clear() {
    T.with(|t| t.borrow_mut().list.clear());
    lights_publish();
}

/* ----------------------------------------------------------------------- */

/// Port of `torch_place()`. Place a torch at body-local world position
/// with the given surface-up direction. `tile_idx` tags the torch so
/// removal can find it later by the tile its base sits on. Returns
/// `true` on success, `false` if the torch list is full.
pub fn place(position: Vec3, up: Vec3, tile_idx: i32) -> bool {
    T.with(|t| {
        let mut t = t.borrow_mut();
        /* Random-ish phase from the slot index - adjacent torches end
         * up with offset phases so they don't pulse together. The
         * "true" random would need an RNG; this is good enough for
         * visual decorrelation. (Same formula as the C; the fixed
         * 256 cap is gone - the list grows with the build.) */
        let phase = ((t.list.len() + 1) as f32) * 0.7193f32;
        t.list.push(Torch {
            position,
            up: vec3_normalize(up),
            flicker_phase: phase,
            tile_idx,
            scale: 1.0,
        });
    });
    lights_publish();
    true
}

/// Port of `torch_remove_near()`. Remove the nearest torch within
/// `radius_m` of `world_pos`. Returns `true` if one was removed.
pub fn remove_near(world_pos: Vec3, radius_m: f32) -> bool {
    let removed = T.with(|t| {
        let mut t = t.borrow_mut();
        let mut best: i32 = -1;
        let mut best_d2 = radius_m * radius_m;
        for (i, torch) in t.list.iter().enumerate() {
            let d = vec3_sub(torch.position, world_pos);
            let d2 = d.x * d.x + d.y * d.y + d.z * d.z;
            if d2 < best_d2 {
                best_d2 = d2;
                best = i as i32;
            }
        }
        if best < 0 {
            return false;
        }
        t.list.swap_remove(best as usize);
        true
    });
    if removed {
        lights_publish();
    }
    removed
}

/// Port of `torch_flame_pos()`. Flame-tip world position for a placed
/// torch - base + up * FLAME_HEIGHT_M.
pub fn flame_pos(t: &Torch) -> Vec3 {
    vec3_add(t.position, vec3_scale(t.up, FLAME_HEIGHT_M))
}

/// Port of `torch_count()`.
pub fn count() -> i32 {
    T.with(|t| t.borrow().list.len() as i32)
}

/// Port of `torch_list()`. Returns a snapshot copy of the live list
/// (see module docs); stable until the next place / remove.
pub fn list() -> Vec<Torch> {
    T.with(|t| t.borrow().list.clone())
}

/// Port of `torch_position_at()`. Returns (0,0,0) for an out-of-range
/// index - callers should validate first.
pub fn position_at(idx: i32) -> Vec3 {
    T.with(|t| {
        let t = t.borrow();
        match t.list.get(idx.max(0) as usize) {
            Some(torch) if idx >= 0 => torch.position,
            _ => Vec3 { x: 0.0, y: 0.0, z: 0.0 },
        }
    })
}

/// Port of `torch_remove()`. No-op for out-of-range. The list is
/// swap-removed (last torch fills the freed slot) so existing indices
/// past `idx` shift down by one - callers should not hold an index
/// across this call.
pub fn remove(idx: i32) {
    T.with(|t| {
        let mut t = t.borrow_mut();
        if idx < 0 || idx as usize >= t.list.len() {
            return;
        }
        t.list.swap_remove(idx as usize);
    });
    lights_publish();
}

/// Port of `torch_raycast()`. Ray-vs-bounding-sphere test against
/// every placed torch. Returns `(hit_index, dist)` where `hit_index`
/// is -1 if nothing was hit; `dist` carries the ray-parameter distance
/// to the hit, or `max_dist` when there was none (mirrors the C
/// out-param). `dir` must be normalised.
pub fn raycast(eye: Vec3, dir: Vec3, max_dist: f32) -> (i32, f32) {
    /* Bounding-sphere centre: torch midpoint along its up axis. The
     * canonical mesh spans 0..0.65 m on local Y, so 0.32 m above the
     * base is the geometric centre. Radius 0.45 m comfortably covers
     * the 0.06 m head + the wider flame plus the small horizontal
     * wobble the flame's vs animation introduces. */
    const CENTRE_OFFSET: f32 = 0.32;
    const RADIUS: f32 = 0.45;
    const R2: f32 = RADIUS * RADIUS;

    T.with(|st| {
        let st = st.borrow();
        let mut hit: i32 = -1;
        let mut best = max_dist;
        for i in 0..st.list.len() {
            let centre = vec3_add(st.list[i].position, vec3_scale(st.list[i].up, CENTRE_OFFSET));
            let oc = vec3_sub(eye, centre);
            let b = vec3_dot(oc, dir);
            let c = vec3_dot(oc, oc) - R2;
            let disc = b * b - c;
            if disc < 0.0 {
                continue;
            }
            let sq = disc.sqrt();
            let mut t = -b - sq;
            /* Inside-the-sphere case (eye sitting on top of a torch):
             * use the far root so we still consider the hit valid. */
            if t < 0.0 {
                t = -b + sq;
            }
            if t < 0.0 || t >= best {
                continue;
            }
            best = t;
            hit = i as i32;
        }
        (hit, best)
    })
}

/* ----------------------------------------------------------------------- */

/// Port of `torch_model_matrix()`. Build the orthonormal basis
/// (right, up, fwd) where up is the surface normal at the torch base.
/// Right + fwd are picked to span the tangent plane; the absolute
/// choice of which way "right" points doesn't matter for a
/// radially-symmetric torch.
fn model_matrix(t: &Torch) -> Mat4 {
    let up = t.up;
    /* Reference axis chosen to avoid degeneracy when up is near
     * (1,0,0). When up.x is large, swap to (0,0,1) as the cross
     * partner. */
    let r#ref = if up.x.abs() < 0.9 {
        Vec3 { x: 1.0, y: 0.0, z: 0.0 }
    } else {
        Vec3 { x: 0.0, y: 0.0, z: 1.0 }
    };
    let right = vec3_normalize(vec3_cross(up, r#ref));
    let fwd = vec3_cross(right, up);

    let mut m = Mat4 { m: [0.0; 16] };
    m.m[0] = right.x;
    m.m[1] = right.y;
    m.m[2] = right.z;
    m.m[3] = 0.0;
    m.m[4] = up.x;
    m.m[5] = up.y;
    m.m[6] = up.z;
    m.m[7] = 0.0;
    m.m[8] = fwd.x;
    m.m[9] = fwd.y;
    m.m[10] = fwd.z;
    m.m[11] = 0.0;
    m.m[12] = t.position.x;
    m.m[13] = t.position.y;
    m.m[14] = t.position.z;
    m.m[15] = 1.0;
    m
}

/// Port of `torch_draw()`. Draw all placed torches in one pipeline
/// pass against the supplied vp + global clock.
pub fn draw(vp: Mat4, time_seconds: f32) {
    let (pip, vbuf, ibuf, index_count, torches) = T.with(|t| {
        let t = t.borrow();
        (t.pip, t.vbuf, t.ibuf, t.index_count, t.list.clone())
    });
    if torches.is_empty() {
        return;
    }

    sg::apply_pipeline(pip);
    let mut bind = sg::Bindings::new();
    bind.vertex_buffers[0] = vbuf;
    bind.index_buffer = ibuf;
    sg::apply_bindings(&bind);

    for t in torches.iter() {
        let model = model_matrix(t);
        let mvp = mat4_mul(vp, model);

        let vsp = TorchVsParams {
            u_mvp: mvp.m,
            /* Multiply the time by a flicker speed so the three-sine
             * product produces a visible animation rather than
             * crawling at the bare clock rate. Per-torch phase
             * offset breaks the lockstep. */
            u_time: (time_seconds * 8.0) + t.flicker_phase,
            u_flicker_amount: 0.18,
            _pad_72: [0; 8],
        };
        sg::apply_uniforms(UB_TORCH_VS_PARAMS, &sg::value_as_range(&vsp));
        sg::draw(0, index_count as usize, 1);
    }
}

/* ----------------------------------------------------------------------- */

#[cfg(test)]
mod tests {
    use super::*;
    use tenebris_core::math::vec3_make;

    const EPS: f32 = 1e-6;

    /* ------------------------------------------------------------- */
    /* Geometry                                                        */

    #[test]
    fn vertex_and_index_counts_pinned() {
        let (verts, idx) = build_vertices();
        /* Two cylinders at 18 verts (2 centres + 2 rings of 8) and 96
         * indices (2 caps * 24 + 8 side quads * 6) each, one cone at
         * 10 verts / 48 indices. */
        assert_eq!(verts.len(), 46);
        assert_eq!(idx.len(), 240);
    }

    #[test]
    fn handle_vertices_pinned() {
        let (verts, _) = build_vertices();
        // v0: bottom-cap centre of the handle.
        assert_eq!(verts[0].pos, [0.0, 0.0, 0.0]);
        assert_eq!(verts[0].color, [0.545, 0.271, 0.075]);
        assert_eq!(verts[0].anim_w, 0.0);
        // v1: first bottom-ring vertex (angle 0): (r0, 0, 0).
        assert_eq!(verts[1].pos, [0.03, 0.0, 0.0]);
        // v3: ring vertex at i=2 (quarter turn): x ~ 0, z ~ r0.
        assert!(verts[3].pos[0].abs() < 1e-8, "x = {}", verts[3].pos[0]);
        assert_eq!(verts[3].pos[1], 0.0);
        assert!((verts[3].pos[2] - 0.03).abs() < 1e-7, "z = {}", verts[3].pos[2]);
        // v9: top-cap centre at HANDLE_HEIGHT.
        assert_eq!(verts[9].pos, [0.0, 0.4, 0.0]);
        // v10: first top-ring vertex.
        assert_eq!(verts[10].pos, [0.03, 0.4, 0.0]);
    }

    #[test]
    fn head_vertices_pinned() {
        let (verts, _) = build_vertices();
        // v18: head bottom-cap centre at HANDLE_HEIGHT, dark gray, static.
        assert_eq!(verts[18].pos, [0.0, 0.4, 0.0]);
        assert_eq!(verts[18].color, [0.20, 0.20, 0.20]);
        assert_eq!(verts[18].anim_w, 0.0);
        // v19: head bottom ring at radius HEAD_RADIUS.
        assert_eq!(verts[19].pos, [0.06, 0.4, 0.0]);
        // v27: head top-cap centre at HANDLE_HEIGHT + HEAD_HEIGHT.
        assert_eq!(verts[27].pos, [0.0, HANDLE_HEIGHT + HEAD_HEIGHT, 0.0]);
        // v28: head top ring tapers to HEAD_RADIUS * 0.8.
        assert_eq!(verts[28].pos[0], 0.06f32 * 0.8f32);
        assert_eq!(verts[28].pos[1], HANDLE_HEIGHT + HEAD_HEIGHT);
        assert_eq!(verts[28].pos[2], 0.0);
    }

    #[test]
    fn flame_vertices_pinned() {
        let (verts, _) = build_vertices();
        // v36: flame base centre at FLAME_BASE_Y, warm orange, animated.
        assert_eq!(verts[36].pos, [0.0, FLAME_BASE_Y, 0.0]);
        assert_eq!(verts[36].color, [1.0, 0.667, 0.267]);
        assert_eq!(verts[36].anim_w, 1.0);
        // v37: flame base ring at FLAME_RADIUS.
        assert_eq!(verts[37].pos, [0.05, FLAME_BASE_Y, 0.0]);
        // v45: flame tip.
        assert_eq!(verts[45].pos, [0.0, FLAME_BASE_Y + FLAME_HEIGHT, 0.0]);
        assert_eq!(verts[45].anim_w, 1.0);
    }

    #[test]
    fn indices_pinned() {
        let (_, idx) = build_vertices();
        // Handle bottom cap: first tri (centre, ring+1, ring+0),
        // last tri wraps next back to ring+0.
        assert_eq!(&idx[0..3], &[0, 2, 1]);
        assert_eq!(&idx[21..24], &[0, 1, 8]);
        // Handle top cap winds the other way.
        assert_eq!(&idx[24..27], &[9, 10, 11]);
        // Handle side quads start at 48: (b0,b1,t1),(b0,t1,t0).
        assert_eq!(&idx[48..54], &[1, 2, 11, 1, 11, 10]);
        // Flame base cap starts at 192 (after two 96-index cylinders):
        // cone base centre is v36, ring at v37..v44.
        assert_eq!(&idx[192..195], &[36, 38, 37]);
        // Flame laterals start at 216: (ring+i, ring+next, tip=45).
        assert_eq!(&idx[216..219], &[37, 38, 45]);
        // Last lateral wraps: (44, 37, 45).
        assert_eq!(&idx[237..240], &[44, 37, 45]);
    }

    /* ------------------------------------------------------------- */
    /* List management                                                 */

    #[test]
    fn place_count_list_semantics() {
        let _g = crate::client_kv::test_support::begin("torch_place_count_list_semantics");
        shutdown();
        assert_eq!(count(), 0);
        assert!(place(vec3_make(1.0, 2.0, 3.0), vec3_make(0.0, 2.0, 0.0), 7));
        assert!(place(vec3_make(4.0, 5.0, 6.0), vec3_make(0.0, 0.0, 1.0), 9));
        assert!(place(vec3_make(7.0, 8.0, 9.0), vec3_make(1.0, 0.0, 0.0), 11));
        assert_eq!(count(), 3);
        let l = list();
        assert_eq!(l.len(), 3);
        // up gets normalized on placement.
        assert_eq!(l[0].up, vec3_make(0.0, 1.0, 0.0));
        assert_eq!(l[0].tile_idx, 7);
        assert_eq!(l[1].position, vec3_make(4.0, 5.0, 6.0));
        // Flicker phase uses the post-increment count: i-th torch
        // (1-based) gets i * 0.7193f.
        assert_eq!(l[0].flicker_phase, 1.0f32 * 0.7193f32);
        assert_eq!(l[1].flicker_phase, 2.0f32 * 0.7193f32);
        assert_eq!(l[2].flicker_phase, 3.0f32 * 0.7193f32);
        // flame_pos = base + up * FLAME_HEIGHT_M.
        let fp = flame_pos(&l[0]);
        assert_eq!(fp, vec3_make(1.0, 2.0 + FLAME_HEIGHT_M, 3.0));
        // position_at mirrors the list; out-of-range returns zero.
        assert_eq!(position_at(2), vec3_make(7.0, 8.0, 9.0));
        assert_eq!(position_at(-1), vec3_make(0.0, 0.0, 0.0));
        assert_eq!(position_at(3), vec3_make(0.0, 0.0, 0.0));
    }

    #[test]
    fn place_is_uncapped_and_grid_gathers_locally() {
        let _g = crate::client_kv::test_support::begin("torch_place_is_uncapped_and_grid_gathers_locally");
        shutdown();
        /* The C's 256 cap is gone: place well past it. */
        for i in 0..(MAX_COUNT + 64) {
            assert!(place(
                vec3_make(i as f32 * 40.0, 300.0, 0.0),
                vec3_make(0.0, 1.0, 0.0),
                i as i32
            ));
        }
        assert_eq!(count(), (MAX_COUNT + 64) as i32);
        /* Column gather sees only the lights near its axis - torch 0
         * sits at (0, 300, 0): a column along +Y finds it, a column
         * 400 m away along +X..+Y doesn't (grid, not linear scan). */
        let near = lights_along_column(vec3_make(0.0, 1.0, 0.0), 280.0, 320.0, 4.0);
        assert_eq!(near.len(), 1, "one light near the +Y column");
        let far_dir = vec3_normalize(vec3_make(0.5, 1.0, 0.5));
        let far = lights_along_column(far_dir, 280.0, 320.0, 4.0);
        assert!(far.is_empty(), "distant column gathers nothing");
        shutdown();
        assert!(lights_along_column(vec3_make(0.0, 1.0, 0.0), 280.0, 320.0, 4.0).is_empty());
    }

    #[test]
    fn remove_near_swap_removes_nearest() {
        let _g = crate::client_kv::test_support::begin("torch_remove_near_swap_removes_nearest");
        shutdown();
        place(vec3_make(0.0, 0.0, 0.0), vec3_make(0.0, 1.0, 0.0), 0);
        place(vec3_make(10.0, 0.0, 0.0), vec3_make(0.0, 1.0, 0.0), 1);
        place(vec3_make(0.5, 0.0, 0.0), vec3_make(0.0, 1.0, 0.0), 2);
        // Nothing within 0.1 m of (5,0,0).
        assert!(!remove_near(vec3_make(5.0, 0.0, 0.0), 0.1));
        assert_eq!(count(), 3);
        // Nearest to (0.4,0,0) within 2 m is torch 2 (0.1 m away).
        assert!(remove_near(vec3_make(0.4, 0.0, 0.0), 2.0));
        assert_eq!(count(), 2);
        let l = list();
        assert_eq!(l[0].tile_idx, 0);
        assert_eq!(l[1].tile_idx, 1);
        // Swap-remove: removing index 0 moves the last into slot 0.
        remove(0);
        let l = list();
        assert_eq!(l.len(), 1);
        assert_eq!(l[0].tile_idx, 1);
        // Out-of-range remove is a no-op.
        remove(5);
        remove(-1);
        assert_eq!(count(), 1);
    }

    /* ------------------------------------------------------------- */
    /* Raycast                                                         */

    #[test]
    fn raycast_pinned() {
        let _g = crate::client_kv::test_support::begin("torch_raycast_pinned");
        shutdown();
        place(vec3_make(0.0, 0.0, 0.0), vec3_make(0.0, 1.0, 0.0), 0);
        // Eye level with the bounding-sphere centre (0,0.32,0), aiming
        // +Z from 5 m out: hits at 5 - 0.45.
        let (hit, dist) = raycast(vec3_make(0.0, 0.32, -5.0), vec3_make(0.0, 0.0, 1.0), 100.0);
        assert_eq!(hit, 0);
        assert!((dist - 4.55).abs() < 1e-5, "dist = {dist}");
        // Pointing away: miss, dist carries max_dist.
        let (hit, dist) = raycast(vec3_make(0.0, 0.32, -5.0), vec3_make(0.0, 0.0, -1.0), 100.0);
        assert_eq!(hit, -1);
        assert_eq!(dist, 100.0);
        // Out of range: hit is beyond max_dist.
        let (hit, _) = raycast(vec3_make(0.0, 0.32, -5.0), vec3_make(0.0, 0.0, 1.0), 4.0);
        assert_eq!(hit, -1);
        // Nearest of two torches wins.
        place(vec3_make(0.0, 0.0, 2.0), vec3_make(0.0, 1.0, 0.0), 1);
        let (hit, dist) = raycast(vec3_make(0.0, 0.32, -5.0), vec3_make(0.0, 0.0, 1.0), 100.0);
        assert_eq!(hit, 0);
        assert!((dist - 4.55).abs() < 1e-5);
    }

    /* ------------------------------------------------------------- */
    /* Model matrix                                                    */

    #[test]
    fn model_matrix_pinned() {
        // up = +Y, pos (1,2,3): ref = (1,0,0); right = up x ref =
        // (0,0,-1); fwd = right x up = (1,0,0).
        let t = Torch {
            position: vec3_make(1.0, 2.0, 3.0),
            up: vec3_make(0.0, 1.0, 0.0),
            flicker_phase: 0.0,
            tile_idx: 0,
            scale: 1.0,
        };
        let m = model_matrix(&t);
        let want: [f32; 16] = [
            0.0, 0.0, -1.0, 0.0, // col 0 = right
            0.0, 1.0, 0.0, 0.0, // col 1 = up
            1.0, 0.0, 0.0, 0.0, // col 2 = fwd
            1.0, 2.0, 3.0, 1.0, // col 3 = position
        ];
        for i in 0..16 {
            assert!((m.m[i] - want[i]).abs() <= EPS, "m[{}]: {} vs {}", i, m.m[i], want[i]);
        }
        // up near +X flips the reference axis to (0,0,1) instead of
        // degenerating: right = up x (0,0,1) = (0,-1,0).
        let t = Torch {
            position: vec3_make(0.0, 0.0, 0.0),
            up: vec3_make(1.0, 0.0, 0.0),
            flicker_phase: 0.0,
            tile_idx: 0,
            scale: 1.0,
        };
        let m = model_matrix(&t);
        assert!((m.m[0] - 0.0).abs() <= EPS);
        assert!((m.m[1] - (-1.0)).abs() <= EPS);
        assert!((m.m[2] - 0.0).abs() <= EPS);
    }
}
