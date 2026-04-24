#include "core/blocks.h"

bool block_is_solid(block_t b) {
    return b != BLOCK_AIR && b != BLOCK_WATER;
}

bool block_is_transparent(block_t b) {
    return b == BLOCK_AIR || b == BLOCK_WATER || b == BLOCK_ICE;
}

uint8_t block_face_tile(block_t b, face_cap_t cap) {
    if (b == BLOCK_GRASS) {
        if (cap == FACE_CAP_TOP)    return (uint8_t)BLOCK_GRASS;
        if (cap == FACE_CAP_BOTTOM) return (uint8_t)BLOCK_DIRT;
        return (uint8_t)BLOCK_DIRT_GRASS;
    }
    if (b == BLOCK_SNOW) {
        if (cap == FACE_CAP_TOP)    return (uint8_t)BLOCK_SNOW;
        if (cap == FACE_CAP_BOTTOM) return (uint8_t)BLOCK_DIRT;
        return (uint8_t)BLOCK_DIRT_SNOW;
    }
    /* Sequoia tileset: uses distinct atlas columns so Sequoia's grass /
     * snow / sand look noticeably different from Tenebris's. */
    if (b == BLOCK_SEQ_GRASS) {
        if (cap == FACE_CAP_TOP)    return (uint8_t)BLOCK_SEQ_GRASS;
        if (cap == FACE_CAP_BOTTOM) return (uint8_t)BLOCK_SEQ_DIRT;
        return (uint8_t)BLOCK_SEQ_DIRT_GRASS;
    }
    if (b == BLOCK_SEQ_SNOW) {
        if (cap == FACE_CAP_TOP)    return (uint8_t)BLOCK_SEQ_SNOW;
        if (cap == FACE_CAP_BOTTOM) return (uint8_t)BLOCK_SEQ_DIRT;
        return (uint8_t)BLOCK_SEQ_DIRT_SNOW;
    }
    return (uint8_t)b;
}
