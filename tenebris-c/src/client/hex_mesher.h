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
 * Vertex layout: 40 bytes (pos + normal + uv + sky_light + torch_light).
 *
 *   sky_light    — 0..1 fraction of sky reaching this vertex, baked
 *                  from the count of solid voxels stacked above it
 *                  in the same column. Drops exponentially per
 *                  blocking voxel — caves go dark, exposed surface
 *                  stays full-bright. Replaces the implicit "ambient
 *                  is uniform everywhere" assumption with a cheap
 *                  voxel-occlusion approximation.
 *   torch_light  — sum of inverse-square contributions from nearby
 *                  placed torches (clamped to ~3). Drives the warm-
 *                  orange additive light in the hex shader. Baked at
 *                  mesh-build time from the torch.c list, so a chunk
 *                  must be re-meshed when torches are placed or
 *                  removed within range.
 *
 * The hex pipeline binds all five attributes; the water pipeline
 * binds only pos (its normal is derived radially from a_pos in the
 * vs, uv isn't used). The unused bytes are silently skipped via the
 * shared 40-byte stride.
 */
typedef struct {
    float pos[3];
    float normal[3];
    float uv[2];
    float sky_light;
    float torch_light;
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
