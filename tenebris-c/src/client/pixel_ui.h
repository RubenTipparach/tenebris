#ifndef TENEBRIS_CLIENT_PIXEL_UI_H
#define TENEBRIS_CLIENT_PIXEL_UI_H

/*
 * pixel_ui — immediate-mode UI module for the in-game inventory and
 * crafting screens. Renders nine-sliced pixel-art panels, buttons (in
 * normal/hover/pressed/disabled states), and inventory slots from a
 * single sprite atlas PNG. Layout + nine-slice margins for every sprite
 * live in assets/config/ui.yaml so the look is theme-swappable: drop
 * in a different PNG with the same layout and the same widget calls
 * paint the new theme.
 *
 * Usage shape, once per frame, from a UI draw callsite in main_web.c:
 *
 *     pixel_ui_begin();
 *
 *     pixel_ui_panel(panel_x, panel_y, panel_w, panel_h);
 *     pixel_ui_label(panel_x + 8, panel_y + 6, "Crafting");
 *
 *     if (pixel_ui_button("craft_planks", bx, by, 96, 24,
 *                         "Make Planks", PIXEL_UI_BUTTON_NORMAL)) {
 *         on_craft_planks();
 *     }
 *
 *     pixel_ui_slot("slot_0", sx, sy, icon_tile, count, selected,
 *                   PIXEL_UI_SLOT_NORMAL);
 *
 *     pixel_ui_end();
 *
 * The "id" strings on interactive widgets are how the module tracks
 * which widget is hovered vs. clicked across frames — pass a stable
 * pointer (e.g. a string literal or a per-widget constant). Two
 * widgets sharing an id will behave as one logical widget.
 *
 * Event pump: forward every sapp_event to pixel_ui_event() before the
 * existing mobile_ui_handle_touch / input_event chain in main_web.c.
 * A widget consumes the click; consumed events return true and should
 * not be fed to anything underneath.
 */

#include "sokol_app.h"      /* sapp_event */

#include <stdbool.h>
#include <stdint.h>

/* Lifecycle ------------------------------------------------------------- */

/* Load the atlas PNG named in assets/config/ui.yaml (or the compiled-in
 * default, "assets/textures/ui/default.png") into a GPU texture and
 * create the alpha-blended pipelines used for drawing. Safe to call
 * twice — the second call is a no-op. Returns 0 on success, non-zero
 * if the atlas couldn't be loaded (the module then renders nothing). */
int  pixel_ui_init(void);
void pixel_ui_shutdown(void);

/* Forward a window event. Returns true if the module consumed the
 * event (a click landed on a widget, etc.) — the caller should NOT
 * pass consumed events down to the input layer. */
bool pixel_ui_event(const sapp_event* e);

/* Begin / end a frame's worth of UI. begin() resets per-frame state
 * (hot id, layout cursor). end() commits the click → activated
 * transition that pixel_ui_button uses to drive its return value. */
void pixel_ui_begin(void);
void pixel_ui_end(void);

/* Drawing primitives ---------------------------------------------------- */

/* Stretch-blit the panel sprite over the given screen rect. Nine-slice
 * preserves the corners and tiles/stretches the edges + centre. */
void pixel_ui_panel     (int x, int y, int w, int h);
void pixel_ui_title_bar (int x, int y, int w, int h);

/* Plain label rendered with sokol_debugtext (the only readable text
 * path the C port has today). Coordinates are pixels of the screen-
 * space ortho projection. label must be 7-bit ASCII — per the repo
 * rule, no em-dashes / smart quotes / underscores. */
void pixel_ui_label(int x, int y, const char* label);

/* Button states. PIXEL_UI_BUTTON_NORMAL is the default; pass
 * PIXEL_UI_BUTTON_DISABLED to render the greyed-out style AND
 * suppress hover / click handling. PIXEL_UI_BUTTON_ACTIVE renders
 * the hover sprite regardless of mouse position so a tab bar can
 * highlight the active tab; the button still processes clicks. */
typedef enum {
    PIXEL_UI_BUTTON_NORMAL = 0,
    PIXEL_UI_BUTTON_DISABLED,
    PIXEL_UI_BUTTON_ACTIVE,
} pixel_ui_button_state_t;

/* Slot states. The visual treatment is independent of the contents:
 * an empty slot can still be SELECTED, a slot with an item can be
 * DISABLED (recipe filter says you can't pick this up yet), etc. */
typedef enum {
    PIXEL_UI_SLOT_NORMAL = 0,
    PIXEL_UI_SLOT_SELECTED,
    PIXEL_UI_SLOT_DISABLED,
} pixel_ui_slot_state_t;

/* A clickable button. Returns true on the frame the user releases
 * the mouse over the button (the standard immediate-mode click
 * semantic). `id` MUST be a stable pointer for the lifetime of the
 * widget — interning a string literal is the easy path. */
bool pixel_ui_button(const char* id, int x, int y, int w, int h,
                     const char* label, pixel_ui_button_state_t state);

/* A clickable inventory slot. `atlas_view_id` + `atlas_sampler_id`
 * point at the texture the icon is sampled from (pass the terrain
 * atlas for block icons via renderer_atlas_view_id() /
 * renderer_atlas_sampler_id(), or the item atlas when that lands).
 * `u0..v1` is the icon sub-rect in normalised UVs. count <= 0 hides
 * the count badge; count > 9000 is treated as "infinite" and the
 * badge is suppressed too. Returns true on click. */
bool pixel_ui_slot(const char* id, int x, int y,
                   uint32_t atlas_view_id, uint32_t atlas_sampler_id,
                   float u0, float v0, float u1, float v1,
                   int count, pixel_ui_slot_state_t state);

/* Demo screen that exercises every primitive — toggleable from
 * main_web.c with a debug key so you can eyeball the swatch live
 * while iterating on art or YAML. */
void pixel_ui_demo_draw(void);
bool pixel_ui_demo_visible(void);
void pixel_ui_demo_toggle(void);

#endif
