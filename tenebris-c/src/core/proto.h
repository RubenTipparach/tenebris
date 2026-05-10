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
    MSG_NONE       = 0,
    MSG_HELLO      = 1,   /* C->S handshake init */
    MSG_WELCOME    = 2,   /* S->C handshake reply */
    MSG_INPUT      = 3,   /* C->S input bitfield + look */
    MSG_PLAYER_CMD = 4,   /* C->S place / break / interact / teleport */
    MSG_SNAPSHOT   = 10,  /* S->C entity state */
    MSG_CHUNK_DIFF = 11,  /* S->C block edits */
    MSG_CHAT       = 20,
} msg_kind_t;

/* Per-kind protocol versions. Bump on any wire change. */
#define MSG_HELLO_VERSION         1
#define MSG_WELCOME_VERSION       1
#define MSG_INPUT_VERSION         1
#define MSG_PLAYER_CMD_VERSION    1
#define MSG_SNAPSHOT_VERSION      1
#define MSG_CHUNK_DIFF_VERSION    1
#define MSG_CHAT_VERSION          1

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
#define MSG_HELLO_WIRE_SIZE     40    /* 4 + 32 + 4 */

typedef struct {
    uint32_t client_version;
    uint8_t  token[MSG_HELLO_TOKEN_LEN];
    uint32_t reserved;
} msg_hello_t;

#define MSG_WELCOME_WIRE_SIZE   40    /* 4 + 8 + 24 + 4 */

typedef struct {
    uint32_t player_id;
    uint64_t world_seed;
    double   spawn_x;
    double   spawn_y;
    double   spawn_z;
    uint32_t body_id;
} msg_welcome_t;

/* Protocol-level version. Bumped when the set of message kinds, or
 * any handshake-relevant payload, changes. The server rejects HELLOs
 * whose client_version doesn't match. */
#define TENEBRIS_PROTOCOL_VERSION   1

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

#endif
