#include "client/player_ctrl.h"
#include "client/input.h"
#include "core/blocks.h"
#include "core/hex_chunk.h"
#include <math.h>

#define MOUSE_SENS    0.002f
#define WALK_SPEED    8.0f
#define SPRINT_SPEED 14.0f
#define FLY_SPEED    40.0f
#define JUMP_VEL      6.0f
#define PITCH_LIMIT   1.55334f

/* ----------------------------------------------------------------------- */
/* Tangent frame + yaw/pitch helpers. Yaw rotates around the local radial
 * axis; pitch around the yaw-rotated right axis. Returns world-space
 * look direction + the local up so the camera can build a look-at. */

static void compute_look(const player_ctrl_t* p, dvec3_t* out_look, dvec3_t* out_up) {
    tangent_basis_t b = phys_tangent_basis(p->position);
    double cy = cos((double)p->yaw),   sy = sin((double)p->yaw);
    double cp = cos((double)p->pitch), sp = sin((double)p->pitch);
    /* Yaw around radial-up. */
    dvec3_t fwd = dvec3_add(dvec3_scale(b.fwd, cy), dvec3_scale(b.right, sy));
    /* Pitch around yaw-rotated right axis. */
    dvec3_t look = dvec3_add(dvec3_scale(fwd, cp), dvec3_scale(b.up, sp));
    *out_look = dvec3_normalize(look);
    *out_up   = b.up;
}

/* Walk direction in the tangent plane, scaled by speed. */
static dvec3_t walk_wish(const player_ctrl_t* p, const phys_input_t* in) {
    tangent_basis_t b = phys_tangent_basis(p->position);
    double cy = cos((double)p->yaw), sy = sin((double)p->yaw);
    dvec3_t fwd   = dvec3_add(dvec3_scale(b.fwd, cy),  dvec3_scale(b.right, sy));
    dvec3_t right = dvec3_add(dvec3_scale(b.fwd, -sy), dvec3_scale(b.right, cy));
    dvec3_t wish = (dvec3_t){0, 0, 0};
    if (in->forward)  wish = dvec3_add(wish, fwd);
    if (in->backward) wish = dvec3_sub(wish, fwd);
    if (in->right)    wish = dvec3_add(wish, right);
    if (in->left)     wish = dvec3_sub(wish, right);
    double L = dvec3_length(wish);
    if (L > 1e-6) wish = dvec3_scale(wish, 1.0 / L);
    return wish;
}

/* ----------------------------------------------------------------------- */
/* Ground sample: walks the hex pool to find the solid-top altitude under
 * the player. Returns the altitude (meters above body->radius_m) of the
 * first air layer above the top of the column the player is standing in,
 * or a sentinel -1e9 if the column is outside the pool. */

static double ground_altitude_under_player(const player_ctrl_t* p, const hex_pool_t* pool) {
    /* Player position in tangent-plane coords relative to the anchor. */
    dvec3_t delta = dvec3_sub(p->position, pool->anchor_world);
    double tx = dvec3_dot(delta, pool->basis.right);
    double ty = dvec3_dot(delta, pool->basis.fwd);
    /* Which chunk (cx, cy)? Use floor for correct negative handling. */
    int32_t cx = (int32_t)floor(tx / (double)HEX_CHUNK_WIDTH_M);
    int32_t cy = (int32_t)floor(ty / (double)HEX_CHUNK_DEPTH_M);
    const hex_chunk_t* c = hex_pool_chunk_by_coord(pool, cx, cy);
    if (!c || c->pending_fill) return -1e9;
    /* In-chunk tangent coords. */
    double lx = tx - (double)cx * (double)HEX_CHUNK_WIDTH_M;
    double ly = ty - (double)cy * (double)HEX_CHUNK_DEPTH_M;
    /* Nearest (col, row). Pointy-top inverse is approximate; good enough
     * for Tier 1 ground snap since the player footprint spans multiple
     * hexes and we only need roughly-correct ground height. */
    int row = (int)floor(ly / (double)HEX_DY + 0.5);
    if (row < 0) row = 0; else if (row >= HEX_ROWS) row = HEX_ROWS - 1;
    double odd_off = (row & 1) ? (HEX_DX * 0.5) : 0.0;
    int col = (int)floor((lx - odd_off) / (double)HEX_DX + 0.5);
    if (col < 0) col = 0; else if (col >= HEX_COLS) col = HEX_COLS - 1;
    int idx = col * HEX_ROWS + row;
    int16_t top = c->col_max_solid[idx];
    if (top < 0) return -1e9;
    return (double)(top + 1 - HEX_BASE_PADDING) * (double)HEX_HEIGHT;
}

/* ----------------------------------------------------------------------- */

void player_init(player_ctrl_t* p, const body_config_t* body) {
    p->body = body;
    p->yaw = 0.0f;
    p->pitch = 0.0f;
    p->selected_block = BLOCK_STONE;  /* sane default for right-click placement */
    p->grounded = false;
    p->fly_mode = false;
    p->vy = 0.0f;
    /* Spawn 30 m above "latitude 0, longitude 0" so terrain loads under
     * the feet and the first frame can snap to ground once fill completes. */
    const double r0 = body->radius_m + 30.0;
    p->position = dvec3_make(r0, 0, 0);
}

dvec3_t player_world_pos(const player_ctrl_t* p) { return p->position; }

/* ----------------------------------------------------------------------- */

void player_update(player_ctrl_t* p, hex_pool_t* pool, float dt) {
    const input_state_t* in = input_state();

    /* Mouse look. */
    p->yaw   -= in->mouse_dx * MOUSE_SENS;
    p->pitch -= in->mouse_dy * MOUSE_SENS;
    if (p->pitch >  PITCH_LIMIT) p->pitch =  PITCH_LIMIT;
    if (p->pitch < -PITCH_LIMIT) p->pitch = -PITCH_LIMIT;

    /* Fly toggle is edge-triggered by input.c already. */
    p->fly_mode = in->phys.fly_mode;

    /* Movement. */
    float speed = in->phys.sprint ? SPRINT_SPEED : WALK_SPEED;
    if (p->fly_mode) speed = FLY_SPEED;

    dvec3_t wish = walk_wish(p, &in->phys);
    dvec3_t step_tan = dvec3_scale(wish, (double)speed * (double)dt);
    p->position = dvec3_add(p->position, step_tan);

    /* Gravity + jump in the radial axis. */
    const float gravity = 25.0f * p->body->gravity_g;
    if (p->fly_mode) {
        float vy = 0.0f;
        if (in->phys.fly_up)   vy += 1.0f;
        if (in->phys.fly_down) vy -= 1.0f;
        tangent_basis_t b = phys_tangent_basis(p->position);
        p->position = dvec3_add(p->position, dvec3_scale(b.up, (double)vy * (double)speed * (double)dt));
        p->vy = 0.0f;
    } else {
        if (in->phys.jump && p->grounded) {
            p->vy = JUMP_VEL;
            p->grounded = false;
        }
        p->vy -= gravity * dt;
        tangent_basis_t b = phys_tangent_basis(p->position);
        p->position = dvec3_add(p->position, dvec3_scale(b.up, (double)p->vy * (double)dt));
    }

    /* Ground snap: pull player down to the top of the current column.
     * Tier 1 stub — no wall collision, no AABB sweep. */
    if (!p->fly_mode) {
        double ground_alt = ground_altitude_under_player(p, pool);
        if (ground_alt > -1e8) {
            /* World altitude of the player's feet. */
            double r = dvec3_length(p->position);
            double player_alt_feet = r - p->body->radius_m;
            double target = ground_alt;
            if (player_alt_feet < target) {
                /* Snap up to ground. */
                double radial_scale = (p->body->radius_m + target) / r;
                p->position = dvec3_scale(p->position, radial_scale);
                p->vy = 0.0f;
                p->grounded = true;
            } else if (fabs(player_alt_feet - target) < 0.02 && p->vy <= 0.0f) {
                p->grounded = true;
                p->vy = 0.0f;
            } else {
                p->grounded = false;
            }
        } else {
            p->grounded = false;
        }
    } else {
        p->grounded = false;
    }
}

/* ----------------------------------------------------------------------- */

mat4_t player_view(const player_ctrl_t* p, dvec3_t floating_origin) {
    dvec3_t look, up;
    compute_look(p, &look, &up);
    /* Eye is player_position + radial_up * EYE_HEIGHT. */
    tangent_basis_t b = phys_tangent_basis(p->position);
    dvec3_t eye = dvec3_add(p->position, dvec3_scale(b.up, (double)EYE_HEIGHT));
    dvec3_t target = dvec3_add(eye, look);

    vec3_t eye_f = dvec3_to_vec3(dvec3_sub(eye, floating_origin));
    vec3_t tgt_f = dvec3_to_vec3(dvec3_sub(target, floating_origin));
    vec3_t up_f  = { (float)up.x, (float)up.y, (float)up.z };
    return mat4_look_at(eye_f, tgt_f, up_f);
}
