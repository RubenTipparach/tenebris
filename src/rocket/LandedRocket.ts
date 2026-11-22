import * as THREE from 'three';
import { RocketPart } from '../planet/RocketPart';
import { PlanetGravitySource } from './RocketController';
import { InventorySlot } from '../player/Inventory';
import { PlacedLaunchPad } from '../planet/LaunchPad';

/**
 * Represents a rocket that has successfully landed in the world
 * (not at a launch pad). Can be re-boarded by the player.
 */
export interface LandedRocket {
  // Unique identifier
  id: string;

  // The rocket pivot group containing all parts
  pivot: THREE.Group;

  // Rocket parts for re-initialization
  parts: RocketPart[];

  // World position and orientation
  position: THREE.Vector3;
  orientation: THREE.Quaternion;

  // Ground info for re-boarding
  groundNormal: THREE.Vector3;

  // Fuel state (0-100 as percentage of capacity)
  fuelPercent: number;

  // For raycasting/interaction detection
  boundingRadius: number;

  // Its cargo hold and equipment slots (the home pad's slots, shared) and
  // the pad it flew from
  cargo: InventorySlot[] | null;
  equipment: InventorySlot[] | null;
  pad: PlacedLaunchPad | null;

  // Which engines fire when it flies again (design 6b; undefined = all)
  engineMode?: import('./RocketPerformance').EngineMode;

  // Its battery charge, Wh (undefined = full: older records) - openspec
  // wool-air-and-reentry, design 2
  chargeWh?: number;

  // Its address in a multiplayer world (the 'landedRocket' record key):
  // the same on every client that sees it
  netKey: string;
}

/** Told when a landed rocket appears or goes (multiplayer publishes it) */
export interface LandedRocketListener {
  created(rocket: LandedRocket): void;
  removed(rocket: LandedRocket): void;
}

const newNetKey = (): string =>
  `lr-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;

/**
 * Manager for landed rockets in the world
 */
export class LandedRocketManager {
  private scene: THREE.Scene;
  private landedRockets: Map<string, LandedRocket> = new Map();
  private planets: PlanetGravitySource[] = [];
  private nextId: number = 0;
  private listener: LandedRocketListener | null = null;

  public setListener(listener: LandedRocketListener | null): void {
    this.listener = listener;
  }

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /**
   * Set the planets for gravity calculations when re-boarding
   */
  public setPlanets(planets: PlanetGravitySource[]): void {
    this.planets = planets;
  }

  /**
   * Get the planets list
   */
  public getPlanets(): PlanetGravitySource[] {
    return this.planets;
  }

  /**
   * Create a landed rocket from a rocket controller that just landed
   */
  public createLandedRocket(
    pivot: THREE.Group,
    parts: RocketPart[],
    position: THREE.Vector3,
    orientation: THREE.Quaternion,
    groundNormal: THREE.Vector3,
    fuelPercent: number,
    cargo: InventorySlot[] | null = null,
    pad: PlacedLaunchPad | null = null,
    netKey: string = newNetKey(),
    chargeWh: number | null = null,
    equipment: InventorySlot[] | null = null
  ): LandedRocket {
    const id = `landed_rocket_${this.nextId++}`;

    // Calculate bounding radius from parts
    let maxRadius = 2; // Minimum radius
    for (const part of parts) {
      const partPos = part.mesh.position;
      const dist = partPos.length() + 2; // Add some padding
      maxRadius = Math.max(maxRadius, dist);
    }

    const landedRocket: LandedRocket = {
      id,
      pivot,
      parts,
      position: position.clone(),
      orientation: orientation.clone(),
      groundNormal: groundNormal.clone(),
      fuelPercent,
      boundingRadius: maxRadius,
      cargo,
      equipment,
      pad,
      netKey,
      chargeWh: chargeWh ?? undefined,
    };

    this.landedRockets.set(id, landedRocket);

    // Make sure pivot is visible and in scene
    pivot.visible = true;
    if (!pivot.parent) {
      this.scene.add(pivot);
    }

    console.log(`Created landed rocket ${id} at position`, position);
    this.listener?.created(landedRocket);
    return landedRocket;
  }

  /**
   * Remove a landed rocket (when re-boarding or destroying)
   */
  public removeLandedRocket(id: string): LandedRocket | null {
    const rocket = this.landedRockets.get(id);
    if (!rocket) return null;

    this.landedRockets.delete(id);
    console.log(`Removed landed rocket ${id}`);
    this.listener?.removed(rocket);
    return rocket;
  }

  /** The landed rocket with this multiplayer key */
  public getByNetKey(netKey: string): LandedRocket | undefined {
    for (const rocket of this.landedRockets.values()) if (rocket.netKey === netKey) return rocket;
    return undefined;
  }

  /**
   * Remove a landed rocket from the world entirely (another player boarded
   * it): unlike removeLandedRocket, nobody takes over its pivot and parts
   */
  public destroyLandedRocket(id: string): void {
    const rocket = this.removeLandedRocket(id);
    if (!rocket) return;
    rocket.pivot.parent?.remove(rocket.pivot);
    for (const part of rocket.parts) part.dispose();
  }

  /**
   * Get all landed rockets
   */
  public getAllLandedRockets(): LandedRocket[] {
    return Array.from(this.landedRockets.values());
  }

  /**
   * Get a landed rocket by ID
   */
  public getLandedRocket(id: string): LandedRocket | undefined {
    return this.landedRockets.get(id);
  }

  /**
   * Find the closest landed rocket to a position within a max distance
   */
  public findClosestLandedRocket(position: THREE.Vector3, maxDistance: number): LandedRocket | null {
    let closest: LandedRocket | null = null;
    let closestDist = maxDistance;

    for (const rocket of this.landedRockets.values()) {
      const dist = position.distanceTo(rocket.position);
      if (dist < closestDist) {
        closestDist = dist;
        closest = rocket;
      }
    }

    return closest;
  }

  /**
   * Check if a ray intersects any landed rocket
   * Returns the closest intersected rocket and the intersection point
   */
  public raycast(raycaster: THREE.Raycaster, maxDistance: number): { rocket: LandedRocket; point: THREE.Vector3 } | null {
    let closest: { rocket: LandedRocket; point: THREE.Vector3; distance: number } | null = null;

    for (const rocket of this.landedRockets.values()) {
      // Skip the bounding sphere pre-check and directly raycast against the pivot
      // This ensures all parts are checked regardless of bounding sphere accuracy
      const intersects = raycaster.intersectObject(rocket.pivot, true);
      if (intersects.length > 0 && intersects[0].distance <= maxDistance) {
        if (!closest || intersects[0].distance < closest.distance) {
          closest = {
            rocket,
            point: intersects[0].point,
            distance: intersects[0].distance,
          };
        }
      }
    }

    return closest ? { rocket: closest.rocket, point: closest.point } : null;
  }

  /**
   * Dispose of all resources
   */
  public dispose(): void {
    for (const rocket of this.landedRockets.values()) {
      if (rocket.pivot.parent) {
        rocket.pivot.parent.remove(rocket.pivot);
      }
      for (const part of rocket.parts) {
        part.dispose();
      }
    }
    this.landedRockets.clear();
  }
}
