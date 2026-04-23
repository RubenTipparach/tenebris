#include "core/planet.h"
#include <stdbool.h>
#include <stddef.h>

static const body_config_t BODIES[BODY_COUNT] = {
    [BODY_TENEBRIS] = {
        .id            = BODY_TENEBRIS,
        .name          = "tenebris",
        .radius_m      = 150.0,
        .seed          = 0x7e7e6815ULL,
        .subdivisions  = 6,           /* ~40 K tiles — JS Earth scale */
        .gravity_g     = 1.0f,
        .pos_x = 0.0, .pos_y = 0.0, .pos_z = 0.0,
        .has_water     = true,
        .barren        = false,
    },
    [BODY_LUNA] = {
        .id            = BODY_LUNA,
        .name          = "luna",
        .radius_m      = 40.0,
        .seed          = 0xCAFEBEEFULL,
        .subdivisions  = 4,           /* 2562 tiles — fast to bake once */
        .gravity_g     = 0.4f,
        /* Positioned 420 m away from Tenebris, slightly above the
         * player's horizon at spawn. */
        .pos_x = -420.0, .pos_y = 80.0, .pos_z = 0.0,
        .has_water     = false,
        .barren        = true,
    },
    [BODY_SELENE] = {
        .id            = BODY_SELENE,
        .name          = "selene",
        .radius_m      = 25.0,
        .seed          = 0x12345678ULL,
        .subdivisions  = 4,
        .gravity_g     = 0.25f,
        .pos_x = 320.0, .pos_y = -60.0, .pos_z = 380.0,
        .has_water     = false,
        .barren        = true,
    },
};

const body_config_t* planet_get(body_id_t id) {
    if (id < 0 || id >= BODY_COUNT) return NULL;
    return &BODIES[id];
}
