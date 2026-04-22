#ifndef TENEBRIS_CORE_BLOCKS_H
#define TENEBRIS_CORE_BLOCKS_H

#include <stdbool.h>
#include <stdint.h>

/*
 * Tier 1 hex-prism block palette. Atlas layout matches Caelum's 1x11
 * strip (each tile is 16x16 px), so the index here doubles as the U
 * column in the atlas. Determined this is the right shape after the
 * deep read of the existing C/Sokol port (see conversion.md §4).
 */
typedef enum {
    BLOCK_AIR        = 0,
    BLOCK_WATER      = 1,
    BLOCK_SAND       = 2,
    BLOCK_DIRT       = 3,
    BLOCK_GRASS      = 4,
    BLOCK_STONE      = 5,
    BLOCK_ICE        = 6,
    BLOCK_SNOW       = 7,
    BLOCK_DIRT_GRASS = 8,    /* "grass with dirt under" - used on side faces */
    BLOCK_DIRT_SNOW  = 9,
    BLOCK_TORCH      = 10,
    BLOCK_MOON       = 11,

    BLOCK_COUNT
} block_t;

bool block_is_solid(block_t b);
bool block_is_transparent(block_t b);

/* Per-face atlas tile index. face_id matches the mesher's normal_id:
 *   0 +X side, 1 -X side, 2 +Y top, 3 -Y bottom, 4 +Z side, 5 -Z side.
 * Returns the atlas tile column (= block_t for most blocks; grass uses
 * grass_top on +Y, dirt on -Y, dirt_grass on sides — Minecraft style).
 */
uint8_t block_face_tile(block_t b, int face_id);

#endif
