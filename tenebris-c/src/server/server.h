#ifndef TENEBRIS_SERVER_SERVER_H
#define TENEBRIS_SERVER_SERVER_H

#include "core/planet.h"
#include "core/world.h"
#include <stdbool.h>
#include <stdint.h>

/*
 * Server state. One per process. Owns the worlds (Tenebris + moons +
 * neighbours), tick counter, and listener handle once M2 wires
 * a transport in. Built / torn down by server_init / server_shutdown
 * in server.c; ticked by server_tick once per simulated frame.
 */

#define SERVER_MAX_BODIES 32

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
} server_t;

bool server_init(server_t* s, const server_config_t* cfg);
void server_tick(server_t* s);
void server_shutdown(server_t* s);

/* Called by signal handlers — async-safe, only flips a flag. */
void server_request_shutdown(server_t* s);

#endif
