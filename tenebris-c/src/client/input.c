#include "client/input.h"
#include <string.h>

static input_state_t S;

void input_init(void) {
    memset(&S, 0, sizeof(S));
}

static void set_key(sapp_keycode k, bool down) {
    switch (k) {
        case SAPP_KEYCODE_W:           S.phys.forward  = down; break;
        case SAPP_KEYCODE_S:           S.phys.backward = down; break;
        case SAPP_KEYCODE_A:           S.phys.left     = down; break;
        case SAPP_KEYCODE_D:           S.phys.right    = down; break;
        case SAPP_KEYCODE_SPACE:       S.phys.jump     = down; S.phys.fly_up = down; break;
        case SAPP_KEYCODE_LEFT_SHIFT:
        case SAPP_KEYCODE_RIGHT_SHIFT: S.phys.sprint   = down; break;
        case SAPP_KEYCODE_LEFT_CONTROL:
        case SAPP_KEYCODE_RIGHT_CONTROL:
        case SAPP_KEYCODE_C:           S.phys.fly_down = down; break;
        case SAPP_KEYCODE_F:           if (down) S.phys.fly_mode = !S.phys.fly_mode; break;
        case SAPP_KEYCODE_1: case SAPP_KEYCODE_2: case SAPP_KEYCODE_3:
        case SAPP_KEYCODE_4: case SAPP_KEYCODE_5: case SAPP_KEYCODE_6:
        case SAPP_KEYCODE_7: case SAPP_KEYCODE_8: case SAPP_KEYCODE_9:
            if (down) S.hotbar[k - SAPP_KEYCODE_1] = true;
            break;
        case SAPP_KEYCODE_0: if (down) S.hotbar[9] = true; break;
        default: break;
    }
}

void input_event(const sapp_event* e) {
    switch (e->type) {
        case SAPP_EVENTTYPE_KEY_DOWN: set_key(e->key_code, true);  break;
        case SAPP_EVENTTYPE_KEY_UP:   set_key(e->key_code, false); break;
        case SAPP_EVENTTYPE_MOUSE_MOVE:
            if (S.pointer_locked) {
                S.mouse_dx += e->mouse_dx;
                S.mouse_dy += e->mouse_dy;
            }
            break;
        case SAPP_EVENTTYPE_MOUSE_DOWN:
            if (!S.pointer_locked) sapp_lock_mouse(true);
            if (e->mouse_button == SAPP_MOUSEBUTTON_LEFT)   S.left_click   = true;
            if (e->mouse_button == SAPP_MOUSEBUTTON_RIGHT)  S.right_click  = true;
            if (e->mouse_button == SAPP_MOUSEBUTTON_MIDDLE) S.middle_click = true;
            break;
        case SAPP_EVENTTYPE_MOUSE_SCROLL:
            S.wheel_dy += e->scroll_y;
            break;
        case SAPP_EVENTTYPE_FOCUSED:
            break;
        case SAPP_EVENTTYPE_UNFOCUSED:
            /* Clear held keys so we don't fly off into the distance on tab-out. */
            memset(&S.phys, 0, sizeof(S.phys));
            /* Preserve fly_mode toggle across focus loss. */
            break;
        default: break;
    }
    S.pointer_locked = sapp_mouse_locked();
}

const input_state_t* input_state(void) { return &S; }

void input_consume(void) {
    S.mouse_dx    = 0;
    S.mouse_dy    = 0;
    S.wheel_dy    = 0;
    S.left_click  = false;
    S.right_click = false;
    S.middle_click = false;
    memset(S.hotbar, 0, sizeof(S.hotbar));
}
