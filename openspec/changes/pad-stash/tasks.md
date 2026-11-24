# Tasks

## 1. Rules and config

- [x] 1.1 `src/config/CarryConfig.ts`: ENABLED, EXEMPT_CATEGORIES, EXEMPT_ITEMS, STASH_SLOTS.
- [x] 1.2 `src/rocket/CarryRules.ts`: `isCarryExempt`, `stowCarried` (all or nothing, merge), `takeAllInto`, `stashFromSave`.

## 2. Pad record

- [x] 2.1 `PlacedLaunchPad.stash` (fresh pads), `SavedLaunchPad.stash` (absent = empty).
- [x] 2.2 Save in `saveLaunchPadStates`, load in `restoreSavedObject`, apply remote in `applySavedState`; a panel showing the stash refreshes.
- [x] 2.3 Guards: last block / merge refused while the stash holds items.

## 3. Boarding

- [x] 3.1 `RocketFlightManager.setBoardingStow`, called by `enterFlightMode` (pad stash) and `boardLandedRocket` (cargo hold); refusal toasts and aborts.
- [x] 3.2 `PlanetBlockInteraction.stowForBoarding` + `takeStash`; saves inventory + pads the same frame.
- [x] 3.3 LaunchPadUI Stash button (count shown) opening the slot grid.

## 4. Tests

- [x] 4.1 `scripts/pad-stash.test.ts`: stash on board, exempt config, retrieval, merge, cargo-only away from a pad, refusal when it doesn't fit, old-save load.
- [x] 4.2 Test in `.github/workflows/static.yml`.
- [ ] 4.3 Owner's in-game check: board at a pad (materials stashed, tools / tanks kept), take the stash back, fly, land, gather, re-board (into the hold / refused when full).
