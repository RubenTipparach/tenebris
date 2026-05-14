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

/* On-disk format version for tile column .col files. v0 was the
 * headerless 128-raw-bytes layout shipped before this change; the
 * loader still accepts those by fall-back (file size == 128 ->
 * treat as v0). v1 prepends a 16-byte header so any future change
 * to WORLD_MAX_DEPTH or block-id layout is detectable at load
 * time rather than silently miscompiled. */
#define SAVES_TILE_VERSION     1
#define SAVES_TILE_MAGIC       0x4C4F4354u   /* 'TCOL' little-endian */
#define SAVES_TILE_HEADER_SIZE 16

typedef struct {
    uint32_t version;
    uint32_t body_id;
    double   pos_x, pos_y, pos_z;
    float    yaw, pitch;
} saves_player_pose_t;

/* Boot-time setup. saves_dir must outlive the module. */
bool saves_init(const char* saves_dir);
void saves_shutdown(void);

/* Apply every saved column for `(room, body)` onto `w`'s block array.
 * `room` is the 6-char room code, or "" / NULL for the public room
 * (stored on disk as __public__). Returns the count of tile columns
 * actually overlaid. */
int  saves_load_world(world_t* w, const char* room, uint64_t seed);

/* Persist `tile_idx`'s column under (room, body). Call right after
 * world_set in the PLAYER_CMD handler so only the actually-edited
 * tile hits disk — see the M5 chunk-save commit. */
bool saves_write_tile(world_t* w, const char* room, uint64_t seed, int tile_idx);

/* Walk the world's dirty bitset and persist every dirty tile, then
 * clear the dirty bits the saves module owns. Cheap when no edits
 * happened recently. Kept in the API for an eventual edit-only
 * dirty bitmap — the server no longer calls it (immediate save
 * covers chunk edits). */
int  saves_flush_world(world_t* w, const char* room, uint64_t seed);

/* Per-player pose. `token` must be a non-empty hex string (the HELLO
 * token); empty tokens are skipped so guest sessions don't fight over
 * a single anonymous file. */
bool saves_write_player(const char* token, const saves_player_pose_t* pose);
bool saves_load_player (const char* token, saves_player_pose_t* out);

/* ----------------------------------------------------------------- */
/* Chat log per room (M6+, but ships in the chat commit). */

#define SAVES_CHAT_NAME_MAX  31
#define SAVES_CHAT_TEXT_MAX  127
#define SAVES_CHAT_BACKLOG    50      /* messages sent to new joiners */
#define SAVES_CHAT_FILE_MAX   200     /* lines kept on disk per room */

typedef struct {
    char name[SAVES_CHAT_NAME_MAX + 1];
    char text[SAVES_CHAT_TEXT_MAX + 1];
} saves_chat_msg_t;

/* Append one message to the room's log file. Empty room = public.
 * Auto-truncates when the file passes SAVES_CHAT_FILE_MAX lines so
 * the log doesn't grow forever. */
void saves_chat_append(const char* room, const char* name, const char* text);

/* Read up to `cap` recent messages (oldest -> newest) into `out`.
 * Returns the count actually loaded. */
int  saves_chat_load_backlog(const char* room,
                                saves_chat_msg_t* out, int cap);

#endif
