//! Port of `tenebris-c/src/client/interact.{c,h}`.
//!
//! Block place / break interaction: fixed-step voxel raycast along the
//! player's look direction, survival mining timer, target highlight
//! data for the HUD, torch place / remove, inventory consume / add,
//! and the same-frame SP persistence calls (CLAUDE.md hard rule:
//! every world mutation persists on the input frame it happens).
//!
//! Renames (per PORTING.md rule 4 - module prefix dropped):
//! - `interact_state_t`   -> `interact::InteractState`
//! - `interact_update()`  -> `interact::update()`
//! - `INTERACT_MAX_DIST`  -> `interact::MAX_DIST`
//! - `world_to_tile_depth()` keeps its name; the C out-params become
//!   the return tuple `(resolved_tile, Option<depth>)`. Like the C,
//!   the resolved tile is returned EVEN WHEN the depth check fails so
//!   ray-stepping callers can keep the goldberg hint warm (`-1` when
//!   the goldberg lookup itself failed - the C leaves the caller's
//!   `-1` initializer untouched in that case).

#![allow(dead_code)] // wired up by the main_web wave of the port

use crate::input;
use crate::inventory;
use crate::menu;
use crate::net_client;
use crate::persistence::{self, PersistenceTorch, COLUMN_BYTES};
use crate::player_ctrl::PlayerCtrl;
use crate::torch;
use tenebris_core::blocks::{self, Block};
use tenebris_core::items;
use tenebris_core::mining;
use tenebris_core::proto;
use tenebris_core::math::{
    dvec3_add, dvec3_dot, dvec3_length, dvec3_make, dvec3_normalize, dvec3_scale, dvec3_sub,
    vec3_make, vec3_scale, DVec3,
};
use tenebris_core::world::{World, WORLD_MAX_DEPTH, WORLD_SEA_LEVEL_DEPTH};
use tenebris_core::world_water;

/// Port of `INTERACT_MAX_DIST`.
pub const MAX_DIST: f64 = 8.0;
/* The C-era fixed MINING_TIME_S is gone: break time is per-block and
 * per-tool now (core::mining::break_time via break_seconds_for). */
/// Damage per left-click swing when attacking an animal (critter has 12
/// health, so ~3 hits to kill).
pub const ATTACK_DAMAGE: f32 = 5.0;

/// Port of `interact_state_t`. The C caller zero-initializes; `Default`
/// matches that ({0} - all flags false, indices 0, distances 0.0).
#[derive(Clone, Copy, Debug, Default)]
pub struct InteractState {
    pub has_target: bool,
    /// When true, the target is a placed torch entity rather than a
    /// voxel - `torch_idx` identifies it. Block fields (`hit_tile`
    /// etc.) are unused in this case. The HUD reads this to label the
    /// target and the click path branches off it.
    pub is_torch_target: bool,
    /// When true, the target is a crop entity (plant) under the reticle,
    /// broken like a block by holding the mine button. Block fields are
    /// unused; the crop-break timer lives in `crop_break_s`.
    pub is_crop_target: bool,
    /// Seconds the mine button has been held on the current crop target.
    /// Fills to the crop break time, then the crop breaks + drops.
    pub crop_break_s: f32,
    pub torch_idx: i32,
    pub hit_tile: i32,
    pub hit_depth: i32,
    pub place_tile: i32,
    pub place_depth: i32,
    pub distance: f64,

    /// Mining progress (survival only). Starts at 0, fills to
    /// the block's break time while LMB is held on the same target. Resets to
    /// 0 when the target changes or the button releases.
    pub mining_progress_s: f32,
    pub mining_tile: i32,
    pub mining_depth: i32,
}

/// The tool the player is USING against `block`: the item in the
/// SELECTED hotbar slot, if it's the right tool category (a pickaxe on
/// rock, an axe on wood, ...). Tools in the bag or in unselected slots
/// do nothing - equipping means selecting. Shared by the mining loop,
/// the tier gate, the viewmodel, and the HUD crack-decal so they all
/// agree.
pub fn best_tool_for(p: &PlayerCtrl, block: Block) -> Option<items::ItemId> {
    let sel = inventory::selected_item(&p.inventory)?;
    (mining::tool_kind(sel) == mining::block_tool(block)
        && mining::tool_kind(sel) != mining::ToolKind::None)
        .then_some(sel)
}

/// Seconds to break `block` with the player's current tool - the same
/// denominator the mining loop counts `mining_progress_s` toward.
pub fn break_seconds_for(p: &PlayerCtrl, block: Block) -> f32 {
    mining::break_time(&mining::config(), block, best_tool_for(p, block))
}

/// Spend one use of the equipped tool - the wear of a single mined block.
/// A tool on its last use is destroyed and its slot cleared.
///
/// Charges the SELECTED hotbar slot, which is where the EQUIP rule says a
/// tool has to be to work (see [`best_tool_for`]). Blocks, resources and
/// the budget-less tools (hoe / bucket / rod) fall out via
/// `mining::wear_one` returning `NoBudget`, so this is safe to call on
/// every break without checking what's held.
pub fn wear_selected_tool(p: &mut PlayerCtrl) {
    let sel = p.inventory.selected as usize;
    let Some(slot) = p.inventory.slots.get_mut(sel) else { return };
    if slot.count <= 0 {
        return;
    }
    match mining::wear_one(&mining::config(), slot.item, slot.dur) {
        mining::Wear::NoBudget => {}
        mining::Wear::Worn(dur) => slot.dur = dur,
        mining::Wear::Broke => {
            println!("[mining] {} broke", items::def(slot.item).map(|d| d.name).unwrap_or("tool"));
            *slot = crate::inventory::InvSlot::block(Block::Air, 0);
        }
    }
}

/* ----------------------------------------------------------------- */
/* SP per-edit persistence helpers. CLAUDE.md mandates that every
 * block place/break and every torch place/remove write to durable
 * storage on the same input frame. MP routes the edit through the
 * server (saves_write_tile fires there); SP has no server, so the
 * call lands here.
 *
 * Gated on menu_state() == GAME_IN_GAME_SP - in MP the local cache
 * would diverge from the server's authoritative state on rejoin,
 * which is worse than no cache at all. */

/// Port of `sp_active_for_world()`. The C's `!w || !w->body` null
/// checks drop out - a Rust `World` always carries its body.
/// C: `menu_state() == GAME_IN_GAME_SP && menu_active_world()[0]`.
fn sp_active_for_world(_w: &World) -> Option<String> {
    if menu::state() != menu::GameState::InGameSp {
        return None;
    }
    Some(menu::active_world()).filter(|name| !name.is_empty())
}

/// Port of `sp_save_tile_after_edit()`. Public so other world-edit paths
/// (e.g. the crops till action in `app`) persist the changed column on the
/// same frame, per the CLAUDE.md world-edit rule.
pub fn sp_save_tile_after_edit(w: &World, tile_idx: i32) {
    let Some(name) = sp_active_for_world(w) else {
        return;
    };
    if tile_idx < 0 || tile_idx >= w.tile_count {
        return;
    }
    let start = tile_idx as usize * WORLD_MAX_DEPTH as usize;
    let col: &[u8; COLUMN_BYTES] = w.blocks[start..start + COLUMN_BYTES]
        .try_into()
        .expect("column slice is exactly COLUMN_BYTES");
    persistence::save_tile(&name, w.body.id as u32, tile_idx, col);
    /* Per-placed-block state (tech facing, later machine state) rides the
     * same edit frame as the column save. The store is small (one entry
     * per placed machine), so re-serialising it per edit is cheap and
     * covers both placement (entity added) and mining (World::set dropped
     * it). Same-frame, per the CLAUDE.md persistence rule. */
    persistence::save_block_entities(&name, w.body.id as u32, &w.block_entities);
}

/// Taken-scatter snapshot, written on the same frame as the pickup that
/// consumed the object (CLAUDE.md world-edit rule). The list grows by one
/// tile index per pickup, so re-serialising it per event is cheap.
fn sp_save_scatter_after_change(w: &World) {
    let Some(name) = sp_active_for_world(w) else {
        return;
    };
    persistence::save_scatter_taken(&name, w.body.id as u32, &w.taken_scatter_tiles());
}

/// Port of `sp_save_torches_after_change()`. (pub(crate): the dev
/// torch-village hook persists through the same path.)
pub(crate) fn sp_save_torches_after_change(w: &World) {
    let Some(name) = sp_active_for_world(w) else {
        return;
    };
    /* Snapshot every torch anchored on THIS body (the list is
     * uncapped now - every placed light persists). */
    let list = torch::list();
    let mut buf: Vec<PersistenceTorch> = Vec::with_capacity(list.len());
    for t in &list {
        if t.tile_idx < 0 || t.tile_idx >= w.tile_count {
            continue;
        }
        buf.push(PersistenceTorch {
            tile_idx: t.tile_idx,
            pos: [t.position.x, t.position.y, t.position.z],
            up: [t.up.x, t.up.y, t.up.z],
        });
    }
    persistence::save_torches(&name, w.body.id as u32, &buf);
}

/* ----------------------------------------------------------------------- */

/// Port of `player_look_dir()`. Use the player's parallel-transported
/// basis (same one as player_view), not a fresh phys_tangent_basis.
/// The latter has a discontinuity near |up.y| = 0.9 that was jerking
/// the raycast and crosshair in the same pattern that made the camera
/// flip.
pub(crate) fn player_look_dir(p: &PlayerCtrl) -> DVec3 {
    let b = &p.basis;
    let (cy, sy) = ((p.yaw as f64).cos(), (p.yaw as f64).sin());
    let (cp, sp) = ((p.pitch as f64).cos(), (p.pitch as f64).sin());
    let fwd = dvec3_add(dvec3_scale(b.fwd, cy), dvec3_scale(b.right, sy));
    let look = dvec3_add(dvec3_scale(fwd, cp), dvec3_scale(b.up, sp));
    dvec3_normalize(look)
}

/// Port of `world_to_tile_depth()`. Convert a world position to
/// (tile, depth). Tile lookup uses the player's last-known tile as a
/// hint for speed. The resolved tile is returned EVEN WHEN the depth
/// check fails, so callers stepping along a ray can keep the goldberg
/// hint warm across iterations - without that, an out-of-bounds
/// raycast (player above the planet's voxel column range) hands a
/// stale -1 hint into every step, blowing the search back into a slow
/// path.
fn world_to_tile_depth(w: &World, pos: DVec3, hint: i32) -> (i32, Option<i32>) {
    /* pos is in WORLD space (same frame as p->position) but the
     * goldberg grid + body radius are body-local. Subtract the
     * body's centre so the raycast lines up on planets that don't
     * sit at the origin (Tenebris is at 0,0,0 but Sequoia / Crag /
     * Frostbite all sit elsewhere). Without this fix, mining +
     * placement only worked on Tenebris - the raycast normalised
     * a world-space vector that pointed somewhere unrelated to
     * the planet beneath the player. */
    let local = dvec3_make(
        pos.x - w.body.pos_x,
        pos.y - w.body.pos_y,
        pos.z - w.body.pos_z,
    );
    let dir = dvec3_normalize(local);
    let tile = w.grid.find_tile(dir, hint);
    if tile < 0 {
        return (-1, None);
    }
    let r = dvec3_length(local);
    /* Invert world_depth_to_radius_m: r = body_r - (SEA_LEVEL_IDX - d)
     * with block height = 1m. So depth = (r - body_r) + SEA_LEVEL_IDX.
     * Must match world.c's SEA_LEVEL_IDX (64). With the wrong value (12),
     * mining/placing modified a block 52 layers below where the player
     * was looking, so terrain seemed not to react to clicks. */
    const SEA_LEVEL_IDX: i32 = WORLD_SEA_LEVEL_DEPTH;
    let depth = (r - w.body.radius_m).floor() as i32 + SEA_LEVEL_IDX;
    if depth < 0 || depth >= WORLD_MAX_DEPTH {
        return (tile, None);
    }
    (tile, Some(depth))
}

/* ----------------------------------------------------------------------- */

/// Port of `interact_update()`. `dt` is needed for mining-timer
/// accumulation. Mutable player so we can write inventory pickups +
/// drains (and the self-place lift).
pub fn update(s: &mut InteractState, w: &mut World, p: &mut PlayerCtrl, dt: f32) {
    s.has_target = false;
    s.is_torch_target = false;
    s.is_crop_target = false;
    s.torch_idx = -1;

    /* In space mode there are no blocks within reach - no point
     * raycasting. Skip the whole pass; mining_progress stays at 0
     * so the existing reset-on-target-change branch still does the
     * right thing on landing. This is the dominant fix for the
     * "framerate tanks in space" report - interact_update was
     * burning ~140 ms / frame when the raycast couldn't find a tile
     * column inside its 8 m reach (every step's depth check failed
     * with an out-of-range result, but the goldberg lookup still
     * ran on every iteration). */
    if p.is_in_space {
        return;
    }

    /* Strapped into a rocket: no reach, no reticle, no mining or placing.
     * The FPS interaction loop assumes a player standing at the camera with
     * an arm's reach, and while riding the camera is 20 m behind a moving
     * ship - left-click would mine whatever the chase camera happened to
     * point through. Same early-out as space mode, and for the same reason:
     * the block-interaction layer simply doesn't apply in this mode. */
    if crate::rocket_ride::is_riding() {
        return;
    }

    /* Fishing rod: while the rod is the selected hotbar item, the left
     * click drives the cast / hook / reel state machine instead of
     * mining or attacking, and the reticle stays target-free. */
    if crate::inventory::selected_item(&p.inventory)
        == Some(tenebris_core::items::FISHING_ROD)
    {
        if input::state().left_click {
            crate::fishing::on_click(w, p);
        }
        return;
    }

    /* Eye position from the player's carried basis. */
    let eye = dvec3_add(p.position, dvec3_scale(p.basis.up, 1.6));
    let dir = player_look_dir(p);

    /* Fixed-step voxel raycast. */
    const STEP_M: f64 = 0.25;
    let mut prev_tile: i32 = -1;
    let mut prev_depth: i32 = -1;
    let mut prev_valid = false;
    let mut hint = p.last_tile;
    let mut block_dist = MAX_DIST + 1.0;
    let mut block_hit = false;
    let (mut block_tile, mut block_depth, mut block_place_tile, mut block_place_depth) =
        (0i32, 0i32, 0i32, 0i32);

    /* C: for (double dd = 0.0; dd <= INTERACT_MAX_DIST; dd += step_m).
     * The increment lives at the loop tail so the C `continue` (depth
     * out of range) still advances dd. 0.25 accumulates exactly in
     * binary, so the sequence is bit-identical to the C. */
    crate::profiler::begin("interact-ray");
    let mut dd = 0.0f64;
    while dd <= MAX_DIST {
        let cur = dvec3_add(eye, dvec3_scale(dir, dd));
        let (tile, depth_opt) = world_to_tile_depth(w, cur, hint);
        /* Keep the hint warm even when depth was out of range -
         * world_to_tile_depth still resolved the tile, so subsequent
         * iterations get a fresh greedy starting point instead of
         * falling back to an O(N) scan. */
        if tile >= 0 {
            hint = tile;
        }
        if let Some(depth) = depth_opt {
            let blk = w.get(tile, depth);
            if blocks::is_solid(blk) {
                block_hit = true;
                block_tile = tile;
                block_depth = depth;
                block_place_tile = if prev_valid { prev_tile } else { tile };
                block_place_depth = if prev_valid { prev_depth } else { depth + 1 };
                block_dist = dd;
                break;
            }
            prev_tile = tile;
            prev_depth = depth;
            prev_valid = true;
        }
        dd += STEP_M;
    }

    crate::profiler::end("interact-ray");

    /* Torch raycast - placed-torch entities are NOT in the voxel grid,
     * so they need their own intersection pass. Whichever target sits
     * closer along the look ray wins; the torch path short-circuits
     * the block path so a torch always takes precedence on a tie. */
    let eye_f = vec3_make(eye.x as f32, eye.y as f32, eye.z as f32);
    let dir_f = vec3_make(dir.x as f32, dir.y as f32, dir.z as f32);
    crate::profiler::begin("interact-targets");
    let (torch_hit, torch_dist_f) = torch::raycast(eye_f, dir_f, MAX_DIST as f32);

    /* Animal attack takes precedence when a critter is the nearest thing
     * under the reticle. Instant hit on the left-click edge; a kill drops
     * raw meat into the bag. Short-circuits the block / torch handling. */
    let (animal_hit, animal_dist_f) = crate::animals::raycast(eye_f, dir_f, MAX_DIST as f32);
    crate::profiler::end("interact-targets");
    if animal_hit >= 0
        && (!block_hit || (animal_dist_f as f64) <= block_dist)
        && (torch_hit < 0 || animal_dist_f <= torch_dist_f)
    {
        s.has_target = true;
        s.is_torch_target = false;
        s.distance = animal_dist_f as f64;
        s.mining_progress_s = 0.0;
        s.mining_tile = -1;
        s.mining_depth = -1;
        if input::state().left_click {
            /* Net equipped: scoop the fish into the bag instead of
             * hitting it. Unlike the random fishing roll, the net targets
             * a SPECIFIC fish - swim up and click the one you want. Only
             * water species can be netted; on anything else it falls
             * through to the normal melee. Capture the id BEFORE the local
             * catch (swap_remove shuffles indices). */
            if inventory::selected_item(&p.inventory) == Some(items::NET) {
                let animal_id = crate::animals::id_at(animal_hit);
                if let Some(kind) = crate::animals::net_catch(animal_hit) {
                    if let Some(item) = kind.fish_item() {
                        p.bag.add(item, 1);
                    }
                    /* MP: the server owns the herd, so tell it to drop
                     * this entity (a lethal hit removes it server-side);
                     * we already took the fish, so ignore its meat echo. */
                    if menu::state() == menu::GameState::InGameMp {
                        if let Some(id) = animal_id {
                            net_client::send_animal_hit(w.body.id as u32, id, 9999.0);
                        }
                    }
                    return;
                }
            }
            /* MP: the server owns the herd - send the swing, and let its
             * kill credit (AnimalState.killed_by) award the meat. The
             * local hit still runs for the instant flee reaction; its
             * meat return is ignored so kills aren't double-counted. */
            let mp = menu::state() == menu::GameState::InGameMp;
            let animal_id = crate::animals::id_at(animal_hit);
            let meat = crate::animals::hit(animal_hit, ATTACK_DAMAGE, eye_f);
            if mp {
                if let Some(id) = animal_id {
                    net_client::send_animal_hit(w.body.id as u32, id, ATTACK_DAMAGE);
                }
            } else if meat > 0 {
                p.bag.add(items::RAW_MEAT, meat);
            }
        }
        return;
    }

    /* Crop precedence: a plant under the reticle is BROKEN like a block
     * (no "harvest" prompt) - hold the mine button ~1 s and it pops,
     * dropping its produce/seeds. Wins when the crop is the nearest thing
     * under the reticle, so you break the plant, not the ground it grows
     * on. The break itself (bag drop + persist + MP relay) is applied by
     * the caller when `crop_break_s` fills; here we only run the timer. */
    let crop_dist = crate::crops::reticle_distance(w, p);
    if crop_dist < f32::MAX
        && (!block_hit || (crop_dist as f64) <= block_dist)
        && (torch_hit < 0 || crop_dist <= torch_dist_f)
    {
        s.has_target = true;
        s.is_crop_target = true;
        s.distance = crop_dist as f64;
        s.mining_progress_s = 0.0;
        s.mining_tile = -1;
        s.mining_depth = -1;
        /* Hold the mine button to break the plant, same as a block. Use
         * left_HELD (the continuous flag), not left_click (the one-frame
         * press edge) - the edge only ever added a single dt, so the timer
         * never reached CROP_BREAK_S and crops couldn't be harvested. */
        if input::state().left_held {
            s.crop_break_s += dt;
        } else {
            s.crop_break_s = 0.0;
        }
        return;
    }
    /* Not aiming at a crop - reset the break timer so a half-broken plant
     * doesn't finish when the reticle drifts back onto it later. */
    s.crop_break_s = 0.0;

    let target_torch = torch_hit >= 0 && (!block_hit || torch_dist_f as f64 <= block_dist);

    if target_torch {
        s.has_target = true;
        s.is_torch_target = true;
        s.torch_idx = torch_hit;
        s.distance = torch_dist_f as f64;
        /* Block fields stay zero - caller branches on is_torch_target. */
    } else if block_hit {
        s.has_target = true;
        s.hit_tile = block_tile;
        s.hit_depth = block_depth;
        s.place_tile = block_place_tile;
        s.place_depth = block_place_depth;
        s.distance = block_dist;
    }

    /* Reset mining timer when the block target changes (or there
     * isn't one). Mining progress is block-only - torches are
     * removed instantly on click in either mode. */
    let inp = input::state();
    let block_target_changed = target_torch
        || !block_hit
        || block_tile != s.mining_tile
        || block_depth != s.mining_depth;
    if block_target_changed {
        s.mining_progress_s = 0.0;
        s.mining_tile = if block_hit && !target_torch { block_tile } else { -1 };
        s.mining_depth = if block_hit && !target_torch { block_depth } else { -1 };
    }

    /* ---- Torch target click handling ----
     * Both creative and survival break torches instantly on the
     * left-click edge. Survival recovers a TORCH item back into
     * inventory; creative drops the torch on the floor (it was
     * effectively free anyway). The dirty-in-range walk re-bakes
     * per-vertex torch_light on every tile whose terrain was lit
     * by the removed torch. */
    if target_torch {
        if inp.left_click {
            /* Capture the full torch record BEFORE removing - we need
             * the body-local position + up vector + anchor tile so the
             * server's TORCH_DIFF REMOVE message can identify which
             * torch in its authoritative list to drop. After
             * torch_remove the slot is swap-overwritten and the data
             * is gone. */
            let slist = torch::list();
            let in_range = s.torch_idx >= 0 && s.torch_idx < torch::count();
            let tor_tile = if in_range {
                slist[s.torch_idx as usize].tile_idx
            } else {
                -1
            };
            let pos = torch::position_at(s.torch_idx);
            let up_v = if in_range {
                slist[s.torch_idx as usize].up
            } else {
                vec3_make(0.0, 1.0, 0.0)
            };
            println!(
                "[light] torch removed at tile {} - kicking relight; \
                 wall-clock blocking cost to follow on session-done line",
                s.torch_idx
            );
            torch::remove(s.torch_idx);
            w.dirty_in_range(pos, torch::LIGHT_RANGE_M);
            /* SP: same-frame persistence of the updated torch list.
             * MP: also forward the remove to the server so it can drop
             * the torch from its authoritative list, persist the
             * change, and broadcast a TORCH_DIFF to all room peers.
             * CLAUDE.md persistence rule applies to both modes. */
            sp_save_torches_after_change(w);
            if tor_tile >= 0 {
                /* C gate `w->body && tor_tile >= 0` - body is always
                 * present here. */
                net_client::send_torch(
                    /* place_op */ false,
                    w.body.id as u32,
                    tor_tile,
                    pos.x,
                    pos.y,
                    pos.z,
                    up_v.x,
                    up_v.y,
                    up_v.z,
                );
            }
            if p.survival_mode {
                /* Recover the torch. Route through bag::give (hotbar-first,
                 * then spill to the bag) - the same single collection path
                 * block / animal pickups use - so a FULL hotbar never
                 * silently eats the broken torch (the old inventory::add
                 * dropped it on the floor of a full hotbar). */
                let torch_item = tenebris_core::items::from_block(Block::Torch);
                crate::bag::give(&mut p.inventory, &mut p.bag, torch_item, 1);
            }
            /* Index is now invalid (swap-removed); clear it so the
             * HUD doesn't print stale state for the rest of this
             * frame. */
            s.is_torch_target = false;
            s.torch_idx = -1;
            s.has_target = false;
        }
        return;
    }

    if !s.has_target {
        return;
    }

    /* ---- Block target click handling (unchanged from before) ---- */
    let target_block = w.get(s.hit_tile, s.hit_depth);

    /* SURVIVAL: hold LMB on a block to mine it over its break time. The
     * mouse-held flag keeps the timer running across frames; releasing
     * resets progress so partial breaks don't carry to the next swing. */
    if blocks::is_unbreakable(target_block) {
        s.mining_progress_s = 0.0;
    } else if p.survival_mode {
        /* Tool-gating: rock (stone + tinted variants) needs a pickaxe.
         * The best pickaxe in the bag sets the mining tier; a block whose
         * required tier exceeds it can't be mined at all - that's what
         * makes the wood -> stone -> iron progression matter. */
        let best = best_tool_for(p, target_block);
        let tier = mining::tool_tier(best);
        if !mining::can_harvest(target_block, tier) {
            s.mining_progress_s = 0.0;
        } else if inp.left_held {
            /* Break time scales with the tool: the block's ideal tool
             * (pickaxe / axe / shovel) held in the bag mines it fast, and
             * a better pickaxe faster still, so crafting tools pays off. */
            let break_s = mining::break_time(&mining::config(), target_block, best);
            s.mining_progress_s += dt;
            if s.mining_progress_s >= break_s {
                w.set(s.hit_tile, s.hit_depth, Block::Air);
                net_client::send_edit(
                    proto::PLAYER_CMD_BREAK,
                    w.body.id as u32,
                    s.hit_tile,
                    s.hit_depth,
                    Block::Air as i32,
                );
                sp_save_tile_after_edit(w, s.hit_tile);
                /* The block's loot spawns as a floating pickup at the
                 * break site (Minecraft style) - walking near vacuums it
                 * into the hotbar / bag (see client::drops). */
                for d in mining::drops(target_block, tier) {
                    crate::drops::spawn(w, s.hit_tile, s.hit_depth, d.item, d.count);
                }
                /* Farming bootstrap: breaking grass has a config chance to
                 * drop a seed, so the plant -> grow -> harvest loop has a
                 * starting point. Deterministic per cell (hash2) so it
                 * doesn't depend on frame timing. The [0,1) roll is cut
                 * into stacked bands - berry seeds, then wheat seeds,
                 * then a wild carrot - so one hash decides which (if
                 * any) seed kind this cell yields. */
                if matches!(target_block, Block::Grass | Block::JungleGrass | Block::DryGrass) {
                    let cfg = tenebris_core::farming::config();
                    let roll = tenebris_core::rng::hash2(s.hit_tile, s.hit_depth);
                    let berry_top = cfg.grass_seed_chance;
                    let wheat_top = berry_top + cfg.wheat_seed_chance;
                    let carrot_top = wheat_top + cfg.carrot_chance;
                    if roll < berry_top {
                        crate::drops::spawn(w, s.hit_tile, s.hit_depth, items::SEEDS, 1);
                    } else if roll < wheat_top {
                        crate::drops::spawn(w, s.hit_tile, s.hit_depth, items::WHEAT_SEEDS, 1);
                    } else if roll < carrot_top {
                        crate::drops::spawn(w, s.hit_tile, s.hit_depth, items::CARROT, 1);
                    }
                }
                /* Flint bootstrap: mining plain rock has a config chance to
                 * chip off a flint - the tier-1 tool material - so the
                 * gather -> knap flint tools loop has a source. Ore rock is
                 * excluded (it already drops its resource). Deterministic
                 * per cell (salted hash) so it's frame-timing independent. */
                if matches!(
                    target_block,
                    Block::Stone | Block::CragRock | Block::FrostIce | Block::AsteroidRock | Block::Moon
                ) {
                    let roll = tenebris_core::rng::hash2(s.hit_tile ^ 0x5f3a, s.hit_depth);
                    if roll < mining::config().flint_from_stone_chance {
                        crate::drops::spawn(w, s.hit_tile, s.hit_depth, items::FLINT, 1);
                    }
                }
                /* One block mined = one use off the equipped tool. Charged
                 * on the SELECTED hotbar slot rather than on `best` (which
                 * is None when the tool is the wrong category for the
                 * block): swinging an iron pickaxe at dirt still wears it,
                 * so "1 use = 1 block" holds however you mine. */
                wear_selected_tool(p);
                s.mining_progress_s = 0.0;
            }
        } else {
            s.mining_progress_s = 0.0;
        }
    } else {
        /* Creative: instant break on the click edge, no inventory. */
        if inp.left_click {
            w.set(s.hit_tile, s.hit_depth, Block::Air);
            net_client::send_edit(
                proto::PLAYER_CMD_BREAK,
                w.body.id as u32,
                s.hit_tile,
                s.hit_depth,
                Block::Air as i32,
            );
            sp_save_tile_after_edit(w, s.hit_tile);
        }
        s.mining_progress_s = 0.0;
    }

    if inp.right_click {
        /* Aquarium USE comes first: right-clicking the tank with a water
         * bucket or a fish equipped USES that item on the tank rather than
         * placing / foraging. (The tank is a solid block, so the block
         * raycast set s.hit_tile/depth to it.) */
        if s.has_target
            && !s.is_torch_target
            && w.get(s.hit_tile, s.hit_depth) == Block::Aquarium
        {
            let held = inventory::selected_item(&p.inventory);
            /* Water bucket -> fill the tank (empties the bucket in place). */
            if held == Some(items::WATER_BUCKET) {
                let filled = {
                    let aq = w.block_entities.entry(s.hit_tile, s.hit_depth).aquarium_mut();
                    if aq.water {
                        false
                    } else {
                        aq.water = true;
                        true
                    }
                };
                if filled {
                    inventory::swap_selected(
                        &mut p.inventory,
                        items::WATER_BUCKET,
                        items::BUCKET,
                    );
                    /* World state (tank contents) - persist same-frame; MP
                     * picks it up via the periodic block-entity diff. */
                    sp_save_tile_after_edit(w, s.hit_tile);
                    /* Filling changed only the block-entity water flag, not
                     * a block byte, so `set` didn't dirty the tile. Dirty it
                     * so the water mesh rebuilds and draws the tank's water
                     * surface (which renders through the water shader). */
                    w.dirty_tile(s.hit_tile);
                }
                return;
            }
            /* A live fish -> drop it in. Needs water first (a dry glass box
             * can't hold a fish) and room in the tank; consumes one fish. */
            if let Some(kind) =
                held.and_then(tenebris_core::fauna::AnimalKind::from_fish_item)
            {
                let added = {
                    let aq = w.block_entities.entry(s.hit_tile, s.hit_depth).aquarium_mut();
                    aq.water && aq.add_fish(kind.to_u8())
                };
                if added {
                    inventory::consume(&mut p.inventory);
                    sp_save_tile_after_edit(w, s.hit_tile);
                }
                return;
            }
            /* Any OTHER held item (a placeable block, etc.) falls through to
             * the normal placement path below, so you can still build up
             * against a tank (e.g. extend a glass wall from an aquarium). */
        }
        /* Forage first: an empty (non-placeable) hand right-clicking a
         * grassy / rocky / leafy surface gathers loose grass / flint /
         * sticks off the ground without disturbing the terrain. Only in
         * survival (creative has nothing to gather); torch targets are
         * handled earlier and skipped here. */
        if p.survival_mode
            && s.has_target
            && !s.is_torch_target
            && !inventory::can_place(&p.inventory)
            && forage_surface(s, w)
        {
            return;
        }
        /* The topmost cell (depth = WORLD_MAX_DEPTH - 1) is reserved
         * as the planet's build cap - the layer above it is the
         * implicit-air sky boundary the floor / ceiling helpers
         * rely on, and placing a block here would put it flush
         * against that boundary with no air gap, breaking collision
         * (a player on top of such a block would have their head
         * past the cap). Reject the placement entirely; the click
         * is consumed as a no-op so the inventory keeps the block,
         * exactly as the user requested. */
        const MAX_BUILD_DEPTH: i32 = WORLD_MAX_DEPTH - 1;
        if s.place_depth >= 0
            && s.place_depth < MAX_BUILD_DEPTH
            && inventory::can_place(&p.inventory)
        {
            let to_place = inventory::selected(&p.inventory);
            if to_place == Block::Torch {
                /* A torch is NOT a hex block - it's an entity drawn
                 * by torch.rs. Place it sitting on top of the targeted
                 * solid block (s.hit_tile / s.hit_depth) with its
                 * up vector aligned to the local surface normal so it
                 * stands "up" everywhere on the sphere. The block
                 * grid stays untouched. */
                if let Some(tt) = w.grid.tile(s.hit_tile) {
                    /* Top face of the hit block sits at radius
                     * world_depth_to_radius_m(hit_depth + 1). */
                    let r_top = w.depth_to_radius_m(s.hit_depth + 1);
                    let base_dir = vec3_make(
                        tt.center.x as f32,
                        tt.center.y as f32,
                        tt.center.z as f32,
                    );
                    let base_pos = vec3_scale(base_dir, r_top as f32);
                    if torch::place(base_pos, base_dir, s.hit_tile) {
                        println!(
                            "[light] torch placed on tile {} - kicking \
                             relight; blocking cost to follow on \
                             session-done line",
                            s.hit_tile
                        );
                        /* Dirty every tile whose centre sits within
                         * the torch's light range - they need their
                         * per-vertex torch_light re-baked. The
                         * renderer's per-frame dirty sweep will
                         * remesh + re-upload affected chunks. */
                        w.dirty_in_range(base_pos, torch::LIGHT_RANGE_M);
                        sp_save_torches_after_change(w);
                        /* MP: tell the server. It applies to its
                         * authoritative torch list, persists to
                         * world-<seed>/body-<id>/torches.dat, and
                         * broadcasts a TORCH_DIFF to every room peer
                         * so other players see this torch. Sender
                         * receives the echo too but the local list
                         * deduplicates by position. */
                        // C gate `if (w->body)` - body always present.
                        net_client::send_torch(
                            /* place_op */ true,
                            w.body.id as u32,
                            s.hit_tile,
                            base_pos.x,
                            base_pos.y,
                            base_pos.z,
                            base_dir.x,
                            base_dir.y,
                            base_dir.z,
                        );
                        /* Creative placement is free - only survival
                         * spends the stack (count-less palette). */
                        if p.survival_mode {
                            inventory::consume(&mut p.inventory);
                        }
                    }
                }
            } else {
                /* Self-fall-through guard. If the placement target
                 * sits in the column the player is standing in AND at
                 * a depth the player's body occupies (feet voxel or
                 * head voxel), the new block would intersect the
                 * collision capsule and the ground-snap + camera-
                 * collider passes can spit the player downward
                 * through the floor before the next frame's collision
                 * resolves. Lift the player one voxel up first so the
                 * block lands UNDER their feet, and they're standing
                 * on top of the just-placed block instead of inside
                 * it. Cheap; only fires when the click actually
                 * targets the player's own column. */
                {
                    /* C gate `if (w->body)` - body always present. */
                    let feet_local = dvec3_sub(
                        p.position,
                        dvec3_make(w.body.pos_x, w.body.pos_y, w.body.pos_z),
                    );
                    let feet_r = dvec3_length(feet_local);
                    if feet_r > 1e-6 {
                        let feet_dir = dvec3_scale(feet_local, 1.0 / feet_r);
                        let feet_tile = w.grid.find_tile(feet_dir, p.last_tile);
                        let feet_depth = w.radius_to_depth(feet_r);
                        const PLAYER_VOXEL_SPAN: i32 = 2;
                        if feet_tile == s.place_tile
                            && s.place_depth >= feet_depth
                            && s.place_depth < feet_depth + PLAYER_VOXEL_SPAN
                        {
                            const BLOCK_HEIGHT_M: f64 = 1.0;
                            p.position =
                                dvec3_add(p.position, dvec3_scale(p.basis.up, BLOCK_HEIGHT_M));
                            /* Clear vy so the lift doesn't get
                             * immediately cancelled by the gravity
                             * tick's "you fell, snap back" path. */
                            let vy = dvec3_dot(p.velocity, p.basis.up);
                            if vy < 0.0 {
                                p.velocity =
                                    dvec3_sub(p.velocity, dvec3_scale(p.basis.up, vy));
                            }
                            p.grounded = false;
                            p.last_tile = -1;
                            eprintln!(
                                "[interact] self-place lift: tile={} depth={} \
                                 (feet={}) - moved player up 1 voxel before placing",
                                s.place_tile, s.place_depth, feet_depth
                            );
                        }
                    }
                }
                /* Place-on-flow override: if the target cell is
                 * already BLOCK_WATER (a flow cell from the sim) and
                 * the player is placing water on it, world_set
                 * early-returns because the block didn't change - so
                 * we need to explicitly promote the cell to a source.
                 * Clear its origin entry (a source has no origins
                 * itself) and set state to 0 (sleeping source: the
                 * sim treats state=0 BLOCK_WATER as a free-standing
                 * source supplier). User ask: "I should easily be
                 * able to override a flow block into a spawn block." */
                if to_place == Block::Water {
                    let existing = w.get(s.place_tile, s.place_depth);
                    if existing == Block::Water {
                        world_water::origin_clear(w, s.place_tile, s.place_depth);
                        world_water::set_state(w, s.place_tile, s.place_depth, 0u8);
                        world_water::enqueue(w, s.place_tile, s.place_depth);
                    }
                }
                w.set(s.place_tile, s.place_depth, to_place);
                /* A crop growing in the target cell is destroyed by the
                 * block placed over it (otherwise it lingers embedded in
                 * the terrain and its pick-sphere pokes out of the block
                 * face). Same-frame persistence, per the world-edit rule. */
                if crate::crops::clear_cell(w, s.place_tile, s.place_depth) {
                    crate::crops::sp_save_after_change(w);
                }
                /* Tech blocks record which tile edge their front faces so
                 * the cube renders turned toward the player who placed it
                 * (mirrors the JS placement). Recorded right next to the
                 * world_set, same frame as the tile save. */
                if tenebris_core::blocks::is_tech_block(to_place)
                    || to_place == Block::Bonfire
                    || tenebris_core::blocks::is_glassy(to_place)
                {
                    /* Glass + aquarium are drawn by aquarium_fx, which
                     * enumerates block_entities - so BOTH need an entity on
                     * placement or they render invisibly. Glass carries just
                     * a facing (its state stays None); the aquarium gets its
                     * AquariumState via init_machine_state below. */
                    let facing = w.facing_toward(s.place_tile, s.place_depth, p.position);
                    let e = w.block_entities.entry(s.place_tile, s.place_depth);
                    e.facing = facing;
                    /* Give machines their state up front so the machine
                     * tick + power graph see them (computers/printers must
                     * exist for the power gating). The bonfire needs its
                     * cook/burn state created here too. */
                    tenebris_core::block_entity::init_machine_state(e, to_place);
                }
                net_client::send_edit(
                    proto::PLAYER_CMD_PLACE,
                    w.body.id as u32,
                    s.place_tile,
                    s.place_depth,
                    to_place as i32,
                );
                sp_save_tile_after_edit(w, s.place_tile);
                /* Creative placement is free - only survival spends the
                 * stack (count-less palette). */
                if p.survival_mode {
                    inventory::consume(&mut p.inventory);
                }
            }
        }
    }
}

/// The discrete loose object the player SEES sitting on this tile, if any:
/// a scatter pebble (loose flint) or a leafy bush lump (snapped for sticks).
/// The scatter is pure mesh decoration baked from a per-tile hash, so this
/// re-rolls the same hash the mesher did rather than reading a block.
///
/// Shared by the bare-hands right-click [`forage_surface`] and the E-key
/// [`try_pickup_scatter`], so the pebble you can right-click is exactly the
/// pebble E picks up. Bushes are leafy, so they hand over STICK - the same
/// rule `forage_surface` applies to a Leaves surface.
/// Returns the item plus the player-facing name of the thing they can SEE
/// sitting there, so the aim prompt can say "pick up flint" / "pick up mossy
/// rock" instead of naming what it yields (the leafy mound gives sticks, but
/// "pick up stick" over a mossy rock reads like a bug). ASCII, no underscores
/// (CLAUDE.md in-game-text rule).
fn scatter_pickup_named(w: &World, tile_idx: i32) -> Option<(items::ItemId, &'static str)> {
    if crate::hex_mesher::tile_has_rock(w, tile_idx) {
        return Some((items::FLINT, "flint"));
    }
    if crate::hex_mesher::tile_has_bush(w, tile_idx) {
        return Some((items::STICK, "mossy rock"));
    }
    None
}

fn scatter_pickup_item(w: &World, tile_idx: i32) -> Option<items::ItemId> {
    scatter_pickup_named(w, tile_idx).map(|(item, _)| item)
}

/// What the E-key pickup would gather from the tile under the reticle, if
/// anything - the SINGLE source of truth shared by the aim prompt
/// (`[E] pick up flint`) and [`try_pickup_scatter`]. Because both ask this one
/// question, the prompt appears exactly when the pickup will actually fire:
/// if you can see the prompt, E works, and if you cannot, E was never going to.
pub fn pickup_target(
    s: &InteractState,
    w: &World,
    p: &PlayerCtrl,
) -> Option<(items::ItemId, &'static str)> {
    if !p.survival_mode || !s.has_target || s.is_torch_target {
        return None;
    }
    scatter_pickup_named(w, s.hit_tile)
}

/// E-key pickup: hover a loose scatter object (a flint pebble, a leafy bush
/// mound) and press Interact to gather it - no tool, no terrain edit, and no
/// empty-hand requirement, since E never places a block the way right-click
/// does. Returns true when something was gathered, so the caller skips the
/// inventory toggle; a reticle on plain ground returns false and E keeps its
/// normal meaning.
///
/// Deliberately scoped to the discrete scatter OBJECTS rather than the whole
/// of [`forage_surface`]: grass / stone / leaf surfaces are almost every tile
/// underfoot, so foraging those on E would swallow the inventory binding.
pub fn try_pickup_scatter(s: &InteractState, w: &mut World, p: &PlayerCtrl) -> bool {
    match pickup_target(s, w, p) {
        Some((item, _)) => {
            /* Spawn in the AIR cell above the surface, not inside the solid
             * ground block the ray hit: the drop's magnet pulls from the
             * player, and a pickup buried half a block under the floor starts
             * further away than it looks. Mining can spawn at hit_depth
             * because it has just turned that cell to air; foraging has not. */
            let air_depth = (s.hit_depth + 1).min(WORLD_MAX_DEPTH - 1);
            crate::drops::spawn(w, s.hit_tile, air_depth, item, 1);
            /* CONSUME the object: one pebble = one flint, ever. The taken
             * bit hides it from the prompt/pickup immediately and the
             * remesh (take_scatter dirties the tile) removes the visual.
             * Persisted on this same frame, per the world-edit rule. */
            w.take_scatter(s.hit_tile);
            sp_save_scatter_after_change(w);
            true
        }
        None => false,
    }
}

/// Forage the exposed surface of the targeted block: gather loose grass,
/// flint, or sticks off the ground as a floating pickup WITHOUT breaking
/// the terrain. This is the bare-hands survival gather (right-click a
/// surface with an empty hand) that seeds the flint-tool loop. The
/// decorative scatter you see (tufts, pebbles) is pure mesh decoration, so
/// this reads the underlying surface block instead. Returns true if the
/// click found something to forage (so the caller can treat it as handled).
fn forage_surface(s: &InteractState, w: &mut World) -> bool {
    /* The loose object sitting on the tile wins over the ground it rests
     * on - see `scatter_pickup_item`. This is the "pick the rock up off
     * the ground" the player sees, and it seeds the whole flint-tool loop.
     * Like the E pickup, gathering it CONSUMES it (taken bit + remesh +
     * same-frame save) - one pebble is one flint, not an infinite well.
     * The bare-surface forage below stays unlimited by design (grass
     * fields, stone faces). */
    if let Some(item) = scatter_pickup_item(w, s.hit_tile) {
        crate::drops::spawn(w, s.hit_tile, s.hit_depth, item, 1);
        w.take_scatter(s.hit_tile);
        sp_save_scatter_after_change(w);
        return true;
    }
    let top = w.get(s.hit_tile, s.hit_depth);
    let item = match top {
        /* Grassy sods of every biome collapse to one grass item, matching
         * the mining drop rule. */
        Block::Grass
        | Block::SeqGrass
        | Block::JungleGrass
        | Block::DryGrass
        | Block::DirtGrass
        | Block::SeqDirtGrass => items::from_block(Block::Grass),
        /* Loose rock chips off the surface as flint. */
        Block::Stone | Block::CragRock | Block::FrostIce | Block::AsteroidRock | Block::Moon => {
            items::FLINT
        }
        /* Snap sticks off low foliage. */
        Block::Leaves | Block::SeqLeaves => items::STICK,
        _ => return false,
    };
    crate::drops::spawn(w, s.hit_tile, s.hit_depth, item, 1);
    true
}

#[cfg(test)]
mod durability_tests {
    use super::*;
    use crate::inventory::InvSlot;

    fn player_holding(item: items::ItemId, dur: u16) -> PlayerCtrl {
        let mut p = PlayerCtrl::default();
        p.survival_mode = true;
        inventory::init_empty(&mut p.inventory);
        p.inventory.slots[0] = InvSlot { item, count: 1, dur };
        p.inventory.selected = 0;
        p
    }

    /// One block mined = one use. The headline rule.
    #[test]
    fn mining_a_block_spends_one_use() {
        let cfg = mining::config();
        let budget = mining::tool_max_uses(&cfg, items::WOOD_PICKAXE).unwrap();
        let mut p = player_holding(items::WOOD_PICKAXE, 0); /* fresh */
        wear_selected_tool(&mut p);
        assert_eq!(
            mining::uses_left(&cfg, items::WOOD_PICKAXE, p.inventory.slots[0].dur),
            Some(budget - 1)
        );
        wear_selected_tool(&mut p);
        assert_eq!(
            mining::uses_left(&cfg, items::WOOD_PICKAXE, p.inventory.slots[0].dur),
            Some(budget - 2)
        );
    }

    /// The tool is destroyed on its last use and the slot is emptied - it
    /// must not linger at 0 uses (which reads as "fresh" by the sentinel
    /// rule and would mine forever).
    #[test]
    fn tool_breaks_and_clears_its_slot_on_the_last_use() {
        let mut p = player_holding(items::WOOD_PICKAXE, 2);
        wear_selected_tool(&mut p);
        assert_eq!(p.inventory.slots[0].item, items::WOOD_PICKAXE, "1 use left, still alive");
        assert_eq!(p.inventory.slots[0].dur, 1);

        wear_selected_tool(&mut p);
        assert_eq!(p.inventory.slots[0].count, 0, "spent tool should be gone");
        assert_eq!(p.inventory.slots[0].item, Block::Air as u16);
        assert_eq!(p.inventory.slots[0].dur, 0, "cleared slot must carry no wear");
    }

    /// Mining with a block / resource / budget-less tool selected is a
    /// no-op, so the break site can call this unconditionally.
    #[test]
    fn non_tools_are_untouched() {
        for item in [items::from_block(Block::Stone), items::COAL, items::HOE] {
            let mut p = player_holding(item, 0);
            let before = p.inventory.slots[0];
            wear_selected_tool(&mut p);
            assert_eq!(p.inventory.slots[0], before, "{item} should not wear");
        }
    }

    /// Only the equipped (selected) slot wears - a spare pickaxe sitting in
    /// another hotbar slot doesn't erode while you mine.
    #[test]
    fn only_the_selected_slot_wears() {
        let mut p = player_holding(items::WOOD_PICKAXE, 50);
        p.inventory.slots[1] = InvSlot { item: items::IRON_PICKAXE, count: 1, dur: 60 };
        wear_selected_tool(&mut p);
        assert_eq!(p.inventory.slots[0].dur, 49, "equipped tool wears");
        assert_eq!(p.inventory.slots[1].dur, 60, "spare tool must not wear");
    }

    /// An empty selected slot (bare hands) is a no-op, not a panic.
    #[test]
    fn bare_hands_is_a_no_op() {
        let mut p = PlayerCtrl::default();
        inventory::init_empty(&mut p.inventory);
        wear_selected_tool(&mut p);
        assert_eq!(p.inventory.slots[0].count, 0);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::client_kv::test_support;
    use tenebris_core::math::dvec3_cross;
    use tenebris_core::planet::{self, BodyId};

    /* Pins generated from the C build: target/c-harness/
     * interact_harness.c + interact_stub.c compiled with gcc 13.2
     * against the verbatim interact.c / inventory.c / core tree
     * (output: target/c-harness/interact_pins.txt). The scenario
     * script in `pinned_interact_suite` runs in LOCKSTEP with the
     * harness main() - same world (Tenebris, subdiv 3, full gen,
     * compiled-in config defaults), same pose edits, same input
     * edges, same order. Distances are pinned as f64 bit patterns -
     * the raycast step is 0.25 m (exact in binary) so distances are
     * step-quantized and bit-stable across libms. */

    const DT: f32 = 1.0 / 60.0;
    /// C: `-(float)1.57079632679489661923` (pi/2 rounded to f32).
    const PITCH_DOWN: f32 = -(std::f64::consts::FRAC_PI_2 as f32);

    fn fnv1a64(bytes: &[u8]) -> u64 {
        let mut h: u64 = 14695981039346656037;
        for &b in bytes {
            h ^= b as u64;
            h = h.wrapping_mul(1099511628211);
        }
        h
    }

    fn gen_world(id: BodyId) -> World {
        let body = planet::get(id);
        let mut w = World::create(&body, 3);
        while !w.gen_complete() {
            w.stream_gen(4096);
        }
        w
    }

    /// Player pose matching the harness: standing on the +X prime
    /// meridian with an axis-aligned tangent basis.
    fn player_on_x_axis(pos: DVec3) -> PlayerCtrl {
        let mut p = PlayerCtrl::default();
        p.position = pos;
        p.basis.up = dvec3_make(1.0, 0.0, 0.0);
        p.basis.fwd = dvec3_make(0.0, 1.0, 0.0);
        p.basis.right = dvec3_make(0.0, 0.0, 1.0);
        p.basis_ready = true;
        p.last_tile = -1;
        inventory::init_creative(&mut p.inventory);
        /* Harness parity: the C creative preset stocked every slot at
         * 9999 and its consume decremented through it. Rust creative is
         * now a count-less palette (count 1, no consume), so re-stock
         * the C counts explicitly - the suite's count pins (E..J) all
         * run in survival mode, where consume/add still apply. */
        for s in p.inventory.slots.iter_mut() {
            s.count = 9999;
        }
        p
    }

    /// Drive the real menu module into the state the C harness ran
    /// under: `menu_state() == GAME_IN_GAME_SP` with `name` as the
    /// active world, so the SP persistence gate opens.
    fn enter_sp_world(name: &str) {
        menu::force_state(menu::GameState::InGameSp);
        menu::test_set_active_world(name);
    }

    /// Park the menu outside GAME_IN_GAME_SP (gate closed).
    fn leave_sp_world() {
        menu::force_state(menu::GameState::MainMenu);
        menu::test_set_active_world("");
    }

    fn left_click(on: bool) {
        input::state_mut(|i| i.left_click = on);
    }
    fn left_held(on: bool) {
        input::state_mut(|i| i.left_held = on);
    }
    fn right_click(on: bool) {
        input::state_mut(|i| i.right_click = on);
    }

    /// One frame with a one-frame right-click edge.
    fn place_frame(s: &mut InteractState, w: &mut World, p: &mut PlayerCtrl) {
        right_click(true);
        update(s, w, p, DT);
        right_click(false);
    }

    #[allow(clippy::too_many_arguments)]
    fn assert_target(
        s: &InteractState,
        has: bool,
        torch: bool,
        hit_tile: i32,
        hit_depth: i32,
        place_tile: i32,
        place_depth: i32,
        dist_bits: u64,
        mining_tile: i32,
        mining_depth: i32,
        tag: &str,
    ) {
        assert_eq!(s.has_target, has, "{tag}: has_target");
        assert_eq!(s.is_torch_target, torch, "{tag}: is_torch_target");
        assert_eq!(s.hit_tile, hit_tile, "{tag}: hit_tile");
        assert_eq!(s.hit_depth, hit_depth, "{tag}: hit_depth");
        assert_eq!(s.place_tile, place_tile, "{tag}: place_tile");
        assert_eq!(s.place_depth, place_depth, "{tag}: place_depth");
        assert_eq!(
            s.distance.to_bits(),
            dist_bits,
            "{tag}: distance {} (bits {:016x} vs {:016x})",
            s.distance,
            s.distance.to_bits(),
            dist_bits
        );
        assert_eq!(s.mining_tile, mining_tile, "{tag}: mining_tile");
        assert_eq!(s.mining_depth, mining_depth, "{tag}: mining_depth");
    }

    /// FNV over the persisted column for (pinhome, body 0, tile),
    /// straight out of the kv store the same way the C recorder
    /// hashed the column it was handed.
    fn saved_tile_fnv(tile: i32) -> u64 {
        let col = persistence::load_tile("pinhome", 0, tile)
            .expect("tile column persisted same-frame");
        fnv1a64(&col)
    }

    /* One sequential test mirroring the C harness running A..L in a
     * single process so world + inventory + torch state evolve
     * identically. */
    #[test]
    fn pinned_interact_suite() {
        let _g = test_support::begin("interact_suite");
        input::init();
        torch::shutdown();
        crate::drops::init();
        enter_sp_world("pinhome");

        let mut w = gen_world(BodyId::Tenebris);
        let mut p = player_on_x_axis(dvec3_make(302.0, 0.0, 0.0));
        let mut s = InteractState::default();

        /* ---- A: look straight down ----
         * C pin: a=1,0,41,63,41,64,400e000000000000,41,63 (3.75 m). */
        p.pitch = PITCH_DOWN;
        update(&mut s, &mut w, &mut p, DT);
        assert_target(&s, true, false, 41, 63, 41, 64, 0x400e000000000000, 41, 63, "a");

        /* ---- B: horizon - no target within 8 m; block fields keep
         * their stale A values, mining target resets.
         * C pin: b=0,0,41,63,41,64,400e000000000000,-1,-1. */
        p.pitch = 0.0;
        update(&mut s, &mut w, &mut p, DT);
        assert_target(&s, false, false, 41, 63, 41, 64, 0x400e000000000000, -1, -1, "b");

        /* ---- C: down-forward at -0.5 rad.
         * C pin: c=1,0,41,63,41,64,401f000000000000,41,63 (7.75 m). */
        p.pitch = -0.5;
        update(&mut s, &mut w, &mut p, DT);
        assert_target(&s, true, false, 41, 63, 41, 64, 0x401f000000000000, 41, 63, "c");

        /* ---- D: creative instant break on the click edge.
         * C pin: d=41,63,2,0 (Sand -> Air);
         *        d_save=pinhome,0,41,336acbf5ad2e8a32. */
        p.pitch = PITCH_DOWN;
        update(&mut s, &mut w, &mut p, DT); /* re-acquire the down target */
        let (d_tile, d_depth) = (s.hit_tile, s.hit_depth);
        assert_eq!((d_tile, d_depth), (41, 63), "d: target");
        assert_eq!(w.get(d_tile, d_depth), Block::Sand, "d: block before");
        left_click(true);
        update(&mut s, &mut w, &mut p, DT);
        left_click(false);
        assert_eq!(w.get(d_tile, d_depth), Block::Air, "d: block after");
        assert_eq!(saved_tile_fnv(41), 0xea66e26d5b68c367, "d_save: column fnv");

        /* ---- E: survival mining - hold LMB until the break fires.
         * Dirt broken bare-handed: soft_break_s(2.50) * hand_penalty(2.0)
         * = 5.0s of accumulated dt (tool-gated mining makes bare hands
         * slow - a shovel would cut this to 2.5s). Pickup stacks Dirt to
         * 10000 on slot 2, everything else untouched. */
        p.survival_mode = true;
        left_held(true);
        let mut e_frames = 0;
        let (mut e_tile, mut e_depth) = (-1, -1);
        loop {
            update(&mut s, &mut w, &mut p, DT);
            e_frames += 1;
            if e_frames == 1 {
                e_tile = s.hit_tile;
                e_depth = s.hit_depth;
                assert_eq!((e_tile, e_depth), (41, 62), "e: target");
                assert_eq!(w.get(e_tile, e_depth), Block::Dirt, "e: block");
            }
            if w.get(e_tile, e_depth) == Block::Air || e_frames > 600 {
                break;
            }
        }
        left_held(false);
        assert_eq!(e_frames, 300, "e: frames to mine (5.0s / (1/60) f32 accum)");
        assert_eq!(saved_tile_fnv(41), 0xa2e439a42e765eec, "e_save: column fnv");
        /* The dirt now drops as a floating pickup at the break site
         * (cell 62 mid sits ~4 m below the eye - outside magnet range,
         * as designed: you walk over loot to collect). Step the player
         * onto the hole, tick the drops system until the magnet +
         * pickup fire, then restore the pose so the placement pins
         * below run from the original spot. */
        assert_eq!(crate::drops::count(), 1, "e: one drop spawned");
        let e_saved_pos = p.position;
        p.position = dvec3_make(299.6, 0.0, 0.0);
        for _ in 0..600 {
            crate::drops::update(DT, &mut p);
            if crate::drops::count() == 0 {
                break;
            }
        }
        p.position = e_saved_pos;
        assert_eq!(crate::drops::count(), 0, "e: drop collected");
        let want_inv: [(Block, i32); 9] = [
            (Block::Torch, 9999),
            (Block::Stone, 9999),
            (Block::Dirt, 10000), /* the pickup */
            (Block::Grass, 9999),
            (Block::Sand, 9999),
            (Block::Wood, 9999),
            (Block::Leaves, 9999),
            (Block::Ice, 9999),
            (Block::Water, 9999),
        ];
        for (i, (ty, n)) in want_inv.iter().enumerate() {
            assert_eq!(p.inventory.slots[i].block_type(), *ty, "e_inv{i}: type");
            assert_eq!(p.inventory.slots[i].count, *n, "e_inv{i}: count");
        }

        /* ---- F: place stone into the dug hole.
         * C pin: f=41,62,5,9998 (placed at the prev-air cell, slot 1
         * decrements - the C consume guard is strict `> 9999`);
         * f_save fnv 0dc1e72675d02284. */
        inventory::select(&mut p.inventory, 1);
        place_frame(&mut s, &mut w, &mut p);
        assert_eq!((s.place_tile, s.place_depth), (41, 62), "f: place cell");
        assert_eq!(w.get(41, 62), Block::Stone, "f: placed");
        assert_eq!(p.inventory.slots[1].count, 9998, "f: consumed");
        assert_eq!(saved_tile_fnv(41), 0x5b6190db0183fa71, "f_save: column fnv");

        /* ---- G: keep placing straight down; placements walk up the
         * column (63,64,65) until the place cell reaches the feet
         * voxel, then the self-place lift fires twice (66 -> x=303,
         * 67 -> x=304). C pins g0..g4. */
        let g_pins: [(i32, u64); 5] = [
            (63, 0x4072e00000000000), /* 302.0 - no lift   */
            (64, 0x4072e00000000000),
            (65, 0x4072e00000000000),
            (66, 0x4072f00000000000), /* 303.0 - lift #1   */
            (67, 0x4073000000000000), /* 304.0 - lift #2   */
        ];
        for (k, (want_depth, want_x)) in g_pins.iter().enumerate() {
            place_frame(&mut s, &mut w, &mut p);
            assert_eq!(s.place_depth, *want_depth, "g{k}: place_depth");
            assert_eq!(w.get(s.place_tile, s.place_depth), Block::Stone, "g{k}: placed");
            assert_eq!(p.position.x.to_bits(), *want_x, "g{k}: pos.x");
            assert!(!p.grounded, "g{k}: grounded");
            assert_eq!(p.last_tile, -1, "g{k}: last_tile");
        }

        /* ---- H: water-on-flow source promotion. Re-anchor at 302
         * (eye inside the depth-67 tower top -> immediate hit, place
         * cell = 68 above it), seed a level-3 flow cell with one
         * origin at (41,68), then place water on it.
         * C pins: h0=3,1,51 -> h=41,67,41,68,1,0,0,51 (still WATER,
         * state promoted to 0 = sleeping source, origins cleared,
         * already-queued cell dedups); h_save fnv 839673e9a82ba4f6;
         * slot 8 consumed to 9998. */
        p.position = dvec3_make(302.0, 0.0, 0.0);
        p.last_tile = -1;
        let ptile = s.place_tile;
        assert_eq!(ptile, 41, "h: column under test");
        w.set(ptile, 68, Block::Water);
        world_water::set_state(&mut w, ptile, 68, 0x03); /* flow, level 3 */
        world_water::origin_add(
            &mut w,
            ptile,
            68,
            world_water::OriginRef { tile: ptile as u32, depth: 67 },
        );
        assert_eq!(world_water::get_state(&w, ptile, 68), 0x03, "h0: state");
        assert_eq!(world_water::origin_count(&w, ptile, 68), 1, "h0: origins");
        assert_eq!(world_water::pending(&w), 51, "h0: pending");
        inventory::select(&mut p.inventory, 8);
        place_frame(&mut s, &mut w, &mut p);
        assert_eq!((s.hit_tile, s.hit_depth), (41, 67), "h: hit");
        assert_eq!((s.place_tile, s.place_depth), (41, 68), "h: place");
        assert_eq!(w.get(ptile, 68), Block::Water, "h: still water");
        assert_eq!(world_water::get_state(&w, ptile, 68), 0, "h: promoted to source");
        assert_eq!(world_water::origin_count(&w, ptile, 68), 0, "h: origins cleared");
        assert_eq!(world_water::pending(&w), 51, "h: pending");
        assert_eq!(p.inventory.slots[8].count, 9998, "h: water consumed");
        assert_eq!(saved_tile_fnv(41), 0x5a6c1692308e8007, "h_save: column fnv");

        /* ---- I: torch placement on the tower top. Base sits on the
         * top face of hit block 67 (r_top = 304) along the f32 tile
         * centre - tile 41's centre is exactly (1,0,0).
         * C pin: i=1,41,43980000,0,0,3f800000,0,0,3f38240b,9998;
         * i_tsave=1,0,46f62f6d2dc76670,1. */
        inventory::select(&mut p.inventory, 0);
        place_frame(&mut s, &mut w, &mut p);
        assert_eq!(torch::count(), 1, "i: torch placed");
        let t0 = torch::list()[0];
        assert_eq!(t0.tile_idx, 41, "i: anchor tile");
        assert_eq!(t0.position.x.to_bits(), 0x43980000, "i: base x (304.0)");
        assert_eq!(t0.position.y.to_bits(), 0, "i: base y");
        assert_eq!(t0.position.z.to_bits(), 0, "i: base z");
        assert_eq!(t0.up.x.to_bits(), 0x3f800000, "i: up x");
        assert_eq!(t0.up.y.to_bits(), 0, "i: up y");
        assert_eq!(t0.up.z.to_bits(), 0, "i: up z");
        assert_eq!(t0.flicker_phase.to_bits(), 0x3f38240b, "i: flicker");
        assert_eq!(p.inventory.slots[0].count, 9998, "i: torch consumed");
        /* Same-frame torch snapshot: hash the persisted entries in
         * the C recorder's layout (tile i32 LE + pos[3] + up[3] f32
         * LE). */
        let saved = persistence::load_torches("pinhome", 0);
        assert_eq!(saved.len(), 1, "i_tsave: one torch persisted");
        let mut bytes = Vec::new();
        for t in &saved {
            bytes.extend_from_slice(&t.tile_idx.to_le_bytes());
            for v in t.pos {
                bytes.extend_from_slice(&v.to_le_bytes());
            }
            for v in t.up {
                bytes.extend_from_slice(&v.to_le_bytes());
            }
        }
        assert_eq!(fnv1a64(&bytes), 0x46f62f6d2dc76670, "i_tsave: fnv");

        /* ---- J: re-anchor 2 m above the torch; the torch raycast
         * wins over the block hit; left-click removes it, survival
         * recovers a TORCH item, snapshot clears.
         * C pins: j0=1,0,3ff3ae0d00000000; j=0,0,2,9999,0. */
        let centre = w.grid.tile(ptile).expect("tile 41").center;
        let r_top = w.depth_to_radius_m(68);
        p.position = dvec3_scale(centre, r_top + 0.4);
        p.basis.up = centre;
        p.basis.fwd = dvec3_normalize(dvec3_cross(centre, dvec3_make(0.0, 0.0, 1.0)));
        p.basis.right = dvec3_cross(p.basis.fwd, p.basis.up);
        p.pitch = PITCH_DOWN;
        p.yaw = 0.0;
        p.last_tile = -1;
        update(&mut s, &mut w, &mut p, DT);
        assert!(s.is_torch_target, "j0: torch target");
        assert_eq!(s.torch_idx, 0, "j0: torch idx");
        assert_eq!(s.distance.to_bits(), 0x3ff3ae0d00000000, "j0: torch dist");
        left_click(true);
        update(&mut s, &mut w, &mut p, DT);
        left_click(false);
        assert_eq!(torch::count(), 0, "j: torch removed");
        assert!(persistence::load_torches("pinhome", 0).is_empty(), "j: snapshot cleared");
        assert_eq!(p.inventory.slots[0].count, 9999, "j: TORCH recovered");
        assert!(!s.has_target, "j: target cleared same frame");
    }

    /* Off-origin body: the raycast must subtract the body centre.
     * C pins: l=1,0,41,66,41,67,3fe8000000000000,41,66 with Luna at
     * (0, 6000, 0), radius 80, id 1. */
    #[test]
    fn pinned_raycast_off_origin_body() {
        let _g = test_support::begin("interact_luna");
        input::init();
        torch::shutdown();

        let luna = planet::get(BodyId::Luna);
        assert_eq!(luna.id as u32, 1, "l_body: id");
        assert_eq!(luna.pos_x.to_bits(), 0, "l_body: pos_x");
        assert_eq!(luna.pos_y.to_bits(), 0x40b7700000000000, "l_body: pos_y (6000)");
        assert_eq!(luna.pos_z.to_bits(), 0, "l_body: pos_z");
        assert_eq!(luna.radius_m.to_bits(), 0x4054000000000000, "l_body: radius (80)");

        let mut w = gen_world(BodyId::Luna);
        let mut p = player_on_x_axis(dvec3_make(
            luna.pos_x + luna.radius_m + 2.0,
            luna.pos_y,
            luna.pos_z,
        ));
        p.pitch = PITCH_DOWN;
        let mut s = InteractState::default();
        update(&mut s, &mut w, &mut p, DT);
        assert_target(&s, true, false, 41, 66, 41, 67, 0x3fe8000000000000, 41, 66, "l");
    }

    /* ---- Behavioral (non-pin) coverage ---- */

    #[test]
    fn space_mode_skips_raycast() {
        let _g = test_support::begin("interact_space");
        input::init();
        torch::shutdown();
        let mut w = gen_world(BodyId::Tenebris);
        let mut p = player_on_x_axis(dvec3_make(302.0, 0.0, 0.0));
        p.pitch = PITCH_DOWN;
        p.is_in_space = true;
        let mut s = InteractState {
            mining_progress_s: 0.5,
            ..Default::default()
        };
        update(&mut s, &mut w, &mut p, DT);
        assert!(!s.has_target);
        assert!(!s.is_torch_target);
        assert_eq!(s.torch_idx, -1);
        /* Early return: mining progress is left for the
         * reset-on-target-change branch after landing. */
        assert_eq!(s.mining_progress_s, 0.5);
    }

    #[test]
    fn sp_gate_off_skips_persistence_but_still_edits() {
        let _g = test_support::begin("interact_gate_off");
        input::init();
        torch::shutdown();
        /* Menu not in GAME_IN_GAME_SP (MP or menu screens): the world
         * edit applies, nothing is persisted. */
        leave_sp_world();
        let mut w = gen_world(BodyId::Tenebris);
        let mut p = player_on_x_axis(dvec3_make(302.0, 0.0, 0.0));
        p.pitch = PITCH_DOWN;
        let mut s = InteractState::default();
        left_click(true);
        update(&mut s, &mut w, &mut p, DT);
        left_click(false);
        assert_eq!(w.get(41, 63), Block::Air, "edit applied");
        assert!(persistence::load_tile("pinhome", 0, 41).is_none(), "no SP write");
        assert!(persistence::list_saved_tiles("pinhome", 0).is_empty());
    }

    #[test]
    fn unbreakable_block_resets_mining() {
        let _g = test_support::begin("interact_bedrock");
        input::init();
        torch::shutdown();
        enter_sp_world("pinhome");
        let mut w = gen_world(BodyId::Tenebris);
        let mut p = player_on_x_axis(dvec3_make(302.0, 0.0, 0.0));
        p.pitch = PITCH_DOWN;
        p.survival_mode = true;
        /* Swap the down-target for bedrock. */
        w.set(41, 63, Block::Bedrock);
        let mut s = InteractState::default();
        left_held(true);
        for _ in 0..120 {
            update(&mut s, &mut w, &mut p, DT);
            assert_eq!(s.mining_progress_s, 0.0, "progress pinned at 0");
        }
        left_held(false);
        assert_eq!(w.get(41, 63), Block::Bedrock, "bedrock survives");
    }

    #[test]
    fn releasing_lmb_resets_mining_progress() {
        let _g = test_support::begin("interact_release_resets");
        input::init();
        torch::shutdown();
        enter_sp_world("pinhome");
        let mut w = gen_world(BodyId::Tenebris);
        let mut p = player_on_x_axis(dvec3_make(302.0, 0.0, 0.0));
        p.pitch = PITCH_DOWN;
        p.survival_mode = true;
        let mut s = InteractState::default();
        /* 30 held frames: progress accumulates but no break (< 0.8 s). */
        left_held(true);
        for _ in 0..30 {
            update(&mut s, &mut w, &mut p, DT);
        }
        assert!(s.mining_progress_s > 0.0);
        assert_eq!(w.get(41, 63), Block::Sand, "not broken yet");
        /* Release: progress resets, partial breaks don't carry. */
        left_held(false);
        update(&mut s, &mut w, &mut p, DT);
        assert_eq!(s.mining_progress_s, 0.0, "reset on release");
        assert_eq!(w.get(41, 63), Block::Sand);
    }

    /// Progression-critical: a visible scatter pebble is loose flint. On any
    /// tile that carries a decorative rock, foraging must hand over FLINT no
    /// matter which ground block it rests on (grass/dirt/sand), because the
    /// flint tool tree is otherwise unreachable. Regresses the bug where the
    /// player could see rocks on the ground but never pick flint off them.
    #[test]
    fn forage_picks_flint_off_a_scatter_rock() {
        let mut w = gen_world(BodyId::Tenebris);
        /* Find the first land tile the mesher decorates with a rock, and its
         * exposed surface depth (topmost solid). tile_has_rock is the exact
         * predicate build_scatter uses, so this is a real, visible pebble. */
        let mut rock_tile = -1;
        let mut rock_depth = -1;
        'scan: for tile in 0..w.grid.tile_count() {
            if !crate::hex_mesher::tile_has_rock(&w, tile) {
                continue;
            }
            for d in (0..WORLD_MAX_DEPTH - 1).rev() {
                if w.get(tile, d) != Block::Air {
                    rock_tile = tile;
                    rock_depth = d;
                    break 'scan;
                }
            }
        }
        assert!(rock_tile >= 0, "Tenebris subdiv3 should scatter some rocks");

        crate::drops::init();
        let mut s = InteractState::default();
        s.has_target = true;
        s.hit_tile = rock_tile;
        s.hit_depth = rock_depth;
        assert!(forage_surface(&s, &mut w), "a rock tile forages something");
        assert_eq!(crate::drops::count(), 1, "one drop spawned");
        assert_eq!(
            crate::drops::test_items(),
            vec![items::FLINT],
            "the pebble yields flint, not grass/nothing"
        );

        /* The gather CONSUMED the pebble: the tile stops advertising a rock
         * (prompt + pickup both go through tile_has_rock), so a second
         * forage on the same spot must not mint more flint off it. */
        assert!(
            !crate::hex_mesher::tile_has_rock(&w, rock_tile),
            "picked pebble is gone - no infinite flint"
        );
    }

    /// E (Interact) on a loose scatter object picks it up: hovering a visible
    /// pebble and pressing E must hand over flint, with a tool / block in hand
    /// (E never places, so unlike right-click forage it has no empty-hand
    /// gate). Regresses "cant pick up flint from the ground with E".
    #[test]
    fn e_pickup_takes_flint_off_a_scatter_rock() {
        let mut w = gen_world(BodyId::Tenebris);
        let mut rock_tile = -1;
        let mut rock_depth = -1;
        'scan: for tile in 0..w.grid.tile_count() {
            if !crate::hex_mesher::tile_has_rock(&w, tile) {
                continue;
            }
            for d in (0..WORLD_MAX_DEPTH - 1).rev() {
                if w.get(tile, d) != Block::Air {
                    rock_tile = tile;
                    rock_depth = d;
                    break 'scan;
                }
            }
        }
        assert!(rock_tile >= 0, "Tenebris subdiv3 should scatter some rocks");

        crate::drops::init();
        let mut p = PlayerCtrl::default();
        p.survival_mode = true;
        let mut s = InteractState::default();
        s.has_target = true;
        s.hit_tile = rock_tile;
        s.hit_depth = rock_depth;
        assert!(try_pickup_scatter(&s, &mut w, &p), "E picks the pebble up");
        assert_eq!(
            crate::drops::test_items(),
            vec![items::FLINT],
            "E on a pebble yields flint"
        );

        /* Consumption: the same E on the same tile must find NOTHING - one
         * pebble is one flint, not an infinite well. Regresses "I can just
         * get infinite flint from grabbing it constantly". */
        crate::drops::init();
        assert!(
            !try_pickup_scatter(&s, &mut w, &p),
            "second E on the same pebble finds nothing"
        );
        assert_eq!(crate::drops::count(), 0, "no drop from a consumed pebble");
        assert!(
            pickup_target(&s, &w, &p).is_none(),
            "the aim prompt is gone too - prompt and pickup share one source"
        );

        /* No target under the reticle -> E must fall through so it keeps
         * toggling the inventory instead of silently eating the keypress. */
        crate::drops::init();
        let mut none = InteractState::default();
        none.has_target = false;
        assert!(
            !try_pickup_scatter(&none, &mut w, &p),
            "no target: E falls through to the inventory toggle"
        );
        assert_eq!(crate::drops::count(), 0, "nothing spawned without a target");
    }
}
