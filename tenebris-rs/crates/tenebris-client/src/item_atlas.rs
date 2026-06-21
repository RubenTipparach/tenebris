//! Port of `tenebris-c/src/client/item_atlas.{c,h}`.
//!
//! Item-icon atlas. Loads assets/textures/items/atlas.png (baked by
//! tools/gen-item-sprites.py) into a single GPU texture; consumers
//! (hotbar, inventory screen, crafting screen) sample it via
//! sgl_texture() + the UV rect returned by [`uv`].
//!
//! Separate from renderer.rs's terrain atlas so the two stay decoupled:
//! the terrain atlas changes when world tiles change, the item atlas
//! is a fixed art bundle that ships with the binary.
//!
//! # Renames (PORTING.md rule 4 - `item_atlas_` prefix dropped)
//!
//! - `item_atlas_init()`        -> `item_atlas::init()`
//! - `item_atlas_shutdown()`    -> `item_atlas::shutdown()`
//! - `item_atlas_view_id()`     -> `item_atlas::view_id()`
//! - `item_atlas_sampler_id()`  -> `item_atlas::sampler_id()`
//! - `item_atlas_uv(id, &u0..)` -> `item_atlas::uv(id) ->
//!   Option<(u0, v0, u1, v1)>` (C bool + out-params; the C zeroes the
//!   outs on failure, which the `None` arm subsumes).

#![allow(dead_code)]

use sokol::gfx as sg;

use std::cell::Cell;

use crate::inventory::ItemId;
use crate::renderer::load_png_rgba;

/* Atlas geometry. Must match tools/gen-item-sprites.py - if the python
 * script's TILE_PX / COLS / ROWS / LAYOUT changes, these constants
 * need to follow suit. The runtime samples via id_to_grid() below,
 * so the Rust side never opens the PNG to figure the layout out. */
const ATLAS_TILE_PX: i32 = 16;
const ATLAS_COLS: i32 = 8;
const ATLAS_ROWS: i32 = 3;

thread_local! {
    static G_READY: Cell<bool> = const { Cell::new(false) };
    static G_ATLAS_OK: Cell<bool> = const { Cell::new(false) };
    static G_VIEW: Cell<u32> = const { Cell::new(0) };
    static G_SMP: Cell<u32> = const { Cell::new(0) };
    static G_ATLAS_W: Cell<f32> = const { Cell::new(0.0) };
    static G_ATLAS_H: Cell<f32> = const { Cell::new(0.0) };
}

/// Port of `id_to_grid`: map ItemId -> (col, row) in the atlas.
/// Mirrors the LAYOUT table in tools/gen-item-sprites.py; keep these
/// in lockstep with the enum in inventory.rs. `None` for
/// `ItemId::None` / unpopulated tiles.
pub(crate) fn id_to_grid(id: ItemId) -> Option<(i32, i32)> {
    match id {
        /* Row 0: tools */
        ItemId::Pickaxe => Some((0, 0)),
        ItemId::Axe => Some((1, 0)),
        ItemId::Shovel => Some((2, 0)),
        ItemId::ProspectingAxe => Some((3, 0)),
        /* Row 1: resources */
        ItemId::Log => Some((0, 1)),
        ItemId::Plank => Some((1, 1)),
        ItemId::Stick => Some((2, 1)),
        ItemId::Stone => Some((3, 1)),
        /* Row 2: clutter drops */
        ItemId::SmallRock => Some((0, 2)),
        ItemId::GrassClip => Some((1, 2)),
        ItemId::Flower => Some((2, 2)),
        ItemId::None => None,
    }
}

/// Pure half of [`uv`]: grid lookup + texel -> normalised UV math for
/// the given atlas dimensions (headless-testable).
pub(crate) fn uv_for(id: ItemId, atlas_w: f32, atlas_h: f32) -> Option<(f32, f32, f32, f32)> {
    let (col, row) = id_to_grid(id)?;
    let tx = col as f32 * ATLAS_TILE_PX as f32;
    let ty = row as f32 * ATLAS_TILE_PX as f32;
    Some((
        tx / atlas_w,
        ty / atlas_h,
        (tx + ATLAS_TILE_PX as f32) / atlas_w,
        (ty + ATLAS_TILE_PX as f32) / atlas_h,
    ))
}

/// Port of `item_atlas_init()`. Safe to call twice; second call is a
/// no-op. Returns 0 on success, non-zero if the PNG couldn't be
/// loaded - in that case [`uv`] returns None for every id so callers
/// cleanly skip the icon draw.
pub fn init() -> i32 {
    if G_READY.with(|c| c.get()) {
        return 0;
    }

    let path = "assets/textures/items/atlas.png";
    let Some(img) = load_png_rgba(path, false) else {
        println!("[item_atlas] WARNING: {} missing; item icons disabled", path);
        G_READY.with(|c| c.set(true));
        G_ATLAS_OK.with(|c| c.set(false));
        return -1;
    };

    G_ATLAS_W.with(|c| c.set(img.w as f32));
    G_ATLAS_H.with(|c| c.set(img.h as f32));

    let mut desc = sg::ImageDesc {
        width: img.w,
        height: img.h,
        pixel_format: sg::PixelFormat::Rgba8,
        label: c"item-atlas".as_ptr(),
        ..Default::default()
    };
    desc.data.mip_levels[0] = sg::slice_as_range(&img.rgba);
    let atlas_img = sg::make_image(&desc);
    let view = sg::make_view(&sg::ViewDesc {
        texture: sg::TextureViewDesc { image: atlas_img, ..Default::default() },
        label: c"item-atlas-view".as_ptr(),
        ..Default::default()
    });
    /* Nearest-neighbour - the icons are 16 x 16 pixel art and need
     * crisp edges at any UI scale. Clamp wrap so a sub-rect can't
     * bleed into a neighbouring icon. */
    let smp = sg::make_sampler(&sg::SamplerDesc {
        min_filter: sg::Filter::Nearest,
        mag_filter: sg::Filter::Nearest,
        wrap_u: sg::Wrap::ClampToEdge,
        wrap_v: sg::Wrap::ClampToEdge,
        label: c"item-atlas-sampler".as_ptr(),
        ..Default::default()
    });
    G_VIEW.with(|c| c.set(view.id));
    G_SMP.with(|c| c.set(smp.id));

    G_ATLAS_OK.with(|c| c.set(true));
    G_READY.with(|c| c.set(true));
    println!("[item_atlas] loaded {} ({}x{})", path, img.w, img.h);
    0
}

/// Port of `item_atlas_shutdown()`.
pub fn shutdown() {
    /* Image + view + sampler reclaimed by sokol shutdown at app exit;
     * no per-resource destroy needed for normal operation. */
    G_READY.with(|c| c.set(false));
}

/// Port of `item_atlas_view_id()`. Zero when the atlas failed to load.
pub fn view_id() -> u32 {
    if G_ATLAS_OK.with(|c| c.get()) {
        G_VIEW.with(|c| c.get())
    } else {
        0
    }
}

/// Port of `item_atlas_sampler_id()`.
pub fn sampler_id() -> u32 {
    if G_ATLAS_OK.with(|c| c.get()) {
        G_SMP.with(|c| c.get())
    } else {
        0
    }
}

/// Port of `item_atlas_uv()`. UV rect (in normalised [0, 1] coords) of
/// a given item id's icon inside the atlas. `Some` on a valid id with
/// a populated tile, `None` otherwise.
pub fn uv(id: ItemId) -> Option<(f32, f32, f32, f32)> {
    if !G_ATLAS_OK.with(|c| c.get()) {
        return None;
    }
    uv_for(id, G_ATLAS_W.with(|c| c.get()), G_ATLAS_H.with(|c| c.get()))
}

/* ----------------------------------------------------------------------- */

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn grid_layout_matches_gen_item_sprites_py() {
        assert_eq!(id_to_grid(ItemId::Pickaxe), Some((0, 0)));
        assert_eq!(id_to_grid(ItemId::Axe), Some((1, 0)));
        assert_eq!(id_to_grid(ItemId::Shovel), Some((2, 0)));
        assert_eq!(id_to_grid(ItemId::ProspectingAxe), Some((3, 0)));
        assert_eq!(id_to_grid(ItemId::Log), Some((0, 1)));
        assert_eq!(id_to_grid(ItemId::Plank), Some((1, 1)));
        assert_eq!(id_to_grid(ItemId::Stick), Some((2, 1)));
        assert_eq!(id_to_grid(ItemId::Stone), Some((3, 1)));
        assert_eq!(id_to_grid(ItemId::SmallRock), Some((0, 2)));
        assert_eq!(id_to_grid(ItemId::GrassClip), Some((1, 2)));
        assert_eq!(id_to_grid(ItemId::Flower), Some((2, 2)));
        assert_eq!(id_to_grid(ItemId::None), None);
    }

    #[test]
    fn uv_math_pinned_for_shipped_atlas_dims() {
        /* The shipped atlas is COLS*16 x ROWS*16 = 128 x 48. */
        let (w, h) = ((ATLAS_COLS * ATLAS_TILE_PX) as f32, (ATLAS_ROWS * ATLAS_TILE_PX) as f32);
        /* Pickaxe at (0, 0): UV [0, 0] .. [16/128, 16/48]. */
        let (u0, v0, u1, v1) = uv_for(ItemId::Pickaxe, w, h).unwrap();
        assert_eq!((u0, v0), (0.0, 0.0));
        assert!((u1 - 0.125).abs() < 1e-7);
        assert!((v1 - 1.0 / 3.0).abs() < 1e-7);
        /* Stone at (3, 1). */
        let (u0, v0, u1, v1) = uv_for(ItemId::Stone, w, h).unwrap();
        assert!((u0 - 0.375).abs() < 1e-7);
        assert!((v0 - 1.0 / 3.0).abs() < 1e-7);
        assert!((u1 - 0.5).abs() < 1e-7);
        assert!((v1 - 2.0 / 3.0).abs() < 1e-7);
        /* Flower at (2, 2) ends one tile short of the right edge. */
        let (_, _, u1, v1) = uv_for(ItemId::Flower, w, h).unwrap();
        assert!((u1 - 0.375).abs() < 1e-7);
        assert!((v1 - 1.0).abs() < 1e-7);
        /* ITEM_NONE has no tile. */
        assert_eq!(uv_for(ItemId::None, w, h), None);
    }

    #[test]
    fn shipped_atlas_png_dims_match_constants() {
        /* Cross-check the baked asset (shared C asset tree) against
         * the compiled-in grid constants - skip when the asset tree
         * isn't present in this checkout layout. */
        let path = concat!(
            env!("CARGO_MANIFEST_DIR"),
            "/../../../tenebris-c/assets/textures/items/atlas.png"
        );
        let Some(img) = load_png_rgba(path, false) else {
            return;
        };
        assert_eq!(img.w, ATLAS_COLS * ATLAS_TILE_PX);
        assert_eq!(img.h, ATLAS_ROWS * ATLAS_TILE_PX);
    }
}
