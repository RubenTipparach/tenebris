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
    TOUCH_HOTBAR,       /* tap on a hotbar slot - slot index in hotbar_slot */
    /* Teleport-menu buttons. Edge-triggered — the caller checks
     * for a true value once and is expected to reset it via
     * input_consume_menu_event. */
    TOUCH_TP,
    TOUCH_MENU_UP,
    TOUCH_MENU_DOWN,
    TOUCH_MENU_OK,
    TOUCH_MENU_CLOSE,
} touch_role_t;

/* One-shot edge flags set by touch-down on a menu button, consumed by
 * main_web / teleport_menu. */
typedef struct {
    bool tp_tapped;
    bool menu_up, menu_down, menu_ok, menu_close;
} menu_events_t;

typedef struct {
    uintptr_t id;
    touch_role_t role;
    int    hotbar_slot;            /* valid when role == TOUCH_HOTBAR  */
    float  origin_x, origin_y;     /* where the touch began */
    float  last_x,   last_y;       /* most recent position */
    bool   active;
} touch_t;

static struct {
    input_state_t pub;
    touch_t touches[MAX_TOUCHES];
    bool jump_edge;
    bool survival_toggle_edge;
    menu_events_t menu;
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
        case SAPP_KEYCODE_G:           if (down) S.survival_toggle_edge = true; break;
        case SAPP_KEYCODE_Q:           S.pub.phys.roll_left  = down; break;
        case SAPP_KEYCODE_E:           S.pub.phys.roll_right = down; break;
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
input_state_t*       input_state_mut(void) { return &S.pub; }

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

bool input_consume_tp_tap(void)     { bool v = S.menu.tp_tapped;  S.menu.tp_tapped  = false; return v; }
bool input_consume_menu_up(void)    { bool v = S.menu.menu_up;    S.menu.menu_up    = false; return v; }
bool input_consume_menu_down(void)  { bool v = S.menu.menu_down;  S.menu.menu_down  = false; return v; }
bool input_consume_menu_ok(void)    { bool v = S.menu.menu_ok;    S.menu.menu_ok    = false; return v; }
bool input_consume_menu_close(void) { bool v = S.menu.menu_close; S.menu.menu_close = false; return v; }

bool input_consume_survival_toggle(void) {
    bool v = S.survival_toggle_edge;
    S.survival_toggle_edge = false;
    return v;
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

/* Returns -1 if (x,y) does NOT hit a hotbar slot, else the 0-based
 * slot index. The hotbar's row is left-aligned at (hotbar_x0,
 * hotbar_y0), slot_count slots of size slot_size pitched horizontally
 * by slot_pitch. */
static int hotbar_slot_at(float x, float y) {
    if (S.pub.hotbar_slot_count <= 0 || S.pub.hotbar_slot_size <= 0.0f) {
        return -1;
    }
    if (y < S.pub.hotbar_y0
     || y > S.pub.hotbar_y0 + S.pub.hotbar_slot_size) {
        return -1;
    }
    float dx = x - S.pub.hotbar_x0;
    if (dx < 0.0f) return -1;
    int slot = (int)(dx / S.pub.hotbar_slot_pitch);
    if (slot < 0 || slot >= S.pub.hotbar_slot_count) return -1;
    /* dx-into-slot must still land in the slot's size, not the gap. */
    float into = dx - (float)slot * S.pub.hotbar_slot_pitch;
    if (into > S.pub.hotbar_slot_size) return -1;
    return slot;
}

static touch_role_t classify_touch(float x, float y, int* out_hotbar_slot) {
    *out_hotbar_slot = -1;
    /* Menu buttons (only active while the menu is open, i.e. r > 0) win
     * over everything else so a tap on them doesn't leak to the stick
     * or the main-HUD buttons underneath. */
    if (S.pub.btn_menu_close_r > 0.0f && in_circle(x, y, S.pub.btn_menu_close_cx, S.pub.btn_menu_close_cy, S.pub.btn_menu_close_r)) return TOUCH_MENU_CLOSE;
    if (S.pub.btn_menu_up_r    > 0.0f && in_circle(x, y, S.pub.btn_menu_up_cx,    S.pub.btn_menu_up_cy,    S.pub.btn_menu_up_r))    return TOUCH_MENU_UP;
    if (S.pub.btn_menu_down_r  > 0.0f && in_circle(x, y, S.pub.btn_menu_down_cx,  S.pub.btn_menu_down_cy,  S.pub.btn_menu_down_r))  return TOUCH_MENU_DOWN;
    if (S.pub.btn_menu_ok_r    > 0.0f && in_circle(x, y, S.pub.btn_menu_ok_cx,    S.pub.btn_menu_ok_cy,    S.pub.btn_menu_ok_r))    return TOUCH_MENU_OK;

    /* Main HUD buttons. */
    if (S.pub.btn_break_r > 0.0f && in_circle(x, y, S.pub.btn_break_cx, S.pub.btn_break_cy, S.pub.btn_break_r)) return TOUCH_BREAK;
    if (S.pub.btn_place_r > 0.0f && in_circle(x, y, S.pub.btn_place_cx, S.pub.btn_place_cy, S.pub.btn_place_r)) return TOUCH_PLACE;
    if (S.pub.btn_jump_r  > 0.0f && in_circle(x, y, S.pub.btn_jump_cx,  S.pub.btn_jump_cy,  S.pub.btn_jump_r))  return TOUCH_JUMP;
    if (S.pub.btn_tp_r    > 0.0f && in_circle(x, y, S.pub.btn_tp_cx,    S.pub.btn_tp_cy,    S.pub.btn_tp_r))    return TOUCH_TP;

    /* Hotbar slot taps - mobile-only, hotbar_ui_draw deactivates the
     * row on desktop by setting slot_count = 0. Must win over the
     * bottom-half stick / look-stick zones so a tap-on-slot doesn't
     * leak into the look stick. */
    int slot = hotbar_slot_at(x, y);
    if (slot >= 0) {
        *out_hotbar_slot = slot;
        return TOUCH_HOTBAR;
    }

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
        t->hotbar_slot = -1;
        int hotbar_slot = -1;
        t->role = classify_touch(tp->pos_x, tp->pos_y, &hotbar_slot);

        switch (t->role) {
            case TOUCH_STICK:      update_stick_from_touch(t);      break;
            case TOUCH_LOOK_STICK: update_look_stick_from_touch(t); break;
            case TOUCH_BREAK: S.pub.left_click  = true;  S.pub.left_held  = true; break;
            case TOUCH_PLACE: S.pub.right_click = true;  S.pub.right_held = true; break;
            case TOUCH_JUMP:  S.jump_edge = true; S.pub.phys.jump = true; break;
            case TOUCH_HOTBAR:
                /* Edge-trigger the per-slot bool the player controller
                 * already consumes for keyboard 1..9; player_update
                 * folds it into inventory_select. */
                if (hotbar_slot >= 0 && hotbar_slot < 10) {
                    S.pub.hotbar[hotbar_slot] = true;
                    t->hotbar_slot = hotbar_slot;
                }
                break;
            case TOUCH_TP:          S.menu.tp_tapped = true; break;
            case TOUCH_MENU_UP:     S.menu.menu_up    = true; break;
            case TOUCH_MENU_DOWN:   S.menu.menu_down  = true; break;
            case TOUCH_MENU_OK:     S.menu.menu_ok    = true; break;
            case TOUCH_MENU_CLOSE:  S.menu.menu_close = true; break;
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
        if (t->role == TOUCH_BREAK)      S.pub.left_held  = false;
        if (t->role == TOUCH_PLACE)      S.pub.right_held = false;
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
                /* Per-event delta clamp. Normal fast mouse motion at
                 * 1000 Hz polling produces small per-event deltas
                 * (tens of pixels at most); a single event with a
                 * delta in the hundreds is almost always either a
                 * browser pointer-lock-warp synthetic event or a
                 * stalled-event burst the browser fused into one.
                 * Clamping per event filters those out without
                 * limiting legitimate fast flicks (which spread
                 * across many sub-clamp events). The user-perceived
                 * effect: snap-on-mouse rotation glitches disappear
                 * but 360-degree wrist flicks still work normally.
                 *
                 * The look-stick path on mobile is naturally rate-
                 * bounded so it doesn't need this gate. */
                const float MAX_PER_EVENT_PX = 200.0f;
                float dx = e->mouse_dx;
                float dy = e->mouse_dy;
                if (dx >  MAX_PER_EVENT_PX) dx =  MAX_PER_EVENT_PX;
                if (dx < -MAX_PER_EVENT_PX) dx = -MAX_PER_EVENT_PX;
                if (dy >  MAX_PER_EVENT_PX) dy =  MAX_PER_EVENT_PX;
                if (dy < -MAX_PER_EVENT_PX) dy = -MAX_PER_EVENT_PX;
                S.pub.mouse_dx += dx;
                S.pub.mouse_dy += dy;
            }
            break;

        case SAPP_EVENTTYPE_MOUSE_DOWN:
            if (!S.pub.pointer_locked && !S.pub.touch_active) sapp_lock_mouse(true);
            if (e->mouse_button == SAPP_MOUSEBUTTON_LEFT)   { S.pub.left_click   = true; S.pub.left_held  = true; }
            if (e->mouse_button == SAPP_MOUSEBUTTON_RIGHT)  { S.pub.right_click  = true; S.pub.right_held = true; }
            if (e->mouse_button == SAPP_MOUSEBUTTON_MIDDLE)   S.pub.middle_click = true;
            break;
        case SAPP_EVENTTYPE_MOUSE_UP:
            if (e->mouse_button == SAPP_MOUSEBUTTON_LEFT)   S.pub.left_held  = false;
            if (e->mouse_button == SAPP_MOUSEBUTTON_RIGHT)  S.pub.right_held = false;
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
            S.pub.left_held = false;
            S.pub.right_held = false;
            clear_stick();
            clear_look_stick();
            break;

        default: break;
    }
    S.pub.pointer_locked = sapp_mouse_locked();
}
