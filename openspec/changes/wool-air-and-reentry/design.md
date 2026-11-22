# Design: wool, rocket power, re-entry, air and suits

Every number below lives in a config table (`SurvivalConfig.ts`,
`RocketConfig.ts`, `PowerConfig.ts`, `FaunaConfig.ts`), not in code.

## 1. Sheep and cows (ranching)

- `sheep` and `cow` join `FAUNA_SPECIES` with `planet: 'earth'`, so the
  roster check keeps them on Earth only. Each gets a model in
  `FaunaModels.ts`, built from the same part kit as the deer, and a baked
  walk/idle clip from `gen-fauna-anims.py`.
- **Interact** works on the animal under the crosshair: a ray from the
  camera against each animal's bounding sphere, within reach.
  - **F with shears in hand on a sheep:** gives 1-3 wool. The sheep is shorn
    (its fleece mesh hides) until `REGROW_S` passes.
  - **Hitting a cow** (the break button) knocks it back. After
    `COW_HITS` hits it falls, drops 1-2 leather and leaves. The spawner
    refills the herd as it does today.
- **Multiplayer:** animals are simulated by the planet's host. A shear or a
  kill by another player is sent to the host as an animal action, and the
  host's next frame carries the result. Single player and the host apply it
  at once.
- **Recipes:**
  - shears: 2 iron ingots, crafting grid, diagonal;
  - carpet: 4 wool, 2x2, makes 4;
  - wool clothing: 5 wool in a shirt shape.
- **Carpet is a full block** with its own drawn wool texture. The hex grid
  has no thin floor shape, and adding one is a mesher change outside this
  work.

## 2. Rocket power (rocket-power)

- **Charge:** a flight carries `chargeWh`, the stack's `batteryWh` from the
  parts table (`ROCKET_CONFIG.PARTS`): the command module's own cell
  (20 kWh) plus a lithium-ion battery's 40 kWh for each battery pack.
- **Drain:** the command module draws its `powerDrawW` whenever the rocket
  flies (launching, in flight, landing - not on the pad or landed). The draw
  is derived so the cell alone lasts `POWER.CELL_MINUTES` = 15 minutes; a
  pack adds 30.
- **Flat battery:**
  - engines don't fire and the rocket can't turn;
  - the cabin air fails, which is exposure (design 4);
  - gravity and the parachute still work.
- **HUD:** a POWER gauge beside FUEL (flight time left), with a toast at
  `POWER.LOW_WARN_S` = 2 minutes left and "Battery flat" when it dies.
- **Swapping in a battery:** interacting (right-click) at a landed rocket
  with a lithium-ion battery in hand uses up the battery and adds its stored
  Wh (`POWER_CONFIG.BATTERIES`), up to the stack's capacity. Charge is saved
  with the landed rocket (its multiplayer record). Single player keeps no
  landed-rocket save - a reload puts the rocket back on its pad, which
  charges it on launch.
- **Recharging on the pad:** a rocket back on a launch pad is topped up for
  free when it's next launched. The pad's crew charges it.
- **Lithium:**
  - `DEPOSITS.LITHIUM` is a rich lithium vein;
  - it is added to every airless body's `extraOres` (the Moon, `rockWorld`,
    `moon()`, `asteroid()`);
  - Earth keeps the thin common veins in `ORE_CONFIGS`.

## 3. Re-entry heat and parachutes (reentry-and-parachutes)

- **Atmosphere shell:** a body with `hasAtmosphere` has air out to
  `radius * REENTRY.shellRadiusMult` (1.8, the gravity well's edge). Not the
  sky's `ATMOSPHERE_RADIUS_MULT` (1.1): that shell is 10 m deep on Earth,
  crossed in a fraction of a second, so heat could never build in it.
- **When heat applies:** a flight that has been outside every atmosphere
  since launch, and then enters one, is "re-entering" until it lands.
- **Heating:** while re-entering, faster than `REENTRY.safeSpeed` (40 m/s,
  above Earth's ~33 m/s free fall, so only a powered dive heats),
  `heat += (speed - safeSpeed) * REENTRY.heatPerMs * dt`. Otherwise it cools
  at `REENTRY.coolPerS`.
- **Overheating:**
  - at `REENTRY.maxHeat` the rocket burns up, using the existing `explode()`
    and crash recovery;
  - above `REENTRY.damageFrom` heat wears the rocket's health, which was
    unused until now.
- **What the player sees:** a HEAT gauge, and an orange glow shell round the
  rocket whose opacity follows the heat.
- **Parachute part:**
  - `PARACHUTE` is a rocket part (partType CARGO) printed from wool and
    iron;
  - it opens with `ROCKET_INPUTS.PARACHUTE` (P), or by itself when falling
    below `PARACHUTE.deployAltitude` (50 m);
  - it opens only inside an atmosphere and below `PARACHUTE.maxOpenSpeed`;
    faster, it tears and is gone for the flight;
  - open, it pulls the speed toward `PARACHUTE.terminalVelocity`, which is
    under the landing damage threshold;
  - it draws a canopy above the rocket;
  - torn, or used for a landing, it is spent until the rocket is launched
    from a pad again, which packs it;
  - a landing under an open chute fires a `chuteLanded` mission event.

## 4. Air and suits (air-and-suits)

- **Breathable air per body:** `breathable` sits beside `hasAtmosphere` in
  `SolarSystemConfig`.
  - Earth, Sequoia, Verdance and Mirewood are breathable.
  - Ferrum has an atmosphere that can't be breathed.
  - Every airless body isn't breathable.
- **Exposure:** the player is exposed when any of these holds:
  - on or near a body whose air isn't breathable;
  - in open space (no gravity well), not inside a rocket;
  - inside a rocket whose battery is flat.
  A rocket cabin with power is safe anywhere. Under water isn't counted in
  this change.
- **Breathing while exposed:**
  - with a worn suit and an oxygen tank in the inventory (hotbar or bag),
    the suit draws from the tank. Each tank holds `TANK_AIR_S` = 300 s and
    is swapped for an empty tank when it runs out;
  - otherwise the player holds their breath for `BREATH_S` = 10 s, then
    dies.
- **Dying:** a death screen, then respawn at the world's spawn on Earth with
  the inventory kept. Air and death have no other penalty in this change,
  which keeps the game calm.
- **HUD:** an AIR chip (a bar for breath or tank seconds) shows while
  exposed or while the suit draws air.
- **The suit:**
  - one equipment slot in the inventory panel takes the space suit; using
    the suit in hand puts it on, and clicking the slot takes it off;
  - the worn state is saved per world;
  - it shows on the avatar as a suit and helmet, so other players see it.
- **Gas collector:**
  - a machine, built like the pump jack;
  - it draws `DEMAND_W.gasCollector`;
  - every `MACHINE_CONFIG.gasCollector.fillS` it fills one empty tank in its
    input into an oxygen tank in its output;
  - it can only be placed where the air is breathable, otherwise "No air to
    collect here";
  - it fires a `bottled` mission event.
- **Recipes:**
  - empty tank: 4 iron ingots and glass, at the crafting grid;
  - gas collector: iron, copper, cable, at the crafting grid;
  - space suit: wool clothing, 4 leather, glass and 2 iron ingots, at the
    crafting grid.

## 5. Missions

- **Wool and leather** (off Smelt iron, which also unlocks shears):
  - Shear a sheep unlocks carpet, wool clothing and the parachute;
  - Lay a carpet;
  - Tan a hide;
  - Make clothes.
- **Air and suits** (off Wire it up, which also unlocks the empty tank and
  the gas collector):
  - Bottle air unlocks the space suit;
  - Suit up;
  - Walk in space: a minute of breathing from tanks on an airless world,
    after Land on the Moon.
- **Rocketry:**
  - Safe return: land under a parachute, after Shear a sheep;
  - Fresh battery: swap a battery into a landed rocket, after Land on the
    Moon and Lithium-ion.
- **New objective kinds:** `sheared`, `chuteLanded`, `bottled`, `suited`,
  `recharged`.

## Decisions taken without asking (owner may redirect)

- Earth keeps thin lithium veins, so earlier batteries stay craftable.
- Death keeps the inventory and respawns on Earth.
- Worlds with life but no air (Cinder, Vesper, Halcyon, Tessaly, Umbra)
  need a suit: they are airless in the config.
- Under water is not exposure yet.
- Carpet is a full block.
