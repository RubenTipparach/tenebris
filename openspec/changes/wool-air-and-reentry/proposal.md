# Proposal: wool and leather, rocket batteries, parachutes and re-entry heat, air and space suits

## Why

The owner, 2026-11-21: "introduce wool, sheep, and leather for cows. wool:
lets you craft nice carpets, clothing, and parachute. this allows you to add
parachutes to your rockets so you can safely re-enter atmospheres, also yea
heat reentry is a thing now. if a rocket leaves atmosphere and returns it
will gain heat reentry. we also need to introduce battery. batteries are
required for command module to function. they'll need lithium to craft
(abundant on moons and planets without atmos). the command module by
default comes with some, but not a lot to last more than about 15 minutes in
flight. oxygen and oxygen tanks, and a gas collector block that will allow
players to collect gasses from atmosphere to be stored in tanks. space suits
(wool + leather). the player will die if exposed to external elements
without the proper suit + oxygen tanks".

Today space is free: a player walks on the Moon in shirt sleeves, a rocket
falls back through the air with no cost, and a command module flies forever.
Nothing on Earth is farmed from animals, and the JS client's animals can't
be touched at all.

## What Changes

- **Sheep and cows on Earth** (Earth's roster only, by the per-planet rule):
  - shears (iron) shear a sheep for wool; its fleece grows back;
  - a cow hit a few times falls and drops leather.
- **Wool** crafts carpets (a soft floor block), wool clothing, and
  parachutes. Leather and clothing make the space suit.
- **Rocket batteries:**
  - the command module runs on power and needs it to steer, fire engines and
    keep its cabin air;
  - its own cell lasts about 15 minutes of flight;
  - battery packs add more;
  - a lithium-ion battery swapped in tops a landed rocket up.
- **Lithium is abundant on airless worlds:** a rich deposit on every moon,
  airless planet and asteroid. Earth keeps its thin veins, so the
  power-storage branch still works before spaceflight.
- **Re-entry heat:** a rocket that has left an atmosphere heats up when it
  comes back in fast. It cools when it slows or leaves again, and burns up if
  it overheats. A HUD gauge shows it, and the rocket glows.
- **Parachutes:** a rocket part made from wool.
  - It opens in an atmosphere, by key or at a set height while falling, and
    holds the rocket to a safe landing speed.
  - It tears if opened too fast.
  - It can't open in vacuum.
- **Air:**
  - a gas collector machine, on power, on a world with breathable air,
    fills empty tanks into oxygen tanks;
  - an oxygen tank holds a few minutes of air.
- **Space suit and exposure:**
  - a worn space suit and oxygen tanks keep the player alive where the air
    can't be breathed: an airless world, open space outside a rocket, or a
    rocket cabin whose battery is flat;
  - without them the player holds their breath for a few seconds, then
    dies and respawns.
  - A HUD shows the air left. The suit is worn in its own slot and shows on
    the avatar.
- **Missions:** a Wool and leather branch, an Air and suits branch, a
  parachute landing, and a battery swap, each unlocking its recipes.

## Capabilities

- ranching (new): sheep, cows, shears, wool, leather, carpet, clothing.
- rocket-power (new): command-module battery, battery packs, swapping in a
  battery, lithium on airless worlds.
- reentry-and-parachutes (new): re-entry heat, the parachute part.
- air-and-suits (new): gas collector, oxygen tanks, the space suit,
  exposure and death.

## Impact

- `src/config/FaunaConfig.ts`, `src/planet/FaunaModels.ts`,
  `src/planet/Fauna.ts`, `scripts/gen-fauna-anims.py`.
- `src/player/Inventory.ts` (items), `scripts/gen-item-icons.py` (icons),
  `src/shared/blockTypes.ts` (carpet block), recipe tables, `src/config/Missions.ts`.
- `src/config/RocketConfig.ts`, `src/rocket/RocketController.ts`,
  `src/rocket/RocketPerformance.ts`, `src/rocket/RocketFlightUI.ts`.
- `src/config/PowerConfig.ts`, `src/power/MachineLogic.ts`, `src/player/MachineUI.ts` (gas collector).
- `src/config/SolarSystemConfig.ts` (breathable air per body, lithium deposit),
  `src/config/ResourceConfig.ts`.
- A new survival module for air, exposure and death. The worn suit is saved
  per world and synced as part of the avatar's look.
