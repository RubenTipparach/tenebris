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

/* Must be called inside the main render pass (after sg_begin_pass,
 * before sg_end_pass). Submits orthographic 2D geometry via sokol_gl. */
void mobile_ui_draw(void);

#endif
