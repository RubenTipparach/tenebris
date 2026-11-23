## ADDED Requirements

### Requirement: Sea plants wave in the water

Each world with a sea SHALL grow its own wavy plants:
- a tall species in deeper water;
- a short species in the shallows.

Their sway SHALL travel up the plant, be strongest at the tip, and differ
in phase from plant to plant. No plant species SHALL grow on two planets.

#### Scenario: Kelp forest
- **WHEN** the player swims over Earth's cool, deep water
- **THEN** tall kelp waves in an S-curve that runs up each frond, each plant out of step with its neighbours

#### Scenario: Another sea world
- **WHEN** the player swims in Sequoia's sea
- **THEN** its own tall ribbon weed and short lumen grass wave there, and no Earth plant does

### Requirement: Anemones grow in clusters

Each world with a sea SHALL have an anemone species of its own:
- in small clusters, in the shallows, mostly on rock;
- with tentacles that wave apart from the column.

#### Scenario: Rocky shallows
- **WHEN** the player looks at a rocky seabed in Earth's shallows
- **THEN** clumps of beadlet anemones wave their tentacles there

### Requirement: Fish swim in schools

Schooling fish SHALL move as a flock:
- holding together, keeping apart from each other and swimming the same
  way;
- staying in the water between the seabed and the surface;
- fleeing the player.

A school SHALL be one fauna record, and in multiplayer one record on the
existing fauna live channel. Its species SHALL come from that planet's fish
roster.

#### Scenario: Startling a school
- **WHEN** the player swims into a school of minnows
- **THEN** the fish scatter away from the player and regroup, never leaving the water

#### Scenario: Multiplayer
- **WHEN** a second player watches a school the planet's host simulates
- **THEN** they see the school where the host has it, sent as one record
