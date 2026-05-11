#include "client/remote_players.h"

#include "sokol_gfx.h"
#include "sokol_gl.h"
#include "sokol_time.h"

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

void remote_players_set_from_snapshot(const remote_pose_t* arr, int count) {
    if (count < 0) count = 0;
    if (count > REMOTE_PLAYERS_MAX) count = REMOTE_PLAYERS_MAX;

    const double now = stm_sec(stm_now());

    remote_player_t fresh[REMOTE_PLAYERS_MAX];
    memset(fresh, 0, sizeof fresh);

    for (int i = 0; i < count; ++i) {
        const remote_pose_t* in = &arr[i];

        /* Look up the previous slot for this player_id so prev pose
         * survives across snapshots. Linear scan is cheap at N=16. */
        const remote_player_t* old = NULL;
        for (int j = 0; j < R.count; ++j) {
            if (R.players[j].active && R.players[j].player_id == in->player_id) {
                old = &R.players[j];
                break;
            }
        }

        remote_player_t* slot = &fresh[i];
        slot->player_id = in->player_id;
        slot->body_id   = in->body_id;
        slot->pos_cur   = in->pos;
        slot->yaw_cur   = in->yaw;
        slot->pitch_cur = in->pitch;
        if (old) {
            slot->pos_prev   = old->pos_cur;
            slot->yaw_prev   = old->yaw_cur;
            slot->pitch_prev = old->pitch_cur;
        } else {
            /* New player — no history yet; snap to the incoming pose. */
            slot->pos_prev   = in->pos;
            slot->yaw_prev   = in->yaw;
            slot->pitch_prev = in->pitch;
        }
        slot->snapshot_time_s = now;
        slot->active          = true;
    }

    memcpy(R.players, fresh, sizeof R.players);
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

/* yaw/pitch interp will land when the renderer actually orients the
 * remote-player marker (player model + heading arrow). For now only
 * position is interpolated; the prev/cur yaw and pitch are stored in
 * remote_player_t so the future change is one place. */

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

    /* Server broadcasts at ~6.7 Hz so the gap between snapshots is
     * ~150 ms. Interpolating across that window lags the displayed
     * pose by one snapshot interval but keeps motion smooth. */
    const double interp_delay_s = 0.150;
    const double now = stm_sec(stm_now());
    const float  r   = 0.5f;       /* octahedron radius */

    for (int i = 0; i < R.count; ++i) {
        const remote_player_t* p = &R.players[i];
        if (!p->active) continue;

        double dt = now - p->snapshot_time_s;
        double t  = dt / interp_delay_s;
        if (t < 0.0) t = 0.0;
        if (t > 1.0) t = 1.0;

        double lx = p->pos_prev.x + (p->pos_cur.x - p->pos_prev.x) * t;
        double ly = p->pos_prev.y + (p->pos_cur.y - p->pos_prev.y) * t;
        double lz = p->pos_prev.z + (p->pos_cur.z - p->pos_prev.z) * t;

        sgl_push_matrix();
        sgl_translate((float)lx, (float)ly, (float)lz);
        draw_octahedron(0.0f, 0.0f, 0.0f, r);
        sgl_pop_matrix();
    }

    sgl_draw();
}
