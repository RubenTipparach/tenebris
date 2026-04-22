#ifndef TENEBRIS_CORE_PLANET_H
#define TENEBRIS_CORE_PLANET_H

#include <stdint.h>

/*
 * Static configuration for a celestial body. Tier 1 ships exactly one
 * planet ("tenebris" itself, ~700 km radius — matches the Caelum
 * reference). Multi-planet support is Tier 3.
 *
 * Kept in core/ because both the chunk generator and the LOD tree need
 * the body's radius + seed, and they have to agree on both byte-for-byte
 * across server and client.
 */

typedef enum {
    BODY_TENEBRIS = 0,
    BODY_COUNT
} body_id_t;

typedef struct {
    body_id_t id;
    const char* name;
    double     radius_m;          /* surface radius in meters */
    uint64_t   seed;
    int        max_lod_depth;     /* 0..LOD_MAX_DEPTH; smaller bodies use less */
    float      gravity_g;         /* multiplier of Earth gravity */
} body_config_t;

const body_config_t* planet_get(body_id_t id);

/* Default per-body LOD parameters. Tier 1 is single planet so no body
 * argument is needed; we expose the constants for the LOD tree to read. */
#define LOD_ROOT_COUNT     20         /* icosahedron faces */
#define LOD_CHILDREN       4          /* aperture-4 subdivision per node */
#define LOD_MAX_DEPTH      14
#define LOD_MAX_NODES      16384      /* hard ceiling on simultaneous patches */
#define LOD_NUM_WORKERS    4          /* matches Caelum's job-pool size */
#define LOD_MAX_UPLOAD     64         /* GPU uploads per frame */
#define LOD_SPLIT_FACTOR   4.0f       /* matches Caelum's config.yaml */

#endif
