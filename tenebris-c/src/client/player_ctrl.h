#ifndef TENEBRIS_CLIENT_PLAYER_CTRL_H
#define TENEBRIS_CLIENT_PLAYER_CTRL_H

#include "core/physics.h"
#include "core/planet.h"
#include "core/hex_pool.h"
#include "client/gfx_math.h"

#define EYE_HEIGHT 1.6f

typedef struct {
    /* World-space position in planet frame (double precision). */
    dvec3_t     position;
    /* Radial velocity (meters per second; positive = outward). */
    float       vy;
    /* Tangent-frame yaw/pitch. Yaw=0 looks along basis.fwd. */
    float       yaw;
    float       pitch;
    uint8_t     selected_block;
    bool        grounded;
    bool        fly_mode;
    const body_config_t* body;
} player_ctrl_t;

void   player_init(player_ctrl_t* p, const body_config_t* body);
void   player_update(player_ctrl_t* p, hex_pool_t* pool, float dt);

dvec3_t player_world_pos(const player_ctrl_t* p);
mat4_t  player_view(const player_ctrl_t* p, dvec3_t floating_origin);

#endif
