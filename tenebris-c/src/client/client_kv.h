#ifndef TENEBRIS_CLIENT_KV_H
#define TENEBRIS_CLIENT_KV_H

#include <stddef.h>

/*
 * Tiny key/value store the client side uses for profile and SP world
 * persistence. Two backends, same API:
 *
 *   Web build (__EMSCRIPTEN__): bridged to window.localStorage via
 *     EM_JS — same per-origin storage browsers have always provided.
 *
 *   Native build: in-process map written through to a single text
 *     file under the user's data directory:
 *
 *       Linux/BSD:   $XDG_DATA_HOME/tenebris-c/kv.txt   (fallback ~/.local/share/...)
 *       macOS:       ~/Library/Application Support/tenebris-c/kv.txt
 *       Windows:     %APPDATA%/tenebris-c/kv.txt
 *
 *     File format: one `key=value` per line, both fields sanitised so
 *     the framing chars (\n, =) never appear inside them. Loaded at
 *     first use, rewritten on every mutation.
 *
 * Values are always C strings. No quoting / escaping beyond the
 * sanitisation above. Keys should use the project's existing prefixes
 * (`tenebris-c:profile:<token>`, `tenebris-c:world:<name>`, etc.) so
 * the on-disk file is grep-friendly.
 */

/* Store `val` under `key`. Overwrites any existing entry. Empty val
 * is allowed; NULL is treated as empty. */
void client_kv_set(const char* key, const char* val);

/* Return a newly-malloc'd copy of the stored value, or NULL if the key
 * is absent / invalid. Caller frees with free(). */
char* client_kv_get(const char* key);

/* Remove `key` if present. No-op when absent. */
void client_kv_remove(const char* key);

/* Newline-separated list of every key that starts with `prefix`,
 * with the prefix already stripped (so it's the "ID" portion only).
 * Returns NULL when no matches; caller frees. */
char* client_kv_list_with_prefix(const char* prefix);

#endif
