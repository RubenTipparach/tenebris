#include "client/settings.h"
#include "client/client_kv.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define KV_KEY_MOUSE_SENS "tenebris-c:settings:mouse-sens"

static struct {
    float mouse_sens;
} S = {
    .mouse_sens = SETTINGS_MOUSE_SENS_DEFAULT,
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
