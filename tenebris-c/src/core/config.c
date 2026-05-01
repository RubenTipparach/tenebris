#include "core/config.h"
#include "core/planet.h"
#include "core/math.h"

#include <ctype.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* ------------------------------------------------------------------------ */
/* Tiny YAML-subset parser. Supports:
 *   - top-level section headers:  "name:"  on a line of their own
 *   - field:value lines:          "  key: 1.234"   or "  key: [a, b, c]"
 *   - line comments starting with '#'
 *   - blank lines (ignored)
 *
 * Indentation is *not* enforced — any line ending in `:` with no value
 * starts a new section, any line with `:` and a value is a field of
 * the current section. That's strictly less than YAML proper but
 * exactly enough for the atmosphere config; pulling in libyaml for one
 * file would be silly.
 */

/* Body name -> normalised key: spaces folded to underscores, lowercased. */
static void normalise_name(const char* in, char* out, size_t cap) {
    size_t i = 0;
    while (in[i] && i + 1 < cap) {
        char c = in[i];
        if (c == ' ') c = '_';
        out[i] = (char)tolower((unsigned char)c);
        ++i;
    }
    out[i] = '\0';
}

/* In-place trim leading + trailing whitespace and strip end-of-line
 * comments. Returns the (possibly advanced) pointer. */
static char* trim_strip(char* s) {
    /* Strip comments. */
    char* hash = strchr(s, '#');
    if (hash) *hash = '\0';
    /* Trim trailing whitespace. */
    size_t n = strlen(s);
    while (n > 0 && isspace((unsigned char)s[n - 1])) s[--n] = '\0';
    /* Trim leading whitespace. */
    while (*s && isspace((unsigned char)*s)) ++s;
    return s;
}

/* Parse "[ a, b, c ]" into out[0..2]. Returns true on success. */
static bool parse_vec3(const char* val, vec3_t* out) {
    while (*val && isspace((unsigned char)*val)) ++val;
    if (*val != '[') return false;
    ++val;
    char* end = NULL;
    out->x = (float)strtod(val, &end); if (end == val) return false; val = end;
    while (*val && (*val == ',' || isspace((unsigned char)*val))) ++val;
    out->y = (float)strtod(val, &end); if (end == val) return false; val = end;
    while (*val && (*val == ',' || isspace((unsigned char)*val))) ++val;
    out->z = (float)strtod(val, &end); if (end == val) return false;
    return true;
}

/* ------------------------------------------------------------------------ */

/* Buffer the entire file into memory. atmosphere.yaml is < 4 KB. */
static char* slurp_file(const char* path, size_t* out_size) {
    FILE* f = fopen(path, "rb");
    if (!f) return NULL;
    fseek(f, 0, SEEK_END);
    long n = ftell(f);
    fseek(f, 0, SEEK_SET);
    if (n < 0 || n > (long)(1 << 20)) { fclose(f); return NULL; }
    char* buf = (char*)malloc((size_t)n + 1);
    if (!buf) { fclose(f); return NULL; }
    size_t got = fread(buf, 1, (size_t)n, f);
    fclose(f);
    buf[got] = '\0';
    if (out_size) *out_size = got;
    return buf;
}

/* ------------------------------------------------------------------------ */

/* Find the body whose normalised name matches `key`. Returns -1 if no
 * match — the caller should log + skip; an unknown section is a
 * non-fatal warning so renaming a body in code doesn't brick the
 * loader. */
static int find_body_by_key(const char* key) {
    for (int id = 0; id < BODY_COUNT; ++id) {
        const body_config_t* b = planet_get((body_id_t)id);
        if (!b || !b->name) continue;
        char k[64];
        normalise_name(b->name, k, sizeof(k));
        if (strcmp(k, key) == 0) return id;
    }
    return -1;
}

int config_load_atmosphere(const char* path) {
    size_t fsize = 0;
    char* buf = slurp_file(path, &fsize);
    if (!buf) {
        printf("[config] %s not found, using compiled-in atmosphere defaults\n",
               path);
        fflush(stdout);
        return -1;
    }

    int active_body = -1;
    body_atmo_t patch;
    memset(&patch, 0, sizeof(patch));
    int line_no = 0;
    int parse_errors = 0;

    char* p = buf;
    char* line_start = buf;
    while (1) {
        /* Find end of line. */
        if (*p == '\n' || *p == '\0') {
            char saved = *p;
            *p = '\0';
            ++line_no;
            char* line = trim_strip(line_start);
            if (*line == '\0') {
                /* skip blank / comment-only line */
            } else {
                char* colon = strchr(line, ':');
                if (!colon) {
                    printf("[config] %s:%d: missing ':' in '%s'\n",
                           path, line_no, line);
                    parse_errors++;
                } else {
                    *colon = '\0';
                    char* key = line;
                    char* val = trim_strip(colon + 1);
                    /* Trim trailing whitespace from key. */
                    size_t kn = strlen(key);
                    while (kn > 0 && isspace((unsigned char)key[kn - 1])) key[--kn] = '\0';

                    if (*val == '\0') {
                        /* Section header. Flush previous body's patch
                         * before switching. */
                        if (active_body >= 0) {
                            planet_set_atmosphere((body_id_t)active_body, &patch);
                            memset(&patch, 0, sizeof(patch));
                        }
                        active_body = find_body_by_key(key);
                        if (active_body < 0) {
                            printf("[config] %s:%d: unknown body '%s' "
                                   "(skipping section)\n",
                                   path, line_no, key);
                        }
                    } else if (active_body >= 0) {
                        /* Field assignment. */
                        if      (strcmp(key, "radius_mult"     ) == 0) patch.radius_mult     = (float)strtod(val, NULL);
                        else if (strcmp(key, "rayleigh_scale"  ) == 0) patch.rayleigh_scale  = (float)strtod(val, NULL);
                        else if (strcmp(key, "mie_scale"       ) == 0) patch.mie_scale       = (float)strtod(val, NULL);
                        else if (strcmp(key, "sun_intensity"   ) == 0) patch.sun_intensity   = (float)strtod(val, NULL);
                        else if (strcmp(key, "sunset_strength" ) == 0) patch.sunset_strength = (float)strtod(val, NULL);
                        else if (strcmp(key, "scale_height"    ) == 0) patch.scale_height    = (float)strtod(val, NULL);
                        else if (strcmp(key, "mie_g"           ) == 0) patch.mie_g           = (float)strtod(val, NULL);
                        else if (strcmp(key, "wavelengths"     ) == 0) { if (!parse_vec3(val, &patch.wavelengths))    parse_errors++; }
                        else if (strcmp(key, "sunset_tint"     ) == 0) { if (!parse_vec3(val, &patch.sunset_tint))    parse_errors++; }
                        else if (strcmp(key, "sunset_glow"     ) == 0) { if (!parse_vec3(val, &patch.sunset_glow))    parse_errors++; }
                        else if (strcmp(key, "sunset_horizon"  ) == 0) { if (!parse_vec3(val, &patch.sunset_horizon)) parse_errors++; }
                        else {
                            printf("[config] %s:%d: unknown key '%s'\n",
                                   path, line_no, key);
                        }
                    }
                }
            }
            *p = saved;
            if (saved == '\0') break;
            line_start = p + 1;
        }
        ++p;
    }
    /* Flush the last body's patch. */
    if (active_body >= 0) {
        planet_set_atmosphere((body_id_t)active_body, &patch);
    }

    free(buf);
    if (parse_errors > 0) {
        printf("[config] %s loaded with %d parse error(s)\n",
               path, parse_errors);
        return -2;
    }
    printf("[config] loaded %s\n", path);
    fflush(stdout);
    return 0;
}
