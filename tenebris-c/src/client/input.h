#ifndef TENEBRIS_CLIENT_INPUT_H
#define TENEBRIS_CLIENT_INPUT_H

#include "sokol_app.h"
#include "core/physics.h"
#include <stdbool.h>

/*
 * Accumulates sokol_app events (keyboard + mouse + touch) into an
 * InputState. Touch events drive a virtual joystick (left half / bottom
 * half of the screen) + look drags (right side) + three on-screen
 * buttons (jump / place / break) in the bottom-right corner.
 */

typedef struct {
    phys_input_t phys;
    float mouse_dx, mouse_dy;       /* consumed per-frame */
    float wheel_dy;
    bool  left_click, right_click, middle_click;
    bool  hotbar[10];
    bool  pointer_locked;

    /* Virtual stick analog position in [-1, 1]. Mapped into phys.forward/
     * backward/left/right at thresholds for Tier 1. */
    float stick_x, stick_y;
    bool  stick_active;

    /* Mobile UI button hitboxes (pixels). Updated from renderer each
     * frame so input.c can test touch-down against them. */
    float btn_break_cx, btn_break_cy, btn_break_r;
    float btn_place_cx, btn_place_cy, btn_place_r;
    float btn_jump_cx,  btn_jump_cy,  btn_jump_r;

    /* True while we have any touch input going; renderer uses this to
     * decide whether to draw the mobile overlay. */
    bool  touch_active;
} input_state_t;

void input_init(void);
void input_event(const sapp_event* e);
const input_state_t* input_state(void);
void input_consume(void);

/* Renderer tells input.c where the mobile buttons were placed this
 * frame, so touch hit-tests work. */
void input_register_mobile_buttons(float break_cx, float break_cy, float r,
                                   float place_cx, float place_cy, float pr,
                                   float jump_cx,  float jump_cy,  float jr);

#endif
