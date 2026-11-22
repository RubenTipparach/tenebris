# Proposal: player-heading - no more snap turns

## Why

The owner, 2026-11-22: "player can sometimes snap turn, inspect pdb code for
how we made the player controller much more robust and less error prone".
A snap turn is the view jumping (yaw flips or turns by a large angle in one
frame) during ordinary walking and looking on a planet.

The JS walker keeps its look as a world-space `surfaceForward` plus a
`surfacePitch`, re-projected onto the tangent plane every frame. If the
projection degenerates it falls back to a world axis. The camera is
rebuilt from that each frame, so any path that changes the position, the
up vector or the orientation without updating `surfaceForward` jumps the
view on the next frame. Several such paths exist (load, rocket exit, the
space-to-ground roll). Mouse deltas also come straight from the browser
with no guard against the known pointer-lock spikes.

Pale Blue Dot's walker (`crates/pbd-app/src/walking.rs`) never shows this.
It keeps the look as a tangent heading carried with the up vector, a
clamped pitch, and raw mouse deltas, and every placement goes through the
same transport.

## What Changes

- **One look state for the walker**: heading (unit tangent), up, pitch, in a
  pure module `src/player/WalkerLook.ts` ported from PBD.
- **Parallel transport, never a world axis**: each frame (and on any
  teleport, planet switch, load or rocket exit) the heading is turned by
  the shortest arc from the old up to the new up. A world-axis fallback is
  used only when the input itself is degenerate.
- **Every placement carries the look**: loading a save takes the saved
  camera direction; climbing out of a rocket takes the rocket camera's
  direction; the end of the space-to-ground roll takes the camera's
  direction; a teleport transports the heading.
- **The space-to-ground roll ends exactly level**, so the hand-off to the
  walker does not snap the leftover roll.
- **Raw, guarded mouse**: deltas are still applied in full on the frame they
  arrive, with no easing. Non-finite deltas are dropped. Movement that
  piled up across a pointer-lock change is thrown away. Pointer lock asks
  for unadjusted (raw) movement where the browser supports it, which
  removes Chrome's movement spikes. All lock requests go through one
  helper.
- **Pitch limit is a config value** (`PlayerConfig.PITCH_LIMIT_DEG`), not an
  inline literal.

## Capabilities

### New Capabilities
- `player-look`: the walker's heading and pitch, how they are carried across
  up-vector changes and placements, and how the mouse turns them.

### Modified Capabilities
- None.

## Impact

- `src/player/WalkerLook.ts` (new, pure), `src/player/PlanetPlayer.ts`
  (surface look, transition hand-off, load, a `placeAt` entry),
  `src/engine/InputManager.ts` (guarded deltas, `lockPointer`),
  pointer-lock call sites, `src/mainPlanet.ts` (rocket exit uses
  `placeAt`), `src/config/PlayerConfig.ts`.
- Save format unchanged. The orientation quaternion is still saved and
  restored, and it now also seeds the look.
- Tests: `scripts/player-heading.test.ts`.
