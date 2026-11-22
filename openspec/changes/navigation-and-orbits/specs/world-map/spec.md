## Purpose

The flat map of a planet: every tile a hexagon coloured by the block on top
of it, kept in step with the player's edits, showing where the players and
waypoints are, for any planet in the system.

## ADDED Requirements

### Requirement: The map opens from the inventory panel

The inventory panel (opened with E) SHALL have a Map button. It SHALL open
the map of the planet the player is on, or the system map when the player is
in space.

#### Scenario: Opening the map on a planet

- **WHEN** the player stands on Earth, presses E and clicks Map
- **THEN** the map of Earth opens

#### Scenario: Opening the map in space

- **WHEN** the player is flying between planets and opens the map
- **THEN** the system map opens

### Requirement: A planet is drawn flat, one hexagon per tile

The planet map SHALL draw every surface tile of the planet as a flat
hexagon (a pentagon at the twelve pentagon tiles), laid out by its latitude
and longitude, filled with the colour of the topmost solid block of that
tile's column. A block's colour SHALL come from that block's own texture, so
every planet's ground, water and biome blocks look as they do in the world.
North SHALL be at the top. Tiles SHALL meet with no outline or seam, so the
ground reads as continuous colour, not a grid of cells. Each tile's colour
SHALL show relief: brighter the higher its ground stands over sea level,
darker the deeper the water over it, and lit or shaded by its slope toward
the light (up-left on the map).

#### Scenario: Water and land

- **WHEN** the map of Earth is open
- **THEN** ocean tiles are drawn in the water block's colour and grass tiles in the grass block's colour

#### Scenario: Every planet has its own colours

- **WHEN** the map of Sequoia is open
- **THEN** its tiles show Sequoia's own blocks (its beige scrub, its sands), not Earth's

### Requirement: The map follows edits

A block placed or broken SHALL change that tile on the map when it changes
which block is on top, while the map is open and the next time it opens.
Edits other players make SHALL show the same way.

#### Scenario: Digging a hole

- **WHEN** the player digs out a grass tile down to stone and opens the map
- **THEN** that tile is drawn in stone's colour

### Requirement: Any planet can be viewed

The map SHALL let the player pick any planet or moon, and show its map even
if the player has never been there.

#### Scenario: Looking at another world

- **WHEN** the player, on Earth, picks Cinder on the map
- **THEN** Cinder's map is shown, coloured by Cinder's blocks

### Requirement: Players and waypoints on the map

The map SHALL mark the player's own position and heading on the planet
shown, the positions of other players on that planet, and the waypoints set
on it.

#### Scenario: Seeing a friend

- **WHEN** another player in the same multiplayer world stands on the Moon and the Moon's map is open
- **THEN** their marker is drawn at their position, with their name
