#ifndef TENEBRIS_CLIENT_MOBILE_UI_H
#define TENEBRIS_CLIENT_MOBILE_UI_H

#include <stdbool.h>
#include "sokol_gfx.h"
#include "sokol_gl.h"

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

/* Shared alpha-blended 2D sokol_gl pipeline. Created on first
 * mobile_ui_draw and proven to render correctly in the gameplay
 * swapchain pass. Exposed so menu_pause_draw and other overlays
 * can use the same pipeline instead of each lazily creating their
 * own (which was silently failing for menu_pause_draw on certain
 * browser / driver combinations). Returns an invalid pipeline (.id
 * == 0) until the first mobile_ui_draw call has run. */
sgl_pipeline mobile_ui_alpha_pipeline(void);

/* Filled rectangle in screen-pixel coords using the shared alpha
 * pipeline. Caller must have already called sgl_load_pipeline +
 * sgl_ortho. Wraps the sgl_begin_quads / sgl_v2f / sgl_end pattern
 * so menu_pause_draw etc. don't have to duplicate it. */
void mobile_ui_draw_rect(float x, float y, float w, float h,
                          float r, float g, float b, float a);

/* Rectangle outline (1-2 px strip on each edge) at the given rect.
 * Caller is responsible for matching the pipeline state. */
void mobile_ui_draw_rect_outline(float x, float y, float w, float h,
                                  float thick,
                                  float r, float g, float b, float a);

/* Hit-test the debug-menu hamburger + (when open) its popup column.
 * Returns true if the touch / click landed on a debug button — the
 * caller treats that as exclusive so the underlying movement layer
 * doesn't also see the tap. Coordinates are in pixels, origin
 * top-left, matching sapp_event touch / mouse positions. */
bool mobile_ui_handle_touch(float x, float y);

#endif
