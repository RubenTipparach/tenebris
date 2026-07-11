//! Port of `tenebris-c/src/client/client_kv.{c,h}`.
//!
//! Tiny key/value store the client side uses for profile and SP world
//! persistence. In-process map written through to a single text file
//! under the user's data directory:
//!
//!   - Linux/BSD: `$XDG_DATA_HOME/tenebris-c/kv.txt` (fallback
//!     `~/.local/share/tenebris-c/kv.txt`)
//!   - macOS: `~/Library/Application Support/tenebris-c/kv.txt`
//!   - Windows: `%APPDATA%\tenebris-c\kv.txt`
//!
//! File format: one `key=value` per line, both fields sanitised so
//! the framing chars (`\n`, `=`) never appear inside them. Loaded at
//! first use, rewritten in full (atomic tmp+rename) on every
//! mutation.
//!
//! Values are always strings. No quoting / escaping beyond the
//! sanitisation above. Keys should use the project's existing prefixes
//! (`tenebris-c:profile:<token>`, `tenebris-c:world:<name>`, etc.) so
//! the on-disk file is grep-friendly.
//!
//! # Renames
//!
//! `client_kv_set` -> `client_kv::set`, `client_kv_get` ->
//! `client_kv::get`, `client_kv_remove` -> `client_kv::remove`,
//! `client_kv_list_with_prefix` -> `client_kv::list_with_prefix`.
//! `get` / `list_with_prefix` return `Option<String>` instead of a
//! malloc'd `char*` / NULL.
//!
//! Note (carried over from the C tree): the native backend returns
//! `list_with_prefix` results in storage order. Callers that need a
//! defined order sort themselves.
//!
//! # Global state
//!
//! The native backend's map + file path live in a `static Mutex`
//! (`G_KV`), matching the single-threaded sokol app's C globals while
//! staying sound if a test runner calls in from multiple threads.

// Exercised by unit tests + the storage-layer siblings.
#![allow(dead_code)]

/* ====================================================================
 * Native backend - in-process map with write-through to a single file.
 * Loaded lazily on first access; rewritten in full on every mutation.
 *
 * The map is fixed-capacity so it doesn't grow unboundedly. Sized for
 * per-edit tile persistence (one key per edited column) on top of the
 * profile + world-pose + seed keys - see KV_MAX_ENTRIES. */

mod backend {
    use std::fs;
    use std::path::PathBuf;
    use std::sync::Mutex;

    /* The C port's 256 assumed "profiles + a few world poses". Per-edit
     * tile persistence stores one key per edited column, so a single
     * mined-out hillside blows past 256 and every LATER key - new
     * world poses, seeds, bags - was silently dropped (the "create
     * world does nothing" bug). 8192 tile columns x ~300 B/line stays
     * comfortably under load_file's 4 MB read guard. */
    pub(super) const KV_MAX_ENTRIES: usize = 8192;
    pub(super) const KV_KEY_MAX: usize = 127;
    /* The C capped values at 1023 bytes, which silently truncated any
     * torch / crop / bentity snapshot past ~17 entries - an unlimited
     * light build needs the whole blob. 256 KB comfortably holds tens
     * of thousands of CSV lines while keeping a runaway value from
     * bloating the file unbounded. */
    pub(super) const KV_VAL_MAX: usize = 256 * 1024;

    pub(super) struct KvEntry {
        pub(super) k: String,
        pub(super) v: String,
    }

    pub(super) struct KvStore {
        pub(super) entries: Vec<KvEntry>,
        pub(super) loaded: bool,
        pub(super) path: Option<PathBuf>,
    }

    pub(super) static G_KV: Mutex<KvStore> = Mutex::new(KvStore {
        entries: Vec::new(),
        loaded: false,
        path: None,
    });

    pub(super) fn lock() -> std::sync::MutexGuard<'static, KvStore> {
        G_KV.lock().unwrap_or_else(|e| e.into_inner())
    }

    /// Truncate to at most `max` bytes without splitting a UTF-8 char.
    /// The C side truncates at exact byte counts via snprintf; every
    /// key/value we actually store is ASCII, where the two behaviors
    /// are identical. Backing off to a char boundary keeps Rust's
    /// String invariant for any non-ASCII stragglers.
    fn truncate_bytes(s: &str, max: usize) -> &str {
        if s.len() <= max {
            return s;
        }
        let mut end = max;
        while !s.is_char_boundary(end) {
            end -= 1;
        }
        &s[..end]
    }

    /// Strip framing characters (= and newline) from a KEY. Keys are
    /// short identifiers that never legitimately contain them, so a
    /// soft scrub keeps the file format parseable.
    fn strip_framing(s: &str) -> String {
        s.chars()
            .map(|c| if c == '=' || c == '\n' || c == '\r' { '_' } else { c })
            .collect()
    }

    /// Escape a VALUE so the one-line-per-entry file format can carry
    /// it losslessly. Values are real payloads - the torch / crop /
    /// block-entity snapshots are multi-LINE CSV blobs, and the old
    /// strip-to-'_' scrub silently collapsed every multi-entry save to
    /// its first line on native builds (web localStorage never goes
    /// through this file). Percent-encodes just the framing chars.
    fn escape_value(s: &str) -> String {
        let mut out = String::with_capacity(s.len());
        for c in s.chars() {
            match c {
                '%' => out.push_str("%25"),
                '\n' => out.push_str("%0A"),
                '\r' => out.push_str("%0D"),
                _ => out.push(c),
            }
        }
        out
    }

    /// Reverse [`escape_value`]. Tolerant: a bare '%' that doesn't
    /// start a known escape (values written before the escaping
    /// existed) passes through unchanged.
    fn unescape_value(s: &str) -> String {
        let b = s.as_bytes();
        let mut out = String::with_capacity(s.len());
        let mut i = 0;
        while i < b.len() {
            if b[i] == b'%' && i + 2 < b.len() + 1 && i + 3 <= b.len() {
                match &b[i + 1..i + 3] {
                    b"25" => {
                        out.push('%');
                        i += 3;
                        continue;
                    }
                    b"0A" => {
                        out.push('\n');
                        i += 3;
                        continue;
                    }
                    b"0D" => {
                        out.push('\r');
                        i += 3;
                        continue;
                    }
                    _ => {}
                }
            }
            /* Multi-byte chars: copy the full char. */
            let ch_len = {
                let mut l = 1;
                while i + l < b.len() && (b[i + l] & 0xC0) == 0x80 {
                    l += 1;
                }
                l
            };
            out.push_str(&s[i..i + ch_len]);
            i += ch_len;
        }
        out
    }

    /// Resolve the cross-platform user data directory and stash the
    /// full `<dir>/kv.txt` path. The directory is created on first
    /// use; failures fall back to the current working directory so we
    /// at least get a kv.txt next to the binary rather than nothing.
    ///
    /// Deviation from C: the unix HOME lookup does not fall back to
    /// getpwuid() when $HOME is unset - std has no portable
    /// equivalent, and the env var is set in any session that can
    /// launch the game.
    fn resolve_path(store: &mut KvStore) {
        if store.path.is_some() {
            return;
        }

        let dir: Option<PathBuf> = {
            #[cfg(windows)]
            {
                std::env::var("APPDATA")
                    .ok()
                    .filter(|v| !v.is_empty())
                    .map(|v| PathBuf::from(v).join("tenebris-c"))
            }
            #[cfg(target_os = "macos")]
            {
                std::env::var("HOME")
                    .ok()
                    .filter(|v| !v.is_empty())
                    .map(|v| PathBuf::from(v).join("Library/Application Support/tenebris-c"))
            }
            #[cfg(not(any(windows, target_os = "macos")))]
            {
                if let Some(xdg) = std::env::var("XDG_DATA_HOME").ok().filter(|v| !v.is_empty())
                {
                    Some(PathBuf::from(xdg).join("tenebris-c"))
                } else {
                    std::env::var("HOME")
                        .ok()
                        .filter(|v| !v.is_empty())
                        .map(|v| PathBuf::from(v).join(".local/share/tenebris-c"))
                }
            }
        };

        match dir {
            Some(d) if fs::create_dir_all(&d).is_ok() => {
                store.path = Some(d.join("kv.txt"));
            }
            _ => {
                // Fallback: same directory as the binary's CWD. Better
                // than silently dropping saves.
                store.path = Some(PathBuf::from("tenebris-c-kv.txt"));
            }
        }
    }

    pub(super) fn load_file(store: &mut KvStore) {
        if store.loaded {
            return;
        }
        store.loaded = true;
        resolve_path(store);
        let path = store.path.as_ref().expect("path resolved above");
        let Ok(buf) = fs::read(path) else { return };
        if buf.len() > 4 * 1024 * 1024 {
            return;
        }

        // Parse: one `key=value\n` per line. Lines without `=` are
        // skipped.
        for line in buf.split(|&b| b == b'\n') {
            if store.entries.len() >= KV_MAX_ENTRIES {
                break;
            }
            let Some(eq) = line.iter().position(|&b| b == b'=') else {
                continue;
            };
            if eq == 0 {
                continue; // C: `eq > line`
            }
            let (klen, vlen) = (eq, line.len() - eq - 1);
            if klen > KV_KEY_MAX || vlen > KV_VAL_MAX {
                continue;
            }
            store.entries.push(KvEntry {
                k: String::from_utf8_lossy(&line[..eq]).into_owned(),
                v: String::from_utf8_lossy(&line[eq + 1..]).into_owned(),
            });
        }
    }

    /// Atomic-rewrite the kv file. Costs O(entries) per mutation,
    /// which is trivial at the entry counts we're at.
    ///
    /// Deviation from C: C's rename() fails when the target exists on
    /// Windows (so the C native build would drop every rewrite after
    /// the first there); Rust's fs::rename replaces the target on
    /// every platform, which is the atomic-replace the C code intends.
    pub(super) fn save_file(store: &KvStore) {
        let Some(path) = store.path.as_ref() else { return };
        let mut tmp = path.as_os_str().to_owned();
        tmp.push(".tmp");
        let tmp = PathBuf::from(tmp);
        let mut out = String::new();
        for e in &store.entries {
            out.push_str(&e.k);
            out.push('=');
            out.push_str(&e.v);
            out.push('\n');
        }
        if fs::write(&tmp, out.as_bytes()).is_err() {
            return;
        }
        if fs::rename(&tmp, path).is_err() {
            let _ = fs::remove_file(&tmp);
        }
    }

    fn find(store: &KvStore, k: &str) -> Option<usize> {
        store.entries.iter().position(|e| e.k == k)
    }

    pub fn set(key: &str, val: &str) {
        if key.is_empty() {
            return;
        }
        let mut store = lock();
        load_file(&mut store);
        let idx = match find(&store, key) {
            Some(i) => i,
            None => {
                if store.entries.len() >= KV_MAX_ENTRIES {
                    /* Loud, not silent: a dropped write here is lost
                     * player data (world pose / seed / tile column). */
                    println!(
                        "[kv] ERROR store full ({KV_MAX_ENTRIES} entries) - dropping key '{key}'"
                    );
                    return;
                }
                store.entries.push(KvEntry {
                    k: strip_framing(truncate_bytes(key, KV_KEY_MAX)),
                    v: String::new(),
                });
                store.entries.len() - 1
            }
        };
        store.entries[idx].v = escape_value(truncate_bytes(val, KV_VAL_MAX));
        save_file(&store);
    }

    pub fn get(key: &str) -> Option<String> {
        if key.is_empty() {
            return None;
        }
        let mut store = lock();
        load_file(&mut store);
        let idx = find(&store, key)?;
        Some(unescape_value(&store.entries[idx].v))
    }

    pub fn remove(key: &str) {
        if key.is_empty() {
            return;
        }
        let mut store = lock();
        load_file(&mut store);
        let Some(idx) = find(&store, key) else { return };
        // C: G_kv[idx] = G_kv[--G_kv_n] - a swap-remove.
        store.entries.swap_remove(idx);
        save_file(&store);
    }

    pub fn list_with_prefix(prefix: &str) -> Option<String> {
        let mut store = lock();
        load_file(&mut store);
        let mut out = String::new();
        let mut matches = 0;
        for e in &store.entries {
            let Some(suffix) = e.k.strip_prefix(prefix) else {
                continue;
            };
            if matches > 0 {
                out.push('\n');
            }
            out.push_str(suffix);
            matches += 1;
        }
        if matches == 0 {
            None
        } else {
            Some(out)
        }
    }
}

pub use backend::{get, list_with_prefix, remove, set};

/* ====================================================================
 * Test support - the kv map is process-global, so every test touching
 * it (here, settings.rs, profile.rs, persistence.rs) serializes on
 * TEST_LOCK and redirects the backing file to a per-test temp path. */

#[cfg(test)]
pub(crate) mod test_support {
    use std::path::PathBuf;
    use std::sync::{Mutex, MutexGuard};

    static TEST_LOCK: Mutex<()> = Mutex::new(());

    /// Serialize the calling test against every other kv-touching test
    /// and reset the store to an empty map backed by a fresh temp file
    /// (any stale file from a previous run is deleted). Keep the guard
    /// alive for the test's whole body.
    pub(crate) fn begin(test_name: &str) -> MutexGuard<'static, ()> {
        let guard = TEST_LOCK.lock().unwrap_or_else(|e| e.into_inner());
        let path = std::env::temp_dir().join(format!(
            "tenebris-rs-kvtest-{}-{}.txt",
            std::process::id(),
            test_name
        ));
        let _ = std::fs::remove_file(&path);
        reset_with_path(path);
        guard
    }

    /// Point the store at `path` and mark it unloaded so the next
    /// access reads that file from scratch.
    pub(crate) fn reset_with_path(path: PathBuf) {
        let mut store = super::backend::lock();
        store.entries.clear();
        store.loaded = false;
        store.path = Some(path);
    }

    /// Drop the in-memory map but keep the path, forcing the next
    /// access to re-read the on-disk file (simulates an app restart).
    pub(crate) fn reload_from_disk() {
        let mut store = super::backend::lock();
        store.entries.clear();
        store.loaded = false;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn set_get_remove_round_trip() {
        let _g = test_support::begin("set_get_remove_round_trip");
        assert_eq!(get("tenebris-c:missing"), None);
        set("tenebris-c:a", "hello");
        assert_eq!(get("tenebris-c:a").as_deref(), Some("hello"));
        set("tenebris-c:a", "world");
        assert_eq!(get("tenebris-c:a").as_deref(), Some("world"));
        remove("tenebris-c:a");
        assert_eq!(get("tenebris-c:a"), None);
        remove("tenebris-c:a"); // no-op when absent
    }

    #[test]
    fn empty_key_is_a_no_op() {
        let _g = test_support::begin("empty_key_is_a_no_op");
        set("", "x");
        assert_eq!(get(""), None);
        remove("");
        assert_eq!(list_with_prefix("zzz-nope"), None);
    }

    #[test]
    fn empty_value_round_trips() {
        let _g = test_support::begin("empty_value_round_trips");
        set("k", "");
        assert_eq!(get("k").as_deref(), Some(""));
    }

    #[test]
    fn list_with_prefix_strips_and_orders_by_storage() {
        let _g = test_support::begin("list_with_prefix");
        set("pfx:b", "1");
        set("pfx:a", "2");
        set("other", "3");
        // Native backend: storage (insertion) order, not sorted.
        assert_eq!(list_with_prefix("pfx:").as_deref(), Some("b\na"));
        assert_eq!(list_with_prefix("nomatch:"), None);
        // Empty prefix matches every key.
        assert_eq!(list_with_prefix("").as_deref(), Some("pfx:b\npfx:a\nother"));
    }

    #[test]
    fn survives_reload_from_disk() {
        let _g = test_support::begin("survives_reload_from_disk");
        set("tenebris-c:p", "persisted");
        set("tenebris-c:q", "also");
        remove("tenebris-c:q");
        test_support::reload_from_disk();
        assert_eq!(get("tenebris-c:p").as_deref(), Some("persisted"));
        assert_eq!(get("tenebris-c:q"), None);
    }

    #[test]
    fn keys_scrub_but_values_round_trip_losslessly() {
        let _g = test_support::begin("framing_chars_scrubbed");
        /* Keys still scrub framing chars to '_' (short identifiers).
         * VALUES escape instead: the torch / crop / bentity snapshots
         * are multi-line CSV blobs, and the old value scrub silently
         * collapsed them to one line on native builds. */
        set("k=ey\n", "va=lue\r\n!with %25 literal");
        assert_eq!(get("k_ey_").as_deref(), Some("va=lue\r\n!with %25 literal"));
        test_support::reload_from_disk();
        assert_eq!(get("k_ey_").as_deref(), Some("va=lue\r\n!with %25 literal"));
        /* The multi-entry shape that used to break: N lines in, N out. */
        let blob = "1,2,3\n4,5,6\n7,8,9";
        set("tenebris-c:torches:t:0", blob);
        test_support::reload_from_disk();
        assert_eq!(get("tenebris-c:torches:t:0").as_deref(), Some(blob));
    }

    #[test]
    fn key_cap_matches_c_but_values_hold_big_blobs() {
        let _g = test_support::begin("key_and_value_byte_caps");
        let long_key = "k".repeat(200);
        /* DELIBERATE deviation from C: its 1023-byte value cap silently
         * truncated torch / crop snapshots past ~17 entries. The Rust
         * cap holds whole big-base blobs; only truly runaway values
         * (>KV_VAL_MAX) still clamp. */
        let long_val = "v".repeat(2000);
        set(&long_key, &long_val);
        let stored = get(&"k".repeat(127)).expect("truncated key present");
        assert_eq!(stored.len(), 2000, "2 KB value survives intact");
        test_support::reload_from_disk();
        assert_eq!(get(&"k".repeat(127)).map(|v| v.len()), Some(2000));
        /* The cap still exists for runaway values. */
        let runaway = "w".repeat(backend::KV_VAL_MAX + 10);
        set("tenebris-c:runaway", &runaway);
        assert_eq!(
            get("tenebris-c:runaway").map(|v| v.len()),
            Some(backend::KV_VAL_MAX)
        );
    }

    #[test]
    fn capacity_caps_at_max_entries() {
        let _g = test_support::begin("capacity_caps_at_max");
        for i in 0..backend::KV_MAX_ENTRIES {
            set(&format!("cap:{i}"), "x");
        }
        set("cap:overflow", "x");
        assert_eq!(get("cap:overflow"), None);
        // Existing keys still writable at capacity.
        set("cap:0", "updated");
        assert_eq!(get("cap:0").as_deref(), Some("updated"));
    }
}
