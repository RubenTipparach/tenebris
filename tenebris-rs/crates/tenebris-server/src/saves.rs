//! Port of `tenebris-c/src/server/saves.{c,h}` - disk-backed
//! persistence for the server.
//!
//! Save-format byte compatibility is the entire point of this module:
//! a Rust server must read existing saves on the Fly volume
//! (`/data/saves/...`) written by the C server, and write saves the C
//! server can read back. Directory layout, file names, header
//! magic/versions, field order/widths (all little-endian), the
//! 128-byte tile column, torch / water / origins / player persistence,
//! the atomic `.tmp`-swap + fsync behaviour, partial-read tolerance
//! and version up/down-grade handling are all replicated exactly.
//! Every write is per-edit durable (no batching, no deferral) - see
//! the CLAUDE.md "all world edits must persist immediately" rule.
//!
//! Renames (C -> Rust; the `saves_` prefix is dropped throughout):
//!   - `saves_load_player(room, name, out) -> bool` becomes
//!     `load_player(room, name) -> Option<PlayerPose>`.
//!   - `saves_chat_load_backlog(room, out, cap) -> int` becomes
//!     `chat_load_backlog(room, cap) -> Vec<ChatMsg>`.
//!   - `saves_torches_write` takes a slice instead of ptr + count.
//!   - `saves_enumerate_tiles` takes a closure instead of fn + void*.
//!   - NULL room pointers don't exist; `""` means the public room
//!     (stored on disk as `__public__`), same as the C empty string.
//!
//! The saves root is handed to `init()` by the server boot path; the
//! C default is `./saves` (overridden by the `--saves DIR` argument
//! parsed in server_main.c), `/data/saves` on the Fly mount.

#![allow(dead_code)]

use std::fs;
use std::io::Write as _;
use std::path::Path;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

use tenebris_core::world::{World, WORLD_MAX_DEPTH};
use tenebris_core::world_water::{self, OriginDiffEntry, OriginRef, WATER_ORIGIN_MAX};

const DEPTH: usize = WORLD_MAX_DEPTH as usize;

/* v1: pose only. v2: pose + 9-slot hotbar (inv_*). The loader still
 * accepts v1 records and zero-fills the inventory so existing saves
 * keep working - new saves are always v2. */
pub const PLAYER_VERSION: u32 = 2;
pub const PLAYER_INVENTORY_SLOTS: usize = 9;

/* On-disk format version for tile column .col files. v0 was the
 * headerless 128-raw-bytes layout; the loader still accepts those by
 * fall-back (file size == 128 -> treat as v0). v1 prepends a 16-byte
 * header. */
pub const TILE_VERSION: u32 = 1;
pub const TILE_MAGIC: u32 = 0x4C4F4354; /* 'TCOL' little-endian */
pub const TILE_HEADER_SIZE: usize = 16;

pub const WATER_VERSION: u32 = 1;
pub const WATER_MAGIC: u32 = 0x54415754; /* 'TWAT' little-endian */
pub const WATER_HEADER_SIZE: usize = 16;

pub const ORIGINS_VERSION: u32 = 1;
pub const ORIGINS_MAGIC: u32 = 0x4752494F; /* 'OIRG' little-endian */
pub const ORIGINS_HEADER_SIZE: usize = 16;
pub const ORIGINS_ENTRY_SIZE: usize = 28;

pub const TORCHES_MAGIC: u32 = 0x43525454; /* 'TTRC' little-endian */
pub const TORCHES_VERSION: u32 = 1;
pub const TORCHES_HEADER_SIZE: usize = 16;
pub const TORCHES_ENTRY_SIZE: usize = 28; /* i32 + 6*f32 */
pub const TORCHES_MAX_COUNT: usize = 256;

pub const CHAT_NAME_MAX: usize = 31;
pub const CHAT_TEXT_MAX: usize = 127;
pub const CHAT_BACKLOG: usize = 50;
pub const CHAT_FILE_MAX: usize = 200;

pub const AUDIT_FILE_MAX: usize = 5000;

pub const BODY_BLOB_MAGIC: u32 = 0x444F4254; /* 'TBOD' little-endian */
pub const BODY_BLOB_VERSION: u32 = 1;
/* 4 magic + 4 version + 4 body_id + 8 seed + 4 tile_count + 4 depth */
pub const BODY_BLOB_HEADER: usize = 28;

const MANIFEST_MAGIC: u32 = 0x56415354; /* 'TSAV' */

/// Port of `saves_player_pose_t`. The C struct has no padding (the
/// fields are laid out 4+4+8*3+4+4+18+18+1+3 = 80 bytes, 8-aligned)
/// and is written raw; the Rust side serializes field-by-field LE
/// into the identical 80-byte layout.
pub const PLAYER_POSE_SIZE: usize = 80;
/// Minimum readable record: u32*2 + f64*3 + f32*2 (the v1 layout).
const PLAYER_POSE_MIN: usize = 40;

#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub struct PlayerPose {
    pub version: u32,
    pub body_id: u32,
    pub pos_x: f64,
    pub pos_y: f64,
    pub pos_z: f64,
    pub yaw: f32,
    pub pitch: f32,
    /* v2+: per-player hotbar snapshot. */
    pub inv_slot_type: [u16; PLAYER_INVENTORY_SLOTS],
    pub inv_slot_count: [i16; PLAYER_INVENTORY_SLOTS],
    pub inv_selected: u8,
    pub inv_reserved: [u8; 3],
}

/// Port of `saves_torch_t`.
#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub struct Torch {
    pub tile_idx: i32,
    pub pos: [f32; 3],
    pub up: [f32; 3],
}

/// Port of `saves_chat_msg_t`. The C struct holds raw char arrays;
/// non-UTF-8 bytes (possible only via byte-truncated multi-byte
/// chars) are replaced lossily on load.
#[derive(Clone, Debug, Default, PartialEq)]
pub struct ChatMsg {
    pub name: String,
    pub text: String,
}

/* ----------------------------------------------------------------- */
/* Module state (C: `static const char* G_saves_dir`).                */

static G_SAVES_DIR: Mutex<Option<String>> = Mutex::new(None);

fn saves_dir() -> Option<String> {
    G_SAVES_DIR
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .clone()
}

fn set_saves_dir(v: Option<String>) {
    *G_SAVES_DIR.lock().unwrap_or_else(|e| e.into_inner()) = v;
}

fn unix_now() -> i64 {
    match SystemTime::now().duration_since(UNIX_EPOCH) {
        Ok(d) => d.as_secs() as i64,
        Err(_) => 0,
    }
}

fn mtime_unix(md: &fs::Metadata) -> u64 {
    md.modified()
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

/* ----------------------------------------------------------------- */
/* Little-endian field helpers. No #[repr(C)] transmutes - explicit   */
/* byte order per PORTING.md.                                         */

fn rd_u32(b: &[u8], off: usize) -> u32 {
    u32::from_le_bytes([b[off], b[off + 1], b[off + 2], b[off + 3]])
}
fn rd_u64(b: &[u8], off: usize) -> u64 {
    let mut a = [0u8; 8];
    a.copy_from_slice(&b[off..off + 8]);
    u64::from_le_bytes(a)
}
fn wr_u32(b: &mut [u8], off: usize, v: u32) {
    b[off..off + 4].copy_from_slice(&v.to_le_bytes());
}
fn wr_u64(b: &mut [u8], off: usize, v: u64) {
    b[off..off + 8].copy_from_slice(&v.to_le_bytes());
}

/* ----------------------------------------------------------------- */
/* C string-parsing semantics. The C loaders lean on atoi/strtol      */
/* quirks (leading whitespace / sign accepted, parse stops at the     */
/* first non-digit), and the lenient-vs-strict split between the .col */
/* and .water/.orig name parsers is load-bearing for which files get  */
/* picked up. Replicate rather than "fix".                            */

/// strtol(name, &endp, 10): returns (value, bytes consumed). consumed
/// is 0 when no digits were parsed (C: endp == name).
fn c_strtol(s: &[u8]) -> (i64, usize) {
    let mut i = 0usize;
    while i < s.len() && matches!(s[i], b' ' | b'\t' | b'\n' | 0x0b | 0x0c | b'\r') {
        i += 1;
    }
    let mut neg = false;
    if i < s.len() && (s[i] == b'+' || s[i] == b'-') {
        neg = s[i] == b'-';
        i += 1;
    }
    let digits_start = i;
    let mut v: i64 = 0;
    while i < s.len() && s[i].is_ascii_digit() {
        v = v.saturating_mul(10).saturating_add((s[i] - b'0') as i64);
        i += 1;
    }
    if i == digits_start {
        return (0, 0);
    }
    (if neg { -v } else { v }, i)
}

/// atoi(name): lenient leading-int parse, 0 on no digits.
fn c_atoi(s: &[u8]) -> i32 {
    let (v, _) = c_strtol(s);
    v.clamp(i32::MIN as i64, i32::MAX as i64) as i32
}

/// strtoull(name, &endp, 16): (value, bytes consumed). Accepts
/// leading whitespace, an optional sign (wrapping-negated, as C
/// defines for unsigned conversions) and an optional 0x prefix.
fn c_strtoull_hex(s: &[u8]) -> (u64, usize) {
    let mut i = 0usize;
    while i < s.len() && matches!(s[i], b' ' | b'\t' | b'\n' | 0x0b | 0x0c | b'\r') {
        i += 1;
    }
    let mut neg = false;
    if i < s.len() && (s[i] == b'+' || s[i] == b'-') {
        neg = s[i] == b'-';
        i += 1;
    }
    let mut digits_start = i;
    if i + 1 < s.len()
        && s[i] == b'0'
        && (s[i + 1] == b'x' || s[i + 1] == b'X')
        && i + 2 < s.len()
        && s[i + 2].is_ascii_hexdigit()
    {
        i += 2;
        digits_start = i;
    }
    let mut v: u64 = 0;
    while i < s.len() && s[i].is_ascii_hexdigit() {
        let d = match s[i] {
            b'0'..=b'9' => s[i] - b'0',
            b'a'..=b'f' => s[i] - b'a' + 10,
            _ => s[i] - b'A' + 10,
        };
        v = v.wrapping_mul(16).wrapping_add(d as u64);
        i += 1;
    }
    if i == digits_start {
        /* "0x" with no digit: strtoull consumes the leading "0". */
        return (0, 0);
    }
    (if neg { v.wrapping_neg() } else { v }, i)
}

/// strtoul(name, &endp, 10) for the body-<id> parse.
fn c_strtoul_dec(s: &[u8]) -> (u64, usize) {
    let mut i = 0usize;
    while i < s.len() && matches!(s[i], b' ' | b'\t' | b'\n' | 0x0b | 0x0c | b'\r') {
        i += 1;
    }
    let mut neg = false;
    if i < s.len() && (s[i] == b'+' || s[i] == b'-') {
        neg = s[i] == b'-';
        i += 1;
    }
    let digits_start = i;
    let mut v: u64 = 0;
    while i < s.len() && s[i].is_ascii_digit() {
        v = v.wrapping_mul(10).wrapping_add((s[i] - b'0') as u64);
        i += 1;
    }
    if i == digits_start {
        return (0, 0);
    }
    (if neg { v.wrapping_neg() } else { v }, i)
}

/// strtoll(line, NULL, 10) for log timestamps.
fn c_strtoll(s: &[u8]) -> i64 {
    c_strtol(s).0
}

/* ----------------------------------------------------------------- */
/* mkdir -p helper. C walks the '/'-separated prefixes calling        */
/* mkdir(0755), tolerating EEXIST. The extra `is_dir()` short-circuit */
/* is behaviour-preserving on POSIX (mkdir of an existing dir is      */
/* EEXIST -> continue) and sidesteps Windows' EACCES on               */
/* mkdir("C:") during native testing.                                 */
fn mkdir_p(path: &str) -> bool {
    let bytes = path.as_bytes();
    let len = bytes.len();
    if len == 0 {
        return false;
    }
    for i in 1..=len {
        if i == len || bytes[i] == b'/' {
            let prefix = &path[..i];
            if Path::new(prefix).is_dir() {
                continue;
            }
            if let Err(e) = fs::create_dir(prefix) {
                if e.kind() != std::io::ErrorKind::AlreadyExists {
                    eprintln!("[saves] mkdir({}) failed: {}", prefix, e);
                    return false;
                }
            }
        }
    }
    true
}

/* Atomic write: tmp file -> fsync -> rename -> fsync(parent dir).
 *
 * Without the fsyncs the data sits in page cache after close+rename.
 * Fly's auto_stop_machines='stop' policy stops idle machines, and even
 * a graceful SIGTERM doesn't guarantee dirty pages flush before the
 * VM disappears. fsync(file) makes the bytes durable before the
 * rename, fsync(parent dir) makes the rename itself durable. Per-edit
 * fsync is fine performance-wise: blocks are placed at human speed. */
fn write_atomic(path: &str, data: &[u8]) -> bool {
    let tmp = format!("{}.tmp", path);
    let mut f = match fs::File::create(&tmp) {
        Ok(f) => f,
        Err(e) => {
            eprintln!("[saves] fopen {}: {}", tmp, e);
            return false;
        }
    };
    if let Err(e) = f.write_all(data) {
        eprintln!("[saves] short write {}: {}", tmp, e);
        drop(f);
        let _ = fs::remove_file(&tmp);
        return false;
    }
    /* Push the bytes to disk before we rename them into the public
     * name (covers C's fflush + fsync). */
    if let Err(e) = f.sync_all() {
        eprintln!("[saves] fsync {}: {}", tmp, e);
        drop(f);
        let _ = fs::remove_file(&tmp);
        return false;
    }
    drop(f);
    if let Err(e) = fs::rename(&tmp, path) {
        eprintln!("[saves] rename {} -> {}: {}", tmp, path, e);
        let _ = fs::remove_file(&tmp);
        return false;
    }
    /* fsync the parent directory so the rename persists. Best-effort:
     * failure means the bytes are durable but the directory entry
     * might not be - log and keep going. (On Windows a directory
     * can't be opened this way; the same log-and-continue applies.) */
    if let Some(slash) = path.rfind('/') {
        let parent = &path[..slash];
        match fs::File::open(parent) {
            Ok(d) => {
                if let Err(e) = d.sync_all() {
                    eprintln!("[saves] fsync dir {}: {}", parent, e);
                }
            }
            Err(e) => {
                eprintln!("[saves] open dir {} for fsync: {}", parent, e);
            }
        }
    }
    true
}

/* ----------------------------------------------------------------- */
/* Manifest: a single 32-byte file at the saves root that captures
 * the on-disk format version of the whole save tree. Layout:
 *   u32 magic ('TSAV'), u32 format_version, u64 first_seen_at,
 *   u8 reserved[16]. */

fn load_or_write_manifest(dir: &str) {
    let path = format!("{}/manifest.dat", dir);
    match fs::read(&path) {
        Ok(data) => {
            if data.len() >= 32 && rd_u32(&data, 0) == MANIFEST_MAGIC {
                let fv = rd_u32(&data, 4);
                let first = rd_u64(&data, 8);
                if fv != TILE_VERSION {
                    eprintln!(
                        "[saves] manifest format_version={}, expected {} - \
                         on-disk saves predate this build. Legacy tiles \
                         will be migrated lazily on first write.",
                        fv, TILE_VERSION
                    );
                } else {
                    println!(
                        "[saves] manifest ok: format_version={} first_seen={}",
                        fv, first
                    );
                }
                return;
            }
            /* Corrupt or wrong magic - fall through to rewrite. */
            eprintln!("[saves] manifest unreadable, rewriting");
        }
        Err(_) => { /* missing - silently create */ }
    }
    let mut m = [0u8; 32];
    wr_u32(&mut m, 0, MANIFEST_MAGIC);
    wr_u32(&mut m, 4, TILE_VERSION);
    let t = unix_now();
    if t > 0 {
        wr_u64(&mut m, 8, t as u64);
    }
    write_atomic(&path, &m);
    println!("[saves] manifest created: format_version={}", TILE_VERSION);
}

/* ----------------------------------------------------------------- */
/* One-shot chat migration: fold historic per-room chat files into the
 * global chat.log. Idempotent via the .chat_migrated marker; entries
 * already present in chat.log (matched by name|room|text tuple) are
 * skipped. Per-room files store `name\ttext` lines with no
 * timestamps; we approximate using each file's mtime. */

fn key_present_in(haystack: &[u8], room: &[u8], name: &[u8], text: &[u8]) -> bool {
    /* C builds the needle with snprintf into a 198-byte buffer and
     * bails on truncation. */
    let mut needle = Vec::with_capacity(4 + room.len() + name.len() + text.len());
    needle.push(b'\t');
    needle.extend_from_slice(name);
    needle.push(b'\t');
    needle.extend_from_slice(room);
    needle.push(b'\t');
    needle.extend_from_slice(text);
    needle.push(b'\n');
    if needle.len() >= CHAT_NAME_MAX + 32 + CHAT_TEXT_MAX + 8 {
        return false;
    }
    if haystack.len() < needle.len() {
        return false;
    }
    haystack
        .windows(needle.len())
        .any(|w| w == needle.as_slice())
}

/// Iterate `buf` like the C `memchr('\n')` loops: yields each line
/// without its terminator; a trailing line without '\n' is included,
/// a trailing '\n' does not produce an empty final line.
fn c_lines(buf: &[u8]) -> impl Iterator<Item = &[u8]> {
    let mut pos = 0usize;
    std::iter::from_fn(move || {
        if pos >= buf.len() {
            return None;
        }
        let rest = &buf[pos..];
        match rest.iter().position(|&b| b == b'\n') {
            Some(nl) => {
                pos += nl + 1;
                Some(&rest[..nl])
            }
            None => {
                pos = buf.len();
                Some(rest)
            }
        }
    })
}

fn migrate_chat_per_room_to_global(dir: &str) {
    let marker = format!("{}/.chat_migrated", dir);
    if Path::new(&marker).exists() {
        return;
    }

    let chat_dir = format!("{}/chat", dir);
    let rd = match fs::read_dir(&chat_dir) {
        Ok(rd) => rd,
        Err(_) => {
            /* No per-room files - nothing to migrate. Still drop the
             * marker so we don't re-stat every boot. */
            let _ = fs::write(&marker, "ok\n");
            return;
        }
    };

    let global_path = match audit_path(dir, "chat") {
        Some(p) => p,
        None => return,
    };
    /* Pre-read chat.log into memory for dedup (C caps at 8 MiB). */
    let existing: Vec<u8> = match fs::read(&global_path) {
        Ok(d) if !d.is_empty() && d.len() < 8 * 1024 * 1024 => d,
        _ => Vec::new(),
    };

    let mut appended = 0i32;
    let mut scanned = 0i32;
    for ent in rd.flatten() {
        let fname = ent.file_name().to_string_lossy().into_owned();
        if fname.starts_with('.') {
            continue;
        }
        let dot = match fname.rfind('.') {
            Some(d) if &fname[d..] == ".log" => d,
            _ => continue,
        };
        /* Filename "<room>.log" -> on-disk room slug (C caps at 15). */
        let rlen = dot.min(15);
        let room = fname.as_bytes()[..rlen].to_vec();

        let path = format!("{}/{}", chat_dir, fname);
        let mut ts_base = unix_now() as u64;
        if let Ok(md) = fs::metadata(&path) {
            ts_base = mtime_unix(&md);
        }
        let buf = match fs::read(&path) {
            Ok(b) if !b.is_empty() && b.len() <= 1024 * 1024 => b,
            _ => continue,
        };

        /* Spread timestamps across the file's mtime window: N lines ->
         * stride 1 second back per line, newest closest to mtime. */
        let line_count = buf.iter().filter(|&&b| b == b'\n').count() as i64;
        let mut idx = 0i64;
        for line in c_lines(&buf) {
            if let Some(tab) = line.iter().position(|&b| b == b'\t') {
                if tab > 0 {
                    let name_len = tab;
                    if name_len <= CHAT_NAME_MAX {
                        let name = &line[..tab];
                        let mut text_len = line.len() - name_len - 1;
                        if text_len > CHAT_TEXT_MAX {
                            text_len = CHAT_TEXT_MAX;
                        }
                        let text = &line[tab + 1..tab + 1 + text_len];
                        scanned += 1;
                        let already = !existing.is_empty()
                            && key_present_in(&existing, &room, name, text);
                        if !already {
                            /* Append directly so we get the synthetic
                             * timestamp instead of the current wall
                             * clock. */
                            if let Ok(mut g) =
                                fs::OpenOptions::new().append(true).create(true).open(&global_path)
                            {
                                let ts = ts_base.wrapping_sub((line_count - 1 - idx) as u64);
                                let mut out = Vec::new();
                                out.extend_from_slice(ts.to_string().as_bytes());
                                out.push(b'\t');
                                out.extend_from_slice(name);
                                out.push(b'\t');
                                out.extend_from_slice(&room);
                                out.push(b'\t');
                                out.extend_from_slice(text);
                                out.push(b'\n');
                                if g.write_all(&out).is_ok() {
                                    appended += 1;
                                }
                            }
                        }
                    }
                }
            }
            idx += 1;
        }
    }

    let _ = fs::write(&marker, format!("scanned={} appended={}\n", scanned, appended));
    println!(
        "[saves] chat migration: scanned={} entries across per-room files, \
         appended {} to chat.log (rest already present)",
        scanned, appended
    );
    /* Keep the file under AUDIT_FILE_MAX. */
    audit_truncate(&global_path);
}

/* Move any pre-migration <saves_dir>/players/<name>.dat into
 * <saves_dir>/rooms/__public__/players/<name>.dat. Idempotent via a
 * .players_migrated marker. */
fn migrate_players_to_per_room(dir: &str) {
    let marker = format!("{}/.players_migrated", dir);
    if Path::new(&marker).exists() {
        return;
    }

    let old_dir = format!("{}/players", dir);
    let rd = match fs::read_dir(&old_dir) {
        Ok(rd) => rd,
        Err(_) => {
            let _ = fs::write(&marker, "ok\n");
            return;
        }
    };

    let new_dir = format!("{}/rooms/{}/players", dir, room_dir_name(""));
    if !mkdir_p(&new_dir) {
        eprintln!("[saves] player migration: mkdir_p({}) failed", new_dir);
        return;
    }

    let mut moved = 0i32;
    let mut skipped = 0i32;
    for ent in rd.flatten() {
        let fname = ent.file_name().to_string_lossy().into_owned();
        if fname.starts_with('.') {
            continue;
        }
        match fname.rfind('.') {
            Some(d) if &fname[d..] == ".dat" => {}
            _ => continue,
        }
        let src = format!("{}/{}", old_dir, fname);
        let dst = format!("{}/{}", new_dir, fname);
        if Path::new(&dst).exists() {
            /* A per-room save already exists - keep the newer one. */
            let _ = fs::remove_file(&src);
            skipped += 1;
            continue;
        }
        match fs::rename(&src, &dst) {
            Ok(()) => moved += 1,
            Err(e) => eprintln!(
                "[saves] player migration: rename {} -> {} failed: {}",
                src, dst, e
            ),
        }
    }

    let _ = fs::write(&marker, format!("moved={} skipped={}\n", moved, skipped));
    println!(
        "[saves] player migration: moved {} legacy player file(s) \
         into rooms/{}/players (skipped {} already-migrated)",
        moved,
        room_dir_name(""),
        skipped
    );
    /* Try to drop the now-empty legacy dir; fails harmlessly if
     * anything is still in it. */
    let _ = fs::remove_dir(&old_dir);
}

/* On boot, walk sessions.log and write a "logout" for any (name, room)
 * whose most recent event was a login. Also closes mid-stream orphans
 * (login overwriting an unpaired login) at the new login's timestamp. */
fn close_orphan_sessions_at_startup(dir: &str) {
    let path = match audit_path(dir, "sessions") {
        Some(p) => p,
        None => return,
    };
    let buf = match fs::read(&path) {
        Ok(b) if !b.is_empty() && b.len() <= 4 * 1024 * 1024 => b,
        _ => return,
    };

    struct SessionState {
        name: Vec<u8>,
        room: Vec<u8>,
        open: bool,
    }
    struct PendingClose {
        name: Vec<u8>,
        room: Vec<u8>,
        ts: i64,
    }
    let cap = AUDIT_FILE_MAX + 8;
    let mut sessions: Vec<SessionState> = Vec::new();
    let mut pending: Vec<PendingClose> = Vec::new();

    for line in c_lines(&buf) {
        if line.is_empty() {
            continue;
        }
        /* Tab-split into 4 fields: ts \t event \t name \t room. */
        let t1 = match line.iter().position(|&b| b == b'\t') {
            Some(t) => t,
            None => continue,
        };
        let t2 = match line[t1 + 1..].iter().position(|&b| b == b'\t') {
            Some(t) => t1 + 1 + t,
            None => continue,
        };
        let t3 = match line[t2 + 1..].iter().position(|&b| b == b'\t') {
            Some(t) => t2 + 1 + t,
            None => continue,
        };
        let ts = c_strtoll(line);
        let event = &line[t1 + 1..t2];
        let name = &line[t2 + 1..t3];
        let mut room = &line[t3 + 1..];
        if name.is_empty() || name.len() > CHAT_NAME_MAX {
            continue;
        }
        if room.len() > 15 {
            room = &room[..15];
        }
        let is_login = event == b"login";
        let is_logout = event == b"logout";
        let is_timeout = event == b"timeout";
        if !is_login && !is_logout && !is_timeout {
            continue;
        }

        let idx = match sessions
            .iter()
            .position(|s| s.name == name && s.room == room)
        {
            Some(i) => i,
            None => {
                if sessions.len() >= cap {
                    continue;
                }
                sessions.push(SessionState {
                    name: name.to_vec(),
                    room: room.to_vec(),
                    open: false,
                });
                sessions.len() - 1
            }
        };
        if is_login {
            /* Mid-stream orphan: the previous login never paired. */
            if sessions[idx].open && pending.len() < cap {
                pending.push(PendingClose {
                    name: name.to_vec(),
                    room: room.to_vec(),
                    ts,
                });
            }
            sessions[idx].open = true;
        } else {
            sessions[idx].open = false;
        }
    }

    /* Trailing opens (last event was a login): close at boot time. */
    let now = unix_now();
    for s in &sessions {
        if !s.open {
            continue;
        }
        if pending.len() >= cap {
            break;
        }
        pending.push(PendingClose {
            name: s.name.clone(),
            room: s.room.clone(),
            ts: now,
        });
    }

    if !pending.is_empty() {
        if let Ok(mut af) = fs::OpenOptions::new().append(true).create(true).open(&path) {
            let mut mid_orphans = 0i32;
            let mut trailing_orphans = 0i32;
            for p in &pending {
                let mut out = Vec::new();
                out.extend_from_slice(p.ts.to_string().as_bytes());
                out.extend_from_slice(b"\tlogout\t");
                out.extend_from_slice(&p.name);
                out.push(b'\t');
                out.extend_from_slice(&p.room);
                out.push(b'\n');
                let _ = af.write_all(&out);
                if p.ts == now {
                    trailing_orphans += 1;
                } else {
                    mid_orphans += 1;
                }
            }
            drop(af);
            println!(
                "[saves] startup orphan-session sweep: closed {} unpaired login(s) \
                 ({} mid-stream + {} trailing)",
                pending.len(),
                mid_orphans,
                trailing_orphans
            );
            audit_truncate(&path);
        }
    }
}

/* ----------------------------------------------------------------- */
/* Public surface                                                     */
/* ----------------------------------------------------------------- */

/// Port of `saves_init()`. Boot-time setup; `saves_dir` is copied.
pub fn init(saves_dir: &str) -> bool {
    if saves_dir.is_empty() {
        return false;
    }
    set_saves_dir(Some(saves_dir.to_string()));
    if !mkdir_p(saves_dir) {
        eprintln!(
            "[saves] FATAL: cannot create saves dir '{}' - \
             block edits will not persist across this session.",
            saves_dir
        );
        set_saves_dir(None);
        return false;
    }
    /* Writability probe through the same write_atomic path the real
     * saves use - if the volume is read-only, surface it at boot. */
    {
        let probe = format!("{}/.write-probe", saves_dir);
        if !write_atomic(&probe, b"tenebris-saves-probe") {
            eprintln!(
                "[saves] FATAL: write-probe failed in '{}'. The saves \
                 directory is unwritable. Block edits WILL NOT PERSIST. \
                 Check the mount (Fly volume?) and process permissions.",
                saves_dir
            );
            set_saves_dir(None);
            return false;
        }
        let _ = fs::remove_file(&probe);
        println!("[saves] write-probe ok in {}", saves_dir);
    }
    load_or_write_manifest(saves_dir);
    migrate_chat_per_room_to_global(saves_dir);
    migrate_players_to_per_room(saves_dir);
    close_orphan_sessions_at_startup(saves_dir);
    println!("[saves] init dir={}", saves_dir);
    true
}

/// Port of `saves_shutdown()`.
pub fn shutdown() {
    set_saves_dir(None);
}

/* Map an empty room code to the on-disk placeholder for the public
 * room so the path is always well-formed. */
fn room_dir_name(room: &str) -> &str {
    if room.is_empty() {
        "__public__"
    } else {
        room
    }
}

fn body_dir(dir: &str, room: &str, seed: u64, body_id: u32) -> String {
    format!(
        "{}/rooms/{}/world-{:x}/body-{}",
        dir,
        room_dir_name(room),
        seed,
        body_id
    )
}

fn tile_path(dir: &str, room: &str, seed: u64, body_id: u32, tile_idx: i32) -> String {
    format!(
        "{}/rooms/{}/world-{:x}/body-{}/{}.col",
        dir,
        room_dir_name(room),
        seed,
        body_id,
        tile_idx
    )
}

fn origins_path(dir: &str, room: &str, seed: u64, body_id: u32, tile_idx: i32) -> String {
    format!(
        "{}/rooms/{}/world-{:x}/body-{}/{}.orig",
        dir,
        room_dir_name(room),
        seed,
        body_id,
        tile_idx
    )
}

fn water_path(dir: &str, room: &str, seed: u64, body_id: u32, tile_idx: i32) -> String {
    format!(
        "{}/rooms/{}/world-{:x}/body-{}/{}.water",
        dir,
        room_dir_name(room),
        seed,
        body_id,
        tile_idx
    )
}

fn room_display(room: &str) -> &str {
    if room.is_empty() {
        "(public)"
    } else {
        room
    }
}

/* Encode the .col file as [16-byte header][WORLD_MAX_DEPTH bytes].
 * Header layout (little-endian):
 *   u32 magic = 'TCOL', u32 version, u32 depth, u32 reserved. */

/// Port of `saves_write_tile()`. Persist `tile_idx`'s column under
/// (room, body). Call right after `world::set` in the PLAYER_CMD
/// handler so only the actually-edited tile hits disk - per-edit
/// durability, no batching.
pub fn write_tile(w: &mut World, room: &str, seed: u64, tile_idx: i32) -> bool {
    let dir_root = match saves_dir() {
        Some(d) => d,
        None => {
            eprintln!("[saves] write_tile rejected: saves disabled (no init/probe)");
            return false;
        }
    };
    if tile_idx < 0 || tile_idx >= w.tile_count {
        eprintln!(
            "[saves] write_tile rejected: tile={} out of range [0,{})",
            tile_idx, w.tile_count
        );
        return false;
    }
    let body_id = w.body.id as u32;
    let dir = body_dir(&dir_root, room, seed, body_id);
    if !mkdir_p(&dir) {
        eprintln!("[saves] write_tile mkdir_p({}) failed", dir);
        return false;
    }
    let path = tile_path(&dir_root, room, seed, body_id, tile_idx);

    let mut buf = [0u8; TILE_HEADER_SIZE + DEPTH];
    wr_u32(&mut buf, 0, TILE_MAGIC);
    wr_u32(&mut buf, 4, TILE_VERSION);
    wr_u32(&mut buf, 8, WORLD_MAX_DEPTH as u32);
    wr_u32(&mut buf, 12, 0);
    let base = tile_idx as usize * DEPTH;
    buf[TILE_HEADER_SIZE..].copy_from_slice(&w.blocks[base..base + DEPTH]);
    let ok = write_atomic(&path, &buf);
    if !ok {
        eprintln!(
            "[saves] write_tile FAILED path={} (room='{}' body={} tile={})",
            path,
            room_display(room),
            body_id,
            tile_idx
        );
    }
    /* Track that this tile now has a persisted column so the join-
     * time replay path picks it up on the next client connect. */
    if ok {
        w.tile_mark_saved(tile_idx);
    }
    ok
}

/// Port of `saves_write_water_state()`. Sibling .water file with the
/// same atomic-swap + header pattern as write_tile.
pub fn write_water_state(w: &World, room: &str, seed: u64, tile_idx: i32) -> bool {
    let dir_root = match saves_dir() {
        Some(d) => d,
        None => return false,
    };
    if tile_idx < 0 || tile_idx >= w.tile_count {
        return false;
    }
    let column = match world_water::state_column(w, tile_idx) {
        Some(c) => c,
        None => return false,
    };

    let body_id = w.body.id as u32;
    let dir = body_dir(&dir_root, room, seed, body_id);
    if !mkdir_p(&dir) {
        eprintln!("[saves] write_water mkdir_p({}) failed", dir);
        return false;
    }
    let path = water_path(&dir_root, room, seed, body_id, tile_idx);

    let mut buf = [0u8; WATER_HEADER_SIZE + DEPTH];
    wr_u32(&mut buf, 0, WATER_MAGIC);
    wr_u32(&mut buf, 4, WATER_VERSION);
    wr_u32(&mut buf, 8, WORLD_MAX_DEPTH as u32);
    wr_u32(&mut buf, 12, 0);
    buf[WATER_HEADER_SIZE..].copy_from_slice(column);
    let ok = write_atomic(&path, &buf);
    if !ok {
        eprintln!(
            "[saves] write_water FAILED path={} (room='{}' body={} tile={})",
            path,
            room_display(room),
            body_id,
            tile_idx
        );
    }
    ok
}

/// Port of `saves_load_world_water()`. Apply every saved .water column
/// for (room, body) onto the world's water-state buffer. Returns the
/// count of tiles restored.
pub fn load_world_water(w: &mut World, room: &str, seed: u64) -> i32 {
    let dir_root = match saves_dir() {
        Some(d) => d,
        None => return 0,
    };
    let body_id = w.body.id as u32;
    let dir = body_dir(&dir_root, room, seed, body_id);
    let rd = match fs::read_dir(&dir) {
        Ok(rd) => rd,
        Err(_) => return 0, /* nothing persisted for this body yet */
    };
    let mut loaded = 0i32;
    for ent in rd.flatten() {
        let name = ent.file_name().to_string_lossy().into_owned();
        let dot = match name.rfind('.') {
            Some(d) if &name[d..] == ".water" => d,
            _ => continue,
        };
        /* Parse the tile index from "<int>.water" (strict strtol:
         * the digits must run exactly up to the dot). */
        let (tile_l, consumed) = c_strtol(name.as_bytes());
        if consumed == 0 || tile_l < 0 || tile_l >= w.tile_count as i64 {
            continue;
        }
        if consumed != dot {
            continue; /* "123x.water" -> reject */
        }
        let tile = tile_l as i32;

        let path = water_path(&dir_root, room, seed, body_id, tile);
        let data = match fs::read(&path) {
            Ok(d) => d,
            Err(_) => continue,
        };
        if data.len() < WATER_HEADER_SIZE {
            continue;
        }
        let magic = rd_u32(&data, 0);
        let ver = rd_u32(&data, 4);
        let depth = rd_u32(&data, 8);
        if magic != WATER_MAGIC || ver != WATER_VERSION || depth != WORLD_MAX_DEPTH as u32 {
            eprintln!(
                "[saves] {}: water header mismatch (magic={:08x} ver={} depth={}), skipping",
                path, magic, ver, depth
            );
            continue;
        }
        if data.len() < WATER_HEADER_SIZE + DEPTH {
            continue; /* short column read */
        }
        world_water::load_state_column(w, tile, &data[WATER_HEADER_SIZE..WATER_HEADER_SIZE + DEPTH]);
        loaded += 1;
    }
    if loaded > 0 {
        println!(
            "[saves] body={}: restored {} water-state column(s) from {}",
            body_id, loaded, dir
        );
    }
    loaded
}

/* ----------------------------------------------------------------- */
/* Per-tile flow-origin persistence. Sibling .orig file to .water.    */

/// Port of `saves_write_water_origins()`.
pub fn write_water_origins(w: &World, room: &str, seed: u64, tile_idx: i32) -> bool {
    let dir_root = match saves_dir() {
        Some(d) => d,
        None => return false,
    };
    if tile_idx < 0 || tile_idx >= w.tile_count {
        return false;
    }

    /* Pull the origin entries for this tile - one entry per depth
     * slot is the absolute max. */
    let mut entries = [OriginDiffEntry::default(); DEPTH];
    let mut n = world_water::origin_enum_tile(w, tile_idx, &mut entries) as usize;
    if n > DEPTH {
        n = DEPTH;
    }

    let body_id = w.body.id as u32;
    let dir = body_dir(&dir_root, room, seed, body_id);
    let path = origins_path(&dir_root, room, seed, body_id, tile_idx);

    /* Zero entries -> remove any stale file from a prior session. */
    if n == 0 {
        let _ = fs::remove_file(&path); /* tolerate ENOENT */
        return true;
    }

    if !mkdir_p(&dir) {
        eprintln!("[saves] write_origins mkdir_p({}) failed", dir);
        return false;
    }

    let buf_len = ORIGINS_HEADER_SIZE + n * ORIGINS_ENTRY_SIZE;
    let mut buf = vec![0u8; buf_len];
    wr_u32(&mut buf, 0, ORIGINS_MAGIC);
    wr_u32(&mut buf, 4, ORIGINS_VERSION);
    wr_u32(&mut buf, 8, n as u32);
    wr_u32(&mut buf, 12, 0);

    for (i, e) in entries[..n].iter().enumerate() {
        let p = ORIGINS_HEADER_SIZE + i * ORIGINS_ENTRY_SIZE;
        buf[p] = e.depth;
        buf[p + 1] = e.origin_count;
        /* buf[p+2..p+4] padding stays zero */
        for k in 0..WATER_ORIGIN_MAX {
            let slot = p + 4 + k * 8;
            let ot = if k < e.origin_count as usize {
                e.origin_tile[k]
            } else {
                0
            };
            let od = if k < e.origin_count as usize {
                e.origin_depth[k]
            } else {
                0
            };
            wr_u32(&mut buf, slot, ot);
            buf[slot + 4] = od;
            /* slot+5..slot+8 padding stays zero */
        }
    }
    let ok = write_atomic(&path, &buf);
    if !ok {
        eprintln!(
            "[saves] write_origins FAILED path={} (room='{}' body={} tile={})",
            path,
            room_display(room),
            body_id,
            tile_idx
        );
    }
    ok
}

/// Port of `saves_load_world_water_origins()`. Replays
/// `world_water::origin_add` for every persisted entry. Returns the
/// count of tiles restored; call AFTER `load_world_water` on boot.
pub fn load_world_water_origins(w: &mut World, room: &str, seed: u64) -> i32 {
    let dir_root = match saves_dir() {
        Some(d) => d,
        None => return 0,
    };
    let body_id = w.body.id as u32;
    let dir = body_dir(&dir_root, room, seed, body_id);
    let rd = match fs::read_dir(&dir) {
        Ok(rd) => rd,
        Err(_) => return 0,
    };
    let mut loaded_tiles = 0i32;
    let mut loaded_entries = 0i32;
    for ent in rd.flatten() {
        let name = ent.file_name().to_string_lossy().into_owned();
        let dot = match name.rfind('.') {
            Some(d) if &name[d..] == ".orig" => d,
            _ => continue,
        };
        let (tile_l, consumed) = c_strtol(name.as_bytes());
        if consumed == 0 || tile_l < 0 || tile_l >= w.tile_count as i64 {
            continue;
        }
        if consumed != dot {
            continue;
        }
        let tile = tile_l as i32;

        let path = origins_path(&dir_root, room, seed, body_id, tile);
        let data = match fs::read(&path) {
            Ok(d) => d,
            Err(_) => continue,
        };
        if data.len() < ORIGINS_HEADER_SIZE {
            continue;
        }
        let magic = rd_u32(&data, 0);
        let ver = rd_u32(&data, 4);
        let count = rd_u32(&data, 8);
        if magic != ORIGINS_MAGIC || ver != ORIGINS_VERSION || count > WORLD_MAX_DEPTH as u32 {
            eprintln!(
                "[saves] {}: origins header bad (magic={:08x} ver={} count={})",
                path, magic, ver, count
            );
            continue;
        }

        for i in 0..count as usize {
            let p = ORIGINS_HEADER_SIZE + i * ORIGINS_ENTRY_SIZE;
            if p + ORIGINS_ENTRY_SIZE > data.len() {
                break; /* short entry read */
            }
            let depth = data[p];
            let mut origin_count = data[p + 1];
            if depth as i32 >= WORLD_MAX_DEPTH {
                continue;
            }
            if origin_count as usize > WATER_ORIGIN_MAX {
                origin_count = WATER_ORIGIN_MAX as u8;
            }
            for k in 0..origin_count as usize {
                let slot = p + 4 + k * 8;
                let ot = rd_u32(&data, slot);
                let od = data[slot + 4];
                world_water::origin_add(
                    w,
                    tile,
                    depth as i32,
                    OriginRef {
                        tile: ot,
                        depth: od,
                    },
                );
                loaded_entries += 1;
            }
        }
        loaded_tiles += 1;
    }
    if loaded_tiles > 0 {
        println!(
            "[saves] body={}: restored origins for {} tile(s) ({} entries) from {}",
            body_id, loaded_tiles, loaded_entries, dir
        );
    }
    loaded_tiles
}

/* ----------------------------------------------------------------- */
/* Per-body torch list persistence.                                   */

fn torches_path(dir: &str, room: &str, seed: u64, body_id: u32) -> String {
    format!(
        "{}/rooms/{}/world-{:x}/body-{}/torches.dat",
        dir,
        room_dir_name(room),
        seed,
        body_id
    )
}

/// Port of `saves_torches_write()`. Rewrites the per-body list in
/// full (256 max torches at 28 B each - delta encoding isn't worth
/// the bookkeeping). An empty slice removes the file.
pub fn torches_write(room: &str, seed: u64, body_id: u32, torches: &[Torch]) -> bool {
    let dir_root = match saves_dir() {
        Some(d) => d,
        None => {
            eprintln!("[saves] torches_write rejected: saves disabled");
            return false;
        }
    };
    let count = torches.len().min(TORCHES_MAX_COUNT);
    let dir = body_dir(&dir_root, room, seed, body_id);
    if !mkdir_p(&dir) {
        eprintln!("[saves] torches_write mkdir_p({}) failed", dir);
        return false;
    }
    let path = torches_path(&dir_root, room, seed, body_id);

    if count == 0 {
        /* Empty list: remove the file rather than write a header-only
         * blob. Removal is idempotent (ENOENT tolerated). */
        if let Err(e) = fs::remove_file(&path) {
            if e.kind() != std::io::ErrorKind::NotFound {
                eprintln!("[saves] torches_write unlink({}): {}", path, e);
                return false;
            }
        }
        return true;
    }

    let blob_len = TORCHES_HEADER_SIZE + count * TORCHES_ENTRY_SIZE;
    let mut buf = vec![0u8; blob_len];
    wr_u32(&mut buf, 0, TORCHES_MAGIC);
    wr_u32(&mut buf, 4, TORCHES_VERSION);
    wr_u32(&mut buf, 8, body_id);
    wr_u32(&mut buf, 12, count as u32);
    for (i, t) in torches[..count].iter().enumerate() {
        let p = TORCHES_HEADER_SIZE + i * TORCHES_ENTRY_SIZE;
        buf[p..p + 4].copy_from_slice(&t.tile_idx.to_le_bytes());
        for k in 0..3 {
            buf[p + 4 + k * 4..p + 8 + k * 4].copy_from_slice(&t.pos[k].to_le_bytes());
        }
        for k in 0..3 {
            buf[p + 16 + k * 4..p + 20 + k * 4].copy_from_slice(&t.up[k].to_le_bytes());
        }
    }
    let ok = write_atomic(&path, &buf);
    if !ok {
        eprintln!(
            "[saves] torches_write FAILED path={} (room='{}' body={} count={})",
            path,
            room_display(room),
            body_id,
            count
        );
    }
    ok
}

/// Port of `saves_torches_load()`. Reads up to `out.len()` torches.
pub fn torches_load(room: &str, seed: u64, body_id: u32, out: &mut [Torch]) -> i32 {
    let dir_root = match saves_dir() {
        Some(d) => d,
        None => return 0,
    };
    let cap = out.len();
    if cap == 0 {
        return 0;
    }
    let path = torches_path(&dir_root, room, seed, body_id);
    let data = match fs::read(&path) {
        Ok(d) => d,
        Err(_) => return 0,
    };
    if data.len() < TORCHES_HEADER_SIZE {
        return 0;
    }
    let magic = rd_u32(&data, 0);
    let ver = rd_u32(&data, 4);
    let _bid = rd_u32(&data, 8); /* stored for inspection; not validated */
    let mut count = rd_u32(&data, 12);
    if magic != TORCHES_MAGIC || ver != TORCHES_VERSION {
        eprintln!(
            "[saves] torches_load {}: bad magic/version (magic=0x{:08x} ver={})",
            path, magic, ver
        );
        return 0;
    }
    /* C compares `(int)count > cap` - a count past INT_MAX wraps
     * negative and skips the clamp, relying on the 256 cap below. */
    if (count as i32) > cap as i32 {
        count = cap as u32;
    }
    if count > TORCHES_MAX_COUNT as u32 {
        count = TORCHES_MAX_COUNT as u32;
    }
    let mut loaded = 0usize;
    for i in 0..count as usize {
        let p = TORCHES_HEADER_SIZE + i * TORCHES_ENTRY_SIZE;
        if p + TORCHES_ENTRY_SIZE > data.len() {
            break;
        }
        out[loaded].tile_idx = i32::from_le_bytes([data[p], data[p + 1], data[p + 2], data[p + 3]]);
        for k in 0..3 {
            let q = p + 4 + k * 4;
            out[loaded].pos[k] =
                f32::from_le_bytes([data[q], data[q + 1], data[q + 2], data[q + 3]]);
        }
        for k in 0..3 {
            let q = p + 16 + k * 4;
            out[loaded].up[k] =
                f32::from_le_bytes([data[q], data[q + 1], data[q + 2], data[q + 3]]);
        }
        loaded += 1;
    }
    loaded as i32
}

/// Port of `saves_flush_world()`. Walks the dirty bitset and persists
/// every dirty tile. The server no longer calls it (immediate save
/// covers chunk edits) but the API is kept for an eventual edit-only
/// dirty bitmap.
pub fn flush_world(w: &mut World, room: &str, seed: u64) -> i32 {
    if saves_dir().is_none() {
        return 0;
    }
    let mut written = 0i32;
    for tile in 0..w.tile_count {
        if !w.tile_dirty(tile) {
            continue;
        }
        if write_tile(w, room, seed, tile) {
            w.tile_clear_dirty(tile);
            written += 1;
        }
    }
    written
}

/// Port of `saves_room_body_has_edits()`. Cheap directory probe:
/// true iff (room, seed, body_id) has at least one .col file.
pub fn room_body_has_edits(room: &str, seed: u64, body_id: u32) -> bool {
    let dir_root = match saves_dir() {
        Some(d) => d,
        None => return false,
    };
    let dir = body_dir(&dir_root, room, seed, body_id);
    let rd = match fs::read_dir(&dir) {
        Ok(rd) => rd,
        Err(_) => return false,
    };
    for ent in rd.flatten() {
        let name = ent.file_name().to_string_lossy().into_owned();
        if name.starts_with('.') {
            continue;
        }
        if let Some(d) = name.rfind('.') {
            if &name[d..] == ".col" {
                return true;
            }
        }
    }
    false
}

/// Port of `saves_load_world()`. Apply every saved column for
/// (room, body) onto the world's block array. Returns the count of
/// tile columns actually overlaid.
pub fn load_world(w: &mut World, room: &str, seed: u64) -> i32 {
    let dir_root = match saves_dir() {
        Some(d) => d,
        None => return 0,
    };
    let body_id = w.body.id as u32;
    let dir = body_dir(&dir_root, room, seed, body_id);
    let rd = match fs::read_dir(&dir) {
        Ok(rd) => rd,
        Err(_) => return 0, /* no saves yet - silent skip */
    };
    let mut loaded = 0i32;
    for ent in rd.flatten() {
        let name = ent.file_name().to_string_lossy().into_owned();
        if name.starts_with('.') {
            continue;
        }
        match name.rfind('.') {
            Some(d) if &name[d..] == ".col" => {}
            _ => continue,
        }
        /* atoi: deliberately lenient - "99zz.col" files under tile
         * 99, matching the C loader. */
        let tile = c_atoi(name.as_bytes());
        if tile < 0 || tile >= w.tile_count {
            continue;
        }
        let path = format!("{}/{}", dir, name);
        let data = match fs::read(&path) {
            Ok(d) => d,
            Err(_) => continue,
        };
        let base = tile as usize * DEPTH;
        let col = &mut w.blocks[base..base + DEPTH];
        /* Two formats supported:
         *   - Legacy v0: file is exactly WORLD_MAX_DEPTH raw bytes.
         *   - v1+: 16-byte header followed by WORLD_MAX_DEPTH bytes.
         * The C reader fread()s straight into the live column, so a
         * truncated / corrupt file leaves a PARTIAL overlay behind
         * before being rejected. That quirk is replicated: byte-for-
         * byte identical world state matters more than tidiness. */
        let mut accepted = false;
        if data.len() >= TILE_HEADER_SIZE {
            let magic = rd_u32(&data, 0);
            let ver = rd_u32(&data, 4);
            let depth = rd_u32(&data, 8);
            if magic == TILE_MAGIC && ver <= TILE_VERSION && depth == WORLD_MAX_DEPTH as u32 {
                let cn = (data.len() - TILE_HEADER_SIZE).min(DEPTH);
                col[..cn].copy_from_slice(&data[TILE_HEADER_SIZE..TILE_HEADER_SIZE + cn]);
                accepted = cn == DEPTH;
            } else {
                /* Legacy v0: rewind and refill the column; any spill
                 * byte past WORLD_MAX_DEPTH means the file is neither
                 * v0 nor v1 - reject it. */
                let cn = data.len().min(DEPTH);
                col[..cn].copy_from_slice(&data[..cn]);
                accepted = data.len() == DEPTH;
            }
        }
        if accepted {
            loaded += 1;
            /* Remember that this tile diverges from procgen so the
             * server can replay it to joining clients. */
            w.tile_mark_saved(tile);
        } else {
            eprintln!("[saves] {}: skipped (unknown format)", path);
        }
    }
    if loaded > 0 {
        println!(
            "[saves] body={}: restored {} tile column(s) from {}",
            body_id, loaded, dir
        );
    }
    loaded
}

/* ----------------------------------------------------------------- */
/* Per-player pose                                                    */
/* ----------------------------------------------------------------- */

/* Build a filesystem-safe key from a player name. Lowercase, allow
 * [a-z0-9_-], substitute '_' for space, drop everything else. Names
 * that sanitize to empty return None so the caller skips the save. */
fn name_to_key(name: &str) -> Option<String> {
    if name.is_empty() {
        return None;
    }
    let mut out = Vec::new();
    for &b in name.as_bytes() {
        if out.len() + 1 >= 64 {
            break; /* C key[64] cap */
        }
        let mut c = b;
        if c == b' ' {
            out.push(b'_');
            continue;
        }
        if c.is_ascii_uppercase() {
            c = c.to_ascii_lowercase();
        }
        if c.is_ascii_lowercase() || c.is_ascii_digit() || c == b'-' || c == b'_' {
            out.push(c);
        }
    }
    if out.is_empty() {
        return None;
    }
    Some(String::from_utf8(out).unwrap())
}

fn player_dir_for_room(dir: &str, room: &str) -> Option<String> {
    let s = format!("{}/rooms/{}/players", dir, room_dir_name(room));
    if s.len() >= 512 {
        return None; /* C 512-byte path buffer */
    }
    Some(s)
}

fn player_path_for(dir: &str, room: &str, name: &str) -> Option<String> {
    let key = name_to_key(name)?;
    let s = format!("{}/rooms/{}/players/{}.dat", dir, room_dir_name(room), key);
    if s.len() >= 512 {
        return None;
    }
    Some(s)
}

fn serialize_pose(pose: &PlayerPose, version: u32) -> [u8; PLAYER_POSE_SIZE] {
    let mut b = [0u8; PLAYER_POSE_SIZE];
    wr_u32(&mut b, 0, version);
    wr_u32(&mut b, 4, pose.body_id);
    b[8..16].copy_from_slice(&pose.pos_x.to_le_bytes());
    b[16..24].copy_from_slice(&pose.pos_y.to_le_bytes());
    b[24..32].copy_from_slice(&pose.pos_z.to_le_bytes());
    b[32..36].copy_from_slice(&pose.yaw.to_le_bytes());
    b[36..40].copy_from_slice(&pose.pitch.to_le_bytes());
    for i in 0..PLAYER_INVENTORY_SLOTS {
        b[40 + i * 2..42 + i * 2].copy_from_slice(&pose.inv_slot_type[i].to_le_bytes());
    }
    for i in 0..PLAYER_INVENTORY_SLOTS {
        b[58 + i * 2..60 + i * 2].copy_from_slice(&pose.inv_slot_count[i].to_le_bytes());
    }
    b[76] = pose.inv_selected;
    b[77..80].copy_from_slice(&pose.inv_reserved);
    b
}

/// Port of `saves_write_player()`. Always writes a v2 record (the
/// input's version field is overwritten).
pub fn write_player(room: &str, name: &str, pose: &PlayerPose) -> bool {
    let dir_root = match saves_dir() {
        Some(d) => d,
        None => return false,
    };
    let dir = match player_dir_for_room(&dir_root, room) {
        Some(d) => d,
        None => return false,
    };
    if !mkdir_p(&dir) {
        eprintln!("[saves] write_player mkdir_p({}) failed", dir);
        return false;
    }
    let path = match player_path_for(&dir_root, room, name) {
        Some(p) => p,
        None => return false,
    };
    let buf = serialize_pose(pose, PLAYER_VERSION);
    write_atomic(&path, &buf)
}

/// Port of `saves_load_player()` (bool + out param in C). Accepts
/// both v1 (no inventory tail, zero-filled on load) and v2 records;
/// short / unknown-version files return None.
pub fn load_player(room: &str, name: &str) -> Option<PlayerPose> {
    let dir_root = saves_dir()?;
    let path = player_path_for(&dir_root, room, name)?;
    let data = fs::read(&path).ok()?;
    /* C freads into a zeroed struct; partial records past the v1
     * core leave the remaining fields zero. */
    let mut buf = [0u8; PLAYER_POSE_SIZE];
    let n = data.len().min(PLAYER_POSE_SIZE);
    buf[..n].copy_from_slice(&data[..n]);
    if n < PLAYER_POSE_MIN {
        return None;
    }
    let mut pose = PlayerPose {
        version: rd_u32(&buf, 0),
        body_id: rd_u32(&buf, 4),
        pos_x: f64::from_le_bytes(buf[8..16].try_into().unwrap()),
        pos_y: f64::from_le_bytes(buf[16..24].try_into().unwrap()),
        pos_z: f64::from_le_bytes(buf[24..32].try_into().unwrap()),
        yaw: f32::from_le_bytes(buf[32..36].try_into().unwrap()),
        pitch: f32::from_le_bytes(buf[36..40].try_into().unwrap()),
        inv_slot_type: [0; PLAYER_INVENTORY_SLOTS],
        inv_slot_count: [0; PLAYER_INVENTORY_SLOTS],
        inv_selected: buf[76],
        inv_reserved: [buf[77], buf[78], buf[79]],
    };
    for i in 0..PLAYER_INVENTORY_SLOTS {
        pose.inv_slot_type[i] = u16::from_le_bytes([buf[40 + i * 2], buf[41 + i * 2]]);
        pose.inv_slot_count[i] = i16::from_le_bytes([buf[58 + i * 2], buf[59 + i * 2]]);
    }
    if pose.version == 1 {
        /* Truncated v1 record. Inventory stays zeroed. */
        pose.inv_slot_type = [0; PLAYER_INVENTORY_SLOTS];
        pose.inv_slot_count = [0; PLAYER_INVENTORY_SLOTS];
        pose.inv_selected = 0;
    } else if pose.version != PLAYER_VERSION {
        eprintln!(
            "[saves] player {}: version {} not supported (current {}), ignoring",
            name, pose.version, PLAYER_VERSION
        );
        return None;
    }
    Some(pose)
}

/* ----------------------------------------------------------------- */
/* Chat log + audit logs                                              */
/* ----------------------------------------------------------------- */

/* Strip newline / tab from a byte string in place - they break the
 * line format. */
fn strip_log_chars(s: &mut [u8]) {
    for b in s.iter_mut() {
        if *b == b'\n' || *b == b'\r' || *b == b'\t' {
            *b = b' ';
        }
    }
}

/// snprintf-style byte truncation into an N-byte C buffer (keeps at
/// most N-1 bytes).
fn c_truncate(s: &str, buf_size: usize) -> Vec<u8> {
    let b = s.as_bytes();
    b[..b.len().min(buf_size - 1)].to_vec()
}

/// Port of `saves_chat_append()`. Per-room chat files were dropped:
/// chat.log is the single source of truth; this forwards to the
/// global writer.
pub fn chat_append(room: &str, name: &str, text: &str) {
    global_chat_append(room, name, text);
}

fn audit_path(dir: &str, which: &str) -> Option<String> {
    let s = format!("{}/{}.log", dir, which);
    if s.len() >= 512 {
        return None;
    }
    Some(s)
}

fn audit_truncate(path: &str) {
    /* Cheap: read the whole file, count newlines, rewrite tail via
     * .tmp swap when over cap. Anything past 4 MB means the writer
     * lost a guard - skip truncation rather than scan a runaway
     * file. */
    let buf = match fs::read(path) {
        Ok(b) => b,
        Err(_) => return,
    };
    if buf.len() > 4 * 1024 * 1024 {
        return;
    }
    let line_count = buf.iter().filter(|&&b| b == b'\n').count();
    if line_count <= AUDIT_FILE_MAX {
        return;
    }
    let drop_n = line_count - AUDIT_FILE_MAX;
    let mut off = 0usize;
    let mut seen = 0usize;
    while off < buf.len() && seen < drop_n {
        if buf[off] == b'\n' {
            seen += 1;
        }
        off += 1;
    }
    let tmp = format!("{}.tmp", path);
    /* C: plain fopen/fwrite/fclose + rename, no fsync here. */
    if fs::write(&tmp, &buf[off..]).is_ok() {
        let _ = fs::rename(&tmp, path);
    }
}

fn audit_append_line(path: &str, fields: &[&[u8]]) {
    let mut f = match fs::OpenOptions::new().append(true).create(true).open(path) {
        Ok(f) => f,
        Err(_) => return,
    };
    let mut out: Vec<u8> = Vec::new();
    out.extend_from_slice(unix_now().to_string().as_bytes());
    for fld in fields {
        out.push(b'\t');
        out.extend_from_slice(fld);
    }
    out.push(b'\n');
    let _ = f.write_all(&out);
}

/// Port of `saves_session_log()`. Appends
/// `<unix_seconds>\t<event>\t<name>\t<room>\n` to sessions.log.
pub fn session_log(event: &str, name: &str, room: &str) {
    let dir = match saves_dir() {
        Some(d) => d,
        None => return,
    };
    let path = match audit_path(&dir, "sessions") {
        Some(p) => p,
        None => return,
    };
    let mut clean_event = c_truncate(event, 16);
    let mut clean_name = c_truncate(name, CHAT_NAME_MAX + 1);
    let mut clean_room = c_truncate(if room.is_empty() { "__public__" } else { room }, 16);
    strip_log_chars(&mut clean_event);
    strip_log_chars(&mut clean_name);
    strip_log_chars(&mut clean_room);
    audit_append_line(&path, &[&clean_event, &clean_name, &clean_room]);
    audit_truncate(&path);
}

/// Port of `saves_global_chat_append()`. Appends
/// `<unix_seconds>\t<name>\t<room>\t<text>\n` to chat.log.
pub fn global_chat_append(room: &str, name: &str, text: &str) {
    let dir = match saves_dir() {
        Some(d) => d,
        None => return,
    };
    let path = match audit_path(&dir, "chat") {
        Some(p) => p,
        None => return,
    };
    let mut clean_name = c_truncate(name, CHAT_NAME_MAX + 1);
    let mut clean_text = c_truncate(text, CHAT_TEXT_MAX + 1);
    let mut clean_room = c_truncate(if room.is_empty() { "__public__" } else { room }, 16);
    strip_log_chars(&mut clean_name);
    strip_log_chars(&mut clean_text);
    strip_log_chars(&mut clean_room);
    audit_append_line(&path, &[&clean_name, &clean_room, &clean_text]);
    audit_truncate(&path);
}

/// Port of `saves_audit_tail()`. Fills `out` with the last
/// `max_lines` lines of `<saves_dir>/<which>.log`, NUL-terminated
/// like the C buffer. Returns the byte count excluding the NUL;
/// 0 on any error so callers fall back to "no data yet".
pub fn audit_tail(which: &str, max_lines: i32, out: &mut [u8]) -> usize {
    if out.is_empty() {
        return 0;
    }
    out[0] = 0;
    let dir = match saves_dir() {
        Some(d) => d,
        None => return 0,
    };
    let path = match audit_path(&dir, which) {
        Some(p) => p,
        None => return 0,
    };
    let max_lines = if max_lines <= 0 {
        AUDIT_FILE_MAX
    } else {
        max_lines as usize
    };

    let buf = match fs::read(&path) {
        Ok(b) => b,
        Err(_) => return 0,
    };
    if buf.len() > 4 * 1024 * 1024 {
        return 0;
    }

    /* Count newlines, then walk forward to the start of the keep
     * window so the tail comes out as one contiguous slice. */
    let total = buf.iter().filter(|&&b| b == b'\n').count();
    let drop_n = total.saturating_sub(max_lines);
    let mut off = 0usize;
    let mut seen = 0usize;
    while off < buf.len() && seen < drop_n {
        if buf[off] == b'\n' {
            seen += 1;
        }
        off += 1;
    }
    let mut avail = buf.len() - off;
    if avail >= out.len() {
        avail = out.len() - 1;
    }
    out[..avail].copy_from_slice(&buf[off..off + avail]);
    out[avail] = 0;
    avail
}

/// Port of `saves_chat_load_backlog()`. Parses chat.log filtered by
/// room and a 12-hour freshness window, returning up to `cap` recent
/// messages oldest -> newest.
pub fn chat_load_backlog(room: &str, cap: i32) -> Vec<ChatMsg> {
    let dir = match saves_dir() {
        Some(d) => d,
        None => return Vec::new(),
    };
    if cap <= 0 {
        return Vec::new();
    }
    let cap = cap as usize;
    let path = match audit_path(&dir, "chat") {
        Some(p) => p,
        None => return Vec::new(),
    };
    let buf = match fs::read(&path) {
        Ok(b) if !b.is_empty() && b.len() <= 8 * 1024 * 1024 => b,
        _ => return Vec::new(),
    };

    let want_room: &[u8] = if room.is_empty() {
        b"__public__"
    } else {
        room.as_bytes()
    };

    /* Filter out anything older than 12 hours so the join-time replay
     * doesn't ship ancient logs. */
    let now_ts = unix_now();
    let max_age_s: i64 = 12 * 60 * 60;

    let mut msgs: Vec<ChatMsg> = Vec::new();
    for line in c_lines(&buf) {
        let t1 = match line.iter().position(|&b| b == b'\t') {
            Some(t) => t,
            None => continue,
        };
        let ts = c_strtoll(line);
        if ts > 0 && (now_ts - ts) > max_age_s {
            continue;
        }
        let t2 = match line[t1 + 1..].iter().position(|&b| b == b'\t') {
            Some(t) => t1 + 1 + t,
            None => continue,
        };
        let t3 = match line[t2 + 1..].iter().position(|&b| b == b'\t') {
            Some(t) => t2 + 1 + t,
            None => continue,
        };
        let name = &line[t1 + 1..t2];
        let line_room = &line[t2 + 1..t3];
        let text = &line[t3 + 1..];
        if line_room != want_room {
            continue;
        }
        if name.is_empty() || name.len() > CHAT_NAME_MAX {
            continue;
        }
        let text = &text[..text.len().min(CHAT_TEXT_MAX)];
        msgs.push(ChatMsg {
            name: String::from_utf8_lossy(name).into_owned(),
            text: String::from_utf8_lossy(text).into_owned(),
        });
        /* Ring-buffer semantics: keep only the newest `cap`. */
        if msgs.len() > cap {
            msgs.remove(0);
        }
    }
    msgs
}

/* ----------------------------------------------------------------- */
/* Directory walker for /saves.                                       */

fn parse_seed_from_dir(name: &str) -> Option<u64> {
    /* Expect "world-<hex>" with the parse consuming the whole
     * remainder (C strtoull + *end == 0; an empty remainder parses
     * as seed 0, same as strtoull("")). */
    let rest = name.strip_prefix("world-")?;
    let (v, consumed) = c_strtoull_hex(rest.as_bytes());
    if consumed != rest.len() {
        return None;
    }
    Some(v)
}

fn parse_body_from_dir(name: &str) -> Option<u32> {
    let rest = name.strip_prefix("body-")?;
    let (v, consumed) = c_strtoul_dec(rest.as_bytes());
    if consumed != rest.len() {
        return None;
    }
    Some(v as u32)
}

/// Port of `saves_enumerate_tiles()`. One callback per .col file:
/// `(room_slug, seed, body_id, tile_idx, size_bytes, mtime_unix_s)`.
/// Breadth-first over rooms then bodies then tiles. Returns the
/// total count.
pub fn enumerate_tiles<F>(mut f: F) -> i32
where
    F: FnMut(&str, u64, u32, i32, u64, u64),
{
    let dir = match saves_dir() {
        Some(d) => d,
        None => return 0,
    };
    let rooms_root = format!("{}/rooms", dir);
    let rd = match fs::read_dir(&rooms_root) {
        Ok(rd) => rd,
        Err(_) => return 0,
    };
    let mut total = 0i32;
    for re in rd.flatten() {
        let room_name = re.file_name().to_string_lossy().into_owned();
        if room_name.starts_with('.') {
            continue;
        }
        let world_root = format!("{}/{}", rooms_root, room_name);
        let wd = match fs::read_dir(&world_root) {
            Ok(wd) => wd,
            Err(_) => continue,
        };
        for we in wd.flatten() {
            let world_name = we.file_name().to_string_lossy().into_owned();
            if world_name.starts_with('.') {
                continue;
            }
            let seed = match parse_seed_from_dir(&world_name) {
                Some(s) => s,
                None => continue,
            };
            let body_root = format!("{}/{}", world_root, world_name);
            let bd = match fs::read_dir(&body_root) {
                Ok(bd) => bd,
                Err(_) => continue,
            };
            for be in bd.flatten() {
                let body_name = be.file_name().to_string_lossy().into_owned();
                if body_name.starts_with('.') {
                    continue;
                }
                let body_id = match parse_body_from_dir(&body_name) {
                    Some(b) => b,
                    None => continue,
                };
                let tile_root = format!("{}/{}", body_root, body_name);
                let td = match fs::read_dir(&tile_root) {
                    Ok(td) => td,
                    Err(_) => continue,
                };
                for te in td.flatten() {
                    let tile_name = te.file_name().to_string_lossy().into_owned();
                    if tile_name.starts_with('.') {
                        continue;
                    }
                    match tile_name.rfind('.') {
                        Some(d) if &tile_name[d..] == ".col" => {}
                        _ => continue,
                    }
                    let tile_idx = c_atoi(tile_name.as_bytes());
                    let tile_path_buf = format!("{}/{}", tile_root, tile_name);
                    let md = match fs::metadata(&tile_path_buf) {
                        Ok(m) => m,
                        Err(_) => continue,
                    };
                    f(
                        &room_name,
                        seed,
                        body_id,
                        tile_idx,
                        md.len(),
                        mtime_unix(&md),
                    );
                    total += 1;
                }
            }
        }
    }
    total
}

/* ----------------------------------------------------------------- */
/* /saves/body bulk download: one body's persisted columns as a single
 * binary blob. Layout (little-endian):
 *   u8[4] magic "TBOD", u32 version, u32 body_id, u64 seed,
 *   u32 tile_count, u32 depth, then { u32 tile_idx, u8[depth] } per
 *   tile. */

fn blob_header(out: &mut [u8], body_id: u32, seed: u64, tile_count: u32) {
    wr_u32(out, 0, BODY_BLOB_MAGIC);
    wr_u32(out, 4, BODY_BLOB_VERSION);
    wr_u32(out, 8, body_id);
    wr_u64(out, 12, seed);
    wr_u32(out, 20, tile_count);
    wr_u32(out, 24, WORLD_MAX_DEPTH as u32);
}

/// Read one .col file's column payload, tolerating v0 and v1 like
/// `load_world` (without the live-world partial-overlay side effect -
/// this loads into a scratch buffer exactly as the C code does).
fn read_col_payload(path: &str, col: &mut [u8; DEPTH]) -> bool {
    let data = match fs::read(path) {
        Ok(d) => d,
        Err(_) => return false,
    };
    if data.len() < TILE_HEADER_SIZE {
        return false;
    }
    let magic = rd_u32(&data, 0);
    let ver = rd_u32(&data, 4);
    let depth = rd_u32(&data, 8);
    if magic == TILE_MAGIC && ver <= TILE_VERSION && depth == WORLD_MAX_DEPTH as u32 {
        if data.len() < TILE_HEADER_SIZE + DEPTH {
            return false;
        }
        col.copy_from_slice(&data[TILE_HEADER_SIZE..TILE_HEADER_SIZE + DEPTH]);
        true
    } else {
        /* Legacy v0: exactly 128 raw bytes (a spill byte rejects). */
        if data.len() != DEPTH {
            return false;
        }
        col.copy_from_slice(&data);
        true
    }
}

/// Port of `saves_body_blob()`. On success returns true with the blob
/// length in `*out_len`. Returns false if the blob would exceed
/// `out.len()` (with `*out_len` set to the required size).
pub fn body_blob(room: &str, seed: u64, body_id: u32, out: &mut [u8], out_len: &mut usize) -> bool {
    *out_len = 0;
    let dir_root = match saves_dir() {
        Some(d) => d,
        None => return false,
    };
    let cap = out.len();
    let dir = body_dir(&dir_root, room, seed, body_id);

    /* Snapshot the directory once; the C code re-opendirs for the
     * second pass but each record is parsed independently so a single
     * listing is equivalent. */
    let names: Vec<String> = match fs::read_dir(&dir) {
        Ok(rd) => rd
            .flatten()
            .map(|e| e.file_name().to_string_lossy().into_owned())
            .collect(),
        Err(_) => {
            /* Empty / missing dir is success with zero tiles - return
             * a well-formed empty blob so the client can tell "no
             * edits" from "fetch failed". */
            if cap < BODY_BLOB_HEADER {
                *out_len = BODY_BLOB_HEADER;
                return false;
            }
            blob_header(out, body_id, seed, 0);
            *out_len = BODY_BLOB_HEADER;
            return true;
        }
    };

    let is_col = |name: &str| -> Option<i32> {
        if name.starts_with('.') {
            return None;
        }
        match name.rfind('.') {
            Some(d) if &name[d..] == ".col" => {}
            _ => return None,
        }
        let tile = c_atoi(name.as_bytes());
        if tile < 0 {
            return None;
        }
        Some(tile)
    };

    /* First pass: count candidate tiles so we can size-check before
     * writing anything. */
    let tile_count = names.iter().filter(|n| is_col(n).is_some()).count();

    let record_size = 4 + DEPTH;
    let needed = BODY_BLOB_HEADER + tile_count * record_size;
    *out_len = needed;
    if needed > cap {
        return false;
    }

    blob_header(out, body_id, seed, tile_count as u32);

    /* Second pass: emit each tile's record. */
    let mut write_off = BODY_BLOB_HEADER;
    let mut written = 0usize;
    for name in &names {
        if write_off + record_size > cap {
            break;
        }
        let tile = match is_col(name) {
            Some(t) => t,
            None => continue,
        };
        let path = format!("{}/{}", dir, name);
        let mut col = [0u8; DEPTH];
        if !read_col_payload(&path, &mut col) {
            eprintln!("[saves] body_blob: skipping unreadable {}", path);
            continue;
        }
        wr_u32(out, write_off, tile as u32);
        write_off += 4;
        out[write_off..write_off + DEPTH].copy_from_slice(&col);
        write_off += DEPTH;
        written += 1;
    }
    /* If the second pass skipped some unreadable files, rewrite the
     * header count so parsers don't read past the end. */
    if written != tile_count {
        wr_u32(out, 20, written as u32);
    }
    *out_len = write_off;
    true
}

/* ================================================================== */
/* Tests                                                              */
/* ================================================================== */

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;
    use std::process::Command;
    use tenebris_core::planet::{self, BodyId};

    /* The byte-compat methodology mirrors the world_water pin
     * harness: the REAL tenebris-c saves.c (+ the full core stack) is
     * gcc-compiled into target/c-harness/saves_harness, which writes
     * a scripted save tree and prints the expected read-back state as
     * key=value lines. The Rust tests then assert:
     *   1. the Rust port reads the C-written tree back to an
     *      identical state (FNV-64 hashes over blocks / water /
     *      origins / torches / poses / chat / blob / enumeration);
     *   2. the Rust port writes the same scripted tree BYTE-FOR-BYTE
     *      (per-file compare; only manifest.dat + the *.log audit
     *      files differ, by their embedded wall-clock timestamps, and
     *      those are compared field-wise with timestamps masked);
     *   3. the C harness in read mode accepts the Rust-written tree
     *      and reports the same state. */

    const ROOM: &str = "ABC123";
    const SEED: u64 = 0xDEADBEEF;

    /* saves module state is process-global (like the C static);
     * serialize every test through one lock. */
    static TEST_LOCK: Mutex<()> = Mutex::new(());
    fn lock() -> std::sync::MutexGuard<'static, ()> {
        TEST_LOCK.lock().unwrap_or_else(|e| e.into_inner())
    }

    fn fwd(p: &Path) -> String {
        p.to_string_lossy().replace('\\', "/")
    }

    fn scratch_dir(tag: &str) -> std::path::PathBuf {
        let d = std::env::temp_dir().join(format!(
            "tenebris-saves-{}-{}",
            tag,
            std::process::id()
        ));
        let _ = fs::remove_dir_all(&d);
        fs::create_dir_all(&d).unwrap();
        d
    }

    /* ---- FNV-1a-64 canonical hashes (mirror the harness) ---- */

    struct Fnv(u64);
    impl Fnv {
        fn new() -> Fnv {
            Fnv(14695981039346656037)
        }
        fn acc(&mut self, p: &[u8]) {
            for &b in p {
                self.0 ^= b as u64;
                self.0 = self.0.wrapping_mul(1099511628211);
            }
        }
        fn done(self) -> u64 {
            self.0
        }
    }

    fn hash_blocks(w: &World) -> u64 {
        let mut h = Fnv::new();
        h.acc(&w.blocks);
        h.done()
    }

    fn hash_water(w: &World) -> u64 {
        let mut h = Fnv::new();
        for t in 0..w.tile_count {
            h.acc(world_water::state_column(w, t).unwrap());
        }
        h.done()
    }

    fn hash_origins_tile(w: &World, tile: i32) -> u64 {
        let mut e = [OriginDiffEntry::default(); DEPTH];
        let mut n = world_water::origin_enum_tile(w, tile, &mut e) as usize;
        if n > DEPTH {
            n = DEPTH;
        }
        e[..n].sort_by_key(|x| x.depth);
        let mut h = Fnv::new();
        for entry in &e[..n] {
            h.acc(&[entry.depth, entry.origin_count]);
            let c = (entry.origin_count as usize).min(WATER_ORIGIN_MAX);
            for k in 0..c {
                h.acc(&entry.origin_tile[k].to_le_bytes());
                h.acc(&[entry.origin_depth[k]]);
            }
        }
        h.done()
    }

    fn hash_torches(t: &[Torch]) -> u64 {
        let mut h = Fnv::new();
        for x in t {
            h.acc(&x.tile_idx.to_le_bytes());
            for k in 0..3 {
                h.acc(&x.pos[k].to_le_bytes());
            }
            for k in 0..3 {
                h.acc(&x.up[k].to_le_bytes());
            }
        }
        h.done()
    }

    fn hash_player(p: &PlayerPose) -> u64 {
        let mut h = Fnv::new();
        h.acc(&serialize_pose(p, p.version));
        h.done()
    }

    fn hash_backlog(msgs: &[ChatMsg]) -> u64 {
        let mut h = Fnv::new();
        for m in msgs {
            h.acc(m.name.as_bytes());
            h.acc(b"|");
            h.acc(m.text.as_bytes());
            h.acc(b"\n");
        }
        h.done()
    }

    fn hash_sessions() -> (u64, i32) {
        let mut buf = vec![0u8; 64 * 1024];
        let n = audit_tail("sessions", 1000, &mut buf);
        let mut h = Fnv::new();
        let mut lines = 0i32;
        for line in c_lines(&buf[..n]) {
            let k = line
                .iter()
                .position(|&b| b == b'\t')
                .map(|t| t + 1)
                .unwrap_or(line.len());
            h.acc(&line[k..]);
            h.acc(b"\n");
            lines += 1;
        }
        (h.done(), lines)
    }

    fn hash_enum() -> (u64, i32) {
        let mut acc = Fnv::new().done();
        let count = enumerate_tiles(|room, seed, body, tile, size, _mtime| {
            let mut h = Fnv::new();
            h.acc(room.as_bytes());
            h.acc(&[0u8]);
            h.acc(&seed.to_le_bytes());
            h.acc(&body.to_le_bytes());
            h.acc(&tile.to_le_bytes());
            h.acc(&size.to_le_bytes());
            acc ^= h.done();
        });
        (acc, count)
    }

    /* ---- scripted content, mirrored from saves_harness.c ---- */

    fn make_world() -> World {
        let body = planet::get(BodyId::Tenebris);
        let mut w = World::create(&body, 3);
        while !w.gen_complete() {
            w.stream_gen(100);
        }
        w
    }

    fn fill_pattern(w: &mut World, tile: i32, mul: i32, add: i32) {
        for d in 0..DEPTH {
            w.blocks[tile as usize * DEPTH + d] = ((d as i32 * mul + add) & 0xFF) as u8;
        }
    }

    fn apply_scripted_edits(w: &mut World) {
        fill_pattern(w, 5, 7, 155);
        for d in 40..56 {
            let s = (if d & 1 == 1 { 0x80u8 } else { 0x40u8 }) | (d % 7) as u8;
            world_water::set_state(w, 9, d, s);
        }
        let adds: [(i32, u32, u8); 6] = [
            (40, 6, 39),
            (40, 8, 41),
            (41, 7, 40),
            (55, 5, 54),
            (55, 6, 54),
            (55, 8, 54),
        ];
        for (depth, t, d) in adds {
            world_water::origin_add(w, 7, depth, OriginRef { tile: t, depth: d });
        }
    }

    fn scripted_torches() -> [Torch; 3] {
        [
            Torch {
                tile_idx: 42,
                pos: [1.5, -2.25, 3.125],
                up: [0.0, 1.0, 0.0],
            },
            Torch {
                tile_idx: 77,
                pos: [-0.001, 12345.678, -9.5],
                up: [0.70710678, 0.0, -0.70710678],
            },
            Torch {
                tile_idx: 9,
                pos: [0.0, 0.0, 0.0],
                up: [0.0, 0.0, 1.0],
            },
        ]
    }

    fn scripted_pose_a() -> PlayerPose {
        PlayerPose {
            version: 0,
            body_id: 0,
            pos_x: 1234.5678901234567,
            pos_y: -0.000123456789,
            pos_z: 9876543.25,
            yaw: 1.25,
            pitch: -0.25,
            inv_slot_type: [1, 2, 3, 0, 5, 0, 7, 8, 9],
            inv_slot_count: [10, -1, 32767, 0, 5, 0, 64, 1, 99],
            inv_selected: 4,
            inv_reserved: [0; 3],
        }
    }

    fn scripted_pose_b() -> PlayerPose {
        let mut p = PlayerPose::default();
        p.body_id = 2;
        p.pos_x = -1.5;
        p.pos_y = 2.5;
        p.pos_z = -3.5;
        p.yaw = 0.5;
        p.pitch = 0.125;
        p.inv_slot_type[0] = 4;
        p.inv_slot_count[0] = 7;
        p
    }

    fn write_fixtures(dir: &str) {
        let body_dir = format!("{}/rooms/{}/world-deadbeef/body-0", dir, ROOM);
        let players_dir = format!("{}/rooms/{}/players", dir, ROOM);

        let mut v0 = [0u8; DEPTH];
        for d in 0..DEPTH {
            v0[d] = ((d * 3 + 1) & 0xFF) as u8;
        }
        fs::write(format!("{}/200.col", body_dir), v0).unwrap();

        fs::write(format!("{}/201.col", body_dir), [0xABu8; 64]).unwrap();

        let mut v1 = [0u8; TILE_HEADER_SIZE + DEPTH];
        wr_u32(&mut v1, 0, TILE_MAGIC);
        wr_u32(&mut v1, 4, TILE_VERSION);
        wr_u32(&mut v1, 8, WORLD_MAX_DEPTH as u32);
        wr_u32(&mut v1, 12, 0);
        for d in 0..DEPTH {
            v1[TILE_HEADER_SIZE + d] = ((d * 5 + 2) & 0xFF) as u8;
        }
        fs::write(format!("{}/99zz.col", body_dir), v1).unwrap();

        let mut pv1 = [0u8; 40];
        wr_u32(&mut pv1, 0, 1);
        wr_u32(&mut pv1, 4, 3);
        pv1[8..16].copy_from_slice(&1.0f64.to_le_bytes());
        pv1[16..24].copy_from_slice(&2.0f64.to_le_bytes());
        pv1[24..32].copy_from_slice(&3.0f64.to_le_bytes());
        pv1[32..36].copy_from_slice(&0.5f32.to_le_bytes());
        pv1[36..40].copy_from_slice(&(-0.5f32).to_le_bytes());
        fs::write(format!("{}/legacy.dat", players_dir), pv1).unwrap();
    }

    /// Mirror of the harness write mode (minus the printed
    /// expectations). Returns the edited world.
    fn rust_write_tree(dir: &str) -> World {
        assert!(init(dir), "saves::init({}) failed", dir);
        let mut w = make_world();
        apply_scripted_edits(&mut w);

        assert!(write_tile(&mut w, ROOM, SEED, 5));
        assert!(write_tile(&mut w, ROOM, SEED, 7));
        assert!(write_tile(&mut w, ROOM, SEED, 123));
        assert!(write_water_state(&w, ROOM, SEED, 9));
        assert!(write_water_origins(&w, ROOM, SEED, 7));
        assert!(write_water_origins(&w, ROOM, SEED, 8)); /* zero entries */

        let torches = scripted_torches();
        assert!(torches_write(ROOM, SEED, 0, &torches));
        assert!(torches_write(ROOM, SEED, 1, &[])); /* no file */

        assert!(write_player(ROOM, "Ruben Tipparach", &scripted_pose_a()));
        assert!(write_player("", "Alice", &scripted_pose_b()));
        assert!(!write_player(ROOM, "???", &scripted_pose_a())); /* sanitizes empty */

        write_fixtures(dir);

        session_log("login", "Alice", "");
        session_log("login", "Bob", ROOM);
        session_log("logout", "Bob", ROOM);
        global_chat_append("", "Alice", "hello world");
        global_chat_append(ROOM, "Bob", "hi\tthere\nx");
        chat_append(ROOM, "Bob", "second message");

        shutdown();
        w
    }

    /// Mirror of the harness read mode: load the tree at `dir` and
    /// produce the same key=value map. Returns the map plus the
    /// loaded world (reused by the flush_world coverage).
    fn rust_read_tree(dir: &str) -> (HashMap<String, String>, World) {
        let mut m: HashMap<String, String> = HashMap::new();
        let put = |m: &mut HashMap<String, String>, k: &str, v: String| {
            m.insert(k.to_string(), v);
        };
        assert!(init(dir), "saves::init({}) failed", dir);
        let mut w = make_world();

        put(&mut m, "loaded_cols", load_world(&mut w, ROOM, SEED).to_string());
        put(&mut m, "water_loaded", load_world_water(&mut w, ROOM, SEED).to_string());
        put(&mut m, "orig_tiles", load_world_water_origins(&mut w, ROOM, SEED).to_string());

        put(&mut m, "blocks_hash", hash_blocks(&w).to_string());
        put(&mut m, "water_hash", hash_water(&w).to_string());
        put(&mut m, "orig7_hash", hash_origins_tile(&w, 7).to_string());

        let mut t = [Torch::default(); TORCHES_MAX_COUNT];
        let tn = torches_load(ROOM, SEED, 0, &mut t) as usize;
        put(&mut m, "torches_loaded", tn.to_string());
        put(&mut m, "torch_hash", hash_torches(&t[..tn]).to_string());
        put(
            &mut m,
            "torches_b1",
            torches_load(ROOM, SEED, 1, &mut t).to_string(),
        );

        let pa = load_player(ROOM, "Ruben Tipparach");
        put(&mut m, "player_ok", (pa.is_some() as i32).to_string());
        put(
            &mut m,
            "player_hash",
            hash_player(&pa.unwrap_or_default()).to_string(),
        );
        put(
            &mut m,
            "caseins_ok",
            (load_player(ROOM, "RUBEN tipparach").is_some() as i32).to_string(),
        );
        let pb = load_player("", "Alice");
        put(&mut m, "player_pub_ok", (pb.is_some() as i32).to_string());
        put(
            &mut m,
            "player_pub_hash",
            hash_player(&pb.unwrap_or_default()).to_string(),
        );
        let pl = load_player(ROOM, "Legacy");
        put(&mut m, "legacy_ok", (pl.is_some() as i32).to_string());
        put(
            &mut m,
            "legacy_hash",
            hash_player(&pl.unwrap_or_default()).to_string(),
        );
        put(
            &mut m,
            "missing_ok",
            (load_player(ROOM, "Nobody").is_some() as i32).to_string(),
        );

        let msgs = chat_load_backlog(ROOM, CHAT_BACKLOG as i32);
        put(&mut m, "backlog_count", msgs.len().to_string());
        put(&mut m, "backlog_hash", hash_backlog(&msgs).to_string());
        let pubm = chat_load_backlog("", CHAT_BACKLOG as i32);
        put(&mut m, "backlog_pub_count", pubm.len().to_string());
        put(&mut m, "backlog_pub_hash", hash_backlog(&pubm).to_string());

        let (sh, slines) = hash_sessions();
        put(&mut m, "sessions_lines", slines.to_string());
        put(&mut m, "sessions_hash", sh.to_string());

        let mut blob = vec![0u8; 1 << 20];
        let mut blob_len = 0usize;
        assert!(body_blob(ROOM, SEED, 0, &mut blob, &mut blob_len));
        let mut h = Fnv::new();
        h.acc(&blob[..blob_len]);
        put(&mut m, "blob_len", blob_len.to_string());
        put(&mut m, "blob_hash", h.done().to_string());

        let (eh, ec) = hash_enum();
        put(&mut m, "enum_count", ec.to_string());
        put(&mut m, "enum_hash", eh.to_string());

        put(
            &mut m,
            "has_edits_b0",
            (room_body_has_edits(ROOM, SEED, 0) as i32).to_string(),
        );
        put(
            &mut m,
            "has_edits_b9",
            (room_body_has_edits(ROOM, SEED, 9) as i32).to_string(),
        );

        /* NOTE: saves stays initialized; callers shut down. */
        (m, w)
    }

    /* ---- C harness build + run ---- */

    fn repo_paths() -> (std::path::PathBuf, std::path::PathBuf, std::path::PathBuf) {
        let manifest = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        let c_src = manifest.join("../../../tenebris-c/src");
        let harness_c = manifest.join("tests/saves_harness.c");
        let shim_h = manifest.join("tests/saves_harness_win_shim.h");
        assert!(c_src.is_dir(), "tenebris-c sources not found at {:?}", c_src);
        (c_src, harness_c, shim_h)
    }

    fn build_harness() -> std::path::PathBuf {
        let (c_src, harness_c, shim_h) = repo_paths();
        let out_dir = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../target/c-harness");
        fs::create_dir_all(&out_dir).unwrap();
        let exe = out_dir.join(if cfg!(windows) {
            "saves_harness.exe"
        } else {
            "saves_harness"
        });

        /* Rebuild only when the harness or saves.c got newer. */
        let newest_src = [&harness_c, &c_src.join("server/saves.c"), &shim_h]
            .iter()
            .filter_map(|p| fs::metadata(p).ok().and_then(|m| m.modified().ok()))
            .max();
        if let (Ok(em), Some(sm)) = (
            fs::metadata(&exe).and_then(|m| m.modified()),
            newest_src,
        ) {
            if em >= sm {
                return exe;
            }
        }

        let core = [
            "core/world.c",
            "core/world_water.c",
            "core/world_light.c",
            "core/goldberg.c",
            "core/planet.c",
            "core/planet_gen.c",
            "core/blocks.c",
            "core/config.c",
            "core/math.c",
            "core/rng.c",
        ];
        let mut cmd = Command::new("gcc");
        cmd.arg("-O1")
            .arg("-std=c11")
            .arg("-D_GNU_SOURCE")
            .arg("-I")
            .arg(&c_src)
            /* The shim is a no-op outside _WIN32. */
            .arg("-include")
            .arg(&shim_h);
        if cfg!(windows) {
            cmd.arg("-D__USE_MINGW_ANSI_STDIO=1");
        }
        cmd.arg(&harness_c).arg(c_src.join("server/saves.c"));
        for c in core {
            cmd.arg(c_src.join(c));
        }
        cmd.arg("-o").arg(&exe).arg("-lm");
        let out = cmd
            .output()
            .expect("gcc not found - the saves byte-compat tests need gcc on PATH");
        assert!(
            out.status.success(),
            "harness compile failed:\n{}",
            String::from_utf8_lossy(&out.stderr)
        );
        exe
    }

    fn run_harness(exe: &Path, mode: &str, cwd: &Path, dir_arg: &str) -> HashMap<String, String> {
        let out = Command::new(exe)
            .arg(mode)
            .arg(dir_arg)
            .current_dir(cwd)
            .output()
            .expect("failed to spawn saves_harness");
        assert!(
            out.status.success(),
            "saves_harness {} failed:\nstdout:\n{}\nstderr:\n{}",
            mode,
            String::from_utf8_lossy(&out.stdout),
            String::from_utf8_lossy(&out.stderr)
        );
        parse_kv(&String::from_utf8_lossy(&out.stdout))
    }

    fn parse_kv(s: &str) -> HashMap<String, String> {
        let mut m = HashMap::new();
        for line in s.lines() {
            if let Some(eq) = line.find('=') {
                let key = &line[..eq];
                if !key.is_empty()
                    && key
                        .bytes()
                        .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'_')
                {
                    m.insert(key.to_string(), line[eq + 1..].to_string());
                }
            }
        }
        m
    }

    /* ---- tree comparison ---- */

    fn walk_files(root: &Path, base: &Path, out: &mut Vec<String>) {
        for ent in fs::read_dir(root).unwrap().flatten() {
            let p = ent.path();
            if p.is_dir() {
                walk_files(&p, base, out);
            } else {
                out.push(fwd(p.strip_prefix(base).unwrap()));
            }
        }
    }

    /// Files whose bytes legitimately differ between the C-written
    /// and Rust-written trees (embedded wall-clock timestamps).
    fn is_timestamped(rel: &str) -> bool {
        rel == "manifest.dat" || rel == "sessions.log" || rel == "chat.log"
    }

    fn compare_trees(a: &Path, b: &Path) {
        let mut fa = Vec::new();
        let mut fb = Vec::new();
        walk_files(a, a, &mut fa);
        walk_files(b, b, &mut fb);
        fa.sort();
        fb.sort();
        assert_eq!(fa, fb, "save tree file sets differ");
        for rel in &fa {
            let da = fs::read(a.join(rel)).unwrap();
            let db = fs::read(b.join(rel)).unwrap();
            if is_timestamped(rel) {
                if rel == "manifest.dat" {
                    /* magic+version and the reserved tail must match;
                     * first_seen_at (bytes 8..16) is wall clock. */
                    assert_eq!(&da[..8], &db[..8], "manifest header differs");
                    assert_eq!(&da[16..], &db[16..], "manifest reserved differs");
                } else {
                    /* logs: same line count, same fields after the
                     * leading timestamp. */
                    let la: Vec<Vec<u8>> = c_lines(&da)
                        .map(|l| {
                            let k = l.iter().position(|&b| b == b'\t').map(|t| t + 1).unwrap_or(0);
                            l[k..].to_vec()
                        })
                        .collect();
                    let lb: Vec<Vec<u8>> = c_lines(&db)
                        .map(|l| {
                            let k = l.iter().position(|&b| b == b'\t').map(|t| t + 1).unwrap_or(0);
                            l[k..].to_vec()
                        })
                        .collect();
                    assert_eq!(la, lb, "{} fields differ", rel);
                }
                continue;
            }
            /* hash compare + full compare for a readable failure */
            let mut ha = Fnv::new();
            ha.acc(&da);
            let mut hb = Fnv::new();
            hb.acc(&db);
            assert_eq!(
                ha.done(),
                hb.done(),
                "byte mismatch in {} (sizes {} vs {})",
                rel,
                da.len(),
                db.len()
            );
            assert_eq!(da, db, "byte mismatch in {}", rel);
        }
    }

    /* ---- the main byte-compat round-trip ---- */

    #[test]
    fn saves_c_byte_compat_roundtrip() {
        let _g = lock();
        let exe = build_harness();
        let scratch = scratch_dir("compat");

        /* 1. C writes tree A (relative path; harness cwd = scratch so
         *    the C mkdir_p never sees a drive-letter component). */
        let exp = run_harness(&exe, "write", &scratch, "A");
        assert_eq!(exp.get("harness_ok").map(String::as_str), Some("1"));
        assert_eq!(exp.get("sanit_reject").map(String::as_str), Some("0"));
        assert_eq!(exp.get("zero_orig_ok").map(String::as_str), Some("1"));
        assert_eq!(exp.get("torches_empty_ok").map(String::as_str), Some("1"));

        /* 2. Rust writes tree B with the same scripted content. */
        let b_dir = fwd(&scratch.join("B"));
        rust_write_tree(&b_dir);

        /* 3. The two trees must match file-for-file, byte-for-byte
         *    (timestamped files compared with clocks masked). */
        compare_trees(&scratch.join("A"), &scratch.join("B"));

        /* 4. Rust reads the C-written tree; every observed value must
         *    equal the C harness's expectations. */
        let a_dir = fwd(&scratch.join("A"));
        let (got, mut w) = rust_read_tree(&a_dir);
        assert_eq!(got.get("loaded_cols").map(String::as_str), Some("5"));
        assert_eq!(got.get("water_loaded").map(String::as_str), Some("1"));
        assert_eq!(got.get("orig_tiles").map(String::as_str), Some("1"));
        assert_eq!(got.get("torches_loaded").map(String::as_str), Some("3"));
        assert_eq!(got.get("torches_b1").map(String::as_str), Some("0"));
        assert_eq!(got.get("player_ok").map(String::as_str), Some("1"));
        assert_eq!(got.get("caseins_ok").map(String::as_str), Some("1"));
        assert_eq!(got.get("player_pub_ok").map(String::as_str), Some("1"));
        assert_eq!(got.get("legacy_ok").map(String::as_str), Some("1"));
        assert_eq!(got.get("missing_ok").map(String::as_str), Some("0"));
        for key in [
            "blocks_hash",
            "water_hash",
            "orig7_hash",
            "torch_hash",
            "player_hash",
            "player_pub_hash",
            "legacy_hash",
            "backlog_count",
            "backlog_hash",
            "backlog_pub_count",
            "backlog_pub_hash",
            "sessions_lines",
            "sessions_hash",
            "blob_len",
            "blob_hash",
            "enum_count",
            "enum_hash",
            "has_edits_b0",
            "has_edits_b9",
        ] {
            assert_eq!(
                got.get(key),
                exp.get(key),
                "Rust read of C tree disagrees on {}",
                key
            );
        }

        /* flush_world coverage, reusing the loaded world: only dirty
         * tiles get written, and their dirty bits clear. */
        {
            for t in 0..w.tile_count {
                w.tile_clear_dirty(t);
            }
            w.tile_mark_dirty(11);
            w.tile_mark_dirty(12);
            assert_eq!(flush_world(&mut w, ROOM, SEED), 2);
            assert!(!w.tile_dirty(11));
            assert!(Path::new(&format!(
                "{}/rooms/{}/world-deadbeef/body-0/11.col",
                a_dir, ROOM
            ))
            .is_file());
            assert_eq!(flush_world(&mut w, ROOM, SEED), 0);
        }
        shutdown();

        /* 5. C reads the Rust-written tree and must agree with its
         *    own write-mode expectations. */
        let got_c = run_harness(&exe, "read", &scratch, "B");
        assert_eq!(got_c.get("harness_ok").map(String::as_str), Some("1"));
        assert_eq!(got_c.get("loaded_cols").map(String::as_str), Some("5"));
        assert_eq!(got_c.get("water_loaded").map(String::as_str), Some("1"));
        assert_eq!(got_c.get("orig_tiles").map(String::as_str), Some("1"));
        assert_eq!(got_c.get("torches_loaded").map(String::as_str), Some("3"));
        assert_eq!(got_c.get("player_ok").map(String::as_str), Some("1"));
        assert_eq!(got_c.get("caseins_ok").map(String::as_str), Some("1"));
        assert_eq!(got_c.get("player_pub_ok").map(String::as_str), Some("1"));
        assert_eq!(got_c.get("legacy_ok").map(String::as_str), Some("1"));
        assert_eq!(got_c.get("missing_ok").map(String::as_str), Some("0"));
        for key in [
            "blocks_hash",
            "water_hash",
            "orig7_hash",
            "torch_hash",
            "player_hash",
            "player_pub_hash",
            "legacy_hash",
            "backlog_count",
            "backlog_hash",
            "backlog_pub_count",
            "backlog_pub_hash",
            "sessions_lines",
            "sessions_hash",
            "blob_len",
            "blob_hash",
            "enum_count",
            "enum_hash",
            "has_edits_b0",
            "has_edits_b9",
        ] {
            assert_eq!(
                got_c.get(key),
                exp.get(key),
                "C read of Rust tree disagrees on {}",
                key
            );
        }

        let _ = fs::remove_dir_all(&scratch);
    }

    /* ---- focused unit tests (no world gen, no C harness) ---- */

    #[test]
    fn saves_name_to_key_rules() {
        assert_eq!(name_to_key("Ruben Tipparach").as_deref(), Some("ruben_tipparach"));
        assert_eq!(name_to_key("A-b_c9").as_deref(), Some("a-b_c9"));
        assert_eq!(name_to_key("???"), None);
        assert_eq!(name_to_key(""), None);
        /* 63-byte cap (C key[64]). */
        let long = "x".repeat(100);
        assert_eq!(name_to_key(&long).as_deref(), Some("x".repeat(63).as_str()));
    }

    #[test]
    fn saves_player_record_edge_cases() {
        let _g = lock();
        let scratch = scratch_dir("player");
        let dir = fwd(&scratch);
        assert!(init(&dir));

        /* Round-trip stamps version 2 and preserves every field. */
        let pose = scripted_pose_a();
        assert!(write_player("", "Edge Case", &pose));
        let got = load_player("", "edge case").unwrap();
        assert_eq!(got.version, PLAYER_VERSION);
        assert_eq!(got.body_id, pose.body_id);
        assert_eq!(got.pos_x, pose.pos_x);
        assert_eq!(got.inv_slot_count, pose.inv_slot_count);
        assert_eq!(got.inv_selected, 4);
        /* The file is exactly the C struct's 80 bytes. */
        let path = format!("{}/rooms/__public__/players/edge_case.dat", dir);
        assert_eq!(fs::read(&path).unwrap().len(), PLAYER_POSE_SIZE);

        /* Short (< 40 byte) records are rejected. */
        fs::write(format!("{}/rooms/__public__/players/short.dat", dir), [0u8; 39]).unwrap();
        assert!(load_player("", "Short").is_none());

        /* Unknown version is rejected. */
        let mut v9 = serialize_pose(&pose, 9);
        fs::write(format!("{}/rooms/__public__/players/vnine.dat", dir), v9).unwrap();
        assert!(load_player("", "VNine").is_none());

        /* A 60-byte v2 record loads with the unread tail zeroed
         * (C freads into a memset struct). */
        v9 = serialize_pose(&pose, PLAYER_VERSION);
        fs::write(
            format!("{}/rooms/__public__/players/parted.dat", dir),
            &v9[..60],
        )
        .unwrap();
        let p = load_player("", "Parted").unwrap();
        assert_eq!(p.inv_slot_type, [1, 2, 3, 0, 5, 0, 7, 8, 9]);
        assert_eq!(p.inv_slot_count[0], 10); /* bytes 58..60 made it */
        assert_eq!(p.inv_slot_count[1..], [0i16; 8][..]); /* zero-filled */
        assert_eq!(p.inv_selected, 0);

        shutdown();
        let _ = fs::remove_dir_all(&scratch);
    }

    #[test]
    fn saves_audit_truncate_and_tail() {
        let _g = lock();
        let scratch = scratch_dir("audit");
        let dir = fwd(&scratch);
        assert!(init(&dir));

        /* Build an over-cap sessions.log by hand, then one append
         * triggers the truncation to AUDIT_FILE_MAX lines. */
        let path = format!("{}/sessions.log", dir);
        let mut big = String::new();
        for i in 0..(AUDIT_FILE_MAX + 100) {
            big.push_str(&format!("1000\tlogin\tuser{}\t__public__\n", i));
        }
        fs::write(&path, big).unwrap();
        session_log("logout", "tail-marker", "");
        let data = fs::read_to_string(&path).unwrap();
        let lines: Vec<&str> = data.lines().collect();
        assert_eq!(lines.len(), AUDIT_FILE_MAX);
        /* Oldest lines dropped, newest kept. */
        assert!(lines[0].contains("user101"));
        assert!(lines.last().unwrap().contains("tail-marker"));

        /* audit_tail caps at max_lines and at the buffer size. */
        let mut out = vec![0u8; 1 << 20];
        let n = audit_tail("sessions", 10, &mut out);
        assert_eq!(c_lines(&out[..n]).count(), 10);
        assert_eq!(out[n], 0);
        let mut tiny = vec![0u8; 16];
        let n2 = audit_tail("sessions", 10, &mut tiny);
        assert_eq!(n2, 15); /* cap-1 with NUL terminator */
        assert_eq!(tiny[15], 0);
        let mut nul = vec![0u8; 8];
        assert_eq!(audit_tail("missing", 5, &mut nul), 0);

        shutdown();
        let _ = fs::remove_dir_all(&scratch);
    }

    #[test]
    fn saves_chat_backlog_filters() {
        let _g = lock();
        let scratch = scratch_dir("chat");
        let dir = fwd(&scratch);
        assert!(init(&dir));

        let path = format!("{}/chat.log", dir);
        let now = unix_now();
        let stale = now - 13 * 60 * 60;
        let fresh = now - 60;
        let mut log = String::new();
        log.push_str(&format!("{}\tOld\t__public__\tstale message\n", stale));
        log.push_str(&format!("{}\tAlice\t__public__\tfresh public\n", fresh));
        log.push_str(&format!("{}\tBob\tROOMX\tfresh other room\n", fresh));
        log.push_str("garbage line without tabs\n");
        log.push_str(&format!("{}\t\t__public__\tempty name dropped\n", fresh));
        fs::write(&path, log).unwrap();

        let msgs = chat_load_backlog("", 50);
        assert_eq!(msgs.len(), 1);
        assert_eq!(msgs[0].name, "Alice");
        assert_eq!(msgs[0].text, "fresh public");

        let other = chat_load_backlog("ROOMX", 50);
        assert_eq!(other.len(), 1);
        assert_eq!(other[0].name, "Bob");

        /* cap keeps only the newest N (oldest -> newest order). */
        let mut many = String::new();
        for i in 0..10 {
            many.push_str(&format!("{}\tA\t__public__\tmsg{}\n", fresh, i));
        }
        fs::write(&path, many).unwrap();
        let capped = chat_load_backlog("", 3);
        assert_eq!(capped.len(), 3);
        assert_eq!(capped[0].text, "msg7");
        assert_eq!(capped[2].text, "msg9");

        /* strip_log_chars on append: tabs/newlines become spaces. */
        global_chat_append("", "Eve", "a\tb\nc");
        let after = chat_load_backlog("", 50);
        assert_eq!(after.last().unwrap().text, "a b c");

        shutdown();
        let _ = fs::remove_dir_all(&scratch);
    }

    #[test]
    fn saves_init_rejects_bad_dirs() {
        let _g = lock();
        assert!(!init(""));
        assert!(saves_dir().is_none());
        /* Uninitialized module rejects writes. */
        assert!(!torches_write("", 1, 0, &scripted_torches()));
        assert!(load_player("", "anyone").is_none());
        assert_eq!(chat_load_backlog("", 10), Vec::<ChatMsg>::new());
    }
}
