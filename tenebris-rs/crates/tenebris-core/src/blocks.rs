//! Port of `tenebris-c/src/core/blocks.{c,h}`.
//!
//! Renames (per PORTING.md rule 4 — module prefix dropped):
//! - `block_is_solid()`       -> `blocks::is_solid()`
//! - `block_is_transparent()` -> `blocks::is_transparent()`
//! - `block_is_unbreakable()` -> `blocks::is_unbreakable()`
//! - `block_covers_face()`    -> `blocks::covers_face()`
//! - `block_face_tile()`      -> `blocks::face_tile()`
//!
//! Block ids are serialized into saves and the wire protocol; the
//! numeric discriminants below MUST stay identical to the C enum.

/// Tier 1 hex-prism block palette. Atlas layout matches Caelum's 1x11
/// strip (each tile is 16x16 px), so the index here doubles as the U
/// column in the atlas.
///
/// `world_t.blocks` stores voxels as raw bytes in the C tree, so this
/// enum is `#[repr(u8)]` with explicit discriminants and a fallible
/// [`Block::from_raw`].
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Block {
    Air = 0,
    Water = 1,
    Sand = 2,
    Dirt = 3,
    Grass = 4,
    Stone = 5,
    Ice = 6,
    Snow = 7,
    /// "grass with dirt under" - used on side faces
    DirtGrass = 8,
    DirtSnow = 9,
    Torch = 10,
    Moon = 11,

    /* Sequoia-tileset variants — a distinct palette for the sister
     * earth-like planet. Stored as their own Block values so the
     * mesher needs no per-body branching; the biome classifier picks
     * the right variants for bodies with tileset == TILESET_SEQUOIA. */
    SeqGrass = 12,
    SeqDirt = 13,
    /// side face of Sequoia grass column
    SeqDirtGrass = 14,
    SeqSand = 15,
    SeqSnow = 16,
    /// side face of Sequoia snow column
    SeqDirtSnow = 17,

    /* Runtime-tinted variants — generated at atlas bake time by
     * multiplying the source PNG per channel. Gives differentiated
     * looks for Crag (red), Frostbite (deep blue), asteroids (dark
     * gray) without needing new source art. */
    /// rusty Mars-like rock
    CragRock = 18,
    /// deeper glacial blue
    FrostIce = 19,
    /// dim gray carbonaceous
    AsteroidRock = 20,

    /* Vegetation + planetary core. */
    Wood = 21,
    /// tinted grass — pulled darker green at bake
    Leaves = 22,
    /// impassable layer-0 floor (tinted very dark)
    Bedrock = 23,

    /* Sequoia foliage: tinted red at atlas-bake time so Sequoia's
     * trees read as a different biome than Tenebris's at a glance.
     * Treated identically to Block::Leaves everywhere else (covering,
     * width, mining loot). */
    SeqLeaves = 24,

    /* Ore-bearing rock. Runtime-tinted variants of the stone texture
     * (like CragRock / FrostIce / AsteroidRock) - no new source art.
     * Scattered through underground stone by worldgen; mining each with
     * a pickaxe drops its raw resource (see core::mining::drops). */
    CoalOre = 25,
    CopperOre = 26,
    TinOre = 27,
    IronOre = 28,

    /* Crafted structure block. The launch pad the player builds a rocket
     * on: interact (E) on a placed pad opens the rocket-assembly screen
     * (see client::rocket_screen). Runtime-tinted rock - no new source
     * art. Rust-port-only block (the canonical native target); the legacy
     * C tree never had it. */
    LaunchPad = 29,

    /* Crafting-station block. Interact (E) on a placed furnace opens the
     * smelting UI (ore + coal fuel -> ingots). Rust-port-only, past the C
     * palette. Borrows an existing atlas tile for now (see face_tile) -
     * dedicated tech-block art is a later pass. */
    Furnace = 30,

    /* Tech blocks ported from the JS planet machine modules. All
     * Rust-port-only, past the C palette. They borrow existing atlas
     * tiles for now (see
     * face_tile); the dedicated tech-block art + multi-face fronts land in
     * the texture pass. Interact behaviour is wired per machine in core. */
    ElectricFurnace = 31,
    Printer3D = 32,
    Computer = 33,
    ElectronicsWorkbench = 34,
    HydroGenerator = 35,
    SteamEngine = 36,
    StorageChest = 37,
    /// `launch_pad_segment` in the JS - the tower piece atop a launch pad.
    LaunchTower = 38,
    /// Power-network link blocks (thin placeable connectors).
    Cable = 39,
    CopperPipe = 40,

    /// Tilled soil. Dirt / grass worked with a hoe (client::crops) so a
    /// seed can be planted on it; renders as darkened, furrowed dirt.
    /// Rust-port-only, past the C palette. Behaves like dirt (solid,
    /// shovel-dug); planting is gated on this block being present.
    Farmland = 41,

    /* Biome surface variants (Rust-port-only, custom-seed worlds).
     * Runtime-tinted grass so the moisture biomes read from orbit:
     * jungles go deep green, temperate pasture goes yellow-green.
     * Their atlas tiles live PAST the 93 UV-addressed legacy columns
     * (see face_tile) - the hex FS rescales u so the pinned vertex
     * encoding (u = tile/93) stays byte-exact for legacy worlds. */
    /// deep-green jungle sod
    JungleGrass = 42,
    /// yellow-green temperate pasture sod
    DryGrass = 43,
}

/// Mirrors C's `BLOCK_COUNT` (the implicit trailing enum member). The
/// Rust port adds the tech blocks (LaunchPad 29 .. CopperPipe 40) and
/// the biome sods (JungleGrass / DryGrass) past the C palette - the
/// native port is the canonical target now, so the palette can grow
/// here.
pub const BLOCK_COUNT: u8 = 44;

impl Block {
    /// Fallible conversion from the raw byte stored in voxel arrays /
    /// saves / the wire protocol. Returns `None` for out-of-palette
    /// values (>= `BLOCK_COUNT`).
    pub fn from_raw(raw: u8) -> Option<Block> {
        if raw < BLOCK_COUNT {
            // SAFETY: Block is #[repr(u8)] with contiguous
            // discriminants 0..BLOCK_COUNT.
            Some(unsafe { core::mem::transmute::<u8, Block>(raw) })
        } else {
            None
        }
    }

    /// The raw byte as stored in voxel arrays / saves / the wire
    /// protocol.
    pub fn raw(self) -> u8 {
        self as u8
    }
}

/* Atlas columns for the extension tiles - physically past the 93
 * legacy columns (HEX_ATLAS_TILES stays 93; the client's physical
 * atlas is HEX_ATLAS_TILES_PHYS = 100 wide and the hex FS rescales
 * u by 93/100). Order matches the renderer's ATLAS_PATHS tail;
 * 98..99 are reserved spares so the next tile doesn't need another
 * shader-ratio patch. */
pub const ATLAS_JUNGLE_GRASS: u8 = 93;
pub const ATLAS_JUNGLE_SIDE: u8 = 94;
pub const ATLAS_DRY_GRASS: u8 = 95;
pub const ATLAS_DRY_SIDE: u8 = 96;
/// Lime-green cactus flesh (desert scatter prisms, not a block).
pub const ATLAS_CACTUS: u8 = 97;

/// Face classification for atlas tile selection.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum FaceCap {
    Top = 0,
    Bottom = 1,
    Side = 2,
}

/// Port of `block_is_solid()`.
pub fn is_solid(b: Block) -> bool {
    b != Block::Air && b != Block::Water
}

/// Port of `block_is_transparent()`.
pub fn is_transparent(b: Block) -> bool {
    /* Leaves count as transparent so trunk-side faces inside the canopy
     * still draw. (Leaves don't actually have alpha — this just gates
     * face culling so the trunk + leaf interior is visible.) */
    b == Block::Air
        || b == Block::Water
        || b == Block::Ice
        || b == Block::Leaves
        || b == Block::SeqLeaves
}

/// Port of `block_is_unbreakable()`. Bedrock cannot be broken by
/// `interact_update`. Exposed so input/edit paths can early-out.
pub fn is_unbreakable(b: Block) -> bool {
    b == Block::Bedrock
}

/// Port of `block_covers_face()`.
///
/// True only when this block fully covers the face of an adjacent
/// voxel — i.e. air/water/ice/leaves don't cover (transparent), and
/// wood/leaves don't cover (partial width). Used by the mesher to
/// decide when to emit a face: if the neighbour does NOT cover,
/// this voxel's face is visible.
pub fn covers_face(b: Block) -> bool {
    if b == Block::Air || b == Block::Water || b == Block::Ice {
        return false;
    }
    /* Wood and leaves are partial-width — they don't fully cover the
     * face of an adjacent voxel, so neighbors must still draw. */
    if b == Block::Wood || b == Block::Leaves || b == Block::SeqLeaves {
        return false;
    }
    /* Tech blocks render as a cube (or thin connector) sitting in the
     * voxel, not a full hex prism, so they must NOT occlude the faces of
     * the terrain below / beside them - otherwise the ground under a
     * placed machine gets culled and leaves a hole around the cube. */
    if is_tech_block(b) {
        return false;
    }
    true
}

/// Port of `block_face_tile()`.
///
/// Atlas tile index for a block's given face cap. The atlas is a 1 x N
/// strip in renderer.c; index = column. Grass uses grass_top / dirt /
/// dirt_grass (top/bottom/side) and snow uses snow / dirt / dirt_snow —
/// standard Minecraft convention.
pub fn face_tile(b: Block, cap: FaceCap) -> u8 {
    if b == Block::Grass {
        return match cap {
            FaceCap::Top => Block::Grass as u8,
            FaceCap::Bottom => Block::Dirt as u8,
            FaceCap::Side => Block::DirtGrass as u8,
        };
    }
    if b == Block::Snow {
        return match cap {
            FaceCap::Top => Block::Snow as u8,
            FaceCap::Bottom => Block::Dirt as u8,
            FaceCap::Side => Block::DirtSnow as u8,
        };
    }
    /* Farmland: the tilled top tile (its own atlas column), plain dirt on
     * the sides and bottom - same top/side/bottom split grass uses. */
    if b == Block::Farmland {
        return match cap {
            FaceCap::Top => Block::Farmland as u8,
            FaceCap::Bottom | FaceCap::Side => Block::Dirt as u8,
        };
    }
    /* Sequoia tileset: uses distinct atlas columns so Sequoia's grass /
     * snow / sand look noticeably different from Tenebris's. */
    if b == Block::SeqGrass {
        return match cap {
            FaceCap::Top => Block::SeqGrass as u8,
            FaceCap::Bottom => Block::SeqDirt as u8,
            FaceCap::Side => Block::SeqDirtGrass as u8,
        };
    }
    if b == Block::SeqSnow {
        return match cap {
            FaceCap::Top => Block::SeqSnow as u8,
            FaceCap::Bottom => Block::SeqDirt as u8,
            FaceCap::Side => Block::SeqDirtSnow as u8,
        };
    }
    /* Biome sods: tinted-grass tiles in the atlas columns PAST the 93
     * legacy UV-addressed ones. The mesher still encodes u = tile/93,
     * so these tiles land at u > 1.0 and the hex FS rescales every u
     * by 93/100 - which leaves all pinned legacy UVs sampling exactly
     * where they always did. Bottoms are plain dirt like Grass. */
    if b == Block::JungleGrass {
        return match cap {
            FaceCap::Top => ATLAS_JUNGLE_GRASS,
            FaceCap::Bottom => Block::Dirt as u8,
            FaceCap::Side => ATLAS_JUNGLE_SIDE,
        };
    }
    if b == Block::DryGrass {
        return match cap {
            FaceCap::Top => ATLAS_DRY_GRASS,
            FaceCap::Bottom => Block::Dirt as u8,
            FaceCap::Side => ATLAS_DRY_SIDE,
        };
    }
    /* Tech blocks render their dedicated JS art (ported into the atlas at
     * columns 29..41 - see renderer::ATLAS_PATHS). Each shows its 16x16
     * _face tile on every face: the same icon the JS uses for the block,
     * so a placed machine reads as that machine. These atlas columns are
     * past the block-id range, mapped explicitly here. */
    const TECH_ATLAS_BASE: u8 = 29;
    if let Some(off) = tech_atlas_offset(b) {
        return TECH_ATLAS_BASE + off;
    }
    b as u8
}

/// True for the ported tech blocks (machines, structures, connectors) -
/// the ones with dedicated JS art and, where applicable, a facing.
pub fn is_tech_block(b: Block) -> bool {
    tech_atlas_offset(b).is_some()
}

/// Atlas-column offset (from `TECH_ATLAS_BASE` 29) for a tech block's
/// `_face` tile, or `None` for non-tech blocks. The order matches the
/// `ATLAS_PATHS` tech section in the renderer.
fn tech_atlas_offset(b: Block) -> Option<u8> {
    Some(match b {
        Block::Furnace => 0,
        Block::ElectricFurnace => 1,
        Block::Printer3D => 2,
        Block::Computer => 3,
        Block::ElectronicsWorkbench => 4,
        Block::HydroGenerator => 5,
        Block::SteamEngine => 6,
        Block::StorageChest => 7,
        Block::LaunchPad => 8,
        Block::LaunchTower => 9,
        Block::Cable => 10,
        Block::CopperPipe => 11,
        _ => return None,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn block_ids_match_c_enum() {
        assert_eq!(Block::Air as u8, 0);
        assert_eq!(Block::Water as u8, 1);
        assert_eq!(Block::Sand as u8, 2);
        assert_eq!(Block::Dirt as u8, 3);
        assert_eq!(Block::Grass as u8, 4);
        assert_eq!(Block::Stone as u8, 5);
        assert_eq!(Block::Ice as u8, 6);
        assert_eq!(Block::Snow as u8, 7);
        assert_eq!(Block::DirtGrass as u8, 8);
        assert_eq!(Block::DirtSnow as u8, 9);
        assert_eq!(Block::Torch as u8, 10);
        assert_eq!(Block::Moon as u8, 11);
        assert_eq!(Block::SeqGrass as u8, 12);
        assert_eq!(Block::SeqDirt as u8, 13);
        assert_eq!(Block::SeqDirtGrass as u8, 14);
        assert_eq!(Block::SeqSand as u8, 15);
        assert_eq!(Block::SeqSnow as u8, 16);
        assert_eq!(Block::SeqDirtSnow as u8, 17);
        assert_eq!(Block::CragRock as u8, 18);
        assert_eq!(Block::FrostIce as u8, 19);
        assert_eq!(Block::AsteroidRock as u8, 20);
        assert_eq!(Block::Wood as u8, 21);
        assert_eq!(Block::Leaves as u8, 22);
        assert_eq!(Block::Bedrock as u8, 23);
        assert_eq!(Block::SeqLeaves as u8, 24);
        assert_eq!(Block::CoalOre as u8, 25);
        assert_eq!(Block::CopperOre as u8, 26);
        assert_eq!(Block::TinOre as u8, 27);
        assert_eq!(Block::IronOre as u8, 28);
        assert_eq!(Block::LaunchPad as u8, 29);
        assert_eq!(Block::Furnace as u8, 30);
        assert_eq!(Block::ElectricFurnace as u8, 31);
        assert_eq!(Block::Printer3D as u8, 32);
        assert_eq!(Block::Computer as u8, 33);
        assert_eq!(Block::ElectronicsWorkbench as u8, 34);
        assert_eq!(Block::HydroGenerator as u8, 35);
        assert_eq!(Block::SteamEngine as u8, 36);
        assert_eq!(Block::StorageChest as u8, 37);
        assert_eq!(Block::LaunchTower as u8, 38);
        assert_eq!(Block::Cable as u8, 39);
        assert_eq!(Block::CopperPipe as u8, 40);
        assert_eq!(Block::Farmland as u8, 41);
        assert_eq!(Block::JungleGrass as u8, 42);
        assert_eq!(Block::DryGrass as u8, 43);
        assert_eq!(BLOCK_COUNT, 44);
    }

    #[test]
    fn biome_sods_map_to_extension_atlas_columns() {
        assert_eq!(face_tile(Block::JungleGrass, FaceCap::Top), 93);
        assert_eq!(face_tile(Block::JungleGrass, FaceCap::Side), 94);
        assert_eq!(face_tile(Block::JungleGrass, FaceCap::Bottom), 3);
        assert_eq!(face_tile(Block::DryGrass, FaceCap::Top), 95);
        assert_eq!(face_tile(Block::DryGrass, FaceCap::Side), 96);
        assert_eq!(face_tile(Block::DryGrass, FaceCap::Bottom), 3);
        assert!(covers_face(Block::JungleGrass) && covers_face(Block::DryGrass));
        assert!(is_solid(Block::JungleGrass) && !is_transparent(Block::DryGrass));
    }

    #[test]
    fn face_cap_ids_match_c_enum() {
        assert_eq!(FaceCap::Top as u8, 0);
        assert_eq!(FaceCap::Bottom as u8, 1);
        assert_eq!(FaceCap::Side as u8, 2);
    }

    #[test]
    fn from_raw_round_trips_palette_and_rejects_out_of_range() {
        for raw in 0..BLOCK_COUNT {
            let b = Block::from_raw(raw).expect("in-palette id must convert");
            assert_eq!(b.raw(), raw);
        }
        assert_eq!(Block::from_raw(BLOCK_COUNT), None);
        assert_eq!(Block::from_raw(255), None);
        assert_eq!(Block::from_raw(7), Some(Block::Snow));
        assert_eq!(Block::from_raw(23), Some(Block::Bedrock));
    }

    #[test]
    fn solidity() {
        assert!(!is_solid(Block::Air));
        assert!(!is_solid(Block::Water));
        assert!(is_solid(Block::Stone));
        assert!(is_solid(Block::Ice));
        assert!(is_solid(Block::Leaves));
        assert!(is_solid(Block::Torch));
        assert!(is_solid(Block::Bedrock));
    }

    #[test]
    fn transparency() {
        assert!(is_transparent(Block::Air));
        assert!(is_transparent(Block::Water));
        assert!(is_transparent(Block::Ice));
        assert!(is_transparent(Block::Leaves));
        assert!(is_transparent(Block::SeqLeaves));
        assert!(!is_transparent(Block::Stone));
        assert!(!is_transparent(Block::Wood));
        assert!(!is_transparent(Block::Snow));
        assert!(!is_transparent(Block::FrostIce));
    }

    #[test]
    fn unbreakability() {
        assert!(is_unbreakable(Block::Bedrock));
        assert!(!is_unbreakable(Block::Stone));
        assert!(!is_unbreakable(Block::Air));
        assert!(!is_unbreakable(Block::AsteroidRock));
    }

    #[test]
    fn face_coverage() {
        assert!(!covers_face(Block::Air));
        assert!(!covers_face(Block::Water));
        assert!(!covers_face(Block::Ice));
        assert!(!covers_face(Block::Wood));
        assert!(!covers_face(Block::Leaves));
        assert!(!covers_face(Block::SeqLeaves));
        assert!(covers_face(Block::Stone));
        assert!(covers_face(Block::Grass));
        assert!(covers_face(Block::Snow));
        assert!(covers_face(Block::FrostIce)); // tinted ice still covers, matching C
        assert!(covers_face(Block::Bedrock));
        assert!(covers_face(Block::Torch));
    }

    #[test]
    fn face_tiles_grass_and_snow_conventions() {
        // Tenebris grass: grass_top / dirt / dirt_grass.
        assert_eq!(face_tile(Block::Grass, FaceCap::Top), 4);
        assert_eq!(face_tile(Block::Grass, FaceCap::Bottom), 3);
        assert_eq!(face_tile(Block::Grass, FaceCap::Side), 8);
        // Tenebris snow: snow / dirt / dirt_snow.
        assert_eq!(face_tile(Block::Snow, FaceCap::Top), 7);
        assert_eq!(face_tile(Block::Snow, FaceCap::Bottom), 3);
        assert_eq!(face_tile(Block::Snow, FaceCap::Side), 9);
        // Sequoia grass.
        assert_eq!(face_tile(Block::SeqGrass, FaceCap::Top), 12);
        assert_eq!(face_tile(Block::SeqGrass, FaceCap::Bottom), 13);
        assert_eq!(face_tile(Block::SeqGrass, FaceCap::Side), 14);
        // Sequoia snow.
        assert_eq!(face_tile(Block::SeqSnow, FaceCap::Top), 16);
        assert_eq!(face_tile(Block::SeqSnow, FaceCap::Bottom), 13);
        assert_eq!(face_tile(Block::SeqSnow, FaceCap::Side), 17);
        // Farmland: tilled top (own column 41), dirt on the sides + bottom.
        assert_eq!(face_tile(Block::Farmland, FaceCap::Top), 41);
        assert_eq!(face_tile(Block::Farmland, FaceCap::Bottom), 3);
        assert_eq!(face_tile(Block::Farmland, FaceCap::Side), 3);
        // Everything else returns its own id for every cap.
        for b in [
            Block::Stone,
            Block::Sand,
            Block::Wood,
            Block::Leaves,
            Block::Bedrock,
            Block::CragRock,
            Block::Torch,
        ] {
            for cap in [FaceCap::Top, FaceCap::Bottom, FaceCap::Side] {
                assert_eq!(face_tile(b, cap), b as u8);
            }
        }
    }
}
