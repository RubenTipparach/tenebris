//! Port of `tenebris-c/src/core/rng.{c,h}`.
//!
//! Deterministic noise. Used by chunk + tile generation. Same code
//! compiles into client and server so they generate identical worlds.
//!
//! 2D noise is the original TS port (Chunk.noise2D in src/world/Chunk.ts).
//! 3D noise is added for hex chunk vertical terrain detail.
//!
//! Every function must produce bit-identical output to the C build for
//! the same inputs - world generation depends on it. All integer math
//! uses explicit wrapping (the C source relies on 32-bit two's-complement
//! wraparound, "JS 32-bit signed bitwise semantics"), and all float math
//! stays in f32 with the same order of operations.

/// JS 32-bit signed bitwise semantics, matching Chunk.hash in
/// src/world/Chunk.ts so 2D terrain is byte-identical between TS and C.
pub fn hash2(x: i32, z: i32) -> f32 {
    let mut h = x
        .wrapping_mul(374761393)
        .wrapping_add(z.wrapping_mul(668265263));
    h = (h ^ (((h as u32) >> 13) as i32)).wrapping_mul(1274126177);
    let masked = (h ^ (((h as u32) >> 16) as i32)) & 0x7fffffff;
    masked as f32 / 0x7fffffff as f32
}

fn smoothstep_f(t: f32) -> f32 {
    t * t * (3.0 - 2.0 * t)
}

fn lerp_f(a: f32, b: f32, t: f32) -> f32 {
    a + (b - a) * t
}

pub fn noise2d(x: f32, z: f32) -> f32 {
    let xi = x.floor() as i32;
    let zi = z.floor() as i32;
    let xf = x - xi as f32;
    let zf = z - zi as f32;

    let n00 = hash2(xi, zi);
    let n01 = hash2(xi, zi + 1);
    let n10 = hash2(xi + 1, zi);
    let n11 = hash2(xi + 1, zi + 1);

    let nx0 = lerp_f(n00, n10, smoothstep_f(xf));
    let nx1 = lerp_f(n01, n11, smoothstep_f(xf));
    lerp_f(nx0, nx1, smoothstep_f(zf))
}

pub fn hash3(x: i32, y: i32, z: i32) -> f32 {
    let mut h = x
        .wrapping_mul(374761393)
        .wrapping_add(y.wrapping_mul(1376312589))
        .wrapping_add(z.wrapping_mul(668265263));
    h = (h ^ (((h as u32) >> 13) as i32)).wrapping_mul(1274126177);
    (((h ^ (((h as u32) >> 16) as i32)) & 0x7fffffff) as f32) / 0x7fffffff as f32
}

pub fn noise3d(x: f32, y: f32, z: f32) -> f32 {
    let xi = x.floor() as i32;
    let yi = y.floor() as i32;
    let zi = z.floor() as i32;
    let xf = x - xi as f32;
    let yf = y - yi as f32;
    let zf = z - zi as f32;

    let n000 = hash3(xi, yi, zi);
    let n001 = hash3(xi, yi, zi + 1);
    let n010 = hash3(xi, yi + 1, zi);
    let n011 = hash3(xi, yi + 1, zi + 1);
    let n100 = hash3(xi + 1, yi, zi);
    let n101 = hash3(xi + 1, yi, zi + 1);
    let n110 = hash3(xi + 1, yi + 1, zi);
    let n111 = hash3(xi + 1, yi + 1, zi + 1);

    let u = smoothstep_f(xf);
    let v = smoothstep_f(yf);
    let w = smoothstep_f(zf);
    let a = lerp_f(lerp_f(n000, n100, u), lerp_f(n010, n110, u), v);
    let b = lerp_f(lerp_f(n001, n101, u), lerp_f(n011, n111, u), v);
    lerp_f(a, b, w)
}

/// Seedable variant - mixes the 64-bit seed in so different planets
/// produce different worlds.
///
/// Mix seed into coordinates so different planets have different
/// terrain. Cheap multiplicative perturbation - good enough for
/// Tier 1; replace with a real seeded permutation table if we need
/// better statistical properties.
pub fn noise3d_seed(seed: u64, x: f32, y: f32, z: f32) -> f32 {
    let kx = ((seed & 0xFFFF) as f64 * 1e-4 + 1.0) as f32;
    let ky = (((seed >> 16) & 0xFFFF) as f64 * 1e-4 + 1.0) as f32;
    let kz = (((seed >> 32) & 0xFFFF) as f64 * 1e-4 + 1.0) as f32;
    noise3d(x * kx, y * ky, z * kz)
}

/* ---------- 3D gradient (Perlin) noise ---------------------------- */
/* Port of Noise3D.Sample / Hash / Grad / Fade from the rts-engine
 * reference (src/RtsEngine.Game/PlanetMesh.cs). Output is in
 * [-1, +1] so the existing `n * 2 - 1` remap inside fractal3d/ridge3d
 * is dropped. */

fn gnoise_fade(t: f32) -> f32 {
    t * t * t * (t * (t * 6.0 - 15.0) + 10.0)
}

fn gnoise_hash(x: i32, y: i32, z: i32, seed: i32) -> i32 {
    let mut h = seed
        ^ x.wrapping_mul(374761393)
        ^ y.wrapping_mul(668265263)
        ^ z.wrapping_mul(1274126177);
    h = (h ^ (((h as u32) >> 13) as i32)).wrapping_mul(1103515245);
    h ^= ((h as u32) >> 16) as i32;
    h
}

fn gnoise_grad(hash: i32, x: f32, y: f32, z: f32) -> f32 {
    let h = hash & 15;
    let u = if h < 8 { x } else { y };
    let v = if h < 4 {
        y
    } else if h == 12 || h == 14 {
        x
    } else {
        z
    };
    (if h & 1 != 0 { -u } else { u }) + (if h & 2 != 0 { -v } else { v })
}

/// 3D gradient (Perlin) noise - quintic fade + integer-hash gradient
/// lookup. Returns symmetric output in [-1, +1] (no remap needed at the
/// caller). Direct port of rts-engine Noise3D.Sample. Replaces
/// noise3d_seed in terrain generation: gradient noise has continuous
/// first derivatives so fBm stacks come out smooth instead of the
/// grid-aligned lumps value noise produces.
pub fn gnoise3d_seed(seed: u64, x: f32, y: f32, z: f32) -> f32 {
    /* Fold the 64-bit seed into the 32-bit hash space. The two halves
     * are XORed so flipping any bit of `seed` perturbs the entire grid,
     * not just one octant. */
    let s = (((seed & 0xFFFF_FFFF) as u32) ^ (((seed >> 32) & 0xFFFF_FFFF) as u32)) as i32;

    let ix = x.floor() as i32;
    let iy = y.floor() as i32;
    let iz = z.floor() as i32;
    let fx = x - ix as f32;
    let fy = y - iy as f32;
    let fz = z - iz as f32;

    let u = gnoise_fade(fx);
    let v = gnoise_fade(fy);
    let w = gnoise_fade(fz);

    let g000 = gnoise_grad(gnoise_hash(ix, iy, iz, s), fx, fy, fz);
    let g100 = gnoise_grad(gnoise_hash(ix + 1, iy, iz, s), fx - 1.0, fy, fz);
    let g010 = gnoise_grad(gnoise_hash(ix, iy + 1, iz, s), fx, fy - 1.0, fz);
    let g110 = gnoise_grad(gnoise_hash(ix + 1, iy + 1, iz, s), fx - 1.0, fy - 1.0, fz);
    let g001 = gnoise_grad(gnoise_hash(ix, iy, iz + 1, s), fx, fy, fz - 1.0);
    let g101 = gnoise_grad(gnoise_hash(ix + 1, iy, iz + 1, s), fx - 1.0, fy, fz - 1.0);
    let g011 = gnoise_grad(gnoise_hash(ix, iy + 1, iz + 1, s), fx, fy - 1.0, fz - 1.0);
    let g111 = gnoise_grad(gnoise_hash(ix + 1, iy + 1, iz + 1, s), fx - 1.0, fy - 1.0, fz - 1.0);

    let a = lerp_f(lerp_f(g000, g100, u), lerp_f(g010, g110, u), v);
    let b = lerp_f(lerp_f(g001, g101, u), lerp_f(g011, g111, u), v);
    lerp_f(a, b, w)
}

#[cfg(test)]
mod tests {
    use super::*;

    /* Expected values are exact f32 bit patterns captured from the C
     * implementation (tenebris-c/src/core/rng.c built with gcc -fwrapv)
     * for the same inputs. Comparisons are bit-exact, not approximate. */

    fn assert_bits(got: f32, want_bits: u32) {
        assert_eq!(
            got.to_bits(),
            want_bits,
            "got {:?} (0x{:08x}), want {:?} (0x{:08x})",
            got,
            got.to_bits(),
            f32::from_bits(want_bits),
            want_bits
        );
    }

    #[test]
    fn hash2_matches_c() {
        let cases: [(i32, i32, u32); 8] = [
            (0, 0, 0x00000000),
            (1, 0, 0x3c851c76),
            (0, 1, 0x3f095b48),
            (1, 1, 0x3ea7c89a),
            (-1, -1, 0x3eae52f0),
            (123, -456, 0x3e0f43f2),
            (31415, 27182, 0x3e4b2ff8),
            (i32::MIN, i32::MAX, 0x3d9f6762),
        ];
        for (x, z, want) in cases {
            assert_bits(hash2(x, z), want);
        }
    }

    #[test]
    fn hash3_matches_c() {
        let cases: [(i32, i32, i32, u32); 8] = [
            (0, 0, 0, 0x00000000),
            (1, 0, 0, 0x3c851c76),
            (0, 1, 0, 0x3ee20f9c),
            (0, 0, 1, 0x3f095b48),
            (1, 1, 1, 0x3ee0fc1c),
            (-5, 17, -99, 0x3ec5ef38),
            (1000, -2000, 3000, 0x3f2a7479),
            (i32::MAX, i32::MIN, 123456789, 0x3e6d89e8),
        ];
        for (x, y, z, want) in cases {
            assert_bits(hash3(x, y, z), want);
        }
    }

    #[test]
    fn noise2d_matches_c() {
        let cases: [(f32, f32, u32); 4] = [
            (0.5, 0.5, 0x3e616878),
            (1.25, -3.75, 0x3e29804f),
            (-10.1, 42.9, 0x3e3ff328),
            (100.123, -200.456, 0x3eca4b28),
        ];
        for (x, z, want) in cases {
            assert_bits(noise2d(x, z), want);
        }
    }

    #[test]
    fn noise3d_matches_c() {
        let cases: [(f32, f32, f32, u32); 4] = [
            (0.5, 0.5, 0.5, 0x3e6b4c50),
            (1.1, 2.2, 3.3, 0x3ef4f344),
            (-4.7, 5.3, -6.9, 0x3e9f26b7),
            (12.34, -56.78, 90.12, 0x3f02f580),
        ];
        for (x, y, z, want) in cases {
            assert_bits(noise3d(x, y, z), want);
        }
    }

    /// Sample points shared by the seeded-noise tests: a short walk
    /// through space so each seed pins an 8-value sequence.
    fn sample_point(i: u32) -> (f32, f32, f32) {
        let k = (i + 1) as f32;
        (0.37 * k, -1.91 * k, 2.53 * k)
    }

    #[test]
    fn noise3d_seed_matches_c() {
        let cases: [(u64, [u32; 8]); 3] = [
            (
                0x12345678,
                [
                    0x3e9f3505, 0x3ed8fe34, 0x3ede0170, 0x3f3f60b7, 0x3ebe02c3, 0x3f45341c,
                    0x3f0dca33, 0x3f047be7,
                ],
            ),
            (
                0xDEADBEEFCAFEBABE,
                [
                    0x3f16e5aa, 0x3f191d34, 0x3eea7b23, 0x3eccbd50, 0x3f28f635, 0x3e81d071,
                    0x3ed30192, 0x3ddc7656,
                ],
            ),
            (
                1,
                [
                    0x3ef4cf18, 0x3ebc09c6, 0x3ec9834a, 0x3f37378f, 0x3f3d8402, 0x3f2278cc,
                    0x3ecb14b6, 0x3f05aa48,
                ],
            ),
        ];
        for (seed, wants) in cases {
            for (i, want) in wants.into_iter().enumerate() {
                let (x, y, z) = sample_point(i as u32);
                assert_bits(noise3d_seed(seed, x, y, z), want);
            }
        }
    }

    #[test]
    fn gnoise3d_seed_matches_c() {
        let cases: [(u64, [u32; 8]); 3] = [
            (
                0x12345678,
                [
                    0xbe17f87a, 0x3ea72991, 0xbc1bc970, 0x3c84b0e4, 0xbc8784d0, 0xbd68c5bf,
                    0x3dd108b0, 0xbebd5e9c,
                ],
            ),
            (
                0xDEADBEEFCAFEBABE,
                [
                    0xbddb1ec0, 0xbe75fb43, 0x3de030f8, 0xbdb36ecc, 0x3d935388, 0xbe402f9c,
                    0x3ddb5329, 0xbe255cb9,
                ],
            ),
            (
                1,
                [
                    0x3e36c75a, 0xbe98f1aa, 0xbd8f3174, 0x3cad6fb0, 0xbede488d, 0x3ee7adc1,
                    0x3e200328, 0x3e11769d,
                ],
            ),
        ];
        for (seed, wants) in cases {
            for (i, want) in wants.into_iter().enumerate() {
                let (x, y, z) = sample_point(i as u32);
                assert_bits(gnoise3d_seed(seed, x, y, z), want);
            }
        }
    }
}
