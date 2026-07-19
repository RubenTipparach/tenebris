//! UI item-icon atlas keyed by the core `ItemId` (u16) + block ids.
//!
//! Powers the egui inventory / crafting / chest grids: every item and
//! placeable block gets a 32x32 thumbnail. A single horizontal strip
//! texture, built once at boot from per-item PNGs, sampled by the egui
//! layer (bound as a user texture). Separate from the terrain atlas (which
//! the mesher owns).
//!
//! When a new item or block is added it MUST get a row here - per the
//! CLAUDE.md rule that item visuals are a priority and UIs show thumbnails,
//! never text.

use std::cell::Cell;

use sokol::gfx as sg;
use tenebris_core::blocks::Block;
use tenebris_core::items::{self, ItemId};

use crate::renderer::load_png_rgba;

const ICON_PX: i32 = 32;

/// `(item id, icon png)`. Item id is a block's raw byte for placeables or a
/// `core::items` constant for resources. Order defines the atlas column.
const ICONS: &[(u16, &str)] = &[
    // --- terrain / placeable blocks ---
    (Block::Stone as u16, "assets/textures/rocks.png"),
    (Block::Dirt as u16, "assets/textures/dirt.png"),
    (Block::Sand as u16, "assets/textures/sand.png"),
    (Block::Grass as u16, "assets/textures/grass.png"),
    (Block::Snow as u16, "assets/textures/snow.png"),
    (Block::Wood as u16, "assets/textures/wood.png"),
    (Block::Bedrock as u16, "assets/textures/rocks.png"),
    (Block::Torch as u16, "assets/textures/torch.png"),
    (Block::Bonfire as u16, "assets/textures/items/bonfire.png"),
    (Block::Water as u16, "assets/textures/water.png"),
    (Block::Ice as u16, "assets/textures/ice.png"),
    (Block::Glass as u16, "assets/textures/glass.png"),
    (Block::Aquarium as u16, "assets/textures/aquarium.png"),
    /* Leaves have no source PNG (the terrain atlas tints them
     * procedurally); the grass texture is the closest green stand-in. */
    (Block::Leaves as u16, "assets/textures/grass.png"),
    (Block::DirtGrass as u16, "assets/textures/dirt_grass.png"),
    (Block::DirtSnow as u16, "assets/textures/dirt_snow.png"),
    (Block::Farmland as u16, "assets/textures/farmland.png"),
    (Block::CoalOre as u16, "assets/textures/minerals/rocks_coal.png"),
    (Block::CopperOre as u16, "assets/textures/minerals/rocks_copper.png"),
    (Block::TinOre as u16, "assets/textures/minerals/rocks_tin.png"),
    (Block::IronOre as u16, "assets/textures/minerals/rocks_iron.png"),
    // --- tech blocks (the JS _face icon, same the JS uses for the item) ---
    (Block::Furnace as u16, "assets/textures/technology/furnace_face.png"),
    (Block::ElectricFurnace as u16, "assets/textures/technology/electric_furnace_face.png"),
    (Block::Printer3D as u16, "assets/textures/technology/3d_printer_face.png"),
    (Block::Computer as u16, "assets/textures/technology/computer_face.png"),
    (Block::ElectronicsWorkbench as u16, "assets/textures/technology/electronics_workbench_face.png"),
    (Block::HydroGenerator as u16, "assets/textures/technology/hydro_generator_face.png"),
    (Block::SteamEngine as u16, "assets/textures/technology/steam_engine_face.png"),
    (Block::StorageChest as u16, "assets/textures/technology/storage_face.png"),
    (Block::LaunchPad as u16, "assets/textures/technology/launch_pad_face.png"),
    (Block::LaunchTower as u16, "assets/textures/technology/launch_tower_face.png"),
    (Block::Cable as u16, "assets/textures/technology/cable.png"),
    (Block::CopperPipe as u16, "assets/textures/technology/copper_pipe.png"),
    /* Station / casino structure set (tools/gen-casino-textures.py). */
    (Block::StationHull as u16, "assets/textures/technology/station_hull.png"),
    (Block::StationFloor as u16, "assets/textures/technology/station_floor.png"),
    (Block::CasinoCarpet as u16, "assets/textures/technology/casino_carpet.png"),
    (Block::CasinoWall as u16, "assets/textures/technology/casino_wall.png"),
    (Block::NeonTrim as u16, "assets/textures/technology/neon_trim.png"),
    (Block::CasinoSign as u16, "assets/textures/technology/casino_sign.png"),
    (Block::SlotMachine as u16, "assets/textures/technology/slot_machine_face.png"),
    (Block::CardTable as u16, "assets/textures/technology/card_table_face.png"),
    // --- tools (tier-1 heads re-skinned to flint; ids are legacy) ---
    (items::WOOD_PICKAXE, "assets/textures/items/wood_pickaxe.png"),
    (items::WOOD_AXE, "assets/textures/items/wood_axe.png"),
    (items::WOOD_SHOVEL, "assets/textures/items/wood_shovel.png"),
    (items::STONE_PICKAXE, "assets/textures/items/stone_pickaxe.png"),
    (items::IRON_PICKAXE, "assets/textures/items/iron_pickaxe.png"),
    (items::HOE, "assets/textures/items/hoe.png"),
    // --- food ---
    (items::RAW_MEAT, "assets/textures/items/raw_meat.png"),
    (items::COOKED_MEAT, "assets/textures/items/cooked_meat.png"),
    (items::BERRIES, "assets/textures/items/berries.png"),
    (items::BREAD, "assets/textures/items/bread.png"),
    (items::CARROT, "assets/textures/items/carrot.png"),
    (items::FISHING_ROD, "assets/textures/items/fishing_rod.png"),
    (items::RAW_FISH, "assets/textures/items/raw_fish.png"),
    (items::COOKED_FISH, "assets/textures/items/cooked_fish.png"),
    /* Live fish - one icon per catchable / aquarium species. */
    (items::FISH_MINNOW, "assets/textures/items/fish_minnow.png"),
    (items::FISH_REEF, "assets/textures/items/fish_reef.png"),
    (items::FISH_EEL, "assets/textures/items/fish_eel.png"),
    (items::FISH_RAY, "assets/textures/items/fish_ray.png"),
    (items::FISH_TURTLE, "assets/textures/items/fish_turtle.png"),
    (items::FISH_SERPENT, "assets/textures/items/fish_serpent.png"),
    (items::NET, "assets/textures/items/net.png"),
    // --- farming ---
    (items::SEEDS, "assets/textures/items/seeds.png"),
    (items::WHEAT_SEEDS, "assets/textures/items/wheat_seeds.png"),
    (items::WHEAT, "assets/textures/items/wheat.png"),
    (items::APPLE, "assets/textures/items/apple.png"),
    (items::ORANGE, "assets/textures/items/orange.png"),
    (items::WATERMELON, "assets/textures/items/watermelon.png"),
    (items::KIWI, "assets/textures/items/kiwi.png"),
    (items::APPLE_SEEDS, "assets/textures/items/apple_seeds.png"),
    (items::ORANGE_SEEDS, "assets/textures/items/orange_seeds.png"),
    (items::WATERMELON_SEEDS, "assets/textures/items/watermelon_seeds.png"),
    (items::KIWI_SEEDS, "assets/textures/items/kiwi_seeds.png"),
    (items::BUCKET, "assets/textures/items/bucket.png"),
    (items::WATER_BUCKET, "assets/textures/items/water_bucket.png"),
    // --- resource items ---
    (items::PLANK, "assets/textures/wood.png"),
    (items::STICK, "assets/textures/items/sticks.png"),
    (items::COAL, "assets/textures/items/coal.png"),
    (items::FLINT, "assets/textures/items/flint.png"),
    (items::CHARCOAL, "assets/textures/items/charcoal.png"),
    (items::COPPER, "assets/textures/minerals/rocks_copper.png"),
    (items::TIN, "assets/textures/minerals/rocks_tin.png"),
    (items::IRON, "assets/textures/minerals/rocks_iron.png"),
    (items::COPPER_INGOT, "assets/textures/items/ingot_copper.png"),
    (items::TIN_INGOT, "assets/textures/items/ingot_tin.png"),
    (items::IRON_INGOT, "assets/textures/items/ingot_iron.png"),
    (items::BRONZE_INGOT, "assets/textures/items/ingot_bronze.png"),
    (items::ROCKET_ENGINE, "assets/textures/items/rocket_engine.png"),
    (items::VACUUM_ENGINE, "assets/textures/items/vacuum_engine.png"),
    (items::FUEL_TANK, "assets/textures/items/fuel_tank.png"),
    (items::COMMAND_MODULE, "assets/textures/items/command_module.png"),
    (items::WIRE, "assets/textures/technology/cable.png"),
    (items::CIRCUIT_BOARD, "assets/textures/technology/mother_board.png"),
    (items::CPU_CHIP, "assets/textures/technology/micro_chip.png"),
    (items::RAM_MODULE, "assets/textures/technology/ram_module.png"),
    (items::MOTHERBOARD, "assets/textures/technology/mother_board.png"),
    (items::POWER_SUPPLY, "assets/textures/technology/power_supply.png"),
    (items::PRINT_NOZZLE, "assets/textures/technology/print_nozzle.png"),
];

thread_local! {
    static VIEW: Cell<u32> = const { Cell::new(0) };
    static SMP: Cell<u32> = const { Cell::new(0) };
}

/// Column index of `item` in the atlas, or `None` if it has no icon.
fn slot_of(item: ItemId) -> Option<usize> {
    ICONS.iter().position(|(id, _)| *id == item)
}

/// Build the icon strip and upload it. Safe to call once at boot.
pub fn init() {
    let n = ICONS.len() as i32;
    let w = ICON_PX * n;
    let h = ICON_PX;
    let mut pixels = vec![0u8; (w * h * 4) as usize];
    for (col, (_, path)) in ICONS.iter().enumerate() {
        let Some(img) = load_png_rgba(path, false) else {
            println!("[ui_icons] WARNING: {path} missing; slot blank");
            continue;
        };
        // Nearest-resample the source into this 32x32 cell.
        for y in 0..ICON_PX {
            let sy = y * img.h / ICON_PX;
            for x in 0..ICON_PX {
                let sx = x * img.w / ICON_PX;
                let src = ((sy * img.w + sx) * 4) as usize;
                let dst = ((y * w + col as i32 * ICON_PX + x) * 4) as usize;
                pixels[dst..dst + 4].copy_from_slice(&img.rgba[src..src + 4]);
            }
        }
    }
    let mut desc = sg::ImageDesc {
        width: w,
        height: h,
        pixel_format: sg::PixelFormat::Rgba8,
        label: c"ui-icon-atlas".as_ptr(),
        ..Default::default()
    };
    desc.data.mip_levels[0] = sg::slice_as_range(&pixels);
    let img = sg::make_image(&desc);
    let view = sg::make_view(&sg::ViewDesc {
        texture: sg::TextureViewDesc { image: img, ..Default::default() },
        label: c"ui-icon-view".as_ptr(),
        ..Default::default()
    });
    let smp = sg::make_sampler(&sg::SamplerDesc {
        min_filter: sg::Filter::Nearest,
        mag_filter: sg::Filter::Nearest,
        wrap_u: sg::Wrap::ClampToEdge,
        wrap_v: sg::Wrap::ClampToEdge,
        label: c"ui-icon-sampler".as_ptr(),
        ..Default::default()
    });
    VIEW.with(|c| c.set(view.id));
    SMP.with(|c| c.set(smp.id));
    println!("[ui_icons] built icon atlas: {} icons ({}x{})", n, w, h);
}

pub fn view_id() -> u32 {
    VIEW.with(|c| c.get())
}

pub fn sampler_id() -> u32 {
    SMP.with(|c| c.get())
}

/// UV rect `[u0, v0, u1, v1]` of `item`'s icon, or `None` if it has none.
pub fn uv(item: ItemId) -> Option<[f32; 4]> {
    let col = slot_of(item)? as f32;
    let n = ICONS.len() as f32;
    Some([col / n, 0.0, (col + 1.0) / n, 1.0])
}

/// Draw `item`'s thumbnail into `rect` (from the icon atlas) with a
/// stack-count badge. Shared by every grid UI (chest / crafting / furnace
/// / inventory) per the CLAUDE.md thumbnail rule.
pub fn draw_icon(p: &egui::Painter, item: u16, count: u16, rect: egui::Rect) {
    match uv(item) {
        Some([u0, v0, u1, v1]) => {
            let uvr = egui::Rect::from_min_max(egui::pos2(u0, v0), egui::pos2(u1, v1));
            p.image(crate::egui_layer::ICON_TEX, rect, uvr, egui::Color32::WHITE);
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
            egui::FontId::proportional(13.0),
            egui::Color32::WHITE,
        );
    }
}

/// Paint a tool's remaining-uses bar along the bottom of `rect`.
///
/// No-op unless `item` is a tool with a durability budget AND it has taken
/// at least one hit - a pristine tool shows no bar, so an untouched grid
/// looks exactly as it did before durability existed and the bar reads as
/// "this one is wearing out". Green -> red as it runs down.
///
/// `dur` is the slot's raw stored value; `mining::condition` owns the
/// 0-means-fresh decoding and the per-material budget.
pub fn durability_bar(p: &egui::Painter, item: u16, dur: u16, rect: egui::Rect) {
    let Some(frac) = tenebris_core::mining::condition(&tenebris_core::mining::config(), item, dur)
    else {
        return; /* not a tool with a budget */
    };
    if frac >= 1.0 {
        return; /* fresh - no bar */
    }
    let h = (rect.height() * 0.09).clamp(2.0, 4.0);
    let track = egui::Rect::from_min_max(
        egui::pos2(rect.min.x + 2.0, rect.max.y - h - 1.0),
        egui::pos2(rect.max.x - 2.0, rect.max.y - 1.0),
    );
    p.rect_filled(track, 1.0, egui::Color32::from_rgb(0x18, 0x18, 0x1c));
    let fill = egui::Rect::from_min_max(
        track.min,
        egui::pos2(track.min.x + track.width() * frac.clamp(0.0, 1.0), track.max.y),
    );
    /* Hue rides the remaining fraction: green when healthy, red at the end. */
    let r = (255.0 * (1.0 - frac)).clamp(0.0, 255.0) as u8;
    let g = (255.0 * frac).clamp(0.0, 255.0) as u8;
    p.rect_filled(fill, 1.0, egui::Color32::from_rgb(r, g, 0x30));
}

/// A clickable, framed inventory slot showing the item thumbnail + count,
/// plus a durability bar when it holds a worn tool.
///
/// `accent` tints the border (e.g. fuel/output highlight); pass `None` for
/// the default. `dur` is the slot's stored durability - pass 0 from stores
/// that don't track it (chest / furnace / bonfire / power / station slots),
/// which reads as "fresh" and draws no bar. Returns the click Response.
pub fn slot(
    ui: &mut egui::Ui,
    item: u16,
    count: u16,
    dur: u16,
    size: f32,
    accent: Option<egui::Color32>,
) -> egui::Response {
    let (rect, resp) = ui.allocate_exact_size(egui::vec2(size, size), egui::Sense::click());
    let p = ui.painter();
    let bg = if resp.hovered() {
        egui::Color32::from_rgb(0x3a, 0x40, 0x4e)
    } else {
        egui::Color32::from_rgb(0x26, 0x2a, 0x33)
    };
    p.rect_filled(rect, 3.0, bg);
    let border = accent.unwrap_or(egui::Color32::from_rgb(0x4a, 0x50, 0x5e));
    p.rect_stroke(rect, 3.0, egui::Stroke::new(1.0, border), egui::StrokeKind::Inside);
    if count > 0 {
        draw_icon(p, item, count, rect.shrink(5.0));
        durability_bar(p, item, dur, rect);
        /* Hover tooltip: the item's name, plus the uses left on a tool.
         * Every grid UI (chest / crafting / furnace / inventory) shares this
         * slot helper, so one hook covers them all. */
        if let Some(name) = items::display_name(item) {
            let cfg = tenebris_core::mining::config();
            return match tenebris_core::mining::uses_left(&cfg, item, dur) {
                Some(left) => {
                    let max = tenebris_core::mining::tool_max_uses(&cfg, item).unwrap_or(left);
                    resp.on_hover_text(format!("{name}\n{left} / {max} uses left"))
                }
                None => resp.on_hover_text(name),
            };
        }
    }
    resp
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn uv_spans_one_cell_and_unknown_is_none() {
        let n = ICONS.len() as f32;
        let [u0, v0, u1, v1] = uv(items::IRON_INGOT).expect("iron ingot has an icon");
        assert!((u1 - u0 - 1.0 / n).abs() < 1e-6);
        assert_eq!((v0, v1), (0.0, 1.0));
        assert!(uv(60000).is_none());
    }

    #[test]
    fn no_duplicate_ids() {
        for i in 0..ICONS.len() {
            for j in (i + 1)..ICONS.len() {
                assert_ne!(ICONS[i].0, ICONS[j].0, "duplicate icon id {}", ICONS[i].0);
            }
        }
    }
}
