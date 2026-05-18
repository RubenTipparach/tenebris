#ifndef TENEBRIS_CLIENT_SETTINGS_H
#define TENEBRIS_CLIENT_SETTINGS_H

#include <stdbool.h>

/*
 * Player-tunable runtime settings. Single source of truth for values
 * exposed through the in-game Settings screen (menu.c). Backed by
 * client_kv so changes survive a reload.
 *
 * Add new fields here as the Settings UI grows; each one gets a
 * get/set pair plus a KV key string in settings.c. The init function
 * is called once from main_web boot to populate from disk before
 * gameplay starts.
 */

/* Min/max bounds for the mouse sensitivity slider. The UI maps the
 * slider's normalised [0..1] position to a sensitivity value in
 * [MIN..MAX] linearly. The default sits roughly in the middle of
 * the range for a 1:1 feel on a standard 800-1600 DPI mouse. */
#define SETTINGS_MOUSE_SENS_MIN     0.0005f
#define SETTINGS_MOUSE_SENS_MAX     0.0080f
#define SETTINGS_MOUSE_SENS_DEFAULT 0.0020f

/* Chat live-panel fade window (seconds). After this many seconds
 * since the last received chat message, the floating panel hides
 * (compose box still works via Enter). 60 s default - 5 minutes was
 * too long when the popup contained only one stale "joined" line. */
#define SETTINGS_CHAT_FADE_MIN_S      10.0f
#define SETTINGS_CHAT_FADE_MAX_S     300.0f
#define SETTINGS_CHAT_FADE_DEFAULT_S  60.0f

void  settings_init(void);

float settings_mouse_sensitivity(void);
void  settings_set_mouse_sensitivity(float v);

float settings_chat_fade_s(void);
void  settings_set_chat_fade_s(float v);

/* Lite-graphics preference. Persistent across reloads via client_kv.
 * Read once at boot by main_web (before renderer_init) so the lite
 * water + composite pipelines get built when the user opted in last
 * session. Toggling at runtime persists the new value but does NOT
 * rebuild the renderer - the player has to reload for the visual
 * change to land. Mobile-device auto-detection still wins regardless
 * of this setting; the toggle only lets desktop users opt into the
 * mobile shader path manually for older / integrated GPUs. */
bool  settings_lite_graphics(void);
void  settings_set_lite_graphics(bool enabled);

#endif
