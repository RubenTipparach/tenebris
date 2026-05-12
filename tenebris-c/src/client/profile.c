#include "client/profile.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define PROFILE_KEY_PREFIX "tenebris-c:profile:"
#define ACTIVE_KEY         "tenebris-c:active-profile"

/* ----------------------------------------------------------------- */
/* JS bridge — localStorage on web build, in-RAM stub on native.      */
/* ----------------------------------------------------------------- */

#ifdef __EMSCRIPTEN__
#include <emscripten.h>

EM_JS(void, profile_js_set, (const char* key, const char* val), {
    try { window.localStorage.setItem(UTF8ToString(key), UTF8ToString(val)); }
    catch (e) {}
});

EM_JS(char*, profile_js_get, (const char* key), {
    try {
        var s = window.localStorage.getItem(UTF8ToString(key));
        if (!s) return 0;
        var len = lengthBytesUTF8(s) + 1;
        var p = _malloc(len);
        stringToUTF8(s, p, len);
        return p;
    } catch (e) { return 0; }
});

EM_JS(void, profile_js_remove, (const char* key), {
    try { window.localStorage.removeItem(UTF8ToString(key)); } catch (e) {}
});

/* Return newline-separated list of profile tokens (the part after
 * the prefix). Caller frees. */
EM_JS(char*, profile_js_list_tokens, (void), {
    try {
        var prefix = 'tenebris-c:profile:';
        var found  = [];
        for (var i = 0; i < window.localStorage.length; ++i) {
            var k = window.localStorage.key(i);
            if (k && k.indexOf(prefix) === 0) {
                found.push(k.substring(prefix.length));
            }
        }
        if (found.length === 0) return 0;
        var s = found.join('\n');
        var len = lengthBytesUTF8(s) + 1;
        var p = _malloc(len);
        stringToUTF8(s, p, len);
        return p;
    } catch (e) { return 0; }
});

/* Generate a 32-char hex token via crypto.getRandomValues. */
EM_JS(char*, profile_js_new_token, (void), {
    try {
        var bytes = new Uint8Array(16);
        crypto.getRandomValues(bytes);
        var hex = '';
        for (var i = 0; i < bytes.length; ++i) {
            var h = bytes[i].toString(16);
            if (h.length < 2) h = '0' + h;
            hex += h;
        }
        var len = lengthBytesUTF8(hex) + 1;
        var p = _malloc(len);
        stringToUTF8(hex, p, len);
        return p;
    } catch (e) { return 0; }
});
#else
/* Native: in-RAM stand-in. */
#include <time.h>
static struct { char k[64]; char v[64]; } S_KV[64];
static int S_KV_N = 0;
static void profile_js_set(const char* k, const char* v) {
    for (int i = 0; i < S_KV_N; ++i) if (strcmp(S_KV[i].k, k) == 0) {
        snprintf(S_KV[i].v, sizeof S_KV[i].v, "%s", v); return;
    }
    if (S_KV_N >= (int)(sizeof S_KV / sizeof S_KV[0])) return;
    snprintf(S_KV[S_KV_N].k, sizeof S_KV[0].k, "%s", k);
    snprintf(S_KV[S_KV_N].v, sizeof S_KV[0].v, "%s", v);
    S_KV_N++;
}
static char* profile_js_get(const char* k) {
    for (int i = 0; i < S_KV_N; ++i) if (strcmp(S_KV[i].k, k) == 0) {
        char* out = (char*)malloc(strlen(S_KV[i].v) + 1);
        if (out) strcpy(out, S_KV[i].v);
        return out;
    }
    return NULL;
}
static void profile_js_remove(const char* k) {
    for (int i = 0; i < S_KV_N; ++i) if (strcmp(S_KV[i].k, k) == 0) {
        S_KV[i] = S_KV[--S_KV_N]; return;
    }
}
static char* profile_js_list_tokens(void) {
    if (S_KV_N == 0) return NULL;
    size_t need = 1;
    const size_t plen = strlen(PROFILE_KEY_PREFIX);
    for (int i = 0; i < S_KV_N; ++i)
        if (strncmp(S_KV[i].k, PROFILE_KEY_PREFIX, plen) == 0)
            need += strlen(S_KV[i].k) - plen + 1;
    char* out = (char*)malloc(need); if (!out) return NULL;
    out[0] = 0;
    for (int i = 0; i < S_KV_N; ++i) {
        if (strncmp(S_KV[i].k, PROFILE_KEY_PREFIX, plen) != 0) continue;
        if (out[0]) strcat(out, "\n");
        strcat(out, S_KV[i].k + plen);
    }
    return out;
}
static char* profile_js_new_token(void) {
    static int counter = 0;
    char* out = (char*)malloc(PROFILE_TOKEN_LEN + 1);
    if (!out) return NULL;
    /* Deterministic-enough for native dev; the browser path uses
     * crypto.getRandomValues. */
    snprintf(out, PROFILE_TOKEN_LEN + 1, "n%015lx%015x",
             (unsigned long)time(NULL), ++counter);
    return out;
}
#endif

/* ----------------------------------------------------------------- */
/* Public surface                                                     */
/* ----------------------------------------------------------------- */

static bool name_is_valid(const char* n) {
    if (!n || !*n) return false;
    size_t len = strlen(n);
    if (len > PROFILE_NAME_MAX) return false;
    for (size_t i = 0; i < len; ++i)
        if (n[i] == '\n' || n[i] == '\r' || n[i] == ':') return false;
    return true;
}

void profile_module_init(void) { }

int profile_list(profile_t* out, int cap) {
    if (!out || cap <= 0) return 0;
    char* tokens = profile_js_list_tokens();
    if (!tokens) return 0;
    int n = 0;
    char* p = tokens;
    while (*p && n < cap && n < PROFILE_MAX) {
        char* nl = strchr(p, '\n');
        if (nl) *nl = 0;
        /* Read the name for this token. */
        char key[64];
        snprintf(key, sizeof key, "%s%s", PROFILE_KEY_PREFIX, p);
        char* name = profile_js_get(key);
        if (name) {
            snprintf(out[n].token, sizeof out[n].token, "%s", p);
            snprintf(out[n].name,  sizeof out[n].name,  "%s", name);
            free(name);
            ++n;
        }
        if (!nl) break;
        p = nl + 1;
    }
    free(tokens);

    /* Simple insertion sort by name. */
    for (int i = 1; i < n; ++i) {
        profile_t key = out[i];
        int j = i - 1;
        while (j >= 0 && strcmp(out[j].name, key.name) > 0) {
            out[j + 1] = out[j];
            --j;
        }
        out[j + 1] = key;
    }
    return n;
}

bool profile_create(const char* name, profile_t* out) {
    if (!name_is_valid(name)) return false;
    char* token = profile_js_new_token();
    if (!token) return false;
    char key[64];
    snprintf(key, sizeof key, "%s%s", PROFILE_KEY_PREFIX, token);
    profile_js_set(key, name);
    profile_js_set(ACTIVE_KEY, token);
    if (out) {
        snprintf(out->token, sizeof out->token, "%s", token);
        snprintf(out->name,  sizeof out->name,  "%s", name);
    }
    free(token);
    return true;
}

bool profile_get_active(profile_t* out) {
    if (!out) return false;
    char* token = profile_js_get(ACTIVE_KEY);
    if (!token) return false;
    char key[64];
    snprintf(key, sizeof key, "%s%s", PROFILE_KEY_PREFIX, token);
    char* name = profile_js_get(key);
    if (!name) { free(token); return false; }
    snprintf(out->token, sizeof out->token, "%s", token);
    snprintf(out->name,  sizeof out->name,  "%s", name);
    free(token);
    free(name);
    return true;
}

void profile_set_active(const char* token) {
    if (!token || !*token) return;
    profile_js_set(ACTIVE_KEY, token);
}

bool profile_has_active(void) {
    char* token = profile_js_get(ACTIVE_KEY);
    if (!token) return false;
    char key[64];
    snprintf(key, sizeof key, "%s%s", PROFILE_KEY_PREFIX, token);
    char* name = profile_js_get(key);
    bool ok = (name != NULL);
    free(token);
    free(name);
    return ok;
}

void profile_delete(const char* token) {
    if (!token || !*token) return;
    char key[64];
    snprintf(key, sizeof key, "%s%s", PROFILE_KEY_PREFIX, token);
    profile_js_remove(key);

    /* If the active profile was the one we deleted, pick another. */
    profile_t active;
    if (profile_get_active(&active) && strcmp(active.token, token) == 0) {
        profile_t list[PROFILE_MAX];
        int n = profile_list(list, PROFILE_MAX);
        if (n > 0) profile_set_active(list[0].token);
        else       profile_js_remove(ACTIVE_KEY);
    }
}
