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

- **Equipment slots** (owner, 2026-11-22: parachutes, solar arrays and
  batteries are "not a separate module ... you can equip in a slot"):
  - the rocket has `equipment: InventorySlot[]` beside its cargo hold, built
    the same way: sized from the stack (`ROCKET_CONFIG.PARTS`
    `equipmentSlots`; the command module gives 3, so a chute, an array and
    a pack fit at once - a later part could add more), held by the launch
    pad, shared by reference with the flying and landed rocket, saved with
    the pad and in the landed-rocket record;
  - only `ROCKET_CONFIG.EQUIPMENT` items fit: the parachute (40 kg, one
    chute), the solar array (50 kg, `solarW`) and the battery pack (60 kg,
    `batteryWh`). Those numbers live only there - none of the three is in
    `PARTS` or has `rocketPart`, so none can go in the stack;
  - items stack in a slot up to their stackSize and every one counts: N
    packs store N x batteryWh, N arrays give N x solarW, N parachutes open N
    times, and each adds its mass;
  - `computeRocketStats(parts, cargoMass, mode, equipment)` sums stack and
    equipment in one place, for the pad readout, the flight and the tests;
  - the launch pad panel and the landed-rocket panel show an Equipment row
    of slot cells with item icons and what it gives ("+40 kWh, +solar 40 kW,
    1 chute, +150 kg"). On the pad, items are dragged in from the hotbar or
    bag and clicked back out (hotbar first); a landed rocket's row opens the
    cargo hold's panel filtered to equipment, beside the hotbar + bag;
  - a part removed from the stack is refused while its equipment slots
    still hold what the rest can't (as for cargo);
  - **migration:** an older save whose stack holds one of the three moves
    it into the equipment slots on load (the cargo hold when they are full,
    the player's inventory as a last resort); an older landed record with
    no equipment loads with empty slots.
- **Charge:** a flight carries `chargeWh`, its capacity `batteryWh`: the
  command module's own cell (20 kWh, `PARTS`) plus a lithium-ion battery's
  40 kWh for each battery pack fitted (`EQUIPMENT`).
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
  above Earth's ~37 m/s free fall, so only a powered dive heats),
  `heat += (speed - safeSpeed) * REENTRY.heatPerMs * dt`. Otherwise it cools
  at `REENTRY.coolPerS`.
- **Overheating:**
  - at `REENTRY.maxHeat` the rocket burns up, using the existing `explode()`
    and crash recovery;
  - above `REENTRY.damageFrom` heat wears the rocket's health, which was
    unused until now.
- **What the player sees:** a HEAT gauge, and an orange glow shell round the
  rocket whose opacity follows the heat.
- **Parachute (equipment):**
  - `PARACHUTE` is printed from wool and iron and fitted in the rocket's
    equipment slots (design 2), never the stack;
  - it opens with `ROCKET_INPUTS.PARACHUTE` (P), or by itself when falling
    below `PARACHUTE.deployAltitude` (50 m) - by itself only at a speed it
    survives, so it never tears chute after chute;
  - it opens only inside an atmosphere and below `PARACHUTE.maxOpenSpeed`;
    opened faster (by key), it tears;
  - opening or tearing uses one parachute up from the slot (the rocket is
    re-weighed and saved at once); landing under it just closes it. The
    count in the slot is the whole state - there is no "spent" flag, and a
    pad no longer repacks it: fit another;
  - open, it pulls the speed toward `PARACHUTE.terminalVelocity`, which is
    under the landing damage threshold;
  - it draws a canopy above the rocket;
  - the HUD reads "CHUTES n [P]" with parachutes fitted, "CHUTE OPEN" while
    open, nothing with none;
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
  the inventory kept. A pilot who dies in a cabin with no power is taken out
  first by the exit path, forced past the usual "can't exit in flight" check,
  so the ship is parked where it is (a landed rocket) and never vanishes. The
  pause menu holds the air clock. Air and death have no other penalty in this change,
  which keeps the game calm.
- **HUD:** an AIR chip (a bar for breath or tank seconds) shows while
  exposed or while the suit draws air.
- **The suit:**
  - one equipment slot in the inventory panel takes the space suit; right
    clicking the suit in hand puts it on (like eating a dish), and clicking
    the slot takes it off (hotbar first);
  - the worn state is saved per world;
  - it shows on the avatar as a suit, helmet and air pack, so other players
    see it: `suit: 'on'` rides the synced avatar look (the hello message).
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
  - Safe return: fit a parachute in the rocket's equipment and land under
    it, after Shear a sheep;
  - Fresh battery: swap a battery into a landed rocket, after Land on the
    Moon and Lithium-ion.
- **New objective kinds:** `sheared`, `chuteLanded`, `bottled`, `suited`,
  `recharged`.
- `launchedWith` fires for each part type in the stack and each item type
  fitted in the equipment, from the one launch hook.

## 6. Solar power

The owner, 2026-11-22: "oh yea, after batteries reseached, solar panels".

- **Solar panel (`SOLAR_PANEL`):** a machine kind `solarPanel` on the
  generic machine path, with no slots.
  - **Recipe:** the electronics workbench, from glass, copper, a chip and
    aluminum.
  - **Unlock:** the lead-acid mission (Store power) unlocks it.
  - **Output:** each grid step it supplies `SUPPLY_W.solarPanel` x
    `sunlight`. The panel's tile up (`HexTile.center`) is dotted with the
    planet's sun direction, giving the cosine of the sun's height.
    - It is 0 when the sun is down, or when any cell in the column above
      the panel stops light (`passesLight`, the voxel light rule).
    - It is x `SOLAR.AIRLESS_BOOST` on a body without an atmosphere.
  - **Where the maths lives:** `panelSunlight` in MachineLogic, which is
    pure and tested.
  - **UI:** the machine panel shows watts now, and peak watts, over a
    sunlight bar.
- **Solar array (`SOLAR_ARRAY`):** rocket equipment (design 2), printed
  from two panels and aluminum, fitted in an equipment slot.
  - **Unlock:** the Solar power mission (2 panels placed) unlocks it.
  - **Output:** `solarW` (`ROCKET_CONFIG.EQUIPMENT`) is half the command
    module's draw, so two arrays (two slots, or two in one slot) hold a
    flight's charge steady in full sun.
  - **Sunlight:** a rocket is sunlit when the straight line from it to the
    sun misses every body's sphere (`inSunlight`). Sunlit, its battery
    charges at `solarW`, in flight or landed, up to capacity.
  - **HUD:** the POWER gauge reads "SUN" while it charges.
- **"Battery flat" toast:** it now warns once, until the charge is back past
  the low mark, so an array slower than the draw can't repeat it.

## Decisions taken without asking (owner may redirect)

- Earth keeps thin lithium veins, so earlier batteries stay craftable.
- Death keeps the inventory and respawns on Earth.
- Worlds with life but no air (Cinder, Vesper, Halcyon, Tessaly, Umbra)
  need a suit: they are airless in the config.
- Under water is not exposure yet.
- Carpet is a full block.
