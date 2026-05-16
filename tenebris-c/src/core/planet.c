#include "core/planet.h"
#include <math.h>
#include <stdbool.h>
#include <stddef.h>
#include <math.h>

static body_config_t BODIES[BODY_COUNT] = {
    /* ---- main planet ---- */
    /* Layout (planets at least 10 km apart, moons at least 5 km from
     * any other body): four planets at axis tips ~20 km from world
     * origin, six moons at 6 km tangent offsets from their parent,
     * ten asteroids scattered in an outer ring at 25-30 km. Pairwise
     * planet distance is 20-28 km, moon-to-anything distance is 6-30
     * km, no two bodies are closer than ~6 km.  Old layout had
     * everything clustered within 3 km of origin which made every
     * gravity well overlap and visually pancaked the system. */
    [BODY_TENEBRIS] = {
        .id = BODY_TENEBRIS, .name = "Tenebris",
        .radius_m = 300.0, .seed = 0x7e7e6815ULL,
        .subdivisions = 6, .gravity_g = 1.0f,
        .pos_x = 0.0, .pos_y = 0.0, .pos_z = 0.0,
        .has_water = true,
    },

    /* ---- Tenebris moons ---- */
    [BODY_LUNA] = {
        .id = BODY_LUNA, .name = "Luna",
        .radius_m = 80.0, .seed = 0xCAFEBEEFULL,
        .subdivisions = 4, .gravity_g = 0.4f,
        .pos_x = 0.0, .pos_y = 6000.0, .pos_z = 0.0,
        .barren = true,
    },
    [BODY_SELENE] = {
        .id = BODY_SELENE, .name = "Selene",
        .radius_m = 50.0, .seed = 0x12345678ULL,
        .subdivisions = 4, .gravity_g = 0.25f,
        .pos_x = 0.0, .pos_y = -6000.0, .pos_z = 0.0,
        .barren = true,
    },

    /* ---- Sequoia (green sister planet) + moons ---- */
    [BODY_SEQUOIA] = {
        .id = BODY_SEQUOIA, .name = "Sequoia",
        .radius_m = 360.0, .seed = 0x5E9A01A1ULL,
        .subdivisions = 6, .gravity_g = 1.1f,
        .pos_x = 20000.0, .pos_y = 0.0, .pos_z = 0.0,
        .has_water = true,
        .tileset = TILESET_SEQUOIA,
    },
    [BODY_VERDANT] = {
        .id = BODY_VERDANT, .name = "Verdant",
        .radius_m = 60.0, .seed = 0x0FACE001ULL,
        .subdivisions = 4, .gravity_g = 0.3f,
        .pos_x = 20000.0, .pos_y = 6000.0, .pos_z = 0.0,
        .barren = true,
    },
    [BODY_SPROUT] = {
        .id = BODY_SPROUT, .name = "Sprout",
        .radius_m = 36.0, .seed = 0x59E0A710ULL,
        .subdivisions = 3, .gravity_g = 0.15f,
        .pos_x = 20000.0, .pos_y = -6000.0, .pos_z = 0.0,
        .barren = true,
    },

    /* ---- Crag (barren red planet) + moon ---- */
    [BODY_CRAG] = {
        .id = BODY_CRAG, .name = "Crag",
        .radius_m = 190.0, .seed = 0xC2A6B10CULL,
        .subdivisions = 5, .gravity_g = 0.6f,
        .pos_x = -20000.0, .pos_y = 0.0, .pos_z = 0.0,
        .barren = true,
        .tileset = TILESET_CRAG,
    },
    [BODY_QUARTZ] = {
        .id = BODY_QUARTZ, .name = "Quartz",
        .radius_m = 44.0, .seed = 0xC0BA17EDULL,
        .subdivisions = 4, .gravity_g = 0.2f,
        .pos_x = -20000.0, .pos_y = 6000.0, .pos_z = 0.0,
        .barren = true,
    },

    /* ---- Frostbite (icy outer planet) + moon ---- */
    [BODY_FROSTBITE] = {
        .id = BODY_FROSTBITE, .name = "Frostbite",
        .radius_m = 220.0, .seed = 0xF0057B17ULL,
        .subdivisions = 5, .gravity_g = 0.8f,
        .pos_x = 0.0, .pos_y = 0.0, .pos_z = 20000.0,
        .icy = true,
        .tileset = TILESET_FROST,
    },
    [BODY_RIME] = {
        .id = BODY_RIME, .name = "Rime",
        .radius_m = 40.0, .seed = 0x21CE5001ULL,
        .subdivisions = 4, .gravity_g = 0.15f,
        .pos_x = 0.0, .pos_y = 6000.0, .pos_z = 20000.0,
        .icy = true,
    },

    /* ---- Asteroid belt: scattered in an outer ring 25-30 km from
     * the system origin, well clear of every moon's 5 km exclusion
     * zone. Seeds pulled from arbitrary bytes so each asteroid has
     * its own bumpy shape. */
    [BODY_ASTEROID_0] = {
        .id = BODY_ASTEROID_0, .name = "Asteroid A",
        .radius_m = 14.0, .seed = 0xA51E0010ULL,
        .subdivisions = 3, .gravity_g = 0.05f,
        .pos_x = 28000.0, .pos_y = 800.0, .pos_z = -3000.0,
        .barren = true, .is_asteroid = true,
        .tileset = TILESET_ASTEROID,
    },
    [BODY_ASTEROID_1] = {
        .id = BODY_ASTEROID_1, .name = "Asteroid B",
        .radius_m = 18.0, .seed = 0xA51E0011ULL,
        .subdivisions = 3, .gravity_g = 0.05f,
        .pos_x = -28000.0, .pos_y = 1200.0, .pos_z = 5000.0,
        .barren = true, .is_asteroid = true,
        .tileset = TILESET_ASTEROID,
    },
    [BODY_ASTEROID_2] = {
        .id = BODY_ASTEROID_2, .name = "Asteroid C",
        .radius_m = 10.0, .seed = 0xA51E0012ULL,
        .subdivisions = 3, .gravity_g = 0.05f,
        .pos_x = 5000.0, .pos_y = 800.0, .pos_z = 28000.0,
        .barren = true, .is_asteroid = true,
        .tileset = TILESET_ASTEROID,
    },
    [BODY_ASTEROID_3] = {
        .id = BODY_ASTEROID_3, .name = "Asteroid D",
        .radius_m = 22.0, .seed = 0xA51E0013ULL,
        .subdivisions = 3, .gravity_g = 0.05f,
        .pos_x = -5000.0, .pos_y = 1600.0, .pos_z = 28000.0,
        .barren = true, .is_asteroid = true,
        .tileset = TILESET_ASTEROID,
    },
    [BODY_ASTEROID_4] = {
        .id = BODY_ASTEROID_4, .name = "Asteroid E",
        .radius_m = 12.0, .seed = 0xA51E0014ULL,
        .subdivisions = 3, .gravity_g = 0.05f,
        .pos_x = 22000.0, .pos_y = -2000.0, .pos_z = 14000.0,
        .barren = true, .is_asteroid = true,
        .tileset = TILESET_ASTEROID,
    },
    [BODY_ASTEROID_5] = {
        .id = BODY_ASTEROID_5, .name = "Asteroid F",
        .radius_m = 16.0, .seed = 0xA51E0015ULL,
        .subdivisions = 3, .gravity_g = 0.05f,
        .pos_x = -22000.0, .pos_y = 1200.0, .pos_z = 14000.0,
        .barren = true, .is_asteroid = true,
        .tileset = TILESET_ASTEROID,
    },
    [BODY_ASTEROID_6] = {
        .id = BODY_ASTEROID_6, .name = "Asteroid G",
        .radius_m = 20.0, .seed = 0xA51E0016ULL,
        .subdivisions = 3, .gravity_g = 0.05f,
        .pos_x = 22000.0, .pos_y = -1800.0, .pos_z = -14000.0,
        .barren = true, .is_asteroid = true,
        .tileset = TILESET_ASTEROID,
    },
    [BODY_ASTEROID_7] = {
        .id = BODY_ASTEROID_7, .name = "Asteroid H",
        .radius_m = 13.0, .seed = 0xA51E0017ULL,
        .subdivisions = 3, .gravity_g = 0.05f,
        .pos_x = -22000.0, .pos_y = 1000.0, .pos_z = -14000.0,
        .barren = true, .is_asteroid = true,
        .tileset = TILESET_ASTEROID,
    },
    [BODY_ASTEROID_8] = {
        .id = BODY_ASTEROID_8, .name = "Asteroid I",
        .radius_m = 19.0, .seed = 0xA51E0018ULL,
        .subdivisions = 3, .gravity_g = 0.05f,
        .pos_x = 14000.0, .pos_y = 8000.0, .pos_z = 26000.0,
        .barren = true, .is_asteroid = true,
        .tileset = TILESET_ASTEROID,
    },
    [BODY_ASTEROID_9] = {
        .id = BODY_ASTEROID_9, .name = "Asteroid J",
        .radius_m = 15.0, .seed = 0xA51E0019ULL,
        .subdivisions = 3, .gravity_g = 0.05f,
        .pos_x = -14000.0, .pos_y = 2000.0, .pos_z = 26000.0,
        .barren = true, .is_asteroid = true,
        .tileset = TILESET_ASTEROID,
    },
};

const body_config_t* planet_get(body_id_t id) {
    if (id < 0 || id >= BODY_COUNT) return NULL;
    return &BODIES[id];
}

int planet_subdivisions_for_radius(double radius_m) {
    /* Goldberg(m, 0) on a sphere of radius R has tile width
     * w ≈ 1.05 R / m, where m = 2^subdivisions. So for a target
     * width of 1 m: m ≈ 1.05 R, subdivisions ≈ ceil(log2(1.05 R)).
     *
     * Clamp to [3, 7].
     *   - Lower bound keeps tiny asteroids from collapsing to a
     *     92-tile pentakis dodecahedron silhouette.
     *   - Upper bound is a vertex-shader-bandwidth limit, NOT a
     *     memory limit. Memory-wise subdiv 8 is fine (84 MB per
     *     body), but with the current CHUNK_COUNT=32, each chunk
     *     holds ~20k tiles. The chunk-level backface cull keeps
     *     ~5-6 chunks visible at ground level, which means ~840k
     *     vertices/frame submitted to the VS — enough to drop
     *     a 165 fps build to 55 fps on integrated GPUs. To raise
     *     the cap above 7 we'd need to bump CHUNK_COUNT (smaller
     *     chunks, finer cull granularity) so visible vertex count
     *     stays bounded. Until then, big planets cap at ~2.5 m
     *     hex width. */
    if (radius_m < 1.0) return 3;
    double m_target = 1.05 * radius_m;
    int subdiv = (int)ceil(log2(m_target));
    if (subdiv < 3) subdiv = 3;
    if (subdiv > 7) subdiv = 7;
    return subdiv;
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

gravity_query_t planet_gravity_at(dvec3_t world_pos,
                                  float full_default,
                                  float falloff_default) {
    gravity_query_t q = { NULL, 0.0f, 0.0 };
    /* Walk every body and pick the strongest-pull one. We can't just
     * pick the closest — Crag's gravity well overlaps Quartz's, and
     * the moon you're hovering above should win even when the parent
     * planet's centre is technically further. The multiplier is
     * monotonic in (radius - distance) within the falloff band, so
     * "largest multiplier" is the right tie-break. */
    for (int id = 0; id < BODY_COUNT; ++id) {
        const body_config_t* b = &BODIES[id];
        double dx = world_pos.x - b->pos_x;
        double dy = world_pos.y - b->pos_y;
        double dz = world_pos.z - b->pos_z;
        double dist = sqrt(dx*dx + dy*dy + dz*dz);
        float full = (b->gravity_full_mult    > 0.0f) ? b->gravity_full_mult    : full_default;
        float fall = (b->gravity_falloff_mult > 0.0f) ? b->gravity_falloff_mult : falloff_default;
        if (fall <= full) fall = full + 0.01f;   /* guard against bad config */
        double r_full = b->radius_m * (double)full;
        double r_fall = b->radius_m * (double)fall;
        float  mult;
        if (dist <= r_full) {
            mult = 1.0f;
        } else if (dist >= r_fall) {
            continue;   /* outside falloff — no pull from this body */
        } else {
            mult = (float)(1.0 - (dist - r_full) / (r_fall - r_full));
        }
        if (mult > q.multiplier) {
            q.body       = b;
            q.multiplier = mult;
            q.altitude_m = dist - b->radius_m;
        }
    }
    return q;
}
