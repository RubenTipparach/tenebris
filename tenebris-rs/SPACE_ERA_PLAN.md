# Space Era — Rust implementation plan

Building a working rocket unlocks the **space era**: moons to visit, a space
station that runs the economy (trading, research, casino, zoo, warehouse), and
missions to other worlds gated by fuel and parts you can only get out there.

This is a planning document, not code. It maps each feature onto the existing
`tenebris-rs/` architecture so the work is "extend, don't fork" (see the repo
rules below). Read it top-to-bottom once, then implement phase by phase — each
phase is shippable on its own.

---

## Guiding rules (from CLAUDE.md — they govern every phase here)

- **Core owns shared state.** Anything that mutates authoritative state (money,
  market prices, warehouse contents, research unlocks, zoo roster, rocket cargo,
  moon worldgen) lives in `crates/tenebris-core/` so SP and MP share one path.
  Client code is rendering, input, UI, local prediction.
- **Same-frame persistence.** Every economy mutation (a sale, a bet, a research
  unlock, a warehouse deposit, a fuel purchase) writes to durable storage the
  frame it happens — never "save on quit". Mirror where `world_set` / launch-pad
  edits persist today (`interact.rs`, `rocket_screen.rs::persist`).
- **Tunables live in YAML** under `assets/config/*.yaml`, read via a
  `config_*()` getter. No magic numbers in code (prices, payouts, odds, warehouse
  tiers, fuel costs, moon resource rates). One file per subsystem
  (`economy.yaml`, `casino.yaml`, `research.yaml`, `station.yaml`, `bodies.yaml`).
- **Item UI is a slot grid with icons**, never a text list. Every new item ships
  an icon in the same change (`ui_icons.rs` map + a PNG under
  `assets/textures/items/`).
- **In-game text is 7-bit ASCII** (no em-dashes / smart quotes / underscores in
  rendered strings). Casino/market labels included.
- **UI is egui panels** drawn through `egui_layer` + the `app.rs::egui_ui`
  dispatch (like `chest_screen`, `crafting_screen`, `rocket_screen`,
  `menu::*_egui_ui`). Reuse `menu_button`, `ui_icons::slot`.
- **Input is the action layer.** New keys/verbs go through `controls.rs` +
  `controls.yaml` (Action enum + binding), surfaced in the Inputs panel.
- **Server-resume time compression.** Anything that evolves over wall-clock time
  (market prices, animal populations, resource regen) participates in the
  `world_time` catch-up dispatch (see CLAUDE.md "Time compression on server
  resume"). Add a `world_time.{rs}`-style `*_catch_up(dt)` for each.

---

## What already exists to build on

| System | Where | Reuse for |
| --- | --- | --- |
| Bodies / planets (Tenebris + Luna, Selene, Sequoia, Verdant already register) | `core/planet.rs`, `core/planet_gen.rs`, renderer body table | Moons + other worlds as real destinations |
| Rocket parts, engines, staging, TWR, `RocketRide` flight | `core/rocket.rs`, `client/rocket_ride.rs`, `client/player_ctrl.rs` | Missions, fuel budget, rocket cargo hold |
| Rocket assembly + launch UI | `client/rocket_screen.rs` | Load cargo before launch; buy parts unlocked by research |
| Crafting recipes (data-driven) | `core/crafting.rs`, `assets/config/recipes.yaml`, `client/crafting_screen.rs` | Research-gated recipe unlocks |
| Tech-tree discovery (bitset of held items) | `client/tech_tree.rs` | Research tree UI shell / progression |
| Storage chest (27-slot grid + bag bridge) | `core/block_entity.rs` (`StorageChestState`), `client/chest_screen.rs` | Station warehouse (upgradeable) + rocket cargo |
| Inventory / Bag | `core/inventory.rs`, `core/*bag*`, `client/inventory_screen.rs` | Player money purse is adjacent; cargo is a bounded Bag |
| Fauna kinds + rarity potential | `core/fauna.rs` (`AnimalKind`), `client/animals.rs` | Animal selling + zoo + rarity payout |
| Block entities + same-frame save | `core/block_entity.rs`, `client/persistence.rs` (SP), server `PLAYER_CMD` (MP) | Station structures + persisted economy state |
| Config loader pattern | `core/config.rs`, `core/rocket.rs::parse_rocket_config` | All new `*.yaml` |
| Deterministic weather/field sim | `core/weather.rs` | Stock-market price field (deterministic drift) |
| egui bridge + item-icon atlas | `client/egui_layer.rs`, `client/ui_icons.rs` | All station panels |

**Known prerequisites / related open work** (from the rocket flight pass):
- Flight balance (thrust/fuel/TWR in `rocket.yaml`) needs in-game tuning.
- "Orbit" is currently arcade (exponential drag, no orbital gravity). **Real
  travel between bodies needs an orbital-gravity + no-coast-drag model in the
  `player_ctrl` space seam** — this is Phase 0 below because moons/missions
  depend on being able to actually fly somewhere and come back.

---

## Cross-cutting foundation (do first)

### F1. Money / credits
- **Core:** add `credits: i64` to the player economy state (new
  `core/economy.rs` owning a `PlayerWallet` + free-function accessors, or a field
  on the player-persistent record). Mutators: `earn(n)`, `try_spend(n) -> bool`.
- **Persist:** same-frame; add a CSV field to the SP pose/persistence record
  (`client/persistence.rs`) and the MP save. Update the pinned persistence test.
- **HUD:** a small credits readout (top-right), `sdtx` ASCII.
- **Tests:** earn/spend/underflow guard; round-trips through save string.

### F2. `economy.yaml`
- Base buy/sell price per item id (sell < buy spread), warehouse tier costs,
  fuel price per unit, research-node costs, casino min/max bets. All values here,
  read via `config::economy()`.

### F3. `world_time` catch-up hook
- Extend the central `world_time` dispatch so market drift, animal populations,
  and resource regen fast-forward on server resume. Each subsystem registers a
  `*_catch_up(dt_seconds, cap)` called once at `server_init` after loads.

---

## Phase 0 — Real travel (orbital flight)  [enables everything spatial]

Goal: fly the rocket from Tenebris surface to a moon / the station / another
world and back, with fuel as the constraint.

- **Space-flight model (Core-ish, in `player_ctrl` space seam):** replace the
  arcade exponential drag with: (a) **no drag while coasting** in space, (b)
  **per-body gravity** summed from all bodies within range (Newtonian point
  gravity, `planet::gravity_at` already gives per-body falloff — extend to a
  weak long-range term so you fall toward bodies), so a prograde burn puts you on
  a real transfer arc. Keep it simple (patched-conic-lite / just N-body point
  gravity at low body count is fine — 5 bodies).
- **Delta-v / fuel budget:** the `RocketRide` already burns per-stage fuel; with
  real gravity the fuel you carry determines reach. Surface these numbers in the
  rocket HUD (remaining dv estimate = `Isp*g*ln(m0/m1)` per stage).
- **Arrival:** entering a body's falloff radius flips out of `is_in_space`
  (exists) — land on the moon like a planet. Landing gear / soft-landing check
  can reuse `RocketFlight`'s parachute/impact logic later.
- **Config:** `bodies.yaml` — per-body mass/gravity, orbit radius, so transfers
  are tunable.
- **Tests:** a burn from low orbit raises apoapsis (altitude over time);
  conservation-ish sanity (energy doesn't explode); reaching a moon's SOI flips
  the mode flag.

> This is the biggest single piece and gates moons + station + missions. If it
> slips, the station can temporarily be reachable by the existing arcade fly.

---

## Phase 1 — Moons of Tenebris

Goal: 2 moons you can land on, each with a unique resource that gates a rocket
part; refining fuel; a staging point for longer missions.

- **Bodies:** Luna / Selene already register as deferred bodies. Promote two to
  **landable moons**: small radius, low gravity, airless (no atmosphere/weather),
  distinct `bodies.yaml` entries. Worldgen reuses `planet_gen` with a moon biome
  (regolith, craters, no water/trees). Low gravity means low TWR needed — good
  early destination.
- **Unique resources:** add moon-only ores (e.g. `MOON_ICE` for fuel refining,
  a rare metal for a better engine) to `items.rs` + worldgen scatter on the moon
  surface, each with an icon. These are the "resources only found off-world" that
  gate advanced recipes (Phase 3).
- **Fuel refining:** a `Refinery` machine (new block entity, reuse the
  furnace/power-ui pattern) converts moon ice / ore → refined fuel with higher
  energy density (a new fuel grade → longer burns / more dv per unit). Config in
  `economy.yaml` or a `refinery.yaml`.
- **Persist / tests:** moon worldgen determinism pin (like the Tenebris subdiv
  pins); refinery conversion unit test; moon scatter reproducibility.

---

## Phase 2 — The Space Station (structure + dock)

Goal: a station in orbit around Tenebris you dock with; a single hub UI that
tabs into Trading / Research / Casino / Warehouse / Zoo / Fuel.

- **Station body/POI:** a fixed structure at an orbital altitude above Tenebris
  (a special body or a large block-entity cluster in space). Approaching within a
  dock radius shows an "[E] dock" prompt (reuse `draw_machine_hint` pattern);
  interacting opens the station hub.
- **Built look = technology hex blocks.** The station (and the casino inside it)
  is constructed from the **technology block set** (`blocks::is_tech_block`, the
  machine/panel hexes ids 29-40 with the `technology/*` textures), NOT natural
  terrain - so it reads as an artificial, built structure. Assemble the station
  hull/floors/walls from tech hexes (a reusable `build_tech_room()` helper), and
  gate the casino room's aesthetic on the same palette. If a cleaner "panel"
  variant is wanted, add tech-hex texture variants under
  `assets/textures/technology/` (PNG + `ui_icons`/atlas) rather than reusing ore
  or dirt faces.
- **Station hub UI (`client/station_screen.rs`, egui):** a tabbed panel
  (Trading, Research, Casino, Warehouse, Zoo, Fuel), styled like the pause/inputs
  panels. Each tab is its own module so they land independently.
- **Docking state:** a `docked: bool` client flag gates the hub + pauses flight.
- **Persist:** station-side state (warehouse, research, zoo, market) lives in a
  new persisted `StationState` in Core, saved same-frame on every economy edit.

### Phase 2a — Trading / market (stock exchange)
- **Sell:** items (resources, food, tools, animals) → credits at the current
  price. **Buy:** items → into the warehouse (not the limited player/rocket
  inventory). Grid UI with icons + price per unit + qty stepper.
- **Stock market:** prices are a **deterministic drift field** over time
  (mirror `weather.rs`: a seeded noise per item id evolving with `world_time`),
  plus supply pressure (selling a lot pushes its price down). Config caps in
  `economy.yaml`. Catch-up on server resume (F3).
- **Tests:** buy/sell adjusts credits + warehouse; price drift is deterministic;
  a big sell moves the price.

### Phase 2b — Warehouse
- **Reuse `StorageChestState` / `chest_screen`** as an upgradeable station
  storage: tiers of increasing slot count, each unlock costs credits
  (`economy.yaml`). Buying items deposits here; you withdraw into your rocket
  cargo (Phase 4) before a mission.
- **Persist:** warehouse contents + current tier in `StationState`.

### Phase 2c — Fuel purchase
- Buy refined fuel with credits (price in `economy.yaml`); it tops up the tanks
  of the rocket on the pad / the docked rocket's cargo fuel.

---

## Phase 3 — Research tree (recipe unlocks)

Goal: spend credits to unlock new rocket-part recipes; some require off-world
resources as ingredients.

- **Data:** `research.yaml` — nodes with `{id, cost_credits, prereqs[],
  unlocks_recipes[], required_items[]}`. A node unlock (a) costs credits and
  (b) may need a sample of an off-world resource in the warehouse.
- **Core:** `core/research.rs` — a persisted bitset of unlocked node ids +
  `is_recipe_unlocked(recipe_id)`. `crafting.rs` / `crafting_screen` gate recipes
  on it (locked recipes render greyed with "research required").
- **UI:** extend the existing `tech_tree.rs` shell into a real research panel
  (or a Research tab in the station hub): node graph with cost, prereqs, and a
  Buy/Unlock button; ASCII labels + item icons for ingredients.
- **New parts to gate:** bigger tanks, higher-Isp vacuum engine, a nuclear /
  ion engine (very high Isp, tiny thrust) needing a moon/asteroid metal, landing
  legs, cargo pods (Phase 4). Each new part: `items.rs` id + icon + `rocket.rs`
  stats + `recipes.yaml` recipe (locked until researched).
- **Tests:** unlock deducts credits + flips the bit; gated recipe becomes
  craftable only after unlock; ingredient-in-warehouse requirement enforced.

---

## Phase 4 — Rocket cargo hold (limited inventory)

Goal: the rocket carries only what fits in its cargo; you load items before
launch, so missions require planning.

- **Core:** a bounded `RocketCargo` (a small `Bag` with slot count from the
  assembled parts — e.g. a `CargoPod` part adds slots). Attach it to the
  `LaunchPadState` (persisted) and carry it into `RocketRide` on launch.
- **Load UI:** a cargo tab in `rocket_screen` — move items between the player
  bag / station warehouse and the rocket cargo (grid, icons). Enforce capacity.
- **On arrival:** the cargo is what you have off-world; mining a moon fills it
  (bounded), so you can only bring back what fits — the core loop tension.
- **Persist:** cargo contents same-frame with the pad edits.
- **Tests:** capacity enforcement; load/unload conserves items; cargo survives
  launch -> flight -> land.

---

## Phase 5 — Casino (station games)

Goal: minigames to win/lose credits. Slots, blackjack, keno, poker; more silly
games later.

- **Client:** `client/casino/` with one egui screen per game
  (`slots.rs`, `blackjack.rs`, `keno.rs`, `poker.rs`), opened from the Casino tab.
- **RNG:** a seeded PRNG (NOT `Math.random` / argless time — banned for
  determinism). Seed from a persisted play counter + a session salt so outcomes
  are reproducible for save-safety and testable. House edge / payouts in
  `casino.yaml` (no magic odds in code).
- **Money:** each bet calls `economy::try_spend(bet)`; wins `earn(payout)`. All
  same-frame persisted (you can't quit-scum a loss).
- **Scope per game (v1):** slots = 3-reel weighted symbols; blackjack =
  single-deck hit/stand/double vs dealer-17; keno = pick N of 80, payout by hits;
  poker = 5-card draw vs a pay table (Jacks-or-better) — simplest first.
- **Tests:** payout tables match config; expected value is house-favorable;
  PRNG is deterministic for a fixed seed; bet can't exceed balance.
- **UI:** real drawn panels (reels, cards, keno grid) via egui — not ASCII art.
- **Room build:** the casino is a room made of **technology hex blocks** (see
  Phase 2 "Built look") — a neon-lit tech interior, distinct from the natural
  planet surface. The game machines (slots cabinet, tables) can be tech-block
  clusters / block-entities placed in that room.

---

## Phase 6 — Animal selling + Zoo + rarity

Goal: sell captured animals for credits; each unique species sold appears in the
station zoo; rarer species pay more.

- **Capture -> sell:** an animal, once caught (a caught-animal item or a crate),
  can be sold at the Trading tab. Payout = base * rarity multiplier
  (`economy.yaml` per `AnimalKind`).
- **Zoo roster:** a persisted bitset of `AnimalKind`s ever sold; the Zoo tab
  renders each once (icon + name + rarity). First sale of a species is a bonus
  ("new exhibit"). Selling more of an already-exhibited species pays the normal
  rate.
- **Rarity source:** derive from `fauna.rs` spawn weights (rarer spawn -> higher
  multiplier) so it's data-consistent; final numbers in `economy.yaml`.
- **Populations over time (optional):** tie animal populations to the
  server-resume catch-up (F3) so over-harvesting a species depletes it (higher
  price) and it regrows while away.
- **Tests:** rarity payout ordering (rare > common); first-sale zoo bonus fires
  once per species; zoo roster round-trips through save.

---

## Suggested sequencing

1. **F1-F3 + Phase 0** (money, config, catch-up hook, real orbital flight) — the
   spine; nothing spatial works without travel + credits.
2. **Phase 2 + 2a/2b/2c** (station dock + trading + warehouse + fuel) — the hub
   and the core economy loop.
3. **Phase 3** (research) — gives credits a purpose and unlocks progression.
4. **Phase 1** (moons + refining) — the first real destination + off-world
   resources that feed research/parts.
5. **Phase 4** (rocket cargo) — the logistics constraint that makes missions
   matter.
6. **Phase 5 + 6** (casino, zoo) — the "fun money" sinks/sources; parallelizable
   once the economy foundation exists.

Each phase is independently shippable behind the station hub, so ship small and
often (matches how this branch has been merging).

---

## Save-format / compatibility notes

- Bump the SP persistence record with the new fields (credits, docked flag);
  keep the `tenebris-c:` KV namespace + wire strings untouched (PORTING.md rule).
- `StationState`, `ResearchState`, zoo roster, warehouse, rocket cargo are new
  persisted blobs — version them so older saves load with sensible defaults
  (empty warehouse, no research, zero credits).
- MP: every economy mutation goes through the server (authoritative), same as
  `saves_write_tile` — never trust the client for money/prices.

---

## Open design questions (decide when implementing, not now)

- Exact price/payout/odds numbers -> tune in YAML after playtesting.
- Is the station a "body" or a big block-entity cluster? (Body is simpler for
  docking/gravity; cluster is more buildable.)
- One shared "money" or separate station-scrip? (Recommend one currency.)
- How rare is "rare" for the zoo? (Derive from `fauna.rs` spawn weights.)
- Real orbital mechanics depth (N-body point gravity is enough; full patched
  conics is overkill for 5 bodies).

## Reentry FX + ditched-stage salvage (DONE)

Reference: https://github.com/RubenTipparach/mining-the-sky (reentry fx).

Shipped:

- **First-person reentry streaks** (`reentry_fx::draw`): plasma streaks past
  the camera when the player falls fast in the lower atmosphere. Ramps on the
  rocket.yaml `[reentry]` speed thresholds, gated by altitude.
- **Hull-hugging plasma shell** (`reentry_fx::draw_shells`): the full
  mining-the-sky `plasma_mesh.wgsl` mesh technique - a surface-net glow shell
  built from the stage's part-stack SDF, smeared into a downstream wake, nested
  layers, white->orange->red cooling ramp gated by aero-heating, drawn
  premultiplied-over. Wraps every jettisoned falling stage.
- **Ditched stages become tracked falling bodies:** on stage(), the shed stack
  spawns a `core::falling_stage::FallingStage` (ballistic + orbital gravity +
  `sqrt(density)*v^3` heating), stepped client-side against the world.
  - **Lands on terrain:** shatters, leaving a few salvageable `IRON` scraps
    (reused the existing metal item - no icon-less new item) at the impact.
  - **Splashes in ocean:** fully recoverable - every part drops back as a
    pickup.
- Knobs: `[salvage]` in rocket.yaml (drag, heat_ref/attack/decay, spin,
  scrap_min/max). Air density reuses `reentry.max_alt_m` as the band.

Possible follow-ups (not yet done): a bright impact-flash/explosion particle
burst on land touchdown (today it's just the scrap drops), and camera shake
during the player's own reentry.

## Station overhaul - user requirements (2026-07-16)

Direct asks from playtest; status notes per item. The station perf kernel
(batched drum mesh) SHIPPED with this note; the rest is design-ready work.

1. **Exiting the ship must leave it in the world.** Climbing out mid-orbit
   should park a persistent free-flying ship entity on its current orbit
   (on-rails from the exit state vector, like the station), boardable
   later with E. Today exit just ends the ride (parts stay on the origin
   pad) - the ship visually vanishes. Needs: a `parked_ships` client/core
   store (stack + fuel + orbital elements), drawn via rocket_fx, saved in
   the ride save's format, raycast target for re-boarding.
2. **Docking = guided landing on a pad.** NEXT UP (designed): E in the
   dock gate starts a TRACTOR SEQUENCE, not a toggle - capture, glide to
   the nearest free pad (station::pad_centers: ring corner + 2 cells out
   per HEX_DIRS, top of the deck slab), settle upright, THEN the dock
   menu opens automatically with a "Leave Ship" option; leaving parks
   the ship on the pad (drawn via rocket_fx), E near it re-boards.
   (original ask:) Within the dock gate (radius +
   rel-speed), guide the ship onto a free external docking pad: simple
   spline from current pose to pad approach point, then settle upright
   (nose radially out of the deck). Obstacle avoidance can be "approach
   from the pad's outward normal" rather than true path planning. On
   touchdown the ship parks (item 1's store, station-frame anchored).
3. **Ship stays parked on the pad; re-board with E.** Falls out of 1+2.
4. **Station sphere-of-influence reference frame.** PARTIAL: inside the
   artificial-gravity field the station is now the AUTHORITATIVE UP -
   the player's tangent basis rolls onto the deck frame at
   soi_align_rate (station.yaml), so FPS walking reads the casino grid
   as normal ground. Remaining: full station-local state storage
   (zero-drift parking) + world posed around the station frame.
   (original ask:) Within ~2 km the
   station becomes the SIMULATION ORIGIN: the player/ship state is stored
   station-local so there is zero orbital drift while walking/parking;
   the world (planet, sky) is posed around the station frame per frame.
   The station still orbits Tenebris - only the frame of expression
   changes. The artificial-gravity + deck-friction physics already work
   station-locally; this extends that to the whole in-SOI sim. DONE HERE:
   the drum renders as ONE BAKED MESH (station_fx bake +
   shaders/station_mesh, ~15 draw calls, pose = one mvp) - the render
   half of "station is a rigid fixed thing".
5. **On-foot station UX.** No dock menu on foot (DONE: dock prompt + E
   dock now gate on rocket_ride::is_riding). Trade / warehouse / fuel
   become walk-up consoles: the TradeTerminal / ResearchConsole furniture
   already renders - add an interact raycast against station furniture in
   the station frame, opening the matching screen tab. Gravity/walking
   already exists (station.yaml artificial gravity, deck friction,
   step-up).
