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
}

/// Mirrors C's `BLOCK_COUNT` (the implicit trailing enum member). The
/// Rust port adds the tech blocks (LaunchPad 29 .. CopperPipe 40) past the
/// C palette - the native port is the canonical target now, so the palette
/// can grow here.
pub const BLOCK_COUNT: u8 = 41;

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
    /* The LaunchPad is a Rust-port-only block past the C atlas (29 cols),
     * so it has no atlas column of its own. Borrow Bedrock's near-black
     * slate tile on every face - it reads as a dark, artificial platform
     * distinct from natural terrain, and keeps the atlas width (and every
     * existing block's pinned UVs) unchanged. A bespoke tile is a future
     * art pass. */
    if b == Block::LaunchPad {
        return Block::Bedrock as u8;
    }
    /* Furnace borrows CragRock's rusty-rock tile so it reads as a warm,
     * industrial block distinct from the near-black launch pad - until
     * the dedicated tech-block texture pass widens the atlas. */
    if b == Block::Furnace {
        return Block::CragRock as u8;
    }
    /* The rest of the ported tech blocks borrow a thematically-close
     * existing tile for now (chest=wood, copper pipe=copper ore, the
     * metal machines=crag rock, the dark electronics=bedrock). The
     * texture pass replaces these with the JS art + multi-face fronts. */
    match b {
        Block::ElectricFurnace
        | Block::ElectronicsWorkbench
        | Block::SteamEngine
        | Block::HydroGenerator => return Block::CragRock as u8,
        Block::Printer3D | Block::Computer | Block::LaunchTower | Block::Cable => {
            return Block::Bedrock as u8
        }
        Block::StorageChest => return Block::Wood as u8,
        Block::CopperPipe => return Block::CopperOre as u8,
        _ => {}
    }
    b as u8
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
        assert_eq!(BLOCK_COUNT, 41);
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
