#include "client/profile.h"
#include "client/client_kv.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define PROFILE_KEY_PREFIX "tenebris-c:profile:"
#define ACTIVE_KEY         "tenebris-c:active-profile"

/* ----------------------------------------------------------------- */
/* Token generation. On the web build we go through crypto.getRandom-
 * Values; on native we mix /dev/urandom (or the process PID + time as
 * a fallback) into a 16-byte buffer and hex-encode it. Same output
 * shape both sides — a lowercase 32-char hex string. */
/* ----------------------------------------------------------------- */

#ifdef __EMSCRIPTEN__
#include <emscripten.h>

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
#include <time.h>
#include <unistd.h>

static char* profile_js_new_token(void) {
    unsigned char bytes[16];
    int got = 0;
    FILE* f = fopen("/dev/urandom", "rb");
    if (f) {
        got = (int)fread(bytes, 1, sizeof bytes, f);
        fclose(f);
    }
    if (got != sizeof bytes) {
        /* Fallback: time + pid, splatted across the buffer. Not
         * cryptographic; good enough for an offline single-machine
         * identifier when urandom is unavailable. */
        uint64_t mix = (uint64_t)time(NULL) ^ ((uint64_t)getpid() << 32);
        for (size_t i = 0; i < sizeof bytes; ++i) {
            mix = mix * 6364136223846793005ull + 1442695040888963407ull;
            bytes[i] = (unsigned char)(mix >> 56);
        }
    }
    char* out = (char*)malloc(PROFILE_TOKEN_LEN + 1);
    if (!out) return NULL;
    static const char hex[] = "0123456789abcdef";
    for (size_t i = 0; i < sizeof bytes; ++i) {
        out[i * 2 + 0] = hex[bytes[i] >> 4];
        out[i * 2 + 1] = hex[bytes[i] & 0xF];
    }
    out[PROFILE_TOKEN_LEN] = 0;
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
    char* tokens = client_kv_list_with_prefix(PROFILE_KEY_PREFIX);
    if (!tokens) return 0;
    int n = 0;
    char* p = tokens;
    while (*p && n < cap && n < PROFILE_MAX) {
        char* nl = strchr(p, '\n');
        if (nl) *nl = 0;
        char key[64];
        snprintf(key, sizeof key, "%s%s", PROFILE_KEY_PREFIX, p);
        char* name = client_kv_get(key);
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
    client_kv_set(key, name);
    client_kv_set(ACTIVE_KEY, token);
    if (out) {
        snprintf(out->token, sizeof out->token, "%s", token);
        snprintf(out->name,  sizeof out->name,  "%s", name);
    }
    free(token);
    return true;
}

bool profile_get_active(profile_t* out) {
    if (!out) return false;
    char* token = client_kv_get(ACTIVE_KEY);
    if (!token) return false;
    char key[64];
    snprintf(key, sizeof key, "%s%s", PROFILE_KEY_PREFIX, token);
    char* name = client_kv_get(key);
    if (!name) { free(token); return false; }
    snprintf(out->token, sizeof out->token, "%s", token);
    snprintf(out->name,  sizeof out->name,  "%s", name);
    free(token);
    free(name);
    return true;
}

void profile_set_active(const char* token) {
    if (!token || !*token) return;
    client_kv_set(ACTIVE_KEY, token);
}

bool profile_has_active(void) {
    char* token = client_kv_get(ACTIVE_KEY);
    if (!token) return false;
    char key[64];
    snprintf(key, sizeof key, "%s%s", PROFILE_KEY_PREFIX, token);
    char* name = client_kv_get(key);
    bool ok = (name != NULL);
    free(token);
    free(name);
    return ok;
}

void profile_delete(const char* token) {
    if (!token || !*token) return;
    char key[64];
    snprintf(key, sizeof key, "%s%s", PROFILE_KEY_PREFIX, token);
    client_kv_remove(key);

    profile_t active;
    if (profile_get_active(&active) && strcmp(active.token, token) == 0) {
        profile_t list[PROFILE_MAX];
        int n = profile_list(list, PROFILE_MAX);
        if (n > 0) profile_set_active(list[0].token);
        else       client_kv_remove(ACTIVE_KEY);
    }
}
