#ifndef TENEBRIS_CLIENT_INTERACT_H
#define TENEBRIS_CLIENT_INTERACT_H

#include "core/world.h"
#include "client/player_ctrl.h"
#include <stdbool.h>

#define INTERACT_MAX_DIST 8.0f

typedef struct {
    bool            has_target;
    world_ray_hit_t hit;
} interact_state_t;

/*
 * Consumes edge-triggered click input and emits world_cmd_t through
 * world_apply_cmd. Even in single-player, going through world_cmd_t
 * keeps the code path identical to the MP wire handler (Tier 5).
 */
void interact_update(interact_state_t* s,
                     world_t* w,
                     const player_ctrl_t* p,
                     uint32_t tick);

#endif
