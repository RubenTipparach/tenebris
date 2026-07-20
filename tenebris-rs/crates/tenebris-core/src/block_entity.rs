//! Per-placed-block state, parallel to the voxel byte grid.
//!
//! The block byte (`World::blocks`) says WHAT a cell is; a `BlockEntity`
//! says its placed *state*. Today that is a tech block's facing (which way
//! the cube's front points); machine state - furnace smelt progress, chest
//! inventory, generator power, printer jobs - layers on here as the JS
//! machines are ported, so every machine reads/writes one store keyed by
//! (tile, depth).
//!
//! Lives in `core/` so SP and MP share the exact same code path. The store
//! is owned by `World`; `World::set` drops an entity when its cell changes
//! (the block was mined or replaced), and the placement path writes a fresh
//! one. Persistence is wired at the same call site as `world_set` per the
//! repo's same-frame-save rule.

use std::collections::HashMap;

use crate::world::WORLD_MAX_DEPTH;

/// `facing` sentinel: no facing recorded, use the default cube orientation.
pub const FACING_UNSET: u8 = 0xFF;

/// Storage-chest capacity (matches the JS `CHEST_SLOTS`).
pub const CHEST_SLOTS: usize = 27;

/// One chest slot. `count == 0` means empty (item ignored).
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub struct ChestSlot {
    pub item: u16,
    pub count: u16,
}

/// A chest's storage grid.
pub type ChestInv = [ChestSlot; CHEST_SLOTS];

/// Seconds to smelt one item (JS `SMELT_TIME`).
pub const FURNACE_SMELT_TIME_S: f32 = 10.0;
/// Smelts produced per unit of fuel (JS `FUEL_PER_COAL`).
pub const FUEL_PER_COAL: u16 = 8;
/// Electric furnace smelt time (JS: 5x faster than the coal furnace).
pub const ELEC_SMELT_TIME_S: f32 = 2.0;
/// Electric furnace yield per smelt (JS: double the coal furnace).
pub const ELEC_YIELD_MULT: u16 = 2;
/// Seconds a steam engine burns per unit of coal.
pub const STEAM_BURN_S_PER_COAL: f32 = 16.0;

/// Maximum rocket parts stacked on a launch pad (mirrors the JS 8-segment
/// tower cap). Fixed-size so [`LaunchPadState`] stays `Copy`.
pub const ROCKET_STACK_MAX: usize = 8;

/// Furnace slots + smelt progress. Mirrors the JS `PlacedFurnace`: an input
/// stack (raw ore), a fuel stack (coal), an output stack (ingots), the
/// 0..1 progress of the current smelt, and how many smelts the currently
/// burning fuel still covers.
#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub struct FurnaceState {
    pub input: ChestSlot,
    pub fuel: ChestSlot,
    pub output: ChestSlot,
    pub progress: f32,
    pub fuel_remaining: u16,
}

/// A bonfire: the flint-tier campfire. Like a furnace it has fuel / input /
/// output stacks and a cook progress, but it differs in two ways that make
/// it a fire rather than a smelter:
///   1. It burns fuel *continuously* to stay lit (a light source), not only
///      while there is something to cook - so `burn_s` counts seconds of
///      fuel left and drains every tick.
///   2. Its fuel is wood-family (sticks / logs / charcoal / coal), fed
///      through [`bonfire_fuel_seconds`], so you keep it alive by adding
///      logs and sticks.
/// While lit it cooks raw meat / fish into cooked, and chars logs into
/// charcoal (the shared `smelt_output` map). It emits 2x a torch's light
/// (wired in the client light bake).
#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub struct BonfireState {
    pub input: ChestSlot,
    pub fuel: ChestSlot,
    pub output: ChestSlot,
    /// 0..1 progress of the current cook.
    pub cook_progress: f32,
    /// Seconds of fuel left in the current burn; > 0 == lit.
    pub burn_s: f32,
}

impl BonfireState {
    /// Lit == actively burning fuel (emits light + can cook).
    pub fn lit(&self) -> bool {
        self.burn_s > 0.0
    }
}

/// A steam engine: burns coal AND needs water piped in from an active
/// hydro generator (the JS `hasFuel && fuelAmount > 0 && waterInput > 0`).
/// While running it powers the cable network it touches. `has_water` is
/// refreshed each tick from the copper-pipe network before the burn.
#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub struct SteamEngineState {
    pub fuel: ChestSlot,
    /// Seconds of fuel left in the current burn.
    pub burn_time: f32,
    /// Set each tick: pipe-connected to an active hydro generator.
    pub has_water: bool,
}

impl SteamEngineState {
    /// Running needs both an active burn (coal) and water.
    pub fn running(&self) -> bool {
        self.burn_time > 0.0 && self.has_water
    }
}

/// An electric furnace: smelts ore -> ingot with no fuel, but only while
/// `powered` (connected by cables to a running steam engine). Faster +
/// higher yield than the coal furnace (JS).
#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub struct ElectricFurnaceState {
    pub input: ChestSlot,
    pub output: ChestSlot,
    pub progress: f32,
    pub powered: bool,
}

/// A computer: a passive cable consumer that, while powered (cable-
/// connected to a running steam engine), enables the 3D printers cabled
/// to it.
#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub struct ComputerState {
    pub powered: bool,
}

/// A 3D printer: prints one recipe over time while `powered` (cable-
/// connected to a *powered computer*, the JS gate). `out_item == 0` is idle.
#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub struct PrinterState {
    pub out_item: u16,
    pub out_qty: u16,
    pub progress: f32,
    pub total: f32,
    pub output: ChestSlot,
    pub powered: bool,
}

/// A launch pad's assembled rocket: an ordered bottom -> top stack of part
/// item ids (engine at index 0 when flyable). Fixed-capacity so it stays
/// `Copy`; `segments` is the built tower height that caps the stack (JS
/// `segmentCount`). The flight stats / validation live in `core::rocket`,
/// which works on the `parts()` slice.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct LaunchPadState {
    parts: [u16; ROCKET_STACK_MAX],
    len: u8,
    /// Built tower segments (1..=ROCKET_STACK_MAX); caps how many parts can
    /// stack. A fresh pad starts with one segment so a minimal rocket fits.
    pub segments: u8,
}

impl Default for LaunchPadState {
    fn default() -> Self {
        Self { parts: [0; ROCKET_STACK_MAX], len: 0, segments: ROCKET_STACK_MAX as u8 }
    }
}

impl LaunchPadState {
    /// The assembled stack, bottom -> top.
    pub fn parts(&self) -> &[u16] {
        &self.parts[..self.len as usize]
    }

    /// Number of parts on the pad.
    pub fn len(&self) -> usize {
        self.len as usize
    }

    pub fn is_empty(&self) -> bool {
        self.len == 0
    }

    /// Maximum parts this pad can hold right now (its tower height).
    pub fn capacity(&self) -> usize {
        (self.segments as usize).min(ROCKET_STACK_MAX)
    }

    /// Push a part on top. Returns false if the pad is at its tower cap.
    pub fn push(&mut self, id: u16) -> bool {
        if self.len as usize >= self.capacity() {
            return false;
        }
        self.parts[self.len as usize] = id;
        self.len += 1;
        true
    }

    /// Pop the top part, or `None` if empty.
    pub fn pop(&mut self) -> Option<u16> {
        if self.len == 0 {
            return None;
        }
        self.len -= 1;
        let id = self.parts[self.len as usize];
        self.parts[self.len as usize] = 0;
        Some(id)
    }

    /// Replace the whole stack from a slice (used on load). Truncates to
    /// capacity.
    pub fn set_parts(&mut self, ids: &[u16]) {
        self.len = 0;
        for &id in ids {
            if !self.push(id) {
                break;
            }
        }
    }
}

/// Max fish one aquarium tank can hold. Fixed-size so [`AquariumState`]
/// stays `Copy`.
pub const AQUARIUM_CAP: usize = 6;

/// A placed aquarium's contents: whether it has been filled with a water
/// bucket, and the fish swimming inside (each an `AnimalKind::to_u8` wire
/// id). Fish can only be added to a watered tank. Purely visual sim - the
/// fish don't tick game state, the renderer animates them - so only the
/// species list + water flag need to persist.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub struct AquariumState {
    /// Filled with water (a water bucket was poured in). Empty tanks show
    /// only glass and refuse fish.
    pub water: bool,
    /// Species wire ids (`AnimalKind::to_u8`) of the fish inside.
    pub fish: [u8; AQUARIUM_CAP],
    /// How many entries of `fish` are live (0..=AQUARIUM_CAP).
    pub count: u8,
}

impl AquariumState {
    /// The live fish species wire ids.
    pub fn fish(&self) -> &[u8] {
        &self.fish[..(self.count as usize).min(AQUARIUM_CAP)]
    }

    /// True if the tank is at capacity.
    pub fn is_full(&self) -> bool {
        self.count as usize >= AQUARIUM_CAP
    }

    /// Add one fish (species wire id). Returns false if the tank is full.
    pub fn add_fish(&mut self, kind: u8) -> bool {
        if self.is_full() {
            return false;
        }
        self.fish[self.count as usize] = kind;
        self.count += 1;
        true
    }
}

/// Machine-specific placed state. `Copy` (every variant is fixed-size) so
/// the whole `BlockEntity` stays cheap to store/return.
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum MachineState {
    /// Plain block - no machine state (most tech blocks until their
    /// behavior lands).
    None,
    /// Storage chest contents.
    Chest(ChestInv),
    /// Furnace input/fuel/output + smelt progress.
    Furnace(FurnaceState),
    /// Bonfire: burns wood-family fuel for light + cooks / chars.
    Bonfire(BonfireState),
    /// Steam engine generator (burns coal + needs water -> powers cables).
    SteamEngine(SteamEngineState),
    /// Electric furnace consumer (smelts while powered).
    ElectricFurnace(ElectricFurnaceState),
    /// Computer (enables connected printers while powered).
    Computer(ComputerState),
    /// 3D printer (prints a job while powered).
    Printer(PrinterState),
    /// Launch pad with an assembled rocket-part stack.
    LaunchPad(LaunchPadState),
    /// Aquarium: water flag + the fish swimming inside.
    Aquarium(AquariumState),
}

impl Default for MachineState {
    fn default() -> Self {
        MachineState::None
    }
}

/// Placed-state for one cell. `Copy` + small-ish: the store holds these by
/// value.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct BlockEntity {
    /// Tile edge index (0..`num_neighbors`) the block's front faces, or
    /// [`FACING_UNSET`]. Tech-block cubes orient their front to this so a
    /// placed machine faces the player.
    pub facing: u8,
    /// Machine behavior state (chest contents, etc.).
    pub state: MachineState,
}

impl Default for BlockEntity {
    fn default() -> Self {
        Self { facing: FACING_UNSET, state: MachineState::None }
    }
}

impl BlockEntity {
    /// A facing-only entity (no machine state).
    pub fn with_facing(facing: u8) -> Self {
        Self { facing, state: MachineState::None }
    }

    /// Borrow the chest inventory if this entity is a chest.
    pub fn chest(&self) -> Option<&ChestInv> {
        match &self.state {
            MachineState::Chest(c) => Some(c),
            _ => None,
        }
    }

    /// Promote this entity to a chest (if it isn't already) and return the
    /// inventory for mutation.
    pub fn chest_mut(&mut self) -> &mut ChestInv {
        if !matches!(self.state, MachineState::Chest(_)) {
            self.state = MachineState::Chest([ChestSlot::default(); CHEST_SLOTS]);
        }
        match &mut self.state {
            MachineState::Chest(c) => c,
            _ => unreachable!(),
        }
    }

    /// Borrow the furnace state if this entity is a furnace.
    pub fn furnace(&self) -> Option<&FurnaceState> {
        match &self.state {
            MachineState::Furnace(f) => Some(f),
            _ => None,
        }
    }

    /// Promote this entity to a furnace (if it isn't already) and return
    /// its state for mutation.
    pub fn furnace_mut(&mut self) -> &mut FurnaceState {
        if !matches!(self.state, MachineState::Furnace(_)) {
            self.state = MachineState::Furnace(FurnaceState::default());
        }
        match &mut self.state {
            MachineState::Furnace(f) => f,
            _ => unreachable!(),
        }
    }

    /// Borrow the bonfire state if this entity is a bonfire.
    pub fn bonfire(&self) -> Option<&BonfireState> {
        match &self.state {
            MachineState::Bonfire(b) => Some(b),
            _ => None,
        }
    }

    /// Promote this entity to a bonfire (if it isn't already) and return
    /// its state for mutation.
    pub fn bonfire_mut(&mut self) -> &mut BonfireState {
        if !matches!(self.state, MachineState::Bonfire(_)) {
            self.state = MachineState::Bonfire(BonfireState::default());
        }
        match &mut self.state {
            MachineState::Bonfire(b) => b,
            _ => unreachable!(),
        }
    }

    pub fn steam_engine(&self) -> Option<&SteamEngineState> {
        match &self.state {
            MachineState::SteamEngine(s) => Some(s),
            _ => None,
        }
    }

    pub fn steam_engine_mut(&mut self) -> &mut SteamEngineState {
        if !matches!(self.state, MachineState::SteamEngine(_)) {
            self.state = MachineState::SteamEngine(SteamEngineState::default());
        }
        match &mut self.state {
            MachineState::SteamEngine(s) => s,
            _ => unreachable!(),
        }
    }

    pub fn electric_furnace(&self) -> Option<&ElectricFurnaceState> {
        match &self.state {
            MachineState::ElectricFurnace(e) => Some(e),
            _ => None,
        }
    }

    pub fn electric_furnace_mut(&mut self) -> &mut ElectricFurnaceState {
        if !matches!(self.state, MachineState::ElectricFurnace(_)) {
            self.state = MachineState::ElectricFurnace(ElectricFurnaceState::default());
        }
        match &mut self.state {
            MachineState::ElectricFurnace(e) => e,
            _ => unreachable!(),
        }
    }

    pub fn computer_mut(&mut self) -> &mut ComputerState {
        if !matches!(self.state, MachineState::Computer(_)) {
            self.state = MachineState::Computer(ComputerState::default());
        }
        match &mut self.state {
            MachineState::Computer(c) => c,
            _ => unreachable!(),
        }
    }

    pub fn printer(&self) -> Option<&PrinterState> {
        match &self.state {
            MachineState::Printer(p) => Some(p),
            _ => None,
        }
    }

    pub fn printer_mut(&mut self) -> &mut PrinterState {
        if !matches!(self.state, MachineState::Printer(_)) {
            self.state = MachineState::Printer(PrinterState::default());
        }
        match &mut self.state {
            MachineState::Printer(p) => p,
            _ => unreachable!(),
        }
    }

    /// Borrow the launch-pad assembly if this entity is a launch pad.
    pub fn launch_pad(&self) -> Option<&LaunchPadState> {
        match &self.state {
            MachineState::LaunchPad(l) => Some(l),
            _ => None,
        }
    }

    /// Promote this entity to a launch pad (if it isn't already) and return
    /// the assembly for mutation.
    pub fn launch_pad_mut(&mut self) -> &mut LaunchPadState {
        if !matches!(self.state, MachineState::LaunchPad(_)) {
            self.state = MachineState::LaunchPad(LaunchPadState::default());
        }
        match &mut self.state {
            MachineState::LaunchPad(l) => l,
            _ => unreachable!(),
        }
    }

    /// Borrow the aquarium contents if this entity is an aquarium.
    pub fn aquarium(&self) -> Option<&AquariumState> {
        match &self.state {
            MachineState::Aquarium(a) => Some(a),
            _ => None,
        }
    }

    /// Promote this entity to an aquarium (if it isn't already) and return
    /// its contents for mutation.
    pub fn aquarium_mut(&mut self) -> &mut AquariumState {
        if !matches!(self.state, MachineState::Aquarium(_)) {
            self.state = MachineState::Aquarium(AquariumState::default());
        }
        match &mut self.state {
            MachineState::Aquarium(a) => a,
            _ => unreachable!(),
        }
    }
}

/// Advance a 3D printer: while powered with an active job, fill the
/// progress; on completion emit the output and clear the job. Returns true
/// when a print finishes (durable change).
pub fn printer_tick(p: &mut PrinterState, dt: f32) -> bool {
    use crate::items;
    if !p.powered || p.out_item == 0 || p.total <= 0.0 {
        return false;
    }
    // Output must be empty or the same item with room.
    let out_ok = p.output.count == 0
        || (p.output.item == p.out_item && p.output.count < items::stack_size(p.out_item));
    if !out_ok {
        return false;
    }
    p.progress += dt / p.total;
    if p.progress >= 1.0 {
        if p.output.count == 0 {
            p.output.item = p.out_item;
        }
        p.output.count = p.output.count.saturating_add(p.out_qty);
        p.out_item = 0;
        p.out_qty = 0;
        p.progress = 0.0;
        p.total = 0.0;
        return true;
    }
    false
}

/// Initialise the machine state for a freshly-placed tech block, so the
/// machine tick processes it (computers/printers especially must exist as
/// their own state for the power graph). No-op for blocks without state.
pub fn init_machine_state(e: &mut BlockEntity, b: crate::blocks::Block) {
    use crate::blocks::Block;
    match b {
        Block::Furnace => {
            e.furnace_mut();
        }
        Block::Bonfire => {
            e.bonfire_mut();
        }
        Block::SteamEngine => {
            e.steam_engine_mut();
        }
        Block::ElectricFurnace => {
            e.electric_furnace_mut();
        }
        Block::Computer => {
            e.computer_mut();
        }
        Block::Printer3D => {
            e.printer_mut();
        }
        Block::StorageChest => {
            e.chest_mut();
        }
        Block::LaunchPad => {
            e.launch_pad_mut();
        }
        Block::Aquarium => {
            e.aquarium_mut();
        }
        _ => {}
    }
}

/// Advance a steam engine: burn coal to stay "running". Lights a fresh unit
/// of coal when the current burn runs out. Returns true on a state change
/// worth persisting (a coal consumed).
pub fn steam_engine_tick(s: &mut SteamEngineState, dt: f32) -> bool {
    use crate::items;
    // No water -> idle: don't burn coal (the burn is frozen, not wasted).
    if !s.has_water {
        return false;
    }
    let mut changed = false;
    if s.burn_time <= 0.0 && s.fuel.count > 0 && items::is_fuel(s.fuel.item) {
        s.fuel.count -= 1;
        if s.fuel.count == 0 {
            s.fuel.item = 0;
        }
        s.burn_time = STEAM_BURN_S_PER_COAL;
        changed = true;
    }
    if s.burn_time > 0.0 {
        s.burn_time -= dt;
        if s.burn_time < 0.0 {
            s.burn_time = 0.0;
        }
    }
    changed
}

/// Advance an electric furnace: smelt while `powered`, no fuel. Returns
/// true when a smelt completes (durable change).
pub fn electric_furnace_tick(e: &mut ElectricFurnaceState, dt: f32) -> bool {
    use crate::items;
    let Some((out_item, out_qty)) = items::smelt_output(e.input.item) else {
        e.progress = 0.0;
        return false;
    };
    if !e.powered || e.input.count == 0 {
        e.progress = 0.0;
        return false;
    }
    let out_ok = e.output.count == 0
        || (e.output.item == out_item && e.output.count < items::stack_size(out_item));
    if !out_ok {
        return false;
    }
    /* Same per-item recipe time as the coal furnace, kept 5x faster (the
     * ELEC/COAL ratio) so both stay configurable from one recipes.yaml time. */
    let base_s = crate::crafting::smelt_time_s(out_item).unwrap_or(FURNACE_SMELT_TIME_S);
    let elec_s = (base_s * ELEC_SMELT_TIME_S / FURNACE_SMELT_TIME_S).max(0.1);
    e.progress += dt / elec_s;
    if e.progress >= 1.0 {
        e.progress = 0.0;
        e.input.count -= 1;
        if e.input.count == 0 {
            e.input.item = 0;
        }
        if e.output.count == 0 {
            e.output.item = out_item;
        }
        e.output.count = e.output.count.saturating_add(out_qty * ELEC_YIELD_MULT);
        return true;
    }
    false
}

/// Advance one furnace by `dt` seconds. Burns a unit of fuel when the
/// current charge runs out (and there is something to smelt), advances the
/// smelt, and on completion consumes one input + emits the smelt output.
/// Returns true when a durable change happened (a smelt completed), so the
/// caller can persist. Mirrors the JS `FurnaceManager.update`.
pub fn furnace_tick(f: &mut FurnaceState, dt: f32) -> bool {
    use crate::items;
    // Nothing valid to smelt -> idle, progress resets.
    let Some((out_item, out_qty)) = items::smelt_output(f.input.item) else {
        f.progress = 0.0;
        return false;
    };
    if f.input.count == 0 {
        f.progress = 0.0;
        return false;
    }
    // Output must be empty or the same item with room.
    let out_ok =
        f.output.count == 0 || (f.output.item == out_item && f.output.count < items::stack_size(out_item));
    if !out_ok {
        return false;
    }
    // Light fresh fuel when the current charge is spent.
    if f.fuel_remaining == 0 {
        if f.fuel.count > 0 && items::is_fuel(f.fuel.item) {
            f.fuel.count -= 1;
            if f.fuel.count == 0 {
                f.fuel.item = 0;
            }
            f.fuel_remaining = FUEL_PER_COAL;
        } else {
            f.progress = 0.0;
            return false;
        }
    }
    /* Per-item smelt time from the recipe's `time:` (recipes.yaml), so iron
     * (10 s), cooked fish, glass, etc. are each tunable; falls back to the
     * compiled-in default for an item with no furnace recipe. */
    let smelt_s = crate::crafting::smelt_time_s(out_item).unwrap_or(FURNACE_SMELT_TIME_S).max(0.1);
    f.progress += dt / smelt_s;
    if f.progress >= 1.0 {
        f.progress = 0.0;
        f.input.count -= 1;
        if f.input.count == 0 {
            f.input.item = 0;
        }
        if f.output.count == 0 {
            f.output.item = out_item;
        }
        f.output.count += out_qty;
        f.fuel_remaining -= 1;
        return true;
    }
    false
}

/// Seconds of burn one unit of a bonfire fuel provides, or 0 if the item
/// isn't bonfire fuel. Sticks are the cheap starter fuel; logs burn longer;
/// charcoal / coal are the dense long-burn fuels. Tuned in bonfire.yaml.
pub fn bonfire_fuel_seconds(item: u16) -> f32 {
    use crate::blocks::Block;
    use crate::items;
    let c = crate::config::bonfire();
    if item == items::STICK {
        c.stick_burn_s
    } else if item == items::from_block(Block::Wood) {
        c.log_burn_s
    } else if item == items::CHARCOAL {
        c.charcoal_burn_s
    } else if item == items::COAL {
        c.coal_burn_s
    } else {
        0.0
    }
}

/// True if `item` can fuel a bonfire (any wood-family fuel).
pub fn is_bonfire_fuel(item: u16) -> bool {
    bonfire_fuel_seconds(item) > 0.0
}

/// Advance one bonfire by `dt`. Unlike the furnace it burns fuel
/// *continuously* to stay lit: `burn_s` drains every tick, and when it
/// runs out a fresh unit of fuel is lit from the fuel slot (keeping the
/// fire alive as long as you feed it logs / sticks). While lit it cooks the
/// input slot (raw meat / fish -> cooked, log -> charcoal) via the shared
/// `smelt_output` map. Returns true on a durable change (fuel lit, smelt
/// completed, or the fire going out) so the caller persists.
pub fn bonfire_tick(b: &mut BonfireState, dt: f32) -> bool {
    use crate::items;
    let mut changed = false;
    /* Light fresh fuel when the current burn is spent. */
    if b.burn_s <= 0.0 {
        if b.fuel.count > 0 && is_bonfire_fuel(b.fuel.item) {
            let secs = bonfire_fuel_seconds(b.fuel.item);
            b.fuel.count -= 1;
            if b.fuel.count == 0 {
                b.fuel.item = 0;
            }
            b.burn_s = secs;
            changed = true;
        } else {
            /* Out of fuel: dark + cold. Reset cook so it restarts fresh
             * when relit. */
            if b.cook_progress != 0.0 {
                b.cook_progress = 0.0;
                changed = true;
            }
            return changed;
        }
    }
    /* Burn down (for light). */
    let was_lit = b.burn_s > 0.0;
    b.burn_s -= dt;
    if b.burn_s <= 0.0 {
        b.burn_s = 0.0;
        if was_lit {
            changed = true; /* just went out - persist the dark state */
        }
    }
    /* Cook whatever is loaded, if the fire is (still) lit and the output
     * has room. */
    if b.burn_s > 0.0 {
        if let Some((out_item, out_qty)) = items::smelt_output(b.input.item) {
            let out_ok = b.output.count == 0
                || (b.output.item == out_item && b.output.count < items::stack_size(out_item));
            if b.input.count > 0 && out_ok {
                let cook_time = crate::config::bonfire().cook_time_s.max(0.01);
                b.cook_progress += dt / cook_time;
                if b.cook_progress >= 1.0 {
                    b.cook_progress = 0.0;
                    b.input.count -= 1;
                    if b.input.count == 0 {
                        b.input.item = 0;
                    }
                    if b.output.count == 0 {
                        b.output.item = out_item;
                    }
                    b.output.count = b.output.count.saturating_add(out_qty);
                    changed = true;
                }
            } else {
                b.cook_progress = 0.0;
            }
        } else {
            b.cook_progress = 0.0;
        }
    }
    changed
}

/* ------------------------------------------------------------------ */
/* ASCII record codec - the single serialization every consumer of a
 * placed entity shares: the client's localStorage save
 * (persistence::save_block_entities), the server's per-room saves, and
 * the MP BENTITY_DIFF wire message. Format (':'-separated fields, ','
 * lists - safe on both kv backends and inside the CSV wire framing):
 *   `tile:depth:facing`                        - plain block
 *   `tile:depth:facing:c:idx,item,count,...`   - chest (non-empty slots)
 *   `tile:depth:facing:f:in,inc,fl,flc,o,oc,fr`- furnace (progress is
 *                                                transient, not carried)
 *   `:s:` steam engine, `:e:` electric furnace, `:k:` computer,
 *   `:p:` printer, `:l:` launch pad (segments, part ids bottom->top),
 *   `:q:` aquarium (water flag, then the fish species wire ids).
 * Changing this format breaks existing saves - extend, don't rework. */

/// Serialise one placed entity to its record string.
pub fn record_write(tile: i32, depth: i32, e: &BlockEntity) -> String {
    let mut rec = format!("{tile}:{depth}:{}", e.facing);
    match &e.state {
        MachineState::None => {}
        MachineState::Chest(chest) => {
            rec.push_str(":c:");
            let mut first = true;
            for (i, s) in chest.iter().enumerate() {
                if s.count > 0 {
                    if !first {
                        rec.push(',');
                    }
                    rec.push_str(&format!("{i},{},{}", s.item, s.count));
                    first = false;
                }
            }
        }
        MachineState::Furnace(f) => {
            rec.push_str(&format!(
                ":f:{},{},{},{},{},{},{}",
                f.input.item,
                f.input.count,
                f.fuel.item,
                f.fuel.count,
                f.output.item,
                f.output.count,
                f.fuel_remaining
            ));
        }
        MachineState::Bonfire(b) => {
            /* input, fuel, output stacks + whole seconds of burn left
             * (cook_progress is transient, like the furnace progress). */
            rec.push_str(&format!(
                ":b:{},{},{},{},{},{},{}",
                b.input.item,
                b.input.count,
                b.fuel.item,
                b.fuel.count,
                b.output.item,
                b.output.count,
                b.burn_s.max(0.0) as u32
            ));
        }
        MachineState::SteamEngine(s) => {
            rec.push_str(&format!(":s:{},{}", s.fuel.item, s.fuel.count));
        }
        MachineState::ElectricFurnace(e) => {
            rec.push_str(&format!(
                ":e:{},{},{},{}",
                e.input.item, e.input.count, e.output.item, e.output.count
            ));
        }
        MachineState::Computer(_) => {
            rec.push_str(":k:");
        }
        MachineState::Printer(pr) => {
            rec.push_str(&format!(
                ":p:{},{},{},{},{}",
                pr.out_item,
                pr.out_qty,
                pr.total as u32,
                pr.output.item,
                pr.output.count
            ));
        }
        MachineState::LaunchPad(l) => {
            /* segments, then the bottom -> top part ids. */
            rec.push_str(&format!(":l:{}", l.segments));
            for &id in l.parts() {
                rec.push_str(&format!(",{id}"));
            }
        }
        MachineState::Aquarium(a) => {
            /* water flag, then each fish species wire id. */
            rec.push_str(&format!(":q:{}", a.water as u8));
            for &k in a.fish() {
                rec.push_str(&format!(",{k}"));
            }
        }
    }
    rec
}

/// Parse one record back into `(tile, depth, entity)`. Malformed
/// records return `None` (callers skip them, keeping the rest).
pub fn record_parse(rec: &str) -> Option<(i32, i32, BlockEntity)> {
    let nums = |s: &str| -> Vec<u32> {
        s.split(',').filter_map(|x| x.trim().parse::<u32>().ok()).collect()
    };
    let parts: Vec<&str> = rec.split(':').collect();
    if parts.len() < 3 {
        return None;
    }
    let (Ok(tile), Ok(depth), Ok(facing)) = (
        parts[0].trim().parse::<i32>(),
        parts[1].trim().parse::<i32>(),
        parts[2].trim().parse::<u8>(),
    ) else {
        return None;
    };
    let mut e = BlockEntity::with_facing(facing);
    match parts.get(3).copied() {
        Some("c") => {
            let chest = e.chest_mut();
            for triple in nums(parts.get(4).copied().unwrap_or("")).chunks_exact(3) {
                let idx = triple[0] as usize;
                if idx < CHEST_SLOTS {
                    chest[idx] = ChestSlot { item: triple[1] as u16, count: triple[2] as u16 };
                }
            }
        }
        Some("f") => {
            let v = nums(parts.get(4).copied().unwrap_or(""));
            if v.len() >= 7 {
                let f = e.furnace_mut();
                f.input = ChestSlot { item: v[0] as u16, count: v[1] as u16 };
                f.fuel = ChestSlot { item: v[2] as u16, count: v[3] as u16 };
                f.output = ChestSlot { item: v[4] as u16, count: v[5] as u16 };
                f.fuel_remaining = v[6] as u16;
            }
        }
        Some("b") => {
            let v = nums(parts.get(4).copied().unwrap_or(""));
            if v.len() >= 7 {
                let b = e.bonfire_mut();
                b.input = ChestSlot { item: v[0] as u16, count: v[1] as u16 };
                b.fuel = ChestSlot { item: v[2] as u16, count: v[3] as u16 };
                b.output = ChestSlot { item: v[4] as u16, count: v[5] as u16 };
                b.burn_s = v[6] as f32;
            }
        }
        Some("s") => {
            let v = nums(parts.get(4).copied().unwrap_or(""));
            if v.len() >= 2 {
                e.steam_engine_mut().fuel = ChestSlot { item: v[0] as u16, count: v[1] as u16 };
            }
        }
        Some("e") => {
            let v = nums(parts.get(4).copied().unwrap_or(""));
            if v.len() >= 4 {
                let ef = e.electric_furnace_mut();
                ef.input = ChestSlot { item: v[0] as u16, count: v[1] as u16 };
                ef.output = ChestSlot { item: v[2] as u16, count: v[3] as u16 };
            }
        }
        Some("k") => {
            e.computer_mut();
        }
        Some("p") => {
            let v = nums(parts.get(4).copied().unwrap_or(""));
            if v.len() >= 5 {
                let pr = e.printer_mut();
                pr.out_item = v[0] as u16;
                pr.out_qty = v[1] as u16;
                pr.total = v[2] as f32;
                pr.output = ChestSlot { item: v[3] as u16, count: v[4] as u16 };
            }
        }
        Some("l") => {
            /* segments, then the part ids bottom -> top. */
            let v = nums(parts.get(4).copied().unwrap_or(""));
            let pad = e.launch_pad_mut();
            if let Some(&seg) = v.first() {
                pad.segments = (seg as u8).clamp(1, ROCKET_STACK_MAX as u8);
            }
            let ids: Vec<u16> = v.iter().skip(1).map(|&n| n as u16).collect();
            pad.set_parts(&ids);
        }
        Some("q") => {
            /* water flag, then the fish species wire ids. */
            let v = nums(parts.get(4).copied().unwrap_or(""));
            let aq = e.aquarium_mut();
            if let Some(&w0) = v.first() {
                aq.water = w0 != 0;
            }
            for &k in v.iter().skip(1) {
                aq.add_fish(k as u8);
            }
        }
        _ => {}
    }
    Some((tile, depth, e))
}

/// Add `count` of `item` to a chest, topping up matching stacks first then
/// filling empty slots. Returns the leftover that didn't fit.
pub fn chest_add(inv: &mut ChestInv, item: u16, count: u16, stack_max: u16) -> u16 {
    let mut remaining = count;
    let stack_max = stack_max.max(1);
    for s in inv.iter_mut() {
        if remaining == 0 {
            break;
        }
        if s.count > 0 && s.item == item && s.count < stack_max {
            let add = (stack_max - s.count).min(remaining);
            s.count += add;
            remaining -= add;
        }
    }
    for s in inv.iter_mut() {
        if remaining == 0 {
            break;
        }
        if s.count == 0 {
            s.item = item;
            let add = stack_max.min(remaining);
            s.count = add;
            remaining -= add;
        }
    }
    remaining
}

/// Take the whole stack from chest slot `idx`, clearing it. Returns
/// `(item, count)` or `None` if the slot is empty / out of range.
pub fn chest_take(inv: &mut ChestInv, idx: usize) -> Option<(u16, u16)> {
    let s = inv.get_mut(idx)?;
    if s.count == 0 {
        return None;
    }
    let out = (s.item, s.count);
    *s = ChestSlot::default();
    Some(out)
}

/// Sparse map of placed-block state, keyed by `tile * WORLD_MAX_DEPTH +
/// depth` (the same packing the voxel grid uses).
#[derive(Clone, Default)]
pub struct BlockEntityStore {
    map: HashMap<u32, BlockEntity>,
}

impl BlockEntityStore {
    #[inline]
    fn key(tile: i32, depth: i32) -> u32 {
        (tile as u32) * (WORLD_MAX_DEPTH as u32) + depth as u32
    }

    pub fn new() -> Self {
        Self::default()
    }

    pub fn is_empty(&self) -> bool {
        self.map.is_empty()
    }

    pub fn len(&self) -> usize {
        self.map.len()
    }

    pub fn get(&self, tile: i32, depth: i32) -> Option<BlockEntity> {
        self.map.get(&Self::key(tile, depth)).copied()
    }

    /// Mutable borrow of an existing entity.
    pub fn get_mut(&mut self, tile: i32, depth: i32) -> Option<&mut BlockEntity> {
        self.map.get_mut(&Self::key(tile, depth))
    }

    /// Get the entity for a cell, inserting a default one if absent (used
    /// when a machine first needs state, e.g. opening a fresh chest).
    pub fn entry(&mut self, tile: i32, depth: i32) -> &mut BlockEntity {
        self.map.entry(Self::key(tile, depth)).or_default()
    }

    pub fn set(&mut self, tile: i32, depth: i32, e: BlockEntity) {
        self.map.insert(Self::key(tile, depth), e);
    }

    pub fn remove(&mut self, tile: i32, depth: i32) {
        self.map.remove(&Self::key(tile, depth));
    }

    /// Facing for a cell, or [`FACING_UNSET`] if it has no entity.
    pub fn facing(&self, tile: i32, depth: i32) -> u8 {
        self.map.get(&Self::key(tile, depth)).map(|e| e.facing).unwrap_or(FACING_UNSET)
    }

    /// Advance every machine by `dt` seconds (furnace smelt, later
    /// generators / printer). Returns true if any furnace completed a
    /// smelt this tick, so the caller can persist the durable change.
    pub fn tick(&mut self, dt: f32) -> bool {
        let mut changed = false;
        for e in self.map.values_mut() {
            match &mut e.state {
                MachineState::Furnace(f) => changed |= furnace_tick(f, dt),
                MachineState::Bonfire(b) => changed |= bonfire_tick(b, dt),
                MachineState::SteamEngine(s) => changed |= steam_engine_tick(s, dt),
                MachineState::ElectricFurnace(ef) => changed |= electric_furnace_tick(ef, dt),
                MachineState::Printer(p) => changed |= printer_tick(p, dt),
                _ => {}
            }
        }
        changed
    }

    /// Iterate `(tile, depth, entity)` - used by the save path to
    /// serialise the whole store.
    pub fn iter(&self) -> impl Iterator<Item = (i32, i32, BlockEntity)> + '_ {
        self.map.iter().map(|(&k, &e)| {
            let depth = (k % WORLD_MAX_DEPTH as u32) as i32;
            let tile = (k / WORLD_MAX_DEPTH as u32) as i32;
            (tile, depth, e)
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn set_get_remove_roundtrip() {
        let mut s = BlockEntityStore::new();
        assert!(s.is_empty());
        assert_eq!(s.facing(5, 3), FACING_UNSET);

        s.set(5, 3, BlockEntity::with_facing(2));
        assert_eq!(s.len(), 1);
        assert_eq!(s.facing(5, 3), 2);
        assert_eq!(s.get(5, 3), Some(BlockEntity::with_facing(2)));
        // A different cell is independent.
        assert_eq!(s.facing(5, 4), FACING_UNSET);

        s.remove(5, 3);
        assert!(s.is_empty());
        assert_eq!(s.facing(5, 3), FACING_UNSET);
    }

    #[test]
    fn chest_add_tops_up_then_fills_and_overflows() {
        let mut inv: ChestInv = [ChestSlot::default(); CHEST_SLOTS];
        // First add lands in slot 0.
        assert_eq!(chest_add(&mut inv, 7, 10, 64), 0);
        assert_eq!(inv[0], ChestSlot { item: 7, count: 10 });
        // Same item tops up the existing stack, not a new slot.
        assert_eq!(chest_add(&mut inv, 7, 5, 64), 0);
        assert_eq!(inv[0], ChestSlot { item: 7, count: 15 });
        assert_eq!(inv[1].count, 0);
        // A different item takes the next empty slot.
        assert_eq!(chest_add(&mut inv, 9, 3, 64), 0);
        assert_eq!(inv[1], ChestSlot { item: 9, count: 3 });
    }

    #[test]
    fn chest_add_returns_overflow_when_full() {
        let mut inv: ChestInv = [ChestSlot { item: 1, count: 1 }; CHEST_SLOTS];
        // Every slot holds item 1 at 1/1 stack-max -> no room for item 2.
        assert_eq!(chest_add(&mut inv, 2, 5, 1), 5);
    }

    #[test]
    fn chest_take_clears_slot() {
        let mut inv: ChestInv = [ChestSlot::default(); CHEST_SLOTS];
        inv[4] = ChestSlot { item: 3, count: 12 };
        assert_eq!(chest_take(&mut inv, 4), Some((3, 12)));
        assert_eq!(inv[4].count, 0);
        assert_eq!(chest_take(&mut inv, 4), None);
        assert_eq!(chest_take(&mut inv, 999), None);
    }

    #[test]
    fn furnace_smelts_over_time_consuming_fuel() {
        use crate::items::{COAL, COPPER, COPPER_INGOT};
        let mut f = FurnaceState::default();
        f.input = ChestSlot { item: COPPER, count: 2 };
        f.fuel = ChestSlot { item: COAL, count: 1 };
        // Half the smelt time -> in progress, no output yet, one coal lit.
        assert!(!furnace_tick(&mut f, FURNACE_SMELT_TIME_S * 0.5));
        assert_eq!(f.output.count, 0);
        assert_eq!(f.fuel.count, 0); // coal consumed into the burn charge
        assert_eq!(f.fuel_remaining, FUEL_PER_COAL);
        assert!(f.progress > 0.0);
        // Finish the smelt: one ingot out, one ore consumed, charge -1.
        assert!(furnace_tick(&mut f, FURNACE_SMELT_TIME_S * 0.6));
        assert_eq!(f.output, ChestSlot { item: COPPER_INGOT, count: 1 });
        assert_eq!(f.input.count, 1);
        assert_eq!(f.fuel_remaining, FUEL_PER_COAL - 1);
    }

    #[test]
    fn steam_engine_burns_coal_to_run() {
        use crate::items::COAL;
        let mut s = SteamEngineState::default();
        assert!(!s.running());
        s.fuel = ChestSlot { item: COAL, count: 2 };
        // Coal but no water -> stays idle, no coal burned.
        assert!(!steam_engine_tick(&mut s, 1.0));
        assert_eq!(s.fuel.count, 2);
        assert!(!s.running());
        // With water, lights a unit of coal -> running.
        s.has_water = true;
        assert!(steam_engine_tick(&mut s, 1.0));
        assert_eq!(s.fuel.count, 1);
        assert!(s.running());
        assert!((s.burn_time - (STEAM_BURN_S_PER_COAL - 1.0)).abs() < 1e-3);
        // Burns down without lighting more until empty.
        let _ = steam_engine_tick(&mut s, STEAM_BURN_S_PER_COAL); // exhaust current
        // next tick lights the last coal
        assert!(steam_engine_tick(&mut s, 0.0));
        assert_eq!(s.fuel.count, 0);
    }

    #[test]
    fn electric_furnace_smelts_only_when_powered() {
        use crate::items::{COPPER, COPPER_INGOT};
        let mut e = ElectricFurnaceState::default();
        e.input = ChestSlot { item: COPPER, count: 1 };
        // Unpowered -> no progress.
        assert!(!electric_furnace_tick(&mut e, ELEC_SMELT_TIME_S));
        assert_eq!(e.output.count, 0);
        // Powered -> smelts (double yield, no fuel).
        e.powered = true;
        assert!(electric_furnace_tick(&mut e, ELEC_SMELT_TIME_S));
        assert_eq!(e.output, ChestSlot { item: COPPER_INGOT, count: ELEC_YIELD_MULT });
        assert_eq!(e.input.count, 0);
    }

    #[test]
    fn furnace_idles_without_fuel_or_input() {
        use crate::items::COPPER;
        let mut f = FurnaceState::default();
        // Input but no fuel -> no progress.
        f.input = ChestSlot { item: COPPER, count: 1 };
        assert!(!furnace_tick(&mut f, FURNACE_SMELT_TIME_S));
        assert_eq!(f.output.count, 0);
        assert_eq!(f.progress, 0.0);
        // Non-smeltable input -> idle.
        let mut g = FurnaceState::default();
        g.input = ChestSlot { item: 9999, count: 5 };
        g.fuel = ChestSlot { item: crate::items::COAL, count: 1 };
        assert!(!furnace_tick(&mut g, FURNACE_SMELT_TIME_S));
        assert_eq!(g.fuel.count, 1); // no fuel wasted with nothing to smelt
    }

    #[test]
    fn chest_mut_promotes_none_to_chest() {
        let mut e = BlockEntity::with_facing(2);
        assert!(e.chest().is_none());
        e.chest_mut()[0] = ChestSlot { item: 5, count: 1 };
        assert_eq!(e.facing, 2);
        assert_eq!(e.chest().unwrap()[0], ChestSlot { item: 5, count: 1 });
    }

    #[test]
    fn distinct_cells_dont_alias_in_key() {
        let mut s = BlockEntityStore::new();
        // (tile=1, depth=0) and (tile=0, depth=WORLD_MAX_DEPTH-1) must not
        // collide - the key is tile*MAX_DEPTH + depth.
        s.set(1, 0, BlockEntity::with_facing(1));
        s.set(0, WORLD_MAX_DEPTH - 1, BlockEntity::with_facing(4));
        assert_eq!(s.facing(1, 0), 1);
        assert_eq!(s.facing(0, WORLD_MAX_DEPTH - 1), 4);
        assert_eq!(s.len(), 2);
    }

    #[test]
    fn iter_yields_decoded_coords() {
        let mut s = BlockEntityStore::new();
        s.set(7, 2, BlockEntity::with_facing(3));
        let v: Vec<_> = s.iter().collect();
        assert_eq!(v, vec![(7, 2, BlockEntity::with_facing(3))]);
    }

    #[test]
    fn record_codec_round_trips_every_machine() {
        use crate::items::{COAL, COPPER, COPPER_INGOT, FUEL_TANK, ROCKET_ENGINE};
        /* Plain facing-only entity: shortest record form. */
        let plain = BlockEntity::with_facing(4);
        assert_eq!(record_write(9, 70, &plain), "9:70:4");
        assert_eq!(record_parse("9:70:4"), Some((9, 70, plain)));

        /* Furnace mid-burn (progress deliberately not carried). */
        let mut fe = BlockEntity::with_facing(1);
        {
            let f = fe.furnace_mut();
            f.input = ChestSlot { item: COPPER, count: 3 };
            f.fuel = ChestSlot { item: COAL, count: 2 };
            f.output = ChestSlot { item: COPPER_INGOT, count: 5 };
            f.fuel_remaining = 6;
            f.progress = 0.75; /* transient - must NOT round-trip */
        }
        let rec = record_write(41, 64, &fe);
        let (t, d, back) = record_parse(&rec).unwrap();
        assert_eq!((t, d), (41, 64));
        let f = back.furnace().unwrap();
        assert_eq!(f.input, ChestSlot { item: COPPER, count: 3 });
        assert_eq!(f.fuel_remaining, 6);
        assert_eq!(f.progress, 0.0);

        /* Chest with sparse slots. */
        let mut ch = BlockEntity::with_facing(0);
        ch.chest_mut()[4] = ChestSlot { item: COAL, count: 12 };
        ch.chest_mut()[26] = ChestSlot { item: COPPER, count: 1 };
        let (_, _, back) = record_parse(&record_write(5, 66, &ch)).unwrap();
        let c = back.chest().unwrap();
        assert_eq!(c[4], ChestSlot { item: COAL, count: 12 });
        assert_eq!(c[26], ChestSlot { item: COPPER, count: 1 });
        assert_eq!(c[0].count, 0);

        /* Launch pad stack survives in order. */
        let mut lp = BlockEntity::with_facing(2);
        {
            let pad = lp.launch_pad_mut();
            pad.segments = 4;
            pad.push(ROCKET_ENGINE);
            pad.push(FUEL_TANK);
        }
        let (_, _, back) = record_parse(&record_write(3, 65, &lp)).unwrap();
        let pad = back.launch_pad().unwrap();
        assert_eq!(pad.segments, 4);
        assert_eq!(pad.parts(), &[ROCKET_ENGINE, FUEL_TANK]);

        /* Aquarium: water flag + fish list survive in order. */
        let mut aq = BlockEntity::with_facing(1);
        {
            let a = aq.aquarium_mut();
            a.water = true;
            assert!(a.add_fish(7)); /* minnow */
            assert!(a.add_fish(11)); /* reef fish */
        }
        let (_, _, back) = record_parse(&record_write(8, 60, &aq)).unwrap();
        let a = back.aquarium().unwrap();
        assert!(a.water);
        assert_eq!(a.fish(), &[7, 11]);
        /* An empty, dry tank round-trips to water=false / no fish. */
        let mut dry = BlockEntity::with_facing(0);
        dry.aquarium_mut();
        let (_, _, back) = record_parse(&record_write(1, 1, &dry)).unwrap();
        let a = back.aquarium().unwrap();
        assert!(!a.water);
        assert_eq!(a.count, 0);

        /* Garbage rejects cleanly. */
        assert_eq!(record_parse(""), None);
        assert_eq!(record_parse("1:2"), None);
        assert_eq!(record_parse("a:b:c"), None);
    }

    #[test]
    fn aquarium_respects_capacity() {
        let mut a = AquariumState::default();
        for i in 0..AQUARIUM_CAP {
            assert!(a.add_fish(i as u8), "fish {i} fits");
        }
        assert!(a.is_full());
        assert!(!a.add_fish(99), "over-capacity add is rejected");
        assert_eq!(a.fish().len(), AQUARIUM_CAP);
    }
}
