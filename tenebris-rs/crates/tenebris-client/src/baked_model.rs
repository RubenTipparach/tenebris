//! Baked-model + animation-clip loader and renderer.
//!
//! First consumer of the CLAUDE.md baked-asset pipeline on the Rust
//! port: `.obj` files under `assets/models/` (with a `.mtl` for per-part
//! colours and a `.json` sidecar carrying the rig's pivots) plus
//! `assets/animations/*.anim.json` keyframe clips (frames + per-bone
//! transforms), all written by the deterministic generators under
//! `tools/` (`gen-critter-model.py`, `gen-tool-models.py`).
//!
//! The rig is deliberately flat: each `o <name>` OBJ group is one rigid
//! part rotating about its sidecar pivot - no parent chains (the critter
//! merges skull+snout+ears into a single "head" part instead). A clip
//! track named `root` is applied to the whole model before the parts,
//! which is how the death roll tips the entire critter over.
//!
//! Rendering is immediate-mode `sokol_gl` into whatever matrix stack the
//! caller has bound (same convention as animals.rs / crops.rs): the
//! caller establishes position + orientation, [`draw`] pushes per-part
//! transforms on top. Face shading is baked at load from the face
//! normal's local +Y (top bright, bottom dark - the draw_box look).
//!
//! Parsers are the house-style tiny subsets, not general parsers: the
//! OBJ reader takes `o`/`usemtl`/`v`/`f` (+`mtllib`), the JSON reader
//! covers exactly the value shapes the sidecar + clips use. Both are
//! fed only by our own generators; unknown lines / keys are skipped.

#![allow(dead_code)] // consumed by animals.rs + viewmodel.rs

use sokol::gl as sgl;

/* ---------------------------------------------------------------------- */
/* Model                                                                   */

/// One triangle: three positions + a load-time shade factor from the
/// face normal (multiplied into the part colour at draw).
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Tri {
    pub v: [[f32; 3]; 3],
    pub shade: f32,
    pub color: [f32; 3],
}

/// One rigid part (an OBJ `o` group) with its rotation pivot.
#[derive(Clone, Debug, Default)]
pub struct Part {
    pub name: String,
    pub pivot: [f32; 3],
    pub tris: Vec<Tri>,
}

#[derive(Clone, Debug, Default)]
pub struct Model {
    pub parts: Vec<Part>,
}

/// Shade from a face normal: top faces brightest, undersides darkest -
/// matches the hand-shaded draw_box convention the box critter used.
fn shade_from_normal(ny: f32) -> f32 {
    0.55 + 0.45 * (0.5 + 0.5 * ny.clamp(-1.0, 1.0))
}

/// Parse the `Kd`-only material subset our generators emit.
fn parse_mtl(src: &str) -> Vec<(String, [f32; 3])> {
    let mut out: Vec<(String, [f32; 3])> = Vec::new();
    for raw in src.lines() {
        let line = raw.trim();
        if let Some(name) = line.strip_prefix("newmtl ") {
            out.push((name.trim().to_string(), [1.0, 1.0, 1.0]));
        } else if let Some(vals) = line.strip_prefix("Kd ") {
            if let Some(last) = out.last_mut() {
                let mut it = vals.split_whitespace();
                for c in last.1.iter_mut() {
                    if let Some(v) = it.next().and_then(|s| s.parse::<f32>().ok()) {
                        *c = v;
                    }
                }
            }
        }
    }
    out
}

/// Parse the OBJ subset (`o` groups, `usemtl`, `v`, `f` with fan
/// triangulation; `f` entries may be `i` or `i/..` - first index wins).
/// `materials` supplies per-name colours; unknown materials render white.
pub fn parse_obj(src: &str, materials: &[(String, [f32; 3])]) -> Model {
    let mut model = Model::default();
    let mut verts: Vec<[f32; 3]> = Vec::new();
    let mut cur_color = [1.0f32, 1.0, 1.0];

    for raw in src.lines() {
        let line = raw.trim();
        if let Some(name) = line.strip_prefix("o ") {
            model.parts.push(Part { name: name.trim().to_string(), ..Default::default() });
        } else if let Some(name) = line.strip_prefix("usemtl ") {
            let name = name.trim();
            cur_color = materials
                .iter()
                .find(|(n, _)| n == name)
                .map(|(_, c)| *c)
                .unwrap_or([1.0, 1.0, 1.0]);
        } else if let Some(vals) = line.strip_prefix("v ") {
            let mut p = [0.0f32; 3];
            let mut it = vals.split_whitespace();
            for c in p.iter_mut() {
                *c = it.next().and_then(|s| s.parse().ok()).unwrap_or(0.0);
            }
            verts.push(p);
        } else if let Some(vals) = line.strip_prefix("f ") {
            // 1-based indices, possibly i/vt/vn - take the position index.
            let idx: Vec<usize> = vals
                .split_whitespace()
                .filter_map(|tok| tok.split('/').next()?.parse::<usize>().ok())
                .filter(|&i| i >= 1 && i <= verts.len())
                .map(|i| i - 1)
                .collect();
            if idx.len() < 3 {
                continue;
            }
            if model.parts.is_empty() {
                model.parts.push(Part { name: "default".into(), ..Default::default() });
            }
            let part = model.parts.last_mut().unwrap();
            // Fan-triangulate; shade from the (unnormalised-safe) face
            // normal of the first triangle's winding.
            for k in 1..idx.len() - 1 {
                let (a, b, c) = (verts[idx[0]], verts[idx[k]], verts[idx[k + 1]]);
                let u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
                let w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
                let n = [
                    u[1] * w[2] - u[2] * w[1],
                    u[2] * w[0] - u[0] * w[2],
                    u[0] * w[1] - u[1] * w[0],
                ];
                let len = (n[0] * n[0] + n[1] * n[1] + n[2] * n[2]).sqrt();
                let ny = if len > 1e-12 { n[1] / len } else { 0.0 };
                part.tris.push(Tri { v: [a, b, c], shade: shade_from_normal(ny), color: cur_color });
            }
        }
    }
    model
}

/// Load `<stem>.obj` + `<stem>.mtl` + `<stem>.json` (pivot sidecar).
/// Returns `None` when the .obj itself is missing / empty; a missing
/// mtl or sidecar degrades gracefully (white parts / origin pivots).
pub fn load_model(obj_path: &str) -> Option<Model> {
    let src = std::fs::read_to_string(obj_path).ok()?;
    let stem = obj_path.strip_suffix(".obj").unwrap_or(obj_path);
    let materials = std::fs::read_to_string(format!("{stem}.mtl"))
        .map(|s| parse_mtl(&s))
        .unwrap_or_default();
    let mut model = parse_obj(&src, &materials);
    if model.parts.iter().all(|p| p.tris.is_empty()) {
        return None;
    }
    if let Ok(side) = std::fs::read_to_string(format!("{stem}.json")) {
        if let Some(jv) = json_parse(&side) {
            if let Some(pivots) = jv.get("pivots") {
                for part in model.parts.iter_mut() {
                    if let Some(p) = pivots.get(&part.name).and_then(Jv::as_vec3) {
                        part.pivot = p;
                    }
                }
            }
        }
    }
    Some(model)
}

/* ---------------------------------------------------------------------- */
/* Tiny JSON subset parser - objects, arrays, numbers, strings (no        */
/* escapes; our generators never emit them), true/false/null.             */

#[derive(Clone, Debug, PartialEq)]
pub enum Jv {
    Num(f64),
    Str(String),
    Bool(bool),
    Null,
    Arr(Vec<Jv>),
    Obj(Vec<(String, Jv)>),
}

impl Jv {
    pub fn get(&self, key: &str) -> Option<&Jv> {
        match self {
            Jv::Obj(fields) => fields.iter().find(|(k, _)| k == key).map(|(_, v)| v),
            _ => None,
        }
    }

    pub fn as_f32(&self) -> Option<f32> {
        match self {
            Jv::Num(n) => Some(*n as f32),
            _ => None,
        }
    }

    pub fn as_bool(&self) -> Option<bool> {
        match self {
            Jv::Bool(b) => Some(*b),
            _ => None,
        }
    }

    pub fn as_vec3(&self) -> Option<[f32; 3]> {
        match self {
            Jv::Arr(items) if items.len() >= 3 => Some([
                items[0].as_f32()?,
                items[1].as_f32()?,
                items[2].as_f32()?,
            ]),
            _ => None,
        }
    }
}

pub fn json_parse(src: &str) -> Option<Jv> {
    let bytes = src.as_bytes();
    let mut pos = 0usize;
    let v = json_value(bytes, &mut pos)?;
    Some(v)
}

fn json_skip_ws(b: &[u8], pos: &mut usize) {
    while *pos < b.len() && (b[*pos] as char).is_ascii_whitespace() {
        *pos += 1;
    }
}

fn json_value(b: &[u8], pos: &mut usize) -> Option<Jv> {
    json_skip_ws(b, pos);
    match *b.get(*pos)? {
        b'{' => {
            *pos += 1;
            let mut fields = Vec::new();
            loop {
                json_skip_ws(b, pos);
                if *b.get(*pos)? == b'}' {
                    *pos += 1;
                    return Some(Jv::Obj(fields));
                }
                let Jv::Str(key) = json_value(b, pos)? else { return None };
                json_skip_ws(b, pos);
                if *b.get(*pos)? != b':' {
                    return None;
                }
                *pos += 1;
                let val = json_value(b, pos)?;
                fields.push((key, val));
                json_skip_ws(b, pos);
                match *b.get(*pos)? {
                    b',' => *pos += 1,
                    b'}' => {}
                    _ => return None,
                }
            }
        }
        b'[' => {
            *pos += 1;
            let mut items = Vec::new();
            loop {
                json_skip_ws(b, pos);
                if *b.get(*pos)? == b']' {
                    *pos += 1;
                    return Some(Jv::Arr(items));
                }
                items.push(json_value(b, pos)?);
                json_skip_ws(b, pos);
                match *b.get(*pos)? {
                    b',' => *pos += 1,
                    b']' => {}
                    _ => return None,
                }
            }
        }
        b'"' => {
            *pos += 1;
            let start = *pos;
            while *pos < b.len() && b[*pos] != b'"' {
                *pos += 1;
            }
            if *pos >= b.len() {
                return None;
            }
            let s = std::str::from_utf8(&b[start..*pos]).ok()?.to_string();
            *pos += 1;
            Some(Jv::Str(s))
        }
        b't' if b[*pos..].starts_with(b"true") => {
            *pos += 4;
            Some(Jv::Bool(true))
        }
        b'f' if b[*pos..].starts_with(b"false") => {
            *pos += 5;
            Some(Jv::Bool(false))
        }
        b'n' if b[*pos..].starts_with(b"null") => {
            *pos += 4;
            Some(Jv::Null)
        }
        _ => {
            let start = *pos;
            while *pos < b.len()
                && matches!(b[*pos], b'0'..=b'9' | b'-' | b'+' | b'.' | b'e' | b'E')
            {
                *pos += 1;
            }
            let s = std::str::from_utf8(&b[start..*pos]).ok()?;
            s.parse::<f64>().ok().map(Jv::Num)
        }
    }
}

/* ---------------------------------------------------------------------- */
/* Animation clips                                                         */

/// One keyframe: time + euler rotation (radians, converted from the
/// authored degrees at load) + position offset.
#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub struct Key {
    pub t: f32,
    pub rot: [f32; 3],
    pub pos: [f32; 3],
}

/// A named track's transform at sample time.
#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub struct BoneXf {
    pub rot: [f32; 3],
    pub pos: [f32; 3],
}

#[derive(Clone, Debug, Default)]
pub struct Clip {
    pub duration_s: f32,
    pub looped: bool,
    pub tracks: Vec<(String, Vec<Key>)>,
}

impl Clip {
    /// Parse a `*.anim.json` clip.
    pub fn parse(src: &str) -> Option<Clip> {
        let jv = json_parse(src)?;
        let duration_s = jv.get("duration_s")?.as_f32()?.max(0.001);
        let looped = jv.get("loop").and_then(Jv::as_bool).unwrap_or(false);
        let mut tracks = Vec::new();
        if let Some(Jv::Obj(bones)) = jv.get("bones") {
            for (name, keys_jv) in bones {
                let Jv::Arr(keys_jv) = keys_jv else { continue };
                let mut keys: Vec<Key> = Vec::with_capacity(keys_jv.len());
                for k in keys_jv {
                    let Some(t) = k.get("t").and_then(Jv::as_f32) else { continue };
                    let rot_deg = k.get("rot").and_then(Jv::as_vec3).unwrap_or([0.0; 3]);
                    let pos = k.get("pos").and_then(Jv::as_vec3).unwrap_or([0.0; 3]);
                    let d2r = std::f32::consts::PI / 180.0;
                    keys.push(Key {
                        t,
                        rot: [rot_deg[0] * d2r, rot_deg[1] * d2r, rot_deg[2] * d2r],
                        pos,
                    });
                }
                keys.sort_by(|a, b| a.t.partial_cmp(&b.t).unwrap_or(std::cmp::Ordering::Equal));
                if !keys.is_empty() {
                    tracks.push((name.clone(), keys));
                }
            }
        }
        Some(Clip { duration_s, looped, tracks })
    }

    pub fn load(path: &str) -> Option<Clip> {
        let src = std::fs::read_to_string(path).ok()?;
        let clip = Self::parse(&src);
        if clip.is_none() {
            println!("[baked_model] failed to parse clip {path}");
        }
        clip
    }

    /// Sample a bone track at `time` (seconds). Looping clips wrap;
    /// non-looping clamp to [first, last]. `None` when the clip has no
    /// track for this bone (caller leaves the part at rest).
    pub fn sample(&self, bone: &str, time: f32) -> Option<BoneXf> {
        let keys = &self.tracks.iter().find(|(n, _)| n == bone)?.1;
        let t = if self.looped {
            time.rem_euclid(self.duration_s)
        } else {
            time.clamp(0.0, self.duration_s)
        };
        if t <= keys[0].t {
            return Some(BoneXf { rot: keys[0].rot, pos: keys[0].pos });
        }
        for pair in keys.windows(2) {
            let (a, b) = (pair[0], pair[1]);
            if t <= b.t {
                let span = (b.t - a.t).max(1e-6);
                let f = (t - a.t) / span;
                let lerp3 = |x: [f32; 3], y: [f32; 3]| {
                    [x[0] + (y[0] - x[0]) * f, x[1] + (y[1] - x[1]) * f, x[2] + (y[2] - x[2]) * f]
                };
                return Some(BoneXf { rot: lerp3(a.rot, b.rot), pos: lerp3(a.pos, b.pos) });
            }
        }
        let last = keys[keys.len() - 1];
        Some(BoneXf { rot: last.rot, pos: last.pos })
    }
}

/* ---------------------------------------------------------------------- */
/* Rendering                                                               */

fn apply_rot(rot: [f32; 3]) {
    // Applied as successive sgl rotates about X, Y, Z. Our clips use one
    // dominant axis per track, so composition order is a non-issue.
    if rot[0] != 0.0 {
        sgl::rotate(rot[0], 1.0, 0.0, 0.0);
    }
    if rot[1] != 0.0 {
        sgl::rotate(rot[1], 0.0, 1.0, 0.0);
    }
    if rot[2] != 0.0 {
        sgl::rotate(rot[2], 0.0, 0.0, 1.0);
    }
}

/// Draw a model into the caller's current sgl matrix stack, optionally
/// posed by `clip` sampled at `time`. The `root` pseudo-track (if the
/// clip has one) transforms the whole model about the origin first.
/// `light` scales every vertex colour (1.0 = fullbright day, lower at
/// night - see renderer::entity_sun_brightness).
pub fn draw(model: &Model, clip: Option<(&Clip, f32)>, light: f32) {
    sgl::push_matrix();
    if let Some((c, t)) = clip {
        if let Some(root) = c.sample("root", t) {
            sgl::translate(root.pos[0], root.pos[1], root.pos[2]);
            apply_rot(root.rot);
        }
    }
    for part in &model.parts {
        sgl::push_matrix();
        if let Some(xf) = clip.and_then(|(c, t)| c.sample(&part.name, t)) {
            sgl::translate(
                part.pivot[0] + xf.pos[0],
                part.pivot[1] + xf.pos[1],
                part.pivot[2] + xf.pos[2],
            );
            apply_rot(xf.rot);
            sgl::translate(-part.pivot[0], -part.pivot[1], -part.pivot[2]);
        }
        sgl::begin_triangles();
        for tri in &part.tris {
            let s = tri.shade * light;
            sgl::c3f(tri.color[0] * s, tri.color[1] * s, tri.color[2] * s);
            for v in &tri.v {
                sgl::v3f(v[0], v[1], v[2]);
            }
        }
        sgl::end();
        sgl::pop_matrix();
    }
    sgl::pop_matrix();
}

/* ---------------------------------------------------------------------- */

#[cfg(test)]
mod tests {
    use super::*;

    const OBJ: &str = "\
mtllib t.mtl
o body
usemtl red
v 0 0 0
v 1 0 0
v 1 0 1
v 0 0 1
f 1 2 3 4
o head
usemtl blue
v 0 1 0
v 1 1 0
v 0.5 2 0
f 5/1/1 6/2/1 7/3/1
";

    const MTL: &str = "\
newmtl red
Kd 1.0 0.25 0.25
newmtl blue
Kd 0.1 0.2 0.9
";

    #[test]
    fn obj_parses_groups_materials_and_fans_quads() {
        let mats = parse_mtl(MTL);
        assert_eq!(mats.len(), 2);
        assert_eq!(mats[0], ("red".into(), [1.0, 0.25, 0.25]));
        let m = parse_obj(OBJ, &mats);
        assert_eq!(m.parts.len(), 2);
        assert_eq!(m.parts[0].name, "body");
        // Quad fans into 2 tris.
        assert_eq!(m.parts[0].tris.len(), 2);
        assert_eq!(m.parts[0].tris[0].color, [1.0, 0.25, 0.25]);
        // The floor quad (1,2,3,4) winds with the normal on -Y here:
        // u=(1,0,0), w=(1,0,1) -> n=(0,-1,0) -> darkest shade.
        assert!((m.parts[0].tris[0].shade - shade_from_normal(-1.0)).abs() < 1e-6);
        // f with i/vt/vn syntax takes the position index.
        assert_eq!(m.parts[1].tris.len(), 1);
        assert_eq!(m.parts[1].tris[0].v[0], [0.0, 1.0, 0.0]);
        assert_eq!(m.parts[1].tris[0].color, [0.1, 0.2, 0.9]);
    }

    #[test]
    fn json_subset_parses_the_clip_shapes() {
        let v = json_parse(r#"{"a": [1, 2.5, -3], "b": {"c": true}, "s": "hi"}"#).unwrap();
        assert_eq!(v.get("a").unwrap().as_vec3(), Some([1.0, 2.5, -3.0]));
        assert_eq!(v.get("b").unwrap().get("c").unwrap().as_bool(), Some(true));
        assert_eq!(v.get("s"), Some(&Jv::Str("hi".into())));
        assert!(json_parse("{broken").is_none());
    }

    #[test]
    fn clip_samples_interpolate_wrap_and_clamp() {
        let clip = Clip::parse(
            r#"{"name":"t","duration_s":1.0,"loop":true,
                "bones":{"leg":[{"t":0.0,"rot":[0,0,0]},
                                 {"t":1.0,"rot":[90,0,0],"pos":[0,1,0]}]}}"#,
        )
        .unwrap();
        assert!(clip.looped);
        let mid = clip.sample("leg", 0.5).unwrap();
        assert!((mid.rot[0] - std::f32::consts::FRAC_PI_4).abs() < 1e-5);
        assert!((mid.pos[1] - 0.5).abs() < 1e-6);
        // Loop wrap: t=1.25 samples like t=0.25.
        let w = clip.sample("leg", 1.25).unwrap();
        assert!((w.pos[1] - 0.25).abs() < 1e-6);
        // Unknown bone -> None.
        assert!(clip.sample("nope", 0.5).is_none());

        // Non-looping clip clamps past the end (death pose holds).
        let hold = Clip::parse(
            r#"{"duration_s":0.5,"loop":false,
                "bones":{"root":[{"t":0.0,"rot":[0,0,0]},{"t":0.5,"rot":[0,0,90]}]}}"#,
        )
        .unwrap();
        let end = hold.sample("root", 9.0).unwrap();
        assert!((end.rot[2] - std::f32::consts::FRAC_PI_2).abs() < 1e-5);
    }

    /// The real generated assets load: guards the generator <-> loader
    /// contract (paths relative to the crate via CARGO_MANIFEST_DIR so
    /// `cargo test` finds them from the crate dir).
    #[test]
    fn generated_critter_assets_load() {
        let root = concat!(env!("CARGO_MANIFEST_DIR"), "/../..");
        let model = load_model(&format!("{root}/assets/models/critter.obj"))
            .expect("critter.obj loads");
        let names: Vec<&str> = model.parts.iter().map(|p| p.name.as_str()).collect();
        for want in ["body", "head", "tail", "leg_fl", "leg_fr", "leg_bl", "leg_br"] {
            assert!(names.contains(&want), "part {want} present");
        }
        // Legs picked up their sidecar pivots (hip height 0.36).
        let leg = model.parts.iter().find(|p| p.name == "leg_fl").unwrap();
        assert!((leg.pivot[1] - 0.36).abs() < 1e-6);
        // Materials landed (no white default on the body).
        assert_ne!(model.parts[0].tris[0].color, [1.0, 1.0, 1.0]);

        for clip_name in ["walk", "idle", "death"] {
            let c = Clip::load(&format!(
                "{root}/assets/animations/critter_{clip_name}.anim.json"
            ))
            .unwrap_or_else(|| panic!("{clip_name} clip loads"));
            assert!(c.duration_s > 0.0);
            assert!(!c.tracks.is_empty());
        }
        // Death clip carries the whole-model root roll.
        let death = Clip::load(&format!("{root}/assets/animations/critter_death.anim.json"))
            .unwrap();
        let end = death.sample("root", 99.0).unwrap();
        assert!((end.rot[2] - std::f32::consts::FRAC_PI_2).abs() < 1e-4, "ends on its side");

        for tool in ["wood_pickaxe", "wood_axe", "wood_shovel"] {
            let m = load_model(&format!("{root}/assets/models/{tool}.obj"))
                .unwrap_or_else(|| panic!("{tool}.obj loads"));
            assert!(m.parts.iter().any(|p| p.name == "handle"));
            assert!(m.parts.iter().any(|p| p.name == "head"));
        }
    }
}
