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
#define MERGE_HYSTERESIS 2.0f         /* merge at (arc * factor * this) */

struct lod_tree_s {
    const body_config_t* body;
    lod_node_t  nodes[MAX_NODES];
    bool        used[MAX_NODES];
    int         node_count;
    int         visible[MAX_NODES];
    int         visible_count;
    float       depth_arc[LOD_MAX_DEPTH + 1];   /* angular radius per depth */
};

/* ----------------------------------------------------------------------- */

static lod_node_handle alloc_node(lod_tree_t* t) {
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

static void free_node_recursive(lod_tree_t* t, lod_node_handle h) {
    if (h < 0 || h >= MAX_NODES) return;
    if (!t->used[h]) return;
    for (int k = 0; k < 4; ++k) {
        if (t->nodes[h].children[k] >= 0) free_node_recursive(t, t->nodes[h].children[k]);
        t->nodes[h].children[k] = -1;
    }
    t->used[h] = false;
    t->node_count--;
}

static void compute_node_geometry(lod_tree_t* t, lod_node_t* n) {
    dvec3_t avg = dvec3_make(
        (n->a.x + n->b.x + n->c.x) / 3.0,
        (n->a.y + n->b.y + n->c.y) / 3.0,
        (n->a.z + n->b.z + n->c.z) / 3.0);
    n->center = dvec3_normalize(avg);
    n->angular_radius = t->depth_arc[n->depth];
}

/* ----------------------------------------------------------------------- */
/* Aperture-4 subdivision: split one triangle into four equal children by
 * bisecting each edge and projecting the midpoints back onto the unit
 * sphere.
 *
 *         c
 *        / \
 *      m_ca---m_bc
 *      / \  /  \
 *     a--m_ab---b
 */
static void split_node(lod_tree_t* t, lod_node_handle h) {
    if (h < 0) return;
    lod_node_t* n = &t->nodes[h];
    if (n->children[0] >= 0) return;                 /* already split */
    if (n->depth >= t->body->max_lod_depth) return;  /* hit max */

    dvec3_t m_ab = dvec3_normalize(dvec3_scale(dvec3_add(n->a, n->b), 0.5));
    dvec3_t m_bc = dvec3_normalize(dvec3_scale(dvec3_add(n->b, n->c), 0.5));
    dvec3_t m_ca = dvec3_normalize(dvec3_scale(dvec3_add(n->c, n->a), 0.5));

    /*  child 0 = corner at A:  (A,   m_ab, m_ca)
     *  child 1 = corner at B:  (m_ab, B,   m_bc)
     *  child 2 = corner at C:  (m_ca, m_bc, C)
     *  child 3 = center:       (m_ab, m_bc, m_ca)
     */
    struct tri { dvec3_t a, b, c; };
    struct tri T[4] = {
        { n->a,  m_ab, m_ca },
        { m_ab,  n->b, m_bc },
        { m_ca,  m_bc, n->c  },
        { m_ab,  m_bc, m_ca },
    };
    for (int i = 0; i < 4; ++i) {
        lod_node_handle ch = alloc_node(t);
        if (ch < 0) return;   /* out of node pool - fail silently */
        lod_node_t* nc = &t->nodes[ch];
        nc->a = T[i].a;
        nc->b = T[i].b;
        nc->c = T[i].c;
        nc->depth       = n->depth + 1;
        nc->root_face   = n->root_face;
        nc->child_index = (int8_t)i;
        nc->parent      = h;
        compute_node_geometry(t, nc);
        /* alloc_node zeroed the struct so children[] are -1 already via
         * the zeroed memset + the parent = -1 writeback in alloc_node;
         * re-init to be explicit. */
        for (int k = 0; k < 4; ++k) nc->children[k] = -1;
        t->nodes[h].children[i] = ch;
    }
}

/* True if all four children are leaves (no grandchildren). Used to
 * decide whether a node is safe to merge back to a leaf this frame. */
static bool children_all_leaves(const lod_tree_t* t, const lod_node_t* n) {
    for (int i = 0; i < 4; ++i) {
        lod_node_handle ch = n->children[i];
        if (ch < 0) return false;
        const lod_node_t* nc = &t->nodes[ch];
        for (int k = 0; k < 4; ++k) if (nc->children[k] >= 0) return false;
    }
    return true;
}

static void merge_node(lod_tree_t* t, lod_node_handle h) {
    lod_node_t* n = &t->nodes[h];
    for (int i = 0; i < 4; ++i) {
        if (n->children[i] >= 0) free_node_recursive(t, n->children[i]);
        n->children[i] = -1;
    }
}

/* ----------------------------------------------------------------------- */

static double node_distance_m(const lod_tree_t* t, const lod_node_t* n, dvec3_t camera_world) {
    dvec3_t node_world = dvec3_scale(n->center, t->body->radius_m);
    return dvec3_length(dvec3_sub(camera_world, node_world));
}

static double node_arc_m(const lod_tree_t* t, const lod_node_t* n) {
    return (double)n->angular_radius * t->body->radius_m;
}

/* Recursive top-down update. Decides split/merge for this node, then
 * recurses into survivors. The hysteresis band (split at arc*factor,
 * merge at arc*factor*MERGE_HYSTERESIS) prevents thrashing at the
 * boundary. */
static void update_node(lod_tree_t* t, lod_node_handle h, dvec3_t camera) {
    if (h < 0) return;
    lod_node_t* n = &t->nodes[h];

    const double dist    = node_distance_m(t, n, camera);
    const double arc     = node_arc_m(t, n);
    const double split_d = arc * (double)LOD_SPLIT_FACTOR;
    const double merge_d = split_d * (double)MERGE_HYSTERESIS;

    const bool is_leaf = (n->children[0] < 0);

    if (is_leaf) {
        /* Consider splitting. Don't split below configured max depth. */
        if (n->depth < t->body->max_lod_depth && dist < split_d) {
            split_node(t, h);
            for (int i = 0; i < 4; ++i) update_node(t, n->children[i], camera);
        }
        return;
    }

    /* Non-leaf: consider merging only if all children are still leaves.
     * Merging a node with deeper descendants would cascade-drop a lot
     * of GPU data in one frame; we prefer to let the tree settle. */
    if (children_all_leaves(t, n) && dist > merge_d) {
        merge_node(t, h);
        return;
    }

    /* Otherwise recurse. */
    for (int i = 0; i < 4; ++i) update_node(t, n->children[i], camera);
}

/* ----------------------------------------------------------------------- */

lod_tree_t* lod_tree_create(const body_config_t* body) {
    icosa_init();
    lod_tree_t* t = (lod_tree_t*)calloc(1, sizeof(lod_tree_t));
    t->body = body;

    /* Angular radius per depth. Root face's angular radius on the unit
     * sphere is ~0.5536 rad (~31.7 degrees). Aperture-4 subdivision
     * halves edge length each step, so the angular radius also halves.
     * Pre-multiplying by body->radius_m happens in node_arc_m. */
    const float root_arc = 0.5536f;
    for (int d = 0; d <= LOD_MAX_DEPTH; ++d) {
        t->depth_arc[d] = root_arc / (float)(1 << d);
    }

    /* Root: one node per icosahedron face. */
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
        compute_node_geometry(t, n);
    }
    return t;
}

void lod_tree_destroy(lod_tree_t* t) { free(t); }

/* ----------------------------------------------------------------------- */

int lod_tree_update(lod_tree_t* t, dvec3_t camera_world) {
    /* Walk from each root face, split/merge as appropriate. */
    for (int i = 0; i < MAX_NODES; ++i) {
        if (!t->used[i]) continue;
        if (t->nodes[i].depth != 0) continue;
        update_node(t, (lod_node_handle)i, camera_world);
    }

    /* Collect visible leaves. */
    t->visible_count = 0;
    for (int i = 0; i < MAX_NODES && t->visible_count < MAX_NODES; ++i) {
        if (!t->used[i]) continue;
        lod_node_t* n = &t->nodes[i];
        if (n->suppressed) continue;
        /* Leaf = no children. */
        bool is_leaf = true;
        for (int k = 0; k < 4; ++k) if (n->children[k] >= 0) { is_leaf = false; break; }
        if (!is_leaf) continue;
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
    const double arc_limit = bubble_radius_m / t->body->radius_m;
    const double cos_limit = cos(arc_limit);
    dvec3_t bn = dvec3_normalize(bubble_center);
    for (int i = 0; i < MAX_NODES; ++i) {
        if (!t->used[i]) continue;
        lod_node_t* n = &t->nodes[i];
        n->suppressed = (dvec3_dot(n->center, bn) > cos_limit);
    }
}
