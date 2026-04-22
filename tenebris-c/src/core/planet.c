#include "core/planet.h"
#include <stddef.h>

static const body_config_t BODIES[BODY_COUNT] = {
    [BODY_TENEBRIS] = {
        .id            = BODY_TENEBRIS,
        .name          = "tenebris",
        /* ~3 km radius: a Tenebris-JS scale planet, small enough that
         * you can walk a noticeable arc of the horizon in a minute or
         * two. Bigger than Caelum's 700 km is what you want for a
         * hard-SF planet; smaller is what matches this game's vibe. */
        .radius_m      = 3000.0,
        .seed          = 0x7e7e6815ULL,
        .max_lod_depth = 10,           /* 2^10 = ~3 m patches; below the hex bubble edge */
        .gravity_g     = 1.0f,
    },
};

const body_config_t* planet_get(body_id_t id) {
    if (id < 0 || id >= BODY_COUNT) return NULL;
    return &BODIES[id];
}
