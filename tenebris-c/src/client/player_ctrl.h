#ifndef TENEBRIS_CLIENT_PLAYER_CTRL_H
#define TENEBRIS_CLIENT_PLAYER_CTRL_H

#include "core/physics.h"
#include "core/planet.h"
#include "core/world.h"
#include "client/gfx_math.h"
#include "client/inventory.h"

#define EYE_HEIGHT 1.6f

typedef struct {
    dvec3_t     position;
    float       vy;
    float       yaw;
    float       pitch;
    bool        grounded;
    bool        fly_mode;
    int         last_tile;

    /* Hotbar inventory. selected_block is the type the right-click
     * place will use; survival_mode gates whether breaking accumulates
     * pickups + costs time, or is instantaneous + free (creative). */
    inventory_t inventory;
    bool        survival_mode;

    /* Parallel-transported tangent frame, anchored to the *current*
     * body — up is the surface normal of `body`, not of the world
     * origin. Teleporting to another body re-anchors the basis. */
    tangent_basis_t basis;
    bool            basis_ready;

    /* Body we're orbiting / standing on. Gravity pulls toward its
     * center, surface normal comes from (position - body.pos). Swapped
     * by player_teleport_to; defaults to Tenebris at player_init. */
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
