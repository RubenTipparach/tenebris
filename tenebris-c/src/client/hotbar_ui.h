#ifndef TENEBRIS_CLIENT_HOTBAR_UI_H
#define TENEBRIS_CLIENT_HOTBAR_UI_H

#include "client/inventory.h"

/*
 * Textured hotbar drawn with sokol_gl. Replaces the old ASCII line in
 * main_web.c — slot icons sample the terrain atlas (same atlas the
 * mesher uses, one column per block) so the hotbar always shows the
 * exact texture you'll place. The selected slot gets a bright outer
 * ring; other slots get a dim frame. Stack count badges render in the
 * bottom-right corner of each slot.
 *
 * Usage:
 *   hotbar_ui_init();        // once at boot, after renderer_init
 *   hotbar_ui_draw(inv);     // each frame, on top of the swapchain
 *   hotbar_ui_shutdown();    // at exit
 */
void hotbar_ui_init(void);
void hotbar_ui_shutdown(void);
void hotbar_ui_draw(const inventory_t* inv);

#endif
