import * as THREE from 'three';
import { HexTile } from './GoldbergPolyhedron';
import { PlayerConfig } from '../config/PlayerConfig';

export enum HexBlockType {
  AIR = 0,
  STONE = 1,
  DIRT = 2,
  GRASS = 3,
  WATER = 4
}

export enum FaceType {
  TOP = 'top',
  BOTTOM = 'bottom',
  SIDE = 'side'
}

export class HexBlockMeshBuilder {
  private textureLoader: THREE.TextureLoader;
  private textures: Map<string, THREE.Texture> = new Map();
  private materials: Map<string, THREE.Material> = new Map();

  constructor() {
    this.textureLoader = new THREE.TextureLoader();
  }

  public async loadTextures(singleTexturePath?: string): Promise<void> {
    if (singleTexturePath) {
      // Moon-style: single texture for all surfaces
      const moonTexture = await this.loadTexture(singleTexturePath);
      moonTexture.magFilter = THREE.NearestFilter;
      moonTexture.minFilter = THREE.NearestFilter;
      moonTexture.wrapS = THREE.RepeatWrapping;
      moonTexture.wrapT = THREE.RepeatWrapping;

      this.textures.set('moon', moonTexture);
      const moonMaterial = new THREE.MeshLambertMaterial({ map: moonTexture });
      this.materials.set('top', moonMaterial);
      this.materials.set('side', moonMaterial);
      this.materials.set('bottom', moonMaterial);
      this.materials.set('stone', moonMaterial);
      return;
    }

    // Earth-style: different textures for different surfaces
    const stoneTexture = await this.loadTexture('/textures/rocks.png');
    const dirtTexture = await this.loadTexture('/textures/dirt.png');
    const grassTexture = await this.loadTexture('/textures/grass.png');

    [stoneTexture, dirtTexture, grassTexture].forEach(tex => {
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
    });

    this.textures.set('stone', stoneTexture);
    this.textures.set('dirt', dirtTexture);
    this.textures.set('grass', grassTexture);

    // Create materials for different face types
    // Top faces use grass
    this.materials.set('top', new THREE.MeshLambertMaterial({ map: grassTexture }));
    // Side faces use dirt
    this.materials.set('side', new THREE.MeshLambertMaterial({ map: dirtTexture }));
    // Bottom faces and deep blocks use stone
    this.materials.set('bottom', new THREE.MeshLambertMaterial({ map: stoneTexture }));
    this.materials.set('stone', new THREE.MeshLambertMaterial({ map: stoneTexture }));

    // Water material - load water texture
    const waterTexture = await this.loadTexture('/textures/water.png');
    waterTexture.magFilter = THREE.NearestFilter;
    waterTexture.minFilter = THREE.NearestFilter;
    waterTexture.wrapS = THREE.RepeatWrapping;
    waterTexture.wrapT = THREE.RepeatWrapping;
    // Apply UV tiling from config
    waterTexture.repeat.set(PlayerConfig.WATER_UV_TILING, PlayerConfig.WATER_UV_TILING);
    this.textures.set('water', waterTexture);

    // Detailed water - transparent with depth effect
    this.materials.set('water', new THREE.MeshLambertMaterial({
      map: waterTexture,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: PlayerConfig.WATER_TRANSPARENCY
    }));

    // LOD water - opaque for distant viewing (no transparency needed from space)
    this.materials.set('waterLOD', new THREE.MeshLambertMaterial({
      map: waterTexture,
      side: THREE.DoubleSide
    }));
  }

  private loadTexture(path: string): Promise<THREE.Texture> {
    return new Promise((resolve, reject) => {
      this.textureLoader.load(path, resolve, undefined, reject);
    });
  }

  public getMaterial(faceType: string): THREE.Material {
    return this.materials.get(faceType) || new THREE.MeshLambertMaterial({ color: 0x888888 });
  }

  public getTopMaterial(): THREE.Material {
    return this.materials.get('top')!;
  }

  public getSideMaterial(): THREE.Material {
    return this.materials.get('side')!;
  }

  public getBottomMaterial(): THREE.Material {
    return this.materials.get('bottom')!;
  }

  public getStoneMaterial(): THREE.Material {
    return this.materials.get('stone')!;
  }

  public getWaterMaterial(): THREE.Material {
    return this.materials.get('water')!;
  }

  public getWaterLODMaterial(): THREE.Material {
    return this.materials.get('waterLOD')!;
  }

  // Create separate geometries for each face type
  public createSeparateGeometries(
    tile: HexTile,
    innerRadius: number,
    outerRadius: number,
    planetCenter: THREE.Vector3 = new THREE.Vector3(0, 0, 0),
    isTopExposed: boolean = true,
    isBottomExposed: boolean = true,
    areSidesExposed: boolean = true
  ): { top: THREE.BufferGeometry | null; bottom: THREE.BufferGeometry | null; sides: THREE.BufferGeometry | null } {
    const numSides = tile.vertices.length;
    const radialDir = tile.center.clone().sub(planetCenter).normalize();

    // Scale vertices to inner and outer radii
    const innerVerts: THREE.Vector3[] = [];
    const outerVerts: THREE.Vector3[] = [];

    for (const v of tile.vertices) {
      const dir = v.clone().sub(planetCenter).normalize();
      innerVerts.push(dir.clone().multiplyScalar(innerRadius));
      outerVerts.push(dir.clone().multiplyScalar(outerRadius));
    }

    const innerCenter = radialDir.clone().multiplyScalar(innerRadius);
    const outerCenter = radialDir.clone().multiplyScalar(outerRadius);

    // Create a local tangent space for the hex face
    const localUp = radialDir.clone();
    let localRight = new THREE.Vector3(1, 0, 0);
    if (Math.abs(localUp.dot(localRight)) > 0.9) {
      localRight = new THREE.Vector3(0, 0, 1);
    }
    const localForward = new THREE.Vector3().crossVectors(localUp, localRight).normalize();
    localRight = new THREE.Vector3().crossVectors(localForward, localUp).normalize();

    let topGeom: THREE.BufferGeometry | null = null;
    let bottomGeom: THREE.BufferGeometry | null = null;
    let sidesGeom: THREE.BufferGeometry | null = null;

    // Top face (outer, facing away from planet) - uses grass texture
    if (isTopExposed) {
      const positions: number[] = [];
      const normals: number[] = [];
      const uvs: number[] = [];
      const indices: number[] = [];

      const topNormal = radialDir.clone();
      positions.push(outerCenter.x, outerCenter.y, outerCenter.z);
      normals.push(topNormal.x, topNormal.y, topNormal.z);
      uvs.push(0.5, 0.5);

      for (let i = 0; i < numSides; i++) {
        const v = outerVerts[i];
        positions.push(v.x, v.y, v.z);
        normals.push(topNormal.x, topNormal.y, topNormal.z);

        const toVert = v.clone().sub(outerCenter);
        const u = 0.5 + toVert.dot(localRight) * 0.1;
        const vCoord = 0.5 + toVert.dot(localForward) * 0.1;
        uvs.push(u, vCoord);
      }

      for (let i = 0; i < numSides; i++) {
        const next = (i + 1) % numSides;
        indices.push(0, 1 + i, 1 + next);
      }

      topGeom = new THREE.BufferGeometry();
      topGeom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      topGeom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
      topGeom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      topGeom.setIndex(indices);
    }

    // Bottom face (inner, facing toward planet) - uses stone texture
    if (isBottomExposed) {
      const positions: number[] = [];
      const normals: number[] = [];
      const uvs: number[] = [];
      const indices: number[] = [];

      const bottomNormal = radialDir.clone().negate();
      positions.push(innerCenter.x, innerCenter.y, innerCenter.z);
      normals.push(bottomNormal.x, bottomNormal.y, bottomNormal.z);
      uvs.push(0.5, 0.5);

      for (let i = 0; i < numSides; i++) {
        const v = innerVerts[i];
        positions.push(v.x, v.y, v.z);
        normals.push(bottomNormal.x, bottomNormal.y, bottomNormal.z);

        const toVert = v.clone().sub(innerCenter);
        const u = 0.5 + toVert.dot(localRight) * 0.1;
        const vCoord = 0.5 + toVert.dot(localForward) * 0.1;
        uvs.push(u, vCoord);
      }

      for (let i = 0; i < numSides; i++) {
        const next = (i + 1) % numSides;
        indices.push(0, 1 + next, 1 + i);
      }

      bottomGeom = new THREE.BufferGeometry();
      bottomGeom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      bottomGeom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
      bottomGeom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      bottomGeom.setIndex(indices);
    }

    // Side faces - uses dirt texture with proper local UVs
    if (areSidesExposed) {
      const positions: number[] = [];
      const normals: number[] = [];
      const uvs: number[] = [];
      const indices: number[] = [];

      let vertexIndex = 0;

      for (let i = 0; i < numSides; i++) {
        const next = (i + 1) % numSides;

        const outerV1 = outerVerts[i];
        const outerV2 = outerVerts[next];
        const innerV1 = innerVerts[i];
        const innerV2 = innerVerts[next];

        // Calculate side normal
        const edge = outerV2.clone().sub(outerV1);
        edge.normalize();

        const midPoint = outerV1.clone().add(outerV2).multiplyScalar(0.5);
        const sideNormal = midPoint.clone().sub(planetCenter).normalize();
        const tangent = edge.clone();
        sideNormal.sub(tangent.multiplyScalar(sideNormal.dot(tangent))).normalize();

        // Four vertices for this side
        positions.push(
          innerV1.x, innerV1.y, innerV1.z,
          innerV2.x, innerV2.y, innerV2.z,
          outerV2.x, outerV2.y, outerV2.z,
          outerV1.x, outerV1.y, outerV1.z
        );

        for (let j = 0; j < 4; j++) {
          normals.push(sideNormal.x, sideNormal.y, sideNormal.z);
        }

        // Local UVs for side faces - V goes from 0 to 0.5 (half height total)
        // U goes from 0 to 1 for the full edge width
        uvs.push(
          0, 0,       // inner1 (bottom-left)
          1, 0,       // inner2 (bottom-right)
          1, 0.5,     // outer2 (top-right)
          0, 0.5      // outer1 (top-left)
        );

        const baseIdx = vertexIndex;
        indices.push(
          baseIdx, baseIdx + 1, baseIdx + 2,
          baseIdx, baseIdx + 2, baseIdx + 3
        );

        vertexIndex += 4;
      }

      sidesGeom = new THREE.BufferGeometry();
      sidesGeom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      sidesGeom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
      sidesGeom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      sidesGeom.setIndex(indices);
    }

    return { top: topGeom, bottom: bottomGeom, sides: sidesGeom };
  }

  // Legacy method for backward compatibility
  public createHexPrismGeometry(
    tile: HexTile,
    innerRadius: number,
    outerRadius: number,
    planetCenter: THREE.Vector3 = new THREE.Vector3(0, 0, 0),
    isTopExposed: boolean = true,
    isBottomExposed: boolean = true,
    areSidesExposed: boolean = true
  ): { geometry: THREE.BufferGeometry; faceTypes: FaceType[] } {
    const { top, bottom, sides } = this.createSeparateGeometries(
      tile, innerRadius, outerRadius, planetCenter,
      isTopExposed, isBottomExposed, areSidesExposed
    );

    // Merge all geometries for legacy support
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const faceTypes: FaceType[] = [];
    let vertexOffset = 0;

    const mergeGeom = (geom: THREE.BufferGeometry | null, faceType: FaceType) => {
      if (!geom) return;
      const pos = geom.getAttribute('position');
      const norm = geom.getAttribute('normal');
      const uv = geom.getAttribute('uv');
      const idx = geom.getIndex();
      if (!pos || !norm || !uv || !idx) return;

      for (let i = 0; i < pos.count; i++) {
        positions.push(pos.getX(i), pos.getY(i), pos.getZ(i));
        normals.push(norm.getX(i), norm.getY(i), norm.getZ(i));
        uvs.push(uv.getX(i), uv.getY(i));
      }

      for (let i = 0; i < idx.count; i += 3) {
        indices.push(idx.getX(i) + vertexOffset, idx.getX(i + 1) + vertexOffset, idx.getX(i + 2) + vertexOffset);
        faceTypes.push(faceType);
      }

      vertexOffset += pos.count;
      geom.dispose();
    };

    mergeGeom(top, FaceType.TOP);
    mergeGeom(bottom, FaceType.BOTTOM);
    mergeGeom(sides, FaceType.SIDE);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);

    return { geometry, faceTypes };
  }

  public isSolid(blockType: HexBlockType): boolean {
    return blockType !== HexBlockType.AIR && blockType !== HexBlockType.WATER;
  }

  public isLiquid(blockType: HexBlockType): boolean {
    return blockType === HexBlockType.WATER;
  }
}
