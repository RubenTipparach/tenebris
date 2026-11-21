## Purpose

Nuclear power, built in space: uranium enriched into fuel rods, a fission
reactor that can only be built away from home, and the fabricator that
builds the nuclear engines on its power.

## ADDED Requirements

### Requirement: Uranium becomes fuel rods

A powered centrifuge SHALL enrich uranium ore into enriched uranium, and
enriched uranium with titanium SHALL make a fuel rod.

#### Scenario: Enrichment

- **WHEN** 4 uranium ore run through a powered centrifuge
- **THEN** the player gets enriched uranium

### Requirement: The reactor is built in space

A fission reactor SHALL be placeable only on an airless body (a world with
no atmosphere: the Moon, the moons and asteroids, the barren worlds). On a
world with an atmosphere it SHALL refuse, saying where it can go. Loaded
with fuel rods it SHALL be a large generator on its network, using up a
rod after a set time.

#### Scenario: On Earth

- **WHEN** the player tries to place a reactor on Earth
- **THEN** it is refused with "Reactors can only be built off-world"

#### Scenario: On the Moon

- **WHEN** a reactor with fuel rods is placed on the Moon and cabled to machines
- **THEN** its network has far more watts than any steam engine gives

### Requirement: The nuclear fabricator builds the nuclear engines

A nuclear fabricator SHALL build the nuclear thermal engine, the ion drive
and the reactor core part. It SHALL only run on a network that a reactor
powers.

#### Scenario: No reactor

- **WHEN** a nuclear fabricator is on a network with only steam engines
- **THEN** it does not run, and says it needs reactor power
