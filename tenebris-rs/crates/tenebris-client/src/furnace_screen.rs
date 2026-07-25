//! Furnace UI (egui) - a Minecraft-style smelter.
//!
//! Port of the JS `FurnaceUI`: an input slot + a smelt-progress arrow + an
//! output slot in a row, with a fuel (coal) slot and a fuel bar below.
//! Click a bag stack to load it (ore -> input, coal -> fuel); click a
//! furnace slot to pull its contents back to the bag. An "auto-load"
//! dropdown fills the input from a smeltable stack you hold.
//!
//! The furnace state lives in the core block-entity store and smelts over
//! time on the machine tick; this screen only moves items in/out (and
//! persists those moves same-frame).

use std::cell::RefCell;
use std::rc::Rc;

use sokol::app as sapp;

use crate::bag;
use crate::inventory::{InvSlot, INV_HOTBAR_SLOTS};
use crate::persistence;
use crate::player_ctrl::PlayerCtrl;
use crate::slot_dnd;
use crate::ui_icons;
use tenebris_core::block_entity::{self, FUEL_PER_COAL};
use tenebris_core::items::{self, ItemStack};
use tenebris_core::world::World;

pub type PlayerHandle = Rc<RefCell<PlayerCtrl>>;
pub type WorldHandle = Rc<RefCell<World>>;

struct FurnaceScreen {
    open: bool,
    tile: i32,
    depth: i32,
    world: Option<WorldHandle>,
    player: Option<PlayerHandle>,
}

thread_local! {
    static S: RefCell<FurnaceScreen> = RefCell::new(FurnaceScreen {
        open: false,
        tile: -1,
        depth: -1,
        world: None,
        player: None,
    });
}

pub fn is_open() -> bool {
    S.with(|c| c.borrow().open)
}

pub fn close() {
    S.with(|c| c.borrow_mut().open = false);
}

/// Open the furnace panel for the placed furnace at (tile, depth).
pub fn open(world: WorldHandle, player: PlayerHandle, tile: i32, depth: i32) {
    S.with(|c| {
        let s = &mut *c.borrow_mut();
        s.open = true;
        s.tile = tile;
        s.depth = depth;
        s.world = Some(world);
        s.player = Some(player);
    });
    crate::screens::take_focus(crate::screens::Screen::Furnace);
}

/// Esc closes the furnace. Returns true if consumed.
pub fn handle_event(e: &sapp::Event) -> bool {
    if !is_open() {
        return false;
    }
    if e._type == sapp::EventType::KeyDown && e.key_code == sapp::Keycode::Escape {
        close();
        crate::screens::grab_pointer();
        return true;
    }
    false
}

fn persist(w: &World) {
    if crate::menu::state() != crate::menu::GameState::InGameSp {
        return;
    }
    let name = crate::menu::active_world();
    if name.is_empty() {
        return;
    }
    persistence::save_block_entities(&name, w.body.id as u32, &w.block_entities);
}

/// A draggable slot: the player's inventory (hotbar / bag - ONE inventory in
/// two stores) or a furnace slot. egui keys drag payloads by TYPE, so this
/// enum can't be dropped onto another panel's slots (see slot_dnd).
#[derive(Clone, Copy, PartialEq, Eq)]
enum Addr {
    Hot(usize),
    Bag(usize),
    Input,
    Fuel,
    Output,
}

impl Addr {
    fn is_inv(self) -> bool {
        matches!(self, Addr::Hot(_) | Addr::Bag(_))
    }
    fn is_furnace(self) -> bool {
        matches!(self, Addr::Input | Addr::Fuel | Addr::Output)
    }
}

const SLOT: f32 = 52.0;

/// Draw the furnace panel and apply any click this frame.
pub fn egui_ui(ctx: &egui::Context) {
    if !is_open() {
        return;
    }
    let (world, player, tile, depth) = S.with(|c| {
        let s = c.borrow();
        (s.world.clone(), s.player.clone(), s.tile, s.depth)
    });
    let (Some(world), Some(player)) = (world, player) else {
        return;
    };

    let f = {
        let w = world.borrow();
        w.block_entities.get(tile, depth).and_then(|e| e.furnace().copied()).unwrap_or_default()
    };
    /* The hotbar + bag are ONE inventory (the hotbar is the quick-access row) -
     * show BOTH so ore/coal sitting on the hotbar is reachable (pickups land
     * on the hotbar first). See CLAUDE.md "hotbar is ALWAYS part of the
     * inventory". */
    let (hotbar, bag_rows): ([InvSlot; INV_HOTBAR_SLOTS], Vec<(u16, u16, u16)>) = {
        let p = player.borrow();
        let bag = p.bag.slots.iter().map(|s| (s.item, s.count, s.dur)).collect();
        (p.inventory.slots, bag)
    };

    /* One drag-move per frame (slot_dnd::wire) + one click action, applied
     * after the UI pass (the panel holds the borrow during layout). */
    let mut dnd: Option<(Addr, Addr)> = None;
    let mut click: Option<Click> = None;
    let mut do_close = false;

    egui::Window::new("Furnace")
        .collapsible(false)
        .resizable(false)
        .anchor(egui::Align2::CENTER_CENTER, egui::Vec2::ZERO)
        .show(ctx, |ui| {
            /* A furnace slot: draw it, wire drag-and-drop (drop an inventory
             * item here to load it; drag it out to an inventory slot), and
             * click to quick-take it back to the inventory. */
            let mut furnace_slot =
                |ui: &mut egui::Ui, addr: Addr, item: u16, count: u16, accent| {
                    let resp = ui_icons::slot(ui, item, count, 0, SLOT, accent);
                    slot_dnd::wire(&resp, addr, &mut dnd);
                    if resp.clicked() && count > 0 {
                        click = Some(Click::TakeFurnace(addr));
                    }
                };

            // Input -> [progress] -> Output row.
            ui.horizontal(|ui| {
                ui.vertical(|ui| {
                    ui.label(egui::RichText::new("Input").weak());
                    furnace_slot(ui, Addr::Input, f.input.item, f.input.count, None);
                });
                ui.add_space(8.0);
                // Smelt-progress arrow.
                let (rect, _) =
                    ui.allocate_exact_size(egui::vec2(64.0, SLOT), egui::Sense::hover());
                let p = ui.painter();
                let cy = rect.center().y;
                let track = egui::Rect::from_min_max(
                    egui::pos2(rect.min.x, cy - 4.0),
                    egui::pos2(rect.max.x, cy + 4.0),
                );
                p.rect_filled(track, 2.0, egui::Color32::from_rgb(0x20, 0x22, 0x29));
                let fill = egui::Rect::from_min_max(
                    track.min,
                    egui::pos2(track.min.x + track.width() * f.progress.clamp(0.0, 1.0), track.max.y),
                );
                p.rect_filled(fill, 2.0, egui::Color32::from_rgb(0xe0, 0xa0, 0x40));
                p.text(
                    egui::pos2(rect.center().x, rect.min.y + 6.0),
                    egui::Align2::CENTER_TOP,
                    "->",
                    egui::FontId::proportional(15.0),
                    egui::Color32::from_rgb(0xc0, 0xc6, 0xd2),
                );
                ui.add_space(8.0);
                ui.vertical(|ui| {
                    ui.label(egui::RichText::new("Output").weak());
                    furnace_slot(ui, Addr::Output, f.output.item, f.output.count,
                        Some(egui::Color32::from_rgb(0x6e, 0xc0, 0x7a)));
                });
            });
            ui.add_space(8.0);
            // Fuel slot + fuel charge bar.
            ui.horizontal(|ui| {
                ui.vertical(|ui| {
                    ui.label(egui::RichText::new("Fuel (coal)").weak());
                    furnace_slot(ui, Addr::Fuel, f.fuel.item, f.fuel.count,
                        Some(egui::Color32::from_rgb(0xe0, 0x80, 0x40)));
                });
                ui.add_space(8.0);
                ui.vertical(|ui| {
                    ui.add_space(18.0);
                    let frac = f.fuel_remaining as f32 / FUEL_PER_COAL as f32;
                    let (rect, _) =
                        ui.allocate_exact_size(egui::vec2(150.0, 12.0), egui::Sense::hover());
                    let p = ui.painter();
                    p.rect_filled(rect, 2.0, egui::Color32::from_rgb(0x20, 0x22, 0x29));
                    let fill = egui::Rect::from_min_max(
                        rect.min,
                        egui::pos2(rect.min.x + rect.width() * frac.clamp(0.0, 1.0), rect.max.y),
                    );
                    p.rect_filled(fill, 2.0, egui::Color32::from_rgb(0xe0, 0x80, 0x40));
                    ui.label(
                        egui::RichText::new(format!("{} smelts left", f.fuel_remaining))
                            .small()
                            .weak(),
                    );
                });
            });

            ui.separator();
            ui.label(egui::RichText::new(
                "Your items - drag ore onto Input, coal onto Fuel (or click)",
            ).weak());

            /* One inventory slot: click to quick-load (ore->input, coal->fuel),
             * drag to move it anywhere. */
            let mut inv_slot = |ui: &mut egui::Ui, addr: Addr, item: u16, count: u16, dur: u16| {
                let resp = ui_icons::slot(ui, item, count, dur, 40.0, None);
                slot_dnd::wire(&resp, addr, &mut dnd);
                if resp.clicked() && count > 0 {
                    click = Some(Click::LoadFromInv(addr));
                }
            };

            /* Inventory bag rows on TOP, then a divider, then the hotbar row at
             * the BOTTOM - the same layout as the HUD and the main inventory
             * screen (inventory_screen.rs: bag grid, gap, hotbar_row), so the
             * quick-access hotbar sits where the player expects it. Mixing the
             * hotbar into the top of the bag read as confusing. */
            egui::Grid::new("furnace-bag").spacing(egui::vec2(3.0, 3.0)).show(ui, |ui| {
                for (i, &(item, count, dur)) in bag_rows.iter().enumerate() {
                    inv_slot(ui, Addr::Bag(i), item, count, dur);
                    if (i + 1) % 9 == 0 {
                        ui.end_row();
                    }
                }
            });
            ui.add_space(6.0);
            ui.separator(); /* divider between the bag and the hotbar */
            ui.add_space(2.0);
            ui.label(egui::RichText::new("Hotbar").small().weak());
            ui.add_space(2.0);
            egui::Grid::new("furnace-hotbar").spacing(egui::vec2(3.0, 3.0)).show(ui, |ui| {
                for (i, s) in hotbar.iter().enumerate() {
                    inv_slot(ui, Addr::Hot(i), s.item, s.count.clamp(0, u16::MAX as i32) as u16, s.dur);
                }
            });
            ui.add_space(4.0);
            if ui.button("Close").clicked() {
                do_close = true;
            }
        });

    /* Ghost the dragged item's icon at the pointer. */
    slot_dnd::ghost::<Addr>(ctx, "furnace-dnd", |addr| {
        let p = player.borrow();
        match addr {
            Addr::Hot(i) => Some((p.inventory.slots[i].item, p.inventory.slots[i].count.max(0) as u16)),
            Addr::Bag(i) => Some((p.bag.slots[i].item, p.bag.slots[i].count)),
            Addr::Input => Some((f.input.item, f.input.count)),
            Addr::Fuel => Some((f.fuel.item, f.fuel.count)),
            Addr::Output => Some((f.output.item, f.output.count)),
        }
    });

    if let Some((from, to)) = dnd {
        apply_move(&world, &player, tile, depth, from, to);
    }
    if let Some(c) = click {
        apply_click(&world, &player, tile, depth, c);
    }
    if do_close {
        close();
    }
}

/// A click this frame (drag moves are handled separately via slot_dnd).
enum Click {
    /// Clicked an inventory slot: load it into input (ore) or fuel (coal).
    LoadFromInv(Addr),
    /// Clicked a furnace slot: pull it back to the inventory (hotbar first).
    TakeFurnace(Addr),
}

/* ---- Inventory (hotbar + bag) slot get/set: the hotbar and bag are ONE
 * inventory, so these route to the right store by address. ---- */
fn inv_get(p: &PlayerCtrl, a: Addr) -> (u16, i32, u16) {
    match a {
        Addr::Hot(i) => (p.inventory.slots[i].item, p.inventory.slots[i].count, p.inventory.slots[i].dur),
        Addr::Bag(i) => (p.bag.slots[i].item, p.bag.slots[i].count as i32, p.bag.slots[i].dur),
        _ => (0, 0, 0),
    }
}
fn inv_set(p: &mut PlayerCtrl, a: Addr, item: u16, count: i32, dur: u16) {
    /* An emptied slot drops its wear (a fresh tool must not inherit it). */
    let (item, count, dur) = if count <= 0 { (0, 0, 0) } else { (item, count, dur) };
    match a {
        Addr::Hot(i) => p.inventory.slots[i] = InvSlot { item, count, dur },
        Addr::Bag(i) => {
            p.bag.slots[i] = ItemStack { item, count: count.clamp(0, u16::MAX as i32) as u16, dur }
        }
        _ => {}
    }
}

/// Read a furnace slot by address.
fn furnace_slot_ref<'a>(
    f: &'a mut block_entity::FurnaceState,
    a: Addr,
) -> Option<&'a mut block_entity::ChestSlot> {
    match a {
        Addr::Input => Some(&mut f.input),
        Addr::Fuel => Some(&mut f.fuel),
        Addr::Output => Some(&mut f.output),
        _ => None,
    }
}

/// Apply a drag move `from -> to`, then persist same-frame.
fn apply_move(world: &WorldHandle, player: &PlayerHandle, tile: i32, depth: i32, from: Addr, to: Addr) {
    if from == to {
        return;
    }
    let mut w = world.borrow_mut();
    let mut p = player.borrow_mut();
    if from.is_inv() && to.is_furnace() {
        load_furnace(&mut w, &mut p, tile, depth, from, to);
    } else if from.is_furnace() && to.is_inv() {
        take_to_inv(&mut w, &mut p, tile, depth, from, to);
    } else if from.is_inv() && to.is_inv() {
        inv_swap(&mut p, from, to);
    }
    /* furnace<->furnace drags (e.g. Input->Output) are meaningless: ignored. */
    persist(&w);
}

/// Apply a click (quick-load / quick-take), then persist.
fn apply_click(world: &WorldHandle, player: &PlayerHandle, tile: i32, depth: i32, c: Click) {
    let mut w = world.borrow_mut();
    let mut p = player.borrow_mut();
    match c {
        Click::LoadFromInv(src) => {
            /* Route by content: ore -> input, coal -> fuel. */
            let (item, _, _) = inv_get(&p, src);
            let to = if items::smelt_output(item).is_some() {
                Addr::Input
            } else if items::is_fuel(item) {
                Addr::Fuel
            } else {
                return;
            };
            load_furnace(&mut w, &mut p, tile, depth, src, to);
        }
        Click::TakeFurnace(fslot) => {
            let f = w.block_entities.entry(tile, depth).furnace_mut();
            let Some(slot) = furnace_slot_ref(f, fslot) else { return };
            if slot.count == 0 {
                return;
            }
            let (item, count) = (slot.item, slot.count);
            /* Deposit fills the HOTBAR first, then the bag (bag::give).
             * Reborrow through &mut *p so the two fields borrow disjointly. */
            let pc = &mut *p;
            let leftover = bag::give(&mut pc.inventory, &mut pc.bag, item, count);
            let f = w.block_entities.entry(tile, depth).furnace_mut();
            let slot = furnace_slot_ref(f, fslot).unwrap();
            if leftover == 0 {
                *slot = block_entity::ChestSlot::default();
            } else {
                slot.count = leftover;
            }
        }
    }
    persist(&w);
}

/// Move an inventory slot's contents into a furnace input/fuel slot, if the
/// item is valid for that slot (ore for input, fuel for fuel) and it fits.
fn load_furnace(w: &mut World, p: &mut PlayerCtrl, tile: i32, depth: i32, src: Addr, target: Addr) {
    let (item, count, _dur) = inv_get(p, src);
    if count <= 0 {
        return;
    }
    let valid = match target {
        Addr::Input => items::smelt_output(item).is_some(),
        Addr::Fuel => items::is_fuel(item),
        _ => false,
    };
    if !valid {
        return;
    }
    let f = w.block_entities.entry(tile, depth).furnace_mut();
    let Some(slot) = furnace_slot_ref(f, target) else { return };
    if slot.count > 0 && slot.item != item {
        return; /* slot busy with a different item */
    }
    let cap = items::stack_size(item);
    let room = cap.saturating_sub(slot.count);
    let take = (count.clamp(0, u16::MAX as i32) as u16).min(room);
    if take == 0 {
        return;
    }
    slot.item = item;
    slot.count += take;
    inv_set(p, src, item, count - take as i32, _dur);
}

/// Move a furnace slot's contents into a specific inventory slot (drag a
/// furnace slot onto a bag/hotbar cell). Merges same-item stacks; won't
/// overwrite a different item.
fn take_to_inv(w: &mut World, p: &mut PlayerCtrl, tile: i32, depth: i32, fslot: Addr, dst: Addr) {
    let f = w.block_entities.entry(tile, depth).furnace_mut();
    let Some(slot) = furnace_slot_ref(f, fslot) else { return };
    if slot.count == 0 {
        return;
    }
    let (fit, fcount) = (slot.item, slot.count);
    let (di, dc, dd) = inv_get(p, dst);
    if dc <= 0 {
        inv_set(p, dst, fit, fcount as i32, 0);
        let slot = furnace_slot_ref(w.block_entities.entry(tile, depth).furnace_mut(), fslot).unwrap();
        *slot = block_entity::ChestSlot::default();
    } else if di == fit {
        let cap = items::stack_size(fit);
        let room = cap.saturating_sub(dc.clamp(0, u16::MAX as i32) as u16);
        let take = fcount.min(room);
        if take == 0 {
            return;
        }
        inv_set(p, dst, di, dc + take as i32, dd);
        let slot = furnace_slot_ref(w.block_entities.entry(tile, depth).furnace_mut(), fslot).unwrap();
        slot.count -= take;
        if slot.count == 0 {
            *slot = block_entity::ChestSlot::default();
        }
    }
    /* dst holds a different item: leave both as-is (no destructive swap). */
}

/// Swap (or merge same-item) two inventory slots - lets you tidy the hotbar +
/// bag from inside the furnace panel.
fn inv_swap(p: &mut PlayerCtrl, from: Addr, to: Addr) {
    let (fi, fc, fd) = inv_get(p, from);
    let (ti, tc, td) = inv_get(p, to);
    if fc <= 0 {
        return;
    }
    if fi == ti && tc > 0 && items::stack_size(fi) > 1 {
        inv_set(p, to, ti, tc + fc, td);
        inv_set(p, from, 0, 0, 0);
    } else {
        inv_set(p, to, fi, fc, fd);
        inv_set(p, from, ti, tc, td);
    }
}
