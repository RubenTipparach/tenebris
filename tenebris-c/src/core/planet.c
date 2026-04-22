#include "core/planet.h"
#include <stddef.h>

static const body_config_t BODIES[BODY_COUNT] = {
    [BODY_TENEBRIS] = {
        .id            = BODY_TENEBRIS,
        .name          = "tenebris",
        .radius_m      = 700000.0,    /* 700 km */
        .seed          = 0x7e7e6815ULL,
        .max_lod_depth = LOD_MAX_DEPTH,
        .gravity_g     = 1.0f,
    },
};

const body_config_t* planet_get(body_id_t id) {
    if (id < 0 || id >= BODY_COUNT) return NULL;
    return &BODIES[id];
}
