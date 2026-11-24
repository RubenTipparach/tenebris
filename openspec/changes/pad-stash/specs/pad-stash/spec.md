## ADDED Requirements

### Requirement: Boarding at a launch pad stashes the carried items

When a player boards a rocket standing on a launch pad, every hotbar and bag
item that is not exempt SHALL move into that pad's stash the same frame,
stacked onto matching items first, and the stash SHALL be saved and synced
with the pad record.

#### Scenario: Board with materials and a pickaxe

- **WHEN** a player carrying 30 stone and an iron pickaxe boards at a pad
- **THEN** the pad's stash holds 30 stone and the player still has the pickaxe

#### Scenario: Re-board merges

- **WHEN** the stash holds 30 stone and the player boards again carrying 20 stone
- **THEN** the stash holds 50 stone in one stack

### Requirement: Exempt items are a config list

Items exempt from the stash SHALL be given by config (categories and item
types); tools, suits, oxygen tanks and suit heaters are exempt by default.

#### Scenario: Survival gear stays

- **WHEN** a player carrying oxygen tanks, a suit heater and a fishing rod boards at a pad
- **THEN** all of them stay in the player's hotbar / bag

### Requirement: The stash can be taken back at the pad

Any player at the pad SHALL be able to open the stash in a slot grid beside
their hotbar and bag and move items between them.

#### Scenario: Take it all back

- **WHEN** the stash holds 30 stone and the player takes all
- **THEN** the player has 30 stone and the stash is empty

### Requirement: Boarding a parked rocket loads its cargo hold

When a player boards a rocket that is not on a launch pad, the non-exempt
items SHALL move into its cargo hold; if they do not all fit, boarding SHALL
be refused with a message and nothing SHALL move. The same all-or-nothing
rule SHALL apply to a full stash.

#### Scenario: Hold too small

- **WHEN** a player carrying 10 different blocks boards a parked rocket with a 4-slot hold
- **THEN** boarding is refused and the player keeps all 10

### Requirement: Older saves load unchanged

A pad record without a stash SHALL load with an empty stash.
