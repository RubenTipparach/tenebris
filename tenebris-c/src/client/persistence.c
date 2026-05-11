#include "client/persistence.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define KEY_PREFIX "tenebris-c:world:"

/* ----------------------------------------------------------------- */
/* JS bridge — localStorage on the web build, no-op stub on native.   */
/* ----------------------------------------------------------------- */

#ifdef __EMSCRIPTEN__
#include <emscripten.h>

EM_JS(void, persistence_js_set_kv, (const char* key, const char* val), {
    try {
        window.localStorage.setItem(UTF8ToString(key), UTF8ToString(val));
    } catch (e) { /* localStorage disabled / quota */ }
});

EM_JS(char*, persistence_js_get_kv, (const char* key), {
    try {
        var s = window.localStorage.getItem(UTF8ToString(key));
        if (!s) return 0;
        var len = lengthBytesUTF8(s) + 1;
        var p = _malloc(len);
        stringToUTF8(s, p, len);
        return p;
    } catch (e) { return 0; }
});

EM_JS(void, persistence_js_remove_kv, (const char* key), {
    try { window.localStorage.removeItem(UTF8ToString(key)); } catch (e) {}
});

/* Returns newline-separated world names (the part after the
 * "tenebris-c:world:" prefix), sorted ascending. NULL if empty.
 * Caller frees with free(). */
EM_JS(char*, persistence_js_list, (void), {
    try {
        var prefix = 'tenebris-c:world:';
        var found  = [];
        for (var i = 0; i < window.localStorage.length; ++i) {
            var k = window.localStorage.key(i);
            if (k && k.indexOf(prefix) === 0) {
                found.push(k.substring(prefix.length));
            }
        }
        found.sort();
        if (found.length === 0) return 0;
        var s   = found.join('\n');
        var len = lengthBytesUTF8(s) + 1;
        var p   = _malloc(len);
        stringToUTF8(s, p, len);
        return p;
    } catch (e) { return 0; }
});
#else
/* Native: an in-process map keyed on name. Survives the process but
 * not a relaunch. Good enough for headless testing; real on-disk
 * persistence lands when M6 hits. */
#include <stdlib.h>
static struct kv { char k[128]; char v[256]; } S_KV[64];
static int S_KV_N = 0;
static struct kv* kv_find(const char* k) {
    for (int i = 0; i < S_KV_N; ++i) if (strcmp(S_KV[i].k, k) == 0) return &S_KV[i];
    return NULL;
}
static void persistence_js_set_kv(const char* k, const char* v) {
    struct kv* it = kv_find(k);
    if (!it && S_KV_N < (int)(sizeof S_KV / sizeof S_KV[0])) it = &S_KV[S_KV_N++];
    if (it) { snprintf(it->k, sizeof it->k, "%s", k);
              snprintf(it->v, sizeof it->v, "%s", v); }
}
static char* persistence_js_get_kv(const char* k) {
    struct kv* it = kv_find(k);
    if (!it) return NULL;
    char* out = (char*)malloc(strlen(it->v) + 1);
    if (out) strcpy(out, it->v);
    return out;
}
static void persistence_js_remove_kv(const char* k) {
    struct kv* it = kv_find(k);
    if (!it) return;
    *it = S_KV[--S_KV_N];
}
static char* persistence_js_list(void) {
    if (S_KV_N == 0) return NULL;
    size_t need = 1;
    for (int i = 0; i < S_KV_N; ++i)
        if (strncmp(S_KV[i].k, KEY_PREFIX, strlen(KEY_PREFIX)) == 0)
            need += strlen(S_KV[i].k) - strlen(KEY_PREFIX) + 1;
    char* out = (char*)malloc(need); if (!out) return NULL;
    out[0] = 0;
    for (int i = 0; i < S_KV_N; ++i)
        if (strncmp(S_KV[i].k, KEY_PREFIX, strlen(KEY_PREFIX)) == 0) {
            if (out[0]) strcat(out, "\n");
            strcat(out, S_KV[i].k + strlen(KEY_PREFIX));
        }
    return out;
}
#endif

/* ----------------------------------------------------------------- */
/* Public surface                                                     */
/* ----------------------------------------------------------------- */

static bool valid_name(const char* n) {
    if (!n || !*n) return false;
    size_t len = strlen(n);
    if (len > PERSISTENCE_NAME_MAX) return false;
    /* Disallow newline / colon since those are framing characters in
     * our storage format. Everything else is fine — we don't validate
     * for UTF-8 sanity. */
    for (size_t i = 0; i < len; ++i)
        if (n[i] == '\n' || n[i] == '\r' || n[i] == ':') return false;
    return true;
}

static void build_key(const char* world_name, char* out, size_t cap) {
    snprintf(out, cap, "%s%s", KEY_PREFIX, world_name);
}

bool persistence_save(const char* world_name, const persistence_save_t* s) {
    if (!valid_name(world_name) || !s) return false;
    char key[64];
    build_key(world_name, key, sizeof key);
    char buf[160];
    snprintf(buf, sizeof buf,
             "%.6f,%.6f,%.6f,%.6f,%.6f,%.6f,%u",
             s->pos_x, s->pos_y, s->pos_z,
             (double)s->yaw, (double)s->pitch, (double)s->roll,
             (unsigned)s->body_id);
    persistence_js_set_kv(key, buf);
    return true;
}

bool persistence_load(const char* world_name, persistence_save_t* out) {
    if (!valid_name(world_name) || !out) return false;
    char key[64];
    build_key(world_name, key, sizeof key);
    char* s = persistence_js_get_kv(key);
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

void persistence_delete(const char* world_name) {
    if (!valid_name(world_name)) return;
    char key[64];
    build_key(world_name, key, sizeof key);
    persistence_js_remove_kv(key);
}

bool persistence_exists(const char* world_name) {
    if (!valid_name(world_name)) return false;
    char key[64];
    build_key(world_name, key, sizeof key);
    char* s = persistence_js_get_kv(key);
    if (!s) return false;
    free(s);
    return true;
}

int persistence_list_worlds(char out_names[PERSISTENCE_MAX_WORLDS]
                                            [PERSISTENCE_NAME_MAX + 1]) {
    char* csv = persistence_js_list();
    if (!csv) return 0;
    int count = 0;
    char* p = csv;
    while (*p && count < PERSISTENCE_MAX_WORLDS) {
        char* nl = strchr(p, '\n');
        size_t n = nl ? (size_t)(nl - p) : strlen(p);
        if (n > PERSISTENCE_NAME_MAX) n = PERSISTENCE_NAME_MAX;
        memcpy(out_names[count], p, n);
        out_names[count][n] = 0;
        ++count;
        if (!nl) break;
        p = nl + 1;
    }
    free(csv);
    return count;
}
