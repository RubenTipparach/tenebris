## ADDED Requirements

### Requirement: The command module runs on a battery

A flight SHALL carry a charge: the command module's own cell plus each
battery pack in the stack. The command module SHALL draw power for the
whole flight, so its own cell lasts about 15 minutes. With no charge the
rocket's engines SHALL NOT fire, it SHALL NOT turn, and its cabin air SHALL
fail.

#### Scenario: A long flight
- **WHEN** a rocket with only a command module's cell flies for 15 minutes
- **THEN** its POWER gauge reads empty and its engines stop

#### Scenario: Battery packs
- **WHEN** the stack holds a battery pack
- **THEN** the flight starts with more charge than the command module alone

### Requirement: A battery tops up a landed rocket

Pressing Interact at a landed rocket with a lithium-ion battery in hand
SHALL use up the battery and add its charge to the rocket, up to the stack's
capacity. The charge SHALL be saved with the rocket.

#### Scenario: Stranded on the Moon
- **WHEN** a landed rocket's battery is flat and the player presses F at it holding a lithium-ion battery
- **THEN** the battery is used and the rocket can fly again

### Requirement: Lithium is abundant on airless worlds

Every airless body (moons, airless planets, asteroids) SHALL hold a rich
lithium deposit in its own ore config. Earth SHALL keep only thin veins.

#### Scenario: Prospecting
- **WHEN** the terrain of the Moon and of Earth is generated
- **THEN** the Moon has far more lithium ore per cell than Earth
