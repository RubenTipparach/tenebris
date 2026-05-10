#include "server/server.h"
#include "core/job_system.h"
#include "core/net_transport.h"
#include "core/planet.h"
#include "core/proto.h"
#include "core/world.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* ------------------------------------------------------------------ */
/* Per-client slot management. The clients[] array is searched
 * linearly — at SERVER_MAX_CLIENTS == 16 this is cheaper than any
 * hashmap and keeps the lifecycle obvious. */
/* ------------------------------------------------------------------ */

static server_client_t* find_free_client(server_t* s) {
    for (int i = 0; i < SERVER_MAX_CLIENTS; ++i) {
        if (s->clients[i].conn == NULL) return &s->clients[i];
    }
    return NULL;
}

static server_client_t* find_client_by_conn(server_t* s, net_conn_t* c) {
    for (int i = 0; i < SERVER_MAX_CLIENTS; ++i) {
        if (s->clients[i].conn == c) return &s->clients[i];
    }
    return NULL;
}

/* ------------------------------------------------------------------ */
/* Handshake. M2 handles HELLO -> WELCOME only; INPUT / PLAYER_CMD /
 * SNAPSHOT / CHUNK_DIFF wiring lands in M4+. Anything other than a
 * well-formed HELLO on an un-handshaked socket closes the conn. */
/* ------------------------------------------------------------------ */

static void send_welcome(server_t* s, server_client_t* cl) {
    const body_config_t* spawn_body = planet_get(BODY_TENEBRIS);
    if (!spawn_body) return;

    msg_welcome_t w = {
        .player_id  = cl->player_id,
        .world_seed = s->cfg.seed,
        .spawn_x    = spawn_body->pos_x,
        .spawn_y    = spawn_body->pos_y + spawn_body->radius_m + 5.0,
        .spawn_z    = spawn_body->pos_z,
        .body_id    = BODY_TENEBRIS,
    };

    uint8_t buf[MSG_HEADER_SIZE + MSG_WELCOME_WIRE_SIZE];
    size_t n = proto_write_welcome(buf, sizeof buf, &w);
    if (n == 0) return;
    net_send(cl->conn, NET_CHANNEL_RELIABLE, buf, n);
    cl->handshaked = true;
    printf("[server] WELCOME -> player_id=%u (spawn body=%u)\n",
           cl->player_id, w.body_id);
    fflush(stdout);
}

static void handle_hello(server_t* s, server_client_t* cl,
                          const uint8_t* payload, size_t len,
                          uint16_t version) {
    if (version != MSG_HELLO_VERSION) {
        fprintf(stderr, "[server] HELLO version %u != %u, closing\n",
                version, MSG_HELLO_VERSION);
        net_close(cl->conn);
        return;
    }
    msg_hello_t h;
    if (proto_read_hello(payload, len, &h) != 0) {
        fprintf(stderr, "[server] malformed HELLO, closing\n");
        net_close(cl->conn);
        return;
    }
    if (h.client_version != TENEBRIS_PROTOCOL_VERSION) {
        fprintf(stderr, "[server] HELLO client_version %u != %u, closing\n",
                h.client_version, TENEBRIS_PROTOCOL_VERSION);
        net_close(cl->conn);
        return;
    }
    printf("[server] HELLO from player_id=%u (client_version=%u)\n",
           cl->player_id, h.client_version);
    send_welcome(s, cl);
}

/* ------------------------------------------------------------------ */
/* Transport callbacks. The transport calls these on the same thread
 * the server tick runs on, so we can mutate server_t directly. */
/* ------------------------------------------------------------------ */

static void on_open(net_conn_t* conn, void* user) {
    server_t* s = (server_t*)user;
    server_client_t* cl = find_free_client(s);
    if (!cl) {
        fprintf(stderr, "[server] max clients reached, closing new conn\n");
        net_close(conn);
        return;
    }
    cl->conn       = conn;
    cl->player_id  = ++s->next_player_id;
    cl->handshaked = false;
    net_conn_set_user(conn, cl);
    printf("[server] open: player_id=%u (slot %ld)\n",
           cl->player_id, (long)(cl - s->clients));
    fflush(stdout);
}

static void on_msg(net_conn_t* conn, net_channel_t ch,
                     const void* data, size_t len, void* user) {
    (void)ch;
    server_t* s = (server_t*)user;
    server_client_t* cl = (server_client_t*)net_conn_user(conn);
    if (!cl) cl = find_client_by_conn(s, conn);
    if (!cl) {
        net_close(conn);
        return;
    }

    msg_hdr_t hdr;
    if (proto_read_header((const uint8_t*)data, len, &hdr) != 0) {
        fprintf(stderr, "[server] short header from player_id=%u, closing\n",
                cl->player_id);
        net_close(conn);
        return;
    }
    if (len < MSG_HEADER_SIZE + hdr.length) {
        fprintf(stderr, "[server] truncated payload from player_id=%u "
                         "(have %zu, need %u), closing\n",
                cl->player_id, len, MSG_HEADER_SIZE + hdr.length);
        net_close(conn);
        return;
    }
    const uint8_t* payload = (const uint8_t*)data + MSG_HEADER_SIZE;

    switch ((msg_kind_t)hdr.kind) {
        case MSG_HELLO:
            handle_hello(s, cl, payload, hdr.length, hdr.version);
            break;
        default:
            /* M2: every other kind is decoded in M3+ once the client
             * actually sends them. Ignore for now rather than close,
             * so future tests against a half-built client still work. */
            printf("[server] ignoring kind=%u from player_id=%u (M2 only handles HELLO)\n",
                   hdr.kind, cl->player_id);
            break;
    }
}

static void on_close(net_conn_t* conn, net_close_reason_t reason, void* user) {
    server_t* s = (server_t*)user;
    server_client_t* cl = find_client_by_conn(s, conn);
    if (!cl) return;
    printf("[server] close: player_id=%u (reason=%d)\n",
           cl->player_id, (int)reason);
    fflush(stdout);
    cl->conn       = NULL;
    cl->player_id  = 0;
    cl->handshaked = false;
}

/* ------------------------------------------------------------------ */
/* Server lifecycle.                                                   */
/* ------------------------------------------------------------------ */

bool server_init(server_t* s, const server_config_t* cfg) {
    memset(s, 0, sizeof(*s));
    s->cfg = *cfg;
    if (s->cfg.tick_hz <= 0.0) s->cfg.tick_hz = 20.0;
    if (s->cfg.log_every_n <= 0) s->cfg.log_every_n = (int)s->cfg.tick_hz;

    job_system_init(0);

    const body_config_t* main_body = planet_get(BODY_TENEBRIS);
    if (!main_body) {
        fprintf(stderr, "[server] planet_get(BODY_TENEBRIS) returned NULL\n");
        return false;
    }
    world_t* main_world = world_create(main_body,
                                         planet_subdivisions_for_radius(main_body->radius_m));
    while (!world_gen_complete(main_world)) {
        world_stream_gen(main_world, main_world->tile_count);
    }
    s->worlds[s->world_count++] = main_world;

    for (int id = BODY_LUNA; id < BODY_COUNT; ++id) {
        if (s->world_count >= SERVER_MAX_BODIES) break;
        const body_config_t* b = planet_get((body_id_t)id);
        if (!b) continue;
        world_t* w = world_create(b, planet_subdivisions_for_radius(b->radius_m));
        while (!world_gen_complete(w)) world_stream_gen(w, w->tile_count);
        s->worlds[s->world_count++] = w;
    }

    printf("[server] init: %d worlds, tick_hz=%.1f, port=%d, saves=%s, seed=%llu\n",
           s->world_count, s->cfg.tick_hz, s->cfg.port,
           s->cfg.saves_dir ? s->cfg.saves_dir : "(none)",
           (unsigned long long)s->cfg.seed);

    net_callbacks_t cb = {
        .on_open  = on_open,
        .on_msg   = on_msg,
        .on_close = on_close,
        .user     = s,
    };
    s->listener = net_listen("0.0.0.0", s->cfg.port, cb);
    if (!s->listener) {
        fprintf(stderr, "[server] failed to bind WebSocket listener on port %d\n",
                s->cfg.port);
        return false;
    }

    fflush(stdout);
    return true;
}

void server_tick(server_t* s) {
    s->tick++;
    /* Drain inbound socket events; callbacks (on_open, on_msg, on_close)
     * fire synchronously from inside net_poll. */
    net_poll(s->listener);
    /* M2: nothing simulates yet. Snapshot loop + physics integration
     * land in M4. */
    if ((s->tick % (uint64_t)s->cfg.log_every_n) == 0) {
        int connected = 0;
        for (int i = 0; i < SERVER_MAX_CLIENTS; ++i) {
            if (s->clients[i].conn) ++connected;
        }
        printf("[server] tick %llu (%d connected)\n",
               (unsigned long long)s->tick, connected);
        fflush(stdout);
    }
}

void server_shutdown(server_t* s) {
    printf("[server] shutdown after %llu ticks\n",
           (unsigned long long)s->tick);
    fflush(stdout);
    if (s->listener) {
        net_close_listener(s->listener);
        s->listener = NULL;
    }
    for (int i = 0; i < s->world_count; ++i) {
        world_destroy(s->worlds[i]);
        s->worlds[i] = NULL;
    }
    s->world_count = 0;
    job_system_shutdown();
}

void server_request_shutdown(server_t* s) {
    s->shutdown_requested = true;
}
