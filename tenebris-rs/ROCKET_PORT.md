# Rocket-building port plan (JS -> Rust)

Goal: port the JS rocket loop so the player can gather, build a rocket,
launch, and fly to other planets/moons. Source of truth is the
deprecated JS under repo-root `src/` (read-only reference, per the repo
rules). This file tracks the build order and status so the work can
proceed in small, committed steps.

## The player loop (from the JS)

```
mine ore -> smelt to ingots -> 3D-printer crafts rocket PARTS
         -> assemble parts on a LAUNCH PAD (engine bottom, tanks, capsule top)
         -> validate -> board -> LAUNCH -> fly / land on another body
```

JS reference map (file:line) lives in the git history of this commit's
investigation; the key modules are:

- Items / inventory:  `src/player/Inventory.ts`
- Printer (crafting): `src/player/Printer3DUI.ts`, `src/planet/Printer3D.ts`
- Launch pad / assembly: `src/planet/LaunchPad.ts`, `src/player/LaunchPadUI.ts`
- Rocket part data:   `src/planet/RocketPart.ts`
- Flight:             `src/rocket/RocketController.ts`, `RocketFlightManager.ts`,
                      `RocketState.ts`
- Config / physics:   `src/config/RocketConfig.ts`

## Build order (foundational first)

The pure-core backend is DONE - everything in `core/rocket.rs` (items,
recipes, validation, flight spec/config, the flight state machine +
integrator, and the launch-pad assembly model), 18 unit tests. The core
can already: craft parts -> assemble a part stack on a `LaunchPad` ->
validate -> `board()` -> fly the `RocketFlight` from launch to landing.
What remains is CLIENT integration (placement, UI, rendering, input).

1. **Rocket-part items + recipes** -- DONE.
   `rocket-engine`, `fuel-tank`, `command-module` are core item ids and
   hand-craft from ingots; craftable in the B-key screen.

2. **Deepen the tech tree toward JS parity** -- TODO.
   JS uses aluminium/cobalt/gold/lithium ores + RAM/CPU/motherboard/
   power-supply for the command module, and an electric furnace for the
   advanced ores. Until then, parts use the simplified ingot costs.

3. **3D-printer station** -- TODO (client + recipe gating).
   Placeable building, a print QUEUE with timed jobs and a 6-slot
   output. Recipes move behind `station: printer` (the `Recipe.station`
   field already exists). Needs a station-open check at the craft site.

4. **Launch pad + assembly** -- core DONE (`LaunchPad`), client TODO.
   Core: stack parts bottom->top, validate, board. Client: a placeable
   pad block, an assembly UI that adds/removes parts (consuming from the
   bag), and part rendering.

5. **Rocket physics + flight** -- core DONE (`RocketFlight`), client TODO.
   Core: vertical thrust/gravity/fuel/parachute state machine. Client: a
   flight controller that feeds throttle input, a camera, and renders
   the rocket; later, full 3-D pose/steering.

6. **Flight integration + travel** -- TODO.
   Board/eject, exhaust VFX, landing on another body, persistence of a
   landed rocket. This is what makes "go explore planets" real.

## Next client steps (in order)

1. `LAUNCH_PAD` placeable block (blocks.rs + texture + place/persist).
2. Interact (E) on a pad -> assembly screen (drives `LaunchPad::add_part`
   from the bag, shows `faults()`).
3. Board a valid pad -> a client rocket controller owning a
   `RocketFlight`, throttle input, and a chase camera.
4. Procedural part meshes (cone nozzle, cylinder tank, capsule) for the
   pad + the flying rocket.

## Assets

JS bakes `command_module.obj`, `medium_fuel_tank.obj`,
`medium_rocket_nozzlel.obj` under `public/models/`. The Rust port
prefers procedural meshes (repo rule), so parts can start as procedural
primitives (cylinder tank, cone nozzle, capsule) and only go to baked
`.obj` if the user asks for the exact JS models. Part/ingot ICONS for
the inventory are not yet baked -- `tools/gen-item-sprites.py` work.

## Open decisions for the user

- **Recipe parity vs. simplicity**: match the JS aluminium/cobalt/gold/
  electronics tree exactly, or keep the simplified ingot costs? (Step 1
  is simplified; step 2 deepens it.)
- **Part models**: procedural primitives, or port the baked `.obj`s?
