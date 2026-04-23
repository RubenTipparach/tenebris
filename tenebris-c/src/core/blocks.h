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

/* Face classification for atlas tile selection. */
typedef enum {
    FACE_CAP_TOP    = 0,
    FACE_CAP_BOTTOM = 1,
    FACE_CAP_SIDE   = 2,
} face_cap_t;

/* Atlas tile index for a block's given face cap. The atlas is a 1x N
 * strip in renderer.c; index = column. Grass uses grass_top / dirt /
 * dirt_grass (top/bottom/side) and snow uses snow / dirt / dirt_snow —
 * standard Minecraft convention. */
uint8_t block_face_tile(block_t b, face_cap_t cap);

#endif
