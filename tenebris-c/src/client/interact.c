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
     * with block height = 1m. So depth = (r - body_r) + SEA_LEVEL_IDX. */
    const int SEA_LEVEL_IDX = 12;
    int depth = (int)floor(r - w->body->radius_m) + SEA_LEVEL_IDX;
    if (depth < 0 || depth >= WORLD_MAX_DEPTH) return false;
    *out_tile  = tile;
    *out_depth = depth;
    return true;
}

/* ----------------------------------------------------------------------- */

void interact_update(interact_state_t* s, world_t* w, const player_ctrl_t* p) {
    s->has_target = false;

    /* Eye position from the player's carried basis. */
    dvec3_t eye = dvec3_add(p->position, dvec3_scale(p->basis.up, 1.6));
    dvec3_t dir = player_look_dir(p);

    /* Fixed-step raycast: sample every ~0.25 m up to INTERACT_MAX_DIST.
     * At block height = 1 m this is dense enough to never skip a cell. */
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
            s->has_target   = true;
            s->hit_tile     = tile;
            s->hit_depth    = depth;
            s->place_tile   = prev_valid ? prev_tile  : tile;
            s->place_depth  = prev_valid ? prev_depth : depth + 1;
            s->distance     = d;
            break;
        }
        prev_tile = tile;
        prev_depth = depth;
        prev_valid = true;
    }

    if (!s->has_target) return;

    const input_state_t* in = input_state();
    if (in->left_click) {
        world_set(w, s->hit_tile, s->hit_depth, BLOCK_AIR);
    } else if (in->right_click) {
        if (s->place_depth >= 0 && s->place_depth < WORLD_MAX_DEPTH) {
            world_set(w, s->place_tile, s->place_depth, (block_t)p->selected_block);
        }
    }
}
