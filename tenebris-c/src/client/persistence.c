#include "client/persistence.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#ifdef __EMSCRIPTEN__
#include <emscripten.h>

/* Round-trip a tiny CSV blob through localStorage. Format:
 *   "x,y,z,yaw,pitch,roll,body_id"
 * Just doubles + floats + a uint, formatted to enough precision that
 * a position 10 km from origin still resumes within millimetres. */

EM_JS(void, persistence_js_set, (const char* str), {
    try { window.localStorage.setItem('tenebris-c:save', UTF8ToString(str)); }
    catch (e) { /* localStorage disabled / quota */ }
});

EM_JS(char*, persistence_js_get, (void), {
    try {
        var s = window.localStorage.getItem('tenebris-c:save');
        if (!s) return 0;
        var len = lengthBytesUTF8(s) + 1;
        var p = _malloc(len);
        stringToUTF8(s, p, len);
        return p;
    } catch (e) { return 0; }
});

EM_JS(void, persistence_js_clear, (void), {
    try { window.localStorage.removeItem('tenebris-c:save'); } catch (e) {}
});
#else
/* Native build: no persistence yet. Bridges to disk land with M6. */
static char S_BUF[256];
static void persistence_js_set(const char* s) {
    snprintf(S_BUF, sizeof S_BUF, "%s", s);
}
static char* persistence_js_get(void) {
    if (S_BUF[0] == 0) return NULL;
    char* out = (char*)malloc(strlen(S_BUF) + 1);
    if (out) strcpy(out, S_BUF);
    return out;
}
static void persistence_js_clear(void) { S_BUF[0] = 0; }
#endif

bool persistence_save(const persistence_save_t* s) {
    if (!s) return false;
    char buf[160];
    snprintf(buf, sizeof buf,
             "%.6f,%.6f,%.6f,%.6f,%.6f,%.6f,%u",
             s->pos_x, s->pos_y, s->pos_z,
             (double)s->yaw, (double)s->pitch, (double)s->roll,
             (unsigned)s->body_id);
    persistence_js_set(buf);
    return true;
}

bool persistence_load(persistence_save_t* out) {
    if (!out) return false;
    char* s = persistence_js_get();
    if (!s) return false;

    double x, y, z, yaw, pitch, roll;
    unsigned int body;
    int n = sscanf(s, "%lf,%lf,%lf,%lf,%lf,%lf,%u",
                     &x, &y, &z, &yaw, &pitch, &roll, &body);
    free(s);
    if (n != 7) return false;

    out->pos_x   = x;
    out->pos_y   = y;
    out->pos_z   = z;
    out->yaw     = (float)yaw;
    out->pitch   = (float)pitch;
    out->roll    = (float)roll;
    out->body_id = (uint32_t)body;
    return true;
}

void persistence_clear(void) {
    persistence_js_clear();
}
