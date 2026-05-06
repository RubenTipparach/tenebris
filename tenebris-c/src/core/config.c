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

/* ------------------------------------------------------------------------ */
/* Skybox config — single global struct seeded with the values that
 * used to be hardcoded in the FS_SKY shader, optionally overridden
 * by assets/config/skybox.yaml. */

static skybox_config_t S_SKY = {
    .star_densities             = { 100.0f, 200.0f, 300.0f },
    .star_intensities           = { 1.0f,   0.8f,   0.6f   },
    .star_sharpness             = 0.02f,
    .star_brightness_threshold  = 0.7f,
    .star_color                 = { 1.0f, 0.98f, 0.95f },

    .nebula_warm_color          = { 0.55f, 0.18f, 0.38f },
    .nebula_cool_color          = { 0.10f, 0.20f, 0.50f },
    .nebula_intensity           = 0.20f,
    .nebula_drift_speed         = 0.005f,
    .nebula_scale1              = 1.4f,
    .nebula_scale2              = 3.1f,
    .nebula_cloud_lo            = 0.45f,
    .nebula_cloud_hi            = 0.78f,
    .nebula_warm_blend_lo       = 0.3f,
    .nebula_warm_blend_hi       = 0.8f,

    .space_color                = { 0.005f, 0.007f, 0.018f },
};

const skybox_config_t* config_skybox(void) { return &S_SKY; }

int config_load_skybox(const char* path) {
    size_t fsize = 0;
    char* buf = slurp_file(path, &fsize);
    if (!buf) {
        printf("[config] %s not found, using compiled-in skybox defaults\n",
               path);
        fflush(stdout);
        return -1;
    }

    int line_no = 0;
    int parse_errors = 0;
    char* p = buf;
    char* line_start = buf;
    while (1) {
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
                    size_t kn = strlen(key);
                    while (kn > 0 && isspace((unsigned char)key[kn - 1])) key[--kn] = '\0';

                    if (*val == '\0') {
                        /* Section header: skybox.yaml has a single
                         * top-level "skybox:" wrapper purely so the
                         * file shape matches atmosphere.yaml; we don't
                         * actually key on it. */
                    } else {
                        if      (strcmp(key, "star_densities"           ) == 0) { if (!parse_vec3(val, &S_SKY.star_densities))     parse_errors++; }
                        else if (strcmp(key, "star_intensities"         ) == 0) { if (!parse_vec3(val, &S_SKY.star_intensities))   parse_errors++; }
                        else if (strcmp(key, "star_sharpness"           ) == 0) S_SKY.star_sharpness            = (float)strtod(val, NULL);
                        else if (strcmp(key, "star_brightness_threshold") == 0) S_SKY.star_brightness_threshold = (float)strtod(val, NULL);
                        else if (strcmp(key, "star_color"               ) == 0) { if (!parse_vec3(val, &S_SKY.star_color))         parse_errors++; }
                        else if (strcmp(key, "nebula_warm_color"        ) == 0) { if (!parse_vec3(val, &S_SKY.nebula_warm_color))  parse_errors++; }
                        else if (strcmp(key, "nebula_cool_color"        ) == 0) { if (!parse_vec3(val, &S_SKY.nebula_cool_color))  parse_errors++; }
                        else if (strcmp(key, "nebula_intensity"         ) == 0) S_SKY.nebula_intensity        = (float)strtod(val, NULL);
                        else if (strcmp(key, "nebula_drift_speed"       ) == 0) S_SKY.nebula_drift_speed      = (float)strtod(val, NULL);
                        else if (strcmp(key, "nebula_scale1"            ) == 0) S_SKY.nebula_scale1           = (float)strtod(val, NULL);
                        else if (strcmp(key, "nebula_scale2"            ) == 0) S_SKY.nebula_scale2           = (float)strtod(val, NULL);
                        else if (strcmp(key, "nebula_cloud_lo"          ) == 0) S_SKY.nebula_cloud_lo         = (float)strtod(val, NULL);
                        else if (strcmp(key, "nebula_cloud_hi"          ) == 0) S_SKY.nebula_cloud_hi         = (float)strtod(val, NULL);
                        else if (strcmp(key, "nebula_warm_blend_lo"     ) == 0) S_SKY.nebula_warm_blend_lo    = (float)strtod(val, NULL);
                        else if (strcmp(key, "nebula_warm_blend_hi"     ) == 0) S_SKY.nebula_warm_blend_hi    = (float)strtod(val, NULL);
                        else if (strcmp(key, "space_color"              ) == 0) { if (!parse_vec3(val, &S_SKY.space_color))        parse_errors++; }
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

/* ------------------------------------------------------------------------ */
/* LOD config — compiled-in defaults overridable via lod.yaml. */

static lod_config_t S_LOD = {
    .distant_subdivisions   = 2,
    .distant_shade_floor    = 0.65f,
    .distant_shade_ceiling  = 1.20f,
    .distant_shade_range_m  = 50.0f,
};

const lod_config_t* config_lod(void) { return &S_LOD; }

int config_load_lod(const char* path) {
    size_t fsize = 0;
    char* buf = slurp_file(path, &fsize);
    if (!buf) {
        printf("[config] %s not found, using compiled-in lod defaults\n",
               path);
        fflush(stdout);
        return -1;
    }

    int line_no = 0;
    int parse_errors = 0;
    char* p = buf;
    char* line_start = buf;
    while (1) {
        if (*p == '\n' || *p == '\0') {
            char saved = *p;
            *p = '\0';
            ++line_no;
            char* line = trim_strip(line_start);
            if (*line == '\0') {
                /* skip */
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
                    size_t kn = strlen(key);
                    while (kn > 0 && isspace((unsigned char)key[kn - 1])) key[--kn] = '\0';

                    if (*val == '\0') {
                        /* "lod:" header — single-section file, ignored */
                    } else {
                        if (strcmp(key, "distant_subdivisions") == 0) {
                            int n = (int)strtol(val, NULL, 10);
                            if (n < 0) n = 0;
                            if (n > 3) n = 3;   /* cap so the upper-bound
                                                 * vertex/index buffers in
                                                 * renderer.c stay sized */
                            S_LOD.distant_subdivisions = n;
                        } else if (strcmp(key, "distant_shade_floor"  ) == 0) {
                            S_LOD.distant_shade_floor   = (float)strtod(val, NULL);
                        } else if (strcmp(key, "distant_shade_ceiling") == 0) {
                            S_LOD.distant_shade_ceiling = (float)strtod(val, NULL);
                        } else if (strcmp(key, "distant_shade_range_m") == 0) {
                            S_LOD.distant_shade_range_m = (float)strtod(val, NULL);
                        } else {
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

/* ------------------------------------------------------------------------ */
/* Water config — compiled-in defaults overridable via water.yaml.
 * Defaults match the inline literals body_draw_water + hex_mesher
 * had before the YAML extraction; the YAML override is a pure
 * tuning surface, not a behaviour change. */

static water_config_t S_WATER = {
    .time_scale         = 0.75f,
    .depth_offset_m     = 0.50f,
    .height_offset_m    = 0.00f,
    .refract_amount     = 0.04f,
    .absorption         = { 0.60f, 0.20f, 0.10f },
    .deep_color         = { 0.02f, 0.10f, 0.22f },
    .shoreline_fade_m   = 0.50f,
    .shore_foam_dist_m  = 0.80f,
    .specular_intensity = 0.60f,
    .specular_power     = 140.0f,
    .sun_tint           = { 1.35f, 1.25f, 1.10f },
    .foam_crest_lo      = 0.35f,
    .foam_crest_hi      = 0.60f,
    .foam_crest_weight  = 0.55f,
    .foam_slope_lo      = 0.50f,
    .foam_slope_hi      = 1.20f,
    .foam_slope_weight  = 0.45f,
    .foam_intensity     = 0.60f,
    .foam_color         = { 0.95f, 0.97f, 1.00f },
    .shore_foam_color   = { 0.98f, 0.99f, 1.00f },
    .shore_foam_bands   = 0.0f,
    .shore_foam_band_softness = 0.2f,
    .sky_horizon_color  = { 0.85f, 0.92f, 0.98f },
    .sky_zenith_color   = { 0.35f, 0.55f, 0.85f },
    .sky_horizon_strength = 1.0f,
    .swell_amplitude    = 1.0f,
    .swell_frequency    = 1.0f,
    .swell_speed        = 1.0f,
    .ripple_scale       = 1.0f,
    .ripple_speed       = 1.0f,
    .wave_steepness     = 0.65f,
    .underwater_fog_color = { 0.10f, 0.33f, 0.47f },
    .underwater_fog_near  = 0.0f,
    .underwater_fog_far   = 18.0f,
    .underwater_distortion = 0.006f,
};

const water_config_t* config_water(void) { return &S_WATER; }

int config_load_water(const char* path) {
    size_t fsize = 0;
    char* buf = slurp_file(path, &fsize);
    if (!buf) {
        printf("[config] %s not found, using compiled-in water defaults\n",
               path);
        fflush(stdout);
        return -1;
    }

    int line_no = 0;
    int parse_errors = 0;
    char* p = buf;
    char* line_start = buf;
    while (1) {
        if (*p == '\n' || *p == '\0') {
            char saved = *p;
            *p = '\0';
            ++line_no;
            char* line = trim_strip(line_start);
            if (*line == '\0') {
                /* skip */
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
                    size_t kn = strlen(key);
                    while (kn > 0 && isspace((unsigned char)key[kn - 1])) key[--kn] = '\0';

                    if (*val == '\0') {
                        /* "water:" header — single-section file, ignored */
                    } else if (strcmp(key, "time_scale"        ) == 0) {
                        S_WATER.time_scale        = (float)strtod(val, NULL);
                    } else if (strcmp(key, "depth_offset_m"    ) == 0) {
                        S_WATER.depth_offset_m    = (float)strtod(val, NULL);
                    } else if (strcmp(key, "height_offset_m"   ) == 0) {
                        S_WATER.height_offset_m   = (float)strtod(val, NULL);
                    } else if (strcmp(key, "refract_amount"    ) == 0) {
                        S_WATER.refract_amount    = (float)strtod(val, NULL);
                    } else if (strcmp(key, "absorption"        ) == 0) {
                        if (!parse_vec3(val, &S_WATER.absorption)) parse_errors++;
                    } else if (strcmp(key, "deep_color"        ) == 0) {
                        if (!parse_vec3(val, &S_WATER.deep_color)) parse_errors++;
                    } else if (strcmp(key, "shoreline_fade_m"  ) == 0) {
                        S_WATER.shoreline_fade_m  = (float)strtod(val, NULL);
                    } else if (strcmp(key, "shore_foam_dist_m" ) == 0) {
                        S_WATER.shore_foam_dist_m = (float)strtod(val, NULL);
                    } else if (strcmp(key, "specular_intensity") == 0) {
                        S_WATER.specular_intensity = (float)strtod(val, NULL);
                    } else if (strcmp(key, "specular_power"    ) == 0) {
                        S_WATER.specular_power    = (float)strtod(val, NULL);
                    } else if (strcmp(key, "sun_tint"          ) == 0) {
                        if (!parse_vec3(val, &S_WATER.sun_tint)) parse_errors++;
                    } else if (strcmp(key, "foam_crest_lo"     ) == 0) {
                        S_WATER.foam_crest_lo     = (float)strtod(val, NULL);
                    } else if (strcmp(key, "foam_crest_hi"     ) == 0) {
                        S_WATER.foam_crest_hi     = (float)strtod(val, NULL);
                    } else if (strcmp(key, "foam_crest_weight" ) == 0) {
                        S_WATER.foam_crest_weight = (float)strtod(val, NULL);
                    } else if (strcmp(key, "foam_slope_lo"     ) == 0) {
                        S_WATER.foam_slope_lo     = (float)strtod(val, NULL);
                    } else if (strcmp(key, "foam_slope_hi"     ) == 0) {
                        S_WATER.foam_slope_hi     = (float)strtod(val, NULL);
                    } else if (strcmp(key, "foam_slope_weight" ) == 0) {
                        S_WATER.foam_slope_weight = (float)strtod(val, NULL);
                    } else if (strcmp(key, "foam_intensity"    ) == 0) {
                        S_WATER.foam_intensity    = (float)strtod(val, NULL);
                    } else if (strcmp(key, "foam_color"        ) == 0) {
                        if (!parse_vec3(val, &S_WATER.foam_color)) parse_errors++;
                    } else if (strcmp(key, "shore_foam_color"  ) == 0) {
                        if (!parse_vec3(val, &S_WATER.shore_foam_color)) parse_errors++;
                    } else if (strcmp(key, "shore_foam_bands"  ) == 0) {
                        S_WATER.shore_foam_bands = (float)strtod(val, NULL);
                    } else if (strcmp(key, "shore_foam_band_softness") == 0) {
                        S_WATER.shore_foam_band_softness = (float)strtod(val, NULL);
                    } else if (strcmp(key, "sky_horizon_color" ) == 0) {
                        if (!parse_vec3(val, &S_WATER.sky_horizon_color)) parse_errors++;
                    } else if (strcmp(key, "sky_zenith_color"  ) == 0) {
                        if (!parse_vec3(val, &S_WATER.sky_zenith_color)) parse_errors++;
                    } else if (strcmp(key, "sky_horizon_strength") == 0) {
                        S_WATER.sky_horizon_strength = (float)strtod(val, NULL);
                    } else if (strcmp(key, "swell_amplitude"   ) == 0) {
                        S_WATER.swell_amplitude   = (float)strtod(val, NULL);
                    } else if (strcmp(key, "swell_frequency"   ) == 0) {
                        S_WATER.swell_frequency   = (float)strtod(val, NULL);
                    } else if (strcmp(key, "swell_speed"       ) == 0) {
                        S_WATER.swell_speed       = (float)strtod(val, NULL);
                    } else if (strcmp(key, "ripple_scale"      ) == 0) {
                        S_WATER.ripple_scale      = (float)strtod(val, NULL);
                    } else if (strcmp(key, "ripple_speed"      ) == 0) {
                        S_WATER.ripple_speed      = (float)strtod(val, NULL);
                    } else if (strcmp(key, "wave_steepness"    ) == 0) {
                        S_WATER.wave_steepness    = (float)strtod(val, NULL);
                    } else if (strcmp(key, "underwater_fog_color") == 0) {
                        if (!parse_vec3(val, &S_WATER.underwater_fog_color)) parse_errors++;
                    } else if (strcmp(key, "underwater_fog_near") == 0) {
                        S_WATER.underwater_fog_near = (float)strtod(val, NULL);
                    } else if (strcmp(key, "underwater_fog_far") == 0) {
                        S_WATER.underwater_fog_far  = (float)strtod(val, NULL);
                    } else if (strcmp(key, "underwater_distortion") == 0) {
                        S_WATER.underwater_distortion = (float)strtod(val, NULL);
                    } else {
                        printf("[config] %s:%d: unknown key '%s'\n",
                               path, line_no, key);
                    }
                }
            }
            *p = saved;
            if (saved == '\0') break;
            line_start = p + 1;
        }
        ++p;
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

/* ------------------------------------------------------------------------ */

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
                        if      (strcmp(key, "radius_mult"       ) == 0) patch.radius_mult       = (float)strtod(val, NULL);
                        else if (strcmp(key, "lower_radius_mult" ) == 0) patch.lower_radius_mult = (float)strtod(val, NULL);
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
