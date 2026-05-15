#include "client/player_ctrl.h"
#include "client/input.h"
#include "core/config.h"
#include <math.h>
#include <stdio.h>

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

#define MOUSE_SENS       0.002f
#define LOOK_STICK_SENS  2.4f
#define WALK_SPEED       8.0f
#define SPRINT_SPEED    14.0f
/* JUMP_VEL / JETPACK_* are now sourced from lod.yaml (config_lod()->
 * jump_velocity_mps / jetpack_accel_mps2 / jetpack_max_vy_mps); the
 * old defines are retired so the only knob designers reach for is
 * the YAML, not a recompile. */
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

/* Maximum per-frame parallel-transport rotation in sync_basis_to_planet.
 * Anything larger means the player has been teleported tangentially in
 * a single frame (lag-spike + velocity*dt overshoot, residual
 * spaceflight momentum during a slerp, a buggy collision response push
 * — historical sources of the "random rotation snap" symptom). Rather
 * than transporting fwd/right through a 10°+ rotation in one step,
 * which the player perceives as a camera snap, arm the roll-slerp so
 * the rotation eases across multiple frames. */
#define ANTI_SNAP_MAX_RAD     0.0873   /* ~5° per frame */

/* Total elapsed time the diagnostic has seen. Used to rate-limit
 * chatty INFO transitions (body swap, space flip) AND the anti-snap
 * warning so a long session can't flood the console. ERRORs aren't
 * rate-limited — a real wild rotate is something we want every
 * instance of. */
static double s_jerk_clock_s     = 0.0;
static double s_jerk_last_info_s = -1e9;

/* Throttle for the anti-snap diagnostic print so a sustained source
 * (e.g. the player physically standing on a violently-moving body)
 * can't flood the console. */
static double s_anti_snap_last_log_s = -1e9;

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
    /* Anti-snap guard: if old_up and new_up disagree by more than
     * ~5°, something delivered an oversized tangent jump this frame.
     * Don't update the basis here - leave the camera in its current
     * orientation for one frame and arm the roll-slerp instead, so
     * the next several frames ease basis.up toward new_up rather
     * than snapping it in one step. */
    double up_dot = dvec3_dot(old_up, new_up);
    if (up_dot >  1.0) up_dot =  1.0;
    if (up_dot < -1.0) up_dot = -1.0;
    double up_angle = acos(up_dot);
    if (up_angle > ANTI_SNAP_MAX_RAD) {
        if (s_jerk_clock_s - s_anti_snap_last_log_s > 1.0) {
            fprintf(stderr,
                    "[player] WARN: anti-snap engaged - basis.up wanted to "
                    "rotate %.2f deg in one frame (limit %.2f deg); arming "
                    "roll-slerp to smooth it out\n",
                    up_angle * (180.0 / M_PI),
                    (double)ANTI_SNAP_MAX_RAD * (180.0 / M_PI));
            fflush(stderr);
            s_anti_snap_last_log_s = s_jerk_clock_s;
        }
        p->transition_timer_s = config_lod()->roll_slerp_duration_s;
        return;
    }
    p->basis.fwd   = rotate_between(old_up, new_up, p->basis.fwd);
    p->basis.right = rotate_between(old_up, new_up, p->basis.right);
    p->basis.up    = new_up;
    p->basis.right = dvec3_normalize(dvec3_cross(p->basis.fwd, p->basis.up));
    p->basis.fwd   = dvec3_normalize(dvec3_cross(p->basis.up,  p->basis.right));
}

/* Bake the planet-mode scalar yaw + pitch into the basis itself
 * and zero them. compute_look applies yaw/pitch ON TOP of basis.fwd
 * by design — that's the cheap way to accumulate look direction
 * while basis.up tracks the planet radial. The trick stops working
 * the moment the basis becomes 6DOF (entering space, or starting a
 * roll-slerp on a body swap): mouse-look from then on rotates the
 * basis directly, but compute_look would still apply the stale
 * yaw/pitch on top, painting the view direction with a phantom
 * offset that the player can't shake without walking back to the
 * exact orientation they had when the transition started.
 *
 * Baking transfers those rotations into basis.fwd/right/up so the
 * basis IS the orientation; subsequent space-mode mouse-look
 * mutates the right thing. Sign conventions match the inline space-
 * mode mouse handling: yaw rotates around basis.up by -yaw (because
 * up × fwd = -right under our basis construction); pitch rotates
 * around basis.right by +pitch (right × fwd = +up). Re-orthonormalise
 * after to clamp any drift from the two sequential rotations. */
static void bake_yaw_pitch_into_basis(player_ctrl_t* p) {
    if (p->yaw != 0.0f) {
        double y = (double)p->yaw;
        p->basis.fwd   = rotate_axis_angle(p->basis.fwd,   p->basis.up, -y);
        p->basis.right = rotate_axis_angle(p->basis.right, p->basis.up, -y);
    }
    if (p->pitch != 0.0f) {
        double pi = (double)p->pitch;
        p->basis.fwd = rotate_axis_angle(p->basis.fwd, p->basis.right,  pi);
        p->basis.up  = rotate_axis_angle(p->basis.up,  p->basis.right,  pi);
    }
    orthonormalise_basis(&p->basis);
    p->yaw = 0.0f;
    p->pitch = 0.0f;
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

/* Max step-up the player can take horizontally without jumping is
 * sourced from lod.yaml's step_height_m. Walking onto a column whose
 * floor exceeds (current feet radius + step_height) is treated as a
 * vertical wall and blocked. Matches the Minecraft "auto-step-up half
 * a block" feel; tall walls require jump/jetpack. */

/* Try to apply `delta` to `pos` along the body's tangent plane. The
 * candidate tile is rejected (and the move slides) if either:
 *   - no walkable floor exists at or below the player's feet within
 *     step_height_m (i.e. a wall blocks the move), or
 *   - the headroom above the candidate floor is less than body_height
 *     (i.e. moving forward would push the player's head into the
 *     ceiling of a low passage). */
static dvec3_t try_horizontal_step(const world_t* w,
                                    const player_ctrl_t* p,
                                    dvec3_t pos,
                                    dvec3_t delta,
                                    double body_height_m) {
    dvec3_t center    = dvec3_make(p->body->pos_x, p->body->pos_y, p->body->pos_z);
    dvec3_t candidate = dvec3_add(pos, delta);
    dvec3_t cand_loc  = dvec3_sub(candidate, center);
    int     cand_tile = goldberg_find_tile(w->grid, dvec3_normalize(cand_loc), p->last_tile);
    double  feet_r    = dvec3_length(dvec3_sub(pos, center));
    /* Headroom-respecting floor search: any floor we accept must have
     * body_height_m of clear air above it. If none exists, the
     * candidate tile is impassable from this elevation. */
    double  cand_gr   = world_walkable_floor_near(w, cand_tile, feet_r, body_height_m);
    if (cand_gr <= -1e8) {
        /* No walkable+headroom-clear floor on the candidate tile.
         * Check if the tile is ungenerated (in which case let the
         * player drift) vs. genuinely blocked. */
        if (cand_tile < 0 || cand_tile >= w->tile_count || cand_tile >= w->gen_cursor) {
            return candidate;
        }
        return pos;  /* blocked — too tight or no floor */
    }
    const double step_h = (double)config_lod()->step_height_m;
    if (cand_gr - feet_r > step_h) return pos;  /* wall — slide */
    return candidate;
}

/* ----------------------------------------------------------------------- */

/* Push the player horizontally away from any solid voxel face whose
 * boundary sits within camera_collider_radius_m of the eye (at eye
 * depth). Acts as a "fat" cylinder around the eye/camera so the
 * perspective near plane never finds itself on the wrong side of a
 * wall.
 *
 * Each Goldberg tile has up to 6 edge-neighbours; the wall between
 * tile A and tile B lies on the perpendicular bisector plane of the
 * line A.center → B.center (extruded radially). Distance from the
 * eye to that plane is the projection of (midpoint - eye) onto the
 * normalised separation. If the neighbour's voxel at eye_depth is
 * solid and that distance is less than the collider radius, we push
 * the player back along the wall normal by the penetration amount,
 * projected into the tangent plane so the radial position (and any
 * ground-snap fixup above) stays untouched.
 *
 * The push contributions for the (up to) 6 walls sum, so a player
 * wedged into a corner gets pushed diagonally away from BOTH walls
 * in a single frame. */
static void camera_collider_push(world_t* w, player_ctrl_t* p, int cur_tile) {
    const lod_config_t* L = config_lod();
    float radius_m = L->camera_collider_radius_m;
    if (radius_m <= 0.0f) return;
    if (!w || cur_tile < 0 || cur_tile >= w->tile_count) return;
    const goldberg_tile_t* t = goldberg_tile(w->grid, cur_tile);
    if (!t) return;

    dvec3_t center  = dvec3_make(p->body->pos_x, p->body->pos_y, p->body->pos_z);
    dvec3_t eye_pos = dvec3_add(p->position, dvec3_scale(p->basis.up, (double)EYE_HEIGHT));
    dvec3_t eye_local = dvec3_sub(eye_pos, center);
    double  eye_r   = dvec3_length(eye_local);
    if (eye_r < 1e-6) return;
    int     eye_depth = world_radius_to_depth(w, eye_r);
    if (eye_depth < 0 || eye_depth >= WORLD_MAX_DEPTH) return;

    dvec3_t total_push = dvec3_make(0, 0, 0);
    for (int k = 0; k < t->num_neighbors; ++k) {
        int nb = t->edge_neighbours[k];
        if (nb < 0 || nb >= w->tile_count) continue;
        /* Ungenerated columns read as all-air; nothing to collide with. */
        if (nb >= w->gen_cursor) continue;
        block_t nb_block = (block_t)w->blocks[(size_t)nb * WORLD_MAX_DEPTH + eye_depth];
        if (!block_is_solid(nb_block)) continue;

        const goldberg_tile_t* tn = goldberg_tile(w->grid, nb);
        if (!tn) continue;

        /* Wall plane: perpendicular bisector of (t.center → tn.center). */
        dvec3_t to_nb = dvec3_sub(tn->center, t->center);
        double  to_nb_len = dvec3_length(to_nb);
        if (to_nb_len < 1e-9) continue;
        dvec3_t n_norm = dvec3_scale(to_nb, 1.0 / to_nb_len);

        /* Midpoint on the unit sphere, projected to eye radius so the
         * comparison is in physical metres at the eye's depth. */
        dvec3_t mid = dvec3_scale(dvec3_add(t->center, tn->center), 0.5);
        double  mid_len = dvec3_length(mid);
        if (mid_len < 1e-9) continue;
        mid = dvec3_scale(mid, eye_r / mid_len);

        /* Signed perpendicular distance from eye to the wall plane,
         * positive when the wall is on the +n_norm (neighbour) side
         * of the eye. */
        dvec3_t to_mid = dvec3_sub(mid, eye_local);
        double  dist = dvec3_dot(to_mid, n_norm);
        if (dist >= (double)radius_m) continue;  /* far enough */

        double penetration = (double)radius_m - dist;
        /* Accumulate a horizontal push along -n_norm by the
         * penetration amount, projected onto the tangent plane so
         * radial position stays as the ground snap left it. */
        dvec3_t push = dvec3_scale(n_norm, -penetration);
        double  radial_part = dvec3_dot(push, p->basis.up);
        push = dvec3_sub(push, dvec3_scale(p->basis.up, radial_part));
        total_push = dvec3_add(total_push, push);
    }
    if (dvec3_dot(total_push, total_push) > 1e-9) {
        p->position = dvec3_add(p->position, total_push);
    }
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
    p->jump_held_s = 0.0f;
    p->jump_consumed = false;
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

/* Camera-jerk diagnostic. Distinguishes legitimate transitions
 * (intentional 6DOF look in space, slerp-controlled roll on planet
 * entry, body-swap edges) from genuine anomalies (basis flipping
 * during steady-state walking, position teleporting beyond what
 * velocity * dt can explain). The logger only barks on the second
 * class — and labels it [ERROR] so it stands out in the console —
 * so a "wild rotate while walking" report shows up as a single
 * obvious line. Cheap and rate-limited so it can't tank the
 * framerate even if multiple frames fire in a row. */
typedef struct {
    bool                 valid;
    dvec3_t              position;
    dvec3_t              basis_up;
    dvec3_t              basis_fwd;
    dvec3_t              velocity;
    bool                 is_in_space;
    bool                 grounded;
    float                transition_timer_s;
    const body_config_t* body;
} jerk_snapshot_t;

/* Wild-rotation thresholds (steady-state planet mode only). Walking
 * smoothly produces basis changes of ~0.05° / frame at 60 fps; ground
 * snap can yield up to step_height_m (0.6 m) of vertical pop on a
 * step-up; horizontal motion caps at SPRINT_SPEED * dt ≈ 0.23 m /
 * frame. The thresholds are well above those expected values so
 * normal gameplay stays silent.
 *
 * The basis-up threshold is intentionally separate from the position
 * one because basis.up rotates by `tangent_dist / body_radius`
 * radians: a 0.5 m tangent slide on a 10 m asteroid (small body)
 * gives 2.9° even though the slide is below the position threshold.
 * To keep the basis check meaningful on small bodies we compare the
 * basis rotation against what the actual position change would
 * expect - see jerk_log for the expected-rotation calc. */
#define JERK_UP_DELTA_RAD       0.0349   /* ~2°  */
#define JERK_FWD_DELTA_RAD      0.0349   /* ~2°  */
#define JERK_POS_FUDGE_M        1.0      /* tolerance over velocity * dt */
#define JERK_RATE_LIMIT_S       0.25     /* max one [INFO] line per quarter-second */

/* (s_jerk_clock_s + s_jerk_last_info_s declared near the top of the
 * file so sync_basis_to_planet's anti-snap warning can rate-limit
 * itself against the same shared clock without forward-declarations.) */

static void jerk_log(const player_ctrl_t* p, const jerk_snapshot_t* prev,
                     world_t* w, float dt) {
    s_jerk_clock_s += (double)dt;
    /* Skip the very first frame after init — basis_t starts as
     * zero-init {0,0,0} and acos(0)=90°, which would print a
     * spurious 90° "rotation" the first time player_update runs.
     * The valid flag on `prev` is set the first time we run; the
     * basis check confirms it had real content. */
    if (!prev->valid) return;
    if (dvec3_dot(prev->basis_up, prev->basis_up) < 0.5) return;

    /* Snapshot deltas. */
    dvec3_t dpos = dvec3_sub(p->position, prev->position);
    double pos_jump = dvec3_length(dpos);
    /* Decompose Δpos into radial (along prev->basis.up - the planet
     * up the player perceived ENTERING this frame) and tangential
     * (perpendicular). On a planet, radial-only motion can't rotate
     * basis.up; only tangential motion does. So when a rotation
     * snap is reported, the tangential component is what to blame. */
    double pos_radial   = dvec3_dot(dpos, prev->basis_up);
    dvec3_t pos_tan_vec = dvec3_sub(dpos, dvec3_scale(prev->basis_up, pos_radial));
    double pos_tangent  = dvec3_length(pos_tan_vec);
    double up_dot  = dvec3_dot(p->basis.up,  prev->basis_up);
    double fwd_dot = dvec3_dot(p->basis.fwd, prev->basis_fwd);
    if (up_dot  >  1.0) up_dot  =  1.0;
    if (up_dot  < -1.0) up_dot  = -1.0;
    if (fwd_dot >  1.0) fwd_dot =  1.0;
    if (fwd_dot < -1.0) fwd_dot = -1.0;
    double up_angle  = acos(up_dot);
    double fwd_angle = acos(fwd_dot);
    /* Expected basis.up rotation: arc length pos_tangent traversed
     * on the body sphere subtends pos_tangent / body_radius radians.
     * If the actual rotation is much larger than this, the basis
     * jumped without a corresponding position move - that's the bug
     * symptom (basis re-init / parallel-transport from a stale up). */
    double body_radius  = prev->body ? (double)prev->body->radius_m : 1.0;
    double up_expected  = pos_tangent / (body_radius > 1e-3 ? body_radius : 1.0);
    double up_excess    = up_angle - up_expected;
    double vL_prev   = dvec3_length(prev->velocity);
    bool   body_changed  = (p->body != prev->body);
    bool   space_flipped = (p->is_in_space != prev->is_in_space);

    /* Frames where wild rotation is *expected* — skip ERROR
     * detection (still consider INFO for the edges). The slerp
     * mutates the basis directly; space mode is full 6DOF; body
     * swaps trigger their own slerp; teleport is user-initiated. */
    bool transitioning = prev->transition_timer_s > 0.0f
                      || p->transition_timer_s    > 0.0f
                      || prev->is_in_space
                      || p->is_in_space
                      || body_changed
                      || space_flipped;

    /* ---- ERROR class: anomalies in steady-state planet mode that
     * the player would perceive as a snap. Logged unconditionally
     * (no rate-limit) so a single occurrence shows up. The basis-up
     * rotation check is compared against the EXPECTED rotation
     * derived from the tangent-plane position move - that way a
     * legitimate fast sprint on a small asteroid (which produces a
     * geometrically large per-frame basis rotation) doesn't false-
     * trigger, but a basis flip without a matching tangential move
     * (the actual bug we're hunting) is still caught. */
    const char* err_reason = NULL;
    if (!transitioning) {
        if (up_excess > JERK_UP_DELTA_RAD) {
            err_reason = "wild basis.up rotation (exceeds tangent-move expectation)";
        } else if (fwd_angle > JERK_FWD_DELTA_RAD && pos_tangent < 0.5) {
            /* basis.fwd shouldn't rotate beyond yaw-input changes
             * when the player is stationary. The pos_tangent gate
             * catches the small-body case the same way. */
            err_reason = "wild basis.fwd rotation";
        } else {
            /* Position jump > what velocity*dt + ground-snap step
             * can plausibly explain. Uses prev velocity so the
             * tolerance reflects what the player had on entry to
             * this frame, not what got damped out by the integrator. */
            double max_expected = vL_prev * (double)dt + JERK_POS_FUDGE_M;
            if (pos_jump > max_expected) err_reason = "unexplained position jump";
        }
    }

    /* ---- INFO class: legitimate transitions, rate-limited so a
     * long flight crossing several SOI edges doesn't drown the
     * console. */
    const char* info_reason = NULL;
    if (!err_reason) {
        if (body_changed)        info_reason = "body change";
        else if (space_flipped)  info_reason = p->is_in_space ? "entered space" : "entered gravity";
    }
    if (info_reason && (s_jerk_clock_s - s_jerk_last_info_s) < JERK_RATE_LIMIT_S) {
        info_reason = NULL;
    }

    if (!err_reason && !info_reason) return;

    const char* prefix = err_reason ? "[ERROR]" : "[INFO]";
    const char* reason = err_reason ? err_reason : info_reason;
    if (info_reason) s_jerk_last_info_s = s_jerk_clock_s;

    const char* old_name = prev->body ? prev->body->name : "(null)";
    const char* new_name = p->body    ? p->body->name    : "(null)";
    double prev_alt = -1.0, next_alt = -1.0;
    if (prev->body) {
        double rx = prev->position.x - prev->body->pos_x;
        double ry = prev->position.y - prev->body->pos_y;
        double rz = prev->position.z - prev->body->pos_z;
        prev_alt = sqrt(rx*rx + ry*ry + rz*rz) - prev->body->radius_m;
    }
    if (p->body) {
        double rx = p->position.x - p->body->pos_x;
        double ry = p->position.y - p->body->pos_y;
        double rz = p->position.z - p->body->pos_z;
        next_alt = sqrt(rx*rx + ry*ry + rz*rz) - p->body->radius_m;
    }
    bool world_matches = (w && w->body == p->body);

    /* Velocity decomposition matches the position one: radial vs
     * tangential w.r.t. the entry basis.up. Tangential velocity is
     * the bit that can legitimately move basis.up; a high tangential
     * velocity with a small position move (or vice versa) hints at
     * which solver step desynced. */
    double vy_prev   = dvec3_dot(prev->velocity, prev->basis_up);
    dvec3_t vt_prev  = dvec3_sub(prev->velocity, dvec3_scale(prev->basis_up, vy_prev));
    double vL_tan    = dvec3_length(vt_prev);
    printf("%s [jerk] %s :: dt=%.4fs body:%s->%s r=%.1fm alt:%.1f->%.1f "
           "Δpos=%.3fm (radial=%+.3f tangent=%.3f) "
           "Δup=%.2f° (expected %.2f° from tangent; excess %.2f°) "
           "Δfwd=%.2f° "
           "is_space=%d->%d grounded=%d->%d trans=%.3fs->%.3fs "
           "|v|=%.2f (radial=%+.2f tangent=%.2f) world_matches=%d\n",
           prefix, reason,
           (double)dt, old_name, new_name, body_radius, prev_alt, next_alt,
           pos_jump, pos_radial, pos_tangent,
           up_angle * (180.0 / M_PI),
           up_expected * (180.0 / M_PI),
           up_excess * (180.0 / M_PI),
           fwd_angle * (180.0 / M_PI),
           prev->is_in_space, p->is_in_space,
           prev->grounded, p->grounded,
           (double)prev->transition_timer_s,
           (double)p->transition_timer_s,
           dvec3_length(p->velocity),
           vy_prev, vL_tan,
           world_matches ? 1 : 0);
    fflush(stdout);
}

static void jerk_snapshot_take(jerk_snapshot_t* s, const player_ctrl_t* p) {
    s->valid              = true;
    s->position           = p->position;
    s->basis_up           = p->basis.up;
    s->basis_fwd          = p->basis.fwd;
    s->velocity           = p->velocity;
    s->is_in_space        = p->is_in_space;
    s->grounded           = p->grounded;
    s->transition_timer_s = p->transition_timer_s;
    s->body               = p->body;
}

/* Compose: take a BEFORE snapshot, run player_update_inner, log if
 * the per-frame deltas crossed any of the thresholds. The snapshot
 * captures p->state at function entry; comparing it against p at
 * function exit gives the net camera-relevant change, which is
 * what the player actually perceives as a "jerk". */

void player_update(player_ctrl_t* p, world_t* w, float dt) {
    const input_state_t* in = input_state();
    /* Snapshot the BEFORE state for the camera-jerk diagnostic so
     * we can compare against it after the update. */
    jerk_snapshot_t before;
    jerk_snapshot_take(&before, p);

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

    /* Fail-safe: did the player fall through the world? If their
     * feet radius is way below the body surface (collision-solver
     * bug, NaN, sink-through that escaped the ground snap), snap
     * them back to the body's spawn point so they aren't lost
     * forever. Only checks when bound to a body (in space the
     * notion doesn't apply - the player can legitimately be at
     * any distance from any body). */
    if (p->body && !p->is_in_space) {
        const float fall_frac = L->respawn_fall_radius_frac;
        if (fall_frac > 0.0f) {
            dvec3_t local = dvec3_sub(p->position,
                dvec3_make(p->body->pos_x, p->body->pos_y, p->body->pos_z));
            double r_now = dvec3_length(local);
            double threshold = (double)p->body->radius_m * (double)fall_frac;
            if (r_now < threshold) {
                fprintf(stderr,
                        "[player] WARN: fell through world (r=%.3f < %.3f on "
                        "body=%s, body_radius=%.1f); respawning at body spawn\n",
                        r_now, threshold, p->body->name,
                        (double)p->body->radius_m);
                fflush(stderr);
                player_teleport_to(p, p->body);
                /* Skip the rest of this frame's update - teleport
                 * already armed the slerp, cleared velocity, and
                 * reset basis state. Next frame picks up from spawn. */
                jerk_log(p, &before, w, dt);
                return;
            }
        }
    }
    /* Edge: planet → space. Bake the planet-mode yaw/pitch into the
     * basis so the look direction is preserved when compute_look
     * stops adding them on top, then drop into 6DOF mutation of the
     * basis directly. Without this, the player keeps seeing through
     * a phantom yaw/pitch offset that mouse-look in space can never
     * cancel. */
    if (!was_in_space && p->is_in_space) {
        bake_yaw_pitch_into_basis(p);
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
        /* Roll Q/E: rotation around basis.fwd. Under our basis
         * convention fwd × up = +right, so a +θ rotation around fwd
         * tilts up toward +right — visually that's the camera
         * banking RIGHT. Q is the "roll left" key, so we apply a
         * NEGATIVE θ when roll_left is held; E (roll right) gets the
         * positive θ. The previous signs were inverted, which
         * mapped Q to a right-roll. */
        double roll_delta = 0.0;
        if (in->phys.roll_left)  roll_delta -= (double)L->space_roll_speed * (double)dt;
        if (in->phys.roll_right) roll_delta += (double)L->space_roll_speed * (double)dt;
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
            /* Jetpack-in-space boost: sprint quadruples thrust so the
             * "jetpack" feel reads as a real burner-mode burst rather
             * than a tiny step up. Drag stays unchanged so the player
             * still coasts to a stop on release. */
            if (in->phys.sprint) thrust *= 4.0;
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
        jerk_log(p, &before, w, dt);
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

    /* ---- Walking + jetpack + gravity, all on planet up.
     *
     * Water-state probes feed both the movement-speed scalar (slow
     * down once the body is submerged) and the swim-jump model
     * below. We sample three radii along basis.up:
     *   - feet     (gates feetInWater)
     *   - body     (gates the gravity/drag/movement scalars)
     *   - eyes     (gates the submerged-jump fork, drives "underwater"
     *               look effects in the renderer once those hook in)
     * Without a world handed in the probes default to dry. */
    const bool has_world = (w != NULL && w->body == p->body);
    const double player_height = (double)L->player_height_m;
    bool feet_in_water = false;
    bool body_in_water = false;
    bool eyes_in_water = false;
    if (has_world) {
        dvec3_t center = dvec3_make(p->body->pos_x, p->body->pos_y, p->body->pos_z);
        dvec3_t local  = dvec3_sub(p->position, center);
        double  feet_r = dvec3_length(local);
        dvec3_t local_dir = dvec3_scale(local, 1.0 / (feet_r > 1e-9 ? feet_r : 1.0));
        int     ft     = goldberg_find_tile(w->grid, local_dir, p->last_tile);
        feet_in_water = world_is_water_at(w, ft, feet_r);
        body_in_water = world_is_water_at(w, ft, feet_r + (double)L->water_body_check_height_m);
        eyes_in_water = world_is_water_at(w, ft, feet_r + (double)EYE_HEIGHT);
    }
    float speed = in->phys.sprint ? SPRINT_SPEED : WALK_SPEED;
    if (body_in_water) speed *= L->water_movement_mult;
    dvec3_t wish = walk_wish(p, &in->phys);

    if (has_world) {
        const tangent_basis_t* b = &p->basis;
        double cy = cos((double)p->yaw), sy = sin((double)p->yaw);
        dvec3_t walk_fwd = dvec3_add(dvec3_scale(b->fwd,  cy), dvec3_scale(b->right, sy));
        dvec3_t strafe   = dvec3_add(dvec3_scale(b->fwd, -sy), dvec3_scale(b->right, cy));
        double s = (double)speed * (double)dt;
        double walk_amt   = dvec3_dot(wish, walk_fwd) * s;
        double strafe_amt = dvec3_dot(wish, strafe)   * s;
        /* Headroom check is skipped while submerged so the player can
         * swim freely under low ceilings; out of water it gates entry
         * into cramped passages so the head can't clip into stone. */
        double horiz_height = body_in_water ? 0.0 : player_height;
        p->position = try_horizontal_step(w, p, p->position, dvec3_scale(walk_fwd, walk_amt), horiz_height);
        p->position = try_horizontal_step(w, p, p->position, dvec3_scale(strafe,   strafe_amt), horiz_height);
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
    /* Gravity scaled by (a) the body's gravity_g modifier, (b) the
     * smooth falloff multiplier from planet_gravity_at, and (c) the
     * water gravity multiplier while the body is submerged — so the
     * player sinks slowly underwater instead of free-falling. */
    const float base_gravity = 25.0f * p->body->gravity_g;
    float       gravity      = base_gravity * gq.multiplier;
    if (body_in_water) gravity *= L->water_gravity_mult;
    /* Jump / jetpack / swim. Three input branches:
     *   1) Underwater (eyes submerged): jump key is a continuous swim
     *      thrust along basis.up. No tap impulse, no jetpack. Lets
     *      the player surface by holding space. The grounded-jump
     *      branch below still handles the "feet on sea floor, body
     *      submerged" case for an initial push.
     *   2) Grounded, feet in water, eyes above water (wading): the
     *      regular jump impulse fires at full strength.
     *   3) Dry: regular tap-to-jump + hold-for-jetpack as before. */
    if (in->phys.jump) {
        p->jump_held_s += dt;
        if (eyes_in_water) {
            /* Swim up — continuous acceleration while held. Cap at
             * the jetpack terminal so the player can't break the
             * water surface at infinite speed. */
            vy += (double)L->water_swim_force_mps2 * (double)dt;
            if (vy > (double)L->jetpack_max_vy_mps) vy = (double)L->jetpack_max_vy_mps;
            p->jump_consumed = true;   /* no separate impulse */
        } else if (!p->jump_consumed && p->grounded) {
            double impulse = (double)L->jump_velocity_mps;
            /* Submerged jump from a sea-floor stance is weakened
             * to roughly the water gravity scale so the player
             * can't launch out of water as if on dry land. */
            if (body_in_water) impulse *= L->water_submerged_jump_mult;
            vy = impulse;
            p->grounded = false;
            p->jump_consumed = true;
        }
        /* Jetpack stays gated behind the hold threshold and requires
         * the player's HEAD to be above water. Below water the swim
         * thrust (the `eyes_in_water` branch above) is the analogous
         * mechanic and we don't want both stacking. But when the
         * player is half-submerged with body in water and head poking
         * out, the swim thrust is off (eyes dry) and without jetpack
         * they'd be stuck floating on the surface unable to climb out
         * — so this branch fires the moment eyes_in_water flips false,
         * letting them jetpack up out of the water. */
        if (!eyes_in_water && p->jump_held_s > L->jetpack_hold_threshold_s && !p->grounded) {
            vy += (double)L->jetpack_accel_mps2 * (double)dt;
            if (vy > (double)L->jetpack_max_vy_mps) vy = (double)L->jetpack_max_vy_mps;
        }
    } else {
        p->jump_held_s = 0.0f;
        p->jump_consumed = false;
    }
    if (!p->grounded) {
        vy -= (double)gravity * (double)dt;
    }
    /* Re-pack vy back into the world-space velocity. Tangential
     * component (orthogonal to basis.up) is damped — without this
     * the player keeps any orbital push from a recent space-mode
     * coast forever. While submerged the damping kicks much harder
     * (per JS PlayerConfig.WATER_DRAG ≈ 3 /s) so swimming has the
     * sluggish "moving through honey" feel. */
    dvec3_t vel_tan = dvec3_sub(p->velocity, dvec3_scale(p->basis.up, dvec3_dot(p->velocity, p->basis.up)));
    double tan_damp_rate = body_in_water ? (double)L->water_drag_per_s : 2.0;
    double tan_damp      = exp(-tan_damp_rate * (double)dt);
    vel_tan = dvec3_scale(vel_tan, tan_damp);
    if (body_in_water) {
        /* Same exponential drag on the vertical component so the
         * player neither plummets nor rockets while submerged. */
        vy *= exp(-(double)L->water_drag_per_s * (double)dt);
    }
    p->velocity = dvec3_add(vel_tan, dvec3_scale(p->basis.up, vy));

    /* Apply position update from velocity. */
    p->position = dvec3_add(p->position, dvec3_scale(p->velocity, (double)dt));

    /* Ground snap + ceiling collision. Both run only when we have a
     * world for the current body. */
    if (has_world) {
        dvec3_t local = player_local_pos(p);
        double  r     = dvec3_length(local);
        dvec3_t local_dir = dvec3_normalize(local);
        /* Re-resolve the tile under the player after the position
         * update so the cave-aware floor finder samples the column
         * we actually moved into. */
        int     cur_tile = goldberg_find_tile(w->grid, local_dir, p->last_tile);
        p->last_tile = cur_tile;

        /* Ceiling collision first. If the player's head pokes into a
         * solid voxel — typically because they jumped under an
         * overhang — clamp the radial position back to (ceiling -
         * height) and zero any upward velocity component. Skipped
         * underwater so swimming up against rock simply stops; the
         * player doesn't get teleported. */
        double head_r = r + player_height;
        double ceiling_r = world_ceiling_above(w, cur_tile, head_r);
        if (ceiling_r < head_r && vy > 0.0 && !body_in_water) {
            double clamp_r = ceiling_r - player_height;
            p->position = dvec3_add(
                dvec3_make(p->body->pos_x, p->body->pos_y, p->body->pos_z),
                dvec3_scale(local_dir, clamp_r));
            /* Kill the upward velocity; tangential keeps coasting. */
            vy = 0.0;
            vel_tan = dvec3_sub(p->velocity, dvec3_scale(p->basis.up, dvec3_dot(p->velocity, p->basis.up)));
            p->velocity = vel_tan;
            /* Recompute the snapshot used below. */
            local = player_local_pos(p);
            r     = dvec3_length(local);
        } else if (ceiling_r < head_r && body_in_water) {
            /* Underwater: just nudge radial velocity to zero so the
             * player stops rising into rock without the visible snap. */
            if (vy > 0.0) {
                vy = 0.0;
                vel_tan = dvec3_sub(p->velocity, dvec3_scale(p->basis.up, dvec3_dot(p->velocity, p->basis.up)));
                p->velocity = vel_tan;
            }
        }

        /* (Sink-through detector removed - the per-frame ground snap
         * + ceiling clamp + horizontal headroom check below cover the
         * legitimate "feet ended up inside solid" cases without the
         * aggressive radial teleport the detector used to issue, which
         * over-corrected on cave ceilings and other edge cases. If
         * sink-through resurfaces, prefer fixing the root cause in
         * the collision solver above rather than re-adding a brute-
         * force radial snap here.) */

        /* Cave-aware ground snap. The walkable floor closest to the
         * player's feet wins (preferring at-or-below over above), so
         * walking into a cave with an overhang above and a real floor
         * below resolves to the cave floor instead of the overhang
         * top.
         *
         * The pop-up branch (feet below floor) is capped at
         * step_height_m: a feet-below-floor situation within step
         * height is the bridge-dip case (gravity nudged feet a hair
         * under the bridge top, snap them back). Anything further
         * means the player is falling past a tall wall they got
         * tangentially nudged into - we DON'T want to teleport them
         * to the top of that wall; let them keep falling so the next
         * frame's gravity carries them clear of the wall column and
         * resumes finding a floor at-or-below their feet. */
        double gr = world_walkable_floor_near(w, cur_tile, r, 0.0);
        const double step_h = (double)config_lod()->step_height_m;
        if (gr > -1e8) {
            /* Standard wading state: feet under water but grounded
             * on the seabed. Allowed (player still counts as
             * grounded) so they can jump from the bottom. Fully
             * submerged swimming sets grounded=false even when
             * touching a floor — the JS reference does the same. */
            if (r < gr && (gr - r) <= step_h && vy <= 0.0) {
                dvec3_t snapped_local = dvec3_scale(local_dir, gr);
                p->position = dvec3_add(
                    dvec3_make(p->body->pos_x, p->body->pos_y, p->body->pos_z),
                    snapped_local);
                vel_tan = dvec3_sub(p->velocity, dvec3_scale(p->basis.up, dvec3_dot(p->velocity, p->basis.up)));
                p->velocity = vel_tan;
                p->grounded = !eyes_in_water;
            } else if (fabs(r - gr) < 0.05 && vy <= 0.0) {
                p->grounded = !eyes_in_water;
                vel_tan = dvec3_sub(p->velocity, dvec3_scale(p->basis.up, dvec3_dot(p->velocity, p->basis.up)));
                p->velocity = vel_tan;
            } else {
                p->grounded = false;
            }
        } else {
            p->grounded = false;
        }

        /* Camera-cylinder collider. After all other position updates
         * have settled, push the player horizontally away from any
         * solid voxel face whose edge sits closer than
         * camera_collider_radius_m from the eye at eye-depth. Keeps
         * the perspective near plane (0.3 m) from clipping through
         * walls when the player squeezes up against a column. */
        camera_collider_push(w, p, cur_tile);
    } else {
        p->grounded = false;
    }
    (void)feet_in_water;   /* feet probe reserved for footstep / dive sound hooks */

    /* End-of-frame jerk diagnostic. Compares current state against
     * the BEFORE snapshot taken at function entry; logs a single
     * line per "interesting" frame so the bug report can pinpoint
     * the exact event that caused the camera snap. */
    jerk_log(p, &before, w, dt);
}

void player_rebuild_basis(player_ctrl_t* p) {
    if (!p || !p->body) return;
    /* phys_tangent_basis fabricates an orthonormal triad with .up
     * pointing radially out from the body and fwd/right arbitrary
     * tangents - good enough for both planet-mode (the slerp will
     * align fwd to look-direction) and space-mode (mouse rotates
     * them freely). Zeroing yaw/pitch keeps the camera consistent:
     * a fresh basis means the saved yaw/pitch are spent now. */
    dvec3_t local = player_local_pos(p);
    p->basis = phys_tangent_basis(local);
    p->basis_ready = true;
    p->yaw   = 0.0f;
    p->pitch = 0.0f;
}

void player_set_body(player_ctrl_t* p, const body_config_t* body) {
    if (!p || !body || p->body == body) return;
    p->body = body;
    p->last_tile = -1;
    /* Always arm the roll slerp on a body swap, not just when
     * leaving space. Two bodies' gravity wells can overlap (Crag /
     * Quartz, asteroid pairs, anywhere two falloff radii kiss),
     * which means the gravity tracker can hand the frame from one
     * planet to another without is_in_space ever flipping true.
     * Without the slerp the next sync_basis_to_planet call would
     * parallel-transport fwd/right through a huge rotation in a
     * single frame — that's the camera-jerk-on-chunk-transition
     * symptom: it isn't actually about chunks, it's about the
     * basis.up vector flipping from "radial w.r.t. old body" to
     * "radial w.r.t. new body" instantly. The slerp spreads that
     * rotation over ROLL_SLERP_DURATION seconds. */
    p->transition_timer_s = config_lod()->roll_slerp_duration_s;
    /* Bake any accumulated yaw/pitch into the basis before the
     * slerp starts. During the slerp mouse-look mutates the basis
     * directly (6DOF style), so leaving the scalars non-zero would
     * compound them on top of mouse rotations and warp the view. */
    bake_yaw_pitch_into_basis(p);
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
    /* Same yaw/pitch bake reasoning as in player_set_body — during
     * the post-teleport slerp mouse-look mutates the basis directly,
     * so any leftover scalars would compound and warp the view. */
    p->yaw = 0.0f;
    p->pitch = 0.0f;
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
