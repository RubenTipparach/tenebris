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

/* Rotate v by the shortest rotation aligning unit a with unit b.
 * Rodrigues: v' = v c + (k × v) s + k (k·v)(1 - c),  k = normalize(a×b).
 * Identity when a ≈ b; 180° around an arbitrary perpendicular when
 * a ≈ -b. */
static dvec3_t rotate_between(dvec3_t a, dvec3_t b, dvec3_t v) {
    double d = dvec3_dot(a, b);
    if (d >  0.99999999) return v;
    if (d < -0.99999999) {
        dvec3_t ref = (fabs(a.x) < 0.9) ? dvec3_make(1, 0, 0) : dvec3_make(0, 1, 0);
        dvec3_t k = dvec3_normalize(dvec3_cross(a, ref));
        double  kv = dvec3_dot(k, v);
        return dvec3_sub(dvec3_scale(k, 2.0 * kv), v);
    }
    dvec3_t k = dvec3_normalize(dvec3_cross(a, b));
    double angle = acos(d);
    double c = cos(angle), s = sin(angle);
    dvec3_t cross = dvec3_cross(k, v);
    double  kdotv = dvec3_dot(k, v);
    return dvec3_add(dvec3_add(dvec3_scale(v, c),
                                dvec3_scale(cross, s)),
                     dvec3_scale(k, kdotv * (1.0 - c)));
}

/* Offset from the player's current body center (for surface-normal
 * math). Matches JS PlanetPlayer.updateLocalOrientation, which derives
 * localUp from the surface normal of the planet the player is on. */
static dvec3_t player_local_pos(const player_ctrl_t* p) {
    dvec3_t c = dvec3_make(p->body->pos_x, p->body->pos_y, p->body->pos_z);
    return dvec3_sub(p->position, c);
}

/* Re-align the player's persistent tangent basis to the current
 * radial up (the surface normal of p->body at the player's position).
 * Carry fwd/right across by parallel transport so the basis stays
 * continuous as the player traverses the sphere.
 * basis_ready = false forces a cold rebuild — used on init + teleport. */
static void sync_basis(player_ctrl_t* p) {
    dvec3_t local = player_local_pos(p);
    dvec3_t new_up = dvec3_normalize(local);
    if (!p->basis_ready) {
        p->basis = phys_tangent_basis(local);
        p->basis_ready = true;
        return;
    }
    dvec3_t old_up = p->basis.up;
    p->basis.fwd   = rotate_between(old_up, new_up, p->basis.fwd);
    p->basis.right = rotate_between(old_up, new_up, p->basis.right);
    p->basis.up    = new_up;
    p->basis.right = dvec3_normalize(dvec3_cross(p->basis.fwd, p->basis.up));
    p->basis.fwd   = dvec3_normalize(dvec3_cross(p->basis.up,  p->basis.right));
}

/* ----------------------------------------------------------------------- */

static void compute_look(const player_ctrl_t* p, dvec3_t* out_look, dvec3_t* out_up) {
    const tangent_basis_t* b = &p->basis;
    double cy = cos((double)p->yaw),   sy = sin((double)p->yaw);
    double cp = cos((double)p->pitch), sp = sin((double)p->pitch);
    dvec3_t fwd = dvec3_add(dvec3_scale(b->fwd, cy), dvec3_scale(b->right, sy));
    dvec3_t look = dvec3_add(dvec3_scale(fwd, cp), dvec3_scale(b->up, sp));
    *out_look = dvec3_normalize(look);
    *out_up   = b->up;
}

static dvec3_t walk_wish(const player_ctrl_t* p, const phys_input_t* in) {
    const tangent_basis_t* b = &p->basis;
    double cy = cos((double)p->yaw), sy = sin((double)p->yaw);
    dvec3_t fwd   = dvec3_add(dvec3_scale(b->fwd, cy),  dvec3_scale(b->right, sy));
    dvec3_t right = dvec3_add(dvec3_scale(b->fwd, -sy), dvec3_scale(b->right, cy));
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

/* Max step-up the player can take horizontally without jumping. Walking
 * onto a column whose top exceeds (current feet radius + STEP_HEIGHT)
 * is treated as a vertical wall and blocked. Matches the Minecraft
 * "auto-step-up half a block" feel; tall walls require jump/jetpack. */
#define STEP_HEIGHT 0.6

/* Try to apply `delta` to `pos` along the body's tangent plane. If the
 * tile under the candidate position is a wall (its column top sits
 * more than STEP_HEIGHT above the player's current feet), the move is
 * rejected and `pos` is returned unchanged so the player slides along
 * the wall instead of teleporting up onto it. */
static dvec3_t try_horizontal_step(const world_t* w,
                                    const player_ctrl_t* p,
                                    dvec3_t pos,
                                    dvec3_t delta) {
    dvec3_t center    = dvec3_make(p->body->pos_x, p->body->pos_y, p->body->pos_z);
    dvec3_t candidate = dvec3_add(pos, delta);
    dvec3_t cand_loc  = dvec3_sub(candidate, center);
    int     cand_tile = goldberg_find_tile(w->grid, dvec3_normalize(cand_loc), p->last_tile);
    double  cand_gr   = ground_radius_under(w, cand_tile);
    if (cand_gr <= -1e8) return candidate;  /* ungenerated — don't block */
    double feet_r = dvec3_length(dvec3_sub(pos, center));
    if (cand_gr - feet_r > STEP_HEIGHT) return pos;  /* wall — slide */
    return candidate;
}

/* ----------------------------------------------------------------------- */

void player_init(player_ctrl_t* p, const body_config_t* body) {
    p->body = body;
    p->yaw = 0.0f;
    p->pitch = 0.0f;
    p->grounded = false;
    p->fly_mode = false;       /* start on the ground, gravity on */
    p->vy = 0.0f;
    p->last_tile = -1;
    p->basis_ready = false;
    /* Default to creative — the menu / a key toggle will switch to
     * survival, which calls inventory_init_empty + sets survival_mode. */
    p->survival_mode = false;
    inventory_init_creative(&p->inventory);
    /* Spawn ~2 m above body's prime meridian surface. */
    const double r0 = body->radius_m + 2.0;
    p->position = dvec3_make(body->pos_x + r0, body->pos_y, body->pos_z);
}

dvec3_t player_world_pos(const player_ctrl_t* p) { return p->position; }

/* ----------------------------------------------------------------------- */

void player_update(player_ctrl_t* p, world_t* w, float dt) {
    const input_state_t* in = input_state();

    /* Parallel-transport the tangent basis to the current position
     * before any movement. Subsequent sync_basis calls below handle
     * position changes from walking + gravity. */
    sync_basis(p);

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

    /* Hotbar 1..9 picks an inventory slot. Edge-triggered by input.c. */
    for (int i = 0; i < INV_HOTBAR_SLOTS; ++i) {
        if (in->hotbar[i]) inventory_select(&p->inventory, i);
    }

    /* Mouse-wheel cycles the hotbar one slot per ±1.0 of accumulated
     * scroll, with wrap-around at both ends. Positive wheel_dy
     * (scroll up / away from user) selects the previous slot — the
     * Minecraft convention. */
    p->hotbar_scroll_accum += in->wheel_dy;
    while (p->hotbar_scroll_accum >= 1.0f) {
        int s = p->inventory.selected - 1;
        if (s < 0) s = INV_HOTBAR_SLOTS - 1;
        inventory_select(&p->inventory, s);
        p->hotbar_scroll_accum -= 1.0f;
    }
    while (p->hotbar_scroll_accum <= -1.0f) {
        int s = p->inventory.selected + 1;
        if (s >= INV_HOTBAR_SLOTS) s = 0;
        inventory_select(&p->inventory, s);
        p->hotbar_scroll_accum += 1.0f;
    }

    /* Movement. */
    float speed = in->phys.sprint ? SPRINT_SPEED : WALK_SPEED;
    if (p->fly_mode) speed = FLY_SPEED;
    dvec3_t wish = walk_wish(p, &in->phys);

    const bool on_tenebris = (p->body->id == BODY_TENEBRIS);
    if (p->fly_mode || !on_tenebris) {
        p->position = dvec3_add(p->position, dvec3_scale(wish, (double)speed * (double)dt));
    } else {
        /* Quake-style axis-separated wall collision: walk-fwd and strafe
         * sub-moves are tested independently so a wall blocks only the
         * component that hits it, leaving the perpendicular slide
         * intact. Replaces the old "walk into a column, get teleported
         * to the top of it" snap which yanked the camera up over
         * vertical faces. */
        const tangent_basis_t* b = &p->basis;
        double cy = cos((double)p->yaw), sy = sin((double)p->yaw);
        dvec3_t walk_fwd = dvec3_add(dvec3_scale(b->fwd,  cy), dvec3_scale(b->right, sy));
        dvec3_t strafe   = dvec3_add(dvec3_scale(b->fwd, -sy), dvec3_scale(b->right, cy));
        double s = (double)speed * (double)dt;
        double walk_amt   = dvec3_dot(wish, walk_fwd) * s;
        double strafe_amt = dvec3_dot(wish, strafe)   * s;
        p->position = try_horizontal_step(w, p, p->position, dvec3_scale(walk_fwd, walk_amt));
        p->position = try_horizontal_step(w, p, p->position, dvec3_scale(strafe,   strafe_amt));
    }

    /* Track the tile we're over (Tenebris only — it's the only body
     * whose world_t is wired through the physics path right now). */
    if (on_tenebris) {
        dvec3_t local_dir = dvec3_normalize(player_local_pos(p));
        p->last_tile = goldberg_find_tile(w->grid, local_dir, p->last_tile);
    } else {
        p->last_tile = -1;
    }

    const float gravity = 25.0f * p->body->gravity_g;
    if (p->fly_mode) {
        float fy = 0.0f;
        if (in->phys.fly_up)   fy += 1.0f;
        if (in->phys.fly_down) fy -= 1.0f;
        p->position = dvec3_add(p->position,
            dvec3_scale(p->basis.up, (double)fy * (double)speed * (double)dt));
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
        /* Gravity is supported by the floor when grounded — without
         * this gate, vy drains by `g*dt` every frame and the snap below
         * yanks the eye back up by a few mm, producing a per-frame
         * vertical bobble that reads as camera jitter. */
        if (!p->grounded) {
            p->vy -= gravity * dt;
        }

        p->position = dvec3_add(p->position,
            dvec3_scale(p->basis.up, (double)p->vy * (double)dt));

        /* Ground snap: only engage when falling or stationary, and only
         * when we're over Tenebris (the only body with voxel data in
         * `w`). Off-body physics just lets the player float — teleport
         * forces fly mode precisely so this doesn't matter visually. */
        if (on_tenebris) {
            double gr = ground_radius_under(w, p->last_tile);
            if (gr > -1e8) {
                dvec3_t local = player_local_pos(p);
                double  r     = dvec3_length(local);
                if (r < gr && p->vy <= 0.0f) {
                    /* Snap: scale the local (body-relative) position to
                     * the ground radius and re-offset back to world. */
                    dvec3_t snapped_local = dvec3_scale(dvec3_normalize(local), gr);
                    p->position = dvec3_add(
                        dvec3_make(p->body->pos_x, p->body->pos_y, p->body->pos_z),
                        snapped_local);
                    p->vy = 0.0f;
                    p->grounded = true;
                } else if (fabs(r - gr) < 0.05 && p->vy <= 0.0f) {
                    p->grounded = true;
                    p->vy = 0.0f;
                } else {
                    p->grounded = false;
                }
            } else {
                p->grounded = false;
                p->vy = 0.0f;
            }
        } else {
            /* On a non-Tenebris body, no snap. Player relies on fly
             * mode until we wire per-body world_t through physics. */
            p->grounded = false;
        }
    }

    /* Parallel-transport basis to the post-movement position so the
     * view + next frame see the updated frame. */
    sync_basis(p);
}

void player_set_body(player_ctrl_t* p, const body_config_t* body) {
    if (!p || !body || p->body == body) return;
    p->body = body;
    /* Force a cold rebuild of the tangent basis next sync — parallel
     * transport from the old body's "up" carries no useful info once
     * the anchor moves. Position stays put so the player keeps their
     * trajectory across the SOI boundary. */
    p->basis_ready = false;
    p->last_tile = -1;
}

void player_teleport_to(player_ctrl_t* p, const body_config_t* body) {
    if (!body) return;
    /* Switch gravity/surface-normal anchor to the destination body.
     * All subsequent sync_basis and gravity math reads p->body, so
     * "up" becomes the surface normal of the visited body instead of
     * staying stuck to Tenebris's. */
    p->body = body;
    /* Spawn at body center + (radius + 15 m) along (1, 0, 0). */
    dvec3_t center = dvec3_make(body->pos_x, body->pos_y, body->pos_z);
    dvec3_t offset = dvec3_make(body->radius_m + 15.0, 0.0, 0.0);
    p->position = dvec3_add(center, offset);
    p->vy = 0.0f;
    p->grounded = false;
    /* Force fly mode on so the player can orbit the new body; they
     * can press F to land. */
    p->fly_mode = true;
    input_set_fly_mode(true);
    /* Rebuild the tangent basis next frame — the huge jump means
     * parallel transport from the old up would be meaningless. */
    p->basis_ready = false;
    p->last_tile = -1;
}

mat4_t player_view(const player_ctrl_t* p) {
    dvec3_t look, up;
    compute_look(p, &look, &up);
    /* Eye sits EYE_HEIGHT along the body's surface normal — so the
     * camera's up stays aligned with the local "horizon level" of the
     * body the player is on, matching JS PlanetPlayer.updateCamera. */
    dvec3_t eye = dvec3_add(p->position, dvec3_scale(p->basis.up, (double)EYE_HEIGHT));
    dvec3_t target = dvec3_add(eye, look);
    vec3_t eye_f = dvec3_to_vec3(eye);
    vec3_t tgt_f = dvec3_to_vec3(target);
    vec3_t up_f  = { (float)up.x, (float)up.y, (float)up.z };
    return mat4_look_at(eye_f, tgt_f, up_f);
}
