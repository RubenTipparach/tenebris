#ifndef TENEBRIS_CLIENT_HEX_MESHER_H
#define TENEBRIS_CLIENT_HEX_MESHER_H

#include "core/hex_pool.h"
#include "core/math.h"
#include <stddef.h>
#include <stdint.h>

/*
 * Naive face-cull hex mesher. Output is a triangle soup in the
 * floating-origin frame. Vertex format is 32 bytes:
 *   float pos[3]
 *   float normal[3]
 *   float uv[2]       — atlas-offset UVs (single-draw atlas binding)
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

void hex_mesh_build_chunk(hex_mesh_t* out,
                          const hex_pool_t* pool,
                          const hex_chunk_t* chunk,
                          dvec3_t floating_origin);

/* Atlas layout. Must match the runtime bake in renderer.c. */
#define HEX_ATLAS_TILES   12        /* 11 block types + 1 unused air column */
#define HEX_ATLAS_U_STEP  (1.0f / (float)HEX_ATLAS_TILES)

#endif
