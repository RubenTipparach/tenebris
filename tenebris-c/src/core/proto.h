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

typedef struct {
    uint32_t client_tick;    /* sender's tick — server uses for ordering */
    uint32_t body_id;        /* body the player is anchored to */
    double   pos_x, pos_y, pos_z;
    float    yaw, pitch;
    uint16_t buttons;        /* reserved (input bitfield, M4b) */
    uint16_t reserved;
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
#define TENEBRIS_PROTOCOL_VERSION   3

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

size_t proto_write_player_info(uint8_t* buf, size_t cap, const msg_player_info_t* m);
int    proto_read_player_info (const uint8_t* payload, size_t len, msg_player_info_t* out);

size_t proto_write_player_info_request(uint8_t* buf, size_t cap,
                                         const msg_player_info_request_t* m);
int    proto_read_player_info_request (const uint8_t* payload, size_t len,
                                         msg_player_info_request_t* out);

size_t proto_write_chat(uint8_t* buf, size_t cap, const msg_chat_t* m);
int    proto_read_chat (const uint8_t* payload, size_t len, msg_chat_t* out);

#endif
