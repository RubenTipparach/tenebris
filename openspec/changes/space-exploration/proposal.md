# Proposal

## Why

Once a rocket flies, the mission tree runs out of direction. The "Moon and
beyond" branch reaches the Moon, Sequoia and "any 3 other bodies", but 35 of
the system's bodies have no mission, nothing makes one body worth visiting
over another, and the late engines (nuclear thermal, ion) have nowhere to
take the player. The owner wants a space exploration tree that visits EVERY
body in the solar system, where each body gives something the next trip needs.

## What Changes

- **Space exploration tree, announced:** when the first rocket is built (the
  `assemble` mission), a toast says the Space exploration tree is unlocked
  and how many bodies it covers. The tree has one "visit" mission for every
  body in the solar system - every landable world, moon and asteroid, plus a
  close pass of the Sun and a visit to each gas giant - and a test keeps it
  that way when bodies are added.
- **Two routes from the Moon:** the Moon is the first body. From it the tree
  splits into a **sunward** route (Sequoia and its moons, Metropole Prime,
  Umbra, Vesper, then a close pass of the Sun) and an **outward** route
  (Kessel, Aurelia's moons, Cinder, Nerith, Halcyon, Tessaly, Brontes's
  moons), ordered by travel distance and distance from the Sun. Asteroids
  hang off the major body nearest them as side trips.
- **Every body offers something:** a body-specific resource, recipe or part
  that later bodies need (e.g. the Moon's ion thrusters, Sequoia's heat-shield
  resin, Lodestone's magnets, the gas giants' helium-3), so the two routes
  feed each other and both are needed to finish.
- **Engine ladder** past today's chemical, vacuum, nuclear thermal and ion
  engines: a solar-electric ion thruster from the Moon, a gas-core nuclear
  engine, a fission-fragment (magnetic fission) drive, a nuclear pulse
  (bomb) drive, a D-He3 fusion drive and an advanced magnetic fusion torch,
  each gated on a milestone body and resource.
- **Stage separators:** a rocket can be built in stages. A separator part
  splits the stack, each stage burns its own tanks, and a key drops the
  spent stage, so heavy engines lift off and a light upper stage (for
  example the command module on ion thrusters) goes on.
- **Refitting away from home:** a rocket can be docked onto a launch pad on
  any body, and a refit kit lets the player change its stack from its cargo
  while parked on a body or in space, using the same stack editor as the pad.
- **Environments:** each body has a temperature and radiation level. Hot,
  cold and high-radiation worlds harm an unprotected player the way vacuum
  does today. New suit tiers (thermal, hardened) protect against them, and the
  existing space suit and oxygen tanks stay the first step.
- **Atmospheres differ:** each body has an atmosphere density. Re-entry heat
  and parachute braking scale with it, landing on an atmospheric body needs a
  parachute, and the thickest atmospheres (gas giants, the Sun's corona) need a
  heat shield.
- **Ocean world and submarines:** a new mostly-water planet, Thalassa, with its
  own sea life. A submarine explores its depths, and a gas-giant variant dives
  into Aurelia's and Brontes's cloud decks for resources.

## Capabilities

### New Capabilities

- `exploration-missions`: the space exploration mission tree - the unlock
  toast, one visit mission per body, the two routes from the Moon, and the
  per-body rewards that link them.
- `rocket-staging`: stage separators, per-stage fuel and dropping a spent stage.
- `rocket-refit`: docking a rocket onto any pad and changing its stack away
  from home with a refit kit.
- `body-environments`: per-body temperature, radiation and atmosphere
  density, what they do to an unprotected player, and the suit tiers that
  protect against them.
- `submarines`: the submarine vehicle for oceans and the gas-giant diver.
- `ocean-world`: Thalassa, the new ocean planet, with its own flora and fauna.

### Modified Capabilities

These capabilities are defined in changes that are not archived yet
(`openspec/specs/` is empty), so this change adds requirements to them rather
than rewriting existing ones:

- `rocket-tiers` (industry-and-nuclear): the engine ladder grows past the ion
  drive.
- `reentry-and-parachutes` (wool-air-and-reentry): heating and parachute
  braking scale with each body's atmosphere density; a heat shield is added.
- `resources` (industry-and-nuclear): new body-specific resources.

## Impact

- **Config:** `src/config/SolarSystemConfig.ts` (per-body environment fields,
  Thalassa), `src/config/Missions.ts` (new branches and missions; existing
  mission ids are kept), `src/config/RocketConfig.ts` (new parts,
  separators, heat shield, atmosphere scaling), `src/config/SurvivalConfig.ts`
  (temperature and radiation exposure), `src/config/ResourceConfig.ts`.
- **Systems:** `MissionTracker` / `MissionsPanel` (unlock toast, new objective
  kinds), `RocketPerformance` / `RocketController` / `RocketFlightManager`
  (stages, new engines, per-body re-entry), `LaunchPadUI` / `LandedRocket` /
  `LandedRocketUI` (refit), `Survival` / `AirSystem` (environment exposure,
  suit tiers), a new submarine vehicle beside the rocket code.
- **Assets:** icons for every new item, block textures for Thalassa and new
  resources (block-textures skill), procedural models for the submarine and new
  engines.
- **Saves and multiplayer:** missions stay per player. Rocket stacks with
  separators, refits and submarines persist through the existing save and
  record paths (`GameStorage`, `NetSync`), with old saves loading unchanged.
- **Size:** this is a large change and lands in phases (see tasks.md). Each
  phase is playable on its own.
