#ifndef TENEBRIS_CORE_PROTO_H
#define TENEBRIS_CORE_PROTO_H

#include <stddef.h>
#include <stdint.h>

/*
 * Tenebris wire protocol. Both the dedicated server and the WASM
 * client speak this. Every message on the wire is:
 *
 *     [ msg_hdr_t : 8 bytes ]  [ payload : header.length bytes ]
 *
 * msg_hdr_t fields and all payloads are little-endian. Payloads are
 * encoded / decoded through the proto_* helpers below — never by
 * memcpy'ing a struct, because the in-memory layout doesn't match
 * the wire layout once any field crosses an alignment boundary.
 *
 * Versioning: each kind carries its own version. Bump it in lockstep
 * with the wire change. Old peers reject unknown versions with a
 * CLOSE rather than silently misparse.
 */

#define MSG_HEADER_SIZE     8

/* Sentinel for the `body_id` field of PLAYER_STATE / WELCOME /
 * SNAPSHOT entries. Indicates "the player is in deep space, not
 * gravitationally bound to any registered body". The position
 * fields remain absolute world coords; only the body anchor is
 * undefined. Valid body_id_t enum values are 0..BODY_COUNT-1, so
 * 0xFFFFFFFF can never collide with a real body. */
#define BODY_ID_IN_SPACE   0xFFFFFFFFu

typedef enum {
    MSG_NONE         = 0,
    MSG_HELLO        = 1,   /* C->S handshake init */
    MSG_WELCOME      = 2,   /* S->C handshake reply */
    MSG_INPUT        = 3,   /* C->S input bitfield + look */
    MSG_PLAYER_CMD   = 4,   /* C->S place / break / interact / teleport */
    MSG_PLAYER_STATE = 5,   /* C->S relayed pose (M4 position-relay path) */
    MSG_SNAPSHOT     = 10,  /* S->C entity state */
    MSG_CHUNK_DIFF   = 11,  /* S->C block edits */
    MSG_DESYNC       = 12,  /* S->C "your reported pose is impossible" */
    MSG_PLAYER_INFO  = 13,  /* S->C name announcement: (player_id, name) */
    MSG_KICK         = 14,  /* S->C terminal error + user-facing reason */
    MSG_CHAT         = 20,
    MSG_PLAYER_INFO_REQUEST = 21, /* C->S: please re-send PLAYER_INFO for this id */
    MSG_PLAYER_INFO_NACK    = 22, /* S->C: cannot fulfill PLAYER_INFO_REQUEST */
    MSG_INVENTORY_STATE     = 23, /* both ways: client uploads hotbar; server replays on rejoin */
    MSG_TORCH_DIFF          = 24, /* both ways: torch place / remove (single entry C->S, broadcast S->C, bulk on join) */
    MSG_WATER_STATE_DIFF    = 25, /* S->C: per-voxel water flow state bytes for one tile column. Sent
                                   * after server-driven world_water_step alongside the block-level
                                   * CHUNK_DIFF so client cap heights / bell-curve / falling-flag visuals
                                   * mirror the authoritative simulation. */
    MSG_SYNC_TICK           = 26, /* S->C: "please fetch a fresh /saves/body for the body you're
                                   * standing on and ACK when applied." Carries a uint32 seq_id
                                   * the client echoes back in MSG_SYNC_ACK so the server can
                                   * measure round-trip time and adapt the interval. Empty body
                                   * beyond seq_id - the server doesn't tell the client what to
                                   * sync, the client decides based on its current active body. */
    MSG_SYNC_ACK            = 27, /* C->S: echoes the SYNC_TICK seq_id once the /saves/body
                                   * apply path has finished. Server uses this to compute RTT
                                   * per client and rebalance the next interval. */
    MSG_WATER_ORIGINS_DIFF  = 28, /* S->C: flow-origin list for every active water cell in one tile.
                                   * Sent alongside the MSG_WATER_STATE_DIFF for the same tile so
                                   * the client knows which cells are flowing (have origins) vs.
                                   * which are spawn sources (no origin entry). Origins drive the
                                   * top-cap UV pan direction and the player-current force. */
} msg_kind_t;

/* Per-kind protocol versions. Bump on any wire change. */
#define MSG_HELLO_VERSION         3     /* v2: name field; v3: room_code */
#define MSG_WELCOME_VERSION       2     /* v2: + spawn_yaw / spawn_pitch */
#define MSG_INPUT_VERSION         1
#define MSG_PLAYER_CMD_VERSION    1
#define MSG_PLAYER_STATE_VERSION  1
#define MSG_SNAPSHOT_VERSION      1
#define MSG_CHUNK_DIFF_VERSION    1
#define MSG_DESYNC_VERSION        1
#define MSG_PLAYER_INFO_VERSION   1
#define MSG_KICK_VERSION          1
#define MSG_CHAT_VERSION          1
#define MSG_PLAYER_INFO_REQUEST_VERSION  1
#define MSG_PLAYER_INFO_NACK_VERSION     1
#define MSG_INVENTORY_STATE_VERSION      1
#define MSG_TORCH_DIFF_VERSION           1
#define MSG_WATER_STATE_DIFF_VERSION     1
#define MSG_SYNC_TICK_VERSION            1
#define MSG_SYNC_ACK_VERSION             1
/* Both sync messages carry a uint32 seq_id - 4 bytes total payload. */
#define MSG_SYNC_TICK_WIRE_SIZE          4
#define MSG_SYNC_ACK_WIRE_SIZE           4
#define MSG_WATER_ORIGINS_DIFF_VERSION   1
/* Header + body layout for MSG_WATER_ORIGINS_DIFF:
 *   uint32  body_id
 *   uint32  tile_idx
 *   uint16  entry_count        (number of (depth, origins) records)
 *   uint16  _pad
 *   entries[entry_count]:
 *     uint8  depth             (0..WORLD_MAX_DEPTH-1)
 *     uint8  origin_count      (1..3)
 *     uint8  _pad[2]
 *     uint32 origin_tile[3]    (only first origin_count are meaningful)
 *     uint8  origin_depth[3]
 *     uint8  _pad2
 *
 * Each entry is 20 bytes. A tile carrying its theoretical max of
 * WORLD_MAX_DEPTH=128 distinct flow cells = 2.5 KB which still
 * fits comfortably in a single WebSocket message. Practical waterfall
 * tiles carry <20 entries (~400 B). */
#define MSG_WATER_ORIGINS_DIFF_HEADER_SIZE  12
#define MSG_WATER_ORIGINS_DIFF_ENTRY_SIZE   20
#define MSG_WATER_ORIGINS_DIFF_MAX_ENTRIES  128
#define MSG_WATER_ORIGINS_DIFF_MAX_SIZE     (MSG_WATER_ORIGINS_DIFF_HEADER_SIZE \
    + MSG_WATER_ORIGINS_DIFF_ENTRY_SIZE * MSG_WATER_ORIGINS_DIFF_MAX_ENTRIES)

typedef struct {
    uint16_t kind;       /* msg_kind_t */
    uint16_t version;    /* per-kind */
    uint32_t length;     /* payload bytes, not including header */
} msg_hdr_t;

/* ------------------------------------------------------------------
 * In-memory representations. These are the ergonomic structs the
 * server and client work with. They do NOT match the wire byte
 * layout on platforms with padding — always go through the proto_*
 * encode / decode helpers to cross the wire.
 * ------------------------------------------------------------------ */

#define MSG_HELLO_TOKEN_LEN     32
#define MSG_HELLO_NAME_LEN      32
#define MSG_HELLO_ROOM_LEN       8
#define MSG_HELLO_WIRE_SIZE     80    /* v3: 4 + 32 + 32 + 8 + 4 */

typedef struct {
    uint32_t client_version;
    uint8_t  token[MSG_HELLO_TOKEN_LEN];      /* persistent profile id */
    uint8_t  name [MSG_HELLO_NAME_LEN];       /* UTF-8 display name, null-padded */
    uint8_t  room_code[MSG_HELLO_ROOM_LEN];   /* private room id, null-padded; empty = public */
    uint32_t reserved;
} msg_hello_t;

#define MSG_PLAYER_INFO_NAME_LEN  32
#define MSG_PLAYER_INFO_WIRE_SIZE 40    /* 4 + 32 + 4 */

typedef struct {
    uint32_t player_id;
    uint8_t  name[MSG_PLAYER_INFO_NAME_LEN];
    uint32_t reserved;
} msg_player_info_t;

/* Client-side trigger when an in-room peer appears in SNAPSHOT but
 * the PLAYER_INFO broadcast went missing (e.g. it joined before the
 * other client opened the WebSocket fully and the join-time fan-out
 * raced the local handshake). Server looks up `player_id` in its
 * room-scoped client table and replies with a single PLAYER_INFO. */
#define MSG_PLAYER_INFO_REQUEST_WIRE_SIZE  8    /* 4 + 4 */

typedef struct {
    uint32_t player_id;
    uint32_t reserved;
} msg_player_info_request_t;

/* Server's response when it can't fulfill a PLAYER_INFO_REQUEST -
 * lets the client log a useful console error and stop retrying that
 * id forever, instead of silently re-sending every 2 s. */
#define MSG_PLAYER_INFO_NACK_WIRE_SIZE  8    /* 4 + 4 */

typedef enum {
    PLAYER_INFO_NACK_NONE       = 0,
    PLAYER_INFO_NACK_UNKNOWN_ID = 1,    /* no such player_id in requester's room */
} player_info_nack_reason_t;

typedef struct {
    uint32_t player_id;
    uint32_t reason;     /* player_info_nack_reason_t */
} msg_player_info_nack_t;

/* Inventory snapshot. Both client and server send this:
 *   - Client sends after the local hotbar changes (place / mine /
 *     select) so the server has the latest state to persist.
 *   - Server sends once right after WELCOME with the saved hotbar
 *     so the player picks up where they left off (and any time it
 *     wants to authoritatively reset a client's hotbar).
 * Fixed-size 9-slot hotbar matches the client struct - inventory.h.
 * Slot type is the block id (BLOCK_AIR = empty slot). Count is an
 * int16 so the creative-mode "infinite" sentinel (any value >= 9000)
 * fits as a regular int. Selected is 0..8. */
#define MSG_INVENTORY_SLOTS        9
#define MSG_INVENTORY_STATE_WIRE_SIZE  44  /* 4 + 9*2 + 9*2 + 1 + 3 */

typedef struct {
    uint32_t player_id;
    uint16_t slot_type [MSG_INVENTORY_SLOTS];
    int16_t  slot_count[MSG_INVENTORY_SLOTS];
    uint8_t  selected;
    uint8_t  reserved[3];
} msg_inventory_state_t;

/* ------------------------------------------------------------------
 * Chat. Client sends MSG_CHAT with message text (player_id field is
 * ignored on the wire); server fans out MSG_CHAT to every connected
 * client with player_id stamped to the sender so receivers can render
 * 'name: text'. UTF-8 truncated at MSG_CHAT_TEXT_LEN bytes — no
 * splitting on grapheme boundaries, so very long emoji could be
 * mangled at the cut point. Acceptable for v1.
 * ------------------------------------------------------------------ */

#define MSG_CHAT_TEXT_LEN     128
#define MSG_CHAT_WIRE_SIZE    136   /* 4 + 128 + 4 */

typedef struct {
    uint32_t player_id;
    uint8_t  text[MSG_CHAT_TEXT_LEN];
    uint32_t reserved;
} msg_chat_t;

#define MSG_WELCOME_WIRE_SIZE   48    /* 4 + 8 + 24 + 4 + 4 + 4 */

typedef struct {
    uint32_t player_id;
    uint64_t world_seed;
    double   spawn_x;
    double   spawn_y;
    double   spawn_z;
    uint32_t body_id;
    float    spawn_yaw;
    float    spawn_pitch;
} msg_welcome_t;

/* ------------------------------------------------------------------
 * Player-state relay (M4 — pragmatic, trust-the-client). Each client
 * tells the server where it is; the server broadcasts everyone's
 * position to everyone via SNAPSHOT. Cheating-resistance comes later
 * when player physics moves into core/ and the server runs it.
 * ------------------------------------------------------------------ */

#define MSG_PLAYER_STATE_WIRE_SIZE  44   /* 4 + 4 + 24 + 8 + 4 */

/* PLAYER_STATE.flags bits.
 *
 *   PLAYER_STATE_FLAG_GROUNDED: client physics reports the player is
 *     standing on solid voxels this frame (not jumping, jet-packing,
 *     swimming, or free-falling). The server uses this to gate pose
 *     persistence - a save fires only when the player is in a stable,
 *     repeatable pose. Without this gate, the periodic 0.5 s flush
 *     would happily persist mid-fall poses, then the next session's
 *     WELCOME RESUME would drop the player back into the middle of
 *     the air, gravity ticks before the chunks settle, and they fall
 *     through to the bedrock-rescue equator default - the "spawn at
 *     same wrong place on every reconnect" symptom.
 *
 * Older clients (protocol v1) sent `reserved = 0` here; the server's
 * unconditional save was the bug. Newer clients set the bit. Treat
 * an unset bit on a recent stream as "client says I'm not grounded;
 * don't save" - if a buggy client never sets the bit the server will
 * stop persisting movement, which is a louder failure mode than the
 * silent corruption it replaces. */
#define PLAYER_STATE_FLAG_GROUNDED  0x0001

typedef struct {
    uint32_t client_tick;    /* sender's tick — server uses for ordering */
    uint32_t body_id;        /* body the player is anchored to */
    double   pos_x, pos_y, pos_z;
    float    yaw, pitch;
    uint16_t buttons;        /* reserved (input bitfield, M4b) */
    uint16_t flags;          /* PLAYER_STATE_FLAG_* bitset (was `reserved`;
                              * server reads bit 0 = grounded to gate pose
                              * persistence). */
} msg_player_state_t;

/* SNAPSHOT carries an array of remote-player poses. Sender's player
 * is included (the client snaps to it for authoritative reconcile
 * later; relay path ignores it for the local player). */

#define SNAPSHOT_MAX_PLAYERS       16
#define MSG_SNAPSHOT_HEADER_SIZE    8   /* tick(4) + count(2) + reserved(2) */
#define MSG_SNAPSHOT_ENTRY_SIZE    40   /* id(4) + body(4) + pos(24) + yaw/pitch(8) */

typedef struct {
    uint32_t player_id;
    uint32_t body_id;
    double   pos_x, pos_y, pos_z;
    float    yaw, pitch;
} msg_snapshot_entry_t;

typedef struct {
    uint32_t server_tick;
    uint16_t player_count;
    msg_snapshot_entry_t players[SNAPSHOT_MAX_PLAYERS];
} msg_snapshot_t;

/* ------------------------------------------------------------------
 * World edits (M5). Client sends PLAYER_CMD on every place / break;
 * server applies the edit to its authoritative world, then broadcasts
 * a CHUNK_DIFF to all connected clients so everyone's local copy
 * converges. The server is the persistence point — see M6 in
 * MULTIPLAYER.md for the disk path.
 * ------------------------------------------------------------------ */

typedef enum {
    PLAYER_CMD_PLACE  = 0,
    PLAYER_CMD_BREAK  = 1,
} player_cmd_kind_t;

#define MSG_PLAYER_CMD_WIRE_SIZE   16   /* kind+pad(4) + body(4) + tile(4) + depth(2) + block(2) */

typedef struct {
    uint8_t  cmd_kind;       /* player_cmd_kind_t */
    uint8_t  reserved8a;
    uint16_t reserved16a;
    uint32_t body_id;
    uint32_t tile_idx;
    uint16_t depth;
    uint16_t block_type;     /* destination block (BLOCK_AIR for break) */
} msg_player_cmd_t;

#define CHUNK_DIFF_MAX_EDITS         64
#define MSG_CHUNK_DIFF_HEADER_SIZE   8     /* body(4) + count(2) + reserved(2) */
#define MSG_CHUNK_DIFF_ENTRY_SIZE    8     /* tile(4) + depth(2) + block(2) */

typedef struct {
    uint32_t tile_idx;
    uint16_t depth;
    uint16_t block_type;
} msg_chunk_diff_entry_t;

typedef struct {
    uint32_t body_id;
    uint16_t edit_count;
    msg_chunk_diff_entry_t edits[CHUNK_DIFF_MAX_EDITS];
} msg_chunk_diff_t;

/* ------------------------------------------------------------------
 * Torch place / remove. Symmetric message used in both directions:
 *
 *   - Client sends a single-entry TORCH_DIFF on every place / remove
 *     (op = PLACE / REMOVE, the entry payload describing the torch).
 *   - Server applies, persists to disk, then broadcasts a single-
 *     entry TORCH_DIFF to every room peer (including the sender,
 *     who deduplicates against its local list by tile_idx + epsilon
 *     position match - mirrors how CHUNK_DIFF is fanned out).
 *   - On WELCOME, server fans out the full torch state for every
 *     body the room knows about as a bulk TORCH_DIFF (count > 1,
 *     all PLACE entries) sent directly to the joining client only,
 *     so other peers don't apply duplicates.
 *
 * Same on-disk torch list lives at world-<seed>/body-<id>/torches.dat;
 * see saves_torches_* in src/server/saves.h.
 * ------------------------------------------------------------------ */

typedef enum {
    TORCH_OP_PLACE  = 0,
    TORCH_OP_REMOVE = 1,
} torch_op_t;

#define TORCH_DIFF_MAX_ENTRIES   64
#define MSG_TORCH_ENTRY_SIZE     32  /* op(4) + tile(4) + pos(12) + up(12) */
#define MSG_TORCH_DIFF_HEADER    8   /* body(4) + count(2) + reserved(2)   */

/* ------------------------------------------------------------------
 * Water-state diff. One message carries the WORLD_MAX_DEPTH-byte
 * water-state column for a single (body, tile). Sent by the server
 * after world_water_step whenever the tile got marked persist-dirty
 * (via world_water_drain_persist_dirty), so the client's local
 * state-byte view tracks the authoritative sim and the mesher's
 * per-voxel cap-height / falling-flag visuals stay correct in MP.
 *
 * Wire layout:
 *   uint32_t body_id
 *   uint32_t tile_idx
 *   uint8_t  state[WORLD_MAX_DEPTH]   (one byte per voxel)
 *
 * WORLD_MAX_DEPTH = 128, so MSG_WATER_STATE_DIFF_WIRE_SIZE = 136. */
#define MSG_WATER_STATE_DIFF_WIRE_SIZE   (4 + 4 + 128)

typedef struct {
    uint32_t body_id;
    uint32_t tile_idx;
    uint8_t  state[128];      /* matches WORLD_MAX_DEPTH */
} msg_water_state_diff_t;

/* Flow-origin entries for one tile. Mirrors water_origin_diff_entry_t
 * over the wire so the receive path can decode straight into the
 * world_water apply call without an extra copy. */
typedef struct {
    uint8_t  depth;
    uint8_t  origin_count;     /* 1..3 - cells with zero origins are not transmitted */
    uint8_t  _pad[2];
    uint32_t origin_tile [3];
    uint8_t  origin_depth[3];
    uint8_t  _pad2;
} msg_water_origins_diff_entry_t;

typedef struct {
    uint32_t body_id;
    uint32_t tile_idx;
    uint16_t entry_count;
    uint16_t _pad;
    msg_water_origins_diff_entry_t entries[MSG_WATER_ORIGINS_DIFF_MAX_ENTRIES];
} msg_water_origins_diff_t;

/* Server-driven sync coordination. The server periodically tells each
 * client "fetch a fresh world snapshot now" via MSG_SYNC_TICK, and
 * the client echoes the same seq_id back in MSG_SYNC_ACK once the
 * /saves/body apply path has finished overwriting its local view.
 *
 * The server uses the round-trip time + per-client outstanding
 * unack'd tick count to grow the next interval (start at 30 s, step
 * up by 30 s if the previous round didn't ACK in time). This keeps
 * busy / laggy clients from drowning in resync work while still
 * giving every client an authoritative-data refresh on a bounded
 * schedule.
 *
 * Both directions carry just the uint32 seq_id. */
typedef struct {
    uint32_t seq_id;
} msg_sync_tick_t;

typedef struct {
    uint32_t seq_id;
} msg_sync_ack_t;

typedef struct {
    uint8_t  op;          /* torch_op_t */
    uint8_t  reserved8;
    uint16_t reserved16;
    uint32_t tile_idx;
    float    pos_x, pos_y, pos_z;
    float    up_x,  up_y,  up_z;
} msg_torch_entry_t;

typedef struct {
    uint32_t body_id;
    uint16_t entry_count;
    uint16_t reserved;
    msg_torch_entry_t entries[TORCH_DIFF_MAX_ENTRIES];
} msg_torch_diff_t;

/* ------------------------------------------------------------------
 * Server-side sanity check feedback. The server doesn't simulate
 * player physics (M4 trust-the-client) but it can still spot
 * impossible poses — like "you're standing inside bedrock" — and
 * tell the client. Useful both for detecting client/server world
 * disagreement and as a tripwire against trivial cheats.
 * ------------------------------------------------------------------ */

#define MSG_DESYNC_WIRE_SIZE   36   /* 4 + 4 + 24 + 4 */

typedef enum {
    DESYNC_NONE          = 0,
    DESYNC_INSIDE_SOLID  = 1,    /* claimed position is inside a non-air block */
} desync_reason_t;

typedef struct {
    uint32_t reason;             /* desync_reason_t */
    uint32_t body_id;
    double   client_pos_x, client_pos_y, client_pos_z;
    uint32_t block_type;         /* block_t the player was reported inside */
} msg_desync_t;

/* ------------------------------------------------------------------
 * MSG_KICK: terminal error message the server sends right before
 * closing a connection that can't be served. Carries a numeric
 * reason code (so the client can branch on it - e.g. suppress the
 * normal auto-reconnect loop for version mismatches that are
 * never going to resolve without a refresh) and a short ASCII
 * text the client surfaces in the disconnected popup.
 * ------------------------------------------------------------------ */

#define MSG_KICK_TEXT_LEN     64
#define MSG_KICK_WIRE_SIZE    72    /* 4 reason + 64 text + 4 reserved */

typedef enum {
    KICK_NONE             = 0,
    KICK_VERSION_MISMATCH = 1,    /* client's protocol version != server's */
    KICK_SERVER_FULL      = 2,
    KICK_GENERIC          = 3,
    KICK_NAME_TAKEN       = 4,    /* another connected client has this name */
} kick_reason_t;

typedef struct {
    uint32_t reason;     /* kick_reason_t */
    uint8_t  text[MSG_KICK_TEXT_LEN];
    uint32_t reserved;
} msg_kick_t;

/* Protocol-level version. Bumped when the set of message kinds, or
 * any handshake-relevant payload, changes. The server rejects HELLOs
 * whose client_version doesn't match. Mismatched clients receive
 * MSG_KICK with reason=KICK_VERSION_MISMATCH so the client can show
 * a "refresh your browser" popup instead of looping the auto-reconnect
 * timer against a server that will never accept them. */
#define TENEBRIS_PROTOCOL_VERSION   4    /* +TORCH_DIFF */

/* ------------------------------------------------------------------
 * Encode / decode helpers. All functions assume little-endian on the
 * wire regardless of host byte order. Encoders return the total
 * bytes written (header + payload), or 0 if `cap` was too small.
 * Decoders return 0 on success, non-zero on malformed input.
 * ------------------------------------------------------------------ */

size_t proto_write_header(uint8_t* buf, msg_kind_t kind, uint16_t version,
                            uint32_t payload_len);
int    proto_read_header(const uint8_t* buf, size_t len, msg_hdr_t* out);

size_t proto_write_hello(uint8_t* buf, size_t cap, const msg_hello_t* m);
int    proto_read_hello (const uint8_t* payload, size_t len, msg_hello_t* out);

size_t proto_write_welcome(uint8_t* buf, size_t cap, const msg_welcome_t* m);
int    proto_read_welcome (const uint8_t* payload, size_t len, msg_welcome_t* out);

size_t proto_write_player_state(uint8_t* buf, size_t cap, const msg_player_state_t* m);
int    proto_read_player_state (const uint8_t* payload, size_t len, msg_player_state_t* out);

size_t proto_write_snapshot(uint8_t* buf, size_t cap, const msg_snapshot_t* m);
int    proto_read_snapshot (const uint8_t* payload, size_t len, msg_snapshot_t* out);

size_t proto_write_desync(uint8_t* buf, size_t cap, const msg_desync_t* m);
int    proto_read_desync (const uint8_t* payload, size_t len, msg_desync_t* out);

size_t proto_write_kick(uint8_t* buf, size_t cap, const msg_kick_t* m);
int    proto_read_kick (const uint8_t* payload, size_t len, msg_kick_t* out);

size_t proto_write_player_cmd(uint8_t* buf, size_t cap, const msg_player_cmd_t* m);
int    proto_read_player_cmd (const uint8_t* payload, size_t len, msg_player_cmd_t* out);

size_t proto_write_chunk_diff(uint8_t* buf, size_t cap, const msg_chunk_diff_t* m);
int    proto_read_chunk_diff (const uint8_t* payload, size_t len, msg_chunk_diff_t* out);

size_t proto_write_torch_diff(uint8_t* buf, size_t cap, const msg_torch_diff_t* m);
int    proto_read_torch_diff (const uint8_t* payload, size_t len, msg_torch_diff_t* out);

size_t proto_write_water_state_diff(uint8_t* buf, size_t cap,
                                     const msg_water_state_diff_t* m);
int    proto_read_water_state_diff (const uint8_t* payload, size_t len,
                                     msg_water_state_diff_t* out);

size_t proto_write_water_origins_diff(uint8_t* buf, size_t cap,
                                       const msg_water_origins_diff_t* m);
int    proto_read_water_origins_diff (const uint8_t* payload, size_t len,
                                       msg_water_origins_diff_t* out);

size_t proto_write_sync_tick(uint8_t* buf, size_t cap, const msg_sync_tick_t* m);
int    proto_read_sync_tick (const uint8_t* payload, size_t len, msg_sync_tick_t* out);

size_t proto_write_sync_ack (uint8_t* buf, size_t cap, const msg_sync_ack_t* m);
int    proto_read_sync_ack  (const uint8_t* payload, size_t len, msg_sync_ack_t* out);

size_t proto_write_player_info(uint8_t* buf, size_t cap, const msg_player_info_t* m);
int    proto_read_player_info (const uint8_t* payload, size_t len, msg_player_info_t* out);

size_t proto_write_player_info_request(uint8_t* buf, size_t cap,
                                         const msg_player_info_request_t* m);
int    proto_read_player_info_request (const uint8_t* payload, size_t len,
                                         msg_player_info_request_t* out);

size_t proto_write_player_info_nack(uint8_t* buf, size_t cap,
                                      const msg_player_info_nack_t* m);
int    proto_read_player_info_nack (const uint8_t* payload, size_t len,
                                      msg_player_info_nack_t* out);

size_t proto_write_inventory_state(uint8_t* buf, size_t cap,
                                     const msg_inventory_state_t* m);
int    proto_read_inventory_state (const uint8_t* payload, size_t len,
                                     msg_inventory_state_t* out);

size_t proto_write_chat(uint8_t* buf, size_t cap, const msg_chat_t* m);
int    proto_read_chat (const uint8_t* payload, size_t len, msg_chat_t* out);

#endif
