# Spec Delta

## ADDED Requirements

### Requirement: Bodies have their own resources

Each body that gives a new resource SHALL be the only place it is gathered
naturally: Sequoia's resin, Metropole Prime's salvage, rare-earth magnets
from Lodestone, radiotrophic fungus from Umbra, silica for aerogel from Vesper,
crystals from Halcyon, cryogenic coolant from Tessaly, deuterium from
Thalassa, helium-3 from the gas giants and metallic hydrogen from Brontes.
Every new resource SHALL have an icon.

#### Scenario: Where magnets come from
- **WHEN** the player mines Lodestone's ore
- **THEN** it yields rare-earth ore, and no other body's terrain yields it

#### Scenario: Icons
- **WHEN** the item icon test runs
- **THEN** every new resource has an icon texture
