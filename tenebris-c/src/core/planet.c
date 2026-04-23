#include "core/planet.h"
#include <stddef.h>

static const body_config_t BODIES[BODY_COUNT] = {
    [BODY_TENEBRIS] = {
        .id            = BODY_TENEBRIS,
        .name          = "tenebris",
        /* Tenebris-JS Earth scale: radius = 150 m (slightly larger than
         * JS's 100 m to give some room to walk while keeping the whole
         * planet meshed). At subdivisions=3 this gives 642 Goldberg tiles
         * wrapping the whole surface — no LOD needed. */
        .radius_m      = 150.0,
        .seed          = 0x7e7e6815ULL,
        .max_lod_depth = 0,            /* unused now that we're full-mesh Goldberg */
        .gravity_g     = 1.0f,
    },
};

const body_config_t* planet_get(body_id_t id) {
    if (id < 0 || id >= BODY_COUNT) return NULL;
    return &BODIES[id];
}
