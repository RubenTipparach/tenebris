#ifndef TENEBRIS_CLIENT_INTERACT_H
#define TENEBRIS_CLIENT_INTERACT_H

#include "core/world.h"
#include "client/player_ctrl.h"

#define INTERACT_MAX_DIST 8.0

typedef struct {
    bool has_target;
    int  hit_tile;
    int  hit_depth;
    int  place_tile;
    int  place_depth;
    double distance;
} interact_state_t;

void interact_update(interact_state_t* s, world_t* w, const player_ctrl_t* p);

#endif
