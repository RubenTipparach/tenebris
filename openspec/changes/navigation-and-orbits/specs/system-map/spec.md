## Purpose

The top-down map of the solar system: where every body is right now on its
orbit, and where the players are, so a player can find a world and plan a
trip.

## ADDED Requirements

### Requirement: Every body at its live position

The system map SHALL show the Sun and every planet, gas giant, moon and
asteroid from above, each at its position at the moment, with its name and
its orbit drawn as a path, and SHALL redraw as they move.

#### Scenario: Watching the Moon move

- **WHEN** the system map stays open for several minutes
- **THEN** the Moon is seen moving along its orbit round Earth

### Requirement: The player and other players

The system map SHALL mark the player's position (on a body or in flight)
and the other players' positions in a multiplayer world.

#### Scenario: In flight

- **WHEN** the player flies a rocket between Earth and Cinder with the system map open
- **THEN** their marker is drawn between the two, moving as they fly

### Requirement: The map can be panned, zoomed and opened into a planet

The player SHALL be able to pan and zoom the system map, and picking a body
SHALL open that body's planet map.

#### Scenario: From the system to a planet

- **WHEN** the player clicks Vesper on the system map
- **THEN** Vesper's planet map opens

#### Scenario: Zooming in on a gas giant's moons

- **WHEN** the player zooms in on Brontes
- **THEN** its moons are drawn apart from each other and from Brontes, each with its name
