# Design: mp-shared-objects

## What happens today (before this change)

Traced through `server-js/server.js`, `src/net/NetSync.ts`,
`src/net/Multiplayer.ts` and `src/player/PlanetBlockInteraction.ts` (PBI):

1. **Is A's object there for B?** Yes. Every placed kind (torch, furnace,
   electric furnace, workbench, computer, 3D printer, chest, cooker, garbage
   pile, steam engine, hydro generator, copper pipe, cable, launch pad, the
   industry machines incl. the gas collector) publishes from the one save
   path (`GameStorage.save*/remove*` -> `netSync.record`) and B rebuilds it
   through the one restore path (`restoreSavedObject`). The server keeps the
   latest record per (kind, planet, key) and sends them all in the welcome.
2. **Can B open it?** Yes - there is no ownership check anywhere, and the
   rebuilt object is a full object, not a visual. B's panel reads the local
   object, which is current as of the last record.
3. **Do B's changes reach A, and does A's open panel follow?** B's changes
   save through the same path and reach A. But applying any record was
   *remove the object, rebuild it* (`applyRemoteRecord`). So:
   - A chest / furnace / steam engine / printer panel that is open keeps the
     OLD object. It shows stale contents; worse, the next move in it changes
     a detached object that no save iterates - the items the player took
     stay in their inventory while the chest's record never changes: a dupe
     (and a deposit vanishes).
   - Cooker, machine and launch pad panels were closed on every remote record
     (to avoid exactly that) - so a player was kicked out of the panel every
     time the other player, or the other client's simulation, touched it.
4. **Conflicts.** Records were last-writer-wins on the whole record. Two
   players shift-clicking the same stack out of one chest both got it; the
   chest's last record decided what was left.
5. **Simulation.** Every client advanced every furnace, electric furnace,
   cooker, printer and industry machine it had, independently, and each
   published its result. The results were similar (same clock) but raced:
   the host's "smelt finished" record could overwrite B's "took the ingots"
   record (the ingots duplicate), and every client fired the `smelted` /
   `cooked` mission events. Steam engines do not burn fuel over time and
   the hydro generator has no item state, so they did not race.
6. **Breaking.** Anyone could break anyone's object; the breaker gets the
   contents. Kept: the world is shared (the owner asked for shared use).

## The conflict rule: compare-and-set on a record version

**Server.** Each world keeps `versions: key -> v` (in memory; every record
and every removed one) from one per-world counter, so a version is never
reused. A `rec` with `base` is taken only when `base` equals the current
version (`0` = never existed); the server stores and logs it as before,
bumps the version, sends `recAck {v}` to the writer and `rec {v}` to the
others. Otherwise it sends the writer `recNack {v, data}` - the current
record. Over the rate limit, a versioned write is refused the same way (the
writer must never wait forever). A `rec` without `base` (an older client) is
accepted as before. Versions need not survive a restart: every client gets
the versions again in the welcome after it reconnects.

**Client (NetSync).** Per record address: the confirmed version, and at most
one write in flight. A change made while one is in flight waits (`queued`,
later changes overwrite it - only the latest state matters) and is sent on
the version the ack returns. A record from another player that arrives while
ours is in flight is not applied: the server ordered it first, so ours will
be refused and the refusal carries the record to apply - once.

**Undoing a refused change: the trade ledger.** Each write is charged with
what the player action that made it moved between the inventory and the
object. PBI measures it as the difference of the player's item counts
(hotbar + bag + toolbox + held stack) between the start of the action and the
write: a DOM input event (capture phase on `document` - every panel click,
drop, key) starts one, and so does the interaction part of a frame (mining a
machine out, placing one). The simulation part of a frame is not a player
action (the ledger is closed at the top of `update`), so a refused machine
tick refunds nothing. When an action saves several records (the furnace
panel saves all furnaces), the trade goes on the first that changed, and the
open panel's object is saved first (`openFirst`). On `recNack` the object is
rebuilt from the server's copy and `Inventory.undoTrade` takes back what the
player gained and gives back what they put in (hotbar first, then the bag).

**Why this rule.** It is the smallest change that makes a duplicate
impossible for every kind at once: the server never needs to understand a
chest, a furnace's fuel units or a launch pad's cargo - it compares two
integers - and the client undoes by measuring the inventory, not by
interpreting the record, so fuel, ingredients and rocket parts are covered
the same way. Server-side item operations ("take 5 of X from slot 3") would
make the server the referee of every kind's slot rules (stack sizes, fuel
values, filtered slots) - a second copy of game logic that must agree with
the client. Pessimistic locks (one player per panel) are simpler to reason
about but stop two players from using one chest together, which is the
point of the request.

**Trade-offs, stated.**
- A refused change is visible: for one round trip the player sees their move,
  then it is undone with a toast ("someone else used that first"). With two
  players hammering one slot this is the loser's experience; normal shared use
  (different moments) never conflicts.
- If the player already used what they took within that round trip (placed
  it, ate it), `undoTrade` cannot take it back; the shortfall is reported
  (`missing`) and is at most one action's worth. If the inventory is full,
  what does not fit when giving back is reported (`overflow`).
- An async panel action (adding a rocket part loads its model first) may
  write after the frame that started it; it then carries no trade and a
  refusal of it would not refund the part. Conflicts on a pad's stack are
  rare (one player assembling).
- A write in flight when the connection drops is forgotten: after rejoining,
  the welcome is the truth (it may or may not have been applied).
- The local save follows the server's state like any remote record.

## In-place application and panel refresh

`applyRemoteRecord` first looks the object up (`findWorldObject`) and, when
it is there and the record changes only state, applies it in place with
`applySavedState(kind, object, record)`: chest / garbage pile / cooker slots
(copied into the object's own slot objects - `copySlotsInPlace` - so a
panel's references stay valid), furnace and electric furnace fields, a
machine's slots / tank / progress / charge / rods / job (through
`machineFromRecord`), a steam engine's fuel, a printer's jobs and tray, a
launch pad's cargo / equipment / fuel / engine mode. The save load uses the
same function after it rebuilds a furnace, electric furnace or steam engine,
so a record's state reaches an object through one path. A record that
changes structure (another machine type, a different rocket stack / tower /
pad, a different slot count) falls back to remove + rebuild, and any panel
showing the removed object closes (`closePanelsFor`, generic over the
panels). After an in-place apply, every open panel showing the object
redraws (`refreshPanelsFor`); the viewer's held stack lives in their
inventory and is untouched.

## Simulation owner: the planet's host

`netSync.isHost(planet)` already names one client per planet - the lowest
player id there - to run the planet's animals. The same client now advances
the planet's machines: `FurnaceManager.update`, `ElectricFurnaceManager.update`,
`CookerManager.update` and `Printer3DManager.updatePrintJobs` take a
`simulates(position)` predicate, and PBI's machine tick skips machines it
does not simulate (`simulatesAt`). The host publishes results through the
usual saves (smelt finished, dish cooked, machine events and the periodic
busy-machine save); everyone else applies them in place. When the host
leaves, the next lowest id takes over from the last published state (at
most one smelt / one save interval of progress is redone). Offline,
`simulatesAt` is always true (SP unchanged).

Alternative considered: simulate deterministically from timestamps on every
client. It needs every machine's step rewritten as a closed form of time
and every input change stamped - far more change for the same result.

Mission events from machines (`smelted`, `cooked`, `crafted`) now fire on the
host only - the client that ran the step. Crediting the player who loaded
the machine would need the record to carry who did; left for later.

## Chat

One path: a server message type, like `edit` and `rec`. Client -> server
`{ t: 'chat', text }`; the server strips non-printable / non-ASCII
characters, trims, caps at `CHAT_MAX_CHARS`, rate-limits each client to
`CHAT_MAX_PER_WINDOW` lines per `CHAT_WINDOW_MS`, stamps `{ id, name, at }`
and broadcasts to the world including the sender (the sender's log shows the
server's copy - what everyone else saw). The world keeps its last
`CHAT_HISTORY` lines in memory (not on disk; reset with the world) and sends
them in the welcome. NetSync carries it (`netSync.chat`, `onChat`,
`dispatchChat`); Multiplayer turns `chat`, `join`, `leave` and the operator
`notice` into lines - join / leave / notice become system lines in the log
instead of toasts (one place for them).

`ChatUI` follows the JS client's DOM HUD (fixed panels with the game font,
like the toasts and the storage panel): a log at the lower left, lines
fully shown for `SHOW_S` then fading over `FADE_S`, all `HISTORY_LINES`
shown (scrollable) while the box is open. Enter / T open it (free keys; not
E or F, CLAUDE.md Controls); keydown in the box stops propagation so game
keys do not fire, key-up still reaches the game so a held key is released.
It is built only in a server world, so single player has no chat. Numbers in
`src/config/ChatConfig.ts`; the client's length cap is checked against the
server's constant by the test.
