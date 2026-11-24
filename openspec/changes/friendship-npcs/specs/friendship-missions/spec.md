# Spec Delta

## Purpose

Per-player friendship with each village, its levels and rewards, and the
Friendship mission tree that appears world by world as the player meets
people.

## ADDED Requirements

### Requirement: Friendship per player per village

Each player SHALL have a friendship score with each village, raised only by
their own deliveries toward that village's requests, saved with their
mission progress. Scores pass configured thresholds into levels.

#### Scenario: Own deliveries count
- **WHEN** player A delivers toward a Sequoia village request and B does not
- **THEN** only A's friendship with that village rises

#### Scenario: Level up
- **WHEN** a player's score with a village passes the second threshold
- **THEN** the player reaches that village's second level and is told so

### Requirement: The Friendship branch is unlocked by meeting

The mission tree SHALL have a Friendship branch that is hidden until the
player first meets an NPC (on any world), and is then announced once with a
toast. Nothing crafted or built unlocks it.

#### Scenario: Hidden at first
- **WHEN** a player has met no NPC
- **THEN** the mission tree shows no Friendship branch

#### Scenario: First meeting
- **WHEN** the player meets their first NPC
- **THEN** a toast announces the Friendship tree and the branch appears, and the toast does not show again after a reload

### Requirement: A sub-tree per world, shown once met

Under the Friendship branch, each inhabited world SHALL have its own
sub-tree of missions, shown only once the player has met someone on that
world. Its missions are: meeting the village elder, completing requests of
each family for that world's villages, and reaching each friendship level.
Worlds the player has not met anyone on SHALL not appear.

#### Scenario: Meeting reveals a world
- **WHEN** the player meets a villager on Umbra for the first time
- **THEN** Umbra's friendship sub-tree appears under the Friendship branch

#### Scenario: Unmet world stays hidden
- **WHEN** the player has never met anyone on Vesper
- **THEN** no Vesper friendship missions are shown

### Requirement: Friendship rewards

Each friendship level SHALL unlock configured rewards for that player: that
world's own recipes (each such recipe unlocked by exactly one mission, as
with every recipe in the game), better trader offers, and character-creator
looks from that world. Rewards are per player.

#### Scenario: A world's recipe
- **WHEN** a player reaches Sequoia's third level
- **THEN** the Sequoia recipe that level names becomes craftable for that player only

#### Scenario: Every recipe has one unlocking mission
- **WHEN** the mission table is checked
- **THEN** every friendship reward recipe is unlocked by exactly one mission

### Requirement: Existing progress is untouched

Adding the Friendship tree SHALL NOT re-lock any recipe or undo any mission
in an existing save; a save from before this change loads with no
friendship progress and the branch hidden.

#### Scenario: Old save
- **WHEN** a save made before this change is loaded
- **THEN** every mission done before is still done, and the Friendship branch is hidden until an NPC is met
