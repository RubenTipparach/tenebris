#include "core/job_system.h"

/*
 * Tier 1 ships the synchronous backend only — Caelum measured that
 * pthreads on web cost more than they save once you factor in proxying
 * + COOP/COEP setup. Real worker backends arrive in Tier 3 behind the
 * same submit/drain surface.
 */

void job_system_init(int worker_count) { (void)worker_count; }
void job_system_shutdown(void) {}

bool job_submit(job_fn fn, void* user) {
    if (!fn) return false;
    fn(user);
    return true;
}

void job_drain(void) {}
