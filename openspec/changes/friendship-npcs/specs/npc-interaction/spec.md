# Spec Delta

## Purpose

Meeting and talking to an NPC: the prompt, the conversation panel, and each
player's record of who they have met.

## ADDED Requirements

### Requirement: Interact to talk

When the player is within talking range of an NPC and looking at it, the
game SHALL show the Interact prompt with the NPC's name, using the Interact
binding's own label, and pressing Interact SHALL open that NPC's panel.

#### Scenario: Prompt follows the binding
- **WHEN** the player looks at a villager named Oru within range
- **THEN** the prompt reads "[F] talk to Oru" with the key shown from the current Interact binding

#### Scenario: Out of range
- **WHEN** the player is farther than talking range
- **THEN** no talk prompt is shown and Interact does what it would do otherwise

### Requirement: Conversation panel

An NPC's panel SHALL be an in-game panel (never a browser dialog) showing
the NPC's name, role and village, the player's friendship level with that
village, and - by role - the village's open requests (an elder or villager)
or the trader's offers. Every item in it SHALL be shown as an icon slot with
a count, never as a text list. The panel SHALL show the player's hotbar and
bag, and anything it takes from the player SHALL come from either.

#### Scenario: Requests as icons
- **WHEN** the player opens a villager's panel and the village wants 12 cooked fish
- **THEN** the request shows a cooked fish icon slot with the amount still needed

#### Scenario: Hotbar items count
- **WHEN** the cooked fish the player carries are on the hotbar
- **THEN** the panel can deliver them

### Requirement: NPCs face the speaker and pause

An NPC SHALL stop wandering and turn to face a player whose panel is open on
it, and resume once no panel is open on it.

#### Scenario: Turning to talk
- **WHEN** the player opens Oru's panel
- **THEN** Oru stops and faces the player until the panel closes

### Requirement: Met NPCs are remembered per player

The first time a player opens an NPC's panel, that NPC and its world SHALL
be recorded as met for that player and saved with the player's mission
progress. Meeting is per player: another player meeting the same NPC does
not count for them.

#### Scenario: Remembered across reloads
- **WHEN** a player meets Oru, then reloads the game
- **THEN** Oru is still recorded as met for that player

#### Scenario: Meeting is personal
- **WHEN** player A has met Oru and player B has not
- **THEN** only A's record shows Oru as met

### Requirement: Everyone sees the same NPCs move

In multiplayer, all players on a world SHALL see that world's NPCs at the
same places, doing the same things, within the latency of other live
objects; no player's client spawns its own private copy.

#### Scenario: Two players watch one NPC
- **WHEN** two players on Sequoia watch the same villager walk
- **THEN** both see it walk the same path
