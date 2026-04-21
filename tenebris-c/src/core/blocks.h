#ifndef TENEBRIS_CORE_BLOCKS_H
#define TENEBRIS_CORE_BLOCKS_H

#include <stdbool.h>
#include <stdint.h>

/*
 * Tier 1 block set. Mirrors src/world/Block.ts in the TypeScript reference.
 * Matching BlockType numeric values on both sides makes JS/WASM parity UAT
 * simpler — testers can compare save files byte-for-byte.
 */
typedef enum {
    BLOCK_AIR   = 0,
    BLOCK_STONE = 1,
    BLOCK_DIRT  = 2,
    BLOCK_GRASS = 3,

    BLOCK_COUNT
} block_t;

bool block_is_solid(block_t b);

#endif
