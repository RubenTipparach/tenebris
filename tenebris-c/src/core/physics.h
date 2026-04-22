#ifndef TENEBRIS_CORE_PHYSICS_H
#define TENEBRIS_CORE_PHYSICS_H

#include "core/math.h"
#include <stdbool.h>

/*
 * Spherical-surface capsule physics. Position is in planet world space
 * (double precision). Gravity always points along -normalize(position),
 * so "up" is radial. Movement input is interpreted in the tangent plane
 * at the player's foot position.
 *
 * Tier 1 stub — full hex-vs-capsule resolution lands once the chunk
 * pool + mesher are in place (we need world data to collide against).
 */

typedef struct {
    dvec3_t position;             /* planet world space, double precision */
    vec3_t  velocity;             /* tangent-frame, single precision */
    float   radius;               /* capsule horizontal half-extent */
    float   height;               /* capsule total height */
    bool    grounded;
} phys_body_t;

typedef struct {
    bool forward, backward, left, right;
    bool jump, sprint;
    bool fly_up, fly_down, fly_mode;
} phys_input_t;

/* Tangent basis at a position on the sphere. up = radial out;
 * fwd / right are arbitrary but stable as the player moves. */
typedef struct {
    dvec3_t up;
    dvec3_t fwd;
    dvec3_t right;
} tangent_basis_t;

tangent_basis_t phys_tangent_basis(dvec3_t position);

void phys_init_body(phys_body_t* body, dvec3_t spawn);

/* The `world` parameter is opaque to physics — it's the chunk pool the
 * resolver collides against, declared as void* so we don't drag a
 * dependency on hex_chunk.h into core/physics.h. */
void phys_step(void* world, phys_body_t* body, phys_input_t in, float yaw, float dt);

#endif
