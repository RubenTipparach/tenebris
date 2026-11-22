## ADDED Requirements

### Requirement: Seas have their own swimming life

Each world with a sea SHALL have water animals of its own, which no other
planet has:
- its catchable fish, swimming in schools;
- at least one other creature.

They SHALL stay in the water between the seabed and the surface. Lifeless
worlds SHALL have none.

#### Scenario: Earth's shallows
- **WHEN** the player swims in Earth's sea near the shore
- **THEN** schools of Earth's fish swim nearby, crabs walk the seabed and jellyfish drift

#### Scenario: Rosters stay apart
- **WHEN** the game checks the fauna and fish rosters at startup
- **THEN** no water species is on two planets

### Requirement: The jungle moons have fish

Verdance and Mirewood SHALL each have catchable fish of their own, each with
an icon.

#### Scenario: Fishing on Verdance
- **WHEN** the player fishes in Verdance's sea
- **THEN** they can land one of Verdance's own fish species

### Requirement: Plants grow on the seabed

Each world with a sea SHALL grow sea plants of its own on submerged seabed,
chosen by depth (and on Earth by how warm the water is), swaying with the
water.

#### Scenario: Earth's reef
- **WHEN** the player looks under the water in Earth's warm shallows
- **THEN** coral and seagrass grow on the seabed
