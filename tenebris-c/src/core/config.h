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

    /* Per-tileset palette for the distant-LOD vertex sampler.
     * Indexed by tileset_t: EARTH=0, SEQUOIA=1, CRAG=2, FROST=3,
     * ASTEROID=4. The sampler looks up the tile's column under each
     * icosphere vertex and:
     *   - If the column has water above the topmost solid block,
     *     the seabed atlas colour is mixed toward water_color by a
     *     factor that ramps up with water-column thickness — so a
     *     deep ocean reads as the planet's water hue, while a thin
     *     shoreline keeps the sandy seabed showing through.
     *   - The per-altitude shade (above) is then multiplied by a
     *     tint vec3 interpolated between lowland_tint at -range_m
     *     and peak_tint at +range_m, giving each tileset its own
     *     elevation colour grade (e.g. peaks lean white on Earth,
     *     red on Crag, deep blue on Frost). */
    vec3_t tileset_water_color [5];
    vec3_t tileset_lowland_tint[5];
    vec3_t tileset_peak_tint   [5];
    /* Water-column thickness (in metres) at which water_color fully
     * dominates the seabed colour. Below this the shore reads
     * sandy / muddy; above it the open ocean reads pure water hue.
     * Per-tileset so e.g. an icy planet's shoreline is shorter than
     * an Earth-like's. Zero → use a sane default at runtime. */
    float  tileset_water_full_depth_m[5];

    /* Sphere-of-influence radius, expressed as a multiple of each
     * body's radius. When the player crosses into a body's SOI the
     * "frame of reference" (gravity anchor, surface basis, atmo
     * shell) switches to that body. The teleport menu spawns the
     * player a few hundred metres above the destination — well
     * inside its SOI — so the per-frame tracker keeps the frame
     * stuck to the right body as you fly around. */
    float soi_radius_mult;
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
    /* Creative water-level offset, applied additively on top of
     * depth_offset_m. Positive raises the cap (water deeper /
     * floods further inland), negative lowers it. Use this for sea-
     * level tweaks; leave depth_offset_m as the swell-clipping
     * safety margin. Also read at mesh-build time. */
    float  height_offset_m;
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
    /* Warm tint multiplied into the sun-highlight (independent of
     * specular_intensity). Raise above 1.0 in any channel to push
     * the glint colour over white. */
    vec3_t sun_tint;

    /* Wave-crest + slope foam — the bright flecks scattered across
     * the wave surface. Two smoothstep ranges (one on fbm height,
     * one on surface gradient magnitude) feed into a max() blend
     * with per-source weights. The combined result tints the water
     * toward foam_color at strength foam_intensity.
     *
     * Tip: if open water is too busy with white flecks, raise the
     * crest_lo threshold (e.g. 0.35 -> 0.55) so only the tallest
     * peaks paint foam, and/or drop foam_intensity. */
    float  foam_crest_lo;       /* smoothstep on fbm height [-1, +1] */
    float  foam_crest_hi;
    float  foam_crest_weight;
    float  foam_slope_lo;       /* smoothstep on |tangent gradient|  */
    float  foam_slope_hi;
    float  foam_slope_weight;
    float  foam_intensity;      /* final mix strength toward foam_color */
    vec3_t foam_color;

    /* Shoreline foam tint (separate from wave-crest foam). White-
     * wash band already gated by shore_foam_dist_m thickness. */
    vec3_t shore_foam_color;
    /* Posterize the thickness-driven shoreline foam into N discrete
     * bands for a cel-shaded ring look. 0 (or 1) disables banding —
     * keeps the original smooth gradient. 3-5 reads as visible
     * stepped rings; pushing higher tends to alias against the fbm
     * height modulation. */
    float  shore_foam_bands;
    /* Per-band edge softness in [0, 1]. 0 = hard cel-shade steps
     * between bands. 1 = no banding (smooth gradient regardless of
     * shore_foam_bands). ~0.2 keeps the ring read while avoiding
     * shimmer at the band boundaries. */
    float  shore_foam_band_softness;

    /* Sky reflection palette. The water reflects the upper
     * hemisphere via reflect(view, n) and blends between these two
     * tones based on the reflected ray's vertical component. */
    vec3_t sky_horizon_color;   /* bright tone where the reflected ray skims horizontal */
    vec3_t sky_zenith_color;    /* darker tone where the reflected ray points straight up */
    /* Opacity of the horizon-direction sky reflection on the final
     * water colour. Scales the Fresnel sky→base blend factor by
     * (1-up_f)·strength + up_f·1, so it only affects fragments where
     * the reflected ray skims the horizon. 1.0 = unchanged Fresnel
     * mix, 0.0 = horizon reflection vanishes (water shows the
     * refracted/deep colour at glancing angles), zenith-direction
     * reflection is unaffected at any value. >1.0 over-amplifies the
     * horizon reflection beyond Fresnel — clamps at full sky. */
    float  sky_horizon_strength;

    /* Wave shape — vertex-shader swell (overall ocean undulation
     * pushed into the cap mesh) and fragment-shader ripple (per-pixel
     * normal perturbation that drives the highlight pattern).
     *
     * Swell tuning at amplitude=1.0 produces the historical 0.36 m
     * peak-to-trough swell — pushing amplitude above ~1.39 starts
     * clipping into beach geometry (depth_offset_m = 0.50). frequency
     * scales spatial frequency (higher → shorter-wavelength swell);
     * speed scales animation rate.
     *
     * Ripple tuning is independent — affects only how the surface
     * normal (and therefore Fresnel / specular / refraction direction)
     * varies pixel-to-pixel, not the geometric height. ripple_scale
     * scales the spatial frequency inside the fbm noise (higher →
     * finer / busier ripples); ripple_speed scales the time advection
     * inside fbm; wave_steepness is the magnitude with which the
     * tangent gradient perturbs the radial normal (replaces the
     * historical 0.65 literal — higher → choppier-looking surface). */
    float  swell_amplitude;
    float  swell_frequency;
    float  swell_speed;
    float  ripple_scale;
    float  ripple_speed;
    float  wave_steepness;
} water_config_t;

const water_config_t* config_water(void);

#endif
