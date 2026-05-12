#include "client/client_kv.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* ====================================================================
 * Web backend — straight passthrough to window.localStorage via EM_JS.
 * Same semantics the previous profile.c / persistence.c stubs had,
 * just consolidated. */

#ifdef __EMSCRIPTEN__
#include <emscripten.h>

EM_JS(void, kv_js_set, (const char* key, const char* val), {
    try {
        window.localStorage.setItem(UTF8ToString(key), UTF8ToString(val));
    } catch (e) { /* localStorage disabled / quota */ }
});

EM_JS(char*, kv_js_get, (const char* key), {
    try {
        var s = window.localStorage.getItem(UTF8ToString(key));
        if (s === null) return 0;
        var len = lengthBytesUTF8(s) + 1;
        var p = _malloc(len);
        stringToUTF8(s, p, len);
        return p;
    } catch (e) { return 0; }
});

EM_JS(void, kv_js_remove, (const char* key), {
    try { window.localStorage.removeItem(UTF8ToString(key)); } catch (e) {}
});

EM_JS(char*, kv_js_list_prefix, (const char* prefix), {
    try {
        var pfx = UTF8ToString(prefix);
        var found = [];
        for (var i = 0; i < window.localStorage.length; ++i) {
            var k = window.localStorage.key(i);
            if (k && k.indexOf(pfx) === 0) found.push(k.substring(pfx.length));
        }
        if (found.length === 0) return 0;
        found.sort();
        var s = found.join('\n');
        var len = lengthBytesUTF8(s) + 1;
        var p = _malloc(len);
        stringToUTF8(s, p, len);
        return p;
    } catch (e) { return 0; }
});

void client_kv_set(const char* k, const char* v) { kv_js_set(k, v ? v : ""); }
char* client_kv_get(const char* k) { return kv_js_get(k); }
void client_kv_remove(const char* k) { kv_js_remove(k); }
char* client_kv_list_with_prefix(const char* p) { return kv_js_list_prefix(p); }

#else
/* ====================================================================
 * Native backend — in-process map with write-through to a single file.
 * Loaded lazily on first access; rewritten in full on every mutation.
 *
 * The map is fixed-capacity so it doesn't grow unboundedly; for the
 * profile + SP-world usage that's a hard ceiling of well under 100
 * entries even on a busy install. */

#include <errno.h>
#include <sys/stat.h>
#include <sys/types.h>

#if defined(_WIN32)
  #include <direct.h>
  #include <windows.h>
  #define KV_PATH_SEP '\\'
#else
  #include <pwd.h>
  #include <unistd.h>
  #define KV_PATH_SEP '/'
#endif

#define KV_MAX_ENTRIES   256
#define KV_KEY_MAX       127
#define KV_VAL_MAX       1023

typedef struct {
    char k[KV_KEY_MAX + 1];
    char v[KV_VAL_MAX + 1];
} kv_entry_t;

static kv_entry_t G_kv[KV_MAX_ENTRIES];
static int        G_kv_n = 0;
static int        G_kv_loaded = 0;
static char       G_kv_path[1024] = { 0 };

/* mkdir -p replacement for the data dir. Walks the path and creates
 * each intermediate component, ignoring already-exists. */
static int kv_mkdir_p(const char* path) {
    char buf[1024];
    size_t len = strnlen(path, sizeof buf - 1);
    if (len == 0) return -1;
    memcpy(buf, path, len);
    buf[len] = 0;
    for (size_t i = 1; i <= len; ++i) {
        if (i == len || buf[i] == KV_PATH_SEP) {
            char saved = buf[i];
            buf[i] = 0;
#if defined(_WIN32)
            if (_mkdir(buf) != 0 && errno != EEXIST) return -1;
#else
            if (mkdir(buf, 0755) != 0 && errno != EEXIST) return -1;
#endif
            buf[i] = saved;
        }
    }
    return 0;
}

/* Resolve the cross-platform user data directory and stash the full
 * `<dir>/kv.txt` path in G_kv_path. The directory is created on
 * first use; failures fall back to the current working directory so
 * we at least get a kv.txt next to the binary rather than nothing. */
static void kv_resolve_path(void) {
    if (G_kv_path[0]) return;
    char dir[1024] = { 0 };

#if defined(_WIN32)
    const char* appdata = getenv("APPDATA");
    if (appdata && *appdata) {
        snprintf(dir, sizeof dir, "%s\\tenebris-c", appdata);
    }
#elif defined(__APPLE__)
    const char* home = getenv("HOME");
    if (!home || !*home) {
        struct passwd* pw = getpwuid(getuid());
        home = pw ? pw->pw_dir : NULL;
    }
    if (home && *home) {
        snprintf(dir, sizeof dir,
                 "%s/Library/Application Support/tenebris-c", home);
    }
#else
    const char* xdg = getenv("XDG_DATA_HOME");
    if (xdg && *xdg) {
        snprintf(dir, sizeof dir, "%s/tenebris-c", xdg);
    } else {
        const char* home = getenv("HOME");
        if (!home || !*home) {
            struct passwd* pw = getpwuid(getuid());
            home = pw ? pw->pw_dir : NULL;
        }
        if (home && *home) {
            snprintf(dir, sizeof dir, "%s/.local/share/tenebris-c", home);
        }
    }
#endif

    if (!dir[0] || kv_mkdir_p(dir) != 0) {
        /* Fallback: same directory as the binary's CWD. Better than
         * silently dropping saves. */
        snprintf(G_kv_path, sizeof G_kv_path, "tenebris-c-kv.txt");
        return;
    }
    snprintf(G_kv_path, sizeof G_kv_path, "%s%ckv.txt", dir, KV_PATH_SEP);
}

static int kv_find(const char* k) {
    for (int i = 0; i < G_kv_n; ++i)
        if (strcmp(G_kv[i].k, k) == 0) return i;
    return -1;
}

static void kv_load_file(void) {
    if (G_kv_loaded) return;
    G_kv_loaded = 1;
    kv_resolve_path();
    FILE* f = fopen(G_kv_path, "rb");
    if (!f) return;
    fseek(f, 0, SEEK_END);
    long sz = ftell(f);
    if (sz < 0 || sz > 4 * 1024 * 1024) { fclose(f); return; }
    rewind(f);
    char* buf = (char*)malloc((size_t)sz + 1);
    if (!buf) { fclose(f); return; }
    size_t r = fread(buf, 1, (size_t)sz, f);
    fclose(f);
    buf[r] = 0;

    /* Parse: one `key=value\n` per line. Lines without `=` are skipped. */
    char* line = buf;
    while (line < buf + r && G_kv_n < KV_MAX_ENTRIES) {
        char* nl = (char*)memchr(line, '\n', (size_t)(buf + r - line));
        size_t len = nl ? (size_t)(nl - line) : (size_t)(buf + r - line);
        char* eq = (char*)memchr(line, '=', len);
        if (eq && eq > line) {
            size_t klen = (size_t)(eq - line);
            size_t vlen = len - klen - 1;
            if (klen <= KV_KEY_MAX && vlen <= KV_VAL_MAX) {
                memcpy(G_kv[G_kv_n].k, line, klen); G_kv[G_kv_n].k[klen] = 0;
                memcpy(G_kv[G_kv_n].v, eq + 1, vlen); G_kv[G_kv_n].v[vlen] = 0;
                ++G_kv_n;
            }
        }
        if (!nl) break;
        line = nl + 1;
    }
    free(buf);
}

/* Atomic-rewrite the kv file. Costs O(entries) per mutation, which is
 * trivial at the entry counts we're at. */
static void kv_save_file(void) {
    if (!G_kv_path[0]) return;
    char tmp[1024];
    snprintf(tmp, sizeof tmp, "%s.tmp", G_kv_path);
    FILE* f = fopen(tmp, "wb");
    if (!f) return;
    for (int i = 0; i < G_kv_n; ++i) {
        fprintf(f, "%s=%s\n", G_kv[i].k, G_kv[i].v);
    }
    fclose(f);
    if (rename(tmp, G_kv_path) != 0) {
        remove(tmp);
    }
}

/* Strip framing characters (= and newline) from a string in place. The
 * file format can't represent them and the keys / values we actually
 * store (tokens, world names, CSV blobs) never legitimately contain
 * them, so a soft scrub here keeps load/save round-tripping. */
static void kv_strip_framing(char* s, size_t cap) {
    if (!s) return;
    for (size_t i = 0; i < cap && s[i]; ++i) {
        if (s[i] == '=' || s[i] == '\n' || s[i] == '\r') s[i] = '_';
    }
}

void client_kv_set(const char* k, const char* v) {
    if (!k || !*k) return;
    kv_load_file();
    int idx = kv_find(k);
    if (idx < 0) {
        if (G_kv_n >= KV_MAX_ENTRIES) return;
        idx = G_kv_n++;
        snprintf(G_kv[idx].k, sizeof G_kv[idx].k, "%s", k);
        kv_strip_framing(G_kv[idx].k, sizeof G_kv[idx].k);
    }
    snprintf(G_kv[idx].v, sizeof G_kv[idx].v, "%s", v ? v : "");
    kv_strip_framing(G_kv[idx].v, sizeof G_kv[idx].v);
    kv_save_file();
}

char* client_kv_get(const char* k) {
    if (!k || !*k) return NULL;
    kv_load_file();
    int idx = kv_find(k);
    if (idx < 0) return NULL;
    char* out = (char*)malloc(strlen(G_kv[idx].v) + 1);
    if (out) strcpy(out, G_kv[idx].v);
    return out;
}

void client_kv_remove(const char* k) {
    if (!k || !*k) return;
    kv_load_file();
    int idx = kv_find(k);
    if (idx < 0) return;
    G_kv[idx] = G_kv[--G_kv_n];
    kv_save_file();
}

char* client_kv_list_with_prefix(const char* prefix) {
    if (!prefix) return NULL;
    kv_load_file();
    size_t plen = strlen(prefix);
    /* First pass: total byte count + match count. */
    size_t total = 1;     /* trailing NUL */
    int matches = 0;
    for (int i = 0; i < G_kv_n; ++i) {
        if (strncmp(G_kv[i].k, prefix, plen) != 0) continue;
        total += strlen(G_kv[i].k) - plen + 1;     /* +1 for '\n' */
        ++matches;
    }
    if (matches == 0) return NULL;
    char* out = (char*)malloc(total);
    if (!out) return NULL;
    out[0] = 0;
    for (int i = 0; i < G_kv_n; ++i) {
        if (strncmp(G_kv[i].k, prefix, plen) != 0) continue;
        if (out[0]) strcat(out, "\n");
        strcat(out, G_kv[i].k + plen);
    }
    return out;
}

#endif
