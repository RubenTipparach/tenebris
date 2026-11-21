## Purpose

Clay fired into bricks and pots, and cooking: stations that turn fish into
dishes, and eating them for a short bonus.

## ADDED Requirements

### Requirement: Clay is fired into bricks and pots

The furnace SHALL fire clay into bricks. A kiln built from bricks SHALL
make clay pots.

#### Scenario: Bricks

- **WHEN** the player smelts 4 clay in a furnace
- **THEN** they get 4 bricks

### Requirement: Stations cook dishes

A campfire and an oven SHALL cook raw fish into cooked fish. The oven
SHALL also cook fish stew from fish, a water bucket and a clay pot, giving
the empty bucket back. Each dish SHALL be an item with its own icon.

#### Scenario: Stew

- **WHEN** the player cooks a fish, a water bucket and a clay pot in an oven
- **THEN** they get a fish stew and an empty bucket

### Requirement: Eating gives a timed bonus

Eating a dish (using it from the hand) SHALL consume it and give a
"well fed" bonus for a time set per dish: faster mining and a slower
jetpack drain. A better dish SHALL give a longer or stronger bonus. Eating
again SHALL restart the timer rather than stack it.

#### Scenario: Eating stew

- **WHEN** the player eats a fish stew
- **THEN** a well-fed indicator shows with its time left, and blocks mine faster until it runs out
