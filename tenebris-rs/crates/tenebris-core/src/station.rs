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
use std::sync::Mutex;

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
