# Spec Delta

## Purpose

Lets a rocket be built in stages: a separator part splits the stack, each
stage burns its own fuel, and the pilot drops a spent stage to fly on lighter.

## ADDED Requirements

### Requirement: A separator splits the stack into stages

A stage separator SHALL be a rocket part that can be stacked between parts on
a launch pad. The parts below a separator SHALL form a lower stage, and the
parts above it the next stage up. A stack with no separator SHALL be one stage
and behave exactly as today.

#### Scenario: Two stages
- **WHEN** the player stacks engine, tank, separator, ion thruster, command module
- **THEN** the pad readout shows two stages with each stage's delta-v and the total

#### Scenario: No separator
- **WHEN** a rocket has no separator
- **THEN** its stats, fuel and flight are the same as before this change

### Requirement: Each stage burns its own tanks

The engines of the active (lowest remaining) stage SHALL burn fuel only from
that stage's tanks. Upper stages' tanks SHALL stay full until their stage is
active. The HUD SHALL show the active stage's fuel and the stage count.

#### Scenario: Lower stage burns first
- **WHEN** a two-stage rocket climbs on its first stage
- **THEN** only the first stage's fuel falls, and the upper stage's tank stays full

### Requirement: The pilot drops a spent stage

A key SHALL drop the active stage: its parts SHALL leave the rocket and fall
away, and the next stage up SHALL become active. Dropping SHALL be refused
while only one stage is left. Mass, thrust and delta-v SHALL be recomputed
for the rocket that remains.

#### Scenario: Staging
- **WHEN** the pilot presses the stage key with two stages left
- **THEN** the lower stage separates and falls away, the rocket is lighter, and its upper stage's engines fire next

#### Scenario: Last stage
- **WHEN** the pilot presses the stage key with one stage left
- **THEN** nothing separates and the HUD says it is the last stage

### Requirement: Dropped stages do not come back

A dropped stage SHALL be removed from the rocket for good: it SHALL NOT be
refunded to the launch pad, and the pad's record SHALL keep only the stages
still attached, so a relaunch from that pad uses what is left.

#### Scenario: Relaunch after staging
- **WHEN** a rocket that dropped its first stage is docked back onto its pad
- **THEN** the pad holds only the remaining stage's parts
