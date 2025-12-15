# Planet Sequoia Implementation Plan

## Overview
Planet Sequoia is a large alien world, roughly 2x the size of Earth with Earth-like gravity. It features:
- Mushroom-shaped brown/grey trees
- Greenish-tinted water
- Reddish atmosphere
- Uses `planet_seq` tileset (already exists)

---

## Phase 1: Configuration & Tileset

### 1.1 Create SEQUOIA_TILESET in SolarSystemConfig.ts

```typescript
export const SEQUOIA_TILESET: TilesetConfig = {
  basePath: '/textures/planet_seq',
  stone: '/textures/rocks.png',              // Reuse Earth rocks
  dirt: '/textures/planet_seq/planet_seq_dirt.png',
  grass: '/textures/planet_seq/planet_seq_grass.png',
  dirtGrass: '/textures/planet_seq/planet_seq_grass_dirt.png',
  sand: '/textures/planet_seq/planet_seq_sand.png',
  wood: '/textures/planet_seq/planet_seq_side.png',  // For mushroom stems
  snow: '/textures/planet_seq/planet_seq_snow.png',
  dirtSnow: '/textures/planet_seq/planet_seq_snow_dirt.png',
  ice: '/textures/planet_seq/planet_seq_snow.png',   // Reuse snow as ice
  water: '/textures/water.png',              // Reuse Earth water texture
  glass: '/textures/glass.png',              // Reuse Earth glass
  mineralsPath: '/textures/minerals/earth',  // Reuse Earth minerals for now
};
```

### 1.2 Add Sequoia CelestialBodyConfig

```typescript
{
  id: 'sequoia',
  name: 'Sequoia',
  type: CelestialBodyType.PLANET,
  radius: 200,                    // 2x Earth's radius (100)
  subdivisions: 6,                // Same detail as Earth
  position: { x: 800, y: 100, z: 400 },  // Position in solar system
  visual: {
    heightVariation: 1.0,
    terrainStyle: TerrainStyle.EARTH_LIKE,
    distantColor: '#558844',      // Greenish when viewed from distance
  },
  gravity: {
    strength: 1.0,                // Same as Earth
    fullRadiusMultiplier: 1.2,    // Adjusted for larger radius
    falloffRadiusMultiplier: 1.5,
  },
  terrain: {
    hasWater: true,
    seaLevel: 12,
  },
  tileset: SEQUOIA_TILESET,
  spawn: {
    latitude: 30,
    longitude: 45,
    altitudeAboveSurface: 3,
  },
  landable: true,
  hasAtmosphere: true,
}
```

---

## Phase 2: Atmosphere Tinting

### 2.1 Add atmosphereTint to VisualConfig interface (SolarSystemConfig.ts)

```typescript
export interface VisualConfig {
  // ... existing fields ...
  /** Atmosphere color tint (multiplied with scattering result) */
  atmosphereTint?: string;  // e.g., '#ff8866' for reddish
}
```

### 2.2 Update Atmosphere.ts to support tint

Add `atmosphereTint` uniform to the shader material:
```typescript
atmosphereTint: { value: new THREE.Color(config.atmosphereTint || '#ffffff') },
```

### 2.3 Update atmosphere.frag shader

Add uniform and apply tint after scattering calculation:
```glsl
uniform vec3 atmosphereTint;

// In main(), after calculating color:
color *= atmosphereTint;
```

### 2.4 Update createEarthAtmosphere or create createSequoiaAtmosphere

Option A: Make factory function generic with tint parameter
Option B: Create planet-specific factory `createSequoiaAtmosphere()`

---

## Phase 3: Water Color Per-Planet

### 3.1 Add water color fields to VisualConfig or TerrainConfig

```typescript
export interface TerrainConfig {
  // ... existing fields ...
  waterColor?: string;      // Override WATER_COLOR
  waterDeepColor?: string;  // Override WATER_DEEP_COLOR
}
```

### 3.2 Pass water colors through Planet -> HexBlockMeshBuilder

Update `loadTextures()` to accept water color overrides:
```typescript
public async loadTextures(
  singleTexturePath?: string,
  tileset?: TilesetConfig,
  waterColors?: { color: string; deepColor: string }
): Promise<void>
```

Then use these in water shader material creation instead of PlayerConfig values.

---

## Phase 4: Mushroom Trees

### 4.1 Create MushroomTreeBuilder class in Tree.ts (or new file)

New tree architecture:
- **Stem**: Cylindrical trunk (grey/brown color ~#8B7355)
- **Cap**: Flat or domed disc on top (brown ~#654321)
- Use hexagonal prism for stem (matches existing tree trunk pattern)
- Use flattened cone or disc geometry for mushroom cap

```typescript
export interface MushroomTreeConfig {
  stemHeight: number;       // Height of mushroom stem
  stemRadius: number;       // Radius of stem
  capRadius: number;        // Radius of mushroom cap
  capHeight: number;        // Height/thickness of cap
  capTaper?: number;        // 0 = flat disc, 1 = pointed cone
}

const DEFAULT_MUSHROOM_CONFIG: MushroomTreeConfig = {
  stemHeight: 4,
  stemRadius: 0.4,
  capRadius: 3,
  capHeight: 1.5,
  capTaper: 0.3,  // Slightly domed
};
```

### 4.2 Update PlanetTreeManager to support tree type per planet

Options:
1. Add `treeType: 'pine' | 'mushroom'` to planet config
2. Pass TreeBuilder instance to PlanetTreeManager constructor
3. Create SequoiaTreeManager subclass

Recommended: Option 2 - most flexible

```typescript
// In mainPlanet.ts when setting up trees for Sequoia:
const mushroomBuilder = new MushroomTreeBuilder(sunDirection);
this.sequoiaTreeManager = new PlanetTreeManager(
  this.engine.scene,
  this.sequoia.center,
  this.sequoia.radius,
  PlayerConfig.TREE_COUNT,
  54321,
  mushroomBuilder  // Pass custom builder
);
```

### 4.3 Mushroom geometry creation

```typescript
createMushroomTree(position: THREE.Vector3, upVector: THREE.Vector3, config?: MushroomTreeConfig): THREE.Object3D {
  // Stem: hexagonal prism (reuse existing trunk code)
  // Cap: ConeGeometry with low height for dome, or custom disc

  // For cap, consider:
  // - THREE.ConeGeometry(radius, height, 6) with inverted normals for underside
  // - Or: CylinderGeometry with top radius smaller for dome effect
  // - Flatten using scale.y
}
```

---

## Phase 5: Integration in mainPlanet.ts

### 5.1 Add Sequoia references

```typescript
private sequoia: Planet;
private sequoiaAtmosphere: Atmosphere | null = null;
private sequoiaClouds: CloudSystem | null = null;
private sequoiaTreeManager: PlanetTreeManager | null = null;
```

### 5.2 Initialize Sequoia systems

After Earth initialization:
```typescript
// Get Sequoia planet
this.sequoia = this.planets.get('sequoia')!;

// Create Sequoia atmosphere with red tint
const sequoiaConfig = getBodyConfig('sequoia')!;
if (sequoiaConfig.hasAtmosphere) {
  this.sequoiaAtmosphere = createSequoiaAtmosphere(
    this.sequoia.radius,
    this.engine.sunDirection,
    sequoiaConfig.visual.atmosphereTint
  );
  this.sequoiaAtmosphere.setPosition(this.sequoia.center);
  this.engine.scene.add(this.sequoiaAtmosphere.getMesh());
}

// Scatter mushroom trees
this.sequoiaTreeManager = new PlanetTreeManager(...);
this.sequoiaTreeManager.scatterTrees(...);
```

---

## Implementation Order

1. **Phase 1.1-1.2**: Add SEQUOIA_TILESET and body config (planet appears with default textures)
2. **Phase 2**: Atmosphere tinting (reddish sky)
3. **Phase 3**: Water color override (greenish water)
4. **Phase 4**: Mushroom tree builder
5. **Phase 5**: Full integration with trees

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/config/SolarSystemConfig.ts` | Add SEQUOIA_TILESET, add atmosphereTint to VisualConfig, add Sequoia body config |
| `src/planet/Atmosphere.ts` | Add tint uniform, update factory functions |
| `src/shaders/atmosphere/atmosphere.frag` | Add atmosphereTint uniform and multiply |
| `src/planet/Tree.ts` | Add MushroomTreeBuilder class |
| `src/planet/HexBlock.ts` | Accept water color overrides |
| `src/planet/Planet.ts` | Pass water colors to mesh builder |
| `src/mainPlanet.ts` | Initialize Sequoia atmosphere, trees, clouds |

---

## Open Questions

1. Should mushroom trees have "gills" (underside details)? Probably not for performance.
2. Should Sequoia have clouds? If yes, what color? (Could tint them slightly)
3. What color scheme for mushroom caps? Brown, grey, or varied?
4. Should there be multiple mushroom sizes/variations?
