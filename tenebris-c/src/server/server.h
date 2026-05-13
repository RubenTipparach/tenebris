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
#define SERVER_MAX_ROOMS  8

#define SERVER_NAME_MAX  31
#define SERVER_TOKEN_LEN 32
#define SERVER_ROOM_LEN  8

/* Per-room world isolation. Each room gets its own copies of every
 * world (cloned from the procgen baseline + any persisted edits for
 * that specific room). Empty `code` slot = unused. Public room lives
 * at rooms[0] with code == "" and is allocated at server_init. Private
 * rooms get allocated on first join and freed when ref_count drops
 * to zero (keeps memory bounded). */
typedef struct {
    char     code[SERVER_ROOM_LEN + 1];
    world_t* worlds[SERVER_MAX_BODIES];
    int      world_count;
    int      ref_count;       /* connected clients in this room */
    bool     in_use;
} server_room_t;

typedef struct {
    net_conn_t* conn;          /* NULL slot = free */
    uint32_t    player_id;
    bool        handshaked;    /* HELLO received, WELCOME sent */
    bool        has_state;     /* received at least one PLAYER_STATE */
    char        token[SERVER_TOKEN_LEN + 1];
    char        name [SERVER_NAME_MAX  + 1];
    /* Room code = visibility group. Empty string = public room. */
    char        room [SERVER_ROOM_LEN  + 1];
    /* Resolved room index in server.rooms[]; -1 when none. Set by
     * the HELLO handler after acquiring the matching room slot. */
    int         room_idx;
    uint32_t    body_id;
    double      pos_x, pos_y, pos_z;
    float       yaw, pitch;
    uint32_t    last_client_tick;
    /* Sanity-check throttle: tick of the last DESYNC sent. The check
     * only fires at most once per second to avoid flooding a client
     * that's stuck in geometry. */
    uint64_t    last_desync_tick;
    /* Pose-save debounce. Periodic flush skips the disk write when
     * the player hasn't moved >= 0.25 m since the last successful
     * save - an idle lobby of 50 players would otherwise rewrite
     * 100 identical files per second. last_saved_tick == 0 means
     * "no save has happened yet for this session", which forces the
     * first eligible flush to write unconditionally. */
    double      last_saved_pos_x, last_saved_pos_y, last_saved_pos_z;
    uint64_t    last_saved_tick;
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
    /* Procgen baseline. Cloned per-room on demand; never mutated
     * after server_init, so rooms share its terrain without locking.
     * Same shape (count + ordering) as before the per-room refactor. */
    world_t*  worlds[SERVER_MAX_BODIES];
    int       world_count;

    /* Active rooms. rooms[0] is the public room (code == ""), always
     * allocated. Private rooms occupy 1..MAX_ROOMS-1 lazily. */
    server_room_t    rooms[SERVER_MAX_ROOMS];

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
