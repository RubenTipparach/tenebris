#include "core/physics.h"

/*
 * Tier 1 placeholder — full AABB resolution lands with T1 implementation.
 * For Tier 0 we only need the symbol to exist so the static lib links.
 */
void phys_step(world_t* w, phys_body_t* body, phys_input_t in, float yaw, float dt) {
    (void)w; (void)body; (void)in; (void)yaw; (void)dt;
}
