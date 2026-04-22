#include "core/physics.h"
#include <math.h>

void phys_init_body(phys_body_t* b, dvec3_t spawn) {
    b->position = spawn;
    b->velocity = (vec3_t){ 0, 0, 0 };
    b->radius   = 0.3f;
    b->height   = 1.8f;
    b->grounded = false;
}

tangent_basis_t phys_tangent_basis(dvec3_t position) {
    dvec3_t up = dvec3_normalize(position);
    /* Pick a stable reference axis that isn't parallel to up. */
    dvec3_t ref = (fabs(up.y) < 0.9) ? dvec3_make(0, 1, 0) : dvec3_make(1, 0, 0);
    dvec3_t right = dvec3_normalize(dvec3_cross(ref, up));
    dvec3_t fwd   = dvec3_normalize(dvec3_cross(up, right));
    return (tangent_basis_t){ up, fwd, right };
}

void phys_step(void* world, phys_body_t* body, phys_input_t in, float yaw, float dt) {
    /* Tier 1 stub: capsule-vs-hex resolution lands next commit, once
     * the chunk pool exists for it to collide against. For now we
     * advance freely and let the player fly. */
    (void)world;
    (void)body;
    (void)in;
    (void)yaw;
    (void)dt;
}
