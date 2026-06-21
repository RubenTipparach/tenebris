#include "client/inventory.h"
#include <string.h>

#define CREATIVE_COUNT 9999

void inventory_init_creative(inventory_t* inv) {
    memset(inv, 0, sizeof(*inv));
    /* Hotbar layout: torch is reserved at slot 0 (key "1") so a
     * fresh creative session always has light one keypress away,
     * and the persistence path enforces the same invariant on every
     * restore - see inventory_ensure_reserved_torch. The rest is a
     * sensible terrain palette, with water in the rightmost slot
     * so the per-voxel flow simulator is one keypress away without
     * needing the F2 debug toggle. Snow is still placeable via
     * mining (every other slot's block is too). */
    inv->slots[0] = (inv_slot_t){ BLOCK_TORCH,  CREATIVE_COUNT };
    inv->slots[1] = (inv_slot_t){ BLOCK_STONE,  CREATIVE_COUNT };
    inv->slots[2] = (inv_slot_t){ BLOCK_DIRT,   CREATIVE_COUNT };
    inv->slots[3] = (inv_slot_t){ BLOCK_GRASS,  CREATIVE_COUNT };
    inv->slots[4] = (inv_slot_t){ BLOCK_SAND,   CREATIVE_COUNT };
    inv->slots[5] = (inv_slot_t){ BLOCK_WOOD,   CREATIVE_COUNT };
    inv->slots[6] = (inv_slot_t){ BLOCK_LEAVES, CREATIVE_COUNT };
    inv->slots[7] = (inv_slot_t){ BLOCK_ICE,    CREATIVE_COUNT };
    inv->slots[8] = (inv_slot_t){ BLOCK_WATER,  CREATIVE_COUNT };
    inv->selected = 0;

    /* Main inventory pre-stock: four starter tools + a small stash of
     * raw / refined resources so the inventory + crafting screens
     * have something visible to render until the survival drop path
     * lands. The hotbar's still block-only (block placement is the
     * only verb wired up today); items show up on the I-screen and
     * inside the 3x3 crafting grid. Field 1 is `type` (block) — left
     * BLOCK_AIR for item slots — field 2 is `count`, field 3 is
     * `item_id`. */
    inv->main[0]  = (inv_slot_t){ BLOCK_AIR, 1,  ITEM_PICKAXE         };
    inv->main[1]  = (inv_slot_t){ BLOCK_AIR, 1,  ITEM_AXE             };
    inv->main[2]  = (inv_slot_t){ BLOCK_AIR, 1,  ITEM_SHOVEL          };
    inv->main[3]  = (inv_slot_t){ BLOCK_AIR, 1,  ITEM_PROSPECTING_AXE };
    inv->main[10] = (inv_slot_t){ BLOCK_AIR, 8,  ITEM_LOG             };
    inv->main[11] = (inv_slot_t){ BLOCK_AIR, 32, ITEM_PLANK           };
    inv->main[12] = (inv_slot_t){ BLOCK_AIR, 16, ITEM_STICK           };
    inv->main[13] = (inv_slot_t){ BLOCK_AIR, 12, ITEM_STONE           };
    inv->main[20] = (inv_slot_t){ BLOCK_AIR, 4,  ITEM_SMALL_ROCK      };
    inv->main[21] = (inv_slot_t){ BLOCK_AIR, 3,  ITEM_GRASS_CLIP      };
    inv->main[22] = (inv_slot_t){ BLOCK_AIR, 2,  ITEM_FLOWER          };
}

void inventory_ensure_reserved_torch(inventory_t* inv) {
    if (!inv) return;
    if (inv->slots[0].type != BLOCK_TORCH || inv->slots[0].count <= 0) {
        inv->slots[0].type  = BLOCK_TORCH;
        inv->slots[0].count = CREATIVE_COUNT;
    }
}

void inventory_ensure_reserved_water(inventory_t* inv) {
    if (!inv) return;
    inv_slot_t* s = &inv->slots[INV_HOTBAR_SLOTS - 1];
    if (s->type != BLOCK_WATER || s->count <= 0) {
        s->type  = BLOCK_WATER;
        s->count = CREATIVE_COUNT;
    }
}

void inventory_init_empty(inventory_t* inv) {
    memset(inv, 0, sizeof(*inv));
    /* Survival starts with an otherwise-empty hotbar so every solid
     * block has to be mined. Two infinite exceptions: torches at
     * slot 0 (no crafting system yet, players need a way to light
     * caves) and water at the rightmost slot (it's a fluid - there's
     * no "mine a water block to add to inventory" path for it, so
     * gating it on creative mode would mean MP players never get
     * to use the flow simulator at all). */
    inv->slots[0] = (inv_slot_t){ BLOCK_TORCH, CREATIVE_COUNT };
    inv->slots[INV_HOTBAR_SLOTS - 1] = (inv_slot_t){ BLOCK_WATER, CREATIVE_COUNT };
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
