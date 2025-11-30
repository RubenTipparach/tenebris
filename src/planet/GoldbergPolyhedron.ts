import * as THREE from 'three';

export interface HexTile {
  index: number;
  center: THREE.Vector3;
  vertices: THREE.Vector3[];  // 5 for pentagons, 6 for hexagons
  neighbors: number[];
  isPentagon: boolean;
}

export class GoldbergPolyhedron {
  public tiles: HexTile[] = [];
  public radius: number;
  public subdivisions: number;

  private vertexMap: Map<string, number> = new Map();
  private vertices: THREE.Vector3[] = [];
  private faces: number[][] = [];

  constructor(radius: number = 50, subdivisions: number = 3) {
    this.radius = radius;
    this.subdivisions = subdivisions;
    this.generate();
  }

  private generate(): void {
    // Start with an icosahedron
    this.createIcosahedron();

    // Subdivide faces
    for (let i = 0; i < this.subdivisions; i++) {
      this.subdivide();
    }

    // Create dual (hexagonal) mesh
    this.createDual();
  }

  private createIcosahedron(): void {
    const t = (1 + Math.sqrt(5)) / 2; // Golden ratio

    // Icosahedron vertices
    const icoVertices = [
      [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
      [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
      [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]
    ];

    // Normalize and scale to radius
    for (const v of icoVertices) {
      const vec = new THREE.Vector3(v[0], v[1], v[2]).normalize().multiplyScalar(this.radius);
      this.vertices.push(vec);
    }

    // Icosahedron faces (20 triangles)
    this.faces = [
      [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
      [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
      [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
      [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]
    ];
  }

  private getMiddlePoint(p1: number, p2: number): number {
    const key = p1 < p2 ? `${p1}_${p2}` : `${p2}_${p1}`;

    if (this.vertexMap.has(key)) {
      return this.vertexMap.get(key)!;
    }

    const v1 = this.vertices[p1];
    const v2 = this.vertices[p2];

    const middle = new THREE.Vector3()
      .addVectors(v1, v2)
      .multiplyScalar(0.5)
      .normalize()
      .multiplyScalar(this.radius);

    const index = this.vertices.length;
    this.vertices.push(middle);
    this.vertexMap.set(key, index);

    return index;
  }

  private subdivide(): void {
    const newFaces: number[][] = [];
    this.vertexMap.clear();

    for (const face of this.faces) {
      const a = this.getMiddlePoint(face[0], face[1]);
      const b = this.getMiddlePoint(face[1], face[2]);
      const c = this.getMiddlePoint(face[2], face[0]);

      newFaces.push([face[0], a, c]);
      newFaces.push([face[1], b, a]);
      newFaces.push([face[2], c, b]);
      newFaces.push([a, b, c]);
    }

    this.faces = newFaces;
  }

  private createDual(): void {
    // The dual of a subdivided icosahedron gives us hexagons and 12 pentagons
    // Each original vertex becomes a tile center
    // Each tile's vertices are the centers of adjacent faces

    // Build vertex -> face adjacency
    const vertexFaces: Map<number, number[]> = new Map();

    for (let i = 0; i < this.vertices.length; i++) {
      vertexFaces.set(i, []);
    }

    for (let faceIdx = 0; faceIdx < this.faces.length; faceIdx++) {
      const face = this.faces[faceIdx];
      for (const vertIdx of face) {
        vertexFaces.get(vertIdx)!.push(faceIdx);
      }
    }

    // Calculate face centers
    const faceCenters: THREE.Vector3[] = [];
    for (const face of this.faces) {
      const center = new THREE.Vector3();
      for (const vertIdx of face) {
        center.add(this.vertices[vertIdx]);
      }
      center.divideScalar(3).normalize().multiplyScalar(this.radius);
      faceCenters.push(center);
    }

    // Build vertex -> vertex adjacency for neighbor finding
    const vertexNeighbors: Map<number, Set<number>> = new Map();
    for (let i = 0; i < this.vertices.length; i++) {
      vertexNeighbors.set(i, new Set());
    }

    for (const face of this.faces) {
      vertexNeighbors.get(face[0])!.add(face[1]).add(face[2]);
      vertexNeighbors.get(face[1])!.add(face[0]).add(face[2]);
      vertexNeighbors.get(face[2])!.add(face[0]).add(face[1]);
    }

    // Create tiles
    for (let vertIdx = 0; vertIdx < this.vertices.length; vertIdx++) {
      const adjacentFaces = vertexFaces.get(vertIdx)!;
      const isPentagon = adjacentFaces.length === 5;

      // Get face centers as tile vertices
      const tileVertices: THREE.Vector3[] = [];
      for (const faceIdx of adjacentFaces) {
        tileVertices.push(faceCenters[faceIdx].clone());
      }

      // Sort vertices in circular order around the center
      const center = this.vertices[vertIdx].clone();
      this.sortVerticesCircular(tileVertices, center);

      // Get neighbor tile indices
      const neighbors = Array.from(vertexNeighbors.get(vertIdx)!);

      const tile: HexTile = {
        index: vertIdx,
        center: center.clone(),
        vertices: tileVertices,
        neighbors,
        isPentagon
      };

      this.tiles.push(tile);
    }
  }

  private sortVerticesCircular(vertices: THREE.Vector3[], center: THREE.Vector3): void {
    // Create a local coordinate system on the tangent plane
    const normal = center.clone().normalize();
    const tangent = new THREE.Vector3(1, 0, 0);
    if (Math.abs(normal.dot(tangent)) > 0.9) {
      tangent.set(0, 1, 0);
    }
    const bitangent = new THREE.Vector3().crossVectors(normal, tangent).normalize();
    tangent.crossVectors(bitangent, normal).normalize();

    // Calculate angles
    const angles: { vertex: THREE.Vector3; angle: number }[] = [];
    for (const v of vertices) {
      const dir = v.clone().sub(center);
      const x = dir.dot(tangent);
      const y = dir.dot(bitangent);
      angles.push({ vertex: v, angle: Math.atan2(y, x) });
    }

    // Sort by angle
    angles.sort((a, b) => a.angle - b.angle);

    // Reorder vertices array in place
    for (let i = 0; i < vertices.length; i++) {
      vertices[i] = angles[i].vertex;
    }
  }

  public getTileAtPoint(point: THREE.Vector3): HexTile | null {
    // Find the closest tile center to the given point
    const normalizedPoint = point.clone().normalize().multiplyScalar(this.radius);

    let closestTile: HexTile | null = null;
    let closestDist = Infinity;

    for (const tile of this.tiles) {
      const dist = tile.center.distanceToSquared(normalizedPoint);
      if (dist < closestDist) {
        closestDist = dist;
        closestTile = tile;
      }
    }

    return closestTile;
  }

  public getTileCount(): number {
    return this.tiles.length;
  }

  public getPentagonCount(): number {
    return this.tiles.filter(t => t.isPentagon).length;
  }

  public getHexagonCount(): number {
    return this.tiles.filter(t => !t.isPentagon).length;
  }
}
