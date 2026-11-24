# Spec Delta

## Purpose

Who lives on which world: the size, species, roles and homes of each
inhabited world's population, and when that population exists and moves on
in time, in single player and multiplayer.

## ADDED Requirements

### Requirement: Inhabited worlds and population sizes

Each inhabited world SHALL have a population of fixed size, chosen once per
game world: Metropole Prime between 15 and 20 people inclusive, and every
other inhabited world between 5 and 10 inclusive. Lifeless bodies (barren,
icy and asteroid bodies, the Moon) and Earth SHALL have no NPCs.

#### Scenario: City world population
- **WHEN** a population is created for Metropole Prime
- **THEN** it holds between 15 and 20 NPCs

#### Scenario: Ordinary inhabited world
- **WHEN** a population is created for any other inhabited world
- **THEN** it holds between 5 and 10 NPCs

#### Scenario: Lifeless body
- **WHEN** a player lands on an asteroid, the Moon or an icy or barren world
- **THEN** no NPC exists or appears there

### Requirement: Deterministic population

A world's population (names, species, roles, villages and homes) SHALL be
derived from the game world's seed and the body, so every player and every
server restart sees the same people.

#### Scenario: Same world, same people
- **WHEN** two players on the same server world arrive on the same planet
- **THEN** they see the same NPCs with the same names in the same villages

### Requirement: One species per world

Each inhabited world's NPCs SHALL be of species found on no other world, with
their own model and look; no NPC species appears on two worlds.

#### Scenario: Species are disjoint
- **WHEN** the NPC species of every inhabited world are listed
- **THEN** no species appears in two worlds' lists

### Requirement: Roles

Every inhabited world SHALL have at least one village with exactly one elder;
the rest of its residents are villagers. Traders are a separate band of
travelling NPCs that belong to no world and are present on at most one
inhabited world at a time.

#### Scenario: A village has one elder
- **WHEN** any village's residents are listed
- **THEN** exactly one of them is its elder

#### Scenario: A trader is in one place
- **WHEN** a trader is on a world
- **THEN** it is not on any other world at the same time

### Requirement: NPCs live near their village

NPCs SHALL stand and wander on walkable ground within their village's area
and SHALL NOT spawn inside blocks, in water deeper than they can wade, or in
the air.

#### Scenario: Wandering stays home
- **WHEN** an NPC has wandered for a long time
- **THEN** it is still within its village's area, on the ground

### Requirement: Populations exist only once visited and advance only while occupied

A world's population SHALL be created the first time any player arrives on
that world. Its state SHALL advance in time (stores used, requests renewed,
traders moving on) only while at least one player is on that world. When a
player arrives on a world nobody was on, the time since it was last occupied
SHALL be applied in one step, capped at a configured maximum.

#### Scenario: Never visited
- **WHEN** no player has ever been on Cinder
- **THEN** Cinder has no population stored on the server or in the save

#### Scenario: Asleep while empty
- **WHEN** the last player leaves Vesper and nobody returns for an hour
- **THEN** Vesper's population does not change during that hour

#### Scenario: Catch-up on return
- **WHEN** a player lands on Vesper after it was empty for an hour
- **THEN** Vesper's population is advanced by that hour at once, before the player sees it

#### Scenario: Long absence is capped
- **WHEN** a world was empty for longer than the configured cap
- **THEN** it is advanced by the cap, not the full absence

### Requirement: Same rules in single player and multiplayer

Single player SHALL create, store and advance populations by the same rules,
with the local save in place of the server and the player's own presence in
place of the server's presence tracking.

#### Scenario: Single player catch-up
- **WHEN** a single-player save is reloaded on a world after a day away
- **THEN** that world's population is advanced by the same capped amount the server would apply

### Requirement: Population persists

A created population and its state SHALL persist with the game world: across
server restarts and machine stops in multiplayer, and in the save in single
player. A world reset by the operator SHALL clear it.

#### Scenario: Server restart
- **WHEN** the server restarts after players met NPCs on Sequoia
- **THEN** Sequoia's NPCs and their state are the same after the restart
