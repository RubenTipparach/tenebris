/*
 * WebSocket backend for the net_transport interface, server side.
 * Implements net_listen / net_poll / net_send / net_close /
 * net_conn_user against libwebsockets 4.x.
 *
 * Client-side functions (net_connect, net_poll_client) are stubbed
 * here — the browser client gets its own implementation against the
 * JS WebSocket API in client/net_transport_wasm.c (lands in M3).
 *
 * Threading model: the libwebsockets context is single-threaded.
 * net_poll() drives all I/O and fires all callbacks synchronously
 * on the calling thread. Server code can therefore touch game
 * state from inside callbacks with no locking.
 */

#include "core/net_transport.h"
#include <libwebsockets.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* Older libwebsockets (Debian bookworm ships 4.0.20) doesn't define
 * the LWS_PROTOCOL_LIST_TERM convenience macro that 4.1+ does. Fall
 * back to a manually-zeroed terminator with the field count from the
 * 4.x struct definition. */
#ifndef LWS_PROTOCOL_LIST_TERM
#define LWS_PROTOCOL_LIST_TERM { NULL, NULL, 0, 0, 0, NULL, 0 }
#endif

#define NET_SEND_QUEUE_CAP 64

typedef struct send_item_s {
    uint8_t* buf;       /* allocation includes LWS_PRE bytes of slack */
    size_t   len;       /* bytes after LWS_PRE */
} send_item_t;

struct net_conn_s {
    struct lws*      wsi;
    net_listener_t*  owner;
    void*            user_data;

    /* Single-producer / single-consumer ring buffer. Always touched
     * from the libwebsockets thread (== server tick thread). */
    send_item_t      queue[NET_SEND_QUEUE_CAP];
    int              qhead;
    int              qtail;
};

struct net_listener_s {
    struct lws_context* ctx;
    net_callbacks_t     cb;
    int                 port;
};

static int q_empty(const net_conn_t* c) { return c->qhead == c->qtail; }
static int q_next (int i) { return (i + 1) % NET_SEND_QUEUE_CAP; }

static void q_drain_free(net_conn_t* c) {
    while (!q_empty(c)) {
        free(c->queue[c->qhead].buf);
        c->queue[c->qhead].buf = NULL;
        c->qhead = q_next(c->qhead);
    }
}

static int tenebris_callback(struct lws* wsi, enum lws_callback_reasons reason,
                               void* user, void* in, size_t len) {
    net_conn_t* C = (net_conn_t*)user;
    struct lws_context* ctx = lws_get_context(wsi);
    net_listener_t* L = ctx ? (net_listener_t*)lws_context_user(ctx) : NULL;

    switch (reason) {
        case LWS_CALLBACK_ESTABLISHED:
            if (!C) return -1;
            memset(C, 0, sizeof(*C));
            C->wsi = wsi;
            C->owner = L;
            if (L && L->cb.on_open) L->cb.on_open(C, L->cb.user);
            break;

        case LWS_CALLBACK_RECEIVE:
            if (L && L->cb.on_msg) {
                /* All inbound on the WS backend is reliable-ordered.
                 * When a DataChannel backend ships, that one delivers
                 * unreliable on a different channel. */
                L->cb.on_msg(C, NET_CHANNEL_RELIABLE, in, len, L->cb.user);
            }
            break;

        case LWS_CALLBACK_SERVER_WRITEABLE:
            if (!C) return 0;
            while (!q_empty(C)) {
                send_item_t* it = &C->queue[C->qhead];
                int n = lws_write(wsi, it->buf + LWS_PRE, it->len,
                                    LWS_WRITE_BINARY);
                free(it->buf);
                it->buf = NULL;
                C->qhead = q_next(C->qhead);
                if (n < (int)it->len) {
                    /* partial send — bail; lws will retry later */
                    lws_callback_on_writable(wsi);
                    return -1;
                }
            }
            if (!q_empty(C)) lws_callback_on_writable(wsi);
            break;

        case LWS_CALLBACK_CLOSED:
            if (C && L && L->cb.on_close) {
                L->cb.on_close(C, NET_CLOSE_REMOTE_GONE, L->cb.user);
            }
            if (C) q_drain_free(C);
            break;

        default:
            break;
    }
    return 0;
}

/* Single binary subprotocol — the wire format is opaque WS binary frames
 * containing our own length-prefixed msg_hdr_t + payload. We don't
 * negotiate a subprotocol name; the server accepts the default. */
static struct lws_protocols PROTOCOLS[] = {
    {
        .name                  = "tenebris-net",
        .callback              = tenebris_callback,
        .per_session_data_size = sizeof(struct net_conn_s),
        .rx_buffer_size        = 64 * 1024,
        .tx_packet_size        = 64 * 1024,
    },
    LWS_PROTOCOL_LIST_TERM,
};

/* ------------------------------------------------------------------ */
/* Public surface — see core/net_transport.h.                          */
/* ------------------------------------------------------------------ */

net_listener_t* net_listen(const char* bind_addr, int port,
                              net_callbacks_t cb) {
    (void)bind_addr;     /* TODO: honour bind_addr; LWS uses iface name */

    net_listener_t* L = (net_listener_t*)calloc(1, sizeof(*L));
    L->cb = cb;
    L->port = port;

    struct lws_context_creation_info info;
    memset(&info, 0, sizeof info);
    info.port      = port;
    info.protocols = PROTOCOLS;
    info.user      = L;
    info.options   = LWS_SERVER_OPTION_VALIDATE_UTF8;

    L->ctx = lws_create_context(&info);
    if (!L->ctx) {
        fprintf(stderr, "[net] lws_create_context failed (port=%d)\n", port);
        free(L);
        return NULL;
    }
    printf("[net] listening on ws://0.0.0.0:%d\n", port);
    fflush(stdout);
    return L;
}

void net_poll(net_listener_t* listener) {
    if (!listener || !listener->ctx) return;
    /* timeout_ms = 0 → non-blocking; the tick loop owns pacing. */
    lws_service(listener->ctx, 0);
}

void net_close_listener(net_listener_t* L) {
    if (!L) return;
    if (L->ctx) lws_context_destroy(L->ctx);
    free(L);
}

void net_send(net_conn_t* C, net_channel_t ch, const void* data, size_t len) {
    (void)ch;        /* WS backend has only one channel */
    if (!C || !C->wsi || !data || len == 0) return;

    int next = q_next(C->qtail);
    if (next == C->qhead) {
        /* Queue full — drop. In practice this means a slow / stalled
         * peer; better to close than to grow unbounded. */
        fprintf(stderr, "[net] send queue full, dropping %zu bytes\n", len);
        return;
    }

    uint8_t* buf = (uint8_t*)malloc(LWS_PRE + len);
    if (!buf) return;
    memcpy(buf + LWS_PRE, data, len);
    C->queue[C->qtail].buf = buf;
    C->queue[C->qtail].len = len;
    C->qtail = next;

    lws_callback_on_writable(C->wsi);
}

void net_close(net_conn_t* C) {
    if (!C || !C->wsi) return;
    lws_close_reason(C->wsi, LWS_CLOSE_STATUS_NORMAL, NULL, 0);
}

void* net_conn_user(net_conn_t* C) {
    return C ? C->user_data : NULL;
}

void net_conn_set_user(net_conn_t* C, void* user) {
    if (C) C->user_data = user;
}

/* ------------------------------------------------------------------ */
/* Client-side stubs. The WASM client implements these against the
 * browser's WebSocket object in a separate file (M3). On the server
 * binary, no caller ever invokes them. */
/* ------------------------------------------------------------------ */

net_conn_t* net_connect(const char* url, net_callbacks_t cb) {
    (void)url; (void)cb;
    fprintf(stderr, "[net] net_connect is unimplemented on the server-side WS backend\n");
    return NULL;
}

void net_poll_client(net_conn_t* C) {
    (void)C;
    /* No-op; client-side polling happens in the browser. */
}
