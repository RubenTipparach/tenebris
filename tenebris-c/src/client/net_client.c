#include "client/net_client.h"
#include "core/net_transport.h"
#include "core/proto.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef struct {
    net_client_state_t   state;
    net_conn_t*          conn;
    net_client_welcome_t welcome;
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
        default:
            /* M3 only cares about WELCOME; ignore other kinds so the
             * server can ship newer messages without breaking us. */
            break;
    }
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
