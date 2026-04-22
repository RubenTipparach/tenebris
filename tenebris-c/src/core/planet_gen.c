#include "core/planet_gen.h"
#include "core/rng.h"
#include <math.h>

/*
 * Biome-aware planet sampler. Tier 1 port matches the flavor (if not the
 * exact math) of the Tenebris JS planet: water below sea level, sandy
 * beaches at the shoreline, grass at normal elevation, stone on peaks,
 * snow at high altitude or polar latitudes, ice on polar seas.
 *
 * Deterministic — same (seed, unit_dir) always yields the same sample,
 * on both server and client, so world gen stays MP-ready.
 */

/* Surface altitude (relative to body->radius_m) is two-octave 3D value
 * noise sampled on the unit sphere. Amplitudes tuned for a ~3 km planet:
 * ~90 m peak-to-trough is plenty of relief at that scale. */
#define TERRAIN_BASE_SCALE     2.5f
#define TERRAIN_DETAIL_SCALE   8.0f
#define TERRAIN_BASE_AMP      45.0f
#define TERRAIN_DETAIL_AMP    14.0f

float planet_surface_altitude(const body_config_t* body, dvec3_t unit_dir) {
    const float x = (float)unit_dir.x;
    const float y = (float)unit_dir.y;
    const float z = (float)unit_dir.z;
    const float n1 = noise3d_seed(body->seed,
                                  x * TERRAIN_BASE_SCALE,
                                  y * TERRAIN_BASE_SCALE,
                                  z * TERRAIN_BASE_SCALE);
    const float n2 = noise3d_seed(body->seed ^ 0xA5A5A5A5ULL,
                                  x * TERRAIN_DETAIL_SCALE,
                                  y * TERRAIN_DETAIL_SCALE,
                                  z * TERRAIN_DETAIL_SCALE);
    const float s1 = n1 * 2.0f - 1.0f;
    const float s2 = n2 * 2.0f - 1.0f;
    return s1 * TERRAIN_BASE_AMP + s2 * TERRAIN_DETAIL_AMP;
}

/* Biome tunables. */
#define SEA_LEVEL        0.0f
#define BEACH_BAND       2.0f
#define SNOW_ELEV       25.0f
#define STONE_ELEV      35.0f
#define POLAR_LATITUDE   0.72f
#define COLD_LATITUDE    0.60f

column_profile_t planet_profile(const body_config_t* body, dvec3_t unit_dir) {
    column_profile_t p;
    p.surface_m = planet_surface_altitude(body, unit_dir);
    p.latitude  = (float)fabs(unit_dir.y);
    p.polar     = p.latitude > POLAR_LATITUDE;
    const bool cold = p.latitude > COLD_LATITUDE;
    p.snow_line = cold ? (SNOW_ELEV * 0.5f) : SNOW_ELEV;
    return p;
}

block_t planet_sample_with_profile(const column_profile_t* prof, float altitude_m) {
    const float surface = prof->surface_m;

    /* AIR above the ground, unless we're in the water column. */
    if (altitude_m > surface) {
        if (altitude_m < SEA_LEVEL) {
            return prof->polar ? BLOCK_ICE : BLOCK_WATER;
        }
        return BLOCK_AIR;
    }

    /* Top voxel of the column — the "biome" decision layer. */
    if (altitude_m > surface - 1.0f) {
        if (surface > SEA_LEVEL - BEACH_BAND && surface < SEA_LEVEL + BEACH_BAND) {
            return BLOCK_SAND;
        }
        if (surface < SEA_LEVEL) {
            return (surface > SEA_LEVEL - 4.0f) ? BLOCK_SAND : BLOCK_STONE;
        }
        if (surface > STONE_ELEV) return BLOCK_STONE;
        if (surface > prof->snow_line || prof->polar) return BLOCK_SNOW;
        return BLOCK_GRASS;
    }

    if (altitude_m > surface - 4.0f) return BLOCK_DIRT;
    return BLOCK_STONE;
}

block_t planet_sample(const body_config_t* body, dvec3_t unit_dir, float altitude_m) {
    const column_profile_t p = planet_profile(body, unit_dir);
    return planet_sample_with_profile(&p, altitude_m);
}
