#include "client/player_ctrl.h"
#include "client/input.h"
#include "core/blocks.h"
#include "core/config.h"
#include <math.h>

#define MOUSE_SENS       0.002f
#define LOOK_STICK_SENS  2.4f
#define WALK_SPEED       8.0f
#define SPRINT_SPEED    14.0f
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

/* Rotate v by `angle` radians around unit axis `axis` (Rodrigues).
 * Used to mutate the basis in space mode where mouse / roll input
 * applies free 6DOF rotations around basis.up / basis.right /
 * basis.fwd. */
static dvec3_t rotate_axis_angle(dvec3_t v, dvec3_t axis, double angle) {
    double c = cos(angle), s = sin(angle);
    dvec3_t cross = dvec3_cross(axis, v);
    double  kdotv = dvec3_dot(axis, v);
    return dvec3_add(dvec3_add(dvec3_scale(v, c),
                                dvec3_scale(cross, s)),
                     dvec3_scale(axis, kdotv * (1.0 - c)));
}

/* Re-orthonormalise the basis after partial rotations / slerps so
 * we don't drift off the rotation manifold. up is taken as the
 * authoritative direction; fwd is projected to be perpendicular,
 * then right = cross(fwd, up). */
static void orthonormalise_basis(tangent_basis_t* b) {
    b->up    = dvec3_normalize(b->up);
    /* Project fwd onto the plane perpendicular to up. */
    double d = dvec3_dot(b->fwd, b->up);
    b->fwd   = dvec3_sub(b->fwd, dvec3_scale(b->up, d));
    if (dvec3_dot(b->fwd, b->fwd) < 1e-12) {
        /* Degenerate — fwd was parallel to up. Fall back to a stable
         * tangent axis so the next rotation has something to work
         * with. */
        b->fwd = (fabs(b->up.x) < 0.9) ? dvec3_make(1, 0, 0) : dvec3_make(0, 1, 0);
        d = dvec3_dot(b->fwd, b->up);
        b->fwd = dvec3_normalize(dvec3_sub(b->fwd, dvec3_scale(b->up, d)));
    } else {
        b->fwd = dvec3_normalize(b->fwd);
    }
    b->right = dvec3_normalize(dvec3_cross(b->fwd, b->up));
}

/* Re-align the player's persistent tangent basis to the planet
 * radial up. Used in planet mode (after the transition slerp ends)
 * where basis.up must track the surface normal as the player walks
 * around the sphere. fwd/right parallel-transport across by the
 * shortest-arc rotation so the look direction stays continuous.
 * basis_ready = false forces a cold rebuild — used on init. */
static void sync_basis_to_planet(player_ctrl_t* p) {
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

/* Roll-slerp: each frame the basis rotates by `factor` of the way
 * from its current up toward `target_up`, with fwd/right carried
 * along. Matches PlanetPlayer.slerpRollToLevel — exponential
 * approach (lower factor = smoother / slower), so big mis-
 * alignments correct fast and the last few degrees ease in. */
static void slerp_basis_to_up(tangent_basis_t* b, dvec3_t target_up, float factor) {
    dvec3_t cur = dvec3_normalize(b->up);
    dvec3_t tgt = dvec3_normalize(target_up);
    double  d   = dvec3_dot(cur, tgt);
    if (d >  0.99999999) { b->up = tgt; orthonormalise_basis(b); return; }
    double angle = acos(d > 1.0 ? 1.0 : (d < -1.0 ? -1.0 : d));
    double step  = angle * (double)factor;
    dvec3_t axis;
    if (d < -0.99999999) {
        /* 180° flip — pick any perpendicular axis. */
        axis = (fabs(cur.x) < 0.9) ? dvec3_make(1, 0, 0) : dvec3_make(0, 1, 0);
        axis = dvec3_normalize(dvec3_cross(cur, axis));
    } else {
        axis = dvec3_normalize(dvec3_cross(cur, tgt));
    }
    b->up    = rotate_axis_angle(b->up,    axis, step);
    b->fwd   = rotate_axis_angle(b->fwd,   axis, step);
    b->right = rotate_axis_angle(b->right, axis, step);
    orthonormalise_basis(b);
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
    p->velocity = dvec3_make(0, 0, 0);
    p->is_in_space = false;
    p->transition_timer_s = 0.0f;
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

/* ----------------------------------------------------------------------- */
/* Player update — split into two top-level branches by gravity
 * influence at the current position. In planet mode we run walking +
 * jetpack + gravity + ground snap with the basis locked to the
 * planet's radial up. In space mode we run 6DOF mouse-look + thrust +
 * drag with no anchor. The transition slerp bridges the space →
 * planet edge so the camera doesn't pop. */

void player_update(player_ctrl_t* p, world_t* w, float dt) {
    const input_state_t* in = input_state();

    /* ---- Body selection + space/planet detection. The gravity
     * tracker picks whichever body delivers the strongest pull at
     * p->position, with a smooth taper out to gravity_falloff_mult.
     * Outside every body's falloff radius we're "in space" and the
     * 6DOF branch takes over. */
    const lod_config_t* L = config_lod();
    gravity_query_t gq = planet_gravity_at(p->position,
                                           L->gravity_full_mult,
                                           L->gravity_falloff_mult);
    bool was_in_space = p->is_in_space;
    p->is_in_space = (gq.body == NULL);
    if (gq.body && gq.body != p->body) {
        /* Mid-flight body swap — keep the basis as-is and let the
         * transition slerp align with the new planet's up. Reset
         * basis_ready=false would yank the camera; we want smooth. */
        p->body = gq.body;
        p->last_tile = -1;
    }
    /* Edge: leaving space → entering a gravity well. Arm the roll
     * slerp so the basis aligns smoothly with the new planet up. */
    if (was_in_space && !p->is_in_space) {
        p->transition_timer_s = L->roll_slerp_duration_s;
    }

    /* ---- Hotbar / wheel. Same as before, mode-independent. */
    for (int i = 0; i < INV_HOTBAR_SLOTS; ++i) {
        if (in->hotbar[i]) inventory_select(&p->inventory, i);
    }
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

    /* Mouse / look-stick deltas — combined inputs in radians. */
    double yaw_delta   =  (double)in->mouse_dx * MOUSE_SENS;
    double pitch_delta = -(double)in->mouse_dy * MOUSE_SENS;
    if (in->look_stick_active) {
        yaw_delta   += (double)in->look_stick_x * LOOK_STICK_SENS * (double)dt;
        pitch_delta += (double)in->look_stick_y * LOOK_STICK_SENS * (double)dt;
    }

    /* ============================================================== */
    /* SPACE MODE — 6DOF orientation, thrust + drag flight.            */
    /* ============================================================== */
    if (p->is_in_space) {
        /* Rotate basis directly around its own axes. Yaw around
         * basis.up turns left/right; pitch around basis.right looks
         * up/down (no clamp — full 6DOF allows looping); roll around
         * basis.fwd via Q/E so the player can bank. Keeps the basis
         * orthonormal each step. */
        if (yaw_delta   != 0.0) {
            p->basis.fwd   = rotate_axis_angle(p->basis.fwd,   p->basis.up, -yaw_delta);
            p->basis.right = rotate_axis_angle(p->basis.right, p->basis.up, -yaw_delta);
        }
        if (pitch_delta != 0.0) {
            p->basis.fwd = rotate_axis_angle(p->basis.fwd, p->basis.right, pitch_delta);
            p->basis.up  = rotate_axis_angle(p->basis.up,  p->basis.right, pitch_delta);
        }
        double roll_delta = 0.0;
        if (in->phys.roll_left)  roll_delta += (double)L->space_roll_speed * (double)dt;
        if (in->phys.roll_right) roll_delta -= (double)L->space_roll_speed * (double)dt;
        if (roll_delta != 0.0) {
            p->basis.up    = rotate_axis_angle(p->basis.up,    p->basis.fwd, roll_delta);
            p->basis.right = rotate_axis_angle(p->basis.right, p->basis.fwd, roll_delta);
        }
        orthonormalise_basis(&p->basis);

        /* Thrust acts along basis axes — fwd/back, strafe via
         * basis.right, up/down via basis.up (Space/C). Velocity is
         * world-space and decays exponentially toward zero so the
         * ship coasts to a stop. */
        dvec3_t accel = dvec3_make(0, 0, 0);
        if (in->phys.forward)  accel = dvec3_add(accel, p->basis.fwd);
        if (in->phys.backward) accel = dvec3_sub(accel, p->basis.fwd);
        if (in->phys.right)    accel = dvec3_add(accel, p->basis.right);
        if (in->phys.left)     accel = dvec3_sub(accel, p->basis.right);
        if (in->phys.fly_up)   accel = dvec3_add(accel, p->basis.up);
        if (in->phys.fly_down) accel = dvec3_sub(accel, p->basis.up);
        double aL = dvec3_length(accel);
        if (aL > 1e-6) {
            accel = dvec3_scale(accel, 1.0 / aL);
            double thrust = (double)L->space_thrust;
            if (in->phys.sprint) thrust *= 2.0;
            p->velocity = dvec3_add(p->velocity,
                                    dvec3_scale(accel, thrust * (double)dt));
        }
        /* Exponential drag — frame-rate-independent. */
        double damp = exp(-(double)L->space_drag * (double)dt);
        p->velocity = dvec3_scale(p->velocity, damp);
        p->position = dvec3_add(p->position,
                                dvec3_scale(p->velocity, (double)dt));
        p->grounded = false;
        p->last_tile = -1;
        return;
    }

    /* ============================================================== */
    /* PLANET MODE — basis locked to planet up; walking + gravity.    */
    /* ============================================================== */

    /* Bring basis into sync with the current radial up. Either via
     * the slerp (transition_timer counting down) or direct
     * parallel-transport (steady state on the planet). */
    if (p->transition_timer_s > 0.0f) {
        dvec3_t target_up = dvec3_normalize(player_local_pos(p));
        float step = L->roll_slerp_speed * dt;
        if (step > 1.0f) step = 1.0f;
        slerp_basis_to_up(&p->basis, target_up, step);
        p->transition_timer_s -= dt;
        if (p->transition_timer_s <= 0.0f) {
            /* Snap final alignment. After this point yaw + pitch
             * scalars take over and basis.up tracks planet up. */
            p->basis.up = target_up;
            orthonormalise_basis(&p->basis);
            p->basis_ready = true;
            /* Reset yaw/pitch to zero so the post-slerp basis is
             * exactly the look direction the player ended up at. */
            p->yaw = 0.0f;
            p->pitch = 0.0f;
        }
        /* During the slerp, mouse-look applies to the basis directly
         * (so the player can keep looking around). The yaw/pitch
         * scalars stay zero until the slerp ends; we'll re-key them
         * after. */
        if (yaw_delta != 0.0) {
            p->basis.fwd   = rotate_axis_angle(p->basis.fwd,   p->basis.up, -yaw_delta);
            p->basis.right = rotate_axis_angle(p->basis.right, p->basis.up, -yaw_delta);
        }
        if (pitch_delta != 0.0) {
            p->basis.fwd = rotate_axis_angle(p->basis.fwd, p->basis.right, pitch_delta);
            p->basis.up  = rotate_axis_angle(p->basis.up,  p->basis.right, pitch_delta);
            orthonormalise_basis(&p->basis);
        }
    } else {
        sync_basis_to_planet(p);
        /* Standard tangent-mouse-look — yaw rotates basis.fwd /
         * basis.right around basis.up; pitch is a stored angle that
         * compute_look adds when building the camera matrix. */
        p->yaw   += (float)yaw_delta;
        p->pitch += (float)pitch_delta;
        if (p->pitch >  PITCH_LIMIT) p->pitch =  PITCH_LIMIT;
        if (p->pitch < -PITCH_LIMIT) p->pitch = -PITCH_LIMIT;
    }

    /* ---- Walking + jetpack + gravity, all on planet up. */
    const bool has_world = (w != NULL && w->body == p->body);
    float speed = in->phys.sprint ? SPRINT_SPEED : WALK_SPEED;
    dvec3_t wish = walk_wish(p, &in->phys);

    if (has_world) {
        const tangent_basis_t* b = &p->basis;
        double cy = cos((double)p->yaw), sy = sin((double)p->yaw);
        dvec3_t walk_fwd = dvec3_add(dvec3_scale(b->fwd,  cy), dvec3_scale(b->right, sy));
        dvec3_t strafe   = dvec3_add(dvec3_scale(b->fwd, -sy), dvec3_scale(b->right, cy));
        double s = (double)speed * (double)dt;
        double walk_amt   = dvec3_dot(wish, walk_fwd) * s;
        double strafe_amt = dvec3_dot(wish, strafe)   * s;
        p->position = try_horizontal_step(w, p, p->position, dvec3_scale(walk_fwd, walk_amt));
        p->position = try_horizontal_step(w, p, p->position, dvec3_scale(strafe,   strafe_amt));
        dvec3_t local_dir = dvec3_normalize(player_local_pos(p));
        p->last_tile = goldberg_find_tile(w->grid, local_dir, p->last_tile);
    } else {
        /* Body anchored but no world handed in (e.g. transition
         * frame before main_web routes the new body's world). Fall
         * back to free walking on the basis tangent. */
        p->position = dvec3_add(p->position,
                                dvec3_scale(wish, (double)speed * (double)dt));
        p->last_tile = -1;
    }

    /* Vertical velocity along basis.up — kept as a scalar (vy)
     * folded into p->velocity so the space → planet handoff doesn't
     * need to convert representations. We only USE the basis-up
     * component here; tangential velocity is allowed to coast on
     * for a frame or two as the slerp ends. */
    double vy = dvec3_dot(p->velocity, p->basis.up);
    /* Gravity scaled by (a) the body's gravity_g modifier and (b)
     * the smooth falloff multiplier from planet_gravity_at, so as
     * the player drifts up out of the well their fall slows. */
    const float base_gravity = 25.0f * p->body->gravity_g;
    const float gravity = base_gravity * gq.multiplier;
    if (in->phys.jump && p->grounded) {
        vy = JUMP_VEL;
        p->grounded = false;
    } else if (in->phys.jump && !p->grounded) {
        vy += (double)JETPACK_ACCEL * (double)dt;
        if (vy > (double)JETPACK_MAX_VY) vy = JETPACK_MAX_VY;
    }
    if (!p->grounded) {
        vy -= (double)gravity * (double)dt;
    }
    /* Re-pack vy back into the world-space velocity. Tangential
     * component (orthogonal to basis.up) is damped — without this
     * the player keeps any orbital push from a recent space-mode
     * coast forever. */
    dvec3_t vel_tan = dvec3_sub(p->velocity, dvec3_scale(p->basis.up, dvec3_dot(p->velocity, p->basis.up)));
    double tan_damp = exp(-2.0 * (double)dt);
    vel_tan = dvec3_scale(vel_tan, tan_damp);
    p->velocity = dvec3_add(vel_tan, dvec3_scale(p->basis.up, vy));

    /* Apply position update from velocity. */
    p->position = dvec3_add(p->position, dvec3_scale(p->velocity, (double)dt));

    /* Ground snap. */
    if (has_world) {
        double gr = ground_radius_under(w, p->last_tile);
        if (gr > -1e8) {
            dvec3_t local = player_local_pos(p);
            double  r     = dvec3_length(local);
            if (r < gr && vy <= 0.0) {
                dvec3_t snapped_local = dvec3_scale(dvec3_normalize(local), gr);
                p->position = dvec3_add(
                    dvec3_make(p->body->pos_x, p->body->pos_y, p->body->pos_z),
                    snapped_local);
                /* Zero out the radial component but keep tangential
                 * for one frame so a sliding landing reads correct. */
                vel_tan = dvec3_sub(p->velocity, dvec3_scale(p->basis.up, dvec3_dot(p->velocity, p->basis.up)));
                p->velocity = vel_tan;
                p->grounded = true;
            } else if (fabs(r - gr) < 0.05 && vy <= 0.0) {
                p->grounded = true;
                vel_tan = dvec3_sub(p->velocity, dvec3_scale(p->basis.up, dvec3_dot(p->velocity, p->basis.up)));
                p->velocity = vel_tan;
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

void player_set_body(player_ctrl_t* p, const body_config_t* body) {
    if (!p || !body || p->body == body) return;
    p->body = body;
    p->last_tile = -1;
    /* If we were in space and now have a body, arm the slerp so the
     * basis aligns smoothly with the new planet's up. The
     * planet-mode branch in player_update reads transition_timer_s
     * each frame and applies the slerp. */
    if (p->is_in_space) {
        p->transition_timer_s = config_lod()->roll_slerp_duration_s;
    }
}

void player_teleport_to(player_ctrl_t* p, const body_config_t* body) {
    if (!body) return;
    /* Snap to the destination's prime meridian, ~3 m above the
     * surface — well within the body's full-gravity radius (default
     * 1.4×r), so the gravity integrator pulls the player straight
     * onto the ground rather than letting them drift through. */
    p->body = body;
    dvec3_t center = dvec3_make(body->pos_x, body->pos_y, body->pos_z);
    dvec3_t offset = dvec3_make(body->radius_m + 3.0, 0.0, 0.0);
    p->position = dvec3_add(center, offset);
    p->velocity = dvec3_make(0, 0, 0);
    p->grounded = false;
    p->is_in_space = false;
    /* Cold-rebuild the basis so the slerp starts from a clean
     * planet-aligned starting point — the old basis pointed at
     * the previous body's surface, which is irrelevant after a
     * cross-system jump. */
    p->basis_ready = false;
    p->last_tile = -1;
    /* Arm the roll-slerp anyway so the very first frame eases the
     * camera into level rather than popping into a fully-locked
     * planet basis from whatever orientation the player was in. */
    p->transition_timer_s = config_lod()->roll_slerp_duration_s;
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
