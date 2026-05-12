#ifndef TENEBRIS_CLIENT_PROFILE_H
#define TENEBRIS_CLIENT_PROFILE_H

#include <stdbool.h>
#include <stdint.h>

/*
 * Player profiles. A profile is just a (token, name) pair stored in
 * the browser's localStorage:
 *
 *     tenebris-c:profile:<token>  =  <name>
 *     tenebris-c:active-profile   =  <token>     (currently selected)
 *
 * token is a 32-char hex string (16 random bytes) generated when the
 * profile is created. name is what other players see and what the
 * HUD shows. The token is the stable identifier — it survives across
 * renames and lets the server attach persistent state to the right
 * profile even if the name changes.
 *
 * Single-player worlds will also key off the active profile so each
 * profile has its own world list, but that wiring is in the M6
 * persistence pass — for now this module just exposes profile CRUD
 * for the menu picker + network identity for HELLO.
 */

#define PROFILE_NAME_MAX    31    /* + null terminator */
#define PROFILE_TOKEN_LEN   32    /* hex chars, no null in wire */
#define PROFILE_MAX         16

typedef struct {
    char token[PROFILE_TOKEN_LEN + 1];   /* null-terminated */
    char name [PROFILE_NAME_MAX  + 1];   /* null-terminated */
} profile_t;

void profile_module_init(void);

/* Enumerate stored profiles. Returns count, fills `out` (up to cap).
 * Sorted by name. */
int  profile_list(profile_t* out, int cap);

/* Create a new profile with the given display name. Generates a
 * fresh 32-char hex token, persists to localStorage, and returns the
 * new profile in *out (NULL-safe). Returns false on bad name. */
bool profile_create(const char* name, profile_t* out);

/* Active-profile getter / setter. The active profile is the one used
 * by HELLO + by SP world keys + by the HUD greeting. */
bool profile_get_active(profile_t* out);
void profile_set_active(const char* token);
bool profile_has_active(void);

/* Drop a profile (along with its tracked SP worlds, future M6 work).
 * Re-selects the most recent remaining profile, or clears the active
 * slot if none remain. */
void profile_delete(const char* token);

#endif
