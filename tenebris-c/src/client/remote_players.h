#ifndef TENEBRIS_CLIENT_REMOTE_PLAYERS_H
#define TENEBRIS_CLIENT_REMOTE_PLAYERS_H

#include "client/gfx_math.h"
#include "core/math.h"
#include <stdbool.h>
#include <stdint.h>

/*
 * Tracks every other connected player's last-reported pose. The local
 * player is excluded — net_client filters by the player_id from
 * WELCOME so the client's own avatar isn't drawn twice.
 *
 * M4 storage is just "the most recent SNAPSHOT entry". Interpolation /
 * extrapolation is a follow-up.
 */

#define REMOTE_PLAYERS_MAX 16

typedef struct {
    uint32_t player_id;
    uint32_t body_id;
    dvec3_t  pos;
    float    yaw, pitch;
    bool     active;
} remote_player_t;

void remote_players_init(void);
void remote_players_shutdown(void);

/* Wholesale-replace from a freshly-arrived SNAPSHOT. Removes anyone
 * not in the snapshot (so disconnected players vanish promptly). */
void remote_players_set_from_snapshot(const remote_player_t* arr, int count);

int  remote_players_count(void);
const remote_player_t* remote_players_get(int i);

/* Draw markers for every remote player. Uses sokol_gl directly so the
 * call has to land inside the 3D pass (after the offscreen world draw
 * but before the swapchain composite — see main_web.c for the slot). */
void remote_players_draw(mat4_t view, mat4_t proj);

#endif
