//! Port of `tenebris-c/src/server/server_main.c` - headless
//! authoritative game server CLI entry.
//!
//! Flags and defaults mirror the C parser exactly:
//!   --port P     (default 8080, atoi semantics)
//!   --seed N     (default 0, strtoull base-10 semantics)
//!   --tick-hz F  (default 20.0, strtod semantics)
//!   --saves DIR  (default "./saves")
//!   --help | -h  (usage text, exit 0)
//!   anything else -> "unknown arg", exit 2
//! A value-taking flag in last position falls into the unknown-arg
//! branch, exactly like the C `i + 1 < argc && strcmp(...)` guards.
//!
//! signal(SIGINT/SIGTERM) becomes a background thread waiting on
//! tokio's ctrl_c (+ SIGTERM on unix) that flips the same
//! shutdown-requested flag.

mod saves;
mod server;
mod transport;

use server::{monotonic_seconds, Server, ServerConfig};

/// atoi().
fn c_atoi(s: &str) -> i32 {
    let b = s.as_bytes();
    let mut i = 0usize;
    while i < b.len() && matches!(b[i], b' ' | b'\t' | b'\n' | 0x0b | 0x0c | b'\r') {
        i += 1;
    }
    let mut neg = false;
    if i < b.len() && (b[i] == b'+' || b[i] == b'-') {
        neg = b[i] == b'-';
        i += 1;
    }
    let mut v: i64 = 0;
    while i < b.len() && b[i].is_ascii_digit() {
        v = v.saturating_mul(10).saturating_add((b[i] - b'0') as i64);
        i += 1;
    }
    let v = if neg { -v } else { v };
    v.clamp(i32::MIN as i64, i32::MAX as i64) as i32
}

/// strtoull(s, NULL, 10).
fn c_strtoull(s: &str) -> u64 {
    let b = s.as_bytes();
    let mut i = 0usize;
    while i < b.len() && matches!(b[i], b' ' | b'\t' | b'\n' | 0x0b | 0x0c | b'\r') {
        i += 1;
    }
    let mut neg = false;
    if i < b.len() && (b[i] == b'+' || b[i] == b'-') {
        neg = b[i] == b'-';
        i += 1;
    }
    let mut v: u64 = 0;
    while i < b.len() && b[i].is_ascii_digit() {
        v = v.wrapping_mul(10).wrapping_add((b[i] - b'0') as u64);
        i += 1;
    }
    if neg {
        v.wrapping_neg()
    } else {
        v
    }
}

/// strtod(s, NULL): parse the longest valid leading float, 0.0 when
/// nothing parses.
fn c_strtod(s: &str) -> f64 {
    let b = s.as_bytes();
    let mut i = 0usize;
    while i < b.len() && matches!(b[i], b' ' | b'\t' | b'\n' | 0x0b | 0x0c | b'\r') {
        i += 1;
    }
    let start = i;
    if i < b.len() && (b[i] == b'+' || b[i] == b'-') {
        i += 1;
    }
    let mut saw_digit = false;
    while i < b.len() && b[i].is_ascii_digit() {
        i += 1;
        saw_digit = true;
    }
    if i < b.len() && b[i] == b'.' {
        i += 1;
        while i < b.len() && b[i].is_ascii_digit() {
            i += 1;
            saw_digit = true;
        }
    }
    if !saw_digit {
        return 0.0;
    }
    if i < b.len() && (b[i] == b'e' || b[i] == b'E') {
        let mut j = i + 1;
        if j < b.len() && (b[j] == b'+' || b[j] == b'-') {
            j += 1;
        }
        let exp_start = j;
        while j < b.len() && b[j].is_ascii_digit() {
            j += 1;
        }
        if j > exp_start {
            i = j;
        }
    }
    s[start..i].parse().unwrap_or(0.0)
}

/// Port of `parse_args()`. 0 = run, 1 = help shown, 2 = bad arg.
fn parse_args(args: &[String], cfg: &mut ServerConfig) -> i32 {
    cfg.port = 8080;
    cfg.tick_hz = 20.0;
    cfg.log_every_n = 0; /* server init picks ~1Hz default */
    cfg.saves_dir = "./saves".to_string();
    cfg.seed = 0;
    let mut i = 1usize;
    while i < args.len() {
        let a = args[i].as_str();
        if i + 1 < args.len() && a == "--port" {
            i += 1;
            cfg.port = c_atoi(&args[i]);
        } else if i + 1 < args.len() && a == "--seed" {
            i += 1;
            cfg.seed = c_strtoull(&args[i]);
        } else if i + 1 < args.len() && a == "--tick-hz" {
            i += 1;
            cfg.tick_hz = c_strtod(&args[i]);
        } else if i + 1 < args.len() && a == "--saves" {
            i += 1;
            cfg.saves_dir = args[i].clone();
        } else if a == "--help" || a == "-h" {
            println!("usage: tenebris-server [--port P] [--seed N] [--tick-hz F] [--saves DIR]");
            return 1;
        } else {
            eprintln!("tenebris-server: unknown arg '{}'", a);
            return 2;
        }
        i += 1;
    }
    0
}

/// Port of `sleep_until()`.
fn sleep_until(deadline: f64) {
    let now = monotonic_seconds();
    let remaining = deadline - now;
    if remaining <= 0.0 {
        return;
    }
    std::thread::sleep(std::time::Duration::from_secs_f64(remaining));
}

/// Port of `signal(SIGINT/SIGTERM, on_signal)`.
fn install_signal_handler(flag: std::sync::Arc<std::sync::atomic::AtomicBool>) {
    std::thread::spawn(move || {
        let rt = match tokio::runtime::Builder::new_current_thread().enable_all().build() {
            Ok(rt) => rt,
            Err(_) => return,
        };
        rt.block_on(async {
            #[cfg(unix)]
            {
                use tokio::signal::unix::{signal, SignalKind};
                let mut term = match signal(SignalKind::terminate()) {
                    Ok(t) => t,
                    Err(_) => {
                        let _ = tokio::signal::ctrl_c().await;
                        return;
                    }
                };
                tokio::select! {
                    _ = tokio::signal::ctrl_c() => {}
                    _ = term.recv() => {}
                }
            }
            #[cfg(not(unix))]
            {
                let _ = tokio::signal::ctrl_c().await;
            }
        });
        flag.store(true, std::sync::atomic::Ordering::SeqCst);
    });
}

fn main() {
    let args: Vec<String> = std::env::args().collect();
    let mut cfg = ServerConfig::default();
    let parse = parse_args(&args, &mut cfg);
    if parse != 0 {
        std::process::exit(if parse == 1 { 0 } else { parse });
    }

    let Some(mut server) = Server::init(&cfg) else {
        eprintln!("[server] init failed");
        std::process::exit(1);
    };
    install_signal_handler(server.shutdown_flag());

    let dt = 1.0 / cfg.tick_hz;
    let mut next = monotonic_seconds();
    while !server.shutdown_requested() {
        next += dt;
        server.tick();
        sleep_until(next);
        /* If we fell badly behind (debugger, paused VM), don't try to
         * catch up - just re-anchor to now. */
        let now = monotonic_seconds();
        if now - next > dt * 5.0 {
            next = now;
        }
    }

    server.shutdown();
}

#[cfg(test)]
mod tests {
    use super::*;

    fn argv(list: &[&str]) -> Vec<String> {
        let mut v = vec!["tenebris-server".to_string()];
        v.extend(list.iter().map(|s| s.to_string()));
        v
    }

    #[test]
    fn parse_args_defaults_and_flags() {
        let mut cfg = ServerConfig::default();
        assert_eq!(parse_args(&argv(&[]), &mut cfg), 0);
        assert_eq!(cfg.port, 8080);
        assert_eq!(cfg.tick_hz, 20.0);
        assert_eq!(cfg.log_every_n, 0);
        assert_eq!(cfg.saves_dir, "./saves");
        assert_eq!(cfg.seed, 0);

        let mut cfg = ServerConfig::default();
        assert_eq!(
            parse_args(
                &argv(&["--port", "9001", "--seed", "424242", "--tick-hz", "30.5", "--saves", "/data/saves"]),
                &mut cfg
            ),
            0
        );
        assert_eq!(cfg.port, 9001);
        assert_eq!(cfg.seed, 424242);
        assert_eq!(cfg.tick_hz, 30.5);
        assert_eq!(cfg.saves_dir, "/data/saves");
    }

    #[test]
    fn parse_args_help_and_errors() {
        let mut cfg = ServerConfig::default();
        assert_eq!(parse_args(&argv(&["--help"]), &mut cfg), 1);
        let mut cfg = ServerConfig::default();
        assert_eq!(parse_args(&argv(&["-h"]), &mut cfg), 1);
        let mut cfg = ServerConfig::default();
        assert_eq!(parse_args(&argv(&["--bogus"]), &mut cfg), 2);
        /* A value-taking flag in last position has no value to
         * consume - C's `i + 1 < argc` guard makes it fall through to
         * the unknown-arg branch. */
        let mut cfg = ServerConfig::default();
        assert_eq!(parse_args(&argv(&["--port"]), &mut cfg), 2);
    }

    #[test]
    fn c_number_parse_semantics() {
        assert_eq!(c_atoi("  9001abc"), 9001);
        assert_eq!(c_atoi("abc"), 0);
        assert_eq!(c_atoi("-42"), -42);
        assert_eq!(c_strtoull("18446744073709551615"), u64::MAX);
        assert_eq!(c_strtoull("junk"), 0);
        assert_eq!(c_strtod("30.5x"), 30.5);
        assert_eq!(c_strtod("x"), 0.0);
        assert_eq!(c_strtod("1e2"), 100.0);
    }
}
