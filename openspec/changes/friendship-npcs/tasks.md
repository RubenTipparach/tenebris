# Tasks

## 1. Config and the shared rules module

- [x] 1.1 Add `src/config/NpcConfig.ts`: the inhabited worlds (Metropole Prime 15-20; Sequoia, Cinder, Vesper, Halcyon, Tessaly, Umbra, Verdance, Mirewood, Thalassa 5-10), each world's species, village count, art piece and friendship rewards, plus the tunables (catch-up cap, tick rate, food use, request amounts, level thresholds, trader stays). Verify with `scripts/npc-config.test.ts`: species disjoint across worlds, no lifeless body or Earth listed, every count range as the spec says.
- [x] 1.2 Add `src/shared/npc/population.ts`: build a world's population (names, roles, villages, home tiles) from `(worldSeed, bodyId)`; homes from `placePopulation` with the client's ground test (design 1, as built). Verify with tests: same inputs give the same people; sizes in range; exactly one elder per village; homes on walkable ground for a sample of seeds on each world.
- [x] 1.3 Add `src/shared/npc/village.ts` and `traders.ts`: the village state (food store, requests, structure stage), request draw and completion, trader route and stock, and `advance(state, dt)`. Verify with tests: food is used up while time advances; a low store opens a supply request; completing a request applies its effect and opens a new one after the delay; a collect request never asks for its own world's art; a trader moves on after its stay.
- [x] 1.4 Add `src/shared/worldTime.ts` (the catch-up cap and dispatch, CLAUDE.md time compression) with NPCs as its first subsystem. Verify with a test: advancing by an hour in one step equals advancing in many small steps (within tolerance), and an absence longer than the cap advances by the cap.
- [x] 1.5 Add `scripts/gen-npc-core.ts` bundling `src/shared/npc` into `server-js/npc-core.js`, copy it in the server Dockerfile, and add `scripts/npc-core.test.ts` that rebuilds and fails when the shipped file differs. Verify the test passes, and fails after a one-character edit to the source without regenerating.

## 2. Server: presence, records and ticking

- [x] 2.1 Track occupancy per (world, planet) in `server-js/server.js` from poses and disconnects. Verify with a `server-js/test/` case: two players join a planet and one leaves; the count goes 1, 2, 1, 0 and other planets stay 0.
- [x] 2.2 On a planet's first occupant, create its `village` records if missing and apply the capped catch-up from its `npcClock`; while occupied, tick at the configured rate; on the last leave, advance to now and stamp `npcClock`. Verify with server tests: an unvisited planet has no records; a planet left empty for an hour does not change until someone arrives, then changes by an hour at once; the cap applies.
- [x] 2.3 Write server-side changes as records (id 0, version bumped) to players on that planet only, and make a client write against a stale version (a tick landed first) be refused. Verify with a server test: a delivery based on the pre-tick version is nacked with the current record.
- [x] 2.4 Show each world's population, villages, open requests and traders in the admin portal (`server-js/admin.js`). Verify with an admin API test and a headless screenshot of the portal page.

## 3. Client: state, rendering and motion

- [x] 3.1 Register `village`, `trader` and `npcClock` as record kinds in `GameStorage` and route them through the existing restore and remote-apply paths. Single player: create, catch up and tick the player's planet with the same module. Verify with a test that a single-player save reloaded after a day applies the same capped catch-up the server would.
- [x] 3.2 Add NPC models: a procedural mesh per species, drawn instanced, and baked idle / walk / talk clips (`public/animations/npc_<species>.anim.json`) from a generator under `scripts/`. Verify with a headless screenshot of each world's species standing in a row, and the roster disjointness test.
- [ ] 3.3 Place homes with `placePopulation` and the planet's own ground test (spawn as the anchor), settling any `grounded: false` spot. Simulate motion on the planet's host (wander near home, ground and water checks) with live snapshots on channel `npc` and host handoff, as fauna does. Verify with the two-client harness (`scripts/mp-e2e/`): both clients see the same NPC positions, and the second takes over when the host leaves with no NPC popping.
- [ ] 3.4 Show village structures per stage from the village record, rebuilt on load. Verify with a headless shot of a village before and after a build request completes, and after a reload.

## 4. Talking, requests and trading

- [ ] 4.1 Route Interact (F) to the NPC under the crosshair within talk range, with the prompt from the binding's label; send `npcTalk` so the host stops and turns the NPC. Verify with a test of the prompt text against a remapped binding, and a headless shot of an NPC facing the player.
- [ ] 4.2 Add the NPC panel (in-game DOM panel, icon slot grids, hotbar + bag shown and drawn from): header, friendship bar, requests for villagers and elders. Verify with a headless screenshot of an elder's panel with three requests.
- [ ] 4.3 Deliver toward a request (combined hotbar + bag take, capped at the amount needed) as a village record write, persisted the same frame. Verify with tests for partial delivery and no over-delivery, and a two-client run where A and B race the last items of a request: one is taken and the other refunded.
- [ ] 4.4 Add each world's art piece item with its icon (drawn in Sweaft-64 by the item icon generator), given only by that world's elder as part of request rewards. Verify with an icon test and a test that no other world's villages give it.
- [ ] 4.5 Add the trader panel: barter offers as icon slots, all-or-nothing trades through `Inventory.give`, shared stock as a trader record write, friendship-adjusted offers, and the met trader's world on the system map. Verify with tests for paying from hotbar + bag together, refusing a short payment, a two-client last-unit race (one refunded), and a better rate at a higher level.

## 5. Friendship and the mission tree

- [ ] 5.1 Save `met` and per-village `friendship` in the mission save; credit a delivery by the trade delta the ledger measures (a refunded delivery credits nothing). Verify with `missions.test.ts` cases: credit is per player, a refund removes no credit it never gave, old saves load with none.
- [ ] 5.2 Add the `friendship` branch, announced by the first `met` event (toast once, not again after reload), hidden until then. Verify with `missions.test.ts` cases and a headless screenshot of the tree before and after the first meeting.
- [ ] 5.3 Generate each world's friendship missions from `NpcConfig` (meet the elder, each request family, each level) with objective kinds `met`, `delivered` and `friendLevel`, and `shownWhenMet` hiding unmet worlds. Verify with tests: a world's sub-tree appears only after meeting someone there; every friendship reward recipe is unlocked by exactly one mission (the existing test, unchanged).
- [ ] 5.4 Apply level rewards per player: the world's recipes (as mission unlocks), trader rate changes and character-creator looks. Verify with a test that reaching a level unlocks its recipe for that player only, and a headless shot of a new look in the creator.

## 6. Integration

- [ ] 6.1 Headless two-client run on a fresh local server: both land on Sequoia, meet the elder, deliver toward a supply and a build request together, see the structure rise, leave the planet, and return after the server clock is moved forward; the catch-up is applied once. Summarise the run and screenshots in the PR.
- [ ] 6.2 Ask the owner to play it in game: meeting NPCs on two worlds, a shared delivery with a second player, a trade, and the Friendship tree appearing world by world.

## Workflow follow-up

- Archive the change after the owner's in-game check, and sync its specs into `openspec/specs/`.
