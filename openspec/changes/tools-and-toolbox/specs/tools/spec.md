## ADDED Requirements

### Requirement: Tools come in tiers that dig faster

The game SHALL have a pickaxe, an axe and a shovel in the rock, copper,
iron, steel and titanium tiers, and a fishing rod. Each tier's uses and
mining-time multiplier SHALL come from `src/config/ToolConfig.ts`. Breaking a
block whose drop wants a tool kind SHALL take its mining time times the
multiplier of the tool used; with no such tool at hand it SHALL take the
bare-hands time as before.

#### Scenario: Rock pickaxe on stone

- **WHEN** a player with a rock pickaxe in the toolbox digs stone
- **THEN** the dig takes stone's mining time x the rock tier's multiplier

#### Scenario: Pickaxe on dirt

- **WHEN** the player has only a pickaxe and digs dirt
- **THEN** the dig takes dirt's bare-hands time

### Requirement: The toolbox holds one tool per kind and picks the tool for the job

The inventory SHALL have a toolbox of four slots: pickaxe, axe, shovel,
rod. A tool of the right kind in the selected hotbar slot SHALL be used
first, else the toolbox's. Only a tool of a slot's kind SHALL go into that
slot.

#### Scenario: Dragging a fish onto the pickaxe slot

- **WHEN** the player drops a non-tool on a toolbox slot
- **THEN** nothing moves

### Requirement: A crafted tool equips itself if its slot is free

Crafting a tool SHALL put it in the toolbox when the toolbox has no tool of
its kind, and otherwise into the inventory (hotbar first).

#### Scenario: Crafting a second pickaxe

- **WHEN** the toolbox already holds a pickaxe and the player crafts another
- **THEN** the new pickaxe goes into the hotbar or bag and the toolbox is unchanged

### Requirement: Tools wear out

Each block broken with a tool, each tree felled with an axe and each rod
cast SHALL spend one use. A worn tool's slot SHALL show a durability bar.
When the last use is spent the tool SHALL break with a toast, its slot SHALL
empty, and a spare of the same kind from the inventory SHALL move into the
toolbox.

#### Scenario: The 200th block

- **WHEN** a rock pickaxe breaks its 200th block
- **THEN** it breaks and its toolbox slot is empty (or holds the spare)

### Requirement: Durability and the toolbox persist

A tool's uses left and the toolbox SHALL be saved with the inventory on the
frame they change, and restored on load. A save written before this change
SHALL load with every tool fresh and the toolbox empty.

#### Scenario: Reload a worn pickaxe

- **WHEN** a pickaxe with 37 uses left is saved and the world reloaded
- **THEN** it has 37 uses left

### Requirement: Tool recipes are unlocked by missions

Every tool SHALL have a crafting-grid recipe made from its tier's material
and sticks, each unlocked by exactly one mission.

#### Scenario: A new world

- **WHEN** a new world starts
- **THEN** no tool recipe is open until its mission is done

### Requirement: Right-click splits a stack in half, rounded up

In the inventory panel, right-clicking a stack SHALL pick up `ceil(n / 2)`
of it onto the cursor and leave the rest; clicking a slot SHALL put the
held stack down (empty slot, merge with the same item, else swap).

#### Scenario: Seven torches

- **WHEN** the player right-clicks a stack of 7
- **THEN** 4 are held and 3 stay; a stack of 1 lifts whole
