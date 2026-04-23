#ifndef TENEBRIS_CORE_GOLDBERG_H
#define TENEBRIS_CORE_GOLDBERG_H

#include "core/math.h"
#include <stdbool.h>
#include <stdint.h>

/*
 * Goldberg polyhedron — the true hex/pentagon sphere representation used
 * by Tenebris JS (see src/planet/GoldbergPolyhedron.ts).
 *
 * Construction:
 *   1. Start with an icosahedron (12 vertices, 20 faces).
 *   2. Subdivide each face N times (edge bisection + re-project).
 *   3. Take the dual: each original-mesh vertex becomes a tile whose
 *      corners are the centers of the faces meeting at that vertex.
 *
 * After N subdivisions the tile count is 10*4^N + 2 (12 pentagons at the
 * original icosahedron corners, rest are hexagons).
 */

#define GOLDBERG_MAX_VERTS_PER_TILE   6
#define GOLDBERG_MAX_NEIGHBORS        6

typedef struct {
    int32_t index;
    dvec3_t center;                                    /* on the unit sphere */
    int8_t  num_verts;                                 /* 5 or 6 */
    int8_t  num_neighbors;                             /* same as num_verts */
    bool    is_pentagon;
    dvec3_t verts[GOLDBERG_MAX_VERTS_PER_TILE];        /* CCW around center */
    int32_t neighbors[GOLDBERG_MAX_NEIGHBORS];         /* tile indices */
} goldberg_tile_t;

typedef struct goldberg_s goldberg_t;

/* Build a Goldberg polyhedron at unit radius (radius-scaled later by the
 * caller via tile.center * radius). subs = number of subdivisions. */
goldberg_t* goldberg_create(int subdivisions);
void        goldberg_destroy(goldberg_t* g);

int                    goldberg_tile_count(const goldberg_t* g);
const goldberg_tile_t* goldberg_tile(const goldberg_t* g, int index);

/* Spatial lookup: find the tile whose center is closest to `dir` (must
 * be a unit vector). `hint_tile` can be -1 for a full scan, or an
 * adjacent tile index for a fast greedy walk — O(radius) in tiles
 * versus O(n) for the full scan. Returns a tile index. */
int goldberg_find_tile(const goldberg_t* g, dvec3_t unit_dir, int hint_tile);

#endif
