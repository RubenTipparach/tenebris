## ADDED Requirements

### Requirement: Sheep and cows live on Earth only

Sheep and cows SHALL be in Earth's fauna roster and no other planet's, and
the roster check SHALL hold them there.

#### Scenario: The rosters
- **WHEN** the game starts and checks the fauna rosters
- **THEN** sheep and cow are on Earth's roster and on no other

### Requirement: Shears shear a sheep

A player holding shears who presses Interact at a sheep within reach SHALL
get 1 to 3 wool. The sheep SHALL show as shorn and give no wool until its
fleece grows back.

#### Scenario: Shearing
- **WHEN** the player holds shears, looks at an unshorn sheep and presses F
- **THEN** wool lands in the inventory and the sheep is shorn

#### Scenario: Already shorn
- **WHEN** the player presses F at a shorn sheep
- **THEN** no wool is given

### Requirement: A cow gives leather

A cow hit a set number of times SHALL fall and drop 1 to 2 leather into the
player's inventory, and leave the world.

#### Scenario: Hunting a cow
- **WHEN** the player hits a cow the configured number of times
- **THEN** the cow is gone and leather is in the inventory

### Requirement: Wool makes carpet and clothing

Wool SHALL craft into carpet blocks (a drawn wool floor block) and wool
clothing, and the shears SHALL craft from iron ingots, each recipe gated by
its mission.

#### Scenario: A carpet
- **WHEN** the player crafts 4 wool in a 2x2
- **THEN** they get 4 carpet blocks they can place
