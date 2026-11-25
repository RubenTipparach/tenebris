# Proposal

## Why

Space exploration gives every body a resource and a part, but the worlds are
empty: nothing lives on them that talks back, and nothing asks the player to
come back to a world once its visit mission is done. The owner wants people
on the planets - traders to meet and alien villages that ask for help - and a
**Friendship** mission tree that grows out of the people you meet, so travel
has a social reason as well as a tech one.

## What Changes

- **NPCs on inhabited worlds.** Each inhabited body has a fixed population:
  Metropole Prime (the city world) 15-20 people, every other inhabited world
  5-10. Each world's people are their own species with their own look (no
  species on two worlds, as with flora and fauna), living in one or more
  villages near the surface. Lifeless bodies (barren, icy, asteroids, the
  Moon) have nobody; Earth has no aliens.
- **Roles:** villagers (who ask for things), a village elder (who gives the
  village's bigger requests), and **traders** - a small band of travelling
  merchants who move between inhabited worlds and barter goods from where
  they have been.
- **Talking:** walk up and press Interact (F) to open an in-game panel: the
  NPC's name, their village, your friendship with them, and what they want or
  offer - as item icon grids, never text lists.
- **Village requests (quests):** each village keeps a few open requests drawn
  from three families:
  - *supply* - "our village is hungry": deliver food (cooked fish, stew,
    fruit) toward a village food store that is used up over time;
  - *build* - "help us raise the hall": deliver building materials (brick,
    concrete, steel, glass) toward a structure the village then builds;
  - *collect* - "bring us art from other worlds": find a world's own art
    piece (one per inhabited world, found only there) and bring it back.
  A request is shared world state in multiplayer: any player can deliver
  toward it and each is credited for what they gave.
- **Friendship:** delivering raises your friendship with that village
  (per player). Friendship levels unlock rewards - that world's own recipes,
  better trader offers, cosmetic looks for the character creator.
- **The Friendship mission tree:** a new branch row, hidden until you first
  meet an NPC on another world (it is unlocked by visiting, never by
  crafting). Under it, each inhabited world gets its own sub-tree that
  appears only once you have met someone there; its missions are that
  village's requests and friendship levels.
- **Server-side tracking only while someone is there.** The multiplayer
  server creates a world's population the first time a player arrives on
  it, keeps it in the world's save, and advances it (food eaten, requests
  refreshed, traders moving on) only while at least one player is on that
  world. When the first player comes back, the server fast-forwards the time
  it was away (capped), the time-compression rule in CLAUDE.md. Single
  player runs the same rules on the local save.

## Capabilities

### New Capabilities

- `npc-population`: who lives on which world, how many, their species and
  roles, where they stand, and the rule that a world's population is
  created and advanced only while a player is on it (with a capped catch-up
  on return), in single player and multiplayer alike.
- `npc-interaction`: meeting and talking to an NPC - the Interact prompt,
  the conversation panel, and remembering who each player has met.
- `village-requests`: a village's requests (supply, build, collect), shared
  delivery in multiplayer with per-player credit, village stores used up
  over time, and the art pieces that only one world yields.
- `npc-trading`: travelling traders, their barter offers, how offers depend
  on where a trader has been and on the player's friendship, and trades in
  multiplayer without duplicating items.
- `friendship-missions`: per-player friendship with each village and its
  levels, the hidden Friendship branch and its per-world sub-trees appearing
  as NPCs are met, and the rewards friendship unlocks.

### Modified Capabilities

None (no specs have been synced into `openspec/specs/` yet; the mission
tree's existing behaviour is extended, not changed).

## Impact

- Client: `src/config/` (new NPC and request tables; `Missions.ts` gains the
  `friendship` branch and generated per-world missions), the mission tracker
  and tree panel (branches that appear when met), a new NPC renderer and
  procedural models + baked animations, a talk / request / trade panel,
  `PlanetBlockInteraction` Interact routing, new items (each world's art
  piece, foods if needed) with icons.
- Shared rules: one pure NPC module (population, requests, stores, trader
  routes, catch-up) used by the client and, as a generated bundle, by the
  server - the `game-data.json` pattern, with a test that fails on drift.
- Server (`server-js/`): per-world NPC state in the world's data dir,
  planet presence tracking (from player poses) to wake and sleep a world's
  population, new message types for NPC state and deliveries / trades
  (versioned like records so two players can't both spend one request),
  and an admin portal view of populations.
- Saves: new per-world NPC state (SP local save; MP server file); mission
  saves gain met-NPC and friendship data. Existing saves load unchanged.
