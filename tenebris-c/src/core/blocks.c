#include "core/blocks.h"

bool block_is_solid(block_t b) {
    return b != BLOCK_AIR;
}
