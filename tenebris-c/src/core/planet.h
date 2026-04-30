#ifndef TENEBRIS_CORE_PLANET_H
#define TENEBRIS_CORE_PLANET_H

#include <stdbool.h>
#include <stdint.h>

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
    float       atmo_rayleigh_scale;  /* main blue-sky knob, 0 → 1.0              */
    float       atmo_mie_scale;       /* haze / sun glow, 0 → 0.05                */
    float       atmo_sun_intensity;   /* overall sky brightness, 0 → 30           */
    float       atmo_sunset_strength; /* warm-tint multiplier near horizon,
                                        0 → 0.3 (blue-leaning); set to 1.0 for
                                        the original strong orange sunset look. */
} body_config_t;

const body_config_t* planet_get(body_id_t id);

#endif
