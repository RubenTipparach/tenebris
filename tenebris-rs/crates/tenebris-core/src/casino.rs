//! Casino games (space-era) - Core so SP and MP share the same odds and
//! payouts, and a server can be the authoritative dealer. The slot machine
//! is the first game.
//!
//! A spin is a PURE function of a `u64` seed the caller supplies (the client
//! seeds it from the wall clock + a per-spin counter), so the reels are
//! reproducible in tests and a server could re-derive a result to audit a
//! payout. Bet, reel odds, and payout multipliers all live in
//! `assets/config/casino.yaml` - no magic numbers in the game logic.

use std::sync::Mutex;

/// Slot reel symbols, ordered common -> rare (matches [`REEL_WEIGHTS`]).
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum SlotSymbol {
    Cherry,
    Lemon,
    Bell,
    Bar,
    Seven,
}

pub const SLOT_SYMBOL_COUNT: usize = 5;

impl SlotSymbol {
    pub fn from_index(i: u8) -> SlotSymbol {
        match i % SLOT_SYMBOL_COUNT as u8 {
            0 => SlotSymbol::Cherry,
            1 => SlotSymbol::Lemon,
            2 => SlotSymbol::Bell,
            3 => SlotSymbol::Bar,
            _ => SlotSymbol::Seven,
        }
    }

    pub fn index(self) -> u8 {
        match self {
            SlotSymbol::Cherry => 0,
            SlotSymbol::Lemon => 1,
            SlotSymbol::Bell => 2,
            SlotSymbol::Bar => 3,
            SlotSymbol::Seven => 4,
        }
    }

    /// Short ASCII label (the client draws its own art, but this keeps the
    /// symbol nameable for tooltips / logs - ASCII per the render rules).
    pub fn label(self) -> &'static str {
        match self {
            SlotSymbol::Cherry => "Cherry",
            SlotSymbol::Lemon => "Lemon",
            SlotSymbol::Bell => "Bell",
            SlotSymbol::Bar => "Bar",
            SlotSymbol::Seven => "Seven",
        }
    }
}

/// Reel weights (relative frequency), common -> rare. These set the machine's
/// odds and therefore its house edge, so they're the game's IDENTITY - kept
/// in core rather than exposed as a tunable table the tiny parser can't hold.
/// The payout MULTIPLIERS (the designer-tweakable part) live in casino.yaml.
const REEL_WEIGHTS: [u32; SLOT_SYMBOL_COUNT] = [10, 8, 5, 3, 1];

/// splitmix64 - a cheap, well-distributed hash of a u64 seed. Good enough to
/// pick reel symbols without a stateful RNG; each reel mixes a different
/// tweak of the spin seed.
fn splitmix64(mut z: u64) -> u64 {
    z = z.wrapping_add(0x9E37_79B9_7F4A_7C15);
    z = (z ^ (z >> 30)).wrapping_mul(0xBF58_476D_1CE4_E5B9);
    z = (z ^ (z >> 27)).wrapping_mul(0x94D0_49BB_1331_11EB);
    z ^ (z >> 31)
}

/// One weighted reel symbol from a mixed seed.
fn reel(seed: u64) -> SlotSymbol {
    let total: u32 = REEL_WEIGHTS.iter().sum();
    let mut pick = (splitmix64(seed) % total as u64) as u32;
    for (i, &w) in REEL_WEIGHTS.iter().enumerate() {
        if pick < w {
            return SlotSymbol::from_index(i as u8);
        }
        pick -= w;
    }
    SlotSymbol::Cherry
}

/// Spin the three reels from `seed`. Deterministic in the seed; the client
/// supplies a fresh seed per spin (clock + counter).
pub fn spin(seed: u64) -> [SlotSymbol; 3] {
    [
        reel(seed ^ 0xA1A1_A1A1_A1A1_A1A1),
        reel(seed ^ 0xB2B2_B2B2_B2B2_B2B2),
        reel(seed ^ 0xC3C3_C3C3_C3C3_C3C3),
    ]
}

/// Winnings for `reels` at `bet`, using the payout multipliers in `cfg`:
/// three Sevens is the jackpot, three Bars the second prize, any other
/// three-of-a-kind the third, and a single matching pair the consolation.
/// No match pays nothing.
pub fn payout(reels: [SlotSymbol; 3], bet: i64, cfg: &SlotConfig) -> i64 {
    if bet <= 0 {
        return 0;
    }
    let [a, b, c] = reels;
    let mult = if a == b && b == c {
        match a {
            SlotSymbol::Seven => cfg.triple_seven_mult,
            SlotSymbol::Bar => cfg.triple_bar_mult,
            _ => cfg.triple_any_mult,
        }
    } else if a == b || b == c || a == c {
        cfg.pair_mult
    } else {
        0.0
    };
    (bet as f64 * mult as f64).floor() as i64
}

/* ------------------------------------------------------------------ */
/* Config (assets/config/casino.yaml).                                 */

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct SlotConfig {
    /// Credits wagered per spin.
    pub bet: i64,
    /// Payout = bet * mult for a matching pair.
    pub pair_mult: f32,
    /// ...for any three-of-a-kind that isn't Bar/Seven.
    pub triple_any_mult: f32,
    /// ...for three Bars.
    pub triple_bar_mult: f32,
    /// ...for three Sevens (the jackpot).
    pub triple_seven_mult: f32,
}

/* Tuned for a positive house edge (~81% return-to-player) with these reel
 * weights: pairs are common (~57% of spins) so they pay a small fraction of
 * the bet, three-of-a-kind is the real win (~8.5%), and the rare Bar / Seven
 * triples carry the top prizes. Re-derive if REEL_WEIGHTS change. */
pub const DEFAULT_SLOT_CONFIG: SlotConfig = SlotConfig {
    bet: 10,
    pair_mult: 0.5,
    triple_any_mult: 6.0,
    triple_bar_mult: 20.0,
    triple_seven_mult: 80.0,
};

impl Default for SlotConfig {
    fn default() -> Self {
        DEFAULT_SLOT_CONFIG
    }
}

static S_SLOT: Mutex<SlotConfig> = Mutex::new(DEFAULT_SLOT_CONFIG);

pub fn slot_config() -> SlotConfig {
    *S_SLOT.lock().unwrap()
}

pub fn set_slot_config(c: SlotConfig) {
    *S_SLOT.lock().unwrap() = c;
}

/// Parse casino.yaml: flat `key: value` numbers + `#` comments (the tiny
/// subset the other config parsers accept). A field that doesn't parse keeps
/// its compiled-in default.
pub fn parse_slot_config(src: &str) -> SlotConfig {
    let mut c = SlotConfig::default();
    for raw in src.lines() {
        let line = raw.split('#').next().unwrap_or("").trim();
        let Some((key, val)) = line.split_once(':') else { continue };
        let (key, val) = (key.trim(), val.trim());
        match key {
            "slot_bet" => {
                if let Ok(v) = val.parse::<i64>() {
                    c.bet = v.max(1);
                }
            }
            "slot_pair_mult" => {
                if let Ok(v) = val.parse::<f32>() {
                    c.pair_mult = v.max(0.0);
                }
            }
            "slot_triple_any_mult" => {
                if let Ok(v) = val.parse::<f32>() {
                    c.triple_any_mult = v.max(0.0);
                }
            }
            "slot_triple_bar_mult" => {
                if let Ok(v) = val.parse::<f32>() {
                    c.triple_bar_mult = v.max(0.0);
                }
            }
            "slot_triple_seven_mult" => {
                if let Ok(v) = val.parse::<f32>() {
                    c.triple_seven_mult = v.max(0.0);
                }
            }
            _ => {}
        }
    }
    c
}

/// Load + install casino.yaml from disk (native); defaults if missing.
pub fn load_config(path: &str) {
    match std::fs::read_to_string(path) {
        Ok(src) => set_slot_config(parse_slot_config(&src)),
        Err(_) => println!("[casino] {} not found, using compiled defaults", path),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn spin_is_deterministic_in_the_seed() {
        assert_eq!(spin(12345), spin(12345), "same seed -> same reels");
        /* Different seeds should (almost always) differ - scan a few. */
        let mut distinct = 0;
        for s in 0..8u64 {
            if spin(s) != spin(s + 1) {
                distinct += 1;
            }
        }
        assert!(distinct >= 5, "seeds vary the reels");
    }

    #[test]
    fn every_symbol_can_come_up() {
        let mut seen = [false; SLOT_SYMBOL_COUNT];
        for s in 0..20_000u64 {
            for sym in spin(s) {
                seen[sym.index() as usize] = true;
            }
        }
        assert!(seen.iter().all(|&b| b), "all symbols reachable, incl. the jackpot");
    }

    #[test]
    fn payouts_follow_the_table() {
        let cfg = SlotConfig::default();
        use SlotSymbol::*;
        let bet = 10;
        /* Jackpot / prizes. */
        assert_eq!(payout([Seven, Seven, Seven], bet, &cfg), 800);
        assert_eq!(payout([Bar, Bar, Bar], bet, &cfg), 200);
        assert_eq!(payout([Bell, Bell, Bell], bet, &cfg), 60);
        /* A pair (in any of the three positions) - a small consolation. */
        assert_eq!(payout([Cherry, Cherry, Bell], bet, &cfg), 5);
        assert_eq!(payout([Bell, Cherry, Cherry], bet, &cfg), 5);
        assert_eq!(payout([Cherry, Bell, Cherry], bet, &cfg), 5);
        /* No match. */
        assert_eq!(payout([Cherry, Lemon, Bell], bet, &cfg), 0);
        /* Zero / negative bet never pays. */
        assert_eq!(payout([Seven, Seven, Seven], 0, &cfg), 0);
    }

    #[test]
    fn house_edge_is_positive_over_a_long_run() {
        /* Sanity: the machine must not be a money printer. Over many spins
         * the total paid out should be LESS than the total wagered (the
         * house keeps an edge) with the default odds + multipliers. */
        let cfg = SlotConfig::default();
        let bet = cfg.bet;
        let n = 200_000u64;
        let mut wagered = 0i64;
        let mut won = 0i64;
        for s in 0..n {
            wagered += bet;
            won += payout(spin(s.wrapping_mul(2_654_435_761)), bet, &cfg);
        }
        assert!(won < wagered, "house edge: paid {won} vs wagered {wagered}");
        /* And it shouldn't be a total ripoff either - return-to-player above
         * a third keeps it fun. */
        assert!(won * 3 > wagered, "RTP too low: {won} vs {wagered}");
    }

    #[test]
    fn config_round_trips() {
        let src = "\
slot_bet: 25
slot_pair_mult: 2.0
slot_triple_seven_mult: 250
";
        let c = parse_slot_config(src);
        assert_eq!(c.bet, 25);
        assert_eq!(c.pair_mult, 2.0);
        assert_eq!(c.triple_seven_mult, 250.0);
        /* Unset fields keep defaults. */
        assert_eq!(c.triple_bar_mult, DEFAULT_SLOT_CONFIG.triple_bar_mult);
    }
}
