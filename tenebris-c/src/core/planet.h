#ifndef TENEBRIS_CORE_PLANET_H
#define TENEBRIS_CORE_PLANET_H

#include <stdbool.h>
#include <stdint.h>

#include "core/math.h"

/*
 * Solar system. Tenebris is the main landable planet; everything else
 * renders as a decorative celestial body (pre-meshed at boot) visible
 * in the sky. The teleport menu lets the player snap to any of them.
 */

typedef enum {
    /* Main planet — the one the player's physics is anchored to. */
    BODY_TENEBRIS = 0,

    /* Tenebris's moons */
    BODY_LUNA,
    BODY_SELENE,

    /* Earth-like sister planet + its moons */
    BODY_SEQUOIA,
    BODY_VERDANT,
    BODY_SPROUT,

    /* Barren rocky planet + moon */
    BODY_CRAG,
    BODY_QUARTZ,

    /* Icy outer planet + moon */
    BODY_FROSTBITE,
    BODY_RIME,

    /* Asteroid belt */
    BODY_ASTEROID_0,
    BODY_ASTEROID_1,
    BODY_ASTEROID_2,
    BODY_ASTEROID_3,
    BODY_ASTEROID_4,
    BODY_ASTEROID_5,
    BODY_ASTEROID_6,
    BODY_ASTEROID_7,
    BODY_ASTEROID_8,
    BODY_ASTEROID_9,

    BODY_COUNT
} body_id_t;

typedef enum {
    TILESET_EARTH = 0,    /* default — grass / dirt / sand / stone / ice / snow */
    TILESET_SEQUOIA,      /* planet_seq_*.png variants (green tall grass look) */
    TILESET_CRAG,         /* rusty red barren rock  (tinted moon.png) */
    TILESET_FROST,        /* deep glacial ice blue  (tinted ice.png)  */
    TILESET_ASTEROID,     /* dim gray carbonaceous  (tinted rocks.png) */
} tileset_t;

typedef struct {
    body_id_t   id;
    const char* name;
    double      radius_m;
    uint64_t    seed;
    int         max_lod_depth;    /* legacy, unused in the merged-mesh pipeline */
    int         subdivisions;     /* Goldberg depth */
    float       gravity_g;
    double      pos_x, pos_y, pos_z;
    bool        has_water;
    bool        barren;           /* moon-rock everywhere */
    bool        icy;              /* snow / ice everywhere */
    bool        is_asteroid;      /* skipped from the teleport menu */
    tileset_t   tileset;          /* which palette to sample (earth / sequoia) */

    /* ---- Atmosphere tuning (only used when has_water is true; the
     * renderer treats has_water as the "has atmosphere" predicate
     * since both Tenebris and Sequoia happen to be Earth-likes). All
     * fields default to zero meaning "use renderer default" — leave
     * a body's atmo_* zeroed and you get the default sky look. */
    float       atmo_radius_mult;     /* shell radius / planet radius; 0 → 1.3   */
    float       atmo_lower_radius_mult; /* atmosphere lower bound / planet radius;
                                           0 → 1.0 (atmosphere starts AT the
                                           ground). Raise to thin the shell from
                                           the bottom; lower to extend it below
                                           the surface. Also moves the planet-
                                           shadow / planet-clip sphere used by
                                           the ray-march. */
    float       atmo_rayleigh_scale;  /* main blue-sky knob, 0 → 1.0              */
    float       atmo_mie_scale;       /* haze / sun glow, 0 → 0.05                */
    float       atmo_sun_intensity;   /* overall sky brightness, 0 → 30           */
    float       atmo_sunset_strength; /* warm-tint multiplier near horizon,
                                        0 → 0.3 (blue-leaning); set to 1.0 for
                                        the original strong orange sunset look. */
    /* Physical constants — usually leave these zero. Override only
     * when modelling a non-Earthlike planet. */
    vec3_t      atmo_wavelengths;     /* (1/λ⁴) RGB ratios, 0 → (5.602, 9.473, 19.644) */
    float       atmo_mie_g;           /* Mie asymmetry (-1..1), 0 → 0.76          */
    float       atmo_scale_height;    /* density falloff in normalised height,
                                        0 → 0.25 (Earth-tuned)                    */
    /* Sunset tint colours — three vec3s that the warm-horizon pass
     * applies multiplicatively, additively as a sun-direction glow,
     * and additively as a horizon band respectively. Zero → defaults
     * tuned for an Earth/Tenebris orange-fade. Override for e.g.
     * Mars-like red sunsets or alien chemistry. */
    vec3_t      atmo_sunset_tint;     /* sky multiplier at sunset, 0 → (1.3, 1.0, 0.6)   */
    vec3_t      atmo_sunset_glow;     /* sun-direction glow, 0 → (1.0, 0.65, 0.25)       */
    vec3_t      atmo_sunset_horizon;  /* horizon-band tint, 0 → (0.8, 0.4, 0.15)         */

    /* ---- Gravity field. Per-body overrides for the lod.yaml-level
     * defaults (gravity_full_mult / gravity_falloff_mult). Below
     * radius * full_mult the player feels 100 % of this body's
     * gravity; from there to radius * falloff_mult it tapers
     * linearly to 0 %. Outside falloff_mult the body exerts no
     * gravitational pull and the player is "in space" w.r.t. this
     * body. Zero → use lod-config default. */
    float       gravity_full_mult;
    float       gravity_falloff_mult;
} body_config_t;

const body_config_t* planet_get(body_id_t id);

/* Pick the Goldberg subdivision count that gives ~1 m hex tile width
 * on a body of the given radius, capped at 7 (≈164k tiles per body)
 * for memory sanity on big planets. The body_config_t.subdivisions
 * field is treated as a hint — main_web.c uses this helper at
 * world_create time so radii can change without per-body retuning. */
int planet_subdivisions_for_radius(double radius_m);

/* Atmosphere-only patch struct — same fields as body_config_t.atmo_*
 * (matches one-for-one). Pass to planet_set_atmosphere() at boot
 * with values from the YAML config to override the in-tree defaults
 * without recompiling. Zero-valued fields are skipped (so an empty
 * patch is a no-op), letting the YAML express partial overrides. */
typedef struct {
    float  radius_mult;
    float  lower_radius_mult;
    float  rayleigh_scale;
    float  mie_scale;
    float  sun_intensity;
    float  sunset_strength;
    float  scale_height;
    float  mie_g;
    vec3_t wavelengths;
    vec3_t sunset_tint;
    vec3_t sunset_glow;
    vec3_t sunset_horizon;
} body_atmo_t;

void planet_set_atmosphere(body_id_t id, const body_atmo_t* patch);

/* Gravity-influence query. For every body in the system, computes
 *   multiplier = clamp01( 1 - (dist - r * full_mult)
 *                          / (r * (falloff_mult - full_mult)) )
 * and returns whichever body delivers the largest non-zero
 * multiplier at `world_pos`. The dest fields capture that body's
 * radii so the caller can compute altitude without re-deriving
 * them. When the position is outside every body's falloff radius
 * the player is "in space" — out_body comes back NULL and
 * out_multiplier is 0.
 *
 * Drives both (a) the active body the player is anchored to (used
 * for gravity, surface basis, atmosphere shell) and (b) the
 * `is_in_space` flag that flips the player into 6DOF flight. Replaces
 * the old hard-edge SOI sphere — gravity now tapers smoothly so the
 * camera roll-slerp on planet entry has time to play out before the
 * player hits the ground. */
typedef struct {
    const body_config_t* body;        /* strongest-pull body, or NULL in deep space */
    float                multiplier;  /* 0..1 — 0 means in space                    */
    double               altitude_m;  /* dist_to_centre - body->radius_m            */
} gravity_query_t;

gravity_query_t planet_gravity_at(dvec3_t world_pos,
                                  float full_default,
                                  float falloff_default);

#endif
