//! Port of `tenebris-c/src/core/math.{c,h}`.
//!
//! Function names are kept identical to the C API (free functions, not
//! methods) so later module ports stay mechanical. `vec3_t` -> `Vec3`,
//! `ivec3_t` -> `IVec3`, `dvec3_t` -> `DVec3`; field names unchanged.

/// Port of `vec3_t`.
#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub struct Vec3 {
    pub x: f32,
    pub y: f32,
    pub z: f32,
}

/// Port of `ivec3_t`.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Hash)]
pub struct IVec3 {
    pub x: i32,
    pub y: i32,
    pub z: i32,
}

/// Port of `dvec3_t`.
///
/// Double-precision world-space vector. Used for:
///   - the floating origin (planet-scale positions stay in DVec3, then
///     get downcast to Vec3 after subtracting the origin)
///   - hex chunk anchor positions on the unit sphere (sub-meter
///     precision needs more than 24-bit float mantissa at planet radius)
#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub struct DVec3 {
    pub x: f64,
    pub y: f64,
    pub z: f64,
}

#[inline]
pub fn vec3_make(x: f32, y: f32, z: f32) -> Vec3 {
    Vec3 { x, y, z }
}

#[inline]
pub fn dvec3_make(x: f64, y: f64, z: f64) -> DVec3 {
    DVec3 { x, y, z }
}

pub fn vec3_add(a: Vec3, b: Vec3) -> Vec3 {
    Vec3 { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }
}

pub fn vec3_sub(a: Vec3, b: Vec3) -> Vec3 {
    Vec3 { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }
}

pub fn vec3_scale(v: Vec3, s: f32) -> Vec3 {
    Vec3 { x: v.x * s, y: v.y * s, z: v.z * s }
}

pub fn vec3_dot(a: Vec3, b: Vec3) -> f32 {
    a.x * b.x + a.y * b.y + a.z * b.z
}

pub fn vec3_length(v: Vec3) -> f32 {
    vec3_dot(v, v).sqrt()
}

pub fn vec3_normalize(v: Vec3) -> Vec3 {
    let len = vec3_length(v);
    if len == 0.0f32 {
        return Vec3 { x: 0.0, y: 0.0, z: 0.0 };
    }
    vec3_scale(v, 1.0f32 / len)
}

pub fn dvec3_add(a: DVec3, b: DVec3) -> DVec3 {
    DVec3 { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }
}

pub fn dvec3_sub(a: DVec3, b: DVec3) -> DVec3 {
    DVec3 { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }
}

pub fn dvec3_scale(v: DVec3, s: f64) -> DVec3 {
    DVec3 { x: v.x * s, y: v.y * s, z: v.z * s }
}

pub fn dvec3_dot(a: DVec3, b: DVec3) -> f64 {
    a.x * b.x + a.y * b.y + a.z * b.z
}

pub fn dvec3_length(v: DVec3) -> f64 {
    dvec3_dot(v, v).sqrt()
}

pub fn dvec3_normalize(v: DVec3) -> DVec3 {
    let len = dvec3_length(v);
    if len == 0.0f64 {
        return DVec3 { x: 0.0, y: 0.0, z: 0.0 };
    }
    dvec3_scale(v, 1.0f64 / len)
}

pub fn dvec3_cross(a: DVec3, b: DVec3) -> DVec3 {
    DVec3 {
        x: a.y * b.z - a.z * b.y,
        y: a.z * b.x - a.x * b.z,
        z: a.x * b.y - a.y * b.x,
    }
}

/// Downcast for GPU-side vertex math (after subtracting floating origin).
#[inline]
pub fn dvec3_to_vec3(v: DVec3) -> Vec3 {
    Vec3 { x: v.x as f32, y: v.y as f32, z: v.z as f32 }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn vec3_add_sub_scale() {
        let a = vec3_make(1.5, -2.0, 3.25);
        let b = vec3_make(0.5, 4.0, -1.25);
        let s = vec3_add(a, b);
        assert_eq!((s.x, s.y, s.z), (2.0, 2.0, 2.0));
        let d = vec3_sub(a, b);
        assert_eq!((d.x, d.y, d.z), (1.0, -6.0, 4.5));
        let k = vec3_scale(a, 2.0);
        assert_eq!((k.x, k.y, k.z), (3.0, -4.0, 6.5));
    }

    #[test]
    fn vec3_dot_length() {
        let a = vec3_make(1.0, 2.0, 3.0);
        let b = vec3_make(4.0, -5.0, 6.0);
        // 4 - 10 + 18 = 12
        assert_eq!(vec3_dot(a, b), 12.0f32);
        // |(3,4,0)| = 5 exactly
        assert_eq!(vec3_length(vec3_make(3.0, 4.0, 0.0)), 5.0f32);
        // |(1,2,3)| = sqrt(14)
        assert!((vec3_length(a) - 3.7416575f32).abs() < 1e-6);
    }

    #[test]
    fn vec3_normalize_basic_and_zero() {
        let n = vec3_normalize(vec3_make(3.0, 0.0, 4.0));
        assert!((n.x - 0.6f32).abs() < 1e-6);
        assert!((n.y - 0.0f32).abs() < 1e-6);
        assert!((n.z - 0.8f32).abs() < 1e-6);
        // unit length within f32 tolerance
        assert!((vec3_length(n) - 1.0f32).abs() < 1e-6);

        let z = vec3_normalize(vec3_make(0.0, 0.0, 0.0));
        assert_eq!((z.x, z.y, z.z), (0.0, 0.0, 0.0));
    }

    #[test]
    fn dvec3_add_sub_scale_dot() {
        let a = dvec3_make(1.0e7, -2.5, 0.125);
        let b = dvec3_make(-3.0, 4.5, 8.0);
        let s = dvec3_add(a, b);
        assert_eq!((s.x, s.y, s.z), (9999997.0, 2.0, 8.125));
        let d = dvec3_sub(a, b);
        assert_eq!((d.x, d.y, d.z), (10000003.0, -7.0, -7.875));
        let k = dvec3_scale(b, 0.5);
        assert_eq!((k.x, k.y, k.z), (-1.5, 2.25, 4.0));
        // -3e7 - 11.25 + 1.0
        assert_eq!(dvec3_dot(a, b), -30000010.25f64);
    }

    #[test]
    fn dvec3_length_normalize() {
        let v = dvec3_make(2.0, 3.0, 6.0);
        // |(2,3,6)| = 7 exactly
        assert_eq!(dvec3_length(v), 7.0f64);
        let n = dvec3_normalize(v);
        assert!((n.x - 2.0 / 7.0).abs() < 1e-12);
        assert!((n.y - 3.0 / 7.0).abs() < 1e-12);
        assert!((n.z - 6.0 / 7.0).abs() < 1e-12);

        let z = dvec3_normalize(dvec3_make(0.0, 0.0, 0.0));
        assert_eq!((z.x, z.y, z.z), (0.0, 0.0, 0.0));
    }

    #[test]
    fn dvec3_cross_pinned() {
        // (1,2,3) x (4,5,6) = (-3, 6, -3)
        let c = dvec3_cross(dvec3_make(1.0, 2.0, 3.0), dvec3_make(4.0, 5.0, 6.0));
        assert_eq!((c.x, c.y, c.z), (-3.0, 6.0, -3.0));
        // x cross y = z (right-handed)
        let z = dvec3_cross(dvec3_make(1.0, 0.0, 0.0), dvec3_make(0.0, 1.0, 0.0));
        assert_eq!((z.x, z.y, z.z), (0.0, 0.0, 1.0));
    }

    #[test]
    fn dvec3_to_vec3_downcast() {
        // value not exactly representable in f32: 1e7 + 0.25 rounds to 1e7
        let v = dvec3_to_vec3(dvec3_make(10000000.25, -1.5, 0.1));
        assert_eq!(v.x, 10000000.0f32);
        assert_eq!(v.y, -1.5f32);
        assert_eq!(v.z, 0.1f32);
    }
}
