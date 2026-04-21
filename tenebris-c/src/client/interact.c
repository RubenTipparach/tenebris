#include "client/interact.h"
#include "client/input.h"
#include <math.h>

void interact_update(interact_state_t* s, world_t* w, const player_ctrl_t* p, uint32_t tick) {
    vec3_t eye = player_eye(p);
    vec3_t dir = player_forward(p);
    s->hit = world_raycast(w, eye, dir, INTERACT_MAX_DIST);
    s->has_target = s->hit.hit;

    const input_state_t* in = input_state();
    if (!s->has_target) return;

    if (in->left_click) {
        world_cmd_t cmd = {
            .tick  = tick,
            .kind  = CMD_BREAK_BLOCK,
            .x     = s->hit.block.x,
            .y     = s->hit.block.y,
            .z     = s->hit.block.z,
            .block = BLOCK_AIR,
        };
        world_apply_cmd(w, &cmd);
    } else if (in->right_click) {
        /* Place adjacent to the hit face. */
        int32_t px = s->hit.block.x + s->hit.normal.x;
        int32_t py = s->hit.block.y + s->hit.normal.y;
        int32_t pz = s->hit.block.z + s->hit.normal.z;

        /* Don't place inside the player. Player AABB is radius 0.3, height 1.8
         * anchored at feet; compare block cell against the player's occupied
         * cells. This mirrors the guard in src/player/BlockInteraction.ts.
         */
        int32_t pfx = (int32_t)floorf(p->body.position.x);
        int32_t pfy = (int32_t)floorf(p->body.position.y);
        int32_t pfz = (int32_t)floorf(p->body.position.z);
        if (px == pfx && pz == pfz && (py == pfy || py == pfy + 1)) return;

        world_cmd_t cmd = {
            .tick  = tick,
            .kind  = CMD_PLACE_BLOCK,
            .x     = px, .y = py, .z = pz,
            .block = p->selected_block,
        };
        world_apply_cmd(w, &cmd);
    }
}
