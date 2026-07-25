//! Port of `tenebris-c/src/core/config.{c,h}`.
//!
//! Runtime config loader for the YAML-subset files under
//! `tenebris-c/assets/config/`:
//!
//!   atmosphere.yaml - per-body atmospheric scattering knobs.
//!   skybox.yaml     - global star + nebula appearance.
//!   lod.yaml        - distant-body LOD + player movement tuning.
//!   water.yaml      - water cap shader + flow automaton tuning.
//!   lighting.yaml   - terrain day/night terminator + torch tuning.
//!
//! The files use a tiny YAML subset (key: value, vec3 `[a, b, c]` lists,
//! top-level sections, `#` comments) parsed by a hand-written scanner -
//! same accepted syntax as the C parser, no serde/yaml dependency.
//!
//! Renames (per PORTING.md rule 4 - module prefix dropped):
//!   config_skybox()          -> config::skybox()      (returns a copy,
//!                               not a stable pointer - the C global is
//!                               a `Mutex` here)
//!   config_lod()             -> config::lod()
//!   config_water()           -> config::water()
//!   config_water_flow()      -> config::water_flow()
//!   config_lighting()        -> config::lighting()
//!   config_load_skybox(path) -> config::load_skybox(path)   (and so on
//!                               for lod / water / lighting)
//!   config_load_atmosphere(path)
//!                            -> config::load_atmosphere_with(path, find_body, set_atmo)
//!
//! The atmosphere loader differs in shape because it writes into the
//! planet table (`planet_get` / `planet_set_atmosphere`). The body
//! lookup and the patch application are injected as callbacks;
//! `planet::load_atmosphere(path)` / `planet::parse_atmosphere(src,
//! path)` wire them up (the C `find_body_by_key` lookup, which compares
//! `normalise_name(body.name)` against the YAML section key, lives in
//! planet.rs). `BodyAtmo` (the port of `body_atmo_t` from planet.h) is
//! owned by `planet.rs` and re-exported here.
//!
//! New entry points for the WASM path (which preloads file bytes instead
//! of reading from disk): `parse_skybox`, `parse_lod`, `parse_water`,
//! `parse_lighting`, `parse_atmosphere_with` each take the file content
//! as `&str` plus a path label used in log messages.
//!
//! Return codes mirror the C API: 0 on success, -1 if the file couldn't
//! be opened (non-fatal - compiled-in defaults stay active), -2 on parse
//! error (also non-fatal but logged).
//!
//! Merge semantics are unchanged: a key present in the YAML overwrites
//! the compiled-in default directly (even with zero); a key omitted
//! keeps the default. The "> 0.0 means override" rule for atmosphere
//! patches lives in `planet_set_atmosphere` (planet.c), i.e. behind the
//! injected `set_atmosphere` callback here.

use crate::math::Vec3;
use std::sync::Mutex;

/// Shorthand for const Vec3 construction in the default tables.
const fn v3(x: f32, y: f32, z: f32) -> Vec3 {
    Vec3 { x, y, z }
}

const VEC3_ZERO: Vec3 = v3(0.0, 0.0, 0.0);

/* ------------------------------------------------------------------------ */
/* Tiny YAML-subset parser. Supports:
 *   - top-level section headers:  "name:"  on a line of their own
 *   - field:value lines:          "  key: 1.234"   or "  key: [a, b, c]"
 *   - line comments starting with '#'
 *   - blank lines (ignored)
 *
 * Indentation is *not* enforced - any line ending in `:` with no value
 * starts a new section, any line with `:` and a value is a field of
 * the current section. That's strictly less than YAML proper but
 * exactly enough for these config files.
 */

/// C `isspace()` in the default locale: space, \t, \n, \v, \f, \r.
/// (Rust's `char::is_ascii_whitespace` misses \v, hence the local set.)
fn c_isspace(c: char) -> bool {
    matches!(c, ' ' | '\t' | '\n' | '\x0B' | '\x0C' | '\r')
}

/// Port of `trim_strip`: strip everything from the first '#' onward
/// (comments are recognised anywhere on the line, even inside a value -
/// same as the C scanner), then trim leading + trailing whitespace.
fn trim_strip(s: &str) -> &str {
    let s = match s.find('#') {
        Some(i) => &s[..i],
        None => s,
    };
    s.trim_matches(|c: char| c_isspace(c))
}

/// Port of body-name normalisation: spaces folded to underscores,
/// ASCII-lowercased. The C version writes into a 64-byte buffer, so the
/// result truncates at 63 bytes. Used by the (future) planet glue to
/// match YAML section keys against `body_config_t.name`.
pub fn normalise_name(input: &str) -> String {
    input
        .bytes()
        .take(63)
        .map(|b| {
            let b = if b == b' ' { b'_' } else { b };
            b.to_ascii_lowercase() as char
        })
        .collect()
}

/// Mirror of C `strtod(s, &end)` for the decimal forms these configs
/// use: optional leading whitespace, optional sign, digits with an
/// optional fraction, optional exponent (only consumed when at least
/// one exponent digit follows). Returns `(value, bytes_consumed)`;
/// `bytes_consumed == 0` means no conversion happened (C leaves
/// `end == start` and returns 0.0). C strtod additionally accepts hex
/// floats / inf / nan, which never appear in the config surface.
fn strtod_prefix(s: &str) -> (f64, usize) {
    let b = s.as_bytes();
    let mut i = 0usize;
    while i < b.len() && c_isspace(b[i] as char) {
        i += 1;
    }
    let num_start = i;
    if i < b.len() && (b[i] == b'+' || b[i] == b'-') {
        i += 1;
    }
    let mut mant_digits = 0usize;
    while i < b.len() && b[i].is_ascii_digit() {
        i += 1;
        mant_digits += 1;
    }
    if i < b.len() && b[i] == b'.' {
        i += 1;
        while i < b.len() && b[i].is_ascii_digit() {
            i += 1;
            mant_digits += 1;
        }
    }
    if mant_digits == 0 {
        return (0.0, 0);
    }
    let mut end = i;
    if i < b.len() && (b[i] == b'e' || b[i] == b'E') {
        let mut j = i + 1;
        if j < b.len() && (b[j] == b'+' || b[j] == b'-') {
            j += 1;
        }
        let exp_digit_start = j;
        while j < b.len() && b[j].is_ascii_digit() {
            j += 1;
        }
        if j > exp_digit_start {
            end = j;
        }
    }
    let v: f64 = s[num_start..end].parse().unwrap_or(0.0);
    (v, end)
}

/// `(float)strtod(val, NULL)` - garbage input yields 0.0, trailing junk
/// after a valid prefix is ignored.
fn fval(val: &str) -> f32 {
    strtod_prefix(val).0 as f32
}

/// `(int)strtol(val, NULL, 10)` - leading whitespace + optional sign,
/// digits; garbage input yields 0, trailing junk ignored.
fn ival(val: &str) -> i32 {
    let b = val.as_bytes();
    let mut i = 0usize;
    while i < b.len() && c_isspace(b[i] as char) {
        i += 1;
    }
    let mut neg = false;
    if i < b.len() && (b[i] == b'+' || b[i] == b'-') {
        neg = b[i] == b'-';
        i += 1;
    }
    let mut any = false;
    let mut v: i64 = 0;
    while i < b.len() && b[i].is_ascii_digit() {
        any = true;
        v = v.saturating_mul(10).saturating_add((b[i] - b'0') as i64);
        i += 1;
    }
    if !any {
        return 0;
    }
    if neg {
        (-v) as i32
    } else {
        v as i32
    }
}

/// Port of `parse_vec3`: parse "[ a, b, c ]" into `out`. Returns true
/// on success. Quirks preserved from C: components already scanned are
/// written even when a later one fails; separators between numbers are
/// any mix of commas and whitespace; the closing ']' is never checked.
fn parse_vec3(val: &str, out: &mut Vec3) -> bool {
    let s = val.trim_start_matches(|c: char| c_isspace(c));
    let Some(mut s) = s.strip_prefix('[') else {
        return false;
    };
    let (x, n) = strtod_prefix(s);
    out.x = x as f32;
    if n == 0 {
        return false;
    }
    s = &s[n..];
    s = s.trim_start_matches(|c: char| c == ',' || c_isspace(c));
    let (y, n) = strtod_prefix(s);
    out.y = y as f32;
    if n == 0 {
        return false;
    }
    s = &s[n..];
    s = s.trim_start_matches(|c: char| c == ',' || c_isspace(c));
    let (z, n) = strtod_prefix(s);
    out.z = z as f32;
    n != 0
}

/// parse_vec3 wrapped to the "errors added" convention of the field
/// callbacks: 0 on success, 1 on parse failure.
fn vec3_or_err(val: &str, out: &mut Vec3) -> i32 {
    if parse_vec3(val, out) {
        0
    } else {
        1
    }
}

/// Mirror of C `strtol(s, &end, 10)` for the int forms the UI config
/// uses: optional leading whitespace, optional sign, decimal digits.
/// Returns `(value, bytes_consumed)`; `bytes_consumed == 0` means no
/// conversion happened (C leaves `end == start`).
fn strtol_prefix(s: &str) -> (i64, usize) {
    let b = s.as_bytes();
    let mut i = 0usize;
    while i < b.len() && c_isspace(b[i] as char) {
        i += 1;
    }
    let mut neg = false;
    if i < b.len() && (b[i] == b'+' || b[i] == b'-') {
        neg = b[i] == b'-';
        i += 1;
    }
    let mut any = false;
    let mut v: i64 = 0;
    while i < b.len() && b[i].is_ascii_digit() {
        any = true;
        v = v.saturating_mul(10).saturating_add((b[i] - b'0') as i64);
        i += 1;
    }
    if !any {
        return (0, 0);
    }
    (if neg { -v } else { v }, i)
}

/// Port of `parse_int4`: parse "[ a, b, c, d ]" into `out[0..3]` as
/// integers. Returns true on success. Used by the UI config for sprite
/// rects + nine-slice margins, which are integer texel counts. Quirks
/// preserved from C: components already scanned are written even when
/// a later one fails; separators between numbers are any mix of commas
/// and whitespace; the closing ']' is never checked.
fn parse_int4(val: &str, out: &mut [i32; 4]) -> bool {
    let s = val.trim_start_matches(|c: char| c_isspace(c));
    let Some(mut s) = s.strip_prefix('[') else {
        return false;
    };
    for slot in out.iter_mut() {
        s = s.trim_start_matches(|c: char| c == ',' || c_isspace(c));
        let (v, n) = strtol_prefix(s);
        *slot = v as i32;
        if n == 0 {
            return false;
        }
        s = &s[n..];
    }
    true
}

/// Shared line scanner - the C version inlines this loop in each
/// `config_load_*`, byte-for-byte identical across the five loaders, so
/// it is factored here. Splits `src` into lines, strips comments and
/// whitespace, splits each non-blank line at its first ':' into
/// (key, value) and calls `field(line_no, key, value)` - `value` is ""
/// for section headers. The callback returns the number of parse errors
/// it added (0 or 1). Lines without a ':' are counted as parse errors
/// here, matching C. Returns the total parse-error count.
///
/// An embedded NUL terminates the scan early (the C scanner stops at
/// '\0'); content before the NUL on that line is still processed.
fn scan(src: &str, path: &str, mut field: impl FnMut(i32, &str, &str) -> i32) -> i32 {
    let src = match src.find('\0') {
        Some(i) => &src[..i],
        None => src,
    };
    let mut parse_errors = 0i32;
    for (idx, raw) in src.split('\n').enumerate() {
        let line_no = idx as i32 + 1;
        let line = trim_strip(raw);
        if line.is_empty() {
            /* skip blank / comment-only line */
            continue;
        }
        match line.find(':') {
            None => {
                println!("[config] {}:{}: missing ':' in '{}'", path, line_no, line);
                parse_errors += 1;
            }
            Some(colon) => {
                let key = line[..colon].trim_end_matches(|c: char| c_isspace(c));
                let val = trim_strip(&line[colon + 1..]);
                parse_errors += field(line_no, key, val);
            }
        }
    }
    parse_errors
}

/// Port of `slurp_file`: buffer the entire file into memory. The C
/// version rejects files larger than 1 MiB the same way it rejects a
/// missing file (NULL -> "not found"), so both map to `None` here.
fn slurp_file(path: &str) -> Option<String> {
    let bytes = std::fs::read(path).ok()?;
    if bytes.len() > (1usize << 20) {
        return None;
    }
    Some(String::from_utf8_lossy(&bytes).into_owned())
}

/// Common tail of every parse function: log + map the error count to
/// the C return code (0 ok, -2 parse errors).
fn finish(path: &str, parse_errors: i32) -> i32 {
    if parse_errors > 0 {
        println!("[config] {} loaded with {} parse error(s)", path, parse_errors);
        return -2;
    }
    println!("[config] loaded {}", path);
    0
}

/* ------------------------------------------------------------------------ */
/* Skybox config - single global struct seeded with the values that
 * used to be hardcoded in the FS_SKY shader, optionally overridden
 * by assets/config/skybox.yaml. */

/// Port of `skybox_config_t`. Global skybox tuning - read by
/// renderer_draw_skybox each frame and uploaded to the sky shader as
/// uniforms.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct SkyboxConfig {
    /* Three Voronoi star layers, each at a different cell density.
     * Higher density -> smaller, more numerous cells -> tinier stars
     * spread across more sky. Per-layer intensity weights the
     * smoothstep hit before stacking layers. */
    pub star_densities: Vec3,
    pub star_intensities: Vec3,
    /* Smoothstep upper bound on squared cell-distance - smaller =
     * tighter, sharper points. */
    pub star_sharpness: f32,
    /* Cells whose hash brightness is below this stay dark. Higher =
     * sparser sky, lower = busier. */
    pub star_brightness_threshold: f32,
    pub star_color: Vec3,

    /* Soft fbm-based nebula. Two sample scales pick out cloud shape
     * and warm-vs-cool mixing. */
    pub nebula_warm_color: Vec3,
    pub nebula_cool_color: Vec3,
    pub nebula_intensity: f32,
    pub nebula_drift_speed: f32,
    pub nebula_scale1: f32,
    pub nebula_scale2: f32,
    /* smoothstep(cloud_lo, cloud_hi, fbm) gates where clouds appear. */
    pub nebula_cloud_lo: f32,
    pub nebula_cloud_hi: f32,
    /* smoothstep(warm_blend_lo, warm_blend_hi, fbm2) drives the
     * warm/cool tint blend across the nebula. */
    pub nebula_warm_blend_lo: f32,
    pub nebula_warm_blend_hi: f32,

    /* Deep-space backdrop tint added under everything. Not pure black
     * by default - a touch of cool blue keeps the void from looking
     * dead. */
    pub space_color: Vec3,
}

pub const SKYBOX_DEFAULTS: SkyboxConfig = SkyboxConfig {
    star_densities: v3(100.0, 200.0, 300.0),
    star_intensities: v3(1.0, 0.8, 0.6),
    star_sharpness: 0.02,
    star_brightness_threshold: 0.7,
    star_color: v3(1.0, 0.98, 0.95),

    nebula_warm_color: v3(0.55, 0.18, 0.38),
    nebula_cool_color: v3(0.10, 0.20, 0.50),
    nebula_intensity: 0.20,
    nebula_drift_speed: 0.005,
    nebula_scale1: 1.4,
    nebula_scale2: 3.1,
    nebula_cloud_lo: 0.45,
    nebula_cloud_hi: 0.78,
    nebula_warm_blend_lo: 0.3,
    nebula_warm_blend_hi: 0.8,

    space_color: v3(0.005, 0.007, 0.018),
};

impl Default for SkyboxConfig {
    fn default() -> Self {
        SKYBOX_DEFAULTS
    }
}

static S_SKY: Mutex<SkyboxConfig> = Mutex::new(SKYBOX_DEFAULTS);

/// Port of `config_skybox()`. Returns the active skybox config -
/// compiled-in defaults until `load_skybox()` / `parse_skybox()` runs
/// and overrides fields from YAML. (The C API returns a stable pointer;
/// here the struct is small and `Copy`, so callers get a snapshot.)
pub fn skybox() -> SkyboxConfig {
    *S_SKY.lock().unwrap()
}

/// Port of `config_load_skybox()`.
pub fn load_skybox(path: &str) -> i32 {
    match slurp_file(path) {
        None => {
            println!("[config] {} not found, using compiled-in skybox defaults", path);
            -1
        }
        Some(src) => parse_skybox(&src, path),
    }
}

/// Body of `config_load_skybox()` after the file slurp - exposed so the
/// WASM path can feed preloaded bytes in. `path` is only used for log
/// messages.
pub fn parse_skybox(src: &str, path: &str) -> i32 {
    let mut cfg = S_SKY.lock().unwrap();
    let parse_errors = scan(src, path, |line_no, key, val| {
        if val.is_empty() {
            /* Section header: skybox.yaml has a single top-level
             * "skybox:" wrapper purely so the file shape matches
             * atmosphere.yaml; we don't actually key on it. */
            return 0;
        }
        match key {
            "star_densities" => vec3_or_err(val, &mut cfg.star_densities),
            "star_intensities" => vec3_or_err(val, &mut cfg.star_intensities),
            "star_sharpness" => {
                cfg.star_sharpness = fval(val);
                0
            }
            "star_brightness_threshold" => {
                cfg.star_brightness_threshold = fval(val);
                0
            }
            "star_color" => vec3_or_err(val, &mut cfg.star_color),
            "nebula_warm_color" => vec3_or_err(val, &mut cfg.nebula_warm_color),
            "nebula_cool_color" => vec3_or_err(val, &mut cfg.nebula_cool_color),
            "nebula_intensity" => {
                cfg.nebula_intensity = fval(val);
                0
            }
            "nebula_drift_speed" => {
                cfg.nebula_drift_speed = fval(val);
                0
            }
            "nebula_scale1" => {
                cfg.nebula_scale1 = fval(val);
                0
            }
            "nebula_scale2" => {
                cfg.nebula_scale2 = fval(val);
                0
            }
            "nebula_cloud_lo" => {
                cfg.nebula_cloud_lo = fval(val);
                0
            }
            "nebula_cloud_hi" => {
                cfg.nebula_cloud_hi = fval(val);
                0
            }
            "nebula_warm_blend_lo" => {
                cfg.nebula_warm_blend_lo = fval(val);
                0
            }
            "nebula_warm_blend_hi" => {
                cfg.nebula_warm_blend_hi = fval(val);
                0
            }
            "space_color" => vec3_or_err(val, &mut cfg.space_color),
            _ => {
                println!("[config] {}:{}: unknown key '{}'", path, line_no, key);
                0
            }
        }
    });
    drop(cfg);
    finish(path, parse_errors)
}

/* ------------------------------------------------------------------------ */
/* LOD config - compiled-in defaults overridable via lod.yaml. */

/// Port of `lod_config_t`. Level-of-detail tuning plus the player
/// movement / water-physics knobs the C header grew over time. See
/// `tenebris-c/src/core/config.h` for the full per-field commentary.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct LodConfig {
    /* Icosphere subdivision levels. 0 = the bare 20-tri icosa, 1 =
     * 80 tris, 2 = 320 tris, 3 = 1280 tris. */
    pub distant_subdivisions: i32,
    /* Per-vertex height shading for the distant LOD. */
    pub distant_shade_floor: f32,
    pub distant_shade_ceiling: f32,
    pub distant_shade_range_m: f32,

    /* Atmospheric RIM fresnel on the distant globe (the "less bland from
     * space" limb glow). Colour is the atmospheric tint added at grazing
     * angles; power sharpens the ring (higher = thinner); intensity scales
     * it; floor keeps a faint edge on the night side (0 = rim only on the
     * sunlit crescent). A zero colour disables the effect. */
    pub distant_rim_color: Vec3,
    pub distant_rim_power: f32,
    pub distant_rim_intensity: f32,
    pub distant_rim_floor: f32,
    /// Ambient fill on the distant-LOD globe (planet-from-space). Kept much
    /// LOWER than the terrain ambient: the terrain ambient (~0.35) is a
    /// playability floor so the ground you stand on isn't pitch-black at
    /// night, but on a planet seen from orbit that same fill lit the whole
    /// night side to ~35% of the texture (the muddy "strange coloring" on
    /// the dark side). A small neutral value gives a clean dark night and a
    /// crisp terminator. 0 = pure black night side.
    pub distant_ambient: f32,

    /* Per-tileset palette for the distant-LOD vertex sampler.
     * Indexed by tileset_t: EARTH=0, SEQUOIA=1, CRAG=2, FROST=3,
     * ASTEROID=4. */
    pub tileset_water_color: [Vec3; 5],
    pub tileset_lowland_tint: [Vec3; 5],
    pub tileset_peak_tint: [Vec3; 5],
    /* Water-column thickness (m) at which water_color fully dominates
     * the seabed colour. Zero -> use a sane default at runtime. */
    pub tileset_water_full_depth_m: [f32; 5],
    /* Close-up water tinting. A field set to {0, 0, 0} falls back to
     * the global water_config value at runtime. */
    pub tileset_water_deep_color: [Vec3; 5],
    pub tileset_water_absorption: [Vec3; 5],
    /* Sky-reflection tones the water cap mirrors at grazing angles.
     * From orbit almost every view ray grazes, so these dominate how a
     * sea reads from space - Sequoia needs green here or its ocean
     * renders as the global blue-white sky reflection. {0,0,0} falls
     * back to the global water_config values. */
    pub tileset_water_sky_horizon: [Vec3; 5],
    pub tileset_water_sky_zenith: [Vec3; 5],
    /* Per-tileset Fresnel sky-reflection STRENGTH (how much the surface
     * mirrors the sky vs shows its own water colour). The global default
     * (0.5) makes grazing-angle water a near-full sky mirror - on a body
     * with a dark/orange sky (Sequoia) that renders the sea as a flat
     * sky-coloured sheet that shifts with view angle, never green. A low
     * value here lets the green deep_color dominate at every angle.
     * <= 0 falls back to the global water_config sky_horizon_strength. */
    pub tileset_water_sky_strength: [f32; 5],
    /* Per-tileset scale on how much the WATER pass fogs toward the live
     * atmosphere sky colour (FRAME_FOG). The water cap fogs itself with
     * the same haze the terrain uses, so on a body with a strongly
     * coloured sky (Sequoia's orange/red dusk) the sea inherits the SKY
     * colour and loses its green - proven by the sea going green again
     * once the camera leaves the atmosphere. A low value keeps the water
     * its own colour in-atmosphere; 1.0 (or <= 0 -> 1.0) = full terrain
     * fog. Terrain still gets the full atmospheric haze - this only
     * decouples the WATER surface. */
    pub tileset_water_fog_scale: [f32; 5],
    /* Per-tileset COLOUR the water pass fogs toward, replacing the live
     * atmosphere sky colour (FRAME_FOG.xyz) on the WATER surface only.
     * The fog SCALE above thins the density (.w); this overrides the
     * fogged-toward hue itself. Sequoia's sea fogs toward the orange/red
     * dusk sky by default (FRAME_FOG carries the horizon colour), so far
     * water reads orange in-atmosphere even with the density scaled down;
     * a green-grey haze here keeps distant water green instead of tan.
     * {0,0,0} falls back to the live sky-matched FRAME_FOG colour. */
    pub tileset_water_fog_color: [Vec3; 5],
    /* Atmospheric limb-rim light painted over TERRAIN near the limb
     * when seen from orbit (hex shader + distant impostor). {0,0,0}
     * falls back to the global distant_rim_color - which is Tenebris
     * blue, so any body with a non-blue atmosphere needs its own or
     * its whole disk reads blue-tinted from space. */
    pub tileset_rim_color: [Vec3; 5],

    /* Gravity field - full gravity below radius * gravity_full_mult,
     * linear taper to zero at radius * gravity_falloff_mult. */
    pub gravity_full_mult: f32,
    pub gravity_falloff_mult: f32,

    /* Camera roll-slerp on space -> planet entry. */
    pub roll_slerp_duration_s: f32,
    pub roll_slerp_speed: f32,

    /* Space-mode flight tuning. */
    pub space_thrust: f32,
    pub space_drag: f32,
    pub space_roll_speed: f32,

    /* Jump / jetpack discrimination. */
    pub jump_velocity_mps: f32,
    pub jetpack_hold_threshold_s: f32,
    pub jetpack_accel_mps2: f32,
    pub jetpack_max_vy_mps: f32,
    /* Jetpack fuel gate: a max continuous burn, then a recharge that only
     * starts after the pack has sat idle for a bit (so tap-tap-tap jetpacking
     * doesn't recharge for free between taps). */
    pub jetpack_max_fuel_s: f32,
    pub jetpack_recharge_time_s: f32,
    pub jetpack_idle_before_recharge_s: f32,

    /* Player capsule height, foot-to-head. */
    pub player_height_m: f32,
    /* Maximum vertical "step up" the player can take in one frame. */
    pub step_height_m: f32,
    /* Camera-cylinder collider radius. 0 disables the collider. */
    pub camera_collider_radius_m: f32,

    /* Water physics - ported from JS PlayerConfig WATER_* knobs. */
    pub water_gravity_mult: f32,
    pub water_drag_per_s: f32,
    pub water_movement_mult: f32,
    pub water_swim_force_mps2: f32,
    pub water_surface_float_height_m: f32,
    pub water_body_check_height_m: f32,
    pub water_submerged_jump_mult: f32,

    /* ---- Renderer mesh / chunking budget. --------------------------
     * The surface mesh of every body is split into `mesh_chunk_count`
     * GPU chunks. A block edit only re-meshes the chunk(s) it touches,
     * so more chunks = fewer tiles rebuilt per edit (= less hitch when
     * placing / breaking blocks, and when a peer's edit or a water-flow
     * tick arrives over the network) in exchange for a few more draw
     * calls. 32 is the historical baseline; 128 cuts per-edit mesh work
     * roughly 4x. Clamped to [1, RENDER_CHUNK_COUNT_MAX] at load. */
    pub mesh_chunk_count: i32,
    /* Wall-clock budget, in milliseconds, for rebuilding dirty chunks
     * per frame. A flood of edits (a peer carpet-building, water
     * flooding across many chunks) rebuilds at most this many ms worth
     * of chunks per frame and rolls the rest to subsequent frames, so
     * the frame never stalls. At least one chunk is always rebuilt, so
     * progress is guaranteed no matter how small this is. */
    pub mesh_remesh_budget_ms: f32,
    /* Multiplier on each chunk's angular radius when deciding chunk
     * visibility on the sphere. 1.0 culls exactly at the chunk's
     * Voronoi cap; >1 pads the kept region so chunks straddling the
     * horizon don't pop out. The cap half-angle is derived from
     * mesh_chunk_count, so this factor stays constant as granularity
     * changes. */
    pub mesh_cull_pad_factor: f32,
}

/* Per-tileset distant-LOD palette defaults. Index order matches
 * tileset_t (EARTH, SEQUOIA, CRAG, FROST, ASTEROID). ASTEROID and
 * barren-rock tilesets have water_color filled in even though those
 * bodies set has_water=false - the sampler only consults the water
 * entry when the column actually contains BLOCK_WATER. */
pub const LOD_DEFAULTS: LodConfig = LodConfig {
    distant_subdivisions: 2,
    distant_shade_floor: 0.65,
    distant_shade_ceiling: 1.20,
    distant_shade_range_m: 50.0,
    distant_rim_color: v3(0.35, 0.55, 1.0),
    distant_rim_power: 3.0,
    distant_rim_intensity: 0.9,
    distant_rim_floor: 0.25,
    distant_ambient: 0.06,
    tileset_water_color: [
        v3(0.10, 0.28, 0.55), /* EARTH    - open-ocean blue          */
        v3(0.16, 0.42, 0.34), /* SEQUOIA  - alien greenish water     */
        v3(0.55, 0.30, 0.18), /* CRAG     - rusty (no water in game) */
        v3(0.45, 0.65, 0.85), /* FROST    - pale glacial blue        */
        v3(0.20, 0.20, 0.22), /* ASTEROID - placeholder              */
    ],
    tileset_lowland_tint: [
        v3(0.85, 0.80, 0.65), /* EARTH    - sandy / dry coast        */
        v3(0.75, 0.85, 0.55), /* SEQUOIA  - yellow-green lowland     */
        v3(0.95, 0.55, 0.35), /* CRAG     - bright rust basin        */
        v3(0.85, 0.95, 1.00), /* FROST    - pale ice basin           */
        v3(0.60, 0.55, 0.50), /* ASTEROID - warm grey                */
    ],
    tileset_peak_tint: [
        v3(1.05, 1.05, 1.10), /* EARTH    - slightly cool snowy peak */
        v3(1.00, 0.95, 0.80), /* SEQUOIA  - warm peak                */
        v3(0.70, 0.45, 0.35), /* CRAG     - dark red ridge           */
        v3(1.10, 1.15, 1.20), /* FROST    - bright icy ridge         */
        v3(0.75, 0.72, 0.70), /* ASTEROID - cool grey                */
    ],
    tileset_water_full_depth_m: [4.0, 4.0, 4.0, 4.0, 4.0],
    /* Per-tileset close-up water deep_color + absorption. EARTH stays
     * on the global water_config defaults (zero sentinel). SEQUOIA
     * gets a saturated alien-green saturation tone + green-leaning
     * absorption. */
    tileset_water_deep_color: [
        VEC3_ZERO,            /* EARTH    - use global default       */
        v3(0.03, 0.16, 0.09), /* SEQUOIA  - dark green (Tenebris-magnitude, mirrored) */
        VEC3_ZERO,            /* CRAG     - no water (use global)    */
        VEC3_ZERO,            /* FROST    - pale ice (use global)    */
        VEC3_ZERO,            /* ASTEROID - use global default       */
    ],
    tileset_water_absorption: [
        VEC3_ZERO,            /* EARTH    - use global (0.60, 0.20, 0.10) */
        v3(0.60, 0.10, 0.45), /* SEQUOIA  - green survives (Tenebris-magnitude, not opaque) */
        VEC3_ZERO,            /* CRAG     - no water                      */
        VEC3_ZERO,            /* FROST    - use global                    */
        VEC3_ZERO,            /* ASTEROID - use global                    */
    ],
    tileset_water_sky_horizon: [
        VEC3_ZERO,            /* EARTH    - use global (0.85, 0.92, 0.98) */
        v3(0.55, 0.85, 0.60), /* SEQUOIA  - green sea mirror              */
        VEC3_ZERO,            /* CRAG     - no water                      */
        VEC3_ZERO,            /* FROST    - use global                    */
        VEC3_ZERO,            /* ASTEROID - use global                    */
    ],
    tileset_water_sky_zenith: [
        VEC3_ZERO,            /* EARTH    - use global (0.35, 0.55, 0.85) */
        v3(0.12, 0.40, 0.25), /* SEQUOIA  - deep green zenith             */
        VEC3_ZERO,            /* CRAG     - no water                      */
        VEC3_ZERO,            /* FROST    - use global                    */
        VEC3_ZERO,            /* ASTEROID - use global                    */
    ],
    tileset_water_sky_strength: [
        0.0, /* EARTH    - use global 0.5                              */
        0.0, /* SEQUOIA  - use global 0.5 too (mirror works on Tenebris) */
        0.0, /* CRAG     - no water                                    */
        0.0, /* FROST    - use global                                  */
        0.0, /* ASTEROID - use global                                  */
    ],
    tileset_water_fog_scale: [
        1.0,  /* EARTH    - full fog: blue water fogging to blue sky is fine */
        0.15, /* SEQUOIA  - barely fog the water: keep its green vs the
               * orange/red sky (the sea inherits sky colour otherwise) */
        1.0,  /* CRAG     - no water                                    */
        1.0,  /* FROST    - full fog                                    */
        1.0,  /* ASTEROID - full fog                                    */
    ],
    tileset_water_fog_color: [
        VEC3_ZERO,            /* EARTH    - use live sky-matched fog      */
        v3(0.12, 0.28, 0.18), /* SEQUOIA  - green-grey haze: far water
                               * stays green in-atmosphere instead of
                               * inheriting the orange/red dusk sky       */
        VEC3_ZERO,            /* CRAG     - no water                      */
        VEC3_ZERO,            /* FROST    - use live sky-matched fog      */
        VEC3_ZERO,            /* ASTEROID - use live sky-matched fog      */
    ],
    tileset_rim_color: [
        VEC3_ZERO,            /* EARTH    - use global blue rim           */
        v3(0.80, 0.55, 0.30), /* SEQUOIA  - hazy brown limb light         */
        VEC3_ZERO,            /* CRAG     - use global                    */
        VEC3_ZERO,            /* FROST    - use global                    */
        VEC3_ZERO,            /* ASTEROID - use global                    */
    ],
    gravity_full_mult: 1.4,
    gravity_falloff_mult: 1.8,
    roll_slerp_duration_s: 3.0,
    roll_slerp_speed: 0.8,
    space_thrust: 15.0,
    space_drag: 1.21, /* exp(-1.21) ~ 0.30 ~ JS *=0.98^60 */
    space_roll_speed: 2.0,
    jump_velocity_mps: 12.0,
    jetpack_hold_threshold_s: 0.5,
    jetpack_accel_mps2: 42.0,
    jetpack_max_vy_mps: 14.0,
    jetpack_max_fuel_s: 3.0,
    jetpack_recharge_time_s: 1.0,
    jetpack_idle_before_recharge_s: 2.0,
    player_height_m: 1.8,
    step_height_m: 0.6,
    camera_collider_radius_m: 0.4,
    water_gravity_mult: 0.30,
    water_drag_per_s: 3.0,
    water_movement_mult: 0.50,
    water_swim_force_mps2: 20.0,
    water_surface_float_height_m: -0.8,
    water_body_check_height_m: 0.50,
    water_submerged_jump_mult: 0.30,
    mesh_chunk_count: 128,
    mesh_remesh_budget_ms: 4.0,
    mesh_cull_pad_factor: 1.55,
};

impl Default for LodConfig {
    fn default() -> Self {
        LOD_DEFAULTS
    }
}

static S_LOD: Mutex<LodConfig> = Mutex::new(LOD_DEFAULTS);

/// Port of `config_lod()`.
pub fn lod() -> LodConfig {
    *S_LOD.lock().unwrap()
}

/// Port of `tileset_section_index`: map a YAML section name (e.g.
/// "earth", "sequoia") to the matching tileset index for the
/// per-tileset palette tables. Returns -1 for any non-tileset section
/// (e.g. "lod") so the parser knows it's a top-level section header
/// rather than a palette section.
fn tileset_section_index(key: &str) -> i32 {
    match key {
        "earth" => 0,    /* TILESET_EARTH    */
        "sequoia" => 1,  /* TILESET_SEQUOIA  */
        "crag" => 2,     /* TILESET_CRAG     */
        "frost" => 3,    /* TILESET_FROST    */
        "asteroid" => 4, /* TILESET_ASTEROID */
        _ => -1,
    }
}

/// Port of `config_load_lod()`.
pub fn load_lod(path: &str) -> i32 {
    match slurp_file(path) {
        None => {
            println!("[config] {} not found, using compiled-in lod defaults", path);
            -1
        }
        Some(src) => parse_lod(&src, path),
    }
}

/// Body of `config_load_lod()` after the file slurp.
pub fn parse_lod(src: &str, path: &str) -> i32 {
    let mut cfg = S_LOD.lock().unwrap();
    /* active_tileset tracks the most recent palette section we entered
     * (-1 = top-level "lod" section / no palette section). Field
     * assignments under a palette section write into the indexed slot
     * of the per-tileset arrays. */
    let mut active_tileset: i32 = -1;
    let parse_errors = scan(src, path, |line_no, key, val| {
        if val.is_empty() {
            /* Section header - could be "lod:" (top level) or a
             * tileset palette section. */
            active_tileset = tileset_section_index(key); /* -1 for "lod" */
            return 0;
        }
        if active_tileset >= 0 {
            /* Palette section field. */
            let ts = active_tileset as usize;
            return match key {
                "water_color" => vec3_or_err(val, &mut cfg.tileset_water_color[ts]),
                "lowland_tint" => vec3_or_err(val, &mut cfg.tileset_lowland_tint[ts]),
                "peak_tint" => vec3_or_err(val, &mut cfg.tileset_peak_tint[ts]),
                "water_full_depth_m" => {
                    cfg.tileset_water_full_depth_m[ts] = fval(val);
                    0
                }
                "water_deep_color" => vec3_or_err(val, &mut cfg.tileset_water_deep_color[ts]),
                "water_absorption" => vec3_or_err(val, &mut cfg.tileset_water_absorption[ts]),
                "water_sky_horizon" => vec3_or_err(val, &mut cfg.tileset_water_sky_horizon[ts]),
                "water_sky_zenith" => vec3_or_err(val, &mut cfg.tileset_water_sky_zenith[ts]),
                "water_sky_strength" => {
                    cfg.tileset_water_sky_strength[ts] = fval(val);
                    0
                }
                "water_fog_scale" => {
                    cfg.tileset_water_fog_scale[ts] = fval(val);
                    0
                }
                "water_fog_color" => vec3_or_err(val, &mut cfg.tileset_water_fog_color[ts]),
                "rim_color" => vec3_or_err(val, &mut cfg.tileset_rim_color[ts]),
                _ => {
                    println!("[config] {}:{}: unknown palette key '{}'", path, line_no, key);
                    0
                }
            };
        }
        match key {
            "distant_subdivisions" => {
                let mut n = ival(val);
                if n < 0 {
                    n = 0;
                }
                if n > 3 {
                    n = 3; /* cap so the upper-bound vertex/index
                            * buffers in renderer.c stay sized */
                }
                cfg.distant_subdivisions = n;
                0
            }
            "distant_shade_floor" => {
                cfg.distant_shade_floor = fval(val);
                0
            }
            "distant_shade_ceiling" => {
                cfg.distant_shade_ceiling = fval(val);
                0
            }
            "distant_shade_range_m" => {
                cfg.distant_shade_range_m = fval(val);
                0
            }
            "distant_rim_color" => vec3_or_err(val, &mut cfg.distant_rim_color),
            "distant_rim_power" => {
                cfg.distant_rim_power = fval(val);
                0
            }
            "distant_rim_intensity" => {
                cfg.distant_rim_intensity = fval(val);
                0
            }
            "distant_rim_floor" => {
                cfg.distant_rim_floor = fval(val);
                0
            }
            "distant_ambient" => {
                cfg.distant_ambient = fval(val);
                0
            }
            "gravity_full_mult" => {
                cfg.gravity_full_mult = fval(val);
                0
            }
            "gravity_falloff_mult" => {
                cfg.gravity_falloff_mult = fval(val);
                0
            }
            "roll_slerp_duration_s" => {
                cfg.roll_slerp_duration_s = fval(val);
                0
            }
            "roll_slerp_speed" => {
                cfg.roll_slerp_speed = fval(val);
                0
            }
            "space_thrust" => {
                cfg.space_thrust = fval(val);
                0
            }
            "space_drag" => {
                cfg.space_drag = fval(val);
                0
            }
            "space_roll_speed" => {
                cfg.space_roll_speed = fval(val);
                0
            }
            "jump_velocity_mps" => {
                cfg.jump_velocity_mps = fval(val);
                0
            }
            "jetpack_hold_threshold_s" => {
                cfg.jetpack_hold_threshold_s = fval(val);
                0
            }
            "jetpack_accel_mps2" => {
                cfg.jetpack_accel_mps2 = fval(val);
                0
            }
            "jetpack_max_vy_mps" => {
                cfg.jetpack_max_vy_mps = fval(val);
                0
            }
            "jetpack_max_fuel_s" => {
                cfg.jetpack_max_fuel_s = fval(val);
                0
            }
            "jetpack_recharge_time_s" => {
                cfg.jetpack_recharge_time_s = fval(val);
                0
            }
            "jetpack_idle_before_recharge_s" => {
                cfg.jetpack_idle_before_recharge_s = fval(val);
                0
            }
            "player_height_m" => {
                cfg.player_height_m = fval(val);
                0
            }
            "step_height_m" => {
                cfg.step_height_m = fval(val);
                0
            }
            "camera_collider_radius_m" => {
                cfg.camera_collider_radius_m = fval(val);
                0
            }
            "water_gravity_mult" => {
                cfg.water_gravity_mult = fval(val);
                0
            }
            "water_drag_per_s" => {
                cfg.water_drag_per_s = fval(val);
                0
            }
            "water_movement_mult" => {
                cfg.water_movement_mult = fval(val);
                0
            }
            "water_swim_force_mps2" => {
                cfg.water_swim_force_mps2 = fval(val);
                0
            }
            "water_surface_float_height_m" => {
                cfg.water_surface_float_height_m = fval(val);
                0
            }
            "water_body_check_height_m" => {
                cfg.water_body_check_height_m = fval(val);
                0
            }
            "water_submerged_jump_mult" => {
                cfg.water_submerged_jump_mult = fval(val);
                0
            }
            "mesh_chunk_count" => {
                cfg.mesh_chunk_count = ival(val);
                0
            }
            "mesh_remesh_budget_ms" => {
                cfg.mesh_remesh_budget_ms = fval(val);
                0
            }
            "mesh_cull_pad_factor" => {
                cfg.mesh_cull_pad_factor = fval(val);
                0
            }
            _ => {
                println!("[config] {}:{}: unknown key '{}'", path, line_no, key);
                0
            }
        }
    });
    drop(cfg);
    finish(path, parse_errors)
}

/* ------------------------------------------------------------------------ */
/* Water config - compiled-in defaults overridable via water.yaml.
 * Defaults match the inline literals body_draw_water + hex_mesher had
 * before the YAML extraction; the YAML override is a pure tuning
 * surface, not a behaviour change. */

/// Port of `water_config_t`. Water surface + refraction tuning - every
/// knob the cap shader and mesh-build code consume. See the C header
/// for the full per-field commentary.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct WaterConfig {
    /* Animation: subjective-time multiplier on R.time_seconds. */
    pub time_scale: f32,
    /* Vertical drop of the cap below sea level (mesh-build time). */
    pub depth_offset_m: f32,
    /* Creative water-level offset, additive on top of depth_offset_m. */
    pub height_offset_m: f32,
    /* Refraction: scalar on the surface tangent gradient. */
    pub refract_amount: f32,
    /* Max |screen-UV offset| of the refraction sample. The rain-ripple
     * kernel spikes the gradient to ~8x the fbm waves; uncapped, the
     * "refracted" sample lands on the SKY a third of a screen away and
     * paints the sheet sky-colour (glaring on Sequoia orange-over-green,
     * invisible on Tenebris blue-on-blue). */
    pub refract_max_uv: f32,
    /* Cap on |tangent gradient| before it bends the shading normal -
     * spikes past this flipped the normal into the tangent plane and
     * Schlick-mirrored the whole sheet. Foam reads the raw gradient. */
    pub slope_max: f32,
    /* Ceiling on the water pass's distance-fog mix. 1.0 = the far sheet
     * may fully become the sky; <1 keeps a sliver of water colour at
     * the horizon so the sea never reads as despawned into the limb. */
    pub fog_max: f32,
    /* Beer-Lambert per-channel extinction (1/m). */
    pub absorption: Vec3,
    /* Saturation colour of deep water. */
    pub deep_color: Vec3,
    /* Alpha smoothstep upper edge in metres at the shoreline. */
    pub shoreline_fade_m: f32,
    /* Sun-highlight specular. */
    pub specular_intensity: f32,
    pub specular_power: f32,
    pub sun_tint: Vec3,

    /* Wave-crest + slope foam. */
    pub foam_crest_lo: f32, /* smoothstep on fbm height [-1, +1] */
    pub foam_crest_hi: f32,
    pub foam_crest_weight: f32,
    pub foam_slope_lo: f32, /* smoothstep on |tangent gradient| */
    pub foam_slope_hi: f32,
    pub foam_slope_weight: f32,
    pub foam_intensity: f32, /* final mix strength toward foam_color */
    pub foam_color: Vec3,

    /* Sky reflection palette. */
    pub sky_horizon_color: Vec3, /* bright tone where the reflected ray skims horizontal */
    pub sky_zenith_color: Vec3,  /* darker tone where the reflected ray points straight up */
    pub sky_horizon_strength: f32,

    /* Wave shape - vertex-shader swell + fragment-shader ripple. */
    pub swell_amplitude: f32,
    pub swell_frequency: f32,
    pub swell_speed: f32,
    pub ripple_scale: f32,
    pub ripple_speed: f32,
    pub wave_steepness: f32,

    /* Mobile-only horizon haze. */
    pub horizon_fade_m: f32,
    pub horizon_fade_strength: f32,

    /* Underwater post-process. */
    pub underwater_distortion: f32,
    pub wet_fade_band_m: f32,
    /// Depth-blur strength for the wet FX (rain + just-surfaced): how
    /// much the DISTANT background softens. 0 = off, ~0.25 = subtle.
    /// (The composite reads this as the blur blend amount.)
    pub wet_blur: f32,
    /// Half-height (m) of the band around the mean sea surface within which
    /// the camera counts as "partially submerged" (straddling the surface):
    /// the eye must be within +/- this of the water surface AND water must be
    /// present at the eye. Keeps the lens wet with drips above the waterline
    /// while straddling, but dry when merely walking along a shoreline a metre
    /// above the water. Also the depth of the water-presence probe below the
    /// eye.
    pub partial_band_m: f32,
}

pub const WATER_DEFAULTS: WaterConfig = WaterConfig {
    time_scale: 0.75,
    depth_offset_m: 0.50,
    height_offset_m: 0.00,
    refract_amount: 0.04,
    refract_max_uv: 0.03,
    slope_max: 1.6,
    fog_max: 0.82,
    absorption: v3(0.60, 0.20, 0.10),
    deep_color: v3(0.02, 0.10, 0.22),
    shoreline_fade_m: 0.50,
    specular_intensity: 0.60,
    specular_power: 140.0,
    sun_tint: v3(1.35, 1.25, 1.10),
    foam_crest_lo: 0.35,
    foam_crest_hi: 0.60,
    foam_crest_weight: 0.55,
    foam_slope_lo: 0.50,
    foam_slope_hi: 1.20,
    foam_slope_weight: 0.45,
    foam_intensity: 0.60,
    foam_color: v3(0.95, 0.97, 1.00),
    sky_horizon_color: v3(0.85, 0.92, 0.98),
    sky_zenith_color: v3(0.35, 0.55, 0.85),
    sky_horizon_strength: 1.0,
    swell_amplitude: 1.0,
    swell_frequency: 1.0,
    swell_speed: 1.0,
    ripple_scale: 1.0,
    ripple_speed: 1.0,
    wave_steepness: 0.65,
    underwater_distortion: 0.006,
    wet_fade_band_m: 0.5,
    wet_blur: 0.22,
    partial_band_m: 0.8,
    horizon_fade_m: 600.0,
    horizon_fade_strength: 0.55,
};

impl Default for WaterConfig {
    fn default() -> Self {
        WATER_DEFAULTS
    }
}

static S_WATER: Mutex<WaterConfig> = Mutex::new(WATER_DEFAULTS);

/// Port of `config_water()`.
pub fn water() -> WaterConfig {
    *S_WATER.lock().unwrap()
}

/// Port of `water_flow_config_t`. Per-voxel water-flow automaton
/// tuning - feeds the simulation in core/world_water, not the renderer.
/// Parsed out of the same water.yaml file (flat `flow_*` keys under the
/// top `water:` header). See the C header for per-field commentary.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct WaterFlowConfig {
    /* Source / level mechanics. */
    pub max_level: i32,
    pub search_radius: i32,
    pub ticks_per_step: i32,
    pub max_ticks_per_step: i32,
    pub queue_capacity: i32,
    pub source_min_nbrs: i32,
    pub persist_falling: i32,

    /* Visual knobs - read by the mesher / shader. */
    pub uv_speed_falling: f32,
    pub uv_speed_per_level: f32,
    pub min_film_fraction: f32,
    pub cap_curve_power: f32,

    /* Per-body cap on chunk remeshes per frame. */
    pub max_chunks_remesh_per_frame: i32,
}

/* Per-voxel water-flow automaton defaults. Mirror the constants the
 * step-1 world_water module shipped with so behaviour is unchanged when
 * no YAML override is present. */
pub const WATER_FLOW_DEFAULTS: WaterFlowConfig = WaterFlowConfig {
    /* 3-hex spread radius - hex topology with 6-way neighbours already
     * covers 37 cells at radius 3, so going wider floods the world from
     * a single source. YAML can override up to 7. */
    max_level: 3,
    search_radius: 4,
    /* 10 = 2 Hz at MP tick_hz=20. Visibly paced spread + lower
     * per-second remesh churn than the MC-parity 5. */
    ticks_per_step: 10,
    max_ticks_per_step: 256,
    queue_capacity: 4096,
    source_min_nbrs: 2,
    persist_falling: 0,
    uv_speed_falling: 1.0,
    uv_speed_per_level: 0.25,
    min_film_fraction: 0.12,
    cap_curve_power: 2.0,
    max_chunks_remesh_per_frame: 1,
};

impl Default for WaterFlowConfig {
    fn default() -> Self {
        WATER_FLOW_DEFAULTS
    }
}

static S_WATER_FLOW: Mutex<WaterFlowConfig> = Mutex::new(WATER_FLOW_DEFAULTS);

/// Port of `config_water_flow()`.
pub fn water_flow() -> WaterFlowConfig {
    *S_WATER_FLOW.lock().unwrap()
}

/// Port of `config_load_water()`.
pub fn load_water(path: &str) -> i32 {
    match slurp_file(path) {
        None => {
            println!("[config] {} not found, using compiled-in water defaults", path);
            -1
        }
        Some(src) => parse_water(&src, path),
    }
}

/// Body of `config_load_water()` after the file slurp. Writes both the
/// cap-shader config and the flow-automaton config (the C version
/// rewrites both globals from the one file).
pub fn parse_water(src: &str, path: &str) -> i32 {
    let mut cfg = S_WATER.lock().unwrap();
    let mut flow = S_WATER_FLOW.lock().unwrap();
    let parse_errors = scan(src, path, |line_no, key, val| {
        if val.is_empty() {
            /* "water:" header - single-section file, ignored */
            return 0;
        }
        match key {
            "time_scale" => {
                cfg.time_scale = fval(val);
                0
            }
            "depth_offset_m" => {
                cfg.depth_offset_m = fval(val);
                0
            }
            "height_offset_m" => {
                cfg.height_offset_m = fval(val);
                0
            }
            "refract_amount" => {
                cfg.refract_amount = fval(val);
                0
            }
            "refract_max_uv" => {
                cfg.refract_max_uv = fval(val);
                0
            }
            "slope_max" => {
                cfg.slope_max = fval(val);
                0
            }
            "fog_max" => {
                cfg.fog_max = fval(val);
                0
            }
            "absorption" => vec3_or_err(val, &mut cfg.absorption),
            "deep_color" => vec3_or_err(val, &mut cfg.deep_color),
            "shoreline_fade_m" => {
                cfg.shoreline_fade_m = fval(val);
                0
            }
            "specular_intensity" => {
                cfg.specular_intensity = fval(val);
                0
            }
            "specular_power" => {
                cfg.specular_power = fval(val);
                0
            }
            "sun_tint" => vec3_or_err(val, &mut cfg.sun_tint),
            "foam_crest_lo" => {
                cfg.foam_crest_lo = fval(val);
                0
            }
            "foam_crest_hi" => {
                cfg.foam_crest_hi = fval(val);
                0
            }
            "foam_crest_weight" => {
                cfg.foam_crest_weight = fval(val);
                0
            }
            "foam_slope_lo" => {
                cfg.foam_slope_lo = fval(val);
                0
            }
            "foam_slope_hi" => {
                cfg.foam_slope_hi = fval(val);
                0
            }
            "foam_slope_weight" => {
                cfg.foam_slope_weight = fval(val);
                0
            }
            "foam_intensity" => {
                cfg.foam_intensity = fval(val);
                0
            }
            "foam_color" => vec3_or_err(val, &mut cfg.foam_color),
            "sky_horizon_color" => vec3_or_err(val, &mut cfg.sky_horizon_color),
            "sky_zenith_color" => vec3_or_err(val, &mut cfg.sky_zenith_color),
            "sky_horizon_strength" => {
                cfg.sky_horizon_strength = fval(val);
                0
            }
            "swell_amplitude" => {
                cfg.swell_amplitude = fval(val);
                0
            }
            "swell_frequency" => {
                cfg.swell_frequency = fval(val);
                0
            }
            "swell_speed" => {
                cfg.swell_speed = fval(val);
                0
            }
            "ripple_scale" => {
                cfg.ripple_scale = fval(val);
                0
            }
            "ripple_speed" => {
                cfg.ripple_speed = fval(val);
                0
            }
            "wave_steepness" => {
                cfg.wave_steepness = fval(val);
                0
            }
            "underwater_distortion" => {
                cfg.underwater_distortion = fval(val);
                0
            }
            "wet_blur" => {
                cfg.wet_blur = fval(val);
                0
            }
            "wet_fade_band_m" => {
                cfg.wet_fade_band_m = fval(val);
                0
            }
            "partial_band_m" => {
                cfg.partial_band_m = fval(val);
                0
            }
            "horizon_fade_m" => {
                cfg.horizon_fade_m = fval(val);
                0
            }
            "horizon_fade_strength" => {
                cfg.horizon_fade_strength = fval(val);
                0
            }

            /* ---- Per-voxel water-flow automaton (WaterFlowConfig).
             * Flat keys under the top water: header, prefixed flow_* so
             * they group visually with the existing shader knobs. */
            "flow_max_level" => {
                flow.max_level = ival(val);
                0
            }
            "flow_search_radius" => {
                flow.search_radius = ival(val);
                0
            }
            "flow_ticks_per_step" => {
                flow.ticks_per_step = ival(val);
                0
            }
            "flow_max_ticks_per_step" => {
                flow.max_ticks_per_step = ival(val);
                0
            }
            "flow_queue_capacity" => {
                flow.queue_capacity = ival(val);
                0
            }
            "flow_source_min_nbrs" => {
                flow.source_min_nbrs = ival(val);
                0
            }
            "flow_persist_falling" => {
                flow.persist_falling = ival(val);
                0
            }
            "flow_uv_speed_falling" => {
                flow.uv_speed_falling = fval(val);
                0
            }
            "flow_uv_speed_per_level" => {
                flow.uv_speed_per_level = fval(val);
                0
            }
            "flow_min_film_fraction" => {
                flow.min_film_fraction = fval(val);
                0
            }
            "flow_cap_curve_power" => {
                flow.cap_curve_power = fval(val);
                0
            }
            "flow_max_chunks_remesh_per_frame" => {
                flow.max_chunks_remesh_per_frame = ival(val);
                0
            }
            _ => {
                println!("[config] {}:{}: unknown key '{}'", path, line_no, key);
                0
            }
        }
    });
    drop(cfg);
    drop(flow);
    finish(path, parse_errors)
}

/* ------------------------------------------------------------------------ */
/* Lighting config - terrain day/night terminator. Compiled-in defaults
 * match the JS terrain.frag (`smoothstep(-0.1, 0.3, ...)` + 10 % night
 * ambient floor); lighting.yaml overrides them. */

/// Port of `lighting_config_t`. See the C header for the full per-field
/// commentary.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct LightingConfig {
    /* Ambient floor on the night side of the terminator, as a fraction
     * of the full-day ambient. */
    pub night_ambient_floor: f32,
    /* Smoothstep range applied to the surface-dir . sun-dir dot. */
    pub terminator_lo: f32,
    pub terminator_hi: f32,

    /* Torch tint multiplied by the per-vertex v_torch_light bake. */
    pub torch_color: Vec3,
    /* Global intensity scalar applied on top. */
    pub torch_intensity: f32,

    /* Per-vertex lighting backend selection: 0 = "column" (legacy),
     * 1 = "voxel" (propagated grid). */
    pub engine: i32,
    /* Maximum sky value seeded into open-sky air voxels. */
    pub voxel_sky_max: i32,
    /* Block light emitted by a single torch at its anchor voxel. */
    pub voxel_torch_emission: i32,
    /* Sky-light attenuation per LATERAL step in the BFS. */
    pub voxel_sky_lateral_loss: i32,
    /* Per-frame cap on BFS pop operations in world_light_rebuild. */
    pub voxel_rebuild_ops_per_frame: i32,

    /* Emissive glow billboards drawn at every light - the far-LOD
     * stand-in for the baked per-vertex torch light, so bases read as
     * warm dots from orbit (past the 5 km chunk cutoff and on remote
     * bodies). */
    /* Billboard half-size floor, metres (close-range halo). */
    pub glow_min_size_m: f32,
    /* Extra half-size per metre of camera distance - keeps the dot a
     * few pixels wide no matter how far away it is. */
    pub glow_size_per_m: f32,
    /* Glow strength in daylight / at night (night wins the look). */
    pub glow_alpha_day: f32,
    pub glow_alpha_night: f32,
    /* Emissive tint. */
    pub glow_color: Vec3,
}

pub const LIGHTING_DEFAULTS: LightingConfig = LightingConfig {
    night_ambient_floor: 0.10,
    terminator_lo: -0.10,
    terminator_hi: 0.30,
    torch_color: v3(1.00, 0.70, 0.30),
    torch_intensity: 2.50,
    engine: 0, /* "column" - legacy path, no behaviour change */
    voxel_sky_max: 15,
    voxel_torch_emission: 14,
    /* 1 matches Minecraft's classic lateral falloff: no extra
     * attenuation beyond the per-step minus one. Higher values darken
     * cavities faster but also pull open-ground shadows away from
     * cliff bases. The yaml overrides this. */
    voxel_sky_lateral_loss: 1,
    /* 50 000 BFS pops per frame budgets the rebuild around 1-2 ms on
     * the wasm target; smaller values stretch the rebuild over more
     * frames at the cost of stale lighting for longer. */
    voxel_rebuild_ops_per_frame: 50000,
    glow_min_size_m: 0.35,
    glow_size_per_m: 0.004,
    glow_alpha_day: 0.10,
    glow_alpha_night: 0.85,
    glow_color: v3(1.00, 0.72, 0.35),
};

impl Default for LightingConfig {
    fn default() -> Self {
        LIGHTING_DEFAULTS
    }
}

static S_LIGHTING: Mutex<LightingConfig> = Mutex::new(LIGHTING_DEFAULTS);

/// Port of `config_lighting()`.
pub fn lighting() -> LightingConfig {
    *S_LIGHTING.lock().unwrap()
}

/// Port of `config_load_lighting()`.
pub fn load_lighting(path: &str) -> i32 {
    match slurp_file(path) {
        None => {
            println!("[config] {} not found, using compiled-in lighting defaults", path);
            -1
        }
        Some(src) => parse_lighting(&src, path),
    }
}

/// Body of `config_load_lighting()` after the file slurp.
pub fn parse_lighting(src: &str, path: &str) -> i32 {
    let mut cfg = S_LIGHTING.lock().unwrap();
    let parse_errors = scan(src, path, |line_no, key, val| {
        if val.is_empty() {
            /* "lighting:" wrapper - single section, ignored */
            return 0;
        }
        match key {
            "night_ambient_floor" => {
                cfg.night_ambient_floor = fval(val);
                0
            }
            "terminator_lo" => {
                cfg.terminator_lo = fval(val);
                0
            }
            "terminator_hi" => {
                cfg.terminator_hi = fval(val);
                0
            }
            "torch_color" => vec3_or_err(val, &mut cfg.torch_color),
            "glow_color" => vec3_or_err(val, &mut cfg.glow_color),
            "glow_min_size_m" => {
                cfg.glow_min_size_m = fval(val);
                0
            }
            "glow_size_per_m" => {
                cfg.glow_size_per_m = fval(val);
                0
            }
            "glow_alpha_day" => {
                cfg.glow_alpha_day = fval(val);
                0
            }
            "glow_alpha_night" => {
                cfg.glow_alpha_night = fval(val);
                0
            }
            "torch_intensity" => {
                cfg.torch_intensity = fval(val);
                0
            }
            "engine" => {
                /* Bareword: "column" / "voxel". Tolerates quotes if a
                 * YAML editor adds them. (Prefix match, like the C
                 * strncmp.) */
                let v = val
                    .strip_prefix('"')
                    .or_else(|| val.strip_prefix('\''))
                    .unwrap_or(val);
                if v.starts_with("voxel") {
                    cfg.engine = 1;
                    0
                } else if v.starts_with("column") {
                    cfg.engine = 0;
                    0
                } else {
                    println!(
                        "[config] {}:{}: engine must be 'column' or 'voxel', got '{}'",
                        path, line_no, val
                    );
                    1
                }
            }
            "voxel_sky_max" => {
                let mut n = ival(val);
                if n < 0 {
                    n = 0;
                }
                if n > 15 {
                    n = 15;
                }
                cfg.voxel_sky_max = n;
                0
            }
            "voxel_torch_emission" => {
                let mut n = ival(val);
                if n < 0 {
                    n = 0;
                }
                if n > 15 {
                    n = 15;
                }
                cfg.voxel_torch_emission = n;
                0
            }
            "voxel_sky_lateral_loss" => {
                let mut n = ival(val);
                if n < 1 {
                    n = 1;
                }
                if n > 15 {
                    n = 15;
                }
                cfg.voxel_sky_lateral_loss = n;
                0
            }
            "voxel_rebuild_ops_per_frame" => {
                let mut n = ival(val);
                /* Tiny budgets (< 1000) make the rebuild crawl;
                 * negative or zero would deadlock. Floor at 1000. */
                if n < 1000 {
                    n = 1000;
                }
                cfg.voxel_rebuild_ops_per_frame = n;
                0
            }
            _ => {
                println!("[config] {}:{}: unknown key '{}'", path, line_no, key);
                0
            }
        }
    });
    drop(cfg);
    finish(path, parse_errors)
}

/* ------------------------------------------------------------------------ */
/* Bonfire config - the flint-tier campfire (light + cook + fuel burn). */

/// Tunables for the bonfire block-entity (see core::block_entity). Burn
/// times set how long each wood-family fuel keeps the fire lit; the light
/// scales give the bonfire its "2x a torch" glow (radius + intensity)
/// through the client light bake.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct BonfireConfig {
    /// Seconds of burn per unit of each fuel.
    pub stick_burn_s: f32,
    pub log_burn_s: f32,
    pub charcoal_burn_s: f32,
    pub coal_burn_s: f32,
    /// Seconds to cook one input (raw meat / fish -> cooked, log -> charcoal).
    pub cook_time_s: f32,
    /// Light radius multiplier vs a torch (2.0 = twice the reach).
    pub light_radius_scale: f32,
    /// Light intensity multiplier vs a torch (2.0 = twice as bright).
    pub light_intensity_scale: f32,
}

pub const BONFIRE_DEFAULTS: BonfireConfig = BonfireConfig {
    stick_burn_s: 12.0,
    log_burn_s: 45.0,
    charcoal_burn_s: 90.0,
    coal_burn_s: 90.0,
    cook_time_s: 8.0,
    light_radius_scale: 2.0,
    light_intensity_scale: 2.0,
};

impl Default for BonfireConfig {
    fn default() -> Self {
        BONFIRE_DEFAULTS
    }
}

static S_BONFIRE: Mutex<BonfireConfig> = Mutex::new(BONFIRE_DEFAULTS);

/// Current bonfire tuning (compiled-in defaults until `load_bonfire`).
pub fn bonfire() -> BonfireConfig {
    *S_BONFIRE.lock().unwrap()
}

/// Load + install bonfire.yaml. Fields left at / set to their zero value
/// keep the compiled-in default, matching the other config parsers.
pub fn load_bonfire(path: &str) -> i32 {
    match slurp_file(path) {
        None => {
            println!("[config] {} not found, using compiled-in bonfire defaults", path);
            -1
        }
        Some(src) => parse_bonfire(&src, path),
    }
}

pub fn parse_bonfire(src: &str, path: &str) -> i32 {
    let mut cfg = S_BONFIRE.lock().unwrap();
    let parse_errors = scan(src, path, |line_no, key, val| {
        if val.is_empty() {
            return 0; /* section wrapper */
        }
        let v = fval(val);
        if v <= 0.0 {
            return 0; /* zero / negative keeps the compiled-in default */
        }
        match key {
            "stick_burn_s" => cfg.stick_burn_s = v,
            "log_burn_s" => cfg.log_burn_s = v,
            "charcoal_burn_s" => cfg.charcoal_burn_s = v,
            "coal_burn_s" => cfg.coal_burn_s = v,
            "cook_time_s" => cfg.cook_time_s = v,
            "light_radius_scale" => cfg.light_radius_scale = v,
            "light_intensity_scale" => cfg.light_intensity_scale = v,
            _ => {
                println!("[config] {}:{}: unknown key '{}'", path, line_no, key);
            }
        }
        0
    });
    drop(cfg);
    finish(path, parse_errors)
}

/* ------------------------------------------------------------------------ */
/* Atmosphere config - per-body patches applied to the planet table. */

/// Port of `body_atmo_t` (planet.h) - owned by `planet.rs` (the module
/// that ports planet.h), re-exported here because the atmosphere
/// parser below traffics in it. Zero-valued fields are skipped by
/// `planet::set_atmosphere` (so an empty patch is a no-op), letting
/// the YAML express partial overrides.
pub use crate::planet::BodyAtmo;

/// Port of `config_load_atmosphere()` with the planet hooks injected:
///
/// - `find_body_by_key(key)` maps a YAML section key (already trimmed;
///   the C side matched it against `normalise_name(body.name)`) to a
///   body id, or -1 for "unknown body" - the section is then warned
///   about and its fields silently skipped, exactly like C.
/// - `set_atmosphere(body_id, patch)` is `planet_set_atmosphere` - the
///   "> 0.0 per field" merge happens behind this callback.
pub fn load_atmosphere_with(
    path: &str,
    find_body_by_key: impl FnMut(&str) -> i32,
    set_atmosphere: impl FnMut(i32, &BodyAtmo),
) -> i32 {
    match slurp_file(path) {
        None => {
            println!(
                "[config] {} not found, using compiled-in atmosphere defaults",
                path
            );
            -1
        }
        Some(src) => parse_atmosphere_with(&src, path, find_body_by_key, set_atmosphere),
    }
}

/// Body of `config_load_atmosphere()` after the file slurp.
pub fn parse_atmosphere_with(
    src: &str,
    path: &str,
    mut find_body_by_key: impl FnMut(&str) -> i32,
    mut set_atmosphere: impl FnMut(i32, &BodyAtmo),
) -> i32 {
    let mut active_body: i32 = -1;
    let mut patch = BodyAtmo::ZERO;
    let parse_errors = scan(src, path, |line_no, key, val| {
        if val.is_empty() {
            /* Section header. Flush previous body's patch before
             * switching. */
            if active_body >= 0 {
                set_atmosphere(active_body, &patch);
                patch = BodyAtmo::ZERO;
            }
            active_body = find_body_by_key(key);
            if active_body < 0 {
                println!(
                    "[config] {}:{}: unknown body '{}' (skipping section)",
                    path, line_no, key
                );
            }
            0
        } else if active_body >= 0 {
            /* Field assignment. */
            match key {
                "enabled" => {
                    /* on/off toggle: 0 = off, anything else = on. */
                    patch.enabled = if fval(val) > 0.5 { 1.0 } else { 0.0 };
                    0
                }
                "radius_mult" => {
                    patch.radius_mult = fval(val);
                    0
                }
                "lower_radius_mult" => {
                    patch.lower_radius_mult = fval(val);
                    0
                }
                "rayleigh_scale" => {
                    patch.rayleigh_scale = fval(val);
                    0
                }
                "mie_scale" => {
                    patch.mie_scale = fval(val);
                    0
                }
                "sun_intensity" => {
                    patch.sun_intensity = fval(val);
                    0
                }
                "sunset_strength" => {
                    patch.sunset_strength = fval(val);
                    0
                }
                "scale_height" => {
                    patch.scale_height = fval(val);
                    0
                }
                "mie_g" => {
                    patch.mie_g = fval(val);
                    0
                }
                "wavelengths" => vec3_or_err(val, &mut patch.wavelengths),
                "sunset_tint" => vec3_or_err(val, &mut patch.sunset_tint),
                "sunset_glow" => vec3_or_err(val, &mut patch.sunset_glow),
                "sunset_horizon" => vec3_or_err(val, &mut patch.sunset_horizon),
                "fog_color" => vec3_or_err(val, &mut patch.fog_color),
                "fog_density" => {
                    patch.fog_density = fval(val);
                    0
                }
                "fog_height_m" => {
                    patch.fog_height_m = fval(val);
                    0
                }
                "cloud_max_height_m" => {
                    patch.cloud_max_height_m = fval(val);
                    0
                }
                _ => {
                    println!("[config] {}:{}: unknown key '{}'", path, line_no, key);
                    0
                }
            }
        } else {
            /* Fields under an unknown (or absent) section are silently
             * skipped - the warning fired at the section header. */
            0
        }
    });
    /* Flush the last body's patch. */
    if active_body >= 0 {
        set_atmosphere(active_body, &patch);
    }
    finish(path, parse_errors)
}

/* ------------------------------------------------------------------------ */
/* UI config — pixel-art sprite atlas layout consumed by client pixel_ui.
 * Defaults mirror the layout baked by tools/gen-ui-sprites.py so the
 * compiled-in values are usable even if assets/config/ui.yaml is missing
 * (and so the YAML can express partial overrides — any sprite whose
 * section is omitted falls back to the default below). */

/// Port of `ui_sprite_id_t`. Sprite ids are dense integers so callers
/// can hold one alongside a style struct without paying a name lookup
/// per frame. Add new sprites by extending the enum + the parser match
/// below; the YAML tolerates unknown sections so adding a sprite to the
/// file before adding the enum entry is non-fatal.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum UiSpriteId {
    Panel = 0,
    ButtonNormal,
    ButtonHover,
    ButtonPressed,
    ButtonDisabled,
    TitleBar,
    CloseX,
    SlotNormal,
    SlotHover,
    SlotSelected,
    SlotDisabled,
    ScrollbarTrack,
    ScrollbarThumb,
    ScrollArrowUp,
    ScrollArrowDown,
}

/// Port of `UI_SPRITE_COUNT`.
pub const UI_SPRITE_COUNT: usize = 15;

/// Port of `ui_sprite_t`.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Default)]
pub struct UiSprite {
    /* Sub-rect of the atlas, in texels (x, y, w, h). */
    pub x: i32,
    pub y: i32,
    pub w: i32,
    pub h: i32,
    /* Nine-slice margins in texels: left, right, top, bottom. All zero
     * means "blit 1:1 at native size", which the renderer treats as a
     * non-stretchable sprite (used for the close-X glyph). */
    pub left: i32,
    pub right: i32,
    pub top: i32,
    pub bottom: i32,
}

/// Shorthand for the default sprite table below (x, y, w, h, l, r, t, b).
#[allow(clippy::too_many_arguments)]
const fn spr(x: i32, y: i32, w: i32, h: i32, l: i32, r: i32, t: i32, b: i32) -> UiSprite {
    UiSprite { x, y, w, h, left: l, right: r, top: t, bottom: b }
}

/// Port of `ui_config_t`. The C `atlas_path` is a `char[128]` buffer;
/// the port uses a `String` (the parser still truncates writes at 127
/// bytes to keep the accepted surface identical).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct UiConfig {
    /// Relative path of the sprite atlas PNG. Default is
    /// "assets/textures/ui/default.png" — themed packs override it
    /// here.
    pub atlas_path: String,
    pub sprites: [UiSprite; UI_SPRITE_COUNT],
}

/// Port of `UI_ATLAS_PATH_MAX`.
pub const UI_ATLAS_PATH_MAX: usize = 128;

/// Port of the compiled-in `S_UI` initialiser (config.c). Index order
/// matches [`UiSpriteId`].
pub fn ui_defaults() -> UiConfig {
    UiConfig {
        atlas_path: "assets/textures/ui/default.png".to_string(),
        sprites: [
            spr(0, 0, 32, 32, 8, 8, 8, 8),     /* PANEL             */
            spr(32, 0, 24, 16, 4, 4, 4, 4),    /* BUTTON_NORMAL     */
            spr(56, 0, 24, 16, 4, 4, 4, 4),    /* BUTTON_HOVER      */
            spr(80, 0, 24, 16, 4, 4, 4, 4),    /* BUTTON_PRESSED    */
            spr(104, 0, 24, 16, 4, 4, 4, 4),   /* BUTTON_DISABLED   */
            spr(32, 16, 24, 16, 4, 4, 4, 4),   /* TITLE_BAR         */
            spr(56, 16, 12, 12, 0, 0, 0, 0),   /* CLOSE_X           */
            spr(0, 32, 18, 18, 3, 3, 3, 3),    /* SLOT_NORMAL       */
            spr(18, 32, 18, 18, 3, 3, 3, 3),   /* SLOT_HOVER        */
            spr(36, 32, 18, 18, 3, 3, 3, 3),   /* SLOT_SELECTED     */
            spr(54, 32, 18, 18, 3, 3, 3, 3),   /* SLOT_DISABLED     */
            spr(0, 64, 8, 16, 0, 0, 4, 4),     /* SCROLLBAR_TRACK   */
            spr(8, 64, 8, 16, 0, 0, 4, 4),     /* SCROLLBAR_THUMB   */
            spr(16, 64, 8, 8, 0, 0, 0, 0),     /* SCROLL_ARROW_UP   */
            spr(24, 64, 8, 8, 0, 0, 0, 0),     /* SCROLL_ARROW_DOWN */
        ],
    }
}

static S_UI: std::sync::LazyLock<Mutex<UiConfig>> =
    std::sync::LazyLock::new(|| Mutex::new(ui_defaults()));

/// Port of `config_ui()`. (The C API returns a stable pointer; here
/// callers get a snapshot clone, like the other config getters.)
pub fn ui() -> UiConfig {
    S_UI.lock().unwrap().clone()
}

/// Port of `ui_sprite_section_index`: sprite-section name -> dense
/// index. Returns -1 for non-sprite sections (the top-level "ui:"
/// wrapper) so the parser can route field assignments correctly.
fn ui_sprite_section_index(key: &str) -> i32 {
    match key {
        "panel" => UiSpriteId::Panel as i32,
        "button_normal" => UiSpriteId::ButtonNormal as i32,
        "button_hover" => UiSpriteId::ButtonHover as i32,
        "button_pressed" => UiSpriteId::ButtonPressed as i32,
        "button_disabled" => UiSpriteId::ButtonDisabled as i32,
        "title_bar" => UiSpriteId::TitleBar as i32,
        "close_x" => UiSpriteId::CloseX as i32,
        "slot_normal" => UiSpriteId::SlotNormal as i32,
        "slot_hover" => UiSpriteId::SlotHover as i32,
        "slot_selected" => UiSpriteId::SlotSelected as i32,
        "slot_disabled" => UiSpriteId::SlotDisabled as i32,
        "scrollbar_track" => UiSpriteId::ScrollbarTrack as i32,
        "scrollbar_thumb" => UiSpriteId::ScrollbarThumb as i32,
        "scroll_arrow_up" => UiSpriteId::ScrollArrowUp as i32,
        "scroll_arrow_down" => UiSpriteId::ScrollArrowDown as i32,
        _ => -1,
    }
}

/// Port of `config_load_ui()`.
pub fn load_ui(path: &str) -> i32 {
    match slurp_file(path) {
        None => {
            println!("[config] {} not found, using compiled-in ui defaults", path);
            -1
        }
        Some(src) => parse_ui(&src, path),
    }
}

/// Body of `config_load_ui()` after the file slurp.
pub fn parse_ui(src: &str, path: &str) -> i32 {
    let mut cfg = S_UI.lock().unwrap();
    /* active_sprite >= 0 means subsequent key/value lines apply to that
     * sprite. -1 means we're at the top level (the "ui:" wrapper). */
    let mut active_sprite: i32 = -1;
    let parse_errors = scan(src, path, |line_no, key, val| {
        if val.is_empty() {
            /* Section header — either "ui:" (top-level) or a per-sprite
             * section. */
            active_sprite = ui_sprite_section_index(key);
            if active_sprite < 0 && key != "ui" {
                println!("[config] {}:{}: unknown ui section '{}'", path, line_no, key);
            }
            0
        } else if active_sprite >= 0 {
            /* Per-sprite field. */
            let s = &mut cfg.sprites[active_sprite as usize];
            match key {
                "rect" => {
                    let mut v = [0i32; 4];
                    if parse_int4(val, &mut v) {
                        s.x = v[0];
                        s.y = v[1];
                        s.w = v[2];
                        s.h = v[3];
                        0
                    } else {
                        1
                    }
                }
                "nine_slice" => {
                    let mut v = [0i32; 4];
                    if parse_int4(val, &mut v) {
                        s.left = v[0];
                        s.right = v[1];
                        s.top = v[2];
                        s.bottom = v[3];
                        0
                    } else {
                        1
                    }
                }
                _ => {
                    println!("[config] {}:{}: unknown sprite key '{}'", path, line_no, key);
                    0
                }
            }
        } else {
            /* Top-level field (only "atlas" is defined). */
            if key == "atlas" {
                /* Strip any wrapping quotes a YAML editor might have
                 * added. */
                let mut v = val;
                if v.starts_with('"') || v.starts_with('\'') {
                    v = &v[1..];
                }
                if v.ends_with('"') || v.ends_with('\'') {
                    v = &v[..v.len() - 1];
                }
                /* C strncpy caps at UI_ATLAS_PATH_MAX - 1 bytes. */
                let n = v.len().min(UI_ATLAS_PATH_MAX - 1);
                cfg.atlas_path = v[..n].to_string();
            } else {
                println!("[config] {}:{}: unknown ui key '{}'", path, line_no, key);
            }
            0
        }
    });
    drop(cfg);
    finish(path, parse_errors)
}

/* ------------------------------------------------------------------------ */
/* time.yaml - global clock + on-rails orbit/day-night tuning.              */

/// Global time + orbit knobs (assets/config/time.yaml). All durations are
/// in *simulation* seconds; per-body rotation/orbit periods (in orbit.rs)
/// are expressed as multiples of `day_length_s` / `year_length_s` so this
/// one file sets the pace of the whole sky.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct TimeConfig {
    /// Simulation seconds advanced per real second (1.0 = real-time).
    pub time_scale: f32,
    /// Simulation seconds for one full rotation of the reference body
    /// (Tenebris) - i.e. one day/night cycle on the home world.
    pub day_length_s: f32,
    /// Simulation seconds for the reference body to orbit the star once.
    pub year_length_s: f32,
    /// Fraction of the day (0..1) the clock starts at on world load, so a
    /// fresh world opens in daylight rather than midnight. 0.25 ~ morning.
    pub start_day_fraction: f32,
}

const TIME_DEFAULTS: TimeConfig = TimeConfig {
    time_scale: 1.0,
    day_length_s: 480.0,
    year_length_s: 9600.0,
    /* The home spawn sits on the equator at world +X, so midday (sun
     * overhead) falls near 0.46 of the day - open the world there so a
     * fresh load greets the player in bright daylight, not twilight. */
    start_day_fraction: 0.46,
};

impl Default for TimeConfig {
    fn default() -> Self {
        TIME_DEFAULTS
    }
}

static S_TIME: Mutex<TimeConfig> = Mutex::new(TIME_DEFAULTS);

/// Current time/orbit config (a copy, like the other getters).
pub fn time() -> TimeConfig {
    *S_TIME.lock().unwrap()
}

/// Load time.yaml from disk (native). Missing file keeps the defaults.
pub fn load_time(path: &str) -> i32 {
    match slurp_file(path) {
        None => {
            println!("[config] {} not found, using compiled-in time defaults", path);
            -1
        }
        Some(src) => parse_time(&src, path),
    }
}

/// Parse time.yaml content (WASM preload path / tests).
pub fn parse_time(src: &str, path: &str) -> i32 {
    let mut cfg = S_TIME.lock().unwrap();
    let parse_errors = scan(src, path, |line_no, key, val| {
        if val.is_empty() {
            return 0; /* "time:" section header */
        }
        match key {
            "time_scale" => cfg.time_scale = fval(val),
            "day_length_s" => cfg.day_length_s = fval(val),
            "year_length_s" => cfg.year_length_s = fval(val),
            "start_day_fraction" => cfg.start_day_fraction = fval(val),
            _ => println!("[config] {}:{}: unknown time key '{}'", path, line_no, key),
        }
        0
    });
    drop(cfg);
    finish(path, parse_errors)
}

/* ------------------------------------------------------------------------ */
/* solar.yaml - solar-system scale + the sun's rendered disc.               */

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct SolarConfig {
    /// Distance from the home world (Tenebris) to the star, metres. The
    /// whole system scales with it: every star-orbiting body's structural
    /// orbit radius (see orbit::elements) is multiplied by
    /// sun_distance_m / Tenebris's structural radius, so the system keeps
    /// its shape while the star recedes.
    pub sun_distance_m: f32,
    /// Where the sun's DISC is drawn, metres from the active body's centre
    /// along the sun direction. Must sit inside the camera zfar (20 km) or
    /// the disc clips away; the disc is angular-size-correct for the real
    /// distance, so moving this knob doesn't change how big the sun looks.
    pub sun_visual_dist_m: f32,
    /// The star's "physical" radius, metres. Sets the sun's angular size:
    /// drawn radius = sun_radius_m * (sun_visual_dist_m / sun_distance_m).
    pub sun_radius_m: f32,
    /// The star's gravitational parameter GM (m^3/s^2) - the sun's pull in the
    /// heliocentric physics frame. Sets how fast a ship orbits the star:
    /// v_circ = sqrt(gm / r) at radius r. Tune for the desired interplanetary
    /// transfer speeds / orbital periods.
    pub sun_gravity_param: f32,

    /* ---- Sun surface shader (sun.fs.glsl) look knobs. ---- */
    /// Granule-core (hottest) colour. HDR-ish >1 values are fine.
    pub sun_color_hot: Vec3,
    /// Granule-lane (cooler) colour between convection cells.
    pub sun_color_cool: Vec3,
    /// Sunspot colour (darkest patches).
    pub sun_color_spot: Vec3,
    /// Granulation noise scale on the unit sphere (higher = finer cells).
    pub sun_granule_scale: f32,
    /// Churn animation speed (noise-field drift per second).
    pub sun_churn_speed: f32,
    /// Limb-darkening curve power (shapes the falloff toward the edge).
    pub sun_limb_power: f32,
    /// Limb-darkening strength 0..1 (0 = flat disc, 1 = black limb).
    pub sun_limb_strength: f32,
    /// Hot fresnel rim boost at the limb (the chromosphere flash).
    pub sun_rim_boost: f32,
    /// Sunspot field threshold 0..1 (higher = fewer spots).
    pub sun_spot_threshold: f32,
    /// Sunspot edge sharpness (smoothstep band width).
    pub sun_spot_sharpness: f32,
    /// Domain-warp amount for the granulation (0 = calm, 2 = boiling).
    pub sun_warp_amount: f32,
    /// Overall surface brightness multiplier.
    pub sun_brightness: f32,

    /* ---- 3D orbital map view (solar_map) camera knobs. ---- */
    /// Map camera far plane, metres. Must cover the whole system from a
    /// fully zoomed-out vantage (Frostbite orbits ~275 km out).
    pub map_zfar_m: f32,
    /// Closest approach to a focused BODY, as a multiple of its radius.
    pub map_min_dist_mult: f32,
    /// Closest approach when the SHIP is focused, metres.
    pub map_ship_min_dist_m: f32,
    /// Zoom-out ceiling, metres from the focus.
    pub map_max_dist_m: f32,
    /// Default camera distance when the map opens on the ship, metres.
    pub map_ship_default_dist_m: f32,
    /// Mouse-drag orbit sensitivity, radians per pixel.
    pub map_drag_sens: f32,
    /// Wheel zoom step multiplier per notch.
    pub map_zoom_step: f32,
    /// Debug: >0.5 shows a WARP (teleport) button on each map card, jumping
    /// the ship/player straight to that body or the station. 0 = hidden.
    pub map_teleport: f32,
}

const SOLAR_DEFAULTS: SolarConfig = SolarConfig {
    sun_distance_m: 150_000.0,
    sun_visual_dist_m: 18_000.0,
    /* 9 km at 150 km = 60 mrad angular radius (4x the first-pass 2250 m
     * disc) - a big, presence-heavy star that still reads as distant
     * thanks to the limb darkening. */
    sun_radius_m: 9_000.0,
    /* GM ~= v^2 * r. At Tenebris's 150 km orbit this gives v_circ ~= 50 m/s
     * (period ~5 h) - brisk enough to fly a transfer without warp, tunable. */
    sun_gravity_param: 3.75e8,
    sun_color_hot: Vec3 { x: 1.40, y: 1.25, z: 0.90 },
    sun_color_cool: Vec3 { x: 1.10, y: 0.55, z: 0.16 },
    sun_color_spot: Vec3 { x: 0.55, y: 0.22, z: 0.10 },
    sun_granule_scale: 7.0,
    sun_churn_speed: 0.03,
    sun_limb_power: 0.7,
    sun_limb_strength: 0.55,
    /* rim + brightness picked so the granulation survives the LDR
     * offscreen target: at 1.0 the HDR-ish colours all clip to white and
     * the surface reads as a flat disc (verified with the SUNCAM tool). */
    sun_rim_boost: 0.8,
    sun_spot_threshold: 0.68,
    sun_spot_sharpness: 0.08,
    sun_warp_amount: 1.6,
    sun_brightness: 0.7,
    map_zfar_m: 1_500_000.0,
    map_min_dist_mult: 2.5,
    map_ship_min_dist_m: 20.0,
    map_max_dist_m: 800_000.0,
    map_ship_default_dist_m: 300.0,
    map_drag_sens: 0.008,
    map_zoom_step: 1.25,
    map_teleport: 0.0,
};

static S_SOLAR: Mutex<SolarConfig> = Mutex::new(SOLAR_DEFAULTS);

/// Current solar-system config (a copy, like the other getters).
pub fn solar() -> SolarConfig {
    *S_SOLAR.lock().unwrap()
}

/// Load solar.yaml from disk (native). Missing file keeps the defaults.
pub fn load_solar(path: &str) -> i32 {
    match slurp_file(path) {
        None => {
            println!("[config] {} not found, using compiled-in solar defaults", path);
            -1
        }
        Some(src) => parse_solar(&src, path),
    }
}

/// Parse solar.yaml content (WASM preload path / tests). A field set to
/// zero (or omitted) keeps the compiled-in default.
pub fn parse_solar(src: &str, path: &str) -> i32 {
    let mut cfg = S_SOLAR.lock().unwrap();
    let parse_errors = scan(src, path, |line_no, key, val| {
        if val.is_empty() {
            return 0; /* "solar:" section header */
        }
        /* Colour fields are [r, g, b] lists; a failed parse keeps the
         * default (mirrors the per-field zero-keeps-default rule). */
        match key {
            "sun_color_hot" => return vec3_or_err(val, &mut cfg.sun_color_hot),
            "sun_color_cool" => return vec3_or_err(val, &mut cfg.sun_color_cool),
            "sun_color_spot" => return vec3_or_err(val, &mut cfg.sun_color_spot),
            _ => {}
        }
        let v = fval(val);
        if v == 0.0 {
            return 0; /* zero keeps the compiled-in default */
        }
        match key {
            "sun_distance_m" => cfg.sun_distance_m = v,
            "sun_visual_dist_m" => cfg.sun_visual_dist_m = v,
            "sun_radius_m" => cfg.sun_radius_m = v,
            "sun_gravity_param" => cfg.sun_gravity_param = v,
            "sun_granule_scale" => cfg.sun_granule_scale = v,
            "sun_churn_speed" => cfg.sun_churn_speed = v,
            "sun_limb_power" => cfg.sun_limb_power = v,
            "sun_limb_strength" => cfg.sun_limb_strength = v,
            "sun_rim_boost" => cfg.sun_rim_boost = v,
            "sun_spot_threshold" => cfg.sun_spot_threshold = v,
            "sun_spot_sharpness" => cfg.sun_spot_sharpness = v,
            "sun_warp_amount" => cfg.sun_warp_amount = v,
            "sun_brightness" => cfg.sun_brightness = v,
            "map_zfar_m" => cfg.map_zfar_m = v,
            "map_min_dist_mult" => cfg.map_min_dist_mult = v,
            "map_ship_min_dist_m" => cfg.map_ship_min_dist_m = v,
            "map_max_dist_m" => cfg.map_max_dist_m = v,
            "map_ship_default_dist_m" => cfg.map_ship_default_dist_m = v,
            "map_drag_sens" => cfg.map_drag_sens = v,
            "map_zoom_step" => cfg.map_zoom_step = v,
            "map_teleport" => cfg.map_teleport = v,
            _ => println!("[config] {}:{}: unknown solar key '{}'", path, line_no, key),
        }
        0
    });
    drop(cfg);
    finish(path, parse_errors)
}

/* ------------------------------------------------------------------------ */

#[cfg(test)]
mod tests {
    use super::*;

    /// The config globals are process-wide, so tests that touch them
    /// serialise on this lock and reset to defaults first.
    static TEST_LOCK: Mutex<()> = Mutex::new(());

    fn lock_and_reset() -> std::sync::MutexGuard<'static, ()> {
        let guard = TEST_LOCK.lock().unwrap_or_else(|e| e.into_inner());
        *S_SKY.lock().unwrap() = SKYBOX_DEFAULTS;
        *S_LOD.lock().unwrap() = LOD_DEFAULTS;
        *S_WATER.lock().unwrap() = WATER_DEFAULTS;
        *S_WATER_FLOW.lock().unwrap() = WATER_FLOW_DEFAULTS;
        *S_LIGHTING.lock().unwrap() = LIGHTING_DEFAULTS;
        *S_UI.lock().unwrap() = ui_defaults();
        guard
    }

    fn assert_vec3(v: Vec3, x: f32, y: f32, z: f32) {
        assert_eq!((v.x, v.y, v.z), (x, y, z));
    }

    /// Copy of the live sections of assets/config/atmosphere.yaml
    /// (comments and indentation included) so the test parses exactly
    /// what ships.
    const ATMOSPHERE_YAML: &str = r#"
# Per-body atmosphere config.
#
# Sections are matched case-insensitively against body names (the
# `name` field in planet.c). Spaces in body names ("Asteroid A") get
# folded to underscores for the YAML key.

tenebris:
  # Outer shell at 1.6 x planet radius
  radius_mult: 1.6
  # Sink the planet-clip sphere 10 % below the actual ground
  lower_radius_mult: 0.9
  sun_intensity: 9.0
  rayleigh_scale: 0.015
  mie_scale: 0.01
  mie_g: 0.85
  sunset_strength: 0.25
  scale_height: 0.25
  wavelengths: [5.602, 9.473, 19.644]
  sunset_tint: [1.3, 1.0, 0.6]
  sunset_glow: [1.0, 0.65, 0.25]
  sunset_horizon: [0.8, 0.4, 0.15]

# Sequoia - sister Earth-like, slightly greener tint.
sequoia:
  sun_intensity: 15.0
  rayleigh_scale: 0.8
  sunset_tint: [1.1, 1.3, 0.7]
  sunset_glow: [0.9, 1.0, 0.45]

# Add other has_water=true bodies here.
"#;

    #[test]
    fn atmosphere_real_yaml_patches() {
        let _g = lock_and_reset();
        let mut patches: Vec<(i32, BodyAtmo)> = Vec::new();
        let rc = parse_atmosphere_with(
            ATMOSPHERE_YAML,
            "atmosphere.yaml",
            |key| match key {
                "tenebris" => 0,
                "sequoia" => 1,
                _ => -1,
            },
            |id, patch| patches.push((id, *patch)),
        );
        assert_eq!(rc, 0);
        assert_eq!(patches.len(), 2);

        let (id, t) = patches[0];
        assert_eq!(id, 0);
        assert_eq!(t.radius_mult, 1.6);
        assert_eq!(t.lower_radius_mult, 0.9);
        assert_eq!(t.sun_intensity, 9.0);
        assert_eq!(t.rayleigh_scale, 0.015);
        assert_eq!(t.mie_scale, 0.01);
        assert_eq!(t.mie_g, 0.85);
        assert_eq!(t.sunset_strength, 0.25);
        assert_eq!(t.scale_height, 0.25);
        assert_vec3(t.wavelengths, 5.602, 9.473, 19.644);
        assert_vec3(t.sunset_tint, 1.3, 1.0, 0.6);
        assert_vec3(t.sunset_glow, 1.0, 0.65, 0.25);
        assert_vec3(t.sunset_horizon, 0.8, 0.4, 0.15);

        // Sequoia only sets four fields; everything else stays zero in
        // the patch ("zero = keep compiled default" merge sentinel for
        // planet_set_atmosphere).
        let (id, s) = patches[1];
        assert_eq!(id, 1);
        assert_eq!(s.sun_intensity, 15.0);
        assert_eq!(s.rayleigh_scale, 0.8);
        assert_vec3(s.sunset_tint, 1.1, 1.3, 0.7);
        assert_vec3(s.sunset_glow, 0.9, 1.0, 0.45);
        assert_eq!(s.radius_mult, 0.0);
        assert_eq!(s.lower_radius_mult, 0.0);
        assert_eq!(s.mie_scale, 0.0);
        assert_eq!(s.mie_g, 0.0);
        assert_eq!(s.sunset_strength, 0.0);
        assert_eq!(s.scale_height, 0.0);
        assert_vec3(s.wavelengths, 0.0, 0.0, 0.0);
        assert_vec3(s.sunset_horizon, 0.0, 0.0, 0.0);
    }

    #[test]
    fn atmosphere_unknown_body_section_skipped() {
        let _g = lock_and_reset();
        let src = "phantom:\n  sun_intensity: 99.0\ntenebris:\n  sun_intensity: 3.0\n";
        let mut patches: Vec<(i32, BodyAtmo)> = Vec::new();
        let rc = parse_atmosphere_with(
            src,
            "atmosphere.yaml",
            |key| if key == "tenebris" { 0 } else { -1 },
            |id, patch| patches.push((id, *patch)),
        );
        // Unknown body is a warning, not a parse error.
        assert_eq!(rc, 0);
        assert_eq!(patches.len(), 1);
        assert_eq!(patches[0].0, 0);
        assert_eq!(patches[0].1.sun_intensity, 3.0);
    }

    #[test]
    fn skybox_partial_override_keeps_defaults() {
        let _g = lock_and_reset();
        let src = "skybox:\n  star_sharpness: 0.5\n  space_color: [0.1, 0.2, 0.3]\n  nebula_scale1: 2.5 # inline comment\n";
        assert_eq!(parse_skybox(src, "skybox.yaml"), 0);
        let cfg = skybox();
        // Overridden fields.
        assert_eq!(cfg.star_sharpness, 0.5);
        assert_vec3(cfg.space_color, 0.1, 0.2, 0.3);
        assert_eq!(cfg.nebula_scale1, 2.5);
        // Omitted fields keep the compiled-in defaults.
        assert_eq!(cfg.nebula_intensity, 0.20);
        assert_eq!(cfg.star_brightness_threshold, 0.7);
        assert_vec3(cfg.star_densities, 100.0, 200.0, 300.0);
        assert_vec3(cfg.nebula_warm_color, 0.55, 0.18, 0.38);
    }

    #[test]
    fn skybox_bad_vec3_is_parse_error() {
        let _g = lock_and_reset();
        let src = "star_color: not-a-vec\n";
        assert_eq!(parse_skybox(src, "skybox.yaml"), -2);
    }

    #[test]
    fn missing_colon_is_parse_error() {
        let _g = lock_and_reset();
        let src = "this line has no colon\n";
        assert_eq!(parse_skybox(src, "skybox.yaml"), -2);
    }

    #[test]
    fn unknown_key_is_warning_not_error() {
        let _g = lock_and_reset();
        let src = "skybox:\n  totally_unknown: 1.0\n";
        assert_eq!(parse_skybox(src, "skybox.yaml"), 0);
    }

    #[test]
    fn lod_sections_clamps_and_palette() {
        let _g = lock_and_reset();
        let src = "\
lod:
  distant_subdivisions: 7
  gravity_full_mult: 2.0
  water_drag_per_s: 4.5

sequoia:
  water_color: [0.1, 0.2, 0.3]
  water_full_depth_m: 9
  water_deep_color: [0.01, 0.02, 0.03]

lod:
  space_thrust: 25.0
  mesh_chunk_count: 64
  mesh_remesh_budget_ms: 2.5
  mesh_cull_pad_factor: 1.2
";
        assert_eq!(parse_lod(src, "lod.yaml"), 0);
        let cfg = lod();
        // distant_subdivisions clamps to [0, 3].
        assert_eq!(cfg.distant_subdivisions, 3);
        assert_eq!(cfg.gravity_full_mult, 2.0);
        assert_eq!(cfg.water_drag_per_s, 4.5);
        // A second "lod:" header exits palette mode.
        assert_eq!(cfg.space_thrust, 25.0);
        // Renderer mesh / chunking knobs (clamping to [1, 256] happens
        // at the renderer's first read, like the C).
        assert_eq!(cfg.mesh_chunk_count, 64);
        assert_eq!(cfg.mesh_remesh_budget_ms, 2.5);
        assert_eq!(cfg.mesh_cull_pad_factor, 1.2);
        // Palette section wrote only the SEQUOIA slot.
        assert_vec3(cfg.tileset_water_color[1], 0.1, 0.2, 0.3);
        assert_eq!(cfg.tileset_water_full_depth_m[1], 9.0);
        assert_vec3(cfg.tileset_water_deep_color[1], 0.01, 0.02, 0.03);
        // EARTH slot untouched (defaults).
        assert_vec3(cfg.tileset_water_color[0], 0.10, 0.28, 0.55);
        assert_eq!(cfg.tileset_water_full_depth_m[0], 4.0);
        assert_vec3(cfg.tileset_water_deep_color[0], 0.0, 0.0, 0.0);
        // Omitted top-level fields keep defaults.
        assert_eq!(cfg.gravity_falloff_mult, 1.8);
        assert_eq!(cfg.jump_velocity_mps, 12.0);
    }

    #[test]
    fn water_overrides_both_configs_and_keeps_defaults() {
        let _g = lock_and_reset();
        let src = "\
water:
  time_scale: 1.5
  absorption: [0.7, 0.3, 0.2]
  flow_max_level: 5
  flow_uv_speed_per_level: 0.5
";
        assert_eq!(parse_water(src, "water.yaml"), 0);
        let cfg = water();
        let flow = water_flow();
        assert_eq!(cfg.time_scale, 1.5);
        assert_vec3(cfg.absorption, 0.7, 0.3, 0.2);
        assert_eq!(flow.max_level, 5);
        assert_eq!(flow.uv_speed_per_level, 0.5);
        // Omitted fields keep compiled-in defaults.
        assert_eq!(cfg.depth_offset_m, 0.50);
        assert_eq!(cfg.specular_power, 140.0);
        assert_vec3(cfg.deep_color, 0.02, 0.10, 0.22);
        assert_eq!(flow.ticks_per_step, 10);
        assert_eq!(flow.queue_capacity, 4096);
        assert_eq!(flow.cap_curve_power, 2.0);
    }

    #[test]
    fn water_garbage_scalar_sets_zero_like_strtod() {
        let _g = lock_and_reset();
        // C: (float)strtod("oops", NULL) == 0.0 - the key is recognised,
        // so the default IS overwritten with zero (no parse error).
        let src = "water:\n  time_scale: oops\n";
        assert_eq!(parse_water(src, "water.yaml"), 0);
        assert_eq!(water().time_scale, 0.0);
    }

    #[test]
    fn lighting_engine_words_quotes_and_clamps() {
        let _g = lock_and_reset();
        let src = "\
lighting:
  engine: voxel
  voxel_sky_max: 99
  voxel_torch_emission: -3
  voxel_sky_lateral_loss: 0
  voxel_rebuild_ops_per_frame: 5
  torch_color: [0.9, 0.8, 0.7]
";
        assert_eq!(parse_lighting(src, "lighting.yaml"), 0);
        let cfg = lighting();
        assert_eq!(cfg.engine, 1);
        assert_eq!(cfg.voxel_sky_max, 15); // clamped down
        assert_eq!(cfg.voxel_torch_emission, 0); // clamped up
        assert_eq!(cfg.voxel_sky_lateral_loss, 1); // floored at 1
        assert_eq!(cfg.voxel_rebuild_ops_per_frame, 1000); // floored at 1000
        assert_vec3(cfg.torch_color, 0.9, 0.8, 0.7);
        // Omitted fields keep defaults.
        assert_eq!(cfg.night_ambient_floor, 0.10);
        assert_eq!(cfg.terminator_lo, -0.10);
        assert_eq!(cfg.terminator_hi, 0.30);

        // Quoted value tolerated; "column" switches back.
        assert_eq!(parse_lighting("engine: \"column\"\n", "lighting.yaml"), 0);
        assert_eq!(lighting().engine, 0);

        // Unknown engine word is a parse error (-2) and leaves the
        // previous value in place.
        assert_eq!(parse_lighting("engine: lava\n", "lighting.yaml"), -2);
        assert_eq!(lighting().engine, 0);
    }

    #[test]
    fn load_missing_file_returns_minus_one_and_keeps_defaults() {
        let _g = lock_and_reset();
        assert_eq!(load_skybox("definitely/not/a/real/path.yaml"), -1);
        assert_eq!(load_lod("definitely/not/a/real/path.yaml"), -1);
        assert_eq!(load_water("definitely/not/a/real/path.yaml"), -1);
        assert_eq!(load_lighting("definitely/not/a/real/path.yaml"), -1);
        assert_eq!(
            load_atmosphere_with("definitely/not/a/real/path.yaml", |_| -1, |_, _| {}),
            -1
        );
        assert_eq!(skybox(), SKYBOX_DEFAULTS);
        assert_eq!(lod(), LOD_DEFAULTS);
        assert_eq!(water(), WATER_DEFAULTS);
        assert_eq!(water_flow(), WATER_FLOW_DEFAULTS);
        assert_eq!(lighting(), LIGHTING_DEFAULTS);
    }

    #[test]
    fn parser_primitives() {
        // trim_strip: comment anywhere on the line, C isspace set.
        assert_eq!(trim_strip("  key: 1.0  # comment"), "key: 1.0");
        assert_eq!(trim_strip("# whole line comment"), "");
        assert_eq!(trim_strip(" \t\r"), "");

        // strtod semantics: leading ws, trailing junk ignored, garbage
        // yields (0.0, 0).
        assert_eq!(strtod_prefix("  1.5rest"), (1.5, 5));
        assert_eq!(strtod_prefix("-0.25"), (-0.25, 5));
        assert_eq!(strtod_prefix("1e2"), (100.0, 3));
        assert_eq!(strtod_prefix("3e"), (3.0, 1)); // bare 'e' not consumed
        assert_eq!(strtod_prefix("junk"), (0.0, 0));
        assert_eq!(ival(" -42xyz"), -42);
        assert_eq!(ival("oops"), 0);

        // parse_vec3: commas/whitespace interchangeable, ']' unchecked,
        // partial writes on failure (C quirk).
        let mut v = v3(9.0, 9.0, 9.0);
        assert!(parse_vec3(" [ 1 2,3", &mut v));
        assert_vec3(v, 1.0, 2.0, 3.0);
        let mut v = v3(9.0, 9.0, 9.0);
        assert!(!parse_vec3("[1, oops, 3]", &mut v));
        assert_eq!(v.x, 1.0); // x already written before y failed
        let mut v = v3(9.0, 9.0, 9.0);
        assert!(!parse_vec3("1, 2, 3", &mut v)); // missing '['

        // normalise_name: spaces -> underscores, lowercase.
        assert_eq!(normalise_name("Asteroid A"), "asteroid_a");
        assert_eq!(normalise_name("Tenebris"), "tenebris");
    }

    #[test]
    fn ui_partial_override_keeps_defaults() {
        let _g = lock_and_reset();
        let src = "\
ui:

  atlas: assets/textures/ui/steel.png

  panel:
    rect: [64, 0, 48, 48]
    nine_slice: [12, 12, 12, 12]

  close_x:
    rect: [56, 16, 14, 14]
";
        assert_eq!(parse_ui(src, "ui.yaml"), 0);
        let cfg = ui();
        assert_eq!(cfg.atlas_path, "assets/textures/ui/steel.png");
        // Overridden sprite sections.
        assert_eq!(cfg.sprites[UiSpriteId::Panel as usize], spr(64, 0, 48, 48, 12, 12, 12, 12));
        // close_x updated only its rect; the nine-slice margins keep
        // the compiled-in zeros.
        assert_eq!(cfg.sprites[UiSpriteId::CloseX as usize], spr(56, 16, 14, 14, 0, 0, 0, 0));
        // Omitted sections keep defaults entirely.
        assert_eq!(
            cfg.sprites[UiSpriteId::ButtonHover as usize],
            spr(56, 0, 24, 16, 4, 4, 4, 4)
        );
        assert_eq!(
            cfg.sprites[UiSpriteId::ScrollbarThumb as usize],
            spr(8, 64, 8, 16, 0, 0, 4, 4)
        );
    }

    #[test]
    fn ui_atlas_quotes_stripped_and_truncated() {
        let _g = lock_and_reset();
        assert_eq!(parse_ui("ui:\n  atlas: \"quoted/path.png\"\n", "ui.yaml"), 0);
        assert_eq!(ui().atlas_path, "quoted/path.png");
        // C strncpy caps the stored path at UI_ATLAS_PATH_MAX - 1.
        let long = format!("ui:\n  atlas: {}\n", "x".repeat(300));
        assert_eq!(parse_ui(&long, "ui.yaml"), 0);
        assert_eq!(ui().atlas_path.len(), UI_ATLAS_PATH_MAX - 1);
    }

    #[test]
    fn ui_bad_int4_is_parse_error_unknown_section_is_not() {
        let _g = lock_and_reset();
        // Unknown section: warning only; its fields are routed to the
        // top level where "rect" is an unknown ui key (also a warning).
        assert_eq!(parse_ui("ui:\nmystery_widget:\n  rect: [1, 2, 3, 4]\n", "ui.yaml"), 0);
        // Bad rect under a known sprite section is a parse error. The
        // partial parse lands in a local buffer (C: `int v[4]`), so the
        // sprite keeps its compiled-in default.
        assert_eq!(parse_ui("panel:\n  rect: [1, oops, 3, 4]\n", "ui.yaml"), -2);
        assert_eq!(ui().sprites[UiSpriteId::Panel as usize].x, 0);
    }

    #[test]
    fn parse_int4_primitives() {
        let mut v = [9i32; 4];
        assert!(parse_int4("[ 0, 32, 18, 18 ]", &mut v));
        assert_eq!(v, [0, 32, 18, 18]);
        // Commas/whitespace interchangeable, ']' unchecked, negatives ok.
        let mut v = [9i32; 4];
        assert!(parse_int4("[1 2,3  -4", &mut v));
        assert_eq!(v, [1, 2, 3, -4]);
        // Missing '[' fails before any write.
        let mut v = [9i32; 4];
        assert!(!parse_int4("1, 2, 3, 4]", &mut v));
        assert_eq!(v, [9, 9, 9, 9]);
        // Too few components: prior writes persist (C quirk).
        let mut v = [9i32; 4];
        assert!(!parse_int4("[5, 6]", &mut v));
        assert_eq!(v[0], 5);
        assert_eq!(v[1], 6);
    }

    #[test]
    fn real_ui_yaml_matches_compiled_defaults() {
        let _g = lock_and_reset();
        // The shipped ui.yaml mirrors the compiled-in table, so loading
        // it must be a no-op relative to the defaults (and parse clean).
        let path = concat!(
            env!("CARGO_MANIFEST_DIR"),
            "/../../assets/config/ui.yaml"
        );
        let rc = load_ui(path);
        if rc == -1 {
            return; /* asset tree not present in this checkout layout */
        }
        assert_eq!(rc, 0, "ui.yaml should parse without errors");
        assert_eq!(ui(), ui_defaults());
    }

    #[test]
    fn solar_parses_colors_and_scalars_zero_keeps_default() {
        let rc = parse_solar(
            "solar:\n  sun_distance_m: 150000\n  sun_radius_m: 9000\n  \
             sun_color_hot: [2.0, 1.0, 0.5]\n  sun_granule_scale: 9\n  \
             sun_limb_strength: 0\n",
            "solar-test",
        );
        assert_eq!(rc, 0);
        let s = solar();
        assert_eq!(s.sun_distance_m, 150_000.0);
        assert_eq!(s.sun_radius_m, 9_000.0);
        assert_eq!(s.sun_color_hot, Vec3 { x: 2.0, y: 1.0, z: 0.5 });
        assert_eq!(s.sun_granule_scale, 9.0);
        /* zero keeps the compiled-in default */
        assert_eq!(s.sun_limb_strength, SOLAR_DEFAULTS.sun_limb_strength);
        /* untouched fields keep defaults */
        assert_eq!(s.sun_color_cool, SOLAR_DEFAULTS.sun_color_cool);
        /* restore for other tests */
        *S_SOLAR.lock().unwrap() = SOLAR_DEFAULTS;
    }

    #[test]
    fn real_yaml_files_parse_clean_when_present() {
        let _g = lock_and_reset();
        // The Rust port owns its asset tree under tenebris-rs/assets.
        // Skip silently when the layout differs (e.g. crate vendored
        // elsewhere) - load returns -1.
        let base = concat!(
            env!("CARGO_MANIFEST_DIR"),
            "/../../assets/config"
        );
        for (file, rc) in [
            ("skybox.yaml", load_skybox(&format!("{}/skybox.yaml", base))),
            ("lod.yaml", load_lod(&format!("{}/lod.yaml", base))),
            ("water.yaml", load_water(&format!("{}/water.yaml", base))),
            (
                "lighting.yaml",
                load_lighting(&format!("{}/lighting.yaml", base)),
            ),
        ] {
            assert_ne!(rc, -2, "{} should parse without errors", file);
        }
        let rc = load_atmosphere_with(
            &format!("{}/atmosphere.yaml", base),
            |key| match key {
                "tenebris" => 0,
                "sequoia" => 1,
                _ => -1,
            },
            |_, _| {},
        );
        assert_ne!(rc, -2, "atmosphere.yaml should parse without errors");
    }
}
