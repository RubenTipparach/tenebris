#include "core/icosphere.h"
#include <stdlib.h>
#include <string.h>
#include <math.h>

/* ----------------------------------------------------------------------- */
/* Icosahedron vertex + face tables. Generated once.                       */

static dvec3_t icosa_v[12];
static int     icosa_f[20][3];
static bool    icosa_init_done = false;

static void icosa_init(void) {
    if (icosa_init_done) return;
    const double t = (1.0 + sqrt(5.0)) / 2.0;
    const double n = 1.0 / sqrt(1.0 + t * t);
    const double T = t * n;

    icosa_v[0]  = dvec3_make(-n,  T, 0); icosa_v[1]  = dvec3_make( n,  T, 0);
    icosa_v[2]  = dvec3_make(-n, -T, 0); icosa_v[3]  = dvec3_make( n, -T, 0);
    icosa_v[4]  = dvec3_make(0, -n,  T); icosa_v[5]  = dvec3_make(0,  n,  T);
    icosa_v[6]  = dvec3_make(0, -n, -T); icosa_v[7]  = dvec3_make(0,  n, -T);
    icosa_v[8]  = dvec3_make( T, 0, -n); icosa_v[9]  = dvec3_make( T, 0,  n);
    icosa_v[10] = dvec3_make(-T, 0, -n); icosa_v[11] = dvec3_make(-T, 0,  n);

    static const int F[20][3] = {
        {0,11,5},{0,5,1},{0,1,7},{0,7,10},{0,10,11},
        {1,5,9},{5,11,4},{11,10,2},{10,7,6},{7,1,8},
        {3,9,4},{3,4,2},{3,2,6},{3,6,8},{3,8,9},
        {4,9,5},{2,4,11},{6,2,10},{8,6,7},{9,8,1},
    };
    memcpy(icosa_f, F, sizeof(F));
    icosa_init_done = true;
}

/* ----------------------------------------------------------------------- */

#define MAX_NODES LOD_MAX_NODES

struct lod_tree_s {
    const body_config_t* body;
    lod_node_t  nodes[MAX_NODES];
    bool        used[MAX_NODES];
    int         node_count;
    int         visible[MAX_NODES];
    int         visible_count;
    float       depth_arc[LOD_MAX_DEPTH + 1];   /* angular radius per depth */
};

static lod_node_handle alloc_node(lod_tree_t* t) {
    /* Linear scan — fine while we're nowhere near MAX_NODES. */
    for (int i = 0; i < MAX_NODES; ++i) {
        if (!t->used[i]) {
            t->used[i] = true;
            t->node_count++;
            memset(&t->nodes[i], 0, sizeof(t->nodes[i]));
            t->nodes[i].parent = -1;
            for (int k = 0; k < 4; ++k) t->nodes[i].children[k] = -1;
            return (lod_node_handle)i;
        }
    }
    return -1;
}

static void free_node(lod_tree_t* t, lod_node_handle h) {
    if (h < 0 || h >= MAX_NODES) return;
    if (!t->used[h]) return;
    /* Recursively free children first. */
    for (int k = 0; k < 4; ++k) {
        if (t->nodes[h].children[k] >= 0) free_node(t, t->nodes[h].children[k]);
    }
    t->used[h] = false;
    t->node_count--;
}

static void compute_node_geometry(lod_node_t* n) {
    dvec3_t avg = dvec3_make(
        (n->a.x + n->b.x + n->c.x) / 3.0,
        (n->a.y + n->b.y + n->c.y) / 3.0,
        (n->a.z + n->b.z + n->c.z) / 3.0);
    n->center = dvec3_normalize(avg);
}

lod_tree_t* lod_tree_create(const body_config_t* body) {
    icosa_init();
    lod_tree_t* t = (lod_tree_t*)calloc(1, sizeof(lod_tree_t));
    t->body = body;

    /* Precompute angular radius per depth. Root face's angular radius
     * is roughly atan2(side / 2, in_radius_of_icosahedron). For an
     * icosahedron inscribed in the unit sphere, each face's angular
     * radius is ~0.5536 rad (~31.7 deg). Halve per depth. */
    const float root_arc = 0.5536f;
    for (int d = 0; d <= LOD_MAX_DEPTH; ++d) {
        t->depth_arc[d] = root_arc / (float)(1 << d);
    }

    /* Build root nodes: one per icosahedron face. */
    for (int f = 0; f < LOD_ROOT_COUNT; ++f) {
        lod_node_handle h = alloc_node(t);
        if (h < 0) break;
        lod_node_t* n = &t->nodes[h];
        n->a = icosa_v[icosa_f[f][0]];
        n->b = icosa_v[icosa_f[f][1]];
        n->c = icosa_v[icosa_f[f][2]];
        n->depth = 0;
        n->root_face = (int8_t)f;
        n->child_index = -1;
        n->angular_radius = t->depth_arc[0];
        compute_node_geometry(n);
    }
    return t;
}

void lod_tree_destroy(lod_tree_t* t) { free(t); }

/* ----------------------------------------------------------------------- */
/* Tier 1 update step: leaf-only visibility, no split/merge yet.
 *
 * Real distance-based subdivision lands in the next commit so this file
 * scaffold compiles and exposes a stable API. For now: every root face
 * is a visible leaf. That's enough to render a low-poly icosahedron
 * planet so the renderer + asset pipeline can come online first.
 */
int lod_tree_update(lod_tree_t* t, dvec3_t camera_world) {
    (void)camera_world;
    t->visible_count = 0;
    for (int i = 0; i < MAX_NODES && t->visible_count < MAX_NODES; ++i) {
        if (!t->used[i]) continue;
        lod_node_t* n = &t->nodes[i];
        bool is_leaf = true;
        for (int k = 0; k < 4; ++k) if (n->children[k] >= 0) { is_leaf = false; break; }
        if (!is_leaf) continue;
        if (n->suppressed) continue;
        t->visible[t->visible_count++] = i;
    }
    return t->visible_count;
}

int lod_tree_visible_count(const lod_tree_t* t) { return t->visible_count; }

const lod_node_t* lod_tree_node(const lod_tree_t* t, int visible_index) {
    if (visible_index < 0 || visible_index >= t->visible_count) return NULL;
    return &t->nodes[t->visible[visible_index]];
}

void lod_tree_apply_suppression(lod_tree_t* t, dvec3_t bubble_center, double bubble_radius_m) {
    if (!t->body) return;
    /* Convert bubble radius to a great-circle arc on the unit sphere. */
    const double arc_limit = bubble_radius_m / t->body->radius_m;
    const double cos_limit = cos(arc_limit);
    dvec3_t bn = dvec3_normalize(bubble_center);
    for (int i = 0; i < MAX_NODES; ++i) {
        if (!t->used[i]) continue;
        lod_node_t* n = &t->nodes[i];
        n->suppressed = (dvec3_dot(n->center, bn) > cos_limit);
    }
}
