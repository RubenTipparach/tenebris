# Proposal: pad-stash - fly only with what the rocket carries

## Why

The owner, 2026-11-24: "restrict items the player can carry such that you
HAVE to load items into the rocket, and the player inventory is left in a
stash on the launch pad". Later the same day: "player equipment such as the
space suit, oxygen tanks, fishing rod, pickaxe etc. can STAY with the player
when boarding ... Only other items (materials, blocks, food, ores...) go to
the pad stash. Make the exempt set a config list".

Today a player boards with their whole hotbar + bag, so a trip to another
planet needs no planning: everything they own goes with them. The point of
the rocket's cargo hold (and of building cargo bays) is lost.

## What Changes

- **Boarding at a launch pad stashes what the player carries.** Every
  hotbar + bag item that is not exempt moves into a new `stash` on that
  pad, merged onto what is there, the same frame (saved and synced with the
  pad record like its cargo). The player flies with only the exempt items.
- **Exempt: tools and survival gear** - a config list
  (`src/config/CarryConfig.ts`: `CARRY.EXEMPT_CATEGORIES` = tools, suits;
  `CARRY.EXEMPT_ITEMS` = oxygen / empty tanks, suit heaters). The toolbox
  and the worn suit are never part of the hotbar / bag and never move.
- **The stash is opened from the launch pad panel** (a new Stash button)
  in the same slot-grid panel as the cargo hold, beside the hotbar + bag;
  any player at the pad may take from it (or put into it).
- **Boarding a parked rocket (no pad) loads the cargo hold.** The
  non-exempt items go into the rocket's cargo hold; if they do not all fit,
  boarding is refused with a toast and nothing moves.
- **A full stash refuses boarding too** (same rule, same code path), so no
  item is ever lost.
- **A pad holding a stash cannot lose its last block** or be merged into
  another pad.
- Older saves load unchanged: a pad record without `stash` has an empty one.

## Impact

- `src/config/CarryConfig.ts` (new), `src/rocket/CarryRules.ts` (new, pure
  rules), `src/planet/LaunchPad.ts` (`stash` field, break / merge guards),
  `src/engine/GameStorage.ts` (`SavedLaunchPad.stash`),
  `src/player/PlanetBlockInteraction.ts` (save / restore / apply the stash,
  stow on board, take back), `src/player/LaunchPadUI.ts` (Stash button),
  `src/rocket/RocketFlightManager.ts` (one boarding hook for both paths),
  `src/mainPlanet.ts` (wire it).
- MP bots (`scripts/mp-bots/bot-brain.js`, owned elsewhere): after a launch
  their materials sit in the pad's stash; see design.md "Bots".
