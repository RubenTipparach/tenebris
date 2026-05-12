#ifndef TENEBRIS_CLIENT_NET_CLIENT_H
#define TENEBRIS_CLIENT_NET_CLIENT_H

#include <stdbool.h>
#include <stdint.h>

/*
 * High-level client networking module. Owns the connection to the
 * dedicated server: opens the socket, runs the HELLO/WELCOME
 * handshake, then exposes the welcome data (player id, spawn coords,
 * body id) to the rest of the client.
 *
 * M3 scope: connect, handshake, store welcome. No gameplay changes —
 * the client still runs its own local world. M4 swaps the local
 * player physics for server-authoritative position via INPUT /
 * SNAPSHOT.
 */

typedef enum {
    NET_CLIENT_IDLE       = 0,  /* never called net_client_connect */
    NET_CLIENT_CONNECTING = 1,  /* socket opening                  */
    NET_CLIENT_HANDSHAKE  = 2,  /* socket open, HELLO sent         */
    NET_CLIENT_READY      = 3,  /* WELCOME received                */
    NET_CLIENT_ERROR      = 4,  /* socket dead / refused           */
} net_client_state_t;

typedef struct {
    uint32_t player_id;
    uint64_t world_seed;
    double   spawn_x, spawn_y, spawn_z;
    uint32_t body_id;
} net_client_welcome_t;

/* Open a connection to the dedicated server. URL is one of
 *   "ws://host:port"   plain text (LAN / dev)
 *   "wss://host:port"  TLS (production)
 * Safe to call once at startup; idempotent if called again with a
 * live connection. */
void net_client_connect(const char* url);

/* Tell net_client which profile to identify as on the next HELLO,
 * and which room code to join. Both may be NULL: empty token =
 * anonymous guest, empty room = public room. Call before
 * net_client_connect. */
void net_client_set_profile(const char* token, const char* name,
                              const char* room_code);

/* Most recently learned display name for a player_id (via WELCOME
 * for the local id, MSG_PLAYER_INFO for everyone else). Returns NULL
 * if unknown. Safe to call from anywhere. */
const char* net_client_name_for_id(uint32_t player_id);

/* Send a chat message to the server. Server stamps the sender id +
 * broadcasts to same-room peers. No-op if not connected. Text is
 * truncated at MSG_CHAT_TEXT_LEN-1. */
void net_client_send_chat(const char* text);

/* Per-frame pump. Cheap — just runs callback-driven state
 * transitions; no I/O on this side. */
void net_client_tick(void);

/* Tear down (M7 will call this when SP exits). */
void net_client_disconnect(void);

net_client_state_t   net_client_state  (void);
const net_client_welcome_t* net_client_welcome(void);

/* Most recent server-side DESYNC notice. Returns 0 if the server has
 * never flagged us, or the seconds-ago timestamp of the last notice
 * otherwise. Also returns the reason / block type via the out params
 * (NULL-safe). HUD reads this to surface a transient warning. */
typedef enum {
    NET_DESYNC_NONE         = 0,
    NET_DESYNC_INSIDE_SOLID = 1,
} net_desync_kind_t;

net_desync_kind_t net_client_last_desync(double* out_seconds_ago,
                                            uint32_t* out_block_type);

/* Send the local player's pose to the server. Cheap; safe to call
 * every frame, but the caller throttles to a few times per second
 * (proto only supports newest-wins, so over-sending wastes bandwidth).
 * No-op until the connection is READY. */
void net_client_send_player_state(uint32_t client_tick,
                                    uint32_t body_id,
                                    double pos_x, double pos_y, double pos_z,
                                    float yaw, float pitch);

/* Tell the server about a block edit. Caller has already applied it
 * locally for snappy feedback; the server applies it to its own
 * authoritative world, broadcasts a CHUNK_DIFF to all clients, and
 * persists it to disk (M6). No-op when offline / SP.
 *
 *   kind=PLAYER_CMD_PLACE → place `block_type` at (body, tile, depth)
 *   kind=PLAYER_CMD_BREAK → set that cell to BLOCK_AIR (block_type ignored) */
void net_client_send_edit(int kind, uint32_t body_id,
                           int tile, int depth, int block_type);

#endif
