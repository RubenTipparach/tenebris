#ifndef TENEBRIS_CORE_NET_TRANSPORT_H
#define TENEBRIS_CORE_NET_TRANSPORT_H

#include <stddef.h>
#include <stdint.h>

/*
 * Transport-layer interface. The rest of the codebase talks to the
 * network through these calls and never sees a raw socket. v1 ships
 * a WebSocket backend; future backends (WebRTC DataChannel,
 * WebTransport/QUIC) plug in behind the same surface without
 * touching protocol, server, or client logic.
 *
 * Channel kinds:
 *   NET_CHANNEL_RELIABLE   — ordered, retransmits until delivered.
 *                            Use for chunk diffs, chat, handshake.
 *   NET_CHANNEL_UNRELIABLE — unordered, no retransmit, latest-wins.
 *                            Use for snapshots and input.
 *
 * On the WebSocket backend, NET_CHANNEL_UNRELIABLE silently maps to
 * reliable-ordered. Same correctness, no latency win — that's
 * unlocked once a DataChannel backend lands. Code that sends
 * snapshots should still use UNRELIABLE so the swap is a no-op.
 *
 * All callbacks fire from inside net_poll(). The transport is
 * single-threaded by design — keeps the server's tick loop the
 * only writer of game state.
 */

typedef struct net_listener_s net_listener_t;
typedef struct net_conn_s     net_conn_t;

typedef enum {
    NET_CHANNEL_RELIABLE   = 0,
    NET_CHANNEL_UNRELIABLE = 1,
    NET_CHANNEL_COUNT
} net_channel_t;

typedef enum {
    NET_CLOSE_NORMAL       = 0,
    NET_CLOSE_PROTOCOL_ERR = 1,
    NET_CLOSE_TIMEOUT      = 2,
    NET_CLOSE_REMOTE_GONE  = 3,
} net_close_reason_t;

typedef void (*net_on_open_fn) (net_conn_t* conn, void* user);
typedef void (*net_on_msg_fn)  (net_conn_t* conn, net_channel_t ch,
                                  const void* data, size_t len,
                                  void* user);
typedef void (*net_on_close_fn)(net_conn_t* conn,
                                  net_close_reason_t reason,
                                  void* user);

/* Optional HTTP handler. Fires for non-WebSocket GETs on the same
 * port — useful for dashboards / healthchecks. Fill out_body /
 * out_body_len / out_mime, return non-zero on hit, zero for 404.
 * The body pointer must stay valid until the next call. */
typedef int (*net_http_fn)(const char* path,
                            const uint8_t** out_body,
                            size_t* out_body_len,
                            const char** out_mime,
                            void* user);

typedef struct {
    net_on_open_fn  on_open;
    net_on_msg_fn   on_msg;
    net_on_close_fn on_close;
    net_http_fn     on_http;     /* NULL = WebSocket-only listener */
    void*           user;
} net_callbacks_t;

/* Server side: listen on a port for client connections.
 * Returns NULL on bind failure. */
net_listener_t* net_listen(const char* bind_addr, int port,
                             net_callbacks_t cb);

/* Client side: open a connection to a URL.
 * URL form is backend-specific. For the WS backend: "ws://host:port"
 * or "wss://host:port". Returns NULL on immediate failure; the
 * on_open callback fires when the handshake completes. */
net_conn_t* net_connect(const char* url, net_callbacks_t cb);

/* Send a framed message on a channel. The bytes are the proto.h
 * payload (header + body), copied out before send returns.
 * No-op on a closed connection. */
void net_send(net_conn_t* conn, net_channel_t ch,
                const void* data, size_t len);

/* Pump the event loop. On the server: drains accepted sockets,
 * fires callbacks. On the client: drains receive buffer, fires
 * callbacks. Call once per tick. */
void net_poll(net_listener_t* listener);
void net_poll_client(net_conn_t* conn);

/* Tear-down. */
void net_close(net_conn_t* conn);
void net_close_listener(net_listener_t* listener);

/* Opaque accessor for connection user data; backends store the
 * server's per-client state here. */
void* net_conn_user(net_conn_t* conn);
void  net_conn_set_user(net_conn_t* conn, void* user);

#endif
