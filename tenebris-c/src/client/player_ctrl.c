#include "client/player_ctrl.h"
#include "client/input.h"
#include <math.h>

#define MOUSE_SENS 0.002f

void player_init(player_ctrl_t* p, vec3_t spawn) {
    phys_init_body(&p->body, spawn);
    p->yaw   = 0.0f;
    p->pitch = 0.0f;
    p->selected_block = 1;   /* STONE */
}

void player_update(player_ctrl_t* p, struct world_s* w, float dt) {
    const input_state_t* in = input_state();

    /* Mouse look. Yaw=0 looks -Z, matching the Three.js camera. */
    p->yaw   -= in->mouse_dx * MOUSE_SENS;
    p->pitch -= in->mouse_dy * MOUSE_SENS;
    const float limit = 1.55334f; /* ~ pi/2 - 0.01 */
    if (p->pitch >  limit) p->pitch =  limit;
    if (p->pitch < -limit) p->pitch = -limit;

    /* Hotbar 1..3 selects block type (Tier 1 palette). */
    for (int i = 0; i < 3; ++i) {
        if (in->hotbar[i]) p->selected_block = (uint8_t)(i + 1);
    }

    /* Physics step — shared with the server. */
    phys_step(w, &p->body, in->phys, p->yaw, dt);
}

vec3_t player_eye(const player_ctrl_t* p) {
    return (vec3_t){ p->body.position.x, p->body.position.y + EYE_HEIGHT, p->body.position.z };
}

vec3_t player_forward(const player_ctrl_t* p) {
    float cp = cosf(p->pitch), sp = sinf(p->pitch);
    float cy = cosf(p->yaw),   sy = sinf(p->yaw);
    return (vec3_t){ -sy * cp, sp, -cy * cp };
}

mat4_t player_view(const player_ctrl_t* p) {
    vec3_t eye = player_eye(p);
    vec3_t fwd = player_forward(p);
    vec3_t tgt = vec3_add(eye, fwd);
    vec3_t up  = { 0, 1, 0 };
    return mat4_look_at(eye, tgt, up);
}
