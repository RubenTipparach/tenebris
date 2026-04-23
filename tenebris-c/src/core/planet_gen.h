#ifndef TENEBRIS_CORE_PLANET_GEN_H
#define TENEBRIS_CORE_PLANET_GEN_H

#include "core/blocks.h"
#include "core/planet.h"
#include "core/math.h"

/*
 * Deterministic planet surface generator. Given a unit direction on
 * the sphere, returns the surface altitude in meters relative to the
 * body's base radius. Lives in core/ because client and server must
 * agree byte-for-byte.
 */

/* Surface altitude at a given unit direction. Positive = above base
 * radius, negative = below. */
float planet_surface_altitude(const body_config_t* body, dvec3_t unit_dir);

/* Block at a world position specified by (unit_dir, altitude_m).
 * altitude_m = 0 is the body's base radius (equal to radius_m). */
block_t planet_sample(const body_config_t* body, dvec3_t unit_dir, float altitude_m);

/* Precomputed per-column biome info. Build once per column in the
 * fill loop, then call planet_sample_with_profile for each layer —
 * avoids repeating the surface-noise lookup per voxel. */
typedef struct {
    float surface_m;
    float latitude;
    float snow_line;
    bool  polar;
    bool  barren;     /* moon-like: skip grass/sand/water biomes */
} column_profile_t;

column_profile_t planet_profile(const body_config_t* body, dvec3_t unit_dir);
block_t          planet_sample_with_profile(const column_profile_t* prof, float altitude_m);

#endif
