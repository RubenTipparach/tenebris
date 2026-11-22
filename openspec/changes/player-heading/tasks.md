# Tasks

## 1. The look state (player-look)

- [x] 1.1 `src/player/WalkerLook.ts`: heading/up/pitch, `transportUp` (shortest arc + re-project), `turnLook` (yaw about up, clamped pitch, NaN guard), `lookAlong` (with optional view up), `lookQuaternion` (right = heading x up). Verify: `scripts/player-heading.test.ts` 1-7.
- [x] 1.2 `PlayerConfig.PITCH_LIMIT_DEG` replaces the inline 89.9. Verify: tsc.

## 2. The walker uses it

- [x] 2.1 PlanetPlayer surface look: transport + turn + quaternion each frame; `surfaceForward` / `surfacePitch` and the `lookAt` camera removed. Verify: test 8 (source guard), tsc.
- [x] 2.2 Hand-offs: `importFromSave` seeds the look from the saved view; the end of the space roll uses `lookAlong` with the camera up; the roll slerp ends exactly level. Verify: test 7; headless load check.
- [x] 2.3 `PlanetPlayer.placeAt(position, view?)`; mainPlanet teleport/respawn and rocket exit go through it (rocket exit takes the rocket camera's view and the landed body's radial). Verify: test 8 (`player.position.copy` gone from mainPlanet).

## 3. Input

- [x] 3.1 `lockPointer()` (unadjusted movement, plain fallback) used by every lock site; mousemove drops non-finite deltas and the first event after a lock; lock changes clear the accumulator. Verify: test 8 (no direct `requestPointerLock`), tsc, vite build.

## 4. Verify

- [x] 4.1 All `scripts/*.test.ts`, `scripts/nav-tests.ts`, `npx tsc --noEmit -p .`, `npx vite build`.
- [x] 4.2 Headless Playwright: walk over Earth's north pole while turning, log the per-frame change of the camera forward; load a save with a turned view; teleport to the Moon.
- [ ] 4.3 Owner's in-game check: walk and look for a few minutes (incl. over a pole), open/close menus, load a world, teleport, climb out of a rocket - no snap turns.
