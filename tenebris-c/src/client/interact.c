#include "client/interact.h"
#include "client/input.h"
#include "client/menu.h"
#include "client/net_client.h"
#include "client/persistence.h"
#include "client/torch.h"
#include "core/blocks.h"
#include "core/proto.h"        /* PLAYER_CMD_PLACE / PLAYER_CMD_BREAK */
#include <math.h>

/* ----------------------------------------------------------------- */
/* SP per-edit persistence helpers. CLAUDE.md mandates that every
 * block place/break and every torch place/remove write to durable
 * storage on the same input frame. MP routes the edit through the
 * server (saves_write_tile fires there); SP has no server, so the
 * call lands here.
 *
 * Gated on menu_state() == GAME_IN_GAME_SP — in MP the local cache
 * would diverge from the server's authoritative state on rejoin,
 * which is worse than no cache at all. */

static bool sp_active_for_world(const world_t* w) {
    if (!w || !w->body) return false;
    if (menu_state() != GAME_IN_GAME_SP) return false;
    const char* name = menu_active_world();
    return (name && *name);
}

static void sp_save_tile_after_edit(const world_t* w, int tile_idx) {
    if (!sp_active_for_world(w)) return;
    if (tile_idx < 0 || tile_idx >= w->tile_count) return;
    const uint8_t* col = &w->blocks[(size_t)tile_idx * WORLD_MAX_DEPTH];
    persistence_save_tile(menu_active_world(),
                          (uint32_t)w->body->id, tile_idx, col);
}

static void sp_save_torches_after_change(const world_t* w) {
    if (!sp_active_for_world(w)) return;
    /* Snapshot every torch anchored on THIS body. The torch list is
     * one global array; filter by tile_idx range under the body's
     * goldberg grid using the position projection torch_position_at
     * already exposes. Cheap (~256 entries max). */
    int total = torch_count();
    persistence_torch_t buf[TORCH_MAX_COUNT];
    int n = 0;
    const torch_t* list = torch_list();
    for (int i = 0; i < total && n < TORCH_MAX_COUNT; ++i) {
        if (list[i].tile_idx < 0 || list[i].tile_idx >= w->tile_count) continue;
        buf[n].tile_idx = list[i].tile_idx;
        buf[n].pos[0]   = list[i].position.x;
        buf[n].pos[1]   = list[i].position.y;
        buf[n].pos[2]   = list[i].position.z;
        buf[n].up[0]    = list[i].up.x;
        buf[n].up[1]    = list[i].up.y;
        buf[n].up[2]    = list[i].up.z;
        ++n;
    }
    persistence_save_torches(menu_active_world(),
                             (uint32_t)w->body->id, buf, n);
}

/* ----------------------------------------------------------------------- */

/* Use the player's parallel-transported basis (same one as
 * player_view), not a fresh phys_tangent_basis. The latter has a
 * discontinuity near |up.y| = 0.9 that was jerking the raycast and
 * crosshair in the same pattern that made the camera flip. */
static dvec3_t player_look_dir(const player_ctrl_t* p) {
    const tangent_basis_t* b = &p->basis;
    double cy = cos((double)p->yaw),   sy = sin((double)p->yaw);
    double cp = cos((double)p->pitch), sp = sin((double)p->pitch);
    dvec3_t fwd = dvec3_add(dvec3_scale(b->fwd, cy), dvec3_scale(b->right, sy));
    dvec3_t look = dvec3_add(dvec3_scale(fwd, cp), dvec3_scale(b->up, sp));
    return dvec3_normalize(look);
}

/* Convert a world position to (tile, depth). tile lookup uses the
 * player's last-known tile as a hint for speed. *out_tile is set
 * to the resolved tile EVEN WHEN the depth check fails, so callers
 * stepping along a ray can keep the goldberg hint warm across
 * iterations — without that, an out-of-bounds raycast (player above
 * the planet's voxel column range) hands a stale -1 hint into every
 * step, blowing the search back into a slow path. */
static bool world_to_tile_depth(const world_t* w, dvec3_t pos, int hint,
                                int* out_tile, int* out_depth) {
    /* pos is in WORLD space (same frame as p->position) but the
     * goldberg grid + body radius are body-local. Subtract the
     * body's centre so the raycast lines up on planets that don't
     * sit at the origin (Tenebris is at 0,0,0 but Sequoia / Crag /
     * Frostbite all sit elsewhere). Without this fix, mining +
     * placement only worked on Tenebris - the raycast normalised
     * a world-space vector that pointed somewhere unrelated to
     * the planet beneath the player. */
    dvec3_t local = dvec3_make(pos.x - w->body->pos_x,
                                pos.y - w->body->pos_y,
                                pos.z - w->body->pos_z);
    dvec3_t dir = dvec3_normalize(local);
    int tile = goldberg_find_tile(w->grid, dir, hint);
    if (tile < 0) return false;
    *out_tile = tile;
    double r = dvec3_length(local);
    /* Invert world_depth_to_radius_m: r = body_r - (SEA_LEVEL_IDX - d)
     * with block height = 1m. So depth = (r - body_r) + SEA_LEVEL_IDX.
     * Must match world.c's SEA_LEVEL_IDX (64). With the wrong value (12),
     * mining/placing modified a block 52 layers below where the player
     * was looking, so terrain seemed not to react to clicks. */
    const int SEA_LEVEL_IDX = 64;
    int depth = (int)floor(r - w->body->radius_m) + SEA_LEVEL_IDX;
    if (depth < 0 || depth >= WORLD_MAX_DEPTH) return false;
    *out_depth = depth;
    return true;
}

/* ----------------------------------------------------------------------- */

void interact_update(interact_state_t* s, world_t* w, player_ctrl_t* p, float dt) {
    s->has_target      = false;
    s->is_torch_target = false;
    s->torch_idx       = -1;

    /* In space mode there are no blocks within reach — no point
     * raycasting. Skip the whole pass; mining_progress stays at 0
     * so the existing reset-on-target-change branch still does the
     * right thing on landing. This is the dominant fix for the
     * "framerate tanks in space" report — interact_update was
     * burning ~140 ms / frame when the raycast couldn't find a tile
     * column inside its 8 m reach (every step's depth check failed
     * with an out-of-range result, but the goldberg lookup still
     * ran on every iteration). */
    if (p->is_in_space) return;

    /* Eye position from the player's carried basis. */
    dvec3_t eye = dvec3_add(p->position, dvec3_scale(p->basis.up, 1.6));
    dvec3_t dir = player_look_dir(p);

    /* Fixed-step voxel raycast. */
    const double step_m = 0.25;
    int prev_tile = -1, prev_depth = -1;
    bool prev_valid = false;
    int hint = p->last_tile;
    double block_dist = INTERACT_MAX_DIST + 1.0;
    bool   block_hit  = false;
    int    block_tile = 0, block_depth = 0, block_place_tile = 0, block_place_depth = 0;

    for (double dd = 0.0; dd <= INTERACT_MAX_DIST; dd += step_m) {
        dvec3_t cur = dvec3_add(eye, dvec3_scale(dir, dd));
        int tile = -1, depth = 0;
        bool inside = world_to_tile_depth(w, cur, hint, &tile, &depth);
        /* Keep the hint warm even when depth was out of range —
         * world_to_tile_depth still wrote out_tile, so subsequent
         * iterations get a fresh greedy starting point instead of
         * falling back to an O(N) scan. */
        if (tile >= 0) hint = tile;
        if (!inside) continue;
        block_t blk = world_get(w, tile, depth);
        if (block_is_solid(blk)) {
            block_hit         = true;
            block_tile        = tile;
            block_depth       = depth;
            block_place_tile  = prev_valid ? prev_tile  : tile;
            block_place_depth = prev_valid ? prev_depth : depth + 1;
            block_dist        = dd;
            break;
        }
        prev_tile = tile; prev_depth = depth; prev_valid = true;
    }

    /* Torch raycast — placed-torch entities are NOT in the voxel grid,
     * so they need their own intersection pass. Whichever target sits
     * closer along the look ray wins; the torch path short-circuits
     * the block path so a torch always takes precedence on a tie. */
    vec3_t eye_f = (vec3_t){ (float)eye.x, (float)eye.y, (float)eye.z };
    vec3_t dir_f = (vec3_t){ (float)dir.x, (float)dir.y, (float)dir.z };
    float  torch_dist_f = 1e30f;
    int    torch_hit    = torch_raycast(eye_f, dir_f, (float)INTERACT_MAX_DIST,
                                        &torch_dist_f);
    bool   target_torch = (torch_hit >= 0) &&
                          (!block_hit || (double)torch_dist_f <= block_dist);

    if (target_torch) {
        s->has_target      = true;
        s->is_torch_target = true;
        s->torch_idx       = torch_hit;
        s->distance        = (double)torch_dist_f;
        /* Block fields stay zero — caller branches on is_torch_target. */
    } else if (block_hit) {
        s->has_target  = true;
        s->hit_tile    = block_tile;
        s->hit_depth   = block_depth;
        s->place_tile  = block_place_tile;
        s->place_depth = block_place_depth;
        s->distance    = block_dist;
    }

    /* Reset mining timer when the block target changes (or there
     * isn't one). Mining progress is block-only — torches are
     * removed instantly on click in either mode. */
    const input_state_t* in = input_state();
    const bool block_target_changed =
        target_torch || !block_hit ||
        block_tile  != s->mining_tile ||
        block_depth != s->mining_depth;
    if (block_target_changed) {
        s->mining_progress_s = 0.0f;
        s->mining_tile  = block_hit && !target_torch ? block_tile  : -1;
        s->mining_depth = block_hit && !target_torch ? block_depth : -1;
    }

    /* ---- Torch target click handling ----
     * Both creative and survival break torches instantly on the
     * left-click edge. Survival recovers a TORCH item back into
     * inventory; creative drops the torch on the floor (it was
     * effectively free anyway). The dirty-in-range walk re-bakes
     * per-vertex torch_light on every tile whose terrain was lit
     * by the removed torch. */
    if (target_torch) {
        if (in->left_click) {
            vec3_t pos = torch_position_at(s->torch_idx);
            torch_remove(s->torch_idx);
            world_dirty_in_range(w, pos, TORCH_LIGHT_RANGE_M);
            /* SP: same-frame persistence of the updated torch list.
             * MP: server isn't authoritative on torches today; this
             * still records nothing on the wire. CLAUDE.md persistence
             * rule applies to the local list either way. */
            sp_save_torches_after_change(w);
            if (p->survival_mode) inventory_add(&p->inventory, BLOCK_TORCH);
            /* Index is now invalid (swap-removed); clear it so the
             * HUD doesn't print stale state for the rest of this
             * frame. */
            s->is_torch_target = false;
            s->torch_idx       = -1;
            s->has_target      = false;
        }
        return;
    }

    if (!s->has_target) return;

    /* ---- Block target click handling (unchanged from before) ---- */
    block_t target_block = world_get(w, s->hit_tile, s->hit_depth);

    /* SURVIVAL: hold LMB on a block to mine it over MINING_TIME_S. The
     * mouse-held flag keeps the timer running across frames; releasing
     * resets progress so partial breaks don't carry to the next swing. */
    if (block_is_unbreakable(target_block)) {
        s->mining_progress_s = 0.0f;
    } else if (p->survival_mode) {
        if (in->left_held) {
            s->mining_progress_s += dt;
            if (s->mining_progress_s >= MINING_TIME_S) {
                world_set(w, s->hit_tile, s->hit_depth, BLOCK_AIR);
                net_client_send_edit(PLAYER_CMD_BREAK,
                                       (uint32_t)w->body->id,
                                       s->hit_tile, s->hit_depth, BLOCK_AIR);
                sp_save_tile_after_edit(w, s->hit_tile);
                inventory_add(&p->inventory, target_block);
                s->mining_progress_s = 0.0f;
            }
        } else {
            s->mining_progress_s = 0.0f;
        }
    } else {
        /* Creative: instant break on the click edge, no inventory. */
        if (in->left_click) {
            world_set(w, s->hit_tile, s->hit_depth, BLOCK_AIR);
            net_client_send_edit(PLAYER_CMD_BREAK,
                                   (uint32_t)w->body->id,
                                   s->hit_tile, s->hit_depth, BLOCK_AIR);
            sp_save_tile_after_edit(w, s->hit_tile);
        }
        s->mining_progress_s = 0.0f;
    }

    if (in->right_click) {
        if (s->place_depth >= 0 && s->place_depth < WORLD_MAX_DEPTH &&
            inventory_can_place(&p->inventory))
        {
            block_t to_place = inventory_selected(&p->inventory);
            if (to_place == BLOCK_TORCH) {
                /* A torch is NOT a hex block — it's an entity drawn
                 * by torch.c. Place it sitting on top of the targeted
                 * solid block (s->hit_tile / s->hit_depth) with its
                 * up vector aligned to the local surface normal so it
                 * stands "up" everywhere on the sphere. The block
                 * grid stays untouched. */
                const goldberg_tile_t* tt = goldberg_tile(w->grid, s->hit_tile);
                if (tt) {
                    /* Top face of the hit block sits at radius
                     * world_depth_to_radius_m(hit_depth + 1). */
                    double r_top = world_depth_to_radius_m(w, s->hit_depth + 1);
                    vec3_t base_dir = (vec3_t){
                        (float)tt->center.x,
                        (float)tt->center.y,
                        (float)tt->center.z,
                    };
                    vec3_t base_pos = vec3_scale(base_dir, (float)r_top);
                    if (torch_place(base_pos, base_dir, s->hit_tile)) {
                        /* Dirty every tile whose centre sits within
                         * the torch's light range — they need their
                         * per-vertex torch_light re-baked. The
                         * renderer's per-frame dirty sweep will
                         * remesh + re-upload affected chunks. */
                        world_dirty_in_range(w, base_pos, TORCH_LIGHT_RANGE_M);
                        sp_save_torches_after_change(w);
                        inventory_consume(&p->inventory);
                    }
                }
            } else {
                world_set(w, s->place_tile, s->place_depth, to_place);
                net_client_send_edit(PLAYER_CMD_PLACE,
                                       (uint32_t)w->body->id,
                                       s->place_tile, s->place_depth, to_place);
                sp_save_tile_after_edit(w, s->place_tile);
                inventory_consume(&p->inventory);
            }
        }
    }
}
