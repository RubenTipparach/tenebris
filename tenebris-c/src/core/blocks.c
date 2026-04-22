#include "core/blocks.h"

bool block_is_solid(block_t b) {
    return b != BLOCK_AIR && b != BLOCK_WATER;
}

bool block_is_transparent(block_t b) {
    return b == BLOCK_AIR || b == BLOCK_WATER || b == BLOCK_ICE;
}

uint8_t block_face_tile(block_t b, int face_id) {
    /* face_id 2 = top, 3 = bottom, otherwise side */
    if (b == BLOCK_GRASS) {
        if (face_id == 2) return (uint8_t)BLOCK_GRASS;
        if (face_id == 3) return (uint8_t)BLOCK_DIRT;
        return (uint8_t)BLOCK_DIRT_GRASS;
    }
    if (b == BLOCK_SNOW) {
        if (face_id == 2) return (uint8_t)BLOCK_SNOW;
        if (face_id == 3) return (uint8_t)BLOCK_DIRT;
        return (uint8_t)BLOCK_DIRT_SNOW;
    }
    return (uint8_t)b;
}
