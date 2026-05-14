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
int config_load_lighting(const char* path);

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

    /* Gravity field — JS PlayerConfig.GRAVITY_FULL_RADIUS / FALLOFF_RADIUS
     * ported. Below body.radius * gravity_full_mult the player
     * feels 100 % of that body's gravity; from there to radius *
     * gravity_falloff_mult it tapers linearly to 0 %. Outside the
     * falloff radius the player is "in space" and switches to 6DOF
     * thrust + drag flight. A body may override these per-instance
     * via body_config_t.gravity_full_mult / gravity_falloff_mult. */
    float gravity_full_mult;
    float gravity_falloff_mult;

    /* Camera roll-slerp on space → planet entry. While the timer
     * counts down (transition_timer_s seconds), the basis is
     * rotated each frame toward the planet's radial up by
     * roll_slerp_speed * dt — exponential approach, so big
     * misalignments correct fast and the last few degrees ease in.
     * Matches JS PlayerConfig.ROLL_SLERP_DURATION / ROLL_SLERP_SPEED. */
    float roll_slerp_duration_s;
    float roll_slerp_speed;

    /* Space-mode flight tuning. space_thrust is the per-second
     * acceleration applied while a movement key is held; space_drag
     * is a per-second damping coefficient ( velocity *= exp(-drag * dt) )
     * so the player coasts to a stop after releasing the keys. Roll
     * speed is radians/second when Q/E is held. */
    float space_thrust;
    float space_drag;
    float space_roll_speed;

    /* Jump / jetpack discrimination. A jump press is classified as
     * a tap (one strong impulse, scaled by jump_velocity_mps) when
     * the key is released within jetpack_hold_threshold_s seconds;
     * holding past the threshold continuously fires the jetpack at
     * jetpack_accel_mps2 acceleration up to jetpack_max_vy_mps
     * terminal velocity. Without the threshold, every tap leaks
     * one frame into the jetpack the moment grounded flips false. */
    float jump_velocity_mps;
    float jetpack_hold_threshold_s;
    float jetpack_accel_mps2;
    float jetpack_max_vy_mps;

    /* Player capsule. height_m is foot-to-head; head collision uses
     * feet + height_m against the ceiling block bottom radius. */
    float player_height_m;

    /* Water physics — ported from JS PlayerConfig WATER_* knobs.
     *   gravity_mult         — multiplier on body gravity while
     *                          the player's body is submerged. 0.3
     *                          gives the slow-sink feel.
     *   drag_per_s           — exponential damping coefficient on
     *                          velocity while submerged
     *                          (velocity *= exp(-drag * dt)). Slows
     *                          horizontal motion + falling.
     *   movement_mult        — horizontal walk/sprint speed scalar
     *                          while submerged.
     *   swim_force_mps2      — upward acceleration while jump is
     *                          held under water.
     *   surface_float_height_m
     *                        — feet radius offset relative to the
     *                          water cap radius at which a swimming
     *                          player floats stably. Negative =
     *                          feet sit BELOW the cap so the head
     *                          breaks the surface but the body
     *                          doesn't bob fully out.
     *   body_check_height_m  — height above feet used to sample
     *                          "body submerged" — gates whether the
     *                          water gravity/drag apply, distinct
     *                          from "eyes submerged" (eye check uses
     *                          EYE_HEIGHT) which drives the swim
     *                          jump weakening + jetpack lock-out.
     *   submerged_jump_mult  — fraction of jump_velocity_mps applied
     *                          when jumping while fully submerged
     *                          (eyes + body in water). JS uses the
     *                          gravity_mult value here directly. */
    float water_gravity_mult;
    float water_drag_per_s;
    float water_movement_mult;
    float water_swim_force_mps2;
    float water_surface_float_height_m;
    float water_body_check_height_m;
    float water_submerged_jump_mult;
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

    /* Mobile-only horizon haze. The mobile water shader can't sample
     * the offscreen scene (no FBO on phones) so it can't run the
     * desktop Beer-Lambert thickness fog. Instead it lerps the base
     * water tone toward `sky_horizon_color` with view distance, which
     * mimics the "deep ocean fades into atmosphere" feel the desktop
     * version gets for free. fade_m is the distance at which the haze
     * is at full strength; fade_strength scales the final mix (0 =
     * disabled, 1 = full horizon). Desktop water ignores these. */
    float  horizon_fade_m;
    float  horizon_fade_strength;

    /* Underwater post-process. Drives the composite-pass fog +
     * sin-perturbation distortion when the camera (or any individual
     * pixel) sits below the sea-level radius. Per-pixel masked so a
     * half-submerged camera only fogs the wet side of the screen.
     *
     * The fog itself reuses absorption + deep_color above (Beer-
     * Lambert per-channel, exactly like the water cap's above-water
     * tint) so the view from underwater matches the view from above
     * — same water, same look. Only the shimmer is independent. */
    float  underwater_distortion;
    /* Soft fade band (m) around the actual water-cap altitude
     * (sea_level + height_offset_m - depth_offset_m) where the
     * composite gates the wet mask. Pixels at altitude > +band are
     * fully dry (no fog, no shimmer), pixels at < -band are fully
     * wet, with smoothstep in between. Stops the upper portion of
     * beach blocks (whose top sticks above the cap by depth_offset_m)
     * from picking up the underwater distortion shimmer. */
    float  wet_fade_band_m;
} water_config_t;

const water_config_t* config_water(void);

/*
 * Terrain lighting tuning. Drives the planet-aware day/night terminator
 * + ambient curve in hex.glsl. Underwater terrain dimming reuses the
 * Beer-Lambert absorption + deep_color from water_config_t so the
 * terrain visible *under* the water cap reads continuously with the
 * cap above it; only the day/night knobs live here.
 */
typedef struct {
    /* Ambient floor on the night side of the terminator, expressed as
     * a fraction of the full-day ambient. 0.10 = night side rendered
     * at 10% of day-side ambient brightness; 0.0 = pitch-black night;
     * 1.0 = no day/night cycle at all. Matches the JS terrain.frag
     * `ambientDayNight = mix(0.1, 1.0, vSunBrightness)` constant. */
    float night_ambient_floor;
    /* Smoothstep range applied to the surface-dir·sun-dir dot product.
     * lo = below this dot value the tile is fully in shadow; hi = above
     * this dot value the tile is fully lit. The JS reference uses
     * (-0.1, 0.3) — a soft ~25° wide twilight band straddling the
     * geometric terminator. Narrower = sharper terminator line, wider
     * = more gradual dawn/dusk. */
    float terminator_lo;
    float terminator_hi;

    /* Torch tint multiplied by the per-vertex v_torch_light bake to
     * produce the additive warm contribution. Defaults to the JS
     * reference's (1.0, 0.7, 0.3) — push toward red for a wood-fire
     * look or toward white for a magical-glow look. */
    vec3_t torch_color;
    /* Global intensity scalar applied on top. Lets designers dim or
     * boost all torches without re-baking the per-vertex sums in the
     * mesh. 1.0 = nominal brightness. */
    float  torch_intensity;
} lighting_config_t;

const lighting_config_t* config_lighting(void);

#endif
