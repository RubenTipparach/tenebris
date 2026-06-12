//! Port of `tenebris-c/src/client/client_kv.{c,h}`.
//!
//! Tiny key/value store the client side uses for profile and SP world
//! persistence. Two backends, same API:
//!
//! - Web build (`target_os = "emscripten"`): bridged to
//!   `window.localStorage` via four extern JS functions (see the JS
//!   contract below). Same per-origin storage browsers have always
//!   provided.
//! - Native build: in-process map written through to a single text
//!   file under the user's data directory:
//!
//!   - Linux/BSD: `$XDG_DATA_HOME/tenebris-c/kv.txt` (fallback
//!     `~/.local/share/tenebris-c/kv.txt`)
//!   - macOS: `~/Library/Application Support/tenebris-c/kv.txt`
//!   - Windows: `%APPDATA%\tenebris-c\kv.txt`
//!
//!   File format: one `key=value` per line, both fields sanitised so
//!   the framing chars (`\n`, `=`) never appear inside them. Loaded at
//!   first use, rewritten in full (atomic tmp+rename) on every
//!   mutation.
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
//! # JS contract for the emscripten extern fns
//!
//! The implementations live in a `--js-library` file shipped in a later
//! wave; they must replicate the C tree's `EM_JS` bodies exactly:
//!
//! - `kv_js_set(key, val)`: both args are pointers to NUL-terminated
//!   UTF-8 C strings; decode with `UTF8ToString` and call
//!   `window.localStorage.setItem(key, val)`. Exceptions (storage
//!   disabled / quota exceeded) are swallowed.
//! - `kv_js_get(key) -> char*`: `localStorage.getItem(key)`. Returns 0
//!   when the key is absent or on exception. Otherwise allocates
//!   `lengthBytesUTF8(s) + 1` bytes with `_malloc`, copies the value in
//!   with `stringToUTF8`, and returns the pointer. Ownership transfers
//!   to the caller, which must release it with `free()` (the
//!   emscripten heap allocator, not Rust's).
//! - `kv_js_remove(key)`: `localStorage.removeItem(key)`, exceptions
//!   swallowed.
//! - `kv_js_list_prefix(prefix) -> char*`: iterates every localStorage
//!   key, collects those that start with `prefix`, strips the prefix,
//!   sorts the remainders lexicographically, joins them with `'\n'`,
//!   and returns the result as a `_malloc`'d NUL-terminated UTF-8
//!   string. Returns 0 when there are no matches or on exception.
//!   Caller frees with `free()`.
//!
//! Note (carried over from the C tree): the web backend sorts
//! `list_with_prefix` results; the native backend returns them in
//! storage order. Callers that need a defined order sort themselves.
//!
//! # Global state
//!
//! The native backend's map + file path live in a `static Mutex`
//! (`G_KV`), matching the single-threaded sokol app's C globals while
//! staying sound if a test runner calls in from multiple threads.

// Not wired into the app loop until the main_web port lands (final
// client wave); exercised by unit tests + the storage-layer siblings.
#![allow(dead_code)]

/* ====================================================================
 * Web backend - straight passthrough to window.localStorage via the
 * extern JS functions declared above. */

#[cfg(target_os = "emscripten")]
mod backend {
    use std::ffi::{c_char, c_void, CStr, CString};

    extern "C" {
        fn kv_js_set(key: *const c_char, val: *const c_char);
        fn kv_js_get(key: *const c_char) -> *mut c_char;
        fn kv_js_remove(key: *const c_char);
        fn kv_js_list_prefix(prefix: *const c_char) -> *mut c_char;
        /// Emscripten heap `free` - releases the `_malloc` buffers the
        /// JS side hands back.
        fn free(ptr: *mut c_void);
    }

    /// Take ownership of a `_malloc`'d NUL-terminated UTF-8 string
    /// returned by the JS side: copy it into a Rust `String` and free
    /// the emscripten buffer. `None` for the JS null (0) return.
    unsafe fn take_js_string(p: *mut c_char) -> Option<String> {
        if p.is_null() {
            return None;
        }
        let s = CStr::from_ptr(p).to_string_lossy().into_owned();
        free(p as *mut c_void);
        Some(s)
    }

    pub fn set(key: &str, val: &str) {
        // C: client_kv_set passes the key straight through (NULL val
        // becomes ""); &str has no NULL case.
        let (Ok(k), Ok(v)) = (CString::new(key), CString::new(val)) else {
            return; // interior NUL: unrepresentable as a C string
        };
        unsafe { kv_js_set(k.as_ptr(), v.as_ptr()) };
    }

    pub fn get(key: &str) -> Option<String> {
        let k = CString::new(key).ok()?;
        unsafe { take_js_string(kv_js_get(k.as_ptr())) }
    }

    pub fn remove(key: &str) {
        let Ok(k) = CString::new(key) else { return };
        unsafe { kv_js_remove(k.as_ptr()) };
    }

    pub fn list_with_prefix(prefix: &str) -> Option<String> {
        let p = CString::new(prefix).ok()?;
        unsafe { take_js_string(kv_js_list_prefix(p.as_ptr())) }
    }
}

/* ====================================================================
 * Native backend - in-process map with write-through to a single file.
 * Loaded lazily on first access; rewritten in full on every mutation.
 *
 * The map is fixed-capacity so it doesn't grow unboundedly; for the
 * profile + SP-world usage that's a hard ceiling of well under 100
 * entries even on a busy install. */

#[cfg(not(target_os = "emscripten"))]
mod backend {
    use std::fs;
    use std::path::PathBuf;
    use std::sync::Mutex;

    pub(super) const KV_MAX_ENTRIES: usize = 256;
    pub(super) const KV_KEY_MAX: usize = 127;
    pub(super) const KV_VAL_MAX: usize = 1023;

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

    /// Strip framing characters (= and newline) from a string. The
    /// file format can't represent them and the keys / values we
    /// actually store (tokens, world names, CSV blobs) never
    /// legitimately contain them, so a soft scrub here keeps load/save
    /// round-tripping.
    fn strip_framing(s: &str) -> String {
        s.chars()
            .map(|c| if c == '=' || c == '\n' || c == '\r' { '_' } else { c })
            .collect()
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
                    return;
                }
                store.entries.push(KvEntry {
                    k: strip_framing(truncate_bytes(key, KV_KEY_MAX)),
                    v: String::new(),
                });
                store.entries.len() - 1
            }
        };
        store.entries[idx].v = strip_framing(truncate_bytes(val, KV_VAL_MAX));
        save_file(&store);
    }

    pub fn get(key: &str) -> Option<String> {
        if key.is_empty() {
            return None;
        }
        let mut store = lock();
        load_file(&mut store);
        let idx = find(&store, key)?;
        Some(store.entries[idx].v.clone())
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

#[cfg(all(test, not(target_os = "emscripten")))]
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

#[cfg(all(test, not(target_os = "emscripten")))]
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
    fn framing_chars_are_scrubbed_to_underscore() {
        let _g = test_support::begin("framing_chars_scrubbed");
        set("k=ey\n", "va=lue\r\n!");
        // Key and value both scrubbed; lookups use the scrubbed key.
        assert_eq!(get("k_ey_").as_deref(), Some("va_lue__!"));
        test_support::reload_from_disk();
        assert_eq!(get("k_ey_").as_deref(), Some("va_lue__!"));
    }

    #[test]
    fn key_and_value_byte_caps_match_c() {
        let _g = test_support::begin("key_and_value_byte_caps");
        let long_key = "k".repeat(200);
        let long_val = "v".repeat(2000);
        set(&long_key, &long_val);
        // Key truncated to 127 bytes, value to 1023 - same caps as the
        // C KV_KEY_MAX / KV_VAL_MAX snprintf buffers.
        let stored = get(&"k".repeat(127)).expect("truncated key present");
        assert_eq!(stored.len(), 1023);
        test_support::reload_from_disk();
        assert_eq!(get(&"k".repeat(127)).map(|v| v.len()), Some(1023));
    }

    #[test]
    fn capacity_caps_at_256_entries() {
        let _g = test_support::begin("capacity_caps_at_256");
        for i in 0..256 {
            set(&format!("cap:{i}"), "x");
        }
        set("cap:overflow", "x");
        assert_eq!(get("cap:overflow"), None);
        // Existing keys still writable at capacity.
        set("cap:0", "updated");
        assert_eq!(get("cap:0").as_deref(), Some("updated"));
    }
}
