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

use crate::blocks::Block;
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
    /// Deck radius in hex rings (a deck holds `3n(n+1)+1` hexes).
    pub radius_hexes: u32,
    /// Prism layers stacked into the drum wall.
    pub layers: u32,
    /// Total drum height in metres (prism height = height_m / layers).
    pub height_m: f32,
    /// Hex circumradius (centre -> corner) of one prism, metres.
    pub hex_size_m: f32,
    /// Orbit altitude above the Tenebris surface, metres.
    pub altitude_m: f32,
    /// How close the player must fly to dock.
    pub dock_radius_m: f32,
    /// Max relative speed (m/s) the dock accepts - the rendezvous gate.
    pub dock_max_rel_mps: f32,
}

impl StationConfig {
    pub const DEFAULT: StationConfig = StationConfig {
        radius_hexes: 10,
        layers: 6,
        height_m: 15.0,
        hex_size_m: 2.0,
        altitude_m: 120.0,
        dock_radius_m: 40.0,
        dock_max_rel_mps: 8.0,
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
/* Drum shell geometry - a hollow cylinder of hex prisms.              */

/// Structural role of a shell prism - the renderer uses it to cull the
/// faces that neighbouring prisms hide (interior disk cells never show
/// their sides; wall cells never show caps except on the rim layers).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum PrismRole {
    Floor,
    Ceiling,
    Wall,
}

/// One hex prism of the station structure, in STATION-LOCAL metres:
/// x/z span the deck plane (pointy-top axial hex grid), y is the drum
/// axis (0 at the keel). The client orients local +y radially away from
/// the planet at the orbital anchor.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Prism {
    pub x: f32,
    pub y: f32,
    pub z: f32,
    pub block: Block,
    pub role: PrismRole,
}

/// Centered hexagonal number: hexes in a full deck of radius `n` rings.
pub fn hexes_per_deck(n: u32) -> u32 {
    3 * n * (n + 1) + 1
}

/// Prism count of the hollow drum: two full disks + the wall ring on
/// every layer between them. Pinned against `shell().len()` in tests
/// (and against tools/station-math.py).
pub fn shell_prism_count(n: u32, layers: u32) -> u32 {
    2 * hexes_per_deck(n) + 6 * n * layers.saturating_sub(2)
}

/// Which block a wall-ring prism gets: a NeonTrim band runs the whole
/// equator layer, CasinoSign tiles mark the six ring corners one layer
/// up (visible beacons on approach), hull everywhere else.
fn wall_block(q: i32, r: i32, layer: u32, cfg: &StationConfig) -> Block {
    let band = cfg.layers / 2;
    if layer == band {
        return Block::NeonTrim;
    }
    let n = cfg.radius_hexes as i32;
    let corner = (q == n && r == 0)
        || (q == 0 && r == n)
        || (q == -n && r == n)
        || (q == -n && r == 0)
        || (q == 0 && r == -n)
        || (q == n && r == -n);
    if corner && layer == band + 1 {
        Block::CasinoSign
    } else {
        Block::StationHull
    }
}

/// Floor-disk block: the casino occupies the inner half of the deck
/// (carpet), the outer annulus is bare deck plating.
fn floor_block(dist: u32, cfg: &StationConfig) -> Block {
    if dist * 2 <= cfg.radius_hexes {
        Block::CasinoCarpet
    } else {
        Block::StationFloor
    }
}

/// Generate the hollow drum: floor disk (layer 0), ceiling disk (top
/// layer), and the outer wall ring on every layer. Pure function of the
/// config - the client meshes this once and re-poses it per frame.
pub fn shell(cfg: &StationConfig) -> Vec<Prism> {
    let n = cfg.radius_hexes as i32;
    let a = cfg.hex_size_m;
    let layer_h = cfg.height_m / cfg.layers.max(1) as f32;
    let sqrt3 = 3.0f32.sqrt();
    let mut out = Vec::with_capacity(shell_prism_count(cfg.radius_hexes, cfg.layers) as usize);
    for q in -n..=n {
        let r_lo = (-n).max(-q - n);
        let r_hi = n.min(-q + n);
        for r in r_lo..=r_hi {
            let dist = ((q.abs() + r.abs() + (q + r).abs()) / 2) as u32;
            let x = a * sqrt3 * (q as f32 + r as f32 * 0.5);
            let z = a * 1.5 * r as f32;
            if dist == cfg.radius_hexes {
                /* Wall column: every layer. */
                for layer in 0..cfg.layers {
                    out.push(Prism {
                        x,
                        y: layer as f32 * layer_h,
                        z,
                        block: wall_block(q, r, layer, cfg),
                        role: PrismRole::Wall,
                    });
                }
            } else {
                /* Interior column: floor + ceiling only (hollow). */
                out.push(Prism {
                    x,
                    y: 0.0,
                    z,
                    block: floor_block(dist, cfg),
                    role: PrismRole::Floor,
                });
                out.push(Prism {
                    x,
                    y: (cfg.layers - 1) as f32 * layer_h,
                    z,
                    block: Block::StationHull,
                    role: PrismRole::Ceiling,
                });
            }
        }
    }
    out
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
/// in Tenebris's equatorial (XZ) plane, phase 0 on the +x axis - the
/// same axis the old parked dock point used, so a fresh world's station
/// starts where it always did and sweeps from there.
pub fn orbit_pos(t: f64) -> DVec3 {
    let b = planet::get(BodyId::Tenebris);
    let r = orbit_radius_m();
    let ph = (orbit_speed_mps() / r) * t;
    dvec3_make(b.pos_x + r * ph.cos(), b.pos_y, b.pos_z + r * ph.sin())
}

/// Station velocity at world-time `t`: the prograde tangent, magnitude
/// [`orbit_speed_mps`]. This is what the rocket has to match to dock.
pub fn orbit_vel(t: f64) -> DVec3 {
    let r = orbit_radius_m();
    let v = orbit_speed_mps();
    let ph = (v / r) * t;
    dvec3_make(-v * ph.sin(), 0.0, v * ph.cos())
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
    fn shell_matches_centered_hex_formula() {
        /* The user-specced drum: radius 10 rings, 6 layers, 15 m tall.
         * Same numbers tools/station-math.py prints. */
        let cfg = StationConfig::DEFAULT;
        assert_eq!(hexes_per_deck(10), 331);
        assert_eq!(shell_prism_count(10, 6), 902);
        let prisms = shell(&cfg);
        assert_eq!(prisms.len(), 902);
        /* Palette split: one 60-hex neon equator band; six sign corner
         * tiles; carpet only on the floor disk's inner half. */
        let count = |b: Block| prisms.iter().filter(|p| p.block == b).count();
        assert_eq!(count(Block::NeonTrim), 60);
        assert_eq!(count(Block::CasinoSign), 6);
        let inner = 3 * 5 * 6 + 1; /* hexes_per_deck(5) = 91 carpet cells */
        assert_eq!(count(Block::CasinoCarpet), inner);
        /* Everything sits inside the physical drum bounds. */
        let rad = 3.0f32.sqrt() * cfg.hex_size_m * cfg.radius_hexes as f32 + cfg.hex_size_m;
        for p in &prisms {
            assert!((p.x * p.x + p.z * p.z).sqrt() <= rad + 1e-3);
            assert!(p.y >= 0.0 && p.y <= cfg.height_m);
        }
    }

    #[test]
    fn orbit_speed_and_period_derive_from_gravity() {
        set_config(StationConfig::DEFAULT);
        let b = crate::planet::get(BodyId::Tenebris);
        let r = orbit_radius_m();
        assert_eq!(r, b.radius_m + 120.0);
        /* v = sqrt(g R^2 / r): centripetal balance in the inverse-square
         * field orbital_gravity_at applies. Pinned via station-math.py. */
        let g = (crate::planet::SURFACE_GRAVITY_MPS2_PER_G * b.gravity_g) as f64;
        let v = orbit_speed_mps();
        assert!((v - (g * b.radius_m * b.radius_m / r).sqrt()).abs() < 1e-9);
        assert!((v - 73.19).abs() < 0.01, "420 m circular speed ~73.19 m/s, got {v}");
        assert!((orbit_period_s() - 36.05).abs() < 0.05);
        /* The rails and the field agree: centripetal accel at the track
         * equals the sampled gravity magnitude there. */
        let a_field = g * (b.radius_m / r) * (b.radius_m / r);
        assert!((v * v / r - a_field).abs() < 1e-9);
    }

    #[test]
    fn orbit_track_is_circular_and_velocity_is_tangent() {
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
        /* Full period returns to the phase-0 anchor on the +x axis. */
        let p0 = orbit_pos(0.0);
        let p1 = orbit_pos(orbit_period_s());
        assert!((p0.x - p1.x).abs() < 1e-6 && (p0.z - p1.z).abs() < 1e-6);
        assert!((p0.x - (b.pos_x + r)).abs() < 1e-9);
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
