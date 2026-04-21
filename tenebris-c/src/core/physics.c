#include "core/physics.h"
#include "core/world.h"
#include <math.h>

/* ------------------------------------------------------------- */
/* Tunables — match src/player/Player.ts + PlayerConfig.         */

#define WALK_SPEED      8.0f
#define SPRINT_SPEED   14.0f
#define FLY_SPEED      20.0f
#define JUMP_VELOCITY  10.0f
#define GRAVITY        25.0f
#define PLAYER_HEIGHT   1.8f
#define PLAYER_RADIUS   0.3f

/* ------------------------------------------------------------- */

static bool aabb_intersects_solid(world_t* w, vec3_t min, vec3_t max) {
    int32_t x0 = (int32_t)floorf(min.x);
    int32_t y0 = (int32_t)floorf(min.y);
    int32_t z0 = (int32_t)floorf(min.z);
    int32_t x1 = (int32_t)floorf(max.x);
    int32_t y1 = (int32_t)floorf(max.y);
    int32_t z1 = (int32_t)floorf(max.z);
    for (int32_t y = y0; y <= y1; ++y)
        for (int32_t z = z0; z <= z1; ++z)
            for (int32_t x = x0; x <= x1; ++x)
                if (world_is_block_solid(w, x, y, z)) return true;
    return false;
}

/* Resolve a movement along one axis only. Player feet at body->position,
 * AABB extends (radius, radius) horizontally and (0, height) vertically.
 */
static void move_axis(world_t* w, phys_body_t* b, int axis, float delta) {
    if (delta == 0.0f) return;
    vec3_t np = b->position;
    if      (axis == 0) np.x += delta;
    else if (axis == 1) np.y += delta;
    else                np.z += delta;

    vec3_t mn = { np.x - b->radius, np.y,              np.z - b->radius };
    vec3_t mx = { np.x + b->radius, np.y + b->height,  np.z + b->radius };

    /* Shrink boxes slightly so we don't grab a block we're tangent to. */
    const float eps = 1e-4f;
    mn.x += eps; mn.y += eps; mn.z += eps;
    mx.x -= eps; mx.y -= eps; mx.z -= eps;

    if (aabb_intersects_solid(w, mn, mx)) {
        if (axis == 1) {
            if (delta < 0.0f) b->grounded = true;
            b->velocity.y = 0.0f;
        }
        return;
    }
    b->position = np;
    if (axis == 1 && delta != 0.0f) b->grounded = false;
}

void phys_step(world_t* w, phys_body_t* b, phys_input_t in, float yaw, float dt) {
    /* Horizontal wish vector in world space. */
    float fx = 0.0f, fz = 0.0f;
    if (in.forward)  fz -= 1.0f;
    if (in.backward) fz += 1.0f;
    if (in.left)     fx -= 1.0f;
    if (in.right)    fx += 1.0f;

    float len = sqrtf(fx * fx + fz * fz);
    if (len > 0.0f) { fx /= len; fz /= len; }

    float c = cosf(yaw), s = sinf(yaw);
    /* Rotate (fx, fz) around Y by yaw. Yaw convention matches Three.js:
     * yaw=0 looks down -Z. */
    float wx =  c * fx + s * fz;
    float wz = -s * fx + c * fz;

    const float speed = in.fly_mode ? FLY_SPEED
                     : (in.sprint ? SPRINT_SPEED : WALK_SPEED);

    float dx = wx * speed * dt;
    float dz = wz * speed * dt;
    float dy;

    if (in.fly_mode) {
        float vy = 0.0f;
        if (in.fly_up)   vy += 1.0f;
        if (in.fly_down) vy -= 1.0f;
        dy = vy * speed * dt;
        b->velocity.y = 0.0f;
    } else {
        if (in.jump && b->grounded) b->velocity.y = JUMP_VELOCITY;
        b->velocity.y -= GRAVITY * dt;
        dy = b->velocity.y * dt;
    }

    b->grounded = false;
    move_axis(w, b, 0, dx);
    move_axis(w, b, 2, dz);
    move_axis(w, b, 1, dy);
}

void phys_init_body(phys_body_t* b, vec3_t spawn) {
    b->position = spawn;
    b->velocity = (vec3_t){ 0, 0, 0 };
    b->radius   = PLAYER_RADIUS;
    b->height   = PLAYER_HEIGHT;
    b->grounded = false;
}
