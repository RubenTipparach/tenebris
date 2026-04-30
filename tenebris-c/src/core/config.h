#ifndef TENEBRIS_CORE_CONFIG_H
#define TENEBRIS_CORE_CONFIG_H

/*
 * Runtime config loader. Currently handles only assets/config/
 * atmosphere.yaml — a tiny subset of YAML (key: value, vec3 lists,
 * top-level body sections) parsed by a hand-written ~150-line scanner
 * to keep us out of dependency-management for one config file.
 *
 * Format: one section per body, fields are floats or vec3 lists.
 * See the YAML file itself for the full schema.
 *
 *   tenebris:
 *     radius_mult: 1.3
 *     wavelengths: [5.602, 9.473, 19.644]
 *
 * Apply at init *after* world_create + before the first render frame.
 * Mutates body_config entries in place via planet_set_atmosphere().
 *
 * Returns 0 on success, -1 if the file couldn't be opened (treat as
 * non-fatal — the renderer still has reasonable defaults), -2 on
 * parse error (also non-fatal but logged).
 */
int config_load_atmosphere(const char* path);

#endif
