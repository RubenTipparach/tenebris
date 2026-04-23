#ifndef TENEBRIS_CLIENT_PLAYER_CTRL_H
#define TENEBRIS_CLIENT_PLAYER_CTRL_H

#include "core/physics.h"
#include "core/planet.h"
#include "core/world.h"
#include "client/gfx_math.h"

#define EYE_HEIGHT 1.6f

typedef struct {
    dvec3_t     position;
    float       vy;
    float       yaw;
    float       pitch;
    uint8_t     selected_block;
    bool        grounded;
    bool        fly_mode;
    int         last_tile;     /* hint for goldberg_find_tile */
    const body_config_t* body;
} player_ctrl_t;

void    player_init(player_ctrl_t* p, const body_config_t* body);
void    player_update(player_ctrl_t* p, world_t* w, float dt);

dvec3_t player_world_pos(const player_ctrl_t* p);
mat4_t  player_view(const player_ctrl_t* p);

#endif
