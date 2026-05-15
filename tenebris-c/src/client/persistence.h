#ifndef TENEBRIS_CLIENT_PERSISTENCE_H
#define TENEBRIS_CLIENT_PERSISTENCE_H

#include <stdbool.h>
#include <stdint.h>

/*
 * Browser-side single-player save / load. Backed by window.localStorage
 * (~5 MB total, synchronous). Multiple worlds coexist via the world
 * name in the key; the menu's world picker enumerates by prefix.
 *
 * Key namespace (all keys start with "tenebris-c:"):
 *   tenebris-c:world:<name>                          - player pose
 *   tenebris-c:tile:<name>:<body>:<tile>             - 128-byte column
 *                                                       (hex-encoded)
 *   tenebris-c:torches:<name>:<body>                 - torch list CSV
 *
 * Per CLAUDE.md, every block place/break and torch place/remove MUST
 * call the matching save function on the SAME input frame. There is
 * no batching, no interval flush, no "save on quit" - the browser
 * can close at any moment.
 */

#define PERSISTENCE_NAME_MAX   31    /* + null terminator */
#define PERSISTENCE_MAX_WORLDS 32
#define PERSISTENCE_COLUMN_BYTES 128 /* must match WORLD_MAX_DEPTH */

typedef struct {
    double   pos_x, pos_y, pos_z;   /* world-space position */
    float    yaw, pitch, roll;      /* radians */
    uint32_t body_id;
} persistence_save_t;

/* A single torch placement, stored verbatim in the per-body torch
 * list. Mirrors the runtime torch_t but uses fixed-size arrays so
 * the on-disk format is decoupled from the in-memory struct. */
typedef struct {
    float pos[3];        /* body-local base position                  */
    float up[3];         /* surface normal (unit) at placement        */
    int   tile_idx;      /* anchor tile in the goldberg grid          */
} persistence_torch_t;

/* Read all save names (matching the tenebris-c:world: prefix) into
 * `out_names`. Each entry is up to PERSISTENCE_NAME_MAX chars + null.
 * Returns the count written, capped at PERSISTENCE_MAX_WORLDS. Worlds
 * are sorted alphabetically. */
int persistence_list_worlds(char out_names[PERSISTENCE_MAX_WORLDS]
                                          [PERSISTENCE_NAME_MAX + 1]);

/* Write/read/delete a named save. `world_name` must be non-empty and
 * <= PERSISTENCE_NAME_MAX chars; longer names get rejected (returns
 * false on save, false on load). Cheap on the hot path — call from a
 * throttled autosave loop. */
bool persistence_save  (const char* world_name, const persistence_save_t* s);
bool persistence_load  (const char* world_name, persistence_save_t* out);
void persistence_delete(const char* world_name);

/* True if a save exists for that name. */
bool persistence_exists(const char* world_name);

/* ---------------------------------------------------------------- */
/* Per-edit tile + torch persistence. Every block place/break and
 * torch place/remove in SP routes through these. The whole 128-byte
 * column is written on every block edit (matches the server's
 * saves_write_tile contract). The whole torch list is written on
 * every torch edit (it's <= 256 entries; the per-edit churn is
 * trivial compared to localStorage's sync cost). */

/* Write the given column under tenebris-c:tile:<world>:<body>:<tile>.
 * `column` must be exactly PERSISTENCE_COLUMN_BYTES bytes. Returns
 * false on validation failure; true on successful write. */
bool persistence_save_tile(const char* world_name, uint32_t body_id,
                           int tile_idx, const uint8_t* column);

/* Read the column previously written for (world, body, tile) into
 * out_column. Returns false when no save exists for that key. */
bool persistence_load_tile(const char* world_name, uint32_t body_id,
                           int tile_idx, uint8_t* out_column);

/* Enumerate tile indices with a saved column for (world, body).
 * Returns the count actually written into out_indices, capped at
 * `cap`. */
int persistence_list_saved_tiles(const char* world_name, uint32_t body_id,
                                 int* out_indices, int cap);

/* Replace the torch list snapshot for (world, body). Pass count=0
 * (and any source pointer) to clear the snapshot when the last
 * torch on a body is removed. */
bool persistence_save_torches(const char* world_name, uint32_t body_id,
                              const persistence_torch_t* torches, int count);

/* Read the torch snapshot for (world, body) into out, up to `cap`
 * entries. Returns the count written; 0 when no snapshot exists. */
int persistence_load_torches(const char* world_name, uint32_t body_id,
                             persistence_torch_t* out, int cap);

/* Wipe every per-tile column and per-body torch list for a world.
 * Used by the delete-world flow alongside persistence_delete (which
 * only removes the pose key). */
void persistence_clear_world(const char* world_name);

#endif
