#include "client/persistence.h"
#include "client/client_kv.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define KEY_PREFIX        "tenebris-c:world:"
#define KEY_TILE_PREFIX   "tenebris-c:tile:"
#define KEY_TORCH_PREFIX  "tenebris-c:torches:"

/* Hex encoding for the 128-byte column. localStorage values are
 * UTF-16 strings, so packing bytes "raw" runs into surrogate-pair
 * traps - hex sidesteps that with a 2x size overhead (256 chars per
 * tile, ~512 B after UTF-16). Trade is fine: at sub=3 a fully edited
 * planet (642 tiles) is ~330 KB, well inside the per-origin budget. */
static void hex_encode(const uint8_t* in, int n, char* out) {
    static const char hex[] = "0123456789abcdef";
    for (int i = 0; i < n; ++i) {
        out[2*i + 0] = hex[(in[i] >> 4) & 0xF];
        out[2*i + 1] = hex[(in[i]     ) & 0xF];
    }
    out[2*n] = '\0';
}

static int hex_value(char c) {
    if (c >= '0' && c <= '9') return c - '0';
    if (c >= 'a' && c <= 'f') return c - 'a' + 10;
    if (c >= 'A' && c <= 'F') return c - 'A' + 10;
    return -1;
}

static bool hex_decode(const char* in, uint8_t* out, int n) {
    for (int i = 0; i < n; ++i) {
        int hi = hex_value(in[2*i + 0]);
        int lo = hex_value(in[2*i + 1]);
        if (hi < 0 || lo < 0) return false;
        out[i] = (uint8_t)((hi << 4) | lo);
    }
    return true;
}

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
    /* Also wipe every per-tile column and per-body torch list, so
     * deleting a world is a full reset rather than leaving orphaned
     * edits that would attach to a freshly-recreated world of the
     * same name. */
    persistence_clear_world(world_name);
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

/* ----------------------------------------------------------------- */
/* Per-edit tile + torch persistence                                  */
/* ----------------------------------------------------------------- */

static void build_tile_key(const char* world, uint32_t body, int tile,
                           char* out, size_t cap) {
    snprintf(out, cap, "%s%s:%u:%d", KEY_TILE_PREFIX, world,
             (unsigned)body, tile);
}

static void build_tile_body_prefix(const char* world, uint32_t body,
                                   char* out, size_t cap) {
    snprintf(out, cap, "%s%s:%u:", KEY_TILE_PREFIX, world, (unsigned)body);
}

static void build_torch_key(const char* world, uint32_t body,
                            char* out, size_t cap) {
    snprintf(out, cap, "%s%s:%u", KEY_TORCH_PREFIX, world, (unsigned)body);
}

bool persistence_save_tile(const char* world_name, uint32_t body_id,
                           int tile_idx, const uint8_t* column) {
    if (!valid_name(world_name) || !column || tile_idx < 0) return false;
    char key[128];
    build_tile_key(world_name, body_id, tile_idx, key, sizeof key);
    char hex[PERSISTENCE_COLUMN_BYTES * 2 + 1];
    hex_encode(column, PERSISTENCE_COLUMN_BYTES, hex);
    client_kv_set(key, hex);
    return true;
}

bool persistence_load_tile(const char* world_name, uint32_t body_id,
                           int tile_idx, uint8_t* out_column) {
    if (!valid_name(world_name) || !out_column || tile_idx < 0) return false;
    char key[128];
    build_tile_key(world_name, body_id, tile_idx, key, sizeof key);
    char* s = client_kv_get(key);
    if (!s) return false;
    bool ok = (strlen(s) == PERSISTENCE_COLUMN_BYTES * 2) &&
              hex_decode(s, out_column, PERSISTENCE_COLUMN_BYTES);
    free(s);
    return ok;
}

int persistence_list_saved_tiles(const char* world_name, uint32_t body_id,
                                 int* out_indices, int cap) {
    if (!valid_name(world_name) || !out_indices || cap <= 0) return 0;
    char prefix[128];
    build_tile_body_prefix(world_name, body_id, prefix, sizeof prefix);
    char* list = client_kv_list_with_prefix(prefix);
    if (!list) return 0;
    int count = 0;
    char* p = list;
    while (*p && count < cap) {
        char* nl = strchr(p, '\n');
        if (nl) *nl = '\0';
        /* `p` is now the tile-index portion only (prefix already
         * stripped by client_kv_list_with_prefix). Parse decimal;
         * skip on garbage rather than abort the whole list. */
        char* endp = NULL;
        long idx = strtol(p, &endp, 10);
        if (endp != p && idx >= 0) {
            out_indices[count++] = (int)idx;
        }
        if (!nl) break;
        p = nl + 1;
    }
    free(list);
    return count;
}

/* Torch CSV: "tile,px,py,pz,ux,uy,uz" per line, '\n'-separated.
 * Floats use a fixed-precision form so we round-trip cleanly after
 * a reload. */
bool persistence_save_torches(const char* world_name, uint32_t body_id,
                              const persistence_torch_t* torches, int count) {
    if (!valid_name(world_name)) return false;
    char key[128];
    build_torch_key(world_name, body_id, key, sizeof key);
    if (count <= 0) {
        client_kv_remove(key);
        return true;
    }
    if (!torches) return false;

    /* Each line is ~80 chars worst case ("65535," + 6 * "-1234.123456,").
     * 256 torches max => ~21 KB buffer; size for a safe ceiling. */
    size_t cap = (size_t)count * 96 + 16;
    char* buf = (char*)malloc(cap);
    if (!buf) return false;
    size_t n = 0;
    for (int i = 0; i < count; ++i) {
        const persistence_torch_t* t = &torches[i];
        int w = snprintf(buf + n, cap - n,
                         "%d,%.6f,%.6f,%.6f,%.6f,%.6f,%.6f%s",
                         t->tile_idx,
                         (double)t->pos[0], (double)t->pos[1], (double)t->pos[2],
                         (double)t->up[0],  (double)t->up[1],  (double)t->up[2],
                         (i + 1 < count) ? "\n" : "");
        if (w < 0 || (size_t)w >= cap - n) { free(buf); return false; }
        n += (size_t)w;
    }
    client_kv_set(key, buf);
    free(buf);
    return true;
}

int persistence_load_torches(const char* world_name, uint32_t body_id,
                             persistence_torch_t* out, int cap) {
    if (!valid_name(world_name) || !out || cap <= 0) return 0;
    char key[128];
    build_torch_key(world_name, body_id, key, sizeof key);
    char* s = client_kv_get(key);
    if (!s) return 0;

    int count = 0;
    char* p = s;
    while (*p && count < cap) {
        char* nl = strchr(p, '\n');
        if (nl) *nl = '\0';
        persistence_torch_t t;
        int n = sscanf(p, "%d,%f,%f,%f,%f,%f,%f",
                       &t.tile_idx,
                       &t.pos[0], &t.pos[1], &t.pos[2],
                       &t.up[0],  &t.up[1],  &t.up[2]);
        if (n == 7) out[count++] = t;
        if (!nl) break;
        p = nl + 1;
    }
    free(s);
    return count;
}

void persistence_clear_world(const char* world_name) {
    if (!valid_name(world_name)) return;
    /* Clear every per-tile key under tenebris-c:tile:<world>: and
     * every per-body torch key under tenebris-c:torches:<world>:.
     * Iterates the list returned by client_kv_list_with_prefix and
     * issues per-key removes; the prefix-list call is the only way
     * to enumerate localStorage by shape. */
    char tile_pfx[96];
    snprintf(tile_pfx, sizeof tile_pfx, "%s%s:", KEY_TILE_PREFIX, world_name);
    char* list = client_kv_list_with_prefix(tile_pfx);
    if (list) {
        char* p = list;
        while (*p) {
            char* nl = strchr(p, '\n');
            if (nl) *nl = '\0';
            char full_key[160];
            snprintf(full_key, sizeof full_key, "%s%s", tile_pfx, p);
            client_kv_remove(full_key);
            if (!nl) break;
            p = nl + 1;
        }
        free(list);
    }

    char torch_pfx[96];
    snprintf(torch_pfx, sizeof torch_pfx, "%s%s:", KEY_TORCH_PREFIX, world_name);
    list = client_kv_list_with_prefix(torch_pfx);
    if (list) {
        char* p = list;
        while (*p) {
            char* nl = strchr(p, '\n');
            if (nl) *nl = '\0';
            char full_key[160];
            snprintf(full_key, sizeof full_key, "%s%s", torch_pfx, p);
            client_kv_remove(full_key);
            if (!nl) break;
            p = nl + 1;
        }
        free(list);
    }
}
