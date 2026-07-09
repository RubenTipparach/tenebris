//! In-game tech-tree / progression guide (egui overlay, opened with K).
//!
//! A live map of the crafting tree, driven by the real recipe table
//! (`core::crafting`) so it never drifts from what the game can actually
//! make. Recipes are grouped into tier columns (0..3 = the gather ->
//! smelt -> electronics -> capsule progression) and each node shows its
//! state relative to what the player has discovered:
//!
//! - **Ready**  - craftable right now (materials on hand).
//! - **Known**  - every ingredient has been discovered (held at least
//!   once), so the recipe is unlocked, but you can't build it this moment.
//! - **Locked** - some ingredient hasn't been discovered yet; shown dim so
//!   the goal is visible without spoiling the details.
//!
//! "Discovered" is tracked as a bitset of item ids the player has ever
//! held: [`discover_held`] sweeps the bag + hotbar every frame, so raw
//! materials unlock as they're gathered and crafted items unlock as
//! they're made. The set persists per world alongside the bag (SP).

#![allow(dead_code)]

use std::cell::RefCell;
use std::rc::Rc;

use sokol::app as sapp;

use tenebris_core::crafting::{self, Recipe};
use tenebris_core::items::{self, ItemId};

use crate::bag::{self, Bag};
use crate::inventory::Inventory;
use crate::player_ctrl::PlayerCtrl;
use tenebris_core::blocks::Block;

/// Highest tier column shown (recipes are tagged tier 0..3 today).
const MAX_TIER: u8 = 3;

/* ---------------------------------------------------------------------- */
/* Discovery set - a Copy bitset of item ids the player has ever held.     */

/// 192 item-id slots (block ids 0..42 + item ids 100..129 fit easily).
const DISCO_WORDS: usize = 3;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Discovered {
    bits: [u64; DISCO_WORDS],
}

impl Default for Discovered {
    fn default() -> Self {
        Discovered { bits: [0; DISCO_WORDS] }
    }
}

impl Discovered {
    pub fn set(&mut self, id: ItemId) {
        let i = id as usize;
        if i < DISCO_WORDS * 64 {
            self.bits[i / 64] |= 1u64 << (i % 64);
        }
    }

    pub fn has(&self, id: ItemId) -> bool {
        let i = id as usize;
        i < DISCO_WORDS * 64 && (self.bits[i / 64] >> (i % 64)) & 1 == 1
    }

    /// Hex words, `-` separated, for the per-world save.
    pub fn serialize(&self) -> String {
        self.bits.iter().map(|w| format!("{:x}", w)).collect::<Vec<_>>().join("-")
    }

    /// Parse [`serialize`]'s output; `None` on malformed input.
    pub fn parse(s: &str) -> Option<Discovered> {
        let mut d = Discovered::default();
        for (i, part) in s.split('-').enumerate().take(DISCO_WORDS) {
            d.bits[i] = u64::from_str_radix(part.trim(), 16).ok()?;
        }
        Some(d)
    }
}

/// Mark every item currently in the hotbar + bag as discovered. Cheap;
/// called every frame so anything the player holds (even briefly) unlocks
/// its tree node and the recipes it feeds.
pub fn discover_held(d: &mut Discovered, inv: &Inventory, bag: &Bag) {
    for s in &inv.slots {
        if s.block_type != Block::Air && s.count > 0 {
            d.set(items::from_block(s.block_type));
        }
    }
    for s in &bag.slots {
        if s.count > 0 {
            d.set(s.item);
        }
    }
}

/* ---------------------------------------------------------------------- */
/* Node state.                                                             */

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum NodeState {
    /// Some ingredient hasn't been discovered yet.
    Locked,
    /// All ingredients discovered (unlocked), but not buildable right now.
    Known,
    /// Buildable this moment (materials on hand).
    Ready,
}

/// Classify a recipe against what the player has discovered + holds.
pub fn node_state(r: &Recipe, d: &Discovered, inv: &Inventory, bag: &Bag) -> NodeState {
    if bag::can_craft(inv, bag, r) {
        return NodeState::Ready;
    }
    let inputs_known = r.inputs.iter().all(|i| d.has(i.item));
    if inputs_known || d.has(r.output.item) {
        NodeState::Known
    } else {
        NodeState::Locked
    }
}

/// Pretty display name for an item id: "wood-pickaxe" -> "Wood Pickaxe".
fn pretty_name(id: ItemId) -> String {
    let raw = items::def(id).map(|dfn| dfn.name).unwrap_or("item");
    let mut out = String::with_capacity(raw.len());
    let mut cap = true;
    for ch in raw.chars() {
        if ch == '-' || ch == '_' {
            out.push(' ');
            cap = true;
        } else if cap {
            out.extend(ch.to_uppercase());
            cap = false;
        } else {
            out.push(ch);
        }
    }
    out
}

/* ===================================================================== */
/* egui overlay.                                                          */

pub type PlayerHandle = Rc<RefCell<PlayerCtrl>>;

struct TechScreen {
    open: bool,
}

thread_local! {
    static G: RefCell<TechScreen> = const { RefCell::new(TechScreen { open: false }) };
    static PLAYER: RefCell<Option<PlayerHandle>> = const { RefCell::new(None) };
}

pub fn is_open() -> bool {
    G.with(|c| c.borrow().open)
}

pub fn close() {
    G.with(|c| c.borrow_mut().open = false);
}

/// Toggle the overlay (wired to K in app). Releases pointer lock on open so
/// the cursor can scroll / close, mirroring the inventory screen.
pub fn toggle() {
    G.with(|c| {
        let mut g = c.borrow_mut();
        g.open = !g.open;
        if g.open {
            sapp::lock_mouse(false);
            sapp::show_mouse(true);
        }
    });
}

pub fn set_player(p: Option<PlayerHandle>) {
    PLAYER.with(|c| *c.borrow_mut() = p);
}

/// Swallow input while open so the world behind doesn't react; Esc / K
/// close. Returns true when the event was consumed.
pub fn event(e: &sapp::Event) -> bool {
    G.with(|c| {
        let mut g = c.borrow_mut();
        if !g.open {
            return false;
        }
        if e._type == sapp::EventType::KeyDown
            && (e.key_code == sapp::Keycode::Escape || e.key_code == sapp::Keycode::K)
        {
            g.open = false;
        }
        true
    })
}

const SLOT_PX: f32 = 34.0;

fn state_border(state: NodeState) -> egui::Color32 {
    match state {
        NodeState::Ready => egui::Color32::from_rgb(0x7a, 0xc8, 0x66),
        NodeState::Known => egui::Color32::from_rgb(0x6a, 0x74, 0x88),
        NodeState::Locked => egui::Color32::from_rgb(0x3a, 0x3e, 0x48),
    }
}

/// One item thumbnail at `size`, dimmed when `locked`.
fn item_icon(ui: &mut egui::Ui, item: ItemId, count: u16, size: f32, locked: bool) {
    let (rect, _) = ui.allocate_exact_size(egui::vec2(size, size), egui::Sense::hover());
    let p = ui.painter();
    p.rect_filled(rect, 2.0, egui::Color32::from_rgb(0x22, 0x25, 0x2d));
    let tint = if locked { egui::Color32::from_gray(0x55) } else { egui::Color32::WHITE };
    match crate::ui_icons::uv(item) {
        Some([u0, v0, u1, v1]) => {
            let uv = egui::Rect::from_min_max(egui::pos2(u0, v0), egui::pos2(u1, v1));
            p.image(crate::egui_layer::ICON_TEX, rect.shrink(3.0), uv, tint);
        }
        None => {
            p.rect_filled(rect.shrink(6.0), 2.0, egui::Color32::from_gray(if locked { 0x44 } else { 0x80 }));
        }
    }
    if count > 1 {
        p.text(
            rect.max - egui::vec2(2.0, 1.0),
            egui::Align2::RIGHT_BOTTOM,
            count.to_string(),
            egui::FontId::proportional(11.0),
            tint,
        );
    }
}

/// One recipe node: output + its inputs, framed by state colour.
fn recipe_card(ui: &mut egui::Ui, r: &Recipe, state: NodeState) {
    let locked = state == NodeState::Locked;
    let frame = egui::Frame::none()
        .fill(egui::Color32::from_rgb(0x1c, 0x1f, 0x26))
        .stroke(egui::Stroke::new(if state == NodeState::Ready { 2.0 } else { 1.0 }, state_border(state)))
        .inner_margin(egui::Margin::same(5))
        .rounding(4.0);
    frame.show(ui, |ui| {
        ui.set_width(210.0);
        ui.horizontal(|ui| {
            item_icon(ui, r.output.item, r.output.count, SLOT_PX, locked);
            ui.add_space(4.0);
            ui.vertical(|ui| {
                let name = if locked { "???".to_string() } else { pretty_name(r.output.item) };
                let name_col = match state {
                    NodeState::Ready => egui::Color32::from_rgb(0xd8, 0xf0, 0xc8),
                    NodeState::Known => egui::Color32::from_rgb(0xc8, 0xd0, 0xe0),
                    NodeState::Locked => egui::Color32::from_gray(0x66),
                };
                ui.label(egui::RichText::new(name).strong().color(name_col));
                ui.horizontal(|ui| {
                    for ing in &r.inputs {
                        item_icon(ui, ing.item, ing.count, 20.0, locked);
                    }
                    if let Some(st) = r.station {
                        ui.label(
                            egui::RichText::new(format!("@{}", pretty_name(st)))
                                .small()
                                .color(egui::Color32::from_gray(0x88)),
                        );
                    }
                });
            });
        });
    });
    ui.add_space(4.0);
}

/// Draw the tech-tree overlay. No-op when closed.
pub fn egui_ui(ctx: &egui::Context) {
    if !is_open() {
        return;
    }
    let Some(player) = PLAYER.with(|c| c.borrow().clone()) else {
        return;
    };
    let recipes: Vec<Recipe> = crafting::with_recipes(|rs| rs.to_vec());
    let (inv, bag, disco) = {
        let p = player.borrow();
        (p.inventory, p.bag, p.discovered)
    };

    let mut do_close = false;
    egui::Window::new("Tech Tree")
        .collapsible(false)
        .resizable(false)
        .default_width(960.0)
        .anchor(egui::Align2::CENTER_CENTER, egui::Vec2::ZERO)
        .show(ctx, |ui| {
            ui.label(
                egui::RichText::new(
                    "Craft progression - unlocks as you gather + build. \
                     Green = ready, grey = known, dim = undiscovered.",
                )
                .small()
                .color(egui::Color32::from_rgb(0x90, 0x98, 0xa8)),
            );
            ui.add_space(6.0);

            egui::ScrollArea::vertical().max_height(560.0).show(ui, |ui| {
                ui.horizontal_top(|ui| {
                    for tier in 0..=MAX_TIER {
                        ui.vertical(|ui| {
                            ui.set_width(224.0);
                            ui.label(
                                egui::RichText::new(format!("Tier {tier}"))
                                    .strong()
                                    .color(egui::Color32::from_rgb(0xe0, 0xc8, 0x60)),
                            );
                            ui.add_space(4.0);
                            let mut any = false;
                            for r in recipes.iter().filter(|r| r.tier == tier) {
                                let st = node_state(r, &disco, &inv, &bag);
                                recipe_card(ui, r, st);
                                any = true;
                            }
                            if !any {
                                ui.label(
                                    egui::RichText::new("-")
                                        .color(egui::Color32::from_gray(0x55)),
                                );
                            }
                        });
                        ui.add_space(8.0);
                    }
                });
            });

            ui.add_space(6.0);
            if ui.button("Close (K)").clicked() {
                do_close = true;
            }
        });

    if do_close {
        close();
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tenebris_core::items::{PLANK, STICK, WOOD_PICKAXE};

    #[test]
    fn discovered_bitset_round_trips() {
        let mut d = Discovered::default();
        assert!(!d.has(WOOD_PICKAXE));
        d.set(WOOD_PICKAXE);
        d.set(PLANK);
        d.set(Block::Stone as u16);
        assert!(d.has(WOOD_PICKAXE) && d.has(PLANK) && d.has(Block::Stone as u16));
        assert!(!d.has(STICK));
        let s = d.serialize();
        assert_eq!(Discovered::parse(&s), Some(d));
    }

    #[test]
    fn node_state_locks_until_inputs_discovered() {
        // A plank recipe: log -> plank. Locked until a log is discovered.
        let recipe = Recipe {
            name: "planks".into(),
            inputs: vec![tenebris_core::items::ItemStack {
                item: items::from_block(Block::Wood),
                count: 1,
            }],
            output: tenebris_core::items::ItemStack { item: PLANK, count: 4 },
            tier: 0,
            station: None,
        };
        let mut inv = Inventory::default();
        crate::inventory::init_empty(&mut inv);
        let bag = Bag::default();
        let mut d = Discovered::default();
        assert_eq!(node_state(&recipe, &d, &inv, &bag), NodeState::Locked);
        // Discover a log -> the recipe is now known (but no materials).
        d.set(items::from_block(Block::Wood));
        assert_eq!(node_state(&recipe, &d, &inv, &bag), NodeState::Known);
        // Actually hold a log -> ready to craft.
        let mut bag2 = Bag::default();
        bag2.add(items::from_block(Block::Wood), 1);
        assert_eq!(node_state(&recipe, &d, &inv, &bag2), NodeState::Ready);
    }
}
