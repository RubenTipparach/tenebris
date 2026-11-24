# Spec Delta

## ADDED Requirements

### Requirement: The Moon gives a solar-electric ion thruster

A solar-electric ion thruster SHALL be a rocket engine part built from Moon
resources. It SHALL draw the rocket's electric charge as it fires rather than
needing a reactor core, with very low thrust and a specific impulse above the
vacuum engine's.

#### Scenario: Ion on solar power
- **WHEN** a rocket with an ion thruster, solar arrays and no reactor core fires it in space
- **THEN** it thrusts, its charge falls faster, and with the charge empty the thruster stops

### Requirement: Fission engines past the nuclear thermal engine

The ladder SHALL add a gas-core nuclear engine (more thrust and specific
impulse than the nuclear thermal engine), a fission-fragment drive (very high
specific impulse, low thrust, needs a reactor core and magnets) and a nuclear
pulse drive (very high thrust with high specific impulse, consuming pulse
units from the cargo).

#### Scenario: Pulse drive lifts heavy stacks
- **WHEN** a heavy rocket with a nuclear pulse drive launches from a high-gravity body
- **THEN** it has a thrust-to-weight above 1 there, and each second of thrust uses pulse units from the cargo

#### Scenario: Fission-fragment needs a reactor core
- **WHEN** a fission-fragment drive is fitted without a reactor core
- **THEN** its stats show it unpowered and launching is refused with that reason

### Requirement: Fusion engines top the ladder

The ladder SHALL end with a D-He3 fusion drive, consuming helium-3, and an
advanced magnetic fusion torch, consuming helium-3 and deuterium, with the
highest specific impulse and high thrust. The torch SHALL need rewards from
both exploration routes to craft.

#### Scenario: The torch
- **WHEN** a rocket with a fusion torch and helium-3 and deuterium in its cargo is compared with every other engine on the same tanks
- **THEN** it has the highest delta-v and a thrust-to-weight above 1 on Earth

### Requirement: Every engine is gated on a body

Each new engine's recipe SHALL be unlocked by an exploration mission and SHALL
need a resource from the body on which that mission is completed, or from an
earlier body on a route to it.

#### Scenario: Gating test
- **WHEN** the mission tests run
- **THEN** each new engine is unlocked by exactly one visit mission, and its recipe uses a resource found on that body or on an earlier body on its route
