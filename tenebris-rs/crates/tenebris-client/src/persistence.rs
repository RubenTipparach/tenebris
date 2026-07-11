//! Port of `tenebris-c/src/client/persistence.{c,h}`.
//!
//! Browser-side single-player save / load. Backed by client_kv
//! (window.localStorage on web, ~5 MB total, synchronous). Multiple
//! worlds coexist via the world name in the key; the menu's world
//! picker enumerates by prefix.
//!
//! Key namespace (all keys start with "tenebris-c:"):
//!
//! ```text
//! tenebris-c:world:<name>               - player pose
//! tenebris-c:tile:<name>:<body>:<tile>  - 128-byte column (hex)
//! tenebris-c:water:<name>:<body>:<tile> - 128-byte water column (hex)
//! tenebris-c:torches:<name>:<body>      - torch list CSV
//! ```
//!
//! Per CLAUDE.md, every block place/break and torch place/remove MUST
//! call the matching save function on the SAME input frame. There is
//! no batching, no interval flush, no "save on quit" - the browser can
//! close at any moment.
//!
//! The hex codec, key naming, and value formats are byte-compatible
//! with the C client: localStorage written by either build is readable
//! by the other.
//!
//! # Renames
//!
//! `persistence_save` -> `persistence::save`, `persistence_load` ->
//! `persistence::load` (returns `Option<PersistenceSave>`),
//! `persistence_list_worlds` -> `persistence::list_worlds` (returns a
//! Vec capped at `MAX_WORLDS`), `persistence_load_tile` ->
//! `persistence::load_tile` (returns `Option<[u8; COLUMN_BYTES]>`),
//! `persistence_list_saved_tiles` -> `persistence::list_saved_tiles`
//! (returns a Vec; the C `cap` only sized the caller's array), and so
//! on. Column parameters are `&[u8; COLUMN_BYTES]` so the "exactly 128
//! bytes" contract is enforced by the type instead of by the caller.

// Not wired into the app loop until the interact / main_web ports
// land; exercised by unit tests.
#![allow(dead_code)]

use crate::client_kv;
use tenebris_core::block_entity::{
    BlockEntity, BlockEntityStore,
};

const KEY_PREFIX: &str = "tenebris-c:world:";
/// Per-world survival bag + hunger (Rust-port extension key).
const KEY_BAG_PREFIX: &str = "tenebris-c:bag:";
/// Per-world tech-tree discovery bitset (Rust-port extension key).
const KEY_TECH_PREFIX: &str = "tenebris-c:tech:";
/// Per-world terrain seed (Rust-port extension key). Written once at
/// world creation; a world with no seed key predates the feature and
/// maps to the body's compiled-in default seed.
const KEY_SEED_PREFIX: &str = "tenebris-c:seed:";
const KEY_TILE_PREFIX: &str = "tenebris-c:tile:";
const KEY_TORCH_PREFIX: &str = "tenebris-c:torches:";
const KEY_CROP_PREFIX: &str = "tenebris-c:crops:";
const KEY_WATER_PREFIX: &str = "tenebris-c:water:";
/// Per-placed-block state (tech facing etc.), one CSV line per entity.
const KEY_BENTITY_PREFIX: &str = "tenebris-c:bentities:";

pub const NAME_MAX: usize = 31; // bytes, excluding terminator
pub const MAX_WORLDS: usize = 32;
pub const COLUMN_BYTES: usize = 128; // must match WORLD_MAX_DEPTH

// Compile-time guard for the comment above.
const _: () = assert!(COLUMN_BYTES == tenebris_core::world::WORLD_MAX_DEPTH as usize);

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct PersistenceSave {
    /// World-space position.
    pub pos_x: f64,
    pub pos_y: f64,
    pub pos_z: f64,
    /// Radians.
    pub yaw: f32,
    pub pitch: f32,
    pub roll: f32,
    pub body_id: u32,
    /// World mode: true = survival. Rust-port extension carried as an
    /// optional 8th CSV field; pre-extension saves parse as creative.
    pub survival: bool,
}

/// A single torch placement, stored verbatim in the per-body torch
/// list. Mirrors the runtime torch type but uses fixed-size arrays so
/// the on-disk format is decoupled from the in-memory struct.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct PersistenceTorch {
    /// Body-local base position.
    pub pos: [f32; 3],
    /// Surface normal (unit) at placement.
    pub up: [f32; 3],
    /// Anchor tile in the goldberg grid.
    pub tile_idx: i32,
}

/// A single planted crop, stored verbatim in the per-body crop list.
/// Mirrors `PersistenceTorch` plus the crop's growth so a reload resumes
/// where it left off (see `core::farming::Crop` + `client::crops`).
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct PersistenceCrop {
    /// World-space feet position.
    pub pos: [f32; 3],
    /// Surface normal (unit) at planting.
    pub up: [f32; 3],
    /// Anchor tile in the goldberg grid.
    pub tile_idx: i32,
    /// Growth 0.0 (planted) .. 1.0 (mature).
    pub growth: f32,
    /// CropKind byte (farming::CropKind as u8). Optional trailing CSV
    /// field so pre-kind saves load as Berry (kind 0).
    pub kind: u8,
}

/* ------------------------------------------------------------------ */
/* Hex encoding for the 128-byte column. localStorage values are
 * UTF-16 strings, so packing bytes "raw" runs into surrogate-pair
 * traps - hex sidesteps that with a 2x size overhead (256 chars per
 * tile, ~512 B after UTF-16). Trade is fine: at sub=3 a fully edited
 * planet (642 tiles) is ~330 KB, well inside the per-origin budget. */
/* ------------------------------------------------------------------ */

fn hex_encode(input: &[u8]) -> String {
    const HEX: &[u8; 16] = b"0123456789abcdef";
    let mut out = String::with_capacity(input.len() * 2);
    for &b in input {
        out.push(HEX[((b >> 4) & 0xF) as usize] as char);
        out.push(HEX[(b & 0xF) as usize] as char);
    }
    out
}

fn hex_value(c: u8) -> i32 {
    match c {
        b'0'..=b'9' => (c - b'0') as i32,
        b'a'..=b'f' => (c - b'a') as i32 + 10,
        b'A'..=b'F' => (c - b'A') as i32 + 10,
        _ => -1,
    }
}

/// Decode `out.len()` bytes from `input` (which must hold at least
/// `2 * out.len()` chars - callers length-check first, as the C does).
fn hex_decode(input: &str, out: &mut [u8]) -> bool {
    let s = input.as_bytes();
    for (i, o) in out.iter_mut().enumerate() {
        let hi = hex_value(s[2 * i]);
        let lo = hex_value(s[2 * i + 1]);
        if hi < 0 || lo < 0 {
            return false;
        }
        *o = ((hi << 4) | lo) as u8;
    }
    true
}

/* ------------------------------------------------------------------ */
/* C scanf-shaped parse helpers                                        */
/* ------------------------------------------------------------------ */

/// `strtol(p, &endp, 10)` shape: skip leading whitespace, optional
/// sign, then a decimal digit run; trailing garbage is ignored.
/// `None` when no digits were consumed (C's `endp == p`).
fn strtol_prefix(s: &str) -> Option<i64> {
    let t = s.trim_start();
    let b = t.as_bytes();
    let mut i = 0;
    let neg = match b.first() {
        Some(b'-') => {
            i = 1;
            true
        }
        Some(b'+') => {
            i = 1;
            false
        }
        _ => false,
    };
    let start = i;
    let mut v: i64 = 0;
    while i < b.len() && b[i].is_ascii_digit() {
        v = v.saturating_mul(10).saturating_add((b[i] - b'0') as i64);
        i += 1;
    }
    if i == start {
        return None;
    }
    Some(if neg { -v } else { v })
}

/* ------------------------------------------------------------------ */
/* Public surface                                                      */
/* ------------------------------------------------------------------ */

fn valid_name(n: &str) -> bool {
    if n.is_empty() || n.len() > NAME_MAX {
        return false;
    }
    // Disallow newline / colon since those are framing characters in
    // our storage format. Everything else is fine - we don't validate
    // for UTF-8 sanity.
    !n.chars().any(|c| c == '\n' || c == '\r' || c == ':')
}

fn build_key(world_name: &str) -> String {
    format!("{KEY_PREFIX}{world_name}")
}

pub fn save(world_name: &str, s: &PersistenceSave) -> bool {
    if !valid_name(world_name) {
        return false;
    }
    // C: snprintf "%.6f,%.6f,%.6f,%.6f,%.6f,%.6f,%u" with the f32
    // angles promoted to double. The Rust port appends the world-mode
    // flag as an 8th field; the C reader's final %u ignores trailing
    // text, so the extension is backward-safe.
    let buf = format!(
        "{:.6},{:.6},{:.6},{:.6},{:.6},{:.6},{},{}",
        s.pos_x,
        s.pos_y,
        s.pos_z,
        s.yaw as f64,
        s.pitch as f64,
        s.roll as f64,
        s.body_id,
        if s.survival { 1 } else { 0 }
    );
    client_kv::set(&build_key(world_name), &buf);
    true
}

pub fn load(world_name: &str) -> Option<PersistenceSave> {
    if !valid_name(world_name) {
        return None;
    }
    let s = client_kv::get(&build_key(world_name))?;

    // C: sscanf "%lf,%lf,%lf,%lf,%lf,%lf,%u" requiring n == 7. Each
    // float field must be a complete float (a trailing non-float char
    // would stop sscanf before the ',' literal); the final %u ignores
    // anything after the digits.
    let mut it = s.split(',');
    let mut next_f64 = || -> Option<f64> { it.next()?.trim_start().parse::<f64>().ok() };
    let x = next_f64()?;
    let y = next_f64()?;
    let z = next_f64()?;
    let yaw = next_f64()?;
    let pitch = next_f64()?;
    let roll = next_f64()?;
    let body = strtol_prefix(it.next()?)?;
    if !(0..=u32::MAX as i64).contains(&body) {
        return None;
    }
    /* Optional 8th field: world mode (Rust-port extension). Missing /
     * malformed -> creative, which is what pre-extension saves were. */
    let survival = it
        .next()
        .and_then(|f| strtol_prefix(f))
        .map(|v| v != 0)
        .unwrap_or(false);
    Some(PersistenceSave {
        pos_x: x,
        pos_y: y,
        pos_z: z,
        yaw: yaw as f32,
        pitch: pitch as f32,
        roll: roll as f32,
        body_id: body as u32,
        survival,
    })
}

/// Save the survival bag + hunger for a world:
/// "hunger|item,count;item,count;..." - written on the same 5 s cadence
/// as the pose autosave (bag contents also persist per-craft via the
/// interact/craft paths that call this).
pub fn save_bag(world_name: &str, hunger: f32, bag_blob: &str) -> bool {
    if !valid_name(world_name) {
        return false;
    }
    client_kv::set(
        &format!("{KEY_BAG_PREFIX}{world_name}"),
        &format!("{:.2}|{}", hunger, bag_blob),
    );
    true
}

/// Load a world's bag + hunger as `(hunger, bag_blob)`.
pub fn load_bag(world_name: &str) -> Option<(f32, String)> {
    if !valid_name(world_name) {
        return None;
    }
    let s = client_kv::get(&format!("{KEY_BAG_PREFIX}{world_name}"))?;
    let (h, rest) = s.split_once('|')?;
    Some((h.trim().parse::<f32>().ok()?, rest.to_string()))
}

/// Save a world's tech-tree discovery bitset (client::tech_tree). Rides
/// the same autosave cadence as the bag.
pub fn save_tech(world_name: &str, tech_blob: &str) -> bool {
    if !valid_name(world_name) {
        return false;
    }
    client_kv::set(&format!("{KEY_TECH_PREFIX}{world_name}"), tech_blob);
    true
}

/// Load a world's tech-tree discovery blob.
pub fn load_tech(world_name: &str) -> Option<String> {
    if !valid_name(world_name) {
        return None;
    }
    client_kv::get(&format!("{KEY_TECH_PREFIX}{world_name}"))
}

/// Save a world's terrain seed. Written once when the world is
/// created (per-edit persistence rule: on the same input frame as the
/// creation click, not deferred to the first autosave).
pub fn save_seed(world_name: &str, seed: u64) -> bool {
    if !valid_name(world_name) {
        return false;
    }
    client_kv::set(
        &format!("{KEY_SEED_PREFIX}{world_name}"),
        &format!("{seed:016x}"),
    );
    true
}

/// Load a world's terrain seed. None = no seed stored (pre-feature
/// world) - the caller maps that to the body's compiled-in default.
pub fn load_seed(world_name: &str) -> Option<u64> {
    if !valid_name(world_name) {
        return None;
    }
    let s = client_kv::get(&format!("{KEY_SEED_PREFIX}{world_name}"))?;
    u64::from_str_radix(s.trim(), 16).ok()
}

pub fn delete(world_name: &str) {
    if !valid_name(world_name) {
        return;
    }
    client_kv::remove(&build_key(world_name));
    client_kv::remove(&format!("{KEY_BAG_PREFIX}{world_name}"));
    client_kv::remove(&format!("{KEY_TECH_PREFIX}{world_name}"));
    client_kv::remove(&format!("{KEY_SEED_PREFIX}{world_name}"));
    // Also wipe every per-tile column and per-body torch list, so
    // deleting a world is a full reset rather than leaving orphaned
    // edits that would attach to a freshly-recreated world of the
    // same name.
    clear_world(world_name);
}

pub fn exists(world_name: &str) -> bool {
    if !valid_name(world_name) {
        return false;
    }
    client_kv::get(&build_key(world_name)).is_some()
}

/// Read all save names (matching the tenebris-c:world: prefix). Names
/// are truncated to `NAME_MAX` bytes and capped at `MAX_WORLDS`,
/// matching the C output buffers. (Order comes straight from
/// client_kv: sorted on web, storage order on native.)
pub fn list_worlds() -> Vec<String> {
    let Some(csv) = client_kv::list_with_prefix(KEY_PREFIX) else {
        return Vec::new();
    };
    let mut out = Vec::new();
    for name in csv.split('\n') {
        if out.len() >= MAX_WORLDS {
            break;
        }
        let mut end = name.len().min(NAME_MAX);
        while !name.is_char_boundary(end) {
            end -= 1;
        }
        out.push(name[..end].to_owned());
    }
    out
}

/* ------------------------------------------------------------------ */
/* Per-edit tile + torch persistence                                   */
/* ------------------------------------------------------------------ */

fn build_tile_key(world: &str, body: u32, tile: i32) -> String {
    format!("{KEY_TILE_PREFIX}{world}:{body}:{tile}")
}

fn build_tile_body_prefix(world: &str, body: u32) -> String {
    format!("{KEY_TILE_PREFIX}{world}:{body}:")
}

fn build_torch_key(world: &str, body: u32) -> String {
    format!("{KEY_TORCH_PREFIX}{world}:{body}")
}

fn build_bentity_key(world: &str, body: u32) -> String {
    format!("{KEY_BENTITY_PREFIX}{world}:{body}")
}

fn build_crop_key(world: &str, body: u32) -> String {
    format!("{KEY_CROP_PREFIX}{world}:{body}")
}

/// Serialise the whole block-entity store for (world, body). Called on the
/// SAME input frame as the placement / edit (CLAUDE.md hard rule); the
/// store is small (one entry per placed machine).
///
/// Format: ';'-separated records (the kv backend scrubs '\n'/'='/'\r' to
/// '_', so ';' ':' ',' are the safe separators that round-trip on both
/// backends). Each record is:
///   - `tile:depth:facing`                       - plain block
///   - `tile:depth:facing:c:idx,item,count,...`   - chest (non-empty slots)
///   - `tile:depth:facing:f:in,inc,fl,flc,o,oc,fr` - furnace slots + fuel
///     charge (smelt progress is transient and not persisted).
pub fn save_block_entities(
    world_name: &str,
    body_id: u32,
    store: &BlockEntityStore,
) -> bool {
    if !valid_name(world_name) {
        return false;
    }
    let key = build_bentity_key(world_name, body_id);
    if store.is_empty() {
        client_kv::remove(&key);
        return true;
    }
    /* Record serialization lives in core (block_entity::record_write) -
     * the same codec the MP wire + server saves use. */
    let recs: Vec<String> = store
        .iter()
        .map(|(tile, depth, e)| tenebris_core::block_entity::record_write(tile, depth, &e))
        .collect();
    client_kv::set(&key, &recs.join(";"));
    true
}

/// Read the block-entity store for (world, body). Malformed records are
/// skipped, the rest still load.
pub fn load_block_entities(world_name: &str, body_id: u32) -> Vec<(i32, i32, BlockEntity)> {
    if !valid_name(world_name) {
        return Vec::new();
    }
    let Some(s) = client_kv::get(&build_bentity_key(world_name, body_id)) else {
        return Vec::new();
    };
    s.split(';')
        .filter_map(tenebris_core::block_entity::record_parse)
        .collect()
}

/// Write the given column under tenebris-c:tile:<world>:<body>:<tile>.
/// Called on the SAME input frame as the block edit (CLAUDE.md hard
/// rule). Returns false on validation failure.
pub fn save_tile(
    world_name: &str,
    body_id: u32,
    tile_idx: i32,
    column: &[u8; COLUMN_BYTES],
) -> bool {
    if !valid_name(world_name) || tile_idx < 0 {
        return false;
    }
    client_kv::set(
        &build_tile_key(world_name, body_id, tile_idx),
        &hex_encode(column),
    );
    true
}

/// Read the column previously written for (world, body, tile). `None`
/// when no save exists for that key or the stored value is malformed.
pub fn load_tile(world_name: &str, body_id: u32, tile_idx: i32) -> Option<[u8; COLUMN_BYTES]> {
    if !valid_name(world_name) || tile_idx < 0 {
        return None;
    }
    let s = client_kv::get(&build_tile_key(world_name, body_id, tile_idx))?;
    let mut out = [0u8; COLUMN_BYTES];
    if s.len() == COLUMN_BYTES * 2 && hex_decode(&s, &mut out) {
        Some(out)
    } else {
        None
    }
}

/// Enumerate tile indices with a saved column for (world, body).
pub fn list_saved_tiles(world_name: &str, body_id: u32) -> Vec<i32> {
    if !valid_name(world_name) {
        return Vec::new();
    }
    list_indices_with_prefix(&build_tile_body_prefix(world_name, body_id))
}

fn list_indices_with_prefix(prefix: &str) -> Vec<i32> {
    let Some(list) = client_kv::list_with_prefix(prefix) else {
        return Vec::new();
    };
    let mut out = Vec::new();
    for line in list.split('\n') {
        // The line is the tile-index portion only (prefix already
        // stripped by client_kv). Parse decimal; skip on garbage
        // rather than abort the whole list. C: strtol with
        // endp != p && idx >= 0.
        if let Some(idx) = strtol_prefix(line) {
            if idx >= 0 {
                out.push(idx as i32);
            }
        }
    }
    out
}

/* ------------------------------------------------------------------ */
/* Per-voxel water-flow state column - same shape + storage path as
 * save_tile (one hex-encoded 128-byte string per (world, body, tile))
 * but keyed under a separate prefix so a body with player edits but
 * no flowing water doesn't pay the storage. Driven by the per-frame
 * world_water drain-persist-dirty pass in the main loop. */
/* ------------------------------------------------------------------ */

fn build_water_key(world: &str, body: u32, tile: i32) -> String {
    format!("{KEY_WATER_PREFIX}{world}:{body}:{tile}")
}

fn build_water_body_prefix(world: &str, body: u32) -> String {
    format!("{KEY_WATER_PREFIX}{world}:{body}:")
}

pub fn save_water_state(
    world_name: &str,
    body_id: u32,
    tile_idx: i32,
    column: &[u8; COLUMN_BYTES],
) -> bool {
    if !valid_name(world_name) || tile_idx < 0 {
        return false;
    }
    client_kv::set(
        &build_water_key(world_name, body_id, tile_idx),
        &hex_encode(column),
    );
    true
}

pub fn load_water_state(
    world_name: &str,
    body_id: u32,
    tile_idx: i32,
) -> Option<[u8; COLUMN_BYTES]> {
    if !valid_name(world_name) || tile_idx < 0 {
        return None;
    }
    let s = client_kv::get(&build_water_key(world_name, body_id, tile_idx))?;
    let mut out = [0u8; COLUMN_BYTES];
    if s.len() == COLUMN_BYTES * 2 && hex_decode(&s, &mut out) {
        Some(out)
    } else {
        None
    }
}

pub fn list_saved_water_tiles(world_name: &str, body_id: u32) -> Vec<i32> {
    if !valid_name(world_name) {
        return Vec::new();
    }
    list_indices_with_prefix(&build_water_body_prefix(world_name, body_id))
}

/* ------------------------------------------------------------------ */
/* Torch CSV: "tile,px,py,pz,ux,uy,uz" per line, '\n'-separated.
 * Floats use a fixed-precision form so we round-trip cleanly after a
 * reload. */
/* ------------------------------------------------------------------ */

/// Replace the torch list snapshot for (world, body). An empty slice
/// clears the snapshot (when the last torch on a body is removed).
///
/// Quirk carried over from the C tree: on the NATIVE backend the kv
/// layer scrubs framing characters out of values, so the '\n'
/// separators between torch lines land on disk as '_' and only the
/// first torch survives a reload (sscanf recovers it from the mangled
/// single line). The web/localStorage backend round-trips every line.
/// The C build behaves identically on both backends; do not "fix"
/// this side alone.
pub fn save_torches(world_name: &str, body_id: u32, torches: &[PersistenceTorch]) -> bool {
    if !valid_name(world_name) {
        return false;
    }
    let key = build_torch_key(world_name, body_id);
    if torches.is_empty() {
        client_kv::remove(&key);
        return true;
    }
    let mut buf = String::with_capacity(torches.len() * 96);
    for (i, t) in torches.iter().enumerate() {
        if i > 0 {
            buf.push('\n');
        }
        // C: snprintf "%d,%.6f,%.6f,%.6f,%.6f,%.6f,%.6f" with each f32
        // promoted to double.
        buf.push_str(&format!(
            "{},{:.6},{:.6},{:.6},{:.6},{:.6},{:.6}",
            t.tile_idx,
            t.pos[0] as f64,
            t.pos[1] as f64,
            t.pos[2] as f64,
            t.up[0] as f64,
            t.up[1] as f64,
            t.up[2] as f64
        ));
    }
    client_kv::set(&key, &buf);
    true
}

/// Read the torch snapshot for (world, body). Lines that fail to
/// parse are skipped (C: sscanf n != 7), the rest still load.
pub fn load_torches(world_name: &str, body_id: u32) -> Vec<PersistenceTorch> {
    if !valid_name(world_name) {
        return Vec::new();
    }
    let Some(s) = client_kv::get(&build_torch_key(world_name, body_id)) else {
        return Vec::new();
    };
    let mut out = Vec::new();
    for line in s.split('\n') {
        // C: sscanf "%d,%f,%f,%f,%f,%f,%f" requiring n == 7; a line
        // that falls short is skipped, not fatal.
        if let Some(t) = parse_torch_line(line) {
            out.push(t);
        }
    }
    out
}

fn parse_torch_line(line: &str) -> Option<PersistenceTorch> {
    let mut it = line.split(',');
    let tile_idx = it.next()?.trim_start().parse::<i32>().ok()?;
    let mut f = [0f32; 6];
    for (i, v) in f.iter_mut().enumerate() {
        let field = it.next()?;
        // The first five floats must each be a complete field (the
        // sscanf ',' literal follows them); the SIXTH is the format's
        // last directive, so sscanf parses a float prefix and ignores
        // whatever trails it. That matters on the native backend,
        // where the kv layer's framing scrub turns the '\n' between
        // torch lines into '_': the C build then still recovers the
        // first torch from the mangled single line, and so do we.
        *v = if i == 5 {
            strtof_prefix(field)?
        } else {
            field.trim_start().parse::<f32>().ok()?
        };
    }
    Some(PersistenceTorch {
        pos: [f[0], f[1], f[2]],
        up: [f[3], f[4], f[5]],
        tile_idx,
    })
}

/// `strtof` shape: longest leading prefix (after optional whitespace)
/// that parses as a float; `None` when no prefix does (sscanf would
/// stop with a short count).
fn strtof_prefix(s: &str) -> Option<f32> {
    let t = s.trim_start();
    for end in (1..=t.len()).rev() {
        if !t.is_char_boundary(end) {
            continue;
        }
        if let Ok(v) = t[..end].parse::<f32>() {
            return Some(v);
        }
    }
    None
}

/* ------------------------------------------------------------------ */
/* Crop CSV: "tile,px,py,pz,ux,uy,uz,growth" per line. Same shape +
 * native-backend quirk as the torch list, plus a trailing growth
 * float. */
/* ------------------------------------------------------------------ */

/// Replace the crop list snapshot for (world, body). An empty slice
/// clears it (when the last crop on a body is harvested). Written on the
/// SAME input frame as the plant / harvest, per the CLAUDE.md world-edit
/// rule.
pub fn save_crops(world_name: &str, body_id: u32, crops: &[PersistenceCrop]) -> bool {
    if !valid_name(world_name) {
        return false;
    }
    let key = build_crop_key(world_name, body_id);
    if crops.is_empty() {
        client_kv::remove(&key);
        return true;
    }
    let mut buf = String::with_capacity(crops.len() * 96);
    for (i, c) in crops.iter().enumerate() {
        if i > 0 {
            buf.push('\n');
        }
        buf.push_str(&format!(
            "{},{:.6},{:.6},{:.6},{:.6},{:.6},{:.6},{:.6},{}",
            c.tile_idx,
            c.pos[0] as f64,
            c.pos[1] as f64,
            c.pos[2] as f64,
            c.up[0] as f64,
            c.up[1] as f64,
            c.up[2] as f64,
            c.growth as f64,
            c.kind
        ));
    }
    client_kv::set(&key, &buf);
    true
}

/// Read the crop snapshot for (world, body). Malformed lines are skipped.
pub fn load_crops(world_name: &str, body_id: u32) -> Vec<PersistenceCrop> {
    if !valid_name(world_name) {
        return Vec::new();
    }
    let Some(s) = client_kv::get(&build_crop_key(world_name, body_id)) else {
        return Vec::new();
    };
    let mut out = Vec::new();
    for line in s.split('\n') {
        if let Some(c) = parse_crop_line(line) {
            out.push(c);
        }
    }
    out
}

fn parse_crop_line(line: &str) -> Option<PersistenceCrop> {
    let mut it = line.split(',');
    let tile_idx = it.next()?.trim_start().parse::<i32>().ok()?;
    let mut f = [0f32; 7];
    for (i, v) in f.iter_mut().enumerate() {
        let field = it.next()?;
        // Growth may be the last field (pre-kind saves), so (like the
        // torch line's sixth float) tolerate a mangled '_'-joined
        // trailer on the native backend by taking the longest float
        // prefix.
        *v = if i == 6 {
            strtof_prefix(field)?
        } else {
            field.trim_start().parse::<f32>().ok()?
        };
    }
    // Optional trailing kind byte: absent (pre-kind save) or garbled
    // reads as 0 = Berry, the original crop.
    let kind = it
        .next()
        .and_then(|s| strtof_prefix(s))
        .map(|v| v.clamp(0.0, 255.0) as u8)
        .unwrap_or(0);
    Some(PersistenceCrop {
        pos: [f[0], f[1], f[2]],
        up: [f[3], f[4], f[5]],
        tile_idx,
        growth: f[6].clamp(0.0, 1.0),
        kind,
    })
}

/// Wipe every per-tile column, water-state column, per-body torch list,
/// and per-body crop list for a world. Used by the delete-world flow
/// alongside `delete` (which also removes the pose key). Iterates the
/// list returned by client_kv::list_with_prefix and issues per-key
/// removes; the prefix-list call is the only way to enumerate
/// localStorage by shape.
pub fn clear_world(world_name: &str) {
    if !valid_name(world_name) {
        return;
    }
    for prefix in [
        format!("{KEY_TILE_PREFIX}{world_name}:"),
        format!("{KEY_TORCH_PREFIX}{world_name}:"),
        format!("{KEY_CROP_PREFIX}{world_name}:"),
        format!("{KEY_WATER_PREFIX}{world_name}:"),
        format!("{KEY_BENTITY_PREFIX}{world_name}:"),
    ] {
        let Some(list) = client_kv::list_with_prefix(&prefix) else {
            continue;
        };
        for suffix in list.split('\n') {
            client_kv::remove(&format!("{prefix}{suffix}"));
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::client_kv::test_support;
    use tenebris_core::block_entity::{ChestSlot, CHEST_SLOTS, ROCKET_STACK_MAX};

    /// 128-byte fixture column: column[i] = (i*7+3) & 0xFF.
    fn fixture_column() -> [u8; COLUMN_BYTES] {
        let mut col = [0u8; COLUMN_BYTES];
        for (i, b) in col.iter_mut().enumerate() {
            *b = ((i * 7 + 3) & 0xFF) as u8;
        }
        col
    }

    /// hex_encode(fixture_column()) as produced by the C encoder
    /// (gcc harness over the verbatim persistence.c codec).
    const C_HEXCOL: &str = "030a11181f262d343b424950575e656c737a81888f969da4abb2b9c0c7ced5dce3eaf1f8ff060d141b222930373e454c535a61686f767d848b9299a0a7aeb5bcc3cad1d8dfe6edf4fb020910171e252c333a41484f565d646b727980878e959ca3aab1b8bfc6cdd4dbe2e9f0f7fe050c131a21282f363d444b525960676e757c";

    #[test]
    fn hex_codec_matches_c_encoder() {
        assert_eq!(hex_encode(&fixture_column()), C_HEXCOL);
        let mut back = [0u8; COLUMN_BYTES];
        assert!(hex_decode(C_HEXCOL, &mut back));
        assert_eq!(back, fixture_column());
        // Uppercase accepted on decode (C hex_value handles A-F).
        let mut b = [0u8; 1];
        assert!(hex_decode("FF", &mut b));
        assert_eq!(b[0], 0xFF);
        // Non-hex rejected.
        assert!(!hex_decode("zz", &mut b));
    }

    #[test]
    fn pose_value_matches_c_printf() {
        let _g = test_support::begin("persist_pose_format");
        let s = PersistenceSave {
            pos_x: 12.5,
            pos_y: -3.25,
            pos_z: 1000.125,
            yaw: 0.5,
            pitch: -0.25,
            roll: 3.14159265,
            body_id: 2,
        
            survival: false,
        };
        assert!(save("home", &s));
        // Pinned against the C build's snprintf output.
        assert_eq!(
            client_kv::get("tenebris-c:world:home").as_deref(),
            /* Rust-port extension: ",<survival>" rides as an 8th field
             * (the C reader's final %u ignores the trailer). */
            Some("12.500000,-3.250000,1000.125000,0.500000,-0.250000,3.141593,2,0")
        );
        // Round trip: %.6f is lossy for roll (3.14159265 -> 3.141593),
        // exactly as in the C build; everything else is exact.
        assert_eq!(
            load("home"),
            Some(PersistenceSave {
                roll: 3.141593,
                ..s
            })
        );

        // Values whose f32->f64 promotion exercises the %.6f rounding.
        let s2 = PersistenceSave {
            pos_x: 0.1,
            pos_y: 123.456_789_012e3,
            pos_z: -0.000001,
            yaw: 0.1,
            pitch: 1.7,
            roll: -2.3,
            body_id: 4294967295,
        
            survival: false,
        };
        assert!(save("home", &s2));
        assert_eq!(
            client_kv::get("tenebris-c:world:home").as_deref(),
            Some("0.100000,123456.789012,-0.000001,0.100000,1.700000,-2.300000,4294967295,0")
        );
    }

    #[test]
    fn pose_load_reads_c_written_value() {
        let _g = test_support::begin("persist_pose_load_c");
        // A value exactly as the C client would have written it.
        client_kv::set(
            "tenebris-c:world:legacy",
            "1.000000,-2.000000,3.500000,0.250000,-0.125000,1.500000,7",
        );
        let s = load("legacy").expect("parse");
        assert_eq!(
            s,
            PersistenceSave {
                pos_x: 1.0,
                pos_y: -2.0,
                pos_z: 3.5,
                yaw: 0.25,
                pitch: -0.125,
                roll: 1.5,
                body_id: 7,
            
                survival: false,
            }
        );
        // Malformed: too few fields -> sscanf n != 7 -> reject.
        client_kv::set("tenebris-c:world:legacy", "1.0,2.0,3.0");
        assert!(load("legacy").is_none());
        // Malformed: garbage inside a float field -> reject.
        client_kv::set("tenebris-c:world:legacy", "1.0,2.0x,3.0,4.0,5.0,6.0,7");
        assert!(load("legacy").is_none());
    }

    #[test]
    fn name_validation() {
        let _g = test_support::begin("persist_name_validation");
        let col = fixture_column();
        assert!(!save_tile("", 0, 0, &col));
        assert!(!save_tile("a:b", 0, 0, &col));
        assert!(!save_tile("a\nb", 0, 0, &col));
        assert!(!save_tile(&"x".repeat(32), 0, 0, &col));
        assert!(!save_tile("ok", 0, -1, &col));
        assert!(!exists(""));
        assert!(load("a:b").is_none());
    }

    #[test]
    fn tile_round_trip_and_key_layout() {
        let _g = test_support::begin("persist_tile_round_trip");
        let col = fixture_column();
        assert!(save_tile("home", 1, 42, &col));
        // Exact key + hex value layout (what the C client reads back).
        assert_eq!(
            client_kv::get("tenebris-c:tile:home:1:42").as_deref(),
            Some(C_HEXCOL)
        );
        assert_eq!(load_tile("home", 1, 42), Some(col));
        assert_eq!(load_tile("home", 1, 43), None);
        assert_eq!(load_tile("home", 2, 42), None);

        assert!(save_tile("home", 1, 7, &[0u8; COLUMN_BYTES]));
        let mut tiles = list_saved_tiles("home", 1);
        tiles.sort_unstable();
        assert_eq!(tiles, [7, 42]);
        assert!(list_saved_tiles("home", 9).is_empty());

        // Corrupt stored value -> load fails (wrong length / bad hex).
        client_kv::set("tenebris-c:tile:home:1:42", "abcd");
        assert_eq!(load_tile("home", 1, 42), None);
    }

    #[test]
    fn water_round_trip_and_key_layout() {
        let _g = test_support::begin("persist_water_round_trip");
        let col = fixture_column();
        assert!(save_water_state("home", 3, 5, &col));
        assert_eq!(
            client_kv::get("tenebris-c:water:home:3:5").as_deref(),
            Some(C_HEXCOL)
        );
        assert_eq!(load_water_state("home", 3, 5), Some(col));
        assert_eq!(list_saved_water_tiles("home", 3), [5]);
        // Separate namespace from block tiles.
        assert!(list_saved_tiles("home", 3).is_empty());
    }

    /// Line pinned against the C build's snprintf output for
    /// torches[0] below (gcc harness over the verbatim format string).
    const C_TORCH_LINE: &str = "42,1.500000,-2.250000,0.125000,0.100000,0.957826,-0.267261";
    const C_TORCH_LINE2: &str = "7,0.000000,1.000000,0.000000,0.000000,1.000000,0.000000";

    fn torch_fixtures() -> [PersistenceTorch; 2] {
        [
            PersistenceTorch {
                pos: [1.5, -2.25, 0.125],
                up: [0.1, 0.957826, -0.267261],
                tile_idx: 42,
            },
            PersistenceTorch {
                pos: [0.0, 1.0, 0.0],
                up: [0.0, 1.0, 0.0],
                tile_idx: 7,
            },
        ]
    }

    #[test]
    fn block_entities_round_trip_and_clear() {
        use tenebris_core::block_entity::MachineState;
        let _g = test_support::begin("persist_bentities");
        let mut store = BlockEntityStore::new();
        // A plain facing-only entity and a chest with two non-empty slots.
        store.set(5, 3, BlockEntity::with_facing(2));
        let chest = store.entry(40, 0);
        chest.facing = 4;
        chest.chest_mut()[0] = ChestSlot { item: 7, count: 10 };
        chest.chest_mut()[2] = ChestSlot { item: 9, count: 3 };

        assert!(save_block_entities("home", 1, &store));
        // Reload into a fresh store and compare cell-by-cell (HashMap
        // iteration order isn't stable, so don't compare the raw string).
        let loaded = load_block_entities("home", 1);
        let mut back = BlockEntityStore::new();
        for (t, d, e) in loaded {
            back.set(t, d, e);
        }
        assert_eq!(back.facing(5, 3), 2);
        assert!(matches!(back.get(5, 3).unwrap().state, MachineState::None));
        let c = back.get(40, 0).unwrap();
        assert_eq!(c.facing, 4);
        assert_eq!(c.chest().unwrap()[0], ChestSlot { item: 7, count: 10 });
        assert_eq!(c.chest().unwrap()[2], ChestSlot { item: 9, count: 3 });
        assert_eq!(c.chest().unwrap()[1].count, 0);

        assert!(load_block_entities("home", 2).is_empty());
        // Empty store removes the key.
        assert!(save_block_entities("home", 1, &BlockEntityStore::new()));
        assert_eq!(client_kv::get("tenebris-c:bentities:home:1"), None);
    }

    #[test]
    fn launch_pad_stack_round_trips() {
        use tenebris_core::items::{COMMAND_MODULE, FUEL_TANK, ROCKET_ENGINE};
        let _g = test_support::begin("persist_launchpad");
        let mut store = BlockEntityStore::new();
        let pad = store.entry(12, 7).launch_pad_mut();
        pad.push(ROCKET_ENGINE);
        pad.push(FUEL_TANK);
        pad.push(FUEL_TANK);
        pad.push(COMMAND_MODULE);

        assert!(save_block_entities("home", 5, &store));
        let mut back = BlockEntityStore::new();
        for (t, d, e) in load_block_entities("home", 5) {
            back.set(t, d, e);
        }
        let loaded = back.get(12, 7).unwrap();
        let lp = loaded.launch_pad().expect("launch pad state");
        assert_eq!(
            lp.parts(),
            &[ROCKET_ENGINE, FUEL_TANK, FUEL_TANK, COMMAND_MODULE]
        );
    }

    #[test]
    fn crop_csv_round_trips_with_growth() {
        let _g = test_support::begin("persist_crop_csv");
        let crops = [
            PersistenceCrop {
                pos: [1.0, 2.0, 3.0],
                up: [1.0, 0.0, 0.0],
                tile_idx: 41,
                growth: 0.25,
                kind: 1, // wheat
            },
            PersistenceCrop {
                pos: [-4.5, 0.0, 6.25],
                up: [0.0, 1.0, 0.0],
                tile_idx: 7,
                growth: 1.0,
                kind: 0,
            },
        ];
        // Single crop: no '\n' framing, so it round-trips on both backends.
        assert!(save_crops("home", 4, &crops[..1]));
        assert_eq!(load_crops("home", 4), [crops[0]]);
        assert!(load_crops("home", 9).is_empty());
        // Empty slice clears the snapshot.
        assert!(save_crops("home", 4, &[]));
        assert_eq!(client_kv::get("tenebris-c:crops:home:4"), None);
        // Growth is clamped into [0,1] on load; a garbage line is skipped.
        assert_eq!(parse_crop_line("garbage"), None);
        assert_eq!(parse_crop_line("5,1,2,3,4,5,6"), None); // short (no growth)
        let c = parse_crop_line("5,1.0,2.0,3.0,0.0,1.0,0.0,2.5").expect("valid");
        assert_eq!(c.growth, 1.0); // clamped
        assert_eq!(c.tile_idx, 5);
        assert_eq!(c.kind, 0, "pre-kind save line loads as Berry");
        let k = parse_crop_line("5,1.0,2.0,3.0,0.0,1.0,0.0,0.5,2").expect("valid");
        assert_eq!(k.kind, 2, "trailing kind field round-trips");
    }

    #[test]
    fn torch_csv_matches_c_printf_and_round_trips() {
        let _g = test_support::begin("persist_torch_csv");
        let torches = torch_fixtures();
        // Single torch: no '\n' framing involved, so the stored value
        // is the pinned C line verbatim on both backends.
        assert!(save_torches("home", 2, &torches[..1]));
        assert_eq!(
            client_kv::get("tenebris-c:torches:home:2").as_deref(),
            Some(C_TORCH_LINE)
        );
        assert_eq!(load_torches("home", 2), [torches[0]]);
        assert!(load_torches("home", 3).is_empty());

        // Empty list clears the snapshot key entirely.
        assert!(save_torches("home", 2, &[]));
        assert_eq!(client_kv::get("tenebris-c:torches:home:2"), None);
    }

    #[test]
    fn torch_multi_line_saves_round_trip_on_native() {
        let _g = test_support::begin("persist_torch_native_quirk");
        let torches = torch_fixtures();
        assert!(save_torches("home", 2, &torches));
        /* DELIBERATE deviation from the C native build: its kv framing
         * scrub turned the '\n' between lines into '_', silently
         * dropping every torch past the first on reload (the web
         * localStorage backend never had the problem). The Rust kv
         * escapes values losslessly instead - N torches in, N out. */
        assert_eq!(
            client_kv::get("tenebris-c:torches:home:2"),
            Some(format!("{C_TORCH_LINE}\n{C_TORCH_LINE2}"))
        );
        assert_eq!(load_torches("home", 2), torches);
    }

    #[test]
    fn torch_line_parser_skips_garbage_like_sscanf() {
        // Lines that fail to parse are skipped (sscanf n != 7); the
        // parser itself is exercised directly because the native kv
        // backend can't store multi-line values.
        assert_eq!(parse_torch_line("garbage"), None);
        assert_eq!(parse_torch_line("42,1.0,2.0,3.0"), None); // short
        assert_eq!(parse_torch_line(""), None);
        let t = parse_torch_line(C_TORCH_LINE2).expect("valid line");
        assert_eq!(t, torch_fixtures()[1]);
        // Trailing garbage only tolerated on the final field.
        assert_eq!(parse_torch_line("42,1.0x,2.0,3.0,4.0,5.0,6.0"), None);
        assert!(parse_torch_line("42,1.0,2.0,3.0,4.0,5.0,6.0junk").is_some());
    }

    #[test]
    fn delete_wipes_pose_tiles_torches_water() {
        let _g = test_support::begin("persist_delete_wipes_all");
        let col = fixture_column();
        let pose = PersistenceSave {
            pos_x: 1.0,
            pos_y: 2.0,
            pos_z: 3.0,
            yaw: 0.0,
            pitch: 0.0,
            roll: 0.0,
            body_id: 0,
        
            survival: false,
        };
        assert!(save("doomed", &pose));
        assert!(save_tile("doomed", 0, 1, &col));
        assert!(save_water_state("doomed", 0, 2, &col));
        assert!(save_torches(
            "doomed",
            0,
            &[PersistenceTorch { pos: [0.0; 3], up: [0.0, 1.0, 0.0], tile_idx: 1 }]
        ));
        // A sibling world must survive the wipe.
        assert!(save_tile("kept", 0, 1, &col));

        assert!(exists("doomed"));
        delete("doomed");
        assert!(!exists("doomed"));
        assert_eq!(load_tile("doomed", 0, 1), None);
        assert_eq!(load_water_state("doomed", 0, 2), None);
        assert!(load_torches("doomed", 0).is_empty());
        assert!(list_saved_tiles("doomed", 0).is_empty());
        assert_eq!(load_tile("kept", 0, 1), Some(col));
    }

    #[test]
    fn list_worlds_enumerates_pose_keys() {
        let _g = test_support::begin("persist_list_worlds");
        assert!(list_worlds().is_empty());
        let pose = PersistenceSave {
            pos_x: 0.0,
            pos_y: 0.0,
            pos_z: 0.0,
            yaw: 0.0,
            pitch: 0.0,
            roll: 0.0,
            body_id: 0,
        
            survival: false,
        };
        save("beta", &pose);
        save("alpha", &pose);
        let mut worlds = list_worlds();
        worlds.sort();
        assert_eq!(worlds, ["alpha", "beta"]);
        // Tile keys must not leak into the world list.
        save_tile("alpha", 0, 0, &fixture_column());
        let mut worlds = list_worlds();
        worlds.sort();
        assert_eq!(worlds, ["alpha", "beta"]);
    }
}
