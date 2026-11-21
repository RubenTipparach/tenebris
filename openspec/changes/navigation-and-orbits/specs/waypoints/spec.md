## Purpose

Up to four marks a player sets from the map on any planet, kept with their
world, shown on the maps and the compass: Pale Blue Dot's rule
(`starter-missions` G3) across a whole solar system.

## ADDED Requirements

### Requirement: Up to four waypoints

A right click on a planet map SHALL add a waypoint at that place on that
planet. A player SHALL have at most four waypoints across all planets; a
fifth SHALL remove the oldest. A click on a waypoint SHALL remove it; a left
click SHALL count only if the pointer did not drag, so panning never removes
one.

#### Scenario: A fifth waypoint

- **WHEN** the player right-clicks five places on the maps
- **THEN** the last four are waypoints and the first is gone

#### Scenario: On another planet

- **WHEN** the player, on Earth, opens Vesper's map and right-clicks a place
- **THEN** a waypoint is set on Vesper, shown on Vesper's map and on the system map at Vesper

#### Scenario: Removing one

- **WHEN** the player clicks a waypoint without dragging
- **THEN** it is removed

### Requirement: Waypoints are kept

Waypoints SHALL be saved with the world the moment they change, and SHALL
stay where they were set on their planet as the planet moves on its orbit.
In a multiplayer world each player's waypoints SHALL be their own.

#### Scenario: Reload

- **WHEN** the player sets two waypoints, reloads the game and opens the map
- **THEN** both waypoints are there

### Requirement: Waypoints are shown

A waypoint SHALL show on its planet's map, on the system map at its planet,
and, when the player is on its planet, on the compass bar.

#### Scenario: Two planets

- **WHEN** the player has a waypoint on Earth and one on Cinder and stands on Earth
- **THEN** the compass bar shows the Earth waypoint only, and the system map shows both
