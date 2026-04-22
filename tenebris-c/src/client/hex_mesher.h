#ifndef TENEBRIS_CLIENT_HEX_MESHER_H
#define TENEBRIS_CLIENT_HEX_MESHER_H

#include "core/hex_pool.h"
#include "core/math.h"
#include <stddef.h>
#include <stdint.h>

/*
 * Naive face-cull hex mesher. Tier 1 first-light: output is a colored
 * triangle soup in the floating-origin frame. Atlas textures + sky-light
 * BFS arrive in subsequent commits.
 *
 * Vertex format is 32 bytes for now (pos + normal + color). The 48-byte
 * format from conversion.md §4 expands to include uv + sky_light +
 * torch_light once the hex pipeline grows a texture atlas.
 */
typedef struct {
    float pos[3];
    float normal[3];
    float color[3];
    uint8_t _pad[4];    /* keep 32-byte stride, room for future sky/torch */
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

/* Build geometry for one chunk. World-space positions are emitted in
 * floating-origin coordinates (caller passes the origin). Neighbor
 * lookups pull from the pool for cross-chunk face culling. */
void hex_mesh_build_chunk(hex_mesh_t* out,
                          const hex_pool_t* pool,
                          const hex_chunk_t* chunk,
                          dvec3_t floating_origin);

#endif
