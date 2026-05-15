# Hex-grid water flow plan

Reference: https://minecraft.wiki/w/Water

This is a **planning document** for porting Minecraft's cell-based water
flow onto Tenebris's Goldberg hex columns. **No code is being written
here** - this file specifies the data model, rules, persistence wiring,
and rendering plumbing so the implementation lands in one coherent
pass.

The existing planet-wide sea-level "ocean cap" (`water.yaml`,
`shaders/water.glsl`) stays untouched. This plan covers **per-voxel
water**: streams, ponds, dripping caves, the cube-of-water-you-just-
placed - the stuff that needs to actually *move*.

---

## 1. What we're starting from

- `BLOCK_WATER = 1` already exists in `core/blocks.h` and is used by
  worldgen to flood the seafloor layers below sea level.
  `world_is_water_at()` already gates player physics on it.
- Each tile owns a 128-cell radial column: cell 0 is bedrock,
  cell 127 is sky, "down" is radially inward. Gravity at a tile
  is the negative of its surface normal.
- Each tile has **5 or 6 horizontal neighbours** via
  `goldberg_tile_t.edge_neighbours[k]` (5 for the 12 pentagons at
  the icosahedron corners; 6 everywhere else). The order around
  the tile is fixed at construction.
- The mesher (`client/hex_mesher.c`) already emits a top cap, a
  bottom cap, and side quads per cell. Side-quad UV runs
  `V=0` at the inner (radially down) edge and `V=1` at the outer
  (radially up) edge. The atlas U-slot is picked from
  `block_face_tile(block, FACE_CAP_SIDE)`.
- Per-edit persistence is mandatory (`CLAUDE.md` "All world edits
  must persist immediately"). MP path: `saves_write_tile()` per
  edit. SP path: `persistence_save_tile()` per edit.

What's missing: water has **no flow state**. A `BLOCK_WATER`
voxel today is just "this cell contains water"; it doesn't know
whether it's a source, how far it is from one, or which way it's
moving. That's what this plan adds.

---

## 2. Vocabulary (mapping MC concepts onto hex)

| Minecraft term      | Hex-grid analogue                                                          |
|---------------------|----------------------------------------------------------------------------|
| source block        | level-0 voxel, "infinite" supply, drives the flow field                    |
| flowing block       | level-1..L_MAX voxel, gets its supply from a higher-level neighbour        |
| falling water       | a flowing voxel whose support is the cell directly above (radially out)    |
| level (0..7 in MC)  | level (0..`WATER_LEVEL_MAX`) - see section 4 for the chosen max            |
| 4 horizontal neighbours | 5 or 6 horizontal neighbours (`num_neighbors` on the goldberg tile)    |
| "down"              | radially inward along the tile centre direction; same column, depth-1      |
| "up"                | radially outward; same column, depth+1                                     |
| block update tick   | scheduled flow tick - see section 7                                        |

The single most important difference from Minecraft: **"down" is not
a global vector**, it's per-tile. The column structure already
encodes this for us - depth-1 is always "more down" than depth, no
matter which face of the planet you're standing on. So gravity-
preference logic is just `depth--` first, then look sideways.

---

## 3. State storage

Block ID alone (`uint8_t` per voxel) can't hold "is this a source",
"what level", "is it falling" - we need a few more bits per cell.
Three options, recommend (B):

- **(A) Pack flags into the block byte.** Use the unused high bits
  of `block_t` for water-only metadata. Cheap but contaminates the
  block-type enum and forces every consumer to mask before reading
  the type. Bad fit given `block_covers_face()`, `block_face_tile()`
  switch over the raw value.

- **(B) Parallel per-voxel water-state array - RECOMMENDED.** One
  byte per voxel, allocated lazily next to `world_t::blocks`,
  mirrored just like `world_t::light` is mirrored for the lighting
  BFS. Cost: `tile_count * 128` bytes - same magnitude as the
  blocks array, ~21 MB worst case at subdivision 7. Zero when the
  cell isn't water. Layout (1 byte):

  ```
  bit 7    : 1 if source, 0 if flowing
  bit 6    : 1 if falling (cell is supported only from above),
             0 if supported horizontally
  bits 5..3: reserved (room for "stale-tick counter", "direction
             tag for renderer cache", or future fluid types -
             lava, oil)
  bits 2..0: level, 0..7 (0 = full, 7 = thinnest film)
  ```

  Source cells store level 0 with bit-7 set. Cells where the byte
  is 0 and the block is `BLOCK_WATER` are treated as legacy
  ocean fill (full, source-like, no flow ticks needed) until
  something disturbs them.

- **(C) New block IDs `BLOCK_WATER_L0..BLOCK_WATER_L7`.** Eight
  new enum values. Forces every covering / atlas / face-tile
  switch to grow eight rows. Rejected; (B) keeps the type system
  clean.

Naming: `world_t::water_state` (`uint8_t*`) plus
`core/world_water.{c,h}` for the helpers
(`water_get_level`, `water_set_source`, `water_set_flow`,
`water_clear`).

---

## 4. Level count and spread radius

Minecraft uses 8 levels (0..7) → max horizontal spread 7 blocks
from a flat source on flat ground.

For hex, recommend **`WATER_LEVEL_MAX = 7`** (same 8-step
scale) for two reasons:

- 3 bits fits cleanly in the byte layout above.
- Hex tiles are roughly 1 m across at subdivision 7, the same
  order of magnitude as MC cubes - the *visual* spread feels
  consistent.

This is a YAML knob (`water.yaml: flow.max_level`) so we can
re-tune without recompiling. See section 11.

---

## 5. Flow algorithm (per scheduled tick)

The tick fires for one (tile, depth) cell at a time, scheduled by
section 7. Pseudocode in the order the rules apply:

```
tick_water_cell(tile, depth):
  s   = water_state[tile][depth]
  blk = block_at[tile][depth]

  if blk != BLOCK_WATER:
    # Cell got drained between scheduling and firing.
    return

  # ---- Rule 1: source blocks never decay.
  if s.is_source:
    propagate_outward(tile, depth, level=0)
    return

  # ---- Rule 2: re-derive own level from neighbours.
  #
  # A flowing cell's level is (min_supplier_level + 1), where
  # suppliers are:
  #   * the cell directly above (radially out, depth+1): if it's
  #     water of any level, this cell becomes FALLING and takes
  #     the "full" level (0 in renderer; bit-6 set in state).
  #   * each of the 5/6 horizontal neighbours at the same depth,
  #     contributing (their_level + 1), clamped to L_MAX.

  supplier_level = INF
  has_overhead   = (block_at[tile][depth+1] == BLOCK_WATER)
  if has_overhead:
    # Vertical supply is unconditional - falling water doesn't
    # decay with distance, it always reads as "full" (level 0)
    # and the FALLING flag is set so the renderer animates the
    # side faces straight down.
    supplier_level = 0
    s.is_falling   = 1
  else:
    s.is_falling = 0
    for k in 0..tile.num_neighbors-1:
      n = tile.edge_neighbours[k]
      if block_at[n][depth] == BLOCK_WATER:
        n_lvl = water_state[n][depth].level
        if !water_state[n][depth].is_falling:
          # falling cells can't push sideways; they have to land
          # first.
          supplier_level = min(supplier_level, n_lvl + 1)

  if supplier_level > L_MAX:
    # No source can reach this cell - it dries up.
    block_at[tile][depth] = BLOCK_AIR
    water_state[tile][depth] = 0
    persist(tile)
    schedule_neighbours(tile, depth)
    return

  s.level = supplier_level
  water_state[tile][depth] = s

  # ---- Rule 3: try to spread.
  #
  # 3a. Down first.  If the cell at depth-1 is air or a
  #     waterloggable / drainable block, spawn flowing water
  #     there at level "full" with FALLING flag set.  The
  #     spreading cell doesn't lose its own level - falling
  #     water is unmetered until it lands.

  if can_flow_into(tile, depth - 1):
    set_flowing_water(tile, depth - 1, level=0, falling=true)
    persist(tile)
    schedule(tile, depth - 1)
    return  # vertical drain takes priority over horizontal

  # 3b. Horizontal.  Same level (own_level + 1) into any of the
  #     5/6 horizontal neighbours that the search prefers.

  if s.level < L_MAX:
    targets = choose_horizontal_targets(tile, depth, s.level)
    for n in targets:
      set_flowing_water(n, depth, level=s.level+1, falling=false)
      persist(n)
      schedule(n, depth)
```

`choose_horizontal_targets` is the hex analogue of Minecraft's
"find the nearest hole" pathfinding:

1. For each of the 5/6 horizontal neighbours that is currently
   passable (air, or water at strictly higher level), run a tiny
   BFS up to depth `WATER_SEARCH_RADIUS` (4 by default - same as
   MC) looking for a cell with an empty space below it at the
   *next* depth-1.
2. Direction(s) that reach a downward hole in the fewest steps
   win. Ties spread to all winners.
3. If no direction has a hole, spread to **all** 5/6 directions
   equally - this gives the "puddles spread out evenly when
   trapped" behaviour.

`WATER_SEARCH_RADIUS` is a YAML knob.

### Edge case: pentagons

Pentagons (`num_verts == 5`) have one fewer neighbour. Nothing
in the algorithm above cares about the count - it just iterates
`num_neighbors`. The flow visually "rotates" around the
pentagon corner the same way the rest of the world does, because
the `edge_neighbours[]` table is already laid out for it.

### Edge case: hot tiles

A heavily-edited body of water can re-trigger millions of ticks
per second if we re-schedule unconditionally. Mitigation: when
recomputing `supplier_level` produces the same level the cell
already had, **do not re-schedule any neighbours**. Only changes
propagate. This is the same "block update" idea Minecraft uses to
keep stationary water cheap.

---

## 6. Source-block spawning rule

The renewable-source rule, ported from MC:

> A flowing water cell becomes a source when, at the same depth,
> it has **two or more horizontal source-block neighbours**, AND
> the cell directly below it (depth-1) is solid (block-covers-
> face-true) OR is itself a water source.

Same 2-of-N rule MC uses on cubes; works unchanged on hex because
"horizontal source neighbours" is just a count over
`edge_neighbours[]`. Pentagons can spawn with 2-of-5 just like
hexagons spawn with 2-of-6.

Practical consequence on hex: the equivalent of MC's
"infinite-water 2x2" is now **any three tiles around a shared
corner**, since three hex tiles meeting at a corner are all
pairwise adjacent. A neat side effect of the hex topology, and
worth keeping in the design - it's a strictly *easier* infinite
water setup, which is what most players want.

This rule is checked at the **end** of a flow tick, before
re-scheduling. Promotion to source clears the FALLING flag and
forces level 0.

---

## 7. Tick scheduling

We do not run a global per-frame "tick every water cell" sweep -
that scales with the size of the ocean, not the size of the
active edit, and the column already auto-fills the seafloor with
millions of static water voxels.

Instead, a tiny scheduler:

- `core/world_water.c` owns a **ring buffer of pending (tile,
  depth) ticks**, plus a "scheduled" bitset so the same cell
  can't queue twice. Size is bounded
  (`WATER_QUEUE_CAPACITY`, YAML).
- A tick is enqueued whenever:
  - The player places, breaks, or interacts with a water voxel
    (`interact.c`).
  - A neighbour's flow tick changes its level or block (rule 5
    above).
  - The server replays world edits at load.
- Each game tick (or every Nth game tick - `flow.ticks_per_step`
  in YAML, default 5 to match MC's "5 ticks/block") the scheduler
  pops up to `WATER_MAX_TICKS_PER_STEP` cells and runs the rule
  in section 5.
- Overflowing the queue drops the oldest entries. The world will
  re-converge as soon as the player edits anything adjacent;
  worst case is a brief moment of "static" water that doesn't
  spread until poked. Acceptable - same as MC's "redstone too
  complex, gave up" tick exhaustion behaviour.

### Sleeping seas

The legacy seafloor fill (millions of static water voxels) is
**never** scheduled. A `BLOCK_WATER` cell with
`water_state == 0` is treated as a sleeping source: it acts as a
supplier for any flow tick that asks but never originates one.
Only when something disturbs it (a neighbour goes from solid to
air; the player drains a cell) does the disturbing edit enqueue
the *neighbours* of the change, and the woken cells get a
proper state byte at first tick.

---

## 8. Coordinate mapping and UV tiling

This is where the hex topology actually shows up in the
renderer. Three cases drive UV:

### 8a. Top cap (looking down at a water surface)

- **Still / source / no horizontal motion**: U,V = the existing
  hex-tile texture coords on the cap mesh. Texture sampled with
  the still-water atlas tile. Animation comes from
  `water.glsl`'s existing time-driven ripple noise, not from
  scrolling UV.
- **Flowing horizontally**: scroll the cap UV in the direction
  of the **net horizontal flow vector**. Compute that vector
  per tile as

  ```
  flow = sum over k of (neighbour_dir_k * (this.level - n.level))
  ```

  for every horizontal neighbour `n` with strictly higher level
  (it pulls from us) or strictly lower (we push toward it).
  Project onto the tangent plane of the tile centre, normalise,
  scale by `flow_uv_speed_per_level * level_diff`. The cap mesh
  already carries a `normal` per vertex from
  `emit_cap`; tangent and bitangent fall out of any consistent
  ordering of the tile's first two vertices. Bake the flow
  vector into a per-vertex attribute at mesh-build time (the
  mesher already runs per dirty tile) so the shader just adds
  `flow_xy * u_time` to the sampled UV.

### 8b. Side face (water meeting air or lower water in a neighbour)

V=0 is radially inward, V=1 is radially outward, established
by the existing `emit_side_quad` order. Two sub-cases:

- **Falling water** (bit-6 set): scroll V from 1 → 0, i.e.
  texels move toward the planet centre. Speed
  `flow_uv_speed_falling` (YAML), independent of level.
- **Horizontal-stepped water** (this cell is full, the
  neighbour cell at the same depth is water of a lower level):
  this is the visible "water step" between a deep source and a
  thinner downstream cell. Side face is drawn only on the
  outboard portion (top `(L_MAX - n.level) / L_MAX` of the
  quad), still scrolls V toward 0 to show fall-into.
- **Water against a solid wall**: see section 9 - the side
  face is omitted by the standard mesher rule, so there's no UV
  to choose. The "water wall" you SEE from inside an air pocket
  is the side face of the AIR pocket's neighbour water cell,
  drawn from the water side. Same UV rule as the two sub-cases
  above.

### 8c. Cap height variation

A flowing water cell isn't a full cube. Cap radius drops with
level:

```
cap_radius = r_top - (level / L_MAX) * cell_height * (1 -
                                                     min_film_fraction)
```

`min_film_fraction` (YAML, default ~0.12) keeps even the
thinnest film visible. Source blocks and falling-water cells
render at full height. The existing
`emit_cap`/`emit_side_quad` paths just need to be parameterised
on a per-cell cap-radius scaler instead of always using the
voxel top.

### 8d. Atlas tile picking

`block_face_tile(BLOCK_WATER, FACE_CAP_TOP)` currently returns
one atlas slot. Add a second slot for "flowing water sides"
(the directionally-scrolled animation source) and pick between
the two in the mesher:

```
u_slot = is_source_and_flat
          ? STILL_ATLAS_SLOT
          : FLOWING_ATLAS_SLOT
```

Both slots stay in the same `assets/textures/` atlas PNG so the
existing mksprite step covers them.

---

## 9. Water walls and side-face emission rules

The existing side-quad rule is "emit when the same-depth
neighbour doesn't cover the face." For water, refine to:

| This cell    | Same-depth neighbour | Emit side face?                                |
|--------------|----------------------|------------------------------------------------|
| WATER lvl A  | AIR                  | Yes - flowing texture, scroll V→0 if falling   |
| WATER lvl A  | WATER lvl A          | No - water connects, no surface here           |
| WATER lvl A  | WATER lvl B (A < B)  | Yes, partial - emit only the top
                                       (B-A)/L_MAX fraction of the quad         |
| WATER lvl A  | WATER lvl B (A > B)  | No - the OTHER cell emits the partial face;
                                       this side stays open                     |
| WATER lvl A  | solid covering       | No - water is hidden by the solid              |
| AIR          | WATER lvl A          | This row covered by the row above, from the
                                       water cell's perspective                 |

The "partial quad" case is the new piece: when two adjacent
horizontal water cells have different levels, the *deeper* cell
draws a side-face strip that bridges the level gap. UV V on that
strip runs from `level_to_v(B)` at the bottom edge (where it
meets the lower cell's cap) up to 1.0 at the outer corner.

**Top cap visibility**: a water cell's top cap is emitted as long
as the cell above is air-or-equivalent (same as today). A water
cell with another water cell on top (i.e. a submerged voxel)
emits no cap - matches the seafloor today.

### "Water wall" from inside an air pocket

When the player carves an air pocket inside a body of water,
they see water on every side. The mesher already does this
correctly for static water - the air pocket's water neighbours
emit side faces inward. With levels in play, those faces should
all be full-height (the water around the pocket is contained,
hence treated as source-like full cells) and use the **still
texture, no scroll** - because the bulk water isn't flowing.

The trigger to switch back to still texture is:
`is_source || (level == 0 && !is_falling && no_horizontal_drop)`.

---

## 10. Persistence

Per CLAUDE.md, every world-mutating action persists on the same
input frame. Flow ticks ARE world mutations - they change the
block at a cell, and the level byte. They must persist.

- **MP**: any tick that mutates a column calls
  `saves_write_tile(world, tile_idx)` at the end of the tick,
  same way `interact.c` does today. The 128-byte column payload
  is *unchanged*, we just need to also persist the parallel
  water-state column. Add `saves_write_water_state(world,
  tile_idx)` writing a sibling file (`tile_XXXX.water`) next to
  the existing `tile_XXXX.col`. Same per-edit rule, no batching.
- **SP**: same shape via `persistence_save_tile()` /
  `persistence_save_water_state()` into localStorage. Each tile's
  water-state column is 128 bytes; with ~640 tiles at the
  default subdivision the worst case is ~80 KB, easily under
  localStorage limits.

### The cost question

A heavy waterfall could fire many ticks per second across many
columns. Persisting every tick is expensive. Two mitigations:

1. **Coalesce per-column writes within a frame.** A column
   touched by N ticks in one frame writes once at end-of-frame,
   not N times. Same idea as the dirty-bitmap remesh path.
2. **Don't persist transient falling cells.** A FALLING-flag
   cell is reconstructable from its column geometry +
   neighbours; if the server crashes, reload re-derives it on
   first tick. Only persist (a) source promotions/demotions,
   (b) level changes on horizontal flow, (c) BLOCK_WATER ↔
   BLOCK_AIR transitions. Falling-only changes skip the disk
   write but still cost the in-memory state update.

Both mitigations keep the per-edit-persists invariant for
*observable* state while bounding the I/O budget.

---

## 11. Config: `water.yaml` additions

Append to the existing `water.yaml`. Schema header in the file
documents each field. All values are stored as floats; ints are
read with truncation.

```yaml
flow:
  # Source/level mechanics.
  max_level:            7      # bits 2..0 of state byte cap here
  search_radius:        4      # BFS depth for nearest-hole pathfinding
  ticks_per_step:       5      # tick rate matching MC's 5/block
  max_ticks_per_step:   256    # per-frame budget
  queue_capacity:       4096   # scheduled cell ring buffer

  # Visual.
  flow_uv_speed_falling:  1.0   # V/sec scroll on falling side faces
  flow_uv_speed_per_level: 0.25 # cap UV scroll per (level diff)
  min_film_fraction:      0.12  # min cap height as fraction of cell

  # Atlas slots in the texture sheet.
  still_atlas_slot:       <int> # set when the slot lands
  flowing_atlas_slot:     <int>

  # Promotion rules.
  source_min_neighbours:  2     # 2-of-N source-spawn threshold

  # Persistence.
  persist_falling_cells:  false # see section 10
```

Per the project rule, none of these numbers may appear as
literals in the C or GLSL - they reach the consumer through a
`config_water_flow()` getter in `core/config.c`.

---

## 12. Integration points (where each change lands)

Order of implementation when we actually do this:

1. **`core/world_water.{c,h}`** - new module. State byte
   accessors, scheduler ring buffer, BFS for nearest-hole, the
   tick function. Pure Core - SP and MP share the same code
   path.
2. **`core/world.c`** - allocate `water_state` alongside
   `blocks`, free it in `world_destroy`. Mirror it in
   `world_clone`.
3. **`core/config.c` / `assets/config/water.yaml`** - extend the
   parser for the new `flow:` section, add `config_water_flow()`
   getter.
4. **`client/interact.c`** - whenever a player edit creates or
   removes water, enqueue neighbour ticks. Already calls
   `world_set` + `persistence_save_tile`; add the water-state
   write + schedule call right next to it.
5. **`server/*`** - run the scheduler inside the server tick
   loop, alongside the existing PLAYER_CMD handler. Per-edit
   `saves_write_tile` extended with `saves_write_water_state`.
6. **`client/hex_mesher.c`** - side-face emission table
   (section 9), cap-height scaling (section 8c), per-vertex flow
   vector attribute (section 8a), pick still vs flowing atlas
   slot.
7. **`shaders/water.glsl`** - read the flow attribute, apply
   directional UV scroll, fall back to existing ripple noise
   for still cells. Mobile shader gets the same treatment with
   a simplified branch.
8. **`client/persistence.c`** - localStorage helpers for
   per-column water state.

Each step is independently testable: (1)+(2) just make the
state visible, (3) lands the config, (4)+(5) make it move, (6)
makes it look right, (7) makes it look pretty, (8) makes SP
survive a tab reload.

---

## 13. Open questions to resolve before coding

- **Pentagon source spawning**: 2-of-5 is easier than 2-of-6.
  Do we want to special-case pentagons to require 3 neighbours
  for source promotion (preserving the "you need a real basin"
  feel), or do we accept the cheaper infinite-water at the
  twelve corners as a quirk of the topology? Lean toward
  accepting it.
- **Sea-level ocean cap interaction**: the existing shader-
  drawn ocean sphere is independent of voxel water today. Do we
  want player-placed water to *connect* visually to the ocean
  cap when it touches a sea-level cell? Probably yes for tide
  pools / shoreline pumps, but it's a separate plumbing job and
  out of scope for v1.
- **Lava, oil, future fluids**: the state byte reserves bits
  5..3 for a fluid-type tag, so the algorithm generalises. v1
  ships water only. Confirm before we burn the bits on
  something else.
- **Interaction with leaves / partial blocks**: MC treats
  certain partial blocks (slabs, fences) as waterloggable. We
  don't have slabs yet; the only partial-cover block is
  `BLOCK_LEAVES`. Default for v1: leaves do **not** waterlog
  (water flows through them as if air, washing them away the
  next tick - matches MC's "spreading water washes plants").
- **MP latency for visible flow**: at 5 ticks/block, a stream
  takes ~7 game ticks to traverse 7 hexes - well under a
  second. No client-side prediction needed if the server's
  per-tick PLAYER_CMD-style broadcast covers water-state
  deltas. Confirm packet size budget once we know the per-
  frame mutation rate from playtests.

---

## 14. Out of scope for this plan

- Boats, swimming-creature AI, fish, dropped-item floating.
- Pressure-based "water pushes the player" forces - we keep the
  current "water is just a swimmable medium" physics.
- Fluid mixing (water + lava → obsidian / stone / cobble).
  Document the hook in section 5 if/when we add a second
  fluid.
- Ocean tide / sea-level cap interaction (see open questions).

When any of the above lands, it gets its own plan doc; this one
stays scoped to the per-cell water automaton.
