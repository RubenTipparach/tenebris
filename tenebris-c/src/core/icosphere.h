#ifndef TENEBRIS_CORE_ICOSPHERE_H
#define TENEBRIS_CORE_ICOSPHERE_H

#include "core/math.h"
#include "core/planet.h"
#include <stdbool.h>
#include <stdint.h>

/*
 * Distance-split LOD tree built on top of an icosahedron. Each node is
 * a spherical triangle patch on the unit sphere. Patches subdivide into
 * 4 children when the camera gets close (split_factor * arc_length).
 *
 * This is the *coarse* representation — everything beyond the hex
 * bubble. Inside the bubble, hex_chunk takes over and these patches
 * are suppressed.
 */

typedef int32_t lod_node_handle;   /* index into the node pool, or -1 */

typedef struct {
    /* Sphere-space corners (unit vectors). The actual world-space
     * position is corner * planet.radius_m, applied in the mesher. */
    dvec3_t a, b, c;
    /* Center on the unit sphere (precomputed). */
    dvec3_t center;
    /* Angular radius in radians (precomputed; halves per depth). */
    float   angular_radius;

    int     depth;
    int8_t  root_face;        /* 0..19 */
    int8_t  child_index;      /* 0..3, or -1 for root */

    lod_node_handle parent;
    lod_node_handle children[4];

    bool    has_mesh;         /* GPU-resident */
    bool    suppressed;       /* hidden inside the hex bubble */
} lod_node_t;

typedef struct lod_tree_s lod_tree_t;

lod_tree_t* lod_tree_create(const body_config_t* body);
void        lod_tree_destroy(lod_tree_t* t);

/* Update split/merge state given the camera position (planet-space,
 * double precision). Returns the count of visible nodes. */
int  lod_tree_update(lod_tree_t* t, dvec3_t camera_world);

/* Iterate visible nodes (post-update). Caller does not own the pointer. */
int  lod_tree_visible_count(const lod_tree_t* t);
const lod_node_t* lod_tree_node(const lod_tree_t* t, int visible_index);

/* Suppress all nodes whose center lies within `bubble_radius` meters of
 * `bubble_center`. Called per-frame so the hex bubble does not get
 * over-drawn by the LOD tree. */
void lod_tree_apply_suppression(lod_tree_t* t, dvec3_t bubble_center, double bubble_radius_m);

#endif
