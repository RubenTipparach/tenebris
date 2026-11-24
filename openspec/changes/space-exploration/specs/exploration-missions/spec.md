# Spec Delta

## Purpose

The space exploration mission tree: announced when the first rocket is built,
it gives the player one mission for every body in the solar system along two
routes from the Moon, and each body's reward is what a later trip needs.

## ADDED Requirements

### Requirement: Building the first rocket announces the exploration tree

When the mission for assembling the first rocket is completed, the game SHALL
show a toast saying the Space exploration tree is unlocked and how many bodies
it covers. The toast SHALL show once per world.

#### Scenario: First rocket assembled
- **WHEN** the player completes the assemble-a-rocket mission
- **THEN** a toast reads that Space exploration is unlocked with the number of bodies to visit, after the usual mission-done toast

#### Scenario: Not repeated
- **WHEN** the player reloads the world afterwards
- **THEN** the unlock toast does not show again

### Requirement: Every body has one visit mission

The tree SHALL hold exactly one visit mission for every body in the solar
system other than Earth: every planet, moon and asteroid, each gas giant, and
the Sun. Adding a body without its visit mission SHALL fail the test suite.

#### Scenario: Coverage
- **WHEN** the mission tests run
- **THEN** every body in the solar system configuration and the gas giant table, except Earth, is the target of exactly one visit mission

#### Scenario: A new body
- **WHEN** a body is added to the solar system configuration without a visit mission
- **THEN** the coverage test fails and names the body

### Requirement: A landable body is visited by landing and surveying it

A landable body's visit mission SHALL be completed by landing a rocket on that
body and placing a survey beacon there. A body with an atmosphere SHALL also
require the landing to be made under a parachute.

#### Scenario: Airless moon
- **WHEN** the player lands on Rime and places a survey beacon there
- **THEN** the Rime visit mission is done

#### Scenario: Atmospheric world without a parachute
- **WHEN** the player lands on Thalassa without opening a parachute
- **THEN** the Thalassa visit mission stays open, and its card says a parachute landing is needed

### Requirement: The Sun and the gas giants are visited without landing

The Sun's visit mission SHALL be completed by a close pass inside a set
distance of the Sun with the rocket surviving. A gas giant's visit mission
SHALL be completed by entering its upper atmosphere and leaving again with
the rocket surviving.

#### Scenario: Close solar pass
- **WHEN** a rocket with a heat shield flies inside the Sun's close-pass distance and survives
- **THEN** the Sun visit mission is done

#### Scenario: Gas giant skim
- **WHEN** a rocket dips into Aurelia's upper atmosphere and climbs back out intact
- **THEN** the Aurelia visit mission is done

### Requirement: The Moon is first, then two routes

The Moon's visit mission SHALL be the root of the exploration tree. Every other
body's visit mission SHALL sit on either the sunward route or the outward
route, both starting from the Moon. A moon SHALL be on the same route as its
parent body, after it. An asteroid SHALL hang off the major body nearest to it.

#### Scenario: Two routes open after the Moon
- **WHEN** the Moon visit mission is completed
- **THEN** the first sunward mission (Sequoia) and the first outward mission (Kessel) are both open

#### Scenario: A moon follows its planet
- **WHEN** the player looks at Nyx's card
- **THEN** its parent is the Umbra visit mission

### Requirement: Each body rewards something later trips need

Each visit mission SHALL unlock at least one recipe, part or resource use.
The tree SHALL be built so that finishing it needs rewards from both routes.

#### Scenario: Cross-route dependency
- **WHEN** the player has finished every sunward mission but no outward ones
- **THEN** the final engine tier is still locked, and its card names the outward reward it needs

#### Scenario: No empty rewards
- **WHEN** the mission tests run
- **THEN** every visit mission unlocks at least one recipe output

### Requirement: The tree shows exploration progress

The Space exploration branch SHALL show how many bodies have been visited out
of the total, on its branch plaque and in the side panel of any visit mission.

#### Scenario: Count
- **WHEN** the player has visited the Moon, Sequoia and Rime
- **THEN** the branch reads 3 of the total bodies visited

### Requirement: Existing missions and saves keep working

Existing mission ids SHALL be kept. A world that already completed the Moon or
Sequoia landing missions SHALL count those bodies as visited for the survey
part of their visit missions, and no recipe already unlocked SHALL lock again.

#### Scenario: Veteran world
- **WHEN** a world that landed on the Moon and Sequoia before this change is loaded
- **THEN** both visit missions are done and every recipe it had stays unlocked
