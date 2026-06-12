//! Port of `tenebris-c/src/client/gfx_math.{c,h}`.
//!
//! Column-major 4x4 matrices, matching what sokol_gfx + GLSL expect.
//! Client-only - the server never touches matrices so they stay out of
//! tenebris-core.
//!
//! Function names keep their C `mat4_` / `vec3_` type prefixes (they
//! are type prefixes, not the module prefix, so PORTING.md rule 4 does
//! not strip them). `mat4_t` -> `Mat4`; the element array stays `m`.
//!
//! Same algorithms, same f32 widths, same operation order as the C.

#![allow(dead_code)] // consumed by the renderer/player_ctrl waves of the port

use tenebris_core::math::{vec3_dot, vec3_normalize, vec3_sub, Vec3};

/// Port of `mat4_t`. Column-major: `m[col * 4 + row]`.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Mat4 {
    pub m: [f32; 16],
}

pub fn mat4_identity() -> Mat4 {
    let mut r = Mat4 { m: [0.0; 16] };
    r.m[0] = 1.0;
    r.m[5] = 1.0;
    r.m[10] = 1.0;
    r.m[15] = 1.0;
    r
}

pub fn mat4_mul(a: Mat4, b: Mat4) -> Mat4 {
    let mut r = Mat4 { m: [0.0; 16] };
    for c in 0..4 {
        for rr in 0..4 {
            let mut s = 0.0f32;
            for k in 0..4 {
                s += a.m[k * 4 + rr] * b.m[c * 4 + k];
            }
            r.m[c * 4 + rr] = s;
        }
    }
    r
}

pub fn mat4_translate(t: Vec3) -> Mat4 {
    let mut r = mat4_identity();
    r.m[12] = t.x;
    r.m[13] = t.y;
    r.m[14] = t.z;
    r
}

pub fn mat4_rotate_x(a: f32) -> Mat4 {
    let mut r = mat4_identity();
    let (c, s) = (a.cos(), a.sin());
    r.m[5] = c;
    r.m[6] = s;
    r.m[9] = -s;
    r.m[10] = c;
    r
}

pub fn mat4_rotate_y(a: f32) -> Mat4 {
    let mut r = mat4_identity();
    let (c, s) = (a.cos(), a.sin());
    r.m[0] = c;
    r.m[2] = -s;
    r.m[8] = s;
    r.m[10] = c;
    r
}

pub fn mat4_rotate_z(a: f32) -> Mat4 {
    let mut r = mat4_identity();
    let (c, s) = (a.cos(), a.sin());
    r.m[0] = c;
    r.m[1] = s;
    r.m[4] = -s;
    r.m[5] = c;
    r
}

pub fn mat4_perspective(fovy: f32, aspect: f32, zn: f32, zf: f32) -> Mat4 {
    let mut r = Mat4 { m: [0.0; 16] };
    let f = 1.0f32 / (fovy * 0.5f32).tan();
    r.m[0] = f / aspect;
    r.m[5] = f;
    r.m[10] = (zf + zn) / (zn - zf);
    r.m[11] = -1.0;
    r.m[14] = (2.0f32 * zf * zn) / (zn - zf);
    r
}

pub fn vec3_cross(a: Vec3, b: Vec3) -> Vec3 {
    Vec3 {
        x: a.y * b.z - a.z * b.y,
        y: a.z * b.x - a.x * b.z,
        z: a.x * b.y - a.y * b.x,
    }
}

pub fn mat4_look_at(eye: Vec3, target: Vec3, up: Vec3) -> Mat4 {
    let f = vec3_normalize(vec3_sub(target, eye));
    let s = vec3_normalize(vec3_cross(f, up));
    let u = vec3_cross(s, f);
    let mut r = mat4_identity();
    r.m[0] = s.x;
    r.m[4] = s.y;
    r.m[8] = s.z;
    r.m[1] = u.x;
    r.m[5] = u.y;
    r.m[9] = u.z;
    r.m[2] = -f.x;
    r.m[6] = -f.y;
    r.m[10] = -f.z;
    r.m[12] = -vec3_dot(s, eye);
    r.m[13] = -vec3_dot(u, eye);
    r.m[14] = vec3_dot(f, eye);
    r
}

/* Direction-input variant of mat4_look_at. Skips the `target - eye`
 * step - look_dir IS the forward direction. The caller is expected to
 * have built look_dir in doubles before casting to float so the
 * orientation columns don't pick up subtraction noise at large eye
 * magnitudes (planet centres at multiple km from world origin). The
 * eye position still goes into the translation column at float
 * precision, but its magnitude only shifts the world relative to the
 * camera - it doesn't affect which way the camera is pointing. */
pub fn mat4_look_at_dir(eye: Vec3, look_dir: Vec3, up: Vec3) -> Mat4 {
    let f = vec3_normalize(look_dir);
    let s = vec3_normalize(vec3_cross(f, up));
    let u = vec3_cross(s, f);
    let mut r = mat4_identity();
    r.m[0] = s.x;
    r.m[4] = s.y;
    r.m[8] = s.z;
    r.m[1] = u.x;
    r.m[5] = u.y;
    r.m[9] = u.z;
    r.m[2] = -f.x;
    r.m[6] = -f.y;
    r.m[10] = -f.z;
    r.m[12] = -vec3_dot(s, eye);
    r.m[13] = -vec3_dot(u, eye);
    r.m[14] = vec3_dot(f, eye);
    r
}

#[cfg(test)]
mod tests {
    use super::*;
    use tenebris_core::math::vec3_make;

    const EPS: f32 = 1e-6;

    fn assert_mat4_near(got: Mat4, want: [f32; 16], eps: f32) {
        for i in 0..16 {
            assert!(
                (got.m[i] - want[i]).abs() <= eps,
                "m[{}]: got {}, want {}",
                i,
                got.m[i],
                want[i]
            );
        }
    }

    #[test]
    fn identity_layout() {
        let i = mat4_identity();
        let mut want = [0.0f32; 16];
        want[0] = 1.0;
        want[5] = 1.0;
        want[10] = 1.0;
        want[15] = 1.0;
        assert_eq!(i.m, want);
    }

    #[test]
    fn mul_counting_matrices_pinned() {
        // a.m[i] = i + 1, b.m[i] = i + 1; product computed by hand with
        // the C loop r.m[c*4+rr] = sum_k a.m[k*4+rr] * b.m[c*4+k].
        let mut a = Mat4 { m: [0.0; 16] };
        let mut b = Mat4 { m: [0.0; 16] };
        for i in 0..16 {
            a.m[i] = (i + 1) as f32;
            b.m[i] = (i + 1) as f32;
        }
        let r = mat4_mul(a, b);
        let want: [f32; 16] = [
            90.0, 100.0, 110.0, 120.0, // column 0
            202.0, 228.0, 254.0, 280.0, // column 1
            314.0, 356.0, 398.0, 440.0, // column 2
            426.0, 484.0, 542.0, 600.0, // column 3
        ];
        assert_eq!(r.m, want); // exact: all values integer-representable in f32
    }

    #[test]
    fn mul_identity_is_neutral() {
        let mut a = Mat4 { m: [0.0; 16] };
        for i in 0..16 {
            a.m[i] = (i as f32) * 0.5 - 3.25;
        }
        assert_eq!(mat4_mul(mat4_identity(), a).m, a.m);
        assert_eq!(mat4_mul(a, mat4_identity()).m, a.m);
    }

    #[test]
    fn translate_column() {
        let t = mat4_translate(vec3_make(1.5, -2.0, 3.25));
        assert_eq!(t.m[12], 1.5);
        assert_eq!(t.m[13], -2.0);
        assert_eq!(t.m[14], 3.25);
        assert_eq!(t.m[15], 1.0);
        assert_eq!(t.m[0], 1.0);
        assert_eq!(t.m[5], 1.0);
        assert_eq!(t.m[10], 1.0);
        // composing translations adds the offsets (also exercises mul)
        let t2 = mat4_mul(t, mat4_translate(vec3_make(0.5, 2.0, -0.25)));
        assert_eq!(t2.m[12], 2.0);
        assert_eq!(t2.m[13], 0.0);
        assert_eq!(t2.m[14], 3.0);
    }

    #[test]
    fn rotate_x_pinned() {
        // a = pi/3: cos = 0.5, sin = sqrt(3)/2 ~= 0.8660254
        let r = mat4_rotate_x(std::f32::consts::FRAC_PI_3);
        let s = 0.8660254f32;
        let mut want = [0.0f32; 16];
        want[0] = 1.0;
        want[15] = 1.0;
        want[5] = 0.5;
        want[6] = s;
        want[9] = -s;
        want[10] = 0.5;
        assert_mat4_near(r, want, EPS);
    }

    #[test]
    fn rotate_y_pinned() {
        let r = mat4_rotate_y(std::f32::consts::FRAC_PI_3);
        let s = 0.8660254f32;
        let mut want = [0.0f32; 16];
        want[5] = 1.0;
        want[15] = 1.0;
        want[0] = 0.5;
        want[2] = -s;
        want[8] = s;
        want[10] = 0.5;
        assert_mat4_near(r, want, EPS);
    }

    #[test]
    fn rotate_z_pinned() {
        let r = mat4_rotate_z(std::f32::consts::FRAC_PI_3);
        let s = 0.8660254f32;
        let mut want = [0.0f32; 16];
        want[10] = 1.0;
        want[15] = 1.0;
        want[0] = 0.5;
        want[1] = s;
        want[4] = -s;
        want[5] = 0.5;
        assert_mat4_near(r, want, EPS);
    }

    #[test]
    fn perspective_pinned() {
        // fovy = pi/2 -> f = 1/tan(pi/4) = 1
        let p = mat4_perspective(std::f32::consts::FRAC_PI_2, 1.6, 0.1, 100.0);
        assert!((p.m[0] - 0.625).abs() <= EPS); // f / aspect
        assert!((p.m[5] - 1.0).abs() <= EPS);
        // (zf + zn) / (zn - zf) = 100.1 / -99.9
        assert!((p.m[10] - (-1.0020020)).abs() <= EPS);
        assert_eq!(p.m[11], -1.0);
        // (2 * zf * zn) / (zn - zf) = 20 / -99.9
        assert!((p.m[14] - (-0.20020020)).abs() <= EPS);
        // everything else stays zero
        for i in [1, 2, 3, 4, 6, 7, 8, 9, 12, 13, 15] {
            assert_eq!(p.m[i], 0.0, "m[{}]", i);
        }
    }

    #[test]
    fn cross_pinned() {
        // (1,2,3) x (4,5,6) = (-3, 6, -3)
        let c = vec3_cross(vec3_make(1.0, 2.0, 3.0), vec3_make(4.0, 5.0, 6.0));
        assert_eq!((c.x, c.y, c.z), (-3.0, 6.0, -3.0));
        // right-handed: x cross y = z
        let z = vec3_cross(vec3_make(1.0, 0.0, 0.0), vec3_make(0.0, 1.0, 0.0));
        assert_eq!((z.x, z.y, z.z), (0.0, 0.0, 1.0));
    }

    #[test]
    fn look_at_down_negative_z() {
        // eye at +5z looking at origin: view is identity with z shifted -5.
        let v = mat4_look_at(
            vec3_make(0.0, 0.0, 5.0),
            vec3_make(0.0, 0.0, 0.0),
            vec3_make(0.0, 1.0, 0.0),
        );
        let mut want = [0.0f32; 16];
        want[0] = 1.0;
        want[5] = 1.0;
        want[10] = 1.0;
        want[15] = 1.0;
        want[14] = -5.0;
        assert_mat4_near(v, want, EPS);
    }

    #[test]
    fn look_at_off_axis_pinned() {
        // eye (1,2,3) -> target (1,2,0): f = (0,0,-1), s = f x up = (1,0,0),
        // u = s x f = (0,1,0). Translation: -dot(s,eye) = -1,
        // -dot(u,eye) = -2, dot(f,eye) = -3.
        let v = mat4_look_at(
            vec3_make(1.0, 2.0, 3.0),
            vec3_make(1.0, 2.0, 0.0),
            vec3_make(0.0, 1.0, 0.0),
        );
        let mut want = [0.0f32; 16];
        want[0] = 1.0;
        want[5] = 1.0;
        want[10] = 1.0;
        want[15] = 1.0;
        want[12] = -1.0;
        want[13] = -2.0;
        want[14] = -3.0;
        assert_mat4_near(v, want, EPS);
    }

    #[test]
    fn look_at_dir_matches_look_at() {
        // Same camera expressed both ways must agree bit-for-bit when
        // the direction equals target - eye computed in f32.
        let eye = vec3_make(2.0, -1.0, 4.0);
        let target = vec3_make(-3.0, 5.0, 1.0);
        let up = vec3_make(0.0, 1.0, 0.0);
        let a = mat4_look_at(eye, target, up);
        let b = mat4_look_at_dir(eye, vec3_sub(target, eye), up);
        assert_eq!(a.m, b.m);
    }
}
