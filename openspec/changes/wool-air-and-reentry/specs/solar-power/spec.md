## ADDED Requirements

### Requirement: Solar panels make power by day

A solar panel on a cable network SHALL supply power in proportion to the
sun's height over it, SHALL supply none at night or with anything solid
above it, and SHALL supply more on a world with no atmosphere. It SHALL be
unlocked once batteries are researched.

#### Scenario: Noon and night
- **WHEN** a solar panel stands in the open with the sun overhead, and later the sun has set
- **THEN** it supplies its full rated watts at noon and nothing at night

#### Scenario: Under a roof
- **WHEN** a block is placed over a solar panel
- **THEN** it supplies nothing

### Requirement: A solar array charges a rocket in sunlight

A rocket with solar arrays fitted in its equipment SHALL charge its battery while the
line from it to the sun misses every body, in flight or landed, up to the
stack's capacity, and SHALL NOT charge in a planet's shadow. Two arrays
SHALL match the command module's draw in full sun.

#### Scenario: Day side and night side
- **WHEN** a rocket with a solar array flies over the day side, then behind the planet
- **THEN** its POWER gauge reads SUN and the charge rises on the day side, and it drains on the night side
