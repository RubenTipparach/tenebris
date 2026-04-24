#include "client/teleport_menu.h"
#include "sokol_gfx.h"        /* must come before sokol_debugtext.h — same sg_* type requirement as sokol_gl */
#include "sokol_debugtext.h"
#include "sokol_app.h"
#include "core/planet.h"
#include <string.h>

/* ----------------------------------------------------------------------- */

#define VISIBLE_ROWS 12

static struct {
    bool open;
    int  selected;       /* index into BODY_COUNT */
    int  scroll;         /* first visible row     */
} M;

void teleport_menu_init(void) {
    memset(&M, 0, sizeof(M));
}
void teleport_menu_shutdown(void) {}

bool teleport_menu_is_open(void) { return M.open; }

/* ----------------------------------------------------------------------- */

static void clamp_scroll(void) {
    if (M.selected < M.scroll) M.scroll = M.selected;
    if (M.selected >= M.scroll + VISIBLE_ROWS) M.scroll = M.selected - VISIBLE_ROWS + 1;
    if (M.scroll < 0) M.scroll = 0;
    if (M.scroll > BODY_COUNT - VISIBLE_ROWS) M.scroll = BODY_COUNT - VISIBLE_ROWS;
    if (M.scroll < 0) M.scroll = 0;
}

/* ----------------------------------------------------------------------- */

bool teleport_menu_event(const sapp_event* e, player_ctrl_t* player) {
    if (e->type != SAPP_EVENTTYPE_KEY_DOWN) return false;
    switch (e->key_code) {
        case SAPP_KEYCODE_T:
        case SAPP_KEYCODE_M:
            M.open = !M.open;
            return true;

        case SAPP_KEYCODE_ESCAPE:
            if (M.open) { M.open = false; return true; }
            return false;

        case SAPP_KEYCODE_UP:
            if (!M.open) return false;
            if (M.selected > 0) M.selected--;
            clamp_scroll();
            return true;
        case SAPP_KEYCODE_DOWN:
            if (!M.open) return false;
            if (M.selected < BODY_COUNT - 1) M.selected++;
            clamp_scroll();
            return true;
        case SAPP_KEYCODE_PAGE_UP:
            if (!M.open) return false;
            M.selected -= VISIBLE_ROWS;
            if (M.selected < 0) M.selected = 0;
            clamp_scroll();
            return true;
        case SAPP_KEYCODE_PAGE_DOWN:
            if (!M.open) return false;
            M.selected += VISIBLE_ROWS;
            if (M.selected >= BODY_COUNT) M.selected = BODY_COUNT - 1;
            clamp_scroll();
            return true;

        case SAPP_KEYCODE_ENTER:
        case SAPP_KEYCODE_SPACE:
            if (!M.open) return false;
            {
                const body_config_t* b = planet_get((body_id_t)M.selected);
                if (b) player_teleport_to(player, b);
            }
            M.open = false;
            return true;

        default:
            return false;
    }
}

/* ----------------------------------------------------------------------- */

void teleport_menu_draw(void) {
    if (!M.open) {
        /* Closed: show a tiny reminder in the corner. */
        sdtx_color3b(0xa0, 0xa0, 0xc0);
        sdtx_printf("[T] teleport\n");
        return;
    }

    /* Open: framed list. */
    sdtx_color3b(0xff, 0xff, 0xff);
    sdtx_printf("\n");
    sdtx_printf("+-------------------- TELEPORT --------------------+\n");
    sdtx_printf("| arrow keys select   enter go   esc/T close       |\n");
    sdtx_printf("+--------------------------------------------------+\n");

    for (int row = 0; row < VISIBLE_ROWS; ++row) {
        int idx = M.scroll + row;
        if (idx >= BODY_COUNT) {
            sdtx_printf("|                                                  |\n");
            continue;
        }
        const body_config_t* b = planet_get((body_id_t)idx);
        if (!b) continue;

        const char* tag = b->is_asteroid ? "ast"
                        : b->icy          ? "ice"
                        : b->barren       ? "rck"
                        : "pla";

        if (idx == M.selected) sdtx_color3b(0xff, 0xe0, 0x50);
        else                    sdtx_color3b(0xc0, 0xc0, 0xd0);

        sdtx_printf("| %c %-18s  %s  r=%5.0fm             |\n",
                    (idx == M.selected ? '>' : ' '),
                    b->name, tag, b->radius_m);
    }
    sdtx_color3b(0xff, 0xff, 0xff);
    sdtx_printf("+--------------------------------------------------+\n");
}
