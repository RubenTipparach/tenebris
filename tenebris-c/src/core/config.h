#ifndef TENEBRIS_CORE_CONFIG_H
#define TENEBRIS_CORE_CONFIG_H

#include "core/math.h"

/*
 * Runtime config loader. Currently handles two YAML files under
 * assets/config/:
 *
 *   atmosphere.yaml — per-body atmospheric scattering knobs.
 *   skybox.yaml     — global star + nebula appearance.
 *
 * Both use a tiny YAML subset (key: value, vec3 lists, top-level
 * sections, '#' comments) parsed by a hand-written ~150-line scanner
 * to keep us out of dependency-management for two small files.
 *
 * Apply at init *after* world_create + before the first render frame.
 *
 * Returns 0 on success, -1 if the file couldn't be opened (treat as
 * non-fatal — the renderer still has reasonable defaults), -2 on
 * parse error (also non-fatal but logged).
 */
int config_load_atmosphere(const char* path);
int config_load_skybox(const char* path);
int config_load_lod(const char* path);

/*
 * Global skybox tuning — read by renderer_draw_skybox each frame and
 * uploaded to the sky shader as uniforms. All of these are knobs a
 * designer or modder might want to turn without recompiling, so per
 * the repo rule (CLAUDE.md) they live in YAML rather than as
 * #defines / consts in the shader source.
 */
typedef struct {
    /* Three Voronoi star layers, each at a different cell density.
     * Higher density -> smaller, more numerous cells -> tinier stars
     * spread across more sky. Per-layer intensity weights the
     * smoothstep hit before stacking layers. */
    vec3_t star_densities;
    vec3_t star_intensities;
    /* Smoothstep upper bound on squared cell-distance — smaller =
     * tighter, sharper points. */
    float  star_sharpness;
    /* Cells whose hash brightness is below this stay dark. Higher =
     * sparser sky, lower = busier. */
    float  star_brightness_threshold;
    vec3_t star_color;

    /* Soft fbm-based nebula. Two sample scales pick out cloud shape
     * and warm-vs-cool mixing. */
    vec3_t nebula_warm_color;
    vec3_t nebula_cool_color;
    float  nebula_intensity;
    float  nebula_drift_speed;
    float  nebula_scale1;
    float  nebula_scale2;
    /* smoothstep(cloud_lo, cloud_hi, fbm) gates where clouds appear. */
    float  nebula_cloud_lo;
    float  nebula_cloud_hi;
    /* smoothstep(warm_blend_lo, warm_blend_hi, fbm2) drives the
     * warm/cool tint blend across the nebula. */
    float  nebula_warm_blend_lo;
    float  nebula_warm_blend_hi;

    /* Deep-space backdrop tint added under everything. Not pure black
     * by default — a touch of cool blue keeps the void from looking
     * dead. */
    vec3_t space_color;
} skybox_config_t;

/* Returns the active skybox config. Compiled-in defaults until
 * config_load_skybox() runs and overrides fields from YAML. The
 * pointer is stable for the program lifetime. */
const skybox_config_t* config_skybox(void);

/*
 * Level-of-detail tuning — currently just covers the distant-body
 * icosphere (the one drawn instead of the full chunked terrain when
 * a body subtends less than the LOD-cutoff fraction of the screen).
 */
typedef struct {
    /* Icosphere subdivision levels. 0 = the bare 20-tri icosa, 1 =
     * 80 tris, 2 = 320 tris (= 16× the base detail), 3 = 1280 tris.
     * Each step quadruples triangle count and roughly halves the
     * angular size of visible facets. */
    int distant_subdivisions;
} lod_config_t;

const lod_config_t* config_lod(void);

#endif
