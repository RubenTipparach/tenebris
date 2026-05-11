#ifndef TENEBRIS_CLIENT_PERSISTENCE_H
#define TENEBRIS_CLIENT_PERSISTENCE_H

#include <stdbool.h>
#include <stdint.h>

/*
 * Browser-side single-player save / load. Backed by window.localStorage
 * — small (~5 MB) but always available and synchronous, which fits the
 * "save player position every few seconds" pattern. Larger saves
 * (chunk diffs, inventory) will migrate to IndexedDB when M6's
 * persistence layer lands.
 *
 * v1 scope: just the player's pose + which body they're on. Enough to
 * resume where you left off after a tab close.
 */

typedef struct {
    double   pos_x, pos_y, pos_z;   /* world-space position */
    float    yaw, pitch, roll;      /* radians */
    uint32_t body_id;
} persistence_save_t;

/* Write the current pose to localStorage. Cheap, but throttle to
 * once every few seconds in the caller — don't hammer it every frame. */
bool persistence_save(const persistence_save_t* s);

/* Load the most recent save. Returns false if nothing's stored or
 * the blob is malformed. */
bool persistence_load(persistence_save_t* out);

/* Drop the save (used by a future "New Game" button). */
void persistence_clear(void);

#endif
