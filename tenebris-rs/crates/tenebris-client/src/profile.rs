//! Port of `tenebris-c/src/client/profile.{c,h}`.
//!
//! Player profiles. A profile is just a (token, name) pair stored in
//! the client KV store (browser localStorage on web):
//!
//! ```text
//! tenebris-c:profile:<token>  =  <name>
//! tenebris-c:active-profile   =  <token>     (currently selected)
//! ```
//!
//! token is a 32-char lowercase hex string (16 random bytes) generated
//! when the profile is created. name is what other players see and
//! what the HUD shows. The token is the stable identifier - it
//! survives across renames and lets the server attach persistent state
//! to the right profile even if the name changes.
//!
//! # Renames
//!
//! `profile_create` -> `profile::create` (returns `Option<Profile>`
//! instead of bool + out-param), `profile_list` -> `profile::list`
//! (returns a Vec capped at `PROFILE_MAX`; the C `cap` parameter only
//! sized the caller's array), `profile_get_active` ->
//! `profile::get_active` (returns `Option<Profile>`), etc.
//!
//! # JS contract for the emscripten extern fn
//!
//! `profile_js_new_token() -> char*` lives in a `--js-library` file
//! shipped in a later wave; it must replicate the C EM_JS body:
//! fill a `Uint8Array(16)` via `crypto.getRandomValues`, hex-encode it
//! to a 32-char lowercase string (each byte zero-padded to two
//! digits), allocate `lengthBytesUTF8(hex) + 1` bytes with `_malloc`,
//! `stringToUTF8` the string in, and return the pointer. Returns 0 on
//! exception. Ownership transfers to the caller, which frees with
//! `free()` (the emscripten heap allocator).
//!
//! # Native token generation
//!
//! Mirrors the C fallback: read 16 bytes from `/dev/urandom`; when
//! that fails, mix `time(NULL) ^ (pid << 32)` through an LCG (not
//! cryptographic; good enough for an offline single-machine identifier
//! when urandom is unavailable). The C native build never targeted
//! Windows here (it includes unistd.h); on Windows the urandom open
//! always fails, so the port behaves like the C would on a unix host
//! without /dev/urandom and always takes the LCG path.

// Not wired into the app loop until the menu / main_web ports land;
// exercised by unit tests.
#![allow(dead_code)]

use crate::client_kv;

const PROFILE_KEY_PREFIX: &str = "tenebris-c:profile:";
const ACTIVE_KEY: &str = "tenebris-c:active-profile";

pub const PROFILE_NAME_MAX: usize = 31; // bytes, excluding terminator
pub const PROFILE_TOKEN_LEN: usize = 32; // hex chars
pub const PROFILE_MAX: usize = 16;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Profile {
    pub token: String,
    pub name: String,
}

/* ------------------------------------------------------------------ */
/* Token generation. We mix /dev/urandom (or the process PID + time as
 * a fallback) into a 16-byte buffer and hex-encode it, producing a
 * lowercase 32-char hex string. */
/* ------------------------------------------------------------------ */

/// Fill `bytes` with non-cryptographic randomness: /dev/urandom when
/// available, the time + pid LCG fallback otherwise. Shared by the
/// profile-token generator and the per-world terrain-seed roll
/// (menu::start_sp_for_world).
pub(crate) fn random_bytes(bytes: &mut [u8]) {
    use std::io::Read;

    let got = std::fs::File::open("/dev/urandom")
        .and_then(|mut f| f.read_exact(bytes))
        .is_ok();
    if !got {
        // Fallback: time + pid, splatted across the buffer. Not
        // cryptographic; good enough for an offline single-machine
        // identifier when urandom is unavailable. Same LCG constants
        // and byte extraction as the C build.
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default();
        let mut mix = now.as_secs() ^ ((std::process::id() as u64) << 32);
        #[cfg(windows)]
        {
            // Documented Windows-only extension: the C native build
            // never compiled here (unistd.h), and on Windows the
            // urandom open above ALWAYS fails, so the LCG fallback is
            // the only path. Seconds ^ pid alone would hand two
            // profiles created in the same second the same token, so
            // fold in sub-second time plus a process-local counter.
            // Still not cryptographic; same output shape.
            use std::sync::atomic::{AtomicU64, Ordering};
            static COUNTER: AtomicU64 = AtomicU64::new(0);
            mix ^= (now.subsec_nanos() as u64) << 20;
            // Fibonacci-hash spread of the counter (golden-ratio
            // constant, algorithm-identity per repo rules).
            mix ^= COUNTER
                .fetch_add(1, Ordering::Relaxed)
                .wrapping_mul(0x9E37_79B9_7F4A_7C15);
        }
        for b in bytes.iter_mut() {
            mix = mix
                .wrapping_mul(6364136223846793005)
                .wrapping_add(1442695040888963407);
            *b = (mix >> 56) as u8;
        }
    }
}

fn new_token() -> Option<String> {
    let mut bytes = [0u8; 16];
    random_bytes(&mut bytes);
    const HEX: &[u8; 16] = b"0123456789abcdef";
    let mut out = String::with_capacity(PROFILE_TOKEN_LEN);
    for b in bytes {
        out.push(HEX[(b >> 4) as usize] as char);
        out.push(HEX[(b & 0xF) as usize] as char);
    }
    Some(out)
}

/* ------------------------------------------------------------------ */
/* Public surface                                                      */
/* ------------------------------------------------------------------ */

fn name_is_valid(n: &str) -> bool {
    if n.is_empty() || n.len() > PROFILE_NAME_MAX {
        return false;
    }
    !n.chars().any(|c| c == '\n' || c == '\r' || c == ':')
}

fn profile_key(token: &str) -> String {
    format!("{PROFILE_KEY_PREFIX}{token}")
}

/// Byte-truncate to `max`, backing off to a char boundary (the C side
/// truncates via snprintf into fixed buffers; all real data is ASCII
/// where the two are identical).
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

pub fn module_init() {}

/// Enumerate stored profiles, sorted by name. At most `PROFILE_MAX`
/// entries (matching the C cap).
pub fn list() -> Vec<Profile> {
    let Some(tokens) = client_kv::list_with_prefix(PROFILE_KEY_PREFIX) else {
        return Vec::new();
    };
    let mut out = Vec::new();
    for token in tokens.split('\n') {
        if out.len() >= PROFILE_MAX {
            break;
        }
        let Some(name) = client_kv::get(&profile_key(token)) else {
            continue;
        };
        out.push(Profile {
            token: truncate_bytes(token, PROFILE_TOKEN_LEN).to_owned(),
            name: truncate_bytes(&name, PROFILE_NAME_MAX).to_owned(),
        });
    }
    // C: stable insertion sort by name (strcmp = byte order).
    out.sort_by(|a, b| a.name.as_bytes().cmp(b.name.as_bytes()));
    out
}

/// Create a new profile with the given display name. Generates a fresh
/// 32-char hex token, persists it, marks it active, and returns the
/// new profile. `None` on a bad name or token-generation failure.
pub fn create(name: &str) -> Option<Profile> {
    if !name_is_valid(name) {
        return None;
    }
    let token = new_token()?;
    client_kv::set(&profile_key(&token), name);
    client_kv::set(ACTIVE_KEY, &token);
    Some(Profile {
        token,
        name: name.to_owned(),
    })
}

/// Active-profile getter. The active profile is the one used by HELLO
/// + by SP world keys + by the HUD greeting.
pub fn get_active() -> Option<Profile> {
    let token = client_kv::get(ACTIVE_KEY)?;
    let name = client_kv::get(&profile_key(&token))?;
    Some(Profile {
        token: truncate_bytes(&token, PROFILE_TOKEN_LEN).to_owned(),
        name: truncate_bytes(&name, PROFILE_NAME_MAX).to_owned(),
    })
}

pub fn set_active(token: &str) {
    if token.is_empty() {
        return;
    }
    client_kv::set(ACTIVE_KEY, token);
}

pub fn has_active() -> bool {
    let Some(token) = client_kv::get(ACTIVE_KEY) else {
        return false;
    };
    client_kv::get(&profile_key(&token)).is_some()
}

/// Drop a profile.
///
/// Ported verbatim, including a C quirk: the reselect branch below is
/// unreachable when the deleted profile WAS the active one, because
/// `get_active` already fails once the profile key is gone (its name
/// lookup misses). The active slot is left pointing at the dead token;
/// `has_active` / `get_active` treat that as "no active profile", so
/// the menu falls back to the picker. Do not "fix" this without
/// changing the C side in lockstep.
pub fn delete(token: &str) {
    if token.is_empty() {
        return;
    }
    client_kv::remove(&profile_key(token));

    if let Some(active) = get_active() {
        if active.token == token {
            let remaining = list();
            match remaining.first() {
                Some(p) => set_active(&p.token),
                None => client_kv::remove(ACTIVE_KEY),
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::client_kv::test_support;

    #[test]
    fn token_is_32_lowercase_hex() {
        let _g = test_support::begin("profile_token_format");
        let p = create("Alice").expect("create");
        assert_eq!(p.token.len(), PROFILE_TOKEN_LEN);
        assert!(p.token.bytes().all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b)));
        // Tokens are unique across creates.
        let q = create("Bob").expect("create");
        assert_ne!(p.token, q.token);
    }

    #[test]
    fn create_persists_and_activates() {
        let _g = test_support::begin("profile_create_activates");
        let p = create("Alice").expect("create");
        assert_eq!(
            client_kv::get(&format!("tenebris-c:profile:{}", p.token)).as_deref(),
            Some("Alice")
        );
        assert_eq!(
            client_kv::get("tenebris-c:active-profile").as_deref(),
            Some(p.token.as_str())
        );
        assert!(has_active());
        let active = get_active().expect("active");
        assert_eq!(active, p);
    }

    #[test]
    fn invalid_names_rejected() {
        let _g = test_support::begin("profile_invalid_names");
        assert!(create("").is_none());
        assert!(create("a:b").is_none());
        assert!(create("a\nb").is_none());
        assert!(create("a\rb").is_none());
        assert!(create(&"x".repeat(32)).is_none()); // > PROFILE_NAME_MAX
        assert!(create(&"x".repeat(31)).is_some()); // exactly at the cap
    }

    #[test]
    fn list_is_sorted_by_name() {
        let _g = test_support::begin("profile_list_sorted");
        create("Charlie").unwrap();
        create("Alice").unwrap();
        create("Bob").unwrap();
        let names: Vec<_> = list().into_iter().map(|p| p.name).collect();
        assert_eq!(names, ["Alice", "Bob", "Charlie"]);
    }

    #[test]
    fn delete_active_leaves_dangling_slot_like_c() {
        let _g = test_support::begin("profile_delete_active");
        let bob = create("Bob").unwrap();
        let alice = create("Alice").unwrap();
        assert_eq!(get_active().unwrap().name, "Alice");
        delete(&alice.token);
        // C quirk ported verbatim: the active slot still holds the
        // dead token, but has_active / get_active report "none" and
        // the profile itself is gone from the list.
        assert_eq!(
            client_kv::get("tenebris-c:active-profile").as_deref(),
            Some(alice.token.as_str())
        );
        assert!(!has_active());
        assert!(get_active().is_none());
        let names: Vec<_> = list().into_iter().map(|p| p.name).collect();
        assert_eq!(names, ["Bob"]);
        delete(&bob.token);
        assert!(list().is_empty());
        assert!(!has_active());
    }

    #[test]
    fn delete_inactive_keeps_active() {
        let _g = test_support::begin("profile_delete_inactive");
        let bob = create("Bob").unwrap();
        let alice = create("Alice").unwrap();
        delete(&bob.token);
        assert_eq!(get_active().unwrap().token, alice.token);
        assert_eq!(list().len(), 1);
    }

    #[test]
    fn set_active_empty_is_a_no_op() {
        let _g = test_support::begin("profile_set_active_empty");
        let p = create("Alice").unwrap();
        set_active("");
        assert_eq!(get_active().unwrap().token, p.token);
    }
}
