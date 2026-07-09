//! Port of `tenebris-c/src/client/net_client.{c,h}`.
//!
//! High-level client networking module. Owns the connection to the
//! dedicated server: opens the socket, runs the HELLO/WELCOME
//! handshake, then exposes the welcome data (player id, spawn coords,
//! body id) to the rest of the client. Also: edit-ack round-trip
//! tracking, name cache, snapshot ingestion, chunk/torch/water diff
//! application, chat hooks, sync tick/ack, desync notices, the /saves
//! audit and the /saves/body bulk-fetch bookkeeping.
//!
//! # Renames (per PORTING.md rule 4 - module prefix dropped)
//!
//! - `net_client_connect()`            -> `connect()`
//! - `net_client_set_profile()`        -> `set_profile()` (C NULL args == "")
//! - `net_client_name_for_id()`        -> `name_for_id()` (Option<String>
//!   replaces the NULL-able pointer)
//! - `net_client_send_chat()`          -> `send_chat()`
//! - `net_client_tick()`               -> `tick()`
//! - `net_client_disconnect()`         -> `disconnect()`
//! - `net_client_state()`              -> `state()`
//! - `net_client_welcome()`            -> `welcome()` (returns a copy)
//! - `net_client_can_retry()`          -> `can_retry()`
//! - `net_client_error_message()`      -> `error_message()` (Option<String>)
//! - `net_client_last_desync()`        -> `last_desync()` (returns the
//!   (kind, seconds_ago, block_type) tuple instead of out params;
//!   seconds_ago is -1.0 when the server never flagged us, like C)
//! - `net_client_send_player_state()`  -> `send_player_state()`
//! - `net_client_send_edit()`          -> `send_edit()` (kind: u8, the
//!   proto::PLAYER_CMD_* values)
//! - `net_client_send_inventory_state()` -> `send_inventory_state()`
//! - `net_client_take_pending_inventory()` -> `take_pending_inventory()`
//!   (returns Option<(slot_type, slot_count, selected)>)
//! - `net_client_send_torch()`         -> `send_torch()`
//! - `net_client_fetch_body_saves()`   -> `fetch_body_saves()`
//! - `net_client_resync_body_saves()`  -> `resync_body_saves()`
//! - `net_client_spawn_body_ready()`   -> `spawn_body_ready()` (called
//!   by `player_ctrl::update` to freeze movement during the join race)
//! - `net_client_saves_audit_cb()`     -> `saves_audit_cb()` (web fetch
//!   re-entry; EMSCRIPTEN_KEEPALIVE drops out)
//! - `net_client_body_blob_cb()`       -> `body_blob_cb()` (same)
//!
//! # Seams for not-yet-ported modules
//!
//! - `renderer_world_for_body()` - forwarded to
//!   `renderer::world_for_body()`; the renderer owns the
//!   body_id -> World registry (`renderer::register_world` fills it,
//!   net_client only reads), exactly like the C.
//! - `tenebris_get_local_player_pos()` / `..._body_id()` - externs
//!   provided by main_web.c. Ported as the provider registered via
//!   [`set_local_player_provider`] (app::init registers it at boot).
//! - `EM_JS(net_client_js_fetch_saves)` / `EM_JS(net_client_js_fetch_body)`
//!   - browser `fetch()` glue compiled by EM_JS in the C. The JS side
//!   lives in `web/library_tenebris.js` (--js-library); native builds
//!   are a no-op exactly like the C `#else` branch.
//!
//! `stm_now()` / `stm_sec()` are reached through the `now_sec()` seam
//! (sokol time in production, settable clock in tests - same pattern
//! as remote_players.rs). Timestamps are stored as f64 seconds; 0.0
//! is the C's "never / slot free" sentinel.

// Wired into the app loop when the main_web port lands (final client
// wave); until then consumed by tests only.
#![allow(dead_code)]

use crate::chat;
use crate::net_transport::{NetChannel, NetCloseReason, NetConn, NetEvent};
use crate::renderer;
use crate::remote_players::{self, RemotePose, MAX_PLAYERS as REMOTE_PLAYERS_MAX};
use crate::torch;
use std::cell::{Cell, RefCell};
use std::rc::Rc;
use tenebris_core::block_entity;
use tenebris_core::blocks::Block;
use tenebris_core::farming;
use tenebris_core::math::{dvec3_make, vec3_make, DVec3};
use tenebris_core::proto::{self, MsgKind};
use tenebris_core::world::{World, WORLD_MAX_DEPTH};
use tenebris_core::world_water;

use std::collections::{HashMap, HashSet};

const NET_NAME_MAX: usize = 32;
const NET_NAME_CACHE_SIZE: usize = 32;

/* Per-player throttle for PLAYER_INFO_REQUEST retries. Each unknown
 * id in the F1 / nameplate path triggers one request and re-sends
 * once every NET_NAME_REQUEST_RETRY_S seconds while still unknown.
 * Sized to match the snapshot cap; one slot per concurrently-unknown
 * peer is plenty for a 16-slot room.
 *
 * After NET_NAME_REQUEST_WARN_AT attempts with no PLAYER_INFO reply
 * the client logs a console.error so a player who's stuck on id-N
 * forever can see why. After NET_NAME_REQUEST_MAX_TRIES we give up
 * retrying and leave the id as id-N - the server is either dropping
 * the request or doesn't know that peer anymore. */
const NET_NAME_REQ_TABLE_SIZE: usize = 16;
const NET_NAME_REQUEST_RETRY_S: f64 = 2.0;
const NET_NAME_REQUEST_WARN_AT: i32 = 3; /* ~6 s */
const NET_NAME_REQUEST_MAX_TRIES: i32 = 5; /* ~10 s */

/* Block-edit ack tracking. Every PLAYER_CMD we send is held here until
 * the server's CHUNK_DIFF echo confirms it; missing acks are logged as
 * errors so we surface "the server lost my edit" the moment it happens
 * instead of waiting for the player to log back in and notice missing
 * blocks. Cap is comfortably larger than any plausible burst within
 * the timeout window (creative-mode click spam tops out around 10/s). */
const NET_PENDING_EDITS_MAX: usize = 128;
const NET_EDIT_ACK_TIMEOUT_S: f64 = 5.0;

/* Sized to one slot per body the server can replay edits for - matches
 * SERVER_MAX_BODIES on the server side. The counters are dense, not
 * sparse: every body the client ever sees a diff for gets one slot
 * for the rest of the session. */
const NET_BODY_COVERAGE_MAX: usize = 32;

/* /saves audit timing. The audit kicks once per connection after
 * NET_AUDIT_MIN_READY_S in NET_CLIENT_READY AND NET_AUDIT_QUIET_S
 * since the last CHUNK_DIFF. Both gates matter: the min-ready prevents
 * the audit from firing before the server even sends its first
 * replay batch on a slow link, and the quiet gate prevents firing
 * mid-stream when the server's still pushing hundreds of diffs. */
const NET_AUDIT_MIN_READY_S: f64 = 3.0;
const NET_AUDIT_QUIET_S: f64 = 2.0;

/* Distance from the player below which an audit miss is logged as
 * an ERROR (the tile is in /saves but no CHUNK_DIFF for it ever
 * arrived AND the player is close enough that the missing blocks
 * would be visible). Misses outside this radius drop to a count-only
 * summary so a flyby of a 160k-tile planet doesn't spam the console
 * with every tile on the far side. */
const NET_AUDIT_NEAR_RADIUS_M: f64 = 256.0;

/* C buffer budgets (snprintf truncation points). */
const PROFILE_TOKEN_MAX: usize = 32; /* char[33] */
const PROFILE_NAME_MAX: usize = NET_NAME_MAX - 1; /* char[32] */
const ROOM_CODE_MAX: usize = 8; /* char[9] */
const ERROR_MESSAGE_MAX: usize = 95; /* char[96] */
const SERVER_URL_MAX: usize = 159; /* char[160] */

/// Port of `net_client_state_t`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum NetClientState {
    /// never called connect()
    #[default]
    Idle = 0,
    /// socket opening
    Connecting = 1,
    /// socket open, HELLO sent
    Handshake = 2,
    /// WELCOME received
    Ready = 3,
    /// socket dead / refused
    Error = 4,
}

/// Port of `net_client_welcome_t`.
#[derive(Debug, Clone, Copy, PartialEq, Default)]
pub struct NetClientWelcome {
    pub player_id: u32,
    pub world_seed: u64,
    pub spawn_x: f64,
    pub spawn_y: f64,
    pub spawn_z: f64,
    pub body_id: u32,
    pub spawn_yaw: f32,
    pub spawn_pitch: f32,
}

/// Port of `net_desync_kind_t`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum NetDesyncKind {
    #[default]
    None = 0,
    InsideSolid = 1,
}

/// Port of `net_name_entry_t`.
#[derive(Debug, Clone, Default)]
struct NameEntry {
    player_id: u32,
    name: String, /* capped at NET_NAME_MAX-1 bytes */
}

/// Port of `net_name_request_t`.
#[derive(Debug, Clone, Copy, Default)]
struct NameRequest {
    player_id: u32,
    last_request_s: f64, /* 0 == never */
    attempts: i32,       /* how many requests we've sent */
    nacked: bool,        /* server replied "unknown id" - stop retrying */
    warned: bool,        /* console.error already emitted, don't spam */
}

/// One outstanding block-edit round trip (the anonymous struct in the
/// C `pending_edits[]` array).
#[derive(Debug, Clone, Copy, Default)]
struct PendingEdit {
    body_id: u32,
    tile_idx: u32,
    depth: u16,
    expected_block: u16,
    cmd_kind: u8,
    sent_time: f64, /* seconds; 0 means slot free */
    seq: u32,
}

/// Per-body CHUNK_DIFF coverage tally (the anonymous struct in the C
/// `body_coverage[]` array). `tile_bits` is empty until allocated
/// (the C NULL pointer).
#[derive(Debug, Clone, Default)]
struct BodyCoverage {
    body_id: u32,
    edits_seen: u32,     /* total entries across all diffs */
    unique_tiles: u32,   /* count of distinct tile ids seen */
    last_tile_seen: u32, /* dedup tip for back-to-back same-tile diffs */
    last_tile_valid: bool,
    tile_bits: Vec<u8>, /* bit per tile_idx, empty until allocated */
    world_tile_count: i32,
}

/// Per-body /saves/body fetch tracking (the anonymous struct in the C
/// `body_fetch[]` array). state: 0 idle, 1 in-flight, 2 done.
#[derive(Debug, Clone, Copy, Default)]
struct BodyFetch {
    body_id: u32,
    state: u8,
}

/// Port of `net_client_t` (the module-static `C`).
struct Client {
    state: NetClientState,
    conn: Option<NetConn>,
    welcome: NetClientWelcome,
    /* Profile sent in HELLO. Token is the persistent identifier;
     * name is the friendly display string other clients see. */
    profile_token: String,
    profile_name: String,
    /* Room code to join (8 chars max). Empty = public room. */
    room_code: String,
    /* Name cache: player_id -> name, populated from MSG_PLAYER_INFO
     * (and from WELCOME for the local player). The F1 panel reads
     * name_for_id to render rows. */
    names: Vec<NameEntry>, /* capped at NET_NAME_CACHE_SIZE */
    /* Pending PLAYER_INFO_REQUEST throttle. */
    name_requests: Vec<NameRequest>, /* capped at NET_NAME_REQ_TABLE_SIZE */
    /* Most recent DESYNC notice from the server. last_desync_time is
     * a now_sec() stamp (0 = never). The HUD compares against the
     * clock and fades the warning out after a few seconds. */
    last_desync: NetDesyncKind,
    last_desync_block: u32,
    last_desync_time: f64,
    /* Last connection-failure reason, populated by on_close (or by
     * connect() when NetConn::connect returns None). Plain ASCII,
     * empty until something fails. The menu reads this to render the
     * in-game error dialog. */
    error_message: String,
    /* True after a server-issued MSG_KICK with a terminal reason
     * (version mismatch, etc). The menu retry loop reads this and
     * goes straight to the disconnected popup rather than retrying
     * a connection that will never succeed. Cleared on every
     * connect() call. */
    no_retry: bool,
    /* Pending inventory restore from server. Set when MSG_INVENTORY_STATE
     * arrives; cleared by take_pending_inventory. */
    inv_pending: bool,
    inv_slot_type: [u16; 9],
    inv_slot_count: [i16; 9],
    inv_selected: u8,
    /* Outstanding block-edit round-trip table - see the C comment
     * block; semantics identical (ack via CHUNK_DIFF echo, timeout
     * logged as ERROR, oldest-first ack matching). */
    pending_edits: [PendingEdit; NET_PENDING_EDITS_MAX],
    next_edit_seq: u32,
    edits_sent_total: u32,
    edits_acked_total: u32,
    edits_timed_out_total: u32,
    /* Per-body running tally of unique tile columns seen in
     * CHUNK_DIFF replays this session - drives the /saves audit. */
    body_coverage: Vec<BodyCoverage>, /* capped at NET_BODY_COVERAGE_MAX */
    /* /saves audit state. */
    server_url: String,
    ready_time: f64,           /* now_sec() when state became READY */
    last_chunk_diff_time: f64, /* now_sec() of last CHUNK_DIFF received */
    audit_triggered: bool,     /* true once fetch fired */
    /* Per-body HTTP fetch tracking (idle / in-flight / done). */
    body_fetch: Vec<BodyFetch>, /* capped at NET_BODY_COVERAGE_MAX */
    /* Server-driven sync coordination - see the C comment block. */
    pending_sync_seq: u32,
    pending_sync_active: bool,
    /* ---- MP-parity extension state (kinds 29..34). ---- */
    /* Bag + hunger replay pending from the server (applied by app). */
    bag_pending: bool,
    bag_items: [u16; proto::MSG_BAG_SLOTS],
    bag_counts: [u16; proto::MSG_BAG_SLOTS],
    bag_hunger: f32,
    /* Kill credit banked until the app adds the meat to the bag. */
    meat_pending: u16,
    /* Outbound block-entity shadow: last record sent OR received per
     * (body, tile, depth); sync_block_entities diffs against it. */
    bent_shadow: HashMap<(u32, i32, i32), String>,
    /* Server crop / animal state per body; `dirty` marks bodies whose
     * lists changed since the app last took them. */
    crops_by_body: HashMap<u32, Vec<farming::Crop>>,
    crops_dirty: HashSet<u32>,
    animals_by_body: HashMap<u32, Vec<(u32, u8, DVec3, DVec3)>>,
    animals_dirty: HashSet<u32>,
}

impl Default for Client {
    fn default() -> Self {
        Client {
            state: NetClientState::Idle,
            conn: None,
            welcome: NetClientWelcome::default(),
            profile_token: String::new(),
            profile_name: String::new(),
            room_code: String::new(),
            names: Vec::new(),
            name_requests: Vec::new(),
            last_desync: NetDesyncKind::None,
            last_desync_block: 0,
            last_desync_time: 0.0,
            error_message: String::new(),
            no_retry: false,
            inv_pending: false,
            inv_slot_type: [0; 9],
            inv_slot_count: [0; 9],
            inv_selected: 0,
            pending_edits: [PendingEdit::default(); NET_PENDING_EDITS_MAX],
            next_edit_seq: 0,
            edits_sent_total: 0,
            edits_acked_total: 0,
            edits_timed_out_total: 0,
            body_coverage: Vec::new(),
            server_url: String::new(),
            ready_time: 0.0,
            last_chunk_diff_time: 0.0,
            audit_triggered: false,
            body_fetch: Vec::new(),
            pending_sync_seq: 0,
            pending_sync_active: false,
            bag_pending: false,
            bag_items: [0; proto::MSG_BAG_SLOTS],
            bag_counts: [0; proto::MSG_BAG_SLOTS],
            bag_hunger: 0.0,
            meat_pending: 0,
            bent_shadow: HashMap::new(),
            crops_by_body: HashMap::new(),
            crops_dirty: HashSet::new(),
            animals_by_body: HashMap::new(),
            animals_dirty: HashSet::new(),
        }
    }
}

thread_local! {
    static C: RefCell<Client> = RefCell::new(Client::default());
}

/* ------------------------------------------------------------------ */
/* Cross-module seams.                                                  */
/* ------------------------------------------------------------------ */

/// Port of the `renderer_world_for_body()` call sites in this file.
/// The renderer owns the body_id -> World registry
/// (`renderer::register_world` fills it; net_client only reads).
fn world_for_body(body_id: u32) -> Option<Rc<RefCell<World>>> {
    renderer::world_for_body(body_id)
}

/* C: extern dvec3_t tenebris_get_local_player_pos(void) and extern
 * uint32_t tenebris_get_local_player_body_id(void), provided by
 * main_web.c so the /saves audit can score distance from the camera
 * to each persisted tile. app::init registers the provider; unset =
 * origin on body 0 (the audit then buckets every miss as "other
 * body" / far). */
type LocalPlayerFn = fn() -> (DVec3, u32);
thread_local! {
    static LOCAL_PLAYER: Cell<Option<LocalPlayerFn>> = const { Cell::new(None) };
}

pub fn set_local_player_provider(f: LocalPlayerFn) {
    LOCAL_PLAYER.with(|c| c.set(Some(f)));
}

fn local_player() -> (DVec3, u32) {
    match LOCAL_PLAYER.with(|c| c.get()) {
        Some(f) => f(),
        None => (dvec3_make(0.0, 0.0, 0.0), 0),
    }
}

/* --------------------------------------------------------------------- */
/* sokol time seam - same pattern as remote_players.rs.                   */

#[cfg(not(test))]
fn now_sec() -> f64 {
    sokol::time::sec(sokol::time::now())
}

#[cfg(test)]
use test_doubles::now_sec;

#[cfg(test)]
mod test_doubles {
    use std::cell::Cell;

    thread_local! {
        pub static NOW_S: Cell<f64> = const { Cell::new(0.0) };
    }

    pub fn now_sec() -> f64 {
        NOW_S.with(|c| c.get())
    }

    pub fn set_now(s: f64) {
        NOW_S.with(|c| c.set(s));
    }
}

/* ------------------------------------------------------------------ */
/* Small string helpers (the snprintf / fixed-buffer idioms).           */
/* ------------------------------------------------------------------ */

/// snprintf-style byte truncation; backs off to a char boundary so the
/// String stays valid - identical for the ASCII wire.
fn trunc_bytes(s: &str, max: usize) -> &str {
    if s.len() <= max {
        return s;
    }
    let mut end = max;
    while !s.is_char_boundary(end) {
        end -= 1;
    }
    &s[..end]
}

/// Read a null-padded fixed-size wire field as a string (the C
/// `memcpy` + `text[N] = 0` idiom).
fn fixed_str(bytes: &[u8]) -> String {
    let end = bytes.iter().position(|&b| b == 0).unwrap_or(bytes.len());
    String::from_utf8_lossy(&bytes[..end]).into_owned()
}

/// Copy at most `dst.len()` bytes of `s` into a null-padded wire field
/// (the C `strnlen` + `memcpy` idiom; no NUL when full).
fn copy_padded(dst: &mut [u8], s: &str) {
    let n = s.len().min(dst.len());
    dst[..n].copy_from_slice(&s.as_bytes()[..n]);
}

/// Send on the connection if there is one (the C `net_send(C.conn,..)`
/// which no-ops on a NULL conn inside the transport).
fn send_raw(c: &Client, ch: NetChannel, data: &[u8]) {
    if let Some(conn) = &c.conn {
        conn.send(ch, data);
    }
}

/* ------------------------------------------------------------------ */
/* Transport callbacks. tick() drains the transport's event queue and
 * fires these on the main thread, so they can mutate the state
 * directly - same single-threaded model as the C. */
/* ------------------------------------------------------------------ */

fn cache_name(c: &mut Client, player_id: u32, name: &str) {
    if name.is_empty() {
        return;
    }
    /* Update existing entry if present. */
    for e in c.names.iter_mut() {
        if e.player_id == player_id {
            e.name = trunc_bytes(name, NET_NAME_MAX - 1).to_string();
            return;
        }
    }
    if c.names.len() < NET_NAME_CACHE_SIZE {
        c.names.push(NameEntry {
            player_id,
            name: trunc_bytes(name, NET_NAME_MAX - 1).to_string(),
        });
    }
}

/// Fire a PLAYER_INFO_REQUEST for player_id, but only if our last
/// request for that id is older than NET_NAME_REQUEST_RETRY_S. The
/// F1 panel can therefore call name_for_id every frame on a missing
/// id without spamming the server.
fn request_name(c: &mut Client, player_id: u32) {
    if c.state != NetClientState::Ready || c.conn.is_none() {
        return;
    }
    if player_id == 0 {
        return;
    }
    let now = now_sec();
    let mut idx = c
        .name_requests
        .iter()
        .position(|r| r.player_id == player_id);
    if idx.is_none() {
        if c.name_requests.len() >= NET_NAME_REQ_TABLE_SIZE {
            return;
        }
        c.name_requests.push(NameRequest {
            player_id,
            last_request_s: 0.0,
            attempts: 0,
            nacked: false,
            warned: false,
        });
        idx = Some(c.name_requests.len() - 1);
    }
    let slot = &mut c.name_requests[idx.unwrap()];
    if slot.nacked {
        return; /* server already said "unknown" */
    }
    if slot.attempts >= NET_NAME_REQUEST_MAX_TRIES {
        return;
    }
    if slot.last_request_s != 0.0 && now - slot.last_request_s < NET_NAME_REQUEST_RETRY_S {
        return;
    }
    slot.last_request_s = now;
    slot.attempts += 1;
    if !slot.warned && slot.attempts >= NET_NAME_REQUEST_WARN_AT {
        eprintln!(
            "[net-client] WARN: no PLAYER_INFO for player_id={} after {} \
             requests (~{:.0}s). Server may not know this peer or \
             responses are being dropped.",
            player_id,
            slot.attempts,
            slot.attempts as f64 * NET_NAME_REQUEST_RETRY_S
        );
        slot.warned = true;
    }
    let req = proto::MsgPlayerInfoRequest {
        player_id,
        reserved: 0,
    };
    let mut buf = [0u8; proto::MSG_HEADER_SIZE + proto::MSG_PLAYER_INFO_REQUEST_WIRE_SIZE];
    let n = proto::write_player_info_request(&mut buf, &req);
    if n == 0 {
        return;
    }
    send_raw(c, NetChannel::Reliable, &buf[..n]);
}

/// Internal half of `name_for_id` so message handlers holding the
/// state borrow can resolve names without re-borrowing.
fn name_for_id_inner(c: &mut Client, player_id: u32) -> Option<String> {
    for e in &c.names {
        if e.player_id == player_id {
            return Some(e.name.clone());
        }
    }
    /* Cache miss: kick off a (throttled) PLAYER_INFO_REQUEST so the
     * next render after the server replies has a real name. Returning
     * None right now is fine - callers already render id-N fallback. */
    request_name(c, player_id);
    None
}

/// Port of `net_client_name_for_id()`.
pub fn name_for_id(player_id: u32) -> Option<String> {
    C.with(|cell| name_for_id_inner(&mut cell.borrow_mut(), player_id))
}

/// Port of `net_client_set_profile()`. C allowed NULL for any arg;
/// pass "" for the same effect (anonymous guest / public room).
pub fn set_profile(token: &str, name: &str, room_code: &str) {
    C.with(|cell| {
        let c = &mut *cell.borrow_mut();
        c.profile_token = trunc_bytes(token, PROFILE_TOKEN_MAX).to_string();
        c.profile_name = trunc_bytes(name, PROFILE_NAME_MAX).to_string();
        c.room_code = trunc_bytes(room_code, ROOM_CODE_MAX).to_string();
    });
}

fn send_hello(c: &mut Client) {
    let mut h = proto::MsgHello::default();
    h.client_version = proto::TENEBRIS_PROTOCOL_VERSION;
    /* token: copy at most MSG_HELLO_TOKEN_LEN bytes (no null on wire). */
    copy_padded(&mut h.token, &c.profile_token);
    /* name: same - null-padded fixed-32. */
    copy_padded(&mut h.name, &c.profile_name);
    /* room: null-padded fixed-8. Empty string = public room. */
    copy_padded(&mut h.room_code, &c.room_code);
    let mut buf = [0u8; proto::MSG_HEADER_SIZE + proto::MSG_HELLO_WIRE_SIZE];
    let n = proto::write_hello(&mut buf, &h);
    if n == 0 {
        return;
    }
    send_raw(c, NetChannel::Reliable, &buf[..n]);
    c.state = NetClientState::Handshake;
    println!(
        "[net-client] HELLO sent (name='{}' room='{}' {})",
        if c.profile_name.is_empty() {
            "(empty)"
        } else {
            &c.profile_name
        },
        c.room_code,
        if c.room_code.is_empty() {
            "EMPTY-CODE -> lobby room"
        } else {
            "private-room"
        }
    );
}

fn on_open(c: &mut Client) {
    println!("[net-client] socket open");
    send_hello(c);
}

fn on_msg(c: &mut Client, data: &[u8]) {
    let Some(hdr) = proto::read_header(data) else {
        eprintln!("[net-client] short header ({} bytes)", data.len());
        return;
    };
    if data.len() < proto::MSG_HEADER_SIZE + hdr.length as usize {
        eprintln!(
            "[net-client] truncated payload (have {}, need {})",
            data.len(),
            proto::MSG_HEADER_SIZE + hdr.length as usize
        );
        return;
    }
    let payload = &data[proto::MSG_HEADER_SIZE..proto::MSG_HEADER_SIZE + hdr.length as usize];

    /* Unknown kinds are ignored so the server can ship new ones
     * without breaking us (the C `default:` arm). */
    let Some(kind) = MsgKind::from_u16(hdr.kind) else {
        return;
    };

    match kind {
        MsgKind::Welcome => {
            if hdr.version != proto::MSG_WELCOME_VERSION {
                eprintln!(
                    "[net-client] WELCOME version {} != {}",
                    hdr.version,
                    proto::MSG_WELCOME_VERSION
                );
                c.state = NetClientState::Error;
                return;
            }
            let Some(w) = proto::read_welcome(payload) else {
                eprintln!("[net-client] malformed WELCOME");
                c.state = NetClientState::Error;
                return;
            };
            c.welcome.player_id = w.player_id;
            c.welcome.world_seed = w.world_seed;
            c.welcome.spawn_x = w.spawn_x;
            c.welcome.spawn_y = w.spawn_y;
            c.welcome.spawn_z = w.spawn_z;
            c.welcome.body_id = w.body_id;
            c.welcome.spawn_yaw = w.spawn_yaw;
            c.welcome.spawn_pitch = w.spawn_pitch;
            c.state = NetClientState::Ready;
            c.ready_time = now_sec();
            c.last_chunk_diff_time = c.ready_time;
            /* Arm chat's backlog-suppression grace window. The server
             * follows WELCOME with a flurry of MSG_CHAT messages
             * replaying the room's recent chat history; without
             * this hook every reconnect floods the HUD with already-
             * seen logs because the recv-time stamps look fresh. */
            chat::begin_session();
            /* Kick off the lazy fetch for the spawn body so the
             * player's first frame in MP shows persisted blocks
             * without waiting for body_load_detail (the active body
             * never triggers that path - it's meshed at register
             * time). Deferred bodies fetch from body_load_detail. */
            fetch_body_saves_inner(c, w.body_id);
            /* Cache our own name so F1 can show it for the local
             * player too - the server has it from HELLO but doesn't
             * echo it in WELCOME; the locally-known profile name is
             * the ground truth. */
            let pname = c.profile_name.clone();
            cache_name(c, w.player_id, &pname);
            println!(
                "[net-client] READY: player_id={} seed={} spawn=({:.2}, {:.2}, {:.2}) body={}",
                w.player_id, w.world_seed, w.spawn_x, w.spawn_y, w.spawn_z, w.body_id
            );
        }
        MsgKind::Chat => {
            if hdr.version != proto::MSG_CHAT_VERSION {
                return;
            }
            let Some(m) = proto::read_chat(payload) else {
                return;
            };
            let text = fixed_str(&m.text);
            let sender = name_for_id_inner(c, m.player_id);
            chat::post_recv(m.player_id, sender.as_deref().unwrap_or("?"), &text);
        }
        MsgKind::InventoryState => {
            if hdr.version != proto::MSG_INVENTORY_STATE_VERSION {
                return;
            }
            let Some(inv) = proto::read_inventory_state(payload) else {
                return;
            };
            c.inv_slot_type = inv.slot_type;
            c.inv_slot_count = inv.slot_count;
            c.inv_selected = if inv.selected < 9 { inv.selected } else { 0 };
            c.inv_pending = true;
            println!(
                "[net-client] inventory restored from server (selected={})",
                c.inv_selected
            );
        }
        MsgKind::PlayerInfo => {
            if hdr.version != proto::MSG_PLAYER_INFO_VERSION {
                return;
            }
            let Some(info) = proto::read_player_info(payload) else {
                return;
            };
            /* Server name is null-padded fixed-32; treat as C string. */
            let name = fixed_str(&info.name);
            cache_name(c, info.player_id, &name);
            /* Clear any pending-request slot for this id so a peer
             * who reconnects later can be re-resolved cleanly. */
            for slot in c.name_requests.iter_mut() {
                if slot.player_id == info.player_id {
                    slot.attempts = 0;
                    slot.nacked = false;
                    slot.warned = false;
                    slot.last_request_s = 0.0;
                    break;
                }
            }
        }
        MsgKind::PlayerInfoNack => {
            if hdr.version != proto::MSG_PLAYER_INFO_NACK_VERSION {
                return;
            }
            let Some(nack) = proto::read_player_info_nack(payload) else {
                return;
            };
            let reason_str = if nack.reason == proto::PLAYER_INFO_NACK_UNKNOWN_ID {
                "unknown_id"
            } else {
                "unspecified"
            };
            eprintln!(
                "[net-client] ERROR: server cannot resolve name for \
                 player_id={} (reason={}). Will stop retrying this id.",
                nack.player_id, reason_str
            );
            /* Mark the slot so future name_for_id calls don't trigger
             * more requests. Create the slot if it doesn't exist
             * (e.g. a stale NACK from before we asked). */
            let mut idx = c
                .name_requests
                .iter()
                .position(|r| r.player_id == nack.player_id);
            if idx.is_none() && c.name_requests.len() < NET_NAME_REQ_TABLE_SIZE {
                c.name_requests.push(NameRequest {
                    player_id: nack.player_id,
                    last_request_s: 0.0,
                    attempts: 0,
                    nacked: false,
                    warned: false,
                });
                idx = Some(c.name_requests.len() - 1);
            }
            if let Some(i) = idx {
                c.name_requests[i].nacked = true;
            }
        }
        MsgKind::Kick => {
            if hdr.version != proto::MSG_KICK_VERSION {
                return;
            }
            let Some(k) = proto::read_kick(payload) else {
                return;
            };
            /* Copy the server-supplied text into the error slot the
             * menu reads when it promotes ERROR -> popup. Truncate
             * cleanly at the smaller buffer. */
            let text = fixed_str(&k.text);
            c.error_message =
                trunc_bytes(if text.is_empty() { "kicked" } else { &text }, ERROR_MESSAGE_MAX)
                    .to_string();
            c.no_retry = true;
            c.state = NetClientState::Error;
            println!("[net-client] KICK reason={} text='{}'", k.reason, text);
        }
        MsgKind::Desync => {
            if hdr.version != proto::MSG_DESYNC_VERSION {
                return;
            }
            let Some(d) = proto::read_desync(payload) else {
                return;
            };
            /* The C casts d.reason straight into the enum; only the
             * INSIDE_SOLID value exists today. */
            c.last_desync = if d.reason == proto::DESYNC_INSIDE_SOLID {
                NetDesyncKind::InsideSolid
            } else {
                NetDesyncKind::None
            };
            c.last_desync_block = d.block_type;
            c.last_desync_time = now_sec();
            /* Loud console line - emscripten pipes printf to console.log,
             * so this lands in browser devtools. Two messages so it's
             * easy to spot among the rest of the per-frame chatter. */
            eprintln!(
                "============================================================\n\
                 [DESYNC] server rejected pose at ({:.1}, {:.1}, {:.1})\n\
                 \x20        reason={}  body={}  block={}\n\
                 ============================================================",
                d.client_pos_x, d.client_pos_y, d.client_pos_z, d.reason, d.body_id, d.block_type
            );
        }
        MsgKind::ChunkDiff => {
            if hdr.version != proto::MSG_CHUNK_DIFF_VERSION {
                return;
            }
            let Some(diff) = proto::read_chunk_diff(payload) else {
                eprintln!("[net-client] malformed CHUNK_DIFF");
                return;
            };
            let Some(wrc) = world_for_body(diff.body_id) else {
                /* Replay diffs land here for bodies the renderer has
                 * never seen - that's silently dropped by world_set,
                 * but the diff itself is real persistence data we just
                 * lost. Loud error. */
                eprintln!(
                    "[net-client] ERROR: CHUNK_DIFF for body={} not registered \
                     with renderer (edits={} DROPPED). If this fires at join \
                     time, the server-replayed persisted blocks will not show.",
                    diff.body_id, diff.edit_count
                );
                return;
            };
            let mut w = wrc.borrow_mut();
            let mut matched_acks = 0;
            let mut first_tile: u32 = 0;
            let mut first_depth: u16 = 0;
            let mut first_block: u16 = 0;
            let mut last_tile: u32 = 0;
            let mut last_depth: u16 = 0;
            for i in 0..diff.edit_count as usize {
                let e = &diff.edits[i];
                if i == 0 {
                    first_tile = e.tile_idx;
                    first_depth = e.depth;
                    first_block = e.block_type;
                }
                last_tile = e.tile_idx;
                last_depth = e.depth;
                /* world_set marks the tile dirty; the renderer's mesh
                 * dirty sweep remeshes it on the next frame. Same path
                 * as locally-applied edits. (Out-of-palette wire values
                 * degrade to Air, the same fallback the server port
                 * uses - C cast the raw value into the enum.) */
                w.set(
                    e.tile_idx as i32,
                    e.depth as i32,
                    Block::from_raw(e.block_type as u8).unwrap_or(Block::Air),
                );
                /* Round-trip ack: try to pair this entry with one of
                 * our outstanding sends. Replays at join time and
                 * peer-driven edits will simply not match anything in
                 * the table (no error - we never sent them). */
                if pending_edit_try_ack(c, diff.body_id, e.tile_idx, e.depth, e.block_type) {
                    matched_acks += 1;
                }
            }
            /* Per-body running tally: find / allocate a slot, add this
             * diff's entry count, bump unique-tile counter when the
             * leading tile id changes (server's chunk-replay path emits
             * each tile as a contiguous run of one or two messages, so
             * the leading-tile dedup matches reality). */
            let mut slot = c
                .body_coverage
                .iter()
                .position(|s| s.body_id == diff.body_id);
            if slot.is_none() && c.body_coverage.len() < NET_BODY_COVERAGE_MAX {
                /* Lazily allocate the tile bitset on first sight of this
                 * body. Sized to the world's tile_count so the audit
                 * can iterate every possible tile id without bounds
                 * checks. Zeroed -> "nothing received yet". (The C WARN
                 * for a failed calloc drops out - Vec allocation does
                 * not fail recoverably.) */
                let bytes = ((w.tile_count + 7) / 8) as usize;
                c.body_coverage.push(BodyCoverage {
                    body_id: diff.body_id,
                    edits_seen: 0,
                    unique_tiles: 0,
                    last_tile_seen: 0,
                    last_tile_valid: false,
                    tile_bits: vec![0u8; bytes],
                    world_tile_count: w.tile_count,
                });
                slot = Some(c.body_coverage.len() - 1);
            }
            if let Some(s) = slot {
                let cov = &mut c.body_coverage[s];
                cov.edits_seen += diff.edit_count as u32;
                if !cov.last_tile_valid || cov.last_tile_seen != first_tile {
                    cov.unique_tiles += 1;
                    cov.last_tile_seen = last_tile;
                    cov.last_tile_valid = true;
                } else {
                    /* Same leading tile as last message - this is the
                     * 64..127 continuation of the same column. Not a
                     * new unique tile. */
                    cov.last_tile_seen = last_tile;
                }
                /* Record every distinct tile_idx in this diff for the
                 * audit. Cheap: 64 iterations max. */
                let tcount = cov.world_tile_count;
                let bytes = cov.tile_bits.len();
                if !cov.tile_bits.is_empty() {
                    for i in 0..diff.edit_count as usize {
                        let t = diff.edits[i].tile_idx;
                        if (t as i32) >= 0 && (t as i32) < tcount {
                            let byte = (t >> 3) as usize;
                            if byte < bytes {
                                cov.tile_bits[byte] |= 1u8 << (t & 7);
                            }
                        }
                    }
                }
            }
            c.last_chunk_diff_time = now_sec();
            /* Per-message detail: leading + trailing (tile, depth) and
             * the block id of the first entry so the operator can
             * compare against /saves output line by line. Trailing pair
             * helps tell apart "1 column, 64 entries" from "64 separate
             * tiles" (the server's reply currently uses run-by-tile, so
             * leading == trailing tile means a single-column batch). */
            let body_name = w.body.name;
            println!(
                "[net-client] CHUNK_DIFF recv body={} ({}) edits={} \
                 first=(tile={},d={},block={}) last=(tile={},d={}) \
                 ({} acks, {} replay/peer) | body-totals: edits={} unique_tiles={}",
                diff.body_id,
                body_name,
                diff.edit_count,
                first_tile,
                first_depth,
                first_block,
                last_tile,
                last_depth,
                matched_acks,
                diff.edit_count as i32 - matched_acks,
                slot.map(|s| c.body_coverage[s].edits_seen).unwrap_or(0),
                slot.map(|s| c.body_coverage[s].unique_tiles).unwrap_or(0)
            );
        }
        MsgKind::TorchDiff => {
            if hdr.version != proto::MSG_TORCH_DIFF_VERSION {
                return;
            }
            let Some(diff) = proto::read_torch_diff(payload) else {
                eprintln!("[net-client] malformed TORCH_DIFF");
                return;
            };
            let Some(wrc) = world_for_body(diff.body_id) else {
                /* The body isn't registered with the renderer yet. This
                 * is normal for the initial-sync TORCH_DIFFs that
                 * arrive right after WELCOME for moons / planets the
                 * client hasn't approached yet. Bodies stream in
                 * lazily; the server resends torches when the player
                 * teleports. For now, drop. */
                eprintln!(
                    "[net-client] TORCH_DIFF body={} not yet registered (entries={} dropped)",
                    diff.body_id, diff.entry_count
                );
                return;
            };
            let mut w = wrc.borrow_mut();
            /* Per-entry dedup epsilon: match server. Two torches with
             * the same tile_idx and positions within ~10 cm are
             * considered the same torch (round-tripped echo of our
             * own placement). */
            const MATCH_EPS_M: f32 = 0.1;
            const MATCH_EPS2: f32 = MATCH_EPS_M * MATCH_EPS_M;
            const REMOVE_RANGE_M: f32 = 1.0;
            let mut placed = 0;
            let mut removed = 0;
            let mut skipped = 0;
            for i in 0..diff.entry_count as usize {
                let e = &diff.entries[i];
                if e.op == proto::TORCH_OP_PLACE {
                    /* Dedup against the local torch list. */
                    let list = torch::list();
                    let mut dup = false;
                    for t in &list {
                        let dx = t.position.x - e.pos_x;
                        let dy = t.position.y - e.pos_y;
                        let dz = t.position.z - e.pos_z;
                        if dx * dx + dy * dy + dz * dz <= MATCH_EPS2 {
                            dup = true;
                            break;
                        }
                    }
                    if dup {
                        skipped += 1;
                        continue;
                    }
                    let pos = vec3_make(e.pos_x, e.pos_y, e.pos_z);
                    let up = vec3_make(e.up_x, e.up_y, e.up_z);
                    if torch::place(pos, up, e.tile_idx as i32) {
                        w.dirty_in_range(pos, 6.0); /* TORCH_LIGHT_RANGE_M */
                        placed += 1;
                    }
                } else if e.op == proto::TORCH_OP_REMOVE {
                    let pos = vec3_make(e.pos_x, e.pos_y, e.pos_z);
                    if torch::remove_near(pos, REMOVE_RANGE_M) {
                        w.dirty_in_range(pos, 6.0);
                        removed += 1;
                    } else {
                        skipped += 1;
                    }
                }
            }
            let body_name = w.body.name;
            println!(
                "[net-client] TORCH_DIFF recv body={} ({}) entries={} \
                 placed={} removed={} echo/skip={}",
                diff.body_id, body_name, diff.entry_count, placed, removed, skipped
            );
        }
        MsgKind::WaterStateDiff => {
            if hdr.version != proto::MSG_WATER_STATE_DIFF_VERSION {
                return;
            }
            let Some(wsd) = proto::read_water_state_diff(payload) else {
                eprintln!("[net-client] malformed WATER_STATE_DIFF");
                return;
            };
            let Some(wrc) = world_for_body(wsd.body_id) else {
                return;
            };
            let mut w = wrc.borrow_mut();
            /* Apply the column into the local state-byte array via
             * the load-path helper, which is the same entry point
             * the SP /persist code uses on world load - it copies
             * straight into world_water's state without setting the
             * persist-dirty bit (the data already round-tripped via
             * the server). The mesher reads state next chunk-rebuild
             * cycle, so the bell-curve / falling visuals catch up
             * with the next remesh pass on the affected chunk. */
            world_water::load_state_column(&mut w, wsd.tile_idx as i32, &wsd.state);
            /* Mark the tile dirty so the renderer rebuilds the
             * chunk's water mesh. Also mark the 6 edge neighbours
             * dirty - the water mesher reads neighbour state when
             * computing step-strips, r_top_edge, and the bell-curve
             * caps, so a state change on tile X requires X's
             * neighbours to remesh too or their meshes stay locked
             * to X's previous level.
             *
             * The bulk /saves/body path gets this for free because
             * it goes through world_set per cell (world_set already
             * neighbour-dirties for seam logic). The realtime
             * state-diff path bypasses world_set, so we replicate
             * the propagation manually here. Without this, fresh
             * water broadcasts have visible seams that only clear
             * up on relog (when the bulk fetch rebuilds everything),
             * which is the exact symptom the user reported. */
            w.tile_mark_dirty(wsd.tile_idx as i32);
            let nbs = w
                .grid
                .tile(wsd.tile_idx as i32)
                .map(|gt| (gt.num_neighbors, gt.neighbors));
            if let Some((n, neighbors)) = nbs {
                for i in 0..n as usize {
                    let nb = neighbors[i];
                    if nb >= 0 {
                        w.tile_mark_dirty(nb);
                    }
                }
            }
        }
        MsgKind::WaterOriginsDiff => {
            if hdr.version != proto::MSG_WATER_ORIGINS_DIFF_VERSION {
                return;
            }
            let Some(od) = proto::read_water_origins_diff(payload) else {
                eprintln!("[net-client] malformed WATER_ORIGINS_DIFF");
                return;
            };
            let Some(wrc) = world_for_body(od.body_id) else {
                return;
            };
            let mut w = wrc.borrow_mut();
            /* Clear every origin entry currently recorded for this
             * tile, then apply the entries the server sent. This is
             * the "full snapshot per tile" pattern - any cell the
             * server didn't include simply has no origins on the
             * client. Cheaper than a per-cell diff and works for the
             * source-death case (server stops including a cell whose
             * origin list emptied -> client clears stale flow). */
            let t_clear = w
                .grid
                .tile(od.tile_idx as i32)
                .map(|gt| (gt.num_neighbors, gt.neighbors));
            if t_clear.is_some() {
                /* Walk all 128 depths on this tile and drop any origin
                 * entries; the apply loop below re-adds the ones the
                 * server still considers active. Cheap (one hash
                 * lookup per depth). */
                for d in 0..WORLD_MAX_DEPTH {
                    world_water::origin_clear(&mut w, od.tile_idx as i32, d);
                }
            }
            for i in 0..od.entry_count as usize {
                let e = &od.entries[i];
                /* The C casts the wire entry pointer straight into
                 * water_origin_diff_entry_t (identical layout); here
                 * the fields are copied explicitly. */
                let entry = world_water::OriginDiffEntry {
                    depth: e.depth,
                    origin_count: e.origin_count,
                    origin_tile: e.origin_tile,
                    origin_depth: e.origin_depth,
                };
                world_water::origin_apply_entry(&mut w, od.tile_idx as i32, &entry);
            }
            /* Mark the tile + edge neighbours dirty so the renderer
             * remeshes the affected water top caps with the updated
             * flow direction. Same fan-out as the state-diff handler
             * because the water mesher reads neighbour state when
             * deciding gap-band emission, and origin changes alter
             * the per-cell UV. */
            w.tile_mark_dirty(od.tile_idx as i32);
            if let Some((n, neighbors)) = t_clear {
                for i in 0..n as usize {
                    let nb = neighbors[i];
                    if nb >= 0 {
                        w.tile_mark_dirty(nb);
                    }
                }
            }
        }
        MsgKind::SyncTick => {
            if hdr.version != proto::MSG_SYNC_TICK_VERSION {
                return;
            }
            let Some(tick) = proto::read_sync_tick(payload) else {
                eprintln!("[net-client] malformed SYNC_TICK");
                return;
            };
            /* Find the player's active body so we know what to resync.
             * The welcome holds a default body but the player may have
             * moved to a moon since - net_client doesn't track the
             * player state directly, so we resync the body the welcome
             * spawned us into. Main is the common case; a future
             * extension can plumb the live body_id in via the snapshot. */
            let body_id = c.welcome.body_id;
            c.pending_sync_seq = tick.seq_id;
            c.pending_sync_active = true;
            /* Fire the resync. The fetch is async (HTTP); the response
             * lands in apply_body_blob which is where we send the ACK
             * with the matching seq_id. */
            resync_body_saves_inner(c, body_id);
        }
        MsgKind::Snapshot => {
            if hdr.version != proto::MSG_SNAPSHOT_VERSION {
                return;
            }
            let Some(snap) = proto::read_snapshot(payload) else {
                eprintln!("[net-client] malformed SNAPSHOT");
                return;
            };
            let mut out: Vec<RemotePose> = Vec::with_capacity(REMOTE_PLAYERS_MAX);
            for i in 0..snap.player_count as usize {
                let e = &snap.players[i];
                /* Skip the local player so we don't draw our own
                 * marker on top of the camera. */
                if e.player_id == c.welcome.player_id {
                    continue;
                }
                if out.len() >= REMOTE_PLAYERS_MAX {
                    break;
                }
                out.push(RemotePose {
                    player_id: e.player_id,
                    body_id: e.body_id,
                    pos: dvec3_make(e.pos_x, e.pos_y, e.pos_z),
                    yaw: e.yaw,
                    pitch: e.pitch,
                });
            }
            remote_players::set_from_snapshot(&out);
            /* The C kept a function-local snapshot counter feeding a
             * commented-out diagnostic log; with the log silenced the
             * counter has no observable effect, so it drops out. */
        }

        /* ---- MP-parity extensions (kinds 29..34). ---- */
        MsgKind::SimTime => {
            if hdr.version != proto::MSG_SIM_TIME_VERSION {
                return;
            }
            let Some(m) = proto::read_sim_time(payload) else { return };
            /* Snap the local clock to the server's - drives day/night +
             * orbits so every peer sees the same sun. 5 s cadence, so
             * corrections are tiny (local drift is frame jitter only). */
            tenebris_core::world_time::set_seconds(m.sim_seconds);
        }
        MsgKind::BagState => {
            if hdr.version != proto::MSG_BAG_STATE_VERSION {
                return;
            }
            let Some(m) = proto::read_bag_state(payload) else { return };
            c.bag_pending = true;
            c.bag_items = m.items;
            c.bag_counts = m.counts;
            c.bag_hunger = m.hunger;
        }
        MsgKind::BentityDiff => {
            if hdr.version != proto::MSG_BENTITY_DIFF_VERSION {
                return;
            }
            let Some(m) = proto::read_bentity_diff(payload) else { return };
            let Some(wrc) = world_for_body(m.body_id) else { return };
            let mut w = wrc.borrow_mut();
            for rec in &m.records {
                let Some((tile, depth, e)) = block_entity::record_parse(rec) else { continue };
                if tile < 0 || tile >= w.tile_count || depth < 0 || depth >= WORLD_MAX_DEPTH {
                    continue;
                }
                w.block_entities.set(tile, depth, e);
                /* Mirror into the outbound shadow so the 4 Hz local
                 * sync doesn't echo the server's own update back. */
                c.bent_shadow.insert((m.body_id, tile, depth), rec.clone());
            }
        }
        MsgKind::CropDiff => {
            if hdr.version != proto::MSG_CROP_DIFF_VERSION {
                return;
            }
            let Some(m) = proto::read_crop_diff(payload) else { return };
            let list = c.crops_by_body.entry(m.body_id).or_default();
            const DUP_EPS2: f32 = 0.09;
            for e in &m.entries[..m.entry_count as usize] {
                let d2 = |cr: &farming::Crop| {
                    let dx = cr.pos.x as f32 - e.pos_x;
                    let dy = cr.pos.y as f32 - e.pos_y;
                    let dz = cr.pos.z as f32 - e.pos_z;
                    dx * dx + dy * dy + dz * dz
                };
                if e.op == proto::CROP_OP_PLANT {
                    if list.iter().any(|cr| d2(cr) <= DUP_EPS2) {
                        continue;
                    }
                    list.push(farming::Crop::at(
                        dvec3_make(e.pos_x as f64, e.pos_y as f64, e.pos_z as f64),
                        dvec3_make(e.up_x as f64, e.up_y as f64, e.up_z as f64),
                        e.tile_idx as i32,
                        e.growth,
                    ));
                } else if e.op == proto::CROP_OP_REMOVE {
                    let mut best = -1i32;
                    let mut best_d2 = 1.0f32;
                    for (j, cr) in list.iter().enumerate() {
                        let d = d2(cr);
                        if d < best_d2 {
                            best_d2 = d;
                            best = j as i32;
                        }
                    }
                    if best >= 0 {
                        list.swap_remove(best as usize);
                    }
                }
            }
            c.crops_dirty.insert(m.body_id);
        }
        MsgKind::AnimalState => {
            if hdr.version != proto::MSG_ANIMAL_STATE_VERSION {
                return;
            }
            let Some(m) = proto::read_animal_state(payload) else { return };
            if m.killed_by != 0 && m.killed_by == c.welcome.player_id {
                c.meat_pending = c.meat_pending.saturating_add(m.meat_award);
            }
            let list: Vec<(u32, u8, DVec3, DVec3)> = m.entries[..m.entry_count as usize]
                .iter()
                .map(|e| {
                    (
                        e.id,
                        e.state,
                        dvec3_make(e.pos_x as f64, e.pos_y as f64, e.pos_z as f64),
                        dvec3_make(e.heading_x as f64, e.heading_y as f64, e.heading_z as f64),
                    )
                })
                .collect();
            c.animals_by_body.insert(m.body_id, list);
            c.animals_dirty.insert(m.body_id);
        }
        _ => {
            /* Ignore kinds the client never receives (HELLO, INPUT,
             * PLAYER_CMD, ...) - the C `default:` arm. */
        }
    }
}

/// Port of `net_client_send_chat()`.
pub fn send_chat(text: &str) {
    C.with(|cell| {
        let c = &mut *cell.borrow_mut();
        if c.state != NetClientState::Ready || c.conn.is_none() {
            return;
        }
        if text.is_empty() {
            return;
        }
        let mut m = proto::MsgChat::default();
        /* player_id is filled by the server when it broadcasts; we
         * leave it zero on the wire. */
        copy_padded(&mut m.text, text);
        let mut buf = [0u8; proto::MSG_HEADER_SIZE + proto::MSG_CHAT_WIRE_SIZE];
        let w = proto::write_chat(&mut buf, &m);
        if w == 0 {
            return;
        }
        send_raw(c, NetChannel::Reliable, &buf[..w]);
    });
}

/* ------------------------------------------------------------------ */
/* Block-edit round-trip tracking.
 *
 * The wire protocol has no explicit ACK; the server's authoritative
 * answer is the MSG_CHUNK_DIFF it broadcasts back to the same room
 * after applying the edit. That broadcast is our ack: when a CHUNK_DIFF
 * entry matches a (body, tile, depth) we still have outstanding, the
 * round-trip is closed and the RTT logged. Anything that ages past
 * NET_EDIT_ACK_TIMEOUT_S is dumped to stderr as an error - the server
 * lost it, the persistence path will not save it, and the next time
 * the player joins the block will be missing. We want that loud now.
 * ------------------------------------------------------------------ */

fn pending_edit_alloc_slot(c: &Client) -> Option<usize> {
    /* First free slot wins. Returns None only when the table is full,
     * which itself is logged by the caller. */
    (0..NET_PENDING_EDITS_MAX).find(|&i| c.pending_edits[i].sent_time == 0.0)
}

fn edit_kind_name(kind: u8) -> &'static str {
    if kind == proto::PLAYER_CMD_BREAK {
        "BREAK"
    } else {
        "PLACE"
    }
}

/// Try to ack the oldest outstanding edit matching (body, tile, depth).
/// Returns true on a hit. block_seen is what the server says the cell
/// actually holds now; if it disagrees with what we asked for, we log
/// a WARN (the server overrode us, e.g. survival range / inventory
/// check) but still treat the slot as acked - the round trip itself
/// completed, the disagreement is a separate concern.
fn pending_edit_try_ack(
    c: &mut Client,
    body_id: u32,
    tile_idx: u32,
    depth: u16,
    block_seen: u16,
) -> bool {
    let mut found: Option<usize> = None;
    let mut oldest_t = 0.0f64;
    for i in 0..NET_PENDING_EDITS_MAX {
        let p = &c.pending_edits[i];
        if p.sent_time == 0.0 {
            continue;
        }
        if p.body_id != body_id || p.tile_idx != tile_idx || p.depth != depth {
            continue;
        }
        if found.is_none() || p.sent_time < oldest_t {
            found = Some(i);
            oldest_t = p.sent_time;
        }
    }
    let Some(found) = found else {
        return false;
    };
    let rtt_ms = (now_sec() - c.pending_edits[found].sent_time) * 1000.0;
    let expected = c.pending_edits[found].expected_block;
    let kind = c.pending_edits[found].cmd_kind;
    let seq = c.pending_edits[found].seq;
    if block_seen != expected {
        eprintln!(
            "[net-client] WARN: EDIT seq={} {} body={} tile={} depth={}: \
             expected block={}, server applied block={} (server overrode)",
            seq,
            edit_kind_name(kind),
            body_id,
            tile_idx,
            depth,
            expected,
            block_seen
        );
    } else {
        println!(
            "[net-client] EDIT-ACK seq={} {} body={} tile={} depth={} block={} rtt={:.1}ms",
            seq,
            edit_kind_name(kind),
            body_id,
            tile_idx,
            depth,
            block_seen,
            rtt_ms
        );
    }
    c.pending_edits[found].sent_time = 0.0;
    c.edits_acked_total += 1;
    true
}

fn pending_edit_check_timeouts(c: &mut Client) {
    /* Linear scan; capped at NET_PENDING_EDITS_MAX (=128). Cheap. */
    if c.state != NetClientState::Ready {
        return;
    }
    let now = now_sec();
    for i in 0..NET_PENDING_EDITS_MAX {
        if c.pending_edits[i].sent_time == 0.0 {
            continue;
        }
        let age = now - c.pending_edits[i].sent_time;
        if age < NET_EDIT_ACK_TIMEOUT_S {
            continue;
        }
        c.edits_timed_out_total += 1;
        eprintln!(
            "[net-client] ERROR: EDIT seq={} {} body={} tile={} depth={} block={} \
             NOT ACKED after {:.1}s - server dropped this edit; it WILL be missing on next login. \
             (stats: sent={} acked={} timed_out={})",
            c.pending_edits[i].seq,
            edit_kind_name(c.pending_edits[i].cmd_kind),
            c.pending_edits[i].body_id,
            c.pending_edits[i].tile_idx,
            c.pending_edits[i].depth,
            c.pending_edits[i].expected_block,
            age,
            c.edits_sent_total,
            c.edits_acked_total,
            c.edits_timed_out_total
        );
        c.pending_edits[i].sent_time = 0.0;
    }
}

/// Port of `net_client_send_edit()`. `kind` is one of
/// `proto::PLAYER_CMD_PLACE` / `proto::PLAYER_CMD_BREAK`.
pub fn send_edit(kind: u8, body_id: u32, tile: i32, depth: i32, block_type: i32) {
    C.with(|cell| {
        let c = &mut *cell.borrow_mut();
        if c.state != NetClientState::Ready || c.conn.is_none() {
            return;
        }
        if tile < 0 || depth < 0 {
            return;
        }
        let cmd = proto::MsgPlayerCmd {
            cmd_kind: kind,
            reserved8a: 0,
            reserved16a: 0,
            body_id,
            tile_idx: tile as u32,
            depth: depth as u16,
            block_type: block_type as u16,
        };
        let mut buf = [0u8; proto::MSG_HEADER_SIZE + proto::MSG_PLAYER_CMD_WIRE_SIZE];
        let n = proto::write_player_cmd(&mut buf, &cmd);
        if n == 0 {
            return;
        }

        /* Push into the ack table BEFORE sending so a fast loopback echo
         * can't outrun the bookkeeping. Survival BREAK uses BLOCK_AIR as
         * the expected value (matches what the server forces), even though
         * the wire field is ignored on BREAK - keeps the ack-match path
         * uniform. */
        c.next_edit_seq += 1;
        let seq = c.next_edit_seq;
        match pending_edit_alloc_slot(c) {
            None => {
                eprintln!(
                    "[net-client] ERROR: pending-edit table full (cap={}) - \
                     cannot track EDIT seq={} {} body={} tile={} depth={}. \
                     Round-trip ack will not fire for this edit.",
                    NET_PENDING_EDITS_MAX,
                    seq,
                    edit_kind_name(kind),
                    body_id,
                    tile,
                    depth
                );
            }
            Some(slot) => {
                let expected = if kind == proto::PLAYER_CMD_BREAK {
                    0 /* BLOCK_AIR */
                } else {
                    block_type as u16
                };
                c.pending_edits[slot] = PendingEdit {
                    body_id,
                    tile_idx: tile as u32,
                    depth: depth as u16,
                    expected_block: expected,
                    cmd_kind: kind,
                    sent_time: now_sec(),
                    seq,
                };
            }
        }
        c.edits_sent_total += 1;
        println!(
            "[net-client] EDIT-SEND seq={} {} body={} tile={} depth={} block={}",
            seq,
            edit_kind_name(kind),
            body_id,
            tile,
            depth,
            block_type
        );

        /* Reliable channel - block edits are ordered & cannot be dropped. */
        send_raw(c, NetChannel::Reliable, &buf[..n]);
    });
}

/// Port of `net_client_send_torch()`.
#[allow(clippy::too_many_arguments)]
pub fn send_torch(
    place_op: bool,
    body_id: u32,
    tile_idx: i32,
    pos_x: f32,
    pos_y: f32,
    pos_z: f32,
    up_x: f32,
    up_y: f32,
    up_z: f32,
) {
    C.with(|cell| {
        let c = &mut *cell.borrow_mut();
        if c.state != NetClientState::Ready || c.conn.is_none() {
            return;
        }
        if tile_idx < 0 {
            return;
        }
        let mut diff = proto::MsgTorchDiff::default();
        diff.body_id = body_id;
        diff.entry_count = 1;
        diff.entries[0].op = if place_op {
            proto::TORCH_OP_PLACE
        } else {
            proto::TORCH_OP_REMOVE
        };
        diff.entries[0].tile_idx = tile_idx as u32;
        diff.entries[0].pos_x = pos_x;
        diff.entries[0].pos_y = pos_y;
        diff.entries[0].pos_z = pos_z;
        diff.entries[0].up_x = up_x;
        diff.entries[0].up_y = up_y;
        diff.entries[0].up_z = up_z;
        let mut buf =
            [0u8; proto::MSG_HEADER_SIZE + proto::MSG_TORCH_DIFF_HEADER + proto::MSG_TORCH_ENTRY_SIZE];
        let n = proto::write_torch_diff(&mut buf, &diff);
        if n == 0 {
            return;
        }
        println!(
            "[net-client] TORCH-SEND {} body={} tile={} pos=({:.2},{:.2},{:.2})",
            if place_op { "PLACE" } else { "REMOVE" },
            body_id,
            tile_idx,
            pos_x,
            pos_y,
            pos_z
        );
        send_raw(c, NetChannel::Reliable, &buf[..n]);
    });
}

/// Port of `net_client_send_inventory_state()`.
pub fn send_inventory_state(slot_type: &[u16; 9], slot_count: &[i16; 9], selected: i32) {
    C.with(|cell| {
        let c = &mut *cell.borrow_mut();
        if c.state != NetClientState::Ready || c.conn.is_none() {
            return;
        }
        let inv = proto::MsgInventoryState {
            player_id: 0,
            slot_type: *slot_type,
            slot_count: *slot_count,
            selected: if (0..9).contains(&selected) {
                selected as u8
            } else {
                0
            },
            reserved: [0; 3],
        };
        let mut buf = [0u8; proto::MSG_HEADER_SIZE + proto::MSG_INVENTORY_STATE_WIRE_SIZE];
        let n = proto::write_inventory_state(&mut buf, &inv);
        if n == 0 {
            return;
        }
        send_raw(c, NetChannel::Reliable, &buf[..n]);
    });
}

/// Port of `net_client_take_pending_inventory()`. Returns
/// `Some((slot_type, slot_count, selected))` and clears the flag, or
/// `None` when nothing's pending.
pub fn take_pending_inventory() -> Option<([u16; 9], [i16; 9], i32)> {
    C.with(|cell| {
        let c = &mut *cell.borrow_mut();
        if !c.inv_pending {
            return None;
        }
        c.inv_pending = false;
        Some((c.inv_slot_type, c.inv_slot_count, c.inv_selected as i32))
    })
}

/// Port of `net_client_send_player_state()`.
#[allow(clippy::too_many_arguments)]
pub fn send_player_state(
    client_tick: u32,
    body_id: u32,
    pos_x: f64,
    pos_y: f64,
    pos_z: f64,
    yaw: f32,
    pitch: f32,
    grounded: bool,
) {
    C.with(|cell| {
        let c = &mut *cell.borrow_mut();
        if c.state != NetClientState::Ready || c.conn.is_none() {
            return;
        }
        let st = proto::MsgPlayerState {
            client_tick,
            body_id,
            pos_x,
            pos_y,
            pos_z,
            yaw,
            pitch,
            buttons: 0,
            flags: if grounded {
                proto::PLAYER_STATE_FLAG_GROUNDED
            } else {
                0
            },
        };
        let mut buf = [0u8; proto::MSG_HEADER_SIZE + proto::MSG_PLAYER_STATE_WIRE_SIZE];
        let n = proto::write_player_state(&mut buf, &st);
        if n == 0 {
            return;
        }
        send_raw(c, NetChannel::Unreliable, &buf[..n]);
    });
}

/* ------------------------------------------------------------------ */
/* MP-parity extension surface (kinds 29..34).                          */
/* ------------------------------------------------------------------ */

/// Upload the bag grid + hunger (called by app when either changes).
pub fn send_bag_state(
    items: &[u16; proto::MSG_BAG_SLOTS],
    counts: &[u16; proto::MSG_BAG_SLOTS],
    hunger: f32,
) {
    C.with(|cell| {
        let c = &mut *cell.borrow_mut();
        if c.state != NetClientState::Ready || c.conn.is_none() {
            return;
        }
        let m = proto::MsgBagState {
            hunger,
            slot_count: proto::MSG_BAG_SLOTS as u16,
            items: *items,
            counts: *counts,
        };
        let mut buf = [0u8; proto::MSG_HEADER_SIZE + proto::MSG_BAG_STATE_WIRE_SIZE];
        let n = proto::write_bag_state(&mut buf, &m);
        if n > 0 {
            send_raw(c, NetChannel::Reliable, &buf[..n]);
        }
    });
}

/// Server bag replay, if one arrived: `(items, counts, hunger)`.
pub fn take_pending_bag() -> Option<([u16; proto::MSG_BAG_SLOTS], [u16; proto::MSG_BAG_SLOTS], f32)>
{
    C.with(|cell| {
        let c = &mut *cell.borrow_mut();
        if !c.bag_pending {
            return None;
        }
        c.bag_pending = false;
        Some((c.bag_items, c.bag_counts, c.bag_hunger))
    })
}

/// Meat banked from server kill credits since the last take.
pub fn take_meat_award() -> u16 {
    C.with(|cell| {
        let c = &mut *cell.borrow_mut();
        std::mem::take(&mut c.meat_pending)
    })
}

/// Diff the active world's block-entity store against the outbound
/// shadow and send changed records (machine UI ops, placement inits).
/// Called by app at a few Hz in MP; the shadow is also fed by incoming
/// diffs, so server updates never echo back.
pub fn sync_block_entities(body_id: u32, w: &World) {
    C.with(|cell| {
        let c = &mut *cell.borrow_mut();
        if c.state != NetClientState::Ready || c.conn.is_none() {
            return;
        }
        let mut changed: Vec<String> = Vec::new();
        for (tile, depth, e) in w.block_entities.iter() {
            let rec = block_entity::record_write(tile, depth, &e);
            let key = (body_id, tile, depth);
            if c.bent_shadow.get(&key) != Some(&rec) {
                c.bent_shadow.insert(key, rec.clone());
                changed.push(rec);
            }
        }
        /* Cells whose entity vanished (block mined): the CHUNK_DIFF
         * path already tells the server; just drop the shadow entry. */
        c.bent_shadow
            .retain(|k, _| k.0 != body_id || w.block_entities.get(k.1, k.2).is_some());
        for chunk in changed.chunks(proto::BENTITY_DIFF_MAX_ENTRIES) {
            let m = proto::MsgBentityDiff { body_id, records: chunk.to_vec() };
            let cap = proto::MSG_HEADER_SIZE
                + proto::MSG_BENTITY_DIFF_HEADER
                + chunk.iter().map(|r| 4 + r.len()).sum::<usize>();
            let mut buf = vec![0u8; cap];
            let n = proto::write_bentity_diff(&mut buf, &m);
            if n > 0 {
                send_raw(c, NetChannel::Reliable, &buf[..n]);
            }
        }
    });
}

/// Send one crop op (plant / remove) for the active body.
pub fn send_crop_op(body_id: u32, op: u8, tile_idx: i32, pos: DVec3, up: DVec3, growth: f32) {
    C.with(|cell| {
        let c = &mut *cell.borrow_mut();
        if c.state != NetClientState::Ready || c.conn.is_none() {
            return;
        }
        let mut m = proto::MsgCropDiff::default();
        m.body_id = body_id;
        m.entry_count = 1;
        m.entries[0] = proto::MsgCropEntry {
            op,
            tile_idx: tile_idx as u32,
            pos_x: pos.x as f32,
            pos_y: pos.y as f32,
            pos_z: pos.z as f32,
            up_x: up.x as f32,
            up_y: up.y as f32,
            up_z: up.z as f32,
            growth,
        };
        let mut buf =
            [0u8; proto::MSG_HEADER_SIZE + proto::MSG_CROP_DIFF_HEADER + proto::MSG_CROP_ENTRY_SIZE];
        let n = proto::write_crop_diff(&mut buf, &m);
        if n > 0 {
            send_raw(c, NetChannel::Reliable, &buf[..n]);
        }
    });
}

/// Send a melee swing landing on animal `animal_id`.
pub fn send_animal_hit(body_id: u32, animal_id: u32, dmg: f32) {
    C.with(|cell| {
        let c = &mut *cell.borrow_mut();
        if c.state != NetClientState::Ready || c.conn.is_none() {
            return;
        }
        let m = proto::MsgAnimalHit { body_id, animal_id, dmg };
        let mut buf = [0u8; proto::MSG_HEADER_SIZE + proto::MSG_ANIMAL_HIT_WIRE_SIZE];
        let n = proto::write_animal_hit(&mut buf, &m);
        if n > 0 {
            send_raw(c, NetChannel::Reliable, &buf[..n]);
        }
    });
}

/// The server's crop list for `body_id`, if it changed since last take.
pub fn take_crops_if_dirty(body_id: u32) -> Option<Vec<farming::Crop>> {
    C.with(|cell| {
        let c = &mut *cell.borrow_mut();
        if !c.crops_dirty.remove(&body_id) {
            return None;
        }
        Some(c.crops_by_body.get(&body_id).cloned().unwrap_or_default())
    })
}

/// The server's herd for `body_id`, if it changed since last take.
pub fn take_animals_if_dirty(body_id: u32) -> Option<Vec<(u32, u8, DVec3, DVec3)>> {
    C.with(|cell| {
        let c = &mut *cell.borrow_mut();
        if !c.animals_dirty.remove(&body_id) {
            return None;
        }
        Some(c.animals_by_body.get(&body_id).cloned().unwrap_or_default())
    })
}

fn on_close(c: &mut Client, reason: NetCloseReason) {
    println!(
        "[net-client] socket closed (reason={}, state={})",
        reason as i32, c.state as i32
    );
    /* Manual disconnect path: disconnect() already set state=IDLE and
     * dropped the conn before this async close event surfaced.
     * Promoting that to ERROR here would (a) leak a stale "lost
     * connection to server" into error_message that the menu later
     * reads on the next MP attempt, and (b) put the client into a
     * state that doesn't reflect what the user did (intentional quit,
     * not a failure). Stay in IDLE. */
    if c.state == NetClientState::Idle {
        return;
    }
    /* Pick a message based on whether the handshake had completed. A
     * close before READY means we never reached the server (refused,
     * DNS, blocked); after READY means the link dropped mid-session. */
    let msg = if c.state == NetClientState::Ready {
        "lost connection to server"
    } else if reason == NetCloseReason::Timeout {
        "connection timed out"
    } else if reason == NetCloseReason::ProtocolErr {
        "could not reach server"
    } else {
        "server is unreachable"
    };
    c.error_message = msg.to_string();
    c.state = NetClientState::Error;
    /* Null the conn so a follow-up connect() (auto-reconnect path)
     * doesn't early-return on the stale handle. The transport already
     * owns the close; we just drop our handle. */
    c.conn = None;
}

/* ------------------------------------------------------------------ */
/* Public surface.                                                     */
/* ------------------------------------------------------------------ */

/// Port of `net_client_connect()`. (The C's `!url` NULL guard has no
/// Rust analogue; an empty string takes the same "could not start
/// connection" failure path as in C.)
pub fn connect(url: &str) {
    C.with(|cell| {
        let c = &mut *cell.borrow_mut();
        if c.conn.is_some() {
            return; /* already connected / connecting */
        }

        /* Preserve the profile/room set by set_profile across the
         * state reset. The reset below clears every field; if we
         * don't snapshot these first, HELLO ships an empty name and
         * the server falls back to 'guest-N' even when the player has
         * a real profile selected. */
        let saved_token = c.profile_token.clone();
        let saved_name = c.profile_name.clone();
        let saved_room = c.room_code.clone();

        /* The C frees each body_coverage tile_bits calloc here before
         * the memset; replacing the struct drops the Vecs for us. */
        *c = Client::default();
        c.state = NetClientState::Connecting;
        c.profile_token = saved_token;
        c.profile_name = saved_name;
        c.room_code = saved_room;

        match NetConn::connect(url) {
            Some(conn) => {
                c.conn = Some(conn);
                /* Stash for the /saves audit so we know which origin to
                 * GET from. The audit converts the ws/wss scheme to
                 * http/https when it builds the request URL. */
                c.server_url = trunc_bytes(url, SERVER_URL_MAX).to_string();
                println!("[net-client] connecting to {}", url);
            }
            None => {
                eprintln!("[net-client] net_connect({}) failed", url);
                c.error_message = "could not start connection".to_string();
                c.state = NetClientState::Error;
            }
        }
    });
}

/* ------------------------------------------------------------------ */
/* /saves audit.
 *
 * After CHUNK_DIFF replays settle, fetch the server's /saves endpoint
 * and verify every (body, tile) the server says it has on disk is
 * also present in our received-tiles bitset. Tiles within
 * NET_AUDIT_NEAR_RADIUS_M of the player are flagged as ERRORs (the
 * missing blocks would be visible from where the player stands);
 * misses outside that radius are summarised so a 160k-tile planet's
 * far side doesn't drown the console.
 *
 * The fetch lived in the JS half because the C side has no HTTP
 * client - sockets-only via libwebsockets in native. Native builds
 * skip the audit (the audit's a debugging tool aimed at the deployed
 * Fly server, not headless test environments). */

/// Saves-audit fetch glue. Native: no-op, exactly like the C #else
/// branch (no HTTP client in the native build).
fn js_fetch_saves(url: &str) {
    let _ = url;
}

/// /saves/body fetch glue. Native: no-op, exactly like the C #else
/// branch.
fn js_fetch_body(url: &str, body_id: u32) {
    let _ = (url, body_id);
}

/// Build the HTTP origin from the stashed WS url: wss:// -> https://,
/// ws:// -> http://. Anything else leaves the scheme untouched. Strips
/// the trailing slash so the path joins cleanly. (The C repeats this
/// snippet in the audit and the body fetch; factored, same behavior.)
fn http_origin(base: &str) -> String {
    let mut url = if let Some(rest) = base.strip_prefix("wss://") {
        format!("https://{}", rest)
    } else if let Some(rest) = base.strip_prefix("ws://") {
        format!("http://{}", rest)
    } else {
        base.to_string()
    };
    if url.ends_with('/') {
        url.pop();
    }
    url
}

fn maybe_trigger_saves_audit(c: &mut Client) {
    if c.audit_triggered {
        return;
    }
    if c.state != NetClientState::Ready {
        return;
    }
    if c.ready_time == 0.0 {
        return;
    }
    let ready_age = now_sec() - c.ready_time;
    let quiet_for = now_sec() - c.last_chunk_diff_time;
    if ready_age < NET_AUDIT_MIN_READY_S {
        return;
    }
    if quiet_for < NET_AUDIT_QUIET_S {
        return;
    }

    let url = http_origin(&c.server_url);
    /* Append /saves[?room=X]. Empty room code = lobby; the server's
     * filter treats no-room as "every room" so we pass __public__
     * explicitly when we're in the lobby. */
    let fetch_url = if !c.room_code.is_empty() {
        format!("{}/saves?room={}", url, c.room_code)
    } else {
        format!("{}/saves?room=__public__", url)
    };
    println!("[net-client] AUDIT: fetching {}", fetch_url);
    c.audit_triggered = true;
    js_fetch_saves(&fetch_url);
}

/// Re-entry from the JS fetch promise (C: EMSCRIPTEN_KEEPALIVE
/// `net_client_saves_audit_cb`). The future web glue calls this with
/// the /saves response text.
pub fn saves_audit_cb(json: &str) {
    if json.is_empty() {
        return;
    }
    C.with(|cell| run_saves_audit(&mut cell.borrow_mut(), json));
}

/* Minimal JSON scan: walk forward looking for "key" and then ":"
 * followed by an integer. Tolerant of whitespace and the surrounding
 * comma/quote noise our /saves format uses but doesn't try to be a
 * general parser - the response is fixed-shape so this gets us
 * through. Port of match_key / parse_long. */

/// Match `"key"` followed by optional whitespace and colons at `*p`.
/// Advances `*p` past the colon run on a hit.
fn match_key(bytes: &[u8], p: &mut usize, end: usize, key: &str) -> bool {
    let klen = key.len();
    if *p + klen + 3 >= end {
        return false;
    }
    if bytes[*p] != b'"' {
        return false;
    }
    if &bytes[*p + 1..*p + 1 + klen] != key.as_bytes() {
        return false;
    }
    if bytes[*p + 1 + klen] != b'"' {
        return false;
    }
    let mut q = *p + 2 + klen;
    while q < end && (bytes[q] == b' ' || bytes[q] == b'\t' || bytes[q] == b':') {
        q += 1;
    }
    *p = q;
    true
}

/// C `parse_long` (strtol semantics: optional sign, base 10; no digits
/// leaves the cursor unmoved and yields 0).
fn parse_long(bytes: &[u8], p: &mut usize, end: usize) -> i64 {
    while *p < end && (bytes[*p] == b' ' || bytes[*p] == b'\t') {
        *p += 1;
    }
    let start = *p;
    let mut q = *p;
    let mut neg = false;
    if q < end && (bytes[q] == b'-' || bytes[q] == b'+') {
        neg = bytes[q] == b'-';
        q += 1;
    }
    let digits_start = q;
    let mut v: i64 = 0;
    while q < end && bytes[q].is_ascii_digit() {
        v = v.saturating_mul(10).saturating_add((bytes[q] - b'0') as i64);
        q += 1;
    }
    if q == digits_start {
        *p = start; /* strtol: eptr == nptr on no digits */
        return 0;
    }
    *p = q;
    if neg {
        -v
    } else {
        v
    }
}

#[derive(Clone, Copy, Default)]
struct AuditPerBody {
    body_id: u32,
    saved: i32,
    received: i32,
    near_missing: i32,
    total_missing: i32,
}

fn run_saves_audit(c: &mut Client, json: &str) {
    let bytes = json.as_bytes();
    let end = bytes.len();

    /* Find the "tiles":[ ... ] section. */
    let Some(tiles_start) = json.find("\"tiles\"") else {
        eprintln!("[net-client] AUDIT: /saves response missing 'tiles' array");
        return;
    };
    let Some(arr_open_rel) = json[tiles_start..].find('[') else {
        eprintln!("[net-client] AUDIT: malformed /saves response");
        return;
    };
    let mut p = tiles_start + arr_open_rel + 1;

    let (player_pos, player_body_id) = local_player();

    let mut total_in_saves = 0;
    let mut total_received = 0;
    let mut near_missing = 0;
    let mut far_missing = 0;
    /* Distance histogram of missing tiles for the final summary.
     * Buckets are chosen to be readable on a planet-scale walk:
     * within 50 m = "I'd notice on screen right now", within 250 m =
     * "next few seconds of walking", within 1 km = "the nearby
     * chunks", beyond = "far side of the planet, only matters if
     * the player teleports". */
    let mut miss_within_50m = 0;
    let mut miss_within_250m = 0;
    let mut miss_within_1km = 0;
    let mut miss_beyond_1km = 0;
    let mut miss_unknown_dist = 0; /* on a body the player isn't on */
    /* Per-body running counters for the summary line. */
    let mut per_body = [AuditPerBody::default(); NET_BODY_COVERAGE_MAX];
    let mut per_body_count = 0usize;

    while p < end {
        /* Find the next object opening brace. End of array exits. */
        while p < end && bytes[p] != b'{' && bytes[p] != b']' {
            p += 1;
        }
        if p >= end || bytes[p] == b']' {
            break;
        }
        let Some(obj_end_rel) = json[p..].find('}') else {
            break;
        };
        let obj_end = p + obj_end_rel;

        let mut body: i64 = -1;
        let mut tile: i64 = -1;
        let mut room_buf = String::new();

        /* Walk fields inside the object. */
        let mut q = p + 1;
        while q < obj_end {
            while q < obj_end && (bytes[q] == b' ' || bytes[q] == b',' || bytes[q] == b'\t') {
                q += 1;
            }
            if q >= obj_end {
                break;
            }
            if match_key(bytes, &mut q, obj_end, "room") {
                /* "room":"XXX" - grab the string (cap 15 chars like
                 * the C room_buf[16]). */
                while q < obj_end && bytes[q] != b'"' {
                    q += 1;
                }
                if q < obj_end {
                    q += 1;
                    room_buf.clear();
                    while q < obj_end && bytes[q] != b'"' && room_buf.len() + 1 < 16 {
                        room_buf.push(bytes[q] as char);
                        q += 1;
                    }
                }
            } else if match_key(bytes, &mut q, obj_end, "body") {
                body = parse_long(bytes, &mut q, obj_end);
            } else if match_key(bytes, &mut q, obj_end, "tile") {
                tile = parse_long(bytes, &mut q, obj_end);
            } else {
                /* Skip the value for keys we don't care about - jump
                 * past the comma or to the end of the object. */
                while q < obj_end && bytes[q] != b',' && bytes[q] != b'}' {
                    q += 1;
                }
            }
        }
        p = obj_end + 1;

        if body < 0 || tile < 0 {
            continue;
        }
        total_in_saves += 1;

        /* Find the body coverage slot. */
        let slot = c
            .body_coverage
            .iter()
            .position(|s| s.body_id == body as u32);
        let mut received = false;
        if let Some(s) = slot {
            let cov = &c.body_coverage[s];
            if !cov.tile_bits.is_empty() && (tile as i32) < cov.world_tile_count {
                let byte = (tile >> 3) as usize;
                if byte < cov.tile_bits.len() {
                    received = (cov.tile_bits[byte] & (1u8 << (tile & 7))) != 0;
                }
            }
        }
        if received {
            total_received += 1;
        }

        /* Per-body accumulator. */
        let mut pb = (0..per_body_count).find(|&s| per_body[s].body_id == body as u32);
        if pb.is_none() && per_body_count < NET_BODY_COVERAGE_MAX {
            pb = Some(per_body_count);
            per_body[per_body_count].body_id = body as u32;
            per_body_count += 1;
        }
        if let Some(pb) = pb {
            per_body[pb].saved += 1;
            if received {
                per_body[pb].received += 1;
            } else {
                per_body[pb].total_missing += 1;
            }
        }

        /* Distance check - only meaningful when (a) we know the player
         * body, (b) this tile belongs to that body, and (c) we can
         * resolve the tile center via goldberg. */
        if !received {
            let mut dist_m = -1.0f64;
            if player_body_id == body as u32 {
                if let Some(wrc) = world_for_body(body as u32) {
                    let w = wrc.borrow();
                    if let Some(gt) = w.grid.tile(tile as i32) {
                        let tile_world = dvec3_make(
                            w.body.pos_x + gt.center.x * w.body.radius_m,
                            w.body.pos_y + gt.center.y * w.body.radius_m,
                            w.body.pos_z + gt.center.z * w.body.radius_m,
                        );
                        let dx = tile_world.x - player_pos.x;
                        let dy = tile_world.y - player_pos.y;
                        let dz = tile_world.z - player_pos.z;
                        dist_m = (dx * dx + dy * dy + dz * dz).sqrt();
                    }
                }
            }
            /* Histogram. dist_m < 0 means we couldn't resolve a
             * distance (different body than the player) - bucket
             * it separately so the totals still add up. */
            if dist_m < 0.0 {
                miss_unknown_dist += 1;
            } else if dist_m <= 50.0 {
                miss_within_50m += 1;
            } else if dist_m <= 250.0 {
                miss_within_250m += 1;
            } else if dist_m <= 1000.0 {
                miss_within_1km += 1;
            } else {
                miss_beyond_1km += 1;
            }

            if dist_m >= 0.0 && dist_m <= NET_AUDIT_NEAR_RADIUS_M {
                near_missing += 1;
                if let Some(pb) = pb {
                    per_body[pb].near_missing += 1;
                }
                /* Per-tile "blocks will appear missing" trace silenced:
                 * the audit's bitset only counts WebSocket CHUNK_DIFFs,
                 * and the join path now pulls authoritative state via
                 * the /saves/body HTTP bulk fetch (which doesn't touch
                 * the bitset). Every tile "received via HTTP" therefore
                 * shows up here as missing, flooding the console with
                 * false negatives. Restore from git if a real CHUNK_DIFF
                 * loss needs investigating. */
            } else {
                far_missing += 1;
                /* The C's "within 4x near-radius" distant-miss log is
                 * silenced for the same reason as the near-miss line. */
            }
        }
    }
    let _ = (near_missing, far_missing);

    /* End-of-audit summary. The user-facing question is: how many of
     * the server's persisted edits failed to reach me, and where are
     * they relative to where I'm standing? Three blocks of output:
     *   1. Headline counts (totals + missing).
     *   2. Distance histogram of the missing tiles.
     *   3. Per-body breakdown with body name, on-server count,
     *      received count, total missing, and a one-line verdict. */
    let total_missing = total_in_saves - total_received;
    println!("\n[net-client] ====== AUDIT SUMMARY ======");
    println!("[net-client] /saves      = {} tile(s) on server", total_in_saves);
    println!(
        "[net-client] received    = {} tile(s) in client's CHUNK_DIFF set",
        total_received
    );
    println!(
        "[net-client] missing     = {} tile(s) ({:.1}%) - persisted on server but never sent to client",
        total_missing,
        if total_in_saves > 0 {
            100.0 * total_missing as f64 / total_in_saves as f64
        } else {
            0.0
        }
    );
    if total_missing > 0 {
        println!(
            "[net-client] missing distance histogram (from player at body={}):",
            player_body_id
        );
        println!("[net-client]   <=50 m     : {}", miss_within_50m);
        println!("[net-client]   <=250 m    : {}", miss_within_250m);
        println!("[net-client]   <=1 km     : {}", miss_within_1km);
        println!("[net-client]   >1 km      : {}", miss_beyond_1km);
        println!(
            "[net-client]   other body : {}  (can't compute distance from this player)",
            miss_unknown_dist
        );
    }
    println!("[net-client] per-body:");
    for pb in per_body.iter().take(per_body_count) {
        let name = world_for_body(pb.body_id)
            .map(|w| w.borrow().body.name)
            .unwrap_or("?");
        let verdict = if pb.total_missing == 0 {
            "OK - every persisted tile was replayed"
        } else {
            "MISSING CHUNK_DIFFs - server has tiles it never sent"
        };
        println!(
            "[net-client]   body={} ({:<10}): {} saved, {} received, missing {} CHUNK_DIFFs - {}",
            pb.body_id, name, pb.saved, pb.received, pb.total_missing, verdict
        );
    }
    println!("[net-client] ====== END AUDIT SUMMARY ======");
}

/* ------------------------------------------------------------------ */
/* /saves/body lazy-per-body fetch.
 *
 * The WS CHUNK_DIFF replay turned out to be unreliable at scale: a
 * planet with hundreds of persisted columns drops messages on the
 * way down. The HTTP route is TCP-with-retransmits and is the source
 * of truth at boot. We fetch one body at a time, on demand:
 *   - WELCOME -> fetch the spawn body
 *   - body_load_detail (renderer) -> fetch the body about to be meshed
 * Both routes go through fetch_body_saves which dedupes via the
 * per-body fetch-state slot.
 *
 * Format of the binary response (matches saves.h SAVES_BODY_BLOB):
 *   u8[4]  magic = 'TBOD'
 *   u32    version = 1
 *   u32    body_id
 *   u64    seed
 *   u32    tile_count
 *   u32    depth
 *   { u32 tile_idx, u8[depth] blocks } * tile_count
 * ------------------------------------------------------------------ */

const SAVES_BODY_BLOB_MAGIC_LE: u32 = 0x444F_4254; /* 'T' 'B' 'O' 'D' little-endian */
const SAVES_BODY_BLOB_HEADER: usize = 28;

/// Re-entry from the JS fetch promise (C: EMSCRIPTEN_KEEPALIVE
/// `net_client_body_blob_cb`). The future web glue calls this with the
/// /saves/body response bytes; an empty slice is the C's NULL/len<=0
/// "empty response" path.
pub fn body_blob_cb(body_id: u32, data: &[u8]) {
    C.with(|cell| {
        let c = &mut *cell.borrow_mut();
        if data.is_empty() {
            eprintln!(
                "[net-client] /saves/body body={}: empty response (len={})",
                body_id,
                data.len()
            );
            /* Mark idle again so a retry has a chance. */
            for f in c.body_fetch.iter_mut() {
                if f.body_id == body_id {
                    f.state = 0;
                    break;
                }
            }
            return;
        }
        apply_body_blob(c, body_id, data);
    });
}

/// Port of `net_client_spawn_body_ready()`.
pub fn spawn_body_ready() -> bool {
    C.with(|cell| {
        let c = cell.borrow();
        /* Pre-WELCOME: not connected to a server, so there's nothing to
         * wait for. Returning true lets the SP / native path through
         * (the player_update freeze gate is "block updates until ready"
         * and SP needs to never freeze). */
        if c.state != NetClientState::Ready {
            return true;
        }
        /* WELCOME body_id of 0xFFFFFFFF means "no specific spawn body" -
         * defensive, shouldn't happen in practice. Treat as ready. */
        let bid = c.welcome.body_id;
        if bid == 0xFFFF_FFFF {
            return true;
        }
        /* Walk the per-body fetch table; slot state == 2 is "done". */
        for f in &c.body_fetch {
            if f.body_id == bid {
                return f.state == 2;
            }
        }
        /* No slot yet - the WELCOME path enqueues the fetch synchronously
         * so this only fires for one frame, but we treat "not enqueued"
         * as not-ready so the player stays frozen until the fetch round-
         * trips. */
        false
    })
}

fn fetch_body_saves_inner(c: &mut Client, body_id: u32) {
    if c.state != NetClientState::Ready {
        /* Pre-READY: stash nothing - the WELCOME path re-issues the
         * fetch for the spawn body once we know the URL anyway. */
        return;
    }
    if c.server_url.is_empty() {
        return;
    }

    /* Dedupe: idle / in-flight / done state per body. Allocate a slot
     * on first call. */
    let mut slot = c.body_fetch.iter().position(|f| f.body_id == body_id);
    if slot.is_none() && c.body_fetch.len() < NET_BODY_COVERAGE_MAX {
        c.body_fetch.push(BodyFetch { body_id, state: 0 });
        slot = Some(c.body_fetch.len() - 1);
    }
    let Some(slot) = slot else {
        eprintln!(
            "[net-client] body-fetch table full, can't track body={}",
            body_id
        );
        return;
    };
    if c.body_fetch[slot].state != 0 {
        /* Already fetched or in flight; skip. */
        return;
    }
    c.body_fetch[slot].state = 1;

    /* Build the HTTP URL the same way the audit does: ws:// -> http://,
     * wss:// -> https://. */
    let origin = http_origin(&c.server_url);
    let url = if !c.room_code.is_empty() {
        format!(
            "{}/saves/body?room={}&body={}&seed={}",
            origin, c.room_code, body_id, c.welcome.world_seed
        )
    } else {
        format!(
            "{}/saves/body?room=__public__&body={}&seed={}",
            origin, body_id, c.welcome.world_seed
        )
    };
    println!("[net-client] /saves/body fetch -> {}", url);
    js_fetch_body(&url, body_id);
}

/// Port of `net_client_fetch_body_saves()`.
pub fn fetch_body_saves(body_id: u32) {
    C.with(|cell| fetch_body_saves_inner(&mut cell.borrow_mut(), body_id));
}

fn resync_body_saves_inner(c: &mut Client, body_id: u32) {
    if c.state != NetClientState::Ready {
        return;
    }
    /* Find the dedup slot and force it back to idle, so the
     * fetch_body_saves call below doesn't bail on "already done".
     * If the body has never been fetched, the call will allocate
     * a slot itself - nothing to reset here. */
    for f in c.body_fetch.iter_mut() {
        if f.body_id == body_id {
            /* Don't disturb in-flight fetches - the response will
             * land naturally. Only reset done (state == 2) slots. */
            if f.state == 2 {
                f.state = 0;
            }
            break;
        }
    }
    fetch_body_saves_inner(c, body_id);
}

/// Port of `net_client_resync_body_saves()`.
pub fn resync_body_saves(body_id: u32) {
    C.with(|cell| resync_body_saves_inner(&mut cell.borrow_mut(), body_id));
}

fn apply_body_blob(c: &mut Client, expected_body_id: u32, data: &[u8]) {
    if data.len() < SAVES_BODY_BLOB_HEADER {
        eprintln!(
            "[net-client] body blob too small ({} bytes) for body={}",
            data.len(),
            expected_body_id
        );
        return;
    }
    let magic = u32::from_le_bytes(data[0..4].try_into().unwrap());
    let _version = u32::from_le_bytes(data[4..8].try_into().unwrap());
    let body_id_in = u32::from_le_bytes(data[8..12].try_into().unwrap());
    let _seed = u64::from_le_bytes(data[12..20].try_into().unwrap());
    let tile_count = u32::from_le_bytes(data[20..24].try_into().unwrap());
    let depth = u32::from_le_bytes(data[24..28].try_into().unwrap());
    if magic != SAVES_BODY_BLOB_MAGIC_LE {
        eprintln!(
            "[net-client] body blob magic mismatch for body={} (got 0x{:08x}, expected 0x{:08x})",
            expected_body_id, magic, SAVES_BODY_BLOB_MAGIC_LE
        );
        return;
    }
    if body_id_in != expected_body_id {
        eprintln!(
            "[net-client] body blob body_id mismatch (response {}, requested {})",
            body_id_in, expected_body_id
        );
        /* Trust the response's body_id - the URL might have routed
         * somewhere unexpected and applying to the wrong world would
         * silently corrupt the right one. */
    }

    let Some(wrc) = world_for_body(body_id_in) else {
        eprintln!(
            "[net-client] body blob body={} unknown to renderer, {} tile(s) DROPPED",
            body_id_in, tile_count
        );
        return;
    };
    if depth as i32 != WORLD_MAX_DEPTH {
        eprintln!(
            "[net-client] body blob depth={} != WORLD_MAX_DEPTH={}, refusing to apply",
            depth, WORLD_MAX_DEPTH
        );
        return;
    }

    let record_size = 4 + depth as usize;
    let mut cursor = SAVES_BODY_BLOB_HEADER;
    let mut applied_tiles = 0;
    let mut applied_cells = 0;
    {
        let mut w = wrc.borrow_mut();
        for i in 0..tile_count {
            if cursor + record_size > data.len() {
                eprintln!(
                    "[net-client] body blob truncated at record {}/{}",
                    i, tile_count
                );
                break;
            }
            let tile_idx = u32::from_le_bytes(data[cursor..cursor + 4].try_into().unwrap());
            cursor += 4;
            let col = &data[cursor..cursor + depth as usize];
            cursor += depth as usize;
            if (tile_idx as i32) < 0 || (tile_idx as i32) >= w.tile_count {
                continue;
            }
            /* Apply the saved column wholesale. world_set marks the
             * tile + neighbors dirty so the renderer remeshes on the
             * next frame; if the body is already meshed this is a
             * visible refresh, if it isn't (deferred) the bits stick
             * until body_full_mesh runs. */
            for (d, &raw) in col.iter().enumerate() {
                w.set(
                    tile_idx as i32,
                    d as i32,
                    Block::from_raw(raw).unwrap_or(Block::Air),
                );
                applied_cells += 1;
            }
            applied_tiles += 1;
        }
    }

    /* Mark the fetch slot done so re-approach skips the refetch. */
    for f in c.body_fetch.iter_mut() {
        if f.body_id == expected_body_id {
            f.state = 2;
            break;
        }
    }

    let name = wrc.borrow().body.name;
    println!(
        "[net-client] /saves/body body={} ({}) applied: {} tile(s), {} cell(s) ({} bytes received)",
        body_id_in,
        name,
        applied_tiles,
        applied_cells,
        data.len()
    );

    /* If this fetch was triggered by a server SYNC_TICK, echo the
     * seq_id back so the server can measure the round-trip and feed
     * its interval-adaptation logic. Sent on the reliable channel
     * - dropping an ACK would let the server interval drift upward
     * unnecessarily. Clear the pending flag so a subsequent fetch
     * triggered by something else (re-approach to a body, manual
     * refresh) doesn't accidentally re-ACK the same seq. */
    if c.pending_sync_active && c.state == NetClientState::Ready {
        let ack = proto::MsgSyncAck {
            seq_id: c.pending_sync_seq,
        };
        let mut buf = [0u8; proto::MSG_HEADER_SIZE + proto::MSG_SYNC_ACK_WIRE_SIZE];
        let bn = proto::write_sync_ack(&mut buf, &ack);
        if bn > 0 {
            send_raw(c, NetChannel::Reliable, &buf[..bn]);
        }
        c.pending_sync_active = false;
    }
}

/// Port of `net_client_tick()`. Per-frame pump: drains the transport's
/// event queue (the C net_poll_client) and dispatches, then runs the
/// edit-ack timeout sweep and the audit trigger.
pub fn tick() {
    C.with(|cell| {
        let c = &mut *cell.borrow_mut();
        let events = match &mut c.conn {
            Some(conn) => conn.poll(),
            None => Vec::new(),
        };
        for ev in events {
            match ev {
                NetEvent::Open => on_open(c),
                NetEvent::Msg { data, .. } => on_msg(c, &data),
                NetEvent::Close { reason } => on_close(c, reason),
            }
        }
        pending_edit_check_timeouts(c);
        maybe_trigger_saves_audit(c);
    });
}

/// Port of `net_client_disconnect()`.
pub fn disconnect() {
    C.with(|cell| {
        let c = &mut *cell.borrow_mut();
        let Some(mut conn) = c.conn.take() else {
            return;
        };
        conn.close();
        c.state = NetClientState::Idle;
    });
}

/// Port of `net_client_state()`.
pub fn state() -> NetClientState {
    C.with(|cell| cell.borrow().state)
}

/// Port of `net_client_can_retry()`.
pub fn can_retry() -> bool {
    C.with(|cell| !cell.borrow().no_retry)
}

/// Port of `net_client_welcome()` (returns a copy instead of a
/// pointer into the module state).
pub fn welcome() -> NetClientWelcome {
    C.with(|cell| cell.borrow().welcome)
}

/// Port of `net_client_error_message()`. `None` if the client has
/// never failed; cleared on the next connect().
pub fn error_message() -> Option<String> {
    C.with(|cell| {
        let c = cell.borrow();
        if c.error_message.is_empty() {
            None
        } else {
            Some(c.error_message.clone())
        }
    })
}

/// Port of `net_client_last_desync()`. Returns
/// `(kind, seconds_ago, block_type)`; seconds_ago is -1.0 when the
/// server has never flagged us (the C out-param convention).
pub fn last_desync() -> (NetDesyncKind, f64, u32) {
    C.with(|cell| {
        let c = cell.borrow();
        let seconds_ago = if c.last_desync_time == 0.0 {
            -1.0
        } else {
            now_sec() - c.last_desync_time
        };
        (c.last_desync, seconds_ago, c.last_desync_block)
    })
}

/* ------------------------------------------------------------------ */
/* Test access (no C equivalent - the C tests peeked at the static).   */
/* ------------------------------------------------------------------ */

/// Feed raw wire bytes straight into the receive path, bypassing the
/// socket. Test-only stand-in for the transport's on_msg callback.
#[cfg(test)]
fn test_on_msg(data: &[u8]) {
    C.with(|cell| on_msg(&mut cell.borrow_mut(), data));
}

/// (sent, acked, timed_out) edit counters.
#[cfg(test)]
fn test_edit_stats() -> (u32, u32, u32) {
    C.with(|cell| {
        let c = cell.borrow();
        (
            c.edits_sent_total,
            c.edits_acked_total,
            c.edits_timed_out_total,
        )
    })
}

/* ================================================================== */

#[cfg(test)]
mod tests {
    use super::test_doubles::set_now;
    use super::*;
    use futures_util::{SinkExt, StreamExt};
    use std::time::{Duration, Instant};
    use tenebris_core::planet::{self, BodyId};
    use tokio_tungstenite::tungstenite::Message;

    const TEST_TIMEOUT: Duration = Duration::from_secs(10);

    /* ------------------------------------------------------------- */
    /* Loopback WS server: accepts one connection; inbound binary
     * frames surface on a std channel, outbound frames are pushed via
     * a tokio channel. */

    struct TestServer {
        url: String,
        rx: std::sync::mpsc::Receiver<Vec<u8>>,
        tx: tokio::sync::mpsc::UnboundedSender<Vec<u8>>,
        _rt: tokio::runtime::Runtime,
    }

    fn spawn_server() -> TestServer {
        let rt = tokio::runtime::Builder::new_multi_thread()
            .worker_threads(1)
            .enable_all()
            .build()
            .unwrap();
        let std_l = std::net::TcpListener::bind(("127.0.0.1", 0)).unwrap();
        std_l.set_nonblocking(true).unwrap();
        let port = std_l.local_addr().unwrap().port();
        let (in_tx, in_rx) = std::sync::mpsc::channel::<Vec<u8>>();
        let (out_tx, mut out_rx) = tokio::sync::mpsc::unbounded_channel::<Vec<u8>>();
        rt.spawn(async move {
            use tokio_tungstenite::tungstenite::handshake::server::{Request, Response};
            let l = tokio::net::TcpListener::from_std(std_l).unwrap();
            let Ok((s, _)) = l.accept().await else { return };
            /* Echo the offered subprotocol like the real server
             * transport does (tungstenite clients reject a server
             * that ignores a requested protocol). */
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
            loop {
                tokio::select! {
                    m = src.next() => match m {
                        Some(Ok(Message::Binary(b))) => { let _ = in_tx.send(b); }
                        Some(Ok(_)) => {}
                        _ => break,
                    },
                    o = out_rx.recv() => match o {
                        Some(b) => {
                            if sink.send(Message::Binary(b)).await.is_err() {
                                break;
                            }
                        }
                        None => break,
                    },
                }
            }
        });
        TestServer {
            url: format!("ws://127.0.0.1:{}/", port),
            rx: in_rx,
            tx: out_tx,
            _rt: rt,
        }
    }

    /// tick() until `pred`, with a wall-clock timeout. The test clock
    /// (set_now) is NOT advanced here - callers control sim time.
    fn pump_until(mut pred: impl FnMut() -> bool) {
        let start = Instant::now();
        while !pred() {
            tick();
            assert!(start.elapsed() < TEST_TIMEOUT, "pump_until timed out");
            std::thread::sleep(Duration::from_millis(5));
        }
    }

    /// tick() until the server has received one binary frame.
    fn pump_recv(srv: &TestServer) -> Vec<u8> {
        let start = Instant::now();
        loop {
            tick();
            if let Ok(b) = srv.rx.try_recv() {
                return b;
            }
            assert!(start.elapsed() < TEST_TIMEOUT, "pump_recv timed out");
            std::thread::sleep(Duration::from_millis(5));
        }
    }

    /* ------------------------------------------------------------- */
    /* Wire-bytes builders (real proto encoding - byte-exact).         */

    fn welcome_bytes(player_id: u32, body_id: u32) -> Vec<u8> {
        let w = proto::MsgWelcome {
            player_id,
            world_seed: 424242,
            spawn_x: 1.5,
            spawn_y: -2.5,
            spawn_z: 3.0,
            body_id,
            spawn_yaw: 0.25,
            spawn_pitch: -0.125,
        };
        let mut buf = vec![0u8; proto::MSG_HEADER_SIZE + proto::MSG_WELCOME_WIRE_SIZE];
        let n = proto::write_welcome(&mut buf, &w);
        assert_eq!(n, buf.len());
        buf
    }

    fn chunk_diff_bytes(body_id: u32, edits: &[(u32, u16, u16)]) -> Vec<u8> {
        let mut d = proto::MsgChunkDiff::default();
        d.body_id = body_id;
        d.edit_count = edits.len() as u16;
        for (i, &(tile, depth, block)) in edits.iter().enumerate() {
            d.edits[i] = proto::MsgChunkDiffEntry {
                tile_idx: tile,
                depth,
                block_type: block,
            };
        }
        let mut buf = vec![
            0u8;
            proto::MSG_HEADER_SIZE
                + proto::MSG_CHUNK_DIFF_HEADER_SIZE
                + edits.len() * proto::MSG_CHUNK_DIFF_ENTRY_SIZE
        ];
        let n = proto::write_chunk_diff(&mut buf, &d);
        assert_eq!(n, buf.len());
        buf
    }

    fn torch_diff_bytes(body_id: u32, entries: &[(u8, u32, [f32; 3], [f32; 3])]) -> Vec<u8> {
        let mut d = proto::MsgTorchDiff::default();
        d.body_id = body_id;
        d.entry_count = entries.len() as u16;
        for (i, &(op, tile, pos, up)) in entries.iter().enumerate() {
            d.entries[i] = proto::MsgTorchEntry {
                op,
                reserved8: 0,
                reserved16: 0,
                tile_idx: tile,
                pos_x: pos[0],
                pos_y: pos[1],
                pos_z: pos[2],
                up_x: up[0],
                up_y: up[1],
                up_z: up[2],
            };
        }
        let mut buf = vec![
            0u8;
            proto::MSG_HEADER_SIZE
                + proto::MSG_TORCH_DIFF_HEADER
                + entries.len() * proto::MSG_TORCH_ENTRY_SIZE
        ];
        let n = proto::write_torch_diff(&mut buf, &d);
        assert_eq!(n, buf.len());
        buf
    }

    fn player_info_bytes(player_id: u32, name: &str) -> Vec<u8> {
        let mut m = proto::MsgPlayerInfo::default();
        m.player_id = player_id;
        copy_padded(&mut m.name, name);
        let mut buf = vec![0u8; proto::MSG_HEADER_SIZE + proto::MSG_PLAYER_INFO_WIRE_SIZE];
        let n = proto::write_player_info(&mut buf, &m);
        assert_eq!(n, buf.len());
        buf
    }

    /// Small real world (Tenebris body, subdiv 3 = 92 tiles), wrapped
    /// for the registry.
    fn make_world() -> Rc<RefCell<World>> {
        let body = planet::get(BodyId::Tenebris);
        Rc::new(RefCell::new(World::create(&body, 3)))
    }

    fn make_ready(player_id: u32, body_id: u32) {
        set_now(100.0);
        test_on_msg(&welcome_bytes(player_id, body_id));
        assert_eq!(state(), NetClientState::Ready);
    }

    /// SAVES_BODY_BLOB bytes for one tile column.
    fn body_blob_bytes(body_id: u32, tile_idx: u32, fill: u8) -> Vec<u8> {
        let mut b = Vec::new();
        b.extend_from_slice(&SAVES_BODY_BLOB_MAGIC_LE.to_le_bytes());
        b.extend_from_slice(&1u32.to_le_bytes()); /* version */
        b.extend_from_slice(&body_id.to_le_bytes());
        b.extend_from_slice(&424242u64.to_le_bytes()); /* seed */
        b.extend_from_slice(&1u32.to_le_bytes()); /* tile_count */
        b.extend_from_slice(&(WORLD_MAX_DEPTH as u32).to_le_bytes());
        b.extend_from_slice(&tile_idx.to_le_bytes());
        b.extend_from_slice(&vec![fill; WORLD_MAX_DEPTH as usize]);
        b
    }

    /* ------------------------------------------------------------- */
    /* Handshake over a real loopback socket                           */

    #[test]
    fn handshake_hello_welcome_over_loopback() {
        set_now(50.0);
        let srv = spawn_server();
        set_profile("tok-abcdef", "Anna", "T9VVPW");
        connect(&srv.url);
        assert_eq!(state(), NetClientState::Connecting);

        /* on_open fires through tick() -> HELLO reaches the server. */
        let hello = pump_recv(&srv);
        assert_eq!(state(), NetClientState::Handshake);
        let hdr = proto::read_header(&hello).expect("hello header");
        assert_eq!(hdr.kind, MsgKind::Hello as u16);
        assert_eq!(hdr.version, proto::MSG_HELLO_VERSION);
        let h = proto::read_hello(&hello[proto::MSG_HEADER_SIZE..]).expect("hello body");
        assert_eq!(h.client_version, proto::TENEBRIS_PROTOCOL_VERSION);
        assert_eq!(&h.token[..10], b"tok-abcdef");
        assert_eq!(&h.name[..4], b"Anna");
        assert_eq!(h.name[4], 0); /* null-padded */
        assert_eq!(&h.room_code[..6], b"T9VVPW");

        /* WELCOME back through the real socket -> READY + captured. */
        srv.tx.send(welcome_bytes(7, 0)).unwrap();
        pump_until(|| state() == NetClientState::Ready);
        let w = welcome();
        assert_eq!(w.player_id, 7);
        assert_eq!(w.world_seed, 424242);
        assert_eq!(w.spawn_x, 1.5);
        assert_eq!(w.spawn_y, -2.5);
        assert_eq!(w.spawn_z, 3.0);
        assert_eq!(w.body_id, 0);
        assert_eq!(w.spawn_yaw, 0.25);
        assert_eq!(w.spawn_pitch, -0.125);
        /* WELCOME caches the local profile name. */
        assert_eq!(name_for_id(7).as_deref(), Some("Anna"));
        assert!(can_retry());
        assert!(error_message().is_none());

        /* Server vanishing mid-session -> ERROR + the C message. */
        drop(srv);
        pump_until(|| state() == NetClientState::Error);
        assert_eq!(error_message().as_deref(), Some("lost connection to server"));
    }

    #[test]
    fn connection_refused_sets_error_message() {
        set_now(10.0);
        let port = {
            let l = std::net::TcpListener::bind(("127.0.0.1", 0)).unwrap();
            l.local_addr().unwrap().port()
        };
        connect(&format!("ws://127.0.0.1:{}/", port));
        pump_until(|| state() == NetClientState::Error);
        /* Close before READY with ProtocolErr (the C
         * CLIENT_CONNECTION_ERROR path). */
        assert_eq!(error_message().as_deref(), Some("could not reach server"));
        assert!(can_retry());
    }

    /* ------------------------------------------------------------- */
    /* WELCOME edge cases (headless receive path)                      */

    #[test]
    fn welcome_version_mismatch_is_error() {
        set_now(10.0);
        let mut bytes = welcome_bytes(1, 0);
        /* Corrupt the header version field (offset 2, u16 LE). */
        bytes[2] = 0xEE;
        bytes[3] = 0x00;
        test_on_msg(&bytes);
        assert_eq!(state(), NetClientState::Error);
    }

    #[test]
    fn kick_sets_terminal_error() {
        make_ready(3, 0);
        let mut k = proto::MsgKick::default();
        k.reason = proto::KICK_VERSION_MISMATCH;
        copy_padded(&mut k.text, "client is outdated - refresh the page");
        let mut buf = vec![0u8; proto::MSG_HEADER_SIZE + proto::MSG_KICK_WIRE_SIZE];
        let n = proto::write_kick(&mut buf, &k);
        assert_eq!(n, buf.len());
        test_on_msg(&buf);
        assert_eq!(state(), NetClientState::Error);
        assert!(!can_retry());
        assert_eq!(
            error_message().as_deref(),
            Some("client is outdated - refresh the page")
        );
    }

    #[test]
    fn desync_notice_captured() {
        make_ready(3, 0);
        assert_eq!(last_desync(), (NetDesyncKind::None, -1.0, 0));
        let d = proto::MsgDesync {
            reason: proto::DESYNC_INSIDE_SOLID,
            body_id: 0,
            client_pos_x: 1.0,
            client_pos_y: 2.0,
            client_pos_z: 3.0,
            block_type: 4,
        };
        let mut buf = vec![0u8; proto::MSG_HEADER_SIZE + proto::MSG_DESYNC_WIRE_SIZE];
        let n = proto::write_desync(&mut buf, &d);
        assert_eq!(n, buf.len());
        set_now(101.0);
        test_on_msg(&buf);
        set_now(103.5);
        let (kind, ago, block) = last_desync();
        assert_eq!(kind, NetDesyncKind::InsideSolid);
        assert!((ago - 2.5).abs() < 1e-9, "ago = {ago}");
        assert_eq!(block, 4);
    }

    /* ------------------------------------------------------------- */
    /* CHUNK_DIFF application + pending-edit ack/replay (loopback)     */

    #[test]
    fn chunk_diff_applies_acks_and_times_out() {
        set_now(50.0);
        let srv = spawn_server();
        set_profile("", "Bob", "");
        connect(&srv.url);
        let _hello = pump_recv(&srv);
        srv.tx.send(welcome_bytes(9, 0)).unwrap();
        pump_until(|| state() == NetClientState::Ready);

        let world = make_world();
        renderer::test_register_world(&world);

        /* Our edit goes out as a PLAYER_CMD and lands in the pending
         * table. */
        set_now(60.0);
        send_edit(proto::PLAYER_CMD_PLACE, 0, 5, 10, 3);
        let cmd = pump_recv(&srv);
        let hdr = proto::read_header(&cmd).unwrap();
        assert_eq!(hdr.kind, MsgKind::PlayerCmd as u16);
        let pc = proto::read_player_cmd(&cmd[proto::MSG_HEADER_SIZE..]).unwrap();
        assert_eq!(pc.cmd_kind, proto::PLAYER_CMD_PLACE);
        assert_eq!(pc.body_id, 0);
        assert_eq!(pc.tile_idx, 5);
        assert_eq!(pc.depth, 10);
        assert_eq!(pc.block_type, 3);
        assert_eq!(test_edit_stats(), (1, 0, 0));

        /* The server's broadcast echo acks ours; the extra entry is a
         * peer edit that must apply without matching the table. */
        set_now(60.1);
        test_on_msg(&chunk_diff_bytes(0, &[(5, 10, 3), (6, 11, 4)]));
        assert_eq!(test_edit_stats(), (1, 1, 0));
        {
            let w = world.borrow();
            assert_eq!(w.get(5, 10), Block::from_raw(3).unwrap());
            assert_eq!(w.get(6, 11), Block::from_raw(4).unwrap());
        }

        /* A diff for an unregistered body is dropped loudly but safely. */
        test_on_msg(&chunk_diff_bytes(31, &[(1, 1, 2)]));

        /* Second edit never echoed: ages past NET_EDIT_ACK_TIMEOUT_S
         * and is reported as timed out. */
        send_edit(proto::PLAYER_CMD_BREAK, 0, 7, 12, 0);
        let _ = pump_recv(&srv);
        assert_eq!(test_edit_stats(), (2, 1, 0));
        set_now(60.1 + NET_EDIT_ACK_TIMEOUT_S + 1.0);
        tick();
        assert_eq!(test_edit_stats(), (2, 1, 1));

        disconnect();
        assert_eq!(state(), NetClientState::Idle);
    }

    #[test]
    fn chunk_diff_ack_prefers_oldest_matching_edit() {
        set_now(50.0);
        let srv = spawn_server();
        connect(&srv.url);
        let _hello = pump_recv(&srv);
        srv.tx.send(welcome_bytes(9, 0)).unwrap();
        pump_until(|| state() == NetClientState::Ready);
        renderer::test_register_world(&make_world());

        /* Two edits to the SAME cell; the first ack must release the
         * older slot, the second the newer. */
        set_now(60.0);
        send_edit(proto::PLAYER_CMD_PLACE, 0, 5, 10, 3);
        set_now(61.0);
        send_edit(proto::PLAYER_CMD_PLACE, 0, 5, 10, 4);
        let _ = pump_recv(&srv);
        let _ = pump_recv(&srv);
        assert_eq!(test_edit_stats(), (2, 0, 0));

        /* One CHUNK_DIFF entry acks exactly one outstanding edit
         * (block mismatch on the older slot logs a WARN but still
         * acks - the round trip completed). */
        test_on_msg(&chunk_diff_bytes(0, &[(5, 10, 4)]));
        assert_eq!(test_edit_stats(), (2, 1, 0));
        test_on_msg(&chunk_diff_bytes(0, &[(5, 10, 4)]));
        assert_eq!(test_edit_stats(), (2, 2, 0));
        /* Third echo matches nothing: replay/peer, not an ack. */
        test_on_msg(&chunk_diff_bytes(0, &[(5, 10, 4)]));
        assert_eq!(test_edit_stats(), (2, 2, 0));
    }

    /* ------------------------------------------------------------- */
    /* TORCH_DIFF -> torch module list                                 */

    #[test]
    fn torch_diff_place_echo_dedup_and_remove() {
        /* torch::init() uploads GPU geometry (needs a live sokol-gfx
         * context); shutdown() only resets the list, which is all the
         * headless diff path needs. */
        torch::shutdown();
        make_ready(3, 0);
        renderer::test_register_world(&make_world());

        let place = torch_diff_bytes(
            0,
            &[(proto::TORCH_OP_PLACE, 5, [10.0, 20.0, 30.0], [0.0, 1.0, 0.0])],
        );
        test_on_msg(&place);
        assert_eq!(torch::count(), 1);
        let t = torch::list()[0];
        assert_eq!(t.tile_idx, 5);
        assert_eq!(t.position, vec3_make(10.0, 20.0, 30.0));

        /* Round-trip echo of our own placement: dedup by position
         * within MATCH_EPS (0.1 m) - no double-add. */
        test_on_msg(&place);
        assert_eq!(torch::count(), 1);

        /* A second torch >10 cm away is a real placement. */
        test_on_msg(&torch_diff_bytes(
            0,
            &[(proto::TORCH_OP_PLACE, 5, [10.0, 20.5, 30.0], [0.0, 1.0, 0.0])],
        ));
        assert_eq!(torch::count(), 2);

        /* REMOVE matches by proximity within REMOVE_RANGE_M (1 m). */
        test_on_msg(&torch_diff_bytes(
            0,
            &[(proto::TORCH_OP_REMOVE, 5, [10.05, 20.0, 30.0], [0.0, 1.0, 0.0])],
        ));
        assert_eq!(torch::count(), 1);

        /* Unregistered body: dropped. */
        test_on_msg(&torch_diff_bytes(
            13,
            &[(proto::TORCH_OP_PLACE, 1, [0.0, 0.0, 0.0], [0.0, 1.0, 0.0])],
        ));
        assert_eq!(torch::count(), 1);
        torch::shutdown();
    }

    /* ------------------------------------------------------------- */
    /* WATER_STATE_DIFF -> world_water column                          */

    #[test]
    fn water_state_diff_loads_column_and_dirties() {
        make_ready(3, 0);
        let world = make_world();
        renderer::test_register_world(&world);

        let mut wsd = proto::MsgWaterStateDiff::default();
        wsd.body_id = 0;
        wsd.tile_idx = 4;
        wsd.state[64] = world_water::state_pack(true, false, 8);
        wsd.state[65] = world_water::state_pack(false, true, 3);
        let mut buf = vec![0u8; proto::MSG_HEADER_SIZE + proto::MSG_WATER_STATE_DIFF_WIRE_SIZE];
        let n = proto::write_water_state_diff(&mut buf, &wsd);
        assert_eq!(n, buf.len());
        test_on_msg(&buf);

        let mut w = world.borrow_mut();
        assert_eq!(world_water::get_state(&w, 4, 64), wsd.state[64]);
        assert_eq!(world_water::get_state(&w, 4, 65), wsd.state[65]);
        /* Tile + every edge neighbour got mesh-dirtied. */
        assert!(w.tile_dirty(4));
        let (n_nb, nbs) = {
            let gt = w.grid.tile(4).unwrap();
            (gt.num_neighbors, gt.neighbors)
        };
        for i in 0..n_nb as usize {
            assert!(w.tile_dirty(nbs[i]), "neighbour {} not dirtied", nbs[i]);
        }
        w.tile_clear_dirty(4);
    }

    /* ------------------------------------------------------------- */
    /* Name cache semantics                                            */

    #[test]
    fn name_cache_populates_updates_and_caps() {
        make_ready(1, 0);
        /* Unknown id: None (and a throttled request would fire if a
         * conn existed - here it silently doesn't, like C with a
         * dead socket). */
        assert_eq!(name_for_id(42), None);

        test_on_msg(&player_info_bytes(42, "bob"));
        assert_eq!(name_for_id(42).as_deref(), Some("bob"));

        /* Same id again: entry is updated in place, not duplicated. */
        test_on_msg(&player_info_bytes(42, "bobby"));
        assert_eq!(name_for_id(42).as_deref(), Some("bobby"));

        /* Empty names are ignored (C: !*name). */
        test_on_msg(&player_info_bytes(43, ""));
        assert_eq!(name_for_id(43), None);

        /* Cache cap: NET_NAME_CACHE_SIZE entries total; overflow is
         * silently dropped. One slot is already used by id 42. */
        for i in 0..(NET_NAME_CACHE_SIZE as u32) {
            test_on_msg(&player_info_bytes(100 + i, &format!("p{}", i)));
        }
        assert_eq!(
            name_for_id(100 + NET_NAME_CACHE_SIZE as u32 - 2).as_deref(),
            Some(format!("p{}", NET_NAME_CACHE_SIZE - 2).as_str())
        );
        /* The last insert exceeded the cap and was dropped. */
        assert_eq!(name_for_id(100 + NET_NAME_CACHE_SIZE as u32 - 1), None);

        /* NACK marks the id as not-retryable; the cache stays as-is. */
        let nack = proto::MsgPlayerInfoNack {
            player_id: 42,
            reason: proto::PLAYER_INFO_NACK_UNKNOWN_ID,
        };
        let mut buf = vec![0u8; proto::MSG_HEADER_SIZE + proto::MSG_PLAYER_INFO_NACK_WIRE_SIZE];
        let n = proto::write_player_info_nack(&mut buf, &nack);
        assert_eq!(n, buf.len());
        test_on_msg(&buf);
        assert_eq!(name_for_id(42).as_deref(), Some("bobby"));
    }

    /* ------------------------------------------------------------- */
    /* Snapshot ingestion -> remote_players                            */

    #[test]
    fn snapshot_skips_local_player() {
        remote_players::init();
        make_ready(7, 0);
        let mut snap = proto::MsgSnapshot::default();
        snap.server_tick = 1;
        snap.player_count = 3;
        for (i, id) in [7u32, 8, 9].iter().enumerate() {
            snap.players[i] = proto::MsgSnapshotEntry {
                player_id: *id,
                body_id: 0,
                pos_x: *id as f64,
                pos_y: 0.0,
                pos_z: 0.0,
                yaw: 0.0,
                pitch: 0.0,
            };
        }
        let mut buf = vec![
            0u8;
            proto::MSG_HEADER_SIZE
                + proto::MSG_SNAPSHOT_HEADER_SIZE
                + 3 * proto::MSG_SNAPSHOT_ENTRY_SIZE
        ];
        let n = proto::write_snapshot(&mut buf, &snap);
        assert_eq!(n, buf.len());
        test_on_msg(&buf);
        assert_eq!(remote_players::count(), 2);
        assert_eq!(remote_players::get(0).unwrap().player_id, 8);
        assert_eq!(remote_players::get(1).unwrap().player_id, 9);
        remote_players::init();
    }

    /* ------------------------------------------------------------- */
    /* Inventory restore                                               */

    #[test]
    fn pending_inventory_take_once() {
        make_ready(2, 0);
        assert!(take_pending_inventory().is_none());
        let mut inv = proto::MsgInventoryState {
            player_id: 0,
            slot_type: [0; 9],
            slot_count: [0; 9],
            selected: 4,
            reserved: [0; 3],
        };
        inv.slot_type[0] = 7;
        inv.slot_count[0] = 12;
        inv.slot_type[8] = 2;
        inv.slot_count[8] = -1;
        let mut buf = vec![0u8; proto::MSG_HEADER_SIZE + proto::MSG_INVENTORY_STATE_WIRE_SIZE];
        let n = proto::write_inventory_state(&mut buf, &inv);
        assert_eq!(n, buf.len());
        test_on_msg(&buf);
        let (types, counts, selected) = take_pending_inventory().expect("pending");
        assert_eq!(types[0], 7);
        assert_eq!(counts[0], 12);
        assert_eq!(types[8], 2);
        assert_eq!(counts[8], -1);
        assert_eq!(selected, 4);
        /* Read-and-clear: second take is empty. */
        assert!(take_pending_inventory().is_none());

        /* Out-of-range selected falls back to 0. */
        inv.selected = 9;
        let n = proto::write_inventory_state(&mut buf, &inv);
        assert_eq!(n, buf.len());
        test_on_msg(&buf);
        let (_, _, selected) = take_pending_inventory().unwrap();
        assert_eq!(selected, 0);
    }

    /* ------------------------------------------------------------- */
    /* /saves/body blob + spawn_body_ready + SYNC ack                  */

    #[test]
    fn body_blob_apply_gates_spawn_ready() {
        set_now(50.0);
        let srv = spawn_server();
        connect(&srv.url);
        let _hello = pump_recv(&srv);
        let world = make_world();
        renderer::test_register_world(&world);
        srv.tx.send(welcome_bytes(7, 0)).unwrap();
        pump_until(|| state() == NetClientState::Ready);

        /* WELCOME enqueued the spawn-body fetch (in-flight on native:
         * the HTTP glue is the C no-op) -> not ready yet. */
        assert!(!spawn_body_ready());

        /* The fetch response lands: blocks applied, slot done. */
        body_blob_cb(0, &body_blob_bytes(0, 9, 3));
        assert!(spawn_body_ready());
        {
            let w = world.borrow();
            for d in 0..WORLD_MAX_DEPTH {
                assert_eq!(w.get(9, d), Block::from_raw(3).unwrap());
            }
        }

        /* SYNC_TICK forces a refetch and arms the ACK; applying the
         * fresh blob echoes MSG_SYNC_ACK with the same seq. */
        let tick_msg = proto::MsgSyncTick { seq_id: 77 };
        let mut buf = vec![0u8; proto::MSG_HEADER_SIZE + proto::MSG_SYNC_TICK_WIRE_SIZE];
        let n = proto::write_sync_tick(&mut buf, &tick_msg);
        assert_eq!(n, buf.len());
        test_on_msg(&buf);
        /* resync reset the done slot -> not ready until reapplied. */
        assert!(!spawn_body_ready());
        body_blob_cb(0, &body_blob_bytes(0, 9, 3));
        assert!(spawn_body_ready());
        let ack = pump_recv(&srv);
        let hdr = proto::read_header(&ack).unwrap();
        assert_eq!(hdr.kind, MsgKind::SyncAck as u16);
        let a = proto::read_sync_ack(&ack[proto::MSG_HEADER_SIZE..]).unwrap();
        assert_eq!(a.seq_id, 77);

        /* Bad magic / short blobs are rejected without touching the
         * fetch table. */
        body_blob_cb(0, &[0u8; 4]);
        let mut bad = body_blob_bytes(0, 9, 3);
        bad[0] = b'X';
        body_blob_cb(0, &bad);
        assert!(spawn_body_ready());

        /* Empty response resets the slot to idle for a retry. */
        body_blob_cb(0, &[]);
        assert!(!spawn_body_ready());
        disconnect();
    }

    /* ------------------------------------------------------------- */
    /* Send guards                                                     */

    #[test]
    fn sends_are_noops_when_offline() {
        /* Fresh state: everything early-outs without a panic. */
        send_chat("hello");
        send_edit(proto::PLAYER_CMD_PLACE, 0, 1, 1, 1);
        send_torch(true, 0, 1, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0);
        send_inventory_state(&[0; 9], &[0; 9], 0);
        send_player_state(0, 0, 0.0, 0.0, 0.0, 0.0, 0.0, false);
        assert_eq!(test_edit_stats(), (0, 0, 0));
        /* READY but no conn (welcome fed headless): still no-ops. */
        make_ready(1, 0);
        send_edit(proto::PLAYER_CMD_PLACE, 0, 1, 1, 1);
        assert_eq!(test_edit_stats(), (0, 0, 0));
    }
}
