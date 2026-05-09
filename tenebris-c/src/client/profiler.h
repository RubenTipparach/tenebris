#ifndef TENEBRIS_CLIENT_PROFILER_H
#define TENEBRIS_CLIENT_PROFILER_H

#include <stdbool.h>

/*
 * Per-frame CPU profiler. Hand-instrumented via profiler_begin /
 * profiler_end pairs, each scoped to a named region. The profiler
 * is a slotted hash table keyed on the literal-string pointer
 * passed in (so call sites must use the SAME literal each time —
 * cheap pointer compare, no hashing). Each slot tracks last-frame
 * milliseconds plus an exponential moving average so the readout
 * is steady on a stable frame and reactive when something spikes.
 *
 * Toggle visibility with F3 (or profiler_toggle_visible). When
 * visible, profiler_draw lays out a column of name / ms / ms_avg
 * rows in the same sokol_debugtext canvas as the rest of the HUD.
 */

void profiler_begin_frame(void);
void profiler_end_frame(void);

/* Time a named region. Calls must nest properly (LIFO); the
 * implementation doesn't validate this — mismatched begin/end
 * pairs corrupt the matching slot's accumulator. */
void profiler_begin(const char* name);
void profiler_end(const char* name);

void profiler_toggle_visible(void);
bool profiler_visible(void);

/* Draws the per-slot breakdown via sokol_debugtext. Caller is
 * expected to have set up the canvas + origin for the HUD already
 * — profiler_draw just emits sdtx_printf rows at the cursor's
 * current position. */
void profiler_draw(void);

#endif
