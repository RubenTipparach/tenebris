# Spec Delta

## Purpose

A submarine for exploring deep water and a gas-giant diver for descending
into a gas giant's atmosphere, both rated by depth, so oceans and gas giants
become places to explore and gather from rather than scenery.

## ADDED Requirements

### Requirement: A submarine is placed, boarded and piloted in water

A submarine SHALL be an item the player places in water deep enough to hold
it, boards with Interact, and pilots in three dimensions with buoyancy and
drag. Leaving it SHALL park it where it is, and it SHALL persist and re-board
like a parked rocket.

#### Scenario: First dive
- **WHEN** the player places a submarine in Earth's sea and boards it
- **THEN** they can steer it down, up and around underwater, and leaving parks it there after a reload too

### Requirement: Each hull has a depth rating

Every submarine SHALL have a crush depth from its hull. Below it, the hull
SHALL take damage, and at zero health the submarine SHALL be lost and the
player respawned. The HUD SHALL show depth, the rating and hull health.

#### Scenario: Too deep
- **WHEN** a basic submarine goes below its rated depth in Thalassa's ocean
- **THEN** its hull health falls until it climbs back or is lost

### Requirement: A gas-giant diver descends into a gas giant

A gas-giant diver SHALL be carried in a rocket's cargo and released while the
rocket skims a gas giant's upper atmosphere. It SHALL descend through the
cloud deck with buoyancy and pressure like a submarine, and climb back to its
rocket to dock.

#### Scenario: Dive and return
- **WHEN** the player releases a diver above Brontes, descends, then climbs back to the parked rocket
- **THEN** the diver docks into the cargo again with what it collected

### Requirement: Depth gives resources

Each ocean and gas giant SHALL give resources by depth band, collected by the
submarine or diver: deuterium from Thalassa's deep water, helium-3 from a gas
giant's upper layers, and metallic hydrogen from Brontes's deepest band.

#### Scenario: Helium-3
- **WHEN** a diver holds within Aurelia's helium band for long enough
- **THEN** helium-3 is added to its hold
