# Spec Delta

## ADDED Requirements

### Requirement: Re-entry heat scales with atmosphere density

The heat a returning rocket gains SHALL scale with the atmosphere density of
the body it is entering, so a thin atmosphere heats less and a thick one more.
A body with density 0 SHALL cause no re-entry heat.

#### Scenario: Thick atmosphere
- **WHEN** the same rocket enters Thalassa's and Earth's atmospheres at the same speed
- **THEN** it heats faster entering Thalassa

### Requirement: Parachute braking scales with atmosphere density

A parachute's braking SHALL scale with the atmosphere density, so a thin
atmosphere lands a rocket faster than a thick one. A parachute SHALL still not
open where the density is 0.

#### Scenario: Thin air
- **WHEN** a rocket lands under one parachute on a thin-atmosphere body
- **THEN** it touches down faster than on Earth, and the parachute count needed to land safely is shown before entry

### Requirement: A heat shield protects a rocket entering a thick atmosphere

A heat shield SHALL be rocket equipment that cuts the re-entry heat gained
while it lasts, and wears down as it absorbs heat. Entering a gas giant or
passing close to the Sun SHALL burn up a rocket without one.

#### Scenario: Gas giant without a shield
- **WHEN** a rocket with no heat shield dips into Brontes's atmosphere
- **THEN** it burns up

#### Scenario: Shield wears
- **WHEN** a rocket with a heat shield skims Aurelia and climbs back out
- **THEN** it survives and its heat shield is worn down by the heat it took
