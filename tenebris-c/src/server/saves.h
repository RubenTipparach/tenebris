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
 *   rooms/<room>/world-<seed>/
 *     body-<id>/
 *       <tile-id>.col     128 raw bytes — the tile's full block column.
 *                         Overlaid onto the procgen baseline at boot.
 *   rooms/<room>/players/
 *     <name>.dat          binary blob: { body_id, x, y, z, yaw, pitch }.
 *                         Filename is the sanitized lowercase form
 *                         of the player's display name. Scoped per
 *                         room so a player who logs out in room A
 *                         and joins room B gets a fresh server-side
 *                         spawn, not a bleed-through pose.
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

/* Companion .water file: the per-voxel water-flow state byte column
 * (source / falling / level packed per cell, layout in
 * core/world_water.h). Same size as the block column - one byte per
 * voxel times WORLD_MAX_DEPTH - and the same atomic-swap + header
 * conventions. Magic is 'TWAT' so a stray read of a .water file as a
 * .col (or vice versa) is rejected up front rather than silently
 * miscompiled. */
#define SAVES_WATER_VERSION     1
#define SAVES_WATER_MAGIC       0x54415754u   /* 'TWAT' little-endian */
#define SAVES_WATER_HEADER_SIZE 16

/* Per-tile origins file format (.orig sibling to .water).
 *   header = 16 bytes: magic, version, entry_count, reserved
 *   each entry = 16 bytes:
 *     u8  depth
 *     u8  origin_count   (0..WATER_ORIGIN_MAX)
 *     u16 reserved
 *     3 x {u32 origin_tile, u8 origin_depth, 3 bytes pad}
 *   = 4 + 3*8 = 28 bytes per entry. With WATER_ORIGIN_MAX = 3
 *   slots * 8 bytes/slot = 24, plus 4-byte cell header = 28 bytes.
 *
 * Cells with zero origins are not emitted - empty entry list means
 * "this tile has no flow blocks". WORLD_MAX_DEPTH = 128 cells max,
 * so the upper bound per file is 16 + 128*28 = 3600 bytes. Most
 * tiles have far fewer water cells than that. */
#define SAVES_ORIGINS_VERSION     1
#define SAVES_ORIGINS_MAGIC       0x4752494Fu   /* 'OIRG' little-endian */
#define SAVES_ORIGINS_HEADER_SIZE 16
#define SAVES_ORIGINS_ENTRY_SIZE  28

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

/* Per-tile water-flow state column persistence.
 *
 * Sibling files to the per-tile .col on disk: under
 *   <saves_dir>/rooms/<room>/world-<seed>/body-<id>/<tile-id>.water
 * with the same 16-byte header (magic = SAVES_WATER_MAGIC,
 * version = SAVES_WATER_VERSION, depth = WORLD_MAX_DEPTH) followed
 * by the raw state-byte column.
 *
 * Called from the per-tick flow flush in server.c with whatever
 * tile indices world_water_drain_persist_dirty returns. Same atomic
 * .tmp-swap semantics saves_write_tile uses, so a crash mid-write
 * leaves the previous good copy intact. */
bool saves_write_water_state(world_t* w, const char* room, uint64_t seed,
                              int tile_idx);

/* Apply every saved .water column for `(room, body)` onto `w`'s
 * water-state buffer. Returns the count of tiles actually restored.
 * Mirrors saves_load_world but for the parallel water byte array;
 * call after saves_load_world at room boot so the simulator picks
 * up exactly where the previous server stop left off. */
int  saves_load_world_water(world_t* w, const char* room, uint64_t seed);

/* Per-tile flow-origin persistence. Sibling .orig file to .water.
 * Without this, the origin hashmap is in-memory only and every
 * server restart loses the "which sources fed this cell" data -
 * cells reload with their state byte intact but with empty origins,
 * so world_water_flow_direction returns false for everything and
 * the F5 overlay / UV pan / current force see no flow blocks at
 * all. Symptom from the user's snapshot session: every visible
 * flow cell snapped back to "looks like ocean" after the Fly
 * machine auto-stop / restart.
 *
 * saves_write_water_origins(): walks the origins hashmap for the
 * given tile and writes every (depth, origin_count, origin_refs)
 * cell to disk. Called next to saves_write_water_state in the
 * per-tick persist flush so origins ride along with state.
 *
 * saves_load_world_water_origins(): scans the body directory for
 * .orig files, parses them, replays world_water_origin_add for
 * every entry. Returns the count of tiles restored. Call AFTER
 * saves_load_world_water on room boot. */
bool saves_write_water_origins(world_t* w, const char* room, uint64_t seed,
                                int tile_idx);
int  saves_load_world_water_origins(world_t* w, const char* room,
                                     uint64_t seed);

/* ----------------------------------------------------------------- */
/* Per-body torch lists. Stored at
 *   <saves_dir>/rooms/<room>/world-<seed>/body-<id>/torches.dat
 * as a single binary blob written atomically via the same .tmp swap
 * the tile columns use. Loaded once when a room's per-body world is
 * lazily cloned, and rewritten in full on every torch place / remove
 * (the file is small - 256 max torches at 28 B each = 7 KB - so
 * delta-encoding isn't worth the bookkeeping).
 *
 * Layout (little-endian):
 *   u32 magic    = 'TTRC' (= SAVES_TORCHES_MAGIC)
 *   u32 version  = SAVES_TORCHES_VERSION
 *   u32 body_id
 *   u32 count
 *   { i32 tile_idx, f32 pos[3], f32 up[3] } * count                  */
#define SAVES_TORCHES_MAGIC        0x43525454u  /* 'TTRC' little-endian */
#define SAVES_TORCHES_VERSION      1u
#define SAVES_TORCHES_HEADER_SIZE  16
#define SAVES_TORCHES_ENTRY_SIZE   28           /* i32 + 6*f32         */
#define SAVES_TORCHES_MAX_COUNT    256

typedef struct {
    int32_t  tile_idx;
    float    pos[3];
    float    up [3];
} saves_torch_t;

bool saves_torches_write(const char* room, uint64_t seed, uint32_t body_id,
                           const saves_torch_t* torches, int count);

int  saves_torches_load (const char* room, uint64_t seed, uint32_t body_id,
                           saves_torch_t* out, int cap);

/* Per-player pose, scoped per room. Path is
 *   <saves_dir>/rooms/<room_slug>/players/<name>.dat
 * `room` is the 6-char (or 8-char) room code, or NULL/"" for the
 * public room (stored on disk as __public__). `name` is the
 * player's display name; the file key is a sanitized lowercase
 * form (alnum + dash + underscore; spaces become _). Same (room,
 * name) -> same file across browser swaps, profile re-creation,
 * or localStorage wipes. Different room -> different file, so
 * positions never bleed across rooms. The HELLO-time unique-name
 * check on the server prevents two simultaneous connections from
 * racing against the same file. Names that sanitize to empty (all
 * emoji etc.) return false rather than writing to a zero-length
 * path. */
bool saves_write_player(const char* room, const char* name,
                          const saves_player_pose_t* pose);
bool saves_load_player (const char* room, const char* name,
                          saves_player_pose_t* out);

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

/* ----------------------------------------------------------------- */
/* Inventory of every persisted tile column on disk. Used by the
 * /saves HTTP endpoint so an operator can answer "is the volume
 * actually persisting my edits?" without ssh'ing into the machine.
 *
 * One callback per .col file found. The walker is breadth-first
 * over rooms then bodies then tiles so output is easy to read.
 * Returns the total count.
 *
 * `room` is the on-disk room slug ("__public__" for empty-code).
 * `seed` and `body_id` come from the directory names.
 * `size_bytes` is the file size as stat'd. */
typedef void (*saves_tile_visitor_t)(const char* room,
                                      uint64_t   seed,
                                      uint32_t   body_id,
                                      int        tile_idx,
                                      size_t     size_bytes,
                                      uint64_t   mtime_unix_s,
                                      void*      user);
int saves_enumerate_tiles(saves_tile_visitor_t fn, void* user);

/* ----------------------------------------------------------------- */
/* Bulk download: one body's worth of persisted columns as a single
 * binary blob. Used by the client's lazy-per-body fetch path (the
 * WebSocket CHUNK_DIFF replay was unreliable for large bodies; the
 * HTTP route runs over TCP-with-retransmits and is the source of
 * truth at boot).
 *
 * Output layout (all little-endian):
 *
 *   u8[4]    magic = "TBOD"
 *   u32      version = 1
 *   u32      body_id
 *   u64      seed
 *   u32      tile_count          - number of records following
 *   u32      depth               - WORLD_MAX_DEPTH
 *   { u32 tile_idx, u8[depth] blocks } * tile_count
 *
 * `out` must point at a buffer of `cap` bytes. On success returns
 * true and writes the full blob length into *out_len. Returns false
 * if the blob would exceed cap (in which case *out_len is set to
 * the required size so the caller can grow the buffer). */
#define SAVES_BODY_BLOB_MAGIC   0x444F4254u   /* 'TBOD' little-endian */
#define SAVES_BODY_BLOB_VERSION 1u
/* 4 magic + 4 version + 4 body_id + 8 seed + 4 tile_count + 4 depth */
#define SAVES_BODY_BLOB_HEADER  28

bool saves_body_blob(const char* room, uint64_t seed, uint32_t body_id,
                       uint8_t* out, size_t cap, size_t* out_len);

#endif
