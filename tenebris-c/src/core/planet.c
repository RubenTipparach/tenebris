#include "core/planet.h"
#include <stdbool.h>
#include <stddef.h>

static body_config_t BODIES[BODY_COUNT] = {
    /* ---- main planet ---- */
    [BODY_TENEBRIS] = {
        .id = BODY_TENEBRIS, .name = "Tenebris",
        .radius_m = 150.0, .seed = 0x7e7e6815ULL,
        .subdivisions = 6, .gravity_g = 1.0f,
        .pos_x = 0.0, .pos_y = 0.0, .pos_z = 0.0,
        .has_water = true,
    },

    /* ---- Tenebris moons ---- */
    [BODY_LUNA] = {
        .id = BODY_LUNA, .name = "Luna",
        .radius_m = 40.0, .seed = 0xCAFEBEEFULL,
        .subdivisions = 4, .gravity_g = 0.4f,
        .pos_x = -420.0, .pos_y = 80.0, .pos_z = 0.0,
        .barren = true,
    },
    [BODY_SELENE] = {
        .id = BODY_SELENE, .name = "Selene",
        .radius_m = 25.0, .seed = 0x12345678ULL,
        .subdivisions = 4, .gravity_g = 0.25f,
        .pos_x = 320.0, .pos_y = -60.0, .pos_z = 380.0,
        .barren = true,
    },

    /* ---- Sequoia (green sister planet) + moons ---- */
    [BODY_SEQUOIA] = {
        .id = BODY_SEQUOIA, .name = "Sequoia",
        .radius_m = 180.0, .seed = 0x5E9A01A1ULL,
        .subdivisions = 6, .gravity_g = 1.1f,
        .pos_x = -850.0, .pos_y = 120.0, .pos_z = -700.0,
        .has_water = true,
        .tileset = TILESET_SEQUOIA,
    },
    [BODY_VERDANT] = {
        .id = BODY_VERDANT, .name = "Verdant",
        .radius_m = 30.0, .seed = 0x0FACE001ULL,
        .subdivisions = 4, .gravity_g = 0.3f,
        .pos_x = -600.0, .pos_y = 160.0, .pos_z = -740.0,
        .barren = true,
    },
    [BODY_SPROUT] = {
        .id = BODY_SPROUT, .name = "Sprout",
        .radius_m = 18.0, .seed = 0x59E0A710ULL,
        .subdivisions = 3, .gravity_g = 0.15f,
        .pos_x = -940.0, .pos_y = 260.0, .pos_z = -520.0,
        .barren = true,
    },

    /* ---- Crag (barren red planet) + moon ---- */
    [BODY_CRAG] = {
        .id = BODY_CRAG, .name = "Crag",
        .radius_m = 95.0, .seed = 0xC2A6B10CULL,
        .subdivisions = 5, .gravity_g = 0.6f,
        .pos_x = 780.0, .pos_y = -220.0, .pos_z = -900.0,
        .barren = true,
        .tileset = TILESET_CRAG,
    },
    [BODY_QUARTZ] = {
        .id = BODY_QUARTZ, .name = "Quartz",
        .radius_m = 22.0, .seed = 0xC0BA17EDULL,
        .subdivisions = 4, .gravity_g = 0.2f,
        .pos_x = 960.0, .pos_y = -220.0, .pos_z = -900.0,
        .barren = true,
    },

    /* ---- Frostbite (icy outer planet) + moon ---- */
    [BODY_FROSTBITE] = {
        .id = BODY_FROSTBITE, .name = "Frostbite",
        .radius_m = 110.0, .seed = 0xF0057B17ULL,
        .subdivisions = 5, .gravity_g = 0.8f,
        .pos_x = -240.0, .pos_y = -850.0, .pos_z = 1300.0,
        .icy = true,
        .tileset = TILESET_FROST,
    },
    [BODY_RIME] = {
        .id = BODY_RIME, .name = "Rime",
        .radius_m = 20.0, .seed = 0x21CE5001ULL,
        .subdivisions = 4, .gravity_g = 0.15f,
        .pos_x = -340.0, .pos_y = -700.0, .pos_z = 1300.0,
        .icy = true,
    },

    /* ---- Asteroid belt: 10 tiny rocky bodies in a loose ring
     * roughly 1500 m from the system origin, slightly scattered in Y
     * so they don't look like a perfect circle. Seeds pulled from
     * arbitrary bytes so each asteroid has its own bumpy shape. */
    [BODY_ASTEROID_0] = {
        .id = BODY_ASTEROID_0, .name = "Asteroid A",
        .radius_m = 7.0, .seed = 0xA51E0010ULL,
        .subdivisions = 3, .gravity_g = 0.05f,
        .pos_x = 1500.0, .pos_y = 40.0, .pos_z = 0.0,
        .barren = true, .is_asteroid = true,
        .tileset = TILESET_ASTEROID,
    },
    [BODY_ASTEROID_1] = {
        .id = BODY_ASTEROID_1, .name = "Asteroid B",
        .radius_m = 9.0, .seed = 0xA51E0011ULL,
        .subdivisions = 3, .gravity_g = 0.05f,
        .pos_x = 1180.0, .pos_y = -30.0, .pos_z = 900.0,
        .barren = true, .is_asteroid = true,
        .tileset = TILESET_ASTEROID,
    },
    [BODY_ASTEROID_2] = {
        .id = BODY_ASTEROID_2, .name = "Asteroid C",
        .radius_m = 5.0, .seed = 0xA51E0012ULL,
        .subdivisions = 3, .gravity_g = 0.05f,
        .pos_x = 500.0, .pos_y = 20.0, .pos_z = 1400.0,
        .barren = true, .is_asteroid = true,
        .tileset = TILESET_ASTEROID,
    },
    [BODY_ASTEROID_3] = {
        .id = BODY_ASTEROID_3, .name = "Asteroid D",
        .radius_m = 11.0, .seed = 0xA51E0013ULL,
        .subdivisions = 3, .gravity_g = 0.05f,
        .pos_x = -400.0, .pos_y = 80.0, .pos_z = 1450.0,
        .barren = true, .is_asteroid = true,
        .tileset = TILESET_ASTEROID,
    },
    [BODY_ASTEROID_4] = {
        .id = BODY_ASTEROID_4, .name = "Asteroid E",
        .radius_m = 6.0, .seed = 0xA51E0014ULL,
        .subdivisions = 3, .gravity_g = 0.05f,
        .pos_x = -1200.0, .pos_y = -10.0, .pos_z = 800.0,
        .barren = true, .is_asteroid = true,
        .tileset = TILESET_ASTEROID,
    },
    [BODY_ASTEROID_5] = {
        .id = BODY_ASTEROID_5, .name = "Asteroid F",
        .radius_m = 8.0, .seed = 0xA51E0015ULL,
        .subdivisions = 3, .gravity_g = 0.05f,
        .pos_x = -1500.0, .pos_y = 60.0, .pos_z = -150.0,
        .barren = true, .is_asteroid = true,
        .tileset = TILESET_ASTEROID,
    },
    [BODY_ASTEROID_6] = {
        .id = BODY_ASTEROID_6, .name = "Asteroid G",
        .radius_m = 10.0, .seed = 0xA51E0016ULL,
        .subdivisions = 3, .gravity_g = 0.05f,
        .pos_x = -1100.0, .pos_y = -90.0, .pos_z = -1000.0,
        .barren = true, .is_asteroid = true,
        .tileset = TILESET_ASTEROID,
    },
    [BODY_ASTEROID_7] = {
        .id = BODY_ASTEROID_7, .name = "Asteroid H",
        .radius_m = 6.5, .seed = 0xA51E0017ULL,
        .subdivisions = 3, .gravity_g = 0.05f,
        .pos_x = -200.0, .pos_y = 50.0, .pos_z = -1500.0,
        .barren = true, .is_asteroid = true,
        .tileset = TILESET_ASTEROID,
    },
    [BODY_ASTEROID_8] = {
        .id = BODY_ASTEROID_8, .name = "Asteroid I",
        .radius_m = 9.5, .seed = 0xA51E0018ULL,
        .subdivisions = 3, .gravity_g = 0.05f,
        .pos_x = 650.0, .pos_y = -40.0, .pos_z = -1350.0,
        .barren = true, .is_asteroid = true,
        .tileset = TILESET_ASTEROID,
    },
    [BODY_ASTEROID_9] = {
        .id = BODY_ASTEROID_9, .name = "Asteroid J",
        .radius_m = 7.5, .seed = 0xA51E0019ULL,
        .subdivisions = 3, .gravity_g = 0.05f,
        .pos_x = 1300.0, .pos_y = 100.0, .pos_z = -700.0,
        .barren = true, .is_asteroid = true,
        .tileset = TILESET_ASTEROID,
    },
};

const body_config_t* planet_get(body_id_t id) {
    if (id < 0 || id >= BODY_COUNT) return NULL;
    return &BODIES[id];
}

/* Apply a YAML-loaded atmosphere patch on top of a body's compiled-in
 * defaults. Each field is only assigned when the patch's value is
 * non-zero, so an empty patch is a no-op and a YAML file can express
 * partial overrides (e.g. "Sequoia: just bump rayleigh_scale to 1.2"). */
void planet_set_atmosphere(body_id_t id, const body_atmo_t* p) {
    if (id < 0 || id >= BODY_COUNT || !p) return;
    body_config_t* b = &BODIES[id];
    if (p->radius_mult       > 0.0f) b->atmo_radius_mult       = p->radius_mult;
    if (p->lower_radius_mult > 0.0f) b->atmo_lower_radius_mult = p->lower_radius_mult;
    if (p->rayleigh_scale    > 0.0f) b->atmo_rayleigh_scale    = p->rayleigh_scale;
    if (p->mie_scale       > 0.0f) b->atmo_mie_scale       = p->mie_scale;
    if (p->sun_intensity   > 0.0f) b->atmo_sun_intensity   = p->sun_intensity;
    if (p->sunset_strength > 0.0f) b->atmo_sunset_strength = p->sunset_strength;
    if (p->scale_height    > 0.0f) b->atmo_scale_height    = p->scale_height;
    if (p->mie_g           > 0.0f) b->atmo_mie_g           = p->mie_g;
    if (p->wavelengths.x + p->wavelengths.y + p->wavelengths.z > 0.0f)
        b->atmo_wavelengths = p->wavelengths;
    if (p->sunset_tint.x + p->sunset_tint.y + p->sunset_tint.z > 0.0f)
        b->atmo_sunset_tint = p->sunset_tint;
    if (p->sunset_glow.x + p->sunset_glow.y + p->sunset_glow.z > 0.0f)
        b->atmo_sunset_glow = p->sunset_glow;
    if (p->sunset_horizon.x + p->sunset_horizon.y + p->sunset_horizon.z > 0.0f)
        b->atmo_sunset_horizon = p->sunset_horizon;
}
