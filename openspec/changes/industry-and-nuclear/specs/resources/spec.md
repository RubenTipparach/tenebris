## Purpose

The raw materials the late tech tree is built from - clay, oil, uranium and
lava - where each one is found in the solar system, and how a player
gathers it, buckets included.

## ADDED Requirements

### Requirement: Each new resource generates where it belongs

The terrain generator SHALL place clay on Earth's riverbanks and lake
shores, oil pockets deep under Earth and the jungle moons, uranium ore deep
under the Moon, Cinder and the metal asteroids, and lava on the volcanic
worlds. None of them SHALL generate anywhere else. Placement SHALL be
deterministic from the world seed.

#### Scenario: Uranium off Earth

- **WHEN** a player digs deep on Earth and deep on the Moon
- **THEN** uranium ore is found on the Moon and never on Earth

#### Scenario: Same world, same deposits

- **WHEN** a world is regenerated from the same seed
- **THEN** every clay, oil, uranium and lava block is in the same place

### Requirement: Shores stay sand, clay lies under the water

Earth's clay SHALL form the top of shallow sea beds, and SHALL lie under the
sand of a beach, never on top of it, so every shore shows sand at the
waterline.

#### Scenario: Walking a shore
- **WHEN** a player walks along a beach on Earth
- **THEN** the ground they stand on is sand, and digging one block down there or wading into the shallows may find clay

### Requirement: Every new block and item has its own look

Each new block SHALL have its own drawn texture, never a tint of an
existing block, and each new item SHALL have its own inventory icon in the
same change.

#### Scenario: The block audit

- **WHEN** the block audit sheet is generated
- **THEN** clay, oil sand and uranium ore each show their own texture

### Requirement: Buckets carry oil and lava

An empty bucket used on oil SHALL become a crude oil bucket, and used on
lava a lava bucket, the same way it fills with water today. A lava bucket
SHALL burn in a furnace for much longer than coal and give the empty bucket
back.

#### Scenario: Scooping lava

- **WHEN** the player uses an empty bucket on lava on Cinder
- **THEN** they hold a lava bucket, and the lava block is gone

#### Scenario: Lava as fuel

- **WHEN** a lava bucket is put in a furnace's fuel slot
- **THEN** it smelts at least ten items, and the empty bucket comes back
