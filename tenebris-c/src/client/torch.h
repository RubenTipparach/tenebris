#ifndef TENEBRIS_CLIENT_TORCH_H
#define TENEBRIS_CLIENT_TORCH_H

#include "client/gfx_math.h"
#include "core/world.h"
#include <stdbool.h>
#include <stdint.h>

/*
 * Torch entity system. A torch is NOT a hex block — it's a placed
 * mesh entity drawn separately from the terrain pass. Geometry is a
 * three-piece procedural mesh (handle cylinder + head cylinder + flame
 * cone) built once at boot and instanced per placed torch.
 *
 * Each placed torch carries a body-local position, a unit-up direction
 * (= surface normal at placement time), and a flicker phase offset so
 * different torches don't pulse in lockstep. The renderer rotates the
 * canonical-Y-up mesh to align with each torch's surface normal so
 * torches stand "up" everywhere on the sphere.
 *
 * The mesher reads the torch list when building terrain so each
 * vertex can be baked with a torch_light contribution (warm-orange
 * inverse-square sum across nearby torches).
 *
 * World coordinates here are body-local — i.e. relative to the active
 * body's centre. Tenebris sits at world origin so for the active body
 * this is identical to world space; bodies that have a non-zero
 * body->pos_x/y/z would need their torches stored in their own local
 * frame. We only support placement on the active body for now.
 */

#define TORCH_MAX_COUNT 256

/* Light range + decay used both by the in-shader flicker and the
 * mesher's per-vertex torch_light bake. Range is the cutoff radius
 * (m) past which a torch contributes nothing; decay is the
 * inverse-square shape parameter — higher = sharper falloff. */
#define TORCH_LIGHT_RANGE_M  6.0f
#define TORCH_LIGHT_DECAY     2.0f

/* Where the flame sits, relative to the torch base (= a_pos in the
 * mesh). Lighting samples are taken from the flame, not the base. */
#define TORCH_FLAME_HEIGHT_M  0.55f

typedef struct torch_s {
    vec3_t position;       /* body-local world pos at the BASE of the torch */
    vec3_t up;             /* unit surface normal — torch points along this */
    float  flicker_phase;  /* seconds added to time so torches desync */
    int    tile_idx;       /* tile this torch is anchored to (for despawn) */
} torch_t;

void torch_init(void);
void torch_shutdown(void);

/* Place a torch at body-local world position with the given surface-
 * up direction. tile_idx tags the torch so removal can find it later
 * by the tile its base sits on. Caller is responsible for ensuring
 * the slot isn't already used. Returns true on success, false if the
 * torch list is full. */
bool torch_place(vec3_t position, vec3_t up, int tile_idx);

/* Remove the nearest torch within radius_m of world_pos. Returns
 * true if one was removed. */
bool torch_remove_near(vec3_t world_pos, float radius_m);

/* Draw all placed torches in one pipeline pass against the supplied
 * vp + global clock. Time is what feeds the flicker (no flicker
 * speed scalar — the shader's three-sine product gets its motion
 * from the raw time progression). */
void torch_draw(mat4_t vp, float time_seconds);

/* Iteration for mesh-time vertex baking. Snapshot is stable until
 * the next torch_place / torch_remove_near / torch_remove. */
int            torch_count(void);
const torch_t* torch_list(void);

/* Flame-tip world position for a placed torch — the actual point
 * lighting samples should treat as the light source. base + up * TORCH_FLAME_HEIGHT_M. */
vec3_t torch_flame_pos(const torch_t* t);

/* Body-local position of the torch base for the given index. Used
 * by interact.c to know where to dirty the world for re-bake when a
 * torch is destroyed. Returns (0,0,0) for an out-of-range index —
 * callers should validate first. */
vec3_t torch_position_at(int idx);

/* Remove the torch at the given index. No-op for out-of-range. The
 * list is swap-removed (last torch fills the freed slot) so existing
 * indices past `idx` shift down by one — callers should not hold an
 * index across this call. */
void torch_remove(int idx);

/* Ray-vs-bounding-sphere test against every placed torch. Returns
 * the index of the nearest torch whose bounding sphere the ray
 * intersects within max_dist, or -1 if none hit. The sphere is
 * centred along the torch's local axis at half its visible height
 * with a radius generous enough to cover the flame's animated
 * wobble — picking the entire torch as one click target is fine
 * since the geometry is small.
 *
 * `dir` must be normalised. `out_dist`, if non-NULL, receives the
 * ray-parameter distance to the hit. */
int torch_raycast(vec3_t eye, vec3_t dir, float max_dist, float* out_dist);

#endif
