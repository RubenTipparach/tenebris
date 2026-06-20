//! Port of `tenebris-c/src/core/job_system.{c,h}`.
//!
//! Tiny job pool. Three backends planned, only the synchronous one
//! shipped in Tier 1:
//!   - Sync (default for web; matches Caelum's measured win): runs the
//!     job inline on the calling thread.
//!   - pthreads (Tier 3 native): worker threads consume from a ring
//!     queue.
//!   - emscripten_wasm_workers (Tier 3 web, optional): if we ever
//!     measure that real concurrency beats the sync path on web.
//!
//! Tier 1 ships the synchronous backend only - Caelum measured that
//! pthreads on web cost more than they save once you factor in proxying
//! + COOP/COEP setup. Real worker backends arrive in Tier 3 behind the
//! same submit/drain surface.
//!
//! The C source has no `#ifdef __EMSCRIPTEN__`: the sync backend is the
//! one code path on both native and wasm, so this port has no
//! `cfg(target_family = "wasm")` split either - the same inline-execute
//! path compiles for every target, which is exactly the C behavior.
//!
//! # Name mapping (per PORTING.md rule 4)
//!
//! | C                       | Rust                  |
//! |-------------------------|-----------------------|
//! | `job_system_init()`     | `job_system::init()`  |
//! | `job_system_shutdown()` | `job_system::shutdown()` |
//! | `job_submit()`          | `job_system::submit()`|
//! | `job_drain()`           | `job_system::drain()` |
//! | `job_fn` + `void* user` | any `FnOnce() + Send` |
//!
//! # Job representation
//!
//! The C `job_fn fn, void* user` pair (function pointer + userdata)
//! becomes a single owned closure: `submit` is generic over
//! `F: FnOnce() + Send`. A `Box<dyn FnOnce() + Send>` satisfies the
//! bound for callers that need type erasure (see the `JobBox` alias).
//! The `Send` bound is part of the contract even though the Tier 1
//! backend runs inline: the header forbids callers from assuming sync
//! vs async semantics, so jobs must already be legal to hand to a
//! Tier 3 worker thread.
//!
//! The one untranslatable detail: C returns `false` from `job_submit`
//! when `fn` is NULL. Rust closures cannot be null, so that branch has
//! no equivalent; `submit` of a real closure always returns `true`,
//! matching every reachable C call site. The `bool` return is kept
//! because the documented contract is "false if the queue is full",
//! which the Tier 3 ring-queue backend will exercise.
//!
//! # Semantics callers may rely on (same as C)
//!
//! - `submit` runs the job to completion, inline, on the calling
//!   thread, before returning. Submission order == execution order.
//! - Callers must not assume async semantics - even when threaded, the
//!   job may have run by the time `submit` returns. The "fence" idiom
//!   is to call `drain` before reading shared state.
//! - `init` / `shutdown` / `drain` are no-ops in the sync backend.

/// Type-erased job for callers that need to store heterogeneous jobs;
/// the direct generic `submit::<F>` path needs no boxing.
pub type JobBox = Box<dyn FnOnce() + Send>;

/// Port of `job_system_init`. No-op in the Tier 1 sync backend; the
/// requested worker count is accepted and ignored, exactly as in C
/// (`(void)worker_count;`).
pub fn init(worker_count: i32) {
    let _ = worker_count;
}

/// Port of `job_system_shutdown`. No-op in the Tier 1 sync backend.
pub fn shutdown() {}

/// Port of `job_submit`. Runs the job inline on the calling thread and
/// returns `true`. The C `false` path (NULL `fn`) is unrepresentable in
/// Rust; the documented "false if the queue is full" case belongs to
/// the unshipped Tier 3 backends.
pub fn submit<F: FnOnce() + Send>(job: F) -> bool {
    job();
    true
}

/// Port of `job_drain`. Blocks until the queue is empty - a no-op for
/// the sync backend, where the queue is always empty by the time any
/// caller can observe it.
pub fn drain() {}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicBool, AtomicU32, AtomicUsize, Ordering};
    use std::sync::{Arc, Mutex};

    // Jobs must satisfy `Send` (the contract for the future Tier 3
    // worker backend), so test state goes through atomics / Mutex
    // rather than Cell.

    #[test]
    fn submit_runs_job_and_returns_true() {
        let ran = AtomicBool::new(false);
        assert!(submit(|| ran.store(true, Ordering::SeqCst)));
        assert!(ran.load(Ordering::SeqCst));
    }

    #[test]
    fn submit_runs_inline_before_returning() {
        // Sync backend contract: by the time submit() returns, the job
        // has fully completed on the calling thread - no drain needed
        // to observe its writes.
        let value = AtomicU32::new(0);
        submit(|| value.store(42, Ordering::SeqCst));
        assert_eq!(value.load(Ordering::SeqCst), 42);
    }

    #[test]
    fn drain_is_a_fence_after_which_all_submitted_work_is_visible() {
        // The documented fence idiom: submit, then drain, then read
        // shared state. Must hold for every backend.
        let sum = AtomicU32::new(0);
        for i in 1..=10u32 {
            assert!(submit(|| {
                sum.fetch_add(i, Ordering::SeqCst);
            }));
        }
        drain();
        assert_eq!(sum.load(Ordering::SeqCst), 55);
    }

    #[test]
    fn jobs_execute_in_submission_order() {
        // The sync backend runs each job to completion at submit time,
        // so observed order is exactly submission order.
        let order = Mutex::new(Vec::new());
        for i in 0..100usize {
            submit(|| order.lock().unwrap().push(i));
        }
        drain();
        let order = order.into_inner().unwrap();
        assert_eq!(order, (0..100).collect::<Vec<_>>());
    }

    #[test]
    fn init_and_shutdown_are_noops_around_submit() {
        // Worker count is accepted and ignored, exactly like the C
        // backend - including zero and negative values.
        for wc in [-4, 0, 1, 8] {
            init(wc);
            let ran = AtomicBool::new(false);
            assert!(submit(|| ran.store(true, Ordering::SeqCst)));
            assert!(ran.load(Ordering::SeqCst));
            drain();
            shutdown();
        }
        // Submitting after shutdown still works in the sync backend
        // (shutdown is a no-op; there is no pool to tear down).
        let ran = AtomicBool::new(false);
        assert!(submit(|| ran.store(true, Ordering::SeqCst)));
        assert!(ran.load(Ordering::SeqCst));
    }

    #[test]
    fn many_jobs_all_run_exactly_once() {
        const N: usize = 100_000;
        let count = AtomicUsize::new(0);
        for _ in 0..N {
            assert!(submit(|| {
                count.fetch_add(1, Ordering::SeqCst);
            }));
        }
        drain();
        assert_eq!(count.load(Ordering::SeqCst), N);
    }

    #[test]
    fn boxed_jobs_satisfy_the_submit_bound() {
        // C's fn + void* userdata pair maps to a closure capturing its
        // state; JobBox is the type-erased form.
        let hits = Arc::new(AtomicUsize::new(0));
        let mut queue: Vec<JobBox> = Vec::new();
        for i in 0..10usize {
            let hits = Arc::clone(&hits);
            queue.push(Box::new(move || {
                hits.fetch_add(i, Ordering::SeqCst);
            }));
        }
        for job in queue {
            assert!(submit(job));
        }
        drain();
        assert_eq!(hits.load(Ordering::SeqCst), 45);
    }

    #[test]
    fn submit_is_callable_from_multiple_threads() {
        // Each thread's jobs run inline on that thread; the Send bound
        // keeps jobs legal for the future Tier 3 worker backend.
        let count = Arc::new(AtomicUsize::new(0));
        let handles: Vec<_> = (0..4)
            .map(|_| {
                let count = Arc::clone(&count);
                std::thread::spawn(move || {
                    for _ in 0..1000 {
                        let count = Arc::clone(&count);
                        assert!(submit(move || {
                            count.fetch_add(1, Ordering::SeqCst);
                        }));
                    }
                    drain();
                })
            })
            .collect();
        for h in handles {
            h.join().unwrap();
        }
        assert_eq!(count.load(Ordering::SeqCst), 4000);
    }
}
