## Purpose

A tree of missions that walks a player through the game and unlocks its
tech as they go: a trunk from bare hands to the furnace, then branches they
can play in any order, from smelting and power to rockets and other worlds.
This is Pale Blue Dot's mission tree (`starter-missions`, "Missions are a
tree that unlocks the tech"), fitted to this game's own recipes.

## ADDED Requirements

### Requirement: Missions open from the inventory panel

The inventory panel (opened with E) SHALL have a Missions tab that shows the
mission tree.

#### Scenario: A new world

- **WHEN** a player in a new world presses E and opens Missions
- **THEN** the tree is shown with the first trunk mission marked Now and its objectives at zero

### Requirement: Missions form a tree with one parent each

Missions SHALL be data: each has an id, a branch, an icon, a title, a line
of help, objectives, the recipes it unlocks, and exactly one parent (none
for the first). A mission MAY also name hidden gates (`after`): missions
that must be done before it opens, with no line drawn for them. A mission
SHALL open when its parent and its gates are done. Mission ids SHALL never
be renamed or reused, because saves name them.

#### Scenario: Branches open together

- **WHEN** the last trunk mission is done
- **THEN** the first mission of every branch hanging off it opens at once

#### Scenario: A hidden gate

- **WHEN** a mission's parent is done but one of its gates is not
- **THEN** it stays Locked, and no line is drawn from the gate

### Requirement: Objectives are counted from play

Each objective SHALL count one kind of event the game already has: an item
gained, an item crafted or printed, a block or machine placed, a block mined,
an item smelted, a launch pad completed, a rocket assembled, a launch, a
landing on a named body, or reaching a waypoint. Only events after a mission
opens SHALL count toward it.

#### Scenario: Progress

- **WHEN** the open mission asks for 4 logs and the player chops a tree that gives 6
- **THEN** the objective reads 4 / 4 and the mission is done

### Requirement: Missions unlock recipes

A recipe that a mission lists in its unlocks SHALL be locked until that
mission is done. In the crafting, workbench and printer lists a locked
recipe SHALL be shown dimmed, with the name of the mission that unlocks it,
and SHALL NOT be craftable. A recipe that no mission lists SHALL be open
from the start.

#### Scenario: A locked recipe

- **WHEN** the player opens the 3D printer before the mission that unlocks the Rocket Engine is done
- **THEN** the Rocket Engine is shown dimmed with that mission's name, and printing it is refused

### Requirement: Old worlds keep what they could make

A world saved before the tree SHALL open with every mission it already
satisfies counted as done. Any recipe whose output the world has already
crafted, carries, or has placed SHALL count as unlocked, so no world loses
a recipe it could use before.

#### Scenario: A veteran world

- **WHEN** a world that already has a launch pad and a rocket opens the tree for the first time
- **THEN** the missions up to the rocket are done and the rocket parts stay printable

### Requirement: The tree panel shows every mission as a card

The Missions tab SHALL draw every mission as a card with its icon, title,
objectives with counts, and the icons of what it unlocks, laid out left to
right from its parent, one row per branch with the branch's name on a
plaque, joined to its parent by a line, and marked Done, Now, Open or
Locked.

#### Scenario: The whole tree

- **WHEN** the player opens Missions in a new world and presses Fit
- **THEN** every branch is visible with its plaque, the first trunk card is marked Now and the rest Open or Locked

### Requirement: The tree pans, zooms in steps, and opens a card's details

The tree SHALL pan by dragging and zoom in fixed steps that never stretch
its art. Clicking a card SHALL open a side panel with its objectives and
progress, help, what it unlocks, what it needs, and what it opens next.

#### Scenario: Looking at a branch

- **WHEN** the player clicks the Launch card
- **THEN** the side panel shows its objectives, its help, the recipes it unlocks, the mission it needs, and the missions it opens

### Requirement: Progress is kept and announced

Mission progress SHALL be saved with the world as it changes. Finishing a
mission SHALL show a short notice naming it and what it unlocked.

#### Scenario: Reload mid-mission

- **WHEN** the player has 2 of 4 stone, reloads, and opens Missions
- **THEN** the objective still reads 2 / 4
