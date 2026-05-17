#ifndef TENEBRIS_CORE_WORLD_WATER_H
#define TENEBRIS_CORE_WORLD_WATER_H

#include <stdbool.h>
#include <stdint.h>

/*
 * Per-voxel water flow state + tick scheduler.
 *
 * Owned as an opaque pointer by world_t::water (forward-declared in
 * world.h). Created in world_create, freed in world_destroy, mirrored
 * in world_clone — same lifecycle pattern as world_light.
 *
 * Two pieces of state per world:
 *
 *   1. A parallel byte array (tile_count * WORLD_MAX_DEPTH) carrying
 *      water-only metadata. A byte of 0 on a BLOCK_WATER voxel means
 *      "legacy / sleeping" — the cell acts as a full source supplier
 *      for neighbour ticks but never wakes the scheduler on its own.
 *      Non-water voxels keep their byte at 0.
 *
 *      Bit layout per byte:
 *        bit 7    : 1 if source ("infinite", drives the flow field)
 *        bit 6    : 1 if falling (supported by the cell above only)
 *        bits 5..3: reserved for a future fluid-type tag (lava, oil)
 *        bits 2..0: flow level, 0..WATER_LEVEL_MAX
 *                   0 = full cell, level_max = thinnest film
 *
 *   2. A bounded ring-buffer scheduler. world_water_enqueue pushes a
 *      (tile, depth) pair; world_water_step pops up to N pairs and
 *      runs the section-5 flow rule from tenebris-c/water.md on each.
 *      A "scheduled" bitset (1 bit per voxel) guarantees a cell can't
 *      sit in the queue twice — re-enqueueing an already-scheduled
 *      cell is a no-op.
 *
 * Step 1 only lays the module down (state + scheduler + tick rule).
 * Step 4/5 wires player-edit and server-tick call sites.
 */

struct world_s;
typedef struct world_water_s world_water_t;

/* ---------------------------------------------------------------------
 * State byte layout + small helpers.
 *
 * These constants encode the algorithm's identity (3-bit level field +
 * two flag bits), not designer-tunable values - the level CAP itself
 * (WATER_LEVEL_MAX) is exposed as a YAML-overridable runtime knob in
 * step 3; the bit positions stay fixed regardless of what the cap is
 * set to.
 * ------------------------------------------------------------------- */

#define WATER_LEVEL_MAX     7      /* 3-bit max; YAML can cap below this */
#define WATER_LEVEL_MASK    0x07u
#define WATER_FLAG_FALLING  0x40u
#define WATER_FLAG_SOURCE   0x80u

static inline bool water_state_is_source(uint8_t s) {
    return (s & WATER_FLAG_SOURCE) != 0u;
}

static inline bool water_state_is_falling(uint8_t s) {
    return (s & WATER_FLAG_FALLING) != 0u;
}

static inline int water_state_level(uint8_t s) {
    return (int)(s & WATER_LEVEL_MASK);
}

static inline uint8_t water_state_pack(bool source, bool falling, int level) {
    uint8_t out = (uint8_t)(level & WATER_LEVEL_MASK);
    if (source)  out |= WATER_FLAG_SOURCE;
    if (falling) out |= WATER_FLAG_FALLING;
    return out;
}

/* ---------------------------------------------------------------------
 * Lifecycle. Called from world.c — clients shouldn't invoke these
 * directly.
 * ------------------------------------------------------------------- */

world_water_t* world_water_create(const struct world_s* w);
void           world_water_destroy(world_water_t* ww);

/* Deep-copy src's state byte array + queue contents into dst. Sizes
 * must match (caller is responsible for cloning against a world built
 * from the same body / subdivisions). */
void world_water_clone_into(world_water_t* dst, const world_water_t* src);

/* ---------------------------------------------------------------------
 * Per-cell state accessors. Out-of-range tile/depth returns 0 / no-op.
 * ------------------------------------------------------------------- */

uint8_t world_water_get_state  (const struct world_s* w, int tile, int depth);
void    world_water_set_state  (struct world_s* w, int tile, int depth, uint8_t state);
void    world_water_clear_state(struct world_s* w, int tile, int depth);

/* ---------------------------------------------------------------------
 * Scheduler.
 *
 * world_water_enqueue: push (tile, depth) for the next world_water_step
 *   call. Silent no-op if the cell is already scheduled. Silent no-op
 *   if the queue is at capacity (the world reconverges as soon as
 *   anything adjacent wakes the cell again - same "tick exhaustion"
 *   behaviour Minecraft falls back to for over-busy redstone).
 *
 * world_water_step: pop up to `max_ticks` cells and run the section-5
 *   flow rule on each. Returns the number of cells actually ticked.
 *   Caller invokes this once per simulation step (server tick loop,
 *   eventually SP frame).
 * ------------------------------------------------------------------- */

void world_water_enqueue(struct world_s* w, int tile, int depth);
int  world_water_step   (struct world_s* w, int max_ticks);

/* Notify the flow scheduler that a voxel at (tile, depth) was just
 * edited. Enqueues the cell itself plus its 5/6 horizontal neighbours
 * and (up to) two vertical neighbours in the same column - the cells
 * whose flow state could be affected by the change.
 *
 * Called automatically from world_set, so every edit path (player
 * input, network-applied PLAYER_CMD, future scripted mutations) wakes
 * the simulator without each call site needing to remember. Worldgen
 * writes the column directly bypassing world_set, which is the right
 * call - the seafloor fill stays "sleeping" until something disturbs
 * it.
 *
 * Pass-through no-op when the cell is out of range or the world has
 * no water module attached. */
void world_water_notify_edit(struct world_s* w, int tile, int depth);

/* Queue depth for diagnostics / tests. */
int  world_water_pending(const struct world_s* w);

#endif
