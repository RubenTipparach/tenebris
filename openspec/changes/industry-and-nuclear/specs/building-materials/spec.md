## Purpose

Materials to build with beyond dirt, stone and planks: brick, clay,
concrete, steel girders and steel-framed glass, each a placeable block with
its own look, made from the new resources and machines.

## ADDED Requirements

### Requirement: Construction blocks

The game SHALL have these placeable building blocks, each with its own
drawn texture (never a tint of another block), its own icon, and a mining
time that rises with how strong it is:
- a clay block;
- a brick block;
- a concrete block;
- a steel girder;
- a steel-framed glass block that light and sight pass through like glass.

#### Scenario: Building a wall

- **WHEN** the player places a brick block, a concrete block and a steel-framed glass block in a row
- **THEN** each shows its own texture, and the player can see through the glass one

#### Scenario: Tougher materials

- **WHEN** the player mines a dirt, a brick and a concrete block with the same tool
- **THEN** the concrete takes longest and the dirt shortest

### Requirement: Each material has a recipe chain

- Placing clay SHALL place a clay block.
- Four bricks SHALL make a brick block.
- The kiln SHALL fire clay and stone into cement.
- Cement, sand, stone and a water bucket SHALL make concrete blocks and give
  the bucket back.
- The electric furnace SHALL make steel from iron ingots and coal.
- Steel SHALL make steel girders.
- Steel and glass SHALL make steel-framed glass.

#### Scenario: Concrete

- **WHEN** the player combines cement, sand, stone and a water bucket
- **THEN** they get concrete blocks and an empty bucket

#### Scenario: Steel

- **WHEN** iron ingots and coal go into a powered electric furnace
- **THEN** it gives steel
