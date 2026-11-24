# Spec Delta

## Purpose

Adds Thalassa, a mostly-water planet on the outward route with a thick
atmosphere, deep ocean and its own sea life, the system's ocean world and the
home of the submarine's deepest dives.

## ADDED Requirements

### Requirement: Thalassa is a mostly-water planet

Thalassa SHALL be a landable planet whose surface is at least nine-tenths
ocean, with a few small islands, a deep ocean floor and a thick, breathable
atmosphere. It SHALL sit on the outward route between Kessel and Aurelia, and
its gravity well SHALL NOT overlap any other body's.

#### Scenario: From orbit
- **WHEN** the player looks at Thalassa from space
- **THEN** almost all of it is ocean, with scattered islands

#### Scenario: Clearance
- **WHEN** the solar system clearance check runs
- **THEN** Thalassa reports no overlap

### Requirement: Thalassa has its own life

Thalassa's sea flora and fish species SHALL be its own. None of them SHALL
appear on another body, and none of another body's species SHALL appear on
Thalassa. Its seabed and island ground SHALL be its own blocks.

#### Scenario: Disjoint rosters
- **WHEN** the flora and fauna roster checks run
- **THEN** Thalassa's species share nothing with any other body's

### Requirement: Thalassa's deep water is a resource

Thalassa's ocean SHALL hold deuterium in its deepest band, reachable only by
submarine.

#### Scenario: Heavy water
- **WHEN** a submarine rated deep enough collects in Thalassa's deep band
- **THEN** deuterium is added to its hold
