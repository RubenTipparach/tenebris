#ifndef TENEBRIS_CORE_PHYSICS_H
#define TENEBRIS_CORE_PHYSICS_H

#include "core/math.h"
#include "core/world.h"
#include <stdbool.h>

/*
 * Deterministic physics for a capsule/AABB player against voxel terrain.
 * Runs authoritatively on the server in MP; the client predicts with
 * the same function for latency hiding.
 */

typedef struct {
    vec3_t position;
    vec3_t velocity;
    float  radius;        /* horizontal AABB half-extent */
    float  height;        /* vertical AABB */
    bool   grounded;
} phys_body_t;

typedef struct {
    bool forward, backward, left, right;
    bool jump, sprint;
    bool fly_up, fly_down;
    bool fly_mode;
} phys_input_t;

void phys_step(world_t* w, phys_body_t* body, phys_input_t in, float yaw, float dt);
void phys_init_body(phys_body_t* body, vec3_t spawn);

#endif
