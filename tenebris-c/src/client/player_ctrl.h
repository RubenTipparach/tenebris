#ifndef TENEBRIS_CLIENT_PLAYER_CTRL_H
#define TENEBRIS_CLIENT_PLAYER_CTRL_H

#include "core/physics.h"
#include "core/planet.h"
#include "client/gfx_math.h"

#define EYE_HEIGHT 1.6f

typedef struct {
    phys_body_t body;
    float       yaw;
    float       pitch;
    uint8_t     selected_block;

    /* Spherical-surface controller state. Tier 1 stub keeps the camera
     * orbiting at fixed altitude; real walking once the chunk pool is in. */
    const body_config_t* body_cfg;
    double      altitude_m;
    double      orbit_lon;        /* radians, around +Y */
    double      orbit_lat;        /* radians, latitude */
} player_ctrl_t;

void   player_init(player_ctrl_t* p, const body_config_t* body);
void   player_update(player_ctrl_t* p, void* world, float dt);

dvec3_t player_world_pos(const player_ctrl_t* p);
mat4_t  player_view(const player_ctrl_t* p, dvec3_t floating_origin);

#endif
