#include "client/interact.h"
#include "client/input.h"
#include "core/blocks.h"
#include <math.h>

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
 * player's last-known tile as a hint for speed. */
static bool world_to_tile_depth(const world_t* w, dvec3_t pos, int hint,
                                int* out_tile, int* out_depth) {
    dvec3_t dir = dvec3_normalize(pos);
    int tile = goldberg_find_tile(w->grid, dir, hint);
    if (tile < 0) return false;
    double r = dvec3_length(pos);
    /* Invert world_depth_to_radius_m: r = body_r - (SEA_LEVEL_IDX - d)
     * with block height = 1m. So depth = (r - body_r) + SEA_LEVEL_IDX.
     * Must match world.c's SEA_LEVEL_IDX (64). With the wrong value (12),
     * mining/placing modified a block 52 layers below where the player
     * was looking, so terrain seemed not to react to clicks. */
    const int SEA_LEVEL_IDX = 64;
    int depth = (int)floor(r - w->body->radius_m) + SEA_LEVEL_IDX;
    if (depth < 0 || depth >= WORLD_MAX_DEPTH) return false;
    *out_tile  = tile;
    *out_depth = depth;
    return true;
}

/* ----------------------------------------------------------------------- */

void interact_update(interact_state_t* s, world_t* w, player_ctrl_t* p, float dt) {
    s->has_target = false;

    /* Eye position from the player's carried basis. */
    dvec3_t eye = dvec3_add(p->position, dvec3_scale(p->basis.up, 1.6));
    dvec3_t dir = player_look_dir(p);

    /* Fixed-step raycast. */
    const double step_m = 0.25;
    int prev_tile = -1, prev_depth = -1;
    bool prev_valid = false;
    int hint = p->last_tile;

    for (double d = 0.0; d <= INTERACT_MAX_DIST; d += step_m) {
        dvec3_t cur = dvec3_add(eye, dvec3_scale(dir, d));
        int tile, depth;
        if (!world_to_tile_depth(w, cur, hint, &tile, &depth)) continue;
        hint = tile;
        block_t blk = world_get(w, tile, depth);
        if (block_is_solid(blk)) {
            s->has_target  = true;
            s->hit_tile    = tile;
            s->hit_depth   = depth;
            s->place_tile  = prev_valid ? prev_tile  : tile;
            s->place_depth = prev_valid ? prev_depth : depth + 1;
            s->distance    = d;
            break;
        }
        prev_tile = tile; prev_depth = depth; prev_valid = true;
    }

    /* Reset mining timer if the target moved or we released LMB. */
    const input_state_t* in = input_state();
    /* Note: input.c marks left_click as edge-triggered (true on the
     * frame of touch-down/click-down). For survival we want a "held"
     * signal — input_state.phys doesn't have that for mouse, so we
     * approximate by the click-down edge re-arming each frame the
     * raycast is on the same block. Held detection comes from input
     * flags later if we add a dedicated mouse-held bit; for now the
     * timer holds across frames as long as the target tile/depth
     * doesn't change. */
    const bool target_changed =
        !s->has_target ||
         s->hit_tile  != s->mining_tile ||
         s->hit_depth != s->mining_depth;
    if (target_changed) {
        s->mining_progress_s = 0.0f;
        s->mining_tile  = s->has_target ? s->hit_tile  : -1;
        s->mining_depth = s->has_target ? s->hit_depth : -1;
    }

    if (!s->has_target) return;

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
        }
        s->mining_progress_s = 0.0f;
    }

    if (in->right_click) {
        if (s->place_depth >= 0 && s->place_depth < WORLD_MAX_DEPTH &&
            inventory_can_place(&p->inventory))
        {
            block_t to_place = inventory_selected(&p->inventory);
            world_set(w, s->place_tile, s->place_depth, to_place);
            inventory_consume(&p->inventory);
        }
    }
}
