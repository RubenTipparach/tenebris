#include "client/input.h"
#include <string.h>
#include <math.h>

/* ----------------------------------------------------------------------- */

#define MAX_TOUCHES 8

typedef enum {
    TOUCH_NONE  = 0,
    TOUCH_STICK,        /* left-thumb virtual movement stick */
    TOUCH_LOOK_STICK,   /* right-thumb virtual look stick    */
    TOUCH_LOOK,         /* drag-to-look fallback (top half)  */
    TOUCH_BREAK,
    TOUCH_PLACE,
    TOUCH_JUMP,
} touch_role_t;

typedef struct {
    uintptr_t id;
    touch_role_t role;
    float  origin_x, origin_y;     /* where the touch began */
    float  last_x,   last_y;       /* most recent position */
    bool   active;
} touch_t;

static struct {
    input_state_t pub;
    touch_t touches[MAX_TOUCHES];
    /* Jump stays true for exactly one frame when tapped (edge-trigger
     * from a virtual button), independent of whether the touch is still
     * held. Cleared by input_consume. */
    bool jump_edge;
} S;

/* ----------------------------------------------------------------------- */

static void set_key(sapp_keycode k, bool down) {
    switch (k) {
        case SAPP_KEYCODE_W:           S.pub.phys.forward  = down; break;
        case SAPP_KEYCODE_S:           S.pub.phys.backward = down; break;
        case SAPP_KEYCODE_A:           S.pub.phys.left     = down; break;
        case SAPP_KEYCODE_D:           S.pub.phys.right    = down; break;
        case SAPP_KEYCODE_SPACE:       S.pub.phys.jump     = down; S.pub.phys.fly_up = down; break;
        case SAPP_KEYCODE_LEFT_SHIFT:
        case SAPP_KEYCODE_RIGHT_SHIFT: S.pub.phys.sprint   = down; break;
        case SAPP_KEYCODE_LEFT_CONTROL:
        case SAPP_KEYCODE_RIGHT_CONTROL:
        case SAPP_KEYCODE_C:           S.pub.phys.fly_down = down; break;
        case SAPP_KEYCODE_F:           if (down) S.pub.phys.fly_mode = !S.pub.phys.fly_mode; break;
        case SAPP_KEYCODE_1: case SAPP_KEYCODE_2: case SAPP_KEYCODE_3:
        case SAPP_KEYCODE_4: case SAPP_KEYCODE_5: case SAPP_KEYCODE_6:
        case SAPP_KEYCODE_7: case SAPP_KEYCODE_8: case SAPP_KEYCODE_9:
            if (down) S.pub.hotbar[k - SAPP_KEYCODE_1] = true;
            break;
        case SAPP_KEYCODE_0: if (down) S.pub.hotbar[9] = true; break;
        default: break;
    }
}

/* ----------------------------------------------------------------------- */

void input_init(void) { memset(&S, 0, sizeof(S)); }

const input_state_t* input_state(void) { return &S.pub; }

void input_consume(void) {
    S.pub.mouse_dx = 0;
    S.pub.mouse_dy = 0;
    S.pub.wheel_dy = 0;
    S.pub.left_click   = false;
    S.pub.right_click  = false;
    S.pub.middle_click = false;
    S.jump_edge = false;
    memset(S.pub.hotbar, 0, sizeof(S.pub.hotbar));
    /* phys.jump stays as-is: keyboard clears it on KEY_UP; touch clears
     * it when TOUCHES_ENDED fires for the jump button. */
}

void input_set_fly_mode(bool on) {
    S.pub.phys.fly_mode = on;
}

void input_register_mobile_buttons(float bx, float by, float br,
                                   float px, float py, float pr,
                                   float jx, float jy, float jr) {
    S.pub.btn_break_cx = bx; S.pub.btn_break_cy = by; S.pub.btn_break_r = br;
    S.pub.btn_place_cx = px; S.pub.btn_place_cy = py; S.pub.btn_place_r = pr;
    S.pub.btn_jump_cx  = jx; S.pub.btn_jump_cy  = jy; S.pub.btn_jump_r  = jr;
}

/* ----------------------------------------------------------------------- */

static int find_touch(uintptr_t id) {
    for (int i = 0; i < MAX_TOUCHES; ++i) if (S.touches[i].active && S.touches[i].id == id) return i;
    return -1;
}
static int alloc_touch(void) {
    for (int i = 0; i < MAX_TOUCHES; ++i) if (!S.touches[i].active) return i;
    return -1;
}

static bool in_circle(float x, float y, float cx, float cy, float r) {
    float dx = x - cx, dy = y - cy;
    return (dx * dx + dy * dy) <= (r * r);
}

static touch_role_t classify_touch(float x, float y) {
    /* Button circles win over stick zones. */
    if (S.pub.btn_break_r > 0.0f && in_circle(x, y, S.pub.btn_break_cx, S.pub.btn_break_cy, S.pub.btn_break_r)) return TOUCH_BREAK;
    if (S.pub.btn_place_r > 0.0f && in_circle(x, y, S.pub.btn_place_cx, S.pub.btn_place_cy, S.pub.btn_place_r)) return TOUCH_PLACE;
    if (S.pub.btn_jump_r  > 0.0f && in_circle(x, y, S.pub.btn_jump_cx,  S.pub.btn_jump_cy,  S.pub.btn_jump_r))  return TOUCH_JUMP;

    const float w = sapp_widthf();
    const float h = sapp_heightf();
    /* Bottom-left quadrant = left-thumb movement stick.
     * Bottom-right quadrant = right-thumb look stick.
     * Top half (either side)  = drag-to-look fallback (mostly desktop). */
    if (y > h * 0.5f) {
        return (x < w * 0.5f) ? TOUCH_STICK : TOUCH_LOOK_STICK;
    }
    return TOUCH_LOOK;
}

/* ----------------------------------------------------------------------- */

/* Normalized stick offset from touch origin, clamped to unit disk. Used
 * by both the movement and look sticks. */
static void compute_stick_offset(const touch_t* t, float* out_x, float* out_y) {
    float w = sapp_widthf(), h = sapp_heightf();
    /* Radius in pixels. Tighter than the old 100 px cap so the smaller
     * UI feels tighter under the thumb. */
    float radius = (w < h ? w : h) * 0.14f;
    if (radius > 70.0f) radius = 70.0f;
    if (radius < 40.0f) radius = 40.0f;
    float dx = t->last_x - t->origin_x;
    float dy = t->last_y - t->origin_y;
    float sx = dx / radius;
    float sy = -dy / radius;                   /* screen Y grows down */
    float len = sqrtf(sx * sx + sy * sy);
    if (len > 1.0f) { sx /= len; sy /= len; }
    *out_x = sx;
    *out_y = sy;
}

static void update_stick_from_touch(const touch_t* t) {
    float sx, sy;
    compute_stick_offset(t, &sx, &sy);
    S.pub.stick_x = sx;
    S.pub.stick_y = sy;
    S.pub.stick_active = true;
    S.pub.phys.forward  = (sy >  0.3f);
    S.pub.phys.backward = (sy < -0.3f);
    S.pub.phys.right    = (sx >  0.3f);
    S.pub.phys.left     = (sx < -0.3f);
}

static void clear_stick(void) {
    S.pub.stick_x = 0.0f;
    S.pub.stick_y = 0.0f;
    S.pub.stick_active = false;
    S.pub.phys.forward = S.pub.phys.backward = false;
    S.pub.phys.left    = S.pub.phys.right    = false;
}

static void update_look_stick_from_touch(const touch_t* t) {
    float sx, sy;
    compute_stick_offset(t, &sx, &sy);
    S.pub.look_stick_x = sx;
    S.pub.look_stick_y = sy;
    S.pub.look_stick_active = true;
}

static void clear_look_stick(void) {
    S.pub.look_stick_x = 0.0f;
    S.pub.look_stick_y = 0.0f;
    S.pub.look_stick_active = false;
}

/* ----------------------------------------------------------------------- */

static void handle_touches_began(const sapp_event* e) {
    for (int i = 0; i < (int)e->num_touches; ++i) {
        const sapp_touchpoint* tp = &e->touches[i];
        if (!tp->changed) continue;
        int slot = alloc_touch();
        if (slot < 0) continue;
        touch_t* t = &S.touches[slot];
        t->id = tp->identifier;
        t->origin_x = tp->pos_x; t->origin_y = tp->pos_y;
        t->last_x   = tp->pos_x; t->last_y   = tp->pos_y;
        t->active = true;
        t->role = classify_touch(tp->pos_x, tp->pos_y);

        switch (t->role) {
            case TOUCH_STICK:      update_stick_from_touch(t);      break;
            case TOUCH_LOOK_STICK: update_look_stick_from_touch(t); break;
            case TOUCH_BREAK: S.pub.left_click  = true;  break;
            case TOUCH_PLACE: S.pub.right_click = true;  break;
            case TOUCH_JUMP:  S.jump_edge = true; S.pub.phys.jump = true; break;
            default: break;
        }
    }
    S.pub.touch_active = true;
}

static void handle_touches_moved(const sapp_event* e) {
    for (int i = 0; i < (int)e->num_touches; ++i) {
        const sapp_touchpoint* tp = &e->touches[i];
        int slot = find_touch(tp->identifier);
        if (slot < 0) continue;
        touch_t* t = &S.touches[slot];
        float dx = tp->pos_x - t->last_x;
        float dy = tp->pos_y - t->last_y;
        t->last_x = tp->pos_x;
        t->last_y = tp->pos_y;
        switch (t->role) {
            case TOUCH_STICK:      update_stick_from_touch(t);      break;
            case TOUCH_LOOK_STICK: update_look_stick_from_touch(t); break;
            case TOUCH_LOOK:
                S.pub.mouse_dx += dx;
                S.pub.mouse_dy += dy;
                break;
            default: break;
        }
    }
}

static void handle_touches_ended(const sapp_event* e) {
    for (int i = 0; i < (int)e->num_touches; ++i) {
        const sapp_touchpoint* tp = &e->touches[i];
        int slot = find_touch(tp->identifier);
        if (slot < 0) continue;
        touch_t* t = &S.touches[slot];
        if (t->role == TOUCH_STICK)      clear_stick();
        if (t->role == TOUCH_LOOK_STICK) clear_look_stick();
        if (t->role == TOUCH_JUMP)       S.pub.phys.jump = false;
        t->active = false;
        t->role = TOUCH_NONE;
    }
    /* Clear touch_active only when zero touches remain. */
    bool any = false;
    for (int i = 0; i < MAX_TOUCHES; ++i) if (S.touches[i].active) { any = true; break; }
    S.pub.touch_active = any;
}

/* ----------------------------------------------------------------------- */

void input_event(const sapp_event* e) {
    switch (e->type) {
        case SAPP_EVENTTYPE_KEY_DOWN: set_key(e->key_code, true);  break;
        case SAPP_EVENTTYPE_KEY_UP:   set_key(e->key_code, false); break;

        case SAPP_EVENTTYPE_MOUSE_MOVE:
            if (S.pub.pointer_locked) {
                S.pub.mouse_dx += e->mouse_dx;
                S.pub.mouse_dy += e->mouse_dy;
            }
            break;

        case SAPP_EVENTTYPE_MOUSE_DOWN:
            /* Don't auto-lock on mobile (there's no mouse). */
            if (!S.pub.pointer_locked && !S.pub.touch_active) sapp_lock_mouse(true);
            if (e->mouse_button == SAPP_MOUSEBUTTON_LEFT)   S.pub.left_click   = true;
            if (e->mouse_button == SAPP_MOUSEBUTTON_RIGHT)  S.pub.right_click  = true;
            if (e->mouse_button == SAPP_MOUSEBUTTON_MIDDLE) S.pub.middle_click = true;
            break;

        case SAPP_EVENTTYPE_MOUSE_SCROLL:
            S.pub.wheel_dy += e->scroll_y;
            break;

        case SAPP_EVENTTYPE_TOUCHES_BEGAN:     handle_touches_began(e);  break;
        case SAPP_EVENTTYPE_TOUCHES_MOVED:     handle_touches_moved(e);  break;
        case SAPP_EVENTTYPE_TOUCHES_ENDED:
        case SAPP_EVENTTYPE_TOUCHES_CANCELLED: handle_touches_ended(e);  break;

        case SAPP_EVENTTYPE_UNFOCUSED:
            memset(&S.pub.phys, 0, sizeof(S.pub.phys));
            clear_stick();
            clear_look_stick();
            break;

        default: break;
    }
    S.pub.pointer_locked = sapp_mouse_locked();
}
