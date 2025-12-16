# Tenebris Performance Optimization Plan

## Current Architecture Summary

### LOD System
- **12 LOD chunks** based on icosahedron vertices
- Tiles assigned to nearest chunk center
- Worker thread builds LOD geometry in 4 passes:
  1. Calculate surface depth and block type per tile
  2. Generate top faces for non-nearby tiles
  3. Generate side walls where height differs from neighbor
  4. Generate water boundary walls at LOD/terrain edge

### Detailed Terrain
- `batchedMeshGroup` holds detailed terrain meshes for nearby tiles
- Worker thread builds geometry per-tile with full block-by-block processing
- Atomic swap: create new meshes first, remove old, then dispose

### Current Bottlenecks
1. **Worker can't buffer LOD fast enough** for large planets (Sequoia)
2. **Lag spikes during terrain swap** - GPU buffer uploads happen atomically
3. **Over-rendering side walls** - generating walls between surface blocks unnecessarily
4. **LOD chunks too large** - entire chunk rebuilt when player moves

---

## Phase 1: Immediate Optimizations (High Impact, Low Risk)

### 1.1 Reduce Side Wall Over-Rendering
**Problem**: Currently generating side walls between adjacent surface blocks even when both are at similar heights.

**Files**: `lodGeometryWorker.ts`, `geometryWorker.ts`

**Solution**:
```typescript
// In lodGeometryWorker.ts, line ~628
// Current: Generate wall if thisRadius > neighborRadius
// New: Add threshold to avoid micro-walls
const HEIGHT_THRESHOLD = 0.5; // Half a block height
if (thisRadius > neighborRadius + HEIGHT_THRESHOLD) {
  // Generate wall
}
```

**For detailed terrain** (`geometryWorker.ts`):
- Skip side face generation for blocks where all neighbors at same depth are same block type
- Cache the "is edge block" determination per column

### 1.2 Progressive Buffer Uploads
**Problem**: All GPU buffers uploaded in single frame during terrain swap.

**Files**: `Planet.ts` (handleWorkerResult)

**Solution**:
- Split buffer uploads across multiple frames
- Upload 2-3 meshes per frame instead of all at once
- Track pending uploads in a queue

```typescript
interface PendingMesh {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  renderOrder?: number;
}

private pendingMeshUploads: PendingMesh[] = [];
private meshesPerFrame = 3;

// In update loop:
private processPendingMeshUploads(): void {
  for (let i = 0; i < this.meshesPerFrame && this.pendingMeshUploads.length > 0; i++) {
    const pending = this.pendingMeshUploads.shift()!;
    const mesh = new THREE.Mesh(pending.geometry, pending.material);
    if (pending.renderOrder !== undefined) mesh.renderOrder = pending.renderOrder;
    this.batchedMeshGroup.add(mesh);
  }
}
```

### 1.3 Smaller LOD Chunks
**Problem**: 12 chunks is too coarse for large planets.

**Files**: `Planet.ts` (initializeLODChunks, LOD_CHUNK_COUNT)

**Solution**:
- Increase to 32 or 48 chunks for larger planets
- Use adaptive chunk count based on planet radius
- Smaller chunks = faster individual rebuilds, better frustum culling

```typescript
// Calculate chunk count based on planet radius
const LOD_CHUNK_COUNT = Math.min(48, Math.max(12, Math.floor(this.radius / 50)));
```

---

## Phase 2: LOD/Detail Terrain Hybrid System

### 2.1 Per-Chunk LOD Replacement
**Problem**: Currently entire LOD mesh has holes carved for ALL nearby tiles. Should replace chunks individually.

**Concept**:
- Track which LOD chunks overlap with detailed terrain
- When detailed terrain loads for a chunk's area, hide that specific LOD chunk
- When detailed terrain unloads, show LOD chunk again (already built)

**Implementation**:
```typescript
interface LODChunkState {
  group: THREE.Group;
  bounds: THREE.Sphere;
  tileIndices: Set<number>;
  isReplacedByDetail: boolean;
}

// When nearby tiles change:
for (const chunk of this.lodChunks) {
  const hasDetailedTiles = [...chunk.tileIndices].some(
    idx => this.cachedNearbyTiles.has(idx)
  );
  chunk.group.visible = !hasDetailedTiles;
}
```

**Benefits**:
- No need to rebuild LOD mesh when player moves
- LOD chunks built once at planet load
- Instant swap between LOD and detailed terrain

### 2.2 LOD Chunk Pre-Building
**Problem**: LOD rebuild triggered every time player moves significantly.

**Solution**:
- Pre-build all LOD chunks at planet initialization
- Never rebuild LOD except when terrain actually changes (block placed/removed)
- Store LOD geometry in typed arrays, create meshes on demand

---

## Phase 3: Worker Thread Optimizations

### 3.1 Transferable ArrayBuffers
**Problem**: postMessage copies data, causing overhead.

**Files**: `Planet.ts`, `lodGeometryWorker.ts`, `geometryWorker.ts`

**Solution**:
```typescript
// Use transferable objects
const positions = new Float32Array(data.positions);
worker.postMessage({ positions }, [positions.buffer]);

// In worker, return transferable:
const result = {
  positions: new Float32Array(positionsArray),
  normals: new Float32Array(normalsArray),
  // ...
};
self.postMessage(result, [
  result.positions.buffer,
  result.normals.buffer,
  // ...
]);
```

### 3.2 Worker Pool for Parallel Chunk Building
**Problem**: Single LOD worker builds all chunks sequentially.

**Solution**:
- Create pool of 4-8 LOD workers
- Each worker builds one chunk independently
- Main thread combines results as they arrive

```typescript
class LODWorkerPool {
  private workers: Worker[] = [];
  private pendingChunks: Map<number, (data: ChunkData) => void> = new Map();

  buildChunk(chunkIndex: number, data: ChunkBuildData): Promise<ChunkData> {
    const worker = this.workers[chunkIndex % this.workers.length];
    return new Promise(resolve => {
      this.pendingChunks.set(chunkIndex, resolve);
      worker.postMessage({ type: 'buildChunk', chunkIndex, data });
    });
  }
}
```

### 3.3 Incremental LOD Building
**Problem**: LOD worker builds entire planet at once.

**Solution**:
- Build LOD in rings from player position outward
- Prioritize chunks in view frustum
- Use `requestIdleCallback` for background chunks

---

## Phase 4: Culling Improvements

### 4.1 Hierarchical Frustum Culling
**Problem**: Currently only chunk-level frustum culling for LOD.

**Solution**:
- Add tile-level frustum culling within visible chunks
- Skip geometry generation for tiles outside expanded frustum
- Use bounding sphere per tile (already computed in precomputed cache)

### 4.2 Occlusion Culling for Underground
**Problem**: Rendering underground blocks that player can't see.

**Solution**:
- Track player's current depth
- Only render blocks within N levels of player depth
- For surface viewing, only render top N layers of terrain

```typescript
const playerDepth = this.getDepthAtPoint(playerPosition);
const renderDepthMin = Math.max(0, playerDepth - 5);
const renderDepthMax = Math.min(MAX_DEPTH, playerDepth + 10);

// In geometry worker:
for (let depth = renderDepthMin; depth <= renderDepthMax; depth++) {
  // Process block at this depth
}
```

### 4.3 Distance-Based Detail Reduction
**Problem**: All nearby tiles rendered at full detail regardless of distance.

**Solution**:
- Tiles at edge of render distance: skip side walls entirely
- Medium distance: reduce UV detail, simplify geometry
- Close tiles: full detail

---

## Phase 5: Memory and Caching

### 5.1 Geometry Caching
**Problem**: Geometry rebuilt from scratch when tiles re-enter view.

**Solution**:
- Cache geometry for recently unloaded tiles
- LRU cache with configurable size limit
- On reload, check cache before requesting worker build

### 5.2 Shared Geometry Templates
**Problem**: Each tile creates unique geometry for common shapes.

**Solution**:
- Pre-generate template geometries for common configurations
- Use instanced rendering where possible
- Share vertex data between similar tiles

### 5.3 Object Pooling
**Problem**: Creating/disposing THREE.Mesh objects causes GC pressure.

**Solution**:
```typescript
class MeshPool {
  private available: THREE.Mesh[] = [];

  acquire(geometry: THREE.BufferGeometry, material: THREE.Material): THREE.Mesh {
    const mesh = this.available.pop() ?? new THREE.Mesh();
    mesh.geometry = geometry;
    mesh.material = material;
    return mesh;
  }

  release(mesh: THREE.Mesh): void {
    mesh.geometry?.dispose();
    this.available.push(mesh);
  }
}
```

---

## Phase 6: Planet Sequoia Specific

### 6.0 Planet-Specific LOD Switch Altitude
**Problem**: `TERRAIN_LOD_SWITCH_ALTITUDE` is a fixed value (50 units) that doesn't scale with planet size. Sequoia is 2x the size of Earth, so LOD kicks in way too soon - player sees low-detail terrain while still relatively close to the surface.

**Files**: `PlayerConfig.ts`, `Planet.ts`

**Solution**:
- Make LOD switch altitude proportional to planet radius
- Store per-planet LOD switch altitude in config or calculate dynamically

```typescript
// In Planet.ts or passed from config
public getLODSwitchAltitude(): number {
  // Scale LOD switch altitude with planet radius
  // Base: 50 units for radius 100 planet
  const baseAltitude = PlayerConfig.TERRAIN_LOD_SWITCH_ALTITUDE;
  const baseRadius = 100; // Earth's radius
  return baseAltitude * (this.radius / baseRadius);
}

// In update loop, use planet-specific value:
const lodSwitchAltitude = this.currentPlanet.getLODSwitchAltitude();
if (altitude > lodSwitchAltitude) {
  // Switch to LOD-only mode
}
```

**Alternative**: Add `lodSwitchAltitude` to `CelestialBodyConfig` for per-planet control.

### 6.1 Adaptive Render Distance
**Problem**: Fixed render distance doesn't scale for different planet sizes.

**Solution**:
```typescript
// Scale render distance with planet radius
const baseRenderDistance = PlayerConfig.TERRAIN_MIN_RENDER_DISTANCE;
const scaleFactor = Math.min(1.5, Math.max(0.5, 100 / this.radius));
const adaptedRenderDistance = Math.floor(baseRenderDistance * scaleFactor);
```

### 6.2 LOD Level of Detail Levels
**Problem**: Single LOD level for entire planet.

**Solution**:
- Implement 3 LOD levels: Ultra-distant, Distant, Near-LOD
- Ultra-distant: Simple icosphere with vertex colors
- Distant: Current LOD system
- Near-LOD: Higher detail tiles closer to player

### 6.3 Async Terrain Streaming
**Problem**: All terrain requests block on same worker queue.

**Solution**:
- Priority queue for terrain requests
- Tiles in view frustum: high priority
- Tiles behind player: low priority
- Cancel pending requests for tiles that left view

---

## Implementation Priority

### Immediate (This Week) ✅ DONE
1. **Add copy button to F3 menu** - ✅ Implemented in Profiler.ts
2. **Side wall threshold** - ✅ Implemented in lodGeometryWorker.ts (0.5 block threshold)
3. **Progressive buffer uploads** - ✅ Implemented in Planet.ts (4 meshes per frame)
4. **Planet-specific LOD switch altitude** - ✅ Implemented in Planet.ts (scales with radius)

### Deferred
- **Increase LOD chunk count** - Requires icosahedron subdivision for >12 chunks (architectural work)

### Short Term (Next 2 Weeks)
1. **Per-chunk LOD replacement** - Architectural improvement
2. **Transferable ArrayBuffers** - Worker optimization

### Medium Term (Next Month)
7. **Worker pool for parallel building**
8. **Geometry caching**
9. **Hierarchical frustum culling**

### Long Term (Future)
10. **Multi-level LOD system**
11. **Occlusion culling**
12. **Instanced rendering for common patterns**

---

## Metrics to Track

After each optimization, measure:
- **Frame time** (target: <16ms for 60fps)
- **Terrain swap time** (target: <50ms)
- **LOD build time** (target: <100ms per chunk)
- **Draw calls** (target: <300)
- **Triangle count** (target: <500k visible)
- **Memory usage** (GPU geometries, textures)

Use F3 profiler with new copy button to capture before/after metrics.
