import * as THREE from 'three';
import { RocketPart } from '../planet/RocketPart';
import { PlanetGravitySource } from './RocketController';

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
}

/**
 * Manager for landed rockets in the world
 */
export class LandedRocketManager {
  private scene: THREE.Scene;
  private landedRockets: Map<string, LandedRocket> = new Map();
  private planets: PlanetGravitySource[] = [];
  private nextId: number = 0;

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
    fuelPercent: number
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
    };

    this.landedRockets.set(id, landedRocket);

    // Make sure pivot is visible and in scene
    pivot.visible = true;
    if (!pivot.parent) {
      this.scene.add(pivot);
    }

    console.log(`Created landed rocket ${id} at position`, position);
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
    return rocket;
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
      // First do a bounding sphere check
      const rocketSphere = new THREE.Sphere(rocket.position, rocket.boundingRadius);
      const ray = raycaster.ray;

      const intersectPoint = new THREE.Vector3();
      if (ray.intersectSphere(rocketSphere, intersectPoint)) {
        const distance = raycaster.ray.origin.distanceTo(intersectPoint);
        if (distance <= maxDistance && (!closest || distance < closest.distance)) {
          // Do a more accurate check against the pivot's children
          const intersects = raycaster.intersectObject(rocket.pivot, true);
          if (intersects.length > 0 && intersects[0].distance <= maxDistance) {
            closest = {
              rocket,
              point: intersects[0].point,
              distance: intersects[0].distance,
            };
          }
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
