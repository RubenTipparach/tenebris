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

/* Heights in voxel blocks (1 m each). Amplitudes cranked so the planet
 * has real mountains + deep water — the old ±4 m range was too subtle
 * to read at 2.9 m tile scale. Total column is 32 blocks so we have
 * plenty of room before clipping. */
#define MAX_LAND_HEIGHT      18.0f    /* up to 18 m of mountain above sea */
#define MAX_OCEAN_DEPTH      10.0f    /* trenches down to 10 m below sea */
#define LAND_BIAS             0.20f

/* Biome thresholds in meters (altitude relative to body surface).
 * Polar thresholds match JS PlayerConfig.POLAR_THRESHOLD = 0.9 so the
 * ice caps are tight polar-only bands rather than big cold hemispheres. */
#define SEA_LEVEL             0.0f
#define BEACH_BAND            1.5f
#define SNOW_ELEV            11.0f
#define STONE_ELEV           15.0f
#define POLAR_LATITUDE        0.90f
#define COLD_LATITUDE         0.75f

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
    /* Moons + asteroids look flatter — scale the amplitude so they're
     * visibly different from main planets. Icy worlds keep full height. */
    if (body->barren) p.surface_m *= 0.3f;
    p.latitude  = (float)fabs(unit_dir.y);
    p.polar     = p.latitude > POLAR_LATITUDE;
    const bool cold = p.latitude > COLD_LATITUDE;
    p.snow_line = cold ? (SNOW_ELEV * 0.5f) : SNOW_ELEV;
    p.barren    = body->barren;
    p.icy       = body->icy;
    p.sequoia   = (body->tileset == TILESET_SEQUOIA);
    p.crag      = (body->tileset == TILESET_CRAG);
    p.frost     = (body->tileset == TILESET_FROST);
    p.asteroid  = (body->tileset == TILESET_ASTEROID);
    return p;
}

block_t planet_sample_with_profile(const column_profile_t* prof, float altitude_m) {
    const float surface = prof->surface_m;

    /* Barren (moon-like) bodies. Tileset chooses the surface tint so
     * the three kinds of barren body don't all look like Luna. */
    if (prof->barren) {
        if (altitude_m > surface) return BLOCK_AIR;
        if (prof->crag)     return BLOCK_CRAG_ROCK;
        if (prof->asteroid) return BLOCK_ASTEROID_ROCK;
        return BLOCK_MOON;
    }

    /* Icy bodies: snow crust on top, ice below. Frostbite swaps the
     * ice layer to a deeper glacial tint via TILESET_FROST. */
    if (prof->icy) {
        if (altitude_m > surface) return BLOCK_AIR;
        if (altitude_m > surface - 1.0f) return BLOCK_SNOW;
        return prof->frost ? BLOCK_FROST_ICE : BLOCK_ICE;
    }

    /* Air/water above the ground. */
    if (altitude_m > surface) {
        if (altitude_m < SEA_LEVEL) {
            return prof->polar ? BLOCK_ICE : BLOCK_WATER;
        }
        return BLOCK_AIR;
    }

    /* Top voxel — biome decision layer. TILESET_SEQUOIA bodies emit
     * the SEQ_* variants so they pick different atlas columns. */
    if (altitude_m > surface - 1.0f) {
        if (surface > SEA_LEVEL - BEACH_BAND && surface < SEA_LEVEL + BEACH_BAND) {
            return prof->sequoia ? BLOCK_SEQ_SAND : BLOCK_SAND;
        }
        if (surface < SEA_LEVEL) {
            if (surface > SEA_LEVEL - 4.0f) return prof->sequoia ? BLOCK_SEQ_SAND : BLOCK_SAND;
            return BLOCK_STONE;
        }
        if (surface > STONE_ELEV) return BLOCK_STONE;
        if (surface > prof->snow_line || prof->polar) return prof->sequoia ? BLOCK_SEQ_SNOW : BLOCK_SNOW;
        return prof->sequoia ? BLOCK_SEQ_GRASS : BLOCK_GRASS;
    }

    if (altitude_m > surface - 4.0f) return prof->sequoia ? BLOCK_SEQ_DIRT : BLOCK_DIRT;
    return BLOCK_STONE;
}

block_t planet_sample(const body_config_t* body, dvec3_t unit_dir, float altitude_m) {
    const column_profile_t p = planet_profile(body, unit_dir);
    return planet_sample_with_profile(&p, altitude_m);
}
