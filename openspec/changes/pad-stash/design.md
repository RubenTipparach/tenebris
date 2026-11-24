# Design: pad-stash

## Rules chosen

1. **Where the carried items go is decided by what is being boarded**, one
   function for both (`stowCarried(carried, into)` in
   `src/rocket/CarryRules.ts`):
   - a rocket on a launch pad -> that pad's `stash`;
   - a parked / landed rocket (not on a pad) -> that rocket's cargo hold.
   A parked rocket remembers the pad it flew from (`LandedRocket.pad`), but
   that pad can be a planet away, so its stash is never used from afar: the
   hold is the only thing that travels. (A parked rocket docked onto a pad
   is a pad rocket again, so boarding it there stashes at that pad.)
2. **All or nothing.** The move is planned on a copy first; if any carried
   non-exempt item would not fit, nothing moves and boarding is refused with
   a toast ("Not enough room in the cargo hold - store or drop N item(s)
   first" / "The pad's stash is full - ..."). No item is ever destroyed or
   left in limbo. A rocket with no cargo hold refuses whenever anything
   non-exempt is carried.
3. **Exempt items stay on the player**: the config list
   `CARRY.EXEMPT_CATEGORIES` (`'tool'` = any item with `ITEM_DATA.tool`:
   pickaxes, axes, shovels, the fishing rod; `'suit'` = any `SUITS` item)
   plus `CARRY.EXEMPT_ITEMS` (oxygen tank, empty tank, suit heaters). The
   toolbox slots and the worn suit (AirSystem) are not hotbar / bag and are
   untouched. `CARRY.ENABLED = false` turns the whole rule off.
4. **Merge.** Stowing stacks onto the same item first (up to its stack
   size), then fills empty slots - so re-boarding the same pad adds to what
   is already in its stash. A tool's wear (`uses`) travels with it when
   tools are not exempt.
5. **The stash is a fixed grid of `CARRY.STASH_SLOTS` slots** (two full
   inventories), not a growing list. A fixed size keeps the one in-place
   record apply (`copySlotsInPlace` needs equal lengths) and the cargo
   panel (`StorageUI.openCargo`) shows it unchanged. It is saved only while
   it holds something (`stash` absent = empty), so pads without one cost
   nothing in the record and older saves load unchanged.
6. **Taking things back is manual** (the pad's Stash button opens the grid
   beside the hotbar + bag, the same panel as the cargo hold, with drag /
   shift-click as for any storage). Climbing out of a rocket that never
   launched does not auto-return the stash: the stash belongs to the pad,
   not to one player (in MP two players can stash at one pad), so handing
   everything to whoever climbs out first would be wrong. The board toast
   says where the items went.
7. **Guards.** A pad whose stash holds anything can't lose its last block
   (`hexRemovalBlocker`) or be absorbed by another pad (`mergeInto`), the
   same way a pad with a rocket can't.

## One code path

- Both boarding entry points (`enterFlightMode`, `boardLandedRocket` in
  `RocketFlightManager`) call one hook, `boardingStow(slots, where)`, before
  anything changes; mainPlanet wires it to
  `PlanetBlockInteraction.stowForBoarding`, which runs the pure rule, then
  saves the inventory and the pads the same frame (`saveLaunchPadStates` -
  the one pad save path, which publishes the record). A landed rocket's
  hold is its pad's `cargo` array (shared), so the same save covers it.
- The stash saves in `saveLaunchPadStates`, loads in `restoreSavedObject`
  and applies remote records in `applySavedState` - beside `cargo`.
  `panelShows` treats the stash like the cargo array, so an open stash
  panel redraws on another player's change.
- MP: the board click is a DOM input event, so the trade ledger measures
  the stow; a refused pad write gives the items back to the player.

## Bots

`scripts/mp-bots/bot-brain.js` (`launch` mission) boards with
`launchPadUI.handleBoardRocket()`: that now stashes the bot's materials on
its pad (tools stay). After the hop and climbing out, the bot has only its
tools; to keep working it must walk back to its pad, and take the stash
back - `PlanetBlockInteraction.takeStash(pad)` moves everything that fits
back into the hotbar + bag - or load what it needs into the cargo first.
Re-boarding the landed rocket while carrying gathered materials needs room
in the hold, else the board is refused (`fm.isInFlight()` stays false).
