#include "client/settings.h"
#include "client/client_kv.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define KV_KEY_MOUSE_SENS     "tenebris-c:settings:mouse-sens"
#define KV_KEY_CHAT_FADE      "tenebris-c:settings:chat-fade-s"
#define KV_KEY_LITE_GRAPHICS  "tenebris-c:settings:lite-graphics"

static struct {
    float mouse_sens;
    float chat_fade_s;
    bool  lite_graphics;
} S = {
    .mouse_sens    = SETTINGS_MOUSE_SENS_DEFAULT,
    .chat_fade_s   = SETTINGS_CHAT_FADE_DEFAULT_S,
    .lite_graphics = false,
};

void settings_init(void) {
    char* v = client_kv_get(KV_KEY_MOUSE_SENS);
    if (v) {
        /* strtod ignores trailing garbage and returns 0 on a fully
         * malformed value; the range check below sanity-clamps
         * either outcome back to defaults so a corrupt KV entry
         * can't break input. */
        float f = (float)strtod(v, NULL);
        if (f >= SETTINGS_MOUSE_SENS_MIN && f <= SETTINGS_MOUSE_SENS_MAX) {
            S.mouse_sens = f;
        }
        free(v);
    }
    v = client_kv_get(KV_KEY_CHAT_FADE);
    if (v) {
        float f = (float)strtod(v, NULL);
        if (f >= SETTINGS_CHAT_FADE_MIN_S && f <= SETTINGS_CHAT_FADE_MAX_S) {
            S.chat_fade_s = f;
        }
        free(v);
    }
    v = client_kv_get(KV_KEY_LITE_GRAPHICS);
    if (v) {
        /* Stored as "1" or "0" - any other value falls back to the
         * compiled default. */
        S.lite_graphics = (strcmp(v, "1") == 0);
        free(v);
    }
}

float settings_mouse_sensitivity(void) {
    return S.mouse_sens;
}

void settings_set_mouse_sensitivity(float v) {
    if (v < SETTINGS_MOUSE_SENS_MIN) v = SETTINGS_MOUSE_SENS_MIN;
    if (v > SETTINGS_MOUSE_SENS_MAX) v = SETTINGS_MOUSE_SENS_MAX;
    if (v == S.mouse_sens) return;
    S.mouse_sens = v;
    char buf[32];
    snprintf(buf, sizeof buf, "%.6f", v);
    client_kv_set(KV_KEY_MOUSE_SENS, buf);
}

float settings_chat_fade_s(void) {
    return S.chat_fade_s;
}

void settings_set_chat_fade_s(float v) {
    if (v < SETTINGS_CHAT_FADE_MIN_S) v = SETTINGS_CHAT_FADE_MIN_S;
    if (v > SETTINGS_CHAT_FADE_MAX_S) v = SETTINGS_CHAT_FADE_MAX_S;
    if (v == S.chat_fade_s) return;
    S.chat_fade_s = v;
    char buf[32];
    snprintf(buf, sizeof buf, "%.2f", v);
    client_kv_set(KV_KEY_CHAT_FADE, buf);
}

bool settings_lite_graphics(void) {
    return S.lite_graphics;
}

void settings_set_lite_graphics(bool enabled) {
    if (S.lite_graphics == enabled) return;
    S.lite_graphics = enabled;
    client_kv_set(KV_KEY_LITE_GRAPHICS, enabled ? "1" : "0");
}
