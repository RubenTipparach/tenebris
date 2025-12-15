# Bugs to Fix Later

- [ ] Slight performance hitching
- [ ] 10x sized planets?
- [ ] Water fluid sim/spawner checker
- [ ] Geometry warp?

- why is my ocean dry under the generated ice?
- water refuses to spawn under anything. this is a critical bug.
- more bugs: wiring for stuff doesnt work if one of the connections go nowhere. should not be like this, if a block contains in valid connection and a valid connection, it should still function
-rocket despawning when boarding unboarding and rocket is still on landing pad. I think when the player first fires the thruster, this should decouple the rocket from landing pad permanently, so landing pad will no longer register it has a rocket, and the rocket will become completely independent.

-placing moon rock on earth just turns to normal rock

- addressing performance issues
-terrain LOD height is not matching actual terrain height.

-- see water_bugs.md lol

- need wiki

---

## Fixed Bugs

### Jump Drift (FIXED)
**Problem:** When jumping while walking, the player would drift horizontally even without pressing WASD during the jump. The debug logs showed "JUMP DRIFT DETECTED" with arc distances of ~0.7 units (walking momentum) and ~0.27 units (pure vertical jumps).

**Causes:**
1. The jump code preserves horizontal velocity when jumping (intentional for game feel), but the drift detection assumed any drift without WASD was a bug.
2. On pure vertical jumps, ground snapping used `actualUp` calculated from the landing position, which could differ slightly from the jump start position due to floating point drift during the arc.

**Fixes:** In `PlanetPlayer.ts`:
1. The jump code now checks if the player had significant horizontal velocity (>0.5 units) at jump start. If so, `wasdPressedDuringJump` is set to true, so drift is expected.
2. Ground snapping now uses the stored `jumpDirection` (the up vector at jump start) for pure vertical jumps, ensuring the player lands at the same angular position they jumped from.

### Upward Teleport on Multi-Floor Tiles (FIXED)
**Problem:** When walking from one tile to another tile with multiple floor levels (e.g., a cave with floor at r84 and a pillar/tree top at r91), the player would teleport upward to the higher floor instead of falling to the lower one.

**Cause:** The `resolveStuckPosition()` function picked the floor closest by absolute distance. If player was at r88 walking onto a tile with floors at r84 (4 units below) and r91 (3 units above), it picked r91 because |88-91|=3 < |88-84|=4.

**Fix:** In `PlanetPlayer.ts resolveStuckPosition()`, the floor selection now prioritizes floors BELOW the player over floors above. This matches expected gravity behavior - players fall down, not teleport up.