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

Every recipe SHALL be locked in a new world until the mission that unlocks
it is done: crafting grid, workbench, 3D printer, nuclear fabricator,
campfire, kiln, oven, and furnace and electric-furnace smelts and alloys.
Only a short starter list in the mission config (planks and sticks) SHALL
be open from the start. Every recipe SHALL be on the starter list or in
exactly one mission's unlocks.

#### Scenario: A new world

- **WHEN** a player opens the crafting grid in a new world
- **THEN** only planks and sticks can be made

#### Scenario: A mission done

- **WHEN** the player completes Build a furnace
- **THEN** coal and glass can be crafted

### Requirement: Locked recipes are shown and refused

Wherever recipes are listed (crafting, workbench, printer, fabricator and
cooking-station panels) a locked recipe SHALL be shown dimmed with
"Unlocked by: <mission>" and SHALL NOT be made. A station SHALL NOT cook
or smelt a locked recipe, and a furnace SHALL refuse an input whose smelt
is locked, with the same message.

#### Scenario: A locked recipe

- **WHEN** the player opens the 3D printer before the mission that unlocks the Rocket Engine is done
- **THEN** the Rocket Engine is shown dimmed with "Unlocked by: Raise the tower", and printing it is refused

#### Scenario: A locked smelt

- **WHEN** the player puts clay in a furnace before Find clay is done
- **THEN** the furnace refuses it with "Unlocked by: Find clay" and fires no brick

### Requirement: Old worlds keep what they could make

A world saved before the tree SHALL open with every mission it already
satisfies counted as done. Any recipe whose output the world has already
crafted, carries, or has placed SHALL count as unlocked, so no world loses
a recipe it could use before. The same SHALL hold once more for a world
whose tree was saved before every recipe was locked: what it has crafted,
carries or has placed stays unlocked.

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

### Requirement: Lines never overlap

No line SHALL pass through a card or a plaque other than the two it joins,
and lines from different parents SHALL never touch or run along each other,
at every zoom level. Lines from one parent MAY share a run. Where a mission
has several children in its own branch, those that lead on to other
branches SHALL take the lower rows, so the lines dropping from them don't
cut across their siblings.

#### Scenario: The whole tree

- **WHEN** the player opens Missions and presses Fit, or zooms to any step
- **THEN** no line crosses a card, a plaque, or another parent's line

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

### Requirement: The tree cannot be panned away from its cards

Panning SHALL stop before the tree leaves the view: the tree MAY slide only
until its edge reaches the middle of the view, pulled toward the nearest
card, so that at least `MISSION_TREE_UI.PAN_KEEP_PX` (40 px) of some card
always stays in view. The bound SHALL hold on a drag, after a zoom step,
and on Fit or centring on a card, at every zoom level.

#### Scenario: Dragging off into empty space

- **WHEN** the player drags the tree far past any edge, at any zoom step, or zooms out and back in at a far corner
- **THEN** the tree stops with part of a card still in view, and dragging back moves it at once

### Requirement: The mission to do now is shown on the HUD

During play a small tracker SHALL show the mission to do now (the
tracker's next open mission): its icon, its title, and each objective with
its icon and live count ("Logs 1 / 4"). It SHALL update as progress is made
and show the next mission when one is done, hide while a game menu (the
inventory or Missions panel) is open, and open the Missions tab when
clicked. A "Show Mission on HUD" switch in Settings SHALL turn it on or
off, saved per browser, on by default.

#### Scenario: Following the next step

- **WHEN** the player on a new world picks up a log, then finishes Chop a tree
- **THEN** the tracker reads Chop a tree, Logs 1 / 4, then changes to Make planks with its objectives at 0

#### Scenario: Turning it off

- **WHEN** the player switches Show Mission on HUD off in Settings and reloads
- **THEN** the tracker stays hidden until the switch is turned back on
