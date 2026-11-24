# Spec Delta

## Purpose

Gives every body a temperature, radiation level and atmosphere density, makes
hostile environments dangerous to an unprotected player the way vacuum is, and
adds the suit tiers that protect against them.

## ADDED Requirements

### Requirement: Each body has an environment

Every body SHALL declare a temperature class (scorching, hot, temperate, cold,
frozen), a radiation level (none, low, high) and an atmosphere density (0 for
airless). The values SHALL live in the solar system configuration, and the
system map and a visit mission's card SHALL show them.

#### Scenario: Reading an environment
- **WHEN** the player opens Pyrra's card
- **THEN** it shows Pyrra as scorching, high radiation and airless

### Requirement: Hostile environments harm an unprotected player

On a body whose temperature is not temperate, or whose radiation is high, a
player without a suit rated for it SHALL take harm over time, on a gauge like
the air gauge, and SHALL die when it runs out. Back in a safe place the gauge
SHALL recover. Low radiation (an airless body) is shown but does no harm.

#### Scenario: Cold without protection
- **WHEN** the player walks on Tessaly in a plain space suit
- **THEN** a COLD gauge falls and the player dies when it runs out

#### Scenario: Temperate world
- **WHEN** the player walks on Sequoia without a suit
- **THEN** no temperature or radiation gauge falls

### Requirement: Suit tiers protect against environments

The suit slot SHALL accept the space suit (vacuum only), a thermal suit
(vacuum, hot and cold, not scorching or frozen), and a hardened suit (all
temperatures and high radiation). Each tier SHALL need the previous one to
craft, and every suit SHALL still breathe from oxygen tanks.

#### Scenario: Thermal suit on a cold world
- **WHEN** the player wears a thermal suit with oxygen on Tessaly
- **THEN** neither the air nor the COLD gauge falls

#### Scenario: Frozen needs the hardened suit
- **WHEN** the player wears a thermal suit on Glacia
- **THEN** the COLD gauge still falls, and the card names the hardened suit

### Requirement: Inside a powered rocket the player is safe

A player inside a rocket with power SHALL be protected from every environment,
as they are from vacuum today.

#### Scenario: Waiting in the cabin
- **WHEN** a powered rocket sits on Pyrra with the player aboard
- **THEN** no environment gauge falls
