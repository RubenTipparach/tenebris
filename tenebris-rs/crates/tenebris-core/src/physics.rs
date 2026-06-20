//! Port of `tenebris-c/src/core/physics.{c,h}`.
//!
//! Spherical-surface capsule physics. Position is in planet world space
//! (double precision). Gravity always points along -normalize(position),
//! so "up" is radial. Movement input is interpreted in the tangent plane
//! at the player's foot position.
//!
//! Tier 1 stub - full hex-vs-capsule resolution lands once the chunk
//! pool + mesher are in place (we need world data to collide against).
//!
//! Renames (per PORTING.md rule 4 - module prefix dropped):
//! - `phys_body_t`         -> `physics::PhysBody`
//! - `phys_input_t`        -> `physics::PhysInput`
//! - `tangent_basis_t`     -> `physics::TangentBasis`
//! - `phys_tangent_basis()`-> `physics::tangent_basis()`
//! - `phys_init_body()`    -> `physics::init_body()`
//! - `phys_step()`         -> `physics::step()`. The C `void* world`
//!   chunk-pool handle becomes a generic `&mut W` so the future world
//!   type plugs in without physics depending on its definition.

use crate::math::{dvec3_cross, dvec3_make, dvec3_normalize, vec3_make, DVec3, Vec3};

/// Port of `phys_body_t`. Field names and widths unchanged.
#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub struct PhysBody {
    /// planet world space, double precision
    pub position: DVec3,
    /// tangent-frame, single precision
    pub velocity: Vec3,
    /// capsule horizontal half-extent
    pub radius: f32,
    /// capsule total height
    pub height: f32,
    pub grounded: bool,
}

/// Port of `phys_input_t`.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub struct PhysInput {
    pub forward: bool,
    pub backward: bool,
    pub left: bool,
    pub right: bool,
    pub jump: bool,
    pub sprint: bool,
    pub fly_up: bool,
    pub fly_down: bool,
    pub fly_mode: bool,
    /* Roll keys - Q/E in space mode. Held-state, not edge. */
    pub roll_left: bool,
    pub roll_right: bool,
}

/// Port of `tangent_basis_t`. Tangent basis at a position on the
/// sphere. up = radial out; fwd / right are arbitrary but stable as
/// the player moves.
#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub struct TangentBasis {
    pub up: DVec3,
    pub fwd: DVec3,
    pub right: DVec3,
}

/// Port of `phys_init_body()`.
pub fn init_body(b: &mut PhysBody, spawn: DVec3) {
    b.position = spawn;
    b.velocity = vec3_make(0.0, 0.0, 0.0);
    b.radius = 0.3;
    b.height = 1.8;
    b.grounded = false;
}

/// Port of `phys_tangent_basis()`.
pub fn tangent_basis(position: DVec3) -> TangentBasis {
    let up = dvec3_normalize(position);
    /* Pick a stable reference axis that isn't parallel to up. */
    let r#ref = if up.y.abs() < 0.9 {
        dvec3_make(0.0, 1.0, 0.0)
    } else {
        dvec3_make(1.0, 0.0, 0.0)
    };
    let right = dvec3_normalize(dvec3_cross(r#ref, up));
    let fwd = dvec3_normalize(dvec3_cross(up, right));
    TangentBasis { up, fwd, right }
}

/// Port of `phys_step()`. The `world` parameter is opaque to physics -
/// it's the chunk pool the resolver collides against (generic here
/// where the C header used `void*`).
///
/// Tier 1 stub: capsule-vs-hex resolution lands next commit, once the
/// chunk pool exists for it to collide against. For now we advance
/// freely and let the player fly.
pub fn step<W: ?Sized>(_world: &mut W, _body: &mut PhysBody, _input: PhysInput, _yaw: f32, _dt: f32) {
}

#[cfg(test)]
mod tests {
    use super::*;

    /* Pinned values generated from the C source of truth (physics.c +
     * math.c compiled with gcc -O2, x86-64/SSE2) and dumped as f64 bit
     * patterns. Comparisons are bit-exact - including signed zeros. */

    const PHYS_POSITIONS: [(f64, f64, f64); 5] = [
        (0.0, 300.0, 0.0),
        (100.0, 50.0, -30.0),
        (3.0, 4.0, 0.0),
        (-5.0, -1.0, 2.0),
        (0.0, -10.0, 0.0),
    ];

    // up/fwd/right xyz f64 bits per position
    const BASIS_PINS: [[u64; 9]; 5] = [
        [0x0000000000000000, 0x3ff0000000000000, 0x0000000000000000,
         0x3ff0000000000000, 0x0000000000000000, 0x0000000000000000,
         0x0000000000000000, 0x0000000000000000, 0x3ff0000000000000],
        [0x3feba4cf657d680e, 0x3fdba4cf657d680e, 0xbfd0961609b1a4d5,
         0xbfda7a5ad232d057, 0x3fecdc681d6fb503, 0x3fbfc60695d6939b,
         0xbfd263e862c542d4, 0x0000000000000000, 0xbfeea6834f48c4b7],
        [0x3fe3333333333334, 0x3fe999999999999a, 0x0000000000000000,
         0xbfe999999999999a, 0x3fe3333333333334, 0x0000000000000000,
         0x0000000000000000, 0x0000000000000000, 0xbff0000000000000],
        [0xbfed363d1848dcbe, 0xbfc75e9746a0b098, 0x3fd75e9746a0b098,
         0xbfc5b2b23b9533ae, 0x3fef764f3ccb8af0, 0x3fb15bc1c9442958,
         0x3fd7c4dd663ebb88, 0x8000000000000000, 0x3fedb614bfce6a6a],
        [0x0000000000000000, 0xbff0000000000000, 0x0000000000000000,
         0x3ff0000000000000, 0x0000000000000000, 0x0000000000000000,
         0x0000000000000000, 0x0000000000000000, 0xbff0000000000000],
    ];

    #[test]
    fn tangent_basis_matches_c() {
        for (i, (x, y, z)) in PHYS_POSITIONS.iter().enumerate() {
            let tb = tangent_basis(dvec3_make(*x, *y, *z));
            let got = [
                tb.up.x.to_bits(),
                tb.up.y.to_bits(),
                tb.up.z.to_bits(),
                tb.fwd.x.to_bits(),
                tb.fwd.y.to_bits(),
                tb.fwd.z.to_bits(),
                tb.right.x.to_bits(),
                tb.right.y.to_bits(),
                tb.right.z.to_bits(),
            ];
            assert_eq!(got, BASIS_PINS[i], "position {}", i);
        }
    }

    #[test]
    fn tangent_basis_is_orthonormal_right_handed() {
        use crate::math::{dvec3_dot, dvec3_length, dvec3_sub};
        for (x, y, z) in PHYS_POSITIONS {
            let tb = tangent_basis(dvec3_make(x, y, z));
            assert!((dvec3_length(tb.up) - 1.0).abs() < 1e-12);
            assert!((dvec3_length(tb.fwd) - 1.0).abs() < 1e-12);
            assert!((dvec3_length(tb.right) - 1.0).abs() < 1e-12);
            assert!(dvec3_dot(tb.up, tb.fwd).abs() < 1e-12);
            assert!(dvec3_dot(tb.up, tb.right).abs() < 1e-12);
            assert!(dvec3_dot(tb.fwd, tb.right).abs() < 1e-12);
            /* right x fwd == up (consistent frame, matching the C
             * construction order fwd = up x right). */
            let cross = dvec3_cross(tb.right, tb.fwd);
            let d = dvec3_sub(cross, tb.up);
            assert!(d.x.abs() < 1e-12 && d.y.abs() < 1e-12 && d.z.abs() < 1e-12);
        }
    }

    #[test]
    fn init_body_matches_c() {
        /* C pin run: pos(1.5,-2.5,300) vel(0,0,0) radius 0.3 height 1.8
         * grounded 0. */
        let mut b = PhysBody::default();
        init_body(&mut b, dvec3_make(1.5, -2.5, 300.0));
        assert_eq!(b.position, dvec3_make(1.5, -2.5, 300.0));
        assert_eq!(b.velocity, vec3_make(0.0, 0.0, 0.0));
        assert_eq!(b.radius, 0.3);
        assert_eq!(b.height, 1.8);
        assert!(!b.grounded);
    }

    #[test]
    fn step_is_a_tier1_noop() {
        /* C pin run: after phys_step the body is bit-identical. */
        let mut b = PhysBody::default();
        init_body(&mut b, dvec3_make(1.5, -2.5, 300.0));
        let before = b;
        let input = PhysInput {
            forward: true,
            jump: true,
            ..PhysInput::default()
        };
        step(&mut (), &mut b, input, 1.25, 0.016);
        assert_eq!(b, before);
    }
}
