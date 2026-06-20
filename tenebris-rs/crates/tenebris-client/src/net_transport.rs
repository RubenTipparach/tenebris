//! Client-side transport (native desktop).
//!
//! The C native client reuses the *client half* of
//! `tenebris-c/src/server/net_transport_ws.c` (libwebsockets in
//! client mode - same file serves both call sites, per the comment
//! in tenebris-c/CMakeLists.txt). The Rust port mirrors the
//! tenebris-server crate's tokio + tokio-tungstenite `NetClient`
//! (crates/tenebris-server/src/transport.rs) without importing the
//! server crate: a private one-worker runtime owns the socket and
//! pushes events into a queue the game thread drains.
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
//!   and drops the unsafe user-pointer plumbing).
//! - `net_conn_user` / `net_conn_set_user` -> not ported. net_client
//!   passes a NULL user pointer in C; Rust ownership replaces it.
//! - Server half (`net_listen` / `net_poll` / `net_close_listener`):
//!   not ported. The Rust client crate simply has no callers - the
//!   real listener lives in tenebris-server.
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

pub use native::NetConn;

/* ================================================================== */
/* Native backend - port of the client half of net_transport_ws.c,     */
/* via the same tokio/tokio-tungstenite mapping the server crate uses. */
/* ================================================================== */

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
                         * text frames too; pass the bytes up. */
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
