# Tasks

## 1. Pure pose maths and action wire format

- [x] 1.1 `src/config/AvatarConfig.ts`: head pitch limit, blend rates, mine grace, counter modulus, held-item sizes. Verify: tsc.
- [x] 1.2 `src/net/AvatarPose.ts`: `avatarTransforms`, `encodeAction` / `decodeAction`, `OneShotTracker`, `LocalAction`. Verify: `scripts/avatar-pose.test.ts`.

## 2. Clips and avatar

- [x] 2.1 `scripts/gen-fauna-anims.py`: player `mine`, `place`, `interact`; regenerate `public/animations/player.anim.json`. Verify: the test reads the shipped file.
- [x] 2.2 `src/net/Avatar.ts`: head pitch, action overlay, held item. Verify: tsc, headless screenshots.

## 3. Wire it

- [x] 3.1 `PlanetBlockInteraction`: `LocalAction` fed from `updateMiningUI`, every right-click action and animal hits; `getActionFrame()`. Verify: test source guard (no bare cooldown assignment left).
- [x] 3.2 `mainPlanet` `getPose` returns the action; `Multiplayer` sends `a`, decodes it, drives the avatar; body from `avatarTransforms`. Verify: tsc, headless.
- [x] 3.3 `server-js/server.js`: validate + relay `a`, keep it for `welcome`. Verify: `node --check`, headless two-client run.

## 4. Verify

- [x] 4.1 All `scripts/*.test.ts`, `npx tsc --noEmit -p .`, `npx vite build`, `node --check server-js/*.js`, `openspec validate --all --strict`.
- [x] 4.2 Two headless clients (`scripts/mp-e2e/avatar-shots.cjs`): avatar-pitch-up.png, avatar-pitch-down.png, avatar-mining.png.
