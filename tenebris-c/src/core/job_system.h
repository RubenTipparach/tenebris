#ifndef TENEBRIS_CORE_JOB_SYSTEM_H
#define TENEBRIS_CORE_JOB_SYSTEM_H

#include <stdbool.h>
#include <stddef.h>

/*
 * Tiny job pool. Three backends planned, only the synchronous one
 * shipped in Tier 1:
 *   - Sync (default for web; matches Caelum's measured win): runs the
 *     job inline on the calling thread.
 *   - pthreads (Tier 3 native): worker threads consume from a ring
 *     queue.
 *   - emscripten_wasm_workers (Tier 3 web, optional): if we ever
 *     measure that real concurrency beats the sync path on web.
 *
 * Callers must not assume async semantics — even when threaded, the job
 * may have run by the time `job_submit` returns. The "fence" idiom is to
 * call `job_drain` before reading shared state.
 */

typedef void (*job_fn)(void* user);

void job_system_init(int worker_count);
void job_system_shutdown(void);

bool job_submit(job_fn fn, void* user);    /* false if the queue is full */
void job_drain(void);                      /* blocks until queue empty (no-op for sync) */

#endif
