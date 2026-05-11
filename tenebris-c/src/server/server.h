#ifndef TENEBRIS_SERVER_SERVER_H
#define TENEBRIS_SERVER_SERVER_H

#include "core/net_transport.h"
#include "core/planet.h"
#include "core/world.h"
#include <stdbool.h>
#include <stdint.h>

/*
 * Server state. One per process. Owns the worlds (Tenebris + moons +
 * neighbours), tick counter, listener handle, and per-client state.
 * Built / torn down by server_init / server_shutdown in server.c;
 * ticked by server_tick once per simulated frame.
 */

#define SERVER_MAX_BODIES 32
#define SERVER_MAX_CLIENTS 16

typedef struct {
    net_conn_t* conn;          /* NULL slot = free */
    uint32_t    player_id;
    bool        handshaked;    /* HELLO received, WELCOME sent */
    bool        has_state;     /* received at least one PLAYER_STATE */
    uint32_t    body_id;
    double      pos_x, pos_y, pos_z;
    float       yaw, pitch;
    uint32_t    last_client_tick;
} server_client_t;

typedef struct {
    int    port;          /* listen port for the WS backend (M2+) */
    double tick_hz;       /* simulation rate; defaults to 20.0 */
    int    log_every_n;   /* print a heartbeat every N ticks */
    const char* saves_dir;/* directory for save files (M6+) */
    uint64_t seed;        /* world seed (M6+ — currently unused) */
} server_config_t;

typedef struct {
    server_config_t cfg;
    world_t*  worlds[SERVER_MAX_BODIES];
    int       world_count;
    uint64_t  tick;
    double    accum_seconds;
    bool      shutdown_requested;

    net_listener_t*  listener;
    server_client_t  clients[SERVER_MAX_CLIENTS];
    uint32_t         next_player_id;
} server_t;

bool server_init(server_t* s, const server_config_t* cfg);
void server_tick(server_t* s);
void server_shutdown(server_t* s);

/* Called by signal handlers — async-safe, only flips a flag. */
void server_request_shutdown(server_t* s);

#endif
