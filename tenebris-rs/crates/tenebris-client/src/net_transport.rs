//! Client-side transport. Port of two C backends behind one surface:
//!
//! - **Web** (`#[cfg(target_os = "emscripten")]`): port of
//!   `tenebris-c/src/client/net_transport_wasm.c`, which wraps the
//!   emscripten WebSocket C API (`emscripten/websocket.h`, itself a
//!   thin shim over the browser's JS `WebSocket`). The extern "C"
//!   declarations below mirror that header exactly; the symbols are
//!   provided at link time by emscripten's `-lwebsocket.js` library,
//!   the same flag the C build passes (see tenebris-c/CMakeLists.txt).
//! - **Native** (`#[cfg(not(target_os = "emscripten"))]`): the C
//!   native client reuses the *client half* of
//!   `tenebris-c/src/server/net_transport_ws.c` (libwebsockets in
//!   client mode - same file serves both call sites, per the comment
//!   in tenebris-c/CMakeLists.txt). The Rust port mirrors the
//!   tenebris-server crate's tokio + tokio-tungstenite `NetClient`
//!   (crates/tenebris-server/src/transport.rs) without importing the
//!   server crate: a private one-worker runtime owns the socket and
//!   pushes events into a queue the game thread drains.
//!
//! # Name mapping (C `core/net_transport.h` -> Rust)
//!
//! - `net_conn_t*` / `net_connect`  -> [`NetConn`] / [`NetConn::connect`]
//! - `net_poll_client`              -> [`NetConn::poll`]
//! - `net_send`                     -> [`NetConn::send`]
//! - `net_close`                    -> [`NetConn::close`]
//! - `net_callbacks_t`              -> the [`NetEvent`] enum returned by
//!   `poll` (the C contract is "all callbacks fire from inside
//!   net_poll" - reifying them as polled events keeps that contract
//!   and drops the unsafe user-pointer plumbing). On the web backend
//!   the browser dispatches the underlying JS events between frames;
//!   they are queued and surface on the next `poll`, one frame later
//!   than the C's direct callback - not observable to net_client,
//!   which only reacts inside its own tick anyway.
//! - `net_conn_user` / `net_conn_set_user` -> not ported. net_client
//!   passes a NULL user pointer in C; Rust ownership replaces it.
//! - Server half (`net_listen` / `net_poll` / `net_close_listener`):
//!   not ported. The C wasm file stubs them with loud failures ("a
//!   browser can't accept incoming sockets"); the Rust client crate
//!   simply has no callers - the real listener lives in
//!   tenebris-server.
//!
//! # Channel semantics
//!
//! `NET_CHANNEL_UNRELIABLE` silently maps to the reliable-ordered WS
//! stream on both backends, exactly like C. Inbound messages always
//! report [`NetChannel::Reliable`].

#![allow(dead_code)] // wired into the app loop by the main_web wave

/// Port of `net_channel_t`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum NetChannel {
    Reliable = 0,
    Unreliable = 1,
}

/// Port of `net_close_reason_t`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum NetCloseReason {
    Normal = 0,
    ProtocolErr = 1,
    Timeout = 2,
    RemoteGone = 3,
}

/// The client half of `net_callbacks_t`, reified as polled events.
/// Ordering per connection is `Open`, zero or more `Msg`, then at most
/// one `Close` - same as the C callback sequence (the error-then-close
/// dedup of net_transport_wasm.c is preserved: only the first
/// close-ish event surfaces).
#[derive(Debug)]
pub enum NetEvent {
    Open,
    Msg { channel: NetChannel, data: Vec<u8> },
    Close { reason: NetCloseReason },
}

#[cfg(target_os = "emscripten")]
pub use wasm::NetConn;

#[cfg(not(target_os = "emscripten"))]
pub use native::NetConn;

/* ================================================================== */
/* Web backend - port of net_transport_wasm.c.                         */
/* ================================================================== */

#[cfg(target_os = "emscripten")]
mod wasm {
    use super::{NetChannel, NetCloseReason, NetEvent};
    use std::collections::VecDeque;
    use std::ffi::CString;
    use std::os::raw::{c_char, c_int, c_ushort, c_void};

    /* ---- emscripten/websocket.h surface, declared verbatim. The
     * implementations live in emscripten's JS library; the web build
     * must link with `-lwebsocket.js` (same as the C build) or these
     * symbols are undefined at link time. ---- */

    type EmBool = c_int; /* EM_BOOL */
    const EM_TRUE: EmBool = 1;

    /// `EMSCRIPTEN_WEBSOCKET_T` - positive handle, <= 0 on failure.
    type EmWebSocket = c_int;
    /// `EMSCRIPTEN_RESULT`.
    type EmResult = c_int;
    const EMSCRIPTEN_RESULT_SUCCESS: EmResult = 0;

    /// `EM_CALLBACK_THREAD_CONTEXT_CALLING_THREAD` ((pthread_t)0x2) -
    /// the C `emscripten_websocket_set_on*_callback` macros expand to
    /// the `_on_thread` variants with this target.
    const EM_CALLBACK_THREAD_CONTEXT_CALLING_THREAD: *mut c_void = 0x2 as *mut c_void;

    #[repr(C)]
    struct EmscriptenWebSocketCreateAttributes {
        url: *const c_char,
        protocols: *const c_char,
        create_on_main_thread: EmBool, /* createOnMainThread */
    }

    #[repr(C)]
    struct EmscriptenWebSocketOpenEvent {
        socket: EmWebSocket,
    }

    #[repr(C)]
    struct EmscriptenWebSocketMessageEvent {
        socket: EmWebSocket,
        data: *mut u8,
        num_bytes: u32,   /* numBytes */
        is_text: EmBool,  /* isText */
    }

    #[repr(C)]
    struct EmscriptenWebSocketErrorEvent {
        socket: EmWebSocket,
    }

    #[repr(C)]
    struct EmscriptenWebSocketCloseEvent {
        socket: EmWebSocket,
        was_clean: EmBool, /* wasClean */
        code: c_ushort,
        reason: [c_char; 512],
    }

    type OnOpenCb =
        unsafe extern "C" fn(c_int, *const EmscriptenWebSocketOpenEvent, *mut c_void) -> EmBool;
    type OnMessageCb =
        unsafe extern "C" fn(c_int, *const EmscriptenWebSocketMessageEvent, *mut c_void) -> EmBool;
    type OnErrorCb =
        unsafe extern "C" fn(c_int, *const EmscriptenWebSocketErrorEvent, *mut c_void) -> EmBool;
    type OnCloseCb =
        unsafe extern "C" fn(c_int, *const EmscriptenWebSocketCloseEvent, *mut c_void) -> EmBool;

    extern "C" {
        fn emscripten_websocket_is_supported() -> EmBool;
        fn emscripten_websocket_new(
            create_attributes: *const EmscriptenWebSocketCreateAttributes,
        ) -> EmWebSocket;
        fn emscripten_websocket_set_onopen_callback_on_thread(
            socket: EmWebSocket,
            user_data: *mut c_void,
            callback: Option<OnOpenCb>,
            target_thread: *mut c_void,
        ) -> EmResult;
        fn emscripten_websocket_set_onmessage_callback_on_thread(
            socket: EmWebSocket,
            user_data: *mut c_void,
            callback: Option<OnMessageCb>,
            target_thread: *mut c_void,
        ) -> EmResult;
        fn emscripten_websocket_set_onerror_callback_on_thread(
            socket: EmWebSocket,
            user_data: *mut c_void,
            callback: Option<OnErrorCb>,
            target_thread: *mut c_void,
        ) -> EmResult;
        fn emscripten_websocket_set_onclose_callback_on_thread(
            socket: EmWebSocket,
            user_data: *mut c_void,
            callback: Option<OnCloseCb>,
            target_thread: *mut c_void,
        ) -> EmResult;
        fn emscripten_websocket_send_binary(
            socket: EmWebSocket,
            binary_data: *mut c_void,
            data_length: u32,
        ) -> EmResult;
        fn emscripten_websocket_close(
            socket: EmWebSocket,
            code: c_ushort,
            reason: *const c_char,
        ) -> EmResult;
    }

    /// The mutable half of the C `struct net_conn_s` (`cb` becomes the
    /// event queue; `open` / `closed` flags carry over). Heap-boxed and
    /// handed to the emscripten callbacks as the user pointer, exactly
    /// like the C `calloc`'d conn.
    ///
    /// SAFETY model: emscripten's main browser build is single-threaded
    /// and the callbacks were registered with the CALLING_THREAD target,
    /// so callbacks and `poll` never run concurrently - same as the C,
    /// which mutates the conn from the callbacks without locking.
    struct ConnShared {
        queue: VecDeque<NetEvent>,
        open: bool,
        closed: bool,
    }

    unsafe extern "C" fn on_open(
        _event_type: c_int,
        _e: *const EmscriptenWebSocketOpenEvent,
        user: *mut c_void,
    ) -> EmBool {
        if user.is_null() {
            return EM_TRUE;
        }
        let c = &mut *(user as *mut ConnShared);
        c.open = true;
        c.queue.push_back(NetEvent::Open);
        EM_TRUE
    }

    unsafe extern "C" fn on_message(
        _event_type: c_int,
        e: *const EmscriptenWebSocketMessageEvent,
        user: *mut c_void,
    ) -> EmBool {
        if user.is_null() || e.is_null() {
            return EM_TRUE;
        }
        let e = &*e;
        /* The server only sends binary frames; ignore any text frames
         * (browsers signal text vs binary on the event itself). */
        if e.is_text != 0 {
            return EM_TRUE;
        }
        let c = &mut *(user as *mut ConnShared);
        let data = std::slice::from_raw_parts(e.data, e.num_bytes as usize).to_vec();
        c.queue.push_back(NetEvent::Msg {
            channel: NetChannel::Reliable,
            data,
        });
        EM_TRUE
    }

    unsafe extern "C" fn on_error(
        _event_type: c_int,
        _e: *const EmscriptenWebSocketErrorEvent,
        user: *mut c_void,
    ) -> EmBool {
        if user.is_null() {
            return EM_TRUE;
        }
        let c = &mut *(user as *mut ConnShared);
        eprintln!("[net] websocket error");
        if !c.closed {
            c.closed = true;
            c.queue.push_back(NetEvent::Close {
                reason: NetCloseReason::ProtocolErr,
            });
        }
        EM_TRUE
    }

    unsafe extern "C" fn on_close(
        _event_type: c_int,
        _e: *const EmscriptenWebSocketCloseEvent,
        user: *mut c_void,
    ) -> EmBool {
        if user.is_null() {
            return EM_TRUE;
        }
        let c = &mut *(user as *mut ConnShared);
        if !c.closed {
            c.closed = true;
            c.queue.push_back(NetEvent::Close {
                reason: NetCloseReason::RemoteGone,
            });
        }
        EM_TRUE
    }

    /// Port of `net_conn_t` (browser backend).
    pub struct NetConn {
        ws: EmWebSocket,
        shared: *mut ConnShared,
    }

    impl NetConn {
        /// Port of `net_connect()`. Returns `None` where the C
        /// returned NULL (no browser WebSocket support, create failed).
        pub fn connect(url: &str) -> Option<NetConn> {
            unsafe {
                if emscripten_websocket_is_supported() == 0 {
                    eprintln!("[net] WebSocket not supported by this browser");
                    return None;
                }
                let c_url = CString::new(url).ok()?;
                let attrs = EmscriptenWebSocketCreateAttributes {
                    url: c_url.as_ptr(),
                    protocols: std::ptr::null(),
                    create_on_main_thread: EM_TRUE,
                };
                let ws = emscripten_websocket_new(&attrs);
                if ws <= 0 {
                    eprintln!(
                        "[net] emscripten_websocket_new failed ({}) for {}",
                        ws, url
                    );
                    return None;
                }

                let shared = Box::into_raw(Box::new(ConnShared {
                    queue: VecDeque::new(),
                    open: false,
                    closed: false,
                }));
                let user = shared as *mut c_void;
                emscripten_websocket_set_onopen_callback_on_thread(
                    ws,
                    user,
                    Some(on_open),
                    EM_CALLBACK_THREAD_CONTEXT_CALLING_THREAD,
                );
                emscripten_websocket_set_onmessage_callback_on_thread(
                    ws,
                    user,
                    Some(on_message),
                    EM_CALLBACK_THREAD_CONTEXT_CALLING_THREAD,
                );
                emscripten_websocket_set_onerror_callback_on_thread(
                    ws,
                    user,
                    Some(on_error),
                    EM_CALLBACK_THREAD_CONTEXT_CALLING_THREAD,
                );
                emscripten_websocket_set_onclose_callback_on_thread(
                    ws,
                    user,
                    Some(on_close),
                    EM_CALLBACK_THREAD_CONTEXT_CALLING_THREAD,
                );
                println!("[net] connecting to {}", url);
                Some(NetConn { ws, shared })
            }
        }

        /// Port of `net_poll_client()`. The C version is an empty pump
        /// ("emscripten dispatches WebSocket callbacks straight from
        /// the JS event loop"); the Rust version drains the queue those
        /// callbacks filled, which is where the reified events surface.
        pub fn poll(&mut self) -> Vec<NetEvent> {
            unsafe { (*self.shared).queue.drain(..).collect() }
        }

        /// Port of `net_send()`.
        pub fn send(&self, _ch: NetChannel, data: &[u8]) {
            unsafe {
                let c = &*self.shared;
                if self.ws <= 0 || !c.open || c.closed || data.is_empty() {
                    return;
                }
                let r = emscripten_websocket_send_binary(
                    self.ws,
                    data.as_ptr() as *mut c_void,
                    data.len() as u32,
                );
                if r != EMSCRIPTEN_RESULT_SUCCESS {
                    eprintln!("[net] send failed ({})", r);
                }
            }
        }

        /// Port of `net_close()`: status 1000, empty reason. The conn
        /// stays alive so the close event can still surface via poll
        /// (in C: "the net_client owner frees it after on_close
        /// fires"); Drop is the free.
        pub fn close(&mut self) {
            unsafe {
                if self.ws <= 0 || (*self.shared).closed {
                    return;
                }
                emscripten_websocket_close(self.ws, 1000, b"\0".as_ptr() as *const c_char);
            }
        }
    }

    impl Drop for NetConn {
        fn drop(&mut self) {
            /* Divergence from C (which leaks the conn struct on
             * disconnect): unhook the four callbacks so the browser
             * can't call into freed memory, then free the shared box. */
            unsafe {
                if self.ws > 0 {
                    let null = std::ptr::null_mut();
                    emscripten_websocket_set_onopen_callback_on_thread(
                        self.ws,
                        null,
                        None,
                        EM_CALLBACK_THREAD_CONTEXT_CALLING_THREAD,
                    );
                    emscripten_websocket_set_onmessage_callback_on_thread(
                        self.ws,
                        null,
                        None,
                        EM_CALLBACK_THREAD_CONTEXT_CALLING_THREAD,
                    );
                    emscripten_websocket_set_onerror_callback_on_thread(
                        self.ws,
                        null,
                        None,
                        EM_CALLBACK_THREAD_CONTEXT_CALLING_THREAD,
                    );
                    emscripten_websocket_set_onclose_callback_on_thread(
                        self.ws,
                        null,
                        None,
                        EM_CALLBACK_THREAD_CONTEXT_CALLING_THREAD,
                    );
                }
                drop(Box::from_raw(self.shared));
            }
        }
    }
}

/* ================================================================== */
/* Native backend - port of the client half of net_transport_ws.c,     */
/* via the same tokio/tokio-tungstenite mapping the server crate uses. */
/* ================================================================== */

#[cfg(not(target_os = "emscripten"))]
mod native {
    use super::{NetChannel, NetCloseReason, NetEvent};
    use std::sync::Arc;
    use std::time::Duration;

    use futures_util::{SinkExt, StreamExt};
    use tokio::runtime::Runtime;
    use tokio::sync::{mpsc, oneshot, Notify};
    use tokio_tungstenite::tungstenite::client::IntoClientRequest;
    use tokio_tungstenite::tungstenite::http::HeaderValue;
    use tokio_tungstenite::tungstenite::protocol::frame::coding::CloseCode;
    use tokio_tungstenite::tungstenite::protocol::{CloseFrame, WebSocketConfig};
    use tokio_tungstenite::tungstenite::Message;

    /// C `NET_SEND_QUEUE_CAP` - per-connection outbound queue depth.
    const NET_SEND_QUEUE_CAP: usize = 64;

    /// C `rx_buffer_size` / `tx_packet_size` (64 KiB) on the lws
    /// protocol entries.
    const NET_WS_BUFFER_SIZE: usize = 64 * 1024;

    /// `ccinfo.protocol` in the C client-connect path.
    const WS_PROTO_CLIENT: &str = "tenebris-net-client";

    /// Result of the C `parse_ws_url` splitter.
    struct ParsedWsUrl {
        host: String,
        port: i32,
        path: String,
        ssl: bool,
    }

    /// Port of `parse_ws_url` (net_transport_ws.c): ws://host[:port]
    /// [/path] or wss://..., no userinfo, no IPv6 brackets. C atoi
    /// semantics for the port (no digits -> 0). Same 256-byte caps.
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

    fn ws_config() -> WebSocketConfig {
        let mut c = WebSocketConfig::default();
        c.max_message_size = Some(NET_WS_BUFFER_SIZE);
        c.max_frame_size = Some(NET_WS_BUFFER_SIZE);
        c
    }

    /// Port of `net_conn_t` (native client backend): one outbound
    /// connection with its own private context (here: its own
    /// single-worker runtime, the analogue of the C client's
    /// per-connection lws context).
    pub struct NetConn {
        rt: Option<Runtime>,
        events: mpsc::UnboundedReceiver<NetEvent>,
        out: mpsc::Sender<Vec<u8>>,
        close: Arc<Notify>,
        done: Option<oneshot::Receiver<()>>,
    }

    impl NetConn {
        /// Port of `net_connect()`. Returns `None` on a malformed URL
        /// (C prints the same line and returns NULL). The connection
        /// proceeds in the background: expect [`NetEvent::Open`] from
        /// `poll` on success, or `Close { reason: ProtocolErr }` on
        /// handshake failure (C: `CLIENT_CONNECTION_ERROR`).
        ///
        /// wss:// parses (as in C) but fails the handshake unless a
        /// TLS feature is compiled in; the failure surfaces as
        /// ProtocolErr.
        pub fn connect(url: &str) -> Option<NetConn> {
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
            Some(NetConn {
                rt: Some(rt),
                events: ev_rx,
                out: out_tx,
                close,
                done: Some(done_rx),
            })
        }

        /// Port of `net_poll_client()`: non-blocking drain, the
        /// counterpart of the lws service pass.
        pub fn poll(&mut self) -> Vec<NetEvent> {
            let mut out = Vec::new();
            while let Ok(ev) = self.events.try_recv() {
                out.push(ev);
            }
            out
        }

        /// Port of `net_send()`. Copies the bytes, queues one binary
        /// WS frame. Drops with the C stderr line when the 64-entry
        /// queue is full.
        pub fn send(&self, _ch: NetChannel, data: &[u8]) {
            if data.is_empty() {
                return;
            }
            if let Err(mpsc::error::TrySendError::Full(_)) = self.out.try_send(data.to_vec()) {
                eprintln!("[net] send queue full, dropping {} bytes", data.len());
            }
        }

        /// Port of `net_close()`: signal a normal (1000) close, give
        /// the pump a short grace window to flush the close frame (the
        /// counterpart of lws_context_destroy's synchronous final
        /// service pass), then tear the runtime down.
        pub fn close(&mut self) {
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

    impl Drop for NetConn {
        fn drop(&mut self) {
            if let Some(rt) = self.rt.take() {
                rt.shutdown_background();
            }
        }
    }

    async fn client_task(
        url: String,
        events: mpsc::UnboundedSender<NetEvent>,
        mut out_rx: mpsc::Receiver<Vec<u8>>,
        close: Arc<Notify>,
        done_tx: oneshot::Sender<()>,
    ) {
        let req = match url.as_str().into_client_request() {
            Ok(mut r) => {
                /* ccinfo.protocol = "tenebris-net-client" in C. */
                r.headers_mut().insert(
                    "Sec-WebSocket-Protocol",
                    HeaderValue::from_static(WS_PROTO_CLIENT),
                );
                r
            }
            Err(_) => {
                let _ = events.send(NetEvent::Close {
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
                /* LWS_CALLBACK_CLIENT_CONNECTION_ERROR. */
                let _ = events.send(NetEvent::Close {
                    reason: NetCloseReason::ProtocolErr,
                });
                let _ = done_tx.send(());
                return;
            }
        };

        /* LWS_CALLBACK_CLIENT_ESTABLISHED. */
        let _ = events.send(NetEvent::Open);

        let (mut sink, mut src) = ws.split();
        loop {
            tokio::select! {
                item = src.next() => match item {
                    Some(Ok(Message::Binary(b))) => {
                        let _ = events.send(NetEvent::Msg {
                            channel: NetChannel::Reliable,
                            data: b,
                        });
                    }
                    Some(Ok(Message::Text(t))) => {
                        /* The native lws backend fires RECEIVE for
                         * text frames too; pass the bytes up. (The
                         * wasm backend skips text - each half mirrors
                         * its own C backend.) */
                        let _ = events.send(NetEvent::Msg {
                            channel: NetChannel::Reliable,
                            data: t.into_bytes(),
                        });
                    }
                    Some(Ok(Message::Close(_))) => {}
                    Some(Ok(_)) => {} /* ping/pong handled by tungstenite */
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

        /* LWS_CALLBACK_CLIENT_CLOSED, single-fire by construction. */
        let _ = events.send(NetEvent::Close {
            reason: NetCloseReason::RemoteGone,
        });
        let _ = done_tx.send(());
    }

    /* ============================================================== */

    #[cfg(test)]
    mod tests {
        use super::super::{NetChannel, NetCloseReason, NetEvent};
        use super::*;
        use futures_util::{SinkExt, StreamExt};
        use std::time::{Duration, Instant};
        use tenebris_core::proto;

        const TEST_TIMEOUT: Duration = Duration::from_secs(10);

        fn poll_until<F>(c: &mut NetConn, mut pred: F) -> Vec<NetEvent>
        where
            F: FnMut(&NetEvent) -> bool,
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
                    "poll_until timed out; events so far: {:?}",
                    got
                );
                std::thread::sleep(Duration::from_millis(5));
            }
        }

        /// Tiny tokio-tungstenite echo server: accepts one connection
        /// and echoes every binary frame back. Echoes the offered
        /// subprotocol like the real server transport does (tungstenite
        /// clients reject a server that ignores a requested protocol).
        struct EchoServer {
            url: String,
            _rt: tokio::runtime::Runtime,
        }

        fn spawn_echo() -> EchoServer {
            let rt = tokio::runtime::Builder::new_multi_thread()
                .worker_threads(1)
                .enable_all()
                .build()
                .unwrap();
            let std_l = std::net::TcpListener::bind(("127.0.0.1", 0)).unwrap();
            std_l.set_nonblocking(true).unwrap();
            let port = std_l.local_addr().unwrap().port();
            rt.spawn(async move {
                use tokio_tungstenite::tungstenite::handshake::server::{Request, Response};
                let l = tokio::net::TcpListener::from_std(std_l).unwrap();
                let Ok((s, _)) = l.accept().await else { return };
                let echo_proto = |req: &Request, mut resp: Response| {
                    if let Some(p) = req.headers().get("Sec-WebSocket-Protocol") {
                        resp.headers_mut()
                            .insert("Sec-WebSocket-Protocol", p.clone());
                    }
                    Ok(resp)
                };
                let Ok(ws) = tokio_tungstenite::accept_hdr_async(s, echo_proto).await else {
                    return;
                };
                let (mut sink, mut src) = ws.split();
                while let Some(Ok(m)) = src.next().await {
                    if let Message::Binary(b) = m {
                        if sink.send(Message::Binary(b)).await.is_err() {
                            break;
                        }
                    }
                }
            });
            EchoServer {
                url: format!("ws://127.0.0.1:{}/", port),
                _rt: rt,
            }
        }

        fn sync_tick_bytes(seq: u32) -> Vec<u8> {
            let m = proto::MsgSyncTick { seq_id: seq };
            let mut buf = vec![0u8; proto::MSG_HEADER_SIZE + proto::MSG_SYNC_TICK_WIRE_SIZE];
            let n = proto::write_sync_tick(&mut buf, &m);
            assert_eq!(n, buf.len());
            buf
        }

        #[test]
        fn loopback_echo_roundtrip() {
            let srv = spawn_echo();
            let mut c = NetConn::connect(&srv.url).expect("connect");

            poll_until(&mut c, |e| matches!(e, NetEvent::Open));

            /* UNRELIABLE silently maps onto the reliable WS stream. */
            let bytes = sync_tick_bytes(0xDEAD_BEEF);
            c.send(NetChannel::Unreliable, &bytes);

            let evs = poll_until(&mut c, |e| matches!(e, NetEvent::Msg { .. }));
            let NetEvent::Msg { channel, data } = evs.last().unwrap() else {
                unreachable!()
            };
            assert_eq!(*channel, NetChannel::Reliable);
            assert_eq!(data, &bytes);
            /* The echoed proto frame still decodes byte-exactly. */
            let hdr = proto::read_header(data).unwrap();
            assert_eq!(hdr.kind, proto::MsgKind::SyncTick as u16);
            let m = proto::read_sync_tick(&data[proto::MSG_HEADER_SIZE..]).unwrap();
            assert_eq!(m.seq_id, 0xDEAD_BEEF);

            /* Server goes away -> Close{RemoteGone}, fired once. */
            drop(srv);
            let evs = poll_until(&mut c, |e| matches!(e, NetEvent::Close { .. }));
            let NetEvent::Close { reason } = evs.last().unwrap() else {
                unreachable!()
            };
            assert_eq!(*reason, NetCloseReason::RemoteGone);
            c.close();
        }

        #[test]
        fn connection_refused_surfaces_protocol_err() {
            /* Bind an ephemeral port, then free it so the connect is
             * refused (the C CLIENT_CONNECTION_ERROR path). */
            let port = {
                let l = std::net::TcpListener::bind(("127.0.0.1", 0)).unwrap();
                l.local_addr().unwrap().port()
            };
            let mut c =
                NetConn::connect(&format!("ws://127.0.0.1:{}/", port)).expect("connect starts");
            let evs = poll_until(&mut c, |e| matches!(e, NetEvent::Close { .. }));
            let NetEvent::Close { reason } = evs.last().unwrap() else {
                unreachable!()
            };
            assert_eq!(*reason, NetCloseReason::ProtocolErr);
        }

        #[test]
        fn bad_scheme_returns_none() {
            /* C parse_ws_url rejects non-ws schemes -> net_connect
             * returns NULL. */
            assert!(NetConn::connect("http://example.com/").is_none());
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

            /* C atoi: ':' with no digits -> port 0. */
            let p = parse_ws_url("ws://h:/x").unwrap();
            assert_eq!(p.port, 0);
            assert_eq!(p.path, "/x");

            assert!(parse_ws_url("http://h/").is_none());
            assert!(parse_ws_url("ws://").is_none());
        }
    }
}
