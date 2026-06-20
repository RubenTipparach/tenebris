//! Port of `tenebris-c/src/server/net_transport_ws.c` plus the
//! interface it implements, `tenebris-c/src/core/net_transport.h`.
//!
//! libwebsockets is replaced by tokio + tokio-tungstenite, but the
//! observable behavior and the API shape the server loop sees are
//! preserved 1:1.
//!
//! # Threading model mapping
//!
//! The C transport is single-threaded poll-based: `server_tick()`
//! calls `net_poll()` which runs `lws_service(ctx, 0)` (non-blocking)
//! and fires `on_open` / `on_msg` / `on_close` / `on_http` callbacks
//! synchronously on the tick thread.
//!
//! The Rust port runs a private tokio runtime (one worker thread) in
//! the background. Socket I/O happens there; every event is pushed
//! into an unbounded queue. [`NetListener::poll`] drains that queue
//! on the caller's thread, so - exactly like `lws_service` - the
//! server tick remains the only place game state is touched. The C
//! callback struct becomes the [`NetEvent`] enum returned by `poll`.
//!
//! # Name mapping (C -> Rust)
//!
//! - `net_listener_t*` / `net_listen` -> [`NetListener`] / [`NetListener::listen`]
//! - `net_poll`                       -> [`NetListener::poll`] (returns events instead of firing callbacks)
//! - `net_send` (server conn)         -> [`NetListener::send`]
//! - `net_close` (server conn)        -> [`NetListener::close_conn`]
//! - `net_close_listener`             -> [`NetListener::close`] / `Drop`
//! - `net_conn_t*` (server side)      -> [`ConnId`] (opaque u64 token)
//! - `net_conn_user` / `net_conn_set_user` -> not ported; `ConnId` is
//!   `Copy + Eq + Hash`, so the server keys its per-client state on it
//!   directly instead of stashing a pointer inside the transport.
//! - `net_callbacks_t.on_http != NULL` -> the `http_handler` flag of
//!   [`NetListener::listen`]; HTTP hits surface as [`NetEvent::Http`]
//!   carrying an [`HttpRequest`] responder.
//! - `net_connect` / `net_poll_client` / client `net_send` /
//!   client `net_close` -> [`NetClient`] (`connect` / `poll` / `send`
//!   / `close`). Used by the future native-client port; kept here
//!   because the C file carries both halves.
//!
//! # Behavior parity notes
//!
//! - Bind: server.c calls `net_listen("0.0.0.0", cfg.port, ...)`
//!   (default port 8080, `--port` flag). C ignored `bind_addr` (lws
//!   TODO) and always bound all interfaces; the Rust port honors the
//!   argument - identical behavior for the real call site, and tests
//!   can bind 127.0.0.1 on an ephemeral port.
//! - Subprotocols: C registers "tenebris-net" and
//!   "tenebris-net-client". A client that offers one of those names
//!   gets it echoed; a client that offers none (the browser client
//!   passes no protocol list) is accepted without an echo, exactly
//!   like lws falling back to protocols[0].
//! - Message size: C sets rx_buffer_size / tx_packet_size to 64 KiB.
//!   C delivers a larger inbound message fragmented across multiple
//!   `on_msg` calls, which corrupts the proto framing upstream and
//!   gets the peer dropped by server.c; the Rust port closes the
//!   connection at the transport instead. Either way the observable
//!   result is "peer over 64 KiB gets dropped".
//! - Send queue: 64 entries per connection (`NET_SEND_QUEUE_CAP`).
//!   Queue full -> the message is dropped with the same stderr line
//!   as C ("[net] send queue full, dropping N bytes").
//! - Close: a server-initiated `close_conn` flushes any already-queued
//!   outbound frames (in C, `net_close` only stages the close reason
//!   via `lws_close_reason`, so a KICK queued just before the close
//!   still drains through `SERVER_WRITEABLE`), then sends a WS close
//!   frame with status 1000 (C: `LWS_CLOSE_STATUS_NORMAL`) and still
//!   emits a [`NetEvent::Close`] - in C, `CALLBACK_CLOSED` fires
//!   `on_close` for local closes too. The server side only ever
//!   reports `NetCloseReason::RemoteGone`, matching C.
//! - Channels: the WS backend has one channel. `send` ignores the
//!   channel argument; inbound messages always report
//!   `NetChannel::Reliable`. Binary frames carry the proto bytes
//!   unmodified; text frames are passed through as bytes (lws fires
//!   `LWS_CALLBACK_RECEIVE` for both, with UTF-8 validation - which
//!   tungstenite performs inherently).
//! - HTTP fallback on the same port:
//!   - no handler: 200 "tenebris-server is alive (WebSocket-only by
//!     default)\n" (text/plain; charset=utf-8) so Fly's health check
//!     sees a 200.
//!   - handler registered: the path (query string included, joined
//!     with '&' exactly as C rejoins the URI_ARGS fragments) is
//!     delivered as an event; the server answers 200 with the body /
//!     mime it provides, or 404 "404\n" on a miss.
//!   - every response carries the CORS headers C emits:
//!     `Access-Control-Allow-Origin: *` and
//!     `Access-Control-Allow-Methods: GET, OPTIONS`.
//!   - divergence: responses carry `Connection: close` (lws kept the
//!     transaction open for keep-alive). Not observable to the
//!     dashboard's `fetch()`.
//! - Max clients: not a transport concern in C either -
//!   `SERVER_MAX_CLIENTS` (16) is enforced by server.c's `on_open`,
//!   which calls `net_close` on the overflow connection. The port
//!   keeps that split: the transport accepts, the server layer kicks
//!   via [`NetListener::close_conn`].

// server.rs is still a stub; the listener surface is consumed by the
// upcoming server-loop port (and by the tests below).
#![allow(dead_code)]

use std::collections::HashMap;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use futures_util::{SinkExt, StreamExt};
use tokio::io::{AsyncBufReadExt, AsyncRead, AsyncWrite, AsyncWriteExt, BufReader};
use tokio::net::TcpStream;
use tokio::runtime::Runtime;
use tokio::sync::{mpsc, oneshot, Notify};
use tokio_tungstenite::tungstenite::client::IntoClientRequest;
use tokio_tungstenite::tungstenite::handshake::derive_accept_key;
use tokio_tungstenite::tungstenite::http::HeaderValue;
use tokio_tungstenite::tungstenite::protocol::frame::coding::CloseCode;
use tokio_tungstenite::tungstenite::protocol::{CloseFrame, Role, WebSocketConfig};
use tokio_tungstenite::tungstenite::Message;
use tokio_tungstenite::WebSocketStream;

/// `NET_SEND_QUEUE_CAP` - per-connection outbound queue depth.
const NET_SEND_QUEUE_CAP: usize = 64;

/// C `rx_buffer_size` / `tx_packet_size` on both protocol entries.
const NET_WS_BUFFER_SIZE: usize = 64 * 1024;

/// Subprotocol names registered in the C `PROTOCOLS[]` table.
const WS_PROTO_SERVER: &str = "tenebris-net";
const WS_PROTO_CLIENT: &str = "tenebris-net-client";

/// Body served when no HTTP handler is registered (C: the friendly
/// line that keeps Fly's health check at 200).
const HTTP_ALIVE_BODY: &[u8] = b"tenebris-server is alive (WebSocket-only by default)\n";
const HTTP_ALIVE_MIME: &str = "text/plain; charset=utf-8";

/// C 404 fallback body/mime in `LWS_CALLBACK_HTTP`.
const HTTP_404_BODY: &[u8] = b"404\n";
const HTTP_404_MIME: &str = "text/plain";

/// Internal guard on the HTTP/WS request head, analogous to lws'
/// compiled-in per-thread service buffer (pt_serv_buf_size).
const HTTP_HEAD_MAX: usize = 8 * 1024;

/// `net_channel_t`. The WS backend maps UNRELIABLE onto the same
/// reliable-ordered stream, exactly like C.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum NetChannel {
    Reliable = 0,
    Unreliable = 1,
}

/// `net_close_reason_t`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum NetCloseReason {
    Normal = 0,
    ProtocolErr = 1,
    Timeout = 2,
    RemoteGone = 3,
}

/// Opaque per-connection token; the port of the server-side
/// `net_conn_t*`.
pub type ConnId = u64;

/// One non-WebSocket HTTP request, the port of the `net_http_fn`
/// callback. C fills `out_body` / `out_mime` and returns hit/miss;
/// here the server answers through the responder. Dropping the
/// request unanswered serves the same 404 as a miss.
pub struct HttpRequest {
    /// URL path including the query string ("/logins?n=5&before=7"),
    /// matching the path C reassembles from the URI_ARGS fragments.
    pub path: String,
    responder: oneshot::Sender<Option<(String, Vec<u8>)>>,
}

impl HttpRequest {
    /// Hit: serve `body` as a 200 with the given mime type.
    pub fn respond(self, mime: &str, body: &[u8]) {
        let _ = self.responder.send(Some((mime.to_string(), body.to_vec())));
    }

    /// Miss: serve the C transport's 404 ("404\n", text/plain).
    pub fn not_found(self) {
        let _ = self.responder.send(None);
    }
}

impl std::fmt::Debug for HttpRequest {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("HttpRequest").field("path", &self.path).finish()
    }
}

/// The C `net_callbacks_t` callbacks, reified as polled events.
/// Per-connection ordering is `Open`, then zero or more `Msg`, then
/// exactly one `Close` - same as the lws callback sequence.
#[derive(Debug)]
pub enum NetEvent {
    Open { conn: ConnId },
    Msg { conn: ConnId, channel: NetChannel, data: Vec<u8> },
    Close { conn: ConnId, reason: NetCloseReason },
    Http(HttpRequest),
}

/// Per-connection handle held in the listener registry. `out` is the
/// port of the C send_item ring (cap NET_SEND_QUEUE_CAP); `close`
/// signals the pump task to send a normal close frame.
struct ConnHandle {
    out: mpsc::Sender<Vec<u8>>,
    close: Arc<Notify>,
}

type ConnMap = Arc<Mutex<HashMap<ConnId, ConnHandle>>>;

/// `net_listener_t`.
pub struct NetListener {
    rt: Option<Runtime>,
    events: mpsc::UnboundedReceiver<NetEvent>,
    conns: ConnMap,
    port: u16,
}

impl NetListener {
    /// `net_listen`. `http_handler` mirrors `cb.on_http != NULL`:
    /// when false, plain HTTP requests get the alive line; when true
    /// they surface as [`NetEvent::Http`]. Returns `None` on bind
    /// failure, like C returning NULL.
    pub fn listen(bind_addr: &str, port: u16, http_handler: bool) -> Option<NetListener> {
        let std_listener = match std::net::TcpListener::bind((bind_addr, port)) {
            Ok(l) => l,
            Err(_) => {
                eprintln!("[net] listener bind failed (port={})", port);
                return None;
            }
        };
        if std_listener.set_nonblocking(true).is_err() {
            eprintln!("[net] listener bind failed (port={})", port);
            return None;
        }
        let local_port = match std_listener.local_addr() {
            Ok(a) => a.port(),
            Err(_) => return None,
        };

        // One worker thread: the lws context was single-threaded; a
        // single worker keeps I/O serialized the same way while the
        // event queue already guarantees per-connection ordering.
        let rt = match tokio::runtime::Builder::new_multi_thread()
            .worker_threads(1)
            .enable_all()
            .build()
        {
            Ok(rt) => rt,
            Err(_) => {
                eprintln!("[net] listener bind failed (port={})", port);
                return None;
            }
        };

        let (ev_tx, ev_rx) = mpsc::unbounded_channel();
        let conns: ConnMap = Arc::new(Mutex::new(HashMap::new()));
        let next_id = Arc::new(AtomicU64::new(1));

        {
            let conns = conns.clone();
            rt.spawn(async move {
                let listener = match tokio::net::TcpListener::from_std(std_listener) {
                    Ok(l) => l,
                    Err(_) => return,
                };
                loop {
                    match listener.accept().await {
                        Ok((stream, _addr)) => {
                            tokio::spawn(handle_conn(
                                stream,
                                ev_tx.clone(),
                                conns.clone(),
                                next_id.clone(),
                                http_handler,
                            ));
                        }
                        Err(_) => {
                            // Transient accept failure (fd pressure
                            // etc.) - back off briefly instead of
                            // spinning, like lws' service loop.
                            tokio::time::sleep(Duration::from_millis(10)).await;
                        }
                    }
                }
            });
        }

        println!("[net] listening on ws://{}:{}", bind_addr, local_port);
        Some(NetListener {
            rt: Some(rt),
            events: ev_rx,
            conns,
            port: local_port,
        })
    }

    /// Actual bound port (useful when listening on port 0 in tests).
    pub fn port(&self) -> u16 {
        self.port
    }

    /// `net_poll`. Non-blocking, like `lws_service(ctx, 0)`: drains
    /// everything queued since the last tick and returns it for the
    /// caller to dispatch on its own thread.
    pub fn poll(&mut self) -> Vec<NetEvent> {
        let mut out = Vec::new();
        while let Ok(ev) = self.events.try_recv() {
            out.push(ev);
        }
        out
    }

    /// `net_send` for a server-side connection. Copies the bytes,
    /// queues them as one binary WS frame. Silent no-op on a closed /
    /// unknown connection (C: `!C->wsi`); drops with the C stderr
    /// line when the 64-entry queue is full.
    pub fn send(&self, conn: ConnId, _ch: NetChannel, data: &[u8]) {
        if data.is_empty() {
            return;
        }
        let conns = self.conns.lock().unwrap();
        let Some(h) = conns.get(&conn) else { return };
        if let Err(mpsc::error::TrySendError::Full(_)) = h.out.try_send(data.to_vec()) {
            eprintln!("[net] send queue full, dropping {} bytes", data.len());
        }
    }

    /// `net_close` for a server-side connection: sends a status-1000
    /// close frame and drops queued output. The matching
    /// [`NetEvent::Close`] still arrives through `poll`, exactly as
    /// `LWS_CALLBACK_CLOSED` fires `on_close` for local closes.
    pub fn close_conn(&self, conn: ConnId) {
        let conns = self.conns.lock().unwrap();
        if let Some(h) = conns.get(&conn) {
            h.close.notify_one();
        }
    }

    /// `net_close_listener`. Dropping the listener does the same.
    pub fn close(self) {}
}

impl Drop for NetListener {
    fn drop(&mut self) {
        // lws_context_destroy: tear everything down, killing live
        // connections. shutdown_background avoids blocking the tick
        // thread on in-flight tasks.
        if let Some(rt) = self.rt.take() {
            rt.shutdown_background();
        }
    }
}

/// Shared WS limits - the port of `rx_buffer_size` / `tx_packet_size`
/// (64 KiB) on both C protocol entries.
fn ws_config() -> WebSocketConfig {
    let mut c = WebSocketConfig::default();
    c.max_message_size = Some(NET_WS_BUFFER_SIZE);
    c.max_frame_size = Some(NET_WS_BUFFER_SIZE);
    c
}

/// Read one HTTP request head (request line + headers) off the
/// stream. Returns None on malformed/oversized input. Bytes after
/// the blank line stay buffered in the BufReader for the WS layer.
async fn read_request_head<R>(br: &mut R) -> Option<(String, Vec<(String, String)>)>
where
    R: AsyncBufReadExt + Unpin,
{
    let mut total = 0usize;
    let mut request_line = String::new();
    let mut headers: Vec<(String, String)> = Vec::new();
    let mut first = true;
    loop {
        let mut line = Vec::new();
        let n = br.read_until(b'\n', &mut line).await.ok()?;
        if n == 0 {
            return None; // EOF mid-head
        }
        total += n;
        if total > HTTP_HEAD_MAX {
            return None;
        }
        while line.last() == Some(&b'\n') || line.last() == Some(&b'\r') {
            line.pop();
        }
        if line.is_empty() {
            if first {
                continue; // tolerate a stray leading CRLF
            }
            break;
        }
        let text = String::from_utf8_lossy(&line).into_owned();
        if first {
            request_line = text;
            first = false;
        } else if let Some(colon) = text.find(':') {
            let name = text[..colon].trim().to_ascii_lowercase();
            let value = text[colon + 1..].trim().to_string();
            headers.push((name, value));
        }
    }
    if request_line.is_empty() {
        return None;
    }
    Some((request_line, headers))
}

fn header_value<'a>(headers: &'a [(String, String)], name: &str) -> Option<&'a str> {
    headers
        .iter()
        .find(|(n, _)| n == name)
        .map(|(_, v)| v.as_str())
}

/// Pick the subprotocol to echo: the first client-offered name that
/// matches an entry of the C `PROTOCOLS[]` table. None -> accept
/// without an echo (lws protocols[0] fallback).
fn select_subprotocol(headers: &[(String, String)]) -> Option<String> {
    headers
        .iter()
        .filter(|(n, _)| n == "sec-websocket-protocol")
        .flat_map(|(_, v)| v.split(','))
        .map(|s| s.trim())
        .find(|p| *p == WS_PROTO_SERVER || *p == WS_PROTO_CLIENT)
        .map(|p| p.to_string())
}

/// Port of `serve_http()`: status line, Content-Type/Length, the two
/// CORS headers, body. (`Connection: close` instead of lws keep-alive;
/// see module notes.)
async fn write_http_response<S>(
    s: &mut S,
    status: u16,
    status_text: &str,
    mime: &str,
    body: &[u8],
) -> std::io::Result<()>
where
    S: AsyncWrite + Unpin,
{
    let head = format!(
        "HTTP/1.1 {} {}\r\n\
         Content-Type: {}\r\n\
         Content-Length: {}\r\n\
         Access-Control-Allow-Origin: *\r\n\
         Access-Control-Allow-Methods: GET, OPTIONS\r\n\
         Connection: close\r\n\r\n",
        status,
        status_text,
        mime,
        body.len()
    );
    s.write_all(head.as_bytes()).await?;
    s.write_all(body).await?;
    s.flush().await
}

/// Port of the `LWS_CALLBACK_HTTP` branch.
async fn handle_http<S>(
    s: &mut S,
    target: &str,
    http_handler: bool,
    events: &mpsc::UnboundedSender<NetEvent>,
) where
    S: AsyncWrite + Unpin,
{
    if !http_handler {
        let _ = write_http_response(s, 200, "OK", HTTP_ALIVE_MIME, HTTP_ALIVE_BODY).await;
        return;
    }
    let (tx, rx) = oneshot::channel();
    let sent = events.send(NetEvent::Http(HttpRequest {
        path: target.to_string(),
        responder: tx,
    }));
    let reply = if sent.is_ok() { rx.await.ok().flatten() } else { None };
    match reply {
        Some((mime, body)) => {
            let _ = write_http_response(s, 200, "OK", &mime, &body).await;
        }
        None => {
            let _ = write_http_response(s, 404, "Not Found", HTTP_404_MIME, HTTP_404_BODY).await;
        }
    }
}

/// Bidirectional pump for one established server-side connection.
/// The C equivalent is the RECEIVE / SERVER_WRITEABLE / CLOSED arms
/// of `tenebris_callback` plus `drain_send_queue`.
async fn pump_server_ws<S>(
    ws: WebSocketStream<S>,
    id: ConnId,
    events: &mpsc::UnboundedSender<NetEvent>,
    mut out_rx: mpsc::Receiver<Vec<u8>>,
    close: Arc<Notify>,
) where
    S: AsyncRead + AsyncWrite + Unpin,
{
    let (mut sink, mut src) = ws.split();
    loop {
        tokio::select! {
            item = src.next() => match item {
                Some(Ok(Message::Binary(b))) => {
                    let _ = events.send(NetEvent::Msg {
                        conn: id,
                        channel: NetChannel::Reliable,
                        data: b,
                    });
                }
                Some(Ok(Message::Text(t))) => {
                    // lws fires LWS_CALLBACK_RECEIVE for text frames
                    // too (with VALIDATE_UTF8); pass the bytes up.
                    let _ = events.send(NetEvent::Msg {
                        conn: id,
                        channel: NetChannel::Reliable,
                        data: t.into_bytes(),
                    });
                }
                // Peer-initiated close: keep polling so tungstenite
                // finishes the close handshake, then the stream ends.
                Some(Ok(Message::Close(_))) => {}
                Some(Ok(_)) => {} // ping/pong handled by tungstenite
                // Includes Capacity errors from the 64 KiB limit.
                Some(Err(_)) | None => break,
            },
            cmd = out_rx.recv() => match cmd {
                Some(bytes) => {
                    if sink.send(Message::Binary(bytes)).await.is_err() {
                        break;
                    }
                }
                None => break, // listener registry handle dropped
            },
            _ = close.notified() => {
                // net_close on a server conn: C only stages the close
                // reason (lws_close_reason); messages already queued
                // (e.g. the KICK that precedes a server-side kick)
                // still drain through SERVER_WRITEABLE before the
                // socket dies. Flush what's queued, then send the
                // status-1000 close frame.
                while let Ok(bytes) = out_rx.try_recv() {
                    if sink.send(Message::Binary(bytes)).await.is_err() {
                        break;
                    }
                }
                let _ = sink
                    .send(Message::Close(Some(CloseFrame {
                        code: CloseCode::Normal,
                        reason: "".into(),
                    })))
                    .await;
                break;
            }
        }
    }
}

/// One accepted TCP connection: sniff the request head, then either
/// finish the WS upgrade by hand (so HTTP and WS share the port the
/// way lws does) or serve the HTTP fallback.
async fn handle_conn(
    stream: TcpStream,
    events: mpsc::UnboundedSender<NetEvent>,
    conns: ConnMap,
    next_id: Arc<AtomicU64>,
    http_handler: bool,
) {
    let mut br = BufReader::new(stream);
    let Some((request_line, headers)) = read_request_head(&mut br).await else {
        return;
    };
    let mut parts = request_line.split_whitespace();
    let _method = parts.next().unwrap_or("");
    let target = parts.next().unwrap_or("/").to_string();

    let wants_ws = header_value(&headers, "upgrade")
        .map(|v| v.to_ascii_lowercase().contains("websocket"))
        .unwrap_or(false);
    let ws_key = header_value(&headers, "sec-websocket-key");

    let (true, Some(key)) = (wants_ws, ws_key) else {
        handle_http(&mut br, &target, http_handler, &events).await;
        return;
    };

    // Manual 101 so the leftover bytes in the BufReader (a client may
    // pipeline frames right behind the handshake) feed straight into
    // the WS stream.
    let accept = derive_accept_key(key.as_bytes());
    let mut resp = format!(
        "HTTP/1.1 101 Switching Protocols\r\n\
         Connection: Upgrade\r\n\
         Upgrade: websocket\r\n\
         Sec-WebSocket-Accept: {}\r\n",
        accept
    );
    if let Some(p) = select_subprotocol(&headers) {
        resp.push_str(&format!("Sec-WebSocket-Protocol: {}\r\n", p));
    }
    resp.push_str("\r\n");
    if br.write_all(resp.as_bytes()).await.is_err() {
        return;
    }
    if br.flush().await.is_err() {
        return;
    }

    let ws = WebSocketStream::from_raw_socket(br, Role::Server, Some(ws_config())).await;

    // LWS_CALLBACK_ESTABLISHED.
    let id = next_id.fetch_add(1, Ordering::Relaxed);
    let (out_tx, out_rx) = mpsc::channel(NET_SEND_QUEUE_CAP);
    let close = Arc::new(Notify::new());
    conns.lock().unwrap().insert(
        id,
        ConnHandle {
            out: out_tx,
            close: close.clone(),
        },
    );
    let _ = events.send(NetEvent::Open { conn: id });

    pump_server_ws(ws, id, &events, out_rx, close).await;

    // LWS_CALLBACK_CLOSED: free the queue, fire on_close. The server
    // side only ever reports NET_CLOSE_REMOTE_GONE, matching C.
    conns.lock().unwrap().remove(&id);
    let _ = events.send(NetEvent::Close {
        conn: id,
        reason: NetCloseReason::RemoteGone,
    });
}

/* ------------------------------------------------------------------ */
/* Client surface - net_connect / net_poll_client / net_close.         */
/* ------------------------------------------------------------------ */

/// Client-side events, the port of the client half of
/// `net_callbacks_t` (no `conn` field - one handle, one connection,
/// like the one-context-per-connection C client).
#[derive(Debug)]
pub enum NetClientEvent {
    Open,
    Msg { channel: NetChannel, data: Vec<u8> },
    Close { reason: NetCloseReason },
}

/// Result of the C `parse_ws_url` splitter.
struct ParsedWsUrl {
    host: String,
    port: i32,
    path: String,
    ssl: bool,
}

/// Port of `parse_ws_url`: ws://host[:port][/path] or wss://...,
/// no userinfo, no IPv6 brackets. C atoi semantics for the port
/// (no digits -> 0). Same 256-byte host/path caps.
fn parse_ws_url(url: &str) -> Option<ParsedWsUrl> {
    let (ssl, rest) = if let Some(r) = url.strip_prefix("wss://") {
        (true, r)
    } else if let Some(r) = url.strip_prefix("ws://") {
        (false, r)
    } else {
        return None;
    };

    let host_end = rest.find([':', '/']).unwrap_or(rest.len());
    let host = &rest[..host_end];
    if host.is_empty() || host.len() + 1 > 256 {
        return None;
    }

    let mut port: i32 = if ssl { 443 } else { 80 };
    let mut after = &rest[host_end..];
    if after.starts_with(':') {
        let digits: &str = {
            let d = &after[1..];
            let end = d.find(|c: char| !c.is_ascii_digit()).unwrap_or(d.len());
            &d[..end]
        };
        port = digits.parse().unwrap_or(0);
        after = match after.find('/') {
            Some(i) => &after[i..],
            None => "",
        };
    }

    let path = if after.starts_with('/') {
        if after.len() + 1 > 256 {
            return None;
        }
        after.to_string()
    } else {
        "/".to_string()
    };

    Some(ParsedWsUrl {
        host: host.to_string(),
        port,
        path,
        ssl,
    })
}

/// `net_conn_t` on the client side: one outbound connection with its
/// own private context (here: its own single-worker runtime).
pub struct NetClient {
    rt: Option<Runtime>,
    events: mpsc::UnboundedReceiver<NetClientEvent>,
    out: mpsc::Sender<Vec<u8>>,
    close: Arc<Notify>,
    done: Option<oneshot::Receiver<()>>,
}

impl NetClient {
    /// `net_connect`. Returns `None` on a malformed URL (C prints the
    /// same line and returns NULL). The connection proceeds in the
    /// background: expect `NetClientEvent::Open` from `poll` on
    /// success, or `Close { reason: ProtocolErr }` on handshake
    /// failure (C: `CLIENT_CONNECTION_ERROR`).
    ///
    /// wss:// parses (as in C) but fails the handshake unless a TLS
    /// feature is compiled in; the failure surfaces as ProtocolErr.
    pub fn connect(url: &str) -> Option<NetClient> {
        let parsed = match parse_ws_url(url) {
            Some(p) => p,
            None => {
                eprintln!("[net] bad client URL: {}", url);
                return None;
            }
        };

        let rt = tokio::runtime::Builder::new_multi_thread()
            .worker_threads(1)
            .enable_all()
            .build()
            .ok()?;

        let (ev_tx, ev_rx) = mpsc::unbounded_channel();
        let (out_tx, out_rx) = mpsc::channel(NET_SEND_QUEUE_CAP);
        let close = Arc::new(Notify::new());
        let (done_tx, done_rx) = oneshot::channel();

        rt.spawn(client_task(
            url.to_string(),
            ev_tx,
            out_rx,
            close.clone(),
            done_tx,
        ));

        println!(
            "[net] connecting to {} (host={} port={} ssl={})",
            url, parsed.host, parsed.port, parsed.ssl as i32
        );
        Some(NetClient {
            rt: Some(rt),
            events: ev_rx,
            out: out_tx,
            close,
            done: Some(done_rx),
        })
    }

    /// `net_poll_client`.
    pub fn poll(&mut self) -> Vec<NetClientEvent> {
        let mut out = Vec::new();
        while let Ok(ev) = self.events.try_recv() {
            out.push(ev);
        }
        out
    }

    /// `net_send` on a client conn. Same copy / queue-cap / drop
    /// semantics as the server side.
    pub fn send(&self, _ch: NetChannel, data: &[u8]) {
        if data.is_empty() {
            return;
        }
        if let Err(mpsc::error::TrySendError::Full(_)) = self.out.try_send(data.to_vec()) {
            eprintln!("[net] send queue full, dropping {} bytes", data.len());
        }
    }

    /// `net_close` on a client conn: signal a normal close, give the
    /// pump a short grace window to flush the close frame (the
    /// counterpart of lws_context_destroy's synchronous final service
    /// pass), then tear everything down. Consumes the handle, like
    /// the C pointer being invalid after `net_close`.
    pub fn close(mut self) {
        self.close.notify_one();
        if let Some(rt) = self.rt.take() {
            if let Some(done) = self.done.take() {
                let _ = rt.block_on(async {
                    tokio::time::timeout(Duration::from_millis(250), done).await
                });
            }
            rt.shutdown_background();
        }
    }
}

impl Drop for NetClient {
    fn drop(&mut self) {
        if let Some(rt) = self.rt.take() {
            rt.shutdown_background();
        }
    }
}

async fn client_task(
    url: String,
    events: mpsc::UnboundedSender<NetClientEvent>,
    mut out_rx: mpsc::Receiver<Vec<u8>>,
    close: Arc<Notify>,
    done_tx: oneshot::Sender<()>,
) {
    let req = match url.as_str().into_client_request() {
        Ok(mut r) => {
            // ccinfo.protocol = "tenebris-net-client" in C.
            r.headers_mut().insert(
                "Sec-WebSocket-Protocol",
                HeaderValue::from_static(WS_PROTO_CLIENT),
            );
            r
        }
        Err(_) => {
            let _ = events.send(NetClientEvent::Close {
                reason: NetCloseReason::ProtocolErr,
            });
            let _ = done_tx.send(());
            return;
        }
    };

    let ws = match tokio_tungstenite::connect_async_with_config(req, Some(ws_config()), false)
        .await
    {
        Ok((ws, _resp)) => ws,
        Err(_) => {
            // LWS_CALLBACK_CLIENT_CONNECTION_ERROR.
            let _ = events.send(NetClientEvent::Close {
                reason: NetCloseReason::ProtocolErr,
            });
            let _ = done_tx.send(());
            return;
        }
    };

    // LWS_CALLBACK_CLIENT_ESTABLISHED.
    let _ = events.send(NetClientEvent::Open);

    let (mut sink, mut src) = ws.split();
    loop {
        tokio::select! {
            item = src.next() => match item {
                Some(Ok(Message::Binary(b))) => {
                    let _ = events.send(NetClientEvent::Msg {
                        channel: NetChannel::Reliable,
                        data: b,
                    });
                }
                Some(Ok(Message::Text(t))) => {
                    let _ = events.send(NetClientEvent::Msg {
                        channel: NetChannel::Reliable,
                        data: t.into_bytes(),
                    });
                }
                Some(Ok(Message::Close(_))) => {}
                Some(Ok(_)) => {}
                Some(Err(_)) | None => break,
            },
            cmd = out_rx.recv() => match cmd {
                Some(bytes) => {
                    if sink.send(Message::Binary(bytes)).await.is_err() {
                        break;
                    }
                }
                None => break,
            },
            _ = close.notified() => {
                let _ = sink
                    .send(Message::Close(Some(CloseFrame {
                        code: CloseCode::Normal,
                        reason: "".into(),
                    })))
                    .await;
                break;
            }
        }
    }

    // LWS_CALLBACK_CLIENT_CLOSED, single-fire by construction.
    let _ = events.send(NetClientEvent::Close {
        reason: NetCloseReason::RemoteGone,
    });
    let _ = done_tx.send(());
}

/* ================================================================== */

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::{Read, Write};
    use std::time::Instant;
    use tenebris_core::proto;
    use tokio_tungstenite::connect_async;

    const TEST_TIMEOUT: Duration = Duration::from_secs(10);

    /// Poll the listener until `pred` matches one event, returning
    /// every event seen so far (matching one last). Panics on timeout.
    fn poll_until<F>(l: &mut NetListener, mut pred: F) -> Vec<NetEvent>
    where
        F: FnMut(&NetEvent) -> bool,
    {
        let start = Instant::now();
        let mut got = Vec::new();
        loop {
            for ev in l.poll() {
                let hit = pred(&ev);
                got.push(ev);
                if hit {
                    return got;
                }
            }
            assert!(
                start.elapsed() < TEST_TIMEOUT,
                "poll_until timed out; events so far: {:?}",
                got
            );
            std::thread::sleep(Duration::from_millis(5));
        }
    }

    fn client_poll_until<F>(c: &mut NetClient, mut pred: F) -> Vec<NetClientEvent>
    where
        F: FnMut(&NetClientEvent) -> bool,
    {
        let start = Instant::now();
        let mut got = Vec::new();
        loop {
            for ev in c.poll() {
                let hit = pred(&ev);
                got.push(ev);
                if hit {
                    return got;
                }
            }
            assert!(
                start.elapsed() < TEST_TIMEOUT,
                "client_poll_until timed out; events so far: {:?}",
                got
            );
            std::thread::sleep(Duration::from_millis(5));
        }
    }

    /// Real proto-encoded HELLO bytes, as the C client would send.
    fn hello_bytes() -> Vec<u8> {
        let mut m = proto::MsgHello::default();
        m.client_version = 7;
        m.token[..8].copy_from_slice(b"tok-test");
        m.name[..4].copy_from_slice(b"Anna");
        m.room_code[..6].copy_from_slice(b"T9VVPW");
        let mut buf = vec![0u8; proto::MSG_HEADER_SIZE + proto::MSG_HELLO_WIRE_SIZE];
        let n = proto::write_hello(&mut buf, &m);
        assert_eq!(n, buf.len());
        buf
    }

    fn sync_tick_bytes(seq: u32) -> Vec<u8> {
        let m = proto::MsgSyncTick { seq_id: seq };
        let mut buf = vec![0u8; proto::MSG_HEADER_SIZE + proto::MSG_SYNC_TICK_WIRE_SIZE];
        let n = proto::write_sync_tick(&mut buf, &m);
        assert_eq!(n, buf.len());
        buf
    }

    #[test]
    fn connect_message_disconnect_event_order() {
        let mut l = NetListener::listen("127.0.0.1", 0, false).expect("listen");
        let url = format!("ws://127.0.0.1:{}/", l.port());
        let rt = tokio::runtime::Runtime::new().unwrap();

        let mut ws = rt.block_on(async {
            let (ws, _resp) = connect_async(url.as_str()).await.expect("connect");
            ws
        });

        let evs = poll_until(&mut l, |e| matches!(e, NetEvent::Open { .. }));
        let NetEvent::Open { conn } = evs.last().unwrap() else {
            unreachable!()
        };
        let conn = *conn;

        let hello = hello_bytes();
        rt.block_on(ws.send(Message::Binary(hello.clone()))).unwrap();

        let evs = poll_until(&mut l, |e| matches!(e, NetEvent::Msg { .. }));
        let NetEvent::Msg { conn: mc, channel, data } = evs.last().unwrap() else {
            unreachable!()
        };
        assert_eq!(*mc, conn);
        assert_eq!(*channel, NetChannel::Reliable);
        // Binary frame passes through byte-for-byte and still decodes.
        assert_eq!(data, &hello);
        let hdr = proto::read_header(data).expect("header");
        assert_eq!(hdr.kind, proto::MsgKind::Hello as u16);
        let decoded = proto::read_hello(&data[proto::MSG_HEADER_SIZE..]).expect("hello");
        assert_eq!(decoded.client_version, 7);
        assert_eq!(&decoded.room_code[..6], b"T9VVPW");

        // Graceful client close -> Close event, after Open and Msg.
        rt.block_on(async {
            ws.close(None).await.ok();
            while let Some(m) = ws.next().await {
                if m.is_err() {
                    break;
                }
            }
        });
        let evs = poll_until(&mut l, |e| matches!(e, NetEvent::Close { .. }));
        let NetEvent::Close { conn: cc, reason } = evs.last().unwrap() else {
            unreachable!()
        };
        assert_eq!(*cc, conn);
        assert_eq!(*reason, NetCloseReason::RemoteGone);
    }

    #[test]
    fn server_to_client_binary_passthrough() {
        let mut l = NetListener::listen("127.0.0.1", 0, false).expect("listen");
        let url = format!("ws://127.0.0.1:{}/", l.port());
        let rt = tokio::runtime::Runtime::new().unwrap();
        let mut ws = rt.block_on(async { connect_async(url.as_str()).await.unwrap().0 });

        let evs = poll_until(&mut l, |e| matches!(e, NetEvent::Open { .. }));
        let NetEvent::Open { conn } = evs.last().unwrap() else {
            unreachable!()
        };

        let bytes = sync_tick_bytes(0xDEAD_BEEF);
        // UNRELIABLE silently maps to the reliable WS stream, like C.
        l.send(*conn, NetChannel::Unreliable, &bytes);

        let got = rt.block_on(async {
            loop {
                match ws.next().await.expect("frame").expect("ok frame") {
                    Message::Binary(b) => break b,
                    _ => continue,
                }
            }
        });
        assert_eq!(got, bytes);
        let hdr = proto::read_header(&got).unwrap();
        assert_eq!(hdr.kind, proto::MsgKind::SyncTick as u16);
        let m = proto::read_sync_tick(&got[proto::MSG_HEADER_SIZE..]).unwrap();
        assert_eq!(m.seq_id, 0xDEAD_BEEF);

        // Sending to a vanished conn id is a silent no-op (C: !C->wsi).
        l.send(9999, NetChannel::Reliable, &bytes);
    }

    #[test]
    fn subprotocol_echoed_when_offered() {
        let l = NetListener::listen("127.0.0.1", 0, false).expect("listen");
        let url = format!("ws://127.0.0.1:{}/", l.port());
        let rt = tokio::runtime::Runtime::new().unwrap();

        // Offer "tenebris-net" -> echoed back, as lws does for a
        // registered protocol name.
        let resp = rt.block_on(async {
            let mut req = url.as_str().into_client_request().unwrap();
            req.headers_mut().insert(
                "Sec-WebSocket-Protocol",
                HeaderValue::from_static("tenebris-net"),
            );
            let (_ws, resp) = connect_async(req).await.expect("connect with proto");
            resp
        });
        assert_eq!(
            resp.headers()
                .get("Sec-WebSocket-Protocol")
                .expect("echoed subprotocol"),
            "tenebris-net"
        );

        // No offer (browser client path) -> accepted, nothing echoed.
        let resp = rt.block_on(async { connect_async(url.as_str()).await.unwrap().1 });
        assert!(resp.headers().get("Sec-WebSocket-Protocol").is_none());
    }

    fn raw_http_get(port: u16, target: &str) -> String {
        let mut s = std::net::TcpStream::connect(("127.0.0.1", port)).unwrap();
        s.set_read_timeout(Some(TEST_TIMEOUT)).unwrap();
        write!(s, "GET {} HTTP/1.1\r\nHost: t\r\n\r\n", target).unwrap();
        let mut out = String::new();
        s.read_to_string(&mut out).unwrap();
        out
    }

    #[test]
    fn http_default_alive_message() {
        let l = NetListener::listen("127.0.0.1", 0, false).expect("listen");
        let resp = raw_http_get(l.port(), "/anything");
        assert!(resp.starts_with("HTTP/1.1 200 OK"), "got: {resp}");
        assert!(resp.contains("Access-Control-Allow-Origin: *"));
        assert!(resp.contains("Access-Control-Allow-Methods: GET, OPTIONS"));
        assert!(resp.contains("tenebris-server is alive (WebSocket-only by default)\n"));
    }

    #[test]
    fn http_handler_hit_and_miss() {
        let mut l = NetListener::listen("127.0.0.1", 0, true).expect("listen");
        let port = l.port();

        // Hit: path arrives with its query string intact (C rejoins
        // the URI_ARGS fragments with '&').
        let t = std::thread::spawn(move || raw_http_get(port, "/status?n=5&before=7"));
        let evs = poll_until(&mut l, |e| matches!(e, NetEvent::Http(_)));
        let Some(NetEvent::Http(req)) = evs.into_iter().last() else {
            unreachable!()
        };
        assert_eq!(req.path, "/status?n=5&before=7");
        req.respond("application/json; charset=utf-8", b"{\"ok\":1}");
        let resp = t.join().unwrap();
        assert!(resp.starts_with("HTTP/1.1 200 OK"), "got: {resp}");
        assert!(resp.contains("Content-Type: application/json; charset=utf-8"));
        assert!(resp.contains("Access-Control-Allow-Origin: *"));
        assert!(resp.ends_with("{\"ok\":1}"));

        // Miss: 404 with the C transport's "404\n" body.
        let t = std::thread::spawn(move || raw_http_get(port, "/nope"));
        let evs = poll_until(&mut l, |e| matches!(e, NetEvent::Http(_)));
        let Some(NetEvent::Http(req)) = evs.into_iter().last() else {
            unreachable!()
        };
        req.not_found();
        let resp = t.join().unwrap();
        assert!(resp.starts_with("HTTP/1.1 404 Not Found"), "got: {resp}");
        assert!(resp.ends_with("404\n"));
    }

    #[test]
    fn oversized_message_drops_connection() {
        let mut l = NetListener::listen("127.0.0.1", 0, false).expect("listen");
        let url = format!("ws://127.0.0.1:{}/", l.port());
        let rt = tokio::runtime::Runtime::new().unwrap();
        let mut ws = rt.block_on(async { connect_async(url.as_str()).await.unwrap().0 });

        let evs = poll_until(&mut l, |e| matches!(e, NetEvent::Open { .. }));
        let NetEvent::Open { conn } = *evs.last().unwrap() else {
            unreachable!()
        };

        // Exactly at the 64 KiB limit: passes through whole.
        let max = vec![0xABu8; NET_WS_BUFFER_SIZE];
        rt.block_on(ws.send(Message::Binary(max.clone()))).unwrap();
        let evs = poll_until(&mut l, |e| matches!(e, NetEvent::Msg { .. }));
        let NetEvent::Msg { data, .. } = evs.last().unwrap() else {
            unreachable!()
        };
        assert_eq!(data.len(), NET_WS_BUFFER_SIZE);

        // One byte over: the peer gets dropped (C fragments past
        // rx_buffer_size, corrupting proto framing and getting the
        // peer dropped one layer up - same observable end state).
        let over = vec![0xCDu8; NET_WS_BUFFER_SIZE + 1];
        rt.block_on(async {
            // The server may RST before the whole frame is accepted;
            // ignore the local write error if so.
            let _ = ws.send(Message::Binary(over)).await;
            while let Some(m) = ws.next().await {
                if m.is_err() {
                    break;
                }
            }
        });
        let evs = poll_until(&mut l, |e| matches!(e, NetEvent::Close { .. }));
        let NetEvent::Close { conn: cc, .. } = evs.last().unwrap() else {
            unreachable!()
        };
        assert_eq!(*cc, conn);
    }

    #[test]
    fn server_close_conn_sends_normal_close() {
        // The server.c max-clients pattern: on_open over capacity
        // calls net_close on the new conn. The transport accepts any
        // number of sockets (the 16-client cap lives in the server
        // layer); the kick is close_conn, which must reach the peer
        // as a status-1000 close and still emit a Close event.
        let mut l = NetListener::listen("127.0.0.1", 0, false).expect("listen");
        let url = format!("ws://127.0.0.1:{}/", l.port());
        let rt = tokio::runtime::Runtime::new().unwrap();

        let mut ws1 = rt.block_on(async { connect_async(url.as_str()).await.unwrap().0 });
        let evs = poll_until(&mut l, |e| matches!(e, NetEvent::Open { .. }));
        let NetEvent::Open { conn: c1 } = *evs.last().unwrap() else {
            unreachable!()
        };

        let mut ws2 = rt.block_on(async { connect_async(url.as_str()).await.unwrap().0 });
        let evs = poll_until(&mut l, |e| matches!(e, NetEvent::Open { .. }));
        let NetEvent::Open { conn: c2 } = *evs.last().unwrap() else {
            unreachable!()
        };
        assert_ne!(c1, c2);

        l.close_conn(c2);

        // Peer 2 sees a clean close frame, code 1000.
        let frame = rt.block_on(async {
            loop {
                match ws2.next().await {
                    Some(Ok(Message::Close(f))) => break f,
                    Some(Ok(_)) => continue,
                    Some(Err(_)) | None => panic!("expected close frame"),
                }
            }
        });
        let frame = frame.expect("close frame body");
        assert_eq!(frame.code, CloseCode::Normal);

        // Local closes still surface as Close events (C fires
        // on_close from CALLBACK_CLOSED either way).
        let evs = poll_until(
            &mut l,
            |e| matches!(e, NetEvent::Close { conn, .. } if *conn == c2),
        );
        let NetEvent::Close { reason, .. } = evs.last().unwrap() else {
            unreachable!()
        };
        assert_eq!(*reason, NetCloseReason::RemoteGone);

        // Conn 1 is unaffected.
        let bytes = sync_tick_bytes(42);
        l.send(c1, NetChannel::Reliable, &bytes);
        let got = rt.block_on(async {
            loop {
                match ws1.next().await.unwrap().unwrap() {
                    Message::Binary(b) => break b,
                    _ => continue,
                }
            }
        });
        assert_eq!(got, bytes);
    }

    #[test]
    fn net_client_half_roundtrip() {
        let mut l = NetListener::listen("127.0.0.1", 0, false).expect("listen");
        let url = format!("ws://127.0.0.1:{}/", l.port());

        let mut c = NetClient::connect(&url).expect("client connect");
        client_poll_until(&mut c, |e| matches!(e, NetClientEvent::Open));
        let evs = poll_until(&mut l, |e| matches!(e, NetEvent::Open { .. }));
        let NetEvent::Open { conn } = *evs.last().unwrap() else {
            unreachable!()
        };

        // Client -> server.
        let hello = hello_bytes();
        c.send(NetChannel::Reliable, &hello);
        let evs = poll_until(&mut l, |e| matches!(e, NetEvent::Msg { .. }));
        let NetEvent::Msg { data, .. } = evs.last().unwrap() else {
            unreachable!()
        };
        assert_eq!(data, &hello);

        // Server -> client.
        let tick = sync_tick_bytes(3);
        l.send(conn, NetChannel::Reliable, &tick);
        let evs = client_poll_until(&mut c, |e| matches!(e, NetClientEvent::Msg { .. }));
        let NetClientEvent::Msg { channel, data } = evs.last().unwrap() else {
            unreachable!()
        };
        assert_eq!(*channel, NetChannel::Reliable);
        assert_eq!(data, &tick);

        // Server kick -> client Close(RemoteGone).
        l.close_conn(conn);
        let evs = client_poll_until(&mut c, |e| matches!(e, NetClientEvent::Close { .. }));
        let NetClientEvent::Close { reason } = evs.last().unwrap() else {
            unreachable!()
        };
        assert_eq!(*reason, NetCloseReason::RemoteGone);
        c.close();

        // C parse_ws_url rejects non-ws schemes -> NULL.
        assert!(NetClient::connect("http://example.com/").is_none());
    }

    #[test]
    fn parse_ws_url_matches_c() {
        let p = parse_ws_url("ws://host.example:9001/path/x").unwrap();
        assert!(!p.ssl);
        assert_eq!(p.host, "host.example");
        assert_eq!(p.port, 9001);
        assert_eq!(p.path, "/path/x");

        let p = parse_ws_url("wss://fly.dev").unwrap();
        assert!(p.ssl);
        assert_eq!(p.port, 443);
        assert_eq!(p.path, "/");

        let p = parse_ws_url("ws://h").unwrap();
        assert_eq!(p.port, 80);

        // C atoi: ':' with no digits -> port 0.
        let p = parse_ws_url("ws://h:/x").unwrap();
        assert_eq!(p.port, 0);
        assert_eq!(p.path, "/x");

        assert!(parse_ws_url("http://h/").is_none());
        assert!(parse_ws_url("ws://").is_none());
    }
}
