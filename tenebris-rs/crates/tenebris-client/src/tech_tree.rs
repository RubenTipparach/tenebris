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
        if s.item != Block::Air as u16 && s.count > 0 {
            d.set(s.item);
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

/// Toggle the overlay (wired to K in app). Releases pointer lock on open
/// so the cursor can pan / close; re-locks on close so the player drops
/// straight back into FPS mouse-look, mirroring the inventory screen.
pub fn toggle() {
    G.with(|c| {
        let mut g = c.borrow_mut();
        g.open = !g.open;
        if g.open {
            sapp::lock_mouse(false);
            sapp::show_mouse(true);
        } else {
            sapp::lock_mouse(true);
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
            sapp::lock_mouse(true);
        }
        true
    })
}

fn state_border(state: NodeState) -> egui::Color32 {
    match state {
        NodeState::Ready => egui::Color32::from_rgb(0x7a, 0xc8, 0x66),
        NodeState::Known => egui::Color32::from_rgb(0x6a, 0x74, 0x88),
        NodeState::Locked => egui::Color32::from_rgb(0x3a, 0x3e, 0x48),
    }
}

/* ---------------------------------------------------------------------- */
/* Layout by crafting DEPTH (chain distance from raw materials), so every  */
/* dependency edge flows strictly left -> right and never loops within a   */
/* column.                                                                 */

const CARD_W: f32 = 208.0;
const CARD_H: f32 = 46.0;
/* Wide gutter between columns so the dependency curves have room to
 * breathe instead of hugging the cards. */
const COL_PITCH: f32 = 320.0;
const ROW_PITCH: f32 = 58.0;
const HEADER_H: f32 = 20.0;

/// The recipe (index) whose output is `item`, or `None` if `item` is a raw
/// material (mined / gathered, not crafted).
fn producer_of(recipes: &[Recipe], item: ItemId) -> Option<usize> {
    recipes.iter().position(|r| r.output.item == item)
}

/// Craft depth of recipe `idx`: 1 + the deepest crafted input (raw inputs
/// count as depth 0). Memoised; the `visiting` guard keeps a malformed
/// cyclic recipe set from recursing forever.
fn depth_of(
    recipes: &[Recipe],
    idx: usize,
    memo: &mut [Option<u32>],
    visiting: &mut [bool],
) -> u32 {
    if let Some(d) = memo[idx] {
        return d;
    }
    if visiting[idx] {
        return 1;
    }
    visiting[idx] = true;
    let mut deepest = 0;
    for ing in &recipes[idx].inputs {
        if let Some(p) = producer_of(recipes, ing.item) {
            if p != idx {
                deepest = deepest.max(depth_of(recipes, p, memo, visiting));
            }
        }
    }
    visiting[idx] = false;
    let d = deepest + 1;
    memo[idx] = Some(d);
    d
}

/// Group recipe indices into columns by craft depth (column 0 = depth 1),
/// then order each column by the barycentre of its producers' rows so
/// dependency edges stay short and mostly horizontal instead of criss-
/// crossing the panel.
pub(crate) fn columns(recipes: &[Recipe]) -> Vec<Vec<usize>> {
    let n = recipes.len();
    if n == 0 {
        return Vec::new();
    }
    let mut memo = vec![None; n];
    let mut visiting = vec![false; n];
    let depths: Vec<u32> =
        (0..n).map(|i| depth_of(recipes, i, &mut memo, &mut visiting)).collect();
    let maxd = depths.iter().copied().max().unwrap_or(1);
    let mut cols = vec![Vec::new(); maxd as usize];
    for (i, &d) in depths.iter().enumerate() {
        cols[(d - 1) as usize].push(i);
    }

    /* Barycentre pass, left to right: each node moves next to the mean
     * row of the producers whose edges are actually DRAWN (the ones in
     * the previous column - see `edges`). One sweep is enough to
     * untangle a tree this size (classic layered-graph heuristic). */
    let mut rowpos = vec![0.0f32; n];
    for col in &cols {
        for (ri, &rid) in col.iter().enumerate() {
            rowpos[rid] = ri as f32;
        }
    }
    for ci in 1..cols.len() {
        let mut keyed: Vec<(f32, usize)> = cols[ci]
            .iter()
            .map(|&rid| {
                /* Producers in the immediately previous column - the
                 * gating inputs whose edges get drawn. */
                let prods: Vec<f32> = recipes[rid]
                    .inputs
                    .iter()
                    .filter_map(|ing| producer_of(recipes, ing.item))
                    .filter(|&p| depths[p] as usize == ci)
                    .map(|p| rowpos[p])
                    .collect();
                let key = if prods.is_empty() {
                    rowpos[rid]
                } else {
                    prods.iter().sum::<f32>() / prods.len() as f32
                };
                (key, rid)
            })
            .collect();
        keyed.sort_by(|a, b| a.0.partial_cmp(&b.0).unwrap().then(a.1.cmp(&b.1)));
        cols[ci] = keyed.into_iter().map(|(_, r)| r).collect();
        for (ri, &rid) in cols[ci].iter().enumerate() {
            rowpos[rid] = ri as f32;
        }
    }

    /* One backward sweep: re-seat each producer at the mean row of the
     * consumers it feeds in the NEXT column, so a node like "sticks"
     * (which feeds every tool) sits centred on its fan instead of at the
     * top with edges sweeping the whole gutter. */
    for ci in (0..cols.len().saturating_sub(1)).rev() {
        let mut keyed: Vec<(f32, usize)> = cols[ci]
            .iter()
            .map(|&rid| {
                let out_item = recipes[rid].output.item;
                let consumers: Vec<f32> = cols[ci + 1]
                    .iter()
                    .copied()
                    .filter(|&c| recipes[c].inputs.iter().any(|ing| ing.item == out_item))
                    .map(|c| rowpos[c])
                    .collect();
                let key = if consumers.is_empty() {
                    rowpos[rid]
                } else {
                    consumers.iter().sum::<f32>() / consumers.len() as f32
                };
                (key, rid)
            })
            .collect();
        keyed.sort_by(|a, b| a.0.partial_cmp(&b.0).unwrap().then(a.1.cmp(&b.1)));
        cols[ci] = keyed.into_iter().map(|(_, r)| r).collect();
        for (ri, &rid) in cols[ci].iter().enumerate() {
            rowpos[rid] = ri as f32;
        }
    }
    cols
}

/// The dependency edges the chart DRAWS: one per (producer, consumer)
/// pair where the producer sits in the immediately previous depth column
/// - i.e. the input that actually gates the recipe's place in the chain.
/// Commodity ingredients from far-earlier steps (planks, sticks feed
/// almost everything) are deliberately NOT drawn as lines - they'd cross
/// the whole panel through other cards and turn the chart into a
/// hairball. They still show as input icons on each card.
pub(crate) fn edges(recipes: &[Recipe], cols: &[Vec<usize>]) -> Vec<(usize, usize)> {
    let mut col_of = vec![0usize; recipes.len()];
    for (ci, col) in cols.iter().enumerate() {
        for &rid in col {
            col_of[rid] = ci;
        }
    }
    let mut seen = std::collections::BTreeSet::new();
    let mut out = Vec::new();
    for (rid, r) in recipes.iter().enumerate() {
        for ing in &r.inputs {
            if let Some(p) = producer_of(recipes, ing.item) {
                if p != rid && col_of[p] + 1 == col_of[rid] && seen.insert((p, rid)) {
                    out.push((p, rid));
                }
            }
        }
    }
    out
}

/// Paint an item thumbnail into `rect`.
fn paint_icon(p: &egui::Painter, item: ItemId, rect: egui::Rect, tint: egui::Color32) {
    match crate::ui_icons::uv(item) {
        Some([u0, v0, u1, v1]) => {
            let uv = egui::Rect::from_min_max(egui::pos2(u0, v0), egui::pos2(u1, v1));
            p.image(crate::egui_layer::ICON_TEX, rect, uv, tint);
        }
        None => {
            p.rect_filled(rect, 2.0, egui::Color32::from_gray(0x60));
        }
    }
}

/// One recipe node drawn straight to the painter at `rect`.
fn paint_node(p: &egui::Painter, rect: egui::Rect, r: &Recipe, state: NodeState) {
    let locked = state == NodeState::Locked;
    let tint = if locked { egui::Color32::from_gray(0x55) } else { egui::Color32::WHITE };
    p.rect_filled(rect, 4.0, egui::Color32::from_rgb(0x1c, 0x1f, 0x26));
    p.rect_stroke(
        rect,
        4.0,
        egui::Stroke::new(if state == NodeState::Ready { 2.0 } else { 1.0 }, state_border(state)),
        egui::StrokeKind::Inside,
    );
    // Output icon (left).
    let icon = egui::Rect::from_min_size(rect.min + egui::vec2(6.0, 7.0), egui::vec2(32.0, 32.0));
    paint_icon(p, r.output.item, icon, tint);
    if r.output.count > 1 {
        p.text(
            icon.max,
            egui::Align2::RIGHT_BOTTOM,
            r.output.count.to_string(),
            egui::FontId::proportional(11.0),
            tint,
        );
    }
    // Name.
    let name = if locked { "???".to_string() } else { pretty_name(r.output.item) };
    let name_col = match state {
        NodeState::Ready => egui::Color32::from_rgb(0xd8, 0xf0, 0xc8),
        NodeState::Known => egui::Color32::from_rgb(0xc8, 0xd0, 0xe0),
        NodeState::Locked => egui::Color32::from_gray(0x66),
    };
    p.text(
        egui::pos2(rect.min.x + 44.0, rect.min.y + 6.0),
        egui::Align2::LEFT_TOP,
        name,
        egui::FontId::proportional(13.0),
        name_col,
    );
    // Input icons (small row under the name).
    let mut ix = rect.min.x + 44.0;
    for ing in &r.inputs {
        let ir = egui::Rect::from_min_size(egui::pos2(ix, rect.min.y + 24.0), egui::vec2(16.0, 16.0));
        paint_icon(p, ing.item, ir, tint);
        if ing.count > 1 {
            p.text(
                ir.max + egui::vec2(1.0, 0.0),
                egui::Align2::LEFT_BOTTOM,
                ing.count.to_string(),
                egui::FontId::proportional(9.0),
                tint,
            );
        }
        ix += 22.0;
    }
    // Station requirement.
    if let Some(st) = r.station {
        p.text(
            egui::pos2(rect.max.x - 5.0, rect.max.y - 3.0),
            egui::Align2::RIGHT_BOTTOM,
            format!("@{}", pretty_name(st)),
            egui::FontId::proportional(9.0),
            egui::Color32::from_gray(0x80),
        );
    }
}

/// A dependency edge from a producer node to a consumer node: one smooth
/// horizontal-tangent bezier (much less visual noise than an elbow when
/// many edges fan between two columns), with a small socket dot at each
/// end so the attachment points read clearly.
fn paint_edge(p: &egui::Painter, from: egui::Rect, to: egui::Rect, dim: bool) {
    let a = from.right_center();
    let b = to.left_center();
    let col = if dim {
        egui::Color32::from_rgba_unmultiplied(0x48, 0x50, 0x60, 90)
    } else {
        egui::Color32::from_rgba_unmultiplied(0x8a, 0x96, 0xac, 180)
    };
    let reach = ((b.x - a.x).abs() * 0.5).max(24.0);
    let shape = egui::epaint::CubicBezierShape::from_points_stroke(
        [a, egui::pos2(a.x + reach, a.y), egui::pos2(b.x - reach, b.y), b],
        false,
        egui::Color32::TRANSPARENT,
        egui::Stroke::new(1.4, col),
    );
    p.add(shape);
    p.circle_filled(a, 2.2, col);
    p.circle_filled(b, 2.2, col);
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
    let cols = columns(&recipes);
    let ncol = cols.len().max(1);
    let max_rows = cols.iter().map(|c| c.len()).max().unwrap_or(0);
    let total = egui::vec2(
        ncol as f32 * COL_PITCH,
        HEADER_H + max_rows as f32 * ROW_PITCH + 8.0,
    );

    let mut do_close = false;
    egui::Window::new("Tech Tree")
        .collapsible(false)
        .resizable(false)
        .default_width(1120.0)
        .anchor(egui::Align2::CENTER_CENTER, egui::Vec2::ZERO)
        .show(ctx, |ui| {
            ui.label(
                egui::RichText::new(
                    "Craft progression - each node needs the ones linked into it. \
                     Drag the panel to pan. Green = ready, grey = known, \
                     dim = undiscovered.",
                )
                .small()
                .color(egui::Color32::from_rgb(0x90, 0x98, 0xa8)),
            );
            ui.add_space(6.0);

            let out = egui::ScrollArea::both()
                .max_height(560.0)
                .auto_shrink([false, false])
                /* Click-drag anywhere on the chart pans it (the nodes are
                 * read-only, so nothing competes for the drag). */
                .scroll_source(egui::containers::scroll_area::ScrollSource {
                    drag: true,
                    ..Default::default()
                })
                .show(ui, |ui| {
                    let (region, _) = ui.allocate_exact_size(total, egui::Sense::hover());
                    let o = region.min;

                    // Rect per recipe index (depth column, row within column).
                    let mut rects: Vec<Option<egui::Rect>> = vec![None; recipes.len()];
                    for (ci, col) in cols.iter().enumerate() {
                        for (ri, &rid) in col.iter().enumerate() {
                            let x = o.x + ci as f32 * COL_PITCH;
                            let y = o.y + HEADER_H + ri as f32 * ROW_PITCH;
                            rects[rid] = Some(egui::Rect::from_min_size(
                                egui::pos2(x, y),
                                egui::vec2(CARD_W, CARD_H),
                            ));
                        }
                    }

                    let painter = ui.painter_at(region);
                    // Column headers.
                    for ci in 0..ncol {
                        painter.text(
                            egui::pos2(o.x + ci as f32 * COL_PITCH, o.y),
                            egui::Align2::LEFT_TOP,
                            format!("Step {}", ci + 1),
                            egui::FontId::proportional(12.0),
                            egui::Color32::from_rgb(0xe0, 0xc8, 0x60),
                        );
                    }
                    // Edges first (behind the nodes). Only the GATING
                    // edges are drawn - producer in the previous column
                    // (see `edges`) - so every line lives inside one
                    // column gutter and never crosses cards.
                    for (pidx, rid) in edges(&recipes, &cols) {
                        let (Some(prect), Some(crect)) = (rects[pidx], rects[rid]) else {
                            continue;
                        };
                        let dim =
                            node_state(&recipes[rid], &disco, &inv, &bag) == NodeState::Locked;
                        paint_edge(&painter, prect, crect, dim);
                    }
                    // Nodes on top.
                    for (rid, r) in recipes.iter().enumerate() {
                        if let Some(crect) = rects[rid] {
                            let st = node_state(r, &disco, &inv, &bag);
                            paint_node(&painter, crect, r, st);
                        }
                    }
                });

            /* Edge carets: a subtle chevron on each side of the viewport
             * that still has content beyond it, so the player knows the
             * chart pans that way. */
            {
                let vp = out.inner_rect;
                let off = out.state.offset;
                let content = out.content_size;
                let p = ui.painter();
                let col = egui::Color32::from_rgba_unmultiplied(0xe0, 0xc8, 0x60, 200);
                let font = egui::FontId::proportional(20.0);
                if off.x > 1.0 {
                    p.text(
                        egui::pos2(vp.min.x + 8.0, vp.center().y),
                        egui::Align2::CENTER_CENTER,
                        "<",
                        font.clone(),
                        col,
                    );
                }
                if off.x + vp.width() < content.x - 1.0 {
                    p.text(
                        egui::pos2(vp.max.x - 8.0, vp.center().y),
                        egui::Align2::CENTER_CENTER,
                        ">",
                        font.clone(),
                        col,
                    );
                }
                if off.y > 1.0 {
                    p.text(
                        egui::pos2(vp.center().x, vp.min.y + 8.0),
                        egui::Align2::CENTER_CENTER,
                        "^",
                        font.clone(),
                        col,
                    );
                }
                if off.y + vp.height() < content.y - 1.0 {
                    p.text(
                        egui::pos2(vp.center().x, vp.max.y - 8.0),
                        egui::Align2::CENTER_CENTER,
                        "v",
                        font,
                        col,
                    );
                }
            }

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
    fn depth_columns_order_the_craft_chain() {
        // log -> plank(1) -> stick(2) -> pickaxe(3): three depth columns.
        let src = "\
[planks]
out: plank 4
in: log 1
[sticks]
out: stick 4
in: plank 2
[wood-pickaxe]
out: wood-pickaxe 1
in: plank 3
in: stick 2
";
        let rs = tenebris_core::crafting::parse_recipes(src, "t");
        let cols = columns(&rs);
        assert_eq!(cols.len(), 3, "three craft-depth columns");
        // planks are depth 1, sticks depth 2, pickaxe depth 3.
        let name_at = |ci: usize| rs[cols[ci][0]].name.clone();
        assert_eq!(name_at(0), "planks");
        assert_eq!(name_at(1), "sticks");
        assert_eq!(name_at(2), "wood-pickaxe");
    }

    #[test]
    fn edges_draw_only_the_gating_link() {
        // planks(1) -> sticks(2) -> pickaxe(3). The pickaxe ALSO takes
        // planks, but that edge would span two columns through the
        // sticks card - it is omitted (the plank icon on the card
        // carries that information).
        let src = "\
[planks]
out: plank 4
in: log 1
[sticks]
out: stick 4
in: plank 2
[wood-pickaxe]
out: wood-pickaxe 1
in: plank 3
in: stick 2
";
        let rs = tenebris_core::crafting::parse_recipes(src, "t");
        let cols = columns(&rs);
        let es = edges(&rs, &cols);
        let name_pair = |&(a, b): &(usize, usize)| (rs[a].name.clone(), rs[b].name.clone());
        let pairs: Vec<_> = es.iter().map(name_pair).collect();
        assert!(pairs.contains(&("planks".into(), "sticks".into())));
        assert!(pairs.contains(&("sticks".into(), "wood-pickaxe".into())));
        assert!(
            !pairs.contains(&("planks".into(), "wood-pickaxe".into())),
            "column-skipping commodity edge must not be drawn"
        );
        // Every drawn edge connects adjacent columns.
        let mut col_of = vec![0usize; rs.len()];
        for (ci, col) in cols.iter().enumerate() {
            for &rid in col {
                col_of[rid] = ci;
            }
        }
        for (a, b) in es {
            assert_eq!(col_of[a] + 1, col_of[b], "edge spans exactly one gutter");
        }
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
            time_s: 1.5,
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
