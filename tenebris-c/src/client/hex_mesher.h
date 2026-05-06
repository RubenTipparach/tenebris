#ifndef TENEBRIS_CLIENT_HEX_MESHER_H
#define TENEBRIS_CLIENT_HEX_MESHER_H

#include "core/math.h"
#include "core/world.h"
#include <stddef.h>
#include <stdint.h>

/*
 * Per-tile hex/pent prism mesher. Output is a triangle soup in planet-
 * world coordinates (single precision — planet is small enough that a
 * floating origin isn't needed yet). Atlas UVs + shaded in the hex
 * shader.
 *
 * Vertex layout: 36 bytes (pos + normal + uv + shore_dist). The hex
 * pipeline only binds the first three attributes (pos/normal/uv);
 * the water pipeline binds pos and shore_dist (its uv/normal are
 * derived from world position). The unused-by-each-pipeline bytes
 * are silently skipped via the shared 36-byte stride.
 *
 * shore_dist is great-arc distance (m) from this vertex to the
 * nearest land tile, computed at mesh-build time via the per-tile
 * BFS in world.c. 0 on land vertices; positive on water vertices,
 * driving shoreline foam in water.glsl.
 */
typedef struct {
    float pos[3];
    float normal[3];
    float uv[2];
    float shore_dist;
} hex_vertex_t;

typedef struct {
    hex_vertex_t* vertices;
    uint32_t*     indices;
    size_t        vertex_count;
    size_t        index_count;
    size_t        vertex_cap;
    size_t        index_cap;
} hex_mesh_t;

void hex_mesh_init(hex_mesh_t* m);
void hex_mesh_reset(hex_mesh_t* m);
void hex_mesh_free(hex_mesh_t* m);

/* Build the opaque geometry for a single tile: top/bottom caps of the
 * solid column and any side faces where a neighbor is shorter. */
void hex_mesh_build_tile(hex_mesh_t* out, const world_t* w, int tile_idx);

/* Emit ONE hex/pent water cap at sea level if the tile has a water
 * column (surface below sea). The water shader animates this cap with
 * sin-based waves and alpha-blends it. */
void hex_mesh_build_water(hex_mesh_t* out, const world_t* w, int tile_idx);

/* Atlas column count (must match the runtime bake in renderer.c).
 * 12 default + 6 Sequoia + 3 tinted variants + wood + leaves + bedrock
 * = 24 total. */
#define HEX_ATLAS_TILES   24
#define HEX_ATLAS_U_STEP  (1.0f / (float)HEX_ATLAS_TILES)

#endif
