#ifndef TENEBRIS_CLIENT_MOBILE_UI_H
#define TENEBRIS_CLIENT_MOBILE_UI_H

#include <stdbool.h>

/*
 * Tiny 2D overlay drawn via sokol_gl: left-thumb virtual joystick and
 * three right-thumb buttons (Break / Place / Jump). Always drawn (also
 * works on desktop with mouse), but tuned for touch.
 *
 * The overlay reports its own hit rects to input.c every frame so touch
 * classification can hit-test the buttons.
 */

void mobile_ui_init(void);
void mobile_ui_shutdown(void);

/* Toggle whether the top-right hamburger debug menu is drawn /
 * hit-tested. Off by default; main_web flips it on along with every
 * other debug surface when F2 is pressed. Joysticks, jump, and the
 * standalone teleport button stay visible regardless because they
 * are gameplay controls, not debug. */
void mobile_ui_set_debug_menu_visible(bool visible);

/* Toggle whether the standalone teleport (T) button + the teleport
 * menu's mobile nav buttons are drawn / hit-tested. Survival players
 * shouldn't have access to fast travel, so main_web flips this off
 * whenever G.player.survival_mode is true. On by default. */
void mobile_ui_set_teleport_visible(bool visible);

/* Must be called inside the main render pass (after sg_begin_pass,
 * before sg_end_pass). Submits orthographic 2D geometry via sokol_gl. */
void mobile_ui_draw(void);

/* Primitive shared with teleport_menu so all HUD buttons look the
 * same (same ring, same glyph style). Supported glyphs: BPJTXOxv^=F. */
void mobile_ui_draw_button(float cx, float cy, float r,
                           float fill_r, float fill_g, float fill_b, float fill_a,
                           float ring_r, float ring_g, float ring_b, float ring_a,
                           char glyph);

/* Hit-test the debug-menu hamburger + (when open) its popup column.
 * Returns true if the touch / click landed on a debug button — the
 * caller treats that as exclusive so the underlying movement layer
 * doesn't also see the tap. Coordinates are in pixels, origin
 * top-left, matching sapp_event touch / mouse positions. */
bool mobile_ui_handle_touch(float x, float y);

#endif
