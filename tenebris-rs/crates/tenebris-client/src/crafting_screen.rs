//! Survival crafting screen - a drawn `sokol_gl` panel (per the repo UI
//! rules: real geometry + hit-tested rows, labels via `sokol_debugtext`),
//! modelled on `teleport_menu`.
//!
//! Opened with `B` (E is already the space-mode roll key). Lists the
//! recipes installed from `recipes.yaml`; each row shows the output and
//! its inputs, coloured by whether the player can currently afford it
//! (hotbar + bag combined). Clicking a craftable row - or selecting it
//! with the arrows and pressing Enter - runs the craft through the
//! `bag` bridge, depositing the output into the bag.

use std::cell::RefCell;

use sokol::app as sapp;

use crate::bag;
use crate::egui_layer;
use crate::player_ctrl::{ActiveCraft, PlayerCtrl};
use crate::ui_icons;
use std::rc::Rc;
use tenebris_core::crafting::{self, Recipe};
use tenebris_core::items;

pub type PlayerHandle = Rc<RefCell<PlayerCtrl>>;

/// Hard cap on rows drawn (no scroll yet; Tier 0 has a handful).
const MAX_ROWS: usize = 16;

/// Most recipes that can wait in the craft queue behind the active one.
const QUEUE_MAX: usize = 8;

#[derive(Clone, Debug, Default)]
struct Screen {
    open: bool,
    selected: i32,
    player: Option<PlayerHandle>,
    /// Which recipes this surface offers: `None` = the hand bench (`B`),
    /// `Some(block_item_id)` = a placed station (furnace, ...). Only
    /// recipes whose `station` matches are listed / craftable.
    station: Option<items::ItemId>,
    /// Recipes waiting behind the active craft, in click order. Inputs
    /// are consumed when an entry's turn comes (tick_craft), so you can
    /// queue sticks behind the planks they need; an entry that can't
    /// pay at its turn is dropped. Transient - cleared on world switch.
    queue: Vec<Recipe>,
}

thread_local! {
    static S: RefCell<Screen> = RefCell::new(Screen::default());
}

pub fn init() {
    S.with(|c| *c.borrow_mut() = Screen::default());
}

pub fn shutdown() {}

pub fn is_open() -> bool {
    S.with(|c| c.borrow().open)
}

/// Snapshot of the waiting queue's outputs (item id, count) in turn order,
/// for the always-on craft-queue HUD (drawn when the panel is closed).
pub fn queue_outputs() -> Vec<(items::ItemId, u16)> {
    S.with(|c| {
        c.borrow()
            .queue
            .iter()
            .map(|r| (r.output.item, r.output.count))
            .collect()
    })
}

/// Serialize the player's active craft + the waiting queue to a flat string
/// for same-frame persistence (see `persistence::save_craft`). Format:
///   `<active>#<queue>`
///   active = `out,count,total_s,elapsed_s`   (empty when nothing crafting)
///   queue  = entries joined by `;`
///   entry  = `out,count,time_s,<inputs>`
///   inputs = `item:count|item:count|...`     (reserved inputs, for refund)
/// Inputs are carried so a queued entry cancelled AFTER a reload still
/// refunds correctly (they were consumed at enqueue time). The bag/hotbar
/// save already reflects the post-consume state, so restoring never
/// double-consumes.
pub fn serialize_state(p: &PlayerCtrl) -> String {
    let active = match p.crafting {
        Some(ac) => format!("{},{},{},{}", ac.output, ac.count, ac.total_s, ac.elapsed_s),
        None => String::new(),
    };
    let queue = S.with(|c| {
        c.borrow()
            .queue
            .iter()
            .map(|r| {
                let inputs = r
                    .inputs
                    .iter()
                    .map(|s| format!("{}:{}", s.item, s.count))
                    .collect::<Vec<_>>()
                    .join("|");
                format!("{},{},{},{}", r.output.item, r.output.count, r.time_s, inputs)
            })
            .collect::<Vec<_>>()
            .join(";")
    });
    format!("{active}#{queue}")
}

fn parse_active(s: &str) -> Option<ActiveCraft> {
    let mut it = s.split(',');
    let output = it.next()?.trim().parse::<items::ItemId>().ok()?;
    let count = it.next()?.trim().parse::<u16>().ok()?;
    let total_s = it.next()?.trim().parse::<f32>().ok()?;
    let elapsed_s = it.next()?.trim().parse::<f32>().ok()?;
    Some(ActiveCraft {
        output,
        count,
        total_s: total_s.max(0.01),
        elapsed_s: elapsed_s.max(0.0),
    })
}

fn parse_queue_entry(s: &str) -> Option<Recipe> {
    let mut it = s.split(',');
    let out = it.next()?.trim().parse::<items::ItemId>().ok()?;
    let count = it.next()?.trim().parse::<u16>().ok()?;
    let time_s = it.next()?.trim().parse::<f32>().ok()?;
    let inputs = it
        .next()
        .unwrap_or("")
        .split('|')
        .filter(|p| !p.is_empty())
        .filter_map(|pair| {
            let (i, c) = pair.split_once(':')?;
            Some(items::ItemStack::new(
                i.trim().parse::<items::ItemId>().ok()?,
                c.trim().parse::<u16>().ok()?,
            ))
        })
        .collect();
    Some(Recipe {
        name: String::new(),
        inputs,
        output: items::ItemStack::new(out, count),
        tier: 0,
        station: None,
        time_s: time_s.max(0.01),
    })
}

/// Restore the active craft + queue saved by [`serialize_state`]. Inputs are
/// NOT re-consumed (the saved bag/hotbar already reflect the consumption).
pub fn restore_state(p: &mut PlayerCtrl, blob: &str) {
    let (active, queue) = blob.split_once('#').unwrap_or((blob, ""));
    p.crafting = parse_active(active);
    let recipes: Vec<Recipe> = queue
        .split(';')
        .filter(|e| !e.is_empty())
        .filter_map(parse_queue_entry)
        .collect();
    S.with(|c| c.borrow_mut().queue = recipes);
}

/// Force the craft screen closed (e.g. when the inventory or the pause
/// modal takes over).
pub fn close() {
    S.with(|c| c.borrow_mut().open = false);
}

/// Force the craft screen open for `player` (dev / headless entry point,
/// parallel to the `B` toggle). Mutually exclusive with the other
/// survival overlays, like the key path.
pub fn open(player: Option<PlayerHandle>) {
    open_station(player, None);
}

/// Open the craft screen scoped to a station (`None` = hand bench). A
/// placed furnace etc. passes its block item id so only its recipes show.
pub fn open_station(player: Option<PlayerHandle>, station: Option<items::ItemId>) {
    S.with(|c| {
        let s = &mut *c.borrow_mut();
        s.player = player;
        s.open = true;
        s.station = station;
        s.selected = 0;
    });
    crate::screens::take_focus(crate::screens::Screen::Crafting);
}

/// The station the screen is currently scoped to.
fn cur_station() -> Option<items::ItemId> {
    S.with(|c| c.borrow().station)
}

/// Recipes offered by the currently-open surface (station-filtered).
fn cur_recipes() -> Vec<Recipe> {
    crafting::recipes_for_station(cur_station())
}

pub fn set_player(player: Option<PlayerHandle>) {
    S.with(|c| c.borrow_mut().player = player);
}

/// Number of recipe rows that will be drawn.
fn row_count() -> usize {
    cur_recipes().len().min(MAX_ROWS)
}





/// Snapshot the player's affordability for each visible recipe (Inventory
/// and Bag are both `Copy`, so this is a cheap borrow-and-drop).
fn affordable_flags() -> Vec<bool> {
    let snap = S.with(|c| {
        c.borrow().player.as_ref().map(|p| {
            let p = p.borrow();
            (p.inventory, p.bag)
        })
    });
    let Some((inv, bag)) = snap else { return Vec::new() };
    cur_recipes()
        .iter()
        .take(MAX_ROWS)
        .map(|r| bag::can_craft(&inv, &bag, r))
        .collect()
}

/// Craft recipe `idx` (within the current station's filtered list) for the
/// bound player. Returns true if a timed craft was started.
fn craft_row(idx: usize) -> bool {
    let player = S.with(|c| c.borrow().player.clone());
    let Some(player) = player else { return false };
    let recipes = cur_recipes();
    let Some(recipe) = recipes.get(idx) else { return false };
    start_craft(&player, recipe)
}

/// Begin a timed craft: RESERVE the recipe's inputs immediately (they leave
/// the inventory the moment you click), then deliver the output when the
/// timer finishes (`tick_craft`). If a craft is already running, the recipe
/// joins the queue - but its inputs are still taken NOW, so the queue is a
/// real reservation: you can't queue more than you can pay for, and a
/// queued entry always runs (its inputs are already set aside). Cancel a
/// queued entry with [`cancel_queued`] to get its inputs back.
/// Returns true if the craft started or was queued.
pub fn start_craft(player: &PlayerHandle, r: &Recipe) -> bool {
    /* Reject a full queue before touching inputs so nothing is consumed
     * on a click that can't be honoured. */
    let will_queue = player.borrow().crafting.is_some();
    if will_queue && S.with(|c| c.borrow().queue.len() >= QUEUE_MAX) {
        return false;
    }
    let mut p = player.borrow_mut();
    let p = &mut *p;
    /* Reserve inputs up front whether this starts now or waits in the
     * queue - the whole point of the reservation model. */
    if !bag::consume_inputs(&mut p.inventory, &mut p.bag, r) {
        return false;
    }
    if will_queue {
        S.with(|c| c.borrow_mut().queue.push(r.clone()));
        return true;
    }
    p.crafting = Some(ActiveCraft {
        output: r.output.item,
        count: r.output.count,
        total_s: r.time_s.max(0.01),
        elapsed_s: 0.0,
    });
    true
}

/// Advance the player's in-progress craft; deposit the output into the bag
/// when it finishes, then pull the next queued recipe. Called every frame
/// from app (so a craft keeps running even after the panel is closed -
/// groundwork for automated crafters).
pub fn tick_craft(player: &PlayerHandle, dt: f32) {
    {
        let mut p = player.borrow_mut();
        if let Some(mut ac) = p.crafting {
            ac.elapsed_s += dt;
            if ac.elapsed_s < ac.total_s {
                p.crafting = Some(ac);
                return;
            }
            let (item, count) = (ac.output, ac.count);
            p.crafting = None;
            /* Finished craft lands on the HOTBAR first, then the bag - the
             * same hotbar-first routing pickups use (bag::give). */
            let pc = &mut *p;
            bag::give(&mut pc.inventory, &mut pc.bag, item, count);
        }
    }
    /* Idle: start the next queued recipe. Its inputs were RESERVED when it
     * was queued (start_craft), so there's nothing to pay here - it always
     * runs. */
    if player.borrow().crafting.is_none() {
        let next = S.with(|c| {
            let s = &mut *c.borrow_mut();
            if s.queue.is_empty() {
                None
            } else {
                Some(s.queue.remove(0))
            }
        });
        if let Some(r) = next {
            player.borrow_mut().crafting = Some(ActiveCraft {
                output: r.output.item,
                count: r.output.count,
                total_s: r.time_s.max(0.01),
                elapsed_s: 0.0,
            });
        }
    }
}

/// Cancel the queued recipe at `idx` (0 = next up) and REFUND its reserved
/// inputs to the bag. Does not touch the active craft. No-op if `idx` is out
/// of range. This is the click-a-queued-item-to-cancel path.
pub fn cancel_queued(player: &PlayerHandle, idx: usize) {
    let removed = S.with(|c| {
        let s = &mut *c.borrow_mut();
        if idx < s.queue.len() {
            Some(s.queue.remove(idx))
        } else {
            None
        }
    });
    if let Some(r) = removed {
        let mut p = player.borrow_mut();
        for inp in &r.inputs {
            /* Reserved inputs come back to the bag (crafting's home stack);
             * the player can re-slot them to the hotbar as needed. */
            p.bag.add(inp.item, inp.count);
        }
    }
}

/// Drop every queued recipe (does NOT refund - used on world / session
/// switches where the whole session is being torn down). The queue is
/// transient intent, never persisted. (The ACTIVE craft lives on
/// PlayerCtrl; the mode-priming path clears that separately.)
pub fn clear_queue() {
    S.with(|c| c.borrow_mut().queue.clear());
}

/// Fixed-size "Crafting" status box drawn ABOVE the recipe list: always
/// present, so a craft starting / finishing never reflows the recipes
/// under it. Shows the active craft's icon + progress bar and the
/// queued outputs; reads "idle" when nothing is running.
fn craft_progress_box(ui: &mut egui::Ui, player: &PlayerHandle) {
    let ac = player.borrow().crafting;
    let queued: Vec<(u16, u16)> = S.with(|c| {
        c.borrow().queue.iter().map(|r| (r.output.item, r.output.count)).collect()
    });
    let (rect, _) = ui.allocate_exact_size(egui::vec2(RECIPE_W, 36.0), egui::Sense::hover());
    let p = ui.painter();
    p.rect_filled(rect, 4.0, egui::Color32::from_rgb(0x14, 0x16, 0x1c));
    p.rect_stroke(
        rect,
        4.0,
        egui::Stroke::new(1.0, egui::Color32::from_rgb(0x30, 0x34, 0x40)),
        egui::StrokeKind::Inside,
    );
    let cy = rect.center().y;
    p.text(
        egui::pos2(rect.min.x + 10.0, cy),
        egui::Align2::LEFT_CENTER,
        "Crafting",
        egui::FontId::proportional(12.0),
        egui::Color32::from_rgb(0xa0, 0xa8, 0xc0),
    );
    let mut cancel_idx: Option<usize> = None;
    match ac {
        Some(ac) => {
            let frac = (ac.elapsed_s / ac.total_s).clamp(0.0, 1.0);
            let ix = rect.min.x + 76.0;
            draw_icon(
                p,
                ac.output,
                ac.count,
                egui::Rect::from_center_size(egui::pos2(ix + 12.0, cy), egui::vec2(24.0, 24.0)),
            );
            let bar = egui::Rect::from_min_max(
                egui::pos2(ix + 32.0, cy - 8.0),
                egui::pos2(ix + 182.0, cy + 8.0),
            );
            p.rect_filled(bar, 3.0, egui::Color32::from_rgb(0x1a, 0x1d, 0x24));
            let mut fill = bar;
            fill.set_width(bar.width() * frac);
            p.rect_filled(fill, 3.0, egui::Color32::from_rgb(0xd8, 0x9a, 0x38));
            p.text(
                bar.center(),
                egui::Align2::CENTER_CENTER,
                format!("{}%", (frac * 100.0) as i32),
                egui::FontId::proportional(11.0),
                egui::Color32::WHITE,
            );
            /* Queued outputs, small icons trailing the bar. Each is
             * clickable: click a queued item to cancel it and refund its
             * reserved inputs. */
            let mut qx = bar.max.x + 10.0;
            for (qi, (item, count)) in queued.iter().enumerate() {
                if qx + 18.0 > rect.max.x - 6.0 {
                    break;
                }
                let icon =
                    egui::Rect::from_center_size(egui::pos2(qx + 9.0, cy), egui::vec2(18.0, 18.0));
                draw_icon(p, *item, *count, icon);
                let hit = ui
                    .interact(
                        icon.expand(2.0),
                        ui.id().with(("cancel-queued", qi)),
                        egui::Sense::click(),
                    )
                    .on_hover_text("click to cancel - refunds inputs");
                if hit.hovered() {
                    p.rect_stroke(
                        icon.expand(1.0),
                        2.0,
                        egui::Stroke::new(1.5, egui::Color32::from_rgb(0xe0, 0x50, 0x50)),
                        egui::StrokeKind::Outside,
                    );
                }
                if hit.clicked() {
                    cancel_idx = Some(qi);
                }
                qx += 22.0;
            }
        }
        None => {
            p.text(
                egui::pos2(rect.min.x + 76.0, cy),
                egui::Align2::LEFT_CENTER,
                "idle",
                egui::FontId::proportional(11.0),
                egui::Color32::from_rgb(0x60, 0x66, 0x74),
            );
        }
    }
    if let Some(qi) = cancel_idx {
        cancel_queued(player, qi);
    }
    ui.add_space(6.0);
}


/// Intercept toggle / nav / craft / close input. Returns true if consumed.
pub fn handle_event(e: &sapp::Event, player: Option<PlayerHandle>) -> bool {
    S.with(|c| c.borrow_mut().player = player);

    /* Mouse / touch interaction belongs to egui now (see egui_ui); only
     * the B / Esc toggle + keyboard nav stay on the sokol key path. */
    if e._type != sapp::EventType::KeyDown {
        return false;
    }
    /* Open / close on the OpenCrafting action (default B), routed through the
     * remappable binding layer rather than a hard-coded key. */
    if crate::controls::action_for_key(e.key_code) == Some(crate::controls::Action::OpenCrafting) {
        let now_open = S.with(|c| {
            let s = &mut *c.borrow_mut();
            s.open = !s.open;
            s.open
        });
        if now_open {
            /* Mutually exclusive with every other panel - only one survival
             * panel up at a time so their inputs and sdtx text never
             * overlap. */
            crate::screens::take_focus(crate::screens::Screen::Crafting);
        } else {
            crate::screens::grab_pointer();
        }
        return true;
    }
    match e.key_code {
        sapp::Keycode::Escape => {
            if is_open() {
                S.with(|c| c.borrow_mut().open = false);
                return true;
            }
            false
        }
        sapp::Keycode::Up => {
            if !is_open() {
                return false;
            }
            S.with(|c| {
                let s = &mut *c.borrow_mut();
                if s.selected > 0 {
                    s.selected -= 1;
                }
            });
            true
        }
        sapp::Keycode::Down => {
            if !is_open() {
                return false;
            }
            let n = row_count() as i32;
            S.with(|c| {
                let s = &mut *c.borrow_mut();
                if s.selected + 1 < n {
                    s.selected += 1;
                }
            });
            true
        }
        sapp::Keycode::Enter | sapp::Keycode::Space => {
            if !is_open() {
                return false;
            }
            let idx = S.with(|c| c.borrow().selected) as usize;
            craft_row(idx);
            true
        }
        _ => false,
    }
}


/// The craft / smelt panel renders via egui now (see `egui_ui`); the old
/// sokol_gl panel is gone. Kept as a no-op so the frame's sgl pass call
/// site stays valid until that call is removed.
pub fn draw() {}

const RECIPE_W: f32 = 412.0;
const RECIPE_H: f32 = 40.0;
const RECIPE_ICON: f32 = 32.0;

/// Draw an item icon (from the UI icon atlas) into `rect`, with a
/// stack-count badge. Shared look with the chest grid.
fn draw_icon(p: &egui::Painter, item: u16, count: u16, rect: egui::Rect) {
    match ui_icons::uv(item) {
        Some([u0, v0, u1, v1]) => {
            let uv = egui::Rect::from_min_max(egui::pos2(u0, v0), egui::pos2(u1, v1));
            p.image(egui_layer::ICON_TEX, rect, uv, egui::Color32::WHITE);
        }
        None => {
            p.rect_filled(rect, 2.0, egui::Color32::from_rgb(0x80, 0x80, 0x88));
        }
    }
    if count > 1 {
        p.text(
            rect.max,
            egui::Align2::RIGHT_BOTTOM,
            count.to_string(),
            egui::FontId::proportional(12.0),
            egui::Color32::WHITE,
        );
    }
}

/// Hover tooltip for a recipe row: the recipe in words ("3 Stick +
/// 1 Coal -> 4 Torch, 2s") so the icons never need guessing.
fn recipe_tooltip(r: &Recipe) -> String {
    let name = |s: &tenebris_core::items::ItemStack| {
        let n = items::display_name(s.item).unwrap_or_else(|| "?".to_string());
        if s.count > 1 {
            format!("{} {}", s.count, n)
        } else {
            n
        }
    };
    let ins: Vec<String> = r.inputs.iter().map(name).collect();
    format!("{} -> {}  ({:.0}s)", ins.join(" + "), name(&r.output), r.time_s)
}

/// One clickable recipe row: the input icons on the left, then an
/// arrow, and the RESULT icon pinned to the right edge of the row.
/// A craftable row is lit with a green border; a non-affordable one
/// stays dim. Returns the row's click response.
fn recipe_row(ui: &mut egui::Ui, r: &Recipe, ready: bool) -> egui::Response {
    let (rect, resp) =
        ui.allocate_exact_size(egui::vec2(RECIPE_W, RECIPE_H), egui::Sense::click());
    let resp = resp.on_hover_text(recipe_tooltip(r));
    let bg = match (ready, resp.hovered()) {
        (true, true) => egui::Color32::from_rgb(0x26, 0x3c, 0x2a),
        (true, false) => egui::Color32::from_rgb(0x1d, 0x2e, 0x20),
        (false, true) => egui::Color32::from_rgb(0x2c, 0x2e, 0x36),
        (false, false) => egui::Color32::from_rgb(0x20, 0x22, 0x29),
    };
    let p = ui.painter();
    p.rect_filled(rect, 4.0, bg);
    if ready {
        p.rect_stroke(
            rect,
            4.0,
            egui::Stroke::new(1.5, egui::Color32::from_rgb(0x5a, 0xc8, 0x6e)),
            egui::StrokeKind::Inside,
        );
    }
    let cy = rect.center().y;
    let cell = egui::vec2(RECIPE_ICON, RECIPE_ICON);
    /* Inputs, left-aligned. */
    let mut x = rect.min.x + 8.0;
    for inp in &r.inputs {
        draw_icon(
            p,
            inp.item,
            inp.count,
            egui::Rect::from_center_size(egui::pos2(x + RECIPE_ICON * 0.5, cy), cell),
        );
        x += RECIPE_ICON + 6.0;
    }
    /* Result on the right: arrow, then the output icon at the edge. */
    let ox = rect.max.x - 8.0 - RECIPE_ICON;
    p.text(
        egui::pos2(ox - 10.0, cy),
        egui::Align2::RIGHT_CENTER,
        "->",
        egui::FontId::proportional(16.0),
        egui::Color32::from_rgb(0xc0, 0xc6, 0xd2),
    );
    draw_icon(
        p,
        r.output.item,
        r.output.count,
        egui::Rect::from_min_size(egui::pos2(ox, cy - RECIPE_ICON * 0.5), cell),
    );
    resp
}

/// Draw the craft / smelt panel in egui. Each recipe is a clickable row
/// (see `recipe_row`). Per the CLAUDE.md rule, recipes are shown as item
/// thumbnails, not text.
pub fn egui_ui(ctx: &egui::Context) {
    if !is_open() {
        return;
    }
    let recipes = cur_recipes();
    let flags = affordable_flags();
    let furnace = items::from_block(tenebris_core::blocks::Block::Furnace);
    let title = if cur_station() == Some(furnace) {
        "Smelt"
    } else if cur_station().is_some() {
        "Assemble"
    } else {
        "Craft"
    };
    let mut craft_idx: Option<usize> = None;
    let mut do_close = false;
    let player = S.with(|c| c.borrow().player.clone());

    egui::Window::new(title)
        .collapsible(false)
        .resizable(false)
        .anchor(egui::Align2::CENTER_CENTER, egui::Vec2::ZERO)
        .show(ctx, |ui| {
            ui.label(
                egui::RichText::new("Click a recipe to craft - lit rows are ready")
                    .color(egui::Color32::from_rgb(0xa0, 0xa8, 0xc0)),
            );
            ui.add_space(4.0);
            if let Some(player) = &player {
                craft_progress_box(ui, player);
            }
            /* Scrollable so long station rosters ride the mouse wheel
             * (the wheel is swallowed from hotbar cycling while a
             * panel is open - see event_inner). */
            egui::ScrollArea::vertical().max_height(360.0).show(ui, |ui| {
                for (i, r) in recipes.iter().enumerate() {
                    let ready = flags.get(i).copied().unwrap_or(false);
                    let resp = recipe_row(ui, r, ready);
                    /* Only affordable rows are clickable: a click RESERVES
                     * the inputs (starts or queues), so you can never queue
                     * more than you can pay for. */
                    if resp.clicked() && ready {
                        craft_idx = Some(i);
                    }
                    ui.add_space(3.0);
                }
            });
            ui.add_space(4.0);
            if ui.button("Close").clicked() {
                do_close = true;
            }
        });

    if let Some(i) = craft_idx {
        craft_row(i);
    }
    if do_close {
        close();
    }
}

/// Render the hand-craft recipe list into an EXISTING egui panel (no own
/// window) and apply a click this frame. Lets the inventory overlay host
/// crafting inline without a second, mutually-exclusive window. Station is
/// the hand bench (None); crafts operate directly on `player`.
pub fn hand_craft_panel(ui: &mut egui::Ui, player: &PlayerHandle) {
    let recipes = crafting::recipes_for_station(None);
    let flags: Vec<bool> = {
        let p = player.borrow();
        recipes.iter().map(|r| bag::can_craft(&p.inventory, &p.bag, r)).collect()
    };
    let mut craft_idx: Option<usize> = None;

    ui.label(
        egui::RichText::new("Click a recipe to craft - lit rows are ready")
            .color(egui::Color32::from_rgb(0xa0, 0xa8, 0xc0)),
    );
    ui.add_space(4.0);
    craft_progress_box(ui, player);
    egui::ScrollArea::vertical().max_height(360.0).show(ui, |ui| {
        for (i, r) in recipes.iter().enumerate() {
            let ready = flags.get(i).copied().unwrap_or(false);
            let resp = recipe_row(ui, r, ready);
            /* Only affordable rows are clickable - a click reserves inputs. */
            if resp.clicked() && ready {
                craft_idx = Some(i);
            }
            ui.add_space(3.0);
        }
    });

    if let Some(i) = craft_idx {
        start_craft(player, &recipes[i]);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::inventory::{self, InvSlot};
    use sapp::{Event, EventType, Keycode};
    use tenebris_core::blocks::Block;
    use tenebris_core::crafting::parse_recipes;
    use tenebris_core::items::PLANK;

    const SRC: &str = "\
[planks]
out: plank 4
in: log 1
[sticks]
out: stick 4
in: plank 2
";

    fn key(t: EventType, k: Keycode) -> Event {
        let mut e = Event { _type: t, ..Default::default() };
        e.key_code = k;
        e
    }

    fn player_with_logs(n: i32) -> PlayerHandle {
        let mut pc = PlayerCtrl::default();
        inventory::init_empty(&mut pc.inventory);
        pc.inventory.slots[1] = InvSlot::block(Block::Wood, n);
        Rc::new(RefCell::new(pc))
    }

    fn setup() {
        init();
        /* Open-crafting resolves through the binding layer (default B); reset
         * to defaults so a controls test that rebound B on this pooled thread
         * can't bleed in. */
        crate::controls::reset_to_defaults();
        crafting::set_recipes(parse_recipes(SRC, "t"));
    }

    #[test]
    fn b_key_toggles_open_and_close() {
        setup();
        assert!(!is_open());
        assert!(handle_event(&key(EventType::KeyDown, Keycode::B), None));
        assert!(is_open());
        assert!(handle_event(&key(EventType::KeyDown, Keycode::Escape), None));
        assert!(!is_open());
    }

    #[test]
    fn enter_starts_a_timed_craft() {
        setup();
        let p = player_with_logs(3);
        handle_event(&key(EventType::KeyDown, Keycode::B), Some(p.clone()));
        // row 0 = planks; Enter STARTS the craft: inputs consumed now,
        // output pending until the timer finishes.
        assert!(handle_event(&key(EventType::KeyDown, Keycode::Enter), Some(p.clone())));
        assert_eq!(p.borrow().inventory.slots[1].count, 2, "one log spent up front");
        assert_eq!(p.borrow().bag.count_of(PLANK), 0, "output not delivered yet");
        assert!(p.borrow().crafting.is_some(), "a craft is running");
        // Tick past the craft time -> the planks land in the bag.
        tick_craft(&p, 999.0);
        {
            /* Output lands hotbar-first now, so assert the TOTAL on hand. */
            let pb = p.borrow();
            assert_eq!(bag::available(&pb.inventory, &pb.bag, PLANK), 4);
        }
        assert!(p.borrow().crafting.is_none());
    }

    #[test]
    fn craft_row_starts_then_tick_completes() {
        // egui owns clicks now; a row click calls craft_row(idx). Pin the
        // start-then-finish path (the row->recipe mapping + timed bridge).
        setup();
        let p = player_with_logs(1);
        set_player(Some(p.clone()));
        assert!(craft_row(0)); // row 0 = planks -> starts the craft
        assert_eq!(p.borrow().bag.count_of(PLANK), 0, "not instant");
        // A second click with the only log already reserved can't pay its
        // inputs UP FRONT -> rejected (the queue is a real reservation).
        assert!(!craft_row(0));
        tick_craft(&p, 999.0);
        {
            /* Output lands hotbar-first now, so assert the TOTAL on hand. */
            let pb = p.borrow();
            assert_eq!(bag::available(&pb.inventory, &pb.bag, PLANK), 4);
        }
        assert!(p.borrow().crafting.is_none());
    }

    #[test]
    fn queue_reserves_inputs_up_front_and_cancel_refunds() {
        setup();
        let log = tenebris_core::items::from_block(Block::Wood);
        let p = player_with_logs(3);
        set_player(Some(p.clone()));
        // Start one + queue two: all three logs are reserved immediately.
        assert!(craft_row(0), "starts (reserves log 1)");
        assert!(craft_row(0), "queues (reserves log 2)");
        assert!(craft_row(0), "queues (reserves log 3)");
        assert_eq!(p.borrow().inventory.slots[1].count, 0, "all 3 logs reserved on click");
        // A 4th can't be paid for -> rejected, nothing consumed.
        assert!(!craft_row(0), "cannot queue past your resources");
        // Cancel the first queued entry -> its reserved log comes back.
        cancel_queued(&p, 0);
        assert_eq!(p.borrow().bag.count_of(log), 1, "cancelled craft refunds its input");
        // One craft active + one still queued; run them out.
        tick_craft(&p, 999.0); // active finishes (4 planks), queued starts
        {
            /* Output lands hotbar-first now, so assert the TOTAL on hand. */
            let pb = p.borrow();
            assert_eq!(bag::available(&pb.inventory, &pb.bag, PLANK), 4);
        }
        assert!(p.borrow().crafting.is_some(), "the surviving queued craft runs");
        tick_craft(&p, 999.0);
        {
            let pb = p.borrow();
            assert_eq!(bag::available(&pb.inventory, &pb.bag, PLANK), 8);
        }
        assert!(p.borrow().crafting.is_none());
        clear_queue();
    }

    #[test]
    fn queued_crafts_run_back_to_back() {
        setup();
        let p = player_with_logs(2);
        set_player(Some(p.clone()));
        assert!(craft_row(0)); // starts (consumes log 1)
        assert!(craft_row(0)); // queues
        // First finishes; the queued one starts immediately, paying its
        // inputs at its turn (consumes log 2).
        tick_craft(&p, 999.0);
        {
            /* Output lands hotbar-first now, so assert the TOTAL on hand. */
            let pb = p.borrow();
            assert_eq!(bag::available(&pb.inventory, &pb.bag, PLANK), 4);
        }
        assert!(p.borrow().crafting.is_some(), "queued craft now running");
        assert_eq!(p.borrow().inventory.slots[1].count, 0, "second log spent");
        tick_craft(&p, 999.0);
        {
            let pb = p.borrow();
            assert_eq!(bag::available(&pb.inventory, &pb.bag, PLANK), 8);
        }
        assert!(p.borrow().crafting.is_none());
        // Queue is transient: nothing left behind.
        clear_queue();
    }

    #[test]
    fn affordable_flags_track_inventory() {
        setup();
        let p = player_with_logs(0); // no logs
        set_player(Some(p.clone()));
        let flags = affordable_flags();
        assert_eq!(flags.len(), 2);
        assert!(!flags[0], "planks not affordable without logs");

        let p2 = player_with_logs(1);
        set_player(Some(p2));
        assert!(affordable_flags()[0], "planks affordable with a log");
    }

    #[test]
    fn craft_state_round_trips_through_persistence() {
        // The active craft's progress AND the waiting queue must survive a
        // save/load so a background craft resumes on reload instead of
        // vanishing (the user's "same with crafting progress and queue").
        setup();
        let p = player_with_logs(3);
        set_player(Some(p.clone()));
        assert!(craft_row(0), "starts planks (active)");
        assert!(craft_row(0), "queues planks #2");
        assert!(craft_row(0), "queues planks #3");
        // Advance the active craft partway so elapsed is non-zero.
        tick_craft(&p, 0.4);
        let active_before = p.borrow().crafting.expect("a craft is active");
        let queue_before = queue_outputs();
        assert_eq!(queue_before.len(), 2, "two queued behind the active one");

        let blob = serialize_state(&p.borrow());
        // Wipe the live state, then restore from the blob (simulates a reload).
        {
            let mut pb = p.borrow_mut();
            pb.crafting = None;
            clear_queue();
            restore_state(&mut pb, &blob);
        }

        let active_after = p.borrow().crafting.expect("active craft restored");
        assert_eq!(active_after.output, active_before.output);
        assert_eq!(active_after.count, active_before.count);
        assert_eq!(active_after.total_s, active_before.total_s);
        assert_eq!(active_after.elapsed_s, active_before.elapsed_s, "progress kept");
        assert_eq!(queue_outputs(), queue_before, "queue restored in order");
        clear_queue();
    }

    #[test]
    fn empty_craft_state_round_trips_to_nothing() {
        setup();
        let p = player_with_logs(0);
        set_player(Some(p.clone()));
        let blob = serialize_state(&p.borrow());
        {
            let mut pb = p.borrow_mut();
            restore_state(&mut pb, &blob);
        }
        assert!(p.borrow().crafting.is_none(), "no active craft restored");
        assert!(queue_outputs().is_empty(), "no queue restored");
        clear_queue();
    }
}
