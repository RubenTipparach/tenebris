#include "client/inventory.h"
#include <string.h>

#define CREATIVE_COUNT 9999

void inventory_init_creative(inventory_t* inv) {
    memset(inv, 0, sizeof(*inv));
    /* Hotbar layout: rocks first (slot 1) so a fresh creative session
     * starts holding the most common building block, torch second
     * (slot 2) so light-placement is one keypress away — matches the
     * JS reference hotbar order. The rest is a sensible terrain
     * palette. */
    inv->slots[0] = (inv_slot_t){ BLOCK_STONE,  CREATIVE_COUNT };
    inv->slots[1] = (inv_slot_t){ BLOCK_TORCH,  CREATIVE_COUNT };
    inv->slots[2] = (inv_slot_t){ BLOCK_DIRT,   CREATIVE_COUNT };
    inv->slots[3] = (inv_slot_t){ BLOCK_GRASS,  CREATIVE_COUNT };
    inv->slots[4] = (inv_slot_t){ BLOCK_SAND,   CREATIVE_COUNT };
    inv->slots[5] = (inv_slot_t){ BLOCK_WOOD,   CREATIVE_COUNT };
    inv->slots[6] = (inv_slot_t){ BLOCK_LEAVES, CREATIVE_COUNT };
    inv->slots[7] = (inv_slot_t){ BLOCK_ICE,    CREATIVE_COUNT };
    inv->slots[8] = (inv_slot_t){ BLOCK_SNOW,   CREATIVE_COUNT };
    inv->selected = 0;
}

void inventory_init_empty(inventory_t* inv) {
    memset(inv, 0, sizeof(*inv));
    /* Survival starts with an empty hotbar so every block has to be
     * mined. The one exception is torches: there's no crafting system
     * yet, so without an unlimited torch slot players have no way to
     * light caves at all. Slotted at index 0 so a fresh joiner sees a
     * usable item the moment they spawn. */
    inv->slots[0] = (inv_slot_t){ BLOCK_TORCH, CREATIVE_COUNT };
    inv->selected = 0;
}

bool inventory_add(inventory_t* inv, block_t type) {
    if (type == BLOCK_AIR) return false;
    /* Stack on first matching slot. */
    for (int i = 0; i < INV_HOTBAR_SLOTS; ++i) {
        if (inv->slots[i].type == type && inv->slots[i].count > 0) {
            inv->slots[i].count++;
            return true;
        }
    }
    /* Otherwise drop into first empty slot. */
    for (int i = 0; i < INV_HOTBAR_SLOTS; ++i) {
        if (inv->slots[i].type == BLOCK_AIR || inv->slots[i].count == 0) {
            inv->slots[i].type  = type;
            inv->slots[i].count = 1;
            return true;
        }
    }
    return false;   /* hotbar full */
}

bool inventory_can_place(const inventory_t* inv) {
    const inv_slot_t* s = &inv->slots[inv->selected];
    return s->type != BLOCK_AIR && s->count > 0;
}

block_t inventory_selected(const inventory_t* inv) {
    if (!inventory_can_place(inv)) return BLOCK_AIR;
    return inv->slots[inv->selected].type;
}

void inventory_consume(inventory_t* inv) {
    inv_slot_t* s = &inv->slots[inv->selected];
    if (s->count > CREATIVE_COUNT) return;        /* creative: infinite */
    if (s->count <= 0) return;
    s->count--;
    if (s->count == 0) s->type = BLOCK_AIR;
}

void inventory_select(inventory_t* inv, int slot) {
    if (slot < 0) slot = 0;
    if (slot >= INV_HOTBAR_SLOTS) slot = INV_HOTBAR_SLOTS - 1;
    inv->selected = slot;
}
