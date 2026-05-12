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

/* Incoming pose from a SNAPSHOT entry. net_client builds an array of
 * these from the decoded snapshot and hands it to
 * remote_players_set_from_snapshot, which then owns the interp
 * machinery (prev/cur poses + timestamps). */
typedef struct {
    uint32_t player_id;
    uint32_t body_id;
    dvec3_t  pos;
    float    yaw, pitch;
} remote_pose_t;

/* One slot per known remote player. The renderer interpolates between
 * `pos_prev` (pose at second-most-recent snapshot) and `pos_cur`
 * (pose at most-recent snapshot), lagging displayed motion by one
 * snapshot interval so it stays smooth across the 6.7 Hz update rate.
 * Classic Source-style entity interpolation. */
typedef struct {
    uint32_t player_id;
    uint32_t body_id;
    dvec3_t  pos_prev;
    dvec3_t  pos_cur;
    float    yaw_prev,   yaw_cur;
    float    pitch_prev, pitch_cur;
    double   snapshot_time_s;   /* monotonic seconds at last update */
    bool     active;
} remote_player_t;

void remote_players_init(void);
void remote_players_shutdown(void);

/* Wholesale-replace from a freshly-arrived SNAPSHOT. Matches each
 * incoming pose to the previous one by player_id so the prev/cur
 * interp pair survives across snapshots. */
void remote_players_set_from_snapshot(const remote_pose_t* arr, int count);

int  remote_players_count(void);
const remote_player_t* remote_players_get(int i);

/* Draw markers for every remote player. Uses sokol_gl directly so the
 * call has to land inside the 3D pass (after the offscreen world draw
 * but before the swapchain composite — see main_web.c for the slot). */
void remote_players_draw(mat4_t view, mat4_t proj);

/* Queue nameplates as sdtx text above each remote player's head.
 * Projects each player's pose through view*proj to compute the
 * on-screen pixel where the name should land. Call AFTER
 * remote_players_draw, INSIDE the swapchain pass where sdtx is
 * accumulating text. main_web passes the screen dimensions + a
 * lookup that maps player_id to a display string (the net_client
 * name cache). */
typedef const char* (*remote_players_name_fn)(uint32_t player_id);
void remote_players_draw_nameplates(mat4_t view, mat4_t proj,
                                       float screen_w, float screen_h,
                                       remote_players_name_fn name_fn);

#endif
