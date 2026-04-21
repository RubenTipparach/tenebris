#ifndef TENEBRIS_CLIENT_INPUT_H
#define TENEBRIS_CLIENT_INPUT_H

#include "sokol_app.h"
#include "core/physics.h"
#include <stdbool.h>

/*
 * Accumulates sokol_app events into an InputState for the player
 * controller to consume each frame. Mirrors src/engine/InputManager.ts
 * minus the mobile/touch handling (deferred).
 */

typedef struct {
    phys_input_t phys;
    float mouse_dx, mouse_dy;    /* consumed per-frame (reset by input_consume) */
    float wheel_dy;
    bool  left_click, right_click, middle_click;
    bool  hotbar[10];            /* digit 1..9, 0 = slot 10 */
    bool  pointer_locked;
} input_state_t;

void input_init(void);
void input_event(const sapp_event* e);
const input_state_t* input_state(void);
void input_consume(void);       /* zero out per-frame deltas + edge clicks */

#endif
