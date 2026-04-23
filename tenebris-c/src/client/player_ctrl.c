#include "client/player_ctrl.h"
#include "client/input.h"
#include "core/blocks.h"
#include <math.h>

#define MOUSE_SENS       0.002f
#define LOOK_STICK_SENS  2.4f
#define WALK_SPEED       8.0f
#define SPRINT_SPEED    14.0f
#define FLY_SPEED       20.0f
#define JUMP_VEL         8.0f
#define JETPACK_ACCEL   42.0f
#define JETPACK_MAX_VY  14.0f
#define PITCH_LIMIT      1.55334f

/* ----------------------------------------------------------------------- */

static void compute_look(const player_ctrl_t* p, dvec3_t* out_look, dvec3_t* out_up) {
    tangent_basis_t b = phys_tangent_basis(p->position);
    double cy = cos((double)p->yaw),   sy = sin((double)p->yaw);
    double cp = cos((double)p->pitch), sp = sin((double)p->pitch);
    dvec3_t fwd = dvec3_add(dvec3_scale(b.fwd, cy), dvec3_scale(b.right, sy));
    dvec3_t look = dvec3_add(dvec3_scale(fwd, cp), dvec3_scale(b.up, sp));
    *out_look = dvec3_normalize(look);
    *out_up   = b.up;
}

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

/* Ground altitude under the player: top of the solid column at the
 * player's current tile. Returns -1e9 if the tile is not yet generated. */
static double ground_radius_under(const world_t* w, int tile) {
    if (tile < 0 || tile >= w->tile_count || tile >= w->gen_cursor) return -1e9;
    for (int d = WORLD_MAX_DEPTH - 1; d >= 0; --d) {
        uint8_t b = w->blocks[tile * WORLD_MAX_DEPTH + d];
        if (block_is_solid((block_t)b)) {
            /* Player stands on top of this voxel. */
            return world_depth_to_radius_m(w, d + 1);
        }
    }
    return -1e9;
}

/* ----------------------------------------------------------------------- */

void player_init(player_ctrl_t* p, const body_config_t* body) {
    p->body = body;
    p->yaw = 0.0f;
    p->pitch = 0.0f;
    p->selected_block = BLOCK_STONE;
    p->grounded = false;
    p->fly_mode = true;       /* start in fly mode so ungenerated terrain
                                 doesn't drop the player off the edge */
    p->vy = 0.0f;
    p->last_tile = -1;
    /* Spawn 10 m above what will become the surface at (1,0,0). */
    const double r0 = body->radius_m + 10.0;
    p->position = dvec3_make(r0, 0, 0);
}

dvec3_t player_world_pos(const player_ctrl_t* p) { return p->position; }

/* ----------------------------------------------------------------------- */

void player_update(player_ctrl_t* p, world_t* w, float dt) {
    const input_state_t* in = input_state();

    /* Mouse / look-stick. Yaw is +right (fwd rotates toward basis.right). */
    p->yaw   += in->mouse_dx * MOUSE_SENS;
    p->pitch -= in->mouse_dy * MOUSE_SENS;
    if (in->look_stick_active) {
        p->yaw   += in->look_stick_x * LOOK_STICK_SENS * dt;
        p->pitch += in->look_stick_y * LOOK_STICK_SENS * dt;
    }
    if (p->pitch >  PITCH_LIMIT) p->pitch =  PITCH_LIMIT;
    if (p->pitch < -PITCH_LIMIT) p->pitch = -PITCH_LIMIT;

    p->fly_mode = in->phys.fly_mode;

    /* Movement. */
    float speed = in->phys.sprint ? SPRINT_SPEED : WALK_SPEED;
    if (p->fly_mode) speed = FLY_SPEED;
    dvec3_t wish = walk_wish(p, &in->phys);
    p->position = dvec3_add(p->position, dvec3_scale(wish, (double)speed * (double)dt));

    /* Track the tile we're over for raycast / edit queries. */
    dvec3_t dir = dvec3_normalize(p->position);
    p->last_tile = goldberg_find_tile(w->grid, dir, p->last_tile);

    const float gravity = 25.0f * p->body->gravity_g;
    if (p->fly_mode) {
        float fy = 0.0f;
        if (in->phys.fly_up)   fy += 1.0f;
        if (in->phys.fly_down) fy -= 1.0f;
        tangent_basis_t b = phys_tangent_basis(p->position);
        p->position = dvec3_add(p->position, dvec3_scale(b.up, (double)fy * (double)speed * (double)dt));
        p->vy = 0.0f;
        p->grounded = false;
    } else {
        if (in->phys.jump && p->grounded) {
            p->vy = JUMP_VEL;
            p->grounded = false;
        } else if (in->phys.jump && !p->grounded) {
            p->vy += JETPACK_ACCEL * dt;
            if (p->vy > JETPACK_MAX_VY) p->vy = JETPACK_MAX_VY;
        }
        p->vy -= gravity * dt;

        tangent_basis_t b = phys_tangent_basis(p->position);
        p->position = dvec3_add(p->position, dvec3_scale(b.up, (double)p->vy * (double)dt));

        /* Ground snap based on the current tile's top solid block. */
        double gr = ground_radius_under(w, p->last_tile);
        if (gr > -1e8) {
            double r = dvec3_length(p->position);
            if (r < gr) {
                /* Snap up to the ground surface. */
                p->position = dvec3_scale(dvec3_normalize(p->position), gr);
                p->vy = 0.0f;
                p->grounded = true;
            } else if (fabs(r - gr) < 0.05 && p->vy <= 0.0f) {
                p->grounded = true;
                p->vy = 0.0f;
            } else {
                p->grounded = false;
            }
        } else {
            /* Tile not yet generated — don't fall. */
            p->grounded = false;
            p->vy = 0.0f;
        }
    }
}

mat4_t player_view(const player_ctrl_t* p) {
    dvec3_t look, up;
    compute_look(p, &look, &up);
    tangent_basis_t b = phys_tangent_basis(p->position);
    dvec3_t eye = dvec3_add(p->position, dvec3_scale(b.up, (double)EYE_HEIGHT));
    dvec3_t target = dvec3_add(eye, look);
    vec3_t eye_f = dvec3_to_vec3(eye);
    vec3_t tgt_f = dvec3_to_vec3(target);
    vec3_t up_f  = { (float)up.x, (float)up.y, (float)up.z };
    return mat4_look_at(eye_f, tgt_f, up_f);
}
