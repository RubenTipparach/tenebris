#include "server/server.h"
#include "core/blocks.h"
#include "core/job_system.h"
#include "core/math.h"
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
/* Sanity check on incoming PLAYER_STATE. The server doesn't run player
 * physics yet, but it can spot "you're inside a wall" — a clear sign
 * of client/server worldgen drift, a chunk-update race, or a trivial
 * teleport-cheat. Throttled to once per second per client; the client
 * decides what to do with the DESYNC message (currently: HUD warning). */
/* ------------------------------------------------------------------ */

static void check_for_desync(server_t* s, server_client_t* cl) {
    /* DESYNC popup is disabled for now — the naive 'is the player
     * inside a solid block?' check fires for normally-grounded
     * players because player.position is the FEET anchor and a
     * grounded player's feet sit right at the surface grass block.
     * A real check needs to sample at head height (+1.6 m along the
     * surface normal). Until that lands, just no-op so we don't
     * spam the HUD. */
    (void)s; (void)cl;
    return;

    /* Disabled body, kept here so the eventual head-height fix is a
     * one-line edit (move the early return + tweak body_local to add
     * 1.6 m up the surface normal). #if 0 keeps the linker / dead
     * code analysers happy without making the function look bare. */
#if 0
    world_t* w = NULL;
    for (int i = 0; i < s->world_count; ++i) {
        world_t* candidate = s->worlds[i];
        if (candidate && candidate->body &&
            (uint32_t)candidate->body->id == cl->body_id) {
            w = candidate; break;
        }
    }
    if (!w || !w->body) return;     /* unknown body — skip silently */

    /* world_block_at_pos takes body-local float coords. The wire pos is
     * world-space dvec; subtract the body's centre and downcast. */
    vec3_t body_local = {
        (float)(cl->pos_x - w->body->pos_x),
        (float)(cl->pos_y - w->body->pos_y),
        (float)(cl->pos_z - w->body->pos_z),
    };
    block_t b = world_block_at_pos(w, body_local, -1);
    if (!block_is_solid(b)) return;

    msg_desync_t d = {
        .reason       = DESYNC_INSIDE_SOLID,
        .body_id      = cl->body_id,
        .client_pos_x = cl->pos_x,
        .client_pos_y = cl->pos_y,
        .client_pos_z = cl->pos_z,
        .block_type   = (uint32_t)b,
    };
    uint8_t buf[MSG_HEADER_SIZE + MSG_DESYNC_WIRE_SIZE];
    size_t n = proto_write_desync(buf, sizeof buf, &d);
    if (n == 0) return;
    net_send(cl->conn, NET_CHANNEL_RELIABLE, buf, n);
    cl->last_desync_tick = s->tick;
    printf("[server] DESYNC sent to player_id=%u: inside block=%u at (%.1f, %.1f, %.1f)\n",
           cl->player_id, (unsigned)b, cl->pos_x, cl->pos_y, cl->pos_z);
#endif
}

/* ------------------------------------------------------------------ */
/* Handshake. M2 handles HELLO -> WELCOME; M4 adds PLAYER_STATE. */
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
        case MSG_PLAYER_CMD: {
            if (hdr.version != MSG_PLAYER_CMD_VERSION) break;
            msg_player_cmd_t cmd;
            if (proto_read_player_cmd(payload, hdr.length, &cmd) != 0) break;
            /* Find the world for the claimed body. Trust-the-client
             * model: no anti-cheat here, just resolve + apply. */
            world_t* w = NULL;
            for (int j = 0; j < s->world_count; ++j) {
                world_t* candidate = s->worlds[j];
                if (candidate && candidate->body &&
                    (uint32_t)candidate->body->id == cmd.body_id) {
                    w = candidate; break;
                }
            }
            if (!w) {
                fprintf(stderr, "[server] PLAYER_CMD unknown body=%u from player_id=%u\n",
                        cmd.body_id, cl->player_id);
                break;
            }
            /* PLACE = whatever block_type the client sent.
             * BREAK  = force BLOCK_AIR regardless of block_type. */
            block_t target = (cmd.cmd_kind == PLAYER_CMD_BREAK)
                ? BLOCK_AIR : (block_t)cmd.block_type;
            world_set(w, (int)cmd.tile_idx, (int)cmd.depth, target);

            /* Broadcast as a single-entry CHUNK_DIFF to everyone,
             * including the sender (idempotent — they already applied
             * locally). */
            msg_chunk_diff_t diff = { 0 };
            diff.body_id    = cmd.body_id;
            diff.edit_count = 1;
            diff.edits[0].tile_idx   = cmd.tile_idx;
            diff.edits[0].depth      = cmd.depth;
            diff.edits[0].block_type = (uint16_t)target;
            uint8_t buf[MSG_HEADER_SIZE + MSG_CHUNK_DIFF_HEADER_SIZE
                        + MSG_CHUNK_DIFF_ENTRY_SIZE];
            size_t n = proto_write_chunk_diff(buf, sizeof buf, &diff);
            if (n > 0) {
                for (int j = 0; j < SERVER_MAX_CLIENTS; ++j) {
                    if (s->clients[j].conn)
                        net_send(s->clients[j].conn,
                                   NET_CHANNEL_RELIABLE, buf, n);
                }
            }
            break;
        }
        case MSG_PLAYER_STATE: {
            if (hdr.version != MSG_PLAYER_STATE_VERSION) {
                fprintf(stderr, "[server] PLAYER_STATE version %u != %u, closing\n",
                        hdr.version, MSG_PLAYER_STATE_VERSION);
                net_close(conn);
                return;
            }
            msg_player_state_t st;
            if (proto_read_player_state(payload, hdr.length, &st) != 0) {
                fprintf(stderr, "[server] malformed PLAYER_STATE\n");
                return;
            }
            /* Drop out-of-order packets — keep only the freshest pose. */
            if (cl->has_state && st.client_tick <= cl->last_client_tick) break;
            bool first = !cl->has_state;
            cl->has_state        = true;
            cl->body_id          = st.body_id;
            cl->pos_x            = st.pos_x;
            cl->pos_y            = st.pos_y;
            cl->pos_z            = st.pos_z;
            cl->yaw              = st.yaw;
            cl->pitch            = st.pitch;
            cl->last_client_tick = st.client_tick;
            if (first) {
                printf("[server] first PLAYER_STATE from player_id=%u at "
                       "(%.1f, %.1f, %.1f) body=%u\n",
                       cl->player_id, st.pos_x, st.pos_y, st.pos_z, st.body_id);
                fflush(stdout);
            }
            check_for_desync(s, cl);
            break;
        }
        default:
            /* Unknown / not-yet-implemented kinds: log and skip rather
             * than disconnect, so the client can ship new messages
             * before the server learns about them. */
            printf("[server] ignoring kind=%u from player_id=%u\n",
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

static void broadcast_snapshot(server_t* s) {
    /* Gather every handshaked client with at least one reported pose
     * into one SNAPSHOT, then send the same blob to every connection.
     * O(N) on N = max clients; trivial at the M4 scale. */
    msg_snapshot_t snap = { 0 };
    snap.server_tick = (uint32_t)s->tick;
    for (int i = 0; i < SERVER_MAX_CLIENTS; ++i) {
        const server_client_t* cl = &s->clients[i];
        if (!cl->conn || !cl->has_state) continue;
        if (snap.player_count >= SNAPSHOT_MAX_PLAYERS) break;
        msg_snapshot_entry_t* e = &snap.players[snap.player_count++];
        e->player_id = cl->player_id;
        e->body_id   = cl->body_id;
        e->pos_x     = cl->pos_x;
        e->pos_y     = cl->pos_y;
        e->pos_z     = cl->pos_z;
        e->yaw       = cl->yaw;
        e->pitch     = cl->pitch;
    }
    if (snap.player_count == 0) return;

    static uint8_t buf[MSG_HEADER_SIZE + MSG_SNAPSHOT_HEADER_SIZE
                       + SNAPSHOT_MAX_PLAYERS * MSG_SNAPSHOT_ENTRY_SIZE];
    size_t n = proto_write_snapshot(buf, sizeof buf, &snap);
    if (n == 0) return;
    int sent = 0;
    for (int i = 0; i < SERVER_MAX_CLIENTS; ++i) {
        const server_client_t* cl = &s->clients[i];
        if (cl->conn) { net_send(cl->conn, NET_CHANNEL_UNRELIABLE, buf, n); ++sent; }
    }
    /* Heartbeat log every ~5 s (33 broadcasts at 6.7 Hz) so the Fly
     * log isn't drowned in snapshot spam but we can still confirm
     * delivery from the server side. */
    static uint64_t snap_count = 0;
    if ((++snap_count % 33) == 0) {
        printf("[server] snapshot #%llu: %u players, sent to %d conns\n",
               (unsigned long long)snap_count, snap.player_count, sent);
        fflush(stdout);
    }
}

void server_tick(server_t* s) {
    s->tick++;
    /* Drain inbound socket events; callbacks (on_open, on_msg, on_close)
     * fire synchronously from inside net_poll. */
    net_poll(s->listener);

    /* M4 (position relay): broadcast every 3rd tick. At 20 Hz that's
     * ~6.7 snapshots/sec — visibly smooth with client-side interp
     * landing in a follow-up. */
    if ((s->tick % 3) == 0) broadcast_snapshot(s);

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
