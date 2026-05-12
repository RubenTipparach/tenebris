#include "client/persistence.h"
#include "client/client_kv.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define KEY_PREFIX "tenebris-c:world:"

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
    client_kv_set(key, buf);
    return true;
}

bool persistence_load(const char* world_name, persistence_save_t* out) {
    if (!valid_name(world_name) || !out) return false;
    char key[64];
    build_key(world_name, key, sizeof key);
    char* s = client_kv_get(key);
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
    client_kv_remove(key);
}

bool persistence_exists(const char* world_name) {
    if (!valid_name(world_name)) return false;
    char key[64];
    build_key(world_name, key, sizeof key);
    char* s = client_kv_get(key);
    if (!s) return false;
    free(s);
    return true;
}

int persistence_list_worlds(char out_names[PERSISTENCE_MAX_WORLDS]
                                            [PERSISTENCE_NAME_MAX + 1]) {
    char* csv = client_kv_list_with_prefix(KEY_PREFIX);
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
