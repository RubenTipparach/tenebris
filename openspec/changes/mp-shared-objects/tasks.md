# Tasks

## 1. Findings

- [x] 1.1 Trace what B can do with A's objects today; write it down (design.md, "What happens today").

## 2. Server

- [x] 2.1 Record versions per world; `base` compare-and-set; `recAck` / `recNack` (also over the rate limit); versions in the welcome and in relayed records.
- [x] 2.2 `chat` message: clean, cap, rate-limit, stamp, relay to the world incl. the sender; last lines in the welcome; cleared on reset.
- [x] 2.3 `server-js/test/shared-objects.test.mjs`: two clients in one chest end with the right totals; stale write refused with the current record; chat relay / cap / rate limit / history.

## 3. Client sync

- [x] 3.1 NetSync: versions, one write in flight per record, queued changes, ack / nack, trade ledger hook, chat dispatch.
- [x] 3.2 Multiplayer: send `base`; handle `recAck`, `recNack`, `chat`; join / leave / notice as system chat lines.
- [x] 3.3 PBI trade ledger (`Inventory.itemCounts`, `Inventory.undoTrade`); player actions = DOM input events + the interaction part of a frame; open panel's object saved first.
- [x] 3.4 `findWorldObject` + `applySavedState` (in place; the save load uses it too) + `refreshPanelsFor` / `closePanelsFor`; panels get `refresh()`.
- [x] 3.5 One simulator per planet: `simulates` predicate on the furnace, electric furnace, cooker and printer updates; machine tick gated on `simulatesAt`.

## 4. Chat UI

- [x] 4.1 `src/config/ChatConfig.ts`, `src/net/Chat.ts` (parse / clean / format / scrollback), `src/net/ChatUI.ts` (log + box), built only in a server world.

## 5. Tests and checks

- [x] 5.1 `scripts/shared-objects.test.ts`: conflict rule (concurrent takes never dupe, stale write rolls back, refund of queued trades, no refund for machine ticks), in-place refresh, single simulator, chat lines, cap agrees with the server.
- [x] 5.2 Both tests in `.github/workflows/static.yml`.
- [x] 5.3 Headless two-player check: chest shared (mp-chest-A.png, mp-chest-B.png) and a chat line (mp-chat.png).
- [ ] 5.4 Owner's in-game check with two players: shared chest, furnace, launch pad cargo; chat.
