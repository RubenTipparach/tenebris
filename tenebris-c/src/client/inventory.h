#ifndef TENEBRIS_CLIENT_INVENTORY_H
#define TENEBRIS_CLIENT_INVENTORY_H

#include "core/blocks.h"
#include <stdbool.h>

#define INV_HOTBAR_SLOTS 9

/* Main inventory grid below the hotbar - shown on the inventory screen
 * (I key). 10 cols x 5 rows so it matches the mockup in crafting.md.
 * Slots are zero-initialised on every inventory_init_* call so a stale
 * save can't smuggle data in via the new range. */
#define INV_MAIN_COLS  10
#define INV_MAIN_ROWS  5
#define INV_MAIN_SLOTS (INV_MAIN_COLS * INV_MAIN_ROWS)

/* 3x3 personal crafting grid + 1 output preview slot. Lives on the
 * crafting tab of the inventory screen; persistence will copy these
 * fields once the recipe matcher lands so a half-laid-out recipe
 * survives a tab switch / reconnect. */
#define INV_CRAFT_COLS  3
#define INV_CRAFT_ROWS  3
#define INV_CRAFT_SLOTS (INV_CRAFT_COLS * INV_CRAFT_ROWS)

/* Item-id enumeration. Order MUST match the LAYOUT table in
 * tools/gen-item-sprites.py - the icon atlas indexes by (id-1) and
 * splits into rows / cols below the surface, so an off-by-one here
 * lands you on the wrong icon at runtime. Add new icons by extending
 * BOTH the python LAYOUT and this enum in lockstep. */
typedef enum {
    ITEM_NONE = 0,            /* empty slot (or it's a block slot) */
    ITEM_PICKAXE,
    ITEM_AXE,
    ITEM_SHOVEL,
    ITEM_PROSPECTING_AXE,
    ITEM_LOG,
    ITEM_PLANK,
    ITEM_STICK,
    ITEM_STONE,
    ITEM_SMALL_ROCK,
    ITEM_GRASS_CLIP,
    ITEM_FLOWER,
    ITEM_COUNT
} item_id_t;

/* A slot can hold either a placeable block (the existing hotbar use-
 * case) or a craftable item. item_id stays at the back of the struct
 * so the existing positional initialisers in inventory.c keep
 * compiling - they leave item_id == ITEM_NONE, which the renderer
 * treats as "this is a block slot, sample the terrain atlas". */
typedef struct {
    block_t   type;     /* BLOCK_AIR == not a block; check item_id    */
    int       count;
    item_id_t item_id;  /* ITEM_NONE == not an item; check type       */
} inv_slot_t;

typedef struct {
    /* Hotbar - the 9 quick-access slots along the bottom of the
     * screen. Same shape as before; only the slot struct has grown. */
    inv_slot_t slots[INV_HOTBAR_SLOTS];
    int        selected;     /* 0..8 */

    /* Main inventory grid - 50 slots laid out 10 cols x 5 rows on the
     * inventory tab. Zero-initialised; the survival drop path will
     * fill it once item-drops land. */
    inv_slot_t main[INV_MAIN_SLOTS];

    /* 3x3 personal crafting grid + a sticky output slot the recipe
     * matcher writes into. Both live on the crafting tab. */
    inv_slot_t craft[INV_CRAFT_SLOTS];
    inv_slot_t craft_output;
} inventory_t;

/* Creative-mode preset: hotbar pre-stocked with the common buildable
 * blocks at "essentially infinite" count, plus the four starter tools
 * dropped into the main inventory so the crafting / equipment flows
 * have something visible to chew on. Reset on game start. */
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
