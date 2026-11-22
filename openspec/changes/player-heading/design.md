# Design: player-heading

## Context

### How Pale Blue Dot's walker stays robust

`crates/pbd-app/src/walking.rs` (PBD, read-only reference):

- **State is `heading` (unit tangent), `up`, `pitch` (scalar)**, in
  `WalkingState`. There is no world-space forward to project, and no Euler
  angles.
- **`transport_up(up)`**: `heading = Quat::from_rotation_arc(self.up, up) *
  heading`, then `tangent_heading(heading, up)`, then `self.up = up`. It is
  called every place up can change: `read_walking_input` (each input
  frame), `drive_walker` (each physics step), `follow_walker` (each render
  frame), `drop_walker`, `restore` and `place_walker`. That covers
  teleport, respawn and getting out of a ship.
- **`tangent_heading(forward, up)`** projects onto the tangent plane, with
  `Y x up`, then `X`, as the fallback. The fallback is only reached when
  the input is degenerate, never in a walk, because the heading is always
  carried and never re-derived.
- **Mouse look** (`read_walking_input`): `heading = Quat::from_axis_angle(up,
  -dx * sens) * heading` and `pitch = clamp(pitch - dy * sens, +-89 deg)`,
  guarded by `delta.is_finite()`. It reads the raw accumulated device
  motion of this frame. The PBD CLAUDE.md rule is that player mouse look
  uses the current frame's raw displacement, with no easing, smoothing or
  interpolation delay. The spec is `openspec/specs/player/walking`,
  "Mouse look is immediate".
- **The camera** comes from `rotation()`: `looking_to(heading cos p + up sin p,
  up)`. It is level with the horizon and has no roll by construction.
- **Hand-offs** go through `look_along(view, up)` (`drop_walker`,
  `switch_mode`): the forward's tangent part becomes the heading and its
  angle the pitch. `restore` re-projects the saved heading onto the new up.
- **Floating origin and rebases** (`rebase_walker`, `world-frames` spec)
  shift positions only. Directions are frame-invariant under a translation,
  so the heading needs nothing. Up always comes from the origin's f64
  methods, never from `position.normalize()` on a local f32.
- **Tests**: `walking_mouse_is_immediate_and_movement_stays_tangent_when_looking_up`
  and the restore / drop / new-world tests in the same file.

### What the JS walker did

`src/player/PlanetPlayer.ts` kept `surfaceForward` (world space) and
`surfacePitch`. Each surface frame it projected `surfaceForward` onto the
tangent plane at the feet. A degenerate projection fell back to world
`(0, 0, -1)`, then `(1, 0, 0)`. It yawed about up and rebuilt the camera
with `Matrix4.lookAt`. Projection is parallel transport only to first
order. When up moves a long way in one step the result is wrong, and when
the old forward is parallel to the new up it is a world-axis snap.

These paths changed the view discontinuously:

1. **Loading a save.** `importFromSave` restored `orientation` but not
   `surfaceForward` or `surfacePitch`. The first walking frame rebuilt the
   camera from the default `(0, 0, -1)` and pitch 0, so the saved look was
   thrown away and the view jumped on load. Autosave writes the orientation
   every 5 s, so this hit every session.
2. **Climbing out of a rocket or teleporting.** The position was written
   directly (`player.position.copy`). The next frame projected the stale
   pre-boarding `surfaceForward` onto a tangent plane that might be
   anywhere on the body or another body. That gave an arbitrary heading,
   or the world-axis fallback when the old forward was near the new up. The
   rocket camera's view was ignored as well.
3. **The end of the space-to-ground roll.** `slerpRollToLevel` eased by a
   fixed `ROLL_SLERP_SPEED * dt`, which leaves about e^-2.4 (9%) of the
   roll after `ROLL_SLERP_DURATION`. The hand-off then rebuilt a level
   camera, snapping that leftover roll away in one frame.
4. **Browser mouse spikes.** Chrome's accelerated pointer-lock movement
   occasionally reports a huge `movementX` in one event, and the first event
   after a lock can carry the cursor's jump. Both arrive as a genuine yaw
   and turn the view by tens of degrees in one frame, at random, during
   ordinary play. This is the most likely cause of "sometimes" snap turns
   while just walking and looking.

Frame changes were checked and are not a cause. `setReferenceBody` only
translates the player, the camera and the rocket. The reference body
never moves or turns in its own frame (`framePositionAt`); the sky does.
Directions are unchanged by a translation, so the heading needs nothing
there.

## Goals / Non-Goals

**Goals:**
- One look state and one transport for the walker, ported from PBD.
- Every placement (load, teleport, respawn, rocket exit, the end of the
  space roll) goes through it.
- Raw mouse, applied in full, guarded against NaN and browser spikes.

**Non-Goals:**
- Space flight's 6DOF quaternion (`orientation` while `isInSpace`). It is
  already quaternion-integrated and is untouched.
- The station frame. The JS client has no orbital station yet. When one
  lands, its deck up feeds the same `transportUp`.
- The movement code's collision and floors (the tree fall-through bug is
  separate).

## Decisions

1. **`src/player/WalkerLook.ts`, pure.** It provides `newWalkerLook`,
   `tangentHeading`, `transportUp`, `turnLook`, `lookAlong`,
   `lookDirection` and `lookQuaternion`, using three.js maths only, so a
   tsx test can drive it. PlanetPlayer holds one `WalkerLook` in place of
   `surfaceForward` and `surfacePitch`.
2. **Transport each surface frame.** `transportUp(look, radialUp)`, then
   `turnLook(look, yaw, pitch)`, then `lookQuaternion(look, orientation)`.
   `transportUp` uses `Quaternion.setFromUnitVectors(oldUp, newUp)`, which
   handles the antiparallel case, then re-projects with the previous
   heading as the fallback.
3. **The camera basis is right = heading x up, camUp = right x forward.**
   heading is tangent, so right is defined at any pitch. This replaces
   `lookAt`, which degenerates as forward approaches up.
4. **`lookAlong(look, forward, up, limit, viewUp?)`** is used for
   hand-offs. With the handed-over camera's up, the heading is
   `f cos p - viewUp sin p`, which is exact even looking straight down.
   Without it, a vertical view keeps the transported heading.
5. **`PlanetPlayer.placeAt(position, view?)`** is the one placement entry. It
   picks the gravity body, sets the position, zeroes the velocity and
   transports the heading or takes the view. mainPlanet's teleport (and so
   respawn) and rocket exit call it. Rocket exit passes the engine camera's
   forward and up, and its radial now comes from the body it landed on, not
   the world origin. `importFromSave` seeds the look from the saved
   orientation through `lookAlong`.
6. **The roll slerp ends exactly level.** The factor is
   `max(ROLL_SLERP_SPEED * dt, dt / remaining)`, so the last frame closes
   the gap and the hand-off is seamless. The feel early in the transition is
   unchanged.
7. **Input.** `lockPointer()` in InputManager is the one way to lock. It asks
   for `{ unadjustedMovement: true }` and falls back to a plain lock if the
   promise rejects. The mousemove handler drops non-finite deltas and the
   first event after a lock. `pointerlockchange` clears the accumulator.
   Deltas stay raw and whole: no smoothing, no clamp on legitimate motion.
8. **No magic numbers.** The pitch clamp is `PlayerConfig.PITCH_LIMIT_DEG`
   (89.9, as before). The degenerate threshold in WalkerLook is a numeric
   tolerance of the algorithm, not a tunable.

## Risks / Trade-offs

- With unadjusted movement Chrome no longer applies OS pointer acceleration,
  so look sensitivity may feel slightly different (it is now linear, as
  PBD is). `MOUSE_SENSITIVITY` is the knob if the owner wants it changed.
- Taking the rocket camera's view on exit points the walker the way the
  chase camera faced. That is PBD's behaviour, and better than the stale
  pre-boarding heading.
- Only the owner's in-game check proves the browser spike fix. Headless
  Chrome cannot reproduce the hardware spikes.
