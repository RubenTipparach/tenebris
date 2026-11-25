# Design

## Context

See proposal.md for why. What exists today that this builds on:

- **Missions** (`src/config/Missions.ts`, `src/player/MissionTracker.ts`)
  are a per-player tree saved in each player's own slot. Branches can be
  announced by a mission (`announcedBy`); space exploration already
  generates missions from a table (`visitMission` over `VISIT_ROUTE`) and
  `scripts/missions.test.ts` holds that every recipe is unlocked by exactly
  one mission.
- **Fauna** (`src/planet/Fauna.ts`) is never saved. On each planet the
  host client (`netSync.isHost`, lowest player id there) simulates the
  animals and sends live snapshots; others ease toward them; the next host
  takes over when one leaves.
- **Shared objects** go through records (`GameStorage` save*/remove* ->
  `netSync.record` -> server `rec`), each with a server version: a stale
  write is refused (`recNack`) and the trade ledger in
  `PlanetBlockInteraction` refunds exactly what that action moved, so two
  players can't spend the same thing.
- **The server** (`server-js/server.js`) has no TypeScript build. It
  already knows each player's planet from their poses and stores records
  per world under `DATA_DIR/worlds/`. Game data it needs is generated from
  the client config (`scripts/gen-admin-data.ts` -> `game-data.json`) with
  a test that fails if the shipped file drifts.
- **Rosters** are per planet and provably disjoint (`FaunaConfig`,
  flora `assertFloraRostersDisjoint`); lifeless bodies have nothing.
- Metropole Prime is body `ferrum` (the city tileset, `cityGen`).

## Goals / Non-Goals

**Goals:**
- One rule set for populations, villages, requests and traders, run
  unchanged by the single-player client and the multiplayer server.
- No new sync mechanism for anything the record path already does
  (versioned shared state with refunds).
- Server cost proportional to occupied planets only.

**Non-Goals:**
- Combat, hostile NPCs, NPC pathfinding across the whole planet, NPCs that
  dig or place blocks, voiced or branching dialogue trees.
- NPCs on Earth, on lifeless bodies, or aboard stations.
- A currency or player-to-player market.

## Decisions

### 1. Who lives where: one config table, derived population

`src/config/NpcConfig.ts` lists the inhabited worlds - Metropole Prime
(15-20), and Sequoia, Cinder, Vesper, Halcyon, Tessaly, Umbra, Verdance,
Mirewood and Thalassa (5-10 each) - with each world's species (look
parameters, name syllables), village count, art piece item and friendship
rewards. A pure function builds the population (names, roles, village,
home tile) from `(worldSeed, bodyId)`; it is never stored, only its
mutable state is. A load-time assert and a test hold that species are
disjoint between worlds, as flora and fauna are, and that no lifeless body
or Earth is listed.

*Alternative:* store the generated population. Rejected - deterministic
generation costs nothing to recompute and can't drift between server and
client.

*As built (group 1):* the people (names, roles, villages) and their homes
are two functions. `buildPopulation(worldSeed, body)` needs nothing else and
is what the server runs (the admin view, village sizes). Homes need terrain,
which the server does not have, so `placePopulation(worldSeed, population,
{ radiusM, ground, anchor })` takes the client's ground test (`GroundProbe`:
can an NPC stand at this unit direction) and draws candidate spots from a
seeded sequence, keeping the first the probe accepts: the first village
near the anchor (the body's spawn, so a landing party finds it), the others
apart from it, homes within `VILLAGE.RADIUS_M` of their centre. Every client
has the same terrain and probe, so every client gets the same homes. With no
walkable ground near the anchor the search widens to the whole globe (ocean
worlds); a spot still unaccepted is returned flagged `grounded: false` for
the motion code (task 3.3) to settle, never silently placed in the sea. The
art piece of each world is referenced by a string id (`ArtPiece.id`) until
its item lands in task 4.4, which maps id -> ItemType in one table.

### 2. One rules module, shipped to the server as a generated bundle

The rules (population build, village food store, request draw and
completion, trader route and stock, `advance(state, dt)` for time passing,
the catch-up cap) live in `src/shared/npc/`, pure TypeScript with no three
or DOM. The client imports it directly. `scripts/gen-npc-core.ts` bundles it
with esbuild (already a Vite dependency) into `server-js/npc-core.js`;
`scripts/npc-core.test.ts` rebuilds it and fails when the shipped file
differs - the `game-data.json` pattern - and the Dockerfile copies it.

*Alternatives:* hand-port the rules to JS (two copies that drift - the
exact thing CLAUDE.md forbids), or add a TS build to the server (a bigger
deploy change for one module).

### 3. Mutable NPC state is records

Each village's state (food store, open requests with remaining amounts,
structure stage, timers) is a record of a new kind `village` keyed
`<village index>` on its planet. Each trader is a record of kind `trader`
on a pseudo-planet `traders`, keyed by trader index (route position, stay
timer, stock). A planet's `npcClock` record holds when it was last
advanced.

So:
- **Deliveries and barters are ordinary record writes** from the client:
  the player's action updates the village / trader record with the base
  version it saw. A race is refused by the server, the client rebuilds from
  the server's copy, and the trade ledger refunds the items. No new
  protocol and no new refund code.
- **Persistence and same-frame saving** come with the record path, in
  single player (local save) and multiplayer (server's world records).
- The server writes the same records when it advances time (as `id: 0`,
  like the admin portal's clears), bumping versions, so a delivery racing
  a tick is refused and refunded rather than lost.

*Alternative:* a dedicated NPC message set (`npcState`, `npcDeliver`, ...).
Rejected - it would re-implement versioning and refunds.

*As built (group 2):* the village state is event based, in the planet's NPC
clock T (seconds, running only while the planet is awake): the food store is
(amount at `foodT`) and read with `foodAt(v, T)`, closed slots wait for a
reopen time, a trader leaves at `leaveT` of the world it is on. Advancing
time therefore changes a record only when something happens (a slot
reopens, the store runs low, a trader restocks or moves on), so the server's
ticks write little, and an hour advanced in one step equals an hour in many.
A catch-up also writes the store's current amount (with the low-mark
floor). `npcClock` is `{ T, at, awake }`: the clock T as of wall time `at`,
running on from there while `awake` (`clockNow`). Village and `npcClock`
writes go to the players on that planet; `trader` records go to the whole
world (every player needs them for the system map, task 4.5), and a
player's client writes are relayed as before. A player arriving on a planet
is sent its NPC records at once (they may have missed planet-only writes
while elsewhere).

### 4. Time passes only where someone is

The server keeps an occupancy count per (world, planet) from poses and
disconnects. When a planet goes from 0 to 1 occupants it: creates the
planet's village records if none exist (first visit), reads `npcClock`,
runs `advance(state, min(now - lastAdvanced, CATCH_UP_CAP))` in one step,
and writes the changed records before the arriving player's next frame.
While occupied it ticks occupied planets at a low configured rate. When the
last player leaves it advances to now, stamps `npcClock` and stops. Planets
nobody is on cost nothing.

Traders advance with the planet they are on: a trader on an empty world
waits there (the spec's "moves on only while time advances for its world").

Single player runs the same module: on load and on arrival it applies the
same capped catch-up from the saved `npcClock`, and ticks the player's
planet. This is the "time compression on resume" rule in CLAUDE.md, and its
`world_time` dispatch: `src/shared/npc` registers as the first subsystem of
a small `src/shared/worldTime.ts` that owns the cap and the catch-up call.

*As built (group 2):* occupancy counts a player on a planet from their
first pose (not from connecting). While awake, `npcClock` is restamped at
least every `CLOCK_STAMP_S`, so a server crash re-applies at most that much
time; a clean stop (SIGTERM) puts every occupied planet to sleep first. A
world reset or delete drops the occupancy without stamping (its records are
going). For tests, a server started with `NPC_TEST_CLOCK=1` accepts
`POST /admin/api/npc-clock { addMs }` to move the NPC clock forward and tick
(404 otherwise) - task 6.1's "server clock moved forward" uses it. The
bundle includes the `ItemType` table it names items with, so changing
`Inventory.ts` also means regenerating `npc-core.js` (the drift test says so).

### 5. Motion is the fauna pattern, not server physics

The server has no terrain, so NPC movement is simulated by the planet's
host client exactly as fauna is: the host wanders each NPC around its home
tile (village radius from config, ground and water checks from the
terrain), broadcasts snapshots on a live channel `npc`, others ease toward
them, and the next host takes over. A panel open on an NPC is sent as a
live `npcTalk` so the host stops and turns that NPC. Nothing about motion
is saved: NPCs restart at home after a reload.

### 6. Models and animation

Each species gets a procedural mesh (the `FaunaModels` approach: parameters
per species in `NpcConfig`), drawn instanced, with baked idle / walk / talk
clips in `public/animations/npc_<species>.anim.json` from a generator under
`scripts/`, per the asset rules. Each world's species looks like nothing
else (CLAUDE.md roster rule).

### 7. Talking and the panel

The Interact (F) routing in `PlanetBlockInteraction` gains NPCs as a
target, picked like animals (`pick` under the crosshair, within talk
range); the prompt uses `controls`' action label. The panel is a new DOM
panel beside StorageUI / MachineUI, built from their slot-grid code: header
(name, role, village, friendship bar), the requests or offers as icon
slots, and the hotbar + bag grid it draws from (`bag::available`-style
combined take; gives through `Inventory.give`, so overflow lands in a
sack).

### 8. Requests and art

Requests are drawn from per-family tables in `NpcConfig` (supply: foods;
build: building materials and a structure with stages; collect: another
world's art piece), weighted by the village's state (a low food store
forces supply). Each world's art piece is a new item with its own icon,
obtainable only on that world: its elder gives pieces as part of the reward
for that village's completed supply and build requests. Collect requests
therefore tie worlds together - you help one village to earn the art
another wants.

Village structures are drawn procedurally per stage from the village
record (not block edits), so they cannot conflict with players' building
and are rebuilt like any placed object on load.

### 9. Friendship and the tree

Friendship is per player and lives in the mission save: the tracker gains
`met` (NPC ids and worlds) and `friendship` (score per village). A delivery
credits the player by the items they moved (the same trade delta the
ledger measures, so a refunded delivery credits nothing).

The `friendship` branch is announced by a new announce source - the first
`met` event - rather than a mission. Its missions are generated from
`NpcConfig` per world (like `visitMission`) with new objective kinds:
`met` (an elder of `body`), `delivered` (a request family on `body`), and
`friendLevel` (a level with a village of `body`). A mission field
`shownWhenMet: body` hides a world's sub-tree until a `met` event on that
world. Friendship rewards are the missions' `unlocks`, so the
exactly-one-mission recipe test covers them unchanged.

## Risks / Trade-offs

- [Server ticks write many records] -> tick at a low rate, write only
  records whose state changed, and broadcast only to players on that
  planet.
- [The bundle drifts from the source] -> the drift test fails CI; the
  generator is one command.
- [Host leaves mid-conversation] -> the talk state is re-sent by the
  talker each second, so the new host picks it up; the NPC panel itself is
  client-side and stays open.
- [Catch-up after a long absence empties every food store at once] -> the
  cap (config, e.g. one in-game week) and a floor: a catch-up never drops a
  store below its low mark, it only opens the supply request.
- [Population size makes Metropole Prime heavy on the host] -> instanced
  drawing, a live snapshot rate no higher than fauna's, and NPCs far from
  every player on that world frozen at home.
- [Players expect NPCs on Earth] -> stated as a non-goal; travelling
  traders could later visit Earth without changing these rules.

## Migration Plan

Additive only. Old saves load with no NPC records (created on first visit)
and no friendship data (branch hidden). The server gains `npc-core.js` and
the occupancy hooks; deploying an older client against the new server just
leaves `village` / `trader` records unread. Rollback: redeploy the previous
server; the extra records are inert.

## Open Questions

- Names, greetings and request wording per species - content, filled in
  during implementation without changing structure.
- Exact numbers (catch-up cap, food use rate, request amounts, level
  thresholds, trader stay length) - tuned in `NpcConfig` after the first
  playtest.
