# Proposal: mp-shared-objects - use each other's stuff in multiplayer, and chat

## Why

The owner, 2026-11-24: "can you make it so people can use each other's stuff
in multiplayer? tech blocks, storage etc". Later the same day, for the same
PR: "add chat to the client too".

Placed objects already sync as records (NetSync, one save path, one restore
path), and nothing stops player B from opening player A's chest. But using
it together does not work (design.md, "What happens today"): B's open panel
points at an object the next record throws away, so B's later moves are lost
or duplicated; two players taking from one chest both get the stack (records
are last-writer-wins); and every client runs every furnace, cooker and
machine, so their records overwrite each other. There is no chat at all.

## What Changes

- **Versioned records, compare-and-set writes.** The server gives every
  record a version. A client writes a record naming the version it changed;
  the server takes it only if that is still the current version and answers
  the writer (`recAck`), or refuses it with the current record (`recNack`).
  One write per record is in flight at a time; later local changes wait and
  go as one write on the acked version.
- **A refused change is undone, exactly.** Every player action (a panel
  click / drop / key, or the interaction part of a frame: mining a machine,
  placing one) measures what it moved between the player's inventory and the
  object (the trade ledger). On a refusal the object is rebuilt from the
  server's copy and the inventory gets back exactly that trade, so two
  concurrent takes can never both keep the items.
- **Records apply in place.** Another player's record of an object already
  here updates its contents / fuel / progress / jobs on the same object
  (`applySavedState`, the one place a record's state reaches an object - the
  save load uses it too), and any open panel showing it redraws, keeping the
  viewer's held stack. Only a structural change (a different machine, a
  rebuilt rocket stack) rebuilds the object; a panel showing an object that
  is removed closes.
- **One simulator per planet.** Furnaces, electric furnaces, cooking
  stations, 3D printers and the industry machines advance only on the
  planet's host - the same host (lowest player id on the planet) that runs
  its animals - which publishes the results. Offline, the client simulates
  everything as before.
- **Shared, not owned.** Any player can open, use and break any placed
  object; there is no owner.
- **Chat.** Enter or T opens a box at the lower left, Enter sends, Esc
  cancels; a log above it shows the last lines and fades. The server relays a
  line to the world with the sender's name and time, strips control
  characters, caps the length, rate-limits, and keeps the last few lines for
  joiners. Join / leave lines and the admin portal's notice appear in the log
  as system lines (instead of toasts). Single player has no chat.

## Impact

- `server-js/server.js`: record versions, `base` / `recAck` / `recNack`,
  the `chat` message, chat history in the welcome.
- `src/net/NetSync.ts`: versions, the write queue, the trade ledger hook,
  chat dispatch. `src/net/Multiplayer.ts`: the new messages.
- `src/player/PlanetBlockInteraction.ts`: the ledger, in-place apply and
  panel refresh, the simulator gate. Managers' `update` take a `simulates`
  predicate. Panels get `refresh()`.
- New: `src/net/Chat.ts`, `src/net/ChatUI.ts`, `src/net/SharedState.ts`,
  `src/config/ChatConfig.ts`; tests `scripts/shared-objects.test.ts`,
  `server-js/test/shared-objects.test.mjs` (both in CI).
- Wire compatibility: a client without `base` is still accepted
  (last-writer-wins, as before); older clients ignore the new messages.
