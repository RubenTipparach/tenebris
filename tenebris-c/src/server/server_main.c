/*
 * tenebris-server — headless authoritative game server.
 *
 * M1 scope: boot the world, run a 20 Hz tick loop, handle signals,
 * exit cleanly. No socket yet (the transport interface ships in
 * core/net_transport.h but its first implementation lands in M2).
 *
 * Build: `cmake --build build --target tenebris-server`.
 * Run:   `./tenebris-server [--seed N] [--port P] [--tick-hz F]
 *                            [--saves DIR]`.
 */

#include "server/server.h"
#include <errno.h>
#include <signal.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

static server_t G_SERVER;

static void on_signal(int sig) {
    (void)sig;
    server_request_shutdown(&G_SERVER);
}

static int parse_args(int argc, char** argv, server_config_t* cfg) {
    cfg->port        = 8080;
    cfg->tick_hz     = 20.0;
    cfg->log_every_n = 0;          /* server_init picks ~1Hz default */
    cfg->saves_dir   = "./saves";
    cfg->seed        = 0;
    for (int i = 1; i < argc; ++i) {
        const char* a = argv[i];
        if (i + 1 < argc && strcmp(a, "--port") == 0) {
            cfg->port = atoi(argv[++i]);
        } else if (i + 1 < argc && strcmp(a, "--seed") == 0) {
            cfg->seed = strtoull(argv[++i], NULL, 10);
        } else if (i + 1 < argc && strcmp(a, "--tick-hz") == 0) {
            cfg->tick_hz = strtod(argv[++i], NULL);
        } else if (i + 1 < argc && strcmp(a, "--saves") == 0) {
            cfg->saves_dir = argv[++i];
        } else if (strcmp(a, "--help") == 0 || strcmp(a, "-h") == 0) {
            printf("usage: tenebris-server [--port P] [--seed N] "
                   "[--tick-hz F] [--saves DIR]\n");
            return 1;
        } else {
            fprintf(stderr, "tenebris-server: unknown arg '%s'\n", a);
            return 2;
        }
    }
    return 0;
}

static double monotonic_seconds(void) {
    struct timespec ts;
    clock_gettime(CLOCK_MONOTONIC, &ts);
    return (double)ts.tv_sec + (double)ts.tv_nsec * 1e-9;
}

static void sleep_until(double deadline) {
    double now = monotonic_seconds();
    double remaining = deadline - now;
    if (remaining <= 0.0) return;
    struct timespec req;
    req.tv_sec  = (time_t)remaining;
    req.tv_nsec = (long)((remaining - (double)req.tv_sec) * 1e9);
    while (nanosleep(&req, &req) == -1 && errno == EINTR) {
        /* a signal woke us — loop will exit on shutdown flag */
    }
}

int main(int argc, char** argv) {
    server_config_t cfg;
    int parse = parse_args(argc, argv, &cfg);
    if (parse) return parse == 1 ? 0 : parse;

    signal(SIGINT,  on_signal);
    signal(SIGTERM, on_signal);

    if (!server_init(&G_SERVER, &cfg)) {
        fprintf(stderr, "[server] init failed\n");
        return 1;
    }

    const double dt = 1.0 / cfg.tick_hz;
    double next = monotonic_seconds();
    while (!G_SERVER.shutdown_requested) {
        next += dt;
        server_tick(&G_SERVER);
        sleep_until(next);
        /* If we fell badly behind (debugger, paused VM), don't try
         * to catch up — just re-anchor to now. */
        double now = monotonic_seconds();
        if (now - next > dt * 5.0) next = now;
    }

    server_shutdown(&G_SERVER);
    return 0;
}
