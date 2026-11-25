# Handoff: space flight, rocket tuning and the MP bots (2026-11-24)

Everything is on branch `claude/space-flight`, open as **draft PR #128**
(https://github.com/RubenTipparach/tenebris/pull/128). The sub-PRs #125, #126, #127, #129, #130 and #131 were merged into it and closed, so it is the only PR.

Last checks on the combined branch: `npx tsc --noEmit` clean, all 41 `scripts/*.test.ts` pass, `npm run build` OK.

Nothing here is deployed. The live game (heavyphoton.com, itch.io, tenebris.fly.dev) still runs `main` without any of it.

## What #128 changes in the game

### Rocket rules and tuning
- **Tier 1 is an Earth-Moon rocket** (Rocket Engine + Medium Fuel Tank + Command Module):
  - Isp 78 and medium tank dry mass 200 kg give 461 m/s of delta-v and an Earth thrust-to-weight of 1.96.
  - Hand-flown Earth->Moon it should land with about 15% of its fuel. `scripts/rocket-reach.test.ts` asserts 10-20%, using `PILOT_FACTOR` 2.3, which was derived from real bot flights.
  - The trip home needs a refuel on the Moon.
- **Vacuum Engine:**
  - 20 kN of thrust. No full-tank stack lifted by it leaves Earth (the best is 0.96).
  - Vacuum Engine + Large Tank + Command Module lifts off the Moon at 1.34.
  - One stack still leaves Earth: a Rocket Engine booster under a vacuum stage (RE M | V M C), at 1.04.
- **One engine per stage, as the bottom part of that stage.** The Rocket Engine is `boosterOnly`: it only fires as the bottom stage. The command module must be in the top stage. A stack holds at most 8 parts (`MAX_STACK_PARTS`).
- **Stack frame mass:** the k-th part from the bottom adds (k-1) x `STACK_LEVEL_KG` (15 kg), so tall stacks lose thrust-to-weight.
- **Staging:** the N key. The flight HUD shows "[N] STAGE", which turns yellow ("STAGE NOW") when the active stage runs dry.

### Pads, refuelling, respawn
- **A pad lets its rocket go at liftoff:** parts, fuel and hold are cleared, and the tower and stash stay. This fixed a reload duplicating a flown rocket back onto its pad.
- **Refuelling** only works on a body's ground (`REFUEL_MAX_ALTITUDE_M`), and only on a fresh key press. The F that boards you no longer refuels.
- **Crash respawn:**
  - The crash screen's RESPAWN calls `respawnAfterCrash` (beside the origin pad, or the nearest planet). It used to reload the page.
  - The pose autosave skips flights, which fixed respawning in space.
  - In-game check: `scripts/mp-bots/checks/crash-respawn.js`.
- **Landed rockets** are re-parented to the body they land on. A Moon->Earth rocket was being drawn near the Moon.
- **Launch pads are set into the ground,** flush with it. You walk on them instead of sinking in. There is no skirt, and lower ground underneath is filled with stone. Older pads settle on load (`settledPadTop`).

### Pad stash
- Boarding at a pad stashes everything carried except gear (`src/config/CarryConfig.ts`: tools, suits, oxygen tanks, suit heaters). Only the cargo hold flies.
- Boarding a parked rocket away from a pad moves what you carry into its hold. If it doesn't fit, boarding is refused.

### Stack editor
- Drag parts anywhere in the stack, in or out, on the pad. Refits get Up, Down and Insert buttons.
- Part tooltips work everywhere.
- The two-slot part placement was 1 m off. That caused the z-fighting and the gap.

### Water
- **Waterfall seams closed:** the `sideFloor` rule in `src/water/LiquidMesh.ts`.
- **Lag fix:** a water-only change remeshes only the chunk's water (`rebuildChunkWater`). That cut the rebuild cost from about 2.5 s to 0.5 s per 45 s next to a fall.
- **Smoothing removed:** the between-tick water smoothing is gone, as the owner asked. Water now steps once per 0.35 s tick.

## Owner decisions still open
1. **Vacuum lift-off on part-full tanks:** a vacuum + medium tank stack under about 90 units can still lift off Earth with about 900 m/s. Closing that needs a new mechanic, such as the vacuum engine losing thrust in an atmosphere.
2. **Orbits:** Sequoia, Vesper, Ember and Lodestone swing close to Earth. At those times the best tier-1 rocket can reach Sequoia or Kessel in 11-23% of their windows. Moving the orbits is the owner's call.
3. **The stash:** it does not return automatically when you climb out without launching. That was left out on purpose because a stash is shared in MP.
4. **No way to drop or bin items:** with a small hold you can't board while carrying a lot.

## Owner in-game checks (green tests are not proof)
- **Basic rocket:** fly Earth->Moon and check that about 15% fuel is left.
- **Crash, then RESPAWN:** you should be on the ground, not in space.
- **Refuelling:** exit and re-enter in space, which must not refuel. Refuelling on the ground must still work.
- **Launch:** after liftoff the pad is empty and stays empty after a reload.
- **Stack editor and tooltips:** drag parts, check tooltips, and stage with N.
- **Two-slot tanks:** large tanks sit flush with no flicker. Older rockets with two-slot parts look 1 m shorter.
- **Waterfalls:** check the foot of a fall for the slit and for stutter. Do the stepped flow updates look OK?
- **Pads:** you walk on them and don't sink in.

## The MP bots (`scripts/mp-bots/`)
- **Run:** `npx vite --port 5179 --strictPort --host 127.0.0.1`, then `MINUTES=0 node scripts/mp-bots/run.cjs <outDir>`.
- **Bots:** Kestrel (miner, flies the rockets) and Rivet (builder). `BOTS` takes `name:role:profile`, and they still use the old `Claude-Miner` and `Claude-Builder` profile folders under `~/.tenebris-bots`.
- **Debug hook:** drop `<outDir>/cmd-<name>.js`; the result lands in `cmd-<name>.out.json`. `window.__bot.x` exposes the skills.
- **What they can do:**
  - Fly with an autopilot on the pilot's own keys: a damping-aware coast profile, powered or parachute landing, staging, launch windows, landing next to the home pad.
  - Fuel from water buckets or ice, and carry fuel for the way home in the hold.
  - Make trips to other bodies for `BODY_RESOURCES`, mining between breaths and resting in the cabin.
  - Build and upgrade rockets through the pad editor (`applyStackOp`).
  - Shear sheep, fit a parachute, take the stash back after a flight.
  - Build a Moon launch site:
    - The first trip carries pad blocks and tower segments; the bot lays the pad and raises the tower.
    - The second trip carries vacuum engine, large tank and command module; the bot builds the rocket on the Moon pad.
    - The bot fuels it with fuel made from Moon ice.
  - This launch-site logic is written but has not run yet.
  - Log every flight as `flight log: ...`.
- **Gentle rules (`GENTLE`):**
  - No digging to get somewhere and no mining a way to a machine. They give up instead.
  - No exploratory digging: ore is looked up in the loaded world data.
  - Only ore they want. They give up on machines they can't open after 3 tries.
- **State when stopped:**
  - Kestrel had 54 missions done and Rivet 46, both on Earth.
  - Kestrel was building a basic rocket for a titanium trip to the Moon, still blocked on setting up power for printing.
  - Kestrel's previous basic rocket is stranded on the Moon (it died in a pit; that is fixed now).
  - Pad 19337 is empty with a tower.
  - The owner's pad 3052 holds an old two-engine stack that the new rule refuses, and a parked rocket points at it, so the bots leave it alone.
- **Known weak spots:**
  - Many of the bots' old machines and chests sit in pits they dug earlier. The gentle rules make them rebuild instead of digging to them, so progress is slow.
  - Each dead end found so far was fixed as it came up: hydro on a shore, room for the furnace, walled-in machines, the stashed-parts loop.
- **Next for the bots:**
  1. Get the Moon site built.
  2. Fly the vacuum rocket from the Moon to Sequoia (parachute landing and beacon; the Visit Sequoia mission).
  3. Come back.

Probe scripts used in this session (not in the repo) are in `~/.claude/jobs/61338fe4/tmp/` (`padprobe*.js`, `waterprof.js`, `twr.js`, etc.).
