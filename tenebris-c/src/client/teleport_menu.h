#ifndef TENEBRIS_CLIENT_TELEPORT_MENU_H
#define TENEBRIS_CLIENT_TELEPORT_MENU_H

#include "sokol_app.h"
#include "client/player_ctrl.h"
#include <stdbool.h>

/*
 * Keyboard-driven teleport menu. Toggle with T (or M); arrow keys
 * scroll the selection; Enter teleports. Draws via sokol_debugtext in
 * the same overlay pass as the debug HUD. Mobile users can still use
 * keyboard on tablets; a touch-driven version is a follow-up.
 */

void teleport_menu_init(void);
void teleport_menu_shutdown(void);

/* Call from the sokol_app event handler — intercepts toggle / nav /
 * confirm keys. Returns true if it consumed the event (caller should
 * not forward it to input.c's handler). */
bool teleport_menu_event(const sapp_event* e, player_ctrl_t* player);

/* Draw the menu overlay + the bottom-corner "TP" reminder hint. */
void teleport_menu_draw(void);

bool teleport_menu_is_open(void);

#endif
