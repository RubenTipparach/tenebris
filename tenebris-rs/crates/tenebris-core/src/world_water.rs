//! Port of `tenebris-c/src/core/world_water.{c,h}`.
//!
//! Per-voxel water flow state + tick scheduler.
//!
//! Two pieces of state per world:
//!
//!   1. A parallel byte array (tile_count * WORLD_MAX_DEPTH) carrying
//!      water-only metadata. A byte of 0 on a BLOCK_WATER voxel means
//!      "legacy / sleeping" - the cell acts as a full source supplier
//!      for neighbour ticks but never wakes the scheduler on its own.
//!      Non-water voxels keep their byte at 0.
//!
//!      Bit layout per byte:
//!        bit 7    : 1 if source ("infinite", drives the flow field)
//!        bit 6    : 1 if falling (supported by the cell above only)
//!        bits 5..3: reserved for a future fluid-type tag (lava, oil)
//!        bits 2..0: flow level, 0..WATER_LEVEL_MAX
//!                   0 = full cell, level_max = thinnest film
//!
//!   2. A bounded ring-buffer scheduler. `enqueue` pushes a (tile,
//!      depth) pair; `step` pops up to N pairs and runs the section-5
//!      flow rule from tenebris-c/water.md on each. A "scheduled"
//!      bitset (1 bit per voxel) guarantees a cell can't sit in the
//!      queue twice.
//!
//! The state byte array round-trips to saves + the WATER_STATE_DIFF
//! wire message and the origin table feeds WATER_ORIGINS_DIFF, so the
//! representation here must stay value-identical to the C build.
//!
//! Ownership: the C module hangs an opaque `world_water_t*` off
//! `world_t::water` and every API call takes the world pointer. The
//! Rust port stores the state struct by value as `World::water` and
//! keeps the C call shape as free functions taking `&World` /
//! `&mut World` - the flow tick mutates blocks via `World::set` (which
//! re-enters this module through `notify_edit`), so the world borrow
//! has to flow through every call exactly like the C pointer did.
//!
//! Renames (per PORTING.md rule 4 - module prefix dropped):
//! - `world_water_t`                    -> `world_water::WorldWater`
//! - `world_water_create(w)`            -> `WorldWater::create(tile_count)`
//!   (the C function only reads `w->tile_count`; taking the count
//!   directly avoids a circular world -> water -> world borrow, same
//!   trick as `WorldLight::create`. The C NULL return on a zero-tile
//!   world maps to zero-sized arrays - every accessor no-ops the same
//!   way the C no-ops on a NULL water pointer.)
//! - `world_water_destroy()`            -> `Drop` (implicit)
//! - `world_water_clone_into(dst, src)` -> `world_water::clone_into(dst, src)`
//! - `world_water_get_state()` etc.     -> `world_water::get_state()` etc.
//! - `water_state_is_source()` etc.     -> `world_water::state_is_source()` etc.
//! - `water_origin_ref_t`               -> `world_water::OriginRef`
//! - `water_origin_diff_entry_t`        -> `world_water::OriginDiffEntry`
//!   (the `_pad` fields drop out - layout only matters on the wire,
//!   where proto.rs serialises field-by-field)
//! - `world_water_origin_read(out)`     -> `origin_read(.., Option<&mut [..]>)`
//!   (C accepts out == NULL to just query the count)
//! - `world_water_origin_enum_tile(out, cap)` -> `origin_enum_tile(.., &mut [..])`
//!   (cap = slice length; an empty slice = count-only query)
//! - `world_water_origin_visit_all(cb, user)` -> `origin_visit_all(.., FnMut)`
//! - `world_water_drain_persist_dirty(out, cap)` -> slice, cap = len

use crate::blocks::{self, Block};
use crate::config;
use crate::goldberg;
use crate::world::{World, WORLD_MAX_DEPTH};

/* ---------------------------------------------------------------------
 * State byte layout + small helpers.
 *
 * These constants encode the algorithm's identity (3-bit level field +
 * two flag bits), not designer-tunable values - the level CAP itself
 * (WATER_LEVEL_MAX) is exposed as a YAML-overridable runtime knob; the
 * bit positions stay fixed regardless of what the cap is set to.
 * ------------------------------------------------------------------- */

pub const WATER_LEVEL_MAX: i32 = 7; /* 3-bit max; YAML can cap below this */
pub const WATER_LEVEL_MASK: u8 = 0x07;
pub const WATER_FLAG_FALLING: u8 = 0x40;
pub const WATER_FLAG_SOURCE: u8 = 0x80;

#[inline]
pub fn state_is_source(s: u8) -> bool {
    (s & WATER_FLAG_SOURCE) != 0
}

#[inline]
pub fn state_is_falling(s: u8) -> bool {
    (s & WATER_FLAG_FALLING) != 0
}

#[inline]
pub fn state_level(s: u8) -> i32 {
    (s & WATER_LEVEL_MASK) as i32
}

#[inline]
pub fn state_pack(source: bool, falling: bool, level: i32) -> u8 {
    let mut out = (level & WATER_LEVEL_MASK as i32) as u8;
    if source {
        out |= WATER_FLAG_SOURCE;
    }
    if falling {
        out |= WATER_FLAG_FALLING;
    }
    out
}

/// Port of `WATER_ORIGIN_MAX`. 4th origin used to trigger
/// source-promotion; nowadays the 4th add is silently dropped.
pub const WATER_ORIGIN_MAX: usize = 3;

/// Port of `water_origin_ref_t`.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub struct OriginRef {
    pub tile: u32,
    pub depth: u8,
}

/// Port of `water_origin_diff_entry_t` (network-broadcast support).
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub struct OriginDiffEntry {
    pub depth: u8,
    /// 1..WATER_ORIGIN_MAX (entries with 0 origins are never recorded
    /// in the hash, so this is always positive)
    pub origin_count: u8,
    /// up to origin_count valid tile indices
    pub origin_tile: [u32; WATER_ORIGIN_MAX],
    /// corresponding depths
    pub origin_depth: [u8; WATER_ORIGIN_MAX],
}

/* Per-tick BFS working-set caps. These bound the stack-allocated search
 * arrays in bfs_distance_to_hole; they're a function of the largest
 * search_radius value the YAML knob could realistically take, so they
 * live as compile-time consts rather than YAML overrides. */
const BFS_MAX_VISITED: usize = 128;
const BFS_MAX_FRONTIER: usize = 64;

const WATER_ORIGINS_TABLE_SIZE: usize = 4096; /* power of 2 */

/* depth_plus_one == 0 is "never inserted"; == 255 is "tombstone"
 * (deleted, but lookups must continue probing past it). Live entries
 * have depth_plus_one in 1..128 (depth 0..127 + 1). */
const WATER_ORIGIN_TOMBSTONE: u8 = 255;

/* ---------------------------------------------------------------------
 * Opaque module state.
 * ------------------------------------------------------------------- */

/// Port of `struct water_origin_slot_t`. The `_pad` fields drop out.
#[derive(Clone, Copy, Default)]
struct OriginSlot {
    key_tile: u32, /* 0 + depth+1 == 0 = empty */
    key_depth_plus_one: u8,
    origin_count: u8, /* 0..WATER_ORIGIN_MAX */
    origin_tile: [u32; WATER_ORIGIN_MAX],
    origin_depth: [u8; WATER_ORIGIN_MAX],
}

/// Port of `struct world_water_s`.
pub struct WorldWater {
    /* Per-voxel state byte array, sized to tile_count * WORLD_MAX_DEPTH.
     * Indexed as state[tile * WORLD_MAX_DEPTH + depth]. */
    state: Vec<u8>,
    state_count: i32,

    /* Ring buffer of (tile, depth) cells waiting to tick. Each entry
     * is packed as (tile << 7) | depth, exploiting the
     * WORLD_MAX_DEPTH = 128 ceiling. */
    queue: Vec<u32>,
    cap: i32,
    head: i32,
    tail: i32,
    count: i32,

    /* "Is this cell already in the queue?" bitset. 1 bit per voxel. */
    scheduled: Vec<u8>,

    /* Per-tile "needs persistence flush" bitset. 1 bit per tile (NOT
     * per voxel - the unit of persistence is the whole 128-byte
     * water-state column). */
    persist_dirty: Vec<u8>,

    /* Flow-origin hash table. Open-addressed, linear probing, fixed
     * power-of-2 size. Resize is not implemented - on a full table,
     * origin_add returns false and the cell behaves as an "untracked"
     * flow cell. */
    origins: Vec<OriginSlot>,
    origins_cap: i32,
    origins_count: i32,
}

/* ---------------------------------------------------------------------
 * Tiny helpers.
 * ------------------------------------------------------------------- */

#[inline]
fn pack_cell(tile: i32, depth: i32) -> u32 {
    ((tile as u32) << 7) | ((depth as u32) & 0x7F)
}

#[inline]
fn unpack_cell(packed: u32) -> (i32, i32) {
    (((packed >> 7) as i32), ((packed & 0x7F) as i32))
}

#[inline]
fn cell_in_range(w: &World, tile: i32, depth: i32) -> bool {
    /* The C also checks `!w->water` here; the Rust world always carries
     * a water module (zero-sized when tile_count <= 0, which the range
     * check below rejects anyway). */
    if tile < 0 || tile >= w.tile_count {
        return false;
    }
    if depth < 0 || depth >= WORLD_MAX_DEPTH {
        return false;
    }
    true
}

#[inline]
fn cell_index(tile: i32, depth: i32) -> usize {
    (tile * WORLD_MAX_DEPTH + depth) as usize
}

#[inline]
fn sched_bit_get(ww: &WorldWater, idx: usize) -> bool {
    (ww.scheduled[idx >> 3] >> (idx & 7)) & 1 != 0
}

#[inline]
fn sched_bit_set(ww: &mut WorldWater, idx: usize) {
    ww.scheduled[idx >> 3] |= 1u8 << (idx & 7);
}

#[inline]
fn sched_bit_clear(ww: &mut WorldWater, idx: usize) {
    ww.scheduled[idx >> 3] &= !(1u8 << (idx & 7));
}

/* ---------------------------------------------------------------------
 * Lifecycle.
 * ------------------------------------------------------------------- */

impl WorldWater {
    /// Port of `world_water_create()`. The C returns NULL on a
    /// zero-tile world; here that maps to zero-sized arrays (every
    /// accessor no-ops via the same range checks).
    pub fn create(tile_count: i32) -> WorldWater {
        let tc = if tile_count > 0 { tile_count } else { 0 };
        let state_count = tc * WORLD_MAX_DEPTH;
        /* Queue capacity read at create time. If config_load_water
         * hasn't fired yet the static default applies; runtime YAML
         * reloads are not retroactively resized. Floor at 1 so a
         * hostile YAML can't allocate zero bytes. */
        let mut cap = config::water_flow().queue_capacity;
        if cap < 1 {
            cap = 1;
        }
        let (origins, origins_cap) = if tc > 0 {
            (
                vec![OriginSlot::default(); WATER_ORIGINS_TABLE_SIZE],
                WATER_ORIGINS_TABLE_SIZE as i32,
            )
        } else {
            /* C "no water module" stand-in: an empty table makes
             * origin_add return false like the NULL-pointer check did. */
            (Vec::new(), 0)
        };
        WorldWater {
            state: vec![0u8; state_count as usize],
            state_count,
            queue: vec![0u32; cap as usize],
            cap,
            head: 0,
            tail: 0,
            count: 0,
            scheduled: vec![0u8; ((state_count + 7) / 8) as usize],
            persist_dirty: vec![0u8; ((tc + 7) / 8) as usize],
            origins,
            origins_cap,
            origins_count: 0,
        }
    }
}

/* world_water_destroy(): Drop handles the frees. */

/// Port of `world_water_clone_into()`. Deep-copy src's state byte
/// array into dst. Sizes must match (caller is responsible for cloning
/// against a world built from the same body / subdivisions).
pub fn clone_into(dst: &mut WorldWater, src: &WorldWater) {
    if dst.state_count != src.state_count {
        return;
    }
    dst.state.copy_from_slice(&src.state);
    /* Queue is intentionally not cloned: a snapshot inherits the
     * settled state, not pending work. */
    dst.head = 0;
    dst.tail = 0;
    dst.count = 0;
    dst.scheduled.fill(0);
    /* Persist-dirty also resets: the clone matches the source
     * snapshot on disk - nothing to flush yet. */
    dst.persist_dirty.fill(0);
    /* Origins table sizes must match (same world shape on both sides). */
    if dst.origins_cap == src.origins_cap {
        dst.origins.copy_from_slice(&src.origins);
        dst.origins_count = src.origins_count;
    }
}

/* ---------------------------------------------------------------------
 * Flow-origin hash table.
 * ------------------------------------------------------------------- */

#[inline]
fn origin_hash(tile: u32, depth: i32) -> u32 {
    /* xxHash-style multiply-then-mix. */
    let mut h = tile.wrapping_mul(0x9E3779B1);
    h ^= (depth as u32).wrapping_mul(0x85EBCA77);
    h ^= h >> 16;
    h
}

/* Locate the slot for (tile, depth) for LOOKUP. Returns the slot index
 * containing the matching entry, or -1 if the key isn't present. Skips
 * tombstones during the walk - they don't break the probe chain. */
fn origin_slot_lookup(ww: &WorldWater, tile: u32, depth: i32) -> i32 {
    if ww.origins_cap <= 0 {
        return -1;
    }
    let mask = (ww.origins_cap - 1) as u32;
    let start = origin_hash(tile, depth) & mask;
    for step in 0..ww.origins_cap as u32 {
        let idx = (start.wrapping_add(step)) & mask;
        let s = &ww.origins[idx as usize];
        if s.key_depth_plus_one == 0 {
            return -1; /* never-used = stop */
        }
        if s.key_depth_plus_one == WATER_ORIGIN_TOMBSTONE {
            continue;
        }
        if s.key_tile == tile && s.key_depth_plus_one == (depth + 1) as u8 {
            return idx as i32;
        }
    }
    -1
}

/* Locate a slot for INSERT. Returns the matching slot if present, or
 * the first tombstone / never-used slot encountered in the probe
 * chain. Returns -1 only on a completely full table with no key match. */
fn origin_slot_insert(ww: &WorldWater, tile: u32, depth: i32) -> i32 {
    if ww.origins_cap <= 0 {
        return -1;
    }
    let mask = (ww.origins_cap - 1) as u32;
    let start = origin_hash(tile, depth) & mask;
    let mut first_reusable: i32 = -1;
    for step in 0..ww.origins_cap as u32 {
        let idx = (start.wrapping_add(step)) & mask;
        let s = &ww.origins[idx as usize];
        if s.key_depth_plus_one == 0 {
            /* End of probe chain - key not present. Use this slot
             * unless an earlier tombstone is available. */
            return if first_reusable >= 0 {
                first_reusable
            } else {
                idx as i32
            };
        }
        if s.key_depth_plus_one == WATER_ORIGIN_TOMBSTONE {
            if first_reusable < 0 {
                first_reusable = idx as i32;
            }
            continue;
        }
        if s.key_tile == tile && s.key_depth_plus_one == (depth + 1) as u8 {
            return idx as i32;
        }
    }
    first_reusable /* may be -1 if table truly full */
}

/* Mark a slot as deleted (tombstone) instead of zeroing it so the
 * linear-probe chain stays intact for subsequent lookups. */
#[inline]
fn origin_slot_clear(s: &mut OriginSlot) {
    *s = OriginSlot::default();
    s.key_depth_plus_one = WATER_ORIGIN_TOMBSTONE;
}

/// Port of `world_water_origin_add()`. Record an origin reference for
/// the flow cell at (tile, depth). Idempotent for an already-listed
/// origin; the 4th distinct origin is dropped silently (returns false).
/// Also returns false when the hash table is full.
pub fn origin_add(w: &mut World, tile: i32, depth: i32, origin: OriginRef) -> bool {
    if tile < 0 || depth < 0 || depth >= WORLD_MAX_DEPTH {
        return false;
    }
    let idx = origin_slot_insert(&w.water, tile as u32, depth);
    if idx < 0 {
        return false;
    }
    let slot = idx as usize;
    /* Slot may be empty (depth_plus_one == 0), tombstoned, or a live
     * entry for the same key. Live = skip the (re)init; the loop
     * below dedupes the origin. Empty / tombstone = (re)init. */
    let needs_init = {
        let s = &w.water.origins[slot];
        s.key_depth_plus_one == 0 || s.key_depth_plus_one == WATER_ORIGIN_TOMBSTONE
    };
    if needs_init {
        let s = &mut w.water.origins[slot];
        s.key_tile = tile as u32;
        s.key_depth_plus_one = (depth + 1) as u8;
        s.origin_count = 0;
        w.water.origins_count += 1;
    }
    let s = &mut w.water.origins[slot];
    /* Idempotence: already in the list? */
    for i in 0..s.origin_count as usize {
        if s.origin_tile[i] == origin.tile && s.origin_depth[i] == origin.depth {
            return true;
        }
    }
    if (s.origin_count as usize) < WATER_ORIGIN_MAX {
        let c = s.origin_count as usize;
        s.origin_tile[c] = origin.tile;
        s.origin_depth[c] = origin.depth;
        s.origin_count += 1;
        return true;
    }
    /* List is full. Previously this branch auto-promoted the cell to
     * a source, but that path was a runaway cascade. Drop the 4th
     * origin silently: the cell stays flowing, capped at
     * WATER_ORIGIN_MAX lineage entries. */
    false
}

/// Port of `world_water_origin_remove()`. Remove `origin` from the
/// flow cell's list, if present. A list that empties removes the
/// entry from the table entirely.
pub fn origin_remove(w: &mut World, tile: i32, depth: i32, origin: OriginRef) {
    if tile < 0 || depth < 0 || depth >= WORLD_MAX_DEPTH {
        return;
    }
    let idx = origin_slot_lookup(&w.water, tile as u32, depth);
    if idx < 0 {
        return;
    }
    let slot = idx as usize;
    let emptied = {
        let s = &mut w.water.origins[slot];
        if s.key_depth_plus_one == 0 {
            return;
        }
        /* Find and compact-remove. */
        for i in 0..s.origin_count as usize {
            if s.origin_tile[i] == origin.tile && s.origin_depth[i] == origin.depth {
                for j in (i + 1)..s.origin_count as usize {
                    s.origin_tile[j - 1] = s.origin_tile[j];
                    s.origin_depth[j - 1] = s.origin_depth[j];
                }
                s.origin_count -= 1;
                break;
            }
        }
        if s.origin_count == 0 {
            origin_slot_clear(s);
            true
        } else {
            false
        }
    };
    if emptied && w.water.origins_count > 0 {
        w.water.origins_count -= 1;
    }
}

/// Port of `world_water_origin_remove_global()`. Remove ALL flow-cell
/// entries whose origin list includes `origin`. Cells whose list
/// empties get their entry removed entirely and are re-enqueued so the
/// next tick dries them up via the standard supplier scan.
pub fn origin_remove_global(w: &mut World, origin: OriginRef) {
    /* Linear scan of the whole table. Only fires on source destruction
     * (rare event). */
    for idx in 0..w.water.origins_cap as usize {
        let freed: Option<(i32, i32)> = {
            let s = &mut w.water.origins[idx];
            if s.key_depth_plus_one == 0 {
                continue;
            }
            /* Same compact-remove as the targeted variant. */
            for i in 0..s.origin_count as usize {
                if s.origin_tile[i] == origin.tile && s.origin_depth[i] == origin.depth {
                    for j in (i + 1)..s.origin_count as usize {
                        s.origin_tile[j - 1] = s.origin_tile[j];
                        s.origin_depth[j - 1] = s.origin_depth[j];
                    }
                    s.origin_count -= 1;
                    break;
                }
            }
            if s.origin_count == 0 {
                let tile = s.key_tile as i32;
                let depth = s.key_depth_plus_one as i32 - 1;
                origin_slot_clear(s);
                Some((tile, depth))
            } else {
                None
            }
        };
        if let Some((tile, depth)) = freed {
            if w.water.origins_count > 0 {
                w.water.origins_count -= 1;
            }
            /* Wake the cell so the next tick re-evaluates it via the
             * standard supplier scan and dries it up if no neighbour
             * is feeding it any more. */
            enqueue(w, tile, depth);
        }
    }
}

/// Port of `world_water_origin_clear()`. Drop the flow cell's origin
/// entry. No-op if the cell has no entry.
pub fn origin_clear(w: &mut World, tile: i32, depth: i32) {
    if tile < 0 || depth < 0 || depth >= WORLD_MAX_DEPTH {
        return;
    }
    let idx = origin_slot_lookup(&w.water, tile as u32, depth);
    if idx < 0 {
        return;
    }
    let s = &mut w.water.origins[idx as usize];
    if s.key_depth_plus_one == 0 {
        return;
    }
    origin_slot_clear(s);
    if w.water.origins_count > 0 {
        w.water.origins_count -= 1;
    }
}

/// Port of `world_water_origin_count()`. Number of origins recorded
/// for the flow cell. 0 = no entry.
pub fn origin_count(w: &World, tile: i32, depth: i32) -> i32 {
    if tile < 0 || depth < 0 || depth >= WORLD_MAX_DEPTH {
        return 0;
    }
    let idx = origin_slot_lookup(&w.water, tile as u32, depth);
    if idx < 0 {
        return 0;
    }
    let s = &w.water.origins[idx as usize];
    if s.key_depth_plus_one == 0 {
        return 0;
    }
    s.origin_count as i32
}

/// Port of `world_water_origin_read()`. Writes up to WATER_ORIGIN_MAX
/// entries into `out` (pass `None` to just query the count); returns
/// the count actually written.
pub fn origin_read(
    w: &World,
    tile: i32,
    depth: i32,
    out: Option<&mut [OriginRef; WATER_ORIGIN_MAX]>,
) -> i32 {
    if tile < 0 || depth < 0 || depth >= WORLD_MAX_DEPTH {
        return 0;
    }
    let idx = origin_slot_lookup(&w.water, tile as u32, depth);
    if idx < 0 {
        return 0;
    }
    let s = &w.water.origins[idx as usize];
    if s.key_depth_plus_one == 0 {
        return 0;
    }
    let n = s.origin_count as usize;
    if let Some(out) = out {
        for i in 0..n {
            out[i].tile = s.origin_tile[i];
            out[i].depth = s.origin_depth[i];
        }
    }
    n as i32
}

/// Port of `world_water_origin_enum_tile()`. Enumerate every origin
/// entry attached to a single tile. Writes up to `out.len()` entries;
/// returns the count that would have been written with enough room
/// (callers detect truncation by comparing against the slice length).
pub fn origin_enum_tile(w: &World, tile: i32, out: &mut [OriginDiffEntry]) -> i32 {
    let mut n = 0usize;
    /* Linear table walk. The hash key is (tile, depth) so there's no
     * grouping by tile - any slot might or might not match. */
    for idx in 0..w.water.origins_cap as usize {
        let s = &w.water.origins[idx];
        if s.key_depth_plus_one == 0 || s.key_depth_plus_one == WATER_ORIGIN_TOMBSTONE {
            continue;
        }
        if s.key_tile as i32 != tile {
            continue;
        }
        if n < out.len() {
            let e = &mut out[n];
            e.depth = s.key_depth_plus_one - 1;
            e.origin_count = s.origin_count;
            for i in 0..WATER_ORIGIN_MAX {
                e.origin_tile[i] = s.origin_tile[i];
                e.origin_depth[i] = s.origin_depth[i];
            }
        }
        n += 1;
    }
    n as i32
}

/// Port of `world_water_origin_visit_all()`. Walk every (tile, depth)
/// cell that has at least one origin entry, invoking the callback once
/// per cell. Walks the table linearly - O(origins_cap).
pub fn origin_visit_all(w: &World, mut cb: impl FnMut(i32, i32)) {
    for idx in 0..w.water.origins_cap as usize {
        let s = &w.water.origins[idx];
        if s.key_depth_plus_one == 0 || s.key_depth_plus_one == WATER_ORIGIN_TOMBSTONE {
            continue;
        }
        cb(s.key_tile as i32, s.key_depth_plus_one as i32 - 1);
    }
}

/// Port of `world_water_repair_missing_origins()`. One-shot
/// retroactive origin assignment for legacy flow cells whose state
/// byte says "flowing" but whose origin hashmap entry is empty.
/// Multi-pass BFS-style; safe to call repeatedly. Returns the count of
/// cells repaired this call.
pub fn repair_missing_origins(w: &mut World) -> i32 {
    let mut total_repaired = 0;
    /* Keep iterating until a full pass adds no new origins. An upper
     * bound of WORLD_MAX_DEPTH passes catches the worst case. */
    for _pass in 0..WORLD_MAX_DEPTH {
        let mut repaired_this_pass = 0;
        for ti in 0..w.tile_count {
            let t = match w.grid.tile(ti) {
                Some(t) => *t,
                None => continue,
            };
            for d in 0..WORLD_MAX_DEPTH {
                if w.blocks[cell_index(ti, d)] != Block::Water.raw() {
                    continue;
                }
                let s = get_state(w, ti, d);
                /* Skip non-flow cells: state==0 ocean, sources,
                 * falling water - none of these need origins. */
                if s == 0 {
                    continue;
                }
                if state_is_source(s) {
                    continue;
                }
                if state_is_falling(s) {
                    continue;
                }
                if state_level(s) <= 0 {
                    continue;
                }
                if origin_count(w, ti, d) > 0 {
                    continue;
                }

                /* Look for an in-plane neighbour that's either a spawn
                 * (state==0 OR SOURCE) or a flow cell that already has
                 * its own origins (repaired in an earlier pass). */
                let mut found = false;
                for k in 0..t.num_neighbors as usize {
                    if found {
                        break;
                    }
                    let nb = t.edge_neighbours[k];
                    if nb < 0 {
                        continue;
                    }
                    if w.blocks[cell_index(nb, d)] != Block::Water.raw() {
                        continue;
                    }
                    let ns = get_state(w, nb, d);
                    if ns == 0 || state_is_source(ns) {
                        /* Spawn neighbour: record IT as our origin. */
                        let r = OriginRef {
                            tile: nb as u32,
                            depth: d as u8,
                        };
                        origin_add(w, ti, d, r);
                        found = true;
                    } else if origin_count(w, nb, d) > 0 {
                        /* Flow neighbour with origins: inherit. */
                        let mut srcs = [OriginRef::default(); WATER_ORIGIN_MAX];
                        let n = origin_read(w, nb, d, Some(&mut srcs));
                        for oi in 0..n as usize {
                            origin_add(w, ti, d, srcs[oi]);
                        }
                        found = true;
                    }
                }
                if found {
                    repaired_this_pass += 1;
                    total_repaired += 1;
                }
            }
        }
        if repaired_this_pass == 0 {
            break;
        }
    }
    total_repaired
}

/// Port of `world_water_origin_apply_entry()`. Apply a single origin
/// entry on the client side: clears any prior origins on (tile, depth)
/// then re-adds from the entry so the local view exactly matches the
/// server's snapshot.
pub fn origin_apply_entry(w: &mut World, tile: i32, entry: &OriginDiffEntry) {
    if tile < 0 || (entry.depth as i32) >= WORLD_MAX_DEPTH {
        return;
    }
    origin_clear(w, tile, entry.depth as i32);
    let mut n = entry.origin_count as usize;
    if n > WATER_ORIGIN_MAX {
        n = WATER_ORIGIN_MAX;
    }
    for i in 0..n {
        let r = OriginRef {
            tile: entry.origin_tile[i],
            depth: entry.origin_depth[i],
        };
        origin_add(w, tile, entry.depth as i32, r);
    }
}

/// Port of `world_water_flow_direction()`. World-space flow direction
/// for the cell, pointing FROM the average origin position TOWARD the
/// cell. `out` is zeroed first; returns true iff a non-zero unit
/// direction was written.
pub fn flow_direction(w: &World, tile: i32, depth: i32, out: &mut [f32; 3]) -> bool {
    out[0] = 0.0;
    out[1] = 0.0;
    out[2] = 0.0;
    let mut origins = [OriginRef::default(); WATER_ORIGIN_MAX];
    let n = origin_read(w, tile, depth, Some(&mut origins));
    if n <= 0 {
        return false;
    }

    /* Cell world position = tile center * radius_at_depth. */
    let t = match w.grid.tile(tile) {
        Some(t) => t,
        None => return false,
    };
    let r_cell = w.depth_to_radius_m(depth);
    let cx = t.center.x * r_cell;
    let cy = t.center.y * r_cell;
    let cz = t.center.z * r_cell;

    /* Average origin position. Equal-weight as per user spec. */
    let mut ox = 0.0f64;
    let mut oy = 0.0f64;
    let mut oz = 0.0f64;
    let mut valid = 0;
    for origin in origins.iter().take(n as usize) {
        let ot = match w.grid.tile(origin.tile as i32) {
            Some(t) => t,
            None => continue,
        };
        let r_o = w.depth_to_radius_m(origin.depth as i32);
        ox += ot.center.x * r_o;
        oy += ot.center.y * r_o;
        oz += ot.center.z * r_o;
        valid += 1;
    }
    if valid == 0 {
        return false;
    }
    ox /= valid as f64;
    oy /= valid as f64;
    oz /= valid as f64;

    /* Direction = cell - origin_avg, normalized. */
    let dx = cx - ox;
    let dy = cy - oy;
    let dz = cz - oz;
    let len = (dx * dx + dy * dy + dz * dz).sqrt();
    if len < 1e-6 {
        return false;
    }
    out[0] = (dx / len) as f32;
    out[1] = (dy / len) as f32;
    out[2] = (dz / len) as f32;
    true
}

/* ---------------------------------------------------------------------
 * Per-cell state accessors.
 * ------------------------------------------------------------------- */

/// Port of `world_water_get_state()`. Out-of-range returns 0.
pub fn get_state(w: &World, tile: i32, depth: i32) -> u8 {
    if !cell_in_range(w, tile, depth) {
        return 0;
    }
    w.water.state[cell_index(tile, depth)]
}

/* Should this state change wake the per-frame persist flush? Falling
 * cells are reconstructible from neighbour state on reload, so the
 * YAML knob flow_persist_falling lets the operator opt out of
 * persisting them. A change that LEAVES a falling state still triggers
 * a flush; only "falling stays falling, just the level / supplier
 * shifted" is skipped. */
fn should_persist_state_change(old_state: u8, new_state: u8) -> bool {
    /* Always persist when leaving / entering the FALLING flag. */
    if (old_state & WATER_FLAG_FALLING) != (new_state & WATER_FLAG_FALLING) {
        return true;
    }
    /* Persist when the SOURCE flag toggles (promotion / demotion). */
    if (old_state & WATER_FLAG_SOURCE) != (new_state & WATER_FLAG_SOURCE) {
        return true;
    }
    /* Persist when going to/from "empty" (state 0). */
    if (old_state == 0) != (new_state == 0) {
        return true;
    }
    /* Past this point, both states have the same FALLING + SOURCE
     * flag. If they're falling and the knob says skip falling, no
     * flush. */
    if (new_state & WATER_FLAG_FALLING) != 0 && config::water_flow().persist_falling == 0 {
        return false;
    }
    /* Same flags, not falling-skipped: persist iff anything changed. */
    old_state != new_state
}

/// Port of `world_water_set_state()`. Out-of-range is a no-op.
pub fn set_state(w: &mut World, tile: i32, depth: i32, state: u8) {
    if !cell_in_range(w, tile, depth) {
        return;
    }
    let idx = cell_index(tile, depth);
    let old = w.water.state[idx];
    if old == state {
        return;
    }
    w.water.state[idx] = state;
    if should_persist_state_change(old, state) {
        w.water.persist_dirty[(tile >> 3) as usize] |= 1u8 << (tile & 7);
    }
}

/// Port of `world_water_clear_state()`.
pub fn clear_state(w: &mut World, tile: i32, depth: i32) {
    if !cell_in_range(w, tile, depth) {
        return;
    }
    let idx = cell_index(tile, depth);
    if w.water.state[idx] == 0 {
        return;
    }
    w.water.state[idx] = 0;
    /* Clearing always persists - we're saying "this column has a
     * cell that's now empty water-state, the disk copy needs to
     * agree." */
    w.water.persist_dirty[(tile >> 3) as usize] |= 1u8 << (tile & 7);
}

/// Port of `world_water_state_column()`. Read-only WORLD_MAX_DEPTH-byte
/// water-state column for a tile, or `None` (C NULL) out of range.
pub fn state_column(w: &World, tile: i32) -> Option<&[u8]> {
    if tile < 0 || tile >= w.tile_count {
        return None;
    }
    let base = (tile * WORLD_MAX_DEPTH) as usize;
    Some(&w.water.state[base..base + WORLD_MAX_DEPTH as usize])
}

/// Port of `world_water_load_state_column()`. Overwrite the water-state
/// column from `src` (must be at least WORLD_MAX_DEPTH bytes; the C
/// contract is exactly that size). Does NOT mark the column
/// persist-dirty - it just came off disk.
pub fn load_state_column(w: &mut World, tile: i32, src: &[u8]) {
    if tile < 0 || tile >= w.tile_count {
        return;
    }
    let base = (tile * WORLD_MAX_DEPTH) as usize;
    w.water.state[base..base + WORLD_MAX_DEPTH as usize]
        .copy_from_slice(&src[..WORLD_MAX_DEPTH as usize]);
    /* Load path: the column matches disk, no need to flush. Also
     * clear the persist-dirty bit if it was set incidentally. */
    w.water.persist_dirty[(tile >> 3) as usize] &= !(1u8 << (tile & 7));
}

/// Port of `world_water_drain_persist_dirty()`. Drain the
/// persist-dirty bitset into `out_tiles` (cap = slice length). Returns
/// the number of tile indices written; drained tiles are removed from
/// the bitset.
pub fn drain_persist_dirty(w: &mut World, out_tiles: &mut [i32]) -> i32 {
    let cap = out_tiles.len();
    if cap == 0 {
        return 0;
    }
    let mut count = 0usize;
    /* Scan byte-by-byte then bit-by-bit. */
    let bytes = w.water.persist_dirty.len();
    for byte in 0..bytes {
        if count >= cap {
            break;
        }
        let mut b = w.water.persist_dirty[byte];
        if b == 0 {
            continue;
        }
        for bit in 0..8 {
            if count >= cap {
                break;
            }
            if b & (1u8 << bit) == 0 {
                continue;
            }
            let tile = (byte * 8 + bit) as i32;
            if tile >= w.tile_count {
                break;
            }
            out_tiles[count] = tile;
            count += 1;
            b &= !(1u8 << bit);
        }
        w.water.persist_dirty[byte] = b;
    }
    count as i32
}

/* ---------------------------------------------------------------------
 * Scheduler.
 * ------------------------------------------------------------------- */

/// Port of `world_water_enqueue()`. Push (tile, depth) for the next
/// `step` call. Silent no-op if the cell is already scheduled or the
/// queue is at capacity.
pub fn enqueue(w: &mut World, tile: i32, depth: i32) {
    if !cell_in_range(w, tile, depth) {
        return;
    }
    let idx = cell_index(tile, depth);
    let ww = &mut w.water;
    if sched_bit_get(ww, idx) {
        return; /* already queued */
    }
    if ww.count >= ww.cap {
        return; /* drop on overflow */
    }
    let tail = ww.tail as usize;
    ww.queue[tail] = pack_cell(tile, depth);
    ww.tail = (ww.tail + 1) % ww.cap;
    ww.count += 1;
    sched_bit_set(ww, idx);
}

/// Port of `world_water_pending()`. Queue depth for diagnostics / tests.
pub fn pending(w: &World) -> i32 {
    w.water.count
}

/// Port of `world_water_notify_edit()`. Enqueues the edited cell plus
/// its 5/6 horizontal neighbours and (up to) two vertical neighbours.
/// Called automatically from `World::set`.
pub fn notify_edit(w: &mut World, tile: i32, depth: i32) {
    if !cell_in_range(w, tile, depth) {
        return;
    }
    /* The edited cell itself - it may have just become water or just
     * lost water; either way the tick rule needs to re-derive. */
    enqueue(w, tile, depth);
    /* Vertical neighbours. */
    if depth + 1 < WORLD_MAX_DEPTH {
        enqueue(w, tile, depth + 1);
    }
    if depth - 1 >= 0 {
        enqueue(w, tile, depth - 1);
    }
    /* Horizontal: every 5/6 edge-neighbour at the same depth. */
    let t = match w.grid.tile(tile) {
        Some(t) => *t,
        None => return,
    };
    for k in 0..t.num_neighbors as usize {
        let nb = t.edge_neighbours[k];
        if nb >= 0 {
            enqueue(w, nb, depth);
        }
    }
}

/* ---------------------------------------------------------------------
 * Flow rule helpers. Section numbers refer to tenebris-c/water.md.
 * ------------------------------------------------------------------- */

/* True when (tile, depth) is "passable" for the BFS pathfinder used by
 * choose_horizontal_targets. */
fn is_passable_for_search(w: &World, tile: i32, depth: i32) -> bool {
    if !cell_in_range(w, tile, depth) {
        return false;
    }
    let b = w.get(tile, depth);
    if b == Block::Air {
        return true;
    }
    if b != Block::Water {
        return false;
    }
    let s = get_state(w, tile, depth);
    if state_is_source(s) {
        return false;
    }
    if s == 0 {
        return false; /* sleeping ocean = wall */
    }
    if state_is_falling(s) {
        return false;
    }
    true
}

/* True if this cell has a "downward hole" - depth-1 is air or non-
 * source water. */
fn cell_has_drop(w: &World, tile: i32, depth: i32) -> bool {
    if depth - 1 < 0 {
        return false;
    }
    let below = w.get(tile, depth - 1);
    if below == Block::Air {
        return true;
    }
    if below != Block::Water {
        return false;
    }
    let s = get_state(w, tile, depth - 1);
    /* Drop into a source / sleeping ocean cell doesn't count: water
     * can't displace it. */
    !state_is_source(s) && s != 0
}

/* BFS the hex grid out from (start_tile, depth) up to `max_radius`
 * steps, return the smallest step count at which we find a cell with
 * a downward hole. Returns max_radius+1 if none found. */
fn bfs_distance_to_hole(w: &World, start_tile: i32, depth: i32, max_radius: i32) -> i32 {
    if !is_passable_for_search(w, start_tile, depth) {
        return max_radius + 1;
    }
    let mut visited = [0i32; BFS_MAX_VISITED];
    let mut visited_n = 0usize;
    let mut frontier = [0i32; BFS_MAX_FRONTIER];
    let mut frontier_next = [0i32; BFS_MAX_FRONTIER];
    let mut fcount = 0usize;

    visited[visited_n] = start_tile;
    visited_n += 1;
    frontier[fcount] = start_tile;
    fcount += 1;

    for step in 1..=max_radius {
        let mut fnn = 0usize;
        for i in 0..fcount {
            let cur = frontier[i];
            if cell_has_drop(w, cur, depth) {
                return step;
            }
            let t = match w.grid.tile(cur) {
                Some(t) => t,
                None => continue,
            };
            for k in 0..t.num_neighbors as usize {
                let nb = t.edge_neighbours[k];
                if nb < 0 {
                    continue;
                }
                if !is_passable_for_search(w, nb, depth) {
                    continue;
                }
                /* Linear "seen?" check - visited_n is small. */
                let mut seen = false;
                for &v in visited.iter().take(visited_n) {
                    if v == nb {
                        seen = true;
                        break;
                    }
                }
                if seen {
                    continue;
                }
                if visited_n >= BFS_MAX_VISITED {
                    continue;
                }
                if fnn >= BFS_MAX_FRONTIER {
                    continue;
                }
                visited[visited_n] = nb;
                visited_n += 1;
                frontier_next[fnn] = nb;
                fnn += 1;
            }
        }
        frontier[..fnn].copy_from_slice(&frontier_next[..fnn]);
        fcount = fnn;
    }
    max_radius + 1
}

/* Pick the set of horizontal neighbours we want to spread into.
 * Section 5 step 3b + the pathfinding tie-break. Writes up to
 * out.len() chosen neighbour tile indices, returns how many. */
fn choose_horizontal_targets(
    w: &World,
    tile: i32,
    depth: i32,
    allow_blind_spread: bool,
    out: &mut [i32],
) -> usize {
    let t = match w.grid.tile(tile) {
        Some(t) => *t,
        None => return 0,
    };
    if out.is_empty() {
        return 0;
    }
    let n = t.num_neighbors as usize;
    /* search_radius is a runtime knob - clamped down so a pathological
     * YAML value can't blow the stack-allocated BFS arrays. */
    let mut radius = config::water_flow().search_radius;
    if radius < 1 {
        radius = 1;
    }
    if radius > BFS_MAX_FRONTIER as i32 {
        radius = BFS_MAX_FRONTIER as i32;
    }

    let mut dist = [0i32; goldberg::MAX_NEIGHBORS];
    let mut min_dist = radius + 1;
    for k in 0..n {
        let nb = t.edge_neighbours[k];
        if nb < 0 || !is_passable_for_search(w, nb, depth) {
            dist[k] = i32::MAX;
            continue;
        }
        dist[k] = bfs_distance_to_hole(w, nb, depth, radius);
        if dist[k] < min_dist {
            min_dist = dist[k];
        }
    }

    let mut count = 0usize;
    /* No direction found a hole within range: the blind "spread to all
     * passable" fallback is gated on the caller - see the C comment.
     * Sources / sleeping ocean stop unless they actually find a hole
     * to drain into. */
    if min_dist > radius {
        if !allow_blind_spread {
            return 0;
        }
        for k in 0..n {
            if count >= out.len() {
                break;
            }
            let nb = t.edge_neighbours[k];
            if nb >= 0 && is_passable_for_search(w, nb, depth) {
                out[count] = nb;
                count += 1;
            }
        }
        return count;
    }
    /* Otherwise: ties win. Spread to every direction at min_dist. */
    for k in 0..n {
        if count >= out.len() {
            break;
        }
        if dist[k] == min_dist {
            out[count] = t.edge_neighbours[k];
            count += 1;
        }
    }
    count
}

/* Wake everything around (tile, depth) - the 6/5 horizontal neighbours
 * at the same depth, plus up and down in the same column. */
fn schedule_neighbours(w: &mut World, tile: i32, depth: i32) {
    if depth + 1 < WORLD_MAX_DEPTH {
        enqueue(w, tile, depth + 1);
    }
    if depth - 1 >= 0 {
        enqueue(w, tile, depth - 1);
    }
    let t = match w.grid.tile(tile) {
        Some(t) => *t,
        None => return,
    };
    for k in 0..t.num_neighbors as usize {
        let nb = t.edge_neighbours[k];
        if nb >= 0 {
            enqueue(w, nb, depth);
        }
    }
}

/* Section 6: a flowing cell promotes to source when it has at least
 * source_min_nbrs horizontal source-block neighbours at the same
 * depth, AND a solid floor (or another source) directly below. */
fn should_promote_to_source(w: &World, tile: i32, depth: i32) -> bool {
    /* Floor check first - cheap, and the common case (mid-air flowing
     * water) bails immediately. */
    if depth - 1 < 0 {
        return false;
    }
    let below = w.get(tile, depth - 1);
    let mut floor_ok = blocks::covers_face(below);
    if !floor_ok && below == Block::Water {
        let bs = get_state(w, tile, depth - 1);
        floor_ok = state_is_source(bs) || bs == 0;
    }
    if !floor_ok {
        return false;
    }

    let t = match w.grid.tile(tile) {
        Some(t) => t,
        None => return false,
    };
    /* 2-of-N threshold is a YAML knob. Floor at 1 so a misconfigured
     * value can't make every flowing cell instantly promote. */
    let mut threshold = config::water_flow().source_min_nbrs;
    if threshold < 1 {
        threshold = 1;
    }
    let mut sources = 0;
    for k in 0..t.num_neighbors as usize {
        let nb = t.edge_neighbours[k];
        if nb < 0 {
            continue;
        }
        if w.get(nb, depth) != Block::Water {
            continue;
        }
        let ns = get_state(w, nb, depth);
        /* "Ocean block" per the unified model is anything the
         * simulator currently treats as a spawn: either the SOURCE
         * flag is set explicitly, or state==0 (worldgen ocean /
         * sleeping spawn). Both count toward the promote threshold. */
        if state_is_source(ns) || ns == 0 {
            sources += 1;
            if sources >= threshold {
                return true;
            }
        }
    }
    false
}

/* Section 5 rule 3a + 3b: try to spread water from (tile, depth) at
 * the given "own" level. Down first; horizontal spread either replaces
 * or complements it depending on the caller - see the C comments for
 * the full also_spread / allow_blind_spread contract. */
fn try_propagate(
    w: &mut World,
    tile: i32,
    depth: i32,
    own_level: i32,
    also_spread: bool,
    allow_blind_spread: bool,
) {
    /* 3a. Down: if depth-1 is air or non-source water, place a falling
     *     cell there. */
    let below = depth - 1;
    if below >= 0 {
        let b = w.get(tile, below);
        let mut can_fall = false;
        if b == Block::Air {
            can_fall = true;
        } else if b == Block::Water {
            let bs = get_state(w, tile, below);
            /* Don't overwrite sources, sleeping ocean, or cells already
             * marked as falling (no change needed). */
            can_fall = !state_is_source(bs) && bs != 0 && !state_is_falling(bs);
        }
        if can_fall {
            let new_state = state_pack(false, true, 0);
            let old_state = get_state(w, tile, below);
            if b != Block::Water {
                w.set(tile, below, Block::Water);
            }
            if new_state != old_state {
                set_state(w, tile, below, new_state);
            }
            enqueue(w, tile, below);
            if !also_spread {
                return;
            }
        }
    }

    /* 3b. Horizontal: only if we have level budget left. */
    let mut max_level = config::water_flow().max_level;
    if max_level < 0 {
        max_level = 0;
    }
    if max_level > WATER_LEVEL_MAX {
        max_level = WATER_LEVEL_MAX;
    }
    if own_level >= max_level {
        return;
    }
    let mut targets = [0i32; goldberg::MAX_NEIGHBORS];
    let n = choose_horizontal_targets(w, tile, depth, allow_blind_spread, &mut targets);
    let new_level = own_level + 1;
    for &nb in targets.iter().take(n) {
        /* Cascade: prefer placing one voxel LOWER than us so the bell
         * literally stair-steps down as it spreads outward. Hard
         * requirement: cascade ONLY when nb's same-depth cell is also
         * air/water - see the C comment for the tunnelling bug this
         * guards against. */
        let mut target_depth = depth;
        if depth - 1 >= 0 {
            let b_same = w.get(nb, depth);
            let b_below = w.get(nb, depth - 1);
            let same_ok = b_same == Block::Air || b_same == Block::Water;
            let below_ok = b_below == Block::Air || b_below == Block::Water;
            if same_ok && below_ok {
                target_depth = depth - 1;
            }
        }

        let b = w.get(nb, target_depth);
        if b != Block::Air && b != Block::Water {
            continue;
        }
        if b == Block::Water {
            let ns = get_state(w, nb, target_depth);
            /* Never overwrite source / sleeping / falling, and don't
             * re-write a cell already at-or-better than what we'd
             * give it. */
            if state_is_source(ns) || ns == 0 {
                continue;
            }
            if state_is_falling(ns) {
                continue;
            }
            if state_level(ns) <= new_level {
                continue;
            }
        } else {
            w.set(nb, target_depth, Block::Water);
        }
        set_state(w, nb, target_depth, state_pack(false, false, new_level));
        enqueue(w, nb, target_depth);

        /* Propagate origin lineage. The spreader is a spawn point if
         * it has the SOURCE flag explicitly OR if its state byte is
         * still the worldgen sentinel (state==0) - record OURSELVES as
         * the origin on the new flow cell. Otherwise copy OUR origin
         * list onto the new cell so the lineage chain stays intact. */
        let own_state = get_state(w, tile, depth);
        if state_is_source(own_state) || own_state == 0 {
            let me = OriginRef {
                tile: tile as u32,
                depth: depth as u8,
            };
            origin_add(w, nb, target_depth, me);
        } else {
            let mut srcs = [OriginRef::default(); WATER_ORIGIN_MAX];
            let cnt = origin_read(w, tile, depth, Some(&mut srcs));
            for oi in 0..cnt as usize {
                origin_add(w, nb, target_depth, srcs[oi]);
            }
        }
    }
}

/* The per-cell tick. Section 5 of water.md, end-to-end. */
fn tick_cell(w: &mut World, tile: i32, depth: i32) {
    if !cell_in_range(w, tile, depth) {
        return;
    }

    /* Effective spread-distance cap. YAML can set this lower than the
     * bit-field's hard ceiling (7); values outside [0, WATER_LEVEL_MAX]
     * are clamped so a hostile config can't break the state byte
     * invariant. */
    let mut max_level = config::water_flow().max_level;
    if max_level < 0 {
        max_level = 0;
    }
    if max_level > WATER_LEVEL_MAX {
        max_level = WATER_LEVEL_MAX;
    }

    let blk = w.get(tile, depth);
    if blk != Block::Water {
        /* Cell drained between scheduling and firing - clear any
         * leftover state byte so it doesn't masquerade as something
         * else next tick. */
        clear_state(w, tile, depth);
        return;
    }

    let s_before = get_state(w, tile, depth);

    /* Sources never decay; just try to spread. Blind spread is gated
     * off for sources - a player-placed source on flat terrain stays a
     * 1-cell water block instead of flooding. */
    if state_is_source(s_before) {
        try_propagate(w, tile, depth, 0, false, false);
        return;
    }

    /* Legacy / sleeping ocean cell. Same pressure rule as sources. */
    if s_before == 0 {
        try_propagate(w, tile, depth, 0, false, false);
        return;
    }

    /* ---- Rule 2: re-derive own level. */
    let mut supplier_level = i32::MAX;
    let mut falling = false;

    /* Vertical supply: a water cell directly above feeds this one at
     * full strength. The FALLING flag latches on only if we can
     * actually keep falling - see the C comment for the landed-cell
     * transition this implements. */
    if depth + 1 < WORLD_MAX_DEPTH && w.get(tile, depth + 1) == Block::Water {
        supplier_level = 0;
        let mut can_keep_falling = false;
        if depth - 1 >= 0 {
            let b_below = w.get(tile, depth - 1);
            if b_below == Block::Air {
                can_keep_falling = true;
            } else if b_below == Block::Water {
                let bs = get_state(w, tile, depth - 1);
                /* Air-equivalent below: flowing / falling water that we
                 * can overwrite as we fall through. Source / sleeping
                 * water acts as a floor (we've landed in the pool). */
                can_keep_falling = !state_is_source(bs) && bs != 0;
            }
        }
        falling = can_keep_falling;
    } else if let Some(t) = w.grid.tile(tile) {
        for k in 0..t.num_neighbors as usize {
            let nb = t.edge_neighbours[k];
            if nb < 0 {
                continue;
            }
            if w.get(nb, depth) != Block::Water {
                continue;
            }
            let ns = get_state(w, nb, depth);
            /* Falling water doesn't feed sideways - it has to land
             * before it counts as a supplier. */
            if state_is_falling(ns) {
                continue;
            }
            let n_lvl = if state_is_source(ns) || ns == 0 {
                0
            } else {
                state_level(ns)
            };
            let candidate = n_lvl + 1;
            if candidate < supplier_level {
                supplier_level = candidate;
            }
        }
    }

    /* No supplier in range -> dry up. */
    if supplier_level > max_level {
        w.set(tile, depth, Block::Air);
        clear_state(w, tile, depth);
        schedule_neighbours(w, tile, depth);
        return;
    }

    /* Promotion check (section 6). Only horizontally-supplied cells can
     * promote - a falling stream is not a source candidate. */
    if !falling && should_promote_to_source(w, tile, depth) {
        let s_after = state_pack(true, false, 0);
        if s_after != s_before {
            set_state(w, tile, depth, s_after);
            schedule_neighbours(w, tile, depth);
        }
        try_propagate(w, tile, depth, 0, false, false);
        return;
    }

    let s_after = state_pack(false, falling, supplier_level);

    /* Falling cells fall AND creep outward (bell-shape waterfall);
     * non-falling cells stick to the classic fall-OR-spread rule. */
    let also_spread = falling;

    if s_after == s_before {
        /* Hot-tile guard: no observable change, no neighbour wakeup.
         * We still try to spread once - a neighbour may have just
         * opened up - but we don't re-schedule the unchanged cell's
         * neighbours. */
        try_propagate(w, tile, depth, supplier_level, also_spread, true);
        return;
    }

    set_state(w, tile, depth, s_after);
    /* Level dropped or rose - either way, neighbours need to
     * re-derive. */
    schedule_neighbours(w, tile, depth);
    try_propagate(w, tile, depth, supplier_level, also_spread, true);
}

/// Port of `world_water_step()`. Pop up to `max_ticks` cells and run
/// the flow rule on each. Returns the number of cells actually ticked.
pub fn step(w: &mut World, max_ticks: i32) -> i32 {
    if max_ticks <= 0 {
        return 0;
    }
    let mut done = 0;
    while done < max_ticks && w.water.count > 0 {
        let packed = w.water.queue[w.water.head as usize];
        w.water.head = (w.water.head + 1) % w.water.cap;
        w.water.count -= 1;

        let (tile, depth) = unpack_cell(packed);
        let idx = cell_index(tile, depth);
        sched_bit_clear(&mut w.water, idx);

        tick_cell(w, tile, depth);
        done += 1;
    }
    done
}

/* ----------------------------------------------------------------------- */

#[cfg(test)]
mod tests {
    use super::*;
    use crate::planet::{self, BodyId};

    /* All concrete pins below were generated by compiling
     * tenebris-c/src/core/{world,world_water,world_light,goldberg,
     * planet,planet_gen,blocks,config,math,rng}.c with gcc 13.2 -O2
     * and printing FNV-1a-64 hashes, %.17g floats and raw values from
     * a harness (target/c-harness/water_harness.c). Compiled-in config
     * defaults are in effect on both sides. Unlike the world.rs pins,
     * these run against the REAL world_water.c. */

    fn fnv1a64(p: &[u8]) -> u64 {
        let mut h = 14695981039346656037u64;
        for &b in p {
            h ^= b as u64;
            h = h.wrapping_mul(1099511628211);
        }
        h
    }

    fn hash_water_state(w: &World) -> u64 {
        /* Hash via the public column accessor - same bytes as the raw
         * array, and exercises state_column on the way. */
        let mut h = 14695981039346656037u64;
        for t in 0..w.tile_count {
            for &b in state_column(w, t).unwrap() {
                h ^= b as u64;
                h = h.wrapping_mul(1099511628211);
            }
        }
        h
    }

    fn hash_blocks(w: &World) -> u64 {
        fnv1a64(&w.blocks)
    }

    fn tenebris_world() -> World {
        let body = planet::get(BodyId::Tenebris);
        let mut w = World::create(&body, 3);
        while !w.gen_complete() {
            w.stream_gen(100);
        }
        w
    }

    fn rf(tile: u32, depth: u8) -> OriginRef {
        OriginRef { tile, depth }
    }

    /* One sim iteration: step(64) then snapshot. Matches the C
     * harness's sim_loop. */
    fn sim_iter(w: &mut World) -> (i32, i32, u64, u64) {
        let td = step(w, 64);
        (td, pending(w), hash_water_state(w), hash_blocks(w))
    }

    /* The whole C harness runs as ONE sequence (later scenarios see the
     * state earlier ones left behind), so the Rust port replicates it
     * as a single test fn. */
    #[test]
    fn pin_water_sim_against_c() {
        let mut w = tenebris_world();

        /* The config globals are process-wide, and config::tests parse
         * YAML overrides into them while this suite runs in parallel -
         * water_overrides_both_configs_and_keeps_defaults leaves
         * flow_max_level=5 behind (whichever config test serialises
         * last wins), which would change the sim trajectory below.
         * Re-pin the sim-relevant flow knobs to the compiled defaults
         * the C harness ran with; by this point (full worldgen above)
         * the much shorter config tests have finished in practice.
         * flow_queue_capacity is read at World::create time but no
         * test in the suite ever changes it, so the queue above is
         * already sized at the default. */
        let reset = "water:\n  flow_max_level: 3\n  flow_search_radius: 4\n  \
                     flow_source_min_nbrs: 2\n  flow_persist_falling: 0\n";
        assert_eq!(config::parse_water(reset, "water-pin-reset.yaml"), 0);

        /* ---- A: accessors + persist-dirty bitset ---- */
        assert_eq!(pending(&w), 0);
        assert_eq!(get_state(&w, 2, 62), 0);
        set_state(&mut w, 5, 70, state_pack(false, false, 2));
        assert_eq!(get_state(&w, 5, 70), 2);
        set_state(&mut w, 5, 70, 0x40); /* enter falling: persists    */
        set_state(&mut w, 5, 70, 0x41); /* falling lvl shift: skipped */
        let mut tiles = [0i32; 16];
        let n = drain_persist_dirty(&mut w, &mut tiles);
        assert_eq!((n, tiles[0]), (1, 5));
        assert_eq!(drain_persist_dirty(&mut w, &mut tiles), 0);
        set_state(&mut w, 6, 10, 0x07);
        clear_state(&mut w, 5, 70);
        let n = drain_persist_dirty(&mut w, &mut tiles);
        assert_eq!((n, tiles[0], tiles[1]), (2, 5, 6));
        let mut colbuf = [0u8; WORLD_MAX_DEPTH as usize];
        for (d, b) in colbuf.iter_mut().enumerate() {
            *b = (d * 3) as u8;
        }
        load_state_column(&mut w, 7, &colbuf);
        assert_eq!(get_state(&w, 7, 10), 30);
        assert_eq!(drain_persist_dirty(&mut w, &mut tiles), 0);
        assert_eq!(hash_water_state(&w), 6309559533404631482);
        /* Step on a non-water cell clears its (loaded) state byte. */
        enqueue(&mut w, 7, 10);
        assert_eq!(pending(&w), 1);
        assert_eq!(step(&mut w, 8), 1);
        assert_eq!(get_state(&w, 7, 10), 0);
        assert_eq!(pending(&w), 0);

        /* ---- B: origin hash table ---- */
        assert!(origin_add(&mut w, 10, 60, rf(11, 60)));
        assert!(origin_add(&mut w, 10, 60, rf(11, 60))); /* idempotent */
        assert!(origin_add(&mut w, 10, 60, rf(12, 60)));
        assert!(origin_add(&mut w, 10, 60, rf(13, 60)));
        assert!(!origin_add(&mut w, 10, 60, rf(14, 60))); /* 4th drops  */
        assert_eq!(origin_count(&w, 10, 60), 3);
        let mut out3 = [OriginRef::default(); WATER_ORIGIN_MAX];
        let n = origin_read(&w, 10, 60, Some(&mut out3));
        assert_eq!(n, 3);
        assert_eq!(out3, [rf(11, 60), rf(12, 60), rf(13, 60)]);
        let mut ents = [OriginDiffEntry::default(); 8];
        let n = origin_enum_tile(&w, 10, &mut ents);
        assert_eq!(n, 1);
        assert_eq!(ents[0].depth, 60);
        assert_eq!(ents[0].origin_count, 3);
        assert_eq!(ents[0].origin_tile, [11, 12, 13]);
        let mut dir = [0f32; 3];
        assert!(flow_direction(&w, 10, 60, &mut dir));
        assert_eq!(dir[0], -0.1173066720366478);
        assert_eq!(dir[1], -0.24192407727241516);
        assert_eq!(dir[2], -0.96317803859710693);
        origin_remove(&mut w, 10, 60, rf(12, 60));
        let n = origin_read(&w, 10, 60, Some(&mut out3));
        assert_eq!(n, 2);
        assert_eq!(&out3[..2], &[rf(11, 60), rf(13, 60)]);
        origin_add(&mut w, 10, 61, rf(11, 60));
        origin_add(&mut w, 20, 60, rf(11, 60));
        origin_add(&mut w, 20, 60, rf(13, 60));
        {
            /* visit_all order pin: fnv over (tile LE32, depth u8). */
            let mut vh = 14695981039346656037u64;
            origin_visit_all(&w, |tile, depth| {
                let mut bytes = [0u8; 5];
                bytes[..4].copy_from_slice(&(tile as u32).to_le_bytes());
                bytes[4] = depth as u8;
                for &b in &bytes {
                    vh ^= b as u64;
                    vh = vh.wrapping_mul(1099511628211);
                }
            });
            assert_eq!(vh, 13228156124487327604);
        }
        origin_remove_global(&mut w, rf(11, 60));
        assert_eq!(origin_count(&w, 10, 60), 1);
        assert_eq!(origin_count(&w, 10, 61), 0); /* emptied + removed  */
        assert_eq!(origin_count(&w, 20, 60), 1);
        assert_eq!(pending(&w), 1); /* (10,61) re-enqueued */
        let entry = OriginDiffEntry {
            depth: 61,
            origin_count: 2,
            origin_tile: [30, 31, 0],
            origin_depth: [60, 60, 0],
        };
        origin_apply_entry(&mut w, 10, &entry);
        let n = origin_read(&w, 10, 61, Some(&mut out3));
        assert_eq!(n, 2);
        assert_eq!(&out3[..2], &[rf(30, 60), rf(31, 60)]);
        origin_clear(&mut w, 10, 60);
        assert_eq!(origin_count(&w, 10, 60), 0);

        /* ---- C: repair_missing_origins on a hand-built flow cell ---- */
        set_state(&mut w, 2, 62, state_pack(false, false, 1));
        assert_eq!(repair_missing_origins(&mut w), 1);
        let n = origin_read(&w, 2, 62, Some(&mut out3));
        assert_eq!(n, 1);
        assert_eq!(out3[0], rf(485, 62));
        assert_eq!(repair_missing_origins(&mut w), 0);

        /* ---- D: sim - source placed on flat land (tile 100, d 64) ---- */
        assert_eq!(step(&mut w, 100000), 1); /* settle the queue */
        w.set(100, 64, Block::Water);
        set_state(&mut w, 100, 64, state_pack(true, false, 0));
        /* 9 = cell + up + down + 6 neighbours; pins the World::set
         * water-branch + notify_edit wiring. */
        assert_eq!(pending(&w), 9);
        /* Flat plateau, no hole within search_radius, blind spread
         * gated off for sources: the source stays a 1-cell block. */
        const D: [(i32, i32, u64, u64); 24] = [
            (9, 0, 5018811919357720025, 15547767791733597371),
            (0, 0, 5018811919357720025, 15547767791733597371),
            (0, 0, 5018811919357720025, 15547767791733597371),
            (0, 0, 5018811919357720025, 15547767791733597371),
            (0, 0, 5018811919357720025, 15547767791733597371),
            (0, 0, 5018811919357720025, 15547767791733597371),
            (0, 0, 5018811919357720025, 15547767791733597371),
            (0, 0, 5018811919357720025, 15547767791733597371),
            (0, 0, 5018811919357720025, 15547767791733597371),
            (0, 0, 5018811919357720025, 15547767791733597371),
            (0, 0, 5018811919357720025, 15547767791733597371),
            (0, 0, 5018811919357720025, 15547767791733597371),
            (0, 0, 5018811919357720025, 15547767791733597371),
            (0, 0, 5018811919357720025, 15547767791733597371),
            (0, 0, 5018811919357720025, 15547767791733597371),
            (0, 0, 5018811919357720025, 15547767791733597371),
            (0, 0, 5018811919357720025, 15547767791733597371),
            (0, 0, 5018811919357720025, 15547767791733597371),
            (0, 0, 5018811919357720025, 15547767791733597371),
            (0, 0, 5018811919357720025, 15547767791733597371),
            (0, 0, 5018811919357720025, 15547767791733597371),
            (0, 0, 5018811919357720025, 15547767791733597371),
            (0, 0, 5018811919357720025, 15547767791733597371),
            (0, 0, 5018811919357720025, 15547767791733597371),
        ];
        for (i, want) in D.iter().enumerate() {
            assert_eq!(sim_iter(&mut w), *want, "d iter {}", i);
        }
        /* Kill the source - the WATER-leaving branch in World::set must
         * clear the state byte + drop origins (blocks return to the
         * worldgen baseline hash). */
        w.set(100, 64, Block::Air);
        assert_eq!(pending(&w), 9);
        const DK: (i32, i32, u64, u64) = (9, 0, 8318348428758398297, 11545374911774499490);
        assert_eq!(sim_iter(&mut w), DK, "dk iter 0");
        for i in 1..24 {
            assert_eq!(sim_iter(&mut w), (0, DK.1, DK.2, DK.3), "dk iter {}", i);
        }

        /* ---- E: waterfall - source in mid-air above tile 200 ---- */
        let mut top200 = -1;
        for d in (0..WORLD_MAX_DEPTH).rev() {
            let b = w.blocks[cell_index(200, d)];
            if b != Block::Air.raw() && b != Block::Water.raw() {
                top200 = d;
                break;
            }
        }
        assert_eq!(top200, 69);
        w.set(200, top200 + 6, Block::Water);
        set_state(&mut w, 200, top200 + 6, state_pack(true, false, 0));
        const E: [(i32, i32, u64, u64); 40] = [
            (64, 85, 16663671668543335609, 3385503594300472631),
            (64, 102, 16132948388245497039, 5885204280962808957),
            (64, 144, 7193915880590245947, 17436245221321821243),
            (64, 194, 9588246836838985532, 2648504736549959807),
            (64, 201, 16600503237339584920, 3774822049896317119),
            (64, 180, 13632010486670364984, 13600479180366241089),
            (64, 222, 906659627078606673, 17719053726878665471),
            (64, 211, 17274690271582985328, 12008450315965775781),
            (64, 201, 12544831139566324572, 16969253343149184040),
            (64, 198, 9332298686506165150, 6493317819493290888),
            (64, 187, 12901127585912818528, 2809980514575081111),
            (64, 186, 11674204100691883139, 4987014287127823967),
            (64, 180, 6715531371715782255, 733229281878567441),
            (64, 205, 13953877710793295277, 6691007253258141460),
            (64, 208, 785383720014484354, 3276576095461186406),
            (64, 192, 6990541326819547405, 2038563391409019359),
            (64, 185, 13683604694275417065, 7985035572067294508),
            (64, 209, 11082782506282515561, 13059439374186537684),
            (64, 195, 12535890505608707522, 13426467015881383069),
            (64, 194, 9095650574530170790, 6946935567210424105),
            (64, 193, 7070578155863393738, 5274254580147654516),
            (64, 173, 6437937297658224612, 14988529502705998592),
            (64, 166, 204705820281489952, 10753010186008843428),
            (64, 178, 3822063948472830330, 4626427692199129005),
            (64, 171, 2428885319163123216, 10926376814963931105),
            (64, 169, 7725308402496414854, 2441071790190865239),
            (64, 148, 8461558692536443130, 6247529773355831273),
            (64, 187, 148994203277458945, 1177162820754371681),
            (64, 193, 11260557558602793208, 1670322818834429885),
            (64, 165, 7135028188076561111, 16515434523938075575),
            (64, 197, 13797254075030679913, 705575199448147239),
            (64, 180, 6808630541772044642, 3819932982129661639),
            (64, 155, 6728807489240182149, 7937797972583687169),
            (64, 144, 6956770185935843593, 3069955513179728175),
            (64, 124, 10549850769354142249, 11159993733198842380),
            (64, 111, 7517841865201069058, 8015548185285263138),
            (64, 86, 14172868765269635354, 14587716575833668338),
            (64, 71, 5152139505392576139, 13604538705420443449),
            (64, 27, 7998812858920314431, 14246600527624800599),
            (64, 10, 13879212952481025848, 14762448047325042573),
        ];
        for (i, want) in E.iter().enumerate() {
            assert_eq!(sim_iter(&mut w), *want, "e iter {}", i);
        }
        /* First sim-created flow cell with origins (tile-asc,
         * depth-asc; skipping the hand-built B/C cells). */
        let mut ft = -1;
        let mut fd = -1;
        'outer: for t in 0..w.tile_count {
            for d in 0..WORLD_MAX_DEPTH {
                if origin_count(&w, t, d) > 0 && !(t == 10 || t == 20 || t == 2) {
                    ft = t;
                    fd = d;
                    break 'outer;
                }
            }
        }
        assert_eq!((ft, fd), (5, 73));
        assert_eq!(origin_count(&w, ft, fd), 1);
        assert!(flow_direction(&w, ft, fd, &mut dir));
        assert_eq!(dir[0], 0.0);
        assert_eq!(dir[1], -0.80323183536529541);
        assert_eq!(dir[2], 0.59566652774810791);

        /* ---- F: dig out the seafloor under the ocean column ---- */
        assert_eq!(w.get(2, 60), Block::Sand); /* C harness: block id 2 */
        w.set(2, 60, Block::Air);
        assert_eq!(pending(&w), 18);
        const F0: (i32, i32, u64, u64) = (64, 26, 1784133083021052909, 560636605684138406);
        const F1: (i32, i32, u64, u64) = (37, 0, 11776606882162472941, 560636605684138406);
        assert_eq!(sim_iter(&mut w), F0, "f iter 0");
        assert_eq!(sim_iter(&mut w), F1, "f iter 1");
        for i in 2..24 {
            assert_eq!(sim_iter(&mut w), (0, F1.1, F1.2, F1.3), "f iter {}", i);
        }

        /* ---- G: kill the waterfall source - origin death + dry-up ---- */
        w.set(200, top200 + 6, Block::Air);
        assert_eq!(pending(&w), 32);
        const G0: (i32, i32, u64, u64) = (32, 0, 2232789589425526125, 17522763457449220833);
        assert_eq!(sim_iter(&mut w), G0, "g iter 0");
        for i in 1..40 {
            assert_eq!(sim_iter(&mut w), (0, G0.1, G0.2, G0.3), "g iter {}", i);
        }

        assert_eq!(hash_water_state(&w), 2232789589425526125);
        assert_eq!(hash_blocks(&w), 17522763457449220833);
        assert_eq!(pending(&w), 0);
    }

    #[test]
    fn state_helpers_and_pack() {
        assert!(state_is_source(0x80));
        assert!(!state_is_source(0x40));
        assert!(state_is_falling(0x40));
        assert!(!state_is_falling(0x80));
        assert_eq!(state_level(0x47), 7);
        assert_eq!(state_level(0x80), 0);
        assert_eq!(state_pack(true, false, 0), 0x80);
        assert_eq!(state_pack(false, true, 0), 0x40);
        assert_eq!(state_pack(false, false, 5), 0x05);
        assert_eq!(state_pack(true, true, 7), 0xC7);
        /* Level masks to 3 bits like the C (level & WATER_LEVEL_MASK). */
        assert_eq!(state_pack(false, false, 9), 0x01);
    }

    #[test]
    fn out_of_range_accessors_noop() {
        let body = planet::get(BodyId::Tenebris);
        let mut w = World::create(&body, 3); /* ungenerated is fine */
        assert_eq!(get_state(&w, -1, 0), 0);
        assert_eq!(get_state(&w, 0, -1), 0);
        assert_eq!(get_state(&w, 0, WORLD_MAX_DEPTH), 0);
        assert_eq!(get_state(&w, w.tile_count, 0), 0);
        set_state(&mut w, -1, 0, 0xFF);
        clear_state(&mut w, -1, 0);
        enqueue(&mut w, -1, 0);
        enqueue(&mut w, 0, 128);
        notify_edit(&mut w, -1, 0);
        assert_eq!(pending(&w), 0);
        assert_eq!(step(&mut w, 10), 0);
        assert_eq!(step(&mut w, 0), 0);
        assert!(state_column(&w, -1).is_none());
        assert!(state_column(&w, w.tile_count).is_none());
        assert!(state_column(&w, 0).is_some());
        assert!(!origin_add(&mut w, -1, 0, OriginRef::default()));
        assert!(!origin_add(&mut w, 0, 128, OriginRef::default()));
        assert_eq!(origin_count(&w, -1, 0), 0);
        let mut dir = [1.0f32; 3];
        assert!(!flow_direction(&w, 0, 0, &mut dir));
        assert_eq!(dir, [0.0, 0.0, 0.0]); /* out zeroed on failure */
        let mut tiles = [0i32; 4];
        assert_eq!(drain_persist_dirty(&mut w, &mut tiles), 0);
        assert_eq!(drain_persist_dirty(&mut w, &mut []), 0);
    }

    #[test]
    fn clone_into_copies_state_resets_queue() {
        /* Body whose tile count survives world_clone's re-derived
         * subdivision count (the only defined-behavior case in C). */
        let body = planet::get(BodyId::Asteroid2);
        let subs = planet::subdivisions_for_radius(body.radius_m);
        let mut a = World::create(&body, subs);
        while !a.gen_complete() {
            a.stream_gen(500);
        }
        set_state(&mut a, 4, 50, 0x83);
        enqueue(&mut a, 4, 50);
        assert!(origin_add(&mut a, 9, 40, rf(8, 40)));
        assert_eq!(pending(&a), 1);

        let mut b = a.clone_world();
        /* clone_world calls world_water::clone_into: state + origins
         * copied, queue + persist-dirty reset. */
        assert_eq!(get_state(&b, 4, 50), 0x83);
        assert_eq!(pending(&b), 0);
        assert_eq!(origin_count(&b, 9, 40), 1);
        let mut tiles = [0i32; 4];
        assert_eq!(drain_persist_dirty(&mut b, &mut tiles), 0);
        /* Source still has its pending work + dirty bit. */
        assert_eq!(pending(&a), 1);
        assert_eq!(drain_persist_dirty(&mut a, &mut tiles), 1);
        assert_eq!(tiles[0], 4);
    }
}
