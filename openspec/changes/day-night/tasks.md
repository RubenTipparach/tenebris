# Tasks

## 1. Spin model (planet-spin)

- [x] 1.1 `dayMin` per body (SolarSystemConfig), `ORBIT_CONFIG.DAY_MIN` defaults by type, sidereal period from day and year, `spinYawAt` (pure, wraps). Verify: `scripts/day-night.test.ts` (Earth 20 min day / 22.5 min sidereal, wrap, every body but the Sun turns).
- [x] 1.2 `Frame`, `framePositionAt(id, frame, t)` applying `Ry(-yaw)` (the one place), `frameYawAt`, `frameVelocityAt`. Verify: test - a spot on Earth sees one sunrise and one sunset per day, in the east; the Moon rises and sets.

## 2. The turning frame in the game

- [x] 2.1 mainPlanet: frame state, `applyOrbitPositions` through the frame, MP frame offset through the frame. Verify: tsc; headless day sequence.
- [x] 2.2 Starfield and nebula turn by the frame yaw (`GameEngine.setSkyYaw`, skybox.vert in sphere space); gas giants' bands and rings (`SolarSystemMockup.setFrameYaw`). Verify: test - the Sun against the stars is the orbits alone; headless shots show the stars moved with the Sun.
- [x] 2.3 Hold the frame beyond the spin reach (`nextFrame`, `SPIN_FRAME_RADII`, `SPIN_FRAME_HYSTERESIS`). Verify: test - holding moves nothing at that moment, the held sky stops wheeling, hysteresis band.
- [x] 2.4 Reference-body change through `frameVelocityAt` (translation only; the sky takes the turn). Verify: test - place beside the Moon kept, Moon velocity in a turning frame.

## 3. Verify in game

- [x] 3.1 Headless SP: step game time through a day on Earth and capture noon, sunset, night and sunrise from one spot. Verify: screenshots.
- [ ] 3.2 Owner's in-game check: a day on Earth looks right, a launch to orbit and a flight to the Moon behave (no sideways drift near the pad, handoff at the Moon keeps the landing site).
