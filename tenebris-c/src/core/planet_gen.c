#include "core/planet_gen.h"
#include "core/rng.h"
#include <math.h>

/*
 * Surface generator. Direct port of src/workers/terrainGenerationWorker.ts
 * — same four layers (continental / mountain / hill / detail), same
 * octave counts, same weights. The underlying primitive is value noise
 * (our rng.c) instead of simplex because we haven't ported simplex yet;
 * the octave stack gives a similar visual feel at our tuning.
 *
 * The JS constants are tuned for a 100 m planet where half the surface
 * is visible at once. Our planet is ~3 km, so the per-unit-sphere scale
 * is cranked up proportionally and the land-height amplitudes converted
 * from "blocks" to "meters".
 */

/* Scale values are JS literals since we're now matching Tenebris JS
 * planet proportions (radius ~= 150 m with one full Goldberg mesh). */
#define CONTINENT_SCALE       0.8f
#define MOUNTAIN_SCALE        2.5f
#define HILL_SCALE            5.0f
#define DETAIL_SCALE         12.0f

#define CONTINENT_WEIGHT      0.7f
#define MOUNTAIN_HEIGHT       0.8f
#define HILL_WEIGHT           0.15f
#define DETAIL_WEIGHT         0.05f
#define OCEAN_DEPTH_POWER     1.3f

/* Heights in voxel blocks (1 m each). Matches JS MAX_HEIGHT / MAX_DEPTH. */
#define MAX_LAND_HEIGHT       4.0f
#define MAX_OCEAN_DEPTH       4.0f
#define LAND_BIAS             0.20f

/* Biome thresholds in meters (altitude relative to body surface). */
#define SEA_LEVEL             0.0f
#define BEACH_BAND            1.0f
#define SNOW_ELEV             3.0f
#define STONE_ELEV            3.8f
#define POLAR_LATITUDE        0.78f
#define COLD_LATITUDE         0.65f

/* ----------------------------------------------------------------------- */
/* fBm and ridge noise. Ports of fractalSimplex3D / ridgeSimplex3D from
 * terrainGenerationWorker.ts. Seed is stirred per-octave so octaves
 * don't correlate. */

static float fractal3d(uint64_t seed, float x, float y, float z,
                       float period, int octaves,
                       float persistence, float lacunarity) {
    float value = 0.0f, max_value = 0.0f;
    float amplitude = 1.0f, frequency = period;
    for (int i = 0; i < octaves; ++i) {
        float n = noise3d_seed(seed + (uint64_t)i * 1117ULL,
                               x * frequency, y * frequency, z * frequency);
        n = n * 2.0f - 1.0f;       /* [0,1] -> [-1,1] */
        value     += n * amplitude;
        max_value += amplitude;
        amplitude *= persistence;
        frequency *= lacunarity;
    }
    return value / max_value;
}

static float ridge3d(uint64_t seed, float x, float y, float z,
                     float period, int octaves,
                     float persistence, float lacunarity) {
    float value = 0.0f, max_value = 0.0f;
    float amplitude = 1.0f, frequency = period;
    for (int i = 0; i < octaves; ++i) {
        float n = noise3d_seed(seed + (uint64_t)i * 1117ULL,
                               x * frequency, y * frequency, z * frequency);
        n = n * 2.0f - 1.0f;
        float ridge = 1.0f - (float)fabs(n);
        value     += ridge * ridge * amplitude;
        max_value += amplitude;
        amplitude *= persistence;
        frequency *= lacunarity;
    }
    return value / max_value;
}

/* ----------------------------------------------------------------------- */

float planet_surface_altitude(const body_config_t* body, dvec3_t unit_dir) {
    const float x = (float)unit_dir.x;
    const float y = (float)unit_dir.y;
    const float z = (float)unit_dir.z;

    /* Continental base — six octaves. sign(n) * |n|^0.8 pushes values
     * toward the extremes so the land/ocean mask has crisp boundaries. */
    float continent = fractal3d(body->seed, x, y, z,
                                CONTINENT_SCALE, 6, 0.5f, 2.0f);
    continent += LAND_BIAS;
    float continent_value = (continent >= 0.0f ? 1.0f : -1.0f)
                            * (float)pow((double)fabs(continent), 0.8);

    /* Mountain ridges on top of land. */
    float mountain_noise = ridge3d(body->seed, x, y, z,
                                   MOUNTAIN_SCALE, 4, 0.5f, 2.2f);
    float land_factor = (continent_value > 0.0f ? continent_value : 0.0f);
    float mountain_height = mountain_noise * land_factor * MOUNTAIN_HEIGHT;

    /* Hills + detail. Hills are dampened outside land. */
    float hill_noise   = fractal3d(body->seed, x, y, z,
                                   HILL_SCALE,   3, 0.5f, 2.0f);
    float detail_noise = fractal3d(body->seed, x, y, z,
                                   DETAIL_SCALE, 2, 0.5f, 2.0f);

    float height = continent_value * CONTINENT_WEIGHT;
    height += mountain_height;
    height += hill_noise * HILL_WEIGHT * (land_factor > 0.1f ? 1.0f : 0.3f);
    height += detail_noise * DETAIL_WEIGHT;

    /* Convert normalized height in [-1, +1] to meters. Use a power curve
     * on the ocean side so sea floors get naturally deeper offshore. */
    if (height >= 0.0f) {
        return height * MAX_LAND_HEIGHT;
    } else {
        float ocean_factor = (float)pow((double)fabs(height), (double)OCEAN_DEPTH_POWER);
        return -ocean_factor * MAX_OCEAN_DEPTH;
    }
}

/* ----------------------------------------------------------------------- */

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

    /* Air/water above the ground. */
    if (altitude_m > surface) {
        if (altitude_m < SEA_LEVEL) {
            return prof->polar ? BLOCK_ICE : BLOCK_WATER;
        }
        return BLOCK_AIR;
    }

    /* Top voxel — biome decision layer. */
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
