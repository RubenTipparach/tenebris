#ifndef TENEBRIS_CLIENT_PERSISTENCE_H
#define TENEBRIS_CLIENT_PERSISTENCE_H

#include <stdbool.h>
#include <stdint.h>

/*
 * Browser-side single-player save / load. Backed by window.localStorage
 * (~5 MB total, synchronous). Each save lives at the key
 *
 *     tenebris-c:world:<name>
 *
 * so multiple worlds coexist; the menu's world picker lists every key
 * matching that prefix. Larger saves (chunk diffs, inventory) will
 * migrate to IndexedDB when M6's persistence layer lands.
 */

#define PERSISTENCE_NAME_MAX   31    /* + null terminator */
#define PERSISTENCE_MAX_WORLDS 32

typedef struct {
    double   pos_x, pos_y, pos_z;   /* world-space position */
    float    yaw, pitch, roll;      /* radians */
    uint32_t body_id;
} persistence_save_t;

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

#endif
