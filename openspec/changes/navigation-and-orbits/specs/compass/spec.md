## Purpose

A compass bar at the top of the screen on a planet: which way the player
faces, and where their waypoints on this planet lie.

## ADDED Requirements

### Requirement: North on every planet

Each planet SHALL have a north pole, the end of its axis on the side where,
facing it, the Sun rises on the right (the same rule as Earth's). Latitude
SHALL be positive towards it.

#### Scenario: Sunrise in the east

- **WHEN** the player on any planet faces north at sunrise
- **THEN** the Sun is coming up on their right, in the east

### Requirement: The compass bar

On a planet the HUD SHALL show a compass bar across the top: N, E, S and W,
the four intercardinals and a tick every 15 degrees, spanning 180 degrees
centred on the player's heading and scrolling as they turn. It SHALL fade
out in space, where there is no north.

#### Scenario: Turning right

- **WHEN** the player facing north turns right
- **THEN** the bar reads N, then NE, then E at its centre

#### Scenario: In space

- **WHEN** the player flies away from a planet into space
- **THEN** the compass bar fades out

### Requirement: Waypoints on the bar

Each waypoint on the player's current planet SHALL be marked on the compass
bar at its bearing, with its distance shown for the one nearest the centre.

#### Scenario: Walking to a waypoint

- **WHEN** a waypoint lies due east, 300 m away, and the player faces east
- **THEN** its mark sits at the bar's centre, with "300 m" under it
