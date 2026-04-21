#ifndef TENEBRIS_CORE_CHUNKGEN_H
#define TENEBRIS_CORE_CHUNKGEN_H

#include "core/world.h"
#include <stdint.h>

/*
 * Pure function: (seed, cx, cz) -> deterministic chunk contents.
 * Must produce identical output on server + client so we can send
 * chunk diffs instead of full chunks over the wire.
 */
void chunkgen_fill(chunk_t* out, uint64_t seed, int32_t cx, int32_t cz);

int32_t chunkgen_terrain_height(uint64_t seed, int32_t world_x, int32_t world_z);

#endif
