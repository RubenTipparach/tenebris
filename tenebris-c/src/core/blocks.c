#include "core/blocks.h"

bool block_is_solid(block_t b) {
    return b != BLOCK_AIR && b != BLOCK_WATER;
}

bool block_is_transparent(block_t b) {
    /* Leaves count as transparent so trunk-side faces inside the canopy
     * still draw. (Leaves don't actually have alpha — this just gates
     * face culling so the trunk + leaf interior is visible.) */
    return b == BLOCK_AIR
        || b == BLOCK_WATER
        || b == BLOCK_ICE
        || b == BLOCK_LEAVES;
}

/* Bedrock cannot be broken by interact_update. Exposed so input/edit
 * paths can early-out. */
bool block_is_unbreakable(block_t b) { return b == BLOCK_BEDROCK; }

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
