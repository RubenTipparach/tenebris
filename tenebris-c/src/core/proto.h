#ifndef TENEBRIS_CORE_PROTO_H
#define TENEBRIS_CORE_PROTO_H

#include <stdint.h>

/*
 * Wire protocol. Both the WebSocket server and the WASM client link
 * this file. Every message is little-endian, length-prefixed, and
 * versioned per-kind.
 *
 * Tier 1: only defined, not used — no network yet. Keeping the header
 * in core/ now means Tier 5 just wires in a socket.
 */

typedef enum {
    MSG_NONE       = 0,
    MSG_HELLO      = 1,   /* C -> S  client version, auth token      */
    MSG_WELCOME    = 2,   /* S -> C  player_id, world seed, spawn    */
    MSG_INPUT      = 3,   /* C -> S  input bitfield + look yaw/pitch */
    MSG_PLAYER_CMD = 4,   /* C -> S  place/break/craft/interact      */
    MSG_SNAPSHOT   = 10,  /* S -> C  entity state diff               */
    MSG_CHUNK_DIFF = 11,  /* S -> C  chunk block edits               */
    MSG_CHAT       = 20,
} msg_kind_t;

typedef struct {
    uint16_t kind;
    uint16_t version;   /* per-kind, never break wire */
    uint32_t length;    /* payload bytes follow */
} msg_hdr_t;

#endif
