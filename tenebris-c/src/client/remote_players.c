#include "client/remote_players.h"

#include "sokol_gfx.h"
#include "sokol_gl.h"
#include "sokol_time.h"
#include "sokol_debugtext.h"

#include <math.h>
#include <stdio.h>
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

/* Emit a colour-shaded cuboid centred on (cx, cy, cz) with extents
 * (hx, hy, hz). Top and bottom faces get a slight tone bias so the
 * mesh reads three-dimensional without baked lighting. Caller wraps
 * the calls in a single sgl_begin_triangles / sgl_end pair. */
static void box(float cx, float cy, float cz,
                  float hx, float hy, float hz,
                  float r, float g, float b) {
    const float x0 = cx - hx, x1 = cx + hx;
    const float y0 = cy - hy, y1 = cy + hy;
    const float z0 = cz - hz, z1 = cz + hz;

    /* Bake per-face shading so even with no lighting model the cuboid
     * silhouettes read clearly. Top brightest, bottom darkest, sides
     * intermediate; the dim_xz / dim_z deltas pick out the front
     * and back independently. */
    const float top_r = r * 1.10f, top_g = g * 1.10f, top_b = b * 1.10f;
    const float bot_r = r * 0.55f, bot_g = g * 0.55f, bot_b = b * 0.55f;
    const float mid_r = r,         mid_g = g,         mid_b = b;
    const float xs_r  = r * 0.80f, xs_g  = g * 0.80f, xs_b  = b * 0.80f;

    /* +Y top */
    sgl_c3f(top_r, top_g, top_b);
    sgl_v3f(x0, y1, z0); sgl_v3f(x1, y1, z0); sgl_v3f(x1, y1, z1);
    sgl_v3f(x0, y1, z0); sgl_v3f(x1, y1, z1); sgl_v3f(x0, y1, z1);
    /* -Y bottom */
    sgl_c3f(bot_r, bot_g, bot_b);
    sgl_v3f(x0, y0, z0); sgl_v3f(x1, y0, z1); sgl_v3f(x1, y0, z0);
    sgl_v3f(x0, y0, z0); sgl_v3f(x0, y0, z1); sgl_v3f(x1, y0, z1);
    /* +Z front */
    sgl_c3f(mid_r, mid_g, mid_b);
    sgl_v3f(x0, y0, z1); sgl_v3f(x1, y0, z1); sgl_v3f(x1, y1, z1);
    sgl_v3f(x0, y0, z1); sgl_v3f(x1, y1, z1); sgl_v3f(x0, y1, z1);
    /* -Z back */
    sgl_c3f(xs_r, xs_g, xs_b);
    sgl_v3f(x0, y0, z0); sgl_v3f(x1, y1, z0); sgl_v3f(x1, y0, z0);
    sgl_v3f(x0, y0, z0); sgl_v3f(x0, y1, z0); sgl_v3f(x1, y1, z0);
    /* +X right */
    sgl_c3f(xs_r, xs_g, xs_b);
    sgl_v3f(x1, y0, z0); sgl_v3f(x1, y1, z1); sgl_v3f(x1, y0, z1);
    sgl_v3f(x1, y0, z0); sgl_v3f(x1, y1, z0); sgl_v3f(x1, y1, z1);
    /* -X left */
    sgl_c3f(mid_r, mid_g, mid_b);
    sgl_v3f(x0, y0, z0); sgl_v3f(x0, y0, z1); sgl_v3f(x0, y1, z1);
    sgl_v3f(x0, y0, z0); sgl_v3f(x0, y1, z1); sgl_v3f(x0, y1, z0);
}

/* Procedural humanoid figure. ~1.8 m tall, origin at feet. Geometry is
 * six axis-aligned boxes (legs, torso, arms, head). Yaw rotates the
 * whole figure around its vertical axis so the player faces where
 * they're looking. Idle pose only — no animation; bone weights wait
 * for the M8b skeletal pass.
 *
 * Colour palette: warm skin, blue tunic, dark trousers. Per-profile
 * tinting would slot in as a (r,g,b) hash of the player_id; for now
 * everyone wears the same uniform. */
static void draw_humanoid(float cx, float cy, float cz, float yaw) {
    /* Local axes after yaw rotation. The figure faces -Z when yaw=0;
     * positive yaw rotates clockwise viewed from above (matches the
     * player's own basis). */
    const float c = cosf(yaw);
    const float s = sinf(yaw);

    /* Offset helper: rotate a local (lx, lz) into world relative to
     * the figure's centreline, then bake into the absolute (cx,cz).
     * Y stays as-is. */
    #define BODY_PART(LX, LY, LZ, HX, HY, HZ, R, G, B) do { \
        float wx = cx + (LX) * c + (LZ) * s;                 \
        float wz = cz - (LX) * s + (LZ) * c;                 \
        box(wx, cy + (LY), wz, (HX), (HY), (HZ), (R), (G), (B));    \
    } while (0)

    /* Legs — two boxes side-by-side. Hips at ~0.85 m. */
    BODY_PART(-0.12f, 0.40f, 0.0f, 0.10f, 0.40f, 0.10f, 0.20f, 0.20f, 0.30f);
    BODY_PART(+0.12f, 0.40f, 0.0f, 0.10f, 0.40f, 0.10f, 0.20f, 0.20f, 0.30f);

    /* Torso — wider than deep, centred at chest height. */
    BODY_PART(0.0f,   1.10f, 0.0f, 0.22f, 0.30f, 0.13f, 0.25f, 0.45f, 0.80f);

    /* Arms — flank the torso. Slightly narrower than legs. */
    BODY_PART(-0.30f, 1.10f, 0.0f, 0.08f, 0.30f, 0.10f, 0.20f, 0.40f, 0.75f);
    BODY_PART(+0.30f, 1.10f, 0.0f, 0.08f, 0.30f, 0.10f, 0.20f, 0.40f, 0.75f);

    /* Head — cube on top of the torso. */
    BODY_PART(0.0f,   1.60f, 0.0f, 0.13f, 0.13f, 0.13f, 0.95f, 0.78f, 0.62f);

    #undef BODY_PART
}

/* Minimal-angle interpolation for yaw — wraps past ±π so a snap from
 * +179 deg to -179 deg goes the short way around. */
static float lerp_yaw(float a, float b, float t) {
    float diff = b - a;
    const float two_pi = 6.28318530717958647692f;
    const float pi     = 3.14159265358979323846f;
    while (diff >  pi) diff -= two_pi;
    while (diff < -pi) diff += two_pi;
    return a + diff * t;
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

    /* Server broadcasts at ~6.7 Hz so the gap between snapshots is
     * ~150 ms. Interpolating across that window lags the displayed
     * pose by one snapshot interval but keeps motion smooth. */
    const double interp_delay_s = 0.150;
    const double now = stm_sec(stm_now());

    sgl_begin_triangles();
    for (int i = 0; i < R.count; ++i) {
        const remote_player_t* p = &R.players[i];
        if (!p->active) continue;

        double dt = now - p->snapshot_time_s;
        double t  = dt / interp_delay_s;
        if (t < 0.0) t = 0.0;
        if (t > 1.0) t = 1.0;

        float lx = (float)(p->pos_prev.x + (p->pos_cur.x - p->pos_prev.x) * t);
        float ly = (float)(p->pos_prev.y + (p->pos_cur.y - p->pos_prev.y) * t);
        float lz = (float)(p->pos_prev.z + (p->pos_cur.z - p->pos_prev.z) * t);
        float yaw = lerp_yaw(p->yaw_prev, p->yaw_cur, (float)t);

        /* The player's reported position is the FEET anchor, same as
         * G.player.position. draw_humanoid grows upward from cy, so
         * pass (lx, ly, lz) straight in. */
        draw_humanoid(lx, ly, lz, yaw);
    }
    sgl_end();

    sgl_draw();
}

/* Multiply a 4x4 column-major mat4_t by a homogeneous (x,y,z,1).
 * mat4_t.m is laid out as 16 floats; the renderer follows the column-
 * major convention (m[0..3] = column 0, etc.). */
static void mat4_mul_vec4(const float* m, float x, float y, float z,
                            float* out_x, float* out_y, float* out_z,
                            float* out_w) {
    *out_x = m[ 0]*x + m[ 4]*y + m[ 8]*z + m[12];
    *out_y = m[ 1]*x + m[ 5]*y + m[ 9]*z + m[13];
    *out_z = m[ 2]*x + m[ 6]*y + m[10]*z + m[14];
    *out_w = m[ 3]*x + m[ 7]*y + m[11]*z + m[15];
}

void remote_players_draw_nameplates(mat4_t view, mat4_t proj,
                                       float screen_w, float screen_h,
                                       remote_players_name_fn name_fn) {
    if (R.count == 0 || !name_fn) return;

    /* vp = proj * view, column-major. Use HandmadeMath-equivalent
     * manual multiply to avoid pulling in a different math lib. */
    float vp[16];
    for (int col = 0; col < 4; ++col) {
        for (int row = 0; row < 4; ++row) {
            float acc = 0.0f;
            for (int k = 0; k < 4; ++k) {
                acc += proj.m[k * 4 + row] * view.m[col * 4 + k];
            }
            vp[col * 4 + row] = acc;
        }
    }

    const double interp_delay_s = 0.150;
    const double now = stm_sec(stm_now());

    for (int i = 0; i < R.count; ++i) {
        const remote_player_t* p = &R.players[i];
        if (!p->active) continue;
        const char* name = name_fn(p->player_id);
        if (!name || !*name) continue;

        double dt = now - p->snapshot_time_s;
        double t  = dt / interp_delay_s;
        if (t < 0.0) t = 0.0;
        if (t > 1.0) t = 1.0;

        /* Anchor the nameplate at head height + a little extra so it
         * floats clear of the model's hair. */
        float wx = (float)(p->pos_prev.x + (p->pos_cur.x - p->pos_prev.x) * t);
        float wy = (float)(p->pos_prev.y + (p->pos_cur.y - p->pos_prev.y) * t);
        float wz = (float)(p->pos_prev.z + (p->pos_cur.z - p->pos_prev.z) * t);
        float head_y = wy + 2.1f;

        float cx, cy, cz, cw;
        mat4_mul_vec4(vp, wx, head_y, wz, &cx, &cy, &cz, &cw);
        /* Behind-the-camera: skip. */
        if (cw <= 0.001f) continue;

        float ndc_x =  cx / cw;
        float ndc_y =  cy / cw;
        /* Clip-space y is +up in GL; screen px is +down. Flip. */
        float sx = (ndc_x * 0.5f + 0.5f) * screen_w;
        float sy = (1.0f - (ndc_y * 0.5f + 0.5f)) * screen_h;

        /* Drop the name centred above the projected head. sdtx uses
         * font slot 1 (c64) — clean baseline at any scale, matches the
         * menu's font choice. */
        const float scale = 1.0f;
        const float cell  = 8.0f * scale;
        int n = (int)strlen(name);
        float text_w = cell * (float)n;
        float tx = sx - text_w * 0.5f;
        float ty = sy - cell;

        /* Off-screen? Skip — keeps text from oozing along the edges
         * when a player is way off to the side. */
        if (tx < -text_w || tx > screen_w) continue;
        if (ty < -cell    || ty > screen_h) continue;

        sdtx_canvas(screen_w / scale, screen_h / scale);
        sdtx_font(1);
        sdtx_origin(tx / cell, ty / cell);
        sdtx_color3b(0xff, 0xe8, 0x80);
        sdtx_home();
        sdtx_printf("%s", name);
        sdtx_font(0);
    }
}
