#ifndef TENEBRIS_CLIENT_CHAT_H
#define TENEBRIS_CLIENT_CHAT_H

#include "sokol_app.h"
#include <stdbool.h>
#include <stdint.h>

/*
 * In-game chat. Press Enter to compose, type, Enter to send, Esc to
 * cancel. Recent messages float at the bottom-left and fade out after
 * a few seconds. Every char goes through the same in-game text-input
 * idiom the room JOIN box uses — no `window.prompt`, per CLAUDE.md.
 *
 * Wire path:
 *   client typed text -> net_client_send_chat -> MSG_CHAT (C->S)
 *   server filters by room, broadcasts MSG_CHAT (S->C) to peers
 *   net_client decodes -> chat_post_recv pushes into history
 */

#define CHAT_TEXT_MAX     127        /* matches MSG_CHAT_TEXT_LEN-1 */
#define CHAT_HISTORY_MAX   16        /* messages kept in scrollback */

void chat_init(void);
void chat_shutdown(void);

/* Returns true if the chat compose box is open and consuming input.
 * main_web gates player look / movement input on this so typing doesn't
 * also strafe the camera. */
bool chat_is_active(void);

/* Event hook. Called from the menu / overlay layer; if chat owns the
 * event (typed character, Enter / Esc / Backspace, or "open chat"
 * keystroke when idle), returns true to swallow it. */
bool chat_event(const sapp_event* e);

/* Per-frame draw: history bottom-left, compose box at the bottom edge
 * when active. Call from the UI overlay pass. */
void chat_draw(float screen_w, float screen_h);

/* Push a message into local history. Called by net_client when it
 * decodes MSG_CHAT (whether it originated locally or from a peer).
 * `name` is the display string from the name cache; "system" for
 * server-emitted notices in the future. */
void chat_post_recv(uint32_t player_id, const char* name, const char* text);

#endif
