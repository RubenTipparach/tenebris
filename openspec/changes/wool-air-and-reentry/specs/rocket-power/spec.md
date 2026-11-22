## ADDED Requirements

### Requirement: The command module runs on a battery

A flight SHALL carry a charge: the command module's own cell plus each
battery pack fitted in the rocket's equipment slots. The command module SHALL draw power for the
whole flight, so its own cell lasts about 15 minutes. With no charge the
rocket's engines SHALL NOT fire, it SHALL NOT turn, and its cabin air SHALL
fail.

#### Scenario: A long flight
- **WHEN** a rocket with only a command module's cell flies for 15 minutes
- **THEN** its POWER gauge reads empty and its engines stop

#### Scenario: Battery packs
- **WHEN** a battery pack is fitted in the rocket's equipment
- **THEN** the flight starts with more charge than the command module alone, and two packs give twice what one adds

### Requirement: Rocket equipment fits in slots, not the stack

A rocket SHALL have equipment slots, given by its parts (the command module
gives them), beside its cargo hold. Only parachutes, solar arrays and
battery packs SHALL fit in them, and none of the three SHALL be placeable in
the rocket's stack. Each fitted item SHALL add its function and its mass.
The launch pad and the landed rocket SHALL show the slots as item icons and
SHALL load them from the hotbar and bag.

#### Scenario: Fitting equipment
- **WHEN** the player drags a parachute, a solar array and a battery pack from the inventory onto the pad's Equipment row
- **THEN** they show as icons there, the readout gains power, solar watts, a chute and their mass, and they are there after a reload

#### Scenario: Not equipment
- **WHEN** the player drags stone, or a rocket engine, onto the Equipment row
- **THEN** it stays in the inventory

### Requirement: Rocket equipment is saved

The equipment slots SHALL be saved with the launch pad and the landed
rocket (its multiplayer record). A save whose stack holds one of the three
SHALL load with it moved into the equipment (or the cargo hold), losing
nothing.

#### Scenario: An older save
- **WHEN** a world saved with a parachute in the rocket's stack is loaded
- **THEN** the stack holds only real parts and the parachute is in the equipment

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
