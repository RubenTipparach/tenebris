import * as THREE from 'three';

export enum BlockType {
  AIR = 0,
  STONE = 1,
  DIRT = 2,
  GRASS = 3
}

export interface BlockTextureSet {
  top: THREE.Texture;
  bottom: THREE.Texture;
  sides: THREE.Texture;
}

export class BlockRegistry {
  private textures: Map<BlockType, BlockTextureSet> = new Map();
  private materials: Map<BlockType, THREE.Material[]> = new Map();
  private textureLoader: THREE.TextureLoader;

  constructor() {
    this.textureLoader = new THREE.TextureLoader();
  }

  public async loadTextures(): Promise<void> {
    // Load textures
    const wallTexture = await this.loadTexture('/textures/wall.png');
    const floorTexture = await this.loadTexture('/textures/floor.png');
    const ceilingTexture = await this.loadTexture('/textures/ceiling.png');

    // Configure textures for pixelated look (Minecraft style)
    [wallTexture, floorTexture, ceilingTexture].forEach(tex => {
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
    });

    // Stone block - uses wall texture for all sides
    this.textures.set(BlockType.STONE, {
      top: wallTexture,
      bottom: wallTexture,
      sides: wallTexture
    });

    // Dirt block - uses floor texture
    this.textures.set(BlockType.DIRT, {
      top: floorTexture,
      bottom: floorTexture,
      sides: floorTexture
    });

    // Grass block - ceiling on top, floor on bottom, wall on sides
    this.textures.set(BlockType.GRASS, {
      top: ceilingTexture,
      bottom: floorTexture,
      sides: wallTexture
    });

    // Create materials
    this.createMaterials();
  }

  private loadTexture(path: string): Promise<THREE.Texture> {
    return new Promise((resolve, reject) => {
      this.textureLoader.load(path, resolve, undefined, reject);
    });
  }

  private createMaterials(): void {
    for (const [blockType, textureSet] of this.textures) {
      // Order: +X, -X, +Y, -Y, +Z, -Z (right, left, top, bottom, front, back)
      const materials = [
        new THREE.MeshLambertMaterial({ map: textureSet.sides }), // right
        new THREE.MeshLambertMaterial({ map: textureSet.sides }), // left
        new THREE.MeshLambertMaterial({ map: textureSet.top }),    // top
        new THREE.MeshLambertMaterial({ map: textureSet.bottom }), // bottom
        new THREE.MeshLambertMaterial({ map: textureSet.sides }), // front
        new THREE.MeshLambertMaterial({ map: textureSet.sides })  // back
      ];

      this.materials.set(blockType, materials);
    }
  }

  public getMaterials(blockType: BlockType): THREE.Material[] {
    return this.materials.get(blockType) || [];
  }

  public isSolid(blockType: BlockType): boolean {
    return blockType !== BlockType.AIR;
  }
}
