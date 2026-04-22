#ifndef TENEBRIS_CLIENT_INTERACT_H
#define TENEBRIS_CLIENT_INTERACT_H

#include "core/hex_pool.h"
#include "client/player_ctrl.h"

#define INTERACT_MAX_DIST 8.0

typedef struct {
    hex_ray_hit_t hit;   /* most recent raycast — used for outline */
} interact_state_t;

/* Consume edge-triggered click / tap input and apply break/place through
 * hex_pool_set_voxel. Tier 2-ish: break/place arrived with mobile
 * controls ahead of schedule because the touch UI needed them. */
void interact_update(interact_state_t* s,
                     hex_pool_t* pool,
                     const player_ctrl_t* player);

#endif
