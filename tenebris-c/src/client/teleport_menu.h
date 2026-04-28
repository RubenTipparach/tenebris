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

/* Drive the menu from input (keyboard events + touch edge flags).
 * Keeps the player pointer so mobile button taps — which can't pass
 * a player through input.c — can still call player_teleport_to. */
void teleport_menu_set_player(player_ctrl_t* player);

/* Called from the sokol_app event handler — intercepts toggle / nav /
 * confirm keys. Returns true if it consumed the event (caller should
 * not forward it to input.c's handler). */
bool teleport_menu_event(const sapp_event* e, player_ctrl_t* player);

/* Poll touch-button edge events from input.c and apply their menu
 * actions. Call once per frame. */
void teleport_menu_poll_touches(void);

/* Draw the text overlay via sokol_debugtext (no sokol_gl). Register
 * the nav-button hitboxes here too, but their graphic submission is
 * done by teleport_menu_draw_mobile_buttons, which mobile_ui_draw
 * calls from inside its own sokol_gl state block. */
void teleport_menu_draw(void);

/* Submits nav-button SGL commands when the menu is open. Caller must
 * already have mobile_ui's orthographic projection + alpha pipeline
 * active. */
void teleport_menu_draw_mobile_buttons(void);

bool teleport_menu_is_open(void);
void teleport_menu_toggle(void);

#endif
