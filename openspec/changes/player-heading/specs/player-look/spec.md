## Purpose

Looking around is the most exercised interaction in the game. On a planet
the walker's view SHALL follow the mouse and the ground. It SHALL never
jump on its own: not when crossing a pole, not at a pentagon, not at a
reference-frame change, a teleport, a load or climbing out of a rocket.

## ADDED Requirements

### Requirement: The walker's look is a transported heading and a pitch

On a planet the walker's look SHALL be held as a unit heading tangent to
the surface, the up vector it was last carried to, and a pitch clamped to
`PlayerConfig.PITCH_LIMIT_DEG`. The camera SHALL be built from them each
frame, level with the horizon. Its right vector SHALL be heading x up.

#### Scenario: Looking nearly straight down

- **WHEN** the walker pitches to the limit
- **THEN** the camera has no roll and its right vector stays perpendicular to up

### Requirement: The heading is parallel-transported, never snapped to an axis

When up changes, the heading SHALL be turned by the shortest rotation from
the old up to the new up, then re-projected onto the new tangent plane.
This covers walking, a planet or gravity-well switch, a teleport and a
respawn. A world-axis fallback SHALL be taken only when the input is itself
degenerate, never while walking.

#### Scenario: Walking over the north pole

- **WHEN** the walker walks straight across the pole, turning the mouse steadily
- **THEN** the camera's forward never changes by more than that frame's walking arc plus its mouse turn

#### Scenario: Teleport to another planet

- **WHEN** the walker is placed at a point whose up is far from the current up
- **THEN** the new heading is the old one carried by the shortest arc, tangent and finite

### Requirement: Every placement carries the look

Whatever places the walker SHALL set the look through the same transport.
Loading a save SHALL take the saved camera direction. Climbing out of a
rocket SHALL take the rocket camera's direction. The end of the
space-to-ground roll SHALL take the camera's direction. A teleport SHALL
carry the current heading. Looking straight up or down at the hand-off SHALL
keep the current heading rather than invent one.

#### Scenario: Loading a save

- **WHEN** a save is loaded
- **THEN** the first frame looks where the save was looking

#### Scenario: The roll back to level after space

- **WHEN** the walker falls from space into a gravity well
- **THEN** the roll eases to exactly level by the end of the transition and the hand-off to walking does not move the view

### Requirement: Mouse look is raw, immediate and guarded

The full mouse displacement of a frame SHALL reach the look that frame. No
easing, smoothing or delay SHALL be applied. Non-finite deltas SHALL be
dropped. Movement that piled up across a pointer-lock change SHALL be
discarded. Pointer lock SHALL request unadjusted (raw) movement where the
browser supports it, falling back to a plain lock. All lock requests SHALL
go through one helper.

#### Scenario: A fast swipe

- **WHEN** the mouse moves a large distance in one frame
- **THEN** the whole turn is applied that frame

#### Scenario: Closing a menu

- **WHEN** a menu closes and the pointer is locked again
- **THEN** mouse motion from before the lock does not turn the view
