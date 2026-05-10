/*
 * WebSocket backend for the net_transport interface, browser/WASM
 * side. Wraps emscripten's `emscripten/websocket.h` — which itself
 * delegates to the JS WebSocket API — behind the same surface the
 * server speaks to via libwebsockets.
 *
 * Only the *client* half of the interface is implemented here:
 * net_connect, net_poll_client, net_send, net_close. The server-side
 * functions (net_listen, net_poll, net_close_listener) are stubbed
 * with loud failures — a browser can't accept incoming sockets.
 */

#include "core/net_transport.h"
#include <emscripten/websocket.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

struct net_conn_s {
    EMSCRIPTEN_WEBSOCKET_T ws;
    net_callbacks_t        cb;
    void*                  user_data;
    int                    open;
    int                    closed;
};

static EM_BOOL on_open(int event_type,
                         const EmscriptenWebSocketOpenEvent* e,
                         void* user) {
    (void)event_type; (void)e;
    net_conn_t* c = (net_conn_t*)user;
    if (!c) return EM_TRUE;
    c->open = 1;
    if (c->cb.on_open) c->cb.on_open(c, c->cb.user);
    return EM_TRUE;
}

static EM_BOOL on_message(int event_type,
                            const EmscriptenWebSocketMessageEvent* e,
                            void* user) {
    (void)event_type;
    net_conn_t* c = (net_conn_t*)user;
    if (!c || !e) return EM_TRUE;
    /* The server only sends binary frames; ignore any text frames
     * (browsers signal text vs binary on the event itself). */
    if (e->isText) return EM_TRUE;
    if (c->cb.on_msg) {
        c->cb.on_msg(c, NET_CHANNEL_RELIABLE, e->data, (size_t)e->numBytes,
                     c->cb.user);
    }
    return EM_TRUE;
}

static EM_BOOL on_error(int event_type,
                          const EmscriptenWebSocketErrorEvent* e,
                          void* user) {
    (void)event_type; (void)e;
    net_conn_t* c = (net_conn_t*)user;
    if (!c) return EM_TRUE;
    fprintf(stderr, "[net] websocket error\n");
    if (!c->closed && c->cb.on_close) {
        c->closed = 1;
        c->cb.on_close(c, NET_CLOSE_PROTOCOL_ERR, c->cb.user);
    }
    return EM_TRUE;
}

static EM_BOOL on_close(int event_type,
                          const EmscriptenWebSocketCloseEvent* e,
                          void* user) {
    (void)event_type; (void)e;
    net_conn_t* c = (net_conn_t*)user;
    if (!c) return EM_TRUE;
    if (!c->closed && c->cb.on_close) {
        c->closed = 1;
        c->cb.on_close(c, NET_CLOSE_REMOTE_GONE, c->cb.user);
    }
    return EM_TRUE;
}

net_conn_t* net_connect(const char* url, net_callbacks_t cb) {
    if (!url) return NULL;
    if (!emscripten_websocket_is_supported()) {
        fprintf(stderr, "[net] WebSocket not supported by this browser\n");
        return NULL;
    }
    EmscriptenWebSocketCreateAttributes attrs = {
        .url       = url,
        .protocols = NULL,
        .createOnMainThread = EM_TRUE,
    };
    EMSCRIPTEN_WEBSOCKET_T ws = emscripten_websocket_new(&attrs);
    if (ws <= 0) {
        fprintf(stderr, "[net] emscripten_websocket_new failed (%d) for %s\n",
                (int)ws, url);
        return NULL;
    }

    net_conn_t* c = (net_conn_t*)calloc(1, sizeof(*c));
    c->ws = ws;
    c->cb = cb;
    emscripten_websocket_set_onopen_callback   (ws, c, on_open);
    emscripten_websocket_set_onmessage_callback(ws, c, on_message);
    emscripten_websocket_set_onerror_callback  (ws, c, on_error);
    emscripten_websocket_set_onclose_callback  (ws, c, on_close);
    printf("[net] connecting to %s\n", url);
    return c;
}

void net_poll_client(net_conn_t* c) {
    (void)c;
    /* emscripten dispatches WebSocket callbacks straight from the JS
     * event loop on the main thread, so the C side has nothing to
     * drain. The function stays in the API for symmetry with the
     * server-side poll (and for future backends that DO need a pump). */
}

void net_send(net_conn_t* c, net_channel_t ch, const void* data, size_t len) {
    (void)ch;
    if (!c || c->ws <= 0 || !c->open || c->closed || !data || len == 0) return;
    EMSCRIPTEN_RESULT r =
        emscripten_websocket_send_binary(c->ws, (void*)data, (uint32_t)len);
    if (r != EMSCRIPTEN_RESULT_SUCCESS) {
        fprintf(stderr, "[net] send failed (%d)\n", (int)r);
    }
}

void net_close(net_conn_t* c) {
    if (!c || c->ws <= 0 || c->closed) return;
    emscripten_websocket_close(c->ws, 1000, "");
    /* Don't free here — the close callback still needs the conn. The
     * net_client owner frees it after on_close fires. */
}

void* net_conn_user(net_conn_t* c) {
    return c ? c->user_data : NULL;
}

void net_conn_set_user(net_conn_t* c, void* user) {
    if (c) c->user_data = user;
}

/* ------------------------------------------------------------------ */
/* Server-side stubs. A browser can't accept connections. If anything
 * calls these, that's a bug — log loudly and return failure. */
/* ------------------------------------------------------------------ */

net_listener_t* net_listen(const char* bind_addr, int port,
                              net_callbacks_t cb) {
    (void)bind_addr; (void)port; (void)cb;
    fprintf(stderr, "[net] net_listen unavailable in browser build\n");
    return NULL;
}

void net_poll(net_listener_t* listener) { (void)listener; }

void net_close_listener(net_listener_t* listener) { (void)listener; }
