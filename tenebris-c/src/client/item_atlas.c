#include "client/item_atlas.h"

#include "sokol_gfx.h"
#include "stb_image.h"

#include <stdio.h>
#include <stdlib.h>

/* Atlas geometry. Must match tools/gen-item-sprites.py - if the python
 * script's TILE_PX / COLS / ROWS / LAYOUT changes, these constants
 * need to follow suit. The runtime samples via id_to_grid() below,
 * so the C side never opens the PNG to figure the layout out. */
#define ATLAS_TILE_PX 16
#define ATLAS_COLS    8
#define ATLAS_ROWS    3

static struct {
    bool        ready;
    bool        atlas_ok;
    sg_image    img;
    sg_view     view;
    sg_sampler  smp;
    float       atlas_w;
    float       atlas_h;
} G = {0};


/* Map item_id_t -> (col, row) in the atlas. Mirrors the LAYOUT table
 * in tools/gen-item-sprites.py; keep these in lockstep with the enum
 * in inventory.h. Returns true for a populated tile, false for
 * ITEM_NONE / out-of-range. */
static bool id_to_grid(item_id_t id, int* col, int* row) {
    switch (id) {
        /* Row 0: tools */
        case ITEM_PICKAXE:         *col = 0; *row = 0; return true;
        case ITEM_AXE:             *col = 1; *row = 0; return true;
        case ITEM_SHOVEL:          *col = 2; *row = 0; return true;
        case ITEM_PROSPECTING_AXE: *col = 3; *row = 0; return true;
        /* Row 1: resources */
        case ITEM_LOG:             *col = 0; *row = 1; return true;
        case ITEM_PLANK:           *col = 1; *row = 1; return true;
        case ITEM_STICK:           *col = 2; *row = 1; return true;
        case ITEM_STONE:           *col = 3; *row = 1; return true;
        /* Row 2: clutter drops */
        case ITEM_SMALL_ROCK:      *col = 0; *row = 2; return true;
        case ITEM_GRASS_CLIP:      *col = 1; *row = 2; return true;
        case ITEM_FLOWER:          *col = 2; *row = 2; return true;
        default:
            *col = 0; *row = 0;
            return false;
    }
}


int item_atlas_init(void) {
    if (G.ready) return 0;

    const char* path = "assets/textures/items/atlas.png";
    stbi_set_flip_vertically_on_load(0);
    int w = 0, h = 0, c = 0;
    unsigned char* pix = stbi_load(path, &w, &h, &c, 4);
    if (!pix) {
        printf("[item_atlas] WARNING: %s missing; item icons disabled\n",
               path);
        G.ready = true;
        G.atlas_ok = false;
        return -1;
    }

    G.atlas_w = (float)w;
    G.atlas_h = (float)h;

    G.img = sg_make_image(&(sg_image_desc){
        .width = w, .height = h,
        .pixel_format = SG_PIXELFORMAT_RGBA8,
        .data.mip_levels[0] = { .ptr = pix, .size = (size_t)(w * h * 4) },
        .label = "item-atlas",
    });
    G.view = sg_make_view(&(sg_view_desc){
        .texture.image = G.img,
        .label = "item-atlas-view",
    });
    /* Nearest-neighbour - the icons are 16 x 16 pixel art and need
     * crisp edges at any UI scale. Clamp wrap so a sub-rect can't
     * bleed into a neighbouring icon. */
    G.smp = sg_make_sampler(&(sg_sampler_desc){
        .min_filter = SG_FILTER_NEAREST,
        .mag_filter = SG_FILTER_NEAREST,
        .wrap_u = SG_WRAP_CLAMP_TO_EDGE,
        .wrap_v = SG_WRAP_CLAMP_TO_EDGE,
        .label = "item-atlas-sampler",
    });
    free(pix);

    G.atlas_ok = true;
    G.ready = true;
    printf("[item_atlas] loaded %s (%dx%d)\n", path, w, h);
    return 0;
}

void item_atlas_shutdown(void) {
    /* Image + view + sampler reclaimed by sokol shutdown at app exit;
     * no per-resource destroy needed for normal operation. */
    G.ready = false;
}

uint32_t item_atlas_view_id(void) {
    return G.atlas_ok ? G.view.id : 0;
}

uint32_t item_atlas_sampler_id(void) {
    return G.atlas_ok ? G.smp.id : 0;
}

bool item_atlas_uv(item_id_t id, float* u0, float* v0,
                   float* u1, float* v1) {
    if (u0) *u0 = 0.0f;
    if (v0) *v0 = 0.0f;
    if (u1) *u1 = 0.0f;
    if (v1) *v1 = 0.0f;
    if (!G.atlas_ok) return false;
    int col = 0, row = 0;
    if (!id_to_grid(id, &col, &row)) return false;

    const float tx = (float)col * (float)ATLAS_TILE_PX;
    const float ty = (float)row * (float)ATLAS_TILE_PX;
    if (u0) *u0 = tx                          / G.atlas_w;
    if (v0) *v0 = ty                          / G.atlas_h;
    if (u1) *u1 = (tx + ATLAS_TILE_PX)        / G.atlas_w;
    if (v1) *v1 = (ty + ATLAS_TILE_PX)        / G.atlas_h;
    return true;
}
