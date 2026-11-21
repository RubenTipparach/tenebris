## Purpose

The bodies move: each goes round its parent on a circular orbit, timed from
two anchors the owner set (the Moon round Earth in an hour, Earth round the
Sun in three hours) and Kepler's third law for everything else, on one clock
every system and every player shares.

## ADDED Requirements

### Requirement: Two anchor periods

The Moon SHALL complete one orbit of Earth every 60 minutes of game time,
and Earth SHALL complete one orbit of the Sun every 180 minutes.

#### Scenario: A quarter hour

- **WHEN** 15 minutes of game time pass
- **THEN** the Moon has moved a quarter of the way round Earth, and Earth a twelfth of the way round the Sun

### Requirement: Every other body follows by Kepler's third law

A body orbiting the Sun SHALL have a period of 180 minutes times its orbit
radius over Earth's, to the power 1.5. A moon SHALL have a period of 60
minutes times its orbit radius over the Moon's, to the power 1.5, times the
square root of Earth's mass over its planet's mass. Each body's orbit radius
and starting angle SHALL be those of its configured position, so the layout
at time zero is the configured layout.

#### Scenario: A farther planet is slower

- **WHEN** a planet orbits at twice Earth's distance from the Sun
- **THEN** its period is 180 x 2^1.5, about 509 minutes

#### Scenario: Time zero

- **WHEN** game time is zero
- **THEN** every body is at its configured position

### Requirement: One clock

Orbital positions SHALL be a pure function of game time. Game time SHALL run
while a world is played and be kept in the world's save. In a multiplayer
world it SHALL be the server's world clock, so every player sees every body
in the same place.

#### Scenario: Two players

- **WHEN** two players in one multiplayer world look at the Moon at the same moment
- **THEN** they see it at the same point on its orbit

#### Scenario: Reload

- **WHEN** a single-player world is saved, closed and opened again
- **THEN** the bodies are where they were when it was closed

### Requirement: The player's ground stays put under them

The body the player stands on, or flies close to, SHALL be the fixed frame:
the player's walking, building and physics SHALL NOT be disturbed by that
body's orbital motion, and everything placed on it (blocks, torches,
machines, launch pads, landed rockets, trees, animals) SHALL stay where it
was put on it.

#### Scenario: Standing still for an hour

- **WHEN** the player stands on the Moon for a whole Moon orbit
- **THEN** they have not slid, fallen or been carried off the ground, and Earth and the Sun have moved across their sky

### Requirement: Sunlight follows the orbits

The direction of sunlight on every body SHALL follow from the Sun's live
position relative to that body, so a world's day side turns as it goes
round.

#### Scenario: Earth's day turns

- **WHEN** 90 minutes pass on Earth
- **THEN** the side of Earth facing the Sun has moved half way round
