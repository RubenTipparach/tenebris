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

1. **Rocket-part items + recipes** -- DONE (this branch).
   `rocket-engine`, `fuel-tank`, `command-module` exist as core item ids
   and hand-craft from ingots (`core/items.rs`, `assets/config/recipes.yaml`).
   Visible/craftable in the B-key craft screen.

2. **Deepen the tech tree toward JS parity** -- TODO.
   JS uses aluminium/cobalt/gold/lithium ores + RAM/CPU/motherboard/
   power-supply for the command module, and an electric furnace for the
   advanced ores. Add those ores (worldgen veins + drops + smelting) and
   the printed sub-components. Until then, parts use the simplified
   ingot costs from step 1.

3. **3D-printer station** -- TODO.
   Placeable building (`Block` + placement), a print QUEUE with timed
   jobs and a 6-slot output (`src/planet/Printer3D.ts`). Recipes move
   behind `station: printer` (the `Recipe.station` field already exists).
   Needs a station-open check at the craft call site.

4. **Launch pad + assembly** -- TODO.
   Placeable pad; stack parts vertically (engine at heightIndex 0, then
   fuel tanks, command module on top). `validateRocket()`: >=1 engine at
   bottom, >=1 fuel tank, >=1 command module. Parts consumed from
   inventory into the pad's part list.

5. **Rocket physics + flight** -- TODO.
   State machine (BOARDED_GROUNDED -> LAUNCHING -> IN_FLIGHT -> LANDING
   -> LANDED), thrust/fuel/mass model (`RocketConfig`: ~39 kN thrust,
   10 fuel/s, capsule parachute at 50 m). Reuse the existing space-mode
   camera/controls where possible.

6. **Flight integration + travel** -- TODO.
   Board/eject, exhaust VFX, landing on another body, persistence of a
   landed rocket. This is what makes "go explore planets" real.

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
