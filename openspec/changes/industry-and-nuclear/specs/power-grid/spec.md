## Purpose

Power with amounts: generators make watts, machines draw them, cable
networks balance the two every tick, and batteries store energy in tiers
that hold more for their size.

## ADDED Requirements

### Requirement: Generators and machines have watt ratings

Every generator SHALL produce a set number of watts while it runs, and
every powered machine SHALL draw a set number of watts while it works. The
numbers SHALL be config. The steam engine, the hydro generator, the
reactor, the electric furnace, the computer, the 3D printer, the pump jack,
the refinery, the centrifuge and the nuclear fabricator SHALL all have a
rating.

#### Scenario: Ratings shown

- **WHEN** the player opens a generator or a powered machine
- **THEN** it shows its watts produced or drawn

### Requirement: Each network balances supply and demand

Machines and generators joined by cables SHALL form one network. Each tick,
a network's generators SHALL supply its machines' demand. When supply falls
short, the network SHALL draw on its batteries, and when the batteries are
empty its machines SHALL stop. Spare supply SHALL charge its batteries.

#### Scenario: Too many machines

- **WHEN** one steam engine feeds machines that draw more than it makes, with no battery
- **THEN** the machines stop, and the network shows that it is overloaded

#### Scenario: A battery carries the gap

- **WHEN** the same network has a charged battery
- **THEN** the machines run while the battery drains, and stop when it is empty

### Requirement: Batteries come in denser tiers

There SHALL be three placeable batteries, each storing more energy than the
tier before for the same block: lead-acid (iron and sulphur), lithium-ion
(lithium, cobalt and copper) and solid-state (titanium and plastic). A
battery SHALL keep its charge when saved.

#### Scenario: Denser storage

- **WHEN** a lead-acid, a lithium-ion and a solid-state battery are each charged full
- **THEN** each holds more watt-hours than the one before
