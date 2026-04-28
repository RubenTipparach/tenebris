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

    /* Sequoia-tileset variants — a distinct palette for the sister
     * earth-like planet. Stored as their own block_t values so the
     * mesher needs no per-body branching; the biome classifier picks
     * the right variants for bodies with tileset == TILESET_SEQUOIA. */
    BLOCK_SEQ_GRASS      = 12,
    BLOCK_SEQ_DIRT       = 13,
    BLOCK_SEQ_DIRT_GRASS = 14,   /* side face of Sequoia grass column */
    BLOCK_SEQ_SAND       = 15,
    BLOCK_SEQ_SNOW       = 16,
    BLOCK_SEQ_DIRT_SNOW  = 17,   /* side face of Sequoia snow column */

    /* Runtime-tinted variants — generated at atlas bake time by
     * multiplying the source PNG per channel. Gives differentiated
     * looks for Crag (red), Frostbite (deep blue), asteroids (dark
     * gray) without needing new source art. */
    BLOCK_CRAG_ROCK      = 18,   /* rusty Mars-like rock  */
    BLOCK_FROST_ICE      = 19,   /* deeper glacial blue   */
    BLOCK_ASTEROID_ROCK  = 20,   /* dim gray carbonaceous */

    /* Vegetation + planetary core. */
    BLOCK_WOOD           = 21,
    BLOCK_LEAVES         = 22,   /* tinted grass — pulled darker green at bake */
    BLOCK_BEDROCK        = 23,   /* impassable layer-0 floor (tinted very dark) */

    BLOCK_COUNT
} block_t;

bool block_is_solid(block_t b);
bool block_is_transparent(block_t b);
bool block_is_unbreakable(block_t b);

/* True only when this block fully covers the face of an adjacent
 * voxel — i.e. air/water/ice/leaves don't cover (transparent), and
 * wood/leaves don't cover (partial width). Used by the mesher to
 * decide when to emit a face: if the neighbour does NOT cover,
 * this voxel's face is visible. */
bool block_covers_face(block_t b);

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
