## Purpose

Every body turns, so a world has a day: the Sun rises, crosses the sky and
sets in a matter of minutes of game time. In the frame of the body the
player is on, the body is still and the sky turns round it.

## ADDED Requirements

### Requirement: Each body has a day

Every body except the Sun SHALL turn about its north pole (+Y, the
compass's north). Its solar day, from one sunrise to the next, SHALL be its
configured `dayMin`, or the default for its body type when unset. Earth's
day SHALL be 20 minutes of game time.

#### Scenario: A day on Earth

- **WHEN** a player stands at one spot on Earth for 20 minutes of game time
- **THEN** the Sun rises once and sets once, and is back where it started

### Requirement: The Sun rises in the east

The turn SHALL be retrograde to the orbits, so that on every body the Sun
rises in the east under the existing compass rule. The sidereal period
SHALL be `1 / (1/day - 1/year)`, where the year is that of the planet the
body is on or round.

#### Scenario: Sunrise is in the east

- **WHEN** the Sun crosses the horizon going up
- **THEN** it is on the east side of the compass

### Requirement: The spin is a pure function of game time

A body's turn SHALL be `2 pi (t mod P) / P` for game time `t` and sidereal
period `P`, always in [0, 2 pi). It SHALL run on the same clock as the
orbits: the save's clock in single player and the server's world clock
online.

#### Scenario: Two players on Earth

- **WHEN** two players in one multiplayer world stand on Earth at the same moment
- **THEN** they see the Sun at the same place in Earth's sky

#### Scenario: Wrapping

- **WHEN** a whole number of sidereal periods have passed
- **THEN** the turn is back to the same angle

### Requirement: The sky turns round the reference body

While the player or their rocket is near the reference body, the frame
SHALL turn with that body. Near means within `SPIN_FRAME_RADII` of its
radii or within its sphere of influence, whichever is farther. The body
SHALL stay at its configured position, with its terrain and everything
placed on it unmoved.

#### Scenario: Standing still through a day

- **WHEN** the player stands on Earth for a whole day
- **THEN** they have not moved, and the Sun, the Moon and the stars have gone once round their sky

### Requirement: One turn for the whole sky

The Sun, every other body, the gas giants and the stars SHALL be turned
about the reference body's axis by minus the frame's yaw, all through one
function. Sunlight on every body SHALL follow from the turned Sun position.

#### Scenario: The stars wheel with the Sun

- **WHEN** the Sun moves across the sky over a day
- **THEN** the stars move with it, and against the stars the Sun moves only as Earth's orbit carries it

### Requirement: The sky stops turning out in space

When the player or their rocket goes beyond the near distance times
`SPIN_FRAME_HYSTERESIS`, the frame SHALL be held at the angle it had at
that moment. Nothing SHALL jump, and the sky SHALL stop turning. On coming
back within the near distance, the frame SHALL turn with the body again,
at the body's real time of day.

#### Scenario: Leaving Earth

- **WHEN** a rocket climbs past Earth's near distance
- **THEN** the Sun and stars stop wheeling without a jump, and the planets move only on their orbits

### Requirement: Changing reference body keeps the traveller's place

When the reference body changes, the traveller's position and velocity
relative to the body they arrive at SHALL be kept. They SHALL be moved by
that body's offset and lose its velocity in the old frame, a turning
frame's wheel included. The sky SHALL take whatever turn the two frames
differ by.

#### Scenario: Arriving at the Moon

- **WHEN** a rocket moving with the Moon enters the Moon's sphere of influence
- **THEN** it is beside the same spot on the Moon and at rest relative to it
