#ifndef TENEBRIS_CLIENT_MESHER_H
#define TENEBRIS_CLIENT_MESHER_H

#include "core/world.h"
#include <stddef.h>

/*
 * CPU-side mesh builder. Tier 1 runs on the main thread; Tier 3 moves
 * the same code under a sokol wasm worker.
 *
 * Vertex layout (28 bytes):
 *   float  pos[3]
 *   float  uv[2]       — already atlas-offset so shader does one sample
 *   uint8  normal_id   — 0..5 (for lighting term)
 *   uint8  _pad[3]
 */
typedef struct {
    float   pos[3];
    float   uv[2];
    uint8_t normal_id;
    uint8_t _pad[3];
} vox_vertex_t;

typedef struct {
    vox_vertex_t* vertices;
    uint32_t*     indices;
    size_t        vertex_count;
    size_t        index_count;
    size_t        vertex_cap;
    size_t        index_cap;
} vox_mesh_t;

void mesher_init(vox_mesh_t* m);
void mesher_reset(vox_mesh_t* m);
void mesher_free(vox_mesh_t* m);

/* Build geometry for a single chunk. Caller passes the world so the
 * mesher can check neighboring chunks for face culling.
 */
void mesher_build_chunk(vox_mesh_t* out, const world_t* w, const chunk_t* c);

#endif
