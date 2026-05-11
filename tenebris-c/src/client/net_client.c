#include "client/net_client.h"
#include "client/remote_players.h"
#include "core/net_transport.h"
#include "core/proto.h"

#include "sokol_time.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef struct {
    net_client_state_t   state;
    net_conn_t*          conn;
    net_client_welcome_t welcome;
    /* Most recent DESYNC notice from the server. last_desync_time is
     * a sokol_time stamp (0 = never). The HUD compares against
     * stm_now() and fades the warning out after a few seconds. */
    net_desync_kind_t    last_desync;
    uint32_t             last_desync_block;
    uint64_t             last_desync_time;
} net_client_t;

static net_client_t C;

/* ------------------------------------------------------------------ */
/* Transport callbacks. The transport's poll fires these on the main
 * thread (browser) or the tick thread (native loopback), so we can
 * mutate C directly. */
/* ------------------------------------------------------------------ */

static void send_hello(void) {
    msg_hello_t h = { 0 };
    h.client_version = TENEBRIS_PROTOCOL_VERSION;
    /* token is zeroed for now — auth lives in the post-M9 backlog. */
    uint8_t buf[MSG_HEADER_SIZE + MSG_HELLO_WIRE_SIZE];
    size_t n = proto_write_hello(buf, sizeof buf, &h);
    if (n == 0) return;
    net_send(C.conn, NET_CHANNEL_RELIABLE, buf, n);
    C.state = NET_CLIENT_HANDSHAKE;
    printf("[net-client] HELLO sent\n");
}

static void on_open(net_conn_t* conn, void* user) {
    (void)conn; (void)user;
    printf("[net-client] socket open\n");
    send_hello();
}

static void on_msg(net_conn_t* conn, net_channel_t ch,
                     const void* data, size_t len, void* user) {
    (void)conn; (void)ch; (void)user;

    msg_hdr_t hdr;
    if (proto_read_header((const uint8_t*)data, len, &hdr) != 0) {
        fprintf(stderr, "[net-client] short header (%zu bytes)\n", len);
        return;
    }
    if (len < MSG_HEADER_SIZE + hdr.length) {
        fprintf(stderr, "[net-client] truncated payload (have %zu, need %u)\n",
                len, MSG_HEADER_SIZE + hdr.length);
        return;
    }
    const uint8_t* payload = (const uint8_t*)data + MSG_HEADER_SIZE;

    switch ((msg_kind_t)hdr.kind) {
        case MSG_WELCOME: {
            if (hdr.version != MSG_WELCOME_VERSION) {
                fprintf(stderr, "[net-client] WELCOME version %u != %u\n",
                        hdr.version, MSG_WELCOME_VERSION);
                C.state = NET_CLIENT_ERROR;
                return;
            }
            msg_welcome_t w;
            if (proto_read_welcome(payload, hdr.length, &w) != 0) {
                fprintf(stderr, "[net-client] malformed WELCOME\n");
                C.state = NET_CLIENT_ERROR;
                return;
            }
            C.welcome.player_id   = w.player_id;
            C.welcome.world_seed  = w.world_seed;
            C.welcome.spawn_x     = w.spawn_x;
            C.welcome.spawn_y     = w.spawn_y;
            C.welcome.spawn_z     = w.spawn_z;
            C.welcome.body_id     = w.body_id;
            C.state = NET_CLIENT_READY;
            printf("[net-client] READY: player_id=%u seed=%llu "
                   "spawn=(%.2f, %.2f, %.2f) body=%u\n",
                   w.player_id, (unsigned long long)w.world_seed,
                   w.spawn_x, w.spawn_y, w.spawn_z, w.body_id);
            break;
        }
        case MSG_DESYNC: {
            if (hdr.version != MSG_DESYNC_VERSION) break;
            msg_desync_t d;
            if (proto_read_desync(payload, hdr.length, &d) != 0) break;
            C.last_desync       = (net_desync_kind_t)d.reason;
            C.last_desync_block = d.block_type;
            C.last_desync_time  = stm_now();
            /* Loud console line — emscripten pipes printf to console.log,
             * so this lands in browser devtools. Two messages so it's
             * easy to spot among the rest of the per-frame chatter. */
            fprintf(stderr,
                    "============================================================\n"
                    "[DESYNC] server rejected pose at (%.1f, %.1f, %.1f)\n"
                    "         reason=%u  body=%u  block=%u\n"
                    "============================================================\n",
                    d.client_pos_x, d.client_pos_y, d.client_pos_z,
                    (unsigned)d.reason, (unsigned)d.body_id,
                    (unsigned)d.block_type);
            break;
        }
        case MSG_SNAPSHOT: {
            if (hdr.version != MSG_SNAPSHOT_VERSION) break;
            msg_snapshot_t snap;
            if (proto_read_snapshot(payload, hdr.length, &snap) != 0) {
                fprintf(stderr, "[net-client] malformed SNAPSHOT\n");
                break;
            }
            remote_player_t out[REMOTE_PLAYERS_MAX];
            int n_out = 0;
            for (int i = 0; i < snap.player_count; ++i) {
                const msg_snapshot_entry_t* e = &snap.players[i];
                /* Skip the local player so we don't draw our own
                 * marker on top of the camera. */
                if (e->player_id == C.welcome.player_id) continue;
                if (n_out >= REMOTE_PLAYERS_MAX) break;
                remote_player_t* r = &out[n_out++];
                r->player_id = e->player_id;
                r->body_id   = e->body_id;
                r->pos.x     = e->pos_x;
                r->pos.y     = e->pos_y;
                r->pos.z     = e->pos_z;
                r->yaw       = e->yaw;
                r->pitch     = e->pitch;
                r->active    = true;
            }
            remote_players_set_from_snapshot(out, n_out);
            /* Diagnostic: log every ~5 s (33 snapshots at 6.7 Hz) so
             * we can confirm the server's sending us peers. Quiet
             * enough not to drown out real warnings. */
            static uint64_t snap_recv = 0;
            if ((++snap_recv % 33) == 0) {
                printf("[net-client] snapshot #%llu: %u entries (kept %d remote)\n",
                       (unsigned long long)snap_recv,
                       (unsigned)snap.player_count, n_out);
            }
            break;
        }
        default:
            /* Ignore unknown kinds so the server can ship new ones
             * without breaking us. */
            break;
    }
}

void net_client_send_player_state(uint32_t client_tick,
                                    uint32_t body_id,
                                    double pos_x, double pos_y, double pos_z,
                                    float yaw, float pitch) {
    if (C.state != NET_CLIENT_READY || !C.conn) return;
    msg_player_state_t st = {
        .client_tick = client_tick,
        .body_id     = body_id,
        .pos_x       = pos_x,
        .pos_y       = pos_y,
        .pos_z       = pos_z,
        .yaw         = yaw,
        .pitch       = pitch,
        .buttons     = 0,
        .reserved    = 0,
    };
    uint8_t buf[MSG_HEADER_SIZE + MSG_PLAYER_STATE_WIRE_SIZE];
    size_t n = proto_write_player_state(buf, sizeof buf, &st);
    if (n == 0) return;
    net_send(C.conn, NET_CHANNEL_UNRELIABLE, buf, n);
}

static void on_close(net_conn_t* conn, net_close_reason_t reason, void* user) {
    (void)conn; (void)user;
    printf("[net-client] socket closed (reason=%d)\n", (int)reason);
    C.state = NET_CLIENT_ERROR;
}

/* ------------------------------------------------------------------ */
/* Public surface.                                                     */
/* ------------------------------------------------------------------ */

void net_client_connect(const char* url) {
    if (!url) return;
    if (C.conn) return;     /* already connected / connecting */

    memset(&C, 0, sizeof C);
    C.state = NET_CLIENT_CONNECTING;

    net_callbacks_t cb = {
        .on_open  = on_open,
        .on_msg   = on_msg,
        .on_close = on_close,
        .user     = NULL,
    };
    C.conn = net_connect(url, cb);
    if (!C.conn) {
        fprintf(stderr, "[net-client] net_connect(%s) failed\n", url);
        C.state = NET_CLIENT_ERROR;
        return;
    }
    printf("[net-client] connecting to %s\n", url);
}

void net_client_tick(void) {
    if (C.conn) net_poll_client(C.conn);
}

void net_client_disconnect(void) {
    if (!C.conn) return;
    net_close(C.conn);
    C.conn  = NULL;
    C.state = NET_CLIENT_IDLE;
}

net_client_state_t          net_client_state  (void) { return C.state; }
const net_client_welcome_t* net_client_welcome(void) { return &C.welcome; }

net_desync_kind_t net_client_last_desync(double* out_seconds_ago,
                                            uint32_t* out_block_type) {
    if (out_block_type) *out_block_type = C.last_desync_block;
    if (out_seconds_ago) {
        *out_seconds_ago = (C.last_desync_time == 0)
            ? -1.0
            : stm_sec(stm_diff(stm_now(), C.last_desync_time));
    }
    return C.last_desync;
}
