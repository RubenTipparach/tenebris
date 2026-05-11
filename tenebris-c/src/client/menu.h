#ifndef TENEBRIS_CLIENT_MENU_H
#define TENEBRIS_CLIENT_MENU_H

#include "client/persistence.h"
#include "sokol_app.h"
#include <stdbool.h>

/*
 * Top-level game-state machine. The client boots into GAME_MAIN_MENU,
 * which renders the SP / MP buttons. From there:
 *
 *   GAME_MAIN_MENU
 *     ├── Single Player ── load save (if any) ── GAME_IN_GAME_SP
 *     └── Multiplayer    ── server URL prompt ── GAME_IN_GAME_MP
 *
 * GAME_IN_GAME_* is where the existing main_web.c game loop runs. The
 * menu drives every transition; main_web only reads menu_state() to
 * decide whether to run the 3D path or the menu overlay path.
 */

typedef enum {
    GAME_MAIN_MENU      = 0,
    GAME_SP_WORLD_LIST  = 1,   /* picking which world to load   */
    GAME_MP_URL_PROMPT  = 2,   /* transient — waits for prompt   */
    GAME_IN_GAME_SP     = 3,
    GAME_IN_GAME_MP     = 4,
} game_state_t;

void menu_init(void);
void menu_shutdown(void);

game_state_t menu_state(void);
bool         menu_is_overlay(void);   /* true when MAIN_MENU or MP_URL_PROMPT */

/* Force a state transition. Used by main_web on a `?server=` URL
 * bypass to skip past the menu into MP gameplay. Don't use this from
 * inside the menu — the regular click handlers are the supported
 * path. */
void menu_force_state(game_state_t s);

/* Render the menu UI in screen-space. Call after the 3D pass during
 * MAIN_MENU; safe (no-op) during in-game states. Width/height are the
 * current sapp framebuffer dimensions. */
void menu_draw(int screen_w, int screen_h);

/* Returns true if the event was consumed by the menu. */
bool menu_event(const sapp_event* e);

/* If the SP transition queued a saved pose to resume from, copy it
 * into *out and return true. One-shot: returns false on subsequent
 * calls until the next SP transition. Caller (main_web) applies the
 * pose to the player on entering IN_GAME_SP. */
bool menu_take_sp_resume(persistence_save_t* out);

/* The name of the world the SP session is currently writing back to.
 * Empty string when not in SP. Used by the throttled autosave in
 * main_web. */
const char* menu_active_world(void);

#endif
