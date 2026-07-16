//! Dump the casino station shell as a tile-editor template.
//!
//! Prints `station::shell(DEFAULT)` in the editor's
//! `tenebris-station-template` JSON format to stdout:
//!
//! ```sh
//! cargo run -p tenebris-core --example dump-station-template \
//!     > assets/templates/casino-station.template.json
//! ```
//!
//! Rerun after any shell() change so the checked-in template (and the
//! copy embedded in the tile-editor's built-in template list) stays in
//! sync with the game.

use tenebris_core::station::{self, StationMat};

/// The tile-editor's palette key for a station material.
fn mat_key(m: StationMat) -> &'static str {
    match m {
        StationMat::Hull => "hull",
        StationMat::Floor => "floor",
        StationMat::Carpet => "carpet",
        StationMat::Wall => "wall",
        StationMat::Neon => "neon",
        StationMat::NeonPink => "neon_pink",
        StationMat::NeonGold => "neon_gold",
        StationMat::Sign => "sign",
        StationMat::Glass => "glass",
        StationMat::TradeTerminal => "trade_terminal",
        StationMat::ResearchConsole => "research_console",
        StationMat::MuseumCase => "museum_case",
        StationMat::LightFixture => "light_fixture",
        StationMat::Slots => "slot_machine",
        StationMat::CardTable => "card_table",
    }
}

fn main() {
    let cfg = station::StationConfig::DEFAULT;
    let mut prisms = station::shell(&cfg);
    prisms.sort_by_key(|p| (p.layer, p.r, p.q));
    println!("{{");
    println!("  \"format\": \"tenebris-station-template\",");
    println!("  \"version\": 1,");
    println!("  \"name\": \"casino-station\",");
    println!("  \"hex_size_m\": {},", cfg.hex_size_m);
    println!("  \"layer_height_m\": {},", station::layer_h(&cfg));
    println!("  \"cells\": [");
    for (i, p) in prisms.iter().enumerate() {
        let comma = if i + 1 == prisms.len() { "" } else { "," };
        println!(
            "    {{ \"q\": {}, \"r\": {}, \"layer\": {}, \"mat\": \"{}\" }}{}",
            p.q,
            p.r,
            p.layer,
            mat_key(p.mat),
            comma
        );
    }
    println!("  ]");
    println!("}}");
}
