#include "client/remote_players.h"

#include "sokol_gfx.h"
#include "sokol_gl.h"

#include <math.h>
#include <string.h>

static struct {
    remote_player_t players[REMOTE_PLAYERS_MAX];
    int             count;
} R;

void remote_players_init(void) {
    memset(&R, 0, sizeof R);
}

void remote_players_shutdown(void) { }

void remote_players_set_from_snapshot(const remote_player_t* arr, int count) {
    if (count < 0) count = 0;
    if (count > REMOTE_PLAYERS_MAX) count = REMOTE_PLAYERS_MAX;
    memset(R.players, 0, sizeof R.players);
    for (int i = 0; i < count; ++i) R.players[i] = arr[i];
    R.count = count;
}

int                    remote_players_count(void)      { return R.count; }
const remote_player_t* remote_players_get  (int i)     {
    if (i < 0 || i >= R.count) return NULL;
    return &R.players[i];
}

/* ------------------------------------------------------------------ */
/* Drawing                                                              */
/* ------------------------------------------------------------------ */

static void draw_octahedron(float cx, float cy, float cz, float r) {
    float ax[4] = { cx + r, cx,     cx - r, cx     };
    float az[4] = { cz,     cz + r, cz,     cz - r };
    sgl_begin_triangles();
    /* Top fan, colour-shaded so the marker reads 3D rather than flat. */
    for (int i = 0; i < 4; ++i) {
        int j = (i + 1) & 3;
        sgl_c3f(1.0f, 0.85f, 0.40f);  sgl_v3f(cx,    cy + r, cz);
        sgl_c3f(1.0f, 0.60f, 0.20f);  sgl_v3f(ax[i], cy,     az[i]);
        sgl_c3f(1.0f, 0.60f, 0.20f);  sgl_v3f(ax[j], cy,     az[j]);
    }
    /* Bottom fan — wind reversed so the outward face is the visible one. */
    for (int i = 0; i < 4; ++i) {
        int j = (i + 1) & 3;
        sgl_c3f(0.55f, 0.30f, 0.10f); sgl_v3f(cx,    cy - r, cz);
        sgl_c3f(1.0f,  0.60f, 0.20f); sgl_v3f(ax[j], cy,     az[j]);
        sgl_c3f(1.0f,  0.60f, 0.20f); sgl_v3f(ax[i], cy,     az[i]);
    }
    sgl_end();
}

void remote_players_draw(mat4_t view, mat4_t proj) {
    if (R.count == 0) return;

    sgl_defaults();
    sgl_matrix_mode_projection();
    sgl_load_matrix(proj.m);
    sgl_matrix_mode_modelview();
    sgl_load_matrix(view.m);

    static sgl_pipeline pip3d = (sgl_pipeline){0};
    if (pip3d.id == 0) {
        pip3d = sgl_make_pipeline(&(sg_pipeline_desc){
            .depth = { .write_enabled = true,
                        .compare = SG_COMPAREFUNC_LESS_EQUAL },
            .cull_mode = SG_CULLMODE_NONE,
        });
    }
    sgl_load_pipeline(pip3d);

    /* Octahedron radius in metres. 0.5 m is roughly head-sized; visible
     * from a fair distance without overwhelming up close. */
    const float r = 0.5f;
    for (int i = 0; i < R.count; ++i) {
        const remote_player_t* p = &R.players[i];
        if (!p->active) continue;
        /* Positions arrive in world space (dvec3); the renderer's view
         * matrix is the world->camera transform, so straight float
         * coords work. Tenebris doesn't yet use floating origin (plan.md
         * Part 1) — when it does, this becomes (pos - origin). */
        sgl_push_matrix();
        sgl_translate((float)p->pos.x, (float)p->pos.y, (float)p->pos.z);
        draw_octahedron(0.0f, 0.0f, 0.0f, r);
        sgl_pop_matrix();
    }

    sgl_draw();
}
