#include "client/profiler.h"

#include "sokol_gfx.h"
#include "sokol_time.h"
#include "sokol_debugtext.h"

#include <stdint.h>
#include <string.h>

#define MAX_SLOTS  32

typedef struct {
    const char* name;        /* literal-string pointer — pointer-equality lookup */
    uint64_t    start_t;     /* stm_now() at last begin                          */
    double      ms_curr;     /* accumulated time in the current frame            */
    double      ms_last;     /* finalised time from the previous frame           */
    double      ms_avg;      /* EMA of ms_last across frames                     */
    int         calls_curr;  /* begin/end pair count this frame                  */
    int         calls_last;
} prof_slot_t;

static struct {
    prof_slot_t slots[MAX_SLOTS];
    int         slot_count;
    bool        visible;
    uint64_t    frame_start_t;
    double      frame_ms_last;
    double      frame_ms_avg;
} P;

/* Linear search on literal-string pointer. With < 32 slots this is
 * faster than a hash table — and the compiler de-duplicates string
 * literals across translation units so the pointers are stable. */
static prof_slot_t* slot_for(const char* name) {
    for (int i = 0; i < P.slot_count; ++i) {
        if (P.slots[i].name == name) return &P.slots[i];
    }
    if (P.slot_count >= MAX_SLOTS) return NULL;
    prof_slot_t* s = &P.slots[P.slot_count++];
    memset(s, 0, sizeof(*s));
    s->name = name;
    return s;
}

void profiler_begin_frame(void) {
    P.frame_start_t = stm_now();
    for (int i = 0; i < P.slot_count; ++i) {
        P.slots[i].ms_curr    = 0.0;
        P.slots[i].calls_curr = 0;
    }
}

void profiler_end_frame(void) {
    /* Whole-frame total (wall-clock between begin_frame and end_frame
     * — captures everything between, including unprofiled regions). */
    P.frame_ms_last = stm_ms(stm_diff(stm_now(), P.frame_start_t));
    /* Slow-EMA the totals so the readout is stable but still reacts
     * when something starts spiking. Coefficient 0.1 gives ~10-frame
     * memory; close enough to the JS profiler's behaviour. */
    P.frame_ms_avg = (P.frame_ms_avg <= 0.0)
        ? P.frame_ms_last
        : (P.frame_ms_avg * 0.9 + P.frame_ms_last * 0.1);
    for (int i = 0; i < P.slot_count; ++i) {
        prof_slot_t* s = &P.slots[i];
        s->ms_last    = s->ms_curr;
        s->calls_last = s->calls_curr;
        s->ms_avg     = (s->ms_avg <= 0.0)
            ? s->ms_last
            : (s->ms_avg * 0.9 + s->ms_last * 0.1);
    }
}

void profiler_begin(const char* name) {
    prof_slot_t* s = slot_for(name);
    if (!s) return;
    s->start_t = stm_now();
}

void profiler_end(const char* name) {
    prof_slot_t* s = slot_for(name);
    if (!s) return;
    s->ms_curr   += stm_ms(stm_diff(stm_now(), s->start_t));
    s->calls_curr += 1;
}

void profiler_toggle_visible(void) { P.visible = !P.visible; }
bool profiler_visible(void)        { return P.visible; }

void profiler_draw(void) {
    if (!P.visible) return;
    sdtx_color3b(0xff, 0xe0, 0x40);
    sdtx_printf("\n=== profiler [F3] ===\n");
    sdtx_color3b(0xc0, 0xd0, 0xff);
    sdtx_printf("frame                    %5.2f ms (avg %5.2f)  fps %4.0f\n",
                P.frame_ms_last, P.frame_ms_avg,
                P.frame_ms_avg > 0.01 ? (1000.0 / P.frame_ms_avg) : 0.0);
    /* Sort-on-display by ms_avg desc so the heaviest slot ends up
     * on top — useful when looking for the cause of a spike. Tiny
     * insertion sort, fine for <= 32 slots. */
    int order[MAX_SLOTS];
    for (int i = 0; i < P.slot_count; ++i) order[i] = i;
    for (int i = 1; i < P.slot_count; ++i) {
        int x = order[i];
        int j = i;
        while (j > 0 && P.slots[order[j-1]].ms_avg < P.slots[x].ms_avg) {
            order[j] = order[j-1];
            --j;
        }
        order[j] = x;
    }
    for (int i = 0; i < P.slot_count; ++i) {
        prof_slot_t* s = &P.slots[order[i]];
        /* Highlight slots > 5 ms avg so eye finds the hot ones. */
        if      (s->ms_avg > 5.0) sdtx_color3b(0xff, 0x70, 0x70);
        else if (s->ms_avg > 1.0) sdtx_color3b(0xff, 0xc0, 0x70);
        else                       sdtx_color3b(0xc0, 0xd0, 0xff);
        sdtx_printf("  %-22s %5.2f ms (avg %5.2f) x%d\n",
                    s->name, s->ms_last, s->ms_avg, s->calls_last);
    }
    sdtx_color3b(0xff, 0xff, 0xff);
}
