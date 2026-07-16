//! The orbital trading station - market, warehouse, fuel (space era Phase 2).
//!
//! Core, shared by SP and MP: every mutation (a sale, a purchase, a warehouse
//! upgrade) goes through these rules, and the caller persists the returned
//! state SAME-FRAME (the client via `client_kv`, an MP server authoritatively).
//!
//! Prices are a DETERMINISTIC function of world time (a seeded per-item drift
//! field, like the weather sim) plus a supply-pressure term that decays
//! analytically from its last-update timestamp - so there is no per-tick
//! market state to advance and server-resume time compression is free: the
//! price "caught up" the moment you ask for it at the new time.
//!
//! All knobs live in `assets/config/economy.yaml` ([`crate::economy`] scalars
//! + the `[prices]` section parsed by [`load_prices`]).

use crate::economy::{self, Wallet};
use crate::items::{self, ItemId};
use crate::math::{dvec3_make, DVec3};
use crate::planet::{self, BodyId};
use std::sync::Mutex;

/* ------------------------------------------------------------------ */
/* Structure + orbit config - assets/config/station.yaml.              */

/// Tunables for the orbital drum + rendezvous (station.yaml). The orbit
/// SPEED is deliberately absent: it is derived from the gravity field at
/// the configured altitude (see [`orbit_speed_mps`]), so the station's
/// rails and a coasting rocket obey the same physics.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct StationConfig {
    /// Outer radius of the ring deck, in hex rings.
    pub radius_hexes: u32,
    /// Reference layer stack: prism layer height = height_m / layers.
    pub layers: u32,
    /// Reference stack height in metres (see `layers`).
    pub height_m: f32,
    /// Hex circumradius (centre -> corner) of one prism, metres.
    pub hex_size_m: f32,
    /// Orbit altitude above the Tenebris surface, metres.
    pub altitude_m: f32,
    /// How close the player must fly to dock.
    pub dock_radius_m: f32,
    /// Max relative speed (m/s) the dock accepts - the rendezvous gate.
    pub dock_max_rel_mps: f32,
    /// Ring deck width in hex rings (annulus radius_hexes-ring_width+1..).
    pub ring_width: u32,
    /// Deck slab thickness in layers (ring, spokes, pads).
    pub slab_layers: u32,
    /// Casino hotel tower footprint radius, hex rings.
    pub tower_radius: u32,
    /// Casino hotel storeys (each: one slab + `floor_air_layers` clear).
    pub tower_floors: u32,
    /// Clear walking headroom per storey, in air layers.
    pub floor_air_layers: u32,
    /// How high a ledge the player steps up onto while walking the
    /// station (sized to make the stairway's full-layer 1.25 m treads
    /// climbable).
    pub step_up_m: f32,
    /// Head clearance used for ceiling collision inside the hotel.
    pub head_clearance_m: f32,
    /// Artificial-gravity field reach above each deck column, metres
    /// ("about 20 blocks" at the default 2 m hex).
    pub gravity_field_m: f32,
    /// Artificial-gravity strength inside the field, m/s^2 (pulls toward
    /// the deck in the station's orbit frame).
    pub artificial_gravity_mps2: f32,
    /// Exponential damping rate (1/s) of relative slide while standing
    /// on a deck - how quickly you come to rest on the moving station.
    pub deck_friction: f32,
    /// Orbit phase at world-time zero, degrees from the +x axis. Kept
    /// OFF the prime meridian so a fresh world's station is not parked
    /// over the spawn/launch complex - an ascending rocket should meet
    /// the artificial-gravity field by rendezvous, not by accident.
    pub orbit_phase0_deg: f32,
    /// Block-light emission (0..15, torch-style) of the lamp materials:
    /// the courtyard light fixtures and the gold room-light tiles.
    pub lamp_emission: u32,
    /// Block-light emission of the neon trim (cyan/pink bands, parapet).
    pub neon_emission: u32,
    /// Block-light emission of the lucky-7 marquees / sign spire.
    pub sign_emission: u32,
    /// How fast (1/s) the player's tangent basis rolls onto the station's
    /// deck frame inside the artificial-gravity field. The station is the
    /// AUTHORITATIVE up in its sphere of influence: this is the rate the
    /// world levels out when you enter, ~1/rate seconds to settle.
    pub soi_align_rate: f32,
    /// Camera distance (m) within which the FULL prism drum renders.
    /// Beyond it the station draws as a single bright glint quad - the
    /// whole ~40 m wheel is sub-pixel from the surface 9.7 km below, yet
    /// its thousands of prisms were rebuilt through sokol_gl every frame.
    pub lod_full_range_m: f32,
    /// Apparent size of the far glint as a fraction of its distance
    /// (angular size). 0.004 = roughly a bright 4-px star at 1080p.
    pub lod_glint_frac: f32,
}

impl StationConfig {
    pub const DEFAULT: StationConfig = StationConfig {
        radius_hexes: 10,
        /* 12 layers over 15 m = person-scale 1.25 m prisms, so storeys
         * and stair treads work at walking proportions. */
        layers: 12,
        height_m: 15.0,
        hex_size_m: 2.0,
        /* 9700 m over the 300 m surface = a 10 km orbit radius -> exactly
         * 15.00 m/s by `orbit_speed_mps`, lapping in ~70 min. Low orbits
         * are unreachable rather than hard: at the old 120 m the station
         * crossed the sky at 73 m/s / 10 deg/s, which no rocket could
         * bring inside the 8 m/s dock gate. */
        altitude_m: 9700.0,
        dock_radius_m: 60.0,
        dock_max_rel_mps: 8.0,
        ring_width: 3,
        slab_layers: 2,
        tower_radius: 4,
        tower_floors: 5,
        /* 5 air layers per storey: grand casino-hotel rooms, and the
         * value the connected central spiral needs so each tread keeps
         * 3 clear blocks above it (see STAIR_STEPS_PER_FLOOR). */
        floor_air_layers: 5,
        /* One full 1.25 m layer + slack: the stairway treads are
         * one-layer prisms (the user's template), climbed by step-up. */
        step_up_m: 1.3,
        head_clearance_m: 1.8,
        gravity_field_m: 40.0,
        artificial_gravity_mps2: 15.0,
        deck_friction: 6.0,
        orbit_phase0_deg: 120.0,
        /* Torch-scale emissions (world torches seed at 14): the lamps
         * carry the room, neon is trim, marquees sit between. */
        lamp_emission: 15,
        neon_emission: 8,
        sign_emission: 12,
        soi_align_rate: 5.0,
        lod_full_range_m: 3000.0,
        lod_glint_frac: 0.004,
    };
}

static S_CFG: Mutex<StationConfig> = Mutex::new(StationConfig::DEFAULT);

pub fn config() -> StationConfig {
    *S_CFG.lock().unwrap()
}

pub fn set_config(c: StationConfig) {
    *S_CFG.lock().unwrap() = c;
}

/// Parse station.yaml (tiny key/value subset, `#` comments, the
/// `station:` section header is skipped). Unknown keys warn, zero /
/// missing fields keep the compiled-in default (partial-override rule).
pub fn parse_config(src: &str, path: &str) -> StationConfig {
    let mut c = StationConfig::DEFAULT;
    for raw in src.lines() {
        let line = raw.split('#').next().unwrap_or("").trim();
        if line.is_empty() || line.ends_with(':') {
            continue;
        }
        let Some((key, val)) = line.split_once(':') else { continue };
        let (key, val) = (key.trim(), val.trim());
        let f = val.parse::<f32>().unwrap_or(0.0);
        match key {
            "radius_hexes" => c.radius_hexes = if f > 0.0 { f as u32 } else { c.radius_hexes },
            "layers" => c.layers = if f > 0.0 { f as u32 } else { c.layers },
            "height_m" => c.height_m = if f > 0.0 { f } else { c.height_m },
            "hex_size_m" => c.hex_size_m = if f > 0.0 { f } else { c.hex_size_m },
            "altitude_m" => c.altitude_m = if f > 0.0 { f } else { c.altitude_m },
            "dock_radius_m" => c.dock_radius_m = if f > 0.0 { f } else { c.dock_radius_m },
            "dock_max_rel_mps" => {
                c.dock_max_rel_mps = if f > 0.0 { f } else { c.dock_max_rel_mps }
            }
            "ring_width" => c.ring_width = if f > 0.0 { f as u32 } else { c.ring_width },
            "slab_layers" => c.slab_layers = if f > 0.0 { f as u32 } else { c.slab_layers },
            "tower_radius" => c.tower_radius = if f > 0.0 { f as u32 } else { c.tower_radius },
            "tower_floors" => c.tower_floors = if f > 0.0 { f as u32 } else { c.tower_floors },
            "floor_air_layers" => {
                c.floor_air_layers = if f > 0.0 { f as u32 } else { c.floor_air_layers }
            }
            "step_up_m" => c.step_up_m = if f > 0.0 { f } else { c.step_up_m },
            "head_clearance_m" => {
                c.head_clearance_m = if f > 0.0 { f } else { c.head_clearance_m }
            }
            "gravity_field_m" => {
                c.gravity_field_m = if f > 0.0 { f } else { c.gravity_field_m }
            }
            "artificial_gravity_mps2" => {
                c.artificial_gravity_mps2 = if f > 0.0 { f } else { c.artificial_gravity_mps2 }
            }
            "deck_friction" => c.deck_friction = if f > 0.0 { f } else { c.deck_friction },
            "soi_align_rate" => c.soi_align_rate = if f > 0.0 { f } else { c.soi_align_rate },
            "lod_full_range_m" => c.lod_full_range_m = if f > 0.0 { f } else { c.lod_full_range_m },
            "lod_glint_frac" => c.lod_glint_frac = if f > 0.0 { f } else { c.lod_glint_frac },
            "orbit_phase0_deg" => {
                c.orbit_phase0_deg = if f > 0.0 { f } else { c.orbit_phase0_deg }
            }
            "lamp_emission" => c.lamp_emission = if f > 0.0 { f as u32 } else { c.lamp_emission },
            "neon_emission" => c.neon_emission = if f > 0.0 { f as u32 } else { c.neon_emission },
            "sign_emission" => c.sign_emission = if f > 0.0 { f as u32 } else { c.sign_emission },
            _ => println!("[station] {}: unknown key '{}'", path, key),
        }
    }
    c
}

pub fn load_config(path: &str) {
    match std::fs::read_to_string(path) {
        Ok(src) => set_config(parse_config(&src, path)),
        Err(_) => println!("[station] {} not found, using compiled-in defaults", path),
    }
}

/* ------------------------------------------------------------------ */
/* Ring-station geometry: outer ring deck + spokes + casino hotel      */
/* tower + external docking pads (the classic wheel-station look).     */

/// Surface material of a station prism. Station-only - these are NOT
/// world blocks: the structure is not voxel terrain, so its pieces can
/// never be mined, broken, or built over (the casino is private
/// property; that protection holds by construction). The client maps
/// each material to a texture from the casino tile set.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum StationMat {
    /// Brushed steel structure / roof plating.
    Hull,
    /// Diamond-plate deck walking surface.
    Floor,
    /// Casino carpet (hotel floors).
    Carpet,
    /// Plum art-deco hotel facade.
    Wall,
    /// Emissive cyan neon trim (parapet, alternating storey bands).
    Neon,
    /// Emissive hot-pink neon (the other storey bands).
    NeonPink,
    /// Emissive warm-gold neon (room lights, pad markers).
    NeonGold,
    /// Emissive lucky-7 marquee.
    Sign,
    /// Semi-transparent glazing (courtyard floor, hotel windows).
    Glass,

    /* Function fixtures - the station's POIs, one-hex prisms on the
     * deck. Placed with 6-fold symmetry (see the shell fixture pass).
     * Interaction (opening the actual trade/research/zoo/casino UIs)
     * reuses the station hub screens; these are the in-world markers. */
    /// Stock-exchange kiosk (the trading station).
    TradeTerminal,
    /// Science console (the research station).
    ResearchConsole,
    /// Animal-museum display case (the courtyard zoo).
    MuseumCase,
    /// Emissive hex lamp (courtyard lighting).
    LightFixture,
    /// Slot-machine cabinet (casino game).
    Slots,
    /// Blackjack / poker table (casino game).
    CardTable,
}

/// One hex prism of the station structure. `q`/`r`/`layer` are the
/// axial-grid + stack coordinates (the renderer culls faces against
/// neighbouring occupancy with them); `x`/`y`/`z` are the precomputed
/// STATION-LOCAL metres - x/z span the deck plane (pointy-top axial hex
/// grid), y is the station axis with 0 at the keel. The client orients
/// local +y radially away from the planet at the orbital anchor, so
/// "down" on deck is toward the planet.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Prism {
    pub q: i32,
    pub r: i32,
    pub layer: i32,
    pub x: f32,
    pub y: f32,
    pub z: f32,
    pub mat: StationMat,
}

/// Centered hexagonal number: hexes in a full disk of radius `n` rings.
pub fn hexes_per_deck(n: u32) -> u32 {
    3 * n * (n + 1) + 1
}

/// Height of one prism layer (m).
pub fn layer_h(cfg: &StationConfig) -> f32 {
    cfg.height_m / cfg.layers.max(1) as f32
}

/// The six axial hex directions (pointy-top).
pub const HEX_DIRS: [(i32, i32); 6] = [(1, 0), (0, 1), (-1, 1), (-1, 0), (0, -1), (1, -1)];

/// Hex-grid distance from the origin.
pub fn hex_dist(q: i32, r: i32) -> i32 {
    (q.abs() + r.abs() + (q + r).abs()) / 2
}

/// Axial cell -> station-local metres (pointy-top layout).
pub fn axial_to_local(q: i32, r: i32, a: f32) -> (f32, f32) {
    (a * 3.0f32.sqrt() * (q as f32 + r as f32 * 0.5), a * 1.5 * r as f32)
}

/// Station-local metres -> the axial cell containing the point (cube
/// rounding, the standard hex pick). Inverse of [`axial_to_local`].
pub fn local_to_axial(x: f32, z: f32, a: f32) -> (i32, i32) {
    let qf = (3.0f32.sqrt() / 3.0 * x - z / 3.0) / a;
    let rf = (2.0 / 3.0 * z) / a;
    let sf = -qf - rf;
    let (mut qi, mut ri, si) = (qf.round(), rf.round(), sf.round());
    let (dq, dr, ds) = ((qi - qf).abs(), (ri - rf).abs(), (si - sf).abs());
    if dq > dr && dq > ds {
        qi = -ri - si;
    } else if dr > ds {
        ri = -qi - si;
    }
    (qi as i32, ri as i32)
}

/// Inner radius of the ring deck annulus.
fn ring_inner(cfg: &StationConfig) -> i32 {
    (cfg.radius_hexes as i32 - cfg.ring_width as i32 + 1).max(1)
}

/// Layers between one hotel floor's walking surface and the next:
/// one slab layer plus the configured clear air layers.
pub fn floor_pitch(cfg: &StationConfig) -> i32 {
    1 + cfg.floor_air_layers.max(1) as i32
}

/// Layer index of hotel floor `f`'s slab (its top is the walking
/// surface). Floor 0 sits level with the ring/courtyard deck.
fn floor_slab_layer(cfg: &StationConfig, f: i32) -> i32 {
    cfg.slab_layers.max(1) as i32 - 1 + f * floor_pitch(cfg)
}

/// Roof slab layer - the top of the hotel wall.
fn roof_layer(cfg: &StationConfig) -> i32 {
    floor_slab_layer(cfg, cfg.tower_floors.max(1) as i32)
}

/// The hotel stairway's winding order - the user's stairway template
/// (`assets/templates/stairway.template.json`), verbatim: one
/// full-layer tread per layer stepping around the six ring-1 cells in
/// exactly this sequence (consecutive cells are hex-adjacent, one lap
/// per storey at the default 6-layer pitch).
pub const STAIR_RING_ORDER: [(i32, i32); 6] =
    [(1, -1), (0, -1), (-1, 0), (-1, 1), (0, 1), (1, 0)];

/// Gold-band period of the stairway's centre column, in layers - also
/// from the template (a lit core: floor plating with a `neon_gold`
/// band every third layer, starting level with the first tread).
pub const STAIR_CORE_GOLD_PERIOD: i32 = 3;

/// True when slab `f`'s cell (q, r) is part of the central atrium
/// shaft the stairway climbs through: every slab above the lobby (and
/// the roof, `f == tower_floors`) opens the six ring-1 cells the
/// treads wind, so no floor blocks the climb.
fn stairwell_open(f: i32, q: i32, r: i32) -> bool {
    f >= 1 && hex_dist(q, r) == 1
}

/// Generate the wheel station. Pure function of the config; the client
/// meshes it once and re-poses it per frame. Layout (all radii in hex
/// rings, heights in layers of [`layer_h`]):
///
/// - **Ring deck**: annulus `ring_inner..=radius_hexes`, a slab
///   `slab_layers` tall (deck plating on top, hull keel), with a neon
///   parapet running the outer rim.
/// - **Spokes**: six 1-hex-wide slab walkways from the tower to the ring.
/// - **Casino hotel tower** (centre): `tower_radius` disk, walls
///   `tower_layers` tall - plum casino wall with neon bands every third
///   layer and lucky-7 marquees around the crown - carpeted lobby floor,
///   hull roof deck, and a 2-layer sign spire on top.
/// - **Docking pads**: six 7-hex pads bridged off the ring corners, deck
///   plating with a neon centre marker to land on.
pub fn shell(cfg: &StationConfig) -> Vec<Prism> {
    let a = cfg.hex_size_m;
    let lh = layer_h(cfg);
    let n_out = cfg.radius_hexes as i32;
    let n_in = ring_inner(cfg);
    let slab = cfg.slab_layers.max(1) as i32;
    let t_rad = cfg.tower_radius as i32;
    let floors = cfg.tower_floors.max(1) as i32;
    let pitch = floor_pitch(cfg);
    let roof = roof_layer(cfg);

    let mut out: Vec<Prism> = Vec::new();
    let mut occupied = std::collections::HashSet::new();
    /* First writer wins; overlapping sections (e.g. a pad ring touching
     * its bridge cell) stay watertight without duplicate prisms. */
    let mut push = |q: i32, r: i32, layer: i32, mat: StationMat| {
        if !occupied.insert((q, r, layer)) {
            return;
        }
        let (x, z) = axial_to_local(q, r, a);
        out.push(Prism { q, r, layer, x, y: layer as f32 * lh, z, mat });
    };

    /* Slab column: hull keel layers with a chosen deck material on top. */
    let slab_col = |push: &mut dyn FnMut(i32, i32, i32, StationMat), q: i32, r: i32, top: StationMat| {
        for l in 0..slab {
            push(q, r, l, if l == slab - 1 { top } else { StationMat::Hull });
        }
    };

    /* 1. Ring deck annulus + neon parapet on the outer rim. The
     * parapet BREAKS at the six ring corners where the pad bridges
     * connect - those are the gates a player walks through coming in
     * from a landing pad (an unbroken parapet blocked the route). */
    for q in -n_out..=n_out {
        for r in (-n_out).max(-q - n_out)..=n_out.min(-q + n_out) {
            let d = hex_dist(q, r);
            if d < n_in || d > n_out {
                continue;
            }
            slab_col(&mut push, q, r, StationMat::Floor);
            let gate = HEX_DIRS.iter().any(|&(dq, dr)| (q, r) == (dq * n_out, dr * n_out));
            if d == n_out && !gate {
                push(q, r, slab, StationMat::Neon);
            }
        }
    }

    /* 2. Spokes: tower edge -> ring inner edge, one hex wide. */
    for (dq, dr) in HEX_DIRS {
        for k in (t_rad + 1)..n_in {
            slab_col(&mut push, dq * k, dr * k, StationMat::Floor);
        }
    }

    /* 3. Courtyard: every opening between the spokes is GLAZED - a
     * single glass layer flush with deck level, open space below, so
     * the planet scrolls past under your feet with no hole anywhere in
     * the wheel to fall through (pinned by the no-holes test). */
    for q in -(n_in - 1)..=(n_in - 1) {
        for r in (-(n_in - 1)).max(-q - (n_in - 1))..=(n_in - 1).min(-q + (n_in - 1)) {
            let d = hex_dist(q, r);
            if d <= t_rad || d >= n_in {
                continue;
            }
            /* Spoke cells lie on the six axial lines through the origin. */
            let on_spoke = (r == 0 && q != 0) || (q == 0 && r != 0) || (q == -r && q != 0);
            if on_spoke {
                continue;
            }
            push(q, r, slab - 1, StationMat::Glass);
        }
    }

    /* 4a. Central stairway - the user's stairway template, verbatim
     * pattern: a solid lit core column (floor plating with a gold
     * light band every STAIR_CORE_GOLD_PERIOD layers) from the lobby
     * slab up to just under the roof, and ONE full-layer hull tread
     * per layer winding the ring-1 cells in STAIR_RING_ORDER. Each
     * tread is a one-layer step (inside `step_up_m`); the same cell is
     * revisited every 6 layers, so every tread keeps 5 clear layers
     * overhead, and the run tops out level with the roof deck. Pushed
     * BEFORE the tower interior so the core column wins the (0,0)
     * cells (first-writer rule). */
    for l in (slab - 1)..roof {
        let mat = if l >= slab && (l - slab) % STAIR_CORE_GOLD_PERIOD == 0 {
            StationMat::NeonGold
        } else {
            StationMat::Floor
        };
        push(0, 0, l, mat);
    }
    for l in slab..=roof {
        let (sq, sr) = STAIR_RING_ORDER[((l - slab) as usize) % 6];
        push(sq, sr, l, StationMat::Hull);
    }

    /* 4. Casino hotel tower: `floors` storeys, each one slab + clear air
     * layers, spiral stairwell openings, glazed windows per storey, a
     * lobby door facing the +x spoke, neon storey bands, marquee crown,
     * sign spire, and a ceiling light tile in every room. */
    let door_layers = slab..(slab + cfg.floor_air_layers.max(1) as i32);
    for q in -t_rad..=t_rad {
        for r in (-t_rad).max(-q - t_rad)..=t_rad.min(-q + t_rad) {
            let d = hex_dist(q, r);
            if d == t_rad {
                /* Facade. Window band: the middle air layer of each
                 * storey, on alternating cells (glazed). Entrance: a
                 * TRIPLE-WIDE arch facing the +x spoke - the frontmost
                 * corner cell (t_rad, 0), sitting dead on +x, plus one
                 * ring-neighbour down EACH facade edge, (t_rad, -1) and
                 * (t_rad-1, 1). Those flanks land at z = -/+1.5 m, so the
                 * doorway is symmetric about the spoke (3 layers = 3.75 m
                 * clear over the 3 m arch requirement), crowned by a
                 * lucky-7 marquee. */
                let (x0, z0) = axial_to_local(q, r, a);
                let angle_idx = (z0.atan2(x0) / std::f32::consts::TAU * 24.0).round() as i32;
                let is_door = (q == t_rad && (r == 0 || r == -1))
                    || (q == t_rad - 1 && r == 1);
                for l in 0..=roof {
                    if is_door && door_layers.contains(&l) {
                        continue; /* lobby entrance */
                    }
                    let in_floor = (l - (slab - 1)).rem_euclid(pitch);
                    let storey_band = l > slab && in_floor == 0 && l < roof;
                    let window = in_floor == 2 && l < roof && angle_idx % 2 == 0;
                    let mat = if l == roof {
                        StationMat::Sign /* marquee crown ring */
                    } else if is_door && l == door_layers.end {
                        StationMat::Sign /* entrance arch marquee */
                    } else if storey_band {
                        /* Alternate the storey band colours: cyan, pink. */
                        let f = (l - (slab - 1)) / pitch;
                        if f % 2 == 0 {
                            StationMat::Neon
                        } else {
                            StationMat::NeonPink
                        }
                    } else if window {
                        StationMat::Glass
                    } else if l < slab {
                        StationMat::Hull
                    } else {
                        StationMat::Wall
                    };
                    push(q, r, l, mat);
                }
            } else {
                /* Interior: one slab per storey (carpet; the stair core
                 * column - pushed in 4a - owns the room centres) with
                 * stairwell openings, plus the hull roof deck. */
                for f in 0..=floors {
                    if stairwell_open(f, q, r) {
                        continue;
                    }
                    let l = floor_slab_layer(cfg, f);
                    let mat = if f == floors {
                        StationMat::Hull /* roof deck */
                    } else {
                        StationMat::Carpet
                    };
                    push(q, r, l, mat);
                }
            }
        }
    }
    /* Sign spire on the roof. */
    push(0, 0, roof + 1, StationMat::Sign);
    push(0, 0, roof + 2, StationMat::Sign);

    /* 5. Docking pads: bridge cell + 7-hex pad off each ring corner. */
    for (dq, dr) in HEX_DIRS {
        slab_col(&mut push, dq * (n_out + 1), dr * (n_out + 1), StationMat::Floor);
        let (cq, cr) = (dq * (n_out + 2), dr * (n_out + 2));
        slab_col(&mut push, cq, cr, StationMat::NeonGold);
        for (nq, nr) in HEX_DIRS {
            slab_col(&mut push, cq + nq, cr + nr, StationMat::Floor);
        }
    }

    /* 6. Function fixtures, placed with 6-fold symmetry (one loop over
     * the six sectors). The gaming floor and the trading / research
     * stations live INSIDE the casino tower - the client draws them as
     * real furniture (slot cabinets, felt tables, console desks), not
     * hex prisms. The OUTSIDE (courtyard + ring) is reserved for the
     * animal museum and the courtyard lights. Every fixture sits ON the
     * lobby / courtyard walking surface (layer `slab`, the top of floor
     * 0's slab), clear of the central spiral (rings 1-2 on-axis).
     *   - inside, on-axis ring-3 cell (dir*3): trade terminal / research
     *     console, alternating -> the trading + research stations;
     *   - inside, between-sector ring-2 cell (dir_i+dir_{i+1}): slots /
     *     card table, alternating -> the casino gaming floor;
     *   - outside, courtyard sector ((dir_i+dir_{i+1})*3): an animal-
     *     museum case with a hex lamp hovering two layers above it ->
     *     the zoo in the lit courtyard. */
    for i in 0..6 {
        let (dq, dr) = HEX_DIRS[i];
        let (eq, er) = HEX_DIRS[(i + 1) % 6];
        /* Inside the tower: trading / research consoles on the ring-3
         * cells, gaming tables / slots on the between-sector ring-2
         * cells. Both clear the ring-1 + on-axis ring-2 spiral cells. */
        let kiosk = if i % 2 == 0 { StationMat::TradeTerminal } else { StationMat::ResearchConsole };
        push(dq * 3, dr * 3, slab, kiosk);
        let game = if i % 2 == 0 { StationMat::Slots } else { StationMat::CardTable };
        push(dq + eq, dr + er, slab, game);
        /* Outside in the courtyard: animal-museum case + hovering lamp. */
        let (mq, mr) = ((dq + eq) * 3, (dr + er) * 3);
        push(mq, mr, slab, StationMat::MuseumCase);
        push(mq, mr, slab + 2, StationMat::LightFixture);
    }

    out
}

/// True for the station's function-fixture materials (POIs placed on
/// the deck), as opposed to structural prisms.
pub fn is_fixture(m: StationMat) -> bool {
    matches!(
        m,
        StationMat::TradeTerminal
            | StationMat::ResearchConsole
            | StationMat::MuseumCase
            | StationMat::LightFixture
            | StationMat::Slots
            | StationMat::CardTable
    )
}

/* ------------------------------------------------------------------ */
/* Torch-style propagated block lighting over the station grid.        */

/// Block-light emission (0..15) of a station material - the same scale
/// the world's torch lighting uses (`world_light::Torch::intensity`).
/// Zero = not a light source.
pub fn mat_emission(cfg: &StationConfig, m: StationMat) -> u8 {
    let e = match m {
        /* The lamps carry the rooms: courtyard fixtures + the gold
         * room-light tiles (and their pad-marker siblings). */
        StationMat::LightFixture | StationMat::NeonGold => cfg.lamp_emission,
        StationMat::Neon | StationMat::NeonPink => cfg.neon_emission,
        StationMat::Sign => cfg.sign_emission,
        _ => 0,
    };
    e.min(15) as u8
}

/// True when a station cell BLOCKS light propagation. Mirrors the
/// world's `covers_face` rule: structural solids block; glass panes
/// transmit (a glazed courtyard still reads its lamps at night) and the
/// furniture fixtures are thin pieces light flows around.
fn mat_blocks_light(m: StationMat) -> bool {
    m != StationMat::Glass && !is_fixture(m)
}

/// The station's baked block-light field: cell (q, r, layer) -> light
/// 0..15, the exact algorithm the world's torch lighting uses (seed
/// each source at its emission, BFS -1 per step through non-blocking
/// cells) run over the station's own hex-prism grid. The structure is
/// static, so this bakes once per config; the client shades every face
/// by `max(sun, light/15)` - the casino lights itself the way torches
/// light a mine.
pub fn light_field(cfg: &StationConfig) -> std::collections::HashMap<(i32, i32, i32), u8> {
    use std::collections::{HashMap, VecDeque};
    let shell = shell(cfg);
    let mut solid: std::collections::HashSet<(i32, i32, i32)> =
        std::collections::HashSet::new();
    for p in &shell {
        if mat_blocks_light(p.mat) {
            solid.insert((p.q, p.r, p.layer));
        }
    }
    /* Domain bounds keep the BFS on the premises: the pads reach ring
     * n_out+3, the sign spire tops out at roof+3. One ring / layer of
     * slack lets light wrap the outer rim and the roof edge. */
    let max_ring = cfg.radius_hexes as i32 + 4;
    let max_layer = roof_layer(cfg) + 4;
    let mut light: HashMap<(i32, i32, i32), u8> = HashMap::new();
    let mut q: VecDeque<(i32, i32, i32)> = VecDeque::new();
    /* Seed: every emissive prism radiates at its emission value. The
     * source cell itself is solid; the BFS steps out of it into air
     * (matching the world seed, where the torch anchors the cell). */
    for p in &shell {
        let e = mat_emission(cfg, p.mat);
        if e > 0 && light.get(&(p.q, p.r, p.layer)).copied().unwrap_or(0) < e {
            light.insert((p.q, p.r, p.layer), e);
            q.push_back((p.q, p.r, p.layer));
        }
    }
    while let Some((cq, cr, cl)) = q.pop_front() {
        let cur = light.get(&(cq, cr, cl)).copied().unwrap_or(0);
        if cur <= 1 {
            continue;
        }
        let next = cur - 1;
        let mut nbrs: [(i32, i32, i32); 8] = [(0, 0, 0); 8];
        let mut n = 0;
        for (dq, dr) in HEX_DIRS {
            nbrs[n] = (cq + dq, cr + dr, cl);
            n += 1;
        }
        nbrs[n] = (cq, cr, cl + 1);
        nbrs[n + 1] = (cq, cr, cl - 1);
        for &(nq, nr, nl) in nbrs.iter().take(n + 2) {
            if hex_dist(nq, nr) > max_ring || nl < -2 || nl > max_layer {
                continue;
            }
            if solid.contains(&(nq, nr, nl)) {
                continue;
            }
            if light.get(&(nq, nr, nl)).copied().unwrap_or(0) >= next {
                continue;
            }
            light.insert((nq, nr, nl), next);
            q.push_back((nq, nr, nl));
        }
    }
    light
}

/// Solid vertical spans per occupied column, in station-local metres:
/// `(bottom, top)` per prism, sorted by bottom (the stairway treads are
/// ordinary shell prisms, so they're covered). The physics samples
/// these for multi-level floor support (landing on the storey under
/// your feet, not the roof) and ceiling collision.
pub fn column_spans(cfg: &StationConfig) -> std::collections::HashMap<(i32, i32), Vec<(f32, f32)>> {
    let lh = layer_h(cfg);
    let mut map: std::collections::HashMap<(i32, i32), Vec<(f32, f32)>> =
        std::collections::HashMap::new();
    for p in shell(cfg) {
        /* Fixtures (card tables, slot cabinets, trade/research consoles,
         * museum cases, hovering lamps) are DECORATIVE object-entities,
         * not structure: the client draws them as furniture and the
         * player walks right up to them. Exclude them from the collision
         * spans - same reasoning as mat_blocks_light. Otherwise a table
         * reads as a solid voxel column the player bumps into, and it
         * punches a hole in the deck / stair collision above its cell
         * (the "casino objects treated as voxels / stairs have a gap
         * where a table is" bug). */
        if is_fixture(p.mat) {
            continue;
        }
        map.entry((p.q, p.r)).or_default().push((p.y, p.y + lh));
    }
    /* Merge touching/overlapping spans so a wall column reads as ONE
     * solid interval: support/embedded tests then treat mid-wall prism
     * seams as interior, which is what makes walls impassable and
     * doorway gaps walkable. */
    for spans in map.values_mut() {
        spans.sort_by(|a, b| a.0.partial_cmp(&b.0).unwrap());
        let mut merged: Vec<(f32, f32)> = Vec::with_capacity(spans.len());
        for &(bot, top) in spans.iter() {
            match merged.last_mut() {
                Some(last) if bot <= last.1 + 0.01 => last.1 = last.1.max(top),
                _ => merged.push((bot, top)),
            }
        }
        *spans = merged;
    }
    map
}

/* ------------------------------------------------------------------ */
/* On-rails circular orbit - pure functions of world time.             */

/// Orbit radius from the planet centre.
pub fn orbit_radius_m() -> f64 {
    planet::get(BodyId::Tenebris).radius_m + config().altitude_m as f64
}

/// Circular-orbit speed at the configured altitude, derived from the
/// same inverse-square field the space integrator applies
/// (`planet::orbital_gravity_at`): `v = sqrt(g_surf * R^2 / r)`. A
/// rocket coasting a circular orbit here is velocity-matched by
/// construction - that is the rendezvous mechanic.
pub fn orbit_speed_mps() -> f64 {
    let b = planet::get(BodyId::Tenebris);
    let g = (planet::SURFACE_GRAVITY_MPS2_PER_G * b.gravity_g) as f64;
    (g * b.radius_m * b.radius_m / orbit_radius_m()).sqrt()
}

/// Orbital period `T = 2*pi*r / v` (Kepler for our anchored field).
pub fn orbit_period_s() -> f64 {
    std::f64::consts::TAU * orbit_radius_m() / orbit_speed_mps()
}

/// Station anchor position at world-time `t` (seconds): a circular track
/// in Tenebris's equatorial (XZ) plane, starting `orbit_phase0_deg` from
/// the +x axis (off the prime meridian so it never spawns parked over
/// the launch complex).
pub fn orbit_pos(t: f64) -> DVec3 {
    let b = planet::get(BodyId::Tenebris);
    let r = orbit_radius_m();
    let ph = (orbit_speed_mps() / r) * t + (config().orbit_phase0_deg as f64).to_radians();
    dvec3_make(b.pos_x + r * ph.cos(), b.pos_y, b.pos_z + r * ph.sin())
}

/// Station velocity at world-time `t`: the prograde tangent, magnitude
/// [`orbit_speed_mps`]. This is what the rocket has to match to dock.
pub fn orbit_vel(t: f64) -> DVec3 {
    let r = orbit_radius_m();
    let v = orbit_speed_mps();
    let ph = (v / r) * t + (config().orbit_phase0_deg as f64).to_radians();
    dvec3_make(-v * ph.sin(), 0.0, v * ph.cos())
}

/* ------------------------------------------------------------------ */
/* Station frame + artificial-gravity field (physics support).         */

/// A world-position sample expressed in the station's orbit frame, plus
/// the floor support / ceiling / artificial-gravity field tests under
/// it. The player integrator uses this to land on and walk the station
/// - including INSIDE the hotel: `support_m` is the highest solid top
/// at or under the feet (plus the step-up allowance, so stair treads
/// climb), `ceiling_m` is the next solid underside above the support,
/// and while `in_field` the integrator applies
/// `artificial_gravity_mps2` toward the deck IN THE STATION FRAME (the
/// frame itself is in free fall, so real gravity drops out of relative
/// motion).
#[derive(Clone, Copy, Debug)]
pub struct StationFrame {
    pub anchor: DVec3,
    /// Orbit-frame basis, world-space: local +x.
    pub prograde: DVec3,
    /// Radially away from the planet: local +y ("up" on deck).
    pub up: DVec3,
    /// Orbit normal: local +z.
    pub normal: DVec3,
    /// Station velocity at the sample time.
    pub station_vel: DVec3,
    /// The sampled position in station-local metres.
    pub local: DVec3,
    /// Walkable support (local y, m): highest solid top at or below
    /// feet + `step_up_m` in this column, or `None` in open space.
    pub support_m: Option<f64>,
    /// Underside (local y, m) of the next solid above the support -
    /// the ceiling of the room the feet are in - or `None`.
    pub ceiling_m: Option<f64>,
    /// Top of the column's highest solid, if the column is occupied.
    pub column_top_m: Option<f64>,
    /// True when the feet are INSIDE a solid interval (walked into a
    /// wall) - the integrator cancels the horizontal motion that put
    /// them there.
    pub embedded: bool,
    /// True inside the artificial-gravity capture band: over an
    /// occupied column, from just under its lowest solid to
    /// `gravity_field_m` above its highest.
    pub in_field: bool,
}

/// Column-span cache - rebuilt when the config changes (boot / yaml edit).
type SpanMap = std::collections::HashMap<(i32, i32), Vec<(f32, f32)>>;
static S_SPAN_CACHE: Mutex<Option<(StationConfig, SpanMap)>> = Mutex::new(None);

fn with_spans<R>(cfg: &StationConfig, q: i32, r: i32, f: impl FnOnce(&[(f32, f32)]) -> R) -> R {
    let mut cache = S_SPAN_CACHE.lock().unwrap();
    let rebuild = match cache.as_ref() {
        Some((c, _)) => c != cfg,
        None => true,
    };
    if rebuild {
        *cache = Some((*cfg, column_spans(cfg)));
    }
    f(cache.as_ref().unwrap().1.get(&(q, r)).map(|v| v.as_slice()).unwrap_or(&[]))
}

/// Sample `world_pos` against the station at world-time `t`.
pub fn frame_sample(world_pos: DVec3, t: f64) -> StationFrame {
    use crate::math::{dvec3_cross, dvec3_dot, dvec3_normalize};
    let cfg = config();
    let anchor = orbit_pos(t);
    let station_vel = orbit_vel(t);
    let b = planet::get(BodyId::Tenebris);
    /* The wheel flies FLIPPED 180 deg about prograde: station-local +y
     * (the deck normal, the tower) points AT Tenebris, so standing in
     * the casino the planet hangs overhead like a sky. The normal is
     * recomputed from the cross, so handedness (and every consumer:
     * artificial gravity, SOI basis alignment, the baked-mesh pose)
     * follows automatically. */
    let up = dvec3_normalize(dvec3_make(
        b.pos_x - anchor.x,
        b.pos_y - anchor.y,
        b.pos_z - anchor.z,
    ));
    let prograde = dvec3_normalize(station_vel);
    let normal = dvec3_cross(prograde, up);
    let d = dvec3_make(world_pos.x - anchor.x, world_pos.y - anchor.y, world_pos.z - anchor.z);
    let local = dvec3_make(dvec3_dot(d, prograde), dvec3_dot(d, up), dvec3_dot(d, normal));
    let (q, r) = local_to_axial(local.x as f32, local.z as f32, cfg.hex_size_m);

    let feet = local.y as f32;
    let (support_m, ceiling_m, column_top_m, embedded, in_field) = with_spans(&cfg, q, r, |spans| {
        if spans.is_empty() {
            return (None, None, None, false, false);
        }
        let embedded = spans.iter().any(|&(bot, top)| feet > bot + 0.05 && feet < top - 0.05);
        /* Highest solid top the feet can rest on (step-up included). */
        let support = spans
            .iter()
            .map(|s| s.1)
            .filter(|&top| top <= feet + cfg.step_up_m)
            .fold(f32::NEG_INFINITY, f32::max);
        let support = (support > f32::NEG_INFINITY).then_some(support as f64);
        /* Underside of the next solid strictly above the support (or
         * the feet when hanging in open air below every span). */
        let over = support.map(|s| s as f32).unwrap_or(feet);
        let ceiling = spans
            .iter()
            .map(|s| s.0)
            .filter(|&bot| bot > over + 0.01)
            .fold(f32::INFINITY, f32::min);
        let ceiling = (ceiling < f32::INFINITY).then_some(ceiling as f64);
        let lowest = spans.iter().map(|s| s.0).fold(f32::INFINITY, f32::min);
        let top = spans.iter().map(|s| s.1).fold(f32::NEG_INFINITY, f32::max);
        let in_field = feet >= lowest - 2.0 && feet <= top + cfg.gravity_field_m;
        (support, ceiling, Some(top as f64), embedded, in_field)
    });

    StationFrame {
        anchor,
        prograde,
        up,
        normal,
        station_vel,
        local,
        support_m,
        ceiling_m,
        column_top_m,
        embedded,
        in_field,
    }
}

impl StationFrame {
    /// Station-local metres -> world position through this frame.
    pub fn local_to_world(&self, local: DVec3) -> DVec3 {
        dvec3_make(
            self.anchor.x + self.prograde.x * local.x + self.up.x * local.y + self.normal.x * local.z,
            self.anchor.y + self.prograde.y * local.x + self.up.y * local.y + self.normal.y * local.z,
            self.anchor.z + self.prograde.z * local.x + self.up.z * local.y + self.normal.z * local.z,
        )
    }

    /// Station-local vector -> world vector (no anchor translation).
    pub fn local_vec_to_world(&self, v: DVec3) -> DVec3 {
        dvec3_make(
            self.prograde.x * v.x + self.up.x * v.y + self.normal.x * v.z,
            self.prograde.y * v.x + self.up.y * v.y + self.normal.y * v.z,
            self.prograde.z * v.x + self.up.z * v.y + self.normal.z * v.z,
        )
    }

    /// World vector -> station-local vector.
    pub fn world_vec_to_local(&self, v: DVec3) -> DVec3 {
        use crate::math::dvec3_dot;
        dvec3_make(dvec3_dot(v, self.prograde), dvec3_dot(v, self.up), dvec3_dot(v, self.normal))
    }
}

/* ------------------------------------------------------------------ */
/* Base price table - the [prices] section of economy.yaml.            */

static S_PRICES: Mutex<Vec<(ItemId, f32)>> = Mutex::new(Vec::new());

/// Parse the `[prices]` section (`item-name: base_price` lines) out of
/// economy.yaml. Names resolve via `items::id_by_name`; unknown names are
/// reported in the warning list rather than aborting.
pub fn parse_prices(src: &str) -> (Vec<(ItemId, f32)>, Vec<String>) {
    let mut out = Vec::new();
    let mut warn = Vec::new();
    let mut in_prices = false;
    for raw in src.lines() {
        let line = raw.split('#').next().unwrap_or("").trim();
        if line.is_empty() {
            continue;
        }
        if let Some(name) = line.strip_prefix('[').and_then(|s| s.strip_suffix(']')) {
            in_prices = name.trim() == "prices";
            continue;
        }
        if !in_prices {
            continue;
        }
        let Some((name, val)) = line.split_once(':') else { continue };
        let (name, val) = (name.trim(), val.trim());
        let Ok(p) = val.parse::<f32>() else {
            warn.push(format!("bad price '{}' for '{}'", val, name));
            continue;
        };
        match items::id_by_name(name) {
            Some(id) => out.push((id, p.max(0.0))),
            None => warn.push(format!("unknown item '{}' in [prices]", name)),
        }
    }
    (out, warn)
}

/// Install a parsed price table.
pub fn set_prices(p: Vec<(ItemId, f32)>) {
    *S_PRICES.lock().unwrap() = p;
}

/// Load the `[prices]` section from economy.yaml on disk (native).
pub fn load_prices(path: &str) {
    if let Ok(src) = std::fs::read_to_string(path) {
        let (p, warn) = parse_prices(&src);
        for w in &warn {
            println!("[station] {}: {}", path, w);
        }
        println!("[station] {} prices loaded ({} items)", path, p.len());
        set_prices(p);
    }
}

/// The tradable items (id, base price), for the trade UI.
pub fn priced_items() -> Vec<(ItemId, f32)> {
    S_PRICES.lock().unwrap().clone()
}

fn base_price(item: ItemId) -> Option<f32> {
    S_PRICES
        .lock()
        .unwrap()
        .iter()
        .find(|(id, _)| *id == item)
        .map(|(_, p)| *p)
}

/* ------------------------------------------------------------------ */
/* Market: deterministic drift + decaying supply pressure.             */

/// One item's supply-pressure record: `pressure` as of `updated_at_s`
/// (world-time seconds). The effective pressure at any later time decays
/// exponentially - a pure function, so resume/catch-up costs nothing.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Pressure {
    pub item: ItemId,
    pub pressure: f32,
    pub updated_at_s: f64,
}

/// Persisted station-side state: warehouse contents (slots of item+count),
/// the owned warehouse tier, and the market's supply-pressure records.
#[derive(Clone, Debug, Default, PartialEq)]
pub struct StationState {
    pub warehouse: Vec<(ItemId, u16)>,
    pub tier: u8,
    pub pressure: Vec<Pressure>,
}

/// Deterministic per-item price drift at world-time `t` - a slow multi-sine
/// wobble around 1.0, amplitude/period from economy.yaml. Same (item, t) in
/// any process gives the same price: the "stock market" needs no stored state.
fn drift(item: ItemId, t_s: f64) -> f32 {
    let e = economy::config();
    if e.price_drift_amp <= 0.0 || e.price_drift_period_s <= 0.0 {
        return 1.0;
    }
    let w1 = std::f64::consts::TAU / e.price_drift_period_s as f64;
    let w2 = w1 * 2.7; /* incommensurate second octave so peaks don't repeat */
    let ph = item as f64 * 2.399963; /* golden-angle spread per item */
    let s = 0.65 * (t_s * w1 + ph).sin() + 0.35 * (t_s * w2 + ph * 1.7).sin();
    1.0 + e.price_drift_amp * s as f32
}

impl StationState {
    /// Effective supply pressure for an item at time `t` (decayed).
    pub fn pressure_at(&self, item: ItemId, t_s: f64) -> f32 {
        let e = economy::config();
        let Some(p) = self.pressure.iter().find(|p| p.item == item) else {
            return 0.0;
        };
        if e.pressure_tau_s <= 0.0 {
            return p.pressure.min(e.pressure_max);
        }
        let dt = (t_s - p.updated_at_s).max(0.0);
        (p.pressure * (-(dt / e.pressure_tau_s as f64)).exp() as f32).min(e.pressure_max)
    }

    fn add_pressure(&mut self, item: ItemId, amount: f32, t_s: f64) {
        let cur = self.pressure_at(item, t_s);
        let e = economy::config();
        let next = (cur + amount).min(e.pressure_max);
        if let Some(p) = self.pressure.iter_mut().find(|p| p.item == item) {
            p.pressure = next;
            p.updated_at_s = t_s;
        } else {
            self.pressure.push(Pressure { item, pressure: next, updated_at_s: t_s });
        }
    }

    /// What the station CHARGES for one unit at time `t` (buy side).
    pub fn buy_price(&self, item: ItemId, t_s: f64) -> Option<f32> {
        Some(base_price(item)? * drift(item, t_s))
    }

    /// What the station PAYS for one unit at time `t`: buy price times the
    /// market spread, discounted by this item's current supply pressure
    /// (dumping a lot of one thing pushes its payout down until it decays).
    pub fn sell_price(&self, item: ItemId, t_s: f64) -> Option<f32> {
        let e = economy::config();
        let p = self.buy_price(item, t_s)? * e.sell_spread;
        Some(p * (1.0 - self.pressure_at(item, t_s)).max(0.0))
    }

    /* -------------------------- warehouse -------------------------- */

    /// Slot capacity of the currently-owned tier.
    pub fn warehouse_slots(&self) -> u32 {
        let e = economy::config();
        let t = (self.tier as usize).min(e.warehouse_tier_slots.len() - 1);
        e.warehouse_tier_slots[t]
    }

    /// Credits the NEXT tier costs, or None at max tier.
    pub fn upgrade_cost(&self) -> Option<i64> {
        let e = economy::config();
        let next = self.tier as usize + 1;
        if next < e.warehouse_tier_slots.len() {
            Some(e.warehouse_tier_costs[next])
        } else {
            None
        }
    }

    /// Buy the next warehouse tier out of `wallet`. False if maxed / broke.
    pub fn try_upgrade(&mut self, wallet: &mut Wallet) -> bool {
        let Some(cost) = self.upgrade_cost() else { return false };
        if wallet.try_spend(cost) {
            self.tier += 1;
            true
        } else {
            false
        }
    }

    /// Add items to the warehouse (stacking per the item's stack size, new
    /// slots while capacity lasts). Returns the count that did NOT fit.
    pub fn warehouse_add(&mut self, item: ItemId, mut n: u16) -> u16 {
        let stack = items::stack_size(item).max(1) as u16;
        for (id, c) in self.warehouse.iter_mut() {
            if *id == item && *c < stack {
                let take = n.min(stack - *c);
                *c += take;
                n -= take;
                if n == 0 {
                    return 0;
                }
            }
        }
        while n > 0 && (self.warehouse.len() as u32) < self.warehouse_slots() {
            let take = n.min(stack);
            self.warehouse.push((item, take));
            n -= take;
        }
        n
    }

    /// Take up to `n` of an item out of the warehouse; returns the taken count.
    pub fn warehouse_take(&mut self, item: ItemId, mut n: u16) -> u16 {
        let mut got = 0u16;
        for (id, c) in self.warehouse.iter_mut() {
            if *id == item {
                let take = n.min(*c);
                *c -= take;
                got += take;
                n -= take;
                if n == 0 {
                    break;
                }
            }
        }
        self.warehouse.retain(|(_, c)| *c > 0);
        got
    }

    pub fn warehouse_count(&self, item: ItemId) -> u32 {
        self.warehouse.iter().filter(|(id, _)| *id == item).map(|(_, c)| *c as u32).sum()
    }

    /* --------------------------- trading --------------------------- */

    /// Sell `n` units into the market: credits the wallet at the current sell
    /// price and adds supply pressure. Returns the payout, or None if the
    /// item isn't traded. The CALLER removes the items from wherever they
    /// came from (bag / warehouse) and persists same-frame.
    pub fn sell(&mut self, wallet: &mut Wallet, item: ItemId, n: u16, t_s: f64) -> Option<i64> {
        if n == 0 {
            return None;
        }
        let unit = self.sell_price(item, t_s)?;
        let payout = (unit * n as f32).floor() as i64;
        wallet.earn(payout);
        let e = economy::config();
        self.add_pressure(item, e.pressure_per_unit * n as f32, t_s);
        Some(payout)
    }

    /// Buy `n` units into the WAREHOUSE (not the player's limited inventory).
    /// Refuses (no charge) when the item isn't traded, the wallet can't cover
    /// it, or the warehouse can't hold all `n`.
    pub fn buy(&mut self, wallet: &mut Wallet, item: ItemId, n: u16, t_s: f64) -> bool {
        if n == 0 {
            return false;
        }
        let Some(unit) = self.buy_price(item, t_s) else { return false };
        let cost = (unit * n as f32).ceil() as i64;
        /* Capacity check on a scratch copy so a partial fit never charges. */
        let mut probe = self.clone();
        if probe.warehouse_add(item, n) != 0 {
            return false;
        }
        if !wallet.try_spend(cost) {
            return false;
        }
        self.warehouse = probe.warehouse;
        true
    }

    /// Buy `units` of rocket fuel (economy.yaml price). Returns the cost paid,
    /// or None if the wallet can't cover it. The caller applies the fuel to
    /// the pad/rocket and persists.
    pub fn buy_fuel(&self, wallet: &mut Wallet, units: f32) -> Option<i64> {
        if units <= 0.0 {
            return None;
        }
        let cost = (economy::config().fuel_price_per_unit * units).ceil() as i64;
        if wallet.try_spend(cost) {
            Some(cost)
        } else {
            None
        }
    }

    /* ------------------------- persistence ------------------------- */

    /// Serialize: `tier|item,count;...|item,pressure,updated;...` (ASCII CSV,
    /// same spirit as the bag blob).
    pub fn serialize(&self) -> String {
        let wh = self
            .warehouse
            .iter()
            .map(|(i, c)| format!("{},{}", i, c))
            .collect::<Vec<_>>()
            .join(";");
        let pr = self
            .pressure
            .iter()
            .map(|p| format!("{},{},{}", p.item, p.pressure, p.updated_at_s))
            .collect::<Vec<_>>()
            .join(";");
        format!("{}|{}|{}", self.tier, wh, pr)
    }

    pub fn parse(blob: &str) -> Option<StationState> {
        let mut parts = blob.split('|');
        let tier = parts.next()?.trim().parse::<u8>().ok()?;
        let mut s = StationState { tier, ..Default::default() };
        for ent in parts.next()?.split(';').filter(|e| !e.is_empty()) {
            let (i, c) = ent.split_once(',')?;
            s.warehouse.push((i.trim().parse().ok()?, c.trim().parse().ok()?));
        }
        if let Some(pr) = parts.next() {
            for ent in pr.split(';').filter(|e| !e.is_empty()) {
                let mut f = ent.split(',');
                s.pressure.push(Pressure {
                    item: f.next()?.trim().parse().ok()?,
                    pressure: f.next()?.trim().parse().ok()?,
                    updated_at_s: f.next()?.trim().parse().ok()?,
                });
            }
        }
        Some(s)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Serializes the tests that WRITE the global station config: the
    /// orbit helpers read `config()`, so two set_config-tests running
    /// on parallel test threads race each other's altitudes. A poisoned
    /// lock (a prior holder's assert fired) is fine to reuse - the
    /// guard exists for exclusion, not state.
    static CFG_LOCK: Mutex<()> = Mutex::new(());
    fn cfg_guard() -> std::sync::MutexGuard<'static, ()> {
        CFG_LOCK.lock().unwrap_or_else(|e| e.into_inner())
    }

    fn setup() -> StationState {
        economy::set_config(economy::EconomyConfig::default());
        set_prices(vec![(items::FLINT, 10.0), (items::STICK, 4.0)]);
        StationState::default()
    }

    #[test]
    fn prices_are_deterministic_and_drift() {
        let s = setup();
        let a = s.buy_price(items::FLINT, 100.0).unwrap();
        let b = s.buy_price(items::FLINT, 100.0).unwrap();
        assert_eq!(a, b, "same time -> same price");
        assert!(s.buy_price(items::from_block(crate::blocks::Block::Torch), 0.0).is_none());
        /* Somewhere over a period the price actually moves. */
        let p = economy::config().price_drift_period_s as f64;
        let moved = (0..20).any(|i| {
            (s.buy_price(items::FLINT, i as f64 * p / 20.0).unwrap() - a).abs() > 0.01
        });
        assert!(moved, "drift moves the price across a period");
    }

    #[test]
    fn selling_earns_and_builds_pressure_that_decays() {
        let mut s = setup();
        let mut w = Wallet::default();
        let unit0 = s.sell_price(items::FLINT, 0.0).unwrap();
        let paid = s.sell(&mut w, items::FLINT, 20, 0.0).unwrap();
        assert!(paid > 0 && w.credits() == paid);
        /* Dumping 20 units pushed the payout down... */
        let unit1 = s.sell_price(items::FLINT, 0.0).unwrap();
        assert!(unit1 < unit0);
        /* ...and it recovers as the pressure decays over time. */
        let tau = economy::config().pressure_tau_s as f64;
        let later = s.sell_price(items::FLINT, tau * 5.0).unwrap();
        let drift_only = s.buy_price(items::FLINT, tau * 5.0).unwrap()
            * economy::config().sell_spread;
        assert!((later - drift_only).abs() / drift_only < 0.05, "pressure decayed away");
    }

    #[test]
    fn warehouse_caps_by_tier_and_upgrades() {
        let mut s = setup();
        let slots = s.warehouse_slots();
        assert!(slots > 0);
        /* Fill every slot with full flint stacks; the next add overflows. */
        let stack = items::stack_size(items::FLINT) as u16;
        for _ in 0..slots {
            assert_eq!(s.warehouse_add(items::FLINT, stack), 0);
        }
        assert_eq!(s.warehouse_add(items::FLINT, 1), 1, "full warehouse rejects");
        /* Upgrade: broke wallet refused, funded wallet adds capacity. */
        let mut broke = Wallet::default();
        assert!(!s.try_upgrade(&mut broke));
        let mut rich = Wallet::new(1_000_000);
        assert!(s.try_upgrade(&mut rich));
        assert!(s.warehouse_slots() > slots);
        assert_eq!(s.warehouse_add(items::FLINT, 1), 0);
        /* Take drains and clears slots. */
        let total = s.warehouse_count(items::FLINT);
        assert_eq!(s.warehouse_take(items::FLINT, u16::MAX) as u32, total);
        assert_eq!(s.warehouse_count(items::FLINT), 0);
    }

    #[test]
    fn buy_charges_into_warehouse_and_respects_capacity() {
        let mut s = setup();
        let mut w = Wallet::new(10_000);
        assert!(s.buy(&mut w, items::STICK, 3, 0.0));
        assert_eq!(s.warehouse_count(items::STICK), 3);
        assert!(w.credits() < 10_000);
        /* Can't afford -> refused, nothing stored. */
        let mut broke = Wallet::new(1);
        assert!(!s.buy(&mut broke, items::FLINT, 5, 0.0));
        assert_eq!(broke.credits(), 1);
        assert_eq!(s.warehouse_count(items::FLINT), 0);
    }

    #[test]
    fn fuel_purchase_spends_configured_price() {
        let s = setup();
        let mut w = Wallet::new(100);
        let cost = s.buy_fuel(&mut w, 10.0).unwrap();
        assert_eq!(cost, (economy::config().fuel_price_per_unit * 10.0).ceil() as i64);
        assert_eq!(w.credits(), 100 - cost);
        let mut broke = Wallet::new(0);
        assert!(s.buy_fuel(&mut broke, 10.0).is_none());
    }

    #[test]
    fn hotel_station_shell_sections_and_palette() {
        /* Default wheel: ring 10 (3 wide), 2-layer slab, radius-4 hotel
         * with 5 storeys of (1 slab + 3 air), glazed courtyard, pads. */
        let cfg = StationConfig::DEFAULT;
        assert!((layer_h(&cfg) - 1.25).abs() < 1e-6, "person-scale layers");
        let prisms = shell(&cfg);
        /* No duplicate cells: every (q, r, layer) appears once. */
        let mut seen = std::collections::HashSet::new();
        for p in &prisms {
            assert!(seen.insert((p.q, p.r, p.layer)), "dup at {:?}", (p.q, p.r, p.layer));
        }
        let count = |m: StationMat| prisms.iter().filter(|p| p.mat == m).count();
        /* Courtyard glazing: D(7)-D(4) cells minus the 18 spoke cells,
         * one glass layer each, plus a glazed window band per storey. */
        let courtyard = (hexes_per_deck(7) - hexes_per_deck(4) - 18) as usize;
        assert_eq!(courtyard, 90);
        let glass_windows = count(StationMat::Glass) - courtyard;
        assert!(
            glass_windows >= 5 * 8,
            "every storey carries a glazed window band (got {glass_windows} panes)"
        );
        /* Interior (layer >= 1, non-sign): the full 37-cell lobby slab;
         * 4 upper storey slabs + the roof at 31 cells each (the 6-cell
         * ring-1 stairwell shaft stays open; the roof recovers its
         * centre cell as deck); the stair core column (30 prisms,
         * lobby slab layer 1 counted with the lobby) minus the 4 upper
         * slab-layer cells it already owns... counted directly: 37
         * lobby + core column layers 2..30 (29) + 30 treads + 4x30
         * upper slabs + 31 roof + the 12 lobby fixtures. */
        let interior = prisms
            .iter()
            .filter(|p| hex_dist(p.q, p.r) < cfg.tower_radius as i32)
            .filter(|p| p.layer >= 1 && p.mat != StationMat::Sign)
            .count();
        assert_eq!(interior, 37 + 29 + 30 + 4 * 30 + 31 + 12);
        /* Light palette: cyan parapet (minus 6 bridge gates) + cyan
         * storey bands; pink alternate bands; warm gold = the stair
         * core's light bands (every 3rd layer from the first tread) + 6
         * pad markers; signs = crown ring + spire + the 3-cell entrance
         * arch marquee (the wider door turns one more facade cell's crown
         * layer into a marquee sign, so that cell loses its pink band). */
        assert!(count(StationMat::Neon) >= 54 + 48, "cyan parapet + bands");
        assert!(count(StationMat::NeonPink) >= 2 * 24 - 3, "pink storey bands");
        assert_eq!(count(StationMat::NeonGold), 10 + 6, "core light bands + pad markers");
        assert_eq!(count(StationMat::Sign), 24 + 2 + 3, "crown + spire + entrance arch");
    }

    #[test]
    fn fixtures_are_decorative_not_collision() {
        /* Casino furniture - card tables, slot cabinets, trade / research
         * consoles, museum cases, hovering lamps - are object-entities the
         * client draws as furniture, NOT solid voxel columns. So their cell
         * must not appear as a collision span (else the player bumps an
         * invisible wall walking up to a console, and the table punches a
         * hole in the deck / stair collision above it). The floor UNDER the
         * fixture still supports the player (checked by the fall-through
         * test) - only the fixture's own layer is walk-through. */
        let cfg = StationConfig::DEFAULT;
        let spans = column_spans(&cfg);
        let lh = layer_h(&cfg);
        let mut checked = 0;
        for p in shell(&cfg) {
            if !is_fixture(p.mat) {
                continue;
            }
            checked += 1;
            let mid = p.y + lh * 0.5; /* centre of the fixture's own layer */
            if let Some(col) = spans.get(&(p.q, p.r)) {
                for &(bot, top) in col {
                    assert!(
                        mid < bot || mid > top,
                        "fixture {:?} at ({},{}) sits inside collision span [{},{}] - \
                         furniture must be walk-through, not a solid voxel",
                        p.mat,
                        p.q,
                        p.r,
                        bot,
                        top
                    );
                }
            }
        }
        assert!(checked > 0, "there should be casino fixtures to check");
    }

    #[test]
    fn station_has_no_fall_through_holes() {
        /* Every column inside the wheel footprint - AND every pad /
         * bridge column outside it - carries solid support at (or above)
         * deck level, so nowhere on the premises can a player fall
         * through to space. Stairwell shafts inside the hotel are
         * bounded below by the full lobby slab, so the worst interior
         * fall lands on the lobby carpet. */
        let cfg = StationConfig::DEFAULT;
        let spans = column_spans(&cfg);
        let deck = cfg.slab_layers as f32 * layer_h(&cfg);
        let n_out = cfg.radius_hexes as i32;
        for q in -n_out..=n_out {
            for r in (-n_out).max(-q - n_out)..=n_out.min(-q + n_out) {
                let col = spans
                    .get(&(q, r))
                    .unwrap_or_else(|| panic!("hole: column {:?} is empty", (q, r)));
                let supported = col.iter().any(|&(bot, top)| bot <= deck + 1e-4 && top >= deck - 1e-4);
                assert!(supported, "hole: column {:?} lacks deck-level support", (q, r));
            }
        }
        /* Pads + bridges. */
        for (dq, dr) in HEX_DIRS {
            let mut pad_cells = vec![
                (dq * (n_out + 1), dr * (n_out + 1)),
                (dq * (n_out + 2), dr * (n_out + 2)),
            ];
            for (nq, nr) in HEX_DIRS {
                pad_cells.push((dq * (n_out + 2) + nq, dr * (n_out + 2) + nr));
            }
            for (q, r) in pad_cells {
                let col = spans.get(&(q, r)).expect("pad column occupied");
                assert!(col.iter().any(|&(_, top)| (top - deck).abs() < 1e-4));
            }
        }
    }

    #[test]
    fn function_fixtures_are_placed_six_fold_symmetric() {
        let cfg = StationConfig::DEFAULT;
        let prisms = shell(&cfg);
        let count = |m: StationMat| prisms.iter().filter(|p| p.mat == m).count();
        /* Six sectors: 3 trade + 3 research kiosks, 3 slots + 3 tables,
         * 6 museum cases, 6 courtyard lamps. */
        assert_eq!(count(StationMat::TradeTerminal), 3);
        assert_eq!(count(StationMat::ResearchConsole), 3);
        assert_eq!(count(StationMat::Slots), 3);
        assert_eq!(count(StationMat::CardTable), 3);
        assert_eq!(count(StationMat::MuseumCase), 6);
        assert_eq!(count(StationMat::LightFixture), 6);
        /* Games + trading/research stations live INSIDE the casino
         * tower; the outside (courtyard + ring) carries ONLY the animal
         * museum and the courtyard lights. */
        let t_rad = cfg.tower_radius as i32;
        for p in &prisms {
            match p.mat {
                StationMat::TradeTerminal
                | StationMat::ResearchConsole
                | StationMat::Slots
                | StationMat::CardTable => assert!(
                    hex_dist(p.q, p.r) < t_rad,
                    "{:?} at {:?} must be inside the tower",
                    p.mat,
                    (p.q, p.r)
                ),
                StationMat::MuseumCase | StationMat::LightFixture => assert!(
                    hex_dist(p.q, p.r) > t_rad,
                    "{:?} at {:?} must be outside the tower",
                    p.mat,
                    (p.q, p.r)
                ),
                _ => {}
            }
        }
        /* Every fixture sits on the deck slab (or the lamp two above),
         * and each material's cells are a full 6-fold orbit: rotating a
         * fixture cell by 60 degrees lands on another cell of the same
         * material. Rotation in axial coords: (q,r) -> (-r, q+r). */
        let rot = |q: i32, r: i32| (-r, q + r);
        for m in [
            StationMat::TradeTerminal, StationMat::ResearchConsole, StationMat::Slots,
            StationMat::CardTable, StationMat::MuseumCase, StationMat::LightFixture,
        ] {
            let set: std::collections::HashSet<(i32, i32)> =
                prisms.iter().filter(|p| p.mat == m).map(|p| (p.q, p.r)).collect();
            for &(q, r) in &set {
                assert!(is_fixture(m));
                /* 3 (trade/slots/etc) or 6 fixtures form orbits under
                 * repeated 60-deg rotation; two rotations (120 deg) map
                 * a 3-fold set onto itself, one rotation a 6-fold set. */
                let (rq, rr) = rot(q, r);
                let (rq2, rr2) = rot(rq, rr);
                assert!(
                    set.contains(&(rq, rr)) || set.contains(&(rq2, rr2)),
                    "{:?} at {:?} has no rotational partner",
                    m, (q, r)
                );
            }
        }
    }

    #[test]
    fn station_light_field_glows_from_lamps_and_decays() {
        let cfg = StationConfig::DEFAULT;
        let slab = cfg.slab_layers as i32;
        let field = light_field(&cfg);
        let at = |q: i32, r: i32, l: i32| field.get(&(q, r, l)).copied().unwrap_or(0);
        /* A courtyard lamp seeds its cell at lamp_emission and the air
         * above it one step dimmer - identical semantics to a world
         * torch (seed at intensity, -1 per BFS step). */
        let (dq, dr) = HEX_DIRS[0];
        let (eq, er) = HEX_DIRS[1];
        let (mq, mr) = ((dq + eq) * 3, (dr + er) * 3);
        let lamp = cfg.lamp_emission as u8;
        assert_eq!(at(mq, mr, slab + 2), lamp, "lamp cell seeds at its emission");
        assert_eq!(at(mq, mr, slab + 3), lamp - 1, "one step up = one dimmer");
        assert_eq!(at(mq + dq, mr + dr, slab + 2), lamp - 1, "one lateral step");
        /* The hotel interior is lit by the stair core's gold bands: the
         * band cell seeds at the lamp emission, and the open ring-1 air
         * beside it reads one step dimmer. */
        assert_eq!(at(0, 0, slab), lamp, "core gold band seeds at emission");
        assert_eq!(at(1, 0, slab), lamp - 1, "lobby air beside the core band");
        /* Light decays with distance - three steps out is dimmer than
         * one - and far-off empty space is dark. */
        assert!(at(mq, mr, slab + 5) < at(mq, mr, slab + 3));
        assert_eq!(at(cfg.radius_hexes as i32 + 4, 0, 40), 0, "space stays dark");
        /* The field inherits the structure's 6-fold symmetry. */
        let rot = |q: i32, r: i32| (-r, q + r);
        let (rq, rr) = rot(mq, mr);
        assert_eq!(at(mq, mr, slab + 3), at(rq, rr, slab + 3));
    }

    #[test]
    fn hotel_floors_are_walkable_and_stairs_climb() {
        let cfg = StationConfig::DEFAULT;
        let lh = layer_h(&cfg);
        let spans = column_spans(&cfg);
        /* A plain interior room column - clear of the central spiral AND
         * of the lobby fixtures - with six storey slabs (incl. roof),
         * each with >= 3 air layers of clearance above its surface. */
        let col = spans.get(&(2, 1)).expect("interior column occupied");
        assert_eq!(col.len(), 6, "5 storeys + roof");
        for w in col.windows(2) {
            let clearance = w[1].0 - w[0].1;
            assert!(
                clearance >= 3.0 * lh - 1e-4,
                "storey clearance {clearance} < 3 air layers"
            );
        }
        /* Ground floor is level with the courtyard deck. */
        assert!((col[0].1 - cfg.slab_layers as f32 * lh).abs() < 1e-4);
        /* Stairway: the user's template pattern - ONE full-layer hull
         * tread per layer winding the ring-1 cells in STAIR_RING_ORDER
         * around a solid lit core column, one lap per storey, topping
         * out level with the roof deck. */
        let prisms = shell(&cfg);
        let slab = cfg.slab_layers as i32;
        let roof = 1 + 5 * floor_pitch(&cfg); /* roof slab layer */
        let at = |q: i32, r: i32, l: i32| prisms.iter().find(|p| (p.q, p.r, p.layer) == (q, r, l));
        for l in slab..=roof {
            let (sq, sr) = STAIR_RING_ORDER[((l - slab) as usize) % 6];
            let tread = at(sq, sr, l).expect("tread prism");
            assert_eq!(tread.mat, StationMat::Hull, "treads are hull plating");
            /* Consecutive treads sit on hex-adjacent cells, one layer
             * apart - a connected winding staircase. */
            let (nq, nr) = STAIR_RING_ORDER[((l - slab + 1) as usize) % 6];
            assert_eq!(hex_dist(nq - sq, nr - sr), 1, "next tread is adjacent");
        }
        /* Each step's rise is one layer, inside the step-up allowance. */
        assert!(lh <= cfg.step_up_m, "tread rise {lh} must be walkable");
        /* The top tread is level with the roof deck. */
        let (tq, tr) = STAIR_RING_ORDER[((roof - slab) as usize) % 6];
        let top = at(tq, tr, roof).expect("top tread");
        assert!((top.y + lh - (roof + 1) as f32 * lh).abs() < 1e-4);
        /* The template's clearance property: the same ring cell is
         * revisited every 6 layers, so every tread keeps at least
         * floor_air_layers - 1 (= 5 - 1 >= 3) clear layers overhead in
         * its own column. */
        for l in slab..=roof {
            let (sq, sr) = STAIR_RING_ORDER[((l - slab) as usize) % 6];
            let tread_top = (l + 1) as f32 * lh;
            let col = spans.get(&(sq, sr)).expect("tread column");
            let over = col
                .iter()
                .map(|sp| sp.0)
                .filter(|&bot| bot > tread_top + 1e-4)
                .fold(f32::INFINITY, f32::min);
            assert!(
                over - tread_top >= 3.0 * lh - 1e-3,
                "tread at {:?} layer {} has only {} m of air above",
                (sq, sr),
                l,
                over - tread_top
            );
        }
        /* The stair core: a solid lit column from the lobby slab to the
         * roof, gold light band every STAIR_CORE_GOLD_PERIOD layers. */
        for l in (slab - 1)..roof {
            let core = at(0, 0, l).expect("core column prism");
            let want_gold = l >= slab && (l - slab) % STAIR_CORE_GOLD_PERIOD == 0;
            assert_eq!(
                core.mat,
                if want_gold { StationMat::NeonGold } else { StationMat::Floor },
                "core column mat at layer {l}"
            );
        }
        /* The hotel wall is one merged solid: no mid-wall ledge to stand
         * on (walls are impassable), while ALL THREE entrance columns (the
         * triple-wide arch - the +x corner (4,0) plus one neighbour down
         * each facade edge, (4,-1) and (3,1)) keep a walkable gap at deck
         * level - at least 3 m tall per the entrance-arch requirement. */
        let wall = spans.get(&(0, 4)).expect("facade column");
        assert_eq!(wall.len(), 1, "facade merges into one solid interval");
        for door_cell in [(4, -1), (4, 0), (3, 1)] {
            let door = spans.get(&door_cell).expect("entrance column");
            assert_eq!(door.len(), 2, "entrance splits the column at {door_cell:?}");
            let gap = door[1].0 - door[0].1;
            assert!(gap >= 3.0, "entrance arch {gap} m must clear 3 m");
            assert!(gap >= 3.0 * lh - 1e-4, "entrance gap {gap} walkable");
        }
        /* Symmetric about the +x spoke: the door cells are mirror pairs in
         * z (the two flanks at z = -/+1.5 m, the corner at z = 0), and the
         * next cell out along EACH edge - (4,-2) and (2,2) - is solid wall,
         * so the opening is centred, not lopsided. */
        let z_of = |q: i32, r: i32| axial_to_local(q, r, cfg.hex_size_m).1;
        assert!(
            (z_of(4, -1) + z_of(3, 1)).abs() < 1e-4 && z_of(4, 0).abs() < 1e-4,
            "door cells straddle the +x spoke symmetrically"
        );
        for solid_cell in [(4, -2), (2, 2)] {
            let flank = spans.get(&solid_cell).expect("facade flank column");
            assert_eq!(flank.len(), 1, "door flank {solid_cell:?} stays solid wall");
        }
        /* Parapet gates: the six bridge corners are open at deck level
         * so a player can walk in from every landing pad. */
        let n_out = cfg.radius_hexes as i32;
        for (dq, dr) in HEX_DIRS {
            let corner = spans.get(&(dq * n_out, dr * n_out)).expect("ring corner");
            let deck = cfg.slab_layers as f32 * lh;
            assert!(
                corner.iter().all(|&(bot, top)| top <= deck + 1e-4 || bot >= deck + lh),
                "parapet gate at {:?} stays open",
                (dq * n_out, dr * n_out)
            );
        }
        /* Axial pick still inverts across the structure. */
        for (q, r) in [(0, 0), (10, 0), (-7, 3), (4, -9), (12, 0), (0, -12)] {
            let (x, z) = axial_to_local(q, r, cfg.hex_size_m);
            assert_eq!(local_to_axial(x, z, cfg.hex_size_m), (q, r));
        }
    }

    #[test]
    fn frame_sample_supports_interior_floors() {
        let _cfg = cfg_guard();
        set_config(StationConfig::DEFAULT);
        let cfg = config();
        let lh = layer_h(&cfg);
        let t = 12.34;
        let anchor = orbit_pos(t);
        let f0 = frame_sample(anchor, t);
        /* Inside storey 2 of the hotel at cell (1,1): feet just above
         * the storey slab -> support is THAT slab, ceiling the next one,
         * still inside the artificial-gravity field. */
        let (x, z) = axial_to_local(1, 1, cfg.hex_size_m);
        let slab_top = (floor_slab_layer(&cfg, 2) + 1) as f32 * lh; /* 12.5 */
        let inside = f0.local_to_world(dvec3_make(x as f64, slab_top as f64 + 0.4, z as f64));
        let fi = frame_sample(inside, t);
        assert!(fi.in_field);
        assert_eq!(fi.support_m.map(|v| v as f32), Some(slab_top));
        let next_bottom = floor_slab_layer(&cfg, 3) as f32 * lh;
        assert_eq!(fi.ceiling_m.map(|v| v as f32), Some(next_bottom));
        assert!(!fi.embedded);
        /* Embedded inside the facade wall: flagged for pushback. */
        let (wx, wz) = axial_to_local(4, -1, cfg.hex_size_m);
        let in_wall = f0.local_to_world(dvec3_make(wx as f64, 10.0, wz as f64));
        assert!(frame_sample(in_wall, t).embedded);
        /* Far above the roof: out of the field; between spokes with the
         * glass floor: the glass top IS the support. */
        let high = f0.local_to_world(dvec3_make(0.0, 130.0, 0.0));
        assert!(!frame_sample(high, t).in_field);
        let mut glass_checked = false;
        for (gq, gr) in [(5, 1), (6, 1), (5, 2), (-5, 2), (1, 5)] {
            if hex_dist(gq, gr) > cfg.tower_radius as i32 && hex_dist(gq, gr) < 8 {
                let (gx, gz) = axial_to_local(gq, gr, cfg.hex_size_m);
                let over = f0.local_to_world(dvec3_make(gx as f64, 4.0, gz as f64));
                let fg = frame_sample(over, t);
                if let Some(s) = fg.support_m {
                    let glass_top = cfg.slab_layers as f32 * lh;
                    assert!(
                        (s as f32 - glass_top).abs() < 1e-4,
                        "courtyard glass supports at deck level"
                    );
                    glass_checked = true;
                }
            }
        }
        assert!(glass_checked, "at least one courtyard glass column sampled");
        /* Round trip: local -> world -> local. */
        let p = f0.local_to_world(dvec3_make(7.0, 9.0, -3.0));
        let fr = frame_sample(p, t);
        assert!((fr.local.x - 7.0).abs() < 1e-6);
        assert!((fr.local.y - 9.0).abs() < 1e-6);
        assert!((fr.local.z - (-3.0)).abs() < 1e-6);
    }

    #[test]
    fn orbit_speed_and_period_derive_from_gravity() {
        let _cfg = cfg_guard();
        set_config(StationConfig::DEFAULT);
        let b = crate::planet::get(BodyId::Tenebris);
        let r = orbit_radius_m();
        /* Re-pinned when the station moved from a 120 m altitude (420 m
         * orbit, 73.19 m/s, 36 s a lap) out to a 10 km orbit. The old one
         * was unreachable: it crossed the sky at 10 deg/s and no rocket
         * could get inside the 8 m/s dock gate. Speed is derived, so
         * raising the orbit is what slows it - these numbers are that one
         * altitude change, not a retune. */
        assert_eq!(r, b.radius_m + 9700.0);
        assert_eq!(r, 10_000.0, "the orbit is the round 10 km the design asks for");
        /* v = sqrt(g R^2 / r): centripetal balance in the inverse-square
         * field orbital_gravity_at applies. Pinned via station-math.py. */
        let g = (crate::planet::SURFACE_GRAVITY_MPS2_PER_G * b.gravity_g) as f64;
        let v = orbit_speed_mps();
        assert!((v - (g * b.radius_m * b.radius_m / r).sqrt()).abs() < 1e-9);
        assert!((v - 15.00).abs() < 0.01, "10 km circular speed ~15.00 m/s, got {v}");
        assert!((orbit_period_s() - 4188.79).abs() < 0.05);
        /* The rails and the field agree: centripetal accel at the track
         * equals the sampled gravity magnitude there. */
        let a_field = g * (b.radius_m / r) * (b.radius_m / r);
        assert!((v * v / r - a_field).abs() < 1e-9);
    }

    /// The station has to be catchable: the dock only accepts a relative
    /// speed under `dock_max_rel_mps`, so if the track itself outruns that
    /// by a wide margin the casino is decorative. Guards the reachability
    /// of the whole thing against a future altitude tweak.
    #[test]
    fn the_station_orbits_slowly_enough_to_rendezvous_with() {
        let _cfg = cfg_guard();
        set_config(StationConfig::DEFAULT);
        let v = orbit_speed_mps();
        assert!(v < 20.0, "orbit speed {v} m/s is too fast to fly alongside");
        /* ~70 minutes a lap: it drifts across the sky rather than strobing
         * past. At the old 120 m altitude a lap took 36 SECONDS. */
        assert!(orbit_period_s() > 3600.0, "a lap should take over an hour");
    }

    /// Kepler's third law: `T^2 / r^3` is the same constant at every
    /// altitude, and equals `4*pi^2 / GM`.
    ///
    /// This is WHY one altitude knob is enough. `orbit_speed_mps` derives
    /// `v = sqrt(g_surf * R^2 / r)`, and `g_surf * R^2` IS `GM` - so the
    /// field is honestly inverse-square and the period follows
    /// `T ∝ r^(3/2)` for free. Going from a 420 m to a 10 km orbit is 23.8x
    /// the radius and therefore 23.8^1.5 = 116x the period: the station
    /// slows down because gravity out there is genuinely weaker, not
    /// because anything was hand-tuned.
    #[test]
    fn orbit_obeys_keplers_third_law() {
        let _cfg = cfg_guard();
        let b = crate::planet::get(BodyId::Tenebris);
        let gm = (crate::planet::SURFACE_GRAVITY_MPS2_PER_G * b.gravity_g) as f64
            * b.radius_m
            * b.radius_m;
        let expect = std::f64::consts::TAU.powi(2) / gm; /* 4*pi^2 / GM */

        for alt in [50.0, 120.0, 1_000.0, 9_700.0, 50_000.0] {
            let mut c = StationConfig::DEFAULT;
            c.altitude_m = alt;
            set_config(c);
            let (r, t) = (orbit_radius_m(), orbit_period_s());
            let k = t * t / (r * r * r);
            let err = (k - expect).abs() / expect;
            assert!(err < 1e-9, "alt {alt}: T^2/r^3 = {k}, expected 4pi^2/GM = {expect}");
        }
        set_config(StationConfig::DEFAULT);
    }

    /// Raising the orbit must SLOW it - the property that lets one knob
    /// serve both "further out" and "easier to catch".
    #[test]
    fn a_higher_orbit_is_a_slower_orbit() {
        let _cfg = cfg_guard();
        let mut low = StationConfig::DEFAULT;
        low.altitude_m = 120.0;
        set_config(low);
        let (v_low, w_low) = (orbit_speed_mps(), orbit_speed_mps() / orbit_radius_m());

        set_config(StationConfig::DEFAULT); /* 9700 m */
        let (v_hi, w_hi) = (orbit_speed_mps(), orbit_speed_mps() / orbit_radius_m());

        assert!(v_hi < v_low, "10 km orbit ({v_hi}) must be slower than 120 m ({v_low})");
        assert!(w_hi < w_low, "and sweep less angle per second");
    }

    #[test]
    fn orbit_track_is_circular_and_velocity_is_tangent() {
        let _cfg = cfg_guard();
        set_config(StationConfig::DEFAULT);
        let b = crate::planet::get(BodyId::Tenebris);
        let r = orbit_radius_m();
        for i in 0..8 {
            let t = i as f64 * orbit_period_s() / 8.0;
            let p = orbit_pos(t);
            let (dx, dy, dz) = (p.x - b.pos_x, p.y - b.pos_y, p.z - b.pos_z);
            assert!(((dx * dx + dy * dy + dz * dz).sqrt() - r).abs() < 1e-6);
            let v = orbit_vel(t);
            /* Tangent: radial . velocity == 0; speed constant. */
            assert!((dx * v.x + dy * v.y + dz * v.z).abs() < 1e-6);
            let speed = (v.x * v.x + v.y * v.y + v.z * v.z).sqrt();
            assert!((speed - orbit_speed_mps()).abs() < 1e-9);
        }
        /* Full period returns to the phase-0 anchor, which sits
         * orbit_phase0_deg off the +x axis (clear of the launch site). */
        let p0 = orbit_pos(0.0);
        let p1 = orbit_pos(orbit_period_s());
        assert!((p0.x - p1.x).abs() < 1e-6 && (p0.z - p1.z).abs() < 1e-6);
        let ph0 = (config().orbit_phase0_deg as f64).to_radians();
        assert!((p0.x - (b.pos_x + r * ph0.cos())).abs() < 1e-6);
        assert!((p0.z - (b.pos_z + r * ph0.sin())).abs() < 1e-6);
    }

    #[test]
    fn station_yaml_parses_with_partial_overrides() {
        let c = parse_config("station:\n  radius_hexes: 12\n  altitude_m: 200\n", "test");
        assert_eq!(c.radius_hexes, 12);
        assert_eq!(c.altitude_m, 200.0);
        /* Untouched fields keep the compiled-in defaults. */
        assert_eq!(c.layers, StationConfig::DEFAULT.layers);
        assert_eq!(c.dock_max_rel_mps, StationConfig::DEFAULT.dock_max_rel_mps);
    }

    #[test]
    fn state_round_trips_through_serialize() {
        let mut s = setup();
        let mut w = Wallet::new(10_000);
        assert!(s.buy(&mut w, items::STICK, 5, 42.0));
        s.sell(&mut w, items::FLINT, 3, 50.0);
        s.tier = 1;
        let blob = s.serialize();
        let back = StationState::parse(&blob).expect("parses");
        assert_eq!(back, s);
        assert!(StationState::parse("garbage").is_none());
    }
}
