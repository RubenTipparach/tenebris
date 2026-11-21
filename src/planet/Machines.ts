import * as THREE from 'three';
import { getAssetPath } from '../utils/assetPath';
import { PlayerConfig } from '../config/PlayerConfig';
import { ItemType, ITEM_DATA } from '../player/Inventory';
import { MachineState, PlacedMachine } from '../power/MachineLogic';
import techVert from '../shaders/tech/tech.vert';
import techFrag from '../shaders/tech/tech.frag';

export * from '../power/MachineLogic';

/**
 * The industry machines' meshes (openspec industry-and-nuclear, design
 * 3-5). One manager for all of them, because they share everything the
 * older machines each repeat - a placed block on a tile, item slots, a saved
 * record - and differ only in what one tick does (MachineLogic.tickMachine).
 * Each is a block faced with the machine's own item art, lit by the same
 * tech shader as every other machine.
 */

const MACHINE_SIZE = 0.9;

export class MachineManager {
  private machines: PlacedMachine[] = [];
  private meshes: THREE.Mesh[] = [];
  private loader = new THREE.TextureLoader();
  private geometry = new THREE.BoxGeometry(MACHINE_SIZE, MACHINE_SIZE, MACHINE_SIZE);
  private materials = new Map<ItemType, THREE.ShaderMaterial>();
  private sunDirection: THREE.Vector3;
  private planetCenter: THREE.Vector3;

  constructor(private scene: THREE.Object3D, planetCenter?: THREE.Vector3, sunDirection?: THREE.Vector3) {
    this.planetCenter = planetCenter?.clone() ?? new THREE.Vector3();
    this.sunDirection = sunDirection?.clone() ?? new THREE.Vector3(1, 0, 0);
  }

  private materialFor(itemType: ItemType): THREE.ShaderMaterial {
    let mat = this.materials.get(itemType);
    if (!mat) {
      const tex = this.loader.load(getAssetPath(ITEM_DATA[itemType].texture));
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
      mat = new THREE.ShaderMaterial({
        uniforms: {
          techTexture: { value: tex },
          sunDirection: { value: this.sunDirection.clone() },
          planetCenter: { value: this.planetCenter.clone() },
          ambientIntensity: { value: PlayerConfig.AMBIENT_LIGHT_INTENSITY },
          directionalIntensity: { value: PlayerConfig.DIRECTIONAL_LIGHT_INTENSITY },
          torchLight: { value: 0.0 },
        },
        vertexShader: techVert,
        fragmentShader: techFrag,
        transparent: true,
        alphaTest: 0.5,
      });
      this.materials.set(itemType, mat);
    }
    return mat;
  }

  public setSunDirection(direction: THREE.Vector3): void {
    this.sunDirection.copy(direction);
    for (const m of this.materials.values()) m.uniforms.sunDirection.value.copy(direction);
  }

  public setPlanetCenter(center: THREE.Vector3): void {
    this.planetCenter.copy(center);
    for (const m of this.materials.values()) m.uniforms.planetCenter.value.copy(center);
  }

  /** Make the mesh for a machine state (placed or restored). */
  public add(state: MachineState, planetCenter: THREE.Vector3): PlacedMachine {
    const mesh = new THREE.Mesh(this.geometry, this.materialFor(state.itemType));
    const up = state.position.clone().sub(planetCenter).normalize();
    mesh.position.copy(state.position);
    const align = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);
    mesh.quaternion.copy(new THREE.Quaternion().setFromAxisAngle(up, state.rotation)).multiply(align);
    mesh.userData.isMachine = true;
    mesh.userData.tileIndex = state.tileIndex;
    this.scene.add(mesh);
    const placed: PlacedMachine = Object.assign(state, { mesh });
    this.machines.push(placed);
    this.meshes.push(mesh);
    return placed;
  }

  /** Where a machine block sits: its centre half a block above the ground. */
  public static centreAbove(groundTop: THREE.Vector3, planetCenter: THREE.Vector3): THREE.Vector3 {
    const up = groundTop.clone().sub(planetCenter).normalize();
    return groundTop.clone().addScaledVector(up, MACHINE_SIZE / 2);
  }

  public remove(m: PlacedMachine): void {
    this.scene.remove(m.mesh);
    this.machines = this.machines.filter(x => x !== m);
    this.meshes = this.meshes.filter(x => x !== m.mesh);
  }

  public getAll(): PlacedMachine[] {
    return this.machines;
  }

  public getMeshes(): THREE.Mesh[] {
    return this.meshes;
  }

  public getAtTile(tileIndex: number): PlacedMachine | undefined {
    return this.machines.find(m => m.tileIndex === tileIndex);
  }

  public getByMesh(mesh: THREE.Object3D): PlacedMachine | undefined {
    return this.machines.find(m => m.mesh === mesh);
  }
}
