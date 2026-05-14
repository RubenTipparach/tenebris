/*
 * WebSocket backend for the net_transport interface, native side.
 * Implements both the server half (net_listen / net_poll) and the
 * client half (net_connect / net_poll_client) on top of
 * libwebsockets 4.x.
 *
 * Same file serves the dedicated server binary AND the native client
 * binary — only the call sites differ. The browser client lives in
 * client/net_transport_wasm.c and bridges to the JS WebSocket API.
 *
 * Threading model: each lws_context is single-threaded. The server
 * has one context shared by all accepted sockets; the client has
 * one context per outbound connection. All callbacks fire from
 * inside the matching net_poll_*() so the calling thread can mutate
 * game state with no locking.
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
    net_listener_t*  owner;        /* NULL on the client side */
    void*            user_data;

    /* Client-only fields. Valid when owner == NULL. */
    net_callbacks_t      client_cb;
    struct lws_context*  client_ctx;
    int                  client_open;         /* CLIENT_ESTABLISHED fired */
    int                  client_close_fired;  /* on_close already ran once */

    /* Outbound queue. Single-producer / single-consumer; always
     * touched from the same lws thread that drives the context. */
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

/* Drain the outbound queue. Called from SERVER_WRITEABLE on the server
 * side and CLIENT_WRITEABLE on the client side — both have identical
 * semantics. Returns -1 if a write failed (caller passes that back to
 * libwebsockets to close the connection), 0 otherwise. */
static int drain_send_queue(struct lws* wsi, net_conn_t* C) {
    while (!q_empty(C)) {
        send_item_t* it = &C->queue[C->qhead];
        int n = lws_write(wsi, it->buf + LWS_PRE, it->len, LWS_WRITE_BINARY);
        free(it->buf);
        it->buf = NULL;
        C->qhead = q_next(C->qhead);
        if (n < (int)it->len) {
            /* partial send -> bail; lws will fire writable again */
            lws_callback_on_writable(wsi);
            return -1;
        }
    }
    if (!q_empty(C)) lws_callback_on_writable(wsi);
    return 0;
}

/* Serve one in-memory HTTP body. Returns -1 on transport error (caller
 * should drop the connection), 0 on success. */
static int serve_http(struct lws* wsi, int status,
                       const char* mime,
                       const uint8_t* body, size_t body_len) {
    unsigned char buf[LWS_PRE + 1024];
    unsigned char* p   = buf + LWS_PRE;
    unsigned char* end = buf + sizeof buf - 1;
    if (lws_add_http_common_headers(wsi, (unsigned int)status, mime,
                                       (unsigned long)body_len, &p, end)) {
        return -1;
    }
    /* CORS - the dashboard lives on github.io while the JSON endpoints
     * are served from fly.dev, so a wildcard origin is required for
     * fetch() to read the response. Read-only, no credentials, so the
     * usual "don't use *" caveats don't bite us.
     *
     * Important: lws_add_http_header_by_name expects the header NAME
     * to include its trailing colon - the function only injects a
     * space between name and value. Without the colon the emitted
     * line is "Access-Control-Allow-Origin *" (no colon, no CRLF
     * framing), which corrupts the HTTP response and trips Fly's
     * edge into 502 Bad Gateway. */
    if (lws_add_http_header_by_name(wsi,
            (const unsigned char*)"Access-Control-Allow-Origin:",
            (const unsigned char*)"*", 1, &p, end) ||
        lws_add_http_header_by_name(wsi,
            (const unsigned char*)"Access-Control-Allow-Methods:",
            (const unsigned char*)"GET, OPTIONS", 12, &p, end) ||
        lws_finalize_write_http_header(wsi, buf + LWS_PRE, &p, end)) {
        return -1;
    }
    if (body_len > 0 && body) {
        /* Small dashboard payloads only; chunked writes would be needed
         * for blobs above a few KB. */
        uint8_t* out = (uint8_t*)malloc(LWS_PRE + body_len);
        if (!out) return -1;
        memcpy(out + LWS_PRE, body, body_len);
        int n = lws_write(wsi, out + LWS_PRE, body_len, LWS_WRITE_HTTP_FINAL);
        free(out);
        if (n < (int)body_len) return -1;
    }
    if (lws_http_transaction_completed(wsi)) return -1;
    return 0;
}

static int tenebris_callback(struct lws* wsi, enum lws_callback_reasons reason,
                               void* user, void* in, size_t len) {
    net_conn_t* C = (net_conn_t*)user;
    struct lws_context* ctx = lws_get_context(wsi);
    net_listener_t* L = ctx ? (net_listener_t*)lws_context_user(ctx) : NULL;

    switch (reason) {
        /* -------- Server-side events -------- */
        case LWS_CALLBACK_HTTP: {
            if (!L || !L->cb.on_http) {
                /* No dashboard registered — return a friendly text line
                 * so Fly's health check sees a 200 instead of a default
                 * 404. */
                static const char msg[] =
                    "tenebris-server is alive (WebSocket-only by default)\n";
                return serve_http(wsi, 200, "text/plain; charset=utf-8",
                                    (const uint8_t*)msg, sizeof msg - 1);
            }
            /* `in` carries the URL PATH only - libwebsockets parks the
             * query string in the WSI_TOKEN_HTTP_URI_ARGS header.
             *
             * Each `key=value` pair is stored as a separate fragment.
             * lws_hdr_copy *does* concatenate them, but it does so with
             * COMMAS between fragments (which is what HTTP allows for
             * generic multi-value headers). That breaks query-string
             * parsing: a request like `?text=hi&room=T9VVPW` would come
             * out as `text=hi,room=T9VVPW`, and the room field would
             * vanish into the text field while my `&`-splitting parser
             * found no room key.
             *
             * Iterate fragments with lws_hdr_copy_fragment instead and
             * rejoin them with the standard `&` so the caller sees a
             * normal query string. */
            const char* raw_path = (const char*)in;
            char full[1024];
            char args[768];
            size_t args_off = 0;
            args[0] = 0;
            for (int fi = 0; fi < 32; ++fi) {
                char frag[256];
                int fn = lws_hdr_copy_fragment(wsi, frag, sizeof frag,
                                                  WSI_TOKEN_HTTP_URI_ARGS, fi);
                if (fn <= 0) break;
                if (args_off > 0 && args_off + 1 < sizeof args) {
                    args[args_off++] = '&';
                }
                if (args_off + (size_t)fn + 1 >= sizeof args) break;
                memcpy(args + args_off, frag, (size_t)fn);
                args_off += (size_t)fn;
                args[args_off] = 0;
            }
            if (args_off > 0) {
                int n = snprintf(full, sizeof full, "%s?%s", raw_path, args);
                if (n > 0 && n < (int)sizeof full) raw_path = full;
            }
            const char* path = raw_path;
            const uint8_t* body = NULL;
            size_t body_len = 0;
            const char* mime = "text/plain";
            int hit = L->cb.on_http(path, &body, &body_len, &mime, L->cb.user);
            if (!hit) {
                static const char notfound[] = "404\n";
                return serve_http(wsi, 404, "text/plain",
                                    (const uint8_t*)notfound, sizeof notfound - 1);
            }
            return serve_http(wsi, 200, mime, body, body_len);
        }

        case LWS_CALLBACK_ESTABLISHED:
            if (!C) return -1;
            memset(C, 0, sizeof(*C));
            C->wsi = wsi;
            C->owner = L;
            if (L && L->cb.on_open) L->cb.on_open(C, L->cb.user);
            break;

        case LWS_CALLBACK_RECEIVE:
            if (C && C->owner && C->owner->cb.on_msg) {
                /* All inbound on the WS backend is reliable-ordered. A
                 * future DataChannel backend will deliver unreliable on
                 * its own channel. */
                C->owner->cb.on_msg(C, NET_CHANNEL_RELIABLE, in, len,
                                     C->owner->cb.user);
            }
            break;

        case LWS_CALLBACK_SERVER_WRITEABLE:
            if (!C) return 0;
            return drain_send_queue(wsi, C);

        case LWS_CALLBACK_CLOSED:
            if (C && C->owner && C->owner->cb.on_close) {
                C->owner->cb.on_close(C, NET_CLOSE_REMOTE_GONE,
                                       C->owner->cb.user);
            }
            if (C) q_drain_free(C);
            break;

        /* -------- Client-side events --------
         * For client connections lws_client_connect_info.userdata points
         * the per-session `user` arg at our pre-allocated net_conn_t,
         * so `C` is already valid here. */
        case LWS_CALLBACK_CLIENT_ESTABLISHED:
            if (!C) break;
            C->wsi = wsi;
            C->client_open = 1;
            if (C->client_cb.on_open)
                C->client_cb.on_open(C, C->client_cb.user);
            break;

        case LWS_CALLBACK_CLIENT_RECEIVE:
            if (C && C->client_cb.on_msg) {
                C->client_cb.on_msg(C, NET_CHANNEL_RELIABLE, in, len,
                                      C->client_cb.user);
            }
            break;

        case LWS_CALLBACK_CLIENT_WRITEABLE:
            if (!C) return 0;
            return drain_send_queue(wsi, C);

        case LWS_CALLBACK_CLIENT_CONNECTION_ERROR:
            if (C && !C->client_close_fired) {
                C->client_close_fired = 1;
                if (C->client_cb.on_close)
                    C->client_cb.on_close(C, NET_CLOSE_PROTOCOL_ERR,
                                           C->client_cb.user);
            }
            if (C) {
                C->wsi = NULL;
                q_drain_free(C);
            }
            return -1;

        case LWS_CALLBACK_CLIENT_CLOSED:
            /* Single-fire guard: this can run from a remote drop (via
             * net_poll_client -> lws_service) OR from net_close (via
             * lws_context_destroy). We only want one user on_close. */
            if (C && !C->client_close_fired) {
                C->client_close_fired = 1;
                if (C->client_cb.on_close)
                    C->client_cb.on_close(C, NET_CLOSE_REMOTE_GONE,
                                           C->client_cb.user);
            }
            if (C) {
                C->wsi = NULL;
                q_drain_free(C);
            }
            break;

        default:
            break;
    }
    return 0;
}

/* Two protocol entries that share a callback. The server entry has
 * per_session_data_size = sizeof(net_conn_s) so lws allocates the
 * conn on accept. The client entry has per_session_data_size = 0 so
 * we can pre-allocate the conn in net_connect() and hand it to lws
 * via i.userdata — net_connect needs to return the conn before
 * CLIENT_ESTABLISHED fires. */
static struct lws_protocols PROTOCOLS[] = {
    {
        .name                  = "tenebris-net",
        .callback              = tenebris_callback,
        .per_session_data_size = sizeof(struct net_conn_s),
        .rx_buffer_size        = 64 * 1024,
        .tx_packet_size        = 64 * 1024,
    },
    {
        .name                  = "tenebris-net-client",
        .callback              = tenebris_callback,
        .per_session_data_size = 0,
        .rx_buffer_size        = 64 * 1024,
        .tx_packet_size        = 64 * 1024,
    },
    LWS_PROTOCOL_LIST_TERM,
};

/* ------------------------------------------------------------------ */
/* Server surface — see core/net_transport.h.                          */
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
    /* timeout_ms = 0 -> non-blocking; the tick loop owns pacing. */
    lws_service(listener->ctx, 0);
}

void net_close_listener(net_listener_t* L) {
    if (!L) return;
    if (L->ctx) lws_context_destroy(L->ctx);
    free(L);
}

/* ------------------------------------------------------------------ */
/* Client surface.                                                     */
/* ------------------------------------------------------------------ */

/* Tiny URL splitter — accepts ws://host[:port][/path] or wss://...
 * Writes host into `out_host`, the integer port into `*out_port`, the
 * path into `out_path`, and `*out_ssl` to 1 for wss. Returns 0 on
 * success, -1 on parse failure.
 *
 * Deliberately limited: no userinfo, no query string, no IPv6 brackets.
 * Good enough for the deployment URLs Tenebris actually uses. */
static int parse_ws_url(const char* url,
                          char* out_host, size_t host_cap,
                          int* out_port,
                          char* out_path, size_t path_cap,
                          int* out_ssl) {
    if (!url) return -1;
    const char* p = url;
    int ssl = 0;
    if (strncmp(p, "wss://", 6) == 0) { ssl = 1; p += 6; }
    else if (strncmp(p, "ws://", 5) == 0) { ssl = 0; p += 5; }
    else return -1;

    const char* host_start = p;
    const char* host_end   = p;
    while (*host_end && *host_end != ':' && *host_end != '/') ++host_end;
    size_t hlen = (size_t)(host_end - host_start);
    if (hlen == 0 || hlen + 1 > host_cap) return -1;
    memcpy(out_host, host_start, hlen);
    out_host[hlen] = 0;

    int port = ssl ? 443 : 80;
    if (*host_end == ':') {
        port = atoi(host_end + 1);
        while (*host_end && *host_end != '/') ++host_end;
    }
    *out_port = port;
    *out_ssl  = ssl;

    /* Path. Default to "/" if absent. lws wants a leading slash. */
    if (*host_end == '/') {
        size_t plen = strlen(host_end);
        if (plen + 1 > path_cap) return -1;
        memcpy(out_path, host_end, plen + 1);
    } else {
        if (path_cap < 2) return -1;
        out_path[0] = '/'; out_path[1] = 0;
    }
    return 0;
}

net_conn_t* net_connect(const char* url, net_callbacks_t cb) {
    if (!url) return NULL;
    char host[256], path[256];
    int port = 0, ssl = 0;
    if (parse_ws_url(url, host, sizeof host, &port, path, sizeof path, &ssl) != 0) {
        fprintf(stderr, "[net] bad client URL: %s\n", url);
        return NULL;
    }

    net_conn_t* C = (net_conn_t*)calloc(1, sizeof(*C));
    if (!C) return NULL;
    C->client_cb = cb;

    struct lws_context_creation_info info;
    memset(&info, 0, sizeof info);
    info.port      = CONTEXT_PORT_NO_LISTEN;
    info.protocols = PROTOCOLS;
    info.user      = NULL;          /* server-only field */
    /* Pull in the system trust store so wss:// works. Cheap on Linux/
     * macOS, no-op on Windows builds that don't link OpenSSL. */
    info.options   = LWS_SERVER_OPTION_DO_SSL_GLOBAL_INIT;

    C->client_ctx = lws_create_context(&info);
    if (!C->client_ctx) {
        fprintf(stderr, "[net] lws_create_context (client) failed for %s\n", url);
        free(C);
        return NULL;
    }

    struct lws_client_connect_info ccinfo;
    memset(&ccinfo, 0, sizeof ccinfo);
    ccinfo.context        = C->client_ctx;
    ccinfo.address        = host;
    ccinfo.port           = port;
    ccinfo.path           = path;
    ccinfo.host           = host;
    ccinfo.origin         = host;
    ccinfo.protocol       = "tenebris-net-client";
    ccinfo.ssl_connection = ssl ? LCCSCF_USE_SSL : 0;
    ccinfo.userdata       = C;     /* becomes `user` in the callback */

    C->wsi = lws_client_connect_via_info(&ccinfo);
    if (!C->wsi) {
        fprintf(stderr, "[net] lws_client_connect_via_info failed for %s\n", url);
        lws_context_destroy(C->client_ctx);
        free(C);
        return NULL;
    }
    printf("[net] connecting to %s (host=%s port=%d ssl=%d)\n",
           url, host, port, ssl);
    return C;
}

void net_poll_client(net_conn_t* C) {
    if (!C || !C->client_ctx) return;
    lws_service(C->client_ctx, 0);
    /* If the wsi got closed during this service tick (remote drop or
     * error), tear down the now-empty context so subsequent ticks
     * don't burn CPU on nothing. The conn struct stays — caller still
     * owns it and must call net_close to free. */
    if (C->client_close_fired && C->wsi == NULL && C->client_ctx) {
        lws_context_destroy(C->client_ctx);
        C->client_ctx = NULL;
    }
}

/* ------------------------------------------------------------------ */
/* Shared surface.                                                     */
/* ------------------------------------------------------------------ */

void net_send(net_conn_t* C, net_channel_t ch, const void* data, size_t len) {
    (void)ch;        /* WS backend has only one channel */
    if (!C || !C->wsi || !data || len == 0) return;

    int next = q_next(C->qtail);
    if (next == C->qhead) {
        /* Queue full -> drop. In practice this means a slow / stalled
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
    if (!C) return;
    if (C->owner) {
        /* Server-side conn: signal close; lws frees the per-session
         * struct via CALLBACK_CLOSED. */
        if (C->wsi) lws_close_reason(C->wsi, LWS_CLOSE_STATUS_NORMAL, NULL, 0);
        return;
    }
    /* Client-side conn. net_close fully tears down: signal close,
     * destroy the context (which fires CLIENT_CLOSED -> user on_close
     * if it hasn't already), free outbound queue, free the conn.
     *
     * After this returns, the C pointer is invalid; callers must
     * null their copy.
     *
     * Re-entry guard: lws_context_destroy calls the user's on_close
     * synchronously, and if that handler decides to call net_close
     * again we'd recurse into a half-destroyed context. Clear the
     * ctx field first so the inner call sees nothing to do. */
    if (C->client_ctx == NULL) return;
    struct lws_context* ctx = C->client_ctx;
    C->client_ctx = NULL;
    if (C->wsi) {
        lws_close_reason(C->wsi, LWS_CLOSE_STATUS_NORMAL, NULL, 0);
    }
    lws_context_destroy(ctx);
    q_drain_free(C);
    free(C);
}

void* net_conn_user(net_conn_t* C) {
    return C ? C->user_data : NULL;
}

void net_conn_set_user(net_conn_t* C, void* user) {
    if (C) C->user_data = user;
}
