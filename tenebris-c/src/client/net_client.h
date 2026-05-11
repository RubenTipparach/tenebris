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

/* Per-frame pump. Cheap — just runs callback-driven state
 * transitions; no I/O on this side. */
void net_client_tick(void);

/* Tear down (M7 will call this when SP exits). */
void net_client_disconnect(void);

net_client_state_t   net_client_state  (void);
const net_client_welcome_t* net_client_welcome(void);

/* Send the local player's pose to the server. Cheap; safe to call
 * every frame, but the caller throttles to a few times per second
 * (proto only supports newest-wins, so over-sending wastes bandwidth).
 * No-op until the connection is READY. */
void net_client_send_player_state(uint32_t client_tick,
                                    uint32_t body_id,
                                    double pos_x, double pos_y, double pos_z,
                                    float yaw, float pitch);

#endif
