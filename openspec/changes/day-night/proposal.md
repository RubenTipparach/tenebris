# Proposal: day and night - the planets turn

## Why

The owner, 2026-11-22: "do planets rotate? (the world rotates around the
planet really, because of your frame of reference system)" and then "would
like to have day night cycles".

Today a planet keeps one orientation. Day and night come only from its
orbit: Earth's day is its three-hour year and the Moon's is about as long.
That is far too slow to be a day.

## What Changes

- **Every body turns about its north pole**, with its own solar day set in
  config. Earth's is 20 minutes, the Moon's 24, and the others run from 12
  to 40 minutes. Asteroids tumble round in 6, and the Sun does not turn.
- **In the player's frame the planet stays still and the sky turns round
  it.** This is the owner's framing and it is how the frames already work.
  The body you are on stays at its configured position. The Sun, every
  other body, the gas giants and the stars wheel round it once a day,
  turned in one place (`framePositionAt`). Terrain, placed objects, saves
  and multiplayer records are untouched.
- **Out in space the sky stops turning.** Near its body (within a few radii,
  or its sphere of influence) the frame turns with the body. Past that it
  is held at the angle it had, so deep-space flight is not done under a
  wheeling sky.
- **The stars turn with the Sun.** The starfield and nebula are turned by
  the same angle.

## Capabilities

### New Capabilities
- `planet-spin`: each body's day, the turning reference frame, the held
  frame in space, and the stars that turn with the Sun.

### Modified Capabilities
- None in `openspec/specs/`. This extends `orbital-motion` of the
  unarchived `navigation-and-orbits` change. That change's non-goal "no
  planetary spin" is lifted here, and its Sun-direction requirement still
  holds: sunlight follows the Sun's live position in the frame.

## Impact

- `src/world/Orbits.ts`: spin table, `spinYawAt`, `Frame`,
  `framePositionAt(id, frame, t)`, `frameVelocityAt` and `nextFrame`.
- `src/config/OrbitConfig.ts`: `DAY_MIN` defaults, `SPIN_FRAME_RADII` and
  `SPIN_FRAME_HYSTERESIS`. `src/config/SolarSystemConfig.ts`: `dayMin` per
  body.
- `src/mainPlanet.ts`: the frame state, holding the frame in space, the
  reference-body change, and the sky yaw.
- `src/engine/GameEngine.ts` and `src/shaders/skybox/skybox.vert`: the
  starfield turns. `src/mockups/SolarSystemMockup.ts`: the gas giants'
  bands and rings turn.
- Tests: `scripts/day-night.test.ts`.
