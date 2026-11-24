## ADDED Requirements

### Requirement: A remote avatar stands upright and pitches only its head

A remote player's avatar SHALL keep its body upright on the local surface
of the planet it is on, turned only by the player's heading (yaw). The
player's look pitch SHALL turn only the avatar's head, clamped to
`AvatarConfig.HEAD_PITCH_LIMIT_DEG`. The body and head SHALL be computed
by one pure function from the reported orientation and the surface up, so
poses from clients that predate this change render the same way.

#### Scenario: A player looks straight down

- **WHEN** a remote player pitches their view to the walker's limit below the horizon
- **THEN** the avatar's body up equals the surface up, and its head is pitched down by the clamped head limit

#### Scenario: A player looks up while turned

- **WHEN** a remote player's orientation has any yaw and an upward pitch
- **THEN** the body faces the player's heading on the tangent plane and the head pitch equals the look pitch up to the clamp

### Requirement: The pose frame carries the player's action

The pose frame SHALL carry an optional compact action field: the continuous
action (idle or mining), the kind and a wrapping counter of the latest
one-shot action (place, interact, a single swing), and the held item id. A
pose frame without the field SHALL decode as idle with an empty hand. The
server SHALL relay a valid field with the pose and drop an invalid one
without dropping the pose.

#### Scenario: Round trip

- **WHEN** an action state is encoded into a pose frame and decoded
- **THEN** every field comes back equal

#### Scenario: An old client's pose

- **WHEN** a pose frame has no action field, or a malformed one
- **THEN** it decodes as idle, no one-shot, empty hand

### Requirement: Remote avatars animate the player's actions

A remote avatar SHALL play a repeating arm swing while its player is
mining, and exactly one matching arm animation each time its player places
a block or object, interacts with something, or hits an animal. The arm
clips SHALL be baked into `public/animations/player.anim.json` by
`scripts/gen-fauna-anims.py`.

#### Scenario: Holding the mine button

- **WHEN** a player holds the mine button on a block for several seconds, breaking blocks in turn
- **THEN** their avatar swings continuously without stopping between blocks

### Requirement: A one-shot plays exactly once

A one-shot SHALL be detected by a change of the pose frame's counter, so a
missed pose frame still plays it once and a repeated frame never plays it
twice.

#### Scenario: A frame is missed

- **WHEN** a player places a block and the receiver misses the first pose frame carrying it
- **THEN** the next frame still starts exactly one place animation, and later frames with the same counter start none

### Requirement: The held item shows in the avatar's hand

A remote avatar SHALL show the item its player holds in its right hand,
drawn from that item's texture, and nothing when the hand is empty or the
id is unknown.

#### Scenario: Switching to a pickaxe

- **WHEN** a remote player selects a pickaxe in their hotbar
- **THEN** their avatar's right hand shows the pickaxe icon within one pose frame
