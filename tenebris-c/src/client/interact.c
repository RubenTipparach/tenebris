#include "client/interact.h"
#include "client/input.h"
#include "core/blocks.h"
#include <math.h>

/* Compute the look direction in world space at the player's position.
 * Mirrors player_ctrl's compute_look, intentionally duplicated here to
 * avoid exposing an internal helper in the header. */
static dvec3_t player_look_dir(const player_ctrl_t* p) {
    tangent_basis_t b = phys_tangent_basis(p->position);
    double cy = cos((double)p->yaw),   sy = sin((double)p->yaw);
    double cp = cos((double)p->pitch), sp = sin((double)p->pitch);
    dvec3_t fwd = dvec3_add(dvec3_scale(b.fwd, cy), dvec3_scale(b.right, sy));
    dvec3_t look = dvec3_add(dvec3_scale(fwd, cp), dvec3_scale(b.up, sp));
    return dvec3_normalize(look);
}

void interact_update(interact_state_t* s, hex_pool_t* pool, const player_ctrl_t* player) {
    /* Ray from eye along look direction. */
    tangent_basis_t b = phys_tangent_basis(player->position);
    dvec3_t eye = dvec3_add(player->position, dvec3_scale(b.up, 1.6));
    dvec3_t dir = player_look_dir(player);

    s->hit = hex_pool_raycast(pool, eye, dir, INTERACT_MAX_DIST);

    const input_state_t* in = input_state();
    if (!s->hit.has_hit) return;

    if (in->left_click) {
        hex_pool_set_voxel(pool,
            s->hit.hit_cx, s->hit.hit_cy,
            s->hit.hit_col, s->hit.hit_row, s->hit.hit_layer,
            BLOCK_AIR);
    } else if (in->right_click) {
        hex_pool_set_voxel(pool,
            s->hit.place_cx, s->hit.place_cy,
            s->hit.place_col, s->hit.place_row, s->hit.place_layer,
            (uint8_t)player->selected_block);
    }
}
