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
 * Vertex layout: 32 bytes (pos + normal + uv).
 */
typedef struct {
    float pos[3];
    float normal[3];
    float uv[2];
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

/* Build the geometry for a single tile. Emits top/bottom caps at the
 * column's solid/air boundary and side faces where the neighbor tile
 * has a shorter solid column. */
void hex_mesh_build_tile(hex_mesh_t* out, const world_t* w, int tile_idx);

/* Atlas column count (must match the runtime bake in renderer.c). */
#define HEX_ATLAS_TILES   12
#define HEX_ATLAS_U_STEP  (1.0f / (float)HEX_ATLAS_TILES)

#endif
