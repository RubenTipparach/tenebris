# Spec Delta

## Purpose

Lets a rocket be rebuilt away from its home pad: docked onto a launch pad on
any body, or changed in place with a refit kit while parked on a body or in
space, so parts found on other worlds can be fitted where they are found.

## ADDED Requirements

### Requirement: Launch pads work on every landable body

A launch pad SHALL be buildable and usable on any landable body, the same way
as on Earth.

#### Scenario: Forward base
- **WHEN** the player builds a complete pad on the Moon
- **THEN** a rocket can be stacked, fuelled and launched from it

### Requirement: A parked rocket docks onto a nearby pad

A parked rocket standing on or beside a complete launch pad with an empty
stack SHALL be able to dock onto it. Its parts, fuel, cargo and equipment
SHALL move to that pad, where the pad's stack editor changes it.

#### Scenario: Docking on the Moon
- **WHEN** the player lands next to an empty pad on the Moon and chooses Dock
- **THEN** the rocket stands on that pad with its fuel, cargo and equipment, and the pad panel can add or remove its parts

#### Scenario: Pad already holds a rocket
- **WHEN** the nearby pad's stack is not empty
- **THEN** Dock is refused with that reason

### Requirement: A refit kit changes a parked rocket's stack

A rocket carrying a refit kit in its equipment SHALL let the player open the
same stack editor on the rocket while it is parked, on a body or in space.
Parts SHALL come from and go to the rocket's cargo hold and the player's
inventory. Each refit SHALL use the kit up.

#### Scenario: Swapping engines in orbit
- **WHEN** a parked rocket in space has a refit kit and an ion thruster in its cargo, and the player swaps its vacuum engine for the thruster
- **THEN** the vacuum engine goes to the cargo, the thruster is in the stack, the stats update, and the kit is used up

#### Scenario: No kit
- **WHEN** a parked rocket without a refit kit is opened
- **THEN** its panel offers no stack editing away from a pad

### Requirement: A refitted rocket still has to be flyable

A refit or dock SHALL be refused if it would leave the rocket without a
command module, or with a part whose requirements are not met, and the reason
SHALL be shown.

#### Scenario: No command module
- **WHEN** the player tries to remove the command module during a refit
- **THEN** the change is refused with the reason
