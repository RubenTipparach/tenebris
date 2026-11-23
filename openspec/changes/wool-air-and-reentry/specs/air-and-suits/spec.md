## ADDED Requirements

### Requirement: Each body says whether its air can be breathed

Each body's config SHALL say whether its air is breathable. Earth, Sequoia,
Verdance, Mirewood and Metropole Prime (an inhabited city world) SHALL be
breathable; every airless body SHALL NOT.

#### Scenario: The Moon
- **WHEN** the game reads the Moon's config
- **THEN** its air is not breathable

### Requirement: Exposure kills without a suit and air

The player SHALL be exposed on a body whose air is not breathable, in open
space outside a rocket, and inside a rocket whose battery is flat. Exposed,
a player wearing a space suit with an oxygen tank in their inventory SHALL
breathe from the tank; otherwise they SHALL hold their breath for a few
seconds and then die, and respawn at the world's spawn with their inventory.
While the debug jetpack is on, air SHALL NOT be checked (debug mode).

#### Scenario: Shirt sleeves on the Moon
- **WHEN** a player without a suit steps out of a rocket on the Moon
- **THEN** the AIR bar runs down for 10 seconds and they die and respawn on Earth

#### Scenario: Debug jetpack on the Moon
- **WHEN** the debug jetpack is on and the player walks out on the Moon without a suit
- **THEN** their air does not run down

#### Scenario: Suited
- **WHEN** a player wearing a suit with oxygen tanks walks on the Moon
- **THEN** a tank's air runs down, an empty tank replaces it, and they live while tanks last

### Requirement: A gas collector bottles air

A gas collector SHALL only be placed where the air is breathable. On power,
it SHALL turn each empty tank in its input into an oxygen tank after its
fill time.

#### Scenario: Bottling air
- **WHEN** a powered gas collector on Earth holds empty tanks
- **THEN** oxygen tanks come out one by one

### Requirement: The suit is worn in its own slot

The inventory panel SHALL have a suit slot. Using a space suit puts it in
the slot; taking it out takes it off. The worn suit SHALL be saved with the
world and SHALL show on the avatar to other players.

#### Scenario: Suiting up
- **WHEN** the player uses a space suit
- **THEN** the suit slot holds it and the avatar wears a suit and helmet
