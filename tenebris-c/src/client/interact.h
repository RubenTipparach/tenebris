#ifndef TENEBRIS_CLIENT_INTERACT_H
#define TENEBRIS_CLIENT_INTERACT_H

#include "core/world.h"
#include "client/player_ctrl.h"

#define INTERACT_MAX_DIST    8.0
/* Survival mining time per block, seconds. Holding LMB on a target
 * for this long breaks it and adds it to inventory. */
#define MINING_TIME_S        0.8f

typedef struct {
    bool has_target;
    int  hit_tile;
    int  hit_depth;
    int  place_tile;
    int  place_depth;
    double distance;

    /* Mining progress (survival only). Starts at 0, fills to
     * MINING_TIME_S while LMB is held on the same target. Resets to
     * 0 when the target changes or the button releases. */
    float  mining_progress_s;
    int    mining_tile;
    int    mining_depth;
} interact_state_t;

/* `dt` is needed for mining-timer accumulation. Mutable player so we
 * can write inventory pickups + drains. */
void interact_update(interact_state_t* s, world_t* w, player_ctrl_t* p, float dt);

#endif
