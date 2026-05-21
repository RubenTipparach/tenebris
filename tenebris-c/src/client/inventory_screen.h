#ifndef TENEBRIS_CLIENT_INVENTORY_SCREEN_H
#define TENEBRIS_CLIENT_INVENTORY_SCREEN_H

#include "client/inventory.h"
#include "sokol_app.h"

#include <stdbool.h>

/*
 * The full-screen inventory + crafting + equipment + skills overlay
 * opened by pressing `I`. Built on top of pixel_ui so the chrome
 * (panel, title, tab bar, slots, buttons) matches the mockups in
 * crafting.md exactly. Equipment + Skills tabs render disabled
 * buttons today - they're surfaced as future destinations, not
 * working screens yet.
 *
 * Drawing seam in main_web.c:
 *
 *   inventory_screen_event(e)   // forward every event while open
 *   inventory_screen_draw(inv)  // call from the UI block once per frame
 */

/* Boot-time setup. Depends on pixel_ui_init + item_atlas_init having
 * already run; main_web wires the order. */
void inventory_screen_init(void);

/* Toggle visibility. Wired to the `I` key in main_web's event
 * handler. */
void inventory_screen_toggle(void);
bool inventory_screen_is_open(void);

/* Forward every sapp event while the overlay is open so movement /
 * mouse-look events get swallowed instead of leaking through to the
 * player controller. Returns true when the event was consumed (the
 * caller should NOT then pass it on to the input layer). */
bool inventory_screen_event(const sapp_event* e);

/* Per-frame draw call. No-op when the overlay isn't open. */
void inventory_screen_draw(inventory_t* inv);

#endif
