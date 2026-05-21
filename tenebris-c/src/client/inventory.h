#ifndef TENEBRIS_CLIENT_INVENTORY_H
#define TENEBRIS_CLIENT_INVENTORY_H

#include "core/blocks.h"
#include <stdbool.h>

#define INV_HOTBAR_SLOTS 9

typedef struct {
    block_t type;     /* BLOCK_AIR == empty slot */
    int     count;
} inv_slot_t;

typedef struct {
    inv_slot_t slots[INV_HOTBAR_SLOTS];
    int        selected;     /* 0..8 */
} inventory_t;

/* Creative-mode preset: hotbar pre-stocked with the common buildable
 * blocks at "essentially infinite" count. Reset on game start. */
void   inventory_init_creative(inventory_t* inv);

/* Survival-mode preset: empty hotbar, pickups go to the first matching
 * slot or the first empty one. */
void   inventory_init_empty(inventory_t* inv);

/* Add a single broken block to inventory. Stacks on the first slot
 * matching the type, or fills the first empty hotbar slot. Returns
 * true when something was added. */
bool   inventory_add(inventory_t* inv, block_t type);

/* True if the currently-selected slot can place a block. In creative
 * mode this is always true (counts are huge); in survival it's
 * type != AIR && count > 0. */
bool   inventory_can_place(const inventory_t* inv);

/* Block type the player will place on right-click. Returns BLOCK_AIR
 * when the slot is empty. */
block_t inventory_selected(const inventory_t* inv);

/* Take one off the selected slot. No-op when count is "infinite" in
 * creative (count > 9000). Empties the slot when count drops to 0. */
void   inventory_consume(inventory_t* inv);

/* Move selection. Wraps. */
void   inventory_select(inventory_t* inv, int slot);

/* Enforce the "slot 0 is always torches" invariant. Called after
 * boot init (redundant but cheap) and after every server-driven
 * inventory restore so a stale save can never strip the torch slot. */
void   inventory_ensure_reserved_torch(inventory_t* inv);

/* Enforce the "rightmost slot is always the water spawner" invariant.
 * Same reasoning as the torch reservation: water is the fluid-sim
 * placement tool, there's no "mine a water block to add to inventory"
 * path, so a restore that overwrote slot 8 with a picked-up block
 * would leave the player with no way to use the flow simulator. */
void   inventory_ensure_reserved_water(inventory_t* inv);

#endif
