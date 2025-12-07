# Water Rendering Bug Documentation

This document tracks water-related bugs and their technical context for future debugging.

**Status: Both bugs have been FIXED.**

---

## Bug 1: Underwater Cave Air Pockets Render as Water - FIXED

### Description
When there's an air pocket (cave) below the water surface, the tile incorrectly renders water even though there's air at the player's position.

### Visual Example
```
~  <- water surface
#  <- solid block (ceiling)
-  <- AIR pocket (cave) - player should walk here, NOT swim
-  <- AIR pocket
#  <- solid block (floor)
```

### Fix Applied
Changed `isInWater()` and `getWaterDepth()` in [Planet.ts](../src/planet/Planet.ts) to check the actual block type at the player's depth instead of just comparing to water surface depth:

```typescript
public isInWater(position: THREE.Vector3): boolean {
  const playerDepth = this.getDepthAtPoint(position);

  // Check if the block at the player's depth is actually water
  // This properly handles air pockets below water (caves under the ocean)
  if (playerDepth >= 0 && playerDepth < column.blocks.length) {
    return column.blocks[playerDepth] === HexBlockType.WATER;
  }

  return false;
}
```

---

## Bug 2: Breaking Block Below Water Doesn't Show Water - FIXED

### Description
When a solid block is broken that has water above it, water should "flow" into the newly created space.

### Visual Example
```
Before:                    After breaking block:
~~                         ~~
##                         #~  <- water flows here
--          ---->          -~  <- water fills the space
--                         -~
##                         ##
```

### Fix Applied
Modified `breakBlock()` in [PlanetBlockInteraction.ts](../src/player/PlanetBlockInteraction.ts) to check for water sources both vertically (above in same column) and horizontally (from neighboring tiles):

```typescript
// First check: search upward in same column for water with clear path
for (let d = depth + 1; d < maxDepth; d++) {
  const blockAtDepth = planet.getBlock(tileIndex, d);
  if (blockAtDepth === HexBlockType.WATER) {
    hasWaterSource = true;
    break;
  } else if (blockAtDepth !== HexBlockType.AIR) {
    break; // Hit solid block
  }
}

// Second check: check neighboring tiles for water at same depth or above
if (!hasWaterSource) {
  const neighbors = planet.getTileNeighbors(tileIndex);
  for (const neighborIndex of neighbors) {
    const neighborBlock = planet.getBlock(neighborIndex, depth);
    if (neighborBlock === HexBlockType.WATER) {
      hasWaterSource = true;
      break;
    }
    const neighborBlockAbove = planet.getBlock(neighborIndex, depth + 1);
    if (neighborBlockAbove === HexBlockType.WATER) {
      hasWaterSource = true;
      break;
    }
  }
}

// If water flowed in, cascade it downward through any air blocks below
if (newBlockType === HexBlockType.WATER) {
  for (let d = depth - 1; d > 0; d--) {
    const blockBelow = planet.getBlock(tileIndex, d);
    if (blockBelow === HexBlockType.AIR) {
      planet.setBlock(tileIndex, d, HexBlockType.WATER);
    } else {
      break; // Hit solid ground
    }
  }
}
```

Water flow checks:
1. **Vertical**: Search upward in same column for water with clear air path
2. **Horizontal**: Check if neighboring tiles have water at the same depth or one level above
3. **Cascade**: If water flows in, it cascades down through air blocks until hitting solid ground

**Water Physics**: Since the blocks are set to `HexBlockType.WATER`, the player will experience full water physics (swimming, buoyancy, reduced gravity) when entering the cascaded water column. The `isInWater()` check in Planet.ts looks at the actual block type at the player's depth, so water that flows into caves will function identically to natural water.

---

## Technical Context

### Water Detection System
- **Depth system**: 0 = bedrock, higher = closer to sky
- **Water surface**: Topmost water block in a column
- **Detection points**: Eye level, body center, feet position

### Key Files
| File | Purpose |
|------|---------|
| [Planet.ts](../src/planet/Planet.ts) | `isInWater()`, `getWaterDepth()`, `getWaterSurfaceRadius()` |
| [PlanetPlayer.ts](../src/player/PlanetPlayer.ts) | Swimming physics, water state detection |
| [PlanetBlockInteraction.ts](../src/player/PlanetBlockInteraction.ts) | Block breaking with water flow |
| [geometryWorker.ts](../src/workers/geometryWorker.ts) | Water geometry generation |
| [geometry.ts](../src/shared/geometry.ts) | `buildWaterWallGeometry()` |
