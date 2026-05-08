#include "client/torch.h"
#include "client/renderer.h"

#include "sokol_gfx.h"
#include "torch.glsl.h"

#include <math.h>
#include <stdlib.h>
#include <string.h>

/* ----------------------------------------------------------------------- */
/* Geometry constants — match the JS reference (src/planet/Torch.ts)
 * so torches placed by the C build look identical to those built in
 * the JS reference. */

#define HANDLE_HEIGHT  0.40f
#define HANDLE_RADIUS  0.03f
#define HEAD_HEIGHT    0.10f
#define HEAD_RADIUS    0.06f
#define FLAME_HEIGHT   0.15f
#define FLAME_RADIUS   0.05f
#define FLAME_BASE_Y   (HANDLE_HEIGHT + HEAD_HEIGHT)   /* = 0.50 */

/* 8 angular segments around each cylinder/cone — coarse but the torch
 * is small enough that finer subdivision doesn't pay off. Polygon
 * count stays trivial (~96 verts merged across the three pieces). */
#define N_SEG 8

typedef struct {
    float pos[3];
    float color[3];
    float anim_w;
} torch_vertex_t;

/* ----------------------------------------------------------------------- */

static struct {
    sg_buffer    vbuf;
    sg_buffer    ibuf;
    sg_pipeline  pip;
    int          index_count;

    torch_t      list[TORCH_MAX_COUNT];
    int          count;
} T;

/* Forward decls. */
static void build_geometry(void);

/* ----------------------------------------------------------------------- */

static void push_vertex(torch_vertex_t* dst, int* n,
                        float x, float y, float z,
                        float r, float g, float b,
                        float anim_w) {
    torch_vertex_t* v = &dst[(*n)++];
    v->pos[0] = x; v->pos[1] = y; v->pos[2] = z;
    v->color[0] = r; v->color[1] = g; v->color[2] = b;
    v->anim_w = anim_w;
}

/* Cylinder spanning (y0..y1) with radius r0 at the bottom and r1 at
 * the top. Two caps + N_SEG side quads. anim_w + per-vertex colour
 * are stamped uniformly across all of this piece's vertices. */
static void build_cylinder(torch_vertex_t* dst, uint16_t* idx,
                           int* n_verts, int* n_idx,
                           float y0, float y1, float r0, float r1,
                           float cr, float cg, float cb, float anim_w) {
    int base = *n_verts;

    /* Bottom-cap centre + ring. */
    int bot_centre = *n_verts;
    push_vertex(dst, n_verts, 0.0f, y0, 0.0f, cr, cg, cb, anim_w);
    int bot_ring = *n_verts;
    for (int i = 0; i < N_SEG; ++i) {
        float a = (float)i / (float)N_SEG * 6.2831853f;
        push_vertex(dst, n_verts,
                    cosf(a) * r0, y0, sinf(a) * r0,
                    cr, cg, cb, anim_w);
    }
    /* Top-cap centre + ring. */
    int top_centre = *n_verts;
    push_vertex(dst, n_verts, 0.0f, y1, 0.0f, cr, cg, cb, anim_w);
    int top_ring = *n_verts;
    for (int i = 0; i < N_SEG; ++i) {
        float a = (float)i / (float)N_SEG * 6.2831853f;
        push_vertex(dst, n_verts,
                    cosf(a) * r1, y1, sinf(a) * r1,
                    cr, cg, cb, anim_w);
    }

    /* Bottom cap (CW from below = CCW from outside, so we wind
     * centre/i+1/i to keep the outward face pointing -Y). */
    for (int i = 0; i < N_SEG; ++i) {
        int next = (i + 1) % N_SEG;
        idx[(*n_idx)++] = (uint16_t)bot_centre;
        idx[(*n_idx)++] = (uint16_t)(bot_ring + next);
        idx[(*n_idx)++] = (uint16_t)(bot_ring + i);
    }
    /* Top cap (outward face +Y). */
    for (int i = 0; i < N_SEG; ++i) {
        int next = (i + 1) % N_SEG;
        idx[(*n_idx)++] = (uint16_t)top_centre;
        idx[(*n_idx)++] = (uint16_t)(top_ring + i);
        idx[(*n_idx)++] = (uint16_t)(top_ring + next);
    }
    /* Side quads. */
    for (int i = 0; i < N_SEG; ++i) {
        int next = (i + 1) % N_SEG;
        uint16_t b0 = (uint16_t)(bot_ring + i);
        uint16_t b1 = (uint16_t)(bot_ring + next);
        uint16_t t0 = (uint16_t)(top_ring + i);
        uint16_t t1 = (uint16_t)(top_ring + next);
        idx[(*n_idx)++] = b0; idx[(*n_idx)++] = b1; idx[(*n_idx)++] = t1;
        idx[(*n_idx)++] = b0; idx[(*n_idx)++] = t1; idx[(*n_idx)++] = t0;
    }
    (void)base;
}

/* Cone with base radius r at y0 + tip at (0, y1, 0). */
static void build_cone(torch_vertex_t* dst, uint16_t* idx,
                       int* n_verts, int* n_idx,
                       float y0, float y1, float r,
                       float cr, float cg, float cb, float anim_w) {
    int base_centre = *n_verts;
    push_vertex(dst, n_verts, 0.0f, y0, 0.0f, cr, cg, cb, anim_w);
    int base_ring = *n_verts;
    for (int i = 0; i < N_SEG; ++i) {
        float a = (float)i / (float)N_SEG * 6.2831853f;
        push_vertex(dst, n_verts,
                    cosf(a) * r, y0, sinf(a) * r,
                    cr, cg, cb, anim_w);
    }
    int tip = *n_verts;
    push_vertex(dst, n_verts, 0.0f, y1, 0.0f, cr, cg, cb, anim_w);

    /* Base cap (faces -Y, but for an upward-pointing cone in our
     * winding convention this points away from the rest of the
     * scene; we still emit it so the cone reads as solid from below). */
    for (int i = 0; i < N_SEG; ++i) {
        int next = (i + 1) % N_SEG;
        idx[(*n_idx)++] = (uint16_t)base_centre;
        idx[(*n_idx)++] = (uint16_t)(base_ring + next);
        idx[(*n_idx)++] = (uint16_t)(base_ring + i);
    }
    /* Lateral faces from base ring to tip. */
    for (int i = 0; i < N_SEG; ++i) {
        int next = (i + 1) % N_SEG;
        idx[(*n_idx)++] = (uint16_t)(base_ring + i);
        idx[(*n_idx)++] = (uint16_t)(base_ring + next);
        idx[(*n_idx)++] = (uint16_t)tip;
    }
}

static void build_geometry(void) {
    /* Upper-bound vert/index counts. Three pieces, each a cylinder
     * (handle / head) or cone (flame); cylinders contribute 2*N_SEG
     * sides + 2 caps, cones contribute N_SEG sides + 1 cap. Plenty
     * of slack here. */
    enum { MAX_V = 256, MAX_I = 512 };
    static torch_vertex_t verts[MAX_V];
    static uint16_t       idx[MAX_I];
    int n_v = 0, n_i = 0;

    /* Handle — saddle-brown cylinder, static. */
    build_cylinder(verts, idx, &n_v, &n_i,
                   0.0f, HANDLE_HEIGHT, HANDLE_RADIUS, HANDLE_RADIUS,
                   0.545f, 0.271f, 0.075f, 0.0f);
    /* Head — slightly tapered dark-gray cylinder, static. */
    build_cylinder(verts, idx, &n_v, &n_i,
                   HANDLE_HEIGHT, HANDLE_HEIGHT + HEAD_HEIGHT,
                   HEAD_RADIUS, HEAD_RADIUS * 0.8f,
                   0.20f, 0.20f, 0.20f, 0.0f);
    /* Flame — warm-orange cone, animated (anim_w = 1). */
    build_cone(verts, idx, &n_v, &n_i,
               FLAME_BASE_Y, FLAME_BASE_Y + FLAME_HEIGHT, FLAME_RADIUS,
               1.0f, 0.667f, 0.267f, 1.0f);

    T.vbuf = sg_make_buffer(&(sg_buffer_desc){
        .data  = (sg_range){ .ptr = verts, .size = (size_t)n_v * sizeof(torch_vertex_t) },
        .label = "torch-vbuf",
    });
    T.ibuf = sg_make_buffer(&(sg_buffer_desc){
        .data  = (sg_range){ .ptr = idx, .size = (size_t)n_i * sizeof(uint16_t) },
        .usage = { .index_buffer = true },
        .label = "torch-ibuf",
    });
    T.index_count = n_i;
}

/* ----------------------------------------------------------------------- */

void torch_init(void) {
    sg_shader shd = sg_make_shader(torch_shader_desc(sg_query_backend()));
    T.pip = sg_make_pipeline(&(sg_pipeline_desc){
        .shader = shd,
        .layout = {
            .attrs = {
                [ATTR_torch_a_pos]         = { .format = SG_VERTEXFORMAT_FLOAT3 },
                [ATTR_torch_a_color]       = { .format = SG_VERTEXFORMAT_FLOAT3 },
                [ATTR_torch_a_anim_weight] = { .format = SG_VERTEXFORMAT_FLOAT  },
            },
            .buffers[0].stride = sizeof(torch_vertex_t),
        },
        .index_type = SG_INDEXTYPE_UINT16,
        .depth      = { .write_enabled = true, .compare = SG_COMPAREFUNC_LESS_EQUAL },
        .cull_mode  = SG_CULLMODE_BACK,
        .face_winding = SG_FACEWINDING_CCW,
        .label = "torch-pipeline",
    });
    build_geometry();
    T.count = 0;
}

void torch_shutdown(void) {
    /* Pipeline + buffers are destroyed by sg_shutdown at program
     * exit; nothing per-module to free. */
    T.count = 0;
}

/* ----------------------------------------------------------------------- */

bool torch_place(vec3_t position, vec3_t up, int tile_idx) {
    if (T.count >= TORCH_MAX_COUNT) return false;
    torch_t* t = &T.list[T.count++];
    t->position = position;
    t->up       = vec3_normalize(up);
    /* Random-ish phase from the slot index — adjacent torches end up
     * with offset phases so they don't pulse together. The "true"
     * random would need an RNG; this is good enough for visual
     * decorrelation. */
    t->flicker_phase = (float)(T.count * 0.7193f);
    t->tile_idx = tile_idx;
    return true;
}

bool torch_remove_near(vec3_t world_pos, float radius_m) {
    int best = -1;
    float best_d2 = radius_m * radius_m;
    for (int i = 0; i < T.count; ++i) {
        vec3_t d = vec3_sub(T.list[i].position, world_pos);
        float d2 = d.x*d.x + d.y*d.y + d.z*d.z;
        if (d2 < best_d2) { best_d2 = d2; best = i; }
    }
    if (best < 0) return false;
    /* Swap-remove. */
    T.list[best] = T.list[T.count - 1];
    --T.count;
    return true;
}

vec3_t torch_flame_pos(const torch_t* t) {
    return vec3_add(t->position, vec3_scale(t->up, TORCH_FLAME_HEIGHT_M));
}

int            torch_count(void)         { return T.count; }
const torch_t* torch_list(void)          { return T.list;  }

vec3_t torch_position_at(int idx) {
    if (idx < 0 || idx >= T.count) return (vec3_t){ 0, 0, 0 };
    return T.list[idx].position;
}

void torch_remove(int idx) {
    if (idx < 0 || idx >= T.count) return;
    T.list[idx] = T.list[T.count - 1];
    --T.count;
}

int torch_raycast(vec3_t eye, vec3_t dir, float max_dist, float* out_dist) {
    /* Bounding-sphere centre: torch midpoint along its up axis. The
     * canonical mesh spans 0..0.65 m on local Y, so 0.32 m above the
     * base is the geometric centre. Radius 0.45 m comfortably covers
     * the 0.06 m head + the wider flame plus the small horizontal
     * wobble the flame's vs animation introduces. */
    const float CENTRE_OFFSET = 0.32f;
    const float RADIUS        = 0.45f;
    const float R2            = RADIUS * RADIUS;

    int   hit  = -1;
    float best = max_dist;
    for (int i = 0; i < T.count; ++i) {
        vec3_t centre = vec3_add(T.list[i].position,
                                 vec3_scale(T.list[i].up, CENTRE_OFFSET));
        vec3_t oc = vec3_sub(eye, centre);
        float b   = vec3_dot(oc, dir);
        float c   = vec3_dot(oc, oc) - R2;
        float disc = b * b - c;
        if (disc < 0.0f) continue;
        float sq = sqrtf(disc);
        float t  = -b - sq;
        /* Inside-the-sphere case (eye sitting on top of a torch):
         * use the far root so we still consider the hit valid. */
        if (t < 0.0f) t = -b + sq;
        if (t < 0.0f || t >= best) continue;
        best = t;
        hit  = i;
    }
    if (out_dist) *out_dist = best;
    return hit;
}

/* ----------------------------------------------------------------------- */

/* Build the orthonormal basis (right, up, fwd) where up is the
 * surface normal at the torch base. Right + fwd are picked to span
 * the tangent plane; the absolute choice of which way "right" points
 * doesn't matter for a radially-symmetric torch. */
static mat4_t torch_model_matrix(const torch_t* t) {
    vec3_t up    = t->up;
    /* Reference axis chosen to avoid degeneracy when up is near
     * (1,0,0). When up.x is large, swap to (0,0,1) as the cross
     * partner. */
    vec3_t ref   = (fabsf(up.x) < 0.9f) ? (vec3_t){1.0f, 0.0f, 0.0f}
                                        : (vec3_t){0.0f, 0.0f, 1.0f};
    vec3_t right = vec3_normalize(vec3_cross(up, ref));
    vec3_t fwd   = vec3_cross(right, up);

    mat4_t m;
    m.m[0]  = right.x; m.m[1]  = right.y; m.m[2]  = right.z; m.m[3]  = 0.0f;
    m.m[4]  = up.x;    m.m[5]  = up.y;    m.m[6]  = up.z;    m.m[7]  = 0.0f;
    m.m[8]  = fwd.x;   m.m[9]  = fwd.y;   m.m[10] = fwd.z;   m.m[11] = 0.0f;
    m.m[12] = t->position.x;
    m.m[13] = t->position.y;
    m.m[14] = t->position.z;
    m.m[15] = 1.0f;
    return m;
}

void torch_draw(mat4_t vp, float time_seconds) {
    if (T.count == 0) return;

    sg_apply_pipeline(T.pip);
    sg_apply_bindings(&(sg_bindings){
        .vertex_buffers[0] = T.vbuf,
        .index_buffer      = T.ibuf,
    });

    for (int i = 0; i < T.count; ++i) {
        const torch_t* t = &T.list[i];
        mat4_t model = torch_model_matrix(t);
        mat4_t mvp   = mat4_mul(vp, model);

        torch_vs_params_t vsp = {
            /* Multiply the time by a flicker speed so the three-sine
             * product produces a visible animation rather than
             * crawling at the bare clock rate. Per-torch phase
             * offset breaks the lockstep. */
            .u_time           = (time_seconds * 8.0f) + t->flicker_phase,
            .u_flicker_amount = 0.18f,
        };
        memcpy(vsp.u_mvp, mvp.m, sizeof(vsp.u_mvp));
        sg_apply_uniforms(UB_torch_vs_params, &SG_RANGE(vsp));
        sg_draw(0, T.index_count, 1);
    }
}
