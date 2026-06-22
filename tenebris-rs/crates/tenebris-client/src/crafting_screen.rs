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
use crate::player_ctrl::PlayerCtrl;
use std::rc::Rc;
use tenebris_core::crafting::{self, Recipe};
use tenebris_core::items;

pub type PlayerHandle = Rc<RefCell<PlayerCtrl>>;

/// Hard cap on rows drawn (no scroll yet; Tier 0 has a handful).
const MAX_ROWS: usize = 16;

#[derive(Clone, Debug, Default)]
struct Screen {
    open: bool,
    selected: i32,
    player: Option<PlayerHandle>,
    /// Which recipes this surface offers: `None` = the hand bench (`B`),
    /// `Some(block_item_id)` = a placed station (furnace, ...). Only
    /// recipes whose `station` matches are listed / craftable.
    station: Option<items::ItemId>,
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
    crate::inventory_screen::close();
    crate::rocket_screen::close();
    release_pointer();
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

/// Free the pointer + show the cursor when the screen opens so rows are
/// clickable (gameplay keeps the mouse locked for look). On close, the
/// next canvas click re-locks via the normal input path.
#[cfg(not(test))]
fn release_pointer() {
    sapp::lock_mouse(false);
    sapp::show_mouse(true);
}
#[cfg(test)]
fn release_pointer() {}

/// Number of recipe rows that will be drawn.
fn row_count() -> usize {
    cur_recipes().len().min(MAX_ROWS)
}





/// Item display name (ASCII, no underscores - safe for the Oric font).
fn item_name(id: items::ItemId) -> &'static str {
    items::def(id).map(|d| d.name).unwrap_or("?")
}

/// "4 plank   <-   1 log, 0 coal" style summary of a recipe.
fn recipe_label(r: &Recipe) -> String {
    let ins: Vec<String> =
        r.inputs.iter().map(|i| format!("{} {}", i.count, item_name(i.item))).collect();
    format!("{} {}   <-   {}", r.output.count, item_name(r.output.item), ins.join(", "))
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
/// bound player. Returns true if it happened.
fn craft_row(idx: usize) -> bool {
    let player = S.with(|c| c.borrow().player.clone());
    let Some(player) = player else { return false };
    let recipes = cur_recipes();
    let Some(recipe) = recipes.get(idx) else { return false };
    let mut p = player.borrow_mut();
    let p = &mut *p;
    bag::try_craft(&mut p.inventory, &mut p.bag, recipe)
    /* NOTE: bag persistence (same-frame save) lands with the SP/MP bag
     * sync wave - the hotbar follows the existing inventory path. */
}


/// Intercept toggle / nav / craft / close input. Returns true if consumed.
pub fn handle_event(e: &sapp::Event, player: Option<PlayerHandle>) -> bool {
    S.with(|c| c.borrow_mut().player = player);

    /* Mouse / touch interaction belongs to egui now (see egui_ui); only
     * the B / Esc toggle + keyboard nav stay on the sokol key path. */
    if e._type != sapp::EventType::KeyDown {
        return false;
    }
    match e.key_code {
        sapp::Keycode::B => {
            let now_open = S.with(|c| {
                let s = &mut *c.borrow_mut();
                s.open = !s.open;
                s.open
            });
            if now_open {
                /* Mutually exclusive with the inventory overlay - only
                 * one survival panel up at a time so their inputs and
                 * sdtx text never overlap. */
                crate::inventory_screen::close();
                crate::rocket_screen::close();
                release_pointer();
            }
            true
        }
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

/// Footer line: what the player currently holds (bag contents), so it is
/// obvious why a recipe row is ready or not.
fn have_summary() -> String {
    let parts = S.with(|c| {
        c.borrow().player.as_ref().map(|p| {
            let p = p.borrow();
            let mut parts: Vec<String> = Vec::new();
            for s in p.bag.slots.iter() {
                if s.count == 0 || parts.len() >= 8 {
                    continue;
                }
                let name = items::def(s.item).map(|d| d.name).unwrap_or("?");
                parts.push(format!("{} x{}", name, s.count));
            }
            parts
        })
    });
    match parts {
        Some(parts) if !parts.is_empty() => format!("Have: {}", parts.join(", ")),
        _ => "Have: nothing yet - mine wood and ore to gather resources".to_string(),
    }
}

/// Draw the craft / smelt panel in egui when open. Replaces the sokol_gl
/// panel: a centred window of recipe rows (green = craftable), the held
/// resources, and a close button. Clicking a ready row crafts it.
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

    egui::Window::new(title)
        .collapsible(false)
        .resizable(false)
        .anchor(egui::Align2::CENTER_CENTER, egui::Vec2::ZERO)
        .show(ctx, |ui| {
            ui.label(
                egui::RichText::new("Click a recipe to craft - green = ready")
                    .color(egui::Color32::from_rgb(0xa0, 0xa8, 0xc0)),
            );
            ui.separator();
            for (i, r) in recipes.iter().enumerate() {
                let ready = flags.get(i).copied().unwrap_or(false);
                let color = if ready {
                    egui::Color32::from_rgb(0x66, 0xff, 0x88)
                } else {
                    egui::Color32::from_rgb(0x88, 0x88, 0x90)
                };
                let resp = ui.add_sized(
                    [380.0, 24.0],
                    egui::Button::new(egui::RichText::new(recipe_label(r)).color(color)),
                );
                if resp.clicked() && ready {
                    craft_idx = Some(i);
                }
            }
            ui.separator();
            ui.label(
                egui::RichText::new(have_summary())
                    .color(egui::Color32::from_rgb(0xb0, 0xc0, 0xe0)),
            );
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::inventory::{self, InvSlot};
    use sapp::{Event, EventType, Keycode, Mousebutton};
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
    fn enter_crafts_selected_recipe() {
        setup();
        let p = player_with_logs(3);
        handle_event(&key(EventType::KeyDown, Keycode::B), Some(p.clone()));
        // row 0 = planks; Enter crafts it
        assert!(handle_event(&key(EventType::KeyDown, Keycode::Enter), Some(p.clone())));
        assert_eq!(p.borrow().bag.count_of(PLANK), 4);
        assert_eq!(p.borrow().inventory.slots[1].count, 2); // one log spent
    }

    #[test]
    fn craft_row_crafts_the_recipe() {
        // egui owns clicks now; a row click calls craft_row(idx). Pin that
        // path directly (the row->recipe mapping + the bag bridge).
        setup();
        let p = player_with_logs(1);
        set_player(Some(p.clone()));
        assert!(craft_row(0)); // row 0 = planks
        assert_eq!(p.borrow().bag.count_of(PLANK), 4);
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
}
