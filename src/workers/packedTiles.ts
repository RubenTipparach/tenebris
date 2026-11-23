// Compact, transferable encodings for the big per-planet payloads that cross
// the worker boundary. Structured-cloning a Record of 163k tile objects (or
// 163k block arrays) costs about a second of main-thread time on the largest
// planet; flat typed arrays are built in a few ms and transferred for free.

export interface PackedTileData {
  count: number;
  indices: Int32Array;      // tile index per entry
  centers: Float64Array;    // 3 per entry (doubles: same precision as before packing)
  vertCounts: Uint8Array;   // 5 or 6
  vertices: Float64Array;   // 18 per entry (6 x xyz), unused slots zero
  neighborCounts: Uint8Array;
  neighbors: Int32Array;    // 6 per entry, unused slots -1
  tileToChunk: Int32Array;  // indexed by tile index, -1 = none
}

export interface PackedBlocks {
  indices: Int32Array;      // tile index per entry
  lengths: Uint16Array;     // blocks per column
  stride: number;           // slots per entry in data
  data: Uint8Array;         // block types (all < 256)
}

interface TileLike {
  index: number;
  center: { x: number; y: number; z: number };
  vertices: Array<{ x: number; y: number; z: number }>;
  neighbors: number[];
}

export function packTiles(tiles: TileLike[], tileToChunk: Map<number, number>, maxTileIndex: number): PackedTileData {
  const n = tiles.length;
  const packed: PackedTileData = {
    count: n,
    indices: new Int32Array(n),
    centers: new Float64Array(n * 3),
    vertCounts: new Uint8Array(n),
    vertices: new Float64Array(n * 18),
    neighborCounts: new Uint8Array(n),
    neighbors: new Int32Array(n * 6).fill(-1),
    tileToChunk: new Int32Array(maxTileIndex + 1).fill(-1),
  };
  for (let i = 0; i < n; i++) {
    const t = tiles[i];
    packed.indices[i] = t.index;
    packed.centers[i * 3] = t.center.x;
    packed.centers[i * 3 + 1] = t.center.y;
    packed.centers[i * 3 + 2] = t.center.z;
    const vc = Math.min(6, t.vertices.length);
    packed.vertCounts[i] = vc;
    for (let v = 0; v < vc; v++) {
      packed.vertices[i * 18 + v * 3] = t.vertices[v].x;
      packed.vertices[i * 18 + v * 3 + 1] = t.vertices[v].y;
      packed.vertices[i * 18 + v * 3 + 2] = t.vertices[v].z;
    }
    const nc = Math.min(6, t.neighbors.length);
    packed.neighborCounts[i] = nc;
    for (let k = 0; k < nc; k++) packed.neighbors[i * 6 + k] = t.neighbors[k];
  }
  for (const [tileIndex, chunk] of tileToChunk) {
    if (tileIndex >= 0 && tileIndex <= maxTileIndex) packed.tileToChunk[tileIndex] = chunk;
  }
  return packed;
}

export function unpackTiles(packed: PackedTileData): {
  tileData: Record<number, TileLike>;
  tileToChunk: Map<number, number>;
} {
  const tileData: Record<number, TileLike> = {};
  for (let i = 0; i < packed.count; i++) {
    const vertices: Array<{ x: number; y: number; z: number }> = [];
    for (let v = 0; v < packed.vertCounts[i]; v++) {
      const o = i * 18 + v * 3;
      vertices.push({ x: packed.vertices[o], y: packed.vertices[o + 1], z: packed.vertices[o + 2] });
    }
    const neighbors: number[] = [];
    for (let k = 0; k < packed.neighborCounts[i]; k++) neighbors.push(packed.neighbors[i * 6 + k]);
    const index = packed.indices[i];
    tileData[index] = {
      index,
      center: { x: packed.centers[i * 3], y: packed.centers[i * 3 + 1], z: packed.centers[i * 3 + 2] },
      vertices,
      neighbors,
    };
  }
  const tileToChunk = new Map<number, number>();
  for (let i = 0; i < packed.tileToChunk.length; i++) {
    if (packed.tileToChunk[i] >= 0) tileToChunk.set(i, packed.tileToChunk[i]);
  }
  return { tileData, tileToChunk };
}

export function packedTileTransferables(p: PackedTileData): Transferable[] {
  return [p.indices.buffer, p.centers.buffer, p.vertCounts.buffer, p.vertices.buffer,
    p.neighborCounts.buffer, p.neighbors.buffer, p.tileToChunk.buffer] as Transferable[];
}

export function packBlocks(columns: Iterable<[number, { blocks: ArrayLike<number> }]>, count: number): PackedBlocks {
  const indices = new Int32Array(count);
  const lengths = new Uint16Array(count);
  const entries: Array<ArrayLike<number>> = [];
  let stride = 0;
  let i = 0;
  for (const [tileIndex, column] of columns) {
    if (i >= count) break;
    indices[i] = tileIndex;
    lengths[i] = column.blocks.length;
    if (column.blocks.length > stride) stride = column.blocks.length;
    entries.push(column.blocks);
    i++;
  }
  const data = new Uint8Array(i * stride);
  for (let e = 0; e < i; e++) data.set(entries[e], e * stride);
  return { indices: indices.subarray(0, i), lengths: lengths.subarray(0, i), stride, data };
}

export function unpackBlocks(packed: PackedBlocks): Map<number, Uint8Array> {
  const result = new Map<number, Uint8Array>();
  for (let i = 0; i < packed.indices.length; i++) {
    const o = i * packed.stride;
    result.set(packed.indices[i], packed.data.subarray(o, o + packed.lengths[i]));
  }
  return result;
}

// Replace geometry attribute arrays (positions, normals, uvs, colors, sky and
// torch light) in a worker result with Float32Arrays and collect their buffers
// for transfer. Index arrays stay plain arrays: BufferGeometry.setIndex() only
// accepts number[] or a BufferAttribute.
const FLOAT_ATTRIBUTE_KEY = /(positions|normals|uvs|colors|skylight|blocklight|torchlight|liquidprev)$/i;

export function packFloatAttributes(value: unknown, transfers: Transferable[]): void {
  if (Array.isArray(value)) {
    for (const item of value) {
      if (item && typeof item === 'object') packFloatAttributes(item, transfers);
    }
    return;
  }
  if (!value || typeof value !== 'object' || ArrayBuffer.isView(value)) return;
  const obj = value as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    const v = obj[key];
    if (Array.isArray(v) && FLOAT_ATTRIBUTE_KEY.test(key) && (v.length === 0 || typeof v[0] === 'number')) {
      const typed = new Float32Array(v as number[]);
      obj[key] = typed;
      transfers.push(typed.buffer);
    } else if (v && typeof v === 'object') {
      packFloatAttributes(v, transfers);
    }
  }
}

// Detailed-terrain build payload: the nearby columns plus their neighbours'
// blocks and outlines. Decoded in the worker into the original shapes.
export interface PackedColumnSet {
  tiles: PackedTileData;
  blocks: PackedBlocks;
}

export function packColumnSet(columns: Array<{ tile: TileLike; blocks: ArrayLike<number> }>): PackedColumnSet {
  return {
    tiles: packTiles(columns.map(c => c.tile), new Map(), 0),
    blocks: packBlocks(columns.map(c => [c.tile.index, c] as [number, { blocks: ArrayLike<number> }]), columns.length),
  };
}

export function packedColumnSetTransferables(p: PackedColumnSet): Transferable[] {
  return [...packedTileTransferables(p.tiles), p.blocks.indices.buffer, p.blocks.lengths.buffer, p.blocks.data.buffer] as Transferable[];
}

export function unpackColumnSet(p: PackedColumnSet): Array<{ tileIndex: number; tile: TileLike; blocks: number[] }> {
  const { tileData } = unpackTiles(p.tiles);
  const blocks = unpackBlocks(p.blocks);
  const result: Array<{ tileIndex: number; tile: TileLike; blocks: number[] }> = [];
  for (let i = 0; i < p.tiles.count; i++) {
    const tileIndex = p.tiles.indices[i];
    result.push({ tileIndex, tile: tileData[tileIndex], blocks: Array.from(blocks.get(tileIndex) ?? []) });
  }
  return result;
}
