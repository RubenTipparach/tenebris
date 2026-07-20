//! Block-scenario capture: dump the player's collision neighbourhood - the
//! pose + tangent basis, plus the FULL voxel columns of the feet tile and
//! its edge neighbours - to a text file a headless test can replay through
//! [`crate::player_ctrl::update`].
//!
//! # Why this exists
//!
//! The "stuck floating in the air inside a cave" / "fall through the world
//! at a tree" collision bug (CLAUDE.md, standing OPEN) only reproduces at
//! real world subdivisions in the running game - the headless tests have
//! historically stayed green while the bug persisted. Claude cannot verify
//! that fix alone. This turns an in-game repro into a deterministic fixture:
//! the player presses the capture key the instant they are stuck, and the
//! file it writes rebuilds the exact same world+pose so `player_ctrl::update`
//! can be run against it offline and asserted on. It is the block-state
//! sibling of [`crate::dev_shot`] (which only captures pixels).
//!
//! # Trigger
//!
//! Wired in `app.rs` to the [`crate::controls::Action::BlockSnapshot`] action
//! (default F4, rebindable in the Inputs menu) AND to Shift+P. Both print the
//! human-readable console snapshot (`print_block_snapshot`) AND write a
//! `.tenecap` file. One capture code path, two triggers.
//!
//! # Format (`tenecap v1`)
//!
//! Line-based 7-bit ASCII. Every f64 is stored as its IEEE-754 bit pattern
//! (16 hex chars); f32 as 8 hex chars. Exactness matters: a captured pose on
//! Sequoia sits ~20 km from the origin, where decimal truncation would move
//! the player metres and change which voxel their feet are in. `#` lines are
//! human-readable echoes; the parser ignores them.
//!
//! # What is and isn't restored
//!
//! [`rebuild`] regenerates the world from the body's id+seed (identical grid
//! + worldgen), then PATCHES the captured columns over it, so player-dug
//! caves / placed blocks in the captured neighbourhood come back exactly.
//! Only the voxel `blocks` are restored - that is all the walkable-floor /
//! collision path reads. Water-sim levels and the light BFS are NOT restored
//! (they don't affect solid-floor collision); a capture is a collision
//! fixture, not a full save.

// `parse` / `rebuild` are the replay half of the API - exercised by the
// regression tests and the future "load a .tenecap" dev hook, not the
// runtime write path - so they read as dead in a plain build.
#![allow(dead_code)]

use std::path::PathBuf;

use tenebris_core::blocks::{self, Block};
use tenebris_core::math::{dvec3_add, dvec3_length, dvec3_make, dvec3_scale, dvec3_sub, DVec3};
use tenebris_core::physics::TangentBasis;
use tenebris_core::planet::{self, BodyConfig, BodyId};
use tenebris_core::world::{World, WORLD_MAX_DEPTH};

use crate::player_ctrl::PlayerCtrl;

/// First line of every capture file; also the format-version gate for
/// [`parse`].
pub const FORMAT_TAG: &str = "tenecap v1";

/// Env var: directory to write captures into. Defaults to the process
/// working directory when unset.
const CAPTURE_DIR_ENV: &str = "TENEBRIS_CAPTURE_DIR";

/// One captured voxel column (the feet tile or one of its edge neighbours).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CapturedColumn {
    pub tile: i32,
    /// True for the tile the player's feet are on; false for a neighbour.
    pub is_feet: bool,
    /// Raw block bytes, depth 0..[`WORLD_MAX_DEPTH`].
    pub column: Vec<u8>,
}

/// A fully self-describing collision scenario: the body identity needed to
/// regenerate the grid, the player's authoritative pose, and the captured
/// voxel columns.
#[derive(Clone, Debug)]
pub struct Capture {
    /* -- body identity (regenerates an identical world) -- */
    pub body_index: i32,
    pub body_name: String,
    pub seed: u64,
    pub radius_m: f64,
    pub center: DVec3,
    pub subdivisions: i32,
    pub tile_count: i32,

    /* -- player pose -- */
    pub position: DVec3,
    pub velocity: DVec3,
    pub basis: TangentBasis,
    pub basis_ready: bool,
    pub yaw: f32,
    pub pitch: f32,
    pub grounded: bool,
    pub is_in_space: bool,
    pub last_tile: i32,

    /* -- informational (derived; not needed to rebuild) -- */
    pub feet_tile: i32,
    pub feet_depth: i32,
    pub r: f64,

    /* -- voxel columns -- */
    pub columns: Vec<CapturedColumn>,
}

/* --------------------------------------------------------------------- */
/* build                                                                   */
/* --------------------------------------------------------------------- */

/// Build a [`Capture`] from a live world + player. Returns `None` on a
/// degenerate radial (player at the body centre) or an unresolvable feet
/// tile - the same guards `print_block_snapshot` uses.
pub fn from_world_player(w: &World, p: &PlayerCtrl) -> Option<Capture> {
    let center = dvec3_make(w.body.pos_x, w.body.pos_y, w.body.pos_z);
    let local = dvec3_sub(p.position, center);
    let r = dvec3_length(local);
    if r < 1e-6 {
        return None;
    }
    let feet_dir = dvec3_scale(local, 1.0 / r);
    let feet_tile = w.grid.find_tile(feet_dir, p.last_tile);
    if feet_tile < 0 {
        return None;
    }
    let feet_depth = w.radius_to_depth(r);

    /* Feet tile first, then its (up to 6) edge neighbours - the exact set
     * `walkable_floor_near` consults, and the same set the console snapshot
     * prints. */
    let mut columns = Vec::with_capacity(7);
    columns.push(CapturedColumn {
        tile: feet_tile,
        is_feet: true,
        column: read_column(w, feet_tile),
    });
    if let Some(t) = w.grid.tile(feet_tile) {
        for k in 0..t.num_neighbors as usize {
            let nb = t.edge_neighbours[k];
            if nb >= 0 && !columns.iter().any(|c| c.tile == nb) {
                columns.push(CapturedColumn {
                    tile: nb,
                    is_feet: false,
                    column: read_column(w, nb),
                });
            }
        }
    }

    Some(Capture {
        body_index: body_index(w.body.id),
        body_name: w.body.name.to_string(),
        seed: w.body.seed,
        radius_m: w.body.radius_m,
        center,
        subdivisions: w.body.subdivisions,
        tile_count: w.tile_count,
        position: p.position,
        velocity: p.velocity,
        basis: p.basis,
        basis_ready: p.basis_ready,
        yaw: p.yaw,
        pitch: p.pitch,
        grounded: p.grounded,
        is_in_space: p.is_in_space,
        last_tile: p.last_tile,
        feet_tile,
        feet_depth,
        r,
        columns,
    })
}

fn read_column(w: &World, tile: i32) -> Vec<u8> {
    let base = (tile * WORLD_MAX_DEPTH) as usize;
    w.blocks[base..base + WORLD_MAX_DEPTH as usize].to_vec()
}

/// Index of a body id (position in `BodyId::ALL`). Robust to the enum's
/// repr; round-trips through [`BodyId::from_index`].
fn body_index(id: BodyId) -> i32 {
    BodyId::ALL.iter().position(|&b| b == id).unwrap_or(0) as i32
}

/* --------------------------------------------------------------------- */
/* serialize                                                               */
/* --------------------------------------------------------------------- */

fn fbits(x: f64) -> String {
    format!("{:016x}", x.to_bits())
}
fn f32bits(x: f32) -> String {
    format!("{:08x}", x.to_bits())
}

/// Decode a raw voxel byte; unknown / out-of-range ids (a corrupt or
/// future-version capture) read as air rather than aborting the render.
fn block_of(byte: u8) -> Block {
    Block::from_raw(byte).unwrap_or(Block::Air)
}

/// The grid glyph for a captured tile's voxel at depth `d`. Air / water read
/// as empty / flow so solids stand out; everything else uses the one shared
/// [`blocks::glyph`] map.
fn cell_glyph(c: &CapturedColumn, d: i32) -> char {
    match block_of(c.column[d as usize]) {
        Block::Air => '.',
        Block::Water => '~',
        b => blocks::glyph(b),
    }
}

/// Human-readable ASCII cross-section of the captured neighbourhood, emitted
/// as `#` comment lines (the parser skips them). Depth increases UPWARD
/// (radial out): sky at the top of the chart, bedrock at the bottom - so you
/// can eyeball where the feet sit relative to floor and ceiling without
/// decoding the hex columns. The "like the JS version" readable view.
fn render_ascii(cap: &Capture) -> String {
    let mut s = String::new();
    let Some(feet) = cap.columns.iter().find(|c| c.is_feet) else {
        return s;
    };
    let fd = cap.feet_depth;
    if fd < 0 || fd >= WORLD_MAX_DEPTH {
        return s;
    }
    let lo = (fd - 12).max(0);
    let hi = (fd + 8).min(WORLD_MAX_DEPTH - 1);
    let nbs: Vec<&CapturedColumn> = cap.columns.iter().filter(|c| !c.is_feet).collect();

    s.push_str("# --- ASCII cross-section (depth UP = radial out; sky top, bedrock bottom) ---\n");
    s.push_str("# glyph: .=air ~=water #=stone d=dirt g=grass S=sand i=ice s=snow b=bedrock\n");
    s.push_str("#        c/o/t/r=coal/copper/tin/iron ore  W=wood L=leaves T=torch  @=feet cell\n");
    s.push_str(&format!("# columns:  m = feet tile {}", feet.tile));
    for (i, c) in nbs.iter().enumerate() {
        s.push_str(&format!("   {}={}", i + 1, c.tile));
    }
    s.push('\n');
    let mut hdr = String::from("#   depth   m |");
    for i in 0..nbs.len() {
        hdr.push_str(&format!(" {}", i + 1));
    }
    s.push_str(&hdr);
    s.push('\n');
    for d in (lo..=hi).rev() {
        let feet_row = d == fd;
        let mg = if feet_row { '@' } else { cell_glyph(feet, d) };
        let mut line = format!(
            "# {} d {:3}   {} |",
            if feet_row { ">" } else { " " },
            d,
            mg
        );
        for c in &nbs {
            line.push_str(&format!(" {}", cell_glyph(c, d)));
        }
        s.push_str(&line);
        s.push('\n');
    }

    /* Feet analysis - the money lines for "am I floating?". */
    let block_at = |d: i32| block_of(feet.column[d as usize]);
    let feet_block = block_at(fd);
    s.push_str(&format!(
        "# FEET: tile {} depth {} = {}{}\n",
        feet.tile,
        fd,
        blocks::name(feet_block),
        if blocks::is_solid(feet_block) {
            ""
        } else {
            "  (feet cell is NOT solid)"
        }
    ));
    match (0..fd).rev().find(|&d| blocks::is_solid(block_at(d))) {
        Some(d) => s.push_str(&format!(
            "#   floor below: top of d{} {} - {} air voxel(s) beneath the feet\n",
            d,
            blocks::name(block_at(d)),
            fd - d - 1
        )),
        None => s.push_str("#   floor below: NONE in this column (void to bedrock)\n"),
    }
    match ((fd + 1)..WORLD_MAX_DEPTH).find(|&d| blocks::is_solid(block_at(d))) {
        Some(d) => s.push_str(&format!(
            "#   ceiling above: d{} {} - {} air voxel(s) of headroom\n",
            d,
            blocks::name(block_at(d)),
            d - fd - 1
        )),
        None => s.push_str("#   ceiling above: open sky\n"),
    }
    s
}

/// Serialize a capture to the `tenecap v1` text format.
pub fn to_text(cap: &Capture) -> String {
    let mut s = String::new();
    s.push_str(FORMAT_TAG);
    s.push('\n');
    s.push_str(&format!(
        "# body={} feet-tile={} feet-depth={} r={:.3}\n",
        cap.body_name, cap.feet_tile, cap.feet_depth, cap.r
    ));
    s.push_str(&format!(
        "# pos=({:.3}, {:.3}, {:.3}) grounded={} in-space={}\n",
        cap.position.x, cap.position.y, cap.position.z, cap.grounded, cap.is_in_space
    ));
    s.push_str(&render_ascii(cap));

    s.push_str(&format!("body_index {}\n", cap.body_index));
    s.push_str(&format!("body_name {}\n", cap.body_name));
    s.push_str(&format!("seed {}\n", cap.seed));
    s.push_str(&format!("radius_m {}\n", fbits(cap.radius_m)));
    s.push_str(&format!(
        "center {} {} {}\n",
        fbits(cap.center.x),
        fbits(cap.center.y),
        fbits(cap.center.z)
    ));
    s.push_str(&format!("subdivisions {}\n", cap.subdivisions));
    s.push_str(&format!("tile_count {}\n", cap.tile_count));

    s.push_str(&format!(
        "pos {} {} {}\n",
        fbits(cap.position.x),
        fbits(cap.position.y),
        fbits(cap.position.z)
    ));
    s.push_str(&format!(
        "vel {} {} {}\n",
        fbits(cap.velocity.x),
        fbits(cap.velocity.y),
        fbits(cap.velocity.z)
    ));
    s.push_str(&format!(
        "basis_up {} {} {}\n",
        fbits(cap.basis.up.x),
        fbits(cap.basis.up.y),
        fbits(cap.basis.up.z)
    ));
    s.push_str(&format!(
        "basis_fwd {} {} {}\n",
        fbits(cap.basis.fwd.x),
        fbits(cap.basis.fwd.y),
        fbits(cap.basis.fwd.z)
    ));
    s.push_str(&format!(
        "basis_right {} {} {}\n",
        fbits(cap.basis.right.x),
        fbits(cap.basis.right.y),
        fbits(cap.basis.right.z)
    ));
    s.push_str(&format!("basis_ready {}\n", cap.basis_ready as u8));
    s.push_str(&format!("yaw {}\n", f32bits(cap.yaw)));
    s.push_str(&format!("pitch {}\n", f32bits(cap.pitch)));
    s.push_str(&format!("grounded {}\n", cap.grounded as u8));
    s.push_str(&format!("is_in_space {}\n", cap.is_in_space as u8));
    s.push_str(&format!("last_tile {}\n", cap.last_tile));
    s.push_str(&format!("feet_tile {}\n", cap.feet_tile));
    s.push_str(&format!("feet_depth {}\n", cap.feet_depth));
    s.push_str(&format!("r {}\n", fbits(cap.r)));

    s.push_str("# columns: col <tile> <feet|nb> <hex bytes, depth 0..N>\n");
    for c in &cap.columns {
        s.push_str(&format!(
            "col {} {} {}\n",
            c.tile,
            if c.is_feet { "feet" } else { "nb" },
            hex_encode(&c.column)
        ));
    }
    s.push_str("end\n");
    s
}

fn hex_encode(bytes: &[u8]) -> String {
    let mut s = String::with_capacity(bytes.len() * 2);
    for b in bytes {
        s.push_str(&format!("{:02x}", b));
    }
    s
}

fn hex_decode(s: &str) -> Option<Vec<u8>> {
    if s.len() % 2 != 0 {
        return None;
    }
    let mut out = Vec::with_capacity(s.len() / 2);
    let bytes = s.as_bytes();
    let mut i = 0;
    while i < bytes.len() {
        let hi = (bytes[i] as char).to_digit(16)?;
        let lo = (bytes[i + 1] as char).to_digit(16)?;
        out.push((hi * 16 + lo) as u8);
        i += 2;
    }
    Some(out)
}

/* --------------------------------------------------------------------- */
/* parse                                                                   */
/* --------------------------------------------------------------------- */

fn parse_fbits(tok: &str) -> Result<f64, String> {
    u64::from_str_radix(tok, 16)
        .map(f64::from_bits)
        .map_err(|_| format!("bad f64 bits '{tok}'"))
}
fn parse_f32bits(tok: &str) -> Result<f32, String> {
    u32::from_str_radix(tok, 16)
        .map(f32::from_bits)
        .map_err(|_| format!("bad f32 bits '{tok}'"))
}
fn parse_i32(tok: &str) -> Result<i32, String> {
    tok.parse::<i32>().map_err(|_| format!("bad int '{tok}'"))
}

/// A minimal per-field accumulator so [`parse`] can validate at the end
/// that everything required showed up.
#[derive(Default)]
struct Builder {
    body_index: Option<i32>,
    body_name: Option<String>,
    seed: Option<u64>,
    radius_m: Option<f64>,
    center: Option<DVec3>,
    subdivisions: Option<i32>,
    tile_count: Option<i32>,
    position: Option<DVec3>,
    velocity: Option<DVec3>,
    up: Option<DVec3>,
    fwd: Option<DVec3>,
    right: Option<DVec3>,
    basis_ready: Option<bool>,
    yaw: Option<f32>,
    pitch: Option<f32>,
    grounded: Option<bool>,
    is_in_space: Option<bool>,
    last_tile: Option<i32>,
    feet_tile: Option<i32>,
    feet_depth: Option<i32>,
    r: Option<f64>,
    columns: Vec<CapturedColumn>,
}

fn parse_vec3(t: &[&str]) -> Result<DVec3, String> {
    if t.len() < 4 {
        return Err("vec3 needs 3 components".to_string());
    }
    Ok(dvec3_make(
        parse_fbits(t[1])?,
        parse_fbits(t[2])?,
        parse_fbits(t[3])?,
    ))
}

/// Parse the `tenecap v1` text format back into a [`Capture`]. Returns a
/// human-readable error string on a malformed / wrong-version file.
pub fn parse(text: &str) -> Result<Capture, String> {
    let mut lines = text.lines();
    let head = lines.next().unwrap_or("").trim();
    if head != FORMAT_TAG {
        return Err(format!("bad header '{head}' (want '{FORMAT_TAG}')"));
    }
    let mut b = Builder::default();
    for raw in lines {
        let line = raw.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }
        let t: Vec<&str> = line.split_whitespace().collect();
        match t[0] {
            "end" => break,
            "body_index" => b.body_index = Some(parse_i32(t[1])?),
            "body_name" => b.body_name = Some(t[1..].join(" ")),
            "seed" => b.seed = Some(t[1].parse().map_err(|_| "bad seed".to_string())?),
            "radius_m" => b.radius_m = Some(parse_fbits(t[1])?),
            "center" => b.center = Some(parse_vec3(&t)?),
            "subdivisions" => b.subdivisions = Some(parse_i32(t[1])?),
            "tile_count" => b.tile_count = Some(parse_i32(t[1])?),
            "pos" => b.position = Some(parse_vec3(&t)?),
            "vel" => b.velocity = Some(parse_vec3(&t)?),
            "basis_up" => b.up = Some(parse_vec3(&t)?),
            "basis_fwd" => b.fwd = Some(parse_vec3(&t)?),
            "basis_right" => b.right = Some(parse_vec3(&t)?),
            "basis_ready" => b.basis_ready = Some(t[1] != "0"),
            "yaw" => b.yaw = Some(parse_f32bits(t[1])?),
            "pitch" => b.pitch = Some(parse_f32bits(t[1])?),
            "grounded" => b.grounded = Some(t[1] != "0"),
            "is_in_space" => b.is_in_space = Some(t[1] != "0"),
            "last_tile" => b.last_tile = Some(parse_i32(t[1])?),
            "feet_tile" => b.feet_tile = Some(parse_i32(t[1])?),
            "feet_depth" => b.feet_depth = Some(parse_i32(t[1])?),
            "r" => b.r = Some(parse_fbits(t[1])?),
            "col" => {
                if t.len() < 4 {
                    return Err("col needs tile, role, bytes".to_string());
                }
                let tile = parse_i32(t[1])?;
                let is_feet = t[2] == "feet";
                let column = hex_decode(t[3]).ok_or_else(|| format!("bad col hex for {tile}"))?;
                if column.len() != WORLD_MAX_DEPTH as usize {
                    return Err(format!(
                        "col {tile} has {} bytes, want {WORLD_MAX_DEPTH}",
                        column.len()
                    ));
                }
                b.columns.push(CapturedColumn {
                    tile,
                    is_feet,
                    column,
                });
            }
            other => return Err(format!("unknown key '{other}'")),
        }
    }

    let miss = |name: &str| format!("missing '{name}'");
    Ok(Capture {
        body_index: b.body_index.ok_or_else(|| miss("body_index"))?,
        body_name: b.body_name.unwrap_or_default(),
        seed: b.seed.ok_or_else(|| miss("seed"))?,
        radius_m: b.radius_m.ok_or_else(|| miss("radius_m"))?,
        center: b.center.ok_or_else(|| miss("center"))?,
        subdivisions: b.subdivisions.ok_or_else(|| miss("subdivisions"))?,
        tile_count: b.tile_count.ok_or_else(|| miss("tile_count"))?,
        position: b.position.ok_or_else(|| miss("pos"))?,
        velocity: b.velocity.ok_or_else(|| miss("vel"))?,
        basis: TangentBasis {
            up: b.up.ok_or_else(|| miss("basis_up"))?,
            fwd: b.fwd.ok_or_else(|| miss("basis_fwd"))?,
            right: b.right.ok_or_else(|| miss("basis_right"))?,
        },
        basis_ready: b.basis_ready.unwrap_or(true),
        yaw: b.yaw.ok_or_else(|| miss("yaw"))?,
        pitch: b.pitch.ok_or_else(|| miss("pitch"))?,
        grounded: b.grounded.ok_or_else(|| miss("grounded"))?,
        is_in_space: b.is_in_space.unwrap_or(false),
        last_tile: b.last_tile.ok_or_else(|| miss("last_tile"))?,
        feet_tile: b.feet_tile.unwrap_or(-1),
        feet_depth: b.feet_depth.unwrap_or(-1),
        r: b.r.unwrap_or(0.0),
        columns: b.columns,
    })
}

/* --------------------------------------------------------------------- */
/* rebuild (for headless replay)                                           */
/* --------------------------------------------------------------------- */

/// Reconstruct the world + player from a capture, ready to feed to
/// [`crate::player_ctrl::update`]. The world is regenerated from the body's
/// id+seed (identical grid + worldgen) and then the captured columns are
/// patched in, so player-edited voxels come back exactly. See the module
/// docs for what is / isn't restored.
pub fn rebuild(cap: &Capture) -> Result<(World, PlayerCtrl), String> {
    let id = BodyId::from_index(cap.body_index)
        .ok_or_else(|| format!("bad body_index {}", cap.body_index))?;
    let mut body = planet::get(id);
    /* Seed drives the reseeded biomes / oceans; restore it so worldgen
     * matches the captured world. */
    body.seed = cap.seed;
    /* Leave the body at its DEFAULT (gravity-table) position. Bodies orbit
     * in-game - this capture caught Tenebris ~150 km out - but `update()`
     * re-derives space-vs-walking from `planet::gravity_at`, which reads the
     * global BODIES table; headless, orbit never ran, so that table has the
     * body at its default spot. If we instead moved the body to the captured
     * center, the player would sit 150 km from where gravity_at thinks the
     * body is, the query would find no body, and the player would be flipped
     * into SPACE mode - skipping the very ground-snap we want to test (the
     * capture recorded is_in_space=0: the player was walking). Physics is
     * body-relative, so we place the player at the captured RADIAL OFFSET from
     * the body's default position instead (below). */

    let subdiv = planet::subdivisions_for_radius(body.radius_m);
    let mut w = World::create(&body, subdiv);
    while !w.gen_complete() {
        w.stream_gen(8192);
    }
    if w.tile_count != cap.tile_count {
        return Err(format!(
            "grid mismatch: rebuilt {} tiles at subdiv {subdiv}, capture had {}",
            w.tile_count, cap.tile_count
        ));
    }

    /* Patch the captured columns over the regenerated terrain via `world.set`
     * (NOT a raw blocks copy): set() marks the tile `edited` exactly when a
     * voxel diverges from procgen, which is what `walkable_floor_near`'s fast
     * path keys on. A raw copy leaves the edited bit clear, so the floor query
     * skips the voxel scan and returns the analytic procgen SURFACE - blind to
     * the captured cave, so the replay's floor query never matches what the
     * live game saw. Deriving `edited` from procgen-divergence here reproduces
     * the in-game state whether the cave was player-dug (diverges -> edited) or
     * a natural cavern (matches procgen -> not edited). */
    for c in &cap.columns {
        if c.tile < 0 || c.tile >= w.tile_count {
            return Err(format!("captured tile {} out of range", c.tile));
        }
        for (d, &byte) in c.column.iter().enumerate() {
            w.set(c.tile, d as i32, Block::from_raw(byte).unwrap_or(Block::Air));
        }
    }

    let mut p = PlayerCtrl::default();
    p.body = Some(body);
    /* Player at the captured radial offset from the body's DEFAULT position
     * (see the body-position note above). For a body at the origin (Tenebris'
     * default) this is exactly the captured pose; for an offset body it keeps
     * the same body-local pose while landing the player inside gravity_at's
     * falloff so the walking path runs. */
    let default_center = dvec3_make(body.pos_x, body.pos_y, body.pos_z);
    p.position = dvec3_add(default_center, dvec3_sub(cap.position, cap.center));
    p.velocity = cap.velocity;
    p.basis = cap.basis;
    p.basis_ready = cap.basis_ready;
    p.yaw = cap.yaw;
    p.pitch = cap.pitch;
    p.grounded = cap.grounded;
    /* Force the surface (walking) path: a capture is an on-surface collision
     * scenario, never a 6DOF space frame (the LOD-cam lesson - a stray
     * is_in_space flips the whole integration path). */
    p.is_in_space = false;
    p.last_tile = cap.last_tile;

    Ok((w, p))
}

/* --------------------------------------------------------------------- */
/* file write (runtime)                                                    */
/* --------------------------------------------------------------------- */

/// Capture the current world+player and write a `.tenecap` file. Returns the
/// path written, or an error string (degenerate pose / IO failure). The
/// directory is [`CAPTURE_DIR_ENV`] if set, else the working directory.
pub fn write_file(w: &World, p: &PlayerCtrl) -> Result<PathBuf, String> {
    let cap = from_world_player(w, p)
        .ok_or_else(|| "degenerate pose - nothing to capture".to_string())?;
    let text = to_text(&cap);

    let dir = std::env::var(CAPTURE_DIR_ENV).unwrap_or_else(|_| ".".to_string());
    let stamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
    let path = PathBuf::from(dir).join(format!("block-capture-{stamp}.tenecap"));

    std::fs::write(&path, text.as_bytes()).map_err(|e| format!("write {path:?}: {e}"))?;
    Ok(std::fs::canonicalize(&path).unwrap_or(path))
}

/* --------------------------------------------------------------------- */
/* tests                                                                   */
/* --------------------------------------------------------------------- */

#[cfg(test)]
mod tests {
    use super::*;
    use tenebris_core::blocks::Block;
    use tenebris_core::math::{dvec3_cross, dvec3_normalize};

    /// The IEEE-754 bit triple of a vector, for exact equality asserts.
    fn bits3(v: DVec3) -> (u64, u64, u64) {
        (v.x.to_bits(), v.y.to_bits(), v.z.to_bits())
    }

    /// A well-defined tangent frame around a radial `up` (no degenerate
    /// cross when up happens to align with an axis).
    fn basis_about(up: DVec3) -> TangentBasis {
        let refv = if up.x.abs() < 0.9 {
            dvec3_make(1.0, 0.0, 0.0)
        } else {
            dvec3_make(0.0, 1.0, 0.0)
        };
        let fwd = dvec3_normalize(dvec3_cross(up, refv));
        let right = dvec3_cross(fwd, up);
        TangentBasis { up, fwd, right }
    }

    /// A tiny built world we can carve and pose a player into. Subdiv 4 is
    /// cheap and its grid rebuilds identically from the body id+seed.
    fn small_world() -> (BodyConfig, World) {
        let body = planet::get(BodyId::Tenebris);
        let mut w = World::create(&body, planet::subdivisions_for_radius(body.radius_m));
        while !w.gen_complete() {
            w.stream_gen(8192);
        }
        (body, w)
    }

    /// Pick a solid surface tile and stand the player one step above its top
    /// solid voxel, then carve an air pocket just under the feet - the shape
    /// of a "floating in a cave" scene.
    fn posed_capture() -> (World, PlayerCtrl) {
        let (body, mut w) = small_world();
        /* Find a tile with a clear solid top. */
        let mut tile = -1;
        let mut top = -1;
        'scan: for t in 0..w.tile_count {
            let base = (t * WORLD_MAX_DEPTH) as usize;
            for d in (1..WORLD_MAX_DEPTH).rev() {
                let bl = w.blocks[base + d as usize];
                if bl != Block::Air.raw() && bl != Block::Water.raw() {
                    tile = t;
                    top = d;
                    break 'scan;
                }
            }
        }
        assert!(tile >= 0, "no solid tile in small world");
        /* Carve an air pocket a couple of voxels under the surface. */
        let base = (tile * WORLD_MAX_DEPTH) as usize;
        w.blocks[base + (top - 2) as usize] = Block::Air.raw();

        let dir = dvec3_normalize(w.grid.tile(tile).unwrap().center);
        let r = w.depth_to_radius_m(top + 3); /* a bit above the surface = floating */
        let mut p = PlayerCtrl::default();
        p.body = Some(body);
        p.position = dvec3_scale(dir, r);
        p.last_tile = tile;
        p.basis = basis_about(dir);
        p.basis_ready = true;
        (w, p)
    }

    #[test]
    fn round_trips_exactly() {
        let (w, p) = posed_capture();
        let cap = from_world_player(&w, &p).expect("capture");
        let text = to_text(&cap);
        let back = parse(&text).expect("parse");

        /* Body identity + grid. */
        assert_eq!(back.body_index, cap.body_index);
        assert_eq!(back.seed, cap.seed);
        assert_eq!(back.subdivisions, cap.subdivisions);
        assert_eq!(back.tile_count, cap.tile_count);
        /* Doubles are bit-exact through the hex encoding. */
        assert_eq!(bits3(back.position), bits3(cap.position));
        assert_eq!(bits3(back.velocity), bits3(cap.velocity));
        assert_eq!(back.radius_m.to_bits(), cap.radius_m.to_bits());
        assert_eq!(back.basis, cap.basis);
        assert_eq!(back.yaw.to_bits(), cap.yaw.to_bits());
        assert_eq!(back.last_tile, cap.last_tile);
        /* Columns come back byte-for-byte, feet flag intact. */
        assert_eq!(back.columns, cap.columns);
        assert!(back.columns[0].is_feet, "first column is the feet tile");
    }

    #[test]
    fn rebuild_restores_columns_and_pose() {
        let (w, p) = posed_capture();
        let cap = from_world_player(&w, &p).expect("capture");
        let text = to_text(&cap);
        let back = parse(&text).expect("parse");
        let (w2, p2) = rebuild(&back).expect("rebuild");

        /* The rebuilt world reproduces every captured column exactly - the
         * carved air pocket included, proving player edits survive the
         * round-trip through the file. */
        for c in &cap.columns {
            let base = (c.tile * WORLD_MAX_DEPTH) as usize;
            assert_eq!(
                &w2.blocks[base..base + WORLD_MAX_DEPTH as usize],
                &c.column[..],
                "tile {} column mismatch after rebuild",
                c.tile
            );
        }
        /* Pose is bit-exact; the space flag is forced false for the walking
         * integration path. */
        assert_eq!(bits3(p2.position), bits3(p.position));
        assert_eq!(p2.basis, p.basis);
        assert_eq!(p2.last_tile, p.last_tile);
        assert!(!p2.is_in_space);
        let _ = w2.tile_count; /* silence unused if asserts compiled out */
    }

    /// Dev triage tool: point `TENECAP=<path>` at a real `.tenecap` file and
    /// replay it through `player_ctrl::update`, logging the feet depth each
    /// frame so we can see whether a captured "stuck floating" scene keeps
    /// floating headlessly (bug reproduces offline) or settles to its floor
    /// (bug is transient / multi-frame in the live game). Not user-specific -
    /// it reads whatever file the env points at. Run:
    ///   TENECAP=path/to.tenecap cargo test -p tenebris-client \
    ///     replay_env_capture -- --ignored --nocapture
    #[test]
    #[ignore]
    fn replay_env_capture() {
        let Ok(path) = std::env::var("TENECAP") else {
            eprintln!("set TENECAP=<path.tenecap> to run this");
            return;
        };
        crate::input::init();
        let text = std::fs::read_to_string(&path).expect("read TENECAP file");
        let cap = parse(&text).expect("parse capture");
        let (w, mut p) = rebuild(&cap).expect("rebuild");
        let center = dvec3_make(w.body.pos_x, w.body.pos_y, w.body.pos_z);
        let depth_of = |p: &PlayerCtrl, w: &World| {
            w.radius_to_depth(dvec3_length(dvec3_sub(p.position, center)))
        };
        eprintln!(
            "capture: feet_depth={} grounded={} -> rebuilt start depth={}",
            cap.feet_depth,
            cap.grounded,
            depth_of(&p, &w)
        );
        for i in 0..180 {
            crate::player_ctrl::update(&mut p, Some(&w), 1.0 / 60.0);
            if i < 10 || i % 30 == 0 {
                eprintln!("  frame {:3}: depth={} grounded={}", i, depth_of(&p, &w), p.grounded);
            }
        }
        eprintln!(
            "final: depth={} grounded={}  (capture floated at feet_depth={})",
            depth_of(&p, &w),
            p.grounded,
            cap.feet_depth
        );
    }

    /// Regression: the "stuck floating in a cave, gravity never pulls me
    /// down" bug (CLAUDE.md standing OPEN bug), captured in-game as a
    /// `.tenecap` and frozen here as a fixture. The player was hanging at feet
    /// depth 62 (grounded, vy=0) two voxels above the cave floor (top of d59),
    /// held there by the tree-gated swept-multi-tile landing latching onto a
    /// neighbour tile's ledge. After the fix (that catch no longer lifts the
    /// player above their own tile's reachable floor) the replay must fall to
    /// the cave floor. Heavy (real subdiv-7 gen), so #[ignore]d for CI;
    /// green here is NOT proof - only the user's in-game confirmation counts.
    #[test]
    #[ignore]
    fn cave_float_repro_falls_to_floor() {
        crate::input::init();
        const FIXTURE: &str = include_str!("block_capture_testdata/cave_float_repro.tenecap");
        let cap = parse(FIXTURE).expect("parse fixture");
        assert_eq!(cap.feet_depth, 62, "fixture captured the float at feet depth 62");
        let (w, mut p) = rebuild(&cap).expect("rebuild");
        let center = dvec3_make(w.body.pos_x, w.body.pos_y, w.body.pos_z);
        let depth_of = |p: &PlayerCtrl| w.radius_to_depth(dvec3_length(dvec3_sub(p.position, center)));
        for _ in 0..180 {
            crate::player_ctrl::update(&mut p, Some(&w), 1.0 / 60.0);
        }
        let final_depth = depth_of(&p);
        /* The cave floor is the top of the d59 stone (feet rest at depth 60).
         * Before the fix the player stuck at depth 62; after it they settle on
         * the floor. Assert they dropped at least to depth 61 (no longer
         * floating in the middle of the pocket). */
        assert!(
            final_depth <= 60,
            "cave float NOT fixed: player settled at depth {final_depth} (want <= 60, the cave floor) - still hanging in the air pocket"
        );
    }

    /// Regression: "cannot jump while standing on a tree" (captured in-game).
    /// The player was perched on the leaf canopy (feet depth 74) held up by
    /// the voxel-containment resolve, but grounded=false because the
    /// walkable-floor query skips trees - so jump (which needs grounded) did
    /// nothing. After the fix (a tree voxel directly under the feet grounds the
    /// player) the replay must end grounded ON the canopy. Heavy (real subdiv-7
    /// gen), #[ignore]d for CI; green here is NOT proof - only an in-game jump
    /// counts.
    #[test]
    #[ignore]
    fn tree_canopy_grounds_so_jump_works() {
        crate::input::init();
        const FIXTURE: &str = include_str!("block_capture_testdata/tree_canopy_jump.tenecap");
        let cap = parse(FIXTURE).expect("parse fixture");
        let (w, mut p) = rebuild(&cap).expect("rebuild");
        for _ in 0..180 {
            crate::player_ctrl::update(&mut p, Some(&w), 1.0 / 60.0);
        }
        assert!(
            p.grounded,
            "canopy jump NOT fixed: player still ungrounded on the tree top - jump would do nothing"
        );
    }

    #[test]
    fn bad_header_is_rejected() {
        assert!(parse("not a capture\nfoo 1\n").is_err());
        assert!(parse("tenecap v2\n").is_err());
    }

    /// Heavy: capture at the REAL game subdivision, round-trip through the
    /// file, rebuild, and replay through `player_ctrl::update`. This is the
    /// harness a user's in-game "stuck floating in a cave" `.tenecap` flows
    /// through - the fixture must never sink the player toward bedrock.
    /// #[ignore]d for CI speed (full-disk gen at subdiv 7 is seconds); run
    /// with `-- --ignored --nocapture`.
    #[test]
    #[ignore]
    fn replay_at_real_subdiv_stays_put() {
        crate::input::init();
        let mut body = planet::get(BodyId::Tenebris);
        body.seed = 0xC0FFEE_D00D;
        let subdiv = planet::subdivisions_for_radius(body.radius_m);
        let mut w = World::create(&body, subdiv);
        while !w.gen_complete() {
            w.stream_gen(8192);
        }
        /* Stand grounded on a solid tile's surface. */
        let mut tile = -1;
        let mut top = -1;
        'scan: for t in 0..w.tile_count {
            let base = (t * WORLD_MAX_DEPTH) as usize;
            for d in (1..WORLD_MAX_DEPTH).rev() {
                let bl = w.blocks[base + d as usize];
                if bl != Block::Air.raw() && bl != Block::Water.raw() {
                    tile = t;
                    top = d;
                    break 'scan;
                }
            }
        }
        assert!(tile >= 0);
        let dir = dvec3_normalize(w.grid.tile(tile).unwrap().center);
        let ground_r = w.depth_to_radius_m(top + 1);

        let mut p = PlayerCtrl::default();
        crate::player_ctrl::init(&mut p, &body);
        p.position = dvec3_scale(dir, ground_r + 0.05);
        p.last_tile = tile;
        p.grounded = true;
        for _ in 0..8 {
            crate::player_ctrl::update(&mut p, Some(&w), 1.0 / 60.0);
        }

        /* Capture -> file -> parse -> rebuild -> replay. */
        let cap = from_world_player(&w, &p).expect("capture");
        let back = parse(&to_text(&cap)).expect("parse");
        let (w2, mut p2) = rebuild(&back).expect("rebuild");
        let start_r = dvec3_length(dvec3_sub(
            p2.position,
            dvec3_make(w2.body.pos_x, w2.body.pos_y, w2.body.pos_z),
        ));
        let mut min_r = start_r;
        for _ in 0..120 {
            crate::player_ctrl::update(&mut p2, Some(&w2), 1.0 / 60.0);
            let rr = dvec3_length(dvec3_sub(
                p2.position,
                dvec3_make(w2.body.pos_x, w2.body.pos_y, w2.body.pos_z),
            ));
            min_r = min_r.min(rr);
        }
        eprintln!("replay: start_r={start_r:.2} min_r={min_r:.2} grounded={}", p2.grounded);
        /* Must not plunge toward bedrock - the fall-through signature. */
        assert!(
            min_r >= start_r - 2.0,
            "replayed capture sank {:.2} m (start_r={start_r:.2} min_r={min_r:.2}) - fall-through",
            start_r - min_r
        );
    }
}
