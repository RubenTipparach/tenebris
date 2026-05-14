#ifndef TENEBRIS_SERVER_SAVES_H
#define TENEBRIS_SERVER_SAVES_H

#include "core/planet.h"
#include "core/world.h"
#include <stddef.h>
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
 *     <name>.dat          binary blob: { body_id, x, y, z, yaw, pitch }.
 *                         Filename is the sanitized lowercase form
 *                         of the player's display name.
 *
 * Files are written atomically by saves_write_*  via a *.tmp swap so a
 * crash mid-write leaves the previous good copy intact.
 *
 * The module is intentionally simple — no journal, no compression, no
 * delta-against-procgen. Just "the column as it is right now." Cheap
 * to implement, easy to inspect with `ls /data/saves`.
 */

/* v1: pose only. v2: pose + 9-slot hotbar (inv_*). The loader still
 * accepts v1 records and zero-fills the inventory so existing saves
 * keep working - new saves are always v2. */
#define SAVES_PLAYER_VERSION   2

#define SAVES_PLAYER_INVENTORY_SLOTS  9

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
    /* v2+: per-player hotbar snapshot. inv_slot_type[i] is the block
     * id (BLOCK_AIR == empty); inv_slot_count[i] is the stack size
     * (creative-mode infinite slots get stored as INT16_MAX so the
     * value clamps cleanly on re-save). inv_selected is 0..8. */
    uint16_t inv_slot_type [SAVES_PLAYER_INVENTORY_SLOTS];
    int16_t  inv_slot_count[SAVES_PLAYER_INVENTORY_SLOTS];
    uint8_t  inv_selected;
    uint8_t  inv_reserved[3];
} saves_player_pose_t;

/* Boot-time setup. saves_dir must outlive the module. */
bool saves_init(const char* saves_dir);
void saves_shutdown(void);

/* Apply every saved column for `(room, body)` onto `w`'s block array.
 * `room` is the 6-char room code, or "" / NULL for the public room
 * (stored on disk as __public__). Returns the count of tile columns
 * actually overlaid. */
int  saves_load_world(world_t* w, const char* room, uint64_t seed);

/* Cheap directory probe: returns true iff (room, seed, body_id) has
 * at least one .col file on disk. Used by room_acquire to decide
 * which bodies need an eager clone-and-overlay vs which can stay
 * lazy. */
bool saves_room_body_has_edits(const char* room, uint64_t seed,
                                 uint32_t body_id);

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

/* Per-player pose. `name` is the player's display name; the file
 * key is a sanitized lowercase form (alnum + dash + underscore;
 * spaces become _). Same name -> same file across browser swaps,
 * profile re-creation, or localStorage wipes. The HELLO-time
 * unique-name check on the server prevents two simultaneous
 * connections from racing against the same file. Names that
 * sanitize to empty (all emoji etc.) return false rather than
 * writing to a zero-length path. */
bool saves_write_player(const char* name, const saves_player_pose_t* pose);
bool saves_load_player (const char* name, saves_player_pose_t* out);

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

/* ----------------------------------------------------------------- */
/* Audit logs (sessions + global chat). Disk-persisted, tab-separated
 * lines under <saves_dir>/sessions.log + <saves_dir>/chat.log. Each
 * line is `<unix_seconds>\t<event>\t<name>\t<room>\n` for sessions
 * and `<unix_seconds>\t<name>\t<room>\t<text>\n` for chat. The HTTP
 * dashboard reads straight off these files so an operator can
 * `curl http://host/logins` without booting a separate tool.
 *
 * Both files auto-truncate to SAVES_AUDIT_FILE_MAX lines once they
 * grow past it, the same cheap "read the whole file, drop the head,
 * rewrite via .tmp swap" pattern as the per-room chat log. */
#define SAVES_AUDIT_FILE_MAX     5000

/* Append a session event (`login` or `logout`). Room is the 6-char
 * code, or empty / NULL for the public room. */
void saves_session_log(const char* event, const char* name, const char* room);

/* Append a chat message to the global, timestamped log (separate
 * from the per-room backlog file that `saves_chat_append` writes -
 * that one stays purely TSV `<name>\t<text>` for in-game replay). */
void saves_global_chat_append(const char* room, const char* name, const char* text);

/* Read the tail of <saves_dir>/<which>.log (which must be "sessions"
 * or "chat") into `out`, terminating it with a NUL. Returns the
 * number of bytes written (excluding the NUL). The buffer is
 * filled with the last `max_lines` lines of the file - older lines
 * are silently dropped. Returns 0 on any error (missing file,
 * over-cap, etc.) so callers can fall back to "no data yet". */
size_t saves_audit_tail(const char* which, int max_lines,
                          char* out, size_t cap);

#endif
