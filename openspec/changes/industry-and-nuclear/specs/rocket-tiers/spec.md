## Purpose

The engine ladder past the vacuum engine: a nuclear thermal engine and an
ion drive, with the reactor core and battery pack parts they rely on,
priced into the rocket performance model every flight already uses.

## ADDED Requirements

### Requirement: Tier 3, the nuclear thermal engine

The nuclear thermal engine SHALL be a rocket part with at least twice the
vacuum engine's specific impulse, thrust between the chemical and the
vacuum engines', and more dry mass than either. It SHALL burn the same
tank fuel.

#### Scenario: Further on the same fuel

- **WHEN** the same rocket is built once with a vacuum engine and once with a nuclear thermal engine
- **THEN** the nuclear one has at least twice the delta-v

### Requirement: Tier 4, the ion drive

The ion drive SHALL have the highest specific impulse of any engine and
very low thrust. It SHALL only fire when the stack holds a reactor core
part. Without one, the rocket's stats SHALL show that it cannot fire.

#### Scenario: No reactor core

- **WHEN** a rocket has an ion drive and no reactor core
- **THEN** its stats show the ion drive as unpowered, and launching is refused with that reason

#### Scenario: With a reactor core

- **WHEN** a rocket has an ion drive and a reactor core
- **THEN** it has the highest delta-v of any engine on the same tanks, and a thrust-to-weight below 1 on Earth

### Requirement: Parts and stats stay one model

The new parts SHALL be entries in the same part table, and delta-v,
thrust-to-weight, fuel and cargo SHALL be worked out by the same
performance model as today's parts. The rocket tech report SHALL list the
new tiers.

#### Scenario: Report

- **WHEN** the rocket tech report is run
- **THEN** it lists tier 3 and tier 4 builds with their delta-v and trips
