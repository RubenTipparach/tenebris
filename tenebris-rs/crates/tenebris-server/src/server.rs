//! Port of `tenebris-c/src/server/server.{c,h}` - the authoritative
//! game-server state machine and tick loop.
//!
//! Mapping notes (C -> Rust):
//! - `server_t` / `server_config_t` -> [`Server`] / [`ServerConfig`].
//!   `server_init` returns `Option<Server>` instead of bool + out-param.
//!   The unused `server_t.accum_seconds` field was dropped.
//! - `server_client_t.conn` (`net_conn_t*`, NULL = free slot) ->
//!   `Option<ConnId>`; the transport's `net_conn_user` stash is gone,
//!   slots are found by ConnId lookup (see transport.rs notes).
//! - Transport callbacks (`on_open` / `on_msg` / `on_close` /
//!   `on_http`) become match arms over the polled [`NetEvent`]s at the
//!   top of [`Server::tick`]; dispatch order and per-tick cadence are
//!   unchanged.
//! - `shutdown_requested` is an `Arc<AtomicBool>` so the signal thread
//!   in main.rs can flip it (C: async-safe flag write from a signal
//!   handler).
//! - The C static buffers (`HTTP_BODY` / `HTTP_RAW`, both 4 MiB) become
//!   per-request Vecs with the same `HTTP_BODY_CAP` truncation
//!   semantics.
//! - `/status` CPU/memory sampling used getrusage + /proc (Linux-only
//!   per the C comment); this port reads /proc/self/stat (+status) on
//!   Linux and reports 0 / -1 elsewhere - same fallbacks the C fields
//!   produce when the files are missing.
//! - `world_set` in C writes any raw byte; the Rust `World::set` takes
//!   a `Block`, so an out-of-palette `block_type` in PLAYER_CMD maps to
//!   `Block::Air` (clients only ever send palette ids).
//! - The Rust `World` always owns a body config, so the C
//!   `if (!w->body)` guards drop out.
//! - `send_chunk_replay` is ported but deliberately never called,
//!   exactly like the C "(void)send_chunk_replay" no-call (the boot
//!   replay moved to the /saves/body HTTP fetch).

use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, OnceLock};
use std::time::Instant;

use tenebris_core::block_entity;
use tenebris_core::blocks::Block;
use tenebris_core::config;
use tenebris_core::farming;
use tenebris_core::fauna::{self, Animal};
use tenebris_core::job_system;
use tenebris_core::math::{dvec3_length, dvec3_make, dvec3_normalize, dvec3_sub, DVec3};
use tenebris_core::planet::{self, BodyId, BODY_COUNT};
use tenebris_core::proto::{self, *};
use tenebris_core::rng;
use tenebris_core::world::{World, WORLD_MAX_DEPTH, WORLD_SEA_LEVEL_DEPTH};
use tenebris_core::world_water;

use crate::saves::{self, Torch};
use crate::transport::{ConnId, HttpRequest, NetChannel, NetCloseReason, NetEvent, NetListener};

pub const SERVER_MAX_BODIES: usize = 32;
pub const SERVER_MAX_CLIENTS: usize = 16;
pub const SERVER_MAX_ROOMS: usize = 8;

pub const SERVER_NAME_MAX: usize = 31;
pub const SERVER_TOKEN_LEN: usize = 32;
pub const SERVER_ROOM_LEN: usize = 8;

const IDLE_ROOM_GRACE_S: f64 = 300.0;
const CLIENT_IDLE_TIMEOUT_S: i64 = 300;
const HTTP_BODY_CAP: usize = 4 * 1024 * 1024;
const SERVER_CHAT_ID: u32 = 0xFFFF_FFFF;

const DEPTH: usize = WORLD_MAX_DEPTH as usize;

/* ------------------------------------------------------------------ */
/* Time helpers.                                                       */
/* ------------------------------------------------------------------ */

static START_INSTANT: OnceLock<Instant> = OnceLock::new();

/// CLOCK_MONOTONIC seconds (process-relative origin).
pub fn monotonic_seconds() -> f64 {
    START_INSTANT.get_or_init(Instant::now).elapsed().as_secs_f64()
}

fn unix_now_i64() -> i64 {
    match std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH) {
        Ok(d) => d.as_secs() as i64,
        Err(_) => 0,
    }
}

/// `(double)time(NULL)` - integer-second resolution, like C.
fn unix_now_f64() -> f64 {
    unix_now_i64() as f64
}

/* ------------------------------------------------------------------ */
/* C string / number helpers.                                          */
/* ------------------------------------------------------------------ */

/// Clip a null-padded byte field at the first NUL or `max` bytes.
fn cstr_from(bytes: &[u8], max: usize) -> String {
    let mut n = 0usize;
    while n < bytes.len() && n < max && bytes[n] != 0 {
        n += 1;
    }
    String::from_utf8_lossy(&bytes[..n]).into_owned()
}

/// snprintf into a fixed char array: keep at most `dst.len() - 1`
/// bytes (the rest of the array stays zeroed).
fn snprintf_into(dst: &mut [u8], s: &str) {
    let b = s.as_bytes();
    let n = b.len().min(dst.len().saturating_sub(1));
    dst[..n].copy_from_slice(&b[..n]);
}

/// memcpy(dst, src, strnlen(src, dst.len())) - no NUL guarantee.
fn copy_name(dst: &mut [u8], s: &str) {
    let b = s.as_bytes();
    let n = b.len().min(dst.len());
    dst[..n].copy_from_slice(&b[..n]);
}

/// strtoull(s, NULL, 10): (value, consumed). Decimal only.
fn c_strtoull_dec(s: &[u8]) -> (u64, usize) {
    let mut i = 0usize;
    while i < s.len() && matches!(s[i], b' ' | b'\t' | b'\n' | 0x0b | 0x0c | b'\r') {
        i += 1;
    }
    let mut neg = false;
    if i < s.len() && (s[i] == b'+' || s[i] == b'-') {
        neg = s[i] == b'-';
        i += 1;
    }
    let start = i;
    let mut v: u64 = 0;
    while i < s.len() && s[i].is_ascii_digit() {
        v = v.wrapping_mul(10).wrapping_add((s[i] - b'0') as u64);
        i += 1;
    }
    if i == start {
        return (0, 0);
    }
    (if neg { v.wrapping_neg() } else { v }, i)
}

/// atoi(s).
fn c_atoi(s: &[u8]) -> i32 {
    let mut i = 0usize;
    while i < s.len() && matches!(s[i], b' ' | b'\t' | b'\n' | 0x0b | 0x0c | b'\r') {
        i += 1;
    }
    let mut neg = false;
    if i < s.len() && (s[i] == b'+' || s[i] == b'-') {
        neg = s[i] == b'-';
        i += 1;
    }
    let mut v: i64 = 0;
    while i < s.len() && s[i].is_ascii_digit() {
        v = v.saturating_mul(10).saturating_add((s[i] - b'0') as i64);
        i += 1;
    }
    let v = if neg { -v } else { v };
    v.clamp(i32::MIN as i64, i32::MAX as i64) as i32
}

/// Encode helper: run a proto writer against a scratch buffer, return
/// the trimmed bytes or None when the writer reports 0 (C `n == 0`).
fn encode<F: FnOnce(&mut [u8]) -> usize>(cap: usize, f: F) -> Option<Vec<u8>> {
    let mut b = vec![0u8; cap];
    let n = f(&mut b);
    if n == 0 {
        return None;
    }
    b.truncate(n);
    Some(b)
}

/* ------------------------------------------------------------------ */
/* State structs (port of server.h).                                   */
/* ------------------------------------------------------------------ */

/// `server_torch_body_t`. `list.len()` carries the C `count`.
#[derive(Default)]
struct TorchBody {
    in_use: bool,
    body_id: u32,
    list: Vec<Torch>,
}

/// Per-body block-entity (machine) sync bookkeeping for one room. The
/// authoritative store itself is the room World's own
/// `block_entities` (so `World::set` dropping a mined machine works
/// server-side exactly like it does client-side); this tracks whether
/// the persisted file has been loaded into it and what each cell's
/// most recently BROADCAST record was (the 1 Hz progress diff).
#[derive(Default)]
struct BentBody {
    in_use: bool,
    body_id: u32,
    loaded: bool,
    bcast: HashMap<(i32, i32), String>,
}

/// One server-side crop. `growth` is as-of `updated_sim_s`; current
/// growth derives from the sim clock (see `crop_growth_at`), which is
/// also what makes the sleep/catch-up free.
#[derive(Clone, Copy, Debug)]
struct ServerCrop {
    tile_idx: i32,
    pos: [f32; 3],
    up: [f32; 3],
    growth: f32,
    updated_sim_s: f64,
    /// farming::CropKind byte (0 berry / 1 wheat / 2 carrot).
    kind: u8,
}

#[derive(Default)]
struct CropBody {
    in_use: bool,
    body_id: u32,
    loaded: bool,
    list: Vec<ServerCrop>,
}

/// One room+body herd, simulated server-side through the same
/// `core::fauna` helpers the SP client uses.
#[derive(Default)]
struct AnimalBody {
    in_use: bool,
    body_id: u32,
    list: Vec<Animal>,
    next_id: u32,
    spawn_cd: f32,
    salt: u32,
    /// Kill credit riding the next AnimalState broadcast:
    /// (killer player_id, meat award).
    pending_kill: Option<(u32, u16)>,
}

/// `server_room_t`.
struct Room {
    code: String,
    worlds: Vec<World>,
    torches: Vec<TorchBody>,
    bents: Vec<BentBody>,
    crops: Vec<CropBody>,
    animals: Vec<AnimalBody>,
    ref_count: i32,
    in_use: bool,
    last_empty_time_s: f64,
}

impl Default for Room {
    fn default() -> Self {
        Room {
            code: String::new(),
            worlds: Vec::new(),
            torches: (0..SERVER_MAX_BODIES).map(|_| TorchBody::default()).collect(),
            bents: (0..SERVER_MAX_BODIES).map(|_| BentBody::default()).collect(),
            crops: (0..SERVER_MAX_BODIES).map(|_| CropBody::default()).collect(),
            animals: (0..SERVER_MAX_BODIES).map(|_| AnimalBody::default()).collect(),
            ref_count: 0,
            in_use: false,
            last_empty_time_s: 0.0,
        }
    }
}

fn room_log_name(code: &str) -> &str {
    if code.is_empty() {
        "(public)"
    } else {
        code
    }
}

/// `server_client_t`. on_open / on_close reset exactly the fields the
/// C resets; everything else deliberately carries over between slot
/// occupants, like the C arrays.
#[derive(Default)]
struct Client {
    conn: Option<ConnId>,
    player_id: u32,
    handshaked: bool,
    has_state: bool,
    is_grounded: bool,
    token: String,
    name: String,
    room: String,
    room_idx: i32,
    body_id: u32,
    pos_x: f64,
    pos_y: f64,
    pos_z: f64,
    yaw: f32,
    pitch: f32,
    last_client_tick: u32,
    #[allow(dead_code)]
    last_desync_tick: u64,
    last_saved_pos_x: f64,
    last_saved_pos_y: f64,
    last_saved_pos_z: f64,
    last_saved_tick: u64,
    inv_known: bool,
    inv_slot_type: [u16; 9],
    inv_slot_count: [i16; 9],
    inv_selected: u8,
    /* MP-parity: bag grid + hunger, uploaded by the client on change
     * and replayed on rejoin (persisted per (room, name)). */
    bag_known: bool,
    bag_hunger: f32,
    bag_items: [u16; MSG_BAG_SLOTS],
    bag_counts: [u16; MSG_BAG_SLOTS],
    last_msg_unix_s: i64,
    timed_out_logged: bool,
    sync_next_send_s: f64,
    sync_last_seq_id: u32,
    sync_last_sent_s: f64,
    sync_outstanding: i32,
    sync_last_rtt_s: f64,
}

/// `server_config_t`.
#[derive(Clone, Debug)]
pub struct ServerConfig {
    pub port: i32,
    pub tick_hz: f64,
    pub log_every_n: i32,
    pub saves_dir: String,
    pub seed: u64,
}

impl Default for ServerConfig {
    fn default() -> Self {
        ServerConfig {
            port: 8080,
            tick_hz: 20.0,
            log_every_n: 0,
            saves_dir: "./saves".to_string(),
            seed: 0,
        }
    }
}

/// `server_t`.
pub struct Server {
    cfg: ServerConfig,
    worlds: Vec<World>,
    rooms: Vec<Room>,
    tick: u64,
    shutdown_requested: Arc<AtomicBool>,
    listener: Option<NetListener>,
    clients: Vec<Client>,
    next_player_id: u32,
    sync_interval_s: f64,
    sync_next_seq: u32,
    /* function-statics from server.c */
    snap_count: u64,
    cpu_last_wall_s: f64,
    cpu_last_cpu_s: f64,
    cpu_cached_percent: f64,
    start_wall_s: f64,
    /* MP-parity: authoritative sim clock (drives day/night, orbits,
     * crop growth). Persisted to world_time.txt; on boot the wall-time
     * gap since the last save is applied capped, per the CLAUDE.md
     * server-resume time-compression note. */
    sim_time_s: f64,
    day_length_s: f32,
}

/* ------------------------------------------------------------------ */
/* Room management.                                                    */
/* ------------------------------------------------------------------ */

fn room_alloc_worlds(baselines: &[World], room: &mut Room, seed: u64) {
    room.worlds.clear();
    let mut bodies_with_edits = 0;
    let mut total_tiles_loaded = 0;
    for baseline in baselines.iter().take(SERVER_MAX_BODIES) {
        let body_id = baseline.body.id as u32;
        if !saves::room_body_has_edits(&room.code, seed, body_id) {
            continue;
        }
        bodies_with_edits += 1;
        let mut w = baseline.clone_world();
        let loaded = saves::load_world(&mut w, &room.code, seed);
        saves::load_world_water(&mut w, &room.code, seed);
        saves::load_world_water_origins(&mut w, &room.code, seed);
        let repaired = world_water::repair_missing_origins(&mut w);
        if repaired > 0 {
            println!(
                "[server] room '{}' body={}: repaired {} legacy flow cell(s) with synthetic origins",
                room_log_name(&room.code),
                body_id,
                repaired
            );
        }
        total_tiles_loaded += loaded;
        room.worlds.push(w);
    }
    println!(
        "[server] room '{}' load: {} body(ies) had on-disk edits, restored {} tile column(s) total (seed={}, on-disk path=rooms/{}/world-{:x}/)",
        if room.code.is_empty() { "(empty-code/lobby)" } else { &room.code },
        bodies_with_edits,
        total_tiles_loaded,
        seed,
        if room.code.is_empty() { "__public__" } else { &room.code },
        seed
    );
}

fn room_ensure_world_for_body(
    baselines: &[World],
    room: &mut Room,
    seed: u64,
    body_id: u32,
) -> Option<usize> {
    if let Some(i) = room.worlds.iter().position(|w| w.body.id as u32 == body_id) {
        return Some(i);
    }
    let baseline = baselines.iter().find(|b| b.body.id as u32 == body_id)?;
    if room.worlds.len() >= SERVER_MAX_BODIES {
        return None;
    }
    let mut w = baseline.clone_world();
    saves::load_world(&mut w, &room.code, seed);
    saves::load_world_water(&mut w, &room.code, seed);
    saves::load_world_water_origins(&mut w, &room.code, seed);
    world_water::repair_missing_origins(&mut w);
    room.worlds.push(w);
    println!(
        "[server] room '{}': lazy-cloned body {}",
        room_log_name(&room.code),
        body_id
    );
    Some(room.worlds.len() - 1)
}

fn room_free_worlds(room: &mut Room) {
    room.worlds.clear();
    for t in room.torches.iter_mut() {
        t.in_use = false;
        t.body_id = 0;
        t.list.clear();
    }
    for b in room.bents.iter_mut() {
        *b = BentBody::default();
    }
    for c in room.crops.iter_mut() {
        *c = CropBody::default();
    }
    for a in room.animals.iter_mut() {
        *a = AnimalBody::default();
    }
}

/* ------------------------------------------------------------------ */
/* MP-parity room state: block entities, crops, animals.               */
/* ------------------------------------------------------------------ */

/// If machines ran while the server slept, fast-forward them. Chunked
/// 1 s ticks; bails once the store has been quiet for a minute of sim
/// time (steady state - out of fuel / input / output space).
const MACHINE_CATCHUP_MAX_S: f64 = 3600.0;

fn machines_catch_up(store: &mut block_entity::BlockEntityStore, dt_s: f64) {
    let mut remaining = dt_s.clamp(0.0, MACHINE_CATCHUP_MAX_S);
    let mut idle = 0u32;
    while remaining > 0.0 && idle < 60 {
        let step = remaining.min(1.0);
        if store.tick(step as f32) {
            idle = 0;
        } else {
            idle += 1;
        }
        remaining -= step;
    }
}

/// Serialise a room-world's block-entity store to the persisted blob:
/// "T:<sim>\n" then the ';'-joined records (core codec).
fn bents_serialize(store: &block_entity::BlockEntityStore, sim_now: f64) -> String {
    if store.is_empty() {
        return String::new();
    }
    let recs: Vec<String> = store
        .iter()
        .map(|(tile, depth, e)| block_entity::record_write(tile, depth, &e))
        .collect();
    format!("T:{:.3}\n{}", sim_now, recs.join(";"))
}

/// Bookkeeping slot for (room, body) machine sync; loads the persisted
/// store into the room World's `block_entities` on first touch (with
/// the sleep catch-up applied).
fn room_bents_get_or_load(
    room: &mut Room,
    seed: u64,
    body_id: u32,
    wi: usize,
    sim_now: f64,
) -> Option<usize> {
    for i in 0..SERVER_MAX_BODIES {
        if room.bents[i].in_use && room.bents[i].body_id == body_id {
            return Some(i);
        }
    }
    let slot = (0..SERVER_MAX_BODIES).find(|&i| !room.bents[i].in_use)?;
    room.bents[slot].in_use = true;
    room.bents[slot].body_id = body_id;
    room.bents[slot].loaded = true;
    room.bents[slot].bcast.clear();
    if let Some(blob) = saves::body_state_load(&room.code, seed, body_id, "bentities.txt") {
        let (saved_sim, recs) = match blob.split_once('\n') {
            Some((head, rest)) => (
                head.strip_prefix("T:").and_then(|t| t.parse::<f64>().ok()).unwrap_or(sim_now),
                rest,
            ),
            None => (sim_now, blob.as_str()),
        };
        let store = &mut room.worlds[wi].block_entities;
        let mut n = 0;
        for rec in recs.split(';') {
            if let Some((tile, depth, e)) = block_entity::record_parse(rec) {
                store.set(tile, depth, e);
                n += 1;
            }
        }
        machines_catch_up(store, sim_now - saved_sim);
        if n > 0 {
            println!(
                "[server] room '{}' body={}: {} machine(s) loaded (catch-up {:.0}s)",
                room_log_name(&room.code),
                body_id,
                n,
                (sim_now - saved_sim).clamp(0.0, MACHINE_CATCHUP_MAX_S)
            );
        }
    }
    Some(slot)
}

/// Current growth of a server crop, derived from the sim clock and the
/// crop kind's own grow time.
fn crop_growth_at(c: &ServerCrop, sim_now: f64) -> f32 {
    let kind = farming::CropKind::from_u8(c.kind);
    let grow_time = farming::config().grow_time(kind).max(0.001) as f64;
    (c.growth as f64 + ((sim_now - c.updated_sim_s).max(0.0) / grow_time)).min(1.0) as f32
}

/// Persisted crop blob: one "tile:px:py:pz:ux:uy:uz:growth:kind" per
/// line, growth refreshed to `sim_now` at write. The trailing kind field
/// is optional on load (pre-kind saves read as berry).
fn crops_serialize(list: &[ServerCrop], sim_now: f64) -> String {
    list.iter()
        .map(|c| {
            format!(
                "{}:{:.3}:{:.3}:{:.3}:{:.4}:{:.4}:{:.4}:{:.4}:{}",
                c.tile_idx,
                c.pos[0],
                c.pos[1],
                c.pos[2],
                c.up[0],
                c.up[1],
                c.up[2],
                crop_growth_at(c, sim_now),
                c.kind
            )
        })
        .collect::<Vec<_>>()
        .join("\n")
}

fn room_crops_get_or_load(room: &mut Room, seed: u64, body_id: u32, sim_now: f64) -> Option<usize> {
    for i in 0..SERVER_MAX_BODIES {
        if room.crops[i].in_use && room.crops[i].body_id == body_id {
            return Some(i);
        }
    }
    let slot = (0..SERVER_MAX_BODIES).find(|&i| !room.crops[i].in_use)?;
    room.crops[slot].in_use = true;
    room.crops[slot].body_id = body_id;
    room.crops[slot].loaded = true;
    room.crops[slot].list.clear();
    if let Some(blob) = saves::body_state_load(&room.code, seed, body_id, "crops.txt") {
        for line in blob.lines() {
            let f: Vec<&str> = line.split(':').collect();
            if f.len() < 8 {
                continue;
            }
            let p = |i: usize| f[i].trim().parse::<f32>().ok();
            let (Ok(tile), Some(px), Some(py), Some(pz), Some(ux), Some(uy), Some(uz), Some(g)) = (
                f[0].trim().parse::<i32>(),
                p(1),
                p(2),
                p(3),
                p(4),
                p(5),
                p(6),
                p(7),
            ) else {
                continue;
            };
            /* Optional trailing kind field; absent (pre-kind save) = berry. */
            let kind = f.get(8).and_then(|s| s.trim().parse::<u8>().ok()).unwrap_or(0);
            room.crops[slot].list.push(ServerCrop {
                tile_idx: tile,
                pos: [px, py, pz],
                up: [ux, uy, uz],
                growth: g.clamp(0.0, 1.0),
                updated_sim_s: sim_now,
                kind,
            });
        }
        if !room.crops[slot].list.is_empty() {
            println!(
                "[server] room '{}' body={}: {} crop(s) loaded",
                room_log_name(&room.code),
                body_id,
                room.crops[slot].list.len()
            );
        }
    }
    Some(slot)
}

fn room_animals_get(room: &mut Room, body_id: u32) -> Option<usize> {
    for i in 0..SERVER_MAX_BODIES {
        if room.animals[i].in_use && room.animals[i].body_id == body_id {
            return Some(i);
        }
    }
    let slot = (0..SERVER_MAX_BODIES).find(|&i| !room.animals[i].in_use)?;
    room.animals[slot] = AnimalBody {
        in_use: true,
        body_id,
        list: Vec::new(),
        next_id: 0,
        spawn_cd: 0.0,
        salt: 1,
        pending_kill: None,
    };
    Some(slot)
}

/// Bag blob: "hunger|item,count;item,count;..." (one pair per slot).
fn bag_serialize(hunger: f32, items: &[u16; MSG_BAG_SLOTS], counts: &[u16; MSG_BAG_SLOTS]) -> String {
    let slots: Vec<String> =
        (0..MSG_BAG_SLOTS).map(|i| format!("{},{}", items[i], counts[i])).collect();
    format!("{:.2}|{}", hunger, slots.join(";"))
}

fn bag_parse(blob: &str) -> Option<(f32, [u16; MSG_BAG_SLOTS], [u16; MSG_BAG_SLOTS])> {
    let (h, rest) = blob.split_once('|')?;
    let hunger = h.trim().parse::<f32>().ok()?;
    let mut items = [0u16; MSG_BAG_SLOTS];
    let mut counts = [0u16; MSG_BAG_SLOTS];
    for (i, pair) in rest.split(';').enumerate().take(MSG_BAG_SLOTS) {
        let (a, b) = pair.split_once(',')?;
        items[i] = a.trim().parse().ok()?;
        counts[i] = b.trim().parse().ok()?;
    }
    Some((hunger, items, counts))
}

fn room_torches_get_or_load(room: &mut Room, seed: u64, body_id: u32) -> Option<usize> {
    for i in 0..SERVER_MAX_BODIES {
        if room.torches[i].in_use && room.torches[i].body_id == body_id {
            return Some(i);
        }
    }
    for i in 0..SERVER_MAX_BODIES {
        if room.torches[i].in_use {
            continue;
        }
        room.torches[i].in_use = true;
        room.torches[i].body_id = body_id;
        let mut buf = [Torch::default(); saves::TORCHES_MAX_COUNT];
        let n = saves::torches_load(&room.code, seed, body_id, &mut buf);
        room.torches[i].list = buf[..n.max(0) as usize].to_vec();
        if n > 0 {
            println!(
                "[server] room '{}' body={}: {} torch(es) loaded from disk",
                room_log_name(&room.code),
                body_id,
                n
            );
        }
        return Some(i);
    }
    eprintln!(
        "[server] room '{}': no free torch slot for body={}",
        room_log_name(&room.code),
        body_id
    );
    None
}

fn broadcast_room(listener: &Option<NetListener>, clients: &[Client], room: &str, ch: NetChannel, bytes: &[u8]) {
    let Some(l) = listener else { return };
    for cl in clients {
        if let Some(conn) = cl.conn {
            if cl.room == room {
                l.send(conn, ch, bytes);
            }
        }
    }
}

/* ------------------------------------------------------------------ */
/* Server lifecycle.                                                   */
/* ------------------------------------------------------------------ */

impl Server {
    /// Port of `server_init()`.
    pub fn init(cfg: &ServerConfig) -> Option<Server> {
        let mut s = Server {
            cfg: cfg.clone(),
            worlds: Vec::new(),
            rooms: (0..SERVER_MAX_ROOMS).map(|_| Room::default()).collect(),
            tick: 0,
            shutdown_requested: Arc::new(AtomicBool::new(false)),
            listener: None,
            clients: (0..SERVER_MAX_CLIENTS).map(|_| Client::default()).collect(),
            next_player_id: 0,
            sync_interval_s: 30.0,
            sync_next_seq: 1,
            snap_count: 0,
            cpu_last_wall_s: 0.0,
            cpu_last_cpu_s: 0.0,
            cpu_cached_percent: 0.0,
            start_wall_s: 0.0,
            sim_time_s: 0.0,
            day_length_s: 0.0,
        };
        if s.cfg.tick_hz <= 0.0 {
            s.cfg.tick_hz = 20.0;
        }
        if s.cfg.log_every_n <= 0 {
            s.cfg.log_every_n = s.cfg.tick_hz as i32;
        }

        job_system::init(0);

        if !s.cfg.saves_dir.is_empty() {
            saves::init(&s.cfg.saves_dir);
        }

        /* MP-parity configs: the day/night clock + crop growth tuning.
         * Same cwd-relative paths as the client; missing files fall
         * back to compiled-in defaults. */
        config::load_time("assets/config/time.yaml");
        farming::load_config("assets/config/farming.yaml");
        {
            let tc = config::time();
            s.day_length_s = tc.day_length_s;
            /* Resume the persisted sim clock, fast-forwarded by the
             * wall-clock gap since the last save (capped at a year of
             * sim days so a months-dead server settles instead of
             * exploding) - the CLAUDE.md time-compression rule. */
            let cap = 365.0 * tc.day_length_s.max(1.0) as f64;
            s.sim_time_s = match saves::world_time_load() {
                Some((sim, wall)) => {
                    let gap = ((unix_now_i64() - wall).max(0) as f64).min(cap);
                    println!(
                        "[server] sim clock resumed: {:.0}s (+{:.0}s sleep catch-up)",
                        sim, gap
                    );
                    sim + gap
                }
                None => (tc.start_day_fraction as f64) * tc.day_length_s as f64,
            };
        }

        let main_body = planet::get(BodyId::Tenebris);
        let mut main_world =
            World::create(&main_body, planet::subdivisions_for_radius(main_body.radius_m));
        while !main_world.gen_complete() {
            main_world.stream_gen(main_world.tile_count);
        }
        for t in 0..main_world.tile_count {
            main_world.tile_clear_dirty(t);
        }
        s.worlds.push(main_world);

        for id in (BodyId::Luna as i32)..(BODY_COUNT as i32) {
            if s.worlds.len() >= SERVER_MAX_BODIES {
                break;
            }
            let Some(b) = planet::get_by_index(id) else { continue };
            let mut w = World::create(&b, planet::subdivisions_for_radius(b.radius_m));
            while !w.gen_complete() {
                w.stream_gen(w.tile_count);
            }
            for t in 0..w.tile_count {
                w.tile_clear_dirty(t);
            }
            s.worlds.push(w);
        }

        for cl in s.clients.iter_mut() {
            cl.room_idx = -1;
        }

        println!(
            "[server] init: {} baseline worlds, tick_hz={:.1}, port={}, saves={}, seed={}",
            s.worlds.len(),
            s.cfg.tick_hz,
            s.cfg.port,
            if s.cfg.saves_dir.is_empty() { "(none)" } else { &s.cfg.saves_dir },
            s.cfg.seed
        );

        let listener = NetListener::listen("0.0.0.0", s.cfg.port as u16, true);
        let Some(listener) = listener else {
            eprintln!(
                "[server] failed to bind WebSocket listener on port {}",
                s.cfg.port
            );
            return None;
        };
        s.listener = Some(listener);
        Some(s)
    }

    /// Actual bound port (tests boot on port 0).
    #[allow(dead_code)]
    pub fn port(&self) -> u16 {
        self.listener.as_ref().map(|l| l.port()).unwrap_or(0)
    }

    /// Port of `server_request_shutdown()` - the flag the signal
    /// thread flips.
    pub fn shutdown_flag(&self) -> Arc<AtomicBool> {
        self.shutdown_requested.clone()
    }

    pub fn shutdown_requested(&self) -> bool {
        self.shutdown_requested.load(Ordering::Relaxed)
    }

    fn send_conn(&self, conn: ConnId, ch: NetChannel, bytes: &[u8]) {
        if let Some(l) = &self.listener {
            l.send(conn, ch, bytes);
        }
    }

    fn close_conn(&self, conn: ConnId) {
        if let Some(l) = &self.listener {
            l.close_conn(conn);
        }
    }

    fn find_client_idx(&self, conn: ConnId) -> Option<usize> {
        self.clients.iter().position(|c| c.conn == Some(conn))
    }

    fn room_find(&self, code: &str) -> i32 {
        for (i, r) in self.rooms.iter().enumerate() {
            if r.in_use && r.code == code {
                return i as i32;
            }
        }
        -1
    }

    fn room_acquire(&mut self, code: &str) -> i32 {
        let mut idx = self.room_find(code);
        if idx < 0 {
            for (i, r) in self.rooms.iter().enumerate() {
                if !r.in_use {
                    idx = i as i32;
                    break;
                }
            }
            if idx < 0 {
                eprintln!("[server] no room slot free for code='{}'", code);
                return -1;
            }
            let i = idx as usize;
            self.rooms[i] = Room::default();
            self.rooms[i].code = code.chars().take(SERVER_ROOM_LEN).collect();
            self.rooms[i].in_use = true;
            room_alloc_worlds(&self.worlds, &mut self.rooms[i], self.cfg.seed);
            println!(
                "[server] room created '{}' ({} cloned worlds from disk)",
                room_log_name(&self.rooms[i].code),
                self.rooms[i].worlds.len()
            );
        } else if self.rooms[idx as usize].ref_count == 0 {
            self.rooms[idx as usize].last_empty_time_s = 0.0;
            println!(
                "[server] room re-attached '{}' (within idle grace)",
                room_log_name(&self.rooms[idx as usize].code)
            );
        }
        self.rooms[idx as usize].ref_count += 1;
        idx
    }

    fn room_release(&mut self, idx: i32) {
        if idx < 0 || idx >= SERVER_MAX_ROOMS as i32 {
            return;
        }
        let r = &mut self.rooms[idx as usize];
        if !r.in_use {
            return;
        }
        if r.ref_count > 0 {
            r.ref_count -= 1;
        }
        if r.ref_count == 0 {
            r.last_empty_time_s = unix_now_f64();
            println!(
                "[server] room '{}' empty - retained for idle grace",
                room_log_name(&r.code)
            );
        }
    }

    fn client_world_pos(&self, ci: usize, body_id: u32) -> Option<(usize, usize)> {
        let ri = self.clients[ci].room_idx;
        if ri < 0 {
            return None;
        }
        let ri = ri as usize;
        self.rooms[ri]
            .worlds
            .iter()
            .position(|w| w.body.id as u32 == body_id)
            .map(|wi| (ri, wi))
    }

    /// Port of `check_for_desync()` - disabled body in C (feet-anchor
    /// false positives); deliberate no-op until the head-height fix.
    fn check_for_desync(&mut self, _ci: usize) {}

    /* -------------------------------------------------------------- */
    /* Handshake + replays.                                            */
    /* -------------------------------------------------------------- */

    /// Port of `send_chunk_replay()`. Ported but never called - the
    /// boot-time bulk replay moved to the /saves/body HTTP fetch (see
    /// the C comment in handle_hello). Kept as a clearly-named no-call
    /// so a re-enable is a one-line diff.
    #[allow(dead_code)]
    fn send_chunk_replay(&mut self, ci: usize) {
        let ri = self.clients[ci].room_idx;
        if ri < 0 || ri >= SERVER_MAX_ROOMS as i32 {
            return;
        }
        let ri = ri as usize;
        if !self.rooms[ri].in_use {
            return;
        }
        let Some(conn) = self.clients[ci].conn else { return };

        let mut replayed_tiles = 0;
        let mut replayed_msgs = 0;
        for wi in 0..self.rooms[ri].worlds.len() {
            if self.rooms[ri].worlds[wi].saved.is_none() {
                continue;
            }
            let tile_count = self.rooms[ri].worlds[wi].tile_count;
            for tile in 0..tile_count {
                if !self.rooms[ri].worlds[wi].tile_saved(tile) {
                    continue;
                }
                let mut depth = 0usize;
                while depth < DEPTH {
                    let mut diff = MsgChunkDiff::default();
                    let w = &self.rooms[ri].worlds[wi];
                    diff.body_id = w.body.id as u32;
                    let batch = (DEPTH - depth).min(CHUNK_DIFF_MAX_EDITS);
                    diff.edit_count = batch as u16;
                    for i in 0..batch {
                        diff.edits[i].tile_idx = tile as u32;
                        diff.edits[i].depth = (depth + i) as u16;
                        diff.edits[i].block_type =
                            w.blocks[tile as usize * DEPTH + depth + i] as u16;
                    }
                    depth += batch;
                    let buf = encode(
                        MSG_HEADER_SIZE
                            + MSG_CHUNK_DIFF_HEADER_SIZE
                            + MSG_CHUNK_DIFF_ENTRY_SIZE * CHUNK_DIFF_MAX_EDITS,
                        |b| proto::write_chunk_diff(b, &diff),
                    );
                    let Some(buf) = buf else { break };
                    self.send_conn(conn, NetChannel::Reliable, &buf);
                    replayed_msgs += 1;
                }
                replayed_tiles += 1;
            }
        }
        println!(
            "[server] CHUNK replay -> player_id={} room='{}': {} tile(s), {} msg(s) (room->world_count={})",
            self.clients[ci].player_id,
            if self.clients[ci].room.is_empty() { "(empty-code/lobby)" } else { &self.clients[ci].room },
            replayed_tiles,
            replayed_msgs,
            self.rooms[ri].worlds.len()
        );
    }

    /// Port of `send_torch_replay()`.
    fn send_torch_replay(&mut self, ci: usize) {
        let ri = self.clients[ci].room_idx;
        if ri < 0 {
            return;
        }
        let ri = ri as usize;
        let Some(conn) = self.clients[ci].conn else { return };
        let player_id = self.clients[ci].player_id;

        let mut bodies_sent = 0;
        let mut torches_sent = 0;
        let body_ids: Vec<u32> = self.worlds.iter().map(|w| w.body.id as u32).collect();
        for body_id in body_ids {
            let Some(si) = room_torches_get_or_load(&mut self.rooms[ri], self.cfg.seed, body_id)
            else {
                continue;
            };
            let count = self.rooms[ri].torches[si].list.len();
            if count == 0 {
                continue;
            }
            let mut off = 0usize;
            while off < count {
                let n = (count - off).min(TORCH_DIFF_MAX_ENTRIES);
                let mut diff = MsgTorchDiff::default();
                diff.body_id = body_id;
                diff.entry_count = n as u16;
                for i in 0..n {
                    let t = &self.rooms[ri].torches[si].list[off + i];
                    let e = &mut diff.entries[i];
                    e.op = TORCH_OP_PLACE;
                    e.tile_idx = t.tile_idx as u32;
                    e.pos_x = t.pos[0];
                    e.pos_y = t.pos[1];
                    e.pos_z = t.pos[2];
                    e.up_x = t.up[0];
                    e.up_y = t.up[1];
                    e.up_z = t.up[2];
                }
                off += n;
                let buf = encode(
                    MSG_HEADER_SIZE + MSG_TORCH_DIFF_HEADER + TORCH_DIFF_MAX_ENTRIES * MSG_TORCH_ENTRY_SIZE,
                    |b| proto::write_torch_diff(b, &diff),
                );
                let Some(buf) = buf else {
                    eprintln!("[server] torch replay encode failed body={}", body_id);
                    continue;
                };
                self.send_conn(conn, NetChannel::Reliable, &buf);
                torches_sent += n;
            }
            bodies_sent += 1;
        }
        if bodies_sent > 0 {
            println!(
                "[server] TORCH replay -> player_id={} room='{}': {} body(ies), {} torch(es) total",
                player_id,
                room_log_name(&self.rooms[ri].code),
                bodies_sent,
                torches_sent
            );
        }
    }

    /// Port of `send_welcome()`.
    fn send_welcome(&mut self, ci: usize) {
        let spawn_body = planet::get(BodyId::Tenebris);
        let mut w = MsgWelcome {
            player_id: self.clients[ci].player_id,
            world_seed: self.cfg.seed,
            spawn_x: spawn_body.pos_x + spawn_body.radius_m + 5.0,
            spawn_y: spawn_body.pos_y,
            spawn_z: spawn_body.pos_z,
            body_id: BodyId::Tenebris as u32,
            spawn_yaw: 0.0,
            spawn_pitch: 0.0,
        };
        let name = self.clients[ci].name.clone();
        let room = self.clients[ci].room.clone();
        let resume = if !name.is_empty() {
            saves::load_player(&room, &name)
        } else {
            None
        };
        let had_save = resume.is_some();
        if let Some(resume) = resume {
            w.spawn_x = resume.pos_x;
            w.spawn_y = resume.pos_y;
            w.spawn_z = resume.pos_z;
            w.body_id = resume.body_id;
            w.spawn_yaw = resume.yaw;
            w.spawn_pitch = resume.pitch;
            let cl = &mut self.clients[ci];
            cl.inv_slot_type = resume.inv_slot_type;
            cl.inv_slot_count = resume.inv_slot_count;
            cl.inv_selected = resume.inv_selected;
            cl.inv_known = true;
        }
        {
            let in_space = w.body_id == BODY_ID_IN_SPACE;
            let dbg_body = if in_space {
                None
            } else {
                planet::get_by_index(w.body_id as i32)
            };
            let mut r = 0.0;
            let mut alt = 0.0;
            if let Some(b) = &dbg_body {
                let dx = w.spawn_x - b.pos_x;
                let dy = w.spawn_y - b.pos_y;
                let dz = w.spawn_z - b.pos_z;
                r = (dx * dx + dy * dy + dz * dz).sqrt();
                alt = r - b.radius_m;
            }
            println!(
                "[server] WELCOME spawn name={} {} body={} pos=({:.2}, {:.2}, {:.2}) r={:.2} alt={:+.2} yaw={:.2} pitch={:.2}",
                name,
                if had_save { "RESUME" } else { "DEFAULT" },
                if in_space {
                    "IN_SPACE"
                } else {
                    dbg_body.as_ref().map(|b| b.name).unwrap_or("unknown")
                },
                w.spawn_x,
                w.spawn_y,
                w.spawn_z,
                r,
                alt,
                w.spawn_yaw,
                w.spawn_pitch
            );
        }

        let Some(conn) = self.clients[ci].conn else { return };
        let buf = encode(MSG_HEADER_SIZE + MSG_WELCOME_WIRE_SIZE, |b| {
            proto::write_welcome(b, &w)
        });
        let Some(buf) = buf else { return };
        self.send_conn(conn, NetChannel::Reliable, &buf);
        self.clients[ci].handshaked = true;
        println!(
            "[server] WELCOME -> player_id={} (spawn body={})",
            self.clients[ci].player_id, w.body_id
        );

        if self.clients[ci].inv_known {
            let cl = &self.clients[ci];
            let inv = MsgInventoryState {
                player_id: cl.player_id,
                slot_type: cl.inv_slot_type,
                slot_count: cl.inv_slot_count,
                selected: cl.inv_selected,
                reserved: [0; 3],
            };
            if let Some(ibuf) = encode(MSG_HEADER_SIZE + MSG_INVENTORY_STATE_WIRE_SIZE, |b| {
                proto::write_inventory_state(b, &inv)
            }) {
                self.send_conn(conn, NetChannel::Reliable, &ibuf);
            }
        }
        /* MP-parity join replays: the authoritative clock first (so
         * day/night is right before anything renders), then the bag +
         * hunger, machines, and crops. */
        self.send_sim_time_to(conn);
        if let Some(blob) = saves::bag_load(&room, &name) {
            if let Some((hunger, items, counts)) = bag_parse(&blob) {
                let cl = &mut self.clients[ci];
                cl.bag_known = true;
                cl.bag_hunger = hunger;
                cl.bag_items = items;
                cl.bag_counts = counts;
                let m = MsgBagState {
                    hunger,
                    slot_count: MSG_BAG_SLOTS as u16,
                    items,
                    counts,
                };
                if let Some(bbuf) = encode(MSG_HEADER_SIZE + MSG_BAG_STATE_WIRE_SIZE, |b| {
                    proto::write_bag_state(b, &m)
                }) {
                    self.send_conn(conn, NetChannel::Reliable, &bbuf);
                }
            }
        }
        self.send_torch_replay(ci);
        self.send_bentity_replay(ci);
        self.send_crop_replay(ci);
    }

    /// Port of `handle_hello()`.
    fn handle_hello(&mut self, ci: usize, payload: &[u8], version: u16) {
        let Some(conn) = self.clients[ci].conn else { return };
        if version != MSG_HELLO_VERSION {
            eprintln!(
                "[server] HELLO version {} != {}, closing",
                version, MSG_HELLO_VERSION
            );
            self.close_conn(conn);
            return;
        }
        let Some(h) = proto::read_hello(payload) else {
            eprintln!("[server] malformed HELLO, closing");
            self.close_conn(conn);
            return;
        };
        if h.client_version != TENEBRIS_PROTOCOL_VERSION {
            eprintln!(
                "[server] HELLO client_version {} != {}, kicking",
                h.client_version, TENEBRIS_PROTOCOL_VERSION
            );
            let mut kick = MsgKick::default();
            kick.reason = KICK_VERSION_MISMATCH;
            snprintf_into(
                &mut kick.text,
                &format!(
                    "Version mismatch (client {}, server {}). Refresh: Ctrl+Shift+R",
                    h.client_version, TENEBRIS_PROTOCOL_VERSION
                ),
            );
            if let Some(buf) = encode(MSG_HEADER_SIZE + MSG_KICK_WIRE_SIZE, |b| {
                proto::write_kick(b, &kick)
            }) {
                self.send_conn(conn, NetChannel::Reliable, &buf);
            }
            self.close_conn(conn);
            return;
        }
        {
            let cl = &mut self.clients[ci];
            cl.token = cstr_from(&h.token, SERVER_TOKEN_LEN);
            cl.name = cstr_from(&h.name, SERVER_NAME_MAX);
            if cl.name.is_empty() {
                cl.name = format!("guest-{}", cl.player_id);
            }
            cl.room = cstr_from(&h.room_code, SERVER_ROOM_LEN);
        }
        let name = self.clients[ci].name.clone();
        let room = self.clients[ci].room.clone();
        let player_id = self.clients[ci].player_id;

        let taken = self.clients.iter().enumerate().any(|(j, peer)| {
            j != ci
                && peer.conn.is_some()
                && peer.handshaked
                && !peer.name.is_empty()
                && peer.name.eq_ignore_ascii_case(&name)
        });
        if taken {
            eprintln!(
                "[server] HELLO name='{}' already in use, kicking player_id={}",
                name, player_id
            );
            let mut kick = MsgKick::default();
            kick.reason = KICK_NAME_TAKEN;
            snprintf_into(
                &mut kick.text,
                &format!("Name '{}' is already on the server. Pick another profile.", name),
            );
            if let Some(buf) = encode(MSG_HEADER_SIZE + MSG_KICK_WIRE_SIZE, |b| {
                proto::write_kick(b, &kick)
            }) {
                self.send_conn(conn, NetChannel::Reliable, &buf);
            }
            self.close_conn(conn);
            return;
        }

        let room_idx = self.room_acquire(&room);
        self.clients[ci].room_idx = room_idx;
        if room_idx < 0 {
            eprintln!("[server] no room slot for player_id={}, closing", player_id);
            self.close_conn(conn);
            return;
        }

        println!(
            "[server] HELLO from player_id={} name='{}' room='{}' {} (client_version={})",
            player_id,
            name,
            room,
            if room.is_empty() {
                "(EMPTY-CODE -> empty-code/lobby room)"
            } else {
                "(private-room)"
            },
            h.client_version
        );
        saves::session_log("login", &name, &room);
        self.send_welcome(ci);
        /* WebSocket CHUNK_DIFF boot replay disabled - clients pull
         * /saves/body over HTTP instead. See send_chunk_replay. */

        /* PLAYER_INFO fan-out, room-scoped. */
        {
            let mut info_new = MsgPlayerInfo::default();
            info_new.player_id = player_id;
            copy_name(&mut info_new.name, &name);
            if let Some(buf) = encode(MSG_HEADER_SIZE + MSG_PLAYER_INFO_WIRE_SIZE, |b| {
                proto::write_player_info(b, &info_new)
            }) {
                broadcast_room(&self.listener, &self.clients, &room, NetChannel::Reliable, &buf);
            }
            for j in 0..SERVER_MAX_CLIENTS {
                let other = &self.clients[j];
                if other.conn.is_none() || !other.handshaked {
                    continue;
                }
                if j == ci {
                    continue;
                }
                if other.room != room {
                    continue;
                }
                let mut info_other = MsgPlayerInfo::default();
                info_other.player_id = other.player_id;
                copy_name(&mut info_other.name, &other.name);
                if let Some(buf) = encode(MSG_HEADER_SIZE + MSG_PLAYER_INFO_WIRE_SIZE, |b| {
                    proto::write_player_info(b, &info_other)
                }) {
                    self.send_conn(conn, NetChannel::Reliable, &buf);
                }
            }
        }

        /* Chat backlog. */
        {
            let backlog = saves::chat_load_backlog(&room, saves::CHAT_BACKLOG as i32);
            let n = backlog.len();
            for msg in &backlog {
                let mut cmsg = MsgChat::default();
                cmsg.player_id = 0;
                copy_name(&mut cmsg.text, &msg.text);
                let Some(cbuf) = encode(MSG_HEADER_SIZE + MSG_CHAT_WIRE_SIZE, |b| {
                    proto::write_chat(b, &cmsg)
                }) else {
                    continue;
                };
                let mut pi = MsgPlayerInfo::default();
                pi.player_id = 0;
                copy_name(&mut pi.name, &msg.name);
                if let Some(pibuf) = encode(MSG_HEADER_SIZE + MSG_PLAYER_INFO_WIRE_SIZE, |b| {
                    proto::write_player_info(b, &pi)
                }) {
                    self.send_conn(conn, NetChannel::Reliable, &pibuf);
                }
                self.send_conn(conn, NetChannel::Reliable, &cbuf);
            }
            if n > 0 {
                println!(
                    "[server] sent {} chat backlog message(s) to player_id={} room={}",
                    n,
                    player_id,
                    room_log_name(&room)
                );
            }
        }
    }

    /* -------------------------------------------------------------- */
    /* Transport event handlers.                                       */
    /* -------------------------------------------------------------- */

    fn on_open(&mut self, conn: ConnId) {
        let Some(ci) = self.clients.iter().position(|c| c.conn.is_none()) else {
            eprintln!("[server] max clients reached, closing new conn");
            self.close_conn(conn);
            return;
        };
        self.next_player_id += 1;
        let pid = self.next_player_id;
        let cl = &mut self.clients[ci];
        cl.conn = Some(conn);
        cl.player_id = pid;
        cl.handshaked = false;
        cl.room_idx = -1;
        cl.last_saved_pos_x = 0.0;
        cl.last_saved_pos_y = 0.0;
        cl.last_saved_pos_z = 0.0;
        cl.last_saved_tick = 0;
        cl.last_msg_unix_s = unix_now_i64();
        cl.timed_out_logged = false;
        println!("[server] open: player_id={} (slot {})", pid, ci);
    }

    fn on_msg(&mut self, conn: ConnId, data: &[u8]) {
        let Some(ci) = self.find_client_idx(conn) else {
            self.close_conn(conn);
            return;
        };
        self.clients[ci].last_msg_unix_s = unix_now_i64();

        let Some(hdr) = proto::read_header(data) else {
            eprintln!(
                "[server] short header from player_id={}, closing",
                self.clients[ci].player_id
            );
            self.close_conn(conn);
            return;
        };
        if data.len() < MSG_HEADER_SIZE + hdr.length as usize {
            eprintln!(
                "[server] truncated payload from player_id={} (have {}, need {}), closing",
                self.clients[ci].player_id,
                data.len(),
                MSG_HEADER_SIZE as u32 + hdr.length
            );
            self.close_conn(conn);
            return;
        }
        let payload = data[MSG_HEADER_SIZE..MSG_HEADER_SIZE + hdr.length as usize].to_vec();

        match MsgKind::from_u16(hdr.kind) {
            Some(MsgKind::Hello) => self.handle_hello(ci, &payload, hdr.version),
            Some(MsgKind::PlayerCmd) => self.handle_player_cmd(ci, &payload, hdr.version),
            Some(MsgKind::TorchDiff) => self.handle_torch_diff(ci, &payload, hdr.version),
            Some(MsgKind::Chat) => self.handle_chat(ci, &payload, hdr.version),
            Some(MsgKind::InventoryState) => self.handle_inventory_state(ci, &payload, hdr.version),
            Some(MsgKind::PlayerInfoRequest) => {
                self.handle_player_info_request(ci, &payload, hdr.version)
            }
            Some(MsgKind::PlayerState) => self.handle_player_state(ci, conn, &payload, hdr.version),
            Some(MsgKind::SyncAck) => self.handle_sync_ack(ci, &payload, hdr.version),
            Some(MsgKind::BagState) => self.handle_bag_state(ci, &payload, hdr.version),
            Some(MsgKind::BentityDiff) => self.handle_bentity_diff(ci, &payload, hdr.version),
            Some(MsgKind::CropDiff) => self.handle_crop_diff(ci, &payload, hdr.version),
            Some(MsgKind::AnimalHit) => self.handle_animal_hit(ci, &payload, hdr.version),
            _ => {
                println!(
                    "[server] ignoring kind={} from player_id={}",
                    hdr.kind, self.clients[ci].player_id
                );
            }
        }
    }

    fn handle_player_cmd(&mut self, ci: usize, payload: &[u8], version: u16) {
        if version != MSG_PLAYER_CMD_VERSION {
            return;
        }
        let Some(cmd) = proto::read_player_cmd(payload) else { return };
        let player_id = self.clients[ci].player_id;
        let room_code = self.clients[ci].room.clone();

        let mut found = self.client_world_pos(ci, cmd.body_id);
        if found.is_none() && self.clients[ci].room_idx >= 0 {
            let ri = self.clients[ci].room_idx as usize;
            found = room_ensure_world_for_body(
                &self.worlds,
                &mut self.rooms[ri],
                self.cfg.seed,
                cmd.body_id,
            )
            .map(|wi| (ri, wi));
        }
        let Some((ri, wi)) = found else {
            eprintln!(
                "[server] PLAYER_CMD unknown body={} in room='{}' from player_id={}",
                cmd.body_id,
                room_log_name(&room_code),
                player_id
            );
            return;
        };

        let target = if cmd.cmd_kind == PLAYER_CMD_BREAK {
            Block::Air
        } else {
            Block::from_raw(cmd.block_type as u8).unwrap_or(Block::Air)
        };
        let save_ok = {
            let w = &mut self.rooms[ri].worlds[wi];
            if cmd.cmd_kind == PLAYER_CMD_PLACE && target == Block::Water {
                let existing = w.get(cmd.tile_idx as i32, cmd.depth as i32);
                if existing == Block::Water {
                    world_water::origin_clear(w, cmd.tile_idx as i32, cmd.depth as i32);
                    world_water::set_state(w, cmd.tile_idx as i32, cmd.depth as i32, 0u8);
                    world_water::enqueue(w, cmd.tile_idx as i32, cmd.depth as i32);
                }
            }
            w.set(cmd.tile_idx as i32, cmd.depth as i32, target);
            /* Persist immediately - per-edit durability, same input
             * frame (CLAUDE.md hard rule; do not regress). */
            saves::write_tile(w, &room_code, self.cfg.seed, cmd.tile_idx as i32)
        };
        /* A BREAK dropped any machine entity in the cell (World::set);
         * a PLACE may have buried a crop. Persist the side effects on
         * the same frame and tell the room about the crop. */
        {
            let sim_now = self.sim_time_s;
            if self.rooms[ri].bents.iter().any(|b| b.in_use && b.body_id == cmd.body_id) {
                let blob = bents_serialize(&self.rooms[ri].worlds[wi].block_entities, sim_now);
                saves::body_state_write(&room_code, self.cfg.seed, cmd.body_id, "bentities.txt", &blob);
                if let Some(bi) = self.rooms[ri]
                    .bents
                    .iter()
                    .position(|b| b.in_use && b.body_id == cmd.body_id)
                {
                    self.rooms[ri].bents[bi]
                        .bcast
                        .remove(&(cmd.tile_idx as i32, cmd.depth as i32));
                }
            }
            if cmd.cmd_kind == PLAYER_CMD_PLACE {
                if let Some(si) =
                    room_crops_get_or_load(&mut self.rooms[ri], self.cfg.seed, cmd.body_id, sim_now)
                {
                    let (r_lo, r_hi, center) = {
                        let w = &self.rooms[ri].worlds[wi];
                        (
                            w.depth_to_radius_m(cmd.depth as i32),
                            w.depth_to_radius_m(cmd.depth as i32 + 1),
                            dvec3_make(w.body.pos_x, w.body.pos_y, w.body.pos_z),
                        )
                    };
                    let mut removed: Vec<ServerCrop> = Vec::new();
                    self.rooms[ri].crops[si].list.retain(|c| {
                        if c.tile_idx != cmd.tile_idx as i32 {
                            return true;
                        }
                        let d = dvec3_length(dvec3_sub(
                            dvec3_make(c.pos[0] as f64, c.pos[1] as f64, c.pos[2] as f64),
                            center,
                        ));
                        let buried = d >= r_lo - 0.01 && d < r_hi - 0.01;
                        if buried {
                            removed.push(*c);
                        }
                        !buried
                    });
                    if !removed.is_empty() {
                        let blob = crops_serialize(&self.rooms[ri].crops[si].list, sim_now);
                        saves::body_state_write(
                            &room_code,
                            self.cfg.seed,
                            cmd.body_id,
                            "crops.txt",
                            &blob,
                        );
                        let mut m = MsgCropDiff::default();
                        m.body_id = cmd.body_id;
                        m.entry_count = removed.len().min(CROP_DIFF_MAX_ENTRIES) as u16;
                        for (i, c) in removed.iter().take(CROP_DIFF_MAX_ENTRIES).enumerate() {
                            m.entries[i] = MsgCropEntry {
                                op: CROP_OP_REMOVE,
                                tile_idx: c.tile_idx as u32,
                                pos_x: c.pos[0],
                                pos_y: c.pos[1],
                                pos_z: c.pos[2],
                                ..Default::default()
                            };
                        }
                        if let Some(buf) = encode(
                            MSG_HEADER_SIZE
                                + MSG_CROP_DIFF_HEADER
                                + CROP_DIFF_MAX_ENTRIES * MSG_CROP_ENTRY_SIZE,
                            |b| proto::write_crop_diff(b, &m),
                        ) {
                            broadcast_room(
                                &self.listener,
                                &self.clients,
                                &room_code,
                                NetChannel::Reliable,
                                &buf,
                            );
                        }
                    }
                }
            }
        }
        println!(
            "[server] EDIT player_id={} room='{}' {} body={} tile={} depth={} block={} save={}",
            player_id,
            if room_code.is_empty() { "(empty-code/lobby)" } else { &room_code },
            if cmd.cmd_kind == PLAYER_CMD_BREAK { "BREAK" } else { "PLACE" },
            cmd.body_id,
            cmd.tile_idx,
            cmd.depth,
            target.raw(),
            if save_ok { "ok" } else { "FAIL" }
        );

        let mut diff = MsgChunkDiff::default();
        diff.body_id = cmd.body_id;
        diff.edit_count = 1;
        diff.edits[0].tile_idx = cmd.tile_idx;
        diff.edits[0].depth = cmd.depth;
        diff.edits[0].block_type = target.raw() as u16;
        if let Some(buf) = encode(
            MSG_HEADER_SIZE + MSG_CHUNK_DIFF_HEADER_SIZE + MSG_CHUNK_DIFF_ENTRY_SIZE,
            |b| proto::write_chunk_diff(b, &diff),
        ) {
            broadcast_room(&self.listener, &self.clients, &room_code, NetChannel::Reliable, &buf);
        }
    }

    /* -------------------------------------------------------------- */
    /* MP-parity systems: sim clock, machines, crops, animals, bag.    */
    /* -------------------------------------------------------------- */

    /// One global clock for every room: broadcast to all handshaked
    /// clients (5 s cadence + once on join).
    fn broadcast_sim_time(&self) {
        let m = MsgSimTime { sim_seconds: self.sim_time_s, day_length_s: self.day_length_s };
        let Some(buf) = encode(MSG_HEADER_SIZE + MSG_SIM_TIME_WIRE_SIZE, |b| {
            proto::write_sim_time(b, &m)
        }) else {
            return;
        };
        for cl in &self.clients {
            if let Some(conn) = cl.conn {
                if cl.handshaked {
                    self.send_conn(conn, NetChannel::Reliable, &buf);
                }
            }
        }
    }

    fn send_sim_time_to(&self, conn: ConnId) {
        let m = MsgSimTime { sim_seconds: self.sim_time_s, day_length_s: self.day_length_s };
        if let Some(buf) = encode(MSG_HEADER_SIZE + MSG_SIM_TIME_WIRE_SIZE, |b| {
            proto::write_sim_time(b, &m)
        }) {
            self.send_conn(conn, NetChannel::Reliable, &buf);
        }
    }

    /// Advance every loaded room-world's machines at the tick rate;
    /// persist on durable change; once a second broadcast the records
    /// that changed since the last broadcast (smelt progress etc.).
    fn machine_sim(&mut self) {
        let dt = (1.0 / self.cfg.tick_hz) as f32;
        let hz = self.cfg.tick_hz as u64;
        let do_bcast = hz > 0 && (self.tick % hz) == 0;
        let sim_now = self.sim_time_s;
        for ri in 0..self.rooms.len() {
            if !self.rooms[ri].in_use {
                continue;
            }
            let room_code = self.rooms[ri].code.clone();
            for wi in 0..self.rooms[ri].worlds.len() {
                let body_id = self.rooms[ri].worlds[wi].body.id as u32;
                let changed = self.rooms[ri].worlds[wi].block_entities.tick(dt);
                if changed {
                    let blob = bents_serialize(&self.rooms[ri].worlds[wi].block_entities, sim_now);
                    saves::body_state_write(&room_code, self.cfg.seed, body_id, "bentities.txt", &blob);
                }
                if !do_bcast {
                    continue;
                }
                /* Ensure the bookkeeping slot exists so bcast diffs work
                 * even for stores populated purely by client writes. */
                let Some(bi) =
                    room_bents_get_or_load(&mut self.rooms[ri], self.cfg.seed, body_id, wi, sim_now)
                else {
                    continue;
                };
                let mut recs: Vec<String> = Vec::new();
                {
                    let room = &mut self.rooms[ri];
                    let store = &room.worlds[wi].block_entities;
                    let bb = &mut room.bents[bi];
                    for (tile, depth, e) in store.iter() {
                        let rec = block_entity::record_write(tile, depth, &e);
                        if bb.bcast.get(&(tile, depth)) != Some(&rec) {
                            bb.bcast.insert((tile, depth), rec.clone());
                            recs.push(rec);
                        }
                    }
                    bb.bcast.retain(|k, _| store.get(k.0, k.1).is_some());
                }
                for chunk in recs.chunks(BENTITY_DIFF_MAX_ENTRIES) {
                    let m = MsgBentityDiff { body_id, records: chunk.to_vec() };
                    let cap = MSG_HEADER_SIZE
                        + MSG_BENTITY_DIFF_HEADER
                        + chunk.iter().map(|r| 4 + r.len()).sum::<usize>();
                    if let Some(buf) = encode(cap, |b| proto::write_bentity_diff(b, &m)) {
                        broadcast_room(
                            &self.listener,
                            &self.clients,
                            &room_code,
                            NetChannel::Reliable,
                            &buf,
                        );
                    }
                }
            }
        }
    }

    /// Server-authoritative herds: for every body a room's players are
    /// standing on, wander / re-seat / cull / respawn through the same
    /// core::fauna helpers the SP client uses, and broadcast a
    /// replace-all AnimalState at the snapshot cadence.
    fn animal_sim(&mut self) {
        const ANIMALS_PER_BODY: usize = 8;
        const STALKERS_PER_BODY: usize = 4;
        const SPAWN_INTERVAL_S: f32 = 1.5;
        const DESPAWN_M: f64 = 70.0;
        let dt = (1.0 / self.cfg.tick_hz) as f32;
        let do_bcast = (self.tick % 3) == 0;

        for ri in 0..self.rooms.len() {
            if !self.rooms[ri].in_use {
                continue;
            }
            let room_code = self.rooms[ri].code.clone();
            /* Player anchors on each body in this room. */
            let mut anchors: Vec<(u32, DVec3)> = Vec::new();
            for cl in &self.clients {
                if cl.conn.is_none() || !cl.handshaked || !cl.has_state {
                    continue;
                }
                if cl.room != room_code || cl.body_id == BODY_ID_IN_SPACE {
                    continue;
                }
                anchors.push((cl.body_id, dvec3_make(cl.pos_x, cl.pos_y, cl.pos_z)));
            }
            let mut body_ids: Vec<u32> = anchors.iter().map(|a| a.0).collect();
            body_ids.sort_unstable();
            body_ids.dedup();

            for &body_id in &body_ids {
                let Some(wi) = room_ensure_world_for_body(
                    &self.worlds,
                    &mut self.rooms[ri],
                    self.cfg.seed,
                    body_id,
                ) else {
                    continue;
                };
                let Some(ai) = room_animals_get(&mut self.rooms[ri], body_id) else { continue };
                let anchor = anchors.iter().find(|a| a.0 == body_id).unwrap().1;
                {
                    let room = &mut self.rooms[ri];
                    /* worlds / animals are distinct Room fields, so the
                     * shared + mutable borrows below don't collide. */
                    let w = &room.worlds[wi];
                    let ab = &mut room.animals[ai];
                    ab.salt = ab.salt.wrapping_add(1);
                    let salt = ab.salt;
                    let center = dvec3_make(w.body.pos_x, w.body.pos_y, w.body.pos_z);
                    /* Night at the anchor gates the stalker population -
                     * the same orbital sun every client renders. */
                    let night = fauna::is_night(w, anchor, self.sim_time_s);
                    for a in ab.list.iter_mut() {
                        let up = dvec3_normalize(dvec3_sub(a.pos, center));
                        /* Stalkers chase the nearest player on the body. */
                        let target = (a.kind == fauna::AnimalKind::Stalker)
                            .then(|| {
                                anchors
                                    .iter()
                                    .filter(|(b, _)| *b == body_id)
                                    .map(|(_, p)| *p)
                                    .min_by(|x, y| {
                                        dvec3_length(dvec3_sub(*x, a.pos))
                                            .total_cmp(&dvec3_length(dvec3_sub(*y, a.pos)))
                                    })
                            })
                            .flatten();
                        fauna::tick_with_target(a, up, dt, salt.wrapping_add(a.id), target);
                        fauna::reseat(w, a, dt);
                    }
                    ab.list.retain(|a| {
                        a.is_alive()
                            && (a.kind != fauna::AnimalKind::Stalker || night)
                            && anchors.iter().any(|(b, p)| {
                                *b == body_id && dvec3_length(dvec3_sub(a.pos, *p)) < DESPAWN_M
                            })
                    });
                    ab.spawn_cd -= dt;
                    let critters =
                        ab.list.iter().filter(|a| a.kind == fauna::AnimalKind::Critter).count();
                    let stalkers = ab.list.len() - critters;
                    if ab.spawn_cd <= 0.0 {
                        ab.spawn_cd = SPAWN_INTERVAL_S;
                        if critters < ANIMALS_PER_BODY {
                            ab.next_id = ab.next_id.wrapping_add(1).max(1);
                            if let Some(a) = fauna::spawn_near(w, anchor, ab.next_id, salt) {
                                ab.list.push(a);
                            }
                        }
                        if night && stalkers < STALKERS_PER_BODY {
                            ab.next_id = ab.next_id.wrapping_add(1).max(1);
                            if let Some(a) = fauna::spawn_near_kind(
                                w,
                                anchor,
                                ab.next_id,
                                salt.wrapping_add(97),
                                fauna::AnimalKind::Stalker,
                            ) {
                                ab.list.push(a);
                            }
                        }
                    }
                }
                if do_bcast {
                    let m = {
                        let ab = &mut self.rooms[ri].animals[ai];
                        let mut m = MsgAnimalState::default();
                        m.body_id = body_id;
                        if let Some((pid, meat)) = ab.pending_kill.take() {
                            m.killed_by = pid;
                            m.meat_award = meat;
                        }
                        let n = ab.list.len().min(ANIMAL_STATE_MAX_ENTRIES);
                        m.entry_count = n as u16;
                        for (i, a) in ab.list.iter().take(n).enumerate() {
                            let e = &mut m.entries[i];
                            e.id = a.id;
                            e.state = match a.state {
                                fauna::AnimalState::Idle => ANIMAL_STATE_IDLE,
                                fauna::AnimalState::Walk => ANIMAL_STATE_WALK,
                                fauna::AnimalState::Flee => ANIMAL_STATE_FLEE,
                                fauna::AnimalState::Dead => ANIMAL_STATE_DEAD,
                                fauna::AnimalState::Chase => proto::ANIMAL_STATE_CHASE,
                            };
                            e.kind = a.kind.to_u8();
                            e.pos_x = a.pos.x as f32;
                            e.pos_y = a.pos.y as f32;
                            e.pos_z = a.pos.z as f32;
                            e.heading_x = a.heading.x as f32;
                            e.heading_y = a.heading.y as f32;
                            e.heading_z = a.heading.z as f32;
                        }
                        m
                    };
                    let cap = MSG_HEADER_SIZE
                        + MSG_ANIMAL_STATE_HEADER
                        + ANIMAL_STATE_MAX_ENTRIES * MSG_ANIMAL_ENTRY_SIZE;
                    if let Some(buf) = encode(cap, |b| proto::write_animal_state(b, &m)) {
                        broadcast_room(
                            &self.listener,
                            &self.clients,
                            &room_code,
                            NetChannel::Reliable,
                            &buf,
                        );
                    }
                }
            }
        }
    }

    fn handle_bag_state(&mut self, ci: usize, payload: &[u8], version: u16) {
        if version != MSG_BAG_STATE_VERSION {
            return;
        }
        let Some(m) = proto::read_bag_state(payload) else { return };
        let cl = &mut self.clients[ci];
        cl.bag_known = true;
        cl.bag_hunger = m.hunger;
        cl.bag_items = m.items;
        cl.bag_counts = m.counts;
        let (room, name) = (cl.room.clone(), cl.name.clone());
        if !name.is_empty() {
            /* Same-frame persistence, like the pose + hotbar records. */
            saves::bag_write(&room, &name, &bag_serialize(m.hunger, &m.items, &m.counts));
        }
    }

    fn handle_bentity_diff(&mut self, ci: usize, payload: &[u8], version: u16) {
        if version != MSG_BENTITY_DIFF_VERSION {
            return;
        }
        let Some(m) = proto::read_bentity_diff(payload) else { return };
        if self.clients[ci].room_idx < 0 {
            return;
        }
        let ri = self.clients[ci].room_idx as usize;
        let room_code = self.clients[ci].room.clone();
        let sim_now = self.sim_time_s;
        let Some(wi) = room_ensure_world_for_body(
            &self.worlds,
            &mut self.rooms[ri],
            self.cfg.seed,
            m.body_id,
        ) else {
            return;
        };
        let Some(bi) =
            room_bents_get_or_load(&mut self.rooms[ri], self.cfg.seed, m.body_id, wi, sim_now)
        else {
            return;
        };
        let mut applied = 0;
        {
            let room = &mut self.rooms[ri];
            let tile_count = room.worlds[wi].tile_count;
            for rec in &m.records {
                let Some((tile, depth, e)) = block_entity::record_parse(rec) else { continue };
                if tile < 0 || tile >= tile_count || depth < 0 || depth >= WORLD_MAX_DEPTH {
                    continue;
                }
                room.worlds[wi].block_entities.set(tile, depth, e);
                /* Mirror into the broadcast shadow so the 1 Hz machine
                 * diff doesn't immediately re-send what the writer and
                 * everyone else just received. */
                room.bents[bi].bcast.insert((tile, depth), rec.clone());
                applied += 1;
            }
        }
        if applied > 0 {
            let blob = bents_serialize(&self.rooms[ri].worlds[wi].block_entities, sim_now);
            saves::body_state_write(&room_code, self.cfg.seed, m.body_id, "bentities.txt", &blob);
            /* Relay to the room (echo included - appliers are
             * idempotent on the sender). */
            let cap = MSG_HEADER_SIZE
                + MSG_BENTITY_DIFF_HEADER
                + m.records.iter().map(|r| 4 + r.len()).sum::<usize>();
            if let Some(buf) = encode(cap, |b| proto::write_bentity_diff(b, &m)) {
                broadcast_room(&self.listener, &self.clients, &room_code, NetChannel::Reliable, &buf);
            }
        }
    }

    fn handle_crop_diff(&mut self, ci: usize, payload: &[u8], version: u16) {
        if version != MSG_CROP_DIFF_VERSION {
            return;
        }
        let Some(m) = proto::read_crop_diff(payload) else { return };
        if self.clients[ci].room_idx < 0 {
            return;
        }
        let ri = self.clients[ci].room_idx as usize;
        let room_code = self.clients[ci].room.clone();
        let sim_now = self.sim_time_s;
        let Some(si) = room_crops_get_or_load(&mut self.rooms[ri], self.cfg.seed, m.body_id, sim_now)
        else {
            return;
        };
        const DUP_EPS2: f32 = 0.09; /* 0.3 m - matches the client's crop spacing floor */
        const REMOVE_RANGE2: f32 = 1.0;
        let mut planted = 0;
        let mut removed = 0;
        {
            let list = &mut self.rooms[ri].crops[si].list;
            for e in &m.entries[..m.entry_count as usize] {
                let d2 = |c: &ServerCrop| {
                    let dx = c.pos[0] - e.pos_x;
                    let dy = c.pos[1] - e.pos_y;
                    let dz = c.pos[2] - e.pos_z;
                    dx * dx + dy * dy + dz * dz
                };
                if e.op == CROP_OP_PLANT {
                    if list.iter().any(|c| d2(c) <= DUP_EPS2) {
                        continue;
                    }
                    list.push(ServerCrop {
                        tile_idx: e.tile_idx as i32,
                        pos: [e.pos_x, e.pos_y, e.pos_z],
                        up: [e.up_x, e.up_y, e.up_z],
                        growth: e.growth.clamp(0.0, 1.0),
                        updated_sim_s: sim_now,
                        kind: e.kind,
                    });
                    planted += 1;
                } else if e.op == CROP_OP_REMOVE {
                    let mut best = -1i32;
                    let mut best_d2 = REMOVE_RANGE2;
                    for (j, c) in list.iter().enumerate() {
                        let d = d2(c);
                        if d < best_d2 {
                            best_d2 = d;
                            best = j as i32;
                        }
                    }
                    if best >= 0 {
                        list.swap_remove(best as usize);
                        removed += 1;
                    }
                }
            }
        }
        if planted > 0 || removed > 0 {
            let blob = crops_serialize(&self.rooms[ri].crops[si].list, sim_now);
            saves::body_state_write(&room_code, self.cfg.seed, m.body_id, "crops.txt", &blob);
            if let Some(buf) = encode(
                MSG_HEADER_SIZE + MSG_CROP_DIFF_HEADER + CROP_DIFF_MAX_ENTRIES * MSG_CROP_ENTRY_SIZE,
                |b| proto::write_crop_diff(b, &m),
            ) {
                broadcast_room(&self.listener, &self.clients, &room_code, NetChannel::Reliable, &buf);
            }
        }
    }

    fn handle_animal_hit(&mut self, ci: usize, payload: &[u8], version: u16) {
        if version != MSG_ANIMAL_HIT_VERSION {
            return;
        }
        let Some(m) = proto::read_animal_hit(payload) else { return };
        if self.clients[ci].room_idx < 0 {
            return;
        }
        let ri = self.clients[ci].room_idx as usize;
        let player_id = self.clients[ci].player_id;
        let from = dvec3_make(
            self.clients[ci].pos_x,
            self.clients[ci].pos_y,
            self.clients[ci].pos_z,
        );
        let Some(ai) = room_animals_get(&mut self.rooms[ri], m.body_id) else { return };
        let Some(body) = planet::get_by_index(m.body_id as i32) else { return };
        let center = dvec3_make(body.pos_x, body.pos_y, body.pos_z);
        let ab = &mut self.rooms[ri].animals[ai];
        let Some(idx) = ab.list.iter().position(|a| a.id == m.animal_id) else { return };
        /* Sanity-cap the damage; the client's swing is ATTACK_DAMAGE=5. */
        let dmg = m.dmg.clamp(0.0, 20.0);
        let up = dvec3_normalize(dvec3_sub(ab.list[idx].pos, center));
        fauna::hit(&mut ab.list[idx], dmg, from, up);
        if !ab.list[idx].is_alive() {
            /* Same meat roll the SP client uses. */
            let meat = 2 + (rng::hash2(idx as i32 * 31, 5) * 2.0) as u16;
            ab.list.swap_remove(idx);
            ab.pending_kill = Some((player_id, meat));
        }
    }

    /// Join replay: every loaded machine record for every body (the
    /// join-side mirror of the torch replay).
    fn send_bentity_replay(&mut self, ci: usize) {
        let ri = self.clients[ci].room_idx;
        if ri < 0 {
            return;
        }
        let ri = ri as usize;
        let Some(conn) = self.clients[ci].conn else { return };
        let sim_now = self.sim_time_s;
        let body_ids: Vec<u32> = self.worlds.iter().map(|w| w.body.id as u32).collect();
        for body_id in body_ids {
            /* Only replay bodies that HAVE persisted machine state -
             * probing the file avoids lazy-cloning every world. */
            if saves::body_state_load(&self.rooms[ri].code, self.cfg.seed, body_id, "bentities.txt")
                .is_none()
                && !self.rooms[ri].bents.iter().any(|b| b.in_use && b.body_id == body_id)
            {
                continue;
            }
            let Some(wi) = room_ensure_world_for_body(
                &self.worlds,
                &mut self.rooms[ri],
                self.cfg.seed,
                body_id,
            ) else {
                continue;
            };
            if room_bents_get_or_load(&mut self.rooms[ri], self.cfg.seed, body_id, wi, sim_now)
                .is_none()
            {
                continue;
            }
            let recs: Vec<String> = self.rooms[ri].worlds[wi]
                .block_entities
                .iter()
                .map(|(t, d, e)| block_entity::record_write(t, d, &e))
                .collect();
            for chunk in recs.chunks(BENTITY_DIFF_MAX_ENTRIES) {
                let m = MsgBentityDiff { body_id, records: chunk.to_vec() };
                let cap = MSG_HEADER_SIZE
                    + MSG_BENTITY_DIFF_HEADER
                    + chunk.iter().map(|r| 4 + r.len()).sum::<usize>();
                if let Some(buf) = encode(cap, |b| proto::write_bentity_diff(b, &m)) {
                    self.send_conn(conn, NetChannel::Reliable, &buf);
                }
            }
        }
    }

    /// Join replay: every crop for every body, growth refreshed to now.
    fn send_crop_replay(&mut self, ci: usize) {
        let ri = self.clients[ci].room_idx;
        if ri < 0 {
            return;
        }
        let ri = ri as usize;
        let Some(conn) = self.clients[ci].conn else { return };
        let sim_now = self.sim_time_s;
        let body_ids: Vec<u32> = self.worlds.iter().map(|w| w.body.id as u32).collect();
        for body_id in body_ids {
            if saves::body_state_load(&self.rooms[ri].code, self.cfg.seed, body_id, "crops.txt")
                .is_none()
                && !self.rooms[ri].crops.iter().any(|c| c.in_use && c.body_id == body_id)
            {
                continue;
            }
            let Some(si) =
                room_crops_get_or_load(&mut self.rooms[ri], self.cfg.seed, body_id, sim_now)
            else {
                continue;
            };
            let list = self.rooms[ri].crops[si].list.clone();
            for chunk in list.chunks(CROP_DIFF_MAX_ENTRIES) {
                let mut m = MsgCropDiff::default();
                m.body_id = body_id;
                m.entry_count = chunk.len() as u16;
                for (i, c) in chunk.iter().enumerate() {
                    m.entries[i] = MsgCropEntry {
                        op: CROP_OP_PLANT,
                        kind: c.kind,
                        tile_idx: c.tile_idx as u32,
                        pos_x: c.pos[0],
                        pos_y: c.pos[1],
                        pos_z: c.pos[2],
                        up_x: c.up[0],
                        up_y: c.up[1],
                        up_z: c.up[2],
                        growth: crop_growth_at(c, sim_now),
                    };
                }
                let cap = MSG_HEADER_SIZE
                    + MSG_CROP_DIFF_HEADER
                    + CROP_DIFF_MAX_ENTRIES * MSG_CROP_ENTRY_SIZE;
                if let Some(buf) = encode(cap, |b| proto::write_crop_diff(b, &m)) {
                    self.send_conn(conn, NetChannel::Reliable, &buf);
                }
            }
        }
    }

    fn handle_torch_diff(&mut self, ci: usize, payload: &[u8], version: u16) {
        if version != MSG_TORCH_DIFF_VERSION {
            return;
        }
        let Some(diff) = proto::read_torch_diff(payload) else { return };
        if self.clients[ci].room_idx < 0 {
            return;
        }
        let ri = self.clients[ci].room_idx as usize;
        let player_id = self.clients[ci].player_id;
        let room_code = self.clients[ci].room.clone();
        let Some(si) = room_torches_get_or_load(&mut self.rooms[ri], self.cfg.seed, diff.body_id)
        else {
            return;
        };

        let mut placed = 0;
        let mut removed = 0;
        const MATCH_EPSILON_M: f32 = 0.1;
        const REMOVE_RANGE_M: f32 = 1.0;
        const MATCH_EPS2: f32 = MATCH_EPSILON_M * MATCH_EPSILON_M;
        const REMOVE_RANGE2: f32 = REMOVE_RANGE_M * REMOVE_RANGE_M;
        {
            let list = &mut self.rooms[ri].torches[si].list;
            for i in 0..diff.entry_count as usize {
                let e = &diff.entries[i];
                if e.op == TORCH_OP_PLACE {
                    let mut dup = false;
                    for t in list.iter() {
                        let dx = t.pos[0] - e.pos_x;
                        let dy = t.pos[1] - e.pos_y;
                        let dz = t.pos[2] - e.pos_z;
                        if dx * dx + dy * dy + dz * dz <= MATCH_EPS2 {
                            dup = true;
                            break;
                        }
                    }
                    if dup {
                        continue;
                    }
                    if list.len() >= saves::TORCHES_MAX_COUNT {
                        eprintln!("[server] torch list full for body={}", diff.body_id);
                        continue;
                    }
                    list.push(Torch {
                        tile_idx: e.tile_idx as i32,
                        pos: [e.pos_x, e.pos_y, e.pos_z],
                        up: [e.up_x, e.up_y, e.up_z],
                    });
                    placed += 1;
                } else if e.op == TORCH_OP_REMOVE {
                    let mut best: i32 = -1;
                    let mut best_d2 = REMOVE_RANGE2;
                    for (j, t) in list.iter().enumerate() {
                        let dx = t.pos[0] - e.pos_x;
                        let dy = t.pos[1] - e.pos_y;
                        let dz = t.pos[2] - e.pos_z;
                        let d2 = dx * dx + dy * dy + dz * dz;
                        if d2 < best_d2 {
                            best_d2 = d2;
                            best = j as i32;
                        }
                    }
                    if best < 0 {
                        continue;
                    }
                    /* C swap-remove. */
                    let last = list.len() - 1;
                    list.swap(best as usize, last);
                    list.pop();
                    removed += 1;
                }
            }
        }
        if placed > 0 || removed > 0 {
            let list = &self.rooms[ri].torches[si].list;
            let save_ok = saves::torches_write(&room_code, self.cfg.seed, diff.body_id, list);
            println!(
                "[server] TORCH player_id={} room='{}' body={} placed={} removed={} total={} save={}",
                player_id,
                room_log_name(&room_code),
                diff.body_id,
                placed,
                removed,
                list.len(),
                if save_ok { "ok" } else { "FAIL" }
            );
        }
        if let Some(buf) = encode(
            MSG_HEADER_SIZE + MSG_TORCH_DIFF_HEADER + TORCH_DIFF_MAX_ENTRIES * MSG_TORCH_ENTRY_SIZE,
            |b| proto::write_torch_diff(b, &diff),
        ) {
            broadcast_room(&self.listener, &self.clients, &room_code, NetChannel::Reliable, &buf);
        }
    }

    fn handle_chat(&mut self, ci: usize, payload: &[u8], version: u16) {
        if version != MSG_CHAT_VERSION {
            return;
        }
        let Some(mut m) = proto::read_chat(payload) else { return };
        m.player_id = self.clients[ci].player_id;
        let room_code = self.clients[ci].room.clone();
        let name = self.clients[ci].name.clone();
        let Some(buf) = encode(MSG_HEADER_SIZE + MSG_CHAT_WIRE_SIZE, |b| {
            proto::write_chat(b, &m)
        }) else {
            return;
        };
        broadcast_room(&self.listener, &self.clients, &room_code, NetChannel::Reliable, &buf);

        let nz_text = cstr_from(&m.text, MSG_CHAT_TEXT_LEN);
        saves::global_chat_append(&room_code, &name, &nz_text);

        let short_text: String = {
            let b = nz_text.as_bytes();
            String::from_utf8_lossy(&b[..b.len().min(32)]).into_owned()
        };
        println!(
            "[server] chat room={} {}: {}",
            room_log_name(&room_code),
            name,
            short_text
        );
    }

    fn handle_inventory_state(&mut self, ci: usize, payload: &[u8], version: u16) {
        if version != MSG_INVENTORY_STATE_VERSION {
            return;
        }
        let Some(inv) = proto::read_inventory_state(payload) else { return };
        let cl = &mut self.clients[ci];
        cl.inv_slot_type = inv.slot_type;
        cl.inv_slot_count = inv.slot_count;
        cl.inv_selected = if inv.selected < 9 { inv.selected } else { 0 };
        cl.inv_known = true;
        cl.last_saved_tick = 0;
    }

    fn handle_player_info_request(&mut self, ci: usize, payload: &[u8], version: u16) {
        if version != MSG_PLAYER_INFO_REQUEST_VERSION {
            return;
        }
        let Some(req) = proto::read_player_info_request(payload) else { return };
        if req.player_id == 0 || req.player_id == self.clients[ci].player_id {
            return;
        }
        let Some(conn) = self.clients[ci].conn else { return };
        let room = self.clients[ci].room.clone();
        let target = self.clients.iter().find(|peer| {
            peer.conn.is_some()
                && peer.handshaked
                && peer.player_id == req.player_id
                && peer.room == room
        });
        let Some(target) = target else {
            let nack = MsgPlayerInfoNack {
                player_id: req.player_id,
                reason: PLAYER_INFO_NACK_UNKNOWN_ID,
            };
            if let Some(nbuf) = encode(MSG_HEADER_SIZE + MSG_PLAYER_INFO_NACK_WIRE_SIZE, |b| {
                proto::write_player_info_nack(b, &nack)
            }) {
                self.send_conn(conn, NetChannel::Reliable, &nbuf);
            }
            println!(
                "[server] PLAYER_INFO_REQUEST from player_id={} for unknown id={} in room='{}' -> NACK",
                self.clients[ci].player_id,
                req.player_id,
                room_log_name(&room)
            );
            return;
        };
        let mut info = MsgPlayerInfo::default();
        info.player_id = target.player_id;
        copy_name(&mut info.name, &target.name);
        if let Some(buf) = encode(MSG_HEADER_SIZE + MSG_PLAYER_INFO_WIRE_SIZE, |b| {
            proto::write_player_info(b, &info)
        }) {
            self.send_conn(conn, NetChannel::Reliable, &buf);
        }
    }

    fn handle_player_state(&mut self, ci: usize, conn: ConnId, payload: &[u8], version: u16) {
        if version != MSG_PLAYER_STATE_VERSION {
            eprintln!(
                "[server] PLAYER_STATE version {} != {}, closing",
                version, MSG_PLAYER_STATE_VERSION
            );
            self.close_conn(conn);
            return;
        }
        let Some(st) = proto::read_player_state(payload) else {
            eprintln!("[server] malformed PLAYER_STATE");
            return;
        };
        let cl = &mut self.clients[ci];
        if cl.has_state && st.client_tick <= cl.last_client_tick {
            return;
        }
        let first = !cl.has_state;
        cl.has_state = true;
        cl.body_id = st.body_id;
        cl.pos_x = st.pos_x;
        cl.pos_y = st.pos_y;
        cl.pos_z = st.pos_z;
        cl.yaw = st.yaw;
        cl.pitch = st.pitch;
        cl.is_grounded = (st.flags & PLAYER_STATE_FLAG_GROUNDED) != 0;
        cl.last_client_tick = st.client_tick;
        if first {
            println!(
                "[server] first PLAYER_STATE from player_id={} at ({:.1}, {:.1}, {:.1}) body={}",
                cl.player_id, st.pos_x, st.pos_y, st.pos_z, st.body_id
            );
        }
        self.check_for_desync(ci);
    }

    fn handle_sync_ack(&mut self, ci: usize, payload: &[u8], version: u16) {
        if version != MSG_SYNC_ACK_VERSION {
            return;
        }
        let Some(ack) = proto::read_sync_ack(payload) else { return };
        let cl = &mut self.clients[ci];
        if ack.seq_id != cl.sync_last_seq_id {
            return;
        }
        let now = unix_now_f64();
        cl.sync_last_rtt_s = now - cl.sync_last_sent_s;
        if cl.sync_last_rtt_s < 0.0 {
            cl.sync_last_rtt_s = 0.0;
        }
        if cl.sync_outstanding > 0 {
            cl.sync_outstanding -= 1;
        }
    }

    fn on_close(&mut self, conn: ConnId, reason: NetCloseReason) {
        let Some(ci) = self.find_client_idx(conn) else { return };
        let cl = &self.clients[ci];
        if cl.has_state && !cl.token.is_empty() && !cl.name.is_empty() {
            let mut pose = saves::PlayerPose {
                body_id: cl.body_id,
                pos_x: cl.pos_x,
                pos_y: cl.pos_y,
                pos_z: cl.pos_z,
                yaw: cl.yaw,
                pitch: cl.pitch,
                ..Default::default()
            };
            if cl.inv_known {
                pose.inv_slot_type = cl.inv_slot_type;
                pose.inv_slot_count = cl.inv_slot_count;
                pose.inv_selected = cl.inv_selected;
            }
            saves::write_player(&cl.room, &cl.name, &pose);
        }
        println!(
            "[server] close: player_id={} name={} (reason={})",
            cl.player_id,
            if cl.name.is_empty() { "(unnamed)" } else { &cl.name },
            reason as i32
        );
        if cl.handshaked && !cl.name.is_empty() {
            saves::session_log("logout", &cl.name, &cl.room);
        }
        let room_idx = cl.room_idx;
        if room_idx >= 0 {
            self.room_release(room_idx);
            self.clients[ci].room_idx = -1;
        }
        let cl = &mut self.clients[ci];
        cl.conn = None;
        cl.player_id = 0;
        cl.handshaked = false;
        cl.name.clear();
        cl.token.clear();
        cl.room.clear();
        cl.has_state = false;
    }

    /* -------------------------------------------------------------- */
    /* Tick loop pieces.                                               */
    /* -------------------------------------------------------------- */

    /// Port of `broadcast_snapshot()`.
    fn broadcast_snapshot(&mut self) {
        let mut seen = [false; SERVER_MAX_CLIENTS];
        let mut total_sent = 0;
        let mut total_players = 0;
        let mut rooms = 0;

        for i in 0..SERVER_MAX_CLIENTS {
            if seen[i] || self.clients[i].conn.is_none() {
                continue;
            }
            let room = self.clients[i].room.clone();
            seen[i] = true;

            let mut snap = MsgSnapshot::default();
            snap.server_tick = self.tick as u32;
            for j in i..SERVER_MAX_CLIENTS {
                let cl = &self.clients[j];
                if cl.conn.is_none() {
                    continue;
                }
                if cl.room != room {
                    continue;
                }
                seen[j] = true;
                if !cl.has_state {
                    continue;
                }
                if (snap.player_count as usize) >= SNAPSHOT_MAX_PLAYERS {
                    break;
                }
                let e = &mut snap.players[snap.player_count as usize];
                snap.player_count += 1;
                e.player_id = cl.player_id;
                e.body_id = cl.body_id;
                e.pos_x = cl.pos_x;
                e.pos_y = cl.pos_y;
                e.pos_z = cl.pos_z;
                e.yaw = cl.yaw;
                e.pitch = cl.pitch;
            }
            if snap.player_count == 0 {
                continue;
            }
            let Some(buf) = encode(
                MSG_HEADER_SIZE + MSG_SNAPSHOT_HEADER_SIZE + SNAPSHOT_MAX_PLAYERS * MSG_SNAPSHOT_ENTRY_SIZE,
                |b| proto::write_snapshot(b, &snap),
            ) else {
                continue;
            };
            for cl in &self.clients {
                if let Some(conn) = cl.conn {
                    if cl.room == room {
                        self.send_conn(conn, NetChannel::Unreliable, &buf);
                        total_sent += 1;
                    }
                }
            }
            total_players += snap.player_count as i32;
            rooms += 1;
        }

        if rooms > 0 {
            self.snap_count += 1;
            if self.snap_count % 33 == 0 {
                println!(
                    "[server] snapshots #{} across {} room(s): {} total players, {} sends",
                    self.snap_count, rooms, total_players, total_sent
                );
            }
        }
    }

    /// Port of `client_sweep_idle()`.
    fn client_sweep_idle(&mut self) {
        let now = unix_now_i64();
        for cl in self.clients.iter_mut() {
            if cl.conn.is_none() {
                continue;
            }
            if !cl.handshaked {
                continue;
            }
            if cl.timed_out_logged {
                continue;
            }
            if cl.last_msg_unix_s == 0 {
                continue;
            }
            let silent_s = now - cl.last_msg_unix_s;
            if silent_s < CLIENT_IDLE_TIMEOUT_S {
                continue;
            }
            cl.timed_out_logged = true;
            saves::session_log("timeout", &cl.name, &cl.room);
            println!(
                "[server] timeout: player_id={} name='{}' room='{}' silent_s={}",
                cl.player_id,
                if cl.name.is_empty() { "(unnamed)" } else { &cl.name },
                if cl.room.is_empty() { "(empty-code/lobby)" } else { &cl.room },
                silent_s
            );
        }
    }

    /// Port of `room_sweep_idle()`.
    fn room_sweep_idle(&mut self) {
        let now = unix_now_f64();
        for r in self.rooms.iter_mut() {
            if !r.in_use || r.ref_count > 0 {
                continue;
            }
            if r.last_empty_time_s <= 0.0 {
                continue;
            }
            if now - r.last_empty_time_s < IDLE_ROOM_GRACE_S {
                continue;
            }
            println!(
                "[server] room '{}' freed after {:.0}s idle",
                room_log_name(&r.code),
                now - r.last_empty_time_s
            );
            room_free_worlds(r);
            *r = Room::default();
        }
    }

    /// The once-per-second sync coordination block from `server_tick`.
    fn sync_coordination(&mut self) {
        let now = unix_now_f64();
        let mut rtt_sum = 0.0;
        let mut rtt_n = 0;
        let mut behind = 0;
        for cl in &self.clients {
            if cl.conn.is_none() || !cl.handshaked {
                continue;
            }
            if cl.sync_outstanding > 1 {
                behind += 1;
            }
            if cl.sync_last_rtt_s > 0.0 {
                rtt_sum += cl.sync_last_rtt_s;
                rtt_n += 1;
            }
        }
        let avg_rtt = if rtt_n > 0 { rtt_sum / rtt_n as f64 } else { 0.0 };
        if behind > 0 || (rtt_n > 0 && avg_rtt > self.sync_interval_s) {
            if self.sync_interval_s < 600.0 {
                self.sync_interval_s += 30.0;
                println!(
                    "[sync] interval up to {:.0}s (behind={} avg_rtt={:.1}s)",
                    self.sync_interval_s, behind, avg_rtt
                );
            }
        } else if rtt_n > 0 && avg_rtt * 2.0 < self.sync_interval_s && self.sync_interval_s > 30.0 {
            self.sync_interval_s -= 15.0;
            if self.sync_interval_s < 30.0 {
                self.sync_interval_s = 30.0;
            }
            println!(
                "[sync] interval down to {:.0}s (avg_rtt={:.1}s)",
                self.sync_interval_s, avg_rtt
            );
        }

        for ci in 0..SERVER_MAX_CLIENTS {
            if self.clients[ci].conn.is_none() || !self.clients[ci].handshaked {
                continue;
            }
            if self.clients[ci].sync_next_send_s == 0.0 {
                self.clients[ci].sync_next_send_s = now + self.sync_interval_s;
                continue;
            }
            if now < self.clients[ci].sync_next_send_s {
                continue;
            }
            let seq = self.sync_next_seq;
            self.sync_next_seq = self.sync_next_seq.wrapping_add(1);
            if self.sync_next_seq == 0 {
                self.sync_next_seq = 1;
            }
            let tick = MsgSyncTick { seq_id: seq };
            let Some(buf) = encode(MSG_HEADER_SIZE + MSG_SYNC_TICK_WIRE_SIZE, |b| {
                proto::write_sync_tick(b, &tick)
            }) else {
                continue;
            };
            let conn = self.clients[ci].conn.unwrap();
            self.send_conn(conn, NetChannel::Reliable, &buf);
            {
                let cl = &mut self.clients[ci];
                cl.sync_last_seq_id = seq;
                cl.sync_last_sent_s = now;
                cl.sync_next_send_s = now + self.sync_interval_s;
                cl.sync_outstanding += 1;
            }

            /* Origin join-sync flood (private rooms only - the C loop
             * condition gates on cl->room[0]). */
            let room = self.clients[ci].room.clone();
            if room.is_empty() {
                continue;
            }
            for ri in 0..SERVER_MAX_ROOMS {
                if !self.rooms[ri].in_use {
                    continue;
                }
                if self.rooms[ri].code != room {
                    continue;
                }
                for rwi in 0..self.rooms[ri].worlds.len() {
                    let tile_count = self.rooms[ri].worlds[rwi].tile_count;
                    for t in 0..tile_count {
                        let mut entries =
                            [world_water::OriginDiffEntry::default(); MSG_WATER_ORIGINS_DIFF_MAX_ENTRIES];
                        let written = {
                            let w = &self.rooms[ri].worlds[rwi];
                            world_water::origin_enum_tile(w, t, &mut entries)
                        };
                        if written <= 0 {
                            continue;
                        }
                        let written = (written as usize).min(MSG_WATER_ORIGINS_DIFF_MAX_ENTRIES);
                        let mut od = MsgWaterOriginsDiff::default();
                        od.body_id = self.rooms[ri].worlds[rwi].body.id as u32;
                        od.tile_idx = t as u32;
                        od.entry_count = written as u16;
                        for k in 0..written {
                            od.entries[k] = origin_entry_to_msg(&entries[k]);
                        }
                        if let Some(obuf) = encode(
                            MSG_HEADER_SIZE + MSG_WATER_ORIGINS_DIFF_MAX_SIZE,
                            |b| proto::write_water_origins_diff(b, &od),
                        ) {
                            self.send_conn(conn, NetChannel::Reliable, &obuf);
                        }
                    }
                }
                break;
            }
        }
    }

    /// The 0.5 s pose-flush block from `server_tick`.
    fn pose_flush(&mut self, flush_interval: u64) {
        let mut saved_poses = 0;
        for cl in self.clients.iter_mut() {
            if cl.conn.is_none() || !cl.has_state || cl.token.is_empty() || cl.name.is_empty() {
                continue;
            }
            let dx = cl.pos_x - cl.last_saved_pos_x;
            let dy = cl.pos_y - cl.last_saved_pos_y;
            let dz = cl.pos_z - cl.last_saved_pos_z;
            let moved2 = dx * dx + dy * dy + dz * dz;
            if cl.last_saved_tick != 0 && moved2 < 0.0625 {
                continue;
            }
            let mut pose = saves::PlayerPose {
                body_id: cl.body_id,
                pos_x: cl.pos_x,
                pos_y: cl.pos_y,
                pos_z: cl.pos_z,
                yaw: cl.yaw,
                pitch: cl.pitch,
                ..Default::default()
            };
            if cl.inv_known {
                pose.inv_slot_type = cl.inv_slot_type;
                pose.inv_slot_count = cl.inv_slot_count;
                pose.inv_selected = cl.inv_selected;
            }
            if saves::write_player(&cl.room, &cl.name, &pose) {
                saved_poses += 1;
                cl.last_saved_pos_x = cl.pos_x;
                cl.last_saved_pos_y = cl.pos_y;
                cl.last_saved_pos_z = cl.pos_z;
                cl.last_saved_tick = self.tick;
            }
        }
        if saved_poses > 0 && (self.tick % (flush_interval * 20)) == 0 {
            println!("[server] flush: {} player poses", saved_poses);
        }
    }

    /// The water-flow simulation block from `server_tick`.
    fn water_sim(&mut self) {
        let wf = config::water_flow();
        let period = wf.ticks_per_step.max(1);
        if (self.tick % period as u64) != 0 {
            return;
        }
        let budget = wf.max_ticks_per_step.max(1);
        let mut dirty_tiles = vec![0i32; 8192];
        for ri in 0..SERVER_MAX_ROOMS {
            if !self.rooms[ri].in_use {
                continue;
            }
            let room_code = self.rooms[ri].code.clone();
            for wi in 0..self.rooms[ri].worlds.len() {
                let n = {
                    let w = &mut self.rooms[ri].worlds[wi];
                    world_water::step(w, budget);
                    world_water::drain_persist_dirty(w, &mut dirty_tiles)
                } as usize;

                let body_id = self.rooms[ri].worlds[wi].body.id as u32;
                let mut batch_diff = MsgChunkDiff::default();
                batch_diff.body_id = body_id;
                let mut batch_count = 0usize;

                /* PASS 1: persist + accumulate block edits, flushing
                 * the cross-tile batcher at CHUNK_DIFF_MAX_EDITS. */
                for i in 0..n {
                    let tile = dirty_tiles[i];
                    for d in 0..DEPTH {
                        let raw = self.rooms[ri].worlds[wi].blocks[tile as usize * DEPTH + d];
                        batch_diff.edits[batch_count].tile_idx = tile as u32;
                        batch_diff.edits[batch_count].depth = d as u16;
                        batch_diff.edits[batch_count].block_type = raw as u16;
                        batch_count += 1;
                        if batch_count >= CHUNK_DIFF_MAX_EDITS {
                            water_flush_batch(
                                &self.listener,
                                &self.clients,
                                &room_code,
                                &mut batch_diff,
                                &mut batch_count,
                            );
                        }
                    }
                    {
                        let w = &mut self.rooms[ri].worlds[wi];
                        saves::write_tile(w, &room_code, self.cfg.seed, tile);
                        w.tile_clear_dirty(tile);
                    }
                }
                water_flush_batch(
                    &self.listener,
                    &self.clients,
                    &room_code,
                    &mut batch_diff,
                    &mut batch_count,
                );

                /* PASS 2: persist + broadcast water-state columns. */
                for i in 0..n {
                    let tile = dirty_tiles[i];
                    {
                        let w = &self.rooms[ri].worlds[wi];
                        saves::write_water_state(w, &room_code, self.cfg.seed, tile);
                        saves::write_water_origins(w, &room_code, self.cfg.seed, tile);
                    }
                    let mut wsd = MsgWaterStateDiff::default();
                    {
                        let w = &self.rooms[ri].worlds[wi];
                        let Some(state_col) = world_water::state_column(w, tile) else {
                            continue;
                        };
                        wsd.body_id = body_id;
                        wsd.tile_idx = tile as u32;
                        wsd.state.copy_from_slice(state_col);
                    }
                    if let Some(buf) = encode(
                        MSG_HEADER_SIZE + MSG_WATER_STATE_DIFF_WIRE_SIZE,
                        |b| proto::write_water_state_diff(b, &wsd),
                    ) {
                        broadcast_room(
                            &self.listener,
                            &self.clients,
                            &room_code,
                            NetChannel::Reliable,
                            &buf,
                        );
                    }
                }

                /* PASS 3: broadcast flow-origin entries (always, even
                 * empty, so removals clear client state). */
                for i in 0..n {
                    let tile = dirty_tiles[i];
                    let mut od = MsgWaterOriginsDiff::default();
                    od.body_id = body_id;
                    od.tile_idx = tile as u32;
                    let mut entries =
                        [world_water::OriginDiffEntry::default(); MSG_WATER_ORIGINS_DIFF_MAX_ENTRIES];
                    let written = {
                        let w = &self.rooms[ri].worlds[wi];
                        world_water::origin_enum_tile(w, tile, &mut entries)
                    };
                    let written = written.max(0) as usize;
                    let written = written.min(MSG_WATER_ORIGINS_DIFF_MAX_ENTRIES);
                    od.entry_count = written as u16;
                    for k in 0..written {
                        od.entries[k] = origin_entry_to_msg(&entries[k]);
                    }
                    if let Some(buf) = encode(
                        MSG_HEADER_SIZE + MSG_WATER_ORIGINS_DIFF_MAX_SIZE,
                        |b| proto::write_water_origins_diff(b, &od),
                    ) {
                        broadcast_room(
                            &self.listener,
                            &self.clients,
                            &room_code,
                            NetChannel::Reliable,
                            &buf,
                        );
                    }
                }
            }
        }
    }

    /// Port of `server_tick()`.
    pub fn tick(&mut self) {
        self.tick += 1;

        let events = match &mut self.listener {
            Some(l) => l.poll(),
            None => Vec::new(),
        };
        for ev in events {
            match ev {
                NetEvent::Open { conn } => self.on_open(conn),
                NetEvent::Msg { conn, channel: _, data } => self.on_msg(conn, &data),
                NetEvent::Close { conn, reason } => self.on_close(conn, reason),
                NetEvent::Http(req) => self.on_http(req),
            }
        }

        let hz = self.cfg.tick_hz as u64;
        if hz > 0 && (self.tick % hz) == 0 {
            self.room_sweep_idle();
        }
        if hz > 0 && (self.tick % hz) == 0 {
            self.client_sweep_idle();
        }
        if hz > 0 && (self.tick % hz) == 0 {
            self.sync_coordination();
        }

        if (self.tick % 3) == 0 {
            self.broadcast_snapshot();
        }

        let flush_interval = (self.cfg.tick_hz * 0.5) as u64;
        if flush_interval > 0 && (self.tick % flush_interval) == 0 {
            self.pose_flush(flush_interval);
        }

        self.water_sim();

        /* MP-parity systems: the authoritative sim clock, machine
         * ticking, and the animal herds. */
        self.sim_time_s += 1.0 / self.cfg.tick_hz;
        if hz > 0 && (self.tick % (hz * 5)) == 0 {
            self.broadcast_sim_time();
        }
        if hz > 0 && (self.tick % (hz * 30)) == 0 {
            saves::world_time_write(self.sim_time_s, unix_now_i64());
        }
        self.machine_sim();
        self.animal_sim();

        let log_n = self.cfg.log_every_n as u64;
        if log_n > 0 && (self.tick % log_n) == 0 {
            let connected = self.clients.iter().filter(|c| c.conn.is_some()).count();
            println!("[server] tick {} ({} connected)", self.tick, connected);
        }
    }

    /// Port of `server_shutdown()`.
    pub fn shutdown(&mut self) {
        println!("[server] shutdown after {} ticks", self.tick);
        /* Final sim-clock save so the next boot's catch-up gap starts
         * from the real stop time. */
        saves::world_time_write(self.sim_time_s, unix_now_i64());
        let mut final_poses = 0;
        for cl in &self.clients {
            if cl.conn.is_none() || !cl.has_state || cl.token.is_empty() || cl.name.is_empty() {
                continue;
            }
            if !cl.is_grounded {
                continue;
            }
            let mut pose = saves::PlayerPose {
                body_id: cl.body_id,
                pos_x: cl.pos_x,
                pos_y: cl.pos_y,
                pos_z: cl.pos_z,
                yaw: cl.yaw,
                pitch: cl.pitch,
                ..Default::default()
            };
            if cl.inv_known {
                pose.inv_slot_type = cl.inv_slot_type;
                pose.inv_slot_count = cl.inv_slot_count;
                pose.inv_selected = cl.inv_selected;
            }
            if saves::write_player(&cl.room, &cl.name, &pose) {
                final_poses += 1;
            }
        }
        println!("[server] final flush: {} poses", final_poses);

        if let Some(l) = self.listener.take() {
            l.close();
        }
        for r in self.rooms.iter_mut() {
            if !r.in_use {
                continue;
            }
            room_free_worlds(r);
            *r = Room::default();
        }
        self.worlds.clear();
        saves::shutdown();
        job_system::shutdown();
    }
}

fn origin_entry_to_msg(e: &world_water::OriginDiffEntry) -> MsgWaterOriginsDiffEntry {
    MsgWaterOriginsDiffEntry {
        depth: e.depth,
        origin_count: e.origin_count,
        _pad: [0; 2],
        origin_tile: e.origin_tile,
        origin_depth: e.origin_depth,
        _pad2: 0,
    }
}

fn water_flush_batch(
    listener: &Option<NetListener>,
    clients: &[Client],
    room_code: &str,
    diff: &mut MsgChunkDiff,
    count: &mut usize,
) {
    if *count == 0 {
        return;
    }
    diff.edit_count = *count as u16;
    if let Some(buf) = encode(
        MSG_HEADER_SIZE + MSG_CHUNK_DIFF_HEADER_SIZE + MSG_CHUNK_DIFF_ENTRY_SIZE * CHUNK_DIFF_MAX_EDITS,
        |b| proto::write_chunk_diff(b, diff),
    ) {
        broadcast_room(listener, clients, room_code, NetChannel::Reliable, &buf);
    }
    *count = 0;
}

/* ------------------------------------------------------------------ */
/* HTTP dashboard (port of the on_http section of server.c).           */
/* ------------------------------------------------------------------ */

/// Port of the `json_appendf` / HTTP_BODY pattern: appends cap at
/// HTTP_BODY_CAP; a too-long append writes nothing and reports false
/// (C truncates then rewinds to the last good NUL).
struct JsonBuf {
    b: Vec<u8>,
}

impl JsonBuf {
    fn new() -> JsonBuf {
        JsonBuf { b: Vec::new() }
    }
    fn append(&mut self, s: &str) -> bool {
        if self.b.len() + 2 >= HTTP_BODY_CAP {
            return false;
        }
        if self.b.len() + s.len() >= HTTP_BODY_CAP {
            return false;
        }
        self.b.extend_from_slice(s.as_bytes());
        true
    }
}

/// Port of `json_escape()` - escapes `"` and `\`, byte-capped at
/// `cap - 1` exactly like the fixed C output buffers.
fn json_escape(input: &str, cap: usize) -> String {
    let mut out: Vec<u8> = Vec::new();
    let mut o = 0usize;
    for &c in input.as_bytes() {
        if c == 0 || o + 2 >= cap {
            break;
        }
        if c == b'"' || c == b'\\' {
            if o + 3 >= cap {
                break;
            }
            out.push(b'\\');
            o += 1;
        }
        out.push(c);
        o += 1;
    }
    String::from_utf8_lossy(&out).into_owned()
}

/// Port of `hex_nybble` + `url_decode`.
fn hex_nybble(c: u8) -> i32 {
    match c {
        b'0'..=b'9' => (c - b'0') as i32,
        b'a'..=b'f' => (c - b'a') as i32 + 10,
        b'A'..=b'F' => (c - b'A') as i32 + 10,
        _ => -1,
    }
}

fn url_decode(input: &[u8], out_cap: usize) -> String {
    let mut out: Vec<u8> = Vec::new();
    if out_cap == 0 {
        return String::new();
    }
    let mut i = 0usize;
    while i < input.len() && input[i] != 0 && input[i] != b'&' && out.len() + 1 < out_cap {
        let c = input[i];
        if c == b'+' {
            out.push(b' ');
        } else if c == b'%' && i + 2 < input.len() {
            let h1 = hex_nybble(input[i + 1]);
            let h2 = hex_nybble(input[i + 2]);
            if h1 >= 0 && h2 >= 0 {
                out.push(((h1 << 4) | h2) as u8);
                i += 2;
            } else {
                out.push(c);
            }
        } else {
            out.push(c);
        }
        i += 1;
    }
    String::from_utf8_lossy(&out).into_owned()
}

/// Port of `http_query_str()`. Returns None when the key is absent
/// (C: -1); the decoded value otherwise (may be empty).
fn http_query_str(path: &str, key: &str, out_cap: usize) -> Option<String> {
    let q = path.find('?')?;
    let mut p = &path.as_bytes()[q + 1..];
    let kb = key.as_bytes();
    loop {
        if p.len() > kb.len() && p[..kb.len()] == *kb && p[kb.len()] == b'=' {
            return Some(url_decode(&p[kb.len() + 1..], out_cap));
        }
        match p.iter().position(|&c| c == b'&') {
            Some(amp) => p = &p[amp + 1..],
            None => break,
        }
    }
    None
}

/// Port of `http_query_int()` - clamped to [1, AUDIT_FILE_MAX].
fn http_query_int(path: &str, key: &str, def: i32) -> i32 {
    let Some(q) = path.find('?') else { return def };
    let mut p = &path.as_bytes()[q + 1..];
    let kb = key.as_bytes();
    loop {
        if p.len() > kb.len() && p[..kb.len()] == *kb && p[kb.len()] == b'=' {
            let mut v = c_atoi(&p[kb.len() + 1..]);
            if v < 1 {
                v = 1;
            }
            if v > saves::AUDIT_FILE_MAX as i32 {
                v = saves::AUDIT_FILE_MAX as i32;
            }
            return v;
        }
        match p.iter().position(|&c| c == b'&') {
            Some(amp) => p = &p[amp + 1..],
            None => break,
        }
    }
    def
}

/// Port of `strip_query()` (clean[256] cap included).
fn strip_query(path: &str) -> String {
    let end = path.find('?').unwrap_or(path.len());
    let clean = &path[..end];
    let cap = clean.len().min(255);
    clean[..cap].to_string()
}

/// Parse `before=` out of the query string (strtoull decimal).
fn http_query_before_ts(path: &str) -> u64 {
    let Some(q) = path.find('?') else { return 0 };
    let mut p = &path.as_bytes()[q + 1..];
    let mut before_ts = 0u64;
    loop {
        if p.len() > 7 && &p[..7] == b"before=" {
            before_ts = c_strtoull_dec(&p[7..]).0;
        }
        match p.iter().position(|&c| c == b'&') {
            Some(amp) => p = &p[amp + 1..],
            None => break,
        }
    }
    before_ts
}

/// Port of `build_audit_json()`.
fn build_audit_json(which: &str, max_lines: i32, before_ts: u64) -> Vec<u8> {
    let mut raw = vec![0u8; HTTP_BODY_CAP];
    let raw_len = saves::audit_tail(which, saves::AUDIT_FILE_MAX as i32, &mut raw);
    let mut j = JsonBuf::new();
    if !j.append(&format!("{{\"{}\":[", which)) {
        return Vec::new();
    }

    struct Line {
        off: usize,
        len: usize,
        ts: u64,
    }
    let mut lines: Vec<Line> = Vec::new();
    {
        let mut off = 0usize;
        while off < raw_len && lines.len() < saves::AUDIT_FILE_MAX {
            let nl = raw[off..raw_len].iter().position(|&c| c == b'\n').map(|p| off + p);
            let lend = nl.unwrap_or(raw_len);
            let llen = lend - off;
            if llen == 0 {
                if nl.is_none() {
                    break;
                }
                off = lend + 1;
                continue;
            }
            let has_tab = raw[off..lend].contains(&b'\t');
            let ts = if has_tab { c_strtoull_dec(&raw[off..lend]).0 } else { 0 };
            lines.push(Line { off, len: llen, ts });
            if nl.is_none() {
                break;
            }
            off = lend + 1;
        }
    }

    let mut kept: Vec<usize> = Vec::new();
    for i in (0..lines.len()).rev() {
        if kept.len() >= max_lines as usize {
            break;
        }
        if before_ts > 0 && lines[i].ts >= before_ts {
            continue;
        }
        kept.push(i);
    }
    let mut has_older = false;
    if !kept.is_empty() {
        let oldest = lines[kept[kept.len() - 1]].ts;
        for l in &lines {
            if l.ts < oldest {
                has_older = true;
                break;
            }
        }
    }

    let mut first = true;
    for slot in (0..kept.len()).rev() {
        let l = &lines[kept[slot]];
        let line = &raw[l.off..l.off + l.len];
        /* Split into up to 4 tab-separated fields, each byte-capped at
         * SAVES_CHAT_TEXT_MAX (the C `fields[4][128]` buffers). */
        let mut fields: Vec<String> = Vec::new();
        let mut fstart = 0usize;
        let mut i = 0usize;
        while i <= line.len() && fields.len() < 4 {
            if i == line.len() || line[i] == b'\t' {
                let flen = (i - fstart).min(saves::CHAT_TEXT_MAX);
                fields.push(String::from_utf8_lossy(&line[fstart..fstart + flen]).into_owned());
                fstart = i + 1;
            }
            i += 1;
        }
        if fields.len() != 4 {
            continue;
        }
        let esc_a = json_escape(&fields[1], 256);
        let esc_b = json_escape(&fields[2], 256);
        let esc_c = json_escape(&fields[3], 256);
        let sep = if first { "" } else { "," };
        first = false;
        let row = if which == "sessions" {
            format!(
                "{}{{\"ts\":{},\"event\":\"{}\",\"name\":\"{}\",\"room\":\"{}\"}}",
                sep, fields[0], esc_a, esc_b, esc_c
            )
        } else {
            format!(
                "{}{{\"ts\":{},\"name\":\"{}\",\"room\":\"{}\",\"text\":\"{}\"}}",
                sep, fields[0], esc_a, esc_b, esc_c
            )
        };
        if !j.append(&row) {
            break;
        }
    }
    j.append("]");
    if !kept.is_empty() {
        j.append(&format!(",\"oldest_ts\":{}", lines[kept[kept.len() - 1]].ts));
    }
    j.append(&format!(
        ",\"more\":{},\"returned\":{}}}",
        if has_older { "true" } else { "false" },
        kept.len()
    ));
    j.b
}

/* /rooms aggregator constants (RS_*). */
const RS_MAX_ROOMS: usize = 32;
const RS_MAX_UNIQUE_NAMES: usize = 64;
const RS_NAME_MAX: usize = 32;
const RS_ROOM_MAX: usize = 16;

#[derive(Default, Clone)]
struct RsRoom {
    room: String,
    total_logins: i32,
    last_seen_ts: i64,
    names: Vec<String>,
}

fn rs_find_or_add(buf: &mut Vec<RsRoom>, room: &str) -> i32 {
    for (i, r) in buf.iter().enumerate() {
        if r.room == room {
            return i as i32;
        }
    }
    if buf.len() >= RS_MAX_ROOMS {
        return -1;
    }
    let mut r = RsRoom::default();
    /* snprintf into room[16] -> 15-byte cap. */
    let b = room.as_bytes();
    r.room = String::from_utf8_lossy(&b[..b.len().min(RS_ROOM_MAX - 1)]).into_owned();
    buf.push(r);
    (buf.len() - 1) as i32
}

impl Server {
    /// Port of `build_rooms_json()`.
    fn build_rooms_json(&self) -> Vec<u8> {
        let mut rs: Vec<RsRoom> = Vec::new();
        let mut raw = vec![0u8; HTTP_BODY_CAP];
        let raw_len = saves::audit_tail("sessions", saves::AUDIT_FILE_MAX as i32, &mut raw);
        let mut off = 0usize;
        while off < raw_len {
            let nl = raw[off..raw_len].iter().position(|&c| c == b'\n').map(|p| off + p);
            let lend = nl.unwrap_or(raw_len);
            let len = lend - off;
            if len == 0 {
                if nl.is_none() {
                    break;
                }
                off = lend + 1;
                continue;
            }
            let line = &raw[off..lend];
            let mut fields: Vec<String> = Vec::new();
            let mut fstart = 0usize;
            let mut i = 0usize;
            while i <= line.len() && fields.len() < 4 {
                if i == line.len() || line[i] == b'\t' {
                    let flen = (i - fstart).min(saves::CHAT_TEXT_MAX);
                    fields.push(String::from_utf8_lossy(&line[fstart..fstart + flen]).into_owned());
                    fstart = i + 1;
                }
                i += 1;
            }
            if fields.len() == 4 {
                let ts = c_atoi(fields[0].as_bytes()) as i64;
                let event = &fields[1];
                let name = &fields[2];
                let room = &fields[3];
                let ri = rs_find_or_add(&mut rs, room);
                if ri >= 0 {
                    let r = &mut rs[ri as usize];
                    if event == "login" {
                        r.total_logins += 1;
                    }
                    if ts > r.last_seen_ts {
                        r.last_seen_ts = ts;
                    }
                    let seen = r.names.iter().any(|n| n == name);
                    if !seen && r.names.len() < RS_MAX_UNIQUE_NAMES {
                        let b = name.as_bytes();
                        r.names.push(
                            String::from_utf8_lossy(&b[..b.len().min(RS_NAME_MAX - 1)]).into_owned(),
                        );
                    }
                }
            }
            if nl.is_none() {
                break;
            }
            off = lend + 1;
        }

        for r in &self.rooms {
            if !r.in_use {
                continue;
            }
            let slug = if r.code.is_empty() { "__public__" } else { &r.code };
            let _ = rs_find_or_add(&mut rs, slug);
        }

        let mut j = JsonBuf::new();
        j.append("{\"rooms\":[");
        let mut first = true;
        for r in &rs {
            let room_internal = if r.room == "__public__" { "" } else { &r.room };
            let mut live = 0;
            for sr in &self.rooms {
                if !sr.in_use {
                    continue;
                }
                if sr.code == room_internal {
                    live = sr.ref_count;
                    break;
                }
            }
            let esc_code = json_escape(&r.room, 32);
            let row = format!(
                "{}{{\"code\":\"{}\",\"unique_users\":{},\"total_logins\":{},\"last_seen_ts\":{},\"live_clients\":{}}}",
                if first { "" } else { "," },
                esc_code,
                r.names.len(),
                r.total_logins,
                r.last_seen_ts,
                live
            );
            if !j.append(&row) {
                break;
            }
            first = false;
        }
        j.append("]}");
        j.b
    }

    /// Port of `build_status_json()` (+ cpu_percent_sample /
    /// proc_status_kb).
    fn build_status_json(&mut self) -> Vec<u8> {
        let now = monotonic_seconds();
        if self.start_wall_s == 0.0 {
            self.start_wall_s = now;
        }
        let uptime = now - self.start_wall_s;
        let cpu_pct = self.cpu_percent_sample();
        let rss_kb = proc_status_kb("VmRSS");
        let vm_kb = proc_status_kb("VmSize");
        let cores = std::thread::available_parallelism()
            .map(|n| n.get() as i64)
            .unwrap_or(1)
            .max(1);

        let mut j = JsonBuf::new();
        j.append(&format!(
            "{{\"uptime_s\":{:.1},\"tick\":{},\"tick_hz\":{:.1},\"cpu\":{{\"percent\":{:.2},\"cores\":{}}},\"memory\":{{\"rss_kb\":{},\"vm_kb\":{}}},",
            uptime, self.tick, self.cfg.tick_hz, cpu_pct, cores, rss_kb, vm_kb
        ));

        j.append("\"players\":[");
        let mut first = true;
        let mut player_count = 0;
        for cl in &self.clients {
            if cl.conn.is_none() || !cl.handshaked {
                continue;
            }
            let esc_name = json_escape(&cl.name, saves::CHAT_NAME_MAX * 2 + 4);
            let esc_room = json_escape(
                if cl.room.is_empty() { "__public__" } else { &cl.room },
                32,
            );
            j.append(&format!(
                "{}{{\"player_id\":{},\"name\":\"{}\",\"room\":\"{}\",\"body_id\":{},\"has_state\":{}}}",
                if first { "" } else { "," },
                cl.player_id,
                esc_name,
                esc_room,
                cl.body_id,
                if cl.has_state { "true" } else { "false" }
            ));
            first = false;
            player_count += 1;
        }
        j.append(&format!("],\"player_count\":{},", player_count));

        j.append("\"rooms\":[");
        let mut first = true;
        for r in &self.rooms {
            if !r.in_use {
                continue;
            }
            let esc_code = json_escape(if r.code.is_empty() { "__public__" } else { &r.code }, 32);
            j.append(&format!(
                "{}{{\"code\":\"{}\",\"clients\":{}}}",
                if first { "" } else { "," },
                esc_code,
                r.ref_count
            ));
            first = false;
        }
        j.append("]}");
        j.b
    }

    fn cpu_percent_sample(&mut self) -> f64 {
        let now = monotonic_seconds();
        let cpu = cpu_seconds_used();
        if self.cpu_last_wall_s == 0.0 {
            self.cpu_last_wall_s = now;
            self.cpu_last_cpu_s = cpu;
            return 0.0;
        }
        let dt = now - self.cpu_last_wall_s;
        if dt < 0.05 {
            return self.cpu_cached_percent;
        }
        let dcpu = cpu - self.cpu_last_cpu_s;
        self.cpu_last_wall_s = now;
        self.cpu_last_cpu_s = cpu;
        self.cpu_cached_percent = if dt > 0.0 { dcpu / dt * 100.0 } else { 0.0 };
        self.cpu_cached_percent
    }

    /// Port of `build_saves_json()`.
    fn build_saves_json(&self, path: &str) -> Vec<u8> {
        let room_buf = http_query_str(path, "room", 16).unwrap_or_default();
        let filter_room = if room_buf.is_empty() { None } else { Some(room_buf) };

        let mut have_seed_filter = false;
        let mut filter_seed = 0u64;
        let mut have_body_filter = false;
        let mut filter_body = 0u32;
        if let Some(q) = path.find('?') {
            let mut p = &path.as_bytes()[q + 1..];
            loop {
                if p.len() > 5 && &p[..5] == b"seed=" {
                    filter_seed = c_strtoull_dec(&p[5..]).0;
                    have_seed_filter = true;
                } else if p.len() > 5 && &p[..5] == b"body=" {
                    filter_body = c_strtoull_dec(&p[5..]).0 as u32;
                    have_body_filter = true;
                }
                match p.iter().position(|&c| c == b'&') {
                    Some(amp) => p = &p[amp + 1..],
                    None => break,
                }
            }
        }

        let mut j = JsonBuf::new();
        j.append("{\n  \"filters\":{");
        let mut first = true;
        if let Some(fr) = &filter_room {
            let esc = json_escape(fr, 64);
            j.append(&format!("{}\"room\":\"{}\"", if first { "" } else { "," }, esc));
            first = false;
        }
        if have_seed_filter {
            j.append(&format!("{}\"seed\":{}", if first { "" } else { "," }, filter_seed));
            first = false;
        }
        if have_body_filter {
            j.append(&format!("{}\"body\":{}", if first { "" } else { "," }, filter_body));
        }
        j.append("},\n  \"tiles\":[");

        let mut matched = 0;
        let mut emitted = 0;
        let mut truncated = false;
        let total = saves::enumerate_tiles(|room, seed, body_id, tile_idx, size_bytes, mtime| {
            if let Some(fr) = &filter_room {
                if !fr.is_empty() && fr != room {
                    return;
                }
            }
            if have_seed_filter && seed != filter_seed {
                return;
            }
            if have_body_filter && body_id != filter_body {
                return;
            }
            matched += 1;
            if truncated {
                return;
            }
            let rname = json_escape(room, 64);
            let row = format!(
                "{}\n    {{\"room\":\"{}\",\"seed\":{},\"body\":{},\"tile\":{},\"size\":{},\"mtime\":{}}}",
                if emitted == 0 { "" } else { "," },
                rname,
                seed,
                body_id,
                tile_idx,
                size_bytes,
                mtime
            );
            if !j.append(&row) {
                truncated = true;
                return;
            }
            emitted += 1;
        });
        j.append(&format!(
            "\n  ],\n  \"total_files\":{},\n  \"matched\":{},\n  \"emitted\":{},\n  \"truncated\":{}\n}}\n",
            total,
            matched,
            emitted,
            if truncated { "true" } else { "false" }
        ));
        j.b
    }

    /// Port of `server_chat_say()`.
    fn server_chat_say(&self, room: &str, text: &str) {
        /* Strip control chars; snprintf cap at MSG_CHAT_TEXT_LEN. */
        let mut clean: Vec<u8> = text.as_bytes().iter().copied().take(MSG_CHAT_TEXT_LEN).collect();
        for c in clean.iter_mut() {
            if *c == b'\r' || *c == b'\n' || *c == b'\t' {
                *c = b' ';
            }
        }
        let clean_text = String::from_utf8_lossy(&clean).into_owned();

        let sname = "~server~";
        let mut info = MsgPlayerInfo::default();
        info.player_id = SERVER_CHAT_ID;
        copy_name(&mut info.name, sname);
        let pi_buf = encode(MSG_HEADER_SIZE + MSG_PLAYER_INFO_WIRE_SIZE, |b| {
            proto::write_player_info(b, &info)
        });

        let mut m = MsgChat::default();
        m.player_id = SERVER_CHAT_ID;
        copy_name(&mut m.text, &clean_text);
        let cbuf = encode(MSG_HEADER_SIZE + MSG_CHAT_WIRE_SIZE, |b| proto::write_chat(b, &m));

        let mut sent_to = 0;
        for peer in &self.clients {
            let Some(conn) = peer.conn else { continue };
            if peer.room != room {
                continue;
            }
            if let Some(b) = &pi_buf {
                self.send_conn(conn, NetChannel::Reliable, b);
            }
            if let Some(b) = &cbuf {
                self.send_conn(conn, NetChannel::Reliable, b);
            }
            sent_to += 1;
        }

        saves::global_chat_append(room, sname, &clean_text);

        println!(
            "[server] dashboard chat room={} ~server~: {} (-> {} client{})",
            room_log_name(room),
            clean_text,
            sent_to,
            if sent_to == 1 { "" } else { "s" }
        );
    }

    /// Port of `admin_clear_water_above_sea()`.
    fn admin_clear_water_above_sea(&mut self, room_param: &str) -> (i32, i32, i32, i32) {
        let mut total_cleared = 0;
        let mut total_tiles = 0;
        let mut total_worlds = 0;
        let mut total_rooms = 0;

        let fan_all = room_param == "__all__";
        let room_target: String = if fan_all {
            String::new()
        } else if room_param == "__public__" {
            String::new()
        } else {
            room_param.to_string()
        };

        for ri in 0..SERVER_MAX_ROOMS {
            if !self.rooms[ri].in_use {
                continue;
            }
            if !fan_all && self.rooms[ri].code != room_target {
                continue;
            }
            total_rooms += 1;
            let room_code = self.rooms[ri].code.clone();

            for wi in 0..self.rooms[ri].worlds.len() {
                let mut world_touched = false;
                let tile_count = self.rooms[ri].worlds[wi].tile_count;
                let body_id = self.rooms[ri].worlds[wi].body.id as u32;

                for tile in 0..tile_count {
                    let mut pending: Vec<MsgChunkDiffEntry> = Vec::new();
                    {
                        let w = &mut self.rooms[ri].worlds[wi];
                        for d in WORLD_SEA_LEVEL_DEPTH..WORLD_MAX_DEPTH {
                            if w.blocks[(tile * WORLD_MAX_DEPTH + d) as usize] != Block::Water.raw()
                            {
                                continue;
                            }
                            w.set(tile, d, Block::Air);
                            world_water::clear_state(w, tile, d);
                            if pending.len() < CHUNK_DIFF_MAX_EDITS {
                                pending.push(MsgChunkDiffEntry {
                                    tile_idx: tile as u32,
                                    depth: d as u16,
                                    block_type: Block::Air.raw() as u16,
                                });
                            }
                            total_cleared += 1;
                        }
                    }
                    if pending.is_empty() {
                        continue;
                    }
                    total_tiles += 1;
                    world_touched = true;

                    {
                        let w = &mut self.rooms[ri].worlds[wi];
                        saves::write_tile(w, &room_code, self.cfg.seed, tile);
                    }

                    let mut diff = MsgChunkDiff::default();
                    diff.body_id = body_id;
                    diff.edit_count = pending.len() as u16;
                    for (e, p) in diff.edits.iter_mut().zip(pending.iter()) {
                        *e = *p;
                    }
                    if let Some(buf) = encode(
                        MSG_HEADER_SIZE + MSG_CHUNK_DIFF_HEADER_SIZE + MSG_CHUNK_DIFF_ENTRY_SIZE * CHUNK_DIFF_MAX_EDITS,
                        |b| proto::write_chunk_diff(b, &diff),
                    ) {
                        broadcast_room(
                            &self.listener,
                            &self.clients,
                            &room_code,
                            NetChannel::Reliable,
                            &buf,
                        );
                    }
                }
                if world_touched {
                    total_worlds += 1;
                }
            }
        }
        (total_cleared, total_tiles, total_worlds, total_rooms)
    }

    /// Port of `on_http()`. A `None` return in the C (`return 0`)
    /// becomes `req.not_found()` -> transport 404.
    fn on_http(&mut self, req: HttpRequest) {
        const JSON_MIME: &str = "application/json; charset=utf-8";
        let path = req.path.clone();
        let clean = strip_query(&path);

        if clean == "/status" {
            let body = self.build_status_json();
            req.respond(JSON_MIME, &body);
            return;
        }
        if clean == "/rooms" {
            let body = self.build_rooms_json();
            req.respond(JSON_MIME, &body);
            return;
        }
        if clean == "/logins" {
            let n = http_query_int(&path, "n", 100);
            let before_ts = http_query_before_ts(&path);
            let body = build_audit_json("sessions", n, before_ts);
            req.respond(JSON_MIME, &body);
            return;
        }
        if clean == "/chat" {
            let n = http_query_int(&path, "n", 100);
            let before_ts = http_query_before_ts(&path);
            let body = build_audit_json("chat", n, before_ts);
            req.respond(JSON_MIME, &body);
            return;
        }
        if clean == "/chat/send" {
            let room = http_query_str(&path, "room", 32).unwrap_or_default();
            let text = http_query_str(&path, "text", MSG_CHAT_TEXT_LEN + 1);
            let text = match text {
                Some(t) if !t.is_empty() => t,
                _ => {
                    req.respond(JSON_MIME, b"{\"error\":\"missing text\"}");
                    return;
                }
            };
            if room == "__all__" {
                let codes: Vec<String> = self
                    .rooms
                    .iter()
                    .filter(|r| r.in_use)
                    .map(|r| r.code.clone())
                    .collect();
                for code in codes {
                    self.server_chat_say(&code, &text);
                }
            } else {
                let room_real = if room == "__public__" { "" } else { room.as_str() };
                self.server_chat_say(room_real, &text);
            }
            req.respond(JSON_MIME, b"{\"ok\":true}");
            return;
        }
        if clean == "/saves" {
            let body = self.build_saves_json(&path);
            req.respond(JSON_MIME, &body);
            return;
        }
        if clean.starts_with("/saves/") && clean != "/saves/body" {
            /* /saves/<room> shorthand for /saves?room=<room>. */
            let room_in_path = &clean[7..];
            let mut room_only = String::new();
            for c in room_in_path.chars() {
                if c == '/' || c == '?' || room_only.len() >= 15 {
                    break;
                }
                room_only.push(c);
            }
            let extra_q = path.find('?').map(|i| &path[i + 1..]);
            let synth = format!(
                "/saves?room={}{}{}",
                room_only,
                if extra_q.is_some() { "&" } else { "" },
                extra_q.unwrap_or("")
            );
            let body = self.build_saves_json(&synth);
            req.respond(JSON_MIME, &body);
            return;
        }
        if clean == "/saves/body" {
            let room = http_query_str(&path, "room", 16).unwrap_or_default();
            let room_real = if room == "__public__" { "" } else { room.as_str() };

            let mut seed = 0u64;
            let mut body_id = 0u32;
            let mut have_body = false;
            if let Some(q) = path.find('?') {
                let mut p = &path.as_bytes()[q + 1..];
                loop {
                    if p.len() > 5 && &p[..5] == b"seed=" {
                        seed = c_strtoull_dec(&p[5..]).0;
                    } else if p.len() > 5 && &p[..5] == b"body=" {
                        body_id = c_strtoull_dec(&p[5..]).0 as u32;
                        have_body = true;
                    }
                    match p.iter().position(|&c| c == b'&') {
                        Some(amp) => p = &p[amp + 1..],
                        None => break,
                    }
                }
            }
            if !have_body {
                req.respond(
                    "text/plain; charset=utf-8",
                    b"missing required ?body=N parameter",
                );
                return;
            }
            if seed == 0 {
                seed = self.cfg.seed;
            }

            let mut blob = vec![0u8; HTTP_BODY_CAP];
            let mut blob_len = 0usize;
            let ok = saves::body_blob(room_real, seed, body_id, &mut blob, &mut blob_len);
            if !ok {
                let err = format!(
                    "{{\"error\":\"blob too large\",\"required_bytes\":{},\"buffer_bytes\":{}}}\n",
                    blob_len, HTTP_BODY_CAP
                );
                req.respond(JSON_MIME, err.as_bytes());
                return;
            }
            println!(
                "[server] /saves/body room='{}' body={} seed={} -> {} bytes",
                if room.is_empty() { "(empty-code/lobby)" } else { &room },
                body_id,
                seed,
                blob_len
            );
            req.respond("application/octet-stream", &blob[..blob_len]);
            return;
        }
        if clean == "/admin/clear_water_above_sea" {
            let room = http_query_str(&path, "room", 32).unwrap_or_default();
            let (cleared, tiles_touched, worlds_touched, rooms_touched) =
                self.admin_clear_water_above_sea(&room);
            let body = format!(
                "{{\"ok\":true,\"room\":\"{}\",\"rooms_touched\":{},\"worlds_touched\":{},\"tiles_touched\":{},\"cells_cleared\":{}}}\n",
                if room.is_empty() { "__public__" } else { &room },
                rooms_touched,
                worlds_touched,
                tiles_touched,
                cleared
            );
            println!(
                "[server] /admin/clear_water_above_sea room='{}' -> {} rooms, {} worlds, {} tiles, {} cells",
                if room.is_empty() { "__public__" } else { &room },
                rooms_touched,
                worlds_touched,
                tiles_touched,
                cleared
            );
            req.respond(JSON_MIME, body.as_bytes());
            return;
        }
        if clean == "/" || clean == "/health" {
            const MSG: &str = concat!(
                "tenebris-server alive\n",
                "  GET /status               - live JSON (players, CPU, RAM, rooms)\n",
                "  GET /rooms                - per-room unique-user + total-login counts\n",
                "  GET /logins[?n=N&before=TS] - newest N login/logout events older than TS\n",
                "                                (default n=100, no before filter -> tail)\n",
                "  GET /chat  [?n=N&before=TS] - newest N chat messages older than TS\n",
                "                                (default n=100; response carries oldest_ts +\n",
                "                                 more=true/false so callers can paginate)\n",
                "  GET /chat/send?text=...   - broadcast '~server~' chat to a room\n",
                "                              (&room=ABC123 for private,\n",
                "                               &room=__all__ to fan out, default public)\n",
                "  GET /saves                - JSON: every persisted .col file on disk\n",
                "                              filter with ?room=ABC123 / ?body=0 / ?seed=N\n",
                "  GET /saves/ABC123         - shorthand for /saves?room=ABC123\n",
                "                              (extra ?body=N etc still works)\n",
                "  GET /saves/body?body=N    - BINARY: every persisted column for one body\n",
                "                              also ?room=ABC123 (default lobby) and ?seed=N\n",
                "  GET /admin/clear_water_above_sea[?room=X] - clear every BLOCK_WATER\n",
                "                              above sea level (depth >= 64). Default room is\n",
                "                              the public lobby; pass &room=__all__ to fan\n",
                "                              out across every in-use room. Persists +\n",
                "                              broadcasts CHUNK_DIFFs to connected peers.\n"
            );
            req.respond("text/plain; charset=utf-8", MSG.as_bytes());
            return;
        }
        req.not_found();
    }
}

/// Port of `cpu_seconds_used()` (C: getrusage). Linux: utime+stime
/// from /proc/self/stat at the standard 100 Hz tick; elsewhere 0.0 -
/// same shape as the C fallbacks on missing /proc.
fn cpu_seconds_used() -> f64 {
    let Ok(stat) = std::fs::read_to_string("/proc/self/stat") else {
        return 0.0;
    };
    /* comm can contain spaces - skip past the closing paren. */
    let Some(rp) = stat.rfind(')') else { return 0.0 };
    let rest: Vec<&str> = stat[rp + 1..].split_whitespace().collect();
    /* fields after comm: state(0) ... utime(11) stime(12). */
    let utime: f64 = rest.get(11).and_then(|s| s.parse().ok()).unwrap_or(0.0);
    let stime: f64 = rest.get(12).and_then(|s| s.parse().ok()).unwrap_or(0.0);
    (utime + stime) / 100.0
}

/// Port of `proc_status_kb()`.
fn proc_status_kb(key: &str) -> i64 {
    let Ok(content) = std::fs::read_to_string("/proc/self/status") else {
        return -1;
    };
    for line in content.lines() {
        if let Some(rest) = line.strip_prefix(key) {
            if let Some(v) = rest.strip_prefix(':') {
                return c_atoi(v.as_bytes()) as i64;
            }
        }
    }
    -1
}

/* ================================================================== */

#[cfg(test)]
mod tests {
    use super::*;
    use futures_util::{SinkExt, StreamExt};
    use std::io::{Read as _, Write as _};
    use std::path::Path;
    use std::time::Duration;
    use tokio::net::TcpStream;
    use tokio::runtime::Runtime;
    use tokio_tungstenite::tungstenite::Message;
    use tokio_tungstenite::{connect_async, MaybeTlsStream, WebSocketStream};

    type Ws = WebSocketStream<MaybeTlsStream<TcpStream>>;

    const TEST_TIMEOUT_MS: u64 = 30_000;

    fn temp_saves_dir(tag: &str) -> String {
        let d = std::env::temp_dir().join(format!(
            "tenebris-server-test-{}-{}",
            tag,
            std::process::id()
        ));
        let _ = std::fs::remove_dir_all(&d);
        std::fs::create_dir_all(&d).unwrap();
        d.to_string_lossy().into_owned()
    }

    fn boot(saves_dir: &str, seed: u64) -> Server {
        let cfg = ServerConfig {
            port: 0, /* ephemeral */
            tick_hz: 20.0,
            log_every_n: 0,
            saves_dir: saves_dir.to_string(),
            seed,
        };
        Server::init(&cfg).expect("server init")
    }

    fn ws_connect(rt: &Runtime, port: u16) -> Ws {
        rt.block_on(async {
            connect_async(format!("ws://127.0.0.1:{}/", port))
                .await
                .expect("ws connect")
                .0
        })
    }

    fn ws_send(rt: &Runtime, ws: &mut Ws, bytes: Vec<u8>) {
        rt.block_on(ws.send(Message::Binary(bytes))).expect("ws send");
    }

    /// Receive the next binary frame while ticking the server.
    /// None = timeout or connection gone.
    fn pump_recv(rt: &Runtime, s: &mut Server, ws: &mut Ws, max_ms: u64) -> Option<Vec<u8>> {
        let deadline = Instant::now() + Duration::from_millis(max_ms);
        loop {
            s.tick();
            let r = rt.block_on(async {
                tokio::time::timeout(Duration::from_millis(10), ws.next()).await
            });
            match r {
                Ok(Some(Ok(Message::Binary(b)))) => return Some(b),
                Ok(Some(Ok(_))) => {}
                Ok(Some(Err(_))) | Ok(None) => return None,
                Err(_) => {}
            }
            if Instant::now() >= deadline {
                return None;
            }
        }
    }

    /// Receive frames until one of `kind` arrives; other kinds are
    /// skipped (PLAYER_INFO fanout, snapshots, ...).
    fn recv_kind(rt: &Runtime, s: &mut Server, ws: &mut Ws, kind: MsgKind) -> Vec<u8> {
        let deadline = Instant::now() + Duration::from_millis(TEST_TIMEOUT_MS);
        loop {
            assert!(Instant::now() < deadline, "timed out waiting for {:?}", kind);
            let Some(b) = pump_recv(rt, s, ws, 2_000) else { continue };
            let hdr = proto::read_header(&b).expect("header");
            if hdr.kind == kind as u16 {
                return b;
            }
        }
    }

    /// Receive a binary frame WITHOUT ticking the server - used to
    /// prove a message was queued by a tick that already ran.
    fn recv_no_tick(rt: &Runtime, ws: &mut Ws, max_ms: u64) -> Option<Vec<u8>> {
        let deadline = Instant::now() + Duration::from_millis(max_ms);
        while Instant::now() < deadline {
            let r = rt.block_on(async {
                tokio::time::timeout(Duration::from_millis(50), ws.next()).await
            });
            match r {
                Ok(Some(Ok(Message::Binary(b)))) => return Some(b),
                Ok(Some(Ok(_))) => {}
                Ok(Some(Err(_))) | Ok(None) => return None,
                Err(_) => {}
            }
        }
        None
    }

    /// Drain everything currently queued for this socket.
    fn drain(rt: &Runtime, s: &mut Server, ws: &mut Ws) {
        while pump_recv(rt, s, ws, 200).is_some() {}
    }

    fn tick_until<F: FnMut(&Server) -> bool>(s: &mut Server, mut pred: F, what: &str) {
        let deadline = Instant::now() + Duration::from_millis(TEST_TIMEOUT_MS);
        loop {
            s.tick();
            if pred(s) {
                return;
            }
            assert!(Instant::now() < deadline, "tick_until timed out: {}", what);
            std::thread::sleep(Duration::from_millis(2));
        }
    }

    fn used_slots(s: &Server) -> usize {
        s.clients.iter().filter(|c| c.conn.is_some()).count()
    }

    fn hello_bytes(client_version: u32, name: &str, room: &str, token: &str) -> Vec<u8> {
        let mut m = MsgHello::default();
        m.client_version = client_version;
        copy_name(&mut m.token, token);
        copy_name(&mut m.name, name);
        copy_name(&mut m.room_code, room);
        let mut buf = vec![0u8; MSG_HEADER_SIZE + MSG_HELLO_WIRE_SIZE];
        let n = proto::write_hello(&mut buf, &m);
        assert_eq!(n, buf.len());
        buf
    }

    fn player_cmd_bytes(kind: u8, body_id: u32, tile: u32, depth: u16, block: Block) -> Vec<u8> {
        let cmd = MsgPlayerCmd {
            cmd_kind: kind,
            body_id,
            tile_idx: tile,
            depth,
            block_type: block.raw() as u16,
            ..Default::default()
        };
        let mut buf = vec![0u8; MSG_HEADER_SIZE + MSG_PLAYER_CMD_WIRE_SIZE];
        let n = proto::write_player_cmd(&mut buf, &cmd);
        assert_eq!(n, buf.len());
        buf
    }

    fn chat_bytes(text: &str) -> Vec<u8> {
        let mut m = MsgChat::default();
        copy_name(&mut m.text, text);
        let mut buf = vec![0u8; MSG_HEADER_SIZE + MSG_CHAT_WIRE_SIZE];
        let n = proto::write_chat(&mut buf, &m);
        assert_eq!(n, buf.len());
        buf
    }

    fn player_state_bytes(tick: u32, body: u32, pos: (f64, f64, f64), grounded: bool) -> Vec<u8> {
        let st = MsgPlayerState {
            client_tick: tick,
            body_id: body,
            pos_x: pos.0,
            pos_y: pos.1,
            pos_z: pos.2,
            yaw: 0.3,
            pitch: 0.1,
            buttons: 0,
            flags: if grounded { PLAYER_STATE_FLAG_GROUNDED } else { 0 },
        };
        let mut buf = vec![0u8; MSG_HEADER_SIZE + MSG_PLAYER_STATE_WIRE_SIZE];
        let n = proto::write_player_state(&mut buf, &st);
        assert_eq!(n, buf.len());
        buf
    }

    /// Raw HTTP GET against the server's port, ticking the server
    /// while the request is in flight. Returns the full response.
    fn http_get_ticking(s: &mut Server, path: &str) -> Vec<u8> {
        let port = s.port();
        let p = path.to_string();
        let t = std::thread::spawn(move || {
            let mut st = std::net::TcpStream::connect(("127.0.0.1", port)).unwrap();
            st.set_read_timeout(Some(Duration::from_secs(10))).unwrap();
            write!(st, "GET {} HTTP/1.1\r\nHost: t\r\n\r\n", p).unwrap();
            let mut out = Vec::new();
            let _ = st.read_to_end(&mut out);
            out
        });
        while !t.is_finished() {
            s.tick();
            std::thread::sleep(Duration::from_millis(2));
        }
        t.join().unwrap()
    }

    fn http_body(resp: &[u8]) -> Vec<u8> {
        let sep = resp
            .windows(4)
            .position(|w| w == b"\r\n\r\n")
            .expect("http header/body separator");
        resp[sep + 4..].to_vec()
    }

    /// HELLO -> WELCOME (field checks), bad version -> KICK, name
    /// taken -> KICK, per-edit same-frame .col durability + peer
    /// CHUNK_DIFF, chat round-trip + persistence, join/leave
    /// PLAYER_INFO + session log flows, 17th client rejected.
    #[test]
    fn full_session_flow() {
        let _g = saves::test_lock();
        let saves_dir = temp_saves_dir("flow");
        let seed = 7777u64;
        let mut s = boot(&saves_dir, seed);
        let port = s.port();
        assert_ne!(port, 0);
        let rt = Runtime::new().unwrap();

        /* --- HELLO -> WELCOME with correct fields --- */
        let mut ws_a = ws_connect(&rt, port);
        ws_send(&rt, &mut ws_a, hello_bytes(TENEBRIS_PROTOCOL_VERSION, "Anna", "", "tok-a"));
        let b = recv_kind(&rt, &mut s, &mut ws_a, MsgKind::Welcome);
        let hdr = proto::read_header(&b).unwrap();
        assert_eq!(hdr.version, MSG_WELCOME_VERSION);
        let w = proto::read_welcome(&b[MSG_HEADER_SIZE..]).unwrap();
        assert_eq!(w.player_id, 1);
        assert_eq!(w.world_seed, seed);
        assert_eq!(w.body_id, BodyId::Tenebris as u32);
        let tb = planet::get(BodyId::Tenebris);
        assert_eq!(w.spawn_x, tb.pos_x + tb.radius_m + 5.0);
        assert_eq!(w.spawn_y, tb.pos_y);
        assert_eq!(w.spawn_z, tb.pos_z);
        assert_eq!(w.spawn_yaw, 0.0);
        assert_eq!(w.spawn_pitch, 0.0);
        /* Join flow: the new arrival's PLAYER_INFO is fanned out to
         * the room, including the arrival itself. */
        let b = recv_kind(&rt, &mut s, &mut ws_a, MsgKind::PlayerInfo);
        let info = proto::read_player_info(&b[MSG_HEADER_SIZE..]).unwrap();
        assert_eq!(info.player_id, 1);
        assert_eq!(cstr_from(&info.name, 32), "Anna");

        /* --- bad protocol version -> KICK(VERSION_MISMATCH) + close --- */
        let mut ws_bad = ws_connect(&rt, port);
        ws_send(&rt, &mut ws_bad, hello_bytes(999, "Mallory", "", "tok-m"));
        let b = recv_kind(&rt, &mut s, &mut ws_bad, MsgKind::Kick);
        let kick = proto::read_kick(&b[MSG_HEADER_SIZE..]).unwrap();
        assert_eq!(kick.reason, KICK_VERSION_MISMATCH);
        let text = cstr_from(&kick.text, MSG_KICK_TEXT_LEN);
        assert!(text.contains("Version mismatch"), "kick text: {}", text);
        assert!(text.is_ascii());
        assert!(pump_recv(&rt, &mut s, &mut ws_bad, 5_000).is_none(), "kicked conn must close");

        /* --- second player joins; PLAYER_INFO flows both ways --- */
        let mut ws_c = ws_connect(&rt, port);
        ws_send(&rt, &mut ws_c, hello_bytes(TENEBRIS_PROTOCOL_VERSION, "Bob", "", "tok-b"));
        recv_kind(&rt, &mut s, &mut ws_c, MsgKind::Welcome);
        /* Existing client hears about Bob... */
        let b = recv_kind(&rt, &mut s, &mut ws_a, MsgKind::PlayerInfo);
        let info = proto::read_player_info(&b[MSG_HEADER_SIZE..]).unwrap();
        assert_eq!(cstr_from(&info.name, 32), "Bob");
        /* ...and Bob hears about Anna (broadcast self + direct peers). */
        let mut saw_anna = false;
        for _ in 0..4 {
            let Some(b) = pump_recv(&rt, &mut s, &mut ws_c, 2_000) else { break };
            let hdr = proto::read_header(&b).unwrap();
            if hdr.kind == MsgKind::PlayerInfo as u16 {
                let info = proto::read_player_info(&b[MSG_HEADER_SIZE..]).unwrap();
                if cstr_from(&info.name, 32) == "Anna" {
                    saw_anna = true;
                    break;
                }
            }
        }
        assert!(saw_anna, "joiner must receive existing peers' PLAYER_INFO");

        /* --- duplicate name (case-insensitive) -> KICK(NAME_TAKEN) --- */
        let mut ws_dup = ws_connect(&rt, port);
        ws_send(&rt, &mut ws_dup, hello_bytes(TENEBRIS_PROTOCOL_VERSION, "anna", "", "tok-d"));
        let b = recv_kind(&rt, &mut s, &mut ws_dup, MsgKind::Kick);
        let kick = proto::read_kick(&b[MSG_HEADER_SIZE..]).unwrap();
        assert_eq!(kick.reason, KICK_NAME_TAKEN);
        assert!(pump_recv(&rt, &mut s, &mut ws_dup, 5_000).is_none());

        drain(&rt, &mut s, &mut ws_a);
        drain(&rt, &mut s, &mut ws_c);

        /* --- PLAYER_CMD: per-edit durability on the same tick --- */
        let tile = 1234u32;
        let depth = 70u16;
        let col_path = format!(
            "{}/rooms/__public__/world-{:x}/body-0/{}.col",
            saves_dir, seed, tile
        );
        assert!(!Path::new(&col_path).exists());
        ws_send(
            &rt,
            &mut ws_a,
            player_cmd_bytes(PLAYER_CMD_PLACE, 0, tile, depth, Block::Stone),
        );
        /* The .col file must appear during the tick that handles the
         * command - tick one step at a time and stop the moment it
         * exists. */
        tick_until(&mut s, |_| Path::new(&col_path).exists(), "per-edit .col write");
        /* The broadcast CHUNK_DIFF was queued in that same tick - it
         * must reach the peer WITHOUT any further server ticks, which
         * proves write-to-disk happened no later than the broadcast
         * (same input frame). */
        let mut got_diff = None;
        while let Some(b) = recv_no_tick(&rt, &mut ws_c, 5_000) {
            let hdr = proto::read_header(&b).unwrap();
            if hdr.kind == MsgKind::ChunkDiff as u16 {
                got_diff = Some(b);
                break;
            }
        }
        let b = got_diff.expect("peer CHUNK_DIFF in the same frame as the disk write");
        let diff = proto::read_chunk_diff(&b[MSG_HEADER_SIZE..]).unwrap();
        assert_eq!(diff.body_id, 0);
        assert_eq!(diff.edit_count, 1);
        assert_eq!(diff.edits[0].tile_idx, tile);
        assert_eq!(diff.edits[0].depth, depth);
        assert_eq!(diff.edits[0].block_type, Block::Stone.raw() as u16);
        /* On-disk column: 16-byte TCOL header + 128 raw bytes. */
        let col = std::fs::read(&col_path).unwrap();
        assert_eq!(col.len(), saves::TILE_HEADER_SIZE + DEPTH);
        assert_eq!(col[saves::TILE_HEADER_SIZE + depth as usize], Block::Stone.raw());
        /* Sender receives the (idempotent) diff too. */
        let b = recv_kind(&rt, &mut s, &mut ws_a, MsgKind::ChunkDiff);
        let diff = proto::read_chunk_diff(&b[MSG_HEADER_SIZE..]).unwrap();
        assert_eq!(diff.edits[0].tile_idx, tile);

        /* --- chat round-trip + persistence --- */
        ws_send(&rt, &mut ws_a, chat_bytes("hello tenebris"));
        let b = recv_kind(&rt, &mut s, &mut ws_c, MsgKind::Chat);
        let m = proto::read_chat(&b[MSG_HEADER_SIZE..]).unwrap();
        assert_eq!(m.player_id, 1); /* stamped with Anna's id */
        assert_eq!(cstr_from(&m.text, MSG_CHAT_TEXT_LEN), "hello tenebris");
        let chat_log = std::fs::read_to_string(format!("{}/chat.log", saves_dir)).unwrap();
        assert!(
            chat_log.contains("\tAnna\t__public__\thello tenebris"),
            "chat.log: {}",
            chat_log
        );

        /* --- session log: login entries --- */
        let sessions = std::fs::read_to_string(format!("{}/sessions.log", saves_dir)).unwrap();
        assert!(sessions.contains("\tlogin\tAnna\t__public__"));
        assert!(sessions.contains("\tlogin\tBob\t__public__"));

        /* --- 17th client rejected --- */
        tick_until(&mut s, |s| used_slots(s) == 2, "kicked conns freed");
        let mut extras: Vec<Ws> = Vec::new();
        for _ in 0..14 {
            extras.push(ws_connect(&rt, port));
        }
        tick_until(&mut s, |s| used_slots(s) == SERVER_MAX_CLIENTS, "16 slots filled");
        let mut ws_17 = ws_connect(&rt, port);
        /* on_open finds no free slot and closes the conn. */
        assert!(
            pump_recv(&rt, &mut s, &mut ws_17, 10_000).is_none(),
            "17th client must be closed"
        );
        assert_eq!(used_slots(&s), SERVER_MAX_CLIENTS);

        /* --- leave flow: logout session entry --- */
        rt.block_on(async {
            let _ = ws_c.close(None).await;
        });
        tick_until(&mut s, |s| used_slots(s) == SERVER_MAX_CLIENTS - 1, "Bob slot freed");
        let sessions = std::fs::read_to_string(format!("{}/sessions.log", saves_dir)).unwrap();
        assert!(sessions.contains("\tlogout\tBob\t__public__"), "sessions: {}", sessions);

        s.shutdown();
        let _ = std::fs::remove_dir_all(&saves_dir);
    }

    /// Restart on the same saves dir: block edits + chat backlog +
    /// player pose survive; /saves/body + /status HTTP endpoints work.
    #[test]
    fn restart_restores_world() {
        let _g = saves::test_lock();
        let saves_dir = temp_saves_dir("restart");
        let seed = 42u64;
        let rt = Runtime::new().unwrap();

        let tile = 500u32;
        let depth = 65u16;
        let tb = planet::get(BodyId::Tenebris);
        let pose_pos = (tb.pos_x + tb.radius_m + 10.0, 1.5, -2.5);

        {
            let mut s = boot(&saves_dir, seed);
            let port = s.port();
            let mut ws_a = ws_connect(&rt, port);
            ws_send(&rt, &mut ws_a, hello_bytes(TENEBRIS_PROTOCOL_VERSION, "Anna", "", "tok-a"));
            recv_kind(&rt, &mut s, &mut ws_a, MsgKind::Welcome);

            ws_send(
                &rt,
                &mut ws_a,
                player_cmd_bytes(PLAYER_CMD_PLACE, 0, tile, depth, Block::Stone),
            );
            let col_path = format!(
                "{}/rooms/__public__/world-{:x}/body-0/{}.col",
                saves_dir, seed, tile
            );
            tick_until(&mut s, |_| Path::new(&col_path).exists(), "edit persisted");

            ws_send(&rt, &mut ws_a, chat_bytes("persist me"));
            recv_kind(&rt, &mut s, &mut ws_a, MsgKind::Chat); /* room echo */

            /* Report a grounded pose so on_close persists it. */
            ws_send(&rt, &mut ws_a, player_state_bytes(1, 0, pose_pos, true));
            tick_until(&mut s, |s| s.clients[0].has_state, "PLAYER_STATE applied");

            rt.block_on(async {
                let _ = ws_a.close(None).await;
            });
            tick_until(&mut s, |s| used_slots(s) == 0, "client closed");
            s.shutdown();
        }

        /* --- second boot on the same dir --- */
        let mut s = boot(&saves_dir, seed);
        let port = s.port();

        /* New player: chat backlog replays + the room loads the
         * persisted world clone at creation. */
        let mut ws_e = ws_connect(&rt, port);
        ws_send(&rt, &mut ws_e, hello_bytes(TENEBRIS_PROTOCOL_VERSION, "Eve", "", "tok-e"));
        recv_kind(&rt, &mut s, &mut ws_e, MsgKind::Welcome);
        let b = recv_kind(&rt, &mut s, &mut ws_e, MsgKind::Chat);
        let m = proto::read_chat(&b[MSG_HEADER_SIZE..]).unwrap();
        assert_eq!(m.player_id, 0); /* backlog rows use player_id 0 */
        assert_eq!(cstr_from(&m.text, MSG_CHAT_TEXT_LEN), "persist me");

        /* In-memory world state restored from the .col files. */
        let room = s
            .rooms
            .iter()
            .find(|r| r.in_use && r.code.is_empty())
            .expect("public room allocated");
        let w0 = room
            .worlds
            .iter()
            .find(|w| w.body.id as u32 == 0)
            .expect("body 0 cloned from on-disk edits");
        assert_eq!(w0.get(tile as i32, depth as i32), Block::Stone);

        /* Returning player resumes at the persisted pose. */
        let mut ws_a2 = ws_connect(&rt, port);
        ws_send(&rt, &mut ws_a2, hello_bytes(TENEBRIS_PROTOCOL_VERSION, "Anna", "", "tok-a"));
        let b = recv_kind(&rt, &mut s, &mut ws_a2, MsgKind::Welcome);
        let w = proto::read_welcome(&b[MSG_HEADER_SIZE..]).unwrap();
        assert_eq!(w.spawn_x, pose_pos.0);
        assert_eq!(w.spawn_y, pose_pos.1);
        assert_eq!(w.spawn_z, pose_pos.2);
        assert_eq!(w.body_id, 0);

        /* --- HTTP endpoints --- */
        let resp = http_get_ticking(&mut s, "/health");
        let text = String::from_utf8_lossy(&resp).into_owned();
        assert!(text.starts_with("HTTP/1.1 200 OK"));
        assert!(text.contains("tenebris-server alive"));

        let resp = http_get_ticking(&mut s, "/status");
        let text = String::from_utf8_lossy(&resp).into_owned();
        assert!(text.contains("\"player_count\":2"), "status: {}", text);
        assert!(text.contains("\"name\":\"Eve\""));

        let resp = http_get_ticking(&mut s, &format!("/saves/body?body=0&seed={}", seed));
        let text = String::from_utf8_lossy(&resp).into_owned();
        assert!(text.contains("application/octet-stream"), "{}", text);
        let body = http_body(&resp);
        assert!(body.len() >= saves::BODY_BLOB_HEADER);
        let magic = u32::from_le_bytes(body[0..4].try_into().unwrap());
        assert_eq!(magic, saves::BODY_BLOB_MAGIC);
        let tile_count = u32::from_le_bytes(body[20..24].try_into().unwrap());
        assert!(tile_count >= 1, "blob must carry the persisted tile");

        let resp = http_get_ticking(&mut s, "/logins?n=10");
        let text = String::from_utf8_lossy(&resp).into_owned();
        assert!(text.contains("\"event\":\"login\""), "logins: {}", text);
        assert!(text.contains("\"name\":\"Anna\""));

        let resp = http_get_ticking(&mut s, "/nope");
        let text = String::from_utf8_lossy(&resp).into_owned();
        assert!(text.starts_with("HTTP/1.1 404"), "{}", text);

        s.shutdown();
        let _ = std::fs::remove_dir_all(&saves_dir);
    }

    /* -------------------------------------------------------------- */
    /* MP-parity end-to-end: sim clock, bag replay, server machines,   */
    /* crops, animals - all through the real transport.                */
    /* -------------------------------------------------------------- */

    fn bag_state_bytes(hunger: f32, item0: u16, count0: u16) -> Vec<u8> {
        let mut m = MsgBagState::default();
        m.hunger = hunger;
        m.items[0] = item0;
        m.counts[0] = count0;
        let mut buf = vec![0u8; MSG_HEADER_SIZE + MSG_BAG_STATE_WIRE_SIZE];
        let n = proto::write_bag_state(&mut buf, &m);
        assert_eq!(n, buf.len());
        buf
    }

    fn bentity_bytes(body_id: u32, rec: &str) -> Vec<u8> {
        let m = MsgBentityDiff { body_id, records: vec![rec.to_string()] };
        let cap = MSG_HEADER_SIZE + MSG_BENTITY_DIFF_HEADER + 4 + rec.len();
        let mut buf = vec![0u8; cap];
        let n = proto::write_bentity_diff(&mut buf, &m);
        assert_eq!(n, cap);
        buf
    }

    fn crop_bytes(body_id: u32, op: u8, tile: i32, pos: [f32; 3], growth: f32) -> Vec<u8> {
        let mut m = MsgCropDiff::default();
        m.body_id = body_id;
        m.entry_count = 1;
        m.entries[0] = MsgCropEntry {
            op,
            kind: 1, /* wheat - proves the kind byte survives the trip */
            tile_idx: tile as u32,
            pos_x: pos[0],
            pos_y: pos[1],
            pos_z: pos[2],
            up_x: 1.0,
            up_y: 0.0,
            up_z: 0.0,
            growth,
        };
        let mut buf =
            vec![0u8; MSG_HEADER_SIZE + MSG_CROP_DIFF_HEADER + MSG_CROP_ENTRY_SIZE];
        let n = proto::write_crop_diff(&mut buf, &m);
        assert_eq!(n, buf.len());
        buf
    }

    fn animal_hit_bytes(body_id: u32, animal_id: u32, dmg: f32) -> Vec<u8> {
        let m = MsgAnimalHit { body_id, animal_id, dmg };
        let mut buf = vec![0u8; MSG_HEADER_SIZE + MSG_ANIMAL_HIT_WIRE_SIZE];
        let n = proto::write_animal_hit(&mut buf, &m);
        assert_eq!(n, buf.len());
        buf
    }

    #[test]
    fn mp_parity_full_flow() {
        let _g = saves::test_lock();
        let saves_dir = temp_saves_dir("parity");
        let rt = Runtime::new().unwrap();
        let mut s = boot(&saves_dir, 7);
        let port = s.port();

        /* ---- Join: the sim clock arrives right after WELCOME. ---- */
        let mut ws_a = ws_connect(&rt, port);
        ws_send(&rt, &mut ws_a, hello_bytes(TENEBRIS_PROTOCOL_VERSION, "alice", "", "tokA00000000000000000000000000"));
        let wb = recv_kind(&rt, &mut s, &mut ws_a, MsgKind::Welcome);
        let welcome = proto::read_welcome(&wb[MSG_HEADER_SIZE..]).unwrap();
        let tb = recv_kind(&rt, &mut s, &mut ws_a, MsgKind::SimTime);
        let t0 = proto::read_sim_time(&tb[MSG_HEADER_SIZE..]).unwrap();
        assert!(t0.sim_seconds > 0.0, "sim clock runs");
        assert!(t0.day_length_s > 0.0, "day length travels");

        /* ---- Bag upload -> rejoin replay. ---- */
        ws_send(&rt, &mut ws_a, bag_state_bytes(55.5, 123 /* raw meat */, 4));
        tick_until(&mut s, |s| s.clients.iter().any(|c| c.bag_known), "bag stored");
        rt.block_on(ws_a.close(None)).ok();
        tick_until(&mut s, |s| used_slots(s) == 0, "disconnect seen");
        let mut ws_a = ws_connect(&rt, port);
        ws_send(&rt, &mut ws_a, hello_bytes(TENEBRIS_PROTOCOL_VERSION, "alice", "", "tokA00000000000000000000000000"));
        let wb = recv_kind(&rt, &mut s, &mut ws_a, MsgKind::Welcome);
        let welcome = proto::read_welcome(&wb[MSG_HEADER_SIZE..]).unwrap();
        let bb = recv_kind(&rt, &mut s, &mut ws_a, MsgKind::BagState);
        let bag = proto::read_bag_state(&bb[MSG_HEADER_SIZE..]).unwrap();
        assert!((bag.hunger - 55.5).abs() < 0.01, "hunger replayed");
        assert_eq!(bag.items[0], 123, "bag item replayed");
        assert_eq!(bag.counts[0], 4, "bag count replayed");

        /* ---- Machines: write a stocked furnace; the SERVER smelts it
         * and broadcasts progress (fuel lit, then an ingot out). ---- */
        ws_send(&rt, &mut ws_a, bentity_bytes(0, "41:64:2:f:105,3,102,2,0,0,0"));
        let deadline = Instant::now() + Duration::from_millis(TEST_TIMEOUT_MS);
        let mut lit = false;
        let mut smelted = false;
        while !smelted {
            assert!(Instant::now() < deadline, "furnace never smelted");
            let b = recv_kind(&rt, &mut s, &mut ws_a, MsgKind::BentityDiff);
            let m = proto::read_bentity_diff(&b[MSG_HEADER_SIZE..]).unwrap();
            for rec in &m.records {
                if rec.contains(":f:") && rec.contains("102,1") {
                    lit = true; /* one coal consumed into the burn */
                }
                if rec.contains("108,1") {
                    smelted = true; /* one copper ingot in the output */
                }
            }
        }
        assert!(lit, "fuel lit on the server");

        /* ---- Crops: plant, then verify a fresh join gets the replay
         * (server-persisted, growth server-derived). ---- */
        ws_send(&rt, &mut ws_a, crop_bytes(0, CROP_OP_PLANT, 41, [304.0, 0.0, 0.0], 0.25));
        /* Echo comes back to the sender. */
        let cb = recv_kind(&rt, &mut s, &mut ws_a, MsgKind::CropDiff);
        let cm = proto::read_crop_diff(&cb[MSG_HEADER_SIZE..]).unwrap();
        assert_eq!(cm.entry_count, 1);
        assert_eq!(cm.entries[0].op, CROP_OP_PLANT);

        let mut ws_b = ws_connect(&rt, port);
        ws_send(&rt, &mut ws_b, hello_bytes(TENEBRIS_PROTOCOL_VERSION, "bob", "", "tokB00000000000000000000000000"));
        recv_kind(&rt, &mut s, &mut ws_b, MsgKind::Welcome);
        /* Join replays: machines + crops both arrive. */
        let rb = recv_kind(&rt, &mut s, &mut ws_b, MsgKind::BentityDiff);
        let rm = proto::read_bentity_diff(&rb[MSG_HEADER_SIZE..]).unwrap();
        assert!(rm.records.iter().any(|r| r.starts_with("41:64:")), "machine replay");
        let rb = recv_kind(&rt, &mut s, &mut ws_b, MsgKind::CropDiff);
        let rm = proto::read_crop_diff(&rb[MSG_HEADER_SIZE..]).unwrap();
        assert_eq!(rm.entries[0].tile_idx, 41, "crop replay");
        assert!(rm.entries[0].growth >= 0.25, "growth only moves forward");

        /* ---- Burying a crop: a PLACE into its cell removes it and
         * broadcasts the removal. Crop feet at r=304 sit in the depth-68
         * cell (r = body_r - (SEA_LEVEL - d) => d = 68). ---- */
        ws_send(
            &rt,
            &mut ws_a,
            player_cmd_bytes(PLAYER_CMD_PLACE, 0, 41, 68, Block::Stone),
        );
        let deadline = Instant::now() + Duration::from_millis(TEST_TIMEOUT_MS);
        loop {
            assert!(Instant::now() < deadline, "crop bury removal never arrived");
            let b = recv_kind(&rt, &mut s, &mut ws_a, MsgKind::CropDiff);
            let m = proto::read_crop_diff(&b[MSG_HEADER_SIZE..]).unwrap();
            if (0..m.entry_count as usize).any(|i| m.entries[i].op == CROP_OP_REMOVE) {
                break;
            }
        }

        /* ---- Animals: a grounded pose makes the server spawn a herd
         * near it; three swings kill one and credit the meat. ---- */
        let spawn = (welcome.spawn_x, welcome.spawn_y, welcome.spawn_z);
        ws_send(&rt, &mut ws_a, player_state_bytes(1, 0, spawn, true));
        let my_id = welcome.player_id;
        let deadline = Instant::now() + Duration::from_millis(TEST_TIMEOUT_MS);
        let target = loop {
            assert!(Instant::now() < deadline, "no animals spawned");
            /* Keep the pose fresh so the anchor stays valid. */
            ws_send(&rt, &mut ws_a, player_state_bytes(2, 0, spawn, true));
            let b = recv_kind(&rt, &mut s, &mut ws_a, MsgKind::AnimalState);
            let m = proto::read_animal_state(&b[MSG_HEADER_SIZE..]).unwrap();
            if m.entry_count > 0 {
                break m.entries[0].id;
            }
        };
        for _ in 0..3 {
            ws_send(&rt, &mut ws_a, animal_hit_bytes(0, target, 5.0));
            s.tick();
        }
        let deadline = Instant::now() + Duration::from_millis(TEST_TIMEOUT_MS);
        loop {
            assert!(Instant::now() < deadline, "kill credit never arrived");
            let b = recv_kind(&rt, &mut s, &mut ws_a, MsgKind::AnimalState);
            let m = proto::read_animal_state(&b[MSG_HEADER_SIZE..]).unwrap();
            if m.killed_by == my_id {
                assert!(m.meat_award >= 2, "meat award");
                assert!(
                    !(0..m.entry_count as usize).any(|i| m.entries[i].id == target),
                    "dead animal left the herd"
                );
                break;
            }
        }

        /* ---- Sim clock persists across a restart, moving forward. ---- */
        let t_before = s.sim_time_s;
        s.shutdown();
        drop(ws_a);
        drop(ws_b);
        let s2 = boot(&saves_dir, 7);
        assert!(
            /* world_time.txt stores %.3f - allow that rounding. */
            s2.sim_time_s >= t_before - 0.01,
            "clock resumed >= shutdown time ({} vs {})",
            s2.sim_time_s,
            t_before
        );

        let _ = std::fs::remove_dir_all(&saves_dir);
    }
}
