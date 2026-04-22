#include "core/planet_gen.h"
#include "core/rng.h"

/*
 * Tier 1 terrain: two-octave 3D value noise sampled on the unit sphere,
 * shallow amplitude (~30 m peak-to-trough). Gives rolling hills without
 * demanding too much from the naive face-cull mesher.
 *
 * More interesting terrain (biomes, caves, water tables) is Tier 2+.
 */

#define TERRAIN_BASE_SCALE  6.0f
#define TERRAIN_DETAIL_SCALE 18.0f
#define TERRAIN_BASE_AMP    22.0f
#define TERRAIN_DETAIL_AMP   8.0f

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
    /* noise3d returns [0, 1]; remap to [-1, 1] so the mean is 0. */
    const float s1 = n1 * 2.0f - 1.0f;
    const float s2 = n2 * 2.0f - 1.0f;
    return s1 * TERRAIN_BASE_AMP + s2 * TERRAIN_DETAIL_AMP;
}

block_t planet_sample(const body_config_t* body, dvec3_t unit_dir, float altitude_m) {
    const float surface = planet_surface_altitude(body, unit_dir);
    if (altitude_m > surface)         return BLOCK_AIR;
    if (altitude_m > surface - 1.0f)  return BLOCK_GRASS;
    if (altitude_m > surface - 4.0f)  return BLOCK_DIRT;
    return BLOCK_STONE;
}
