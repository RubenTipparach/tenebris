//! Port of `tenebris-c/src/core/goldberg.{c,h}`.
//!
//! Goldberg polyhedron - the true hex/pentagon sphere representation used
//! by Tenebris JS (see src/planet/GoldbergPolyhedron.ts).
//!
//! Construction:
//!   1. Start with an icosahedron (12 vertices, 20 faces).
//!   2. Subdivide each face N times (edge bisection + re-project).
//!   3. Take the dual: each original-mesh vertex becomes a tile whose
//!      corners are the centers of the faces meeting at that vertex.
//!
//! After N subdivisions the tile count is 10*4^N + 2 (12 pentagons at the
//! original icosahedron corners, rest are hexagons).
//!
//! Tile/cell indexing is identical to the C build: tile index == vertex
//! index in the subdivided icosphere, and midpoint vertices are appended
//! in face-iteration order during each subdivision pass. These indices
//! address voxel columns and appear in saves/wire data, so they must
//! never change.
//!
//! Renames (per PORTING.md rule 4 - module prefix dropped):
//! - `goldberg_t`                  -> `goldberg::Goldberg`
//! - `goldberg_tile_t`             -> `goldberg::Tile`
//! - `goldberg_create()`           -> `goldberg::create()`
//! - `goldberg_destroy()`          -> `Drop` (implicit; nothing to free by hand)
//! - `goldberg_tile_count()`       -> `Goldberg::tile_count()`
//! - `goldberg_tile()`             -> `Goldberg::tile()` (returns `Option`
//!                                    instead of NULL)
//! - `goldberg_find_tile()`        -> `Goldberg::find_tile()`
//! - `GOLDBERG_MAX_VERTS_PER_TILE` -> `MAX_VERTS_PER_TILE`
//! - `GOLDBERG_MAX_NEIGHBORS`      -> `MAX_NEIGHBORS`

use crate::math::{
    dvec3_add, dvec3_cross, dvec3_dot, dvec3_make, dvec3_normalize, dvec3_scale, dvec3_sub, DVec3,
};
use std::collections::HashMap;

pub const MAX_VERTS_PER_TILE: usize = 6;
pub const MAX_NEIGHBORS: usize = 6;

/// Port of `goldberg_tile_t`. Field names and widths unchanged.
#[derive(Clone, Copy, Debug)]
pub struct Tile {
    pub index: i32,
    /// On the unit sphere.
    pub center: DVec3,
    /// 5 or 6.
    pub num_verts: i8,
    /// Same as `num_verts`.
    pub num_neighbors: i8,
    pub is_pentagon: bool,
    /// CCW around center. Slots past `num_verts` are zeroed (C calloc).
    pub verts: [DVec3; MAX_VERTS_PER_TILE],
    /// Tile indices. Slots past `num_neighbors` are zeroed (C calloc).
    pub neighbors: [i32; MAX_NEIGHBORS],
    /// Edge-aligned neighbour table. `edge_neighbours[k]` is the tile
    /// across the edge spanning `verts[k] -> verts[(k+1)%num_verts]`.
    /// Built at construction time by best-angular-match between each
    /// edge midpoint direction and the per-neighbour direction-from-
    /// centre, so it's safe to index even though the `neighbors[]`
    /// array above carries no defined angular order. Corner k is
    /// touched by `edge_neighbours[(k-1+n)%n]` and `edge_neighbours[k]` -
    /// the two tiles that share that corner with this one. Used by
    /// the mesher to sample the air voxel ACROSS a given side face
    /// (rather than the air voxel above the column) and to drive per-
    /// corner smooth lighting on the cap.
    pub edge_neighbours: [i32; MAX_NEIGHBORS],
}

/* ----------------------------------------------------------------------- */
/* Temporary triangle-mesh representation used during construction. */

#[derive(Clone, Copy)]
struct Face {
    a: i32,
    b: i32,
    c: i32,
}

/* Edge -> midpoint-vertex cache, keyed by the unordered pair (min,max).
 * The C build uses a tiny open-addressing hashmap; a std HashMap is
 * behaviorally identical because midpoint vertices are appended to the
 * vertex list at first-lookup time, in face-iteration order - the hash
 * function only ever affected probe counts, never results. */
fn edge_get_or_insert(cache: &mut HashMap<i64, i32>, a: i32, b: i32, vs: &mut Vec<DVec3>) -> i32 {
    let lo = if a < b { a } else { b };
    let hi = if a < b { b } else { a };
    let key = ((lo as i64) << 32) | (hi as u32 as i64);
    if let Some(&mid) = cache.get(&key) {
        return mid;
    }
    /* Miss - insert midpoint. */
    let va = vs[a as usize];
    let vb = vs[b as usize];
    let mid = dvec3_normalize(dvec3_scale(dvec3_add(va, vb), 0.5));
    let mid_idx = vs.len() as i32;
    vs.push(mid);
    cache.insert(key, mid_idx);
    mid_idx
}

/* ----------------------------------------------------------------------- */

fn build_icosahedron(vs: &mut Vec<DVec3>, fs: &mut Vec<Face>) {
    let t = (1.0f64 + 5.0f64.sqrt()) / 2.0;
    let n = 1.0 / (1.0 + t * t).sqrt();
    let big_t = t * n;
    let v: [DVec3; 12] = [
        dvec3_make(-n, big_t, 0.0),
        dvec3_make(n, big_t, 0.0),
        dvec3_make(-n, -big_t, 0.0),
        dvec3_make(n, -big_t, 0.0),
        dvec3_make(0.0, -n, big_t),
        dvec3_make(0.0, n, big_t),
        dvec3_make(0.0, -n, -big_t),
        dvec3_make(0.0, n, -big_t),
        dvec3_make(big_t, 0.0, -n),
        dvec3_make(big_t, 0.0, n),
        dvec3_make(-big_t, 0.0, -n),
        dvec3_make(-big_t, 0.0, n),
    ];
    vs.extend_from_slice(&v);

    const F: [(i32, i32, i32); 20] = [
        (0, 11, 5),
        (0, 5, 1),
        (0, 1, 7),
        (0, 7, 10),
        (0, 10, 11),
        (1, 5, 9),
        (5, 11, 4),
        (11, 10, 2),
        (10, 7, 6),
        (7, 1, 8),
        (3, 9, 4),
        (3, 4, 2),
        (3, 2, 6),
        (3, 6, 8),
        (3, 8, 9),
        (4, 9, 5),
        (2, 4, 11),
        (6, 2, 10),
        (8, 6, 7),
        (9, 8, 1),
    ];
    for &(a, b, c) in F.iter() {
        fs.push(Face { a, b, c });
    }
}

fn subdivide(vs: &mut Vec<DVec3>, fs: &mut Vec<Face>) {
    /* Each face (a,b,c) becomes four: (a,ab,ca), (b,bc,ab), (c,ca,bc),
     * (ab,bc,ca). Midpoints are shared via the edge cache. */
    let mut cache: HashMap<i64, i32> = HashMap::new();

    let mut out: Vec<Face> = Vec::with_capacity(fs.len() * 4);
    for i in 0..fs.len() {
        let f = fs[i];
        let ab = edge_get_or_insert(&mut cache, f.a, f.b, vs);
        let bc = edge_get_or_insert(&mut cache, f.b, f.c, vs);
        let ca = edge_get_or_insert(&mut cache, f.c, f.a, vs);
        out.push(Face { a: f.a, b: ab, c: ca });
        out.push(Face { a: f.b, b: bc, c: ab });
        out.push(Face { a: f.c, b: ca, c: bc });
        out.push(Face { a: ab, b: bc, c: ca });
    }
    *fs = out;
}

/* ----------------------------------------------------------------------- */

/// Port of `goldberg_t` / `goldberg_s`.
pub struct Goldberg {
    tiles: Vec<Tile>,
}

/* Sort a tile's corners CCW around its center in the local tangent
 * plane. Matches the JS sortVerticesCircular behavior. */
fn sort_corners_ccw(verts: &mut [DVec3; MAX_VERTS_PER_TILE], n: usize, center: DVec3) {
    let normal = dvec3_normalize(center);
    let mut tangent = if normal.x.abs() > 0.9 {
        dvec3_make(0.0, 1.0, 0.0)
    } else {
        dvec3_make(1.0, 0.0, 0.0)
    };
    let bitangent = dvec3_normalize(dvec3_cross(normal, tangent));
    tangent = dvec3_normalize(dvec3_cross(bitangent, normal));

    let mut angles = [0.0f64; MAX_VERTS_PER_TILE];
    for i in 0..n {
        let d = dvec3_sub(verts[i], center);
        let x = dvec3_dot(d, tangent);
        let y = dvec3_dot(d, bitangent);
        angles[i] = y.atan2(x);
    }
    /* Insertion sort (n<=6), replicated exactly from the C build so tie
     * handling (strict `>` comparison) matches. */
    for i in 1..n {
        let a = angles[i];
        let v = verts[i];
        let mut j = i as isize - 1;
        while j >= 0 && angles[j as usize] > a {
            angles[(j + 1) as usize] = angles[j as usize];
            verts[(j + 1) as usize] = verts[j as usize];
            j -= 1;
        }
        angles[(j + 1) as usize] = a;
        verts[(j + 1) as usize] = v;
    }
}

/// Port of `goldberg_create()`. Build a Goldberg polyhedron at unit
/// radius (radius-scaled later by the caller via `tile.center * radius`).
/// `subdivisions` = number of subdivisions.
pub fn create(subdivisions: i32) -> Goldberg {
    let mut vs: Vec<DVec3> = Vec::new();
    let mut fs: Vec<Face> = Vec::new();
    build_icosahedron(&mut vs, &mut fs);
    for _ in 0..subdivisions {
        subdivide(&mut vs, &mut fs);
    }

    /* vertex -> list of incident face indices, vertex -> set of neighbor verts */
    let v_count = vs.len();
    let mut vf_count = vec![0usize; v_count];
    let mut vn_count = vec![0usize; v_count];
    let mut vf = vec![[0i32; MAX_VERTS_PER_TILE]; v_count];
    let mut vn = vec![[0i32; MAX_NEIGHBORS]; v_count];

    for fi in 0..fs.len() {
        let f = fs[fi];
        let verts = [f.a, f.b, f.c];
        for i in 0..3 {
            let v = verts[i] as usize;
            if vf_count[v] < MAX_VERTS_PER_TILE {
                vf[v][vf_count[v]] = fi as i32;
                vf_count[v] += 1;
            }
            for j in 0..3 {
                if i == j {
                    continue;
                }
                let nb = verts[j];
                let mut seen = false;
                for k in 0..vn_count[v] {
                    if vn[v][k] == nb {
                        seen = true;
                        break;
                    }
                }
                if !seen && vn_count[v] < MAX_NEIGHBORS {
                    vn[v][vn_count[v]] = nb;
                    vn_count[v] += 1;
                }
            }
        }
    }

    /* Face centers (projected back to unit sphere). */
    let mut face_centers: Vec<DVec3> = Vec::with_capacity(fs.len());
    for fi in 0..fs.len() {
        let f = fs[fi];
        let c = dvec3_scale(
            dvec3_add(dvec3_add(vs[f.a as usize], vs[f.b as usize]), vs[f.c as usize]),
            1.0 / 3.0,
        );
        face_centers.push(dvec3_normalize(c));
    }

    let mut tiles: Vec<Tile> = Vec::with_capacity(v_count);
    for v in 0..v_count {
        let mut t = Tile {
            index: v as i32,
            center: vs[v], /* already on unit sphere */
            num_verts: vf_count[v] as i8,
            num_neighbors: vn_count[v] as i8,
            is_pentagon: vf_count[v] == 5,
            verts: [DVec3::default(); MAX_VERTS_PER_TILE],
            neighbors: [0; MAX_NEIGHBORS],
            edge_neighbours: [0; MAX_NEIGHBORS],
        };
        for k in 0..vf_count[v] {
            t.verts[k] = face_centers[vf[v][k] as usize];
        }
        sort_corners_ccw(&mut t.verts, vf_count[v], t.center);
        for k in 0..vn_count[v] {
            t.neighbors[k] = vn[v][k];
        }

        /* Edge-aligned neighbour map. For each edge k (corner k ->
         * corner k+1), pick the neighbour whose direction-from-centre
         * best aligns with the edge midpoint direction. The neighbour
         * sits "across" that edge - tangent vectors from this tile
         * toward a neighbouring tile are perpendicular to their shared
         * edge, but since both centres lie on the unit sphere we can
         * use the chord direction (neighbour.center - this.center) as
         * a proxy and still rank by dot product against the edge
         * midpoint. Worst-case mapping cost is 6 edges * 6 neighbours
         * = 36 dot products per tile, one-shot at construction. */
        let n = vf_count[v];
        for k in 0..n {
            let mid = dvec3_scale(dvec3_add(t.verts[k], t.verts[(k + 1) % n]), 0.5);
            let edge_dir = dvec3_normalize(dvec3_sub(mid, t.center));
            let mut best: i32 = -1;
            let mut best_dot = -2.0f64;
            for i in 0..t.num_neighbors as usize {
                let ni = t.neighbors[i];
                let nd = dvec3_normalize(dvec3_sub(vs[ni as usize], t.center));
                let d = nd.x * edge_dir.x + nd.y * edge_dir.y + nd.z * edge_dir.z;
                if d > best_dot {
                    best_dot = d;
                    best = ni;
                }
            }
            t.edge_neighbours[k] = best;
        }

        tiles.push(t);
    }

    Goldberg { tiles }
}

impl Goldberg {
    /// Port of `goldberg_tile_count()`.
    pub fn tile_count(&self) -> i32 {
        self.tiles.len() as i32
    }

    /// Port of `goldberg_tile()`. Returns `None` where the C build
    /// returned NULL (index out of range).
    pub fn tile(&self, index: i32) -> Option<&Tile> {
        if index < 0 || index >= self.tiles.len() as i32 {
            return None;
        }
        Some(&self.tiles[index as usize])
    }

    /// Port of `goldberg_find_tile()`. Spatial lookup: find the tile
    /// whose center is closest to `unit_dir` (must be a unit vector).
    /// `hint` can be -1 for a bootstrap walk from tile 0, or an
    /// adjacent tile index for a fast greedy walk - O(radius) in tiles.
    /// Returns a tile index.
    pub fn find_tile(&self, unit_dir: DVec3, hint: i32) -> i32 {
        let p = dvec3_normalize(unit_dir);
        let mut hint = hint;
        if hint < 0 || hint >= self.tiles.len() as i32 {
            /* No usable hint - bootstrap the greedy walk from tile 0
             * instead of doing a full linear scan. The Goldberg
             * neighbourhood graph is well-connected (5-6 neighbours per
             * tile), so the loop below converges in O(log N) hops on
             * the unit sphere. The old full-scan fallback was the
             * proximate cause of the "framerate tanks in space" bug:
             * interact.c's raycast called this 32 times per frame with
             * a stale -1 hint when the player was outside any voxel
             * column, meaning 32 x 163k = 5.2 M distance comparisons
             * per frame. */
            hint = 0;
        }
        /* Greedy walk along neighbors toward the nearest tile. The walk
         * strictly decreases distance every hop, so it terminates at the
         * true nearest tile; the iteration cap is only a cycle guard for
         * float-tie pathologies and MUST exceed the sphere's graph
         * diameter (~O(sqrt N) tiles). The C tree capped this at 64,
         * which SILENTLY RETURNED A WRONG TILE whenever the walk had to
         * cross more than 64 tiles - on the 163k-tile production world a
         * -1 (bootstrap-from-0) or stale hint landed ~64 tiles from the
         * pole, which is what teleported players to the north pole via
         * the voxel-containment resolve and seated animals on wrong-tile
         * floors ("walking in the air"). Deliberate departure from the C
         * (the fix ports Rust-side per repo rules). */
        let max_hops = self.tiles.len() + 8;
        let mut cur = hint;
        for _ in 0..max_hops {
            let cd = dvec3_sub(self.tiles[cur as usize].center, p);
            let cur_d2 = dvec3_dot(cd, cd);
            let mut best = cur;
            let mut best_d2 = cur_d2;
            let t = &self.tiles[cur as usize];
            for k in 0..t.num_neighbors as usize {
                let nb = t.neighbors[k];
                let d = dvec3_sub(self.tiles[nb as usize].center, p);
                let dd = dvec3_dot(d, d);
                if dd < best_d2 {
                    best_d2 = dd;
                    best = nb;
                }
            }
            if best == cur {
                return cur;
            }
            cur = best;
        }
        cur
    }
}

/* ----------------------------------------------------------------------- */

#[cfg(test)]
mod tests {
    use super::*;
    use crate::math::dvec3_make;

    /* All concrete pins below were generated by compiling
     * tenebris-c/src/core/goldberg.c + math.c with gcc 13.2 and printing
     * with %.17g (round-trip exact for f64), so equality asserts are
     * bit-exact. */

    fn assert_dvec3_exact(v: DVec3, x: f64, y: f64, z: f64) {
        assert_eq!(v.x, x);
        assert_eq!(v.y, y);
        assert_eq!(v.z, z);
    }

    #[test]
    fn tile_counts_match_formula() {
        /* 10*4^N + 2 for the subdivision range actually used by
         * planet.c (3..=7; pin 0..=4 here, higher levels follow by the
         * same recursion). */
        let expected = [12, 42, 162, 642, 2562];
        for (s, &want) in expected.iter().enumerate() {
            let g = create(s as i32);
            assert_eq!(g.tile_count(), want, "subdiv {}", s);
        }
    }

    #[test]
    fn exactly_12_pentagons_and_they_are_the_icosa_corners() {
        for s in 0..=4 {
            let g = create(s);
            let mut pent = 0;
            for i in 0..g.tile_count() {
                let t = g.tile(i).unwrap();
                if t.is_pentagon {
                    pent += 1;
                    /* The 12 pentagons sit at the original icosahedron
                     * vertices, which are always indices 0..12. */
                    assert!(i < 12, "pentagon at unexpected index {}", i);
                    assert_eq!(t.num_verts, 5);
                } else {
                    assert_eq!(t.num_verts, 6);
                }
                assert_eq!(t.index, i);
                assert_eq!(t.num_verts, t.num_neighbors);
            }
            assert_eq!(pent, 12, "subdiv {}", s);
        }
    }

    #[test]
    fn edge_neighbours_are_drawn_from_neighbors() {
        let g = create(3);
        for i in 0..g.tile_count() {
            let t = g.tile(i).unwrap();
            let n = t.num_verts as usize;
            for k in 0..n {
                let en = t.edge_neighbours[k];
                assert!(
                    t.neighbors[..t.num_neighbors as usize].contains(&en),
                    "tile {} edge {} -> {} not a neighbour",
                    i,
                    k,
                    en
                );
            }
        }
    }

    #[test]
    fn tile_out_of_range_is_none() {
        let g = create(0);
        assert!(g.tile(-1).is_none());
        assert!(g.tile(12).is_none());
        assert!(g.tile(0).is_some());
        assert!(g.tile(11).is_some());
    }

    #[test]
    fn pin_subdiv3_tile_0() {
        let g = create(3);
        let t = g.tile(0).unwrap();
        assert_dvec3_exact(t.center, -0.52573111211913359, 0.85065080835203999, 0.0);
        assert_eq!(t.num_verts, 5);
        assert_eq!(t.num_neighbors, 5);
        assert!(t.is_pentagon);
        assert_dvec3_exact(t.verts[0], -0.58778318401383567, 0.80901849706329776, 0.0);
        assert_dvec3_exact(
            t.verts[1],
            -0.5438920563631553,
            0.83614470575597855,
            0.07101733634336109,
        );
        assert_dvec3_exact(
            t.verts[2],
            -0.47287472001979419,
            0.88003583340665881,
            0.043891127650680324,
        );
        assert_dvec3_exact(
            t.verts[3],
            -0.47287472001979419,
            0.88003583340665881,
            -0.043891127650680324,
        );
        assert_dvec3_exact(
            t.verts[4],
            -0.5438920563631553,
            0.83614470575597877,
            -0.071017336343361104,
        );
        assert_eq!(&t.neighbors[..5], &[162, 164, 193, 219, 245]);
        assert_eq!(&t.edge_neighbours[..5], &[162, 164, 193, 219, 245]);
    }

    #[test]
    fn pin_subdiv3_tile_11() {
        let g = create(3);
        let t = g.tile(11).unwrap();
        assert_dvec3_exact(t.center, -0.85065080835203999, 0.0, 0.52573111211913359);
        assert_eq!(t.num_verts, 5);
        assert!(t.is_pentagon);
        assert_dvec3_exact(
            t.verts[0],
            -0.88003583340665881,
            -0.043891127650680324,
            0.47287472001979419,
        );
        assert_dvec3_exact(
            t.verts[1],
            -0.83614470575597877,
            -0.071017336343361104,
            0.5438920563631553,
        );
        assert_dvec3_exact(t.verts[2], -0.80901849706329776, 0.0, 0.58778318401383567);
        assert_dvec3_exact(
            t.verts[3],
            -0.83614470575597855,
            0.07101733634336109,
            0.5438920563631553,
        );
        assert_dvec3_exact(
            t.verts[4],
            -0.88003583340665881,
            0.043891127650680324,
            0.47287472001979419,
        );
        assert_eq!(&t.neighbors[..5], &[171, 173, 283, 325, 345]);
        assert_eq!(&t.edge_neighbours[..5], &[345, 325, 171, 173, 283]);
    }

    #[test]
    fn pin_subdiv3_tile_12() {
        let g = create(3);
        let t = g.tile(12).unwrap();
        assert_dvec3_exact(t.center, -0.80901699437494745, 0.5, 0.3090169943749474);
        assert_eq!(t.num_verts, 6);
        assert_eq!(t.num_neighbors, 6);
        assert!(!t.is_pentagon);
        assert_dvec3_exact(
            t.verts[0],
            -0.85103642785636935,
            0.42479348359035835,
            0.30868672592231516,
        );
        assert_dvec3_exact(
            t.verts[1],
            -0.80651942666645537,
            0.4523065034029447,
            0.38071674692481539,
        );
        assert_dvec3_exact(
            t.verts[2],
            -0.76125355137689166,
            0.52554278432833423,
            0.37986551877801705,
        );
        assert_dvec3_exact(
            t.verts[3],
            -0.76099322932526003,
            0.57149563542072956,
            0.30705381224822614,
        );
        assert_dvec3_exact(
            t.verts[4],
            -0.80551023051517401,
            0.54398261560814309,
            0.23502379124572589,
        );
        assert_dvec3_exact(
            t.verts[5],
            -0.85034608758550045,
            0.47048056880748335,
            0.23571076704855742,
        );
        assert_eq!(&t.neighbors[..6], &[165, 167, 177, 179, 274, 284]);
        assert_eq!(&t.edge_neighbours[..6], &[177, 179, 165, 167, 274, 284]);
    }

    #[test]
    fn pin_subdiv3_tile_100() {
        let g = create(3);
        let t = g.tile(100).unwrap();
        assert_dvec3_exact(t.center, 0.0, 0.27326652891267172, -0.96193835778391756);
        assert_eq!(t.num_verts, 6);
        assert!(!t.is_pentagon);
        assert_dvec3_exact(
            t.verts[0],
            -0.088480694004026861,
            0.28493804074307799,
            -0.95445349793798839,
        );
        assert_dvec3_exact(
            t.verts[1],
            -0.044043341447573318,
            0.34619386191963669,
            -0.93712858991885417,
        );
        assert_dvec3_exact(
            t.verts[2],
            0.044043341447573332,
            0.34619386191963675,
            -0.93712858991885417,
        );
        assert_dvec3_exact(
            t.verts[3],
            0.088480694004026861,
            0.28493804074307799,
            -0.95445349793798839,
        );
        assert_dvec3_exact(
            t.verts[4],
            0.044423788705241794,
            0.21120419458378586,
            -0.97643193064713218,
        );
        assert_dvec3_exact(
            t.verts[5],
            -0.044423788705241794,
            0.21120419458378586,
            -0.97643193064713218,
        );
        assert_eq!(&t.neighbors[..6], &[378, 377, 381, 380, 616, 619]);
        assert_eq!(&t.edge_neighbours[..6], &[378, 377, 616, 619, 381, 380]);
    }

    #[test]
    fn pin_subdiv3_tile_641() {
        let g = create(3);
        let t = g.tile(641).unwrap();
        assert_dvec3_exact(t.center, 0.91298249293229916, 0.39960705170185118, 0.082323580031960164);
        assert_eq!(t.num_verts, 6);
        assert!(!t.is_pentagon);
        assert_dvec3_exact(
            t.verts[0],
            0.94686421078805472,
            0.31101545146375315,
            0.081960693503116938,
        );
        assert_dvec3_exact(t.verts[1], 0.93417235896271567, 0.35682208977308993, 0.0);
        assert_dvec3_exact(t.verts[2], 0.89620971646161574, 0.44363063929330904, 0.0);
        assert_dvec3_exact(
            t.verts[3],
            0.87163982799671147,
            0.48358651545040232,
            0.079925542377896119,
        );
        assert_dvec3_exact(
            t.verts[4],
            0.88519731643611388,
            0.43689728803944211,
            0.15983263333275602,
        );
        assert_dvec3_exact(
            t.verts[5],
            0.922266340669192,
            0.35104458454197141,
            0.16184096061384673,
        );
        assert_eq!(&t.neighbors[..6], &[159, 628, 161, 635, 640, 639]);
        assert_eq!(&t.edge_neighbours[..6], &[639, 640, 161, 635, 628, 159]);
    }

    #[test]
    fn pin_find_tile() {
        let g = create(3);
        let d1 = dvec3_normalize(dvec3_make(0.3, -0.7, 0.648));
        let d2 = dvec3_normalize(dvec3_make(-1.0, 2.0, -3.0));
        let d3 = dvec3_make(0.0, 1.0, 0.0);
        assert_eq!(g.find_tile(d1, -1), 444);
        assert_eq!(g.find_tile(d2, -1), 252);
        assert_eq!(g.find_tile(d3, -1), 16);
        /* Hinted walk from a far-away tile converges to the same answer. */
        assert_eq!(g.find_tile(d1, 500), 444);
    }

    #[test]
    fn find_tile_returns_global_nearest() {
        /* The greedy walk should land on the brute-force argmin for
         * well-spread test directions. */
        let g = create(3);
        let dirs = [
            dvec3_normalize(dvec3_make(0.3, -0.7, 0.648)),
            dvec3_normalize(dvec3_make(-1.0, 2.0, -3.0)),
            dvec3_make(0.0, 1.0, 0.0),
            dvec3_normalize(dvec3_make(1.0, 1.0, 1.0)),
            dvec3_normalize(dvec3_make(-0.2, -0.9, 0.1)),
        ];
        for d in dirs {
            let mut best = 0;
            let mut best_d2 = f64::MAX;
            for i in 0..g.tile_count() {
                let cd = dvec3_sub(g.tile(i).unwrap().center, d);
                let d2 = dvec3_dot(cd, cd);
                if d2 < best_d2 {
                    best_d2 = d2;
                    best = i;
                }
            }
            assert_eq!(g.find_tile(d, -1), best);
        }
    }

    /// Regression: the greedy walk must converge on grids whose graph
    /// diameter exceeds the old 64-hop cap (production Tenebris is
    /// 163k tiles). With the cap, a -1 hint bootstraps from tile 0 and
    /// silently returned a tile ~64 hops out - the root cause of the
    /// "teleported to the north pole" containment jumps and animals
    /// seated on wrong-tile floors ("walking in the air").
    #[test]
    fn find_tile_converges_across_large_grids() {
        let g = create(6); /* 40k+ tiles, diameter >> 64 hops */
        assert!(g.tile_count() > 40_000);
        /* The hardest case: the antipode of the bootstrap tile 0, plus
         * a spread of far directions. Verify against brute force. */
        let t0 = g.tile(0).unwrap().center;
        let dirs = [
            dvec3_normalize(dvec3_make(-t0.x, -t0.y, -t0.z)),
            dvec3_normalize(dvec3_make(0.7, -0.7, 0.14)),
            dvec3_normalize(dvec3_make(-0.9, 0.1, 0.4)),
        ];
        for d in dirs {
            let mut best = 0;
            let mut best_d2 = f64::MAX;
            for i in 0..g.tile_count() {
                let cd = dvec3_sub(g.tile(i).unwrap().center, d);
                let d2 = dvec3_dot(cd, cd);
                if d2 < best_d2 {
                    best_d2 = d2;
                    best = i;
                }
            }
            assert_eq!(g.find_tile(d, -1), best, "bootstrap walk converges");
            /* A far stale hint must converge too (the containment /
             * reseat paths carry hints across long moves). */
            assert_eq!(g.find_tile(d, 0), best, "stale-hint walk converges");
        }
    }
}
