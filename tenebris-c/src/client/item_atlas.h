#ifndef TENEBRIS_CLIENT_ITEM_ATLAS_H
#define TENEBRIS_CLIENT_ITEM_ATLAS_H

#include "client/inventory.h"   /* item_id_t */

#include <stdbool.h>
#include <stdint.h>

/*
 * Item-icon atlas. Loads assets/textures/items/atlas.png (baked by
 * tools/gen-item-sprites.py) into a single GPU texture; consumers
 * (hotbar, inventory screen, crafting screen) sample it via
 * sgl_texture() + the UV rect returned by item_atlas_uv().
 *
 * Separate from renderer.c's terrain atlas so the two stay decoupled:
 * the terrain atlas changes when world tiles change, the item atlas
 * is a fixed art bundle that ships with the binary.
 */

/* Load the atlas. Safe to call twice; second call is a no-op. Returns
 * 0 on success, non-zero if the PNG couldn't be loaded - in that case
 * item_atlas_uv returns false for every id so callers cleanly skip
 * the icon draw. */
int  item_atlas_init(void);
void item_atlas_shutdown(void);

/* GPU handles to bind through sgl_texture(). Zero when the atlas
 * failed to load. */
uint32_t item_atlas_view_id(void);
uint32_t item_atlas_sampler_id(void);

/* UV rect (in normalised [0, 1] coords) of a given item id's icon
 * inside the atlas. Returns true on a valid id with a populated tile,
 * false otherwise (the UVs are then zeroed). */
bool item_atlas_uv(item_id_t id, float* u0, float* v0,
                   float* u1, float* v1);

#endif
