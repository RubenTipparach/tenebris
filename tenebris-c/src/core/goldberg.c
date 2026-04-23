#include "core/goldberg.h"
#include <stdlib.h>
#include <string.h>
#include <math.h>

/*
 * Port of src/planet/GoldbergPolyhedron.ts, adapted to flat C arrays
 * and without the THREE.js dependency. The algorithm is identical:
 * icosahedron -> subdivide faces -> take dual (one tile per vertex,
 * corners = incident face centers, sorted CCW in the tangent plane).
 */

/* ----------------------------------------------------------------------- */
/* Temporary triangle-mesh representation used during construction. */

typedef struct {
    dvec3_t* v;
    int      count;
    int      cap;
} vertlist_t;

typedef struct {
    int a, b, c;
} face_t;

typedef struct {
    face_t* f;
    int     count;
    int     cap;
} facelist_t;

static void vertlist_init(vertlist_t* l) { memset(l, 0, sizeof(*l)); }
static void vertlist_free(vertlist_t* l) { free(l->v); memset(l, 0, sizeof(*l)); }
static int  vertlist_push(vertlist_t* l, dvec3_t v) {
    if (l->count == l->cap) {
        l->cap = l->cap ? l->cap * 2 : 64;
        l->v = (dvec3_t*)realloc(l->v, (size_t)l->cap * sizeof(dvec3_t));
    }
    l->v[l->count] = v;
    return l->count++;
}

static void facelist_init(facelist_t* l) { memset(l, 0, sizeof(*l)); }
static void facelist_free(facelist_t* l) { free(l->f); memset(l, 0, sizeof(*l)); }
static void facelist_push(facelist_t* l, face_t f) {
    if (l->count == l->cap) {
        l->cap = l->cap ? l->cap * 2 : 128;
        l->f = (face_t*)realloc(l->f, (size_t)l->cap * sizeof(face_t));
    }
    l->f[l->count++] = f;
}

/* ----------------------------------------------------------------------- */
/* Edge -> midpoint-vertex cache. Tiny open-addressing hashmap keyed by
 * the unordered pair (min,max). */

typedef struct {
    int64_t key;   /* (min<<32) | max */
    int     mid;
} edge_entry_t;

typedef struct {
    edge_entry_t* e;
    int           cap;
} edge_map_t;

static void edge_map_init(edge_map_t* m, int cap) {
    m->cap = cap;
    m->e = (edge_entry_t*)calloc((size_t)cap, sizeof(edge_entry_t));
    for (int i = 0; i < cap; ++i) m->e[i].key = -1;
}

static void edge_map_free(edge_map_t* m) { free(m->e); memset(m, 0, sizeof(*m)); }

static int edge_map_get_or_insert(edge_map_t* m, int a, int b,
                                  vertlist_t* vs) {
    int lo = a < b ? a : b;
    int hi = a < b ? b : a;
    int64_t key = ((int64_t)lo << 32) | (uint32_t)hi;
    int h = (int)((uint64_t)key * 2654435761U % (uint32_t)m->cap);
    for (int probe = 0; probe < m->cap; ++probe) {
        int idx = (h + probe) % m->cap;
        if (m->e[idx].key == key) return m->e[idx].mid;
        if (m->e[idx].key == -1) {
            /* Miss — insert midpoint. */
            dvec3_t va = vs->v[a], vb = vs->v[b];
            dvec3_t mid = dvec3_normalize(dvec3_scale(dvec3_add(va, vb), 0.5));
            int mid_idx = vertlist_push(vs, mid);
            m->e[idx].key = key;
            m->e[idx].mid = mid_idx;
            return mid_idx;
        }
    }
    /* Map full — shouldn't happen if we size it above the vertex count. */
    return -1;
}

/* ----------------------------------------------------------------------- */

static void build_icosahedron(vertlist_t* vs, facelist_t* fs) {
    const double t = (1.0 + sqrt(5.0)) / 2.0;
    const double n = 1.0 / sqrt(1.0 + t * t);
    const double T = t * n;
    const dvec3_t V[12] = {
        {-n,  T, 0}, { n,  T, 0}, {-n, -T, 0}, { n, -T, 0},
        { 0, -n,  T}, { 0,  n,  T}, { 0, -n, -T}, { 0,  n, -T},
        { T, 0, -n}, { T, 0,  n}, {-T, 0, -n}, {-T, 0,  n},
    };
    for (int i = 0; i < 12; ++i) vertlist_push(vs, V[i]);

    static const face_t F[20] = {
        {0,11,5},{0,5,1},{0,1,7},{0,7,10},{0,10,11},
        {1,5,9},{5,11,4},{11,10,2},{10,7,6},{7,1,8},
        {3,9,4},{3,4,2},{3,2,6},{3,6,8},{3,8,9},
        {4,9,5},{2,4,11},{6,2,10},{8,6,7},{9,8,1},
    };
    for (int i = 0; i < 20; ++i) facelist_push(fs, F[i]);
}

static void subdivide(vertlist_t* vs, facelist_t* fs) {
    /* Each face (a,b,c) becomes four: (a,ab,ca), (b,bc,ab), (c,ca,bc),
     * (ab,bc,ca). Midpoints are shared via the edge cache. */
    edge_map_t cache;
    /* Expected new vertex count = existing edges = 3F/2. Size map 4x
     * for low collision rate. */
    edge_map_init(&cache, fs->count * 6 + 64);

    facelist_t out;
    facelist_init(&out);
    for (int i = 0; i < fs->count; ++i) {
        face_t f = fs->f[i];
        int ab = edge_map_get_or_insert(&cache, f.a, f.b, vs);
        int bc = edge_map_get_or_insert(&cache, f.b, f.c, vs);
        int ca = edge_map_get_or_insert(&cache, f.c, f.a, vs);
        facelist_push(&out, (face_t){ f.a, ab, ca });
        facelist_push(&out, (face_t){ f.b, bc, ab });
        facelist_push(&out, (face_t){ f.c, ca, bc });
        facelist_push(&out, (face_t){ ab,  bc, ca });
    }
    edge_map_free(&cache);
    free(fs->f);
    *fs = out;
}

/* ----------------------------------------------------------------------- */

struct goldberg_s {
    goldberg_tile_t* tiles;
    int              count;
};

/* Sort a tile's corners CCW around its center in the local tangent
 * plane. Matches the JS sortVerticesCircular behavior. */
static void sort_corners_ccw(dvec3_t* verts, int n, dvec3_t center) {
    dvec3_t normal = dvec3_normalize(center);
    dvec3_t tangent = (fabs(normal.x) > 0.9) ? dvec3_make(0, 1, 0) : dvec3_make(1, 0, 0);
    dvec3_t bitangent = dvec3_normalize(dvec3_cross(normal, tangent));
    tangent = dvec3_normalize(dvec3_cross(bitangent, normal));

    double angles[GOLDBERG_MAX_VERTS_PER_TILE];
    for (int i = 0; i < n; ++i) {
        dvec3_t d = dvec3_sub(verts[i], center);
        double x = dvec3_dot(d, tangent);
        double y = dvec3_dot(d, bitangent);
        angles[i] = atan2(y, x);
    }
    /* Insertion sort (n<=6). */
    for (int i = 1; i < n; ++i) {
        double a = angles[i];
        dvec3_t v = verts[i];
        int j = i - 1;
        while (j >= 0 && angles[j] > a) {
            angles[j+1] = angles[j];
            verts[j+1]  = verts[j];
            j--;
        }
        angles[j+1] = a;
        verts[j+1]  = v;
    }
}

goldberg_t* goldberg_create(int subdivisions) {
    vertlist_t vs; facelist_t fs;
    vertlist_init(&vs);
    facelist_init(&fs);
    build_icosahedron(&vs, &fs);
    for (int i = 0; i < subdivisions; ++i) subdivide(&vs, &fs);

    /* vertex -> list of incident face indices, vertex -> set of neighbor verts */
    int V = vs.count;
    int* vf_count  = (int*)calloc((size_t)V, sizeof(int));
    int* vn_count  = (int*)calloc((size_t)V, sizeof(int));
    int (*vf)[GOLDBERG_MAX_VERTS_PER_TILE] =
        (int (*)[GOLDBERG_MAX_VERTS_PER_TILE])calloc((size_t)V, sizeof(*vf));
    int (*vn)[GOLDBERG_MAX_NEIGHBORS] =
        (int (*)[GOLDBERG_MAX_NEIGHBORS])calloc((size_t)V, sizeof(*vn));

    for (int fi = 0; fi < fs.count; ++fi) {
        face_t f = fs.f[fi];
        int verts[3] = { f.a, f.b, f.c };
        for (int i = 0; i < 3; ++i) {
            int v = verts[i];
            if (vf_count[v] < GOLDBERG_MAX_VERTS_PER_TILE) {
                vf[v][vf_count[v]++] = fi;
            }
            for (int j = 0; j < 3; ++j) {
                if (i == j) continue;
                int nb = verts[j];
                bool seen = false;
                for (int k = 0; k < vn_count[v]; ++k) if (vn[v][k] == nb) { seen = true; break; }
                if (!seen && vn_count[v] < GOLDBERG_MAX_NEIGHBORS) {
                    vn[v][vn_count[v]++] = nb;
                }
            }
        }
    }

    /* Face centers (projected back to unit sphere). */
    dvec3_t* face_centers = (dvec3_t*)calloc((size_t)fs.count, sizeof(dvec3_t));
    for (int fi = 0; fi < fs.count; ++fi) {
        face_t f = fs.f[fi];
        dvec3_t c = dvec3_scale(
            dvec3_add(dvec3_add(vs.v[f.a], vs.v[f.b]), vs.v[f.c]),
            1.0 / 3.0);
        face_centers[fi] = dvec3_normalize(c);
    }

    goldberg_t* g = (goldberg_t*)calloc(1, sizeof(goldberg_t));
    g->count = V;
    g->tiles = (goldberg_tile_t*)calloc((size_t)V, sizeof(goldberg_tile_t));

    for (int v = 0; v < V; ++v) {
        goldberg_tile_t* t = &g->tiles[v];
        t->index = v;
        t->center = vs.v[v];   /* already on unit sphere */
        t->num_verts = (int8_t)vf_count[v];
        t->num_neighbors = (int8_t)vn_count[v];
        t->is_pentagon = (vf_count[v] == 5);
        for (int k = 0; k < vf_count[v]; ++k) {
            t->verts[k] = face_centers[vf[v][k]];
        }
        sort_corners_ccw(t->verts, vf_count[v], t->center);
        for (int k = 0; k < vn_count[v]; ++k) t->neighbors[k] = vn[v][k];
    }

    free(vf); free(vn); free(vf_count); free(vn_count);
    free(face_centers);
    vertlist_free(&vs);
    facelist_free(&fs);
    return g;
}

void goldberg_destroy(goldberg_t* g) {
    if (!g) return;
    free(g->tiles);
    free(g);
}

int goldberg_tile_count(const goldberg_t* g) { return g->count; }

const goldberg_tile_t* goldberg_tile(const goldberg_t* g, int index) {
    if (index < 0 || index >= g->count) return NULL;
    return &g->tiles[index];
}

int goldberg_find_tile(const goldberg_t* g, dvec3_t unit_dir, int hint) {
    dvec3_t p = dvec3_normalize(unit_dir);
    if (hint < 0 || hint >= g->count) {
        int best = 0;
        double best_d2 = 1e30;
        for (int i = 0; i < g->count; ++i) {
            dvec3_t d = dvec3_sub(g->tiles[i].center, p);
            double dd = dvec3_dot(d, d);
            if (dd < best_d2) { best_d2 = dd; best = i; }
        }
        return best;
    }
    /* Greedy walk along neighbors toward the nearest tile. */
    int cur = hint;
    for (int iter = 0; iter < 64; ++iter) {
        dvec3_t cd = dvec3_sub(g->tiles[cur].center, p);
        double cur_d2 = dvec3_dot(cd, cd);
        int best = cur;
        double best_d2 = cur_d2;
        const goldberg_tile_t* t = &g->tiles[cur];
        for (int k = 0; k < t->num_neighbors; ++k) {
            int nb = t->neighbors[k];
            dvec3_t d = dvec3_sub(g->tiles[nb].center, p);
            double dd = dvec3_dot(d, d);
            if (dd < best_d2) { best_d2 = dd; best = nb; }
        }
        if (best == cur) return cur;
        cur = best;
    }
    return cur;
}
