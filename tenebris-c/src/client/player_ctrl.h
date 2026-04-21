#ifndef TENEBRIS_CLIENT_PLAYER_CTRL_H
#define TENEBRIS_CLIENT_PLAYER_CTRL_H

#include "core/physics.h"
#include "client/gfx_math.h"

#define EYE_HEIGHT 1.6f

typedef struct {
    phys_body_t body;
    float yaw;
    float pitch;
    uint8_t selected_block;   /* 1..3 in Tier 1 (STONE, DIRT, GRASS) */
} player_ctrl_t;

void   player_init(player_ctrl_t* p, vec3_t spawn);
void   player_update(player_ctrl_t* p, struct world_s* w, float dt);
vec3_t player_eye(const player_ctrl_t* p);
vec3_t player_forward(const player_ctrl_t* p);
mat4_t player_view(const player_ctrl_t* p);

#endif
