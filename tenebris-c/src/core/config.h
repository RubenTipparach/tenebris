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
int config_load_water(const char* path);

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
    int   distant_subdivisions;
    /* Per-vertex height shading: each icosphere vertex's colour is
     * multiplied by a shade computed from the topmost-solid-block
     * altitude under it (sea-level baseline = body->radius_m). The
     * topmost depth IS the terrain-noise output, so this puts the
     * actual elevation pattern straight into the distant LOD —
     * lowlands darken, highlands lighten, ocean basins look bluer
     * than coastal grass even when both sample to similar block
     * tiles. distant_shade_range_m is the altitude in metres at
     * which the shade hits its ceiling (and -range hits floor). */
    float distant_shade_floor;
    float distant_shade_ceiling;
    float distant_shade_range_m;
} lod_config_t;

const lod_config_t* config_lod(void);

/*
 * Water surface + refraction tuning. All knobs the cap shader and
 * mesh-build code consume — every literal that used to live as a
 * C #define or hardcoded fs_params struct field is now sourced
 * from this struct so designers can tune without recompiling.
 */
typedef struct {
    /* Animation: subjective-time multiplier on R.time_seconds.
     * Higher = faster ripples / swell. */
    float  time_scale;
    /* Geometry: vertical drop of the cap below sea level so the
     * vertex-shader swell can't push crests above neighbour beach
     * sand. Read by hex_mesher.c at mesh-build time, not per-frame. */
    float  depth_offset_m;
    /* Refraction: scalar applied to the surface tangent gradient
     * before it perturbs the screen UV used for the offscreen-colour
     * sample. 0.0 = no refraction, ~0.04 = noticeable shimmer. */
    float  refract_amount;
    /* Beer-Lambert per-channel extinction (1/m). Higher = water
     * gets dark/saturated faster with depth. Real ocean has red
     * absorbed ~6× more than blue. */
    vec3_t absorption;
    /* Saturation colour where the view ray has fully attenuated —
     * the limit colour of deep water. */
    vec3_t deep_color;
    /* Alpha smoothstep upper edge in metres. At thickness 0 the cap
     * goes fully transparent; by this much water it's back to the
     * Fresnel-driven alpha. Hides the hex-mesh silhouette where the
     * cap meets the seabed. */
    float  shoreline_fade_m;
    /* Shoreline foam smoothstep upper edge. White-wash band peaks
     * at thickness 0 and fades to nothing by this much water.
     * Usually slightly wider than shoreline_fade so the foam keeps
     * body inside the alpha-feathered region. */
    float  shore_foam_dist_m;
    /* Sun-highlight specular. Multiplied with the warm-white sun
     * tint to make the surface glint. Higher = brighter glints,
     * lower = matte. */
    float  specular_intensity;
    /* Blinn-Phong specular exponent. Higher = tighter / smaller
     * highlight, lower = broader / softer. */
    float  specular_power;
} water_config_t;

const water_config_t* config_water(void);

#endif
