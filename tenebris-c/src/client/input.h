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
    /* Edge-triggered (true for one frame on press), cleared each frame
     * by input_consume. */
    bool  left_click, right_click, middle_click;
    /* Stays true for as long as the button / break-touch is held.
     * Cleared on release or focus-loss; NOT cleared by input_consume. */
    bool  left_held, right_held;
    bool  hotbar[10];
    bool  pointer_locked;

    /* Virtual movement stick (left thumb). Analog in [-1, 1]; mapped
     * into phys.forward/backward/left/right at a 0.3 deadzone. */
    float stick_x, stick_y;
    bool  stick_active;

    /* Virtual look stick (right thumb). Continuous — consumers multiply
     * by dt and sensitivity and add to mouse_dx/dy. */
    float look_stick_x, look_stick_y;
    bool  look_stick_active;

    /* Mobile UI button hitboxes (pixels). Updated from renderer each
     * frame so input.c can test touch-down against them. Any button
     * whose radius is 0 is inactive for this frame. */
    float btn_break_cx, btn_break_cy, btn_break_r;
    float btn_place_cx, btn_place_cy, btn_place_r;
    float btn_jump_cx,  btn_jump_cy,  btn_jump_r;
    float btn_tp_cx,    btn_tp_cy,    btn_tp_r;      /* opens teleport menu */
    /* Menu-nav buttons — only active while the teleport menu is open. */
    float btn_menu_up_cx,    btn_menu_up_cy,    btn_menu_up_r;
    float btn_menu_down_cx,  btn_menu_down_cy,  btn_menu_down_r;
    float btn_menu_ok_cx,    btn_menu_ok_cy,    btn_menu_ok_r;
    float btn_menu_close_cx, btn_menu_close_cy, btn_menu_close_r;

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

/* Mutable state accessor so UI modules (mobile_ui, teleport_menu) can
 * publish their own button hitboxes directly into input.c's
 * classification table without needing a setter per field. Callers
 * write to btn_*_{cx,cy,r}; a radius of 0 deactivates that button. */
input_state_t* input_state_mut(void);

void input_set_fly_mode(bool on);

/* Edge-triggered touch-button events for the teleport menu. Each
 * returns true at most once per tap. Called by the event router /
 * teleport_menu each frame to react to touches. */
bool input_consume_tp_tap(void);
bool input_consume_menu_up(void);
bool input_consume_menu_down(void);
bool input_consume_menu_ok(void);
bool input_consume_menu_close(void);

/* G-key edge for survival-mode toggle. */
bool input_consume_survival_toggle(void);

#endif
