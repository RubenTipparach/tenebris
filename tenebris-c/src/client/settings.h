#ifndef TENEBRIS_CLIENT_SETTINGS_H
#define TENEBRIS_CLIENT_SETTINGS_H

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

void  settings_init(void);

float settings_mouse_sensitivity(void);
void  settings_set_mouse_sensitivity(float v);

#endif
