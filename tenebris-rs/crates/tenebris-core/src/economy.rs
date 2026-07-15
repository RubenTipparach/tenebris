//! Player economy - the credits wallet (space-era currency).
//!
//! Core, shared by SP and MP so money obeys the same rules everywhere: the
//! client carries a [`Wallet`] on the player and persists it same-frame with
//! every mutation; an MP server holds the authoritative wallet per player and
//! applies the same earn/spend rules (never trust the client for money).
//!
//! Prices, payouts, and sinks live in `assets/config/economy.yaml` (see
//! [`EconomyConfig`]) - no magic numbers in gameplay code.

use std::sync::Mutex;

/// A player's credits. Plain `Copy` state so it rides `PlayerCtrl` and the
/// persistence record without ceremony.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub struct Wallet {
    credits: i64,
}

impl Wallet {
    pub fn new(credits: i64) -> Wallet {
        Wallet { credits: credits.max(0) }
    }

    pub fn credits(&self) -> i64 {
        self.credits
    }

    /// Add credits (a sale, a casino win). Saturates instead of wrapping.
    pub fn earn(&mut self, n: i64) {
        if n > 0 {
            self.credits = self.credits.saturating_add(n);
        }
    }

    /// Spend credits if the balance covers it. Returns false (and leaves the
    /// balance untouched) when it can't - the wallet never goes negative.
    pub fn try_spend(&mut self, n: i64) -> bool {
        if n < 0 {
            return false;
        }
        if self.credits >= n {
            self.credits -= n;
            true
        } else {
            false
        }
    }
}

/* ------------------------------------------------------------------ */
/* Config: the economy tunables (assets/config/economy.yaml).          */

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct EconomyConfig {
    /// Credits a new player / world starts with.
    pub starting_credits: i64,
    /// Station price of one fuel unit.
    pub fuel_price_per_unit: f32,
    /// Sell price = buy price * this (the market spread, 0..1).
    pub sell_spread: f32,
}

pub const DEFAULT_ECONOMY_CONFIG: EconomyConfig = EconomyConfig {
    starting_credits: 0,
    fuel_price_per_unit: 2.0,
    sell_spread: 0.6,
};

impl Default for EconomyConfig {
    fn default() -> Self {
        DEFAULT_ECONOMY_CONFIG
    }
}

static S_CONFIG: Mutex<EconomyConfig> = Mutex::new(DEFAULT_ECONOMY_CONFIG);

pub fn config() -> EconomyConfig {
    *S_CONFIG.lock().unwrap()
}

pub fn set_config(c: EconomyConfig) {
    *S_CONFIG.lock().unwrap() = c;
}

/// Parse economy.yaml: flat `key: value` numbers + `#` comments (the tiny
/// subset the other config parsers accept). Unknown keys are ignored; a field
/// that doesn't parse keeps its compiled-in default.
pub fn parse_config(src: &str) -> EconomyConfig {
    let mut c = EconomyConfig::default();
    for raw in src.lines() {
        let line = raw.split('#').next().unwrap_or("").trim();
        let Some((key, val)) = line.split_once(':') else { continue };
        let (key, val) = (key.trim(), val.trim());
        match key {
            "starting_credits" => {
                if let Ok(v) = val.parse::<i64>() {
                    c.starting_credits = v.max(0);
                }
            }
            "fuel_price_per_unit" => {
                if let Ok(v) = val.parse::<f32>() {
                    c.fuel_price_per_unit = v;
                }
            }
            "sell_spread" => {
                if let Ok(v) = val.parse::<f32>() {
                    c.sell_spread = v.clamp(0.0, 1.0);
                }
            }
            _ => {}
        }
    }
    c
}

/// Load + install economy.yaml from disk (native); defaults if missing.
pub fn load_config(path: &str) {
    match std::fs::read_to_string(path) {
        Ok(src) => set_config(parse_config(&src)),
        Err(_) => println!("[economy] {} not found, using compiled defaults", path),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn earn_and_spend_guard_the_balance() {
        let mut w = Wallet::default();
        assert_eq!(w.credits(), 0);
        w.earn(100);
        assert_eq!(w.credits(), 100);
        assert!(w.try_spend(60));
        assert_eq!(w.credits(), 40);
        /* Overspend refused, balance untouched. */
        assert!(!w.try_spend(41));
        assert_eq!(w.credits(), 40);
        /* Negative amounts are no-ops / refused. */
        w.earn(-5);
        assert_eq!(w.credits(), 40);
        assert!(!w.try_spend(-1));
        assert_eq!(w.credits(), 40);
    }

    #[test]
    fn earn_saturates_instead_of_wrapping() {
        let mut w = Wallet::new(i64::MAX - 1);
        w.earn(100);
        assert_eq!(w.credits(), i64::MAX);
    }

    #[test]
    fn new_clamps_negative_to_zero() {
        assert_eq!(Wallet::new(-5).credits(), 0);
    }

    #[test]
    fn config_parses_and_clamps() {
        let c = parse_config(
            "# comment\nstarting_credits: 250\nfuel_price_per_unit: 3.5\nsell_spread: 1.4\nbogus: 9\n",
        );
        assert_eq!(c.starting_credits, 250);
        assert_eq!(c.fuel_price_per_unit, 3.5);
        assert_eq!(c.sell_spread, 1.0, "spread clamps to 0..1");
        /* Partial file keeps defaults for omitted fields. */
        let d = parse_config("starting_credits: 5\n");
        assert_eq!(d.fuel_price_per_unit, DEFAULT_ECONOMY_CONFIG.fuel_price_per_unit);
    }
}
