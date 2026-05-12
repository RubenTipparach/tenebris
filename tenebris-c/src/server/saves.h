#ifndef TENEBRIS_SERVER_SAVES_H
#define TENEBRIS_SERVER_SAVES_H

#include "core/planet.h"
#include "core/world.h"
#include <stdbool.h>
#include <stdint.h>

/*
 * Disk-backed persistence for the server. M6 scope.
 *
 * Layout under saves_dir (default /data/saves on the Fly mount,
 * ./saves locally):
 *
 *   world-<seed>/
 *     body-<id>/
 *       <tile-id>.col     128 raw bytes — the tile's full block column.
 *                         Overlaid onto the procgen baseline at boot.
 *   players/
 *     <token>.dat         binary blob: { body_id, x, y, z, yaw, pitch }.
 *
 * Files are written atomically by saves_write_*  via a *.tmp swap so a
 * crash mid-write leaves the previous good copy intact.
 *
 * The module is intentionally simple — no journal, no compression, no
 * delta-against-procgen. Just "the column as it is right now." Cheap
 * to implement, easy to inspect with `ls /data/saves`.
 */

#define SAVES_PLAYER_VERSION   1

typedef struct {
    uint32_t version;
    uint32_t body_id;
    double   pos_x, pos_y, pos_z;
    float    yaw, pitch;
} saves_player_pose_t;

/* Boot-time setup. saves_dir must outlive the module. */
bool saves_init(const char* saves_dir);
void saves_shutdown(void);

/* Apply every saved column for `w`'s body onto its block array. Called
 * once after world_stream_gen completes during server_init. Silent
 * no-op if no saves exist (fresh server). Returns count of tiles
 * loaded (0 = clean boot). */
int  saves_load_world(world_t* w, uint64_t seed);

/* Write the current value of `tile_idx`'s column to disk. Called
 * batched from saves_flush_world; direct calls are also fine for
 * "save immediately after this edit" patterns. */
bool saves_write_tile(world_t* w, uint64_t seed, int tile_idx);

/* Walk the world's dirty bitset and persist every dirty tile, then
 * clear the dirty bits the saves module owns. Cheap when no edits
 * happened recently. */
int  saves_flush_world(world_t* w, uint64_t seed);

/* Per-player pose. `token` must be a non-empty hex string (the HELLO
 * token); empty tokens are skipped so guest sessions don't fight over
 * a single anonymous file. */
bool saves_write_player(const char* token, const saves_player_pose_t* pose);
bool saves_load_player (const char* token, saves_player_pose_t* out);

#endif
