## Purpose

A chain of short goals that walks a player through the game, from their
first logs to landing on the Moon, counted from things the game already
does, with a panel to see them.

## ADDED Requirements

### Requirement: Missions open from the inventory panel

The inventory panel (opened with E) SHALL have a Missions button that opens
the Missions panel: every mission with its title, one line of help, its
objectives with progress counts, done missions ticked, and the current one
first.

#### Scenario: A new world

- **WHEN** a player in a new world presses E and clicks Missions
- **THEN** the first mission is open, with its objectives at zero

### Requirement: A chain counted from play

Missions SHALL be data: each has a title, a line of help, and objectives,
each a count of one kind of event the game already has (an item gained, an
item crafted, a block placed, a block mined, a machine placed, a launch pad
completed, a rocket launched, a body landed on). A mission SHALL open when
the one before it is done. Only events after a mission opens SHALL count
towards it.

#### Scenario: Progress

- **WHEN** the open mission asks for 4 logs and the player chops a tree that gives 6
- **THEN** the objective reads 4 / 4 and the mission is done

### Requirement: The first chain

The first chain SHALL lead from gathering to space, in the order each step
unlocks the next: gather wood, craft tools, mine stone and ore, smelt, build
the machines that make rocket parts, lay a 7-block launch pad, build a
rocket, launch it, and land on the Moon.

#### Scenario: The last step

- **WHEN** the player lands a rocket on the Moon with "Land on the Moon" open
- **THEN** the mission is done

### Requirement: Progress is kept and announced

Mission progress SHALL be saved with the world as it changes. Finishing a
mission SHALL show a short in-game notice naming it.

#### Scenario: Reload mid-mission

- **WHEN** the player has 2 of 4 stone, reloads, and opens Missions
- **THEN** the objective still reads 2 / 4
