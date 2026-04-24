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
    int         last_tile;

    /* Parallel-transported tangent frame at the player's position.
     * We can't derive a continuous basis from position alone (hairy-
     * ball theorem — any fixed reference axis has a singularity
     * somewhere); instead we carry the basis across frames and rotate
     * it by the minimal rotation from the old up to the new up. */
    tangent_basis_t basis;
    bool            basis_ready;

    const body_config_t* body;
} player_ctrl_t;

void    player_init(player_ctrl_t* p, const body_config_t* body);
void    player_update(player_ctrl_t* p, world_t* w, float dt);

/* Teleport the player to a spot 15 m above the named body's "prime
 * meridian" surface (direction (1, 0, 0) relative to the body). Forces
 * fly mode on because physics is anchored to Tenebris — without fly
 * the player would just fall back toward (0, 0, 0). */
void    player_teleport_to(player_ctrl_t* p, const body_config_t* body);

dvec3_t player_world_pos(const player_ctrl_t* p);
mat4_t  player_view(const player_ctrl_t* p);

#endif
