//! Port of `tenebris-c/src/core/world_light.{c,h}`.
//!
//! Per-voxel propagated lighting. Replaces the column-only sky bake
//! + line-of-sight torch bake the mesher does today with a 6-neighbour
//! BFS over the goldberg + depth grid:
//!
//!   - Sky channel:  every air voxel reachable from the build cap by a
//!                   straight downward run of air starts at sky_max;
//!                   light then propagates laterally and downward at
//!                   -1 per step through any non-face-covering block.
//!                   The straight-down-through-air rule preserves the
//!                   "shafts of daylight" effect Minecraft-style
//!                   lighting is known for, without ambient leak.
//!   - Block channel: each torch source is seeded at its anchor voxel
//!                   with the configured emission, then propagates
//!                   -1 per step through any non-face-covering block.
//!
//! Storage is nibble-packed: one `u8` per voxel holds `(sky << 4) |
//! block`, each in 0..15. The buffer sits alongside `World::blocks`
//! and is sized identically, so existing tile/depth indexing rules
//! apply unchanged.
//!
//! Renames (per PORTING.md rule 4 - module prefix dropped):
//! - `world_light_t`                       -> `world_light::WorldLight`
//! - `world_light_torch_t`                 -> `world_light::Torch`
//! - `world_light_session_summary_t`       -> `world_light::SessionSummary`
//! - `world_light_create(w)`               -> `WorldLight::create(tile_count)`
//!   (the C function only reads `w->tile_count`; taking the count
//!   directly avoids a circular world -> light -> world borrow)
//! - `world_light_destroy()`               -> `Drop` (implicit)
//! - `world_light_clone_into(dst, src)`    -> `world_light::clone_into(dst, src)`
//! - `world_light_mark_dirty()`            -> `WorldLight::mark_dirty()`
//! - `world_light_is_dirty()`              -> `WorldLight::is_dirty()`
//! - `world_light_mark_dirty_at()`         -> `WorldLight::mark_dirty_at()`
//! - `world_light_set_torches(l, p, n)`    -> `WorldLight::set_torches(&[Torch])`
//! - `world_light_rebuild(l, w)`           -> `WorldLight::rebuild(blocks, grid)`
//!   (takes the world's voxel bytes + goldberg grid instead of the
//!   whole `World` so `World::light_rebuild()` can split borrows; the
//!   C call shape is preserved by that wrapper)
//! - `world_light_sky()` / `_block()`      -> `WorldLight::sky()` / `::block()`
//! - `world_light_last_call_ops()`         -> `WorldLight::last_call_ops()`
//! - `world_light_is_active()`             -> `WorldLight::is_active()`
//! - `world_light_consume_session_summary` -> `WorldLight::consume_session_summary()`
//!   (returns `Option<SessionSummary>` instead of bool + out param)

use crate::config;
use crate::goldberg::Goldberg;
use crate::world::{covers_face_raw, WORLD_MAX_DEPTH};
use std::collections::VecDeque;

/* ----------------------------------------------------------------------- */
/* Layout. nibbles[i] = (sky << 4) | block, indexed exactly like
 * World::blocks (tile * WORLD_MAX_DEPTH + depth). torches[] is the
 * snapshot the most recent set_torches handed us; it lives on the
 * grid (not the world) because torch state is owned by the client
 * and core/ must stay client-free. */

/* Incremental rebuild state. The BFS runs in budgeted slices across
 * frames so a relight after a big chunk edit doesn't stall the main
 * loop. rebuild() is the single entry: it advances the state machine
 * by `voxel_rebuild_ops_per_frame` BFS pops and returns. The next
 * frame's call resumes from the saved phase + queue. */
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
#[allow(dead_code)] /* LR_SKY_SEED kept for 1:1 parity; the C never enters it either */
enum RebuildPhase {
    Idle = 0,
    SkySeed = 1,   /* seeding sky=max down each column      */
    SkyBfs = 2,    /* draining the sky propagation queue    */
    BlockSeed = 3, /* seeding torch sources                  */
    BlockBfs = 4,  /* draining the block propagation queue   */
}

/* Per-edit ripple queue cap. Larger = more edits batch into the next
 * incremental rebuild before we fall back to a full pass. 8192 is
 * comfortable for hundreds of CHUNK_DIFF entries arriving in one
 * frame; one player placing blocks at human speed never gets near
 * the cap. Each entry is a u32 voxel index. */
const LIGHT_EDIT_QUEUE_CAP: usize = 8192;

/// Port of the `LIGHT_TRIGGER_*` bitmask defines.
pub const LIGHT_TRIGGER_TORCH: u32 = 1 << 0;
pub const LIGHT_TRIGGER_BLOCK_EDIT: u32 = 1 << 1;
pub const LIGHT_TRIGGER_FULL_MARK: u32 = 1 << 2;

/// Port of `world_light_torch_t`. Block-light source description. The
/// mesher (which owns the torch list) publishes these via
/// `set_torches` before each rebuild. Storing them on the light grid -
/// rather than threading the torch array through every rebuild call -
/// keeps core/ free of any client/ dependency.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Torch {
    pub tile: i32,
    pub depth: i32,
    /// 0..15; 0 = effectively no source
    pub intensity: u8,
}

/// Port of `world_light_session_summary_t`.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub struct SessionSummary {
    /// BFS pops + seed touches in the session
    pub total_ops: i32,
    /// rebuild() invocations
    pub total_calls: i32,
    /// bitmask of LIGHT_TRIGGER_*
    pub triggers: u32,
    /// mark_dirty_at calls during session
    pub edits_seen: i32,
    /// size of the torch list at session start
    pub torch_count: i32,
    /// a full BFS pass ran (vs incremental)
    pub was_full_pass: bool,
}

/// Port of `world_light_s`.
///
/// The C ring-buffer queue (`queue_t`) is a grow-on-overflow FIFO; a
/// `VecDeque<u32>` is behaviourally identical (the C grow path
/// linearises oldest-first, so pop order is plain FIFO either way).
pub struct WorldLight {
    tile_count: i32,
    /// always WORLD_MAX_DEPTH; cached
    #[allow(dead_code)] /* kept for 1:1 struct parity; sizes use WORLD_MAX_DEPTH directly */
    depth: i32,
    /// size tile_count * depth
    nibbles: Vec<u8>,
    dirty: bool,

    torches: Vec<Torch>,

    /* Rebuild state machine. Lives on the grid so the BFS queue
     * persists across frames. */
    phase: RebuildPhase,
    q: VecDeque<u32>,
    #[allow(dead_code)] /* kept for 1:1 struct parity; the C never reads it */
    seed_tile_cursor: i32,
    torch_seed_cursor: i32,
    /// edit during rebuild
    restart_pending: bool,

    /* Incremental rebuild state. world::set pushes (tile, depth) here
     * via mark_dirty_at; the next rebuild drains the queue with a
     * bounded BFS (removal + addition pass) rather than a full
     * memset + seed. A full rebuild is forced when needs_full = true
     * (initial create / clone, or overflow). Bounded at
     * LIGHT_EDIT_QUEUE_CAP entries like the C fixed array. */
    edits: Vec<u32>,
    needs_full: bool,

    /* Profiling counters. Lifetime model:
     *  - in_session       - true between the first dirty mark on a
     *                       clean grid and the moment the grid
     *                       converges back to clean.
     *  - ops_this_call    - reset at the top of every rebuild() call
     *                       and incremented per unit of work (one
     *                       BFS pop, one seed-pass touch, one
     *                       torch-seed entry). The renderer reads
     *                       this immediately after the call.
     *  - the *_session    - accumulated across the whole session;
     *                       reset when a new session starts.
     *  - summary_pending  - set on the rebuild() call that drained
     *                       the grid; consumed via
     *                       consume_session_summary so the renderer
     *                       can print exactly one blocking-cost line
     *                       per session. */
    ops_this_call: i32,
    ops_this_session: i32,
    calls_this_session: i32,
    triggers_this_session: u32,
    edits_this_session: i32,
    torches_at_session_start: i32,
    full_pass_this_session: bool,
    in_session: bool,
    summary_pending: bool,
    pending_summary: SessionSummary,
}

/* ----------------------------------------------------------------------- */

#[inline]
fn voxel_index(tile: i32, depth: i32) -> i32 {
    tile * WORLD_MAX_DEPTH + depth
}

/* ----------------------------------------------------------------------- */
/* Neighbour iteration. Each voxel has up to 8 neighbours: 5 or 6
 * lateral (one per goldberg tile-edge) plus depth-1 and depth+1. The
 * caller hands us a fixed-size out array; we return how many were
 * actually filled. */

const MAX_NEIGHBOURS: usize = 8;

/* Per-step attenuation table: lateral neighbours cost
 * voxel_sky_lateral_loss, vertical neighbours always cost 1. The
 * neighbour order is (lateral first, then depth+1, depth-1) so we
 * know which is which by index. */
fn voxel_neighbours_with_cost(
    grid: &Goldberg,
    tile_count: i32,
    tile: i32,
    depth: i32,
    out: &mut [i32; MAX_NEIGHBOURS],
    cost: &mut [i32; MAX_NEIGHBOURS],
    lateral_cost: i32,
) -> usize {
    let mut n = 0usize;
    let t = match grid.tile(tile) {
        Some(t) => t,
        None => return 0,
    };
    for i in 0..t.num_neighbors as usize {
        let nb = t.neighbors[i];
        if nb >= 0 && nb < tile_count {
            out[n] = voxel_index(nb, depth);
            cost[n] = lateral_cost;
            n += 1;
        }
    }
    /* Vertical neighbours stay at 1 per step so daylight shafts
     * remain at full strength. */
    if depth + 1 < WORLD_MAX_DEPTH {
        out[n] = voxel_index(tile, depth + 1);
        cost[n] = 1;
        n += 1;
    }
    if depth - 1 >= 0 {
        out[n] = voxel_index(tile, depth - 1);
        cost[n] = 1;
        n += 1;
    }
    n
}

/* Channel selector standing in for the C get/set function-pointer
 * pair (get_sky_w / set_sky_w / get_block_w / set_block_w). */
#[derive(Clone, Copy, PartialEq, Eq)]
enum Channel {
    Sky,
    Block,
}

impl WorldLight {
    #[inline]
    fn get_sky(&self, idx: i32) -> u8 {
        self.nibbles[idx as usize] >> 4
    }
    #[inline]
    fn get_block_ch(&self, idx: i32) -> u8 {
        self.nibbles[idx as usize] & 0x0F
    }
    #[inline]
    fn set_sky(&mut self, idx: i32, v: u8) {
        self.nibbles[idx as usize] = (v << 4) | (self.nibbles[idx as usize] & 0x0F);
    }
    #[inline]
    fn set_block_ch(&mut self, idx: i32, v: u8) {
        self.nibbles[idx as usize] = (self.nibbles[idx as usize] & 0xF0) | (v & 0x0F);
    }
    #[inline]
    fn chan_get(&self, ch: Channel, idx: i32) -> u8 {
        match ch {
            Channel::Sky => self.get_sky(idx),
            Channel::Block => self.get_block_ch(idx),
        }
    }
    #[inline]
    fn chan_set(&mut self, ch: Channel, idx: i32, v: u8) {
        match ch {
            Channel::Sky => self.set_sky(idx, v),
            Channel::Block => self.set_block_ch(idx, v),
        }
    }

    /* Start a new session if one isn't already in flight. Called from
     * every code path that sets `dirty` on a previously clean grid. The
     * trigger bit is OR'd in either way so a session that started on a
     * block edit and was extended by a torch edit reports both. */
    fn session_begin(&mut self, trigger: u32) {
        if !self.in_session {
            self.in_session = true;
            self.ops_this_session = 0;
            self.calls_this_session = 0;
            self.triggers_this_session = 0;
            self.edits_this_session = 0;
            self.torches_at_session_start = self.torches.len() as i32;
            self.full_pass_this_session = false;
        }
        self.triggers_this_session |= trigger;
    }

    /* Called when rebuild() drains the grid back to clean. Snapshots
     * the session counters into pending_summary and arms the one-shot
     * consume function so the renderer can print a single blocking-
     * cost line and reset its own wall-clock accumulators. */
    fn session_end(&mut self) {
        if !self.in_session {
            return;
        }
        self.pending_summary = SessionSummary {
            total_ops: self.ops_this_session,
            total_calls: self.calls_this_session,
            triggers: self.triggers_this_session,
            edits_seen: self.edits_this_session,
            torch_count: self.torches_at_session_start,
            was_full_pass: self.full_pass_this_session,
        };
        self.summary_pending = true;
        self.in_session = false;
    }

    /* ------------------------------------------------------------------- */

    /// Port of `world_light_create()`. Allocate a light grid sized to
    /// a world with `tile_count` tiles. Voxel values are all zero on
    /// return; call `rebuild` before sampling.
    pub fn create(tile_count: i32) -> WorldLight {
        WorldLight {
            tile_count,
            depth: WORLD_MAX_DEPTH,
            nibbles: vec![0u8; (tile_count * WORLD_MAX_DEPTH) as usize],
            dirty: true,
            /* Fresh grid - the first rebuild has to walk every column to
             * seed sky; subsequent rebuilds run incrementally from the
             * edit queue. */
            needs_full: true,
            torches: Vec::new(),
            phase: RebuildPhase::Idle,
            q: VecDeque::new(),
            seed_tile_cursor: 0,
            torch_seed_cursor: 0,
            restart_pending: false,
            edits: Vec::new(),
            ops_this_call: 0,
            ops_this_session: 0,
            calls_this_session: 0,
            triggers_this_session: 0,
            edits_this_session: 0,
            torches_at_session_start: 0,
            full_pass_this_session: false,
            in_session: false,
            summary_pending: false,
            pending_summary: SessionSummary::default(),
        }
    }

    /// Port of `world_light_mark_dirty()`. Mark the grid as needing a
    /// full relight. Cheap O(1). Used when the world is created /
    /// cloned and the entire grid must be rebuilt from scratch. For
    /// ongoing block edits, prefer `mark_dirty_at` so the BFS only
    /// touches cells near the change.
    pub fn mark_dirty(&mut self) {
        if self.phase != RebuildPhase::Idle {
            /* Edit landed mid-rebuild. Let the current pass finish so we
             * don't churn the queue, then schedule a fresh rebuild after. */
            self.restart_pending = true;
        }
        self.needs_full = true;
        self.dirty = true;
        self.session_begin(LIGHT_TRIGGER_FULL_MARK);
    }

    /// Port of `world_light_mark_dirty_at()`. Per-edit dirty: pushes
    /// (tile, depth) into the incremental rebuild queue. `world::set`
    /// calls this on each block change so the rebuild only
    /// re-propagates light around the affected cell, Minecraft-style,
    /// instead of clearing + reseeding the whole planet. If the queue
    /// overflows (e.g. a huge multi-tile chunk diff lands at once),
    /// the next rebuild silently falls back to a full pass.
    pub fn mark_dirty_at(&mut self, tile: i32, depth: i32) {
        if tile < 0 || tile >= self.tile_count {
            return;
        }
        if depth < 0 || depth >= WORLD_MAX_DEPTH {
            return;
        }
        /* Always set dirty + restart_pending. The previous early-return
         * for needs_full silently DROPPED edits that landed mid-rebuild,
         * so saves/body data and live block edits weren't reflected in
         * the lighting after the in-flight full rebuild finished
         * (because the rebuild's seed pass already ran with stale
         * blocks). */
        self.dirty = true;
        self.session_begin(LIGHT_TRIGGER_BLOCK_EDIT);
        self.edits_this_session += 1;
        if self.phase != RebuildPhase::Idle {
            self.restart_pending = true;
        }
        if self.needs_full {
            /* Full pass already requested. The queue would be discarded
             * anyway, but we need restart_pending so the rebuild kicks
             * again after the current one completes - the current pass
             * may have seeded with the OLD block state for this cell. */
            return;
        }
        if self.edits.len() >= LIGHT_EDIT_QUEUE_CAP {
            /* Queue overflow - escalate to a full rebuild so we don't
             * silently miss any edits. */
            self.needs_full = true;
            self.edits.clear();
            return;
        }
        self.edits.push(voxel_index(tile, depth) as u32);
    }

    /// Port of `world_light_is_dirty()`.
    pub fn is_dirty(&self) -> bool {
        self.dirty
    }

    /// Port of `world_light_set_torches()`. Replace the published
    /// torch source table. The slice is copied; pass `&[]` to clear.
    /// Calling this with a different set of torches (or different
    /// intensities) implicitly marks the grid dirty so the next
    /// rebuild reflects the change.
    pub fn set_torches(&mut self, sources: &[Torch]) {
        let count = sources.len();

        /* hex_mesher republishes the torch list every frame an edit was
         * detected, but the list usually hasn't actually changed (place /
         * remove are rare events). Diff against the cached copy and bail
         * silently when identical so the incremental rebuild isn't
         * reset on every frame the player is mid-mining a block.
         * (The C also re-checks for NULL source/dest pointers here;
         * slices can't be null, so that clause drops out.) */
        let mut same = count == self.torches.len();
        if same {
            for i in 0..count {
                if self.torches[i] != sources[i] {
                    same = false;
                    break;
                }
            }
        }
        if same {
            return;
        }

        /* Mark every cell that's changing dirty for an incremental BFS
         * pass. We queue both the OLD positions (so the removal pass
         * cascades from the cell's existing block-light value) and the
         * NEW positions (so the addition pass re-seeds them once the
         * snapshot below is swapped in). Placing a single torch only
         * touches the ~sky_max^3 cells around the edit, so this stays
         * off the frame budget instead of forcing a planet-wide full
         * rebuild on every torch click. */
        for i in 0..self.torches.len() {
            let t = self.torches[i];
            self.mark_dirty_at(t.tile, t.depth);
        }
        for s in sources.iter() {
            self.mark_dirty_at(s.tile, s.depth);
        }

        self.torches.clear();
        self.torches.extend_from_slice(sources);
        self.dirty = true;
        self.session_begin(LIGHT_TRIGGER_TORCH);
    }

    /* ------------------------------------------------------------------- */
    /* Incremental BFS plumbing.
     *
     * sky_seed_one_column seeds one tile column at a time so the seed
     * pass is also budgeted (a 160k-tile planet's seed alone touches
     * several hundred k voxels). bfs_one_pop processes a single
     * dequeue against either channel. The rebuild driver below
     * interleaves seed work and BFS work within one frame budget so a
     * fresh dirty starts producing visible light immediately instead
     * of waiting for the seed to fully complete before any propagation
     * kicks off. */

    /* Seed one tile column for the sky pass. Walks from the top down,
     * stops at the first face-covering block. Returns the number of
     * voxels touched (so the budget accounting reflects real work). */
    fn sky_seed_one_column(&mut self, blocks: &[u8], tile: i32, sky_max: i32) -> i32 {
        if tile < 0 || tile >= self.tile_count {
            return 0;
        }
        let col_base = (tile * WORLD_MAX_DEPTH) as usize;
        let mut touched = 0;
        for d in (0..WORLD_MAX_DEPTH).rev() {
            let b = blocks[col_base + d as usize];
            if covers_face_raw(b) {
                break;
            }
            let idx = voxel_index(tile, d);
            self.set_sky(idx, sky_max as u8);
            self.q.push_back(idx as u32);
            touched += 1;
        }
        touched
    }

    /* Pop one entry off the queue and propagate to its neighbours. Used
     * for both the sky and block passes; the channel is selected by
     * `ch`. */
    fn bfs_one_pop(&mut self, blocks: &[u8], grid: &Goldberg, ch: Channel, lateral_cost: i32) {
        let idx = match self.q.pop_front() {
            Some(v) => v,
            None => return,
        };
        let tile = idx as i32 / WORLD_MAX_DEPTH;
        let depth = idx as i32 % WORLD_MAX_DEPTH;
        let cur = self.chan_get(ch, idx as i32);
        if cur <= 1 {
            return;
        }

        let mut nbrs = [0i32; MAX_NEIGHBOURS];
        let mut cost = [0i32; MAX_NEIGHBOURS];
        let count = voxel_neighbours_with_cost(
            grid,
            self.tile_count,
            tile,
            depth,
            &mut nbrs,
            &mut cost,
            lateral_cost,
        );
        for k in 0..count {
            let n_idx = nbrs[k];
            let n_tile = n_idx / WORLD_MAX_DEPTH;
            let n_depth = n_idx % WORLD_MAX_DEPTH;
            let nb = blocks[(n_tile * WORLD_MAX_DEPTH + n_depth) as usize];
            if covers_face_raw(nb) {
                continue;
            }
            let after = cur as i32 - cost[k];
            if after <= 0 {
                continue;
            }
            if self.chan_get(ch, n_idx) >= after as u8 {
                continue;
            }
            self.chan_set(ch, n_idx, after as u8);
            self.q.push_back(n_idx as u32);
        }
    }

    /* ------------------------------------------------------------------- */
    /* Incremental rebuild (Minecraft-style).
     *
     * For each edited voxel we run a two-pass BFS: a "removal" pass
     * that BFS-clears any light value that was derived from a
     * now-decreased source, then an "addition" pass that re-propagates
     * from remaining sources. This means a single block place / break
     * only touches the cells within at most sky_max steps of the edit,
     * not the whole planet. The full-rebuild path stays as a fallback
     * for the initial world creation and for the queue-overflow case.
     *
     * Queues use the encoding (idx | (old_value << 24)) so the removal
     * pass knows the threshold below which a neighbour was "definitely
     * lit by us"; standard packing matches Minecraft's reference impl. */

    #[allow(clippy::too_many_arguments)]
    fn incremental_pass_for_channel(
        &mut self,
        blocks: &[u8],
        grid: &Goldberg,
        edits: &[u32],
        ch: Channel,
        lateral_cost: i32,
        seed_sky_max: i32,
        channel_is_sky: bool,
    ) {
        /* Reuse the persistent queue on the grid. Make sure it's empty
         * so we don't blend with a previous BFS. */
        self.q.clear();

        /* Pass 1: removal. Seed with each edited cell's PRIOR value;
         * neighbours strictly less than that prior value were lit BY
         * the edit (they get cleared and queued for further removal),
         * neighbours greater-or-equal are independent sources that get
         * pushed into the addition queue afterwards. */
        let mut nbrs = [0i32; MAX_NEIGHBOURS];
        let mut cost = [0i32; MAX_NEIGHBOURS];

        for &idx in edits.iter() {
            let tile = idx as i32 / WORLD_MAX_DEPTH;
            let depth = idx as i32 % WORLD_MAX_DEPTH;
            let b = blocks[(tile * WORLD_MAX_DEPTH + depth) as usize];
            let old = self.chan_get(ch, idx as i32);
            /* If the cell is now solid OR was previously a light source
             * and lost its source, its stored value is now stale - clear
             * it. Air-becoming-air is also valid (the BFS will just
             * re-derive the right value during the addition pass). */
            if covers_face_raw(b) {
                self.chan_set(ch, idx as i32, 0);
            }
            /* Pack (idx | (old << 24)) for the removal BFS. old <= 15 so
             * the top byte is safe to use. */
            if old > 0 {
                self.q.push_back(idx | ((old as u32) << 24));
            } else {
                /* No prior light - go straight to addition with cell +
                 * neighbours so light can flow in if the cell opened up. */
                self.q.push_back(idx | 0x8000_0000u32); /* marker bit = "addition" */
            }
        }

        /* Process removal entries. Mixed in with addition markers for
         * cells with no prior light; we route them appropriately.
         *
         * The addition queue lives separately from the BFS queue
         * because Minecraft's algorithm requires the removal frontier
         * fully expand before additions begin. Sizing: a single edit's
         * worst-case cascade visits ~sky_max^3 cells; 1M slots is
         * comfortable for hundreds of simultaneous edits before we'd
         * even consider overflow. The overflow path no longer silently
         * drops pushes - it sets needs_full so the lighting catches up
         * with a full pass instead of leaving cells stuck at sky=0
         * (the user-visible bug: dug-out cells stayed dark forever
         * because the add_q filled before the cell got its post-edit
         * neighbour push).
         *
         * (The C also handles add_q malloc failure by escalating to a
         * full rebuild; Rust's allocator aborts on OOM so that branch
         * drops out.) */
        let add_cap = LIGHT_EDIT_QUEUE_CAP * 128;
        let mut add_q: Vec<u32> = Vec::new();
        let mut add_head = 0usize;
        let mut overflow = false;

        macro_rules! add_push {
            ($v:expr) => {
                if add_q.len() < add_cap {
                    add_q.push($v);
                } else {
                    overflow = true;
                }
            };
        }

        /* Drain the (mixed) queue into removal work and the addition
         * queue. */
        while let Some(packed) = self.q.pop_front() {
            if packed & 0x8000_0000u32 != 0 {
                /* Pre-marked addition entry. Strip marker, push to add_q. */
                add_push!(packed & 0x7FFF_FFFFu32);
                continue;
            }
            let idx = packed & 0x00FF_FFFFu32;
            let old = ((packed >> 24) & 0xFF) as u8;
            let tile = idx as i32 / WORLD_MAX_DEPTH;
            let depth = idx as i32 % WORLD_MAX_DEPTH;
            let count = voxel_neighbours_with_cost(
                grid,
                self.tile_count,
                tile,
                depth,
                &mut nbrs,
                &mut cost,
                lateral_cost,
            );
            for k in 0..count {
                let n_idx = nbrs[k];
                let n_v = self.chan_get(ch, n_idx);
                if n_v == 0 {
                    continue;
                }
                if n_v < old {
                    /* Definitely lit by us - clear + recurse. */
                    self.chan_set(ch, n_idx, 0);
                    self.q.push_back(n_idx as u32 | ((n_v as u32) << 24));
                } else {
                    /* Independent source - re-add. */
                    add_push!(n_idx as u32);
                }
            }
            /* Also push the cell itself to addition so it can pull from
             * any neighbour that survived the removal. */
            add_push!(idx);
        }

        /* Pass 2: addition. For each candidate, compute what its sky
         * SHOULD be from neighbour values + (if applicable) the column-
         * top seed. If the computed value > stored, set it and propagate
         * to neighbours. */
        while add_head < add_q.len() {
            let idx = add_q[add_head];
            add_head += 1;
            let tile = idx as i32 / WORLD_MAX_DEPTH;
            let depth = idx as i32 % WORLD_MAX_DEPTH;
            let b = blocks[(tile * WORLD_MAX_DEPTH + depth) as usize];
            if covers_face_raw(b) {
                continue;
            }

            /* Best candidate value: max of neighbour - cost. */
            let count = voxel_neighbours_with_cost(
                grid,
                self.tile_count,
                tile,
                depth,
                &mut nbrs,
                &mut cost,
                lateral_cost,
            );
            let mut best = 0i32;
            for k in 0..count {
                let n_idx = nbrs[k];
                let v = self.chan_get(ch, n_idx) as i32 - cost[k];
                if v > best {
                    best = v;
                }
            }
            /* Sky channel only: if this cell sees direct sky (every
             * cell above is non-face-covering), the column-top seed
             * lifts it to sky_max. */
            if channel_is_sky && seed_sky_max > 0 {
                let mut sees_sky = true;
                for d in (depth + 1)..WORLD_MAX_DEPTH {
                    let up = blocks[(tile * WORLD_MAX_DEPTH + d) as usize];
                    if covers_face_raw(up) {
                        sees_sky = false;
                        break;
                    }
                }
                if sees_sky && best < seed_sky_max {
                    best = seed_sky_max;
                }
            }
            /* Block channel: if this cell hosts a torch, lift `best` to
             * the torch intensity. Without this, a newly-placed torch
             * marked dirty would compute best=0 from its (un-lit)
             * neighbours and stay dark - only the full-rebuild seed
             * phase knew about torches. */
            if !channel_is_sky && !self.torches.is_empty() {
                for i in 0..self.torches.len() {
                    if self.torches[i].tile == tile && self.torches[i].depth == depth {
                        let v = if self.torches[i].intensity > 15 {
                            15
                        } else {
                            self.torches[i].intensity as i32
                        };
                        if v > best {
                            best = v;
                        }
                        break;
                    }
                }
            }

            if best > self.chan_get(ch, idx as i32) as i32 {
                self.chan_set(ch, idx as i32, best as u8);
                /* Propagate to neighbours. */
                for k in 0..count {
                    let n_idx = nbrs[k];
                    let nb = blocks[((n_idx / WORLD_MAX_DEPTH) * WORLD_MAX_DEPTH
                        + (n_idx % WORLD_MAX_DEPTH)) as usize];
                    if covers_face_raw(nb) {
                        continue;
                    }
                    add_push!(n_idx as u32);
                }
            }
        }
        if overflow {
            /* The incremental pass dropped at least one neighbour push.
             * That cell could now be stuck under-lit, so escalate to a
             * full rebuild next time and let the from-scratch BFS sort
             * it out. */
            self.needs_full = true;
            self.dirty = true;
        }
    }

    fn run_incremental_rebuild(&mut self, blocks: &[u8], grid: &Goldberg) {
        if self.edits.is_empty() {
            return;
        }
        let cfg = config::lighting();
        let mut lateral_cost = cfg.voxel_sky_lateral_loss;
        if lateral_cost < 1 {
            lateral_cost = 1;
        }

        /* Snapshot the edit list and clear it - new edits arriving
         * during this pass land in a fresh queue and are processed on
         * the next rebuild call (cheap, the BFS is bounded). */
        let edits = std::mem::take(&mut self.edits);

        /* Sky channel. */
        self.incremental_pass_for_channel(
            blocks,
            grid,
            &edits,
            Channel::Sky,
            lateral_cost,
            cfg.voxel_sky_max,
            /* channel_is_sky = */ true,
        );
        /* Block channel - same algorithm with the seed step skipped. */
        self.incremental_pass_for_channel(
            blocks,
            grid,
            &edits,
            Channel::Block,
            lateral_cost,
            /* seed_max = */ 0,
            /* channel_is_sky = */ false,
        );
    }

    /* ------------------------------------------------------------------- */

    /// Port of `world_light_rebuild()`. Run a full sky + block BFS over
    /// the current world state (`blocks` + `grid` are the owning
    /// world's voxel bytes and goldberg grid). Idempotent; caller
    /// should gate on `is_dirty` to skip redundant work.
    pub fn rebuild(&mut self, blocks: &[u8], grid: &Goldberg) {
        self.ops_this_call = 0;
        if !self.dirty && self.phase == RebuildPhase::Idle {
            return;
        }
        self.calls_this_session += 1;

        /* Two distinct paths. The incremental path - the common case
         * once the world has been loaded once - drains the edit queue
         * with a bounded BFS per touched cell. The full path covers
         * the initial create / clone of a world, and the queue-overflow
         * fallback. */
        if !self.needs_full && self.phase == RebuildPhase::Idle && !self.edits.is_empty() {
            let ops_before = self.ops_this_session;
            self.run_incremental_rebuild(blocks, grid);
            self.ops_this_call = self.ops_this_session - ops_before;
            if self.edits.is_empty() && !self.needs_full {
                self.dirty = false;
                self.session_end();
            }
            return;
        }

        let cfg = config::lighting();
        let mut budget = cfg.voxel_rebuild_ops_per_frame;
        if budget < 1000 {
            budget = 1000;
        }
        let mut lateral_cost = cfg.voxel_sky_lateral_loss;
        if lateral_cost < 1 {
            lateral_cost = 1;
        }

        /* Fresh dirty + no in-progress rebuild -> start one. The seed
         * pass runs in this same call (NOT budgeted): a column-seed is
         * a linear walk with at most WORLD_MAX_DEPTH=128 writes, so the
         * whole planet's seed costs roughly tile_count * 128 memory
         * stores which is bounded and fast (~50 ms worst case on the
         * largest baseline). Budgeting the seed turned out worse than
         * the stall it tried to avoid: an in-progress seed left most
         * columns at sky=0 from the memset, which looked like the
         * world had gone dark. The BFS is still budgeted - that's
         * where the real cost lives and where the per-frame yield
         * actually matters.
         *
         * The block-seed phase is also tiny (torch_count entries
         * total) so it runs in one shot alongside the sky seed. */
        if self.phase == RebuildPhase::Idle {
            self.full_pass_this_session = true;
            self.nibbles.fill(0);
            self.q.clear();
            self.torch_seed_cursor = 0;
            self.restart_pending = false;
            /* One-shot sky seed. Walks every column once; cells above
             * the first face-covering block get sky_max and land in
             * the BFS queue. */
            if cfg.voxel_sky_max > 0 {
                for t in 0..self.tile_count {
                    let touched = self.sky_seed_one_column(blocks, t, cfg.voxel_sky_max);
                    self.ops_this_call += touched;
                    self.ops_this_session += touched;
                }
            }
            self.phase = RebuildPhase::SkyBfs;
        }

        while budget > 0 {
            match self.phase {
                RebuildPhase::SkyBfs => {
                    if self.q.is_empty() {
                        self.phase = RebuildPhase::BlockSeed;
                        continue;
                    }
                    self.bfs_one_pop(blocks, grid, Channel::Sky, lateral_cost);
                    self.ops_this_call += 1;
                    self.ops_this_session += 1;
                    budget -= 1;
                }
                RebuildPhase::BlockSeed => {
                    if self.torches.is_empty()
                        || self.torch_seed_cursor >= self.torches.len() as i32
                    {
                        self.phase = RebuildPhase::BlockBfs;
                        continue;
                    }
                    let s = self.torches[self.torch_seed_cursor as usize];
                    self.torch_seed_cursor += 1;
                    if s.tile < 0 || s.tile >= self.tile_count {
                        continue;
                    }
                    if s.depth < 0 || s.depth >= WORLD_MAX_DEPTH {
                        continue;
                    }
                    if s.intensity == 0 {
                        continue;
                    }
                    let idx = voxel_index(s.tile, s.depth);
                    let cur = self.get_block_ch(idx);
                    let v = if s.intensity > 15 { 15 } else { s.intensity };
                    if v > cur {
                        self.set_block_ch(idx, v);
                        self.q.push_back(idx as u32);
                    }
                    self.ops_this_call += 1;
                    self.ops_this_session += 1;
                    budget -= 1;
                }
                RebuildPhase::BlockBfs => {
                    if self.q.is_empty() {
                        /* Done. The full pass is complete - subsequent edits
                         * route through the incremental path until something
                         * forces another full rebuild (clone, overflow). If
                         * an edit landed mid-rebuild it sets restart_pending
                         * + dirty so the next call kicks again, but uses
                         * incremental (the edits live in the per-cell queue
                         * if needs_full wasn't forced). */
                        self.phase = RebuildPhase::Idle;
                        /* Only clear needs_full + dirty when nothing else is
                         * pending. If an edit landed mid-rebuild (restart_pending)
                         * OR per-cell edits queued up while we were running,
                         * keep going - the next call resolves them. needs_full
                         * stays true if it was set during the current pass
                         * (overflow case) so the next pass re-seeds with the
                         * latest world state. */
                        if self.restart_pending || !self.edits.is_empty() {
                            self.restart_pending = false;
                            self.dirty = true;
                            /* needs_full preserved if still set - the next
                             * call will run another full pass instead of an
                             * incremental that misses the seed-time
                             * block changes. */
                        } else {
                            self.dirty = false;
                            self.needs_full = false;
                            self.session_end();
                        }
                        return;
                    }
                    /* Block-light lateral attenuation matches sky: torches in
                     * a deep room shouldn't leak through a single voxel of
                     * stone in a way that beats their per-step cost. */
                    self.bfs_one_pop(blocks, grid, Channel::Block, lateral_cost);
                    self.ops_this_call += 1;
                    self.ops_this_session += 1;
                    budget -= 1;
                }
                _ => {
                    /* Unreachable - paranoia recover. */
                    self.phase = RebuildPhase::Idle;
                    self.dirty = false;
                    self.session_end();
                    return;
                }
            }
        }
        /* Budget ran out mid-pass. Leave the grid + queue in place; the
         * next call to rebuild picks up where we stopped. The mesher
         * samples the partially-built grid in the meantime, which
         * shows up as light "ripple in" rather than a frame stall. */
    }

    /* ------------------------------------------------------------------- */

    /// Port of `world_light_sky()`. Per-voxel query; out-of-range
    /// coordinates return 0.
    pub fn sky(&self, tile: i32, depth: i32) -> u8 {
        if tile < 0 || tile >= self.tile_count {
            return 0;
        }
        if depth < 0 || depth >= WORLD_MAX_DEPTH {
            return 0;
        }
        self.get_sky(voxel_index(tile, depth))
    }

    /// Port of `world_light_block()`. Per-voxel query; out-of-range
    /// coordinates return 0.
    pub fn block(&self, tile: i32, depth: i32) -> u8 {
        if tile < 0 || tile >= self.tile_count {
            return 0;
        }
        if depth < 0 || depth >= WORLD_MAX_DEPTH {
            return 0;
        }
        self.get_block_ch(voxel_index(tile, depth))
    }

    /* ------------------------------------------------------------------- */
    /* Profiling accessors. */

    /// Port of `world_light_last_call_ops()`. Number of BFS pops the
    /// most recent `rebuild()` call did. Resets to zero on the next
    /// rebuild() call so a 0 reading on an idle frame means "no work
    /// done", not "stale value".
    pub fn last_call_ops(&self) -> i32 {
        self.ops_this_call
    }

    /// Port of `world_light_is_active()`. True while a rebuild is
    /// pending or in-flight (dirty flag set or incremental queue
    /// non-empty or BFS phase != IDLE). Becomes false the instant the
    /// grid is fully converged.
    pub fn is_active(&self) -> bool {
        self.dirty || self.phase != RebuildPhase::Idle || !self.edits.is_empty()
    }

    /// Port of `world_light_consume_session_summary()`. If a session
    /// just completed (the most recent rebuild() drained the grid back
    /// to clean), return the session totals. Subsequent calls return
    /// `None` until another session completes. The renderer calls this
    /// once per frame after running `rebuild()` so it can log a
    /// one-shot summary of the blocking cost when the session ends.
    pub fn consume_session_summary(&mut self) -> Option<SessionSummary> {
        if !self.summary_pending {
            return None;
        }
        self.summary_pending = false;
        Some(self.pending_summary)
    }
}

/// Port of `world_light_clone_into()`. Deep-copy the source's nibble
/// buffer + dirty flag into the dst grid. Sizes must already match
/// (caller is responsible for creating dst against a world cloned from
/// the same body / subdivisions).
pub fn clone_into(dst: &mut WorldLight, src: &WorldLight) {
    if dst.tile_count != src.tile_count {
        return;
    }
    dst.nibbles.copy_from_slice(&src.nibbles);
    dst.dirty = src.dirty;
    /* Torches are a client-published snapshot; the cloned world starts
     * with none until the consumer republishes. */
    dst.torches.clear();
    /* Drop any in-progress rebuild state - the clone is a fresh
     * snapshot, the consumer will dirty + rebuild from scratch. */
    dst.q.clear();
    dst.phase = RebuildPhase::Idle;
    dst.seed_tile_cursor = 0;
    dst.torch_seed_cursor = 0;
    dst.restart_pending = false;
    dst.edits.clear();
    dst.needs_full = true; /* first rebuild on the clone is full */
    /* Reset profiling state - a clone is a fresh world; the source's
     * in-flight session counters don't transfer. The next mark_dirty
     * on this grid will start a new session. */
    dst.ops_this_call = 0;
    dst.ops_this_session = 0;
    dst.calls_this_session = 0;
    dst.triggers_this_session = 0;
    dst.edits_this_session = 0;
    dst.torches_at_session_start = 0;
    dst.full_pass_this_session = false;
    dst.in_session = false;
    dst.summary_pending = false;
}

/* ----------------------------------------------------------------------- */

#[cfg(test)]
mod tests {
    use super::*;
    use crate::blocks::Block;
    use crate::planet::{self, BodyId};
    use crate::world::World;

    /* All concrete pins below were generated by compiling
     * tenebris-c/src/core/{world,world_light,goldberg,planet,planet_gen,
     * blocks,config,math,rng}.c with gcc 13.2 -O2 plus a no-op
     * world_water stub (the pinned paths are water-free) and printing
     * hashes / values from a harness. Compiled-in config defaults are
     * in effect on both sides (no YAML loaded); the shipped
     * lighting.yaml / lod.yaml values match those defaults for every
     * field these paths read. Light-state pins are budget-independent:
     * the BFS queue persists across rebuild() calls, so the converged
     * grid is identical no matter how voxel_rebuild_ops_per_frame
     * slices the work. */

    fn fnv1a64(p: &[u8]) -> u64 {
        let mut h = 14695981039346656037u64;
        for &b in p {
            h ^= b as u64;
            h = h.wrapping_mul(1099511628211);
        }
        h
    }

    fn light_nib_fnv(w: &World) -> u64 {
        /* Hash through the public accessors, exactly like the C
         * harness, so the pin doesn't depend on field privacy. */
        let mut h = 14695981039346656037u64;
        for t in 0..w.tile_count {
            for d in 0..WORLD_MAX_DEPTH {
                let v = (w.light.sky(t, d) << 4) | w.light.block(t, d);
                h ^= v as u64;
                h = h.wrapping_mul(1099511628211);
            }
        }
        h
    }

    fn light_converge(w: &mut World) -> i32 {
        let mut calls = 0;
        while w.light.is_active() {
            w.light_rebuild();
            calls += 1;
            if calls > 100_000 {
                break;
            }
        }
        calls
    }

    fn tenebris_world() -> World {
        let body = planet::get(BodyId::Tenebris);
        let mut w = World::create(&body, 3);
        while !w.gen_complete() {
            w.stream_gen(100);
        }
        w
    }

    /// Replays the C harness's light sequence end to end: full rebuild,
    /// torch publish (incremental), no-op republish, torch removal,
    /// block edits + incremental relight. Single test because each pin
    /// depends on the converged state left by the previous step.
    #[test]
    fn pin_light_full_sequence_tenebris_subdiv3() {
        let mut w = tenebris_world();
        let tree_tile = 73; /* pinned from C: first column containing WOOD */

        /* ---- Initial full rebuild. ---- */
        assert!(w.light.is_dirty());
        light_converge(&mut w);
        assert!(!w.light.is_active());
        assert_eq!(light_nib_fnv(&w), 13872917604956537029);
        /* world_create never opens a profiling session (session_begin
         * only runs from the mark_dirty paths), so the initial full
         * pass completes without arming a summary - pinned C behavior. */
        assert_eq!(w.light.consume_session_summary(), None);
        assert_eq!(w.light.sky(100, 70), 15);
        assert_eq!(w.light.sky(100, 60), 0);
        assert_eq!(w.light.sky(2, 63), 15); /* water tile - light through ocean */
        assert_eq!(w.light.sky(2, 40), 0);
        assert_eq!(w.light.block(100, 70), 0);
        /* Out-of-range queries. */
        assert_eq!(w.light.sky(-1, 64), 0);
        assert_eq!(w.light.sky(0, 128), 0);
        assert_eq!(w.light.block(99999, 0), 0);

        /* ---- Torch publish (exercises the incremental path). ---- */
        let torches = [
            Torch { tile: 100, depth: 70, intensity: 14 },
            Torch { tile: tree_tile, depth: 80, intensity: 9 },
        ];
        w.light.set_torches(&torches);
        assert!(w.light.is_dirty());
        light_converge(&mut w);
        assert_eq!(light_nib_fnv(&w), 12656965779895110818);
        assert_eq!(w.light.block(100, 70), 14);
        assert_eq!(w.light.block(100, 72), 12);
        assert_eq!(w.light.block(tree_tile, 80), 9);
        /* The completed session must now report through the summary. */
        let sum = w.light.consume_session_summary().expect("session ended");
        assert_eq!(sum.triggers, LIGHT_TRIGGER_TORCH | LIGHT_TRIGGER_BLOCK_EDIT);
        assert!(!sum.was_full_pass);
        assert_eq!(w.light.consume_session_summary(), None); /* one-shot */

        /* Republishing the identical list is a silent no-op. */
        w.light.set_torches(&torches);
        assert!(!w.light.is_dirty());

        /* ---- Remove the second torch. The C removal pass never
         * clears the seed cell itself (only covers_face cells), so the
         * orphaned light stays in the grid - pinned C behavior. ---- */
        w.light.set_torches(&torches[..1]);
        light_converge(&mut w);
        assert_eq!(light_nib_fnv(&w), 12656965779895110818);
        assert_eq!(w.light.block(tree_tile, 80), 9);

        /* ---- Block edits + incremental relight. ---- */
        let top100 = 63; /* pinned from C: topmost solid depth of tile 100 */
        w.set(100, top100 + 3, Block::Stone);
        w.set(100, top100, Block::Air);
        w.set(100, top100, Block::Air); /* idempotent - no light work queued */
        light_converge(&mut w);
        assert_eq!(light_nib_fnv(&w), 15134756988363987479);
        assert_eq!(w.light.sky(100, top100), 14);
        assert_eq!(w.light.sky(100, top100 - 1), 0);
    }

    #[test]
    fn pin_clone_into_asteroid() {
        /* Same fixture as the C harness clone section: Asteroid C with
         * the subdivision count world_clone re-derives from the radius. */
        let body = planet::get(BodyId::Asteroid2);
        let subs = planet::subdivisions_for_radius(body.radius_m);
        assert_eq!(subs, 4);
        let mut a = World::create(&body, subs);
        while !a.gen_complete() {
            a.stream_gen(500);
        }
        light_converge(&mut a);
        /* Edit + reconverge, then clone. */
        let mut top_a = -1;
        for d in (0..WORLD_MAX_DEPTH).rev() {
            let b = a.blocks[(7 * WORLD_MAX_DEPTH + d) as usize];
            if b != Block::Air.raw() && b != Block::Water.raw() {
                top_a = d;
                break;
            }
        }
        a.set(7, top_a + 1, Block::Stone);
        light_converge(&mut a);

        let c = a.clone_world();
        assert_eq!(c.tile_count, 2562);
        assert!(c.gen_complete());
        assert_eq!(fnv1a64(&c.blocks), 16818736218024748198);
        assert_eq!(fnv1a64(&c.blocks), fnv1a64(&a.blocks));
        assert_eq!(fnv1a64(&c.dirty), 5412308683477963487); /* all clean */
        assert_eq!(light_nib_fnv(&c), 11286571112028584597);
        assert!(!c.light.is_dirty());
    }

    #[test]
    fn mark_dirty_paths_and_overflow() {
        let mut l = WorldLight::create(8);
        /* create() leaves dirty + needs_full set. */
        assert!(l.is_dirty());
        assert!(l.is_active());
        /* Out-of-range marks are dropped. */
        l.mark_dirty_at(-1, 0);
        l.mark_dirty_at(8, 0);
        l.mark_dirty_at(0, -1);
        l.mark_dirty_at(0, WORLD_MAX_DEPTH);
        assert_eq!(l.edits.len(), 0);
        /* needs_full swallows per-cell edits (queue would be discarded). */
        l.mark_dirty_at(0, 5);
        assert_eq!(l.edits.len(), 0);
        /* After a (synthetic) full pass the edit queue accepts cells. */
        l.needs_full = false;
        l.mark_dirty_at(0, 5);
        assert_eq!(l.edits.len(), 1);
        assert_eq!(l.edits[0], 5);
        /* Overflow escalates back to a full pass and clears the queue. */
        for _ in 0..LIGHT_EDIT_QUEUE_CAP + 4 {
            l.mark_dirty_at(1, 1);
        }
        assert!(l.needs_full);
        assert_eq!(l.edits.len(), 0);
    }

    #[test]
    fn set_torches_diff_semantics() {
        let mut l = WorldLight::create(8);
        l.dirty = false;
        l.needs_full = false;
        let list = [Torch { tile: 1, depth: 64, intensity: 14 }];
        l.set_torches(&list);
        assert!(l.is_dirty());
        assert_eq!(l.torches.len(), 1);
        l.dirty = false;
        /* Identical republish: silent no-op. */
        l.set_torches(&list);
        assert!(!l.is_dirty());
        /* Intensity change is a real change. */
        l.set_torches(&[Torch { tile: 1, depth: 64, intensity: 9 }]);
        assert!(l.is_dirty());
        /* Clear. */
        l.set_torches(&[]);
        assert_eq!(l.torches.len(), 0);
    }
}
